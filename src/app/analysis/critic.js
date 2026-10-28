// Critic (design §6.13): heuristic tips from frame statistics, each with a "why" and a
// one-click fix. Pure: it reads a small RGBA readback (160 × 90) plus the resolved values,
// so tests can feed it purpose-built images.

import { srgbToLinear, linearToOklab } from '../../runtime/color/color.js';

const luma = ( r, g, b ) => ( 0.2126 * r + 0.7152 * g + 0.0722 * b ) / 255;

// Machado et al. 2009 color-vision-deficiency matrices (severity 1), on linear RGB.
export const CVD = {
	protan: [ 0.152286, 1.052583, - 0.204868, 0.114503, 0.786281, 0.099216, - 0.003882, - 0.048116, 1.051998 ],
	deutan: [ 0.367322, 0.860646, - 0.227968, 0.280085, 0.672501, 0.047413, - 0.011820, 0.042940, 0.968881 ],
	tritan: [ 1.255528, - 0.076749, - 0.178779, - 0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.303900 ],
};

/**
 * The focus region: a third of the frame each way, centered on the subject's pixel position
 * `focus` [x, y] (the scene's focus point, projected), or the center third without one.
 */
function focusBox( width, height, focus = null ) {

	const [ cx, cy ] = focus || [ width / 2, height / 2 ];
	const x0 = Math.max( 0, Math.min( width * 2 / 3, cx - width / 6 ) ), y0 = Math.max( 0, Math.min( height * 2 / 3, cy - height / 6 ) );
	return ( x, y ) => x >= x0 && x < x0 + width / 3 && y >= y0 && y < y0 + height / 3;

}

/**
 * Frame statistics from an RGBA readback. `mask` optionally marks focus pixels (1) per
 * pixel; otherwise `focus` [x, y] centers the focus region (see focusBox).
 */
export function frameStats( px, width, height, { mask = null, focus = null } = {} ) {

	const n = width * height;
	const L = new Float32Array( n );
	const hueBins = new Float32Array( 12 );
	let chromaCount = 0, clipped = 0;
	const lab = new Float32Array( n * 3 );
	for ( let i = 0; i < n; i ++ ) {

		const r = px[ i * 4 ], g = px[ i * 4 + 1 ], b = px[ i * 4 + 2 ];
		L[ i ] = luma( r, g, b );
		if ( L[ i ] >= 0.985 || L[ i ] <= 0.008 ) clipped ++;
		const [ l, a, bb ] = linearToOklab( [ srgbToLinear( r / 255 ), srgbToLinear( g / 255 ), srgbToLinear( b / 255 ) ] );
		lab[ i * 3 ] = l; lab[ i * 3 + 1 ] = a; lab[ i * 3 + 2 ] = bb;
		const c = Math.hypot( a, bb );
		if ( c > 0.05 ) { chromaCount ++; hueBins[ Math.floor( ( ( Math.atan2( bb, a ) / ( 2 * Math.PI ) ) + 1 ) % 1 * 12 ) % 12 ] ++; }

	}

	const sorted = Float32Array.from( L ).sort();
	const q = ( f ) => sorted[ Math.min( n - 1, Math.floor( f * n ) ) ];
	const dominantHues = chromaCount > n * 0.02 ? [ ...hueBins ].filter( ( c ) => c / chromaCount > 0.06 ).length : 0;

	// Focus (the region around the subject, or the mask) vs. periphery: local contrast as the std of luma.
	const box = focusBox( width, height, focus );
	const inFocus = ( x, y, i ) => ( mask ? mask[ i ] > 0 : box( x, y ) );
	const acc = { f: [ 0, 0, 0 ], p: [ 0, 0, 0 ] };
	let edges = 0;
	for ( let y = 0; y < height; y ++ ) for ( let x = 0; x < width; x ++ ) {

		const i = y * width + x;
		const a = inFocus( x, y, i ) ? acc.f : acc.p;
		a[ 0 ] ++; a[ 1 ] += L[ i ]; a[ 2 ] += L[ i ] * L[ i ];
		if ( x > 0 && y > 0 && Math.abs( L[ i ] - L[ i - 1 ] ) + Math.abs( L[ i ] - L[ i - width ] ) > 0.12 ) edges ++;

	}

	const std = ( a ) => ( a[ 0 ] ? Math.sqrt( Math.max( 0, a[ 2 ] / a[ 0 ] - ( a[ 1 ] / a[ 0 ] ) ** 2 ) ) : 0 );
	return {
		width, height, lab, luma: L,
		valueRange: q( 0.98 ) - q( 0.02 ), clipped: clipped / n, dominantHues, chromaFraction: chromaCount / n,
		focusContrast: std( acc.f ), peripheryContrast: std( acc.p ), focusMean: acc.f[ 0 ] ? acc.f[ 1 ] / acc.f[ 0 ] : 0, peripheryMean: acc.p[ 0 ] ? acc.p[ 1 ] / acc.p[ 0 ] : 0,
		busyness: edges / n,
		histogram: Array.from( { length: 32 }, ( _, k ) => L.filter( ( v ) => Math.min( 31, Math.floor( v * 32 ) ) === k ).length / n ),
	};

}

/** Fraction of pixels within `tolerance` (OKLab distance) of a color. */
function nearColor( stats, hex, tolerance = 0.06 ) {

	const n = parseInt( hex.slice( 1 ), 16 );
	const t = linearToOklab( [ ( n >> 16 ) & 255, ( n >> 8 ) & 255, n & 255 ].map( ( c ) => srgbToLinear( c / 255 ) ) );
	let near = 0;
	const N = stats.width * stats.height;
	for ( let i = 0; i < N; i ++ ) if ( Math.hypot( stats.lab[ i * 3 ] - t[ 0 ], stats.lab[ i * 3 + 1 ] - t[ 1 ], stats.lab[ i * 3 + 2 ] - t[ 2 ] ) < tolerance ) near ++;
	return near / N;

}

/** Focus vs. periphery mean colors as seen with a color-vision deficiency: [normal ΔE, worst simulated ΔE]. */
function cvdSeparation( px, width, height, focus = null ) {

	const box = focusBox( width, height, focus );
	const mean = ( inside ) => {

		const s = [ 0, 0, 0 ]; let k = 0;
		for ( let y = 0; y < height; y ++ ) for ( let x = 0; x < width; x ++ ) {

			if ( box( x, y ) !== inside ) continue;
			const i = ( y * width + x ) * 4;
			for ( let j = 0; j < 3; j ++ ) s[ j ] += srgbToLinear( px[ i + j ] / 255 );
			k ++;

		}

		return s.map( ( v ) => v / Math.max( 1, k ) );

	};

	const a = mean( true ), b = mean( false );
	const dist = ( p, q ) => { const x = linearToOklab( p ), y = linearToOklab( q ); return Math.hypot( x[ 0 ] - y[ 0 ], x[ 1 ] - y[ 1 ], x[ 2 ] - y[ 2 ] ); };
	const sim = ( c, m ) => [ m[ 0 ] * c[ 0 ] + m[ 1 ] * c[ 1 ] + m[ 2 ] * c[ 2 ], m[ 3 ] * c[ 0 ] + m[ 4 ] * c[ 1 ] + m[ 5 ] * c[ 2 ], m[ 6 ] * c[ 0 ] + m[ 7 ] * c[ 1 ] + m[ 8 ] * c[ 2 ] ].map( ( v ) => Math.max( 0, v ) );
	return [ dist( a, b ), Math.min( ...Object.values( CVD ).map( ( m ) => dist( sim( a, m ), sim( b, m ) ) ) ) ];

}

/**
 * Built-in looks where a rule describes the style rather than a mistake, with the reason.
 * The critic still shows the tip, marked as part of the style. Measured on the library
 * across the lookdev and harbor scenes (DESIGN.md §9 M8).
 */
export const STYLE_EXCEPTIONS = {
	'retro-crt': { clipping: 'the black mask between scanlines and the dark tube border are part of the screen' },
	noir: { clipping: 'deep, crushed blacks are the point of noir' },
	'golden-hour': { 'weak-focus': 'a low sun behind the scene turns subjects into silhouettes' },
	cinematic: { 'weak-focus': 'low-key light and shallow focus leave most of the frame dark and soft' },
	'layered-wilderness': { 'weak-focus': 'the eye is meant to travel through the depth layers to the horizon' },
	sketchbook: { 'weak-focus': 'even pencil texture covers the whole page' },
	'garden-prank': { 'weak-focus': 'flat pastel light: subjects stand out by color, not contrast' },
};

/**
 * The critic's rules. Each tests stats and resolved values; `fix` returns Tune overrides.
 * Thresholds follow the design table (§6.13).
 */
export const CRITIC_RULES = [
	{
		id: 'flat-values',
		test: ( s ) => s.valueRange < 0.4,
		message: 'Mostly midtones. Deepen shadows or raise contrast for punch.',
		why: 'Value (light and dark) carries shape and depth before color does. When everything sits in the middle, nothing leads the eye and forms flatten out.',
		fix: ( s, v ) => ( { 'grade.contrast': Math.min( 2, Math.round( ( v[ 'grade.contrast' ] + 0.25 ) * 100 ) / 100 ) } ),
		fixLabel: 'Raise contrast',
	},
	{
		id: 'clipping',
		test: ( s ) => s.clipped > 0.02,
		message: 'Highlights or shadows are clipping. Lower exposure or bloom.',
		why: 'Clipped pixels are pure white or black: the detail there is gone, and large clipped areas look like errors rather than light.',
		fix: ( s, v ) => ( v[ 'lens.bloom.enabled' ] && v[ 'lens.bloom.strength' ] > 0.3 ? { 'lens.bloom.strength': Math.round( v[ 'lens.bloom.strength' ] * 0.6 * 100 ) / 100 } : { 'grade.exposure': Math.round( ( v[ 'grade.exposure' ] - 0.4 ) * 100 ) / 100 } ),
		fixLabel: 'Pull the highlights back',
	},
	{
		id: 'too-many-hues',
		test: ( s ) => s.dominantHues > 7,
		message: 'Too many hues compete. Try palette remap or lower saturation in the background.',
		why: 'Strong styles use a few hues on purpose. Many saturated hues at once read as noise and fight the focal point.',
		fix: ( s, v ) => ( { 'palette.saturation': Math.round( Math.max( 0.5, v[ 'palette.saturation' ] * 0.8 ) * 100 ) / 100 } ),
		fixLabel: 'Calm the colors',
	},
	{
		id: 'weak-focus',
		test: ( s ) => s.focusContrast < s.peripheryContrast * 0.7 && s.peripheryContrast > 0.08,
		message: 'Your subject doesn\'t stand out. Add rim light or a vignette, or desaturate the background.',
		why: 'The eye goes to the highest contrast first. If the edges of the frame are busier than the subject, attention drifts away from it.',
		fix: ( s, v ) => ( { 'lens.vignette.amount': Math.min( 1, Math.max( 0.3, v[ 'lens.vignette.amount' ] + 0.2 ) ), 'surface.rim.intensity': Math.max( 0.5, v[ 'surface.rim.intensity' ] ) } ),
		fixLabel: 'Vignette and rim light',
	},
	{
		id: 'line-noise',
		test: ( s, v, ctx ) => ( ctx.tier ?? 0 ) >= 3 && ( v[ 'lines.screen.enabled' ] ) && s.busyness > 0.22,
		message: 'Line noise. Fade lines with distance.',
		why: 'At high detail, every small crease gets ink. Illustrators simplify distant detail; distance fade does that for you.',
		fix: () => ( { 'lines.screen.fade': 1, 'lines.screen.fadeStart': 12, 'lines.screen.fadeEnd': 60 } ),
		fixLabel: 'Fade lines with distance',
	},
	{
		id: 'fog-wall',
		test: ( s, v ) => v[ 'atmosphere.fog.type' ] !== 'off' && v[ 'atmosphere.fog.amount' ] > 0.2 && nearColor( s, v[ 'atmosphere.fog.color' ] ) > 0.6,
		message: 'Fog is hiding the scene. Start it further away.',
		why: 'Fog should separate distances (atmospheric perspective), not erase the scene. When most of the frame is fog color, the player loses the space.',
		fix: ( s, v ) => ( v[ 'atmosphere.fog.type' ] === 'linear' ? { 'atmosphere.fog.start': Math.round( v[ 'atmosphere.fog.start' ] * 2 + 10 ) } : { 'atmosphere.fog.density': Math.round( v[ 'atmosphere.fog.density' ] * 0.5 * 10000 ) / 10000 } ),
		fixLabel: 'Push the fog back',
	},
	{
		id: 'color-blind',
		test: ( s, v, ctx ) => ctx.cvd && ctx.cvd[ 0 ] > 0.08 && ctx.cvd[ 1 ] < ctx.cvd[ 0 ] * 0.4 && Math.abs( s.focusMean - s.peripheryMean ) < 0.08,
		message: 'With color-blind vision the subject and background merge. Separate them by value, not hue alone.',
		why: 'About 1 in 12 men has a color-vision deficiency. If the hero differs from the background only in hue, they lose it; a value difference survives every kind.',
		fix: ( s, v ) => ( { 'surface.rim.intensity': Math.max( 0.6, v[ 'surface.rim.intensity' ] ), 'grade.contrast': Math.min( 2, Math.round( ( v[ 'grade.contrast' ] + 0.15 ) * 100 ) / 100 ) } ),
		fixLabel: 'Separate by value',
	},
];

/** Drops black bars (rows that are black all the way across) from the top and bottom. */
export function cropBars( px, width, height, mask = null ) {

	const black = ( y ) => { for ( let x = 0; x < width; x ++ ) { const i = ( y * width + x ) * 4; if ( luma( px[ i ], px[ i + 1 ], px[ i + 2 ] ) > 0.05 ) return false; } return true; };
	let top = 0, bottom = height;
	while ( top < height / 3 && black( top ) ) top ++;
	while ( bottom > height * 2 / 3 && black( bottom - 1 ) ) bottom --;
	if ( top === 0 && bottom === height ) return { px, height, mask, top };
	return { px: px.slice( top * width * 4, bottom * width * 4 ), height: bottom - top, mask: mask && mask.slice( top * width, bottom * width ), top };

}

/**
 * The tips for a frame.
 * @param {Uint8Array|number[]} px - RGBA, top-down rows
 * @param {object} values - resolved global values
 * @param {object} ctx - { width, height, tier, mask }
 */
export function critique( px, values, { width = 160, height = 90, tier = 0, mask = null, focus = null, lookId = null } = {} ) {

	// Letterbox bars are framing, not clipped detail: judge the picture between them.
	let top;
	( { px, height, mask, top } = cropBars( px, width, height, mask ) );
	if ( focus ) focus = [ focus[ 0 ], focus[ 1 ] - top ];
	const stats = frameStats( px, width, height, { mask, focus } );
	const ctx = { tier, cvd: cvdSeparation( px, width, height, focus ) };
	const intended = STYLE_EXCEPTIONS[ lookId ] || {};
	const tips = CRITIC_RULES.filter( ( r ) => r.test( stats, values, ctx ) ).map( ( r ) => ( { id: r.id, message: r.message, why: r.why, fix: r.fix( stats, values, ctx ), fixLabel: r.fixLabel, intended: intended[ r.id ] || null } ) );
	return { tips, stats: { valueRange: stats.valueRange, clipped: stats.clipped, dominantHues: stats.dominantHues, focusContrast: stats.focusContrast, peripheryContrast: stats.peripheryContrast, busyness: stats.busyness, histogram: stats.histogram, cvd: ctx.cvd } };

}

/** k-means in OKLab on a readback: the dominant colors and their shares (palette extraction). */
export function extractPalette( px, n = 6, iterations = 8 ) {

	const N = px.length / 4;
	const pts = [];
	for ( let i = 0; i < N; i += 2 ) pts.push( linearToOklab( [ srgbToLinear( px[ i * 4 ] / 255 ), srgbToLinear( px[ i * 4 + 1 ] / 255 ), srgbToLinear( px[ i * 4 + 2 ] / 255 ) ] ) );
	// Deterministic seeds: spread through the luminance order.
	const order = pts.map( ( p, i ) => [ p[ 0 ], i ] ).sort( ( a, b ) => a[ 0 ] - b[ 0 ] );
	let centers = Array.from( { length: n }, ( _, k ) => [ ...pts[ order[ Math.floor( ( k + 0.5 ) / n * order.length ) ][ 1 ] ] ] );
	let assign = new Int32Array( pts.length );
	for ( let it = 0; it < iterations; it ++ ) {

		assign = assign.map( ( _, i ) => {

			let best = 0, bd = Infinity;
			centers.forEach( ( c, k ) => { const d = ( pts[ i ][ 0 ] - c[ 0 ] ) ** 2 + ( pts[ i ][ 1 ] - c[ 1 ] ) ** 2 + ( pts[ i ][ 2 ] - c[ 2 ] ) ** 2; if ( d < bd ) { bd = d; best = k; } } );
			return best;

		} );
		centers = centers.map( ( c, k ) => {

			const s = [ 0, 0, 0 ]; let m = 0;
			pts.forEach( ( p, i ) => { if ( assign[ i ] === k ) { s[ 0 ] += p[ 0 ]; s[ 1 ] += p[ 1 ]; s[ 2 ] += p[ 2 ]; m ++; } } );
			return m ? s.map( ( v ) => v / m ) : c;

		} );

	}

	const shares = centers.map( ( _, k ) => assign.filter( ( a ) => a === k ).length / pts.length );
	return centers.map( ( c, k ) => ( { lab: c, share: shares[ k ], hue: ( Math.atan2( c[ 2 ], c[ 1 ] ) * 180 / Math.PI + 360 ) % 360, chroma: Math.hypot( c[ 1 ], c[ 2 ] ) } ) ).sort( ( a, b ) => b.share - a.share );

}
