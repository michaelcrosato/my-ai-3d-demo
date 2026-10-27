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
		id: 'lines.screen.enabled', label: 'Screen-space ink', type: 'bool', default: false, structural: true, requires: [ 'depth', 'normal', 'ids' ], cost: MEDIUM,
		learn: {
			what: 'Lines found after rendering, by comparing depth, normals and object ids between neighboring pixels.',
			why: 'They catch inner creases and overlaps that hulls can\'t, so every shape is inked like a comic panel.',
			avoid: 'High-detail geometry: every small crease becomes a line. Raise the crease angle or lower the crease weight.',
		},
		brief: 'Screen-space edge detection on depth, normals and object ids.',
		tags: [ 'outline', 'ink', 'lines', 'edges' ],
	} ),
	p( {
		id: 'lines.screen.thickness', label: 'Ink thickness', type: 'float', min: 0, max: 6, step: 0.1, unit: 'px@1080p', default: 1.5, neutral: 0, enabledBy: 'lines.screen.enabled',
		learn: {
			what: 'Width of the screen-space lines in pixels at 1080p.',
			why: 'Thick ink is the signature of graffiti and comic styles; thin ink suits clean illustration.',
			typical: '1–3 px.',
		},
		brief: 'Ink lines {value} px at 1080p.',
		tags: [ 'lines' ],
	} ),
	p( {
		id: 'lines.screen.color', label: 'Ink color', type: 'color', default: '#0e0e12', enabledBy: 'lines.screen.enabled',
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
];
