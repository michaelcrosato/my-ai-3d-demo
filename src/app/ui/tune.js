// Tune panel (design §6.8), generated from the parameter registry: one Tweakpane
// folder per module in pipeline order. Every control has a tooltip, a cost badge on
// effect switches, a "modified" dot (click to reset) and opens its Learn card on click.

import { Pane } from 'tweakpane';
import { REGISTRY, MODULES } from '../../runtime/registry/index.js';
import { h } from './dom.js';

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

	const header = h( 'div.tune-head', {},
		h( 'span.scope-chip', {}, 'Editing: global look' ),
		h( 'button', { onclick: () => app.actions.resetParams(), title: 'Clear every tweak for this look' }, 'Reset all tweaks' ),
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

		const resolved = app.resolved;
		if ( ! resolved ) return;
		syncing = true;
		for ( const [ id, b ] of bindings ) {

			const e = app.param( id );
			const v = resolved.global[ id ];
			values[ id ] = typeof v === 'number' && e.type !== 'int' ? Math.round( v / e.step ) * e.step : v;
			b.element.classList.toggle( 'modified', app.isModified( id ) );
			if ( e.enabledBy ) b.disabled = ! resolved.global[ e.enabledBy ];

		}

		pane.refresh();
		syncing = false;

	}

	app.on( ( type ) => { if ( type === 'resolved' ) sync(); } );
	sync();
	return { pane, sync };

}
