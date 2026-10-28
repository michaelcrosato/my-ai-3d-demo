// Post graph builder (design §7.7, §7.10): CAMERA → GRADE → MEDIUM → DISPLAY → COMPOSITE.
//
// Effects are modules in pipeline order (stage-*.js). The builder walks the enabled
// ones and inserts texture boundaries only where an effect samples its neighbors.
// Continuous parameters are uniforms (ParamUniforms), so the graph is rebuilt only
// when its structural key changes: which effects are on, their structural values, and
// the scene pass configuration. The builder disposes the nodes a graph owned.

import * as THREE from 'three/webgpu';
import { uniform, uniformArray, texture, vec2, vec3, vec4, float, int, mix, max, smoothstep, step, abs, floor, round, select, luminance, renderOutput, screenUV, screenSize, screenCoordinate, convertToTexture, mx_noise_float } from 'three/tsl';
import { REGISTRY, PARTS } from '../registry/index.js';
import { CAMERA, TONE_MAPPING } from './stage-camera.js';
import { GRADE, createGradeLists, applyGradeLists } from './stage-grade.js';
import { MEDIUM } from './stage-medium.js';
import { DISPLAY, createDisplayLists, applyDisplayLists } from './stage-display.js';
import { whiteBalanceGains, hexToRgb } from '../color/color.js';
import { designerView, viewById } from './views.js';

export { TONE_MAPPING };
export { setDisplayColor } from './params.js';

/** Every post effect, in pipeline order. */
export const EFFECTS = [ ...CAMERA, ...GRADE, ...MEDIUM, ...DISPLAY ];

/**
 * Post effects that can be limited to some parts (§6.7, §7.11): their switch has scope
 * 'mask'. The runtime folds the per-part switches into the global values (on if any part
 * has it) plus a bit mask; a partial mask needs the ids buffer.
 */
export const MASKED = REGISTRY.filter( ( e ) => e.scope === 'mask' && e.type === 'bool' ).map( ( e ) => e.id );
export const ALL_PARTS = ( 1 << PARTS.length ) - 1;
const MASK_OF = { 'lines.screen': 'lines.screen.enabled', 'lighting.ao': 'lighting.ao.enabled', 'lighting.contact': 'lighting.contact.enabled', 'media.kuwahara': 'media.kuwahara.enabled', 'media.watercolor': 'media.watercolor.enabled', 'media.halftone': 'media.halftone.enabled', 'media.hatching': 'media.hatching.enabled', 'media.paper': 'media.paper.enabled' };
for ( const e of EFFECTS ) if ( MASK_OF[ e.id ] ) e.mask = MASK_OF[ e.id ];

/** Global values plus the per-part masks: `@mask:<switch>` (bits) and `@partial:<switch>`. */
export function withPartMasks( global, parts ) {

	const out = { ...global };
	for ( const id of MASKED ) {

		let bits = 0;
		PARTS.forEach( ( p, i ) => { if ( parts[ p ][ id ] ) bits |= 1 << i; } );
		out[ id ] = bits !== 0;
		out[ `@mask:${id}` ] = bits;
		out[ `@partial:${id}` ] = bits !== 0 && bits !== ALL_PARTS;

	}

	return out;

}

export function createPostUniforms() {

	return {
		exposure: uniform( new THREE.Vector3( 1, 1, 1 ) ),
		lines: {
			thickness: uniform( 1.5 ), color: uniform( new THREE.Color() ), silhouette: uniform( 1 ), crease: uniform( 0.5 ),
			creaseThreshold: uniform( 0.18 ), depthThreshold: uniform( 0.03 ), idWeight: uniform( 1 ), followFog: uniform( 1 ),
			near: uniform( 0.1 ), far: uniform( 1000 ),
			// Per part (index = part id): thickness in px at 1080p and color (raw sRGB).
			partThickness: uniformArray( new Array( 16 ).fill( 1.5 ), 'float' ),
			partColor: uniformArray( Array.from( { length: 16 }, () => new THREE.Color() ), 'color' ),
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
		// Per-part masks (bits per masked switch), per-part ink, isolate (part index or -1).
		masks: Object.fromEntries( MASKED.map( ( id ) => [ id, uniform( 0, 'int' ) ] ) ),
		isolate: uniform( - 1, 'int' ),
		// Transitions (§6.10): crossfade and wipe blend from a snapshot of the outgoing frame.
		transitionMode: uniform( 0 ), // 0 off · 1 crossfade · 2 wipe
		transitionProgress: uniform( 1 ),
		snapshot: null, // texture node, set by the runtime
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

/**
 * Copies resolved values into the uniforms that aren't one-to-one registry values.
 * `v` is the global values with part masks (withPartMasks); `parts` the per-part values.
 */
export function applyPostValues( U, P, lists, v, parts = null ) {

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
	PARTS.forEach( ( p, i ) => {

		const pv = parts?.[ p ] || v;
		L.partThickness.array[ i ] = pv[ 'lines.screen.thickness' ];
		const [ r, g, b ] = hexToRgb( pv[ 'lines.screen.color' ] );
		L.partColor.array[ i ].setRGB( r, g, b, THREE.LinearSRGBColorSpace );

	} );
	for ( const id of MASKED ) U.masks[ id ].value = v[ `@mask:${id}` ] ?? ( v[ id ] ? ALL_PARTS : 0 );

	applyGradeLists( lists, v );
	applyDisplayLists( lists, v );

}

/** Buffers the enabled effects read from the styled scene pass (§7.7 MRT layout). */
export function passRequirements( v ) {

	const out = new Set();
	for ( const e of EFFECTS ) {

		if ( e.always || ! e.enabled( v, { samples: 0 } ) ) continue;
		for ( const b of e.requires( v ) ) out.add( b );
		if ( e.mask && v[ `@partial:${e.mask}` ] ) out.add( 'ids' );

	}

	if ( v[ '@isolate' ] ) out.add( 'ids' );
	for ( const b of viewById.get( v[ '@view' ] )?.requires || [] ) out.add( b );
	return out;

}

/** Ids of the enabled (non-baseline) effects, in pipeline order: briefs, the audit and tests use it. */
export function activeEffects( v ) {

	return EFFECTS.filter( ( e ) => ! e.always && e.enabled( v, { samples: 0 } ) ).map( ( e ) => e.id );

}

/** Structural key of the post graph: rebuild only when this changes. */
export function graphKey( v, passKey ) {

	const ctx = { samples: passKey.startsWith( '0|' ) ? 0 : 4 };
	return [ passKey, v[ '@isolate' ] ? 'isolate' : '', v[ '@view' ] ? `view:${v[ '@view' ]}` : '', ...EFFECTS.filter( ( e ) => e.enabled( v, ctx ) ).map( ( e ) => `${e.id}${e.key ? ':' + e.key( v ) : ''}${e.mask && v[ `@partial:${e.mask}` ] ? '@mask' : ''}` ) ].join( '|' );

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
		/** The part index (0–15) of the pixel, from the ids buffer. */
		partIndex: () => int( round( ctx.tex( 'ids' ).sample( ctx.uv ).r.mul( 255 ) ) ),
		/** 1 where the pixel's part has masked switch `id` on. */
		partMask: ( id ) => float( U.masks[ id ].shiftRight( ctx.partIndex() ).bitAnd( int( 1 ) ) ),
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
	const finals = [];
	for ( const e of EFFECTS ) {

		if ( ! e.enabled( values, ctx ) ) continue;
		if ( e.final ) { finals.push( e ); continue; }
		const before = c;
		c = e.build( c, ctx );
		// Masked post (§7.11): the effect shows only on the parts that have it.
		if ( e.mask && values[ `@partial:${e.mask}` ] ) c = mix( before, c, ctx.partMask( e.mask ) );

	}

	// Effects that must see the finished image and must not be sampled again (TRAA).
	for ( const e of finals ) c = e.build( c, ctx );

	// Designer views (Analyze tab): analysis overlays on the finished image.
	if ( values[ '@view' ] && viewById.has( values[ '@view' ] ) ) c = designerView( values[ '@view' ], c, ctx );

	// Isolate (Parts tab): every other part dims and grays, and the part's mask is outlined.
	if ( values[ '@isolate' ] ) {

		const ids = ctx.tex( 'ids' );
		const inside = ( uv ) => step( abs( float( round( ids.sample( uv ).r.mul( 255 ) ) ).sub( float( U.isolate ) ) ), 0.5 );
		const here = inside( ctx.uv );
		const px = vec2( 1.5 ).div( screenSize );
		const ring = max( max( inside( ctx.uv.add( vec2( px.x, 0 ) ) ), inside( ctx.uv.sub( vec2( px.x, 0 ) ) ) ), max( inside( ctx.uv.add( vec2( 0, px.y ) ) ), inside( ctx.uv.sub( vec2( 0, px.y ) ) ) ) ).sub( here ).max( 0 );
		c = mix( mix( vec3( luminance( c ) ), c, 0.25 ).mul( 0.35 ), c, here );
		c = mix( c, vec3( 0.54, 0.71, 0.97 ), ring );

	}

	// Transitions: crossfade or wipe from the snapshot of the outgoing look.
	if ( U.snapshot ) {

		const p = U.transitionProgress;
		const n = mx_noise_float( vec3( screenUV.mul( 6 ), 0.5 ) ).mul( 0.12 );
		const wipe = smoothstep( p.mul( 1.3 ).sub( 0.15 ), p.mul( 1.3 ).sub( 0.05 ), screenUV.x.add( n ) ).oneMinus();
		const k = select( U.transitionMode.greaterThan( 1.5 ), wipe, select( U.transitionMode.greaterThan( 0.5 ), p, float( 1 ) ) );
		c = mix( U.snapshot.sample( screenUV ).rgb, c, k );

	}

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
