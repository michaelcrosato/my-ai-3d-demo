// Gamepad layer (design §7.16, Appendix D): polled every frame, standard mapping, radial
// deadzone, edge detection, glyphs, hot-plug toasts. Walk mode takes the sticks.
//   X / □ hold compare · LB / RB looks · LT split (analog divider) · right stick orbit, RT zooms
//   D-pad ←/→ scenes, ↓/↑ complexity · L3 walk mode · R3 next shot · View cycle player mode
//   Menu hide UI · B back · in walk mode: left stick moves, A jumps, LB… still work; RT throws in the toybox
//   With a panel open: the D-pad moves focus between its controls (←/→ change sliders and
//   lists), A presses the focused control, B closes. A look change rumbles (P2).

const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

/** Every mapped button: standard index, Xbox and PlayStation glyphs, and what it does. */
export const GAMEPAD_MAP = [
	{ index: B.A, xbox: 'A', ps: '✕', action: 'Jump (walk mode)' },
	{ index: B.B, xbox: 'B', ps: '○', action: 'Back / close panel' },
	{ index: B.X, xbox: 'X', ps: '□', action: 'Hold: compare with plain' },
	{ index: B.Y, xbox: 'Y', ps: '△', action: 'Cycle designer view' },
	{ index: B.LB, xbox: 'LB', ps: 'L1', action: 'Previous look' },
	{ index: B.RB, xbox: 'RB', ps: 'R1', action: 'Next look' },
	{ index: B.LT, xbox: 'LT', ps: 'L2', action: 'Split wipe (analog)' },
	{ index: B.RT, xbox: 'RT', ps: 'R2', action: 'Zoom · throw in the toybox' },
	{ index: B.VIEW, xbox: 'View', ps: 'Create', action: 'Cycle player visual mode' },
	{ index: B.MENU, xbox: 'Menu', ps: 'Options', action: 'Hide UI' },
	{ index: B.L3, xbox: 'LS', ps: 'L3', action: 'Walk mode on / off' },
	{ index: B.R3, xbox: 'RS', ps: 'R3', action: 'Next camera shot' },
	{ index: B.UP, xbox: '↑', ps: '↑', action: 'Complexity up · in a panel: previous control' },
	{ index: B.DOWN, xbox: '↓', ps: '↓', action: 'Complexity down · in a panel: next control' },
	{ index: B.LEFT, xbox: '←', ps: '←', action: 'Previous scene · in a panel: decrease' },
	{ index: B.RIGHT, xbox: '→', ps: '→', action: 'Next scene · in a panel: increase' },
];

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * D-pad navigation inside an open panel (§7.16, P2): the visible focusable controls in
 * document order; `step` moves focus, `adjust` changes the focused slider, list or checkbox.
 */
export function panelFocus( panel ) {

	const items = () => [ ...panel.querySelectorAll( FOCUSABLE ) ].filter( ( el ) => el.offsetParent !== null || el.getClientRects().length );
	const focused = () => panel.querySelector( '.pad-focus' ) || ( panel.contains( document.activeElement ) ? document.activeElement : null );
	const set = ( el ) => {

		panel.querySelectorAll( '.pad-focus' ).forEach( ( x ) => x.classList.remove( 'pad-focus' ) );
		if ( ! el ) return null;
		el.classList.add( 'pad-focus' );
		el.focus( { preventScroll: true } );
		el.scrollIntoView?.( { block: 'nearest' } );
		return el;

	};

	return {
		step( dir ) {

			const list = items();
			if ( ! list.length ) return null;
			const i = list.indexOf( focused() );
			return set( list[ i < 0 ? ( dir > 0 ? 0 : list.length - 1 ) : ( i + dir + list.length ) % list.length ] );

		},
		adjust( dir ) {

			const el = focused();
			if ( el?.matches( 'input[type=range], input[type=number]' ) ) {

				if ( dir > 0 ) el.stepUp(); else el.stepDown();
				el.dispatchEvent( new Event( 'input', { bubbles: true } ) );
				el.dispatchEvent( new Event( 'change', { bubbles: true } ) );
				return el;

			}

			if ( el?.matches( 'select' ) ) {

				el.selectedIndex = Math.min( el.options.length - 1, Math.max( 0, el.selectedIndex + dir ) );
				el.dispatchEvent( new Event( 'change', { bubbles: true } ) );
				return el;

			}

			return this.step( dir );

		},
		activate() { const el = focused(); el?.click(); return el; },
		focused,
	};

}

/** The pad in use: the first connected standard-mapping pad, else any. */
export function activePad() {

	const pads = [ ...( navigator.getGamepads?.() || [] ) ];
	return pads.find( ( p ) => p && p.connected && p.mapping === 'standard' ) || pads.find( ( p ) => p && p.connected ) || null;

}

export function glyphSet( id = '' ) {

	if ( /054c|playstation|dualshock|dualsense/i.test( id ) ) return 'PlayStation';
	if ( /045e|xbox|xinput/i.test( id ) ) return 'Xbox';
	return 'generic';

}

/** Radial deadzone, rescaled so motion starts smoothly at the edge of the zone. */
export function deadzone( x, y, dz = 0.15 ) {

	const m = Math.hypot( x, y );
	if ( m < dz ) return [ 0, 0 ];
	const k = Math.min( 1, ( m - dz ) / ( 1 - dz ) ) / m;
	return [ x * k, y * k ];

}

export function createGamepad( app, ui, { onConnect } = {} ) {

	let prev = [];
	let splitByTrigger = false;
	const info = { connected: false, id: '', glyphs: 'generic', mapping: '' };

	window.addEventListener( 'gamepadconnected', ( e ) => { Object.assign( info, { connected: true, id: e.gamepad.id, glyphs: glyphSet( e.gamepad.id ), mapping: e.gamepad.mapping } ); onConnect?.( info ); } );
	window.addEventListener( 'gamepaddisconnected', () => { info.connected = false; onConnect?.( info ); } );

	let throwHeld = false;
	info.rumbles = 0;

	// A short rumble on look change, where the pad and browser support it (§7.16, P2).
	const rumble = () => {

		const act = activePad()?.vibrationActuator;
		if ( ! act?.playEffect || app.store.get().rumble === false ) return;
		info.rumbles ++;
		act.playEffect( 'dual-rumble', { startDelay: 0, duration: 120, weakMagnitude: 0.5, strongMagnitude: 0.25 } )?.catch?.( () => {} );

	};
	app.on( ( type ) => { if ( type === 'look' ) rumble(); } );

	function poll( dt ) {

		const pad = activePad();
		if ( ! pad ) return;

		const down = pad.buttons.map( ( b ) => b.pressed );
		const pressed = ( i ) => down[ i ] && ! prev[ i ];
		const released = ( i ) => ! down[ i ] && prev[ i ];
		const a = app.actions, s = app.store.get();
		const dz = s.deadzone;
		const toybox = !! app.scene().spareBalls;

		// An open panel takes the D-pad and A; every other button keeps working (hold X to
		// compare while the tour is open), and B closes the panel as always.
		const panel = ui.activePanel?.();
		if ( panel ) {

			const nav = panelFocus( panel );
			if ( pressed( B.UP ) ) nav.step( - 1 );
			if ( pressed( B.DOWN ) ) nav.step( 1 );
			if ( pressed( B.LEFT ) ) nav.adjust( - 1 );
			if ( pressed( B.RIGHT ) ) nav.adjust( 1 );
			if ( pressed( B.A ) ) nav.activate();

		}

		if ( pressed( B.L3 ) ) a.setWalk( ! app.walking ).catch( ( e ) => ui.toast?.( e.message ) );
		if ( pressed( B.VIEW ) ) { const m = a.cycleMode(); if ( m ) ui.toast?.( `Mode: ${m.name}` ); else ui.toast?.( 'No player modes yet: add some in the Play tab.' ); }
		if ( pressed( B.B ) ) ui.closePanels();
		if ( pressed( B.Y ) ) ui.cycleDesignerView?.();

		// RT: throws in the toybox (on the press), zooms otherwise (analog).
		const rt = pad.buttons[ B.RT ]?.value ?? 0;
		if ( toybox ) {

			if ( rt > 0.5 && ! throwHeld ) a.throwBall();
			throwHeld = rt > 0.5;

		} else if ( rt > 0.05 && ! app.walking ) {

			const { camera, controls } = app;
			const offset = camera.position.clone().sub( controls.target );
			offset.multiplyScalar( Math.max( 0.2, 1 - rt * dt * 1.5 ) );
			if ( offset.length() > 1.2 ) camera.position.copy( controls.target ).add( offset );

		}

		// Walk mode takes the sticks and A.
		if ( app.walking ) {

			const [ lx, ly ] = deadzone( pad.axes[ 0 ] ?? 0, pad.axes[ 1 ] ?? 0, dz );
			const [ rx, ry ] = deadzone( pad.axes[ 2 ] ?? 0, pad.axes[ 3 ] ?? 0, dz );
			app.walkInput.padMove = [ lx, - ly ];
			app.walkInput.padLook = [ rx, ry ];
			app.walkInput.padJump = down[ B.A ] && ! panel;
			app.walkInput.padRun = Math.hypot( lx, ly ) > 0.95; // stick fully pushed: run

		} else {

			app.walkInput.padMove = [ 0, 0 ];
			app.walkInput.padLook = [ 0, 0 ];
			app.walkInput.padJump = false;

		}

		if ( pressed( B.X ) ) a.setHold( true );
		if ( released( B.X ) ) a.setHold( false );
		if ( pressed( B.LB ) ) a.stepLook( - 1 );
		if ( pressed( B.RB ) ) a.stepLook( 1 );
		if ( ! panel ) {

			if ( pressed( B.LEFT ) ) a.stepScene( - 1 );
			if ( pressed( B.RIGHT ) ) a.stepScene( 1 );
			if ( pressed( B.DOWN ) ) a.setTier( s.tier - 1 );
			if ( pressed( B.UP ) ) a.setTier( s.tier + 1 );

		}
		if ( pressed( B.R3 ) ) a.nextShot();
		if ( pressed( B.MENU ) ) ui.toggleHidden();

		// LT: analog divider position while held; releasing restores the previous mode.
		const lt = pad.buttons[ B.LT ]?.value ?? 0;
		if ( lt > 0.05 ) {

			if ( ! splitByTrigger && s.compare.mode !== 'split' ) { a.setCompareMode( 'split' ); splitByTrigger = true; }
			a.setSplit( lt );

		} else if ( splitByTrigger ) {

			splitByTrigger = false;
			if ( app.store.get().compare.mode === 'split' ) a.setCompareMode( 'split' );

		}

		// Right stick orbits around the target (outside walk mode).
		const [ rx, ry ] = deadzone( pad.axes[ 2 ] ?? 0, pad.axes[ 3 ] ?? 0, dz );
		if ( ! app.walking && ( rx || ry ) ) {

			const { camera, controls } = app;
			const offset = camera.position.clone().sub( controls.target );
			const sph = { r: offset.length(), theta: Math.atan2( offset.x, offset.z ), phi: Math.acos( Math.min( 1, Math.max( - 1, offset.y / offset.length() ) ) ) };
			sph.theta -= rx * dt * 2.2;
			sph.phi = Math.min( Math.PI * 0.49, Math.max( 0.08, sph.phi + ry * dt * 1.6 ) );
			offset.set( Math.sin( sph.phi ) * Math.sin( sph.theta ), Math.cos( sph.phi ), Math.sin( sph.phi ) * Math.cos( sph.theta ) ).multiplyScalar( sph.r );
			camera.position.copy( controls.target ).add( offset );

		}

		prev = down;

	}

	return { poll, info };

}
