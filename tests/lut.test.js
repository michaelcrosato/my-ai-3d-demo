// .cube import (design §6.4 F, P2): parsing, domains, resampling, the custom slot, and the
// look-file encoding, round-tripped against the .cube export.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bakeLut, parseCube, sampleLut, setCustomLut, customLut, encodeLut, decodeLut } from '../src/runtime/color/lut.js';
import { toCube } from '../src/runtime/export/files.js';
import { validateLook } from '../src/runtime/look/validate.js';
import { lookById } from '../src/content/looks/index.js';

test( 'a .cube export parses back to the same table', () => {

	const table = bakeLut( 'teal-orange', 17 );
	const lut = parseCube( toCube( table, 17, { title: 'Round trip', bytes: true } ) );
	assert.equal( lut.title, 'Round trip' );
	assert.equal( lut.size, 17 );
	for ( let i = 0; i < 17 ** 3; i ++ ) for ( let k = 0; k < 3; k ++ ) assert.ok( Math.abs( lut.data[ i * 3 + k ] - table[ i * 4 + k ] / 255 ) < 1e-5 );

} );

test( 'comments, domains and bad files', () => {

	const rows = [];
	for ( let b = 0; b < 2; b ++ ) for ( let g = 0; g < 2; g ++ ) for ( let r = 0; r < 2; r ++ ) rows.push( `${r * 2} ${g * 2} ${b * 2}` );
	const lut = parseCube( `# made by hand\nLUT_3D_SIZE 2\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 2 2 2\n\n${rows.join( '\n' )}\n` );
	assert.equal( lut.title, 'Imported LUT' );
	assert.deepEqual( [ ...lut.data.slice( 0, 6 ) ], [ 0, 0, 0, 1, 0, 0 ], 'values are scaled from the domain to 0–1' );
	assert.deepEqual( sampleLut( lut, [ 0.5, 0.25, 1 ] ).map( ( x ) => +x.toFixed( 3 ) ), [ 0.5, 0.25, 1 ], 'an identity cube samples back the input' );
	assert.throws( () => parseCube( 'LUT_1D_SIZE 4\n0 0 0' ), /1D LUT/ );
	assert.throws( () => parseCube( 'LUT_3D_SIZE 2\n0 0 0\n' ), /needs 8/ );
	assert.throws( () => parseCube( 'hello' ), /Not a 3D/ );

} );

test( 'the custom slot: resampled to 33³, baked like a preset, carried in look files', () => {

	const lut = parseCube( toCube( bakeLut( 'cool-night', 9 ), 9, { bytes: true } ) );
	const slot = setCustomLut( lut );
	assert.equal( slot.size, 33 );
	assert.equal( customLut(), slot );
	const baked = bakeLut( 'custom' );
	assert.equal( baked.length, 33 ** 3 * 4 );
	// Resampling a 9³ table to 33³ keeps the lattice points it shares (every 4th texel).
	const reference = bakeLut( 'cool-night', 33 );
	let worst = 0;
	for ( let i = 0; i < baked.length; i ++ ) if ( i % 4 !== 3 ) worst = Math.max( worst, Math.abs( baked[ i ] - reference[ i ] ) );
	assert.ok( worst <= 12, `resampled within 12/255 of the preset (${worst})` );

	const encoded = encodeLut( slot );
	assert.deepEqual( decodeLut( encoded ).rgba, slot.rgba );
	const look = { ...lookById.get( 'golden-hour' ), id: 'with-lut', params: { 'grade.lut.enabled': true, 'grade.lut.preset': 'custom' }, lut: encoded };
	assert.equal( validateLook( look ).ok, true );
	assert.equal( validateLook( { ...look, lut: { size: 'big' } } ).ok, false );

	setCustomLut( null );
	assert.equal( customLut(), null );
	assert.deepEqual( bakeLut( 'custom', 3 ), bakeLut( ( c ) => c, 3 ), 'no LUT loaded: the custom preset is the identity' );

} );
