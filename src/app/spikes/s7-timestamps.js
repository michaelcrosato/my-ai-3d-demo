// Spike 7: GPU timing. trackTimestamp + resolveTimestampsAsync where the backend
// supports timestamp queries; wall-clock-to-GPU-idle as the fallback.

import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { measureFrames, timestampsSupported } from '../../runtime/index.js';
import { SIZE, frontCamera, disposeScene } from './kit.js';

export default {
	id: 7,
	key: 'timestamps',
	title: 'GPU timing: trackTimestamp + resolveTimestampsAsync, with wall-clock fallback',

	async run( { renderer, R } ) {

		const scene = new THREE.Scene();
		scene.add( new THREE.HemisphereLight( 0xffffff, 0x333333, 2 ) );
		scene.add( new THREE.Mesh( new THREE.TorusKnotGeometry( 0.5, 0.18, 256, 32 ), new THREE.MeshStandardNodeMaterial() ) );

		const post = new THREE.PostProcessing( renderer );
		const scenePass = pass( scene, frontCamera( 1.1 ) );
		post.outputNode = scenePass;

		const target = new THREE.RenderTarget( SIZE, SIZE );
		const frame = () => { renderer.setRenderTarget( target ); post.render(); renderer.setRenderTarget( null ); };
		frame(); // compile outside the measurement

		const supported = timestampsSupported( renderer );
		R.info( 'timestamp-query available', supported, renderer.backend.isWebGPUBackend ? 'WebGPU feature' : 'EXT_disjoint_timer_query_webgl2' );

		if ( supported ) {

			const ts = await measureFrames( renderer, frame, { frames: 30, method: 'timestamp' } );
			R.check( 'timestamp timer returns GPU time', ts.msPerFrame > 0, ts.msPerFrame, '> 0 ms/frame' );

		} else {

			R.fallback = true;
			R.note( 'No timestamp queries on this backend/GPU: the audit will use the wall-clock fallback and say so.' );

		}

		const wall = await measureFrames( renderer, frame, { frames: 30, method: 'wallclock' } );
		R.check( 'wall-clock fallback returns a time', wall.msPerFrame > 0, wall.msPerFrame, '> 0 ms/frame' );

		scenePass.dispose(); post.dispose(); target.dispose();
		disposeScene( scene );

	},
};
