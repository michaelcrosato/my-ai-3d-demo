// M4: recipes, morphs, per-part looks, share links, coherence rules and undo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS, lookById } from '../src/content/looks/index.js';
import { validateLook, checkValue } from '../src/runtime/look/validate.js';
import { resolveRecipe, resolveLook, blendResolved, blendEntry, lookFromResolved, partRecipe, resolvedHash, PART_MODULES } from '../src/runtime/look/resolve.js';
import { encodeShare, decodeShare, parseShareHash } from '../src/runtime/look/share.js';
import { checkCoherence, COHERENCE_RULES } from '../src/runtime/look/coherence.js';
import { createHistory } from '../src/app/state/history.js';
import { REGISTRY, MODULES, PARTS, byId } from '../src/runtime/registry/index.js';

const sceneParams = { 'lighting.key.intensity': 3, 'atmosphere.sky.zenith': '#4d8fe0', 'lighting.key.azimuth': 30 };
const getLook = ( id ) => lookById.get( id );
const ids = LOOKS.map( ( l ) => l.id );

// Small seeded PRNG, so a failure names a reproducible case.
function rng( seed ) {

	let a = seed >>> 0;
	return () => {

		a = ( a + 0x6d2b79f5 ) >>> 0;
		let t = a;
		t = Math.imul( t ^ ( t >>> 15 ), t | 1 );
		t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;

	};

}

function assertValid( resolved, where ) {

	for ( const e of REGISTRY ) {

		const problem = checkValue( e, resolved.global[ e.id ] );
		assert.equal( problem, null, `${where}: global ${e.id} ${problem} (${JSON.stringify( resolved.global[ e.id ] )})` );

	}

	for ( const part of PARTS ) for ( const [ id, v ] of Object.entries( resolved.parts[ part ] ) ) {

		const problem = checkValue( byId.get( id ), v );
		assert.equal( problem, null, `${where}: ${part} ${id} ${problem} (${JSON.stringify( v )})` );

	}

}

test( 'library: 20+ looks, unique ids, families group variants', () => {

	assert.ok( LOOKS.length >= 20, `${LOOKS.length} looks` );
	assert.equal( new Set( ids ).size, ids.length );
	for ( const look of LOOKS ) {

		assert.ok( validateLook( look ).ok, look.id );
		assert.ok( look.tags.length, `${look.id} has tags` );
		if ( ! look.baseline ) assert.ok( [ 'cheap', 'medium', 'heavy' ].includes( look.phone ), `${look.id} phone rating` );

	}

	const families = new Map();
	for ( const l of LOOKS ) families.set( l.family || l.id, ( families.get( l.family || l.id ) || 0 ) + 1 );
	assert.ok( [ ...families.values() ].some( ( n ) => n > 1 ), 'at least one family has variants' );

} );

test( 'property: random recipes always resolve to valid values', () => {

	const r = rng( 20261028 );
	const pick = ( list ) => list[ Math.floor( r() * list.length ) ];

	for ( let i = 0; i < 160; i ++ ) {

		const modules = {};
		for ( const m of MODULES ) {

			const x = r();
			if ( x < 0.25 ) modules[ m.id ] = { from: pick( ids ) };
			else if ( x < 0.5 ) modules[ m.id ] = { blend: { with: pick( ids ), t: r() } };
			else if ( x < 0.55 ) modules[ m.id ] = { mute: true };
			else if ( x < 0.58 ) modules[ m.id ] = { solo: true };

		}

		const recipe = { base: pick( ids ), modules, morph: r() < 0.3 ? { with: pick( ids ), t: r() } : null };
		const parts = {};
		for ( const part of PARTS ) if ( r() < 0.3 ) parts[ part ] = { look: pick( ids ), modules: PART_MODULES.filter( () => r() < 0.6 ) };
		const strength = r() < 0.3 ? r() : 1;
		const resolved = resolveRecipe( { recipe, getLook, parts, sceneParams, strength } );
		assertValid( resolved, `case ${i} ${JSON.stringify( { recipe, parts, strength } )}` );

		// Morphing between two random results stays valid at any t.
		const other = resolveRecipe( { recipe: { base: pick( ids ) }, getLook, sceneParams } );
		assertValid( blendResolved( resolved, other, r() ), `blend ${i}` );

	}

} );

test( 'blends land exactly on their endpoints', () => {

	const a = 'sea-breeze', b = 'noir';
	const alone = ( id ) => resolveRecipe( { recipe: { base: id }, getLook, sceneParams } );
	const A = alone( a ), B = alone( b );

	// Morph t = 0 is the base; t = 1 is the other look.
	assert.equal( resolvedHash( resolveRecipe( { recipe: { base: a, morph: { with: b, t: 0 } }, getLook, sceneParams } ) ), resolvedHash( A ) );
	assert.deepEqual( resolveRecipe( { recipe: { base: a, morph: { with: b, t: 1 } }, getLook, sceneParams } ).global, B.global );

	// blendResolved: t = 1 is exactly `to`; switches are a union mid-way, then land.
	assert.equal( blendResolved( A, B, 1 ), B );
	const mid = blendResolved( A, B, 0.5 );
	for ( const e of REGISTRY.filter( ( x ) => x.type === 'bool' ) ) assert.equal( mid[ e.id ], undefined ); // values live in .global
	for ( const e of REGISTRY.filter( ( x ) => x.type === 'bool' ) ) assert.equal( mid.global[ e.id ], A.global[ e.id ] || B.global[ e.id ], e.id );

	// Per-entry rules: numbers are exact at the ends, angles take the short way round.
	const angle = REGISTRY.find( ( e ) => e.type === 'angle' );
	assert.equal( blendEntry( angle, { [ angle.id ]: 170 }, { [ angle.id ]: - 170 }, 0 ), 170 );
	assert.equal( blendEntry( angle, { [ angle.id ]: 170 }, { [ angle.id ]: - 170 }, 1 ), - 170 );
	assert.ok( Math.abs( Math.abs( blendEntry( angle, { [ angle.id ]: 170 }, { [ angle.id ]: - 170 }, 0.5 ) ) - 180 ) < 1e-9, 'short way through 180°' );

} );

test( 'recipe slots: from, mute and solo', () => {

	const base = 'sea-breeze', other = 'comic-ink';
	const r = resolveRecipe( { recipe: { base, modules: { lines: { from: other } } }, getLook, sceneParams } );
	const O = resolveRecipe( { recipe: { base: other }, getLook, sceneParams } );
	const S = resolveRecipe( { recipe: { base }, getLook, sceneParams } );
	for ( const e of REGISTRY ) {

		const expected = e.module === 'lines' ? O.global[ e.id ] : S.global[ e.id ];
		assert.deepEqual( r.global[ e.id ], expected, e.id );

	}

	const muted = resolveRecipe( { recipe: { base, modules: { grade: { mute: true } } }, getLook, sceneParams } );
	for ( const e of REGISTRY.filter( ( x ) => x.module === 'grade' ) ) assert.deepEqual( muted.global[ e.id ], e.neutral, e.id );

	const solo = resolveRecipe( { recipe: { base, modules: { surface: { solo: true } } }, getLook, sceneParams } );
	for ( const e of REGISTRY ) {

		if ( e.module === 'surface' ) assert.deepEqual( solo.global[ e.id ], S.global[ e.id ], e.id );
		else assert.deepEqual( solo.global[ e.id ], e.neutral, e.id );

	}

} );

test( 'per-part looks take only their chosen modules; hero inherits characters', () => {

	const parts = { terrain: { look: 'painterly', modules: [ 'surface', 'media' ] }, characters: { look: 'comic-ink', modules: [ 'lines' ], overrides: { 'lines.hull.thickness': 3 } } };
	const r = resolveRecipe( { recipe: { base: 'sea-breeze' }, getLook, parts, sceneParams } );
	const P = resolveRecipe( { recipe: { base: 'painterly' }, getLook, sceneParams } );
	const C = resolveRecipe( { recipe: { base: 'comic-ink' }, getLook, sceneParams } );
	const S = resolveRecipe( { recipe: { base: 'sea-breeze' }, getLook, sceneParams } );

	for ( const [ id, v ] of Object.entries( r.parts.terrain ) ) {

		const m = byId.get( id ).module;
		assert.deepEqual( v, [ 'surface', 'media' ].includes( m ) ? P.parts.terrain[ id ] : S.parts.terrain[ id ], `terrain ${id}` );

	}

	assert.equal( r.parts.characters[ 'lines.hull.thickness' ], 3 );
	assert.deepEqual( r.parts.characters[ 'lines.hull.enabled' ], C.parts.characters[ 'lines.hull.enabled' ] );
	// The hero follows the characters (look, modules and overrides)…
	assert.equal( r.parts.hero[ 'lines.hull.thickness' ], 3 );
	assert.deepEqual( partRecipe( parts, 'hero' ), { look: 'comic-ink', modules: [ 'lines' ], overrides: { 'lines.hull.thickness': 3 } } );
	// …unless it has its own look or opts out.
	assert.equal( partRecipe( { ...parts, hero: { look: 'noir' } }, 'hero' ).look, 'noir' );
	assert.deepEqual( partRecipe( { ...parts, hero: { inherit: false } }, 'hero' ), { look: null, modules: [], overrides: {} } );
	// Parts without a look follow the global recipe.
	assert.deepEqual( r.parts.sky, S.parts.sky );

} );

test( 'save as look: the sparse look reproduces the mix', () => {

	const recipe = { base: 'golden-hour', modules: { lines: { from: 'comic-ink' }, grade: { blend: { with: 'noir', t: 0.4 } } } };
	const parts = { terrain: { look: 'painterly', modules: [ 'surface', 'palette' ] } };
	const overrides = { 'grade.contrast': 1.15 };
	const mixed = resolveRecipe( { recipe, getLook, parts, sceneParams, overrides } );
	const saved = lookFromResolved( mixed, { id: 'my-mix', name: 'My mix' } );
	const { ok, errors } = validateLook( saved );
	assert.ok( ok, errors.join( '; ' ) );
	const again = resolveLook( { look: saved, sceneParams } );
	for ( const e of REGISTRY ) assert.deepEqual( again.global[ e.id ], mixed.global[ e.id ], e.id );
	for ( const part of PARTS ) assert.deepEqual( again.parts[ part ], mixed.parts[ part ], part );

} );

test( 'share links round-trip the state', async () => {

	const payload = {
		v: 1, scene: 'garden', tier: 2, density: 1.5, shot: null,
		recipe: { base: 'sea-breeze', modules: { lines: { from: 'comic-ink' } }, morph: { with: 'noir', t: 0.3 } },
		parts: { terrain: { look: 'painterly', modules: [ 'surface', 'media' ] } },
		overrides: { 'sea-breeze': { 'grade.contrast': 1.2 } }, strength: 0.8, transition: { type: 'wipe', duration: 1 }, looks: [],
	};
	const text = await encodeShare( payload );
	assert.match( text, /^[A-Za-z0-9_-]+$/, 'base64url' );
	assert.ok( text.length < 400, `compact (${text.length} chars)` );
	const back = await decodeShare( text );
	assert.deepEqual( back, payload );
	const resolve = ( p ) => resolveRecipe( { recipe: p.recipe, getLook, parts: p.parts, sceneParams, overrides: p.overrides[ p.recipe.base ], strength: p.strength } );
	assert.equal( resolvedHash( resolve( back ) ), resolvedHash( resolve( payload ) ) );

	assert.deepEqual( parseShareHash( `#state=${text}` ), { kind: 'state', text } );
	assert.deepEqual( parseShareHash( '#look=abc_-' ), { kind: 'look', text: 'abc_-' } );
	assert.equal( parseShareHash( '#other=1' ), null );
	await assert.rejects( decodeShare( 'not-valid-data' ) );

} );

test( 'coherence: each rule fires on its contradiction, and its fix clears it', () => {

	const base = resolveRecipe( { recipe: { base: 'plain' }, getLook, sceneParams } ).global;
	assert.deepEqual( checkCoherence( base ), [], 'the plain baseline is coherent' );
	const cases = {
		'two-media': { 'media.kuwahara.enabled': true, 'media.halftone.enabled': true, 'media.halftone.amount': 1 },
		'two-eras': { 'retro.pixel.enabled': true, 'lens.dof.enabled': true },
		'busy-lines': { 'lines.screen.enabled': true, 'lines.screen.thickness': 5, 'lines.screen.fade': 0 },
		'bloom-clipping': { 'lens.bloom.enabled': true, 'lens.bloom.strength': 1, 'grade.toneMapping': 'none' },
		oversaturated: { 'palette.saturation': 1.8 },
		'fog-seam': { 'atmosphere.fog.type': 'exp2', 'atmosphere.fog.amount': 1, 'atmosphere.fog.skyTint': 0, 'atmosphere.fog.color': '#ff2020', 'atmosphere.sky.horizon': '#20a0ff' },
		'grain-dither': { 'media.grain.amount': 0.1, 'surface.dither.enabled': true },
	};
	assert.deepEqual( Object.keys( cases ).sort(), COHERENCE_RULES.map( ( r ) => r.id ).sort(), 'a case per rule' );

	for ( const [ id, patch ] of Object.entries( cases ) ) {

		const v = { ...base, ...patch };
		for ( const [ k, x ] of Object.entries( patch ) ) assert.equal( checkValue( byId.get( k ), x ), null, `${id}: ${k}` );
		const found = checkCoherence( v, { tier: 3 } ).find( ( w ) => w.id === id );
		assert.ok( found, `${id} fires` );
		assert.ok( found.message && found.why && found.fixLabel );
		const fixed = { ...v, ...found.fix };
		assert.ok( ! checkCoherence( fixed, { tier: 3 } ).some( ( w ) => w.id === id ), `${id} fix clears it` );

	}

} );

test( 'undo history: merges a drag, caps at the limit, redo clears on a new edit', () => {

	const h = createHistory( { limit: 3, mergeMs: 10000 } );
	h.push( 's0', 'slider' );
	h.push( 's0b', 'slider' ); // same control within the window: merged
	assert.equal( h.undo( 'now' ), 's0' );
	assert.equal( h.canUndo, false );
	assert.equal( h.redo( 's0' ), 'now' );
	for ( const s of [ 'a', 'b', 'c', 'd' ] ) h.push( s );
	assert.equal( h.undo( 'e' ), 'd' );
	assert.equal( h.undo( 'd' ), 'c' );
	assert.equal( h.undo( 'c' ), 'b' );
	assert.equal( h.undo( 'b' ), null, 'capped at 3' );
	h.push( 'x' );
	assert.equal( h.canRedo, false );

} );

test( 'masked post: per-part switches fold into one switch plus a part mask', async () => {

	const { withPartMasks, passRequirements, graphKey, MASKED, ALL_PARTS } = await import( '../src/runtime/post/graph.js' );
	assert.ok( MASKED.includes( 'lines.screen.enabled' ) && MASKED.includes( 'media.kuwahara.enabled' ) );
	const resolve = ( parts ) => resolveRecipe( { recipe: { base: 'comic-ink' }, getLook, parts, sceneParams } );

	// Whole look: every part has the lines, so no ids-based mask is needed for them.
	const all = withPartMasks( resolve( {} ).global, resolve( {} ).parts );
	assert.equal( all[ 'lines.screen.enabled' ], true );
	assert.equal( all[ '@mask:lines.screen.enabled' ], ALL_PARTS );
	assert.equal( all[ '@partial:lines.screen.enabled' ], false );

	// Painterly terrain, plain sky: lines are partial, kuwahara appears on terrain only.
	const r = resolve( { terrain: { look: 'painterly', modules: [ 'lines', 'media' ] }, sky: { look: 'plain', modules: [ 'lines', 'media' ] } } );
	const v = withPartMasks( r.global, r.parts );
	const bit = ( p ) => 1 << PARTS.indexOf( p );
	assert.equal( v[ '@mask:lines.screen.enabled' ] & bit( 'sky' ), 0, 'plain sky: no ink' );
	assert.ok( v[ '@mask:lines.screen.enabled' ] & bit( 'characters' ) );
	// Painterly has its own soft brush lines: terrain keeps ink, at painterly's weight.
	assert.ok( v[ '@mask:lines.screen.enabled' ] & bit( 'terrain' ) );
	assert.equal( r.parts.terrain[ 'lines.screen.thickness' ], lookById.get( 'painterly' ).params[ 'lines.screen.thickness' ] );
	assert.equal( r.parts.characters[ 'lines.screen.thickness' ], lookById.get( 'comic-ink' ).params[ 'lines.screen.thickness' ] );
	assert.equal( v[ '@mask:media.kuwahara.enabled' ], bit( 'terrain' ) );
	assert.equal( v[ 'media.kuwahara.enabled' ], true );
	assert.ok( passRequirements( v ).has( 'ids' ) );
	assert.match( graphKey( v, '0|depth,ids,normal' ), /media\.kuwahara@mask/ );

	// No part with an effect: it is off.
	const none = withPartMasks( { ...r.global, 'media.watercolor.enabled': true }, r.parts );
	assert.equal( none[ 'media.watercolor.enabled' ], false, 'parts decide masked switches' );

} );
