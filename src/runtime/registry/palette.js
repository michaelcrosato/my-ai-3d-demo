import { param } from './define.js';

const p = ( e ) => param( 'palette', { scope: 'both', ...e } );

export default [
	p( {
		id: 'palette.saturation', label: 'Saturation', type: 'float', min: 0, max: 2, step: 0.01, default: 1,
		learn: {
			what: 'Scales the colorfulness of the base colors (in OKLCH chroma), before lighting.',
			why: 'Changing the paint rather than the photo keeps lit and shadowed tones consistent. It can also be set per part, for example saturated characters on a calmer background.',
			typical: '1.1–1.35 for cartoon styles.',
		},
		brief: 'Base colors at {value}× saturation.',
		tags: [ 'color', 'saturation' ],
	} ),
	p( {
		id: 'palette.value', label: 'Value (lightness)', type: 'float', min: 0.3, max: 1.7, step: 0.01, default: 1,
		learn: {
			what: 'Scales the lightness of the base colors.',
			why: 'Value (light vs. dark) carries the structure of an image. Raising it gives a high-key, airy style; lowering it gives weight and mood.',
		},
		brief: 'Base color lightness ×{value}.',
		tags: [ 'color', 'value' ],
	} ),
	p( {
		id: 'palette.hue', label: 'Hue shift', type: 'angle', min: - 180, max: 180, step: 1, unit: '°', default: 0,
		learn: {
			what: 'Rotates the hue of every base color.',
			why: 'Useful for quick palette variations, such as an alternative season or a corrupted area of a level.',
		},
		brief: 'Base hues rotated {value}°.',
		tags: [ 'color', 'hue' ],
	} ),
	p( {
		id: 'palette.tint', label: 'Tint color', type: 'color', default: '#ffffff',
		learn: {
			what: 'A color that every base color of the part is pushed toward.',
			why: 'Unifies a part into one color family, such as a single sea blue for all water.',
		},
		brief: 'Base colors tinted toward {value}.',
		tags: [ 'color' ],
	} ),
	p( {
		id: 'palette.tintAmount', label: 'Tint amount', type: 'float', min: 0, max: 1, step: 0.01, default: 0,
		learn: {
			what: 'How far base colors move toward the tint color (mixed in OKLab).',
			why: 'A little tint harmonizes colors that were picked independently; a lot replaces them.',
		},
		brief: 'Tint amount {value}.',
		tags: [ 'color', 'harmony' ],
	} ),
	p( {
		id: 'palette.remap', label: 'Palette remap', type: 'float', min: 0, max: 1, step: 0.01, default: 0,
		learn: {
			what: 'Snaps every base color to the nearest color of the look\'s palette.',
			why: 'A small, deliberate palette is the hallmark of strong art direction. Remapping forces scattered "programmer colors" into a designed set.',
			typical: '1 for graphic styles with a fixed palette.',
		},
		brief: 'Base colors remapped to the palette (amount {value}).',
		tags: [ 'color', 'palette', 'harmony' ],
	} ),
	p( {
		id: 'palette.colors', label: 'Palette', type: 'palette', default: [],
		learn: {
			what: 'The set of colors that palette remap snaps to.',
			why: 'Limiting a scene to 5–8 colors gives it a recognizable identity.',
		},
		brief: 'Palette: {value}.',
		tags: [ 'palette' ],
	} ),
	p( {
		id: 'palette.keepValue', label: 'Keep value when remapping', type: 'bool', default: true,
		learn: {
			what: 'When remapping, keeps part of each object\'s original lightness instead of taking the palette color\'s.',
			why: 'Keeps the light and dark structure of the scene while the hues change, so it still reads.',
		},
		brief: 'Remap keeps the original lightness.',
		tags: [ 'palette', 'value' ],
	} ),
];
