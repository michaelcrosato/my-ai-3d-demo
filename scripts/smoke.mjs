// Smoke test (design §8): boots the app in headless Chromium on several targets,
// checks for errors and a non-blank frame, and runs the spikes. CDN requests are
// served from node_modules (same pinned versions), so it runs offline.
//
//   node scripts/smoke.mjs [--only <text>] [--checks m1,m3,m4,m5,m6,m7,m8,m9,m10] [--no-spikes] [--rebuild-iterations N]
//
// Needs Playwright with Chromium: `npm i -D playwright && npx playwright install chromium`
// (already present in the cloud container). Headless WebGPU uses SwiftShader.

import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { startServer, ROOT } from './serve.mjs';
import { localFileFor } from './importmap.mjs';
import { testGlb } from './fixtures.mjs';

const { chromium } = createRequire( import.meta.url )( 'playwright' );

const argv = process.argv.slice( 2 );
const flag = ( name ) => argv.includes( name );
const value = ( name ) => { const i = argv.indexOf( name ); return i >= 0 ? argv[ i + 1 ] : null; };

const ARTIFACTS = path.join( ROOT, 'artifacts' );
const CHROMIUM_ARGS = [ '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--enable-unsafe-swiftshader' ];
const distFile = pathToFileURL( path.join( ROOT, 'dist/style-lab.html' ) ).href;
// Built by `npm run smoke` (build --offline); not committed.
const offlineFile = pathToFileURL( path.join( ROOT, 'dist/style-lab-offline.html' ) ).href;

const RUNS = [
	{ name: 'dev  · http · WebGL2', url: ( base ) => `${base}/index.html?backend=webgl`, backend: 'WebGL2' },
	{ name: 'dist · http · WebGL2', url: ( base ) => `${base}/dist/style-lab.html?backend=webgl`, backend: 'WebGL2', m1: true, m3: true, m4: true, m5: true, m6: true, m7: true, m8: true, m9: true, m10: true, sweep: true, gallery: 'm4-gallery.png' },
	{ name: 'dist · http · WebGPU', url: ( base ) => `${base}/dist/style-lab.html`, backend: 'WebGPU', screenshot: 'm9-webgpu.png', panel: true, m1: true, m3: true, m4: true, m5: true, m6: true, m7: true, m8: true, m9: true, m10: true, sweep: [ 'lookdev', 'harbor', 'tabletop', 'alley' ], sheet: 'm9-contact.png', effects: 'm3-effects.png' },
	{ name: 'dist · file · WebGL2', url: () => `${distFile}?backend=webgl`, backend: 'WebGL2' },
	{ name: 'dist · file · auto  ', url: () => distFile, backend: null },
	// The offline build (P2): every CDN request is refused, so it must start without the network.
	{ name: 'offline · file · WebGL2', url: () => `${offlineFile}?backend=webgl`, backend: 'WebGL2', offline: true },
].filter( ( r ) => ! value( '--only' ) || r.name.includes( value( '--only' ) ) );

// --checks m4,m5 runs exactly those milestone checks on the selected runs (handy with --only dev).
if ( value( '--checks' ) ) for ( const r of RUNS ) for ( const m of [ 'm1', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10' ] ) r[ m ] = value( '--checks' ).split( ',' ).includes( m );

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
		const i0 = s.info();
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
		const i0 = s.info();
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

/** A scriptable standard-mapping pad (Xbox ids), installed before the app boots. */
function fakeGamepad() {

	const buttons = Array.from( { length: 17 }, () => ( { pressed: false, touched: false, value: 0 } ) );
	// The actuator records effects, so the rumble on look change can be checked (M10).
	window.__rumbles = [];
	const vibrationActuator = { type: 'dual-rumble', playEffect: ( type ) => { window.__rumbles.push( type ); return Promise.resolve( 'complete' ); } };
	const pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [ 0, 0, 0, 0 ], buttons, vibrationActuator };
	window.__fakePad = pad;
	navigator.getGamepads = () => [ pad, null, null, null ];

}


/**
 * M10 acceptance checks (the P2 scope, v1.1): the new scenes render at every tier and the
 * alley's rain stays out of the baseline; the new sliders are uniforms and the new switches
 * rebuild only what they affect; low frame-rate rendering holds frames within a slot while
 * hold-to-compare still swaps at once; per-part fog and stepping; .cube import; what
 * changed; randomize; the zip; touch controls; rumble and D-pad focus in panels; and a
 * .glb with a KTX2 texture and an animated morph target.
 */
async function m10Checks( page, fail ) {

	const glb = Buffer.from( await testGlb() ).toString( 'base64' );
	const out = await page.evaluate( async ( glb64 ) => {

		const s = window.__stylelab, app = s.app, pad = window.__fakePad;
		const res = { checks: [] };
		const check = ( name, pass, value ) => res.checks.push( { name, pass, value } );
		const progress = ( text ) => console.log( `[progress] M10 ${text}` );
		const frames = ( n = 3 ) => new Promise( ( r ) => { let k = 0; const f = () => ( ++ k >= n ? r() : requestAnimationFrame( f ) ); requestAnimationFrame( f ); } );
		const cap = ( w = 320, h = 180 ) => s.capture( { width: w, height: h } );
		const rebuilds = ( i ) => [ i.materialBuilds, i.graphBuilds, i.passBuilds, i.skyBuilds ];
		s.freeze( 1 );

		progress( 'scenes' );
		for ( const id of [ 'tabletop', 'alley' ] ) for ( const tier of [ 0, 3 ] ) {

			await s.setScene( id, { tier } );
			await s.applyLook( 'sea-breeze' );
			const a = await cap();
			check( `${id} T${tier}: renders`, a.stats.lumaStd > 0.03 && a.stats.meanLuma > 0.04 && a.stats.meanLuma < 0.96, a.stats );

		}

		await s.setScene( 'alley', { tier: 1 } );
		await s.applyLook( 'plain' );
		check( 'alley: the plain baseline has no rain', ! app.runtime.particles.object.visible );
		await s.applyLook( 'noir' );
		check( 'alley: a styled look has the scene\'s rain', app.runtime.particles.object.visible && app.runtime.particles.object.count > 1000, app.runtime.particles.object.count );

		progress( 'uniforms and rebuilds' );
		await s.setScene( 'lookdev', { tier: 1 } );
		await s.applyLook( 'golden-hour' );
		for ( const id of [ 'lens.flare.enabled', 'lens.anamorphic.enabled', 'lens.afterimage.enabled', 'grade.sepia.enabled', 'grade.bleach.enabled', 'media.sharpen.enabled', 'retro.vhs.enabled', 'motion.speedLines.enabled', 'lines.sobel.enabled', 'lines.highlight.enabled', 'atmosphere.particles.enabled', 'lighting.vertexAo.enabled' ] ) s.setParam( id, true );
		await cap();
		const i0 = s.info();
		for ( const [ k, v ] of Object.entries( {
			'lens.flare.intensity': 1.2, 'lens.flare.threshold': 0.8, 'lens.anamorphic.length': 5, 'lens.anamorphic.tint': '#ff8844', 'lens.afterimage.damping': 0.5, 'grade.sepia.amount': 0.5, 'grade.bleach.amount': 0.4,
			'media.sharpen.amount': 1, 'retro.vhs.jitter': 0.7, 'motion.speedLines.amount': 0.3, 'motion.speedLines.centerX': 0.4, 'lines.sobel.threshold': 0.4, 'lines.highlight.thickness': 5, 'lines.highlight.target': 'hero',
			'atmosphere.particles.density': 0.8, 'atmosphere.particles.type': 'snow', 'lighting.vertexAo.strength': 0.3, 'surface.gooch.strength': 0.2, 'atmosphere.fog.partAmount': 0.5, 'atmosphere.sky.turbidity': 8, 'motion.lowFps.fps': 12, 'motion.stepped.fps': 6,
		} ) ) s.setParam( k, v );
		await cap();
		const i1 = s.info();
		check( 'M10 sliders never rebuild', JSON.stringify( rebuilds( i0 ) ) === JSON.stringify( rebuilds( i1 ) ), [ rebuilds( i0 ), rebuilds( i1 ) ] );
		const sky = s.setParam( 'atmosphere.sky.model', 'physical' );
		check( 'the sky model rebuilds only the sky and fog', sky.sky && ! sky.graph && ! sky.pass && sky.parts.length === 0, sky );
		const physical = await cap();
		check( 'the physical sky renders', physical.stats.lumaStd > 0.03, physical.stats );
		const gooch = s.setParam( 'surface.model', 'gooch' );
		check( 'Gooch rebuilds only materials', gooch.parts.length > 0 && ! gooch.graph && ! gooch.pass, gooch );
		const aniso = s.setParam( 'media.kuwahara.enabled', true ) && s.setParam( 'media.kuwahara.anisotropic', true );
		check( 'anisotropic Kuwahara rebuilds only the post graph', aniso.graph && aniso.parts.length === 0, aniso );
		app.actions.resetParams();

		progress( 'low frame rate' );
		await s.setScene( 'kart', { tier: 1, shot: 'gameplay' } );
		await s.applyLook( 'sea-breeze' );
		s.setParam( 'motion.lowFps.fps', 4 );
		s.freeze( 1.02 ); const a = await cap();
		s.freeze( 1.2 ); const b = await cap();
		s.freeze( 1.3 ); const c = await cap();
		check( 'low frame rate: the frame holds within a 1/4 s slot', a.hash === b.hash, [ a.hash, b.hash ] );
		check( 'low frame rate: the next slot draws a new frame', s.diff( b.id, c.id ).mae > 0.0003, s.diff( b.id, c.id ).mae );
		s.compare( 'hold', { on: true } );
		const held = await cap();
		s.compare( 'hold', { on: false } );
		check( 'low frame rate: hold-to-compare still swaps at once', s.diff( c.id, held.id ).mae > 0.01, s.diff( c.id, held.id ).mae );
		app.actions.resetParams();
		s.freeze( 1 );

		progress( 'per part' );
		await s.setScene( 'harbor', { tier: 1 } );
		await s.applyLook( 'sea-breeze' );
		s.setParam( 'atmosphere.fog.density', 0.02 );
		const fogged = await cap();
		app.actions.setParam( 'atmosphere.fog.partAmount', 0, { part: 'terrain' } );
		const clear = await cap();
		check( 'per-part fog: clearing the terrain changes the frame', s.diff( fogged.id, clear.id ).mae > 0.003, s.diff( fogged.id, clear.id ).mae );
		app.actions.setParam( 'motion.stepped.fps', 4, { part: 'props' } );
		check( 'per-part stepping: props step, terrain stays smooth', app.runtime.steppedTime( 1.3, 'props' ) === 1.25 && app.runtime.steppedTime( 1.3, 'terrain' ) === 1.3, [ app.runtime.steppedTime( 1.3, 'props' ), app.runtime.steppedTime( 1.3, 'terrain' ) ] );
		for ( const part of [ 'terrain', 'props' ] ) app.actions.resetPart( part );
		app.actions.resetParams();

		progress( '.cube import' );
		await s.setScene( 'lookdev', { tier: 1 } );
		await s.applyLook( 'golden-hour' );
		const base = await cap();
		const rows = [];
		for ( let bl = 0; bl < 2; bl ++ ) for ( let g = 0; g < 2; g ++ ) for ( let r = 0; r < 2; r ++ ) rows.push( `${1 - r} ${1 - g} ${1 - bl}` );
		const imported = app.actions.importCube( `TITLE "Invert"\nLUT_3D_SIZE 2\n${rows.join( '\n' )}\n`, 'invert.cube' );
		await frames();
		const inverted = await cap();
		check( '.cube import: named, set as the preset, and graded', imported.title === 'Invert' && app.resolved.global[ 'grade.lut.preset' ] === 'custom' && s.diff( base.id, inverted.id ).mae > 0.2, [ imported, s.diff( base.id, inverted.id ).mae ] );
		const lookJson = JSON.parse( await s.exportFile( 'look.json' ) );
		check( '.cube import: the exported look carries the LUT', lookJson.lut?.size === 33 && typeof lookJson.lut.rgb === 'string', lookJson.lut && { size: lookJson.lut.size } );
		app.actions.resetParams();

		progress( 'what changed, randomize, zip' );
		await s.setScene( 'plaza', { tier: 1 } );
		await s.applyLook( 'comic-ink' );
		const changed = await s.whatChanged();
		check( 'what changed: a summary with at least one real change', /^Your look /.test( changed.summary ) && changed.changes.some( ( c ) => c.weight >= 1 ), changed.summary );
		const hash0 = s.resolvedHash(), r0 = s.info();
		const roll = app.actions.randomize( { seed: 7 } );
		await cap();
		const r1 = s.info();
		check( 'randomize: rolls the look\'s values without rebuilding', Object.keys( roll.overrides ).length > 5 && s.resolvedHash() !== hash0 && JSON.stringify( rebuilds( r0 ) ) === JSON.stringify( rebuilds( r1 ) ), [ Object.keys( roll.overrides ).length, rebuilds( r0 ), rebuilds( r1 ) ] );
		s.undo();
		check( 'randomize: one undo restores the look', s.resolvedHash() === hash0 );
		const zip = await s.exportZip();
		check( 'zip: a zip with every export file', zip.head.join() === '80,75,3,4' && [ 'STYLE.md', 'grade.cube', 'looks.json' ].every( ( n ) => zip.names.includes( n ) ) && zip.names.length === s.exportNames().length, zip.names );

		if ( pad ) {

			progress( 'gamepad' );
			const before = s.padInfo().rumbles;
			app.actions.stepLook( 1 );
			await frames( 3 );
			check( 'rumble: a look change plays a dual-rumble effect', s.padInfo().rumbles === before + 1 && window.__rumbles.at( - 1 ) === 'dual-rumble', [ before, s.padInfo().rumbles, window.__rumbles ] );
			const tap = async ( i ) => { pad.buttons[ i ] = { pressed: true, touched: true, value: 1 }; await frames( 3 ); pad.buttons[ i ] = { pressed: false, touched: false, value: 0 }; await frames( 3 ); };
			document.getElementById( 'help-btn' ).click();
			await frames( 2 );
			const scene0 = app.store.get().sceneId;
			check( 'D-pad: the key map is the active panel', s.activePanel() === 'keys-modal', s.activePanel() );
			await tap( 13 ); // ↓: next control
			const focused = document.querySelector( '#keys-modal .pad-focus' );
			await tap( 15 ); // →: not the next scene while a panel is open
			check( 'D-pad: focus moves inside the panel and the scene stays', !! focused && app.store.get().sceneId === scene0, [ focused?.outerHTML?.slice( 0, 60 ), scene0, app.store.get().sceneId ] );
			await tap( 1 ); // B closes
			check( 'D-pad: B closes the panel', s.activePanel() === null, s.activePanel() );

		}

		progress( '.glb with KTX2 and morph targets' );
		const bin = Uint8Array.from( atob( glb64 ), ( ch ) => ch.charCodeAt( 0 ) );
		const imp = await s.importModel( bin.buffer, 'fixture.glb' );
		let banner = null;
		app.built.root.traverse( ( o ) => { if ( o.isMesh && o.name === 'banner' ) banner = o; } );
		const plainTwin = banner?.children.find( ( c ) => c.name === 'plain twin' );
		check( 'glb: loads with no warnings, the KTX2 texture as its map', imp.warnings.length === 0 && !! banner?.userData.style.map?.isTexture, { warnings: imp.warnings, map: !! banner?.userData.style.map } );
		check( 'glb: the twins share the morph weights', !! plainTwin && plainTwin.morphTargetInfluences === banner.morphTargetInfluences );
		s.freeze( 0 ); const m0 = await cap();
		s.freeze( 1 ); const m1 = await cap();
		s.compare( 'hold', { on: true } );
		const mPlain = await cap();
		s.compare( 'hold', { on: false } );
		s.freeze( 0 ); s.compare( 'hold', { on: true } );
		const mPlain0 = await cap();
		s.compare( 'hold', { on: false } );
		check( 'glb: the morph animation plays, styled and plain', s.diff( m0.id, m1.id ).mae > 0.005 && s.diff( mPlain0.id, mPlain.id ).mae > 0.005, [ s.diff( m0.id, m1.id ).mae, s.diff( mPlain0.id, mPlain.id ).mae ] );
		await s.setScene( 'garden', { tier: 1 } );
		s.freeze( null );
		return res;

	}, glb );

	for ( const c of out.checks ) if ( ! c.pass ) fail( `M10: ${c.name} (${JSON.stringify( c.value )})` );

	// Touch controls, with real pointer events: the stick moves the player in walk mode.
	const touch = await page.evaluate( async () => { const s = window.__stylelab; s.forceTouch( true ); await s.setWalk( true ); const r = document.querySelector( '.touch-stick' ).getBoundingClientRect(); return { visible: s.touchVisible(), x: r.left + r.width / 2, y: r.top + r.height / 2, at: s.app.walk.position() }; } );
	if ( ! touch.visible ) fail( 'M10: touch controls show in walk mode' );
	else {

		await page.mouse.move( touch.x, touch.y );
		await page.mouse.down();
		await page.mouse.move( touch.x, touch.y - 80, { steps: 4 } );
		const during = await page.evaluate( () => [ ...window.__stylelab.app.walkInput.touchMove ] );
		await page.waitForTimeout( 2000 ); // a few frames: SwiftShader walks the garden at a few fps
		const moved = await page.evaluate( ( p ) => Math.hypot( ...window.__stylelab.app.walk.position().map( ( v, i ) => v - p[ i ] ) ), touch.at );
		await page.mouse.up();
		const after = await page.evaluate( () => [ ...window.__stylelab.app.walkInput.touchMove ] );
		if ( ! ( during[ 1 ] > 0.9 && moved > 0.05 && after[ 0 ] === 0 && after[ 1 ] === 0 ) ) fail( `M10: the touch stick walks the player (${JSON.stringify( { during, moved, after } )})` );

	}

	await page.evaluate( async () => { const s = window.__stylelab; await s.setWalk( false ); s.forceTouch( false ); } );
	return out;

}

/**
 * M5 acceptance checks (design §9 M5): the full gamepad map on a standard pad (and the
 * tester), walking between zones morphs continuously (weights and values never jump,
 * float-only zones never rebuild, and the walk lands exactly on the zone look), physics
 * replays deterministically, the toybox throws, the plan player and player modes work.
 */
async function m5Checks( page, fail ) {

	const out = await page.evaluate( async () => {

		const s = window.__stylelab, app = s.app, pad = window.__fakePad;
		const res = { checks: [] };
		const check = ( name, pass, value ) => res.checks.push( { name, pass, value } );
		const frames = ( n = 3 ) => new Promise( ( r ) => { let k = 0; const f = () => ( ++ k >= n ? r() : requestAnimationFrame( f ) ); requestAnimationFrame( f ); } );
		const tap = async ( i, value = 1 ) => { pad.buttons[ i ] = { pressed: true, touched: true, value }; await frames( 3 ); pad.buttons[ i ] = { pressed: false, touched: false, value: 0 }; await frames( 3 ); };
		const until = async ( fn, ms = 60000 ) => { const t0 = performance.now(); while ( ! fn() && performance.now() - t0 < ms ) await frames( 2 ); return fn(); };

		// Gamepad: every mapped action responds on a standard pad.
		await s.setScene( 'lookdev', { tier: 1 } );
		await s.applyLook( 'sea-breeze' );
		app.actions.setTransition( { type: 'cut' } );
		const look0 = app.store.get().recipe.base;
		await tap( 5 ); const afterRB = app.store.get().recipe.base;
		await tap( 4 ); const afterLB = app.store.get().recipe.base;
		check( 'pad: RB / LB step looks', afterRB !== look0 && afterLB === look0, [ look0, afterRB, afterLB ] );
		await tap( 15 ); const sceneR = app.store.get().sceneId;
		await tap( 14 ); const sceneL = app.store.get().sceneId;
		check( 'pad: D-pad ← / → step scenes', sceneR !== 'lookdev' && sceneL === 'lookdev', [ sceneR, sceneL ] );
		await tap( 12 ); const tierUp = app.store.get().tier;
		await tap( 13 ); const tierDown = app.store.get().tier;
		check( 'pad: D-pad ↑ / ↓ change complexity', tierUp === 2 && tierDown === 1, [ tierUp, tierDown ] );
		pad.buttons[ 2 ] = { pressed: true, touched: true, value: 1 }; await frames( 3 );
		const held = app.runtime.U.hold.value;
		pad.buttons[ 2 ] = { pressed: false, touched: false, value: 0 }; await frames( 3 );
		check( 'pad: hold X compares with plain', held === 1 && app.runtime.U.hold.value === 0, held );
		pad.buttons[ 6 ] = { pressed: false, touched: true, value: 0.7 }; await frames( 3 );
		const split = { mode: app.store.get().compare.mode, pos: app.store.get().compare.splitPos };
		pad.buttons[ 6 ] = { pressed: false, touched: false, value: 0 }; await frames( 3 );
		check( 'pad: LT drives the split divider', split.mode === 'split' && Math.abs( split.pos - 0.7 ) < 0.01 && app.store.get().compare.mode === 'off', split );
		const shot0 = app.shotId();
		await tap( 11 );
		check( 'pad: R3 next shot', app.shotId() !== shot0, [ shot0, app.shotId() ] );
		await tap( 9 ); const hidden = document.getElementById( 'app' ).classList.contains( 'ui-hidden' );
		await tap( 9 );
		check( 'pad: Menu hides the UI', hidden && ! document.getElementById( 'app' ).classList.contains( 'ui-hidden' ), hidden );
		app.actions.addMode( 'Classic', 'sea-breeze' );
		app.actions.addMode( 'Comic', 'comic-ink' );
		app.actions.setMode( 0 );
		await tap( 8 );
		check( 'pad: View cycles player modes', app.store.get().mode === 1 && app.store.get().recipe.base === 'comic-ink', [ app.store.get().mode, app.store.get().recipe.base ] );

		// Tester: the Play tab lights pressed buttons.
		app.actions.setMode( 0 );
		document.querySelector( 'nav.tabs button[data-tab="play"]' ).click();
		pad.buttons[ 0 ] = { pressed: true, touched: true, value: 1 }; await frames( 4 );
		const lit = document.querySelector( '.pad-btn[data-button="0"]' )?.classList.contains( 'down' );
		pad.buttons[ 0 ] = { pressed: false, touched: false, value: 0 }; await frames( 3 );
		check( 'pad tester shows pressed buttons', lit === true, lit );

		// Walk mode via L3; the left stick moves the player; A jumps; a little stick noise doesn't drift.
		await tap( 10 );
		await until( () => app.walking );
		check( 'pad: L3 starts walk mode', app.walking, app.walking );
		if ( app.walking ) {

			pad.axes = [ 0.08, - 0.1, 0.05, 0.06 ]; await frames( 4 );
			check( 'no stick drift at the default deadzone', app.walkInput.padMove.every( ( v ) => v === 0 ) && app.walkInput.padLook.every( ( v ) => v === 0 ), app.walkInput.padMove );
			const p0 = app.walk.position();
			pad.axes = [ 0, - 1, 0, 0 ];
			const t0 = performance.now();
			await until( () => performance.now() - t0 > 1500 );
			pad.axes = [ 0, 0, 0, 0 ]; await frames( 2 );
			const p1 = app.walk.position();
			const moved = Math.hypot( p1[ 0 ] - p0[ 0 ], p1[ 2 ] - p0[ 2 ] );
			check( 'pad: left stick walks', moved > 0.5, moved );
			pad.buttons[ 0 ] = { pressed: true, touched: true, value: 1 };
			let peak = p1[ 1 ];
			const t1 = performance.now();
			while ( performance.now() - t1 < 800 ) { await frames( 1 ); peak = Math.max( peak, app.walk.position()[ 1 ] ); }
			pad.buttons[ 0 ] = { pressed: false, touched: false, value: 0 };
			check( 'pad: A jumps', peak > p1[ 1 ] + 0.3, [ p1[ 1 ], peak ] );
			await tap( 10 );
			check( 'pad: L3 ends walk mode', ! app.walking, app.walking );

		}

		// Zones: walk from the hall over the lava into the crypt in small steps.
		s.freeze( 1 );
		await s.setScene( 'dungeon', { tier: 1 } );
		await s.applyLook( 'sea-breeze' );
		await s.setWalk( true );
		const ids = s.zones().map( ( z ) => z.id );
		const path = [];
		// Down the west side of the hall (clear of the courtyard), over the lava, up onto the dais.
		for ( let i = 0; i <= 40; i ++ ) { const t = i / 40; path.push( t < 0.5 ? [ - 2, 0, 5 - t * 2 * 8 ] : [ - 2 + ( t - 0.5 ) * 2 * 5, 1, - 3 - ( t - 0.5 ) * 2 * 5 ] ); }
		const before = s.info();
		let prev = null, maxStep = 0, maxValue = 0, worst = null;
		const NUMS = [ 'grade.exposure', 'grade.saturation', 'grade.temperature', 'lens.vignette.amount', 'lighting.practicals.intensity' ];
		for ( const p of path ) {

			await s.walkTo( p );
			const w = Object.fromEntries( s.zones().map( ( z ) => [ z.id, z.weight ] ) );
			const v = Object.fromEntries( NUMS.map( ( id ) => [ id, app.resolved.global[ id ] ] ) );
			if ( prev ) for ( const id of ids ) maxStep = Math.max( maxStep, Math.abs( w[ id ] - prev.w[ id ] ) );
			if ( prev ) for ( const id of NUMS ) { const d = Math.abs( v[ id ] - prev.v[ id ] ); if ( d > maxValue ) { maxValue = d; worst = id; } }
			prev = { w, v };

		}

		const after = s.info();
		check( 'zones: weights change continuously along the walk', maxStep < 0.35 && Object.values( prev.w ).some( ( x ) => x === 1 ), { maxStep, end: prev.w } );
		check( 'zones: look values never jump (largest step under 0.25)', maxValue < 0.25, { maxValue, worst } );
		check( 'zones: float-only zones never rebuild shaders', after.graphBuilds === before.graphBuilds && after.materialBuilds === before.materialBuilds, [ before.graphBuilds, after.graphBuilds ] );
		const g = app.resolved.global;
		check( 'zones: deep in the crypt the look is exactly the crypt look', g[ 'grade.exposure' ] === - 0.5 && g[ 'grade.temperature' ] === - 0.3 && g[ 'lens.vignette.amount' ] === 0.6 && prev.w.crypt === 1 && prev.w.lava === 0, [ g[ 'grade.exposure' ], g[ 'grade.temperature' ], g[ 'lens.vignette.amount' ], prev.w ] );
		const crypt = await s.capture( { width: 240, height: 135 } );
		await s.setWalk( false );
		const hall = await s.capture( { width: 240, height: 135 } );
		check( 'zones: leaving walk mode returns to the global look', app.resolved === app.target && s.diff( crypt.id, hall.id ).mae > 0.01, s.diff( crypt.id, hall.id ).mae );
		res.zoneFrames = [ crypt.stats.meanLuma, hall.stats.meanLuma ];

		s.freeze( null ); // physics runs only while the clock does

		// Physics: deterministic replays; the toybox throws.
		const r1 = await s.physicsReplay( 'toybox' ), r2 = await s.physicsReplay( 'toybox' );
		check( 'physics replays deterministically', r1.hash === r2.hash && r1.moved >= 3, [ r1, r2 ] );
		await s.setScene( 'toybox', { tier: 1 } );
		await s.physicsReady();
		const ok = s.throwBall( 0, 0 );
		await frames( 20 );
		const ball = app.physics?.dynamic.find( ( d ) => d.spare && d.object.visible );
		check( 'toybox: a thrown ball flies', ok && !! ball && ball.object.position.distanceTo( app.camera.position ) > 2, ok );

		// Level look plan: two levels, a cut then a crossfade.
		app.actions.setPlanLevel( 'harbor', { look: 'noir', transition: 'cut' } );
		app.actions.setPlanLevel( 'lookdev', { look: 'comic-ink', transition: 'crossfade' } );
		app.actions.setPlanSeconds( 3 );
		app.actions.playPlan();
		const first = [ app.store.get().sceneId, app.store.get().recipe.base ];
		s.tick( 3.1 );
		const second = [ app.store.get().sceneId, app.store.get().recipe.base, !! app.transition ];
		s.tick( 1 );
		app.actions.stopPlan();
		check( 'plan plays levels with their looks and transitions', first.join() === 'harbor,noir' && second.join() === 'lookdev,comic-ink,true' && ! app.transition, { first, second } );

		// Player modes: a suggested high-contrast mode.
		const hc = app.actions.addHighContrastMode();
		check( 'high-contrast mode suggestion', !! hc && app.hasLook( hc.look ) && app.getLook( hc.look ).params[ 'lines.screen.thickness' ] >= 2.5, hc );
		return res;

	} );

	for ( const c of out.checks ) if ( ! c.pass ) fail( `M5: ${c.name} (${JSON.stringify( c.value )})` );
	return out;

}

/**
 * M6 acceptance checks (design §9 M6): the brief and every export file, grade.cube (an
 * identity LUT for the plain look, and an exact round trip through LUTCubeLoader for a
 * graded look), the QR code, starter.html matching the tool's render, and convertScene()
 * styling a plain three.js scene.
 */
async function m6Checks( page, fail, run, base ) {

	const out = await page.evaluate( async () => {

		const s = window.__stylelab;
		const res = { checks: [] };
		const check = ( name, pass, value ) => res.checks.push( { name, pass, value } );
		s.freeze( 1 );
		await s.setScene( 'lookdev', { tier: 1 } );
		await s.applyLook( 'comic-ink' );

		const text = await s.openBrief( 'brief' );
		check( 'brief modal shows the brief', /Art direction: Comic Ink/.test( text ) && /Post chain/i.test( text ), text.slice( 0, 80 ) );
		const names = s.exportNames();
		const expected = [ 'STYLE.md', 'comic-ink.look.json', 'looks.json', 'stylelab-runtime.js', 'stylelab-kit.js', 'starter.html', 'grade.cube', 'palette.gpl', 'palette.png', 'reference.png', 'contact-sheet.png', 'snapshot-snippet.js' ];
		check( 'every export file is offered', expected.every( ( n ) => names.includes( n ) ), names );
		const sizes = {};
		for ( const n of names.filter( ( x ) => x !== 'contact-sheet.png' ) ) sizes[ n ] = ( await s.exportFile( n ) ).length;
		check( 'export files are non-empty', Object.values( sizes ).every( ( n ) => n > 100 ), sizes );
		const look = JSON.parse( await s.exportFile( 'look.json' ) );
		check( 'look.json is a valid look', look.schema === 'stylelab.look@1' && look.id === 'comic-ink', look.id );
		const starter = await s.exportFile( 'starter.html' );
		check( 'starter.html carries the look', starter.includes( '"id":"comic-ink"' ) && starter.includes( 'createStyle' ), starter.length );

		// grade.cube: identity for the plain look; exact round trip for a graded look.
		await s.applyLook( 'plain' );
		const id = await s.bakeGrade();
		let idErr = 0;
		for ( let b = 0; b < 33; b ++ ) for ( let g = 0; g < 33; g ++ ) for ( let r = 0; r < 33; r ++ ) {

			const o = ( ( b * 33 + g ) * 33 + r ) * 4;
			idErr = Math.max( idErr, Math.abs( id[ o ] - r / 32 ), Math.abs( id[ o + 1 ] - g / 32 ), Math.abs( id[ o + 2 ] - b / 32 ) );

		}

		check( 'grade.cube for the plain look is the identity', idErr < 2 / 255, idErr );
		await s.applyLook( 'cinematic' );
		const baked = await s.bakeGrade();
		const { LUTCubeLoader } = await import( 'three/addons/loaders/LUTCubeLoader.js' );
		const lut = new LUTCubeLoader().parse( await s.exportFile( 'grade.cube' ) );
		const data = lut.texture3D.image.data;
		let rt = 0, moved = 0;
		for ( let i = 0; i < 33 ** 3; i ++ ) for ( let k = 0; k < 3; k ++ ) {

			const v = data instanceof Uint8Array ? data[ i * 4 + k ] / 255 : data[ i * 4 + k ];
			rt = Math.max( rt, Math.abs( v - baked[ i * 4 + k ] ) );
			moved = Math.max( moved, Math.abs( baked[ i * 4 + k ] - id[ i * 4 + k ] ) );

		}

		check( '.cube round-trips through LUTCubeLoader with low error', rt < 1 / 255 + 1e-6 && moved > 0.05, { roundTrip: rt, gradeStrength: moved } );

		await s.openBrief( 'share' );
		const t0 = performance.now();
		while ( ! document.querySelector( '#brief-modal .qr svg' ) && performance.now() - t0 < 20000 ) await new Promise( ( r ) => setTimeout( r, 100 ) );
		check( 'share tab shows a QR code', !! document.querySelector( '#brief-modal .qr svg' ), null );
		document.querySelector( '#brief-modal .close' ).click();
		s.freeze( null );
		return res;

	} );

	// starter.html renders the same frame as the tool (same runtime, look, scene and camera).
	// Both pages share one GPU process: the tool's loop pauses while the starter runs, and the
	// starter closes before the tool renders its side.
	const backendQuery = run.backend === 'WebGL2' ? '&backend=webgl' : '';
	for ( const [ look, scene ] of [ [ 'sea-breeze', 'lookdev' ], [ 'graffiti-rush', 'plaza' ] ] ) try {

		await page.evaluate( () => window.__stylelab.pauseLoop( true ) );
		const starter = await page.context().newPage();
		const errors = [];
		starter.on( 'pageerror', ( e ) => errors.push( String( e ) ) );
		// The module awaits renderer init and the first compile (top-level await), which holds
		// back even DOMContentLoaded: wait for the page's own ready flag instead.
		await starter.goto( `${base}/dist/starter.html?scene=${scene}&look=${look}${backendQuery}`, { waitUntil: 'commit' } );
		await starter.waitForFunction( () => window.__starterReady, null, { timeout: 180000 } );
		const px = await starter.evaluate( () => window.__starter.capture( { width: 480, height: 270, time: 1 } ) );

		// convertScene(): a plain three.js scene, styled in one call.
		if ( look === 'sea-breeze' ) {

			const converted = await starter.evaluate( async () => {

				const THREE = await import( 'three/webgpu' );
				const { createStyle } = await import( './stylelab-runtime.js' );
				const renderer = new THREE.WebGPURenderer( { canvas: document.createElement( 'canvas' ), forceWebGL: new URLSearchParams( location.search ).get( 'backend' ) === 'webgl' } );
				await renderer.init();
				renderer.setSize( 320, 180, false );
				const scene = new THREE.Scene();
				const add = ( name, geo, color, p ) => { const m = new THREE.Mesh( geo, new THREE.MeshStandardMaterial( { color } ) ); m.name = name; m.position.set( ...p ); scene.add( m ); return m; };
				add( 'Ground', new THREE.PlaneGeometry( 30, 30 ).rotateX( - Math.PI / 2 ), '#7a9a5a', [ 0, 0, 0 ] );
				add( 'House_Wall', new THREE.BoxGeometry( 3, 2.5, 3 ), '#e8d8b8', [ - 3, 1.25, 0 ] );
				add( 'Oak_Leaves', new THREE.SphereGeometry( 1.2, 12, 8 ), '#4f8f3a', [ 3, 2.5, 0 ] );
				add( 'Player', new THREE.CapsuleGeometry( 0.4, 1, 4, 8 ), '#3d7fd6', [ 0, 0.9, 2 ] );
				scene.add( new THREE.DirectionalLight( '#ffffff', 2 ) );
				const camera = new THREE.PerspectiveCamera( 50, 16 / 9, 0.1, 200 );
				camera.position.set( 6, 5, 10 ); camera.lookAt( 0, 1, 0 );
				const look = window.__starter.style.looks.get( 'sea-breeze' );
				const style = await createStyle( { renderer, scene, camera, looks: [ look ] } );
				style.render( 0 );
				const parts = {};
				scene.traverse( ( o ) => { if ( o.isMesh && o.userData.style ) parts[ o.name ] = o.userData.style.part; } );
				return { parts, entries: style.runtime.materials.entries.length };

			} );
			out.checks.push( { name: 'convertScene() styles a plain three.js scene with sensible parts', pass: converted.parts.Ground === 'terrain' && converted.parts.House_Wall === 'architecture' && converted.parts.Oak_Leaves === 'foliage' && converted.parts.Player === 'hero' && converted.entries === 4, value: converted } );

		}

		await starter.close();
		await page.evaluate( () => window.__stylelab.pauseLoop( false ) );
		const parity = await page.evaluate( async ( { look, scene, px } ) => {

			const s = window.__stylelab;
			await s.setScene( scene, { tier: 1 } );
			await s.applyLook( look );
			s.freeze( 1 );
			const c = await s.capture( { width: 480, height: 270 } );
			const img = await createImageBitmap( await ( await fetch( s.captureURL( c.id ) ) ).blob() );
			const cv = document.createElement( 'canvas' ); cv.width = 480; cv.height = 270;
			const ctx = cv.getContext( '2d' ); ctx.drawImage( img, 0, 0 );
			const tp = ctx.getImageData( 0, 0, 480, 270 ).data;
			let sum = 0;
			for ( let i = 0; i < tp.length; i += 4 ) for ( let k = 0; k < 3; k ++ ) sum += Math.abs( tp[ i + k ] - px[ i + k ] );
			s.freeze( null );
			return sum / ( 480 * 270 * 3 ) / 255;

		}, { look, scene, px } );
		out.checks.push( { name: `starter.html matches the tool (${look} on ${scene})`, pass: parity < 0.004 && ! errors.length, value: { mae: parity, errors } } );

	} catch ( e ) {

		out.checks.push( { name: `starter.html (${look} on ${scene}) loads and renders`, pass: false, value: String( e.message || e ).split( '\n' )[ 0 ] } );
		await page.evaluate( () => window.__stylelab.pauseLoop( false ) );

	}

	for ( const c of out.checks ) if ( ! c.pass ) fail( `M6: ${c.name} (${JSON.stringify( c.value )})` );
	return out;

}

/**
 * M7 acceptance checks (design §9 M7): two consecutive audits give the same ranking (pairs
 * closer than the run-to-run noise may swap) with totals within ±10%; the audit restores
 * the app state exactly; the phone-friendly variant of a 🔴 look comes out ⚠️ or better.
 */
async function m7Checks( page, fail ) {

	const out = await page.evaluate( async () => {

		const s = window.__stylelab, app = s.app;
		const res = { checks: [] };
		const check = ( name, pass, value ) => res.checks.push( { name, pass, value } );
		s.freeze( 1 );
		await s.setScene( 'lookdev', { tier: 1 } );
		await s.applyLook( 'cinematic' );
		// TRAA jitters every frame, so the frame comparison uses FXAA (an override the audit
		// has to keep, like the rest of the state).
		app.actions.setParam( 'quality.aa', 'fxaa', { part: null } );
		const before = await s.capture( { width: 320, height: 180 } );
		const state0 = JSON.stringify( { ...app.store.get(), tips: null } );
		const opts = { target: 'small', rounds: 3, frames: 10, warmup: 4 };
		const a = await s.audit( opts );
		const b = await s.audit( opts );
		const after = await s.capture( { width: 320, height: 180 } );
		check( 'the audit restores the app state exactly', JSON.stringify( { ...app.store.get(), tips: null } ) === state0 && after.hash === before.hash, [ before.hash, after.hash ] );
		const rank = ( r ) => r.effects.map( ( e ) => e.id );
		const cost = ( r, id ) => r.effects.find( ( e ) => e.id === id ).marginal;
		const noise = Math.max( 0.1 * a.totals.full, 0.05 );
		const swaps = [];
		for ( const x of rank( a ) ) for ( const y of rank( a ) ) {

			if ( x >= y ) continue;
			const da = cost( a, x ) - cost( a, y ), db = cost( b, x ) - cost( b, y );
			if ( Math.sign( da ) !== Math.sign( db ) && Math.max( Math.abs( da ), Math.abs( db ) ) > noise ) swaps.push( [ x, y, da, db ] );

		}

		check( 'two audits rank the effects the same way', swaps.length === 0 && a.effects.length >= 4, { a: rank( a ), b: rank( b ), swaps } );
		const ratio = b.totals.full / a.totals.full;
		check( 'two audits agree on the total within ±10%', ratio > 0.9 && ratio < 1.1, [ a.totals.full, b.totals.full ] );
		check( 'the report has costs, a verdict and recommendations', a.effects.every( ( e ) => e.marginal >= 0 ) && a.rubric.label && a.recommendations.length && a.calibration.msPerFpe > 0, { verdict: a.rubric.label, msPerFpe: a.calibration.msPerFpe } );
		const v = app.actions.makeMobileVariant();
		check( 'the phone-friendly variant of a 🔴 look comes out ⚠️ or better', /✅|⚠️/.test( v.verdict ) && app.hasLook( v.look.id ), { verdict: v.verdict, changes: v.changes } );
		const url = await s.phoneUrl( 'phone-portrait' );
		check( 'open-on-phone link runs the audit on the phone', url.includes( 'audit=phone-portrait' ) && url.includes( '#state=' ), url.slice( 0, 120 ) );
		res.audit = { full: a.totals.full, effects: a.effects.map( ( e ) => [ e.id, e.marginal, e.fpeRubric ] ), timer: a.timer };
		app.actions.resetParams( [ 'quality.aa' ] );
		s.freeze( null );
		return res;

	} );

	for ( const c of out.checks ) if ( ! c.pass ) fail( `M7: ${c.name} (${JSON.stringify( c.value )})` );
	return out;

}

/**
 * M8 acceptance checks (design §9 M8): every lesson completes start to finish driven by the
 * test API; the critic fires on purpose-built bad looks and stays quiet on the built-in
 * looks (or the rule is part of that look's style: STYLE_EXCEPTIONS); every designer view
 * renders, changes the image and restores it exactly.
 */

async function m8Checks( page, fail ) {

	const out = await page.evaluate( async () => {

		const s = window.__stylelab, app = s.app;
		const res = { checks: [], critic: {} };
		const check = ( name, pass, value ) => res.checks.push( { name, pass, value } );
		const t0 = performance.now();
		const progress = ( text ) => console.log( `[progress] M8 ${text} (${( ( performance.now() - t0 ) / 1000 ).toFixed( 0 )} s)` );
		s.freeze( 1 );

		// Lessons, start to finish.
		const leftovers = [];
		for ( const l of s.lessons.list() ) {

			const o0 = JSON.parse( JSON.stringify( app.store.get().overrides ) );

			const errors0 = s.errors().filter( ( e ) => e.level === 'error' ).length;
			let st = await s.lessons.start( l.id ), solved = true, steps = 0;
			while ( st ) {

				steps ++;
				if ( st.task && ! st.task.done ) { progress( `${l.id} step ${steps}: solving the task` ); solved = ( await s.lessons.solve() ) && solved; }
				st = await s.lessons.next();

			}

			const done = app.store.get().lessons.done.includes( l.id );
			const errors = s.errors().filter( ( e ) => e.level === 'error' ).length - errors0;
			check( `lesson ${l.id} completes start to finish`, done && solved && steps === l.steps && errors === 0, { steps, solved, done, errors } );
			const o1 = app.store.get().overrides;
			for ( const b of new Set( [ ...Object.keys( o0 ), ...Object.keys( o1 ) ] ) ) if ( b !== app.store.get().recipe.base && JSON.stringify( o0[ b ] || {} ) !== JSON.stringify( o1[ b ] || {} ) ) leftovers.push( [ l.id, b, o1[ b ] ] );
			progress( `lesson ${l.id}` );
			document.querySelector( '#brief-modal .close' )?.click();
			document.querySelector( '#audit-modal .close' )?.click();

		}

		// Lessons leave no Tune values on the looks they moved past (L8 turns on depth of field
		// on Retro 16-bit for one step); the look on screen keeps the lesson's values.
		check( 'lessons leave no Tune values on the looks they moved past', leftovers.length === 0, leftovers );

		// Designer views: each renders, changes the image, and switching off restores it.
		await s.setWalk( false );
		s.app.actions.setTurntable( false );
		s.freeze( 1 );
		await s.setScene( 'lookdev', { tier: 1 } );
		await s.applyLook( 'sea-breeze' );
		await s.setView( null );
		const base = await s.capture( { width: 240, height: 135 } );
		const views = [];
		for ( const id of [ 'value', 'squint', 'silhouette', 'thumbnail', 'saturation', 'busyness', 'protan', 'deutan', 'tritan', 'thirds', 'golden', 'center', 'buffer-depth', 'buffer-normal', 'buffer-ids' ] ) {

			await s.setView( id );
			const c = await s.capture( { width: 240, height: 135 } );
			views.push( [ id, +s.diff( base.id, c.id ).mae.toFixed( 4 ) ] );

		}

		await s.setView( null );
		const back = await s.capture( { width: 240, height: 135 } );
		check( 'every designer view renders and changes the image', views.every( ( [ , d ] ) => d > 0.002 ), views );
		check( 'switching the view off restores the frame exactly', back.hash === base.hash, [ base.hash, back.hash ] );
		progress( 'designer views' );

		// Critic: quiet on the built-in looks (or the rule is part of the style), firing on purpose-built bad ones.
		const noisy = [];
		for ( const look of s.looks().filter( ( l ) => ! l.id.includes( 'custom' ) && ! l.id.includes( 'mobile' ) && ! l.id.includes( 'high-contrast' ) ) ) {

			app.actions.setOverrides( look.id, {} ); // the look as shipped
			await s.applyLook( look.id );
			const r = await s.critique();
			const ids = r.tips.filter( ( t ) => ! t.intended ).map( ( t ) => t.id );
			res.critic[ look.id ] = r.tips.map( ( t ) => t.id );
			progress( `critic on ${look.id}` );
			if ( ids.length ) noisy.push( [ look.id, ids ] );

		}

		check( 'the critic stays quiet on the built-in looks (or the rule is part of the style)', noisy.length === 0, noisy );
		const bad = { 'flat-values': { 'grade.contrast': 0.5 }, clipping: { 'grade.toneMapping': 'none', 'grade.exposure': 2 }, 'fog-wall': { 'atmosphere.fog.type': 'exp2', 'atmosphere.fog.density': 0.15, 'atmosphere.fog.skyTint': 0 } };
		for ( const [ rule, params ] of Object.entries( bad ) ) {

			await s.applyLook( 'sea-breeze' );
			for ( const [ k, v ] of Object.entries( params ) ) s.setParam( k, v );
			const r = await s.critique();
			const tip = r.tips.find( ( t ) => t.id === rule );
			if ( tip ) app.actions.applyOverrides( tip.fix );
			const after = await s.critique();
			check( `critic: ${rule} fires on a purpose-built bad look`, !! tip, r.tips.map( ( t ) => t.id ) );
			check( `critic: the ${rule} fix helps`, !! tip && ( ! after.tips.some( ( t ) => t.id === rule ) || JSON.stringify( after.stats ) !== JSON.stringify( r.stats ) ), after.tips.map( ( t ) => t.id ) );
			app.actions.resetParams();

		}

		s.freeze( null );
		return res;

	} );

	for ( const c of out.checks ) if ( ! c.pass ) fail( `M8: ${c.name} (${JSON.stringify( c.value )})` );
	return out;

}

/**
 * M9 acceptance checks (design §9 M9): the Verify panel is a guided tour (every check in
 * one section, each with "Set it up for me" and a learn line, sign-offs marked apart);
 * the welcome, the key map and the error messages work; the phone layout fits; a first
 * run (welcome showing) has no errors, on desktop and on a phone-sized screen.
 */
async function m9Checks( page, fail, run, base ) {

	const out = await page.evaluate( async () => {

		const s = window.__stylelab;
		const res = { checks: [] };
		const check = ( name, pass, value ) => res.checks.push( { name, pass, value } );
		const wait = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

		// The tour.
		document.querySelector( '#verify-btn' ).click();
		await wait( 100 );
		const panel = document.querySelector( '#verify' );
		panel.querySelectorAll( 'details.tour-section' ).forEach( ( d ) => { d.open = true; } );
		const cards = [ ...panel.querySelectorAll( '.check' ) ];
		const t = s.tour();
		check( 'the tour shows every check once, in its sections', cards.length === t.checks && new Set( cards.map( ( c ) => c.dataset.id ) ).size === t.checks && panel.querySelectorAll( 'details.tour-section' ).length === t.sections, { cards: cards.length, ...t } );
		check( 'every check has "Set it up for me" and a learn line', cards.every( ( c ) => c.querySelector( '[data-setup]' ) && c.querySelector( '.learn' ) ), cards.filter( ( c ) => ! c.querySelector( '[data-setup]' ) || ! c.querySelector( '.learn' ) ).map( ( c ) => c.dataset.id ) );
		check( 'sign-off checks are marked apart from optional steps', panel.querySelectorAll( '.tag.signoff' ).length - 1 === t.signoffs && cards.every( ( c ) => c.querySelector( '.tag' ) ), { tags: panel.querySelectorAll( '.tag.signoff' ).length - 1, signoffs: t.signoffs } );
		const lessonLinks = [ ...panel.querySelectorAll( '[data-lesson]' ) ].map( ( b ) => b.dataset.lesson );
		check( 'tour sections link their lessons', lessonLinks.length >= 6 && lessonLinks.every( ( id ) => s.lessons.list().some( ( l ) => l.id === id ) ), lessonLinks );
		// Set it up for me on a check from each section loads its scene and look.
		const sample = [ 'M1-02', 'M3-02', 'M5-03', 'M8-02' ];
		const loaded = [];
		for ( const id of sample ) {

			panel.querySelector( `.check[data-id="${id}"] [data-setup]` ).click();
			await wait( 300 );
			loaded.push( [ id, s.app.store.get().sceneId, s.app.look().id ] );

		}

		check( 'Set it up for me loads each check\'s scene and look', loaded.every( ( [ id, scene, look ] ) => { const c = s.checkSetup( id ); return ( ! c.scene || c.scene === scene ) && ( ! c.look || c.look === look ); } ), loaded );
		if ( s.app.walking ) await s.setWalk( false );
		// M8-02 opened the Analyze tab, whose critic re-measures every 2.5 s with the loop
		// paused: back to the Look tab, or later checks that need the loop lose frames to it.
		document.querySelector( 'nav.tabs button[data-tab="look"]' ).click();
		document.querySelector( '#verify .close' ).click();

		// The welcome and the key map.
		await s.showWelcome();
		const welcome = document.querySelector( '#welcome-modal' );
		check( 'the welcome shows three ways in', ! welcome.hidden && welcome.querySelectorAll( '.welcome-options button' ).length === 3, welcome.innerText.slice( 0, 120 ) );
		welcome.querySelector( '.welcome-options button:last-child' ).click();
		check( 'closing the welcome remembers it', welcome.hidden && s.app.store.get().tips.seen.includes( 'welcome' ), null );
		document.dispatchEvent( new KeyboardEvent( 'keydown', { key: '?', bubbles: true } ) );
		await wait( 50 );
		const keys = document.querySelector( '#keys-modal' );
		const rows = keys.querySelectorAll( 'table.keys tr' ).length;
		check( '? opens the keyboard and gamepad map', ! keys.hidden && rows >= 30, rows );
		document.dispatchEvent( new KeyboardEvent( 'keydown', { key: 'Escape', bubbles: true } ) );
		await wait( 50 );
		check( 'Esc closes the map', keys.hidden, null );

		// Hide UI (H): the view fills the window (it used to collapse to zero height).
		document.dispatchEvent( new KeyboardEvent( 'keydown', { key: 'h', bubbles: true } ) );
		await wait( 150 );
		const hidden = document.querySelector( '#viewport' ).getBoundingClientRect();
		check( 'hiding the UI (H) leaves the view filling the window', Math.round( hidden.width ) === innerWidth && Math.round( hidden.height ) === innerHeight, [ hidden.width, hidden.height ] );
		document.dispatchEvent( new KeyboardEvent( 'keydown', { key: 'h', bubbles: true } ) );
		await wait( 150 );

		// Error messages: a file that is not a model, and a cut-off share link.
		const dt = new DataTransfer();
		dt.items.add( new File( [ 'hello' ], 'notes.txt', { type: 'text/plain' } ) );
		window.dispatchEvent( new DragEvent( 'drop', { dataTransfer: dt, bubbles: true, cancelable: true } ) );
		await wait( 50 );
		const toast1 = document.querySelector( '#toast' ).textContent;
		check( 'dropping a file that is not a model explains what to drop', /\.glb/.test( toast1 ), toast1 );
		const errors0 = s.errors().filter( ( e ) => e.level === 'error' ).length;
		const hash = await s.shareHash();
		const cut = await s.openShareLink( hash.slice( 0, hash.length - 12 ) );
		check( 'a cut-off share link says so and keeps the tool working', /cut off|could not be read/.test( cut.toast ) && s.errors().filter( ( e ) => e.level === 'error' ).length === errors0 && !! s.app.look(), cut );
		return res;

	} );

	// A first visit on a phone-sized screen: the welcome shows, nothing overflows, no errors.
	for ( const [ label, viewport ] of [ [ 'desktop', { width: 1280, height: 720 } ], [ 'phone', { width: 390, height: 844 } ] ] ) try {

		const context = await page.context().browser().newContext( { viewport, hasTouch: label === 'phone', isMobile: label === 'phone' } );
		await routeCdn( context );
		const first = await context.newPage();
		const errors = [];
		first.on( 'pageerror', ( e ) => errors.push( String( e ) ) );
		await first.goto( run.url( base ) + ( run.url( base ).includes( '?' ) ? '&' : '?' ) + 'welcome=1', { waitUntil: 'commit' } );
		await first.waitForFunction( () => window.__stylelab && window.__stylelab.ready, null, { timeout: 180000 } );
		await first.waitForTimeout( 500 );
		const r = await first.evaluate( () => ( {
			welcome: ! document.querySelector( '#welcome-modal' ).hidden,
			overflow: document.documentElement.scrollWidth - window.innerWidth,
			errors: window.__stylelab.errors().filter( ( e ) => e.level === 'error' ).map( ( e ) => e.message.slice( 0, 160 ) ),
		} ) );
		if ( label === 'phone' ) {

			await mkdir( ARTIFACTS, { recursive: true } );
			await first.screenshot( { path: path.join( ARTIFACTS, 'm9-phone-welcome.png' ), timeout: 240000 } );
			await first.click( '#welcome-modal .welcome-options button:last-child' );
			await first.click( '#inspector-btn' );
			await first.waitForTimeout( 300 );
			r.inspector = await first.evaluate( () => document.querySelector( '#inspector' ).getBoundingClientRect().height > 200 );
			await first.screenshot( { path: path.join( ARTIFACTS, 'm9-phone-inspector.png' ), timeout: 240000 } );
			r.overflowAfter = await first.evaluate( () => document.documentElement.scrollWidth - window.innerWidth );

		}

		out.checks.push( { name: `a first visit on ${label} shows the welcome, fits the screen and has no errors`, pass: r.welcome && r.overflow <= 0 && ( r.overflowAfter ?? 0 ) <= 0 && ( r.inspector ?? true ) && ! r.errors.length && ! errors.length, value: { ...r, pageErrors: errors } } );
		await context.close();

	} catch ( e ) {

		out.checks.push( { name: `a first visit on ${label} loads`, pass: false, value: String( e.message || e ).split( '\n' )[ 0 ] } );

	}

	// A boot failure shows a friendly message with what to try and a copy button.
	try {

		const failing = await page.context().newPage();
		await failing.goto( run.url( base ) + ( run.url( base ).includes( '?' ) ? '&' : '?' ) + 'simulate=boot-error', { waitUntil: 'commit' } );
		await failing.waitForFunction( () => document.querySelector( '#fatal' ) && ! document.querySelector( '#fatal' ).hidden, null, { timeout: 120000 } );
		const f = await failing.evaluate( () => { const el = document.querySelector( '#fatal' ); return { shown: ! el.hidden, text: el.innerText.slice( 0, 300 ), copy: !! el.querySelector( 'button' ), retry: !! el.querySelector( 'a' ) }; } );
		out.checks.push( { name: 'a boot failure explains what to try, with copy and retry', pass: f.shown && f.copy && f.retry && /try/i.test( f.text ), value: f } );
		await failing.close();

	} catch ( e ) {

		out.checks.push( { name: 'a boot failure explains what to try, with copy and retry', pass: false, value: String( e.message || e ).split( '\n' )[ 0 ] } );

	}

	for ( const c of out.checks ) if ( ! c.pass ) fail( `M9: ${c.name} (${JSON.stringify( c.value )})` );
	return out;

}

async function smoke( browser, run, base ) {

	const context = await browser.newContext( { viewport: { width: 1280, height: 720 } } );
	const cdnRequests = [];
	if ( run.offline ) await context.route( 'https://cdn.jsdelivr.net/**', ( route ) => { cdnRequests.push( route.request().url() ); return route.abort(); } );
	else await routeCdn( context );
	if ( run.m5 ) await context.addInitScript( fakeGamepad );
	const page = await context.newPage();
	// Long checks report progress so a slow run can be told from a stuck one.
	page.on( 'console', ( m ) => { if ( m.text().startsWith( '[progress]' ) ) console.log( `       ${m.text().slice( 11 )}` ); } );
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
		if ( run.m5 && ! flag( '--no-m5' ) ) result.m5 = await m5Checks( page, fail, run );
		if ( run.m6 && ! flag( '--no-m6' ) ) result.m6 = await m6Checks( page, fail, run, base );
		if ( run.m7 && ! flag( '--no-m7' ) ) result.m7 = await m7Checks( page, fail, run );
		if ( run.m8 && ! flag( '--no-m8' ) ) result.m8 = await m8Checks( page, fail, run );
		if ( run.m9 && ! flag( '--no-m9' ) ) result.m9 = await m9Checks( page, fail, run, base );
		if ( run.m10 && ! flag( '--no-m10' ) ) result.m10 = await m10Checks( page, fail, run );
		if ( run.offline ) {

			// The offline page must also apply looks and build scenes without the network.
			await page.evaluate( async () => { const s = window.__stylelab; await s.setScene( 'alley', { tier: 1 } ); await s.applyLook( 'noir' ); } );
			const f = ( await page.evaluate( () => window.__stylelab.capture() ) ).stats;
			if ( ! ( f.lumaStd > 0.02 && f.meanLuma > 0.03 ) ) fail( `offline: the alley in Noir looks blank (${JSON.stringify( f )})` );
			if ( cdnRequests.length ) fail( `offline: the page asked the CDN for ${cdnRequests.slice( 0, 3 ).join( ', ' )}` );

		}

		if ( ! flag( '--no-spikes' ) ) {

			const iterations = Number( value( '--rebuild-iterations' ) ) || undefined;
			result.spikes = await page.evaluate( ( o ) => window.__stylelab.runSpikes( null, o ), { rebuildIterations: iterations } );
			for ( const s of result.spikes ) if ( s.status === 'error' || s.status === 'no-go' ) fail( `spike ${s.id} ${s.key}: ${s.status}` );

		}

		// Drive the Verify panel through its real buttons and read the report it builds.
		if ( run.panel ) {

			await page.click( '#verify-btn' );
			await page.click( '.check[data-id="M9-01"] [data-status="pass"]' );
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
