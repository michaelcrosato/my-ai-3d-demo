// Agent brief generator (design §6.12, Appendix B). Deterministic: the same resolved look
// gives the same text. Every value comes from the registry's brief templates, so a brief
// never invents numbers.
//
// Targets: 'runtime' (three.js r182 + the Style Lab runtime), 'three' (three.js, implement
// from the spec), 'engine' (engine-agnostic tables for Godot, Unity or Unreal).
// Lengths: 'short' (≤ 300 words, for a system prompt), 'standard' (CLAUDE.md / AGENTS.md),
// 'full' (everything, including per-part tables).

import { REGISTRY, MODULES, PARTS, byId, formatBrief, valueLabel } from '../registry/index.js';
import { EFFECTS, activeEffects, withPartMasks } from '../post/graph.js';

export const BRIEF_TARGETS = { runtime: 'three.js r182 + Style Lab runtime', three: 'three.js r182 without the runtime', engine: 'Engine-agnostic spec (Godot, Unity, Unreal)' };
export const BRIEF_LENGTHS = { short: 'Short', standard: 'Standard', full: 'Full' };

const PHONE = { cheap: 'Phone-safe: runs on most phones', medium: 'High-end phones', heavy: 'Desktop only' };
const PART_NAMES = { sky: 'Sky', terrain: 'Terrain', water: 'Water', foliage: 'Foliage', architecture: 'Architecture', props: 'Props', characters: 'Characters', hero: 'Hero', vfx: 'VFX' };
const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

/** Registry params of an effect (its id prefix, plus the few that live elsewhere). */
const EFFECT_PARAMS = {
	'grade.toneMapping': [ 'grade.toneMapping', 'grade.exposure', 'grade.temperature', 'grade.tint' ],
	'grade.basic': [ 'grade.lift', 'grade.gamma', 'grade.gain', 'grade.contrast', 'grade.saturation', 'grade.vibrance', 'grade.hue', 'grade.split.shadows', 'grade.split.highlights', 'grade.split.balance', 'grade.split.amount' ],
	'quality.fxaa': [ 'quality.aa' ], 'quality.smaa': [ 'quality.aa' ], 'quality.traa': [ 'quality.aa' ],
	'retro.quantize': [ 'retro.quantize.mode', 'retro.quantize.levels', 'retro.quantize.palette', 'retro.dither.amount', 'retro.dither.pattern' ],
};
const paramsOf = ( id ) => EFFECT_PARAMS[ id ] || REGISTRY.filter( ( e ) => e.id.startsWith( `${id}.` ) ).map( ( e ) => e.id );

/** three.js r182 building blocks for the no-runtime target. */
const THREE_HINTS = {
	'lighting.ao': 'GTAONode (three/addons/tsl/display/GTAONode.js) at half resolution',
	'lighting.contact': 'a short screen-space ray march toward the sun on the depth buffer',
	'lens.bloom': 'BloomNode (three/addons/tsl/display/BloomNode.js)',
	'atmosphere.godRays': 'a radial blur of the bright sky toward the sun\'s screen position',
	'lens.motionBlur': 'MotionBlur (three/addons/tsl/display/MotionBlur.js) with a velocity MRT',
	'lens.dof': 'DepthOfFieldNode (three/addons/tsl/display/DepthOfFieldNode.js)',
	'lens.tiltShift': 'a vertical blur band (GaussianBlurNode) masked by screen height',
	'quality.traa': 'TRAANode (three/addons/tsl/display/TRAANode.js), applied last',
	'grade.toneMapping': 'renderOutput() with the tone mapping below',
	'grade.basic': 'cdl(), saturation(), vibrance(), hue() from three/tsl',
	'grade.lut': 'texture3D() lookup of the exported grade.cube',
	'media.kuwahara': 'a generalized Kuwahara filter (8 sectors)',
	'media.halftone': 'rotated dot screens on luminance, in screen space',
	'media.hatching': 'rotated line screens below light thresholds',
	'lines.screen': 'Laplacian of inverse depth + normal and id edges from an MRT pass',
	'retro.pixel': 'render at ⌈H/p⌉ rows, nearest upscale, camera snapped to whole texels',
	'quality.fxaa': 'FXAANode', 'quality.smaa': 'SMAANode',
	'retro.quantize': 'posterize or nearest-palette in OKLab, Bayer dither before quantizing',
	'retro.crt': 'scanlines, aperture mask, barrel curvature',
};

/** Whether a param says something: not the registry default, and its switch (if any) is on. */
function notable( e, v, values ) {

	if ( e.enabledBy && ! values[ e.enabledBy ] ) return false;
	return ! same( v, e.default );

}

const line = ( e, v ) => `- ${formatBrief( e, v )}`;

function section( title, lines ) {

	return lines.length ? [ `## ${title}`, ...lines, '' ] : [];

}

/** Notable params of a module, as brief lines. */
function moduleLines( module, values, { skip = () => false } = {} ) {

	return REGISTRY.filter( ( e ) => e.module === module && ! skip( e ) && notable( e, values[ e.id ], values ) ).map( ( e ) => line( e, values[ e.id ] ) );

}

/** The post chain in pipeline order: enabled effects, plus always-on stages that do something. */
export function postChain( global, parts ) {

	const v = withPartMasks( global, parts );
	const active = new Set( activeEffects( v ) );
	return EFFECTS.filter( ( e ) => active.has( e.id ) || ( e.always && paramsOf( e.id ).some( ( id ) => byId.has( id ) && notable( byId.get( id ), v[ id ], v ) ) ) ).map( ( e ) => ( {
		id: e.id, label: e.label, masked: !! ( e.mask && v[ `@partial:${e.mask}` ] ),
		parts: e.mask && v[ `@partial:${e.mask}` ] ? PARTS.filter( ( p ) => parts[ p ][ e.mask ] ) : null,
		params: paramsOf( e.id ).filter( ( id ) => byId.has( id ) ).map( ( id ) => byId.get( id ) ).filter( ( p ) => p.type !== 'bool' && ( ! p.enabledBy || v[ p.enabledBy ] ) ),
	} ) );

}

/** Per-part values that differ from the global ones. */
function partDiffs( resolved ) {

	const out = {};
	for ( const part of PARTS ) {

		// Lines first (they define the look most), then surface, then the rest.
		const rank = ( id ) => ( id.startsWith( 'lines.' ) ? 0 : id.startsWith( 'surface.model' ) ? 1 : 2 );
		const diff = Object.entries( resolved.parts[ part ] ).filter( ( [ id, v ] ) => ! same( v, resolved.global[ id ] ) ).sort( ( a, b ) => rank( a[ 0 ] ) - rank( b[ 0 ] ) );
		if ( diff.length ) out[ part ] = diff;

	}

	return out;

}

function paletteRows( g ) {

	const rows = [];
	if ( g[ 'palette.remap' ] > 0 && g[ 'palette.colors' ].length ) rows.push( [ 'Palette (base colors snap to these)', g[ 'palette.colors' ].join( ' ' ) ] );
	rows.push( [ 'Sky (zenith → horizon)', `${g[ 'atmosphere.sky.zenith' ]} → ${g[ 'atmosphere.sky.horizon' ]}` ] );
	rows.push( [ 'Shadow tint', `${g[ 'surface.shadowTint' ]} at ${Math.round( g[ 'surface.shadowTintStrength' ] * 100 )}%` ] );
	rows.push( [ 'Key light', g[ 'lighting.key.color' ] ] );
	if ( g[ 'atmosphere.fog.type' ] !== 'off' ) rows.push( [ 'Fog', g[ 'atmosphere.fog.color' ] ] );
	if ( g[ 'lines.screen.enabled' ] || g[ 'lines.hull.enabled' ] ) rows.push( [ 'Ink', g[ 'lines.screen.enabled' ] ? g[ 'lines.screen.color' ] : g[ 'lines.hull.color' ] ] );
	return rows;

}

function implementation( target, look ) {

	if ( target === 'runtime' ) return [
		'1. Add `stylelab-runtime.js`, `stylelab-kit.js` and `look.json` (exported with this brief) to the project. Use the import map from `starter.html` (three r182 from jsDelivr).',
		'2. Create the style once:',
		'   ```js',
		'   import { createStyle } from \'./stylelab-runtime.js\';',
		`   const style = await createStyle( { renderer, scene, camera, looks: [ LOOK ] } ); // LOOK = the ${look.id} look.json`,
		'   ```',
		'3. Never create `MeshStandardMaterial` directly. Use `style.material( { part, color, role } )`, e.g. `style.material( { part: \'architecture\', color: \'#d9a066\', role: \'wall\' } )`.',
		`4. Tag every mesh with its part: ${PARTS.filter( ( p ) => p !== 'sky' ).join( ' | ' )} (\`style.tag( mesh, part )\`). Add new objects with \`style.add( object )\`.`,
		'5. Render with `style.render()` instead of `renderer.render()`.',
		'6. Existing game? Call `style.convertScene( scene )` once after building it: it keeps each color and guesses parts.',
	];
	if ( target === 'three' ) return [
		'Implement the look yourself in three.js r182 (WebGPURenderer, TSL). Build it as: a styled material per part (custom lighting model with the bands, shadow tint, rim and specular below), a scene pass with MRT (output, normal, ids, depth) when lines or AO are on, then the post chain below in order. Building blocks per effect are listed with the chain.',
		'Keep every continuous value a uniform, so tuning never recompiles shaders.',
	];
	return [
		'No code: recreate each section with your engine\'s tools. Godot: a ShaderMaterial with a light() function for the bands; Environment for fog and glow; a CompositorEffect for lines. Unity (URP): a custom lit shader graph; Volume overrides for post; a renderer feature for outlines. Unreal: a material function for the light ramp; Post Process Volume; a post-process material for lines.',
		'Import `grade.cube` as the color-grading LUT (display-referred, after tone mapping) and `palette.gpl` into your paint tools.',
	];

}

/** One line on ink: everywhere, only on some parts, or none. */
function inkRule( g, resolved ) {

	const hull = PARTS.filter( ( p ) => resolved.parts[ p ][ 'lines.hull.enabled' ] );
	if ( g[ 'lines.screen.enabled' ] ) return `- Ink: ${g[ 'lines.screen.thickness' ]} px screen-space lines in ${g[ 'lines.screen.color' ]}.`;
	if ( g[ 'lines.hull.enabled' ] ) return `- Ink: ${g[ 'lines.hull.thickness' ]} px outlines in ${g[ 'lines.hull.color' ]} on everything.`;
	if ( hull.length ) return `- Ink: ${resolved.parts[ hull[ 0 ] ][ 'lines.hull.thickness' ]} px outlines in ${resolved.parts[ hull[ 0 ] ][ 'lines.hull.color' ]} only on ${hull.map( ( p ) => PART_NAMES[ p ].toLowerCase() ).join( ', ' )}.`;
	return '- No outlines.';

}

/** The procedural-asset rules (design M6): build assets in code, the way the kit does. */
function proceduralRules( target, short ) {

	if ( short ) return [ '- Build assets in code (three.js geometry, part-tagged, seeded, with complexity tiers), like `stylelab-kit.js`; put detail in geometry, not textures.' ];
	return [
		'- **Build assets procedurally, in code,** the way `stylelab-kit.js` does: compose three.js primitives (boxes, cylinders, lathes, extrusions), merge them per material, and tag each mesh with its part. Code-built assets stay readable and editable, fit in one HTML file, and this look\'s lighting, lines and grade dress them up.',
		'- **Seeded randomness** for variety (a small PRNG with a seed per object), so a level rebuilds identically every time.',
		'- **Complexity tiers** in every builder: Blockout (raw primitives) → Low-poly (intentional facets) → Crafted (bevels, smooth normals) → Detailed (subdivision, displacement). The same layout and colors at every tier.',
		'- **Detail is geometry, not image textures:** panel seams, bevels, inset plates, trim, rivets, stones. Flat-colored low-poly models with geometric detail read well in every look.',
		target === 'runtime' ? '- Start from the kit: `import { house, tree, crate, character } from \'./stylelab-kit.js\'` and extend it in the same style.' : '- The kit\'s source (`stylelab-kit.js`) shows the pattern even if you don\'t run it.',
	];

}

/**
 * Generates the brief.
 * @param {object} o
 * @param {object} o.look - metadata: id, name, version, inspiredBy, description, pillars, mistakes, tags, phone, tiers
 * @param {object} o.resolved - { global, parts } from resolveRecipe
 * @param {string} [o.target] - 'runtime' | 'three' | 'engine'
 * @param {string} [o.length] - 'short' | 'standard' | 'full'
 * @param {string} [o.shareUrl] - reopens the exact state in Style Lab
 * @param {string[]} [o.mixedFrom] - names of looks mixed into this one
 * @param {object} [o.plan] - { levels: [{ scene, look, transition }], zones: [{ scene, zone, look }], modes: [{ name, look }] }
 * @param {number} [o.tier] - target complexity tier (0–3)
 * @returns {string} Markdown
 */
export function generateBrief( { look, resolved, target = 'runtime', length = 'standard', shareUrl = null, mixedFrom = [], plan = null, tier = null } ) {

	const g = resolved.global;
	const short = length === 'short', full = length === 'full';
	const name = look.name;
	const chain = postChain( g, resolved.parts );
	const out = [];

	// 1. Header and provenance
	out.push( `# Art direction: ${name} (stylelab look ${look.id}@${look.version ?? 1})` );
	if ( shareUrl ) out.push( `Reopen in Style Lab: ${shareUrl}` );
	out.push( `Target: ${BRIEF_TARGETS[ target ]}. Inspired by ${( look.inspiredBy || [] ).join( ', ' ) || 'original work'}${mixedFrom.length > 1 ? `; mixed from ${mixedFrom.join( ' + ' )}` : ''}.` );
	if ( look.description ) out.push( look.description );
	out.push( '' );

	// 2. Pillars
	const pillars = ( look.pillars || [] ).slice( 0, short ? 4 : 5 );
	if ( pillars.length ) out.push( ...section( 'Pillars (never break these)', pillars.map( ( p, i ) => `${i + 1}. ${p}` ) ) );

	if ( short ) {

		// Short: the handful of rules that define the look, then how to build.
		const rules = [
			`- Shading: ${valueLabel( byId.get( 'surface.model' ), g[ 'surface.model' ] )}${g[ 'surface.model' ] !== 'pbr' ? `, ${g[ 'surface.bands' ]} light band${g[ 'surface.bands' ] > 1 ? 's' : ''}` : ''}; shadows tinted ${g[ 'surface.shadowTint' ]}.`,
			inkRule( g, resolved ),
			`- Light: key ${g[ 'lighting.key.color' ]} from ${g[ 'lighting.key.elevation' ]}° up; sky ${g[ 'atmosphere.sky.zenith' ]} → ${g[ 'atmosphere.sky.horizon' ]}.`,
			g[ 'atmosphere.fog.type' ] !== 'off' ? `- Fog: ${g[ 'atmosphere.fog.type' ]}, ${g[ 'atmosphere.fog.color' ]}.` : '- No fog.',
			`- Post: ${chain.map( ( e ) => e.label ).join( ' → ' ) || 'none'}.`,
			...( g[ 'palette.remap' ] > 0 && g[ 'palette.colors' ].length ? [ `- Palette: ${g[ 'palette.colors' ].join( ' ' )}.` ] : [] ),
		];
		out.push( ...section( 'Rules', rules ) );
		const build = {
			runtime: [ '- `const style = await createStyle( { renderer, scene, camera, looks: [ LOOK ] } )` from `stylelab-runtime.js` (LOOK = the exported look.json); render with `style.render()`.', '- Materials only via `style.material( { part, color } )`; tag every mesh with its part.' ],
			three: [ '- three.js r182 (WebGPU, TSL): a custom lighting model per part with the values above, then the post chain in order.' ],
			engine: [ '- Recreate with your engine\'s shader and post tools; import grade.cube and palette.gpl.' ],
		}[ target ];
		out.push( ...section( 'Build', [ ...build, ...proceduralRules( target, true ) ] ) );
		return out.join( '\n' ).trim() + '\n';

	}

	// 3. Palette by role
	out.push( '## Palette (by role)', '| Role | Hex |', '|---|---|', ...paletteRows( g ).map( ( [ r, h ] ) => `| ${r} | ${h} |` ), 'Proportions: a dominant color for about 60% of the frame (sky and ground), a secondary for 30% (buildings, foliage), an accent for 10% (characters, interactables).', '' );
	if ( ( look.mistakes || [] ).length ) out.push( ...section( 'Avoid', look.mistakes.map( ( m ) => `- ${m}` ) ) );

	// 4–7. Lighting, materials, lines, atmosphere
	out.push( ...section( 'Lighting', moduleLines( 'lighting', g, { skip: ( e ) => e.id.startsWith( 'lighting.ao' ) || e.id.startsWith( 'lighting.contact' ) } ) ) );
	const surface = moduleLines( 'surface', g, { skip: ( e ) => e.id.startsWith( 'surface.water.' ) && g[ 'surface.model' ] !== 'toonWater' } ).concat( moduleLines( 'palette', g, { skip: ( e ) => e.id === 'palette.colors' } ) );
	out.push( ...section( 'Materials', surface.length ? surface : [ '- Physically based, as the registry defaults.' ] ) );
	const diffs = partDiffs( resolved );
	if ( Object.keys( diffs ).length ) {

		const rows = [];
		for ( const [ part, list ] of Object.entries( diffs ) ) {

			const shown = full ? list : list.slice( 0, 4 );
			rows.push( `- **${PART_NAMES[ part ]}:** ${shown.map( ( [ id, v ] ) => `${byId.get( id ).label} ${valueLabel( byId.get( id ), v )}` ).join( '; ' )}${shown.length < list.length ? `; and ${list.length - shown.length} more` : ''}.` );

		}

		out.push( ...section( 'Per part (differs from the above)', rows ) );

	}

	if ( full ) {

		const ids = [ 'surface.model', 'surface.bands', 'surface.shadowTint', 'surface.rim.intensity', 'lines.hull.enabled', 'lines.hull.thickness', 'palette.saturation' ];
		out.push( '## Per-part table', `| Part | ${ids.map( ( id ) => byId.get( id ).label ).join( ' | ' )} |`, `|---|${ids.map( () => '---' ).join( '|' )}|`, ...PARTS.map( ( p ) => `| ${PART_NAMES[ p ]} | ${ids.map( ( id ) => valueLabel( byId.get( id ), resolved.parts[ p ][ id ] ) ).join( ' | ' )} |` ), '' );

	}

	const hullParts = PARTS.filter( ( p ) => resolved.parts[ p ][ 'lines.hull.enabled' ] );
	const inkParts = PARTS.filter( ( p ) => resolved.parts[ p ][ 'lines.screen.enabled' ] );
	const partInk = [
		...( ! g[ 'lines.hull.enabled' ] && hullParts.length ? [ `- Outlines (inverted hull) only on ${hullParts.map( ( p ) => PART_NAMES[ p ].toLowerCase() ).join( ', ' )}: ${resolved.parts[ hullParts[ 0 ] ][ 'lines.hull.thickness' ]} px at 1080p, ${resolved.parts[ hullParts[ 0 ] ][ 'lines.hull.color' ]}. Never on the other parts.` ] : [] ),
		...( g[ 'lines.screen.enabled' ] && inkParts.length < PARTS.length ? [ `- Screen-space ink only on ${inkParts.map( ( p ) => PART_NAMES[ p ].toLowerCase() ).join( ', ' )}.` ] : [] ),
	];
	const lines = moduleLines( 'lines', g, { skip: ( e ) => ! full && e.id.startsWith( 'lines.screen.' ) && ! [ 'lines.screen.enabled', 'lines.screen.thickness', 'lines.screen.color', 'lines.screen.colorFromSurface', 'lines.screen.fade', 'lines.screen.texture', 'lines.screen.wobble' ].includes( e.id ) } ).concat( partInk );
	out.push( ...section( 'Lines', lines.length ? lines : [ '- No outlines anywhere.' ] ) );
	out.push( ...section( 'Atmosphere', moduleLines( 'atmosphere', g, { skip: ( e ) => e.id.startsWith( 'atmosphere.godRays' ) } ) ) );

	// 8. Post chain, in order
	const post = chain.map( ( e, i ) => {

		const vals = e.params.filter( ( p ) => full || notable( p, g[ p.id ], g ) ).map( ( p ) => `${p.label} ${valueLabel( p, g[ p.id ] )}` );
		const hint = target === 'three' && THREE_HINTS[ e.id ] ? ` Build with ${THREE_HINTS[ e.id ]}.` : '';
		return `${i + 1}. **${e.label}**${e.parts ? ` (only on ${e.parts.join( ', ' )})` : ''}${vals.length ? `: ${vals.join( ', ' )}` : ''}.${hint}`;

	} );
	out.push( ...section( 'Post chain (in this order)', post.length ? post : [ 'None: the look is entirely in the materials.' ] ) );

	// 9. Modeling rules (procedural assets)
	const tierName = [ 'Blockout', 'Low-poly', 'Crafted', 'Detailed' ][ tier ?? ( look.phone === 'cheap' ? 1 : 2 ) ];
	out.push( ...section( 'Modeling rules', [
		`- Target complexity: ${tierName}. Bevel box edges by 2–4% of their size where the tier calls for it.`,
		'- Silhouettes first: every object must read as a solid shape at 64 px tall.',
		'- Put detail near the player\'s path; keep distant geometry simple (fog and lines hide it).',
		g[ 'surface.flatNormals' ] ? '- Flat-shaded facets are part of this look: keep polygons visible.' : '- Smooth normals on curved shapes; hard edges where the form turns.',
		...proceduralRules( target, false ),
	] ) );

	// 10. Motion rules
	out.push( ...section( 'Motion', moduleLines( 'motion', g ).concat( moduleLines( 'retro', g, { skip: ( e ) => ! e.id.startsWith( 'retro.vertexSnap' ) } ) ) ) );

	// 11. Performance tier and the mobile variant
	const mobile = Object.entries( look.tiers?.mobile?.params || {} ).filter( ( [ id ] ) => byId.has( id ) ).map( ( [ id, v ] ) => `${byId.get( id ).label} ${valueLabel( byId.get( id ), v )}` );
	out.push( ...section( 'Performance', [
		`- ${PHONE[ look.phone ] || 'Not rated'}.${chain.some( ( e ) => [ 'lines.screen', 'lighting.ao', 'lighting.contact', 'lens.dof', 'lens.motionBlur', 'quality.traa' ].includes( e.id ) ) ? ' Uses extra scene buffers (normals, ids or depth).' : ' No extra scene buffers.'}`,
		mobile.length ? `- Mobile variant: ${mobile.join( ', ' )}.` : '- Mobile variant: the same look.',
		...moduleLines( 'quality', g ).filter( () => full ),
	] ) );

	// 12. Multi-look plan
	if ( plan && ( plan.levels?.length || plan.zones?.length || plan.modes?.length ) ) {

		const rows = [
			...( plan.levels || [] ).map( ( l ) => `- Level **${l.scene}**: ${l.look}${l.transition ? `, enter with a ${l.transition}` : ''}.` ),
			...( plan.zones || [] ).map( ( z ) => `- Zone **${z.zone}** (${z.scene}): ${z.look}; blend over ${z.blend ?? 2} m.` ),
			...( plan.modes?.length ? [ `- Player visual modes (settings menu): ${plan.modes.map( ( m ) => `${m.name} (${m.look})` ).join( ', ' )}.` ] : [] ),
		];
		out.push( ...section( 'Look plan', rows ) );

	}

	// 13. Implementation
	out.push( ...section( `Implementation (${BRIEF_TARGETS[ target ]})`, implementation( target, look ) ) );

	// 14. Acceptance checklist
	out.push( ...section( 'Checklist for every new asset', [
		target === 'runtime' ? '- [ ] Uses `style.material()` with a palette color and the right `part`' : '- [ ] Uses the part\'s material settings above and a palette color',
		'- [ ] Built in code with the kit\'s patterns (seeded, tiered, detail as geometry)',
		'- [ ] Reads as a clear silhouette at 64 px and in the value (grayscale) view',
		...( look.pillars || [] ).slice( 0, 3 ).map( ( p ) => `- [ ] ${p}` ),
	] ) );

	return out.join( '\n' ).trim() + '\n';

}
