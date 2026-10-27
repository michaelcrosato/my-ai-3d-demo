import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, IcosahedronGeometry, Vector3 } from 'three';
import { computeOutlineNormals } from '../src/runtime/materials/outline.js';

function byPosition( geometry ) {

	const pos = geometry.getAttribute( 'position' ), n = geometry.getAttribute( 'outlineNormal' );
	const groups = new Map();

	for ( let i = 0; i < pos.count; i ++ ) {

		const key = [ pos.getX( i ), pos.getY( i ), pos.getZ( i ) ].map( ( v ) => v.toFixed( 4 ) ).join( ',' );
		if ( ! groups.has( key ) ) groups.set( key, [] );
		groups.get( key ).push( new Vector3( n.getX( i ), n.getY( i ), n.getZ( i ) ) );

	}

	return groups;

}

test( 'cube corners get the exact diagonal, shared by all coincident vertices', () => {

	const geometry = computeOutlineNormals( new BoxGeometry( 1, 1, 1 ) ); // indexed, 24 vertices, flat normals
	const groups = byPosition( geometry );
	assert.equal( groups.size, 8 );

	for ( const [ key, normals ] of groups ) {

		const corner = new Vector3( ...key.split( ',' ).map( Number ) ).normalize();
		for ( const n of normals ) assert.ok( n.distanceTo( corner ) < 1e-6, `${key}: ${n.toArray()} vs ${corner.toArray()}` );

	}

} );

test( 'non-indexed faceted geometry: unit length and outward', () => {

	const geometry = computeOutlineNormals( new IcosahedronGeometry( 1, 0 ) ); // non-indexed
	const pos = geometry.getAttribute( 'position' ), n = geometry.getAttribute( 'outlineNormal' );

	for ( let i = 0; i < pos.count; i ++ ) {

		const normal = new Vector3( n.getX( i ), n.getY( i ), n.getZ( i ) );
		const radial = new Vector3( pos.getX( i ), pos.getY( i ), pos.getZ( i ) ).normalize();
		assert.ok( Math.abs( normal.length() - 1 ) < 1e-6 );
		assert.ok( normal.dot( radial ) > 0.999, 'icosahedron vertex normals point radially' );

	}

	for ( const normals of byPosition( geometry ).values() ) for ( const m of normals ) assert.ok( m.distanceTo( normals[ 0 ] ) < 1e-6 );

} );

test( 'custom attribute name', () => {

	const geometry = computeOutlineNormals( new BoxGeometry(), { name: 'hullNormal' } );
	assert.ok( geometry.getAttribute( 'hullNormal' ) );

} );
