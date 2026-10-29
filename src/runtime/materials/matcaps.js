// Procedural matcaps (design §6.4 B "Matcap"): painted spheres generated in code, so the
// runtime needs no image files. A matcap is looked up by the view-space normal: the
// texel at (x, y) is the shading of a sphere whose normal there is (x, y, √(1 − x² − y²)).
// They are mostly neutral, so the part's palette color tints them.

import * as THREE from 'three/webgpu';

const SIZE = 128;
const cache = new Map();

const norm = ( v ) => { const l = Math.hypot( ...v ); return v.map( ( x ) => x / l ); };
const dot = ( a, b ) => a[ 0 ] * b[ 0 ] + a[ 1 ] * b[ 1 ] + a[ 2 ] * b[ 2 ];
const mix = ( a, b, t ) => a.map( ( x, i ) => x + ( b[ i ] - x ) * t );
const smooth = ( e0, e1, x ) => { const t = Math.min( 1, Math.max( 0, ( x - e0 ) / ( e1 - e0 ) ) ); return t * t * ( 3 - 2 * t ); };

const KEY = norm( [ - 0.45, 0.55, 0.7 ] );
const HALF = norm( [ KEY[ 0 ], KEY[ 1 ], KEY[ 2 ] + 1 ] );

/** Linear RGB of each preset for a unit normal n (view space, z toward the viewer). */
export const MATCAPS = {
	// Soft studio clay: wrapped key light, a cool fill from below, a faint rim.
	clay: ( n ) => {

		const key = Math.max( 0, ( dot( n, KEY ) + 0.3 ) / 1.3 );
		const fill = Math.max( 0, - n[ 1 ] ) * 0.12;
		const rim = Math.pow( 1 - n[ 2 ], 3 ) * 0.18;
		return mix( [ 0.16, 0.15, 0.17 ], [ 0.92, 0.88, 0.82 ], key ).map( ( c, i ) => c + fill * [ 0.6, 0.7, 1 ][ i ] + rim );

	},
	// Two-tone toon: a hard light/shade split, a hard highlight and a dark rim band.
	toon: ( n ) => {

		const lit = smooth( 0.18, 0.22, dot( n, KEY ) );
		let c = mix( [ 0.42, 0.42, 0.52 ], [ 0.95, 0.93, 0.9 ], lit );
		if ( Math.pow( Math.max( 0, dot( n, HALF ) ), 80 ) > 0.45 ) c = [ 1, 1, 1 ];
		return mix( c, [ 0.18, 0.18, 0.24 ], smooth( 0.9, 0.94, Math.hypot( n[ 0 ], n[ 1 ] ) ) );

	},
	// Chrome: the view reflected into a sky above and dark ground below a bright horizon, plus a softbox.
	chrome: ( n ) => {

		const r = [ 2 * n[ 2 ] * n[ 0 ], 2 * n[ 2 ] * n[ 1 ], 2 * n[ 2 ] * n[ 2 ] - 1 ];
		const sky = mix( [ 0.55, 0.7, 0.9 ], [ 0.12, 0.25, 0.55 ], Math.max( 0, r[ 1 ] ) );
		const ground = mix( [ 0.3, 0.24, 0.2 ], [ 0.06, 0.05, 0.05 ], Math.min( 1, - r[ 1 ] * 2 ) );
		let c = r[ 1 ] > 0 ? sky : ground;
		c = mix( c, [ 1, 1, 1 ], Math.exp( - Math.abs( r[ 1 ] ) * 40 ) * 0.9 );
		const box = smooth( 0.75, 0.8, dot( norm( r ), norm( [ - 0.5, 0.6, 0.6 ] ) ) );
		return mix( c, [ 1, 1, 1 ], box );

	},
	// Pearl: soft white with a pink-to-blue sheen toward the rim.
	pearl: ( n ) => {

		const key = 0.75 + 0.25 * dot( n, KEY );
		const rim = Math.pow( 1 - n[ 2 ], 2 );
		const sheen = mix( [ 1, 0.82, 0.9 ], [ 0.75, 0.85, 1 ], ( n[ 0 ] + 1 ) / 2 );
		return mix( [ key, key, key * 0.98 ], sheen, rim * 0.8 ).map( ( c ) => c + Math.pow( Math.max( 0, dot( n, HALF ) ), 30 ) * 0.25 );

	},
};

/** The preset's matcap as an sRGB texture (128², cached). */
export function matcapTexture( preset ) {

	if ( cache.has( preset ) ) return cache.get( preset );
	const shade = MATCAPS[ preset ] || MATCAPS.clay;
	const data = new Uint8Array( SIZE * SIZE * 4 );
	const toSrgb = ( x ) => Math.round( 255 * Math.min( 1, Math.max( 0, x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow( x, 1 / 2.4 ) - 0.055 ) ) );

	for ( let j = 0; j < SIZE; j ++ ) for ( let i = 0; i < SIZE; i ++ ) {

		// Row 0 is the bottom of the texture (v = 0), so y grows with j.
		const x = ( i + 0.5 ) / SIZE * 2 - 1, y = ( j + 0.5 ) / SIZE * 2 - 1;
		const r2 = Math.min( 1, x * x + y * y );
		const n = norm( [ x, y, Math.sqrt( 1 - r2 ) + 1e-4 ] );
		const c = shade( n );
		const k = ( j * SIZE + i ) * 4;
		data[ k ] = toSrgb( c[ 0 ] ); data[ k + 1 ] = toSrgb( c[ 1 ] ); data[ k + 2 ] = toSrgb( c[ 2 ] ); data[ k + 3 ] = 255;

	}

	const t = new THREE.DataTexture( data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType );
	t.colorSpace = THREE.SRGBColorSpace;
	t.minFilter = t.magFilter = THREE.LinearFilter;
	t.needsUpdate = true;
	t.name = `matcap:${preset}`;
	cache.set( preset, t );
	return t;

}
