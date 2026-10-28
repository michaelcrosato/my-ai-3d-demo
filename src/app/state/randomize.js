// Randomize within ranges (design §6.8, P2): new values for exploration, inside the range
// the built-in looks use for each parameter. Pure, seeded, so a seed reproduces a roll.

import { REGISTRY } from '../../runtime/registry/index.js';
import { adjustHex } from '../../runtime/color/color.js';

/** Modules a roll leaves alone: the camera lens, the clock and render quality are not style. */
const SKIP_MODULES = new Set( [ 'motion', 'quality' ] );
const SKIP = new Set( [ 'lens.fovScale', 'lighting.tod.hour', 'lens.dof.offset', 'lens.letterbox.aspect' ] );

const rng = ( seed ) => { let a = seed >>> 0; return () => { a = a + 0x6d2b79f5 >>> 0; let t = a; t = Math.imul( t ^ t >>> 15, t | 1 ); t ^= t + Math.imul( t ^ t >>> 7, t | 61 ); return ( ( t ^ t >>> 14 ) >>> 0 ) / 4294967296; }; };

/** The [lo, hi] a parameter is rolled in: the library's span (widened 15%), or the middle 70% of its range. */
export function rollRange( e, looks ) {

	const used = looks.map( ( l ) => l.params?.[ e.id ] ).filter( ( v ) => typeof v === 'number' );
	const span = e.max - e.min;
	if ( used.length >= 2 && Math.max( ...used ) > Math.min( ...used ) ) {

		const lo = Math.min( ...used ), hi = Math.max( ...used ), pad = ( hi - lo ) * 0.15;
		return [ Math.max( e.min, lo - pad ), Math.min( e.max, hi + pad ) ];

	}

	return [ e.min + span * 0.15, e.max - span * 0.15 ];

}

/**
 * Overrides for a roll: every continuous parameter the look uses (its switch is on, or it
 * differs from the registry default) gets a new value in its range; colors turn by up to
 * ±35° of hue. Switches and structural values stay, so a roll never rebuilds anything.
 */
export function randomOverrides( values, looks, seed ) {

	const next = rng( seed );
	const out = {};
	for ( const e of REGISTRY ) {

		if ( SKIP_MODULES.has( e.module ) || SKIP.has( e.id ) || e.structural ) continue;
		if ( e.enabledBy ? ! values[ e.enabledBy ] : values[ e.id ] === e.default ) continue;
		if ( e.type === 'color' ) { out[ e.id ] = adjustHex( values[ e.id ], { hue: ( next() * 2 - 1 ) * 35 } ); continue; }
		if ( ! [ 'float', 'int', 'angle' ].includes( e.type ) ) continue;
		const [ lo, hi ] = rollRange( e, looks );
		const v = Math.round( ( lo + ( hi - lo ) * next() ) / e.step ) * e.step;
		out[ e.id ] = Math.min( e.max, Math.max( e.min, e.type === 'int' ? Math.round( v ) : +v.toFixed( 6 ) ) );

	}

	return out;

}
