import { param } from './define.js';

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
];
