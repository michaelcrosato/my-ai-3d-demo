// Tiny DOM helpers (no framework, design §7.1).

export const $ = ( id ) => document.getElementById( id );

export const esc = ( s ) => String( s ).replace( /[&<>"]/g, ( c ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } )[ c ] );

/** h('button.primary', { onclick }, 'Label', child) */
export function h( spec, attrs = {}, ...children ) {

	const [ tag, ...classes ] = spec.split( '.' );
	const el = document.createElement( tag || 'div' );
	if ( classes.length ) el.className = classes.join( ' ' );

	for ( const [ k, v ] of Object.entries( attrs || {} ) ) {

		if ( v === undefined || v === null || v === false ) continue;
		if ( k.startsWith( 'on' ) ) el.addEventListener( k.slice( 2 ), v );
		else if ( k === 'html' ) el.innerHTML = v;
		else if ( k === 'dataset' ) Object.assign( el.dataset, v );
		else el.setAttribute( k, v === true ? '' : v );

	}

	for ( const c of children.flat() ) if ( c !== null && c !== undefined && c !== false ) el.append( c.nodeType ? c : document.createTextNode( c ) );
	return el;

}

let toastTimer = null;

/** A short message over the viewport. */
export function toast( text, ms = 2600 ) {

	const el = $( 'toast' );
	if ( ! el ) return;
	el.textContent = text;
	el.hidden = false;
	clearTimeout( toastTimer );
	toastTimer = setTimeout( () => { el.hidden = true; }, ms );

}
