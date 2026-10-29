// Test fixtures for the smoke test, built in Node from scratch so no binary files live in
// the repository. testGlb(): a 4 m banner with a KTX2 texture (KHR_texture_basisu, an
// uncompressed RGBA8 checker made by three's KTX2Exporter) and a morph target that bows it,
// animated 0 → 1 → 0 over two seconds: the import features of design §6.1 (P2).

import { DataTexture, RGBAFormat, UnsignedByteType, SRGBColorSpace } from 'three';
import { KTX2Exporter } from 'three/addons/exporters/KTX2Exporter.js';

/** An 8 × 8 checker in two colors, as KTX2 bytes. */
async function checkerKtx2() {

	const N = 8, data = new Uint8Array( N * N * 4 );
	for ( let y = 0; y < N; y ++ ) for ( let x = 0; x < N; x ++ ) data.set( ( x + y ) % 2 ? [ 240, 200, 60, 255 ] : [ 40, 60, 160, 255 ], ( y * N + x ) * 4 );
	const t = new DataTexture( data, N, N, RGBAFormat, UnsignedByteType );
	t.colorSpace = SRGBColorSpace;
	t.needsUpdate = true;
	return new KTX2Exporter().parse( t );

}

/** The GLB as an ArrayBuffer-backed Uint8Array. */
export async function testGlb() {

	const ktx2 = await checkerKtx2();
	// A 2 × 2-segment quad standing up (x across, y up), 4 m wide: 9 vertices, 8 triangles.
	const pos = [], nor = [], uv = [], bow = [];
	for ( let j = 0; j <= 2; j ++ ) for ( let i = 0; i <= 2; i ++ ) {

		pos.push( ( i - 1 ) * 2, j * 2, 0 );
		nor.push( 0, 0, 1 );
		uv.push( i / 2 * 4, 1 - j / 2 * 4 ); // the checker repeats 4 ×
		bow.push( 0, 0, i === 1 ? 1.2 : 0 ); // the middle column bows forward

	}

	const idx = [];
	for ( let j = 0; j < 2; j ++ ) for ( let i = 0; i < 2; i ++ ) {

		const a = j * 3 + i, b = a + 1, c = a + 3, d = c + 1;
		idx.push( a, b, d, a, d, c );

	}

	const chunks = [];
	let offset = 0;
	const view = ( bytes, target ) => {

		const pad = ( 4 - ( bytes.byteLength % 4 ) ) % 4;
		const bv = { buffer: 0, byteOffset: offset, byteLength: bytes.byteLength, ...( target ? { target } : {} ) };
		chunks.push( new Uint8Array( bytes.buffer, bytes.byteOffset, bytes.byteLength ), new Uint8Array( pad ) );
		offset += bytes.byteLength + pad;
		return bv;

	};

	const f32 = ( a ) => new Float32Array( a ), bounds = ( a ) => [ 0, 1, 2 ].map( ( k ) => a.filter( ( _, i ) => i % 3 === k ) );
	const [ px, py, pz ] = bounds( pos ), [ bx, by, bz ] = bounds( bow );
	const bufferViews = [
		view( f32( pos ), 34962 ), view( f32( nor ), 34962 ), view( f32( uv ), 34962 ), view( new Uint16Array( idx ), 34963 ),
		view( f32( bow ), 34962 ), view( f32( [ 0, 1, 2 ] ) ), view( f32( [ 0, 1, 0 ] ) ), view( ktx2 ),
	];
	const json = {
		asset: { version: '2.0', generator: 'Style Lab smoke fixture' },
		extensionsUsed: [ 'KHR_texture_basisu' ], extensionsRequired: [ 'KHR_texture_basisu' ],
		scene: 0, scenes: [ { nodes: [ 0 ] } ],
		nodes: [ { mesh: 0, name: 'banner' } ],
		meshes: [ { name: 'banner', weights: [ 0 ], primitives: [ { attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0, targets: [ { POSITION: 4 } ] } ] } ],
		materials: [ { name: 'banner cloth', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.8 }, doubleSided: true } ],
		textures: [ { sampler: 0, extensions: { KHR_texture_basisu: { source: 0 } } } ],
		samplers: [ { magFilter: 9729, minFilter: 9729, wrapS: 10497, wrapT: 10497 } ],
		images: [ { bufferView: 7, mimeType: 'image/ktx2' } ],
		accessors: [
			{ bufferView: 0, componentType: 5126, count: 9, type: 'VEC3', min: [ Math.min( ...px ), Math.min( ...py ), Math.min( ...pz ) ], max: [ Math.max( ...px ), Math.max( ...py ), Math.max( ...pz ) ] },
			{ bufferView: 1, componentType: 5126, count: 9, type: 'VEC3' },
			{ bufferView: 2, componentType: 5126, count: 9, type: 'VEC2' },
			{ bufferView: 3, componentType: 5123, count: idx.length, type: 'SCALAR' },
			{ bufferView: 4, componentType: 5126, count: 9, type: 'VEC3', min: [ Math.min( ...bx ), Math.min( ...by ), Math.min( ...bz ) ], max: [ Math.max( ...bx ), Math.max( ...by ), Math.max( ...bz ) ] },
			{ bufferView: 5, componentType: 5126, count: 3, type: 'SCALAR', min: [ 0 ], max: [ 2 ] },
			{ bufferView: 6, componentType: 5126, count: 3, type: 'SCALAR' },
		],
		animations: [ { name: 'bow', channels: [ { sampler: 0, target: { node: 0, path: 'weights' } } ], samplers: [ { input: 5, output: 6, interpolation: 'LINEAR' } ] } ],
		bufferViews,
		buffers: [ { byteLength: offset } ],
	};

	const enc = new TextEncoder().encode( JSON.stringify( json ) );
	const jsonChunk = new Uint8Array( Math.ceil( enc.length / 4 ) * 4 ).fill( 0x20 );
	jsonChunk.set( enc );
	const bin = new Uint8Array( offset );
	let p = 0;
	for ( const c of chunks ) { bin.set( c, p ); p += c.byteLength; }

	const total = 12 + 8 + jsonChunk.length + 8 + bin.length;
	const out = new Uint8Array( total );
	const v = new DataView( out.buffer );
	v.setUint32( 0, 0x46546c67, true ); v.setUint32( 4, 2, true ); v.setUint32( 8, total, true );
	v.setUint32( 12, jsonChunk.length, true ); v.setUint32( 16, 0x4e4f534a, true ); out.set( jsonChunk, 20 );
	const b = 20 + jsonChunk.length;
	v.setUint32( b, bin.length, true ); v.setUint32( b + 4, 0x004e4942, true ); out.set( bin, b + 8 );
	return out;

}
