// "What changed" (design §6.13, P2): after a compare, a summary of how the look moved the
// frame away from the plain baseline, such as "Your look raised silhouette contrast 2.3×
// and reduced dominant hues from 9 to 4." Pure: two small RGBA readbacks in, text out,
// using the critic's frame statistics, so tests can feed it purpose-built images.

import { frameStats } from './critic.js';

/** Silhouette contrast: the mean brightness step across the strongest 10% of edges. */
function edgeContrast( L, width, height ) {

	const g = [];
	for ( let y = 1; y < height - 1; y ++ ) for ( let x = 1; x < width - 1; x ++ ) {

		const i = y * width + x;
		g.push( Math.hypot( L[ i + 1 ] - L[ i - 1 ], L[ i + width ] - L[ i - width ] ) );

	}

	g.sort( ( a, b ) => b - a );
	const top = g.slice( 0, Math.max( 1, Math.floor( g.length * 0.1 ) ) );
	return top.reduce( ( s, v ) => s + v, 0 ) / top.length;

}

/** Mean OKLab chroma: how colorful the frame is overall. */
function meanChroma( lab ) {

	let s = 0;
	for ( let i = 0; i < lab.length; i += 3 ) s += Math.hypot( lab[ i + 1 ], lab[ i + 2 ] );
	return s / ( lab.length / 3 );

}

function measure( px, width, height, focus ) {

	const s = frameStats( px, width, height, { focus } );
	return {
		edges: edgeContrast( s.luma, width, height ),
		value: s.valueRange,
		hues: s.dominantHues,
		chroma: meanChroma( s.lab ),
		focus: s.focusContrast / Math.max( 1e-3, s.peripheryContrast ),
		busy: s.busyness,
	};

}

const METRICS = [
	{ id: 'edges', label: 'silhouette contrast', kind: 'ratio' },
	{ id: 'value', label: 'value range', kind: 'percent' },
	{ id: 'hues', label: 'dominant hues', kind: 'count' },
	{ id: 'chroma', label: 'saturation', kind: 'ratio' },
	{ id: 'focus', label: 'focus contrast (subject vs. edges)', kind: 'ratio' },
	{ id: 'busy', label: 'busyness (small edges)', kind: 'ratio' },
];

/** How big a change is, comparable across kinds; below 1 it is not worth mentioning. */
function weight( m, a, b ) {

	if ( m.kind === 'count' ) return Math.abs( b - a );
	if ( m.kind === 'percent' ) return Math.abs( b - a ) / 0.08;
	const r = ( Math.max( a, b ) + 1e-4 ) / ( Math.min( a, b ) + 1e-4 );
	return Math.log( r ) / Math.log( 1.15 );

}

function phrase( m, a, b ) {

	const up = b > a;
	if ( m.kind === 'count' ) return `${up ? 'raised' : 'reduced'} ${m.label} from ${a} to ${b}`;
	if ( m.kind === 'percent' ) return `${up ? 'widened' : 'narrowed'} the ${m.label} from ${Math.round( a * 100 )}% to ${Math.round( b * 100 )}%`;
	const r = up ? ( b + 1e-4 ) / ( a + 1e-4 ) : ( a + 1e-4 ) / ( b + 1e-4 );
	return `${up ? 'raised' : 'lowered'} ${m.label} ${r.toFixed( 1 )}×`;

}

/**
 * Compares the plain baseline with the styled frame (same size, RGBA). `focus` [x, y] is
 * the subject's pixel position. Returns { summary, changes: [{ id, label, from, to, weight }] }
 * with the changes sorted biggest first.
 */
export function whatChanged( plainPx, styledPx, width, height, { focus = null } = {} ) {

	const a = measure( plainPx, width, height, focus ), b = measure( styledPx, width, height, focus );
	const changes = METRICS.map( ( m ) => ( { id: m.id, label: m.label, kind: m.kind, from: a[ m.id ], to: b[ m.id ], weight: weight( m, a[ m.id ], b[ m.id ] ), text: phrase( m, a[ m.id ], b[ m.id ] ) } ) )
		.sort( ( x, y ) => y.weight - x.weight );
	const big = changes.filter( ( c ) => c.weight >= 1 ).slice( 0, 3 ).map( ( c ) => c.text );
	const summary = big.length
		? `Your look ${big.length > 1 ? `${big.slice( 0, - 1 ).join( ', ' )} and ${big.at( - 1 )}` : big[ 0 ]}.`
		: 'Your look barely changes values, color or contrast from the plain baseline: its changes are in the details.';
	return { summary, changes };

}
