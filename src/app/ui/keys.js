// Shortcut overlay (design §5.3, Appendix D, M9): every key and gamepad button, opened
// with ? and closed with Esc or a click.

import { KEYS } from '../input/keyboard.js';
import { GAMEPAD_MAP } from '../input/gamepad.js';
import { h } from './dom.js';

export function createKeysOverlay( root ) {

	function show() {

		root.replaceChildren( h( 'div.modal-box.keys-box', {},
			h( 'header', {}, h( 'b', {}, 'Keyboard and gamepad' ), h( 'button.close', { onclick: close }, '✕' ) ),
			h( 'div.keys-grid', {},
				h( 'table.keys', {}, h( 'tr', {}, h( 'th', {}, 'Keyboard' ), h( 'th', {}, '' ) ), ...KEYS.map( ( [ k, v ] ) => h( 'tr', {}, h( 'td', {}, h( 'kbd', {}, k ) ), h( 'td', {}, v ) ) ) ),
				h( 'table.keys', {}, h( 'tr', {}, h( 'th', {}, 'Gamepad (Xbox / PlayStation)' ), h( 'th', {}, '' ) ), ...GAMEPAD_MAP.map( ( b ) => h( 'tr', {}, h( 'td', {}, h( 'kbd', {}, b.xbox === b.ps ? b.xbox : `${b.xbox} / ${b.ps}` ) ), h( 'td', {}, b.action ) ) ), h( 'tr', {}, h( 'td', {}, h( 'kbd', {}, 'Sticks' ) ), h( 'td', {}, 'Right: orbit (look in walk mode) · Left: move in walk mode' ) ) ),
			),
			h( 'p.hint', {}, 'Mouse: drag to orbit, scroll to zoom, click to pick parts (Scene tab) or throw a ball (toybox). Touch: one finger orbits, two zoom.' ),
		) );
		root.hidden = false;

	}

	function close() { root.hidden = true; }
	root.addEventListener( 'pointerdown', ( ev ) => { if ( ev.target === root ) close(); } );
	return { show, close, toggle: () => ( root.hidden ? show() : close() ), get open() { return ! root.hidden; } };

}
