// .glb / .gltf import (design §6.1): load with GLTFLoader, guess a part for every mesh,
// keep the model's colors, textures and vertex colors, normalize its size, and build a
// scene definition (shots and shadow frame from the bounds) the app can load like any scene.

import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { guessParts } from '../../runtime/parts/guess.js';
import { describeMesh, styleFromMaterial } from '../../runtime/parts/convert.js';

const RADIUS = 10; // imported models are scaled to this bounding radius, so looks' fog and lines behave

async function createLoader( buffer ) {

	const loader = new GLTFLoader();
	// Compressed files need decoders; load them only when the file asks for them.
	const json = new TextDecoder().decode( new Uint8Array( buffer, 0, Math.min( buffer.byteLength, 400000 ) ) );
	if ( json.includes( 'KHR_draco_mesh_compression' ) ) {

		const { DRACOLoader } = await import( 'three/addons/loaders/DRACOLoader.js' );
		const draco = new DRACOLoader();
		draco.setDecoderPath( 'https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/libs/draco/gltf/' );
		loader.setDRACOLoader( draco );

	}

	if ( json.includes( 'EXT_meshopt_compression' ) ) {

		const { MeshoptDecoder } = await import( 'three/addons/libs/meshopt_decoder.module.js' );
		loader.setMeshoptDecoder( MeshoptDecoder );

	}

	return loader;

}

/**
 * @param {ArrayBuffer} buffer
 * @param {string} name - file name, for labels
 * @returns {Promise<{def: object, meshes: number, guesses: object[], warnings: string[]}>}
 */
export async function importModel( buffer, name = 'model.glb' ) {

	const loader = await createLoader( buffer );
	const gltf = await loader.parseAsync( buffer, '' );
	const model = gltf.scene;
	const warnings = [];

	// Normalize size and sit the model on y = 0, centered.
	model.updateMatrixWorld( true );
	const bounds = new THREE.Box3().setFromObject( model );
	if ( bounds.isEmpty() ) throw new Error( 'The file has no meshes.' );
	const sphere = bounds.getBoundingSphere( new THREE.Sphere() );
	const scale = RADIUS / Math.max( 1e-6, sphere.radius );
	const root = new THREE.Group();
	root.name = `import: ${name}`;
	const holder = new THREE.Group();
	holder.scale.setScalar( scale );
	holder.position.set( - sphere.center.x * scale, - bounds.min.y * scale, - sphere.center.z * scale );
	holder.add( model );
	root.add( holder );
	root.updateMatrixWorld( true );

	const meshes = [];
	model.traverse( ( o ) => { if ( o.isMesh ) meshes.push( o ); } );
	if ( meshes.some( ( m ) => m.morphTargetInfluences?.length ) ) warnings.push( 'Morph targets are not animated on the styled and plain twins yet.' );
	if ( meshes.some( ( m ) => Array.isArray( m.material ) ) ) warnings.push( 'Meshes with several materials use their first material.' );

	const descriptors = meshes.map( ( m ) => describeMesh( m, model.parent ) );

	const guesses = guessParts( descriptors );

	meshes.forEach( ( m, i ) => {

		if ( ! m.geometry.getAttribute( 'normal' ) ) m.geometry.computeVertexNormals();
		m.userData.style = styleFromMaterial( m, guesses[ i ].part );
		m.userData.guess = guesses[ i ];
		m.castShadow = m.receiveShadow = true;

	} );

	// No ground in the file: add a neutral one, so the model has somewhere to cast shadows.
	if ( ! guesses.some( ( g ) => g.part === 'terrain' || g.part === 'water' ) ) {

		const ground = new THREE.Mesh( new THREE.CircleGeometry( RADIUS * 6, 64 ).rotateX( - Math.PI / 2 ), new THREE.MeshBasicMaterial() );
		ground.name = 'added ground';
		ground.position.y = - 0.01;
		ground.receiveShadow = true;
		ground.userData.style = { part: 'terrain', color: '#9a9784', roughness: 0.8 };
		ground.userData.guess = { part: 'terrain', reason: 'added by Style Lab' };
		root.add( ground );

	}

	// Animations: the first clip plays, driven by the (freezable) app clock.
	if ( gltf.animations.length ) {

		const mixer = new THREE.AnimationMixer( model );
		const clip = gltf.animations[ 0 ];
		mixer.clipAction( clip ).play();
		root.userData.animate = ( t ) => mixer.setTime( clip.duration > 0 ? t % clip.duration : 0 );

	}

	const box = new THREE.Box3().setFromObject( holder );
	const c = box.getCenter( new THREE.Vector3() );
	const R = box.getBoundingSphere( new THREE.Sphere() ).radius;
	const shot = ( label, dist, elev, az, fov ) => {

		const e = elev * Math.PI / 180, a = az * Math.PI / 180;
		return { label, pos: [ c.x + Math.sin( a ) * Math.cos( e ) * dist, c.y + Math.sin( e ) * dist, c.z + Math.cos( a ) * Math.cos( e ) * dist ], target: c.toArray(), fov };

	};

	const def = {
		id: 'import',
		imported: true,
		name: `Imported: ${name}`,
		inspiredBy: [ 'Your model' ],
		genre: 'imported',
		notes: `${meshes.length} meshes. Parts were guessed from tags, names and shapes; use Pick parts in the Scene tab to check and fix them. Complexity and density apply to built-in scenes only.`,
		shots: {
			hero: shot( 'Hero 3/4', R * 2.4, 24, 35, 40 ),
			wide: shot( 'Wide', R * 3.6, 32, 45, 40 ),
			close: shot( 'Close', R * 1.5, 14, 20, 40 ),
			top: shot( 'Top-down', R * 3, 80, 0, 35 ),
		},
		defaultShot: 'hero',
		focus: c.toArray(),
		shadow: { center: [ c.x, 0, c.z ], radius: R * 1.3 },
		far: Math.max( 500, R * 60 ),
		params: {},
		build: () => ( { root } ),
	};

	return { def, meshes: meshes.length, guesses, warnings, animations: gltf.animations.length };

}
