// Learn cards (design §6.13): every registry parameter explains what it does and why,
// with a "Show me" that toggles it in the viewport so you see it in context.

import { REGISTRY, MODULES, valueLabel, formatBrief } from '../../runtime/registry/index.js';
import { esc } from './dom.js';

const COST = { cheap: '🟢 cheap', medium: '🟡 moderate', heavy: '🔴 heavy' };

export function paramCard( e, value ) {

	const related = REGISTRY.filter( ( r ) => r.module === e.module && r.id !== e.id ).slice( 0, 6 );
	const mod = MODULES.find( ( m ) => m.id === e.module );

	return `
		<article class="card">
			<h3>${esc( e.label )}</h3>
			<p class="lead">${esc( e.learn.what )}</p>
			<h4>Why it works</h4><p>${esc( e.learn.why )}</p>
			${e.learn.avoid ? `<h4>Avoid</h4><p>${esc( e.learn.avoid )}</p>` : ''}
			${e.learn.typical ? `<h4>Typical values</h4><p>${esc( e.learn.typical )}</p>` : ''}
			<h4>Cost</h4><p>${COST[ e.cost.class ]}${e.structural ? ' · switching it recompiles shaders' : ' · a uniform: changes are free'}${e.requires.length ? ` · needs the ${e.requires.join( ', ' )} buffer${e.requires.length > 1 ? 's' : ''}` : ''}</p>
			<h4>Current value</h4><p><code>${esc( valueLabel( e, value ) )}</code>${e.unit ? ` ${esc( e.unit )}` : ''} · range ${e.type === 'enum' ? e.options.map( ( o ) => esc( o.label ) ).join( ', ' ) : e.min !== undefined ? `${e.min} to ${e.max}` : esc( e.type )}</p>
			<h4>In an agent brief</h4><p class="brief">${esc( formatBrief( e, value ) )}</p>
			<p class="hint">Module: ${esc( mod.label )} (${esc( mod.stage )}). Per part: ${e.scope === 'global' ? 'no, global only' : 'yes'}. Id: <code>${esc( e.id )}</code></p>
			${related.length ? `<h4>Related</h4><p>${related.map( ( r ) => `<button class="link" data-learn="${r.id}">${esc( r.label )}</button>` ).join( ' ' )}</p>` : ''}
		</article>`;

}

export const PIPELINE_CARD = `
	<article class="card">
		<h3>How Style Lab renders a look</h3>
		<p class="lead">Every look runs through five stages, in this order. The order is part of why looks work.</p>
		<ol class="stages">
			<li><b>World</b>: inside the materials. Shading model and cel bands, shadow tint, rim and specular, hull outlines, fog and sky.</li>
			<li><b>Camera</b>: on the HDR image. Bloom, exposure and white balance, then tone mapping. Bloom comes before tone mapping so highlights glow correctly.</li>
			<li><b>Grade</b>: in display space. Contrast, saturation, split toning: creative color, as in a game's LUT.</li>
			<li><b>Medium</b>: ink lines, then anti-aliasing. Ink goes on top of the painted image.</li>
			<li><b>Display</b>: vignette, then grain last, so nothing smears it.</li>
		</ol>
		<h4>Compare</h4>
		<p>The plain baseline renders every frame next to your look (same geometry, its own materials and lights), so <kbd>Space</kbd> swaps on the very next frame. Split (<kbd>C</kbd>) shows plain on the left.</p>
		<h4>Learn any control</h4>
		<p>Click a control's name in the Tune tab to open its card here. Hover any control for a one-line explanation.</p>
	</article>`;

/**
 * "Show me": toggles a parameter between neutral and its current value three
 * times, then restores the previous state exactly.
 */
export async function showMe( app, id ) {

	const e = app.param( id );
	const current = app.resolved.global[ id ];
	const had = id in app.overrides();
	const previous = app.overrides()[ id ];
	let off = e.type === 'bool' ? ! current : e.neutral;
	if ( JSON.stringify( off ) === JSON.stringify( current ) ) off = e.type === 'bool' ? ! current : e.default;
	if ( JSON.stringify( off ) === JSON.stringify( current ) ) return false;

	for ( let i = 0; i < 6; i ++ ) {

		app.actions.setParam( id, i % 2 === 0 ? off : current );
		await new Promise( ( r ) => setTimeout( r, 450 ) );

	}

	if ( had ) app.actions.setParam( id, previous ); else app.actions.resetParams( [ id ] );
	return true;

}

export function bindLearnLinks( root, open ) {

	root.addEventListener( 'click', ( ev ) => {

		const b = ev.target.closest( '[data-learn]' );
		if ( b ) open( b.dataset.learn );

	} );

}
