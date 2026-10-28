// Post graph builder (design §7.7, §7.10): CAMERA → GRADE → MEDIUM → DISPLAY → COMPOSITE.
//
// Effects are modules in pipeline order (stage-*.js). The builder walks the enabled
// ones and inserts texture boundaries only where an effect samples its neighbors.
// Continuous parameters are uniforms (ParamUniforms), so the graph is rebuilt only
// when its structural key changes: which effects are on, their structural values, and
// the scene pass configuration. The builder disposes the nodes a graph owned.

import * as THREE from 'three/webgpu';
import { uniform, vec2, vec3, vec4, mix, max, smoothstep, step, abs, floor, renderOutput, screenUV, screenSize, screenCoordinate, convertToTexture } from 'three/tsl';
import { CAMERA, TONE_MAPPING } from './stage-camera.js';
import { GRADE, createGradeLists, applyGradeLists } from './stage-grade.js';
import { MEDIUM } from './stage-medium.js';
import { DISPLAY, createDisplayLists, applyDisplayLists } from './stage-display.js';
import { whiteBalanceGains } from '../color/color.js';

export { TONE_MAPPING };
export { setDisplayColor } from './params.js';

/** Every post effect, in pipeline order. */
export const EFFECTS = [ ...CAMERA, ...GRADE, ...MEDIUM, ...DISPLAY ];

export function createPostUniforms() {

	return {
		exposure: uniform( new THREE.Vector3( 1, 1, 1 ) ),
		lines: {
			thickness: uniform( 1.5 ), color: uniform( new THREE.Color() ), silhouette: uniform( 1 ), crease: uniform( 0.5 ),
			creaseThreshold: uniform( 0.18 ), depthThreshold: uniform( 0.03 ), idWeight: uniform( 1 ), followFog: uniform( 1 ),
			near: uniform( 0.1 ), far: uniform( 1000 ),
		},
		// Per-frame camera-derived values (StyleRuntime.update).
		sunScreen: uniform( new THREE.Vector2( 0.5, 0.2 ) ),
		sunVisible: uniform( 0 ),
		focusDistance: uniform( 10 ),
		proj: uniform( new THREE.Matrix4() ),
		projInv: uniform( new THREE.Matrix4() ),
		lightView: uniform( new THREE.Vector3( 0, 1, 0 ) ),
		pixelSize: uniform( 1 ),
		lowRes: uniform( new THREE.Vector2( 1, 1 ) ),
		// Compare composite (§6.9): hold, split wipe and flicker never rebuild.
		hold: uniform( 0 ),
		split: uniform( 0 ),
		splitPos: uniform( 0.5 ),
		flicker: uniform( 0 ),
		time: uniform( 0 ),
	};

}

export function createPostLists() {

	return { ...createGradeLists(), ...createDisplayLists() };

}

/** Copies resolved global values into the uniforms that aren't one-to-one registry values. */
export function applyPostValues( U, P, lists, v ) {

	P.apply( v );
	const ev = Math.pow( 2, v[ 'grade.exposure' ] );
	const wb = whiteBalanceGains( v[ 'grade.temperature' ], v[ 'grade.tint' ] );
	U.exposure.value.set( wb[ 0 ] * ev, wb[ 1 ] * ev, wb[ 2 ] * ev );

	const L = U.lines;
	L.thickness.value = v[ 'lines.screen.thickness' ];
	L.silhouette.value = v[ 'lines.screen.silhouette' ];
	L.crease.value = v[ 'lines.screen.crease' ];
	L.creaseThreshold.value = 1 - Math.cos( v[ 'lines.screen.creaseAngle' ] * Math.PI / 180 );
	L.depthThreshold.value = v[ 'lines.screen.depthThreshold' ];
	L.idWeight.value = v[ 'lines.screen.idWeight' ];
	L.followFog.value = v[ 'lines.screen.followFog' ];

	applyGradeLists( lists, v );
	applyDisplayLists( lists, v );

}

/** Buffers the enabled effects read from the styled scene pass (§7.7 MRT layout). */
export function passRequirements( v ) {

	const out = new Set();
	for ( const e of EFFECTS ) if ( ! e.always && e.enabled( v, { samples: 0 } ) ) for ( const b of e.requires( v ) ) out.add( b );
	return out;

}

/** Ids of the enabled (non-baseline) effects, in pipeline order: briefs, the audit and tests use it. */
export function activeEffects( v ) {

	return EFFECTS.filter( ( e ) => ! e.always && e.enabled( v, { samples: 0 } ) ).map( ( e ) => e.id );

}

/** Structural key of the post graph: rebuild only when this changes. */
export function graphKey( v, passKey ) {

	const ctx = { samples: passKey.startsWith( '0|' ) ? 0 : 4 };
	return [ passKey, ...EFFECTS.filter( ( e ) => e.enabled( v, ctx ) ).map( ( e ) => `${e.id}${e.key ? ':' + e.key( v ) : ''}` ) ].join( '|' );

}

/**
 * Builds the post graph. Returns the output node and the nodes it owns.
 * @param {object} o - { styledPass, plainPass, values, P, U, lists, atmos, camera (styled), light (styled sun), samples }
 */
export function buildGraph( { styledPass, plainPass, values, P, U, lists, atmos, camera, light, samples } ) {

	const owned = [];
	const pixel = values[ 'retro.pixel.enabled' ] === true;
	const textures = new Map();

	const ctx = {
		v: values, P, U, lists, atmos, camera, light, samples, pixel,
		pass: styledPass,
		tex: ( name ) => {

			if ( ! textures.has( name ) ) textures.set( name, styledPass.getTextureNode( name ) );
			return textures.get( name );

		},
		own: ( node ) => { owned.push( node ); return node; },
		/** A texture boundary: renders `c` to a target so the next effect can sample neighbors. */
		texture: ( c ) => ctx.own( convertToTexture( vec4( c, 1 ) ) ),
	};

	// The effect grid: in pixel looks every output pixel evaluates the center of its
	// low-res texel, so whole blocks share one value and the grid stays locked.
	if ( pixel ) {

		ctx.coord = floor( screenCoordinate.xy.div( U.pixelSize ) );
		ctx.uv = ctx.coord.add( 0.5 ).div( U.lowRes );
		ctx.texel = vec2( 1 ).div( U.lowRes );
		ctx.gridSize = U.lowRes;
		ctx.lineScale = 2 / 3;

	} else {

		ctx.coord = floor( screenCoordinate.xy );
		ctx.uv = screenUV;
		ctx.texel = vec2( 1 ).div( screenSize );
		ctx.gridSize = screenSize;
		ctx.lineScale = screenSize.y.div( 1080 );

	}

	let c = vec3( ctx.tex( 'output' ).sample( ctx.uv ).rgb );
	for ( const e of EFFECTS ) if ( e.enabled( values, ctx ) ) c = e.build( c, ctx );

	// COMPOSITE: the plain baseline (ACES + sRGB, no post), hold / split / flicker.
	const plain = renderOutput( plainPass.getTextureNode( 'output' ), THREE.ACESFilmicToneMapping, THREE.SRGBColorSpace ).rgb;
	const showPlain = max( U.hold, max( U.flicker, U.split.mul( step( screenUV.x, U.splitPos ) ) ) );
	let out = mix( c, plain, showPlain );
	const divider = smoothstep( 0.5, 1.5, abs( screenUV.x.sub( U.splitPos ) ).mul( screenSize.x ) ).oneMinus();
	out = mix( out, vec3( 1 ), divider.mul( U.split ).mul( U.hold.oneMinus() ) );

	return { node: vec4( out, 1 ), owned };

}

/** Disposes the render targets of nodes a graph owned. */
export function disposeOwned( owned ) {

	for ( const node of owned ) {

		node.dispose?.();
		node.textureNode?.dispose?.();
		node.renderTarget?.dispose?.();

	}

}
