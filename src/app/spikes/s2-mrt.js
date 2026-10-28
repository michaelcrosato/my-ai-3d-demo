// Spike 2: scene-pass MRT with `normal` + `ids`, where ids come from a per-material
// mrtNode, read back through a post graph. Also measures what MSAA does to ids.

import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, directionToColor, vec4 } from 'three/tsl';
import { renderToPixels } from '../gpu/readback.js';
import { SIZE, frontCamera, disposeScene } from './kit.js';

const PARTS = { box: [ 3, 10 ], instanced: [ 5, 30 ], sphere: [ 7, 20 ] };

function idMaterial( [ part, object ], color ) {

	const material = new THREE.MeshBasicNodeMaterial( { color } );
	material.mrtNode = mrt( { ids: vec4( part / 255, object / 255, 0, 1 ) } );
	return material;

}

function buildScene() {

	const scene = new THREE.Scene();

	const box = new THREE.Mesh( new THREE.BoxGeometry( 0.6, 0.6, 0.6 ), idMaterial( PARTS.box, 0xaa4444 ) );
	box.position.x = - 0.65;
	box.rotation.set( 0.4, 0.6, 0 );
	scene.add( box );

	const instanced = new THREE.InstancedMesh( new THREE.BoxGeometry( 0.3, 0.3, 0.3 ), idMaterial( PARTS.instanced, 0x44aa44 ), 2 );
	const m = new THREE.Matrix4();
	instanced.setMatrixAt( 0, m.makeTranslation( 0, 0.45, 0 ) );
	instanced.setMatrixAt( 1, m.makeTranslation( 0, - 0.45, 0 ) );
	scene.add( instanced );

	const sphere = new THREE.Mesh( new THREE.SphereGeometry( 0.32, 48, 32 ), idMaterial( PARTS.sphere, 0x4444aa ) );
	sphere.position.x = 0.65;
	scene.add( sphere );

	return scene;

}

export default {
	id: 2,
	key: 'mrt-ids',
	title: 'Scene-pass MRT: normal + ids via per-material mrtNode, read in post',

	async run( { renderer, R } ) {

		const scene = buildScene();
		const camera = frontCamera( 1.1 );

		const readPass = async ( samples, name ) => {

			const scenePass = pass( scene, camera, { samples } );
			scenePass.setMRT( mrt( { output, normal: directionToColor( normalView ), ids: vec4( 0, 0, 0, 0 ) } ) );

			const post = new THREE.PostProcessing( renderer );
			post.outputColorTransform = false;
			post.outputNode = scenePass.getTextureNode( name );
			const px = await renderToPixels( renderer, SIZE, SIZE, () => post.render() );
			scenePass.dispose();
			post.dispose();
			return px;

		};

		const ids = await readPass( 0, 'ids' );
		const at = ( u, v ) => ids.atUV( u, v ).slice( 0, 2 );
		const box = at( 0.2, 0.5 ), top = at( 0.5, 0.3 ), bottom = at( 0.5, 0.7 ), sphere = at( 0.8, 0.5 ), bg = at( 0.5, 0.5 );

		R.check( 'box writes part 3 / object 10', box[ 0 ] === 3 && box[ 1 ] === 10, box, '[3, 10]' );
		R.check( 'instanced mesh writes part 5 on both instances', top[ 0 ] === 5 && bottom[ 0 ] === 5, [ top, bottom ], '[5, *]' );
		R.check( 'sphere writes part 7 / object 20', sphere[ 0 ] === 7 && sphere[ 1 ] === 20, sphere, '[7, 20]' );
		R.check( 'background keeps the pass default (0)', bg[ 0 ] === 0, bg, '[0, 0]' );

		const normals = await readPass( 0, 'normal' );
		const facing = normals.atUV( 0.8, 0.5 );
		R.check( 'normal attachment holds view-space normals (sphere center ≈ +Z)', facing[ 2 ] > 230 && Math.abs( facing[ 0 ] - 128 ) < 20, facing.slice( 0, 3 ), '≈ [128, 128, 255]' );

		// MSAA resolves (averages) every attachment, so ids get mixed at edges.
		const msaa = await readPass( 4, 'ids' );
		const valid = new Set( [ 0, 3, 5, 7 ] );
		let mixed = 0, edge = 0;

		for ( let y = 0; y < SIZE; y ++ ) {

			for ( let x = 1; x < SIZE; x ++ ) {

				const a = ids.at( x, y )[ 0 ], b = ids.at( x - 1, y )[ 0 ];
				if ( a !== b ) edge ++;
				if ( ! valid.has( msaa.at( x, y )[ 0 ] ) ) mixed ++;

			}

		}

		R.info( 'MSAA ×4: pixels with blended (invalid) part ids', mixed, `${edge} id-edge pixels in the samples:0 image` );
		R.note( mixed > 0
			? 'MSAA blends ids at edges → the ids pass must render with samples: 0 (anti-alias in post with FXAA/SMAA), or ids need a separate non-MSAA pass.'
			: 'MSAA did not blend ids on this backend; still render ids with samples: 0 to be safe across GPUs.' );

		disposeScene( scene );

	},
};
