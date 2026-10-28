import { param } from './define.js';

const p = ( e ) => param( 'motion', e );

export default [
	p( {
		id: 'motion.stepped.fps', label: 'Animate on…', type: 'int', min: 0, max: 30, step: 1, unit: 'fps', default: 0,
		learn: {
			what: 'Updates animation (characters, water, wind, flicker) only this many times per second. 0 is smooth. The camera always stays smooth.',
			why: 'Hand-drawn animation runs "on twos" (12 drawings per second). Stepped motion on a smooth camera makes 3D read as drawn, the trick behind stylized animated films.',
			typical: '12 (on twos), 8 (on threes), 0 (smooth).',
			avoid: 'Stepping the player character in an action game: it costs responsiveness.',
		},
		brief: 'Animation stepped at {value} fps (camera smooth); 0 = continuous.',
		tags: [ 'motion', 'animation', 'on twos' ],
	} ),
	p( {
		id: 'motion.boil.fps', label: 'Line boil', type: 'int', min: 0, max: 24, step: 1, unit: 'fps', default: 0,
		learn: {
			what: 'Redraws the line wobble this many times per second, so lines "boil" like hand-drawn animation. 0 keeps the wobble still.',
			why: 'In traditional animation every frame is redrawn, so lines shimmer slightly. Boil at 8–12 fps makes a still scene feel alive and drawn.',
			avoid: 'High boil rates: above about 12 fps it reads as noise, not drawing.',
		},
		brief: 'Line boil at {value} fps (0 = static).',
		tags: [ 'motion', 'lines', 'boil', 'hand-drawn' ],
	} ),
];
