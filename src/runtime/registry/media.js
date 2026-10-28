import { param, CHEAP, MEDIUM, HEAVY } from './define.js';

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
	p( {
		id: 'media.kuwahara.enabled', scope: 'mask', label: 'Painterly (Kuwahara)', type: 'bool', default: false, structural: true, cost: HEAVY,
		learn: {
			what: 'An edge-preserving smoothing filter: each pixel takes the average color of the calmest neighborhood around it, so flat areas become brush-like patches while edges stay sharp.',
			why: 'Painters simplify: they describe a surface with a few strokes of nearly flat color. Kuwahara does the same to a render, which hides the geometry\'s regularity and reads as hand-painted.',
			avoid: 'Combining it with another medium (halftone, hatching, watercolor): two media read as noise. On phones, use a small radius at a lower render scale.',
		},
		brief: 'Kuwahara (painterly) filter.',
		tags: [ 'painterly', 'kuwahara', 'paint', 'media' ],
	} ),
	p( {
		id: 'media.kuwahara.radius', label: 'Brush size', type: 'int', min: 1, max: 8, step: 1, unit: 'px@1080p', default: 4, enabledBy: 'media.kuwahara.enabled',
		learn: { what: 'The filter radius: how big the paint patches get, in pixels at 1080p.', why: 'Bigger brushes simplify more, like a looser painting; cost grows with the square of the radius.', typical: '3–5.' },
		brief: 'Kuwahara radius {value} px at 1080p.',
		tags: [ 'kuwahara' ],
	} ),
	p( {
		id: 'media.kuwahara.sharpness', label: 'Stroke sharpness', type: 'float', min: 1, max: 16, step: 0.5, default: 8, enabledBy: 'media.kuwahara.enabled',
		learn: { what: 'How strongly the calmest neighborhood wins. High values give crisp, flat strokes; low values blend them softly.', why: 'Crisp strokes read as oil or gouache; soft ones as a dreamy blur.' },
		brief: 'Stroke sharpness {value}.',
		tags: [ 'kuwahara' ],
	} ),
	p( {
		id: 'media.watercolor.enabled', scope: 'mask', label: 'Watercolor', type: 'bool', default: false, structural: true, cost: MEDIUM,
		learn: {
			what: 'Imitates watercolor on paper: pigment pools and darkens at the edges of each shape, granulates in the dips of the paper, and the image wobbles and bleeds slightly.',
			why: 'Edge darkening is watercolor\'s signature: water carries pigment to the rim of a wet area as it dries. A render with darker rims and soft bleeds reads as painted.',
			avoid: 'Strong lines on top: real watercolor has no ink outlines (unless it\'s pen and wash).',
		},
		brief: 'Watercolor simulation (edge darkening, granulation, wobble, bleed).',
		tags: [ 'watercolor', 'paint', 'media' ],
	} ),
	p( {
		id: 'media.watercolor.edges', label: 'Edge darkening', type: 'float', min: 0, max: 1, step: 0.01, default: 0.45, neutral: 0, enabledBy: 'media.watercolor.enabled',
		learn: { what: 'How much pigment pools at the edges of color areas.', why: 'The darker rim is what makes a shape read as a watercolor wash.' },
		brief: 'Edge darkening {value}.',
		tags: [ 'watercolor' ],
	} ),
	p( {
		id: 'media.watercolor.granulation', label: 'Granulation', type: 'float', min: 0, max: 1, step: 0.01, default: 0.35, neutral: 0, enabledBy: 'media.watercolor.enabled',
		learn: { what: 'Pigment settling into the paper\'s texture, strongest in darker washes.', why: 'Granulation is the grain of real pigment; it makes flat color feel physical.' },
		brief: 'Granulation {value}.',
		tags: [ 'watercolor', 'texture' ],
	} ),
	p( {
		id: 'media.watercolor.wobble', label: 'Wobble', type: 'float', min: 0, max: 8, step: 0.1, unit: 'px@1080p', default: 2.5, neutral: 0, enabledBy: 'media.watercolor.enabled',
		learn: { what: 'Irregular displacement of the image, as if painted by hand.', why: 'Hand-painted edges are never perfectly straight.' },
		brief: 'Hand wobble {value} px at 1080p.',
		tags: [ 'watercolor' ],
	} ),
	p( {
		id: 'media.watercolor.bleed', label: 'Bleed', type: 'float', min: 0, max: 1, step: 0.01, default: 0.3, neutral: 0, enabledBy: 'media.watercolor.enabled',
		learn: { what: 'Colors softly running into each other.', why: 'Wet-in-wet bleeding gives watercolor its loose, luminous feel.' },
		brief: 'Color bleed {value}.',
		tags: [ 'watercolor' ],
	} ),
	p( {
		id: 'media.halftone.enabled', scope: 'mask', label: 'Halftone (print)', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Rebuilds the image from dots whose size follows the tone, like printing. Mono uses one ink; CMYK prints four rotated screens of cyan, magenta, yellow and black.',
			why: 'Visible print dots (Ben-Day dots) are the texture of comics and pop art: they say "printed page".',
			avoid: 'Very small dots on small screens: they turn into moiré. Keep dots at least 4 px at 1080p.',
		},
		brief: 'Halftone print screen.',
		tags: [ 'halftone', 'comic', 'print', 'media' ],
	} ),
	p( {
		id: 'media.halftone.mode', label: 'Halftone inks', type: 'enum', default: 'mono', structural: true, enabledBy: 'media.halftone.enabled',
		options: [ { value: 'mono', label: 'Mono (one ink)' }, { value: 'cmyk', label: 'CMYK (four screens)' } ],
		learn: { what: 'One ink over paper, or the four process colors.', why: 'Mono halftone is pop-art shading; CMYK reproduces the full image like a magazine.' },
		brief: 'Halftone: {label}.',
		tags: [ 'halftone', 'cmyk' ],
	} ),
	p( {
		id: 'media.halftone.size', label: 'Dot size', type: 'float', min: 2, max: 24, step: 0.5, unit: 'px@1080p', default: 7, enabledBy: 'media.halftone.enabled',
		learn: { what: 'Distance between dot centers, in pixels at 1080p.', why: 'Big dots are bold and graphic; small dots read as fine print.' },
		brief: 'Halftone cells {value} px at 1080p.',
		tags: [ 'halftone' ],
	} ),
	p( {
		id: 'media.halftone.angle', label: 'Screen angle', type: 'angle', min: - 90, max: 90, step: 1, unit: '°', default: 45, enabledBy: 'media.halftone.enabled',
		learn: { what: 'Rotation of the dot grid. In CMYK the other inks use their classic offsets from it (15°, 75°, 0°).', why: '45° hides the grid from the eye best, which is why black ink traditionally uses it.' },
		brief: 'Screen angle {value}°.',
		tags: [ 'halftone' ],
	} ),
	p( {
		id: 'media.halftone.shadows', label: 'Dots in shadows only', type: 'float', min: 0, max: 1, step: 0.01, default: 0,
		enabledBy: 'media.halftone.enabled',
		learn: { what: '0 prints dots everywhere; higher values keep the light tones clean and only screen the shadows.', why: 'Comic colorists often screen only the shadows, so the lit shapes stay flat and bright.' },
		brief: 'Dots limited to shadows (amount {value}).',
		tags: [ 'halftone', 'comic' ],
	} ),
	p( {
		id: 'media.halftone.amount', label: 'Halftone amount', type: 'float', min: 0, max: 1, step: 0.01, default: 1, neutral: 0, enabledBy: 'media.halftone.enabled',
		learn: { what: 'Blends between the image and its halftone version.', why: 'A partial halftone keeps the colors while adding the print texture.' },
		brief: 'Halftone at {value}.',
		tags: [ 'halftone' ],
	} ),
	p( {
		id: 'media.halftone.ink', label: 'Dot ink', type: 'color', default: '#15131c', enabledBy: 'media.halftone.enabled',
		learn: { what: 'The ink color of mono halftone.', why: 'A dark blue or brown ink is softer than black and still reads as print.' },
		brief: 'Halftone ink {value}.',
		tags: [ 'halftone', 'color' ],
	} ),
	p( {
		id: 'media.hatching.enabled', scope: 'mask', label: 'Hatching (post)', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Draws parallel pen lines wherever the image is dark; darker tones add more layers at other angles (cross-hatching).',
			why: 'Engravers and comic inkers build tone from lines instead of gray. Hatching makes a render read as drawn.',
			avoid: 'Hatching on top of halftone or painterly filters: pick one medium.',
		},
		brief: 'Hatching in the dark tones.',
		tags: [ 'hatching', 'ink', 'sketch', 'media' ],
	} ),
	p( {
		id: 'media.hatching.layers', label: 'Hatch layers', type: 'int', min: 1, max: 4, step: 1, default: 3, enabledBy: 'media.hatching.enabled',
		learn: { what: 'How many crossing layers the darkest tones get.', why: 'One layer is light shading; three or four is dense engraving.' },
		brief: 'Up to {value} hatch layers.',
		tags: [ 'hatching' ],
	} ),
	p( {
		id: 'media.hatching.spacing', label: 'Line spacing', type: 'float', min: 2, max: 24, step: 0.5, unit: 'px@1080p', default: 6, enabledBy: 'media.hatching.enabled',
		learn: { what: 'Distance between hatch lines, in pixels at 1080p.', why: 'Tight lines read as fine pen work, wide ones as bold marker.' },
		brief: 'Hatch spacing {value} px at 1080p.',
		tags: [ 'hatching' ],
	} ),
	p( {
		id: 'media.hatching.angle', label: 'Hatch angle', type: 'angle', min: - 90, max: 90, step: 1, unit: '°', default: 45, enabledBy: 'media.hatching.enabled',
		learn: { what: 'Angle of the first layer; the next layers cross it.', why: 'Right-handed artists naturally hatch at about 45°, bottom-left to top-right.' },
		brief: 'First hatch layer at {value}°.',
		tags: [ 'hatching' ],
	} ),
	p( {
		id: 'media.hatching.threshold', label: 'Hatch threshold', type: 'float', min: 0.05, max: 1, step: 0.01, default: 0.55, enabledBy: 'media.hatching.enabled',
		learn: { what: 'Brightness below which the first layer of lines appears.', why: 'A low threshold keeps hatching in the deep shadows; a high one hatches most of the image.' },
		brief: 'Hatching below brightness {value}.',
		tags: [ 'hatching' ],
	} ),
	p( {
		id: 'media.hatching.amount', label: 'Hatch strength', type: 'float', min: 0, max: 1, step: 0.01, default: 0.85, neutral: 0, enabledBy: 'media.hatching.enabled',
		learn: { what: 'How dark the hatch lines are.', why: 'Light hatching adds texture; full strength draws solid ink lines.' },
		brief: 'Hatch strength {value}.',
		tags: [ 'hatching' ],
	} ),
	p( {
		id: 'media.hatching.color', label: 'Hatch ink', type: 'color', default: '#1d1a24', enabledBy: 'media.hatching.enabled',
		learn: { what: 'The color of the hatch lines.', why: 'Graphite gray reads as pencil; near-black as ink.' },
		brief: 'Hatch ink {value}.',
		tags: [ 'hatching', 'color' ],
	} ),
	p( {
		id: 'media.misregistration.enabled', label: 'Print misregistration', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Offsets the color plates slightly, as when a printing press is out of alignment.',
			why: 'Cheap comics and screen prints are never perfectly aligned; the colored fringes sell the printed look.',
		},
		brief: 'CMYK plate misregistration.',
		tags: [ 'print', 'comic', 'media' ],
	} ),
	p( {
		id: 'media.misregistration.offset', label: 'Plate offset', type: 'float', min: 0, max: 8, step: 0.1, unit: 'px@1080p', default: 1.2, neutral: 0, enabledBy: 'media.misregistration.enabled',
		learn: { what: 'How far the plates are out of alignment.', why: '1–2 px is believable; more is a deliberate pop-art statement.' },
		brief: 'Plates offset {value} px at 1080p.',
		tags: [ 'print' ],
	} ),
	p( {
		id: 'media.misregistration.angle', label: 'Offset direction', type: 'angle', min: - 180, max: 180, step: 1, unit: '°', default: 30, enabledBy: 'media.misregistration.enabled',
		learn: { what: 'Direction of the offset.', why: 'Diagonal offsets show on both horizontal and vertical edges.' },
		brief: 'Offset at {value}°.',
		tags: [ 'print' ],
	} ),
	p( {
		id: 'media.paper.enabled', scope: 'mask', label: 'Paper', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Prints the image onto a paper or canvas texture: the color is multiplied by the paper, so ink and paint take on its grain.',
			why: 'A medium needs a surface. Paper texture turns a clean digital image into an object, and ties lines and paint together.',
		},
		brief: 'Paper texture under the image.',
		tags: [ 'paper', 'texture', 'media' ],
	} ),
	p( {
		id: 'media.paper.type', label: 'Paper type', type: 'enum', default: 'newsprint', enabledBy: 'media.paper.enabled',
		options: [ { value: 'newsprint', label: 'Newsprint' }, { value: 'watercolor', label: 'Watercolor (cold press)' }, { value: 'canvas', label: 'Canvas' }, { value: 'kraft', label: 'Kraft' } ],
		learn: { what: 'Which surface: smooth newsprint fibers, bumpy cold-press, woven canvas, or brown kraft.', why: 'Each medium belongs to its surface: comics to newsprint, washes to cold-press, oils to canvas.' },
		brief: 'Paper: {label}.',
		tags: [ 'paper' ],
	} ),
	p( {
		id: 'media.paper.color', label: 'Paper color', type: 'color', default: '#f3ead3', enabledBy: 'media.paper.enabled',
		learn: { what: 'The paper tint the image is printed on.', why: 'Off-white paper warms every color slightly and lifts the blacks, like real print.' },
		brief: 'Paper color {value}.',
		tags: [ 'paper', 'color' ],
	} ),
	p( {
		id: 'media.paper.strength', label: 'Paper strength', type: 'float', min: 0, max: 1, step: 0.01, default: 0.4, neutral: 0, enabledBy: 'media.paper.enabled',
		learn: { what: 'How visible the paper texture and tint are.', why: 'Subtle paper adds tactility without fighting the image.' },
		brief: 'Paper strength {value}.',
		tags: [ 'paper' ],
	} ),
	p( {
		id: 'media.paper.scale', label: 'Paper grain size', type: 'float', min: 0.25, max: 4, step: 0.05, unit: '×', default: 1, enabledBy: 'media.paper.enabled',
		learn: { what: 'Size of the paper grain.', why: 'Match it to the medium: fine for pen, coarse for paint.' },
		brief: 'Paper grain ×{value}.',
		tags: [ 'paper' ],
	} ),
];
