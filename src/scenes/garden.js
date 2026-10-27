// Village Garden (design §6.1), inspired by Untitled Goose Game and Animal Crossing:
// pastel lawns, picket fences, flower beds and many small props under a high,
// near-orthographic camera, with a goose on the loose.

import { THREE, createRng, count, at, group, mesh, place, merge, house, tree, fence, hedge, flowers, pond, well, bench, crate, barrel, character, goose } from './kit/index.js';

export default {
	id: 'garden',
	name: 'Village Garden',
	inspiredBy: [ 'Untitled Goose Game', 'Animal Crossing' ],
	genre: 'cozy sandbox',
	notes: 'Readability by flat pastel color: can you tell every prop apart without lines? Watch the soft contact shadows under small props and whether the goose stays the focus.',
	shots: {
		hero: { label: 'High angle (near-orthographic)', pos: [ 16, 24, 21 ], target: [ 0, 0, 0 ], fov: 30 },
		gameplay: { label: 'Gameplay (top-down)', pos: [ 0, 34, 16 ], target: [ 0, 0, 0.5 ], fov: 26 },
		wide: { label: 'Wide', pos: [ 28, 30, 34 ], target: [ 0, 0, - 1 ], fov: 34 },
		close: { label: 'Close-up (goose)', pos: [ 5.2, 2.2, 6.2 ], target: [ 2.6, 0.5, 2.2 ], fov: 35 },
	},
	defaultShot: 'hero',
	focus: [ 2.6, 0.5, 2.2 ],
	shadow: { center: [ 0, 0, 0 ], radius: 17 },
	far: 400,
	params: {
		'lighting.key.elevation': 58, 'lighting.key.azimuth': 30, 'lighting.key.color': '#fff6e8', 'lighting.key.intensity': 2.5,
		'lighting.ambient.sky': '#d6e6ff', 'lighting.ambient.ground': '#a0b080', 'lighting.ambient.intensity': 1,
		'atmosphere.sky.zenith': '#9cc8f0', 'atmosphere.sky.horizon': '#e6f0f4', 'atmosphere.sky.ground': '#e6f0f4',
		'atmosphere.fog.color': '#e6f0f4',
	},

	build( { tier = 0, seed = 21, density = 1 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'garden' );

		// Lawn, paths and a soil patch.
		const lawn = new THREE.PlaneGeometry( 44, 44 ).rotateX( - Math.PI / 2 );
		root.add( mesh( lawn, { part: 'terrain', color: '#a7cc76', castShadow: false } ) );
		const paths = [ place( new THREE.BoxGeometry( 2.2, 0.06, 26 ), { p: [ 0, 0.03, 2 ] } ), place( new THREE.BoxGeometry( 22, 0.06, 2 ), { p: [ 0, 0.03, 1 ] } ) ];
		root.add( mesh( merge( paths ), { part: 'terrain', color: '#eadcbf', castShadow: false } ) );
		const soil = mesh( new THREE.BoxGeometry( 6, 0.18, 4 ), { part: 'terrain', color: '#a7805f' } );
		soil.position.set( - 6, 0.09, 6 );
		root.add( soil );

		root.add( at( house( tier, { wall: '#f6e7d0', roof: '#d98c7a', trim: '#ffffff', door: '#7fa7c9' } ), [ 0, 0, - 9 ], [ 0, 0, 0 ], 1.2 ) );
		root.add( at( well( tier ), [ 6.5, 0, - 5 ] ) );
		root.add( at( pond( tier, rng.fork(), { radius: 2.4, color: '#7fc4e0' } ), [ 7, 0, 5 ] ) );

		// Fences around the soil patch, hedges along the edge of the garden.
		for ( const [ p, r ] of [ [ [ - 9.2, 0, 3.8 ], 0 ], [ [ - 9.2, 0, 8.2 ], 0 ], [ [ - 9.2, 0, 3.8 ], - Math.PI / 2 ], [ [ - 2.8, 0, 3.8 ], - Math.PI / 2 ] ] ) {

			root.add( at( fence( tier, r ? 4.4 : 6.4 ), p, [ 0, r, 0 ] ) );

		}

		for ( const x of [ - 14, - 9, 9, 14 ] ) root.add( at( hedge( tier, [ 4.6, 1.1, 1.2 ], { seed: x } ), [ x, 0, - 13 ] ) );

		// Vegetables in rows, flower beds.
		const veg = [];
		for ( let r = 0; r < 3; r ++ ) for ( let i = 0; i < count( 6, density ); i ++ ) veg.push( place( tier === 0 ? new THREE.BoxGeometry( 0.4, 0.3, 0.4 ) : new THREE.IcosahedronGeometry( 0.26, tier >= 2 ? 1 : 0 ), { p: [ - 8.5 + i * 5 / count( 6, density ), 0.36, 4.8 + r * 1.2 ] } ) );
		root.add( mesh( merge( veg ), { part: 'foliage', color: '#6aa84f' } ) );

		const bedRng = rng.fork();
		for ( const [ x, z ] of [ [ - 4.5, - 5.5 ], [ 4.5, - 5.5 ], [ - 7, - 1.8 ], [ 3.5, 9.5 ] ] ) root.add( at( flowers( tier, bedRng.fork(), { w: 3, d: 1.2, n: count( 22, density ) } ), [ x, 0, z ] ) );

		const treeRng = rng.fork();
		const trees = [ [ - 12, - 7 ], [ 12, - 8 ], [ 13, 9 ], [ - 13, 11 ], [ - 15, 1 ], [ 15, 1 ], [ 10, 14 ], [ - 6, 14 ] ];
		for ( const [ x, z ] of trees.slice( 0, count( 4, density ) ) ) root.add( at( tree( tier, treeRng.fork(), { height: 3.6, leaf: treeRng.pick( [ '#86b85a', '#9ac46a', '#76a84e' ] ) } ), [ x, 0, z ] ) );

		root.add( at( bench( tier ), [ 3.6, 0, - 2.2 ], [ 0, - 0.3, 0 ] ) );
		const propRng = rng.fork();
		for ( let i = 0; i < count( 3, density ); i ++ ) root.add( at( i % 2 ? barrel( tier, { color: '#b9835a' } ) : crate( tier, { color: '#d8b07a', size: 0.7 } ), [ 4 + propRng.range( - 1.5, 2 ), 0, - 7 + propRng.range( - 1, 1.5 ) ], [ 0, propRng() * 3, 0 ] ) );

		root.add( at( character( tier, { part: 'characters', shirt: '#7fa7c9', pants: '#6b5a4a', hat: '#e8d08a', seed: 3 } ), [ - 4, 0, 7.4 ], [ 0, 2.4, 0 ] ) );

		// The goose waddles along a loop between the pond and the vegetables.
		const g = goose( tier, { part: 'hero', seed: 1 } );
		const idle = g.userData.animate;
		g.userData.animate = ( t ) => {

			idle( t );
			const a = t * 0.25;
			g.position.set( 1.2 + Math.cos( a ) * 2.6, 0, 2.2 + Math.sin( a ) * 1.6 );
			g.rotation.y = - a + Math.PI;

		};

		root.add( g );
		return { root };

	},
};
