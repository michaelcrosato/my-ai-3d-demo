import { param, CHEAP } from './define.js';

const p = ( e ) => param( 'motion', e );

export default [
	p( {
		id: 'motion.stepped.fps', scope: 'both', label: 'Animate on…', type: 'int', min: 0, max: 30, step: 1, unit: 'fps', default: 0,
		learn: {
			what: 'Updates animation (characters, water, wind, flicker) only this many times per second. 0 is smooth. The camera always stays smooth. Per part, the hero can stay smooth while the background animates on twos.',
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
	// P2 (M10): low frame-rate rendering and speed lines.
	p( {
		id: 'motion.lowFps.fps', label: 'Render at…', type: 'int', min: 0, max: 30, step: 1, unit: 'fps', default: 0,
		learn: {
			what: 'Caps how often the frame is drawn; between draws, the last frame stays on screen, camera and all. 0 draws every frame.',
			why: 'A low frame rate is a style: stop-motion, choppy security cameras, an old console straining. Unlike Animate on…, it steps everything, the camera too.',
			typical: '12 for stop-motion, 15–20 for a strained console, 0 for smooth.',
			avoid: 'Gameplay that needs responsive aiming, and anything below about 8 fps, which reads as lag rather than style.',
		},
		brief: 'Frames drawn at {value} fps (the last frame holds in between, camera included); 0 = every frame.',
		tags: [ 'motion', 'frame rate', 'stop-motion' ],
	} ),
	p( {
		id: 'motion.speedLines.enabled', label: 'Speed lines', type: 'bool', default: false, structural: true, cost: { ...CHEAP, fpe: 0.2 },
		learn: {
			what: 'Radial streaks from the edges of the frame toward a center, redrawn a few times a second, like the speed lines in manga and anime.',
			why: 'Comics show speed with lines, not blur. They sell velocity and impact in toon looks, where motion blur would smear the clean shapes.',
			avoid: 'Leaving them on when nothing moves: they read as tension, not speed.',
		},
		brief: 'Manga speed lines.',
		tags: [ 'motion', 'speed lines', 'manga', 'anime', 'comic' ],
	} ),
	p( {
		id: 'motion.speedLines.amount', label: 'Line density', type: 'float', min: 0, max: 1, step: 0.01, default: 0.6, neutral: 0, enabledBy: 'motion.speedLines.enabled',
		learn: { what: 'How many lines there are and how far in they reach.', why: 'A few lines hint at motion; many lines are a burst of speed or shock.', typical: '0.4–0.8.' },
		brief: 'Speed-line density {value}.',
		tags: [ 'speed lines' ],
	} ),
	p( {
		id: 'motion.speedLines.clear', label: 'Clear center', type: 'float', min: 0, max: 0.9, step: 0.01, default: 0.35, enabledBy: 'motion.speedLines.enabled',
		learn: { what: 'The radius around the center that stays free of lines (a fraction of the frame).', why: 'Keep the subject clear: the lines frame it rather than cross it.' },
		brief: 'Lines keep {value} of the frame around the center clear.',
		tags: [ 'speed lines' ],
	} ),
	p( {
		id: 'motion.speedLines.centerX', label: 'Center (x)', type: 'float', min: 0, max: 1, step: 0.01, default: 0.5, enabledBy: 'motion.speedLines.enabled',
		learn: { what: 'Where the lines converge, across the frame (0 left, 1 right).', why: 'Put the center on the subject or the direction of travel.' },
		brief: 'Speed lines converge at x = {value}.',
		tags: [ 'speed lines' ],
	} ),
	p( {
		id: 'motion.speedLines.centerY', label: 'Center (y)', type: 'float', min: 0, max: 1, step: 0.01, default: 0.5, enabledBy: 'motion.speedLines.enabled',
		learn: { what: 'Where the lines converge, down the frame (0 top, 1 bottom).', why: 'Chase cameras converge slightly above the middle, where the road meets the horizon.' },
		brief: 'Speed lines converge at y = {value}.',
		tags: [ 'speed lines' ],
	} ),
	p( {
		id: 'motion.speedLines.color', label: 'Line color', type: 'color', default: '#ffffff', enabledBy: 'motion.speedLines.enabled',
		learn: { what: 'The color of the speed lines.', why: 'White reads as light streaking past; black as ink on a comic page.' },
		brief: 'Speed lines {value}.',
		tags: [ 'speed lines' ],
	} ),
];
