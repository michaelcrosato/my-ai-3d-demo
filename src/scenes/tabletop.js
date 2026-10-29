// Tabletop Map (design §6.1, P2), inspired by Civilization, Townscaper and Bad North: a hex
// board of terrain tiles on a wooden table, seen from a tilted top-down camera, with
// forests, mountains, villages, a castle, two small armies, a boat and dice. It stress-tests
// the miniature look (tilt-shift wants this high angle), readability of many small tiles by
// color and value, repeated geometry, and a textured table (the planks).

import { THREE, createRng, count, byTier, fbm, at, group, mesh, place, merge, faceted, tileUv, character, house, pine, boat, beveledBox, sphere } from './kit/index.js';

const R = 0.9; // hex circumradius (flat-top hexes)
const RINGS = 6;

/** Axial hex coordinates within `rings` of the center. */
function hexes( rings ) {

	const out = [];
	for ( let q = - rings; q <= rings; q ++ ) for ( let r = Math.max( - rings, - q - rings ); r <= Math.min( rings, - q + rings ); r ++ ) out.push( [ q, r ] );
	return out;

}

const center = ( q, r ) => [ 1.5 * q * R, Math.sqrt( 3 ) * ( r + q / 2 ) * R ];

// Board tiles are painted pieces, not water: the sea tiles are terrain too (a toon-water
// look would foam a 12 cm deep "sea" white).
const TERRAIN = {
	water: { h: 0.12, color: '#3f8fbf', part: 'terrain' },
	sand: { h: 0.22, color: '#e3cf8f', part: 'terrain' },
	grass: { h: 0.3, color: '#8fbf5a', part: 'terrain' },
	forest: { h: 0.32, color: '#6aa04a', part: 'terrain' },
	hill: { h: 0.5, color: '#a6ad6a', part: 'terrain' },
	mountain: { h: 0.62, color: '#8d8a84', part: 'terrain' },
};

/** Share of the board for each terrain, low to high: assigned by rank, so every seed gives a full map. */
const SHARES = [ [ 'water', 0.3 ], [ 'sand', 0.09 ], [ 'grass', 0.25 ], [ 'forest', 0.16 ], [ 'hill', 0.11 ], [ 'mountain', 0.09 ] ];

/** Terrain per hex: an island-shaped height (noise minus distance from the center), ranked into the shares. */
function classify( cells, seed ) {

	const height = cells.map( ( [ q, r ] ) => {

		const [ x, z ] = center( q, r );
		const d = Math.hypot( x, z ) / ( RINGS * 1.5 * R );
		return fbm( x * 0.22, 0, z * 0.22, seed, 3 ) - d * 0.45;

	} );
	const order = cells.map( ( _, i ) => i ).sort( ( a, b ) => height[ a ] - height[ b ] || a - b );
	const kinds = new Array( cells.length );
	let k = 0, acc = SHARES[ 0 ][ 1 ];
	order.forEach( ( i, rank ) => {

		while ( rank >= acc * cells.length && k < SHARES.length - 1 ) acc += SHARES[ ++ k ][ 1 ];
		kinds[ i ] = SHARES[ k ][ 0 ];

	} );
	return kinds;

}

/** One hex prism standing on y = 0. T2 on chamfers the top edge; T3 adds height segments. */
function hexGeometry( tier, h ) {

	const r = tier === 0 ? R : R * 0.96;
	const g = new THREE.CylinderGeometry( tier >= 2 ? r * 0.93 : r, r, h, 6, byTier( tier, [ 1, 1, 2, 4 ] ) );
	g.rotateY( Math.PI / 6 );
	g.translate( 0, h / 2, 0 );
	return g;

}

/** A tiny army: soldiers in a block, with a banner. */
function army( tier, rng, { color, n = 4 } ) {

	const root = group( 'army' );
	for ( let i = 0; i < n; i ++ ) {

		const s = character( tier, { part: 'characters', shirt: color, pants: '#3b3f46', hat: tier >= 2 ? color : null, seed: rng() * 10 } );
		root.add( at( s, [ ( i % 2 - 0.5 ) * 0.32, 0, ( Math.floor( i / 2 ) - 0.5 ) * 0.32 ], [ 0, rng.range( - 0.3, 0.3 ), 0 ], 0.26 ) );

	}

	const pole = mesh( new THREE.CylinderGeometry( 0.012, 0.012, 0.8, byTier( tier, [ 4, 4, 8, 12 ] ) ), { part: 'props', color: '#4a3a2a' } );
	pole.position.set( 0.3, 0.4, 0 );
	const flag = mesh( new THREE.PlaneGeometry( 0.28, 0.18, byTier( tier, [ 1, 1, 4, 8 ] ), 1 ), { part: 'props', color, doubleSided: true } );
	flag.position.set( 0.44, 0.7, 0 );
	flag.userData.animate = ( t ) => { flag.rotation.y = Math.sin( t * 2.3 + color.length ) * 0.25; };
	root.add( pole, flag );
	return root;

}

/** A castle: a keep and four towers in stone, with a roof color. */
function castle( tier, { stone = '#b9b2a6', roof = '#3d6fd6' } = {} ) {

	const root = group( 'castle' );
	const seg = byTier( tier, [ 6, 8, 16, 24 ] );
	const walls = [ place( new THREE.BoxGeometry( 0.9, 0.35, 0.9 ), { p: [ 0, 0.175, 0 ] } ), place( new THREE.BoxGeometry( 0.42, 0.65, 0.42 ), { p: [ 0, 0.32, 0 ] } ) ];
	const roofs = [ place( new THREE.ConeGeometry( 0.33, 0.35, 4 ), { p: [ 0, 0.82, 0 ], r: [ 0, Math.PI / 4, 0 ] } ) ];
	for ( const [ x, z ] of [ [ - 0.45, - 0.45 ], [ 0.45, - 0.45 ], [ - 0.45, 0.45 ], [ 0.45, 0.45 ] ] ) {

		walls.push( place( new THREE.CylinderGeometry( 0.12, 0.13, 0.55, seg ), { p: [ x, 0.275, z ] } ) );
		roofs.push( place( new THREE.ConeGeometry( 0.15, 0.25, seg ), { p: [ x, 0.67, z ] } ) );

	}

	if ( tier >= 2 ) for ( let i = 0; i < 12; i ++ ) walls.push( place( new THREE.BoxGeometry( 0.07, 0.07, 0.07 ), { p: [ - 0.4 + ( i % 6 ) * 0.16, 0.38, i < 6 ? 0.45 : - 0.45 ] } ) );
	root.add( mesh( tier === 1 ? faceted( merge( walls ) ) : merge( walls ), { part: 'architecture', color: stone } ) );
	root.add( mesh( merge( roofs ), { part: 'architecture', color: roof } ) );
	return root;

}

/** A die with pips on its faces (T1+). */
function die( tier, { color = '#f4f1ea', pip = '#20232b' } = {} ) {

	const root = group( 'die' );
	const body = beveledBox( tier, 0.5, { part: 'props', color, roughness: 0.4 } );
	body.position.y = 0.25;
	root.add( body );
	if ( tier >= 1 ) {

		const pips = [];
		const seg = byTier( tier, [ 6, 6, 10, 14 ] );
		const add = ( p ) => pips.push( place( new THREE.SphereGeometry( 0.045, seg, Math.ceil( seg / 2 ) ), { p } ) );
		add( [ 0, 0.5, 0 ] ); // 1 on top
		for ( const [ a, b ] of [ [ - 0.12, - 0.12 ], [ 0, 0 ], [ 0.12, 0.12 ] ] ) add( [ a, 0.25 + b, 0.25 ] ); // 3 in front
		for ( const [ a, b ] of [ [ - 0.12, - 0.12 ], [ 0.12, 0.12 ] ] ) add( [ 0.25, 0.25 + b, a ] ); // 2 on the side
		root.add( mesh( merge( pips ), { part: 'props', color: pip } ) );

	}

	return root;

}

export default {
	id: 'tabletop',
	name: 'Tabletop Map',
	inspiredBy: [ 'Civilization', 'Townscaper', 'Bad North' ],
	genre: 'strategy board',
	notes: 'A board seen from above: every tile must read by color and value at a glance, and the units must pop from the terrain. The miniature look (tilt-shift) needs exactly this high angle. The table is textured: try the retro texture filters on the planks.',
	shots: {
		hero: { label: 'Tilted top-down', pos: [ 0, 15.5, 12.5 ], target: [ 0, 0, 0.6 ], fov: 36 },
		gameplay: { label: 'Gameplay (closer tilt)', pos: [ 4.5, 8.5, 9 ], target: [ 1.2, 0, 0.8 ], fov: 40 },
		wide: { label: 'Wide (the whole table)', pos: [ 0, 22, 17 ], target: [ 0, 0, 0 ], fov: 42 },
		close: { label: 'Close-up (the armies)', pos: [ 3.6, 2.4, 4.6 ], target: [ 1.4, 0.4, 1.4 ], fov: 34 },
	},
	defaultShot: 'hero',
	focus: [ 0, 0.4, 0.6 ],
	shadow: { center: [ 0, 0, 0 ], radius: 13 },
	far: 300,
	fogFocus: 0.5, // fog starts halfway to the board's center, so fog looks band its far rows
	params: {
		'lighting.key.elevation': 52, 'lighting.key.azimuth': 140, 'lighting.key.color': '#fff0d8', 'lighting.key.intensity': 3,
		'lighting.ambient.sky': '#cfd9ee', 'lighting.ambient.ground': '#6b5440', 'lighting.ambient.intensity': 0.75,
		'atmosphere.sky.zenith': '#2b2320', 'atmosphere.sky.horizon': '#5a4636', 'atmosphere.sky.ground': '#2b2320',
		'atmosphere.fog.color': '#5a4636',
	},

	build( { tier = 0, seed = 12, density = 1 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'tabletop' );

		// The table: dark planks under everything.
		const tableG = new THREE.BoxGeometry( 30, 0.6, 24, byTier( tier, [ 1, 2, 4, 8 ] ), 1, byTier( tier, [ 1, 2, 4, 8 ] ) );
		tileUv( tableG, 30 / 2.5, 24 / 2.5 );
		root.add( at( mesh( tableG, { part: 'terrain', color: '#8a5a3a', map: 'planks', roughness: 0.55 } ), [ 0, - 0.3, 0 ] ) );

		// The board: hex prisms merged by terrain type (one draw per type).
		const tiles = new Map();
		const kinds = new Map();
		const cells = hexes( RINGS );
		const assigned = classify( cells, 5 );
		for ( const [ i, [ q, r ] ] of cells.entries() ) {

			const kind = assigned[ i ];
			kinds.set( `${q},${r}`, kind );
			const [ x, z ] = center( q, r );
			const g = hexGeometry( tier, TERRAIN[ kind ].h );
			g.translate( x, 0, z );
			if ( ! tiles.has( kind ) ) tiles.set( kind, [] );
			tiles.get( kind ).push( g );

		}

		for ( const [ kind, list ] of tiles ) {

			const t = TERRAIN[ kind ];
			const g = merge( list );
			root.add( mesh( tier === 1 ? faceted( g ) : g, { part: t.part, color: t.color, roughness: kind === 'water' ? 0.3 : 0.85 } ) );

		}

		const where = ( kind ) => [ ...kinds ].filter( ( [ , k ] ) => k === kind ).map( ( [ key ] ) => key.split( ',' ).map( Number ) );
		const top = ( q, r ) => TERRAIN[ kinds.get( `${q},${r}` ) ].h;

		// Mountains: a peak per tile, snow caps from T2.
		const peaks = [], caps = [];
		for ( const [ q, r ] of where( 'mountain' ) ) {

			const [ x, z ] = center( q, r );
			const hgt = 0.7 + rng() * 0.4;
			peaks.push( place( new THREE.ConeGeometry( 0.62, hgt, byTier( tier, [ 5, 6, 10, 16 ] ), byTier( tier, [ 1, 1, 2, 4 ] ) ), { p: [ x, top( q, r ) + hgt / 2, z ], r: [ 0, rng() * Math.PI, 0 ] } ) );
			if ( tier >= 2 ) caps.push( place( new THREE.ConeGeometry( 0.26, hgt * 0.42, byTier( tier, [ 5, 6, 10, 16 ] ) ), { p: [ x, top( q, r ) + hgt * 0.79, z ] } ) );

		}

		if ( peaks.length ) root.add( mesh( tier === 1 ? faceted( merge( peaks ) ) : merge( peaks ), { part: 'terrain', color: '#7d7a74' } ) );
		if ( caps.length ) root.add( mesh( merge( caps ), { part: 'terrain', color: '#f1f3f5' } ) );

		// Forests: small pines, more per tile at higher tiers and densities.
		for ( const [ q, r ] of where( 'forest' ) ) {

			const [ x, z ] = center( q, r );
			const n = count( byTier( tier, [ 1, 2, 3, 4 ] ), density );
			for ( let i = 0; i < n; i ++ ) {

				const a = rng() * Math.PI * 2, d = n === 1 ? 0 : rng.range( 0.2, 0.55 );
				root.add( at( pine( tier, rng.fork(), { height: rng.range( 0.7, 1 ), color: '#2f5d3a' } ), [ x + Math.cos( a ) * d, top( q, r ), z + Math.sin( a ) * d ] ) );

			}

		}

		// Villages on some grass tiles; the castle on a hill.
		const grass = where( 'grass' );
		const roofs = [ '#c0392b', '#d98e2b', '#3d6fd6', '#7a4a8a' ];
		for ( let i = 0; i < Math.min( grass.length, count( 5, density ) ); i ++ ) {

			const [ q, r ] = grass[ Math.floor( rng() * grass.length ) ];
			const [ x, z ] = center( q, r );
			root.add( at( house( tier, { wall: '#f2e6d0', roof: roofs[ i % 4 ], trim: '#ffffff', door: '#6d4c41' }, { w: 2.4, d: 2, h: 1.8 } ), [ x, top( q, r ), z ], [ 0, rng() * Math.PI, 0 ], 0.24 ) );

		}

		const hills = where( 'hill' );
		const keep = hills.length ? hills[ Math.floor( hills.length / 2 ) ] : [ 0, 0 ];
		const [ kx, kz ] = center( ...keep );
		root.add( at( castle( tier ), [ kx, top( ...keep ), kz ], [ 0, 0.3, 0 ] ) );

		// Two armies facing off near the castle, and a boat on the water.
		const near = ( [ q, r ], dq, dr ) => { const key = `${q + dq},${r + dr}`; return kinds.has( key ) && kinds.get( key ) !== 'water' && kinds.get( key ) !== 'mountain' ? [ q + dq, r + dr ] : [ q, r ]; };
		for ( const [ dq, dr, color ] of [ [ 2, 0, '#c0392b' ], [ - 1, 2, '#2e6fd6' ] ] ) {

			const [ q, r ] = near( keep, dq, dr );
			const [ x, z ] = center( q, r );
			root.add( at( army( tier, rng.fork(), { color, n: count( 4, density ) } ), [ x, top( q, r ), z ], [ 0, rng() * Math.PI, 0 ] ) );

		}

		const water = where( 'water' );
		if ( water.length ) {

			const [ q, r ] = water[ Math.floor( water.length * 0.3 ) ];
			const [ x, z ] = center( q, r );
			const b = at( boat( tier, { hull: '#8b5a2b' } ), [ x, top( q, r ), z ], [ 0, 0.6, 0 ], 0.11 );
			b.userData.animate = ( t ) => { b.position.y = top( q, r ) + Math.sin( t * 1.6 ) * 0.01; b.rotation.z = Math.sin( t * 1.1 ) * 0.04; };
			root.add( b );

		}

		// Dice and a stack of tokens on the table, off the board.
		root.add( at( die( tier ), [ 11.2, 0, 4.5 ], [ 0, 0.4, 0 ] ), at( die( tier, { color: '#c0392b', pip: '#f4f1ea' } ), [ 12, 0, 5.6 ], [ 0, - 0.2, 0 ] ) );
		const tokens = [];
		for ( let i = 0; i < count( 6, density ); i ++ ) tokens.push( place( new THREE.CylinderGeometry( 0.28, 0.28, 0.08, byTier( tier, [ 10, 12, 24, 40 ] ) ), { p: [ - 11 + ( i % 2 ) * 0.05, 0.04 + i * 0.085, 5 ] } ) );
		root.add( mesh( merge( tokens ), { part: 'props', color: '#d4af37', metalness: 0.6, roughness: 0.35 } ) );
		if ( tier >= 2 ) root.add( at( sphere( tier, 0.22, { part: 'props', color: '#3d6fd6', roughness: 0.2 } ), [ - 10.2, 0.22, 6.2 ] ) );

		return { root };

	},
};
