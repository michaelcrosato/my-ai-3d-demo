// Generated color grades (design §6.4 F "3D LUT", generated presets) and fixed
// palettes for quantization (§6.4 H). Pure functions on display-space sRGB in [0, 1],
// so they run in Node (tests, the .cube export) and in the browser.

const clamp01 = ( x ) => Math.min( 1, Math.max( 0, x ) );
const lum = ( [ r, g, b ] ) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const mix = ( a, b, t ) => a + ( b - a ) * t;
const mix3 = ( a, b, t ) => [ mix( a[ 0 ], b[ 0 ], t ), mix( a[ 1 ], b[ 1 ], t ), mix( a[ 2 ], b[ 2 ], t ) ];
const smooth = ( e0, e1, x ) => { const t = clamp01( ( x - e0 ) / ( e1 - e0 ) ); return t * t * ( 3 - 2 * t ); };
const sCurve = ( x, k ) => mix( x, x * x * ( 3 - 2 * x ), k );
const saturate3 = ( c, s ) => { const l = lum( c ); return c.map( ( v ) => l + ( v - l ) * s ); };
const softLight = ( a, b ) => a.map( ( x, i ) => ( b[ i ] < 0.5 ? x - ( 1 - 2 * b[ i ] ) * x * ( 1 - x ) : x + ( 2 * b[ i ] - 1 ) * ( ( x < 0.25 ? ( ( 16 * x - 12 ) * x + 4 ) * x : Math.sqrt( x ) ) - x ) ) );

/** Each preset maps a display-space color to a graded one. */
export const LUT_PRESETS = {
	'teal-orange': ( c ) => {

		const l = lum( c );
		const tone = mix3( [ 0.05, 0.42, 0.5 ], [ 1, 0.62, 0.32 ], smooth( 0.15, 0.85, l ) );
		const graded = softLight( c.map( ( x ) => sCurve( x, 0.35 ) ), tone );
		return saturate3( mix3( c, graded, 0.75 ), 1.08 );

	},
	'warm-film': ( c ) => {

		const lifted = c.map( ( x ) => 0.035 + sCurve( x, 0.3 ) * 0.94 );
		return saturate3( [ lifted[ 0 ] * 1.06, lifted[ 1 ] * 1.0, lifted[ 2 ] * 0.88 ], 0.92 );

	},
	bleach: ( c ) => {

		const l = lum( c );
		const overlay = c.map( ( x ) => ( l < 0.5 ? 2 * x * l : 1 - 2 * ( 1 - x ) * ( 1 - l ) ) );
		return saturate3( mix3( c, overlay, 0.65 ), 0.45 ).map( ( x ) => sCurve( x, 0.25 ) );

	},
	cross: ( c ) => [ sCurve( c[ 0 ], 0.6 ), sCurve( c[ 1 ], 0.3 ) * 0.95 + 0.04, 0.12 + c[ 2 ] * 0.72 ],
	faded: ( c ) => saturate3( c.map( ( x ) => 0.08 + x * 0.84 ), 0.78 ).map( ( x, i ) => x * [ 1.02, 1, 0.97 ][ i ] ),
	'cool-night': ( c ) => saturate3( c, 0.55 ).map( ( x, i ) => Math.pow( clamp01( x ), 1.2 ) * [ 0.78, 0.88, 1.12 ][ i ] ),
};

/**
 * Bakes a preset into an RGBA8 3D table (`size`³ texels, red fastest), the layout of
 * THREE.Data3DTexture and of a .cube file. 'custom' is the imported .cube (identity when
 * none is loaded).
 */
export function bakeLut( preset, size = 33 ) {

	if ( preset === 'custom' ) return custom && size === custom.size ? custom.rgba.slice() : bakeLut( custom ? ( c ) => sampleLut( custom, c ) : ( c ) => c, size );
	const f = typeof preset === 'function' ? preset : LUT_PRESETS[ preset ];
	if ( ! f ) throw new Error( `Unknown LUT preset ${preset}` );
	const data = new Uint8Array( size * size * size * 4 );
	let i = 0;

	for ( let b = 0; b < size; b ++ ) for ( let g = 0; g < size; g ++ ) for ( let r = 0; r < size; r ++ ) {

		const out = f( [ r / ( size - 1 ), g / ( size - 1 ), b / ( size - 1 ) ] );
		data[ i ++ ] = Math.round( clamp01( out[ 0 ] ) * 255 );
		data[ i ++ ] = Math.round( clamp01( out[ 1 ] ) * 255 );
		data[ i ++ ] = Math.round( clamp01( out[ 2 ] ) * 255 );
		data[ i ++ ] = 255;

	}

	return data;

}

/** Fixed palettes for quantization (sRGB hex). */
export const PALETTES = {
	pico8: [ '#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa' ],
	gameboy: [ '#0f380f', '#306230', '#8bac0f', '#9bbc0f' ],
	cga: [ '#000000', '#55ffff', '#ff55ff', '#ffffff' ],
	nes: [ '#000000', '#fcfcfc', '#7c7c7c', '#bcbcbc', '#a80020', '#f83800', '#fca044', '#f8b800', '#00a800', '#58d854', '#0058f8', '#3cbcfc', '#6844fc', '#d800cc', '#503000', '#f8d8b8' ],
	onebit: [ '#16131f', '#e8e2d0' ],
};

/** Ordered-dither ranks (0 … n²−1) of an n × n Bayer matrix, n a power of two. Threshold = (rank + 0.5) / n². */
export function bayerMatrix( n ) {

	if ( n === 1 ) return [ [ 0 ] ];
	const m = bayerMatrix( n / 2 );
	const out = Array.from( { length: n }, () => new Array( n ) );
	const h = n / 2;

	for ( let y = 0; y < h; y ++ ) for ( let x = 0; x < h; x ++ ) {

		const v = m[ y ][ x ] * 4;
		out[ y ][ x ] = v;
		out[ y ][ x + h ] = v + 2;
		out[ y + h ][ x ] = v + 3;
		out[ y + h ][ x + h ] = v + 1;

	}

	return out;

}

// Imported .cube LUTs (design §6.4 F "import .cube"). One slot: the 'custom' preset.

let custom = null; // { title, size, rgba: Uint8Array (size³ × 4), version }
let customVersion = 0;

/**
 * Parses Adobe/Resolve `.cube` text: TITLE, LUT_3D_SIZE, DOMAIN_MIN / DOMAIN_MAX and
 * `r g b` rows (red fastest). Returns { title, size, data: Float32Array RGB in 0–1 }.
 * 1D LUTs and malformed files throw with a message that says why.
 */
export function parseCube( text ) {

	let title = '', size = 0, min = [ 0, 0, 0 ], max = [ 1, 1, 1 ];
	const rows = [];
	for ( const raw of text.split( /\r?\n/ ) ) {

		const line = raw.trim();
		if ( ! line || line.startsWith( '#' ) ) continue;
		const [ key, ...rest ] = line.split( /\s+/ );
		if ( key === 'TITLE' ) title = line.slice( 5 ).trim().replace( /^"|"$/g, '' );
		else if ( key === 'LUT_3D_SIZE' ) size = parseInt( rest[ 0 ], 10 );
		else if ( key === 'LUT_1D_SIZE' ) throw new Error( 'This is a 1D LUT; Style Lab imports 3D LUTs (LUT_3D_SIZE).' );
		else if ( key === 'DOMAIN_MIN' ) min = rest.map( Number );
		else if ( key === 'DOMAIN_MAX' ) max = rest.map( Number );
		else if ( /^[-+.\d]/.test( key ) ) rows.push( [ key, ...rest ].slice( 0, 3 ).map( Number ) );

	}

	if ( ! ( size >= 2 && size <= 128 ) ) throw new Error( 'Not a 3D .cube LUT (LUT_3D_SIZE missing or out of range).' );
	if ( rows.length !== size ** 3 ) throw new Error( `The .cube file has ${rows.length} entries; LUT_3D_SIZE ${size} needs ${size ** 3}.` );
	const data = new Float32Array( size ** 3 * 3 );
	rows.forEach( ( row, i ) => { for ( let k = 0; k < 3; k ++ ) data[ i * 3 + k ] = clamp01( ( row[ k ] - min[ k ] ) / ( max[ k ] - min[ k ] || 1 ) ); } );
	return { title: title || 'Imported LUT', size, data };

}

/** Trilinear lookup of a parsed or stored LUT ({ size, data | rgba }) at display color c. */
export function sampleLut( lut, c ) {

	const n = lut.size, get = lut.data ? ( i, k ) => lut.data[ i * 3 + k ] : ( i, k ) => lut.rgba[ i * 4 + k ] / 255;
	const p = c.map( ( x ) => clamp01( x ) * ( n - 1 ) );
	const i0 = p.map( ( x ) => Math.min( n - 2, Math.floor( x ) ) ), f = p.map( ( x, k ) => x - i0[ k ] );
	const out = [ 0, 0, 0 ];
	for ( let dz = 0; dz < 2; dz ++ ) for ( let dy = 0; dy < 2; dy ++ ) for ( let dx = 0; dx < 2; dx ++ ) {

		const w = ( dx ? f[ 0 ] : 1 - f[ 0 ] ) * ( dy ? f[ 1 ] : 1 - f[ 1 ] ) * ( dz ? f[ 2 ] : 1 - f[ 2 ] );
		const i = ( ( i0[ 2 ] + dz ) * n + i0[ 1 ] + dy ) * n + i0[ 0 ] + dx;
		for ( let k = 0; k < 3; k ++ ) out[ k ] += get( i, k ) * w;

	}

	return out;

}

/**
 * Loads a LUT into the 'custom' slot, resampled to `size`³ (the grade stage's 33³), or clears
 * it with null. Accepts parseCube() output or a stored { title, size, rgba } (look files).
 */
export function setCustomLut( lut, size = 33 ) {

	customVersion ++;
	if ( ! lut ) { custom = null; return null; }
	const rgba = lut.rgba && lut.size === size ? lut.rgba : bakeLut( ( c ) => sampleLut( lut, c ), size );
	custom = { title: lut.title || 'Imported LUT', size, rgba, version: customVersion };
	return custom;

}

/** The loaded custom LUT ({ title, size, rgba, version }) or null. */
export const customLut = () => custom;

/** A custom LUT for a look file: RGB bytes, base64 (no alpha), and back. */
export function encodeLut( lut ) {

	const rgb = new Uint8Array( lut.size ** 3 * 3 );
	for ( let i = 0; i < lut.size ** 3; i ++ ) for ( let k = 0; k < 3; k ++ ) rgb[ i * 3 + k ] = lut.rgba[ i * 4 + k ];
	let bin = '';
	for ( let i = 0; i < rgb.length; i += 0x8000 ) bin += String.fromCharCode( ...rgb.subarray( i, i + 0x8000 ) );
	return { title: lut.title, size: lut.size, rgb: btoa( bin ) };

}

export function decodeLut( { title, size, rgb } ) {

	const bin = atob( rgb );
	if ( bin.length !== size ** 3 * 3 ) throw new Error( 'The look\'s LUT data is cut off.' );
	const rgba = new Uint8Array( size ** 3 * 4 );
	for ( let i = 0; i < size ** 3; i ++ ) { for ( let k = 0; k < 3; k ++ ) rgba[ i * 4 + k ] = bin.charCodeAt( i * 3 + k ); rgba[ i * 4 + 3 ] = 255; }
	return { title, size, rgba };

}
