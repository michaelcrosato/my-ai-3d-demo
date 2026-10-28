import { param, CHEAP, HEAVY } from './define.js';

const p = ( e ) => param( 'quality', e );

export default [
	p( {
		id: 'quality.resolution', label: 'Internal resolution', type: 'float', min: 0.25, max: 2, step: 0.05, unit: '×', default: 1,
		learn: {
			what: 'Renders the styled scene at a fraction (or multiple) of the screen resolution, then scales it.',
			why: 'Rendering fewer pixels is the biggest single saving on phones, and toon styles with flat color hide it well.',
			typical: '0.75 on phones, 1 on desktop.',
		},
		brief: 'Render at {value}× resolution.',
		tags: [ 'quality', 'performance' ],
	} ),
	p( {
		id: 'quality.aa', label: 'Anti-aliasing', type: 'enum', default: 'auto', structural: true, cost: { ...CHEAP, fpe: 0.4 },
		options: [
			{ value: 'auto', label: 'Auto (MSAA, or FXAA with extra buffers)' },
			{ value: 'none', label: 'None' },
			{ value: 'fxaa', label: 'FXAA (fast, soft)' },
			{ value: 'smaa', label: 'SMAA (sharper edges)' },
			{ value: 'msaa', label: 'MSAA 4× (geometry edges)' },
			{ value: 'traa', label: 'TRAA (temporal, smoothest)' },
		],
		learn: {
			what: 'How jagged edges are smoothed. MSAA samples geometry edges while rendering; FXAA and SMAA blur edges they detect afterwards; TRAA jitters the camera and blends frames over time.',
			why: 'Clean edges matter most for line-heavy styles. MSAA is cheap on phones (tile-based GPUs resolve it on chip) but can\'t be used with the ids buffer, so Auto switches to FXAA when lines need it. Pixel looks skip AA: their hard pixels are the point.',
			avoid: 'TRAA with fast motion or retro looks: it ghosts slightly and smooths away pixel crispness.',
		},
		brief: 'Anti-aliasing: {label}.',
		tags: [ 'quality', 'aa', 'performance' ],
	} ),
];
