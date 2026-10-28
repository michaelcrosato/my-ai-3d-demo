// Harbor Isle (design §6.1), inspired by The Wind Waker and Sea of Thieves: an island
// village with a lighthouse and a dock, open sea, a big sky with clouds and distant
// islands for atmospheric perspective, plus thin details (masts, ropes).

import { createRng, count, at, group, hill, hillHeight, ring, sea, cloud, house, lighthouse, dock, tree, rock, boat, barrel, crate, lantern, character } from './kit/index.js';

const BEACH = { radius: 24, height: 1.2, edge: - 0.8, power: 2.5 };
const GRASS = { radius: 16.5, height: 4.2, edge: 0.2, power: 1.3 };

/** Ground height on the island at (x, z), ignoring noise. */
const groundAt = ( x, z ) => {

	const r = Math.hypot( x, z );
	return Math.max( hillHeight( r, BEACH ), r < GRASS.radius ? hillHeight( r, GRASS ) : - Infinity );

};

const on = ( x, z, sink = 0.15 ) => [ x, groundAt( x, z ) - sink, z ];

export default {
	id: 'harbor',
	name: 'Harbor Isle',
	inspiredBy: [ 'The Legend of Zelda: The Wind Waker', 'Sea of Thieves' ],
	genre: 'open-sea adventure',
	notes: 'Watch the distant islands and the masts: toon looks succeed or fail on haze and on thin details. The sea is the largest area of the frame, so its color sets the mood.',
	shots: {
		hero: { label: 'Hero', pos: [ 15.5, 8.5, 38 ], target: [ 1, 2.2, 14 ], fov: 45 },
		gameplay: { label: 'Gameplay (third-person)', pos: [ - 1.5, 5.2, 23.5 ], target: [ - 1.5, 1.8, 11 ], fov: 55 },
		wide: { label: 'Wide', pos: [ 72, 33, 96 ], target: [ 0, 3, 4 ], fov: 45 },
		close: { label: 'Close-up (hero)', pos: [ - 0.6, 1.9, 13.6 ], target: [ - 1.5, 1.5, 16.5 ], fov: 35 },
	},
	defaultShot: 'hero',
	focus: [ - 1.5, 1.5, 16.5 ],
	shadow: { center: [ 2, 0, 12 ], radius: 27 },
	far: 1200,
	params: {
		'lighting.key.elevation': 48, 'lighting.key.azimuth': 50, 'lighting.key.color': '#fff4e2', 'lighting.key.intensity': 3,
		'lighting.ambient.sky': '#bcd8ff', 'lighting.ambient.ground': '#6b6b5a', 'lighting.ambient.intensity': 0.6,
		'atmosphere.sky.zenith': '#4d8fe0', 'atmosphere.sky.horizon': '#cfe6ff', 'atmosphere.sky.ground': '#cfe6ff',
		'atmosphere.fog.color': '#cfe6ff',
	},

	// Look zones (§6.10): the dock is Sea Breeze Toon; the lighthouse hill is dusky; the village is warm.
	zones: [
		{ id: 'dock', label: 'The dock', shape: 'box', center: [ 2, 1.5, 24 ], size: [ 4, 4, 14 ], blend: 3, priority: 1, look: 'sea-breeze' },
		{ id: 'lighthouse', label: 'Lighthouse hill', lookName: 'Dusk', shape: 'sphere', center: [ - 6, 4, - 4 ], radius: 4, blend: 4, priority: 0,
			params: { 'grade.temperature': 0.35, 'grade.exposure': - 0.3, 'lens.vignette.amount': 0.4 } },
		{ id: 'village', label: 'Village', lookName: 'Cozy', shape: 'box', center: [ 6, 3, 5 ], size: [ 12, 8, 16 ], blend: 3, priority: 0,
			params: { 'grade.saturation': 1.2, 'grade.temperature': 0.15 } },
	],

	build( { tier = 0, seed = 11, density = 1 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'harbor' );

		root.add( sea( tier ) );
		root.add( hill( tier, { ...BEACH, color: '#e8d3a0', seed: 3, rough: 0.05 } ) );
		root.add( hill( tier, { ...GRASS, color: '#7cb342', seed: 5, rough: 0.08 } ) );
		root.add( ring( tier, 19.2, 20.6, 0.06, { part: 'water', color: '#f4fbff' } ) );

		// Village.
		root.add( at( lighthouse( tier ), on( - 6, - 4, 0.3 ) ) );
		const houses = [
			[ 5, 6, - 0.5, { wall: '#f3dc8a', roof: '#c0392b', trim: '#ffffff', door: '#6d4c41' } ],
			[ 9.5, 0, - 1.3, { wall: '#cfe0e8', roof: '#2e6fb7', trim: '#ffffff', door: '#5d4037' } ],
			[ 2, 11, 0.1, { wall: '#f2e6d0', roof: '#d35400', trim: '#fff6e8', door: '#4e342e' } ],
		];
		for ( const [ x, z, ry, colors ] of houses ) root.add( at( house( tier, colors ), on( x, z, 0.25 ), [ 0, ry, 0 ] ) );

		const treeRng = rng.fork();
		const treeSpots = [ [ - 2, 4, 3.4 ], [ - 9, 3, 3 ], [ 11, - 6, 3.6 ], [ - 1, - 10, 3.2 ], [ 6, - 9, 2.8 ], [ - 11, 8, 2.6 ], [ 12.5, 5.5, 2.9 ], [ - 6, - 10, 3.1 ], [ 9, - 11, 2.7 ], [ - 13, - 3, 2.9 ], [ 3.5, - 13, 3.3 ], [ - 4, 12, 2.6 ], [ 13, - 1, 3 ], [ - 9, - 7, 3.4 ] ];
		for ( const [ x, z, h ] of treeSpots.slice( 0, Math.min( treeSpots.length, count( 7, density ) ) ) ) {

			root.add( at( tree( tier, treeRng.fork(), { height: h, leaf: treeRng.pick( [ '#5f9e3a', '#6aa84f', '#4f8f3a' ] ) } ), on( x, z, 0.2 ) ) );

		}

		const rockRng = rng.fork();
		for ( const [ x, z, s ] of [ [ - 8, 17, 0.9 ], [ - 12.5, 14.5, 1.3 ], [ 9, 16.8, 0.8 ], [ 14.5, 11.5, 1.1 ], [ - 16, 8, 1.4 ] ] ) root.add( at( rock( tier, s, rockRng.fork(), {} ), on( x, z, s * 0.2 ), [ 0, rockRng() * 6, 0 ] ) );

		// Dock, boat and props.
		const { root: dockRoot, posts } = dock( tier, { length: 14, width: 2.6 } );
		dockRoot.position.set( 2, 0, 17 );
		root.add( dockRoot );
		if ( tier >= 2 ) {

			for ( const [ x, z ] of posts.filter( ( [ , z ] ) => z > 4 ) ) root.add( at( ring( tier, 0.2, 0.42, 0.06, { part: 'water', color: '#f4fbff' } ), [ 2 + x, 0, 17 + z ] ) );

		}

		root.add( at( boat( tier, { seed: 1.3 } ), [ 6.3, 0, 26.5 ], [ 0, - Math.PI / 2, 0 ] ) );
		root.add( at( barrel( tier ), [ 2.7, 1.1, 28.8 ] ) );
		root.add( at( barrel( tier, { color: '#7a4b2a' } ), [ 2.9, 1.1, 27.9 ] ) );
		root.add( at( crate( tier ), [ 1.25, 1.1, 29.4 ], [ 0, 0.3, 0 ] ) );
		root.add( at( crate( tier, { size: 0.7 } ), on( 4.2, 13.5, 0.1 ), [ 0, 0.7, 0 ] ) );
		for ( const [ x, z ] of posts.filter( ( [ , z ] ) => z > 9 ) ) root.add( at( lantern( tier ), [ 2 + x, 1.6, 17 + z ] ) );

		// People.
		root.add( at( character( tier, { part: 'characters', shirt: '#e67e22', pants: '#4a4a5a', hat: '#2e4057', seed: 1 } ), [ 1.4, 1.1, 25.5 ], [ 0, 0.9, 0 ] ) );
		root.add( at( character( tier, { part: 'characters', shirt: '#8e44ad', pants: '#3b4a6b', seed: 2.5 } ), [ 2.7, 1.1, 21 ], [ 0, - 2.4, 0 ] ) );
		root.add( at( character( tier, { part: 'hero', shirt: '#2e8b57', pants: '#6b4f2f', hat: '#c8a44a', seed: 4 } ), on( - 1.5, 16.5, 0.05 ), [ 0, Math.PI, 0 ] ) );

		// Distant islands: atmospheric perspective needs layers of distance.
		for ( const [ x, z, radius, height, color ] of [ [ - 120, - 220, 42, 24, '#6f8f6a' ], [ 165, - 260, 58, 32, '#7d9a86' ], [ - 270, - 70, 36, 15, '#73906e' ], [ 95, - 145, 17, 9, '#7f9f6a' ] ] ) {

			root.add( at( hill( tier, { radius, height, edge: - 2, color, seed: Math.round( x ), rough: 0.12 } ), [ x, 0, z ] ) );

		}

		// Clouds drift slowly and wrap around.
		const cloudRng = rng.fork();
		for ( let i = 0; i < count( 7, density ); i ++ ) {

			const c = cloud( tier, cloudRng.fork(), { size: cloudRng.range( 16, 30 ) } );
			const x0 = cloudRng.range( - 320, 320 ), y = cloudRng.range( 55, 85 ), z = cloudRng.range( - 330, - 90 );
			at( c, [ x0, y, z ] );
			c.userData.animate = ( t ) => { c.position.x = ( ( x0 + t * 1.5 + 360 ) % 720 + 720 ) % 720 - 360; };
			root.add( c );

		}

		return { root };

	},
};
