// ⚡ Audit (design §6.11): pick a target, run, read the ranked costs and the phone verdict,
// make a phone-friendly variant, or open the look on a phone (QR) to audit it there.

import { AUDIT_TARGETS, reportText } from '../perf/audit.js';
import { BUDGETS, VERDICTS } from '../../runtime/perf/cost-model.js';
import { h, esc } from './dom.js';

export function createAuditModal( root, app, { run, phoneUrl, env, toast } ) {

	let target = 'desktop', report = null, running = false, progress = '';

	function chart( r ) {

		const max = Math.max( 1e-6, ...r.effects.map( ( e ) => e.marginal ) );
		return `<div class="bars">${r.effects.map( ( e ) => `
			<div class="bar-row" title="${esc( `${e.label}: ${e.marginal} ms marginal, ${e.pct}% of the frame; rubric ${e.fpeRubric} FPE` )}">
				<span class="bar-label">${esc( e.label )}</span>
				<span class="bar"><i style="width:${Math.round( 100 * e.marginal / max )}%"></i></span>
				<span class="bar-value">${e.marginal} ms · ${e.pct}%</span>
			</div>` ).join( '' ) || '<p class="hint">No removable effects: the look is all in the materials.</p>'}</div>`;

	}

	function render() {

		const r = report;
		root.replaceChildren( h( 'div.modal-box.audit-box', {},
			h( 'header', {}, h( 'b', {}, `⚡ Audit · ${app.look().name}` ), h( 'button.close', { onclick: close }, '✕' ) ),
			h( 'div.audit-body', { html: `
				<p class="hint">Ranks this look's effects by GPU cost: each one is removed in turn and the frame re-measured (leave-one-out), after a warm-up, over interleaved rounds. The rubric's phone verdict is an honest estimate until on-device runs replace the budget table.</p>
				<div class="row">
					<label class="field">Target <select data-target ${running ? 'disabled' : ''}>${Object.entries( AUDIT_TARGETS ).map( ( [ k, t ] ) => `<option value="${k}" ${k === target ? 'selected' : ''}>${esc( t.label )}</option>` ).join( '' )}</select></label>
					<button class="primary" data-run ${running ? 'disabled' : ''}>${running ? 'Running…' : '▶ Run audit'}</button>
					<button data-phone title="A QR code that opens this look on your phone and runs the audit there">📱 Open on phone</button>
				</div>
				${running ? `<p class="hint" data-progress>${esc( progress )}</p>` : ''}
				<div data-qr></div>
				${r ? `
					<h4>Marginal cost per effect (${r.targetLabel}, ${r.timer} timer)</h4>
					${chart( r )}
					<p>Full ${r.totals.full} ms · plain ${r.totals.plain} ms · effects sum ${r.totals.sumMarginal} ms <span class="hint">(the rest, ${r.totals.interaction} ms, is the styled materials and effects interacting)</span></p>
					<p><b>${esc( r.rubric.label )}</b> <span class="hint">· ${r.rubric.total} FPE (budgets: ${BUDGETS.map( ( b ) => `${b.label.split( ',' )[ 0 ]} ${b.fpe}` ).join( ' · ' )}; 1 FPE = ${r.calibration.msPerFpe} ms here)</span></p>
					<h4>Recommendations</h4><ul>${r.recommendations.map( ( t ) => `<li>${esc( t )}</li>` ).join( '' )}</ul>
					<details><summary>Variants and stats</summary>
						<table class="readouts">${r.variants.map( ( v ) => `<tr><td>${esc( v.label )}</td><td>median ${v.median} ms</td><td>p90 ${v.p90} ms</td><td>compile ${v.compileMs} ms</td></tr>` ).join( '' )}</table>
						<p class="hint">Draw calls ${r.stats.drawCalls} · triangles ${r.stats.triangles} · attachments ${r.stats.mrtAttachments} (${esc( r.stats.buffers.join( ', ' ) || 'color only' )}) · render targets ≈ ${r.stats.renderTargetMB} MB</p>
					</details>
					<p class="hint">Mobile GPUs are tile-based: fullscreen passes and extra buffers cost memory bandwidth, MSAA is comparatively cheap. Fewer passes beat cheaper math.</p>
					<div class="row"><button data-copy>Copy report</button><button data-variant>📱 Make phone-friendly variant</button></div>` : ''}
			` } ),
		) );
		root.hidden = false;

	}

	async function start() {

		running = true;
		report = null;
		render();
		try {

			report = await run( { target, onProgress: ( f, text ) => { progress = `${Math.round( f * 100 )}% · ${text}`; const p = root.querySelector( '[data-progress]' ); if ( p ) p.textContent = progress; } } );

		} catch ( e ) {

			toast( `Audit failed: ${e.message}`, 6000 );

		} finally {

			running = false;
			render();

		}

	}

	root.addEventListener( 'change', ( ev ) => { if ( ev.target.dataset.target !== undefined ) target = ev.target.value; } );
	root.addEventListener( 'click', async ( ev ) => {

		const t = ev.target.closest( 'button' );
		if ( ! t ) return;
		if ( t.dataset.run !== undefined ) start();
		if ( t.dataset.copy !== undefined ) { try { await navigator.clipboard.writeText( reportText( report, env() ) ); toast( 'Report copied. Paste it back to update the phone budgets.' ); } catch { toast( 'Copy failed.' ); } }
		if ( t.dataset.variant !== undefined ) { const v = app.actions.makeMobileVariant(); toast( `Saved "${v.look.name}" (${v.verdict}): ${v.changes.length} change${v.changes.length === 1 ? '' : 's'}.`, 6000 ); }
		if ( t.dataset.phone !== undefined ) {

			const url = await phoneUrl( target.startsWith( 'phone' ) ? target : 'phone-portrait' );
			const box = root.querySelector( '[data-qr]' );
			try {

				const { renderSVG } = await import( 'uqr' );
				box.innerHTML = `<div class="qr">${renderSVG( url, { ecc: 'L', border: 2 } )}</div><p class="hint">Scan with your phone. It opens this look and runs the audit for a phone screen; then press Copy report there and paste it back. The phone has to reach this page: host the file (e.g. GitHub Pages) or use a local network address.</p><textarea class="report share-url" readonly>${esc( url )}</textarea>`;

			} catch ( e ) { box.textContent = e.message; }

		}

	} );
	root.addEventListener( 'pointerdown', ( ev ) => { if ( ev.target === root && ! running ) close(); } );

	function close() { if ( ! running ) root.hidden = true; }

	return {
		open: ( opts = {} ) => { if ( opts.target ) target = opts.target; render(); if ( opts.run ) start(); },
		close,
		get report() { return report; },
		get running() { return running; },
		VERDICTS,
	};

}
