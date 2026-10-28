// M7: the cost rubric, phone verdicts and the phone-friendly variant.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rubric, mobileSubstitutions, RUBRIC, BUDGETS, VERDICTS } from '../src/runtime/perf/cost-model.js';
import { LOOKS, lookById } from '../src/content/looks/index.js';
import { resolveRecipe } from '../src/runtime/look/resolve.js';
import { EFFECTS } from '../src/runtime/post/graph.js';

const getLook = ( id ) => lookById.get( id );
const resolve = ( id, overrides = {}, partOverrides = {} ) => resolveRecipe( { recipe: { base: id }, getLook, overrides, parts: Object.fromEntries( Object.entries( partOverrides ).map( ( [ p, o ] ) => [ p, { overrides: o } ] ) ) } );
const ORDER = [ 'safe', 'high', 'desktop' ];

test( 'every post effect has a rubric entry', () => {

	for ( const e of EFFECTS ) assert.ok( RUBRIC[ e.id ], `${e.id} is in the rubric` );
	assert.ok( BUDGETS.every( ( b, i ) => i === 0 || b.fpe < BUDGETS[ i - 1 ].fpe ), 'budgets descend' );

} );

test( 'phone verdicts: the rubric agrees with each look\'s rating within one class', () => {

	const rating = { cheap: 'safe', medium: 'high', heavy: 'desktop' };
	for ( const look of LOOKS.filter( ( l ) => l.phone ) ) {

		const r = resolve( look.id );
		const k = rubric( r.global, r.parts );
		assert.ok( Math.abs( ORDER.indexOf( k.verdict ) - ORDER.indexOf( rating[ look.phone ] ) ) <= 1, `${look.id}: rated ${look.phone}, rubric ${k.verdict} (${k.total} FPE)` );
		assert.equal( k.label, VERDICTS[ k.verdict ] );

	}

} );

test( 'the phone-friendly variant of every 🔴 look comes out ⚠️ or better', () => {

	const heavy = LOOKS.filter( ( l ) => l.phone === 'heavy' );
	assert.ok( heavy.length >= 2 );
	for ( const look of LOOKS ) {

		const r = resolve( look.id );
		const before = rubric( r.global, r.parts );
		const sub = mobileSubstitutions( r.global, r.parts );
		const m = resolve( look.id, sub.overrides, sub.partOverrides );
		const after = rubric( m.global, m.parts );
		assert.ok( after.total <= before.total + 1e-9, `${look.id}: the variant is not more expensive` );
		if ( look.phone === 'heavy' ) assert.ok( [ 'safe', 'high' ].includes( after.verdict ), `${look.id}: ${after.total} FPE → ${after.verdict}` );
		// Lines survive as hull outlines on the parts that had screen ink.
		if ( r.global[ 'lines.screen.enabled' ] && r.parts.characters[ 'lines.screen.enabled' ] ) assert.equal( m.parts.characters[ 'lines.hull.enabled' ], true, `${look.id}: characters keep outlines` );

	}

} );

test( 'Kuwahara cost grows with its radius; buffers and shadows count', () => {

	const a = resolve( 'painterly', { 'media.kuwahara.radius': 2 } ), b = resolve( 'painterly', { 'media.kuwahara.radius': 8 } );
	const ka = rubric( a.global, a.parts ).effects.find( ( e ) => e.id === 'media.kuwahara' ).fpe, kb = rubric( b.global, b.parts ).effects.find( ( e ) => e.id === 'media.kuwahara' ).fpe;
	assert.ok( kb > ka * 4, `${ka} → ${kb}` );
	const plain = resolve( 'plain' ), inked = resolve( 'plain', { 'lines.screen.enabled': true } );
	assert.ok( rubric( inked.global, inked.parts ).total > rubric( plain.global, plain.parts ).total + 1.4 );
	const big = resolve( 'plain', { 'lighting.shadows.mapSize': 4096 } );
	assert.ok( rubric( big.global, big.parts ).total > rubric( plain.global, plain.parts ).total );

} );
