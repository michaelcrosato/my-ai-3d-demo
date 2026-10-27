// Smoke test (design §8): boots the app in headless Chromium on several targets,
// checks for errors and a non-blank frame, and runs the spikes. CDN requests are
// served from node_modules (same pinned versions), so it runs offline.
//
//   node scripts/smoke.mjs [--only <text>] [--no-spikes] [--rebuild-iterations N]
//
// Needs Playwright with Chromium: `npm i -D playwright && npx playwright install chromium`
// (already present in the cloud container). Headless WebGPU uses SwiftShader.

import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { startServer, ROOT } from './serve.mjs';
import { localFileFor } from './importmap.mjs';

const { chromium } = createRequire( import.meta.url )( 'playwright' );

const argv = process.argv.slice( 2 );
const flag = ( name ) => argv.includes( name );
const value = ( name ) => { const i = argv.indexOf( name ); return i >= 0 ? argv[ i + 1 ] : null; };

const ARTIFACTS = path.join( ROOT, 'artifacts' );
const CHROMIUM_ARGS = [ '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--enable-unsafe-swiftshader' ];
const distFile = pathToFileURL( path.join( ROOT, 'dist/style-lab.html' ) ).href;

const RUNS = [
	{ name: 'dev  · http · WebGL2', url: ( base ) => `${base}/index.html?backend=webgl`, backend: 'WebGL2' },
	{ name: 'dist · http · WebGL2', url: ( base ) => `${base}/dist/style-lab.html?backend=webgl`, backend: 'WebGL2' },
	{ name: 'dist · http · WebGPU', url: ( base ) => `${base}/dist/style-lab.html`, backend: 'WebGPU', screenshot: 'm0-webgpu.png', panel: true },
	{ name: 'dist · file · WebGL2', url: () => `${distFile}?backend=webgl`, backend: 'WebGL2' },
	{ name: 'dist · file · auto  ', url: () => distFile, backend: null },
].filter( ( r ) => ! value( '--only' ) || r.name.includes( value( '--only' ) ) );

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' };

async function routeCdn( context ) {

	await context.route( 'https://cdn.jsdelivr.net/**', async ( route ) => {

		const file = localFileFor( route.request().url() );
		if ( ! file ) return route.fulfill( { status: 404, body: 'not in node_modules' } );
		await route.fulfill( {
			status: 200,
			body: await readFile( file ),
			headers: { 'content-type': MIME[ path.extname( file ) ] || 'application/octet-stream', 'access-control-allow-origin': '*' },
		} );

	} );

}

async function smoke( browser, run, base ) {

	const context = await browser.newContext( { viewport: { width: 1280, height: 720 } } );
	await routeCdn( context );
	const page = await context.newPage();
	const consoleErrors = [];
	page.on( 'pageerror', ( e ) => consoleErrors.push( String( e ) ) );

	const result = { name: run.name.trim(), failures: [], spikes: [] };
	const fail = ( msg ) => result.failures.push( msg );

	try {

		await page.goto( run.url( base ) );
		await page.waitForFunction( () => window.__stylelab && window.__stylelab.ready, null, { timeout: 60000 } );
		const ok = await page.evaluate( () => window.__stylelab.ready );
		if ( ! ok ) throw new Error( 'boot failed' );

		Object.assign( result, await page.evaluate( () => ( { backend: window.__stylelab.backend, protocol: location.protocol, adapter: window.__stylelab.caps.adapter } ) ) );
		if ( run.backend && result.backend !== run.backend ) fail( `backend ${result.backend}, expected ${run.backend}` );

		await page.waitForTimeout( 500 );
		result.frame = await page.evaluate( () => window.__stylelab.capture() );
		if ( ! ( result.frame.lumaStd > 0.02 && result.frame.meanLuma > 0.05 && result.frame.meanLuma < 0.95 ) ) fail( `frame looks blank: ${JSON.stringify( result.frame )}` );
		result.stats = await page.evaluate( () => window.__stylelab.frameStats() );

		if ( run.screenshot ) {

			await mkdir( ARTIFACTS, { recursive: true } );
			await page.screenshot( { path: path.join( ARTIFACTS, run.screenshot ) } );

		}

		if ( ! flag( '--no-spikes' ) ) {

			const iterations = Number( value( '--rebuild-iterations' ) ) || undefined;
			result.spikes = await page.evaluate( ( o ) => window.__stylelab.runSpikes( null, o ), { rebuildIterations: iterations } );
			for ( const s of result.spikes ) if ( s.status === 'error' || s.status === 'no-go' ) fail( `spike ${s.id} ${s.key}: ${s.status}` );

		}

		// Drive the Verify panel through its real buttons and read the report it builds.
		if ( run.panel ) {

			await page.click( '#verify-btn' );
			await page.click( '.check[data-id="M0-01"] [data-status="pass"]' );
			await page.click( '[data-tab="report"]' );
			result.report = await page.inputValue( 'textarea.report' );
			if ( ! result.report.includes( 'Checks: 1 pass' ) ) fail( 'Verify report does not record the clicked check' );
			const spikeLine = result.spikes.length ? `Spikes (${result.backend}): ${result.spikes.filter( ( s ) => s.status === 'go' ).length} go` : null;
			if ( spikeLine && ! result.report.includes( spikeLine ) ) fail( `Verify report is missing "${spikeLine}"` );

		}

		result.log = await page.evaluate( () => window.__stylelab.errors() );
		for ( const e of result.log.filter( ( e ) => e.level === 'error' ) ) fail( `error: ${e.message.split( '\n' )[ 0 ]}` );

	} catch ( e ) {

		fail( String( e && e.message ? e.message : e ) );

	}

	for ( const e of consoleErrors ) fail( `pageerror: ${e}` );
	await context.close();
	return result;

}

const server = await startServer();
const browser = await chromium.launch( { args: CHROMIUM_ARGS } );
const results = [];

for ( const run of RUNS ) {

	const t0 = Date.now();
	const r = await smoke( browser, run, server.url );
	r.seconds = Math.round( ( Date.now() - t0 ) / 100 ) / 10;
	results.push( r );

	const spikes = r.spikes.map( ( s ) => `${s.id}:${s.status}` ).join( ' ' );
	const warnings = ( r.log || [] ).filter( ( e ) => e.level === 'warn' ).length;
	console.log( `${r.failures.length ? 'FAIL' : 'ok  '} ${run.name}  ${r.backend || '?'}  ${r.seconds}s  luma ${r.frame ? r.frame.meanLuma.toFixed( 2 ) : '-'}  warnings ${warnings}  ${spikes}` );
	for ( const f of r.failures ) console.log( `       ✗ ${f}` );

}

await browser.close();
await server.close();

await mkdir( ARTIFACTS, { recursive: true } );
await writeFile( path.join( ARTIFACTS, 'smoke-report.json' ), JSON.stringify( results, null, 2 ) );

const failed = results.filter( ( r ) => r.failures.length );
console.log( failed.length ? `\n${failed.length}/${results.length} runs failed (details: artifacts/smoke-report.json)` : `\nall ${results.length} runs passed (details: artifacts/smoke-report.json)` );
process.exit( failed.length ? 1 : 0 );
