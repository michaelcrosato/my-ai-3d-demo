# M0 spike results

The eight API spikes from DESIGN.md §9 (M0). Every spike lives in `src/app/spikes/` and checks itself: it renders offscreen at 256×256, reads the pixels back and compares measured values against expectations, so nobody has to eyeball the result. Open **🧪 Verify → Spikes → Run all spikes** to run them on your own GPU, or call `window.__stylelab.runSpikes()`.

**Verdict: all 8 are go on both backends.** The architecture in DESIGN.md §7 stands. Two decisions feed into M1 (marked **Decision**). One bug was found and fixed in the runtime (spike 1).

## Where these numbers come from

| | |
|---|---|
| Date | 2026-10-27 |
| Browser | Headless Chromium (Playwright 1.63), via `npm run smoke` |
| WebGPU | `google / swiftshader`, software fallback adapter, `timestamp-query` available |
| WebGL2 | ANGLE on SwiftShader Vulkan, `EXT_disjoint_timer_query_webgl2` available |
| Targets | dev page over http (WebGL2), built file over http (WebGL2 and WebGPU), built file from `file://` (WebGL2, and auto, which picked WebGPU) |
| Real hardware | Chrome 156 / Windows, NVIDIA GeForce RTX 3060 Ti, built file from `file://`, WebGPU and WebGL2 (ANGLE D3D11). Run by the user through the Verify panel; see [Real hardware](#real-hardware) |

The values were identical on both backends, apart from timings, and the real-hardware run matched them (see below).

## Summary

| # | Spike | WebGPU | WebGL2 | Outcome |
|---|---|---|---|---|
| 1 | Cel ramp lighting model (shadowed sun + point light) | go | go | Custom `LightingModel` works. N bands give exactly N flat levels. A cast shadow lands on the form-shadow band. Fixed a NaN case for zero-intensity shadowed lights. |
| 2 | Scene-pass MRT: `normal` + `ids` via per-material `mrtNode` | go | go | Works, including `InstancedMesh`. **Decision:** MSAA blends ids, so the pass that writes ids renders with `samples: 0`. |
| 3 | Render sets via `pass().setLayers()` | go | go | Twins, layer-filtered light rigs and per-set shadow maps all work. Compare and split are uniform-only, with no rebuild. |
| 4 | `outputColorTransform = false` + `renderOutput()` mid-graph | go | go | Display-space operations after `renderOutput()` behave as §7.7 assumes |
| 5 | Structural rebuild, leak check (200 rebuilds) | go | go | Textures 20 → 20 and geometries 8 → 8. **Decision:** the graph builder must dispose the effect nodes it replaces. |
| 6 | Hull outlines with smoothed outline normals | go | go | Smoothed: 0% gaps. Flat normals: 3–5% of the silhouette cracks. Width 2.7 px for 3 px requested. |
| 7 | GPU timestamps + wall-clock fallback | go | go | `resolveTimestampsAsync('render')` returns GPU ms on both; the fallback works too |
| 8 | Rapier 0.19.3 compat through the import map | go | go | Loads, simulates, character controller works. One harmless warning from Rapier itself. |

## Details

### 1. Cel ramp lighting model

**Question.** Can a custom `LightingModel` in r182 band the light, and band cast shadows with it instead of multiplying them toward black?

**How it works** (`src/runtime/materials/StyleLightingModel.js`). In r182, `direct()` receives the light node. `lightColor` already contains shadow × attenuation; `lightNode.baseColorNode` doesn't. Their luminance ratio is a scalar *visibility*. Each light's amount is then:

```
amount = facing(N·L) × visibility
```

which is banded with `smoothstep` steps (at least one pixel wide, so the bands stay anti-aliased). Ambient comes from the scene's hemisphere and ambient lights through `indirect()`. A shadow tint is added as a fill, scaled by `1 − strongest ramp`, in `finish()`.

| Measurement | Value | Expected |
|---|---|---|
| Flat levels on a sphere, 2 bands / 3 bands | 2 / 3 | 2 / 3 |
| Lit ground vs. cast-shadow ground (luma) | 0.690 vs 0.151 | Δ > 0.1 |
| Cast shadow vs. form shadow (same scene, sun at 0) | 0.1508 vs 0.1508 | equal |
| Luma spread inside the shadow | 0.000 | < 0.01 |
| Point-light pool levels, toon vs. standard material | 3 vs 29 | 2–4 vs continuous |

- **Bug found and fixed.** A shadow-casting light at intensity 0 produced a NaN shadow term, which ramped to *fully lit*. That would bite any time-of-day system that fades the sun out at night. Lights with zero base luminance now get visibility 0 explicitly.
- **Note.** At 256 px the PCF penumbra was already about 1 px wide, so this spike can't show the ramp *hardening* soft shadow edges. It only shows the ramp never softens them. M1 should look at this with soft shadows at full resolution.
- **Note.** The shadow tint is implemented as an additive fill (`albedo × tint × strength × (1 − keyRamp)`), not the `mix()` sketched in DESIGN.md §7.8. A fill stays controllable when ambient is low. DESIGN.md §7.8 now says so.

### 2. MRT with per-material ids

The pass declares `mrt({ output, normal: directionToColor(normalView), ids: vec4(0) })`. Each material overrides `ids` through `material.mrtNode`, which r182 merges into the pass MRT.

| Measurement | Value |
|---|---|
| Box (part 3, object 10) | [3, 10] |
| Instanced boxes, both instances (part 5) | [5, 30] and [5, 30] |
| Sphere (part 7, object 20) | [7, 20] |
| Background | [0, 0] |
| Normal at the sphere center | [130, 129, 255] (≈ +Z) |
| Pixels with blended (invalid) ids under MSAA ×4 | ~520 |

**Decision.** MSAA averages every attachment, so ids get mixed at object edges. The scene pass that writes `ids` renders with `samples: 0` and the image is anti-aliased in post (FXAA/SMAA), as DESIGN.md §7.7 now states. If MSAA is wanted for the color image, the fallback is a separate non-MSAA id pass.

### 3. Render sets

Twins share one parent and one geometry; set A is on layer 1 and set P on layer 2. Each set has its own sun and its own roof. The test camera sits between the roofs and the ground, so the roofs are visible only through their shadows.

| Measurement | Value | Expected |
|---|---|---|
| Set A: left (own roof) vs. right | 42 vs 322 | left darker |
| Set P: left vs. right (own roof) | 182 vs 42 | right darker |
| Lit color A / P | [188, 67, 67] / [38, 106, 38] | red-tinted / green-tinted |
| Split wipe at 0.5, left / right | P's color / A's color | P \| A |

- **Lights.** They are filtered by the pass layers.
- **Shadow cameras.** Left on layer 0, they inherit the pass layers, so each roof shades only its own set.
- **Compare.** Hold-to-compare and the split wipe are a `mix()` driven by uniforms, so changing them never rebuilds the graph.

### 4. Output transform mid-graph

A linear 0 → 1 ramp is posterized to 4 levels:

| Order | Levels read back | Meaning |
|---|---|---|
| `posterize(renderOutput(x))` | 0, 64, 128, 191 | even steps in display space ✓ |
| `renderOutput(posterize(x))` (control) | 0, 137, 188, 225 | sRGB-spaced steps |

So the GRADE, MEDIUM and DISPLAY stages can run after `renderOutput()` with `outputColorTransform = false`.

### 5. Structural rebuilds

The test cycled four graphs (plain, posterize, gaussian blur, bloom) 200 times: swap `outputNode`, set `needsUpdate`, render, then dispose the effect nodes that were replaced.

| Measurement | Value |
|---|---|
| GPU textures after warm-up → after 200 rebuilds | 20 → 20 |
| Geometries | 8 → 8 |
| Average per rebuild + render (software GPU) | 44 ms WebGPU, 51 ms WebGL2 |

- **Decision.** The post graph builder (§7.10) owns the effect nodes it creates and disposes them on rebuild. Blur and bloom nodes hold render targets that would otherwise leak.
- **Note.** The pass node is created once and reused across rebuilds.

### 6. Hull outlines

`computeOutlineNormals()` (in `src/runtime/materials/outline.js`) adds an angle-weighted `outlineNormal` per position. The hull is extruded along it in clip space, at a width specified at 1080p and scaled by output height. The test cast 360 rays out from the object's centroid and checked each one for outline coverage:

| Shape | Gaps, smoothed normals | Gaps, flat normals | Width (3 px requested) |
|---|---|---|---|
| Cube | 0% | 3.1% | 2.69 px |
| Icosahedron | 0% | 5.0% | 2.70 px |

The flat-normal cracks confirm why outline normals are needed. The unit tests check that cube corners get the exact diagonal and that coincident vertices share one normal.

### 7. GPU timing

- `trackTimestamp: true` + `await renderer.resolveTimestampsAsync('render')` returns the GPU milliseconds since the last resolve.
- **Measured:** 2.1 ms (WebGPU) and 1.4 ms (WebGL2) per frame for a 256 px torus knot, against 1.9 / 1.4 ms wall-clock.
- **Fallback:** wall-clock until the GPU is idle (`queue.onSubmittedWorkDone()`, or a 1-pixel readback on WebGL2). It's implemented in `src/runtime/perf/timer.js`.
- **Real browsers:** not every browser or GPU exposes timestamp queries, and some quantize them. The audit (M7) labels which timer it used.
- **Constraint:** the app resolves timestamps every frame, because with `trackTimestamp` on, unresolved queries pile up. Spikes pause the loop first.

### 8. Rapier through the import map

| Measurement | Value |
|---|---|
| Load + init (embedded WASM) | 82–118 ms |
| `RAPIER.version()` | 0.19.3 |
| Ball dropped from y = 3 onto the ground, after 180 steps | y = 0.599 (rest height 0.6) |
| Character controller, move (1, −0.2, 0) | (0.9998, −0.07, 0) |

**Known warning.** The compat build itself logs `using deprecated parameters for the initialization function; pass a single object instead` during `RAPIER.init()`. It comes from Rapier's own call to its WASM loader, so there's nothing to fix on our side, and it's harmless.

## Real hardware

The user ran the Verify checklist on Chrome 156 / Windows with an RTX 3060 Ti (2026-10-27). All six checks pass: the WebGPU badge, `file://`, no errors while orbiting, spikes on WebGPU, spikes on forced WebGL2, and resize/zoom.

- **Spikes.** All 8 are go on both backends. Every measured value matches the software-GPU run within rounding. For example, the cast shadow equals the form-shadow band at 0.1508 vs 0.1508, and the four posterize levels are 0/64/127/191.
- **Numbers that differ** (WebGL2 run; the WebGPU run was reported as statuses and times only):

| Measurement | Software GPU | RTX 3060 Ti |
|---|---|---|
| S2: pixels with blended ids under MSAA ×4 | ~520 | 460 |
| S5: average per rebuild + render | 51 ms | 19.7 ms |
| S5: whole spike, WebGPU / WebGL2 | — | 3.1 s / 4.0 s |
| S7: GPU time per frame, 256 px torus knot | 1.4 ms | 0.14 ms |
| S8: Rapier load + init | 82–118 ms | 14 ms |
| Test stage at 3387×1855, DPR 1.5 (WebGL2) | — | GPU 4.7–5.8 ms/frame, 60 fps |

- **Warnings.** The only one is Rapier's known init warning (§8).
- **UX fix from this run (v0.1.1).** The WebGL2 reload button was labeled "Set it up for me" while the step said "Reload with WebGL2", so it was hard to find. Action buttons are now labeled with what they do. The report also keeps one spike run per backend, so M0-04 and M0-05 fit in one report.

## What I could not verify here

- Safari, Firefox, phones, and AMD, Intel or Apple GPUs.
- Performance on phones. The M7 perf audit covers it.
