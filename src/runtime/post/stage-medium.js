// MEDIUM stage (design §7.7): Kuwahara → watercolor → halftone / hatching → ink lines
// → image (Sobel) edges → interactable highlight → pixel edges → anti-aliasing → sharpen
// → misregistration → paper. Lines come after the media, so a painted look never smears
// its ink; paper comes last, so ink takes its texture.

import { Fn, vec2, vec3, vec4, float, int, max, min, mix, step, smoothstep, floor, fract, sin, cos, dot, pow, abs, round, length, select, luminance, Loop, colorToDirection, perspectiveDepthToViewZ, screenCoordinate, mx_noise_float, mx_worley_noise_float } from 'three/tsl';
import { PART_INDEX } from '../registry/index.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { smaa } from 'three/addons/tsl/display/SMAANode.js';
import { screenLines } from './lines.js';
import { rotate2, dotMask, lineMask } from '../materials/patterns.js';

/** Post-pattern coordinates in cells of `size` px at 1080p, on the effect grid, rotated by `angle` (degrees). */
const cells = ( ctx, size, angle ) => rotate2( ctx.coord.add( 0.5 ).div( size.mul( ctx.gridSize.y.div( 1080 ) ) ), angle );

/** Smooth value noise in [0, 1] over screen pixels. */
const noise = ( p ) => mx_noise_float( p ).mul( 0.5 ).add( 0.5 );

/** Structure tensor (E, F, G) of the color texture: Sobel gradients summed over the channels. */
function structureTensor( tex, ctx ) {

	const at = ( x, y ) => tex.sample( ctx.uv.add( vec2( x, y ).mul( ctx.texel ) ) ).rgb;
	const gx = at( 1, - 1 ).add( at( 1, 0 ).mul( 2 ) ).add( at( 1, 1 ) ).sub( at( - 1, - 1 ).add( at( - 1, 0 ).mul( 2 ) ).add( at( - 1, 1 ) ) ).mul( 0.25 );
	const gy = at( - 1, 1 ).add( at( 0, 1 ).mul( 2 ) ).add( at( 1, 1 ) ).sub( at( - 1, - 1 ).add( at( 0, - 1 ).mul( 2 ) ).add( at( 1, - 1 ) ) ).mul( 0.25 );
	return vec3( dot( gx, gx ), dot( gx, gy ), dot( gy, gy ) );

}

export const MEDIUM = [
	{
		id: 'media.kuwahara', label: 'Painterly (Kuwahara)', stage: 'medium', neighborhood: true,
		enabled: ( v ) => v[ 'media.kuwahara.enabled' ],
		requires: () => [],
		key: ( v ) => ( v[ 'media.kuwahara.anisotropic' ] ? 'aniso' : '' ),
		build( c, ctx ) {

			// Generalized Kuwahara: eight overlapping, soft sectors in a disc around each pixel.
			// Each sector's mean is weighted by an inverse power of its variance, so the
			// calmest sector wins: edges stay sharp while flat areas turn into strokes.
			// Anisotropic: a structure-tensor pass gives each pixel its edge direction, and the
			// disc becomes an ellipse stretched along it, so strokes follow the forms.
			const P = ctx.P;
			const tex = ctx.texture( c );
			const step1080 = ctx.texel.mul( ctx.gridSize.y.div( 1080 ).max( 1 ) );
			const dirs = Array.from( { length: 8 }, ( _, k ) => vec2( Math.cos( k * Math.PI / 4 ), Math.sin( k * Math.PI / 4 ) ) );
			const tensor = ctx.v[ 'media.kuwahara.anisotropic' ] ? ctx.texture( structureTensor( tex, ctx ) ) : null;

			return Fn( () => {

				const rf = P.get( 'media.kuwahara.radius' );
				const r = int( rf );
				const m = dirs.map( () => vec3( 0 ).toVar() ), sq = dirs.map( () => vec3( 0 ).toVar() ), n = dirs.map( () => float( 0 ).toVar() );
				// Kernel offset → texture offset: identity, or rotate into the edge frame and stretch.
				let offset = ( k ) => k.mul( step1080 );
				if ( tensor ) {

					const T = vec3( 0 ).toVar();
					for ( const [ x, y ] of [ [ - 1, - 1 ], [ 0, - 1 ], [ 1, - 1 ], [ - 1, 0 ], [ 0, 0 ], [ 1, 0 ], [ - 1, 1 ], [ 0, 1 ], [ 1, 1 ] ] ) T.addAssign( tensor.sample( ctx.uv.add( vec2( x, y ).mul( ctx.texel ).mul( 2 ) ) ).rgb );
					const E = T.x, F = T.y, G = T.z;
					const root = E.sub( G ).mul( E.sub( G ) ).add( F.mul( F ).mul( 4 ) ).sqrt();
					const l1 = E.add( G ).add( root ).mul( 0.5 ), l2 = E.add( G ).sub( root ).mul( 0.5 );
					const t = vec2( l1.sub( E ), F.negate() );
					const dir = select( dot( t, t ).greaterThan( 1e-10 ), t.normalize(), vec2( 1, 0 ) ).toVar();
					const A = l1.sub( l2 ).div( l1.add( l2 ).max( 1e-6 ) ).toVar();
					const along = A.add( 1 ), across = float( 1 ).div( A.add( 1 ) );
					offset = ( k ) => dir.mul( k.x.mul( along ) ).add( vec2( dir.y.negate(), dir.x ).mul( k.y.mul( across ) ) ).mul( step1080 );

				}

				Loop( { start: r.negate(), end: r, type: 'int', condition: '<=', name: 'kx' }, ( { kx } ) => {

					Loop( { start: r.negate(), end: r, type: 'int', condition: '<=', name: 'ky' }, ( { ky } ) => {

						const v = vec2( float( kx ), float( ky ) ).div( rf.max( 1 ) );
						const d2 = dot( v, v );
						const g = smoothstep( 0.7, 1.0, d2.sqrt() ).oneMinus().mul( step( d2, 1 ) ).mul( d2.mul( - 1.5 ).exp() );
						const s = tex.sample( ctx.uv.add( offset( vec2( float( kx ), float( ky ) ) ) ) ).rgb;
						const s2 = s.mul( s );
						const dir = v.div( d2.sqrt().max( 1e-4 ) );
						const center = step( d2, 1e-6 ).mul( 0.125 );
						for ( let k = 0; k < 8; k ++ ) {

							const w = pow( dir.dot( dirs[ k ] ).max( 0 ), 6 ).add( center ).mul( g );
							m[ k ].addAssign( s.mul( w ) ); sq[ k ].addAssign( s2.mul( w ) ); n[ k ].addAssign( w );

						}

					} );

				} );

				const sum = vec3( 0 ).toVar(), wsum = float( 0 ).toVar();
				const sharp = P.get( 'media.kuwahara.sharpness' );
				for ( let k = 0; k < 8; k ++ ) {

					const mean = m[ k ].div( n[ k ].max( 1e-5 ) );
					const variance = sq[ k ].div( n[ k ].max( 1e-5 ) ).sub( mean.mul( mean ) ).max( 0 );
					const w = pow( dot( variance, vec3( 1 ) ).mul( 250 ).add( 1 ), sharp.mul( - 0.5 ) );
					sum.addAssign( mean.mul( w ) );
					wsum.addAssign( w );

				}

				return sum.div( wsum.max( 1e-8 ) );

			} )();

		},
	},
	{
		id: 'media.watercolor', label: 'Watercolor', stage: 'medium', neighborhood: true,
		enabled: ( v ) => v[ 'media.watercolor.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			const P = ctx.P;
			const tex = ctx.texture( c );
			const unit = ctx.texel.mul( ctx.gridSize.y.div( 1080 ) );
			const px = ctx.coord;

			return Fn( () => {

				// Hand wobble: a smooth displacement of the whole image.
				const wob = vec2( noise( vec3( px.mul( 0.012 ), 1.3 ) ), noise( vec3( px.mul( 0.012 ), 7.1 ) ) ).sub( 0.5 ).mul( 2 );
				const uv = ctx.uv.add( wob.mul( P.get( 'media.watercolor.wobble' ) ).mul( unit ) ).toVar();
				const base = tex.sample( uv ).rgb.toVar();

				// Bleed and edges: a small ring average shows where color changes.
				const blur = vec3( 0 ).toVar();
				const radius = P.get( 'media.watercolor.bleed' ).mul( 4 ).add( 2 );
				for ( let i = 0; i < 8; i ++ ) {

					const a = i / 8 * Math.PI * 2;
					blur.addAssign( tex.sample( uv.add( vec2( Math.cos( a ), Math.sin( a ) ).mul( unit ).mul( radius ) ) ).rgb );

				}

				blur.divAssign( 8 );
				const bled = mix( base, blur, P.get( 'media.watercolor.bleed' ).mul( 0.7 ) );
				const edge = smoothstep( 0.02, 0.16, length( base.sub( blur ) ) );
				const pooled = bled.mul( float( 1 ).sub( edge.mul( P.get( 'media.watercolor.edges' ) ).mul( 0.55 ) ) );

				// Granulation: pigment settles in the paper's dips, most in dark washes.
				const grain = noise( vec3( px.mul( 0.35 ), 3.7 ) ).mul( 0.6 ).add( noise( vec3( px.mul( 0.07 ), 9.2 ) ).mul( 0.4 ) );
				const dark = luminance( pooled ).oneMinus();
				return pooled.mul( float( 1 ).sub( grain.mul( dark ).mul( P.get( 'media.watercolor.granulation' ) ).mul( 0.45 ) ) );

			} )();

		},
	},
	{
		id: 'media.halftone', label: 'Halftone (print)', stage: 'medium',
		enabled: ( v ) => v[ 'media.halftone.enabled' ],
		requires: () => [],
		key: ( v ) => v[ 'media.halftone.mode' ],
		build( c, ctx ) {

			const P = ctx.P;
			const size = P.get( 'media.halftone.size' ), angle = P.get( 'media.halftone.angle' );
			const shadows = P.get( 'media.halftone.shadows' );
			// "Shadows only": coverage starts below a brightness that falls as the amount rises.
			const tone = ( ink ) => ink.sub( shadows.mul( 0.55 ) ).div( float( 1 ).sub( shadows.mul( 0.55 ) ) ).clamp( 0, 1 );
			let out;

			if ( ctx.v[ 'media.halftone.mode' ] === 'cmyk' ) {

				const k = float( 1 ).sub( max( c.r, max( c.g, c.b ) ) ).clamp( 0, 1 );
				const inv = float( 1 ).sub( k ).max( 1e-3 );
				const cyan = float( 1 ).sub( c.r ).sub( k ).div( inv ), magenta = float( 1 ).sub( c.g ).sub( k ).div( inv ), yellow = float( 1 ).sub( c.b ).sub( k ).div( inv );
				const dot = ( value, offset ) => dotMask( cells( ctx, size, angle.add( offset ) ), tone( value ) );
				const C = dot( cyan, - 30 ), M = dot( magenta, 30 ), Y = dot( yellow, - 45 ), K = dot( k, 0 );
				out = vec3( C.oneMinus(), M.oneMinus(), Y.oneMinus() ).mul( K.oneMinus() );

			} else {

				const dots = dotMask( cells( ctx, size, angle ), tone( luminance( c ).oneMinus() ) );
				out = mix( c.mul( 1.08 ).min( 1 ), P.get( 'media.halftone.ink' ), dots );

			}

			return mix( c, out, P.get( 'media.halftone.amount' ) );

		},
	},
	{
		id: 'media.hatching', label: 'Hatching (post)', stage: 'medium',
		enabled: ( v ) => v[ 'media.hatching.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			const P = ctx.P;
			const lum = luminance( c );
			let lines = float( 0 );
			for ( let k = 0; k < 4; k ++ ) {

				const level = P.get( 'media.hatching.threshold' ).mul( 1 - k * 0.24 );
				const depth = level.sub( lum ).div( level.max( 1e-3 ) ).clamp( 0, 1 );
				const coord = cells( ctx, P.get( 'media.hatching.spacing' ), P.get( 'media.hatching.angle' ).add( k * 60 ) );
				const on = step( k + 0.5, P.get( 'media.hatching.layers' ) ).mul( step( lum, level ) );
				lines = max( lines, lineMask( coord, depth.mul( 0.2 ).add( 0.1 ) ).mul( on ) );

			}

			return mix( c, P.get( 'media.hatching.color' ), lines.mul( P.get( 'media.hatching.amount' ) ) );

		},
	},
	{
		id: 'lines.screen', label: 'Screen-space ink', stage: 'medium',
		enabled: ( v ) => v[ 'lines.screen.enabled' ],
		requires: () => [ 'depth', 'normal', 'ids' ],
		build( c, ctx ) {

			return screenLines( c, { depth: ctx.tex( 'depth' ), normal: ctx.tex( 'normal' ), ids: ctx.tex( 'ids' ) }, ctx.U.lines, ctx.atmos, { uv: ctx.uv, texel: ctx.texel, scale: ctx.lineScale, coord: ctx.coord }, ctx.P, ctx.U.time );

		},
	},
	{
		id: 'lines.sobel', label: 'Image edges (Sobel)', stage: 'medium', neighborhood: true,
		enabled: ( v ) => v[ 'lines.sobel.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			// A 3 × 3 Sobel operator on the brightness of the image so far: lines wherever
			// brightness changes, whatever caused it (shadow, texture, silhouette).
			const P = ctx.P;
			const tex = ctx.texture( c );
			const o = ctx.texel.mul( P.get( 'lines.sobel.thickness' ).mul( ctx.lineScale ).max( 0.75 ) );
			const L = ( x, y ) => luminance( tex.sample( ctx.uv.add( vec2( x, y ).mul( o ) ) ).rgb );
			const tl = L( - 1, - 1 ), t = L( 0, - 1 ), tr = L( 1, - 1 ), l = L( - 1, 0 ), r = L( 1, 0 ), bl = L( - 1, 1 ), b = L( 0, 1 ), br = L( 1, 1 );
			const gx = tr.add( r.mul( 2 ) ).add( br ).sub( tl.add( l.mul( 2 ) ).add( bl ) );
			const gy = bl.add( b.mul( 2 ) ).add( br ).sub( tl.add( t.mul( 2 ) ).add( tr ) );
			const th = P.get( 'lines.sobel.threshold' );
			const edge = smoothstep( th, th.mul( 1.6 ).add( 0.02 ), vec2( gx, gy ).length() );
			return mix( c, P.get( 'lines.sobel.color' ), edge.mul( P.get( 'lines.sobel.amount' ) ) );

		},
	},
	{
		id: 'lines.highlight', label: 'Interactable highlight', stage: 'medium',
		enabled: ( v ) => v[ 'lines.highlight.enabled' ],
		requires: () => [ 'ids' ],
		build( c, ctx ) {

			// The ids buffer carries the part (R) and, in B, whether the object is tagged
			// interactable. The outline is the target's mask dilated over two rings of taps.
			const P = ctx.P;
			const ids = ctx.tex( 'ids' );
			const target = P.get( 'lines.highlight.target' );
			const part = select( target.lessThan( 1.5 ), float( PART_INDEX.hero ), select( target.lessThan( 2.5 ), float( PART_INDEX.characters ), select( target.lessThan( 3.5 ), float( PART_INDEX.props ), float( PART_INDEX.vfx ) ) ) );
			const mask = ( uv ) => {

				const id = ids.sample( uv );
				const p = round( id.r.mul( 255 ) );
				const isPart = step( abs( p.sub( part ) ), 0.5 ).max( step( 2.5, target ).oneMinus().mul( step( 1.5, target ) ).mul( step( abs( p.sub( PART_INDEX.hero ) ), 0.5 ) ) );
				return select( target.lessThan( 0.5 ), step( 0.5, id.b ), isPart );

			};

			return Fn( () => {

				const here = mask( ctx.uv ).toVar();
				const radius = ctx.texel.mul( P.get( 'lines.highlight.thickness' ).mul( ctx.lineScale ).max( 1 ) );
				const ring = float( 0 ).toVar();
				for ( let k = 0; k < 12; k ++ ) {

					const a = k / 12 * Math.PI * 2;
					const d = vec2( Math.cos( a ), Math.sin( a ) );
					ring.assign( max( ring, max( mask( ctx.uv.add( d.mul( radius ) ) ), mask( ctx.uv.add( d.mul( radius ).mul( 0.5 ) ) ) ) ) );

				}

				const pulse = mix( 1, sin( ctx.U.time.mul( Math.PI * 2 ) ).mul( 0.5 ).add( 0.5 ).mul( 0.6 ).add( 0.4 ), P.get( 'lines.highlight.pulse' ) );
				const color = P.get( 'lines.highlight.color' );
				const filled = mix( c, color, here.mul( P.get( 'lines.highlight.fill' ) ).mul( pulse ) );
				return mix( filled, color, ring.mul( here.oneMinus() ).mul( pulse ) );

			} )();

		},
	},
	{
		id: 'retro.pixel', label: 'Pixelation and pixel edges', stage: 'medium',
		enabled: ( v ) => v[ 'retro.pixel.enabled' ],
		requires: () => [ 'depth', 'normal' ],
		build( c, ctx ) {

			// One-texel edge highlights, as in three's pixelation pass: outer depth steps
			// darken, creases facing the viewer lighten. Read on the low-res grid.
			const { U } = ctx;
			const depth = ctx.tex( 'depth' ), normal = ctx.tex( 'normal' );
			const strength = ctx.P.get( 'retro.pixel.edges' );

			return Fn( () => {

				const dist = ( uv ) => perspectiveDepthToViewZ( depth.sample( uv ).r, U.lines.near, U.lines.far ).negate();
				const d0 = dist( ctx.uv ).toVar();
				const n0 = colorToDirection( normal.sample( ctx.uv ).rgb ).toVar();
				const depthEdge = float( 0 ).toVar(), normalEdge = float( 0 ).toVar();

				for ( const [ x, y ] of [ [ 1, 0 ], [ - 1, 0 ], [ 0, 1 ], [ 0, - 1 ] ] ) {

					const uv = ctx.uv.add( vec2( x, y ).mul( ctx.texel ) );
					const d = dist( uv );
					const n = colorToDirection( normal.sample( uv ).rgb );
					depthEdge.assign( max( depthEdge, d.sub( d0 ).div( d0 ).clamp( 0, 1 ) ) );
					// Only creases on the near side and facing up/left light up, so each edge is one texel.
					const facing = smoothstep( - 0.01, 0.01, n0.sub( n ).dot( vec3( - 1, 1, 1 ).normalize() ) );
					const sameSurface = smoothstep( 0, 0.02, d.sub( d0 ).div( d0 ).abs() ).oneMinus();
					normalEdge.assign( max( normalEdge, n0.dot( n ).oneMinus().mul( facing ).mul( sameSurface ) ) );

				}

				const dark = smoothstep( 0.03, 0.06, depthEdge );
				const light = smoothstep( 0.08, 0.15, normalEdge ).mul( dark.oneMinus() );
				return c.mul( float( 1 ).sub( dark.mul( strength ).mul( 0.6 ) ) ).mul( float( 1 ).add( light.mul( strength ).mul( 0.5 ) ) );

			} )();

		},
	},
	{
		id: 'quality.fxaa', label: 'FXAA', stage: 'medium', always: true,
		// Auto: FXAA whenever the pass renders without MSAA (it writes extra buffers). Pixel looks stay crisp.
		enabled: ( v, ctx ) => ! v[ 'retro.pixel.enabled' ] && ( v[ 'quality.aa' ] === 'fxaa' || ( [ 'auto', 'msaa' ].includes( v[ 'quality.aa' ] ) && ctx.samples === 0 ) ),
		requires: () => [],
		build( c, ctx ) {

			return vec3( ctx.own( fxaa( vec4( c, 1 ) ) ).rgb );

		},
	},
	{
		id: 'quality.smaa', label: 'SMAA', stage: 'medium',
		enabled: ( v ) => ! v[ 'retro.pixel.enabled' ] && v[ 'quality.aa' ] === 'smaa',
		requires: () => [],
		build( c, ctx ) {

			return vec3( ctx.own( smaa( vec4( c, 1 ) ) ).rgb );

		},
	},
	{
		id: 'media.sharpen', label: 'Sharpen', stage: 'medium', neighborhood: true,
		enabled: ( v ) => v[ 'media.sharpen.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			// Unsharp mask: the image plus (image − blur). Four bilinear diagonal taps make the blur.
			const P = ctx.P;
			const tex = ctx.texture( c );
			const o = ctx.texel.mul( P.get( 'media.sharpen.radius' ).mul( ctx.lineScale ).max( 0.5 ) );
			const blur = tex.sample( ctx.uv.add( o ) ).rgb.add( tex.sample( ctx.uv.sub( o ) ).rgb ).add( tex.sample( ctx.uv.add( vec2( o.x, o.y.negate() ) ) ).rgb ).add( tex.sample( ctx.uv.sub( vec2( o.x, o.y.negate() ) ) ).rgb ).mul( 0.25 );
			const base = tex.sample( ctx.uv ).rgb;
			return base.add( base.sub( blur ).mul( P.get( 'media.sharpen.amount' ) ) ).max( 0 );

		},
	},
	{
		id: 'media.misregistration', label: 'Print misregistration', stage: 'medium', neighborhood: true,
		enabled: ( v ) => v[ 'media.misregistration.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			const P = ctx.P;
			const tex = ctx.texture( c );
			const a = P.get( 'media.misregistration.angle' ).mul( Math.PI / 180 );
			const o = vec2( cos( a ), sin( a ) ).mul( P.get( 'media.misregistration.offset' ) ).mul( ctx.texel ).mul( ctx.gridSize.y.div( 1080 ) );
			return vec3( tex.sample( ctx.uv.add( o ) ).r, tex.sample( ctx.uv ).g, tex.sample( ctx.uv.sub( o ) ).b );

		},
	},
	{
		id: 'media.paper', label: 'Paper', stage: 'medium',
		enabled: ( v ) => v[ 'media.paper.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			const P = ctx.P;
			// Paper relief in [0, 1] per type: newsprint fibers, cold-press bumps, canvas weave, kraft fibers.
			const p = ctx.coord.div( P.get( 'media.paper.scale' ).mul( ctx.gridSize.y.div( 1080 ) ) );
			const type = P.get( 'media.paper.type' );
			const fibers = noise( vec3( p.mul( vec2( 0.9, 0.12 ) ), 2.1 ) ).mul( 0.5 ).add( noise( vec3( p.mul( 0.45 ), 5.3 ) ).mul( 0.5 ) );
			const bumps = mx_worley_noise_float( vec3( p.mul( 0.05 ), 0.5 ) ).oneMinus().mul( 0.7 ).add( noise( vec3( p.mul( 0.3 ), 1.1 ) ).mul( 0.3 ) );
			const weave = sin( p.x.mul( 0.9 ) ).mul( sin( p.y.mul( 0.9 ) ) ).mul( 0.5 ).add( 0.5 ).mul( 0.6 ).add( noise( vec3( p.mul( 0.2 ), 8.4 ) ).mul( 0.4 ) );
			const relief = select( type.lessThan( 0.5 ), fibers, select( type.lessThan( 1.5 ), bumps, select( type.lessThan( 2.5 ), weave, fibers ) ) );
			const paper = P.get( 'media.paper.color' ).mul( relief.mul( 0.22 ).add( 0.82 ) );
			// Multiply: the paper tints and textures light areas; dark ink stays dark.
			return mix( c, c.mul( paper ), P.get( 'media.paper.strength' ) );

		},
	},
];
