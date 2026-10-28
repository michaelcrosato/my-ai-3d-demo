// Touch controls for walk mode (design §5.3: "virtual stick (P2)"): a stick on the left
// moves (pushed to the rim: run), dragging anywhere else on the view looks around (the
// canvas handles that), and a button jumps. They show in walk mode on touch screens
// (pointer: coarse), or on any screen with ?touch=1. They feed the same walk input as the
// gamepad, so walk mode needs no code of its own for touch.

import { h } from '../ui/dom.js';

const RADIUS = 56; // px: how far the knob travels

export function createTouchControls( viewport, app, { force = false } = {} ) {

	const knob = h( 'div.touch-knob' );
	const stick = h( 'div.touch-stick', { title: 'Move (push to the rim to run)' }, knob );
	const jump = h( 'button.touch-jump', { type: 'button', 'aria-label': 'Jump' }, 'Jump' );
	const root = h( 'div.touch-controls', { hidden: true }, stick, jump );
	viewport.append( root );

	const input = app.walkInput;
	let forced = force;
	const coarse = () => forced || window.matchMedia?.( '(pointer: coarse)' ).matches;
	let active = null, center = [ 0, 0 ];

	const move = ( x, y ) => {

		let dx = x - center[ 0 ], dy = y - center[ 1 ];
		const len = Math.hypot( dx, dy );
		if ( len > RADIUS ) { dx *= RADIUS / len; dy *= RADIUS / len; }
		knob.style.transform = `translate(${dx}px, ${dy}px)`;
		// Screen y grows down; forward is up.
		input.padMove = [ dx / RADIUS, - dy / RADIUS ];
		input.padRun = len >= RADIUS * 0.95;

	};
	const release = () => { active = null; knob.style.transform = ''; input.padMove = [ 0, 0 ]; input.padRun = false; };

	stick.addEventListener( 'pointerdown', ( e ) => {

		e.preventDefault();
		active = e.pointerId;
		stick.setPointerCapture?.( e.pointerId );
		const r = stick.getBoundingClientRect();
		center = [ r.left + r.width / 2, r.top + r.height / 2 ];
		move( e.clientX, e.clientY );

	} );
	stick.addEventListener( 'pointermove', ( e ) => { if ( e.pointerId === active ) move( e.clientX, e.clientY ); } );
	for ( const type of [ 'pointerup', 'pointercancel', 'lostpointercapture' ] ) stick.addEventListener( type, ( e ) => { if ( e.pointerId === active ) release(); } );

	jump.addEventListener( 'pointerdown', ( e ) => { e.preventDefault(); input.padJump = true; } );
	for ( const type of [ 'pointerup', 'pointercancel', 'pointerleave' ] ) jump.addEventListener( type, () => { input.padJump = false; } );

	const update = () => { root.hidden = ! ( app.walking && coarse() ); if ( root.hidden ) { release(); input.padJump = false; } };
	app.on( ( type ) => { if ( type === 'walk' ) update(); } );
	window.matchMedia?.( '(pointer: coarse)' ).addEventListener?.( 'change', update );
	update();

	return { root, update, get visible() { return ! root.hidden; }, set force( on ) { forced = !! on; update(); } };

}
