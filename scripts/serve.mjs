// Minimal static file server for development and the smoke test (no dependencies).
//   npm run dev            → http://localhost:5173/index.html
//   PORT=8080 npm run dev

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.wasm': 'application/wasm',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.md': 'text/markdown; charset=utf-8',
};

export const ROOT = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );

export function startServer( { root = ROOT, port = 0, host = '127.0.0.1' } = {} ) {

	const server = http.createServer( async ( req, res ) => {

		const url = new URL( req.url, 'http://localhost' );
		const file = path.join( root, decodeURIComponent( url.pathname ) );

		if ( file !== root && ! file.startsWith( root + path.sep ) ) {

			res.writeHead( 403 ).end();
			return;

		}

		try {

			const target = ( await stat( file ) ).isDirectory() ? path.join( file, 'index.html' ) : file;
			const body = await readFile( target );
			res.writeHead( 200, { 'content-type': MIME[ path.extname( target ) ] || 'application/octet-stream', 'cache-control': 'no-store' } );
			res.end( body );

		} catch {

			res.writeHead( 404, { 'content-type': 'text/plain' } ).end( 'not found' );

		}

	} );

	return new Promise( ( resolve ) => {

		server.listen( port, host, () => {

			const { port: actual } = server.address();
			resolve( { url: `http://localhost:${actual}`, close: () => new Promise( ( r ) => server.close( r ) ) } );

		} );

	} );

}

if ( process.argv[ 1 ] === fileURLToPath( import.meta.url ) ) {

	const { url } = await startServer( { port: Number( process.env.PORT ) || 5173 } );
	console.log( `Style Lab dev server: ${url}/index.html  (built file: ${url}/dist/style-lab.html)` );

}
