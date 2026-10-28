// Look resolution (design §6.6, §6.7, §7.4, §7.13): pure functions from a recipe plus
// the editor's state to the flat parameter maps the runtime applies.
//
// A recipe has a base look and, per module, an optional source look, an A/B blend with
// a second look, mute and solo; `morph` blends every module with one look at once.
// Order, last wins:
//   registry defaults → scene (art-directed light rig and sky; skipped by baseline looks)
//   → module sources and blends → overrides (Tune panel) → time of day (if on; explicit
//   overrides still win) → part looks and overrides → strength.
// Per part: the module source's part values (hero inherits characters), or the part's
// own look for the modules it takes, then global overrides (for modules the part takes
// from the global recipe), then part overrides.
//
// Blend rules (§6.6): floats lerp, ints round, angles take the short arc, colors and
// palettes mix in OKLab, enums step at t = 0.5. Effect switches are a union while
// blending, and an effect's values fade from `neutral` on the side where it is off, so
// blending never pops. t = 0 and t = 1 land exactly on the endpoints.

import { REGISTRY, byId, PARTS, PART_PARAMS, defaults, clone } from '../registry/index.js';
import { mixHex } from '../color/color.js';
import { timeOfDay } from './timeofday.js';

export const LAYERS = [ 'registry', 'scene', 'look', 'override' ];

/** Parent part whose look settings a part inherits (§6.3). */
export const PART_PARENT = { hero: 'characters' };

/** Modules that can differ per part (§6.7): exact in materials, or masked in post. */
export const PART_MODULES = [ 'lighting', 'surface', 'lines', 'palette', 'media', 'retro' ];

/** Resamples a palette (list of hex) to `n` stops, interpolating in OKLab. */
export function resamplePalette( colors, n ) {

	if ( ! colors.length ) return Array( n ).fill( '#808080' );
	if ( colors.length === n ) return [ ...colors ];
	return Array.from( { length: n }, ( _, i ) => {

		const x = n === 1 ? 0 : i / ( n - 1 ) * ( colors.length - 1 );
		const k = Math.min( colors.length - 2, Math.floor( x ) );
		return colors.length === 1 ? colors[ 0 ] : mixHex( colors[ k ], colors[ k + 1 ], x - k );

	} );

}

/** Interpolates one parameter value by its registry mix rule (§6.6). */
export function mixValue( entry, a, b, t ) {

	if ( t <= 0 ) return clone( a );
	if ( t >= 1 ) return clone( b );

	switch ( entry.mix ) {

		case 'lerp': {

			const v = a + ( b - a ) * t;
			return entry.type === 'int' ? Math.round( v ) : v;

		}

		case 'angle': {

			// The short way around, wrapped back into −180…180 and the entry's range.
			const d = ( ( b - a ) % 360 + 540 ) % 360 - 180;
			let v = ( ( a + d * t + 540 ) % 360 ) - 180;
			if ( v <= - 180 ) v += 360;
			return Math.max( entry.min, Math.min( entry.max, v ) );

		}

		case 'oklab': return mixHex( a, b, t );

		case 'palette': {

			// Different lengths: resample both to the longer one, then mix each stop.
			if ( ! a.length || ! b.length ) return clone( t < 0.5 ? a : b );
			const n = Math.max( a.length, b.length );
			const A = resamplePalette( a, n ), B = resamplePalette( b, n );
			return A.map( ( c, i ) => mixHex( c, B[ i ], t ) );

		}

		default: return clone( t < 0.5 ? a : b );

	}

}

/** The switch that turns an entry's effect on: its `enabledBy`, or itself for an effect switch. */
const gateOf = ( e ) => e.enabledBy || ( e.type === 'bool' && e.structural ? e.id : null );

/**
 * Blends one value between two parameter maps (A at t = 0, B at t = 1) with the union
 * and fade rules: `ma` / `mb` are the full maps the values come from, for the switches.
 */
export function blendEntry( e, ma, mb, t ) {

	const a = ma[ e.id ], b = mb[ e.id ];
	if ( t <= 0 ) return clone( a );
	if ( t >= 1 ) return clone( b );
	if ( e.type === 'bool' && e.structural ) return a || b;
	const gate = gateOf( e );
	if ( gate && gate !== e.id ) return mixValue( e, ma[ gate ] ? a : e.neutral, mb[ gate ] ? b : e.neutral, t );
	return mixValue( e, a, b, t );

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
		if ( ! entry || entry.structural || entry.mix === 'step' || entry.mix === 'palette' ) continue;
		out[ id ] = mixValue( entry, entry.neutral, out[ id ], Math.max( 0, strength ) );

	}

	return out;

}

/** A look's complete value maps: global (registry → scene → look) and per part. */
function fullValues( look, sceneParams ) {

	const global = defaults();
	const sources = Object.fromEntries( REGISTRY.map( ( e ) => [ e.id, 'registry' ] ) );
	const layer = ( params, name ) => {

		for ( const [ id, v ] of Object.entries( params || {} ) ) {

			if ( ! byId.has( id ) ) continue;
			global[ id ] = clone( v );
			sources[ id ] = name;

		}

	};

	if ( ! look.baseline ) layer( sceneParams, 'scene' );
	layer( look.params, 'look' );

	const parts = {};
	for ( const part of PARTS ) {

		const map = {};
		for ( const id of PART_PARAMS ) map[ id ] = clone( global[ id ] );
		const chain = PART_PARENT[ part ] ? [ PART_PARENT[ part ], part ] : [ part ];
		for ( const p of chain ) for ( const [ id, v ] of Object.entries( look.parts?.[ p ]?.params || {} ) ) if ( id in map ) map[ id ] = clone( v );
		parts[ part ] = map;

	}

	return { global, parts, sources };

}

/** A part's recipe with inheritance: hero takes the characters' look and overrides unless it has its own. */
export function partRecipe( parts, part ) {

	const own = parts?.[ part ] || {};
	const parent = PART_PARENT[ part ] ? parts?.[ PART_PARENT[ part ] ] || {} : {};
	const look = own.look ?? ( own.inherit === false ? null : parent.look ) ?? null;
	const modules = own.look ? own.modules : parent.look && own.inherit !== false ? parent.modules : own.modules;
	return {
		look,
		modules: look ? ( modules && modules.length ? modules : PART_MODULES ) : [],
		overrides: { ...( own.inherit === false ? {} : parent.overrides ), ...own.overrides },
	};

}

/**
 * Resolves a recipe.
 * @param {object} o
 * @param {object} o.recipe - { base, modules: { [module]: { from, blend: { with, t }, mute, solo } }, morph: { with, t } }
 * @param {(id: string) => object} o.getLook - look by id (library, My looks, imported)
 * @param {object} [o.parts] - { [part]: { look, modules: string[], overrides, inherit } }
 * @param {object} [o.sceneParams] - sparse map from the scene definition
 * @param {object} [o.overrides] - sparse map from the Tune panel
 * @param {number} [o.strength] - look strength 0…1
 * @returns {{global: object, parts: object, sources: object}}
 */
export function resolveRecipe( { recipe, getLook, parts = {}, sceneParams = {}, overrides = {}, strength = 1 } ) {

	const cache = new Map();
	const full = ( look ) => {

		if ( ! cache.has( look ) ) cache.set( look, fullValues( look, sceneParams ) );
		return cache.get( look );

	};

	const modules = recipe.modules || {};
	const anySolo = Object.values( modules ).some( ( m ) => m && m.solo );
	const base = getLook( recipe.base );
	const states = {};
	const state = ( module ) => {

		if ( states[ module ] ) return states[ module ];
		const r = modules[ module ] || {};
		const blendWith = r.blend?.with ?? recipe.morph?.with ?? null;
		const t = r.blend?.with ? r.blend.t ?? 0.5 : recipe.morph?.t ?? 0;
		return ( states[ module ] = {
			muted: !! r.mute || ( anySolo && ! r.solo ),
			src: full( r.from ? getLook( r.from ) : base ),
			blend: blendWith && t > 0 ? { full: full( getLook( blendWith ) ), t } : null,
		} );

	};

	const neutralMap = Object.fromEntries( REGISTRY.map( ( e ) => [ e.id, clone( e.neutral ) ] ) );
	const global = {};
	const sources = {};

	for ( const e of REGISTRY ) {

		const s = state( e.module );
		if ( s.muted ) { global[ e.id ] = clone( e.neutral ); sources[ e.id ] = 'muted'; continue; }
		if ( s.blend ) { global[ e.id ] = blendEntry( e, s.src.global, s.blend.full.global, s.blend.t ); sources[ e.id ] = 'blend'; continue; }
		global[ e.id ] = clone( s.src.global[ e.id ] );
		sources[ e.id ] = s.src.sources[ e.id ];

	}

	for ( const [ id, v ] of Object.entries( overrides ) ) {

		if ( ! byId.has( id ) ) continue;
		global[ id ] = clone( v );
		sources[ id ] = 'override';

	}

	if ( global[ 'lighting.tod.enabled' ] ) {

		for ( const [ id, v ] of Object.entries( timeOfDay( global[ 'lighting.tod.hour' ], global[ 'lighting.key.azimuth' ] ) ) ) {

			if ( id in overrides ) continue;
			global[ id ] = v;
			sources[ id ] = 'time of day';

		}

	}

	const partMaps = {};

	for ( const part of PARTS ) {

		const pr = partRecipe( parts, part );
		const own = pr.look ? full( getLook( pr.look ) ) : null;
		const map = {};

		for ( const id of PART_PARAMS ) {

			const e = byId.get( id );
			if ( own && pr.modules.includes( e.module ) ) { map[ id ] = clone( own.parts[ part ][ id ] ); continue; }
			const s = state( e.module );
			if ( s.muted ) map[ id ] = clone( neutralMap[ id ] );
			else if ( s.blend ) map[ id ] = blendEntry( e, s.src.parts[ part ], s.blend.full.parts[ part ], s.blend.t );
			else map[ id ] = clone( s.src.parts[ part ][ id ] );
			if ( id in overrides ) map[ id ] = clone( overrides[ id ] );

		}

		for ( const [ id, v ] of Object.entries( pr.overrides ) ) if ( id in map ) map[ id ] = clone( v );
		partMaps[ part ] = applyStrength( map, strength );

	}

	return { global: applyStrength( global, strength ), parts: partMaps, sources };

}

/**
 * The single-look form (M1 API): a recipe with only a base. `partOverrides` are part
 * overrides without part looks.
 */
export function resolveLook( { look, sceneParams = {}, overrides = {}, partOverrides = {}, strength = 1 } ) {

	const parts = Object.fromEntries( Object.entries( partOverrides ).map( ( [ p, o ] ) => [ p, { overrides: o } ] ) );
	return resolveRecipe( { recipe: { base: look.id ?? '@look' }, getLook: () => look, parts, sceneParams, overrides, strength } );

}

/**
 * Morph between two resolved looks (§7.13): every global and part value blends by its
 * rule, switches are a union until t = 1, and t = 1 is exactly `to`.
 */
export function blendResolved( from, to, t ) {

	if ( t >= 1 ) return to;
	const global = {};
	for ( const e of REGISTRY ) global[ e.id ] = blendEntry( e, from.global, to.global, t );
	const parts = {};
	for ( const part of PARTS ) {

		const map = {};
		for ( const id of PART_PARAMS ) map[ id ] = blendEntry( byId.get( id ), from.parts[ part ], to.parts[ part ], t );
		parts[ part ] = map;

	}

	return { global, parts, sources: to.sources };

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

/**
 * "Save as look" (§6.6): a sparse look from a resolution. It keeps every value that came
 * from a look, a blend or an override (scene values stay with the scene), and per-part
 * values where a part differs from the global result.
 */
export function lookFromResolved( resolved, meta ) {

	const params = {};
	for ( const e of REGISTRY ) {

		const src = resolved.sources[ e.id ];
		if ( src === 'registry' || src === 'scene' ) continue;
		if ( JSON.stringify( resolved.global[ e.id ] ) === JSON.stringify( e.default ) && src !== 'override' ) continue;
		params[ e.id ] = clone( resolved.global[ e.id ] );

	}

	const parts = {};
	for ( const part of PARTS ) {

		const diff = {};
		for ( const id of PART_PARAMS ) if ( JSON.stringify( resolved.parts[ part ][ id ] ) !== JSON.stringify( resolved.global[ id ] ) ) diff[ id ] = clone( resolved.parts[ part ][ id ] );
		if ( Object.keys( diff ).length ) parts[ part ] = { params: diff };

	}

	return { schema: 'stylelab.look@1', version: 1, tags: [], pillars: [], mistakes: [], inspiredBy: [], description: '', ...meta, params, parts };

}

/** A stable hash of a resolution (share-link and transition tests). */
export function resolvedHash( resolved ) {

	const text = JSON.stringify( [ resolved.global, resolved.parts ] );
	let h = 0x811c9dc5;
	for ( let i = 0; i < text.length; i ++ ) h = Math.imul( h ^ text.charCodeAt( i ), 16777619 );
	return ( h >>> 0 ).toString( 16 );

}
