// App state (design §7.4) with localStorage autosave (§6.15). Storage access is
// wrapped, so the app works without it.

const KEY = 'stylelab.state.v1';

const initial = () => ( {
	sceneId: 'harbor',
	tier: 0,
	density: 1,
	shot: null, // null = the scene's default shot
	turntable: false,
	lookId: 'plain',
	strength: 1,
	overrides: {}, // { lookId: { paramId: value } }, so tweaks survive switching looks
	compare: { mode: 'off', splitPos: 0.5 },
	ui: { tab: 'look', learn: null, hidden: false, inspectorOpen: false },
	tips: { seen: [] },
} );

function load() {

	try {

		const saved = JSON.parse( localStorage.getItem( KEY ) );
		if ( ! saved ) return initial();
		const base = initial();
		return { ...base, ...saved, compare: { ...base.compare, ...saved.compare, mode: 'off' }, ui: { ...base.ui, ...saved.ui }, tips: { ...base.tips, ...saved.tips } };

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
		/** Shallow-merges `patch` (one level deep for plain objects) and notifies with the changed keys. */
		set( patch ) {

			const changed = Object.keys( patch );
			const next = { ...state };
			for ( const k of changed ) next[ k ] = patch[ k ] && typeof patch[ k ] === 'object' && ! Array.isArray( patch[ k ] ) && state[ k ] && typeof state[ k ] === 'object' ? { ...state[ k ], ...patch[ k ] } : patch[ k ];
			state = next;
			save();
			for ( const fn of listeners ) fn( state, changed );

		},
		subscribe( fn ) { listeners.add( fn ); return () => listeners.delete( fn ); },
		reset() { state = initial(); save(); for ( const fn of listeners ) fn( state, Object.keys( state ) ); },
	};

}
