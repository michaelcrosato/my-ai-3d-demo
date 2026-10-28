import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readImportMap } from '../scripts/importmap.mjs';

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

		// The import map in the built file is the one tests pin against.
		const built = JSON.parse( /<script type="importmap">([\s\S]*?)<\/script>/.exec( html )[ 1 ] );
		assert.deepEqual( built, readImportMap() );

		// Dependencies stay external (loaded via the import map), not bundled.
		assert.match( html, /from "three\/webgpu"/ );
		assert.ok( ! /const REVISION = ['"]\d+/.test( html ) && html.length < 1500 * 1024, 'three.js is not bundled in' );
		assert.match( runtime, /export \{/ );
		assert.ok( ! /document\.|window\./.test( runtime ), 'runtime has no DOM access' );

	} finally {

		rmSync( out, { recursive: true, force: true } );

	}

} );
