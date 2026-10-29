// M8: complete Learn content, valid lessons and glossary, and the critic's rules.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGISTRY, byId } from '../src/runtime/registry/index.js';
import { checkValue } from '../src/runtime/look/validate.js';
import { learnCard, incompleteCards, GROUP_LEARN } from '../src/content/learn.js';
import { LESSONS } from '../src/content/lessons.js';
import { GLOSSARY, searchGlossary } from '../src/content/glossary.js';
import { lookById } from '../src/content/looks/index.js';
import { sceneById } from '../src/scenes/index.js';
import { VIEWS } from '../src/runtime/post/views.js';
import { critique, frameStats, CRITIC_RULES, extractPalette, cropBars, STYLE_EXCEPTIONS } from '../src/app/analysis/critic.js';

test( 'every parameter has a complete Learn card', () => {

	assert.deepEqual( incompleteCards(), [] );
	for ( const e of REGISTRY ) {

		const c = learnCard( e );
		for ( const k of [ 'what', 'why', 'use', 'avoid', 'typical', 'seenIn' ] ) assert.ok( typeof c[ k ] === 'string' && c[ k ].length > 3, `${e.id}: ${k}` );
		assert.ok( c.tryThis.text.length > 10 && c.tryThis.values.length >= 1, `${e.id}: try this` );
		for ( const v of c.tryThis.values ) if ( e.type !== 'palette' ) assert.equal( checkValue( e, v ), null, `${e.id}: try value ${v}` );

	}

	assert.ok( Object.keys( GROUP_LEARN ).every( ( g ) => REGISTRY.some( ( e ) => e.id.startsWith( g ) ) ), 'no stale groups' );

} );

test( 'lessons: 10 + a bonus, valid setups, every task has a check and a solver', () => {

	assert.ok( LESSONS.length >= 10 );
	const views = new Set( VIEWS.map( ( v ) => v.id ) );
	for ( const l of LESSONS ) {

		assert.ok( l.steps.length >= 4, `${l.id}: steps` );
		assert.ok( l.steps[ 0 ].setup?.scene && l.steps[ 0 ].setup?.look, `${l.id}: the first step sets the scene and look` );
		assert.ok( l.steps.some( ( s ) => s.task ), `${l.id}: has a task` );
		for ( const [ i, s ] of l.steps.entries() ) {

			const where = `${l.id} step ${i + 1}`;
			assert.ok( s.caption.length > 20, `${where}: caption` );
			const u = s.setup || {};
			if ( u.scene ) assert.ok( sceneById.has( u.scene ), `${where}: scene ${u.scene}` );
			if ( u.look ) assert.ok( lookById.has( u.look ), `${where}: look ${u.look}` );
			if ( u.view ) assert.ok( views.has( u.view ), `${where}: view ${u.view}` );
			for ( const [ id, v ] of Object.entries( u.params || {} ) ) assert.equal( checkValue( byId.get( id ), v ), null, `${where}: ${id}` );
			if ( s.task ) assert.ok( typeof s.task.done === 'function' && typeof s.task.solve === 'function' && s.task.text, `${where}: task` );

		}

	}

} );

test( 'glossary: unique terms, links to real parameters and lessons, search', () => {

	assert.ok( GLOSSARY.length >= 26 );
	assert.equal( new Set( GLOSSARY.map( ( g ) => g.id ) ).size, GLOSSARY.length );
	const lessons = new Set( LESSONS.map( ( l ) => l.id ) );
	for ( const g of GLOSSARY ) for ( const s of g.see ) assert.ok( byId.has( s ) || lessons.has( s ), `${g.id}: ${s}` );
	assert.equal( searchGlossary( 'kuwahara' )[ 0 ].id, 'kuwahara' );
	assert.ok( searchGlossary( 'light' ).length >= 2 );

} );

// Purpose-built frames for the critic (160 × 90 RGBA).
function frame( fn ) {

	const W = 160, H = 90, px = new Uint8Array( W * H * 4 );
	for ( let y = 0; y < H; y ++ ) for ( let x = 0; x < W; x ++ ) {

		const [ r, g, b ] = fn( x / W, y / H, x, y );
		px.set( [ r, g, b, 255 ], ( y * W + x ) * 4 );

	}

	return px;

}

const base = { 'grade.contrast': 1, 'grade.exposure': 0, 'lens.bloom.enabled': false, 'lens.bloom.strength': 0.4, 'palette.saturation': 1, 'lens.vignette.amount': 0, 'surface.rim.intensity': 0, 'lines.screen.enabled': false, 'atmosphere.fog.type': 'off', 'atmosphere.fog.amount': 1, 'atmosphere.fog.color': '#c8dcf0', 'atmosphere.fog.start': 10, 'atmosphere.fog.density': 0.01 };
// A healthy frame: dark ground, light sky, a high-contrast subject in the center, two hues.
const healthy = frame( ( u, v ) => {

	const subject = u > 0.42 && u < 0.58 && v > 0.4 && v < 0.75;
	if ( subject ) return ( Math.floor( u * 40 ) + Math.floor( v * 40 ) ) % 2 ? [ 250, 220, 60 ] : [ 30, 20, 10 ];
	return v < 0.5 ? [ 120 + v * 200, 170 + v * 120, 235 ] : [ 40 + v * 20, 70 + v * 30, 40 ];

} );

test( 'critic: quiet on a healthy frame', () => {

	const r = critique( healthy, base );
	assert.deepEqual( r.tips.map( ( t ) => t.id ), [], JSON.stringify( r.stats ) );

} );

test( 'critic: each rule fires on a purpose-built bad frame, with a fix', () => {

	const cases = {
		'flat-values': [ frame( ( u, v ) => [ 120 + u * 30, 118 + v * 30, 125 ] ), base ],
		clipping: [ frame( ( u, v ) => ( v < 0.4 ? [ 255, 255, 255 ] : [ 60, 90, 60 ] ) ), base ],
		'too-many-hues': [ frame( ( u, v ) => { const h = Math.floor( u * 10 ) / 10 * 6; const k = h % 1, i = Math.floor( h ); const c = [ [ 1, k, 0 ], [ 1 - k, 1, 0 ], [ 0, 1, k ], [ 0, 1 - k, 1 ], [ k, 0, 1 ], [ 1, 0, 1 - k ] ][ i % 6 ]; return c.map( ( x ) => 30 + x * 200 * ( v < 0.5 ? 1 : 0.6 ) ); } ), base ],
		'weak-focus': [ frame( ( u, v, x, y ) => ( u > 1 / 3 && u < 2 / 3 && v > 1 / 3 && v < 2 / 3 ? [ 128, 128, 128 ] : ( x + y ) % 2 ? [ 240, 240, 240 ] : [ 15, 15, 15 ] ) ), base ],
		'line-noise': [ frame( ( u, v, x, y ) => ( ( x * 7 + y * 3 ) % 5 < 2 ? [ 10, 10, 10 ] : [ 230, 220, 200 ] ) ), { ...base, 'lines.screen.enabled': true }, { tier: 3 } ],
		'fog-wall': [ frame( ( u, v ) => ( v > 0.85 ? [ 40, 60, 40 ] : [ 200, 220, 240 ] ) ), { ...base, 'atmosphere.fog.type': 'exp2' } ],
		'color-blind': [ frame( ( u, v ) => ( u > 1 / 3 && u < 2 / 3 && v > 1 / 3 && v < 2 / 3 ? [ 200, 90, 80 ] : [ 90, 140, 60 ] ) ), base ],
	};
	assert.deepEqual( Object.keys( cases ).sort(), CRITIC_RULES.map( ( r ) => r.id ).sort() );
	for ( const [ id, [ px, values, ctx = {} ] ] of Object.entries( cases ) ) {

		const r = critique( px, values, ctx );
		const tip = r.tips.find( ( t ) => t.id === id );
		assert.ok( tip, `${id} fires (${JSON.stringify( r.tips.map( ( t ) => t.id ) )}, ${JSON.stringify( { ...r.stats, histogram: undefined } )})` );
		assert.ok( tip.message && tip.why && tip.fixLabel && Object.keys( tip.fix ).length, `${id}: message, why and fix` );
		for ( const [ k, v ] of Object.entries( tip.fix ) ) assert.equal( checkValue( byId.get( k ), v ), null, `${id} fix ${k}=${v}` );

	}

} );

test( 'critic: letterbox bars are cropped, the focus follows the subject', () => {

	// Black bars top and bottom are framing, not clipping.
	const boxed = frame( ( u, v ) => ( v < 0.12 || v > 0.88 ? [ 0, 0, 0 ] : [ 60 + u * 150, 80 + v * 100, 120 ] ) );
	const { height, top } = cropBars( boxed, 160, 90 );
	assert.ok( top >= 10 && height <= 70, JSON.stringify( { top, height } ) );
	assert.ok( ! critique( boxed, base ).tips.some( ( t ) => t.id === 'clipping' ) );
	// A busy subject in the left third: weak focus when judged at the center, fine when the
	// focus point says where the subject is.
	const left = frame( ( u, v, x, y ) => ( u < 1 / 3 && v > 1 / 3 && v < 2 / 3 ? ( ( x + y ) % 2 ? [ 240, 240, 240 ] : [ 15, 15, 15 ] ) : [ 128, 128, 128 ] ) );
	assert.ok( critique( left, base ).tips.some( ( t ) => t.id === 'weak-focus' ) );
	assert.ok( ! critique( left, base, { focus: [ 26, 45 ] } ).tips.some( ( t ) => t.id === 'weak-focus' ) );

} );

test( 'critic: style exceptions name real looks and rules, with a reason', () => {

	const rules = new Set( CRITIC_RULES.map( ( r ) => r.id ) );
	for ( const [ look, ex ] of Object.entries( STYLE_EXCEPTIONS ) ) {

		assert.ok( lookById.get( look ), look );
		for ( const [ rule, reason ] of Object.entries( ex ) ) assert.ok( rules.has( rule ) && reason.length > 10, `${look}: ${rule}` );

	}

	// An excepted rule is still reported, marked as part of the style.
	const clip = frame( ( u, v ) => ( v < 0.4 ? [ 255, 255, 255 ] : [ 60, 90, 60 ] ) );
	const tip = critique( clip, base, { lookId: 'noir' } ).tips.find( ( t ) => t.id === 'clipping' );
	assert.ok( tip && tip.intended );
	assert.equal( critique( clip, base, { lookId: 'sea-breeze' } ).tips.find( ( t ) => t.id === 'clipping' ).intended, null );

} );

test( 'palette extraction finds the dominant colors', () => {

	const px = frame( ( u ) => ( u < 0.6 ? [ 40, 90, 200 ] : u < 0.9 ? [ 230, 200, 60 ] : [ 200, 40, 40 ] ) );
	const pal = extractPalette( px, 4 );
	assert.ok( pal[ 0 ].share > 0.5 && pal[ 0 ].hue > 200 && pal[ 0 ].hue < 300, JSON.stringify( pal[ 0 ] ) );
	assert.ok( frameStats( px, 160, 90 ).dominantHues <= 4 );

} );

test( 'what changed: a styled frame with more contrast and fewer hues says so', async () => {

	const { whatChanged } = await import( '../src/app/analysis/changes.js' );
	const W = 64, H = 36;
	// Plain: low-contrast stripes in many hues. Styled: the same layout in two strong values and two hues.
	const plain = new Uint8Array( W * H * 4 ), styled = new Uint8Array( W * H * 4 );
	const hues = [ [ 150, 120, 110 ], [ 120, 150, 110 ], [ 110, 120, 150 ], [ 150, 150, 110 ], [ 150, 110, 150 ], [ 110, 150, 150 ] ];
	for ( let y = 0; y < H; y ++ ) for ( let x = 0; x < W; x ++ ) {

		const i = ( y * W + x ) * 4, band = Math.floor( x / 8 ) % hues.length;
		plain.set( [ ...hues[ band ], 255 ], i );
		styled.set( [ ...( band % 2 ? [ 240, 200, 60 ] : [ 30, 40, 120 ] ), 255 ], i );

	}

	const r = whatChanged( plain, styled, W, H );
	assert.match( r.summary, /^Your look /, r.summary );
	const by = Object.fromEntries( r.changes.map( ( c ) => [ c.id, c ] ) );
	assert.ok( by.value.to > by.value.from && by.edges.to > by.edges.from, 'more value range and edge contrast' );
	assert.ok( r.changes[ 0 ].weight >= r.changes.at( - 1 ).weight, 'sorted biggest first' );
	assert.match( r.summary, /raised silhouette contrast|widened the value range/ );
	assert.equal( whatChanged( plain, plain, W, H ).summary.includes( 'barely changes' ), true, 'no change: says so' );

} );
