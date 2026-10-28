import { param, CHEAP, MEDIUM } from './define.js';

const p = ( e ) => param( 'surface', { scope: 'both', ...e } );

export default [
	p( {
		id: 'surface.model', label: 'Shading model', type: 'enum', default: 'pbr', structural: true,
		options: [
			{ value: 'pbr', label: 'Stylized PBR' },
			{ value: 'toon', label: 'Toon (cel)' },
			{ value: 'halfLambert', label: 'Half-Lambert (soft wrap)' },
			{ value: 'flat', label: 'Flat (cast shadows only)' },
			{ value: 'toonWater', label: 'Toon water (depth color + foam)' },
		],
		learn: {
			what: 'How a surface turns light into color. Toon bands the light into flat tones; half-Lambert wraps light softly around the form; flat ignores the surface angle; PBR is physically based.',
			why: 'The shading model is the biggest single decision in a style. Banded light simplifies shapes into a few readable planes, which is why toon styles make simple geometry look intentional.',
			avoid: 'PBR on blockout geometry: it shows every flaw of the primitives. Toon water is meant for the water part only.',
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
	p( {
		id: 'surface.halftone.enabled', label: 'Halftone shading', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Prints dots of ink into the shadowed bands of each surface; the darker the light, the bigger the dots. Needs a toon, half-Lambert or flat model.',
			why: 'Comic colorists shade with Ben-Day dots instead of darker paint. Doing it in the material means the dots follow the light exactly, per part.',
			avoid: 'Screen-space dots on fast-moving objects: they stay fixed on screen while the object slides under them (the "shower-door" effect). Use world space for those.',
		},
		brief: 'Halftone dots in the shadow bands.',
		tags: [ 'halftone', 'comic', 'pattern' ],
	} ),
	p( {
		id: 'surface.halftone.size', label: 'Dot size (shading)', type: 'float', min: 2, max: 24, step: 0.5, unit: 'px@1080p', default: 6, enabledBy: 'surface.halftone.enabled',
		learn: { what: 'Dot spacing in pixels at 1080p (in world space: centimeters).', why: 'Bigger dots are bolder and more pop-art.' },
		brief: 'Shading dots {value} px at 1080p.',
		tags: [ 'halftone' ],
	} ),
	p( {
		id: 'surface.halftone.angle', label: 'Dot angle (shading)', type: 'angle', min: - 90, max: 90, step: 1, unit: '°', default: 45, enabledBy: 'surface.halftone.enabled',
		learn: { what: 'Rotation of the dot grid.', why: '45° hides the grid best.' },
		brief: 'Shading dots at {value}°.',
		tags: [ 'halftone' ],
	} ),
	p( {
		id: 'surface.halftone.threshold', label: 'Dots below light', type: 'float', min: 0, max: 1, step: 0.01, default: 0.75, enabledBy: 'surface.halftone.enabled',
		learn: { what: 'Light level (0 = deepest shadow, 1 = full light) below which dots appear.', why: 'With 3 bands, 0.75 dots the middle and dark bands; 0.3 dots only the darkest.' },
		brief: 'Dots where light is below {value}.',
		tags: [ 'halftone' ],
	} ),
	p( {
		id: 'surface.halftone.amount', label: 'Dot strength', type: 'float', min: 0, max: 1, step: 0.01, default: 0.85, neutral: 0, enabledBy: 'surface.halftone.enabled',
		learn: { what: 'How dark the dots are.', why: 'Partial strength gives tinted dots instead of solid ink.' },
		brief: 'Dot strength {value}.',
		tags: [ 'halftone' ],
	} ),
	p( {
		id: 'surface.halftone.color', label: 'Dot ink', type: 'color', default: '#1e1d36', enabledBy: 'surface.halftone.enabled',
		learn: { what: 'The ink color of the dots.', why: 'A deep blue or purple ink keeps shadows colorful.' },
		brief: 'Dot ink {value}.',
		tags: [ 'halftone', 'color' ],
	} ),
	p( {
		id: 'surface.halftone.space', label: 'Dot space', type: 'enum', default: 'screen', structural: true, enabledBy: 'surface.halftone.enabled',
		options: [ { value: 'screen', label: 'Screen (stable size)' }, { value: 'world', label: 'World (sticks to surfaces)' } ],
		learn: { what: 'Whether the dots are fixed to the screen or to the surfaces.', why: 'Screen dots keep a constant size, like print; world dots move with objects but grow and shrink with distance.' },
		brief: 'Dots in {label} space.',
		tags: [ 'halftone', 'shower-door' ],
	} ),
	p( {
		id: 'surface.hatching.enabled', label: 'Hatching shading', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Draws pen lines into the dark bands of each surface; darker light adds crossing layers. Needs a toon, half-Lambert or flat model.',
			why: 'Hatching describes form the way an inker would, following the light on each object.',
		},
		brief: 'Hatching in the dark bands.',
		tags: [ 'hatching', 'ink', 'pattern' ],
	} ),
	p( {
		id: 'surface.hatching.spacing', label: 'Hatch spacing (shading)', type: 'float', min: 2, max: 24, step: 0.5, unit: 'px@1080p', default: 6, enabledBy: 'surface.hatching.enabled',
		learn: { what: 'Distance between lines, in pixels at 1080p (centimeters in world space).', why: 'Tight lines read as fine pen work.' },
		brief: 'Shading hatch spacing {value} px at 1080p.',
		tags: [ 'hatching' ],
	} ),
	p( {
		id: 'surface.hatching.angle', label: 'Hatch angle (shading)', type: 'angle', min: - 90, max: 90, step: 1, unit: '°', default: - 45, enabledBy: 'surface.hatching.enabled',
		learn: { what: 'Angle of the first layer.', why: 'Crossing layers rotate from it.' },
		brief: 'Shading hatches at {value}°.',
		tags: [ 'hatching' ],
	} ),
	p( {
		id: 'surface.hatching.layers', label: 'Hatch layers (shading)', type: 'int', min: 1, max: 3, step: 1, default: 2, enabledBy: 'surface.hatching.enabled',
		learn: { what: 'How many crossing layers the darkest light gets.', why: 'More layers give deeper, engraved shadows.' },
		brief: 'Up to {value} hatch layers.',
		tags: [ 'hatching' ],
	} ),
	p( {
		id: 'surface.hatching.threshold', label: 'Hatch below light', type: 'float', min: 0, max: 1, step: 0.01, default: 0.3, enabledBy: 'surface.hatching.enabled',
		learn: { what: 'Light level below which the first layer appears.', why: 'Keep hatching to the deepest band and let dots or flat color carry the middle tones.' },
		brief: 'Hatching where light is below {value}.',
		tags: [ 'hatching' ],
	} ),
	p( {
		id: 'surface.hatching.amount', label: 'Hatch strength (shading)', type: 'float', min: 0, max: 1, step: 0.01, default: 0.85, neutral: 0, enabledBy: 'surface.hatching.enabled',
		learn: { what: 'How dark the lines are.', why: 'Light hatching reads as pencil, full strength as ink.' },
		brief: 'Shading hatch strength {value}.',
		tags: [ 'hatching' ],
	} ),
	p( {
		id: 'surface.hatching.color', label: 'Hatch ink (shading)', type: 'color', default: '#1e1d36', enabledBy: 'surface.hatching.enabled',
		learn: { what: 'The line color.', why: 'Match the line ink, so hatching and outlines read as one pen.' },
		brief: 'Hatch ink {value}.',
		tags: [ 'hatching', 'color' ],
	} ),
	p( {
		id: 'surface.hatching.space', label: 'Hatch space', type: 'enum', default: 'screen', structural: true, enabledBy: 'surface.hatching.enabled',
		options: [ { value: 'screen', label: 'Screen (stable width)' }, { value: 'world', label: 'World (sticks to surfaces)' } ],
		learn: { what: 'Whether lines are fixed to the screen or to the surfaces.', why: 'The same trade-off as halftone: screen lines keep their width, world lines move with objects.' },
		brief: 'Hatching in {label} space.',
		tags: [ 'hatching', 'shower-door' ],
	} ),
	p( {
		id: 'surface.dither.enabled', label: 'Dithered shading (1-bit)', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Replaces smooth light bands with an ordered dither pattern between them. With 2 bands the light is 1-bit: lit or not, and the gradient becomes a checker of dots.',
			why: 'This is how 1-bit and early Mac games drew light: two inks and a pattern. Doing it in the material keeps it on the objects, crisp at any resolution.',
		},
		brief: 'Ordered-dither shading between the light bands.',
		tags: [ 'dither', '1-bit', 'retro', 'pattern' ],
	} ),
	p( {
		id: 'surface.variation.enabled', label: 'Color variation', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Varies each surface\'s color slightly with soft noise, in hue and value.',
			why: 'Real paint and real materials are never one flat color. A little variation inside each shape is what painters call "broken color": the scene stops looking like plastic.',
			avoid: 'Strong variation on graphic toon looks, where flat color is the point.',
		},
		brief: 'Color variation inside each surface.',
		tags: [ 'color', 'variation', 'painterly', 'texture' ],
	} ),
	p( {
		id: 'surface.variation.amount', label: 'Variation amount', type: 'float', min: 0, max: 0.5, step: 0.005, default: 0.1, neutral: 0, enabledBy: 'surface.variation.enabled',
		learn: { what: 'How much colors drift.', why: '0.05–0.1 is felt rather than seen.' },
		brief: 'Color variation {value}.',
		tags: [ 'variation' ],
	} ),
	p( {
		id: 'surface.variation.scale', label: 'Variation size', type: 'float', min: 0.05, max: 5, step: 0.01, unit: '/m', default: 0.6, enabledBy: 'surface.variation.enabled',
		learn: { what: 'Noise frequency per meter: low values make big patches, high values a fine mottle.', why: 'Patches about a meter across read as brush work at gameplay distance.' },
		brief: 'Variation frequency {value} per meter.',
		tags: [ 'variation' ],
	} ),
	p( {
		id: 'surface.variation.hue', label: 'Hue vs. value', type: 'float', min: 0, max: 1, step: 0.01, default: 0.4, enabledBy: 'surface.variation.enabled',
		learn: { what: '0 varies only lightness; 1 only hue.', why: 'Painters vary hue more than value, so shapes keep their read while the color gets richer.' },
		brief: 'Variation split {value} hue / value.',
		tags: [ 'variation' ],
	} ),
	p( {
		id: 'surface.variation.space', label: 'Variation space', type: 'enum', default: 'world', structural: true, enabledBy: 'surface.variation.enabled',
		options: [ { value: 'world', label: 'World' }, { value: 'object', label: 'Object (moves with it)' } ],
		learn: { what: 'Whether the noise is fixed in the world or travels with each object.', why: 'Object space keeps moving characters from swimming through the pattern.' },
		brief: 'Variation in {label} space.',
		tags: [ 'variation' ],
	} ),
	p( {
		id: 'surface.gradient.enabled', label: 'Vertical gradient', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Darkens each object toward its base and lightens it toward its top.',
			why: 'Sky light hits tops and the ground darkens bases. A painted gradient fakes that occlusion for free and grounds objects, a classic hand-painted texture trick.',
		},
		brief: 'Vertical gradient: darker at the base, lighter on top.',
		tags: [ 'gradient', 'painterly', 'grounding' ],
	} ),
	p( {
		id: 'surface.gradient.amount', label: 'Gradient amount', type: 'float', min: 0, max: 1, step: 0.01, default: 0.3, neutral: 0, enabledBy: 'surface.gradient.enabled',
		learn: { what: 'How strong the gradient is.', why: '0.2–0.35 is natural; more becomes a stylized airbrush.' },
		brief: 'Gradient amount {value}.',
		tags: [ 'gradient' ],
	} ),
	p( {
		id: 'surface.gradient.height', label: 'Gradient height', type: 'float', min: 0.2, max: 30, step: 0.1, unit: 'm', default: 3, enabledBy: 'surface.gradient.enabled',
		learn: { what: 'Height over which the gradient runs, from each object\'s origin.', why: 'Match it to the part: about 2 m for characters, more for buildings.' },
		brief: 'Gradient over {value} m.',
		tags: [ 'gradient' ],
	} ),
	p( {
		id: 'surface.water.shallow', label: 'Water: shallow', type: 'color', default: '#45c3e0',
		learn: { what: 'Toon water color where it is shallow.', why: 'A bright, light shallow color makes shores and depth readable at a glance.' },
		brief: 'Shallow water {value}.',
		tags: [ 'water' ],
	} ),
	p( {
		id: 'surface.water.deep', label: 'Water: deep', type: 'color', default: '#1c6fd1',
		learn: { what: 'Toon water color where it is deep.', why: 'Deep water darkens and saturates; the contrast with the shallows gives the sea its shape.' },
		brief: 'Deep water {value}.',
		tags: [ 'water' ],
	} ),
	p( {
		id: 'surface.water.depth', label: 'Water: depth range', type: 'float', min: 0.2, max: 30, step: 0.1, unit: 'm', default: 4,
		learn: { what: 'Depth at which water reaches its deep color.', why: 'Smaller values give a narrow shallow rim; larger ones long gradients of lagoon.' },
		brief: 'Deep color at {value} m.',
		tags: [ 'water' ],
	} ),
	p( {
		id: 'surface.water.bands', label: 'Water: color bands', type: 'int', min: 0, max: 5, step: 1, default: 3,
		learn: { what: 'Flat steps between the shallow and deep colors (0 is smooth).', why: 'Banded depth is the toon-water signature: flat rings of color around islands.' },
		brief: 'Water depth in {value} bands.',
		tags: [ 'water', 'toon' ],
	} ),
	p( {
		id: 'surface.water.foam', label: 'Water: shore foam', type: 'float', min: 0, max: 2, step: 0.01, unit: 'm', default: 0.35,
		learn: { what: 'Width of the white foam line where water meets objects and shores.', why: 'Intersection foam is the cheapest way to make water feel like it touches the world.' },
		brief: 'Shore foam {value} m wide.',
		tags: [ 'water', 'foam' ],
	} ),
	p( {
		id: 'surface.water.pattern', label: 'Water: foam pattern', type: 'float', min: 0, max: 1, step: 0.01, default: 0.4,
		learn: { what: 'Drifting cellular foam lines on the surface.', why: 'Stylized seas draw their motion with a few bright lines instead of reflections.' },
		brief: 'Foam pattern {value}.',
		tags: [ 'water', 'foam' ],
	} ),
	p( {
		id: 'surface.water.foamColor', label: 'Water: foam color', type: 'color', default: '#ffffff',
		learn: { what: 'Color of foam and foam lines.', why: 'Pure white reads as sunlit foam; tinted foam fits darker or sunset palettes.' },
		brief: 'Foam {value}.',
		tags: [ 'water', 'foam' ],
	} ),
	p( {
		id: 'surface.wind.enabled', label: 'Wind sway', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Makes every mesh of the part sway with the wind, more toward its top. Grass always sways; this adds trees, bushes, flags and anything else you pick.',
			why: 'Moving foliage is the simplest sign of a living world, and it gives still shots a sense of air.',
			avoid: 'Wind on rigid things (buildings, rocks). Swaying meshes get no hull outline, because the hull wouldn\'t follow the sway.',
		},
		brief: 'Wind sway (stronger toward the top of each mesh).',
		tags: [ 'wind', 'foliage', 'motion' ],
	} ),
	p( {
		id: 'surface.wind.strength', label: 'Wind strength', type: 'float', min: 0, max: 3, step: 0.01, unit: '×', default: 1,
		learn: { what: 'Scales how far grass and swaying meshes move.', why: 'A breeze vs. a storm: strength sets the mood.' },
		brief: 'Wind strength ×{value}.',
		tags: [ 'wind' ],
	} ),
	p( {
		id: 'surface.wind.speed', label: 'Wind speed', type: 'float', min: 0, max: 3, step: 0.01, unit: '×', default: 1,
		learn: { what: 'Scales how fast the sway oscillates.', why: 'Slow sway is calm; fast sway is gusty and tense.' },
		brief: 'Wind speed ×{value}.',
		tags: [ 'wind' ],
	} ),
	p( {
		id: 'surface.wind.gusts', label: 'Gusts', type: 'float', min: 0, max: 1, step: 0.01, default: 0.3,
		learn: { what: 'Slow waves of stronger wind rolling across the scene.', why: 'Gusts make wind travel across a field instead of everything moving in lockstep.' },
		brief: 'Gusts {value}.',
		tags: [ 'wind' ],
	} ),
];
