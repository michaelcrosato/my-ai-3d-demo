# Changelog

## v1.1.0 — M10: the P2 stretch scope (2026-10-28)

Everything the design marked P2 ("stretch") and left unbuilt in v1.0.

**What's new**
- **Two scenes.** **Tabletop Map** (inspired by Civilization, Townscaper, Bad North): a hex board of terrain tiles on a wooden table, with forests, mountains, villages, a castle, two armies and dice, seen from a tilted top-down camera. **Noir Alley** (noir detective games): a wet night alley between brick walls, with neon, a street lamp, fire escapes, rain, a detective, and two look zones. Both build at four complexity tiers. The alley's bricks and cobbles and the table's planks are textured, so the retro texture filters show there.
- **23 new effects and options**, each with registry entries (Learn text, brief line, cost), a rubric entry and a contact-sheet cell:
  - Shading: **Gooch** (cool to warm) and **matcap** (clay, toon, chrome, pearl) shading models.
  - Light: **baked vertex AO** (per vertex, once per geometry, from the object's shape and its ground) and **screen-space GI**.
  - Atmosphere: a **physical (Preetham) sky**, **ambient particles** (dust, pollen, embers, snow, rain) and **per-part fog amount**.
  - Lens: **lens flare**, **anamorphic streaks**, **afterimage trails**.
  - Grade: **sepia**, **bleach bypass**, and **.cube LUT import** (Tune → Import .cube, or drop the file).
  - Media: **sharpen**, and **anisotropic Kuwahara** (strokes follow edges).
  - Lines: **image-space Sobel edges** (lesson L2 now shows why geometry-aware ink wins) and the **interactable highlight** (coins, chests and item blocks are tagged; `userData.style.interactable` tags yours).
  - Retro: **texture filtering** (PS1 nearest, N64 three-point), the **affine texture warp**, and **VHS**. Retro Console · PS1 now uses nearest texels and the warp.
  - Motion: **low frame-rate rendering** (the whole frame holds, camera included; hold-to-compare still swaps at once), **speed lines**, and **per-part stepped animation**.
- **What changed:** let go of hold-to-compare and a toast says how the look moved the frame away from plain ("raised silhouette contrast 2.3× and reduced dominant hues from 9 to 4"); the Analyze tab keeps the numbers.
- **🎲 Randomize** (Tune): new values for the effects the look uses, within the library's ranges; never rebuilds, one Ctrl+Z undoes it.
- **Touch stick** for walk mode on phones and tablets (and `?touch=1` anywhere), with a Jump button.
- **Gamepad:** a short rumble on look change (Play → Gamepad tester can turn it off), and **D-pad focus navigation** in open panels (↑/↓ move, ←/→ change sliders and lists, A presses, B closes).
- **⇩ Download all (.zip)** in Brief → Files: a store-only zip writer, no dependency.
- **Offline build:** `npm run build:offline` writes `dist/style-lab-offline.html` with three.js, Rapier, Tweakpane and uqr inlined (about 5 MB, not committed).
- **.glb import:** **KTX2** textures (KHR_texture_basisu: Basis transcoded, uncompressed KTX2 as is) and **morph targets** (the styled, plain and hull twins share the weights, so morph animation plays on all three).
- Two coherence rules (two kinds of ink; bleach bypass twice), nine glossary terms, and a Verify milestone (M10) with eleven checks in the tour.

**Faster**
- **The plain baseline renders only while it shows** (hold, split or flicker). Until now it was a second full scene render every frame, shadows included. Measured on a software GPU, frames take 10–20% less time and the draw calls halve. Compare still swaps at once: the baseline compiles with the scene and draws on the frame that shows it.
- **The canvas is no longer multisampled.** It only ever receives the post-processing quad, and the scene passes choose their own anti-aliasing, so the 4× canvas buffer was resolved for nothing every frame.
- **The built pages load three.js's minified builds** (same release): about 260 KB less to download (brotli) and a third of the JavaScript to parse. The dev page keeps the readable files.
- **three.js starts downloading with the page.** The tool page preloads its three files from the head; before, they waited for the whole page (the app script is inline at its end), and three.core waited for three.webgpu after that.
- **The Tune tab builds its ~300 controls when first opened**, not at start-up, and keeps them in sync only while it shows (every change used to refresh all of them, even hidden).

**What to test** (🧪 Verify → Tour, the M10 checks; about 30 minutes):
1. **M10-01** The new effects contact sheet (cells E63 on).
2. **M10-02** Tabletop Map and Noir Alley read as their genres.
3. **M10-04** PS1 textures: nearest, N64, the affine warp.
4. **M10-05** Effects in motion: speed lines, afterimage, VHS, low frame rate.
5. **M10-09** Touch stick on a phone; the gamepad in panels and the rumble.
6. Optional: M10-03, M10-06, M10-07, M10-08, M10-10, M10-11.

Then Report → **Copy report** and paste it back.

**Known**
- Snow, rain and dust are screen-light sprites: their extra MRT outputs are invisible, so ink lines, masks and AO ignore them. They don't receive shadows.
- Screen-space GI sees only what is on screen and is noisy on SwiftShader; it is the heaviest effect (4 FPE) and the phone-friendly variant turns it off.
- There is no screen-space reflection effect: the alley's puddles are glossy, so PBR looks catch the neon as highlights, not reflections.
- The custom LUT slot holds one imported .cube at a time; share links name it but don't carry it (look files do).
- The Tabletop Map has no hero, so walk mode says so there.

## v1.0.0 — M9: the guided tour, onboarding and release (2026-10-28)

**What's new**
- **The Verify panel is a guided tour.** Every check, in learning order, in twelve sections: Welcome; Does it run on your machine?; Looks and the plain baseline; Shapes, lines and light; Scenes, shots and your own models; Effects; Make it yours; Play it; Train your eye; Budgets; Hand it to an agent; On other screens. Every check has **Set it up for me** and a **What you'll learn** line. **Sign-off** checks (the reports I need) are marked apart from **optional** steps, and *sign-off checks only* hides the rest. Each section links the lesson that goes deeper, and a progress bar counts what you've done. No check was removed.
- **The report lists what's still owed:** every sign-off check from M3 on that you haven't marked.
- **Welcome:** a first visit offers the tour, Lesson 1, or just exploring. It doesn't show when a share link or the phone audit opens the page.
- **Keyboard and gamepad map:** press **?** (or the ? button) for every key and button; Esc closes it.
- **Friendlier failures:** if Style Lab can't start, the message says what to try, links a WebGL2 retry and has a copy button. Share links pasted into the address bar of an open tab now open too.
- **Phone layout:** inspector tabs wrap, wording no longer assumes a keyboard or a left-hand gallery, and touch screens get bigger buttons.
- **User guide** (`docs/user-guide.md`) and a **GitHub Pages workflow** (`.github/workflows/pages.yml`) that publishes `dist/` from `main` once you enable Pages (Settings → Pages → Source: GitHub Actions). Nothing is published until then.

**What to test** (🧪 Verify → Tour):
1. **M9-01** First visit: the welcome, the tour and the key map.
2. **M9-02** Phone and tablet layout (needs the page hosted, or your local network).
3. Optional: **M9-03** Problems explain themselves.
4. Every sign-off check from M3 on that you haven't reported yet. Tick *sign-off checks only*, work through them, then Report → **Copy report** and paste it back.

**Known**
- Every effect, look and check is verified automatically on SwiftShader (software WebGPU and WebGL2). Real GPUs, phones, gamepads and your eye are what the sign-off checks are for.
- The phone budgets are estimates until your M7-02 reports replace them.

## v0.10.0 — M8: education layer (2026-10-28)

**What's new**
- **Lessons** (Learn tab): eleven guided tours that drive the app, each step with a caption and a small task you can do yourself or press Show me for. L1 Blockout to beautiful, L2 Silhouettes and lines, L3 Light shapes, L4 Color, L5 Depth, L6 Focus and composition, L7 Texture and imperfection, L8 Coherence, L9 Motion, L10 Budgets, and a bonus L11 Directing agents. Back, Next and ✕ (which leaves the scene as it is); finished lessons get a tick.
- **Build it from scratch:** replays the current look one module at a time from neutral, with a caption for each. It works on your own looks too.
- **Analyze tab:** fifteen designer views (value, squint, silhouette, thumbnail, saturation heatmap, busyness, protan / deutan / tritan simulations, thirds, golden ratio, center cross, and the depth, normal and part-id buffers), the **critic**, the extracted palette on a hue wheel, a luminance histogram, and the pipeline strip with the buffers each effect reads. **V** (or **Y** on a gamepad) cycles the eye-training views.
- **The critic** reads a small frame every couple of seconds and flags flat values, clipping, too many hues, a weak focal point, noisy lines, a fog wall, and colors that merge for color-blind players. Each tip says why it matters and has a one-click fix.
- **Learn cards** are complete for every parameter: what it does, why it works, when to use and avoid it, typical values (from the library), cost, where it is seen, and a **🧪 Try this** experiment next to **▶ Show me**.
- **Glossary:** 34 terms (cel, LUT, dither, FPE…), searchable, linked to the parameters and lessons.

**What to test** (🧪 Verify → Checklist; about 25 minutes):
1. **M8-01** Take two lessons start to finish (Set it up for me → Start lesson L1).
2. **M8-02** Designer views help you judge a look.
3. **M8-03** The critic's tips are sensible.
4. Optional: **M8-04** Learn cards (Show me, Try this, the glossary), **M8-05** Build a look from scratch.

Then Report → **Copy report** and paste it back.

**Also in this version**
- Painterly and Layered Wilderness have more value contrast (the critic was right: Painterly's values spanned only a third of the range).
- The four dark looks that list the dungeon as a best scene (PS1, Game Boy, 1-Bit, Noir) read on it now: the dungeon's base light is brighter, the palette looks light in neutral white, and far isometric and top-down cameras count fog from part of the way to the focus.
- The runtime applies the look's lens width (`lens.fovScale`) to your camera, as the tool does: the FOV widens or narrows and the camera dollies so the subject keeps its size. Set `style.baseFov` when your game changes its FOV, or pass `lens: false` to `createStyle` to leave the camera alone. starter.html now matches the tool on looks with a lens (Graffiti Rush on the plaza was off).
- Still images (thumbnails, contact sheets, the effects sheet, exports) no longer show motion blur on a frozen frame; renders outside the animation loop read stale velocity, which smeared looks like Cinematic.
- Exports from the dev page (index.html) put the look into starter.html; only the built file did before.
- Offscreen work (captures, the audit, spikes, gallery previews) runs one job at a time. The Analyze tab's critic, capturing during an audit, used to stall it. Each offscreen render also advances three's node frame, so a capture right after an audit is exact and audit timings no longer skip effect passes.
- A lesson gives the looks it moves past their own Tune values back (Lesson 8 used to leave depth of field on Retro 16-bit).
- The starter parity check pauses the tool's loop while starter.html renders (both share one GPU process).

**Known**
- The critic's thresholds are tuned on the built-in looks, on two scenes. Where a rule describes a style rather than a mistake (Noir's crushed blacks, Golden Hour's backlit silhouettes), the tip still shows, marked as part of that look's style with the reason. Tell me when a tip seems wrong.
- "What changed" summaries (P2) are not in this version.

## v0.9.0 — M7: performance audit (2026-10-28)

**What's new**
- **⚡ Audit** (top bar, or P): ranks the current look's effects by GPU cost. It removes one effect at a time and re-measures (leave-one-out), after a warm-up, over interleaved rounds with a frozen clock, and shows a sorted bar chart of marginal costs in ms and % of the frame. Targets: desktop 1080p, phone portrait or landscape, phone at 0.75 render scale, this window, or a quick small run. It uses GPU timestamps when the browser offers them, else time to GPU idle, and says which.
- **Phone verdicts:** a static rubric scores every effect in fullscreen-pass equivalents (FPE: passes, texture taps, extra buffers, history), a calibration pass measures what 1 FPE costs on this machine, and a device budget table turns the total into ✅ phone-safe, ⚠️ high-end phones, or ⛔ desktop only. The budgets are marked as estimates until on-device reports replace them.
- **Recommendations:** the cheapest drops that reach each verdict ("Dropping Depth of field, Motion blur saves 6.2 ms (58%) → ✅ phone-safe"), plus draw calls, triangles, buffers, render-target memory and compile time per variant.
- **📱 Make phone-friendly variant:** the standard substitutions (no AO, DOF, motion blur or god rays; hull outlines instead of screen-space lines; FXAA instead of TRAA/SMAA; painterly radius 2 at half scale; emissive-only bloom; 1024 shadows), saved as "‹Look› · Mobile" in My looks.
- **📱 Open on phone:** a QR code that opens this look on your phone and runs the audit there, with a Copy report button for pasting the numbers back.

**What to test** (🧪 Verify → Checklist; about 20 minutes, plus your phone):
1. **M7-01** Run the audit and judge whether the numbers are plausible.
2. **M7-02** Run it on your phone via the QR code and paste the report (needs the page hosted, e.g. GitHub Pages once you enable it).
3. **M7-03** The mobile variants still look like their parents.
4. Earlier checks you haven't done yet (M3–M6).

Then Report → **Copy report** and paste it back.

**Known**
- The phone budgets in the rubric are estimates until on-device reports replace them.
- The audit times whole frames; on browsers without GPU timestamps it measures time until the GPU is idle, which includes some CPU overhead (the report says which timer it used).
- Always-on stages (tone mapping, the basic grade, vignette, grain, letterbox) can't be removed one at a time; their cost is part of "styled overhead".

## v0.8.0 — M6: agent brief and exports (2026-10-28)

**What's new**
- **📝 Brief** (top bar, or B): the art direction for your agent, generated from the look you're on (mixes, part looks and tweaks included). Three audiences: three.js with the Style Lab runtime, three.js without it (with the three.js building block for each effect), or engine-agnostic for Godot, Unity or Unreal. Three lengths: Short (under 300 words, for a system prompt), Standard (for CLAUDE.md or AGENTS.md) and Full (every value and per-part tables). Every brief has pillars, a palette by role, lighting, materials, lines, atmosphere, the post chain in order, modeling rules, motion, performance, your level plan and player modes, and a checklist.
- **Procedural assets in the brief:** the brief tells the agent to build assets in code the way the kit does (part-tagged three.js geometry, seeded randomness, complexity tiers, detail as geometry rather than textures), and the kit ships as **stylelab-kit.js**, a starter library with every scene as a worked example.
- **Files:** STYLE.md, look.json, looks.json (the look plus your plan, zones and modes), stylelab-runtime.js, stylelab-kit.js, **starter.html** (a small game wired to both, with your look), **grade.cube** (the grade as a 33³ LUT for other engines, baked by the tool's own grade code), palette.gpl and palette.png, reference.png, a contact sheet of your look on every scene, and snapshot-snippet.js (exports a game's scene as a part-tagged .glb for Style Lab). The built file carries the runtime and kit inside it, so exports work offline.
- **The runtime API:** `createStyle( { renderer, scene, camera, looks } )` with `style.material()`, `style.tag()`, `style.add()`, `style.convertScene()` (retrofit an existing game in one call: colors kept, parts guessed), `style.setLook()` with transitions, `style.setZoneWeights()`, `style.setParam()` and `style.setQuality()`.
- **🔗 Share:** the share link with a QR code.

**What to test** (🧪 Verify → Checklist; about 30 minutes, most of it with your agent):
1. **M6-01** Paste the brief into one of your agents and ask for a small scene. Report how close it gets and whether its assets follow the kit.
2. **M6-02** Open starter.html next to the tool and compare.
3. **M6-03** Try convertScene() on an existing agent-made game.
4. Optional tour: **M6-04** one brief for three audiences, **M6-05** grade.cube and the palette in another tool, **M6-06** share by link or QR code.
5. Earlier checks you haven't done yet (M3–M5).

Then Report → **Copy report** and paste it back.

**Known**
- grade.cube covers the display-space grade (lift/gamma/gain, contrast, saturation, hue, split tone, selective color, LUT preset, gradient map). Exposure, white balance and tone mapping happen before it, in HDR, and are listed in the brief instead.
- The no-runtime brief names three.js building blocks for each effect rather than generating TSL code.
- starter.html needs a static server next to stylelab-runtime.js and stylelab-kit.js; browsers don't load modules from file:// pages.

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
