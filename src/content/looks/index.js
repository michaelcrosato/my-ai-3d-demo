// The look library (design §6.5, Appendix A): the M1 looks here, the rest in library.js.
// Looks are sparse: anything not listed keeps the registry default, or the scene's light
// rig and sky. Values are starting points, to be tuned against your ratings.

import * as L from './library.js';

const look = ( l ) => ( { schema: 'stylelab.look@1', version: 1, tags: [], pillars: [], mistakes: [], parts: {}, ...l } );

export const plain = look( {
	id: 'plain',
	name: 'Plain',
	baseline: true,
	inspiredBy: [ 'A typical agent default' ],
	tags: [ 'baseline' ],
	phone: 'cheap',
	description: 'What an AI agent usually produces: standard PBR materials, a hemisphere plus a sun, ACES tone mapping, a sky-blue background and no post-processing.',
	pillars: [ 'Nothing is styled: this is the baseline every look is compared against.' ],
	mistakes: [],
	params: {},
} );

export const seaBreeze = look( {
	id: 'sea-breeze',
	name: 'Sea Breeze Toon',
	inspiredBy: [ 'The Legend of Zelda: The Wind Waker' ],
	tags: [ 'toon', 'bright', 'outdoor', 'phone-safe' ],
	phone: 'cheap',
	description: 'Sunny, playful cel-shaded adventure: two hard tones, blue-violet shadows, banded toon water and a big bright sky with toon clouds.',
	pillars: [ 'Two hard light tones, never gradients.', 'Shadows are blue-violet, never gray.', 'Saturated, simple colors.', 'A big bright sky.', 'Lines only on characters.' ],
	mistakes: [ 'Black outlines on terrain.', 'Gray shadows.', 'Soft gradients in the shading.' ],
	bestScenes: [ 'harbor', 'lookdev' ],
	params: {
		'lighting.key.elevation': 55, 'lighting.key.color': '#fff2d6', 'lighting.key.intensity': 3.2,
		'lighting.ambient.sky': '#8cc8ff', 'lighting.ambient.ground': '#7fa36b', 'lighting.ambient.intensity': 0.55,
		'lighting.shadows.softness': 0.3,
		'surface.model': 'toon', 'surface.bands': 2, 'surface.threshold': 0.45, 'surface.softness': 0.02,
		'surface.shadowTint': '#5866d0', 'surface.shadowTintStrength': 0.55,
		'palette.saturation': 1.25, 'palette.value': 1.05,
		'atmosphere.fog.type': 'exp2', 'atmosphere.fog.density': 0.006, 'atmosphere.fog.skyTint': 1, 'atmosphere.fog.bands': 3,
		'atmosphere.sky.zenith': '#2d88e8', 'atmosphere.sky.horizon': '#bdebff', 'atmosphere.sky.ground': '#bdebff', 'atmosphere.sky.exponent': 0.8,
		'atmosphere.sky.sunSize': 3, 'atmosphere.sky.sunSoftness': 0.6,
		'atmosphere.clouds.amount': 0.35,
		'lens.bloom.enabled': true, 'lens.bloom.strength': 0.3, 'lens.bloom.radius': 0.4, 'lens.bloom.threshold': 0.9,
		'lens.vignette.amount': 0.08,
		'grade.toneMapping': 'neutral', 'grade.contrast': 1.05,
	},
	parts: {
		characters: { params: { 'lines.hull.enabled': true, 'lines.hull.thickness': 1.6, 'lines.hull.color': '#20243f', 'surface.spec.intensity': 0.6, 'surface.spec.size': 0.08, 'surface.spec.softness': 0.01 } },
		water: { params: { 'surface.model': 'toonWater', 'surface.water.deep': '#1c6fd1', 'surface.water.shallow': '#45c3e0', 'surface.water.foam': 0.35 } },
	},
} );

export const graffitiRush = look( {
	id: 'graffiti-rush',
	name: 'Graffiti Rush',
	inspiredBy: [ 'Jet Set Radio / Jet Grind Radio' ],
	tags: [ 'toon', 'ink', 'urban', 'saturated' ],
	phone: 'medium',
	description: 'Thick black ink on everything, razor-flat two-tone color and an electric palette, through a wide, slightly bent lens.',
	pillars: [ 'Thick black ink on everything.', 'Flat two-tone color.', 'An electric, saturated palette.', 'Purple shadows.', 'A wide lens.' ],
	mistakes: [ 'Thin or gray lines.', 'Realistic, muddy colors.', 'More than two light tones.' ],
	bestScenes: [ 'lookdev', 'harbor' ],
	params: {
		'lighting.key.elevation': 60, 'lighting.key.color': '#ffffff', 'lighting.key.intensity': 3,
		'lighting.ambient.intensity': 0.75, 'lighting.shadows.softness': 0,
		'surface.model': 'toon', 'surface.bands': 2, 'surface.threshold': 0.5, 'surface.softness': 0,
		'surface.shadowTint': '#4b2ba8', 'surface.shadowTintStrength': 0.6,
		'lines.screen.enabled': true, 'lines.screen.thickness': 3, 'lines.screen.color': '#0b0b0f',
		'lines.screen.silhouette': 1, 'lines.screen.crease': 0.6, 'lines.screen.creaseAngle': 35, 'lines.screen.idWeight': 1,
		'palette.remap': 1, 'palette.saturation': 1.35,
		'palette.colors': [ '#ff2e88', '#00c8ff', '#ffe600', '#7cff3a', '#ff7a1a', '#3a3f4a', '#c9ccd3' ],
		'atmosphere.fog.type': 'off',
		'atmosphere.sky.zenith': '#1e9bff', 'atmosphere.sky.horizon': '#a8ecff', 'atmosphere.sky.ground': '#a8ecff',
		'lens.fovScale': 1.25, 'lens.distortion.enabled': true, 'lens.distortion.amount': 0.12,
		'lens.bloom.enabled': true, 'lens.bloom.strength': 0.15,
		'grade.toneMapping': 'neutral', 'grade.contrast': 1.15,
	},
	parts: {
		characters: { params: { 'lines.hull.enabled': true, 'lines.hull.thickness': 2.5, 'lines.hull.color': '#0b0b0f' } },
	},
} );

export const goldenHour = look( {
	id: 'golden-hour',
	name: 'Golden Hour',
	inspiredBy: [ 'Late-afternoon photography' ],
	tags: [ 'lighting', 'warm', 'photographic' ],
	phone: 'medium',
	description: 'A low, warm backlight with long shadows, a violet fill, warm haze, god rays and glow.',
	pillars: [ 'A low warm sun.', 'Long shadows.', 'A cool violet fill.', 'Warm haze.', 'Light you can feel (glow, rim).' ],
	mistakes: [ 'Orange everywhere: keep the shadows cool.', 'A high sun.', 'Clipped, burnt highlights.' ],
	bestScenes: [ 'harbor', 'lookdev' ],
	params: {
		'lighting.key.elevation': 8, 'lighting.key.azimuth': 150, 'lighting.key.color': '#ffb066', 'lighting.key.intensity': 4,
		'lighting.ambient.sky': '#6e7fd6', 'lighting.ambient.ground': '#8b5b3c', 'lighting.ambient.intensity': 0.6,
		'lighting.shadows.softness': 2,
		'surface.model': 'pbr',
		'surface.rim.color': '#ffc27a', 'surface.rim.width': 0.35, 'surface.rim.intensity': 0.6, 'surface.rim.litSide': true,
		'atmosphere.fog.type': 'exp', 'atmosphere.fog.density': 0.005, 'atmosphere.fog.amount': 0.85, 'atmosphere.fog.skyTint': 1,
		'atmosphere.heightFog.density': 0.015, 'atmosphere.godRays.enabled': true, 'atmosphere.godRays.intensity': 0.5,
		'atmosphere.sky.zenith': '#3b4c99', 'atmosphere.sky.horizon': '#ff9d5c', 'atmosphere.sky.ground': '#ff9d5c', 'atmosphere.sky.exponent': 0.6,
		'atmosphere.sky.sunSize': 6, 'atmosphere.sky.sunSoftness': 0.8, 'atmosphere.sky.sunIntensity': 8,
		'lens.bloom.enabled': true, 'lens.bloom.threshold': 0.85, 'lens.bloom.strength': 0.35, 'lens.bloom.radius': 0.6,
		'lens.vignette.amount': 0.2,
		'grade.toneMapping': 'agx', 'grade.exposure': 0, 'grade.temperature': 0.2, 'grade.saturation': 1.1,
		'grade.split.amount': 0.35, 'grade.split.shadows': '#4b4fa3', 'grade.split.highlights': '#ffb46b', 'grade.split.balance': 0.1,
	},
} );

export const phoneSafeToon = look( {
	id: 'phone-safe-toon',
	name: 'Phone-Safe Toon',
	inspiredBy: [ 'Reference mobile look' ],
	tags: [ 'toon', 'phone-safe' ],
	phone: 'cheap',
	description: 'Everything a phone GPU likes: cel shading, hull lines, blob shadows and fog inside the materials, plus one cheap fused final pass. No bloom, no extra buffers.',
	pillars: [ 'One scene pass, no extra buffers.', 'All styling in the materials.', 'Cheap color work fused into one final pass.' ],
	mistakes: [ 'Adding bloom or screen-space lines: each adds full-screen passes.', 'Lines on terrain.' ],
	bestScenes: [ 'harbor', 'lookdev' ],
	params: {
		'lighting.shadows.softness': 0.5, 'lighting.shadows.mapSize': 1024,
		'surface.model': 'toon', 'surface.bands': 2, 'surface.softness': 0.03,
		'surface.shadowTint': '#5b63c9', 'surface.shadowTintStrength': 0.5, 'surface.rim.intensity': 0.3,
		'lines.hull.enabled': true, 'lines.hull.thickness': 1.5,
		'atmosphere.fog.type': 'exp2', 'atmosphere.fog.density': 0.008, 'atmosphere.fog.skyTint': 1,
		'lens.vignette.amount': 0.12,
		'grade.toneMapping': 'neutral', 'grade.saturation': 1.1, 'grade.contrast': 1.05,
	},
	parts: {
		terrain: { params: { 'lines.hull.enabled': false } },
		water: { params: { 'lines.hull.enabled': false } },
		sky: { params: { 'lines.hull.enabled': false } },
		characters: { params: { 'lighting.blob.enabled': true } },
	},
} );

export const graffitiDots = look( {
	...graffitiRush,
	id: 'graffiti-rush-dots',
	name: 'Graffiti Rush · Dots',
	family: 'graffiti-rush',
	tags: [ 'toon', 'ink', 'urban', 'comic' ],
	description: 'Graffiti Rush with halftone dots in the shadow band.',
	pillars: [ 'Thick black ink on everything.', 'Flat two-tone color, dotted shadows.', 'An electric, saturated palette.', 'Purple shadows.', 'A wide lens.' ],
	mistakes: [ 'Thin or gray lines.', 'Dots in the light tones.' ],
	params: { ...graffitiRush.params, 'surface.halftone.enabled': true, 'surface.halftone.size': 5, 'surface.halftone.angle': 45, 'surface.halftone.threshold': 0.5, 'surface.halftone.color': '#2a1a6a', 'surface.halftone.amount': 0.8 },
} );

/** The requested looks first (Appendix A order), then the P1 set; variants follow their family. */
export const LOOKS = [
	plain, seaBreeze, graffitiRush, graffitiDots, L.gardenPrank, L.comicInk, L.painterly,
	L.retroPs1, L.retro16, L.retroGameBoy, L.retroCrt, goldenHour, L.cinematic, phoneSafeToon,
	L.ligneClaire, L.miniature, L.oneBit, L.synthwave, L.noir, L.inkWash, L.animeCel, L.watercolor, L.sketchbook, L.layeredWilderness,
];

/** The four looks rated in M1 (Verify M1-07), kept for the M1 regression checks. */
export const M1_LOOKS = [ 'sea-breeze', 'graffiti-rush', 'golden-hour', 'phone-safe-toon' ];
export const lookById = new Map( LOOKS.map( ( l ) => [ l.id, l ] ) );
