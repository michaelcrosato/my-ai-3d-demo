// Learn tab (design §6.13): lessons, the look breakdown ("Build it from scratch"), the
// glossary, the full card for the selected parameter (with Show me and Try this), and the
// pipeline card.

import { byId, MODULES, valueLabel, formatBrief } from '../../runtime/registry/index.js';
import { LESSONS } from '../../content/lessons.js';
import { searchGlossary } from '../../content/glossary.js';
import { learnCard } from '../../content/learn.js';
import { PIPELINE_CARD, showMe } from './learn.js';
import { buildUpLesson } from './lessons.js';
import { esc } from './dom.js';

const COST = { cheap: '🟢 cheap', medium: '🟡 moderate', heavy: '🔴 heavy' };

export function createLearnTab( pane, app, { startLesson } ) {

	let query = '';

	function card( e ) {

		const c = learnCard( e );
		const value = app.target.global[ e.id ];
		const related = [ ...byId.values() ].filter( ( r ) => r.module === e.module && r.id !== e.id ).slice( 0, 6 );
		return `
			<div class="row"><button class="primary" data-showme="${e.id}">▶ Show me</button><button data-try="${e.id}" title="${esc( c.tryThis.text )}">🧪 Try this</button><button data-learn-home>All topics</button></div>
			<article class="card">
				<h3>${esc( e.label )}</h3>
				<p class="lead">${esc( c.what )}</p>
				<h4>Why it works</h4><p>${esc( c.why )}</p>
				<h4>Use it / avoid it</h4><p>${esc( c.use )} ${esc( c.avoid )}</p>
				<h4>Typical values</h4><p>${esc( c.typical )}</p>
				<h4>Cost</h4><p>${COST[ e.cost.class ]}${e.structural ? ' · switching it recompiles shaders' : ' · a uniform: changes are free'}${e.requires.length ? ` · needs the ${e.requires.join( ', ' )} buffer${e.requires.length > 1 ? 's' : ''}` : ''}</p>
				<h4>Seen in</h4><p>${esc( c.seenIn )}</p>
				<h4>Try this</h4><p>${esc( c.tryThis.text )}</p>
				<h4>Current value</h4><p><code>${esc( valueLabel( e, value ) )}</code>${e.unit ? ` ${esc( e.unit )}` : ''}</p>
				<h4>In an agent brief</h4><p class="brief">${esc( formatBrief( e, value ) )}</p>
				<p class="hint">Module: ${esc( MODULES.find( ( m ) => m.id === e.module ).label )}. Per part: ${e.scope === 'global' ? 'no, global only' : 'yes'}. Id: <code>${esc( e.id )}</code></p>
				${related.length ? `<h4>Related</h4><p>${related.map( ( r ) => `<button class="link" data-learn="${r.id}">${esc( r.label )}</button>` ).join( ' ' )}</p>` : ''}
			</article>`;

	}

	function render() {

		const id = app.store.get().ui.learn;
		const e = id && byId.get( id );
		const look = app.look();
		const done = new Set( app.store.get().lessons.done );
		const terms = searchGlossary( query );
		pane.innerHTML = `
			${e ? card( e ) : ''}
			<article class="card">
				<h3>Lessons</h3>
				<p class="hint">Guided tours that drive the app, each with a small task. Back and Next step through; ✕ leaves the scene as it is.</p>
				<ol class="lessons">${LESSONS.map( ( l ) => `<li class="${done.has( l.id ) ? 'done' : ''}"><button class="link" data-lesson="${l.id}">${esc( l.title )}</button> <span class="hint">${l.minutes} min${done.has( l.id ) ? ' · ✓ done' : ''}</span><br><span class="hint">${esc( l.summary )}</span></li>` ).join( '' )}</ol>
			</article>
			<article class="card">
				<h3>Why ${esc( look.name )} works</h3>
				${( look.pillars || [] ).length ? `<ul>${look.pillars.map( ( p ) => `<li>${esc( p )}</li>` ).join( '' )}</ul>` : '<p class="hint">The plain baseline: what an agent makes by default.</p>'}
				${look.baseline ? '' : '<button data-buildup>▶ Build it from scratch</button><p class="hint">Replays the look one module at a time, starting from neutral, with captions. Works for your own looks too.</p>'}
			</article>
			<article class="card">
				<h3>Glossary</h3>
				<input class="search" type="search" placeholder="Search terms (cel, LUT, dither…)" value="${esc( query )}" data-glossary>
				<dl class="glossary">${terms.map( ( g ) => `<dt>${esc( g.term )}</dt><dd>${esc( g.def )}${g.see.length ? ` <span class="hint">See ${g.see.map( ( s ) => ( byId.has( s ) ? `<button class="link" data-learn="${s}">${esc( byId.get( s ).label )}</button>` : `<button class="link" data-lesson="${s}">${s}</button>` ) ).join( ', ' )}</span>` : ''}</dd>` ).join( '' )}</dl>
			</article>
			${PIPELINE_CARD}`;

	}

	pane.addEventListener( 'input', ( ev ) => {

		if ( ev.target.dataset.glossary === undefined ) return;
		query = ev.target.value;
		const pos = ev.target.selectionStart;
		render();
		const input = pane.querySelector( '[data-glossary]' );
		input.focus();
		input.setSelectionRange( pos, pos );

	} );

	pane.addEventListener( 'click', async ( ev ) => {

		const t = ev.target.closest( 'button' );
		if ( ! t ) return;
		if ( t.dataset.lesson ) startLesson( t.dataset.lesson );
		if ( t.dataset.buildup !== undefined ) startLesson( buildUpLesson( app.look() ) );
		if ( t.dataset.learnHome !== undefined ) { app.store.set( { ui: { learn: null } } ); render(); }
		if ( t.dataset.showme ) { t.disabled = true; await showMe( app, t.dataset.showme ); t.disabled = false; }
		if ( t.dataset.try ) {

			// Try this: step through the experiment's values, then back to where you were.
			const e = byId.get( t.dataset.try ), c = learnCard( e );
			const had = t.dataset.try in app.overrides(), previous = app.overrides()[ t.dataset.try ];
			t.disabled = true;
			for ( const v of c.tryThis.values ) { app.actions.setParam( e.id, v, { part: null } ); await new Promise( ( r ) => setTimeout( r, 1200 ) ); }
			if ( had ) app.actions.setParam( e.id, previous, { part: null } ); else app.actions.resetParams( [ e.id ] );
			t.disabled = false;

		}

	} );

	return { render };

}
