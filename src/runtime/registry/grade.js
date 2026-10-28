import { param, CHEAP } from './define.js';

const p = ( e ) => param( 'grade', e );

export default [
	p( {
		id: 'grade.exposure', label: 'Exposure', type: 'float', min: - 3, max: 3, step: 0.05, unit: 'EV', default: 0,
		learn: {
			what: 'Brightens or darkens the HDR image before tone mapping, in photographic stops (+1 EV doubles the light).',
			why: 'Exposure sets where the midtones land. Adjust it before contrast, as a photographer would.',
		},
		brief: 'Exposure {value} EV.',
		tags: [ 'exposure', 'tone' ],
	} ),
	p( {
		id: 'grade.toneMapping', label: 'Tone mapping', type: 'enum', default: 'aces', structural: true,
		options: [
			{ value: 'none', label: 'None (clip)' },
			{ value: 'linear', label: 'Linear' },
			{ value: 'reinhard', label: 'Reinhard' },
			{ value: 'cineon', label: 'Cineon' },
			{ value: 'aces', label: 'ACES Filmic' },
			{ value: 'agx', label: 'AgX' },
			{ value: 'neutral', label: 'Neutral (Khronos PBR)' },
		],
		learn: {
			what: 'How HDR light values are compressed into what a screen can show.',
			why: 'ACES adds filmic contrast and shifts saturated colors; Neutral keeps the colors you picked, which suits saturated cartoon palettes; AgX handles bright, saturated light gracefully.',
			typical: 'Neutral for toon palettes, ACES or AgX for photographic looks.',
		},
		brief: '{label} tone mapping.',
		tags: [ 'tone mapping', 'tone' ],
	} ),
	p( {
		id: 'grade.temperature', label: 'White balance: temperature', type: 'float', min: - 1, max: 1, step: 0.01, default: 0,
		learn: {
			what: 'Warms (+) or cools (−) the whole image.',
			why: 'Temperature is mood: warm for nostalgia and sunsets, cool for night, tension or sci-fi.',
		},
		brief: 'White balance temperature {value} (+ warm).',
		tags: [ 'grade', 'temperature' ],
	} ),
	p( {
		id: 'grade.tint', label: 'White balance: tint', type: 'float', min: - 1, max: 1, step: 0.01, default: 0,
		learn: { what: 'Shifts the image toward magenta (+) or green (−).', why: 'Corrects or adds the green cast of fluorescent or jungle light.' },
		brief: 'White balance tint {value} (+ magenta).',
		tags: [ 'grade' ],
	} ),
	p( {
		id: 'grade.contrast', label: 'Contrast', type: 'float', min: 0.5, max: 2, step: 0.01, default: 1,
		learn: {
			what: 'Pushes tones away from middle gray (or toward it, below 1), in display space.',
			why: 'Contrast gives punch and separates values. Low contrast reads as hazy, nostalgic or soft.',
			typical: '1.05–1.2.',
		},
		brief: 'Contrast {value}.',
		tags: [ 'grade', 'contrast' ],
	} ),
	p( {
		id: 'grade.saturation', label: 'Saturation (grade)', type: 'float', min: 0, max: 2, step: 0.01, default: 1,
		learn: {
			what: 'Scales the colorfulness of the final image.',
			why: 'Grading saturation affects everything at once, light and fog included. Use palette saturation to change specific parts.',
		},
		brief: 'Final image saturation {value}.',
		tags: [ 'grade', 'saturation' ],
	} ),
	p( {
		id: 'grade.split.amount', label: 'Split toning', type: 'float', min: 0, max: 1, step: 0.01, default: 0,
		learn: {
			what: 'Tints the shadows with one color and the highlights with another.',
			why: 'The classic film grade (teal shadows, warm highlights) adds color contrast without touching the scene\'s lighting.',
			typical: '0.2–0.5.',
		},
		brief: 'Split toning at {value}.',
		tags: [ 'grade', 'split tone' ],
	} ),
	p( {
		id: 'grade.split.shadows', label: 'Split: shadow color', type: 'color', default: '#2e5f8a',
		learn: { what: 'Color mixed into the dark tones.', why: 'Cool shadow tones read as depth and sky light.' },
		brief: 'Shadows toned {value}.',
		tags: [ 'split tone' ],
	} ),
	p( {
		id: 'grade.split.highlights', label: 'Split: highlight color', type: 'color', default: '#ffb46b',
		learn: { what: 'Color mixed into the bright tones.', why: 'Warm highlights read as sunlight and skin.' },
		brief: 'Highlights toned {value}.',
		tags: [ 'split tone' ],
	} ),
	p( {
		id: 'grade.split.balance', label: 'Split: balance', type: 'float', min: - 1, max: 1, step: 0.01, default: 0,
		learn: { what: 'Moves the crossover between shadow and highlight toning.', why: 'Positive values give more of the image to the shadow color.' },
		brief: 'Split balance {value}.',
		tags: [ 'split tone' ],
	} ),
	p( {
		id: 'grade.lift', label: 'Lift (shadows)', type: 'float', min: - 0.3, max: 0.3, step: 0.005, default: 0,
		learn: {
			what: 'Raises (+) or crushes (−) the darkest tones; the CDL "offset".',
			why: 'Lifted blacks read as faded film, haze or a soft pastel style; crushed blacks read as punchy and dramatic.',
			typical: '−0.03 to +0.05.',
		},
		brief: 'Lift {value} (CDL offset).',
		tags: [ 'grade', 'cdl', 'shadows' ],
	} ),
	p( {
		id: 'grade.gamma', label: 'Gamma (midtones)', type: 'float', min: 0.5, max: 2, step: 0.01, default: 1,
		learn: {
			what: 'Brightens (below 1) or darkens (above 1) the midtones while black and white stay put; the CDL "power".',
			why: 'Most of an image is midtones. Gamma changes the overall mood without clipping either end.',
		},
		brief: 'Gamma {value} (CDL power).',
		tags: [ 'grade', 'cdl', 'midtones' ],
	} ),
	p( {
		id: 'grade.gain', label: 'Gain (highlights)', type: 'float', min: 0.5, max: 2, step: 0.01, default: 1,
		learn: {
			what: 'Scales every tone, which mostly moves the highlights; the CDL "slope".',
			why: 'Gain sets how bright the brightest areas get. Together, lift, gamma and gain are the standard three-way color corrector.',
		},
		brief: 'Gain {value} (CDL slope).',
		tags: [ 'grade', 'cdl', 'highlights' ],
	} ),
	p( {
		id: 'grade.vibrance', label: 'Vibrance', type: 'float', min: - 1, max: 1, step: 0.01, default: 0,
		learn: {
			what: 'Boosts the color of muted tones more than already saturated ones.',
			why: 'Unlike saturation, vibrance lifts dull colors without pushing bright ones (or skin) into neon.',
		},
		brief: 'Vibrance {value}.',
		tags: [ 'grade', 'saturation' ],
	} ),
	p( {
		id: 'grade.hue', label: 'Hue shift (grade)', type: 'angle', min: - 180, max: 180, step: 1, unit: '°', default: 0,
		learn: {
			what: 'Rotates the hue of the whole final image, light and fog included.',
			why: 'A small global shift unifies an image toward one color family; a big one is a psychedelic or "corrupted world" effect. Use the palette hue to shift objects only.',
		},
		brief: 'Final image hue rotated {value}°.',
		tags: [ 'grade', 'hue' ],
	} ),
	p( {
		id: 'grade.selective.enabled', label: 'Selective color', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Keeps one hue in color and desaturates everything else.',
			why: 'A single colored element in a gray world becomes the focus of every frame: the red coat in a black-and-white film.',
			avoid: 'Choosing a hue that appears everywhere in the scene: nothing stands out.',
		},
		brief: 'Selective color: only one hue keeps its color.',
		tags: [ 'grade', 'selective color', 'noir', 'focus' ],
	} ),
	p( {
		id: 'grade.selective.hue', label: 'Kept hue', type: 'angle', min: - 180, max: 180, step: 1, unit: '°', default: 25, enabledBy: 'grade.selective.enabled',
		learn: { what: 'The hue that keeps its color (OKLCH hue angle: about 25° red, 90° yellow, 145° green, 250° blue, 330° magenta).', why: 'Pick the color of your subject.' },
		brief: 'Kept hue {value}° (OKLCH).',
		tags: [ 'selective color' ],
	} ),
	p( {
		id: 'grade.selective.range', label: 'Hue range', type: 'float', min: 5, max: 120, step: 1, unit: '°', default: 35, enabledBy: 'grade.selective.enabled',
		learn: { what: 'How far around the kept hue colors survive.', why: 'Narrow ranges isolate one object; wide ranges keep a whole color family.' },
		brief: 'Hue range ±{value}°.',
		tags: [ 'selective color' ],
	} ),
	p( {
		id: 'grade.selective.amount', label: 'Desaturate the rest', type: 'float', min: 0, max: 1, step: 0.01, default: 1, neutral: 0, enabledBy: 'grade.selective.enabled',
		learn: { what: 'How gray everything outside the range becomes.', why: 'Full desaturation is the classic noir effect; partial keeps a hint of the world\'s color.' },
		brief: 'Other hues desaturated {value}.',
		tags: [ 'selective color' ],
	} ),
	p( {
		id: 'grade.lut.enabled', label: 'Color LUT', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'A 3D lookup table: a baked, complete color grade applied in one texture fetch.',
			why: 'This is how games ship film-style grades: an artist grades a frame in any tool, exports a LUT, and the engine applies it for almost nothing. The presets here are generated in code.',
		},
		brief: 'A 3D color LUT.',
		tags: [ 'grade', 'lut' ],
	} ),
	p( {
		id: 'grade.lut.preset', label: 'LUT preset', type: 'enum', default: 'teal-orange', enabledBy: 'grade.lut.enabled',
		options: [
			{ value: 'teal-orange', label: 'Teal and orange' },
			{ value: 'warm-film', label: 'Warm film' },
			{ value: 'bleach', label: 'Bleach bypass' },
			{ value: 'cross', label: 'Cross-processed' },
			{ value: 'faded', label: 'Faded print' },
			{ value: 'cool-night', label: 'Cool night' },
		],
		learn: { what: 'Which generated grade the LUT holds.', why: 'Each preset is a recognizable film or photo-lab look; compare them at full strength, then dial the amount back.' },
		brief: 'LUT preset: {label}.',
		tags: [ 'lut' ],
	} ),
	p( {
		id: 'grade.lut.amount', label: 'LUT amount', type: 'float', min: 0, max: 1, step: 0.01, default: 1, neutral: 0, enabledBy: 'grade.lut.enabled',
		learn: { what: 'Blends between the image and the LUT result.', why: 'Most LUTs look best at 40–70%: the character without the cliché.' },
		brief: 'LUT at {value}.',
		tags: [ 'lut' ],
	} ),
	p( {
		id: 'grade.gradientMap.enabled', label: 'Gradient map', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Replaces every pixel\'s color with a color from a gradient, chosen by its brightness (duotone, tritone).',
			why: 'It forces a whole image into a designed palette while keeping its light structure, the look of screen-printed posters and stylized flashbacks.',
		},
		brief: 'Gradient map (brightness → color).',
		tags: [ 'grade', 'duotone', 'gradient map', 'palette' ],
	} ),
	p( {
		id: 'grade.gradientMap.stops', label: 'Gradient', type: 'palette', default: [ '#1b1442', '#7a3b8f', '#f08a5d', '#fff1c9' ], enabledBy: 'grade.gradientMap.enabled',
		learn: { what: 'The gradient from shadows (first color) to highlights (last), 2–8 stops.', why: 'Dark-to-light gradients that also shift hue (purple → orange → cream) give the richest duotones.' },
		brief: 'Gradient map stops: {value}.',
		tags: [ 'gradient map' ],
	} ),
	p( {
		id: 'grade.gradientMap.amount', label: 'Gradient map amount', type: 'float', min: 0, max: 1, step: 0.01, default: 1, neutral: 0, enabledBy: 'grade.gradientMap.enabled',
		learn: { what: 'Blends between the image and its gradient-mapped version.', why: 'At 20–40% a gradient map becomes a subtle unifying tint.' },
		brief: 'Gradient map at {value}.',
		tags: [ 'gradient map' ],
	} ),
];
