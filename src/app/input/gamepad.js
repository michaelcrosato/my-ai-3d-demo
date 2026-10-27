// Gamepad layer (design §7.16): polled every frame, standard mapping, radial deadzone,
// edge detection, hot-plug toasts.
//   X / □ hold compare · LB / RB looks · LT split (analog divider) · right stick orbit
//   D-pad ←/→ scenes, ↓/↑ complexity · R3 next shot · Menu hide UI

const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

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

	function poll( dt ) {

		const pads = navigator.getGamepads?.() || [];
		const pad = [ ...pads ].find( ( p ) => p && p.connected && p.mapping === 'standard' ) || [ ...pads ].find( Boolean );
		if ( ! pad ) return;

		const down = pad.buttons.map( ( b ) => b.pressed );
		const pressed = ( i ) => down[ i ] && ! prev[ i ];
		const released = ( i ) => ! down[ i ] && prev[ i ];
		const a = app.actions, s = app.store.get();

		if ( pressed( B.X ) ) a.setHold( true );
		if ( released( B.X ) ) a.setHold( false );
		if ( pressed( B.LB ) ) a.stepLook( - 1 );
		if ( pressed( B.RB ) ) a.stepLook( 1 );
		if ( pressed( B.LEFT ) ) a.stepScene( - 1 );
		if ( pressed( B.RIGHT ) ) a.stepScene( 1 );
		if ( pressed( B.DOWN ) ) a.setTier( s.tier - 1 );
		if ( pressed( B.UP ) ) a.setTier( s.tier + 1 );
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

		// Right stick orbits around the target.
		const [ rx, ry ] = deadzone( pad.axes[ 2 ] ?? 0, pad.axes[ 3 ] ?? 0 );
		if ( rx || ry ) {

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
