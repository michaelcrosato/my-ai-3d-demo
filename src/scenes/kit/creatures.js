// More characters (design §6.2): skater and knight build on the mannequin rig;
// robot and goose are their own rigs. Same tier rules: T0 blockout, T1 facets,
// T2 hands/eyes/details, T3 accessories and face detail. Idle animation in userData.animate.

import { THREE, byTier, faceted, mesh, group, place, merge } from './core.js';
import { character } from './characters.js';

/** Inline-skater: cap, headphones, skates. Leans and sways as if skating. */
export function skater( tier, { part = 'hero', shirt = '#ff2e88', pants = '#2b2f3a', cap = '#ffe600', seed = 0 } = {} ) {

	const root = character( tier, { part, shirt, pants, seed } );
	const { head, legs } = root.userData.rig;
	const o = ( color, extra ) => ( { part, color, ...extra } );

	if ( tier >= 1 ) {

		const capG = new THREE.SphereGeometry( 0.26, byTier( tier, [ 8, 8, 20, 32 ] ), 10, 0, Math.PI * 2, 0, Math.PI * 0.5 );
		const brim = place( new THREE.BoxGeometry( 0.26, 0.03, 0.22 ), { p: [ 0, 0.02, 0.26 ] } );
		head.add( mesh( tier === 1 ? faceted( merge( [ capG, brim ] ) ) : merge( [ capG, brim ] ), o( cap ) ) );

		for ( const leg of legs ) {

			const skate = [ place( new THREE.BoxGeometry( 0.16, 0.12, 0.36 ), { p: [ 0, - 0.74, 0.05 ] } ) ];
			if ( tier >= 2 ) for ( let i = 0; i < 4; i ++ ) skate.push( place( new THREE.CylinderGeometry( 0.045, 0.045, 0.05, 12 ), { p: [ 0, - 0.84, - 0.08 + i * 0.09 ], r: [ 0, 0, Math.PI / 2 ] } ) );
			leg.add( mesh( merge( skate ), o( '#30343f' ) ) );

		}

	}

	if ( tier >= 2 ) {

		const phones = [ - 1, 1 ].map( ( s ) => place( new THREE.CylinderGeometry( 0.07, 0.07, 0.05, 16 ), { p: [ s * 0.25, 0, 0 ], r: [ 0, 0, Math.PI / 2 ] } ) );
		phones.push( place( new THREE.TorusGeometry( 0.25, 0.015, 6, 24, Math.PI ), { p: [ 0, 0.02, 0 ] } ) );
		head.add( mesh( merge( phones ), o( '#1e9bff' ) ) );

	}

	const idle = root.userData.animate;
	root.userData.animate = ( t ) => {

		idle( t );
		const s = t + seed;
		root.rotation.z = Math.sin( s * 1.4 ) * 0.08;
		for ( const [ i, leg ] of legs.entries() ) leg.rotation.x = Math.sin( s * 1.4 + i * Math.PI ) * 0.25;

	};

	return root;

}

/** Knight: helmet with visor, armored torso, sword and shield. */
export function knight( tier, { part = 'hero', armor = '#9aa3ad', cloth = '#7a1f2b', seed = 0 } = {} ) {

	const root = character( tier, { part, shirt: armor, pants: '#4a4f57', skin: '#d8b48a', seed } );
	const { head, arms, torso } = root.userData.rig;
	const o = ( color, extra ) => ( { part, color, roughness: 0.4, metalness: 0.6, ...extra } );
	const seg = byTier( tier, [ 8, 8, 24, 40 ] );

	const helm = new THREE.SphereGeometry( 0.27, seg, Math.max( 6, seg - 6 ) );
	head.add( mesh( tier === 1 ? faceted( helm ) : helm, o( armor ) ) );

	if ( tier >= 1 ) {

		const visor = place( new THREE.BoxGeometry( 0.34, 0.05, 0.08 ), { p: [ 0, 0.02, 0.24 ] } );
		head.add( mesh( visor, o( '#2b2f36' ) ) );
		const sword = [ place( new THREE.BoxGeometry( 0.05, 0.85, 0.015 ), { p: [ 0, - 1.1, 0.12 ] } ), place( new THREE.BoxGeometry( 0.22, 0.04, 0.05 ), { p: [ 0, - 0.68, 0.12 ] } ) ];
		arms[ 1 ].add( mesh( merge( sword ), o( '#c9ced6' ) ) );
		const shield = new THREE.CylinderGeometry( 0.3, 0.3, 0.05, byTier( tier, [ 8, 8, 32, 48 ] ) );
		shield.rotateZ( Math.PI / 2 );
		const s = mesh( tier === 1 ? faceted( shield ) : shield, o( cloth, { metalness: 0.1 } ) );
		s.position.set( - 0.1, - 0.5, 0.05 );
		arms[ 0 ].add( s );

	}

	if ( tier >= 2 ) {

		const pauldrons = [ - 1, 1 ].map( ( x ) => place( new THREE.SphereGeometry( 0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2 ), { p: [ x * 0.36, 0.38, 0 ] } ) );
		torso.add( mesh( merge( pauldrons ), o( armor ) ) );
		const tabard = mesh( new THREE.BoxGeometry( 0.36, 0.5, 0.04 ), o( cloth, { metalness: 0 } ) );
		tabard.position.set( 0, 0.05, 0.27 );
		torso.add( tabard );

	}

	if ( tier >= 3 ) {

		const plume = mesh( new THREE.CapsuleGeometry( 0.04, 0.3, 4, 10 ), o( cloth, { metalness: 0 } ) );
		plume.position.set( 0, 0.3, - 0.05 );
		plume.rotation.x = - 0.6;
		head.add( plume );
		const boss = mesh( new THREE.SphereGeometry( 0.06, 16, 10 ), o( '#d4af37' ) );
		boss.position.set( - 0.14, - 0.5, 0.05 );
		arms[ 0 ].add( boss );

	}

	return root;

}

/** Hovering robot with a glowing visor and a blinking antenna. */
export function robot( tier, { part = 'characters', body = '#d9dde3', accent = '#ff7a1a', seed = 0 } = {} ) {

	const root = group( `robot (${part})` );
	const o = ( color, extra ) => ( { part, color, roughness: 0.35, metalness: 0.5, ...extra } );
	const f = ( g ) => tier === 1 ? faceted( g ) : g;
	const rounded = ( w, h, d ) => tier >= 2 ? new THREE.CapsuleGeometry( Math.min( w, d ) / 2, h - Math.min( w, d ), 4, 16 ) : new THREE.BoxGeometry( w, h, d );

	const rig = group( 'rig' );
	root.add( rig );
	const torso = mesh( f( rounded( 0.6, 0.7, 0.45 ) ), o( body ) );
	torso.position.y = 1.0;
	rig.add( torso );

	const head = group( 'head' );
	head.position.y = 1.62;
	rig.add( head );
	head.add( mesh( f( new THREE.BoxGeometry( 0.5, 0.36, 0.4 ) ), o( body ) ) );
	const visor = mesh( new THREE.BoxGeometry( 0.4, 0.12, 0.04 ), { part: 'vfx', color: '#7df9ff', emissive: '#30e0ff', emissiveIntensity: 2.5, castShadow: false } );
	visor.position.set( 0, 0.02, 0.21 );
	head.add( visor );

	const base = mesh( f( new THREE.ConeGeometry( 0.32, 0.5, byTier( tier, [ 8, 8, 24, 40 ] ) ) ), o( accent ) );
	base.rotation.x = Math.PI;
	base.position.y = 0.45;
	rig.add( base );

	if ( tier >= 1 ) {

		const arms = [ - 1, 1 ].map( ( x ) => place( new THREE.BoxGeometry( 0.12, 0.5, 0.12 ), { p: [ x * 0.4, 0.95, 0 ] } ) );
		rig.add( mesh( f( merge( arms ) ), o( accent ) ) );
		const antenna = mesh( new THREE.CylinderGeometry( 0.015, 0.015, 0.3, 6 ), o( '#555a62' ) );
		antenna.position.y = 0.32;
		head.add( antenna );

	}

	let tip = null;
	if ( tier >= 2 ) {

		tip = mesh( new THREE.SphereGeometry( 0.05, 16, 10 ), { part: 'vfx', color: '#ff3b3b', emissive: '#ff2020', emissiveIntensity: 3, castShadow: false } );
		tip.position.y = 0.5;
		head.add( tip );
		const glow = mesh( new THREE.TorusGeometry( 0.22, 0.03, 8, 32 ), { part: 'vfx', color: '#7df9ff', emissive: '#30e0ff', emissiveIntensity: 2, castShadow: false } );
		glow.rotation.x = Math.PI / 2;
		glow.position.y = 0.2;
		rig.add( glow );

	}

	if ( tier >= 3 ) {

		const panel = [];
		for ( let i = 0; i < 3; i ++ ) panel.push( place( new THREE.BoxGeometry( 0.3, 0.04, 0.02 ), { p: [ 0, 0.9 + i * 0.12, 0.235 ] } ) );
		rig.add( mesh( merge( panel ), o( '#3a3f4a' ) ) );
		const ears = [ - 1, 1 ].map( ( x ) => place( new THREE.CylinderGeometry( 0.08, 0.08, 0.06, 20 ), { p: [ x * 0.27, 0, 0 ], r: [ 0, 0, Math.PI / 2 ] } ) );
		head.add( mesh( merge( ears ), o( accent ) ) );

	}

	root.userData.animate = ( t ) => {

		const s = t + seed;
		rig.position.y = Math.sin( s * 1.8 ) * 0.06;
		head.rotation.y = Math.sin( s * 0.5 ) * 0.6;
		if ( tip ) tip.visible = Math.floor( s * 2 ) % 2 === 0;

	};

	root.userData.rig = { head, torso, arms: [], legs: [], part, tier };
	return root;

}

/** The goose: long neck, orange beak and feet. Bobs its head and waddles. */
export function goose( tier, { part = 'hero', seed = 0 } = {} ) {

	const root = group( `goose (${part})` );
	const white = '#f4f1ea', orange = '#f39c12';
	const o = ( color, extra ) => ( { part, color, ...extra } );
	const seg = byTier( tier, [ 8, 8, 24, 40 ] );
	const f = ( g ) => tier === 1 ? faceted( g ) : g;

	const body = group( 'body' );
	body.position.y = 0.42;
	root.add( body );
	const torsoG = tier === 1 ? new THREE.IcosahedronGeometry( 0.3, 1 ) : new THREE.SphereGeometry( 0.3, seg, Math.max( 6, seg - 6 ) );
	torsoG.scale( 1, 0.8, 1.45 );
	body.add( mesh( f( torsoG ), o( white ) ) );

	const neck = group( 'neck' );
	neck.position.set( 0, 0.12, 0.32 );
	body.add( neck );
	const neckG = new THREE.CapsuleGeometry( 0.07, 0.42, 4, Math.max( 6, seg - 4 ) );
	neckG.translate( 0, 0.25, 0 );
	neck.add( mesh( f( neckG ), o( white ) ) );

	const head = group( 'head' );
	head.position.set( 0, 0.55, 0.04 );
	neck.add( head );
	head.add( mesh( f( new THREE.SphereGeometry( 0.11, seg, Math.max( 6, seg - 6 ) ) ), o( white ) ) );
	const beak = new THREE.ConeGeometry( 0.05, 0.16, Math.max( 6, seg / 2 ) );
	beak.rotateX( Math.PI / 2 );
	beak.translate( 0, - 0.01, 0.15 );
	head.add( mesh( f( beak ), o( orange ) ) );

	const legs = [ - 1, 1 ].map( ( x ) => {

		const leg = group( 'leg' );
		leg.position.set( x * 0.12, 0.3, 0 );
		const g = [ place( new THREE.CylinderGeometry( 0.025, 0.025, 0.3, 6 ), { p: [ 0, - 0.15, 0 ] } ) ];
		if ( tier >= 1 ) g.push( place( new THREE.BoxGeometry( 0.12, 0.02, 0.14 ), { p: [ 0, - 0.3, 0.04 ] } ) );
		leg.add( mesh( merge( g ), o( orange ) ) );
		root.add( leg );
		return leg;

	} );

	if ( tier >= 2 ) {

		const eyes = [ - 1, 1 ].map( ( x ) => place( new THREE.SphereGeometry( 0.02, 10, 8 ), { p: [ x * 0.085, 0.03, 0.06 ] } ) );
		head.add( mesh( merge( eyes ), o( '#111111', { castShadow: false } ) ) );
		const wings = [ - 1, 1 ].map( ( x ) => {

			const w = new THREE.SphereGeometry( 0.2, 20, 12 );
			w.scale( 0.35, 0.6, 1.2 );
			return place( w, { p: [ x * 0.25, 0.02, - 0.05 ], r: [ 0.2, 0, x * 0.15 ] } );

		} );
		body.add( mesh( merge( wings ), o( '#e4e0d6' ) ) );

	}

	if ( tier >= 3 ) {

		const tail = new THREE.ConeGeometry( 0.12, 0.2, 24 );
		tail.rotateX( - Math.PI / 2 - 0.5 );
		tail.translate( 0, 0.12, - 0.48 );
		body.add( mesh( tail, o( white ) ) );
		const knob = mesh( new THREE.SphereGeometry( 0.025, 12, 8 ), o( '#e67e22' ) );
		knob.position.set( 0, 0.03, 0.12 );
		head.add( knob );

	}

	root.userData.animate = ( t ) => {

		const s = t + seed;
		neck.rotation.x = Math.sin( s * 2.2 ) * 0.25 + 0.1;
		head.rotation.x = - Math.sin( s * 2.2 ) * 0.2;
		body.rotation.z = Math.sin( s * 4 ) * 0.06;
		for ( const [ i, leg ] of legs.entries() ) leg.rotation.x = Math.sin( s * 4 + i * Math.PI ) * 0.4;

	};

	root.userData.rig = { head, torso: body, arms: [], legs, part, tier };
	return root;

}
