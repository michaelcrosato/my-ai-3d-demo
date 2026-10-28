// Spike 8: Rapier compat build loads through the import map (CDN in the built
// single file), initializes its embedded WASM, simulates, and creates a
// character controller.

export default {
	id: 8,
	key: 'rapier',
	title: 'Rapier 0.19.3 (compat) loads from the CDN inside the single file',

	async run( { R } ) {

		const t0 = performance.now();
		const RAPIER = ( await import( '@dimforge/rapier3d-compat' ) ).default;
		await RAPIER.init();
		R.info( 'load + init ms', performance.now() - t0 );
		R.check( 'version is 0.19.3', RAPIER.version() === '0.19.3', RAPIER.version(), '0.19.3' );

		const world = new RAPIER.World( { x: 0, y: - 9.81, z: 0 } );
		world.createCollider( RAPIER.ColliderDesc.cuboid( 10, 0.1, 10 ) );
		const ball = world.createRigidBody( RAPIER.RigidBodyDesc.dynamic().setTranslation( 0, 3, 0 ) );
		world.createCollider( RAPIER.ColliderDesc.ball( 0.5 ), ball );
		for ( let i = 0; i < 180; i ++ ) world.step();
		const y = ball.translation().y;
		R.check( 'ball falls and rests on the ground', y > 0.5 && y < 0.7, y, '≈ 0.6' );

		const body = world.createRigidBody( RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation( 0, 1, 2 ) );
		const capsule = world.createCollider( RAPIER.ColliderDesc.capsule( 0.5, 0.3 ), body );
		const controller = world.createCharacterController( 0.02 );
		controller.computeColliderMovement( capsule, { x: 1, y: - 0.2, z: 0 } );
		const move = controller.computedMovement();
		R.check( 'character controller computes a movement', Number.isFinite( move.x ) && move.x > 0.9, [ move.x, move.y, move.z ], 'x ≈ 1' );

		world.free();

	},
};
