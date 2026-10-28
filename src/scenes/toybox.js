// Physics Toybox (design §6.1), inspired by physics sandboxes such as Gang Beasts: a
// walled play mat with ramps, block towers and balls you can throw. Everything moves,
// so it tests the temporal stability of lines, dither and patterns.

import { THREE, createRng, at, group, mesh, box, beveledBox, sphere, cylinder, character, count } from './kit/index.js';

const SPARE_BALLS = 12;
const PALETTE = [ '#e8554e', '#f2b134', '#4fb3a9', '#4a7fd6', '#9b6bd6', '#f28fb1' ];

export default {
	id: 'toybox',
	name: 'Physics Toybox',
	inspiredBy: [ 'Physics sandboxes such as Gang Beasts', 'Toy blocks' ],
	genre: 'physics sandbox',
	notes: 'Everything here moves. Click (or RT) to throw a ball, walk in with Tab or L3 and push the towers over. Watch lines, dither and screen patterns on moving objects: they should hold steady, not crawl.',
	shots: {
		hero: { label: 'Hero', pos: [ 9, 7.5, 12 ], target: [ 0, 1, 0 ], fov: 45 },
		gameplay: { label: 'Gameplay (third-person)', pos: [ 0, 4.5, 11 ], target: [ 0, 1.2, 2 ], fov: 55 },
		wide: { label: 'Wide', pos: [ 16, 15, 18 ], target: [ 0, 0, 0 ], fov: 45 },
		close: { label: 'Close-up (towers)', pos: [ 3.5, 2.4, 5.5 ], target: [ - 1, 1.2, - 1.5 ], fov: 40 },
	},
	defaultShot: 'hero',
	focus: [ 0, 1, 0 ],
	shadow: { center: [ 0, 0, 0 ], radius: 13 },
	far: 400,
	params: {
		'lighting.key.elevation': 52, 'lighting.key.azimuth': 35, 'lighting.key.color': '#fff6ea', 'lighting.key.intensity': 2.8,
		'lighting.ambient.sky': '#d8e6ff', 'lighting.ambient.ground': '#6a6260', 'lighting.ambient.intensity': 0.75,
		'atmosphere.sky.zenith': '#6ea6e8', 'atmosphere.sky.horizon': '#e2eefa', 'atmosphere.sky.ground': '#e2eefa',
		'atmosphere.fog.color': '#e2eefa',
	},
	/** Balls that can be thrown (click or RT); they sleep out of sight until then. */
	spareBalls: SPARE_BALLS,

	build( { tier = 0, seed = 5, density = 1 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'toybox' );
		const S = 9;

		// Play mat and a low wall around it, so balls stay in.
		const matG = new THREE.BoxGeometry( S * 2, 0.4, S * 2 );
		root.add( at( mesh( matG, { part: 'terrain', color: '#9fc88a', castShadow: false } ), [ 0, - 0.2, 0 ] ) );
		for ( const [ x, z, w, d ] of [ [ 0, - S, S * 2 + 0.6, 0.3 ], [ 0, S, S * 2 + 0.6, 0.3 ], [ - S, 0, 0.3, S * 2 ], [ S, 0, 0.3, S * 2 ] ] ) {

			root.add( at( box( tier, [ w, 0.6, d ], { part: 'architecture', color: '#e8dcc8' } ), [ x, 0.3, z ] ) );

		}

		// Two ramps (static wedges) and a raised platform.
		const wedge = ( w, h, d ) => {

			const shape = new THREE.Shape( [ new THREE.Vector2( 0, 0 ), new THREE.Vector2( d, 0 ), new THREE.Vector2( d, h ) ] );
			const g = new THREE.ExtrudeGeometry( shape, { depth: w, bevelEnabled: false } );
			g.translate( - d / 2, 0, - w / 2 );
			g.rotateY( Math.PI / 2 );
			return g;

		};

		root.add( at( mesh( wedge( 2.4, 1.2, 4 ), { part: 'architecture', color: '#f2b134' } ), [ 5, 0, 2 ] ) );
		root.add( at( mesh( wedge( 2.4, 0.8, 3 ), { part: 'architecture', color: '#4fb3a9' } ), [ - 5.5, 0, 4 ], [ 0, Math.PI, 0 ] ) );
		root.add( at( box( tier, [ 3, 1.2, 3 ], { part: 'architecture', color: '#e8dcc8' } ), [ 5, 0.6, - 1.3 ] ) );

		// Dynamic props: block towers, a pyramid and a few balls. Each carries its physics shape.
		const dyn = ( object, physics ) => { object.userData.physics = physics; root.add( object ); return object; };
		const s = 0.7;
		const towers = [ [ - 2, - 2 ], [ 0.5, - 3 ], [ - 4.5, - 1 ] ].slice( 0, Math.min( 3, count( 2, density ) + 1 ) );
		for ( const [ ti, [ x, z ] ] of towers.entries() ) {

			for ( let level = 0; level < 5; level ++ ) {

				const color = PALETTE[ ( ti * 2 + level ) % PALETTE.length ];
				dyn( at( beveledBox( tier, s, { part: 'props', color } ), [ x + ( rng() - 0.5 ) * 0.04, s / 2 + level * s, z ], [ 0, rng() * 0.2, 0 ] ), { shape: 'box', size: [ s, s, s ], density: 0.6 } );

			}

		}

		for ( let row = 0; row < 4; row ++ ) for ( let i = 0; i < 4 - row; i ++ ) {

			dyn( at( box( tier, [ 1, 0.5, 0.5 ], { part: 'props', color: PALETTE[ ( row + i ) % PALETTE.length ] } ), [ 2 + i * 1.02 + row * 0.51 - 1.5, 0.25 + row * 0.5, 3.5 ] ), { shape: 'box', size: [ 1, 0.5, 0.5 ], density: 0.5 } );

		}

		for ( let i = 0; i < count( 3, density ); i ++ ) {

			const r = 0.35 + rng() * 0.25;
			dyn( at( sphere( tier, r, { part: 'props', color: PALETTE[ i % PALETTE.length ] } ), [ - 3 + i * 1.6, r + 0.01, 5.5 ] ), { shape: 'ball', radius: r, density: 0.3, restitution: 0.5 } );

		}

		// Spare balls for throwing, parked out of sight.
		for ( let i = 0; i < SPARE_BALLS; i ++ ) {

			const ball = sphere( tier, 0.28, { part: 'props', color: PALETTE[ i % PALETTE.length ] } );
			ball.visible = false;
			dyn( at( ball, [ - 8 + i * 0.7, - 5, - 8 ] ), { shape: 'ball', radius: 0.28, density: 1.2, restitution: 0.45, spare: true } );

		}

		// A toy chest and a few posts (static).
		root.add( at( cylinder( tier, 0.25, 1.6, { part: 'props', color: '#e8554e' } ), [ - 6.5, 0.8, - 6.5 ] ) );
		root.add( at( cylinder( tier, 0.25, 1.6, { part: 'props', color: '#4a7fd6' } ), [ 6.5, 0.8, 6.5 ] ) );

		root.add( at( character( tier, { part: 'hero', shirt: '#e8554e', pants: '#3b4a6b', hat: '#f2b134', seed: 3 } ), [ 0, 0, 3 ], [ 0, Math.PI, 0 ] ) );
		root.add( at( character( tier, { part: 'characters', shirt: '#4fb3a9', pants: '#5a4a6b', seed: 6 } ), [ - 6, 0, 1 ], [ 0, 1.2, 0 ] ) );
		return { root };

	},
};
