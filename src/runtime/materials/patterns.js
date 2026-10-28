// Shading patterns (design §6.4 B, §7.8 finish()): halftone dots, hatch lines and the
// coordinates they are drawn in. Screen space keeps a constant size on screen; world
// space projects onto the surface along its dominant axis, so patterns stick to moving
// objects (the "shower-door" trade-off, lesson L9).

import { vec2, abs, max, step, fract, length, smoothstep, fwidth, cos, sin, select, screenCoordinate, screenSize, positionWorld, normalWorld } from 'three/tsl';

export const rotate2 = ( p, degrees ) => {

	const a = degrees.mul( Math.PI / 180 );
	const c = cos( a ), s = sin( a );
	return vec2( p.x.mul( c ).sub( p.y.mul( s ) ), p.x.mul( s ).add( p.y.mul( c ) ) );

};

/**
 * Pattern coordinates in cells. `size` is the cell size in px at 1080p (screen space)
 * or in centimeters (world space); `angle` rotates the grid (degrees).
 */
export function patternCoord( space, size, angle ) {

	if ( space === 'world' ) {

		const n = abs( normalWorld );
		const p = positionWorld.mul( 100 ).div( size );
		const uv = select( n.x.greaterThan( max( n.y, n.z ) ), p.zy, select( n.y.greaterThan( n.z ), p.xz, p.xy ) );
		return rotate2( uv, angle );

	}

	return rotate2( screenCoordinate.xy.div( size.mul( screenSize.y.div( 1080 ) ) ), angle );

}

/** A dot per cell whose area is `coverage` (0–1), anti-aliased. */
export function dotMask( coord, coverage ) {

	const d = length( fract( coord ).sub( 0.5 ) );
	const r = coverage.clamp( 0, 1 ).sqrt().mul( 0.7071 );
	const aa = max( fwidth( d ), 1e-3 );
	return smoothstep( r.sub( aa ), r.add( aa ), d ).oneMinus().mul( step( 0.001, coverage ) );

}

/** One line per cell row, `width` (0–0.5) of the cell wide, anti-aliased. */
export function lineMask( coord, width ) {

	const l = abs( fract( coord.y ).sub( 0.5 ) );
	const aa = max( fwidth( coord.y ), 1e-3 );
	return smoothstep( width.sub( aa ), width.add( aa ), l ).oneMinus().mul( step( 0.001, width ) );

}

