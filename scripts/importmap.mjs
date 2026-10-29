// Reads the import map from index.html and maps its pinned jsDelivr URLs to the
// matching files in node_modules, so tests can run offline against the exact
// same versions the page loads from the CDN.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './serve.mjs';

const CDN = /^https:\/\/cdn\.jsdelivr\.net\/npm\/((?:@[^/]+\/)?[^@/]+)@([^/]+)\/(.*)$/;

export function readImportMap( file = path.join( ROOT, 'index.html' ) ) {

	const html = readFileSync( file, 'utf8' );
	const match = /<script type="importmap">([\s\S]*?)<\/script>/.exec( html );
	if ( ! match ) throw new Error( `no import map in ${file}` );
	return JSON.parse( match[ 1 ] );

}

/** [{ specifier, url, name, version, path }] for every import-map entry. */
export function importMapPins( map = readImportMap() ) {

	return Object.entries( map.imports ).map( ( [ specifier, url ] ) => {

		const m = CDN.exec( url );
		return m ? { specifier, url, name: m[ 1 ], version: m[ 2 ], path: m[ 3 ] } : { specifier, url, name: null, version: null, path: null };

	} );

}

/** Local file for a jsDelivr URL, or null. Throws if the installed version differs from the pin. */
export function localFileFor( url ) {

	const m = CDN.exec( url.split( '?' )[ 0 ] );
	if ( ! m ) return null;
	const [ , name, version, rest ] = m;
	const dir = path.join( ROOT, 'node_modules', name );
	const pkgFile = path.join( dir, 'package.json' );
	if ( ! existsSync( pkgFile ) ) return null;
	const installed = JSON.parse( readFileSync( pkgFile, 'utf8' ) ).version;
	if ( installed !== version ) throw new Error( `${name}: page pins ${version} but node_modules has ${installed}` );
	const file = path.join( dir, rest );
	return existsSync( file ) ? file : null;

}

/**
 * The import map the built pages ship: the same pins, with three's minified builds (a third
 * of the bytes to download and parse). The dev page keeps the readable files for debugging.
 */
export function distImportMap( map = readImportMap() ) {

	const imports = Object.fromEntries( Object.entries( map.imports ).map( ( [ k, url ] ) => [ k, url.replace( /\/build\/three\.(webgpu|tsl)\.js$/, '/build/three.$1.min.js' ) ] ) );
	return { ...map, imports };

}
