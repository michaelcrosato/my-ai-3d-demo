# Style Lab — Design Document

| | |
|---|---|
| **Project** | my-ai-3d-demo (working product name: **Style Lab**) |
| **Status** | Draft v1, design before implementation |
| **Date** | 2026-10-27 |
| **Maturity target** | Prototype / alpha |
| **Deliverable** | One HTML file (`dist/style-lab.html`); pinned dependencies load from a CDN |
| **Core stack** | three.js r182 (`WebGPURenderer` + TSL, automatic WebGL2 fallback), Rapier 0.19.3 (`@dimforge/rapier3d-compat`), Gamepad API |

> **In one sentence:** load a sample scene, tap a look, mix and tune it, hold a button to compare against plain, check what it costs on phones, then export the style as a brief and a drop-in runtime, so everything your agents build comes out matching.

---

## Contents

1. [Why this exists](#1-why-this-exists)
2. [Goals, non-goals, success criteria](#2-goals-non-goals-success-criteria)
3. [Users and core journeys](#3-users-and-core-journeys)
4. [Design principles](#4-design-principles)
5. [Experience design](#5-experience-design)
6. [Feature specifications](#6-feature-specifications)
7. [Technical architecture](#7-technical-architecture)
8. [Testing and verification](#8-testing-and-verification)
9. [Milestones](#9-milestones)
10. [Risks, spikes and open questions](#10-risks-spikes-and-open-questions)
11. [Effort level per milestone](#11-effort-level-per-milestone)
- [Appendix A — Look recipes](#appendix-a--look-recipes)
- [Appendix B — Example agent brief](#appendix-b--example-agent-brief)
- [Appendix C — Runtime API](#appendix-c--runtime-api)
- [Appendix D — Input map](#appendix-d--input-map)
- [Appendix E — Lessons](#appendix-e--lessons)
- [Appendix F — Glossary seed](#appendix-f--glossary-seed)

---

## 1. Why this exists

### 1.1 The problem: programmer art by default

Games built by today's frontier coding agents are usually made of primitives with default materials. They work, but they look generic. Every symptom below has a cheap, global fix, and each fix is a control in Style Lab.

| Symptom | Root cause | Lever in Style Lab |
|---|---|---|
| Objects blend into each other and the background | No edge or value separation | Outlines, rim light, value grouping |
| Sterile "default CG" look | Untextured PBR on primitives; perfectly sharp edges | Cel ramps, bevels, color variation, grain |
| Colors fight each other | No palette or harmony rules | Palette remap by role, hue-shifted shadows, grading |
| No depth or scale | No atmosphere, AO or depth cues | Fog, atmospheric perspective, AO, depth of field |
| Objects look like they float | No contact shadows | AO, contact shadows, blob shadows |
| The eye doesn't know where to look | Detail and contrast are uniform | Vignette, DOF, saturation and contrast hierarchy |
| Every asset looks like a different game | Each asset is styled ad hoc | One global pipeline applied to everything |
| The classic look: sky-blue `#87CEEB` background, gray ground, one white sun | The agent's defaults | Gradient sky, tinted ambient, time of day |

### 1.2 Why stylization works so well on simple geometry

- **It changes what viewers expect.** Low detail reads as a choice, not as missing effort. Photoreal lighting on a box shows that it is a box. A two-tone cel ramp plus an ink line makes it read as a *drawing* of a box.
- **Lines and flat light shapes carry form.** On simple geometry they do the job that textures and detail normally do, so primitives look finished.
- **A global pipeline gives consistency for free.** Most of what makes art direction feel intentional is consistency: the same rules on every object.
- **The ROI is very high.** A style pipeline is a few hundred lines of shader code, written once. It improves every existing asset and every future level, and agents can't forget to apply it.

### 1.3 More than one look per game

A game can ship several looks:
- **per level or biome** (the dungeon looks different from the overworld)
- **per narrative moment** (flashback, dream, boss phase)
- **as a player-selectable visual mode** (Classic, Comic, Retro, High-contrast)

Style Lab treats a look as data that can be switched and blended at runtime. It lets you preview and plan that ([§6.10](#610-looks-in-a-game-switching-zones-and-plans)).

---

## 2. Goals, non-goals, success criteria

### Goals

| ID | Goal |
|---|---|
| G1 | A broad set of procedural sample scenes inspired by popular games and genres, at adjustable model complexity |
| G2 | A complete catalog of stylization filters, every one of them fine-tunable |
| G3 | One-tap looks (including the 8 requested), mixing looks, and styling parts of the scene separately |
| G4 | An honest comparison against a plain baseline: hold one button, or use a split wipe |
| G5 | A one-button performance audit that ranks effects by cost and says what will run on phones |
| G6 | Export of the chosen style as an agent brief, a machine-readable look file and a drop-in runtime, so games reproduce the preview exactly |
| G7 | Teaching: every control explains what it does and why; lessons and analysis views build design skill |
| G8 | Planning multi-look games: a look per level or zone, transitions, player-selectable modes |
| G9 | Ship as one HTML file that works from `file://` and from any static host |

### Non-goals for the prototype

- FPS targets and optimization of the tool itself (explicitly deferred).
- Production-grade art. Scenes evoke their inspiration; they are not recreations.
- Asset pipelines for other engines. We export an engine-agnostic spec, a `.cube` LUT and palettes; code only for three.js.
- Accounts, servers, cloud storage, or calling LLM APIs from inside the tool.
- Copyrighted assets, logos or characters. Games are named only as "inspired by" references, in text.

### Success criteria for the alpha

| # | Criterion | How it is measured |
|---|---|---|
| S1 | A new user gets from first open to a copied brief in 5 minutes or less, without docs | User walkthrough in the Verify panel |
| S2 | Each requested look is recognizable as its inspiration | User rating of at least 4/5 in the Verify panel |
| S3 | Holding compare swaps on the next frame | Verify panel, plus a test API timing check |
| S4 | The exported runtime reproduces the preview | Starter-game export compared to the tool; mean pixel difference within tolerance in the smoke test |
| S5 | Every parameter has learn text, a range, a neutral value and a cost class | Unit test on the parameter registry |
| S6 | The perf audit is repeatable: rankings stable, totals within ±10% run to run | Run the audit twice |
| S7 | No console or GPU errors across all scene × look combinations on the WebGL2 path | Playwright smoke test |

---

## 3. Users and core journeys

**Personas**
- **Director-dev (primary).** Builds games with coding agents and isn't an artist. Wants the game to look good and consistent, fast.
- **Learner.** Wants to understand why some games look good. Uses the lessons and analysis views.
- **The agent (secondary consumer).** Reads the exported brief and runtime. It needs exact numbers, rules and code, not adjectives.

**Journeys**

| ID | Journey | Steps |
|---|---|---|
| J1 | Find my look | Pick the closest scene (or import your own `.glb`) → tap looks → mix → tune → hold compare → perf audit → copy brief |
| J2 | Fix one scene | Import or pick a scene → style parts separately (e.g., painterly ground, inked characters) → brief for that scene |
| J3 | Plan a multi-look game | Assign looks to levels and zones → walk through the transitions → export the plan plus look-switching code |
| J4 | Will it run on phones? | Perf audit → generate a mobile variant → open on a phone via QR → audit on the device → paste the report |
| J5 | Learn | Lesson "Blockout to beautiful" → designer views → critic tips |

---

## 4. Design principles

| # | Principle | What it means in practice |
|---|---|---|
| P1 | **Preview = runtime** | The renderer the tool uses *is* the exported runtime. Nothing has to be translated, so nothing drifts. |
| P2 | **One parameter registry drives everything** | UI, mixing, serialization, brief text, perf metadata and education all read the same registry entries. |
| P3 | **Every control teaches** | Each control answers: what it does, why it works, when to avoid it, what it costs. |
| P4 | **Honest comparisons** | Same geometry, camera and time. A defined baseline. Optional brightness matching, because louder isn't better. |
| P5 | **Deterministic** | Seeded scenes, fixed camera shots and a freezable clock make screenshots and audits reproducible. |
| P6 | **Structure vs. value** | Toggling an effect rebuilds the shader graph; moving a slider only updates uniforms. |
| P7 | **Resolution independent** | Pixel sizes are specified at a 1080p reference and scaled, so a brief means the same thing at any resolution. |
| P8 | **Coherence over quantity** | The tool warns when effects contradict each other (two media, two eras, two cameras). |
| P9 | **One file to share, modular source** | Develop in modules; a build step inlines them into one HTML file. |

---

## 5. Experience design

### 5.1 Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Style Lab │ Scene: Harbor Isle ▾ │ Complexity  Blockout ●───○───○───○ Detailed │ Shot ▾ │
│           │                      │      ⚡ Audit   📝 Brief   🎓 Learn   🧪 Verify   ⚙ │
├───────────────┬────────────────────────────────────────────────────┬─────────────────┤
│ LOOKS         │                                                    │ INSPECTOR       │
│ ┌───────────┐ │                                                    │ Recipe │ Parts  │
│ │ live thumb│ │                  3D viewport                       │ Tune   │ Learn  │
│ │ Sea Breeze│ │        (split-wipe handle when comparing)          │ Analyze         │
│ └───────────┘ │                                                    │                 │
│ ┌───────────┐ │      "PLAIN" badge while compare is held           │ contextual      │
│ │ Graffiti  │ │                                                    │ content         │
│ └───────────┘ │                                                    │                 │
│ My looks …    │                                                    │                 │
├───────────────┴────────────────────────────────────────────────────┴─────────────────┤
│ [Hold to compare ␣] [Split C] [Flicker F] │ pipeline ▭▭▭▭▭ │ WebGPU · 4.2 ms · 38k tris │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- **Narrow screens (< 900 px):** drawers become bottom sheets, looks become a horizontal carousel, and the compare button floats bottom-center within thumb reach.
- **Neutral-gray UI.** No saturated chrome, so the interface doesn't bias color judgment. One small accent color, for focus only. The Learn panel says why.
- **Hide UI** (`H`, or gamepad Menu) gives a clean, full-screen view for judging and screenshots.
- **The pipeline strip** at the bottom shows live thumbnails of each stage (scene, depth, normals, lines, grade, final). Clicking one shows it full-screen and opens its Learn card.

### 5.2 First run

1. The tool opens on **Harbor Isle**, complexity **Blockout**, look **Plain**. A coach mark says: *"This is what a typical agent-made scene looks like. Tap a look →"*
2. After the first look is tapped: *"Hold Space (or the Compare button) to see the difference."*
3. After three looks: it offers the three-minute lesson *Blockout to beautiful*.

Every coach mark can be dismissed. **Settings → Reset tips** brings them back.

### 5.3 Input

Mouse, touch, keyboard and gamepad all work. The core actions are one key or one button each:

| Action | Keyboard / mouse | Touch | Gamepad (standard mapping) |
|---|---|---|---|
| Hold compare (plain) | hold `Space` | hold Compare button | hold `X` / `□` |
| Split wipe | `C`, then drag | Split button, then drag | `LT` (analog sets the divider position) |
| Previous / next look | `Q` / `E` | swipe the look bar | `LB` / `RB` |
| Previous / next scene | `[` / `]` | scene picker | D-pad ← / → |
| Complexity tier | `-` / `=` | slider | D-pad ↓ / ↑ |
| Orbit / look | drag | one-finger drag | right stick |
| Walk mode | `Tab`, then `WASD` | virtual stick (P2 ✓) | `L3` toggles; left stick moves |

The full map is in [Appendix D](#appendix-d--input-map).

### 5.4 Cameras

- **Orbit** (default) using `OrbitControls`.
- **Shots.** Each scene defines Hero, Gameplay, Wide and Close-up shots that match the genre's usual camera: top-down for the garden, chase cam for the kart circuit, isometric for the dungeon. A look is only judged fairly from the camera the game will actually use.
- **Turntable** auto-rotation for hands-free comparison.
- **Walk mode.** A third-person character with a Rapier controller. It tests looks in motion and triggers look zones ([§6.10](#610-looks-in-a-game-switching-zones-and-plans)).
- **FOV and focal length belong to the look** (lens module). Lesson point: wide lenses exaggerate, long lenses flatten.

---

## 6. Feature specifications

Priorities: **P0** = vertical slice, **P1** = alpha, **P2** = stretch. **P2 ✓** marks stretch items built in v1.1 (M10).

### 6.1 Scene library

All scenes are built procedurally in code from a shared asset kit, with a seeded RNG. They contain no logos, text or characters copied from games. Each scene card carries designer notes saying what the scene stress-tests.

| ID | Scene | Inspired by | Default camera | What it stress-tests | Pri |
|---|---|---|---|---|---|
| `lookdev` | **Lookdev Stage** | Studio turntables, material test charts | Turntable, 3/4 | Canonical shapes (sphere, cube, torus knot, beveled box, cylinder), mannequin, house, tree, rock, gray card, color chart. The reference scene for every look. | P0 |
| `harbor` | **Harbor Isle** | *The Wind Waker*, *Sea of Thieves* | High third-person | Water and foam, big sky, clouds, distant islands (atmospheric perspective), thin details (masts, ropes) | P0 |
| `garden` | **Village Garden** | *Untitled Goose Game*, *Animal Crossing* | High angle, near-orthographic | Flat pastel readability, soft contact shadows, many small props, goose character | P0 |
| `plaza` | **Graffiti Plaza** | *Jet Set Radio / Jet Grind Radio*, *Bomb Rush Cyberfunk* | Low chase cam, wide FOV | Thick lines on a hard-surface city, saturated paint, rails, procedural graffiti decals, skater | P1 |
| `dungeon` | **Torchlit Dungeon** | *Zelda* dungeons, *Hades*, *Diablo* | Isometric | Darkness and value contrast, flickering point lights, lava emissive, bloom | P1 |
| `kart` | **Kart Circuit** | *Mario Kart*, *OutRun* | Chase cam | Speed and motion blur, repeated props, track markings, crowd stands | P1 |
| `platforms` | **Sky Platforms** | *Super Mario 64*, *Astro Bot* | 3/4 side | Primary colors, readable jumpable surfaces, coins, blob shadows | P1 |
| `hangar` | **Sci-fi Hangar** | *Metroid Prime*, *Halo* | Over-shoulder | Metal, emissive strips, holograms, chromatic aberration and scanlines, reflections | P1 |
| `meadow` | **Meadow Shrine** | *Breath of the Wild*, *Ōkami*, *Ghost of Tsushima* | Third-person | Instanced grass with wind, foliage density vs. line noise, painterly looks | P1 |
| `campsite` | **Dusk Campsite** | *Firewatch*, *A Short Hike* | Third-person | Layered silhouettes, colored fog bands, campfire light, golden hour | P1 |
| `tabletop` | **Tabletop Map** | *Civilization*, *Townscaper*, *Bad North* | Tilted top-down | Tilt-shift miniature look, hex tiles, units | P2 ✓ |
| `toybox` | **Physics Toybox** | Physics sandboxes such as *Gang Beasts* | Orbit | Motion, temporal stability of lines and dither, Rapier props you can throw | P2 ✓ |
| `alley` | **Noir Alley** | Noir detective games | Street level | Night, wet reflections (SSR), neon, rain, black and white | P2 ✓ |

**Scene contract** (one module per scene):

```js
export default {
  id: 'harbor', name: 'Harbor Isle',
  inspiredBy: ['The Wind Waker', 'Sea of Thieves'], genre: 'open-sea adventure',
  notes: 'Watch the foam lines and the distant islands: toon looks succeed or fail on water and haze.',
  shots: { hero: { pos, target, fov }, gameplay: { … }, wide: { … }, close: { … } },
  focus: [0, 1.2, 0],                       // default focus point for DOF and vignette
  lightRig: { key: { elevation: 50, azimuth: 135, color: '#ffffff', intensity: 3 },
              ambient: { sky: '#bcd8ff', ground: '#6b6b5a', intensity: 0.6 }, practicals: [] },
  sky: { zenith: '#4d8fe0', horizon: '#cfe6ff', ground: '#5a6b5a' },
  build(kit, { tier, density, rng }) {      // must be deterministic for a given seed
    return { root, animate(t, dt) {}, colliders: [], zones: [], spawn: [0, 0, 0] };
  },
};
```

**Import your own scene (`.glb`), P1.** Drag and drop a file onto the window; `GLTFLoader` loads it. Parts are auto-classified, in this order:
1. `userData.part` / glTF `extras.part`, when present
2. mesh and material name keywords (`ground`, `terrain`, `tree`, `leaf`, `wall`, `roof`, `char`, `player`, …)
3. geometry heuristics (the largest roughly horizontal mesh at the lowest height is terrain; emissive materials are VFX)

You can reassign parts with the pick tool. The exported brief includes a five-line **scene snapshot snippet** (via `GLTFExporter`, part tags in `extras`) that agents add to their game behind a debug key. You drop the resulting `.glb` into Style Lab to try looks on **your actual game**.

### 6.2 Model complexity

The **Complexity** slider rebuilds the scene at one of four tiers. Layout, colors and camera stay identical, so only the geometry changes.

| Tier | Name | What changes | Order-of-magnitude triangles (Harbor) |
|---|---|---|---|
| T0 | **Blockout** | Raw primitives, minimal segments, sharp edges, one color per object. A typical agent's first pass. | ~5k |
| T1 | **Low-poly** | Intentional faceting, secondary shapes (roof overhangs, window frames), flat normals, 2–3 colors per object | ~20k |
| T2 | **Crafted** | Bevels (`RoundedBoxGeometry`), smooth normals, trims and small props, color roles | ~80k |
| T3 | **Detailed** | Higher subdivision, noise displacement, instanced micro-detail (shingles, planks, leaf clusters), procedural surface textures | ~300k |

Extra toggles, independent of tier: **Bevels**, **Smooth/flat normals**, **Surface detail**, **Color variation**, and **Density** (prop count ×0.5–×4).

**Readouts:** triangles, draw calls, objects, materials and pipelines, from `renderer.info`.

**Benefit matrix** (P1). A one-click 2×2 snapshot: rows plain/styled, columns T0/T3, current look. It shows the tool's thesis in one image.

**What the slider teaches:**
1. Stylization lifts T0 and T1 the most.
2. At T3, heavy outlines turn into noise. Lower line density with distance fade or a higher crease threshold.
3. Bevels catch highlights and break lines. They are the cheapest way to make primitives look crafted.
4. Put detail where the eye goes.

**Implementation.** Builders are pure functions `(tier, rng, opts) → Object3D`. Geometry is cached per `(builder, tier, variant)`. Characters are procedural rigs (capsules, spheres, tubes) with procedural idle and walk cycles. Each tier adds features: T0 is a capsule and a head; T2 adds hands, hair caps and eyes; T3 adds face detail, clothing layers and accessories. Lesson point: characters need faces to read as characters.

### 6.3 Parts taxonomy

Every mesh has a **part**. Parts are what make "ground one look, buildings and characters another" possible. Part IDs are written to an ID buffer.

| Part | Examples | Typical role in a style |
|---|---|---|
| `sky` | background, clouds, sun disc | Sets the palette's key and the fog color; usually no lines |
| `terrain` | ground, roads, floors, cliffs | Largest area; carries the base value of the image |
| `water` | sea, ponds, rivers | Special shading (depth color, foam) |
| `foliage` | trees, grass, bushes, flowers | Instanced; wind; prone to line noise |
| `architecture` | buildings, walls, bridges, ruins | Hard surface; lines read well |
| `props` | crates, barrels, fences, signs, vehicles | Mid-scale detail |
| `characters` | NPCs, enemies, animals | Where attention goes; rim light, hull lines |
| `hero` | the player character | Inherits from `characters`; used for focus hierarchy |
| `vfx` | emissive, fire, magic, diegetic UI, particles | Bloom source; usually unlit |

There are 16 ID slots, so custom parts can be added later.

### 6.4 Filter and effect catalog

Key:
- **Where:** `Mat` = inside materials, `Scene` = lights and objects, `Post` = screen-space, `Cam` = camera.
- **Per part:** ✓ = exact (material-level), *mask* = post effect masked by the part buffer (approximate at part edges), — = global only.
- **Cost on phones:** 🟢 cheap · 🟡 moderate · 🔴 heavy. This is the static rubric; the audit measures actual cost.
- **r182 building block:** the three.js r182 node or class to build on. Display nodes live in `three/addons/tsl/display/`; these exports were verified against the r182 package.

#### A. Light and shadow

| Effect | Where | Key parameters | Per part | Cost | r182 building block | Pri |
|---|---|---|---|---|---|---|
| Key light (sun, moon, torch) | Scene | elevation, azimuth (scene-relative), color (hex or Kelvin), intensity | — | 🟢 | `DirectionalLight`, `PointLight` | P0 |
| Ambient (sky/ground hemisphere) | Mat | sky color, ground color, intensity | ✓ | 🟢 | custom `indirect()` in lighting model | P0 |
| Shadow maps | Scene | on/off, map size, softness, bias, type (PCF, PCFSoft, VSM) | — | 🟡 | `light.shadow`, `renderer.shadowMap.type` | P0 |
| Shadow tint (colored shadows) | Mat | tint color, strength | ✓ | 🟢 | `StyleLightingModel` | P0 |
| Contact shadows | Post | length, thickness, intensity | mask | 🟡 | `sss()` | P1 |
| Blob shadows | Scene | size, softness, opacity | ✓ | 🟢 | soft decal mesh | P1 |
| Ambient occlusion | Post | radius, intensity, tint color, "ink" mode | mask | 🔴 | `ao()` (GTAO) | P1 |
| Baked vertex AO | Mat | strength | ✓ | 🟢 | vertex colors at build time | P2 ✓ |
| Screen-space GI | Post | radius, intensity | — | 🔴 | `ssgi()` | P2 ✓ |
| Time of day | Scene | preset (dawn, noon, golden, blue hour, night), sun path | — | 🟢 | drives key light, sky and fog | P1 |
| Practical light flicker | Scene | amount, speed | — | 🟢 | noise on point-light intensity | P1 |

#### B. Surface shading

| Effect | Where | Key parameters | Per part | Cost | r182 building block | Pri |
|---|---|---|---|---|---|---|
| Shading model | Mat | toon, half-Lambert, flat/unlit, Gooch, PBR | ✓ | 🟢 (PBR 🟡) | custom `LightingModel`; `MeshStandardNodeMaterial` | P0 (Gooch P2 ✓) |
| Cel ramp | Mat | bands (1–5), thresholds, edge softness, custom gradient | ✓ | 🟢 | `StyleLightingModel` | P0 |
| Toon specular | Mat | size, softness, intensity, color | ✓ | 🟢 | stepped Blinn term | P0 |
| Rim light (fresnel) | Mat | width, softness, intensity, color, lit side only | ✓ | 🟢 | fresnel term | P0 |
| Flat (faceted) normals | Mat | on/off | ✓ | 🟢 | `material.flatShading` | P0 |
| Color variation | Mat | amount, scale, hue/value split, world or object space | ✓ | 🟢 | `mx_noise_float` | P1 |
| Vertical gradient | Mat | base darkening, top lightening, height range | ✓ | 🟢 | `positionWorld.y` | P1 |
| Matcap | Mat | procedural matcap choice | ✓ | 🟢 | `MeshMatcapNodeMaterial` | P2 ✓ |
| Halftone shading | Mat | dot size, angle, which bands, screen or world space | ✓ | 🟢 | pattern in lighting model `finish()` | P1 |
| Hatching shading | Mat | density, layers, angles, thresholds, space | ✓ | 🟢 | pattern in `finish()` | P1 |
| 1-bit dither shading | Mat | pattern (Bayer, blue noise), levels | ✓ | 🟢 | `bayer16()` (`tsl/math/Bayer.js`) | P1 |
| Toon water | Mat | shallow/deep colors, foam width, foam noise, wave bands | ✓ | 🟡 | `viewportLinearDepth` | P1 |
| Emissive | Mat | color, intensity, pulse | ✓ | 🟢 | `emissiveNode` → `emissive` MRT output | P0 |
| Wind sway | Mat | strength, speed, gusts | ✓ | 🟢 | `positionNode` | P1 |
| Vertex snapping (PS1) | Mat | grid resolution | ✓ | 🟢 | clip-space snap in `vertexNode` | P1 |
| Affine texture warp (PS1) | Mat | amount | ✓ | 🟢 | `varying(uv·w)` / `varying(w)` trick | P2 ✓ |

#### C. Lines and edges

| Effect | Where | Key parameters | Per part | Cost | r182 building block | Pri |
|---|---|---|---|---|---|---|
| Inverted-hull outline | Mat (extra draw) | thickness (px at 1080p), color, constant screen width | ✓ | 🟢 (2× draws) | the `toonOutlinePass` technique (BackSide extrusion) | P0 |
| Depth edges (silhouettes) | Post | threshold, thickness, weight | mask | 🟡 | custom kernel on linear depth | P0 |
| Normal edges (creases) | Post | angle threshold, thickness, weight | mask | 🟡 | custom kernel on `normal` MRT | P0 |
| ID edges (object boundaries) | Post | on/off, weight | mask | 🟡 | `ids` MRT | P0 |
| Line color | Post | fixed, darkened base color, per-part color | mask | 🟢 | uniform array lookup by part | P0 |
| Distance fade and fogged lines | Post | start, end, minimum opacity, follow fog | — | 🟢 | depth | P1 |
| Light-weighted lines | Post | extra thickness in shadow | — | 🟢 | luminance sample | P1 |
| Wobble and boil | Post | amplitude (px), frequency, boil FPS | — | 🟢 | noise UV offset with stepped time | P1 |
| Line texture | Post | pencil, brush, ink; strength | — | 🟢 | procedural noise | P1 |
| Image-space Sobel | Post | threshold | — | 🟡 | `sobel()` (in a lesson: why geometry-aware edges win) | P2 ✓ |
| Interactable highlight | Post | color, pulse, thickness | per object | 🟡 | `outline()` | P2 ✓ |

#### D. Atmosphere and sky

| Effect | Where | Key parameters | Per part | Cost | r182 building block | Pri |
|---|---|---|---|---|---|---|
| Distance fog | Mat | linear, exp, exp²; start, end, density; color | — (per-part amount P2 ✓) | 🟢 | `scene.fogNode` with `fog()`, `rangeFogFactor()`, `densityFogFactor()` | P0 |
| Sky-tinted fog (atmospheric perspective) | Mat | amount (fog color taken from the sky gradient in the view direction) | — | 🟢 | custom `fogNode` | P0 |
| Height fog | Mat | base height, falloff, density | — | 🟢 | custom `fogNode` | P1 |
| Toon fog bands | Mat | band count, softness | — | 🟢 | quantized fog factor | P1 |
| Gradient sky and sun disc | Scene | zenith, horizon and ground colors, exponent, sun size, softness | — | 🟢 | `scene.backgroundNode` | P0 |
| Toon clouds | Scene | coverage, softness, bands, speed | — | 🟢 | noise in `backgroundNode` or cloud meshes | P1 |
| Physical sky | Scene | turbidity, Rayleigh, sun | — | 🟢 | `SkyMesh` | P2 ✓ |
| God rays | Post | intensity, decay, samples; source is the sun | — | 🟡 | `radialBlur()` on a bright/sky mask | P1 |
| Ambient particles | Scene | type (dust, pollen, embers, snow, rain), density | — | 🟢 | instanced quads | P2 ✓ |

#### E. Lens and camera

| Effect | Where | Key parameters | Per part | Cost | r182 building block | Pri |
|---|---|---|---|---|---|---|
| Field of view | Cam | FOV, focal length | — | 🟢 | camera | P1 |
| Bloom / glow | Post | threshold, strength, radius, source (all or emissive), tint | source mask | 🟡 | `bloom()` | P0 |
| Depth of field | Post | focus (auto on the focus point), aperture, max blur | — | 🔴 | `dof()` | P1 |
| Tilt-shift | Post | band center, width, blur | — | 🟡 | `gaussianBlur()` + band mask | P1 |
| Vignette | Post | amount, softness, roundness, color | — | 🟢 | inline | P0 |
| Chromatic aberration | Post | amount, radial falloff | — | 🟢 | `chromaticAberration()` | P1 |
| Lens distortion (barrel, fisheye) | Post | amount | — | 🟢 | UV remap | P1 |
| Lens flare | Post | intensity, threshold | — | 🟡 | `lensflare()` | P2 ✓ |
| Anamorphic streaks | Post | intensity, threshold, tint | — | 🟡 | `anamorphic()` | P2 ✓ |
| Letterbox | Post | aspect (2.39, 1.85, 4:3), color | — | 🟢 | inline | P1 |
| Motion blur | Post | shutter angle (0–360°), samples | — | 🔴 | `motionBlur()` + `velocity` MRT output | P1 |
| Afterimage trails | Post | damping | — | 🟡 | `afterImage()` | P2 ✓ |

#### F. Color and tone

| Effect | Where | Key parameters | Per part | Cost | r182 building block | Pri |
|---|---|---|---|---|---|---|
| Exposure | Post | EV | — | 🟢 | tone-mapping exposure | P0 |
| Tone mapping | Post | none, Linear, Reinhard, Cineon, ACES, AgX, Neutral | — | 🟢 | `renderOutput()` / `toneMapping()` | P0 |
| White balance | Post | temperature, tint | — | 🟢 | Kelvin → RGB gains | P0 |
| Contrast | Post | amount, pivot | — | 🟢 | inline | P0 |
| Saturation and vibrance | Post | amounts | — | 🟢 | `saturation()`, `vibrance()` | P0 |
| Lift / gamma / gain | Post | slope, offset, power, saturation | — | 🟢 | `cdl()` (ASC CDL) | P1 |
| Split toning | Post | shadow color, highlight color, balance | — | 🟢 | inline | P1 |
| Hue shift | Post | degrees | — | 🟢 | `hue()` | P1 |
| Selective color | Post | kept hue, range, desaturate the rest | — | 🟢 | inline (OKLCH) | P2 ✓ |
| 3D LUT | Post | generated presets (import `.cube` P2 ✓), intensity | — | 🟢 | `lut3D()`, `LUTCubeLoader` | P1 |
| Palette remap by role | Mat | palette, mapping by part and role, keep value | ✓ | 🟢 | material base-color uniforms | P0 |
| Palette transform | Mat | saturation, value, hue shift | ✓ | 🟢 | material uniforms | P0 |
| Posterize | Post | levels | — | 🟢 | `posterize()` | P1 |
| Palette quantization | Post | palette (PICO-8, Game Boy, CGA, custom, from look); nearest color in OKLab | — | 🟡 | custom `Loop` | P1 |
| Gradient map / duotone | Post | gradient stops | — | 🟢 | inline | P1 |
| Sepia, bleach bypass | Post | amount | — | 🟢 | `sepia()`, `bleach()` | P2 ✓ |

#### G. Media and texture

| Effect | Where | Key parameters | Per part | Cost | r182 building block | Pri |
|---|---|---|---|---|---|---|
| Film grain | Post | amount, size, animated, luminance response | — | 🟢 | `film()` | P0 |
| Paper / canvas | Post | type (newsprint, watercolor, canvas, kraft), scale, strength, color | mask | 🟢 | procedural noise | P1 |
| Painterly (Kuwahara) | Post | radius, sectors, sharpness, anisotropic (P2 ✓) | mask | 🔴 | custom (`Loop`) | P1 |
| Watercolor | Post | edge darkening, granulation, wobble, bleed | mask | 🟡 | custom | P1 |
| Halftone (post) | Post | mono or CMYK, dot size, screen angles, shadows only | mask | 🟢 | custom (`dotScreen()` as reference) | P1 |
| Hatching (post) | Post | layers, density, angle, thresholds | mask | 🟢 | custom | P1 |
| CMYK misregistration | Post | offset (px), angle | — | 🟢 | `rgbShift()`-style offset | P1 |
| Dithering | Post | Bayer 2/4/8/16, blue noise; strength | — | 🟢 | `bayer16()` | P1 |
| Sharpen | Post | amount | — | 🟢 | custom unsharp mask | P2 ✓ |

#### H. Retro and display

| Effect | Where | Key parameters | Per part | Cost | r182 building block | Pri |
|---|---|---|---|---|---|---|
| Render scale / pixelation | Pass + Post | pixel size (px at 1080p), nearest upscale, post UVs snapped to the pixel grid | — | 🟢 (saves cost) | `pass().setResolutionScale()`; `pixelationPass()` as reference | P1 |
| Pixel-art edge highlights | Post | normal and depth edge strength | — | 🟢 | as in `pixelationPass` | P1 |
| Color depth | Post | bits per channel (15-bit, 12-bit, palette) | — | 🟢 | posterize + dither | P1 |
| Texture filtering emulation | Mat | nearest, bilinear, N64 3-point | ✓ | 🟢 | custom sampling function | P2 ✓ |
| CRT | Post | scanlines, aperture mask, curvature, glow, flicker | — | 🟢 | custom | P1 |
| VHS | Post | chroma bleed, noise, tracking jitter | — | 🟡 | custom | P2 ✓ |

#### I. Motion and time

| Effect | Where | Key parameters | Per part | Cost | r182 building block | Pri |
|---|---|---|---|---|---|---|
| Stepped animation ("on twos/threes") | Scene | animation FPS; the camera stays smooth | per part (P2 ✓) | 🟢 | quantized animation clock | P1 |
| Low frame-rate rendering | Scene | FPS cap | — | 🟢 | skip renders | P2 ✓ |
| Speed lines | Post | intensity, center | — | 🟢 | custom radial pattern | P2 ✓ |

#### J. Anti-aliasing and resolution

| Effect | Where | Key parameters | Per part | Cost | r182 building block | Pri |
|---|---|---|---|---|---|---|
| Anti-aliasing | Post / pass | none, FXAA, SMAA, TRAA, MSAA, SSAA | — | 🟢 to 🔴 | `fxaa()`, `smaa()`, `traa()`, `ssaaPass()`, pass `samples` | P1 |
| Internal resolution | Pass | scale 0.25–2 | — | — | `setResolutionScale()` | P0 |

Analysis overlays (value view, squint, silhouette, color-blind simulation and others) are teaching tools, not style. They are specified in [§6.13](#613-education).

### 6.5 One-tap looks

**Look anatomy.** A look is a sparse set of parameter values grouped into **modules**. Modules are also the unit of mixing ([§6.6](#66-mixing-looks)).

| Module | Contains | Per part? |
|---|---|---|
| `lighting` | key light, ambient, shadows, time of day, practicals | ambient only |
| `surface` | shading model, ramp, specular, rim, patterns, flat normals, variation, gradient | ✓ |
| `lines` | hull and screen-space lines, colors, weights, fade, wobble, texture | ✓ hull · mask screen |
| `palette` | remap, saturation, value, hue | ✓ |
| `atmosphere` | fog, sky, clouds, god rays, particles | — |
| `lens` | FOV, bloom, DOF, tilt-shift, vignette, CA, distortion, flare, letterbox, motion blur | bloom source |
| `grade` | exposure, tone mapping, white balance, contrast, saturation, CDL, split tone, LUT, selective color | — |
| `media` | grain, paper, Kuwahara, watercolor, halftone, hatching, misregistration, sharpen | mask |
| `retro` | render scale, pixel edges, quantization, dithering, vertex snap, affine warp, CRT, VHS | vertex snap ✓ |
| `motion` | stepped animation, line boil rate, speed lines | — |
| `quality` | AA mode, internal resolution, shadow quality | — |

Each look also carries metadata for the brief and the Learn panel: an inspiration line, 3–5 **pillars** (rules that must never be broken), signature moves, common mistakes, and best-matching scenes.

**The look library.** Items 1–8 are the requested looks. Detailed starting recipes for 1–9 are in [Appendix A](#appendix-a--look-recipes). Values are starting points that get tuned against user ratings.

| # | Look | Inspired by | Signature ingredients | Phone | Pri |
|---|---|---|---|---|---|
| 1 | **Sea Breeze Toon** | *The Wind Waker* | Hard two-tone cel, blue-violet shadows, saturated primaries, gradient sky with toon clouds, white foam, thin lines on characters only, soft bloom | 🟢 | P0 |
| 2 | **Graffiti Rush** | *Jet Set Radio / Jet Grind Radio* ("JSGR") | Thick black ink everywhere, razor-flat two-tone cel, purple shadows, electric saturated palette, wide lens, optional halftone dots | 🟡 | P0 |
| 3 | **Garden Prank** | *Untitled Goose Game* | Near-flat pastel shading, no lines, soft light blue-gray shadows, subtle contact AO, high near-orthographic camera, muted palette | 🟢 | P0 |
| 4 | **Comic Ink** | Western comics, *Borderlands*, *Spider-Man: Into the Spider-Verse* | Weighted ink (heavier silhouettes, thicker in shadow), 3-band light, halftone and hatching in shadows, paper tint, CMYK misregistration | 🟡 | P0 |
| 5 | **Painterly** | Painted concept art, storybook illustration | Kuwahara brush smoothing, warm light / cool shadow, in-shape color variation, canvas texture, soft edges, diffuse glow | 🔴 | P0 |
| 6 | **Retro Console** (variants PS1, 16-bit Pixel, Game Boy, CRT Arcade) | 5th-gen consoles, pixel art, handhelds, arcades | Low internal resolution with nearest upscale, vertex snap, affine warp, limited color with Bayer dither, short fog, optional CRT | 🟢 | P0 |
| 7 | **Golden Hour** | Late-afternoon photography | Low warm sun, long soft shadows, violet ambient, warm haze, god rays, bloom, warm rim, split tone | 🟡 | P0 |
| 8 | **Cinematic** | Film | Filmic tone mapping, teal-orange grade, 2.39:1 letterbox, shallow DOF on the subject, grain, vignette, anamorphic streaks, motion blur | 🔴 | P0 |
| 9 | **Phone-Safe Toon** | Reference mobile look | Material cel + hull lines + in-material fog + one fused final pass; no extra buffers | 🟢 | P0 |
| 10 | **Ligne Claire** | Moebius, *Sable* | Uniform thin black lines, flat color, pale desert palette, no AO or grain, high key | 🟡 | P1 |
| 11 | **Miniature Diorama** | Tilt-shift photography, *Townscaper* | Tilt-shift band, high saturation and contrast, soft AO, high camera | 🟡 | P1 |
| 12 | **1-Bit Dither** | *Return of the Obra Dinn* | Two inks, luminance dithering, crisp edges, optional low resolution | 🟢 | P1 |
| 13 | **Synthwave Neon** | *OutRun*, *Far Cry 3: Blood Dragon* | Dark purple ambient, neon emissive, strong selective bloom, scanlines, CA, sunset gradient | 🟡 | P1 |
| 14 | **Noir** | Film noir | Black and white, hard rim light, deep blacks, heavy grain, vignette, selective red | 🟡 | P1 |
| 15 | **Ink Wash** | Sumi-e, *Ōkami* | Paper, brush-textured lines with weight variation, desaturated washes, red spot color | 🟡 | P1 |
| 16 | **Anime Cel** | Anime-style action RPGs such as *Genshin Impact* | Soft-edged two-tone cel, colored lines (darkened base color), strong rim, hair specular, bloom, soft sky | 🟢 | P1 |
| 17 | **Watercolor** | Watercolor illustration | Pigment edge darkening, paper granulation, wobble, soft bleed, light palette | 🟡 | P1 |
| 18 | **Sketchbook** | Pencil studies | Graphite hatching, gray textured lines, line boil, paper, desaturated | 🟡 | P1 |
| 19 | **Layered Wilderness** | *Firewatch* | Flat shading, strong colored fog bands, gradient sky, sunset palette, silhouette layers | 🟢 | P1 |
| — | **Plain** (baseline) | A typical agent default | `MeshStandardMaterial`, hemisphere + directional light, ACES, sky-blue background, no post | — | P0 |

**Look gallery.** Cards show **live thumbnails of the current scene** rendered with each look (lazily, at low resolution, into offscreen targets). Tap applies the look with a short morph. Long-press or hover shows the pillars. Filter chips: toon, ink, paint, retro, lighting, film, phone-safe. **My looks** holds saved and imported looks.

### 6.6 Mixing looks

Mixing works at two levels. Both always produce a valid look.

1. **Recipe slots (primary).** Each module takes its values from a source look. For example: *lines from Comic Ink, grade from Golden Hour, everything else from Sea Breeze*. In the UI each module row shows its source look. You can drop a look card onto a row, or use a "Take … from" menu.
2. **A/B blend per module, or for the whole look.** A module can blend two sources with a slider t ∈ [0, 1]. The **Morph** control does this for all modules at once (Golden Hour ↔ Cinematic).

On top of both sit a global **Look strength** (0–100%, lerps every parameter toward its registry `neutral`) and **overrides** from the Tune panel.

```json
"recipe": {
  "base": "sea-breeze",
  "modules": {
    "lines": { "from": "comic-ink" },
    "grade": { "from": "golden-hour", "blend": { "with": "cinematic", "t": 0.3 } },
    "media": { "from": "painterly", "mute": false }
  },
  "overrides": { "lines.screen.thickness": 2.2 },
  "strength": 1.0
}
```

**Resolution order:** registry defaults → base look → module sources and blends → recipe overrides → part overrides → strength → quality-tier substitutions (mobile).

**Blend rules by parameter type**

| Type | Rule |
|---|---|
| float, int | lerp (ints round) |
| angle (sun azimuth, hue) | shortest-arc lerp |
| color | lerp in OKLab |
| gradient, palette | resample to the same stop count, then lerp each stop in OKLab |
| enum, structural int (e.g., bands) | step at t = 0.5; the slider marks the switch point |
| effect toggle | union. The effect's `amount` parameter fades from `neutral`, so blending never pops. |

**Coherence checker.** Data-driven rules flag contradictions and offer a one-click fix and a "why":

| Rule | Message |
|---|---|
| Two media at high strength (Kuwahara, halftone, hatching, watercolor) | "Pick one medium; two media read as noise." |
| Retro pixelation with bokeh DOF or motion blur | "Anachronistic: those consoles couldn't blur. Pick one era." |
| Lines > 4 px at T3 complexity | "Busy: thick lines on dense detail turn into noise. Fade lines with distance or raise the crease threshold." |
| High bloom with no tone mapping | "Clipping: without tone mapping, bloom burns to white." |
| Saturation > 1.4 with palette remap off | "Oversaturated colors fight; try palette remap." |
| Fog color far from the sky horizon color | "Fog doesn't match the sky, so the horizon will show a seam." |
| Grain combined with 1-bit dither | "Redundant texture; the dither already breaks up the image." |

**Save as look** stores the resolved recipe as a new sparse look in My looks, with auto-generated pillars that you can edit.

### 6.7 Styling parts separately

Example: painterly terrain, ink-lined characters and buildings, a thicker outline and rim light on the hero.

```json
"parts": {
  "terrain":    { "modules": { "surface": { "from": "painterly" }, "media": { "from": "painterly" } } },
  "characters": { "modules": { "lines": { "from": "comic-ink" } }, "overrides": { "surface.rim.intensity": 0.8 } },
  "hero":       { "inherit": "characters", "overrides": { "lines.hull.thickness": 3.0 } }
}
```

**What can be per part, and how exactly**

| Level | Modules and effects | Notes |
|---|---|---|
| **Exact (material level)** | surface, palette, hull lines, ambient, emissive, wind, vertex snap | Each part has its own material set and uniforms |
| **Masked post (approximate at part edges)** | screen-space lines (enable, color, thickness), media (Kuwahara, watercolor, halftone, hatching, paper), AO and contact-shadow intensity, bloom source | Mask comes from the `ids` buffer; optional 1-px feather; neighborhood filters may bleed up to their radius across edges, with an optional "respect boundaries" mode |
| **Global only** | grade, lens (except bloom source), atmosphere, retro, motion, quality | The UI explains why: these simulate the camera, film or display, which see the whole image at once. Grading objects differently breaks the illusion of one camera. Use the palette module per part instead. |

**UI (Parts tab).** Each part row has: a swatch, "Global look" or a custom look picker, checkboxes for which modules to take, and **Edit overrides** (opens the Tune panel scoped to that part). The **pick tool** selects a part by clicking it in the viewport (raycast → part). **Isolate** dims every other part and draws the selected part's mask outline.

**Focus hierarchy preset** (P1): one click gives `hero` +10% saturation, a rim light and a thicker hull line, and lowers background contrast slightly. Lesson point: the player should be the highest-contrast thing on screen.

### 6.8 Fine-tuning

The **Tune** tab is generated from the parameter registry, so it always covers everything. It uses Tweakpane folders per module, ordered as in the pipeline.

**Each control has:**
- label, value and unit (px at 1080p, °, K, EV, %)
- a **modified dot** when it differs from the look's value; clicking the dot resets it
- a hover or long-press tooltip (one sentence on what it does, one on why) and a link to its Learn card
- a cost badge (🟢🟡🔴) on effect toggles
- a lock icon that keeps the value when you switch looks ("keep my fog")

**Panel features:** search box (by name, tag or "what does X"), **Show modified only**, per-module reset, **undo/redo** (`Ctrl+Z` / `Ctrl+Shift+Z`; a 100-step ring buffer, one step committed per slider release), a per-module A/B eye toggle, and **Randomize within ranges** (P2 ✓) for exploration.

**Scoped editing:** a chip at the top of the panel shows whether you are editing the global look or a part ("Editing: Terrain").

### 6.9 Compare against plain

| Mode | Input | Behavior |
|---|---|---|
| **Hold** | hold `Space`, the on-screen button, or gamepad `X` / `□` | While held, the final image is the baseline, with a "PLAIN" badge so screenshots are unambiguous |
| **Split wipe** | `C`, then drag the divider; gamepad `LT` analog | Baseline on the left, styled on the right; the divider angle can be changed |
| **Flicker** | `F` | Alternates every 500 ms (configurable); good for spotting subtle changes |
| **A/B looks** | Compare menu | Hold or split between two looks, e.g., current vs. saved |
| **Before/after edit** | `Shift` + hold `Space` | Compares to the state before your recent edits: "what did my tweak do?" |
| **Tier sweep** (P1) | Compare menu | 2×2 benefit matrix (plain/styled × T0/T3) as a snapshot |

**Baselines**
- **Agent default** (default): `MeshStandardMaterial` with the model's own roughness and metalness (0.8 and 0 when it doesn't specify them), `HemisphereLight` (#ffffff / #444444, 1.0) plus a `DirectionalLight` (2.0, 50° elevation), PCFSoft 2048 shadows, ACES, sRGB, solid `#87CEEB` background, no post.
- **Raw unlit:** flat base colors.
- **Saved look:** any look from the library.

**Match brightness** (toggle): scales the baseline so its mean luminance equals the styled image's. That way a look isn't preferred just for being brighter. The Learn card calls this "louder isn't better".

Swaps are instant because the baseline is always rendered in the editor ([§7.12](#712-compare-rendering-and-render-sets)).

### 6.10 Looks in a game: switching, zones and plans

**Transitions** (also used when you tap a look):

| Type | How it works | Cost in the exported runtime |
|---|---|---|
| **Morph** | Parameters interpolate over the duration; structural toggles fade through their `amount` | Free: one render set |
| **Crossfade** | Outgoing and incoming looks render together and blend | 2× during the transition |
| **Wipe** | Directional, radial or noise mask using `transition()` | 2× during the transition |

Transitions have a duration and easing (ease-in-out by default).

**Look zones (walk mode).** Scenes define volumes (box or sphere) with a look, a priority and a blend distance. The player's position gives each zone a weight, and the looks are morphed by weight, like post-processing volumes in commercial engines. Examples: the dungeon courtyard uses Golden Hour and the crypt uses a dark torchlit look; at the campsite, standing near the fire warms the grade. You can assign a look to each zone in the Parts/Zones UI.

**Level look plan.** A table: scene (as level) → look (+ mobile variant); zones → look; transition type. **Play plan** tours through the scenes with their transitions. It is exported as `looks.json` plus look-manager code.

**Player-selectable visual modes.** Define up to 4 named modes (for example Classic, Comic, Retro, High-contrast). Preview by cycling with gamepad `View`/`Select`. Exported with a settings-menu snippet. The tool also suggests a **High-contrast** accessibility mode: thicker lines, higher value contrast, and a palette safe for color-blind players.

### 6.11 Performance audit

One button: **⚡ Audit**. The goal is not FPS targets. It is to **rank effects by cost** and say **what will run on phones**.

**Method**
1. **Make the run deterministic.** Fixed animation clock, the current camera shot, fixed seed.
2. **Pick a target resolution:** Desktop 1080p, Phone portrait (1080×2340), Phone landscape, or Phone at 0.75 render scale. The canvas is resized to the target pixel count for the duration of the audit.
3. **Build the variants:** `plain`, `full`, and for every enabled effect *e* a `full − e` variant (leave-one-out). Optionally also `plain + e` (standalone cost).
4. **Warm up:** `compileAsync` plus 20 frames per variant, so shader compiles don't pollute timings. Compile time is recorded separately.
5. **Measure:** 3 rounds, with variant order interleaved to cancel thermal drift, 60 frames per variant per round. Take the median and p90.
6. **Attribute:** marginal cost(*e*) = median(full) − median(full − *e*). The report also compares the sum of marginal costs with the total, to expose interactions.

**Why leave-one-out?** TSL fuses chained per-pixel operations into one shader, so per-pass timings don't map 1:1 to effects. Removing an effect and re-measuring does.

**Timers**
- **Preferred: GPU timestamps.** Create the renderer with `trackTimestamp: true`, call `await renderer.resolveTimestampsAsync('render')` each frame, and read `renderer.info.render.timestamp`.
- **Fallback: wall-clock time to GPU idle.** On WebGPU, `device.queue.onSubmittedWorkDone()`; on WebGL2, a sync readback. The report says which timer was used and its precision. (Chrome quantizes timestamps, so the audit averages many frames.)
- **Per-pass detail:** the three.js r182 `Inspector` (`three/addons/inspector/Inspector.js`, Performance tab) can be attached for drill-down.

**Phone verdicts (honest estimate)**
- **Static rubric.** Each effect declares passes, texture taps per pixel, buffers needed (depth, normal, ids, velocity), MRT attachments and temporal history. From that it gets a weight in *fullscreen-pass equivalents* (FPE).
- **Calibration.** A fixed reference workload measures 1 FPE on this machine at the target resolution. Measured costs are converted to FPE.
- **Phone budget table.** Per device class, how many FPE fit in a 16.7 ms frame. Initial values are rough guesses marked as such. They get replaced by **real on-device runs**: the Verify panel asks you to run the audit on a phone and paste the report.
- **Verdicts:** ✅ phone-safe · ⚠️ high-end phones only · ⛔ desktop/console only.
- **Teaching points in the report:** mobile GPUs are tile-based, so fullscreen passes and MRT cost bandwidth while MSAA is comparatively cheap; fewer passes beat cheaper math.

**Run it on the phone.** **Open on phone** shows a QR code (`uqr`) with a share URL for the current look. It needs the HTML hosted, e.g., on GitHub Pages. The phone runs the same audit and gives you a **Copy report** button.

**Report** (modal). A sorted bar chart of marginal costs (ms and % of frame) with verdict badges. Also: draw calls, triangles, pipelines, render passes, render-target memory, MRT attachment count, compile time per variant, and a list of recommendations (*"Dropping DOF and SSR saves 6.2 ms (58%) → phone-safe"*).

**Make phone-friendly variant.** A rule-based substitution creates "‹Look› · Mobile" in My looks, and the brief exports both tiers:

| Desktop effect | Mobile substitute |
|---|---|
| GTAO | Off, or baked vertex AO |
| Screen-space lines | Hull lines on characters, props and architecture |
| Bokeh DOF | Tilt-shift at half resolution, or off |
| SSR, SSGI, motion blur | Off |
| Kuwahara radius r | radius ≤ 2 at 0.5 render scale |
| Bloom | Emissive-only, half resolution, fewer mips |
| TRAA, SMAA | FXAA, or MSAA 4× |
| Shadows 2048 PCFSoft | 1024 PCF |
| MRT outputs | Only those a remaining effect needs |

### 6.12 Agent brief and exports

**📝 Brief** opens a modal with tabs: *Markdown*, *JSON*, *Runtime*, *Starter game*, *Share*. Each has Copy and Download buttons.

**Brief profiles**
- **Target:** "three.js r182 + Style Lab runtime" (default), "three.js without the runtime (implement from spec)", or "engine-agnostic spec" (for Godot, Unity or Unreal; parameter tables, `.cube` LUT and palette files, no code).
- **Length:** *Short* (≤ 300 words, for a system prompt), *Standard* (for `CLAUDE.md` / `AGENTS.md`), *Full* (everything, including per-part tables).

**Brief structure** (generated deterministically from the resolved look and registry templates; example in [Appendix B](#appendix-b--example-agent-brief)):
1. Header and provenance: look id and version, plus a share URL that reopens the exact state in Style Lab.
2. **Pillars:** 3–5 rules that must never be broken.
3. **Palette by role:** hex values with roles and usage proportions (e.g., 60/30/10), plus what to avoid.
4. **Lighting:** key, fill and rim; sun angles, colors, intensities; ambient; shadows.
5. **Materials per part:** shading model, bands, tints, rim, specular.
6. **Lines:** where, thickness at 1080p, color, fade.
7. **Atmosphere:** fog and sky.
8. **Post chain,** in order, with exact parameters.
9. **Modeling rules:** target tier, bevels, silhouettes, proportions, where to put detail, triangle budget.
10. **Motion rules:** stepped animation, boil.
11. **Performance tier** and the mobile variant.
12. **Multi-look plan:** levels, zones, transitions, player modes (if defined).
13. **Implementation:** runtime usage, part tagging, the material factory. With the no-runtime profile, the generated TSL code goes here instead.
14. **Acceptance checklist** for every new asset.

Each rule carries a short *why*. Agents follow rules more reliably when they know the rationale.

**Export bundle**

| File | Contents |
|---|---|
| `STYLE.md` | The brief |
| `look.json` / `looks.json` | One look, or a plan with several looks, zones and modes (schema `stylelab.look@1`) |
| `stylelab-runtime.js` | The style engine as an ES module (imports `three/webgpu`, `three/tsl`, `three/addons/`). The same code the tool runs ([Appendix C](#appendix-c--runtime-api)). |
| `starter.html` | A minimal single-file game scaffold wired to the runtime and the look: ground, a controllable capsule, props tagged by part, a look switcher. Its props come from `stylelab-kit.js`. It proves parity and gives agents a template to start from. |
| `stylelab-kit.js` | The procedural asset kit as an ES module (imports only `three`): the shapes, buildings, nature, characters, creatures and props the scenes are built from, with part tags, seeded randomness and complexity tiers. A starter library the agent extends in the same style. |
| `grade.cube` | The grade module baked into a 33³ LUT, for other engines |
| `palette.gpl` + `palette.png` | Palette for paint tools and engines |
| `reference.png`, `contact-sheet.png` | Current view; the look across all scenes. For humans and for agents that accept images. |
| `snapshot-snippet.js` | Code the agent adds to its game to export the scene as `.glb` with part tags for Style Lab ([§6.1](#61-scene-library)) |

Files download individually, or all at once: **Download all (.zip)** uses a store-only zip writer (~80 lines, no dependency; P2 ✓).

**Retrofit mode.** `style.convertScene(scene, { guessParts: true })` converts the `MeshStandardMaterial`s of an existing agent-made game in one call. It keeps each base color, guesses parts with the importer's heuristics, and swaps in style materials. Getting an existing game styled is then a one-line change.

**Share links.** `#look=` (or `#state=` for the full app state) holds base64url-encoded `deflate-raw` JSON, compressed with the browser's native `CompressionStream`. No server.

### 6.13 Education

Teaching is layered, from zero effort to deliberate study:

| Layer | What it is |
|---|---|
| **Tooltips** | On every control: one sentence on what it does, one on why it works |
| **Effect cards** (Learn tab) | Full explanation for the selected control (template below) |
| **"Show me"** | One click on a card toggles that effect on and off three times in the viewport, so you see what it does in context |
| **Look breakdown** | "Why this look works": the pillars, then **Build it from scratch**, which replays the look one module at a time starting from plain, with captions. It works for any look, including your own. |
| **Lessons** | 10 guided tours that drive the app and set small tasks ([Appendix E](#appendix-e--lessons)) |
| **Designer views** | Analysis overlays that train the eye (table below) |
| **Critic** | Heuristic tips from frame statistics, each with "Fix it" and "Why" (table below) |
| **What changed** (P2 ✓) | After a compare, a summary such as: *"Your look raised silhouette contrast 2.3× and reduced dominant hues from 9 to 4."* |
| **Glossary** | Searchable; terms link from every card ([Appendix F](#appendix-f--glossary-seed)) |
| **Pipeline inspector** | The pipeline strip, plus a buffers view (depth, normals, part IDs, AO, emissive): *this is what the outline shader sees* |

**Effect card template**

```
<Effect name> — one-line definition
What you see:      the visual result, in plain words
Why it works:      the art principle (silhouette, value, temperature, atmospheric perspective, focus …)
Use it when / Avoid when:
Typical values:    ranges, with a reason
Cost:              🟢/🟡/🔴 and why (passes, samples, buffers)
Seen in:           genres and games
Try this:          a one-click micro-experiment ("Set bands to 2, then 5: notice how …")
Related:           other parameters, lesson link
```

**Designer views**

| View | What it teaches |
|---|---|
| Value (grayscale) | "If it reads in grayscale, it reads." Value structure. |
| Squint (heavy blur) | Composition and focal masses |
| Silhouette (flat black on white) | Shape readability |
| Thumbnail (128 px, nearest upscale) | Does it read at thumbnail size, or in a store listing? |
| Saturation heatmap | Saturation hierarchy: is the focus the most saturated thing? |
| Hue wheel + extracted palette (k-means in OKLab) | Harmony scheme and number of dominant hues |
| Luminance histogram | Clipped blacks and whites; midtone mush |
| Busyness map (edge density) | Where detail competes for attention |
| Color-blind simulation (protan, deutan, tritan) | Readability for the roughly 1 in 12 men with color-vision deficiency |
| Composition overlays (thirds, center, golden ratio) | Framing |

**Critic rules** (computed from a 160×90 readback every few frames while the Analyze tab is open)

| Rule | Example tip |
|---|---|
| Value range < 40% of the available range (2nd to 98th percentile) | "Mostly midtones. Deepen shadows or raise contrast for punch." |
| > 2% of pixels clipped | "Highlights are burning out. Lower exposure or bloom." |
| > 7 dominant hues | "Too many hues compete. Try palette remap or lower saturation in the background." |
| Focus contrast < 0.7 × periphery contrast (focus: a third of the frame around the scene's subject) | "Your subject doesn't stand out. Add rim light or a vignette, or desaturate the background." |
| Busyness high at T3 with lines on | "Line noise. Fade lines with distance." |
| Fog flattens > 60% of the frame | "Fog is hiding the scene. Start it further away." |
| Color-blind view loses the hero/background separation | "Separate them by value, not hue alone." |

### 6.14 Verify panel (human-in-the-loop QA)

Some things automation can't judge cheaply or reliably: the WebGPU path on your real GPU, gamepads, feel, aesthetics, phones. **🧪 Verify** makes checking them fast and turns the results into a structured report you paste back to the agent.

**Tabs**
- **Checklist.** Checks grouped by milestone. Each has an id (e.g., `M1-04`), 1–3 steps, the expected result, an optional **Set it up for me** button that loads the right scene, look and camera, and buttons ✅ Pass · ❌ Fail · ⚠️ Unsure · 📝 Note.
- **Look ratings.** A thumbnail per look on the reference scene. Rate 1–5 for "Does it evoke its inspiration?" and "Do you like it?", with an optional note ("needs more purple").
- **Contact sheet.** A labeled grid (rows = looks, columns = scenes, cells A1…). Report problems by cell: "C4 is black".
- **Gamepad tester.** Live axes, buttons, detected glyph set, deadzone preview, rumble test.
- **Environment and errors.** User agent, backend, GPU adapter info, features (timestamp-query and others), resolution, DPR, `THREE.REVISION`, app version and commit, captured console, `uncapturederror` and shader-compile errors.
- **Report.** **Copy report** (compact Markdown) and **Download JSON**.

Results persist in `localStorage` per app version.

**Report format**

```
### Style Lab verify report — v0.3.0 (abc1234) — 2026-11-02
Env: Chrome 141 / macOS · WebGPU · apple (metal-3) · 2560×1440 @2 · timestamp-query ✓
Result: 14 pass · 2 fail · 1 unsure
❌ M1-04 Outline stability — "lines flicker on the masts when orbiting"
❌ M3-11 Kuwahara — contact sheet cells C4, C5 black
⚠️ M1-07 Look ratings — Sea Breeze 4, Graffiti 3 ("not enough purple"), Golden Hour 5, Phone-Safe 4
Errors (2): [webgpu] … (deduplicated, first 5 lines each)
Perf: full look 3.1 ms GPU @1080p (timestamps), plain 0.9 ms
```

### 6.15 Persistence and settings

- **Autosave** to `localStorage`: scene, tier, recipe, parts, compare mode, My looks, plan, Verify results. Every access is wrapped in try/catch, and the app works without storage.
- **Import:** drag and drop a `look.json`, `looks.json` or `.glb` file.
- **Export:** look JSON, state JSON, PNG screenshot (optional caption: look and scene), side-by-side before/after PNG.
- **Settings:**
  - backend: auto, or force WebGL2 (also `?backend=webgl`)
  - DPR cap and internal resolution
  - reduce motion
  - color-blind simulation
  - UI scale
  - gamepad deadzone
  - reset tips
  - clear data

---

## 7. Technical architecture

### 7.1 Stack and versions

| Concern | Choice | Version / pin | Notes |
|---|---|---|---|
| Renderer | three.js `WebGPURenderer` + TSL | `three@0.182.0` (r182) | Automatic WebGL2 fallback; `forceWebGL` for testing |
| Post-processing | `PostProcessing` + TSL display nodes | r182 | `three/addons/tsl/display/*` |
| Physics | Rapier, compat build (WASM embedded) | `@dimforge/rapier3d-compat@0.19.3` | Entry `rapier.mjs`; `await RAPIER.init()`; lazy-loaded only for walk mode and the toybox |
| Input | Gamepad API (standard mapping), Pointer Events, keyboard | — | Polled each frame |
| Parameter UI | Tweakpane | `tweakpane@4.0.5` + `@tweakpane/plugin-essentials@0.2.1` | Generated from the registry; FPS graph, radio grids |
| App UI | Vanilla ES modules, DOM, CSS | — | Gallery, recipe, parts, modals, lessons, Verify panel. No framework, so there is no build-time dependency. |
| QR codes | `uqr` | `uqr@0.1.3` | Only for "Open on phone" |
| Color math | In-house (~150 lines) | — | sRGB ↔ linear ↔ OKLab/OKLCH, Kelvin → RGB |
| Compression | Native `CompressionStream('deflate-raw')` | — | Share links |
| Build | esbuild + a Node script | `esbuild@0.28.2` (dev only) | Bundles and inlines into one HTML file |
| Tests | `node:test`; Playwright with Chromium | Node 22, Playwright 1.63 | Unit tests + smoke tests |

**Import map** (in the dev `index.html` and the built file; every URL was checked to resolve):

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.js",
    "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.js",
    "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/",
    "@dimforge/rapier3d-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs",
    "tweakpane": "https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js",
    "@tweakpane/plugin-essentials": "https://cdn.jsdelivr.net/npm/@tweakpane/plugin-essentials@0.2.1/dist/tweakpane-plugin-essentials.min.js",
    "uqr": "https://cdn.jsdelivr.net/npm/uqr@0.1.3/dist/index.mjs"
  }
}
</script>
```

Mapping `three` to `three.webgpu.js` follows the official r182 WebGPU examples, so addons that import `three` get the WebGPU build.

### 7.2 Source layout

```
my-ai-3d-demo/
├─ DESIGN.md
├─ README.md
├─ index.html                  # dev entry: import map → CDN, loads src/app/main.js (no build needed)
├─ package.json                # devDependencies: esbuild · scripts: dev, build, test, smoke
├─ scripts/
│  ├─ build.mjs                # bundle app + runtime, inline both → dist/style-lab.html (+ dist/stylelab-runtime.js); --offline inlines the dependencies too
│  ├─ fixtures.mjs             # test assets built in code (a .glb with a KTX2 texture and a morph target)
│  └─ smoke.mjs                # Playwright: scenes × looks, errors, numeric checks, contact sheet
├─ src/
│  ├─ runtime/                 # ← exported as stylelab-runtime.js; never imports app/ or the DOM
│  │  ├─ index.js              # createStyle() public API (Appendix C)
│  │  ├─ registry/             # parameter registry, one file per module, plus effect metadata
│  │  ├─ look/                 # schema, validate, migrate, resolve, mix, interpolate, strength
│  │  ├─ color/                # sRGB/linear/OKLab/OKLCH, Kelvin, palettes
│  │  ├─ materials/            # StyleLightingModel, material factory, hull lines, water, patterns
│  │  ├─ atmosphere/           # fogNode, sky backgroundNode, clouds
│  │  ├─ post/                 # graph builder, one file per effect, part masks
│  │  ├─ render/               # render sets, scene passes and MRT, compare composite, transitions
│  │  └─ perf/                 # timers, static cost model, calibration
│  ├─ app/                     # the editor
│  │  ├─ main.js               # boot, renderer init, frame loop
│  │  ├─ state/                # store, actions, undo, persistence, share links
│  │  ├─ ui/                   # layout, look gallery, recipe, parts, tune (Tweakpane), modals, coach marks
│  │  ├─ compare/  audit/  brief/  learn/  analyze/  verify/
│  │  ├─ input/                # keyboard, pointer, gamepad (+ glyphs)
│  │  └─ physics/              # Rapier loader, character controller, toybox
│  ├─ scenes/                  # one module per scene
│  │  └─ kit/                  # builders: house, tree, rock, character, goose, boat, kart, …
│  └─ content/                 # looks/*.json, lessons, glossary, critic and coherence rules, Verify checks
├─ tests/                      # node:test unit tests
└─ dist/
   └─ style-lab.html           # built single-file deliverable (committed, so it can be shared and hosted)
```

### 7.3 Runtime vs. editor boundary

- `src/runtime/` owns everything that makes pixels: registry, look resolution, materials, post graph, render sets, transitions and timers. It has no DOM access and no UI imports.
- `src/app/` owns state, UI, input, analysis, briefs and the Verify panel. It talks to the runtime only through the public API plus a small editor extension (render sets for compare, debug views, audit hooks).
- The build bundles the runtime separately. That bundle (a) is what the app imports, and (b) is embedded as text (base64, so `</script>` can't break out) for the **Runtime** export. The parity guarantee (P1) depends on this.

### 7.4 State and data flow

```
 UI · keyboard · pointer · gamepad
            │ actions
            ▼
     Store (AppState) ──► persistence (localStorage, URL hash)
            │
            ▼
  resolveLook(recipe, parts, library, registry)   ← pure function, unit-tested
            │ ResolvedLook (flat map: paramId → value; per-part maps)
            ▼
  diff(previous, next) ──► value changes      → uniform.value = v          (every frame, free)
                       └─► structural changes → rebuild queue (debounced 100 ms)
                                                 ├─ materials of affected parts
                                                 └─ post graph (outputNode swap + needsUpdate)
            ▼
  StyleRuntime: render sets · materials · post graph · transitions
```

```ts
AppState {
  sceneId, tier, density, shot, cameraMode: 'orbit' | 'walk' | 'turntable',
  recipe: Recipe,                     // §6.6
  parts: Record<PartId, PartRecipe>,  // §6.7
  compare: { mode: 'off'|'hold'|'split'|'flicker', split: 0.5, baseline: 'agentDefault'|'raw'|LookId, matchBrightness: false },
  transition: { type: 'morph'|'crossfade'|'wipe', duration: 0.6 },
  plan: { levels: Record<SceneId, LookId>, zones: Record<ZoneId, LookId>, modes: LookId[] },
  analysis: { view: 'none'|'value'|'squint'|…, critic: false },
  library: { userLooks: Look[] }, settings: {…}, verify: {…}, ui: {…}
}
```

### 7.5 Parameter registry

The registry is the single source of truth (P2). Every parameter and effect toggle is an entry:

```js
{
  id: 'lines.screen.thickness',        // stable path; used in looks, URLs, briefs
  module: 'lines',                      // mixing slot
  label: 'Line thickness',
  type: 'float',                        // float|int|bool|enum|color|angle|vec2|gradient|palette
  min: 0, max: 8, step: 0.1, unit: 'px@1080p',
  default: 1.5,                         // value for a new look
  neutral: 0,                           // value that makes the effect invisible (strength, morphs)
  structural: false,                    // true → graph or material rebuild
  scope: 'both',                        // 'global' | 'part' | 'both'
  mix: 'lerp',                          // lerp|oklab|step|angle|union
  enabledBy: 'lines.screen.enabled',    // parent toggle
  requires: ['depth', 'normal'],        // buffers; the graph builder derives MRT from these
  cost: { class: 'medium', fpe: 1.0 },  // static rubric (§6.11)
  learn: { what: '…', why: '…', avoid: '…', typical: '1–3 px', seeAlso: ['lesson:silhouettes'] },
  brief: 'Screen-space ink lines, {value}px at 1080p (scale with output height).',
  tags: ['outline', 'ink', 'readability'],
}
```

The unit test asserts that every entry has: a range or options, `default`, `neutral`, `learn.what`, `learn.why`, `brief`, `cost`, a valid `module`, and resolvable `requires` and `enabledBy` references.

### 7.6 Look schema

Looks are **sparse**: they store only the values that differ from the registry `default`.

```json
{
  "schema": "stylelab.look@1",
  "id": "sea-breeze",
  "name": "Sea Breeze Toon",
  "version": 3,
  "inspiredBy": ["The Legend of Zelda: The Wind Waker"],
  "tags": ["toon", "bright", "outdoor", "phone-safe"],
  "description": "Sunny, playful cel-shaded adventure.",
  "pillars": ["Two hard light tones, never gradients", "Shadows are blue-violet, never gray", "…"],
  "mistakes": ["Black outlines on terrain", "Gray shadows"],
  "params": {
    "surface.model": "toon", "surface.bands": 2, "surface.threshold": 0.45,
    "surface.softness": 0.02, "surface.shadowTint": "#5866D0", "surface.shadowTintStrength": 0.55,
    "palette.saturation": 1.25, "atmosphere.fog.type": "exp2", "atmosphere.fog.density": 0.006
  },
  "parts": {
    "characters": { "params": { "lines.hull.enabled": true, "lines.hull.thickness": 1.6 } },
    "water": { "params": { "surface.model": "toonWater" } }
  },
  "tiers": { "mobile": { "params": { "lens.bloom.enabled": false } } }
}
```

Versions are migrated through a `migrations` table keyed by schema version, and every migration has a unit test. Colors are stored as sRGB hex, converted to linear for shading, and mixed in OKLab.

### 7.7 Frame and render pipeline

**Per frame:** input → camera/walk → physics (fixed step) → animation clock (optionally stepped) → zone weights → transitions → uniform updates → render.

The post chain is organized as five stages. The stages are also the teaching model: *World → Camera → Grade → Medium → Display*.

```
 1 WORLD  (inside materials)
   lighting model (cel/half-Lambert/…; shadow tint, rim, spec, patterns) · fogNode · backgroundNode (sky) · hull lines
   │
   ▼  scene pass (layers = set A) with MRT: output · normal · ids(part, object) · emissive? · velocity?
 2 CAMERA (HDR, linear)
   AO / contact shadows (×) → SSR / SSGI (+) → bloom (+) → god rays (+) → motion blur → DOF / tilt-shift
   → exposure + white balance → tone mapping → output transform (renderOutput → display-referred sRGB)
 3 GRADE  (display-referred)
   CDL lift/gamma/gain → contrast → saturation/vibrance → hue → split tone → selective color → LUT
 4 MEDIUM
   Kuwahara → watercolor → halftone / hatching (post) → LINES composite → AA (skipped for pixel looks)
   → CMYK misregistration → paper
 5 DISPLAY
   posterize / palette quantize + dither → chromatic aberration · lens distortion → vignette → grain
   → letterbox → CRT / VHS
   │
   ▼
 COMPOSITE: compare (hold / split / flicker), transition (crossfade/wipe with set B),
            analysis view, debug buffer view → canvas
```

**Why this order** (also explained in the Learn panel):
- **Bloom and DOF before tone mapping.** HDR highlights bloom and bokeh correctly.
- **Grading after tone mapping.** Creative color decisions happen in display space, as in most games' LUT pipelines.
- **Lines after media.** Ink sits on top of paint, so Kuwahara doesn't smear the lines.
- **Paper after lines.** Ink takes on the paper texture.
- **Quantize and dither in display space.** Steps should be perceptually even.
- **Grain last.** No filter smears or grades it.
- **Fog stays in the WORLD stage,** so it applies per object. Post lines are fogged explicitly with the same fog function evaluated from depth, so lines recede with the atmosphere.

**Setup notes (verified against r182):**
- Set `postProcessing.outputColorTransform = false` and call `renderOutput()` at the end of the CAMERA stage, so GRADE, MEDIUM and DISPLAY operate on display-referred values.
- The scene pass is `pass(scene, camera)` with `.setMRT(mrt({...}))`, `.setLayers(...)` and `.setResolutionScale(...)`.
- Buffers are read with `getTextureNode(name)`, `getLinearDepthNode()` and `getViewZNode()`.
- `getPreviousTextureNode()` serves temporal effects.

**MRT layout.** The graph builder includes an output only when an enabled effect `requires` it.

| Output | Content | Needed by |
|---|---|---|
| `output` | lit color (HDR) | always |
| depth | depth attachment | lines, AO, DOF, fog-lines, contact shadows, god-ray mask |
| `normal` | view-space normal (`directionToColor`) | normal edges, AO, SSR |
| `ids` | R = part id, G = object-id hash; nearest filtering | per-part masks, ID edges, silhouette view, pick tool |
| `emissive` | emissive color | selective bloom |
| `velocity` | screen-space velocity (`velocity` node) | motion blur, TRAA |

The part id is written per material through `material.mrtNode` (r182 merges it into the pass MRT). The pass that writes `ids` renders with `samples: 0`, because MSAA averages every attachment and would blend ids at edges (M0 spike 2). Anti-aliasing comes from post (FXAA/SMAA), or MSAA color plus a separate non-MSAA id pass.

### 7.8 Styled materials

**`StyleLightingModel extends LightingModel`** implements the non-PBR models. In r182 the hooks are `start`, `direct`, `directRectArea`, `indirect`, `ambientOcclusion` and `finish`.

1. **`direct({ lightDirection, lightColor, reflectedLight })`** accumulates one scalar **light amount** per pixel:

   ```
   NdotL     = dot(N, L)
   light     = wrap(NdotL)                          // half-Lambert: NdotL·0.5 + 0.5, squared
             × shadow × attenuation                  // weighted by the light's luminance
   ```

   It also accumulates the light's color.

   Shadow × attenuation comes out as one scalar: `luminance(lightColor) / luminance(lightNode.baseColorNode)`. In r182 `direct()` receives the light node, and only `lightColor` carries the shadow. A light with zero base luminance gets visibility 0, because its shadow term can be NaN. Both points were confirmed in M0 spike 1 ([docs/spikes.md](docs/spikes.md)), so `receivedShadowNode` isn't needed.

2. **Ramp.** `bands`, `thresholds` and `softness` are applied with `smoothstep`. The shadow tint is an additive fill, which stays controllable when ambient is low:

   ```
   ramp     = Σᵢ smoothstep(tᵢ − s, tᵢ + s, light) / (bands − 1)    // bands = 1 → ramp = light (continuous)
   diffuse += albedo × baseLightColor × ramp / π                    // per light
   fill     = albedo × shadowTint × tintStrength × (1 − max ramp)  // once, in finish(): hue-shifted, never plain black
   ```

   An optional custom gradient replaces the analytic ramp.

3. **`indirect()`** adds the hemisphere ambient: sky and ground colors mixed by normal Y, optionally banded.
4. **`finish()`** adds toon specular (stepped Blinn), rim (fresnel, optionally lit side only), and the in-material patterns (halftone, hatching, dither). The patterns are driven by the accumulated light amount, in screen or world space.

**PBR model.** Use `MeshStandardNodeMaterial` ("stylized PBR"). Rim, gradient and variation are still applied through `colorNode` and `emissiveNode`.

**Material factory.** `styleMaterial({ part, role, color, emissive, roughness, flags })` returns a cached material.
- Cache key: `part`, the structural parameters of that part's resolved surface module, and the flags (instanced, skinned, transparent, water).
- Continuous values are **uniform nodes shared per part**: one slider updates every material of that part without a rebuild.
- `materialReference`-style properties carry per-material values: base color, part index.
- Each material sets `mrtNode = mrt({ ids: … })`.

**Other material features**
- **Vertex snapping:** override `vertexNode` (clip-space snap to a grid).
- **Wind sway:** `positionNode`.
- **Color variation:** MaterialX noise (`mx_noise_float`, `mx_fractal_noise_float`).
- **Toon water:** reads `viewportLinearDepth` for depth color and intersection foam.

**Hull lines.** Each line-enabled mesh gets a sibling hull mesh:
- `BackSide`, no shadows, the same `ids` as its parent, and a color uniform per part
- `positionNode` / `vertexNode` extrude along a **smoothed outline normal**, stored in an `outlineNormal` attribute computed once by merging vertices by position. Without it, hulls crack at the hard edges of faceted geometry.
- Constant screen width: `clip.xy += n_clip.xy × thicknessPx × 2 / resolution × clip.w`

Sibling meshes are simple, work unchanged in the exported runtime, and show up in `renderer.info`. The alternative is a `setRenderObjectFunction` pass, which is how r182's `ToonOutlinePassNode` does it; it is kept as the fallback.

### 7.9 Screen-space lines

A custom TSL node that reads linear depth, normals and ids at cross-pattern offsets. The offset radius is `thickness × outputHeight / 1080`.

```
depthEdge  = max_o |d − d_o| / d               > depthThreshold     (relative, so it is scale-free)
normalEdge = max_o (1 − dot(n, n_o))           > normalThreshold
idEdge     = any_o (id ≠ id_o)
edge       = max(depthEdge·silhouetteWeight, normalEdge·creaseWeight, idEdge·idWeight)
```

- **Anti-aliasing:** a smoothstep across each threshold.
- **Per part:** read the part id at the pixel to look up thickness, color and enable flags in 16-entry uniform arrays.
- **Line color modes:** fixed; darkened local color (`color × k`, saturation boosted, for "colored lines"); per part.
- **Distance fade:** `alpha *= 1 − smoothstep(fadeStart, fadeEnd, depth)`.
- **Fogged lines:** `mix(lineColor, fogColor, fogFactor(depth))`.
- **Light-weighted lines:** thicker where the luminance at the pixel is low.
- **Wobble:** noise offset on the sampling UV.
- **Boil:** the noise seed advances at `boilFps`.

### 7.10 Post graph builder

Each effect is a module:

```js
export default {
  id: 'media.kuwahara', stage: 'MEDIUM', order: 10,
  requires: [],                         // buffers
  neighborhood: true,                   // samples neighbors of its input → needs a texture boundary
  enabled: (look) => look['media.kuwahara.enabled'],
  build(input, ctx) { /* returns a TSL node; reads ctx.uniforms, ctx.buffers, ctx.partMask */ },
};
```

- The builder walks the enabled effects in canonical order.
- It inserts texture boundaries (`convertToTexture` / `rtt`) **only** before neighborhood effects: blurs, Kuwahara, watercolor wobble, chromatic aberration, lens distortion.
- Everything else fuses into the surrounding shader. That keeps the pass count honest for the audit.
- **Structural key** = enabled effect ids + structural parameter values. The graph is rebuilt only when the key changes (`postProcessing.outputNode = next; postProcessing.needsUpdate = true`), and the old render-to-texture nodes are disposed.
- A "compiling…" chip shows while pipelines build.
- Uniforms persist across rebuilds, so values don't jump.

### 7.11 Per-part masking

`partMask(set)` reads `ids.r` with nearest sampling and tests the bit `(maskUniform >> id) & 1` (TSL `shiftRight` / `bitAnd`).

- **Output masking** (default): `out = mix(in, fx(in), mask)`.
- **Source masking:** bloom (only selected parts glow) and AO intensity.
- **Feather:** a 1-px option on the mask softens seams.
- **"Respect boundaries"** (optional, costs more): neighborhood filters skip samples from other parts.

### 7.12 Compare rendering and render sets

A **render set** is a layer + a material set + a light rig + a post branch.

| Set | Layer | Contents | When it renders |
|---|---|---|---|
| **A — styled** | 1 | Style materials, hull lines, look light rig | Always |
| **P — plain** | 2 | Baseline materials, baseline rig, ACES + sRGB only | Always in the editor, for instant compare; excluded from audits; absent in the exported runtime |
| **B — second look** | 3 | Style materials for look B | On demand: A/B compare, crossfade and wipe transitions |

How it works:
- Renderables are **twins**: siblings under one animated parent, sharing geometry. Instanced meshes share `instanceMatrix`. Animation and physics move every twin at once.
- **Lights are layer-filtered.** r182 collects a light only if `light.layers.test(camera.layers)`.
- **Shadows follow the layers.** A shadow camera left on the default layer inherits the rendering camera's layer mask, so each set's sun renders only that set's casters.
- Each set's scene pass uses `pass(scene, camera).setLayers(setLayers)`.
- The **compare composite** is uniform-driven (hold, split position, flicker phase), so switching modes never rebuilds.

Fallback if layered shadows misbehave: swap materials and light rigs between passes, rendering the plain set into a render target first.

### 7.13 Interpolation and transitions

- **Morph:** every frame during a transition, `resolved = mix(from, to, ease(t))` using the per-type rules in §6.6.
- **Structural differences:** an effect present only in `to` is built immediately with `amount = neutral` and faded in. An effect present only in `from` fades out, then is removed (one rebuild at the end). Enums switch at t = 0.5.
- **Zones:** the same mixer with N weighted inputs, normalized.
- **Crossfade and wipe:** build set B for the incoming look, blend in the composite (`transition()` for wipes), then promote B to A.

### 7.14 Performance measurement

- `perf/timer.js` is a common interface (`begin`, `end`, `resolve`) with three implementations:
  - `TimestampTimer`: `trackTimestamp` + `resolveTimestampsAsync('render')`
  - `QueueTimer`: WebGPU `onSubmittedWorkDone`
  - `SyncTimer`: WebGL2 readback
- The audit runner drives frames manually (the animation loop is paused). It restores the canvas size, state and loop afterwards.
- `perf/cost-model.js` holds the static rubric (FPE weights), the calibration workload and the device budget table. The table is a plain data file, so on-device reports can update it.

### 7.15 Physics, walk mode and zones

- Rapier is loaded on demand: `import RAPIER from '@dimforge/rapier3d-compat'; await RAPIER.init();`.
- **Walk mode** uses `world.createCharacterController(0.02)` with a capsule collider, with slope and step settings, and `computeColliderMovement` each fixed step (1/60 s). Camera: third-person spring arm with collision.
- **Colliders** come from scene `colliders` (boxes and trimeshes generated by the kit at T0 resolution, so physics doesn't change with tier).
- **Toybox:** dynamic rigid bodies. You throw balls with click or gamepad `RT` (in this scene `RT` throws instead of zooming). Bodies drive the shared twin parents.
- **Zones** are AABBs or spheres tested against the player position each frame. Weights use smoothstep over the blend distance.

### 7.16 Gamepad layer

- `input/gamepad.js` polls `navigator.getGamepads()` every frame. It prefers `mapping === 'standard'`.
- Radial deadzone 0.15 (configurable). Edge detection gives pressed/released events; analog triggers drive the split wipe.
- Glyph set (Xbox, PlayStation, generic) is detected from `gamepad.id`.
- Hot-plug is handled with `gamepadconnected` / `gamepaddisconnected` and a toast.
- Optional rumble on look change via `vibrationActuator.playEffect('dual-rumble', …)` where supported (P2 ✓; Play → Gamepad tester turns it off).
- D-pad focus navigation inside open panels (P2 ✓): ↑/↓ move focus, ←/→ change sliders and lists, A presses, B closes; outside panels the D-pad keeps its scene and complexity actions.

### 7.17 Analysis readback

- Designer views are final-stage nodes:
  - **value:** `luminance`
  - **squint:** `gaussianBlur`
  - **silhouette:** from `ids` (non-sky = black)
  - **thumbnail:** resolution scale + nearest
  - **color-blind:** Machado matrices
  - **heatmaps:** a ramp lookup
- **Critic statistics:** a 160×90 render target is read with `renderer.readRenderTargetPixelsAsync` every 15 frames while the Analyze tab is open. Histogram, saturation, k-means (k = 6, OKLab) and focal contrast are computed on the CPU in a few milliseconds.

### 7.18 Backend fallback and capabilities

- **Backend choice.** WebGPU is preferred, and `WebGPURenderer` falls back to WebGL2 on its own. `?backend=webgl` or the setting forces WebGL2 (`forceWebGL: true`). A badge always shows the active backend.
- **Capability flags.** These are recorded in the Verify report and used to degrade gracefully (e.g., the audit switches timers):
  - timestamp-query support
  - max color attachments
  - float filterability
  - max texture size
- **The WebGL2 path must run every P0 look,** because headless CI and some phones use it.

### 7.19 Build and packaging

- **`npm run dev`:** any static server (`npx http-server` or `python3 -m http.server`); open `index.html`. ES modules load straight from `src/`, with no build step.
- **`npm run build`** (`scripts/build.mjs`):
  1. esbuild bundles `src/app/main.js` as ESM. The import-map packages are external: `three`, `three/*`, `@dimforge/rapier3d-compat`, `tweakpane`, `@tweakpane/*`, `uqr`.
  2. esbuild bundles `src/runtime/index.js` separately.
  3. It writes `dist/style-lab.html`: the HTML template, the import map, inline CSS, the inline app `<script type="module">`, and the runtime source as base64 for export.
  4. It also writes `dist/stylelab-runtime.js`.
  5. It injects `APP_VERSION` and the git short SHA.
  6. It does not minify (readable and debuggable; size isn't a concern).
- **The built file works from `file://`** (inline module and CDN imports) and from any static host. For the phone QR flow, host `dist/` on GitHub Pages.
- **Fully offline build** (P2 ✓): `npm run build:offline` writes `dist/style-lab-offline.html` with three.js, Rapier, Tweakpane and uqr inlined (not committed; the smoke test runs it with the CDN blocked).

### 7.20 Test API

The app exposes `window.__stylelab` for Playwright, for agents debugging, and for power users:

```js
window.__stylelab = {
  ready,                                   // Promise, resolves after the first presented frame
  version, backend, caps,
  scenes(), looks(),
  setScene(id, { tier, density, shot }), applyLook(idOrJson), setParam(path, value, { part }),
  getResolvedLook(), compare(mode, opts), freeze(t),
  frameStats(),                            // ms, draw calls, triangles, pipelines
  errors(),                                // captured console, GPU and compile errors
  capture({ width, height }),              // → { dataURL, stats: { meanLuma, lumaStd, meanSat, clipped } }
  diff(a, b),                              // → { mae } between two captures
  audit(opts), contactSheet({ looks, scenes, cell }),
  // v1.1 (M10)
  whatChanged(),                           // → { summary, changes } plain vs. the look on this frame
  exportZip(),                             // → { names, size, head } every export file as one zip
  padInfo(), activePanel(),                // gamepad layer (rumbles played) and the panel the D-pad drives
  touchVisible(), forceTouch(on),          // the walk-mode touch controls
};
```

---

## 8. Testing and verification

The strategy is **cheap automated checks for correctness, and human eyes for aesthetics and hardware**. Testing must be token-efficient.

| Tier | Tool | What it covers | When | Cost |
|---|---|---|---|---|
| **Unit** | `node:test` (no browser) | Registry completeness; look validation and migrations; resolve, mix, strength and neutral math; color round-trips; share-link round-trip; brief generator (palette hexes present, enabled effects listed in order); coherence rules; mobile substitutions; cost model | Every change | Seconds |
| **Smoke** | `scripts/smoke.mjs` (Playwright, Chromium, WebGL2 path; WebGPU attempted best-effort with `--enable-unsafe-webgpu`) | Boot with no errors; each scene × look renders 3 frames with no console or GPU errors; numeric image checks (below); runtime parity (`starter.html` vs. the tool, mean pixel difference within tolerance) | End of each milestone, and after render-pipeline changes | 1–3 minutes |
| **Visual spot check** | The agent views contact sheets and screenshots | Gross failures (black cells, missing lines, wrong colors) and tuning | As needed | A few images |
| **Human** | Verify panel | WebGPU on real GPUs, gamepads, feel, look authenticity, phones | Each milestone build | User's time; structured report |

**Numeric image checks** (no vision needed; computed in the page by `capture()`):
- Frame not blank: luminance standard deviation > ε.
- A look differs from plain: mean pixel difference > threshold.
- Hold-compare shows plain: mean difference to a plain capture < ε.
- Value view is gray: R = G = B.
- Strength 0 renders the same as the registry-neutral look: mean difference < ε.
- Transitions end exactly at the target look.

**Budget rules for the implementing agent**
- No subagent reviews, adversarial reviews or LLM-judge loops.
- Since M3 (the user's call, 2026-10-28): view contact sheets and screenshots as often as they help, and tune visuals from them. Until then the rule was at most one contact sheet per milestone.
- Fix and re-test only what unit tests, smoke tests or the user's Verify report flag.
- Every milestone ends by adding its checks to the Verify panel and noting "what to test" in `CHANGELOG.md`.

---

## 9. Milestones

Each milestone ends with: `npm test` and `npm run smoke` green, a rebuilt `dist/style-lab.html`, new Verify-panel checks, and a short `CHANGELOG.md` entry with *what to test*. Effort levels are summarized in [§11](#11-effort-level-per-milestone).

### M0 — Foundations and spikes
- **Status:** done (v0.1.0) and verified on real hardware (Chrome 156 / Windows / RTX 3060 Ti, all six checks pass). All 8 spikes are go on WebGPU and WebGL2; results and decisions are in [docs/spikes.md](docs/spikes.md).
- **Scope:**
  - Repository scaffold (layout in §7.2), dev `index.html` with the import map, `scripts/build.mjs` producing `dist/style-lab.html`, the `node:test` setup, the smoke-test skeleton
  - Renderer bootstrap: WebGPU with WebGL2 forcing, resize, DPR, loop, `OrbitControls`
  - Error capture, backend badge, `window.__stylelab` skeleton
  - A Verify panel shell with Environment & errors and Copy report
- **Spikes** (each a tiny test scene; results in `docs/spikes.md` with go/no-go and a fallback):
  1. `StyleLightingModel` cel ramp with a shadowed sun plus a point light; shadow factor read separately inside `direct()`
  2. Pass MRT with `normal` + `ids` through per-material `mrtNode`, read back in post
  3. Render sets via `pass().setLayers()`: twins, layer-filtered light rigs, shadow-map layer inheritance
  4. `outputColorTransform = false` + `renderOutput()` mid-graph, with display-space operations after it
  5. Structural rebuild (`outputNode` swap + `needsUpdate`), checking for leaks over 200 rebuilds
  6. Hull lines with smoothed outline normals on faceted geometry
  7. `trackTimestamp` + `resolveTimestampsAsync` on WebGPU and WebGL2
  8. Rapier compat loading from the CDN inside the single file
- **Acceptance:** the built file opens from `file://` and over http; a lit test scene renders on WebGPU and on forced WebGL2; every spike has a documented outcome; smoke passes on WebGL2.
- **Verify checks:** backend badge shows WebGPU on your machine · the file works when opened from disk · the report shows no errors.

### M1 — Vertical slice: plain vs. styled
- **Status:** done (v0.2.0) and verified on real hardware (Chrome 156 / Windows / NVIDIA Ampere at 2502×1839, all eight checks pass, GPU 3.92 ms/frame). Look ratings, evokes/likes out of 5: Sea Breeze Toon 3/4, Graffiti Rush 3/4, Golden Hour 4/4, Phone-Safe Toon 4/5. Every acceptance item has a numeric smoke check on WebGPU and WebGL2. Decisions made while building it:
  - **Strength** fades only continuous parameters toward `neutral`. Switches and structural values keep the look's value, so the slider never rebuilds; strength 0 equals that look's neutral version exactly.
  - **Tune overrides beat the look's part values** (resolution: global → look parts → overrides → part overrides), so a slider always changes what you see.
  - **Baseline looks** (`baseline: true`, used by Plain) skip the scene's light rig and sky, so the Plain look matches the P set exactly (since M2, when the baseline started using the model's roughness and metalness).
  - **Sky per set.** `scene.backgroundNode` is shared by both passes, so each set gets a camera-centered sky dome on its own layer. Plain materials set `fog = false`, so `scene.fogNode` styles only set A.
  - **Material `mrtNode` is `mrt({ output, ids })`.** A material MRT without `output` replaces the color when the pass has no MRT; `MRTNode` skips names the target doesn't have.
  - **Depth edges use the Laplacian of inverse depth** (zero on any plane), with the threshold raised on grazing surfaces, so a wavy sea toward the horizon gets no ink. Waves also fade out with distance.
  - **Object ids** come from a hash of the world matrix's translation, because materials are shared across objects.
  - **A look's lens is relative: `lens.fovScale` multiplies each shot's FOV** (it was an absolute `lens.fov` in v0.2). An absolute 70° pushed the camera into the boat on Harbor when dollying, and without the dolly it shrank M2's near-orthographic and isometric shots to a dot. A scale keeps each genre's camera, and the dolly at ×1.25 is small enough to stay clear of geometry.
  - **No InstancedMesh in M1 scenes.** Micro-detail is merged instead, because hull extrusion along `outlineNormal` would also need the instance matrix.
- **Scope:**
  - Scenes `lookdev` and `harbor` with tiers T0–T3 for the props they use
  - Parameter registry v1 and look schema v1 (resolve, sparse looks, strength)
  - Materials: `StyleLightingModel` (toon, half-Lambert, flat, PBR) with shadow tint, rim and spec; hull lines; screen-space lines (depth, normal, id)
  - World: `fogNode` (distance + sky-tinted); gradient sky
  - Post: bloom; grade (exposure, tone mapping, WB, contrast, saturation); vignette; grain
  - Looks: Sea Breeze Toon, Graffiti Rush, Golden Hour, Phone-Safe Toon, plus Plain
  - UI: look bar; render sets A + P with hold-to-compare and split wipe; Tune panel generated from the registry; complexity slider
  - Basic input: keyboard plus gamepad `X` (hold compare), `LB`/`RB` (looks), right stick (orbit)
  - Learn text for every v1 parameter
- **Acceptance:**
  - Compare swaps on the next frame.
  - Sliders never trigger rebuilds; toggles rebuild only the affected materials or post graph (compile time is shown, not gated).
  - The four looks are visibly distinct on both scenes.
  - Unit tests pass for the registry, resolve and strength.
  - Smoke checks pass for every scene × look.
- **Verify checks:** look buttons apply instantly · hold compare feels instant (keyboard and gamepad) · the split divider drags smoothly · outlines stay stable while orbiting (no shimmer, gaps or cracks at hard edges) · cel bands are crisp · the tier slider changes geometry without moving the composition · rate the four looks.

### M2 — Scene library and asset kit
- **Status:** done (v0.3.0) and verified on real hardware (Chrome 156 / Windows / NVIDIA Ampere at 2502×1839, all six checks pass, GPU 4.22 ms/frame). Ten scenes build deterministically at all four tiers (equal triangles and capture hashes on rebuild), and every scene × look passes the M1 checks on WebGPU and WebGL2. Decisions made while building it:
  - **The plain baseline uses the model's own material values** (roughness, metalness, emissive, textures), defaulting to roughness 0.8 and metalness 0. An agent's export carries those values, and it makes the Plain look equal the baseline exactly.
  - **Practical lights** (torches, lamps, campfires) live in the scene, light both render sets, and cast no shadows. Flicker is scene animation.
  - **Grass is merged blades** with a wind `positionNode` (the sea's wave node generalized), not InstancedMesh, for the same hull reason as M1. Deformed, skinned and see-through meshes get no hull.
  - **Scene lighting must stay readable under any look that inherits it.** The dungeon's first rig (moonlight 0.6, ambient 0.4) left Phone-Safe Toon nearly black, so dark scenes keep enough ambient for shadows to read.
  - **Imports** are scaled to a 10 m bounding radius and placed on y = 0, so looks' fog and lines behave. A neutral ground is added when nothing is guessed as terrain or water. The first animation clip plays on the app clock; skinned meshes get skinned twins. Draco and meshopt decoders load on demand; KTX2 textures and morph-target twins are not supported yet. Complexity and density don't apply to imports.
  - **Geometric micro-detail stands in for textures.** Panel seams, bevels and inset plates (like the hangar walls) give flat-colored low-poly models depth that every look can light and outline; Verify called it out. Later kit work keeps adding detail as geometry rather than image textures.
  - **Part guessing** is a pure runtime function (`guessParts`), for later reuse by `convertScene()`. Order: tag → keywords on mesh, material, then ancestors (nearest first) → emissive → the largest low flat mesh is terrain (water if blue) → props.
- **Scope:**
  - Scenes `garden`, `plaza`, `dungeon`, `kart`, `platforms`, `hangar`, `meadow`, `campsite` (P1 set) on the shared kit
  - Characters (mannequin, goose, skater, robot, knight) with procedural animation
  - Camera shots per scene; density slider; scene cards with designer notes
  - Readouts; the benefit-matrix snapshot
  - **`.glb` import** with part heuristics and the pick tool
- **Acceptance:**
  - Every scene builds deterministically at all tiers: the same seed gives the same triangle count and the same capture hash.
  - Smoke checks pass for every scene × M1 look.
  - An imported `.glb` gets sensible parts and can be restyled.
- **Verify checks:** each scene loads and evokes its inspiration (rate) · animations play · import one of your own `.glb` files and report the part guesses.

### M3 — Full filter library
- **Status:** done, in two parts. **M3b done (v0.5.0):** media (generalized Kuwahara, watercolor, mono and CMYK halftone, post hatching, misregistration, paper), material patterns (halftone, hatching, dithered shading, in screen or world space), color variation, vertical gradient, toon water, wind controls, line styling (opacity, colored lines, distance fade, light weighting, wobble with boil, pencil/brush/ink textures), height fog, toon clouds and AA modes (None, FXAA, SMAA, MSAA, TRAA). All 62 effect demos pass on WebGPU and WebGL2. Decisions from M3b: Kuwahara uses eight soft sectors (four quadrants looked boxy); toon water is a shading model on the water part that renders after opaques and reads the depth copy (`viewportDepthTexture`), which forces the pass to skip MSAA; pattern sizes are px at 1080p like everything else, so demo cells enlarge them; height fog is integrated analytically along the view ray and is always compiled into the fog node (cheap ALU); swaying meshes keep no hull. **M3a done (v0.4.0):** light and shadow (AO, contact shadows, blob shadows, time of day, practicals, shadow resolution), lens (DOF, tilt-shift, god rays, motion blur, CA, distortion, letterbox, selective bloom), grade (lift/gamma/gain, vibrance, hue, selective color, LUT presets, gradient map), retro (grid-locked pixelation, pixel edges, posterize, palette quantization, dithering, vertex snap, CRT) and stepped animation. All 34 effect demos render without errors and change the image on WebGPU and WebGL2; the pixel grid passes the exact-pan test. Decisions made while building M3a:
  - **Effects are modules** (`post/stage-*.js`) with `enabled`, `requires`, an optional structural `key` and `build`. The builder walks them in pipeline order, derives the pass's MRT attachments from `requires`, and adds a texture boundary only for neighborhood effects. `activeEffects(values)` lists the enabled ones for briefs and the audit.
  - **Every registry parameter a shader reads is one uniform** (`ParamUniforms`, created on first use, colors as raw sRGB). Uniforms survive graph rebuilds, so values never jump.
  - **Every new effect has its own switch** (structural) plus continuous amounts (uniforms), so sliders never rebuild and morphs can fade amounts from `neutral`. The cheap basic grade controls (lift/gamma/gain, contrast, saturation, vibrance, hue, split tone), vignette, grain and letterbox are always compiled.
  - **The styled set has its own camera,** a per-frame copy of the viewer's. Pixel looks widen its frustum by the pixels that don't divide evenly and render at exactly ⌈W/p⌉ × ⌈H/p⌉ (`StylePassNode`), and every post effect samples low-res texel centers. Each p × p block is one color and a pan by whole texels shifts the image exactly (smoke test).
  - **Contact shadows are an inline ray march,** not r182's `sss()`: its fixed self-intersection test speckled flat ground. Ours biases by distance and skips surfaces facing away from the sun (form shadow is already dark).
  - **Blob shadows darken the receiving materials** (a uniform array of up to 48 owners) instead of drawing transparent decals, which would blend into the ids and normal buffers and z-fight on uneven ground.
  - **Practical lights get a plain twin,** so the look's practical controls change the styled set only and the baseline stays the agent default. The runtime animates flicker for both.
  - **Time of day is resolved, not rendered:** with it on, resolution derives the sun, sky, ambient and fog values from the hour; explicit overrides still win.
  - **LUT presets are generated in code** (`color/lut.js`), the same tables the `.cube` export will bake.
- **Scope:** every P0 and P1 effect in §6.4 that M1 didn't cover:
  - AO, contact shadows, blob shadows
  - DOF, tilt-shift, god rays, chromatic aberration, lens distortion, letterbox
  - Motion blur
  - CDL, split tone, hue, LUT presets, posterize, palette quantization, gradient map, dithering
  - Kuwahara, watercolor, halftone (material and post, mono and CMYK), hatching (material and post), paper, misregistration
  - Render scale with snapped UVs, pixel edges, vertex snap, CRT, stepped animation, line boil, wobble, line texture, light-weighted and fogged lines
  - Toon water, wind, color variation, vertical gradient, toon fog bands, height fog, toon clouds, AA modes

  Every effect ships with its registry entries, Learn text, cost metadata and a Verify contact-sheet cell. The milestone may be split into **M3a** (camera, grade, retro) and **M3b** (media, lines, water) if a session gets long.
- **Acceptance:**
  - Every effect toggles without errors on WebGPU and WebGL2.
  - Each effect changes the image measurably.
  - Pixel looks stay grid-stable during camera motion: a pure pan by whole pixels shifts the image exactly.
- **Verify checks:** contact sheet: report bad cells by id · painterly, halftone and hatching look right at your resolution · the retro pixel grid stays stable while moving · no line or dither "crawl" on slow orbits.

### M4 — Look library, mixing and per-part styling
- **Status:** done (v0.6.0). The library has all 19 looks plus the plain baseline (Retro Console as four variants, Graffiti Rush with a halftone variant). A property test resolves 160 random recipes (module sources, blends, mutes, solos, morphs, part looks, strengths) and random morphs between results, and every value stays valid. Smoke checks on WebGPU and WebGL2: every scene × look renders and differs from plain (all ten scenes on WebGL2, lookdev and harbor on WebGPU), morph, crossfade and wipe land on the target to within 0.1% of a cut, painterly terrain + inked characters + plain sky renders with the brush strokes masked to the terrain (a sky-only effect leaves the ground alone), part sliders never rebuild, a share link reproduces the resolved-look hash and the frame, coherence fixes clear their warning, undo and redo restore looks, and the gallery renders a preview per family. Decisions made while building it:
  - **Recipes resolve per module.** Each module takes its values from the base look, another look (`from`) or a blend of two (`blend: { with, t }`); `morph` blends every module without its own blend; mute gives a module its neutral values; solo mutes the others. Part looks take the chosen part modules (`lighting` ambient, `surface`, `lines`, `palette`, `media`, `retro`); the hero inherits the characters' look and overrides unless it has its own.
  - **Masked post effects** (design §7.11): screen ink, AO, contact shadows, Kuwahara, watercolor, halftone, hatching and paper have a `mask` scope. The runtime folds the per-part switches into one switch (on if any part has it) and a bit mask per switch; a partial mask needs the ids buffer, mixes the effect in by the pixel's part and adds `@mask` to the graph key. Mask bits are uniforms, so changing which parts have an effect only rebuilds when the switch or partiality changes. Screen ink reads per-part weight and color from uniform arrays.
  - **Transitions:** morph blends resolved values every frame (switches on while blending, exactly the target at t = 1). Crossfade and wipe blend the live new look over a **still** of the outgoing frame (two ping-pong targets) instead of rendering the old look live ("set B"): half the cost, and nothing to keep compiled. The old look's animation pauses during the blend.
  - **Gallery previews are rendered on demand** (🖼 Previews) rather than lazily in the background: every look compiles its own pipelines, which costs seconds per look on first use and would stall the view on slower machines. Swatches stand in until then.
  - **Share links** use the browser's `CompressionStream('deflate-raw')` and base64url in `#state=` (scene, tier, density, shot, recipe, parts, overrides, strength, transition, and any non-library looks it references) or `#look=`. Typical links are 250–450 characters. The hash is cleared after opening, and the state autosaves as usual.
  - **Coherence rules are data** (`look/coherence.js`): each has a test on resolved values, a message, a "why" and a fix expressed as Tune overrides, so a fix is one undo step.
  - **The store replaces, not merges, on undo, share links and part edits.** Undo snapshots hold the recipe, parts, overrides and strength.
  - **TRAA resolves the finished image.** Inside a later effect's texture boundary three's `TRAANode` rendered black (it ran nested in another render-to-texture), so TRAA now runs after every other effect, just before the composite.
  - **The smoke suite** runs the detailed M1 checks (hold compare, determinism) on the four M1 looks and covers the rest of the library with the sweep, which keeps the suite under 45 minutes on SwiftShader.
- **Scope:**
  - All 19 looks + Retro variants
  - Gallery with live thumbnails, filter chips, My looks
  - Recipe slots with per-module A/B blend, Morph, strength, mute and solo
  - Interpolation rules; the coherence checker with fixes
  - Morph, crossfade and wipe transitions (set B)
  - Parts tab: per-part looks, modules and overrides; masked post; pick and isolate; focus-hierarchy preset
  - Undo/redo, persistence, share links, JSON import and export
- **Acceptance:**
  - Mixing any two looks at any t never produces an invalid state (property test over random pairs and t values).
  - Transitions land exactly on the target.
  - Painterly terrain + inked characters + plain sky renders correctly.
  - A share URL reproduces the state bit-for-bit (resolved-look hash).
- **Verify checks:** mix two looks you like · style the ground differently from the buildings and characters · transitions feel smooth · open a share link in another browser and confirm the state matches · rate the new looks.

### M5 — Game integration: walk mode, physics, gamepad, zones, plans
- **Status:** done (v0.7.0). Walk mode, the `toybox` scene, look zones in `dungeon`, `campsite` and `harbor`, the level look plan with Play plan, player-selectable modes with a cycle demo and a High-contrast suggestion, the full gamepad map with glyphs, and the gamepad tester (Play tab). The P2 scenes `tabletop` and `alley` are deferred. Unit tests replay the toybox deterministically, walk the dungeon hero into a wall and through a jump, and check zone weights and blends. Smoke checks on WebGPU and WebGL2 drive a scripted standard-mapping pad through every mapped action and the tester, walk from the dungeon hall over the lava onto the dais in 40 steps (weights and look values never jump, float-only zones never rebuild shaders, and the walk ends exactly on the crypt look), replay physics in the page, throw a ball in the toybox, play a two-level plan and suggest a High-contrast mode. Decisions made while building it:
  - **The hero is the player.** Every scene already has one; walk mode moves its top-level group with a kinematic capsule and Rapier's character controller (autostep 0.4 m, slope 50°, snap to ground). A spring-arm camera casts a ray from the player's chest and pulls in when something is in the way.
  - **Static colliders are trimeshes of the T0 build** of terrain, architecture, props, foliage and water, skipping pieces under 35 cm (grass, flowers) and dynamic props. Physics doesn't change with tier.
  - **Dynamic props carry `userData.physics`** (box or ball, density, restitution; `spare` balls sleep out of sight until thrown) and are driven by their bodies. The world steps at a fixed 1/60 s with an accumulator; physics pauses while the clock is frozen, so captures stay repeatable. `replay()` re-runs a scene from scratch with scripted throws for audits.
  - **Zones** (`runtime/look/zones.js`, exported for games) are boxes or spheres with a blend distance and a priority. A zone either names a look or carries **params** that adjust whatever look is on (the crypt darkens and cools any look), which keeps transitions float-only: no shader rebuilds while walking. Weights are smoothstep over the blend distance; looks blend lowest priority first; zones at weight 0 are skipped, so outside every zone the result is exactly the global look.
  - **The plan player** snapshots the outgoing level for crossfade and wipe before loading the next scene, so the blend runs from the old level to the new one.
  - **Gamepad:** View cycles player modes, L3 toggles walk mode, RT throws in the toybox and zooms elsewhere, B closes panels, Y is reserved for M8's designer views. A stick pushed all the way runs.
- **Scope:**
  - Rapier walk mode with a third-person camera; `toybox` scene
  - Full gamepad map, glyphs, gamepad tester
  - Look zones in `dungeon`, `campsite` and `harbor`
  - Level look plan with Play plan; player-selectable modes with a cycle demo
  - P2 scenes `tabletop` and `alley` if time allows (built in M10, v1.1.0)
- **Acceptance:**
  - Walking between zones morphs looks continuously, with no pops.
  - Physics stays deterministic per seed for audits.
  - The full mapping works with a standard-mapping pad.
- **Verify checks:** all mapped buttons respond in the tester · no stick drift at the default deadzone · walking into a zone changes the look smoothly · throwing props feels right · lines and dither hold up in motion.

### M6 — Agent brief and exports
- **Status:** done (v0.8.0). The brief generator (`runtime/brief/brief.js`), `createStyle()` with `convertScene()` (`runtime/create.js`), the kit module, `starter.html`, every export file and the Share tab with a QR code. Unit tests: the brief for every library look × 3 targets × 3 lengths has no missing values and lists every enabled effect in pipeline order (Short stays under 300 words); `.cube` files round-trip through `LUTCubeLoader` within 1/255; the built `stylelab-kit.js` builds every scene at every tier with the same triangle counts as the tool. Smoke checks on WebGPU and WebGL2: `starter.html` renders a tool scene identically to the tool, `convertScene()` styles a plain three.js scene with the right part guesses, the baked grade is the identity for the plain look and round-trips through `LUTCubeLoader` for a graded one, every export file is produced, and the QR code renders. Decisions made while building it:
  - **The brief is assembled from the registry's brief templates** and the look's metadata, and only lists values that say something (not the registry default, and their switch on). Effects are listed from `postChain()`, the same order the post graph runs. A mixed or tweaked state exports as one sparse look (`lookFromResolved`).
  - **Procedural assets are part of every brief:** build in code like the kit (part tags, seeded randomness, tiers, detail as geometry). The kit bundle exports the scenes too, as worked examples of building a level in code.
  - **grade.cube is baked on the GPU** by running the tool's own GRADE stage over an identity lattice (33² × 33 float target), so the LUT matches the tool exactly. It is display-referred; exposure, white balance and tone mapping stay in the brief.
  - **The built HTML embeds the runtime, the kit and the starter template** (about 450 KB), so the single file still exports everything offline. In dev the exports are fetched from `dist/`.
  - **`createStyle()` adds the host scene under the runtime's own scene,** hides the host's sun, hemisphere and ambient lights (the look's rig replaces them) and turns point and spot lights into practicals. The runtime now enables soft shadow maps itself instead of relying on the tool's boot code (that was the one difference the parity check found).
  - **The no-runtime brief names three.js r182 building blocks** for each effect (BloomNode, GTAONode, TRAANode…) instead of generating TSL code: the code would duplicate the runtime, and the runtime target already covers agents that can run it.
- **Scope:**
  - Harden the runtime/editor boundary
  - `createStyle()` public API including `convertScene()` retrofit
  - Brief generator: 3 targets × 3 lengths, templates from the registry, look metadata, plan and modes, mobile tier, acceptance checklist
  - **Procedural assets:** the brief tells the agent to build assets in code the way the kit does. That means three.js geometry with `userData.style` part tags, seeded randomness, complexity tiers, and detail as geometry (seams, bevels, inset plates) rather than image textures. Code-built assets stay readable and editable for agents, fit in one HTML file, and the look's lighting, lines and grade dress them up. The kit ships as `stylelab-kit.js`, a starter library.
  - Exports: `STYLE.md`, `look(s).json`, `stylelab-runtime.js`, `stylelab-kit.js`, `starter.html`, `grade.cube`, palette files, reference and contact sheet, snapshot snippet
  - Share and QR tab
- **Acceptance:**
  - `starter.html` matches the tool's render (smoke parity check).
  - The brief for every built-in look passes unit snapshot checks: no missing values, all enabled effects in pipeline order.
  - `.cube` export round-trips through `LUTCubeLoader` with low error.
  - `stylelab-kit.js` builds every kit asset outside the tool with the same triangle counts as inside it.
- **Verify checks:** **paste the brief into one of your agents, ask for a small scene, and report how close it gets and whether its assets follow the kit** · open `starter.html` next to the tool and compare · try `convertScene()` on an existing agent-made game.

### M7 — Performance audit
- **Status:** done (v0.9.0). The audit runner (`app/perf/audit.js`), the cost model (`runtime/perf/cost-model.js`: the FPE rubric, calibration, the device budget table, verdicts and the phone-friendly substitutions), the report modal with a sorted bar chart, recommendations and stats, "Make phone-friendly variant", and Open on phone (a QR code with `?audit=<target>`, which runs the audit on the phone and offers Copy report). Unit tests: every post effect has a rubric entry; each library look's rating agrees with the rubric within one class; the phone-friendly variant of every 🔴 look comes out ⚠️ or better (Painterly 11.3 → 3.2 FPE, Cinematic 14.4 → 4.4) and is never more expensive. Smoke checks on WebGPU and WebGL2: two consecutive audits of Cinematic give the same ranking (pairs closer than the run-to-run noise may swap) with totals within ±10%, the audit restores the state and the frame exactly, the variant of a 🔴 look comes out ⚠️ or better, and the phone link carries the audit target and the state. Decisions made while building it:
  - **Variants are resolved values with one effect's switch off** (or `quality.aa: none`, `retro.quantize.mode: off`), applied straight to the runtime, so the audit never touches the app state and restoring is one `apply()`. Always-on stages (tone mapping, the basic grade, vignette, grain, letterbox) are not removable; their cost shows up as the styled overhead.
  - **Per-frame timing:** with GPU timestamps, one `resolveTimestampsAsync('render')` per frame; otherwise render and wait for GPU idle each frame. Medians and p90 over all rounds; each round rotates the variant order. Compile time is measured on the first frame of each variant and reported separately.
  - **Calibration:** 1 FPE is the median time of a fullscreen pass with nine texture taps at the target resolution, so measured costs convert to the rubric's unit on any machine.
  - **The rubric is calibrated against the library's hand ratings** (✅ ≤ 5 FPE fits a mid-range phone, ⚠️ ≤ 9 a high-end one), with extra buffers at 0.5 FPE each for tile-based bandwidth and the shadow map by resolution. It rates Anime Cel one class heavier than its hand rating (screen-space colored lines plus bloom need three extra buffers); every look's rating agrees with the rubric within one class, which the unit tests enforce.
  - **Make phone-friendly variant** follows the §6.11 substitution table and saves a sparse look; screen-space lines become hull outlines on the parts that had ink, at 0.8× the weight, so the variant keeps its ink.
- **Scope:**
  - Timer implementations, the audit runner (deterministic, warm-up, interleaved rounds, leave-one-out and standalone)
  - Calibration (FPE), static rubric, device budget table
  - Report modal (chart, stats, recommendations)
  - "Make phone-friendly variant"
  - **Open on phone** (QR) and on-device audit with a copyable report
- **Acceptance:**
  - Two consecutive runs give the same ranking, with totals within ±10%.
  - The audit restores the app state exactly.
  - The mobile variant of each 🔴 look comes out ⚠️ or better under the rubric.
- **Verify checks:** run the audit and judge whether the numbers are plausible · **run it on your phone via the QR code and paste the report** · confirm the mobile variants still look like their parents.

### M8 — Education layer
- **Status:** done (v0.10.0). Content: `content/learn.js` (cards for every parameter: what, why, use, avoid, typical values from the library's ranges, cost, seen in, and a Try this experiment; 79 group texts), `content/lessons.js` (L1–L10 plus the bonus L11, each step a cumulative setup, a caption and an optional task with done/solve), `content/glossary.js` (34 terms). Runtime: designer views as a post-graph stage (`post/views.js`, 15 views, `@view` in the graph key so switching rebuilds only the post graph). App: the Analyze tab (views, critic, palette wheel, histogram, pipeline strip with buffers), the lesson player (a caption bar over the view), the Learn tab (lessons, Build it from scratch, glossary, cards), V / gamepad Y to cycle views. Unit tests: every card complete, every lesson valid against the registry and the library, glossary links resolve, critic rules fire on synthetic frames and the palette extractor finds known clusters. Smoke checks: every lesson completes start to finish through the test API with no errors; every designer view renders, changes the image and switching it off restores the frame exactly; the critic is quiet on every built-in look (or the rule is whitelisted for that look) and fires on purpose-built bad looks, and its fix helps. Decisions made while building it:
  - **Lessons drive the app through the same actions as the UI** (setLook, setParam, setView, open the brief, run a quick audit), so a lesson can never show something the tool can't do. Steps are cumulative: Back and jumping to a step replay the setups from the start, so every step looks the same however you reach it.
  - **The critic reads a 160 × 90 frame of the look itself** (never a designer view), every couple of seconds while the Analyze tab is open. Its rules use luminance percentiles, hue clusters in OKLab, a center-weighted contrast map, edge density, depth-weighted contrast and color-blind simulation (Machado matrices), and each comes with a one-click fix as overrides.
  - **Thresholds tuned on the library**, measured for every look on the lookdev and harbor scenes and on purpose-built bad looks: value range under 40% (the table's 50% flagged soft styles that read fine), more than 7 dominant hues (lookdev's color chart alone has 6), focus contrast under 0.7× the periphery's, with the focus region centered on the scene's subject (its focus point, projected; the walking hero in walk mode) rather than the center third, and letterbox bars cropped before any statistic. Painterly and Layered Wilderness got more contrast where the critic was right about them.
  - **Style exceptions instead of special cases:** where a rule describes a style rather than a mistake (Noir's crushed blacks, the CRT's black mask, Golden Hour's backlit silhouettes), `STYLE_EXCEPTIONS` in `analysis/critic.js` names the rule and the reason. The Analyze tab still shows the tip, marked as part of the look's style with that reason, and the smoke test reads the same list.
  - **Still captures have no motion blur** (the shutter is zero for a frozen frame without `advance`): renders outside the animation loop read stale velocity, which smeared thumbnails and made captures depend on what rendered before.
  - **Typical values come from the library**, as the range the built-in looks use (or the registry's soft range when fewer than two looks set it), so the cards stay true when looks change.
- **Scope:**
  - Effect cards complete for all parameters, with "Show me" and "Try this"
  - Look breakdown with the build-up replay
  - 10 lessons; designer views (all of §6.13); critic rules with fixes
  - Glossary; buffers view; pipeline-strip drill-down
  - "What changed" summaries (P2; built in M10, v1.1.0)
- **Acceptance:**
  - The registry test enforces complete Learn content.
  - Every lesson can be completed start to finish by a test script driving the test API.
  - Critic rules fire on purpose-built bad looks and stay quiet on the built-in looks, or are explicitly whitelisted.
- **Verify checks:** take two lessons and report whether they are clear · check that the critic tips are sensible on your favorite look · check that designer views render correctly.

### M9 — Verify hardening, polish and release
- **Status:** done (v1.0.0). The Verify panel is a guided tour (`verify/tour.js`: twelve sections in learning order, each with an intro and a lesson link); every check has a setup ("Set it up for me") and a "what you'll learn" line, sign-off checks are tagged apart from optional tour steps, and the report lists the sign-offs still owed from M3 on. Onboarding (`ui/onboarding.js`: a welcome with the tour, Lesson 1 or exploring; skipped for share links, the phone audit and automated browsers, forced with `?welcome=1`), the shortcut overlay (`ui/keys.js`, `?`), a friendly start-up failure with a copy button and a WebGL2 retry (`?simulate=boot-error` shows it), share links opened from the address bar of a running tab, a responsive and touch pass, the user guide, and a GitHub Pages workflow for `dist/` that stays inactive until Pages is enabled. Unit tests: every check sits in exactly one tour section with a working setup and a learn line, lessons and looks referenced by the tour exist, every milestone has sign-off checks, and the report lists the owed ones. Smoke checks on WebGPU and WebGL2: the tour shows every check once with its setup and learn line, sign-offs are tagged, sections link real lessons, Set it up for me loads each check's scene and look, the welcome and the key map open and close, a dropped non-model and a cut-off share link explain themselves without errors, a first visit on desktop and on a phone-sized touch screen shows the welcome, fits the screen and logs no errors, and a start-up failure explains what to try. Decisions made while building it:
  - **Learning order over milestone order.** Sections follow how a new user learns the tool (run it, compare, judge lines and light, scenes, effects, mixing, play, critique, budgets, handing off), not the order it was built; milestone ids stay on every check so reports still map to the work.
  - **The tour is the onboarding.** The welcome offers the tour first; the lessons go deeper per section. Optional steps make the tour complete for learning without adding to what I need reported.
  - **Owed means sign-off and from M3 on.** M0–M2 were reported; the report lists the unmarked sign-off checks from M3 to M9 so nothing falls through.
- **Scope:**
  - Verify panel: full checklist, look ratings, contact-sheet grid ids
  - Error UX (friendly overlay with a copy button); onboarding coach marks
  - Responsive and touch layout; shortcut overlay (`?`)
  - README and user guide; GitHub Pages deployment of `dist/`
  - Final contact sheet; known-issues list
- **Acceptance:**
  - S1–S7 from §2 are met or have a documented gap.
  - A clean first run on desktop and on phone has no errors.
- **Verify checks:** full pass; the first-run experience; phone layout.

### M10 — P2 stretch scope
- **Status:** done (v1.1.0). Every item tagged P2 in this document that v1.0 left unbuilt. Scenes: `tabletop` (a hex board on a planked table; terrain assigned by rank so every seed gives a full map) and `alley` (a wet night alley with neon, a lamp, fire escapes, scene rain and two look zones), both at four tiers. Effects, each with registry entries, Learn cards, brief lines, a rubric entry and a contact-sheet cell (E63 on): Gooch and matcap shading models, baked vertex AO, screen-space GI, the physical (Preetham) sky, ambient particles, per-part fog amount, lens flare, anamorphic streaks, afterimage trails, sepia, bleach bypass, `.cube` import, sharpen, anisotropic Kuwahara, image-space Sobel (with a step in lesson L2), the interactable highlight, texture filtering emulation, the affine warp, VHS, low frame-rate rendering, speed lines and per-part stepped animation. Tool: what changed, randomize within ranges, the touch stick, gamepad rumble and D-pad focus navigation in panels, the zip export, the offline build, and KTX2 textures and morph targets in `.glb` imports. Smoke checks (M10) on WebGPU and WebGL2, plus an offline run with the CDN blocked. Decisions made while building it:
  - **Particles never touch the line buffers.** One instanced sprite draws them; positions come from the instance index and the clock in the shader (deterministic, no simulation). Their extra MRT outputs carry alpha 0, so with normal blending the normal, ids, emissive and velocity attachments keep the scene behind them: ink, masks and AO ignore snowflakes.
  - **The sky model is structural, but only for the sky.** Switching gradient ↔ physical rebuilds the dome's material and the fog node (fog takes the sky's color), counted in `info.skyBuilds`; no material or graph rebuilds.
  - **Per-part fog and stepping are uniforms.** The shared fog node reads the material's part when each material builds and scales the factor by that part's uniform; the runtime steps the clock per part (`steppedTime(t, part)`), for the materials' waves and wind and for the scene's animators.
  - **Low frame-rate rendering holds a frame, it doesn't skip one.** Frames render into a held target and every call shows it, so captures and the audit see the cadence too; a new frame is drawn when the clock enters the next slot, or at once when the compare state, the graph or the size changes (hold-to-compare stays instant).
  - **Retro texturing applies to maps, through the material's own color node** (references named to the material, because the shadow pass reads the node's alpha with its own material). Kit textures (bricks, cobbles, planks) are 64² procedural `DataTexture`s, so the PS1 filters have something to show on.
  - **Baked vertex AO is per geometry, from the object itself.** A coarse voxel grid of the object's surface plus the ground it stands on (its asset's origin, or `userData.groundY`), marched from every vertex: crevices, overhangs and contact, deterministic and shared by every copy of a geometry. Separate objects don't occlude each other.
  - **An imported `.cube` is one slot, carried by looks.** It is resampled to 33³ (the grade stage's size), stored apart from the autosaved state, and written into saved and exported looks (`lut`, base64 RGB), so `createStyle()` restores it too.
  - **Milestones compare as numbers**, so M10 sorts after M9 in the report of owed sign-offs.
- **Verify checks:** M10-01 the new effects sheet · M10-02 the two scenes read as their genres · M10-04 PS1 textures · M10-05 effects in motion · M10-09 touch stick and the gamepad in panels; optional M10-03, M10-06, M10-07, M10-08, M10-10, M10-11.

---

## 10. Risks, spikes and open questions

### Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | Custom `LightingModel` behavior (shadow capture, multiple lights) differs from expectations in r182 | Core look quality | M0 spike 1. Fallback: `MeshToonNodeMaterial` + generated gradient maps + `outputNode` post-shading. |
| R2 | Per-material `mrtNode` ids are unreliable (instancing, transparency) | Per-part masks, ID edges | M0 spike 2. Fallback: a separate id pass through `setRenderObjectFunction` with flat id materials. |
| R3 | Layer-filtered lights and shadows in render sets misbehave | Instant compare | M0 spike 3. Fallback: material and rig swap per pass into a render target. |
| R4 | Shader compile times on structural changes feel sluggish | UX | Debounce, a "compiling…" chip, idle pre-warming of likely next looks (gallery hover). Performance is otherwise out of scope. |
| R5 | WebGL2 fallback lacks features (MRT count, float filtering) | Coverage | Capability flags; effects declare requirements; the smoke test runs on WebGL2. |
| R6 | Timestamp queries unavailable or quantized | Audit precision | Timer fallbacks, many-frame medians, the method shown in the report. |
| R7 | Headless WebGPU is unavailable in CI containers | Test coverage | WebGL2 is the CI path; WebGPU is verified by a human in the Verify panel. |
| R8 | Looks don't evoke their inspirations without real assets | Perceived value | Pillars per look; user ratings each milestone; tune recipes from notes. |
| R9 | Scope (100+ effects, 19 looks, 13 scenes) | Schedule | P0/P1/P2 tags; M3 split option; P2 items are cut first. |
| R10 | IP concerns from game references | Legal | Original names; "inspired by" in text only; procedural original content; no logos, characters or audio. |
| R11 | Screen-space patterns slide over moving objects (the "shower-door" effect) | Visual quality in motion | World- and object-space pattern options; lesson L9 explains the trade-off. |
| R12 | A single large file is hard for agents to edit | Development speed | Modular source plus a build step (P9); `dist/` is generated, never hand-edited. |

### Open questions (with the default assumed until answered)

1. **Product name:** default *Style Lab*.
2. **Hosting:** default GitHub Pages from `dist/`. It is needed for the phone QR flow.
3. **`.glb` import priority:** default P1 in M2, because it unlocks trying looks on your own game.
4. **Code exports for other engines:** default no. Spec text, `.cube` LUT and palettes only.
5. **Naming games in "inspired by" labels:** default yes, in text only.
6. **Starter-game scope:** default minimal (ground, player capsule, tagged props, look switcher).
7. **Calling an LLM from the tool** (e.g., "describe my look"): default no. Everything is deterministic and offline-capable.

---

## 11. Effort level per milestone

Recommended reasoning effort for the implementing model, one milestone per session.

- **low:** mechanical edits and docs.
- **medium:** well-specified feature work.
- **high:** multi-part features that need judgment or involve tricky APIs.
- **xhigh:** foundational architecture and graphics correctness, where mistakes cascade.
- **max:** reserved for escalation.

| Milestone | Effort | Why | Escalate to … when |
|---|---|---|---|
| **M0** Foundations and spikes | **high** | Little code, but the spikes on r182 APIs decide the architecture | **xhigh** if two or more spikes fail and a fallback design is needed |
| **M1** Vertical slice | **xhigh** | Custom TSL lighting model, MRT, post-graph builder, render sets, registry; everything later builds on it | **max** if the compare or MRT architecture has to be redesigned |
| **M2** Scene library and asset kit | **medium** | Procedural modeling against a clear contract: volume more than difficulty | **high** for the `.glb` part heuristics if they misclassify |
| **M3** Full filter library | **high** | Many independent shader effects; Kuwahara, watercolor, CMYK halftone and pixel-grid stability need care | **xhigh** for temporal-stability bugs; simple fused color operations can drop to **medium** |
| **M4** Looks, mixing and per-part styling | **xhigh** | Mixing semantics, structural/uniform diffing, per-part masks across materials and post, transitions, undo: subtle state bugs | **max** only if mixing/state bugs persist after two fix attempts |
| **M5** Walk mode, physics, gamepad, zones, plans | **medium** | Standard Rapier and Gamepad work; zones reuse the M4 mixer | **high** if zone blending needs new interpolation logic |
| **M6** Agent brief and exports | **high** | Brief quality decides real-world value; runtime parity and the starter game must be exactly right | **xhigh** if parity tests fail |
| **M7** Performance audit | **high** | Measurement methodology (warm-up, interleaving, timestamp quirks), cost model, state restore | **xhigh** if results aren't repeatable |
| **M8** Education layer | **high** | Accuracy and teaching quality of a lot of content, plus analysis heuristics | **medium** for bulk glossary and card text entry |
| **M9** Verify hardening, polish and release | **medium** | Integration polish, docs, deployment | **low** for copy edits |
| **M10** P2 stretch scope | **high** | Many independent effects and tool features on a settled architecture; the sky, particle and low-frame-rate paths touch the runtime's core | **xhigh** if an effect needs a new kind of pass |

Rule of thumb: run each milestone at its level. Escalate one level only when a concrete trigger in the last column happens. Drop a level for chores inside a milestone.

---

## Appendix A — Look recipes

Starting values for the requested looks plus the phone reference. Pixel sizes are at 1080p. Colors are sRGB hex. Exposure is in EV (0 = neutral). Anything not listed keeps the registry default.

### A.1 Sea Breeze Toon — inspired by *The Wind Waker*
- **Pillars:**
  1. Two hard light tones, never gradients.
  2. Shadows are blue-violet, never gray.
  3. Saturated, simple colors.
  4. A big bright sky.
  5. Lines only on characters.

| Module | Values |
|---|---|
| lighting | sun 55° elevation, #FFF2D6 ×3.2 · ambient sky #8CC8FF / ground #7FA36B ×0.55 · shadows PCF 2048, crisp |
| surface | toon · 2 bands · threshold 0.45 · softness 0.02 · shadow tint #5866D0 @ 0.55 · spec on characters (size 0.08, hard) · no rim |
| lines | hull 1.6 px #20243F on `characters` and `hero` only · screen-space off |
| palette | saturation ×1.25 · value ×1.05 |
| atmosphere | exp² fog 0.006, sky-tinted, 3 toon bands · sky #2D88E8 → #BDEBFF · soft sun disc · toon clouds 0.35 |
| lens | bloom (emissive + luminance > 0.9) strength 0.3, radius 0.4 · vignette 0.08 |
| grade | Neutral tone mapping · contrast 1.05 |
| parts | `water`: toon water, deep #1C6FD1, shallow #45C3E0, foam 0.35 |

- **Common mistakes:** black outlines on terrain; gray shadows; soft gradients in the shading.

### A.2 Graffiti Rush — inspired by *Jet Set Radio / Jet Grind Radio* ("JSGR")
- **Pillars:**
  1. Thick black ink on everything.
  2. Flat two-tone color.
  3. An electric, saturated palette.
  4. Purple shadows.
  5. A wide lens.

| Module | Values |
|---|---|
| lighting | sun 60° elevation, #FFFFFF ×3.0 · ambient ×0.75 (keeps shadows light) · shadows PCF 1024, crisp |
| surface | toon · 2 bands · threshold 0.5 · softness 0.0 · shadow tint #4B2BA8 @ 0.6 · no spec · no rim |
| lines | screen-space 3.0 px · silhouette 1.0 · crease 0.6 (35°) · id edges on · #0B0B0F · hull 2.5 px on characters |
| palette | remap: magenta #FF2E88, cyan #00C8FF, yellow #FFE600, lime #7CFF3A, orange #FF7A1A, asphalt #3A3F4A, concrete #C9CCD3 · saturation ×1.35 |
| atmosphere | no fog · sky #1E9BFF → #A8ECFF |
| lens | FOV 85° · barrel distortion 0.12 · bloom 0.15 |
| grade | Neutral tone mapping · contrast 1.15 |
| variant *· Dots* | halftone in the shadow band (5 px dots, 45°) |

### A.3 Garden Prank — inspired by *Untitled Goose Game*
- **Pillars:**
  1. Flat, soft and pastel.
  2. Shapes read by color, not lines.
  3. Shadows are soft and light.
  4. Calm and uncluttered.

| Module | Values |
|---|---|
| lighting | sun 65° elevation, #FFFDF5 ×2.0 · ambient sky #DCE7EF / ground #BACB9F ×0.95 · shadows PCFSoft 2048, softness 3 |
| surface | half-Lambert · no banding · shadow tint #8FA3BD @ 0.3 · no spec · no rim |
| lines | none |
| palette | remap: grass #A9C784, hedge #7EA35F, path #E9DDC3, wall #F3EEE2, roof #C97A5E, wood #B98C64, water #9DCBD7, accent #E9B949 · saturation ×0.9 |
| light / AO | contact shadows on (or GTAO 0.4, radius 0.6, tint #7E8FA6) |
| atmosphere | no fog · flat sky #CFE3EA |
| lens | FOV 30°, high shot (55° down) · no bloom · no vignette |
| grade | Neutral tone mapping · contrast 0.95 |

### A.4 Comic Ink
- **Pillars:**
  1. Ink defines form: heavier lines on silhouettes and in shadow.
  2. Flat color with halftone shadows.
  3. A printed-paper feel.

| Module | Values |
|---|---|
| surface | toon · 3 bands · thresholds 0.25 / 0.62 · softness 0 · shadow tint #2E2E66 @ 0.45 · halftone on band 1 (6 px, 45°, screen space) · hatching on band 0 (2 layers, ±45°, density 110) · hard white spec, size 0.06 |
| lines | screen-space: silhouette 2.6 px, crease 1.3 px, id edges, light-weighted gain 0.6, #111111, wobble 0.25 px · hull 2 px on characters |
| palette | saturation ×1.15 |
| media | paper newsprint #F3EAD3 @ 0.35 · misregistration 1 px at 30° |
| grade / lens | Neutral tone mapping · contrast 1.1 · vignette 0.12 |
| motion (optional) | line boil 8 fps |

### A.5 Painterly
- **Pillars:**
  1. Brush strokes replace edges.
  2. Warm light, cool shadow.
  3. Color varies within shapes.
  4. Soft focus away from the subject.

| Module | Values |
|---|---|
| lighting | sun 40° elevation, #FFE1B5 ×3.0 · ambient sky #9DB4E8 ×0.6 |
| surface | toon · 3 bands · softness 0.25 · shadow tint #4A5CA6 @ 0.45 · color variation 0.08 (world space, scale 0.6) · vertical gradient 0.15 |
| lines | soft: screen-space 1.4 px, darkened base color ×0.55, opacity 0.45, brush texture |
| media | Kuwahara radius 5, sharpness 8 · canvas 0.25 · watercolor edge darkening 0.15 · grain 0.02 |
| atmosphere | exp fog 0.01, sky-tinted · soft sky gradient |
| lens / grade | bloom 0.25, radius 0.7 · vignette 0.15 · AgX · saturation ×1.08 · contrast 0.95 |
| mobile tier | Kuwahara radius 2 at 0.5 render scale |

### A.6 Retro Console (variants)

| Variant | Values |
|---|---|
| **PS1** (default) | internal height 240, nearest upscale · vertex snap grid 160×120 · affine warp on · 15-bit color + Bayer 4×4 dither 0.7 · linear fog 8 → 45 m, #262636 · no AA · Lambert, no bands · nearest textures |
| **16-bit Pixel** | internal height 270 · PICO-8 palette quantization · pixel edges (normal 0.3, depth 0.4) · no dither · no fog |
| **Game Boy** | internal height 144 · 4-shade palette #0F380F, #306230, #8BAC0F, #9BBC0F · Bayer 4×4 · no fog |
| **CRT Arcade** | PS1 or 16-bit + CRT: scanlines 0.35, aperture mask 0.2, curvature 0.06, glow 0.2 |

- **Pillars:**
  1. Commit to one era.
  2. No modern blur (no DOF, no motion blur).
  3. Hard pixels; dither instead of gradients.

### A.7 Golden Hour
- **Pillars:**
  1. A low warm sun.
  2. Long shadows.
  3. A cool violet fill.
  4. Warm haze.
  5. Light you can feel (glow, rays).

| Module | Values |
|---|---|
| lighting | sun 8° elevation, backlit 3/4 (150° relative to the hero shot), 3200 K (#FFB066) ×4.0 · ambient sky #6E7FD6 / ground #8B5B3C ×0.45 · shadows PCFSoft, softness 2 |
| surface | stylized PBR · warm rim #FFC27A, width 0.35, intensity 0.6, lit side only |
| atmosphere | exp fog 0.012, sky-tinted · height fog 0.3 · sky #3B4C99 → #FF9D5C · large soft sun disc · god rays 0.5 |
| lens | bloom threshold 0.7, strength 0.55, radius 0.6 · lens flare 0.15 · vignette 0.2 |
| grade | AgX · exposure +0.2 · temperature +0.2 · split tone shadows #4B4FA3 / highlights #FFB46B, balance 0.1 · saturation ×1.1 |

### A.8 Cinematic
- **Pillars:**
  1. Filmic contrast.
  2. Teal shadows, warm highlights.
  3. Shallow focus guides the eye.
  4. Widescreen.
  5. Film texture.

| Module | Values |
|---|---|
| lighting | scene sun ×3.0 · ambient ×0.35 · shadows PCFSoft, softness 1.5 · GTAO 0.6 · contact shadows on |
| surface | PBR |
| atmosphere | exp fog 0.008 · height fog 0.2 |
| lens | DOF focus on the hero (auto), f/2.8 equivalent, max blur 0.6 · bloom 0.2 · anamorphic 0.25 #6FA8FF · CA 0.0015 · vignette 0.3 · letterbox 2.39:1 · motion blur 180° shutter |
| grade | ACES · contrast 1.15 · saturation ×0.95 · split tone shadows #1E5F74 / highlights #F2A65A, balance −0.1 |
| media / quality | grain 0.06 animated, size 1.3 · TRAA |
| mobile tier | DOF, motion blur and AO off · FXAA · grain kept |

### A.9 Phone-Safe Toon (reference mobile look)
- **Pillar:** everything a phone GPU likes. One scene pass, no MRT, all styling in materials plus one fused final pass.

| Module | Values |
|---|---|
| surface | toon · 2 bands · softness 0.03 · shadow tint #5B63C9 @ 0.5 · rim 0.3 |
| lines | hull only, 1.5 px, every part except `terrain` and `sky` |
| atmosphere | material fog, sky-tinted, 0.008 · gradient sky |
| lens / grade | no bloom (emissive boost instead) · vignette 0.12 · Neutral tone mapping · saturation ×1.1 · contrast 1.05 (all fused) |
| lighting / quality | shadows 1024 PCF · blob shadows on characters · MSAA 4× or FXAA |

---

## Appendix B — Example agent brief

Excerpt of the *Standard* brief generated for Sea Breeze Toon, target "three.js r182 + Style Lab runtime":

````markdown
# Art direction: Sea Breeze Toon (stylelab look sea-breeze@3)
Reopen in Style Lab: https://…/style-lab.html#look=…
Mood: sunny, playful, clean. Inspired by bright cel-shaded adventure games.

## Pillars (never break these)
1. Two light tones per surface, lit and shadow, with a hard edge. Never smooth gradients.
   Why: flat light shapes make simple geometry read as deliberate illustration.
2. Shadows are blue-violet (#5866D0 at 55%), never gray or black.
   Why: warm light against cool shadow creates contrast without darkening the image.
3. Use only the palette below. Keep colors saturated and simple; no textures except the listed patterns.
4. Outline characters only (1.6 px at 1080p, #20243F). Never outline terrain or buildings.
   Why: lines on characters separate them from the busy background, which is where attention should go.

## Palette (by role)
| Role | Hex | Share of screen |
|---|---|---|
| Sea (deep / shallow) | #1C6FD1 / #45C3E0 | 30% |
| Sand, paths | #F2D9A0 | 15% |
| Grass, foliage | #5DBB4A / #3E9A3A | 20% |
| Walls / roofs | #F4EEDD / #D9553F | 15% |
| Characters (accent) | #2E7D32, #FFCC33 | 10% |
| Sky gradient | #2D88E8 → #BDEBFF | 10% |

## Implementation (three.js r182, WebGPU)
1. Add `stylelab-runtime.js` and `look.json` (exported with this brief) to the project.
2. Create the style once:
   ```js
   import { createStyle } from './stylelab-runtime.js';
   const style = await createStyle({ renderer, scene, camera, looks: [LOOK] });
   ```
3. Never create `MeshStandardMaterial` directly. Use `style.material({ part, color, role })`,
   e.g. `style.material({ part: 'architecture', color: '#F4EEDD', role: 'wall' })`.
4. Tag every mesh with `mesh.userData.part`: terrain | water | foliage | architecture | props | characters | hero | vfx.
5. Render with `style.render()` instead of `renderer.render()`.
6. Existing scene? Call `style.convertScene(scene, { guessParts: true })` once after building it.

## Modeling rules
- Target complexity: Crafted (T2). Bevel box edges by 2–4% of their size (RoundedBoxGeometry).
- Silhouettes first: every object must read as solid black at 64 px tall.
- Characters need eyes. Keep heads about 1/4 of body height for appeal at gameplay distance.
- Put detail near the player path; keep distant geometry simple (the fog bands hide it).

## Performance
Phone-safe (✅). No extra buffers. Mobile tier disables bloom.

## Checklist for every new asset
- [ ] Uses `style.material()` with a palette color and the correct `part`
- [ ] Reads in the value view (grayscale) and as a 64 px silhouette
- [ ] No gradients in shading, no gray shadows, no outlines on terrain or buildings
````

---

## Appendix C — Runtime API

```js
import { createStyle } from './stylelab-runtime.js';

const style = await createStyle({
  renderer, scene, camera,
  looks: [seaBreeze, crypt],          // one or more look JSON objects (or a looks.json plan)
  quality: 'auto',                    // 'desktop' | 'mobile' | 'auto' (picks a tier from adapter and screen)
});

// Materials and tagging
const mat = style.material({ part: 'architecture', color: '#d9a066', role: 'wall' });
style.tag(mesh, 'characters');        // same as mesh.userData.part = 'characters'
style.convertScene(scene, { guessParts: true });   // retrofit an existing game in one call

// Look control
style.setLook('crypt', { transition: 'morph', duration: 1.2 });
style.setZoneWeights({ 'sea-breeze': 0.3, crypt: 0.7 });   // e.g., from trigger volumes
style.setParam('lines.hull.thickness', 2.0, { part: 'hero' });
style.setQuality('mobile');

// Frame
renderer.setAnimationLoop(() => { update(); style.render(); });

// Imported grades (v1.1): a look with grade.lut.preset 'custom' carries its LUT (`lut`);
// a .cube can also be loaded directly.
import { parseCube, setCustomLut } from './stylelab-runtime.js';
setCustomLut(parseCube(await (await fetch('grade.cube')).text()));

// Teardown
style.dispose();
```

The runtime has no DOM dependencies. It expects the host page to provide the same import map as §7.1.

---

## Appendix D — Input map

| Action | Keyboard / mouse | Gamepad (Xbox / PlayStation) |
|---|---|---|
| Hold compare (plain) | hold `Space` | hold `X` / `□` |
| Before/after my edits | `Shift` + hold `Space` | — |
| Split wipe | `C`, then drag the divider | `LT` (analog = divider position) |
| Flicker compare | `F` | — |
| Previous / next look | `Q` / `E` · `1`–`9` favorites | `LB` / `RB` |
| Previous / next scene | `[` / `]` | D-pad ← / → |
| Complexity tier down / up | `-` / `=` | D-pad ↓ / ↑ |
| Orbit / look | drag · scroll to zoom | right stick · `RT` zooms |
| Walk mode toggle / move / jump | `Tab` · `WASD` · `Space` (in walk mode) | `L3` · left stick · `A` / `✕` |
| Cycle designer view | `V` | `Y` / `△` |
| Next camera shot | `N` | `R3` |
| Cycle player visual mode | `M` | `View` / `Select` |
| Audit · Brief · Learn | `P` · `B` · `L` | — |
| Hide UI | `H` | `Menu` / `Options` |
| Screenshot | `Shift+S` | — |
| Undo / redo | `Ctrl+Z` / `Ctrl+Shift+Z` | — |
| Close panel / back | `Esc` | `B` / `○` |
| Move inside an open panel (v1.1) | `Tab` | D-pad (↑/↓ focus, ←/→ change a slider or list), `A` presses |
| Shortcut overlay | `?` | — |

In walk mode, `Space` jumps. Hold compare moves to `X` / `□` on the gamepad, or to the on-screen button. On touch screens (v1.1), walk mode shows a stick bottom-left (push to the rim to run) and a Jump button; dragging elsewhere looks around. A look change rumbles pads that support it.

---

## Appendix E — Lessons

Each lesson is a guided tour that sets the scene, tier and look, captions each step, and gives a small task.

| # | Lesson | Steps (abridged) |
|---|---|---|
| L1 | **Blockout to beautiful** | Plain T0 → cel ramp → shadow tint → outlines → sky + fog → palette → bloom + vignette → compare. "Eight levers, zero new geometry." |
| L2 | Silhouettes and lines | Silhouette view → hull vs. screen-space lines → silhouette vs. crease weight → line noise at T3 → distance fade |
| L3 | Light shapes | Bands 1 → 5 → softness → value view → group values into 3 masses |
| L4 | Color | Gray vs. tinted shadows → palette remap → saturation hierarchy → hue wheel view → 60/30/10 |
| L5 | Depth | Fog off/on → sky-tinted fog (atmospheric perspective) → AO and contact shadows → DOF |
| L6 | Focus and composition | Squint view → vignette → hero focus preset → thirds overlay → critic |
| L7 | Texture and imperfection | Grain hides banding → paper → color variation → painterly |
| L8 | Coherence | Mix two media, then two eras, and read the coherence warnings → fix them |
| L9 | Motion | Stepped animation → line boil → the shower-door effect (screen vs. world patterns) → temporal stability |
| L10 | Budgets | Run the audit → read the chart → make a phone variant → compare |
| L11 | Directing agents (bonus) | Read your brief → pillars → checklist → `convertScene()` |

---

## Appendix F — Glossary seed

| Term | One-line definition |
|---|---|
| NPR | Non-photorealistic rendering: rendering that imitates illustration, paint or print instead of reality |
| Cel shading / toon ramp | Quantizing light into a few flat bands, like animation cels |
| Shadow tint / hue-shifted shadows | Coloring shadows (usually cooler) instead of only darkening them |
| Rim light | A bright edge where a surface turns away from the viewer; separates subject from background |
| Inverted hull | Outlines made by drawing a slightly inflated, inside-out copy of a mesh |
| Screen-space edges | Outlines found by comparing depth, normals or ids between neighboring pixels |
| Crease vs. silhouette | An inner fold line vs. the outer contour; illustrators draw silhouettes heavier |
| Value | Lightness independent of hue; the structure of an image |
| Atmospheric perspective | Distant things look lighter, lower in contrast and tinted toward the sky |
| Tone mapping | Compressing HDR light into displayable range (ACES, AgX, Neutral, …) |
| Color grading / LUT | Creative color transforms; a LUT is a baked 3D lookup table of one |
| ASC CDL | Slope / offset / power / saturation: a standard lift-gamma-gain grade |
| OKLab / OKLCH | Perceptual color spaces; even steps look even, so they are good for mixing |
| Bloom | Light bleeding around bright areas, which reads as brightness |
| GTAO / AO | Ambient occlusion: darkening where surfaces crowd together |
| Depth of field / tilt-shift | Blur by distance from focus; tilt-shift fakes a miniature |
| Kuwahara filter | Edge-preserving smoothing that looks like brush strokes |
| Halftone / Ben-Day dots | Tone made from dot size or density, as in print |
| Dithering (Bayer, blue noise) | Patterned noise that fakes more colors than a palette has |
| Posterize / quantize | Reducing to a fixed number of levels or palette colors |
| Vertex snapping / affine warp | PS1-era artifacts: jittery vertices and wobbly textures |
| MRT | Multiple render targets: one pass writes color, normals, ids, … at once |
| TSL | Three Shading Language: three.js's node-based shader language |
| Shower-door effect | Screen-space patterns that stay fixed while objects move under them |
| Animating on twos | Updating animation every second frame (12 of 24 fps) for a hand-drawn cadence |
| FPE | Fullscreen-pass equivalent: Style Lab's unit for comparing effect costs across devices |
