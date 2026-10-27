// M0 test stage: a few canonical shapes under a "typical agent default" setup
// (standard PBR, hemisphere + shadowed sun, ACES). Replaced by the lookdev scene in M1.

import * as THREE from 'three/webgpu';
import { mix, color, positionLocal, smoothstep } from 'three/tsl';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function buildStage() {

	const scene = new THREE.Scene();

	// Sky gradient on the background sphere (unit sphere around the camera).
	const up = positionLocal.normalize().y;
	scene.backgroundNode = mix( color( '#dfe9f2' ), color( '#5b8fd6' ), smoothstep( - 0.02, 0.3, up ) );

	scene.add( new THREE.HemisphereLight( '#cfe3ff', '#5a4c3e', 1.2 ) );

	const sun = new THREE.DirectionalLight( '#fff4e0', 2.6 );
	sun.position.set( 6, 9, 4 );
	sun.castShadow = true;
	sun.shadow.mapSize.set( 2048, 2048 );
	Object.assign( sun.shadow.camera, { left: - 8, right: 8, top: 8, bottom: - 8, near: 0.5, far: 30 } );
	sun.shadow.bias = - 0.0005;
	sun.shadow.normalBias = 0.03; // removes self-shadowing stripes (acne) on curved shapes
	scene.add( sun );

	const standard = ( c ) => new THREE.MeshStandardNodeMaterial( { color: c, roughness: 0.8, metalness: 0 } );

	const ground = new THREE.Mesh( new THREE.PlaneGeometry( 30, 30 ), standard( '#9a9784' ) );
	ground.rotation.x = - Math.PI / 2;
	ground.receiveShadow = true;
	scene.add( ground );

	const shapes = [
		[ new THREE.SphereGeometry( 0.8, 48, 32 ), '#d9534f', [ - 2.4, 0.8, 0 ] ],
		[ new RoundedBoxGeometry( 1.4, 1.4, 1.4, 4, 0.18 ), '#f0ad4e', [ 0, 0.7, - 0.4 ] ],
		[ new THREE.CylinderGeometry( 0.6, 0.6, 1.6, 40 ), '#5cb85c', [ 2.3, 0.8, 0.2 ] ],
		[ new THREE.TorusKnotGeometry( 0.45, 0.16, 160, 24 ), '#5bc0de', [ 0.2, 2.35, - 0.4 ] ],
	];

	const meshes = shapes.map( ( [ geometry, c, p ] ) => {

		const mesh = new THREE.Mesh( geometry, standard( c ) );
		mesh.position.set( ...p );
		mesh.castShadow = mesh.receiveShadow = true;
		scene.add( mesh );
		return mesh;

	} );

	const knot = meshes[ 3 ];

	return {
		scene,
		animate( t ) {

			knot.rotation.y = t * 0.6;
			knot.position.y = 2.35 + Math.sin( t * 1.3 ) * 0.08;

		},
	};

}
