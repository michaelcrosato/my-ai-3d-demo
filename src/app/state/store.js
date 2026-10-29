// App state (design §7.4) with localStorage autosave (§6.15). Storage access is
// wrapped, so the app works without it.

const KEY = 'stylelab.state.v1';

const initial = () => ( {
	sceneId: 'harbor',
	tier: 0,
	density: 1,
	shot: null, // null = the scene's default shot
	turntable: false,
	// The recipe (§6.6): a base look, per-module sources and blends, an optional morph.
	recipe: { base: 'plain', modules: {}, morph: null },
	parts: {}, // { part: { look, modules, overrides, inherit } } (§6.7)
	strength: 1,
	overrides: {}, // { baseLookId: { paramId: value } }, so tweaks survive switching looks
	userLooks: [], // My looks
	transition: { type: 'morph', duration: 0.6 },
	isolate: null,
	// Level look plan (§6.10): per scene a look and the transition into it; zone looks.
	plan: { levels: {}, zones: {}, seconds: 6 },
	modes: [], // player-selectable visual modes: [{ name, look }]
	mode: - 1,
	deadzone: 0.15, // gamepad sticks (radial)
	rumble: true, // a short gamepad rumble on look change (where the pad supports it)
	showChanges: true, // "what changed" toast after hold-to-compare
	view: null, // designer view (Analyze tab)
	lessons: { done: [] },
	compare: { mode: 'off', splitPos: 0.5 },
	ui: { tab: 'look', learn: null, hidden: false, inspectorOpen: false, scope: null },
	tips: { seen: [] },
} );

function load() {

	try {

		const saved = JSON.parse( localStorage.getItem( KEY ) );
		if ( ! saved ) return initial();
		const base = initial();
		// v0.5 and earlier stored one look id; it becomes the recipe's base.
		const recipe = saved.recipe || ( saved.lookId ? { base: saved.lookId, modules: {}, morph: null } : base.recipe );
		delete saved.lookId;
		return { ...base, ...saved, recipe, isolate: null, view: null, lessons: { ...base.lessons, ...saved.lessons }, plan: { ...base.plan, ...saved.plan }, compare: { ...base.compare, ...saved.compare, mode: 'off' }, ui: { ...base.ui, ...saved.ui, scope: null }, tips: { ...base.tips, ...saved.tips } };

	} catch {

		return initial();

	}

}

export function createStore( { persist = true } = {} ) {

	let state = persist ? load() : initial();
	const listeners = new Set();
	let saveTimer = null;

	const save = () => {

		if ( ! persist ) return;
		clearTimeout( saveTimer );
		saveTimer = setTimeout( () => { try { localStorage.setItem( KEY, JSON.stringify( state ) ); } catch { /* storage unavailable */ } }, 250 );

	};

	return {
		get: () => state,
		/**
		 * Shallow-merges `patch` (one level deep for plain objects) and notifies with the
		 * changed keys. With `replace`, the patch's values replace the old ones outright
		 * (removing a key from `parts`, undo, share links).
		 */
		set( patch, { replace = false } = {} ) {

			const changed = Object.keys( patch );
			const next = { ...state };
			for ( const k of changed ) next[ k ] = ! replace && patch[ k ] && typeof patch[ k ] === 'object' && ! Array.isArray( patch[ k ] ) && state[ k ] && typeof state[ k ] === 'object' ? { ...state[ k ], ...patch[ k ] } : patch[ k ];
			state = next;
			save();
			for ( const fn of listeners ) fn( state, changed );

		},
		subscribe( fn ) { listeners.add( fn ); return () => listeners.delete( fn ); },
		reset() { state = initial(); save(); for ( const fn of listeners ) fn( state, Object.keys( state ) ); },
	};

}
