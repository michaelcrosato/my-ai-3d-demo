// Keyboard map (design §5.3, Appendix D).

import { LOOKS } from '../../content/looks/index.js';

export const KEYS = [
	[ 'Space (hold)', 'Compare with plain' ],
	[ 'C', 'Split wipe' ],
	[ 'F', 'Flicker compare' ],
	[ 'Q / E', 'Previous / next look' ],
	[ '1–5', 'Pick a look' ],
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

		if ( typing( e.target ) || e.ctrlKey || e.metaKey || e.altKey ) return;
		const k = e.key;

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
			t: () => a.setTurntable( ! s.turntable ),
			h: () => ui.toggleHidden(),
			l: () => ui.inspector.setTab( 'learn' ),
			'?': () => ui.showKeys(),
			Escape: () => ui.closePanels(),
		};

		const fn = map[ k.length === 1 ? k.toLowerCase() : k ] ?? ( /^[1-9]$/.test( k ) && LOOKS[ Number( k ) - 1 ] ? () => a.setLook( LOOKS[ Number( k ) - 1 ].id ) : null );
		if ( fn ) { e.preventDefault(); fn(); }

	} );

	window.addEventListener( 'keyup', ( e ) => { if ( e.key === ' ' ) app.actions.setHold( false ); } );
	window.addEventListener( 'blur', () => app.actions.setHold( false ) );

}
