// Parameter registry v1 (design §7.5): the single source of truth for every
// parameter. Modules are listed in pipeline order (World → Camera → Grade → Medium → Display).

import lighting from './lighting.js';
import surface from './surface.js';
import lines from './lines.js';
import palette from './palette.js';
import atmosphere from './atmosphere.js';
import lens from './lens.js';
import grade from './grade.js';
import media from './media.js';
import quality from './quality.js';

export const MODULES = [
	{ id: 'lighting', label: 'Lighting', stage: 'WORLD', perPart: 'ambient only' },
	{ id: 'surface', label: 'Surface', stage: 'WORLD', perPart: 'yes' },
	{ id: 'lines', label: 'Lines', stage: 'WORLD + MEDIUM', perPart: 'hull lines' },
	{ id: 'palette', label: 'Palette', stage: 'WORLD', perPart: 'yes' },
	{ id: 'atmosphere', label: 'Atmosphere', stage: 'WORLD', perPart: 'no' },
	{ id: 'lens', label: 'Lens', stage: 'CAMERA + DISPLAY', perPart: 'no' },
	{ id: 'grade', label: 'Grade', stage: 'CAMERA + GRADE', perPart: 'no' },
	{ id: 'media', label: 'Media', stage: 'DISPLAY', perPart: 'no' },
	{ id: 'quality', label: 'Quality', stage: 'pass', perPart: 'no' },
];

/** Part taxonomy (§6.3). The index is the part id written to the ids buffer. */
export const PARTS = [ 'sky', 'terrain', 'water', 'foliage', 'architecture', 'props', 'characters', 'hero', 'vfx' ];
export const PART_INDEX = Object.fromEntries( PARTS.map( ( p, i ) => [ p, i ] ) );

/** Buffers an effect can require from the scene pass (§7.7). */
export const BUFFERS = [ 'depth', 'normal', 'ids', 'emissive', 'velocity' ];

export const REGISTRY = [ ...lighting, ...surface, ...lines, ...palette, ...atmosphere, ...lens, ...grade, ...media, ...quality ];

export const byId = new Map( REGISTRY.map( ( e ) => [ e.id, e ] ) );

/** Parameters that may differ per part. */
export const PART_PARAMS = REGISTRY.filter( ( e ) => e.scope !== 'global' ).map( ( e ) => e.id );

/** Display label of a value: the option label for enums, the value otherwise. */
export function valueLabel( entry, value ) {

	if ( entry.type === 'enum' ) return entry.options.find( ( o ) => o.value === value )?.label ?? String( value );
	if ( entry.type === 'bool' ) return value ? 'on' : 'off';
	if ( entry.type === 'palette' ) return value.join( ', ' ) || 'none';
	if ( typeof value === 'number' ) return String( Math.round( value * 1000 ) / 1000 );
	return String( value );

}

/** Fills an entry's brief template. */
export function formatBrief( entry, value ) {

	return entry.brief.replace( '{value}', valueLabel( entry, value ) ).replace( '{label}', valueLabel( entry, value ) );

}

/** The registry `default` of every parameter, as a flat map. */
export function defaults() {

	return Object.fromEntries( REGISTRY.map( ( e ) => [ e.id, clone( e.default ) ] ) );

}

export const clone = ( v ) => Array.isArray( v ) ? [ ...v ] : v;
