// Scene tab (design §6.1, §6.2): scene cards with designer notes, shots, prop density,
// readouts, the benefit-matrix snapshot, .glb import and the pick tool.

import { SCENES, TIERS, DENSITY } from '../../scenes/index.js';
import { PARTS } from '../../runtime/registry/index.js';
import { esc } from './dom.js';

/**
 * @param {HTMLElement} pane
 * @param {object} app
 * @param {object} o - { readouts: () => object, benefitMatrix: () => Promise<string>, showImage: (url, title) => void, toast }
 */
export function createSceneTab( pane, app, { readouts, benefitMatrix, showImage, toast } ) {

	let picking = false;
	let picked = null;

	const render = () => {

		const s = app.store.get();
		const scene = app.scene();
		const r = readouts();
		const imported = !! scene.imported;

		pane.innerHTML = `
			<article class="card">
				<h3>${esc( scene.name )}</h3>
				<p class="hint">Inspired by ${esc( scene.inspiredBy.join( ', ' ) )} · ${esc( scene.genre )}</p>
				<p>${esc( scene.notes )}</p>
				<h4>Shots</h4>
				<div class="row">${Object.entries( scene.shots ).map( ( [ id, shot ] ) => `<button data-shot="${id}" class="${app.shotId() === id ? 'on' : ''}">${esc( shot.label )}</button>` ).join( '' )}</div>
				<h4>Prop density</h4>
				<label class="strength">${imported ? '<span class="hint">Built-in scenes only</span>' : `<input type="range" min="${DENSITY.min}" max="${DENSITY.max}" step="0.25" value="${s.density}" data-density> <span>×${s.density}</span>`}</label>
				<h4>Readouts</h4>
				<table class="readouts">
					<tr><td>Triangles</td><td>${( r.triangles / 1000 ).toFixed( 1 )}k</td><td>Draw calls</td><td>${r.calls}</td></tr>
					<tr><td>Objects</td><td>${r.objects}</td><td>Materials</td><td>${r.materials}</td></tr>
					<tr><td>Geometries</td><td>${r.geometries}</td><td>Built in</td><td>${r.buildMs} ms</td></tr>
				</table>
				<p class="hint">Draw calls count both render sets (styled and the plain baseline) plus shadow maps.</p>
				<div class="row">
					<button data-matrix ${imported ? 'disabled' : ''} title="Plain vs. styled at Blockout and Detailed, with the current look">▦ Benefit matrix</button>
					<button data-import title="Load your own .glb or .gltf (or drop a file anywhere)">⇪ Import .glb…</button>
					<button data-pick class="${picking ? 'on' : ''}" title="Click objects in the view to see and change their part">⌖ Pick parts</button>
				</div>
				<input type="file" accept=".glb,.gltf,model/gltf-binary" data-file hidden>
				${picking ? pickPanel() : ''}
			</article>
			<h4 class="section">All scenes</h4>
			<div class="scene-cards">${SCENES.map( ( sc ) => `
				<button class="scene-card ${sc.id === scene.id ? 'on' : ''}" data-scene="${sc.id}">
					<b>${esc( sc.name )}</b>
					<span class="hint">${esc( sc.inspiredBy.join( ', ' ) )}</span>
					<span class="hint">${esc( sc.genre )}</span>
				</button>` ).join( '' )}
			</div>
			<p class="hint">${esc( TIERS[ s.tier ].name )} tier. Complexity and density keep the layout and camera; only geometry and prop counts change.</p>`;

	};

	const pickPanel = () => {

		if ( ! picked ) return '<p class="hint pick-hint">Click an object in the view.</p>';
		return `
			<div class="pick">
				<p><b>${esc( picked.name )}</b> · guessed by: ${esc( picked.reason )}</p>
				<label class="field">Part <select data-part>${PARTS.map( ( p ) => `<option ${p === picked.part ? 'selected' : ''}>${p}</option>` ).join( '' )}</select></label>
			</div>`;

	};

	pane.addEventListener( 'click', async ( ev ) => {

		const t = ev.target.closest( 'button' );
		if ( ! t ) return;
		if ( t.dataset.shot ) return app.actions.setShot( t.dataset.shot );
		if ( t.dataset.scene ) return app.actions.setScene( t.dataset.scene );
		if ( t.dataset.import !== undefined ) return pane.querySelector( '[data-file]' ).click();
		if ( t.dataset.pick !== undefined ) { picking = ! picking; picked = null; render(); return; }
		if ( t.dataset.matrix !== undefined ) {

			t.disabled = true;
			t.textContent = 'Rendering…';
			try { showImage( await benefitMatrix(), `Benefit matrix: ${app.look().name} on ${app.scene().name}` ); } catch ( e ) { toast( `Benefit matrix failed: ${e.message}` ); }
			render();

		}

	} );

	pane.addEventListener( 'input', ( ev ) => {

		if ( ev.target.dataset.density === undefined ) return;
		ev.target.nextElementSibling.textContent = `×${ev.target.value}`;

	} );

	pane.addEventListener( 'change', async ( ev ) => {

		const t = ev.target;
		if ( t.dataset.density !== undefined ) app.actions.setDensity( Number( t.value ) );
		if ( t.dataset.part !== undefined && picked ) app.actions.setPart( picked.mesh, t.value );
		if ( t.dataset.file !== undefined && t.files[ 0 ] ) await importFile( t.files[ 0 ] );

	} );

	async function importFile( file ) {

		toast( `Importing ${file.name}…` );
		try {

			const r = await app.actions.importModel( await file.arrayBuffer(), file.name );
			const counts = {};
			for ( const g of r.guesses ) counts[ g.part ] = ( counts[ g.part ] || 0 ) + 1;
			toast( `Imported ${r.meshes} meshes: ${Object.entries( counts ).map( ( [ p, n ] ) => `${n} ${p}` ).join( ', ' )}${r.warnings.length ? ` · ${r.warnings.join( ' ' )}` : ''}`, 7000 );
			picking = true;

		} catch ( e ) {

			toast( `Import failed: ${e.message}`, 7000 );

		}

		render();

	}

	app.on( ( type, detail ) => {

		if ( type === 'pick' ) { picked = detail; if ( picking ) render(); }
		if ( [ 'scene', 'shot', 'imported' ].includes( type ) ) { picked = null; render(); }

	} );

	return { render, importFile, get picking() { return picking; } };

}
