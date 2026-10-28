// A store-only zip writer (design §6.12, P2: "a store-only zip writer, no dependency"):
// files are stored uncompressed, with CRC-32 and UTF-8 names, so the export bundle downloads
// as one file. Pure, so tests can read the archive back.

const CRC = ( () => {

	const t = new Uint32Array( 256 );
	for ( let n = 0; n < 256; n ++ ) {

		let c = n;
		for ( let k = 0; k < 8; k ++ ) c = c & 1 ? 0xedb88320 ^ ( c >>> 1 ) : c >>> 1;
		t[ n ] = c >>> 0;

	}

	return t;

} )();

export function crc32( bytes ) {

	let c = 0xffffffff;
	for ( let i = 0; i < bytes.length; i ++ ) c = CRC[ ( c ^ bytes[ i ] ) & 0xff ] ^ ( c >>> 8 );
	return ( c ^ 0xffffffff ) >>> 0;

}

/** File content → bytes: text (UTF-8), a data: URL (decoded), or bytes as they are. */
export async function toBytes( content ) {

	if ( content instanceof Uint8Array ) return content;
	if ( content instanceof ArrayBuffer ) return new Uint8Array( content );
	if ( typeof Blob !== 'undefined' && content instanceof Blob ) return new Uint8Array( await content.arrayBuffer() );
	if ( typeof content === 'string' && content.startsWith( 'data:' ) ) {

		const [ head, body ] = content.split( ',' );
		if ( ! head.endsWith( ';base64' ) ) return new TextEncoder().encode( decodeURIComponent( body ) );
		const bin = atob( body );
		const out = new Uint8Array( bin.length );
		for ( let i = 0; i < bin.length; i ++ ) out[ i ] = bin.charCodeAt( i );
		return out;

	}

	return new TextEncoder().encode( String( content ) );

}

/**
 * Builds a zip archive. `files`: [{ name, data: Uint8Array }]. `date` sets every entry's
 * modification time (DOS format, two-second resolution).
 * @returns {Uint8Array}
 */
export function zip( files, { date = new Date() } = {} ) {

	const enc = new TextEncoder();
	const time = ( date.getHours() << 11 ) | ( date.getMinutes() << 5 ) | ( date.getSeconds() >> 1 );
	const day = ( ( date.getFullYear() - 1980 ) << 9 ) | ( ( date.getMonth() + 1 ) << 5 ) | date.getDate();
	const entries = files.map( ( f ) => ( { name: enc.encode( f.name ), data: f.data, crc: crc32( f.data ) } ) );
	const size = entries.reduce( ( s, e ) => s + 30 + e.name.length + e.data.length + 46 + e.name.length, 0 ) + 22;
	const out = new Uint8Array( size );
	const view = new DataView( out.buffer );
	let p = 0;
	const u16 = ( v ) => { view.setUint16( p, v, true ); p += 2; };
	const u32 = ( v ) => { view.setUint32( p, v >>> 0, true ); p += 4; };
	const bytes = ( b ) => { out.set( b, p ); p += b.length; };

	for ( const e of entries ) {

		e.offset = p;
		u32( 0x04034b50 ); u16( 20 ); u16( 0x0800 ); u16( 0 ); u16( time ); u16( day );
		u32( e.crc ); u32( e.data.length ); u32( e.data.length ); u16( e.name.length ); u16( 0 );
		bytes( e.name ); bytes( e.data );

	}

	const dir = p;
	for ( const e of entries ) {

		u32( 0x02014b50 ); u16( 20 ); u16( 20 ); u16( 0x0800 ); u16( 0 ); u16( time ); u16( day );
		u32( e.crc ); u32( e.data.length ); u32( e.data.length ); u16( e.name.length ); u16( 0 ); u16( 0 ); u16( 0 ); u16( 0 ); u32( 0 ); u32( e.offset );
		bytes( e.name );

	}

	u32( 0x06054b50 ); u16( 0 ); u16( 0 ); u16( entries.length ); u16( entries.length ); u32( p - dir ); u32( dir ); u16( 0 );
	return out;

}
