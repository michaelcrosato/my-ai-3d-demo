// Post graph builder (design §7.7, §7.10): CAMERA → GRADE → MEDIUM → DISPLAY → COMPOSITE.
//
// Continuous parameters are uniforms (no rebuilds). The graph is rebuilt only when
// its structural key changes (tone mapping, bloom on/off, screen lines on/off); the
// builder then disposes the effect nodes it replaced (M0 spike 5).

import * as THREE from 'three/webgpu';
import { uniform, vec2, vec3, vec4, mix, max, smoothstep, step, abs, sin, dot, fract, floor, length, luminance, saturation, renderOutput, screenUV, screenSize, screenCoordinate } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { screenLines } from './lines.js';
import { hexToRgb, whiteBalanceGains } from '../color/color.js';

export const TONE_MAPPING = {
	none: THREE.NoToneMapping,
	linear: THREE.LinearToneMapping,
	reinhard: THREE.ReinhardToneMapping,
	cineon: THREE.CineonToneMapping,
	aces: THREE.ACESFilmicToneMapping,
	agx: THREE.AgXToneMapping,
	neutral: THREE.NeutralToneMapping,
};

/** Colors used after the output transform live in display (sRGB) space: store raw sRGB numbers. */
export function setDisplayColor( u, hex ) {

	const [ r, g, b ] = hexToRgb( hex );
	u.value.setRGB( r, g, b, THREE.LinearSRGBColorSpace );

}

const displayColor = ( hex ) => { const u = uniform( new THREE.Color() ); setDisplayColor( u, hex ); return u; };

export function createPostUniforms() {

	return {
		exposure: uniform( new THREE.Vector3( 1, 1, 1 ) ),
		contrast: uniform( 1 ),
		saturation: uniform( 1 ),
		splitAmount: uniform( 0 ),
		splitShadows: displayColor( '#2e5f8a' ),
		splitHighlights: displayColor( '#ffb46b' ),
		splitBalance: uniform( 0 ),
		vignetteAmount: uniform( 0 ),
		vignetteSoftness: uniform( 0.5 ),
		vignetteRoundness: uniform( 1 ),
		vignetteColor: displayColor( '#000000' ),
		grainAmount: uniform( 0 ),
		grainSize: uniform( 1.5 ),
		grainAnimated: uniform( 1 ),
		lines: {
			thickness: uniform( 1.5 ), color: displayColor( '#0e0e12' ), silhouette: uniform( 1 ), crease: uniform( 0.5 ),
			creaseThreshold: uniform( 0.18 ), depthThreshold: uniform( 0.03 ), idWeight: uniform( 1 ), followFog: uniform( 1 ),
			near: uniform( 0.1 ), far: uniform( 1000 ),
		},
		// Compare composite (§6.9): hold, split wipe and flicker never rebuild.
		hold: uniform( 0 ),
		split: uniform( 0 ),
		splitPos: uniform( 0.5 ),
		flicker: uniform( 0 ),
		time: uniform( 0 ),
	};

}

/** Copies resolved global values into the post uniforms. */
export function applyPostValues( U, v ) {

	const ev = Math.pow( 2, v[ 'grade.exposure' ] );
	const wb = whiteBalanceGains( v[ 'grade.temperature' ], v[ 'grade.tint' ] );
	U.exposure.value.set( wb[ 0 ] * ev, wb[ 1 ] * ev, wb[ 2 ] * ev );
	U.contrast.value = v[ 'grade.contrast' ];
	U.saturation.value = v[ 'grade.saturation' ];
	U.splitAmount.value = v[ 'grade.split.amount' ];
	setDisplayColor( U.splitShadows, v[ 'grade.split.shadows' ] );
	setDisplayColor( U.splitHighlights, v[ 'grade.split.highlights' ] );
	U.splitBalance.value = v[ 'grade.split.balance' ];
	U.vignetteAmount.value = v[ 'lens.vignette.amount' ];
	U.vignetteSoftness.value = v[ 'lens.vignette.softness' ];
	U.vignetteRoundness.value = v[ 'lens.vignette.roundness' ];
	setDisplayColor( U.vignetteColor, v[ 'lens.vignette.color' ] );
	U.grainAmount.value = v[ 'media.grain.amount' ];
	U.grainSize.value = v[ 'media.grain.size' ];
	U.grainAnimated.value = v[ 'media.grain.animated' ] ? 1 : 0;

	const L = U.lines;
	L.thickness.value = v[ 'lines.screen.thickness' ];
	setDisplayColor( L.color, v[ 'lines.screen.color' ] );
	L.silhouette.value = v[ 'lines.screen.silhouette' ];
	L.crease.value = v[ 'lines.screen.crease' ];
	L.creaseThreshold.value = 1 - Math.cos( v[ 'lines.screen.creaseAngle' ] * Math.PI / 180 );
	L.depthThreshold.value = v[ 'lines.screen.depthThreshold' ];
	L.idWeight.value = v[ 'lines.screen.idWeight' ];
	L.followFog.value = v[ 'lines.screen.followFog' ];

}

/** Structural key of the post graph: rebuild only when this changes. */
export const graphKey = ( v ) => [ v[ 'grade.toneMapping' ], v[ 'lens.bloom.enabled' ] ? 'bloom' : '', v[ 'lines.screen.enabled' ] ? 'lines' : '' ].join( '|' );

/** Whether the styled pass needs the normal + ids attachments (and so renders without MSAA). */
export const needsMRT = ( v ) => v[ 'lines.screen.enabled' ] === true;

// GRADE: contrast → saturation → split toning, in display space.
function grade( c, U ) {

	let x = c.sub( 0.5 ).mul( U.contrast ).add( 0.5 ).max( 0 );
	x = saturation( x, U.saturation );
	const h = smoothstep( 0.05, 0.95, luminance( x ).sub( U.splitBalance.mul( 0.25 ) ) );
	const tone = mix( U.splitShadows, U.splitHighlights, h );
	const softLight = x.mul( x ).mul( tone.mul( 2 ).oneMinus() ).add( x.mul( tone ).mul( 2 ) );
	return mix( x, softLight, U.splitAmount );

}

// DISPLAY: vignette → grain (grain last, so nothing smears or grades it).
function display( c, U ) {

	const aspect = screenSize.x.div( screenSize.y );
	const sx = mix( 1, aspect, U.vignetteRoundness );
	const p = screenUV.sub( 0.5 ).mul( 2 ).mul( vec2( sx, 1 ) );
	const r = length( p ).div( length( vec2( sx, 1 ) ) );
	const v = smoothstep( U.vignetteSoftness.oneMinus(), U.vignetteSoftness.mul( 0.2 ).add( 1 ), r ).mul( U.vignetteAmount );
	let x = mix( c, U.vignetteColor, v );

	const cell = floor( screenCoordinate.xy.div( U.grainSize.mul( screenSize.y.div( 1080 ) ).max( 1 ) ) );
	const seed = floor( U.time.mul( 24 ) ).mul( U.grainAnimated );
	const n = fract( sin( dot( cell.add( vec2( seed.mul( 17.13 ), seed.mul( 41.7 ) ) ), vec2( 12.9898, 78.233 ) ) ).mul( 43758.5453 ) ).sub( 0.5 );
	const response = luminance( x ).sub( 0.5 ).mul( 2 ).pow( 2 ).mul( 0.6 ).oneMinus();
	x = x.add( n.mul( U.grainAmount ).mul( 2 ).mul( response ) );
	return x;

}

/**
 * Builds the post graph. Returns the output node, the bloom node (its uniforms
 * are updated per apply) and the nodes this graph owns.
 */
export function buildGraph( { styledPass, plainPass, values, U, atmos } ) {

	const owned = [];
	const hdr = styledPass.getTextureNode( 'output' );

	// CAMERA (HDR, linear): bloom → exposure and white balance → tone mapping → sRGB.
	let c = vec3( hdr.rgb );
	let bloomNode = null;

	if ( values[ 'lens.bloom.enabled' ] ) {

		bloomNode = bloom( hdr, values[ 'lens.bloom.strength' ], values[ 'lens.bloom.radius' ], values[ 'lens.bloom.threshold' ] );
		owned.push( bloomNode );
		c = c.add( bloomNode.rgb );

	}

	c = c.mul( U.exposure );
	c = renderOutput( vec4( c, 1 ), TONE_MAPPING[ values[ 'grade.toneMapping' ] ], THREE.SRGBColorSpace ).rgb;

	c = grade( c, U );

	// MEDIUM: ink lines over the graded image, then anti-aliasing (the pass has no MSAA).
	if ( values[ 'lines.screen.enabled' ] ) {

		c = screenLines( c, { depth: styledPass.getTextureNode( 'depth' ), normal: styledPass.getTextureNode( 'normal' ), ids: styledPass.getTextureNode( 'ids' ) }, U.lines, atmos );
		const aa = fxaa( vec4( c, 1 ) );
		owned.push( aa );
		c = vec3( aa.rgb );

	}

	c = display( c, U );

	// COMPOSITE: the plain baseline (ACES + sRGB, no post), hold / split / flicker.
	const plain = renderOutput( plainPass.getTextureNode( 'output' ), THREE.ACESFilmicToneMapping, THREE.SRGBColorSpace ).rgb;
	const showPlain = max( U.hold, max( U.flicker, U.split.mul( step( screenUV.x, U.splitPos ) ) ) );
	let out = mix( c, plain, showPlain );
	const divider = smoothstep( 0.5, 1.5, abs( screenUV.x.sub( U.splitPos ) ).mul( screenSize.x ) ).oneMinus();
	out = mix( out, vec3( 1 ), divider.mul( U.split ).mul( U.hold.oneMinus() ) );

	return { node: vec4( out, 1 ), bloomNode, owned };

}

/** Disposes the render targets of nodes a graph owned. */
export function disposeOwned( owned ) {

	for ( const node of owned ) {

		node.dispose?.();
		node.textureNode?.dispose?.();

	}

}
