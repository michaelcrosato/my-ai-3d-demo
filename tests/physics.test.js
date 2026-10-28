// M5: Rapier physics is deterministic per seed, walk mode collides, zones blend smoothly.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
import { loadRapier, PhysicsWorld, staticMeshes, replay, STEP } from '../src/app/physics/world.js';
import { WalkController, findHero } from '../src/app/physics/walk.js';
import { zoneDistance, zoneWeight, zoneWeights, blendZones } from '../src/runtime/look/zones.js';
import { resolveRecipe, resolvedHash } from '../src/runtime/look/resolve.js';
import { lookById } from '../src/content/looks/index.js';
import { buildScene, sceneById } from '../src/scenes/index.js';
import toybox from '../src/scenes/toybox.js';

const R = await loadRapier();

const run = ( seed ) => replay( R, toybox, { seed } );

test( 'toybox physics is deterministic per seed', () => {

	const a = run( 5 ), b = run( 5 );
	assert.equal( a.hash, b.hash, 'same seed and inputs, same result' );
	assert.ok( a.moved >= 3, `the throws knock things over (${a.moved} bodies moved)` );

} );

test( 'static colliders come from the T0 build and skip small pieces and dynamic props', () => {

	const root = buildScene( toybox, { tier: 0 } ).root;
	const meshes = staticMeshes( root );
	assert.ok( meshes.length >= 6, 'floor, walls, ramps, posts' );
	assert.ok( meshes.every( ( m ) => m.part !== 'hero' && m.part !== 'characters' ) );
	assert.ok( meshes.every( ( m ) => m.vertices.length % 3 === 0 && m.indices.length % 3 === 0 ) );
	for ( const id of [ 'dungeon', 'harbor', 'campsite' ] ) {

		const n = staticMeshes( buildScene( sceneById.get( id ), { tier: 0 } ).root ).length;
		assert.ok( n > 5, `${id}: ${n} static colliders` );

	}

} );

test( 'walk mode: the hero walks on the ground and walls stop it', () => {

	const scene = sceneById.get( 'dungeon' );
	const root = buildScene( scene, { tier: 1 } ).root;
	const physics = new PhysicsWorld( R, { root, collisionRoot: buildScene( scene, { tier: 0 } ).root } );
	const hero = findHero( root );
	assert.ok( hero, 'the dungeon has a hero' );
	const walk = new WalkController( physics, { player: hero, camera: new THREE.PerspectiveCamera() } );
	const start = hero.position.clone();

	// Settle, then walk toward the back wall (z = -11) for five seconds.
	walk.yaw = 0; // camera behind (+z), so forward is -z
	walk.input.move = [ 0, 1 ];
	for ( let i = 0; i < 300; i ++ ) physics.update( STEP, ( dt ) => walk.step( dt ) );
	walk.sync( STEP );
	assert.ok( walk.grounded, 'on the ground' );
	assert.ok( Math.abs( hero.position.y - start.y ) < 1.3, `stays near floor height (${hero.position.y.toFixed( 2 )})` );
	assert.ok( hero.position.z < start.z - 4, `moved forward (${start.z.toFixed( 2 )} → ${hero.position.z.toFixed( 2 )})` );
	assert.ok( hero.position.z > - 11, 'the back wall stops it' );

	// Jump: up, then back down.
	walk.input.move = [ 0, 0 ];
	walk.input.jump = true;
	physics.update( STEP, ( dt ) => walk.step( dt ) );
	walk.input.jump = false;
	let peak = - Infinity;
	for ( let i = 0; i < 90; i ++ ) { physics.update( STEP, ( dt ) => walk.step( dt ) ); walk.sync( STEP ); peak = Math.max( peak, hero.position.y ); }
	assert.ok( peak > start.y + 0.5, `jumps (${peak.toFixed( 2 )})` );
	assert.ok( walk.grounded, 'lands' );
	walk.dispose();
	physics.dispose();

} );

test( 'zones: weights fall off smoothly and blending lands exactly on the zone look', () => {

	const box = { id: 'b', shape: 'box', center: [ 0, 0, 0 ], size: [ 4, 4, 4 ], blend: 2 };
	const ball = { id: 's', shape: 'sphere', center: [ 10, 0, 0 ], radius: 2, blend: 3, priority: 1 };
	assert.equal( zoneDistance( box, [ 0, 0, 0 ] ), - 2 );
	assert.equal( zoneDistance( box, [ 3, 0, 0 ] ), 1 );
	assert.equal( zoneWeight( box, [ 1, 0, 0 ] ), 1 );
	assert.equal( zoneWeight( box, [ 4.5, 0, 0 ] ), 0 );
	assert.equal( zoneWeight( ball, [ 10, 3.5, 0 ] ), 0.5 );

	// Continuous: small steps never jump the weight.
	let prev = zoneWeight( box, [ - 6, 0, 0 ] );
	for ( let x = - 6; x <= 6; x += 0.1 ) { const w = zoneWeight( box, [ x, 0, 0 ] ); assert.ok( Math.abs( w - prev ) < 0.08, `step at ${x.toFixed( 1 )}` ); prev = w; }

	// Lowest priority first, so the higher one wins where they overlap.
	assert.deepEqual( zoneWeights( [ ball, box ], [ 0, 0, 0 ] ).map( ( z ) => z.zone.id ), [ 'b', 's' ] );

	const getLook = ( id ) => lookById.get( id );
	const base = resolveRecipe( { recipe: { base: 'sea-breeze' }, getLook } );
	const noir = resolveRecipe( { recipe: { base: 'noir' }, getLook } );
	const zone = ( z ) => ( z.id === 'b' ? noir : base );
	assert.equal( blendZones( base, zoneWeights( [ box ], [ 20, 0, 0 ] ), zone ), base, 'outside: exactly the base' );
	assert.equal( resolvedHash( blendZones( base, zoneWeights( [ box ], [ 0, 0, 0 ] ), zone ) ), resolvedHash( noir ), 'inside: exactly the zone look' );

} );

test( 'scene zones are well formed: shapes, valid params, real looks', async () => {

	const { checkValue } = await import( '../src/runtime/look/validate.js' );
	const { byId } = await import( '../src/runtime/registry/index.js' );
	for ( const id of [ 'dungeon', 'campsite', 'harbor' ] ) {

		const zones = sceneById.get( id ).zones;
		assert.ok( zones.length >= 2, `${id} has zones` );
		for ( const z of zones ) {

			assert.ok( [ 'box', 'sphere' ].includes( z.shape ) && z.center.length === 3 && z.blend > 0, `${id}/${z.id} shape` );
			assert.ok( z.shape === 'box' ? z.size.length === 3 : z.radius > 0 );
			assert.ok( z.look ? lookById.has( z.look ) : Object.keys( z.params ).length > 0, `${id}/${z.id} has a look or params` );
			for ( const [ k, v ] of Object.entries( z.params || {} ) ) assert.equal( checkValue( byId.get( k ), v ), null, `${id}/${z.id} ${k}` );

		}

	}

	// The campsite hero starts by the fire.
	const camp = sceneById.get( 'campsite' );
	const hero = findHero( buildScene( camp, { tier: 0 } ).root );
	assert.ok( zoneWeight( camp.zones[ 0 ], hero.position.toArray() ) > 0.9 );

} );
