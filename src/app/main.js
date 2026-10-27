// Style Lab app entry (M0): renderer bootstrap, test stage, status bar,
// Verify panel and the window.__stylelab test API (design §7.20).

import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { installErrorCapture } from './diagnostics/errors.js';
import { parseParams } from './boot/params.js';
import { createRenderer, collectCaps, backendName } from './boot/renderer.js';
import { renderToPixels, pixelStats } from './gpu/readback.js';
import { runSpikes as runSpikeSuite, SPIKES } from './spikes/index.js';
import { createVerifyPanel } from './verify/panel.js';
import { buildStage } from '../scenes/m0-stage.js';
import { timestampsSupported } from '../runtime/index.js';

const log = installErrorCapture();

/* global __STYLELAB_BUILD__ */
const BUILD = typeof __STYLELAB_BUILD__ !== 'undefined' ? __STYLELAB_BUILD__ : { version: 'dev', commit: 'dev', date: '' };

const params = parseParams( location.search );
const $ = ( id ) => document.getElementById( id );

let markReady;
const ready = new Promise( ( resolve ) => { markReady = resolve; } );

const api = { ready, build: BUILD, params, backend: null, caps: null, errors: () => log.entries.map( ( e ) => ( { ...e } ) ), spikes: SPIKES.map( ( s ) => ( { id: s.id, key: s.key, title: s.title } ) ) };
window.__stylelab = api;

boot().catch( ( e ) => {

	log.add( 'error', [ 'Boot failed:', e ] );
	const fatal = $( 'fatal' );
	fatal.hidden = false;
	fatal.textContent = `Style Lab could not start: ${e && e.message ? e.message : e}`;
	markReady( false );

} );

async function boot() {

	const canvas = $( 'view' );
	const renderer = await createRenderer( { canvas, backend: params.backend, dprCap: params.dprCap } );
	if ( renderer.backend.isWebGPUBackend ) log.attachDevice( renderer.backend.device );
	renderer.info.autoReset = false;

	api.backend = backendName( renderer );
	api.caps = await collectCaps( renderer, params.backend );

	const badge = $( 'backend-badge' );
	badge.textContent = api.backend;
	badge.className = `badge ${api.backend === 'WebGPU' ? 'gpu' : 'gl'}`;
	badge.title = api.caps.adapter ? JSON.stringify( api.caps.adapter ) : '';
	$( 'build' ).textContent = `v${BUILD.version} · ${BUILD.commit}`;

	const stage = buildStage();
	const camera = new THREE.PerspectiveCamera( 40, 1, 0.1, 200 );
	camera.position.set( 6.5, 4.6, 7.5 );
	const controls = new OrbitControls( camera, canvas );
	controls.target.set( 0, 1, 0 );
	controls.enableDamping = true;
	controls.update();

	const post = new THREE.PostProcessing( renderer );
	post.outputNode = pass( stage.scene, camera );

	const resize = () => {

		const { clientWidth: w, clientHeight: h } = canvas.parentElement;
		renderer.setSize( w, h, false );
		camera.aspect = w / Math.max( 1, h );
		camera.updateProjectionMatrix();

	};

	new ResizeObserver( resize ).observe( canvas.parentElement );
	resize();

	// Frame loop and stats.
	const stats = { fps: 0, cpuMs: 0, gpuMs: null, method: timestampsSupported( renderer ) ? 'timestamp' : 'n/a', triangles: 0, calls: 0 };
	const timer = new THREE.Timer();
	let paused = false, resolving = false, frames = 0, last = performance.now();

	const render = () => post.render();

	renderer.setAnimationLoop( () => {

		if ( paused ) return;

		timer.update();
		controls.update();
		stage.animate( timer.getElapsed() );

		const t0 = performance.now();
		renderer.info.reset();
		render();
		stats.cpuMs += ( performance.now() - t0 - stats.cpuMs ) * 0.1;
		stats.triangles = renderer.info.render.triangles;
		stats.calls = renderer.info.render.drawCalls;

		if ( stats.method === 'timestamp' && ! resolving ) {

			resolving = true;
			renderer.resolveTimestampsAsync( 'render' ).then( ( ms ) => {

				if ( ms > 0 ) stats.gpuMs = stats.gpuMs === null ? ms : stats.gpuMs + ( ms - stats.gpuMs ) * 0.1;
				resolving = false;

			} );

		}

		frames ++;
		const now = performance.now();
		if ( now - last > 500 ) {

			stats.fps = frames * 1000 / ( now - last );
			frames = 0; last = now;
			$( 'status' ).textContent = [
				api.backend,
				`${Math.round( stats.fps )} fps`,
				`CPU ${stats.cpuMs.toFixed( 2 )} ms`,
				`GPU ${stats.gpuMs === null ? 'n/a' : stats.gpuMs.toFixed( 2 ) + ' ms'}`,
				`${( stats.triangles / 1000 ).toFixed( 1 )}k tris`,
				`${stats.calls} calls`,
				`DPR ${renderer.getPixelRatio()}`,
			].join( ' · ' );

		}

	} );

	// Spikes pause the loop and render offscreen.
	const runSpikes = async ( ids = null, onResult, options ) => {

		paused = true;
		try {

			while ( resolving ) await new Promise( ( r ) => setTimeout( r, 5 ) );
			return await runSpikeSuite( { renderer, ids, onResult, options } );

		} finally {

			paused = false;

		}

	};

	const viewport = () => ( { width: renderer.domElement.width, height: renderer.domElement.height } );

	const panel = createVerifyPanel( {
		root: $( 'verify' ),
		build: BUILD,
		getEnv: () => ( { ...api.caps, viewport: viewport() } ),
		log,
		getPerf: () => ( { ...stats } ),
		runSpikes: ( onResult ) => runSpikes( null, onResult ),
	} );

	const verifyButton = $( 'verify-btn' );
	verifyButton.addEventListener( 'click', () => panel.toggle() );
	const updateCount = () => { const n = log.errors().length; verifyButton.textContent = n ? `🧪 Verify · ${n} error${n > 1 ? 's' : ''}` : '🧪 Verify'; verifyButton.classList.toggle( 'has-errors', n > 0 ); };
	log.onChange( updateCount );
	updateCount();

	Object.assign( api, {
		renderer,
		frameStats: () => ( { ...stats } ),
		/** Renders the current view offscreen and returns luma statistics. */
		capture: async ( { width = 512, height = 288 } = {} ) => {

			paused = true;
			try { return pixelStats( await renderToPixels( renderer, width, height, render ) ); } finally { paused = false; }

		},
		/** Runs spikes and returns their results; `ids` defaults to all. */
		runSpikes: async ( ids = null, options = {} ) => {

			const results = await runSpikes( ids, () => {}, options );
			if ( ! ids ) panel.setSpikes( results );
			return results;

		},
		report: () => panel.report(),
	} );

	// First presented frame, then ready.
	await new Promise( ( r ) => requestAnimationFrame( () => requestAnimationFrame( r ) ) );
	markReady( true );

	if ( params.spikes ) {

		panel.toggle( true );
		await panel.startSpikes();

	}

}
