// Torchlit Dungeon (design §6.1), inspired by Zelda dungeons, Hades and Diablo:
// darkness and value contrast, flickering torches (practical lights), a lava channel
// for emissive and bloom, seen from an isometric camera.

import { THREE, createRng, count, at, group, mesh, place, merge, byTier, wall, pillar, torch, stairs, lava, chest, barrel, crate, knight, character } from './kit/index.js';

export default {
	id: 'dungeon',
	name: 'Torchlit Dungeon',
	inspiredBy: [ 'The Legend of Zelda dungeons', 'Hades', 'Diablo' ],
	genre: 'action RPG',
	notes: 'Value contrast in the dark: torches and lava are the only warm light. Watch whether shadows stay readable (not black), whether bloom stays on the lava, and how the flicker reads on toon bands.',
	shots: {
		hero: { label: 'Isometric', pos: [ 17, 19, 17 ], target: [ 0, 0, 0 ], fov: 30 },
		gameplay: { label: 'Gameplay (isometric, close)', pos: [ 11, 13, 12 ], target: [ - 1, 0, 1 ], fov: 30 },
		wide: { label: 'Wide', pos: [ 24, 28, 26 ], target: [ 0, 0, - 1 ], fov: 34 },
		close: { label: 'Close-up (knight)', pos: [ 0.8, 2.2, 6.2 ], target: [ - 1.5, 1.2, 2.5 ], fov: 38 },
	},
	defaultShot: 'hero',
	focus: [ - 1.5, 1.2, 2.5 ],
	shadow: { center: [ 0, 0, 0 ], radius: 15 },
	far: 300,
	params: {
		'lighting.key.elevation': 62, 'lighting.key.azimuth': 20, 'lighting.key.color': '#a3b3ff', 'lighting.key.intensity': 1.6,
		'lighting.ambient.sky': '#4a5277', 'lighting.ambient.ground': '#2a2226', 'lighting.ambient.intensity': 0.9,
		'atmosphere.sky.zenith': '#07080f', 'atmosphere.sky.horizon': '#151826', 'atmosphere.sky.ground': '#151826',
		'atmosphere.fog.color': '#151826',
	},

	// Look zones (§6.10): walk in and the look shifts. Params zones adjust whatever look is on.
	zones: [
		{ id: 'crypt', label: 'Crypt (the dais)', lookName: 'Darker, colder', shape: 'box', center: [ 3, 1.5, - 8 ], size: [ 12, 5, 6 ], blend: 3, priority: 1,
			params: { 'grade.exposure': - 0.5, 'grade.saturation': 0.55, 'grade.temperature': - 0.3, 'lens.vignette.amount': 0.6, 'lighting.practicals.intensity': 2.2 } },
		{ id: 'lava', label: 'Lava channel', lookName: 'Heat', shape: 'box', center: [ 0, 0, - 3 ], size: [ 22, 3, 1.8 ], blend: 3, priority: 0,
			params: { 'grade.temperature': 0.5, 'grade.exposure': 0.25, 'grade.saturation': 1.2 } },
		{ id: 'courtyard', label: 'East courtyard', shape: 'box', center: [ 6.5, 2, 6.5 ], size: [ 9, 5, 9 ], blend: 3, priority: 0, look: 'golden-hour' },
	],

	build( { tier = 0, seed = 44, density = 1 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'dungeon' );
		const S = 11; // half size of the room

		// Floor tiles (one slab at T0), with a gap for the lava channel at z ≈ -3.
		if ( tier === 0 ) {

			root.add( at( mesh( new THREE.BoxGeometry( S * 2, 0.4, S * 2 ), { part: 'terrain', color: '#5a5560' } ), [ 0, - 0.2, 0 ] ) );

		} else {

			const tiles = [];
			const n = byTier( tier, [ 1, 8, 14, 22 ] );
			const t = S * 2 / n;
			for ( let i = 0; i < n; i ++ ) for ( let k = 0; k < n; k ++ ) {

				const x = - S + ( i + 0.5 ) * t, z = - S + ( k + 0.5 ) * t;
				if ( Math.abs( z + 3 ) < 0.9 && Math.abs( x ) > 1.6 ) continue;
				const h = tier === 3 ? 0.3 + ( ( i * 31 + k * 17 ) % 5 ) * 0.012 : 0.3;
				tiles.push( place( new THREE.BoxGeometry( t * 0.95, h, t * 0.95 ), { p: [ x, - 0.3 + h / 2, z ] } ) );

			}

			root.add( mesh( merge( tiles ), { part: 'terrain', color: '#6a6570' } ) );
			// Dark grout under the tiles, so the gaps never show the sky.
			root.add( at( mesh( new THREE.BoxGeometry( S * 2, 0.1, S * 2 ), { part: 'terrain', color: '#2e2a33', castShadow: false } ), [ 0, - 0.36, 0 ] ) );

		}

		const channel = lava( tier, { length: S * 2, width: 1.8 } );
		channel.position.set( - S, - 0.25, - 3 );
		root.add( channel );
		const bridge = mesh( new THREE.BoxGeometry( 3.2, 0.3, 2.2 ), { part: 'architecture', color: '#6b6570' } );
		bridge.position.set( 0, - 0.15, - 3 );
		root.add( bridge );

		// Two back walls with pillars and torches.
		root.add( at( wall( tier, S * 2, 4, { color: '#4a4650' } ), [ - S, 0, - S ] ) );
		root.add( at( wall( tier, S * 2, 4, { color: '#4a4650' } ), [ - S, 0, S ], [ 0, Math.PI / 2, 0 ] ) );
		for ( const x of [ - 7, - 2, 3, 8 ] ) root.add( at( pillar( tier, 4.4, 0.45, { color: '#6b6570' } ), [ x, 0, - S + 0.9 ] ) );
		for ( const z of [ - 6, 0, 6 ] ) root.add( at( pillar( tier, 4.4, 0.45, { color: '#6b6570' } ), [ - S + 0.9, 0, z ] ) );

		const torches = [ [ - 4.5, - S + 0.55, 0 ], [ 5.5, - S + 0.55, 0 ], [ - S + 0.55, - 3, Math.PI / 2 ], [ - S + 0.55, 3, Math.PI / 2 ], [ 0.5, - S + 0.55, 0 ], [ - S + 0.55, 8, Math.PI / 2 ] ];
		for ( const [ i, [ x, z, r ] ] of torches.slice( 0, Math.min( torches.length, count( 4, density ) ) ).entries() ) root.add( at( torch( tier, { seed: i * 1.7 } ), [ x, 2.4, z ], [ 0, r, 0 ] ) );

		// A dais with stairs and a chest; props scattered.
		const dais = mesh( new THREE.BoxGeometry( 6, 1, 4 ), { part: 'architecture', color: '#625c68' } );
		dais.position.set( 4, 0.5, - 7.5 );
		root.add( dais );
		root.add( at( stairs( tier, { steps: 4, width: 3, rise: 0.25, run: 0.4, color: '#6b6570' } ), [ 4, 0, - 4.1 ], [ 0, Math.PI, 0 ] ) );
		root.add( at( chest( tier ), [ 4, 1, - 8 ] ) );

		const propRng = rng.fork();
		for ( let i = 0; i < count( 5, density ); i ++ ) {

			const p = [ propRng.range( - 9, - 4 ), 0, propRng.range( 2, 9 ) ];
			root.add( at( i % 2 ? barrel( tier, { color: '#6d4a2d' } ) : crate( tier, { color: '#7a5a3a', size: 0.8 } ), p, [ 0, propRng() * 3, 0 ] ) );

		}

		root.add( at( knight( tier, { part: 'hero', seed: 1 } ), [ - 1.5, 0, 2.5 ], [ 0, 0.4, 0 ] ) );
		root.add( at( character( tier, { part: 'characters', shirt: '#c9c4b5', pants: '#8f8a7d', skin: '#d8d2c0', seed: 4 } ), [ 3, 0, 4.5 ], [ 0, - 2.2, 0 ] ) );
		return { root };

	},
};
