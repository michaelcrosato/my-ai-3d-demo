// Analyze tab (design §6.13): designer views, the critic, the extracted palette on a hue
// wheel, the luminance histogram, and the pipeline strip with the buffers the shaders read.
// The critic reads a 160 × 90 readback every couple of seconds while the tab is open.

import { VIEWS } from '../../runtime/post/views.js';
import { postChain } from '../../runtime/brief/brief.js';
import { byId } from '../../runtime/registry/index.js';
import { extractPalette } from '../analysis/critic.js';
import { oklabToHex } from '../../runtime/color/color.js';
import { esc } from './dom.js';

export function createAnalyzeTab( pane, app, { analyze, setView, openLearn } ) {

	let result = null, timer = 0, busy = false;

	function wheel( palette ) {

		const R = 70, c = 80;
		const dots = palette.filter( ( p ) => p.share > 0.01 ).map( ( p ) => {

			const r = Math.min( 1, p.chroma / 0.25 ) * R, a = p.hue * Math.PI / 180;
			return `<circle cx="${( c + Math.cos( a ) * r ).toFixed( 1 )}" cy="${( c - Math.sin( a ) * r ).toFixed( 1 )}" r="${( 4 + Math.sqrt( p.share ) * 18 ).toFixed( 1 )}" fill="${oklabToHex( p.lab )}" stroke="#000" stroke-opacity="0.4"/>`;

		} ).join( '' );
		const ring = Array.from( { length: 36 }, ( _, i ) => `<line x1="${c + Math.cos( i * Math.PI / 18 ) * ( R + 4 )}" y1="${c - Math.sin( i * Math.PI / 18 ) * ( R + 4 )}" x2="${c + Math.cos( i * Math.PI / 18 ) * ( R + 9 )}" y2="${c - Math.sin( i * Math.PI / 18 ) * ( R + 9 )}" stroke="hsl(${( 360 - i * 10 + 30 ) % 360} 70% 55%)" stroke-width="5"/>` ).join( '' );
		return `<svg class="wheel" viewBox="0 0 160 160" width="160" height="160"><circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="#555" stroke-dasharray="2 3"/>${ring}${dots}</svg>`;

	}

	const histogram = ( h ) => `<svg class="histogram" viewBox="0 0 160 50" preserveAspectRatio="none" width="100%" height="50">${h.map( ( v, i ) => `<rect x="${i * 5}" y="${50 - Math.min( 50, v * 400 )}" width="4.5" height="${Math.min( 50, v * 400 )}" fill="#8ab4f8"/>` ).join( '' )}</svg>`;

	function render() {

		const view = app.store.get().view;
		const chain = postChain( app.target.global, app.target.parts );
		pane.innerHTML = `
			<article class="card">
				<h4>Designer views</h4>
				<p class="hint">Analysis overlays that train the eye. V (or Y on a gamepad) cycles them.</p>
				<div class="chips views">${[ { id: null, label: 'Off' }, ...VIEWS.filter( ( v ) => ! v.buffer ) ].map( ( v ) => `<button data-view="${v.id ?? ''}" class="${view === v.id ? 'on' : ''}" title="${esc( v.learn || 'Back to the look' )}">${esc( v.label )}</button>` ).join( '' )}</div>
				${view ? `<p class="hint">${esc( VIEWS.find( ( v ) => v.id === view )?.learn || '' )}</p>` : ''}
			</article>
			<article class="card">
				<h4>Critic</h4>
				<div data-critic>${critic()}</div>
			</article>
			<article class="card">
				<h4>Palette and hue wheel</h4>
				<div class="row wheel-row" data-wheel>${result ? `${wheel( result.palette )}<div class="swatch-list">${result.palette.map( ( p ) => `<span><i style="background:${oklabToHex( p.lab )}"></i>${Math.round( p.share * 100 )}%</span>` ).join( '' )}</div>` : '<p class="hint">Measuring…</p>'}</div>
				<p class="hint">The colors the frame really uses (k-means in OKLab), placed by hue and chroma. A clear scheme has a dominant color (about 60%), a secondary (30%) and an accent (10%).</p>
				<h4>Luminance histogram</h4>
				<div data-hist>${result ? histogram( result.stats.histogram ) : ''}</div>
				<p class="hint">Peaks against the edges mean clipped blacks or whites; one hump in the middle means midtone mush.</p>
			</article>
			<article class="card">
				<h4>Pipeline</h4>
				<p class="hint">This look's post chain, in the order it runs. Click a step to learn it.</p>
				<ol class="strip">${chain.map( ( e ) => `<li><button class="link" data-learn-effect="${e.id}">${esc( e.label )}</button>${e.parts ? ` <span class="hint">(${esc( e.parts.join( ', ' ) )})</span>` : ''}</li>` ).join( '' ) || '<li class="hint">Nothing after the materials.</li>'}</ol>
				<h4>Buffers</h4>
				<p class="hint">What the shaders see: this is what the outline shader reads.</p>
				<div class="chips">${VIEWS.filter( ( v ) => v.buffer ).map( ( v ) => `<button data-view="${v.id}" class="${view === v.id ? 'on' : ''}" title="${esc( v.learn )}">${esc( v.label.replace( 'Buffer: ', '' ) )}</button>` ).join( '' )}</div>
			</article>`;

	}

	function critic() {

		if ( ! result ) return '<p class="hint">Measuring the frame…</p>';
		const s = result.stats;
		const head = `<p class="hint">Value range ${Math.round( s.valueRange * 100 )}% · clipped ${( s.clipped * 100 ).toFixed( 1 )}% · ${s.dominantHues} dominant hue${s.dominantHues === 1 ? '' : 's'} · focus contrast ${s.focusContrast.toFixed( 2 )} vs. edges ${s.peripheryContrast.toFixed( 2 )}</p>`;
		if ( ! result.tips.length ) return `${head}<p class="hint ok">No tips: values, color and focus look healthy in this frame.</p>`;
		const tip = ( t ) => `<div class="${t.intended ? 'intended' : 'warning'}"><p>${t.intended ? `🎨 Part of ${esc( app.look().name )}'s style (${esc( t.intended )}): ` : '💡 '}${esc( t.message )}</p><details><summary>Why</summary><p>${esc( t.why )}</p></details><button data-fix="${t.id}">${esc( t.fixLabel )}</button></div>`;
		return head + result.tips.filter( ( t ) => ! t.intended ).map( tip ).join( '' ) + result.tips.filter( ( t ) => t.intended ).map( tip ).join( '' );

	}

	async function measure() {

		if ( busy || pane.hidden || ! pane.isConnected ) return;
		busy = true;
		try {

			const r = await analyze();
			result = { ...r, palette: extractPalette( r.pixels, 6 ) };
			const c = pane.querySelector( '[data-critic]' );
			if ( c ) render();

		} finally { busy = false; }

	}

	pane.addEventListener( 'click', ( ev ) => {

		const t = ev.target.closest( 'button' );
		if ( ! t ) return;
		if ( t.dataset.view !== undefined ) { setView( t.dataset.view || null ); render(); }
		if ( t.dataset.fix ) { const tip = result?.tips.find( ( x ) => x.id === t.dataset.fix ); if ( tip ) { app.actions.applyOverrides( tip.fix ); setTimeout( measure, 300 ); } }
		if ( t.dataset.learnEffect ) { const id = byId.has( `${t.dataset.learnEffect}.enabled` ) ? `${t.dataset.learnEffect}.enabled` : [ ...byId.keys() ].find( ( k ) => k.startsWith( t.dataset.learnEffect ) ) || 'grade.toneMapping'; openLearn( id ); }

	} );

	return {
		render,
		start() { clearInterval( timer ); measure(); timer = setInterval( measure, 2500 ); },
		stop() { clearInterval( timer ); timer = 0; },
		measure,
		get result() { return result; },
	};

}
