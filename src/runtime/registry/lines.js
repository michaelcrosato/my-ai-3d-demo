import { param, CHEAP, MEDIUM } from './define.js';

const p = ( e ) => param( 'lines', e );

export default [
	p( {
		id: 'lines.hull.enabled', label: 'Hull outlines', type: 'bool', default: false, structural: true, scope: 'both', cost: { ...CHEAP, fpe: 0.3 },
		learn: {
			what: 'Outlines drawn by rendering a slightly inflated, inside-out copy of each mesh behind it (the "inverted hull").',
			why: 'Ink around a shape separates it from the background and makes it read at a glance, like a character drawn on top of a painted set. Hulls are exact per object and cheap on phones.',
			avoid: 'Hull lines on terrain and big flat surfaces: they only outline the outer edge and look odd.',
			typical: 'On characters and props.',
		},
		brief: 'Inverted-hull outlines (back faces extruded along smoothed normals).',
		tags: [ 'outline', 'ink', 'lines' ],
	} ),
	p( {
		id: 'lines.hull.thickness', label: 'Hull thickness', type: 'float', min: 0, max: 8, step: 0.1, unit: 'px@1080p', default: 1.5, neutral: 0, scope: 'both', enabledBy: 'lines.hull.enabled',
		learn: {
			what: 'Outline width in pixels at 1080p. It scales with the output height, so lines look the same on every screen.',
			why: 'Thick lines read as bold and cartoony; thin ones as delicate. Constant screen width keeps far objects from getting blobby.',
			typical: '1.5–2.5 px.',
		},
		brief: 'Hull outlines {value} px at 1080p (scale with output height).',
		tags: [ 'outline' ],
	} ),
	p( {
		id: 'lines.hull.color', label: 'Hull color', type: 'color', default: '#1b1d2a', scope: 'both',
		learn: {
			what: 'The color of the hull outlines.',
			why: 'Pure black is graphic; a dark, tinted line (navy, brown) is softer and blends with the palette.',
		},
		brief: 'Hull outline color {value}.',
		tags: [ 'outline', 'color' ],
	} ),
	p( {
		id: 'lines.screen.enabled', scope: 'mask', label: 'Screen-space ink', type: 'bool', default: false, structural: true, requires: [ 'depth', 'normal', 'ids' ], cost: MEDIUM,
		learn: {
			what: 'Lines found after rendering, by comparing depth, normals and object ids between neighboring pixels.',
			why: 'They catch inner creases and overlaps that hulls can\'t, so every shape is inked like a comic panel.',
			avoid: 'High-detail geometry: every small crease becomes a line. Raise the crease angle or lower the crease weight.',
		},
		brief: 'Screen-space edge detection on depth, normals and object ids.',
		tags: [ 'outline', 'ink', 'lines', 'edges' ],
	} ),
	p( {
		id: 'lines.screen.thickness', scope: 'mask', label: 'Ink thickness', type: 'float', min: 0, max: 6, step: 0.1, unit: 'px@1080p', default: 1.5, neutral: 0, enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'Width of the screen-space lines in pixels at 1080p.',
			why: 'Thick ink is the signature of graffiti and comic styles; thin ink suits clean illustration.',
			typical: '1–3 px.',
		},
		brief: 'Ink lines {value} px at 1080p.',
		tags: [ 'lines' ],
	} ),
	p( {
		id: 'lines.screen.color', scope: 'mask', label: 'Ink color', type: 'color', default: '#0e0e12', enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'The color of the screen-space lines.',
			why: 'Near-black reads as ink. Colored lines feel softer and more modern.',
		},
		brief: 'Ink color {value}.',
		tags: [ 'lines', 'color' ],
	} ),
	p( {
		id: 'lines.screen.silhouette', label: 'Silhouette weight', type: 'float', min: 0, max: 1, step: 0.01, default: 1, neutral: 0, enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'Strength of lines at depth jumps: the outer contour of objects.',
			why: 'Illustrators draw silhouettes heaviest, because the outline is what makes a shape readable.',
		},
		brief: 'Silhouette (depth) edges at weight {value}.',
		tags: [ 'lines', 'silhouette' ],
	} ),
	p( {
		id: 'lines.screen.crease', label: 'Crease weight', type: 'float', min: 0, max: 1, step: 0.01, default: 0.5, neutral: 0, enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'Strength of lines where the surface folds sharply (normal changes).',
			why: 'Crease lines describe the inner structure of a shape, such as the corners of a building.',
			typical: 'Lower than the silhouette weight, so contours stay dominant.',
		},
		brief: 'Crease (normal) edges at weight {value}.',
		tags: [ 'lines', 'crease' ],
	} ),
	p( {
		id: 'lines.screen.creaseAngle', label: 'Crease angle', type: 'float', min: 5, max: 90, step: 1, unit: '°', default: 35, enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'How sharp a fold must be before it gets a crease line.',
			why: 'A higher angle keeps lines on real corners only, so curved and detailed surfaces stay clean.',
			typical: '30–45°.',
		},
		brief: 'Creases sharper than {value}° get lines.',
		tags: [ 'lines', 'crease' ],
	} ),
	p( {
		id: 'lines.screen.depthThreshold', label: 'Depth sensitivity', type: 'float', min: 0.002, max: 0.2, step: 0.001, default: 0.03, enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'The relative depth jump (as a fraction of distance) that counts as a silhouette.',
			why: 'It is relative, so it works the same up close and far away. Lower values ink smaller overlaps.',
		},
		brief: 'Depth jumps above {value} of the distance count as silhouettes.',
		tags: [ 'lines' ],
	} ),
	p( {
		id: 'lines.screen.idWeight', label: 'Object-boundary weight', type: 'float', min: 0, max: 1, step: 0.01, default: 1, neutral: 0, enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'Strength of lines where two different parts touch, even without a depth jump (a character standing on the ground, a box against a wall).',
			why: 'Depth and normals miss contact lines; part ids catch them, so objects separate cleanly from what they touch.',
		},
		brief: 'Part-boundary edges at weight {value}.',
		tags: [ 'lines', 'ids' ],
	} ),
	p( {
		id: 'lines.screen.followFog', label: 'Lines fade with fog', type: 'float', min: 0, max: 1, step: 0.01, default: 1, enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'How much the ink fades into the fog with distance.',
			why: 'Atmosphere softens everything far away, ink included. Lines that ignore fog pop distant objects forward.',
		},
		brief: 'Ink fades with fog (amount {value}).',
		tags: [ 'lines', 'fog', 'depth' ],
	} ),
	p( {
		id: 'lines.screen.opacity', label: 'Ink opacity', type: 'float', min: 0, max: 1, step: 0.01, default: 1, neutral: 0, enabledBy: 'lines.screen.enabled',
		learn: { what: 'How opaque the ink is.', why: 'Translucent lines read as pencil or soft paint; opaque ones as ink.' },
		brief: 'Ink opacity {value}.',
		tags: [ 'lines' ],
	} ),
	p( {
		id: 'lines.screen.colorFromSurface', label: 'Colored lines', type: 'float', min: 0, max: 1, step: 0.01, default: 0, enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'Mixes the ink toward a darker, more saturated version of the color under it, instead of one fixed ink color.',
			why: 'Colored lines (a dark red line on a red coat) are the anime and modern-illustration look: softer than black ink, but still separating shapes.',
		},
		brief: 'Lines take the darkened local color (amount {value}).',
		tags: [ 'lines', 'color', 'anime' ],
	} ),
	p( {
		id: 'lines.screen.darken', label: 'Colored-line darkness', type: 'float', min: 0.05, max: 1, step: 0.01, default: 0.45, enabledBy: 'lines.screen.enabled',
		learn: { what: 'How dark colored lines are, as a fraction of the local color.', why: 'Around 0.4–0.6 keeps the hue readable while still reading as a line.' },
		brief: 'Colored lines at {value}× the local color.',
		tags: [ 'lines', 'color' ],
	} ),
	p( {
		id: 'lines.screen.fade', label: 'Distance fade', type: 'float', min: 0, max: 1, step: 0.01, default: 0, enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'Thins out lines between the fade start and end distances.',
			why: 'Distant detail drawn with full-strength ink turns to noise, especially at high complexity. Illustrators draw the background lighter; fading does the same.',
			typical: '0.7–1 on dense scenes (meadows, cities).',
		},
		brief: 'Lines fade with distance (amount {value}).',
		tags: [ 'lines', 'depth', 'noise' ],
	} ),
	p( {
		id: 'lines.screen.fadeStart', label: 'Fade start', type: 'float', min: 0, max: 300, step: 1, unit: 'm', default: 25, enabledBy: 'lines.screen.enabled',
		learn: { what: 'Distance where lines start to fade.', why: 'Keep the play area fully inked.' },
		brief: 'Line fade starts at {value} m.',
		tags: [ 'lines' ],
	} ),
	p( {
		id: 'lines.screen.fadeEnd', label: 'Fade end', type: 'float', min: 1, max: 1000, step: 1, unit: 'm', default: 120, enabledBy: 'lines.screen.enabled',
		learn: { what: 'Distance where lines reach their minimum.', why: 'Beyond this, shapes read by value and color only.' },
		brief: 'Line fade ends at {value} m.',
		tags: [ 'lines' ],
	} ),
	p( {
		id: 'lines.screen.lightWeight', label: 'Thicker in shadow', type: 'float', min: 0, max: 2, step: 0.01, default: 0, enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'Makes lines thicker where the image is dark (up to +100% per 1.0).',
			why: 'Inkers weight lines by light: thin where the light hits, heavy on the shadow side. It adds form and drama for free.',
		},
		brief: 'Lines up to {value}× thicker in shadow.',
		tags: [ 'lines', 'comic', 'weight' ],
	} ),
	p( {
		id: 'lines.screen.wobble', label: 'Wobble', type: 'float', min: 0, max: 4, step: 0.05, unit: 'px@1080p', default: 0, enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'Displaces the lines irregularly, as if drawn by hand. With line boil (Motion), the wobble changes a few times a second.',
			why: 'Perfect lines look computer-made. A little wobble reads as a human hand; boiling lines are the signature of hand-drawn animation.',
		},
		brief: 'Hand wobble {value} px at 1080p.',
		tags: [ 'lines', 'hand-drawn', 'boil' ],
	} ),
	p( {
		id: 'lines.screen.wobbleScale', label: 'Wobble frequency', type: 'float', min: 0.2, max: 4, step: 0.05, default: 1, enabledBy: 'lines.screen.enabled',
		learn: { what: 'How quickly the wobble varies along a line.', why: 'Low frequency looks like a slow, confident hand; high frequency like a shaky one.' },
		brief: 'Wobble frequency {value}.',
		tags: [ 'lines' ],
	} ),
	p( {
		id: 'lines.screen.texture', label: 'Line texture', type: 'enum', default: 'none', enabledBy: 'lines.screen.enabled',
		options: [ { value: 'none', label: 'Clean' }, { value: 'pencil', label: 'Pencil (grainy)' }, { value: 'brush', label: 'Brush (varying width)' }, { value: 'ink', label: 'Ink (blotchy)' } ],
		learn: { what: 'The tool the lines are drawn with.', why: 'Grainy pencil, swelling brush strokes or blotchy dip-pen ink each say a different medium.' },
		brief: 'Line texture: {label}.',
		tags: [ 'lines', 'texture' ],
	} ),
	p( {
		id: 'lines.screen.textureAmount', label: 'Texture amount', type: 'float', min: 0, max: 1, step: 0.01, default: 0.6, enabledBy: 'lines.screen.enabled',
		learn: { what: 'How strong the line texture is.', why: 'Subtle texture adds character without breaking the lines.' },
		brief: 'Line texture amount {value}.',
		tags: [ 'lines', 'texture' ],
	} ),
	// P2 (M10): image-space Sobel edges and the interactable highlight.
	p( {
		id: 'lines.sobel.enabled', label: 'Image edges (Sobel)', type: 'bool', default: false, structural: true, cost: { ...MEDIUM, fpe: 0.6 },
		learn: {
			what: 'Finds edges in the finished image itself, wherever brightness changes sharply, and inks them. It knows nothing about the geometry.',
			why: 'It shows why geometry-aware ink wins: Sobel traces shadows, highlights and texture as eagerly as silhouettes, and misses the edge between two equally bright objects. As a deliberate style it gives a rough, photocopied or rotoscoped look.',
			avoid: 'Using it instead of screen-space ink for clean cel lines, and on noisy images (grain, dither), where it inks the noise.',
		},
		brief: 'Image-space Sobel edge lines (brightness edges, not geometry).',
		tags: [ 'lines', 'sobel', 'edges', 'photocopy' ],
	} ),
	p( {
		id: 'lines.sobel.threshold', label: 'Edge threshold', type: 'float', min: 0.01, max: 1, step: 0.01, default: 0.25, enabledBy: 'lines.sobel.enabled',
		learn: { what: 'How strong a brightness change must be to become a line.', why: 'Low thresholds ink every texture and shadow; high ones keep only the strongest contrasts.', typical: '0.15–0.4.' },
		brief: 'Sobel threshold {value}.',
		tags: [ 'sobel' ],
	} ),
	p( {
		id: 'lines.sobel.thickness', label: 'Edge thickness', type: 'float', min: 0.5, max: 4, step: 0.05, unit: 'px@1080p', default: 1.2, enabledBy: 'lines.sobel.enabled',
		learn: { what: 'The kernel spacing, in pixels at 1080p: wider kernels give thicker, softer lines.', why: 'Thick Sobel lines read as marker; thin ones as a photocopy.' },
		brief: 'Sobel lines {value} px at 1080p.',
		tags: [ 'sobel' ],
	} ),
	p( {
		id: 'lines.sobel.color', label: 'Edge color', type: 'color', default: '#141414', enabledBy: 'lines.sobel.enabled',
		learn: { what: 'The ink color of the image edges.', why: 'Near-black reads as ink; a dark hue from the palette keeps the lines in the picture.' },
		brief: 'Sobel ink {value}.',
		tags: [ 'sobel' ],
	} ),
	p( {
		id: 'lines.sobel.amount', label: 'Edge opacity', type: 'float', min: 0, max: 1, step: 0.01, default: 1, neutral: 0, enabledBy: 'lines.sobel.enabled',
		learn: { what: 'How opaque the image edges are.', why: 'Partial opacity layers the edges under geometry ink without doubling every line.' },
		brief: 'Sobel opacity {value}.',
		tags: [ 'sobel' ],
	} ),
	p( {
		id: 'lines.highlight.enabled', label: 'Interactable highlight', type: 'bool', default: false, structural: true, cost: { ...MEDIUM, fpe: 0.6 }, requires: [ 'ids' ],
		learn: {
			what: 'Outlines what a player can use (pickups, chests, item blocks), or a whole part, in a color of its own, with an optional pulse.',
			why: 'Games highlight what can be touched so players read the world at a glance. A consistent highlight color and width belong in the style guide, not in each asset.',
			avoid: 'Highlighting too much: when everything glows, nothing reads as special. Pick one color nothing else in the palette uses.',
		},
		brief: 'Interactable highlight outline.',
		tags: [ 'lines', 'highlight', 'outline', 'gameplay', 'readability' ],
	} ),
	p( {
		id: 'lines.highlight.target', label: 'Highlight', type: 'enum', default: 'interactable', enabledBy: 'lines.highlight.enabled',
		options: [
			{ value: 'interactable', label: 'Interactable objects' },
			{ value: 'hero', label: 'The hero' },
			{ value: 'characters', label: 'Characters' },
			{ value: 'props', label: 'Props' },
			{ value: 'vfx', label: 'VFX' },
		],
		learn: { what: 'What gets the outline: objects tagged interactable (coins, chests, item blocks, or `userData.style.interactable` on your meshes), or every object of one part.', why: 'Tag what matters to the player; outlining a whole part is for teaching and debugging reads.' },
		brief: 'Highlights: {label}.',
		tags: [ 'highlight' ],
	} ),
	p( {
		id: 'lines.highlight.color', label: 'Highlight color', type: 'color', default: '#ffd54a', enabledBy: 'lines.highlight.enabled',
		learn: { what: 'The outline color.', why: 'Warm yellow and white read as "pick me up" in most games; use one hue nothing else in the scene uses.' },
		brief: 'Highlight color {value}.',
		tags: [ 'highlight' ],
	} ),
	p( {
		id: 'lines.highlight.thickness', label: 'Highlight width', type: 'float', min: 1, max: 8, step: 0.1, unit: 'px@1080p', default: 3, enabledBy: 'lines.highlight.enabled',
		learn: { what: 'The outline width in pixels at 1080p.', why: 'Wider than the ink lines, so the highlight never reads as part of the drawing.' },
		brief: 'Highlight {value} px at 1080p.',
		tags: [ 'highlight' ],
	} ),
	p( {
		id: 'lines.highlight.pulse', label: 'Highlight pulse', type: 'float', min: 0, max: 1, step: 0.01, default: 0.5, neutral: 0, enabledBy: 'lines.highlight.enabled',
		learn: { what: 'How much the outline breathes in and out (about once a second).', why: 'Motion draws the eye in the periphery, where a static outline is missed.' },
		brief: 'Highlight pulse {value}.',
		tags: [ 'highlight' ],
	} ),
	p( {
		id: 'lines.highlight.fill', label: 'Highlight fill', type: 'float', min: 0, max: 1, step: 0.01, default: 0.15, neutral: 0, enabledBy: 'lines.highlight.enabled',
		learn: { what: 'A tint of the highlight color over the highlighted objects themselves.', why: 'A faint fill makes small pickups readable even when their outline is hidden.' },
		brief: 'Highlight fill {value}.',
		tags: [ 'highlight' ],
	} ),
];
