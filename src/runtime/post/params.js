// Uniforms for registry parameters used by the post graph (design §7.10: "uniforms
// persist across rebuilds, so values don't jump"). One uniform per parameter, created
// the first time an effect asks for it and written on every apply().
//
// Conventions: floats, ints and angles are numbers (angles in degrees); switches are 0/1;
// enums are the option index; colors hold raw sRGB numbers, because most post effects run
// after the output transform (display space). Effects in the HDR stage convert with
// sRGBTransferEOTF().

import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import { byId } from '../registry/index.js';
import { hexToRgb } from '../color/color.js';

/** Colors used after the output transform live in display (sRGB) space: store raw sRGB numbers. */
export function setDisplayColor( u, hex ) {

	const [ r, g, b ] = hexToRgb( hex );
	u.value.setRGB( r, g, b, THREE.LinearSRGBColorSpace );

}

function write( u, entry, value ) {

	switch ( entry.type ) {

		case 'color': setDisplayColor( u, value ); break;
		case 'bool': u.value = value ? 1 : 0; break;
		case 'enum': u.value = Math.max( 0, entry.options.findIndex( ( o ) => o.value === value ) ); break;
		default: u.value = value;

	}

}

export class ParamUniforms {

	constructor() {

		this.map = new Map();
		this.values = null;

	}

	/** The uniform for registry parameter `id` (created on first use). */
	get( id ) {

		let u = this.map.get( id );
		if ( u ) return u;
		const entry = byId.get( id );
		if ( ! entry ) throw new Error( `ParamUniforms: unknown parameter ${id}` );
		if ( entry.type === 'palette' ) throw new Error( `ParamUniforms: ${id} is a palette; effects handle palettes themselves` );
		u = entry.type === 'color' ? uniform( new THREE.Color() ) : uniform( 0, 'float' );
		u.name = `p_${id.replace( /[^a-zA-Z0-9]/g, '_' )}`; // shows up in shader source and the inspector
		this.map.set( id, u );
		if ( this.values ) write( u, entry, this.values[ id ] );
		return u;

	}

	apply( values ) {

		this.values = values;
		for ( const [ id, u ] of this.map ) write( u, byId.get( id ), values[ id ] );

	}

}
