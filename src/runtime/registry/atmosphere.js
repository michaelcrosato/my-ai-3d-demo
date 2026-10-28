import { param, CHEAP, MEDIUM } from './define.js';

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
	p( {
		id: 'atmosphere.heightFog.density', label: 'Height fog', type: 'float', min: 0, max: 0.3, step: 0.001, default: 0, neutral: 0,
		learn: {
			what: 'Fog that pools near the ground and thins out with height, like mist in a valley or haze at sea level.',
			why: 'Low-lying fog separates layers of a landscape (each hill gets its own pale band) and makes tall things rise out of it. Combine it with distance fog.',
			typical: '0.02–0.08.',
		},
		brief: 'Height fog density {value}.',
		tags: [ 'fog', 'height fog', 'atmosphere', 'mist' ],
	} ),
	p( {
		id: 'atmosphere.heightFog.base', label: 'Height fog level', type: 'float', min: - 20, max: 60, step: 0.5, unit: 'm', default: 0,
		learn: { what: 'The height where height fog is at full density.', why: 'Set it to the valley floor or the sea.' },
		brief: 'Height fog at {value} m.',
		tags: [ 'height fog' ],
	} ),
	p( {
		id: 'atmosphere.heightFog.falloff', label: 'Height fog falloff', type: 'float', min: 0.02, max: 2, step: 0.01, default: 0.25,
		learn: { what: 'How quickly height fog thins with altitude.', why: 'High values make a thin layer of ground mist; low values a deep haze.' },
		brief: 'Height fog falloff {value} per meter.',
		tags: [ 'height fog' ],
	} ),
	p( {
		id: 'atmosphere.clouds.amount', label: 'Toon clouds', type: 'float', min: 0, max: 1, step: 0.01, default: 0, neutral: 0,
		learn: {
			what: 'Flat, stylized clouds painted into the sky, drifting slowly.',
			why: 'A big sky with simple, banded clouds is half of a cel-shaded adventure look, and gives the eye depth and a sense of weather.',
		},
		brief: 'Toon clouds (opacity {value}).',
		tags: [ 'sky', 'clouds', 'toon' ],
	} ),
	p( {
		id: 'atmosphere.clouds.coverage', label: 'Cloud coverage', type: 'float', min: 0, max: 1, step: 0.01, default: 0.45,
		learn: { what: 'How much of the sky the clouds cover.', why: 'Scattered clouds read as fair weather; full coverage as overcast.' },
		brief: 'Cloud coverage {value}.',
		tags: [ 'clouds' ],
	} ),
	p( {
		id: 'atmosphere.clouds.softness', label: 'Cloud softness', type: 'float', min: 0, max: 0.5, step: 0.01, default: 0.06,
		learn: { what: 'How soft cloud edges are.', why: 'Hard edges read as graphic, cel-painted clouds; soft ones as painted or real.' },
		brief: 'Cloud edge softness {value}.',
		tags: [ 'clouds' ],
	} ),
	p( {
		id: 'atmosphere.clouds.bands', label: 'Cloud shading bands', type: 'int', min: 0, max: 4, step: 1, default: 2,
		learn: { what: 'Flat tones of light inside each cloud (0 is smooth).', why: 'Two tones (lit top, shaded belly) is the classic toon cloud.' },
		brief: 'Clouds shaded in {value} bands.',
		tags: [ 'clouds', 'toon' ],
	} ),
	p( {
		id: 'atmosphere.clouds.scale', label: 'Cloud size', type: 'float', min: 0.2, max: 4, step: 0.05, unit: '×', default: 1,
		learn: { what: 'Size of the cloud shapes.', why: 'Large clouds feel calm and close; small ones feel high and far away.' },
		brief: 'Cloud size ×{value}.',
		tags: [ 'clouds' ],
	} ),
	p( {
		id: 'atmosphere.clouds.speed', label: 'Cloud drift', type: 'float', min: 0, max: 3, step: 0.01, default: 0.3,
		learn: { what: 'How fast clouds drift.', why: 'Slow drift adds life to a still shot.' },
		brief: 'Cloud drift {value}.',
		tags: [ 'clouds', 'motion' ],
	} ),
	p( {
		id: 'atmosphere.clouds.color', label: 'Cloud color', type: 'color', default: '#ffffff',
		learn: { what: 'The lit color of the clouds.', why: 'Tint it with the sun: white at noon, peach at sunset.' },
		brief: 'Clouds {value}.',
		tags: [ 'clouds', 'color' ],
	} ),
	p( {
		id: 'atmosphere.clouds.shade', label: 'Cloud shadow color', type: 'color', default: '#a9b8dc',
		learn: { what: 'The color of the clouds\' shaded undersides.', why: 'A cool, sky-tinted shade keeps clouds airy; gray reads as rain.' },
		brief: 'Cloud shade {value}.',
		tags: [ 'clouds', 'color' ],
	} ),
	// P2 (M10): per-part fog, physical sky, ambient particles.
	p( {
		id: 'atmosphere.fog.partAmount', scope: 'both', label: 'Fog on this part', type: 'float', min: 0, max: 1, step: 0.01, default: 1,
		learn: {
			what: 'Scales the fog on one part (edit it in the Parts tab). 1 is the look\'s fog, 0 keeps the part clear.',
			why: 'Art direction often exempts something from fog: the hero must read at any distance, emissive signs should cut through the mist, a skyline stays crisp while the ground fogs.',
			avoid: 'Clearing large background parts: the depth that fog gives comes back flat.',
		},
		brief: 'Fog on this part ×{value}.',
		tags: [ 'fog', 'parts' ],
	} ),
	p( {
		id: 'atmosphere.sky.model', label: 'Sky model', type: 'enum', default: 'gradient', structural: true,
		options: [
			{ value: 'gradient', label: 'Gradient (art-directed)' },
			{ value: 'physical', label: 'Physical (Preetham)' },
		],
		learn: {
			what: 'Gradient paints the sky from three colors; Physical computes it from the sun\'s position by atmospheric scattering (Preetham), with haze set by turbidity.',
			why: 'A physical sky moves correctly with the time of day (orange at sunset, deep blue at noon) without hand-picking colors. Stylized games usually prefer the control of a gradient.',
			avoid: 'Physical skies in graphic, flat-color looks: their soft realism clashes with cel shading.',
		},
		brief: 'Sky: {label}.',
		tags: [ 'sky', 'physical', 'scattering' ],
	} ),
	p( {
		id: 'atmosphere.sky.turbidity', label: 'Turbidity (haze)', type: 'float', min: 1, max: 20, step: 0.1, default: 4,
		learn: { what: 'How hazy the physical sky is: 2 is clear mountain air, 10 a humid summer day.', why: 'Haze whitens the horizon and widens the glow around the sun.', typical: '2–6.' },
		brief: 'Sky turbidity {value}.',
		tags: [ 'sky', 'physical' ],
	} ),
	p( {
		id: 'atmosphere.sky.rayleigh', label: 'Rayleigh (blueness)', type: 'float', min: 0, max: 4, step: 0.01, default: 1.5,
		learn: { what: 'How strongly air scatters blue light in the physical sky.', why: 'Higher values give deeper blue overhead and redder sunsets.', typical: '1–3.' },
		brief: 'Rayleigh scattering {value}.',
		tags: [ 'sky', 'physical' ],
	} ),
	p( {
		id: 'atmosphere.particles.enabled', label: 'Ambient particles', type: 'bool', default: false, structural: true, cost: { ...CHEAP, fpe: 0.3 },
		learn: {
			what: 'Thousands of small camera-facing sprites drifting through the air around the camera: dust, pollen, embers, snow or rain.',
			why: 'Particles fill the empty air between the camera and the scene, so the space feels deep and alive: motes in a sunbeam, embers over a fire, snow on a quiet night.',
			avoid: 'Dense particles in front of gameplay, and particles that ignore the scene\'s weather.',
		},
		brief: 'Ambient particles: {label}.',
		tags: [ 'particles', 'dust', 'snow', 'rain', 'embers', 'atmosphere' ],
	} ),
	p( {
		id: 'atmosphere.particles.type', label: 'Particle type', type: 'enum', default: 'dust', enabledBy: 'atmosphere.particles.enabled',
		options: [
			{ value: 'dust', label: 'Dust motes (float)' },
			{ value: 'pollen', label: 'Pollen (drift)' },
			{ value: 'embers', label: 'Embers (rise, glow)' },
			{ value: 'snow', label: 'Snow (fall, sway)' },
			{ value: 'rain', label: 'Rain (streaks)' },
		],
		learn: { what: 'How the particles move and look: floating motes, drifting pollen, rising glowing embers, falling snow or rain streaks.', why: 'Each type says something about the place: a dusty attic, a spring meadow, a forge, winter, a noir street.' },
		brief: 'Particles: {label}.',
		tags: [ 'particles' ],
	} ),
	p( {
		id: 'atmosphere.particles.density', label: 'Particle density', type: 'float', min: 0, max: 1, step: 0.01, default: 0.4, neutral: 0, enabledBy: 'atmosphere.particles.enabled',
		learn: { what: 'How many particles fill the air (up to 4,000).', why: 'A few particles add life; many make weather.', typical: '0.2–0.6.' },
		brief: 'Particle density {value}.',
		tags: [ 'particles' ],
	} ),
	p( {
		id: 'atmosphere.particles.size', label: 'Particle size', type: 'float', min: 0.2, max: 3, step: 0.01, default: 1, enabledBy: 'atmosphere.particles.enabled',
		learn: { what: 'Scales the particles (about 3 cm motes and 1.5 cm snowflakes at 1).', why: 'Bigger particles read as closer and softer.' },
		brief: 'Particle size ×{value}.',
		tags: [ 'particles' ],
	} ),
	p( {
		id: 'atmosphere.particles.speed', label: 'Particle speed', type: 'float', min: 0, max: 3, step: 0.01, default: 1, enabledBy: 'atmosphere.particles.enabled',
		learn: { what: 'How fast the particles move.', why: 'Slow motes feel calm; fast rain feels urgent.' },
		brief: 'Particle speed ×{value}.',
		tags: [ 'particles' ],
	} ),
	p( {
		id: 'atmosphere.particles.color', label: 'Particle color', type: 'color', default: '#fff3d6', enabledBy: 'atmosphere.particles.enabled',
		learn: { what: 'The particle color (embers also glow with it).', why: 'Tint particles toward the light: warm motes in sunlight, pale blue snow at night.' },
		brief: 'Particles {value}.',
		tags: [ 'particles' ],
	} ),
];
