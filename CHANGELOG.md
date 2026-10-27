# Changelog

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
