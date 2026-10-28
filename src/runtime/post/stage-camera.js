// CAMERA stage (design §7.7): effects on the linear HDR image, in pipeline order:
// AO and contact shadows (×) → screen-space GI (+) → bloom, lens flare and anamorphic
// streaks (+) → god rays (+) → motion blur → DOF / tilt-shift
// → exposure and white balance → tone mapping → output transform.
//
// Each effect is a module: `enabled(v)` decides whether it is in the graph (a rebuild),
// `requires(v)` lists the scene-pass buffers it reads, and `build(c, ctx)` returns the
// new color node. Continuous values come from ctx.P (registry uniforms), so sliders
// never rebuild.

import * as THREE from 'three/webgpu';
import { Fn, vec2, vec3, vec4, float, int, mix, max, smoothstep, pow, abs, step, Loop, If, Break, luminance, sample, colorToDirection, sRGBTransferEOTF, renderOutput, interleavedGradientNoise, screenCoordinate, getViewPosition, getScreenPosition } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js';
import { motionBlur } from 'three/addons/tsl/display/MotionBlur.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { ssgi } from 'three/addons/tsl/display/SSGINode.js';
import { lensflare } from 'three/addons/tsl/display/LensflareNode.js';
import { anamorphic } from 'three/addons/tsl/display/AnamorphicNode.js';

export const TONE_MAPPING = {
	none: THREE.NoToneMapping,
	linear: THREE.LinearToneMapping,
	reinhard: THREE.ReinhardToneMapping,
	cineon: THREE.CineonToneMapping,
	aces: THREE.ACESFilmicToneMapping,
	agx: THREE.AgXToneMapping,
	neutral: THREE.NeutralToneMapping,
};

const linear = ( u ) => sRGBTransferEOTF( u );

export const CAMERA = [
	{
		id: 'lighting.ao', label: 'Ambient occlusion', stage: 'camera',
		enabled: ( v ) => v[ 'lighting.ao.enabled' ],
		requires: () => [ 'depth', 'normal' ],
		build( c, ctx ) {

			const P = ctx.P;
			const normals = ctx.tex( 'normal' );
			const node = ctx.own( ao( ctx.tex( 'depth' ), sample( ( uv ) => colorToDirection( normals.sample( uv ).rgb ) ), ctx.camera ) );
			node.resolutionScale = 0.5;
			node.radius = P.get( 'lighting.ao.radius' );
			node.thickness = P.get( 'lighting.ao.radius' );
			node.distanceFallOff.value = 0.5;
			// GTAO's raw output is noisy (4×4 rotation pattern) and soft. Four bilinear taps
			// average a 4×4 block of the half-resolution buffer; a remap gives it contrast.
			const aoTex = node.getTextureNode();
			const t = vec2( 0.75 ).div( node.resolution );
			const raw = aoTex.sample( ctx.uv.add( t ) ).r.add( aoTex.sample( ctx.uv.sub( t ) ).r ).add( aoTex.sample( ctx.uv.add( vec2( t.x, t.y.negate() ) ) ).r ).add( aoTex.sample( ctx.uv.sub( vec2( t.x, t.y.negate() ) ) ).r ).mul( 0.25 );
			const a = raw.sub( 0.35 ).div( 0.6 ).clamp( 0, 1 );
			const occlusion = pow( a, P.get( 'lighting.ao.intensity' ) );
			const tint = linear( P.get( 'lighting.ao.tint' ) );
			const shaded = c.mul( mix( tint, vec3( 1 ), occlusion ) );
			// "Ink" mode: the deepest occlusion becomes a flat, hard-edged fill.
			return mix( shaded, tint.mul( 0.15 ), smoothstep( 0.55, 0.7, a ).oneMinus().mul( P.get( 'lighting.ao.ink' ) ) );

		},
	},
	{
		id: 'lighting.contact', label: 'Contact shadows', stage: 'camera',
		enabled: ( v ) => v[ 'lighting.contact.enabled' ],
		requires: () => [ 'depth', 'normal' ],
		build( c, ctx ) {

			// A short ray march toward the sun in view space, inline (no extra pass). The bias
			// grows with distance, so flat ground doesn't shadow itself through depth precision.
			const P = ctx.P, U = ctx.U;
			const depth = ctx.tex( 'depth' );
			const N = 16;

			const occlusion = Fn( () => {

				const d0 = depth.sample( ctx.uv ).r;
				const p0 = getViewPosition( ctx.uv, d0, U.projInv ).toVar();
				const len = P.get( 'lighting.contact.length' );
				const thickness = P.get( 'lighting.contact.thickness' );
				const bias = p0.z.negate().mul( 0.003 ).add( 0.015 );
				const jitter = interleavedGradientNoise( screenCoordinate );
				const hit = float( 0 ).toVar();

				Loop( { start: int( 0 ), end: int( N ), type: 'int', condition: '<' }, ( { i } ) => {

					const t = float( i ).add( jitter ).add( 0.5 ).div( N );
					const p = p0.add( U.lightView.mul( len.mul( t ) ) );
					const uv = getScreenPosition( p, U.proj );
					const scene = getViewPosition( uv, depth.sample( uv ).r, U.projInv ).z;
					const delta = scene.sub( p.z );
					If( delta.greaterThan( bias ).and( delta.lessThan( thickness.add( bias ) ) ), () => {

						// Fade hits near the end of the ray, so the shadow tapers instead of stopping.
						hit.assign( t.oneMinus().mul( 1.5 ).clamp( 0, 1 ) );
						Break();

					} );

				} );

				// Only surfaces that face the sun: shadow sides are already dark (form shadow).
				const n = colorToDirection( ctx.tex( 'normal' ).sample( ctx.uv ).rgb );
				const facing = smoothstep( 0.05, 0.3, n.dot( U.lightView ) );
				return hit.mul( facing ).mul( step( d0, 0.99999 ) );

			} )();

			return c.mul( occlusion.mul( P.get( 'lighting.contact.intensity' ) ).oneMinus() );

		},
	},
	{
		id: 'lighting.ssgi', label: 'Screen-space GI', stage: 'camera',
		enabled: ( v ) => v[ 'lighting.ssgi.enabled' ],
		requires: () => [ 'depth', 'normal' ],
		build( c, ctx ) {

			// One bounce from what is on screen (three's SSGI). Without temporal filtering the
			// result is noisy, so four bilinear taps smooth it, like AO. There is no albedo
			// buffer: the bounce takes the receiver's hue (its color at full value).
			const P = ctx.P;
			const normals = ctx.tex( 'normal' );
			const node = ctx.own( ssgi( vec4( c, 1 ), ctx.tex( 'depth' ), sample( ( uv ) => colorToDirection( normals.sample( uv ).rgb ) ), ctx.camera ) );
			node.useTemporalFiltering = false;
			node.sliceCount.value = 2;
			node.stepCount.value = 8;
			node.radius = P.get( 'lighting.ssgi.radius' );
			const giTex = node.getTextureNode();
			const t = ctx.texel.mul( 1.5 );
			const gi = giTex.sample( ctx.uv.add( t ) ).add( giTex.sample( ctx.uv.sub( t ) ) ).add( giTex.sample( ctx.uv.add( vec2( t.x, t.y.negate() ) ) ) ).add( giTex.sample( ctx.uv.sub( vec2( t.x, t.y.negate() ) ) ) ).mul( 0.25 );
			const albedo = c.div( max( max( c.r, c.g ), max( c.b, 1e-3 ) ) ).mul( 0.8 );
			const k = P.get( 'lighting.ssgi.intensity' );
			return c.mul( mix( 1, gi.a, k.mul( 0.25 ).min( 0.5 ) ) ).add( albedo.mul( gi.rgb ).mul( k ) );

		},
	},
	{
		id: 'lens.bloom', label: 'Bloom', stage: 'camera',
		enabled: ( v ) => v[ 'lens.bloom.enabled' ],
		requires: ( v ) => ( v[ 'lens.bloom.source' ] === 'emissive' ? [ 'emissive' ] : [] ),
		key: ( v ) => v[ 'lens.bloom.source' ],
		build( c, ctx ) {

			const source = ctx.v[ 'lens.bloom.source' ] === 'emissive' ? ctx.tex( 'emissive' ) : ctx.tex( 'output' );
			const node = ctx.own( bloom( source ) );
			node.strength = ctx.P.get( 'lens.bloom.strength' );
			node.radius = ctx.P.get( 'lens.bloom.radius' );
			node.threshold = ctx.P.get( 'lens.bloom.threshold' );
			return c.add( node.getTextureNode().sample( ctx.uv ).rgb );

		},
	},
	{
		id: 'lens.flare', label: 'Lens flare', stage: 'camera',
		enabled: ( v ) => v[ 'lens.flare.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			// Ghosts of the brightest highlights, mirrored through the center at quarter
			// resolution (three's lensflare), then softened by four bilinear taps.
			const P = ctx.P;
			const node = ctx.own( lensflare( vec4( c, 1 ), {
				threshold: P.get( 'lens.flare.threshold' ), ghostSpacing: P.get( 'lens.flare.spacing' ),
				ghostTint: linear( P.get( 'lighting.key.color' ) ).mul( vec3( 1, 0.85, 0.7 ) ), ghostSamples: 5, ghostAttenuationFactor: 3, downSampleRatio: 4,
			} ) );
			const tex = node.getTextureNode();
			const t = ctx.texel.mul( 6 );
			const flare = tex.sample( ctx.uv.add( t ) ).add( tex.sample( ctx.uv.sub( t ) ) ).add( tex.sample( ctx.uv.add( vec2( t.x, t.y.negate() ) ) ) ).add( tex.sample( ctx.uv.sub( vec2( t.x, t.y.negate() ) ) ) ).rgb.mul( 0.25 );
			return c.add( flare.mul( P.get( 'lens.flare.intensity' ) ) );

		},
	},
	{
		id: 'lens.anamorphic', label: 'Anamorphic streaks', stage: 'camera',
		enabled: ( v ) => v[ 'lens.anamorphic.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			// Horizontal streaks at half resolution (three's anamorphic): a 32-tap line of the
			// pixels above the threshold, tinted. The node sums its taps (about 16 at full
			// weight), so the sum is scaled back to an average.
			const P = ctx.P;
			const node = ctx.own( anamorphic( vec4( c, 1 ), P.get( 'lens.anamorphic.threshold' ), P.get( 'lens.anamorphic.length' ), 32 ) );
			node.colorNode = linear( P.get( 'lens.anamorphic.tint' ) );
			node.resolutionScale = 0.5;
			return c.add( node.getTextureNode().sample( ctx.uv ).rgb.mul( P.get( 'lens.anamorphic.intensity' ) ).mul( 1 / 16 ) );

		},
	},
	{
		id: 'atmosphere.godRays', label: 'God rays', stage: 'camera',
		enabled: ( v ) => v[ 'atmosphere.godRays.enabled' ],
		requires: () => [ 'depth' ],
		build( c, ctx ) {

			// March from each pixel toward the sun's screen position, collecting bright sky
			// (depth at the far plane) with a decaying weight: occluders cut the shafts.
			const P = ctx.P, U = ctx.U;
			const depth = ctx.tex( 'depth' ), hdr = ctx.tex( 'output' );
			const N = 32;

			const rays = Fn( () => {

				const uv = vec2( ctx.uv ).toVar();
				const delta = U.sunScreen.sub( uv ).mul( P.get( 'atmosphere.godRays.length' ) ).div( N ).toVar();
				uv.addAssign( delta.mul( interleavedGradientNoise( screenCoordinate ) ) );
				const sum = float( 0 ).toVar();
				const w = float( 1 ).toVar();

				Loop( { start: int( 0 ), end: int( N ), type: 'int', condition: '<' }, () => {

					uv.addAssign( delta );
					const inside = step( 0, uv.x ).mul( step( uv.x, 1 ) ).mul( step( 0, uv.y ) ).mul( step( uv.y, 1 ) );
					const sky = step( 0.99999, depth.sample( uv ).r ).mul( inside );
					sum.addAssign( luminance( hdr.sample( uv ).rgb ).min( 6 ).mul( sky ).mul( w ) );
					w.mulAssign( P.get( 'atmosphere.godRays.decay' ) );

				} );

				return sum.div( N );

			} )();

			const tint = linear( P.get( 'lighting.key.color' ) );
			return c.add( tint.mul( rays ).mul( P.get( 'atmosphere.godRays.intensity' ) ).mul( U.sunVisible ) );

		},
	},
	{
		id: 'lens.motionBlur', label: 'Motion blur', stage: 'camera', neighborhood: true,
		enabled: ( v ) => v[ 'lens.motionBlur.enabled' ],
		requires: () => [ 'velocity' ],
		build( c, ctx ) {

			const velocity = ctx.tex( 'velocity' ).sample( ctx.uv ).xy.mul( ctx.P.get( 'lens.motionBlur.shutter' ).div( 360 ) );
			return vec3( motionBlur( ctx.texture( c ), velocity, int( 16 ) ).rgb );

		},
	},
	{
		id: 'lens.dof', label: 'Depth of field', stage: 'camera', neighborhood: true,
		enabled: ( v ) => v[ 'lens.dof.enabled' ],
		requires: () => [ 'depth' ],
		build( c, ctx ) {

			const node = ctx.own( dof( vec4( c, 1 ), ctx.pass.getViewZNode(), ctx.U.focusDistance, ctx.P.get( 'lens.dof.range' ), ctx.P.get( 'lens.dof.blur' ) ) );
			return vec3( node.rgb );

		},
	},
	{
		id: 'lens.tiltShift', label: 'Tilt-shift', stage: 'camera', neighborhood: true,
		enabled: ( v ) => v[ 'lens.tiltShift.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			const P = ctx.P;
			const blurred = ctx.own( gaussianBlur( vec4( c, 1 ), vec2( P.get( 'lens.tiltShift.blur' ) ), 6 ) );
			const half = P.get( 'lens.tiltShift.width' ).mul( 0.5 );
			const d = abs( ctx.uv.y.oneMinus().sub( P.get( 'lens.tiltShift.center' ) ) );
			return mix( c, vec3( blurred.rgb ), smoothstep( half, half.add( 0.22 ), d ) );

		},
	},
	{
		id: 'quality.traa', label: 'TRAA', stage: 'camera', neighborhood: true,
		// Temporal AA: the styled camera is jittered every frame and the history is blended.
		// It resolves the finished image (`final`): nested inside a later effect's texture
		// boundary, three's TRAA node renders black. Screen-fixed patterns (paper, halftone)
		// stay sharp; animated grain is softened by the history blend.
		final: true,
		enabled: ( v ) => ! v[ 'retro.pixel.enabled' ] && v[ 'quality.aa' ] === 'traa',
		requires: () => [ 'depth', 'velocity' ],
		build( c, ctx ) {

			return vec3( ctx.own( traa( ctx.texture( c ), ctx.tex( 'depth' ), ctx.tex( 'velocity' ), ctx.camera ) ).rgb );

		},
	},
	{
		id: 'grade.toneMapping', label: 'Exposure and tone mapping', stage: 'camera', always: true,
		enabled: () => true,
		requires: () => [],
		key: ( v ) => v[ 'grade.toneMapping' ],
		build( c, ctx ) {

			return renderOutput( vec4( c.mul( ctx.U.exposure ), 1 ), TONE_MAPPING[ ctx.v[ 'grade.toneMapping' ] ], THREE.SRGBColorSpace ).rgb;

		},
	},
];
