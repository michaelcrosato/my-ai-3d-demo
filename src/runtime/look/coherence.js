// Coherence checker (design §6.6, principle P8): data-driven rules that flag effects
// contradicting each other, each with a one-click fix and a "why". Rules read the
// resolved values (and the scene tier); fixes are Tune overrides.

import { hexToOklab } from '../color/color.js';

const dist = ( a, b ) => { const p = hexToOklab( a ), q = hexToOklab( b ); return Math.hypot( p[ 0 ] - q[ 0 ], p[ 1 ] - q[ 1 ], p[ 2 ] - q[ 2 ] ); };

/** The strong post media in a resolution, in pipeline order. */
export function activeMedia( v ) {

	return [
		v[ 'media.kuwahara.enabled' ] && 'media.kuwahara.enabled',
		v[ 'media.watercolor.enabled' ] && v[ 'media.watercolor.edges' ] > 0.2 && 'media.watercolor.enabled',
		v[ 'media.halftone.enabled' ] && v[ 'media.halftone.amount' ] > 0.5 && 'media.halftone.enabled',
		v[ 'media.hatching.enabled' ] && v[ 'media.hatching.amount' ] > 0.5 && 'media.hatching.enabled',
	].filter( Boolean );

}

export const COHERENCE_RULES = [
	{
		id: 'two-media',
		test: ( v ) => activeMedia( v ).length >= 2,
		message: 'Pick one medium; two media read as noise.',
		why: 'Brush strokes, print dots, pen hatching and watercolor are each a complete way of making marks. Layered at full strength they fight for the same job, and the image turns into texture soup.',
		fix: ( v ) => Object.fromEntries( activeMedia( v ).slice( 1 ).map( ( id ) => [ id, false ] ) ),
		fixLabel: 'Keep only the first medium',
	},
	{
		id: 'two-eras',
		test: ( v ) => ( v[ 'retro.pixel.enabled' ] || v[ 'retro.vertexSnap.enabled' ] ) && ( v[ 'lens.dof.enabled' ] || v[ 'lens.motionBlur.enabled' ] ),
		message: 'Anachronistic: those consoles couldn\'t blur. Pick one era.',
		why: 'Pixelation and vertex jitter say "old hardware"; bokeh and motion blur say "modern film camera". Together the image has no believable era.',
		fix: () => ( { 'lens.dof.enabled': false, 'lens.motionBlur.enabled': false } ),
		fixLabel: 'Turn off the blur',
	},
	{
		id: 'busy-lines',
		test: ( v, ctx ) => v[ 'lines.screen.enabled' ] && v[ 'lines.screen.thickness' ] > 4 && ( ctx.tier ?? 0 ) >= 3 && v[ 'lines.screen.fade' ] < 0.5,
		message: 'Busy: thick lines on dense detail turn into noise. Fade lines with distance or raise the crease threshold.',
		why: 'At high complexity every small crease and leaf gets ink. Illustrators simplify distant detail; distance fade does that for you.',
		fix: () => ( { 'lines.screen.fade': 1, 'lines.screen.fadeStart': 15, 'lines.screen.fadeEnd': 80 } ),
		fixLabel: 'Fade lines with distance',
	},
	{
		id: 'bloom-clipping',
		test: ( v ) => v[ 'lens.bloom.enabled' ] && v[ 'lens.bloom.strength' ] > 0.5 && v[ 'grade.toneMapping' ] === 'none',
		message: 'Clipping: without tone mapping, bloom burns to white.',
		why: 'Bloom adds light on top of HDR highlights. Tone mapping rolls those values off smoothly; without it they clip to flat white blobs.',
		fix: () => ( { 'grade.toneMapping': 'agx' } ),
		fixLabel: 'Use AgX tone mapping',
	},
	{
		id: 'oversaturated',
		test: ( v ) => Math.max( v[ 'palette.saturation' ], v[ 'grade.saturation' ] ) > 1.4 && ! ( v[ 'palette.remap' ] > 0 && v[ 'palette.colors' ].length ),
		message: 'Oversaturated colors fight; try palette remap.',
		why: 'Saturation multiplies whatever colors the scene has, including the random ones. A designed palette keeps strong color from turning garish.',
		fix: ( v ) => ( v[ 'palette.saturation' ] > 1.4 ? { 'palette.saturation': 1.3 } : { 'grade.saturation': 1.3 } ),
		fixLabel: 'Bring saturation down to 1.3',
	},
	{
		id: 'fog-seam',
		test: ( v ) => v[ 'atmosphere.fog.type' ] !== 'off' && v[ 'atmosphere.fog.amount' ] > 0.2 && v[ 'atmosphere.fog.skyTint' ] < 0.5 && dist( v[ 'atmosphere.fog.color' ], v[ 'atmosphere.sky.horizon' ] ) > 0.15,
		message: 'Fog doesn\'t match the sky, so the horizon will show a seam.',
		why: 'Distant objects fade toward the fog color while the sky behind them stays its own color. If the two differ, every silhouette on the horizon gets a halo.',
		fix: () => ( { 'atmosphere.fog.skyTint': 1 } ),
		fixLabel: 'Tint the fog with the sky',
	},
	{
		id: 'double-ink',
		test: ( v ) => v[ 'lines.sobel.enabled' ] && v[ 'lines.sobel.amount' ] > 0.5 && v[ 'lines.screen.enabled' ],
		message: 'Two kinds of ink draw most edges twice.',
		why: 'Screen-space ink already outlines silhouettes and folds from the geometry. Sobel adds a second line next to many of them, plus lines on every shadow edge, so the drawing doubles up.',
		fix: () => ( { 'lines.sobel.enabled': false } ),
		fixLabel: 'Keep the geometry ink',
	},
	{
		id: 'bleach-twice',
		test: ( v ) => v[ 'grade.bleach.enabled' ] && v[ 'grade.lut.enabled' ] && v[ 'grade.lut.preset' ] === 'bleach',
		message: 'Bleach bypass twice: the LUT preset already is one.',
		why: 'The Bleach bypass LUT and the bleach bypass grade are the same film process. Stacked, the color drains away and the contrast crunches far past the look either one gives.',
		fix: () => ( { 'grade.bleach.enabled': false } ),
		fixLabel: 'Keep only the LUT',
	},
	{
		id: 'grain-dither',
		test: ( v ) => v[ 'media.grain.amount' ] > 0.02 && ( ( v[ 'retro.quantize.mode' ] === 'palette' && v[ 'retro.quantize.palette' ] === 'onebit' ) || v[ 'surface.dither.enabled' ] ),
		message: 'Redundant texture; the dither already breaks up the image.',
		why: 'Grain and 1-bit dithering both add fine noise. Together the pattern gets muddy and the two inks stop reading.',
		fix: () => ( { 'media.grain.amount': 0 } ),
		fixLabel: 'Remove the grain',
	},
];

/** The rules a resolution breaks: [{ id, message, why, fix (overrides), fixLabel }]. */
export function checkCoherence( values, ctx = {} ) {

	return COHERENCE_RULES.filter( ( r ) => r.test( values, ctx ) ).map( ( r ) => ( { id: r.id, message: r.message, why: r.why, fix: r.fix( values, ctx ), fixLabel: r.fixLabel } ) );

}
