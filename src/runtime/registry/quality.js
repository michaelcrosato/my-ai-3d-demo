import { param } from './define.js';

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
];
