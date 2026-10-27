# Changelog

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
5. **M0-05** **Reload with WebGL2**, then run the spikes again.
6. **M0-06** Resize the window and zoom the browser; everything stays crisp.

Then Report → **Copy report** and paste it back.

**Known**
- Rapier logs one harmless deprecation warning during init. It comes from inside the compat build (see docs/spikes.md §8).
- The headless test numbers come from a software GPU, so timings say nothing about real hardware.
