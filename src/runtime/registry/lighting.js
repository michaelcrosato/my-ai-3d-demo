import { param, CHEAP, MEDIUM, HEAVY } from './define.js';

const p = ( e ) => param( 'lighting', e );

export default [
	p( {
		id: 'lighting.key.elevation', label: 'Sun elevation', type: 'float', min: 2, max: 90, step: 1, unit: '°', default: 50,
		learn: {
			what: 'How high the key light (the sun) stands above the horizon.',
			why: 'Low light rakes across surfaces and casts long shadows, which shows form and sets a mood; high light flattens and reads as midday.',
			typical: '45–60° for a neutral day, 5–15° for golden hour.',
		},
		brief: 'Key light at {value}° elevation.',
		tags: [ 'light', 'sun', 'time of day' ],
	} ),
	p( {
		id: 'lighting.key.azimuth', label: 'Sun direction', type: 'angle', min: - 180, max: 180, step: 1, unit: '°', default: 45,
		learn: {
			what: 'Where the key light comes from around the scene, measured from the hero camera: 0° lights from behind the camera, 180° is backlight.',
			why: 'Side light (45–90°) shows the most form. Front light flattens shapes; backlight gives silhouettes and glowing rims.',
			typical: '30–60° for clear form, 120–160° for dramatic backlight.',
		},
		brief: 'Key light from {value}° relative to the main camera (0° = from behind the camera).',
		tags: [ 'light', 'sun' ],
	} ),
	p( {
		id: 'lighting.key.color', label: 'Sun color', type: 'color', default: '#ffffff',
		learn: {
			what: 'The color of the key light.',
			why: 'Warm light with cool shadows (or the reverse) is the most reliable color contrast in painting: it separates lit and shadowed planes by temperature, not only by value.',
			typical: 'Slightly warm white (#fff2d6) for day, orange (#ffb066) for golden hour.',
		},
		brief: 'Key light color {value}.',
		tags: [ 'light', 'color', 'temperature' ],
	} ),
	p( {
		id: 'lighting.key.intensity', label: 'Sun intensity', type: 'float', min: 0, max: 8, step: 0.05, default: 2,
		learn: {
			what: 'How bright the key light is.',
			why: 'The ratio between key and ambient sets the contrast between lit and shadowed sides. A high ratio reads as harsh sun, a low one as overcast.',
			typical: '2–4 with ambient 0.4–1.',
		},
		brief: 'Key light intensity {value}.',
		tags: [ 'light' ],
	} ),
	p( {
		id: 'lighting.ambient.sky', label: 'Ambient sky color', type: 'color', default: '#ffffff',
		learn: {
			what: 'Light arriving from above (the sky dome), lighting surfaces that face up.',
			why: 'Outdoors, shadows are lit by the blue sky, which is why they look cool. Tinting the sky ambient is the physical reason behind colored shadows.',
			typical: 'Light blue (#8cc8ff) outdoors.',
		},
		brief: 'Sky ambient {value}.',
		tags: [ 'light', 'ambient', 'shadow color' ],
	} ),
	p( {
		id: 'lighting.ambient.ground', label: 'Ambient ground color', type: 'color', default: '#444444',
		learn: {
			what: 'Light bounced up from the ground, lighting surfaces that face down.',
			why: 'A ground bounce tinted by the grass or sand ties objects to their environment, so they don\'t look pasted in.',
			typical: 'A darker version of the ground color.',
		},
		brief: 'Ground bounce {value}.',
		tags: [ 'light', 'ambient' ],
	} ),
	p( {
		id: 'lighting.ambient.intensity', label: 'Ambient intensity', type: 'float', min: 0, max: 3, step: 0.05, default: 1,
		learn: {
			what: 'How much the ambient (sky and ground) light fills the shadows.',
			why: 'Ambient decides how dark shadows get. Too little and shapes vanish into black; too much and nothing has form.',
			typical: '0.4–1.',
		},
		brief: 'Ambient intensity {value}.',
		tags: [ 'light', 'ambient', 'contrast' ],
	} ),
	p( {
		id: 'lighting.shadows.enabled', label: 'Cast shadows', type: 'bool', default: true, structural: true, cost: MEDIUM,
		learn: {
			what: 'Whether the key light casts shadows (a shadow map rendered from the sun).',
			why: 'Cast shadows anchor objects to the ground and describe the space between them. Without them, objects float.',
			avoid: 'Turning them off to save cost; a soft blob shadow is the cheap alternative.',
		},
		brief: 'Key light casts shadows.',
		tags: [ 'shadow' ],
	} ),
	p( {
		id: 'lighting.shadows.softness', label: 'Shadow softness', type: 'float', min: 0, max: 5, step: 0.1, unit: 'px', default: 1, enabledBy: 'lighting.shadows.enabled',
		learn: {
			what: 'How blurred the edge of cast shadows is (the shadow map filter radius).',
			why: 'Crisp shadows read as strong sun and graphic toon styles; soft shadows read as large or hazy light sources.',
			typical: '0–0.5 for toon, 1.5–3 for golden hour or photographic looks.',
		},
		brief: 'Shadow edge softness {value} px (filter radius).',
		tags: [ 'shadow' ],
	} ),
	p( {
		id: 'lighting.shadows.mapSize', label: 'Shadow resolution', type: 'enum', default: 2048,
		options: [ { value: 512, label: '512' }, { value: 1024, label: '1024' }, { value: 2048, label: '2048' }, { value: 4096, label: '4096' } ],
		enabledBy: 'lighting.shadows.enabled',
		learn: {
			what: 'The size of the shadow map: how many texels cover the shadowed area.',
			why: 'Bigger maps give crisper, steadier shadow edges. Phones prefer 1024: shadow maps cost memory bandwidth, and toon styles hide the softer edge well.',
			typical: '2048 on desktop, 1024 on phones.',
		},
		brief: 'Shadow map {value}×{value}.',
		tags: [ 'shadow', 'performance' ],
	} ),
	p( {
		id: 'lighting.tod.enabled', label: 'Time of day', type: 'bool', default: false,
		learn: {
			what: 'Drives the sun, sky, ambient light and fog color from one clock, instead of setting each by hand.',
			why: 'Light is the fastest way to change mood, and time of day keeps every light color consistent with every other: a low orange sun comes with a violet sky fill and warm haze.',
			avoid: 'Fighting it with hand-set colors: turn it off to art-direct each light yourself.',
		},
		brief: 'Lighting follows a time of day.',
		tags: [ 'light', 'time of day', 'mood' ],
	} ),
	p( {
		id: 'lighting.tod.hour', label: 'Hour', type: 'float', min: 4, max: 22, step: 0.1, unit: 'h', default: 16, enabledBy: 'lighting.tod.enabled',
		learn: {
			what: 'The time of day, from before dawn (4) to night (22). Noon is 12.',
			why: 'Dawn and golden hour rake light across the scene with long shadows and warm color; noon flattens it; blue hour and night drop to a cool, low-contrast fill.',
			typical: '17–18 for golden hour, 19.5 for blue hour, 12 for a neutral reference.',
		},
		brief: 'Time of day {value} h (sun, sky, ambient and fog follow it).',
		tags: [ 'time of day', 'sun' ],
	} ),
	p( {
		id: 'lighting.practicals.intensity', label: 'Practical lights', type: 'float', min: 0, max: 3, step: 0.01, unit: '×', default: 1,
		learn: {
			what: 'Brightness of the scene\'s own lights (torches, lamps, campfires, neon) relative to how the scene set them.',
			why: 'Practicals are motivated light: the viewer sees the source. Pushing them up makes night scenes feel lit by the world rather than by an invisible fill.',
			typical: '1–1.5; higher for dark, moody looks.',
		},
		brief: 'Practical lights at {value}× the scene\'s intensity.',
		tags: [ 'light', 'practical', 'night' ],
	} ),
	p( {
		id: 'lighting.practicals.flicker', label: 'Practical flicker', type: 'float', min: 0, max: 3, step: 0.01, unit: '×', default: 1,
		learn: {
			what: 'How much flames and faulty lamps flicker, relative to the scene.',
			why: 'A little flicker makes fire read as fire and makes a still frame feel alive. Too much is distracting and reads as a broken light.',
		},
		brief: 'Practical light flicker {value}×.',
		tags: [ 'light', 'practical', 'motion' ],
	} ),
	p( {
		id: 'lighting.blob.enabled', label: 'Blob shadows', type: 'bool', default: false, structural: true, scope: 'both',
		learn: {
			what: 'A soft dark disc on the ground under each object of a part, like the round shadow under a character in a classic platformer.',
			why: 'A contact shadow tells you exactly where something stands, which matters for jumping and aiming. It is nearly free, so phone games use it instead of (or on top of) real shadows.',
			avoid: 'Blobs under large or flat objects (buildings, terrain): they only make sense for things that stand on the ground.',
			typical: 'On characters, the hero and small props.',
		},
		brief: 'Soft blob shadows under each object.',
		tags: [ 'shadow', 'contact', 'grounding', 'phone-safe' ],
	} ),
	p( {
		id: 'lighting.blob.size', label: 'Blob size', type: 'float', min: 0.3, max: 3, step: 0.01, unit: '×', default: 1.1, enabledBy: 'lighting.blob.enabled',
		learn: { what: 'Blob radius as a multiple of the object\'s footprint.', why: 'Slightly larger than the footprint reads as a soft shadow; smaller reads as a contact point.' },
		brief: 'Blob radius {value}× the footprint.',
		tags: [ 'shadow' ],
	} ),
	p( {
		id: 'lighting.blob.softness', label: 'Blob softness', type: 'float', min: 0, max: 1, step: 0.01, default: 0.6, enabledBy: 'lighting.blob.enabled',
		learn: { what: 'How soft the blob\'s edge is.', why: 'Hard blobs look graphic and retro; soft blobs read as real soft shadows.' },
		brief: 'Blob edge softness {value}.',
		tags: [ 'shadow' ],
	} ),
	p( {
		id: 'lighting.blob.opacity', label: 'Blob darkness', type: 'float', min: 0, max: 1, step: 0.01, default: 0.5, neutral: 0, enabledBy: 'lighting.blob.enabled',
		learn: { what: 'How dark the blob is under its object. It fades as the object rises off the ground.', why: 'A fading blob tells you how high a jumping character is, which is why platformers keep it even with real shadows.' },
		brief: 'Blob darkness {value} (fades with height).',
		tags: [ 'shadow' ],
	} ),
	p( {
		id: 'lighting.ao.enabled', scope: 'mask', label: 'Ambient occlusion', type: 'bool', default: false, structural: true, requires: [ 'depth', 'normal' ], cost: HEAVY,
		learn: {
			what: 'Darkens creases, corners and the ground around objects, where surrounding geometry blocks the sky light (screen-space GTAO).',
			why: 'Occlusion is the strongest depth cue after shadows: it glues objects to the ground and to each other, so a scene stops looking like floating primitives.',
			avoid: 'Strong AO on toon looks with flat colors: dirty gray halos fight the clean bands. Tint it, or use contact shadows.',
		},
		brief: 'Screen-space ambient occlusion (GTAO).',
		tags: [ 'ao', 'shadow', 'depth', 'grounding' ],
	} ),
	p( {
		id: 'lighting.ao.radius', label: 'AO radius', type: 'float', min: 0.05, max: 3, step: 0.01, unit: 'm', default: 0.6, enabledBy: 'lighting.ao.enabled',
		learn: { what: 'How far occlusion reaches, in meters.', why: 'Small radii darken only tight creases; large radii add soft shading between objects and around their bases.', typical: '0.3–1 for human-scale scenes.' },
		brief: 'AO radius {value} m.',
		tags: [ 'ao' ],
	} ),
	p( {
		id: 'lighting.ao.intensity', label: 'AO strength', type: 'float', min: 0, max: 2, step: 0.01, default: 1, neutral: 0, enabledBy: 'lighting.ao.enabled',
		learn: { what: 'How dark occluded areas get.', why: 'Subtle AO adds weight without a dirty look.', typical: '0.4–1.' },
		brief: 'AO strength {value}.',
		tags: [ 'ao' ],
	} ),
	p( {
		id: 'lighting.ao.tint', label: 'AO tint', type: 'color', default: '#000000', enabledBy: 'lighting.ao.enabled',
		learn: { what: 'The color occluded areas darken toward.', why: 'A cool or colored tint keeps occlusion from turning pastel and toon palettes gray, the same trick as hue-shifted shadows.', typical: 'A darker, cooler version of the shadow tint.' },
		brief: 'AO darkens toward {value}.',
		tags: [ 'ao', 'color' ],
	} ),
	p( {
		id: 'lighting.ao.ink', label: 'AO ink', type: 'float', min: 0, max: 1, step: 0.01, default: 0, enabledBy: 'lighting.ao.enabled',
		learn: { what: 'Turns the deepest occlusion into flat, hard-edged ink.', why: 'Comic artists fill deep crevices with solid black ("spotting blacks"); hard AO does the same automatically.' },
		brief: 'Deep occlusion inked solid (amount {value}).',
		tags: [ 'ao', 'ink', 'comic' ],
	} ),
	p( {
		id: 'lighting.contact.enabled', scope: 'mask', label: 'Contact shadows', type: 'bool', default: false, structural: true, requires: [ 'depth', 'normal' ], cost: MEDIUM,
		learn: {
			what: 'Short, sharp shadows traced in screen space from the sun, filling in where the shadow map is too coarse: under feet, where objects touch the ground.',
			why: 'The shadow map can\'t resolve tiny gaps, so objects look like they hover. Contact shadows pin them down.',
			avoid: 'Long contact shadows: they are screen-space and break at the screen edge.',
		},
		brief: 'Screen-space contact shadows from the key light.',
		tags: [ 'shadow', 'contact', 'grounding' ],
	} ),
	p( {
		id: 'lighting.contact.length', label: 'Contact length', type: 'float', min: 0.02, max: 2, step: 0.01, unit: 'm', default: 0.35, enabledBy: 'lighting.contact.enabled',
		learn: { what: 'How far each contact shadow is traced toward the sun.', why: 'Keep it short: it is meant for small gaps the shadow map misses.' },
		brief: 'Contact shadows traced {value} m.',
		tags: [ 'shadow', 'contact' ],
	} ),
	p( {
		id: 'lighting.contact.thickness', label: 'Contact thickness', type: 'float', min: 0.005, max: 0.5, step: 0.005, unit: 'm', default: 0.05, enabledBy: 'lighting.contact.enabled',
		learn: { what: 'How thick objects are assumed to be when tracing.', why: 'Too thin and shadows leak through objects; too thick and they smear behind them.' },
		brief: 'Contact thickness {value} m.',
		tags: [ 'shadow', 'contact' ],
	} ),
	p( {
		id: 'lighting.contact.intensity', label: 'Contact darkness', type: 'float', min: 0, max: 1, step: 0.01, default: 0.6, neutral: 0, enabledBy: 'lighting.contact.enabled',
		learn: { what: 'How dark contact shadows are.', why: 'Match it to the cast shadows, so the two read as one shadow.' },
		brief: 'Contact shadow darkness {value}.',
		tags: [ 'shadow', 'contact' ],
	} ),
	// P2 (M10): baked vertex AO and screen-space GI.
	p( {
		id: 'lighting.vertexAo.enabled', scope: 'both', label: 'Baked vertex AO', type: 'bool', default: false, structural: true, cost: { ...CHEAP, fpe: 0.05 },
		learn: {
			what: 'Occlusion baked into every vertex once, when the scene builds: crevices, the undersides of overhangs and the bases of objects get darker. It costs nothing per frame.',
			why: 'Contact darkening is what makes objects sit in the world. Baking it is how phone and stylized games get AO for free, and it never shimmers like screen-space AO.',
			avoid: 'Expecting it between separate objects: each object is baked from its own shape and the ground it stands on, so nothing nearby (or moving) darkens it.',
		},
		brief: 'Baked per-vertex ambient occlusion (self-occlusion and ground contact).',
		tags: [ 'ao', 'vertex colors', 'baked', 'grounding', 'phone' ],
	} ),
	p( {
		id: 'lighting.vertexAo.strength', scope: 'both', label: 'Vertex AO strength', type: 'float', min: 0, max: 1, step: 0.01, default: 0.6, neutral: 0, enabledBy: 'lighting.vertexAo.enabled',
		learn: { what: 'How dark the baked occlusion gets.', why: 'Subtle values ground objects; strong ones give the dioramic, "toy in a box" look.', typical: '0.4–0.8.' },
		brief: 'Vertex AO strength {value}.',
		tags: [ 'ao' ],
	} ),
	p( {
		id: 'lighting.ssgi.enabled', label: 'Screen-space GI', type: 'bool', default: false, structural: true, cost: { ...HEAVY, fpe: 4 }, requires: [ 'depth', 'normal' ],
		learn: {
			what: 'Bounces light between visible surfaces: a red wall tints the floor next to it, and sunlit ground lifts the shadows above it. Computed every frame from the depth and normal buffers.',
			why: 'Bounce light is what makes a space feel lit rather than painted in. Stylized games use a little of it for warmth in interiors and courtyards.',
			avoid: 'Phones and drawn looks, and expecting light from off-screen surfaces: a screen-space effect only sees what is in the frame.',
		},
		brief: 'Screen-space global illumination (one bounce).',
		tags: [ 'gi', 'bounce light', 'ssgi', 'realism' ],
	} ),
	p( {
		id: 'lighting.ssgi.intensity', label: 'Bounce intensity', type: 'float', min: 0, max: 4, step: 0.01, default: 1, neutral: 0, enabledBy: 'lighting.ssgi.enabled',
		learn: { what: 'How much bounced light is added.', why: 'Just enough to color the shadows; too much flattens the image like an overcast day.', typical: '0.5–1.5.' },
		brief: 'Bounce intensity {value}.',
		tags: [ 'gi' ],
	} ),
	p( {
		id: 'lighting.ssgi.radius', label: 'Bounce radius', type: 'float', min: 1, max: 20, step: 0.1, unit: 'm', default: 6, enabledBy: 'lighting.ssgi.enabled',
		learn: { what: 'How far light travels between surfaces, in meters.', why: 'Small radii give tight color bleeding at contacts; large ones a broad fill (and more noise).' },
		brief: 'Bounce radius {value} m.',
		tags: [ 'gi' ],
	} ),
];
