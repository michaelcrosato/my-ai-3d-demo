// Compare UI (design §6.9): hold button, split wipe with a draggable divider, flicker,
// and the PLAIN badge so screenshots are unambiguous.

import { $ } from './dom.js';

export function createCompareUI( app ) {

	const hold = $( 'hold-btn' ), split = $( 'split-btn' ), flicker = $( 'flicker-btn' );
	const handle = $( 'split-handle' ), badge = $( 'plain-badge' ), viewport = $( 'viewport' );

	const press = ( on ) => ( ev ) => { ev.preventDefault(); app.actions.setHold( on ); };
	hold.addEventListener( 'pointerdown', press( true ) );
	for ( const t of [ 'pointerup', 'pointerleave', 'pointercancel' ] ) hold.addEventListener( t, press( false ) );
	split.addEventListener( 'click', () => app.actions.setCompareMode( 'split' ) );
	flicker.addEventListener( 'click', () => app.actions.setCompareMode( 'flicker' ) );

	// Divider drag: the handle captures the pointer, so orbiting doesn't start.
	let dragging = false;
	handle.addEventListener( 'pointerdown', ( ev ) => { dragging = true; handle.setPointerCapture( ev.pointerId ); ev.stopPropagation(); } );
	handle.addEventListener( 'pointermove', ( ev ) => {

		if ( ! dragging ) return;
		const r = viewport.getBoundingClientRect();
		app.actions.setSplit( Math.min( 1, Math.max( 0, ( ev.clientX - r.left ) / r.width ) ) );

	} );
	handle.addEventListener( 'pointerup', () => { dragging = false; } );

	const sync = () => {

		const c = app.store.get().compare;
		split.classList.toggle( 'on', c.mode === 'split' );
		flicker.classList.toggle( 'on', c.mode === 'flicker' );
		handle.hidden = c.mode !== 'split';
		handle.style.left = `${c.splitPos * 100}%`;

	};

	app.on( ( type, detail ) => {

		if ( type === 'compare' ) sync();
		if ( type === 'hold' ) hold.classList.toggle( 'on', detail );

	} );
	sync();

	/** Called every frame: the badge follows what is actually on screen. */
	return {
		frame() {

			const U = app.runtime.U;
			badge.hidden = ! ( U.hold.value || U.flicker.value );

		},
	};

}
