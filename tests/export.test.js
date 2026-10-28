// M6: export formats round-trip.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LUTCubeLoader } from 'three/addons/loaders/LUTCubeLoader.js';
import { toCube, toGpl } from '../src/runtime/export/files.js';
import { bakeLut, LUT_PRESETS } from '../src/runtime/color/lut.js';

test( '.cube export round-trips through three\'s LUTCubeLoader with low error', () => {

	for ( const preset of Object.keys( LUT_PRESETS ) ) {

		const size = 33;
		const table = bakeLut( preset, size );
		const text = toCube( table, size, { title: preset, bytes: true } );
		const lut = new LUTCubeLoader().parse( text );
		assert.equal( lut.size, size );
		const data = lut.texture3D.image.data;
		let max = 0;
		for ( let i = 0; i < size ** 3; i ++ ) for ( let c = 0; c < 3; c ++ ) {

			const got = data instanceof Uint8Array ? data[ i * 4 + c ] / 255 : data[ i * 4 + c ];
			max = Math.max( max, Math.abs( got - table[ i * 4 + c ] / 255 ) );

		}

		assert.ok( max < 1 / 255 + 1e-6, `${preset}: max error ${max}` );

	}

} );

test( 'GIMP palettes list every color as RGB rows', () => {

	const text = toGpl( [ '#ff0000', '#00ff80', '#123456' ], { name: 'Test', names: [ 'red' ] } );
	assert.match( text, /^GIMP Palette\nName: Test\n/ );
	assert.match( text, /255 {3}0 {3}0\tred/ );
	assert.match( text, / {2}0 255 128\t#00ff80/ );
	assert.equal( text.trim().split( '\n' ).length, 7 );

} );

test( 'stylelab-kit.js builds every kit scene outside the tool with the same triangles', async () => {

	const { execFileSync } = await import( 'node:child_process' );
	const { mkdtempSync, rmSync, mkdirSync } = await import( 'node:fs' );
	const path = await import( 'node:path' );
	const { pathToFileURL } = await import( 'node:url' );
	const ROOT = path.resolve( import.meta.dirname, '..' );
	// Inside node_modules, so the kit's bare `three` import resolves like it would in a project.
	mkdirSync( path.join( ROOT, 'node_modules/.cache' ), { recursive: true } );
	const out = mkdtempSync( path.join( ROOT, 'node_modules/.cache/stylelab-kit-' ) );
	try {

		execFileSync( process.execPath, [ 'scripts/build.mjs', '--out', out ], { cwd: ROOT, stdio: 'pipe' } );
		const kit = await import( pathToFileURL( path.join( out, 'stylelab-kit.js' ) ).href );
		const src = await import( '../src/scenes/index.js' );
		assert.equal( kit.scenes.length, src.SCENES.length );
		for ( const scene of src.SCENES ) for ( const tier of [ 0, 1, 2, 3 ] ) {

			const a = src.buildScene( scene, { tier } ).triangles;
			const b = kit.buildScene( kit.sceneById.get( scene.id ), { tier } ).triangles;
			assert.equal( b, a, `${scene.id} T${tier}` );

		}

		// Individual builders too, e.g. a house and a character at every tier.
		for ( const tier of [ 0, 1, 2, 3 ] ) {

			const colors = { wall: '#ffffff', roof: '#cc3333', trim: '#ffffff', door: '#664422' };
			assert.equal( kit.countTriangles( kit.house( tier, colors ) ), ( await import( '../src/scenes/kit/index.js' ) ).countTriangles( ( await import( '../src/scenes/kit/index.js' ) ).house( tier, colors ) ) );

		}

	} finally {

		rmSync( out, { recursive: true, force: true } );

	}

} );

test( 'runtime/editor boundary: the runtime imports nothing from the app and never touches the DOM', async () => {

	const { readdirSync, readFileSync, statSync } = await import( 'node:fs' );
	const path = await import( 'node:path' );
	const dir = path.resolve( import.meta.dirname, '../src/runtime' );
	const files = [];
	const walk = ( d ) => { for ( const f of readdirSync( d ) ) { const p = path.join( d, f ); if ( statSync( p ).isDirectory() ) walk( p ); else if ( p.endsWith( '.js' ) ) files.push( p ); } };
	walk( dir );
	assert.ok( files.length > 30 );
	for ( const f of files ) {

		const src = readFileSync( f, 'utf8' );
		assert.ok( ! /from '(\.\.\/)+(app|content|scenes)\//.test( src ), `${path.relative( dir, f )} imports app, content or scene code` );
		assert.ok( ! /\b(document|window|localStorage)\./.test( src ), `${path.relative( dir, f )} touches the DOM` );

	}

	const api = await import( '../src/runtime/index.js' );
	for ( const name of [ 'createStyle', 'StyleRuntime', 'generateBrief', 'toCube', 'resolveRecipe', 'zoneWeights', 'tagMeshes', 'validateLook' ] ) assert.equal( typeof api[ name ], 'function', name );

} );
