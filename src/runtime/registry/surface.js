import { param } from './define.js';

const p = ( e ) => param( 'surface', { scope: 'both', ...e } );

export default [
	p( {
		id: 'surface.model', label: 'Shading model', type: 'enum', default: 'pbr', structural: true,
		options: [
			{ value: 'pbr', label: 'Stylized PBR' },
			{ value: 'toon', label: 'Toon (cel)' },
			{ value: 'halfLambert', label: 'Half-Lambert (soft wrap)' },
			{ value: 'flat', label: 'Flat (cast shadows only)' },
		],
		learn: {
			what: 'How a surface turns light into color. Toon bands the light into flat tones; half-Lambert wraps light softly around the form; flat ignores the surface angle; PBR is physically based.',
			why: 'The shading model is the biggest single decision in a style. Banded light simplifies shapes into a few readable planes, which is why toon styles make simple geometry look intentional.',
			avoid: 'PBR on blockout geometry: it shows every flaw of the primitives.',
		},
		brief: 'Shading model: {label}.',
		tags: [ 'shading', 'toon', 'cel' ],
	} ),
	p( {
		id: 'surface.bands', label: 'Light bands', type: 'int', min: 1, max: 5, step: 1, default: 2, structural: true,
		learn: {
			what: 'How many flat tones the light is split into (toon, half-Lambert and flat models). 1 means continuous.',
			why: 'Two bands give the bold light/shadow split of classic cel animation. Each extra band adds form but moves back toward realism.',
			typical: '2 for graphic toon, 3 for comics, 1 for soft painterly light.',
		},
		brief: 'Light quantized into {value} flat bands.',
		tags: [ 'toon', 'cel', 'ramp' ],
	} ),
	p( {
		id: 'surface.threshold', label: 'Band threshold', type: 'float', min: 0.05, max: 0.95, step: 0.01, default: 0.5,
		learn: {
			what: 'Where the first light band starts. Lower values make more of each object lit; higher values push more into shadow.',
			why: 'The shadow shape is a design element in cel art. Moving the threshold controls how much of the form reads as lit, independently of the light\'s brightness.',
			typical: '0.4–0.55.',
		},
		brief: 'Band threshold {value} (fraction of full light).',
		tags: [ 'toon', 'ramp' ],
	} ),
	p( {
		id: 'surface.softness', label: 'Band softness', type: 'float', min: 0, max: 0.5, step: 0.005, default: 0.02, neutral: 0.5,
		learn: {
			what: 'How soft the step between light bands is. 0 is a razor edge (still anti-aliased).',
			why: 'Hard edges read as graphic and hand-inked; slightly soft edges read as painted. Very soft edges return to realistic shading.',
			typical: '0–0.03 for toon, 0.1–0.2 for anime-style soft cel.',
		},
		brief: 'Band edge softness {value}.',
		tags: [ 'toon', 'ramp' ],
	} ),
	p( {
		id: 'surface.shadowTint', label: 'Shadow tint', type: 'color', default: '#5866d0',
		learn: {
			what: 'The color added in the shadowed bands.',
			why: 'Painters shift shadow hue (usually cooler, toward blue-violet) instead of mixing in black. Gray shadows look dirty; tinted shadows stay colorful and read as sky-lit.',
			typical: 'Blue-violet (#5866d0) for sunny scenes, purple for graphic styles.',
		},
		brief: 'Shadows tinted {value}.',
		tags: [ 'shadow color', 'hue shift' ],
	} ),
	p( {
		id: 'surface.shadowTintStrength', label: 'Shadow tint strength', type: 'float', min: 0, max: 1, step: 0.01, default: 0.4, neutral: 0,
		learn: {
			what: 'How much of the shadow tint is added where the surface is in shadow.',
			why: 'It decides how far the shadows move away from plain darkened color toward the tint.',
			typical: '0.4–0.6.',
		},
		brief: 'Shadow tint strength {value}.',
		tags: [ 'shadow color' ],
	} ),
	p( {
		id: 'surface.spec.intensity', label: 'Toon specular', type: 'float', min: 0, max: 2, step: 0.01, default: 0, neutral: 0,
		learn: {
			what: 'A hard-edged highlight where the light reflects toward the camera.',
			why: 'A crisp highlight blob says "smooth and shiny" in one shape. It is the cel-animation shorthand for material.',
			avoid: 'Specular on everything: keep it for characters and shiny props so they stand out.',
			typical: '0.3–0.8 on characters.',
		},
		brief: 'Hard specular highlight, intensity {value}.',
		tags: [ 'specular', 'highlight' ],
	} ),
	p( {
		id: 'surface.spec.size', label: 'Specular size', type: 'float', min: 0.01, max: 1, step: 0.01, default: 0.15,
		learn: {
			what: 'How large the specular highlight is.',
			why: 'Small highlights read as hard, glossy materials; large ones as soft sheen.',
			typical: '0.05–0.2.',
		},
		brief: 'Specular size {value}.',
		tags: [ 'specular' ],
	} ),
	p( {
		id: 'surface.spec.softness', label: 'Specular softness', type: 'float', min: 0, max: 0.3, step: 0.005, default: 0.02,
		learn: {
			what: 'How soft the edge of the specular highlight is.',
			why: 'A hard edge keeps the highlight graphic, matching the cel bands.',
		},
		brief: 'Specular edge softness {value}.',
		tags: [ 'specular' ],
	} ),
	p( {
		id: 'surface.rim.intensity', label: 'Rim light', type: 'float', min: 0, max: 2, step: 0.01, default: 0, neutral: 0,
		learn: {
			what: 'A bright band along the edges of a shape, where the surface turns away from the camera (a fresnel term).',
			why: 'Rim light separates a subject from the background, the way a backlight does in film. It is the fastest way to make a character pop.',
			typical: '0.3–0.6.',
			avoid: 'Strong rims on terrain and buildings: everything glows and nothing stands out.',
		},
		brief: 'Rim light intensity {value}.',
		tags: [ 'rim', 'fresnel', 'separation' ],
	} ),
	p( {
		id: 'surface.rim.width', label: 'Rim width', type: 'float', min: 0, max: 1, step: 0.01, default: 0.3,
		learn: {
			what: 'How far the rim light reaches in from the silhouette.',
			why: 'Thin rims read as crisp backlight; wide rims as a soft glow.',
		},
		brief: 'Rim width {value}.',
		tags: [ 'rim' ],
	} ),
	p( {
		id: 'surface.rim.softness', label: 'Rim softness', type: 'float', min: 0, max: 0.5, step: 0.01, default: 0.05,
		learn: {
			what: 'How soft the inner edge of the rim light is.',
			why: 'A hard rim matches toon bands; a soft one suits painterly and photographic looks.',
		},
		brief: 'Rim softness {value}.',
		tags: [ 'rim' ],
	} ),
	p( {
		id: 'surface.rim.color', label: 'Rim color', type: 'color', default: '#ffffff',
		learn: {
			what: 'The color of the rim light.',
			why: 'Matching the rim to the key light (warm at sunset) makes it read as real backlight; a contrasting color reads as stylized.',
		},
		brief: 'Rim color {value}.',
		tags: [ 'rim', 'color' ],
	} ),
	p( {
		id: 'surface.rim.litSide', label: 'Rim on lit side only', type: 'bool', default: false,
		learn: {
			what: 'Limits the rim light to the side of the object facing the key light.',
			why: 'A rim on all sides looks like a glow; a rim on the lit side only looks like light wrapping around the edge.',
		},
		brief: 'Rim only on the lit side.',
		tags: [ 'rim' ],
	} ),
	p( {
		id: 'surface.flatNormals', label: 'Flat (faceted) normals', type: 'bool', default: false, structural: true,
		learn: {
			what: 'Shades every polygon with one flat color, so the facets show.',
			why: 'Faceting turns low-poly geometry into a deliberate style instead of a limitation.',
			avoid: 'Combining with high subdivision: facets become noise.',
		},
		brief: 'Flat-shaded facets.',
		tags: [ 'low poly', 'faceted' ],
	} ),
];
