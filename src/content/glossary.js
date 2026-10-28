// Glossary (design §6.13, Appendix F): searchable terms that Learn cards and lessons link to.
// `see` lists registry ids or lesson ids where the term shows up.

export const GLOSSARY = [
	{ id: 'npr', term: 'NPR', def: 'Non-photorealistic rendering: rendering that imitates illustration, paint or print instead of reality.', see: [ 'L1' ] },
	{ id: 'cel', term: 'Cel shading / toon ramp', def: 'Quantizing light into a few flat bands, like animation cels.', see: [ 'surface.model', 'surface.bands', 'L3' ] },
	{ id: 'shadow-tint', term: 'Shadow tint / hue-shifted shadows', def: 'Coloring shadows (usually cooler) instead of only darkening them.', see: [ 'surface.shadowTint', 'L4' ] },
	{ id: 'rim', term: 'Rim light', def: 'A bright edge where a surface turns away from the viewer; it separates the subject from the background.', see: [ 'surface.rim.intensity', 'L6' ] },
	{ id: 'hull', term: 'Inverted hull', def: 'Outlines made by drawing a slightly inflated, inside-out copy of a mesh behind it.', see: [ 'lines.hull.enabled', 'L2' ] },
	{ id: 'screen-edges', term: 'Screen-space edges', def: 'Outlines found by comparing depth, normals or object ids between neighboring pixels.', see: [ 'lines.screen.enabled', 'L2' ] },
	{ id: 'crease', term: 'Crease vs. silhouette', def: 'An inner fold line vs. the outer contour; illustrators draw silhouettes heavier.', see: [ 'lines.screen.crease', 'lines.screen.silhouette', 'L2' ] },
	{ id: 'value', term: 'Value', def: 'Lightness independent of hue: the structure of an image. If it reads in grayscale, it reads.', see: [ 'L3' ] },
	{ id: 'atmospheric', term: 'Atmospheric perspective', def: 'Distant things look lighter, lower in contrast and tinted toward the sky.', see: [ 'atmosphere.fog.skyTint', 'L5' ] },
	{ id: 'tone-mapping', term: 'Tone mapping', def: 'Compressing HDR light into the displayable range (ACES, AgX, Neutral…) so highlights roll off instead of clipping.', see: [ 'grade.toneMapping' ] },
	{ id: 'lut', term: 'Color grading / LUT', def: 'Creative color transforms; a LUT is a baked 3D lookup table of one, which any tool can apply.', see: [ 'grade.lut.enabled' ] },
	{ id: 'cdl', term: 'ASC CDL', def: 'Slope / offset / power / saturation: a standard lift-gamma-gain grade.', see: [ 'grade.lift', 'grade.gamma', 'grade.gain' ] },
	{ id: 'oklab', term: 'OKLab / OKLCH', def: 'Perceptual color spaces: even steps look even, so they are good for mixing and palette matching.', see: [ 'palette.remap' ] },
	{ id: 'bloom', term: 'Bloom', def: 'Light bleeding around bright areas, which reads as brightness beyond what the screen can show.', see: [ 'lens.bloom.enabled' ] },
	{ id: 'ao', term: 'GTAO / AO', def: 'Ambient occlusion: darkening where surfaces crowd together, which grounds objects.', see: [ 'lighting.ao.enabled', 'L5' ] },
	{ id: 'dof', term: 'Depth of field / tilt-shift', def: 'Blur by distance from the focus; tilt-shift fakes a miniature by blurring a band.', see: [ 'lens.dof.enabled', 'lens.tiltShift.enabled', 'L5' ] },
	{ id: 'kuwahara', term: 'Kuwahara filter', def: 'Edge-preserving smoothing that looks like brush strokes.', see: [ 'media.kuwahara.enabled', 'L7' ] },
	{ id: 'halftone', term: 'Halftone / Ben-Day dots', def: 'Tone made from dot size or density, as in print.', see: [ 'media.halftone.enabled', 'surface.halftone.enabled' ] },
	{ id: 'dither', term: 'Dithering (Bayer, blue noise)', def: 'Patterned noise that fakes more colors than a palette has.', see: [ 'retro.dither.amount', 'L9' ] },
	{ id: 'quantize', term: 'Posterize / quantize', def: 'Reducing colors to a fixed number of levels or to a palette.', see: [ 'retro.quantize.mode' ] },
	{ id: 'vertex-snap', term: 'Vertex snapping / affine warp', def: 'PS1-era artifacts: vertices jitter to a coarse grid and textures wobble.', see: [ 'retro.vertexSnap.enabled', 'retro.affine.enabled' ] },
	{ id: 'affine', term: 'Affine texture mapping', def: 'Interpolating texture coordinates linearly on screen, without dividing by depth: textures bend along triangle edges. The PS1 did it; modern GPUs correct for perspective.', see: [ 'retro.affine.enabled', 'retro.texture.filter' ] },
	{ id: 'texture-filtering', term: 'Texture filtering (nearest, bilinear, three-point)', def: 'How a texture is sampled between texels: the nearest one (blocky), a blend of four (smooth), or the N64\'s blend of three.', see: [ 'retro.texture.filter' ] },
	{ id: 'gooch', term: 'Gooch shading', def: 'Shading from a cool color to a warm one instead of dark to light, so no face goes black: a technical-illustration technique.', see: [ 'surface.model', 'surface.gooch.strength' ] },
	{ id: 'matcap', term: 'Matcap', def: 'A "material capture": a picture of a lit sphere, looked up by the surface\'s view-space normal. Complex lighting for one texture fetch.', see: [ 'surface.matcap.preset' ] },
	{ id: 'sobel', term: 'Sobel operator', def: 'A 3 × 3 kernel that measures how fast brightness changes; image-space edge detection. It finds shadow edges as readily as silhouettes.', see: [ 'lines.sobel.enabled', 'L2' ] },
	{ id: 'anamorphic', term: 'Anamorphic flare', def: 'Long horizontal streaks from bright lights, a trait of the squeezed lenses used for wide-screen cinema.', see: [ 'lens.anamorphic.enabled', 'lens.flare.enabled' ] },
	{ id: 'bleach-bypass', term: 'Bleach bypass', def: 'Skipping the bleach bath when developing film: silver stays in the print, giving drained color and hard contrast.', see: [ 'grade.bleach.enabled' ] },
	{ id: 'gi', term: 'Global illumination (GI)', def: 'Light that bounces between surfaces; screen-space GI estimates one bounce from what is visible.', see: [ 'lighting.ssgi.enabled' ] },
	{ id: 'cube', term: '.cube file', def: 'The common text format for 3D LUTs (Resolve, Photoshop, Lightroom, game engines); Style Lab exports and imports it.', see: [ 'grade.lut.preset' ] },
	{ id: 'mrt', term: 'MRT', def: 'Multiple render targets: one pass writes color, normals, ids and more at once. Each extra target costs bandwidth, especially on phones.', see: [ 'L10' ] },
	{ id: 'tsl', term: 'TSL', def: 'Three Shading Language: three.js\'s node-based shader language that compiles to WGSL (WebGPU) and GLSL (WebGL2).', see: [] },
	{ id: 'shower-door', term: 'Shower-door effect', def: 'Screen-space patterns that stay fixed while objects move under them, like looking through frosted glass.', see: [ 'L9' ] },
	{ id: 'twos', term: 'Animating on twos', def: 'Updating animation every second frame (12 of 24 fps) for a hand-drawn cadence.', see: [ 'motion.stepped.fps', 'L9' ] },
	{ id: 'fpe', term: 'FPE', def: 'Fullscreen-pass equivalent: Style Lab\'s unit for comparing effect costs across devices.', see: [ 'L10' ] },
	{ id: 'silhouette', term: 'Silhouette', def: 'The outer shape of an object as a flat fill. Readable silhouettes let players recognize things at a glance.', see: [ 'L2' ] },
	{ id: 'focal-point', term: 'Focal point / visual hierarchy', def: 'Where the eye goes first: the highest contrast, the most saturation, the sharpest edges.', see: [ 'L6' ] },
	{ id: '60-30-10', term: '60/30/10', def: 'A color proportion rule of thumb: a dominant color for about 60% of the frame, a secondary for 30%, an accent for 10%.', see: [ 'L4' ] },
	{ id: 'banding', term: 'Banding', def: 'Visible steps in a smooth gradient, because there are too few color levels. Grain or dither hides it.', see: [ 'media.grain.amount', 'L7' ] },
	{ id: 'temporal-stability', term: 'Temporal stability', def: 'Whether an effect holds still from frame to frame while the camera moves, instead of crawling or flickering.', see: [ 'L9' ] },
	{ id: 'tile-gpu', term: 'Tile-based GPU', def: 'Phone GPUs render the screen in small tiles in on-chip memory; every fullscreen pass and render target writes back to main memory, which is what costs.', see: [ 'L10' ] },
	{ id: 'pillar', term: 'Pillars', def: 'The 3–5 rules of a style that must never break; the core of an art direction brief.', see: [ 'L11' ] },
	{ id: 'procedural', term: 'Procedural assets', def: 'Models built by code from primitives, with seeded randomness and complexity tiers, instead of authored meshes and textures.', see: [ 'L11' ] },
];

export const glossaryById = new Map( GLOSSARY.map( ( g ) => [ g.id, g ] ) );

/** Terms matching a search (term or definition), best matches first. */
export function searchGlossary( query ) {

	const q = String( query || '' ).trim().toLowerCase();
	if ( ! q ) return GLOSSARY;
	return GLOSSARY.map( ( g ) => ( { g, score: g.term.toLowerCase().includes( q ) ? 2 : g.def.toLowerCase().includes( q ) ? 1 : 0 } ) )
		.filter( ( x ) => x.score ).sort( ( a, b ) => b.score - a.score ).map( ( x ) => x.g );

}
