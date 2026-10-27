import { param, MEDIUM } from './define.js';

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
];
