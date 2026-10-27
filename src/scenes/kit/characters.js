// Procedural character rig (design §6.2): T0 capsule and head, T1 faceted limbs,
// T2 hands, hair and eyes, T3 face detail, clothing layers and an accessory.
// The returned group carries an idle animation in userData.animate.

import { THREE, byTier, faceted, mesh, group, place, merge } from './core.js';

const SKIN = '#f1c27d', HAIR = '#4a3426', EYE = '#1b1b22';

/**
 * @param {number} tier
 * @param {object} o - { part: 'characters'|'hero', shirt, pants, height }
 */
export function character( tier, { part = 'characters', shirt = '#3d7fd6', pants = '#3b4a6b', skin = SKIN, hat = null, seed = 0 } = {} ) {

	const root = group( `character (${part})` );
	const o = ( color, extra ) => ( { part, color, ...extra } );
	const seg = byTier( tier, [ 8, 6, 20, 40 ] );
	const f = ( g ) => tier === 1 ? faceted( g ) : g;

	if ( tier === 0 ) {

		const body = mesh( new THREE.CapsuleGeometry( 0.32, 0.9, 3, 8 ), o( shirt ) );
		body.position.y = 0.78;
		const head = mesh( new THREE.SphereGeometry( 0.24, 10, 8 ), o( skin ) );
		head.position.y = 1.55;
		root.add( body, head );
		root.userData.animate = ( t ) => { head.rotation.y = Math.sin( t * 0.7 + seed ) * 0.3; body.scale.y = 1 + Math.sin( t * 2 + seed ) * 0.01; };
		return root;

	}

	const torso = group( 'torso' );
	torso.position.y = 1.0;
	const chest = mesh( f( new THREE.CapsuleGeometry( 0.27, 0.32, 3, seg ) ), o( shirt ) );
	chest.position.y = 0.12;
	torso.add( chest );

	const head = group( 'head' );
	head.position.y = 0.62;
	const skull = mesh( f( tier === 1 ? new THREE.IcosahedronGeometry( 0.24, 1 ) : new THREE.SphereGeometry( 0.24, seg + 4, seg ) ), o( skin ) );
	head.add( skull );
	torso.add( head );

	const limb = ( r, len, color ) => {

		const g = f( new THREE.CapsuleGeometry( r, len, 2, Math.max( 5, seg - 2 ) ) );
		g.translate( 0, - len / 2 - r, 0 );
		return mesh( g, o( color ) );

	};

	const arms = [ - 1, 1 ].map( ( side ) => {

		const arm = group( 'arm' );
		arm.position.set( side * 0.36, 0.3, 0 );
		arm.rotation.z = side * 0.12;
		arm.add( limb( 0.08, 0.5, shirt ) );
		if ( tier >= 2 ) {

			const hand = mesh( new THREE.SphereGeometry( 0.085, seg, seg - 4 ), o( skin ) );
			hand.position.y = - 0.72;
			arm.add( hand );

		}

		torso.add( arm );
		return arm;

	} );

	const hips = mesh( f( new THREE.CapsuleGeometry( 0.25, 0.1, 2, seg ) ), o( pants ) );
	hips.position.y = 0.72;
	root.add( hips );

	const legs = [ - 1, 1 ].map( ( side ) => {

		const leg = group( 'leg' );
		leg.position.set( side * 0.13, 0.72, 0 );
		leg.add( limb( 0.1, 0.48, pants ) );
		if ( tier >= 2 ) {

			const shoe = mesh( new THREE.SphereGeometry( 0.11, seg, seg - 4 ), o( '#3a2a20' ) );
			shoe.scale.set( 1, 0.6, 1.5 );
			shoe.position.set( 0, - 0.68, 0.05 );
			leg.add( shoe );

		}

		root.add( leg );
		return leg;

	} );

	root.add( torso );

	if ( tier >= 2 ) {

		const hair = new THREE.SphereGeometry( 0.255, seg + 4, seg, 0, Math.PI * 2, 0, Math.PI * 0.52 );
		hair.rotateX( - 0.25 );
		head.add( mesh( hair, o( HAIR ) ) );
		const eyes = [ - 0.08, 0.08 ].map( ( x ) => place( new THREE.SphereGeometry( 0.035, 12, 8 ), { p: [ x, 0.03, 0.215 ] } ) );
		head.add( mesh( merge( eyes ), o( EYE, { castShadow: false } ) ) );

	}

	if ( tier >= 3 ) {

		const face = [
			place( new THREE.SphereGeometry( 0.04, 12, 8 ), { p: [ 0, - 0.03, 0.245 ] } ), // nose
			place( new THREE.CapsuleGeometry( 0.012, 0.06, 2, 6 ), { p: [ - 0.08, 0.09, 0.22 ], r: [ 0, 0, Math.PI / 2 + 0.15 ] } ),
			place( new THREE.CapsuleGeometry( 0.012, 0.06, 2, 6 ), { p: [ 0.08, 0.09, 0.22 ], r: [ 0, 0, Math.PI / 2 - 0.15 ] } ),
		];
		head.add( mesh( merge( face ), o( '#c98b5c', { castShadow: false } ) ) );
		const mouth = mesh( new THREE.TorusGeometry( 0.045, 0.01, 6, 16, Math.PI ), o( '#8a3b3b', { castShadow: false } ) );
		mouth.position.set( 0, - 0.1, 0.215 );
		mouth.rotation.z = Math.PI;
		head.add( mouth );

		const belt = mesh( new THREE.TorusGeometry( 0.255, 0.035, 8, 40 ), o( '#3a2a20' ) );
		belt.rotation.x = Math.PI / 2;
		belt.position.y = 0.8;
		root.add( belt );
		const collar = mesh( new THREE.TorusGeometry( 0.15, 0.04, 8, 32 ), o( '#f3efe6' ) );
		collar.rotation.x = Math.PI / 2;
		collar.position.y = 0.48;
		torso.add( collar );

		if ( hat ) {

			const brim = mesh( new THREE.CylinderGeometry( 0.38, 0.38, 0.03, 40 ), o( hat ) );
			brim.position.y = 0.17;
			const crown = mesh( new THREE.CylinderGeometry( 0.2, 0.23, 0.2, 40 ), o( hat ) );
			crown.position.y = 0.28;
			head.add( brim, crown );

		}

	}

	root.userData.animate = ( t ) => {

		const s = t + seed;
		torso.position.y = 1.0 + Math.sin( s * 2 ) * 0.008;
		head.rotation.y = Math.sin( s * 0.6 ) * 0.35;
		head.rotation.x = Math.sin( s * 0.9 ) * 0.05;
		arms[ 0 ].rotation.x = Math.sin( s * 1.1 ) * 0.08;
		arms[ 1 ].rotation.x = - Math.sin( s * 1.1 ) * 0.08;
		legs[ 0 ].rotation.x = 0;

	};

	return root;

}
