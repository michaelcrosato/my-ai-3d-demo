import { param } from './define.js';

const p = ( e ) => param( 'media', e );

export default [
	p( {
		id: 'media.grain.amount', label: 'Film grain', type: 'float', min: 0, max: 0.3, step: 0.005, default: 0,
		learn: {
			what: 'Fine noise over the final image, strongest in the midtones.',
			why: 'Grain hides color banding in gradients and adds a tactile, filmic texture. A little makes digital images feel less sterile.',
			typical: '0.02–0.08.',
		},
		brief: 'Film grain {value}.',
		tags: [ 'grain', 'film', 'texture' ],
	} ),
	p( {
		id: 'media.grain.size', label: 'Grain size', type: 'float', min: 1, max: 4, step: 0.1, unit: 'px@1080p', default: 1.5,
		learn: { what: 'Size of a grain particle, in pixels at 1080p.', why: 'Larger grain reads as faster film or lower resolution.' },
		brief: 'Grain size {value} px at 1080p.',
		tags: [ 'grain' ],
	} ),
	p( {
		id: 'media.grain.animated', label: 'Animated grain', type: 'bool', default: true,
		learn: { what: 'Changes the grain pattern every frame.', why: 'Moving grain reads as film; static grain reads as a texture printed on the screen.' },
		brief: 'Grain animates each frame.',
		tags: [ 'grain' ],
	} ),
];
