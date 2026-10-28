// Onboarding (design §5.2, M9): a first-run welcome that offers three ways in (the guided
// tour in the Verify panel, the first lesson, or just exploring), then coach marks. It
// shows once; Help (?) brings back the shortcut overlay, and the Verify panel's tour is
// always there.

import { h } from './dom.js';

export function createOnboarding( root, app, { openTour, startLesson, showKeys } ) {

	const seen = () => app.store.get().tips.seen.includes( 'welcome' );
	const mark = () => { if ( ! seen() ) app.store.set( { tips: { seen: [ ...app.store.get().tips.seen, 'welcome' ] } } ); };

	function close() { root.hidden = true; mark(); }

	function show() {

		root.replaceChildren( h( 'div.modal-box.welcome', {},
			h( 'h2', {}, 'Welcome to Style Lab' ),
			h( 'p.lead', {}, 'Choose an art style for your game before you build it, then hand it to the AI agents that build it.' ),
			h( 'p', {}, 'The scene you see is what an agent makes by default. Pick a look in the gallery, hold Space (or Hold to compare) to see that default again, and mix and tune until it is yours.' ),
			h( 'div.welcome-options', {},
				h( 'button.primary', { onclick: () => { close(); openTour(); } }, h( 'b', {}, '🧭 Take the guided tour' ), h( 'span', {}, 'Short checks in learning order, each with "Set it up for me". The sign-off ones are the ones I need your report on.' ) ),
				h( 'button', { onclick: () => { close(); startLesson( 'L1' ); } }, h( 'b', {}, '🎓 Lesson 1: Blockout to beautiful' ), h( 'span', {}, 'Eight levers, zero new geometry. About four minutes.' ) ),
				h( 'button', { onclick: close }, h( 'b', {}, '🔍 Just explore' ), h( 'span', {}, 'Tips pop up as you go. Press ? any time for the keys.' ) ),
			),
			h( 'p.hint', {}, h( 'button.link', { onclick: () => { close(); showKeys(); } }, 'Keyboard and gamepad map' ), ' · Everything saves in this browser; share links carry your state to others.' ),
		) );
		root.hidden = false;

	}

	root.addEventListener( 'pointerdown', ( ev ) => { if ( ev.target === root ) close(); } );

	return {
		/** Shows the welcome on the first visit (not when a share link or the phone audit opens the app); `force` shows it anyway (?welcome=1). */
		maybeShow( { skip = false, force = false } = {} ) { if ( force || ( ! seen() && ! skip ) ) show(); },
		show,
		close,
		get open() { return ! root.hidden; },
	};

}
