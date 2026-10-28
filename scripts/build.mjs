// Builds the single-file deliverable (design §7.19):
//   dist/style-lab.html      app bundle + CSS inlined; dependencies load from the CDN via the import map
//   dist/stylelab-runtime.js the style runtime as a standalone ES module
//   dist/stylelab-kit.js     the procedural asset kit (and the scenes as examples), importing only three
//   dist/starter.html        the game scaffold wired to both (default looks: the M1 set)
// The tool embeds the runtime, kit and starter template, so its exports work offline from one file.
// Usage: node scripts/build.mjs [--out <dir>]

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './serve.mjs';
import { readImportMap } from './importmap.mjs';

const outIndex = process.argv.indexOf( '--out' );
const OUT = outIndex > 0 ? path.resolve( process.argv[ outIndex + 1 ] ) : path.join( ROOT, 'dist' );

const pkg = JSON.parse( await readFile( path.join( ROOT, 'package.json' ), 'utf8' ) );
const git = ( cmd, fallback ) => { try { return execSync( `git ${cmd}`, { cwd: ROOT, stdio: [ 'ignore', 'pipe', 'ignore' ] } ).toString().trim(); } catch { return fallback; } };
const BUILD = { version: pkg.version, commit: git( 'rev-parse --short HEAD', 'nogit' ), date: git( 'log -1 --format=%cI', '' ) };

// Everything the import map resolves stays external; "three/addons/" becomes "three/addons/*".
const external = Object.keys( readImportMap().imports ).map( ( k ) => ( k.endsWith( '/' ) ? `${k}*` : k ) );

async function bundle( entry, define = {} ) {

	const result = await build( {
		entryPoints: [ path.join( ROOT, entry ) ],
		bundle: true,
		format: 'esm',
		target: 'es2022',
		write: false,
		external,
		define: { __STYLELAB_BUILD__: JSON.stringify( BUILD ), ...define },
		legalComments: 'none',
		charset: 'utf8',
		logLevel: 'warning',
	} );

	return result.outputFiles[ 0 ].text;

}

const template = await readFile( path.join( ROOT, 'index.html' ), 'utf8' );
const css = await readFile( path.join( ROOT, 'src/app/styles.css' ), 'utf8' );
const runtime = `/* Style Lab runtime v${BUILD.version} (${BUILD.commit}) */\n${await bundle( 'src/runtime/index.js' )}`;
const kit = `/* Style Lab kit v${BUILD.version} (${BUILD.commit}): procedural assets, part-tagged, seeded, tiered */\n${await bundle( 'src/export/kit.js' )}`;
const starterTemplate = ( await readFile( path.join( ROOT, 'src/export/starter.html' ), 'utf8' ) ).replace( '/*IMPORTMAP*/', () => JSON.stringify( readImportMap(), null, '\t' ) );
const files = { 'stylelab-runtime.js': runtime, 'stylelab-kit.js': kit, 'starter.html': starterTemplate };
const app = ( await bundle( 'src/app/main.js', { __STYLELAB_FILES__: JSON.stringify( files ) } ) ).replace( /<\/script/gi, '<\\/script' );
const { M1_LOOKS, lookById } = await import( pathToFileURL( path.join( ROOT, 'src/content/looks/index.js' ) ).href );
const starter = starterTemplate.replace( '/*LOOKS*/[]/*END*/', () => JSON.stringify( M1_LOOKS.map( ( id ) => lookById.get( id ) ) ) );

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
await writeFile( path.join( OUT, 'stylelab-runtime.js' ), runtime );
await writeFile( path.join( OUT, 'stylelab-kit.js' ), kit );
await writeFile( path.join( OUT, 'starter.html' ), starter );

const kb = ( s ) => `${( Buffer.byteLength( s ) / 1024 ).toFixed( 0 )} KB`;
console.log( `built ${path.relative( ROOT, OUT ) || OUT}/style-lab.html (${kb( html )}), stylelab-runtime.js (${kb( runtime )}), stylelab-kit.js (${kb( kit )}) and starter.html — v${BUILD.version} ${BUILD.commit}` );
