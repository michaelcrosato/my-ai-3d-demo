// Inspector (design §5.1): Look (recipe, pillars, strength), Tune and Learn tabs.

import { byId, MODULES, valueLabel } from '../../runtime/registry/index.js';
import { TIERS } from '../../scenes/index.js';
import { createTune } from './tune.js';
import { createSceneTab } from './scenetab.js';
import { paramCard, PIPELINE_CARD, showMe, bindLearnLinks } from './learn.js';
import { h, esc } from './dom.js';

const TABS = [ [ 'look', 'Look' ], [ 'scene', 'Scene' ], [ 'tune', 'Tune' ], [ 'learn', 'Learn' ] ];

function lookTab( app ) {

	const look = app.look();
	const scene = app.scene();
	const s = app.store.get();
	const tweaks = Object.keys( app.overrides() ).length;

	// The look's recipe: its sparse params, grouped by module, in pipeline order.
	const rows = MODULES.map( ( m ) => {

		const ids = Object.keys( look.params ).filter( ( id ) => byId.get( id ).module === m.id );
		if ( ! ids.length ) return '';
		return `<h4>${esc( m.label )}</h4><ul class="recipe">${ids.map( ( id ) => `<li><button class="link" data-learn="${id}">${esc( byId.get( id ).label )}</button> <code>${esc( valueLabel( byId.get( id ), look.params[ id ] ) )}</code></li>` ).join( '' )}</ul>`;

	} ).join( '' );

	const parts = Object.entries( look.parts || {} ).map( ( [ part, def ] ) => `<li><b>${esc( part )}</b>: ${Object.entries( def.params ).map( ( [ id, v ] ) => `${esc( byId.get( id ).label )} <code>${esc( valueLabel( byId.get( id ), v ) )}</code>` ).join( ', ' )}</li>` ).join( '' );

	return `
		<article class="card">
			<h3>${esc( look.name )}</h3>
			<p class="hint">Inspired by ${esc( look.inspiredBy.join( ', ' ) )}</p>
			<p class="lead">${esc( look.description )}</p>
			<label class="strength">Look strength <input type="range" min="0" max="1" step="0.01" value="${s.strength}" data-strength> <span>${Math.round( s.strength * 100 )}%</span></label>
			<p class="hint">Strength fades every continuous value toward neutral. Switches and shading models stay as the look sets them, so the slider never recompiles.</p>
			${tweaks ? `<p><button data-reset>Reset ${tweaks} tweak${tweaks > 1 ? 's' : ''}</button></p>` : ''}
			${look.pillars.length ? `<h4>Pillars (never break these)</h4><ul>${look.pillars.map( ( p ) => `<li>${esc( p )}</li>` ).join( '' )}</ul>` : ''}
			${look.mistakes.length ? `<h4>Common mistakes</h4><ul>${look.mistakes.map( ( p ) => `<li>${esc( p )}</li>` ).join( '' )}</ul>` : ''}
			${rows ? `<h4 class="section">Recipe</h4>${rows}` : '<p>This look sets nothing: it is the registry defaults on the plain baseline.</p>'}
			${parts ? `<h4>Per part</h4><ul>${parts}</ul>` : ''}
		</article>
		<article class="card">
			<h3>${esc( scene.name )}</h3>
			<p class="hint">Inspired by ${esc( scene.inspiredBy.join( ', ' ) )} · ${esc( TIERS[ s.tier ].name )}${app.built ? ` · ${( app.built.triangles / 1000 ).toFixed( 1 )}k triangles` : ''}</p>
			<p>${esc( scene.notes )}</p>
		</article>`;

}

/**
 * @param {HTMLElement} root
 * @param {object} app
 * @param {object} sceneOptions - readouts, benefitMatrix, showImage, toast (see scenetab.js)
 */
export function createInspector( root, app, sceneOptions ) {

	const nav = h( 'nav.tabs' );
	const panes = Object.fromEntries( TABS.map( ( [ id ] ) => [ id, h( 'div.tab-pane', { dataset: { tab: id } } ) ] ) );
	root.append( nav, ...Object.values( panes ) );

	const setTab = ( tab ) => { app.store.set( { ui: { tab } } ); render(); };
	const openLearn = ( id ) => { app.store.set( { ui: { tab: 'learn', learn: id } } ); render(); };

	nav.append( ...TABS.map( ( [ id, label ] ) => h( 'button', { dataset: { tab: id }, onclick: () => setTab( id ) }, label ) ) );
	const tune = createTune( panes.tune, app, openLearn );
	const sceneTab = createSceneTab( panes.scene, app, sceneOptions );

	function renderLearn() {

		const id = app.store.get().ui.learn;
		const e = id && byId.get( id );
		panes.learn.innerHTML = ( e ? `<div class="row"><button class="primary" data-showme="${e.id}">▶ Show me</button><button data-learn-home>All topics</button></div>${paramCard( e, app.resolved.global[ e.id ] )}` : '' ) + PIPELINE_CARD;

	}

	function render() {

		const { tab } = app.store.get().ui;
		for ( const b of nav.children ) b.classList.toggle( 'on', b.dataset.tab === tab );
		for ( const [ id, el ] of Object.entries( panes ) ) el.hidden = id !== tab;
		if ( tab === 'look' ) panes.look.innerHTML = lookTab( app );
		if ( tab === 'learn' ) renderLearn();
		if ( tab === 'scene' ) sceneTab.render();

	}

	bindLearnLinks( root, openLearn );

	root.addEventListener( 'input', ( ev ) => {

		if ( ev.target.dataset.strength === undefined ) return;
		app.actions.setStrength( Number( ev.target.value ) );
		ev.target.nextElementSibling.textContent = `${Math.round( ev.target.value * 100 )}%`;

	} );

	root.addEventListener( 'click', async ( ev ) => {

		const t = ev.target.closest( 'button' );
		if ( ! t ) return;
		if ( t.dataset.reset !== undefined ) { app.actions.resetParams(); render(); }
		if ( t.dataset.learnHome !== undefined ) { app.store.set( { ui: { learn: null } } ); render(); }
		if ( t.dataset.showme ) { t.disabled = true; await showMe( app, t.dataset.showme ); t.disabled = false; }

	} );

	// Re-render the text tabs when the look or scene changes (not on every slider move).
	app.on( ( type ) => {

		const tab = app.store.get().ui.tab;
		if ( tab === 'look' && [ 'look', 'scene' ].includes( type ) ) render();
		if ( tab === 'learn' && type === 'resolved' && ! document.activeElement?.closest?.( '.tab-pane[data-tab="learn"]' ) ) renderLearn();

	} );

	render();
	return { render, openLearn, setTab, tune, sceneTab };

}
