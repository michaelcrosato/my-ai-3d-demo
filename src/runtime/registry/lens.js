import { param, MEDIUM } from './define.js';

const p = ( e ) => param( 'lens', e );

export default [
	p( {
		id: 'lens.fovScale', label: 'Lens width', type: 'float', min: 0.5, max: 2, step: 0.01, unit: '×', default: 1,
		learn: {
			what: 'Widens (above 1) or narrows (below 1) each camera shot\'s own lens. The camera dollies to keep the subject the same size, so only the perspective changes.',
			why: 'Wide lenses exaggerate depth and speed (skating and racing games); long lenses flatten and compress (strategy, cinematic close-ups). Scaling the shot\'s lens keeps each genre\'s camera, so a top-down garden stays top-down.',
			typical: '1.2–1.4 for fast action, 0.7–0.85 for a flatter, telephoto feel.',
		},
		brief: 'Lens {value}× wider than the default camera (dolly to keep the subject size).',
		tags: [ 'camera', 'lens', 'fov' ],
	} ),
	p( {
		id: 'lens.bloom.enabled', label: 'Bloom', type: 'bool', default: false, structural: true, cost: { ...MEDIUM, fpe: 2.5 },
		learn: {
			what: 'Light bleeding around bright areas, computed from the HDR image before tone mapping.',
			why: 'The eye and cameras see glare around bright lights. Bloom makes emissive things and the sun read as bright, not just white.',
			avoid: 'Bloom on everything (low threshold): the image turns milky.',
		},
		brief: 'Bloom on HDR highlights.',
		tags: [ 'bloom', 'glow' ],
	} ),
	p( {
		id: 'lens.bloom.strength', label: 'Bloom strength', type: 'float', min: 0, max: 3, step: 0.01, default: 0.4, neutral: 0, enabledBy: 'lens.bloom.enabled',
		learn: { what: 'How much glow is added.', why: 'Subtle values add warmth; strong ones give a dreamy look.', typical: '0.15–0.5.' },
		brief: 'Bloom strength {value}.',
		tags: [ 'bloom' ],
	} ),
	p( {
		id: 'lens.bloom.radius', label: 'Bloom radius', type: 'float', min: 0, max: 1, step: 0.01, default: 0.4, enabledBy: 'lens.bloom.enabled',
		learn: { what: 'How far the glow spreads.', why: 'Wide glow reads as haze, tight glow as crisp highlights.' },
		brief: 'Bloom radius {value}.',
		tags: [ 'bloom' ],
	} ),
	p( {
		id: 'lens.bloom.threshold', label: 'Bloom threshold', type: 'float', min: 0, max: 2, step: 0.01, default: 0.9, enabledBy: 'lens.bloom.enabled',
		learn: { what: 'Brightness above which pixels glow (in HDR luminance).', why: 'A high threshold keeps the glow to light sources, so it stays meaningful.', typical: '0.7–1.' },
		brief: 'Bloom threshold {value}.',
		tags: [ 'bloom' ],
	} ),
	p( {
		id: 'lens.vignette.amount', label: 'Vignette', type: 'float', min: 0, max: 1, step: 0.01, default: 0,
		learn: {
			what: 'Darkens the corners of the frame.',
			why: 'It pulls the eye toward the center, where the subject usually is, and frames the image like an old lens.',
			typical: '0.08–0.25.',
			avoid: 'Heavy vignettes on gameplay cameras: they hide information at the edges.',
		},
		brief: 'Vignette {value}.',
		tags: [ 'vignette', 'focus' ],
	} ),
	p( {
		id: 'lens.vignette.softness', label: 'Vignette softness', type: 'float', min: 0.05, max: 1, step: 0.01, default: 0.5,
		learn: { what: 'How gradually the vignette fades in.', why: 'Soft vignettes go unnoticed but still guide the eye.' },
		brief: 'Vignette softness {value}.',
		tags: [ 'vignette' ],
	} ),
	p( {
		id: 'lens.vignette.roundness', label: 'Vignette roundness', type: 'float', min: 0, max: 1, step: 0.01, default: 1,
		learn: { what: '1 makes a circle; 0 follows the frame\'s aspect ratio.', why: 'A round vignette feels like a lens; a frame-shaped one feels like a print border.' },
		brief: 'Vignette roundness {value}.',
		tags: [ 'vignette' ],
	} ),
	p( {
		id: 'lens.vignette.color', label: 'Vignette color', type: 'color', default: '#000000',
		learn: { what: 'The color the corners fade toward.', why: 'A tinted vignette (warm brown, deep blue) frames without killing the palette.' },
		brief: 'Vignette color {value}.',
		tags: [ 'vignette', 'color' ],
	} ),
];
