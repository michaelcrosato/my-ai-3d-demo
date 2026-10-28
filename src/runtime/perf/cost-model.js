// Cost model (design §6.11, §7.14): a static rubric of each effect's GPU cost in
// fullscreen-pass equivalents (FPE), a device budget table, phone verdicts, and the
// rule-based "phone-friendly variant". A plain data file, so on-device reports can update it.
//
// 1 FPE = one fullscreen pass doing a few texture taps at the target resolution. Mobile
// GPUs are tile-based: every fullscreen pass and every extra render-target attachment costs
// memory bandwidth, while MSAA is comparatively cheap. Fewer passes beat cheaper math.

import { EFFECTS, activeEffects, withPartMasks, passRequirements } from '../post/graph.js';
import { PARTS } from '../registry/index.js';

/**
 * Per effect: passes (fullscreen), taps per pixel, buffers it reads, temporal history, and
 * the FPE weight they add up to. `fpe` may depend on values (Kuwahara radius).
 */
export const RUBRIC = {
	'lighting.ao': { passes: 2, taps: 20, history: false, fpe: 1.6, note: 'GTAO at half resolution plus a smoothing pass' },
	'lighting.contact': { passes: 1, taps: 16, history: false, fpe: 1.2, note: 'a 16-step ray march toward the sun' },
	'lens.bloom': { passes: 10, taps: 9, history: false, fpe: 2.2, note: 'a mip chain of downsample and blur passes' },
	'atmosphere.godRays': { passes: 1, taps: 32, history: false, fpe: 1.5, note: 'a 32-tap radial blur' },
	'lens.motionBlur': { passes: 1, taps: 16, history: false, fpe: 1.3, note: 'velocity buffer plus 16 taps' },
	'lens.dof': { passes: 4, taps: 24, history: false, fpe: 3, note: 'bokeh gather at half resolution plus composite' },
	'lens.tiltShift': { passes: 2, taps: 18, history: false, fpe: 1.4, note: 'a separable blur band' },
	'quality.traa': { passes: 2, taps: 9, history: true, fpe: 1.4, note: 'reprojection with a history buffer' },
	'grade.toneMapping': { passes: 0, taps: 0, history: false, fpe: 0, note: 'fused into the final pass' },
	'grade.basic': { passes: 0, taps: 0, history: false, fpe: 0.1, note: 'fused math' },
	'grade.selective': { passes: 0, taps: 0, history: false, fpe: 0.1, note: 'fused math (OKLab)' },
	'grade.lut': { passes: 0, taps: 1, history: false, fpe: 0.2, note: 'one 3D texture lookup' },
	'grade.gradientMap': { passes: 0, taps: 0, history: false, fpe: 0.1, note: 'fused math' },
	'media.kuwahara': { passes: 1, taps: 0, history: false, fpe: ( v ) => 0.6 + 0.12 * ( 2 * v[ 'media.kuwahara.radius' ] + 1 ) ** 2 / 4 + ( v[ 'media.kuwahara.anisotropic' ] ? 0.8 : 0 ), note: '8 sectors over a (2r + 1)² window: cost grows with the radius squared (anisotropic adds a structure-tensor pass)' },
	'media.watercolor': { passes: 1, taps: 12, history: false, fpe: 1.2, note: 'edge darkening and granulation' },
	'media.halftone': { passes: 0, taps: 0, history: false, fpe: ( v ) => ( v[ 'media.halftone.mode' ] === 'cmyk' ? 0.5 : 0.3 ), note: 'fused dot screens' },
	'media.hatching': { passes: 0, taps: 0, history: false, fpe: 0.3, note: 'fused line screens' },
	'lines.screen': { passes: 0, taps: 25, history: false, fpe: 1.4, note: '8 neighbors of depth, normal and ids (needs MRT)' },
	'retro.pixel': { passes: 1, taps: 4, history: false, fpe: 0.3, note: 'low-resolution scene pass and nearest upscale (cheaper scene)' },
	'quality.fxaa': { passes: 1, taps: 9, history: false, fpe: 0.6, note: 'one pass' },
	'quality.smaa': { passes: 3, taps: 12, history: false, fpe: 1.5, note: 'edge, weight and blend passes' },
	'media.misregistration': { passes: 1, taps: 3, history: false, fpe: 0.4, note: 'a texture boundary plus three taps' },
	'media.paper': { passes: 0, taps: 1, history: false, fpe: 0.2, note: 'procedural texture' },
	'retro.quantize': { passes: 0, taps: 0, history: false, fpe: 0.2, note: 'fused palette match and dither' },
	'lens.ca': { passes: 1, taps: 3, history: false, fpe: 0.4, note: 'a texture boundary plus three taps' },
	'lens.distortion': { passes: 1, taps: 1, history: false, fpe: 0.4, note: 'a texture boundary' },
	'lens.vignette': { passes: 0, taps: 0, history: false, fpe: 0.05, note: 'fused' },
	'media.grain': { passes: 0, taps: 0, history: false, fpe: 0.05, note: 'fused' },
	'lens.letterbox': { passes: 0, taps: 0, history: false, fpe: 0.02, note: 'fused' },
	'retro.crt': { passes: 1, taps: 5, history: false, fpe: 0.6, note: 'curvature needs a texture boundary' },
	// P2 (M10)
	'lighting.ssgi': { passes: 2, taps: 32, history: false, fpe: 4, note: 'two slices × 8 steps of horizon search per pixel, plus smoothing' },
	'lens.flare': { passes: 2, taps: 8, history: false, fpe: 1.2, note: 'ghosts at quarter resolution plus a texture boundary' },
	'lens.anamorphic': { passes: 2, taps: 32, history: false, fpe: 1.5, note: 'a 32-tap horizontal streak at half resolution' },
	'lens.afterimage': { passes: 2, taps: 2, history: true, fpe: 0.8, note: 'a history buffer blended every frame' },
	'grade.sepia': { passes: 0, taps: 0, history: false, fpe: 0.05, note: 'fused math' },
	'grade.bleach': { passes: 0, taps: 0, history: false, fpe: 0.05, note: 'fused math' },
	'lines.sobel': { passes: 1, taps: 8, history: false, fpe: 0.6, note: 'a texture boundary plus a 3 × 3 kernel' },
	'lines.highlight': { passes: 0, taps: 25, history: false, fpe: 0.6, note: '24 taps of the ids buffer (needs MRT)' },
	'media.sharpen': { passes: 1, taps: 5, history: false, fpe: 0.4, note: 'a texture boundary plus five taps' },
	'motion.speedLines': { passes: 0, taps: 0, history: false, fpe: 0.1, note: 'fused procedural pattern' },
	'retro.vhs': { passes: 1, taps: 5, history: false, fpe: 0.6, note: 'a texture boundary plus a horizontal chroma smear' },
};

/** Extra render-target attachments cost bandwidth on tile-based GPUs. */
export const BUFFER_FPE = 0.5;
/** Shadow map cost by resolution (one depth pass of the scene, sampled with PCF). */
export const SHADOW_FPE = { 512: 0.15, 1024: 0.3, 2048: 0.8, 4096: 2 };
/** The styled scene pass with its materials, relative to a fullscreen pass. */
export const SCENE_FPE = 1;

/**
 * Device classes: how many FPE fit in a 16.7 ms frame at the class's usual resolution.
 * Rough estimates (marked as such in reports) until on-device audits replace them.
 */
export const BUDGETS = [
	{ id: 'desktop', label: 'Desktop GPU, 1080p', fpe: 60, estimate: true },
	{ id: 'laptop', label: 'Laptop integrated GPU, 1080p', fpe: 18, estimate: true },
	{ id: 'phone-high', label: 'High-end phone (2023+), 0.75 render scale', fpe: 9, estimate: true },
	{ id: 'phone-mid', label: 'Mid-range phone, 0.75 render scale', fpe: 5, estimate: true },
	{ id: 'phone-low', label: 'Low-end phone', fpe: 2.5, estimate: true },
];

export const VERDICTS = { safe: '✅ phone-safe', high: '⚠️ high-end phones only', desktop: '⛔ desktop or console only' };

const fpeOf = ( id, v ) => { const r = RUBRIC[ id ]; return r ? ( typeof r.fpe === 'function' ? r.fpe( v ) : r.fpe ) : 0.5; };

/**
 * The rubric for a resolved look: per-effect FPE, buffers, shadows and the total, with a
 * verdict. `global` and `parts` come from resolveRecipe().
 */
export function rubric( global, parts ) {

	const v = withPartMasks( global, parts );
	const active = activeEffects( v );
	const effects = active.map( ( id ) => ( { id, label: EFFECTS.find( ( e ) => e.id === id )?.label || id, fpe: Math.round( fpeOf( id, v ) * 100 ) / 100, note: RUBRIC[ id ]?.note || '' } ) );
	const buffers = [ ...passRequirements( v ) ];
	const shadows = SHADOW_FPE[ v[ 'lighting.shadows.mapSize' ] ] ?? 0.8;
	const scale = v[ 'retro.pixel.enabled' ] ? 0.5 : v[ 'quality.resolution' ] ?? 1;
	const effectsTotal = effects.reduce( ( s, e ) => s + e.fpe, 0 );
	const total = Math.round( ( SCENE_FPE * scale + effectsTotal * scale + buffers.length * BUFFER_FPE + shadows ) * 100 ) / 100;
	const budget = ( id ) => BUDGETS.find( ( b ) => b.id === id ).fpe;
	const verdict = total <= budget( 'phone-mid' ) ? 'safe' : total <= budget( 'phone-high' ) ? 'high' : 'desktop';
	return { effects, buffers, shadows, scale, total, verdict, label: VERDICTS[ verdict ] };

}

/**
 * The phone-friendly variant's overrides (§6.11 substitution table): global overrides and
 * per-part overrides, plus a list of what changed and why.
 */
export function mobileSubstitutions( global, parts ) {

	const o = {}, partOverrides = {}, changes = [];
	const set = ( id, value, why ) => { if ( global[ id ] !== value ) { o[ id ] = value; changes.push( why ); } };
	if ( global[ 'lighting.ao.enabled' ] || PARTS.some( ( p ) => parts[ p ][ 'lighting.ao.enabled' ] ) ) set( 'lighting.ao.enabled', false, 'Ambient occlusion off (two extra passes and two buffers).' );
	if ( global[ 'lighting.contact.enabled' ] ) set( 'lighting.contact.enabled', false, 'Contact shadows off (a ray march per pixel).' );
	if ( global[ 'lens.dof.enabled' ] ) set( 'lens.dof.enabled', false, 'Depth of field off (bokeh is the most expensive lens effect).' );
	if ( global[ 'lens.motionBlur.enabled' ] ) set( 'lens.motionBlur.enabled', false, 'Motion blur off (needs a velocity buffer).' );
	if ( global[ 'atmosphere.godRays.enabled' ] ) set( 'atmosphere.godRays.enabled', false, 'God rays off (a 32-tap radial blur).' );
	if ( global[ 'lens.tiltShift.enabled' ] ) set( 'lens.tiltShift.enabled', false, 'Tilt-shift off.' );
	if ( global[ 'lighting.ssgi.enabled' ] ) set( 'lighting.ssgi.enabled', false, 'Screen-space GI off (the heaviest light effect).' );
	if ( global[ 'lens.anamorphic.enabled' ] ) set( 'lens.anamorphic.enabled', false, 'Anamorphic streaks off (a 32-tap streak pass).' );
	if ( global[ 'media.kuwahara.anisotropic' ] ) set( 'media.kuwahara.anisotropic', false, 'Painterly strokes without edge following (no structure pass).' );
	if ( [ 'traa', 'smaa' ].includes( global[ 'quality.aa' ] ) ) set( 'quality.aa', 'fxaa', 'TRAA / SMAA → FXAA (one pass, no history).' );
	if ( global[ 'lens.bloom.enabled' ] && global[ 'lens.bloom.source' ] !== 'emissive' ) set( 'lens.bloom.source', 'emissive', 'Bloom only from emissive surfaces.' );
	if ( global[ 'media.kuwahara.enabled' ] && global[ 'media.kuwahara.radius' ] > 2 ) { set( 'media.kuwahara.radius', 2, 'Painterly radius 2 (cost grows with the radius squared)…' ); set( 'quality.resolution', Math.min( global[ 'quality.resolution' ], 0.5 ), '…at half render scale.' ); }
	if ( global[ 'lighting.shadows.mapSize' ] > 1024 ) set( 'lighting.shadows.mapSize', 1024, 'Shadow map 1024.' );
	// Screen-space lines need three buffers: swap them for hull outlines on the parts that carry form.
	const inked = PARTS.filter( ( p ) => parts[ p ][ 'lines.screen.enabled' ] );
	if ( inked.length ) {

		o[ 'lines.screen.enabled' ] = false;
		for ( const p of [ 'characters', 'hero', 'props', 'architecture' ] ) {

			if ( ! inked.includes( p ) ) continue;
			partOverrides[ p ] = { 'lines.hull.enabled': true, 'lines.hull.thickness': Math.min( 4, Math.max( 1, parts[ p ][ 'lines.screen.thickness' ] * 0.8 ) ), 'lines.hull.color': parts[ p ][ 'lines.screen.color' ] };

		}

		changes.push( 'Screen-space lines → hull outlines on characters, props and buildings (no extra buffers).' );

	}

	return { overrides: o, partOverrides, changes };

}
