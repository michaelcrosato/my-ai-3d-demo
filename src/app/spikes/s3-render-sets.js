// Spike 3: render sets via pass().setLayers(). Twins share a parent; each pass sees
// one layer, so it gets its own materials, its own light rig and its own shadow map
// (shadow cameras inherit the pass camera's layers). A uniform switches between
// sets without rebuilding the graph (hold-to-compare and split wipe).

import * as THREE from 'three/webgpu';
import { pass, uniform, mix, step, screenUV, max } from 'three/tsl';
import { renderToPixels } from '../gpu/readback.js';
import { SIZE, groundPlane, disposeScene } from './kit.js';

const A = 1, P = 2;

function onLayer( object, layer ) {

	object.layers.set( layer );
	return object;

}

function sun( intensity, layer ) {

	const light = new THREE.DirectionalLight( 0xffffff, intensity );
	light.position.set( 0.01, 10, 0.01 );
	light.castShadow = true;
	light.shadow.mapSize.set( 512, 512 );
	Object.assign( light.shadow.camera, { left: - 2, right: 2, top: 2, bottom: - 2, near: 0.1, far: 20 } );
	return onLayer( light, layer );

}

function roof( x, layer ) {

	const mesh = new THREE.Mesh( new THREE.BoxGeometry( 1.2, 0.05, 4 ), new THREE.MeshStandardNodeMaterial() );
	mesh.position.set( x, 1, 0 );
	mesh.castShadow = true;
	return onLayer( mesh, layer );

}

export default {
	id: 3,
	key: 'render-sets',
	title: 'Render sets via pass().setLayers(): twins, layer-filtered rigs, shadow-map layer inheritance',

	async run( { renderer, R } ) {

		const scene = new THREE.Scene();

		// One parent, two twins sharing geometry, as the runtime will build them.
		const parent = new THREE.Group();
		const geometry = new THREE.PlaneGeometry( 4, 4 );
		parent.add( onLayer( groundPlane( new THREE.MeshStandardNodeMaterial( { color: new THREE.Color( 1, 0.35, 0.35 ) } ) ), A ) );
		parent.add( onLayer( groundPlane( new THREE.MeshStandardNodeMaterial( { color: new THREE.Color( 0.35, 1, 0.35 ) } ) ), P ) );
		parent.children.forEach( ( c ) => { c.geometry.dispose(); c.geometry = geometry; } );
		scene.add( parent );

		scene.add( sun( 2, A ), sun( 1, P ) );
		scene.add( roof( - 0.6, A ), roof( 0.6, P ) ); // A shades the left half, P the right half
		const ambient = new THREE.AmbientLight( 0xffffff, 0.3 );
		ambient.layers.set( A );
		ambient.layers.enable( P );
		scene.add( ambient );

		// Camera between the roofs and the ground, looking down: roofs are behind it.
		const camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0.01, 10 );
		camera.position.set( 0, 0.5, 0 );
		camera.up.set( 0, 0, - 1 );
		camera.lookAt( 0, 0, 0 );

		const layersA = new THREE.Layers(); layersA.set( A );
		const layersP = new THREE.Layers(); layersP.set( P );
		const passA = pass( scene, camera ); passA.setLayers( layersA );
		const passP = pass( scene, camera ); passP.setLayers( layersP );

		const hold = uniform( 0 );
		const split = uniform( 0 );
		const showPlain = max( hold, step( screenUV.x, split ) );

		const post = new THREE.PostProcessing( renderer );
		post.outputColorTransform = false;
		post.outputNode = mix( passA, passP, showPlain );

		const snap = () => renderToPixels( renderer, SIZE, SIZE, () => post.render() );
		const styled = await snap();
		hold.value = 1;
		const plain = await snap();
		hold.value = 0; split.value = 0.5;
		const wiped = await snap();

		const L = ( px, u ) => px.atUV( u, 0.5 );
		const lum = ( p ) => p[ 0 ] + p[ 1 ] + p[ 2 ];

		R.check( 'set A: its own roof shades the left half only', lum( L( styled, 0.25 ) ) < lum( L( styled, 0.75 ) ) - 60, [ lum( L( styled, 0.25 ) ), lum( L( styled, 0.75 ) ) ], 'left darker' );
		R.check( 'set P: its own roof shades the right half only', lum( L( plain, 0.75 ) ) < lum( L( plain, 0.25 ) ) - 60, [ lum( L( plain, 0.25 ) ), lum( L( plain, 0.75 ) ) ], 'right darker' );

		const aLit = L( styled, 0.75 ), pLit = L( plain, 0.25 );
		R.check( 'materials separated (A red-tinted, P green-tinted)', aLit[ 0 ] > aLit[ 1 ] && pLit[ 1 ] > pLit[ 0 ], [ aLit.slice( 0, 3 ), pLit.slice( 0, 3 ) ], 'A: R>G, P: G>R' );
		R.check( 'light rigs separated (A sun 2.0 brighter than P sun 1.0)', aLit[ 0 ] > pLit[ 1 ] + 25, [ aLit[ 0 ], pLit[ 1 ] ], 'A dominant > P dominant' );

		const sameAs = ( p, q ) => Math.abs( lum( p ) - lum( q ) ) < 6;
		R.check( 'split wipe: left from P, right from A, by uniform only', sameAs( L( wiped, 0.25 ), L( plain, 0.25 ) ) && sameAs( L( wiped, 0.75 ), L( styled, 0.75 ) ), [ L( wiped, 0.25 ).slice( 0, 3 ), L( wiped, 0.75 ).slice( 0, 3 ) ], 'P | A' );

		R.note( 'Lights are filtered by camera layers (Renderer.js: light.layers.test(camera.layers)); shadow cameras left on layer 0 inherit the pass layers (ShadowNode). Both confirmed above: each roof only shades its own set.' );

		passA.dispose(); passP.dispose(); post.dispose();
		disposeScene( scene );

	},
};
