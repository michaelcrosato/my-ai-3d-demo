// Meadow Shrine (design §6.1), inspired by Breath of the Wild, Ōkami and Ghost of
// Tsushima: rolling hills under grass that sways in the wind, a shrine gate with
// stone lanterns, pines and distant mountains, seen in third person.

import { createRng, count, at, group, terrainPatch, grass, flowers, pine, tree, rock, gate, stoneLantern, house, ridge, pond, character } from './kit/index.js';

export default {
	id: 'meadow',
	name: 'Meadow Shrine',
	inspiredBy: [ 'The Legend of Zelda: Breath of the Wild', 'Ōkami', 'Ghost of Tsushima' ],
	genre: 'open-world adventure',
	notes: 'Foliage density vs. line noise: thousands of grass blades are the worst case for ink and toon bands. Watch whether the grass reads as a soft mass, and whether painterly looks hold up here.',
	shots: {
		hero: { label: 'Third-person (to the shrine)', pos: [ 2.4, 3.2, 19 ], target: [ 0, 2.2, 3 ], fov: 50 },
		gameplay: { label: 'Gameplay (third-person)', pos: [ 0.6, 2.6, 16.5 ], target: [ 0, 1.8, 6 ], fov: 58 },
		wide: { label: 'Wide', pos: [ 34, 16, 34 ], target: [ 0, 2, 0 ], fov: 45 },
		close: { label: 'Close-up (hero)', pos: [ 1.6, 1.9, 9.4 ], target: [ 0, 1.6, 12 ], fov: 38 },
	},
	defaultShot: 'hero',
	focus: [ 0, 1.6, 12 ],
	shadow: { center: [ 0, 0, 3 ], radius: 24 },
	far: 900,
	params: {
		'lighting.key.elevation': 38, 'lighting.key.azimuth': 70, 'lighting.key.color': '#fff2dc', 'lighting.key.intensity': 3,
		'lighting.ambient.sky': '#b8d4ff', 'lighting.ambient.ground': '#6a7a4a', 'lighting.ambient.intensity': 0.7,
		'atmosphere.sky.zenith': '#5b9be6', 'atmosphere.sky.horizon': '#e3f0ff', 'atmosphere.sky.ground': '#e3f0ff',
		'atmosphere.fog.color': '#e3f0ff',
	},

	build( { tier = 0, seed = 88, density = 1 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'meadow' );

		// Flatten the ground along the path and around the shrine so props sit cleanly.
		const flat = ( x, z ) => Math.min( 1, Math.max( 0, ( Math.abs( x ) - 2.5 ) / 6 ) ) * Math.min( 1, Math.hypot( x, z + 4 ) / 10 );
		const { mesh: ground, heightAt } = terrainPatch( tier, { w: 120, d: 120, amp: 4, scale: 0.035, seed: 9, color: '#8fbf5a', flat } );
		root.add( ground );
		const on = ( x, z, sink = 0 ) => [ x, heightAt( x, z ) - sink, z ];

		const path = terrainPatch( tier, { w: 3, d: 26, amp: 0, color: '#c9b48a' } ).mesh;
		path.position.set( 0, 0.03, 6 );
		root.add( path );

		root.add( at( gate( tier, { width: 4.2, height: 4.6 } ), on( 0, 0 ) ) );
		root.add( at( house( tier, { wall: '#efe3cf', roof: '#7a2e2a', trim: '#5b3b22', door: '#5b3b22' } ), on( 0, - 8 ), [ 0, 0, 0 ], 1.1 ) );
		for ( const [ i, [ x, z ] ] of [ [ - 2.6, 3 ], [ 2.6, 3 ], [ - 2.6, 8 ], [ 2.6, 8 ] ].entries() ) root.add( at( stoneLantern( tier, { light: false, seed: i } ), on( x, z ) ) );
		root.add( at( pond( tier, rng.fork(), { radius: 3, color: '#5aa0c8' } ), on( 9, 6, 0.1 ) ) );

		// Grass everywhere except the path, the pond and the shrine.
		const avoid = ( x, z ) => Math.abs( x ) < 2 || Math.hypot( x - 9, z - 6 ) < 3.4 || Math.hypot( x, z + 6 ) < 5;
		const field = grass( tier, rng.fork(), { w: 36, d: 30, perSquareMeter: 7 * density, color: '#86b84e', height: 0.55, avoid } );
		field.position.set( 0, 0, 4 );
		// Blades follow the terrain: bake the height into the geometry.
		const pos = field.geometry.getAttribute( 'position' );
		for ( let i = 0; i < pos.count; i ++ ) pos.setY( i, pos.getY( i ) + heightAt( pos.getX( i ), pos.getZ( i ) + 4 ) );
		field.geometry.computeVertexNormals();
		root.add( field );

		const fRng = rng.fork();
		for ( let i = 0; i < count( 5, density ); i ++ ) {

			const x = fRng.pick( [ - 1, 1 ] ) * fRng.range( 4, 14 ), z = fRng.range( - 4, 16 );
			root.add( at( flowers( tier, fRng.fork(), { w: 2.5, d: 2, n: 14, colors: [ '#f7f3e8', '#f4a7b9', '#ffd86b' ] } ), on( x, z ) ) );

		}

		const tRng = rng.fork();
		for ( let i = 0; i < count( 12, density ); i ++ ) {

			const a = tRng() * Math.PI * 2, r = tRng.range( 14, 32 );
			const x = Math.cos( a ) * r, z = Math.sin( a ) * r - 2;
			const t = tRng() < 0.65 ? pine( tier, tRng.fork(), { height: tRng.range( 5, 9 ) } ) : tree( tier, tRng.fork(), { height: tRng.range( 3.5, 5 ), leaf: '#f2b6c6', trunk: '#5b3b22' } );
			root.add( at( t, on( x, z, 0.2 ) ) );

		}

		const rRng = rng.fork();
		for ( let i = 0; i < count( 6, density ); i ++ ) {

			const x = rRng.pick( [ - 1, 1 ] ) * rRng.range( 4, 18 ), z = rRng.range( - 10, 18 );
			root.add( at( rock( tier, rRng.range( 0.6, 1.6 ), rRng.fork(), { part: 'terrain' } ), on( x, z, 0.3 ), [ 0, rRng() * 6, 0 ] ) );

		}

		// Distant mountains in two layers for atmospheric depth.
		const mRng = rng.fork();
		root.add( at( ridge( tier, mRng.fork(), { width: 420, height: 60, color: '#6f86a8', peaks: 6 } ), [ 0, 0, - 260 ] ) );
		root.add( at( ridge( tier, mRng.fork(), { width: 300, height: 34, color: '#5e7d63', peaks: 8 } ), [ 30, 0, - 150 ] ) );

		root.add( at( character( tier, { part: 'hero', shirt: '#2f4a7a', pants: '#3b2f2a', hat: '#c9a45a', seed: 1 } ), on( 0, 12 ), [ 0, Math.PI, 0 ] ) );
		return { root };

	},
};
