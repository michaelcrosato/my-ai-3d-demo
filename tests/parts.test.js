import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessParts, tokenize } from '../src/runtime/parts/guess.js';

const box = ( min, max ) => ( { min, max } );

test( 'tokenize splits names, camelCase and numbering', () => {

	assert.deepEqual( tokenize( 'Tree_Leaves.001' ), [ 'tree', 'leaves' ] );
	assert.deepEqual( tokenize( 'houseRoofLeft' ), [ 'house', 'roof', 'left' ] );

} );

test( 'tags beat names, names beat shape, mesh names beat ancestors', () => {

	const g = guessParts( [
		{ name: 'Crate', userData: { part: 'hero' } },
		{ name: 'Mesh.003', materialName: 'TreeBark' },
		{ name: 'Body', ancestors: [ 'Player' ] },
		{ name: 'Mesh', ancestors: [ 'Player', 'Village' ] },
		{ name: 'chart_board' },
		{ name: 'Torch_Flame' },
		{ name: 'Gem', emissive: 1 },
		{ name: 'Barrel' },
	] );

	assert.deepEqual( g.map( ( x ) => x.part ), [ 'hero', 'foliage', 'characters', 'hero', 'props', 'vfx', 'vfx', 'props' ] );
	assert.equal( g[ 0 ].reason, 'tag' );
	assert.equal( g[ 1 ].reason, 'name "tree"' );
	assert.equal( g[ 6 ].reason, 'emissive material' );

} );

test( 'the largest low flat mesh becomes terrain, or water when blue', () => {

	const items = [
		{ name: 'Plane', box: box( [ - 20, 0, - 20 ], [ 20, 0.1, 20 ] ), color: [ 0.4, 0.6, 0.3 ] },
		{ name: 'Plane.001', box: box( [ - 2, 0, - 2 ], [ 2, 0.05, 2 ] ) },
		{ name: 'Cube', box: box( [ - 1, 0, - 1 ], [ 1, 2, 1 ] ) },
		{ name: 'Shelf', box: box( [ - 3, 5, - 3 ], [ 3, 5.1, 3 ] ) },
	];
	assert.deepEqual( guessParts( items ).map( ( x ) => x.part ), [ 'terrain', 'props', 'props', 'props' ] );

	items[ 0 ].color = [ 0.1, 0.3, 0.8 ];
	assert.equal( guessParts( items )[ 0 ].part, 'water' );

	// A named ground wins; the shape rule then doesn't fire.
	const named = guessParts( [ { name: 'Ground', box: box( [ - 1, 0, - 1 ], [ 1, 0.1, 1 ] ) }, items[ 0 ] ] );
	assert.deepEqual( named.map( ( x ) => x.part ), [ 'terrain', 'props' ] );

} );
