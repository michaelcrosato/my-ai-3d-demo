// Dusk Campsite (design §6.1), inspired by Firewatch and A Short Hike: layered
// silhouettes of ridges and pines, colored fog bands, a campfire and a low sun.

import { createRng, count, at, group, mesh, terrainPatch, pine, rock, tent, campfire, pond, ridge, character, practical, byTier, THREE } from './kit/index.js';

export default {
	id: 'campsite',
	name: 'Dusk Campsite',
	inspiredBy: [ 'Firewatch', 'A Short Hike' ],
	genre: 'narrative exploration',
	notes: 'Layered silhouettes: four ridges at increasing distance should separate by value and color, which is what fog bands are for. Watch the campfire against the sunset, and whether warm and cool light both read.',
	shots: {
		hero: { label: 'Third-person (past the fire)', pos: [ - 6.5, 2.5, 8.5 ], target: [ 1, 1.6, - 4 ], fov: 52 },
		gameplay: { label: 'Gameplay (third-person)', pos: [ - 4, 3.2, 10.5 ], target: [ 0, 1.2, 0 ], fov: 58 },
		wide: { label: 'Wide (the ridges)', pos: [ 0, 9, 22 ], target: [ 0, 6, - 60 ], fov: 45 },
		close: { label: 'Close-up (campfire)', pos: [ - 1.6, 1.4, 3.2 ], target: [ 0, 0.6, 0 ], fov: 40 },
	},
	defaultShot: 'hero',
	focus: [ 0, 0.6, 0 ],
	shadow: { center: [ 0, 0, - 2 ], radius: 18 },
	far: 1200,
	params: {
		'lighting.key.elevation': 7, 'lighting.key.azimuth': 165, 'lighting.key.color': '#ff9a55', 'lighting.key.intensity': 2.4,
		'lighting.ambient.sky': '#6a5a9a', 'lighting.ambient.ground': '#3a2a30', 'lighting.ambient.intensity': 0.55,
		'atmosphere.sky.zenith': '#2b2a5e', 'atmosphere.sky.horizon': '#ff9a6a', 'atmosphere.sky.ground': '#ff9a6a',
		'atmosphere.fog.color': '#c77a8a',
	},

	// Look zones (§6.10): the fire warms the grade; the lakeshore is cool and misty.
	zones: [
		{ id: 'fireside', label: 'By the fire', lookName: 'Firelight', shape: 'sphere', center: [ 0, 0.5, 0 ], radius: 2.5, blend: 4, priority: 1,
			params: { 'grade.temperature': 0.45, 'grade.exposure': 0.3, 'grade.saturation': 1.15, 'lighting.practicals.intensity': 1.8 } },
		{ id: 'lakeshore', label: 'Lakeshore', lookName: 'Cool mist', shape: 'sphere', center: [ 14, 0.5, - 10 ], radius: 8, blend: 4, priority: 0,
			params: { 'grade.temperature': - 0.35, 'grade.saturation': 0.85, 'atmosphere.fog.density': 0.02 } },
	],

	build( { tier = 0, seed = 99, density = 1 } = {} ) {

		const rng = createRng( seed );
		const root = group( 'campsite' );

		const flat = ( x, z ) => Math.min( 1, Math.hypot( x, z ) / 9 );
		const { mesh: ground, heightAt } = terrainPatch( tier, { w: 140, d: 140, amp: 2.5, scale: 0.05, seed: 4, color: '#6b5a3e', flat } );
		root.add( ground );
		const on = ( x, z, sink = 0 ) => [ x, heightAt( x, z ) - sink, z ];

		root.add( at( pond( tier, rng.fork(), { radius: 9, color: '#4b5f8a' } ), on( 14, - 10, 0.25 ) ) );
		root.add( at( tent( tier, { color: '#e67e22' } ), on( 3.5, - 3 ), [ 0, - 0.6, 0 ] ) );
		root.add( at( campfire( tier, { seed: 1 } ), on( 0, 0 ) ) );

		for ( const [ x, z, r ] of [ [ - 1.6, 0.4, 1.4 ], [ 1.2, 1.5, 0.3 ] ] ) {

			const log = mesh( new THREE.CylinderGeometry( 0.22, 0.24, 1.8, byTier( tier, [ 8, 8, 16, 24 ] ) ), { part: 'props', color: '#6d4a2d' } );
			log.rotation.set( 0, r, Math.PI / 2 );
			log.position.set( ...on( x, z ) ).y += 0.2;
			root.add( log );

		}

		const lantern = practical( { color: '#ffd27a', intensity: 3, distance: 6, flicker: 0.2, seed: 3 } );
		lantern.position.set( 3, heightAt( 3, - 1.2 ) + 0.6, - 1.2 );
		root.add( lantern );

		// Near pines frame the camp; four ridges recede into the sunset.
		const pRng = rng.fork();
		for ( let i = 0; i < count( 14, density ); i ++ ) {

			const a = pRng.range( - Math.PI * 0.9, Math.PI * 0.2 ), r = pRng.range( 8, 26 );
			root.add( at( pine( tier, pRng.fork(), { height: pRng.range( 6, 11 ), color: '#24402f' } ), on( Math.cos( a ) * r, Math.sin( a ) * r - 4, 0.2 ) ) );

		}

		const rRng = rng.fork();
		for ( let i = 0; i < count( 4, density ); i ++ ) root.add( at( rock( tier, rRng.range( 0.5, 1.2 ), rRng.fork(), { part: 'terrain' } ), on( rRng.range( - 7, 7 ), rRng.range( - 7, 3 ), 0.2 ), [ 0, rRng() * 6, 0 ] ) );

		const mRng = rng.fork();
		const layers = [ [ 60, 14, '#3b2e4a' ], [ 120, 26, '#5a3f5e' ], [ 210, 44, '#86566e' ], [ 330, 70, '#b67a80' ] ];
		for ( const [ dist, h, color ] of layers ) root.add( at( ridge( tier, mRng.fork(), { width: dist * 3.2, height: h, color, peaks: 7 } ), [ mRng.range( - 20, 20 ), - 2, - dist ] ) );

		root.add( at( character( tier, { part: 'hero', shirt: '#c0392b', pants: '#3b4a6b', hat: '#2e4057', seed: 2 } ), on( - 2.2, 1.6 ), [ 0, 2.2, 0 ] ) );
		return { root };

	},
};
