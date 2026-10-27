// Verify panel shell (design §6.14): checklist, spikes, environment & errors, report.

import { CHECKS } from './checks.js';
import { formatReport } from './report.js';

const STORE_KEY = 'stylelab.verify.v1';
const ACTION_LABELS = { runSpikes: '▶ Run all spikes', reloadWebGL: '↻ Reload with WebGL2' };

function load() {

	try { return JSON.parse( localStorage.getItem( STORE_KEY ) ) || {}; } catch { return {}; }

}

function save( data ) {

	try { localStorage.setItem( STORE_KEY, JSON.stringify( data ) ); } catch { /* storage unavailable: results last for this visit only */ }

}

const esc = ( s ) => String( s ).replace( /[&<>"]/g, ( c ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } )[ c ] );

/**
 * @param {object} o
 * @param {HTMLElement} o.root - the drawer element
 * @param {object} o.build - {version, commit}
 * @param {() => object} o.getEnv
 * @param {object} o.log - error capture
 * @param {() => object} o.getPerf
 * @param {(onResult: Function) => Promise<object[]>} o.runSpikes
 */
export function createVerifyPanel( { root, build, getEnv, log, getPerf, runSpikes } ) {

	const store = load();
	const key = `${build.version}+${build.commit}`;
	// Spike results are kept per backend, so one report covers the WebGPU and the WebGL2 run.
	const state = store[ key ] || ( store[ key ] = { checks: {}, spikeRuns: {} } );
	const backend = () => getEnv().backend;
	const currentSpikes = () => state.spikeRuns[ backend() ] || [];
	let tab = 'checklist';
	let running = false;

	const persist = () => save( store );
	const checks = () => CHECKS.map( ( c ) => ( { ...c, ...state.checks[ c.id ] } ) );
	const report = () => formatReport( { build, env: getEnv(), checks: checks(), spikeRuns: state.spikeRuns, log: log.entries, perf: getPerf() } );

	const actions = {
		runSpikes: () => { tab = 'spikes'; render(); startSpikes(); },
		reloadWebGL: () => { const u = new URL( location.href ); u.searchParams.set( 'backend', 'webgl' ); location.href = u.href; },
	};

	async function startSpikes() {

		if ( running ) return;
		running = true;
		const results = state.spikeRuns[ backend() ] = [];
		render();
		await runSpikes( ( r ) => { results.push( r ); persist(); render(); } );
		running = false;
		render();

	}

	const views = {

		checklist: () => `
			<p class="hint">Work through these, then copy the report from the Report tab and paste it back to me.</p>
			${checks().map( ( c ) => `
				<section class="check" data-id="${c.id}">
					<h4><span class="cid">${c.id}</span> ${esc( c.title )}</h4>
					<ol>${c.steps.map( ( s ) => `<li>${esc( s )}</li>` ).join( '' )}</ol>
					<p class="expected"><b>Expected:</b> ${esc( c.expected )}</p>
					<div class="row">
						${[ 'pass', 'fail', 'unsure' ].map( ( s ) => `<button class="status ${c.status === s ? 'on ' + s : ''}" data-status="${s}">${{ pass: '✅ Pass', fail: '❌ Fail', unsure: '⚠️ Unsure' }[ s ]}</button>` ).join( '' )}
						${( c.actions || [] ).map( ( a ) => `<button data-action="${a}" ${a === 'runSpikes' && running ? 'disabled' : ''}>${ACTION_LABELS[ a ] || 'Set it up for me'}</button>` ).join( '' )}
					</div>
					<textarea placeholder="Notes (what you saw)" data-note>${esc( c.note || '' )}</textarea>
				</section>` ).join( '' )}`,

		spikes: () => `
			<div class="row"><button class="primary" data-run ${running ? 'disabled' : ''}>${running ? 'Running…' : 'Run all spikes'}</button>
			<span class="hint">Runs offscreen at 256×256 on the current backend (${esc( backend() )}).${Object.keys( state.spikeRuns ).filter( ( b ) => b !== backend() && state.spikeRuns[ b ].length ).map( ( b ) => ` Your ${esc( b )} run is kept for the report.` ).join( '' )}</span></div>
			${currentSpikes().map( ( r ) => `
				<details class="spike ${r.status}" ${r.status !== 'go' ? 'open' : ''}>
					<summary><span class="chip ${r.status}">${r.status}</span> S${r.id} ${esc( r.title )} <span class="ms">${r.ms} ms</span></summary>
					${r.error ? `<pre class="err">${esc( r.error )}</pre>` : ''}
					<table>${r.checks.map( ( c ) => `<tr class="${c.info ? 'info' : c.pass ? 'ok' : 'bad'}"><td>${c.info ? 'ℹ️' : c.pass ? '✓' : '✗'}</td><td>${esc( c.name )}</td><td><code>${esc( JSON.stringify( c.value ) )}</code></td><td>${esc( c.expect || '' )}</td></tr>` ).join( '' )}</table>
					${r.notes.map( ( n ) => `<p class="hint">${esc( n )}</p>` ).join( '' )}
				</details>` ).join( '' )}`,

		environment: () => {

			const env = getEnv();
			return `
				<table class="env">${Object.entries( env ).filter( ( [ k ] ) => k !== 'features' ).map( ( [ k, v ] ) => `<tr><td>${esc( k )}</td><td><code>${esc( typeof v === 'object' ? JSON.stringify( v ) : v )}</code></td></tr>` ).join( '' )}</table>
				${env.features ? `<details><summary>${env.features.length} GPU features</summary><code>${esc( env.features.join( ', ' ) )}</code></details>` : ''}
				<h4>Errors (${log.errors().length}) and warnings (${log.warnings().length})</h4>
				${log.entries.length ? log.entries.map( ( e ) => `<pre class="${e.level === 'error' ? 'err' : 'warn'}">${e.count > 1 ? `×${e.count} ` : ''}${esc( e.message )}</pre>` ).join( '' ) : '<p class="hint">Nothing captured.</p>'}`;

		},

		report: () => `
			<div class="row"><button class="primary" data-copy>Copy report</button><button data-download>Download JSON</button><span class="hint" data-copied></span></div>
			<textarea class="report" readonly>${esc( report() )}</textarea>`,

	};

	function render() {

		root.innerHTML = `
			<header><b>🧪 Verify</b><span class="hint">v${esc( build.version )} (${esc( build.commit )})</span><button class="close" data-close aria-label="Close">✕</button></header>
			<nav>${Object.keys( views ).map( ( t ) => `<button class="${t === tab ? 'on' : ''}" data-tab="${t}">${t[ 0 ].toUpperCase() + t.slice( 1 )}${t === 'environment' && log.errors().length ? ` <span class="count">${log.errors().length}</span>` : ''}</button>` ).join( '' )}</nav>
			<div class="body">${views[ tab ]()}</div>`;

	}

	root.addEventListener( 'click', async ( e ) => {

		const t = e.target.closest( 'button' );
		if ( ! t ) return;
		if ( t.dataset.close !== undefined ) return toggle( false );
		if ( t.dataset.tab ) { tab = t.dataset.tab; return render(); }
		if ( t.dataset.run !== undefined ) return startSpikes();
		if ( t.dataset.action ) return actions[ t.dataset.action ]();

		if ( t.dataset.status ) {

			const id = t.closest( '.check' ).dataset.id;
			const entry = state.checks[ id ] || ( state.checks[ id ] = {} );
			entry.status = entry.status === t.dataset.status ? undefined : t.dataset.status;
			persist();
			return render();

		}

		if ( t.dataset.copy !== undefined ) {

			const text = report();
			const done = ( msg ) => { const s = root.querySelector( '[data-copied]' ); if ( s ) s.textContent = msg; };
			try { await navigator.clipboard.writeText( text ); done( 'Copied.' ); } catch { root.querySelector( 'textarea.report' ).select(); done( 'Press Ctrl/⌘+C to copy.' ); }
			return;

		}

		if ( t.dataset.download !== undefined ) {

			const data = { build, env: getEnv(), checks: checks(), spikeRuns: state.spikeRuns, log: log.entries, perf: getPerf() };
			const a = document.createElement( 'a' );
			a.href = URL.createObjectURL( new Blob( [ JSON.stringify( data, null, 2 ) ], { type: 'application/json' } ) );
			a.download = `stylelab-verify-${build.version}.json`;
			a.click();
			setTimeout( () => URL.revokeObjectURL( a.href ), 1000 );

		}

	} );

	root.addEventListener( 'input', ( e ) => {

		if ( e.target.dataset.note === undefined ) return;
		const id = e.target.closest( '.check' ).dataset.id;
		( state.checks[ id ] || ( state.checks[ id ] = {} ) ).note = e.target.value;
		persist();

	} );

	function toggle( open = root.hidden ) {

		root.hidden = ! open;
		if ( open ) render();

	}

	log.onChange( () => { if ( ! root.hidden && tab === 'environment' ) render(); } );

	/** Records spike results run outside the panel (test API), so the report includes them. */
	function setSpikes( results ) {

		state.spikeRuns[ backend() ] = results;
		persist();
		if ( ! root.hidden ) render();

	}

	return { toggle, startSpikes, setSpikes, report, render, get spikes() { return currentSpikes(); } };

}
