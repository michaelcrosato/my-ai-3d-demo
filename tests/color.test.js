import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToRgb, rgbToHex, hexToOklab, oklabToHex, adjustHex, remapToPalette, whiteBalanceGains, mixHex } from '../src/runtime/color/color.js';

test( 'hex and OKLab round-trip', () => {

	for ( const hex of [ '#000000', '#ffffff', '#5866d0', '#ff2e88', '#7fa36b', '#123456' ] ) {

		assert.equal( oklabToHex( hexToOklab( hex ) ), hex );

	}

	assert.deepEqual( hexToRgb( '#fff' ), [ 1, 1, 1 ] );
	assert.equal( rgbToHex( [ 1, 0.5, 0 ] ), '#ff8000' );
	assert.ok( Math.abs( hexToOklab( '#ffffff' )[ 0 ] - 1 ) < 1e-6, 'white has L = 1' );

} );

test( 'palette transform and remap', () => {

	assert.equal( adjustHex( '#5866d0' ), '#5866d0', 'identity' );
	const [ , gray ] = [ 0, adjustHex( '#d04040', { saturation: 0 } ) ];
	const [ r, g, b ] = hexToRgb( gray );
	assert.ok( Math.abs( r - g ) < 0.01 && Math.abs( g - b ) < 0.01, 'saturation 0 is gray' );

	const palette = [ '#ff2e88', '#00c8ff', '#ffe600' ];
	assert.equal( remapToPalette( '#ffd000', palette, { keepValue: false } ), '#ffe600' );
	assert.equal( remapToPalette( '#0090ff', palette, { keepValue: false } ), '#00c8ff' );
	assert.equal( remapToPalette( '#abcdef', [] ), '#abcdef' );

} );

test( 'white balance gains keep luminance and warm or cool', () => {

	const neutral = whiteBalanceGains( 0, 0 );
	for ( const g of neutral ) assert.ok( Math.abs( g - 1 ) < 1e-6 );
	const warm = whiteBalanceGains( 0.5, 0 );
	assert.ok( warm[ 0 ] > 1 && warm[ 2 ] < 1, 'warm boosts red, cuts blue' );
	const cool = whiteBalanceGains( - 0.5, 0 );
	assert.ok( cool[ 0 ] < 1 && cool[ 2 ] > 1 );
	assert.equal( mixHex( '#102030', '#102030', 0.3 ), '#102030' );

} );
