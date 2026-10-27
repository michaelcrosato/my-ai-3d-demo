// Look resolution (design §6.6, §7.4): a pure function from a look plus the
// editor's state to flat parameter maps the runtime applies.
//
// Order, last wins:
//   registry defaults → scene (art-directed light rig and sky; skipped by baseline looks)
//   → look → overrides (Tune panel) → part overrides → strength.
// Per part: the global result, then the look's part params (hero inherits characters),
// then overrides again, so a Tune slider always affects what you see.

import { REGISTRY, byId, PARTS, PART_PARAMS, defaults, clone } from '../registry/index.js';
import { mixHex } from '../color/color.js';

export const LAYERS = [ 'registry', 'scene', 'look', 'override' ];

/** Parent part whose look settings a part inherits (§6.3). */
export const PART_PARENT = { hero: 'characters' };

/** Interpolates one parameter value by its registry mix rule (§6.6). */
export function mixValue( entry, a, b, t ) {

	switch ( entry.mix ) {

		case 'lerp': {

			const v = a + ( b - a ) * t;
			return entry.type === 'int' ? Math.round( v ) : v;

		}

		case 'angle': {

			const d = ( ( b - a ) % 360 + 540 ) % 360 - 180;
			return a + d * t;

		}

		case 'oklab': return t <= 0 ? a : t >= 1 ? b : mixHex( a, b, t );
		default: return t < 0.5 ? a : b;

	}

}

/**
 * Look strength: moves every continuous parameter toward its registry `neutral`.
 * Structural parameters and switches keep the look's value, so the strength
 * slider never triggers a rebuild.
 */
export function applyStrength( values, strength ) {

	if ( strength >= 1 ) return values;
	const out = { ...values };

	for ( const id of Object.keys( out ) ) {

		const entry = byId.get( id );
		if ( entry.structural || entry.mix === 'step' ) continue;
		out[ id ] = mixValue( entry, entry.neutral, out[ id ], Math.max( 0, strength ) );

	}

	return out;

}

/**
 * @param {object} o
 * @param {object} o.look - a validated look
 * @param {object} [o.sceneParams] - sparse map from the scene definition
 * @param {object} [o.overrides] - sparse map from the Tune panel
 * @param {object} [o.partOverrides] - { part: sparse map }
 * @param {number} [o.strength] - look strength 0…1
 * @returns {{global: object, parts: object, sources: object}}
 */
export function resolveLook( { look, sceneParams = {}, overrides = {}, partOverrides = {}, strength = 1 } ) {

	const values = defaults();
	const sources = Object.fromEntries( REGISTRY.map( ( e ) => [ e.id, 'registry' ] ) );

	const layer = ( params, name ) => {

		for ( const [ id, v ] of Object.entries( params || {} ) ) {

			if ( ! byId.has( id ) ) continue;
			values[ id ] = clone( v );
			sources[ id ] = name;

		}

	};

	if ( ! look.baseline ) layer( sceneParams, 'scene' );
	layer( look.params, 'look' );
	layer( overrides, 'override' );

	const parts = {};

	for ( const part of PARTS ) {

		const map = {};
		for ( const id of PART_PARAMS ) map[ id ] = clone( values[ id ] );

		const chain = PART_PARENT[ part ] ? [ PART_PARENT[ part ], part ] : [ part ];
		for ( const p of chain ) Object.assign( map, look.parts?.[ p ]?.params );
		for ( const id of PART_PARAMS ) if ( id in overrides ) map[ id ] = clone( overrides[ id ] );
		for ( const p of chain ) Object.assign( map, partOverrides[ p ] );

		parts[ part ] = applyStrength( map, strength );

	}

	return { global: applyStrength( values, strength ), parts, sources };

}

/**
 * The look's value for a parameter before overrides and strength: what the
 * Tune panel's "modified" dot compares against.
 */
export function lookValue( look, sceneParams, id ) {

	if ( look.params && id in look.params ) return look.params[ id ];
	if ( ! look.baseline && id in sceneParams ) return sceneParams[ id ];
	return byId.get( id ).default;

}
