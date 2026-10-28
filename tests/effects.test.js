import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bakeLut, LUT_PRESETS, PALETTES, bayerMatrix } from '../src/runtime/color/lut.js';
import { timeOfDay } from '../src/runtime/look/timeofday.js';
import { resolveLook } from '../src/runtime/look/resolve.js';
import { pixelGrid } from '../src/runtime/render/passes.js';
import { passRequirements, activeEffects, graphKey, EFFECTS } from '../src/runtime/post/graph.js';
import { byId, defaults, REGISTRY } from '../src/runtime/registry/index.js';
import { checkValue } from '../src/runtime/look/validate.js';
import { isHex } from '../src/runtime/color/color.js';
import { EFFECT_DEMOS } from '../src/content/effects.js';
import { lookById } from '../src/content/looks/index.js';

test( 'LUT presets bake to 33³ RGBA tables, deterministically', () => {

	for ( const id of Object.keys( LUT_PRESETS ) ) {

		const a = bakeLut( id ), b = bakeLut( id );
		assert.equal( a.length, 33 ** 3 * 4, id );
		assert.deepEqual( a, b, `${id} is deterministic` );
		assert.ok( a.every( ( v, i ) => i % 4 !== 3 || v === 255 ), `${id}: opaque` );

	}

	// An identity preset reproduces the grid exactly (layout: red fastest, then green, then blue).
	const id = bakeLut( ( c ) => c, 3 );
	assert.deepEqual( [ ...id.slice( 4, 8 ) ], [ 128, 0, 0, 255 ] );
	assert.deepEqual( [ ...id.slice( 12, 16 ) ], [ 0, 128, 0, 255 ] );
	assert.deepEqual( [ ...id.slice( 9 * 4, 9 * 4 + 4 ) ], [ 0, 0, 128, 255 ] );
	assert.throws( () => bakeLut( 'nope' ), /Unknown LUT/ );

} );

test( 'Bayer matrices are permutations of their ranks', () => {

	for ( const n of [ 2, 4, 8, 16 ] ) {

		const flat = bayerMatrix( n ).flat();
		assert.equal( flat.length, n * n );
		assert.deepEqual( [ ...flat ].sort( ( x, y ) => x - y ), Array.from( { length: n * n }, ( _, i ) => i ) );

	}

	assert.deepEqual( bayerMatrix( 2 ), [ [ 0, 2 ], [ 3, 1 ] ] );

} );

test( 'fixed palettes are valid hex lists', () => {

	for ( const [ id, colors ] of Object.entries( PALETTES ) ) assert.ok( colors.length >= 2 && colors.length <= 16 && colors.every( isHex ), id );
	// Every palette option of the quantizer exists (or is the look's own palette).
	for ( const o of byId.get( 'retro.quantize.palette' ).options ) assert.ok( o.value === 'look' || PALETTES[ o.value ], o.value );

} );

test( 'time of day: valid values, a low warm sun at dusk, high at noon, and overrides win', () => {

	for ( let h = 4; h <= 22; h += 0.5 ) {

		for ( const [ id, v ] of Object.entries( timeOfDay( h, 45 ) ) ) assert.equal( checkValue( byId.get( id ), v ), null, `${h} h: ${id} = ${v}` );

	}

	assert.ok( timeOfDay( 12 ).lighting === undefined );
	assert.ok( timeOfDay( 12 )[ 'lighting.key.elevation' ] > 55 );
	assert.ok( timeOfDay( 18 )[ 'lighting.key.elevation' ] < 10 );
	assert.ok( timeOfDay( 21 )[ 'lighting.key.intensity' ] < 1, 'night is dim' );

	const look = lookById.get( 'sea-breeze' );
	const r = resolveLook( { look, overrides: { 'lighting.tod.enabled': true, 'lighting.tod.hour': 18, 'lighting.key.color': '#00ff00' } } );
	assert.equal( r.sources[ 'lighting.key.elevation' ], 'time of day' );
	assert.equal( r.global[ 'lighting.key.color' ], '#00ff00', 'an explicit override beats the clock' );
	assert.equal( r.global[ 'atmosphere.fog.color' ], r.global[ 'atmosphere.sky.horizon' ], 'fog matches the horizon' );

} );

test( 'pixel grid: whole-pixel blocks that cover the screen', () => {

	assert.deepEqual( pixelGrid( 1920, 1080, 240 ), { p: 5, width: 384, height: 216 } );
	assert.deepEqual( pixelGrid( 640, 361, 120 ), { p: 3, width: 214, height: 121 } );
	assert.deepEqual( pixelGrid( 320, 180, 540 ), { p: 1, width: 320, height: 180 } );
	for ( const [ W, H, rows ] of [ [ 1280, 720, 144 ], [ 2560, 1440, 270 ], [ 999, 777, 100 ] ] ) {

		const g = pixelGrid( W, H, rows );
		assert.ok( Number.isInteger( g.p ) && g.width * g.p >= W && ( g.width - 1 ) * g.p < W && g.height * g.p >= H && ( g.height - 1 ) * g.p < H );

	}

} );

test( 'effects declare the buffers they read; sliders never change the graph key', () => {

	const v = defaults();
	assert.equal( passRequirements( v ).size, 0, 'the default look needs no extra buffers' );
	assert.deepEqual( activeEffects( v ), [] );

	const on = { ...v, 'lines.screen.enabled': true, 'lens.motionBlur.enabled': true, 'lens.bloom.enabled': true, 'lens.bloom.source': 'emissive', 'retro.pixel.enabled': true };
	assert.deepEqual( [ ...passRequirements( on ) ].sort(), [ 'depth', 'emissive', 'ids', 'normal', 'velocity' ] );
	assert.deepEqual( activeEffects( on ), [ 'lens.bloom', 'lens.motionBlur', 'lines.screen', 'retro.pixel' ], 'pipeline order' );

	const key = graphKey( on, '0|depth' );
	const slid = { ...on, 'lens.motionBlur.shutter': 90, 'grade.contrast': 1.4, 'retro.pixel.height': 120, 'lens.bloom.strength': 2 };
	assert.equal( graphKey( slid, '0|depth' ), key, 'continuous values are uniforms' );
	assert.notEqual( graphKey( { ...on, 'lens.bloom.source': 'all' }, '0|depth' ), key, 'structural values rebuild' );
	assert.notEqual( graphKey( { ...on, 'grade.toneMapping': 'agx' }, '0|depth' ), key );

	// Every registry switch that adds a post effect has an effect module.
	const switches = REGISTRY.filter( ( e ) => e.type === 'bool' && e.structural && [ 'lens', 'grade', 'retro', 'atmosphere' ].includes( e.module ) && e.id !== 'retro.vertexSnap.enabled' );
	for ( const e of switches ) assert.ok( EFFECTS.some( ( fx ) => fx.enabled( { ...v, [ e.id ]: true }, { samples: 0 } ) && ! fx.always ), e.id );

} );

test( 'effect demos reference real parameters with valid values', () => {

	const ids = new Set();
	for ( const d of EFFECT_DEMOS ) {

		assert.ok( ! ids.has( d.id ), `unique ${d.id}` );
		ids.add( d.id );
		assert.ok( lookById.has( d.look ), `${d.id}: look ${d.look}` );
		for ( const [ id, value ] of Object.entries( d.params ) ) assert.equal( checkValue( byId.get( id ) || { type: 'missing' }, value ), null, `${d.id}: ${id}` );

	}

} );
