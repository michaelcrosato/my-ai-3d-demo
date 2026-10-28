// M6: the agent brief for every built-in look, every target and length.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateBrief, postChain, BRIEF_TARGETS, BRIEF_LENGTHS } from '../src/runtime/brief/brief.js';
import { LOOKS, lookById } from '../src/content/looks/index.js';
import { resolveRecipe } from '../src/runtime/look/resolve.js';
import { activeEffects, withPartMasks, EFFECTS } from '../src/runtime/post/graph.js';

const getLook = ( id ) => lookById.get( id );
const sceneParams = { 'lighting.key.azimuth': 30 };

test( 'every look × target × length: no missing values, enabled effects in pipeline order', () => {

	const order = EFFECTS.map( ( e ) => e.id );
	for ( const look of LOOKS ) {

		const resolved = resolveRecipe( { recipe: { base: look.id }, getLook, sceneParams } );
		const active = activeEffects( withPartMasks( resolved.global, resolved.parts ) );
		const chain = postChain( resolved.global, resolved.parts );

		// The chain is in pipeline order and contains every enabled effect.
		const idx = chain.map( ( e ) => order.indexOf( e.id ) );
		assert.deepEqual( idx, [ ...idx ].sort( ( a, b ) => a - b ), `${look.id}: chain in pipeline order` );
		for ( const id of active ) assert.ok( chain.some( ( e ) => e.id === id ), `${look.id}: ${id} is in the chain` );

		for ( const target of Object.keys( BRIEF_TARGETS ) ) for ( const length of Object.keys( BRIEF_LENGTHS ) ) {

			const text = generateBrief( { look, resolved, target, length, shareUrl: 'https://example.test/#look=x' } );
			const where = `${look.id} / ${target} / ${length}`;
			for ( const bad of [ 'undefined', 'NaN', '[object Object]', '{value}', '{label}', 'null' ] ) assert.ok( ! text.includes( bad ), `${where}: contains "${bad}"` );
			assert.match( text, new RegExp( `^# Art direction: ${look.name.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' )}` ), where );
			assert.match( text, /procedural|in code/i, `${where}: procedural asset rules` );
			if ( length === 'short' ) assert.ok( text.split( /\s+/ ).length <= 300, `${where}: ${text.split( /\s+/ ).length} words` );
			else {

				// The post chain section lists the enabled effects in order.
				const post = text.slice( text.indexOf( '## Post chain' ), text.indexOf( '## Modeling rules' ) );
				let last = - 1;
				for ( const e of chain ) {

					const at = post.indexOf( `**${e.label}**` );
					assert.ok( at > last, `${where}: ${e.id} listed in order` );
					last = at;

				}

				if ( target === 'runtime' ) assert.match( text, /createStyle/ );
				if ( target === 'engine' ) assert.ok( ! text.includes( 'createStyle' ), `${where}: no code` );

			}

		}

	}

} );

test( 'the brief is deterministic and reflects tweaks, mixes and plans', () => {

	const look = lookById.get( 'comic-ink' );
	const a = resolveRecipe( { recipe: { base: 'comic-ink' }, getLook } );
	assert.equal( generateBrief( { look, resolved: a } ), generateBrief( { look, resolved: a } ) );
	const tweaked = resolveRecipe( { recipe: { base: 'comic-ink' }, getLook, overrides: { 'lines.screen.thickness': 3.5 } } );
	assert.match( generateBrief( { look, resolved: tweaked } ), /Ink lines 3\.5 px/ );
	const plan = { levels: [ { scene: 'harbor', look: 'Sea Breeze Toon', transition: 'morph' } ], zones: [ { scene: 'dungeon', zone: 'crypt', look: 'Darker, colder', blend: 3 } ], modes: [ { name: 'Classic', look: 'Comic Ink' } ] };
	const text = generateBrief( { look, resolved: a, plan, mixedFrom: [ 'Comic Ink', 'Noir' ] } );
	assert.match( text, /## Look plan/ );
	assert.match( text, /Zone \*\*crypt\*\*/ );
	assert.match( text, /mixed from Comic Ink \+ Noir/ );

} );
