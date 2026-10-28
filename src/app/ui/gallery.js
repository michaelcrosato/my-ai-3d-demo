// Look gallery (design §6.5): one card per look family with live thumbnails of the
// current scene, filter chips, variant chips, and My looks. Tap applies a look (with the
// current transition); drag a card onto a recipe row to take that module from it.

import { h, esc } from './dom.js';

const CHIPS = [ [ 'all', 'All' ], [ 'toon', 'Toon' ], [ 'ink', 'Ink' ], [ 'paint', 'Paint' ], [ 'retro', 'Retro' ], [ 'lighting', 'Lighting' ], [ 'film', 'Film' ], [ 'phone-safe', 'Phone-safe' ], [ 'mine', 'My looks' ] ];
const PHONE = { cheap: '🟢', medium: '🟡', heavy: '🔴' };

/** A few colors that summarize a look: sky, shadow tint, palette. */
export function lookSwatches( look ) {

	const p = look.params || {};
	if ( look.baseline ) return [ '#87ceeb', '#ffffff', '#444444' ];
	return [ p[ 'atmosphere.sky.zenith' ], p[ 'atmosphere.sky.horizon' ], p[ 'surface.shadowTint' ], ...( p[ 'palette.colors' ] || [] ).slice( 0, 3 ), p[ 'lighting.key.color' ] ]
		.filter( Boolean ).slice( 0, 5 );

}

/**
 * @param {HTMLElement} root
 * @param {object} app
 * @param {object} o - { thumbnails: (ids) => Promise<{[id]: dataURL}> }
 */
export function createGallery( root, app, { thumbnails } ) {

	let filter = 'all';
	const thumbs = new Map(); // `${scene}|${lookId}` → data URL
	let rendering = false;

	const chips = h( 'div.chips' );
	const list = h( 'div.gallery' );
	const foot = h( 'div.gallery-foot' );
	root.append( h( 'h3', {}, 'Looks' ), chips, list, foot );

	const families = () => app.lookFamilies();

	const matches = ( look ) => filter === 'all' || ( filter === 'mine' ? look.user : ( look.tags || [] ).includes( filter ) || ( filter === 'phone-safe' && look.phone === 'cheap' ) );

	function card( variants, index ) {

		const current = app.store.get().recipe.base;
		const active = variants.find( ( l ) => l.id === current ) || variants[ 0 ];
		const thumb = thumbs.get( `${app.scene().id}|${active.id}` );
		const el = h( 'div.look-card', {
			dataset: { look: active.id },
			draggable: 'true',
			title: `${active.description || ''}\n\nPillars:\n• ${( active.pillars || [] ).join( '\n• ' )}`,
			ondragstart: ( ev ) => { ev.dataTransfer.setData( 'text/stylelab-look', active.id ); ev.dataTransfer.effectAllowed = 'copy'; },
		},
		thumb ? h( 'img.thumb', { src: thumb, alt: '' } ) : h( 'span.swatches', {}, lookSwatches( active ).map( ( c ) => h( 'i', { style: `background:${c}` } ) ) ),
		h( 'button.apply', { onclick: () => app.actions.setLook( active.id ) },
			h( 'span.name', {}, active.name.replace( / · .*$/, '' ) ),
			h( 'span.insp', {}, ( active.inspiredBy || [] ).join( ', ' ) ),
			h( 'span.tags', {}, `${PHONE[ active.phone ] || ''} ${( active.tags || [] ).slice( 0, 3 ).join( ' · ' )}` ),
		),
		variants.length > 1 ? h( 'span.variants', {}, variants.map( ( l ) => h( 'button', { class: l.id === current ? 'on' : '', onclick: () => app.actions.setLook( l.id ) }, l.name.includes( ' · ' ) ? l.name.split( ' · ' )[ 1 ] : 'Classic' ) ) ) : null,
		index < 9 && filter === 'all' ? h( 'kbd.key', {}, String( index + 1 ) ) : null,
		);
		el.classList.toggle( 'on', variants.some( ( l ) => l.id === current ) );
		return el;

	}

	function render() {

		chips.replaceChildren( ...CHIPS.map( ( [ id, label ] ) => h( 'button', { class: filter === id ? 'on' : '', onclick: () => { filter = id; render(); } }, label ) ) );
		const fams = families().filter( ( vs ) => vs.some( matches ) );
		list.replaceChildren( ...( fams.length ? fams.map( card ) : [ h( 'p.hint', {}, filter === 'mine' ? 'No saved looks yet. Mix and tune, then Look tab → Save as look. You can also drop a look .json here.' : 'No looks match.' ) ] ) );
		foot.replaceChildren(
			h( 'button', { disabled: rendering, title: 'Render a small preview of every look on this scene', onclick: refresh }, rendering ? 'Rendering previews…' : '🖼 Previews' ),
			h( 'p.hint', {}, 'Q / E or LB / RB cycle looks. Drag a card onto a recipe row to take that module from it.' ),
		);

	}

	async function refresh() {

		if ( rendering ) return;
		rendering = true;
		render();
		try {

			const scene = app.scene().id;
			const ids = families().map( ( vs ) => ( vs.find( ( l ) => l.id === app.store.get().recipe.base ) || vs[ 0 ] ).id ).filter( ( id ) => ! thumbs.has( `${scene}|${id}` ) );
			const urls = await thumbnails( ids, ( id, url ) => { thumbs.set( `${scene}|${id}`, url ); render(); } );
			for ( const [ id, url ] of Object.entries( urls ) ) thumbs.set( `${scene}|${id}`, url );

		} finally {

			rendering = false;
			render();

		}

	}

	app.on( ( type ) => { if ( [ 'look', 'recipe', 'scene', 'library' ].includes( type ) ) render(); } );
	render();
	return { render, refresh, setFilter: ( f ) => { filter = f; render(); } };

}
