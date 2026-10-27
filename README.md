# my-ai-3d-demo

**Style Lab** (working title): a hands-on preview tool for choosing a game's art style. Try stylized looks live on sample scenes, mix and tune them, compare against plain, check what they cost on phones, and export the style as a brief and a drop-in runtime for your AI agents.

**Status:** M0 (foundations and API spikes) is done. See [DESIGN.md](DESIGN.md) for the full design and milestones, [docs/spikes.md](docs/spikes.md) for the M0 spike results, and [CHANGELOG.md](CHANGELOG.md) for what to test.

## Try it

Open **`dist/style-lab.html`** in a WebGPU-capable browser (recent Chrome or Edge; others fall back to WebGL2). It works from disk or from any static host; the dependencies load from jsDelivr. Press **🧪 Verify** to run the checks and copy a report.

## Develop

Requires Node 22+.

```sh
npm install        # pinned dev dependencies (esbuild, plus the same three/Rapier/Tweakpane versions the page loads)
npm run dev        # static server → http://localhost:5173/index.html (runs src/ directly, no build)
npm run build      # → dist/style-lab.html and dist/stylelab-runtime.js
npm test           # unit tests (node:test)
npm run smoke      # build, then headless Chromium: 5 targets × 8 spikes
```

- **Playwright for the smoke test.** Install it locally if you don't have it: `npm i -D playwright && npx playwright install chromium`. The smoke test serves CDN requests from `node_modules`, so it runs offline.
- **Running a scratch module in the page.** `node scripts/dev/eval.mjs <module.js> [--backend webgl|webgpu]` boots the dev page headless and runs the module's default export with `window.__stylelab`.

## Layout

```
index.html            dev entry and build template (holds the import map)
src/runtime/          style engine: no DOM, exported as stylelab-runtime.js
src/app/              the tool: boot, Verify panel, diagnostics, spikes
src/scenes/           sample scenes (M0: test stage)
scripts/              build, dev server, smoke test, import-map helpers
tests/                unit tests
docs/spikes.md        M0 spike results and decisions
dist/                 built single-file deliverable (committed)
```
