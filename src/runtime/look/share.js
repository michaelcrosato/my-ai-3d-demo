// Share links (design §6.12): `#look=` or `#state=` holds base64url-encoded,
// deflate-raw-compressed JSON, made with the browser's native CompressionStream.
// No server; the link is the state. Works in Node 18+ too (tests).

const toBase64Url = ( bytes ) => {

	let s = '';
	for ( let i = 0; i < bytes.length; i += 0x8000 ) s += String.fromCharCode( ...bytes.subarray( i, i + 0x8000 ) );
	return btoa( s ).replace( /\+/g, '-' ).replace( /\//g, '_' ).replace( /=+$/, '' );

};

const fromBase64Url = ( text ) => {

	const b64 = text.replace( /-/g, '+' ).replace( /_/g, '/' ) + '==='.slice( ( text.length + 3 ) % 4 );
	return Uint8Array.from( atob( b64 ), ( c ) => c.charCodeAt( 0 ) );

};

async function pipe( bytes, stream ) {

	const out = new Response( new Blob( [ bytes ] ).stream().pipeThrough( stream ) );
	return new Uint8Array( await out.arrayBuffer() );

}

/** JSON → compressed base64url text. */
export async function encodeShare( value ) {

	return toBase64Url( await pipe( new TextEncoder().encode( JSON.stringify( value ) ), new CompressionStream( 'deflate-raw' ) ) );

}

/** Compressed base64url text → the JSON value. Throws on corrupt input. */
export async function decodeShare( text ) {

	return JSON.parse( new TextDecoder().decode( await pipe( fromBase64Url( text ), new DecompressionStream( 'deflate-raw' ) ) ) );

}

/** Reads `#state=…` or `#look=…` from a location hash: { kind, text } or null. */
export function parseShareHash( hash ) {

	const m = /^#(state|look)=([A-Za-z0-9_-]+)$/.exec( hash || '' );
	return m ? { kind: m[ 1 ], text: m[ 2 ] } : null;

}
