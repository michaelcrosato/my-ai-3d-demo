// Props: boat, barrel, crate, lantern.

import { THREE, byTier, faceted, mesh, merge, place, group } from './core.js';
import { box, cylinder } from './shapes.js';

const P = 'props';

function hullShape( len, beam ) {

	const s = new THREE.Shape();
	s.moveTo( - len / 2, - beam / 2 );
	s.lineTo( len * 0.18, - beam / 2 );
	s.quadraticCurveTo( len / 2, - beam / 2, len / 2, 0 );
	s.quadraticCurveTo( len / 2, beam / 2, len * 0.18, beam / 2 );
	s.lineTo( - len / 2, beam / 2 );
	s.lineTo( - len / 2, - beam / 2 );
	return s;

}

/** Sailboat, bow along +x. Bobs and rolls via userData.animate. */
export function boat( tier, { hull = '#c0392b', sail = '#f5efe0', seed = 0 } = {} ) {

	const root = group( 'boat' );
	const len = 6, beam = 2.2, depth = 1.1;

	let hullG;
	if ( tier === 0 ) hullG = new THREE.BoxGeometry( len, depth, beam );
	else {

		hullG = new THREE.ExtrudeGeometry( hullShape( len, beam ), {
			depth, curveSegments: byTier( tier, [ 2, 3, 10, 24 ] ),
			bevelEnabled: tier >= 2, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: byTier( tier, [ 1, 1, 2, 4 ] ),
		} );
		hullG.rotateX( - Math.PI / 2 );
		hullG.translate( 0, - depth / 2, 0 );
		if ( tier === 1 ) hullG = faceted( hullG );

	}

	const hullM = mesh( hullG, { part: P, color: hull } );
	hullM.position.y = 0.2;
	root.add( hullM );

	const deck = box( tier, [ len * 0.8, 0.08, beam * 0.8 ], { part: P, color: '#b88a5a' } );
	deck.position.set( - 0.2, 0.72, 0 );
	root.add( deck );

	const mastH = 6.5;
	const mast = cylinder( tier, 0.09, mastH, { part: P, color: '#6d4a2d' } );
	mast.position.set( 0.6, 0.7 + mastH / 2, 0 );
	root.add( mast );

	if ( tier >= 1 ) {

		const boom = cylinder( tier, 0.06, 3, { part: P, color: '#6d4a2d' } );
		boom.rotation.z = Math.PI / 2;
		boom.position.set( - 0.9, 1.6, 0 );
		root.add( boom );

		const s = new THREE.Shape();
		s.moveTo( 0, 0 ); s.lineTo( - 2.8, 0 ); s.lineTo( 0, mastH - 1.4 );
		const sailG = new THREE.ExtrudeGeometry( s, { depth: 0.04, bevelEnabled: false } );
		sailG.translate( 0.5, 1.72, - 0.02 );
		root.add( mesh( sailG, { part: P, color: sail, roughness: 0.9 } ) );

		// Rigging: straight stays at T1/T2, sagging rope tubes and more lines at T3.
		const top = new THREE.Vector3( 0.6, 0.7 + mastH - 0.1, 0 );
		const anchors = [ [ len / 2 - 0.2, 0.8, 0 ], [ - len / 2 + 0.2, 0.8, 0 ], [ 0.6, 0.8, beam / 2 - 0.1 ], [ 0.6, 0.8, - beam / 2 + 0.1 ] ].slice( 0, byTier( tier, [ 0, 2, 4, 4 ] ) );
		const ropes = anchors.map( ( a ) => {

			const end = new THREE.Vector3( ...a );
			const mid = top.clone().lerp( end, 0.5 ).add( new THREE.Vector3( 0, tier === 3 ? - 0.25 : 0, 0 ) );
			const curve = new THREE.QuadraticBezierCurve3( top, mid, end );
			return new THREE.TubeGeometry( curve, byTier( tier, [ 1, 2, 6, 24 ] ), 0.018, byTier( tier, [ 3, 3, 5, 8 ] ) );

		} );
		if ( tier >= 3 ) for ( let i = 0; i < 6; i ++ ) ropes.push( new THREE.TubeGeometry( new THREE.LineCurve3( new THREE.Vector3( - 2.2 + i * 0.5, 0.8, beam / 2 - 0.1 ), new THREE.Vector3( - 2.2 + i * 0.5, 1.5, beam / 2 - 0.1 ) ), 2, 0.01, 5 ) );
		root.add( mesh( merge( ropes ), { part: P, color: '#d8c7a3', castShadow: tier >= 2 } ) );

	}

	if ( tier >= 3 ) {

		const planks = [];
		for ( let i = 0; i < 4; i ++ ) planks.push( place( new THREE.BoxGeometry( len * 0.82, 0.04, 0.03 ), { p: [ 0, - 0.05 + i * 0.22, beam / 2 + 0.07 ] } ), place( new THREE.BoxGeometry( len * 0.82, 0.04, 0.03 ), { p: [ 0, - 0.05 + i * 0.22, - beam / 2 - 0.07 ] } ) );
		root.add( mesh( merge( planks ), { part: P, color: '#7a2a22' } ) );

	}

	root.userData.animate = ( t ) => {

		const s = t + seed;
		root.position.y = Math.sin( s * 0.9 ) * 0.08 - 0.05;
		root.rotation.x = Math.sin( s * 0.7 ) * 0.03;
		root.rotation.z = Math.sin( s * 0.5 ) * 0.02;

	};

	return root;

}

export function barrel( tier, { color = '#8d5a33' } = {} ) {

	const root = group( 'barrel' );
	const seg = byTier( tier, [ 8, 10, 28, 48 ] );
	let g = tier >= 2 ? new THREE.LatheGeometry( Array.from( { length: 9 }, ( _, i ) => new THREE.Vector2( 0.36 + Math.sin( i / 8 * Math.PI ) * 0.06 - ( i === 0 || i === 8 ? 0.36 : 0 ), i / 8 * 1.0 ) ), seg ) : new THREE.CylinderGeometry( 0.38, 0.38, 1, seg );
	if ( tier < 2 ) g.translate( 0, 0.5, 0 );
	if ( tier === 1 ) g = faceted( g );
	root.add( mesh( g, { part: P, color } ) );

	if ( tier >= 1 ) {

		const hoops = [ 0.15, 0.85 ].concat( tier >= 3 ? [ 0.5 ] : [] ).map( ( y ) => place( new THREE.TorusGeometry( tier >= 2 ? 0.405 + ( y === 0.5 ? 0.02 : 0 ) : 0.39, 0.025, 6, seg ), { p: [ 0, y, 0 ], r: [ Math.PI / 2, 0, 0 ] } ) );
		root.add( mesh( merge( hoops ), { part: P, color: '#3d3d3d' } ) );

	}

	return root;

}

export function crate( tier, { color = '#b0844f', size = 0.9 } = {} ) {

	const root = group( 'crate' );
	const body = box( tier, [ size, size, size ], { part: P, color } );
	body.position.y = size / 2;
	root.add( body );

	if ( tier >= 2 ) {

		const t = 0.07, frame = [];
		for ( const x of [ - 1, 1 ] ) for ( const z of [ - 1, 1 ] ) frame.push( place( new THREE.BoxGeometry( t, size + 0.02, t ), { p: [ x * size / 2, size / 2, z * size / 2 ] } ) );
		for ( const y of [ 0, size ] ) for ( const z of [ - 1, 1 ] ) frame.push( place( new THREE.BoxGeometry( size + 0.02, t, t ), { p: [ 0, y, z * size / 2 ] } ) );
		if ( tier >= 3 ) for ( const z of [ - 1, 1 ] ) frame.push( place( new THREE.BoxGeometry( size * 1.35, t * 0.8, t * 0.5 ), { p: [ 0, size / 2, z * ( size / 2 + 0.01 ) ], r: [ 0, 0, Math.PI / 4 ] } ) );
		root.add( mesh( merge( frame ), { part: P, color: '#7a5530' } ) );

	}

	return root;

}

export function lantern( tier ) {

	const root = group( 'lantern' );
	const glow = byTier( tier, [ new THREE.BoxGeometry( 0.22, 0.3, 0.22 ), new THREE.OctahedronGeometry( 0.17 ), new THREE.SphereGeometry( 0.15, 20, 14 ), new THREE.SphereGeometry( 0.15, 32, 24 ) ] );
	const m = mesh( glow, { part: 'vfx', color: '#ffe3a0', emissive: '#ffb84d', emissiveIntensity: 3, castShadow: false } );
	m.position.y = 0.2;
	root.add( m );

	if ( tier >= 2 ) {

		const cage = [ place( new THREE.CylinderGeometry( 0.12, 0.18, 0.08, 16 ), { p: [ 0, 0.4, 0 ] } ), place( new THREE.CylinderGeometry( 0.16, 0.16, 0.05, 16 ), { p: [ 0, 0.02, 0 ] } ) ];
		root.add( mesh( merge( cage ), { part: P, color: '#2e2e2e' } ) );

	}

	return root;

}
