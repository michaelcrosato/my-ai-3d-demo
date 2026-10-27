// Spike 5: structural rebuilds. Swap the post graph's outputNode many times
// (cycling plain / posterize / gaussian blur / bloom), dispose the replaced
// effect nodes, and check GPU memory doesn't grow.

import * as THREE from 'three/webgpu';
import { pass, posterize } from 'three/tsl';
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { renderToPixels, pixelStats } from '../gpu/readback.js';
import { timestampsSupported } from '../../runtime/index.js';
import { SIZE, frontCamera, disposeScene } from './kit.js';

export default {
	id: 5,
	key: 'rebuild',
	title: 'Structural rebuild: outputNode swap + needsUpdate, leak check',
	iterations: 200,

	async run( { renderer, R, options = {} } ) {

		const iterations = options.rebuildIterations || this.iterations;

		const scene = new THREE.Scene();
		scene.add( new THREE.HemisphereLight( 0xffffff, 0x333333, 2 ) );
		scene.add( new THREE.Mesh( new THREE.TorusKnotGeometry( 0.5, 0.18, 96, 16 ), new THREE.MeshStandardNodeMaterial( { color: 0xff8844, emissive: 0x331100 } ) ) );

		const camera = frontCamera( 1.1 );
		const scenePass = pass( scene, camera );
		const post = new THREE.PostProcessing( renderer );
		const target = new THREE.RenderTarget( SIZE, SIZE );

		const variants = [
			() => ( { node: scenePass, owned: [] } ),
			() => ( { node: posterize( scenePass, 6 ), owned: [] } ),
			() => { const b = gaussianBlur( scenePass, 1, 2 ); return { node: b, owned: [ b ] }; },
			() => { const b = bloom( scenePass, 1, 0.5, 0.2 ); return { node: scenePass.add( b ), owned: [ b ] }; },
		];

		let current = null;
		const apply = ( i ) => {

			const next = variants[ i % variants.length ]();
			post.outputNode = next.node;
			post.needsUpdate = true;
			renderer.setRenderTarget( target );
			post.render();
			renderer.setRenderTarget( null );
			if ( current ) for ( const n of current.owned ) n.dispose();
			current = next;

		};

		const memory = () => ( { textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries } );
		let warm = null;
		const t0 = performance.now();

		for ( let i = 0; i < iterations; i ++ ) {

			apply( i );
			if ( i === variants.length * 2 - 1 ) warm = memory();
			if ( i % 25 === 0 ) {

				if ( timestampsSupported( renderer ) ) await renderer.resolveTimestampsAsync( 'render' );
				await new Promise( ( r ) => setTimeout( r, 0 ) ); // keep the page responsive

			}

		}

		const ms = ( performance.now() - t0 ) / iterations;
		const end = memory();
		R.check( `GPU textures stable over ${iterations} rebuilds`, end.textures - warm.textures <= 2, [ warm.textures, end.textures ], 'growth ≤ 2' );
		R.check( 'geometries stable', end.geometries - warm.geometries <= 1, [ warm.geometries, end.geometries ], 'growth ≤ 1' );
		R.info( 'average ms per rebuild + render', ms, 'compiles are cached after the first cycle' );

		// The swap must actually change the output.
		const stats = async ( i ) => { post.outputNode = variants[ i ]().node; post.needsUpdate = true; return pixelStats( await renderToPixels( renderer, SIZE, SIZE, () => post.render() ) ); };
		const plain = await stats( 0 ), poster = await stats( 1 );
		R.check( 'swapped graph changes the image', Math.abs( plain.lumaStd - poster.lumaStd ) > 0.002 || Math.abs( plain.meanLuma - poster.meanLuma ) > 0.002, [ plain.meanLuma, poster.meanLuma ], 'differs' );

		if ( current ) for ( const n of current.owned ) n.dispose();
		scenePass.dispose(); post.dispose(); target.dispose();
		disposeScene( scene );

	},
};
