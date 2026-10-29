// Play tab (design §6.10, §7.15, §7.16): walk mode and the toybox, look zones, the level
// look plan with Play plan, player-selectable visual modes, and the gamepad tester.

import { SCENES } from '../../scenes/index.js';
import { GAMEPAD_MAP, glyphSet, deadzone, activePad } from '../input/gamepad.js';
import { esc } from './dom.js';

const TRANSITIONS = [ [ 'morph', 'Morph' ], [ 'crossfade', 'Crossfade' ], [ 'wipe', 'Wipe' ], [ 'cut', 'Cut' ] ];

export function createPlayTab( pane, app, { toast } ) {

	let raf = 0;

	const lookOptions = ( selected, none ) => [
		`<option value="">${esc( none )}</option>`,
		...app.libraryLooks().map( ( l ) => `<option value="${esc( l.id )}" ${l.id === selected ? 'selected' : ''}>${esc( l.name )}</option>` ),
	].join( '' );

	function zonesCard() {

		const zones = app.scene().zones || [];
		if ( ! zones.length ) return `<article class="card"><h4>Look zones</h4><p class="hint">This scene has no zones. Try the Torchlit Dungeon, the Dusk Campsite or Harbor Isle, then walk around.</p></article>`;
		const assigned = app.store.get().plan.zones[ app.scene().id ] || {};
		return `<article class="card">
			<h4>Look zones</h4>
			<p class="hint">Walk into a zone and its look fades in over its blend distance, like post-processing volumes in a game engine. Higher priority wins where zones overlap.</p>
			${zones.map( ( z ) => `
				<div class="zone" data-zone="${esc( z.id )}">
					<div class="row"><b>${esc( z.label )}</b> <span class="hint">${z.shape} · blend ${z.blend} m · priority ${z.priority ?? 0}</span></div>
					<div class="row"><select data-zone-look>${lookOptions( assigned[ z.id ] ?? ( typeof z.look === 'string' ? z.look : '' ), z.params || typeof z.look === 'object' ? `${z.lookName || 'Scene default'} (built in)` : 'Global look' )}</select>
					<span class="meter"><i data-weight style="width:0%"></i></span></div>
				</div>` ).join( '' )}
		</article>`;

	}

	function planCard() {

		const plan = app.store.get().plan;
		return `<article class="card">
			<h4>Level look plan</h4>
			<p class="hint">Which look each level (scene) uses, and how it changes into it. Play plan tours the levels in order, ${plan.seconds} s each.</p>
			<table class="slots plan">${SCENES.map( ( s ) => {

				const lv = plan.levels[ s.id ] || {};
				return `<tr data-level="${s.id}"><th title="${esc( s.name )}">${esc( s.name )}</th>
					<td><select data-level-look>${lookOptions( lv.look || '', 'Current look' )}</select></td>
					<td><select data-level-transition>${TRANSITIONS.map( ( [ v, l ] ) => `<option value="${v}" ${( lv.transition || 'morph' ) === v ? 'selected' : ''}>${l}</option>` ).join( '' )}</select></td></tr>`;

			} ).join( '' )}</table>
			<div class="row">
				${app.playing ? '<button data-stop-plan class="on">■ Stop</button>' : '<button data-play-plan class="primary">▶ Play plan</button>'}
				<label class="field">Seconds per level <input type="number" min="2" max="30" step="1" value="${plan.seconds}" data-plan-seconds></label>
			</div>
		</article>`;

	}

	function modesCard() {

		const { modes, mode } = app.store.get();
		return `<article class="card">
			<h4>Player visual modes</h4>
			<p class="hint">Up to four looks a player can pick in your game's settings (Classic, Comic, Retro…). M or View / Select cycles them here.</p>
			${modes.map( ( m, i ) => `
				<div class="row mode ${i === mode ? 'on' : ''}" data-mode="${i}">
					<input data-mode-name value="${esc( m.name )}" maxlength="24">
					<select data-mode-look>${lookOptions( m.look, '—' )}</select>
					<button data-mode-use title="Use this mode">${i === mode ? '●' : '○'}</button>
					<button data-mode-remove title="Remove">✕</button>
				</div>` ).join( '' )}
			<div class="row">
				${modes.length < 4 ? '<button data-mode-add>+ Add the current look</button>' : ''}
				${modes.length < 4 && ! modes.some( ( m ) => /contrast/i.test( m.name ) ) ? '<button data-mode-contrast title="Thicker lines, more value contrast, a palette safe for color-blind players">+ Suggest High-contrast</button>' : ''}
				${modes.length > 1 ? `<button data-mode-cycle class="${app.cycling ? 'on' : ''}">${app.cycling ? '■ Stop cycling' : '▶ Cycle demo'}</button>` : ''}
			</div>
		</article>`;

	}

	function padCard() {

		return `<article class="card">
			<h4>Gamepad tester</h4>
			<p class="hint" data-pad-info>Connect a gamepad and press any button.</p>
			<div class="pad-grid">${GAMEPAD_MAP.map( ( b ) => `<div class="pad-btn" data-button="${b.index}" title="${esc( b.action )}"><b data-glyph="${b.index}">${esc( b.xbox )}</b><span>${esc( b.action )}</span></div>` ).join( '' )}</div>
			<div class="row sticks">
				${[ 'Left stick', 'Right stick' ].map( ( l, i ) => `<div class="stick" data-stick="${i}"><span class="dz" style="width:${Math.round( app.store.get().deadzone * 52 + 10 )}px;height:${Math.round( app.store.get().deadzone * 52 + 10 )}px"></span><i></i><small>${l}</small></div>` ).join( '' )}
				<div class="triggers"><div>LT <span class="meter"><i data-trigger="6"></i></span></div><div>RT <span class="meter"><i data-trigger="7"></i></span></div></div>
			</div>
			<p class="hint">The dashed circle is the deadzone (${Math.round( app.store.get().deadzone * 100 )}%): inside it the stick reads zero, so a worn stick doesn't drift.</p>
			<label class="field"><input type="checkbox" data-rumble ${app.store.get().rumble !== false ? 'checked' : ''}> Rumble on look change (pads that support it)</label>
			<p class="hint">With a panel open (the tour, the brief, the audit, the key map), the D-pad moves between its controls, ←/→ change sliders and lists, A presses, B closes.</p>
		</article>`;

	}

	function render() {

		const walking = app.walking;
		const toybox = !! app.scene().spareBalls;
		pane.innerHTML = `
			<article class="card">
				<h4>Walk mode</h4>
				<p class="hint">Play the scene: the hero becomes your character, with collision and a third-person camera. ${toybox ? 'In the toybox, click or press RT to throw a ball.' : ''}</p>
				<div class="row">
					<button data-walk class="${walking ? 'on' : 'primary'}">${walking ? '■ Stop walking' : '🚶 Walk (Tab · L3)'}</button>
					${toybox ? '<button data-throw>● Throw a ball</button>' : ''}
				</div>
				<p class="hint">${walking ? 'WASD or left stick to move · Shift to run · Space or A to jump · drag or right stick to look · Tab or L3 to stop.' : 'Keyboard: Tab, then WASD, Space to jump. Gamepad: L3, left stick, A.'}</p>
				<p class="hint" data-physics></p>
			</article>
			${zonesCard()}
			${modesCard()}
			${planCard()}
			${padCard()}`;

	}

	// Live readouts: zone weights, physics, the gamepad tester.
	function frame() {

		raf = 0;
		if ( pane.hidden || ! pane.isConnected ) return;
		for ( const { zone, weight } of app.zoneWeights() ) {

			const el = pane.querySelector( `[data-zone="${zone.id}"] [data-weight]` );
			if ( el ) el.style.width = `${Math.round( weight * 100 )}%`;

		}

		const ph = pane.querySelector( '[data-physics]' );
		if ( ph ) ph.textContent = app.physics ? `Physics: ${app.physics.dynamic.length} bodies · ${app.physics.statics} static colliders · step ${app.physics.steps}` : '';

		const pad = activePad();
		const info = pane.querySelector( '[data-pad-info]' );
		if ( pad && info ) {

			const glyphs = glyphSet( pad.id );
			info.textContent = `${pad.id} · ${glyphs} glyphs · ${pad.mapping === 'standard' ? 'standard mapping' : 'non-standard mapping: buttons may be in other places'}`;
			for ( const b of GAMEPAD_MAP ) {

				const el = pane.querySelector( `[data-button="${b.index}"]` );
				if ( ! el ) continue;
				el.classList.toggle( 'down', !! pad.buttons[ b.index ]?.pressed );
				el.querySelector( 'b' ).textContent = glyphs === 'PlayStation' ? b.ps : b.xbox;

			}

			const dz = app.store.get().deadzone;
			for ( const i of [ 0, 1 ] ) {

				const [ x, y ] = deadzone( pad.axes[ i * 2 ] ?? 0, pad.axes[ i * 2 + 1 ] ?? 0, dz );
				const dot = pane.querySelector( `[data-stick="${i}"] i` );
				if ( dot ) dot.style.transform = `translate(${( pad.axes[ i * 2 ] ?? 0 ) * 26}px, ${( pad.axes[ i * 2 + 1 ] ?? 0 ) * 26}px)`;
				dot?.classList.toggle( 'live', x !== 0 || y !== 0 );

			}

			for ( const t of [ 6, 7 ] ) { const el = pane.querySelector( `[data-trigger="${t}"]` ); if ( el ) el.style.width = `${Math.round( ( pad.buttons[ t ]?.value ?? 0 ) * 100 )}%`; }

		}

		raf = requestAnimationFrame( frame );

	}

	const start = () => { if ( ! raf ) raf = requestAnimationFrame( frame ); };

	pane.addEventListener( 'click', async ( ev ) => {

		const t = ev.target.closest( 'button' );
		if ( ! t ) return;
		const a = app.actions;
		if ( t.dataset.walk !== undefined ) await a.setWalk( ! app.walking );
		if ( t.dataset.throw !== undefined ) a.throwBall();
		if ( t.dataset.playPlan !== undefined ) a.playPlan();
		if ( t.dataset.stopPlan !== undefined ) a.stopPlan();
		const row = t.closest( '[data-mode]' );
		if ( t.dataset.modeUse !== undefined ) a.setMode( Number( row.dataset.mode ) );
		if ( t.dataset.modeRemove !== undefined ) a.removeMode( Number( row.dataset.mode ) );
		if ( t.dataset.modeAdd !== undefined ) a.addMode( app.look().name, app.store.get().recipe.base );
		if ( t.dataset.modeContrast !== undefined ) { const m = a.addHighContrastMode(); toast( `Added "${m.name}": thicker lines, more value contrast, a color-blind-safe palette.` ); }
		if ( t.dataset.modeCycle !== undefined ) a.setCycling( ! app.cycling );

	} );

	pane.addEventListener( 'change', ( ev ) => {

		const t = ev.target, a = app.actions;
		const zone = t.closest( '[data-zone]' )?.dataset.zone;
		if ( t.dataset.zoneLook !== undefined ) a.setZoneLook( app.scene().id, zone, t.value || null );
		const level = t.closest( '[data-level]' )?.dataset.level;
		if ( t.dataset.levelLook !== undefined ) a.setPlanLevel( level, { look: t.value || null } );
		if ( t.dataset.levelTransition !== undefined ) a.setPlanLevel( level, { transition: t.value } );
		if ( t.dataset.planSeconds !== undefined ) a.setPlanSeconds( Number( t.value ) );
		const row = t.closest( '[data-mode]' );
		if ( t.dataset.modeName !== undefined ) a.updateMode( Number( row.dataset.mode ), { name: t.value } );
		if ( t.dataset.modeLook !== undefined ) a.updateMode( Number( row.dataset.mode ), { look: t.value } );
		if ( t.dataset.rumble !== undefined ) app.store.set( { rumble: t.checked } );

	} );

	return { render, start };

}
