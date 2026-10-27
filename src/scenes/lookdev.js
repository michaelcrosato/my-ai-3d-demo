// Lookdev Stage (design §6.1): the reference scene for every look. Canonical shapes,
// a mannequin, a house, a tree, a rock, a gray card and a color chart.

import { THREE, byTier, createRng, at, group, mesh, sphere, box, beveledBox, cylinder, torusKnot, rock, colorChart, grayCard, house, tree, character } from './kit/index.js';

export default {
	id: 'lookdev',
	name: 'Lookdev Stage',
	inspiredBy: [ 'Studio turntables', 'Material test charts' ],
	genre: 'reference',
	notes: 'Every look is judged here first. Watch the cel bands on the sphere, the outlines on the cube\'s hard edges, and whether the color chart and gray card stay readable.',
	shots: {
		hero: { label: 'Hero 3/4', pos: [ 6.4, 3.7, 8.4 ], target: [ 0, 1.1, - 0.6 ], fov: 40 },
		wide: { label: 'Wide', pos: [ 12, 8.5, 16 ], target: [ 0, 1, - 0.8 ], fov: 45 },
		close: { label: 'Close-up (mannequin)', pos: [ 1.6, 1.85, 5.2 ], target: [ 0, 1.25, 1.4 ], fov: 35 },
	},
	defaultShot: 'hero',
	focus: [ 0, 1.2, 1.4 ],
	shadow: { center: [ 0, 0, - 0.5 ], radius: 9 },
	far: 400,
	params: {
		'lighting.key.elevation': 45, 'lighting.key.azimuth': 40, 'lighting.key.color': '#fff8ee', 'lighting.key.intensity': 2.8,
		'lighting.ambient.sky': '#dfe9ff', 'lighting.ambient.ground': '#6a6458', 'lighting.ambient.intensity': 0.8,
		'atmosphere.sky.zenith': '#5f86b0', 'atmosphere.sky.horizon': '#cfd8e0', 'atmosphere.sky.ground': '#9a9890',
		'atmosphere.fog.color': '#cfd8e0',
	},

	build( { tier = 0, seed = 7 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'lookdev' );

		const floorG = new THREE.CircleGeometry( 16, byTier( tier, [ 24, 32, 96, 160 ] ) );
		floorG.rotateX( - Math.PI / 2 );
		root.add( mesh( floorG, { part: 'terrain', color: '#8c8a80', castShadow: false } ) );

		root.add( at( sphere( tier, 0.7, { part: 'props', color: '#d9534f' } ), [ - 2.8, 0.7, 1.2 ] ) );
		root.add( at( box( tier, [ 1.2, 1.2, 1.2 ], { part: 'props', color: '#f0ad4e' } ), [ - 1.5, 0.6, - 0.9 ], [ 0, 0.5, 0 ] ) );
		root.add( at( beveledBox( tier, 1.0, { part: 'props', color: '#e9d44c' } ), [ 3.4, 0.5, - 0.6 ], [ 0, - 0.4, 0 ] ) );
		root.add( at( cylinder( tier, 0.55, 1.5, { part: 'props', color: '#5cb85c' } ), [ 2.5, 0.75, 1.3 ] ) );

		const knot = at( torusKnot( tier, 0.42, 0.15, { part: 'props', color: '#5bc0de' } ), [ 0.9, 1.75, - 0.9 ] );
		knot.userData.animate = ( t ) => { knot.rotation.y = t * 0.6; knot.position.y = 1.75 + Math.sin( t * 1.3 ) * 0.08; };
		root.add( knot );

		root.add( at( rock( tier, 0.65, rng, {} ), [ - 4.3, 0.25, 2.4 ], [ 0, 0.8, 0 ] ) );
		root.add( at( character( tier, { part: 'hero', shirt: '#3d7fd6', hat: '#8a5a2b' } ), [ 0, 0, 1.6 ] ) );
		root.add( at( house( tier, { wall: '#f2e6d0', roof: '#c0392b', trim: '#ffffff', door: '#6d4c41' } ), [ - 4.2, 0, - 3.6 ], [ 0, 0.35, 0 ], 0.85 ) );
		root.add( at( tree( tier, rng.fork() ), [ 4.4, 0, - 3.4 ] ) );
		root.add( at( colorChart( tier ), [ 0.4, 0, - 3.8 ], [ 0, - 0.1, 0 ] ) );
		root.add( at( grayCard( tier ), [ 2.2, 0, - 2.8 ], [ 0, - 0.35, 0 ] ) );

		return { root };

	},
};
