// Effect cards (design §6.13): the full card for every registry parameter. The registry
// holds what / why (and some avoid / typical); this file adds, per effect group, where it
// is seen, when to use it and when to avoid it. Typical values come from the look library
// (the range the built-in looks use), and "Try this" is a one-click micro-experiment.

import { REGISTRY, valueLabel } from '../runtime/registry/index.js';
import { LOOKS } from './looks/index.js';

/** Per group (the first two id segments): seen in, use when, avoid when. */
export const GROUP_LEARN = {
	'lighting.key': { seenIn: 'Every game; low and warm in Firewatch, high and white in Animal Crossing', use: 'to set time of day and where shadows fall', avoid: 'lighting straight from the camera: it flattens every form' },
	'lighting.ambient': { seenIn: 'Hemisphere fill in most stylized games (Zelda: Breath of the Wild, Fortnite)', use: 'to color the shadow side: sky blue above, warm bounce below', avoid: 'so much ambient that the light direction disappears' },
	'lighting.shadows': { seenIn: 'Most 3D games; hard, simple shadows in cel-shaded ones', use: 'to ground objects and show form', avoid: 'soft, noisy shadows in a graphic look' },
	'lighting.tod': { seenIn: 'Open-world day cycles (Zelda, A Short Hike)', use: 'to move sun, sky, ambient and fog together from one hour value', avoid: 'mixing it with hand-set sky colors you want to keep (overrides win)' },
	'lighting.practicals': { seenIn: 'Torchlit dungeons (Hades, Diablo), campfires', use: 'for warm local pools of light in dark scenes', avoid: 'heavy flicker: it reads as a bug, not fire' },
	'lighting.blob': { seenIn: 'Platformers (Mario, Crash), phone games', use: 'to ground characters cheaply and show where a jump will land', avoid: 'together with real shadows on the same object' },
	'lighting.ao': { seenIn: 'Realistic and dioramic looks (Townscaper, Tunic)', use: 'to darken creases and contacts so objects sit in the world', avoid: 'on phones (two extra passes) and in flat graphic looks' },
	'lighting.contact': { seenIn: 'Close-up character shots in modern games', use: 'for crisp small shadows where feet and props touch the ground', avoid: 'wide shots, where it is too small to see' },
	'surface.model': { seenIn: 'Toon: Wind Waker, Genshin Impact. Flat: Townscaper. PBR: most realistic games', use: 'as the first decision of a look: how light becomes tone', avoid: 'PBR when the geometry is blockout: realism exposes simple shapes' },
	'surface.bands': { seenIn: 'Two bands in classic cel animation; three to four in painterly games', use: 'to decide how graphic (fewer) or modeled (more) forms look', avoid: 'many bands with hard edges: it looks like posterization' },
	'surface.threshold': { seenIn: 'Cel-shaded games tune it per scene', use: 'to decide how much of each object is lit', avoid: 'extremes: almost all lit or all shadow loses the form' },
	'surface.softness': { seenIn: 'Hard in Jet Set Radio, soft in anime-style games', use: 'hard for graphic looks, soft for painterly or anime ones', avoid: 'soft edges with few bands: it reads as low-quality gradients' },
	'surface.shadowTint': { seenIn: 'Blue-violet shadows in Wind Waker; warm in sunset scenes', use: 'to color shadows opposite the light (cool shadow, warm light)', avoid: 'gray or black shadows in a colorful look' },
	'surface.shadowTintStrength': { seenIn: 'Strong in illustration-styled games', use: 'to set how much the shadow color replaces darkening', avoid: 'full strength in realistic looks' },
	'surface.spec': { seenIn: 'Toon highlights on hair and armor (Genshin Impact, Guilty Gear)', use: 'for a small hard highlight that shows material', avoid: 'on matte things like cloth, stone and foliage' },
	'surface.rim': { seenIn: 'Character rims in anime and fighting games', use: 'to separate characters from the background', avoid: 'rims on everything: the scene glows and loses depth' },
	'surface.flatNormals': { seenIn: 'Low-poly indie games (Monument Valley-style art, Townscaper)', use: 'to make facets part of the look', avoid: 'on smooth organic shapes like characters' },
	'surface.halftone': { seenIn: 'Comic-book games (Borderlands, Spider-Verse)', use: 'for print-style shading inside the materials', avoid: 'very small dots: they shimmer as the camera moves' },
	'surface.hatching': { seenIn: 'Ink and pencil styles (Return of the Obra Dinn-like, sketchbook games)', use: 'for pen-drawn shadows that follow the light', avoid: 'with another medium (halftone, painterly) at the same time' },
	'surface.dither': { seenIn: 'Return of the Obra Dinn', use: 'for 1-bit shading with patterned midtones', avoid: 'with grain: two noises fight' },
	'surface.variation': { seenIn: 'Painted looks and Tunic-like dioramas', use: 'to break up flat colors so surfaces feel handmade', avoid: 'large amounts in graphic looks: they look dirty' },
	'surface.gradient': { seenIn: 'Hand-painted games (darker near the ground)', use: 'to ground objects with a vertical value change', avoid: 'on small props, where it reads as a smudge' },
	'surface.water': { seenIn: 'Wind Waker, Sea of Thieves (stylized)', use: 'for readable water: depth as color bands, foam where it touches things', avoid: 'realistic reflections in a toon look' },
	'surface.wind': { seenIn: 'Grass and trees in Zelda: Breath of the Wild, Ghost of Tsushima', use: 'to make outdoor scenes feel alive', avoid: 'fast or strong sway: it reads as a storm' },
	'lines.hull': { seenIn: 'Most cel-shaded games for characters (Wind Waker, Guilty Gear)', use: 'for cheap, stable outlines on characters and props', avoid: 'on terrain and large flat surfaces (it shows seams)' },
	'lines.screen': { seenIn: 'Borderlands, Jet Set Radio, Hi-Fi Rush, Sable', use: 'for ink on everything, including inner folds and contacts', avoid: 'thin, crease-heavy lines on detailed geometry: they turn into noise' },
	'palette.saturation': { seenIn: 'High in Mario and Splatoon, low in Inside and Limbo', use: 'to set the overall color intensity', avoid: 'pushing it to fix a dull look: contrast and value usually fix it better' },
	'palette.value': { seenIn: 'High-key in Animal Crossing, low-key in horror', use: 'to move all base colors lighter or darker', avoid: 'very dark base colors with dark shadows: everything merges' },
	'palette.hue': { seenIn: 'Seasonal and mood variants of the same level', use: 'to rotate all colors for a variant', avoid: 'large shifts on skin tones' },
	'palette.tint': { seenIn: 'Mood washes in narrative games', use: 'to wash every base color toward one color', avoid: 'strong tints that remove the accent colors' },
	'palette.tintAmount': { seenIn: 'Mood washes in narrative games', use: 'together with the tint color', avoid: 'above about 0.4 unless monochrome is the point' },
	'palette.remap': { seenIn: 'Pixel-art and limited-palette games (PICO-8, Game Boy, Celeste)', use: 'to snap every color to a designed palette', avoid: 'palettes without a dark and a light color: contrast collapses' },
	'palette.colors': { seenIn: 'Every art bible starts with one', use: 'as the remap target and the colors the brief hands to agents', avoid: 'more than about 10 colors: it stops being a palette' },
	'palette.keepValue': { seenIn: 'Palette-limited looks that still need shading', use: 'to keep each surface\'s lightness while changing its hue', avoid: 'turning it off unless you want flat posterized color' },
	'atmosphere.fog': { seenIn: 'Firewatch (colored bands), Silent Hill (dense), most open worlds', use: 'for depth (atmospheric perspective) and to hide the far plane', avoid: 'fog that does not match the sky: every silhouette gets a halo' },
	'atmosphere.sky': { seenIn: 'Gradient skies in most stylized games', use: 'as the biggest single color area of outdoor shots', avoid: 'a flat single-color sky in a scene with fog' },
	'atmosphere.godRays': { seenIn: 'Forests and interiors with windows (Ori, Journey)', use: 'when the sun is in or near the frame', avoid: 'facing away from the sun (they have nothing to show)' },
	'atmosphere.heightFog': { seenIn: 'Morning valleys, swamps, dungeons', use: 'for fog that pools low while peaks stay clear', avoid: 'over flat open ground, where it reads as a solid layer' },
	'atmosphere.clouds': { seenIn: 'Wind Waker, Breath of the Wild', use: 'to fill a big sky with shapes and motion', avoid: 'high coverage in sunny looks: it reads as overcast' },
	'lens.fovScale': { seenIn: 'Wide in Jet Set Radio and racing games, narrow in tactics games', use: 'wide for speed and drama, narrow for calm and readability', avoid: 'very wide angles in third-person games: edges stretch' },
	'lens.bloom': { seenIn: 'Synthwave and fantasy games, Ori', use: 'to make light sources and highlights glow', avoid: 'high strength without tone mapping: highlights burn to white' },
	'lens.vignette': { seenIn: 'Cinematic and horror games', use: 'to frame the center and hold the eye', avoid: 'strong vignettes in bright, playful looks' },
	'lens.dof': { seenIn: 'Cinematic cutscenes, photo modes', use: 'to isolate a subject at a fixed focus distance', avoid: 'gameplay where the player must read the background, and phones' },
	'lens.tiltShift': { seenIn: 'Diorama and city builders (Townscaper, Cities: Skylines tilt-shift mods)', use: 'to make a scene look like a miniature', avoid: 'low cameras: the effect needs a high angle' },
	'lens.motionBlur': { seenIn: 'Racing and action games', use: 'to sell speed', avoid: 'stylized looks with stepped animation, and phones' },
	'lens.ca': { seenIn: 'VHS and glitch looks, horror', use: 'as a small analog imperfection', avoid: 'large amounts: text and edges become hard to read' },
	'lens.distortion': { seenIn: 'Fisheye skate videos (Jet Set Radio-like), CRT looks', use: 'for a camera with character', avoid: 'in UI-heavy screens' },
	'lens.letterbox': { seenIn: 'Cutscenes and cinematic games', use: 'to signal "this is a film moment"', avoid: 'during gameplay on narrow phone screens' },
	'grade.exposure': { seenIn: 'Every game, usually adjusted per scene', use: 'to set overall brightness before tone mapping', avoid: 'fixing a dark scene with exposure alone: add light instead' },
	'grade.toneMapping': { seenIn: 'ACES in many engines, AgX in Blender, Neutral for faithful colors', use: 'to roll highlights off smoothly', avoid: 'None with bloom or bright light' },
	'grade.temperature': { seenIn: 'Warm sunsets, cold night scenes', use: 'to set the mood temperature of the whole frame', avoid: 'extreme values that make skin tones sick' },
	'grade.tint': { seenIn: 'Green-magenta correction in film', use: 'for subtle green or magenta casts', avoid: 'visible casts unless they are the point' },
	'grade.contrast': { seenIn: 'High in graphic looks, low in pastel ones', use: 'to strengthen or soften the value structure', avoid: 'very high contrast with dark base colors: shadows crush' },
	'grade.saturation': { seenIn: 'Post saturation in most grades', use: 'for a final color intensity pass', avoid: 'stacking it with palette saturation (oversaturation)' },
	'grade.split': { seenIn: 'Teal-and-orange film grades', use: 'to tint shadows and highlights differently', avoid: 'strong split tones on a colorful toon palette' },
	'grade.lift': { seenIn: 'Faded film looks (raised blacks)', use: 'to lift or tint the shadows', avoid: 'lifted blacks in high-contrast looks' },
	'grade.gamma': { seenIn: 'Midtone grading in every film grade', use: 'to brighten or darken the midtones only', avoid: 'large moves: the image looks washed or muddy' },
	'grade.gain': { seenIn: 'Highlight grading in every film grade', use: 'to tint or scale the highlights', avoid: 'pushing highlights into clipping' },
	'grade.vibrance': { seenIn: 'Photo editing, subtle game grades', use: 'to boost dull colors more than already-saturated ones', avoid: 'on looks that rely on muted colors' },
	'grade.hue': { seenIn: 'Stylized night scenes, dreams', use: 'to rotate every color for a surreal variant', avoid: 'small shifts that just make skin look wrong' },
	'grade.selective': { seenIn: 'Sin City, Schindler\'s List (one color kept)', use: 'to keep one hue and desaturate the rest', avoid: 'a kept hue that appears everywhere (nothing stands out)' },
	'grade.lut': { seenIn: 'Most commercial games ship a grade LUT', use: 'for a complete film-style grade in one lookup', avoid: 'stacking a strong LUT on a strong manual grade' },
	'grade.gradientMap': { seenIn: 'Duotone posters, Limbo-like looks', use: 'to map value to a designed color ramp', avoid: 'ramps without a strong dark-to-light range' },
	'media.grain': { seenIn: 'Film looks, Left 4 Dead, Alien: Isolation', use: 'to hide banding and add texture', avoid: 'with dither or halftone: textures fight' },
	'media.kuwahara': { seenIn: 'Painterly games and filters (Okami-like painting looks)', use: 'to turn the render into brush strokes', avoid: 'large radii on phones (cost grows with the radius squared)' },
	'media.watercolor': { seenIn: 'Watercolor-styled games (Gris, Dordogne)', use: 'for pigment edges, granulation and bleed', avoid: 'with hard black ink and flat cel shading' },
	'media.halftone': { seenIn: 'Comic looks (Borderlands, Spider-Verse posters)', use: 'for print dots over the whole image', avoid: 'small dots at low resolution (moiré)' },
	'media.hatching': { seenIn: 'Ink-drawn games and engraving looks', use: 'for pen lines that darken shadows', avoid: 'with painterly or watercolor media' },
	'media.misregistration': { seenIn: 'Risograph and screen-print styles', use: 'for slightly misaligned print plates', avoid: 'large offsets on small text' },
	'media.paper': { seenIn: 'Storybook and sketchbook games (Paper Mario, Tearaway)', use: 'to put everything on one physical surface', avoid: 'strong paper under photographic looks' },
	'retro.pixel': { seenIn: 'Pixel-art 3D (A Short Hike, Octopath-like HD-2D)', use: 'for a stable low-resolution pixel grid', avoid: 'with depth of field or motion blur (anachronistic)' },
	'retro.quantize': { seenIn: 'Game Boy, PICO-8 and 16-bit looks', use: 'to limit colors to levels or a palette', avoid: 'without dither on smooth gradients (banding)' },
	'retro.dither': { seenIn: 'Return of the Obra Dinn, 16-bit games', use: 'to fake in-between colors with a fixed pattern', avoid: 'with grain (two noises), and on very small pixels' },
	'retro.vertexSnap': { seenIn: 'PS1 games and their modern homages (Signalis, Dusk)', use: 'for the jittery PS1 vertex look', avoid: 'outside a retro look: it reads as a bug' },
	'retro.crt': { seenIn: 'Arcade and VHS-era homages', use: 'to simulate the screen itself (scanlines, mask, curvature)', avoid: 'small windows, where scanlines alias' },
	'motion.stepped': { seenIn: 'Spider-Verse, Guilty Gear (animating on twos)', use: 'for a hand-drawn animation cadence', avoid: 'on the camera (it would judder): only animation steps' },
	'motion.boil': { seenIn: 'Hand-drawn animation, Spider-Verse line boil', use: 'to make lines feel drawn by hand', avoid: 'boil without wobble (nothing to see) or very fast boil' },
	// P2 (M10)
	'lighting.vertexAo': { seenIn: 'Phone and console games with baked lighting (Animal Crossing, Monument Valley), Minecraft\'s smooth lighting', use: 'to ground objects and darken crevices for free, stable on every device', avoid: 'expecting occlusion between separate objects (it is baked per object)' },
	'lighting.ssgi': { seenIn: 'Modern interiors and courtyards in realistic games (Lumen-lit scenes, Control)', use: 'for colored bounce light in enclosed spaces', avoid: 'on phones and in flat graphic looks' },
	'surface.gooch': { seenIn: 'Technical illustration, CAD viewers, Team Fortress 2\'s warm-cool shading', use: 'to keep every surface readable with cool shade instead of dark shadows', avoid: 'with a strong shadow tint on top (two temperature shifts)' },
	'surface.matcap': { seenIn: 'Sculpting tools (ZBrush, Blender), stylized phone games', use: 'for a fixed, studio-lit material at the price of one texture fetch', avoid: 'scenes that need the sun direction: a matcap ignores the lights' },
	'lines.sobel': { seenIn: 'Rotoscoped and photocopied looks (A Scanner Darkly-like), early toon shaders', use: 'as a rough, image-traced line style, or to learn why geometry-aware ink wins', avoid: 'as the main ink of a clean cel look' },
	'lines.highlight': { seenIn: 'Interactable outlines in The Last of Us, Zelda pickups, most adventure games', use: 'to make what the player can use read at a glance', avoid: 'highlighting many things, or using a color the palette already uses' },
	'atmosphere.particles': { seenIn: 'Dust in sunbeams (Journey, Ori), embers in forges, snow and rain in open worlds', use: 'to fill the air between the camera and the scene', avoid: 'dense particles in front of gameplay' },
	'lens.flare': { seenIn: 'Racing games, sci-fi shooters, J. J. Abrams-style cinematics', use: 'when the sun or bright lights are in frame', avoid: 'drawn or painted looks (they have no lens)' },
	'lens.anamorphic': { seenIn: 'Blade Runner-style night cities, Mass Effect, Cyberpunk', use: 'for wide-screen streaks on neon and lamps', avoid: 'daylight looks and many small highlights' },
	'lens.afterimage': { seenIn: 'Rhythm games, dream and drug sequences, phosphor screens', use: 'for trails that read as speed or a dream', avoid: 'gameplay where players track fast objects' },
	'grade.sepia': { seenIn: 'Flashbacks, westerns (Red Dead photo modes), old photographs', use: 'to place a scene in the past', avoid: 'a half-strength sepia on a colorful palette' },
	'grade.bleach': { seenIn: 'War films and gritty shooters (Saving Private Ryan, Gears of War)', use: 'for drained color with hard, metallic contrast', avoid: 'bright, playful looks' },
	'media.sharpen': { seenIn: 'Most console games (sharpening after TAA or upscaling)', use: 'to recover crispness after AA or a lower render scale', avoid: 'with grain or dither, which it amplifies' },
	'retro.vhs': { seenIn: 'Analog horror, found footage, retrowave (Signalis, Hotline Miami trailers)', use: 'to date an image to home video', avoid: 'strong tracking jitter during gameplay' },
	'retro.texture': { seenIn: 'PS1 (nearest) and N64 (three-point) games and their homages', use: 'to give textured surfaces a hardware era', avoid: 'nearest filtering on detailed far-away textures (shimmer)' },
	'retro.affine': { seenIn: 'PS1 games (Silent Hill, Crash Bandicoot) and homages (Signalis, Dusk)', use: 'with vertex snapping for the full PS1 wobble', avoid: 'outside a retro look: it reads as a bug' },
	'motion.lowFps': { seenIn: 'Stop-motion games (The Neverhood-like), found footage, 8-fps camera feeds', use: 'for a choppy, made-by-hand or surveillance cadence', avoid: 'action gameplay and anything under about 8 fps' },
	'motion.speedLines': { seenIn: 'Manga and anime, Hi-Fi Rush, Sonic boosts, One Piece', use: 'to sell speed and impact in toon looks', avoid: 'leaving them on when nothing moves' },
	'quality.resolution': { seenIn: 'Dynamic resolution in console games', use: 'to trade sharpness for speed', avoid: 'below 0.75 with thin lines (they break up)' },
	'quality.aa': { seenIn: 'TAA in most modern engines, MSAA in forward renderers and phones', use: 'to remove jagged edges', avoid: 'TRAA with fast stepped animation (ghosting), and SMAA/TRAA on phones' },
};

/** Library usage of a parameter: { min, max } over the looks that set it, or values for enums. */
function libraryRange( e ) {

	const vals = LOOKS.map( ( l ) => l.params?.[ e.id ] ).filter( ( v ) => v !== undefined );
	if ( ! vals.length ) return null;
	if ( typeof vals[ 0 ] === 'number' ) return { min: Math.min( ...vals ), max: Math.max( ...vals ), n: vals.length };
	return { values: [ ...new Set( vals.map( ( v ) => JSON.stringify( v ) ) ) ].map( ( v ) => JSON.parse( v ) ), n: vals.length };

}

/** A one-click micro-experiment: two values to compare, and what to watch. */
export function tryThis( e ) {

	if ( e.type === 'bool' ) return { values: [ false, true ], text: `Switch ${e.label} off, then on: watch what changes.` };
	if ( e.type === 'enum' ) { const o = e.options.slice( 0, 3 ).map( ( x ) => x.value ); return { values: o, text: `Step through ${e.options.slice( 0, 3 ).map( ( x ) => x.label ).join( ', ' )}.` }; }
	if ( e.type === 'color' ) return { values: [ e.default, e.neutral ], text: `Compare ${valueLabel( e, e.default )} with ${valueLabel( e, e.neutral )}.` };
	if ( e.type === 'palette' ) return { values: [ e.default ], text: 'Pick a look with a palette (Retro or Synthwave) and turn Palette remap up.' };
	const span = e.max - e.min;
	const lo = Math.round( ( e.min + span * 0.15 ) / e.step ) * e.step, hi = Math.round( ( e.min + span * 0.85 ) / e.step ) * e.step;
	const fix = ( v ) => Math.round( v * 1000 ) / 1000;
	return { values: [ fix( lo ), fix( hi ) ], text: `Set ${e.label} to ${fix( lo )}, then ${fix( hi )}, and compare.` };

}

/** The complete card content for a parameter. */
export function learnCard( e ) {

	const group = GROUP_LEARN[ e.id.split( '.' ).slice( 0, 2 ).join( '.' ) ] || {};
	const range = libraryRange( e );
	const typical = e.learn.typical || ( range ? ( range.values ? `Library looks use ${range.values.map( ( v ) => valueLabel( e, v ) ).join( ', ' )}.` : `Library looks use ${valueLabel( e, range.min )} to ${valueLabel( e, range.max )} (default ${valueLabel( e, e.default )}).` ) : `Default ${valueLabel( e, e.default )}; no library look changes it.` );
	return {
		what: e.learn.what, why: e.learn.why,
		use: group.use ? `Use it ${group.use}.` : null,
		avoid: e.learn.avoid || ( group.avoid ? `Avoid ${group.avoid}.` : null ),
		typical, seenIn: group.seenIn || null, tryThis: tryThis( e ),
	};

}

/** Ids missing any part of the complete card (the registry test enforces none). */
export function incompleteCards() {

	return REGISTRY.filter( ( e ) => { const c = learnCard( e ); return ! ( c.what && c.why && c.use && c.avoid && c.typical && c.seenIn && c.tryThis?.text ); } ).map( ( e ) => e.id );

}
