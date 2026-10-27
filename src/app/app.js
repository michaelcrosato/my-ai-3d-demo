// App controller: state → resolveLook → StyleRuntime, plus scenes, tiers, shots and
// compare. UI and input call these actions; nothing else talks to the runtime.

import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { StyleRuntime } from '../runtime/style.js';
import { resolveLook, lookValue } from '../runtime/look/resolve.js';
import { validateLook } from '../runtime/look/validate.js';
import { byId } from '../runtime/registry/index.js';
import { LOOKS, lookById } from '../content/looks/index.js';
import { SCENES, sceneById, buildScene, TIERS, DENSITY } from '../scenes/index.js';
import { createStore } from './state/store.js';
import { importModel } from './import/glb.js';
import { LAYER_STYLED } from '../runtime/materials/factory.js';

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
	let imported = null; // scene definition of an imported .glb
	const raycaster = new THREE.Raycaster();
	raycaster.layers.set( LAYER_STYLED );
	let built = null; // { root, animate, triangles }
	let resolved = null;
	let fov = 45;
	let clock = 0, frozen = null;

	const state = () => store.get();
	const scene = () => ( state().sceneId === 'import' && imported ) || sceneById.get( state().sceneId ) || SCENES[ 0 ];
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
	 * Lens: the shot's FOV times the look's lens width. The camera dollies along its view
	 * line so the subject keeps its size; only the perspective changes.
	 */
	function applyFov() {

		const next = Math.min( 110, scene().shots[ shotId() ].fov * resolved.global[ 'lens.fovScale' ] );
		if ( next === fov ) return;
		const k = Math.tan( fov * Math.PI / 360 ) / Math.tan( next * Math.PI / 360 );
		const offset = camera.position.clone().sub( controls.target ).multiplyScalar( k );
		camera.position.copy( controls.target ).add( offset );
		fov = next;
		camera.fov = fov;
		camera.updateProjectionMatrix();

	}

	function goToShot( id = shotId() ) {

		const shot = scene().shots[ id ];
		camera.position.set( ...shot.pos );
		controls.target.set( ...shot.target );
		fov = shot.fov;
		applyFov();
		controls.update();

	}

	function loadScene( { moveCamera } ) {

		const t0 = performance.now();
		built = buildScene( scene(), { tier: state().tier, density: state().density } );
		runtime.setScene( built.root, scene() );
		resolve();
		if ( moveCamera ) goToShot();
		emit( 'scene', { scene: scene(), tier: state().tier, density: state().density, triangles: built.triangles, objects: built.objects, buildMs: performance.now() - t0 } );

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

			if ( ! sceneById.has( id ) && ! ( id === 'import' && imported ) ) throw new Error( `Unknown scene ${id}` );
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
			if ( ( t === state().tier && built ) || scene().imported ) return;
			store.set( { tier: t } );
			loadScene( { moveCamera: false } );

		},

		/** Prop density ×0.5–×4: more or fewer trees, props and crowds; landmarks stay. */
		setDensity( d ) {

			const v = Math.max( DENSITY.min, Math.min( DENSITY.max, Math.round( d * 4 ) / 4 ) );
			if ( v === state().density || scene().imported ) return;
			store.set( { density: v } );
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

		/** Loads a .glb/.gltf (ArrayBuffer) as the "Imported" scene. Resolves with what was found. */
		async importModel( buffer, name ) {

			const result = await importModel( buffer, name );
			imported = result.def;
			store.set( { sceneId: 'import', shot: null } );
			loadScene( { moveCamera: true } );
			emit( 'imported', result );
			return result;

		},

		/** Pick tool: the styled mesh under normalized device coordinates (x, y ∈ [-1, 1]). */
		pick( x, y ) {

			if ( ! built ) return null;
			raycaster.setFromCamera( new THREE.Vector2( x, y ), camera );
			for ( const hit of raycaster.intersectObject( built.root, true ) ) {

				let o = hit.object;
				while ( o && ! o.userData.style ) o = o.parent; // hulls are children of their mesh
				if ( ! o ) continue;
				const info = { mesh: o, name: o.name || o.parent?.name || 'mesh', part: o.userData.style.part, reason: o.userData.guess?.reason ?? 'built-in scene tag', point: hit.point.toArray() };
				emit( 'pick', info );
				return info;

			}

			emit( 'pick', null );
			return null;

		},

		/** Pick tool: move a mesh to another part; the current look styles it right away. */
		setPart( mesh, part ) {

			const ok = runtime.setPart( mesh, part );
			if ( ok ) { mesh.userData.guess = { part, reason: 'set by you' }; emit( 'pick', { mesh, name: mesh.name || mesh.parent?.name || 'mesh', part, reason: 'set by you' } ); }
			return ok;

		},

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

			if ( state().sceneId === 'import' && ! imported ) store.set( { sceneId: SCENES[ 0 ].id, shot: null } );
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
