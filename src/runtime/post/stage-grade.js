// GRADE stage (design §7.7), in display space after the output transform:
// CDL lift/gamma/gain → contrast → saturation and vibrance → hue → split tone
// → selective color → LUT → gradient map → sepia → bleach bypass.

import * as THREE from 'three/webgpu';
import { Fn, vec3, vec4, float, int, mix, smoothstep, abs, atan, floor, fract, min, luminance, saturation, vibrance, hue, cdl, texture3D, uniform, uniformArray } from 'three/tsl';
import { sepia } from 'three/addons/tsl/display/Sepia.js';
import { bleach } from 'three/addons/tsl/display/BleachBypass.js';
import { displayToOklab } from './colorspace.js';
import { bakeLut, LUT_PRESETS, customLut } from '../color/lut.js';
import { hexToRgb } from '../color/color.js';

const LUT_SIZE = 33;
const lutCache = new Map();

/**
 * One generated LUT texture per preset, built on first use and kept (they are tiny). The
 * 'custom' (imported .cube) texture is rebuilt when a new LUT is loaded.
 */
export function lutTexture( preset ) {

	let t = lutCache.get( preset );
	if ( preset === 'custom' && t && t.userData.version !== ( customLut()?.version ?? 0 ) ) { t.dispose(); t = null; }
	if ( t ) return t;
	t = new THREE.Data3DTexture( bakeLut( preset, LUT_SIZE ), LUT_SIZE, LUT_SIZE, LUT_SIZE );
	t.format = THREE.RGBAFormat;
	t.type = THREE.UnsignedByteType;
	t.minFilter = t.magFilter = THREE.LinearFilter;
	t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
	t.unpackAlignment = 1;
	t.needsUpdate = true;
	t.userData.version = preset === 'custom' ? customLut()?.version ?? 0 : 0;
	lutCache.set( preset, t );
	return t;

}

export const LUT_PRESET_IDS = Object.keys( LUT_PRESETS );
export const MAX_STOPS = 8;

/** Uniforms for list-valued grade parameters (gradient stops), written by applyGradeLists(). */
export function createGradeLists() {

	return {
		stops: uniformArray( Array.from( { length: MAX_STOPS }, () => new THREE.Vector3() ), 'vec3' ),
		stopCount: uniform( 2 ),
		lut: texture3D( lutTexture( 'teal-orange' ) ),
	};

}

export function applyGradeLists( L, v ) {

	const stops = v[ 'grade.gradientMap.stops' ].slice( 0, MAX_STOPS );
	const list = stops.length >= 2 ? stops : [ '#000000', '#ffffff' ];
	list.forEach( ( hex, i ) => L.stops.array[ i ].set( ...hexToRgb( hex ) ) );
	L.stopCount.value = list.length;
	const preset = v[ 'grade.lut.preset' ];
	if ( L.lut.value !== lutTexture( preset ) ) L.lut.value = lutTexture( preset );

}

export const GRADE = [
	{
		id: 'grade.basic', label: 'Lift, gamma, gain, contrast, saturation, hue, split tone', stage: 'grade', always: true,
		enabled: () => true,
		requires: () => [],
		build( c, ctx ) {

			const P = ctx.P;
			let x = vec3( cdl( c, vec3( P.get( 'grade.gain' ) ), vec3( P.get( 'grade.lift' ) ), vec3( P.get( 'grade.gamma' ) ) ).rgb );
			x = x.sub( 0.5 ).mul( P.get( 'grade.contrast' ) ).add( 0.5 ).max( 0 );
			x = saturation( x, P.get( 'grade.saturation' ) );
			x = vibrance( x, P.get( 'grade.vibrance' ) );
			x = hue( x, P.get( 'grade.hue' ).mul( Math.PI / 180 ) );
			const h = smoothstep( 0.05, 0.95, luminance( x ).sub( P.get( 'grade.split.balance' ).mul( 0.25 ) ) );
			const tone = mix( P.get( 'grade.split.shadows' ), P.get( 'grade.split.highlights' ), h );
			const softLight = x.mul( x ).mul( tone.mul( 2 ).oneMinus() ).add( x.mul( tone ).mul( 2 ) );
			return mix( x, softLight, P.get( 'grade.split.amount' ) );

		},
	},
	{
		id: 'grade.selective', label: 'Selective color', stage: 'grade',
		enabled: ( v ) => v[ 'grade.selective.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			const P = ctx.P;
			const lab = displayToOklab( c );
			const h = atan( lab.z, lab.y ).mul( 180 / Math.PI );
			const d = abs( fract( h.sub( P.get( 'grade.selective.hue' ) ).div( 360 ).add( 0.5 ) ).sub( 0.5 ) ).mul( 360 );
			const range = P.get( 'grade.selective.range' );
			const chroma = lab.yz.length();
			const keep = smoothstep( range.mul( 0.6 ), range, d ).oneMinus().mul( smoothstep( 0.02, 0.06, chroma ) );
			return mix( c, vec3( luminance( c ) ), P.get( 'grade.selective.amount' ).mul( keep.oneMinus() ) );

		},
	},
	{
		id: 'grade.lut', label: 'Color LUT', stage: 'grade',
		enabled: ( v ) => v[ 'grade.lut.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			// Sample texel centers: scale into [half texel, 1 − half texel].
			const uvw = c.clamp( 0, 1 ).mul( ( LUT_SIZE - 1 ) / LUT_SIZE ).add( 0.5 / LUT_SIZE );
			return mix( c, ctx.lists.lut.sample( uvw ).rgb, ctx.P.get( 'grade.lut.amount' ) );

		},
	},
	{
		id: 'grade.gradientMap', label: 'Gradient map', stage: 'grade',
		enabled: ( v ) => v[ 'grade.gradientMap.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			const L = ctx.lists;
			const mapped = Fn( () => {

				const n = float( L.stopCount ).sub( 1 );
				const t = luminance( c ).clamp( 0, 1 ).mul( n );
				const i = min( floor( t ), n.sub( 1 ) );
				const a = L.stops.element( int( i ) ), b = L.stops.element( int( i ).add( 1 ) );
				return mix( a, b, t.sub( i ).clamp( 0, 1 ) );

			} )();
			return mix( c, mapped, ctx.P.get( 'grade.gradientMap.amount' ) );

		},
	},
	{
		id: 'grade.sepia', label: 'Sepia', stage: 'grade',
		enabled: ( v ) => v[ 'grade.sepia.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			return mix( c, sepia( vec4( c, 1 ) ).rgb.min( 1 ), ctx.P.get( 'grade.sepia.amount' ) );

		},
	},
	{
		id: 'grade.bleach', label: 'Bleach bypass', stage: 'grade',
		enabled: ( v ) => v[ 'grade.bleach.enabled' ],
		requires: () => [],
		build( c, ctx ) {

			return bleach( vec4( c, 1 ), ctx.P.get( 'grade.bleach.amount' ) ).rgb;

		},
	},
];
