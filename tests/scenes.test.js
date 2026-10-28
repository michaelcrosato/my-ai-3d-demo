import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, TIERS, buildScene } from '../src/scenes/index.js';
import { PARTS } from '../src/runtime/registry/index.js';
import { isHex } from '../src/runtime/color/color.js';

test( 'scenes build deterministically, every mesh is tagged, triangles grow with tier', () => {

	for ( const scene of SCENES ) {

		const counts = TIERS.map( ( { id } ) => {

			const a = buildScene( scene, { tier: id } );
			const b = buildScene( scene, { tier: id } );
			assert.equal( a.triangles, b.triangles, `${scene.id} T${id}: same seed, same triangles` );

			let meshes = 0;
			a.root.traverse( ( o ) => {

				if ( ! o.isMesh ) return;
				meshes ++;
				const s = o.userData.style;
				assert.ok( s && PARTS.includes( s.part ), `${scene.id} T${id}: mesh "${o.name || o.parent?.name}" has a known part` );
				assert.ok( isHex( s.color ), `${scene.id} T${id}: color` );

			} );

			a.animate( 1.5 );
			assert.ok( meshes > 10 );
			return a.triangles;

		} );

		for ( let t = 1; t < counts.length; t ++ ) assert.ok( counts[ t ] > counts[ t - 1 ], `${scene.id}: T${t} (${counts[ t ]}) > T${t - 1} (${counts[ t - 1 ]})` );

		// Density changes prop counts, deterministically, and never removes the landmarks.
		const sparse = buildScene( scene, { tier: 1, density: 0.5 } ), dense = buildScene( scene, { tier: 1, density: 4 } );
		assert.ok( dense.triangles >= sparse.triangles, `${scene.id}: density 4 has at least as much geometry as 0.5` );
		assert.equal( buildScene( scene, { tier: 1, density: 4 } ).triangles, dense.triangles, `${scene.id}: density is deterministic` );
		console.log( `${scene.id} triangles by tier: ${counts.map( ( c ) => `${( c / 1000 ).toFixed( 1 )}k` ).join( ' · ' )}` );

	}

} );

test( 'scene definitions follow the contract', () => {

	for ( const scene of SCENES ) {

		assert.ok( scene.shots[ scene.defaultShot ], `${scene.id}: default shot` );
		for ( const shot of Object.values( scene.shots ) ) assert.ok( shot.pos.length === 3 && shot.target.length === 3 && shot.fov > 0 && shot.label );
		assert.ok( scene.notes && scene.inspiredBy.length );

	}

} );
