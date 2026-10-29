# Style Lab user guide

Style Lab helps you choose an art style for a game before you build it, and then hands that style to the AI agents that build it. You try looks on sample scenes, mix and tune them, compare against the plain default an agent would make, check what they cost on phones, and export a brief plus a drop-in runtime.

Open `dist/style-lab.html` in a recent Chrome or Edge (WebGPU; other browsers fall back to WebGL2). Everything is one file; it works from disk or any static host. Its libraries (three.js, Rapier, Tweakpane) load from a CDN; for a machine with no network, build the offline page (`npm run build:offline` → `dist/style-lab-offline.html`, about 5 MB, everything inlined).

## The screen

- **Top bar:** the scene, complexity (Blockout → Detailed), camera shot, turntable, **⚡ Audit**, **📝 Brief**, **🧪 Verify** (the guided tour) and **?** (the keyboard and gamepad map).
- **Left: the look gallery.** One card per look family. Tap to apply (with the current transition). Variant buttons switch within a family (Retro Console has PS1, 16-bit, Game Boy and CRT). Filter chips narrow the list; **🖼 Previews** renders every look on the current scene. Drag a card onto a recipe row in the Look tab to take that module from it.
- **Center: the view.** Drag to orbit, scroll to zoom. **Hold Space** (or the Hold to compare button) to see the plain baseline: the same scene with default materials, one sun, no post. **C** splits the screen; **F** flickers.
- **Right: the inspector.**
  - **Look:** the current look, its strength, morph and transitions, the coherence checker, recipe slots (take each module from another look or blend two), undo/redo, save, export and share.
  - **Parts:** give the terrain, water, foliage, buildings, props, characters, hero, VFX or sky its own look and modules; edit one part's values in Tune; isolate a part; the focus-hierarchy preset.
  - **Scene:** scene cards with designer notes, shots, prop density, readouts, the benefit matrix, `.glb` import and the pick tool. Thirteen scenes: the Lookdev Stage, eleven genre scenes (Harbor Isle, Village Garden, Graffiti Plaza, Torchlit Dungeon, Kart Circuit, Sky Platforms, Sci-fi Hangar, Meadow Shrine, Dusk Campsite, Tabletop Map, Noir Alley) and the Physics Toybox.
  - **Play:** walk mode, look zones, the level look plan, player visual modes and the gamepad tester.
  - **Analyze:** designer views (value, squint, silhouette, thumbnail, saturation, busyness, color-blind simulations, composition guides), the critic, **what changed** against the plain baseline, the extracted palette on a hue wheel, the histogram, the pipeline and the buffers the shaders see.
  - **Tune:** every parameter, by module, with a tooltip and a modified dot (click to reset). Click a name for its Learn card. **🎲 Randomize** rolls new values for the effects the look uses, within the ranges the built-in looks use (one Ctrl+Z undoes a roll); **Import .cube** loads a LUT.
  - **Learn:** lessons, the look breakdown ("Build it from scratch"), the glossary, the pipeline card and a full card for every parameter.

## A first session

1. The first visit opens a welcome with three ways in. Pick **Take the guided tour** (or press **🧪 Verify** later): the checks in learning order, grouped into sections, each with **Set it up for me** and a line on what it teaches. *Sign-off* checks are the ones whose report I need; *optional* steps are there to learn the tool. Each section links the lesson that goes deeper.
2. Pick a look in the gallery and hold **Space** to compare with plain. When you let go, a toast says **what changed**: for example, "Your look raised silhouette contrast 2.3× and reduced dominant hues from 9 to 4." The numbers stay in the Analyze tab.
3. Drag **Complexity** in the top bar: styles lift blockout geometry the most.
4. Open **Learn → Lessons → L1 Blockout to beautiful**: eight levers, zero new geometry.
5. Mix: in the **Look** tab, take Lines from Comic Ink on top of Golden Hour.
6. Press **📝 Brief**, copy it, and paste it into your agent's instructions.

## Looks, mixing and parts

A look is a sparse set of values grouped into modules: lighting, surface, lines, palette, atmosphere, lens, grade, media, retro, motion and quality. Mixing works per module: each row of the recipe takes its values from the base look, from another look, or from a blend of two. **Morph with** blends every module at once. **M** mutes a module (it takes neutral values) and **S** solos it.

Blending follows rules per value: numbers interpolate, colors and palettes mix in OKLab, angles take the short way round, and switches turn on while blending and land exactly at the end. The coherence checker flags combinations that contradict each other (two media, two eras, two kinds of ink, bleach bypass twice, bloom without tone mapping, oversaturation, fog that doesn't match the sky, grain on dither, busy lines) and offers a one-click fix.

Per part, materials are exact (surface, palette, hull lines, ambient light, baked vertex AO, vertex snap, texture filtering and the affine warp), and so are the fog amount and the animation step ("Animate on…": the hero smooth, the background on twos); screen effects (ink lines, AO, painterly, watercolor, halftone, hatching, paper) are masked by the part buffer, so they are approximate at part borders. Grade, lens, the rest of the atmosphere and display stay global: they simulate one camera.

### What's in the catalog

Beyond toon and PBR, the shading models include **Gooch** (cool shade to warm light, no black) and **matcap** (a painted sphere: clay, toon, chrome, pearl). Light and shadow: key, ambient, shadows, time of day, practicals, blob, contact, screen-space AO, **baked vertex AO** (free per frame) and **screen-space GI**. Atmosphere: gradient or **physical (Preetham) sky**, distance, height and banded fog, toon clouds, god rays and **ambient particles** (dust, pollen, embers, snow, rain). Lens: bloom, **lens flare**, **anamorphic streaks**, depth of field, tilt-shift, motion blur, **afterimage trails**, aberration, distortion, vignette, letterbox. Grade: CDL, contrast, saturation, hue, split tone, selective color, a LUT (generated presets or an **imported .cube**), gradient map, **sepia** and **bleach bypass**. Media: painterly (with **strokes that follow edges**), watercolor, halftone, hatching, misregistration, paper, grain and **sharpen**. Lines: hull outlines, screen-space ink, **image-space Sobel edges** (lesson L2 shows why geometry-aware ink wins) and the **interactable highlight** (coins, chests and item blocks are tagged; tag your own meshes with `userData.style.interactable`). Retro: pixelation, quantize and dither, vertex snap, **texture filtering** (PS1 nearest, N64 three-point), the **affine texture warp**, CRT and **VHS**. Motion: stepped animation, line boil, **low frame-rate rendering** (the whole frame, camera included) and **speed lines**.

The retro texture filters and the warp show only on textured surfaces: imported models, the alley's bricks and cobbles, the tabletop's planks.

**Importing a LUT:** Tune → **Import .cube** (or drop a `.cube` file on the window) loads any 3D LUT from Resolve, Photoshop, Lightroom or an engine; the LUT preset becomes **Imported .cube**. Saved looks and exported `look.json` files carry the LUT with them.

## Walk mode, zones and plans

Press **Tab** (or **L3** on a gamepad, or **Walk** in the Play tab) to walk: the scene's hero becomes your character. WASD or the left stick moves, Shift or a full stick runs, Space or A jumps, drag or the right stick looks around. On a phone or tablet a **touch stick** appears bottom-left (push it to the rim to run) with a **Jump** button; drag anywhere else to look. In the **Physics Toybox**, click or press RT to throw balls. The Tabletop Map has no hero: it's a board.

The Torchlit Dungeon, Dusk Campsite, Harbor Isle and Noir Alley have **look zones**: walk in and the look fades in over the zone's blend distance. Some zones name a look; others adjust whatever look is on (the crypt darkens and cools any look). Assign your own looks to zones in the Play tab.

The **level look plan** gives each scene a look and a transition; **▶ Play plan** tours them. **Player visual modes** are up to four looks a player could choose in your game's settings; **M** or **View** cycles them, and **+ Suggest High-contrast** adds an accessibility mode.

## Performance

**⚡ Audit** ranks the current look's effects by GPU cost: each effect is removed in turn and the frame re-measured (leave-one-out), after a warm-up, over interleaved rounds. The chart shows each effect's marginal cost; the rubric turns the look into fullscreen-pass equivalents and compares them with device budgets for a phone verdict (✅ phone-safe, ⚠️ high-end phones, ⛔ desktop only). **Make phone-friendly variant** applies the standard substitutions and saves "‹Look› · Mobile". **Open on phone** shows a QR code that runs the same audit on your phone; copy its report and paste it back.

The budgets are estimates until on-device reports replace them.

## Handing the style to an agent

**📝 Brief** writes the art direction from your current state:

- **For:** three.js with the Style Lab runtime (the default), three.js without it, or engine-agnostic (Godot, Unity, Unreal).
- **Length:** Short for a system prompt, Standard for `CLAUDE.md` / `AGENTS.md`, Full for everything.

Every brief has the pillars (rules that must never break, with reasons), a palette by role, lighting, materials, lines, atmosphere, the post chain in order, modeling rules, motion, performance, your plan and modes, and a checklist for every new asset. It tells the agent to build assets in code, the way the kit does: part-tagged three.js geometry, seeded randomness, complexity tiers, detail as geometry rather than textures.

**Files** has the brief, `look.json` and `looks.json`, `stylelab-runtime.js`, `stylelab-kit.js`, `starter.html`, `grade.cube`, palette files, a reference image, a contact sheet and a snapshot snippet; **⇩ Download all (.zip)** packs them into one file. To try the starter, put `starter.html`, `stylelab-runtime.js` and `stylelab-kit.js` in one folder and serve it (`npx serve`, or `python -m http.server`).

In your own game:

```js
import { createStyle } from './stylelab-runtime.js';
const style = await createStyle( { renderer, scene, camera, looks: [ LOOK ] } );
const wall = style.material( { part: 'architecture', color: '#d9a066' } );
style.convertScene( scene ); // an existing game: keeps colors, guesses parts
renderer.setAnimationLoop( () => { update(); style.render(); } );
```

## Your own models

Drop a `.glb` or `.gltf` on the window. Style Lab guesses a part for every mesh from names and shape (and from `userData.part` tags) and keeps colors, textures (KTX2 / Basis too), vertex colors, morph targets and the first animation. The pick tool (Scene tab) shows each guess and lets you change it. `snapshot-snippet.js` exports your game's scene with part tags. Draco, meshopt and Basis decoders load from the CDN when a file needs them.

## Sharing and saving

Your state saves itself in the browser. **🔗 Copy share link** puts the whole state (scene, look, mix, parts, tweaks) into the URL, compressed; no server. **Save as look** adds the current result to My looks; **Export / Import JSON** moves looks between machines. **Ctrl+Z / Ctrl+Shift+Z** undo and redo.

## Keys

| Action | Keyboard | Gamepad |
|---|---|---|
| Compare with plain | hold Space | hold X / □ |
| Split / flicker compare | C / F | LT (split divider) |
| Previous / next look | Q / E · 1–9 | LB / RB |
| Previous / next scene | [ / ] | D-pad ← / → |
| Complexity | - / = | D-pad ↓ / ↑ |
| Walk mode | Tab, then WASD, Space jumps | L3, left stick, A jumps |
| Designer views | V | Y / △ |
| Player visual mode | M | View / Select |
| Audit · Brief · Learn | P · B · L | — |
| Next camera shot | N | R3 |
| Hide UI | H | Menu / Options |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z | — |
| Close panels | Esc | B / ○ |
| Move inside an open panel | Tab | D-pad (←/→ change a slider or list), A presses |
| All keys | ? | — |

With a gamepad that supports it, changing looks gives a short rumble (Play → Gamepad tester turns it off).

## The Verify tour and your report

**🧪 Verify → Tour** lists every check, in learning order: does it run, looks and the plain baseline, lines and light, scenes, effects, mixing, play, training your eye, budgets, handing off, and other screens. Mark each ✅ Pass, ❌ Fail or ⚠️ Unsure and add a note; ratings tables (1–5) appear where a check asks for them. Tick **sign-off checks only** to see just the ones I need. **Report → Copy report** gives a short text with your environment, your marks and notes, the spike results and any errors; it also lists the sign-off checks still owed. Paste it back to me.

The **Spikes** tab runs the GPU feature tests on this machine, and **Environment** shows the browser, the GPU and every error and warning.

## When something goes wrong

- **Style Lab could not start:** the message says what failed and what to try (an up-to-date browser, hardware acceleration, or WebGL2 instead of WebGPU), with a button to copy the message.
- **A dropped file isn't a model:** a message says to drop a `.glb`, `.gltf`, a look `.json` or a `.cube` LUT.
- **A .cube file won't import:** the message says why (a 1D LUT, a missing `LUT_3D_SIZE`, or a file with the wrong number of rows).
- **A share link is cut off:** a message says so, and your last state stays on screen.
