# my-ai-3d-demo

**Style Lab** (working title): a hands-on preview tool for choosing a game's art style. Try stylized looks live on sample scenes, mix and tune them, compare against plain, check what they cost on phones, and export the style as a brief and a drop-in runtime for your AI agents.

**Status:** M6 is done: an agent brief and an export bundle (a drop-in runtime, the procedural asset kit, a starter game, a .cube grade, palettes) so an AI agent can build in your chosen style; eleven scenes from popular genres at four complexity tiers (including a physics toybox), walk mode with a gamepad or WASD and look zones that fade in as you walk, a level look plan and player-selectable visual modes, a gallery of 20 looks (19 styles plus the plain baseline, with Retro Console and Graffiti Rush variants) with live previews, look mixing per module with morphs and transitions, per-part styling (a painterly ground under inked characters), 62 effects across 243 parameters (each effect has its own switch and a cell on the effects sheet), undo, share links, instant compare against the plain baseline, a Tune panel with a Learn card for every parameter, and import of your own `.glb` with automatic part guessing. See [DESIGN.md](DESIGN.md) for the design and milestones, [docs/spikes.md](docs/spikes.md) for the M0 API spikes, and [CHANGELOG.md](CHANGELOG.md) for what to test.

## Try it

Open **`dist/style-lab.html`** in a WebGPU-capable browser (recent Chrome or Edge; others fall back to WebGL2). It works from disk or from any static host; the dependencies load from jsDelivr.

Pick a look on the left, hold **Space** to compare with the plain baseline, drag **Complexity** in the top bar, and open **Tune** to change anything. Mix looks in the **Look** tab, style the ground, buildings and characters separately in **Parts**, and copy a share link for the whole state. Press **Tab** (or L3) to walk the scene; the **Play** tab has look zones, the level plan, player modes and a gamepad tester. Press **📝 Brief** (or B) for the agent brief and the export files. Switch scenes in the **Scene** tab, or drop a `.glb` on the window to try looks on your own model. Press **?** for the keys. Press **🧪 Verify** to run the checks and copy a report.

## Develop

Requires Node 22+.

```sh
npm install        # pinned dev dependencies (esbuild, plus the same three/Rapier/Tweakpane versions the page loads)
npm run dev        # static server → http://localhost:5173/index.html (runs src/ directly, no build)
npm run build      # → dist/style-lab.html, stylelab-runtime.js, stylelab-kit.js and starter.html
npm test           # unit tests (node:test)
npm run smoke      # build, then headless Chromium: 5 targets × 8 spikes, plus the M1–M4 checks on WebGL2 and WebGPU
```

- **Playwright for the smoke test.** Install it locally if you don't have it: `npm i -D playwright && npx playwright install chromium`. The smoke test serves CDN requests from `node_modules`, so it runs offline.
- **Running a scratch module in the page.** `node scripts/dev/eval.mjs <module.js> [--backend webgl|webgpu]` boots the dev page headless and runs the module's default export with `window.__stylelab`.

## Use the style in your own game

`dist/stylelab-runtime.js` is the same engine the tool runs, as an ES module; `dist/stylelab-kit.js` is the procedural asset kit. `dist/starter.html` wires both into a tiny game (serve the folder; browsers don't load modules from `file://`):

```js
import { createStyle } from './stylelab-runtime.js';
const style = await createStyle( { renderer, scene, camera, looks: [ LOOK ] } ); // LOOK: an exported look.json
style.convertScene( scene );   // existing game: keeps colors, guesses parts
renderer.setAnimationLoop( () => { update(); style.render(); } );
```

## Layout

```
index.html            dev entry and build template (holds the import map)
src/runtime/          style engine: no DOM, exported as stylelab-runtime.js (createStyle, brief, cost model)
  registry/           every parameter: range, default, neutral, cost, Learn text, brief line
  look/               look schema, validation, recipes (mixing, parts, strength), coherence rules, share links
  materials/          lighting model, material factory and twins, hull outlines
  atmosphere/ post/   sky, fog and clouds; post graph (camera, grade, medium and display effects)
  render/             light rigs for the styled and plain render sets
src/app/              the tool: app controller, UI, input, physics (Rapier walk mode), Verify panel, diagnostics, spikes
src/content/looks/    the look library
src/scenes/           eleven scenes and the procedural asset kit (kit/)
src/app/import/       .glb import (part guessing lives in src/runtime/parts/)
src/export/           the kit bundle entry and the starter.html template
scripts/              build, dev server, smoke test, import-map helpers
tests/                unit tests
docs/spikes.md        M0 spike results and decisions
dist/                 built single-file deliverable (committed)
```
