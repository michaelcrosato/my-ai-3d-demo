// Export file formats (design §6.12): .cube LUTs for other engines, GIMP palettes.
// Pure functions over plain data, so tests and other tools can use them too.

/**
 * A 3D LUT as Adobe/Resolve `.cube` text. `table` is RGB(A) per entry, red fastest, then
 * green, then blue (the .cube order), as 0–1 floats or 0–255 bytes (`bytes: true`).
 */
export function toCube( table, size, { title = 'Style Lab grade', channels = 4, bytes = false } = {} ) {

	const k = bytes ? 1 / 255 : 1;
	const lines = [
		`TITLE "${title.replace( /"/g, '' )}"`,
		'# Display-referred (sRGB in, sRGB out). Apply after tone mapping.',
		`LUT_3D_SIZE ${size}`,
		'DOMAIN_MIN 0.0 0.0 0.0',
		'DOMAIN_MAX 1.0 1.0 1.0',
	];
	for ( let i = 0; i < size * size * size; i ++ ) {

		const o = i * channels;
		lines.push( `${( table[ o ] * k ).toFixed( 6 )} ${( table[ o + 1 ] * k ).toFixed( 6 )} ${( table[ o + 2 ] * k ).toFixed( 6 )}` );

	}

	return lines.join( '\n' ) + '\n';

}

/** A GIMP / Inkscape / Krita palette (`.gpl`). `colors` are hex strings; `names` optional. */
export function toGpl( colors, { name = 'Style Lab', names = [] } = {} ) {

	const rows = colors.map( ( hex, i ) => {

		const n = parseInt( hex.slice( 1 ), 16 );
		const rgb = [ ( n >> 16 ) & 255, ( n >> 8 ) & 255, n & 255 ].map( ( v ) => String( v ).padStart( 3 ) ).join( ' ' );
		return `${rgb}\t${names[ i ] || hex}`;

	} );
	return [ 'GIMP Palette', `Name: ${name}`, `Columns: ${Math.min( 8, colors.length )}`, '#', ...rows ].join( '\n' ) + '\n';

}
