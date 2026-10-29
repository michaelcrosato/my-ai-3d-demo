// App controller: state → resolveRecipe → StyleRuntime, plus scenes, tiers, shots,
// compare, look mixing, parts, transitions, undo and share links. UI and input call
// these actions; nothing else talks to the runtime.

import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { StyleRuntime } from '../runtime/style.js';
import { resolveRecipe, blendResolved, lookValue, lookFromResolved, partRecipe, PART_MODULES } from '../runtime/look/resolve.js';
import { validateLook } from '../runtime/look/validate.js';
import { checkCoherence } from '../runtime/look/coherence.js';
import { encodeShare, decodeShare } from '../runtime/look/share.js';
import { zoneWeights, blendZones } from '../runtime/look/zones.js';
import { rubric, mobileSubstitutions } from '../runtime/perf/cost-model.js';
import { VIEWS } from '../runtime/post/views.js';
import { byId, PARTS } from '../runtime/registry/index.js';
import { LOOKS, lookById } from '../content/looks/index.js';
import { SCENES, sceneById, buildScene, TIERS, DENSITY } from '../scenes/index.js';
import { createStore } from './state/store.js';
import { createHistory } from './state/history.js';
import { randomOverrides } from './state/randomize.js';
import { importModel } from './import/glb.js';
import { loadRapier, PhysicsWorld } from './physics/world.js';
import { WalkController, findHero } from './physics/walk.js';
import { LAYER_STYLED } from '../runtime/materials/factory.js';
import { parseCube, setCustomLut, customLut, encodeLut, decodeLut } from '../runtime/color/lut.js';

const sameValue = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );
const copy = ( v ) => JSON.parse( JSON.stringify( v ) );
const ease = ( t ) => ( t < 0.5 ? 2 * t * t : 1 - Math.pow( - 2 * t + 2, 2 ) / 2 );
const LOOK_DEFAULTS = { inspiredBy: [], tags: [], pillars: [], mistakes: [], description: '', parts: {} };

// The imported .cube (one slot, the LUT preset 'custom') is kept apart from the autosaved
// state: it is ~140 kB, and the state saves on every change.
const LUT_KEY = 'stylelab.lut.v1';
function loadCustomLut() {

	try { const j = JSON.parse( localStorage.getItem( LUT_KEY ) ); if ( j ) setCustomLut( decodeLut( j ) ); } catch { /* storage blocked or the LUT is damaged: no imported LUT */ }

}

function saveCustomLut( lut ) {

	try { localStorage.setItem( LUT_KEY, JSON.stringify( encodeLut( lut ) ) ); } catch { /* storage full or blocked: the LUT lasts this session */ }

}

/** The imported LUT, for a look that uses it (grade.lut.preset 'custom'); else undefined. */
export function lutFor( values ) {

	const lut = customLut();
	return lut && values[ 'grade.lut.enabled' ] && values[ 'grade.lut.preset' ] === 'custom' ? encodeLut( lut ) : undefined;

}

export function createApp( { renderer, canvas, persist = true } ) {

	const store = createStore( { persist } );
	if ( persist ) loadCustomLut();
	const camera = new THREE.PerspectiveCamera( 45, 1, 0.1, 1000 );
	const controls = new OrbitControls( camera, canvas );
	controls.enableDamping = true;
	controls.autoRotateSpeed = 1.2;
	const runtime = new StyleRuntime( { renderer, camera } );
	const history = createHistory();

	const listeners = new Set();
	const emit = ( type, detail ) => { for ( const fn of listeners ) fn( type, detail ); };

	const custom = new Map(); // looks applied as JSON (test API, share links)
	let imported = null; // scene definition of an imported .glb
	const raycaster = new THREE.Raycaster();
	raycaster.layers.set( LAYER_STYLED );
	let built = null; // { root, animate, triangles }
	let resolved = null; // what is on screen (mid-transition: the blend)
	let target = null; // where the current state resolves to
	let transition = null; // { from, to, t, duration, type }
	let fov = 45;
	let clock = 0, frozen = null;
	// M5: physics (toybox and walk mode), look zones, the plan player and mode cycling.
	let physics = null, physicsLoading = null, walk = null;
	const walkInput = { keys: new Set(), padMove: [ 0, 0 ], padLook: [ 0, 0 ], padJump: false, padRun: false, touchMove: [ 0, 0 ], touchJump: false, touchRun: false, mouse: [ 0, 0 ] };
	let zoneCache = { target: null, map: new Map() }, zoneKey = '';
	let playing = null, cycling = null;

	const state = () => store.get();
	const scene = () => ( state().sceneId === 'import' && imported ) || sceneById.get( state().sceneId ) || SCENES[ 0 ];
	const userLook = ( id ) => state().userLooks.find( ( l ) => l.id === id );
	const getLook = ( id ) => lookById.get( id ) || custom.get( id ) || userLook( id ) || LOOKS[ 0 ];
	const hasLook = ( id ) => lookById.has( id ) || custom.has( id ) || !! userLook( id );
	const look = () => getLook( state().recipe.base );
	const overrides = () => state().overrides[ state().recipe.base ] || {};
	const shotId = () => ( state().shot && scene().shots[ state().shot ] ? state().shot : scene().defaultShot );
	const libraryLooks = () => [ ...LOOKS, ...state().userLooks.map( ( l ) => ( { ...LOOK_DEFAULTS, ...l, user: true } ) ) ];

	/** Everything undo and share links restore. */
	const snapshot = () => copy( { recipe: state().recipe, parts: state().parts, overrides: state().overrides, strength: state().strength } );
	const commit = ( key = null ) => history.push( snapshot(), key );

	const resolveTarget = () => resolveRecipe( { recipe: state().recipe, getLook, parts: state().parts, sceneParams: scene().params, overrides: overrides(), strength: state().strength } );

	/** Puts a resolution on screen. Transition frames are quiet: panels follow `target`. */
	function show( r, { quiet = false } = {} ) {

		resolved = r;
		const rebuilt = runtime.apply( r );
		applyFov();
		if ( ! quiet ) emit( 'resolved', { resolved: r, rebuilt } );
		return rebuilt;

	}

	/** The current scene's zones, with the looks assigned in the plan. */
	const zones = () => {

		const assigned = state().plan.zones[ scene().id ] || {};
		return ( scene().zones || [] ).map( ( z ) => ( assigned[ z.id ] ? { ...z, look: assigned[ z.id ], params: null } : z ) );

	};

	/** A zone's look: a library look, an inline look, or the current look plus the zone's params. */
	function resolveZone( zone ) {

		if ( zoneCache.target !== target ) zoneCache = { target, map: new Map() };
		const key = `${zone.id}|${typeof zone.look === 'string' ? zone.look : ''}`;
		if ( ! zoneCache.map.has( key ) ) {

			let r;
			if ( typeof zone.look === 'string' && hasLook( zone.look ) ) r = resolveRecipe( { recipe: { base: zone.look }, getLook, sceneParams: scene().params } );
			else if ( zone.look && typeof zone.look === 'object' ) r = resolveRecipe( { recipe: { base: registerLook( zone.look ).id }, getLook, sceneParams: scene().params } );
			else r = resolveRecipe( { recipe: state().recipe, getLook, parts: state().parts, sceneParams: scene().params, overrides: { ...overrides(), ...zone.params }, strength: state().strength } );
			zoneCache.map.set( key, r );

		}

		return zoneCache.map.get( key );

	}

	const currentZoneWeights = () => ( walk ? zoneWeights( zones(), walk.position() ) : zones().map( ( zone ) => ( { zone, weight: 0 } ) ) );
	/** `target` blended with the zones the player stands in (just `target` outside walk mode). */
	const zoned = ( r ) => ( walk && zones().length ? blendZones( r, currentZoneWeights(), resolveZone ) : r );

	/**
	 * Resolves the state. With `animate`, a look change plays the current transition: a
	 * morph blends the values; crossfade and wipe blend from a snapshot of the outgoing frame.
	 */
	function resolve( { animate = false } = {} ) {

		target = resolveTarget();
		const { type, duration } = state().transition;

		if ( animate && resolved && type !== 'cut' && duration > 0 ) {

			if ( type !== 'morph' ) runtime.snapshot();
			return startTransition( type, duration );

		}

		if ( transition ) { transition = null; runtime.setTransition( { mode: null } ); }
		zoneKey = '';
		return show( zoned( target ) );

	}

	/** Starts a transition from what is on screen (or `from`) to the current target. */
	function startTransition( type, duration, from = resolved ) {

		if ( type === 'cut' || duration <= 0 || ! from ) return show( zoned( target ) );
		if ( type === 'morph' ) { transition = { from, to: target, t: 0, duration, type }; return show( blendResolved( from, target, 0 ) ); }
		transition = { to: target, t: 0, duration, type };
		runtime.setTransition( { mode: type, progress: 0 } );
		return show( target );

	}

	async function ensurePhysics() {

		if ( physics ) return physics;
		if ( ! physicsLoading ) {

			const id = scene().id, root = built.root;
			physicsLoading = loadRapier().then( ( R ) => {

				physicsLoading = null;
				if ( built?.root !== root ) return null; // the scene changed while Rapier loaded
				physics = new PhysicsWorld( R, { root, collisionRoot: buildScene( scene(), { tier: 0, density: state().density } ).root } );
				emit( 'physics', { scene: id } );
				return physics;

			} );

		}

		return physicsLoading;

	}

	function stopPhysics() {

		walk?.dispose();
		walk = null;
		physics?.dispose();
		physics = null;
		physicsLoading = null;
		controls.enabled = true;

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
		const wasWalking = !! walk;
		stopPhysics();
		built = buildScene( scene(), { tier: state().tier, density: state().density } );
		runtime.setScene( built.root, scene() );
		resolve();
		if ( moveCamera ) goToShot();
		runtime.setIsolate( state().isolate );
		emit( 'scene', { scene: scene(), tier: state().tier, density: state().density, triangles: built.triangles, objects: built.objects, buildMs: performance.now() - t0 } );
		if ( wasWalking ) actions.setWalk( true );
		else if ( scene().spareBalls ) ensurePhysics();
		else emit( 'walk', false );

	}

	const setRecipe = ( patch, { animate = false } = {} ) => {

		store.set( { recipe: { ...state().recipe, ...patch } } );
		const r = resolve( { animate } );
		emit( 'recipe', state().recipe );
		return r;

	};

	const setModule = ( module, patch ) => {

		const modules = { ...state().recipe.modules };
		const next = { ...modules[ module ], ...patch };
		for ( const k of Object.keys( next ) ) if ( next[ k ] === null || next[ k ] === false || next[ k ] === undefined ) delete next[ k ];
		if ( Object.keys( next ).length ) modules[ module ] = next; else delete modules[ module ];
		return setRecipe( { modules } );

	};

	const setPartState = ( part, patch ) => {

		const parts = { ...state().parts };
		const next = { ...parts[ part ], ...patch };
		for ( const k of Object.keys( next ) ) if ( next[ k ] === null || next[ k ] === undefined || ( typeof next[ k ] === 'object' && ! Array.isArray( next[ k ] ) && ! Object.keys( next[ k ] ).length ) ) delete next[ k ];
		if ( Object.keys( next ).length ) parts[ part ] = next; else delete parts[ part ];
		store.set( { parts }, { replace: true } );
		const r = resolve();
		emit( 'parts', parts );
		return r;

	};

	/** Registers a look given as JSON (validated), so recipes and parts can reference it. */
	const registerLook = ( json ) => {

		const { ok, errors } = validateLook( json );
		if ( ! ok ) throw new Error( `Invalid look: ${errors.join( '; ' )}` );
		const l = { ...LOOK_DEFAULTS, ...json };
		if ( ! lookById.has( l.id ) && ! userLook( l.id ) ) custom.set( l.id, l );
		return l;

	};

	/** Zones follow the player: re-blend only when a weight changes. */
	function updateZones() {

		if ( ! walk || transition || ! zones().length ) return;
		const weights = currentZoneWeights();
		const key = weights.map( ( w ) => w.weight.toFixed( 4 ) ).join( ',' );
		if ( key === zoneKey ) return;
		zoneKey = key;
		show( blendZones( target, weights, resolveZone ), { quiet: true } );
		emit( 'zones', weights );

	}

	/** The plan player: the next scene, with its planned look and transition. */
	function nextLevel() {

		if ( ! playing ) return;
		playing.index = ( playing.index + 1 ) % SCENES.length;
		playing.t = 0;
		const s = SCENES[ playing.index ];
		const lv = state().plan.levels[ s.id ] || {};
		const type = lv.transition || 'morph';
		const from = resolved;
		if ( type === 'crossfade' || type === 'wipe' ) runtime.snapshot(); // the outgoing level's last frame
		actions.setScene( s.id );
		if ( lv.look && hasLook( lv.look ) ) store.set( { recipe: { base: lv.look, modules: {}, morph: null } } );
		target = resolveTarget();
		startTransition( type, state().transition.duration || 0.6, type === 'morph' ? from : resolved );
		emit( 'look', look() );
		emit( 'recipe', state().recipe );
		emit( 'level', { index: playing.index, scene: s.id } );

	}

	const actions = {

		/**
		 * Applies a library look by id, or a look object (validated): the recipe becomes
		 * that look alone. Plays the transition unless `transition: false`.
		 */
		setLook( idOrLook, { transition: animate = true } = {} ) {

			let id = idOrLook;
			if ( typeof idOrLook === 'object' ) id = registerLook( idOrLook ).id;
			else if ( ! hasLook( id ) ) throw new Error( `Unknown look ${id}` );
			// A look that carries an imported LUT puts it in the custom slot.
			if ( getLook( id ).lut ) { const lut = setCustomLut( decodeLut( getLook( id ).lut ) ); if ( persist ) saveCustomLut( lut ); }
			commit();
			store.set( { recipe: { base: id, modules: {}, morph: null } } );
			resolve( { animate } );
			emit( 'look', look() );
			emit( 'recipe', state().recipe );

		},

		stepLook( d ) {

			const list = libraryLooks();
			const i = list.findIndex( ( l ) => l.id === state().recipe.base );
			actions.setLook( list[ ( i + d + list.length ) % list.length ].id );

		},

		/** Recipe slot: take a module from another look (null = the base look). */
		setModuleSource( module, lookId ) { commit(); return setModule( module, { from: lookId && lookId !== state().recipe.base ? lookId : null } ); },
		/** Recipe slot: blend a module with a second look at t (null removes the blend). */
		setModuleBlend( module, withId, t = 0.5 ) { commit( `blend:${module}` ); return setModule( module, { blend: withId ? { with: withId, t } : null } ); },
		/** Mute (neutral values) or solo (only this module styled) a module. */
		setModuleFlag( module, flag, on ) { commit(); return setModule( module, { [ flag ]: on } ); },
		/** Morph: blend every module with one look at t (null stops morphing). */
		setMorph( withId, t = 0.5 ) { commit( 'morph' ); return setRecipe( { morph: withId ? { with: withId, t } : null } ); },
		/** Replaces the whole recipe (lessons, share links, tests). */
		setRecipe( recipe, { animate = false } = {} ) { commit(); return setRecipe( { modules: {}, morph: null, ...recipe }, { animate } ); },

		setTransition( patch ) { store.set( { transition: { ...state().transition, ...patch } } ); emit( 'transition', state().transition ); },

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

		/**
		 * A Tune override. In part scope (the Parts tab's Edit overrides, or `{ part }`) it
		 * goes to that part, for parameters that can differ per part. Setting the value the
		 * look already has clears the override.
		 */
		setParam( id, value, { part = state().ui.scope } = {} ) {

			commit( `param:${part || ''}:${id}` );
			const entry = byId.get( id );
			if ( part && entry && entry.scope !== 'global' ) {

				const current = { ...state().parts[ part ]?.overrides };
				delete current[ id ];
				const without = resolveRecipe( { recipe: state().recipe, getLook, parts: { ...state().parts, [ part ]: { ...state().parts[ part ], overrides: current } }, sceneParams: scene().params, overrides: overrides(), strength: 1 } ).parts[ part ][ id ];
				if ( ! sameValue( value, without ) ) current[ id ] = value;
				return setPartState( part, { overrides: current } );

			}

			const next = { ...overrides() };
			if ( sameValue( value, lookValue( look(), scene().params, id ) ) ) delete next[ id ]; else next[ id ] = value;
			store.set( { overrides: { [ state().recipe.base ]: next } } );
			return resolve();

		},

		/** Several overrides at once (coherence fixes, presets): one undo step. */
		applyOverrides( map ) {

			commit();
			const next = { ...overrides(), ...map };
			store.set( { overrides: { [ state().recipe.base ]: next } } );
			return resolve();

		},

		/**
		 * Randomize within ranges (§6.8, P2): rolls the continuous values of the effects this look
		 * uses, within the library's ranges, as one undoable step. Returns the overrides set.
		 */
		randomize( { seed = Math.floor( Math.random() * 2 ** 31 ) } = {} ) {

			const roll = randomOverrides( target.global, LOOKS, seed );
			actions.applyOverrides( roll );
			emit( 'randomized', { seed, count: Object.keys( roll ).length } );
			return { seed, overrides: roll };

		},

		/** Replaces a look's Tune overrides wholesale (restoring state after demos and lessons). */
		setOverrides( lookId, map ) {

			store.set( { overrides: { [ lookId ]: { ...map } } } );
			if ( lookId === state().recipe.base ) resolve();

		},

		resetParams( ids = null ) {

			commit();
			const part = state().ui.scope;
			if ( part ) {

				const current = state().parts[ part ]?.overrides || {};
				return setPartState( part, { overrides: ids ? Object.fromEntries( Object.entries( current ).filter( ( [ k ] ) => ! ids.includes( k ) ) ) : {} } );

			}

			const next = ids ? Object.fromEntries( Object.entries( overrides() ).filter( ( [ k ] ) => ! ids.includes( k ) ) ) : {};
			store.set( { overrides: { [ state().recipe.base ]: next } } );
			resolve();

		},

		setStrength( s ) { commit( 'strength' ); store.set( { strength: Math.max( 0, Math.min( 1, s ) ) } ); return resolve(); },

		// Parts (§6.7)
		/** A part's own look (null = follow the global recipe). New part looks take every part module. */
		setPartLook( part, lookId ) { commit(); return setPartState( part, { look: lookId || null, modules: lookId ? state().parts[ part ]?.modules || [ ...PART_MODULES ] : null } ); },
		setPartModules( part, modules ) { commit(); return setPartState( part, { modules: modules.filter( ( m ) => PART_MODULES.includes( m ) ) } ); },
		resetPart( part ) { commit(); return setPartState( part, { look: null, modules: null, overrides: null } ); },
		/** Replaces every part's state at once (restoring after demos, share links, tests). */
		setParts( parts ) {

			commit();
			store.set( { parts: copy( parts || {} ) }, { replace: true } );
			const r = resolve();
			emit( 'parts', state().parts );
			return r;

		},
		/** Tune scope: edits go to this part (null = the global look). */
		setScope( part ) { store.set( { ui: { scope: part && PARTS.includes( part ) ? part : null } } ); emit( 'scope', state().ui.scope ); },
		/** Isolate: dims every part but this one, with its mask outlined (null ends it). */
		setIsolate( part ) {

			store.set( { isolate: part && PARTS.includes( part ) ? part : null } );
			runtime.setIsolate( state().isolate );
			emit( 'isolate', state().isolate );

		},
		/**
		 * Focus hierarchy (§6.7): the hero gets +10% saturation, a rim light and a thicker
		 * outline; the background (terrain, architecture, foliage) gets a little calmer.
		 */
		applyFocusPreset() {

			commit();
			const hero = target.parts.hero;
			const parts = copy( state().parts );
			const bump = ( part, values ) => { parts[ part ] = { ...parts[ part ], overrides: { ...parts[ part ]?.overrides, ...values } }; };
			bump( 'hero', {
				'palette.saturation': Math.min( 2, Math.round( hero[ 'palette.saturation' ] * 1.1 * 100 ) / 100 ),
				'surface.rim.intensity': Math.max( 0.6, hero[ 'surface.rim.intensity' ] ),
				'lines.hull.enabled': true,
				'lines.hull.thickness': Math.min( 8, ( hero[ 'lines.hull.enabled' ] ? hero[ 'lines.hull.thickness' ] : 1.5 ) + 1 ),
			} );
			for ( const part of [ 'terrain', 'architecture', 'foliage' ] ) bump( part, { 'palette.saturation': Math.round( target.parts[ part ][ 'palette.saturation' ] * 0.9 * 100 ) / 100 } );
			store.set( { parts }, { replace: true } );
			resolve();
			emit( 'parts', parts );

		},

		// Library (§6.5, §6.6)
		/** Saves the current result as a sparse look in My looks and switches to it. */
		saveAsLook( name ) {

			const base = look();
			const id = `${String( name ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-|-$/g, '' ) || 'my-look'}-${Date.now().toString( 36 ).slice( - 4 )}`;
			const mixed = [ ...new Set( [ state().recipe.base, ...Object.values( state().recipe.modules ).flatMap( ( m ) => [ m.from, m.blend?.with ] ), state().recipe.morph?.with ].filter( Boolean ) ) ].map( ( i ) => getLook( i ).name );
			const saved = lookFromResolved( resolveTarget(), {
				id, name,
				inspiredBy: mixed.length > 1 ? [ `Mixed from ${mixed.join( ', ' )}` ] : base.inspiredBy,
				tags: base.tags.filter( ( t ) => t !== 'baseline' ), pillars: base.pillars, mistakes: base.mistakes,
				description: `Saved from ${mixed.join( ' + ' )}.`, phone: base.phone,
			} );
			const lut = lutFor( resolveTarget().global );
			if ( lut ) saved.lut = lut;
			store.set( { userLooks: [ ...state().userLooks, saved ] } );
			emit( 'library' );
			actions.setLook( id, { transition: false } );
			return saved;

		},

		/** Adds a look JSON to My looks (new id if it collides). */
		importLook( json ) {

			const l = { ...LOOK_DEFAULTS, ...json };
			if ( lookById.has( l.id ) || userLook( l.id ) ) l.id = `${l.id}-${Date.now().toString( 36 ).slice( - 4 )}`;
			const { ok, errors } = validateLook( l );
			if ( ! ok ) throw new Error( errors.slice( 0, 3 ).join( '; ' ) );
			if ( l.lut ) { const lut = setCustomLut( decodeLut( l.lut ) ); if ( persist ) saveCustomLut( lut ); }
			store.set( { userLooks: [ ...state().userLooks, l ] } );
			emit( 'library' );
			return l;

		},

		/**
		 * Imports a .cube LUT (§6.4 F) into the custom slot and turns the look's LUT on with it.
		 * Returns { title, size } (the size of the file; it is resampled to 33³).
		 */
		importCube( text, name = 'grade.cube' ) {

			const parsed = parseCube( text );
			if ( parsed.title === 'Imported LUT' ) parsed.title = name.replace( /\.cube$/i, '' );
			const lut = setCustomLut( parsed );
			if ( persist ) saveCustomLut( lut );
			actions.setParam( 'grade.lut.enabled', true );
			actions.setParam( 'grade.lut.preset', 'custom' );
			runtime.apply( resolved ); // the custom texture changed even if the values did not
			emit( 'lut', { title: lut.title, size: parsed.size } );
			return { title: lut.title, size: parsed.size };

		},

		/** The imported LUT's title, or null. */
		customLutTitle: () => customLut()?.title ?? null,

		deleteLook( id ) {

			store.set( { userLooks: state().userLooks.filter( ( l ) => l.id !== id ) } );
			if ( state().recipe.base === id ) actions.setLook( 'plain', { transition: false } );
			emit( 'library' );

		},

		// History (§6.8)
		undo() {

			const prev = history.undo( snapshot() );
			if ( ! prev ) return false;
			store.set( prev, { replace: true } );
			resolve();
			emit( 'recipe', state().recipe ); emit( 'parts', state().parts ); emit( 'look', look() );
			return true;

		},

		redo() {

			const next = history.redo( snapshot() );
			if ( ! next ) return false;
			store.set( next, { replace: true } );
			resolve();
			emit( 'recipe', state().recipe ); emit( 'parts', state().parts ); emit( 'look', look() );
			return true;

		},

		// Share links (§6.12)
		/** The whole state as `#state=…` (the looks it references travel with it). */
		async shareHash() {

			const s = state();
			const ids = new Set( [ s.recipe.base, ...Object.values( s.recipe.modules ).flatMap( ( m ) => [ m.from, m.blend?.with ] ), s.recipe.morph?.with, ...Object.values( s.parts ).map( ( p ) => p.look ) ].filter( Boolean ) );
			const looks = [ ...ids ].filter( ( id ) => ! lookById.has( id ) ).map( ( id ) => getLook( id ) );
			const payload = { v: 1, scene: scene().imported ? SCENES[ 0 ].id : s.sceneId, tier: s.tier, density: s.density, shot: s.shot, ...snapshot(), overrides: { [ s.recipe.base ]: overrides() }, transition: s.transition, looks };
			return `#state=${await encodeShare( payload )}`;

		},

		/** Opens a `#state=` or `#look=` share text. */
		async openShare( kind, text ) {

			const data = await decodeShare( text );
			if ( kind === 'look' ) { actions.setLook( data, { transition: false } ); return data; }
			for ( const l of data.looks || [] ) registerLook( l );
			commit();
			store.set( { recipe: { base: 'plain', modules: {}, morph: null, ...data.recipe }, parts: data.parts || {}, overrides: { ...state().overrides, ...data.overrides }, strength: data.strength ?? 1, transition: data.transition || state().transition, tier: data.tier ?? state().tier, density: data.density ?? 1 }, { replace: true } );
			actions.setScene( data.scene, { tier: data.tier, shot: data.shot ?? undefined } );
			emit( 'look', look() ); emit( 'recipe', state().recipe ); emit( 'parts', state().parts );
			return data;

		},

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

			const result = await importModel( buffer, name, { renderer: runtime.renderer } );
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

		// Walk mode, the toybox and zones (§6.10, §7.15)
		/** Walk mode: the hero becomes the player (Rapier character controller, third-person camera). */
		async setWalk( on ) {

			if ( !! on === !! walk ) return !! walk;
			if ( on ) {

				const hero = built && findHero( built.root );
				if ( ! hero ) throw new Error( 'This scene has no hero to walk with' );
				const root = built.root;
				await ensurePhysics();
				if ( ! physics || built.root !== root || walk ) return !! walk;
				walk = new WalkController( physics, { player: hero, camera } );
				controls.enabled = false;
				fov = Math.min( 110, 55 * ( resolved?.global[ 'lens.fovScale' ] ?? 1 ) );
				camera.fov = fov;
				camera.updateProjectionMatrix();
				walk.sync( 0 );

			} else {

				walk.dispose();
				walk = null;
				controls.enabled = true;
				goToShot();
				zoneKey = '';
				show( target );

			}

			emit( 'walk', !! walk );
			return !! walk;

		},

		/** Moves the player to a point (tests, the plan player, falling out of the world). */
		walkTo( p ) { if ( ! walk ) return; walk.teleport( p ); walk.sync( 0 ); updateZones(); },

		/** Throws a ball from the camera through normalized device coordinates (default: the center). */
		throwBall( x = 0, y = 0 ) {

			if ( ! physics ) return null;
			raycaster.setFromCamera( new THREE.Vector2( x, y ), camera );
			const dir = raycaster.ray.direction.clone();
			if ( walk ) dir.y += 0.12;
			const origin = camera.position.clone().addScaledVector( dir, walk ? 1.2 : 0.8 );
			const ball = physics.throwBall( origin, dir.normalize(), 17 );
			emit( 'throw', ball );
			return ball;

		},

		/** Assigns a look to a zone (null = the zone's own look). */
		setZoneLook( sceneId, zoneId, lookId ) {

			const zones = { ...state().plan.zones, [ sceneId ]: { ...state().plan.zones[ sceneId ], [ zoneId ]: lookId || undefined } };
			store.set( { plan: { ...state().plan, zones: JSON.parse( JSON.stringify( zones ) ) } }, { replace: true } );
			zoneKey = '';
			emit( 'plan', state().plan );

		},

		// Level look plan (§6.10)
		setPlanLevel( sceneId, patch ) {

			const levels = { ...state().plan.levels, [ sceneId ]: { ...state().plan.levels[ sceneId ], ...patch } };
			store.set( { plan: { ...state().plan, levels } }, { replace: true } );
			emit( 'plan', state().plan );

		},
		setPlanSeconds( n ) { store.set( { plan: { ...state().plan, seconds: Math.max( 2, Math.min( 30, Number( n ) || 6 ) ) } }, { replace: true } ); emit( 'plan', state().plan ); },
		/** Plays the plan: every scene in order, each with its look and transition. */
		playPlan() { playing = { index: - 1, t: 0 }; nextLevel(); emit( 'plan', state().plan ); },
		stopPlan() { playing = null; emit( 'plan', state().plan ); },

		// Player-selectable visual modes (§6.10)
		addMode( name, look ) {

			if ( state().modes.length >= 4 ) return null;
			const modes = [ ...state().modes, { name: String( name ).slice( 0, 24 ), look } ];
			store.set( { modes, mode: state().mode < 0 ? 0 : state().mode } );
			emit( 'modes', modes );
			return modes.at( - 1 );

		},
		updateMode( i, patch ) { const modes = state().modes.map( ( m, k ) => ( k === i ? { ...m, ...patch } : m ) ); store.set( { modes } ); emit( 'modes', modes ); },
		removeMode( i ) { const modes = state().modes.filter( ( _, k ) => k !== i ); store.set( { modes, mode: Math.min( state().mode, modes.length - 1 ) } ); emit( 'modes', modes ); },
		setMode( i ) {

			const m = state().modes[ i ];
			if ( ! m || ! hasLook( m.look ) ) return null;
			store.set( { mode: i } );
			actions.setLook( m.look );
			emit( 'modes', state().modes );
			return m;

		},
		cycleMode() { const n = state().modes.length; return n ? actions.setMode( ( state().mode + 1 ) % n ) : null; },
		setCycling( on ) { cycling = on && state().modes.length > 1 ? { t: 0 } : null; emit( 'modes', state().modes ); },
		/**
		 * Suggests an accessibility mode from the current look: heavier ink, more value
		 * contrast and a palette safe for color-blind players (Okabe–Ito).
		 */
		addHighContrastMode() {

			const base = target.global;
			const hc = lookFromResolved( resolveTarget(), {
				id: `high-contrast-${Date.now().toString( 36 ).slice( - 4 )}`, name: `${look().name.replace( / \(.*\)$/, '' )} · High-contrast`,
				inspiredBy: [ 'Accessibility options in games' ], tags: [ 'accessibility' ], pillars: [ 'Silhouettes and value contrast carry the information, not hue.' ], mistakes: [],
				description: 'Thicker lines, stronger value contrast and a color-blind-safe palette.', phone: look().phone,
			} );
			Object.assign( hc.params, {
				'lines.screen.enabled': true, 'lines.screen.thickness': Math.min( 6, Math.max( 2.5, base[ 'lines.screen.thickness' ] * 1.6 ) ), 'lines.screen.color': '#000000',
				'grade.contrast': Math.min( 1.6, Math.max( 1.25, base[ 'grade.contrast' ] ) ), 'palette.colors': [ '#000000', '#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7', '#ffffff' ], 'palette.remap': 0.6,
			} );
			store.set( { userLooks: [ ...state().userLooks, hc ] } );
			emit( 'library' );
			return actions.addMode( 'High-contrast', hc.id );

		},
		setDeadzone( d ) { store.set( { deadzone: Math.max( 0.02, Math.min( 0.5, d ) ) } ); },

		// Designer views (§6.13)
		/** A designer view (value, squint, silhouette…) or null for the look. Rebuilds only the post graph. */
		setView( id ) {

			const next = id && VIEWS.some( ( v ) => v.id === id ) ? id : null;
			store.set( { view: next } );
			runtime.setView( next );
			emit( 'view', next );

		},
		/** V / Y: Off → each eye-training view → Off. */
		cycleView() {

			const list = [ null, ...VIEWS.filter( ( v ) => ! v.buffer ).map( ( v ) => v.id ) ];
			const next = list[ ( list.indexOf( state().view ) + 1 ) % list.length ];
			actions.setView( next );
			return next ? VIEWS.find( ( v ) => v.id === next ) : null;

		},

		// Performance (§6.11)
		/**
		 * "Make phone-friendly variant": the standard substitutions (no AO, DOF or motion blur;
		 * hull outlines instead of screen lines; FXAA; smaller painterly radius at half scale;
		 * emissive-only bloom; 1024 shadows) saved as "‹Look› · Mobile" in My looks.
		 */
		makeMobileVariant() {

			const base = look();
			const sub = mobileSubstitutions( target.global, target.parts );
			const parts = copy( state().parts );
			for ( const [ p, o ] of Object.entries( sub.partOverrides ) ) parts[ p ] = { ...parts[ p ], overrides: { ...parts[ p ]?.overrides, ...o } };
			const r = resolveRecipe( { recipe: state().recipe, getLook, parts, sceneParams: scene().params, overrides: { ...overrides(), ...sub.overrides }, strength: state().strength } );
			const kit = rubric( r.global, r.parts );
			const variant = lookFromResolved( r, {
				id: `${base.id.replace( /-mobile.*$/, '' )}-mobile-${Date.now().toString( 36 ).slice( - 4 )}`, name: `${base.name.replace( / · Mobile$/, '' )} · Mobile`,
				inspiredBy: base.inspiredBy, tags: [ ...new Set( [ ...( base.tags || [] ), 'phone-safe' ] ) ], pillars: base.pillars, mistakes: base.mistakes,
				description: `Phone-friendly variant of ${base.name}: ${sub.changes.join( ' ' ) || 'no changes needed.'}`, phone: { safe: 'cheap', high: 'medium', desktop: 'heavy' }[ kit.verdict ],
			} );
			store.set( { userLooks: [ ...state().userLooks, variant ] } );
			emit( 'library' );
			return { look: variant, verdict: kit.label, total: kit.total, changes: sub.changes };

		},

	};

	return {
		store, camera, controls, runtime, actions, history,
		get resolved() { return resolved; },
		/** The resolution the state lands on (equals `resolved` unless a transition runs). */
		get target() { return target; },
		get transition() { return transition; },
		get built() { return built; },
		get physics() { return physics; },
		get walk() { return walk; },
		get walking() { return !! walk; },
		get playing() { return !! playing; },
		get cycling() { return !! cycling; },
		walkInput,
		zones,
		zoneWeights: currentZoneWeights,
		/** Waits for the toybox physics to load (tests). */
		physicsReady: () => ensurePhysics(),
		scene, look, getLook, hasLook, libraryLooks, overrides, shotId,
		/** Library looks grouped by family (a look and its variants), in library order. */
		lookFamilies: () => {

			const out = new Map();
			for ( const l of libraryLooks() ) {

				const key = l.family || l.id;
				if ( ! out.has( key ) ) out.set( key, [] );
				out.get( key ).push( l );

			}

			return [ ...out.values() ];

		},
		/** What one look alone resolves to on the current scene (gallery previews). */
		resolveFor: ( lookId ) => resolveRecipe( { recipe: { base: lookId, modules: {}, morph: null }, getLook, parts: {}, sceneParams: scene().params, overrides: {}, strength: 1 } ),
		lookValue: ( id ) => lookValue( look(), scene().params, id ),
		/** The frozen animation time, or null while the clock runs. */
		get frozenTime() { return frozen; },
		isModified: ( id ) => ( state().ui.scope && byId.get( id )?.scope !== 'global' ? id in ( state().parts[ state().ui.scope ]?.overrides || {} ) : id in overrides() ),
		coherence: () => ( target ? checkCoherence( target.global, { tier: state().tier } ) : [] ),
		/** The current result as a sparse look (Export JSON). */
		currentAsLook: () => lookFromResolved( resolveTarget(), { id: `${state().recipe.base}-export`, name: `${look().name} (export)`, inspiredBy: look().inspiredBy, tags: look().tags, pillars: look().pillars, mistakes: look().mistakes, description: look().description } ),
		partRecipe: ( part ) => partRecipe( state().parts, part ),
		/** Meshes per part in the current scene (Parts tab). */
		partCounts: () => {

			const n = {};
			built?.root.traverse( ( o ) => { if ( o.isMesh && o.userData.style ) n[ o.userData.style.part ] = ( n[ o.userData.style.part ] || 0 ) + 1; } );
			return n;

		},
		on( fn ) { listeners.add( fn ); return () => listeners.delete( fn ); },
		/** Lets UI modules announce events (audited, brief-tab, lesson…) to other listeners. */
		emit,

		start() {

			if ( state().sceneId === 'import' && ! imported ) store.set( { sceneId: SCENES[ 0 ].id, shot: null } );
			if ( ! hasLook( state().recipe.base ) ) store.set( { recipe: { base: 'plain', modules: {}, morph: null } } );
			const s = state();
			controls.autoRotate = s.turntable;
			runtime.setCompare( { split: s.compare.mode === 'split', splitPos: s.compare.splitPos } );
			loadScene( { moveCamera: true } );

		},

		/** Per frame: clock, transitions, flicker, camera, animation. */
		tick( dt ) {

			clock += dt;
			const t = frozen ?? clock;

			if ( transition ) {

				transition.t = Math.min( 1, transition.t + dt / transition.duration );
				const k = ease( transition.t );
				if ( transition.type === 'morph' ) show( transition.t >= 1 ? transition.to : blendResolved( transition.from, transition.to, k ), { quiet: transition.t < 1 } );
				else runtime.setTransition( { progress: k } );
				if ( transition.t >= 1 ) { if ( transition.type !== 'morph' ) runtime.setTransition( { mode: null } ); transition = null; zoneKey = ''; emit( 'transitioned', resolved ); }

			}

			// Walk mode input (keyboard, gamepad, touch stick, mouse drag) → the controller; physics steps at 1/60 s.
			if ( walk ) {

				const k = walkInput.keys, clamp = ( v ) => Math.max( - 1, Math.min( 1, v ) );
				walk.input.move = [ clamp( ( k.has( 'd' ) || k.has( 'arrowright' ) ? 1 : 0 ) - ( k.has( 'a' ) || k.has( 'arrowleft' ) ? 1 : 0 ) + walkInput.padMove[ 0 ] + walkInput.touchMove[ 0 ] ), clamp( ( k.has( 'w' ) || k.has( 'arrowup' ) ? 1 : 0 ) - ( k.has( 's' ) || k.has( 'arrowdown' ) ? 1 : 0 ) + walkInput.padMove[ 1 ] + walkInput.touchMove[ 1 ] ) ];
				walk.input.jump = k.has( ' ' ) || walkInput.padJump || walkInput.touchJump;
				walk.input.run = k.has( 'shift' ) || walkInput.padRun || walkInput.touchRun;
				walk.input.look = [ walkInput.mouse[ 0 ] + walkInput.padLook[ 0 ] * dt * 2.4, walkInput.mouse[ 1 ] + walkInput.padLook[ 1 ] * dt * 1.6 ];
				walkInput.mouse = [ 0, 0 ];

			}

			// A frozen clock (repeatable captures) freezes physics too.
			if ( physics && dt > 0 && frozen === null ) physics.update( dt, walk ? ( step ) => walk.step( step ) : null );
			if ( walk ) { walk.sync( dt ); updateZones(); }

			if ( playing && dt > 0 && ( playing.t += dt ) >= state().plan.seconds ) nextLevel();
			if ( cycling && dt > 0 && ( cycling.t += dt ) >= 2.5 ) { cycling.t = 0; actions.cycleMode(); }

			if ( state().compare.mode === 'flicker' ) runtime.setCompare( { flicker: Math.floor( clock / 0.5 ) % 2 === 1 } );
			if ( ! walk ) controls.update( dt );
			// Stepped animation ("on twos"): the clock is quantized per part, the camera stays smooth.
			built?.animate( t, ( part ) => runtime.steppedTime( t, part ) );
			runtime.update( t, { focus: controls.target } );

		},

		param: ( id ) => byId.get( id ),
	};

}
