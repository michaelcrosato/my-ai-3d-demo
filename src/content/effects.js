// Effect demos (design §9 M3: "every effect ships with … a Verify contact-sheet cell").
// Each demo turns one effect on, on a scene and base look where it shows. The same list
// drives the effects contact sheet in the Verify panel (cells E01, E02, …) and the smoke
// test, which checks that every demo renders without errors and changes the image.
//
// `params` are Tune overrides on top of `look`; `minDiff` is the smallest mean pixel
// change that counts as visible for that effect; `advance` moves time between the two
// frames of a capture, for effects that need motion (motion blur).

const demo = ( id, label, o ) => ( { id, label, scene: 'lookdev', look: 'phone-safe-toon', shot: null, minDiff: 0.01, ...o } );

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
];

export const demoById = new Map( EFFECT_DEMOS.map( ( d ) => [ d.id, d ] ) );

/** Cell id shown on the effects contact sheet: E01, E02, … */
export const cellId = ( i ) => `E${String( i + 1 ).padStart( 2, '0' )}`;
