// Effect demos (design §9 M3: "every effect ships with … a Verify contact-sheet cell").
// Each demo turns one effect on, on a scene and base look where it shows. The same list
// drives the effects contact sheet in the Verify panel (cells E01, E02, …) and the smoke
// test, which checks that every demo renders without errors and changes the image.
//
// `params` are Tune overrides on top of `look`; `parts` are per-part values (a derived
// look is applied for those); `minDiff` is the smallest mean pixel change that counts as
// visible for that effect; `advance` moves time between the two frames of a capture, for
// effects that need motion (motion blur). Pattern sizes are enlarged in some demos so
// dots and hatch lines still show in a thumbnail-sized cell.

const demo = ( id, label, o ) => ( { id, label, scene: 'lookdev', look: 'phone-safe-toon', shot: null, minDiff: 0.01, params: {}, parts: null, ...o } );

export const EFFECT_DEMOS = [
	// A. Light and shadow
	demo( 'ao', 'Ambient occlusion', { milestone: 'M3a', effect: 'lighting.ao', params: { 'lighting.ao.enabled': true, 'lighting.ao.intensity': 1.4, 'lighting.ao.radius': 1 }, minDiff: 0.004 } ),
	demo( 'ao-ink', 'AO ink (spotted blacks)', { milestone: 'M3a', effect: 'lighting.ao', look: 'graffiti-rush', params: { 'lighting.ao.enabled': true, 'lighting.ao.ink': 1, 'lighting.ao.radius': 0.8, 'lighting.ao.tint': '#1a1030' }, minDiff: 0.002 } ),
	demo( 'contact', 'Contact shadows', { milestone: 'M3a', effect: 'lighting.contact', look: 'sea-breeze', params: { 'lighting.contact.enabled': true, 'lighting.contact.length': 0.8, 'lighting.contact.intensity': 1, 'lighting.shadows.enabled': false }, minDiff: 0.002 } ),
	demo( 'blob', 'Blob shadows', { milestone: 'M3a', effect: 'lighting.blob', params: { 'lighting.blob.enabled': true, 'lighting.blob.opacity': 0.8, 'lighting.shadows.enabled': false }, minDiff: 0.004 } ),
	demo( 'tod-dawn', 'Time of day: dawn', { milestone: 'M3a', effect: 'lighting.tod', scene: 'harbor', look: 'sea-breeze', params: { 'lighting.tod.enabled': true, 'lighting.tod.hour': 6.3 } } ),
	demo( 'tod-night', 'Time of day: blue hour', { milestone: 'M3a', effect: 'lighting.tod', scene: 'campsite', look: 'sea-breeze', params: { 'lighting.tod.enabled': true, 'lighting.tod.hour': 19.6 } } ),
	demo( 'practicals', 'Practical lights ×3', { milestone: 'M3a', effect: 'lighting.practicals', scene: 'dungeon', look: 'golden-hour', params: { 'lighting.practicals.intensity': 3, 'lighting.key.intensity': 0.6 } } ),
	demo( 'shadow-res', 'Shadow resolution 512', { milestone: 'M3a', effect: 'lighting.shadows', look: 'graffiti-rush', params: { 'lighting.shadows.mapSize': 512, 'lighting.shadows.softness': 0 }, minDiff: 0.0005 } ),
	// E. Lens and camera
	demo( 'bloom-emissive', 'Selective (emissive) bloom', { milestone: 'M3a', effect: 'lens.bloom', scene: 'hangar', look: 'sea-breeze', params: { 'lens.bloom.source': 'emissive', 'lens.bloom.strength': 1.5, 'lens.bloom.threshold': 0.1 } } ),
	demo( 'godrays', 'God rays', { milestone: 'M3a', effect: 'atmosphere.godRays', scene: 'harbor', look: 'golden-hour', params: { 'atmosphere.godRays.enabled': true, 'atmosphere.godRays.intensity': 1.5 }, minDiff: 0.006 } ),
	demo( 'motion-blur', 'Motion blur (360°)', { milestone: 'M3a', effect: 'lens.motionBlur', scene: 'kart', look: 'sea-breeze', shot: 'gameplay', params: { 'lens.motionBlur.enabled': true, 'lens.motionBlur.shutter': 360 }, advance: 1 / 15, minDiff: 0.002 } ),
	demo( 'dof', 'Depth of field', { milestone: 'M3a', effect: 'lens.dof', look: 'golden-hour', params: { 'lens.dof.enabled': true, 'lens.dof.range': 2.5, 'lens.dof.blur': 2.5 } } ),
	demo( 'tilt-shift', 'Tilt-shift', { milestone: 'M3a', effect: 'lens.tiltShift', scene: 'garden', look: 'sea-breeze', params: { 'lens.tiltShift.enabled': true, 'lens.tiltShift.blur': 3, 'lens.tiltShift.width': 0.14 } } ),
	demo( 'ca', 'Chromatic aberration', { milestone: 'M3a', effect: 'lens.ca', scene: 'hangar', params: { 'lens.ca.enabled': true, 'lens.ca.amount': 2.5 }, minDiff: 0.004 } ),
	demo( 'distortion', 'Barrel distortion', { milestone: 'M3a', effect: 'lens.distortion', scene: 'plaza', look: 'graffiti-rush', params: { 'lens.distortion.enabled': true, 'lens.distortion.amount': 0.3 } } ),
	demo( 'letterbox', 'Letterbox 2.39:1', { milestone: 'M3a', effect: 'lens.letterbox', look: 'golden-hour', params: { 'lens.letterbox.amount': 1 } } ),
	// F. Color and tone
	demo( 'cdl', 'Lift / gamma / gain', { milestone: 'M3a', effect: 'grade.basic', params: { 'grade.lift': 0.08, 'grade.gamma': 0.75, 'grade.gain': 1.15 } } ),
	demo( 'hue-vibrance', 'Hue shift and vibrance', { milestone: 'M3a', effect: 'grade.basic', params: { 'grade.hue': 70, 'grade.vibrance': 0.8 } } ),
	demo( 'selective', 'Selective color (red)', { milestone: 'M3a', effect: 'grade.selective', scene: 'plaza', look: 'graffiti-rush', params: { 'grade.selective.enabled': true, 'grade.selective.hue': 0, 'grade.selective.range': 40 } } ),
	demo( 'lut-teal', 'LUT: teal and orange', { milestone: 'M3a', effect: 'grade.lut', look: 'golden-hour', params: { 'grade.lut.enabled': true, 'grade.lut.preset': 'teal-orange' } } ),
	demo( 'lut-bleach', 'LUT: bleach bypass', { milestone: 'M3a', effect: 'grade.lut', look: 'golden-hour', params: { 'grade.lut.enabled': true, 'grade.lut.preset': 'bleach' } } ),
	demo( 'lut-cross', 'LUT: cross-processed', { milestone: 'M3a', effect: 'grade.lut', params: { 'grade.lut.enabled': true, 'grade.lut.preset': 'cross' } } ),
	demo( 'lut-night', 'LUT: cool night', { milestone: 'M3a', effect: 'grade.lut', scene: 'campsite', params: { 'grade.lut.enabled': true, 'grade.lut.preset': 'cool-night' } } ),
	demo( 'gradient-map', 'Gradient map (duotone)', { milestone: 'M3a', effect: 'grade.gradientMap', params: { 'grade.gradientMap.enabled': true } } ),
	// H. Retro and display
	demo( 'pixel', 'Pixelation', { milestone: 'M3a', effect: 'retro.pixel', params: { 'retro.pixel.enabled': true, 'retro.pixel.height': 90, 'retro.pixel.edges': 0 } } ),
	demo( 'pixel-edges', 'Pixelation + edge highlights', { milestone: 'M3a', effect: 'retro.pixel', scene: 'dungeon', look: 'sea-breeze', params: { 'retro.pixel.enabled': true, 'retro.pixel.height': 90, 'retro.pixel.edges': 1 } } ),
	demo( 'posterize', 'Posterize (4 levels)', { milestone: 'M3a', effect: 'retro.quantize', look: 'golden-hour', params: { 'retro.quantize.mode': 'posterize', 'retro.quantize.levels': 4, 'retro.dither.amount': 0 } } ),
	demo( 'posterize-dither', 'Posterize + Bayer dither', { milestone: 'M3a', effect: 'retro.quantize', look: 'golden-hour', params: { 'retro.quantize.mode': 'posterize', 'retro.quantize.levels': 4, 'retro.dither.amount': 1, 'retro.dither.pattern': 'bayer4' } } ),
	demo( 'pico8', 'PICO-8 palette + dither', { milestone: 'M3a', effect: 'retro.quantize', scene: 'harbor', look: 'sea-breeze', params: { 'retro.quantize.mode': 'palette', 'retro.quantize.palette': 'pico8', 'retro.dither.amount': 0.8, 'retro.pixel.enabled': true, 'retro.pixel.height': 120 } } ),
	demo( 'gameboy', 'Game Boy palette', { milestone: 'M3a', effect: 'retro.quantize', scene: 'platforms', params: { 'retro.quantize.mode': 'palette', 'retro.quantize.palette': 'gameboy', 'retro.dither.amount': 0.7, 'retro.pixel.enabled': true, 'retro.pixel.height': 72 } } ),
	demo( 'onebit', '1-bit noise dither', { milestone: 'M3a', effect: 'retro.quantize', scene: 'dungeon', look: 'golden-hour', params: { 'retro.quantize.mode': 'palette', 'retro.quantize.palette': 'onebit', 'retro.dither.amount': 1, 'retro.dither.pattern': 'noise' } } ),
	demo( 'vertex-snap', 'Vertex snapping (PS1)', { milestone: 'M3a', effect: 'retro.vertexSnap', look: 'sea-breeze', params: { 'retro.vertexSnap.enabled': true, 'retro.vertexSnap.grid': 40 }, minDiff: 0.004 } ),
	demo( 'crt', 'CRT', { milestone: 'M3a', effect: 'retro.crt', scene: 'platforms', look: 'sea-breeze', params: { 'retro.crt.enabled': true, 'retro.crt.scanlines': 0.7, 'retro.crt.curvature': 0.12, 'retro.crt.mask': 0.4 } } ),
	// I. Motion
	demo( 'stepped', 'Animate on eights', { milestone: 'M3a', effect: 'motion.stepped', scene: 'kart', look: 'sea-breeze', shot: 'gameplay', params: { 'motion.stepped.fps': 8 }, minDiff: 0.001 } ),
	// G. Media (M3b)
	demo( 'kuwahara', 'Painterly (Kuwahara)', { milestone: 'M3b', effect: 'media.kuwahara', scene: 'harbor', look: 'sea-breeze', params: { 'media.kuwahara.enabled': true, 'media.kuwahara.radius': 6 }, minDiff: 0.004 } ),
	demo( 'watercolor', 'Watercolor on cold-press', { milestone: 'M3b', effect: 'media.watercolor', look: 'sea-breeze', params: { 'media.watercolor.enabled': true, 'media.paper.enabled': true, 'media.paper.type': 'watercolor', 'media.paper.strength': 0.5 } } ),
	demo( 'halftone-mono', 'Halftone (mono)', { milestone: 'M3b', effect: 'media.halftone', scene: 'plaza', look: 'graffiti-rush', params: { 'media.halftone.enabled': true, 'media.halftone.size': 14, 'media.halftone.shadows': 0.5 } } ),
	demo( 'halftone-cmyk', 'Halftone (CMYK)', { milestone: 'M3b', effect: 'media.halftone', look: 'sea-breeze', params: { 'media.halftone.enabled': true, 'media.halftone.mode': 'cmyk', 'media.halftone.size': 12 } } ),
	demo( 'hatching-post', 'Hatching (post)', { milestone: 'M3b', effect: 'media.hatching', look: 'golden-hour', params: { 'media.hatching.enabled': true, 'media.hatching.spacing': 14 } } ),
	demo( 'misregistration', 'Print misregistration', { milestone: 'M3b', effect: 'media.misregistration', scene: 'plaza', look: 'graffiti-rush', params: { 'media.misregistration.enabled': true, 'media.misregistration.offset': 3 }, minDiff: 0.004 } ),
	demo( 'paper-canvas', 'Paper: canvas', { milestone: 'M3b', effect: 'media.paper', params: { 'media.paper.enabled': true, 'media.paper.type': 'canvas', 'media.paper.strength': 0.8 } } ),
	demo( 'paper-kraft', 'Paper: kraft', { milestone: 'M3b', effect: 'media.paper', look: 'graffiti-rush', params: { 'media.paper.enabled': true, 'media.paper.type': 'kraft', 'media.paper.color': '#c9a477', 'media.paper.strength': 0.8 } } ),
	// B. Surface patterns and color (M3b)
	demo( 'halftone-shading', 'Halftone shading (3 bands)', { milestone: 'M3b', effect: 'surface.halftone', params: { 'surface.bands': 3, 'surface.halftone.enabled': true, 'surface.halftone.size': 16 } } ),
	demo( 'halftone-world', 'Halftone shading, world space', { milestone: 'M3b', effect: 'surface.halftone', params: { 'surface.bands': 3, 'surface.halftone.enabled': true, 'surface.halftone.space': 'world', 'surface.halftone.size': 12 } } ),
	demo( 'hatching-shading', 'Hatching shading', { milestone: 'M3b', effect: 'surface.hatching', params: { 'surface.bands': 3, 'surface.hatching.enabled': true, 'surface.hatching.threshold': 0.6, 'surface.hatching.layers': 3, 'surface.hatching.spacing': 14 } } ),
	demo( 'dither-shading', 'Dithered 1-bit shading', { milestone: 'M3b', effect: 'surface.dither', params: { 'surface.bands': 2, 'surface.dither.enabled': true, 'surface.softness': 0.5 }, minDiff: 0.006 } ),
	demo( 'variation', 'Color variation', { milestone: 'M3b', effect: 'surface.variation', scene: 'meadow', params: { 'surface.variation.enabled': true, 'surface.variation.amount': 0.3, 'surface.variation.scale': 0.4 }, minDiff: 0.004 } ),
	demo( 'gradient', 'Vertical gradient', { milestone: 'M3b', effect: 'surface.gradient', params: { 'surface.gradient.enabled': true, 'surface.gradient.amount': 0.6, 'surface.gradient.height': 2 } } ),
	demo( 'toon-water', 'Toon water', { milestone: 'M3b', effect: 'surface.toonWater', scene: 'harbor', look: 'sea-breeze', parts: { water: { 'surface.model': 'toonWater', 'palette.tintAmount': 0 } } } ),
	demo( 'wind', 'Wind ×3', { milestone: 'M3b', effect: 'surface.wind', scene: 'meadow', params: { 'surface.wind.strength': 3, 'surface.wind.speed': 1.5 }, minDiff: 0.003 } ),
	demo( 'wind-trees', 'Wind sway on all foliage', { milestone: 'M3b', effect: 'surface.wind', scene: 'meadow', parts: { foliage: { 'surface.wind.enabled': true, 'surface.wind.strength': 3 } }, minDiff: 0.002 } ),
	// C. Lines (M3b)
	demo( 'lines-weight', 'Lines thicker in shadow', { milestone: 'M3b', effect: 'lines.screen', look: 'graffiti-rush', params: { 'lines.screen.lightWeight': 2 }, minDiff: 0.004 } ),
	demo( 'lines-wobble', 'Line wobble', { milestone: 'M3b', effect: 'lines.screen', look: 'graffiti-rush', params: { 'lines.screen.wobble': 4, 'lines.screen.wobbleScale': 1.5 }, minDiff: 0.0008 } ),
	demo( 'lines-pencil', 'Pencil lines', { milestone: 'M3b', effect: 'lines.screen', look: 'graffiti-rush', params: { 'lines.screen.texture': 'pencil', 'lines.screen.textureAmount': 1, 'lines.screen.color': '#4a4a52' }, minDiff: 0.004 } ),
	demo( 'lines-brush', 'Brush lines', { milestone: 'M3b', effect: 'lines.screen', look: 'graffiti-rush', params: { 'lines.screen.texture': 'brush', 'lines.screen.textureAmount': 1 }, minDiff: 0.001 } ),
	demo( 'lines-colored', 'Colored lines', { milestone: 'M3b', effect: 'lines.screen', look: 'graffiti-rush', params: { 'lines.screen.colorFromSurface': 1 }, minDiff: 0.004 } ),
	demo( 'lines-fade', 'Lines fade with distance', { milestone: 'M3b', effect: 'lines.screen', scene: 'meadow', look: 'graffiti-rush', params: { 'lines.screen.fade': 1, 'lines.screen.fadeStart': 8, 'lines.screen.fadeEnd': 40 } } ),
	// D. Atmosphere (M3b)
	demo( 'height-fog', 'Height fog', { milestone: 'M3b', effect: 'atmosphere.heightFog', scene: 'campsite', look: 'sea-breeze', params: { 'atmosphere.heightFog.density': 0.08, 'atmosphere.heightFog.falloff': 0.3 } } ),
	demo( 'clouds', 'Toon clouds', { milestone: 'M3b', effect: 'atmosphere.clouds', scene: 'harbor', look: 'sea-breeze', params: { 'atmosphere.clouds.amount': 1, 'atmosphere.clouds.coverage': 0.55 }, minDiff: 0.004 } ),
	// J. Anti-aliasing (M3b)
	demo( 'aa-smaa', 'SMAA', { milestone: 'M3b', effect: 'quality.aa', look: 'graffiti-rush', params: { 'quality.aa': 'smaa' }, minDiff: 0.0003 } ),
	demo( 'aa-traa', 'TRAA', { milestone: 'M3b', effect: 'quality.aa', look: 'graffiti-rush', params: { 'quality.aa': 'traa' }, minDiff: 0.0003 } ),
	demo( 'aa-none', 'No anti-aliasing', { milestone: 'M3b', effect: 'quality.aa', params: { 'quality.aa': 'none' }, minDiff: 0.0003 } ),
];

export const demoById = new Map( EFFECT_DEMOS.map( ( d ) => [ d.id, d ] ) );

/** Cell id shown on the effects contact sheet: E01, E02, … */
export const cellId = ( i ) => `E${String( i + 1 ).padStart( 2, '0' )}`;
