// App controller: state → resolveLook → StyleRuntime, plus scenes, tiers, shots and
// compare. UI and input call these actions; nothing else talks to the runtime.

import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { StyleRuntime } from '../runtime/style.js';
import { resolveLook, lookValue } from '../runtime/look/resolve.js';
import { validateLook } from '../runtime/look/validate.js';
import { byId } from '../runtime/registry/index.js';
import { LOOKS, lookById } from '../content/looks/index.js';
import { SCENES, sceneById, buildScene, TIERS } from '../scenes/index.js';
import { createStore } from './state/store.js';

const sameValue = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

export function createApp( { renderer, canvas, persist = true } ) {

	const store = createStore( { persist } );
	const camera = new THREE.PerspectiveCamera( 45, 1, 0.1, 1000 );
	const controls = new OrbitControls( camera, canvas );
	controls.enableDamping = true;
	controls.autoRotateSpeed = 1.2;
	const runtime = new StyleRuntime( { renderer, camera } );

	const listeners = new Set();
	const emit = ( type, detail ) => { for ( const fn of listeners ) fn( type, detail ); };

	const custom = new Map(); // looks applied as JSON (test API, later: imports)
	let built = null; // { root, animate, triangles }
	let resolved = null;
	let fov = null;
	let clock = 0, frozen = null;

	const state = () => store.get();
	const scene = () => sceneById.get( state().sceneId ) || SCENES[ 0 ];
	const look = () => lookById.get( state().lookId ) || custom.get( state().lookId ) || LOOKS[ 0 ];
	const overrides = () => state().overrides[ state().lookId ] || {};
	const shotId = () => ( state().shot && scene().shots[ state().shot ] ? state().shot : scene().defaultShot );

	function resolve() {

		resolved = resolveLook( { look: look(), sceneParams: scene().params, overrides: overrides(), strength: state().strength } );
		const rebuilt = runtime.apply( resolved );
		applyFov();
		emit( 'resolved', { resolved, rebuilt } );
		return rebuilt;

	}

	/**
	 * Lens: the look's FOV if it sets one, else the shot's. The camera stays where it
	 * is, so a wider lens shows more of the scene (a dolly could push it into geometry).
	 */
	function applyFov() {

		const src = resolved.sources[ 'lens.fov' ];
		const next = src === 'look' || src === 'override' ? resolved.global[ 'lens.fov' ] : scene().shots[ shotId() ].fov;
		if ( next === fov ) return;
		fov = next;
		camera.fov = fov;
		camera.updateProjectionMatrix();

	}

	function goToShot( id = shotId() ) {

		const shot = scene().shots[ id ];
		camera.position.set( ...shot.pos );
		controls.target.set( ...shot.target );
		fov = null;
		applyFov();
		controls.update();

	}

	function loadScene( { moveCamera } ) {

		const t0 = performance.now();
		built = buildScene( scene(), { tier: state().tier } );
		runtime.setScene( built.root, scene() );
		resolve();
		if ( moveCamera ) goToShot();
		emit( 'scene', { scene: scene(), tier: state().tier, triangles: built.triangles, buildMs: performance.now() - t0 } );

	}

	const actions = {

		/** Applies a library look by id, or a look object (validated). */
		setLook( idOrLook ) {

			let id = idOrLook;
			if ( typeof idOrLook === 'object' ) {

				const { ok, errors } = validateLook( idOrLook );
				if ( ! ok ) throw new Error( `Invalid look: ${errors.join( '; ' )}` );
				custom.set( idOrLook.id, { inspiredBy: [], tags: [], pillars: [], mistakes: [], description: '', parts: {}, ...idOrLook } );
				id = idOrLook.id;

			} else if ( ! lookById.has( id ) ) throw new Error( `Unknown look ${id}` );

			store.set( { lookId: id } );
			resolve();
			emit( 'look', look() );

		},

		stepLook( d ) {

			const i = LOOKS.findIndex( ( l ) => l.id === state().lookId );
			actions.setLook( LOOKS[ ( i + d + LOOKS.length ) % LOOKS.length ].id );

		},

		setScene( id, { tier, shot } = {} ) {

			if ( ! sceneById.has( id ) ) throw new Error( `Unknown scene ${id}` );
			store.set( { sceneId: id, shot: shot ?? null, ...( tier !== undefined ? { tier } : {} ) } );
			loadScene( { moveCamera: true } );

		},

		stepScene( d ) {

			const i = SCENES.findIndex( ( s ) => s.id === state().sceneId );
			actions.setScene( SCENES[ ( i + d + SCENES.length ) % SCENES.length ].id );

		},

		/** Rebuilds the geometry at another tier; layout, colors and camera stay put. */
		setTier( tier ) {

			const t = Math.max( 0, Math.min( TIERS.length - 1, tier ) );
			if ( t === state().tier && built ) return;
			store.set( { tier: t } );
			loadScene( { moveCamera: false } );

		},

		setShot( id ) {

			store.set( { shot: id } );
			goToShot( id );
			emit( 'shot', id );

		},

		nextShot() {

			const ids = Object.keys( scene().shots );
			actions.setShot( ids[ ( ids.indexOf( shotId() ) + 1 ) % ids.length ] );

		},

		setTurntable( on ) { store.set( { turntable: on } ); controls.autoRotate = on; emit( 'turntable', on ); },

		/** A Tune override for the current look. Setting the look's own value clears it. */
		setParam( id, value ) {

			const next = { ...overrides() };
			if ( sameValue( value, lookValue( look(), scene().params, id ) ) ) delete next[ id ]; else next[ id ] = value;
			store.set( { overrides: { [ state().lookId ]: next } } );
			return resolve();

		},

		resetParams( ids = null ) {

			const next = ids ? Object.fromEntries( Object.entries( overrides() ).filter( ( [ k ] ) => ! ids.includes( k ) ) ) : {};
			store.set( { overrides: { [ state().lookId ]: next } } );
			resolve();

		},

		setStrength( s ) { store.set( { strength: Math.max( 0, Math.min( 1, s ) ) } ); return resolve(); },

		/** Compare (§6.9): 'hold' is momentary; 'split' and 'flicker' are modes. */
		setHold( on ) { runtime.setCompare( { hold: on } ); emit( 'hold', on ); },
		setCompareMode( mode ) {

			const m = state().compare.mode === mode ? 'off' : mode;
			store.set( { compare: { mode: m } } );
			runtime.setCompare( { split: m === 'split', flicker: false } );
			emit( 'compare', state().compare );

		},
		setSplit( pos ) { store.set( { compare: { splitPos: pos } } ); runtime.setCompare( { splitPos: pos } ); emit( 'compare', state().compare ); },

		/** Freezes the animation clock at `t` seconds (null resumes), for repeatable captures. */
		freeze( t ) { frozen = t; },

	};

	return {
		store, camera, controls, runtime, actions,
		get resolved() { return resolved; },
		get built() { return built; },
		scene, look, overrides, shotId,
		lookValue: ( id ) => lookValue( look(), scene().params, id ),
		isModified: ( id ) => id in overrides(),
		on( fn ) { listeners.add( fn ); return () => listeners.delete( fn ); },

		start() {

			const s = state();
			controls.autoRotate = s.turntable;
			runtime.setCompare( { split: s.compare.mode === 'split', splitPos: s.compare.splitPos } );
			loadScene( { moveCamera: true } );

		},

		/** Per frame: clock, flicker, camera, animation. */
		tick( dt ) {

			clock += dt;
			const t = frozen ?? clock;
			if ( state().compare.mode === 'flicker' ) runtime.setCompare( { flicker: Math.floor( clock / 0.5 ) % 2 === 1 } );
			controls.update( dt );
			built?.animate( t );
			runtime.update( t );

		},

		param: ( id ) => byId.get( id ),
	};

}
