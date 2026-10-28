// Look zones (design §6.10, §7.15): volumes in a scene (box or sphere) with a look, a
// priority and a blend distance. The player's position gives each zone a weight
// (smoothstep over the blend distance, like engine post-processing volumes), and the
// looks are morphed by weight, lowest priority first.

import { blendResolved } from './resolve.js';

const smoothstep = ( x ) => { const t = Math.min( 1, Math.max( 0, x ) ); return t * t * ( 3 - 2 * t ); };

/**
 * Signed distance from `p` to a zone's surface (negative inside).
 * Box: { shape: 'box', center: [x, y, z], size: [w, h, d] }; sphere: { shape: 'sphere', center, radius }.
 */
export function zoneDistance( zone, p ) {

	const [ cx, cy, cz ] = zone.center;
	const dx = p[ 0 ] - cx, dy = p[ 1 ] - cy, dz = p[ 2 ] - cz;
	if ( zone.shape === 'sphere' ) return Math.hypot( dx, dy, dz ) - zone.radius;
	const [ hx, hy, hz ] = zone.size.map( ( s ) => s / 2 );
	const qx = Math.abs( dx ) - hx, qy = Math.abs( dy ) - hy, qz = Math.abs( dz ) - hz;
	const outside = Math.hypot( Math.max( qx, 0 ), Math.max( qy, 0 ), Math.max( qz, 0 ) );
	return outside + Math.min( Math.max( qx, qy, qz ), 0 );

}

/** A zone's weight at `p`: 1 inside, falling to 0 over `blend` metres outside. */
export function zoneWeight( zone, p ) {

	const d = zoneDistance( zone, p );
	const blend = Math.max( 1e-6, zone.blend ?? 2 );
	return d <= 0 ? 1 : 1 - smoothstep( d / blend );

}

/** Weights for every zone at `p`, in blend order (lowest priority first): [{ zone, weight }]. */
export function zoneWeights( zones, p ) {

	return [ ...( zones || [] ) ]
		.map( ( zone, i ) => ( { zone, weight: zoneWeight( zone, p ), i } ) )
		.sort( ( a, b ) => ( a.zone.priority ?? 0 ) - ( b.zone.priority ?? 0 ) || a.i - b.i )
		.map( ( { zone, weight } ) => ( { zone, weight } ) );

}

/**
 * Blends a base resolution with zone resolutions by weight, lowest priority first, so a
 * higher-priority zone wins where zones overlap. `resolveZone(zone)` returns the zone's
 * resolved look. Zones at weight 0 are skipped, so outside every zone the result is
 * exactly `base`, and deep inside one it is exactly that zone's look.
 */
export function blendZones( base, weights, resolveZone ) {

	let r = base;
	for ( const { zone, weight } of weights ) if ( weight > 0 ) r = blendResolved( r, resolveZone( zone ), weight );
	return r;

}
