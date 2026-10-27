// Canonical lookdev shapes, rocks and reference charts, by tier.
// T0 raw primitives · T1 intentional facets · T2 bevels and smooth normals · T3 subdivision and displacement.

import { THREE, byTier, faceted, displace, mesh, merge, place } from './core.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const finish = ( g, tier ) => tier === 1 ? faceted( g ) : g;

export function sphere( tier, r, o ) {

	const [ w, h ] = byTier( tier, [ [ 10, 7 ], [ 12, 8 ], [ 40, 28 ], [ 96, 64 ] ] );
	return mesh( finish( new THREE.SphereGeometry( r, w, h ), tier ), o );

}

export function box( tier, size, o, { bevel = 0.08 } = {} ) {

	const [ x, y, z ] = size;
	const g = tier >= 2
		? new RoundedBoxGeometry( x, y, z, tier === 2 ? 3 : 6, Math.min( x, y, z ) * bevel )
		: new THREE.BoxGeometry( x, y, z );
	return mesh( g, o );

}

export function beveledBox( tier, s, o ) {

	const g = tier === 0
		? new THREE.BoxGeometry( s, s, s )
		: new RoundedBoxGeometry( s, s, s, byTier( tier, [ 1, 1, 4, 10 ] ), s * 0.14 );
	return mesh( finish( g, tier ), o );

}

export function cylinder( tier, r, h, o, { top = r } = {} ) {

	const g = new THREE.CylinderGeometry( top, r, h, byTier( tier, [ 8, 10, 40, 96 ] ), byTier( tier, [ 1, 1, 2, 8 ] ) );
	return mesh( finish( g, tier ), o );

}

export function torusKnot( tier, r, tube, o ) {

	const [ t, rad ] = byTier( tier, [ [ 48, 6 ], [ 64, 6 ], [ 180, 20 ], [ 420, 48 ] ] );
	return mesh( finish( new THREE.TorusKnotGeometry( r, tube, t, rad ), tier ), o );

}

export function rock( tier, r, rng, o ) {

	const g = new THREE.IcosahedronGeometry( r, byTier( tier, [ 0, 1, 3, 5 ] ) );
	const seed = Math.floor( rng() * 1000 );
	if ( tier >= 1 ) displace( g, { amount: r * byTier( tier, [ 0, 0.28, 0.25, 0.3 ] ), scale: 1.6 / r, seed, octaves: tier === 3 ? 5 : 3 } );
	g.scale( 1, 0.72, 1 );
	g.computeVertexNormals();
	return mesh( tier === 1 ? faceted( g ) : g, { part: 'props', color: '#8d8b84', ...o } );

}

// A 24-patch color checker (approximate sRGB values of the classic chart).
const CHART = [
	'#735244', '#c29682', '#627a9d', '#576c43', '#8580b1', '#67bdaa',
	'#d67e2c', '#505ba6', '#c15a63', '#5e3c6c', '#9dbc40', '#e0a32e',
	'#383d96', '#469449', '#af363c', '#e7c71f', '#bb5695', '#0885a1',
	'#f3f3f2', '#c8c8c8', '#a0a0a0', '#7a7a79', '#555555', '#343434',
];

/** Color chart and an 18% gray card on a board. */
export function colorChart( tier ) {

	const g = new THREE.Group();
	g.name = 'color chart';
	const board = box( tier, [ 2.1, 1.45, 0.06 ], { part: 'props', color: '#1f1f1f' } );
	board.position.y = 0.72;
	g.add( board );

	const patch = 0.3, gap = 0.04;

	CHART.forEach( ( color, i ) => {

		const col = i % 6, row = Math.floor( i / 6 );
		const p = new THREE.BoxGeometry( patch, patch, 0.02 );
		const m = mesh( p, { part: 'props', color, castShadow: false } );
		m.position.set( ( col - 2.5 ) * ( patch + gap ), 1.24 - row * ( patch + gap ), 0.04 );
		g.add( m );

	} );

	return g;

}

export function grayCard( tier ) {

	const legs = [ - 0.25, 0.25 ].map( ( x ) => place( new THREE.CylinderGeometry( 0.02, 0.02, 0.6, 6 ), { p: [ x, 0.3, 0 ] } ) );
	const g = new THREE.Group();
	g.name = 'gray card';
	const card = box( tier, [ 0.7, 0.9, 0.03 ], { part: 'props', color: '#767676' } ); // ≈18% reflectance
	card.position.y = 1.05;
	g.add( card, mesh( merge( legs ), { part: 'props', color: '#2a2a2a' } ) );
	return g;

}
