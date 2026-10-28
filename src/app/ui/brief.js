// Brief and export (design §6.12): the agent brief in three targets and three lengths, the
// export bundle file by file, the runtime API at a glance, and the share link with a QR code.

import { BRIEF_TARGETS, BRIEF_LENGTHS } from '../../runtime/brief/brief.js';
import { briefText, exportFiles, download, exportState } from '../export/exports.js';
import { h, esc } from './dom.js';

const TABS = [ [ 'brief', '📝 Brief' ], [ 'files', '⇩ Files' ], [ 'runtime', '⟨⟩ Runtime' ], [ 'share', '🔗 Share' ] ];

const RUNTIME_SAMPLE = ( look ) => `<!-- index.html: the import map from starter.html, then: -->
<script type="module">
import * as THREE from 'three/webgpu';
import { createStyle } from './stylelab-runtime.js';
import { house, tree, character, createRng } from './stylelab-kit.js';
import LOOK from './${look.id}.look.json' with { type: 'json' };

const renderer = new THREE.WebGPURenderer( { antialias: false } );
await renderer.init();
document.body.append( renderer.domElement );
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 50, innerWidth / innerHeight, 0.1, 500 );

// Build in code, like the kit: part-tagged, seeded, tiered.
const style = await createStyle( { renderer, scene, camera, looks: [ LOOK ] } );
const ground = new THREE.Mesh( new THREE.PlaneGeometry( 40, 40 ).rotateX( - Math.PI / 2 ),
	style.material( { part: 'terrain', color: '#8fbf5a' } ) );
style.add( ground );
style.add( house( 1, { wall: '#f2e6d0', roof: '#c0392b', trim: '#fff', door: '#6d4c41' } ) );

renderer.setAnimationLoop( () => { /* your game update */ style.render(); } );
</script>`;

export function createBriefModal( root, app, { share, toast } ) {

	let tab = 'brief', target = 'runtime', length = 'standard', text = '', url = '';

	async function render() {

		const s = exportState( app );
		root.replaceChildren( h( 'div.modal-box.brief-box', {},
			h( 'header', {}, h( 'b', {}, `Brief & export · ${s.look.name}` ), h( 'button.close', { onclick: close }, '✕' ) ),
			h( 'nav.tabs', {}, TABS.map( ( [ id, label ] ) => h( 'button', { class: tab === id ? 'on' : '', onclick: () => { tab = id; render(); } }, label ) ) ),
			h( 'div.brief-body', { html: '<p class="hint">Preparing…</p>' } ),
		) );
		root.hidden = false;
		app.emit( 'brief-tab', tab ); // lessons wait on the tab a step names
		const body = root.querySelector( '.brief-body' );

		if ( tab === 'brief' ) {

			url = await share();
			text = briefText( app, { target, length, shareUrl: url } );
			body.innerHTML = `
				<div class="row">
					<label class="field">For <select data-target>${Object.entries( BRIEF_TARGETS ).map( ( [ k, v ] ) => `<option value="${k}" ${k === target ? 'selected' : ''}>${esc( v )}</option>` ).join( '' )}</select></label>
					<label class="field">Length <select data-length>${Object.entries( BRIEF_LENGTHS ).map( ( [ k, v ] ) => `<option value="${k}" ${k === length ? 'selected' : ''}>${esc( v )}</option>` ).join( '' )}</select></label>
					<span class="hint">${text.split( /\s+/ ).length} words</span>
				</div>
				<p class="hint">Paste this into your agent's instructions (a system prompt, CLAUDE.md or AGENTS.md). Short fits a system prompt; Standard is for project instructions; Full has every value and per-part tables.</p>
				<textarea class="report brief-text" readonly>${esc( text )}</textarea>
				<div class="row"><button class="primary" data-copy>Copy brief</button><button data-save>Download STYLE.md</button></div>`;

		}

		if ( tab === 'files' ) {

			body.innerHTML = `<p class="hint">Hand these to your agent with the brief. The runtime and kit are the same code this tool runs.</p>
				<table class="files">${exportFiles( app, { share } ).map( ( f, i ) => `<tr><td><code>${esc( f.name )}</code><br><span class="hint">${esc( f.about )}</span></td><td><button data-file="${i}">⇩</button></td></tr>` ).join( '' )}</table>`;

		}

		if ( tab === 'runtime' ) {

			body.innerHTML = `<p class="hint">The exported runtime is an ES module with no DOM access. <code>createStyle()</code> takes your renderer, scene and camera; materials come from <code>style.material()</code>; <code>style.convertScene()</code> retrofits an existing game in one call; <code>style.setLook()</code> switches looks with a transition; <code>style.setZoneWeights()</code> drives look zones from your trigger volumes.</p>
				<pre class="code">${esc( RUNTIME_SAMPLE( s.look ) )}</pre>
				<div class="row"><button data-copy-code>Copy example</button></div>
				<p class="hint">Existing game? <code>style.convertScene( scene )</code> keeps every mesh's color, guesses its part (terrain, foliage, characters…) from names and shape, and swaps in style materials.</p>`;

		}

		if ( tab === 'share' ) {

			url = await share();
			body.innerHTML = `<p class="hint">The link holds the whole state (scene, look, mix, parts, tweaks), compressed into the URL. No server; anyone with the link and the tool sees what you see.</p>
				<textarea class="report share-url" readonly>${esc( url )}</textarea>
				<div class="row"><button class="primary" data-copy-url>Copy link</button><span class="hint">${url.length} characters</span></div>
				<div class="qr" data-qr><p class="hint">Rendering QR code…</p></div>`;
			try {

				const { renderSVG } = await import( 'uqr' );
				body.querySelector( '[data-qr]' ).innerHTML = `${renderSVG( url, { ecc: 'L', border: 2 } )}<p class="hint">Scan to open on a phone (the phone needs to reach the same file or site).</p>`;

			} catch ( e ) {

				body.querySelector( '[data-qr]' ).innerHTML = `<p class="hint">QR code unavailable: ${esc( e.message )}</p>`;

			}

		}

	}

	root.addEventListener( 'change', ( ev ) => {

		if ( ev.target.dataset.target !== undefined ) { target = ev.target.value; render(); }
		if ( ev.target.dataset.length !== undefined ) { length = ev.target.value; render(); }

	} );

	root.addEventListener( 'click', async ( ev ) => {

		const t = ev.target.closest( 'button' );
		if ( ! t ) return;
		const copy = async ( value, what ) => { try { await navigator.clipboard.writeText( value ); toast( `${what} copied.` ); } catch { toast( 'Copy failed: select the text and copy it.' ); } };
		if ( t.dataset.copy !== undefined ) copy( text, 'Brief' );
		if ( t.dataset.save !== undefined ) download( 'STYLE.md', text, 'text/markdown' );
		if ( t.dataset.copyCode !== undefined ) copy( RUNTIME_SAMPLE( exportState( app ).look ), 'Example' );
		if ( t.dataset.copyUrl !== undefined ) copy( url, 'Link' );
		if ( t.dataset.file !== undefined ) {

			const f = exportFiles( app, { share } )[ Number( t.dataset.file ) ];
			t.disabled = true;
			t.textContent = '…';
			try { download( f.name, await f.make(), f.type ); } catch ( e ) { toast( `${f.name}: ${e.message}`, 6000 ); } finally { t.disabled = false; t.textContent = '⇩'; }

		}

	} );

	root.addEventListener( 'pointerdown', ( ev ) => { if ( ev.target === root ) close(); } );

	function close() { root.hidden = true; }

	return { open: ( which = tab ) => { tab = which; render(); }, close, get isOpen() { return ! root.hidden; } };

}
