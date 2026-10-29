import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readImportMap, distImportMap, localFileFor } from '../scripts/importmap.mjs';

const ROOT = path.resolve( import.meta.dirname, '..' );

test( 'build produces one self-contained HTML file plus the runtime module', () => {

	const out = mkdtempSync( path.join( tmpdir(), 'stylelab-build-' ) );

	try {

		execFileSync( process.execPath, [ 'scripts/build.mjs', '--out', out ], { cwd: ROOT, stdio: 'pipe' } );
		const html = readFileSync( path.join( out, 'style-lab.html' ), 'utf8' );
		const runtime = readFileSync( path.join( out, 'stylelab-runtime.js' ), 'utf8' );

		assert.ok( ! html.includes( './src/' ), 'no references to source files' );
		assert.ok( ! /<link[^>]+stylesheet/.test( html ), 'CSS is inlined' );
		assert.match( html, /<style>[\s\S]*--panel:/, 'app CSS present' );
		assert.match( html, /<script type="module">\n\/\* Style Lab v/, 'app bundle inlined as a module script' );
		assert.ok( ! html.includes( 'typeof __STYLELAB_BUILD__' ), 'build info is substituted' );
		assert.match( html, /define_STYLELAB_BUILD_default = \{ version: "\d+\.\d+\.\d+", commit: "\w+"/ );
		assert.equal( ( html.match( /<\/script>/g ) || [] ).length, 2, 'only the import map and the app script' );

		// The import map in the built file is the one tests pin against, with three's minified builds.
		const built = JSON.parse( /<script type="importmap">([\s\S]*?)<\/script>/.exec( html )[ 1 ] );
		assert.deepEqual( built, distImportMap() );
		assert.equal( built.imports[ 'three/webgpu' ], readImportMap().imports[ 'three/webgpu' ].replace( /\.js$/, '.min.js' ) );
		for ( const url of Object.values( built.imports ).filter( ( u ) => ! u.endsWith( '/' ) ) ) assert.ok( localFileFor( url ), `missing local file for ${url}` );

		// Dependencies stay external (loaded via the import map), not bundled.
		assert.match( html, /from "three\/webgpu"/ );
		// three.webgpu.js alone is over 1.7 MB unminified; the app (with the runtime and kit embedded
		// as export files) stays well under that, so the size bound catches three being bundled.
		assert.ok( ! /const REVISION = ['"]\d+/.test( html ) && html.length < 2200 * 1024, 'three.js is not bundled in' );
		assert.match( runtime, /export \{/ );
		assert.ok( ! /document\.|window\./.test( runtime ), 'runtime has no DOM access' );

	} finally {

		rmSync( out, { recursive: true, force: true } );

	}

} );

test( '--offline adds one page with every dependency inlined and no import map', () => {

	const out = mkdtempSync( path.join( tmpdir(), 'stylelab-offline-' ) );

	try {

		execFileSync( process.execPath, [ 'scripts/build.mjs', '--out', out, '--offline' ], { cwd: ROOT, stdio: 'pipe' } );
		const html = readFileSync( path.join( out, 'style-lab-offline.html' ), 'utf8' );
		// (The embedded starter.html export keeps its own import map, as text.)
		assert.ok( ! html.split( '<script type="module">' )[ 0 ].includes( '<script type="importmap">' ), 'the page has no import map' );
		assert.equal( ( html.match( /<\/script>/g ) || [] ).length, 1, 'one module script' );
		assert.match( html, /offline build: dependencies inlined/ );
		assert.ok( html.length > 3000 * 1024, 'three.js, Rapier, Tweakpane and uqr are bundled in' );
		// The regular files are built too.
		assert.ok( readFileSync( path.join( out, 'style-lab.html' ), 'utf8' ).includes( '<script type="importmap">' ) );

	} finally {

		rmSync( out, { recursive: true, force: true } );

	}

} );
