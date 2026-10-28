import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseParams } from '../src/app/boot/params.js';

test( 'backend defaults to auto and accepts webgl / webgl2 / webgpu', () => {

	assert.equal( parseParams( '' ).backend, 'auto' );
	assert.equal( parseParams( '?backend=webgl' ).backend, 'webgl' );
	assert.equal( parseParams( '?backend=WebGL2' ).backend, 'webgl' );
	assert.equal( parseParams( '?backend=webgpu' ).backend, 'webgpu' );
	assert.equal( parseParams( '?backend=vulkan' ).backend, 'auto' );

} );

test( 'spikes: all, a list, or nothing', () => {

	assert.equal( parseParams( '' ).spikes, null );
	assert.equal( parseParams( '?spikes=all' ).spikes, 'all' );
	assert.deepEqual( parseParams( '?spikes=1,3,x,5' ).spikes, [ 1, 3, 5 ] );

} );

test( 'dpr cap defaults to 2 and ignores junk', () => {

	assert.equal( parseParams( '' ).dprCap, 2 );
	assert.equal( parseParams( '?dpr=1.5' ).dprCap, 1.5 );
	assert.equal( parseParams( '?dpr=-1' ).dprCap, 2 );
	assert.equal( parseParams( '?dpr=abc' ).dprCap, 2 );

} );
