// Style Lab app entry: renderer bootstrap, the app controller and its UI, the frame
// loop with GPU timing, the Verify panel and the window.__stylelab test API (§7.20).

import * as THREE from 'three/webgpu';
import { installErrorCapture } from './diagnostics/errors.js';
import { parseParams } from './boot/params.js';
import { createRenderer, collectCaps, backendName } from './boot/renderer.js';
import { renderToPixels, withRendererSize, pixelStats, stepNodeFrame } from './gpu/readback.js';
import { runSpikes as runSpikeSuite, SPIKES } from './spikes/index.js';
import { createVerifyPanel } from './verify/panel.js';
import { createOnboarding } from './ui/onboarding.js';
import { CHECKS } from './verify/checks.js';
import { TOUR } from './verify/tour.js';
import { createKeysOverlay } from './ui/keys.js';
import { createApp } from './app.js';
import { createTopBar } from './ui/topbar.js';
import { createGallery } from './ui/gallery.js';
import { createBriefModal } from './ui/brief.js';
import { exportFiles, exportZip, briefText, looksJson } from './export/exports.js';
import { bakeGradeLut } from './export/grade.js';
import { createAuditModal } from './ui/audit.js';
import { createLessonPlayer } from './ui/lessons.js';
import { critique, STYLE_EXCEPTIONS } from './analysis/critic.js';
import { whatChanged } from './analysis/changes.js';
import { LESSONS } from '../content/lessons.js';
import { runAudit, AUDIT_TARGETS } from './perf/audit.js';
import { createInspector } from './ui/inspector.js';
import { createCompareUI } from './ui/compare.js';
import { $, h, toast } from './ui/dom.js';
import { bindKeyboard } from './input/keyboard.js';
import { createGamepad } from './input/gamepad.js';
import { createTouchControls } from './input/touch.js';
import { LOOKS } from '../content/looks/index.js';
import { EFFECT_DEMOS, cellId } from '../content/effects.js';
import { SCENES, TIERS, sceneById } from '../scenes/index.js';
import { loadRapier, replay } from './physics/world.js';
import { timestampsSupported } from '../runtime/index.js';
import { parseShareHash } from '../runtime/look/share.js';
import { resolvedHash } from '../runtime/look/resolve.js';

const log = installErrorCapture();

/* global __STYLELAB_BUILD__ */
const BUILD = typeof __STYLELAB_BUILD__ !== 'undefined' ? __STYLELAB_BUILD__ : { version: 'dev', commit: 'dev', date: '' };

const params = parseParams( location.search );

let markReady;
const ready = new Promise( ( resolve ) => { markReady = resolve; } );

const api = { ready, build: BUILD, params, backend: null, caps: null, errors: () => log.entries.map( ( e ) => ( { ...e } ) ), spikes: SPIKES.map( ( s ) => ( { id: s.id, key: s.key, title: s.title } ) ) };
window.__stylelab = api;

boot().catch( ( e ) => {

	log.add( 'error', [ 'Boot failed:', e ] );
	const fatal = $( 'fatal' );
	fatal.hidden = false;
	const webgl = new URLSearchParams( location.search ).get( 'backend' ) === 'webgl';
	fatal.replaceChildren(
		h( 'b', {}, 'Style Lab could not start.' ),
		h( 'p', {}, `${e && e.message ? e.message : e}` ),
		h( 'p', {}, 'Things to try: an up-to-date Chrome, Edge, Safari or Firefox; turn on hardware acceleration in the browser settings; update the graphics driver.' ),
		h( 'p', {}, webgl ? h( 'a', { href: location.pathname }, 'Try WebGPU again' ) : h( 'a', { href: `${location.pathname}?backend=webgl` }, 'Retry with WebGL2' ), ' · The 🧪 Verify drawer can\'t open, so please copy this message and paste it back.' ),
		h( 'button', { onclick: async ( ev ) => {

			const text = `Style Lab ${BUILD.version} (${BUILD.commit}) could not start: ${e && e.message ? e.message : e}\n${navigator.userAgent}\n${location.href}`;
			try { await navigator.clipboard.writeText( text ); ev.target.textContent = 'Copied'; } catch { ev.target.textContent = 'Select the text above and copy it'; }

		} }, 'Copy the message' ),
	);
	markReady( false );

} );

const nextFrames = ( n = 2 ) => new Promise( ( resolve ) => { let k = 0; const f = () => ( ++ k >= n ? resolve() : requestAnimationFrame( f ) ); requestAnimationFrame( f ); } );

/** First-run coach marks (§5.2). Each can be dismissed; they don't come back. */
function createCoach( app ) {

	const el = $( 'coach' );
	const tried = new Set();
	const seen = ( id ) => app.store.get().tips.seen.includes( id );
	const mark = ( id ) => { if ( ! seen( id ) ) app.store.set( { tips: { seen: [ ...app.store.get().tips.seen, id ] } } ); };
	let current = null;

	const show = ( id, text ) => {

		if ( seen( id ) ) return;
		current = id;
		el.replaceChildren( h( 'span', {}, text ), h( 'button', { onclick: () => { mark( id ); el.hidden = true; } }, '✕' ) );
		el.hidden = false;

	};

	const done = ( id ) => { mark( id ); if ( current === id ) el.hidden = true; };

	app.on( ( type, detail ) => {

		if ( type === 'look' && detail.id !== 'plain' ) {

			tried.add( detail.id );
			done( 'start' );
			show( 'compare', 'Hold Space (or Hold to compare) to see the difference against the plain baseline.' );
			if ( tried.size >= 3 ) show( 'tiers', 'Try Complexity in the top bar: stylization lifts blockout geometry the most.' );

		}

		if ( type === 'hold' && detail ) done( 'compare' );
		if ( type === 'scene' && seen( 'compare' ) && tried.size >= 3 ) done( 'tiers' );

	} );

	show( 'start', 'This is what a typical agent-made scene looks like. Pick a look in the gallery (or press 2).' );

}

/**
 * Mean absolute difference (0–1) between two pixel buffers. With `shift: [dx, dy]`, pixel
 * (x, y) of `q` is compared with (x + dx, y + dy) of `p` over the overlap. `rect` limits
 * it to a region, in fractions of the image: [x0, y0, x1, y1].
 */
function pixelDiff( p, q, { shift = [ 0, 0 ], rect = [ 0, 0, 1, 1 ] } = {} ) {

	const [ dx, dy ] = shift, W = p.width, H = p.height;
	const [ x0, y0, x1, y1 ] = [ rect[ 0 ] * W, rect[ 1 ] * H, rect[ 2 ] * W, rect[ 3 ] * H ].map( Math.round );
	let sum = 0, n = 0;
	for ( let y = Math.max( y0, - dy ); y < Math.min( y1, H - dy ); y ++ ) for ( let x = Math.max( x0, - dx ); x < Math.min( x1, W - dx ); x ++ ) {

		const i = ( y * W + x ) * 4, j = ( ( y + dy ) * W + x + dx ) * 4;
		sum += Math.abs( q.data[ i ] - p.data[ j ] ) + Math.abs( q.data[ i + 1 ] - p.data[ j + 1 ] ) + Math.abs( q.data[ i + 2 ] - p.data[ j + 2 ] ); n += 3;

	}

	return { mae: n ? sum / n / 255 : 0 };

}

async function boot() {

	if ( new URLSearchParams( location.search ).get( 'simulate' ) === 'boot-error' ) throw new Error( 'Simulated start-up failure (?simulate=boot-error).' );
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

	const app = createApp( { renderer, canvas } );
	const appRoot = $( 'app' );

	createTopBar( app );
	let lastBuildMs = 0;
	app.on( ( type, d ) => { if ( type === 'scene' ) lastBuildMs = Math.round( d.buildMs ); } );
	const readouts = () => ( {
		triangles: app.built?.triangles ?? 0,
		objects: app.built?.objects ?? 0,
		calls: renderer.info.render.drawCalls,
		materials: app.runtime.materials.styled.size + app.runtime.materials.plain.size + app.runtime.materials.hulls.size,
		geometries: renderer.info.memory.geometries,
		buildMs: lastBuildMs,
	} );

	const showImage = ( url, title ) => {

		const modal = $( 'modal' );
		modal.replaceChildren( h( 'div.modal-box', {},
			h( 'header', {}, h( 'b', {}, title ), h( 'a', { href: url, download: `${title.replace( /[^a-z0-9]+/gi, '-' ).toLowerCase()}.png` }, 'Download PNG' ), h( 'button', { onclick: () => { modal.hidden = true; } }, '✕' ) ),
			h( 'img', { src: url, alt: title } ),
		) );
		modal.hidden = false;

	};

	const shareURL = async () => `${location.origin}${location.pathname}${location.search}${await app.actions.shareHash()}`;
	// Lessons and the Analyze tab (M8) are wired after the modals they drive exist.
	let lessonPlayer = null, analyzeFrame = null;
	const inspector = createInspector( $( 'inspector' ), app, { readouts, benefitMatrix: () => api.benefitMatrix(), showImage, toast, share: shareURL, startLesson: ( l ) => lessonPlayer.start( l ), analyze: () => analyzeFrame(), whatChanged: () => measureChanges( { notify: false } ) } );

	// Drop a .glb anywhere to import it; click in the view to pick parts.
	window.addEventListener( 'dragover', ( e ) => { e.preventDefault(); } );
	window.addEventListener( 'drop', ( e ) => {

		e.preventDefault();
		const file = [ ...( e.dataTransfer?.files || [] ) ].find( ( f ) => /\.(glb|gltf)$/i.test( f.name ) );
		const lookFile = [ ...( e.dataTransfer?.files || [] ) ].find( ( f ) => /\.json$/i.test( f.name ) );
		const cubeFile = [ ...( e.dataTransfer?.files || [] ) ].find( ( f ) => /\.cube$/i.test( f.name ) );
		if ( cubeFile ) {

			cubeFile.text().then( ( t ) => { const r = app.actions.importCube( t, cubeFile.name ); toast( `Imported the LUT "${r.title}" (${r.size}³): Grade → LUT preset is now Imported .cube.` ); } ).catch( ( err ) => toast( `LUT import failed: ${err.message}`, 6000 ) );

		} else if ( file ) { inspector.setTab( 'scene' ); inspector.sceneTab.importFile( file ); } else if ( lookFile ) {

			lookFile.text().then( ( t ) => { const l = app.actions.importLook( JSON.parse( t ) ); toast( `Imported "${l.name}" into My looks.` ); } ).catch( ( err ) => toast( `Import failed: ${err.message}`, 6000 ) );

		} else if ( e.dataTransfer?.files?.length ) toast( 'Drop a .glb or .gltf file to import it, a look .json, or a .cube LUT.' );

	} );

	// Click: pick a part (pick tool) or throw a ball (toybox). Drag in walk mode looks around.
	let down = null, dragAt = null;
	canvas.addEventListener( 'pointerdown', ( e ) => { down = dragAt = [ e.clientX, e.clientY ]; } );
	canvas.addEventListener( 'pointermove', ( e ) => {

		if ( ! dragAt || ! app.walking || ! e.buttons ) return;
		app.walkInput.mouse[ 0 ] += ( e.clientX - dragAt[ 0 ] ) * 0.005;
		app.walkInput.mouse[ 1 ] += ( e.clientY - dragAt[ 1 ] ) * 0.004;
		dragAt = [ e.clientX, e.clientY ];

	} );
	canvas.addEventListener( 'pointerup', ( e ) => {

		const click = down && Math.hypot( e.clientX - down[ 0 ], e.clientY - down[ 1 ] ) <= 5;
		down = dragAt = null;
		if ( ! click ) return;
		const r = canvas.getBoundingClientRect();
		const x = ( e.clientX - r.left ) / r.width * 2 - 1, y = - ( ( e.clientY - r.top ) / r.height * 2 - 1 );
		if ( inspector.sceneTab.picking ) app.actions.pick( x, y );
		else if ( app.physics && app.scene().spareBalls ) app.actions.throwBall( x, y );

	} );
	const compareUI = createCompareUI( app );
	const touch = createTouchControls( $( 'viewport' ), app, { force: new URLSearchParams( location.search ).get( 'touch' ) === '1' } );

	// Brief and export (§6.12).
	const briefRoot = h( 'div.modal', { id: 'brief-modal', hidden: true } );
	document.body.append( briefRoot );
	const briefModal = createBriefModal( briefRoot, app, { share: shareURL, toast } );
	$( 'brief-btn' ).addEventListener( 'click', () => briefModal.open( 'brief' ) );

	// Performance audit (§6.11): the loop pauses, the renderer takes the target size, the
	// state is restored exactly afterwards.
	const auditRoot = h( 'div.modal', { id: 'audit-modal', hidden: true } );
	document.body.append( auditRoot );
	let pausedWhileRef = null;
	const runAuditNow = ( { target = 'desktop', onProgress, rounds = 3, frames = 60, warmup = 20 } = {} ) => pausedWhileRef( async () => {

		const t = AUDIT_TARGETS[ target ] || AUDIT_TARGETS.desktop;
		const cam = app.camera, aspect = cam.aspect, frozen0 = app.frozenTime;
		const [ w, hgt ] = t.width ? [ t.width, t.height ] : [ renderer.domElement.width, renderer.domElement.height ];
		app.actions.freeze( frozen0 ?? 1 );
		try {

			return await withRendererSize( renderer, w, hgt, async () => {

				cam.aspect = w / hgt;
				cam.updateProjectionMatrix();
				app.tick( 0 );
				return runAudit( { app, renderer, target, onProgress, rounds, frames, warmup } );

			} );

		} finally {

			app.runtime.apply( app.resolved );
			cam.aspect = aspect;
			cam.updateProjectionMatrix();
			app.actions.freeze( frozen0 );
			app.emit( 'audited' );

		}

	} );
	const phoneUrl = async ( target ) => `${location.origin}${location.pathname}?audit=${target}${await app.actions.shareHash()}`;
	const auditModal = createAuditModal( auditRoot, app, { run: runAuditNow, phoneUrl, env: () => ( { adapter: api.caps?.adapter ? `${api.caps.adapter.vendor || ''} ${api.caps.adapter.architecture || ''}`.trim() : '', backend: api.backend, userAgent: navigator.userAgent } ), toast } );
	$( 'audit-btn' ).addEventListener( 'click', () => auditModal.open() );

	// Lesson player (§6.13): a caption bar over the viewport.
	const lessonRoot = h( 'div.lesson-bar', { hidden: true } );
	$( 'viewport' ).append( lessonRoot );
	lessonPlayer = createLessonPlayer( lessonRoot, app, {
		setView: ( id ) => app.actions.setView( id ),
		openBrief: ( tab ) => briefModal.open( tab ),
		runQuickAudit: () => runAuditNow( { target: 'small', rounds: 1, frames: 4, warmup: 2 } ),
		setTab: ( tab ) => { inspector.setTab( tab ); appRoot.classList.add( 'inspector-open' ); },
		toast,
	} );
	// The critic reads a 160 × 90 frame of the look itself (not a designer view).
	analyzeFrame = async () => {

		if ( app.store.get().view ) return { tips: [], stats: null, pixels: new Uint8Array( 160 * 90 * 4 ), viewActive: true };
		const c = await api.capture( { width: 160, height: 90 } );
		const px = captures.get( c.id );
		return { ...critique( px.data, app.target.global, { tier: app.store.get().tier, focus: subjectAt( 160, 90 ), lookId: app.store.get().recipe.base } ), pixels: px.data };

	};

	/** The subject's pixel position in a w × h frame: the walking hero, else the scene's focus point. */
	const subjectAt = ( w, hgt ) => {

		const at = app.walking ? app.walk.position().map( ( v, i ) => ( i === 1 ? v + 0.9 : v ) ) : app.scene().focus;
		if ( ! at ) return null;
		const cam = app.camera.clone();
		cam.aspect = w / hgt;
		cam.updateProjectionMatrix();
		cam.updateMatrixWorld();
		const p = new THREE.Vector3( ...at ).project( cam );
		return Math.abs( p.x ) <= 1 && Math.abs( p.y ) <= 1 && p.z < 1 ? [ ( p.x + 1 ) / 2 * w, ( 1 - p.y ) / 2 * hgt ] : null;

	};
	// What changed (§6.13, P2): after you let go of hold-to-compare, the plain and the styled
	// frame are read back small and compared; the summary is a toast and lands in Analyze.
	const measureChanges = ( { notify = true } = {} ) => pausedWhileRef( async () => {

		const [ w, hgt ] = [ 160, 90 ];
		// Plain, then styled, in one job (nothing else renders in between); the compare
		// uniforms go back to exactly what they were.
		const U = app.runtime.U, before = { hold: U.hold.value, split: U.split.value, flicker: U.flicker.value };
		let plain, styled;
		try {

			app.runtime.setCompare( { hold: true, split: false, flicker: false } );
			plain = await captureNow( { width: w, height: hgt } );
			app.runtime.setCompare( { hold: false } );
			styled = await captureNow( { width: w, height: hgt } );

		} finally {

			U.hold.value = before.hold; U.split.value = before.split; U.flicker.value = before.flicker;

		}

		const r = whatChanged( captures.get( plain.id ).data, captures.get( styled.id ).data, w, hgt, { focus: subjectAt( w, hgt ) } );
		app.emit( 'changed', r );
		if ( notify ) toast( `What changed: ${r.summary}`, 6000 );
		return r;

	} );
	let heldAt = 0, changeTimer = null;
	app.on( ( type, on ) => {

		if ( type !== 'hold' ) return;
		clearTimeout( changeTimer );
		if ( on ) { heldAt = performance.now(); return; }
		// Only after a real look at the baseline (not a tap), once the key is up for a moment, and
		// not under automation (scripted holds happen mid-test; the API measures on request).
		if ( performance.now() - heldAt > 250 && app.store.get().showChanges !== false && ! navigator.webdriver ) changeTimer = setTimeout( () => measureChanges().catch( ( e ) => log.add( 'warn', [ 'What changed:', e ] ) ), 400 );

	} );

	// Help (M9): the shortcut overlay (?) and the first-run welcome.
	const keysRoot = h( 'div.modal', { id: 'keys-modal', hidden: true } );
	const welcomeRoot = h( 'div.modal', { id: 'welcome-modal', hidden: true } );
	document.body.append( keysRoot, welcomeRoot );
	const keys = createKeysOverlay( keysRoot );
	let onboarding = null;
	$( 'help-btn' ).addEventListener( 'click', () => keys.toggle() );

	const ui = {
		cycleDesignerView: () => { const view = app.actions.cycleView(); toast( view ? `${view.label}: ${view.learn}` : 'Designer view off' ); },
		openBrief: () => briefModal.open( 'brief' ),
		openAudit: () => auditModal.open(),
		openTour: () => panel.toggle( true ),
		inspector,
		toggleHidden: () => appRoot.classList.toggle( 'ui-hidden' ),
		showKeys: () => keys.toggle(),
		closePanels: () => { $( 'verify' ).hidden = true; briefModal.close(); auditModal.close(); keys.close(); onboarding?.close(); appRoot.classList.remove( 'inspector-open', 'ui-hidden' ); },
		/** The panel the D-pad navigates: the topmost open modal, the tour drawer, or the inspector drawer. */
		activePanel: () => [ 'welcome-modal', 'keys-modal', 'modal', 'brief-modal', 'audit-modal' ].map( $ ).find( ( el ) => el && ! el.hidden ) || ( $( 'verify' ).hidden ? null : $( 'verify' ) ) || ( appRoot.classList.contains( 'inspector-open' ) ? $( 'inspector' ) : null ),
		toast,
	};

	$( 'inspector-btn' ).addEventListener( 'click', () => appRoot.classList.toggle( 'inspector-open' ) );
	bindKeyboard( app, ui );
	const gamepad = createGamepad( app, ui, { onConnect: ( info ) => toast( info.connected ? `Gamepad connected (${info.glyphs}${info.mapping === 'standard' ? '' : ', non-standard mapping'})` : 'Gamepad disconnected' ) } );

	// Rebuild and scene-build feedback: compile time is shown, never gated (§9 M1).
	const chip = $( 'rebuild-chip' );
	let chipTimer = null, pendingChip = null;
	const showChip = ( text ) => { chip.textContent = text; clearTimeout( chipTimer ); chipTimer = setTimeout( () => { chip.textContent = ''; }, 5000 ); };
	app.on( ( type, detail ) => {

		if ( type === 'resolved' ) {

			const r = detail.rebuilt;
			const what = [ r.parts.length ? `materials (${r.parts.length === 9 ? 'all parts' : r.parts.join( ', ' )})` : '', r.pass ? 'scene pass' : '', r.graph ? 'post graph' : '' ].filter( Boolean );
			if ( what.length ) pendingChip = `Rebuilt ${what.join( ' + ' )}`;

		}

		if ( type === 'scene' ) pendingChip = `Built ${detail.scene.name} · ${TIERS[ detail.tier ].name} · ${( detail.triangles / 1000 ).toFixed( 1 )}k triangles in ${Math.round( detail.buildMs )} ms`;

	} );

	createCoach( app );

	const resize = () => {

		const { clientWidth: w, clientHeight: h } = canvas.parentElement;
		if ( ! w || ! h ) return; // collapsed for a moment: keep the last size (WebGPU rejects empty textures)
		renderer.setSize( w, h, false );
		app.camera.aspect = w / Math.max( 1, h );
		app.camera.updateProjectionMatrix();

	};

	new ResizeObserver( resize ).observe( canvas.parentElement );
	resize();
	app.start();

	// Frame loop and stats.
	const stats = { fps: 0, cpuMs: 0, gpuMs: null, method: timestampsSupported( renderer ) ? 'timestamp' : 'n/a', triangles: 0, calls: 0 };
	const timer = new THREE.Timer();
	let paused = false, held = false, resolving = false, frames = 0, last = performance.now();

	renderer.setAnimationLoop( () => {

		if ( paused || held ) return;

		timer.update();
		const dt = Math.min( 0.1, timer.getDelta() );
		gamepad.poll( dt );
		app.tick( dt );

		const t0 = performance.now();
		renderer.info.reset();
		app.runtime.render();
		stats.cpuMs += ( performance.now() - t0 - stats.cpuMs ) * 0.1;
		stats.triangles = renderer.info.render.triangles;
		stats.calls = renderer.info.render.drawCalls;
		compareUI.frame();

		if ( pendingChip ) {

			const ms = app.runtime.info.lastCompileMs;
			showChip( `${pendingChip}${ms !== null ? ` · first frame ${Math.round( ms )} ms` : ''}` );
			pendingChip = null;

		}

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
				`GPU ${stats.gpuMs === null ? 'n/a' : stats.gpuMs.toFixed( 2 ) + ' ms'}`,
				`CPU ${stats.cpuMs.toFixed( 2 )} ms`,
				`${( stats.triangles / 1000 ).toFixed( 1 )}k tris`,
				`${stats.calls} calls`,
			].join( ' · ' );

		}

	} );

	// Offscreen jobs (captures, the audit, spikes, gallery previews) run one at a time with
	// the loop paused until the last one ends: two jobs interleaving would resize the
	// renderer under each other (the Analyze tab's critic used to capture during an audit).
	let jobs = Promise.resolve(), pendingJobs = 0;
	const pausedWhile = pausedWhileRef = ( fn ) => {

		pendingJobs ++;
		paused = true;
		const job = jobs.then( async () => {

			while ( resolving ) await new Promise( ( r ) => setTimeout( r, 5 ) );
			return fn();

		} );
		jobs = job.catch( () => {} ).finally( () => { if ( -- pendingJobs === 0 ) paused = false; } );
		return job;

	};

	// Gallery previews: each look alone on the current scene, rendered offscreen with the
	// loop paused; the state on screen is restored afterwards.
	const thumbnails = ( ids, onOne ) => pausedWhile( async () => {

		const out = {};
		const [ w, hgt ] = [ 240, 135 ];
		const cam = app.camera, aspect = cam.aspect;
		cam.aspect = w / hgt;
		cam.updateProjectionMatrix();
		try {

			await withRendererSize( renderer, w, hgt, async () => {

				for ( const id of ids ) {

					app.runtime.apply( app.resolveFor( id ) );
					app.runtime.update( app.frozenTime ?? 1, { focus: app.controls.target } );
					app.runtime.P.get( 'lens.motionBlur.shutter' ).value = 0; // a still: no motion, no blur
					stepNodeFrame( renderer );
					await renderToPixels( renderer, w, hgt, () => app.runtime.render() ); // compiles
					stepNodeFrame( renderer );
					const px = await renderToPixels( renderer, w, hgt, () => app.runtime.render() );
					const c = document.createElement( 'canvas' );
					c.width = w; c.height = hgt;
					c.getContext( '2d' ).putImageData( new ImageData( new Uint8ClampedArray( px.data ), w, hgt ), 0, 0 );
					out[ id ] = c.toDataURL( 'image/jpeg', 0.85 );
					onOne?.( id, out[ id ] );

				}

			} );

		} finally {

			app.runtime.apply( app.resolved );
			cam.aspect = aspect;
			cam.updateProjectionMatrix();

		}

		return out;

	} );
	const gallery = createGallery( $( 'looks' ), app, { thumbnails } );

	// Spikes pause the loop and render offscreen.
	const runSpikes = ( ids = null, onResult, options ) => pausedWhile( () => runSpikeSuite( { renderer, ids, onResult, options } ) );

	const viewport = () => ( { width: renderer.domElement.width, height: renderer.domElement.height } );

	const setup = ( s ) => {

		if ( s.scene ) app.actions.setScene( s.scene, { tier: s.tier, shot: s.shot } );
		else if ( s.tier !== undefined ) app.actions.setTier( s.tier );
		// A check starts from a clean slate: no part looks, scope or isolate unless it sets them.
		app.actions.setScope( null );
		app.actions.setIsolate( null );
		if ( Object.keys( app.store.get().parts ).length || s.parts ) app.actions.setParts( s.parts || {} );
		if ( s.look ) app.actions.setLook( s.look, { transition: false } );
		if ( s.recipe ) app.actions.setRecipe( s.recipe );
		if ( s.params ) for ( const [ id, value ] of Object.entries( s.params ) ) app.actions.setParam( id, value, { part: null } );
		if ( s.tab ) { inspector.setTab( s.tab ); appRoot.classList.add( 'inspector-open' ); }
		if ( s.walk ) app.actions.setWalk( true ).catch( ( e ) => toast( e.message ) );
		else if ( app.walking ) app.actions.setWalk( false );
		toast( s.walk ? 'Set up in walk mode: close this panel (✕ or Esc), then WASD or the left stick.' : 'Set up. Close this panel (✕ or Esc) to try it.' );

	};

	const effectSheetFor = async ( demos, title ) => {

		toast( `Rendering ${demos.length} effect cells…`, 60000 );
		let n = 0;
		const r = await api.effectSheet( { ids: demos.map( ( d ) => d.id ), cell: [ 480, 270 ], cols: 5, onCell: () => toast( `Rendering effect cells… ${++ n} / ${demos.length}`, 60000 ) } );
		toast( 'Effects sheet ready.' );
		showImage( r.url, title );

	};

	const panel = createVerifyPanel( {
		root: $( 'verify' ),
		build: BUILD,
		getEnv: () => ( { ...api.caps, viewport: viewport() } ),
		log,
		getPerf: () => ( { ...stats } ),
		runSpikes: ( onResult ) => runSpikes( null, onResult ),
		setup,
		names: Object.fromEntries( [ ...LOOKS, ...SCENES ].map( ( x ) => [ x.id, x.name ] ) ),
		startLesson: ( id ) => lessonPlayer.start( id ),
		extraActions: {
			openBrief: async () => { $( 'verify' ).hidden = true; briefModal.open( 'brief' ); },
			openFiles: async () => { $( 'verify' ).hidden = true; briefModal.open( 'files' ); },
			openShare: async () => { $( 'verify' ).hidden = true; briefModal.open( 'share' ); },
			openAudit: async () => { $( 'verify' ).hidden = true; auditModal.open(); },
			showWelcome: async () => { $( 'verify' ).hidden = true; onboarding.show(); },
			showKeys: async () => { $( 'verify' ).hidden = true; keys.show(); },
			effectSheet: async () => effectSheetFor( EFFECT_DEMOS.filter( ( d ) => d.milestone.startsWith( 'M3' ) ), 'Effects contact sheet (report bad cells by id)' ),
			effectSheetP2: async () => effectSheetFor( EFFECT_DEMOS.filter( ( d ) => d.milestone === 'M10' ), 'New effects contact sheet, v1.1 (report bad cells by id)' ),
		},
	} );

	onboarding = createOnboarding( welcomeRoot, app, {
		openTour: () => panel.toggle( true ),
		startLesson: ( id ) => lessonPlayer.start( id ),
		showKeys: () => keys.show(),
	} );

	const verifyButton = $( 'verify-btn' );
	verifyButton.addEventListener( 'click', () => panel.toggle() );
	const updateCount = () => { const n = log.errors().length; verifyButton.textContent = n ? `🧪 Verify · ${n} error${n > 1 ? 's' : ''}` : '🧪 Verify'; verifyButton.classList.toggle( 'has-errors', n > 0 ); };
	log.onChange( updateCount );
	updateCount();

	// Captures keep their pixels so diff() can compare them.
	const captures = new Map();
	let captureId = 0;

	/**
	 * Renders the current view offscreen; returns { id, stats, hash }. `advance` moves the
	 * (frozen) clock between the warm-up and the captured frame, for effects that need
	 * motion; `viewOffset` pans the image plane by whole screen pixels [x, y]. Call it inside
	 * a job (pausedWhile); api.capture does.
	 */
	const captureNow = async ( { width = 512, height = 288, advance = 0, viewOffset = null } = {} ) => {

		const cam = app.camera, aspect = cam.aspect;
		const shutter = app.runtime.P.get( 'lens.motionBlur.shutter' ), shutter0 = shutter.value;
		cam.aspect = width / height;
		if ( viewOffset ) cam.setViewOffset( width, height, viewOffset[ 0 ], viewOffset[ 1 ], width, height );
		cam.updateProjectionMatrix();
		const t0 = app.frozenTime;

		try {

			const px = await withRendererSize( renderer, width, height, async () => {

				app.tick( 0 );
				// A still capture has no motion, so no motion blur: renders outside the animation
				// loop would otherwise read stale previous-frame matrices in the velocity buffer.
				if ( ! advance ) shutter.value = 0;
				stepNodeFrame( renderer );
				await renderToPixels( renderer, width, height, () => app.runtime.render() ); // warm-up: compiles after rebuilds
				if ( advance && t0 !== null ) { app.actions.freeze( t0 + advance ); app.tick( 0 ); }
				stepNodeFrame( renderer );
				const pixels = await renderToPixels( renderer, width, height, () => app.runtime.render() );
				// With trackTimestamp on, unresolved queries pile up while the loop is paused.
				if ( stats.method === 'timestamp' ) await renderer.resolveTimestampsAsync( 'render' );
				return pixels;

			} );
			const id = ++ captureId;
			captures.set( id, px );
			if ( captures.size > 64 ) captures.delete( captures.keys().next().value );
			// FNV-1a over the pixels: equal hashes mean identical frames (determinism checks).
			let hash = 0x811c9dc5;
			for ( let i = 0; i < px.data.length; i ++ ) hash = Math.imul( hash ^ px.data[ i ], 16777619 );
			return { id, stats: pixelStats( px ), hash: ( hash >>> 0 ).toString( 16 ) };

		} finally {

			if ( advance && t0 !== null ) app.actions.freeze( t0 );
			shutter.value = shutter0;
			if ( viewOffset ) cam.clearViewOffset();
			cam.aspect = aspect;
			cam.updateProjectionMatrix();

		}

	};


	Object.assign( api, {
		renderer,
		app,
		version: BUILD.version,
		frameStats: () => ( { ...stats } ),
		scenes: () => SCENES.map( ( s ) => ( { id: s.id, name: s.name, shots: Object.keys( s.shots ) } ) ),
		looks: () => app.libraryLooks().map( ( l ) => ( { id: l.id, name: l.name, family: l.family || l.id } ) ),
		/** Replaces the recipe (§6.6): { base, modules: { [module]: { from, blend: { with, t }, mute, solo } }, morph }. */
		setRecipe: async ( recipe ) => { app.actions.setRecipe( recipe ); await nextFrames(); },
		/** Replaces every part's state (§6.7): { [part]: { look, modules, overrides } }. */
		setParts: async ( parts ) => { app.actions.setParts( parts ); await nextFrames(); },
		setTransition: ( patch ) => app.actions.setTransition( patch ),
		/** Advances the app clock by dt seconds (drives transitions while captures are paused). */
		tick: ( dt ) => app.tick( dt ),
		/** Stops (true) or restarts the render loop, so another page in the browser gets the GPU. */
		pauseLoop: ( on ) => { held = !! on; },
		/** The current state as a share URL hash (`#state=…`), and opening one. */
		shareHash: () => app.actions.shareHash(),
		openShare: async ( hash ) => { const p = parseShareHash( hash ); if ( ! p ) throw new Error( 'not a share hash' ); await app.actions.openShare( p.kind, p.text ); await nextFrames(); },
		/** A short hash of the resolved values on screen: equal hashes mean the same look. */
		resolvedHash: () => resolvedHash( app.resolved ),
		coherence: () => app.coherence(),
		/** Renders the gallery's look previews on the current scene. */
		galleryPreviews: () => gallery.refresh(),
		// M6: brief and exports
		brief: ( opts ) => briefText( app, opts ),
		looksJson: () => looksJson( app ),
		/** One export file by name: its text, or a data URL for images. */
		exportFile: async ( name ) => { const f = exportFiles( app, { share: shareURL } ).find( ( x ) => x.name === name || ( name === 'look.json' && x.name.endsWith( '.look.json' ) ) ); if ( ! f ) throw new Error( `no export ${name}` ); return f.make(); },
		exportNames: () => exportFiles( app, { share: shareURL } ).map( ( f ) => f.name ),
		/** Every export file as one zip: { names, size, head } (head: the first bytes, as numbers). */
		exportZip: async () => { const z = await exportZip( app, { share: shareURL } ); return { names: z.names, size: z.bytes.length, head: [ ...z.bytes.slice( 0, 4 ) ], bytes: btoa( String.fromCharCode( ...z.bytes.slice( - 22 ) ) ) }; },
		/** Gamepad layer info (connected, glyphs, rumbles played) and the touch controls. */
		padInfo: () => ( { ...gamepad.info } ),
		touchVisible: () => touch.visible,
		/** Shows the touch controls in walk mode on any screen (?touch=1 does the same at load). */
		forceTouch: ( on ) => { touch.force = on; return touch.visible; },
		activePanel: () => ui.activePanel()?.id ?? null,
		/** The baked grade LUT (33³ RGBA floats, .cube order) for the current look. */
		bakeGrade: async () => Array.from( await bakeGradeLut( renderer, app.target.global ) ),
		/** Opens the brief modal on a tab; returns its text, including the brief's textarea. */
		openBrief: async ( tab ) => {

			briefModal.open( tab );
			const t0 = performance.now();
			const body = () => document.querySelector( '#brief-modal .brief-body' );
			do await nextFrames( 2 ); while ( /Preparing/.test( body()?.innerText || '' ) && performance.now() - t0 < 30000 );
			return body() ? [ body().innerText, ...[ ...body().querySelectorAll( 'textarea' ) ].map( ( t ) => t.value ) ].join( '\n' ) : '';

		},
		// M7: performance audit
		/** Runs the audit: { target: 'small' | 'desktop' | …, rounds, frames, warmup } → the report. */
		audit: ( opts ) => runAuditNow( opts ),
		// M9: the tour, onboarding and error messages
		/** Counts for the Verify tour: { checks, sections, signoffs }. */
		tour: () => ( { checks: CHECKS.length, sections: TOUR.length, signoffs: CHECKS.filter( ( c ) => c.signoff !== false ).length } ),
		checkSetup: ( id ) => CHECKS.find( ( c ) => c.id === id )?.setup || null,
		showWelcome: async () => { onboarding.show(); await nextFrames(); },
		/** Opens a share hash as if pasted into the address bar; returns the message shown. */
		openShareLink: async ( hash ) => ( { toast: await openSharedHash( hash ) } ),
		// M8: education
		setView: async ( id ) => { app.actions.setView( id ); await nextFrames(); },
		/** What changed between the plain baseline and the look on the current frame: { summary, changes }. */
		whatChanged: () => measureChanges( { notify: false } ),
		/** The critic on the current frame: { tips, stats }. */
		critique: async () => { const r = await analyzeFrame(); return { tips: r.tips, stats: r.stats }; },
		/** The built-in looks where a critic rule is part of the style (see analysis/critic.js). */
		styleExceptions: () => STYLE_EXCEPTIONS,
		lessons: {
			list: () => LESSONS.map( ( l ) => ( { id: l.id, title: l.title, steps: l.steps.length } ) ),
			start: async ( id ) => { lessonPlayer.start( id ); await nextFrames(); return lessonPlayer.state(); },
			next: async () => { lessonPlayer.next(); await nextFrames(); return lessonPlayer.state(); },
			back: async () => { lessonPlayer.back(); await nextFrames(); return lessonPlayer.state(); },
			solve: async () => { const ok = await lessonPlayer.solve(); await nextFrames(); return ok; },
			state: () => lessonPlayer.state(),
			stop: () => lessonPlayer.stop(),
		},
		phoneUrl: ( target ) => phoneUrl( target ),
		// M5: walk mode, physics, zones, plans, modes
		setWalk: async ( on ) => { const r = await app.actions.setWalk( on ); await nextFrames(); return r; },
		/** Moves the walking player's feet to [x, y, z]. */
		walkTo: async ( p ) => { app.actions.walkTo( p ); await nextFrames(); },
		throwBall: ( x, y ) => !! app.actions.throwBall( x, y ),
		physicsReady: () => app.physicsReady(),
		/** Replays a scene's physics from scratch with scripted throws: { hash, moved, steps }. */
		physicsReplay: async ( sceneId = 'toybox', seed ) => replay( await loadRapier(), sceneById.get( sceneId ), { seed } ),
		zones: () => app.zoneWeights().map( ( { zone, weight } ) => ( { id: zone.id, weight } ) ),
		undo: () => app.actions.undo(),
		redo: () => app.actions.redo(),
		setScene: async ( id, opts ) => { app.actions.setScene( id, opts ); await nextFrames(); },
		setDensity: async ( d ) => { app.actions.setDensity( d ); await nextFrames(); },
		setTier: async ( tier ) => { app.actions.setTier( tier ); await nextFrames(); },
		/** Applies a look (id or JSON). Cuts by default; `{ transition: true }` plays the current transition. */
		applyLook: async ( idOrJson, { transition = false } = {} ) => { app.actions.setLook( idOrJson, { transition } ); await nextFrames(); },
		setParam: ( id, value ) => app.actions.setParam( id, value ),
		setStrength: ( s ) => app.actions.setStrength( s ),
		getResolvedLook: () => app.resolved,
		info: () => ( { ...app.runtime.info, triangles: app.built?.triangles } ),
		/** compare('hold', {on}) · compare('split', {pos}) · compare('flicker') · compare('off') */
		compare: ( mode, opts = {} ) => {

			if ( mode === 'hold' ) return app.actions.setHold( opts.on ?? true );
			const current = app.store.get().compare.mode;
			if ( mode === 'off' ) { if ( current !== 'off' ) app.actions.setCompareMode( current ); return; }
			if ( current !== mode ) app.actions.setCompareMode( mode );
			if ( opts.pos !== undefined ) app.actions.setSplit( opts.pos );

		},
		freeze: ( t ) => app.actions.freeze( t ),
		/** Renders the current view offscreen: { id, stats, hash } (see captureNow; `advance`, `viewOffset`). */
		capture: ( options ) => pausedWhile( () => captureNow( options ) ),

		/** A labeled grid, rows = scenes, columns = looks (§6.14); returns a PNG data URL. */
		contactSheet: async ( { looks = LOOKS.map( ( l ) => l.id ), scenes = SCENES.map( ( s ) => s.id ), tier = app.store.get().tier, cell = [ 320, 180 ] } = {} ) => {

			const [ w, hgt ] = cell;
			const sheet = document.createElement( 'canvas' );
			sheet.width = w * looks.length; sheet.height = ( hgt + 18 ) * scenes.length;
			const ctx = sheet.getContext( '2d' );
			ctx.fillStyle = '#1b1b1c'; ctx.fillRect( 0, 0, sheet.width, sheet.height );
			ctx.font = '12px system-ui, sans-serif';
			const previous = { scene: app.store.get().sceneId, recipe: app.store.get().recipe, tier: app.store.get().tier };

			for ( const [ row, sceneId ] of scenes.entries() ) {

				app.actions.setScene( sceneId, { tier } );

				for ( const [ col, lookId ] of looks.entries() ) {

					app.actions.setLook( lookId, { transition: false } );
					const { id } = await api.capture( { width: w, height: hgt } );
					const px = captures.get( id );
					ctx.putImageData( new ImageData( new Uint8ClampedArray( px.data ), w, hgt ), col * w, row * ( hgt + 18 ) + 18 );
					ctx.fillStyle = '#e6e6e6';
					ctx.fillText( `${String.fromCharCode( 65 + row )}${col + 1} · ${sceneId} · ${lookId}`, col * w + 6, row * ( hgt + 18 ) + 13 );

				}

			}

			app.actions.setScene( previous.scene, { tier: previous.tier } );
			app.actions.setRecipe( previous.recipe );
			return sheet.toDataURL( 'image/png' );

		},
		/** The benefit matrix (§6.2): rows plain / styled, columns Blockout / Detailed, current look. */
		benefitMatrix: async ( { cell = [ 480, 270 ] } = {} ) => {

			if ( app.scene().imported ) throw new Error( 'the benefit matrix needs a built-in scene (it compares tiers)' );
			const [ w, hgt ] = cell, pad = 22;
			const sheet = document.createElement( 'canvas' );
			sheet.width = w * 2; sheet.height = ( hgt + pad ) * 2;
			const ctx = sheet.getContext( '2d' );
			ctx.fillStyle = '#1b1b1c'; ctx.fillRect( 0, 0, sheet.width, sheet.height );
			ctx.font = '13px system-ui, sans-serif';
			const tier = app.store.get().tier;

			for ( const [ col, t ] of [ [ 0, 0 ], [ 1, TIERS.length - 1 ] ] ) {

				app.actions.setTier( t );
				for ( const [ row, plain ] of [ [ 0, true ], [ 1, false ] ] ) {

					app.actions.setHold( plain );
					const { id } = await api.capture( { width: w, height: hgt } );
					ctx.putImageData( new ImageData( new Uint8ClampedArray( captures.get( id ).data ), w, hgt ), col * w, row * ( hgt + pad ) + pad );
					ctx.fillStyle = '#e6e6e6';
					ctx.fillText( `${plain ? 'Plain' : app.look().name} · ${TIERS[ t ].name}`, col * w + 8, row * ( hgt + pad ) + 15 );

				}

			}

			app.actions.setHold( false );
			app.actions.setTier( tier );
			return sheet.toDataURL( 'image/png' );

		},
		/**
		 * The effects contact sheet (§9 M3): one labeled cell per effect demo, each on its
		 * scene and base look. Returns the PNG and, per cell, how much the effect changed
		 * the image and whether it logged errors. Your state is restored afterwards.
		 */
		effectSheet: async ( { ids = null, cell = [ 320, 180 ], cols = 6, tier = 1, onCell = () => {} } = {} ) => {

			const demos = EFFECT_DEMOS.filter( ( d ) => ! ids || ids.includes( d.id ) );
			const [ w, hgt ] = cell, pad = 18;
			const rows = Math.ceil( demos.length / cols );
			const sheet = document.createElement( 'canvas' );
			sheet.width = w * Math.min( cols, demos.length ); sheet.height = ( hgt + pad ) * rows;
			const ctx = sheet.getContext( '2d' );
			ctx.fillStyle = '#1b1b1c'; ctx.fillRect( 0, 0, sheet.width, sheet.height );
			ctx.font = '12px system-ui, sans-serif';
			const s0 = app.store.get();
			const previous = { scene: s0.sceneId, recipe: s0.recipe, parts: s0.parts, tier: s0.tier, shot: s0.shot, frozen: app.frozenTime };
			const baseCache = new Map();
			const cells = [];
			app.actions.freeze( 1.115 ); // off the stepped-animation grid, so stepping shows

			for ( const [ i, d ] of demos.entries() ) {

				const errorsBefore = log.errors().length;
				app.actions.setScene( d.scene, { tier, shot: d.shot ?? undefined } );
				app.actions.setLook( d.look, { transition: false } );
				const saved = { ...app.overrides() };
				const baseKey = `${d.scene}|${d.look}|${d.shot}|${d.advance || 0}`;
				if ( ! baseCache.has( baseKey ) ) baseCache.set( baseKey, captures.get( ( await api.capture( { width: w, height: hgt, advance: d.advance } ) ).id ) );
				// Per-part demo values are part overrides (Parts tab).
				for ( const [ part, params ] of Object.entries( d.parts || {} ) ) for ( const [ id, value ] of Object.entries( params ) ) app.actions.setParam( id, value, { part } );
				for ( const [ id, value ] of Object.entries( d.params ) ) app.actions.setParam( id, value, { part: null } );
				const shot = await api.capture( { width: w, height: hgt, advance: d.advance } );
				app.actions.setOverrides( d.look, saved );
				for ( const part of Object.keys( d.parts || {} ) ) app.actions.resetPart( part );
				const diff = pixelDiff( baseCache.get( baseKey ), captures.get( shot.id ) ).mae;
				const errors = log.errors().slice( errorsBefore ).map( ( e ) => e.message.split( '\n' )[ 0 ] );
				const x = ( i % cols ) * w, y = Math.floor( i / cols ) * ( hgt + pad );
				ctx.putImageData( new ImageData( new Uint8ClampedArray( captures.get( shot.id ).data ), w, hgt ), x, y + pad );
				ctx.fillStyle = errors.length ? '#ff8a80' : '#e6e6e6';
				// Cell ids follow the full demo list, so a cell keeps its id on any sheet.
				const cell = cellId( EFFECT_DEMOS.indexOf( d ) );
				ctx.fillText( `${cell} · ${d.label}`, x + 6, y + 13 );
				const result = { cell, id: d.id, label: d.label, effect: d.effect, diff, minDiff: d.minDiff, ok: diff >= d.minDiff && ! errors.length, errors, stats: shot.stats };
				cells.push( result );
				onCell( result );

			}

			app.actions.freeze( previous.frozen );
			app.actions.setScene( previous.scene, { tier: previous.tier, shot: previous.shot ?? undefined } );
			app.actions.setRecipe( previous.recipe );
			app.actions.setParts( previous.parts );
			return { url: sheet.toDataURL( 'image/png' ), cells };

		},
		/** Imports a .glb/.gltf from an ArrayBuffer; returns counts and part guesses. */
		importModel: async ( buffer, name ) => { const r = await app.actions.importModel( buffer, name ); await nextFrames(); return { meshes: r.meshes, warnings: r.warnings, guesses: r.guesses }; },
		/** A capture as a PNG data URL (debugging, and images for reports). */
		captureURL: ( id ) => {

			const px = captures.get( id );
			if ( ! px ) throw new Error( 'captureURL: unknown capture' );
			const c = document.createElement( 'canvas' );
			c.width = px.width; c.height = px.height;
			c.getContext( '2d' ).putImageData( new ImageData( new Uint8ClampedArray( px.data ), px.width, px.height ), 0, 0 );
			return c.toDataURL( 'image/png' );

		},
		/**
		 * Mean absolute difference (0–1) between two captures. With `shift: [dx, dy]`, pixel
		 * (x, y) of `b` is compared with (x + dx, y + dy) of `a` over the overlap: the
		 * pixel-grid test pans the camera by whole pixels and expects an exact shift.
		 */
		diff: ( a, b, options ) => {

			const p = captures.get( a ), q = captures.get( b );
			if ( ! p || ! q || p.data.length !== q.data.length ) throw new Error( 'diff: unknown or mismatched captures' );
			return pixelDiff( p, q, options );

		},
		/** Fraction of pixels that differ from their p × p block's top-left pixel (0 = perfectly blocky). */
		blockError: ( id, size ) => {

			const px = captures.get( id );
			let bad = 0;
			for ( let y = 0; y < px.height; y ++ ) for ( let x = 0; x < px.width; x ++ ) {

				const i = ( y * px.width + x ) * 4, j = ( ( y - y % size ) * px.width + ( x - x % size ) ) * 4;
				if ( Math.abs( px.data[ i ] - px.data[ j ] ) + Math.abs( px.data[ i + 1 ] - px.data[ j + 1 ] ) + Math.abs( px.data[ i + 2 ] - px.data[ j + 2 ] ) > 6 ) bad ++;

			}

			return bad / ( px.width * px.height );

		},
		/** Runs spikes and returns their results; `ids` defaults to all. */
		runSpikes: async ( ids = null, options = {} ) => {

			const results = await runSpikes( ids, () => {}, options );
			if ( ! ids ) panel.setSpikes( results );
			return results;

		},
		report: () => panel.report(),
	} );

	// Export images: the current view, and the current state on every scene.
	app.exportImages = {
		reference: async () => api.captureURL( ( await api.capture( { width: 1280, height: 720 } ) ).id ),
		contactSheet: async ( { cell = [ 320, 180 ], cols = 4 } = {} ) => {

			const [ w, hgt ] = cell, pad = 18, s0 = app.store.get();
			const sheet = document.createElement( 'canvas' );
			sheet.width = w * cols; sheet.height = ( hgt + pad ) * Math.ceil( SCENES.length / cols );
			const ctx = sheet.getContext( '2d' );
			ctx.fillStyle = '#1b1b1c'; ctx.fillRect( 0, 0, sheet.width, sheet.height );
			ctx.font = '12px system-ui, sans-serif';
			for ( const [ i, sc ] of SCENES.entries() ) {

				app.actions.setScene( sc.id, { tier: s0.tier } );
				const px = captures.get( ( await api.capture( { width: w, height: hgt } ) ).id );
				const x = ( i % cols ) * w, y = Math.floor( i / cols ) * ( hgt + pad );
				ctx.putImageData( new ImageData( new Uint8ClampedArray( px.data ), w, hgt ), x, y + pad );
				ctx.fillStyle = '#e6e6e6';
				ctx.fillText( `${sc.name} · ${app.look().name}`, x + 6, y + 13 );

			}

			app.actions.setScene( s0.sceneId, { tier: s0.tier, shot: s0.shot ?? undefined } );
			return sheet.toDataURL( 'image/png' );

		},
	};

	// Share links (§6.12): `#state=` or `#look=` opens that state, then the hash is cleared
	// (the state autosaves like any other). Pasting a link into this tab works too.
	const openSharedHash = async ( hash ) => {

		const shared = parseShareHash( hash );
		if ( ! shared ) return null;
		let message;
		try {

			await app.actions.openShare( shared.kind, shared.text );
			message = shared.kind === 'look' ? 'Opened the shared look.' : 'Opened the shared state: scene, recipe, parts and tweaks.';
			toast( message );

		} catch ( e ) {

			log.add( 'warn', [ 'Share link could not be read:', e ] );
			message = 'This share link could not be read; it may be cut off. Showing your last state instead.';
			toast( message, 7000 );

		}

		history.replaceState( null, '', location.pathname + location.search );
		return message;

	};
	const shared = await openSharedHash( location.hash );
	window.addEventListener( 'hashchange', () => openSharedHash( location.hash ) );

	// ?audit=<target>: opened from the "Open on phone" QR code: run the audit here.
	const auditTarget = new URLSearchParams( location.search ).get( 'audit' );
	if ( auditTarget && AUDIT_TARGETS[ auditTarget ] ) setTimeout( () => auditModal.open( { target: auditTarget, run: true } ), 1500 );

	// First presented frame, then ready. A first visit gets the welcome (not when a share
	// link, the phone audit or an automated browser opened the page).
	await nextFrames();
	markReady( true );
	onboarding.maybeShow( { skip: !! shared || !! auditTarget || navigator.webdriver, force: new URLSearchParams( location.search ).get( 'welcome' ) === '1' } );

	if ( params.spikes ) {

		panel.toggle( true );
		await panel.startSpikes();

	}

}
