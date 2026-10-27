/* Style Lab runtime v0.1.0 (5c3b709) */
// src/runtime/materials/StyleLightingModel.js
import { Color, LightingModel, MeshToonNodeMaterial } from "three/webgpu";
import { float, vec3, uniform, normalView, diffuseColor, luminance, smoothstep, max, fwidth, select } from "three/tsl";
var RECIPROCAL_PI = 1 / Math.PI;
function createSurfaceUniforms({
  softness = 0.02,
  shadowTint = "#5866d0",
  tintStrength = 0.5
} = {}) {
  return {
    softness: uniform(softness),
    shadowTint: uniform(new Color(shadowTint)),
    tintStrength: uniform(tintStrength)
  };
}
var StyleLightingModel = class extends LightingModel {
  /**
   * @param {object} surface
   * @param {number} surface.bands - Number of light bands (structural). 1 = continuous.
   * @param {boolean} surface.wrap - Half-Lambert wrap lighting (structural).
   * @param {object} surface.uniforms - From createSurfaceUniforms().
   */
  constructor(surface) {
    super();
    this.surface = surface;
    this.keyRamp = null;
  }
  start(builder) {
    this.keyRamp = float(0).toVar("styleKeyRamp");
    super.start(builder);
  }
  ramp(amount) {
    const bands = this.surface.bands;
    if (bands <= 1) return amount;
    const s = max(this.surface.uniforms.softness, fwidth(amount).mul(0.5));
    let r = float(0);
    for (let k = 1; k < bands; k++) {
      const t = k / bands;
      r = r.add(smoothstep(s.negate().add(t), s.add(t), amount));
    }
    return r.div(bands - 1);
  }
  direct({ lightDirection, lightColor, lightNode, reflectedLight }) {
    const NdotL = normalView.dot(lightDirection);
    const facing = this.surface.wrap ? NdotL.mul(0.5).add(0.5).pow(2) : NdotL.max(0);
    const base = lightNode.baseColorNode || lightNode.colorNode;
    const baseLuminance = luminance(base);
    const visibility = select(baseLuminance.greaterThan(1e-5), luminance(lightColor).div(baseLuminance), 0);
    const r = this.ramp(facing.mul(visibility).clamp());
    this.keyRamp.assign(max(this.keyRamp, r));
    reflectedLight.directDiffuse.addAssign(diffuseColor.rgb.mul(base).mul(r).mul(RECIPROCAL_PI));
  }
  indirect(builder) {
    const { irradiance, reflectedLight, ambientOcclusion } = builder.context;
    reflectedLight.indirectDiffuse.addAssign(irradiance.mul(diffuseColor.rgb).mul(RECIPROCAL_PI));
    reflectedLight.indirectDiffuse.mulAssign(ambientOcclusion);
  }
  finish(builder) {
    const { shadowTint, tintStrength } = this.surface.uniforms;
    const fill = diffuseColor.rgb.mul(shadowTint).mul(tintStrength).mul(this.keyRamp.oneMinus());
    builder.context.outgoingLight.addAssign(vec3(fill));
  }
};
var StyleSurfaceMaterial = class extends MeshToonNodeMaterial {
  constructor(surface, parameters) {
    super(parameters);
    this.surface = surface;
    this.isStyleSurfaceMaterial = true;
  }
  setupLightingModel() {
    return new StyleLightingModel(this.surface);
  }
};

// src/runtime/materials/outline.js
import { BufferAttribute, Vector3, BackSide } from "three";
var _a = new Vector3();
var _b = new Vector3();
var _c = new Vector3();
var _e1 = new Vector3();
var _e2 = new Vector3();
var _n = new Vector3();
function computeOutlineNormals(geometry, { name = "outlineNormal", precision = 1e4 } = {}) {
  const pos = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const triCount = index ? index.count / 3 : pos.count / 3;
  const keyOf = (i) => `${Math.round(pos.getX(i) * precision)},${Math.round(pos.getY(i) * precision)},${Math.round(pos.getZ(i) * precision)}`;
  const keys = new Array(pos.count);
  for (let i = 0; i < pos.count; i++) keys[i] = keyOf(i);
  const sums = /* @__PURE__ */ new Map();
  const corners = [[_a, _b, _c], [_b, _c, _a], [_c, _a, _b]];
  for (let t = 0; t < triCount; t++) {
    const ia = index ? index.getX(t * 3) : t * 3;
    const ib = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const ic = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    _a.fromBufferAttribute(pos, ia);
    _b.fromBufferAttribute(pos, ib);
    _c.fromBufferAttribute(pos, ic);
    _n.subVectors(_c, _b).cross(_e1.subVectors(_a, _b));
    if (_n.lengthSq() === 0) continue;
    _n.normalize();
    const ids = [ia, ib, ic];
    for (let k = 0; k < 3; k++) {
      const [p, q, r] = corners[k];
      _e1.subVectors(q, p).normalize();
      _e2.subVectors(r, p).normalize();
      const angle = Math.acos(Math.min(1, Math.max(-1, _e1.dot(_e2))));
      const key = keys[ids[k]];
      let sum = sums.get(key);
      if (sum === void 0) sums.set(key, sum = new Vector3());
      sum.addScaledVector(_n, angle);
    }
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const sum = sums.get(keys[i]);
    if (sum === void 0) continue;
    _n.copy(sum).normalize();
    out[i * 3] = _n.x;
    out[i * 3 + 1] = _n.y;
    out[i * 3 + 2] = _n.z;
  }
  geometry.setAttribute(name, new BufferAttribute(out, 3));
  return geometry;
}
function createHullMaterial({ THREE, TSL, color, thickness, normalName = "outlineNormal" }) {
  const { Fn, vec4, attribute, positionLocal, modelViewMatrix, cameraProjectionMatrix, screenSize } = TSL;
  const material = new THREE.MeshBasicNodeMaterial({ side: BackSide });
  material.colorNode = color;
  material.vertexNode = Fn(() => {
    const clip = cameraProjectionMatrix.mul(modelViewMatrix).mul(vec4(positionLocal, 1));
    const nView = modelViewMatrix.mul(vec4(attribute(normalName, "vec3"), 0)).xyz;
    const nClip = cameraProjectionMatrix.mul(vec4(nView, 0)).xy;
    const pixels = thickness.mul(screenSize.y.div(1080));
    const offset = nClip.normalize().mul(pixels).mul(2).div(screenSize).mul(clip.w);
    return vec4(clip.xy.add(offset), clip.zw);
  })();
  return material;
}

// src/runtime/perf/timer.js
function timestampsSupported(renderer) {
  return renderer.backend.trackTimestamp === true && renderer.hasFeature("timestamp-query");
}
async function gpuIdle(renderer) {
  const backend = renderer.backend;
  if (backend.isWebGPUBackend) {
    await backend.device.queue.onSubmittedWorkDone();
  } else {
    const gl = backend.gl;
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  }
}
async function measureFrames(renderer, renderFrame, { frames = 30, method = "auto" } = {}) {
  const useTimestamps = method === "timestamp" || method === "auto" && timestampsSupported(renderer);
  if (useTimestamps) {
    await renderer.resolveTimestampsAsync("render");
    for (let i = 0; i < frames; i++) renderFrame();
    const total = await renderer.resolveTimestampsAsync("render");
    return { method: "timestamp", msPerFrame: (total || 0) / frames };
  }
  await gpuIdle(renderer);
  const t0 = performance.now();
  for (let i = 0; i < frames; i++) renderFrame();
  await gpuIdle(renderer);
  return { method: "wallclock", msPerFrame: (performance.now() - t0) / frames };
}

// src/runtime/index.js
var RUNTIME_VERSION = "0.1.0";
export {
  RUNTIME_VERSION,
  StyleLightingModel,
  StyleSurfaceMaterial,
  computeOutlineNormals,
  createHullMaterial,
  createSurfaceUniforms,
  gpuIdle,
  measureFrames,
  timestampsSupported
};
