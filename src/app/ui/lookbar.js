// Look bar (design §5.1, §6.5): one card per look. Tap applies it instantly.

import { LOOKS } from '../../content/looks/index.js';
import { h } from './dom.js';

/** A few colors that summarize a look: sky, shadow tint, palette. */
export function lookSwatches( look ) {

	const p = look.params;
	if ( look.baseline ) return [ '#87ceeb', '#ffffff', '#444444' ];
	return [ p[ 'atmosphere.sky.zenith' ], p[ 'atmosphere.sky.horizon' ], p[ 'surface.shadowTint' ], ...( p[ 'palette.colors' ] || [] ).slice( 0, 3 ), p[ 'lighting.key.color' ] ]
		.filter( Boolean ).slice( 0, 5 );

}

export function createLookBar( root, app ) {

	const cards = LOOKS.map( ( look, i ) => h( 'button.look-card', {
		dataset: { look: look.id },
		title: `${look.description}\n\nPillars:\n• ${look.pillars.join( '\n• ' )}`,
		onclick: () => app.actions.setLook( look.id ),
	},
	h( 'span.swatches', {}, lookSwatches( look ).map( ( c ) => h( 'i', { style: `background:${c}` } ) ) ),
	h( 'span.name', {}, look.name ),
	h( 'span.insp', {}, look.inspiredBy.join( ', ' ) ),
	h( 'span.tags', {}, look.tags.join( ' · ' ) ),
	h( 'kbd.key', {}, String( i + 1 ) ),
	) );

	root.append( h( 'h3', {}, 'Looks' ), ...cards, h( 'p.hint', {}, 'Q / E or LB / RB cycle looks. More looks arrive in M4.' ) );

	const sync = () => { for ( const c of cards ) c.classList.toggle( 'on', c.dataset.look === app.store.get().lookId ); };
	app.on( ( type ) => { if ( type === 'look' || type === 'resolved' ) sync(); } );
	sync();

}
