// Noir Alley (design §6.1, P2), inspired by noir detective games: a wet back alley at
// night between brick walls, neon signs, a street lamp, fire escapes, rain and a detective.
// It stress-tests night lighting (practicals against a dark sky), emissive neon and bloom,
// wet glossy ground (the closest the catalog gets to reflections without SSR), textured
// surfaces (bricks and cobbles: the retro texture filters show here) and black and white.

import { THREE, createRng, count, byTier, at, group, mesh, place, merge, faceted, tileUv, practical, character, trashCan, crate, lampPost } from './kit/index.js';

const A = 'architecture', P = 'props';

/** A brick facade along z (facing +x when side = −1, −x when side = 1), with windows and doors. */
function facade( tier, rng, { side, z0, z1, height, color } ) {

	const root = group( 'facade' );
	const len = z1 - z0, x = side * 3.4;
	const wallG = new THREE.BoxGeometry( 0.8, height, len, 1, byTier( tier, [ 1, 2, 4, 8 ] ), byTier( tier, [ 1, 2, 6, 12 ] ) );
	tileUv( wallG, len / 2.4, height / 2.4 );
	root.add( at( mesh( wallG, { part: A, color, map: 'bricks', roughness: 0.85 } ), [ x, height / 2, ( z0 + z1 ) / 2 ] ) );

	// Windows: some lit (warm), most dark. Lit ones are emissive (vfx), so bloom picks them up.
	const lit = [], dark = [], frames = [], sills = [];
	const face = x - side * 0.41;
	for ( let y = 3.2; y < height - 1; y += 3 ) for ( let z = z0 + 1.5; z < z1 - 1; z += 3.2 ) {

		const on = rng() < 0.4;
		( on ? lit : dark ).push( place( new THREE.BoxGeometry( 0.06, 1.4, 1 ), { p: [ face, y, z ] } ) );
		if ( tier >= 1 ) frames.push( place( new THREE.BoxGeometry( 0.12, 1.6, 0.1 ), { p: [ face, y, z - 0.55 ] } ), place( new THREE.BoxGeometry( 0.12, 1.6, 0.1 ), { p: [ face, y, z + 0.55 ] } ), place( new THREE.BoxGeometry( 0.12, 0.1, 1.2 ), { p: [ face, y + 0.75, z ] } ) );
		if ( tier >= 2 ) sills.push( place( new THREE.BoxGeometry( 0.25, 0.1, 1.3 ), { p: [ face - side * 0.08, y - 0.78, z ] } ) );

	}

	if ( lit.length ) root.add( mesh( merge( lit ), { part: 'vfx', color: '#ffd38a', emissive: '#ffb347', emissiveIntensity: 1.6, castShadow: false } ) );
	if ( dark.length ) root.add( mesh( merge( dark ), { part: A, color: '#1b2030', roughness: 0.15 } ) );
	if ( frames.length ) root.add( mesh( merge( frames ), { part: A, color: '#4a4440' } ) );
	if ( sills.length ) root.add( mesh( merge( sills ), { part: A, color: '#6a625a' } ) );

	// A back door with a step.
	const doorZ = z0 + len * 0.55;
	root.add( at( mesh( new THREE.BoxGeometry( 0.12, 2.2, 1.1 ), { part: A, color: '#3a2a22' } ), [ face, 1.1, doorZ ] ) );
	if ( tier >= 1 ) root.add( at( mesh( new THREE.BoxGeometry( 0.6, 0.18, 1.5 ), { part: A, color: '#5a5550' } ), [ face - side * 0.3, 0.09, doorZ ] ) );

	// Drain pipe (T2) and a cornice (T3).
	if ( tier >= 2 ) root.add( at( mesh( new THREE.CylinderGeometry( 0.07, 0.07, height, byTier( tier, [ 6, 6, 10, 16 ] ) ), { part: A, color: '#2f3238', metalness: 0.4, roughness: 0.5 } ), [ face - side * 0.12, height / 2, z1 - 0.6 ] ) );
	if ( tier >= 3 ) root.add( at( mesh( new THREE.BoxGeometry( 0.5, 0.35, len, 1, 2, 24 ), { part: A, color: '#5e5650' } ), [ x - side * 0.2, height - 0.1, ( z0 + z1 ) / 2 ] ) );
	return root;

}

/** A fire escape: landings with railings and a ladder, against the wall on `side`. */
function fireEscape( tier, { side, z, floors = 3 } ) {

	const g = [];
	const x = side * 2.4;
	for ( let f = 0; f < floors; f ++ ) {

		const y = 3.6 + f * 3;
		g.push( place( new THREE.BoxGeometry( 1.4, 0.08, 3 ), { p: [ x, y, z ] } ) );
		if ( tier >= 1 ) {

			g.push( place( new THREE.BoxGeometry( 0.05, 0.05, 3 ), { p: [ x - side * 0.68, y + 0.9, z ] } ) );
			for ( let k = 0; k <= byTier( tier, [ 2, 2, 6, 12 ] ); k ++ ) g.push( place( new THREE.BoxGeometry( 0.04, 0.9, 0.04 ), { p: [ x - side * 0.68, y + 0.45, z - 1.5 + k * 3 / byTier( tier, [ 2, 2, 6, 12 ] ) ] } ) );

		}

		if ( tier >= 2 && f < floors - 1 ) {

			// A ladder up to the next landing.
			for ( const dz of [ - 0.25, 0.25 ] ) g.push( place( new THREE.BoxGeometry( 0.04, 3, 0.04 ), { p: [ x, y + 1.5, z + 1.1 + dz ] } ) );
			for ( let r = 0; r < 8; r ++ ) g.push( place( new THREE.BoxGeometry( 0.03, 0.03, 0.5 ), { p: [ x, y + 0.3 + r * 0.36, z + 1.1 ] } ) );

		}

	}

	return mesh( merge( g ), { part: P, color: '#26292f', metalness: 0.6, roughness: 0.45 } );

}

/** A neon sign facing −x: a frame and glowing bars (no lettering), with a practical light of its color. */
function neon( tier, { color, seed = 0, flicker = 0.4 } ) {

	const root = group( 'neon sign' );
	root.add( mesh( new THREE.BoxGeometry( 0.12, 1.1, 2.2 ), { part: P, color: '#16181d' } ) );
	const bars = [ place( new THREE.BoxGeometry( 0.08, 0.12, 1.8 ), { p: [ - 0.08, 0.3, 0 ] } ), place( new THREE.BoxGeometry( 0.08, 0.12, 1.2 ), { p: [ - 0.08, - 0.1, - 0.3 ] } ) ];
	if ( tier >= 2 ) bars.push( place( new THREE.TorusGeometry( 0.22, 0.05, 8, byTier( tier, [ 12, 12, 24, 48 ] ) ), { p: [ - 0.08, - 0.15, 0.6 ], r: [ 0, Math.PI / 2, 0 ] } ) );
	root.add( mesh( merge( bars ), { part: 'vfx', color, emissive: color, emissiveIntensity: 3.5, castShadow: false } ) );
	const l = practical( { color, intensity: 14, distance: 9, flicker, seed } );
	l.position.x = - 1;
	root.add( l );
	return root;

}

export default {
	id: 'alley',
	name: 'Noir Alley',
	inspiredBy: [ 'Noir detective games', 'Blacksad', 'L.A. Noire' ],
	genre: 'noir detective adventure',
	notes: 'Night: the light comes from neon, windows and one lamp, not the moon. Watch whether the wet cobbles catch the neon, whether the detective reads against the dark, and how a black-and-white look keeps the neon readable by value alone. Bricks and cobbles are textured: the retro texture filters and the affine warp show here.',
	shots: {
		hero: { label: 'Street level (down the alley)', pos: [ 1.3, 1.7, 9.5 ], target: [ - 0.4, 2.4, - 12 ], fov: 50 },
		gameplay: { label: 'Third-person (behind the detective)', pos: [ 0.9, 2.5, 7.8 ], target: [ 0, 1.3, 1 ], fov: 56 },
		wide: { label: 'Wide (from the fire escape)', pos: [ 2.2, 10.5, 12 ], target: [ - 0.5, 1, - 8 ], fov: 48 },
		close: { label: 'Close-up (under the lamp)', pos: [ 1.9, 1.7, 5.6 ], target: [ 0.1, 1.45, 3 ], fov: 34 },
	},
	defaultShot: 'hero',
	focus: [ 0, 1.4, 3 ],
	shadow: { center: [ 0, 0, - 6 ], radius: 20 },
	far: 400,
	params: {
		'lighting.key.elevation': 38, 'lighting.key.azimuth': 205, 'lighting.key.color': '#a9bcff', 'lighting.key.intensity': 1.5,
		'lighting.ambient.sky': '#43538a', 'lighting.ambient.ground': '#2a2026', 'lighting.ambient.intensity': 1,
		'atmosphere.sky.zenith': '#06070e', 'atmosphere.sky.horizon': '#25304d', 'atmosphere.sky.ground': '#0e1018',
		'atmosphere.fog.color': '#202842',
		// Exposed up for night, as a camera would be: day looks keep their low ambient, and the
		// walls hide their sun.
		'grade.exposure': 0.6,
		// The scene's weather: rain, in every styled look (the plain baseline has none).
		'atmosphere.particles.enabled': true, 'atmosphere.particles.type': 'rain', 'atmosphere.particles.density': 0.7, 'atmosphere.particles.color': '#b7c8ff',
	},

	// Look zones (§6.10): the neon floods the grade magenta; under the lamp it warms.
	zones: [
		{ id: 'neon', label: 'Under the neon', lookName: 'Neon wash', shape: 'sphere', center: [ - 1.5, 1, - 6 ], radius: 3, blend: 3, priority: 1,
			params: { 'grade.temperature': - 0.15, 'grade.tint': 0.25, 'grade.saturation': 1.2, 'lighting.practicals.intensity': 1.6 } },
		{ id: 'lamp', label: 'Under the lamp', lookName: 'Lamplight', shape: 'sphere', center: [ 1.8, 1, 3 ], radius: 2.5, blend: 3, priority: 0,
			params: { 'grade.temperature': 0.3, 'grade.exposure': 0.85 } },
	],

	build( { tier = 0, seed = 31, density = 1 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'alley' );

		// Wet cobbles: glossy, textured, slightly displaced from T3.
		const streetG = new THREE.PlaneGeometry( 6.4, 48, byTier( tier, [ 1, 4, 16, 64 ] ), byTier( tier, [ 1, 24, 96, 320 ] ) ).rotateX( - Math.PI / 2 );
		tileUv( streetG, 6.4 / 1.6, 48 / 1.6 );
		if ( tier >= 3 ) {

			const pos = streetG.getAttribute( 'position' );
			for ( let i = 0; i < pos.count; i ++ ) pos.setY( i, Math.sin( pos.getX( i ) * 4.1 ) * Math.sin( pos.getZ( i ) * 3.7 ) * 0.015 );
			streetG.computeVertexNormals();

		}

		root.add( at( mesh( streetG, { part: 'terrain', color: '#7a7c84', map: 'cobbles', roughness: 0.28 } ), [ 0, 0, - 14 ] ) );

		// Puddles: dark and nearly mirror-smooth.
		const puddles = [];
		for ( let i = 0; i < count( 7, density ); i ++ ) {

			const g = new THREE.CircleGeometry( rng.range( 0.4, 1.1 ), byTier( tier, [ 10, 12, 28, 48 ] ) ).rotateX( - Math.PI / 2 );
			g.scale( 1, 1, rng.range( 1.3, 2.2 ) );
			puddles.push( place( g, { p: [ rng.range( - 2, 2 ), 0.012, rng.range( - 30, 7 ) ] } ) );

		}

		root.add( mesh( tier === 1 ? faceted( merge( puddles ) ) : merge( puddles ), { part: 'water', color: '#141a26', roughness: 0.04, metalness: 0.2, castShadow: false } ) );

		// Brick walls on both sides, stepping back into the dark; a blank wall at the dead end.
		const bricks = [ '#8a4535', '#7a4a3c', '#8c5544', '#6e443b' ];
		for ( const side of [ - 1, 1 ] ) {

			let z = 9;
			for ( let i = 0; i < 3; i ++ ) {

				const len = rng.range( 10, 15 );
				root.add( facade( tier, rng.fork(), { side, z0: z - len, z1: z, height: rng.range( 10, 15 ), color: bricks[ ( i + ( side > 0 ? 2 : 0 ) ) % 4 ] } ) );
				z -= len;

			}

		}

		const endG = new THREE.BoxGeometry( 7.6, 12, 0.8 );
		tileUv( endG, 7.6 / 2.4, 12 / 2.4 );
		root.add( at( mesh( endG, { part: A, color: '#4a3a36', map: 'bricks' } ), [ 0, 6, - 37 ] ) );

		root.add( fireEscape( tier, { side: - 1, z: - 4 } ), fireEscape( tier, { side: 1, z: - 17, floors: 2 } ) );

		// Neon: pink on the left, cyan deeper on the right.
		root.add( at( neon( tier, { color: '#ff2e88', seed: 1, flicker: 0.6 } ), [ - 2.9, 4.2, - 6 ], [ 0, Math.PI, 0 ] ) );
		root.add( at( neon( tier, { color: '#22d3ee', seed: 4, flicker: 0.2 } ), [ 2.9, 3.6, - 15 ] ) );

		// One street lamp over the detective.
		root.add( at( lampPost( tier, { height: 4.2, glow: '#ffcf87' } ), [ 2.4, 0, 3.2 ] ) );

		// Clutter: trash cans, crates, a dumpster, by density.
		const spots = [ [ - 2.4, 1.5 ], [ 2.5, - 3 ], [ - 2.5, - 9 ], [ 2.4, - 12 ], [ - 2.3, - 20 ], [ 2.4, - 24 ], [ - 2.4, - 28 ], [ 2.4, 6.5 ] ];
		for ( let i = 0; i < Math.min( spots.length, count( 5, density ) ); i ++ ) {

			const [ x, z ] = spots[ i ];
			const prop = i % 3 === 1 ? crate( tier, { color: '#6b5236' } ) : trashCan( tier, { color: '#3d4436' } );
			root.add( at( prop, [ x, 0, z ], [ 0, rng.range( 0, Math.PI ), 0 ] ) );

		}

		const dumpster = group( 'dumpster' );
		dumpster.add( at( mesh( new THREE.BoxGeometry( 1.2, 1.3, 2.2 ), { part: P, color: '#2f4a3a', roughness: 0.6, metalness: 0.3 } ), [ 0, 0.65, 0 ] ) );
		if ( tier >= 1 ) dumpster.add( at( mesh( new THREE.BoxGeometry( 1.3, 0.1, 2.3 ), { part: P, color: '#25382d', metalness: 0.3 } ), [ 0, 1.35, 0 ], [ 0, 0, - 0.12 ] ) );
		root.add( at( dumpster, [ - 2.3, 0, - 14 ] ) );

		// Overhead wires (T2+), sagging between the walls.
		if ( tier >= 2 ) {

			const wires = [];
			for ( const z of [ - 2, - 11, - 22 ] ) {

				const curve = new THREE.QuadraticBezierCurve3( new THREE.Vector3( - 3, 8.5, z ), new THREE.Vector3( 0, 7.4, z + 0.4 ), new THREE.Vector3( 3, 8.2, z - 0.3 ) );
				wires.push( new THREE.TubeGeometry( curve, byTier( tier, [ 8, 8, 16, 32 ] ), 0.02, 4 ) );

			}

			root.add( mesh( merge( wires ), { part: P, color: '#111317' } ) );

		}

		// The detective under the lamp (the hero), and a figure in a doorway.
		const detective = character( tier, { part: 'hero', shirt: '#8b7a58', pants: '#2b2b30', hat: '#3b3226', seed: 3 } );
		root.add( at( detective, [ 0.6, 0, 3 ], [ 0, - 0.35, 0 ] ) );
		root.add( at( character( tier, { part: 'characters', shirt: '#3a3f55', pants: '#1f2229', hat: '#20232b', seed: 8 } ), [ - 2.3, 0, - 17.5 ], [ 0, Math.PI / 2, 0 ] ) );

		// The street beyond the dead end: a lit window strip high up reads as a city.
		const glow = mesh( new THREE.PlaneGeometry( 7, 1.2 ), { part: 'vfx', color: '#ffcf87', emissive: '#ffb347', emissiveIntensity: 0.8, castShadow: false } );
		root.add( at( glow, [ 0, 11.4, - 36.55 ] ) );

		return { root };

	},
};
