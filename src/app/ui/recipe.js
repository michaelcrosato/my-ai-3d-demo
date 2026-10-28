// Look tab (design §6.5, §6.6): the current look, its recipe slots (a source look and
// an A/B blend per module, mute and solo), Morph, strength, transitions, the coherence
// checker, and Save / Export / Import / Share.

import { byId, MODULES, valueLabel } from '../../runtime/registry/index.js';
import { esc } from './dom.js';

const PHONE = { cheap: '🟢 phone-safe', medium: '🟡 high-end phones', heavy: '🔴 desktop only' };

/**
 * @param {HTMLElement} pane
 * @param {object} app
 * @param {object} o - { toast, share: () => Promise<string> }
 */
export function createRecipeTab( pane, app, { toast, share } ) {

	const lookOptions = ( selected, { none = null } = {} ) => [
		none ? `<option value="">${esc( none )}</option>` : '',
		...app.libraryLooks().map( ( l ) => `<option value="${esc( l.id )}" ${l.id === selected ? 'selected' : ''}>${esc( l.name )}</option>` ),
	].join( '' );

	function moduleRows() {

		const r = app.store.get().recipe;
		return MODULES.map( ( m ) => {

			const slot = r.modules?.[ m.id ] || {};
			const t = slot.blend?.t ?? 0.5;
			return `
				<tr data-module="${m.id}" class="${slot.mute ? 'muted' : ''} ${slot.solo ? 'solo' : ''}">
					<th>${esc( m.label )}</th>
					<td><select data-from title="Take this module from…">${lookOptions( slot.from || '', { none: 'Base look' } )}</select></td>
					<td><select data-with title="Blend with…">${lookOptions( slot.blend?.with || '', { none: '—' } )}</select>
						${slot.blend?.with ? `<input type="range" min="0" max="1" step="0.01" value="${t}" data-t title="Blend amount">` : ''}</td>
					<td><button data-mute class="${slot.mute ? 'on' : ''}" title="Mute: this module takes neutral values">M</button><button data-solo class="${slot.solo ? 'on' : ''}" title="Solo: only this module is styled">S</button></td>
				</tr>`;

		} ).join( '' );

	}

	function warnings() {

		const list = app.coherence();
		if ( ! list.length ) return '<p class="hint ok">No contradictions: the effects in this look agree with each other.</p>';
		return list.map( ( w ) => `
			<div class="warning" data-rule="${w.id}">
				<p>⚠️ ${esc( w.message )}</p>
				<details><summary>Why</summary><p>${esc( w.why )}</p></details>
				<button data-fix="${w.id}">${esc( w.fixLabel )}</button>
			</div>` ).join( '' );

	}

	function render() {

		const look = app.look();
		const s = app.store.get();
		const r = s.recipe;
		const tweaks = Object.keys( app.overrides() ).length;
		const mixed = Object.values( r.modules || {} ).some( ( m ) => m && ( m.from || m.blend?.with || m.mute || m.solo ) ) || r.morph?.with;
		const rows = MODULES.map( ( m ) => {

			const ids = Object.keys( look.params || {} ).filter( ( id ) => byId.get( id )?.module === m.id );
			if ( ! ids.length ) return '';
			return `<h4>${esc( m.label )}</h4><ul class="recipe">${ids.map( ( id ) => `<li><button class="link" data-learn="${id}">${esc( byId.get( id ).label )}</button> <code>${esc( valueLabel( byId.get( id ), look.params[ id ] ) )}</code></li>` ).join( '' )}</ul>`;

		} ).join( '' );

		pane.innerHTML = `
			<article class="card">
				<h3>${esc( look.name )}${mixed ? ' <span class="tag">mixed</span>' : ''}</h3>
				<p class="hint">Inspired by ${esc( ( look.inspiredBy || [] ).join( ', ' ) )}${look.phone ? ` · ${PHONE[ look.phone ]}` : ''}</p>
				<p class="lead">${esc( look.description || '' )}</p>
				<label class="strength">Look strength <input type="range" min="0" max="1" step="0.01" value="${s.strength}" data-strength> <span>${Math.round( s.strength * 100 )}%</span></label>
				<label class="strength">Morph with <select data-morph>${lookOptions( r.morph?.with || '', { none: '—' } )}</select>
					${r.morph?.with ? `<input type="range" min="0" max="1" step="0.01" value="${r.morph.t ?? 0.5}" data-morph-t>` : ''}</label>
				<label class="strength">Transition <select data-transition>${[ [ 'morph', 'Morph' ], [ 'crossfade', 'Crossfade' ], [ 'wipe', 'Wipe' ], [ 'cut', 'Cut' ] ].map( ( [ v, l ] ) => `<option value="${v}" ${s.transition.type === v ? 'selected' : ''}>${l}</option>` ).join( '' )}</select>
					<input type="number" min="0" max="5" step="0.1" value="${s.transition.duration}" data-duration title="Seconds"> s</label>
				<div class="row">
					${tweaks ? `<button data-reset>Reset ${tweaks} tweak${tweaks > 1 ? 's' : ''}</button>` : ''}
					${mixed ? '<button data-unmix>Unmix</button>' : ''}
					<button data-undo ${app.history.canUndo ? '' : 'disabled'} title="Ctrl+Z">↶ Undo</button>
					<button data-redo ${app.history.canRedo ? '' : 'disabled'} title="Ctrl+Shift+Z">↷ Redo</button>
				</div>
			</article>
			<article class="card">
				<h4>Coherence</h4>
				<div data-warnings>${warnings()}</div>
			</article>
			<article class="card">
				<h4>Recipe slots</h4>
				<p class="hint">Each module takes its values from the base look, or from another look; blend two with the slider. Drop a look card on a row. M mutes a module, S solos it.</p>
				<table class="slots">${moduleRows()}</table>
			</article>
			<article class="card">
				<div class="row">
					<button data-save>💾 Save as look</button>
					<button data-export>⇩ Export JSON</button>
					<button data-import>⇧ Import JSON…</button>
					<button data-share>🔗 Copy share link</button>
				</div>
				<input type="file" accept=".json,application/json" data-file hidden>
			</article>
			<article class="card">
				${( look.pillars || [] ).length ? `<h4>Pillars (never break these)</h4><ul>${look.pillars.map( ( p ) => `<li>${esc( p )}</li>` ).join( '' )}</ul>` : ''}
				${( look.mistakes || [] ).length ? `<h4>Common mistakes</h4><ul>${look.mistakes.map( ( p ) => `<li>${esc( p )}</li>` ).join( '' )}</ul>` : ''}
				<details><summary>Base look values</summary>${rows || '<p>This look sets nothing: it is the registry defaults on the plain baseline.</p>'}</details>
			</article>`;

	}

	const rowModule = ( el ) => el.closest( '[data-module]' )?.dataset.module;

	pane.addEventListener( 'input', ( ev ) => {

		const t = ev.target;
		if ( t.dataset.strength !== undefined ) { app.actions.setStrength( Number( t.value ) ); t.nextElementSibling.textContent = `${Math.round( t.value * 100 )}%`; }
		if ( t.dataset.t !== undefined ) app.actions.setModuleBlend( rowModule( t ), app.store.get().recipe.modules[ rowModule( t ) ].blend.with, Number( t.value ) );
		if ( t.dataset.morphT !== undefined ) app.actions.setMorph( app.store.get().recipe.morph.with, Number( t.value ) );

	} );

	pane.addEventListener( 'change', async ( ev ) => {

		const t = ev.target;
		if ( t.dataset.from !== undefined ) app.actions.setModuleSource( rowModule( t ), t.value || null );
		if ( t.dataset.with !== undefined ) app.actions.setModuleBlend( rowModule( t ), t.value || null, 0.5 );
		if ( t.dataset.morph !== undefined ) app.actions.setMorph( t.value || null, 0.5 );
		if ( t.dataset.transition !== undefined ) app.actions.setTransition( { type: t.value } );
		if ( t.dataset.duration !== undefined ) app.actions.setTransition( { duration: Math.max( 0, Number( t.value ) || 0 ) } );
		if ( t.dataset.file !== undefined && t.files[ 0 ] ) {

			try { const look = app.actions.importLook( JSON.parse( await t.files[ 0 ].text() ) ); toast( `Imported "${look.name}" into My looks.` ); } catch ( e ) { toast( `Import failed: ${e.message}`, 6000 ); }

		}

	} );

	pane.addEventListener( 'click', async ( ev ) => {

		const t = ev.target.closest( 'button' );
		if ( ! t ) return;
		if ( t.dataset.mute !== undefined ) app.actions.setModuleFlag( rowModule( t ), 'mute', ! app.store.get().recipe.modules?.[ rowModule( t ) ]?.mute );
		if ( t.dataset.solo !== undefined ) app.actions.setModuleFlag( rowModule( t ), 'solo', ! app.store.get().recipe.modules?.[ rowModule( t ) ]?.solo );
		if ( t.dataset.reset !== undefined ) app.actions.resetParams();
		if ( t.dataset.unmix !== undefined ) app.actions.setLook( app.store.get().recipe.base, { transition: false } );
		if ( t.dataset.undo !== undefined ) app.actions.undo();
		if ( t.dataset.redo !== undefined ) app.actions.redo();
		if ( t.dataset.fix ) { const w = app.coherence().find( ( x ) => x.id === t.dataset.fix ); if ( w ) app.actions.applyOverrides( w.fix ); }
		if ( t.dataset.save !== undefined ) {

			const name = prompt( 'Name for this look:', `${app.look().name} (mine)` );
			if ( name ) { const look = app.actions.saveAsLook( name ); toast( `Saved "${look.name}" to My looks.` ); }

		}

		if ( t.dataset.export !== undefined ) {

			const look = app.currentAsLook();
			const a = document.createElement( 'a' );
			a.href = URL.createObjectURL( new Blob( [ JSON.stringify( look, null, 2 ) ], { type: 'application/json' } ) );
			a.download = `${look.id}.look.json`;
			a.click();
			setTimeout( () => URL.revokeObjectURL( a.href ), 1000 );

		}

		if ( t.dataset.import !== undefined ) pane.querySelector( '[data-file]' ).click();
		if ( t.dataset.share !== undefined ) {

			const url = await share();
			try { await navigator.clipboard.writeText( url ); toast( 'Share link copied. It holds the whole state; no server needed.' ); } catch { prompt( 'Copy this share link:', url ); }

		}

	} );

	// Drop a look card on a module row to take that module from it.
	pane.addEventListener( 'dragover', ( ev ) => { if ( ev.target.closest( '[data-module]' ) && ev.dataTransfer.types.includes( 'text/stylelab-look' ) ) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; } } );
	pane.addEventListener( 'drop', ( ev ) => {

		const row = ev.target.closest( '[data-module]' );
		const id = ev.dataTransfer.getData( 'text/stylelab-look' );
		if ( ! row || ! id ) return;
		ev.preventDefault();
		ev.stopPropagation();
		app.actions.setModuleSource( row.dataset.module, id );

	} );

	const refreshWarnings = () => { const el = pane.querySelector( '[data-warnings]' ); if ( el ) el.innerHTML = warnings(); };
	return { render, refreshWarnings };

}
