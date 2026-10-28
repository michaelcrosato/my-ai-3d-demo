// Walk mode (design §7.15): the scene's hero becomes the player. A Rapier character
// controller (capsule, autostep, slope limit, snap to ground) moves it each fixed step;
// a third-person spring arm follows with collision, so walls never come between the
// camera and the player.

import * as THREE from 'three/webgpu';

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _target = new THREE.Vector3();
const _arm = new THREE.Vector3();

/** The top-level object holding the scene's hero part (the player in walk mode). */
export function findHero( root ) {

	for ( const child of root.children ) {

		let hero = false;
		child.traverse( ( o ) => { if ( o.isMesh && o.userData.style?.part === 'hero' ) hero = true; } );
		if ( hero ) return child;

	}

	return null;

}

export class WalkController {

	/**
	 * @param {PhysicsWorld} physics
	 * @param {object} o - { player: Object3D (feet at its origin), camera, height, radius }
	 */
	constructor( physics, { player, camera, height = 1.7, radius = 0.35 } ) {

		const R = physics.R;
		this.physics = physics;
		this.player = player;
		this.camera = camera;
		this.height = height;
		this.home = { position: player.position.clone(), quaternion: player.quaternion.clone() };

		const p = player.getWorldPosition( new THREE.Vector3() );
		this.body = physics.world.createRigidBody( R.RigidBodyDesc.kinematicPositionBased().setTranslation( p.x, p.y + height / 2 + 0.05, p.z ) );
		this.collider = physics.world.createCollider( R.ColliderDesc.capsule( height / 2 - radius, radius ), this.body );
		const c = this.controller = physics.world.createCharacterController( 0.02 );
		c.setUp( { x: 0, y: 1, z: 0 } );
		c.enableAutostep( 0.4, 0.15, false );
		c.enableSnapToGround( 0.3 );
		c.setMaxSlopeClimbAngle( 50 * Math.PI / 180 );
		c.setApplyImpulsesToDynamicBodies( true );

		// Camera: start behind the player, looking the way it faces.
		const facing = new THREE.Vector3( 0, 0, 1 ).applyQuaternion( player.getWorldQuaternion( new THREE.Quaternion() ) );
		this.yaw = Math.atan2( - facing.x, - facing.z ); // the camera sits opposite the facing direction
		this.pitch = 0.32;
		this.distance = 6.5;
		this.vy = 0;
		this.grounded = false;
		this.heading = Math.atan2( facing.x, facing.z );
		this.input = { move: [ 0, 0 ], look: [ 0, 0 ], jump: false, run: false };
		this.speed = 0;

	}

	/** One fixed step: move by the input relative to the camera, with gravity and jumps. */
	step( dt ) {

		const { move, jump, run } = this.input;
		_fwd.set( - Math.sin( this.yaw ), 0, - Math.cos( this.yaw ) );
		_right.set( - _fwd.z, 0, _fwd.x );
		_move.set( 0, 0, 0 ).addScaledVector( _fwd, move[ 1 ] ).addScaledVector( _right, move[ 0 ] );
		const amount = Math.min( 1, _move.length() );
		if ( amount > 0 ) _move.normalize();
		this.speed = amount * ( run ? 7 : 4 );
		if ( amount > 0.05 ) {

			const want = Math.atan2( _move.x, _move.z );
			let d = want - this.heading;
			d = Math.atan2( Math.sin( d ), Math.cos( d ) );
			this.heading += d * Math.min( 1, dt * 12 );

		}

		if ( this.grounded && jump ) { this.vy = 5.2; this.grounded = false; }
		this.vy = Math.max( - 30, this.vy - 9.81 * dt );

		this.controller.computeColliderMovement( this.collider, { x: _move.x * this.speed * dt, y: this.vy * dt, z: _move.z * this.speed * dt } );
		const m = this.controller.computedMovement();
		const t = this.body.translation();
		this.body.setNextKinematicTranslation( { x: t.x + m.x, y: t.y + m.y, z: t.z + m.z } );
		this.grounded = this.controller.computedGrounded();
		if ( this.grounded && this.vy < 0 ) this.vy = 0;
		// Fell out of the world: back to the start.
		if ( t.y < - 20 ) { const h = this.home.position; this.body.setNextKinematicTranslation( { x: h.x, y: h.y + this.height / 2 + 0.5, z: h.z } ); this.vy = 0; }

	}

	/** After the physics step: place the player and the camera. */
	sync( dt ) {

		const t = this.body.translation();
		this.player.position.set( t.x, t.y - this.height / 2 - 0.02, t.z );
		this.player.quaternion.setFromAxisAngle( THREE.Object3D.DEFAULT_UP, this.heading );

		const [ lx, ly ] = this.input.look;
		this.yaw -= lx;
		this.pitch = Math.min( 1.2, Math.max( - 0.15, this.pitch + ly ) );
		this.input.look = [ 0, 0 ];

		_target.set( t.x, t.y + this.height * 0.35, t.z );
		_arm.set( Math.sin( this.yaw ) * Math.cos( this.pitch ), Math.sin( this.pitch ), Math.cos( this.yaw ) * Math.cos( this.pitch ) );
		const R = this.physics.R;
		const hit = this.physics.world.castRay( new R.Ray( _target, _arm ), this.distance, true, undefined, undefined, this.collider );
		const d = hit ? Math.max( 0.6, hit.timeOfImpact - 0.25 ) : this.distance;
		this.camDistance = this.camDistance === undefined ? d : this.camDistance + ( d - this.camDistance ) * Math.min( 1, dt * ( d < this.camDistance ? 30 : 6 ) );
		this.camera.position.copy( _target ).addScaledVector( _arm, this.camDistance );
		this.camera.lookAt( _target );

	}

	/** Moves the player's feet to `p` at once (tests, falling out of the world). */
	teleport( p ) {

		this.body.setTranslation( { x: p[ 0 ], y: p[ 1 ] + this.height / 2 + 0.02, z: p[ 2 ] }, true );
		this.vy = 0;

	}

	/** Feet position (zones test this). */
	position() {

		return this.player.position.toArray();

	}

	dispose() {

		this.physics.world.removeCharacterController( this.controller );
		this.physics.world.removeRigidBody( this.body );
		this.player.position.copy( this.home.position );
		this.player.quaternion.copy( this.home.quaternion );

	}

}
