// Inverted-hull outlines.
//
// Hulls are extruded along a smoothed "outline normal": the angle-weighted average
// of all face normals that meet at a position. Extruding along per-face (flat)
// normals instead pushes faces apart and leaves cracks at hard edges.

import { BufferAttribute, Vector3, BackSide } from 'three';

const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _e1 = new Vector3();
const _e2 = new Vector3();
const _n = new Vector3();

/**
 * Adds an `outlineNormal` attribute (or `name`) to `geometry`.
 * Works on indexed and non-indexed geometry. Vertices closer than 1/precision
 * are treated as the same position.
 */
export function computeOutlineNormals( geometry, { name = 'outlineNormal', precision = 1e4 } = {} ) {

	const pos = geometry.getAttribute( 'position' );
	const index = geometry.getIndex();
	const triCount = index ? index.count / 3 : pos.count / 3;
	const keyOf = ( i ) => `${Math.round( pos.getX( i ) * precision )},${Math.round( pos.getY( i ) * precision )},${Math.round( pos.getZ( i ) * precision )}`;

	const keys = new Array( pos.count );
	for ( let i = 0; i < pos.count; i ++ ) keys[ i ] = keyOf( i );

	const sums = new Map();
	const corners = [ [ _a, _b, _c ], [ _b, _c, _a ], [ _c, _a, _b ] ];

	for ( let t = 0; t < triCount; t ++ ) {

		const ia = index ? index.getX( t * 3 ) : t * 3;
		const ib = index ? index.getX( t * 3 + 1 ) : t * 3 + 1;
		const ic = index ? index.getX( t * 3 + 2 ) : t * 3 + 2;

		_a.fromBufferAttribute( pos, ia );
		_b.fromBufferAttribute( pos, ib );
		_c.fromBufferAttribute( pos, ic );

		_n.subVectors( _c, _b ).cross( _e1.subVectors( _a, _b ) );
		if ( _n.lengthSq() === 0 ) continue;
		_n.normalize();

		const ids = [ ia, ib, ic ];

		for ( let k = 0; k < 3; k ++ ) {

			const [ p, q, r ] = corners[ k ];
			_e1.subVectors( q, p ).normalize();
			_e2.subVectors( r, p ).normalize();
			const angle = Math.acos( Math.min( 1, Math.max( - 1, _e1.dot( _e2 ) ) ) );

			const key = keys[ ids[ k ] ];
			let sum = sums.get( key );
			if ( sum === undefined ) sums.set( key, sum = new Vector3() );
			sum.addScaledVector( _n, angle );

		}

	}

	const out = new Float32Array( pos.count * 3 );

	for ( let i = 0; i < pos.count; i ++ ) {

		const sum = sums.get( keys[ i ] );
		if ( sum === undefined ) continue;
		_n.copy( sum ).normalize();
		out[ i * 3 ] = _n.x;
		out[ i * 3 + 1 ] = _n.y;
		out[ i * 3 + 2 ] = _n.z;

	}

	geometry.setAttribute( name, new BufferAttribute( out, 3 ) );
	return geometry;

}

/**
 * Builds a hull material: back faces pushed out in clip space by a constant
 * number of pixels, specified at a 1080p reference height.
 * TSL and the node material are passed in so this module stays loadable in Node.
 */
export function createHullMaterial( { THREE, TSL, color, thickness, normalName = 'outlineNormal' } ) {

	const { Fn, vec4, attribute, positionLocal, modelViewMatrix, cameraProjectionMatrix, screenSize } = TSL;

	const material = new THREE.MeshBasicNodeMaterial( { side: BackSide } );
	material.colorNode = color;

	material.vertexNode = Fn( () => {

		const clip = cameraProjectionMatrix.mul( modelViewMatrix ).mul( vec4( positionLocal, 1 ) );
		const nView = modelViewMatrix.mul( vec4( attribute( normalName, 'vec3' ), 0 ) ).xyz;
		const nClip = cameraProjectionMatrix.mul( vec4( nView, 0 ) ).xy;
		const pixels = thickness.mul( screenSize.y.div( 1080 ) );
		const offset = nClip.normalize().mul( pixels ).mul( 2 ).div( screenSize ).mul( clip.w );

		return vec4( clip.xy.add( offset ), clip.zw );

	} )();

	return material;

}
