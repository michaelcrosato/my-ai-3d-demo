// Inspector (design §5.1): Look (recipe, mixing, coherence), Parts, Scene, Play, Analyze,
// Tune and Learn tabs.

import { createTune } from './tune.js';
import { createSceneTab } from './scenetab.js';
import { createRecipeTab } from './recipe.js';
import { createPartsTab } from './parts.js';
import { createPlayTab } from './play.js';
import { createAnalyzeTab } from './analyze.js';
import { createLearnTab } from './learntab.js';
import { bindLearnLinks } from './learn.js';
import { h } from './dom.js';

const TABS = [ [ 'look', 'Look' ], [ 'parts', 'Parts' ], [ 'scene', 'Scene' ], [ 'play', 'Play' ], [ 'analyze', 'Analyze' ], [ 'tune', 'Tune' ], [ 'learn', 'Learn' ] ];

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
	// Tune builds its few hundred controls when first opened, not at start-up, and keeps
	// them in sync only while it shows.
	let tune = null;
	const sceneTab = createSceneTab( panes.scene, app, sceneOptions );
	const recipeTab = createRecipeTab( panes.look, app, { toast: sceneOptions.toast, share: sceneOptions.share } );
	const partsTab = createPartsTab( panes.parts, app, { toast: sceneOptions.toast } );
	const playTab = createPlayTab( panes.play, app, { toast: sceneOptions.toast } );
	const analyzeTab = createAnalyzeTab( panes.analyze, app, { analyze: sceneOptions.analyze, whatChanged: sceneOptions.whatChanged, setView: ( id ) => app.actions.setView( id ), openLearn: ( id ) => openLearn( id ) } );
	const learnTab = createLearnTab( panes.learn, app, { startLesson: ( l ) => sceneOptions.startLesson( l ) } );

	const renderLearn = () => learnTab.render();

	function render() {

		const { tab } = app.store.get().ui;
		for ( const b of nav.children ) b.classList.toggle( 'on', b.dataset.tab === tab );
		for ( const [ id, el ] of Object.entries( panes ) ) el.hidden = id !== tab;
		if ( tab === 'look' ) recipeTab.render();
		if ( tab === 'parts' ) partsTab.render();
		if ( tab === 'play' ) { playTab.render(); playTab.start(); }
		if ( tab === 'analyze' ) { analyzeTab.render(); analyzeTab.start(); } else analyzeTab.stop();
		if ( tab === 'learn' ) renderLearn();
		if ( tab === 'scene' ) sceneTab.render();
		if ( tab === 'tune' ) { if ( tune ) tune.sync(); else tune = createTune( panes.tune, app, openLearn ); }

	}

	bindLearnLinks( root, openLearn );

	// Re-render the text tabs when the look or scene changes (not on every slider move,
	// and never under a slider the user is dragging).
	const dragging = ( pane ) => pane.contains( document.activeElement ) && document.activeElement.type === 'range';
	app.on( ( type ) => {

		const tab = app.store.get().ui.tab;
		if ( tab === 'look' && [ 'look', 'scene', 'recipe', 'parts', 'library', 'transition' ].includes( type ) ) { if ( dragging( panes.look ) ) recipeTab.refreshWarnings(); else render(); }
		if ( tab === 'look' && type === 'resolved' ) recipeTab.refreshWarnings();
		if ( tab === 'parts' && [ 'parts', 'scope', 'isolate', 'scene', 'library', 'recipe' ].includes( type ) ) render();
		if ( tab === 'play' && [ 'walk', 'physics', 'plan', 'modes', 'scene', 'library' ].includes( type ) && ! panes.play.contains( document.activeElement?.closest?.( 'input' ) ) ) render();
		if ( tab === 'learn' && [ 'resolved', 'look', 'recipe', 'lesson' ].includes( type ) && ! document.activeElement?.closest?.( '.tab-pane[data-tab="learn"]' ) ) renderLearn();
		if ( tab === 'analyze' && [ 'view', 'look', 'recipe', 'scene' ].includes( type ) ) analyzeTab.render();

	} );

	render();
	return { render, openLearn, setTab, get tune() { return tune; }, sceneTab, recipeTab, partsTab, playTab, analyzeTab, learnTab };

}
