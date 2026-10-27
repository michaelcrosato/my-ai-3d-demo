// Human checks for each milestone (design §6.14). The panel shows the current
// milestone first; earlier milestones stay available under a fold.
// `actions` name panel handlers; each button is labeled with what it does (panel.js ACTION_LABELS).
// `setup` is what "Set it up for me" loads: scene, look, tier, shot.

export const CURRENT_MILESTONE = 'M2';

export const CHECKS = [
	{
		id: 'M2-01', milestone: 'M2',
		title: 'Each scene loads and evokes its inspiration',
		steps: [ 'Open each scene (Scene tab cards, the top-bar picker, or [ / ]). Try a couple of looks on each.', 'Rate how well the scene evokes the games it is inspired by, and how much you like it (1–5).' ],
		expected: 'Every scene loads without errors in a second or two, and reads as its genre from its default camera.',
		ratings: [ 'garden', 'plaza', 'dungeon', 'kart', 'platforms', 'hangar', 'meadow', 'campsite' ],
	},
	{
		id: 'M2-02', milestone: 'M2',
		title: 'Animations play',
		steps: [ 'Garden: the goose waddles. Plaza: the skater loops. Kart Circuit: karts race. Sky Platforms: coins spin, the robot hovers.', 'Dungeon: torches flicker. Meadow: grass sways. Campsite: the fire flickers. Hangar: holograms turn.' ],
		expected: 'Everything moves smoothly, and the styled and plain images stay in sync when you hold compare.',
		setup: { scene: 'kart', look: 'sea-breeze', tier: 1 },
	},
	{
		id: 'M2-03', milestone: 'M2',
		title: 'Import one of your own .glb files',
		steps: [ 'Drop a .glb or .gltf onto the window (or Scene tab → Import .glb…).', 'Turn on Pick parts and click objects: check the guessed part and fix any that are wrong. Then try a few looks.' ],
		expected: 'The model loads, is framed by the camera, and gets sensible parts (ground → terrain, trees → foliage, people → characters, glowing things → vfx). Note what it guessed wrong.',
	},
	{
		id: 'M2-04', milestone: 'M2',
		title: 'Density changes props, not the layout',
		steps: [ 'Scene tab → Prop density: drag from ×0.5 to ×4 on the Garden, the Meadow and the Kart Circuit.' ],
		expected: 'More or fewer trees, flowers, grass, cones and props; landmarks, characters and the camera stay put. The readouts update.',
		setup: { scene: 'meadow', look: 'phone-safe-toon', tier: 1 },
	},
	{
		id: 'M2-05', milestone: 'M2',
		title: 'Benefit matrix',
		steps: [ 'Pick a look, then Scene tab → Benefit matrix.' ],
		expected: 'A 2×2 image (plain and styled, Blockout and Detailed) appears after a few seconds, and you can download it. It should show stylization helping the blockout most.',
		setup: { scene: 'harbor', look: 'sea-breeze', tier: 0 },
	},
	{
		id: 'M2-06', milestone: 'M2',
		title: 'Shots match each genre\'s camera',
		steps: [ 'On each scene, cycle the shots (N, R3, or the Shot picker): top-down garden, chase camera on the kart, isometric dungeon, over the shoulder in the hangar.' ],
		expected: 'Each shot frames the action the way its genre would.',
		setup: { scene: 'garden', look: 'phone-safe-toon', tier: 1 },
	},
	{
		id: 'M1-01', milestone: 'M1',
		title: 'Look buttons apply instantly',
		steps: [ 'Click each look in the left column (or press 1–5, Q / E, or LB / RB on a gamepad).', 'Do it on both scenes.' ],
		expected: 'The image changes right away. The first time a look loads, the status bar may say "compiled in … ms"; after that, switching is instant.',
		setup: { scene: 'harbor', look: 'plain', tier: 1 },
	},
	{
		id: 'M1-02', milestone: 'M1',
		title: 'Hold compare feels instant (keyboard and gamepad)',
		steps: [ 'Pick a look, then hold Space (or the Hold to compare button).', 'If you have a gamepad, hold X / □.' ],
		expected: 'The plain baseline appears on the very next frame with a PLAIN badge, and the look comes back the moment you let go.',
		setup: { scene: 'harbor', look: 'sea-breeze', tier: 1 },
	},
	{
		id: 'M1-03', milestone: 'M1',
		title: 'Split divider drags smoothly',
		steps: [ 'Press C (or Split), then drag the white handle across the view.', 'With a gamepad, pull LT: the trigger sets the divider position.' ],
		expected: 'Plain on the left, styled on the right; the divider follows without lag.',
		setup: { scene: 'lookdev', look: 'graffiti-rush', tier: 2 },
	},
	{
		id: 'M1-04', milestone: 'M1',
		title: 'Outlines stay stable while orbiting',
		steps: [ 'Orbit slowly around the boat, the dock and the houses (drag, or the right stick).', 'Then try Sea Breeze Toon (hull lines on characters only).' ],
		expected: 'No shimmering, gaps or cracks at hard edges (box corners, roof edges, masts). Thin ropes may break up when far away; note it if it bothers you.',
		setup: { scene: 'harbor', look: 'graffiti-rush', tier: 3 },
	},
	{
		id: 'M1-05', milestone: 'M1',
		title: 'Cel bands are crisp',
		steps: [ 'Look at the sphere, cylinder and mannequin.', 'Raise Surface → Light bands to 3, then 4 in the Tune tab.' ],
		expected: 'Hard, clean steps between tones without stair-stepping. Cast shadows land on the same tone as the shadowed side of each object, not darker.',
		setup: { scene: 'lookdev', look: 'sea-breeze', tier: 2, shot: 'close' },
	},
	{
		id: 'M1-06', milestone: 'M1',
		title: 'Complexity changes geometry, not the composition',
		steps: [ 'Drag Complexity through all four tiers (or press - / =), on both scenes.' ],
		expected: 'Objects stay where they are and the camera doesn\'t move. Only the detail changes: Blockout → Low-poly → Crafted → Detailed.',
		setup: { scene: 'harbor', look: 'phone-safe-toon', tier: 0 },
	},
	{
		id: 'M1-07', milestone: 'M1',
		title: 'Rate the four looks',
		steps: [ 'Apply each look on both scenes. Rate how well it evokes its inspiration, and how much you like it (1–5).' ],
		expected: 'Honest ratings, plus a note on anything that feels off ("needs more purple"). These tune the recipes.',
		ratings: [ 'sea-breeze', 'graffiti-rush', 'golden-hour', 'phone-safe-toon' ],
	},
	{
		id: 'M1-08', milestone: 'M1',
		title: 'Tune sliders are smooth; switches recompile briefly',
		steps: [ 'In the Tune tab, drag a few sliders (fog density, band softness, contrast).', 'Flip a switch with a 🟡 badge (Bloom, Screen-space ink).' ],
		expected: 'Sliders update every frame with no hitch. Switches rebuild once; the status bar shows the compile time.',
		setup: { scene: 'lookdev', look: 'sea-breeze', tier: 1 },
	},
	{
		id: 'M0-01', milestone: 'M0',
		title: 'Backend badge shows WebGPU',
		steps: [ 'Open the page normally (no ?backend= in the URL).', 'Look at the badge next to the title.' ],
		expected: 'It reads "WebGPU". If it reads "WebGL2", note your browser and version.',
	},
	{
		id: 'M0-02', milestone: 'M0',
		title: 'Works when opened from disk',
		steps: [ 'Download dist/style-lab.html from the repo.', 'Double-click it (opens as file://).' ],
		expected: 'The same scene renders and the Environment tab shows protocol "file:".',
	},
	{
		id: 'M0-03', milestone: 'M0',
		title: 'No errors while orbiting',
		steps: [ 'Drag to orbit and scroll to zoom for about 10 seconds.', 'Open the Environment tab.' ],
		expected: 'Errors (0). Warnings are fine; paste them anyway.',
	},
	{
		id: 'M0-04', milestone: 'M0',
		title: 'Spikes pass on your GPU',
		steps: [ 'Press "Run all spikes" below (takes a few seconds). The Spikes tab shows the details.' ],
		expected: 'Every spike is "go" or "go-fallback". Any "no-go" or "error" is exactly what I need to see.',
		actions: [ 'runSpikes' ],
	},
	{
		id: 'M0-05', milestone: 'M0',
		title: 'Forced WebGL2 also works',
		steps: [ 'Press "Reload with WebGL2" below (adds ?backend=webgl to the URL).', 'Press "Run all spikes" again. The report keeps the results from both backends.' ],
		expected: 'Badge reads "WebGL2", the scene renders, spikes are go or go-fallback.',
		actions: [ 'reloadWebGL', 'runSpikes' ],
	},
	{
		id: 'M0-06', milestone: 'M0',
		title: 'Resize and zoom stay sharp',
		steps: [ 'Resize the window, and try browser zoom (Ctrl/⌘ + and -).' ],
		expected: 'No stretching or blur; shapes stay crisp and correctly proportioned.',
	},
];
