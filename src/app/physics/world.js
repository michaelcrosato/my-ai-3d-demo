// Physics (design §7.15): Rapier, loaded on demand for walk mode and the toybox.
//
// Static colliders come from the scene built at T0 (the same layout at every tier, so
// physics doesn't change with complexity). Dynamic props carry userData.physics and are
// driven by their bodies. The world steps at a fixed 1/60 s, so a run is deterministic
// for a seed and an input sequence (audits replay it).

import * as THREE from 'three/webgpu';
import { buildScene } from '../../scenes/index.js';

let rapier = null;

/** Loads and initializes Rapier once (the compat build embeds its WASM). */
export async function loadRapier() {

	if ( ! rapier ) {

		const mod = await import( '@dimforge/rapier3d-compat' );
		const R = mod.default || mod;
		// The compat build passes its embedded WASM the old way and warns about itself.
		const warn = console.warn;
		console.warn = ( ...args ) => { if ( ! String( args[ 0 ] ).includes( 'deprecated parameters for the initialization function' ) ) warn( ...args ); };
		try { await R.init(); } finally { console.warn = warn; }
		rapier = R;

	}

	return rapier;

}

export const STEP = 1 / 60;

// Parts that block movement. Water is solid too (the player walks on it rather than sinking).
const SOLID = new Set( [ 'terrain', 'architecture', 'props', 'foliage', 'water' ] );
const _box = new THREE.Box3();
const _size = new THREE.Vector3();

/**
 * Triangle soups for the static colliders of a built scene root: solid parts, skipping
 * dynamic props and pieces smaller than `minSize` (grass tufts, flowers, pebbles).
 * @returns {{vertices: Float32Array, indices: Uint32Array, part: string}[]}
 */
export function staticMeshes( root, { minSize = 0.35 } = {} ) {

	root.updateMatrixWorld( true );
	const out = [];
	root.traverse( ( o ) => {

		if ( ! o.isMesh || ! o.userData.style || ! SOLID.has( o.userData.style.part ) ) return;
		for ( let p = o; p; p = p.parent ) if ( p.userData.physics ) return;
		_box.setFromObject( o ).getSize( _size );
		if ( Math.max( _size.x, _size.y, _size.z ) < minSize ) return;
		const g = o.geometry;
		const pos = g.attributes.position;
		const vertices = new Float32Array( pos.count * 3 );
		const v = new THREE.Vector3();
		for ( let i = 0; i < pos.count; i ++ ) {

			v.fromBufferAttribute( pos, i ).applyMatrix4( o.matrixWorld );
			vertices[ i * 3 ] = v.x; vertices[ i * 3 + 1 ] = v.y; vertices[ i * 3 + 2 ] = v.z;

		}

		const indices = g.index ? Uint32Array.from( g.index.array ) : Uint32Array.from( { length: pos.count }, ( _, i ) => i );
		out.push( { vertices, indices, part: o.userData.style.part } );

	} );
	return out;

}

/**
 * A physics world for a scene.
 * @param {object} R - Rapier
 * @param {object} o - { root: the visible scene root (dynamic props), collisionRoot: the same scene at T0 }
 */
export class PhysicsWorld {

	constructor( R, { root, collisionRoot } ) {

		this.R = R;
		this.world = new R.World( { x: 0, y: - 9.81, z: 0 } );
		this.world.timestep = STEP;
		this.accumulator = 0;
		this.steps = 0;
		this.statics = 0;

		for ( const m of staticMeshes( collisionRoot ) ) {

			this.world.createCollider( R.ColliderDesc.trimesh( m.vertices, m.indices ).setFriction( 0.8 ) );
			this.statics ++;

		}

		// Dynamic props: userData.physics = { shape: 'box' | 'ball', size: [w, h, d] | radius, mass, spare }
		// Spare bodies (throwable balls) sleep out of sight until thrown.
		this.dynamic = [];
		root.updateMatrixWorld( true );
		root.traverse( ( o ) => {

			const ph = o.userData.physics;
			if ( ! ph ) return;
			const p = o.getWorldPosition( new THREE.Vector3() );
			const q = o.getWorldQuaternion( new THREE.Quaternion() );
			const body = this.world.createRigidBody( R.RigidBodyDesc.dynamic().setTranslation( p.x, p.y, p.z ).setRotation( q ).setCcdEnabled( ph.shape === 'ball' ) );
			const desc = ph.shape === 'ball' ? R.ColliderDesc.ball( ph.radius ) : R.ColliderDesc.cuboid( ph.size[ 0 ] / 2, ph.size[ 1 ] / 2, ph.size[ 2 ] / 2 );
			this.world.createCollider( desc.setDensity( ph.density ?? 1 ).setRestitution( ph.restitution ?? 0.2 ).setFriction( 0.7 ), body );
			if ( ph.spare ) body.setEnabled( false );
			this.dynamic.push( { object: o, body, spare: !! ph.spare, home: p.clone() } );

		} );

	}

	/** Throws the next spare ball from `origin` along `direction` (unit vector) at `speed` m/s. */
	throwBall( origin, direction, speed = 16 ) {

		const spares = this.dynamic.filter( ( d ) => d.spare );
		if ( ! spares.length ) return null;
		this.nextSpare = ( ( this.nextSpare ?? - 1 ) + 1 ) % spares.length;
		const d = spares[ this.nextSpare ];
		d.body.setEnabled( true );
		d.body.setTranslation( { x: origin.x, y: origin.y, z: origin.z }, true );
		d.body.setLinvel( { x: direction.x * speed, y: direction.y * speed, z: direction.z * speed }, true );
		d.body.setAngvel( { x: 0, y: 0, z: 0 }, true );
		d.object.visible = true;
		return d;

	}

	/** Advances by `dt` seconds in fixed steps; `beforeStep` runs before each one (character controllers). */
	update( dt, beforeStep ) {

		this.accumulator = Math.min( this.accumulator + dt, STEP * 8 );
		while ( this.accumulator >= STEP - 1e-9 ) {

			beforeStep?.( STEP );
			this.world.step();
			this.accumulator -= STEP;
			this.steps ++;

		}

		this.sync();

	}

	/** Copies body transforms to their objects (parents are static groups at the origin). */
	sync() {

		for ( const d of this.dynamic ) {

			if ( ! d.body.isEnabled() ) continue;
			const t = d.body.translation(), r = d.body.rotation();
			d.object.position.set( t.x, t.y, t.z );
			d.object.quaternion.set( r.x, r.y, r.z, r.w );
			// Anything that falls out of the world comes home and sleeps.
			if ( t.y < - 30 ) { d.body.setTranslation( { x: d.home.x, y: d.home.y, z: d.home.z }, false ); d.body.setLinvel( { x: 0, y: 0, z: 0 }, false ); if ( d.spare ) { d.body.setEnabled( false ); d.object.visible = false; } }

		}

	}

	/** A short hash of every dynamic body's position (determinism checks). */
	hash() {

		let h = 0x811c9dc5;
		for ( const d of this.dynamic ) {

			const t = d.body.translation();
			for ( const x of [ t.x, t.y, t.z ] ) h = Math.imul( h ^ Math.round( x * 1000 ), 16777619 );

		}

		return ( h >>> 0 ).toString( 16 );

	}

	dispose() {

		this.world.free();

	}

}

/** The scripted toybox run audits replay: three throws at fixed steps (step: [origin, direction]). */
export const REPLAY_THROWS = { 30: [ - 2, 1.6, 6, 0, 0.06, - 1 ], 90: [ 0.5, 1.6, 6, 0, 0.06, - 1 ], 150: [ 2, 0.9, 8, 0, 0.02, - 1 ] };

/**
 * Runs a scene's physics from scratch with scripted throws and returns the body hash:
 * the same seed and script give the same hash on every machine and backend.
 */
export function replay( R, sceneDef, { seed, tier = 1, steps = 240, throws = REPLAY_THROWS } = {} ) {

	const root = buildScene( sceneDef, { tier, seed } ).root;
	const physics = new PhysicsWorld( R, { root, collisionRoot: buildScene( sceneDef, { tier: 0, seed } ).root } );
	for ( let i = 0; i < steps; i ++ ) {

		const t = throws[ i ];
		if ( t ) physics.throwBall( new THREE.Vector3( t[ 0 ], t[ 1 ], t[ 2 ] ), new THREE.Vector3( t[ 3 ], t[ 4 ], t[ 5 ] ).normalize(), 18 );
		physics.update( STEP );

	}

	const moved = physics.dynamic.filter( ( d ) => ! d.spare && d.home.distanceTo( new THREE.Vector3( ...Object.values( d.body.translation() ) ) ) > 0.2 ).length;
	const result = { hash: physics.hash(), moved, steps: physics.steps };
	physics.dispose();
	return result;

}
