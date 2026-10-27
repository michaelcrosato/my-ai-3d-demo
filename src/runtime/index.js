// Style Lab runtime: everything that makes pixels. No DOM or UI imports here,
// so this module can be exported to games unchanged (design §7.3).

export { StyleLightingModel, StyleSurfaceMaterial, createSurfaceUniforms } from './materials/StyleLightingModel.js';
export { computeOutlineNormals, createHullMaterial } from './materials/outline.js';
export { measureFrames, timestampsSupported, gpuIdle } from './perf/timer.js';

export const RUNTIME_VERSION = '0.1.0';
