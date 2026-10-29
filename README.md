# my-ai-3d-demo

**Style Lab** (working title): a hands-on preview tool for choosing a game's art style. Try stylized looks live on sample scenes, mix and tune them, compare against plain, check what they cost on phones, and export the style as a brief and a drop-in runtime for your AI agents.

**Status:** v1.1.0: all milestones (M0–M9) plus the P2 stretch scope (M10) built. Twenty looks in thirteen scenes at four complexity tiers (eleven genre scenes, the reference stage and a physics toybox), 85 effects over 306 parameters, mixing per module and per part, walk mode with physics (keys, gamepad or a touch stick), look zones and a level plan, a performance audit with phone verdicts, an agent brief with a drop-in runtime and asset kit (one zip, `.cube` LUTs in and out), and an education layer: eleven lessons, designer views, a critic, "what changed" against plain, and a Learn card for every parameter. The 🧪 Verify panel is a guided tour of all of it. Still owed: your sign-off reports from M3 on, and the phone measurements that replace the estimated budgets. See the [user guide](docs/user-guide.md), [DESIGN.md](DESIGN.md) for the design and milestones, and [CHANGELOG.md](CHANGELOG.md) for what changed.

## Try it

Open **`dist/style-lab.html`** in a WebGPU-capable browser (recent Chrome or Edge; others fall back to WebGL2). It works from disk or from any static host; the dependencies load from jsDelivr.

On a first visit a welcome offers three ways in: the **guided tour** (🧪 Verify: every check in learning order, each with **Set it up for me**), **Lesson 1**, or just exploring. Press **?** any time for the keyboard and gamepad map.

Pick a look on the left, hold **Space** to compare with the plain baseline, drag **Complexity** in the top bar, and open **Tune** to change anything. Mix looks in the **Look** tab, style the ground, buildings and characters separately in **Parts**, and copy a share link for the whole state. Press **Tab** (or L3) to walk the scene; the **Play** tab has look zones, the level plan, player modes and a gamepad tester. Press **📝 Brief** (or B) for the agent brief and the export files, and **⚡ Audit** (or P) to see what a look costs. Switch scenes in the **Scene** tab, or drop a `.glb` on the window to try looks on your own model. **Analyze** has designer views and the critic, **Learn** the lessons and the glossary. Press **🧪 Verify** for the tour and to copy a report.

## Develop

Requires Node 22+.

```sh
npm install        # pinned dev dependencies (esbuild, plus the same three/Rapier/Tweakpane versions the page loads)
npm run dev        # static server → http://localhost:5173/index.html (runs src/ directly, no build)
npm run build      # → dist/style-lab.html, stylelab-runtime.js, stylelab-kit.js and starter.html
npm run build:offline  # also dist/style-lab-offline.html: three.js, Rapier, Tweakpane inlined, no network needed (~5 MB, not committed)
npm test           # unit tests (node:test)
npm run smoke      # build (with the offline page), then headless Chromium: 6 targets × 8 spikes, plus every milestone's checks (M1–M10) on WebGL2 and WebGPU
```

- **Playwright for the smoke test.** Install it locally if you don't have it: `npm i -D playwright && npx playwright install chromium`. The smoke test serves CDN requests from `node_modules`, so it runs offline. A full run takes a long time on a software GPU; `--only <target>` and `--checks m1,m10` narrow it.
- **Running a scratch module in the page.** `node scripts/dev/eval.mjs <module.js> [--backend webgl|webgpu]` boots the dev page headless and runs the module's default export with `window.__stylelab`.

## Use the style in your own game

`dist/stylelab-runtime.js` is the same engine the tool runs, as an ES module; `dist/stylelab-kit.js` is the procedural asset kit. `dist/starter.html` wires both into a tiny game (serve the folder; browsers don't load modules from `file://`):

```js
import { createStyle } from './stylelab-runtime.js';
const style = await createStyle( { renderer, scene, camera, looks: [ LOOK ] } ); // LOOK: an exported look.json
style.convertScene( scene );   // existing game: keeps colors, guesses parts
renderer.setAnimationLoop( () => { update(); style.render(); } );
```

## Publish (GitHub Pages)

`.github/workflows/pages.yml` deploys `dist/` when it changes on `main` (or by hand from the Actions tab). It does nothing until you enable Pages: repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site's front page is the tool; `stylelab-runtime.js`, `stylelab-kit.js` and `starter.html` sit next to it, so the phone audit's QR code and share links work from there.

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
src/scenes/           thirteen scenes and the procedural asset kit (kit/, with a few procedural textures)
src/app/import/       .glb import (part guessing lives in src/runtime/parts/)
src/export/           the kit bundle entry and the starter.html template
scripts/              build (and --offline), dev server, smoke test and its fixtures, import-map helpers
tests/                unit tests
docs/spikes.md        M0 spike results and decisions
docs/user-guide.md    the user guide
src/content/          looks, lessons, glossary, Learn cards and effect demos
dist/                 built single-file deliverable (committed)
```
