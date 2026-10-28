// Baked vertex AO (design §6.4 A "Baked vertex AO: vertex colors at build time").
//
// Once per geometry, every vertex gets an occlusion value in a `stylelabAo` attribute:
// the fraction of its hemisphere that is open, marched through a coarse voxel grid of the
// object's own surface plus the ground plane it stands on. That gives crevices, the
// undersides of overhangs and contact darkening at the base, at no cost per frame. It is
// deterministic and needs no other objects, so shared geometry bakes once.

import { Vector3, Matrix3, BufferAttribute } from 'three/webgpu';

/** Hemisphere directions (z up), cosine-weighted, on a fixed spiral: deterministic. */
const DIRS = Array.from( { length: 12 }, ( _, i ) => {

	const u = ( i + 0.5 ) / 12, a = i * 2.399963;
	const r = Math.sqrt( u );
	return [ r * Math.cos( a ), r * Math.sin( a ), Math.sqrt( 1 - u ) ];

} );

const MAX_CELLS = 72;

/**
 * Bakes occlusion into `geometry` (attribute `stylelabAo`, one float per vertex).
 * @param {BufferGeometry} geometry
 * @param {object} [o]
 * @param {Matrix4} [o.matrix] - geometry space → the space where y = `ground` is the ground plane
 * @param {number|null} [o.ground] - ground height in that space, or null for no ground (terrain, water)
 * @param {number} [o.radius] - occlusion radius in that space's units (meters in the kit)
 * @returns {Float32Array} the values
 */
export function bakeVertexAo( geometry, { matrix = null, ground = 0, radius = 1.2 } = {} ) {

	const pos = geometry.getAttribute( 'position' );
	if ( ! geometry.getAttribute( 'normal' ) ) geometry.computeVertexNormals();
	const nor = geometry.getAttribute( 'normal' );
	const count = pos.count;
	const P = new Float32Array( count * 3 ), N = new Float32Array( count * 3 );
	const v = new Vector3(), nm = matrix ? new Matrix3().getNormalMatrix( matrix ) : null;

	let min = [ Infinity, Infinity, Infinity ], max = [ - Infinity, - Infinity, - Infinity ];
	for ( let i = 0; i < count; i ++ ) {

		v.fromBufferAttribute( pos, i );
		if ( matrix ) v.applyMatrix4( matrix );
		P[ i * 3 ] = v.x; P[ i * 3 + 1 ] = v.y; P[ i * 3 + 2 ] = v.z;
		min = [ Math.min( min[ 0 ], v.x ), Math.min( min[ 1 ], v.y ), Math.min( min[ 2 ], v.z ) ];
		max = [ Math.max( max[ 0 ], v.x ), Math.max( max[ 1 ], v.y ), Math.max( max[ 2 ], v.z ) ];
		v.fromBufferAttribute( nor, i );
		if ( nm ) v.applyMatrix3( nm );
		v.normalize();
		N[ i * 3 ] = v.x; N[ i * 3 + 1 ] = v.y; N[ i * 3 + 2 ] = v.z;

	}

	// The voxel grid: cells of size h over the bounds plus the radius, at most MAX_CELLS a side.
	const lo = min.map( ( x ) => x - radius ), extent = max.map( ( x, k ) => x + radius - lo[ k ] );
	const h = Math.max( Math.max( ...extent ) / MAX_CELLS, radius / 10 );
	const dim = extent.map( ( e ) => Math.max( 1, Math.ceil( e / h ) ) );
	const grid = new Uint8Array( dim[ 0 ] * dim[ 1 ] * dim[ 2 ] );
	const cell = ( x, y, z ) => {

		const i = Math.floor( ( x - lo[ 0 ] ) / h ), j = Math.floor( ( y - lo[ 1 ] ) / h ), k = Math.floor( ( z - lo[ 2 ] ) / h );
		return i < 0 || j < 0 || k < 0 || i >= dim[ 0 ] || j >= dim[ 1 ] || k >= dim[ 2 ] ? - 1 : ( k * dim[ 1 ] + j ) * dim[ 0 ] + i;

	};

	// Rasterize the surface: sample each triangle densely enough to touch every cell it crosses.
	const index = geometry.index;
	const tris = index ? index.count / 3 : count / 3;
	const corner = ( t, c ) => ( index ? index.getX( t * 3 + c ) : t * 3 + c ) * 3;
	for ( let t = 0; t < tris; t ++ ) {

		const a = corner( t, 0 ), b = corner( t, 1 ), c = corner( t, 2 );
		const e = Math.max( Math.hypot( P[ a ] - P[ b ], P[ a + 1 ] - P[ b + 1 ], P[ a + 2 ] - P[ b + 2 ] ), Math.hypot( P[ a ] - P[ c ], P[ a + 1 ] - P[ c + 1 ], P[ a + 2 ] - P[ c + 2 ] ), Math.hypot( P[ b ] - P[ c ], P[ b + 1 ] - P[ c + 1 ], P[ b + 2 ] - P[ c + 2 ] ) );
		const n = Math.min( 64, Math.ceil( e / ( h * 0.7 ) ) );
		for ( let i = 0; i <= n; i ++ ) for ( let j = 0; j <= n - i; j ++ ) {

			const u = i / n || 0, w = j / n || 0, s = 1 - u - w;
			const id = cell( P[ a ] * s + P[ b ] * u + P[ c ] * w, P[ a + 1 ] * s + P[ b + 1 ] * u + P[ c + 1 ] * w, P[ a + 2 ] * s + P[ b + 2 ] * u + P[ c + 2 ] * w );
			if ( id >= 0 ) grid[ id ] = 1;

		}

	}

	// March each vertex's hemisphere: a hit at distance d occludes by (1 − d / radius).
	const out = new Float32Array( count );
	const stepLen = h * 0.8, steps = Math.max( 2, Math.ceil( radius / stepLen ) );
	for ( let i = 0; i < count; i ++ ) {

		const nx = N[ i * 3 ], ny = N[ i * 3 + 1 ], nz = N[ i * 3 + 2 ];
		// Rays start a cell and a half out along the normal, clear of the vertex's own surface
		// cells (a grazing ray started on the surface would stay inside them).
		const px = P[ i * 3 ] + nx * h * 1.5, py = P[ i * 3 + 1 ] + ny * h * 1.5, pz = P[ i * 3 + 2 ] + nz * h * 1.5;
		// A tangent frame around the normal.
		const tx = Math.abs( nx ) < 0.9 ? [ 0, nz, - ny ] : [ - nz, 0, nx ];
		const tl = Math.hypot( ...tx ) || 1;
		const T = tx.map( ( x ) => x / tl ), B = [ ny * T[ 2 ] - nz * T[ 1 ], nz * T[ 0 ] - nx * T[ 2 ], nx * T[ 1 ] - ny * T[ 0 ] ];
		let occ = 0;

		for ( const [ dx, dy, dz ] of DIRS ) {

			const rx = T[ 0 ] * dx + B[ 0 ] * dy + nx * dz, ry = T[ 1 ] * dx + B[ 1 ] * dy + ny * dz, rz = T[ 2 ] * dx + B[ 2 ] * dy + nz * dz;
			for ( let k = 1; k <= steps; k ++ ) {

				const d = ( k - 1 ) * stepLen;
				if ( d > radius ) break;
				const x = px + rx * d, y = py + ry * d, z = pz + rz * d;
				if ( ( ground !== null && y < ground ) || grid[ cell( x, y, z ) ] === 1 ) { occ += 1 - d / radius; break; }

			}

		}

		out[ i ] = Math.max( 0, 1 - occ / DIRS.length * 1.6 );

	}

	geometry.setAttribute( 'stylelabAo', new BufferAttribute( out, 1 ) );
	return out;

}
