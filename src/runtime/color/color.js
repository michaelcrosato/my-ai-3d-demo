// Color math for looks (design §7.1): sRGB hex ↔ linear ↔ OKLab/OKLCH, Kelvin.
// Looks store sRGB hex; shading uses linear; mixing and palette work happen in OKLab,
// where equal steps look equal. Pure functions, no three.js.

const clamp01 = ( x ) => Math.min( 1, Math.max( 0, x ) );

export function hexToRgb( hex ) {

	let h = String( hex ).trim().replace( /^#/, '' );
	if ( h.length === 3 ) h = h.replace( /./g, ( c ) => c + c );
	if ( ! /^[0-9a-f]{6}$/i.test( h ) ) throw new Error( `Not a hex color: ${hex}` );
	const n = parseInt( h, 16 );
	return [ ( n >> 16 & 255 ) / 255, ( n >> 8 & 255 ) / 255, ( n & 255 ) / 255 ];

}

export function rgbToHex( [ r, g, b ] ) {

	const to = ( x ) => Math.round( clamp01( x ) * 255 ).toString( 16 ).padStart( 2, '0' );
	return `#${to( r )}${to( g )}${to( b )}`;

}

export const isHex = ( v ) => typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test( v );

export const srgbToLinear = ( c ) => c <= 0.04045 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 );
export const linearToSrgb = ( c ) => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow( c, 1 / 2.4 ) - 0.055;

export const hexToLinear = ( hex ) => hexToRgb( hex ).map( srgbToLinear );
export const linearToHex = ( rgb ) => rgbToHex( rgb.map( ( c ) => linearToSrgb( Math.max( 0, c ) ) ) );

/** Linear sRGB → OKLab (Björn Ottosson). */
export function linearToOklab( [ r, g, b ] ) {

	const l = Math.cbrt( 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b );
	const m = Math.cbrt( 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b );
	const s = Math.cbrt( 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b );
	return [
		0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
	];

}

export function oklabToLinear( [ L, a, b ] ) {

	const l = ( L + 0.3963377774 * a + 0.2158037573 * b ) ** 3;
	const m = ( L - 0.1055613458 * a - 0.0638541728 * b ) ** 3;
	const s = ( L - 0.0894841775 * a - 1.2914855480 * b ) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		- 1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		- 0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
	];

}

export const hexToOklab = ( hex ) => linearToOklab( hexToLinear( hex ) );
export const oklabToHex = ( lab ) => linearToHex( oklabToLinear( lab ) );

export function oklabToOklch( [ L, a, b ] ) {

	return [ L, Math.hypot( a, b ), Math.atan2( b, a ) * 180 / Math.PI ];

}

export function oklchToOklab( [ L, C, h ] ) {

	const r = h * Math.PI / 180;
	return [ L, C * Math.cos( r ), C * Math.sin( r ) ];

}

/** Mixes two hex colors in OKLab. */
export function mixHex( a, b, t ) {

	const p = hexToOklab( a ), q = hexToOklab( b );
	return oklabToHex( p.map( ( v, i ) => v + ( q[ i ] - v ) * t ) );

}

/**
 * Palette transform in OKLCH: chroma × saturation, lightness × value, hue + degrees.
 */
export function adjustHex( hex, { saturation = 1, value = 1, hue = 0 } = {} ) {

	if ( saturation === 1 && value === 1 && hue === 0 ) return hex.toLowerCase();
	const [ L, C, h ] = oklabToOklch( hexToOklab( hex ) );
	return oklabToHex( oklchToOklab( [ clamp01( L * value ), C * saturation, h + hue ] ) );

}

/**
 * Nearest palette entry in OKLab. With `keepValue`, the result keeps the original
 * lightness, so a remapped scene keeps its value structure.
 */
export function remapToPalette( hex, palette, { keepValue = true } = {} ) {

	if ( ! palette || palette.length === 0 ) return hex.toLowerCase();
	const lab = hexToOklab( hex );
	let best = null, bestD = Infinity;

	for ( const entry of palette ) {

		const p = hexToOklab( entry );
		// Hue and chroma matter more than lightness when picking a role color.
		const d = 0.5 * ( p[ 0 ] - lab[ 0 ] ) ** 2 + ( p[ 1 ] - lab[ 1 ] ) ** 2 + ( p[ 2 ] - lab[ 2 ] ) ** 2;
		if ( d < bestD ) { bestD = d; best = p; }

	}

	return oklabToHex( keepValue ? [ ( lab[ 0 ] + best[ 0 ] ) / 2, best[ 1 ], best[ 2 ] ] : best );

}

/** Approximate color of a black body at `kelvin`, as linear RGB normalized to luminance 1. */
export function kelvinToLinear( kelvin ) {

	const t = Math.min( 40000, Math.max( 1000, kelvin ) ) / 100;
	let r, g, b;

	// Tanner Helland's fit, in sRGB 0–255.
	if ( t <= 66 ) {

		r = 255;
		g = 99.4708025861 * Math.log( t ) - 161.1195681661;
		b = t <= 19 ? 0 : 138.5177312231 * Math.log( t - 10 ) - 305.0447927307;

	} else {

		r = 329.698727446 * Math.pow( t - 60, - 0.1332047592 );
		g = 288.1221695283 * Math.pow( t - 60, - 0.0755148492 );
		b = 255;

	}

	const lin = [ r, g, b ].map( ( c ) => srgbToLinear( clamp01( c / 255 ) ) );
	const y = 0.2126 * lin[ 0 ] + 0.7152 * lin[ 1 ] + 0.0722 * lin[ 2 ];
	return lin.map( ( c ) => c / y );

}

/**
 * White-balance gains for a temperature/tint grade. temperature +1 warms
 * (as if lit by ~3250 K), −1 cools (~13000 K); tint +1 pushes magenta, −1 green.
 */
export function whiteBalanceGains( temperature = 0, tint = 0 ) {

	const light = kelvinToLinear( 6500 * Math.pow( 2, - temperature ) );
	const ref = kelvinToLinear( 6500 );
	const gains = light.map( ( c, i ) => c / ref[ i ] );
	gains[ 1 ] *= 1 - tint * 0.2;
	const y = 0.2126 * gains[ 0 ] + 0.7152 * gains[ 1 ] + 0.0722 * gains[ 2 ];
	return gains.map( ( c ) => c / y );

}

export const luminanceOfHex = ( hex ) => {

	const [ r, g, b ] = hexToLinear( hex );
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;

};
