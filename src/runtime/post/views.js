// Designer views (design §6.13): analysis overlays that train the eye, applied to the
// finished styled image. They need a graph rebuild to switch (each is its own small graph),
// never a scene change. Buffer views show what the line and AO shaders see.

import { vec2, vec3, float, mix, max, min, abs, step, smoothstep, floor, round, length, luminance, screenUV, screenSize, sRGBTransferEOTF, sRGBTransferOETF, perspectiveDepthToViewZ, colorToDirection } from 'three/tsl';
import { displayToOklab } from './colorspace.js';

export const VIEWS = [
	{ id: 'value', label: 'Value (grayscale)', learn: 'If it reads in grayscale, it reads: the light and dark structure.' },
	{ id: 'squint', label: 'Squint (blur)', learn: 'Detail disappears; only the big masses and the focal point remain.' },
	{ id: 'silhouette', label: 'Silhouette', learn: 'Shapes as flat black: can you still tell what everything is?', requires: [ 'ids' ] },
	{ id: 'thumbnail', label: 'Thumbnail (128 px)', learn: 'Does it read at thumbnail size, as in a store listing?' },
	{ id: 'saturation', label: 'Saturation heatmap', learn: 'Where color is strongest. The focus should be the most saturated thing.' },
	{ id: 'busyness', label: 'Busyness (edge density)', learn: 'Where detail competes for attention. Calm areas let the eye rest.' },
	{ id: 'protan', label: 'Color-blind: protan', learn: 'Red-weak vision (about 1% of men).' },
	{ id: 'deutan', label: 'Color-blind: deutan', learn: 'Green-weak vision, the most common (about 5% of men).' },
	{ id: 'tritan', label: 'Color-blind: tritan', learn: 'Blue-weak vision (rare).' },
	{ id: 'thirds', label: 'Rule of thirds', learn: 'Strong compositions put the subject near a line or an intersection.' },
	{ id: 'golden', label: 'Golden ratio', learn: 'The same idea with 0.382 / 0.618 lines.' },
	{ id: 'center', label: 'Center cross', learn: 'Centered framing: symmetric, calm, confrontational.' },
	{ id: 'buffer-depth', label: 'Buffer: depth', learn: 'Linear depth, what fog, depth of field and line silhouettes read.', requires: [ 'depth' ], buffer: true },
	{ id: 'buffer-normal', label: 'Buffer: normals', learn: 'Surface directions, what crease lines and AO read.', requires: [ 'normal' ], buffer: true },
	{ id: 'buffer-ids', label: 'Buffer: part ids', learn: 'Which part each pixel belongs to: what per-part masks and id edges read.', requires: [ 'ids' ], buffer: true },
];

export const viewById = new Map( VIEWS.map( ( v ) => [ v.id, v ] ) );

// Machado et al. 2009, severity 1, on linear RGB (rows).
const CVD = {
	protan: [ [ 0.152286, 1.052583, - 0.204868 ], [ 0.114503, 0.786281, 0.099216 ], [ - 0.003882, - 0.048116, 1.051998 ] ],
	deutan: [ [ 0.367322, 0.860646, - 0.227968 ], [ 0.280085, 0.672501, 0.047413 ], [ - 0.011820, 0.042940, 0.968881 ] ],
	tritan: [ [ 1.255528, - 0.076749, - 0.178779 ], [ - 0.078411, 0.930809, 0.147602 ], [ 0.004733, 0.691367, 0.303900 ] ],
};

/** A blue → green → yellow → red ramp for heatmaps (t in 0–1). */
const heat = ( t ) => {

	const a = vec3( 0.12, 0.16, 0.45 ), b = vec3( 0.1, 0.65, 0.4 ), c = vec3( 0.98, 0.85, 0.2 ), d = vec3( 0.9, 0.2, 0.15 );
	return mix( mix( a, b, smoothstep( 0, 0.35, t ) ), mix( c, d, smoothstep( 0.65, 1, t ) ), smoothstep( 0.3, 0.7, t ) );

};

/** Thin overlay lines at the given fractions of the width and height. */
function guides( c, xs, ys ) {

	const px = vec2( 1 ).div( screenSize );
	let on = float( 0 );
	for ( const x of xs ) on = max( on, step( abs( screenUV.x.sub( x ) ), px.x.mul( 1.2 ) ) );
	for ( const y of ys ) on = max( on, step( abs( screenUV.y.sub( y ) ), px.y.mul( 1.2 ) ) );
	return mix( c, vec3( 1, 1, 1 ), on.mul( 0.75 ) );

}

/**
 * Applies a designer view to the finished display-referred image.
 * @param {string} id - a VIEWS id
 * @param {Node} c - vec3 display color
 * @param {object} ctx - the graph context (texture boundaries, buffers, uv, camera uniforms)
 */
export function designerView( id, c, ctx ) {

	switch ( id ) {

		case 'value': return vec3( luminance( c ) );
		case 'squint': {

			const t = ctx.texture( c );
			let sum = vec3( 0 );
			const r = vec2( 0.018, 0.018 * 16 / 9 );
			const taps = [ [ 0, 0 ], ...Array.from( { length: 12 }, ( _, i ) => [ Math.cos( i / 12 * Math.PI * 2 ), Math.sin( i / 12 * Math.PI * 2 ) ] ), ...Array.from( { length: 6 }, ( _, i ) => [ 0.5 * Math.cos( ( i + 0.5 ) / 6 * Math.PI * 2 ), 0.5 * Math.sin( ( i + 0.5 ) / 6 * Math.PI * 2 ) ] ) ];
			for ( const [ x, y ] of taps ) sum = sum.add( t.sample( screenUV.add( vec2( x, y ).mul( r ) ) ).rgb );
			return sum.div( taps.length );

		}

		case 'silhouette': {

			const part = round( ctx.tex( 'ids' ).sample( ctx.uv ).r.mul( 255 ) );
			return vec3( step( part, 0.5 ) ); // sky (part 0) white, everything else black

		}

		case 'thumbnail': {

			const t = ctx.texture( c );
			const grid = vec2( 128, screenSize.y.div( screenSize.x ).mul( 128 ) );
			return t.sample( floor( screenUV.mul( grid ) ).add( 0.5 ).div( grid ) ).rgb;

		}

		case 'saturation': {

			const lab = displayToOklab( c );
			return mix( vec3( luminance( c ).mul( 0.35 ) ), heat( length( lab.yz ).div( 0.25 ).clamp( 0, 1 ) ), 0.85 );

		}

		case 'busyness': {

			const t = ctx.texture( c );
			const px = vec2( 1.5 ).div( screenSize );
			const L = ( dx, dy ) => luminance( t.sample( screenUV.add( vec2( dx, dy ).mul( px ) ) ).rgb );
			const gx = L( 1, - 1 ).add( L( 1, 0 ).mul( 2 ) ).add( L( 1, 1 ) ).sub( L( - 1, - 1 ) ).sub( L( - 1, 0 ).mul( 2 ) ).sub( L( - 1, 1 ) );
			const gy = L( - 1, 1 ).add( L( 0, 1 ).mul( 2 ) ).add( L( 1, 1 ) ).sub( L( - 1, - 1 ) ).sub( L( 0, - 1 ).mul( 2 ) ).sub( L( 1, - 1 ) );
			return heat( length( vec2( gx, gy ) ).mul( 2.5 ).clamp( 0, 1 ) );

		}

		case 'protan': case 'deutan': case 'tritan': {

			const lin = sRGBTransferEOTF( c );
			const [ a, b, d ] = CVD[ id ];
			const out = vec3( lin.dot( vec3( ...a ) ), lin.dot( vec3( ...b ) ), lin.dot( vec3( ...d ) ) ).max( 0 );
			return sRGBTransferOETF( out ).clamp( 0, 1 );

		}

		case 'thirds': return guides( c, [ 1 / 3, 2 / 3 ], [ 1 / 3, 2 / 3 ] );
		case 'golden': return guides( c, [ 0.382, 0.618 ], [ 0.382, 0.618 ] );
		case 'center': return guides( c, [ 0.5 ], [ 0.5 ] );
		case 'buffer-depth': {

			const z = perspectiveDepthToViewZ( ctx.tex( 'depth' ).sample( ctx.uv ).r, ctx.U.lines.near, ctx.U.lines.far ).negate();
			return vec3( float( 1 ).sub( z.div( 60 ).clamp( 0, 1 ).pow( 0.5 ) ) );

		}

		case 'buffer-normal': return colorToDirection( ctx.tex( 'normal' ).sample( ctx.uv ).rgb ).mul( 0.5 ).add( 0.5 );
		case 'buffer-ids': {

			const p = ctx.tex( 'ids' ).sample( ctx.uv ).r.mul( 255 );
			// A distinct hue per part.
			const h = p.mul( 0.137 ).fract();
			return vec3( h.mul( 6.2831 ).sin(), h.add( 0.333 ).mul( 6.2831 ).sin(), h.add( 0.666 ).mul( 6.2831 ).sin() ).mul( 0.45 ).add( 0.5 ).mul( min( p, 1 ) );

		}

		default: return c;

	}

}

