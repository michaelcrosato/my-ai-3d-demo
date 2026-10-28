// Dev helper: boots the dev page headless and runs a module's default export in the page.
//   node scripts/dev/eval.mjs <file.js> [--backend webgl|webgpu]
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { startServer } from '../serve.mjs';
import { localFileFor } from '../importmap.mjs';
const { chromium } = createRequire( import.meta.url )( 'playwright' );
const file = process.argv[ 2 ];
const backend = process.argv.includes( '--backend' ) ? process.argv[ process.argv.indexOf( '--backend' ) + 1 ] : 'webgl';
const server = await startServer();
const browser = await chromium.launch( { args: [ '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--enable-unsafe-swiftshader' ] } );
const page = await browser.newPage();
await page.route( 'https://cdn.jsdelivr.net/**', async ( r ) => { const f = localFileFor( r.request().url() ); return f ? r.fulfill( { body: await readFile( f ), headers: { 'content-type': 'text/javascript', 'access-control-allow-origin': '*' } } ) : r.fulfill( { status: 404 } ); } );
page.on( 'console', ( m ) => { if ( m.type() === 'error' || m.type() === 'warning' ) console.log( `[${m.type()}]`, m.text().slice( 0, 300 ) ); } );
await page.goto( `${server.url}/index.html?backend=${backend}` );
await page.waitForFunction( () => window.__stylelab?.ready );
const out = await page.evaluate( async ( p ) => ( await import( p ) ).default( window.__stylelab ), '/' + path.relative( process.cwd(), path.resolve( file ) ) );
console.log( JSON.stringify( out, null, 1 ) );
await browser.close(); await server.close();
