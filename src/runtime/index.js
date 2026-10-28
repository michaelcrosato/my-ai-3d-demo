// Style Lab runtime: everything that makes pixels, with no DOM access (design §7.3).
// Built separately as dist/stylelab-runtime.js.

export { StyleRuntime } from './style.js';
export { REGISTRY, MODULES, PARTS, PART_INDEX, byId, defaults, formatBrief, valueLabel } from './registry/index.js';
export { resolveLook, applyStrength, mixValue, lookValue } from './look/resolve.js';
export { validateLook, migrateLook, checkValue, LOOK_SCHEMA } from './look/validate.js';
export * as color from './color/color.js';
export { StyleLightingModel, StyleSurfaceMaterial, createSurfaceUniforms } from './materials/StyleLightingModel.js';
export { computeOutlineNormals, createHullMaterial } from './materials/outline.js';
export { timestampsSupported, gpuIdle, measureFrames } from './perf/timer.js';
export { guessParts, PART_KEYWORDS } from './parts/guess.js';
export { EFFECTS, activeEffects, passRequirements } from './post/graph.js';
export { timeOfDay } from './look/timeofday.js';
export { bakeLut, LUT_PRESETS, PALETTES, bayerMatrix } from './color/lut.js';
export { pixelGrid } from './render/passes.js';

export const RUNTIME_VERSION = '0.4.0';
