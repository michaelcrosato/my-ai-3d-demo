// Game props for the M2 scenes: karts, coins, pipes, blocks, chests, cones, tires,
// benches, a well, a campfire, a dropship, holograms and trash cans. Coins, item blocks
// and chests are tagged interactable (what the highlight outlines).

import { THREE, byTier, faceted, mesh, merge, place, group, practical, interactable } from './core.js';
import { box, cylinder } from './shapes.js';
import { character } from './characters.js';

const P = 'props';
const ft = ( g, tier ) => tier === 1 ? faceted( g ) : g;

/** Go-kart with a driver, nose along +z. Wheels spin in userData.animate. */
export function kart( tier, { color = '#e74c3c', driver = '#3498db', part = P, driverPart = 'characters', seed = 0 } = {} ) {

	const root = group( 'kart' );
	const body = box( tier, [ 1.3, 0.35, 2.1 ], { part, color }, { bevel: 0.15 } );
	body.position.y = 0.4;
	root.add( body );

	const wheels = [];
	const wseg = byTier( tier, [ 8, 8, 20, 32 ] );
	for ( const [ x, z ] of [ [ - 0.72, 0.7 ], [ 0.72, 0.7 ], [ - 0.72, - 0.7 ], [ 0.72, - 0.7 ] ] ) {

		const w = mesh( ft( new THREE.CylinderGeometry( 0.3, 0.3, 0.28, wseg ), tier ), { part, color: '#222222' } );
		w.rotation.z = Math.PI / 2;
		w.position.set( x, 0.3, z );
		root.add( w );
		wheels.push( w );

	}

	if ( tier >= 1 ) {

		const seat = box( tier, [ 0.6, 0.5, 0.25 ], { part, color: '#2c2c2c' } );
		seat.position.set( 0, 0.75, - 0.45 );
		root.add( seat );
		const pilot = character( Math.min( tier, 2 ), { part: driverPart, shirt: driver, pants: '#333333', seed } );
		pilot.scale.setScalar( 0.75 );
		pilot.position.set( 0, - 0.05, - 0.2 );
		root.add( pilot );

	}

	if ( tier >= 2 ) {

		const wheel = mesh( new THREE.TorusGeometry( 0.16, 0.025, 8, 24 ), { part, color: '#222222' } );
		wheel.position.set( 0, 0.95, 0.25 );
		wheel.rotation.x = - 0.9;
		root.add( wheel );
		const bumper = box( tier, [ 1.5, 0.15, 0.25 ], { part, color: '#ecf0f1' } );
		bumper.position.set( 0, 0.3, 1.15 );
		root.add( bumper );

	}

	if ( tier >= 3 ) {

		const spoiler = [ place( new THREE.BoxGeometry( 1.3, 0.06, 0.35 ), { p: [ 0, 1.15, - 1 ] } ), place( new THREE.BoxGeometry( 0.06, 0.5, 0.1 ), { p: [ - 0.5, 0.9, - 1 ] } ), place( new THREE.BoxGeometry( 0.06, 0.5, 0.1 ), { p: [ 0.5, 0.9, - 1 ] } ) ];
		root.add( mesh( merge( spoiler ), { part, color } ) );
		const pipes = [ - 0.3, 0.3 ].map( ( x ) => place( new THREE.CylinderGeometry( 0.06, 0.06, 0.35, 12 ), { p: [ x, 0.45, - 1.15 ], r: [ Math.PI / 2, 0, 0 ] } ) );
		root.add( mesh( merge( pipes ), { part, color: '#9aa3ad', metalness: 0.6, roughness: 0.3 } ) );

	}

	root.userData.wheels = wheels;
	return root;

}

/** Spinning gold coin (emissive, part vfx). */
export function coin( tier, { seed = 0 } = {} ) {

	const g = tier >= 2 ? new THREE.CylinderGeometry( 0.35, 0.35, 0.08, byTier( tier, [ 8, 8, 32, 48 ] ) ) : new THREE.CylinderGeometry( 0.35, 0.35, 0.1, 8 );
	g.rotateX( Math.PI / 2 );
	const m = mesh( ft( g, tier ), { part: 'vfx', color: '#ffd23f', emissive: '#ffb300', emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.5 } );
	m.userData.animate = ( t ) => { m.rotation.y = t * 2.5 + seed; };
	return interactable( m );

}

export function pipe( tier, { height = 1.6, radius = 0.6, color = '#2ecc71' } = {} ) {

	const root = group( 'pipe' );
	const body = cylinder( tier, radius, height, { part: P, color } );
	body.position.y = height / 2;
	root.add( body );
	const rim = cylinder( tier, radius * 1.2, 0.45, { part: P, color } );
	rim.position.y = height + 0.2;
	root.add( rim );
	return root;

}

/** Item or brick block. Item blocks carry a dot pattern instead of a glyph (no game marks). */
export function block( tier, { kind = 'item', size = 1 } = {} ) {

	const root = group( `${kind} block` );
	const color = kind === 'item' ? '#f5b82e' : '#b5562a';
	root.add( box( tier, [ size, size, size ], { part: P, color }, { bevel: 0.08 } ) );

	if ( tier >= 1 ) {

		const dots = [];
		if ( kind === 'item' ) for ( const [ x, y ] of [ [ - 0.3, 0.3 ], [ 0.3, 0.3 ], [ - 0.3, - 0.3 ], [ 0.3, - 0.3 ], [ 0, 0 ] ] ) for ( const s of [ 1, - 1 ] ) dots.push( place( new THREE.CylinderGeometry( 0.06, 0.06, 0.04, 10 ), { p: [ x * size, y * size, s * size / 2 ], r: [ Math.PI / 2, 0, 0 ] } ) );
		else for ( const y of [ - 0.25, 0, 0.25 ] ) for ( const s of [ 1, - 1 ] ) dots.push( place( new THREE.BoxGeometry( size * 1.01, 0.03, 0.02 ), { p: [ 0, y * size, s * size / 2 ] } ) );
		root.add( mesh( merge( dots ), { part: P, color: kind === 'item' ? '#8a4b0f' : '#e7d6c9' } ) );

	}

	return kind === 'item' ? interactable( root ) : root;

}

/** Treasure chest with metal bands and a lock (T3). */
export function chest( tier, { color = '#8b5a2b' } = {} ) {

	const root = group( 'chest' );
	const base = box( tier, [ 1.1, 0.55, 0.7 ], { part: P, color } );
	base.position.y = 0.28;
	root.add( base );
	const lidG = tier === 0 ? new THREE.BoxGeometry( 1.1, 0.25, 0.7 ) : new THREE.CylinderGeometry( 0.35, 0.35, 1.1, byTier( tier, [ 6, 6, 20, 32 ] ), 1, false, 0, Math.PI );
	if ( tier > 0 ) lidG.rotateZ( Math.PI / 2 );
	const lid = mesh( ft( lidG, tier ), { part: P, color } );
	lid.position.y = tier === 0 ? 0.68 : 0.55;
	root.add( lid );

	if ( tier >= 2 ) {

		const bands = [ - 0.38, 0.38 ].map( ( x ) => place( new THREE.BoxGeometry( 0.08, 0.6, 0.74 ), { p: [ x, 0.3, 0 ] } ) );
		root.add( mesh( merge( bands ), { part: P, color: '#d4af37', metalness: 0.7, roughness: 0.3 } ) );

	}

	if ( tier >= 3 ) {

		const lock = mesh( new THREE.BoxGeometry( 0.16, 0.2, 0.06 ), { part: P, color: '#d4af37', metalness: 0.7, roughness: 0.3 } );
		lock.position.set( 0, 0.5, 0.37 );
		root.add( lock );

	}

	return interactable( root );

}

export function trafficCone( tier ) {

	const g = [ place( new THREE.ConeGeometry( 0.22, 0.65, byTier( tier, [ 6, 8, 20, 32 ] ) ), { p: [ 0, 0.38, 0 ] } ), place( new THREE.BoxGeometry( 0.5, 0.06, 0.5 ), { p: [ 0, 0.03, 0 ] } ) ];
	const root = group( 'cone', mesh( ft( merge( g ), tier ), { part: P, color: '#ff7a1a' } ) );
	if ( tier >= 2 ) {

		const stripe = mesh( new THREE.CylinderGeometry( 0.13, 0.16, 0.1, 20 ), { part: P, color: '#f4f4f4' } );
		stripe.position.y = 0.4;
		root.add( stripe );

	}

	return root;

}

export function tireStack( tier, { n = 3 } = {} ) {

	const g = [];
	for ( let i = 0; i < n; i ++ ) g.push( place( new THREE.TorusGeometry( 0.38, 0.16, byTier( tier, [ 6, 6, 12, 16 ] ), byTier( tier, [ 8, 10, 28, 40 ] ) ), { p: [ 0, 0.16 + i * 0.32, 0 ], r: [ Math.PI / 2, 0, 0 ] } ) );
	return mesh( ft( merge( g ), tier ), { part: P, color: '#2a2a2a' } );

}

export function bench( tier, { color = '#9c6b3f' } = {} ) {

	const g = [];
	const slats = byTier( tier, [ 1, 2, 4, 5 ] );
	for ( let i = 0; i < slats; i ++ ) g.push( place( new THREE.BoxGeometry( 1.8, 0.06, 0.45 / slats - 0.02 ), { p: [ 0, 0.48, ( i + 0.5 ) * 0.45 / slats - 0.225 ] } ) );
	if ( tier >= 1 ) for ( let i = 0; i < slats; i ++ ) g.push( place( new THREE.BoxGeometry( 1.8, 0.4 / slats - 0.02, 0.05 ), { p: [ 0, 0.62 + ( i + 0.5 ) * 0.4 / slats, - 0.24 ] } ) );
	const legs = [ - 0.8, 0.8 ].map( ( x ) => place( new THREE.BoxGeometry( 0.08, 0.48, 0.45 ), { p: [ x, 0.24, 0 ] } ) );
	return group( 'bench', mesh( merge( g ), { part: P, color } ), mesh( merge( legs ), { part: P, color: '#3a3f4a' } ) );

}

export function well( tier ) {

	const root = group( 'well' );
	const ring = cylinder( tier, 0.75, 0.8, { part: 'architecture', color: '#9b958c' } );
	ring.position.y = 0.4;
	root.add( ring );
	const water = mesh( new THREE.CircleGeometry( 0.6, byTier( tier, [ 8, 10, 32, 48 ] ) ).rotateX( - Math.PI / 2 ), { part: 'water', color: '#2f6f9f', castShadow: false } );
	water.position.y = 0.55;
	root.add( water );
	if ( tier >= 1 ) {

		const roof = [ place( new THREE.BoxGeometry( 0.1, 1.5, 0.1 ), { p: [ - 0.7, 1.15, 0 ] } ), place( new THREE.BoxGeometry( 0.1, 1.5, 0.1 ), { p: [ 0.7, 1.15, 0 ] } ), place( new THREE.CylinderGeometry( 0.06, 0.06, 1.5, 8 ), { p: [ 0, 1.5, 0 ], r: [ 0, 0, Math.PI / 2 ] } ) ];
		root.add( mesh( merge( roof ), { part: 'architecture', color: '#7a5530' } ) );
		const top = mesh( new THREE.ConeGeometry( 1.1, 0.6, 4 ), { part: 'architecture', color: '#b03a2e' } );
		top.position.y = 2.15;
		top.rotation.y = Math.PI / 4;
		root.add( top );

	}

	return root;

}

/** Campfire: logs, a stone ring, flames and a flickering practical light. */
export function campfire( tier, { seed = 0 } = {} ) {

	const root = group( 'campfire' );
	const logs = [];
	for ( let i = 0; i < byTier( tier, [ 2, 3, 4, 5 ] ); i ++ ) {

		const a = i / byTier( tier, [ 2, 3, 4, 5 ] ) * Math.PI;
		logs.push( place( new THREE.CylinderGeometry( 0.08, 0.09, 0.9, byTier( tier, [ 6, 6, 12, 16 ] ) ), { p: [ 0, 0.12, 0 ], r: [ Math.PI / 2, a, 0.35 ] } ) );

	}

	root.add( mesh( ft( merge( logs ), tier ), { part: P, color: '#5a3b22' } ) );
	if ( tier >= 1 ) {

		const stones = [];
		const n = byTier( tier, [ 0, 8, 12, 16 ] );
		for ( let i = 0; i < n; i ++ ) {

			const a = i / n * Math.PI * 2;
			stones.push( place( new THREE.IcosahedronGeometry( 0.13, tier >= 2 ? 1 : 0 ), { p: [ Math.cos( a ) * 0.6, 0.06, Math.sin( a ) * 0.6 ], s: [ 1, 0.6, 1 ] } ) );

		}

		root.add( mesh( ft( merge( stones ), tier ), { part: P, color: '#7d7a74' } ) );

	}

	const flames = [];
	const fl = mesh( tier >= 2 ? new THREE.ConeGeometry( 0.28, 0.8, 20 ) : new THREE.ConeGeometry( 0.28, 0.7, 6 ), { part: 'vfx', color: '#ffb347', emissive: '#ff7a1e', emissiveIntensity: 4, castShadow: false } );
	fl.position.y = 0.45;
	root.add( fl );
	flames.push( fl );
	if ( tier >= 2 ) {

		const inner = mesh( new THREE.ConeGeometry( 0.15, 0.55, 16 ), { part: 'vfx', color: '#fff1a8', emissive: '#ffd36b', emissiveIntensity: 5, castShadow: false } );
		inner.position.y = 0.35;
		root.add( inner );
		flames.push( inner );

	}

	const light = practical( { color: '#ff9a3c', intensity: 14, distance: 14, flicker: 1, seed } );
	light.position.y = 0.8;
	root.add( light );
	root.userData.animate = ( t ) => { for ( const [ i, f ] of flames.entries() ) { f.scale.y = 1 + Math.sin( t * 9 + i * 1.7 + seed ) * 0.15; f.rotation.y = t * ( 0.8 + i ); } };
	return root;

}

/** A dropship: hull, wings, glowing engines and cockpit. Nose along +z. */
export function ship( tier, { color = '#c7ccd3', accent = '#ff7a1a' } = {} ) {

	const root = group( 'ship' );
	const o = ( c, e ) => ( { part: P, color: c, roughness: 0.35, metalness: 0.55, ...e } );
	let hull;
	if ( tier === 0 ) hull = new THREE.BoxGeometry( 3, 1.4, 7 );
	else {

		const s = new THREE.Shape( [ new THREE.Vector2( - 1.6, - 3.4 ), new THREE.Vector2( 1.6, - 3.4 ), new THREE.Vector2( 1.2, 2.2 ), new THREE.Vector2( 0, 3.6 ), new THREE.Vector2( - 1.2, 2.2 ) ] );
		hull = new THREE.ExtrudeGeometry( s, { depth: 1.4, bevelEnabled: tier >= 2, bevelSize: 0.15, bevelThickness: 0.2, bevelSegments: tier === 3 ? 3 : 1 } );
		hull.rotateX( Math.PI / 2 );
		hull.translate( 0, 0.7, 0 );

	}

	const h = mesh( faceted( hull ), o( color ) );
	h.position.y = 1.6;
	root.add( h );

	if ( tier >= 1 ) {

		const wings = [ place( new THREE.BoxGeometry( 7, 0.18, 1.8 ), { p: [ 0, 1.6, - 1.2 ] } ) ];
		root.add( mesh( merge( wings ), o( '#9aa3ad' ) ) );
		const cockpit = mesh( new THREE.SphereGeometry( 0.7, byTier( tier, [ 8, 8, 24, 32 ] ), 12, 0, Math.PI * 2, 0, Math.PI / 2 ), o( '#2b3a55', { roughness: 0.15 } ) );
		cockpit.scale.set( 1, 0.6, 1.6 );
		cockpit.position.set( 0, 2.3, 1.6 );
		root.add( cockpit );

	}

	const engines = [ - 2.2, 2.2 ].map( ( x ) => {

		const e = cylinder( tier, 0.45, 1.6, o( accent ) );
		e.rotation.x = Math.PI / 2;
		e.position.set( x, 1.5, - 2.2 );
		root.add( e );
		return e;

	} );

	if ( tier >= 2 ) for ( const e of engines ) {

		const glow = mesh( new THREE.CircleGeometry( 0.38, 24 ), { part: 'vfx', color: '#7df9ff', emissive: '#30e0ff', emissiveIntensity: 3, castShadow: false } );
		glow.position.set( e.position.x, 1.5, - 3.02 );
		glow.rotation.y = Math.PI;
		root.add( glow );

	}

	const gear = [ [ - 1, 2 ], [ 1, 2 ], [ 0, - 2.5 ] ].map( ( [ x, z ] ) => place( new THREE.CylinderGeometry( 0.12, 0.12, 1, 8 ), { p: [ x, 0.5, z ] } ) );
	root.add( mesh( merge( gear ), o( '#555a62' ) ) );
	return root;

}

/** Hologram: a translucent emissive shape over a projector disc; it spins and pulses. */
export function hologram( tier, { color = '#30e0ff', seed = 0 } = {} ) {

	const root = group( 'hologram' );
	root.add( cylinder( tier, 0.5, 0.2, { part: P, color: '#3a3f4a', metalness: 0.5, roughness: 0.4 } ) );
	const shape = mesh( new THREE.IcosahedronGeometry( 0.55, byTier( tier, [ 0, 0, 1, 2 ] ) ), { part: 'vfx', color, emissive: color, emissiveIntensity: 2, opacity: 0.55, castShadow: false } );
	shape.position.y = 1.2;
	root.add( shape );
	shape.userData.animate = ( t ) => { shape.rotation.y = t * 0.8 + seed; shape.position.y = 1.2 + Math.sin( t * 1.6 + seed ) * 0.08; };
	return root;

}

export function trashCan( tier, { color = '#4a6b3a' } = {} ) {

	const root = group( 'trash can' );
	const body = cylinder( tier, 0.35, 0.9, { part: P, color } );
	body.position.y = 0.45;
	root.add( body );
	const lid = cylinder( tier, 0.38, 0.08, { part: P, color: '#3a3f4a' } );
	lid.position.y = 0.94;
	root.add( lid );
	return root;

}
