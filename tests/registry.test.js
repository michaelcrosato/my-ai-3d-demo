import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGISTRY, MODULES, BUFFERS, byId, formatBrief } from '../src/runtime/registry/index.js';
import { checkValue } from '../src/runtime/look/validate.js';

const moduleIds = new Set( MODULES.map( ( m ) => m.id ) );

test( 'registry ids are unique and prefixed by their module', () => {

	assert.equal( byId.size, REGISTRY.length );
	for ( const e of REGISTRY ) assert.ok( e.id.startsWith( `${e.module}.` ), e.id );

} );

test( 'every entry is complete (design §7.5)', () => {

	for ( const e of REGISTRY ) {

		const where = e.id;
		assert.ok( moduleIds.has( e.module ), `${where}: module` );
		assert.ok( e.label, `${where}: label` );
		assert.ok( e.learn?.what && e.learn?.why, `${where}: learn.what and learn.why` );
		assert.ok( e.brief, `${where}: brief` );
		assert.ok( [ 'cheap', 'medium', 'heavy' ].includes( e.cost?.class ) && e.cost.fpe > 0, `${where}: cost` );
		assert.ok( [ 'global', 'part', 'both', 'mask' ].includes( e.scope ), `${where}: scope` );
		assert.ok( [ 'lerp', 'oklab', 'step', 'angle', 'palette' ].includes( e.mix ), `${where}: mix` );
		assert.ok( 'default' in e && 'neutral' in e, `${where}: default and neutral` );

		if ( [ 'float', 'int', 'angle' ].includes( e.type ) ) assert.ok( e.min < e.max && e.step > 0, `${where}: range` );
		if ( e.type === 'enum' ) assert.ok( e.options.length >= 2, `${where}: options` );

		assert.equal( checkValue( e, e.default ), null, `${where}: default is valid` );
		assert.equal( checkValue( e, e.neutral ), null, `${where}: neutral is valid` );

		for ( const b of e.requires ) assert.ok( BUFFERS.includes( b ), `${where}: requires ${b}` );
		if ( e.enabledBy ) assert.equal( byId.get( e.enabledBy )?.type, 'bool', `${where}: enabledBy points at a switch` );

	}

} );

test( 'briefs fill in values and enum labels', () => {

	assert.equal( formatBrief( byId.get( 'lines.screen.thickness' ), 2.5 ), 'Ink lines 2.5 px at 1080p.' );
	assert.equal( formatBrief( byId.get( 'grade.toneMapping' ), 'agx' ), 'AgX tone mapping.' );

} );
