# Changelog

## v0.7.0 — M5: walk mode, physics, gamepad, zones and plans (2026-10-28)

**What's new** (most of it in the new **Play** tab)
- **Walk mode** (Tab, or L3 on a gamepad): the scene's hero becomes your character, with a Rapier character controller (collision, steps, slopes, jumps) and a third-person camera that never ends up behind a wall. WASD or the left stick moves, Shift or a full stick runs, Space or A jumps, drag or the right stick looks around.
- **Physics Toybox**, a new scene: block towers, a pyramid and balls on a walled play mat. Click (or RT) to throw balls. Physics loads only when needed, steps at a fixed 1/60 s and replays deterministically.
- **Look zones** in the Torchlit Dungeon (a dark, cold crypt; warm lava; a Golden Hour courtyard), the Dusk Campsite (firelight; a cool, misty lakeshore) and Harbor Isle (Sea Breeze on the dock, a dusky lighthouse hill, a cozy village). Walk in and the look fades in over each zone's blend distance; the Play tab shows the weights and lets you assign any look to a zone.
- **Level look plan:** a look and a transition per scene; ▶ Play plan tours them.
- **Player visual modes:** up to four looks a player could pick in your game (M or View cycles them), plus a suggested **High-contrast** mode (heavier black lines, more value contrast, a color-blind-safe palette).
- **Full gamepad map** with Xbox and PlayStation glyphs (Appendix D of the design), and a **gamepad tester** that lights every button and shows both sticks against the deadzone.

**What to test** (🧪 Verify → Checklist; about 20 minutes, a gamepad helps):
1. **M5-01** Every gamepad button responds in the tester (tell us your pad model).
2. **M5-02** No stick drift at the default deadzone.
3. **M5-03** Walking into a zone changes the look smoothly.
4. **M5-04** Throwing props feels right.
5. **M5-05** Lines and dither hold up in motion.
6. Optional tour: **M5-06** plan your levels and play the plan, **M5-07** player visual modes.
7. Earlier checks you haven't done yet (M3, M4).

Then Report → **Copy report** and paste it back.

**Known**
- Walk mode uses the scene's hero as the player; in the kart scene that is the lead kart, which walks rather than drives.
- Physics colliders come from the Blockout (T0) geometry, so they match the layout but not every bevel at higher tiers.
- Zones that switch whole looks (the dungeon courtyard, the harbor dock) compile the new look's shaders the first time you approach them.
- The P2 scenes Tabletop Map and Noir Alley are not built yet.

## v0.6.0 — M4: look library, mixing and per-part styling (2026-10-28)

**What's new**
- **20 looks.** The 15 new ones: Garden Prank, Comic Ink, Painterly, Retro Console (PS1, 16-bit, Game Boy and CRT Arcade variants), Cinematic, Ligne Claire, Miniature Diorama, 1-Bit Dither, Synthwave Neon, Noir, Ink Wash, Anime Cel, Watercolor, Sketchbook and Layered Wilderness, plus a halftone variant of Graffiti Rush. The M1 looks gained toon clouds and water, haze, god rays and blob shadows.
- **Look gallery** on the left: one card per look family with variant buttons, filter chips (Toon, Ink, Paint, Retro, Lighting, Film, Phone-safe, My looks) and **🖼 Previews**, which renders every look on the current scene. 1–9 pick the first nine families.
- **Look tab: mixing.** Recipe slots take each module (lighting, surface, lines, grade…) from the base look or another look, or blend two looks with a slider; M mutes a module and S solos it. **Morph with** blends everything with one look. Drag a gallery card onto a slot row. Mixing follows per-value rules (colors and palettes mix in OKLab, angles take the short way round, switches turn on while blending and land exactly at the end).
- **Transitions:** Morph, Crossfade or Wipe, with a duration; every one lands exactly on the new look.
- **Coherence checker:** warnings when effects contradict each other (two media, two eras, busy lines, bloom clipping, oversaturation, a fog seam, grain on dither), each with a "why" and a one-click fix.
- **Parts tab:** give the terrain, water, foliage, buildings, props, characters, hero, VFX or sky its own look, and choose which modules it takes from it. ✎ Edit overrides points the Tune tab at one part. ◐ Isolate dims everything else. ★ Focus hierarchy makes the hero pop. Screen effects (brush strokes, ink lines, halftone, hatching, paper, AO) are masked to their parts; ink lines take each part's weight and color.
- **Undo / redo** (Ctrl+Z, Ctrl+Shift+Z; a slider drag is one step), **Save as look** (My looks), **Export / Import JSON** (or drop a look `.json` on the window) and **🔗 Copy share link**: the whole state (scene, recipe, parts, tweaks) compressed into the URL, no server.
- **Fixed:** TRAA rendered black when an effect after it sampled neighbors (chromatic aberration, distortion, painterly, watercolor). TRAA now resolves the finished image.

**What to test** (🧪 Verify → Checklist; about 25 minutes):
1. **M4-01** Mix two looks you like.
2. **M4-02** Style the ground differently from the buildings and characters.
3. **M4-03** Transitions feel smooth.
4. **M4-04** A share link opens the same state in another browser.
5. **M4-05** Rate the new looks (evokes / likes, 1–5, with notes).
6. Optional tour: **M4-06** the gallery, **M4-07** the coherence checker, **M4-08** undo, save and export, **M4-09** focus hierarchy.
7. Earlier checks you haven't done yet: M3-01, M3-02, M3-03, M3-10, M3-11.

Then Report → **Copy report** and paste it back.

**Known**
- Gallery previews render on demand (🖼 Previews), not automatically: each look compiles its own shaders, which takes a few seconds per look on first use.
- Crossfade and wipe blend from a still of the outgoing frame, not a live render of the old look, so animation in the old look pauses during the blend.
- Screen effects limited to some parts are masked by the part buffer, so their edges at part borders are approximate (a few pixels).
- With TRAA, animated grain is softened by the history blend.

## v0.5.0 — M3b: media, lines, water and anti-aliasing (2026-10-28)

**What's new** (Tune tab; every new effect has its own switch)
- **Media:** painterly brush strokes (a generalized Kuwahara filter with eight soft sectors), watercolor (edge darkening, granulation, wobble and bleed), halftone print (mono, or four rotated CMYK screens; optionally shadows only), post hatching (up to four crossing layers), print misregistration, and paper (newsprint, cold-press, canvas or kraft) under everything.
- **Shading patterns in the materials:** halftone dots and hatch lines that follow each surface's light bands (in screen or world space), and dithered 1-bit shading.
- **Surface:** color variation (hue and value noise, in world or object space), a vertical gradient that grounds objects, **toon water** (banded shallow-to-deep color from the real depth below the surface, shore foam and drifting foam lines) and wind controls (strength, speed, gusts, and sway for whole parts such as trees).
- **Lines:** opacity, colored lines (the darkened local color), distance fade, thicker lines in shadow, hand wobble with line boil (Motion → Line boil), and pencil, brush or ink textures.
- **Atmosphere:** height fog (pooled near the ground, integrated along the view ray) and drifting cel-shaded clouds.
- **Anti-aliasing modes:** Auto, None, FXAA, SMAA, MSAA and TRAA.
- The effects contact sheet now has 62 cells (M3a + M3b).

**What to test** (🧪 Verify → Checklist; about 20 minutes with M3a):
1. **M3-01** Render the effects sheet and report bad cells by id.
2. **M3-10** Painterly, halftone and hatching look right at your resolution.
3. **M3-11** No line crawl on slow orbits; boil works when you turn it on.
4. **M3-02** and **M3-03** from v0.4.0, if you haven't yet.
5. Optional tour: **M3-12** toon water, wind and clouds, **M3-13** anti-aliasing modes, and M3-04 to M3-09.

Then Report → **Copy report** and paste it back.

**Known**
- Pattern sizes are in pixels at 1080p, so dots and hatch lines shrink in small windows. That is deliberate (a brief means the same thing at any resolution); the effects sheet enlarges a few so they show at thumbnail size.
- Swaying meshes get no hull outline: the hull wouldn't follow the sway. Screen-space ink still works.
- Toon water renders after the opaque scene and copies its depth, so a look with toon water renders the styled pass without MSAA (FXAA instead).

## v0.4.0 — M3a: camera, grade and retro filters (2026-10-28)

**What's new** (all in the Tune tab; every new effect has its own switch, and its sliders never recompile)
- **Light and shadow:** ambient occlusion (with a tint and an "ink" mode that fills deep creases with flat color), contact shadows, blob shadows (they follow moving characters and fade as they jump), **time of day** (one Hour slider drives sun, sky, ambient light and fog together), practical-light brightness and flicker, and shadow-map resolution.
- **Lens:** depth of field (focus follows what the camera looks at), tilt-shift, god rays from the sun, motion blur, chromatic aberration, barrel or pincushion distortion, letterbox bars, and selective (emissive-only) bloom.
- **Grade:** lift / gamma / gain, vibrance, hue shift, selective color, six generated LUT presets (teal and orange, warm film, bleach bypass, cross-processed, faded print, cool night) and a gradient map (duotone).
- **Retro:** pixelation locked to an exact grid (every pixel is a whole number of screen pixels and a camera pan moves it by whole pixels), pixel-art edge highlights, posterize and palette quantization (PICO-8, Game Boy, CGA, NES-like, 1-bit or the look's palette, matched in OKLab), Bayer 2–16 and noise dithering, PS1 vertex snapping (hull outlines snap too), and a CRT (scanlines, shadow mask, curvature, glow, flicker).
- **Motion:** "animate on…" steps characters, water, wind and flicker at 8 or 12 fps while the camera stays smooth.
- **Effects contact sheet.** 🧪 Verify → M3-01 renders all 34 effect demos as labeled cells (E01–E34), so you can report bad cells by id.
- Verify checks now say what each one teaches, and optional tour checks are marked.

**What to test** (open `dist/style-lab.html`, then 🧪 Verify → Checklist; about 15 minutes):
1. **M3-01** Render the effects sheet and report any bad cells by id.
2. **M3-02** The retro pixel grid stays stable while you orbit; pixels never blur or shimmer.
3. **M3-03** Dither doesn't flicker or boil on slow orbits (sliding over moving surfaces is expected).
4. Optional tour: **M3-04** depth of field and tilt-shift, **M3-05** time of day, **M3-06** grounding (blob, contact, AO), **M3-07** grading, **M3-08** motion blur and stepped animation, **M3-09** palettes and CRT.

Then Report → **Copy report** and paste it back.

**Known**
- AO is screen-space GTAO at half resolution with a light 4-tap smoothing; expect a little noise at 1080p and up.
- God rays come from the sun's screen position, so they fade out when the sun is far outside the frame.
- Media effects (painterly, watercolor, halftone, hatching, paper), line styling, toon water, wind and AA modes arrive in M3b.

## v0.3.0 — M2: scene library, asset kit, .glb import (2026-10-27)

**What's new**
- **Ten scenes.** Eight new, each with its genre's camera shots and its own light rig and sky:
  - *Village Garden*: high, near-orthographic camera, with a goose on the loose.
  - *Graffiti Plaza*: low wide chase camera, rails, ramps and procedural graffiti.
  - *Torchlit Dungeon*: isometric, with flickering torches and a lava channel.
  - *Kart Circuit*: karts racing a stadium track past crowds.
  - *Sky Platforms*: floating platforms, coins and pipes.
  - *Sci-fi Hangar*: metal, emissive strips, a dropship and holograms.
  - *Meadow Shrine*: grass swaying in the wind, a gate and mountains.
  - *Dusk Campsite*: layered ridges, a campfire and a sunset.
- **Characters.** The mannequin, plus a goose, a skater, a robot and a knight, each with procedural animation and four detail tiers.
- **Asset kit** for the new scenes: buildings, fences, hedges, walls, pillars, stairs, ramps, rails, lamps, torches, gates, stands, tents, karts, coins, blocks, chests, a campfire, a ship, holograms, pines, flowers, grass, ridges and ponds.
- **Scene tab** (in the inspector): scene cards with designer notes, shot buttons, a **prop density** slider (×0.5–×4), and readouts (triangles, draw calls, objects, materials, geometries, build time). It also has the **benefit matrix**: one click renders plain vs. styled at Blockout and Detailed, with a download.
- **Import your own model.** Drop a `.glb` or `.gltf` on the window, or use Scene tab → Import. Every mesh gets a guessed part (tags, then names, then shape), and it keeps the model's colors, textures, vertex colors and first animation. **Pick parts** lets you click objects to see why each part was chosen and change it.
- **Baseline change.** The plain baseline now uses the model's own roughness and metalness (0.8 and 0 when unspecified), so the Plain look equals the baseline exactly.
- **Lens change.** A look's lens now *scales* each shot's own lens (`lens.fovScale`; Graffiti Rush is ×1.25) instead of setting an absolute FOV, and the camera dollies to keep the subject's size. Top-down and isometric cameras keep their character under every look.

**What to test** (open `dist/style-lab.html`, then 🧪 Verify → Checklist; about 20 minutes):
1. **M2-01** Rate each new scene: does it evoke its inspiration, and do you like it (1–5)?
2. **M2-02** Animations play: goose, skater, karts, coins, torches, grass, campfire, holograms.
3. **M2-03** Import one of your own `.glb` files, check the part guesses with Pick parts, and note what's wrong.
4. **M2-04** Prop density changes props but not the layout or camera.
5. **M2-05** The benefit matrix renders and downloads.
6. **M2-06** Each scene's shots match its genre's camera.

Then Report → **Copy report** and paste it back.

**Known**
- Compressed glTF: Draco and meshopt load decoders from jsDelivr when needed. KTX2 textures and morph targets aren't supported on the styled and plain twins yet.
- Ink on the Meadow's thousands of grass blades turns to noise under Graffiti Rush. That is exactly what the scene stress-tests (density vs. line noise); distance fade arrives in M3.

## v0.2.0 — M1: vertical slice, plain vs. styled (2026-10-27)

**What's new**
- **Two scenes at four complexity tiers.** *Harbor Isle* (an island village with a lighthouse, a dock, a sailboat, sea, clouds and distant islands) and the *Lookdev Stage* (canonical shapes, a mannequin, a house, a tree, a color chart and a gray card). Blockout → Low-poly → Crafted → Detailed: the same layout, more detail (Harbor: 3.4k → 7.7k → 75k → 314k triangles).
- **Five looks, one tap each.** Plain (the agent-default baseline), Sea Breeze Toon, Graffiti Rush, Golden Hour and Phone-Safe Toon.
- **The style runtime.**
  - Cel, half-Lambert, flat and stylized-PBR shading, with shadow tint, toon specular and rim.
  - Hull outlines per part, and screen-space ink (depth, normal and part/object ids).
  - Sky-tinted, optionally banded fog; a gradient sky with a sun disc.
  - Bloom, exposure, white balance, tone mapping, contrast, saturation, split toning, vignette and grain.
- **Compare.** The plain baseline renders every frame beside your look, so *Hold to compare* (Space, gamepad X), *Split* (C, gamepad LT) and *Flicker* (F) switch on the next frame.
- **Tune.** The Tune tab is generated from the parameter registry: 82 parameters (81 with a control; palettes arrive with mixing in M4), each with a tooltip and a Learn card (what it does, why it works, typical values, cost, its line in an agent brief, and **Show me**). It has per-module reset and **Look strength**. Switches show a cost badge and the status bar shows the rebuild and compile time.
- **Input.** Keyboard: 1–5, Q/E, [ ], - =, N, T, H, ?. Gamepad: X, LB/RB, LT, right stick, D-pad, R3, Menu.
- **Verify.** M1 checklist with **Set it up for me** and a look-ratings form.
- **Test API.** `applyLook(id | json)`, `setParam`, `setStrength`, `compare`, `freeze`, `capture`/`diff`, `contactSheet`.

**What to test** (open `dist/style-lab.html`, then 🧪 Verify → Checklist; about 15 minutes):
1. **M1-01** Look buttons apply instantly, on both scenes.
2. **M1-02** Hold compare (Space, and gamepad X if you have one) feels instant.
3. **M1-03** The split divider drags smoothly (mouse, and gamepad LT).
4. **M1-04** Outlines stay stable while orbiting: no shimmer, gaps or cracks at hard edges.
5. **M1-05** Cel bands are crisp, and cast shadows land on the shadow tone, not darker.
6. **M1-06** Complexity changes geometry, never the composition.
7. **M1-07** Rate the four looks (evokes its inspiration / I like it, 1–5).
8. **M1-08** Sliders are smooth; switches recompile once.

Then Report → **Copy report** and paste it back.

**Known**
- Only two scenes so far; the rest of the library arrives in M2. The per-part Parts tab, mixing and undo arrive in M4.
- The first time a look is applied, its shaders compile (about 0.5–1 s in a software renderer, much less on a GPU). The status bar shows the time.
- Golden Hour is backlit by a very low sun, so the sea glares and the hero shot reads hazy. That is the recipe's starting point; your rating decides how far to pull it back.

## v0.1.1 — Verify panel fixes from the first hardware run (2026-10-27)

M0 passed on real hardware (Chrome 156 / Windows / RTX 3060 Ti): all six checks pass, and all 8 spikes are go on WebGPU and WebGL2. Details: [docs/spikes.md](docs/spikes.md#real-hardware).

**Fixed**
- Checklist buttons are labeled with what they do (**▶ Run all spikes**, **↻ Reload with WebGL2**) instead of "Set it up for me", and M0-05 has both.
- The report keeps one spike run per backend. One copied report now covers the WebGPU and WebGL2 runs, so you don't need to paste results into notes.

**What to test:** nothing new is required. If you open the new build, the checklist starts fresh, because results are stored per build.

## v0.1.0 — M0: foundations and API spikes (2026-10-27)

**What's new**
- One-file build: `npm run build` writes `dist/style-lab.html` (app and CSS inlined; three.js r182, Rapier, Tweakpane and uqr load from jsDelivr through the import map) and `dist/stylelab-runtime.js`.
- Renderer bootstrap: WebGPU first with automatic WebGL2 fallback, `?backend=webgl` to force WebGL2, DPR cap (`?dpr=`), resize handling, orbit camera, GPU timing in the status bar.
- A test stage with canonical shapes under a typical "agent default" setup (standard PBR, hemisphere + shadowed sun, ACES).
- The 🧪 **Verify** panel: M0 checklist, spike runner, environment and captured errors, and a copyable report.
- `window.__stylelab` test API: `ready`, `capture()`, `runSpikes()`, `errors()`, `frameStats()`, `report()`.
- Runtime building blocks proven by the spikes: `StyleLightingModel` (cel ramp), outline normals + hull material, GPU timers.
- Tests: `npm test` (14 unit tests) and `npm run smoke` (5 headless runs × 8 spikes, served offline from `node_modules`).
- Spike results and decisions: [docs/spikes.md](docs/spikes.md). All 8 are go on WebGPU and WebGL2.

**What to test** (open `dist/style-lab.html`, then 🧪 Verify → Checklist; about 5 minutes):
1. **M0-01** The badge next to the title reads **WebGPU**.
2. **M0-02** The downloaded file works when double-clicked (`file://`).
3. **M0-03** Orbit for about 10 s, then check the Environment tab shows no errors.
4. **M0-04** Spikes tab → **Run all spikes** on your GPU.
5. **M0-05** **Reload with WebGL2**, then run the spikes again. The report keeps both runs.
6. **M0-06** Resize the window and zoom the browser; everything stays crisp.

Then Report → **Copy report** and paste it back.

**Known**
- Rapier logs one harmless deprecation warning during init. It comes from inside the compat build (see docs/spikes.md §8).
- The headless test numbers come from a software GPU, so timings say nothing about real hardware.
