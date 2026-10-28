// Sci-fi Hangar (design §6.1), inspired by Metroid Prime and Halo: metal panels,
// emissive strips, holograms, a dropship and robots, seen over the shoulder.

import { THREE, createRng, count, at, group, mesh, place, merge, byTier, practical, ship, hologram, crate, barrel, robot, knight } from './kit/index.js';

const METAL = { roughness: 0.35, metalness: 0.6 };

export default {
	id: 'hangar',
	name: 'Sci-fi Hangar',
	inspiredBy: [ 'Metroid Prime', 'Halo' ],
	genre: 'sci-fi shooter',
	notes: 'Hard surfaces, metal and emissive strips: watch how each look handles metalness (stylized PBR keeps it, toon flattens it), whether bloom stays on the strips, and how translucent holograms read.',
	shots: {
		hero: { label: 'Over the shoulder', pos: [ - 1.6, 2.3, 12.6 ], target: [ 0.6, 2, 2 ], fov: 52 },
		gameplay: { label: 'Gameplay (third-person)', pos: [ - 3, 3.4, 14.5 ], target: [ 0, 1.8, 2 ], fov: 60 },
		wide: { label: 'Wide', pos: [ 15, 10, 19 ], target: [ 0, 2, - 1 ], fov: 50 },
		close: { label: 'Close-up (ship)', pos: [ 5, 2.4, 6 ], target: [ 1, 2, 0.5 ], fov: 40 },
	},
	defaultShot: 'hero',
	focus: [ - 3, 1.5, 9 ],
	shadow: { center: [ 0, 0, 0 ], radius: 15 },
	far: 300,
	params: {
		'lighting.key.elevation': 72, 'lighting.key.azimuth': 10, 'lighting.key.color': '#dfe8ff', 'lighting.key.intensity': 2,
		'lighting.ambient.sky': '#6b7a99', 'lighting.ambient.ground': '#2a2d33', 'lighting.ambient.intensity': 0.55,
		'atmosphere.sky.zenith': '#0f1420', 'atmosphere.sky.horizon': '#2a3346', 'atmosphere.sky.ground': '#2a3346',
		'atmosphere.fog.color': '#2a3346',
	},

	build( { tier = 0, seed = 77, density = 1 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'hangar' );
		const W = 12, D = 13;

		// Floor panels with seams.
		const floor = [];
		const n = byTier( tier, [ 1, 6, 12, 20 ] );
		for ( let i = 0; i < n; i ++ ) for ( let k = 0; k < n; k ++ ) floor.push( place( new THREE.BoxGeometry( W * 2 / n * ( n > 1 ? 0.97 : 1 ), 0.2, D * 2 / n * ( n > 1 ? 0.97 : 1 ) ), { p: [ - W + ( i + 0.5 ) * W * 2 / n, - 0.1, - D + ( k + 0.5 ) * D * 2 / n ] } ) );
		root.add( mesh( merge( floor ), { part: 'terrain', color: '#5d636d', ...METAL } ) );
		if ( n > 1 ) root.add( at( mesh( new THREE.BoxGeometry( W * 2, 0.1, D * 2 ), { part: 'terrain', color: '#23262b', castShadow: false } ), [ 0, - 0.22, 0 ] ) );

		// Back and side walls with ribs; a catwalk along the back.
		const walls = [ place( new THREE.BoxGeometry( W * 2, 9, 0.5 ), { p: [ 0, 4.5, - D ] } ), place( new THREE.BoxGeometry( 0.5, 9, D * 2 ), { p: [ - W, 4.5, 0 ] } ), place( new THREE.BoxGeometry( 0.5, 9, D * 2 ), { p: [ W, 4.5, 0 ] } ) ];
		root.add( mesh( merge( walls ), { part: 'architecture', color: '#7a818c', ...METAL } ) );

		if ( tier >= 1 ) {

			const ribs = [];
			const rn = byTier( tier, [ 0, 6, 10, 16 ] );
			for ( let i = 0; i <= rn; i ++ ) {

				ribs.push( place( new THREE.BoxGeometry( 0.4, 9, 0.6 ), { p: [ - W + i * W * 2 / rn, 4.5, - D + 0.4 ] } ) );
				ribs.push( place( new THREE.BoxGeometry( 0.6, 9, 0.4 ), { p: [ - W + 0.4, 4.5, - D + i * D * 2 / rn ] } ) );

			}

			root.add( mesh( merge( ribs ), { part: 'architecture', color: '#5b616b', ...METAL } ) );
			const walk = [ place( new THREE.BoxGeometry( W * 2 - 1, 0.2, 2 ), { p: [ 0, 4, - D + 1.5 ] } ), place( new THREE.BoxGeometry( W * 2 - 1, 0.08, 0.08 ), { p: [ 0, 5, - D + 2.4 ] } ) ];
			if ( tier >= 2 ) for ( let i = 0; i < 16; i ++ ) walk.push( place( new THREE.BoxGeometry( 0.06, 1, 0.06 ), { p: [ - W + 1 + i * ( W * 2 - 2 ) / 15, 4.5, - D + 2.4 ] } ) );
			root.add( mesh( merge( walk ), { part: 'architecture', color: '#3a3f4a', ...METAL } ) );

		}

		// Emissive strips along the floor edges and walls.
		const strips = [ place( new THREE.BoxGeometry( W * 2 - 1, 0.06, 0.2 ), { p: [ 0, 0.03, - D + 1 ] } ), place( new THREE.BoxGeometry( 0.2, 0.06, D * 2 - 2 ), { p: [ - W + 1, 0.03, 0 ] } ), place( new THREE.BoxGeometry( 0.2, 0.06, D * 2 - 2 ), { p: [ W - 1, 0.03, 0 ] } ) ];
		if ( tier >= 2 ) for ( const y of [ 2.5, 6.5 ] ) strips.push( place( new THREE.BoxGeometry( W * 2 - 1, 0.12, 0.1 ), { p: [ 0, y, - D + 0.3 ] } ) );
		root.add( mesh( merge( strips ), { part: 'vfx', color: '#7df9ff', emissive: '#30e0ff', emissiveIntensity: 2.5, castShadow: false } ) );

		// Ceiling lights as practicals.
		for ( const [ i, x ] of [ - 6, 0, 6 ].entries() ) {

			const l = practical( { color: '#cfe6ff', intensity: 18, distance: 14 } );
			l.position.set( x, 7.5, - 2 + ( i % 2 ) * 3 );
			root.add( l );

		}

		root.add( at( ship( tier ), [ 1, 0, - 0.5 ], [ 0, - 0.4, 0 ] ) );
		const hRng = rng.fork();
		for ( const [ i, [ x, z ] ] of [ [ - 7, - 6 ], [ 7, 6 ], [ - 7, 4 ] ].slice( 0, count( 2, density ) ).entries() ) root.add( at( hologram( tier, { color: i % 2 ? '#ff7a1a' : '#30e0ff', seed: hRng() * 6 } ), [ x, 0, z ] ) );

		const pRng = rng.fork();
		for ( let i = 0; i < count( 6, density ); i ++ ) {

			const p = [ pRng.range( 5, 10 ), 0, pRng.range( - 10, - 5 ) ];
			root.add( at( i % 3 === 0 ? barrel( tier, { color: '#c8a03a' } ) : crate( tier, { color: '#6b7480', size: 1 } ), p, [ 0, pRng() * 3, 0 ] ) );

		}

		root.add( at( robot( tier, { part: 'characters', seed: 1 } ), [ 5, 0, 4 ], [ 0, - 0.8, 0 ] ) );
		root.add( at( robot( tier, { part: 'characters', body: '#3a3f4a', accent: '#30e0ff', seed: 3 } ), [ - 5, 0, - 3 ], [ 0, 0.7, 0 ] ) );
		root.add( at( knight( tier, { part: 'hero', armor: '#5b7a46', cloth: '#2b2f36', seed: 2 } ), [ - 3, 0, 9 ], [ 0, Math.PI * 0.92, 0 ] ) );
		return { root };

	},
};
