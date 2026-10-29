// The store-only zip writer (design §6.12, P2): read the archive back field by field.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zip, crc32, toBytes } from '../src/app/export/zip.js';

test( 'CRC-32 matches the reference value', () => {

	assert.equal( crc32( new TextEncoder().encode( 'The quick brown fox jumps over the lazy dog' ) ), 0x414fa339 );
	assert.equal( crc32( new Uint8Array( 0 ) ), 0 );

} );

test( 'a zip of text, a data URL and bytes reads back intact', async () => {

	const files = [
		{ name: 'STYLE.md', data: await toBytes( '# Art direction — ünïcode\n' ) },
		{ name: 'palette.png', data: await toBytes( 'data:image/png;base64,iVBORw0KGgo=' ) },
		{ name: 'bin/raw.bin', data: await toBytes( new Uint8Array( [ 0, 1, 2, 255 ] ) ) },
	];
	const out = zip( files, { date: new Date( 2026, 9, 28, 12, 30, 10 ) } );
	const v = new DataView( out.buffer, out.byteOffset, out.byteLength );
	const eocd = out.length - 22;
	assert.equal( v.getUint32( eocd, true ), 0x06054b50, 'end of central directory' );
	assert.equal( v.getUint16( eocd + 10, true ), 3, 'three entries' );
	let p = v.getUint32( eocd + 16, true );
	for ( const f of files ) {

		assert.equal( v.getUint32( p, true ), 0x02014b50, 'central directory entry' );
		assert.equal( v.getUint16( p + 10, true ), 0, 'stored, not compressed' );
		const crc = v.getUint32( p + 16, true ), size = v.getUint32( p + 24, true ), nameLen = v.getUint16( p + 28, true ), local = v.getUint32( p + 42, true );
		const name = new TextDecoder().decode( out.subarray( p + 46, p + 46 + nameLen ) );
		assert.equal( name, f.name );
		assert.equal( size, f.data.length );
		assert.equal( crc, crc32( f.data ) );
		// The local header points at the same bytes.
		assert.equal( v.getUint32( local, true ), 0x04034b50 );
		const start = local + 30 + v.getUint16( local + 26, true );
		assert.deepEqual( out.subarray( start, start + size ), f.data );
		p += 46 + nameLen;

	}

	assert.equal( new TextDecoder().decode( files[ 0 ].data ), '# Art direction — ünïcode\n' );
	assert.deepEqual( [ ...files[ 1 ].data.slice( 0, 4 ) ], [ 0x89, 0x50, 0x4e, 0x47 ], 'the PNG signature' );

} );
