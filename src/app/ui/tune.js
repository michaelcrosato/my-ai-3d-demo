// Tune panel (design §6.8), generated from the parameter registry: one Tweakpane
// folder per module in pipeline order. Every control has a tooltip, a cost badge on
// effect switches, a "modified" dot (click to reset) and opens its Learn card on click.
// In part scope (Parts tab → Edit overrides) it shows and edits that part's values;
// camera-wide settings stay global and are dimmed.

import { Pane } from 'tweakpane';
import { REGISTRY, MODULES } from '../../runtime/registry/index.js';
import { h, toast } from './dom.js';

const COST = { cheap: '🟢', medium: '🟡', heavy: '🔴' };

function bindingOptions( e ) {

	const o = { label: e.label };
	if ( [ 'float', 'int', 'angle' ].includes( e.type ) ) Object.assign( o, { min: e.min, max: e.max, step: e.step } );
	if ( e.type === 'enum' ) o.options = Object.fromEntries( e.options.map( ( opt ) => [ opt.label, opt.value ] ) );
	if ( e.type === 'color' ) o.view = 'color';
	if ( e.type === 'bool' && e.structural ) o.label = `${e.label} ${COST[ e.cost.class ]}`;
	return o;

}

/**
 * @param {HTMLElement} root
 * @param {object} app
 * @param {(id: string) => void} openLearn
 */
export function createTune( root, app, openLearn ) {

	const chip = h( 'span.scope-chip', {}, 'Editing: global look' );
	// .cube import (§6.4 F): a hidden file input behind a button; dropping a .cube on the window works too.
	const cubeInput = h( 'input', { type: 'file', accept: '.cube', hidden: true, onchange: async () => {

		const f = cubeInput.files[ 0 ];
		cubeInput.value = '';
		if ( ! f ) return;
		try { const r = app.actions.importCube( await f.text(), f.name ); toast( `Imported the LUT "${r.title}" (${r.size}³): LUT preset is now Imported .cube.`, 5000 ); } catch ( e ) { toast( `LUT import failed: ${e.message}`, 6000 ); }

	} } );
	const header = h( 'div.tune-head', {},
		chip,
		h( 'button', { onclick: () => app.actions.resetParams(), title: 'Clear every tweak in this scope' }, 'Reset all tweaks' ),
		h( 'button', { onclick: () => { const r = app.actions.randomize(); toast( `Rolled ${Object.keys( r.overrides ).length} values within the library's ranges (seed ${r.seed}). Ctrl+Z undoes it.`, 4000 ); }, title: 'New values for the effects this look uses, within the ranges the built-in looks use (switches stay, nothing rebuilds). Ctrl+Z undoes it.' }, '🎲 Randomize' ),
		h( 'button', { onclick: () => cubeInput.click(), title: 'Import a 3D LUT (.cube) from any grading tool; it becomes the LUT preset "Imported .cube"' }, 'Import .cube' ),
		cubeInput,
	);
	const host = h( 'div.tune-pane' );
	root.append( header, host );

	const values = {};
	const bindings = new Map();
	let syncing = false;
	const pane = new Pane( { container: host } );

	for ( const m of MODULES ) {

		const entries = REGISTRY.filter( ( e ) => e.module === m.id && e.type !== 'palette' );
		if ( ! entries.length ) continue;
		const folder = pane.addFolder( { title: m.label, expanded: [ 'surface', 'lines' ].includes( m.id ) } );

		for ( const e of entries ) {

			values[ e.id ] = e.default;
			const b = folder.addBinding( values, e.id, bindingOptions( e ) );
			b.on( 'change', ( ev ) => {

				if ( syncing ) return;
				const v = e.type === 'int' ? Math.round( ev.value ) : ev.value;
				app.actions.setParam( e.id, v );

			} );

			const el = b.element;
			el.title = `${e.learn.what}\n\nWhy: ${e.learn.why}${e.structural ? '\n\nSwitching this rebuilds shaders (a short compile).' : ''}`;
			el.dataset.param = e.id;
			const dot = h( 'button.mod-dot', { title: 'Modified: click to reset to the look\'s value', onclick: ( ev ) => { ev.stopPropagation(); app.actions.resetParams( [ e.id ] ); } } );
			el.prepend( dot );
			el.querySelector( '.tp-lblv_l' )?.addEventListener( 'click', () => openLearn( e.id ) );
			bindings.set( e.id, b );

		}

		folder.addButton( { title: `Reset ${m.label.toLowerCase()}` } ).on( 'click', () => app.actions.resetParams( entries.map( ( e ) => e.id ) ) );

	}

	function sync() {

		// Panels show where the state lands (`target`), not a transition's in-between frame.
		const resolved = app.target || app.resolved;
		if ( ! resolved ) return;
		const scope = app.store.get().ui.scope;
		const src = scope ? resolved.parts[ scope ] : resolved.global;
		chip.textContent = scope ? `Editing: ${scope} only` : 'Editing: global look';
		chip.classList.toggle( 'part', !! scope );
		chip.title = scope ? 'Edits go to this part. Dimmed controls are camera-wide (grade, lens, atmosphere, display) and still change the whole frame. Stop in the Parts tab.' : 'Edits go to the whole look. Parts tab → Edit overrides scopes them to one part.';
		syncing = true;
		for ( const [ id, b ] of bindings ) {

			const e = app.param( id );
			const own = scope && e.scope !== 'global';
			const v = own ? src[ id ] : resolved.global[ id ];
			values[ id ] = typeof v === 'number' && e.type !== 'int' ? Math.round( v / e.step ) * e.step : v;
			b.element.classList.toggle( 'modified', app.isModified( id ) );
			b.element.classList.toggle( 'global-only', !! scope && ! own );
			if ( e.enabledBy ) b.disabled = ! ( own ? src : resolved.global )[ e.enabledBy ];

		}

		pane.refresh();
		syncing = false;

	}

	// Hidden, the controls wait: the inspector syncs them when the tab opens again.
	app.on( ( type ) => { if ( ( type === 'resolved' || type === 'scope' ) && ! root.hidden ) sync(); } );
	sync();
	return { pane, sync };

}
