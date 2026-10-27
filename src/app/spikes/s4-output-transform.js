// Spike 4: outputColorTransform = false with renderOutput() mid-graph, then
// display-space operations after it. Posterizing after renderOutput must give
// evenly spaced display values; posterizing before it gives sRGB-spaced ones.

import * as THREE from 'three/webgpu';
import { pass, renderOutput, posterize, uv, vec3 } from 'three/tsl';
import { renderToPixels } from '../gpu/readback.js';
import { SIZE, frontCamera, disposeScene } from './kit.js';

function levelsAlongRow( px ) {

	const levels = new Set();
	for ( let x = 3; x < px.width - 3; x ++ ) levels.add( px.at( x, px.height / 2 )[ 0 ] );
	return [ ...levels ].sort( ( a, b ) => a - b );

}

export default {
	id: 4,
	key: 'output-transform',
	title: 'outputColorTransform = false + renderOutput() mid-graph, display-space ops after',

	async run( { renderer, R } ) {

		const scene = new THREE.Scene();
		const material = new THREE.MeshBasicNodeMaterial();
		material.colorNode = vec3( uv().x ); // linear ramp 0 → 1, left to right
		scene.add( new THREE.Mesh( new THREE.PlaneGeometry( 2.2, 2.2 ), material ) );

		const camera = frontCamera( 1.1 );
		const scenePass = pass( scene, camera );
		const post = new THREE.PostProcessing( renderer );
		post.outputColorTransform = false;

		const snap = async ( node ) => {

			post.outputNode = node;
			post.needsUpdate = true;
			return levelsAlongRow( await renderToPixels( renderer, SIZE, SIZE, () => post.render() ) );

		};

		const display = await snap( posterize( renderOutput( scenePass, THREE.NoToneMapping, THREE.SRGBColorSpace ), 4 ) );
		const linear = await snap( renderOutput( posterize( scenePass, 4 ), THREE.NoToneMapping, THREE.SRGBColorSpace ) );

		const expected = [ 0, 64, 128, 191 ];
		const near = ( v ) => expected.some( ( e ) => Math.abs( v - e ) <= 2 ) || v >= 253;
		R.check( 'posterize after renderOutput → even display steps', display.every( near ) && display.length >= 4, display, '≈ 0, 64, 128, 191' );
		R.check( 'posterize before renderOutput → sRGB-spaced steps (control)', linear.some( ( v ) => Math.abs( v - 137 ) <= 3 ), linear, '≈ 0, 137, 188, 225' );

		R.note( 'GRADE / MEDIUM / DISPLAY stages can run after renderOutput() in display-referred space, as §7.7 assumes.' );

		scenePass.dispose(); post.dispose();
		disposeScene( scene );

	},
};
