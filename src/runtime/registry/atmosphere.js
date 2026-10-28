import { param, MEDIUM } from './define.js';

const p = ( e ) => param( 'atmosphere', e );

export default [
	p( {
		id: 'atmosphere.fog.type', label: 'Fog', type: 'enum', default: 'off',
		options: [
			{ value: 'off', label: 'Off' },
			{ value: 'linear', label: 'Linear (start → end)' },
			{ value: 'exp', label: 'Exponential' },
			{ value: 'exp2', label: 'Exponential squared' },
		],
		learn: {
			what: 'Distance fog, computed inside every material. Exponential squared stays clear up close and closes in quickly further out.',
			why: 'Fog is atmospheric perspective: distant things get lighter, lower in contrast and tinted toward the sky. It gives depth and separates foreground, middle ground and background.',
		},
		brief: '{label} distance fog, applied in the materials.',
		tags: [ 'fog', 'depth', 'atmosphere' ],
	} ),
	p( {
		id: 'atmosphere.fog.amount', label: 'Fog amount', type: 'float', min: 0, max: 1, step: 0.01, default: 1, neutral: 0,
		learn: {
			what: 'The maximum opacity of the fog.',
			why: 'Capping fog keeps distant landmarks visible while still giving depth.',
		},
		brief: 'Fog opacity up to {value}.',
		tags: [ 'fog' ],
	} ),
	p( {
		id: 'atmosphere.fog.density', label: 'Fog density', type: 'float', min: 0, max: 0.05, step: 0.0005, default: 0.008,
		learn: {
			what: 'How quickly exponential fog builds up with distance.',
			why: 'Match it to the scene scale: the far edge of the playable area should be about half fogged.',
			typical: '0.004–0.012 for outdoor scenes measured in meters.',
		},
		brief: 'Fog density {value} per meter.',
		tags: [ 'fog' ],
	} ),
	p( {
		id: 'atmosphere.fog.start', label: 'Fog start', type: 'float', min: 0, max: 300, step: 1, unit: 'm', default: 10,
		learn: { what: 'Distance where linear fog begins.', why: 'Keeps the play area clear while the background fades.' },
		brief: 'Linear fog starts at {value} m.',
		tags: [ 'fog' ],
	} ),
	p( {
		id: 'atmosphere.fog.end', label: 'Fog end', type: 'float', min: 1, max: 1000, step: 1, unit: 'm', default: 200,
		learn: { what: 'Distance where linear fog is fully opaque.', why: 'Hides the edge of the world.' },
		brief: 'Linear fog is opaque at {value} m.',
		tags: [ 'fog' ],
	} ),
	p( {
		id: 'atmosphere.fog.color', label: 'Fog color', type: 'color', default: '#c8dcf0',
		learn: {
			what: 'The fog color where sky tint is 0.',
			why: 'Fog that doesn\'t match the sky shows a seam at the horizon.',
		},
		brief: 'Fog color {value}.',
		tags: [ 'fog', 'color' ],
	} ),
	p( {
		id: 'atmosphere.fog.skyTint', label: 'Sky-tinted fog', type: 'float', min: 0, max: 1, step: 0.01, default: 1,
		learn: {
			what: 'Takes the fog color from the sky gradient in the direction you look.',
			why: 'This is how real aerial perspective works: distant hills take on the color of the sky behind them, so the horizon never shows a seam.',
		},
		brief: 'Fog color follows the sky gradient (amount {value}).',
		tags: [ 'fog', 'atmospheric perspective' ],
	} ),
	p( {
		id: 'atmosphere.fog.bands', label: 'Toon fog bands', type: 'int', min: 0, max: 6, step: 1, default: 0,
		learn: {
			what: 'Quantizes the fog into flat steps. 0 is smooth.',
			why: 'Stepped fog turns distance into graphic layers, like the painted backdrops of animation.',
		},
		brief: 'Fog quantized into {value} bands.',
		tags: [ 'fog', 'toon' ],
	} ),
	p( {
		id: 'atmosphere.sky.zenith', label: 'Sky zenith', type: 'color', default: '#87ceeb',
		learn: {
			what: 'The sky color straight up.',
			why: 'A gradient sky (deep at the top, pale at the horizon) frames the scene and sets the palette\'s key.',
		},
		brief: 'Sky gradient from {value} at the zenith.',
		tags: [ 'sky' ],
	} ),
	p( {
		id: 'atmosphere.sky.horizon', label: 'Sky horizon', type: 'color', default: '#87ceeb',
		learn: {
			what: 'The sky color at the horizon.',
			why: 'The horizon is usually the palest part of the sky; fog should match it.',
		},
		brief: 'Sky horizon {value}.',
		tags: [ 'sky' ],
	} ),
	p( {
		id: 'atmosphere.sky.ground', label: 'Below the horizon', type: 'color', default: '#87ceeb',
		learn: {
			what: 'The background color below the horizon.',
			why: 'Usually hidden by terrain or sea, but shows past the edge of the world.',
		},
		brief: 'Below-horizon color {value}.',
		tags: [ 'sky' ],
	} ),
	p( {
		id: 'atmosphere.sky.exponent', label: 'Sky gradient falloff', type: 'float', min: 0.2, max: 4, step: 0.05, default: 1,
		learn: {
			what: 'How quickly the sky goes from the horizon color to the zenith color.',
			why: 'Low values give a wide pale band near the horizon, like haze.',
		},
		brief: 'Sky gradient exponent {value}.',
		tags: [ 'sky' ],
	} ),
	p( {
		id: 'atmosphere.sky.sunSize', label: 'Sun disc size', type: 'float', min: 0, max: 12, step: 0.1, unit: '°', default: 0,
		learn: {
			what: 'Size of the visible sun disc in the sky (0 hides it).',
			why: 'A visible sun explains the lighting direction and gives bloom a source.',
		},
		brief: 'Visible sun disc {value}° wide.',
		tags: [ 'sky', 'sun' ],
	} ),
	p( {
		id: 'atmosphere.sky.sunSoftness', label: 'Sun disc softness', type: 'float', min: 0, max: 1, step: 0.01, default: 0.5,
		learn: { what: 'How soft the edge of the sun disc is.', why: 'Soft discs read as hazy air; hard discs as a graphic, stylized sun.' },
		brief: 'Sun disc softness {value}.',
		tags: [ 'sky', 'sun' ],
	} ),
	p( {
		id: 'atmosphere.sky.sunIntensity', label: 'Sun disc brightness', type: 'float', min: 0, max: 20, step: 0.1, default: 6,
		learn: { what: 'Brightness of the sun disc, as a multiple of the key light color.', why: 'Values above 1 are HDR, so bloom picks the sun up.' },
		brief: 'Sun disc brightness {value}× the key color.',
		tags: [ 'sky', 'sun', 'bloom' ],
	} ),
	p( {
		id: 'atmosphere.godRays.enabled', label: 'God rays', type: 'bool', default: false, structural: true, requires: [ 'depth' ], cost: MEDIUM,
		learn: {
			what: 'Shafts of light streaming from the sun past the objects in front of it (a radial blur of the sky toward the sun).',
			why: 'Visible light shafts make air feel thick and light feel physical: dust, haze, a sacred or dramatic moment.',
			avoid: 'Shots without the sun near the frame: the rays come from the sun\'s screen position.',
		},
		brief: 'God rays from the sun.',
		tags: [ 'atmosphere', 'god rays', 'light' ],
	} ),
	p( {
		id: 'atmosphere.godRays.intensity', label: 'Ray strength', type: 'float', min: 0, max: 2, step: 0.01, default: 0.6, neutral: 0, enabledBy: 'atmosphere.godRays.enabled',
		learn: { what: 'How bright the shafts are.', why: 'Subtle rays add atmosphere; strong rays are a dramatic statement.' },
		brief: 'God ray strength {value}.',
		tags: [ 'god rays' ],
	} ),
	p( {
		id: 'atmosphere.godRays.length', label: 'Ray length', type: 'float', min: 0.1, max: 1, step: 0.01, default: 0.6, enabledBy: 'atmosphere.godRays.enabled',
		learn: { what: 'How far the shafts reach from the sun, as a fraction of the way across the screen.', why: 'Long rays fill the frame with light; short ones stay a halo around the sun.' },
		brief: 'God rays reach {value} of the way from the sun.',
		tags: [ 'god rays' ],
	} ),
	p( {
		id: 'atmosphere.godRays.decay', label: 'Ray falloff', type: 'float', min: 0.8, max: 1, step: 0.001, default: 0.96, enabledBy: 'atmosphere.godRays.enabled',
		learn: { what: 'How quickly rays fade along their length.', why: 'Lower values keep the rays near the sun.' },
		brief: 'God ray decay {value}.',
		tags: [ 'god rays' ],
	} ),
];
