import { param, CHEAP, MEDIUM, HEAVY } from './define.js';

const p = ( e ) => param( 'lens', e );

export default [
	p( {
		id: 'lens.fovScale', label: 'Lens width', type: 'float', min: 0.5, max: 2, step: 0.01, unit: '×', default: 1,
		learn: {
			what: 'Widens (above 1) or narrows (below 1) each camera shot\'s own lens. The camera dollies to keep the subject the same size, so only the perspective changes.',
			why: 'Wide lenses exaggerate depth and speed (skating and racing games); long lenses flatten and compress (strategy, cinematic close-ups). Scaling the shot\'s lens keeps each genre\'s camera, so a top-down garden stays top-down.',
			typical: '1.2–1.4 for fast action, 0.7–0.85 for a flatter, telephoto feel.',
		},
		brief: 'Lens {value}× wider than the default camera (dolly to keep the subject size).',
		tags: [ 'camera', 'lens', 'fov' ],
	} ),
	p( {
		id: 'lens.bloom.enabled', label: 'Bloom', type: 'bool', default: false, structural: true, cost: { ...MEDIUM, fpe: 2.5 },
		learn: {
			what: 'Light bleeding around bright areas, computed from the HDR image before tone mapping.',
			why: 'The eye and cameras see glare around bright lights. Bloom makes emissive things and the sun read as bright, not just white.',
			avoid: 'Bloom on everything (low threshold): the image turns milky.',
		},
		brief: 'Bloom on HDR highlights.',
		tags: [ 'bloom', 'glow' ],
	} ),
	p( {
		id: 'lens.bloom.strength', label: 'Bloom strength', type: 'float', min: 0, max: 3, step: 0.01, default: 0.4, neutral: 0, enabledBy: 'lens.bloom.enabled',
		learn: { what: 'How much glow is added.', why: 'Subtle values add warmth; strong ones give a dreamy look.', typical: '0.15–0.5.' },
		brief: 'Bloom strength {value}.',
		tags: [ 'bloom' ],
	} ),
	p( {
		id: 'lens.bloom.radius', label: 'Bloom radius', type: 'float', min: 0, max: 1, step: 0.01, default: 0.4, enabledBy: 'lens.bloom.enabled',
		learn: { what: 'How far the glow spreads.', why: 'Wide glow reads as haze, tight glow as crisp highlights.' },
		brief: 'Bloom radius {value}.',
		tags: [ 'bloom' ],
	} ),
	p( {
		id: 'lens.bloom.threshold', label: 'Bloom threshold', type: 'float', min: 0, max: 2, step: 0.01, default: 0.9, enabledBy: 'lens.bloom.enabled',
		learn: { what: 'Brightness above which pixels glow (in HDR luminance).', why: 'A high threshold keeps the glow to light sources, so it stays meaningful.', typical: '0.7–1.' },
		brief: 'Bloom threshold {value}.',
		tags: [ 'bloom' ],
	} ),
	p( {
		id: 'lens.bloom.source', label: 'Bloom source', type: 'enum', default: 'all', structural: true, enabledBy: 'lens.bloom.enabled', requires: [ 'emissive' ],
		options: [ { value: 'all', label: 'Everything bright' }, { value: 'emissive', label: 'Emissive only (selective)' } ],
		learn: {
			what: 'What glows: every pixel above the threshold, or only emissive materials (lamps, neon, magic).',
			why: 'Selective bloom keeps sunlit white walls crisp while lights glow, the trick behind neon and synthwave looks. It needs one extra buffer.',
		},
		brief: 'Bloom source: {label}.',
		tags: [ 'bloom', 'glow', 'emissive' ],
	} ),
	p( {
		id: 'lens.vignette.amount', label: 'Vignette', type: 'float', min: 0, max: 1, step: 0.01, default: 0,
		learn: {
			what: 'Darkens the corners of the frame.',
			why: 'It pulls the eye toward the center, where the subject usually is, and frames the image like an old lens.',
			typical: '0.08–0.25.',
			avoid: 'Heavy vignettes on gameplay cameras: they hide information at the edges.',
		},
		brief: 'Vignette {value}.',
		tags: [ 'vignette', 'focus' ],
	} ),
	p( {
		id: 'lens.vignette.softness', label: 'Vignette softness', type: 'float', min: 0.05, max: 1, step: 0.01, default: 0.5,
		learn: { what: 'How gradually the vignette fades in.', why: 'Soft vignettes go unnoticed but still guide the eye.' },
		brief: 'Vignette softness {value}.',
		tags: [ 'vignette' ],
	} ),
	p( {
		id: 'lens.vignette.roundness', label: 'Vignette roundness', type: 'float', min: 0, max: 1, step: 0.01, default: 1,
		learn: { what: '1 makes a circle; 0 follows the frame\'s aspect ratio.', why: 'A round vignette feels like a lens; a frame-shaped one feels like a print border.' },
		brief: 'Vignette roundness {value}.',
		tags: [ 'vignette' ],
	} ),
	p( {
		id: 'lens.vignette.color', label: 'Vignette color', type: 'color', default: '#000000',
		learn: { what: 'The color the corners fade toward.', why: 'A tinted vignette (warm brown, deep blue) frames without killing the palette.' },
		brief: 'Vignette color {value}.',
		tags: [ 'vignette', 'color' ],
	} ),
	p( {
		id: 'lens.dof.enabled', label: 'Depth of field', type: 'bool', default: false, structural: true, requires: [ 'depth' ], cost: HEAVY,
		learn: {
			what: 'Blurs what is in front of and behind the focus point, like a camera lens with a wide aperture. Focus follows what the camera looks at.',
			why: 'Shallow focus tells the eye exactly where to look and separates the subject from a busy background. It is the signature of cinematic and photographic looks.',
			avoid: 'Gameplay cameras where the player must read the background, and retro looks (old consoles couldn\'t blur).',
		},
		brief: 'Depth of field focused on the subject.',
		tags: [ 'dof', 'focus', 'cinematic', 'blur' ],
	} ),
	p( {
		id: 'lens.dof.range', label: 'Focus range', type: 'float', min: 0.5, max: 60, step: 0.1, unit: 'm', default: 8, enabledBy: 'lens.dof.enabled',
		learn: { what: 'How far from the focus point things become fully blurred.', why: 'A short range is a fast lens (shallow focus); a long range keeps most of the scene sharp.', typical: '3–10 m for a third-person subject.' },
		brief: 'Fully out of focus {value} m from the focal plane.',
		tags: [ 'dof' ],
	} ),
	p( {
		id: 'lens.dof.blur', label: 'Bokeh size', type: 'float', min: 0, max: 4, step: 0.01, default: 1, neutral: 0, enabledBy: 'lens.dof.enabled',
		learn: { what: 'The size of the out-of-focus blur.', why: 'Big, round bokeh reads as a large sensor and a fast lens: expensive and filmic.' },
		brief: 'Bokeh scale {value}.',
		tags: [ 'dof', 'bokeh' ],
	} ),
	p( {
		id: 'lens.dof.offset', label: 'Focus offset', type: 'float', min: - 20, max: 20, step: 0.1, unit: 'm', default: 0, enabledBy: 'lens.dof.enabled',
		learn: { what: 'Moves the focal plane in front of (−) or behind (+) the subject.', why: 'Pulling focus to the background or foreground is a storytelling device: it says "look here instead".' },
		brief: 'Focus offset {value} m from the subject.',
		tags: [ 'dof' ],
	} ),
	p( {
		id: 'lens.tiltShift.enabled', label: 'Tilt-shift', type: 'bool', default: false, structural: true, cost: MEDIUM,
		learn: {
			what: 'Keeps a horizontal band sharp and blurs above and below it.',
			why: 'Our eyes associate a very shallow, band-shaped focus with photos of small things close up, so a big scene reads as a miniature model.',
			avoid: 'Low camera angles: the effect only sells a miniature when you look down on the scene.',
		},
		brief: 'Tilt-shift miniature blur.',
		tags: [ 'tilt-shift', 'miniature', 'blur' ],
	} ),
	p( {
		id: 'lens.tiltShift.center', label: 'Sharp band center', type: 'float', min: 0, max: 1, step: 0.01, default: 0.55, enabledBy: 'lens.tiltShift.enabled',
		learn: { what: 'Height of the sharp band on screen (0 = bottom, 1 = top).', why: 'Put it on the subject; the blur above suggests distance, the blur below suggests a lens close to the model.' },
		brief: 'Sharp band at {value} of the screen height.',
		tags: [ 'tilt-shift' ],
	} ),
	p( {
		id: 'lens.tiltShift.width', label: 'Sharp band width', type: 'float', min: 0.02, max: 0.8, step: 0.01, default: 0.18, enabledBy: 'lens.tiltShift.enabled',
		learn: { what: 'How tall the sharp band is.', why: 'Narrow bands sell the miniature harder.' },
		brief: 'Sharp band {value} of the screen tall.',
		tags: [ 'tilt-shift' ],
	} ),
	p( {
		id: 'lens.tiltShift.blur', label: 'Tilt-shift blur', type: 'float', min: 0, max: 4, step: 0.01, default: 2, neutral: 0, enabledBy: 'lens.tiltShift.enabled',
		learn: { what: 'How strong the blur outside the band is.', why: 'Strong blur and high saturation together are what make tilt-shift photos look like toys.' },
		brief: 'Tilt-shift blur {value}.',
		tags: [ 'tilt-shift' ],
	} ),
	p( {
		id: 'lens.motionBlur.enabled', label: 'Motion blur', type: 'bool', default: false, structural: true, requires: [ 'velocity' ], cost: HEAVY,
		learn: {
			what: 'Smears moving objects along their motion, as a film camera does with its shutter open.',
			why: 'It reads as speed and weight, and smooths fast motion at low frame rates. Racing and action games use it to sell velocity.',
			avoid: 'Retro looks, and strong blur on gameplay-critical objects: players need to see them.',
		},
		brief: 'Per-object motion blur.',
		tags: [ 'motion blur', 'speed', 'cinematic' ],
	} ),
	p( {
		id: 'lens.motionBlur.shutter', label: 'Shutter angle', type: 'float', min: 0, max: 360, step: 1, unit: '°', default: 180, neutral: 0, enabledBy: 'lens.motionBlur.enabled',
		learn: { what: 'How long the virtual shutter stays open per frame. 180° is film standard; 360° smears the whole frame time.', why: 'Film\'s 180° rule gives natural motion; larger angles look dreamy or fast, smaller ones staccato (action scenes, war films).', typical: '180°.' },
		brief: 'Shutter angle {value}°.',
		tags: [ 'motion blur' ],
	} ),
	p( {
		id: 'lens.ca.enabled', label: 'Chromatic aberration', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Splits red, green and blue slightly toward the edges of the frame, like a cheap or vintage lens.',
			why: 'A touch of fringing reads as a real lens, a screen, or a glitch. It is a signature of sci-fi HUDs and found-footage looks.',
			avoid: 'Strong CA on text and UI, or with thin lines: it blurs them.',
		},
		brief: 'Chromatic aberration at the frame edges.',
		tags: [ 'lens', 'chromatic aberration', 'sci-fi' ],
	} ),
	p( {
		id: 'lens.ca.amount', label: 'Aberration', type: 'float', min: 0, max: 3, step: 0.01, default: 0.6, neutral: 0, enabledBy: 'lens.ca.enabled',
		learn: { what: 'How far the color channels separate.', why: 'Subtle values read as a lens; strong ones as a glitch.' },
		brief: 'Aberration strength {value}.',
		tags: [ 'chromatic aberration' ],
	} ),
	p( {
		id: 'lens.distortion.enabled', label: 'Lens distortion', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Bends straight lines: barrel distortion bulges the middle (fisheye), pincushion pinches it.',
			why: 'Barrel distortion with a wide lens is the look of skate videos and action cams: it exaggerates speed and energy.',
		},
		brief: 'Lens distortion.',
		tags: [ 'lens', 'fisheye', 'distortion' ],
	} ),
	p( {
		id: 'lens.distortion.amount', label: 'Distortion', type: 'float', min: - 0.5, max: 0.5, step: 0.01, default: 0.12, neutral: 0, enabledBy: 'lens.distortion.enabled',
		learn: { what: 'Positive for barrel (fisheye), negative for pincushion.', why: 'A little barrel reads as an energetic wide lens; a lot reads as a peephole.', typical: '0.08–0.15.' },
		brief: 'Distortion {value} (+ barrel).',
		tags: [ 'distortion' ],
	} ),
	p( {
		id: 'lens.letterbox.amount', label: 'Letterbox', type: 'float', min: 0, max: 1, step: 0.01, default: 0,
		learn: {
			what: 'Black bars that crop the frame to a wider (or narrower) aspect ratio.',
			why: 'The 2.39:1 frame is cinema; players read it as "this is a cutscene". 4:3 bars read as retro TV.',
			avoid: 'During gameplay on phones: bars waste scarce screen space.',
		},
		brief: 'Letterbox to {value} of the full crop.',
		tags: [ 'letterbox', 'cinematic', 'framing' ],
	} ),
	p( {
		id: 'lens.letterbox.aspect', label: 'Letterbox aspect', type: 'float', min: 1.2, max: 2.8, step: 0.01, default: 2.39,
		learn: { what: 'The aspect ratio the bars crop to (width / height). Narrower than the screen gives side bars.', why: '2.39 is anamorphic cinema, 1.85 flat cinema, 1.33 (4:3) old TV.' },
		brief: 'Letterbox aspect {value}:1.',
		tags: [ 'letterbox' ],
	} ),
	p( {
		id: 'lens.letterbox.color', label: 'Letterbox color', type: 'color', default: '#000000',
		learn: { what: 'The color of the bars.', why: 'Black disappears on screens; a paper or brand color turns the bars into a frame.' },
		brief: 'Letterbox bars {value}.',
		tags: [ 'letterbox' ],
	} ),
	// P2 (M10): lens flare, anamorphic streaks, afterimage trails.
	p( {
		id: 'lens.flare.enabled', label: 'Lens flare', type: 'bool', default: false, structural: true, cost: { ...MEDIUM, fpe: 1.2 },
		learn: {
			what: 'Ghost reflections of the brightest lights, mirrored through the center of the frame, as light bounces between the glass elements of a camera lens.',
			why: 'A flare says "a camera filmed this, looking into the light". It makes the sun and neon read as blinding and gives racing and sci-fi shots their cinematic polish.',
			avoid: 'Flares from everything (a low threshold), and flares in a drawn or painted look: a painting has no lens.',
		},
		brief: 'Lens flare: ghosts of the brightest highlights mirrored through the center.',
		tags: [ 'lens', 'flare', 'cinematic', 'sun' ],
	} ),
	p( {
		id: 'lens.flare.intensity', label: 'Flare intensity', type: 'float', min: 0, max: 3, step: 0.01, default: 0.6, neutral: 0, enabledBy: 'lens.flare.enabled',
		learn: { what: 'How bright the ghosts are.', why: 'A faint flare reads as a real lens; a strong one is a stylized accent.', typical: '0.3–0.8.' },
		brief: 'Flare intensity {value}.',
		tags: [ 'flare' ],
	} ),
	p( {
		id: 'lens.flare.threshold', label: 'Flare threshold', type: 'float', min: 0, max: 4, step: 0.01, default: 1.2, enabledBy: 'lens.flare.enabled',
		learn: { what: 'HDR brightness above which a highlight throws ghosts.', why: 'Keep it above the brightest lit surface, so only light sources flare.', typical: '1–2.' },
		brief: 'Flare threshold {value} (HDR luminance).',
		tags: [ 'flare' ],
	} ),
	p( {
		id: 'lens.flare.spacing', label: 'Ghost spacing', type: 'float', min: 0.05, max: 0.6, step: 0.01, default: 0.25, enabledBy: 'lens.flare.enabled',
		learn: { what: 'How far apart the ghosts sit along the line through the center of the frame.', why: 'Wide spacing spreads ghosts across the frame like a zoom lens; tight spacing clusters them near the light.' },
		brief: 'Ghost spacing {value}.',
		tags: [ 'flare' ],
	} ),
	p( {
		id: 'lens.anamorphic.enabled', label: 'Anamorphic streaks', type: 'bool', default: false, structural: true, cost: { ...MEDIUM, fpe: 1.5 },
		learn: {
			what: 'Long horizontal streaks through bright highlights, like the stretched flares of anamorphic cinema lenses.',
			why: 'The horizontal blue streak is shorthand for night-city and sci-fi cinema. It makes lights feel hot and the frame feel wide-screen.',
			avoid: 'Streaks in daylight looks or on many small highlights: the frame fills with lines.',
		},
		brief: 'Anamorphic streaks through bright highlights.',
		tags: [ 'lens', 'anamorphic', 'flare', 'cinematic', 'sci-fi' ],
	} ),
	p( {
		id: 'lens.anamorphic.intensity', label: 'Streak intensity', type: 'float', min: 0, max: 3, step: 0.01, default: 0.6, neutral: 0, enabledBy: 'lens.anamorphic.enabled',
		learn: { what: 'How bright the streaks are.', why: 'Subtle streaks add a cinematic sheen; strong ones become a graphic element.', typical: '0.3–1.' },
		brief: 'Streak intensity {value}.',
		tags: [ 'anamorphic' ],
	} ),
	p( {
		id: 'lens.anamorphic.threshold', label: 'Streak threshold', type: 'float', min: 0, max: 4, step: 0.01, default: 1, enabledBy: 'lens.anamorphic.enabled',
		learn: { what: 'HDR brightness above which a pixel streaks.', why: 'High thresholds keep streaks to lamps and neon.', typical: '0.8–1.5.' },
		brief: 'Streak threshold {value} (HDR luminance).',
		tags: [ 'anamorphic' ],
	} ),
	p( {
		id: 'lens.anamorphic.length', label: 'Streak length', type: 'float', min: 1, max: 8, step: 0.1, default: 3, enabledBy: 'lens.anamorphic.enabled',
		learn: { what: 'How far the streaks stretch sideways.', why: 'Long streaks cross the frame like a movie poster; short ones stay a glint.' },
		brief: 'Streak length {value}.',
		tags: [ 'anamorphic' ],
	} ),
	p( {
		id: 'lens.anamorphic.tint', label: 'Streak color', type: 'color', default: '#5f8dff', enabledBy: 'lens.anamorphic.enabled',
		learn: { what: 'The color of the streaks.', why: 'Real anamorphic coatings streak blue; matching the streak to the neon ties it into the palette.' },
		brief: 'Streaks tinted {value}.',
		tags: [ 'anamorphic' ],
	} ),
	p( {
		id: 'lens.afterimage.enabled', label: 'Afterimage trails', type: 'bool', default: false, structural: true, cost: { ...MEDIUM, fpe: 0.8 },
		learn: {
			what: 'Blends each frame with a fading copy of the frames before it, so anything that moves leaves a ghostly trail.',
			why: 'Trails read as speed, dizziness or a dream: the screen remembers where things were. Rhythm games, dream sequences and old phosphor screens use it.',
			avoid: 'Gameplay where players must track fast objects: the trail hides where things are now.',
		},
		brief: 'Afterimage trails (frame feedback).',
		tags: [ 'lens', 'trails', 'afterimage', 'motion', 'dream' ],
	} ),
	p( {
		id: 'lens.afterimage.damping', label: 'Trail length', type: 'float', min: 0, max: 0.97, step: 0.01, default: 0.8, neutral: 0, enabledBy: 'lens.afterimage.enabled',
		learn: { what: 'How much of the previous frames stays: higher values leave longer trails.', why: 'Short trails read as speed; long ones as a dream or intoxication.', typical: '0.6–0.9.' },
		brief: 'Trail persistence {value} per frame.',
		tags: [ 'afterimage' ],
	} ),
];
