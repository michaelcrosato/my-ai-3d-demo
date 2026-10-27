// Top bar (design §5.1): scene picker, complexity tiers, shots, turntable.

import { SCENES, TIERS } from '../../scenes/index.js';
import { $, h } from './dom.js';

export function createTopBar( app ) {

	const sceneSelect = $( 'scene-select' );
	sceneSelect.append( ...SCENES.map( ( s ) => h( 'option', { value: s.id }, s.name ) ) );
	sceneSelect.addEventListener( 'change', () => app.actions.setScene( sceneSelect.value ) );

	const tier = $( 'tier-range' );
	tier.max = String( TIERS.length - 1 );
	tier.addEventListener( 'input', () => app.actions.setTier( Number( tier.value ) ) );
	const tierLabel = $( 'tier-label' );

	const shotSelect = $( 'shot-select' );
	shotSelect.addEventListener( 'change', () => app.actions.setShot( shotSelect.value ) );

	const turntable = $( 'turntable-btn' );
	turntable.addEventListener( 'click', () => app.actions.setTurntable( ! app.store.get().turntable ) );

	const sync = () => {

		const s = app.store.get();
		const imported = app.scene().imported ? app.scene() : null;
		let opt = sceneSelect.querySelector( 'option[value="import"]' );
		if ( imported && ! opt ) sceneSelect.append( opt = h( 'option', { value: 'import' }, imported.name ) );
		if ( opt && imported ) opt.textContent = imported.name;
		sceneSelect.value = app.scene().id;
		tier.value = String( s.tier );
		tierLabel.textContent = TIERS[ s.tier ].name;
		const shots = app.scene().shots;
		tier.disabled = !! imported;
		if ( shotSelect.dataset.scene !== app.scene().name ) {

			shotSelect.replaceChildren( ...Object.entries( shots ).map( ( [ id, shot ] ) => h( 'option', { value: id }, shot.label ) ) );
			shotSelect.dataset.scene = app.scene().name;

		}

		shotSelect.value = app.shotId();
		turntable.classList.toggle( 'on', s.turntable );

	};

	app.on( ( type ) => { if ( [ 'scene', 'shot', 'turntable', 'imported' ].includes( type ) ) sync(); } );
	sync();

}
