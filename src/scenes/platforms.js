// Sky Platforms (design §6.1), inspired by Super Mario 64 and Astro Bot: floating
// platforms in primary colors, coins, blocks and pipes, readable jump surfaces,
// seen from a 3/4 side camera.

import { THREE, createRng, count, at, group, mesh, byTier, faceted, cloud, coin, pipe, block, character, robot } from './kit/index.js';

/** A floating island platform: grass top, earthy underside. */
function platform( tier, { r = 3, h = 0.6, top = '#6cc04a', earth = '#b5733f', square = false } = {} ) {

	const root = group( 'platform' );
	const seg = square ? 4 : byTier( tier, [ 10, 10, 40, 64 ] );
	const topG = new THREE.CylinderGeometry( r, r, h, seg, 1 );
	if ( square ) topG.rotateY( Math.PI / 4 );
	const t = mesh( tier === 1 ? faceted( topG ) : topG, { part: 'terrain', color: top } );
	t.position.y = - h / 2;
	root.add( t );
	const under = new THREE.ConeGeometry( r * 0.95, r * 1.3, seg, byTier( tier, [ 1, 2, 4, 8 ] ) );
	under.rotateX( Math.PI );
	if ( square ) under.rotateY( Math.PI / 4 );
	const u = mesh( tier === 1 ? faceted( under ) : under, { part: 'terrain', color: earth } );
	u.position.y = - h - r * 0.65;
	root.add( u );
	return root;

}

export default {
	id: 'platforms',
	name: 'Sky Platforms',
	inspiredBy: [ 'Super Mario 64', 'Astro Bot' ],
	genre: '3D platformer',
	notes: 'Readable jumpable surfaces in primary colors: every top must read as standable from the camera. Watch the coins (small, spinning, emissive) and whether shadows show where you would land.',
	shots: {
		hero: { label: '3/4 side', pos: [ 6, 9, 21 ], target: [ 1, 3, 0 ], fov: 45 },
		gameplay: { label: 'Gameplay (side)', pos: [ 0, 6.5, 17 ], target: [ 1, 3.5, 0 ], fov: 50 },
		wide: { label: 'Wide', pos: [ 22, 18, 34 ], target: [ 2, 3, - 2 ], fov: 45 },
		close: { label: 'Close-up (hero)', pos: [ - 4.2, 2.6, 5.4 ], target: [ - 6, 1.8, 2 ], fov: 38 },
	},
	defaultShot: 'hero',
	focus: [ - 6, 1.8, 2 ],
	shadow: { center: [ 1, 0, - 1 ], radius: 18 },
	far: 600,
	params: {
		'lighting.key.elevation': 55, 'lighting.key.azimuth': 35, 'lighting.key.color': '#fffaf0', 'lighting.key.intensity': 3,
		'lighting.ambient.sky': '#cfe6ff', 'lighting.ambient.ground': '#e8f4ff', 'lighting.ambient.intensity': 0.8,
		'atmosphere.sky.zenith': '#3f9bff', 'atmosphere.sky.horizon': '#dff3ff', 'atmosphere.sky.ground': '#bfe6ff',
		'atmosphere.fog.color': '#dff3ff',
	},

	build( { tier = 0, seed = 66, density = 1 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'sky platforms' );

		const pads = [
			{ p: [ - 6, 0, 1.5 ], r: 3.2 }, { p: [ 0, 1.6, - 1 ], r: 2.4, top: '#f5b82e' }, { p: [ 5, 3, 1 ], r: 2, square: true, top: '#4aa3ff' },
			{ p: [ 9.5, 4.6, - 2.5 ], r: 2.6, top: '#e74c3c' }, { p: [ 3, 6.2, - 7 ], r: 3, top: '#6cc04a' }, { p: [ - 5, 4, - 6 ], r: 2, square: true, top: '#9b59b6' },
		];
		for ( const d of pads ) root.add( at( platform( tier, d ), d.p ) );

		// Coins in arcs between platforms.
		const coins = [];
		for ( const [ a, b ] of [ [ 0, 1 ], [ 1, 2 ], [ 2, 3 ], [ 3, 4 ] ] ) {

			const n = count( 4, density );
			for ( let i = 1; i <= n; i ++ ) {

				const t = i / ( n + 1 );
				const p = pads[ a ].p.map( ( v, k ) => v + ( pads[ b ].p[ k ] - v ) * t );
				coins.push( at( coin( tier, { seed: coins.length } ), [ p[ 0 ], p[ 1 ] + 1.2 + Math.sin( t * Math.PI ) * 1.5, p[ 2 ] ] ) );

			}

		}

		root.add( ...coins );
		root.add( at( block( tier, { kind: 'item' } ), [ - 6, 3.2, 0.5 ] ), at( block( tier, { kind: 'brick' } ), [ - 7, 3.2, 0.5 ] ), at( block( tier, { kind: 'brick' } ), [ - 5, 3.2, 0.5 ] ) );
		root.add( at( pipe( tier, { height: 1.2, radius: 0.6 } ), [ 3, 6.2, - 8 ] ) );
		root.add( at( pipe( tier, { height: 0.8, radius: 0.5 } ), [ 10.5, 4.6, - 3 ] ) );

		// Flag at the goal platform.
		const flag = group( 'flag' );
		flag.add( mesh( new THREE.CylinderGeometry( 0.06, 0.06, 4, byTier( tier, [ 6, 6, 12, 16 ] ) ).translate( 0, 2, 0 ), { part: 'props', color: '#f4f4f4' } ) );
		flag.add( mesh( new THREE.BoxGeometry( 1.2, 0.8, 0.04 ).translate( 0.6, 3.5, 0 ), { part: 'props', color: '#e74c3c' } ) );
		root.add( at( flag, [ 4.5, 6.2, - 6 ] ) );

		const cRng = rng.fork();
		for ( let i = 0; i < count( 6, density ); i ++ ) {

			const c = cloud( tier, cRng.fork(), { size: cRng.range( 5, 10 ) } );
			const x0 = cRng.range( - 40, 40 ), y = cRng.range( - 8, 2 ), z = cRng.range( - 40, - 12 );
			at( c, [ x0, y, z ] );
			c.userData.animate = ( t ) => { c.position.x = ( ( x0 + t * 0.6 + 50 ) % 100 + 100 ) % 100 - 50; };
			root.add( c );

		}

		root.add( at( character( tier, { part: 'hero', shirt: '#e74c3c', pants: '#2e5fb7', hat: '#e74c3c', seed: 1 } ), [ - 6, 0, 2 ], [ 0, 0.5, 0 ] ) );
		const bot = robot( tier, { part: 'characters', body: '#ffe066', accent: '#2e5fb7', seed: 2 } );
		at( bot, [ 9.5, 4.6, - 2.5 ] );
		root.add( bot );
		return { root };

	},
};
