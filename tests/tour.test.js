// M9: the Verify panel as a guided tour: every check in exactly one section, in learning
// order, each with a setup and a "what you'll learn" line; sign-offs marked apart.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECKS, CURRENT_MILESTONE, REPORT_FROM, milestoneNumber } from '../src/app/verify/checks.js';
import { TOUR, sectionOf } from '../src/app/verify/tour.js';
import { LESSONS } from '../src/content/lessons.js';
import { lookById } from '../src/content/looks/index.js';
import { sceneById } from '../src/scenes/index.js';
import { formatReport } from '../src/app/verify/report.js';

test( 'every check is in exactly one tour section, and every tour id is a check', () => {

	const ids = CHECKS.map( ( c ) => c.id );
	assert.equal( new Set( ids ).size, ids.length, 'check ids are unique' );
	const listed = TOUR.flatMap( ( s ) => s.checks );
	assert.equal( new Set( listed ).size, listed.length, 'no check is listed twice' );
	assert.deepEqual( [ ...listed ].sort(), [ ...ids ].sort() );
	for ( const id of ids ) assert.ok( sectionOf( id ), id );

} );

test( 'every check has steps, an expectation, a learn line and a working setup', () => {

	for ( const c of CHECKS ) {

		assert.ok( c.steps.length && c.expected, c.id );
		assert.ok( c.learn && c.learn.length > 20, `${c.id} has a "what you'll learn" line` );
		assert.ok( c.setup, `${c.id} has "Set it up for me"` );
		if ( c.setup.scene ) assert.ok( sceneById.has( c.setup.scene ), `${c.id}: scene ${c.setup.scene}` );
		if ( c.setup.look ) assert.ok( lookById.has( c.setup.look ), `${c.id}: look ${c.setup.look}` );
		for ( const a of c.actions || [] ) if ( a.startsWith( 'lesson:' ) ) assert.ok( LESSONS.some( ( l ) => l.id === a.slice( 7 ) ), `${c.id}: ${a}` );

	}

} );

test( 'tour sections link real lessons and start with the basics', () => {

	assert.equal( TOUR[ 0 ].id, 'welcome' );
	for ( const s of TOUR ) {

		assert.ok( s.title && s.intro, s.id );
		if ( s.lesson ) assert.ok( LESSONS.some( ( l ) => l.id === s.lesson ), `${s.id}: lesson ${s.lesson}` );

	}

	// Learning order: no section needs a later milestone's basics (the compare loop comes
	// before mixing, mixing before handing off).
	const at = ( id ) => TOUR.findIndex( ( s ) => s.id === id );
	assert.ok( at( 'basics' ) < at( 'compare' ) && at( 'compare' ) < at( 'mixing' ) && at( 'mixing' ) < at( 'handoff' ) );

} );

test( 'sign-off checks are marked apart, and every milestone has some', () => {

	const milestones = new Set( CHECKS.map( ( c ) => c.milestone ) );
	for ( const m of milestones ) assert.ok( CHECKS.some( ( c ) => c.milestone === m && c.signoff !== false ), `${m} has a sign-off check` );
	assert.ok( CHECKS.some( ( c ) => c.signoff === false ), 'some steps are optional' );
	assert.equal( CURRENT_MILESTONE, 'M10' );
	assert.ok( milestoneNumber( REPORT_FROM ) <= milestoneNumber( CURRENT_MILESTONE ) );
	assert.ok( milestoneNumber( 'M10' ) > milestoneNumber( 'M9' ) && milestoneNumber( 'M10' ) > milestoneNumber( 'M3' ), 'M10 sorts after M9 (not as text)' );

} );

test( 'the report lists the sign-offs still owed', () => {

	const owed = CHECKS.filter( ( c ) => c.signoff !== false && milestoneNumber( c.milestone ) >= milestoneNumber( REPORT_FROM ) );
	assert.ok( owed.some( ( c ) => c.milestone === 'M10' ), 'M10 sign-offs are owed too' );
	const checks = [ { ...owed[ 0 ], status: 'pass', note: 'fine' }, ...owed.slice( 1 ) ];
	const text = formatReport( { build: { version: '1.0.0', commit: 'abc' }, env: { userAgent: '', backend: 'WebGPU', protocol: 'http:' }, checks, date: '2026-10-28T00:00:00Z' } );
	assert.match( text, /Checks: 1 pass · 0 fail · 0 unsure · \d+ not done/ );
	assert.match( text, new RegExp( `Still owed: .*${owed[ 1 ].id}` ) );
	assert.doesNotMatch( text, new RegExp( `Still owed: .*${owed[ 0 ].id}\\b` ) );

} );
