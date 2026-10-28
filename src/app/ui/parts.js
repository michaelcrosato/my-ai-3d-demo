// Parts tab (design §6.7): every part can follow the global look or take chosen modules
// from its own look, with its own overrides (Edit overrides scopes the Tune tab to it).
// Isolate dims every other part; the focus-hierarchy preset makes the hero the
// highest-contrast thing on screen.

import { PARTS } from '../../runtime/registry/index.js';
import { PART_MODULES, partRecipe } from '../../runtime/look/resolve.js';
import { esc } from './dom.js';

const MODULE_LABELS = { lighting: 'Ambient', surface: 'Surface', lines: 'Lines', palette: 'Palette', atmosphere: 'Fog', media: 'Media', retro: 'Retro', motion: 'Stepping' };
const PART_LABELS = { sky: 'Sky', terrain: 'Terrain', water: 'Water', foliage: 'Foliage', architecture: 'Architecture', props: 'Props', characters: 'Characters', hero: 'Hero (inherits characters)', vfx: 'VFX and emissive' };

export function createPartsTab( pane, app, { toast } ) {

	function render() {

		const s = app.store.get();
		const scope = s.ui.scope;
		const isolate = s.isolate;
		const counts = app.partCounts();

		pane.innerHTML = `
			<article class="card">
				<p class="hint">Style each part separately: pick a look for a part and the modules it takes from it. Materials (surface, palette, hull lines, ambient, vertex snap) are exact; post media and screen-space ink are masked by the part buffer, so they are approximate at part edges. Grade, lens, atmosphere and display stay global: they simulate one camera.</p>
				<div class="row">
					<button data-focus title="Hero: +10% saturation, a rim light and a thicker outline; background slightly calmer">★ Focus hierarchy preset</button>
					${scope ? `<button data-unscope>Stop editing ${esc( scope )}</button>` : ''}
					${isolate ? '<button data-unisolate>Stop isolating</button>' : ''}
				</div>
			</article>
			${PARTS.map( ( part ) => {

				const own = s.parts[ part ] || {};
				const pr = partRecipe( s.parts, part );
				const n = Object.keys( own.overrides || {} ).length;
				return `
				<article class="card part-row ${scope === part ? 'scoped' : ''}" data-part="${part}">
					<h4>${esc( PART_LABELS[ part ] )} <span class="hint">${part === 'sky' ? 'sky dome' : `${counts[ part ] || 0} mesh${counts[ part ] === 1 ? '' : 'es'}`}</span></h4>
					<label class="field">Look <select data-look>
						<option value="">${part === 'hero' && pr.look && ! own.look ? 'Same as characters' : 'Global look'}</option>
						${app.libraryLooks().map( ( l ) => `<option value="${esc( l.id )}" ${own.look === l.id ? 'selected' : ''}>${esc( l.name )}</option>` ).join( '' )}
					</select></label>
					${own.look ? `<div class="modules">${PART_MODULES.map( ( m ) => `<label><input type="checkbox" data-module="${m}" ${pr.modules.includes( m ) ? 'checked' : ''}> ${MODULE_LABELS[ m ]}</label>` ).join( '' )}</div>` : ''}
					<div class="row">
						<button data-scope class="${scope === part ? 'on' : ''}">✎ Edit overrides${n ? ` (${n})` : ''}</button>
						<button data-isolate class="${isolate === part ? 'on' : ''}">◐ Isolate</button>
						${own.look || n ? '<button data-reset>Reset</button>' : ''}
					</div>
				</article>`;

			} ).join( '' )}`;

	}

	const partOf = ( el ) => el.closest( '[data-part]' )?.dataset.part;

	pane.addEventListener( 'change', ( ev ) => {

		const t = ev.target, part = partOf( t );
		if ( ! part ) return;
		if ( t.dataset.look !== undefined ) app.actions.setPartLook( part, t.value || null );
		if ( t.dataset.module ) {

			const boxes = [ ...t.closest( '.modules' ).querySelectorAll( '[data-module]' ) ];
			app.actions.setPartModules( part, boxes.filter( ( b ) => b.checked ).map( ( b ) => b.dataset.module ) );

		}

	} );

	pane.addEventListener( 'click', ( ev ) => {

		const t = ev.target.closest( 'button' );
		if ( ! t ) return;
		const part = partOf( t );
		if ( t.dataset.focus !== undefined ) { app.actions.applyFocusPreset(); toast( 'Focus hierarchy: the hero now has a rim, a thicker outline and more saturation; the background is a little calmer.' ); }
		if ( t.dataset.unscope !== undefined ) app.actions.setScope( null );
		if ( t.dataset.unisolate !== undefined ) app.actions.setIsolate( null );
		if ( ! part ) return;
		if ( t.dataset.scope !== undefined ) app.actions.setScope( app.store.get().ui.scope === part ? null : part );
		if ( t.dataset.isolate !== undefined ) app.actions.setIsolate( app.store.get().isolate === part ? null : part );
		if ( t.dataset.reset !== undefined ) app.actions.resetPart( part );

	} );

	return { render };

}
