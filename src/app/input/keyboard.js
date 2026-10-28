// Keyboard map (design §5.3, Appendix D).

export const KEYS = [
	[ 'Space (hold)', 'Compare with plain' ],
	[ 'Tab', 'Walk mode (WASD, Shift runs, Space jumps)' ],
	[ 'M', 'Cycle player visual mode' ],
	[ 'C', 'Split wipe' ],
	[ 'F', 'Flicker compare' ],
	[ 'Q / E', 'Previous / next look' ],
	[ '1–9', 'Pick a look (gallery order)' ],
	[ 'Ctrl+Z / Ctrl+Shift+Z', 'Undo / redo' ],
	[ '[ / ]', 'Previous / next scene' ],
	[ '- / =', 'Complexity down / up' ],
	[ 'N', 'Next camera shot' ],
	[ 'T', 'Turntable' ],
	[ 'H', 'Hide UI' ],
	[ 'L', 'Learn tab' ],
	[ 'Esc', 'Close panels' ],
	[ '?', 'Show these keys' ],
];

export function bindKeyboard( app, ui ) {

	const typing = ( t ) => t.closest?.( 'input, textarea, select, [contenteditable]' );

	window.addEventListener( 'keydown', ( e ) => {

		if ( typing( e.target ) ) return;
		const k = e.key;

		// Walk mode: movement keys go to the player; Space jumps instead of comparing.
		const walkKey = k.length === 1 ? k.toLowerCase() : k.toLowerCase();
		if ( app.walking && [ 'w', 'a', 's', 'd', ' ', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright' ].includes( walkKey ) && ! e.ctrlKey && ! e.metaKey ) {

			e.preventDefault();
			app.walkInput.keys.add( walkKey );
			return;

		}

		if ( k === 'Tab' && ! e.ctrlKey && ! e.metaKey && ! e.altKey ) {

			e.preventDefault();
			if ( ! e.repeat ) app.actions.setWalk( ! app.walking ).catch( ( err ) => ui.toast?.( err.message ) );
			return;

		}

		if ( ( e.ctrlKey || e.metaKey ) && ! e.altKey && k.toLowerCase() === 'z' ) { e.preventDefault(); if ( e.shiftKey ) app.actions.redo(); else app.actions.undo(); return; }
		if ( ( e.ctrlKey || e.metaKey ) && ! e.altKey && k.toLowerCase() === 'y' ) { e.preventDefault(); app.actions.redo(); return; }
		if ( e.ctrlKey || e.metaKey || e.altKey ) return;

		if ( k === ' ' ) { e.preventDefault(); if ( ! e.repeat ) app.actions.setHold( true ); return; }
		if ( e.repeat ) return;

		const a = app.actions, s = app.store.get();
		const map = {
			c: () => a.setCompareMode( 'split' ),
			f: () => a.setCompareMode( 'flicker' ),
			q: () => a.stepLook( - 1 ),
			e: () => a.stepLook( 1 ),
			'[': () => a.stepScene( - 1 ),
			']': () => a.stepScene( 1 ),
			'-': () => a.setTier( s.tier - 1 ),
			'=': () => a.setTier( s.tier + 1 ),
			'+': () => a.setTier( s.tier + 1 ),
			n: () => a.nextShot(),
			m: () => { const mode = a.cycleMode(); ui.toast?.( mode ? `Mode: ${mode.name}` : 'No player modes yet: add some in the Play tab.' ); },
			t: () => a.setTurntable( ! s.turntable ),
			h: () => ui.toggleHidden(),
			l: () => ui.inspector.setTab( 'learn' ),
			'?': () => ui.showKeys(),
			Escape: () => ui.closePanels(),
		};

		const family = /^[1-9]$/.test( k ) ? app.lookFamilies()[ Number( k ) - 1 ] : null;
		const fn = map[ k.length === 1 ? k.toLowerCase() : k ] ?? ( family ? () => a.setLook( family[ 0 ].id ) : null );
		if ( fn ) { e.preventDefault(); fn(); }

	} );

	window.addEventListener( 'keyup', ( e ) => {

		app.walkInput.keys.delete( e.key.toLowerCase() );
		if ( e.key === ' ' ) app.actions.setHold( false );

	} );
	window.addEventListener( 'blur', () => { app.actions.setHold( false ); app.walkInput.keys.clear(); } );

}
