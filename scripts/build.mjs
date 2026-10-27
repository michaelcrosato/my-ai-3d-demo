// Builds the single-file deliverable (design §7.19):
//   dist/style-lab.html      app bundle + CSS inlined; dependencies load from the CDN via the import map
//   dist/stylelab-runtime.js the style runtime as a standalone ES module
// Usage: node scripts/build.mjs [--out <dir>]

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './serve.mjs';
import { readImportMap } from './importmap.mjs';

const outIndex = process.argv.indexOf( '--out' );
const OUT = outIndex > 0 ? path.resolve( process.argv[ outIndex + 1 ] ) : path.join( ROOT, 'dist' );

const pkg = JSON.parse( await readFile( path.join( ROOT, 'package.json' ), 'utf8' ) );
const git = ( cmd, fallback ) => { try { return execSync( `git ${cmd}`, { cwd: ROOT, stdio: [ 'ignore', 'pipe', 'ignore' ] } ).toString().trim(); } catch { return fallback; } };
const BUILD = { version: pkg.version, commit: git( 'rev-parse --short HEAD', 'nogit' ), date: git( 'log -1 --format=%cI', '' ) };

// Everything the import map resolves stays external; "three/addons/" becomes "three/addons/*".
const external = Object.keys( readImportMap().imports ).map( ( k ) => ( k.endsWith( '/' ) ? `${k}*` : k ) );

async function bundle( entry ) {

	const result = await build( {
		entryPoints: [ path.join( ROOT, entry ) ],
		bundle: true,
		format: 'esm',
		target: 'es2022',
		write: false,
		external,
		define: { __STYLELAB_BUILD__: JSON.stringify( BUILD ) },
		legalComments: 'none',
		charset: 'utf8',
		logLevel: 'warning',
	} );

	return result.outputFiles[ 0 ].text;

}

const template = await readFile( path.join( ROOT, 'index.html' ), 'utf8' );
const css = await readFile( path.join( ROOT, 'src/app/styles.css' ), 'utf8' );
const app = ( await bundle( 'src/app/main.js' ) ).replace( /<\/script/gi, '<\\/script' );
const runtime = await bundle( 'src/runtime/index.js' );

const STYLE_TAG = '<link rel="stylesheet" href="./src/app/styles.css">';
const SCRIPT_TAG = '<script type="module" src="./src/app/main.js"></script>';

for ( const tag of [ STYLE_TAG, SCRIPT_TAG ] ) if ( ! template.includes( tag ) ) throw new Error( `index.html is missing: ${tag}` );

// Function replacements, so "$&"-style sequences in the bundle are not interpreted.
const html = template
	.replace( STYLE_TAG, () => `<style>\n${css}</style>` )
	.replace( SCRIPT_TAG, () => `<script type="module">\n/* Style Lab v${BUILD.version} (${BUILD.commit}) — built from src/, do not edit */\n${app}</script>` );

if ( html.includes( './src/' ) ) throw new Error( 'built HTML still references ./src/' );

await mkdir( OUT, { recursive: true } );
await writeFile( path.join( OUT, 'style-lab.html' ), html );
await writeFile( path.join( OUT, 'stylelab-runtime.js' ), `/* Style Lab runtime v${BUILD.version} (${BUILD.commit}) */\n${runtime}` );

const kb = ( s ) => `${( Buffer.byteLength( s ) / 1024 ).toFixed( 0 )} KB`;
console.log( `built ${path.relative( ROOT, OUT ) || OUT}/style-lab.html (${kb( html )}) and stylelab-runtime.js (${kb( runtime )}) — v${BUILD.version} ${BUILD.commit}` );
