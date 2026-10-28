// Look schema v1 (design §7.6): validation and migrations. Looks are sparse: they
// store only the values that differ from the registry default.

import { byId, PARTS } from '../registry/index.js';
import { isHex } from '../color/color.js';

export const LOOK_SCHEMA = 'stylelab.look@1';

/** Returns an error string, or null if `value` is valid for `entry`. */
export function checkValue( entry, value ) {

	switch ( entry.type ) {

		case 'float':
		case 'angle':
		case 'int':
			if ( typeof value !== 'number' || ! Number.isFinite( value ) ) return 'expected a number';
			if ( entry.type === 'int' && ! Number.isInteger( value ) ) return 'expected an integer';
			if ( value < entry.min || value > entry.max ) return `out of range ${entry.min}…${entry.max}`;
			return null;
		case 'bool':
			return typeof value === 'boolean' ? null : 'expected true or false';
		case 'enum':
			return entry.options.some( ( o ) => o.value === value ) ? null : `expected one of ${entry.options.map( ( o ) => o.value ).join( ', ' )}`;
		case 'color':
			return isHex( value ) ? null : 'expected a hex color';
		case 'palette':
			return Array.isArray( value ) && value.every( isHex ) ? null : 'expected an array of hex colors';
		default:
			return `unknown type ${entry.type}`;

	}

}

function checkParams( params, where, errors, { partScoped = false } = {} ) {

	for ( const [ id, value ] of Object.entries( params || {} ) ) {

		const entry = byId.get( id );
		if ( ! entry ) { errors.push( `${where}: unknown parameter ${id}` ); continue; }
		if ( partScoped && entry.scope === 'global' ) errors.push( `${where}: ${id} can't be set per part` );
		const problem = checkValue( entry, value );
		if ( problem ) errors.push( `${where}: ${id} ${problem} (got ${JSON.stringify( value )})` );

	}

}

/** @returns {{ok: boolean, errors: string[]}} */
export function validateLook( look ) {

	const errors = [];
	if ( ! look || typeof look !== 'object' ) return { ok: false, errors: [ 'not an object' ] };
	if ( look.schema !== LOOK_SCHEMA ) errors.push( `schema must be ${LOOK_SCHEMA}` );
	if ( typeof look.id !== 'string' || ! /^[a-z0-9-]+$/.test( look.id ) ) errors.push( 'id must be kebab-case' );
	if ( typeof look.name !== 'string' || ! look.name ) errors.push( 'name is required' );
	checkParams( look.params, 'params', errors );

	for ( const [ part, def ] of Object.entries( look.parts || {} ) ) {

		if ( ! PARTS.includes( part ) ) { errors.push( `parts: unknown part ${part}` ); continue; }
		checkParams( def.params, `parts.${part}`, errors, { partScoped: true } );

	}

	return { ok: errors.length === 0, errors };

}

/**
 * Schema migrations, keyed by the schema they upgrade from. v1 is the first
 * schema, so the table is empty; each future entry gets a unit test.
 */
export const MIGRATIONS = {};

export function migrateLook( look ) {

	let current = look;

	while ( current.schema !== LOOK_SCHEMA ) {

		const step = MIGRATIONS[ current.schema ];
		if ( ! step ) throw new Error( `Can't read look schema ${current.schema}` );
		current = step( current );

	}

	return current;

}
