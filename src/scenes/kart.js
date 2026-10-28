// Kart Circuit (design §6.1), inspired by Mario Kart and OutRun: a stadium-shaped track
// with curbs and markings, repeated props, crowd stands and karts racing in a loop.

import { THREE, createRng, count, at, group, mesh, place, merge, byTier, tree, stands, trafficCone, tireStack, kart } from './kit/index.js';

const STRAIGHT = 40, RADIUS = 13, WIDTH = 8;
const LOOP = 2 * STRAIGHT + 2 * Math.PI * RADIUS;

/** Point and heading on the track centerline at distance s (meters). Straights along x; heading 0 = +z. */
function track( s ) {

	let d = ( ( s % LOOP ) + LOOP ) % LOOP;
	const half = STRAIGHT / 2;
	if ( d < STRAIGHT ) return { x: - half + d, z: RADIUS, heading: Math.PI / 2 };
	d -= STRAIGHT;
	if ( d < Math.PI * RADIUS ) { const a = d / RADIUS; return { x: half + Math.sin( a ) * RADIUS, z: Math.cos( a ) * RADIUS, heading: Math.PI / 2 + a }; }
	d -= Math.PI * RADIUS;
	if ( d < STRAIGHT ) return { x: half - d, z: - RADIUS, heading: - Math.PI / 2 };
	d -= STRAIGHT;
	const a = d / RADIUS;
	return { x: - half - Math.sin( a ) * RADIUS, z: - Math.cos( a ) * RADIUS, heading: - Math.PI / 2 + a };

}

/** A ribbon along the track at lateral offsets [a, b] from the centerline. */
function ribbon( tier, a, b, { y = 0.01, steps } ) {

	const n = steps ?? byTier( tier, [ 24, 40, 120, 240 ] );
	const pos = [], idx = [];
	for ( let i = 0; i <= n; i ++ ) {

		const p = track( i / n * LOOP );
		const nx = Math.cos( p.heading ), nz = - Math.sin( p.heading ); // right-hand normal
		pos.push( p.x + nx * a, y, p.z + nz * a, p.x + nx * b, y, p.z + nz * b );
		if ( i < n ) idx.push( i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2 );

	}

	const g = new THREE.BufferGeometry();
	g.setAttribute( 'position', new THREE.Float32BufferAttribute( pos, 3 ) );
	g.setIndex( idx );
	g.computeVertexNormals();
	// Make sure the ribbon faces up whichever way the offsets are ordered.
	if ( g.getAttribute( 'normal' ).getY( 0 ) < 0 ) { g.setIndex( idx.map( ( _, k ) => idx[ k - ( k % 3 ) + [ 0, 2, 1 ][ k % 3 ] ] ) ); g.computeVertexNormals(); }
	return g;

}

export default {
	id: 'kart',
	name: 'Kart Circuit',
	inspiredBy: [ 'Mario Kart', 'OutRun' ],
	genre: 'racing',
	notes: 'Speed and repetition: karts in motion, repeated cones, tires and curbs, crowds in the stands. Watch temporal stability of lines and bands as karts move, and whether track markings stay crisp at a distance.',
	shots: {
		hero: { label: 'Chase (start straight)', pos: [ - 26, 3.4, 13 ], target: [ - 10, 1.2, 13 ], fov: 60 },
		gameplay: { label: 'Gameplay (chase, high)', pos: [ - 30, 6, 13 ], target: [ - 12, 1, 12 ], fov: 65 },
		wide: { label: 'Wide', pos: [ 0, 48, 58 ], target: [ 0, 0, 0 ], fov: 45 },
		close: { label: 'Close-up (grid)', pos: [ - 14, 1.6, 17 ], target: [ - 17, 0.8, 13 ], fov: 40 },
	},
	defaultShot: 'hero',
	focus: [ - 16, 0.8, 13 ],
	shadow: { center: [ 0, 0, 0 ], radius: 36 },
	far: 600,
	params: {
		'lighting.key.elevation': 52, 'lighting.key.azimuth': 60, 'lighting.key.color': '#fff8ea', 'lighting.key.intensity': 3,
		'lighting.ambient.sky': '#bfe3ff', 'lighting.ambient.ground': '#7a9a5a', 'lighting.ambient.intensity': 0.75,
		'atmosphere.sky.zenith': '#3d8ef0', 'atmosphere.sky.horizon': '#d8efff', 'atmosphere.sky.ground': '#d8efff',
		'atmosphere.fog.color': '#d8efff',
	},

	build( { tier = 0, seed = 55, density = 1 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'kart circuit' );

		root.add( mesh( new THREE.PlaneGeometry( 160, 120 ).rotateX( - Math.PI / 2 ), { part: 'terrain', color: '#6fbf4a', castShadow: false } ) );
		root.add( mesh( ribbon( tier, - WIDTH / 2, WIDTH / 2, { y: 0.02 } ), { part: 'terrain', color: '#4a4d55', castShadow: false } ) );

		if ( tier >= 1 ) {

			// Red/white curbs: alternating segments on both edges.
			const n = byTier( tier, [ 0, 40, 80, 160 ] );
			const red = [], white = [];
			for ( let i = 0; i < n; i ++ ) {

				for ( const side of [ - 1, 1 ] ) {

					const p = track( ( i + 0.5 ) / n * LOOP );
					const nx = Math.cos( p.heading ), nz = - Math.sin( p.heading );
					const seg = place( new THREE.BoxGeometry( 0.7, 0.12, LOOP / n * 0.98 ), { p: [ p.x + nx * side * ( WIDTH / 2 + 0.35 ), 0.06, p.z + nz * side * ( WIDTH / 2 + 0.35 ) ], r: [ 0, p.heading, 0 ] } );
					( i % 2 ? red : white ).push( seg );

				}

			}

			root.add( mesh( merge( red ), { part: 'props', color: '#e74c3c', castShadow: false } ), mesh( merge( white ), { part: 'props', color: '#f4f4f4', castShadow: false } ) );

		}

		if ( tier >= 2 ) {

			// Dashed center line and a checkered start line.
			const dashes = [];
			const n = 60;
			for ( let i = 0; i < n; i += 2 ) {

				const p = track( ( i + 0.5 ) / n * LOOP );
				dashes.push( place( new THREE.BoxGeometry( 0.25, 0.01, LOOP / n * 0.6 ), { p: [ p.x, 0.035, p.z ], r: [ 0, p.heading, 0 ] } ) );

			}

			root.add( mesh( merge( dashes ), { part: 'props', color: '#f4f4f4', castShadow: false } ) );
			const checks = { '#111111': [], '#f4f4f4': [] };
			for ( let i = 0; i < 8; i ++ ) for ( let k = 0; k < 2; k ++ ) checks[ ( i + k ) % 2 ? '#111111' : '#f4f4f4' ].push( place( new THREE.BoxGeometry( 0.5, 0.012, WIDTH / 8 ), { p: [ - 14 + k * 0.5, 0.04, RADIUS - WIDTH / 2 + ( i + 0.5 ) * WIDTH / 8 ] } ) );
			for ( const [ c, g ] of Object.entries( checks ) ) root.add( mesh( merge( g ), { part: 'props', color: c, castShadow: false } ) );

		}

		// Start gate over the straight.
		const gate = group( 'start gate' );
		gate.add( mesh( merge( [ place( new THREE.BoxGeometry( 0.5, 6, 0.5 ), { p: [ 0, 3, RADIUS - WIDTH / 2 - 1 ] } ), place( new THREE.BoxGeometry( 0.5, 6, 0.5 ), { p: [ 0, 3, RADIUS + WIDTH / 2 + 1 ] } ) ] ), { part: 'architecture', color: '#d9dde3' } ) );
		gate.add( mesh( place( new THREE.BoxGeometry( 0.6, 1.4, WIDTH + 3 ), { p: [ 0, 6.2, RADIUS ] } ), { part: 'props', color: '#e74c3c' } ) );
		gate.position.x = - 13.8;
		root.add( gate );

		const sRng = rng.fork();
		root.add( at( stands( tier, sRng.fork(), 26, { rows: 4 } ), [ - 13, 0, RADIUS + WIDTH / 2 + 5 ], [ 0, Math.PI, 0 ] ) );
		root.add( at( stands( tier, sRng.fork(), 20, { rows: 3 } ), [ 10, 0, - RADIUS - WIDTH / 2 - 5 ] ) );

		// Cones and tire stacks on the outside of both turns.
		const propRng = rng.fork();
		for ( let i = 0; i < count( 8, density ); i ++ ) {

			const a = i / count( 8, density ) * Math.PI;
			for ( const side of [ 1, - 1 ] ) {

				const x = side * ( STRAIGHT / 2 + Math.sin( a ) * ( RADIUS + WIDTH / 2 + 1.5 ) ), z = Math.cos( a ) * ( RADIUS + WIDTH / 2 + 1.5 );
				root.add( at( i % 2 ? tireStack( tier ) : trafficCone( tier ), [ x, 0, z ], [ 0, propRng() * 3, 0 ] ) );

			}

		}

		const treeRng = rng.fork();
		for ( let i = 0; i < count( 10, density ); i ++ ) {

			const x = treeRng.range( - 60, 60 ), z = treeRng.pick( [ - 1, 1 ] ) * treeRng.range( 30, 50 );
			root.add( at( tree( tier, treeRng.fork(), { height: treeRng.range( 4, 7 ) } ), [ x, 0, z ] ) );

		}

		// Karts race around the loop at slightly different speeds; the hero leads.
		const colors = [ [ '#e74c3c', '#3498db' ], [ '#2ecc71', '#f1c40f' ], [ '#9b59b6', '#ecf0f1' ], [ '#f39c12', '#2c3e50' ] ];
		colors.forEach( ( [ body, driver ], i ) => {

			const k = kart( tier, { color: body, driver, part: i === 0 ? 'hero' : 'props', driverPart: i === 0 ? 'hero' : 'characters', seed: i } );
			const lane = ( i % 2 ? - 1.6 : 1.6 );
			const start = - i * 4.5 + 6, speed = 14 - i * 0.8;
			k.userData.animate = ( t ) => {

				const p = track( start + t * speed );
				k.position.set( p.x + Math.cos( p.heading ) * lane, 0, p.z - Math.sin( p.heading ) * lane );
				k.rotation.y = p.heading;
				for ( const w of k.userData.wheels ) w.rotation.x = t * speed / 0.3;

			};

			root.add( k );

		} );

		return { root };

	},
};
