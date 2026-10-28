// Inspector (design §5.1): Look (recipe, mixing, coherence), Parts, Scene, Tune and Learn tabs.

import { byId } from '../../runtime/registry/index.js';
import { createTune } from './tune.js';
import { createSceneTab } from './scenetab.js';
import { createRecipeTab } from './recipe.js';
import { createPartsTab } from './parts.js';
import { paramCard, PIPELINE_CARD, showMe, bindLearnLinks } from './learn.js';
import { h } from './dom.js';

const TABS = [ [ 'look', 'Look' ], [ 'parts', 'Parts' ], [ 'scene', 'Scene' ], [ 'tune', 'Tune' ], [ 'learn', 'Learn' ] ];

/**
 * @param {HTMLElement} root
 * @param {object} app
 * @param {object} sceneOptions - readouts, benefitMatrix, showImage, toast (see scenetab.js), share
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
	const recipeTab = createRecipeTab( panes.look, app, { toast: sceneOptions.toast, share: sceneOptions.share } );
	const partsTab = createPartsTab( panes.parts, app, { toast: sceneOptions.toast } );

	function renderLearn() {

		const id = app.store.get().ui.learn;
		const e = id && byId.get( id );
		panes.learn.innerHTML = ( e ? `<div class="row"><button class="primary" data-showme="${e.id}">▶ Show me</button><button data-learn-home>All topics</button></div>${paramCard( e, app.resolved.global[ e.id ] )}` : '' ) + PIPELINE_CARD;

	}

	function render() {

		const { tab } = app.store.get().ui;
		for ( const b of nav.children ) b.classList.toggle( 'on', b.dataset.tab === tab );
		for ( const [ id, el ] of Object.entries( panes ) ) el.hidden = id !== tab;
		if ( tab === 'look' ) recipeTab.render();
		if ( tab === 'parts' ) partsTab.render();
		if ( tab === 'learn' ) renderLearn();
		if ( tab === 'scene' ) sceneTab.render();

	}

	bindLearnLinks( root, openLearn );

	root.addEventListener( 'click', async ( ev ) => {

		const t = ev.target.closest( 'button' );
		if ( ! t ) return;
		if ( t.dataset.learnHome !== undefined ) { app.store.set( { ui: { learn: null } } ); render(); }
		if ( t.dataset.showme ) { t.disabled = true; await showMe( app, t.dataset.showme ); t.disabled = false; }

	} );

	// Re-render the text tabs when the look or scene changes (not on every slider move,
	// and never under a slider the user is dragging).
	const dragging = ( pane ) => pane.contains( document.activeElement ) && document.activeElement.type === 'range';
	app.on( ( type ) => {

		const tab = app.store.get().ui.tab;
		if ( tab === 'look' && [ 'look', 'scene', 'recipe', 'parts', 'library', 'transition' ].includes( type ) ) { if ( dragging( panes.look ) ) recipeTab.refreshWarnings(); else render(); }
		if ( tab === 'look' && type === 'resolved' ) recipeTab.refreshWarnings();
		if ( tab === 'parts' && [ 'parts', 'scope', 'isolate', 'scene', 'library', 'recipe' ].includes( type ) ) render();
		if ( tab === 'learn' && type === 'resolved' && ! document.activeElement?.closest?.( '.tab-pane[data-tab="learn"]' ) ) renderLearn();

	} );

	render();
	return { render, openLearn, setTab, tune, sceneTab, recipeTab, partsTab };

}
