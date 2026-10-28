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
	{ name: 'dist · http · WebGL2', url: ( base ) => `${base}/dist/style-lab.html?backend=webgl`, backend: 'WebGL2', m1: true, m3: true, m4: true, sweep: true, gallery: 'm4-gallery.png' },
	{ name: 'dist · http · WebGPU', url: ( base ) => `${base}/dist/style-lab.html`, backend: 'WebGPU', screenshot: 'm4-webgpu.png', panel: true, m1: true, m3: true, m4: true, sweep: [ 'lookdev', 'harbor' ], sheet: 'm4-contact.png', effects: 'm3-effects.png' },
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

// The detailed M1 checks (hold, determinism) run on the M1 looks; every library look is
// covered by the M4 sweep.
const M1_LOOKS = [ 'sea-breeze', 'graffiti-rush', 'golden-hour', 'phone-safe-toon' ];

/**
 * M1 and M2 acceptance checks (design §8 numeric image checks, §9 M1–M2), all numeric:
 * every scene × M1 look renders and differs from plain, hold compare shows exactly the
 * baseline, the Plain look matches the baseline, strength 0 equals the neutral look,
 * sliders never rebuild, switches rebuild only what they affect, tiers keep the camera.
 */
async function m1Checks( page, fail, run ) {

	const out = await page.evaluate( async ( m1Looks ) => {

		const s = window.__stylelab;
		const res = { cells: [], checks: [] };
		const check = ( name, pass, value ) => res.checks.push( { name, pass, value } );
		const cap = async () => ( await s.capture( { width: 320, height: 180 } ) );
		s.freeze( 1 );

		for ( const scene of s.scenes() ) {

			await s.setScene( scene.id, { tier: 1 } );
			await s.applyLook( 'plain' );
			const styledPlain = await cap();
			s.compare( 'hold', { on: true } );
			const baseline = await cap();
			s.compare( 'hold', { on: false } );
			const camAt = () => JSON.stringify( [ ...s.app.camera.position.toArray(), s.app.camera.fov ].map( ( v ) => +v.toFixed( 3 ) ) );
			const baseCam = camAt();
			check( `${scene.id}: Plain look matches the baseline set`, s.diff( styledPlain.id, baseline.id ).mae < 0.02, s.diff( styledPlain.id, baseline.id ).mae );

			for ( const look of s.looks().filter( ( l ) => m1Looks.includes( l.id ) ) ) {

				await s.applyLook( look.id );
				const a = await cap();
				s.compare( 'hold', { on: true } );
				const held = await cap();
				s.compare( 'hold', { on: false } );
				// A look with its own lens moves the shared camera, so the baseline image moves too.
				const sameCamera = camAt() === baseCam;
				const differs = s.diff( a.id, held.id ).mae, holdErr = sameCamera ? s.diff( held.id, baseline.id ).mae : null;
				res.cells.push( { scene: scene.id, look: look.id, meanLuma: a.stats.meanLuma, lumaStd: a.stats.lumaStd, differs, holdErr } );
				check( `${scene.id} × ${look.id}: not blank`, a.stats.lumaStd > 0.03 && a.stats.meanLuma > 0.05 && a.stats.meanLuma < 0.95, a.stats );
				check( `${scene.id} × ${look.id}: differs from plain`, differs > 0.03, differs );
				if ( sameCamera ) check( `${scene.id} × ${look.id}: hold compare shows exactly the baseline`, holdErr < 0.004, holdErr );

			}

			// Determinism (M2): rebuilding the scene gives the same triangles and the same frame.
			const tris = s.info().triangles;
			await s.setScene( scene.id, { tier: 1 } );
			await s.applyLook( 'plain' );
			const again = await cap();
			check( `${scene.id}: rebuild is deterministic (triangles, capture hash)`, s.info().triangles === tris && again.hash === styledPlain.hash, [ tris, s.info().triangles, styledPlain.hash, again.hash ] );

		}

		// Strength 0 renders the same as that look's neutral version, applied directly.
		await s.setScene( 'lookdev', { tier: 1 } );
		await s.applyLook( 'sea-breeze' );
		const before = s.info();
		s.setStrength( 0 );
		check( 'strength slider never rebuilds', s.info().materialBuilds === before.materialBuilds && s.info().graphBuilds === before.graphBuilds, s.info().lastRebuild );
		const zero = await cap();
		const r = s.getResolvedLook();
		s.setStrength( 1 );
		const params = { ...r.global };
		await s.applyLook( { schema: 'stylelab.look@1', id: 'neutral-test', name: 'Neutral (test)', params, parts: Object.fromEntries( Object.entries( r.parts ).map( ( [ p, v ] ) => [ p, { params: v } ] ) ) } );
		const neutral = await cap();
		check( 'strength 0 equals the neutral look', s.diff( zero.id, neutral.id ).mae < 0.004, s.diff( zero.id, neutral.id ).mae );

		// Sliders are uniforms; switches rebuild only what they affect.
		await s.applyLook( 'sea-breeze' );
		for ( const [ id, v ] of [ [ 'atmosphere.fog.density', 0.02 ], [ 'surface.softness', 0.2 ], [ 'grade.contrast', 1.3 ], [ 'lines.hull.thickness', 3 ], [ 'lighting.key.elevation', 20 ], [ 'palette.saturation', 0.5 ] ] ) s.setParam( id, v );
		const i1 = s.info();
		check( 'sliders never rebuild', i1.materialBuilds === i0.materialBuilds && i1.graphBuilds === i0.graphBuilds && i1.passBuilds === i0.passBuilds, [ i0, i1 ].map( ( i ) => [ i.materialBuilds, i.graphBuilds, i.passBuilds ] ) );
		const bloom = s.setParam( 'lens.bloom.enabled', false );
		check( 'bloom switch rebuilds only the post graph', bloom.graph && ! bloom.pass && bloom.parts.length === 0, bloom );
		const flat = s.setParam( 'surface.flatNormals', true );
		check( 'flat-normals switch rebuilds only materials', flat.parts.length > 0 && ! flat.graph && ! flat.pass, flat );
		const ink = s.setParam( 'lines.screen.enabled', true );
		check( 'ink switch rebuilds the scene pass and graph, not materials', ink.pass && ink.graph && ink.parts.length === 0, ink );
		const inked = await cap();
		check( 'ink renders', inked.stats.lumaStd > 0.03, inked.stats );
		s.app.actions.resetParams();

		// Tiers change geometry, not the camera.
		await s.setScene( 'harbor', { tier: 0 } );
		const cam0 = s.app.camera.position.toArray().map( ( v ) => +v.toFixed( 4 ) );
		const tris = [];
		for ( const t of [ 0, 1, 2, 3 ] ) { await s.setTier( t ); tris.push( s.info().triangles ); }
		const cam1 = s.app.camera.position.toArray().map( ( v ) => +v.toFixed( 4 ) );
		check( 'tiers add geometry', tris.every( ( n, i ) => i === 0 || n > tris[ i - 1 ] ), tris );
		check( 'tiers keep the camera', JSON.stringify( cam0 ) === JSON.stringify( cam1 ), [ cam0, cam1 ] );
		const detailed = await cap();
		check( 'Detailed tier renders', detailed.stats.lumaStd > 0.03, detailed.stats );
		await s.setTier( 1 );

		// Density (M2): more props at ×2, same camera, back to the same triangles at ×1.
		await s.setScene( 'garden', { tier: 1 } );
		const camG = s.app.camera.position.toArray().join();
		const t1 = s.info().triangles;
		await s.setDensity( 2 );
		const t2 = s.info().triangles;
		await s.setDensity( 1 );
		check( 'density adds props and keeps the camera', t2 > t1 && s.info().triangles === t1 && s.app.camera.position.toArray().join() === camG, [ t1, t2, s.info().triangles ] );

		// Benefit matrix (M2): a 2×2 PNG.
		const matrix = await s.benefitMatrix( { cell: [ 160, 90 ] } );
		check( 'benefit matrix renders', matrix.startsWith( 'data:image/png' ) && matrix.length > 5000, matrix.length );

		// .glb import (M2): export a named test scene in the page, import it, check the guesses, restyle.
		const THREE = await import( 'three/webgpu' );
		const { GLTFExporter } = await import( 'three/addons/exporters/GLTFExporter.js' );
		const test = new THREE.Scene();
		const add = ( name, geo, color, extra = {}, parent = test ) => { const m = new THREE.Mesh( geo, new THREE.MeshStandardMaterial( { color, ...extra } ) ); m.name = name; parent.add( m ); return m; };
		add( 'Plane', new THREE.PlaneGeometry( 40, 40 ).rotateX( - Math.PI / 2 ), '#7a9a5a' );
		add( 'House_Walls', new THREE.BoxGeometry( 4, 3, 4 ), '#e8d8b8' ).position.set( 0, 1.5, 0 );
		add( 'Oak_Leaves', new THREE.SphereGeometry( 1.5, 16, 12 ), '#4f8f3a' ).position.set( 6, 3, 1 );
		add( 'Lantern', new THREE.SphereGeometry( 0.3, 12, 8 ), '#ffe0a0', { emissive: '#ffb040', emissiveIntensity: 2 } ).position.set( 2.5, 1.2, 2.5 );
		const player = new THREE.Group(); player.name = 'Player'; test.add( player );
		add( 'Mesh', new THREE.CapsuleGeometry( 0.4, 1, 4, 12 ), '#3d7fd6', {}, player ).position.set( - 3, 0.9, 3 );
		add( 'Crate', new THREE.BoxGeometry( 1, 1, 1 ), '#b0844f' ).position.set( 3, 0.5, - 3 );
		const glb = await new GLTFExporter().parseAsync( test, { binary: true } );
		const imp = await s.importModel( glb, 'smoke-test.glb' );
		const parts = imp.guesses.map( ( g ) => g.part ).join( ',' );
		check( 'import guesses sensible parts', parts === 'terrain,architecture,foliage,vfx,hero,props', parts );
		await s.applyLook( 'plain' );
		const ip = await cap();
		await s.applyLook( 'graffiti-rush' );
		const is = await cap();
		check( 'imported model can be restyled', s.diff( ip.id, is.id ).mae > 0.03 && ip.stats.lumaStd > 0.02, s.diff( ip.id, is.id ).mae );
		const hit = s.app.actions.pick( 0, 0 );
		check( 'pick tool finds a part under the cursor', !! hit && !! hit.part, hit && [ hit.name, hit.part ] );
		await s.setScene( 'harbor', { tier: 1 } );
		s.freeze( null );
		return res;

	}, M1_LOOKS );

	for ( const c of out.checks ) if ( ! c.pass ) fail( `M1: ${c.name} (${JSON.stringify( c.value )})` );

	if ( run.sheet ) {

		const url = await page.evaluate( ( looks ) => window.__stylelab.contactSheet( { tier: 1, looks } ), [ 'plain', ...M1_LOOKS ] );
		await mkdir( ARTIFACTS, { recursive: true } );
		await writeFile( path.join( ARTIFACTS, run.sheet ), Buffer.from( url.split( ',' )[ 1 ], 'base64' ) );

	}

	return out;

}

/**
 * M3 acceptance checks (design §9 M3): every effect demo renders without errors and
 * changes the image; pixel looks stay grid-locked (blocky, and a pan by whole pixels
 * shifts the image exactly); the new sliders never rebuild.
 */
async function m3Checks( page, fail, run ) {

	const out = await page.evaluate( async ( keepSheet ) => {

		const s = window.__stylelab;
		const res = { checks: [] };
		const check = ( name, pass, value ) => res.checks.push( { name, pass, value } );

		const sheet = await s.effectSheet( { cell: [ 320, 180 ] } );
		for ( const c of sheet.cells ) check( `${c.cell} ${c.id}: renders without errors and changes the image`, c.ok, { diff: +c.diff.toFixed( 4 ), min: c.minDiff, errors: c.errors } );
		res.cells = sheet.cells.map( ( c ) => ( { cell: c.cell, id: c.id, diff: +c.diff.toFixed( 4 ) } ) );
		if ( keepSheet ) res.sheet = sheet.url;

		// Pixel grid: 640 × 361 at 120 rows → 3 px pixels, the grid doesn't divide the height.
		s.freeze( 1 );
		await s.setScene( 'lookdev', { tier: 1 } );
		await s.applyLook( 'phone-safe-toon' );
		const grid = { 'retro.pixel.enabled': true, 'retro.pixel.height': 120, 'retro.pixel.edges': 0.5, 'lens.vignette.amount': 0, 'retro.quantize.mode': 'palette', 'retro.quantize.palette': 'pico8', 'retro.dither.amount': 0 };
		for ( const [ k, v ] of Object.entries( grid ) ) s.setParam( k, v );
		const W = 640, H = 361, p = 3;
		const a = await s.capture( { width: W, height: H } );
		const b = await s.capture( { width: W, height: H, viewOffset: [ 4 * p, 0 ] } );
		const c = await s.capture( { width: W, height: H, viewOffset: [ 0, 2 * p ] } );
		const blocky = s.blockError( a.id, p );
		check( 'pixel look: every 3 × 3 block is one color', blocky < 0.002, blocky );
		const panX = s.diff( a.id, b.id, { shift: [ 4 * p, 0 ] } ).mae, panY = s.diff( a.id, c.id, { shift: [ 0, 2 * p ] } ).mae;
		check( 'pixel look: a pan by whole pixels shifts the image exactly', panX < 0.001 && panY < 0.001, [ panX, panY ] );
		const offGrid = await s.capture( { width: W, height: H, viewOffset: [ 4 * p + 1, 0 ] } );
		check( 'pixel look: a sub-pixel pan snaps to the grid (still blocky)', s.blockError( offGrid.id, p ) < 0.002, s.blockError( offGrid.id, p ) );
		s.app.actions.resetParams();

		// New M3 sliders are uniforms.
		await s.applyLook( 'golden-hour' );
		for ( const [ k, v ] of Object.entries( { 'lens.dof.enabled': true, 'grade.lut.enabled': true, 'retro.crt.enabled': true, 'lighting.ao.enabled': true, 'media.kuwahara.enabled': true, 'lines.screen.enabled': true, 'surface.variation.enabled': true, 'media.paper.enabled': true } ) ) s.setParam( k, v );
		for ( const [ k, v ] of Object.entries( {
			'lens.dof.range': 4, 'lens.dof.blur': 2, 'grade.lut.amount': 0.5, 'grade.lut.preset': 'bleach', 'retro.crt.scanlines': 0.8, 'lighting.ao.radius': 1.5, 'grade.lift': 0.05, 'grade.hue': 30, 'lighting.tod.hour': 18, 'lens.letterbox.amount': 0.5, 'retro.dither.amount': 0.3,
			'media.kuwahara.radius': 3, 'lines.screen.wobble': 2, 'motion.boil.fps': 8, 'lines.screen.texture': 'pencil', 'surface.variation.amount': 0.2, 'media.paper.type': 'kraft', 'atmosphere.clouds.amount': 0.8, 'atmosphere.heightFog.density': 0.05, 'surface.wind.strength': 2, 'surface.water.depth': 6,
		} ) ) s.setParam( k, v );
		const i1 = s.info();
		check( 'M3 sliders never rebuild', i1.materialBuilds === i0.materialBuilds && i1.graphBuilds === i0.graphBuilds && i1.passBuilds === i0.passBuilds, [ i0, i1 ].map( ( i ) => [ i.materialBuilds, i.graphBuilds, i.passBuilds ] ) );
		const snap = s.setParam( 'retro.vertexSnap.enabled', true );
		check( 'vertex snap rebuilds only materials', snap.parts.length > 0 && ! snap.graph && ! snap.pass, snap );
		const aa = s.setParam( 'quality.aa', 'smaa' );
		check( 'an AA switch rebuilds only the post graph', aa.graph && aa.parts.length === 0, aa );
		s.app.actions.resetParams();
		s.freeze( null );
		return res;

	}, !! run.effects );

	for ( const c of out.checks ) if ( ! c.pass ) fail( `M3: ${c.name} (${JSON.stringify( c.value )})` );

	if ( run.effects && out.sheet ) {

		await mkdir( ARTIFACTS, { recursive: true } );
		await writeFile( path.join( ARTIFACTS, run.effects ), Buffer.from( out.sheet.split( ',' )[ 1 ], 'base64' ) );
		delete out.sheet;

	}

	return out;

}

/**
 * M4 acceptance checks (design §9 M4): the library sweep (every scene × look renders and
 * differs from plain), transitions land exactly on the target, a painterly terrain with
 * inked characters and a plain sky renders with masks that stay in their parts, isolate,
 * share links reproduce the state, coherence fixes, undo, and gallery previews.
 */
async function m4Checks( page, fail, run ) {

	const out = await page.evaluate( async ( sweepScenes ) => {

		const s = window.__stylelab;
		const res = { checks: [], sweep: [] };
		const check = ( name, pass, value ) => res.checks.push( { name, pass, value } );
		const cap = ( w = 320, h = 180 ) => s.capture( { width: w, height: h } );
		s.freeze( 1 );

		const looks = s.looks();
		check( 'library has 20+ looks', looks.length >= 20, looks.length );

		// Sweep: every look on every scene (or the scenes given) renders and differs from plain.
		for ( const scene of s.scenes().filter( ( x ) => ! sweepScenes || sweepScenes.includes( x.id ) ) ) {

			await s.setScene( scene.id, { tier: 1 } );
			await s.applyLook( 'plain' );
			const plain = await cap( 192, 108 );
			for ( const look of looks.filter( ( l ) => l.id !== 'plain' ) ) {

				await s.applyLook( look.id );
				const a = await cap( 192, 108 );
				const differs = s.diff( plain.id, a.id ).mae;
				res.sweep.push( { scene: scene.id, look: look.id, luma: +a.stats.meanLuma.toFixed( 3 ), std: +a.stats.lumaStd.toFixed( 3 ), differs: +differs.toFixed( 4 ) } );
				check( `${scene.id} × ${look.id}: renders (not blank) and differs from plain`, a.stats.lumaStd > 0.025 && a.stats.meanLuma > 0.04 && a.stats.meanLuma < 0.96 && differs > 0.02, { stats: a.stats, differs } );

			}

		}

		// Transitions land exactly on the target (frozen clock; tick drives them).
		await s.setScene( 'lookdev', { tier: 1 } );
		await s.applyLook( 'noir' );
		const target = await cap();
		await s.applyLook( 'sea-breeze' );
		const from = await cap();
		for ( const type of [ 'morph', 'crossfade', 'wipe' ] ) {

			s.setTransition( { type, duration: 1 } );
			await s.applyLook( 'sea-breeze' );
			await s.applyLook( 'noir', { transition: true } );
			s.tick( 0.5 );
			const mid = await cap();
			const midFrom = s.diff( from.id, mid.id ).mae, midTo = s.diff( target.id, mid.id ).mae;
			check( `${type}: mid-way differs from both ends`, midFrom > 0.005 && midTo > 0.005, [ midFrom, midTo ] );
			s.tick( 0.6 );
			const end = await cap();
			const err = s.diff( target.id, end.id ).mae;
			check( `${type}: lands exactly on the target`, err < 0.001 && ! s.app.transition, err );

		}

		s.setTransition( { type: 'morph', duration: 0.6 } );

		// Per-part: painterly terrain, inked characters, plain sky (design §9 M4 acceptance).
		await s.setScene( 'garden', { tier: 1 } );
		await s.applyLook( 'comic-ink' );
		const global = await cap();
		await s.setParts( { terrain: { look: 'painterly', modules: [ 'surface', 'palette', 'media', 'lines' ] }, sky: { look: 'plain', modules: [ 'surface', 'palette', 'media', 'lines' ] } } );
		const mixed = await cap();
		const effects = s.app.runtime.activeEffects();
		check( 'parts: painterly terrain + inked characters + plain sky renders', mixed.stats.lumaStd > 0.03 && s.diff( global.id, mixed.id ).mae > 0.01, { stats: mixed.stats, diff: s.diff( global.id, mixed.id ).mae } );
		check( 'parts: kuwahara runs, masked to the terrain', effects.includes( 'media.kuwahara' ) && s.app.runtime.graphKey.includes( 'media.kuwahara@mask' ), [ effects, s.app.runtime.graphKey ] );
		const p0 = s.info();
		s.app.actions.setParam( 'lines.screen.thickness', 3, { part: 'characters' } );
		s.app.actions.setParam( 'surface.softness', 0.4, { part: 'terrain' } );
		s.app.actions.setParam( 'palette.saturation', 0.6, { part: 'foliage' } );
		const p1 = s.info();
		check( 'parts: part sliders never rebuild', p1.graphBuilds === p0.graphBuilds && p1.passBuilds === p0.passBuilds && p1.materialBuilds === p0.materialBuilds, [ p0, p1 ].map( ( i ) => [ i.materialBuilds, i.graphBuilds, i.passBuilds ] ) );
		const thick = await cap();
		check( 'parts: per-part line weight changes the image', s.diff( mixed.id, thick.id ).mae > 0.002, s.diff( mixed.id, thick.id ).mae );
		await s.setParts( {} );
		const back = await cap();
		check( 'parts: clearing the parts returns to the global look exactly', s.diff( global.id, back.id ).mae < 0.001, s.diff( global.id, back.id ).mae );

		// Masks stay in their parts: halftone on the sky only leaves the lower frame (the floor) alone.
		await s.setScene( 'lookdev', { tier: 1 } );
		await s.applyLook( 'sea-breeze' );
		const plainSky = await cap();
		const dots = { 'media.halftone.amount': 1, 'media.halftone.size': 8 };
		s.app.actions.setParam( 'media.halftone.enabled', true, { part: 'sky' } );
		for ( const [ k, v ] of Object.entries( dots ) ) s.app.actions.setParam( k, v, { part: null } );
		const skyOnly = await cap();
		await s.setParts( {} );
		s.app.actions.setParam( 'media.halftone.enabled', true );
		const everywhere = await cap();
		s.app.actions.resetParams();
		const low = { rect: [ 0.1, 0.75, 0.9, 1 ] };
		const leak = s.diff( plainSky.id, skyOnly.id, low ).mae, full = s.diff( plainSky.id, everywhere.id, low ).mae;
		check( 'parts: a sky-only effect stays off the ground', leak < full * 0.2 && full > 0.004, { leak, full } );

		// Isolate dims every other part; ending it restores the frame exactly.
		const iso0 = await cap();
		s.app.actions.setIsolate( 'characters' );
		const iso = await cap();
		s.app.actions.setIsolate( null );
		const iso1 = await cap();
		check( 'isolate dims the rest and restores exactly', s.diff( iso0.id, iso.id ).mae > 0.05 && s.diff( iso0.id, iso1.id ).mae < 0.001, [ s.diff( iso0.id, iso.id ).mae, s.diff( iso0.id, iso1.id ).mae ] );

		// Share links reproduce the whole state: recipe, parts, tweaks, scene.
		await s.setScene( 'plaza', { tier: 1 } );
		await s.setRecipe( { base: 'golden-hour', modules: { lines: { from: 'comic-ink' }, grade: { blend: { with: 'noir', t: 0.4 } } } } );
		await s.setParts( { foliage: { look: 'watercolor', modules: [ 'surface', 'palette' ] } } );
		s.setParam( 'grade.contrast', 1.2 );
		const shared = await cap();
		const sharedHash = s.resolvedHash();
		const link = await s.shareHash();
		await s.setScene( 'harbor', { tier: 0 } );
		await s.setParts( {} );
		await s.applyLook( 'plain' );
		await s.openShare( link );
		const opened = await cap();
		check( 'share link reproduces the state', s.resolvedHash() === sharedHash && s.diff( shared.id, opened.id ).mae < 0.001 && s.app.store.get().sceneId === 'plaza', { hash: [ sharedHash, s.resolvedHash() ], diff: s.diff( shared.id, opened.id ).mae, length: link.length } );

		// Coherence: two media fire a warning with a working one-click fix.
		await s.setParts( {} );
		await s.applyLook( 'painterly' );
		s.setParam( 'media.halftone.enabled', true );
		s.setParam( 'media.halftone.amount', 1 );
		const warn = s.coherence().find( ( w ) => w.id === 'two-media' );
		if ( warn ) s.app.actions.applyOverrides( warn.fix );
		check( 'coherence flags two media and fixes it in one click', !! warn && ! s.coherence().some( ( w ) => w.id === 'two-media' ), warn && warn.fix );
		s.app.actions.resetParams();

		// Undo / redo walk the recipe history.
		await s.applyLook( 'noir' );
		await s.applyLook( 'synthwave' );
		s.undo();
		const undone = s.app.store.get().recipe.base;
		s.redo();
		check( 'undo and redo restore looks', undone === 'noir' && s.app.store.get().recipe.base === 'synthwave', [ undone, s.app.store.get().recipe.base ] );

		s.freeze( null );
		return res;

	}, run.sweep === true ? null : run.sweep );

	for ( const c of out.checks ) if ( ! c.pass ) fail( `M4: ${c.name} (${JSON.stringify( c.value )})` );

	// Gallery previews: one thumbnail per family, rendered through the real button.
	if ( run.gallery ) {

		await page.click( '.gallery-foot button' );
		await page.waitForFunction( () => ! document.querySelector( '.gallery-foot button' ).disabled, null, { timeout: 600000 } );
		const g = await page.evaluate( () => ( { thumbs: document.querySelectorAll( '.look-card img.thumb' ).length, cards: document.querySelectorAll( '.look-card' ).length } ) );
		if ( ! ( g.thumbs === g.cards && g.cards >= 15 ) ) fail( `M4: gallery previews (${JSON.stringify( g )})` );
		out.gallery = g;
		await mkdir( ARTIFACTS, { recursive: true } );
		await page.screenshot( { path: path.join( ARTIFACTS, run.gallery ) } );

	}

	return out;

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
		result.frame = ( await page.evaluate( () => window.__stylelab.capture() ) ).stats;
		if ( ! ( result.frame.lumaStd > 0.02 && result.frame.meanLuma > 0.05 && result.frame.meanLuma < 0.95 ) ) fail( `frame looks blank: ${JSON.stringify( result.frame )}` );
		result.stats = await page.evaluate( () => window.__stylelab.frameStats() );

		if ( run.screenshot ) {

			await mkdir( ARTIFACTS, { recursive: true } );
			await page.screenshot( { path: path.join( ARTIFACTS, run.screenshot ) } );

		}

		if ( run.m1 && ! flag( '--no-m1' ) ) result.m1 = await m1Checks( page, fail, run );
		if ( run.m3 && ! flag( '--no-m3' ) ) result.m3 = await m3Checks( page, fail, run );
		if ( run.m4 && ! flag( '--no-m4' ) ) result.m4 = await m4Checks( page, fail, run );

		if ( ! flag( '--no-spikes' ) ) {

			const iterations = Number( value( '--rebuild-iterations' ) ) || undefined;
			result.spikes = await page.evaluate( ( o ) => window.__stylelab.runSpikes( null, o ), { rebuildIterations: iterations } );
			for ( const s of result.spikes ) if ( s.status === 'error' || s.status === 'no-go' ) fail( `spike ${s.id} ${s.key}: ${s.status}` );

		}

		// Drive the Verify panel through its real buttons and read the report it builds.
		if ( run.panel ) {

			await page.click( '#verify-btn' );
			await page.click( '.check[data-id="M4-01"] [data-status="pass"]' );
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
