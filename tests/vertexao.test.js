// Baked vertex AO (design §6.4 A, P2): a box on the ground is darker at its base than on
// top, a crevice is darker than an open face, and the bake is deterministic.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeVertexAo } from '../src/runtime/materials/vertexAo.js';

const mean = ( g, ao, keep ) => {

	const pos = g.getAttribute( 'position' ), nor = g.getAttribute( 'normal' );
	let s = 0, n = 0;
	for ( let i = 0; i < pos.count; i ++ ) if ( keep( pos.getY( i ), nor.getY( i ), pos.getX( i ) ) ) { s += ao[ i ]; n ++; }
	return s / n;

};

test( 'a box on the ground: the base is darker than the top, and the bake is deterministic', () => {

	const g = new THREE.BoxGeometry( 1, 1, 1, 4, 4, 4 ).translate( 0, 0.5, 0 );
	const ao = bakeVertexAo( g, { ground: 0, radius: 1.2 } );
	assert.equal( g.getAttribute( 'stylelabAo' ).count, g.getAttribute( 'position' ).count );
	assert.ok( ao.every( ( v ) => v >= 0 && v <= 1 ) );
	const top = mean( g, ao, ( y, ny ) => ny > 0.9 );
	const base = mean( g, ao, ( y, ny ) => Math.abs( ny ) < 0.1 && y < 0.2 );
	assert.ok( top > 0.95, `the top is open (${top})` );
	assert.ok( base < top - 0.15, `the sides darken at the ground (${base} vs ${top})` );
	assert.deepEqual( bakeVertexAo( g.clone(), { ground: 0, radius: 1.2 } ), ao );

	// No ground (terrain, water): the sides near the bottom stay open.
	const free = bakeVertexAo( g.clone(), { ground: null, radius: 1.2 } );
	assert.ok( mean( g, free, ( y, ny ) => Math.abs( ny ) < 0.1 && y < 0.2 ) > base + 0.1 );

} );

test( 'a crevice between two blocks is darker than their outer faces', () => {

	// Two tall blocks 0.3 m apart: the inner faces see each other.
	const a = new THREE.BoxGeometry( 1, 2, 1, 2, 6, 2 ).translate( - 0.65, 1, 0 );
	const b = new THREE.BoxGeometry( 1, 2, 1, 2, 6, 2 ).translate( 0.65, 1, 0 );
	const g = mergeGeometries( [ a, b ] );
	const ao = bakeVertexAo( g, { ground: 0, radius: 1.2 } );
	const inner = mean( g, ao, ( y, ny, x ) => Math.abs( x ) < 0.2 && y > 1 );
	const outer = mean( g, ao, ( y, ny, x ) => Math.abs( x ) > 1.1 && y > 1 );
	assert.ok( inner < outer - 0.2, `crevice ${inner} vs outer ${outer}` );

} );
