import { param, CHEAP, MEDIUM } from './define.js';

const p = ( e ) => param( 'retro', e );

export default [
	p( {
		id: 'retro.pixel.enabled', label: 'Pixelation', type: 'bool', default: false, structural: true, requires: [ 'depth', 'normal' ], cost: { ...CHEAP, fpe: 0.05 },
		learn: {
			what: 'Renders the styled scene at a low internal resolution and shows it with hard, square pixels. The pixels stay locked to a grid while the camera moves.',
			why: 'Big pixels turn simple 3D into pixel art: the eye fills in the detail, and every shape reads at a glance. It also saves most of the GPU cost.',
			avoid: 'Mixing it with modern blur (depth of field, motion blur): pick one era.',
		},
		brief: 'Low internal resolution with nearest-neighbor pixels, grid-locked.',
		tags: [ 'retro', 'pixel art', 'resolution', 'phone-safe' ],
	} ),
	p( {
		id: 'retro.pixel.height', label: 'Pixel rows', type: 'int', min: 64, max: 540, step: 1, unit: 'px', default: 240, enabledBy: 'retro.pixel.enabled',
		learn: {
			what: 'How many pixel rows fill the screen height. Pixels are whole screen pixels wide, so the real count rounds to fit your screen.',
			why: 'Era matters: 144 rows is a handheld, 224–240 is a 16-bit or 32-bit console, 360 is a modern pixel-art game.',
			typical: '240 (PS1), 224–270 (16-bit), 144 (Game Boy).',
		},
		brief: 'About {value} pixel rows on screen (pixel size = output height / {value}, rounded).',
		tags: [ 'pixel art', 'resolution' ],
	} ),
	p( {
		id: 'retro.pixel.edges', label: 'Pixel edge highlights', type: 'float', min: 0, max: 1, step: 0.01, default: 0.35, neutral: 0, enabledBy: 'retro.pixel.enabled',
		learn: {
			what: 'Lightens pixels on outer edges and darkens pixels at depth steps, one pixel wide.',
			why: 'Pixel artists outline and highlight shapes by hand so they read at tiny sizes. Edge highlights do it from the depth and normals.',
		},
		brief: 'One-pixel edge highlights at {value}.',
		tags: [ 'pixel art', 'edges' ],
	} ),
	p( {
		id: 'retro.quantize.mode', label: 'Color depth', type: 'enum', default: 'off', structural: true, cost: { ...MEDIUM, fpe: 0.3 },
		options: [ { value: 'off', label: 'Full color' }, { value: 'posterize', label: 'Posterize (levels per channel)' }, { value: 'palette', label: 'Palette (nearest color)' } ],
		learn: {
			what: 'Limits the final image to a few levels per channel, or to the nearest colors of a fixed palette (matched in OKLab, so the nearest color is the one that looks closest).',
			why: 'Old hardware could show only a few colors at once. A small palette is also the most direct way to force a coherent look.',
		},
		brief: 'Color depth: {label}.',
		tags: [ 'retro', 'posterize', 'palette', 'quantize' ],
	} ),
	p( {
		id: 'retro.quantize.levels', label: 'Levels per channel', type: 'int', min: 2, max: 32, step: 1, default: 8,
		learn: { what: 'Levels per color channel when posterizing. 32 is 15-bit color (PS1), 16 is 12-bit, 4–6 is posterized art.', why: 'Fewer levels make banding a deliberate style, especially with dithering between the bands.' },
		brief: '{value} levels per channel.',
		tags: [ 'posterize' ],
	} ),
	p( {
		id: 'retro.quantize.palette', label: 'Palette', type: 'enum', default: 'pico8',
		options: [
			{ value: 'pico8', label: 'PICO-8 (16)' },
			{ value: 'gameboy', label: 'Game Boy (4 greens)' },
			{ value: 'cga', label: 'CGA (4)' },
			{ value: 'nes', label: 'NES-like (16)' },
			{ value: 'onebit', label: '1-bit (2 inks)' },
			{ value: 'look', label: 'The look\'s palette' },
		],
		learn: { what: 'The colors the palette mode snaps to.', why: 'Famous palettes are instantly recognizable; "the look\'s palette" reuses the palette module\'s colors for the whole image.' },
		brief: 'Palette: {label}.',
		tags: [ 'palette', 'retro' ],
	} ),
	p( {
		id: 'retro.dither.amount', label: 'Dithering', type: 'float', min: 0, max: 1.5, step: 0.01, default: 0.6, neutral: 0,
		learn: {
			what: 'Adds an ordered pattern before quantizing, so in-between colors become a checker of the two nearest ones.',
			why: 'Dithering fakes more colors than the palette has and turns banding into texture. It is the signature of 8- and 16-bit art and of 1-bit games.',
		},
		brief: 'Ordered dithering at {value}.',
		tags: [ 'dither', 'retro' ],
	} ),
	p( {
		id: 'retro.dither.pattern', label: 'Dither pattern', type: 'enum', default: 'bayer4',
		options: [ { value: 'bayer2', label: 'Bayer 2×2' }, { value: 'bayer4', label: 'Bayer 4×4' }, { value: 'bayer8', label: 'Bayer 8×8' }, { value: 'bayer16', label: 'Bayer 16×16' }, { value: 'noise', label: 'Blue-ish noise (interleaved gradient)' } ],
		learn: { what: 'The pattern used to dither.', why: 'Bayer gives the classic cross-hatched grid; noise looks organic and hides the grid.' },
		brief: 'Dither pattern: {label}.',
		tags: [ 'dither' ],
	} ),
	p( {
		id: 'retro.vertexSnap.enabled', label: 'Vertex snapping', type: 'bool', default: false, structural: true, scope: 'both',
		learn: {
			what: 'Snaps every vertex to a coarse screen grid, so polygons jitter and wobble as they move: the PS1 look.',
			why: 'Fifth-generation consoles had no sub-pixel precision. The jitter is nostalgic and makes 3D feel hand-made and unstable in a charming way.',
			avoid: 'Combining it with modern smooth effects (DOF, motion blur).',
		},
		brief: 'Vertices snapped to a coarse screen grid (PS1 jitter).',
		tags: [ 'retro', 'ps1', 'jitter' ],
	} ),
	p( {
		id: 'retro.vertexSnap.grid', label: 'Snap grid rows', type: 'int', min: 40, max: 480, step: 1, default: 120, scope: 'both', enabledBy: 'retro.vertexSnap.enabled',
		learn: { what: 'How many grid rows the screen height is divided into for snapping.', why: 'Coarser grids jitter more. 120 rows matches the PS1\'s typical precision at 240p.' },
		brief: 'Snap grid of {value} rows.',
		tags: [ 'ps1' ],
	} ),
	p( {
		id: 'retro.crt.enabled', label: 'CRT', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Simulates a tube TV: scanlines, an RGB shadow mask, a curved screen, glow and a little flicker.',
			why: 'Pixel art was designed for CRTs, which blur and bloom pixels into softer shapes. The simulation brings back that warmth and the arcade context.',
		},
		brief: 'CRT display simulation.',
		tags: [ 'retro', 'crt', 'arcade', 'display' ],
	} ),
	p( {
		id: 'retro.crt.scanlines', label: 'Scanlines', type: 'float', min: 0, max: 1, step: 0.01, default: 0.35, neutral: 0, enabledBy: 'retro.crt.enabled',
		learn: { what: 'Dark gaps between rows, one per pixel row in pixel looks.', why: 'Scanlines are the most recognizable CRT trait.' },
		brief: 'Scanlines {value}.',
		tags: [ 'crt' ],
	} ),
	p( {
		id: 'retro.crt.mask', label: 'Shadow mask', type: 'float', min: 0, max: 1, step: 0.01, default: 0.2, neutral: 0, enabledBy: 'retro.crt.enabled',
		learn: { what: 'The red, green and blue stripes of the tube\'s phosphors.', why: 'Visible up close, it adds texture; keep it low at small sizes or it turns into moiré.' },
		brief: 'Aperture mask {value}.',
		tags: [ 'crt' ],
	} ),
	p( {
		id: 'retro.crt.curvature', label: 'Screen curvature', type: 'float', min: 0, max: 0.3, step: 0.005, default: 0.06, neutral: 0, enabledBy: 'retro.crt.enabled',
		learn: { what: 'Bulges the image like a curved glass tube, with dark rounded corners.', why: 'Curvature frames the image as an object, a TV in a room.' },
		brief: 'Curvature {value}.',
		tags: [ 'crt' ],
	} ),
	p( {
		id: 'retro.crt.glow', label: 'Phosphor glow', type: 'float', min: 0, max: 1, step: 0.01, default: 0.2, neutral: 0, enabledBy: 'retro.crt.enabled',
		learn: { what: 'Bright pixels bleed light into their neighbors.', why: 'The glow softens hard pixel edges the way a real tube did.' },
		brief: 'Phosphor glow {value}.',
		tags: [ 'crt' ],
	} ),
	p( {
		id: 'retro.crt.flicker', label: 'Flicker', type: 'float', min: 0, max: 0.2, step: 0.005, default: 0.02, neutral: 0, enabledBy: 'retro.crt.enabled',
		learn: { what: 'A subtle brightness flicker over time.', why: 'A touch of instability sells the hardware. Keep it low: strong flicker is uncomfortable and an accessibility problem.' },
		brief: 'Flicker {value}.',
		tags: [ 'crt', 'motion' ],
	} ),
	// P2 (M10): VHS, texture filtering emulation, affine texture warp.
	p( {
		id: 'retro.vhs.enabled', label: 'VHS', type: 'bool', default: false, structural: true, cost: { ...MEDIUM, fpe: 0.8 },
		learn: {
			what: 'Imitates a worn videotape: color bleeds sideways, the picture shakes and tears where the tracking slips, and bands of noise roll through.',
			why: 'VHS is the texture of home video in the 80s and 90s: found footage, analog horror, retrowave. Its flaws date an image as surely as a palette does.',
			avoid: 'Strong tracking jitter during gameplay: it moves the whole image under the player.',
		},
		brief: 'VHS tape simulation.',
		tags: [ 'retro', 'vhs', 'analog', 'horror', 'display' ],
	} ),
	p( {
		id: 'retro.vhs.bleed', label: 'Chroma bleed', type: 'float', min: 0, max: 1, step: 0.01, default: 0.5, neutral: 0, enabledBy: 'retro.vhs.enabled',
		learn: { what: 'How far color smears sideways from the edges. Tape stores color at a fraction of the brightness resolution.', why: 'Smeared color with sharp brightness is the single most recognizable VHS trait.' },
		brief: 'Chroma bleed {value}.',
		tags: [ 'vhs' ],
	} ),
	p( {
		id: 'retro.vhs.noise', label: 'Tape noise', type: 'float', min: 0, max: 1, step: 0.01, default: 0.3, neutral: 0, enabledBy: 'retro.vhs.enabled',
		learn: { what: 'Snow and a rolling band of noise.', why: 'Noise says the tape has been played many times.' },
		brief: 'Tape noise {value}.',
		tags: [ 'vhs' ],
	} ),
	p( {
		id: 'retro.vhs.jitter', label: 'Tracking jitter', type: 'float', min: 0, max: 1, step: 0.01, default: 0.3, neutral: 0, enabledBy: 'retro.vhs.enabled',
		learn: { what: 'Rows of the picture slip sideways, most in a tear near the bottom of the frame.', why: 'Tracking errors make the image feel physical and fragile.' },
		brief: 'Tracking jitter {value}.',
		tags: [ 'vhs' ],
	} ),
	p( {
		id: 'retro.texture.filter', scope: 'both', label: 'Texture filtering', type: 'enum', default: 'bilinear', structural: true,
		options: [
			{ value: 'bilinear', label: 'Bilinear (smooth)' },
			{ value: 'nearest', label: 'Nearest (PS1, blocky texels)' },
			{ value: 'n64', label: 'N64 three-point' },
		],
		learn: {
			what: 'How textures are sampled up close: smooth bilinear, blocky nearest-neighbor texels (PS1), or the N64\'s three-point filter, which blends only three texels and leaves faint diamond shapes.',
			why: 'Texture filtering is a hardware signature: crunchy texels say PlayStation, soft wobbly blending says N64. Only textured surfaces show it (imported models, the alley\'s bricks and cobbles).',
			avoid: 'Nearest filtering on detailed, high-resolution textures far away: they shimmer as the camera moves.',
		},
		brief: 'Texture filtering: {label}.',
		tags: [ 'retro', 'ps1', 'n64', 'texture', 'filtering' ],
	} ),
	p( {
		id: 'retro.affine.enabled', scope: 'both', label: 'Affine texture warp', type: 'bool', default: false, structural: true, cost: CHEAP,
		learn: {
			what: 'Interpolates texture coordinates without perspective correction, like the PS1: textures bend along triangle edges and swim as the camera moves.',
			why: 'The PS1 had no perspective-correct texturing, so its walls and floors warp. Together with vertex snapping it is the core of the PS1 look. Only textured surfaces show it.',
			avoid: 'Big, single-triangle floors close to the camera if you want it subtle: the warp grows with the triangle size.',
		},
		brief: 'Affine (perspective-incorrect) texture mapping, as on the PS1.',
		tags: [ 'retro', 'ps1', 'texture', 'warp' ],
	} ),
	p( {
		id: 'retro.affine.amount', scope: 'both', label: 'Warp amount', type: 'float', min: 0, max: 1, step: 0.01, default: 1, neutral: 0, enabledBy: 'retro.affine.enabled',
		learn: { what: 'Blends between perspective-correct (0) and fully affine (1) texture coordinates.', why: 'Full warp is authentic; half keeps the wobble without making floors unreadable.' },
		brief: 'Affine warp {value}.',
		tags: [ 'ps1' ],
	} ),
];
