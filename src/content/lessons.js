// Lessons (design §6.13, Appendix E): guided tours that drive the app. Each step sets up
// state (applied cumulatively from the lesson's start, so Back is exact) and captions it.
// A step's `task` has a check (`done`) and, for test scripts, a `solve` that does it.
//
// setup: { scene, tier, look, params, recipe, parts, view, tab, learn, compare, strength, transition }

const hold = { done: ( app, ctx ) => ctx.held, solve: async ( app ) => { app.actions.setHold( true ); app.actions.setHold( false ); } };

export const LESSONS = [
	{
		id: 'L1', title: 'Blockout to beautiful', minutes: 4,
		summary: 'Eight levers, zero new geometry: turn a default agent scene into a styled one.',
		steps: [
			{ caption: 'This is what agents make by default: standard materials, one sun, no post. Blockout geometry. Nothing is wrong with it; nothing is chosen either.', setup: { scene: 'harbor', tier: 0, look: 'plain', compare: 'off' } },
			{ caption: 'Lever 1, the cel ramp: light quantized into two flat bands. The shapes suddenly read as a drawing.', setup: { params: { 'surface.model': 'toon', 'surface.bands': 2, 'surface.softness': 0.04 } } },
			{ caption: 'Lever 2, shadow tint: shadows turn blue-violet instead of gray. Warm light against cool shadow adds contrast without darkening the image.', setup: { params: { 'surface.shadowTint': '#5866d0', 'surface.shadowTintStrength': 0.55 } } },
			{ caption: 'Lever 3, outlines: an inverted hull draws a thin dark line around every shape, so silhouettes separate.', setup: { params: { 'lines.hull.enabled': true, 'lines.hull.thickness': 1.5, 'lines.hull.color': '#20243f' } } },
			{ caption: 'Lever 4, sky and fog: a gradient sky and fog tinted like the horizon push the distance back (atmospheric perspective).', setup: { params: { 'atmosphere.sky.zenith': '#2d88e8', 'atmosphere.sky.horizon': '#bdebff', 'atmosphere.fog.type': 'exp2', 'atmosphere.fog.density': 0.006, 'atmosphere.fog.color': '#c8dcf0', 'atmosphere.fog.skyTint': 0.6 } } },
			{ caption: 'Lever 5, palette: more saturated, simpler colors.', setup: { params: { 'palette.saturation': 1.25 } } },
			{ caption: 'Levers 6–8, bloom, grade and vignette: a soft glow on highlights, a touch of contrast, darker corners that hold the eye in.', setup: { params: { 'lens.bloom.enabled': true, 'lens.bloom.strength': 0.3, 'grade.contrast': 1.05, 'lens.vignette.amount': 0.12 } } },
			{ caption: 'Same geometry, same layout. Hold Space (or the Hold to compare button) to see where you started.', task: { text: 'Hold to compare with plain.', ...hold } },
		],
	},
	{
		id: 'L2', title: 'Silhouettes and lines', minutes: 4,
		summary: 'Why lines help, which kind to use, and how to keep them from turning into noise.',
		steps: [
			{ caption: 'The silhouette view fills every object with flat black. If you can tell what things are here, the shapes work.', setup: { scene: 'plaza', tier: 1, look: 'plain', view: 'silhouette' } },
			{ caption: 'Inverted hull outlines: an inflated, inside-out copy behind each mesh. Cheap and stable, but only outer edges.', setup: { view: null, params: { 'surface.model': 'toon', 'lines.hull.enabled': true, 'lines.hull.thickness': 2, 'lines.hull.color': '#1a1a1a' } } },
			{ caption: 'Screen-space ink finds edges from depth, normals and object ids, so it also draws folds (creases) and contact lines.', setup: { params: { 'lines.hull.enabled': false, 'lines.screen.enabled': true, 'lines.screen.thickness': 2, 'lines.screen.crease': 0.5 } } },
			{ caption: 'Illustrators draw silhouettes heavier than inner folds. Crease weight down, silhouette weight up.', setup: { params: { 'lines.screen.crease': 0.25, 'lines.screen.silhouette': 1 } } },
			{ caption: 'Detailed geometry plus thin, crease-heavy ink turns into line noise.', setup: { tier: 3, params: { 'lines.screen.crease': 1, 'lines.screen.creaseAngle': 20 } } },
			{ caption: 'Why ink reads geometry: image-space Sobel inks wherever brightness changes. Shadows and highlights get lines, and an object as bright as its background loses its outline.', setup: { tier: 1, params: { 'lines.screen.enabled': false, 'lines.sobel.enabled': true, 'lines.sobel.thickness': 1.5 } } },
			{ caption: 'Back to geometry-aware ink. Fade lines with distance, as illustrators simplify what is far away.', setup: { params: { 'lines.sobel.enabled': false, 'lines.screen.enabled': true } }, task: { text: 'Turn on line distance fade (Tune → Lines → Fade with distance).', done: ( app ) => app.target.global[ 'lines.screen.fade' ] > 0.5, solve: ( app ) => app.actions.setParam( 'lines.screen.fade', 1 ) } },
		],
	},
	{
		id: 'L3', title: 'Light shapes', minutes: 3,
		summary: 'How many tones the light has, how sharp the edge is, and why value structure matters.',
		steps: [
			{ caption: 'One band: continuous light. Smooth, realistic, and the most "default" looking.', setup: { scene: 'lookdev', tier: 1, look: 'sea-breeze', params: { 'surface.bands': 1 } } },
			{ caption: 'Two bands: the bold light/shadow split of classic cel animation.', setup: { params: { 'surface.bands': 2 } } },
			{ caption: 'Five bands: more form, and the look moves back toward realism.', setup: { params: { 'surface.bands': 5 } } },
			{ caption: 'Edge softness: hard edges read as drawn, soft ones as painted.', setup: { params: { 'surface.bands': 2, 'surface.softness': 0.35 } } },
			{ caption: 'The value view removes color. Good images group into about three masses of light, middle and dark.', setup: { params: { 'surface.softness': 0.04 }, view: 'value' } },
			{ caption: 'Your turn: pick the band count that reads best in the value view.', task: { text: 'Set Light bands to 3 (Tune → Surface).', done: ( app ) => app.target.global[ 'surface.bands' ] === 3, solve: ( app ) => app.actions.setParam( 'surface.bands', 3 ) } },
		],
	},
	{
		id: 'L4', title: 'Color', minutes: 4,
		summary: 'Tinted shadows, palettes, saturation hierarchy and proportions.',
		steps: [
			{ caption: 'Gray shadows: correct, and lifeless.', setup: { scene: 'garden', tier: 1, look: 'sea-breeze', params: { 'surface.shadowTintStrength': 0 } } },
			{ caption: 'Tinted shadows: complementary to the light. Warm sun, cool shadow.', setup: { params: { 'surface.shadowTintStrength': 0.6 } } },
			{ caption: 'Palette remap snaps every base color to a designed palette, in OKLab, keeping each color\'s lightness.', setup: { params: { 'palette.colors': [ '#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#ffb703', '#219ebc', '#8ac926' ], 'palette.remap': 0.8 } } },
			{ caption: 'Saturation hierarchy: the focus should be the most saturated thing. The saturation view shows where color is strongest.', setup: { view: 'saturation' } },
			{ caption: 'The hue wheel (Analyze tab) shows the palette the frame really uses. Aim for a dominant color (60%), a secondary (30%) and an accent (10%).', setup: { view: null, tab: 'analyze' } },
			{ caption: 'Your turn: calm the background.', task: { text: 'Lower Saturation (Tune → Palette) below 1.', done: ( app ) => app.target.global[ 'palette.saturation' ] < 1, solve: ( app ) => app.actions.setParam( 'palette.saturation', 0.85 ) } },
		],
	},
	{
		id: 'L5', title: 'Depth', minutes: 3,
		summary: 'Atmospheric perspective, grounding shadows and focus.',
		steps: [
			{ caption: 'No fog: near and far have the same contrast, so the distant islands sit on top of the scene.', setup: { scene: 'harbor', tier: 1, look: 'golden-hour', params: { 'atmosphere.fog.type': 'off' } } },
			{ caption: 'Fog: distance fades. Space appears.', setup: { params: { 'atmosphere.fog.type': 'exp2', 'atmosphere.fog.skyTint': 0 } } },
			{ caption: 'Sky-tinted fog: distant things take the horizon\'s color, as real air does (atmospheric perspective).', setup: { params: { 'atmosphere.fog.skyTint': 1 } } },
			{ caption: 'Ambient occlusion and contact shadows ground objects where they touch.', setup: { scene: 'garden', params: { 'lighting.ao.enabled': true, 'lighting.contact.enabled': true } } },
			{ caption: 'Depth of field: the focus is sharp, the rest blurs. It directs the eye, and costs the most of any lens effect.', task: { text: 'Turn on Depth of field (Tune → Lens).', done: ( app ) => app.target.global[ 'lens.dof.enabled' ] === true, solve: ( app ) => app.actions.setParam( 'lens.dof.enabled', true ) } },
		],
	},
	{
		id: 'L6', title: 'Focus and composition', minutes: 3,
		summary: 'Where the eye goes, and how to lead it there.',
		steps: [
			{ caption: 'The squint view blurs away detail: only the big masses remain. Where does your eye land?', setup: { scene: 'platforms', tier: 1, look: 'sea-breeze', view: 'squint' } },
			{ caption: 'A vignette darkens the edges, so the center reads first.', setup: { view: null, params: { 'lens.vignette.amount': 0.35 } } },
			{ caption: 'The focus-hierarchy preset: the hero gets more saturation, a rim light and a thicker outline; the background calms down.', setup: { tab: 'parts', focus: true } },
			{ caption: 'The rule-of-thirds overlay: strong compositions put the subject near a line or an intersection.', setup: { view: 'thirds' } },
			{ caption: 'The critic (Analyze tab) checks the frame and suggests fixes.', task: { text: 'Open the Analyze tab and read the critic.', done: ( app ) => app.store.get().ui.tab === 'analyze', solve: ( app ) => app.store.set( { ui: { tab: 'analyze' } } ) }, setup: { view: null } },
		],
	},
	{
		id: 'L7', title: 'Texture and imperfection', minutes: 3,
		summary: 'Small imperfections make digital images feel made by hand.',
		steps: [
			{ caption: 'Posterized gradients show bands: steps where there should be a smooth sky.', setup: { scene: 'campsite', tier: 1, look: 'golden-hour', params: { 'retro.quantize.mode': 'posterize', 'retro.quantize.levels': 8, 'media.grain.amount': 0 } } },
			{ caption: 'A little grain breaks the steps up. The eye averages it back into a smooth gradient.', setup: { params: { 'media.grain.amount': 0.06 } } },
			{ caption: 'Paper texture under everything ties the image together like a print.', setup: { params: { 'retro.quantize.mode': 'off', 'media.paper.enabled': true, 'media.paper.type': 'watercolor' } } },
			{ caption: 'Color variation: no two surfaces are exactly one flat color.', setup: { params: { 'surface.variation.enabled': true, 'surface.variation.amount': 0.15 } } },
			{ caption: 'Painterly brush strokes (Kuwahara) turn the render into paint.', task: { text: 'Turn on Painterly (Tune → Media).', done: ( app ) => app.target.global[ 'media.kuwahara.enabled' ] === true, solve: ( app ) => app.actions.setParam( 'media.kuwahara.enabled', true ) } },
		],
	},
	{
		id: 'L8', title: 'Coherence', minutes: 3,
		summary: 'Effects that each look fine can contradict each other.',
		steps: [
			{ caption: 'Painterly, then halftone on top: two media fight. The Look tab\'s coherence checker flags it.', setup: { scene: 'lookdev', tier: 1, look: 'painterly', params: { 'media.halftone.enabled': true, 'media.halftone.amount': 1 }, tab: 'look' } },
			{ caption: 'Fix it with one click.', task: { text: 'Press the coherence fix in the Look tab.', done: ( app ) => ! app.coherence().some( ( w ) => w.id === 'two-media' ), solve: ( app ) => { const w = app.coherence().find( ( x ) => x.id === 'two-media' ); if ( w ) app.actions.applyOverrides( w.fix ); } } },
			{ caption: 'Retro pixels with a modern depth of field: two eras. Those consoles couldn\'t blur.', setup: { look: 'retro-16bit', params: { 'lens.dof.enabled': true } } },
			{ caption: 'Pick one era: keep the pixels and drop the blur, or the other way round.', task: { text: 'Apply the "two eras" fix.', done: ( app ) => ! app.coherence().some( ( w ) => w.id === 'two-eras' ), solve: ( app ) => { const w = app.coherence().find( ( x ) => x.id === 'two-eras' ); if ( w ) app.actions.applyOverrides( w.fix ); } } },
		],
	},
	{
		id: 'L9', title: 'Motion', minutes: 3,
		summary: 'Styles that look great in stills can fall apart in motion.',
		steps: [
			{ caption: 'Stepped animation: characters update 12 times a second while the camera stays smooth, the cadence of hand-drawn animation.', setup: { scene: 'toybox', tier: 1, look: 'comic-ink', params: { 'motion.stepped.fps': 12 }, turntable: true } },
			{ caption: 'Line boil: hand-drawn lines shimmer a few times a second. Charming when chosen; a bug when not.', setup: { params: { 'lines.screen.wobble': 1.5, 'motion.boil.fps': 8 } } },
			{ caption: 'The shower-door effect: halftone dots in screen space stay put while objects move under them.', setup: { params: { 'lines.screen.wobble': 0.3, 'motion.boil.fps': 0, 'surface.halftone.enabled': true, 'surface.halftone.space': 'screen' } } },
			{ caption: 'In world space the dots stick to the surfaces instead.', task: { text: 'Set Halftone space to World (Tune → Surface).', done: ( app ) => app.target.global[ 'surface.halftone.space' ] === 'world', solve: ( app ) => app.actions.setParam( 'surface.halftone.space', 'world' ) }, setup: { turntable: false } },
		],
	},
	{
		id: 'L10', title: 'Budgets', minutes: 4,
		summary: 'What each effect costs, and what will run on phones.',
		steps: [
			{ caption: 'Cinematic: depth of field, motion blur, TRAA, bloom, AO. Gorgeous on a desktop GPU.', setup: { scene: 'plaza', tier: 1, look: 'cinematic' } },
			{ caption: 'The audit removes one effect at a time and re-measures (leave-one-out), then ranks them.', task: { text: 'Run the audit (⚡ Audit, or P).', done: ( app, ctx ) => ctx.audited, solve: async ( app, ctx ) => { await ctx.audit(); } } },
			{ caption: 'Phones are tile-based: every fullscreen pass and extra buffer costs bandwidth. Make phone-friendly variant applies the standard substitutions.', task: { text: 'Make a phone-friendly variant.', done: ( app ) => app.store.get().userLooks.some( ( l ) => / · Mobile$/.test( l.name ) ), solve: ( app ) => app.actions.makeMobileVariant() } },
			{ caption: 'Compare the variant with its parent: it should still look like the same game.', setup: { compare: 'off' } },
		],
	},
	{
		id: 'L11', title: 'Directing agents (bonus)', minutes: 4,
		summary: 'Turn a look into instructions an AI agent follows.',
		steps: [
			{ caption: 'The brief: pillars first. They are the rules that must never break, each with a reason (agents follow rules better when they know why).', setup: { scene: 'harbor', tier: 1, look: 'sea-breeze', brief: 'brief' } },
			{ caption: 'Exact values come from the look: palette by role, lighting, materials, lines, the post chain in order. Nothing is invented.', setup: { brief: 'brief' } },
			{ caption: 'The brief tells the agent to build assets in code, like the kit: part-tagged, seeded, tiered, detail as geometry.', setup: { brief: 'brief' } },
			{ caption: 'Existing game? convertScene() styles it in one call.', task: { text: 'Open the Runtime tab of the brief.', done: ( app, ctx ) => ctx.briefTab === 'runtime', solve: ( app, ctx ) => ctx.openBrief( 'runtime' ) }, setup: { brief: 'runtime' } },
		],
	},
];

export const lessonById = new Map( LESSONS.map( ( l ) => [ l.id, l ] ) );
