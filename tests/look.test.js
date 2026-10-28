import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS, lookById } from '../src/content/looks/index.js';
import { validateLook, migrateLook } from '../src/runtime/look/validate.js';
import { resolveLook, applyStrength, mixValue, lookValue } from '../src/runtime/look/resolve.js';
import { REGISTRY, byId, defaults, PARTS } from '../src/runtime/registry/index.js';

const sceneParams = { 'lighting.key.intensity': 3, 'atmosphere.sky.zenith': '#4d8fe0', 'lighting.key.azimuth': 30 };

test( 'every library look validates', () => {

	for ( const look of LOOKS ) {

		const { ok, errors } = validateLook( look );
		assert.ok( ok, `${look.id}: ${errors.join( '; ' )}` );
		assert.ok( look.pillars.length >= 1, `${look.id}: pillars` );

	}

} );

test( 'validation catches bad looks', () => {

	const bad = { schema: 'stylelab.look@1', id: 'Bad Id', name: 'x', params: { 'surface.bands': 9, 'nope.x': 1, 'grade.toneMapping': 'filmic' }, parts: { moon: {}, terrain: { params: { 'grade.contrast': 1.2 } } } };
	const { ok, errors } = validateLook( bad );
	assert.equal( ok, false );
	for ( const fragment of [ 'kebab-case', 'surface.bands out of range', 'unknown parameter nope.x', 'grade.toneMapping expected one of', 'unknown part moon', "grade.contrast can't be set per part" ] ) {

		assert.ok( errors.some( ( e ) => e.includes( fragment ) ), `missing error: ${fragment}` );

	}

	assert.throws( () => migrateLook( { schema: 'stylelab.look@0' } ), /Can't read look schema/ );

} );

test( 'resolution order: registry → scene → look → overrides → part overrides', () => {

	const sea = lookById.get( 'sea-breeze' );
	const r = resolveLook( { look: sea, sceneParams, overrides: { 'grade.contrast': 1.3, 'lines.hull.thickness': 2 }, partOverrides: { hero: { 'lines.hull.thickness': 3 } } } );

	assert.equal( r.global[ 'surface.rim.width' ], byId.get( 'surface.rim.width' ).default, 'registry default' );
	assert.equal( r.global[ 'lighting.key.azimuth' ], 30, 'scene value the look leaves alone' );
	assert.equal( r.sources[ 'lighting.key.azimuth' ], 'scene' );
	assert.equal( r.global[ 'lighting.key.intensity' ], 3.2, 'look beats scene' );
	assert.equal( r.global[ 'grade.contrast' ], 1.3, 'override beats look' );
	assert.equal( r.sources[ 'grade.contrast' ], 'override' );

	assert.equal( r.parts.terrain[ 'lines.hull.enabled' ], false, 'global part value' );
	assert.equal( r.parts.characters[ 'lines.hull.enabled' ], true, 'look part value' );
	assert.equal( r.parts.hero[ 'lines.hull.enabled' ], true, 'hero inherits characters' );
	assert.equal( r.parts.characters[ 'lines.hull.thickness' ], 2, 'a global override beats the look\'s part value' );
	assert.equal( r.parts.hero[ 'lines.hull.thickness' ], 3, 'part override beats everything' );
	assert.equal( r.parts.water[ 'surface.model' ], 'toonWater' );
	assert.ok( ! ( 'grade.contrast' in r.parts.terrain ), 'part maps hold only part-scoped params' );

} );

test( 'the baseline look ignores the scene and resolves to registry defaults', () => {

	const r = resolveLook( { look: lookById.get( 'plain' ), sceneParams } );
	assert.deepEqual( r.global, defaults() );
	assert.equal( lookValue( lookById.get( 'plain' ), sceneParams, 'lighting.key.intensity' ), 2 );
	assert.equal( lookValue( lookById.get( 'sea-breeze' ), sceneParams, 'lighting.key.azimuth' ), 30 );

} );

test( 'strength 0 moves continuous params to neutral and keeps switches', () => {

	for ( const look of LOOKS ) {

		const full = resolveLook( { look, sceneParams } );
		const zero = resolveLook( { look, sceneParams, strength: 0 } );

		for ( const e of REGISTRY ) {

			const expected = e.structural || e.mix === 'step' || e.mix === 'palette' ? full.global[ e.id ] : e.neutral;
			assert.deepEqual( zero.global[ e.id ], expected, `${look.id} ${e.id}` );

		}

		for ( const part of PARTS ) assert.equal( zero.parts[ part ][ 'lines.hull.thickness' ], 0 );

	}

	const half = applyStrength( { 'grade.contrast': 1.2, 'surface.model': 'toon' }, 0.5 );
	assert.ok( Math.abs( half[ 'grade.contrast' ] - 1.1 ) < 1e-9 );
	assert.equal( half[ 'surface.model' ], 'toon' );

} );

test( 'mix rules: lerp, int rounding, shortest-arc angles, OKLab colors, step', () => {

	assert.equal( mixValue( byId.get( 'grade.contrast' ), 1, 2, 0.25 ), 1.25 );
	assert.equal( mixValue( byId.get( 'atmosphere.fog.bands' ), 0, 3, 0.5 ), 2 );
	assert.equal( mixValue( byId.get( 'lighting.key.azimuth' ), 170, - 170, 0.5 ), 180 );
	assert.equal( mixValue( byId.get( 'surface.shadowTint' ), '#000000', '#ffffff', 0 ), '#000000' );
	const mid = mixValue( byId.get( 'surface.shadowTint' ), '#ff0000', '#0000ff', 0.5 );
	assert.match( mid, /^#[0-9a-f]{6}$/ );
	assert.notEqual( mid, '#800080', 'OKLab midpoint differs from the sRGB midpoint' );
	assert.equal( mixValue( byId.get( 'surface.model' ), 'pbr', 'toon', 0.49 ), 'pbr' );
	assert.equal( mixValue( byId.get( 'surface.model' ), 'pbr', 'toon', 0.5 ), 'toon' );

} );
