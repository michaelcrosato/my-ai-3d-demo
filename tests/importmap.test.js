import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importMapPins, localFileFor } from '../scripts/importmap.mjs';

const pkg = JSON.parse( readFileSync( new URL( '../package.json', import.meta.url ), 'utf8' ) );
const pins = importMapPins();

test( 'every import-map entry is an exact-version jsDelivr URL', () => {

	for ( const p of pins ) {

		assert.ok( p.name, `${p.specifier} is not a jsDelivr npm URL: ${p.url}` );
		assert.match( p.version, /^\d+\.\d+\.\d+$/, `${p.specifier} must pin an exact version` );

	}

} );

test( 'import-map versions match package.json devDependencies (tests use the same files)', () => {

	for ( const p of pins ) assert.equal( pkg.devDependencies[ p.name ], p.version, `${p.name}: import map ${p.version} vs package.json ${pkg.devDependencies[ p.name ]}` );

} );

test( 'design stack pins: three r182 and Rapier 0.19.3', () => {

	assert.equal( pins.find( ( p ) => p.specifier === 'three/webgpu' ).version, '0.182.0' );
	assert.equal( pins.find( ( p ) => p.specifier === '@dimforge/rapier3d-compat' ).version, '0.19.3' );

} );

test( 'every pinned file exists in node_modules', () => {

	for ( const p of pins.filter( ( x ) => ! x.specifier.endsWith( '/' ) ) ) assert.ok( localFileFor( p.url ), `missing local file for ${p.url}` );

} );
