/* Style Lab runtime v1.1.0 (0580aa2) */
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/runtime/style.js
import * as THREE12 from "three/webgpu";
import { mrt as mrt4, output as output4, normalView as normalView2, directionToColor, vec4 as vec48, velocity, emissive, texture as texture3 } from "three/tsl";

// src/runtime/materials/factory.js
import * as THREE4 from "three/webgpu";
import * as TSL from "three/tsl";
import { uniform as uniform4, vec2 as vec23, vec3 as vec34, vec4 as vec42, mrt, output, fract as fract3, sin as sin3, cos as cos3, dot as dot4, floor as floor3, float as float4, mix as mix6, step as step5, smoothstep as smoothstep5, select as select4, modelWorldMatrix, modelViewProjection, positionLocal, positionWorld as positionWorld3, positionView, materialColor, materialReference, texture, uv as uv2, varying, attribute, hue, mx_noise_float, mx_worley_noise_float, viewportDepthTexture, perspectiveDepthToViewZ, cameraNear, cameraFar, Fn as Fn4 } from "three/tsl";

// src/runtime/materials/StyleLightingModel.js
import { Color, LightingModel, MeshToonNodeMaterial, MeshStandardNodeMaterial } from "three/webgpu";
import { float as float2, vec3 as vec33, uniform as uniform2, normalView, normalWorld as normalWorld2, diffuseColor, luminance as luminance2, smoothstep as smoothstep3, max as max3, min, fwidth as fwidth2, select as select3, step as step3, floor as floor2, positionViewDirection, mix as mix4, Fn as Fn2, materialEmissive, screenCoordinate as screenCoordinate3 } from "three/tsl";

// src/runtime/materials/patterns.js
import { vec2, abs, max, step, fract, length, smoothstep, fwidth, cos, sin, select, screenCoordinate, screenSize, positionWorld, normalWorld } from "three/tsl";
var rotate2 = (p12, degrees) => {
  const a = degrees.mul(Math.PI / 180);
  const c = cos(a), s = sin(a);
  return vec2(p12.x.mul(c).sub(p12.y.mul(s)), p12.x.mul(s).add(p12.y.mul(c)));
};
function patternCoord(space, size, angle) {
  if (space === "world") {
    const n = abs(normalWorld);
    const p12 = positionWorld.mul(100).div(size);
    const uv4 = select(n.x.greaterThan(max(n.y, n.z)), p12.zy, select(n.y.greaterThan(n.z), p12.xz, p12.xy));
    return rotate2(uv4, angle);
  }
  return rotate2(screenCoordinate.xy.div(size.mul(screenSize.y.div(1080))), angle);
}
function dotMask(coord, coverage) {
  const d = length(fract(coord).sub(0.5));
  const r = coverage.clamp(0, 1).sqrt().mul(0.7071);
  const aa = max(fwidth(d), 1e-3);
  return smoothstep(r.sub(aa), r.add(aa), d).oneMinus().mul(step(1e-3, coverage));
}
function lineMask(coord, width) {
  const l = abs(fract(coord.y).sub(0.5));
  const aa = max(fwidth(coord.y), 1e-3);
  return smoothstep(width.sub(aa), width.add(aa), l).oneMinus().mul(step(1e-3, width));
}

// src/runtime/post/stage-display.js
import * as THREE from "three/webgpu";
import { Fn, vec2 as vec22, vec3 as vec32, vec4, float, int, ivec2, mix as mix2, max as max2, abs as abs2, step as step2, smoothstep as smoothstep2, sin as sin2, cos as cos2, dot as dot2, fract as fract2, floor, length as length2, atan, select as select2, luminance, textureLoad, interleavedGradientNoise, uniform, uniformArray, screenUV, screenSize as screenSize2, screenCoordinate as screenCoordinate2, uv, nodeObject, convertToTexture, If, Loop } from "three/tsl";
import AfterImageNode from "three/addons/tsl/display/AfterImageNode.js";

// src/runtime/post/colorspace.js
import { vec3, dot, cbrt, sRGBTransferEOTF } from "three/tsl";
function linearToOklab(c) {
  const l = cbrt(dot(c, vec3(0.4122214708, 0.5363325363, 0.0514459929)));
  const m = cbrt(dot(c, vec3(0.2119034982, 0.6806995451, 0.1073969566)));
  const s = cbrt(dot(c, vec3(0.0883024619, 0.2817188376, 0.6299787005)));
  const lms = vec3(l, m, s);
  return vec3(
    dot(lms, vec3(0.2104542553, 0.793617785, -0.0040720468)),
    dot(lms, vec3(1.9779984951, -2.428592205, 0.4505937099)),
    dot(lms, vec3(0.0259040371, 0.7827717662, -0.808675766))
  );
}
var displayToOklab = (c) => linearToOklab(sRGBTransferEOTF(c.max(0)));

// src/runtime/color/lut.js
var clamp01 = (x) => Math.min(1, Math.max(0, x));
var lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
var mix = (a, b, t) => a + (b - a) * t;
var mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
var smooth = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
var sCurve = (x, k) => mix(x, x * x * (3 - 2 * x), k);
var saturate3 = (c, s) => {
  const l = lum(c);
  return c.map((v) => l + (v - l) * s);
};
var softLight = (a, b) => a.map((x, i) => b[i] < 0.5 ? x - (1 - 2 * b[i]) * x * (1 - x) : x + (2 * b[i] - 1) * ((x < 0.25 ? ((16 * x - 12) * x + 4) * x : Math.sqrt(x)) - x));
var LUT_PRESETS = {
  "teal-orange": (c) => {
    const l = lum(c);
    const tone = mix3([0.05, 0.42, 0.5], [1, 0.62, 0.32], smooth(0.15, 0.85, l));
    const graded = softLight(c.map((x) => sCurve(x, 0.35)), tone);
    return saturate3(mix3(c, graded, 0.75), 1.08);
  },
  "warm-film": (c) => {
    const lifted = c.map((x) => 0.035 + sCurve(x, 0.3) * 0.94);
    return saturate3([lifted[0] * 1.06, lifted[1] * 1, lifted[2] * 0.88], 0.92);
  },
  bleach: (c) => {
    const l = lum(c);
    const overlay = c.map((x) => l < 0.5 ? 2 * x * l : 1 - 2 * (1 - x) * (1 - l));
    return saturate3(mix3(c, overlay, 0.65), 0.45).map((x) => sCurve(x, 0.25));
  },
  cross: (c) => [sCurve(c[0], 0.6), sCurve(c[1], 0.3) * 0.95 + 0.04, 0.12 + c[2] * 0.72],
  faded: (c) => saturate3(c.map((x) => 0.08 + x * 0.84), 0.78).map((x, i) => x * [1.02, 1, 0.97][i]),
  "cool-night": (c) => saturate3(c, 0.55).map((x, i) => Math.pow(clamp01(x), 1.2) * [0.78, 0.88, 1.12][i])
};
function bakeLut(preset, size = 33) {
  if (preset === "custom") return custom && size === custom.size ? custom.rgba.slice() : bakeLut(custom ? (c) => sampleLut(custom, c) : (c) => c, size);
  const f = typeof preset === "function" ? preset : LUT_PRESETS[preset];
  if (!f) throw new Error(`Unknown LUT preset ${preset}`);
  const data = new Uint8Array(size * size * size * 4);
  let i = 0;
  for (let b = 0; b < size; b++) for (let g = 0; g < size; g++) for (let r = 0; r < size; r++) {
    const out = f([r / (size - 1), g / (size - 1), b / (size - 1)]);
    data[i++] = Math.round(clamp01(out[0]) * 255);
    data[i++] = Math.round(clamp01(out[1]) * 255);
    data[i++] = Math.round(clamp01(out[2]) * 255);
    data[i++] = 255;
  }
  return data;
}
var PALETTES = {
  pico8: ["#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8", "#ff004d", "#ffa300", "#ffec27", "#00e436", "#29adff", "#83769c", "#ff77a8", "#ffccaa"],
  gameboy: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
  cga: ["#000000", "#55ffff", "#ff55ff", "#ffffff"],
  nes: ["#000000", "#fcfcfc", "#7c7c7c", "#bcbcbc", "#a80020", "#f83800", "#fca044", "#f8b800", "#00a800", "#58d854", "#0058f8", "#3cbcfc", "#6844fc", "#d800cc", "#503000", "#f8d8b8"],
  onebit: ["#16131f", "#e8e2d0"]
};
function bayerMatrix(n) {
  if (n === 1) return [[0]];
  const m = bayerMatrix(n / 2);
  const out = Array.from({ length: n }, () => new Array(n));
  const h = n / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) {
    const v = m[y][x] * 4;
    out[y][x] = v;
    out[y][x + h] = v + 2;
    out[y + h][x] = v + 3;
    out[y + h][x + h] = v + 1;
  }
  return out;
}
var custom = null;
var customVersion = 0;
function parseCube(text) {
  let title = "", size = 0, min5 = [0, 0, 0], max11 = [1, 1, 1];
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    const line2 = raw.trim();
    if (!line2 || line2.startsWith("#")) continue;
    const [key, ...rest] = line2.split(/\s+/);
    if (key === "TITLE") title = line2.slice(5).trim().replace(/^"|"$/g, "");
    else if (key === "LUT_3D_SIZE") size = parseInt(rest[0], 10);
    else if (key === "LUT_1D_SIZE") throw new Error("This is a 1D LUT; Style Lab imports 3D LUTs (LUT_3D_SIZE).");
    else if (key === "DOMAIN_MIN") min5 = rest.map(Number);
    else if (key === "DOMAIN_MAX") max11 = rest.map(Number);
    else if (/^[-+.\d]/.test(key)) rows.push([key, ...rest].slice(0, 3).map(Number));
  }
  if (!(size >= 2 && size <= 128)) throw new Error("Not a 3D .cube LUT (LUT_3D_SIZE missing or out of range).");
  if (rows.length !== size ** 3) throw new Error(`The .cube file has ${rows.length} entries; LUT_3D_SIZE ${size} needs ${size ** 3}.`);
  const data = new Float32Array(size ** 3 * 3);
  rows.forEach((row, i) => {
    for (let k = 0; k < 3; k++) data[i * 3 + k] = clamp01((row[k] - min5[k]) / (max11[k] - min5[k] || 1));
  });
  return { title: title || "Imported LUT", size, data };
}
function sampleLut(lut, c) {
  const n = lut.size, get = lut.data ? (i, k) => lut.data[i * 3 + k] : (i, k) => lut.rgba[i * 4 + k] / 255;
  const p12 = c.map((x) => clamp01(x) * (n - 1));
  const i0 = p12.map((x) => Math.min(n - 2, Math.floor(x))), f = p12.map((x, k) => x - i0[k]);
  const out = [0, 0, 0];
  for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const w = (dx ? f[0] : 1 - f[0]) * (dy ? f[1] : 1 - f[1]) * (dz ? f[2] : 1 - f[2]);
    const i = ((i0[2] + dz) * n + i0[1] + dy) * n + i0[0] + dx;
    for (let k = 0; k < 3; k++) out[k] += get(i, k) * w;
  }
  return out;
}
function setCustomLut(lut, size = 33) {
  customVersion++;
  if (!lut) {
    custom = null;
    return null;
  }
  const rgba = lut.rgba && lut.size === size ? lut.rgba : bakeLut((c) => sampleLut(lut, c), size);
  custom = { title: lut.title || "Imported LUT", size, rgba, version: customVersion };
  return custom;
}
var customLut = () => custom;
function encodeLut(lut) {
  const rgb = new Uint8Array(lut.size ** 3 * 3);
  for (let i = 0; i < lut.size ** 3; i++) for (let k = 0; k < 3; k++) rgb[i * 3 + k] = lut.rgba[i * 4 + k];
  let bin = "";
  for (let i = 0; i < rgb.length; i += 32768) bin += String.fromCharCode(...rgb.subarray(i, i + 32768));
  return { title: lut.title, size: lut.size, rgb: btoa(bin) };
}
function decodeLut({ title, size, rgb }) {
  const bin = atob(rgb);
  if (bin.length !== size ** 3 * 3) throw new Error("The look's LUT data is cut off.");
  const rgba = new Uint8Array(size ** 3 * 4);
  for (let i = 0; i < size ** 3; i++) {
    for (let k = 0; k < 3; k++) rgba[i * 4 + k] = bin.charCodeAt(i * 3 + k);
    rgba[i * 4 + 3] = 255;
  }
  return { title, size, rgba };
}

// src/runtime/color/color.js
var color_exports = {};
__export(color_exports, {
  adjustHex: () => adjustHex,
  hexToLinear: () => hexToLinear,
  hexToOklab: () => hexToOklab,
  hexToRgb: () => hexToRgb,
  isHex: () => isHex,
  kelvinToLinear: () => kelvinToLinear,
  linearToHex: () => linearToHex,
  linearToOklab: () => linearToOklab2,
  linearToSrgb: () => linearToSrgb,
  luminanceOfHex: () => luminanceOfHex,
  mixHex: () => mixHex,
  oklabToHex: () => oklabToHex,
  oklabToLinear: () => oklabToLinear,
  oklabToOklch: () => oklabToOklch,
  oklchToOklab: () => oklchToOklab,
  remapToPalette: () => remapToPalette,
  rgbToHex: () => rgbToHex,
  srgbToLinear: () => srgbToLinear,
  whiteBalanceGains: () => whiteBalanceGains
});
var clamp012 = (x) => Math.min(1, Math.max(0, x));
function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Not a hex color: ${hex}`);
  const n = parseInt(h, 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
function rgbToHex([r, g, b]) {
  const to = (x) => Math.round(clamp012(x) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
var isHex = (v) => typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
var srgbToLinear = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
var linearToSrgb = (c) => c <= 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
var hexToLinear = (hex) => hexToRgb(hex).map(srgbToLinear);
var linearToHex = (rgb) => rgbToHex(rgb.map((c) => linearToSrgb(Math.max(0, c))));
function linearToOklab2([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ];
}
function oklabToLinear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
}
var hexToOklab = (hex) => linearToOklab2(hexToLinear(hex));
var oklabToHex = (lab) => linearToHex(oklabToLinear(lab));
function oklabToOklch([L, a, b]) {
  return [L, Math.hypot(a, b), Math.atan2(b, a) * 180 / Math.PI];
}
function oklchToOklab([L, C, h]) {
  const r = h * Math.PI / 180;
  return [L, C * Math.cos(r), C * Math.sin(r)];
}
function mixHex(a, b, t) {
  const p12 = hexToOklab(a), q = hexToOklab(b);
  return oklabToHex(p12.map((v, i) => v + (q[i] - v) * t));
}
function adjustHex(hex, { saturation: saturation3 = 1, value = 1, hue: hue3 = 0 } = {}) {
  if (saturation3 === 1 && value === 1 && hue3 === 0) return hex.toLowerCase();
  const [L, C, h] = oklabToOklch(hexToOklab(hex));
  return oklabToHex(oklchToOklab([clamp012(L * value), C * saturation3, h + hue3]));
}
function remapToPalette(hex, palette, { keepValue = true } = {}) {
  if (!palette || palette.length === 0) return hex.toLowerCase();
  const lab = hexToOklab(hex);
  let best = null, bestD = Infinity;
  for (const entry of palette) {
    const p12 = hexToOklab(entry);
    const d = 0.5 * (p12[0] - lab[0]) ** 2 + (p12[1] - lab[1]) ** 2 + (p12[2] - lab[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p12;
    }
  }
  return oklabToHex(keepValue ? [(lab[0] + best[0]) / 2, best[1], best[2]] : best);
}
function kelvinToLinear(kelvin) {
  const t = Math.min(4e4, Math.max(1e3, kelvin)) / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const lin = [r, g, b].map((c) => srgbToLinear(clamp012(c / 255)));
  const y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return lin.map((c) => c / y);
}
function whiteBalanceGains(temperature = 0, tint = 0) {
  const light = kelvinToLinear(6500 * Math.pow(2, -temperature));
  const ref = kelvinToLinear(6500);
  const gains = light.map((c, i) => c / ref[i]);
  gains[1] *= 1 - tint * 0.2;
  const y = 0.2126 * gains[0] + 0.7152 * gains[1] + 0.0722 * gains[2];
  return gains.map((c) => c / y);
}
var luminanceOfHex = (hex) => {
  const [r, g, b] = hexToLinear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// src/runtime/post/stage-display.js
var MAX_PALETTE = 16;
var TrailsNode = class extends AfterImageNode {
  constructor(textureNode, damp) {
    super(textureNode, damp);
    this.reset = uniform(1);
  }
  updateBefore(frame) {
    frame.renderer.getDrawingBufferSize(_size);
    this.reset.value = this._compRT.width !== _size.x || this._compRT.height !== _size.y ? 1 : 0;
    super.updateBefore(frame);
  }
  setup(builder) {
    const current = this.textureNode, old = this._textureNodeOld;
    old.uvNode = current.uvNode || uv();
    const material = this._materialComposed || (this._materialComposed = new THREE.NodeMaterial());
    material.name = "Trails";
    material.fragmentNode = Fn(() => mix2(current.sample(), old.sample(), this.damp.mul(this.reset.oneMinus())))();
    builder.getNodeProperties(this).textureNode = current;
    return this._textureNode;
  }
};
var _size = new THREE.Vector2();
var trails = (node, damp) => nodeObject(new TrailsNode(convertToTexture(node), nodeObject(damp)));
var hash = (x) => fract2(sin2(x.mul(12.9898)).mul(43758.5453));
function bayerTexture() {
  const data = new Uint8Array(16 * 64);
  [16, 8, 4, 2].forEach((n, block) => {
    const m = bayerMatrix(n);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) data[(block * 16 + y) * 16 + x] = Math.round((m[y % n][x % n] + 0.5) / (n * n) * 255);
  });
  const t = new THREE.DataTexture(data, 16, 64, THREE.RedFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
var bayer = null;
function ditherThreshold(coord, pattern) {
  bayer ??= bayerTexture();
  const row = float(3).sub(pattern).clamp(0, 3).mul(16);
  const ordered = textureLoad(bayer, ivec2(int(coord.x).mod(16), int(coord.y).mod(16).add(int(row)))).r;
  return select2(pattern.greaterThan(3.5), interleavedGradientNoise(coord), ordered);
}
function createDisplayLists() {
  return {
    paletteRgb: uniformArray(Array.from({ length: MAX_PALETTE }, () => new THREE.Vector3()), "vec3"),
    paletteLab: uniformArray(Array.from({ length: MAX_PALETTE }, () => new THREE.Vector3()), "vec3"),
    paletteCount: uniform(2)
  };
}
function quantizePalette(v) {
  const id = v["retro.quantize.palette"];
  const colors = id === "look" ? v["palette.colors"] : PALETTES[id];
  return (colors && colors.length >= 2 ? colors : PALETTES.onebit).slice(0, MAX_PALETTE);
}
function applyDisplayLists(L, v) {
  const colors = quantizePalette(v);
  colors.forEach((hex, i) => {
    L.paletteRgb.array[i].set(...hexToRgb(hex));
    L.paletteLab.array[i].set(...hexToOklab(hex));
  });
  L.paletteCount.value = colors.length;
}
var DISPLAY = [
  {
    id: "lens.afterimage",
    label: "Afterimage trails",
    stage: "display",
    enabled: (v) => v["lens.afterimage.enabled"],
    requires: () => [],
    build(c, ctx) {
      return ctx.own(trails(vec4(c, 1), ctx.P.get("lens.afterimage.damping"))).getTextureNode().sample(ctx.uv).rgb;
    }
  },
  {
    id: "retro.quantize",
    label: "Color depth and dithering",
    stage: "display",
    enabled: (v) => v["retro.quantize.mode"] !== "off",
    requires: () => [],
    key: (v) => v["retro.quantize.mode"],
    build(c, ctx) {
      const P = ctx.P, L = ctx.lists;
      const d = ditherThreshold(ctx.coord, P.get("retro.dither.pattern")).sub(0.5).mul(P.get("retro.dither.amount"));
      if (ctx.v["retro.quantize.mode"] === "posterize") {
        const n = P.get("retro.quantize.levels").sub(1);
        return floor(c.clamp(0, 1).mul(n).add(0.5).add(d)).div(n).clamp(0, 1);
      }
      return Fn(() => {
        const spread = float(1).div(float(L.paletteCount).sqrt());
        const lab = displayToOklab(c.add(d.mul(spread))).toVar();
        const best = vec32(0).toVar(), bestD = float(1e9).toVar();
        Loop({ start: int(0), end: int(L.paletteCount), type: "int", condition: "<" }, ({ i }) => {
          const delta = lab.sub(L.paletteLab.element(i));
          const dd = dot2(delta, delta);
          If(dd.lessThan(bestD), () => {
            bestD.assign(dd);
            best.assign(L.paletteRgb.element(i));
          });
        });
        return best;
      })();
    }
  },
  {
    id: "lens.ca",
    label: "Chromatic aberration",
    stage: "display",
    neighborhood: true,
    enabled: (v) => v["lens.ca.enabled"],
    requires: () => [],
    build(c, ctx) {
      const tex = ctx.texture(c);
      const p12 = screenUV.sub(0.5);
      const o = p12.mul(length2(p12).mul(2)).mul(ctx.P.get("lens.ca.amount").mul(0.012));
      return vec32(tex.sample(screenUV.add(o)).r, tex.sample(screenUV).g, tex.sample(screenUV.sub(o)).b);
    }
  },
  {
    id: "lens.distortion",
    label: "Lens distortion",
    stage: "display",
    neighborhood: true,
    enabled: (v) => v["lens.distortion.enabled"],
    requires: () => [],
    build(c, ctx) {
      const tex = ctx.texture(c);
      const k = ctx.P.get("lens.distortion.amount").mul(1.6);
      const aspect = screenSize2.x.div(screenSize2.y);
      const p12 = screenUV.sub(0.5).mul(vec22(aspect, 1));
      const r2 = dot2(p12, p12);
      const corner = aspect.mul(aspect).add(1).mul(0.25);
      const zoom = float(1).div(float(1).add(max2(k, 0).mul(corner)));
      const q = p12.mul(r2.mul(k).add(1)).mul(zoom).div(vec22(aspect, 1)).add(0.5);
      return tex.sample(q.clamp(0, 1)).rgb;
    }
  },
  {
    id: "motion.speedLines",
    label: "Speed lines",
    stage: "display",
    enabled: (v) => v["motion.speedLines.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const N = 140;
      const aspect = screenSize2.x.div(screenSize2.y);
      const p12 = ctx.uv.sub(vec22(P.get("motion.speedLines.centerX"), P.get("motion.speedLines.centerY"))).mul(vec22(aspect, 1));
      const r = length2(p12).div(length2(vec22(aspect, 1)).mul(0.5));
      const a = atan(p12.y, p12.x).div(Math.PI * 2).add(0.5).mul(N);
      const cell = floor(a), f = fract2(a);
      const frame = floor(ctx.U.time.mul(12));
      const h1 = hash(cell.add(frame.mul(17.31))), h2 = hash(cell.mul(3.17).add(frame.mul(5.7)).add(1.3)), h3 = hash(cell.mul(7.9).add(frame).add(4.1));
      const amount = P.get("motion.speedLines.amount");
      const on = step2(amount.oneMinus(), h1);
      const width = h2.mul(0.35).add(0.08);
      const wedge = smoothstep2(width, width.mul(0.4), abs2(f.sub(0.5)));
      const start = P.get("motion.speedLines.clear").add(h3.mul(0.5).mul(amount.oneMinus().add(0.3)));
      const reach = smoothstep2(start, start.add(0.18), r);
      return mix2(c, P.get("motion.speedLines.color"), wedge.mul(on).mul(reach));
    }
  },
  {
    id: "lens.vignette",
    label: "Vignette",
    stage: "display",
    always: true,
    enabled: () => true,
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const aspect = screenSize2.x.div(screenSize2.y);
      const sx = mix2(1, aspect, P.get("lens.vignette.roundness"));
      const p12 = ctx.uv.sub(0.5).mul(2).mul(vec22(sx, 1));
      const r = length2(p12).div(length2(vec22(sx, 1)));
      const softness = P.get("lens.vignette.softness");
      const v = smoothstep2(softness.oneMinus(), softness.mul(0.2).add(1), r).mul(P.get("lens.vignette.amount"));
      return mix2(c, P.get("lens.vignette.color"), v);
    }
  },
  {
    id: "media.grain",
    label: "Film grain",
    stage: "display",
    always: true,
    enabled: () => true,
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const cell = floor(ctx.coord.div(P.get("media.grain.size").mul(ctx.gridSize.y.div(1080)).max(1)));
      const seed = floor(ctx.U.time.mul(24)).mul(P.get("media.grain.animated"));
      const n = fract2(sin2(dot2(cell.add(vec22(seed.mul(17.13), seed.mul(41.7))), vec22(12.9898, 78.233))).mul(43758.5453)).sub(0.5);
      const response = luminance(c).sub(0.5).mul(2).pow(2).mul(0.6).oneMinus();
      return c.add(n.mul(P.get("media.grain.amount")).mul(2).mul(response));
    }
  },
  {
    id: "lens.letterbox",
    label: "Letterbox",
    stage: "display",
    always: true,
    enabled: () => true,
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const screen = screenSize2.x.div(screenSize2.y), target = P.get("lens.letterbox.aspect");
      const amount = P.get("lens.letterbox.amount");
      const barY = float(1).sub(screen.div(target)).max(0).mul(0.5).mul(amount);
      const barX = float(1).sub(target.div(screen)).max(0).mul(0.5).mul(amount);
      const uv4 = ctx.uv;
      const bar = max2(max2(step2(uv4.y, barY), step2(barY.oneMinus(), uv4.y)).mul(step2(1e-4, barY)), max2(step2(uv4.x, barX), step2(barX.oneMinus(), uv4.x)).mul(step2(1e-4, barX)));
      return mix2(c, P.get("lens.letterbox.color"), bar);
    }
  },
  {
    id: "retro.vhs",
    label: "VHS",
    stage: "display",
    neighborhood: true,
    enabled: (v) => v["retro.vhs.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const tex = ctx.texture(c);
      return Fn(() => {
        const t = ctx.U.time;
        const y = screenUV.y;
        const jitter = P.get("retro.vhs.jitter");
        const row = floor(y.mul(240));
        const wobble = hash(row.add(floor(t.mul(30)).mul(7.13))).sub(0.5).mul(4e-3);
        const tearAt = sin2(t.mul(0.7)).mul(0.03).add(0.9);
        const tear = smoothstep2(0.05, 0, abs2(y.sub(tearAt))).mul(sin2(y.mul(160).add(t.mul(23))).mul(0.5).add(0.5)).mul(0.025);
        const uvT = vec22(ctx.uv.x.add(wobble.add(tear).mul(jitter)), ctx.uv.y);
        const base = tex.sample(uvT).rgb;
        const Y = luminance(base);
        const px = ctx.texel.x.mul(ctx.gridSize.y.div(1080).max(1)).mul(P.get("retro.vhs.bleed").mul(3).add(0.5));
        const smear = base.add(tex.sample(uvT.sub(vec22(px, 0))).rgb).add(tex.sample(uvT.sub(vec22(px.mul(2), 0))).rgb).add(tex.sample(uvT.sub(vec22(px.mul(3), 0))).rgb).mul(0.25);
        const chroma = mix2(base.sub(Y), smear.sub(luminance(smear)), P.get("retro.vhs.bleed"));
        const col = vec32(Y).add(chroma.mul(0.92)).toVar();
        const snow = hash(screenCoordinate2.x.mul(0.137).add(screenCoordinate2.y.mul(1.731)).add(fract2(t.mul(7.3)).mul(91.7))).sub(0.5);
        const band = smoothstep2(0.06, 0, abs2(fract2(y.add(t.mul(0.12))).sub(0.5)));
        col.addAssign(snow.mul(P.get("retro.vhs.noise")).mul(band.mul(0.6).add(0.25)));
        return col;
      })();
    }
  },
  {
    id: "retro.crt",
    label: "CRT",
    stage: "display",
    neighborhood: true,
    enabled: (v) => v["retro.crt.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const tex = ctx.texture(c);
      return Fn(() => {
        const k = P.get("retro.crt.curvature");
        const p12 = screenUV.mul(2).sub(1).toVar();
        p12.addAssign(p12.mul(p12.yx.mul(p12.yx)).mul(k));
        const uv4 = p12.mul(0.5).add(0.5);
        const edge = smoothstep2(0, 0.012, uv4.x).mul(smoothstep2(0, 0.012, uv4.x.oneMinus())).mul(smoothstep2(0, 0.012, uv4.y)).mul(smoothstep2(0, 0.012, uv4.y.oneMinus()));
        const px = vec22(2).div(screenSize2).mul(screenSize2.y.div(1080));
        const col = tex.sample(uv4).rgb.toVar();
        const glow = tex.sample(uv4.add(vec22(px.x, 0))).rgb.add(tex.sample(uv4.sub(vec22(px.x, 0))).rgb).add(tex.sample(uv4.add(vec22(0, px.y))).rgb).add(tex.sample(uv4.sub(vec22(0, px.y))).rgb).mul(0.25);
        col.assign(mix2(col, max2(col, glow), P.get("retro.crt.glow")).add(glow.mul(P.get("retro.crt.glow")).mul(0.2)));
        const rows = ctx.pixel ? ctx.gridSize.y : screenSize2.y.div(screenSize2.y.div(360).max(2));
        const phase = fract2(uv4.y.mul(rows));
        const scan = float(1).sub(P.get("retro.crt.scanlines").mul(cos2(phase.mul(Math.PI)).pow(2)));
        const triad = floor(screenCoordinate2.x).mod(3);
        const maskRgb = vec32(select2(triad.lessThan(0.5), 1.25, 0.8), select2(triad.lessThan(0.5).or(triad.greaterThan(1.5)), 0.8, 1.25), select2(triad.greaterThan(1.5), 1.25, 0.8));
        const mask = mix2(vec32(1), maskRgb, P.get("retro.crt.mask"));
        const flicker = float(1).add(sin2(ctx.U.time.mul(59)).mul(P.get("retro.crt.flicker")));
        const gain = float(1).add(P.get("retro.crt.scanlines").mul(0.4));
        return col.mul(scan).mul(mask).mul(flicker).mul(gain).mul(edge);
      })();
    }
  }
];

// src/runtime/materials/StyleLightingModel.js
var RECIPROCAL_PI = 1 / Math.PI;
function createSurfaceUniforms({
  threshold = 0.5,
  softness = 0.02,
  shadowTint = "#5866d0",
  tintStrength = 0.5
} = {}) {
  return {
    threshold: uniform2(threshold),
    softness: uniform2(softness),
    shadowTint: uniform2(new Color(shadowTint)),
    tintStrength: uniform2(tintStrength),
    specIntensity: uniform2(0),
    specSize: uniform2(0.15),
    specSoftness: uniform2(0.02),
    rimIntensity: uniform2(0),
    rimWidth: uniform2(0.3),
    rimSoftness: uniform2(0.05),
    rimColor: uniform2(new Color("#ffffff")),
    rimLitSide: uniform2(0),
    // Shading patterns (finish()).
    halftoneSize: uniform2(6),
    halftoneAngle: uniform2(45),
    halftoneThreshold: uniform2(0.75),
    halftoneAmount: uniform2(0.85),
    halftoneColor: uniform2(new Color("#1e1d36")),
    hatchSpacing: uniform2(6),
    hatchAngle: uniform2(-45),
    hatchLayers: uniform2(2),
    hatchThreshold: uniform2(0.3),
    hatchAmount: uniform2(0.85),
    hatchColor: uniform2(new Color("#1e1d36")),
    // Base color (factory colorNode): variation, vertical gradient, toon water.
    variationAmount: uniform2(0.1),
    variationScale: uniform2(0.6),
    variationHue: uniform2(0.4),
    gradientAmount: uniform2(0.3),
    gradientHeight: uniform2(3),
    waterShallow: uniform2(new Color("#45c3e0")),
    waterDeep: uniform2(new Color("#1c6fd1")),
    waterDepth: uniform2(4),
    waterBands: uniform2(3),
    waterFoam: uniform2(0.35),
    waterPattern: uniform2(0.4),
    waterFoamColor: uniform2(new Color("#ffffff")),
    // Wind (factory positionNode).
    windStrength: uniform2(1),
    windSpeed: uniform2(1),
    windGusts: uniform2(0.3),
    // Gooch: cool shade and warm light instead of dark and bright.
    goochCool: uniform2(new Color("#2f4fd0")),
    goochWarm: uniform2(new Color("#ffcc55")),
    goochStrength: uniform2(0.45),
    // Retro texturing, baked vertex AO, the part's fog amount and its animation clock.
    affineAmount: uniform2(1),
    vertexAoStrength: uniform2(0.6),
    fogAmount: uniform2(1),
    time: uniform2(0)
  };
}
var rimTerm = Fn2(([width, softness]) => {
  const fresnel = normalView.dot(positionViewDirection).clamp().oneMinus();
  const edge = width.oneMinus();
  const s = max3(softness, fwidth2(fresnel).mul(0.5));
  return smoothstep3(edge.sub(s), edge.add(s), fresnel);
});
var StyleLightingModel = class extends LightingModel {
  /**
   * @param {object} surface
   * @param {string} surface.model - 'toon' | 'halfLambert' | 'flat' (structural)
   * @param {number} surface.bands - Number of light bands (structural). 1 = continuous.
   * @param {object} surface.uniforms - From createSurfaceUniforms().
   * @param {object} [surface.patterns] - { halftone: 'screen'|'world'|null, hatching: …, dither: bool } (structural)
   */
  constructor(surface) {
    super();
    this.surface = surface;
    this.keyRamp = null;
  }
  start(builder) {
    this.keyRamp = float2(0).toVar("styleKeyRamp");
    super.start(builder);
  }
  ramp(amount) {
    const bands = this.surface.bands;
    if (this.surface.patterns?.dither) {
      const n = Math.max(1, bands - 1);
      return floor2(amount.mul(n).add(ditherThreshold(floor2(screenCoordinate3.xy), float2(1)))).div(n).clamp(0, 1);
    }
    if (bands <= 1) return amount;
    const { threshold, softness } = this.surface.uniforms;
    const s = max3(softness, fwidth2(amount).mul(0.5));
    let r = float2(0);
    for (let k = 1; k < bands; k++) {
      const t = min(threshold.mul(2 * k / bands), 0.98);
      r = r.add(smoothstep3(t.sub(s), t.add(s), amount));
    }
    return r.div(bands - 1);
  }
  facing(NdotL) {
    switch (this.surface.model) {
      case "halfLambert":
        return NdotL.mul(0.5).add(0.5).pow(2);
      case "gooch":
        return NdotL.mul(0.5).add(0.5);
      case "flat":
        return float2(1);
      default:
        return NdotL.max(0);
    }
  }
  direct({ lightDirection: lightDirection2, lightColor, lightNode, reflectedLight }) {
    const NdotL = normalView.dot(lightDirection2);
    const base = lightNode.baseColorNode || lightNode.colorNode;
    const baseLuminance = luminance2(base);
    const visibility = select3(baseLuminance.greaterThan(1e-5), luminance2(lightColor).div(baseLuminance), 0);
    const r = this.ramp(this.facing(NdotL).mul(visibility).clamp());
    this.keyRamp.assign(max3(this.keyRamp, r));
    const albedo = this.surface.model === "gooch" ? mix4(diffuseColor.rgb, this.surface.uniforms.goochWarm, this.surface.uniforms.goochStrength) : diffuseColor.rgb;
    reflectedLight.directDiffuse.addAssign(albedo.mul(base).mul(r).mul(RECIPROCAL_PI));
    const { specIntensity, specSize, specSoftness } = this.surface.uniforms;
    const H = lightDirection2.add(positionViewDirection).normalize();
    const x = normalView.dot(H).clamp().oneMinus().div(specSize.mul(specSize).mul(0.5).max(1e-4));
    const w = max3(specSoftness.mul(4), fwidth2(x).mul(0.5));
    const spec = smoothstep3(w.oneMinus(), w.add(1), x).oneMinus().mul(step3(0, NdotL));
    reflectedLight.directSpecular.addAssign(base.mul(visibility).mul(spec).mul(specIntensity));
  }
  indirect(builder) {
    const { irradiance, reflectedLight, ambientOcclusion } = builder.context;
    reflectedLight.indirectDiffuse.addAssign(irradiance.mul(diffuseColor.rgb).mul(RECIPROCAL_PI));
    reflectedLight.indirectDiffuse.mulAssign(ambientOcclusion);
  }
  finish(builder) {
    const u = this.surface.uniforms;
    let fill = diffuseColor.rgb.mul(u.shadowTint).mul(u.tintStrength).mul(this.keyRamp.oneMinus());
    if (this.surface.model === "gooch") fill = fill.add(mix4(diffuseColor.rgb, u.goochCool, u.goochStrength).mul(this.keyRamp.oneMinus()).mul(0.45));
    const rim = rimTerm(u.rimWidth, u.rimSoftness).mul(u.rimIntensity).mul(mix4(1, this.keyRamp, u.rimLitSide));
    const outgoing = builder.context.outgoingLight;
    outgoing.addAssign(vec33(fill).add(u.rimColor.mul(rim)));
    const p12 = this.surface.patterns || {};
    const light = this.keyRamp;
    if (p12.halftone) {
      const coverage = u.halftoneThreshold.sub(light).div(max3(u.halftoneThreshold, 1e-3)).clamp(0, 1);
      const dots = dotMask(patternCoord(p12.halftone, u.halftoneSize, u.halftoneAngle), coverage);
      outgoing.assign(mix4(outgoing, u.halftoneColor, dots.mul(u.halftoneAmount)));
    }
    if (p12.hatching) {
      let lines = float2(0);
      for (let k = 0; k < 3; k++) {
        const level = u.hatchThreshold.mul(1 - k * 0.4);
        const on = step3(float2(k).add(0.5), u.hatchLayers);
        const depth = level.sub(light).div(max3(level, 1e-3)).clamp(0, 1);
        const coord = patternCoord(p12.hatching, u.hatchSpacing, u.hatchAngle.add(k * 70));
        lines = max3(lines, lineMask(coord, depth.mul(0.22).add(0.08).mul(step3(light, level))).mul(on));
      }
      outgoing.assign(mix4(outgoing, u.hatchColor, lines.mul(u.hatchAmount)));
    }
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
var StyleStandardMaterial = class extends MeshStandardNodeMaterial {
  constructor(surface, keyDirection, parameters) {
    super(parameters);
    this.surface = surface;
    this.isStyleSurfaceMaterial = true;
    const u = surface.uniforms;
    const lit = smoothstep3(0, 0.35, normalWorld2.dot(keyDirection));
    const rim = rimTerm(u.rimWidth, u.rimSoftness).mul(u.rimIntensity).mul(mix4(1, lit, u.rimLitSide));
    this.emissiveNode = materialEmissive.add(u.rimColor.mul(rim));
  }
};

// src/runtime/materials/outline.js
import { BufferAttribute, Vector3 as Vector32, BackSide } from "three";
var _a = new Vector32();
var _b = new Vector32();
var _c = new Vector32();
var _e1 = new Vector32();
var _e2 = new Vector32();
var _n = new Vector32();
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
      const [p12, q, r] = corners[k];
      _e1.subVectors(q, p12).normalize();
      _e2.subVectors(r, p12).normalize();
      const angle = Math.acos(Math.min(1, Math.max(-1, _e1.dot(_e2))));
      const key = keys[ids[k]];
      let sum = sums.get(key);
      if (sum === void 0) sums.set(key, sum = new Vector32());
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
function createHullMaterial({ THREE: THREE15, TSL: TSL2, color, thickness, normalName = "outlineNormal", snapRows = null }) {
  const { Fn: Fn10, vec4: vec49, attribute: attribute2, positionLocal: positionLocal2, modelViewMatrix, cameraProjectionMatrix, screenSize: screenSize5 } = TSL2;
  const material = new THREE15.MeshBasicNodeMaterial({ side: BackSide });
  material.colorNode = color;
  material.vertexNode = Fn10(() => {
    const clip = cameraProjectionMatrix.mul(modelViewMatrix).mul(vec49(positionLocal2, 1));
    const nView = modelViewMatrix.mul(vec49(attribute2(normalName, "vec3"), 0)).xyz;
    const nClip = cameraProjectionMatrix.mul(vec49(nView, 0)).xy;
    const pixels = thickness.mul(screenSize5.y.div(1080));
    const offset = nClip.normalize().mul(pixels).mul(2).div(screenSize5).mul(clip.w);
    const out = vec49(clip.xy.add(offset), clip.zw);
    return snapRows ? snapClip(TSL2, out, snapRows) : out;
  })();
  return material;
}
function snapClip(TSL2, clip, rows) {
  const { vec2: vec211, vec4: vec49, floor: floor10, screenSize: screenSize5 } = TSL2;
  const grid = vec211(rows.mul(screenSize5.x.div(screenSize5.y)), rows).mul(0.5);
  const ndc = clip.xy.div(clip.w);
  return vec49(floor10(ndc.mul(grid).add(0.5)).div(grid).mul(clip.w), clip.zw);
}

// src/runtime/materials/matcaps.js
import * as THREE2 from "three/webgpu";
var SIZE = 128;
var cache = /* @__PURE__ */ new Map();
var norm = (v) => {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
};
var dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var mix5 = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
var smooth2 = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
var KEY = norm([-0.45, 0.55, 0.7]);
var HALF = norm([KEY[0], KEY[1], KEY[2] + 1]);
var MATCAPS = {
  // Soft studio clay: wrapped key light, a cool fill from below, a faint rim.
  clay: (n) => {
    const key = Math.max(0, (dot3(n, KEY) + 0.3) / 1.3);
    const fill = Math.max(0, -n[1]) * 0.12;
    const rim = Math.pow(1 - n[2], 3) * 0.18;
    return mix5([0.16, 0.15, 0.17], [0.92, 0.88, 0.82], key).map((c, i) => c + fill * [0.6, 0.7, 1][i] + rim);
  },
  // Two-tone toon: a hard light/shade split, a hard highlight and a dark rim band.
  toon: (n) => {
    const lit = smooth2(0.18, 0.22, dot3(n, KEY));
    let c = mix5([0.42, 0.42, 0.52], [0.95, 0.93, 0.9], lit);
    if (Math.pow(Math.max(0, dot3(n, HALF)), 80) > 0.45) c = [1, 1, 1];
    return mix5(c, [0.18, 0.18, 0.24], smooth2(0.9, 0.94, Math.hypot(n[0], n[1])));
  },
  // Chrome: the view reflected into a sky above and dark ground below a bright horizon, plus a softbox.
  chrome: (n) => {
    const r = [2 * n[2] * n[0], 2 * n[2] * n[1], 2 * n[2] * n[2] - 1];
    const sky = mix5([0.55, 0.7, 0.9], [0.12, 0.25, 0.55], Math.max(0, r[1]));
    const ground = mix5([0.3, 0.24, 0.2], [0.06, 0.05, 0.05], Math.min(1, -r[1] * 2));
    let c = r[1] > 0 ? sky : ground;
    c = mix5(c, [1, 1, 1], Math.exp(-Math.abs(r[1]) * 40) * 0.9);
    const box = smooth2(0.75, 0.8, dot3(norm(r), norm([-0.5, 0.6, 0.6])));
    return mix5(c, [1, 1, 1], box);
  },
  // Pearl: soft white with a pink-to-blue sheen toward the rim.
  pearl: (n) => {
    const key = 0.75 + 0.25 * dot3(n, KEY);
    const rim = Math.pow(1 - n[2], 2);
    const sheen = mix5([1, 0.82, 0.9], [0.75, 0.85, 1], (n[0] + 1) / 2);
    return mix5([key, key, key * 0.98], sheen, rim * 0.8).map((c) => c + Math.pow(Math.max(0, dot3(n, HALF)), 30) * 0.25);
  }
};
function matcapTexture(preset) {
  if (cache.has(preset)) return cache.get(preset);
  const shade = MATCAPS[preset] || MATCAPS.clay;
  const data = new Uint8Array(SIZE * SIZE * 4);
  const toSrgb = (x) => Math.round(255 * Math.min(1, Math.max(0, x <= 31308e-7 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055)));
  for (let j = 0; j < SIZE; j++) for (let i = 0; i < SIZE; i++) {
    const x = (i + 0.5) / SIZE * 2 - 1, y = (j + 0.5) / SIZE * 2 - 1;
    const r2 = Math.min(1, x * x + y * y);
    const n = norm([x, y, Math.sqrt(1 - r2) + 1e-4]);
    const c = shade(n);
    const k = (j * SIZE + i) * 4;
    data[k] = toSrgb(c[0]);
    data[k + 1] = toSrgb(c[1]);
    data[k + 2] = toSrgb(c[2]);
    data[k + 3] = 255;
  }
  const t = new THREE2.DataTexture(data, SIZE, SIZE, THREE2.RGBAFormat, THREE2.UnsignedByteType);
  t.colorSpace = THREE2.SRGBColorSpace;
  t.minFilter = t.magFilter = THREE2.LinearFilter;
  t.needsUpdate = true;
  t.name = `matcap:${preset}`;
  cache.set(preset, t);
  return t;
}

// src/runtime/materials/vertexAo.js
import { Vector3 as Vector33, Matrix3, BufferAttribute as BufferAttribute2 } from "three/webgpu";
var DIRS = Array.from({ length: 12 }, (_, i) => {
  const u = (i + 0.5) / 12, a = i * 2.399963;
  const r = Math.sqrt(u);
  return [r * Math.cos(a), r * Math.sin(a), Math.sqrt(1 - u)];
});
var MAX_CELLS = 72;
function bakeVertexAo(geometry, { matrix = null, ground = 0, radius = 1.2 } = {}) {
  const pos = geometry.getAttribute("position");
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  const nor = geometry.getAttribute("normal");
  const count = pos.count;
  const P = new Float32Array(count * 3), N = new Float32Array(count * 3);
  const v = new Vector33(), nm = matrix ? new Matrix3().getNormalMatrix(matrix) : null;
  let min5 = [Infinity, Infinity, Infinity], max11 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(pos, i);
    if (matrix) v.applyMatrix4(matrix);
    P[i * 3] = v.x;
    P[i * 3 + 1] = v.y;
    P[i * 3 + 2] = v.z;
    min5 = [Math.min(min5[0], v.x), Math.min(min5[1], v.y), Math.min(min5[2], v.z)];
    max11 = [Math.max(max11[0], v.x), Math.max(max11[1], v.y), Math.max(max11[2], v.z)];
    v.fromBufferAttribute(nor, i);
    if (nm) v.applyMatrix3(nm);
    v.normalize();
    N[i * 3] = v.x;
    N[i * 3 + 1] = v.y;
    N[i * 3 + 2] = v.z;
  }
  const lo = min5.map((x) => x - radius), extent = max11.map((x, k) => x + radius - lo[k]);
  const h = Math.max(Math.max(...extent) / MAX_CELLS, radius / 10);
  const dim = extent.map((e) => Math.max(1, Math.ceil(e / h)));
  const grid = new Uint8Array(dim[0] * dim[1] * dim[2]);
  const cell = (x, y, z) => {
    const i = Math.floor((x - lo[0]) / h), j = Math.floor((y - lo[1]) / h), k = Math.floor((z - lo[2]) / h);
    return i < 0 || j < 0 || k < 0 || i >= dim[0] || j >= dim[1] || k >= dim[2] ? -1 : (k * dim[1] + j) * dim[0] + i;
  };
  const index = geometry.index;
  const tris = index ? index.count / 3 : count / 3;
  const corner = (t, c) => (index ? index.getX(t * 3 + c) : t * 3 + c) * 3;
  for (let t = 0; t < tris; t++) {
    const a = corner(t, 0), b = corner(t, 1), c = corner(t, 2);
    const e = Math.max(Math.hypot(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2]), Math.hypot(P[a] - P[c], P[a + 1] - P[c + 1], P[a + 2] - P[c + 2]), Math.hypot(P[b] - P[c], P[b + 1] - P[c + 1], P[b + 2] - P[c + 2]));
    const n = Math.min(64, Math.ceil(e / (h * 0.7)));
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
      const u = i / n || 0, w = j / n || 0, s = 1 - u - w;
      const id = cell(P[a] * s + P[b] * u + P[c] * w, P[a + 1] * s + P[b + 1] * u + P[c + 1] * w, P[a + 2] * s + P[b + 2] * u + P[c + 2] * w);
      if (id >= 0) grid[id] = 1;
    }
  }
  const out = new Float32Array(count);
  const stepLen = h * 0.8, steps = Math.max(2, Math.ceil(radius / stepLen));
  for (let i = 0; i < count; i++) {
    const nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
    const px = P[i * 3] + nx * h * 1.5, py = P[i * 3 + 1] + ny * h * 1.5, pz = P[i * 3 + 2] + nz * h * 1.5;
    const tx = Math.abs(nx) < 0.9 ? [0, nz, -ny] : [-nz, 0, nx];
    const tl = Math.hypot(...tx) || 1;
    const T = tx.map((x) => x / tl), B = [ny * T[2] - nz * T[1], nz * T[0] - nx * T[2], nx * T[1] - ny * T[0]];
    let occ = 0;
    for (const [dx, dy, dz] of DIRS) {
      const rx = T[0] * dx + B[0] * dy + nx * dz, ry = T[1] * dx + B[1] * dy + ny * dz, rz = T[2] * dx + B[2] * dy + nz * dz;
      for (let k = 1; k <= steps; k++) {
        const d = (k - 1) * stepLen;
        if (d > radius) break;
        const x = px + rx * d, y = py + ry * d, z = pz + rz * d;
        if (ground !== null && y < ground || grid[cell(x, y, z)] === 1) {
          occ += 1 - d / radius;
          break;
        }
      }
    }
    out[i] = Math.max(0, 1 - occ / DIRS.length * 1.6);
  }
  geometry.setAttribute("stylelabAo", new BufferAttribute2(out, 1));
  return out;
}

// src/runtime/render/blobs.js
import * as THREE3 from "three/webgpu";
import { Fn as Fn3, uniformArray as uniformArray2, uniform as uniform3, float as float3, int as int2, Loop as Loop2, max as max4, smoothstep as smoothstep4, step as step4, positionWorld as positionWorld2 } from "three/tsl";
var MAX_BLOBS = 48;
var MAX_FOOTPRINT = 6;
var _box = new THREE3.Box3();
var _size2 = new THREE3.Vector3();
var BlobShadows = class {
  constructor() {
    this.data = uniformArray2(Array.from({ length: MAX_BLOBS }, () => new THREE3.Vector4()), "vec4");
    this.count = uniform3(0, "int");
    this.softness = uniform3(0.6);
    this.opacity = uniform3(0.5);
    this.size = 1.1;
    this.candidates = [];
    this.owners = [];
    this.parts = /* @__PURE__ */ new Set();
    this.node = null;
  }
  /** Collects candidate owners: top-level objects, each with its dominant part and local bounds. */
  setScene(root) {
    this.candidates = [];
    root.updateMatrixWorld(true);
    const inverse = new THREE3.Matrix4();
    for (const object of root.children) {
      const counts = {};
      const box = new THREE3.Box3();
      inverse.copy(object.matrixWorld).invert();
      object.traverse((o) => {
        if (!o.isMesh || !o.userData.style) return;
        counts[o.userData.style.part] = (counts[o.userData.style.part] || 0) + 1;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        box.union(_box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).applyMatrix4(inverse));
      });
      const part = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!part || box.isEmpty()) continue;
      box.getSize(_size2);
      if (Math.max(_size2.x, _size2.z) > MAX_FOOTPRINT * 2) continue;
      this.candidates.push({ object, part, box });
    }
    this.select();
  }
  /** Parts whose objects get blobs. Returns true when the set changed. */
  setParts(parts) {
    const next = new Set(parts);
    const changed = next.size !== this.parts.size || [...next].some((p12) => !this.parts.has(p12));
    this.parts = next;
    if (changed) this.select();
    return changed;
  }
  select() {
    this.owners = this.candidates.filter((c) => this.parts.has(c.part)).slice(0, MAX_BLOBS);
  }
  get active() {
    return this.parts.size > 0;
  }
  /** Per frame: owners' world footprints into the uniform array (x, base y, z, radius). */
  update() {
    let n = 0;
    for (const { object, box } of this.owners) {
      _box.copy(box).applyMatrix4(object.matrixWorld);
      _box.getSize(_size2);
      const r = Math.max(0.15, Math.max(_size2.x, _size2.z) * 0.5 * this.size);
      this.data.array[n++].set((_box.min.x + _box.max.x) / 2, _box.min.y, (_box.min.z + _box.max.z) / 2, r);
    }
    this.count.value = n;
  }
  /** Darkening in [0, opacity] at the fragment's world position (one node, shared by every material). */
  shade() {
    if (this.node) return this.node;
    this.node = Fn3(() => {
      const shade = float3(0).toVar();
      Loop2({ start: int2(0), end: this.count, type: "int", condition: "<" }, ({ i }) => {
        const b = this.data.element(i);
        const d = positionWorld2.xz.sub(b.xz).length().div(b.w);
        const h = b.y.sub(positionWorld2.y);
        const disc = smoothstep4(this.softness.oneMinus().mul(0.95), 1, d).oneMinus();
        const below = step4(-0.06, h);
        const fade = smoothstep4(0, max4(b.w.mul(2.5), 1), h).oneMinus();
        shade.assign(max4(shade, disc.mul(below).mul(fade)));
      });
      return shade.mul(this.opacity);
    })();
    return this.node;
  }
};

// src/runtime/registry/define.js
var CHEAP = { class: "cheap", fpe: 0.1 };
var MEDIUM = { class: "medium", fpe: 1 };
var HEAVY = { class: "heavy", fpe: 3 };
var MIX_BY_TYPE = { float: "lerp", int: "lerp", angle: "angle", color: "oklab", bool: "step", enum: "step", palette: "palette" };
function param(module, e) {
  return {
    module,
    scope: "global",
    structural: false,
    requires: [],
    tags: [],
    cost: CHEAP,
    mix: MIX_BY_TYPE[e.type],
    neutral: e.default,
    ...e
  };
}

// src/runtime/registry/lighting.js
var p = (e) => param("lighting", e);
var lighting_default = [
  p({
    id: "lighting.key.elevation",
    label: "Sun elevation",
    type: "float",
    min: 2,
    max: 90,
    step: 1,
    unit: "°",
    default: 50,
    learn: {
      what: "How high the key light (the sun) stands above the horizon.",
      why: "Low light rakes across surfaces and casts long shadows, which shows form and sets a mood; high light flattens and reads as midday.",
      typical: "45–60° for a neutral day, 5–15° for golden hour."
    },
    brief: "Key light at {value}° elevation.",
    tags: ["light", "sun", "time of day"]
  }),
  p({
    id: "lighting.key.azimuth",
    label: "Sun direction",
    type: "angle",
    min: -180,
    max: 180,
    step: 1,
    unit: "°",
    default: 45,
    learn: {
      what: "Where the key light comes from around the scene, measured from the hero camera: 0° lights from behind the camera, 180° is backlight.",
      why: "Side light (45–90°) shows the most form. Front light flattens shapes; backlight gives silhouettes and glowing rims.",
      typical: "30–60° for clear form, 120–160° for dramatic backlight."
    },
    brief: "Key light from {value}° relative to the main camera (0° = from behind the camera).",
    tags: ["light", "sun"]
  }),
  p({
    id: "lighting.key.color",
    label: "Sun color",
    type: "color",
    default: "#ffffff",
    learn: {
      what: "The color of the key light.",
      why: "Warm light with cool shadows (or the reverse) is the most reliable color contrast in painting: it separates lit and shadowed planes by temperature, not only by value.",
      typical: "Slightly warm white (#fff2d6) for day, orange (#ffb066) for golden hour."
    },
    brief: "Key light color {value}.",
    tags: ["light", "color", "temperature"]
  }),
  p({
    id: "lighting.key.intensity",
    label: "Sun intensity",
    type: "float",
    min: 0,
    max: 8,
    step: 0.05,
    default: 2,
    learn: {
      what: "How bright the key light is.",
      why: "The ratio between key and ambient sets the contrast between lit and shadowed sides. A high ratio reads as harsh sun, a low one as overcast.",
      typical: "2–4 with ambient 0.4–1."
    },
    brief: "Key light intensity {value}.",
    tags: ["light"]
  }),
  p({
    id: "lighting.ambient.sky",
    label: "Ambient sky color",
    type: "color",
    default: "#ffffff",
    learn: {
      what: "Light arriving from above (the sky dome), lighting surfaces that face up.",
      why: "Outdoors, shadows are lit by the blue sky, which is why they look cool. Tinting the sky ambient is the physical reason behind colored shadows.",
      typical: "Light blue (#8cc8ff) outdoors."
    },
    brief: "Sky ambient {value}.",
    tags: ["light", "ambient", "shadow color"]
  }),
  p({
    id: "lighting.ambient.ground",
    label: "Ambient ground color",
    type: "color",
    default: "#444444",
    learn: {
      what: "Light bounced up from the ground, lighting surfaces that face down.",
      why: "A ground bounce tinted by the grass or sand ties objects to their environment, so they don't look pasted in.",
      typical: "A darker version of the ground color."
    },
    brief: "Ground bounce {value}.",
    tags: ["light", "ambient"]
  }),
  p({
    id: "lighting.ambient.intensity",
    label: "Ambient intensity",
    type: "float",
    min: 0,
    max: 3,
    step: 0.05,
    default: 1,
    learn: {
      what: "How much the ambient (sky and ground) light fills the shadows.",
      why: "Ambient decides how dark shadows get. Too little and shapes vanish into black; too much and nothing has form.",
      typical: "0.4–1."
    },
    brief: "Ambient intensity {value}.",
    tags: ["light", "ambient", "contrast"]
  }),
  p({
    id: "lighting.shadows.enabled",
    label: "Cast shadows",
    type: "bool",
    default: true,
    structural: true,
    cost: MEDIUM,
    learn: {
      what: "Whether the key light casts shadows (a shadow map rendered from the sun).",
      why: "Cast shadows anchor objects to the ground and describe the space between them. Without them, objects float.",
      avoid: "Turning them off to save cost; a soft blob shadow is the cheap alternative."
    },
    brief: "Key light casts shadows.",
    tags: ["shadow"]
  }),
  p({
    id: "lighting.shadows.softness",
    label: "Shadow softness",
    type: "float",
    min: 0,
    max: 5,
    step: 0.1,
    unit: "px",
    default: 1,
    enabledBy: "lighting.shadows.enabled",
    learn: {
      what: "How blurred the edge of cast shadows is (the shadow map filter radius).",
      why: "Crisp shadows read as strong sun and graphic toon styles; soft shadows read as large or hazy light sources.",
      typical: "0–0.5 for toon, 1.5–3 for golden hour or photographic looks."
    },
    brief: "Shadow edge softness {value} px (filter radius).",
    tags: ["shadow"]
  }),
  p({
    id: "lighting.shadows.mapSize",
    label: "Shadow resolution",
    type: "enum",
    default: 2048,
    options: [{ value: 512, label: "512" }, { value: 1024, label: "1024" }, { value: 2048, label: "2048" }, { value: 4096, label: "4096" }],
    enabledBy: "lighting.shadows.enabled",
    learn: {
      what: "The size of the shadow map: how many texels cover the shadowed area.",
      why: "Bigger maps give crisper, steadier shadow edges. Phones prefer 1024: shadow maps cost memory bandwidth, and toon styles hide the softer edge well.",
      typical: "2048 on desktop, 1024 on phones."
    },
    brief: "Shadow map {value}×{value}.",
    tags: ["shadow", "performance"]
  }),
  p({
    id: "lighting.tod.enabled",
    label: "Time of day",
    type: "bool",
    default: false,
    learn: {
      what: "Drives the sun, sky, ambient light and fog color from one clock, instead of setting each by hand.",
      why: "Light is the fastest way to change mood, and time of day keeps every light color consistent with every other: a low orange sun comes with a violet sky fill and warm haze.",
      avoid: "Fighting it with hand-set colors: turn it off to art-direct each light yourself."
    },
    brief: "Lighting follows a time of day.",
    tags: ["light", "time of day", "mood"]
  }),
  p({
    id: "lighting.tod.hour",
    label: "Hour",
    type: "float",
    min: 4,
    max: 22,
    step: 0.1,
    unit: "h",
    default: 16,
    enabledBy: "lighting.tod.enabled",
    learn: {
      what: "The time of day, from before dawn (4) to night (22). Noon is 12.",
      why: "Dawn and golden hour rake light across the scene with long shadows and warm color; noon flattens it; blue hour and night drop to a cool, low-contrast fill.",
      typical: "17–18 for golden hour, 19.5 for blue hour, 12 for a neutral reference."
    },
    brief: "Time of day {value} h (sun, sky, ambient and fog follow it).",
    tags: ["time of day", "sun"]
  }),
  p({
    id: "lighting.practicals.intensity",
    label: "Practical lights",
    type: "float",
    min: 0,
    max: 3,
    step: 0.01,
    unit: "×",
    default: 1,
    learn: {
      what: "Brightness of the scene's own lights (torches, lamps, campfires, neon) relative to how the scene set them.",
      why: "Practicals are motivated light: the viewer sees the source. Pushing them up makes night scenes feel lit by the world rather than by an invisible fill.",
      typical: "1–1.5; higher for dark, moody looks."
    },
    brief: "Practical lights at {value}× the scene's intensity.",
    tags: ["light", "practical", "night"]
  }),
  p({
    id: "lighting.practicals.flicker",
    label: "Practical flicker",
    type: "float",
    min: 0,
    max: 3,
    step: 0.01,
    unit: "×",
    default: 1,
    learn: {
      what: "How much flames and faulty lamps flicker, relative to the scene.",
      why: "A little flicker makes fire read as fire and makes a still frame feel alive. Too much is distracting and reads as a broken light."
    },
    brief: "Practical light flicker {value}×.",
    tags: ["light", "practical", "motion"]
  }),
  p({
    id: "lighting.blob.enabled",
    label: "Blob shadows",
    type: "bool",
    default: false,
    structural: true,
    scope: "both",
    learn: {
      what: "A soft dark disc on the ground under each object of a part, like the round shadow under a character in a classic platformer.",
      why: "A contact shadow tells you exactly where something stands, which matters for jumping and aiming. It is nearly free, so phone games use it instead of (or on top of) real shadows.",
      avoid: "Blobs under large or flat objects (buildings, terrain): they only make sense for things that stand on the ground.",
      typical: "On characters, the hero and small props."
    },
    brief: "Soft blob shadows under each object.",
    tags: ["shadow", "contact", "grounding", "phone-safe"]
  }),
  p({
    id: "lighting.blob.size",
    label: "Blob size",
    type: "float",
    min: 0.3,
    max: 3,
    step: 0.01,
    unit: "×",
    default: 1.1,
    enabledBy: "lighting.blob.enabled",
    learn: { what: "Blob radius as a multiple of the object's footprint.", why: "Slightly larger than the footprint reads as a soft shadow; smaller reads as a contact point." },
    brief: "Blob radius {value}× the footprint.",
    tags: ["shadow"]
  }),
  p({
    id: "lighting.blob.softness",
    label: "Blob softness",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
    enabledBy: "lighting.blob.enabled",
    learn: { what: "How soft the blob's edge is.", why: "Hard blobs look graphic and retro; soft blobs read as real soft shadows." },
    brief: "Blob edge softness {value}.",
    tags: ["shadow"]
  }),
  p({
    id: "lighting.blob.opacity",
    label: "Blob darkness",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
    neutral: 0,
    enabledBy: "lighting.blob.enabled",
    learn: { what: "How dark the blob is under its object. It fades as the object rises off the ground.", why: "A fading blob tells you how high a jumping character is, which is why platformers keep it even with real shadows." },
    brief: "Blob darkness {value} (fades with height).",
    tags: ["shadow"]
  }),
  p({
    id: "lighting.ao.enabled",
    scope: "mask",
    label: "Ambient occlusion",
    type: "bool",
    default: false,
    structural: true,
    requires: ["depth", "normal"],
    cost: HEAVY,
    learn: {
      what: "Darkens creases, corners and the ground around objects, where surrounding geometry blocks the sky light (screen-space GTAO).",
      why: "Occlusion is the strongest depth cue after shadows: it glues objects to the ground and to each other, so a scene stops looking like floating primitives.",
      avoid: "Strong AO on toon looks with flat colors: dirty gray halos fight the clean bands. Tint it, or use contact shadows."
    },
    brief: "Screen-space ambient occlusion (GTAO).",
    tags: ["ao", "shadow", "depth", "grounding"]
  }),
  p({
    id: "lighting.ao.radius",
    label: "AO radius",
    type: "float",
    min: 0.05,
    max: 3,
    step: 0.01,
    unit: "m",
    default: 0.6,
    enabledBy: "lighting.ao.enabled",
    learn: { what: "How far occlusion reaches, in meters.", why: "Small radii darken only tight creases; large radii add soft shading between objects and around their bases.", typical: "0.3–1 for human-scale scenes." },
    brief: "AO radius {value} m.",
    tags: ["ao"]
  }),
  p({
    id: "lighting.ao.intensity",
    label: "AO strength",
    type: "float",
    min: 0,
    max: 2,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "lighting.ao.enabled",
    learn: { what: "How dark occluded areas get.", why: "Subtle AO adds weight without a dirty look.", typical: "0.4–1." },
    brief: "AO strength {value}.",
    tags: ["ao"]
  }),
  p({
    id: "lighting.ao.tint",
    label: "AO tint",
    type: "color",
    default: "#000000",
    enabledBy: "lighting.ao.enabled",
    learn: { what: "The color occluded areas darken toward.", why: "A cool or colored tint keeps occlusion from turning pastel and toon palettes gray, the same trick as hue-shifted shadows.", typical: "A darker, cooler version of the shadow tint." },
    brief: "AO darkens toward {value}.",
    tags: ["ao", "color"]
  }),
  p({
    id: "lighting.ao.ink",
    label: "AO ink",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
    enabledBy: "lighting.ao.enabled",
    learn: { what: "Turns the deepest occlusion into flat, hard-edged ink.", why: 'Comic artists fill deep crevices with solid black ("spotting blacks"); hard AO does the same automatically.' },
    brief: "Deep occlusion inked solid (amount {value}).",
    tags: ["ao", "ink", "comic"]
  }),
  p({
    id: "lighting.contact.enabled",
    scope: "mask",
    label: "Contact shadows",
    type: "bool",
    default: false,
    structural: true,
    requires: ["depth", "normal"],
    cost: MEDIUM,
    learn: {
      what: "Short, sharp shadows traced in screen space from the sun, filling in where the shadow map is too coarse: under feet, where objects touch the ground.",
      why: "The shadow map can't resolve tiny gaps, so objects look like they hover. Contact shadows pin them down.",
      avoid: "Long contact shadows: they are screen-space and break at the screen edge."
    },
    brief: "Screen-space contact shadows from the key light.",
    tags: ["shadow", "contact", "grounding"]
  }),
  p({
    id: "lighting.contact.length",
    label: "Contact length",
    type: "float",
    min: 0.02,
    max: 2,
    step: 0.01,
    unit: "m",
    default: 0.35,
    enabledBy: "lighting.contact.enabled",
    learn: { what: "How far each contact shadow is traced toward the sun.", why: "Keep it short: it is meant for small gaps the shadow map misses." },
    brief: "Contact shadows traced {value} m.",
    tags: ["shadow", "contact"]
  }),
  p({
    id: "lighting.contact.thickness",
    label: "Contact thickness",
    type: "float",
    min: 5e-3,
    max: 0.5,
    step: 5e-3,
    unit: "m",
    default: 0.05,
    enabledBy: "lighting.contact.enabled",
    learn: { what: "How thick objects are assumed to be when tracing.", why: "Too thin and shadows leak through objects; too thick and they smear behind them." },
    brief: "Contact thickness {value} m.",
    tags: ["shadow", "contact"]
  }),
  p({
    id: "lighting.contact.intensity",
    label: "Contact darkness",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
    neutral: 0,
    enabledBy: "lighting.contact.enabled",
    learn: { what: "How dark contact shadows are.", why: "Match it to the cast shadows, so the two read as one shadow." },
    brief: "Contact shadow darkness {value}.",
    tags: ["shadow", "contact"]
  }),
  // P2 (M10): baked vertex AO and screen-space GI.
  p({
    id: "lighting.vertexAo.enabled",
    scope: "both",
    label: "Baked vertex AO",
    type: "bool",
    default: false,
    structural: true,
    cost: { ...CHEAP, fpe: 0.05 },
    learn: {
      what: "Occlusion baked into every vertex once, when the scene builds: crevices, the undersides of overhangs and the bases of objects get darker. It costs nothing per frame.",
      why: "Contact darkening is what makes objects sit in the world. Baking it is how phone and stylized games get AO for free, and it never shimmers like screen-space AO.",
      avoid: "Expecting it between separate objects: each object is baked from its own shape and the ground it stands on, so nothing nearby (or moving) darkens it."
    },
    brief: "Baked per-vertex ambient occlusion (self-occlusion and ground contact).",
    tags: ["ao", "vertex colors", "baked", "grounding", "phone"]
  }),
  p({
    id: "lighting.vertexAo.strength",
    scope: "both",
    label: "Vertex AO strength",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
    neutral: 0,
    enabledBy: "lighting.vertexAo.enabled",
    learn: { what: "How dark the baked occlusion gets.", why: 'Subtle values ground objects; strong ones give the dioramic, "toy in a box" look.', typical: "0.4–0.8." },
    brief: "Vertex AO strength {value}.",
    tags: ["ao"]
  }),
  p({
    id: "lighting.ssgi.enabled",
    label: "Screen-space GI",
    type: "bool",
    default: false,
    structural: true,
    cost: { ...HEAVY, fpe: 4 },
    requires: ["depth", "normal"],
    learn: {
      what: "Bounces light between visible surfaces: a red wall tints the floor next to it, and sunlit ground lifts the shadows above it. Computed every frame from the depth and normal buffers.",
      why: "Bounce light is what makes a space feel lit rather than painted in. Stylized games use a little of it for warmth in interiors and courtyards.",
      avoid: "Phones and drawn looks, and expecting light from off-screen surfaces: a screen-space effect only sees what is in the frame."
    },
    brief: "Screen-space global illumination (one bounce).",
    tags: ["gi", "bounce light", "ssgi", "realism"]
  }),
  p({
    id: "lighting.ssgi.intensity",
    label: "Bounce intensity",
    type: "float",
    min: 0,
    max: 4,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "lighting.ssgi.enabled",
    learn: { what: "How much bounced light is added.", why: "Just enough to color the shadows; too much flattens the image like an overcast day.", typical: "0.5–1.5." },
    brief: "Bounce intensity {value}.",
    tags: ["gi"]
  }),
  p({
    id: "lighting.ssgi.radius",
    label: "Bounce radius",
    type: "float",
    min: 1,
    max: 20,
    step: 0.1,
    unit: "m",
    default: 6,
    enabledBy: "lighting.ssgi.enabled",
    learn: { what: "How far light travels between surfaces, in meters.", why: "Small radii give tight color bleeding at contacts; large ones a broad fill (and more noise)." },
    brief: "Bounce radius {value} m.",
    tags: ["gi"]
  })
];

// src/runtime/registry/surface.js
var p2 = (e) => param("surface", { scope: "both", ...e });
var surface_default = [
  p2({
    id: "surface.model",
    label: "Shading model",
    type: "enum",
    default: "pbr",
    structural: true,
    options: [
      { value: "pbr", label: "Stylized PBR" },
      { value: "toon", label: "Toon (cel)" },
      { value: "halfLambert", label: "Half-Lambert (soft wrap)" },
      { value: "flat", label: "Flat (cast shadows only)" },
      { value: "toonWater", label: "Toon water (depth color + foam)" },
      { value: "gooch", label: "Gooch (cool to warm)" },
      { value: "matcap", label: "Matcap (painted sphere)" }
    ],
    learn: {
      what: "How a surface turns light into color. Toon bands the light into flat tones; half-Lambert wraps light softly around the form; flat ignores the surface angle; Gooch shades from a cool to a warm color instead of dark to light; matcap reads its shading from a painted sphere; PBR is physically based.",
      why: "The shading model is the biggest single decision in a style. Banded light simplifies shapes into a few readable planes, which is why toon styles make simple geometry look intentional.",
      avoid: "PBR on blockout geometry: it shows every flaw of the primitives. Toon water is meant for the water part only."
    },
    brief: "Shading model: {label}.",
    tags: ["shading", "toon", "cel"]
  }),
  p2({
    id: "surface.bands",
    label: "Light bands",
    type: "int",
    min: 1,
    max: 5,
    step: 1,
    default: 2,
    structural: true,
    learn: {
      what: "How many flat tones the light is split into (toon, half-Lambert and flat models). 1 means continuous.",
      why: "Two bands give the bold light/shadow split of classic cel animation. Each extra band adds form but moves back toward realism.",
      typical: "2 for graphic toon, 3 for comics, 1 for soft painterly light."
    },
    brief: "Light quantized into {value} flat bands.",
    tags: ["toon", "cel", "ramp"]
  }),
  p2({
    id: "surface.threshold",
    label: "Band threshold",
    type: "float",
    min: 0.05,
    max: 0.95,
    step: 0.01,
    default: 0.5,
    learn: {
      what: "Where the first light band starts. Lower values make more of each object lit; higher values push more into shadow.",
      why: "The shadow shape is a design element in cel art. Moving the threshold controls how much of the form reads as lit, independently of the light's brightness.",
      typical: "0.4–0.55."
    },
    brief: "Band threshold {value} (fraction of full light).",
    tags: ["toon", "ramp"]
  }),
  p2({
    id: "surface.softness",
    label: "Band softness",
    type: "float",
    min: 0,
    max: 0.5,
    step: 5e-3,
    default: 0.02,
    neutral: 0.5,
    learn: {
      what: "How soft the step between light bands is. 0 is a razor edge (still anti-aliased).",
      why: "Hard edges read as graphic and hand-inked; slightly soft edges read as painted. Very soft edges return to realistic shading.",
      typical: "0–0.03 for toon, 0.1–0.2 for anime-style soft cel."
    },
    brief: "Band edge softness {value}.",
    tags: ["toon", "ramp"]
  }),
  p2({
    id: "surface.shadowTint",
    label: "Shadow tint",
    type: "color",
    default: "#5866d0",
    learn: {
      what: "The color added in the shadowed bands.",
      why: "Painters shift shadow hue (usually cooler, toward blue-violet) instead of mixing in black. Gray shadows look dirty; tinted shadows stay colorful and read as sky-lit.",
      typical: "Blue-violet (#5866d0) for sunny scenes, purple for graphic styles."
    },
    brief: "Shadows tinted {value}.",
    tags: ["shadow color", "hue shift"]
  }),
  p2({
    id: "surface.shadowTintStrength",
    label: "Shadow tint strength",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
    neutral: 0,
    learn: {
      what: "How much of the shadow tint is added where the surface is in shadow.",
      why: "It decides how far the shadows move away from plain darkened color toward the tint.",
      typical: "0.4–0.6."
    },
    brief: "Shadow tint strength {value}.",
    tags: ["shadow color"]
  }),
  p2({
    id: "surface.spec.intensity",
    label: "Toon specular",
    type: "float",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
    neutral: 0,
    learn: {
      what: "A hard-edged highlight where the light reflects toward the camera.",
      why: 'A crisp highlight blob says "smooth and shiny" in one shape. It is the cel-animation shorthand for material.',
      avoid: "Specular on everything: keep it for characters and shiny props so they stand out.",
      typical: "0.3–0.8 on characters."
    },
    brief: "Hard specular highlight, intensity {value}.",
    tags: ["specular", "highlight"]
  }),
  p2({
    id: "surface.spec.size",
    label: "Specular size",
    type: "float",
    min: 0.01,
    max: 1,
    step: 0.01,
    default: 0.15,
    learn: {
      what: "How large the specular highlight is.",
      why: "Small highlights read as hard, glossy materials; large ones as soft sheen.",
      typical: "0.05–0.2."
    },
    brief: "Specular size {value}.",
    tags: ["specular"]
  }),
  p2({
    id: "surface.spec.softness",
    label: "Specular softness",
    type: "float",
    min: 0,
    max: 0.3,
    step: 5e-3,
    default: 0.02,
    learn: {
      what: "How soft the edge of the specular highlight is.",
      why: "A hard edge keeps the highlight graphic, matching the cel bands."
    },
    brief: "Specular edge softness {value}.",
    tags: ["specular"]
  }),
  p2({
    id: "surface.rim.intensity",
    label: "Rim light",
    type: "float",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
    neutral: 0,
    learn: {
      what: "A bright band along the edges of a shape, where the surface turns away from the camera (a fresnel term).",
      why: "Rim light separates a subject from the background, the way a backlight does in film. It is the fastest way to make a character pop.",
      typical: "0.3–0.6.",
      avoid: "Strong rims on terrain and buildings: everything glows and nothing stands out."
    },
    brief: "Rim light intensity {value}.",
    tags: ["rim", "fresnel", "separation"]
  }),
  p2({
    id: "surface.rim.width",
    label: "Rim width",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
    learn: {
      what: "How far the rim light reaches in from the silhouette.",
      why: "Thin rims read as crisp backlight; wide rims as a soft glow."
    },
    brief: "Rim width {value}.",
    tags: ["rim"]
  }),
  p2({
    id: "surface.rim.softness",
    label: "Rim softness",
    type: "float",
    min: 0,
    max: 0.5,
    step: 0.01,
    default: 0.05,
    learn: {
      what: "How soft the inner edge of the rim light is.",
      why: "A hard rim matches toon bands; a soft one suits painterly and photographic looks."
    },
    brief: "Rim softness {value}.",
    tags: ["rim"]
  }),
  p2({
    id: "surface.rim.color",
    label: "Rim color",
    type: "color",
    default: "#ffffff",
    learn: {
      what: "The color of the rim light.",
      why: "Matching the rim to the key light (warm at sunset) makes it read as real backlight; a contrasting color reads as stylized."
    },
    brief: "Rim color {value}.",
    tags: ["rim", "color"]
  }),
  p2({
    id: "surface.rim.litSide",
    label: "Rim on lit side only",
    type: "bool",
    default: false,
    learn: {
      what: "Limits the rim light to the side of the object facing the key light.",
      why: "A rim on all sides looks like a glow; a rim on the lit side only looks like light wrapping around the edge."
    },
    brief: "Rim only on the lit side.",
    tags: ["rim"]
  }),
  p2({
    id: "surface.flatNormals",
    label: "Flat (faceted) normals",
    type: "bool",
    default: false,
    structural: true,
    learn: {
      what: "Shades every polygon with one flat color, so the facets show.",
      why: "Faceting turns low-poly geometry into a deliberate style instead of a limitation.",
      avoid: "Combining with high subdivision: facets become noise."
    },
    brief: "Flat-shaded facets.",
    tags: ["low poly", "faceted"]
  }),
  p2({
    id: "surface.halftone.enabled",
    label: "Halftone shading",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Prints dots of ink into the shadowed bands of each surface; the darker the light, the bigger the dots. Needs a toon, half-Lambert or flat model.",
      why: "Comic colorists shade with Ben-Day dots instead of darker paint. Doing it in the material means the dots follow the light exactly, per part.",
      avoid: 'Screen-space dots on fast-moving objects: they stay fixed on screen while the object slides under them (the "shower-door" effect). Use world space for those.'
    },
    brief: "Halftone dots in the shadow bands.",
    tags: ["halftone", "comic", "pattern"]
  }),
  p2({
    id: "surface.halftone.size",
    label: "Dot size (shading)",
    type: "float",
    min: 2,
    max: 24,
    step: 0.5,
    unit: "px@1080p",
    default: 6,
    enabledBy: "surface.halftone.enabled",
    learn: { what: "Dot spacing in pixels at 1080p (in world space: centimeters).", why: "Bigger dots are bolder and more pop-art." },
    brief: "Shading dots {value} px at 1080p.",
    tags: ["halftone"]
  }),
  p2({
    id: "surface.halftone.angle",
    label: "Dot angle (shading)",
    type: "angle",
    min: -90,
    max: 90,
    step: 1,
    unit: "°",
    default: 45,
    enabledBy: "surface.halftone.enabled",
    learn: { what: "Rotation of the dot grid.", why: "45° hides the grid best." },
    brief: "Shading dots at {value}°.",
    tags: ["halftone"]
  }),
  p2({
    id: "surface.halftone.threshold",
    label: "Dots below light",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.75,
    enabledBy: "surface.halftone.enabled",
    learn: { what: "Light level (0 = deepest shadow, 1 = full light) below which dots appear.", why: "With 3 bands, 0.75 dots the middle and dark bands; 0.3 dots only the darkest." },
    brief: "Dots where light is below {value}.",
    tags: ["halftone"]
  }),
  p2({
    id: "surface.halftone.amount",
    label: "Dot strength",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.85,
    neutral: 0,
    enabledBy: "surface.halftone.enabled",
    learn: { what: "How dark the dots are.", why: "Partial strength gives tinted dots instead of solid ink." },
    brief: "Dot strength {value}.",
    tags: ["halftone"]
  }),
  p2({
    id: "surface.halftone.color",
    label: "Dot ink",
    type: "color",
    default: "#1e1d36",
    enabledBy: "surface.halftone.enabled",
    learn: { what: "The ink color of the dots.", why: "A deep blue or purple ink keeps shadows colorful." },
    brief: "Dot ink {value}.",
    tags: ["halftone", "color"]
  }),
  p2({
    id: "surface.halftone.space",
    label: "Dot space",
    type: "enum",
    default: "screen",
    structural: true,
    enabledBy: "surface.halftone.enabled",
    options: [{ value: "screen", label: "Screen (stable size)" }, { value: "world", label: "World (sticks to surfaces)" }],
    learn: { what: "Whether the dots are fixed to the screen or to the surfaces.", why: "Screen dots keep a constant size, like print; world dots move with objects but grow and shrink with distance." },
    brief: "Dots in {label} space.",
    tags: ["halftone", "shower-door"]
  }),
  p2({
    id: "surface.hatching.enabled",
    label: "Hatching shading",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Draws pen lines into the dark bands of each surface; darker light adds crossing layers. Needs a toon, half-Lambert or flat model.",
      why: "Hatching describes form the way an inker would, following the light on each object."
    },
    brief: "Hatching in the dark bands.",
    tags: ["hatching", "ink", "pattern"]
  }),
  p2({
    id: "surface.hatching.spacing",
    label: "Hatch spacing (shading)",
    type: "float",
    min: 2,
    max: 24,
    step: 0.5,
    unit: "px@1080p",
    default: 6,
    enabledBy: "surface.hatching.enabled",
    learn: { what: "Distance between lines, in pixels at 1080p (centimeters in world space).", why: "Tight lines read as fine pen work." },
    brief: "Shading hatch spacing {value} px at 1080p.",
    tags: ["hatching"]
  }),
  p2({
    id: "surface.hatching.angle",
    label: "Hatch angle (shading)",
    type: "angle",
    min: -90,
    max: 90,
    step: 1,
    unit: "°",
    default: -45,
    enabledBy: "surface.hatching.enabled",
    learn: { what: "Angle of the first layer.", why: "Crossing layers rotate from it." },
    brief: "Shading hatches at {value}°.",
    tags: ["hatching"]
  }),
  p2({
    id: "surface.hatching.layers",
    label: "Hatch layers (shading)",
    type: "int",
    min: 1,
    max: 3,
    step: 1,
    default: 2,
    enabledBy: "surface.hatching.enabled",
    learn: { what: "How many crossing layers the darkest light gets.", why: "More layers give deeper, engraved shadows." },
    brief: "Up to {value} hatch layers.",
    tags: ["hatching"]
  }),
  p2({
    id: "surface.hatching.threshold",
    label: "Hatch below light",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
    enabledBy: "surface.hatching.enabled",
    learn: { what: "Light level below which the first layer appears.", why: "Keep hatching to the deepest band and let dots or flat color carry the middle tones." },
    brief: "Hatching where light is below {value}.",
    tags: ["hatching"]
  }),
  p2({
    id: "surface.hatching.amount",
    label: "Hatch strength (shading)",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.85,
    neutral: 0,
    enabledBy: "surface.hatching.enabled",
    learn: { what: "How dark the lines are.", why: "Light hatching reads as pencil, full strength as ink." },
    brief: "Shading hatch strength {value}.",
    tags: ["hatching"]
  }),
  p2({
    id: "surface.hatching.color",
    label: "Hatch ink (shading)",
    type: "color",
    default: "#1e1d36",
    enabledBy: "surface.hatching.enabled",
    learn: { what: "The line color.", why: "Match the line ink, so hatching and outlines read as one pen." },
    brief: "Hatch ink {value}.",
    tags: ["hatching", "color"]
  }),
  p2({
    id: "surface.hatching.space",
    label: "Hatch space",
    type: "enum",
    default: "screen",
    structural: true,
    enabledBy: "surface.hatching.enabled",
    options: [{ value: "screen", label: "Screen (stable width)" }, { value: "world", label: "World (sticks to surfaces)" }],
    learn: { what: "Whether lines are fixed to the screen or to the surfaces.", why: "The same trade-off as halftone: screen lines keep their width, world lines move with objects." },
    brief: "Hatching in {label} space.",
    tags: ["hatching", "shower-door"]
  }),
  p2({
    id: "surface.dither.enabled",
    label: "Dithered shading (1-bit)",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Replaces smooth light bands with an ordered dither pattern between them. With 2 bands the light is 1-bit: lit or not, and the gradient becomes a checker of dots.",
      why: "This is how 1-bit and early Mac games drew light: two inks and a pattern. Doing it in the material keeps it on the objects, crisp at any resolution."
    },
    brief: "Ordered-dither shading between the light bands.",
    tags: ["dither", "1-bit", "retro", "pattern"]
  }),
  p2({
    id: "surface.variation.enabled",
    label: "Color variation",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Varies each surface's color slightly with soft noise, in hue and value.",
      why: 'Real paint and real materials are never one flat color. A little variation inside each shape is what painters call "broken color": the scene stops looking like plastic.',
      avoid: "Strong variation on graphic toon looks, where flat color is the point."
    },
    brief: "Color variation inside each surface.",
    tags: ["color", "variation", "painterly", "texture"]
  }),
  p2({
    id: "surface.variation.amount",
    label: "Variation amount",
    type: "float",
    min: 0,
    max: 0.5,
    step: 5e-3,
    default: 0.1,
    neutral: 0,
    enabledBy: "surface.variation.enabled",
    learn: { what: "How much colors drift.", why: "0.05–0.1 is felt rather than seen." },
    brief: "Color variation {value}.",
    tags: ["variation"]
  }),
  p2({
    id: "surface.variation.scale",
    label: "Variation size",
    type: "float",
    min: 0.05,
    max: 5,
    step: 0.01,
    unit: "/m",
    default: 0.6,
    enabledBy: "surface.variation.enabled",
    learn: { what: "Noise frequency per meter: low values make big patches, high values a fine mottle.", why: "Patches about a meter across read as brush work at gameplay distance." },
    brief: "Variation frequency {value} per meter.",
    tags: ["variation"]
  }),
  p2({
    id: "surface.variation.hue",
    label: "Hue vs. value",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
    enabledBy: "surface.variation.enabled",
    learn: { what: "0 varies only lightness; 1 only hue.", why: "Painters vary hue more than value, so shapes keep their read while the color gets richer." },
    brief: "Variation split {value} hue / value.",
    tags: ["variation"]
  }),
  p2({
    id: "surface.variation.space",
    label: "Variation space",
    type: "enum",
    default: "world",
    structural: true,
    enabledBy: "surface.variation.enabled",
    options: [{ value: "world", label: "World" }, { value: "object", label: "Object (moves with it)" }],
    learn: { what: "Whether the noise is fixed in the world or travels with each object.", why: "Object space keeps moving characters from swimming through the pattern." },
    brief: "Variation in {label} space.",
    tags: ["variation"]
  }),
  p2({
    id: "surface.gradient.enabled",
    label: "Vertical gradient",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Darkens each object toward its base and lightens it toward its top.",
      why: "Sky light hits tops and the ground darkens bases. A painted gradient fakes that occlusion for free and grounds objects, a classic hand-painted texture trick."
    },
    brief: "Vertical gradient: darker at the base, lighter on top.",
    tags: ["gradient", "painterly", "grounding"]
  }),
  p2({
    id: "surface.gradient.amount",
    label: "Gradient amount",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
    neutral: 0,
    enabledBy: "surface.gradient.enabled",
    learn: { what: "How strong the gradient is.", why: "0.2–0.35 is natural; more becomes a stylized airbrush." },
    brief: "Gradient amount {value}.",
    tags: ["gradient"]
  }),
  p2({
    id: "surface.gradient.height",
    label: "Gradient height",
    type: "float",
    min: 0.2,
    max: 30,
    step: 0.1,
    unit: "m",
    default: 3,
    enabledBy: "surface.gradient.enabled",
    learn: { what: "Height over which the gradient runs, from each object's origin.", why: "Match it to the part: about 2 m for characters, more for buildings." },
    brief: "Gradient over {value} m.",
    tags: ["gradient"]
  }),
  p2({
    id: "surface.water.shallow",
    label: "Water: shallow",
    type: "color",
    default: "#45c3e0",
    learn: { what: "Toon water color where it is shallow.", why: "A bright, light shallow color makes shores and depth readable at a glance." },
    brief: "Shallow water {value}.",
    tags: ["water"]
  }),
  p2({
    id: "surface.water.deep",
    label: "Water: deep",
    type: "color",
    default: "#1c6fd1",
    learn: { what: "Toon water color where it is deep.", why: "Deep water darkens and saturates; the contrast with the shallows gives the sea its shape." },
    brief: "Deep water {value}.",
    tags: ["water"]
  }),
  p2({
    id: "surface.water.depth",
    label: "Water: depth range",
    type: "float",
    min: 0.2,
    max: 30,
    step: 0.1,
    unit: "m",
    default: 4,
    learn: { what: "Depth at which water reaches its deep color.", why: "Smaller values give a narrow shallow rim; larger ones long gradients of lagoon." },
    brief: "Deep color at {value} m.",
    tags: ["water"]
  }),
  p2({
    id: "surface.water.bands",
    label: "Water: color bands",
    type: "int",
    min: 0,
    max: 5,
    step: 1,
    default: 3,
    learn: { what: "Flat steps between the shallow and deep colors (0 is smooth).", why: "Banded depth is the toon-water signature: flat rings of color around islands." },
    brief: "Water depth in {value} bands.",
    tags: ["water", "toon"]
  }),
  p2({
    id: "surface.water.foam",
    label: "Water: shore foam",
    type: "float",
    min: 0,
    max: 2,
    step: 0.01,
    unit: "m",
    default: 0.35,
    learn: { what: "Width of the white foam line where water meets objects and shores.", why: "Intersection foam is the cheapest way to make water feel like it touches the world." },
    brief: "Shore foam {value} m wide.",
    tags: ["water", "foam"]
  }),
  p2({
    id: "surface.water.pattern",
    label: "Water: foam pattern",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
    learn: { what: "Drifting cellular foam lines on the surface.", why: "Stylized seas draw their motion with a few bright lines instead of reflections." },
    brief: "Foam pattern {value}.",
    tags: ["water", "foam"]
  }),
  p2({
    id: "surface.water.foamColor",
    label: "Water: foam color",
    type: "color",
    default: "#ffffff",
    learn: { what: "Color of foam and foam lines.", why: "Pure white reads as sunlit foam; tinted foam fits darker or sunset palettes." },
    brief: "Foam {value}.",
    tags: ["water", "foam"]
  }),
  p2({
    id: "surface.wind.enabled",
    label: "Wind sway",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Makes every mesh of the part sway with the wind, more toward its top. Grass always sways; this adds trees, bushes, flags and anything else you pick.",
      why: "Moving foliage is the simplest sign of a living world, and it gives still shots a sense of air.",
      avoid: "Wind on rigid things (buildings, rocks). Swaying meshes get no hull outline, because the hull wouldn't follow the sway."
    },
    brief: "Wind sway (stronger toward the top of each mesh).",
    tags: ["wind", "foliage", "motion"]
  }),
  p2({
    id: "surface.wind.strength",
    label: "Wind strength",
    type: "float",
    min: 0,
    max: 3,
    step: 0.01,
    unit: "×",
    default: 1,
    learn: { what: "Scales how far grass and swaying meshes move.", why: "A breeze vs. a storm: strength sets the mood." },
    brief: "Wind strength ×{value}.",
    tags: ["wind"]
  }),
  p2({
    id: "surface.wind.speed",
    label: "Wind speed",
    type: "float",
    min: 0,
    max: 3,
    step: 0.01,
    unit: "×",
    default: 1,
    learn: { what: "Scales how fast the sway oscillates.", why: "Slow sway is calm; fast sway is gusty and tense." },
    brief: "Wind speed ×{value}.",
    tags: ["wind"]
  }),
  p2({
    id: "surface.wind.gusts",
    label: "Gusts",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
    learn: { what: "Slow waves of stronger wind rolling across the scene.", why: "Gusts make wind travel across a field instead of everything moving in lockstep." },
    brief: "Gusts {value}.",
    tags: ["wind"]
  }),
  // P2 (M10): Gooch and matcap shading.
  p2({
    id: "surface.gooch.cool",
    label: "Gooch cool",
    type: "color",
    default: "#2f4fd0",
    learn: {
      what: "The color the Gooch model pushes surfaces toward where they face away from the light.",
      why: "Gooch shading replaces dark shadows with a cool color, so every surface stays readable: the technical-illustration trick that keeps form legible without black."
    },
    brief: "Gooch cool tone {value}.",
    tags: ["gooch", "shading"]
  }),
  p2({
    id: "surface.gooch.warm",
    label: "Gooch warm",
    type: "color",
    default: "#ffcc55",
    learn: {
      what: "The color the Gooch model pushes surfaces toward where they face the light.",
      why: "Warm light against cool shade is how painters separate planes by temperature instead of by value."
    },
    brief: "Gooch warm tone {value}.",
    tags: ["gooch", "shading"]
  }),
  p2({
    id: "surface.gooch.strength",
    label: "Gooch strength",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
    neutral: 0,
    learn: {
      what: "How far the base colors move toward the cool and warm tones.",
      why: "Low values keep the palette and add temperature; high values give the classic blue-to-yellow technical-illustration look.",
      typical: "0.3–0.6."
    },
    brief: "Gooch strength {value}.",
    tags: ["gooch"]
  }),
  p2({
    id: "surface.matcap.preset",
    label: "Matcap",
    type: "enum",
    default: "clay",
    structural: true,
    options: [
      { value: "clay", label: "Studio clay" },
      { value: "toon", label: "Two-tone toon" },
      { value: "chrome", label: "Chrome" },
      { value: "pearl", label: "Pearl (soft rim)" }
    ],
    learn: {
      what: `Which painted sphere the matcap model reads its shading from. A matcap ("material capture") looks up a picture of a lit ball by the surface's view-space normal.`,
      why: "Matcaps fake complex lighting (studio softboxes, chrome reflections, rim light) for the price of one texture fetch, and they look the same from every angle: why sculpting tools and many phone games use them."
    },
    brief: "Matcap: {label}.",
    tags: ["matcap", "shading", "unlit"]
  })
];

// src/runtime/registry/lines.js
var p3 = (e) => param("lines", e);
var lines_default = [
  p3({
    id: "lines.hull.enabled",
    label: "Hull outlines",
    type: "bool",
    default: false,
    structural: true,
    scope: "both",
    cost: { ...CHEAP, fpe: 0.3 },
    learn: {
      what: 'Outlines drawn by rendering a slightly inflated, inside-out copy of each mesh behind it (the "inverted hull").',
      why: "Ink around a shape separates it from the background and makes it read at a glance, like a character drawn on top of a painted set. Hulls are exact per object and cheap on phones.",
      avoid: "Hull lines on terrain and big flat surfaces: they only outline the outer edge and look odd.",
      typical: "On characters and props."
    },
    brief: "Inverted-hull outlines (back faces extruded along smoothed normals).",
    tags: ["outline", "ink", "lines"]
  }),
  p3({
    id: "lines.hull.thickness",
    label: "Hull thickness",
    type: "float",
    min: 0,
    max: 8,
    step: 0.1,
    unit: "px@1080p",
    default: 1.5,
    neutral: 0,
    scope: "both",
    enabledBy: "lines.hull.enabled",
    learn: {
      what: "Outline width in pixels at 1080p. It scales with the output height, so lines look the same on every screen.",
      why: "Thick lines read as bold and cartoony; thin ones as delicate. Constant screen width keeps far objects from getting blobby.",
      typical: "1.5–2.5 px."
    },
    brief: "Hull outlines {value} px at 1080p (scale with output height).",
    tags: ["outline"]
  }),
  p3({
    id: "lines.hull.color",
    label: "Hull color",
    type: "color",
    default: "#1b1d2a",
    scope: "both",
    learn: {
      what: "The color of the hull outlines.",
      why: "Pure black is graphic; a dark, tinted line (navy, brown) is softer and blends with the palette."
    },
    brief: "Hull outline color {value}.",
    tags: ["outline", "color"]
  }),
  p3({
    id: "lines.screen.enabled",
    scope: "mask",
    label: "Screen-space ink",
    type: "bool",
    default: false,
    structural: true,
    requires: ["depth", "normal", "ids"],
    cost: MEDIUM,
    learn: {
      what: "Lines found after rendering, by comparing depth, normals and object ids between neighboring pixels.",
      why: "They catch inner creases and overlaps that hulls can't, so every shape is inked like a comic panel.",
      avoid: "High-detail geometry: every small crease becomes a line. Raise the crease angle or lower the crease weight."
    },
    brief: "Screen-space edge detection on depth, normals and object ids.",
    tags: ["outline", "ink", "lines", "edges"]
  }),
  p3({
    id: "lines.screen.thickness",
    scope: "mask",
    label: "Ink thickness",
    type: "float",
    min: 0,
    max: 6,
    step: 0.1,
    unit: "px@1080p",
    default: 1.5,
    neutral: 0,
    enabledBy: "lines.screen.enabled",
    learn: {
      what: "Width of the screen-space lines in pixels at 1080p.",
      why: "Thick ink is the signature of graffiti and comic styles; thin ink suits clean illustration.",
      typical: "1–3 px."
    },
    brief: "Ink lines {value} px at 1080p.",
    tags: ["lines"]
  }),
  p3({
    id: "lines.screen.color",
    scope: "mask",
    label: "Ink color",
    type: "color",
    default: "#0e0e12",
    enabledBy: "lines.screen.enabled",
    learn: {
      what: "The color of the screen-space lines.",
      why: "Near-black reads as ink. Colored lines feel softer and more modern."
    },
    brief: "Ink color {value}.",
    tags: ["lines", "color"]
  }),
  p3({
    id: "lines.screen.silhouette",
    label: "Silhouette weight",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "lines.screen.enabled",
    learn: {
      what: "Strength of lines at depth jumps: the outer contour of objects.",
      why: "Illustrators draw silhouettes heaviest, because the outline is what makes a shape readable."
    },
    brief: "Silhouette (depth) edges at weight {value}.",
    tags: ["lines", "silhouette"]
  }),
  p3({
    id: "lines.screen.crease",
    label: "Crease weight",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
    neutral: 0,
    enabledBy: "lines.screen.enabled",
    learn: {
      what: "Strength of lines where the surface folds sharply (normal changes).",
      why: "Crease lines describe the inner structure of a shape, such as the corners of a building.",
      typical: "Lower than the silhouette weight, so contours stay dominant."
    },
    brief: "Crease (normal) edges at weight {value}.",
    tags: ["lines", "crease"]
  }),
  p3({
    id: "lines.screen.creaseAngle",
    label: "Crease angle",
    type: "float",
    min: 5,
    max: 90,
    step: 1,
    unit: "°",
    default: 35,
    enabledBy: "lines.screen.enabled",
    learn: {
      what: "How sharp a fold must be before it gets a crease line.",
      why: "A higher angle keeps lines on real corners only, so curved and detailed surfaces stay clean.",
      typical: "30–45°."
    },
    brief: "Creases sharper than {value}° get lines.",
    tags: ["lines", "crease"]
  }),
  p3({
    id: "lines.screen.depthThreshold",
    label: "Depth sensitivity",
    type: "float",
    min: 2e-3,
    max: 0.2,
    step: 1e-3,
    default: 0.03,
    enabledBy: "lines.screen.enabled",
    learn: {
      what: "The relative depth jump (as a fraction of distance) that counts as a silhouette.",
      why: "It is relative, so it works the same up close and far away. Lower values ink smaller overlaps."
    },
    brief: "Depth jumps above {value} of the distance count as silhouettes.",
    tags: ["lines"]
  }),
  p3({
    id: "lines.screen.idWeight",
    label: "Object-boundary weight",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "lines.screen.enabled",
    learn: {
      what: "Strength of lines where two different parts touch, even without a depth jump (a character standing on the ground, a box against a wall).",
      why: "Depth and normals miss contact lines; part ids catch them, so objects separate cleanly from what they touch."
    },
    brief: "Part-boundary edges at weight {value}.",
    tags: ["lines", "ids"]
  }),
  p3({
    id: "lines.screen.followFog",
    label: "Lines fade with fog",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    enabledBy: "lines.screen.enabled",
    learn: {
      what: "How much the ink fades into the fog with distance.",
      why: "Atmosphere softens everything far away, ink included. Lines that ignore fog pop distant objects forward."
    },
    brief: "Ink fades with fog (amount {value}).",
    tags: ["lines", "fog", "depth"]
  }),
  p3({
    id: "lines.screen.opacity",
    label: "Ink opacity",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "lines.screen.enabled",
    learn: { what: "How opaque the ink is.", why: "Translucent lines read as pencil or soft paint; opaque ones as ink." },
    brief: "Ink opacity {value}.",
    tags: ["lines"]
  }),
  p3({
    id: "lines.screen.colorFromSurface",
    label: "Colored lines",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
    enabledBy: "lines.screen.enabled",
    learn: {
      what: "Mixes the ink toward a darker, more saturated version of the color under it, instead of one fixed ink color.",
      why: "Colored lines (a dark red line on a red coat) are the anime and modern-illustration look: softer than black ink, but still separating shapes."
    },
    brief: "Lines take the darkened local color (amount {value}).",
    tags: ["lines", "color", "anime"]
  }),
  p3({
    id: "lines.screen.darken",
    label: "Colored-line darkness",
    type: "float",
    min: 0.05,
    max: 1,
    step: 0.01,
    default: 0.45,
    enabledBy: "lines.screen.enabled",
    learn: { what: "How dark colored lines are, as a fraction of the local color.", why: "Around 0.4–0.6 keeps the hue readable while still reading as a line." },
    brief: "Colored lines at {value}× the local color.",
    tags: ["lines", "color"]
  }),
  p3({
    id: "lines.screen.fade",
    label: "Distance fade",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
    enabledBy: "lines.screen.enabled",
    learn: {
      what: "Thins out lines between the fade start and end distances.",
      why: "Distant detail drawn with full-strength ink turns to noise, especially at high complexity. Illustrators draw the background lighter; fading does the same.",
      typical: "0.7–1 on dense scenes (meadows, cities)."
    },
    brief: "Lines fade with distance (amount {value}).",
    tags: ["lines", "depth", "noise"]
  }),
  p3({
    id: "lines.screen.fadeStart",
    label: "Fade start",
    type: "float",
    min: 0,
    max: 300,
    step: 1,
    unit: "m",
    default: 25,
    enabledBy: "lines.screen.enabled",
    learn: { what: "Distance where lines start to fade.", why: "Keep the play area fully inked." },
    brief: "Line fade starts at {value} m.",
    tags: ["lines"]
  }),
  p3({
    id: "lines.screen.fadeEnd",
    label: "Fade end",
    type: "float",
    min: 1,
    max: 1e3,
    step: 1,
    unit: "m",
    default: 120,
    enabledBy: "lines.screen.enabled",
    learn: { what: "Distance where lines reach their minimum.", why: "Beyond this, shapes read by value and color only." },
    brief: "Line fade ends at {value} m.",
    tags: ["lines"]
  }),
  p3({
    id: "lines.screen.lightWeight",
    label: "Thicker in shadow",
    type: "float",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0,
    enabledBy: "lines.screen.enabled",
    learn: {
      what: "Makes lines thicker where the image is dark (up to +100% per 1.0).",
      why: "Inkers weight lines by light: thin where the light hits, heavy on the shadow side. It adds form and drama for free."
    },
    brief: "Lines up to {value}× thicker in shadow.",
    tags: ["lines", "comic", "weight"]
  }),
  p3({
    id: "lines.screen.wobble",
    label: "Wobble",
    type: "float",
    min: 0,
    max: 4,
    step: 0.05,
    unit: "px@1080p",
    default: 0,
    enabledBy: "lines.screen.enabled",
    learn: {
      what: "Displaces the lines irregularly, as if drawn by hand. With line boil (Motion), the wobble changes a few times a second.",
      why: "Perfect lines look computer-made. A little wobble reads as a human hand; boiling lines are the signature of hand-drawn animation."
    },
    brief: "Hand wobble {value} px at 1080p.",
    tags: ["lines", "hand-drawn", "boil"]
  }),
  p3({
    id: "lines.screen.wobbleScale",
    label: "Wobble frequency",
    type: "float",
    min: 0.2,
    max: 4,
    step: 0.05,
    default: 1,
    enabledBy: "lines.screen.enabled",
    learn: { what: "How quickly the wobble varies along a line.", why: "Low frequency looks like a slow, confident hand; high frequency like a shaky one." },
    brief: "Wobble frequency {value}.",
    tags: ["lines"]
  }),
  p3({
    id: "lines.screen.texture",
    label: "Line texture",
    type: "enum",
    default: "none",
    enabledBy: "lines.screen.enabled",
    options: [{ value: "none", label: "Clean" }, { value: "pencil", label: "Pencil (grainy)" }, { value: "brush", label: "Brush (varying width)" }, { value: "ink", label: "Ink (blotchy)" }],
    learn: { what: "The tool the lines are drawn with.", why: "Grainy pencil, swelling brush strokes or blotchy dip-pen ink each say a different medium." },
    brief: "Line texture: {label}.",
    tags: ["lines", "texture"]
  }),
  p3({
    id: "lines.screen.textureAmount",
    label: "Texture amount",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
    enabledBy: "lines.screen.enabled",
    learn: { what: "How strong the line texture is.", why: "Subtle texture adds character without breaking the lines." },
    brief: "Line texture amount {value}.",
    tags: ["lines", "texture"]
  }),
  // P2 (M10): image-space Sobel edges and the interactable highlight.
  p3({
    id: "lines.sobel.enabled",
    label: "Image edges (Sobel)",
    type: "bool",
    default: false,
    structural: true,
    cost: { ...MEDIUM, fpe: 0.6 },
    learn: {
      what: "Finds edges in the finished image itself, wherever brightness changes sharply, and inks them. It knows nothing about the geometry.",
      why: "It shows why geometry-aware ink wins: Sobel traces shadows, highlights and texture as eagerly as silhouettes, and misses the edge between two equally bright objects. As a deliberate style it gives a rough, photocopied or rotoscoped look.",
      avoid: "Using it instead of screen-space ink for clean cel lines, and on noisy images (grain, dither), where it inks the noise."
    },
    brief: "Image-space Sobel edge lines (brightness edges, not geometry).",
    tags: ["lines", "sobel", "edges", "photocopy"]
  }),
  p3({
    id: "lines.sobel.threshold",
    label: "Edge threshold",
    type: "float",
    min: 0.01,
    max: 1,
    step: 0.01,
    default: 0.25,
    enabledBy: "lines.sobel.enabled",
    learn: { what: "How strong a brightness change must be to become a line.", why: "Low thresholds ink every texture and shadow; high ones keep only the strongest contrasts.", typical: "0.15–0.4." },
    brief: "Sobel threshold {value}.",
    tags: ["sobel"]
  }),
  p3({
    id: "lines.sobel.thickness",
    label: "Edge thickness",
    type: "float",
    min: 0.5,
    max: 4,
    step: 0.05,
    unit: "px@1080p",
    default: 1.2,
    enabledBy: "lines.sobel.enabled",
    learn: { what: "The kernel spacing, in pixels at 1080p: wider kernels give thicker, softer lines.", why: "Thick Sobel lines read as marker; thin ones as a photocopy." },
    brief: "Sobel lines {value} px at 1080p.",
    tags: ["sobel"]
  }),
  p3({
    id: "lines.sobel.color",
    label: "Edge color",
    type: "color",
    default: "#141414",
    enabledBy: "lines.sobel.enabled",
    learn: { what: "The ink color of the image edges.", why: "Near-black reads as ink; a dark hue from the palette keeps the lines in the picture." },
    brief: "Sobel ink {value}.",
    tags: ["sobel"]
  }),
  p3({
    id: "lines.sobel.amount",
    label: "Edge opacity",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "lines.sobel.enabled",
    learn: { what: "How opaque the image edges are.", why: "Partial opacity layers the edges under geometry ink without doubling every line." },
    brief: "Sobel opacity {value}.",
    tags: ["sobel"]
  }),
  p3({
    id: "lines.highlight.enabled",
    label: "Interactable highlight",
    type: "bool",
    default: false,
    structural: true,
    cost: { ...MEDIUM, fpe: 0.6 },
    requires: ["ids"],
    learn: {
      what: "Outlines what a player can use (pickups, chests, item blocks), or a whole part, in a color of its own, with an optional pulse.",
      why: "Games highlight what can be touched so players read the world at a glance. A consistent highlight color and width belong in the style guide, not in each asset.",
      avoid: "Highlighting too much: when everything glows, nothing reads as special. Pick one color nothing else in the palette uses."
    },
    brief: "Interactable highlight outline.",
    tags: ["lines", "highlight", "outline", "gameplay", "readability"]
  }),
  p3({
    id: "lines.highlight.target",
    label: "Highlight",
    type: "enum",
    default: "interactable",
    enabledBy: "lines.highlight.enabled",
    options: [
      { value: "interactable", label: "Interactable objects" },
      { value: "hero", label: "The hero" },
      { value: "characters", label: "Characters" },
      { value: "props", label: "Props" },
      { value: "vfx", label: "VFX" }
    ],
    learn: { what: "What gets the outline: objects tagged interactable (coins, chests, item blocks, or `userData.style.interactable` on your meshes), or every object of one part.", why: "Tag what matters to the player; outlining a whole part is for teaching and debugging reads." },
    brief: "Highlights: {label}.",
    tags: ["highlight"]
  }),
  p3({
    id: "lines.highlight.color",
    label: "Highlight color",
    type: "color",
    default: "#ffd54a",
    enabledBy: "lines.highlight.enabled",
    learn: { what: "The outline color.", why: 'Warm yellow and white read as "pick me up" in most games; use one hue nothing else in the scene uses.' },
    brief: "Highlight color {value}.",
    tags: ["highlight"]
  }),
  p3({
    id: "lines.highlight.thickness",
    label: "Highlight width",
    type: "float",
    min: 1,
    max: 8,
    step: 0.1,
    unit: "px@1080p",
    default: 3,
    enabledBy: "lines.highlight.enabled",
    learn: { what: "The outline width in pixels at 1080p.", why: "Wider than the ink lines, so the highlight never reads as part of the drawing." },
    brief: "Highlight {value} px at 1080p.",
    tags: ["highlight"]
  }),
  p3({
    id: "lines.highlight.pulse",
    label: "Highlight pulse",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
    neutral: 0,
    enabledBy: "lines.highlight.enabled",
    learn: { what: "How much the outline breathes in and out (about once a second).", why: "Motion draws the eye in the periphery, where a static outline is missed." },
    brief: "Highlight pulse {value}.",
    tags: ["highlight"]
  }),
  p3({
    id: "lines.highlight.fill",
    label: "Highlight fill",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.15,
    neutral: 0,
    enabledBy: "lines.highlight.enabled",
    learn: { what: "A tint of the highlight color over the highlighted objects themselves.", why: "A faint fill makes small pickups readable even when their outline is hidden." },
    brief: "Highlight fill {value}.",
    tags: ["highlight"]
  })
];

// src/runtime/registry/palette.js
var p4 = (e) => param("palette", { scope: "both", ...e });
var palette_default = [
  p4({
    id: "palette.saturation",
    label: "Saturation",
    type: "float",
    min: 0,
    max: 2,
    step: 0.01,
    default: 1,
    learn: {
      what: "Scales the colorfulness of the base colors (in OKLCH chroma), before lighting.",
      why: "Changing the paint rather than the photo keeps lit and shadowed tones consistent. It can also be set per part, for example saturated characters on a calmer background.",
      typical: "1.1–1.35 for cartoon styles."
    },
    brief: "Base colors at {value}× saturation.",
    tags: ["color", "saturation"]
  }),
  p4({
    id: "palette.value",
    label: "Value (lightness)",
    type: "float",
    min: 0.3,
    max: 1.7,
    step: 0.01,
    default: 1,
    learn: {
      what: "Scales the lightness of the base colors.",
      why: "Value (light vs. dark) carries the structure of an image. Raising it gives a high-key, airy style; lowering it gives weight and mood."
    },
    brief: "Base color lightness ×{value}.",
    tags: ["color", "value"]
  }),
  p4({
    id: "palette.hue",
    label: "Hue shift",
    type: "angle",
    min: -180,
    max: 180,
    step: 1,
    unit: "°",
    default: 0,
    learn: {
      what: "Rotates the hue of every base color.",
      why: "Useful for quick palette variations, such as an alternative season or a corrupted area of a level."
    },
    brief: "Base hues rotated {value}°.",
    tags: ["color", "hue"]
  }),
  p4({
    id: "palette.tint",
    label: "Tint color",
    type: "color",
    default: "#ffffff",
    learn: {
      what: "A color that every base color of the part is pushed toward.",
      why: "Unifies a part into one color family, such as a single sea blue for all water."
    },
    brief: "Base colors tinted toward {value}.",
    tags: ["color"]
  }),
  p4({
    id: "palette.tintAmount",
    label: "Tint amount",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
    learn: {
      what: "How far base colors move toward the tint color (mixed in OKLab).",
      why: "A little tint harmonizes colors that were picked independently; a lot replaces them."
    },
    brief: "Tint amount {value}.",
    tags: ["color", "harmony"]
  }),
  p4({
    id: "palette.remap",
    label: "Palette remap",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
    learn: {
      what: "Snaps every base color to the nearest color of the look's palette.",
      why: 'A small, deliberate palette is the hallmark of strong art direction. Remapping forces scattered "programmer colors" into a designed set.',
      typical: "1 for graphic styles with a fixed palette."
    },
    brief: "Base colors remapped to the palette (amount {value}).",
    tags: ["color", "palette", "harmony"]
  }),
  p4({
    id: "palette.colors",
    label: "Palette",
    type: "palette",
    default: [],
    learn: {
      what: "The set of colors that palette remap snaps to.",
      why: "Limiting a scene to 5–8 colors gives it a recognizable identity."
    },
    brief: "Palette: {value}.",
    tags: ["palette"]
  }),
  p4({
    id: "palette.keepValue",
    label: "Keep value when remapping",
    type: "bool",
    default: true,
    learn: {
      what: "When remapping, keeps part of each object's original lightness instead of taking the palette color's.",
      why: "Keeps the light and dark structure of the scene while the hues change, so it still reads."
    },
    brief: "Remap keeps the original lightness.",
    tags: ["palette", "value"]
  })
];

// src/runtime/registry/atmosphere.js
var p5 = (e) => param("atmosphere", e);
var atmosphere_default = [
  p5({
    id: "atmosphere.fog.type",
    label: "Fog",
    type: "enum",
    default: "off",
    options: [
      { value: "off", label: "Off" },
      { value: "linear", label: "Linear (start → end)" },
      { value: "exp", label: "Exponential" },
      { value: "exp2", label: "Exponential squared" }
    ],
    learn: {
      what: "Distance fog, computed inside every material. Exponential squared stays clear up close and closes in quickly further out.",
      why: "Fog is atmospheric perspective: distant things get lighter, lower in contrast and tinted toward the sky. It gives depth and separates foreground, middle ground and background."
    },
    brief: "{label} distance fog, applied in the materials.",
    tags: ["fog", "depth", "atmosphere"]
  }),
  p5({
    id: "atmosphere.fog.amount",
    label: "Fog amount",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    neutral: 0,
    learn: {
      what: "The maximum opacity of the fog.",
      why: "Capping fog keeps distant landmarks visible while still giving depth."
    },
    brief: "Fog opacity up to {value}.",
    tags: ["fog"]
  }),
  p5({
    id: "atmosphere.fog.density",
    label: "Fog density",
    type: "float",
    min: 0,
    max: 0.05,
    step: 5e-4,
    default: 8e-3,
    learn: {
      what: "How quickly exponential fog builds up with distance.",
      why: "Match it to the scene scale: the far edge of the playable area should be about half fogged.",
      typical: "0.004–0.012 for outdoor scenes measured in meters."
    },
    brief: "Fog density {value} per meter.",
    tags: ["fog"]
  }),
  p5({
    id: "atmosphere.fog.start",
    label: "Fog start",
    type: "float",
    min: 0,
    max: 300,
    step: 1,
    unit: "m",
    default: 10,
    learn: { what: "Distance where linear fog begins.", why: "Keeps the play area clear while the background fades." },
    brief: "Linear fog starts at {value} m.",
    tags: ["fog"]
  }),
  p5({
    id: "atmosphere.fog.end",
    label: "Fog end",
    type: "float",
    min: 1,
    max: 1e3,
    step: 1,
    unit: "m",
    default: 200,
    learn: { what: "Distance where linear fog is fully opaque.", why: "Hides the edge of the world." },
    brief: "Linear fog is opaque at {value} m.",
    tags: ["fog"]
  }),
  p5({
    id: "atmosphere.fog.color",
    label: "Fog color",
    type: "color",
    default: "#c8dcf0",
    learn: {
      what: "The fog color where sky tint is 0.",
      why: "Fog that doesn't match the sky shows a seam at the horizon."
    },
    brief: "Fog color {value}.",
    tags: ["fog", "color"]
  }),
  p5({
    id: "atmosphere.fog.skyTint",
    label: "Sky-tinted fog",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    learn: {
      what: "Takes the fog color from the sky gradient in the direction you look.",
      why: "This is how real aerial perspective works: distant hills take on the color of the sky behind them, so the horizon never shows a seam."
    },
    brief: "Fog color follows the sky gradient (amount {value}).",
    tags: ["fog", "atmospheric perspective"]
  }),
  p5({
    id: "atmosphere.fog.bands",
    label: "Toon fog bands",
    type: "int",
    min: 0,
    max: 6,
    step: 1,
    default: 0,
    learn: {
      what: "Quantizes the fog into flat steps. 0 is smooth.",
      why: "Stepped fog turns distance into graphic layers, like the painted backdrops of animation."
    },
    brief: "Fog quantized into {value} bands.",
    tags: ["fog", "toon"]
  }),
  p5({
    id: "atmosphere.sky.zenith",
    label: "Sky zenith",
    type: "color",
    default: "#87ceeb",
    learn: {
      what: "The sky color straight up.",
      why: "A gradient sky (deep at the top, pale at the horizon) frames the scene and sets the palette's key."
    },
    brief: "Sky gradient from {value} at the zenith.",
    tags: ["sky"]
  }),
  p5({
    id: "atmosphere.sky.horizon",
    label: "Sky horizon",
    type: "color",
    default: "#87ceeb",
    learn: {
      what: "The sky color at the horizon.",
      why: "The horizon is usually the palest part of the sky; fog should match it."
    },
    brief: "Sky horizon {value}.",
    tags: ["sky"]
  }),
  p5({
    id: "atmosphere.sky.ground",
    label: "Below the horizon",
    type: "color",
    default: "#87ceeb",
    learn: {
      what: "The background color below the horizon.",
      why: "Usually hidden by terrain or sea, but shows past the edge of the world."
    },
    brief: "Below-horizon color {value}.",
    tags: ["sky"]
  }),
  p5({
    id: "atmosphere.sky.exponent",
    label: "Sky gradient falloff",
    type: "float",
    min: 0.2,
    max: 4,
    step: 0.05,
    default: 1,
    learn: {
      what: "How quickly the sky goes from the horizon color to the zenith color.",
      why: "Low values give a wide pale band near the horizon, like haze."
    },
    brief: "Sky gradient exponent {value}.",
    tags: ["sky"]
  }),
  p5({
    id: "atmosphere.sky.sunSize",
    label: "Sun disc size",
    type: "float",
    min: 0,
    max: 12,
    step: 0.1,
    unit: "°",
    default: 0,
    learn: {
      what: "Size of the visible sun disc in the sky (0 hides it).",
      why: "A visible sun explains the lighting direction and gives bloom a source."
    },
    brief: "Visible sun disc {value}° wide.",
    tags: ["sky", "sun"]
  }),
  p5({
    id: "atmosphere.sky.sunSoftness",
    label: "Sun disc softness",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
    learn: { what: "How soft the edge of the sun disc is.", why: "Soft discs read as hazy air; hard discs as a graphic, stylized sun." },
    brief: "Sun disc softness {value}.",
    tags: ["sky", "sun"]
  }),
  p5({
    id: "atmosphere.sky.sunIntensity",
    label: "Sun disc brightness",
    type: "float",
    min: 0,
    max: 20,
    step: 0.1,
    default: 6,
    learn: { what: "Brightness of the sun disc, as a multiple of the key light color.", why: "Values above 1 are HDR, so bloom picks the sun up." },
    brief: "Sun disc brightness {value}× the key color.",
    tags: ["sky", "sun", "bloom"]
  }),
  p5({
    id: "atmosphere.godRays.enabled",
    label: "God rays",
    type: "bool",
    default: false,
    structural: true,
    requires: ["depth"],
    cost: MEDIUM,
    learn: {
      what: "Shafts of light streaming from the sun past the objects in front of it (a radial blur of the sky toward the sun).",
      why: "Visible light shafts make air feel thick and light feel physical: dust, haze, a sacred or dramatic moment.",
      avoid: "Shots without the sun near the frame: the rays come from the sun's screen position."
    },
    brief: "God rays from the sun.",
    tags: ["atmosphere", "god rays", "light"]
  }),
  p5({
    id: "atmosphere.godRays.intensity",
    label: "Ray strength",
    type: "float",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0.6,
    neutral: 0,
    enabledBy: "atmosphere.godRays.enabled",
    learn: { what: "How bright the shafts are.", why: "Subtle rays add atmosphere; strong rays are a dramatic statement." },
    brief: "God ray strength {value}.",
    tags: ["god rays"]
  }),
  p5({
    id: "atmosphere.godRays.length",
    label: "Ray length",
    type: "float",
    min: 0.1,
    max: 1,
    step: 0.01,
    default: 0.6,
    enabledBy: "atmosphere.godRays.enabled",
    learn: { what: "How far the shafts reach from the sun, as a fraction of the way across the screen.", why: "Long rays fill the frame with light; short ones stay a halo around the sun." },
    brief: "God rays reach {value} of the way from the sun.",
    tags: ["god rays"]
  }),
  p5({
    id: "atmosphere.godRays.decay",
    label: "Ray falloff",
    type: "float",
    min: 0.8,
    max: 1,
    step: 1e-3,
    default: 0.96,
    enabledBy: "atmosphere.godRays.enabled",
    learn: { what: "How quickly rays fade along their length.", why: "Lower values keep the rays near the sun." },
    brief: "God ray decay {value}.",
    tags: ["god rays"]
  }),
  p5({
    id: "atmosphere.heightFog.density",
    label: "Height fog",
    type: "float",
    min: 0,
    max: 0.3,
    step: 1e-3,
    default: 0,
    neutral: 0,
    learn: {
      what: "Fog that pools near the ground and thins out with height, like mist in a valley or haze at sea level.",
      why: "Low-lying fog separates layers of a landscape (each hill gets its own pale band) and makes tall things rise out of it. Combine it with distance fog.",
      typical: "0.02–0.08."
    },
    brief: "Height fog density {value}.",
    tags: ["fog", "height fog", "atmosphere", "mist"]
  }),
  p5({
    id: "atmosphere.heightFog.base",
    label: "Height fog level",
    type: "float",
    min: -20,
    max: 60,
    step: 0.5,
    unit: "m",
    default: 0,
    learn: { what: "The height where height fog is at full density.", why: "Set it to the valley floor or the sea." },
    brief: "Height fog at {value} m.",
    tags: ["height fog"]
  }),
  p5({
    id: "atmosphere.heightFog.falloff",
    label: "Height fog falloff",
    type: "float",
    min: 0.02,
    max: 2,
    step: 0.01,
    default: 0.25,
    learn: { what: "How quickly height fog thins with altitude.", why: "High values make a thin layer of ground mist; low values a deep haze." },
    brief: "Height fog falloff {value} per meter.",
    tags: ["height fog"]
  }),
  p5({
    id: "atmosphere.clouds.amount",
    label: "Toon clouds",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
    neutral: 0,
    learn: {
      what: "Flat, stylized clouds painted into the sky, drifting slowly.",
      why: "A big sky with simple, banded clouds is half of a cel-shaded adventure look, and gives the eye depth and a sense of weather."
    },
    brief: "Toon clouds (opacity {value}).",
    tags: ["sky", "clouds", "toon"]
  }),
  p5({
    id: "atmosphere.clouds.coverage",
    label: "Cloud coverage",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
    learn: { what: "How much of the sky the clouds cover.", why: "Scattered clouds read as fair weather; full coverage as overcast." },
    brief: "Cloud coverage {value}.",
    tags: ["clouds"]
  }),
  p5({
    id: "atmosphere.clouds.softness",
    label: "Cloud softness",
    type: "float",
    min: 0,
    max: 0.5,
    step: 0.01,
    default: 0.06,
    learn: { what: "How soft cloud edges are.", why: "Hard edges read as graphic, cel-painted clouds; soft ones as painted or real." },
    brief: "Cloud edge softness {value}.",
    tags: ["clouds"]
  }),
  p5({
    id: "atmosphere.clouds.bands",
    label: "Cloud shading bands",
    type: "int",
    min: 0,
    max: 4,
    step: 1,
    default: 2,
    learn: { what: "Flat tones of light inside each cloud (0 is smooth).", why: "Two tones (lit top, shaded belly) is the classic toon cloud." },
    brief: "Clouds shaded in {value} bands.",
    tags: ["clouds", "toon"]
  }),
  p5({
    id: "atmosphere.clouds.scale",
    label: "Cloud size",
    type: "float",
    min: 0.2,
    max: 4,
    step: 0.05,
    unit: "×",
    default: 1,
    learn: { what: "Size of the cloud shapes.", why: "Large clouds feel calm and close; small ones feel high and far away." },
    brief: "Cloud size ×{value}.",
    tags: ["clouds"]
  }),
  p5({
    id: "atmosphere.clouds.speed",
    label: "Cloud drift",
    type: "float",
    min: 0,
    max: 3,
    step: 0.01,
    default: 0.3,
    learn: { what: "How fast clouds drift.", why: "Slow drift adds life to a still shot." },
    brief: "Cloud drift {value}.",
    tags: ["clouds", "motion"]
  }),
  p5({
    id: "atmosphere.clouds.color",
    label: "Cloud color",
    type: "color",
    default: "#ffffff",
    learn: { what: "The lit color of the clouds.", why: "Tint it with the sun: white at noon, peach at sunset." },
    brief: "Clouds {value}.",
    tags: ["clouds", "color"]
  }),
  p5({
    id: "atmosphere.clouds.shade",
    label: "Cloud shadow color",
    type: "color",
    default: "#a9b8dc",
    learn: { what: "The color of the clouds' shaded undersides.", why: "A cool, sky-tinted shade keeps clouds airy; gray reads as rain." },
    brief: "Cloud shade {value}.",
    tags: ["clouds", "color"]
  }),
  // P2 (M10): per-part fog, physical sky, ambient particles.
  p5({
    id: "atmosphere.fog.partAmount",
    scope: "both",
    label: "Fog on this part",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    learn: {
      what: "Scales the fog on one part (edit it in the Parts tab). 1 is the look's fog, 0 keeps the part clear.",
      why: "Art direction often exempts something from fog: the hero must read at any distance, emissive signs should cut through the mist, a skyline stays crisp while the ground fogs.",
      avoid: "Clearing large background parts: the depth that fog gives comes back flat."
    },
    brief: "Fog on this part ×{value}.",
    tags: ["fog", "parts"]
  }),
  p5({
    id: "atmosphere.sky.model",
    label: "Sky model",
    type: "enum",
    default: "gradient",
    structural: true,
    options: [
      { value: "gradient", label: "Gradient (art-directed)" },
      { value: "physical", label: "Physical (Preetham)" }
    ],
    learn: {
      what: "Gradient paints the sky from three colors; Physical computes it from the sun's position by atmospheric scattering (Preetham), with haze set by turbidity.",
      why: "A physical sky moves correctly with the time of day (orange at sunset, deep blue at noon) without hand-picking colors. Stylized games usually prefer the control of a gradient.",
      avoid: "Physical skies in graphic, flat-color looks: their soft realism clashes with cel shading."
    },
    brief: "Sky: {label}.",
    tags: ["sky", "physical", "scattering"]
  }),
  p5({
    id: "atmosphere.sky.turbidity",
    label: "Turbidity (haze)",
    type: "float",
    min: 1,
    max: 20,
    step: 0.1,
    default: 4,
    learn: { what: "How hazy the physical sky is: 2 is clear mountain air, 10 a humid summer day.", why: "Haze whitens the horizon and widens the glow around the sun.", typical: "2–6." },
    brief: "Sky turbidity {value}.",
    tags: ["sky", "physical"]
  }),
  p5({
    id: "atmosphere.sky.rayleigh",
    label: "Rayleigh (blueness)",
    type: "float",
    min: 0,
    max: 4,
    step: 0.01,
    default: 1.5,
    learn: { what: "How strongly air scatters blue light in the physical sky.", why: "Higher values give deeper blue overhead and redder sunsets.", typical: "1–3." },
    brief: "Rayleigh scattering {value}.",
    tags: ["sky", "physical"]
  }),
  p5({
    id: "atmosphere.particles.enabled",
    label: "Ambient particles",
    type: "bool",
    default: false,
    structural: true,
    cost: { ...CHEAP, fpe: 0.3 },
    learn: {
      what: "Thousands of small camera-facing sprites drifting through the air around the camera: dust, pollen, embers, snow or rain.",
      why: "Particles fill the empty air between the camera and the scene, so the space feels deep and alive: motes in a sunbeam, embers over a fire, snow on a quiet night.",
      avoid: "Dense particles in front of gameplay, and particles that ignore the scene's weather."
    },
    brief: "Ambient particles: {label}.",
    tags: ["particles", "dust", "snow", "rain", "embers", "atmosphere"]
  }),
  p5({
    id: "atmosphere.particles.type",
    label: "Particle type",
    type: "enum",
    default: "dust",
    enabledBy: "atmosphere.particles.enabled",
    options: [
      { value: "dust", label: "Dust motes (float)" },
      { value: "pollen", label: "Pollen (drift)" },
      { value: "embers", label: "Embers (rise, glow)" },
      { value: "snow", label: "Snow (fall, sway)" },
      { value: "rain", label: "Rain (streaks)" }
    ],
    learn: { what: "How the particles move and look: floating motes, drifting pollen, rising glowing embers, falling snow or rain streaks.", why: "Each type says something about the place: a dusty attic, a spring meadow, a forge, winter, a noir street." },
    brief: "Particles: {label}.",
    tags: ["particles"]
  }),
  p5({
    id: "atmosphere.particles.density",
    label: "Particle density",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
    neutral: 0,
    enabledBy: "atmosphere.particles.enabled",
    learn: { what: "How many particles fill the air (up to 4,000).", why: "A few particles add life; many make weather.", typical: "0.2–0.6." },
    brief: "Particle density {value}.",
    tags: ["particles"]
  }),
  p5({
    id: "atmosphere.particles.size",
    label: "Particle size",
    type: "float",
    min: 0.2,
    max: 3,
    step: 0.01,
    default: 1,
    enabledBy: "atmosphere.particles.enabled",
    learn: { what: "Scales the particles (about 3 cm motes and 1.5 cm snowflakes at 1).", why: "Bigger particles read as closer and softer." },
    brief: "Particle size ×{value}.",
    tags: ["particles"]
  }),
  p5({
    id: "atmosphere.particles.speed",
    label: "Particle speed",
    type: "float",
    min: 0,
    max: 3,
    step: 0.01,
    default: 1,
    enabledBy: "atmosphere.particles.enabled",
    learn: { what: "How fast the particles move.", why: "Slow motes feel calm; fast rain feels urgent." },
    brief: "Particle speed ×{value}.",
    tags: ["particles"]
  }),
  p5({
    id: "atmosphere.particles.color",
    label: "Particle color",
    type: "color",
    default: "#fff3d6",
    enabledBy: "atmosphere.particles.enabled",
    learn: { what: "The particle color (embers also glow with it).", why: "Tint particles toward the light: warm motes in sunlight, pale blue snow at night." },
    brief: "Particles {value}.",
    tags: ["particles"]
  })
];

// src/runtime/registry/lens.js
var p6 = (e) => param("lens", e);
var lens_default = [
  p6({
    id: "lens.fovScale",
    label: "Lens width",
    type: "float",
    min: 0.5,
    max: 2,
    step: 0.01,
    unit: "×",
    default: 1,
    learn: {
      what: "Widens (above 1) or narrows (below 1) each camera shot's own lens. The camera dollies to keep the subject the same size, so only the perspective changes.",
      why: "Wide lenses exaggerate depth and speed (skating and racing games); long lenses flatten and compress (strategy, cinematic close-ups). Scaling the shot's lens keeps each genre's camera, so a top-down garden stays top-down.",
      typical: "1.2–1.4 for fast action, 0.7–0.85 for a flatter, telephoto feel."
    },
    brief: "Lens {value}× wider than the default camera (dolly to keep the subject size).",
    tags: ["camera", "lens", "fov"]
  }),
  p6({
    id: "lens.bloom.enabled",
    label: "Bloom",
    type: "bool",
    default: false,
    structural: true,
    cost: { ...MEDIUM, fpe: 2.5 },
    learn: {
      what: "Light bleeding around bright areas, computed from the HDR image before tone mapping.",
      why: "The eye and cameras see glare around bright lights. Bloom makes emissive things and the sun read as bright, not just white.",
      avoid: "Bloom on everything (low threshold): the image turns milky."
    },
    brief: "Bloom on HDR highlights.",
    tags: ["bloom", "glow"]
  }),
  p6({
    id: "lens.bloom.strength",
    label: "Bloom strength",
    type: "float",
    min: 0,
    max: 3,
    step: 0.01,
    default: 0.4,
    neutral: 0,
    enabledBy: "lens.bloom.enabled",
    learn: { what: "How much glow is added.", why: "Subtle values add warmth; strong ones give a dreamy look.", typical: "0.15–0.5." },
    brief: "Bloom strength {value}.",
    tags: ["bloom"]
  }),
  p6({
    id: "lens.bloom.radius",
    label: "Bloom radius",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
    enabledBy: "lens.bloom.enabled",
    learn: { what: "How far the glow spreads.", why: "Wide glow reads as haze, tight glow as crisp highlights." },
    brief: "Bloom radius {value}.",
    tags: ["bloom"]
  }),
  p6({
    id: "lens.bloom.threshold",
    label: "Bloom threshold",
    type: "float",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0.9,
    enabledBy: "lens.bloom.enabled",
    learn: { what: "Brightness above which pixels glow (in HDR luminance).", why: "A high threshold keeps the glow to light sources, so it stays meaningful.", typical: "0.7–1." },
    brief: "Bloom threshold {value}.",
    tags: ["bloom"]
  }),
  p6({
    id: "lens.bloom.source",
    label: "Bloom source",
    type: "enum",
    default: "all",
    structural: true,
    enabledBy: "lens.bloom.enabled",
    requires: ["emissive"],
    options: [{ value: "all", label: "Everything bright" }, { value: "emissive", label: "Emissive only (selective)" }],
    learn: {
      what: "What glows: every pixel above the threshold, or only emissive materials (lamps, neon, magic).",
      why: "Selective bloom keeps sunlit white walls crisp while lights glow, the trick behind neon and synthwave looks. It needs one extra buffer."
    },
    brief: "Bloom source: {label}.",
    tags: ["bloom", "glow", "emissive"]
  }),
  p6({
    id: "lens.vignette.amount",
    label: "Vignette",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
    learn: {
      what: "Darkens the corners of the frame.",
      why: "It pulls the eye toward the center, where the subject usually is, and frames the image like an old lens.",
      typical: "0.08–0.25.",
      avoid: "Heavy vignettes on gameplay cameras: they hide information at the edges."
    },
    brief: "Vignette {value}.",
    tags: ["vignette", "focus"]
  }),
  p6({
    id: "lens.vignette.softness",
    label: "Vignette softness",
    type: "float",
    min: 0.05,
    max: 1,
    step: 0.01,
    default: 0.5,
    learn: { what: "How gradually the vignette fades in.", why: "Soft vignettes go unnoticed but still guide the eye." },
    brief: "Vignette softness {value}.",
    tags: ["vignette"]
  }),
  p6({
    id: "lens.vignette.roundness",
    label: "Vignette roundness",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    learn: { what: "1 makes a circle; 0 follows the frame's aspect ratio.", why: "A round vignette feels like a lens; a frame-shaped one feels like a print border." },
    brief: "Vignette roundness {value}.",
    tags: ["vignette"]
  }),
  p6({
    id: "lens.vignette.color",
    label: "Vignette color",
    type: "color",
    default: "#000000",
    learn: { what: "The color the corners fade toward.", why: "A tinted vignette (warm brown, deep blue) frames without killing the palette." },
    brief: "Vignette color {value}.",
    tags: ["vignette", "color"]
  }),
  p6({
    id: "lens.dof.enabled",
    label: "Depth of field",
    type: "bool",
    default: false,
    structural: true,
    requires: ["depth"],
    cost: HEAVY,
    learn: {
      what: "Blurs what is in front of and behind the focus point, like a camera lens with a wide aperture. Focus follows what the camera looks at.",
      why: "Shallow focus tells the eye exactly where to look and separates the subject from a busy background. It is the signature of cinematic and photographic looks.",
      avoid: "Gameplay cameras where the player must read the background, and retro looks (old consoles couldn't blur)."
    },
    brief: "Depth of field focused on the subject.",
    tags: ["dof", "focus", "cinematic", "blur"]
  }),
  p6({
    id: "lens.dof.range",
    label: "Focus range",
    type: "float",
    min: 0.5,
    max: 60,
    step: 0.1,
    unit: "m",
    default: 8,
    enabledBy: "lens.dof.enabled",
    learn: { what: "How far from the focus point things become fully blurred.", why: "A short range is a fast lens (shallow focus); a long range keeps most of the scene sharp.", typical: "3–10 m for a third-person subject." },
    brief: "Fully out of focus {value} m from the focal plane.",
    tags: ["dof"]
  }),
  p6({
    id: "lens.dof.blur",
    label: "Bokeh size",
    type: "float",
    min: 0,
    max: 4,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "lens.dof.enabled",
    learn: { what: "The size of the out-of-focus blur.", why: "Big, round bokeh reads as a large sensor and a fast lens: expensive and filmic." },
    brief: "Bokeh scale {value}.",
    tags: ["dof", "bokeh"]
  }),
  p6({
    id: "lens.dof.offset",
    label: "Focus offset",
    type: "float",
    min: -20,
    max: 20,
    step: 0.1,
    unit: "m",
    default: 0,
    enabledBy: "lens.dof.enabled",
    learn: { what: "Moves the focal plane in front of (−) or behind (+) the subject.", why: 'Pulling focus to the background or foreground is a storytelling device: it says "look here instead".' },
    brief: "Focus offset {value} m from the subject.",
    tags: ["dof"]
  }),
  p6({
    id: "lens.tiltShift.enabled",
    label: "Tilt-shift",
    type: "bool",
    default: false,
    structural: true,
    cost: MEDIUM,
    learn: {
      what: "Keeps a horizontal band sharp and blurs above and below it.",
      why: "Our eyes associate a very shallow, band-shaped focus with photos of small things close up, so a big scene reads as a miniature model.",
      avoid: "Low camera angles: the effect only sells a miniature when you look down on the scene."
    },
    brief: "Tilt-shift miniature blur.",
    tags: ["tilt-shift", "miniature", "blur"]
  }),
  p6({
    id: "lens.tiltShift.center",
    label: "Sharp band center",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.55,
    enabledBy: "lens.tiltShift.enabled",
    learn: { what: "Height of the sharp band on screen (0 = bottom, 1 = top).", why: "Put it on the subject; the blur above suggests distance, the blur below suggests a lens close to the model." },
    brief: "Sharp band at {value} of the screen height.",
    tags: ["tilt-shift"]
  }),
  p6({
    id: "lens.tiltShift.width",
    label: "Sharp band width",
    type: "float",
    min: 0.02,
    max: 0.8,
    step: 0.01,
    default: 0.18,
    enabledBy: "lens.tiltShift.enabled",
    learn: { what: "How tall the sharp band is.", why: "Narrow bands sell the miniature harder." },
    brief: "Sharp band {value} of the screen tall.",
    tags: ["tilt-shift"]
  }),
  p6({
    id: "lens.tiltShift.blur",
    label: "Tilt-shift blur",
    type: "float",
    min: 0,
    max: 4,
    step: 0.01,
    default: 2,
    neutral: 0,
    enabledBy: "lens.tiltShift.enabled",
    learn: { what: "How strong the blur outside the band is.", why: "Strong blur and high saturation together are what make tilt-shift photos look like toys." },
    brief: "Tilt-shift blur {value}.",
    tags: ["tilt-shift"]
  }),
  p6({
    id: "lens.motionBlur.enabled",
    label: "Motion blur",
    type: "bool",
    default: false,
    structural: true,
    requires: ["velocity"],
    cost: HEAVY,
    learn: {
      what: "Smears moving objects along their motion, as a film camera does with its shutter open.",
      why: "It reads as speed and weight, and smooths fast motion at low frame rates. Racing and action games use it to sell velocity.",
      avoid: "Retro looks, and strong blur on gameplay-critical objects: players need to see them."
    },
    brief: "Per-object motion blur.",
    tags: ["motion blur", "speed", "cinematic"]
  }),
  p6({
    id: "lens.motionBlur.shutter",
    label: "Shutter angle",
    type: "float",
    min: 0,
    max: 360,
    step: 1,
    unit: "°",
    default: 180,
    neutral: 0,
    enabledBy: "lens.motionBlur.enabled",
    learn: { what: "How long the virtual shutter stays open per frame. 180° is film standard; 360° smears the whole frame time.", why: "Film's 180° rule gives natural motion; larger angles look dreamy or fast, smaller ones staccato (action scenes, war films).", typical: "180°." },
    brief: "Shutter angle {value}°.",
    tags: ["motion blur"]
  }),
  p6({
    id: "lens.ca.enabled",
    label: "Chromatic aberration",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Splits red, green and blue slightly toward the edges of the frame, like a cheap or vintage lens.",
      why: "A touch of fringing reads as a real lens, a screen, or a glitch. It is a signature of sci-fi HUDs and found-footage looks.",
      avoid: "Strong CA on text and UI, or with thin lines: it blurs them."
    },
    brief: "Chromatic aberration at the frame edges.",
    tags: ["lens", "chromatic aberration", "sci-fi"]
  }),
  p6({
    id: "lens.ca.amount",
    label: "Aberration",
    type: "float",
    min: 0,
    max: 3,
    step: 0.01,
    default: 0.6,
    neutral: 0,
    enabledBy: "lens.ca.enabled",
    learn: { what: "How far the color channels separate.", why: "Subtle values read as a lens; strong ones as a glitch." },
    brief: "Aberration strength {value}.",
    tags: ["chromatic aberration"]
  }),
  p6({
    id: "lens.distortion.enabled",
    label: "Lens distortion",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Bends straight lines: barrel distortion bulges the middle (fisheye), pincushion pinches it.",
      why: "Barrel distortion with a wide lens is the look of skate videos and action cams: it exaggerates speed and energy."
    },
    brief: "Lens distortion.",
    tags: ["lens", "fisheye", "distortion"]
  }),
  p6({
    id: "lens.distortion.amount",
    label: "Distortion",
    type: "float",
    min: -0.5,
    max: 0.5,
    step: 0.01,
    default: 0.12,
    neutral: 0,
    enabledBy: "lens.distortion.enabled",
    learn: { what: "Positive for barrel (fisheye), negative for pincushion.", why: "A little barrel reads as an energetic wide lens; a lot reads as a peephole.", typical: "0.08–0.15." },
    brief: "Distortion {value} (+ barrel).",
    tags: ["distortion"]
  }),
  p6({
    id: "lens.letterbox.amount",
    label: "Letterbox",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
    learn: {
      what: "Black bars that crop the frame to a wider (or narrower) aspect ratio.",
      why: 'The 2.39:1 frame is cinema; players read it as "this is a cutscene". 4:3 bars read as retro TV.',
      avoid: "During gameplay on phones: bars waste scarce screen space."
    },
    brief: "Letterbox to {value} of the full crop.",
    tags: ["letterbox", "cinematic", "framing"]
  }),
  p6({
    id: "lens.letterbox.aspect",
    label: "Letterbox aspect",
    type: "float",
    min: 1.2,
    max: 2.8,
    step: 0.01,
    default: 2.39,
    learn: { what: "The aspect ratio the bars crop to (width / height). Narrower than the screen gives side bars.", why: "2.39 is anamorphic cinema, 1.85 flat cinema, 1.33 (4:3) old TV." },
    brief: "Letterbox aspect {value}:1.",
    tags: ["letterbox"]
  }),
  p6({
    id: "lens.letterbox.color",
    label: "Letterbox color",
    type: "color",
    default: "#000000",
    learn: { what: "The color of the bars.", why: "Black disappears on screens; a paper or brand color turns the bars into a frame." },
    brief: "Letterbox bars {value}.",
    tags: ["letterbox"]
  }),
  // P2 (M10): lens flare, anamorphic streaks, afterimage trails.
  p6({
    id: "lens.flare.enabled",
    label: "Lens flare",
    type: "bool",
    default: false,
    structural: true,
    cost: { ...MEDIUM, fpe: 1.2 },
    learn: {
      what: "Ghost reflections of the brightest lights, mirrored through the center of the frame, as light bounces between the glass elements of a camera lens.",
      why: 'A flare says "a camera filmed this, looking into the light". It makes the sun and neon read as blinding and gives racing and sci-fi shots their cinematic polish.',
      avoid: "Flares from everything (a low threshold), and flares in a drawn or painted look: a painting has no lens."
    },
    brief: "Lens flare: ghosts of the brightest highlights mirrored through the center.",
    tags: ["lens", "flare", "cinematic", "sun"]
  }),
  p6({
    id: "lens.flare.intensity",
    label: "Flare intensity",
    type: "float",
    min: 0,
    max: 3,
    step: 0.01,
    default: 0.6,
    neutral: 0,
    enabledBy: "lens.flare.enabled",
    learn: { what: "How bright the ghosts are.", why: "A faint flare reads as a real lens; a strong one is a stylized accent.", typical: "0.3–0.8." },
    brief: "Flare intensity {value}.",
    tags: ["flare"]
  }),
  p6({
    id: "lens.flare.threshold",
    label: "Flare threshold",
    type: "float",
    min: 0,
    max: 4,
    step: 0.01,
    default: 1.2,
    enabledBy: "lens.flare.enabled",
    learn: { what: "HDR brightness above which a highlight throws ghosts.", why: "Keep it above the brightest lit surface, so only light sources flare.", typical: "1–2." },
    brief: "Flare threshold {value} (HDR luminance).",
    tags: ["flare"]
  }),
  p6({
    id: "lens.flare.spacing",
    label: "Ghost spacing",
    type: "float",
    min: 0.05,
    max: 0.6,
    step: 0.01,
    default: 0.25,
    enabledBy: "lens.flare.enabled",
    learn: { what: "How far apart the ghosts sit along the line through the center of the frame.", why: "Wide spacing spreads ghosts across the frame like a zoom lens; tight spacing clusters them near the light." },
    brief: "Ghost spacing {value}.",
    tags: ["flare"]
  }),
  p6({
    id: "lens.anamorphic.enabled",
    label: "Anamorphic streaks",
    type: "bool",
    default: false,
    structural: true,
    cost: { ...MEDIUM, fpe: 1.5 },
    learn: {
      what: "Long horizontal streaks through bright highlights, like the stretched flares of anamorphic cinema lenses.",
      why: "The horizontal blue streak is shorthand for night-city and sci-fi cinema. It makes lights feel hot and the frame feel wide-screen.",
      avoid: "Streaks in daylight looks or on many small highlights: the frame fills with lines."
    },
    brief: "Anamorphic streaks through bright highlights.",
    tags: ["lens", "anamorphic", "flare", "cinematic", "sci-fi"]
  }),
  p6({
    id: "lens.anamorphic.intensity",
    label: "Streak intensity",
    type: "float",
    min: 0,
    max: 3,
    step: 0.01,
    default: 0.6,
    neutral: 0,
    enabledBy: "lens.anamorphic.enabled",
    learn: { what: "How bright the streaks are.", why: "Subtle streaks add a cinematic sheen; strong ones become a graphic element.", typical: "0.3–1." },
    brief: "Streak intensity {value}.",
    tags: ["anamorphic"]
  }),
  p6({
    id: "lens.anamorphic.threshold",
    label: "Streak threshold",
    type: "float",
    min: 0,
    max: 4,
    step: 0.01,
    default: 1,
    enabledBy: "lens.anamorphic.enabled",
    learn: { what: "HDR brightness above which a pixel streaks.", why: "High thresholds keep streaks to lamps and neon.", typical: "0.8–1.5." },
    brief: "Streak threshold {value} (HDR luminance).",
    tags: ["anamorphic"]
  }),
  p6({
    id: "lens.anamorphic.length",
    label: "Streak length",
    type: "float",
    min: 1,
    max: 8,
    step: 0.1,
    default: 3,
    enabledBy: "lens.anamorphic.enabled",
    learn: { what: "How far the streaks stretch sideways.", why: "Long streaks cross the frame like a movie poster; short ones stay a glint." },
    brief: "Streak length {value}.",
    tags: ["anamorphic"]
  }),
  p6({
    id: "lens.anamorphic.tint",
    label: "Streak color",
    type: "color",
    default: "#5f8dff",
    enabledBy: "lens.anamorphic.enabled",
    learn: { what: "The color of the streaks.", why: "Real anamorphic coatings streak blue; matching the streak to the neon ties it into the palette." },
    brief: "Streaks tinted {value}.",
    tags: ["anamorphic"]
  }),
  p6({
    id: "lens.afterimage.enabled",
    label: "Afterimage trails",
    type: "bool",
    default: false,
    structural: true,
    cost: { ...MEDIUM, fpe: 0.8 },
    learn: {
      what: "Blends each frame with a fading copy of the frames before it, so anything that moves leaves a ghostly trail.",
      why: "Trails read as speed, dizziness or a dream: the screen remembers where things were. Rhythm games, dream sequences and old phosphor screens use it.",
      avoid: "Gameplay where players must track fast objects: the trail hides where things are now."
    },
    brief: "Afterimage trails (frame feedback).",
    tags: ["lens", "trails", "afterimage", "motion", "dream"]
  }),
  p6({
    id: "lens.afterimage.damping",
    label: "Trail length",
    type: "float",
    min: 0,
    max: 0.97,
    step: 0.01,
    default: 0.8,
    neutral: 0,
    enabledBy: "lens.afterimage.enabled",
    learn: { what: "How much of the previous frames stays: higher values leave longer trails.", why: "Short trails read as speed; long ones as a dream or intoxication.", typical: "0.6–0.9." },
    brief: "Trail persistence {value} per frame.",
    tags: ["afterimage"]
  })
];

// src/runtime/registry/grade.js
var p7 = (e) => param("grade", e);
var grade_default = [
  p7({
    id: "grade.exposure",
    label: "Exposure",
    type: "float",
    min: -3,
    max: 3,
    step: 0.05,
    unit: "EV",
    default: 0,
    learn: {
      what: "Brightens or darkens the HDR image before tone mapping, in photographic stops (+1 EV doubles the light).",
      why: "Exposure sets where the midtones land. Adjust it before contrast, as a photographer would."
    },
    brief: "Exposure {value} EV.",
    tags: ["exposure", "tone"]
  }),
  p7({
    id: "grade.toneMapping",
    label: "Tone mapping",
    type: "enum",
    default: "aces",
    structural: true,
    options: [
      { value: "none", label: "None (clip)" },
      { value: "linear", label: "Linear" },
      { value: "reinhard", label: "Reinhard" },
      { value: "cineon", label: "Cineon" },
      { value: "aces", label: "ACES Filmic" },
      { value: "agx", label: "AgX" },
      { value: "neutral", label: "Neutral (Khronos PBR)" }
    ],
    learn: {
      what: "How HDR light values are compressed into what a screen can show.",
      why: "ACES adds filmic contrast and shifts saturated colors; Neutral keeps the colors you picked, which suits saturated cartoon palettes; AgX handles bright, saturated light gracefully.",
      typical: "Neutral for toon palettes, ACES or AgX for photographic looks."
    },
    brief: "{label} tone mapping.",
    tags: ["tone mapping", "tone"]
  }),
  p7({
    id: "grade.temperature",
    label: "White balance: temperature",
    type: "float",
    min: -1,
    max: 1,
    step: 0.01,
    default: 0,
    learn: {
      what: "Warms (+) or cools (−) the whole image.",
      why: "Temperature is mood: warm for nostalgia and sunsets, cool for night, tension or sci-fi."
    },
    brief: "White balance temperature {value} (+ warm).",
    tags: ["grade", "temperature"]
  }),
  p7({
    id: "grade.tint",
    label: "White balance: tint",
    type: "float",
    min: -1,
    max: 1,
    step: 0.01,
    default: 0,
    learn: { what: "Shifts the image toward magenta (+) or green (−).", why: "Corrects or adds the green cast of fluorescent or jungle light." },
    brief: "White balance tint {value} (+ magenta).",
    tags: ["grade"]
  }),
  p7({
    id: "grade.contrast",
    label: "Contrast",
    type: "float",
    min: 0.5,
    max: 2,
    step: 0.01,
    default: 1,
    learn: {
      what: "Pushes tones away from middle gray (or toward it, below 1), in display space.",
      why: "Contrast gives punch and separates values. Low contrast reads as hazy, nostalgic or soft.",
      typical: "1.05–1.2."
    },
    brief: "Contrast {value}.",
    tags: ["grade", "contrast"]
  }),
  p7({
    id: "grade.saturation",
    label: "Saturation (grade)",
    type: "float",
    min: 0,
    max: 2,
    step: 0.01,
    default: 1,
    learn: {
      what: "Scales the colorfulness of the final image.",
      why: "Grading saturation affects everything at once, light and fog included. Use palette saturation to change specific parts."
    },
    brief: "Final image saturation {value}.",
    tags: ["grade", "saturation"]
  }),
  p7({
    id: "grade.split.amount",
    label: "Split toning",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
    learn: {
      what: "Tints the shadows with one color and the highlights with another.",
      why: "The classic film grade (teal shadows, warm highlights) adds color contrast without touching the scene's lighting.",
      typical: "0.2–0.5."
    },
    brief: "Split toning at {value}.",
    tags: ["grade", "split tone"]
  }),
  p7({
    id: "grade.split.shadows",
    label: "Split: shadow color",
    type: "color",
    default: "#2e5f8a",
    learn: { what: "Color mixed into the dark tones.", why: "Cool shadow tones read as depth and sky light." },
    brief: "Shadows toned {value}.",
    tags: ["split tone"]
  }),
  p7({
    id: "grade.split.highlights",
    label: "Split: highlight color",
    type: "color",
    default: "#ffb46b",
    learn: { what: "Color mixed into the bright tones.", why: "Warm highlights read as sunlight and skin." },
    brief: "Highlights toned {value}.",
    tags: ["split tone"]
  }),
  p7({
    id: "grade.split.balance",
    label: "Split: balance",
    type: "float",
    min: -1,
    max: 1,
    step: 0.01,
    default: 0,
    learn: { what: "Moves the crossover between shadow and highlight toning.", why: "Positive values give more of the image to the shadow color." },
    brief: "Split balance {value}.",
    tags: ["split tone"]
  }),
  p7({
    id: "grade.lift",
    label: "Lift (shadows)",
    type: "float",
    min: -0.3,
    max: 0.3,
    step: 5e-3,
    default: 0,
    learn: {
      what: 'Raises (+) or crushes (−) the darkest tones; the CDL "offset".',
      why: "Lifted blacks read as faded film, haze or a soft pastel style; crushed blacks read as punchy and dramatic.",
      typical: "−0.03 to +0.05."
    },
    brief: "Lift {value} (CDL offset).",
    tags: ["grade", "cdl", "shadows"]
  }),
  p7({
    id: "grade.gamma",
    label: "Gamma (midtones)",
    type: "float",
    min: 0.5,
    max: 2,
    step: 0.01,
    default: 1,
    learn: {
      what: 'Brightens (below 1) or darkens (above 1) the midtones while black and white stay put; the CDL "power".',
      why: "Most of an image is midtones. Gamma changes the overall mood without clipping either end."
    },
    brief: "Gamma {value} (CDL power).",
    tags: ["grade", "cdl", "midtones"]
  }),
  p7({
    id: "grade.gain",
    label: "Gain (highlights)",
    type: "float",
    min: 0.5,
    max: 2,
    step: 0.01,
    default: 1,
    learn: {
      what: 'Scales every tone, which mostly moves the highlights; the CDL "slope".',
      why: "Gain sets how bright the brightest areas get. Together, lift, gamma and gain are the standard three-way color corrector."
    },
    brief: "Gain {value} (CDL slope).",
    tags: ["grade", "cdl", "highlights"]
  }),
  p7({
    id: "grade.vibrance",
    label: "Vibrance",
    type: "float",
    min: -1,
    max: 1,
    step: 0.01,
    default: 0,
    learn: {
      what: "Boosts the color of muted tones more than already saturated ones.",
      why: "Unlike saturation, vibrance lifts dull colors without pushing bright ones (or skin) into neon."
    },
    brief: "Vibrance {value}.",
    tags: ["grade", "saturation"]
  }),
  p7({
    id: "grade.hue",
    label: "Hue shift (grade)",
    type: "angle",
    min: -180,
    max: 180,
    step: 1,
    unit: "°",
    default: 0,
    learn: {
      what: "Rotates the hue of the whole final image, light and fog included.",
      why: 'A small global shift unifies an image toward one color family; a big one is a psychedelic or "corrupted world" effect. Use the palette hue to shift objects only.'
    },
    brief: "Final image hue rotated {value}°.",
    tags: ["grade", "hue"]
  }),
  p7({
    id: "grade.selective.enabled",
    label: "Selective color",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Keeps one hue in color and desaturates everything else.",
      why: "A single colored element in a gray world becomes the focus of every frame: the red coat in a black-and-white film.",
      avoid: "Choosing a hue that appears everywhere in the scene: nothing stands out."
    },
    brief: "Selective color: only one hue keeps its color.",
    tags: ["grade", "selective color", "noir", "focus"]
  }),
  p7({
    id: "grade.selective.hue",
    label: "Kept hue",
    type: "angle",
    min: -180,
    max: 180,
    step: 1,
    unit: "°",
    default: 25,
    enabledBy: "grade.selective.enabled",
    learn: { what: "The hue that keeps its color (OKLCH hue angle: about 25° red, 90° yellow, 145° green, 250° blue, 330° magenta).", why: "Pick the color of your subject." },
    brief: "Kept hue {value}° (OKLCH).",
    tags: ["selective color"]
  }),
  p7({
    id: "grade.selective.range",
    label: "Hue range",
    type: "float",
    min: 5,
    max: 120,
    step: 1,
    unit: "°",
    default: 35,
    enabledBy: "grade.selective.enabled",
    learn: { what: "How far around the kept hue colors survive.", why: "Narrow ranges isolate one object; wide ranges keep a whole color family." },
    brief: "Hue range ±{value}°.",
    tags: ["selective color"]
  }),
  p7({
    id: "grade.selective.amount",
    label: "Desaturate the rest",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "grade.selective.enabled",
    learn: { what: "How gray everything outside the range becomes.", why: "Full desaturation is the classic noir effect; partial keeps a hint of the world's color." },
    brief: "Other hues desaturated {value}.",
    tags: ["selective color"]
  }),
  p7({
    id: "grade.lut.enabled",
    label: "Color LUT",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "A 3D lookup table: a baked, complete color grade applied in one texture fetch.",
      why: "This is how games ship film-style grades: an artist grades a frame in any tool, exports a LUT, and the engine applies it for almost nothing. The presets here are generated in code."
    },
    brief: "A 3D color LUT.",
    tags: ["grade", "lut"]
  }),
  p7({
    id: "grade.lut.preset",
    label: "LUT preset",
    type: "enum",
    default: "teal-orange",
    enabledBy: "grade.lut.enabled",
    options: [
      { value: "teal-orange", label: "Teal and orange" },
      { value: "warm-film", label: "Warm film" },
      { value: "bleach", label: "Bleach bypass" },
      { value: "cross", label: "Cross-processed" },
      { value: "faded", label: "Faded print" },
      { value: "cool-night", label: "Cool night" },
      { value: "custom", label: "Imported .cube" }
    ],
    learn: { what: "Which grade the LUT holds: a generated preset, or a .cube file you imported (drop it on the window, or Import .cube in the Look tab).", why: "Each preset is a recognizable film or photo-lab look; compare them at full strength, then dial the amount back. Importing a .cube brings a grade from any color tool (Resolve, Photoshop, Lightroom)." },
    brief: "LUT preset: {label}.",
    tags: ["lut"]
  }),
  p7({
    id: "grade.lut.amount",
    label: "LUT amount",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "grade.lut.enabled",
    learn: { what: "Blends between the image and the LUT result.", why: "Most LUTs look best at 40–70%: the character without the cliché." },
    brief: "LUT at {value}.",
    tags: ["lut"]
  }),
  p7({
    id: "grade.gradientMap.enabled",
    label: "Gradient map",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Replaces every pixel's color with a color from a gradient, chosen by its brightness (duotone, tritone).",
      why: "It forces a whole image into a designed palette while keeping its light structure, the look of screen-printed posters and stylized flashbacks."
    },
    brief: "Gradient map (brightness → color).",
    tags: ["grade", "duotone", "gradient map", "palette"]
  }),
  p7({
    id: "grade.gradientMap.stops",
    label: "Gradient",
    type: "palette",
    default: ["#1b1442", "#7a3b8f", "#f08a5d", "#fff1c9"],
    enabledBy: "grade.gradientMap.enabled",
    learn: { what: "The gradient from shadows (first color) to highlights (last), 2–8 stops.", why: "Dark-to-light gradients that also shift hue (purple → orange → cream) give the richest duotones." },
    brief: "Gradient map stops: {value}.",
    tags: ["gradient map"]
  }),
  p7({
    id: "grade.gradientMap.amount",
    label: "Gradient map amount",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "grade.gradientMap.enabled",
    learn: { what: "Blends between the image and its gradient-mapped version.", why: "At 20–40% a gradient map becomes a subtle unifying tint." },
    brief: "Gradient map at {value}.",
    tags: ["gradient map"]
  }),
  // P2 (M10): sepia and bleach bypass.
  p7({
    id: "grade.sepia.enabled",
    label: "Sepia",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Tones the image warm brown, like an old photographic print.",
      why: "Sepia reads instantly as the past: flashbacks, westerns, old letters and memories.",
      avoid: "A partial sepia on a colorful palette: it looks dirty rather than old. Go most of the way, or leave it off."
    },
    brief: "Sepia toning.",
    tags: ["grade", "sepia", "vintage", "flashback"]
  }),
  p7({
    id: "grade.sepia.amount",
    label: "Sepia amount",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "grade.sepia.enabled",
    learn: { what: "Blends between the image and its sepia print.", why: "Full sepia is a photograph; half keeps a memory of the colors.", typical: "0.6–1." },
    brief: "Sepia at {value}.",
    tags: ["sepia"]
  }),
  p7({
    id: "grade.bleach.enabled",
    label: "Bleach bypass",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Imitates skipping the bleach step when developing film: the silver stays in the print, so colors drain and contrast turns hard and metallic.",
      why: "It is the gritty war-film look: drained color and crunchy contrast make a scene feel harsh and real.",
      avoid: "Bright, playful looks, and stacking it with the Bleach bypass LUT preset (the same idea twice)."
    },
    brief: "Bleach bypass (desaturated, hard contrast).",
    tags: ["grade", "bleach bypass", "film", "gritty"]
  }),
  p7({
    id: "grade.bleach.amount",
    label: "Bleach amount",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.8,
    neutral: 0,
    enabledBy: "grade.bleach.enabled",
    learn: { what: "How strong the bleach bypass is.", why: "Around 0.5 is grit; full strength is nearly monochrome.", typical: "0.4–0.9." },
    brief: "Bleach bypass at {value}.",
    tags: ["bleach bypass"]
  })
];

// src/runtime/registry/media.js
var p8 = (e) => param("media", e);
var media_default = [
  p8({
    id: "media.grain.amount",
    label: "Film grain",
    type: "float",
    min: 0,
    max: 0.3,
    step: 5e-3,
    default: 0,
    learn: {
      what: "Fine noise over the final image, strongest in the midtones.",
      why: "Grain hides color banding in gradients and adds a tactile, filmic texture. A little makes digital images feel less sterile.",
      typical: "0.02–0.08."
    },
    brief: "Film grain {value}.",
    tags: ["grain", "film", "texture"]
  }),
  p8({
    id: "media.grain.size",
    label: "Grain size",
    type: "float",
    min: 1,
    max: 4,
    step: 0.1,
    unit: "px@1080p",
    default: 1.5,
    learn: { what: "Size of a grain particle, in pixels at 1080p.", why: "Larger grain reads as faster film or lower resolution." },
    brief: "Grain size {value} px at 1080p.",
    tags: ["grain"]
  }),
  p8({
    id: "media.grain.animated",
    label: "Animated grain",
    type: "bool",
    default: true,
    learn: { what: "Changes the grain pattern every frame.", why: "Moving grain reads as film; static grain reads as a texture printed on the screen." },
    brief: "Grain animates each frame.",
    tags: ["grain"]
  }),
  p8({
    id: "media.kuwahara.enabled",
    scope: "mask",
    label: "Painterly (Kuwahara)",
    type: "bool",
    default: false,
    structural: true,
    cost: HEAVY,
    learn: {
      what: "An edge-preserving smoothing filter: each pixel takes the average color of the calmest neighborhood around it, so flat areas become brush-like patches while edges stay sharp.",
      why: "Painters simplify: they describe a surface with a few strokes of nearly flat color. Kuwahara does the same to a render, which hides the geometry's regularity and reads as hand-painted.",
      avoid: "Combining it with another medium (halftone, hatching, watercolor): two media read as noise. On phones, use a small radius at a lower render scale."
    },
    brief: "Kuwahara (painterly) filter.",
    tags: ["painterly", "kuwahara", "paint", "media"]
  }),
  p8({
    id: "media.kuwahara.radius",
    label: "Brush size",
    type: "int",
    min: 1,
    max: 8,
    step: 1,
    unit: "px@1080p",
    default: 4,
    enabledBy: "media.kuwahara.enabled",
    learn: { what: "The filter radius: how big the paint patches get, in pixels at 1080p.", why: "Bigger brushes simplify more, like a looser painting; cost grows with the square of the radius.", typical: "3–5." },
    brief: "Kuwahara radius {value} px at 1080p.",
    tags: ["kuwahara"]
  }),
  p8({
    id: "media.kuwahara.sharpness",
    label: "Stroke sharpness",
    type: "float",
    min: 1,
    max: 16,
    step: 0.5,
    default: 8,
    enabledBy: "media.kuwahara.enabled",
    learn: { what: "How strongly the calmest neighborhood wins. High values give crisp, flat strokes; low values blend them softly.", why: "Crisp strokes read as oil or gouache; soft ones as a dreamy blur." },
    brief: "Stroke sharpness {value}.",
    tags: ["kuwahara"]
  }),
  p8({
    id: "media.kuwahara.anisotropic",
    label: "Strokes follow edges",
    type: "bool",
    default: false,
    structural: true,
    enabledBy: "media.kuwahara.enabled",
    cost: { ...MEDIUM, fpe: 0.8 },
    learn: {
      what: "Anisotropic Kuwahara: each brush neighborhood is stretched along the local edge direction, so strokes follow the forms instead of being round patches.",
      why: "Painters drag the brush along a shape. Following the edge direction keeps thin features (branches, rails, ropes) and reads as oil paint rather than mosaic.",
      avoid: "Phones: it adds a structure pass and turns the kernel into an ellipse per pixel."
    },
    brief: "Brush strokes follow the edge direction (anisotropic Kuwahara).",
    tags: ["kuwahara", "anisotropic", "painterly"]
  }),
  p8({
    id: "media.watercolor.enabled",
    scope: "mask",
    label: "Watercolor",
    type: "bool",
    default: false,
    structural: true,
    cost: MEDIUM,
    learn: {
      what: "Imitates watercolor on paper: pigment pools and darkens at the edges of each shape, granulates in the dips of the paper, and the image wobbles and bleeds slightly.",
      why: "Edge darkening is watercolor's signature: water carries pigment to the rim of a wet area as it dries. A render with darker rims and soft bleeds reads as painted.",
      avoid: "Strong lines on top: real watercolor has no ink outlines (unless it's pen and wash)."
    },
    brief: "Watercolor simulation (edge darkening, granulation, wobble, bleed).",
    tags: ["watercolor", "paint", "media"]
  }),
  p8({
    id: "media.watercolor.edges",
    label: "Edge darkening",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.45,
    neutral: 0,
    enabledBy: "media.watercolor.enabled",
    learn: { what: "How much pigment pools at the edges of color areas.", why: "The darker rim is what makes a shape read as a watercolor wash." },
    brief: "Edge darkening {value}.",
    tags: ["watercolor"]
  }),
  p8({
    id: "media.watercolor.granulation",
    label: "Granulation",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.35,
    neutral: 0,
    enabledBy: "media.watercolor.enabled",
    learn: { what: "Pigment settling into the paper's texture, strongest in darker washes.", why: "Granulation is the grain of real pigment; it makes flat color feel physical." },
    brief: "Granulation {value}.",
    tags: ["watercolor", "texture"]
  }),
  p8({
    id: "media.watercolor.wobble",
    label: "Wobble",
    type: "float",
    min: 0,
    max: 8,
    step: 0.1,
    unit: "px@1080p",
    default: 2.5,
    neutral: 0,
    enabledBy: "media.watercolor.enabled",
    learn: { what: "Irregular displacement of the image, as if painted by hand.", why: "Hand-painted edges are never perfectly straight." },
    brief: "Hand wobble {value} px at 1080p.",
    tags: ["watercolor"]
  }),
  p8({
    id: "media.watercolor.bleed",
    label: "Bleed",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
    neutral: 0,
    enabledBy: "media.watercolor.enabled",
    learn: { what: "Colors softly running into each other.", why: "Wet-in-wet bleeding gives watercolor its loose, luminous feel." },
    brief: "Color bleed {value}.",
    tags: ["watercolor"]
  }),
  p8({
    id: "media.halftone.enabled",
    scope: "mask",
    label: "Halftone (print)",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Rebuilds the image from dots whose size follows the tone, like printing. Mono uses one ink; CMYK prints four rotated screens of cyan, magenta, yellow and black.",
      why: 'Visible print dots (Ben-Day dots) are the texture of comics and pop art: they say "printed page".',
      avoid: "Very small dots on small screens: they turn into moiré. Keep dots at least 4 px at 1080p."
    },
    brief: "Halftone print screen.",
    tags: ["halftone", "comic", "print", "media"]
  }),
  p8({
    id: "media.halftone.mode",
    label: "Halftone inks",
    type: "enum",
    default: "mono",
    structural: true,
    enabledBy: "media.halftone.enabled",
    options: [{ value: "mono", label: "Mono (one ink)" }, { value: "cmyk", label: "CMYK (four screens)" }],
    learn: { what: "One ink over paper, or the four process colors.", why: "Mono halftone is pop-art shading; CMYK reproduces the full image like a magazine." },
    brief: "Halftone: {label}.",
    tags: ["halftone", "cmyk"]
  }),
  p8({
    id: "media.halftone.size",
    label: "Dot size",
    type: "float",
    min: 2,
    max: 24,
    step: 0.5,
    unit: "px@1080p",
    default: 7,
    enabledBy: "media.halftone.enabled",
    learn: { what: "Distance between dot centers, in pixels at 1080p.", why: "Big dots are bold and graphic; small dots read as fine print." },
    brief: "Halftone cells {value} px at 1080p.",
    tags: ["halftone"]
  }),
  p8({
    id: "media.halftone.angle",
    label: "Screen angle",
    type: "angle",
    min: -90,
    max: 90,
    step: 1,
    unit: "°",
    default: 45,
    enabledBy: "media.halftone.enabled",
    learn: { what: "Rotation of the dot grid. In CMYK the other inks use their classic offsets from it (15°, 75°, 0°).", why: "45° hides the grid from the eye best, which is why black ink traditionally uses it." },
    brief: "Screen angle {value}°.",
    tags: ["halftone"]
  }),
  p8({
    id: "media.halftone.shadows",
    label: "Dots in shadows only",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0,
    enabledBy: "media.halftone.enabled",
    learn: { what: "0 prints dots everywhere; higher values keep the light tones clean and only screen the shadows.", why: "Comic colorists often screen only the shadows, so the lit shapes stay flat and bright." },
    brief: "Dots limited to shadows (amount {value}).",
    tags: ["halftone", "comic"]
  }),
  p8({
    id: "media.halftone.amount",
    label: "Halftone amount",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "media.halftone.enabled",
    learn: { what: "Blends between the image and its halftone version.", why: "A partial halftone keeps the colors while adding the print texture." },
    brief: "Halftone at {value}.",
    tags: ["halftone"]
  }),
  p8({
    id: "media.halftone.ink",
    label: "Dot ink",
    type: "color",
    default: "#15131c",
    enabledBy: "media.halftone.enabled",
    learn: { what: "The ink color of mono halftone.", why: "A dark blue or brown ink is softer than black and still reads as print." },
    brief: "Halftone ink {value}.",
    tags: ["halftone", "color"]
  }),
  p8({
    id: "media.hatching.enabled",
    scope: "mask",
    label: "Hatching (post)",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Draws parallel pen lines wherever the image is dark; darker tones add more layers at other angles (cross-hatching).",
      why: "Engravers and comic inkers build tone from lines instead of gray. Hatching makes a render read as drawn.",
      avoid: "Hatching on top of halftone or painterly filters: pick one medium."
    },
    brief: "Hatching in the dark tones.",
    tags: ["hatching", "ink", "sketch", "media"]
  }),
  p8({
    id: "media.hatching.layers",
    label: "Hatch layers",
    type: "int",
    min: 1,
    max: 4,
    step: 1,
    default: 3,
    enabledBy: "media.hatching.enabled",
    learn: { what: "How many crossing layers the darkest tones get.", why: "One layer is light shading; three or four is dense engraving." },
    brief: "Up to {value} hatch layers.",
    tags: ["hatching"]
  }),
  p8({
    id: "media.hatching.spacing",
    label: "Line spacing",
    type: "float",
    min: 2,
    max: 24,
    step: 0.5,
    unit: "px@1080p",
    default: 6,
    enabledBy: "media.hatching.enabled",
    learn: { what: "Distance between hatch lines, in pixels at 1080p.", why: "Tight lines read as fine pen work, wide ones as bold marker." },
    brief: "Hatch spacing {value} px at 1080p.",
    tags: ["hatching"]
  }),
  p8({
    id: "media.hatching.angle",
    label: "Hatch angle",
    type: "angle",
    min: -90,
    max: 90,
    step: 1,
    unit: "°",
    default: 45,
    enabledBy: "media.hatching.enabled",
    learn: { what: "Angle of the first layer; the next layers cross it.", why: "Right-handed artists naturally hatch at about 45°, bottom-left to top-right." },
    brief: "First hatch layer at {value}°.",
    tags: ["hatching"]
  }),
  p8({
    id: "media.hatching.threshold",
    label: "Hatch threshold",
    type: "float",
    min: 0.05,
    max: 1,
    step: 0.01,
    default: 0.55,
    enabledBy: "media.hatching.enabled",
    learn: { what: "Brightness below which the first layer of lines appears.", why: "A low threshold keeps hatching in the deep shadows; a high one hatches most of the image." },
    brief: "Hatching below brightness {value}.",
    tags: ["hatching"]
  }),
  p8({
    id: "media.hatching.amount",
    label: "Hatch strength",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.85,
    neutral: 0,
    enabledBy: "media.hatching.enabled",
    learn: { what: "How dark the hatch lines are.", why: "Light hatching adds texture; full strength draws solid ink lines." },
    brief: "Hatch strength {value}.",
    tags: ["hatching"]
  }),
  p8({
    id: "media.hatching.color",
    label: "Hatch ink",
    type: "color",
    default: "#1d1a24",
    enabledBy: "media.hatching.enabled",
    learn: { what: "The color of the hatch lines.", why: "Graphite gray reads as pencil; near-black as ink." },
    brief: "Hatch ink {value}.",
    tags: ["hatching", "color"]
  }),
  p8({
    id: "media.misregistration.enabled",
    label: "Print misregistration",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Offsets the color plates slightly, as when a printing press is out of alignment.",
      why: "Cheap comics and screen prints are never perfectly aligned; the colored fringes sell the printed look."
    },
    brief: "CMYK plate misregistration.",
    tags: ["print", "comic", "media"]
  }),
  p8({
    id: "media.misregistration.offset",
    label: "Plate offset",
    type: "float",
    min: 0,
    max: 8,
    step: 0.1,
    unit: "px@1080p",
    default: 1.2,
    neutral: 0,
    enabledBy: "media.misregistration.enabled",
    learn: { what: "How far the plates are out of alignment.", why: "1–2 px is believable; more is a deliberate pop-art statement." },
    brief: "Plates offset {value} px at 1080p.",
    tags: ["print"]
  }),
  p8({
    id: "media.misregistration.angle",
    label: "Offset direction",
    type: "angle",
    min: -180,
    max: 180,
    step: 1,
    unit: "°",
    default: 30,
    enabledBy: "media.misregistration.enabled",
    learn: { what: "Direction of the offset.", why: "Diagonal offsets show on both horizontal and vertical edges." },
    brief: "Offset at {value}°.",
    tags: ["print"]
  }),
  p8({
    id: "media.paper.enabled",
    scope: "mask",
    label: "Paper",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Prints the image onto a paper or canvas texture: the color is multiplied by the paper, so ink and paint take on its grain.",
      why: "A medium needs a surface. Paper texture turns a clean digital image into an object, and ties lines and paint together."
    },
    brief: "Paper texture under the image.",
    tags: ["paper", "texture", "media"]
  }),
  p8({
    id: "media.paper.type",
    label: "Paper type",
    type: "enum",
    default: "newsprint",
    enabledBy: "media.paper.enabled",
    options: [{ value: "newsprint", label: "Newsprint" }, { value: "watercolor", label: "Watercolor (cold press)" }, { value: "canvas", label: "Canvas" }, { value: "kraft", label: "Kraft" }],
    learn: { what: "Which surface: smooth newsprint fibers, bumpy cold-press, woven canvas, or brown kraft.", why: "Each medium belongs to its surface: comics to newsprint, washes to cold-press, oils to canvas." },
    brief: "Paper: {label}.",
    tags: ["paper"]
  }),
  p8({
    id: "media.paper.color",
    label: "Paper color",
    type: "color",
    default: "#f3ead3",
    enabledBy: "media.paper.enabled",
    learn: { what: "The paper tint the image is printed on.", why: "Off-white paper warms every color slightly and lifts the blacks, like real print." },
    brief: "Paper color {value}.",
    tags: ["paper", "color"]
  }),
  p8({
    id: "media.paper.strength",
    label: "Paper strength",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.4,
    neutral: 0,
    enabledBy: "media.paper.enabled",
    learn: { what: "How visible the paper texture and tint are.", why: "Subtle paper adds tactility without fighting the image." },
    brief: "Paper strength {value}.",
    tags: ["paper"]
  }),
  p8({
    id: "media.paper.scale",
    label: "Paper grain size",
    type: "float",
    min: 0.25,
    max: 4,
    step: 0.05,
    unit: "×",
    default: 1,
    enabledBy: "media.paper.enabled",
    learn: { what: "Size of the paper grain.", why: "Match it to the medium: fine for pen, coarse for paint." },
    brief: "Paper grain ×{value}.",
    tags: ["paper"]
  }),
  // P2 (M10): sharpen.
  p8({
    id: "media.sharpen.enabled",
    label: "Sharpen",
    type: "bool",
    default: false,
    structural: true,
    cost: { ...CHEAP, fpe: 0.4 },
    learn: {
      what: "An unsharp mask: it subtracts a blurred copy of the image, so edges and fine texture stand out.",
      why: "A touch of sharpening restores the crispness that anti-aliasing, upscaling or a lower render scale take away; a lot of it gives a crunchy, illustrated edge.",
      avoid: "High amounts with grain or dither (it sharpens the noise too), and the bright halos it draws along high-contrast edges."
    },
    brief: "Unsharp-mask sharpening.",
    tags: ["sharpen", "media", "detail"]
  }),
  p8({
    id: "media.sharpen.amount",
    label: "Sharpen amount",
    type: "float",
    min: 0,
    max: 2,
    step: 0.01,
    default: 0.5,
    neutral: 0,
    enabledBy: "media.sharpen.enabled",
    learn: { what: "How much of the detail (image minus blur) is added back.", why: "Small amounts recover lost crispness; above 1 it becomes a visible style.", typical: "0.3–0.8." },
    brief: "Sharpen amount {value}.",
    tags: ["sharpen"]
  }),
  p8({
    id: "media.sharpen.radius",
    label: "Sharpen radius",
    type: "float",
    min: 0.5,
    max: 3,
    step: 0.05,
    unit: "px@1080p",
    default: 1,
    enabledBy: "media.sharpen.enabled",
    learn: { what: "The size of the blur the detail is measured against, in pixels at 1080p.", why: "A small radius sharpens fine texture; a larger one boosts local contrast around shapes." },
    brief: "Sharpen radius {value} px at 1080p.",
    tags: ["sharpen"]
  })
];

// src/runtime/registry/retro.js
var p9 = (e) => param("retro", e);
var retro_default = [
  p9({
    id: "retro.pixel.enabled",
    label: "Pixelation",
    type: "bool",
    default: false,
    structural: true,
    requires: ["depth", "normal"],
    cost: { ...CHEAP, fpe: 0.05 },
    learn: {
      what: "Renders the styled scene at a low internal resolution and shows it with hard, square pixels. The pixels stay locked to a grid while the camera moves.",
      why: "Big pixels turn simple 3D into pixel art: the eye fills in the detail, and every shape reads at a glance. It also saves most of the GPU cost.",
      avoid: "Mixing it with modern blur (depth of field, motion blur): pick one era."
    },
    brief: "Low internal resolution with nearest-neighbor pixels, grid-locked.",
    tags: ["retro", "pixel art", "resolution", "phone-safe"]
  }),
  p9({
    id: "retro.pixel.height",
    label: "Pixel rows",
    type: "int",
    min: 64,
    max: 540,
    step: 1,
    unit: "px",
    default: 240,
    enabledBy: "retro.pixel.enabled",
    learn: {
      what: "How many pixel rows fill the screen height. Pixels are whole screen pixels wide, so the real count rounds to fit your screen.",
      why: "Era matters: 144 rows is a handheld, 224–240 is a 16-bit or 32-bit console, 360 is a modern pixel-art game.",
      typical: "240 (PS1), 224–270 (16-bit), 144 (Game Boy)."
    },
    brief: "About {value} pixel rows on screen (pixel size = output height / {value}, rounded).",
    tags: ["pixel art", "resolution"]
  }),
  p9({
    id: "retro.pixel.edges",
    label: "Pixel edge highlights",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.35,
    neutral: 0,
    enabledBy: "retro.pixel.enabled",
    learn: {
      what: "Lightens pixels on outer edges and darkens pixels at depth steps, one pixel wide.",
      why: "Pixel artists outline and highlight shapes by hand so they read at tiny sizes. Edge highlights do it from the depth and normals."
    },
    brief: "One-pixel edge highlights at {value}.",
    tags: ["pixel art", "edges"]
  }),
  p9({
    id: "retro.quantize.mode",
    label: "Color depth",
    type: "enum",
    default: "off",
    structural: true,
    cost: { ...MEDIUM, fpe: 0.3 },
    options: [{ value: "off", label: "Full color" }, { value: "posterize", label: "Posterize (levels per channel)" }, { value: "palette", label: "Palette (nearest color)" }],
    learn: {
      what: "Limits the final image to a few levels per channel, or to the nearest colors of a fixed palette (matched in OKLab, so the nearest color is the one that looks closest).",
      why: "Old hardware could show only a few colors at once. A small palette is also the most direct way to force a coherent look."
    },
    brief: "Color depth: {label}.",
    tags: ["retro", "posterize", "palette", "quantize"]
  }),
  p9({
    id: "retro.quantize.levels",
    label: "Levels per channel",
    type: "int",
    min: 2,
    max: 32,
    step: 1,
    default: 8,
    learn: { what: "Levels per color channel when posterizing. 32 is 15-bit color (PS1), 16 is 12-bit, 4–6 is posterized art.", why: "Fewer levels make banding a deliberate style, especially with dithering between the bands." },
    brief: "{value} levels per channel.",
    tags: ["posterize"]
  }),
  p9({
    id: "retro.quantize.palette",
    label: "Palette",
    type: "enum",
    default: "pico8",
    options: [
      { value: "pico8", label: "PICO-8 (16)" },
      { value: "gameboy", label: "Game Boy (4 greens)" },
      { value: "cga", label: "CGA (4)" },
      { value: "nes", label: "NES-like (16)" },
      { value: "onebit", label: "1-bit (2 inks)" },
      { value: "look", label: "The look's palette" }
    ],
    learn: { what: "The colors the palette mode snaps to.", why: `Famous palettes are instantly recognizable; "the look's palette" reuses the palette module's colors for the whole image.` },
    brief: "Palette: {label}.",
    tags: ["palette", "retro"]
  }),
  p9({
    id: "retro.dither.amount",
    label: "Dithering",
    type: "float",
    min: 0,
    max: 1.5,
    step: 0.01,
    default: 0.6,
    neutral: 0,
    learn: {
      what: "Adds an ordered pattern before quantizing, so in-between colors become a checker of the two nearest ones.",
      why: "Dithering fakes more colors than the palette has and turns banding into texture. It is the signature of 8- and 16-bit art and of 1-bit games."
    },
    brief: "Ordered dithering at {value}.",
    tags: ["dither", "retro"]
  }),
  p9({
    id: "retro.dither.pattern",
    label: "Dither pattern",
    type: "enum",
    default: "bayer4",
    options: [{ value: "bayer2", label: "Bayer 2×2" }, { value: "bayer4", label: "Bayer 4×4" }, { value: "bayer8", label: "Bayer 8×8" }, { value: "bayer16", label: "Bayer 16×16" }, { value: "noise", label: "Blue-ish noise (interleaved gradient)" }],
    learn: { what: "The pattern used to dither.", why: "Bayer gives the classic cross-hatched grid; noise looks organic and hides the grid." },
    brief: "Dither pattern: {label}.",
    tags: ["dither"]
  }),
  p9({
    id: "retro.vertexSnap.enabled",
    label: "Vertex snapping",
    type: "bool",
    default: false,
    structural: true,
    scope: "both",
    learn: {
      what: "Snaps every vertex to a coarse screen grid, so polygons jitter and wobble as they move: the PS1 look.",
      why: "Fifth-generation consoles had no sub-pixel precision. The jitter is nostalgic and makes 3D feel hand-made and unstable in a charming way.",
      avoid: "Combining it with modern smooth effects (DOF, motion blur)."
    },
    brief: "Vertices snapped to a coarse screen grid (PS1 jitter).",
    tags: ["retro", "ps1", "jitter"]
  }),
  p9({
    id: "retro.vertexSnap.grid",
    label: "Snap grid rows",
    type: "int",
    min: 40,
    max: 480,
    step: 1,
    default: 120,
    scope: "both",
    enabledBy: "retro.vertexSnap.enabled",
    learn: { what: "How many grid rows the screen height is divided into for snapping.", why: "Coarser grids jitter more. 120 rows matches the PS1's typical precision at 240p." },
    brief: "Snap grid of {value} rows.",
    tags: ["ps1"]
  }),
  p9({
    id: "retro.crt.enabled",
    label: "CRT",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Simulates a tube TV: scanlines, an RGB shadow mask, a curved screen, glow and a little flicker.",
      why: "Pixel art was designed for CRTs, which blur and bloom pixels into softer shapes. The simulation brings back that warmth and the arcade context."
    },
    brief: "CRT display simulation.",
    tags: ["retro", "crt", "arcade", "display"]
  }),
  p9({
    id: "retro.crt.scanlines",
    label: "Scanlines",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.35,
    neutral: 0,
    enabledBy: "retro.crt.enabled",
    learn: { what: "Dark gaps between rows, one per pixel row in pixel looks.", why: "Scanlines are the most recognizable CRT trait." },
    brief: "Scanlines {value}.",
    tags: ["crt"]
  }),
  p9({
    id: "retro.crt.mask",
    label: "Shadow mask",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.2,
    neutral: 0,
    enabledBy: "retro.crt.enabled",
    learn: { what: "The red, green and blue stripes of the tube's phosphors.", why: "Visible up close, it adds texture; keep it low at small sizes or it turns into moiré." },
    brief: "Aperture mask {value}.",
    tags: ["crt"]
  }),
  p9({
    id: "retro.crt.curvature",
    label: "Screen curvature",
    type: "float",
    min: 0,
    max: 0.3,
    step: 5e-3,
    default: 0.06,
    neutral: 0,
    enabledBy: "retro.crt.enabled",
    learn: { what: "Bulges the image like a curved glass tube, with dark rounded corners.", why: "Curvature frames the image as an object, a TV in a room." },
    brief: "Curvature {value}.",
    tags: ["crt"]
  }),
  p9({
    id: "retro.crt.glow",
    label: "Phosphor glow",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.2,
    neutral: 0,
    enabledBy: "retro.crt.enabled",
    learn: { what: "Bright pixels bleed light into their neighbors.", why: "The glow softens hard pixel edges the way a real tube did." },
    brief: "Phosphor glow {value}.",
    tags: ["crt"]
  }),
  p9({
    id: "retro.crt.flicker",
    label: "Flicker",
    type: "float",
    min: 0,
    max: 0.2,
    step: 5e-3,
    default: 0.02,
    neutral: 0,
    enabledBy: "retro.crt.enabled",
    learn: { what: "A subtle brightness flicker over time.", why: "A touch of instability sells the hardware. Keep it low: strong flicker is uncomfortable and an accessibility problem." },
    brief: "Flicker {value}.",
    tags: ["crt", "motion"]
  }),
  // P2 (M10): VHS, texture filtering emulation, affine texture warp.
  p9({
    id: "retro.vhs.enabled",
    label: "VHS",
    type: "bool",
    default: false,
    structural: true,
    cost: { ...MEDIUM, fpe: 0.8 },
    learn: {
      what: "Imitates a worn videotape: color bleeds sideways, the picture shakes and tears where the tracking slips, and bands of noise roll through.",
      why: "VHS is the texture of home video in the 80s and 90s: found footage, analog horror, retrowave. Its flaws date an image as surely as a palette does.",
      avoid: "Strong tracking jitter during gameplay: it moves the whole image under the player."
    },
    brief: "VHS tape simulation.",
    tags: ["retro", "vhs", "analog", "horror", "display"]
  }),
  p9({
    id: "retro.vhs.bleed",
    label: "Chroma bleed",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
    neutral: 0,
    enabledBy: "retro.vhs.enabled",
    learn: { what: "How far color smears sideways from the edges. Tape stores color at a fraction of the brightness resolution.", why: "Smeared color with sharp brightness is the single most recognizable VHS trait." },
    brief: "Chroma bleed {value}.",
    tags: ["vhs"]
  }),
  p9({
    id: "retro.vhs.noise",
    label: "Tape noise",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
    neutral: 0,
    enabledBy: "retro.vhs.enabled",
    learn: { what: "Snow and a rolling band of noise.", why: "Noise says the tape has been played many times." },
    brief: "Tape noise {value}.",
    tags: ["vhs"]
  }),
  p9({
    id: "retro.vhs.jitter",
    label: "Tracking jitter",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
    neutral: 0,
    enabledBy: "retro.vhs.enabled",
    learn: { what: "Rows of the picture slip sideways, most in a tear near the bottom of the frame.", why: "Tracking errors make the image feel physical and fragile." },
    brief: "Tracking jitter {value}.",
    tags: ["vhs"]
  }),
  p9({
    id: "retro.texture.filter",
    scope: "both",
    label: "Texture filtering",
    type: "enum",
    default: "bilinear",
    structural: true,
    options: [
      { value: "bilinear", label: "Bilinear (smooth)" },
      { value: "nearest", label: "Nearest (PS1, blocky texels)" },
      { value: "n64", label: "N64 three-point" }
    ],
    learn: {
      what: "How textures are sampled up close: smooth bilinear, blocky nearest-neighbor texels (PS1), or the N64's three-point filter, which blends only three texels and leaves faint diamond shapes.",
      why: "Texture filtering is a hardware signature: crunchy texels say PlayStation, soft wobbly blending says N64. Only textured surfaces show it (imported models, the alley's bricks and cobbles).",
      avoid: "Nearest filtering on detailed, high-resolution textures far away: they shimmer as the camera moves."
    },
    brief: "Texture filtering: {label}.",
    tags: ["retro", "ps1", "n64", "texture", "filtering"]
  }),
  p9({
    id: "retro.affine.enabled",
    scope: "both",
    label: "Affine texture warp",
    type: "bool",
    default: false,
    structural: true,
    cost: CHEAP,
    learn: {
      what: "Interpolates texture coordinates without perspective correction, like the PS1: textures bend along triangle edges and swim as the camera moves.",
      why: "The PS1 had no perspective-correct texturing, so its walls and floors warp. Together with vertex snapping it is the core of the PS1 look. Only textured surfaces show it.",
      avoid: "Big, single-triangle floors close to the camera if you want it subtle: the warp grows with the triangle size."
    },
    brief: "Affine (perspective-incorrect) texture mapping, as on the PS1.",
    tags: ["retro", "ps1", "texture", "warp"]
  }),
  p9({
    id: "retro.affine.amount",
    scope: "both",
    label: "Warp amount",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
    neutral: 0,
    enabledBy: "retro.affine.enabled",
    learn: { what: "Blends between perspective-correct (0) and fully affine (1) texture coordinates.", why: "Full warp is authentic; half keeps the wobble without making floors unreadable." },
    brief: "Affine warp {value}.",
    tags: ["ps1"]
  })
];

// src/runtime/registry/motion.js
var p10 = (e) => param("motion", e);
var motion_default = [
  p10({
    id: "motion.stepped.fps",
    scope: "both",
    label: "Animate on…",
    type: "int",
    min: 0,
    max: 30,
    step: 1,
    unit: "fps",
    default: 0,
    learn: {
      what: "Updates animation (characters, water, wind, flicker) only this many times per second. 0 is smooth. The camera always stays smooth. Per part, the hero can stay smooth while the background animates on twos.",
      why: 'Hand-drawn animation runs "on twos" (12 drawings per second). Stepped motion on a smooth camera makes 3D read as drawn, the trick behind stylized animated films.',
      typical: "12 (on twos), 8 (on threes), 0 (smooth).",
      avoid: "Stepping the player character in an action game: it costs responsiveness."
    },
    brief: "Animation stepped at {value} fps (camera smooth); 0 = continuous.",
    tags: ["motion", "animation", "on twos"]
  }),
  p10({
    id: "motion.boil.fps",
    label: "Line boil",
    type: "int",
    min: 0,
    max: 24,
    step: 1,
    unit: "fps",
    default: 0,
    learn: {
      what: 'Redraws the line wobble this many times per second, so lines "boil" like hand-drawn animation. 0 keeps the wobble still.',
      why: "In traditional animation every frame is redrawn, so lines shimmer slightly. Boil at 8–12 fps makes a still scene feel alive and drawn.",
      avoid: "High boil rates: above about 12 fps it reads as noise, not drawing."
    },
    brief: "Line boil at {value} fps (0 = static).",
    tags: ["motion", "lines", "boil", "hand-drawn"]
  }),
  // P2 (M10): low frame-rate rendering and speed lines.
  p10({
    id: "motion.lowFps.fps",
    label: "Render at…",
    type: "int",
    min: 0,
    max: 30,
    step: 1,
    unit: "fps",
    default: 0,
    learn: {
      what: "Caps how often the frame is drawn; between draws, the last frame stays on screen, camera and all. 0 draws every frame.",
      why: "A low frame rate is a style: stop-motion, choppy security cameras, an old console straining. Unlike Animate on…, it steps everything, the camera too.",
      typical: "12 for stop-motion, 15–20 for a strained console, 0 for smooth.",
      avoid: "Gameplay that needs responsive aiming, and anything below about 8 fps, which reads as lag rather than style."
    },
    brief: "Frames drawn at {value} fps (the last frame holds in between, camera included); 0 = every frame.",
    tags: ["motion", "frame rate", "stop-motion"]
  }),
  p10({
    id: "motion.speedLines.enabled",
    label: "Speed lines",
    type: "bool",
    default: false,
    structural: true,
    cost: { ...CHEAP, fpe: 0.2 },
    learn: {
      what: "Radial streaks from the edges of the frame toward a center, redrawn a few times a second, like the speed lines in manga and anime.",
      why: "Comics show speed with lines, not blur. They sell velocity and impact in toon looks, where motion blur would smear the clean shapes.",
      avoid: "Leaving them on when nothing moves: they read as tension, not speed."
    },
    brief: "Manga speed lines.",
    tags: ["motion", "speed lines", "manga", "anime", "comic"]
  }),
  p10({
    id: "motion.speedLines.amount",
    label: "Line density",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.6,
    neutral: 0,
    enabledBy: "motion.speedLines.enabled",
    learn: { what: "How many lines there are and how far in they reach.", why: "A few lines hint at motion; many lines are a burst of speed or shock.", typical: "0.4–0.8." },
    brief: "Speed-line density {value}.",
    tags: ["speed lines"]
  }),
  p10({
    id: "motion.speedLines.clear",
    label: "Clear center",
    type: "float",
    min: 0,
    max: 0.9,
    step: 0.01,
    default: 0.35,
    enabledBy: "motion.speedLines.enabled",
    learn: { what: "The radius around the center that stays free of lines (a fraction of the frame).", why: "Keep the subject clear: the lines frame it rather than cross it." },
    brief: "Lines keep {value} of the frame around the center clear.",
    tags: ["speed lines"]
  }),
  p10({
    id: "motion.speedLines.centerX",
    label: "Center (x)",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
    enabledBy: "motion.speedLines.enabled",
    learn: { what: "Where the lines converge, across the frame (0 left, 1 right).", why: "Put the center on the subject or the direction of travel." },
    brief: "Speed lines converge at x = {value}.",
    tags: ["speed lines"]
  }),
  p10({
    id: "motion.speedLines.centerY",
    label: "Center (y)",
    type: "float",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
    enabledBy: "motion.speedLines.enabled",
    learn: { what: "Where the lines converge, down the frame (0 top, 1 bottom).", why: "Chase cameras converge slightly above the middle, where the road meets the horizon." },
    brief: "Speed lines converge at y = {value}.",
    tags: ["speed lines"]
  }),
  p10({
    id: "motion.speedLines.color",
    label: "Line color",
    type: "color",
    default: "#ffffff",
    enabledBy: "motion.speedLines.enabled",
    learn: { what: "The color of the speed lines.", why: "White reads as light streaking past; black as ink on a comic page." },
    brief: "Speed lines {value}.",
    tags: ["speed lines"]
  })
];

// src/runtime/registry/quality.js
var p11 = (e) => param("quality", e);
var quality_default = [
  p11({
    id: "quality.resolution",
    label: "Internal resolution",
    type: "float",
    min: 0.25,
    max: 2,
    step: 0.05,
    unit: "×",
    default: 1,
    learn: {
      what: "Renders the styled scene at a fraction (or multiple) of the screen resolution, then scales it.",
      why: "Rendering fewer pixels is the biggest single saving on phones, and toon styles with flat color hide it well.",
      typical: "0.75 on phones, 1 on desktop."
    },
    brief: "Render at {value}× resolution.",
    tags: ["quality", "performance"]
  }),
  p11({
    id: "quality.aa",
    label: "Anti-aliasing",
    type: "enum",
    default: "auto",
    structural: true,
    cost: { ...CHEAP, fpe: 0.4 },
    options: [
      { value: "auto", label: "Auto (MSAA, or FXAA with extra buffers)" },
      { value: "none", label: "None" },
      { value: "fxaa", label: "FXAA (fast, soft)" },
      { value: "smaa", label: "SMAA (sharper edges)" },
      { value: "msaa", label: "MSAA 4× (geometry edges)" },
      { value: "traa", label: "TRAA (temporal, smoothest)" }
    ],
    learn: {
      what: "How jagged edges are smoothed. MSAA samples geometry edges while rendering; FXAA and SMAA blur edges they detect afterwards; TRAA jitters the camera and blends frames over time.",
      why: "Clean edges matter most for line-heavy styles. MSAA is cheap on phones (tile-based GPUs resolve it on chip) but can't be used with the ids buffer, so Auto switches to FXAA when lines need it. Pixel looks skip AA: their hard pixels are the point.",
      avoid: "TRAA with fast motion or retro looks: it ghosts slightly and smooths away pixel crispness."
    },
    brief: "Anti-aliasing: {label}.",
    tags: ["quality", "aa", "performance"]
  })
];

// src/runtime/registry/index.js
var MODULES = [
  { id: "lighting", label: "Lighting", stage: "WORLD + CAMERA", perPart: "ambient, blob shadows, vertex AO" },
  { id: "surface", label: "Surface", stage: "WORLD", perPart: "yes" },
  { id: "lines", label: "Lines", stage: "WORLD + MEDIUM", perPart: "hull lines" },
  { id: "palette", label: "Palette", stage: "WORLD", perPart: "yes" },
  { id: "atmosphere", label: "Atmosphere", stage: "WORLD", perPart: "fog amount" },
  { id: "lens", label: "Lens", stage: "CAMERA + DISPLAY", perPart: "no" },
  { id: "grade", label: "Grade", stage: "CAMERA + GRADE", perPart: "no" },
  { id: "media", label: "Media", stage: "MEDIUM + DISPLAY", perPart: "no" },
  { id: "retro", label: "Retro", stage: "pass + DISPLAY", perPart: "vertex snap, texture filtering, affine warp" },
  { id: "motion", label: "Motion", stage: "clock + DISPLAY", perPart: "stepped animation" },
  { id: "quality", label: "Quality", stage: "pass", perPart: "no" }
];
var PARTS = ["sky", "terrain", "water", "foliage", "architecture", "props", "characters", "hero", "vfx"];
var PART_INDEX = Object.fromEntries(PARTS.map((p12, i) => [p12, i]));
var REGISTRY = [...lighting_default, ...surface_default, ...lines_default, ...palette_default, ...atmosphere_default, ...lens_default, ...grade_default, ...media_default, ...retro_default, ...motion_default, ...quality_default];
var byId = new Map(REGISTRY.map((e) => [e.id, e]));
var PART_PARAMS = REGISTRY.filter((e) => e.scope !== "global").map((e) => e.id);
function valueLabel(entry, value) {
  if (entry.type === "enum") return entry.options.find((o) => o.value === value)?.label ?? String(value);
  if (entry.type === "bool") return value ? "on" : "off";
  if (entry.type === "palette") return value.join(", ") || "none";
  if (typeof value === "number") return String(Math.round(value * 1e3) / 1e3);
  return String(value);
}
function formatBrief(entry, value) {
  return entry.brief.replaceAll("{value}", valueLabel(entry, value)).replaceAll("{label}", valueLabel(entry, value));
}
function defaults() {
  return Object.fromEntries(REGISTRY.map((e) => [e.id, clone(e.default)]));
}
var clone = (v) => Array.isArray(v) ? [...v] : v;

// src/runtime/materials/factory.js
var LAYER_STYLED = 1;
var LAYER_PLAIN = 2;
var objectIdNode = Fn4(() => {
  const t = modelWorldMatrix.element(3).xyz;
  const h = fract3(sin3(dot4(t, vec34(12.9898, 78.233, 37.719))).mul(43758.5453));
  return floor3(h.mul(254)).add(1).div(255);
});
var idsNode = (part, interactable = false) => vec42(PART_INDEX[part] / 255, objectIdNode(), interactable ? 1 : 0, 1);
var deformKey = (s, wind = s.wind) => s.wave ? `wave:${s.wave.amplitude}/${s.wave.frequency}/${s.wave.falloff ?? 90}` : wind ? `wind:${wind.strength}/${wind.height}` : "";
var styleKey = (s) => [s.color, s.emissive, s.emissiveIntensity, s.roughness, s.metalness ?? 0, s.opacity ?? 1, deformKey(s), s.doubleSided, s.map?.uuid ?? "", s.vertexColors ? "vc" : "", s.interactable ? "use" : ""].join("|");
function paletteColor(hex, v) {
  let c = hex.toLowerCase();
  if (v["palette.remap"] > 0 && v["palette.colors"].length) c = mixHex(c, remapToPalette(c, v["palette.colors"], { keepValue: v["palette.keepValue"] }), v["palette.remap"]);
  if (v["palette.tintAmount"] > 0) c = mixHex(c, v["palette.tint"], v["palette.tintAmount"]);
  return adjustHex(c, { saturation: v["palette.saturation"], value: v["palette.value"], hue: v["palette.hue"] });
}
var structKey = (v, blobs) => [
  v["surface.model"],
  v["surface.model"] === "pbr" ? 0 : v["surface.bands"],
  v["surface.flatNormals"] ? "flat" : "",
  v["surface.model"] === "matcap" ? v["surface.matcap.preset"] : "",
  v["retro.vertexSnap.enabled"] ? "snap" : "",
  v["retro.texture.filter"] === "bilinear" ? "" : v["retro.texture.filter"],
  v["retro.affine.enabled"] ? "affine" : "",
  v["lighting.vertexAo.enabled"] ? "vao" : "",
  v["surface.halftone.enabled"] ? `dots-${v["surface.halftone.space"]}` : "",
  v["surface.hatching.enabled"] ? `hatch-${v["surface.hatching.space"]}` : "",
  v["surface.dither.enabled"] ? "dither" : "",
  v["surface.variation.enabled"] ? `var-${v["surface.variation.space"]}` : "",
  v["surface.gradient.enabled"] ? "grad" : "",
  v["surface.wind.enabled"] ? "wind" : "",
  blobs ? "blob" : ""
].join("|");
var SURFACE_UNIFORMS = {
  "surface.threshold": "threshold",
  "surface.softness": "softness",
  "surface.shadowTintStrength": "tintStrength",
  "surface.spec.intensity": "specIntensity",
  "surface.spec.size": "specSize",
  "surface.spec.softness": "specSoftness",
  "surface.rim.intensity": "rimIntensity",
  "surface.rim.width": "rimWidth",
  "surface.rim.softness": "rimSoftness",
  "surface.halftone.size": "halftoneSize",
  "surface.halftone.angle": "halftoneAngle",
  "surface.halftone.threshold": "halftoneThreshold",
  "surface.halftone.amount": "halftoneAmount",
  "surface.hatching.spacing": "hatchSpacing",
  "surface.hatching.angle": "hatchAngle",
  "surface.hatching.layers": "hatchLayers",
  "surface.hatching.threshold": "hatchThreshold",
  "surface.hatching.amount": "hatchAmount",
  "surface.variation.amount": "variationAmount",
  "surface.variation.scale": "variationScale",
  "surface.variation.hue": "variationHue",
  "surface.gradient.amount": "gradientAmount",
  "surface.gradient.height": "gradientHeight",
  "surface.water.depth": "waterDepth",
  "surface.water.bands": "waterBands",
  "surface.water.foam": "waterFoam",
  "surface.water.pattern": "waterPattern",
  "surface.wind.strength": "windStrength",
  "surface.wind.speed": "windSpeed",
  "surface.wind.gusts": "windGusts",
  "surface.gooch.strength": "goochStrength",
  "retro.affine.amount": "affineAmount",
  "lighting.vertexAo.strength": "vertexAoStrength",
  "atmosphere.fog.partAmount": "fogAmount"
};
var SURFACE_COLORS = {
  "surface.shadowTint": "shadowTint",
  "surface.rim.color": "rimColor",
  "surface.halftone.color": "halftoneColor",
  "surface.hatching.color": "hatchColor",
  "surface.water.shallow": "waterShallow",
  "surface.water.deep": "waterDeep",
  "surface.water.foamColor": "waterFoamColor",
  "surface.gooch.cool": "goochCool",
  "surface.gooch.warm": "goochWarm"
};
function retroMapSample(map, { filter, affine, amount }) {
  let coord = uv2();
  if (affine) {
    const w = modelViewProjection.w;
    coord = mix6(coord, varying(uv2().mul(w)).div(varying(w)), amount);
  }
  if (filter === "bilinear") return texture(map, coord);
  const size = vec23(map.image?.width || 1, map.image?.height || 1);
  const at = (texel) => texture(map, texel.add(0.5).div(size)).level(0);
  if (filter === "nearest") return at(floor3(coord.mul(size)));
  return Fn4(() => {
    const p12 = coord.mul(size).sub(0.5);
    const f = fract3(p12).toVar(), base = floor3(p12).toVar();
    const A = at(base), B = at(base.add(vec23(1, 0))), C = at(base.add(vec23(0, 1))), D = at(base.add(vec23(1, 1)));
    const lower = A.add(B.sub(A).mul(f.x)).add(C.sub(A).mul(f.y));
    const upper = D.add(C.sub(D).mul(f.x.oneMinus())).add(B.sub(D).mul(f.y.oneMinus()));
    return select4(f.x.add(f.y).lessThanEqual(1), lower, upper);
  })();
}
var StyleMaterials = class {
  /**
   * @param {object} o
   * @param {Node} o.time - seconds uniform (freezable by the host)
   * @param {Node} o.keyDirection - world-space direction toward the key light
   */
  constructor({ time, keyDirection }) {
    this.time = time;
    this.keyDirection = keyDirection;
    this.parts = Object.fromEntries(PARTS.map((p12) => [p12, {
      surface: createSurfaceUniforms(),
      hullColor: uniform4(new THREE4.Color("#1b1d2a")),
      hullThickness: uniform4(1.5),
      hullEnabled: false,
      snapRows: uniform4(120),
      struct: null,
      values: null
    }]));
    this.styled = /* @__PURE__ */ new Map();
    this.plain = /* @__PURE__ */ new Map();
    this.hulls = /* @__PURE__ */ new Map();
    this.entries = [];
    this.blobs = new BlobShadows();
    this.built = 0;
  }
  waveNode(wave, time = this.time) {
    if (!wave) return null;
    const { amplitude, frequency, falloff = 90 } = wave;
    const t = time;
    const fade = smoothstep5(falloff, falloff * 0.4, positionLocal.xz.length());
    const y = sin3(positionLocal.x.mul(frequency).add(t)).mul(cos3(positionLocal.z.mul(frequency * 0.8).add(t.mul(0.7)))).mul(amplitude).mul(fade);
    return positionLocal.add(vec34(0, y, 0));
  }
  /**
   * Grass and foliage sway: offset grows with height above the mesh origin. With a part's
   * uniforms (`u`), the look scales strength and speed and adds gusts; the plain twin
   * passes none and keeps the scene's own motion.
   */
  windNode(wind, u = null) {
    const { strength = 0.12, height = 0.5 } = wind;
    const t = u ? u.time.mul(u.windSpeed) : this.time;
    const h = positionLocal.y.div(height).clamp(0, 1.5).pow(2);
    const origin = modelWorldMatrix.element(3).xz;
    const phase = positionLocal.x.mul(0.35).add(positionLocal.z.mul(0.2)).add(origin.x.mul(0.13)).add(origin.y.mul(0.07));
    let sway = sin3(t.mul(1.7).add(phase)).add(sin3(t.mul(3.1).add(positionLocal.x.mul(0.9))).mul(0.3)).mul(strength);
    if (u) sway = sway.mul(u.windStrength).mul(sin3(t.mul(0.45).add(origin.x.mul(0.06)).add(origin.y.mul(0.04))).mul(u.windGusts).add(1));
    return positionLocal.add(vec34(sway, 0, sway.mul(0.6)).mul(h));
  }
  /** Waves and wind; with a part's uniforms (`u`), on the part's own (stepped) clock. */
  deformNode(style, wind = style.wind, u = null) {
    return style.wave ? this.waveNode(style.wave, u ? u.time : this.time) : wind ? this.windNode(wind, u) : null;
  }
  /** Wind for a mesh of a part with Wind sway on: the kit's own, or a gentle sway scaled to the mesh. */
  effectiveWind(entry) {
    if (entry.style.wind) return entry.style.wind;
    if (!this.parts[entry.part].values["surface.wind.enabled"] || entry.style.wave) return null;
    const g = entry.mesh.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    const height = Math.max(0.3, g.boundingBox.max.y);
    return { strength: Math.min(0.25, 0.03 * height), height };
  }
  /** Toon water's base color: banded depth color, shore foam and drifting foam lines. */
  waterColorNode(u) {
    return Fn4(() => {
      const sceneZ = perspectiveDepthToViewZ(viewportDepthTexture().r, cameraNear, cameraFar);
      const depth = positionView.z.sub(sceneZ).max(0);
      const t = depth.div(u.waterDepth).clamp(0, 1).toVar();
      const banded = floor3(t.mul(u.waterBands).add(0.5)).div(u.waterBands.max(1));
      const k = mix6(t, banded, step5(0.5, u.waterBands));
      const base = mix6(u.waterShallow, u.waterDeep, k);
      const foam = smoothstep5(u.waterFoam.mul(0.7), u.waterFoam, depth).oneMinus().mul(step5(1e-3, u.waterFoam));
      const cells2 = mx_worley_noise_float(vec34(positionWorld3.xz.mul(0.22), u.time.mul(0.15)));
      const lines = smoothstep5(0.62, 0.7, cells2).mul(u.waterPattern);
      return mix6(base, u.waterFoamColor, foam.max(lines));
    })();
  }
  /**
   * The styled base color: material (or toon water; a retro-sampled map) → color variation
   * → vertical gradient → baked vertex AO → blob shadows.
   */
  colorNode(v, u, blobs, map = null, material = null) {
    const water = v["surface.model"] === "toonWater";
    const variation = v["surface.variation.enabled"], gradient = v["surface.gradient.enabled"];
    const retroMap = map && (v["retro.texture.filter"] !== "bilinear" || v["retro.affine.enabled"]);
    const vao = v["lighting.vertexAo.enabled"];
    if (!water && !variation && !gradient && !blobs && !retroMap && !vao) return null;
    const texel = retroMap ? retroMapSample(map, { filter: v["retro.texture.filter"], affine: v["retro.affine.enabled"], amount: u.affineAmount }) : null;
    const base = retroMap ? materialReference("color", "color", material).mul(texel.rgb) : materialColor.rgb;
    const alpha = retroMap ? materialReference("opacity", "float", material).mul(texel.a) : materialColor.a;
    let c = water ? this.waterColorNode(u) : base;
    if (variation) {
      const p12 = v["surface.variation.space"] === "object" ? positionLocal : positionWorld3;
      const n = mx_noise_float(p12.mul(u.variationScale)).mul(2).clamp(-1, 1);
      const amount = u.variationAmount.mul(n);
      c = hue(c.mul(amount.mul(u.variationHue.oneMinus()).add(1)), amount.mul(u.variationHue).mul(2.5));
    }
    if (gradient) {
      const h = positionWorld3.y.sub(modelWorldMatrix.element(3).y).div(u.gradientHeight).clamp(0, 1);
      c = c.mul(mix6(u.gradientAmount.oneMinus(), u.gradientAmount.mul(0.35).add(1), h));
    }
    if (vao) c = c.mul(mix6(1, attribute("stylelabAo", "float"), u.vertexAoStrength));
    if (blobs) c = c.mul(float4(1).sub(this.blobs.shade()));
    return vec42(c, alpha);
  }
  /** Settings shared by the styled and plain twins of a mesh. */
  common(material, style) {
    material.side = style.doubleSided ? THREE4.DoubleSide : THREE4.FrontSide;
    if (style.emissive) {
      material.emissive = new THREE4.Color(style.emissive);
      material.emissiveIntensity = style.emissiveIntensity;
    }
    material.positionNode = this.deformNode(style);
    if ((style.opacity ?? 1) < 1) {
      material.transparent = true;
      material.opacity = style.opacity;
      material.depthWrite = false;
    }
    if (style.map) material.map = style.map;
    if (style.vertexColors) material.vertexColors = true;
  }
  /**
   * Bakes vertex AO into the entry's geometry when its part needs it (once per geometry).
   * The ground plane is where the mesh's asset stands: the origin of its top-level group
   * under the scene root, or that group's `userData.groundY` (world height; imports set 0).
   * Meshes directly under the root (terrain, floors, the sea) are the ground: no plane.
   */
  prepareVertexAo(entry) {
    const mesh = entry.mesh;
    if (!this.parts[entry.part].values["lighting.vertexAo.enabled"] || mesh.geometry.getAttribute("stylelabAo")) return;
    let asset = mesh;
    while (asset.parent && asset.parent !== this.sceneRoot && asset.parent.parent) asset = asset.parent;
    const isGround = asset === mesh && mesh.parent === this.sceneRoot;
    asset.updateWorldMatrix(true, true);
    const toAsset = new THREE4.Matrix4().copy(asset.matrixWorld).invert().multiply(mesh.matrixWorld);
    const origin = new THREE4.Vector3().setFromMatrixPosition(asset.matrixWorld);
    const groundY = asset.userData.groundY ?? origin.y;
    const ground = isGround ? null : asset.worldToLocal(new THREE4.Vector3(origin.x, groundY, origin.z)).y;
    const scale = new THREE4.Vector3().setFromMatrixScale(asset.matrixWorld).y || 1;
    bakeVertexAo(mesh.geometry, { matrix: toAsset, ground, radius: 1.2 / scale });
  }
  /** The styled material of a mesh entry ({ mesh, style, part }), cached by part structure and style. */
  styledMaterial(entry) {
    const { style, part } = entry;
    const pv = this.parts[part];
    this.prepareVertexAo(entry);
    const wind = this.effectiveWind(entry);
    const key = `${part}|${pv.struct}|${styleKey(style)}|${deformKey(style, wind)}`;
    let material = this.styled.get(key);
    if (material) return material;
    const v = pv.values;
    const patterns = {
      halftone: v["surface.halftone.enabled"] ? v["surface.halftone.space"] : null,
      hatching: v["surface.hatching.enabled"] ? v["surface.hatching.space"] : null,
      dither: v["surface.dither.enabled"]
    };
    const surface = { model: v["surface.model"], bands: v["surface.bands"], uniforms: pv.surface, patterns };
    if (surface.model === "pbr") material = new StyleStandardMaterial(surface, this.keyDirection, { roughness: style.roughness, metalness: style.metalness ?? 0 });
    else if (surface.model === "matcap") {
      material = new THREE4.MeshMatcapNodeMaterial({ matcap: matcapTexture(v["surface.matcap.preset"]) });
      material.isStyleSurfaceMaterial = true;
      material.surface = surface;
    } else material = new StyleSurfaceMaterial(surface);
    material.name = `style:${part}:${surface.model}`;
    material.flatShading = v["surface.flatNormals"];
    this.common(material, style);
    material.positionNode = this.deformNode(style, wind, pv.surface);
    if (v["retro.vertexSnap.enabled"]) material.vertexNode = snapClip(TSL, modelViewProjection, pv.snapRows);
    material.colorNode = this.colorNode(v, pv.surface, pv.struct.endsWith("blob"), style.map, material);
    if (style.map && (v["retro.texture.filter"] !== "bilinear" || v["retro.affine.enabled"])) material.map = null;
    if (surface.model === "toonWater") {
      material.transparent = true;
      material.depthWrite = true;
    }
    material.mrtNode = mrt({ output, ids: idsNode(part, style.interactable) });
    material.userData = { sourceColor: style.color, part, key };
    material.color.set(paletteColor(style.color, v));
    this.styled.set(key, material);
    this.built++;
    return material;
  }
  plainMaterial(style) {
    const key = styleKey(style);
    let material = this.plain.get(key);
    if (material) return material;
    material = new THREE4.MeshStandardNodeMaterial({ color: new THREE4.Color(style.color), roughness: style.roughness ?? 0.8, metalness: style.metalness ?? 0, fog: false });
    material.name = "plain";
    this.common(material, style);
    this.plain.set(key, material);
    return material;
  }
  hullMaterial(part) {
    const pv = this.parts[part];
    const snap = pv.values["retro.vertexSnap.enabled"];
    const key = `${part}|${snap ? "snap" : ""}`;
    let material = this.hulls.get(key);
    if (material) return material;
    material = createHullMaterial({ THREE: THREE4, TSL, color: pv.hullColor, thickness: pv.hullThickness, snapRows: snap ? pv.snapRows : null });
    material.name = `hull:${part}`;
    material.userData.part = part;
    material.mrtNode = mrt({ output, ids: idsNode(part) });
    this.hulls.set(key, material);
    this.built++;
    return material;
  }
  /** Makes `root`'s kit meshes into twins. Call after apply() has run once. */
  register(root) {
    this.sceneRoot ??= root;
    const meshes = [];
    const known = new Set(this.entries.map((e) => e.mesh));
    root.traverse((o) => {
      if (o.isMesh && o.userData.style && !known.has(o)) meshes.push(o);
    });
    for (const mesh of meshes) {
      const style = mesh.userData.style;
      const entry = { mesh, style, part: style.part, plain: null, hull: null };
      mesh.material = this.styledMaterial(entry);
      mesh.layers.set(LAYER_STYLED);
      const plain = mesh.isSkinnedMesh ? new THREE4.SkinnedMesh(mesh.geometry, this.plainMaterial(style)) : new THREE4.Mesh(mesh.geometry, this.plainMaterial(style));
      if (mesh.isSkinnedMesh) {
        plain.bindMode = mesh.bindMode;
        plain.bind(mesh.skeleton, mesh.bindMatrix);
      }
      plain.frustumCulled = mesh.frustumCulled;
      if (mesh.morphTargetInfluences) {
        plain.morphTargetInfluences = mesh.morphTargetInfluences;
        plain.morphTargetDictionary = mesh.morphTargetDictionary;
      }
      plain.name = "plain twin";
      plain.userData.stylelabTwin = true;
      plain.layers.set(LAYER_PLAIN);
      plain.castShadow = mesh.castShadow;
      plain.receiveShadow = mesh.receiveShadow;
      mesh.add(plain);
      entry.plain = plain;
      this.entries.push(entry);
      this.updateHull(entry);
    }
  }
  updateHull(entry) {
    const pv = this.parts[entry.part];
    const s = entry.style;
    const want = pv.hullEnabled && pv.hullThickness.value > 0.01 && !s.wave && !this.effectiveWind(entry) && !entry.mesh.isSkinnedMesh && (s.opacity ?? 1) >= 1;
    if (want && !entry.hull) {
      const g = entry.mesh.geometry;
      if (!g.getAttribute("outlineNormal")) computeOutlineNormals(g);
      const hull = new THREE4.Mesh(g, this.hullMaterial(entry.part));
      if (entry.mesh.morphTargetInfluences) {
        hull.morphTargetInfluences = entry.mesh.morphTargetInfluences;
        hull.morphTargetDictionary = entry.mesh.morphTargetDictionary;
      }
      hull.name = "hull";
      hull.userData.stylelabTwin = true;
      hull.layers.set(LAYER_STYLED);
      hull.castShadow = hull.receiveShadow = false;
      entry.mesh.add(hull);
      entry.hull = hull;
    }
    if (entry.hull) {
      entry.hull.visible = want;
      if (want) entry.hull.material = this.hullMaterial(entry.part);
    }
  }
  /**
   * Applies resolved per-part values. Returns the parts whose materials were rebuilt.
   * @param {object} parts - resolveLook().parts
   */
  apply(parts, globalValues) {
    const rebuilt = [];
    const blobParts = PARTS.filter((p12) => parts[p12]["lighting.blob.enabled"]);
    this.blobs.setParts(blobParts);
    const blobs = blobParts.length > 0;
    if (globalValues) {
      this.blobs.size = globalValues["lighting.blob.size"];
      this.blobs.softness.value = globalValues["lighting.blob.softness"];
      this.blobs.opacity.value = globalValues["lighting.blob.opacity"];
    }
    for (const part of PARTS) {
      const pv = this.parts[part];
      const v = parts[part];
      pv.values = v;
      const u = pv.surface;
      for (const [id, name] of Object.entries(SURFACE_UNIFORMS)) u[name].value = v[id];
      for (const [id, name] of Object.entries(SURFACE_COLORS)) u[name].value.set(v[id]);
      u.rimLitSide.value = v["surface.rim.litSide"] ? 1 : 0;
      pv.hullColor.value.set(v["lines.hull.color"]);
      pv.hullThickness.value = v["lines.hull.thickness"];
      pv.hullEnabled = v["lines.hull.enabled"];
      pv.snapRows.value = v["retro.vertexSnap.grid"];
      const key = structKey(v, blobs);
      if (pv.struct !== key) {
        if (pv.struct !== null) rebuilt.push(part);
        pv.struct = key;
      }
    }
    for (const entry of this.entries) {
      if (rebuilt.includes(entry.part)) entry.mesh.material = this.styledMaterial(entry);
      this.updateHull(entry);
    }
    for (const material of this.styled.values()) material.color.set(paletteColor(material.userData.sourceColor, this.parts[material.userData.part].values));
    if (rebuilt.length) this.disposeUnused();
    return rebuilt;
  }
  /** Moves one mesh to another part (pick tool). Returns false if it isn't registered. */
  setPart(mesh, part) {
    const entry = this.entries.find((e) => e.mesh === mesh);
    if (!entry || !this.parts[part]) return false;
    entry.part = entry.style.part = part;
    entry.mesh.material = this.styledMaterial(entry);
    if (entry.hull) {
      entry.mesh.remove(entry.hull);
      entry.hull = null;
    }
    this.updateHull(entry);
    return true;
  }
  disposeUnused() {
    const used = new Set(this.entries.map((e) => e.mesh.material));
    for (const [key, material] of this.styled) if (!used.has(material)) {
      material.dispose();
      this.styled.delete(key);
    }
  }
  /** Forgets the current scene's meshes (the caller disposes geometry). */
  clearScene() {
    this.sceneRoot = null;
    for (const e of this.entries) {
      e.mesh.remove(e.plain);
      if (e.hull) e.mesh.remove(e.hull);
    }
    this.entries = [];
    this.disposeUnused();
  }
  dispose() {
    this.clearScene();
    for (const m of [...this.styled.values(), ...this.plain.values(), ...this.hulls.values()]) m.dispose();
    this.styled.clear();
    this.plain.clear();
    this.hulls.clear();
  }
};

// src/runtime/atmosphere/atmosphere.js
import * as THREE5 from "three/webgpu";
import { Fn as Fn5, uniform as uniform5, vec2 as vec24, vec3 as vec35, float as float5, mix as mix7, smoothstep as smoothstep6, step as step6, select as select5, exp, floor as floor4, fract as fract4, fwidth as fwidth3, max as max5, abs as abs3, acos, cos as cos4, pow, clamp, positionWorld as positionWorld4, positionView as positionView2, cameraPosition, fog, mrt as mrt2, output as output2, mx_fractal_noise_float } from "three/tsl";
function createAtmosphereUniforms() {
  return {
    zenith: uniform5(new THREE5.Color("#87ceeb")),
    horizon: uniform5(new THREE5.Color("#87ceeb")),
    ground: uniform5(new THREE5.Color("#87ceeb")),
    exponent: uniform5(1),
    sunDirection: uniform5(new THREE5.Vector3(0, 1, 0)),
    sunColor: uniform5(new THREE5.Color("#ffffff")),
    sunRadius: uniform5(0),
    // radians
    sunSoftness: uniform5(0.5),
    fogType: uniform5(0),
    // 0 off · 1 linear · 2 exp · 3 exp2
    fogAmount: uniform5(1),
    fogDensity: uniform5(8e-3),
    fogStart: uniform5(10),
    fogEnd: uniform5(200),
    fogOffset: uniform5(0),
    // fog-free distance in front of the camera (far isometric shots)
    fogColor: uniform5(new THREE5.Color("#c8dcf0")),
    fogSkyTint: uniform5(1),
    fogBands: uniform5(0),
    heightDensity: uniform5(0),
    heightBase: uniform5(0),
    heightFalloff: uniform5(0.25),
    clouds: uniform5(0),
    cloudCoverage: uniform5(0.45),
    cloudSoftness: uniform5(0.06),
    cloudBands: uniform5(2),
    cloudScale: uniform5(1),
    cloudSpeed: uniform5(0.3),
    cloudColor: uniform5(new THREE5.Color("#ffffff")),
    cloudShade: uniform5(new THREE5.Color("#a9b8dc")),
    turbidity: uniform5(4),
    rayleigh: uniform5(1.5),
    time: uniform5(0)
    // the runtime shares its clock uniform here
  };
}
var FOG_TYPES = { off: 0, linear: 1, exp: 2, exp2: 3 };
function skyGradient(u, dir) {
  const up = clamp(dir.y, 0, 1).pow(u.exponent);
  const above = mix7(u.horizon, u.zenith, up);
  const below = mix7(u.horizon, u.ground, smoothstep6(0, 0.08, dir.y.negate()));
  return mix7(below, above, step6(0, dir.y));
}
function physicalSky(u, dir) {
  const pi = Math.PI;
  const up = vec35(0, 1, 0);
  const sun2 = u.sunDirection;
  const zenithCos = clamp(sun2.dot(up), -1, 1);
  const sunE = float5(1e3).mul(max5(0, float5(1).sub(exp(float5(1.6110731556870734).sub(acos(zenithCos)).div(1.5).negate()))));
  const sunfade = float5(1).sub(clamp(float5(1).sub(exp(sun2.y.mul(0.1))), 0, 1));
  const betaR = vec35(5804542996261093e-21, 13562911419845635e-21, 30265902468824876e-21).mul(u.rayleigh.sub(sunfade.oneMinus()));
  const betaM = vec35(18399918514433978e-2, 27798023919660528e-2, 40790479543861094e-2).mul(float5(0.434).mul(u.turbidity).mul(0.2).mul(1e-17)).mul(5e-3);
  const zenith = acos(max5(0, dir.dot(up)));
  const inverse = float5(1).div(cos4(zenith).add(float5(0.15).mul(pow(float5(93.885).sub(zenith.mul(180 / pi)), -1.253))));
  const Fex = exp(betaR.mul(inverse.mul(8400)).add(betaM.mul(inverse.mul(1250))).negate());
  const cosTheta = dir.dot(sun2);
  const rPhase = float5(3 / (16 * pi)).mul(pow(cosTheta.mul(0.5).add(0.5), 2).add(1));
  const g = 0.8;
  const mPhase = float5((1 - g * g) / (4 * pi)).div(pow(float5(1 + g * g).sub(cosTheta.mul(2 * g)), 1.5));
  const ratio = betaR.mul(rPhase).add(betaM.mul(mPhase)).div(betaR.add(betaM));
  const Lin = pow(sunE.mul(ratio).mul(Fex.oneMinus()), vec35(1.5)).mul(mix7(vec35(1), pow(sunE.mul(ratio).mul(Fex), vec35(0.5)), clamp(pow(float5(1).sub(up.dot(sun2)), 5), 0, 1)));
  const color = Lin.add(vec35(0.1).mul(Fex)).mul(0.04).add(vec35(0, 3e-4, 75e-5));
  return pow(color, vec35(float5(1).div(sunfade.mul(1.2).add(1.2)))).mul(0.4);
}
function skyBase(u, dir, physical = false) {
  return physical ? physicalSky(u, dir) : skyGradient(u, dir);
}
function cloudLayer(u, dir, sky) {
  const up = max5(dir.y, 0);
  const uv4 = dir.xz.div(up.add(0.3)).mul(u.cloudScale.reciprocal().mul(1.1)).add(vec24(u.time.mul(u.cloudSpeed).mul(0.01), u.time.mul(u.cloudSpeed).mul(3e-3)));
  const n = mx_fractal_noise_float(vec35(uv4, 0.5), 3).mul(1.2).add(0.5);
  const edge = u.cloudCoverage.oneMinus();
  const mask = smoothstep6(edge.sub(u.cloudSoftness), edge.add(u.cloudSoftness).add(1e-3), n);
  const toward = mx_fractal_noise_float(vec35(uv4.add(u.sunDirection.xz.normalize().mul(0.06)), 0.5), 3).mul(1.2).add(0.5);
  const lit = n.sub(toward).mul(5).add(0.65).clamp(0, 1);
  const bands = max5(u.cloudBands, 1);
  const banded = select5(u.cloudBands.greaterThan(0.5), floor4(lit.mul(bands).add(0.5)).div(bands), lit);
  const color = mix7(u.cloudShade, u.cloudColor, banded);
  const fade = smoothstep6(0, 0.08, dir.y);
  return mix7(sky, color, mask.mul(fade).mul(u.clouds));
}
function skyColor(u, dir, physical = false) {
  const angle = acos(clamp(dir.dot(u.sunDirection), -1, 1));
  const r = max5(u.sunRadius, 1e-4);
  const disc = smoothstep6(r.mul(u.sunSoftness.mul(-0.85).add(1)).sub(1e-4), r, angle).oneMinus().mul(step6(1e-4, u.sunRadius));
  const halo = exp(angle.div(r.mul(3)).negate()).mul(0.15).mul(step6(1e-4, u.sunRadius));
  return cloudLayer(u, dir, skyBase(u, dir, physical).add(u.sunColor.mul(disc.add(halo))));
}
function fogFactor(u, distance, world = null) {
  const dist2 = max5(distance.sub(u.fogOffset), 0);
  const linear2 = smoothstep6(u.fogStart, u.fogEnd, dist2);
  const e = exp(u.fogDensity.mul(dist2).negate()).oneMinus();
  const e2 = exp(u.fogDensity.mul(dist2).pow(2).negate()).oneMinus();
  let f = select5(u.fogType.equal(1), linear2, select5(u.fogType.equal(2), e, select5(u.fogType.equal(3), e2, float5(0))));
  if (world) {
    const b = u.heightFalloff;
    const dy = world.y.sub(cameraPosition.y);
    const k = b.mul(dy);
    const shape = select5(abs3(k).lessThan(1e-3), float5(1), exp(k.negate()).oneMinus().div(k));
    const optical = u.heightDensity.mul(dist2).mul(exp(b.mul(cameraPosition.y.sub(u.heightBase)).negate().min(30))).mul(shape);
    const h = exp(optical.max(0).negate()).oneMinus();
    f = f.oneMinus().mul(h.oneMinus()).oneMinus();
  }
  const x = f.mul(u.fogBands);
  const aa = max5(fwidth3(x).mul(0.75), 0.02);
  const banded = floor4(x).add(smoothstep6(aa.oneMinus().mul(0.5), aa.add(1).mul(0.5), fract4(x))).div(max5(u.fogBands, 1));
  return select5(u.fogBands.greaterThan(0.5), banded, f).mul(u.fogAmount);
}
function createFogNode(u, { physical = false, amountFor = () => null } = {}) {
  const viewDir = positionWorld4.sub(cameraPosition).normalize();
  const flat = vec35(viewDir.x, max5(viewDir.y, 0), viewDir.z).normalize();
  const color = mix7(u.fogColor, skyBase(u, flat, physical), u.fogSkyTint);
  const factor = fogFactor(u, positionView2.length(), positionWorld4);
  return fog(color, Fn5((_, builder) => {
    const amount = amountFor(builder.material);
    return amount ? factor.mul(amount) : factor;
  })());
}
function dome(material, layer) {
  const mesh = new THREE5.Mesh(new THREE5.SphereGeometry(1, 48, 24), material);
  mesh.layers.set(layer);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1e3;
  mesh.castShadow = mesh.receiveShadow = false;
  mesh.name = "sky dome";
  return mesh;
}
function createSkyDomes(u, { layerStyled, layerPlain, idsNode: idsNode2 }) {
  const styled = new THREE5.MeshBasicNodeMaterial({ side: THREE5.BackSide, depthWrite: false, fog: false });
  setSkyModel(styled, u, false);
  styled.mrtNode = mrt2({ output: output2, ids: idsNode2 });
  const plain = new THREE5.MeshBasicNodeMaterial({ side: THREE5.BackSide, depthWrite: false, fog: false, color: new THREE5.Color("#87ceeb") });
  return { styled: dome(styled, layerStyled), plain: dome(plain, layerPlain) };
}
function setSkyModel(material, u, physical) {
  material.colorNode = Fn5(() => skyColor(u, positionWorld4.sub(cameraPosition).normalize(), physical))();
  material.needsUpdate = true;
}

// src/runtime/atmosphere/particles.js
import * as THREE6 from "three/webgpu";
import { uniform as uniform6, vec2 as vec25, vec3 as vec36, vec4 as vec43, float as float6, select as select6, sin as sin4, cos as cos5, mod, abs as abs4, length as length3, smoothstep as smoothstep7, hash as hash2, instanceIndex, cameraPosition as cameraPosition2, uv as uv3, mrt as mrt3, output as output3 } from "three/tsl";
var MAX_PARTICLES = 4e3;
var PARTICLE_TYPES = ["dust", "pollen", "embers", "snow", "rain"];
var BOX = 24;
function createParticles({ time, layer }) {
  const u = { type: uniform6(0), size: uniform6(1), speed: uniform6(1), color: uniform6(new THREE6.Color("#fff3d6")) };
  const pick = (dust, pollen, embers, snow, rain) => select6(u.type.lessThan(0.5), dust, select6(u.type.lessThan(1.5), pollen, select6(u.type.lessThan(2.5), embers, select6(u.type.lessThan(3.5), snow, rain))));
  const h1 = hash2(instanceIndex), h2 = hash2(instanceIndex.add(7919)), h3 = hash2(instanceIndex.add(15737)), h4 = hash2(instanceIndex.add(31337));
  const t = time.mul(u.speed);
  const ph = h4.mul(Math.PI * 2);
  const drift = pick(
    vec36(sin4(t.mul(0.3).add(ph)).mul(0.4), sin4(t.mul(0.21).add(h1.mul(6.28))).mul(0.3), cos5(t.mul(0.27).add(h2.mul(6.28))).mul(0.4)),
    vec36(t.mul(0.6).add(sin4(t.mul(0.8).add(ph)).mul(0.5)), t.mul(-0.1).add(sin4(t.mul(1.3).add(h1.mul(6.28))).mul(0.2)), t.mul(0.2)),
    vec36(sin4(t.mul(1.7).add(ph)).mul(0.3), t.mul(h1.mul(0.8).add(0.8)), cos5(t.mul(1.3).add(h2.mul(6.28))).mul(0.3)),
    vec36(sin4(t.mul(0.9).add(ph)).mul(0.5), t.mul(h1.mul(0.4).add(0.8)).negate(), cos5(t.mul(0.7).add(h2.mul(6.28))).mul(0.5)),
    vec36(t.mul(0.5), t.mul(h1.mul(2).add(9)).negate(), 0)
  );
  const p12 = vec36(h1, h2, h3).mul(BOX).add(drift);
  const rel = mod(p12.sub(cameraPosition2).add(BOX / 2), BOX).sub(BOX / 2);
  const material = new THREE6.SpriteNodeMaterial({ transparent: true, depthWrite: false });
  material.name = "ambient particles";
  material.positionNode = cameraPosition2.add(rel);
  const s = u.size.mul(h4.add(0.5));
  material.scaleNode = pick(vec25(0.03), vec25(0.05), vec25(0.06), vec25(0.05), vec25(0.012, 0.35)).mul(s);
  material.colorNode = u.color.mul(pick(float6(1), float6(1), float6(4), float6(1), float6(0.9)));
  const q = uv3().sub(0.5);
  const dot6 = smoothstep7(0.5, 0.15, length3(q));
  const streak = smoothstep7(0.5, 0.1, abs4(q.x)).mul(smoothstep7(0.5, 0.3, abs4(q.y)));
  const shape = select6(u.type.greaterThan(3.5), streak, dot6);
  const dist2 = length3(rel);
  const fade = smoothstep7(BOX * 0.5, BOX * 0.32, dist2).mul(smoothstep7(0.2, 0.8, dist2));
  material.opacityNode = shape.mul(fade).mul(pick(float6(0.6), float6(0.8), float6(1), float6(0.9), float6(0.4)));
  material.mrtNode = mrt3({ output: output3, normal: vec43(0), ids: vec43(0), emissive: vec43(0), velocity: vec43(0) });
  const object = new THREE6.Sprite(material);
  object.name = "ambient particles";
  object.frustumCulled = false;
  object.layers.set(layer);
  object.visible = false;
  object.userData.stylelabTwin = true;
  return {
    object,
    u,
    apply(v) {
      const n = v["atmosphere.particles.enabled"] ? Math.round(v["atmosphere.particles.density"] * MAX_PARTICLES) : 0;
      object.visible = n > 0;
      object.count = Math.max(1, n);
      u.type.value = Math.max(0, PARTICLE_TYPES.indexOf(v["atmosphere.particles.type"]));
      u.size.value = v["atmosphere.particles.size"];
      u.speed.value = v["atmosphere.particles.speed"];
      u.color.value.set(v["atmosphere.particles.color"]);
    }
  };
}

// src/runtime/post/graph.js
import * as THREE10 from "three/webgpu";
import { uniform as uniform9, uniformArray as uniformArray4, texture as texture2, vec2 as vec210, vec3 as vec312, vec4 as vec47, float as float12, int as int7, mix as mix13, max as max10, smoothstep as smoothstep13, step as step11, abs as abs10, floor as floor9, round as round4, select as select9, luminance as luminance8, renderOutput as renderOutput2, screenUV as screenUV3, screenSize as screenSize4, screenCoordinate as screenCoordinate6, convertToTexture as convertToTexture2, mx_noise_float as mx_noise_float4 } from "three/tsl";

// src/runtime/post/stage-camera.js
import * as THREE7 from "three/webgpu";
import { Fn as Fn6, vec2 as vec26, vec3 as vec37, vec4 as vec44, float as float7, int as int3, mix as mix8, max as max6, smoothstep as smoothstep8, pow as pow2, abs as abs5, step as step7, Loop as Loop3, If as If2, Break, luminance as luminance3, sample, colorToDirection, sRGBTransferEOTF as sRGBTransferEOTF2, renderOutput, interleavedGradientNoise as interleavedGradientNoise2, screenCoordinate as screenCoordinate4, getViewPosition, getScreenPosition } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { dof } from "three/addons/tsl/display/DepthOfFieldNode.js";
import { gaussianBlur } from "three/addons/tsl/display/GaussianBlurNode.js";
import { motionBlur } from "three/addons/tsl/display/MotionBlur.js";
import { traa } from "three/addons/tsl/display/TRAANode.js";
import { ssgi } from "three/addons/tsl/display/SSGINode.js";
import { lensflare } from "three/addons/tsl/display/LensflareNode.js";
import { anamorphic } from "three/addons/tsl/display/AnamorphicNode.js";
var TONE_MAPPING = {
  none: THREE7.NoToneMapping,
  linear: THREE7.LinearToneMapping,
  reinhard: THREE7.ReinhardToneMapping,
  cineon: THREE7.CineonToneMapping,
  aces: THREE7.ACESFilmicToneMapping,
  agx: THREE7.AgXToneMapping,
  neutral: THREE7.NeutralToneMapping
};
var linear = (u) => sRGBTransferEOTF2(u);
var CAMERA = [
  {
    id: "lighting.ao",
    label: "Ambient occlusion",
    stage: "camera",
    enabled: (v) => v["lighting.ao.enabled"],
    requires: () => ["depth", "normal"],
    build(c, ctx) {
      const P = ctx.P;
      const normals = ctx.tex("normal");
      const node = ctx.own(ao(ctx.tex("depth"), sample((uv4) => colorToDirection(normals.sample(uv4).rgb)), ctx.camera));
      node.resolutionScale = 0.5;
      node.radius = P.get("lighting.ao.radius");
      node.thickness = P.get("lighting.ao.radius");
      node.distanceFallOff.value = 0.5;
      const aoTex = node.getTextureNode();
      const t = vec26(0.75).div(node.resolution);
      const raw = aoTex.sample(ctx.uv.add(t)).r.add(aoTex.sample(ctx.uv.sub(t)).r).add(aoTex.sample(ctx.uv.add(vec26(t.x, t.y.negate()))).r).add(aoTex.sample(ctx.uv.sub(vec26(t.x, t.y.negate()))).r).mul(0.25);
      const a = raw.sub(0.35).div(0.6).clamp(0, 1);
      const occlusion = pow2(a, P.get("lighting.ao.intensity"));
      const tint = linear(P.get("lighting.ao.tint"));
      const shaded = c.mul(mix8(tint, vec37(1), occlusion));
      return mix8(shaded, tint.mul(0.15), smoothstep8(0.55, 0.7, a).oneMinus().mul(P.get("lighting.ao.ink")));
    }
  },
  {
    id: "lighting.contact",
    label: "Contact shadows",
    stage: "camera",
    enabled: (v) => v["lighting.contact.enabled"],
    requires: () => ["depth", "normal"],
    build(c, ctx) {
      const P = ctx.P, U = ctx.U;
      const depth = ctx.tex("depth");
      const N = 16;
      const occlusion = Fn6(() => {
        const d0 = depth.sample(ctx.uv).r;
        const p0 = getViewPosition(ctx.uv, d0, U.projInv).toVar();
        const len = P.get("lighting.contact.length");
        const thickness = P.get("lighting.contact.thickness");
        const bias = p0.z.negate().mul(3e-3).add(0.015);
        const jitter = interleavedGradientNoise2(screenCoordinate4);
        const hit = float7(0).toVar();
        Loop3({ start: int3(0), end: int3(N), type: "int", condition: "<" }, ({ i }) => {
          const t = float7(i).add(jitter).add(0.5).div(N);
          const p12 = p0.add(U.lightView.mul(len.mul(t)));
          const uv4 = getScreenPosition(p12, U.proj);
          const scene = getViewPosition(uv4, depth.sample(uv4).r, U.projInv).z;
          const delta = scene.sub(p12.z);
          If2(delta.greaterThan(bias).and(delta.lessThan(thickness.add(bias))), () => {
            hit.assign(t.oneMinus().mul(1.5).clamp(0, 1));
            Break();
          });
        });
        const n = colorToDirection(ctx.tex("normal").sample(ctx.uv).rgb);
        const facing = smoothstep8(0.05, 0.3, n.dot(U.lightView));
        return hit.mul(facing).mul(step7(d0, 0.99999));
      })();
      return c.mul(occlusion.mul(P.get("lighting.contact.intensity")).oneMinus());
    }
  },
  {
    id: "lighting.ssgi",
    label: "Screen-space GI",
    stage: "camera",
    enabled: (v) => v["lighting.ssgi.enabled"],
    requires: () => ["depth", "normal"],
    build(c, ctx) {
      const P = ctx.P;
      const normals = ctx.tex("normal");
      const node = ctx.own(ssgi(vec44(c, 1), ctx.tex("depth"), sample((uv4) => colorToDirection(normals.sample(uv4).rgb)), ctx.camera));
      node.useTemporalFiltering = false;
      node.sliceCount.value = 2;
      node.stepCount.value = 8;
      node.radius = P.get("lighting.ssgi.radius");
      const giTex = node.getTextureNode();
      const t = ctx.texel.mul(1.5);
      const gi = giTex.sample(ctx.uv.add(t)).add(giTex.sample(ctx.uv.sub(t))).add(giTex.sample(ctx.uv.add(vec26(t.x, t.y.negate())))).add(giTex.sample(ctx.uv.sub(vec26(t.x, t.y.negate())))).mul(0.25);
      const albedo = c.div(max6(max6(c.r, c.g), max6(c.b, 1e-3))).mul(0.8);
      const k = P.get("lighting.ssgi.intensity");
      return c.mul(mix8(1, gi.a, k.mul(0.25).min(0.5))).add(albedo.mul(gi.rgb).mul(k));
    }
  },
  {
    id: "lens.bloom",
    label: "Bloom",
    stage: "camera",
    enabled: (v) => v["lens.bloom.enabled"],
    requires: (v) => v["lens.bloom.source"] === "emissive" ? ["emissive"] : [],
    key: (v) => v["lens.bloom.source"],
    build(c, ctx) {
      const source = ctx.v["lens.bloom.source"] === "emissive" ? ctx.tex("emissive") : ctx.tex("output");
      const node = ctx.own(bloom(source));
      node.strength = ctx.P.get("lens.bloom.strength");
      node.radius = ctx.P.get("lens.bloom.radius");
      node.threshold = ctx.P.get("lens.bloom.threshold");
      return c.add(node.getTextureNode().sample(ctx.uv).rgb);
    }
  },
  {
    id: "lens.flare",
    label: "Lens flare",
    stage: "camera",
    enabled: (v) => v["lens.flare.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const node = ctx.own(lensflare(vec44(c, 1), {
        threshold: P.get("lens.flare.threshold"),
        ghostSpacing: P.get("lens.flare.spacing"),
        ghostTint: linear(P.get("lighting.key.color")).mul(vec37(1, 0.85, 0.7)),
        ghostSamples: 5,
        ghostAttenuationFactor: 3,
        downSampleRatio: 4
      }));
      const tex = node.getTextureNode();
      const t = ctx.texel.mul(6);
      const flare = tex.sample(ctx.uv.add(t)).add(tex.sample(ctx.uv.sub(t))).add(tex.sample(ctx.uv.add(vec26(t.x, t.y.negate())))).add(tex.sample(ctx.uv.sub(vec26(t.x, t.y.negate())))).rgb.mul(0.25);
      return c.add(flare.mul(P.get("lens.flare.intensity")));
    }
  },
  {
    id: "lens.anamorphic",
    label: "Anamorphic streaks",
    stage: "camera",
    enabled: (v) => v["lens.anamorphic.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const node = ctx.own(anamorphic(vec44(c, 1), P.get("lens.anamorphic.threshold"), P.get("lens.anamorphic.length"), 32));
      node.colorNode = linear(P.get("lens.anamorphic.tint"));
      node.resolutionScale = 0.5;
      return c.add(node.getTextureNode().sample(ctx.uv).rgb.mul(P.get("lens.anamorphic.intensity")).mul(1 / 16));
    }
  },
  {
    id: "atmosphere.godRays",
    label: "God rays",
    stage: "camera",
    enabled: (v) => v["atmosphere.godRays.enabled"],
    requires: () => ["depth"],
    build(c, ctx) {
      const P = ctx.P, U = ctx.U;
      const depth = ctx.tex("depth"), hdr = ctx.tex("output");
      const N = 32;
      const rays = Fn6(() => {
        const uv4 = vec26(ctx.uv).toVar();
        const delta = U.sunScreen.sub(uv4).mul(P.get("atmosphere.godRays.length")).div(N).toVar();
        uv4.addAssign(delta.mul(interleavedGradientNoise2(screenCoordinate4)));
        const sum = float7(0).toVar();
        const w = float7(1).toVar();
        Loop3({ start: int3(0), end: int3(N), type: "int", condition: "<" }, () => {
          uv4.addAssign(delta);
          const inside = step7(0, uv4.x).mul(step7(uv4.x, 1)).mul(step7(0, uv4.y)).mul(step7(uv4.y, 1));
          const sky = step7(0.99999, depth.sample(uv4).r).mul(inside);
          sum.addAssign(luminance3(hdr.sample(uv4).rgb).min(6).mul(sky).mul(w));
          w.mulAssign(P.get("atmosphere.godRays.decay"));
        });
        return sum.div(N);
      })();
      const tint = linear(P.get("lighting.key.color"));
      return c.add(tint.mul(rays).mul(P.get("atmosphere.godRays.intensity")).mul(U.sunVisible));
    }
  },
  {
    id: "lens.motionBlur",
    label: "Motion blur",
    stage: "camera",
    neighborhood: true,
    enabled: (v) => v["lens.motionBlur.enabled"],
    requires: () => ["velocity"],
    build(c, ctx) {
      const velocity2 = ctx.tex("velocity").sample(ctx.uv).xy.mul(ctx.P.get("lens.motionBlur.shutter").div(360));
      return vec37(motionBlur(ctx.texture(c), velocity2, int3(16)).rgb);
    }
  },
  {
    id: "lens.dof",
    label: "Depth of field",
    stage: "camera",
    neighborhood: true,
    enabled: (v) => v["lens.dof.enabled"],
    requires: () => ["depth"],
    build(c, ctx) {
      const node = ctx.own(dof(vec44(c, 1), ctx.pass.getViewZNode(), ctx.U.focusDistance, ctx.P.get("lens.dof.range"), ctx.P.get("lens.dof.blur")));
      return vec37(node.rgb);
    }
  },
  {
    id: "lens.tiltShift",
    label: "Tilt-shift",
    stage: "camera",
    neighborhood: true,
    enabled: (v) => v["lens.tiltShift.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const blurred = ctx.own(gaussianBlur(vec44(c, 1), vec26(P.get("lens.tiltShift.blur")), 6));
      const half = P.get("lens.tiltShift.width").mul(0.5);
      const d = abs5(ctx.uv.y.oneMinus().sub(P.get("lens.tiltShift.center")));
      return mix8(c, vec37(blurred.rgb), smoothstep8(half, half.add(0.22), d));
    }
  },
  {
    id: "quality.traa",
    label: "TRAA",
    stage: "camera",
    neighborhood: true,
    // Temporal AA: the styled camera is jittered every frame and the history is blended.
    // It resolves the finished image (`final`): nested inside a later effect's texture
    // boundary, three's TRAA node renders black. Screen-fixed patterns (paper, halftone)
    // stay sharp; animated grain is softened by the history blend.
    final: true,
    enabled: (v) => !v["retro.pixel.enabled"] && v["quality.aa"] === "traa",
    requires: () => ["depth", "velocity"],
    build(c, ctx) {
      return vec37(ctx.own(traa(ctx.texture(c), ctx.tex("depth"), ctx.tex("velocity"), ctx.camera)).rgb);
    }
  },
  {
    id: "grade.toneMapping",
    label: "Exposure and tone mapping",
    stage: "camera",
    always: true,
    enabled: () => true,
    requires: () => [],
    key: (v) => v["grade.toneMapping"],
    build(c, ctx) {
      return renderOutput(vec44(c.mul(ctx.U.exposure), 1), TONE_MAPPING[ctx.v["grade.toneMapping"]], THREE7.SRGBColorSpace).rgb;
    }
  }
];

// src/runtime/post/stage-grade.js
import * as THREE8 from "three/webgpu";
import { Fn as Fn7, vec3 as vec38, vec4 as vec45, float as float8, int as int4, mix as mix9, smoothstep as smoothstep9, abs as abs6, atan as atan2, floor as floor5, fract as fract5, min as min2, luminance as luminance4, saturation, vibrance, hue as hue2, cdl, texture3D, uniform as uniform7, uniformArray as uniformArray3 } from "three/tsl";
import { sepia } from "three/addons/tsl/display/Sepia.js";
import { bleach } from "three/addons/tsl/display/BleachBypass.js";
var LUT_SIZE = 33;
var lutCache = /* @__PURE__ */ new Map();
function lutTexture(preset) {
  let t = lutCache.get(preset);
  if (preset === "custom" && t && t.userData.version !== (customLut()?.version ?? 0)) {
    t.dispose();
    t = null;
  }
  if (t) return t;
  t = new THREE8.Data3DTexture(bakeLut(preset, LUT_SIZE), LUT_SIZE, LUT_SIZE, LUT_SIZE);
  t.format = THREE8.RGBAFormat;
  t.type = THREE8.UnsignedByteType;
  t.minFilter = t.magFilter = THREE8.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE8.ClampToEdgeWrapping;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  t.userData.version = preset === "custom" ? customLut()?.version ?? 0 : 0;
  lutCache.set(preset, t);
  return t;
}
var LUT_PRESET_IDS = Object.keys(LUT_PRESETS);
var MAX_STOPS = 8;
function createGradeLists() {
  return {
    stops: uniformArray3(Array.from({ length: MAX_STOPS }, () => new THREE8.Vector3()), "vec3"),
    stopCount: uniform7(2),
    lut: texture3D(lutTexture("teal-orange"))
  };
}
function applyGradeLists(L, v) {
  const stops = v["grade.gradientMap.stops"].slice(0, MAX_STOPS);
  const list = stops.length >= 2 ? stops : ["#000000", "#ffffff"];
  list.forEach((hex, i) => L.stops.array[i].set(...hexToRgb(hex)));
  L.stopCount.value = list.length;
  const preset = v["grade.lut.preset"];
  if (L.lut.value !== lutTexture(preset)) L.lut.value = lutTexture(preset);
}
var GRADE = [
  {
    id: "grade.basic",
    label: "Lift, gamma, gain, contrast, saturation, hue, split tone",
    stage: "grade",
    always: true,
    enabled: () => true,
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      let x = vec38(cdl(c, vec38(P.get("grade.gain")), vec38(P.get("grade.lift")), vec38(P.get("grade.gamma"))).rgb);
      x = x.sub(0.5).mul(P.get("grade.contrast")).add(0.5).max(0);
      x = saturation(x, P.get("grade.saturation"));
      x = vibrance(x, P.get("grade.vibrance"));
      x = hue2(x, P.get("grade.hue").mul(Math.PI / 180));
      const h = smoothstep9(0.05, 0.95, luminance4(x).sub(P.get("grade.split.balance").mul(0.25)));
      const tone = mix9(P.get("grade.split.shadows"), P.get("grade.split.highlights"), h);
      const softLight2 = x.mul(x).mul(tone.mul(2).oneMinus()).add(x.mul(tone).mul(2));
      return mix9(x, softLight2, P.get("grade.split.amount"));
    }
  },
  {
    id: "grade.selective",
    label: "Selective color",
    stage: "grade",
    enabled: (v) => v["grade.selective.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const lab = displayToOklab(c);
      const h = atan2(lab.z, lab.y).mul(180 / Math.PI);
      const d = abs6(fract5(h.sub(P.get("grade.selective.hue")).div(360).add(0.5)).sub(0.5)).mul(360);
      const range = P.get("grade.selective.range");
      const chroma = lab.yz.length();
      const keep = smoothstep9(range.mul(0.6), range, d).oneMinus().mul(smoothstep9(0.02, 0.06, chroma));
      return mix9(c, vec38(luminance4(c)), P.get("grade.selective.amount").mul(keep.oneMinus()));
    }
  },
  {
    id: "grade.lut",
    label: "Color LUT",
    stage: "grade",
    enabled: (v) => v["grade.lut.enabled"],
    requires: () => [],
    build(c, ctx) {
      const uvw = c.clamp(0, 1).mul((LUT_SIZE - 1) / LUT_SIZE).add(0.5 / LUT_SIZE);
      return mix9(c, ctx.lists.lut.sample(uvw).rgb, ctx.P.get("grade.lut.amount"));
    }
  },
  {
    id: "grade.gradientMap",
    label: "Gradient map",
    stage: "grade",
    enabled: (v) => v["grade.gradientMap.enabled"],
    requires: () => [],
    build(c, ctx) {
      const L = ctx.lists;
      const mapped = Fn7(() => {
        const n = float8(L.stopCount).sub(1);
        const t = luminance4(c).clamp(0, 1).mul(n);
        const i = min2(floor5(t), n.sub(1));
        const a = L.stops.element(int4(i)), b = L.stops.element(int4(i).add(1));
        return mix9(a, b, t.sub(i).clamp(0, 1));
      })();
      return mix9(c, mapped, ctx.P.get("grade.gradientMap.amount"));
    }
  },
  {
    id: "grade.sepia",
    label: "Sepia",
    stage: "grade",
    enabled: (v) => v["grade.sepia.enabled"],
    requires: () => [],
    build(c, ctx) {
      return mix9(c, sepia(vec45(c, 1)).rgb.min(1), ctx.P.get("grade.sepia.amount"));
    }
  },
  {
    id: "grade.bleach",
    label: "Bleach bypass",
    stage: "grade",
    enabled: (v) => v["grade.bleach.enabled"],
    requires: () => [],
    build(c, ctx) {
      return bleach(vec45(c, 1), ctx.P.get("grade.bleach.amount")).rgb;
    }
  }
];

// src/runtime/post/stage-medium.js
import { Fn as Fn9, vec2 as vec28, vec3 as vec310, vec4 as vec46, float as float10, int as int6, max as max8, min as min3, mix as mix11, step as step9, smoothstep as smoothstep11, floor as floor7, fract as fract6, sin as sin5, cos as cos6, dot as dot5, pow as pow3, abs as abs8, round as round2, length as length4, select as select8, luminance as luminance6, Loop as Loop4, colorToDirection as colorToDirection3, perspectiveDepthToViewZ as perspectiveDepthToViewZ3, screenCoordinate as screenCoordinate5, mx_noise_float as mx_noise_float3, mx_worley_noise_float as mx_worley_noise_float2 } from "three/tsl";
import { fxaa } from "three/addons/tsl/display/FXAANode.js";
import { smaa } from "three/addons/tsl/display/SMAANode.js";

// src/runtime/post/lines.js
import { Fn as Fn8, vec2 as vec27, vec3 as vec39, float as float9, int as int5, round, max as max7, mix as mix10, smoothstep as smoothstep10, step as step8, abs as abs7, floor as floor6, select as select7, luminance as luminance5, saturation as saturation2, colorToDirection as colorToDirection2, perspectiveDepthToViewZ as perspectiveDepthToViewZ2, mx_noise_float as mx_noise_float2 } from "three/tsl";
var PAIRS = [[1, 0], [0, 1], [0.7071, 0.7071], [0.7071, -0.7071]];
function screenLines(color, b, u, atmos, { uv: uv4, texel, scale, coord }, P, time) {
  return Fn8(() => {
    const px = texel;
    const boil = P.get("motion.boil.fps");
    const seed = select7(boil.greaterThan(0.5), floor6(time.mul(boil)), float9(0)).mul(3.17);
    const f = P.get("lines.screen.wobbleScale").mul(0.025);
    const wobble = vec27(mx_noise_float2(vec39(coord.mul(f), seed)), mx_noise_float2(vec39(coord.mul(f), seed.add(11.3)))).mul(P.get("lines.screen.wobble")).mul(px).mul(scale);
    const at = uv4.add(wobble);
    const dark = luminance5(color.rgb).oneMinus().clamp(0, 1);
    const texture4 = P.get("lines.screen.texture"), texAmount = P.get("lines.screen.textureAmount");
    const swell = mx_noise_float2(vec39(coord.mul(0.012), 4.1)).mul(0.5).add(0.5);
    const brush = mix10(float9(1), swell.mul(swell).mul(2.2).add(0.15), texAmount.mul(step8(1.5, texture4).mul(step8(texture4, 2.5))));
    const part = int5(round(b.ids.sample(uv4).r.mul(255)));
    const radius = max7(u.partThickness.element(part).mul(scale).mul(dark.mul(P.get("lines.screen.lightWeight")).add(1)).mul(brush), 0);
    const dist2 = (d) => perspectiveDepthToViewZ2(d, u.near, u.far).negate();
    const d0 = dist2(b.depth.sample(at).r).toVar();
    const n0 = colorToDirection2(b.normal.sample(at).rgb).toVar();
    const id0 = b.ids.sample(at).rg.toVar();
    const depthEdge = float9(0).toVar();
    const normalEdge = float9(0).toVar();
    const idEdge = float9(0).toVar();
    const w0 = d0.reciprocal();
    for (const [x, y] of PAIRS) {
      const o = vec27(x, y).mul(px).mul(radius);
      const samples = [at.add(o), at.sub(o)];
      const da = dist2(b.depth.sample(samples[0]).r), db = dist2(b.depth.sample(samples[1]).r);
      const lap = da.reciprocal().add(db.reciprocal()).sub(w0.mul(2)).div(w0);
      depthEdge.assign(max7(depthEdge, lap.negate()));
      for (const [k, s] of samples.entries()) {
        const n = colorToDirection2(b.normal.sample(k === 0 ? at.add(o.mul(0.5)) : at.sub(o.mul(0.5))).rgb);
        normalEdge.assign(max7(normalEdge, n.dot(n0).oneMinus()));
        const id = b.ids.sample(s).rg;
        const differs = step8(0.5 / 255, abs7(id.x.sub(id0.x)).add(abs7(id.y.sub(id0.y))));
        const notCloser = step8(d0.mul(0.999), k === 0 ? da : db);
        idEdge.assign(max7(idEdge, differs.mul(notCloser)));
      }
    }
    const th = u.depthThreshold.div(abs7(n0.z).clamp(0.25, 1));
    const silhouette = smoothstep10(th.mul(0.5), th, depthEdge).mul(u.silhouette);
    const crease = smoothstep10(u.creaseThreshold.mul(0.8), u.creaseThreshold.mul(1.25), normalEdge).mul(u.crease);
    let edge = max7(silhouette, max7(crease, idEdge.mul(u.idWeight))).mul(step8(0.01, radius)).clamp();
    const grain = mx_noise_float2(vec39(coord.mul(0.9), 2.3)).mul(0.5).add(0.5);
    const blots = mx_noise_float2(vec39(coord.mul(0.05), 6.7)).mul(0.5).add(0.5);
    const isPencil = step8(0.5, texture4).mul(step8(texture4, 1.5)), isInk = step8(2.5, texture4);
    edge = edge.mul(mix10(float9(1), grain.mul(0.8).add(0.2), texAmount.mul(isPencil)));
    edge = edge.mul(mix10(float9(1), blots.mul(0.5).add(0.75), texAmount.mul(isInk))).clamp();
    const fog2 = fogFactor(atmos, d0).mul(u.followFog).oneMinus();
    const fade = smoothstep10(P.get("lines.screen.fadeStart"), P.get("lines.screen.fadeEnd"), d0).mul(P.get("lines.screen.fade")).oneMinus();
    const alpha = edge.mul(fog2).mul(fade).mul(P.get("lines.screen.opacity"));
    const local = saturation2(color.rgb.mul(P.get("lines.screen.darken")), float9(1.3));
    const ink = mix10(u.partColor.element(part), local, P.get("lines.screen.colorFromSurface"));
    return vec39(mix10(color.rgb, ink, alpha));
  })();
}

// src/runtime/post/stage-medium.js
var cells = (ctx, size, angle) => rotate2(ctx.coord.add(0.5).div(size.mul(ctx.gridSize.y.div(1080))), angle);
var noise = (p12) => mx_noise_float3(p12).mul(0.5).add(0.5);
function structureTensor(tex, ctx) {
  const at = (x, y) => tex.sample(ctx.uv.add(vec28(x, y).mul(ctx.texel))).rgb;
  const gx = at(1, -1).add(at(1, 0).mul(2)).add(at(1, 1)).sub(at(-1, -1).add(at(-1, 0).mul(2)).add(at(-1, 1))).mul(0.25);
  const gy = at(-1, 1).add(at(0, 1).mul(2)).add(at(1, 1)).sub(at(-1, -1).add(at(0, -1).mul(2)).add(at(1, -1))).mul(0.25);
  return vec310(dot5(gx, gx), dot5(gx, gy), dot5(gy, gy));
}
var MEDIUM2 = [
  {
    id: "media.kuwahara",
    label: "Painterly (Kuwahara)",
    stage: "medium",
    neighborhood: true,
    enabled: (v) => v["media.kuwahara.enabled"],
    requires: () => [],
    key: (v) => v["media.kuwahara.anisotropic"] ? "aniso" : "",
    build(c, ctx) {
      const P = ctx.P;
      const tex = ctx.texture(c);
      const step1080 = ctx.texel.mul(ctx.gridSize.y.div(1080).max(1));
      const dirs = Array.from({ length: 8 }, (_, k) => vec28(Math.cos(k * Math.PI / 4), Math.sin(k * Math.PI / 4)));
      const tensor = ctx.v["media.kuwahara.anisotropic"] ? ctx.texture(structureTensor(tex, ctx)) : null;
      return Fn9(() => {
        const rf = P.get("media.kuwahara.radius");
        const r = int6(rf);
        const m = dirs.map(() => vec310(0).toVar()), sq = dirs.map(() => vec310(0).toVar()), n = dirs.map(() => float10(0).toVar());
        let offset = (k) => k.mul(step1080);
        if (tensor) {
          const T = vec310(0).toVar();
          for (const [x, y] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) T.addAssign(tensor.sample(ctx.uv.add(vec28(x, y).mul(ctx.texel).mul(2))).rgb);
          const E = T.x, F = T.y, G = T.z;
          const root = E.sub(G).mul(E.sub(G)).add(F.mul(F).mul(4)).sqrt();
          const l1 = E.add(G).add(root).mul(0.5), l2 = E.add(G).sub(root).mul(0.5);
          const t = vec28(l1.sub(E), F.negate());
          const dir = select8(dot5(t, t).greaterThan(1e-10), t.normalize(), vec28(1, 0)).toVar();
          const A = l1.sub(l2).div(l1.add(l2).max(1e-6)).toVar();
          const along = A.add(1), across = float10(1).div(A.add(1));
          offset = (k) => dir.mul(k.x.mul(along)).add(vec28(dir.y.negate(), dir.x).mul(k.y.mul(across))).mul(step1080);
        }
        Loop4({ start: r.negate(), end: r, type: "int", condition: "<=", name: "kx" }, ({ kx }) => {
          Loop4({ start: r.negate(), end: r, type: "int", condition: "<=", name: "ky" }, ({ ky }) => {
            const v = vec28(float10(kx), float10(ky)).div(rf.max(1));
            const d2 = dot5(v, v);
            const g = smoothstep11(0.7, 1, d2.sqrt()).oneMinus().mul(step9(d2, 1)).mul(d2.mul(-1.5).exp());
            const s = tex.sample(ctx.uv.add(offset(vec28(float10(kx), float10(ky))))).rgb;
            const s2 = s.mul(s);
            const dir = v.div(d2.sqrt().max(1e-4));
            const center = step9(d2, 1e-6).mul(0.125);
            for (let k = 0; k < 8; k++) {
              const w = pow3(dir.dot(dirs[k]).max(0), 6).add(center).mul(g);
              m[k].addAssign(s.mul(w));
              sq[k].addAssign(s2.mul(w));
              n[k].addAssign(w);
            }
          });
        });
        const sum = vec310(0).toVar(), wsum = float10(0).toVar();
        const sharp = P.get("media.kuwahara.sharpness");
        for (let k = 0; k < 8; k++) {
          const mean = m[k].div(n[k].max(1e-5));
          const variance = sq[k].div(n[k].max(1e-5)).sub(mean.mul(mean)).max(0);
          const w = pow3(dot5(variance, vec310(1)).mul(250).add(1), sharp.mul(-0.5));
          sum.addAssign(mean.mul(w));
          wsum.addAssign(w);
        }
        return sum.div(wsum.max(1e-8));
      })();
    }
  },
  {
    id: "media.watercolor",
    label: "Watercolor",
    stage: "medium",
    neighborhood: true,
    enabled: (v) => v["media.watercolor.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const tex = ctx.texture(c);
      const unit = ctx.texel.mul(ctx.gridSize.y.div(1080));
      const px = ctx.coord;
      return Fn9(() => {
        const wob = vec28(noise(vec310(px.mul(0.012), 1.3)), noise(vec310(px.mul(0.012), 7.1))).sub(0.5).mul(2);
        const uv4 = ctx.uv.add(wob.mul(P.get("media.watercolor.wobble")).mul(unit)).toVar();
        const base = tex.sample(uv4).rgb.toVar();
        const blur = vec310(0).toVar();
        const radius = P.get("media.watercolor.bleed").mul(4).add(2);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2;
          blur.addAssign(tex.sample(uv4.add(vec28(Math.cos(a), Math.sin(a)).mul(unit).mul(radius))).rgb);
        }
        blur.divAssign(8);
        const bled = mix11(base, blur, P.get("media.watercolor.bleed").mul(0.7));
        const edge = smoothstep11(0.02, 0.16, length4(base.sub(blur)));
        const pooled = bled.mul(float10(1).sub(edge.mul(P.get("media.watercolor.edges")).mul(0.55)));
        const grain = noise(vec310(px.mul(0.35), 3.7)).mul(0.6).add(noise(vec310(px.mul(0.07), 9.2)).mul(0.4));
        const dark = luminance6(pooled).oneMinus();
        return pooled.mul(float10(1).sub(grain.mul(dark).mul(P.get("media.watercolor.granulation")).mul(0.45)));
      })();
    }
  },
  {
    id: "media.halftone",
    label: "Halftone (print)",
    stage: "medium",
    enabled: (v) => v["media.halftone.enabled"],
    requires: () => [],
    key: (v) => v["media.halftone.mode"],
    build(c, ctx) {
      const P = ctx.P;
      const size = P.get("media.halftone.size"), angle = P.get("media.halftone.angle");
      const shadows = P.get("media.halftone.shadows");
      const tone = (ink) => ink.sub(shadows.mul(0.55)).div(float10(1).sub(shadows.mul(0.55))).clamp(0, 1);
      let out;
      if (ctx.v["media.halftone.mode"] === "cmyk") {
        const k = float10(1).sub(max8(c.r, max8(c.g, c.b))).clamp(0, 1);
        const inv = float10(1).sub(k).max(1e-3);
        const cyan = float10(1).sub(c.r).sub(k).div(inv), magenta = float10(1).sub(c.g).sub(k).div(inv), yellow = float10(1).sub(c.b).sub(k).div(inv);
        const dot6 = (value, offset) => dotMask(cells(ctx, size, angle.add(offset)), tone(value));
        const C = dot6(cyan, -30), M = dot6(magenta, 30), Y = dot6(yellow, -45), K = dot6(k, 0);
        out = vec310(C.oneMinus(), M.oneMinus(), Y.oneMinus()).mul(K.oneMinus());
      } else {
        const dots = dotMask(cells(ctx, size, angle), tone(luminance6(c).oneMinus()));
        out = mix11(c.mul(1.08).min(1), P.get("media.halftone.ink"), dots);
      }
      return mix11(c, out, P.get("media.halftone.amount"));
    }
  },
  {
    id: "media.hatching",
    label: "Hatching (post)",
    stage: "medium",
    enabled: (v) => v["media.hatching.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const lum2 = luminance6(c);
      let lines = float10(0);
      for (let k = 0; k < 4; k++) {
        const level = P.get("media.hatching.threshold").mul(1 - k * 0.24);
        const depth = level.sub(lum2).div(level.max(1e-3)).clamp(0, 1);
        const coord = cells(ctx, P.get("media.hatching.spacing"), P.get("media.hatching.angle").add(k * 60));
        const on = step9(k + 0.5, P.get("media.hatching.layers")).mul(step9(lum2, level));
        lines = max8(lines, lineMask(coord, depth.mul(0.2).add(0.1)).mul(on));
      }
      return mix11(c, P.get("media.hatching.color"), lines.mul(P.get("media.hatching.amount")));
    }
  },
  {
    id: "lines.screen",
    label: "Screen-space ink",
    stage: "medium",
    enabled: (v) => v["lines.screen.enabled"],
    requires: () => ["depth", "normal", "ids"],
    build(c, ctx) {
      return screenLines(c, { depth: ctx.tex("depth"), normal: ctx.tex("normal"), ids: ctx.tex("ids") }, ctx.U.lines, ctx.atmos, { uv: ctx.uv, texel: ctx.texel, scale: ctx.lineScale, coord: ctx.coord }, ctx.P, ctx.U.time);
    }
  },
  {
    id: "lines.sobel",
    label: "Image edges (Sobel)",
    stage: "medium",
    neighborhood: true,
    enabled: (v) => v["lines.sobel.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const tex = ctx.texture(c);
      const o = ctx.texel.mul(P.get("lines.sobel.thickness").mul(ctx.lineScale).max(0.75));
      const L = (x, y) => luminance6(tex.sample(ctx.uv.add(vec28(x, y).mul(o))).rgb);
      const tl = L(-1, -1), t = L(0, -1), tr = L(1, -1), l = L(-1, 0), r = L(1, 0), bl = L(-1, 1), b = L(0, 1), br = L(1, 1);
      const gx = tr.add(r.mul(2)).add(br).sub(tl.add(l.mul(2)).add(bl));
      const gy = bl.add(b.mul(2)).add(br).sub(tl.add(t.mul(2)).add(tr));
      const th = P.get("lines.sobel.threshold");
      const edge = smoothstep11(th, th.mul(1.6).add(0.02), vec28(gx, gy).length());
      return mix11(c, P.get("lines.sobel.color"), edge.mul(P.get("lines.sobel.amount")));
    }
  },
  {
    id: "lines.highlight",
    label: "Interactable highlight",
    stage: "medium",
    enabled: (v) => v["lines.highlight.enabled"],
    requires: () => ["ids"],
    build(c, ctx) {
      const P = ctx.P;
      const ids = ctx.tex("ids");
      const target = P.get("lines.highlight.target");
      const part = select8(target.lessThan(1.5), float10(PART_INDEX.hero), select8(target.lessThan(2.5), float10(PART_INDEX.characters), select8(target.lessThan(3.5), float10(PART_INDEX.props), float10(PART_INDEX.vfx))));
      const mask = (uv4) => {
        const id = ids.sample(uv4);
        const p12 = round2(id.r.mul(255));
        const isPart = step9(abs8(p12.sub(part)), 0.5).max(step9(2.5, target).oneMinus().mul(step9(1.5, target)).mul(step9(abs8(p12.sub(PART_INDEX.hero)), 0.5)));
        return select8(target.lessThan(0.5), step9(0.5, id.b), isPart);
      };
      return Fn9(() => {
        const here = mask(ctx.uv).toVar();
        const radius = ctx.texel.mul(P.get("lines.highlight.thickness").mul(ctx.lineScale).max(1));
        const ring = float10(0).toVar();
        for (let k = 0; k < 12; k++) {
          const a = k / 12 * Math.PI * 2;
          const d = vec28(Math.cos(a), Math.sin(a));
          ring.assign(max8(ring, max8(mask(ctx.uv.add(d.mul(radius))), mask(ctx.uv.add(d.mul(radius).mul(0.5))))));
        }
        const pulse = mix11(1, sin5(ctx.U.time.mul(Math.PI * 2)).mul(0.5).add(0.5).mul(0.6).add(0.4), P.get("lines.highlight.pulse"));
        const color = P.get("lines.highlight.color");
        const filled = mix11(c, color, here.mul(P.get("lines.highlight.fill")).mul(pulse));
        return mix11(filled, color, ring.mul(here.oneMinus()).mul(pulse));
      })();
    }
  },
  {
    id: "retro.pixel",
    label: "Pixelation and pixel edges",
    stage: "medium",
    enabled: (v) => v["retro.pixel.enabled"],
    requires: () => ["depth", "normal"],
    build(c, ctx) {
      const { U } = ctx;
      const depth = ctx.tex("depth"), normal = ctx.tex("normal");
      const strength = ctx.P.get("retro.pixel.edges");
      return Fn9(() => {
        const dist2 = (uv4) => perspectiveDepthToViewZ3(depth.sample(uv4).r, U.lines.near, U.lines.far).negate();
        const d0 = dist2(ctx.uv).toVar();
        const n0 = colorToDirection3(normal.sample(ctx.uv).rgb).toVar();
        const depthEdge = float10(0).toVar(), normalEdge = float10(0).toVar();
        for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const uv4 = ctx.uv.add(vec28(x, y).mul(ctx.texel));
          const d = dist2(uv4);
          const n = colorToDirection3(normal.sample(uv4).rgb);
          depthEdge.assign(max8(depthEdge, d.sub(d0).div(d0).clamp(0, 1)));
          const facing = smoothstep11(-0.01, 0.01, n0.sub(n).dot(vec310(-1, 1, 1).normalize()));
          const sameSurface = smoothstep11(0, 0.02, d.sub(d0).div(d0).abs()).oneMinus();
          normalEdge.assign(max8(normalEdge, n0.dot(n).oneMinus().mul(facing).mul(sameSurface)));
        }
        const dark = smoothstep11(0.03, 0.06, depthEdge);
        const light = smoothstep11(0.08, 0.15, normalEdge).mul(dark.oneMinus());
        return c.mul(float10(1).sub(dark.mul(strength).mul(0.6))).mul(float10(1).add(light.mul(strength).mul(0.5)));
      })();
    }
  },
  {
    id: "quality.fxaa",
    label: "FXAA",
    stage: "medium",
    always: true,
    // Auto: FXAA whenever the pass renders without MSAA (it writes extra buffers). Pixel looks stay crisp.
    enabled: (v, ctx) => !v["retro.pixel.enabled"] && (v["quality.aa"] === "fxaa" || ["auto", "msaa"].includes(v["quality.aa"]) && ctx.samples === 0),
    requires: () => [],
    build(c, ctx) {
      return vec310(ctx.own(fxaa(vec46(c, 1))).rgb);
    }
  },
  {
    id: "quality.smaa",
    label: "SMAA",
    stage: "medium",
    enabled: (v) => !v["retro.pixel.enabled"] && v["quality.aa"] === "smaa",
    requires: () => [],
    build(c, ctx) {
      return vec310(ctx.own(smaa(vec46(c, 1))).rgb);
    }
  },
  {
    id: "media.sharpen",
    label: "Sharpen",
    stage: "medium",
    neighborhood: true,
    enabled: (v) => v["media.sharpen.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const tex = ctx.texture(c);
      const o = ctx.texel.mul(P.get("media.sharpen.radius").mul(ctx.lineScale).max(0.5));
      const blur = tex.sample(ctx.uv.add(o)).rgb.add(tex.sample(ctx.uv.sub(o)).rgb).add(tex.sample(ctx.uv.add(vec28(o.x, o.y.negate()))).rgb).add(tex.sample(ctx.uv.sub(vec28(o.x, o.y.negate()))).rgb).mul(0.25);
      const base = tex.sample(ctx.uv).rgb;
      return base.add(base.sub(blur).mul(P.get("media.sharpen.amount"))).max(0);
    }
  },
  {
    id: "media.misregistration",
    label: "Print misregistration",
    stage: "medium",
    neighborhood: true,
    enabled: (v) => v["media.misregistration.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const tex = ctx.texture(c);
      const a = P.get("media.misregistration.angle").mul(Math.PI / 180);
      const o = vec28(cos6(a), sin5(a)).mul(P.get("media.misregistration.offset")).mul(ctx.texel).mul(ctx.gridSize.y.div(1080));
      return vec310(tex.sample(ctx.uv.add(o)).r, tex.sample(ctx.uv).g, tex.sample(ctx.uv.sub(o)).b);
    }
  },
  {
    id: "media.paper",
    label: "Paper",
    stage: "medium",
    enabled: (v) => v["media.paper.enabled"],
    requires: () => [],
    build(c, ctx) {
      const P = ctx.P;
      const p12 = ctx.coord.div(P.get("media.paper.scale").mul(ctx.gridSize.y.div(1080)));
      const type = P.get("media.paper.type");
      const fibers = noise(vec310(p12.mul(vec28(0.9, 0.12)), 2.1)).mul(0.5).add(noise(vec310(p12.mul(0.45), 5.3)).mul(0.5));
      const bumps = mx_worley_noise_float2(vec310(p12.mul(0.05), 0.5)).oneMinus().mul(0.7).add(noise(vec310(p12.mul(0.3), 1.1)).mul(0.3));
      const weave = sin5(p12.x.mul(0.9)).mul(sin5(p12.y.mul(0.9))).mul(0.5).add(0.5).mul(0.6).add(noise(vec310(p12.mul(0.2), 8.4)).mul(0.4));
      const relief = select8(type.lessThan(0.5), fibers, select8(type.lessThan(1.5), bumps, select8(type.lessThan(2.5), weave, fibers)));
      const paper = P.get("media.paper.color").mul(relief.mul(0.22).add(0.82));
      return mix11(c, c.mul(paper), P.get("media.paper.strength"));
    }
  }
];

// src/runtime/post/views.js
import { vec2 as vec29, vec3 as vec311, float as float11, mix as mix12, max as max9, min as min4, abs as abs9, step as step10, smoothstep as smoothstep12, floor as floor8, round as round3, length as length5, luminance as luminance7, screenUV as screenUV2, screenSize as screenSize3, sRGBTransferEOTF as sRGBTransferEOTF3, sRGBTransferOETF, perspectiveDepthToViewZ as perspectiveDepthToViewZ4, colorToDirection as colorToDirection4 } from "three/tsl";
var VIEWS = [
  { id: "value", label: "Value (grayscale)", learn: "If it reads in grayscale, it reads: the light and dark structure." },
  { id: "squint", label: "Squint (blur)", learn: "Detail disappears; only the big masses and the focal point remain." },
  { id: "silhouette", label: "Silhouette", learn: "Shapes as flat black: can you still tell what everything is?", requires: ["ids"] },
  { id: "thumbnail", label: "Thumbnail (128 px)", learn: "Does it read at thumbnail size, as in a store listing?" },
  { id: "saturation", label: "Saturation heatmap", learn: "Where color is strongest. The focus should be the most saturated thing." },
  { id: "busyness", label: "Busyness (edge density)", learn: "Where detail competes for attention. Calm areas let the eye rest." },
  { id: "protan", label: "Color-blind: protan", learn: "Red-weak vision (about 1% of men)." },
  { id: "deutan", label: "Color-blind: deutan", learn: "Green-weak vision, the most common (about 5% of men)." },
  { id: "tritan", label: "Color-blind: tritan", learn: "Blue-weak vision (rare)." },
  { id: "thirds", label: "Rule of thirds", learn: "Strong compositions put the subject near a line or an intersection." },
  { id: "golden", label: "Golden ratio", learn: "The same idea with 0.382 / 0.618 lines." },
  { id: "center", label: "Center cross", learn: "Centered framing: symmetric, calm, confrontational." },
  { id: "buffer-depth", label: "Buffer: depth", learn: "Linear depth, what fog, depth of field and line silhouettes read.", requires: ["depth"], buffer: true },
  { id: "buffer-normal", label: "Buffer: normals", learn: "Surface directions, what crease lines and AO read.", requires: ["normal"], buffer: true },
  { id: "buffer-ids", label: "Buffer: part ids", learn: "Which part each pixel belongs to: what per-part masks and id edges read.", requires: ["ids"], buffer: true }
];
var viewById = new Map(VIEWS.map((v) => [v.id, v]));
var CVD = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-3882e-6, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [4733e-6, 0.691367, 0.3039]]
};
var heat = (t) => {
  const a = vec311(0.12, 0.16, 0.45), b = vec311(0.1, 0.65, 0.4), c = vec311(0.98, 0.85, 0.2), d = vec311(0.9, 0.2, 0.15);
  return mix12(mix12(a, b, smoothstep12(0, 0.35, t)), mix12(c, d, smoothstep12(0.65, 1, t)), smoothstep12(0.3, 0.7, t));
};
function guides(c, xs, ys) {
  const px = vec29(1).div(screenSize3);
  let on = float11(0);
  for (const x of xs) on = max9(on, step10(abs9(screenUV2.x.sub(x)), px.x.mul(1.2)));
  for (const y of ys) on = max9(on, step10(abs9(screenUV2.y.sub(y)), px.y.mul(1.2)));
  return mix12(c, vec311(1, 1, 1), on.mul(0.75));
}
function designerView(id, c, ctx) {
  switch (id) {
    case "value":
      return vec311(luminance7(c));
    case "squint": {
      const t = ctx.texture(c);
      let sum = vec311(0);
      const r = vec29(0.018, 0.018 * 16 / 9);
      const taps = [[0, 0], ...Array.from({ length: 12 }, (_, i) => [Math.cos(i / 12 * Math.PI * 2), Math.sin(i / 12 * Math.PI * 2)]), ...Array.from({ length: 6 }, (_, i) => [0.5 * Math.cos((i + 0.5) / 6 * Math.PI * 2), 0.5 * Math.sin((i + 0.5) / 6 * Math.PI * 2)])];
      for (const [x, y] of taps) sum = sum.add(t.sample(screenUV2.add(vec29(x, y).mul(r))).rgb);
      return sum.div(taps.length);
    }
    case "silhouette": {
      const part = round3(ctx.tex("ids").sample(ctx.uv).r.mul(255));
      return vec311(step10(part, 0.5));
    }
    case "thumbnail": {
      const t = ctx.texture(c);
      const grid = vec29(128, screenSize3.y.div(screenSize3.x).mul(128));
      return t.sample(floor8(screenUV2.mul(grid)).add(0.5).div(grid)).rgb;
    }
    case "saturation": {
      const lab = displayToOklab(c);
      return mix12(vec311(luminance7(c).mul(0.35)), heat(length5(lab.yz).div(0.25).clamp(0, 1)), 0.85);
    }
    case "busyness": {
      const t = ctx.texture(c);
      const px = vec29(1.5).div(screenSize3);
      const L = (dx, dy) => luminance7(t.sample(screenUV2.add(vec29(dx, dy).mul(px))).rgb);
      const gx = L(1, -1).add(L(1, 0).mul(2)).add(L(1, 1)).sub(L(-1, -1)).sub(L(-1, 0).mul(2)).sub(L(-1, 1));
      const gy = L(-1, 1).add(L(0, 1).mul(2)).add(L(1, 1)).sub(L(-1, -1)).sub(L(0, -1).mul(2)).sub(L(1, -1));
      return heat(length5(vec29(gx, gy)).mul(2.5).clamp(0, 1));
    }
    case "protan":
    case "deutan":
    case "tritan": {
      const lin = sRGBTransferEOTF3(c);
      const [a, b, d] = CVD[id];
      const out = vec311(lin.dot(vec311(...a)), lin.dot(vec311(...b)), lin.dot(vec311(...d))).max(0);
      return sRGBTransferOETF(out).clamp(0, 1);
    }
    case "thirds":
      return guides(c, [1 / 3, 2 / 3], [1 / 3, 2 / 3]);
    case "golden":
      return guides(c, [0.382, 0.618], [0.382, 0.618]);
    case "center":
      return guides(c, [0.5], [0.5]);
    case "buffer-depth": {
      const z = perspectiveDepthToViewZ4(ctx.tex("depth").sample(ctx.uv).r, ctx.U.lines.near, ctx.U.lines.far).negate();
      return vec311(float11(1).sub(z.div(60).clamp(0, 1).pow(0.5)));
    }
    case "buffer-normal":
      return colorToDirection4(ctx.tex("normal").sample(ctx.uv).rgb).mul(0.5).add(0.5);
    case "buffer-ids": {
      const p12 = ctx.tex("ids").sample(ctx.uv).r.mul(255);
      const h = p12.mul(0.137).fract();
      return vec311(h.mul(6.2831).sin(), h.add(0.333).mul(6.2831).sin(), h.add(0.666).mul(6.2831).sin()).mul(0.45).add(0.5).mul(min4(p12, 1));
    }
    default:
      return c;
  }
}

// src/runtime/post/params.js
import * as THREE9 from "three/webgpu";
import { uniform as uniform8 } from "three/tsl";
function setDisplayColor(u, hex) {
  const [r, g, b] = hexToRgb(hex);
  u.value.setRGB(r, g, b, THREE9.LinearSRGBColorSpace);
}
function write(u, entry, value) {
  switch (entry.type) {
    case "color":
      setDisplayColor(u, value);
      break;
    case "bool":
      u.value = value ? 1 : 0;
      break;
    case "enum":
      u.value = Math.max(0, entry.options.findIndex((o) => o.value === value));
      break;
    default:
      u.value = value;
  }
}
var ParamUniforms = class {
  constructor() {
    this.map = /* @__PURE__ */ new Map();
    this.values = null;
  }
  /** The uniform for registry parameter `id` (created on first use). */
  get(id) {
    let u = this.map.get(id);
    if (u) return u;
    const entry = byId.get(id);
    if (!entry) throw new Error(`ParamUniforms: unknown parameter ${id}`);
    if (entry.type === "palette") throw new Error(`ParamUniforms: ${id} is a palette; effects handle palettes themselves`);
    u = entry.type === "color" ? uniform8(new THREE9.Color()) : uniform8(0, "float");
    u.name = `p_${id.replace(/[^a-zA-Z0-9]/g, "_")}`;
    this.map.set(id, u);
    if (this.values) write(u, entry, this.values[id]);
    return u;
  }
  apply(values) {
    this.values = values;
    for (const [id, u] of this.map) write(u, byId.get(id), values[id]);
  }
};

// src/runtime/post/graph.js
var EFFECTS = [...CAMERA, ...GRADE, ...MEDIUM2, ...DISPLAY];
var MASKED = REGISTRY.filter((e) => e.scope === "mask" && e.type === "bool").map((e) => e.id);
var ALL_PARTS = (1 << PARTS.length) - 1;
var MASK_OF = { "lines.screen": "lines.screen.enabled", "lighting.ao": "lighting.ao.enabled", "lighting.contact": "lighting.contact.enabled", "media.kuwahara": "media.kuwahara.enabled", "media.watercolor": "media.watercolor.enabled", "media.halftone": "media.halftone.enabled", "media.hatching": "media.hatching.enabled", "media.paper": "media.paper.enabled" };
for (const e of EFFECTS) if (MASK_OF[e.id]) e.mask = MASK_OF[e.id];
function withPartMasks(global, parts) {
  const out = { ...global };
  for (const id of MASKED) {
    let bits = 0;
    PARTS.forEach((p12, i) => {
      if (parts[p12][id]) bits |= 1 << i;
    });
    out[id] = bits !== 0;
    out[`@mask:${id}`] = bits;
    out[`@partial:${id}`] = bits !== 0 && bits !== ALL_PARTS;
  }
  return out;
}
function createPostUniforms() {
  return {
    exposure: uniform9(new THREE10.Vector3(1, 1, 1)),
    lines: {
      thickness: uniform9(1.5),
      color: uniform9(new THREE10.Color()),
      silhouette: uniform9(1),
      crease: uniform9(0.5),
      creaseThreshold: uniform9(0.18),
      depthThreshold: uniform9(0.03),
      idWeight: uniform9(1),
      followFog: uniform9(1),
      near: uniform9(0.1),
      far: uniform9(1e3),
      // Per part (index = part id): thickness in px at 1080p and color (raw sRGB).
      partThickness: uniformArray4(new Array(16).fill(1.5), "float"),
      partColor: uniformArray4(Array.from({ length: 16 }, () => new THREE10.Color()), "color")
    },
    // Per-frame camera-derived values (StyleRuntime.update).
    sunScreen: uniform9(new THREE10.Vector2(0.5, 0.2)),
    sunVisible: uniform9(0),
    focusDistance: uniform9(10),
    proj: uniform9(new THREE10.Matrix4()),
    projInv: uniform9(new THREE10.Matrix4()),
    lightView: uniform9(new THREE10.Vector3(0, 1, 0)),
    pixelSize: uniform9(1),
    lowRes: uniform9(new THREE10.Vector2(1, 1)),
    // Per-part masks (bits per masked switch), per-part ink, isolate (part index or -1).
    masks: Object.fromEntries(MASKED.map((id) => [id, uniform9(0, "int")])),
    isolate: uniform9(-1, "int"),
    // Transitions (§6.10): crossfade and wipe blend from a snapshot of the outgoing frame.
    transitionMode: uniform9(0),
    // 0 off · 1 crossfade · 2 wipe
    transitionProgress: uniform9(1),
    snapshot: null,
    // texture node, set by the runtime
    // Compare composite (§6.9): hold, split wipe and flicker never rebuild.
    hold: uniform9(0),
    split: uniform9(0),
    splitPos: uniform9(0.5),
    flicker: uniform9(0),
    time: uniform9(0)
  };
}
function createPostLists() {
  return { ...createGradeLists(), ...createDisplayLists() };
}
function applyPostValues(U, P, lists, v, parts = null) {
  P.apply(v);
  const ev = Math.pow(2, v["grade.exposure"]);
  const wb = whiteBalanceGains(v["grade.temperature"], v["grade.tint"]);
  U.exposure.value.set(wb[0] * ev, wb[1] * ev, wb[2] * ev);
  const L = U.lines;
  L.thickness.value = v["lines.screen.thickness"];
  L.silhouette.value = v["lines.screen.silhouette"];
  L.crease.value = v["lines.screen.crease"];
  L.creaseThreshold.value = 1 - Math.cos(v["lines.screen.creaseAngle"] * Math.PI / 180);
  L.depthThreshold.value = v["lines.screen.depthThreshold"];
  L.idWeight.value = v["lines.screen.idWeight"];
  L.followFog.value = v["lines.screen.followFog"];
  PARTS.forEach((p12, i) => {
    const pv = parts?.[p12] || v;
    L.partThickness.array[i] = pv["lines.screen.thickness"];
    const [r, g, b] = hexToRgb(pv["lines.screen.color"]);
    L.partColor.array[i].setRGB(r, g, b, THREE10.LinearSRGBColorSpace);
  });
  for (const id of MASKED) U.masks[id].value = v[`@mask:${id}`] ?? (v[id] ? ALL_PARTS : 0);
  applyGradeLists(lists, v);
  applyDisplayLists(lists, v);
}
function passRequirements(v) {
  const out = /* @__PURE__ */ new Set();
  for (const e of EFFECTS) {
    if (e.always || !e.enabled(v, { samples: 0 })) continue;
    for (const b of e.requires(v)) out.add(b);
    if (e.mask && v[`@partial:${e.mask}`]) out.add("ids");
  }
  if (v["@isolate"]) out.add("ids");
  for (const b of viewById.get(v["@view"])?.requires || []) out.add(b);
  return out;
}
function activeEffects(v) {
  return EFFECTS.filter((e) => !e.always && e.enabled(v, { samples: 0 })).map((e) => e.id);
}
function graphKey(v, passKey) {
  const ctx = { samples: passKey.startsWith("0|") ? 0 : 4 };
  return [passKey, v["@isolate"] ? "isolate" : "", v["@view"] ? `view:${v["@view"]}` : "", ...EFFECTS.filter((e) => e.enabled(v, ctx)).map((e) => `${e.id}${e.key?.(v) ? ":" + e.key(v) : ""}${e.mask && v[`@partial:${e.mask}`] ? "@mask" : ""}`)].join("|");
}
function buildGraph({ styledPass, plainPass, values, P, U, lists, atmos, camera, light, samples }) {
  const owned = [];
  const pixel = values["retro.pixel.enabled"] === true;
  const textures = /* @__PURE__ */ new Map();
  const ctx = {
    v: values,
    P,
    U,
    lists,
    atmos,
    camera,
    light,
    samples,
    pixel,
    pass: styledPass,
    tex: (name) => {
      if (!textures.has(name)) textures.set(name, styledPass.getTextureNode(name));
      return textures.get(name);
    },
    own: (node) => {
      owned.push(node);
      return node;
    },
    /** A texture boundary: renders `c` to a target so the next effect can sample neighbors. */
    texture: (c2) => ctx.own(convertToTexture2(vec47(c2, 1))),
    /** The part index (0–15) of the pixel, from the ids buffer. */
    partIndex: () => int7(round4(ctx.tex("ids").sample(ctx.uv).r.mul(255))),
    /** 1 where the pixel's part has masked switch `id` on. */
    partMask: (id) => float12(U.masks[id].shiftRight(ctx.partIndex()).bitAnd(int7(1)))
  };
  if (pixel) {
    ctx.coord = floor9(screenCoordinate6.xy.div(U.pixelSize));
    ctx.uv = ctx.coord.add(0.5).div(U.lowRes);
    ctx.texel = vec210(1).div(U.lowRes);
    ctx.gridSize = U.lowRes;
    ctx.lineScale = 2 / 3;
  } else {
    ctx.coord = floor9(screenCoordinate6.xy);
    ctx.uv = screenUV3;
    ctx.texel = vec210(1).div(screenSize4);
    ctx.gridSize = screenSize4;
    ctx.lineScale = screenSize4.y.div(1080);
  }
  let c = vec312(ctx.tex("output").sample(ctx.uv).rgb);
  const finals = [];
  for (const e of EFFECTS) {
    if (!e.enabled(values, ctx)) continue;
    if (e.final) {
      finals.push(e);
      continue;
    }
    const before = c;
    c = e.build(c, ctx);
    if (e.mask && values[`@partial:${e.mask}`]) c = mix13(before, c, ctx.partMask(e.mask));
  }
  for (const e of finals) c = e.build(c, ctx);
  if (values["@view"] && viewById.has(values["@view"])) c = designerView(values["@view"], c, ctx);
  if (values["@isolate"]) {
    const ids = ctx.tex("ids");
    const inside = (uv4) => step11(abs10(float12(round4(ids.sample(uv4).r.mul(255))).sub(float12(U.isolate))), 0.5);
    const here = inside(ctx.uv);
    const px = vec210(1.5).div(screenSize4);
    const ring = max10(max10(inside(ctx.uv.add(vec210(px.x, 0))), inside(ctx.uv.sub(vec210(px.x, 0)))), max10(inside(ctx.uv.add(vec210(0, px.y))), inside(ctx.uv.sub(vec210(0, px.y))))).sub(here).max(0);
    c = mix13(mix13(vec312(luminance8(c)), c, 0.25).mul(0.35), c, here);
    c = mix13(c, vec312(0.54, 0.71, 0.97), ring);
  }
  if (U.snapshot) {
    const p12 = U.transitionProgress;
    const n = mx_noise_float4(vec312(screenUV3.mul(6), 0.5)).mul(0.12);
    const wipe = smoothstep13(p12.mul(1.3).sub(0.15), p12.mul(1.3).sub(0.05), screenUV3.x.add(n)).oneMinus();
    const k = select9(U.transitionMode.greaterThan(1.5), wipe, select9(U.transitionMode.greaterThan(0.5), p12, float12(1)));
    c = mix13(U.snapshot.sample(screenUV3).rgb, c, k);
  }
  const plain = renderOutput2(plainPass.getTextureNode("output"), THREE10.ACESFilmicToneMapping, THREE10.SRGBColorSpace).rgb;
  const showPlain = max10(U.hold, max10(U.flicker, U.split.mul(step11(screenUV3.x, U.splitPos))));
  let out = mix13(c, plain, showPlain);
  const divider = smoothstep13(0.5, 1.5, abs10(screenUV3.x.sub(U.splitPos)).mul(screenSize4.x)).oneMinus();
  out = mix13(out, vec312(1), divider.mul(U.split).mul(U.hold.oneMinus()));
  return { node: vec47(out, 1), owned };
}
function disposeOwned(owned) {
  for (const node of owned) {
    node.dispose?.();
    node.textureNode?.dispose?.();
    node.renderTarget?.dispose?.();
  }
}

// src/runtime/render/passes.js
import { PassNode } from "three/webgpu";
function pixelGrid(W, H, rows) {
  const p12 = Math.max(1, Math.round(H / Math.max(1, rows)));
  return { p: p12, width: Math.ceil(W / p12), height: Math.ceil(H / p12) };
}
var StylePassNode = class extends PassNode {
  constructor(scene, camera, options) {
    super(PassNode.COLOR, scene, camera, options);
    this.pixelRows = null;
  }
  setSize(width, height) {
    if (this.pixelRows === null) return super.setSize(width, height);
    this._width = width;
    this._height = height;
    const g = pixelGrid(Math.floor(width * this._pixelRatio), Math.floor(height * this._pixelRatio), this.pixelRows);
    this.renderTarget.setSize(g.width, g.height);
  }
};

// src/runtime/render/rigs.js
import * as THREE11 from "three/webgpu";
function sun(layer) {
  const light = new THREE11.DirectionalLight(16777215, 2);
  light.layers.set(layer);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.bias = -5e-4;
  light.shadow.normalBias = 0.03;
  return light;
}
function hemisphere(layer) {
  const light = new THREE11.HemisphereLight(16777215, 4473924, 1);
  light.layers.set(layer);
  return light;
}
function lightDirection(elevation, azimuth, base) {
  const el = elevation * Math.PI / 180, az = azimuth * Math.PI / 180 + base;
  return new THREE11.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
}
var Rigs = class {
  constructor(scene) {
    this.styled = { sun: sun(LAYER_STYLED), hemi: hemisphere(LAYER_STYLED) };
    this.plain = { sun: sun(LAYER_PLAIN), hemi: hemisphere(LAYER_PLAIN) };
    this.frame = { center: new THREE11.Vector3(), radius: 10, base: 0 };
    for (const rig of [this.styled, this.plain]) {
      scene.add(rig.sun, rig.sun.target, rig.hemi);
    }
    this.direction = new THREE11.Vector3(0, 1, 0);
  }
  /** Fits the shadow cameras to a scene and sets the azimuth reference (the hero shot). */
  setFrame({ center, radius, heroPos, heroTarget }) {
    this.frame.center.set(...center);
    this.frame.radius = radius;
    this.frame.base = Math.atan2(heroPos[0] - heroTarget[0], heroPos[2] - heroTarget[2]);
    for (const { sun: s } of [this.styled, this.plain]) {
      Object.assign(s.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius, near: 0.5, far: radius * 5 });
      s.shadow.camera.updateProjectionMatrix();
      s.target.position.copy(this.frame.center);
    }
    this.place(this.plain.sun, lightDirection(50, 45, this.frame.base));
    this.plain.sun.intensity = 2;
    this.plain.sun.shadow.radius = 1;
  }
  place(light, dir) {
    light.position.copy(this.frame.center).addScaledVector(dir, this.frame.radius * 2.5);
    light.target.updateMatrixWorld();
  }
  /** Applies the lighting module. Returns the world direction toward the key light. */
  apply(v) {
    const { sun: s, hemi } = this.styled;
    this.direction.copy(lightDirection(v["lighting.key.elevation"], v["lighting.key.azimuth"], this.frame.base));
    this.place(s, this.direction);
    s.color.set(v["lighting.key.color"]);
    s.intensity = v["lighting.key.intensity"];
    s.castShadow = v["lighting.shadows.enabled"];
    s.shadow.radius = v["lighting.shadows.softness"];
    const size = v["lighting.shadows.mapSize"];
    if (s.shadow.mapSize.x !== size) {
      s.shadow.mapSize.set(size, size);
      s.shadow.map?.dispose();
      s.shadow.map = null;
    }
    hemi.color.set(v["lighting.ambient.sky"]);
    hemi.groundColor.set(v["lighting.ambient.ground"]);
    hemi.intensity = v["lighting.ambient.intensity"];
    return this.direction;
  }
  dispose() {
    for (const rig of [this.styled, this.plain]) {
      rig.sun.shadow.dispose();
      rig.sun.removeFromParent();
      rig.sun.target.removeFromParent();
      rig.hemi.removeFromParent();
    }
  }
};

// src/runtime/look/timeofday.js
var KEYS = [
  [4, 25, "#8fa4ff", 0.45, "#0b1030", "#28305a", "#3a4a8a", "#1a1a26", 0.45, 1.5],
  [6, 4, "#ff9a7a", 1.6, "#3b4f9a", "#ffb08a", "#8a8ad0", "#4a3a3a", 0.55, 5],
  [7.5, 15, "#ffc890", 2.6, "#4a78c8", "#ffd6b0", "#9ab4e8", "#6a5a4a", 0.6, 6],
  [10, 45, "#fff0dc", 3, "#3b82d8", "#c8e2ff", "#a8ccff", "#6b6b5a", 0.65, 6],
  [13, 65, "#fffaf2", 3.2, "#2f7ae0", "#bfe0ff", "#b0d0ff", "#707060", 0.7, 6],
  [16, 38, "#fff0d6", 3, "#3a7ad0", "#d6e6ff", "#a0c0f0", "#706050", 0.62, 6],
  [17.5, 12, "#ffb066", 3.6, "#3b4c99", "#ff9d5c", "#6e7fd6", "#8b5b3c", 0.5, 8],
  [18.5, 3, "#ff7a48", 2.4, "#2b2a5e", "#ff7a5c", "#6a5a9a", "#3a2a30", 0.45, 8],
  [19.5, 6, "#6d7fd8", 0.6, "#1a2050", "#4a5aa0", "#5060b0", "#202030", 0.55, 1.5],
  [21, 30, "#9fb4ff", 0.55, "#070b20", "#1c2448", "#3a4a8a", "#141420", 0.45, 1.5],
  [22, 30, "#9fb4ff", 0.5, "#070b20", "#1c2448", "#3a4a8a", "#141420", 0.42, 1.5]
];
function timeOfDay(hour, azimuth = 45) {
  const h = Math.min(KEYS[KEYS.length - 1][0], Math.max(KEYS[0][0], hour));
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] < h) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = (h - a[0]) / (b[0] - a[0]);
  const num = (k) => a[k] + (b[k] - a[k]) * t;
  const col = (k) => mixHex(a[k], b[k], t);
  const day = h >= 6 && h <= 19;
  const swing = day ? (h - 12) * 10 : 0;
  return {
    "lighting.key.elevation": Math.round(num(1) * 10) / 10,
    "lighting.key.azimuth": (azimuth + swing + 540) % 360 - 180,
    "lighting.key.color": col(2),
    "lighting.key.intensity": Math.round(num(3) * 100) / 100,
    "atmosphere.sky.zenith": col(4),
    "atmosphere.sky.horizon": col(5),
    "atmosphere.sky.ground": col(5),
    "atmosphere.fog.color": col(5),
    "lighting.ambient.sky": col(6),
    "lighting.ambient.ground": col(7),
    "lighting.ambient.intensity": Math.round(num(8) * 100) / 100,
    "atmosphere.sky.sunIntensity": Math.round(num(9) * 10) / 10
  };
}

// src/runtime/look/resolve.js
var PART_PARENT = { hero: "characters" };
var PART_MODULES = ["lighting", "surface", "lines", "palette", "atmosphere", "media", "retro", "motion"];
function resamplePalette(colors, n) {
  if (!colors.length) return Array(n).fill("#808080");
  if (colors.length === n) return [...colors];
  return Array.from({ length: n }, (_, i) => {
    const x = n === 1 ? 0 : i / (n - 1) * (colors.length - 1);
    const k = Math.min(colors.length - 2, Math.floor(x));
    return colors.length === 1 ? colors[0] : mixHex(colors[k], colors[k + 1], x - k);
  });
}
function mixValue(entry, a, b, t) {
  if (t <= 0) return clone(a);
  if (t >= 1) return clone(b);
  switch (entry.mix) {
    case "lerp": {
      const v = a + (b - a) * t;
      return entry.type === "int" ? Math.round(v) : v;
    }
    case "angle": {
      const d = ((b - a) % 360 + 540) % 360 - 180;
      let v = (a + d * t + 540) % 360 - 180;
      if (v <= -180) v += 360;
      return Math.max(entry.min, Math.min(entry.max, v));
    }
    case "oklab":
      return mixHex(a, b, t);
    case "palette": {
      if (!a.length || !b.length) return clone(t < 0.5 ? a : b);
      const n = Math.max(a.length, b.length);
      const A = resamplePalette(a, n), B = resamplePalette(b, n);
      return A.map((c, i) => mixHex(c, B[i], t));
    }
    default:
      return clone(t < 0.5 ? a : b);
  }
}
var gateOf = (e) => e.enabledBy || (e.type === "bool" && e.structural ? e.id : null);
function blendEntry(e, ma, mb, t) {
  const a = ma[e.id], b = mb[e.id];
  if (t <= 0) return clone(a);
  if (t >= 1) return clone(b);
  if (e.type === "bool" && e.structural) return a || b;
  const gate = gateOf(e);
  if (gate && gate !== e.id) return mixValue(e, ma[gate] ? a : e.neutral, mb[gate] ? b : e.neutral, t);
  return mixValue(e, a, b, t);
}
function applyStrength(values, strength) {
  if (strength >= 1) return values;
  const out = { ...values };
  for (const id of Object.keys(out)) {
    const entry = byId.get(id);
    if (!entry || entry.structural || entry.mix === "step" || entry.mix === "palette") continue;
    out[id] = mixValue(entry, entry.neutral, out[id], Math.max(0, strength));
  }
  return out;
}
function fullValues(look, sceneParams) {
  const global = defaults();
  const sources = Object.fromEntries(REGISTRY.map((e) => [e.id, "registry"]));
  const layer = (params, name) => {
    for (const [id, v] of Object.entries(params || {})) {
      if (!byId.has(id)) continue;
      global[id] = clone(v);
      sources[id] = name;
    }
  };
  if (!look.baseline) layer(sceneParams, "scene");
  layer(look.params, "look");
  const parts = {};
  for (const part of PARTS) {
    const map = {};
    for (const id of PART_PARAMS) map[id] = clone(global[id]);
    const chain = PART_PARENT[part] ? [PART_PARENT[part], part] : [part];
    for (const p12 of chain) for (const [id, v] of Object.entries(look.parts?.[p12]?.params || {})) if (id in map) map[id] = clone(v);
    parts[part] = map;
  }
  return { global, parts, sources };
}
function partRecipe(parts, part) {
  const own = parts?.[part] || {};
  const parent = PART_PARENT[part] ? parts?.[PART_PARENT[part]] || {} : {};
  const look = own.look ?? (own.inherit === false ? null : parent.look) ?? null;
  const modules = own.look ? own.modules : parent.look && own.inherit !== false ? parent.modules : own.modules;
  return {
    look,
    modules: look ? modules && modules.length ? modules : PART_MODULES : [],
    overrides: { ...own.inherit === false ? {} : parent.overrides, ...own.overrides }
  };
}
function resolveRecipe({ recipe, getLook, parts = {}, sceneParams = {}, overrides = {}, strength = 1 }) {
  const cache2 = /* @__PURE__ */ new Map();
  const full = (look) => {
    if (!cache2.has(look)) cache2.set(look, fullValues(look, sceneParams));
    return cache2.get(look);
  };
  const modules = recipe.modules || {};
  const anySolo = Object.values(modules).some((m) => m && m.solo);
  const base = getLook(recipe.base);
  const states = {};
  const state = (module) => {
    if (states[module]) return states[module];
    const r = modules[module] || {};
    const blendWith = r.blend?.with ?? recipe.morph?.with ?? null;
    const t = r.blend?.with ? r.blend.t ?? 0.5 : recipe.morph?.t ?? 0;
    return states[module] = {
      muted: !!r.mute || anySolo && !r.solo,
      src: full(r.from ? getLook(r.from) : base),
      blend: blendWith && t > 0 ? { full: full(getLook(blendWith)), t } : null
    };
  };
  const neutralMap = Object.fromEntries(REGISTRY.map((e) => [e.id, clone(e.neutral)]));
  const global = {};
  const sources = {};
  for (const e of REGISTRY) {
    const s = state(e.module);
    if (s.muted) {
      global[e.id] = clone(e.neutral);
      sources[e.id] = "muted";
      continue;
    }
    if (s.blend) {
      global[e.id] = blendEntry(e, s.src.global, s.blend.full.global, s.blend.t);
      sources[e.id] = "blend";
      continue;
    }
    global[e.id] = clone(s.src.global[e.id]);
    sources[e.id] = s.src.sources[e.id];
  }
  for (const [id, v] of Object.entries(overrides)) {
    if (!byId.has(id)) continue;
    global[id] = clone(v);
    sources[id] = "override";
  }
  if (global["lighting.tod.enabled"]) {
    for (const [id, v] of Object.entries(timeOfDay(global["lighting.tod.hour"], global["lighting.key.azimuth"]))) {
      if (id in overrides) continue;
      global[id] = v;
      sources[id] = "time of day";
    }
  }
  const partMaps = {};
  for (const part of PARTS) {
    const pr = partRecipe(parts, part);
    const own = pr.look ? full(getLook(pr.look)) : null;
    const map = {};
    for (const id of PART_PARAMS) {
      const e = byId.get(id);
      if (own && pr.modules.includes(e.module)) {
        map[id] = clone(own.parts[part][id]);
        continue;
      }
      const s = state(e.module);
      if (s.muted) map[id] = clone(neutralMap[id]);
      else if (s.blend) map[id] = blendEntry(e, s.src.parts[part], s.blend.full.parts[part], s.blend.t);
      else map[id] = clone(s.src.parts[part][id]);
      if (id in overrides) map[id] = clone(overrides[id]);
    }
    for (const [id, v] of Object.entries(pr.overrides)) if (id in map) map[id] = clone(v);
    partMaps[part] = applyStrength(map, strength);
  }
  return { global: applyStrength(global, strength), parts: partMaps, sources };
}
function resolveLook({ look, sceneParams = {}, overrides = {}, partOverrides = {}, strength = 1 }) {
  const parts = Object.fromEntries(Object.entries(partOverrides).map(([p12, o]) => [p12, { overrides: o }]));
  return resolveRecipe({ recipe: { base: look.id ?? "@look" }, getLook: () => look, parts, sceneParams, overrides, strength });
}
function blendResolved(from, to, t) {
  if (t >= 1) return to;
  const global = {};
  for (const e of REGISTRY) global[e.id] = blendEntry(e, from.global, to.global, t);
  const parts = {};
  for (const part of PARTS) {
    const map = {};
    for (const id of PART_PARAMS) map[id] = blendEntry(byId.get(id), from.parts[part], to.parts[part], t);
    parts[part] = map;
  }
  return { global, parts, sources: to.sources };
}
function lookValue(look, sceneParams, id) {
  if (look.params && id in look.params) return look.params[id];
  if (!look.baseline && id in sceneParams) return sceneParams[id];
  return byId.get(id).default;
}
function lookFromResolved(resolved, meta) {
  const params = {};
  for (const e of REGISTRY) {
    const src = resolved.sources[e.id];
    if (src === "registry" || src === "scene") continue;
    if (JSON.stringify(resolved.global[e.id]) === JSON.stringify(e.default) && src !== "override") continue;
    params[e.id] = clone(resolved.global[e.id]);
  }
  const parts = {};
  for (const part of PARTS) {
    const diff = {};
    for (const id of PART_PARAMS) if (JSON.stringify(resolved.parts[part][id]) !== JSON.stringify(resolved.global[id])) diff[id] = clone(resolved.parts[part][id]);
    if (Object.keys(diff).length) parts[part] = { params: diff };
  }
  return { schema: "stylelab.look@1", version: 1, tags: [], pillars: [], mistakes: [], inspiredBy: [], description: "", ...meta, params, parts };
}
function resolvedHash(resolved) {
  const text = JSON.stringify([resolved.global, resolved.parts]);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}

// src/runtime/style.js
var layers = (n) => {
  const l = new THREE12.Layers();
  l.set(n);
  return l;
};
var _size3 = new THREE12.Vector2();
var _v = new THREE12.Vector3();
var _fwd = new THREE12.Vector3();
var StyleRuntime = class {
  /**
   * @param {object} o
   * @param {THREE.WebGPURenderer} o.renderer
   * @param {THREE.PerspectiveCamera} o.camera - the viewer's camera (the plain set renders with it)
   */
  constructor({ renderer, camera }) {
    this.renderer = renderer;
    this.camera = camera;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE12.PCFSoftShadowMap;
    renderer.toneMapping = THREE12.ACESFilmicToneMapping;
    this.styledCamera = camera.clone();
    this.styledCamera.name = "styled camera";
    this.scene = new THREE12.Scene();
    this.U = createPostUniforms();
    this.P = new ParamUniforms();
    this.U.lines.color = this.P.get("lines.screen.color");
    this.lists = createPostLists();
    this.atmos = createAtmosphereUniforms();
    this.atmos.time = this.U.time;
    this.materials = new StyleMaterials({ time: this.U.time, keyDirection: this.atmos.sunDirection });
    this.skyModel = null;
    this.rigs = new Rigs(this.scene);
    this.domes = createSkyDomes(this.atmos, { layerStyled: LAYER_STYLED, layerPlain: LAYER_PLAIN, idsNode: idsNode("sky") });
    this.scene.add(this.domes.styled, this.domes.plain);
    this.particles = createParticles({ time: this.U.time, layer: LAYER_STYLED });
    this.scene.add(this.particles.object);
    this.post = new THREE12.PostProcessing(renderer);
    this.post.outputColorTransform = false;
    this.plainPass = new StylePassNode(this.scene, camera, { samples: 4 }).setLayers(layers(LAYER_PLAIN));
    this.styledPass = null;
    this.passKey = null;
    this.graph = null;
    this.graphKey = null;
    this.grid = null;
    this.root = null;
    this.practicals = [];
    this.focus = new THREE12.Vector3();
    this.values = null;
    this.info = { materialBuilds: 0, graphBuilds: 0, passBuilds: 0, skyBuilds: 0, lastRebuild: null, lastCompileMs: null };
    this.pendingCompile = null;
    this.snapshots = [new THREE12.RenderTarget(1, 1), new THREE12.RenderTarget(1, 1)];
    this.snapshotIndex = 0;
    this.U.snapshot = texture3(this.snapshots[0].texture);
    this.isolate = null;
    this.view = null;
    this.held = new THREE12.RenderTarget(1, 1);
    this.heldPost = new THREE12.PostProcessing(renderer, texture3(this.held.texture));
    this.heldPost.outputColorTransform = false;
    this.heldKey = null;
    this.clock = 0;
    this.apply(resolveLook({ look: { baseline: true, params: {} } }));
  }
  /**
   * Replaces the scene content. `root` comes from a scene builder (kit meshes
   * with userData.style); `def` provides the shadow frame, shots and far plane.
   */
  setScene(root, def) {
    if (this.root) {
      this.materials.clearScene();
      this.scene.remove(this.root);
      this.root.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
      });
    }
    this.root = root;
    this.scene.add(root);
    this.materials.register(root);
    this.materials.blobs.setScene(root);
    this.practicals = [];
    this.adoptLights(root);
    const hero = def.shots[def.defaultShot];
    this.rigs.setFrame({ center: def.shadow.center, radius: def.shadow.radius, heroPos: hero.pos, heroTarget: hero.target });
    this.camera.far = def.far;
    this.camera.updateProjectionMatrix();
    this.fogFocus = def.fogFocus || 0;
    this.apply(this.resolved);
    this.markCompile("scene");
  }
  /**
   * Practical lights (torches, lamps, campfires): the styled set's lights follow the
   * look's practical controls; a twin on the plain layer keeps the scene's own values.
   */
  adoptLights(root) {
    const lights = [];
    root.traverse((o) => {
      if (o.isLight && !o.userData.stylelabTwin && !this.practicals.some((p12) => p12.light === o)) lights.push(o);
    });
    for (const light of lights) {
      light.castShadow = false;
      light.layers.set(LAYER_STYLED);
      const twin = light.clone();
      twin.layers.set(LAYER_PLAIN);
      twin.name = "plain twin";
      twin.userData.stylelabTwin = true;
      light.parent.add(twin);
      const base = { intensity: light.intensity, flicker: light.userData.practical?.flicker ?? 0, seed: light.userData.practical?.seed ?? 0 };
      this.practicals.push({ light, twin, base });
    }
  }
  /** Adds objects to the current scene after setScene (meshes need `userData.style`). */
  add(object, parent = this.root) {
    if (object.parent !== parent) parent.add(object);
    this.materials.register(object);
    this.adoptLights(object);
    this.materials.blobs.setScene(this.root);
    this.apply(this.resolved);
    this.markCompile("add");
  }
  /**
   * Buffers the styled pass writes for the current values, and whether it can use MSAA:
   * only when it writes no extra buffers, the look isn't a pixel look, the AA mode allows
   * it, and no part uses toon water (which copies the depth buffer mid-pass).
   */
  passConfig(v, parts) {
    const buffers = passRequirements(v);
    const pixel = v["retro.pixel.enabled"] === true;
    const water = PARTS.some((p12) => parts[p12]["surface.model"] === "toonWater");
    const msaa = ["auto", "msaa"].includes(v["quality.aa"]) && !buffers.size && !pixel && !water;
    const samples = msaa ? 4 : 0;
    return { buffers, samples, pixel, key: `${samples}|${[...buffers].sort().join(",")}${water ? "|water" : ""}` };
  }
  /**
   * Applies a resolved look (resolveLook()). Returns what was rebuilt.
   * @returns {{parts: string[], pass: boolean, graph: boolean}}
   */
  apply(resolved) {
    this.resolved = resolved;
    const v = this.values = withPartMasks(resolved.global, resolved.parts);
    v["@isolate"] = this.isolate !== null;
    v["@view"] = this.view;
    const before = this.materials.built;
    const parts = this.materials.apply(resolved.parts, v);
    let skyRebuilt = false;
    if (v["atmosphere.sky.model"] !== this.skyModel) {
      skyRebuilt = this.skyModel !== null;
      this.skyModel = v["atmosphere.sky.model"];
      const physical = this.skyModel === "physical";
      setSkyModel(this.domes.styled.material, this.atmos, physical);
      this.scene.fogNode = createFogNode(this.atmos, { physical, amountFor: (m) => this.materials.parts[m?.userData?.part]?.surface.fogAmount ?? null });
      if (skyRebuilt) this.info.skyBuilds++;
    }
    this.particles.apply(v);
    const dir = this.rigs.apply(v);
    const a = this.atmos;
    a.sunDirection.value.copy(dir);
    a.zenith.value.set(v["atmosphere.sky.zenith"]);
    a.horizon.value.set(v["atmosphere.sky.horizon"]);
    a.ground.value.set(v["atmosphere.sky.ground"]);
    a.exponent.value = v["atmosphere.sky.exponent"];
    a.sunColor.value.set(v["lighting.key.color"]).multiplyScalar(v["atmosphere.sky.sunIntensity"]);
    a.sunRadius.value = v["atmosphere.sky.sunSize"] * Math.PI / 360;
    a.sunSoftness.value = v["atmosphere.sky.sunSoftness"];
    a.fogType.value = FOG_TYPES[v["atmosphere.fog.type"]];
    a.fogAmount.value = v["atmosphere.fog.amount"];
    a.fogDensity.value = v["atmosphere.fog.density"];
    a.fogStart.value = v["atmosphere.fog.start"];
    a.fogEnd.value = v["atmosphere.fog.end"];
    a.fogColor.value.set(v["atmosphere.fog.color"]);
    a.fogSkyTint.value = v["atmosphere.fog.skyTint"];
    a.fogBands.value = v["atmosphere.fog.bands"];
    a.heightDensity.value = v["atmosphere.heightFog.density"];
    a.heightBase.value = v["atmosphere.heightFog.base"];
    a.heightFalloff.value = v["atmosphere.heightFog.falloff"];
    a.clouds.value = v["atmosphere.clouds.amount"];
    a.cloudCoverage.value = v["atmosphere.clouds.coverage"];
    a.cloudSoftness.value = v["atmosphere.clouds.softness"];
    a.cloudBands.value = v["atmosphere.clouds.bands"];
    a.cloudScale.value = v["atmosphere.clouds.scale"];
    a.cloudSpeed.value = v["atmosphere.clouds.speed"];
    a.cloudColor.value.set(v["atmosphere.clouds.color"]);
    a.cloudShade.value.set(v["atmosphere.clouds.shade"]);
    a.turbidity.value = v["atmosphere.sky.turbidity"];
    a.rayleigh.value = v["atmosphere.sky.rayleigh"];
    applyPostValues(this.U, this.P, this.lists, v, resolved.parts);
    this.U.isolate.value = this.isolate === null ? -1 : PART_INDEX[this.isolate];
    const cfg = this.passConfig(v, resolved.parts);
    const passRebuilt = cfg.key !== this.passKey;
    if (passRebuilt) {
      this.styledPass?.dispose();
      const p12 = new StylePassNode(this.scene, this.styledCamera, { samples: cfg.samples }).setLayers(layers(LAYER_STYLED));
      if (cfg.buffers.size) {
        const outputs = { output: output4 };
        if (cfg.buffers.has("normal")) outputs.normal = directionToColor(normalView2);
        if (cfg.buffers.has("ids")) outputs.ids = vec48(0);
        if (cfg.buffers.has("velocity")) outputs.velocity = velocity;
        if (cfg.buffers.has("emissive")) outputs.emissive = emissive;
        p12.setMRT(mrt4(outputs));
      }
      this.styledPass = p12;
      this.passKey = cfg.key;
      this.info.passBuilds++;
    }
    this.styledPass.pixelRows = cfg.pixel ? v["retro.pixel.height"] : null;
    this.styledPass.setResolutionScale(cfg.pixel ? 1 : v["quality.resolution"]);
    const key = graphKey(v, cfg.key);
    const graphRebuilt = key !== this.graphKey;
    if (graphRebuilt) {
      const previous = this.graph;
      this.graph = buildGraph({ styledPass: this.styledPass, plainPass: this.plainPass, values: v, P: this.P, U: this.U, lists: this.lists, atmos: this.atmos, camera: this.styledCamera, light: this.rigs.styled.sun, samples: cfg.samples });
      this.post.outputNode = this.graph.node;
      this.post.needsUpdate = true;
      if (previous) disposeOwned(previous.owned);
      this.graphKey = key;
      this.info.graphBuilds++;
    }
    this.info.materialBuilds += this.materials.built - before;
    const rebuilt = { parts, pass: passRebuilt, graph: graphRebuilt, sky: skyRebuilt };
    if (parts.length || passRebuilt || graphRebuilt || skyRebuilt) {
      this.info.lastRebuild = rebuilt;
      this.markCompile("rebuild");
    }
    return rebuilt;
  }
  /** The enabled post and pass effects of the current look, in pipeline order. */
  activeEffects() {
    return activeEffects(this.values);
  }
  /** Reassigns one mesh's part (pick tool); applies the part's look on the next frame. */
  setPart(mesh, part) {
    const ok = this.materials.setPart(mesh, part);
    if (ok) this.markCompile("part");
    return ok;
  }
  markCompile(reason) {
    this.pendingCompile = reason;
  }
  /**
   * Captures the current styled frame for a crossfade or wipe. Call before applying the
   * incoming look; then drive setTransition() from 0 to 1.
   */
  snapshot() {
    const r = this.renderer;
    r.getDrawingBufferSize(_size3);
    this.snapshotIndex = 1 - this.snapshotIndex;
    const rt = this.snapshots[this.snapshotIndex];
    rt.setSize(Math.max(1, _size3.x), Math.max(1, _size3.y));
    const previous = r.getRenderTarget();
    r.setRenderTarget(rt);
    this.post.render();
    r.setRenderTarget(previous);
    this.U.snapshot.value = rt.texture;
  }
  /**
   * Transition composite: mode null (off), 'crossfade' or 'wipe'; progress 0 shows the
   * snapshot, 1 the live frame. Omitted fields keep their value. Uniforms only.
   */
  setTransition({ mode, progress } = {}) {
    if (mode !== void 0) this.U.transitionMode.value = mode === "wipe" ? 2 : mode === "crossfade" ? 1 : 0;
    if (mode === null) this.U.transitionProgress.value = 1;
    if (progress !== void 0) this.U.transitionProgress.value = Math.min(1, Math.max(0, progress));
  }
  /** A designer view (value, squint, silhouette, … see post/views.js), or null for the look. */
  setView(id) {
    const next = id && viewById.has(id) ? id : null;
    if (next === this.view) return;
    this.view = next;
    if (this.resolved) this.apply(this.resolved);
  }
  /** Isolates one part (dims and grays the rest, outlines it), or null. Needs the ids buffer. */
  setIsolate(part) {
    const next = part && PARTS.includes(part) ? part : null;
    if (next === this.isolate) return;
    this.isolate = next;
    if (this.resolved) this.apply(this.resolved);
  }
  /** Compare composite (§6.9): uniforms only, so it takes effect on the next frame. */
  setCompare({ hold, split, splitPos, flicker } = {}) {
    if (hold !== void 0) this.U.hold.value = hold ? 1 : 0;
    if (split !== void 0) this.U.split.value = split ? 1 : 0;
    if (splitPos !== void 0) this.U.splitPos.value = Math.min(1, Math.max(0, splitPos));
    if (flicker !== void 0) this.U.flicker.value = flicker ? 1 : 0;
  }
  /**
   * Animation time `t` on the stepped clock ("animate on twos", §6.4 I): the global value,
   * or a part's own when `part` is given. The camera is never stepped.
   */
  steppedTime(t, part = null) {
    const fps = (part ? this.resolved?.parts[part]?.["motion.stepped.fps"] : this.resolved?.global["motion.stepped.fps"]) || 0;
    return fps > 0 ? Math.floor(t * fps + 1e-6) / fps : t;
  }
  /**
   * Per-frame state: time (freezable by the host; stepped here, per part), the styled
   * camera and pixel grid, dome placement, depth range, the sun's screen position, the
   * focus distance for depth of field, practical lights and blob shadows.
   * @param {number} t - animation time in seconds (unstepped)
   * @param {object} [o] - { focus: Vector3 } the point the camera looks at
   */
  update(t, { focus } = {}) {
    const v = this.values;
    const U = this.U;
    this.clock = t;
    U.time.value = this.steppedTime(t);
    for (const part of PARTS) this.materials.parts[part].surface.time.value = this.steppedTime(t, part);
    t = U.time.value;
    if (focus) this.focus.copy(focus);
    this.syncStyledCamera(v);
    const r = this.camera.far * 0.9;
    for (const d of [this.domes.styled, this.domes.plain]) {
      d.position.copy(this.camera.position);
      d.scale.setScalar(r);
    }
    U.lines.near.value = this.camera.near;
    U.lines.far.value = this.camera.far;
    const cam = this.styledCamera;
    _v.copy(this.atmos.sunDirection.value).multiplyScalar(cam.far * 0.5).add(cam.position).project(cam);
    U.sunScreen.value.set(_v.x * 0.5 + 0.5, 0.5 - _v.y * 0.5);
    cam.getWorldDirection(_fwd);
    const facing = _fwd.dot(this.atmos.sunDirection.value);
    const off = Math.max(Math.abs(_v.x), Math.abs(_v.y));
    U.sunVisible.value = Math.max(0, Math.min(1, facing * 4)) * Math.max(0, Math.min(1, (2.2 - off) / 1.2));
    U.proj.value.copy(cam.projectionMatrix);
    U.projInv.value.copy(cam.projectionMatrixInverse);
    U.lightView.value.copy(this.atmos.sunDirection.value).transformDirection(cam.matrixWorldInverse);
    U.focusDistance.value = Math.max(0.1, _v.copy(this.focus).sub(cam.position).dot(_fwd) + v["lens.dof.offset"]);
    this.atmos.fogOffset.value = (this.fogFocus || 0) * this.focus.distanceTo(cam.position);
    for (const { light, base } of this.practicals) {
      const n = Math.sin(t * 11.3 + base.seed) * 0.5 + Math.sin(t * 23.7 + base.seed * 2.1) * 0.3 + Math.sin(t * 5.1 + base.seed * 0.7) * 0.2;
      light.intensity = base.intensity * v["lighting.practicals.intensity"] * (1 + n * base.flicker * v["lighting.practicals.flicker"] * 0.35);
    }
    this.root?.updateMatrixWorld();
    this.materials.blobs.update();
  }
  /** Copies the viewer's camera; in pixel looks widens it to whole low-res texels. */
  syncStyledCamera(v) {
    const src = this.camera, cam = this.styledCamera;
    cam.position.copy(src.position);
    cam.quaternion.copy(src.quaternion);
    cam.fov = src.fov;
    cam.aspect = src.aspect;
    cam.near = src.near;
    cam.far = src.far;
    cam.zoom = src.zoom;
    this.renderer.getDrawingBufferSize(_size3);
    const W = Math.floor(_size3.x), H = Math.floor(_size3.y);
    const view = src.view && src.view.enabled ? src.view : null;
    if (v["retro.pixel.enabled"]) {
      const g = this.grid = pixelGrid(W, H, v["retro.pixel.height"]);
      cam.setViewOffset(W, H, view ? view.offsetX * W / view.fullWidth : 0, view ? view.offsetY * H / view.fullHeight : 0, g.width * g.p, g.height * g.p);
      this.U.pixelSize.value = g.p;
      this.U.lowRes.value.set(g.width, g.height);
    } else {
      this.grid = null;
      if (view) cam.setViewOffset(view.fullWidth, view.fullHeight, view.offsetX, view.offsetY, view.width, view.height);
      else cam.clearViewOffset();
    }
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }
  render() {
    const fps = this.values?.["motion.lowFps.fps"] || 0;
    if (fps > 0) return this.renderHeld(fps);
    this.heldKey = null;
    this.renderNow();
  }
  /**
   * Low frame-rate rendering: a new frame is drawn into the held target only when the clock
   * enters a new 1/fps slot (or the compare state, the graph or the size changed, so holding
   * Space still swaps at once); every call shows the held frame, camera included.
   */
  renderHeld(fps) {
    const r = this.renderer;
    r.getDrawingBufferSize(_size3);
    const U = this.U;
    const key = [Math.floor(this.clock * fps + 1e-6), U.hold.value, U.split.value, U.splitPos.value, U.flicker.value, this.graphKey, _size3.x, _size3.y].join("|");
    if (key !== this.heldKey) {
      this.held.setSize(Math.max(1, _size3.x), Math.max(1, _size3.y));
      const previous = r.getRenderTarget();
      r.setRenderTarget(this.held);
      this.renderNow();
      r.setRenderTarget(previous);
      this.heldKey = key;
    }
    this.heldPost.render();
  }
  renderNow() {
    if (this.pendingCompile) {
      const t0 = performance.now();
      this.post.render();
      this.info.lastCompileMs = performance.now() - t0;
      this.pendingCompile = null;
      return;
    }
    this.post.render();
  }
  dispose() {
    if (this.root) this.root.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });
    this.materials.dispose();
    if (this.graph) disposeOwned(this.graph.owned);
    this.styledPass?.dispose();
    this.plainPass.dispose();
    for (const rt of this.snapshots) rt.dispose();
    this.held.dispose();
    this.heldPost.dispose();
    this.particles.object.material.dispose();
    this.particles.object.geometry.dispose();
    this.post.dispose();
    this.rigs.dispose();
  }
};

// src/runtime/create.js
import * as THREE14 from "three/webgpu";

// src/runtime/look/validate.js
var LOOK_SCHEMA = "stylelab.look@1";
function checkValue(entry, value) {
  switch (entry.type) {
    case "float":
    case "angle":
    case "int":
      if (typeof value !== "number" || !Number.isFinite(value)) return "expected a number";
      if (entry.type === "int" && !Number.isInteger(value)) return "expected an integer";
      if (value < entry.min || value > entry.max) return `out of range ${entry.min}…${entry.max}`;
      return null;
    case "bool":
      return typeof value === "boolean" ? null : "expected true or false";
    case "enum":
      return entry.options.some((o) => o.value === value) ? null : `expected one of ${entry.options.map((o) => o.value).join(", ")}`;
    case "color":
      return isHex(value) ? null : "expected a hex color";
    case "palette":
      return Array.isArray(value) && value.every(isHex) ? null : "expected an array of hex colors";
    default:
      return `unknown type ${entry.type}`;
  }
}
function checkParams(params, where, errors, { partScoped = false } = {}) {
  for (const [id, value] of Object.entries(params || {})) {
    const entry = byId.get(id);
    if (!entry) {
      errors.push(`${where}: unknown parameter ${id}`);
      continue;
    }
    if (partScoped && entry.scope === "global") errors.push(`${where}: ${id} can't be set per part`);
    const problem = checkValue(entry, value);
    if (problem) errors.push(`${where}: ${id} ${problem} (got ${JSON.stringify(value)})`);
  }
}
function validateLook(look) {
  const errors = [];
  if (!look || typeof look !== "object") return { ok: false, errors: ["not an object"] };
  if (look.schema !== LOOK_SCHEMA) errors.push(`schema must be ${LOOK_SCHEMA}`);
  if (typeof look.id !== "string" || !/^[a-z0-9-]+$/.test(look.id)) errors.push("id must be kebab-case");
  if (typeof look.name !== "string" || !look.name) errors.push("name is required");
  checkParams(look.params, "params", errors);
  if (look.lut !== void 0 && !(look.lut && Number.isInteger(look.lut.size) && look.lut.size >= 2 && typeof look.lut.rgb === "string")) errors.push("lut must be { title, size, rgb (base64) } (an imported .cube)");
  for (const [part, def] of Object.entries(look.parts || {})) {
    if (!PARTS.includes(part)) {
      errors.push(`parts: unknown part ${part}`);
      continue;
    }
    checkParams(def.params, `parts.${part}`, errors, { partScoped: true });
  }
  return { ok: errors.length === 0, errors };
}
var MIGRATIONS = {};
function migrateLook(look) {
  let current = look;
  while (current.schema !== LOOK_SCHEMA) {
    const step12 = MIGRATIONS[current.schema];
    if (!step12) throw new Error(`Can't read look schema ${current.schema}`);
    current = step12(current);
  }
  return current;
}

// src/runtime/parts/convert.js
import * as THREE13 from "three/webgpu";

// src/runtime/parts/guess.js
var PART_KEYWORDS = [
  ["hero", ["player", "hero", "protagonist", "avatar"]],
  ["water", ["water", "sea", "ocean", "lake", "river", "pond", "wave", "waves"]],
  ["sky", ["sky", "skybox", "skydome", "cloud", "sun", "moon"]],
  ["foliage", ["tree", "leaf", "leaves", "bush", "plant", "grass", "flower", "foliage", "hedge", "pine", "palm", "fern", "vine", "branch", "canopy", "shrub", "trunk"]],
  ["characters", ["char", "character", "npc", "enemy", "body", "head", "human", "person", "people", "animal", "goose", "mannequin", "robot", "knight", "monster", "creature", "face", "hair", "arm", "leg", "hand", "torso", "eye", "skin"]],
  ["architecture", ["wall", "roof", "house", "building", "door", "window", "tower", "bridge", "column", "pillar", "stair", "stairs", "arch", "castle", "temple", "shrine", "brick", "chimney", "balcony", "facade", "floor", "ceiling"]],
  ["terrain", ["ground", "terrain", "road", "street", "land", "landscape", "cliff", "path", "sand", "dirt", "soil", "pavement", "island", "mountain", "hill", "rock", "rocks"]],
  ["vfx", ["fire", "flame", "glow", "magic", "particle", "particles", "fx", "vfx", "emissive", "neon", "spark", "laser", "hologram"]]
];
function tokenize(name = "") {
  return String(name).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z]+/).filter(Boolean);
}
function keywordPart(name) {
  const tokens = tokenize(name);
  if (!tokens.length) return null;
  for (const [part, words] of PART_KEYWORDS) {
    for (const w of words) {
      if (tokens.some((t) => t === w || t === `${w}s` || t === `${w}es`)) return { part, reason: `name "${w}"` };
    }
  }
  return null;
}
var explicitPart = (userData = {}) => {
  const p12 = userData.part ?? userData.stylePart ?? userData.style?.part;
  return PARTS.includes(p12) ? p12 : null;
};
function guessParts(items) {
  const out = items.map((it) => {
    const tagged = explicitPart(it.userData);
    if (tagged) return { part: tagged, reason: "tag" };
    for (const name of [it.name, it.materialName, ...it.ancestors || []]) {
      const k = keywordPart(name);
      if (k) return k;
    }
    if ((it.emissive || 0) > 0.15) return { part: "vfx", reason: "emissive material" };
    return null;
  });
  if (!out.some((g) => g && g.part === "terrain")) {
    const boxes = items.map((it) => it.box).filter(Boolean);
    if (boxes.length) {
      const minY = Math.min(...boxes.map((b) => b.min[1])), maxY = Math.max(...boxes.map((b) => b.max[1]));
      const height = Math.max(1e-6, maxY - minY);
      let best = -1, bestArea = 0;
      items.forEach((it, i) => {
        if (out[i] || !it.box) return;
        const [sx, sy, sz] = it.box.max.map((v, k) => v - it.box.min[k]);
        const flat = sy < 0.2 * Math.max(sx, sz);
        const low = it.box.min[1] <= minY + height * 0.15;
        const area = sx * sz;
        if (flat && low && area > bestArea) {
          best = i;
          bestArea = area;
        }
      });
      if (best >= 0) {
        const [r, g, b] = items[best].color || [0.5, 0.5, 0.5];
        out[best] = b > r * 1.25 && b > g * 1.05 ? { part: "water", reason: "largest flat surface, blue" } : { part: "terrain", reason: "largest flat surface at the bottom" };
      }
    }
  }
  return out.map((g) => g || { part: "props", reason: "default" });
}

// src/runtime/parts/convert.js
var firstMaterial = (m) => (Array.isArray(m.material) ? m.material[0] : m.material) || {};
var emissiveStrength = (mat) => mat.emissive ? Math.max(mat.emissive.r, mat.emissive.g, mat.emissive.b) * (mat.emissiveIntensity ?? 1) : 0;
function describeMesh(m, stop = null) {
  const mat = firstMaterial(m);
  const box = new THREE13.Box3().setFromObject(m);
  const ancestors = [];
  for (let p12 = m.parent; p12 && p12 !== stop; p12 = p12.parent) if (p12.name) ancestors.push(p12.name);
  return {
    name: m.name,
    materialName: mat.name,
    ancestors,
    userData: { ...mat.userData?.stylelab, ...m.userData },
    emissive: emissiveStrength(mat),
    color: mat.color ? [mat.color.r, mat.color.g, mat.color.b] : null,
    box: { min: box.min.toArray(), max: box.max.toArray() }
  };
}
function styleFromMaterial(m, part) {
  const mat = firstMaterial(m);
  const em = emissiveStrength(mat);
  const tagged = mat.userData?.stylelab || {};
  return {
    part,
    color: tagged.color || (mat.color ? `#${mat.color.getHexString()}` : "#cccccc"),
    roughness: tagged.roughness ?? mat.roughness ?? 0.8,
    metalness: tagged.metalness ?? mat.metalness ?? 0,
    emissive: tagged.emissive ?? (em > 0.01 ? `#${mat.emissive.getHexString()}` : null),
    emissiveIntensity: tagged.emissiveIntensity ?? mat.emissiveIntensity ?? 1,
    opacity: mat.transparent ? mat.opacity ?? 1 : 1,
    doubleSided: mat.side === THREE13.DoubleSide,
    map: mat.map || null,
    vertexColors: !!(mat.vertexColors && m.geometry.getAttribute("color")),
    role: tagged.role
  };
}
function tagMeshes(root, { guess = true, stop = root.parent } = {}) {
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh && !o.userData.style && !o.userData.stylelabTwin) meshes.push(o);
  });
  const guesses = guess ? guessParts(meshes.map((m) => describeMesh(m, stop))) : meshes.map((m) => ({ part: m.userData.part || firstMaterial(m).userData?.stylelab?.part || "props", reason: "tag or default" }));
  meshes.forEach((m, i) => {
    if (!m.geometry.getAttribute("normal")) m.geometry.computeVertexNormals();
    m.userData.style = styleFromMaterial(m, guesses[i].part);
    m.userData.guess = guesses[i];
  });
  return { meshes, guesses };
}

// src/runtime/create.js
var PLAIN = { schema: "stylelab.look@1", id: "plain", name: "Plain", baseline: true, params: {} };
var ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function frameOf(scene, camera) {
  scene.updateMatrixWorld(true);
  const box = new THREE14.Box3();
  scene.traverse((o) => {
    if (o.isMesh && !o.userData.stylelabTwin) box.expandByObject(o);
  });
  const sphere = box.isEmpty() ? new THREE14.Sphere(new THREE14.Vector3(), 10) : box.getBoundingSphere(new THREE14.Sphere());
  const center = sphere.center.toArray();
  return {
    shadow: { center, radius: Math.max(2, Math.min(sphere.radius, 60)) },
    shots: { main: { pos: camera.position.toArray(), target: center, fov: camera.fov } },
    defaultShot: "main",
    far: camera.far
  };
}
var autoQuality = () => globalThis.navigator?.userAgentData?.mobile ?? /Mobi|Android|iPhone|iPad/.test(globalThis.navigator?.userAgent || "") ? "mobile" : "desktop";
var Style = class {
  constructor({ renderer, scene, camera, looks = [], quality = "auto", sceneParams = {}, frame = null, convert = true, lens = true }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.sceneParams = sceneParams;
    this.looks = /* @__PURE__ */ new Map([["plain", PLAIN]]);
    this.plan = null;
    for (const l of looks) this.addLook(l);
    this.current = looks.length ? looks[0].looks ? looks[0].looks[0].id : looks[0].id : "plain";
    this.quality = quality === "auto" ? autoQuality() : quality;
    this.overrides = {};
    this.partOverrides = {};
    this.zoneWeights = {};
    this.transition = null;
    this.time = 0;
    this.focus = new THREE14.Vector3();
    this.baseFov = camera.fov;
    this.lens = lens;
    scene.traverse((o) => {
      if (o.isDirectionalLight || o.isHemisphereLight || o.isAmbientLight) {
        o.visible = false;
        o.userData.stylelabHidden = true;
      }
    });
    if (convert) tagMeshes(scene);
    this.runtime = new StyleRuntime({ renderer, camera });
    const def = frame || frameOf(scene, camera);
    this.focus.fromArray(def.shadow.center);
    this.runtime.setScene(scene, def);
    this.resolved = this.resolve();
    this.runtime.apply(this.resolved);
  }
  /** Adds a look (JSON) or a looks.json plan ({ looks, plan, modes }). */
  addLook(json) {
    if (json.looks) {
      this.plan = json;
      for (const l of json.looks) this.addLook(l);
      return;
    }
    const { ok, errors } = validateLook(json);
    if (!ok) throw new Error(`createStyle: invalid look ${json.id}: ${errors.slice(0, 3).join("; ")}`);
    if (json.lut) setCustomLut(decodeLut(json.lut));
    this.looks.set(json.id, json);
  }
  /** Resolves the current look with tweaks, quality tier and zone weights. */
  resolve(id = this.current) {
    const getLook = (x) => this.looks.get(x) || PLAIN;
    const look = getLook(id);
    const tier = this.quality === "mobile" ? look.tiers?.mobile?.params || {} : {};
    const parts = Object.fromEntries(Object.entries(this.partOverrides).map(([p12, o]) => [p12, { overrides: o }]));
    let r = resolveRecipe({ recipe: { base: id }, getLook, parts, sceneParams: this.sceneParams, overrides: { ...tier, ...this.overrides } });
    for (const [zid, w] of Object.entries(this.zoneWeights)) {
      if (w > 0 && this.looks.has(zid) && zid !== id) r = blendResolved(r, resolveRecipe({ recipe: { base: zid }, getLook, sceneParams: this.sceneParams, overrides: tier }), Math.min(1, w));
    }
    return r;
  }
  /** A material for a new mesh: tagged with its part, colored by the look. */
  material({ part = "props", color = "#cccccc", role, roughness = 0.8, metalness = 0, emissive: emissive2 = null, emissiveIntensity = 1 } = {}) {
    if (!PARTS.includes(part)) throw new Error(`style.material: unknown part ${part} (use one of ${PARTS.join(", ")})`);
    const m = new THREE14.MeshStandardMaterial({ color, roughness, metalness });
    m.userData.stylelab = { part, color, role, roughness, metalness, emissive: emissive2, emissiveIntensity };
    return m;
  }
  /** Tags a mesh (or every mesh under an object) with a part. */
  tag(object, part) {
    object.traverse((o) => {
      if (o.isMesh && !o.userData.stylelabTwin) {
        o.userData.part = part;
        if (o.userData.style) o.userData.style.part = part;
      }
    });
    return object;
  }
  /**
   * Retrofit: styles every untagged mesh under `root` in one call, keeping its color and
   * guessing its part from names and shape. Returns the guesses, with reasons.
   */
  convertScene(root = this.scene, { guessParts: guessParts2 = true } = {}) {
    const { meshes, guesses } = tagMeshes(root, { guess: guessParts2 });
    this.runtime.add(root, root.parent || this.scene);
    return meshes.map((m, i) => ({ name: m.name, part: guesses[i].part, reason: guesses[i].reason }));
  }
  /** Adds a new object to the styled scene (tags untagged meshes first). */
  add(object, parent = this.scene) {
    tagMeshes(object, { guess: false });
    this.runtime.add(object, parent);
    return object;
  }
  /** Switches looks: { transition: 'morph' | 'crossfade' | 'wipe' | 'cut', duration }. */
  setLook(id, { transition = "morph", duration = 0.8 } = {}) {
    if (!this.looks.has(id)) throw new Error(`style.setLook: unknown look ${id}`);
    const from = this.resolved;
    this.current = id;
    const to = this.resolve();
    if (transition === "cut" || duration <= 0) {
      this.transition = null;
      this.runtime.setTransition({ mode: null });
      return this.show(to);
    }
    if (transition !== "morph") this.runtime.snapshot();
    this.transition = { type: transition, from, to, t: 0, duration };
    if (transition !== "morph") {
      this.runtime.setTransition({ mode: transition, progress: 0 });
      this.show(to);
    } else this.show(blendResolved(from, to, 0));
  }
  /** Zone weights by look id, e.g. from trigger volumes: { crypt: 0.7 }. */
  setZoneWeights(weights) {
    this.zoneWeights = { ...weights };
    this.show(this.resolve());
  }
  /** A Tune value for the whole look, or for one part. */
  setParam(id, value, { part = null } = {}) {
    if (!byId.has(id)) throw new Error(`style.setParam: unknown parameter ${id}`);
    if (part) this.partOverrides[part] = { ...this.partOverrides[part], [id]: value };
    else this.overrides[id] = value;
    this.show(this.resolve());
  }
  /** 'desktop' | 'mobile' | 'auto': mobile applies the look's phone tier. */
  setQuality(q) {
    this.quality = q === "auto" ? autoQuality() : q;
    this.show(this.resolve());
  }
  show(r) {
    this.resolved = r;
    return this.runtime.apply(r);
  }
  /** Advances transitions and renders. `dt` defaults to the time since the last call. */
  render(dt) {
    const now = performance.now() / 1e3;
    if (dt === void 0) dt = this.last ? Math.min(0.1, now - this.last) : 0;
    this.last = now;
    this.time += dt;
    const tr = this.transition;
    if (tr) {
      tr.t = Math.min(1, tr.t + dt / tr.duration);
      if (tr.type === "morph") this.show(tr.t >= 1 ? tr.to : blendResolved(tr.from, tr.to, ease(tr.t)));
      else this.runtime.setTransition({ progress: ease(tr.t) });
      if (tr.t >= 1) {
        this.transition = null;
        this.runtime.setTransition({ mode: null });
      }
    }
    if (this.lens && this.camera.isPerspectiveCamera) this.applyLens();
    this.runtime.update(this.time, { focus: this.focus });
    this.runtime.render();
  }
  /**
   * The look's lens: the base FOV times lens.fovScale, with the camera dollied along its
   * view line so the focus keeps its size on screen (only the perspective changes), as in
   * Style Lab.
   */
  applyLens() {
    const cam = this.camera;
    const next = Math.min(110, this.baseFov * (this.resolved.global["lens.fovScale"] ?? 1));
    if (Math.abs(next - cam.fov) < 1e-6) return;
    const k = Math.tan(cam.fov * Math.PI / 360) / Math.tan(next * Math.PI / 360);
    cam.position.sub(this.focus).multiplyScalar(k).add(this.focus);
    cam.fov = next;
    cam.updateProjectionMatrix();
  }
  dispose() {
    this.runtime.dispose();
    this.scene.traverse((o) => {
      if (o.userData.stylelabHidden) o.visible = true;
    });
  }
};
async function createStyle(options) {
  if (options.renderer.init && !options.renderer._initialized) await options.renderer.init();
  return new Style(options);
}

// src/runtime/brief/brief.js
var BRIEF_TARGETS = { runtime: "three.js r182 + Style Lab runtime", three: "three.js r182 without the runtime", engine: "Engine-agnostic spec (Godot, Unity, Unreal)" };
var BRIEF_LENGTHS = { short: "Short", standard: "Standard", full: "Full" };
var PHONE = { cheap: "Phone-safe: runs on most phones", medium: "High-end phones", heavy: "Desktop only" };
var PART_NAMES = { sky: "Sky", terrain: "Terrain", water: "Water", foliage: "Foliage", architecture: "Architecture", props: "Props", characters: "Characters", hero: "Hero", vfx: "VFX" };
var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
var EFFECT_PARAMS = {
  "grade.toneMapping": ["grade.toneMapping", "grade.exposure", "grade.temperature", "grade.tint"],
  "grade.basic": ["grade.lift", "grade.gamma", "grade.gain", "grade.contrast", "grade.saturation", "grade.vibrance", "grade.hue", "grade.split.shadows", "grade.split.highlights", "grade.split.balance", "grade.split.amount"],
  "quality.fxaa": ["quality.aa"],
  "quality.smaa": ["quality.aa"],
  "quality.traa": ["quality.aa"],
  "retro.quantize": ["retro.quantize.mode", "retro.quantize.levels", "retro.quantize.palette", "retro.dither.amount", "retro.dither.pattern"]
};
var paramsOf = (id) => EFFECT_PARAMS[id] || REGISTRY.filter((e) => e.id.startsWith(`${id}.`)).map((e) => e.id);
var THREE_HINTS = {
  "lighting.ao": "GTAONode (three/addons/tsl/display/GTAONode.js) at half resolution",
  "lighting.contact": "a short screen-space ray march toward the sun on the depth buffer",
  "lens.bloom": "BloomNode (three/addons/tsl/display/BloomNode.js)",
  "atmosphere.godRays": "a radial blur of the bright sky toward the sun's screen position",
  "lens.motionBlur": "MotionBlur (three/addons/tsl/display/MotionBlur.js) with a velocity MRT",
  "lens.dof": "DepthOfFieldNode (three/addons/tsl/display/DepthOfFieldNode.js)",
  "lens.tiltShift": "a vertical blur band (GaussianBlurNode) masked by screen height",
  "quality.traa": "TRAANode (three/addons/tsl/display/TRAANode.js), applied last",
  "grade.toneMapping": "renderOutput() with the tone mapping below",
  "grade.basic": "cdl(), saturation(), vibrance(), hue() from three/tsl",
  "grade.lut": "texture3D() lookup of the exported grade.cube",
  "media.kuwahara": "a generalized Kuwahara filter (8 sectors)",
  "media.halftone": "rotated dot screens on luminance, in screen space",
  "media.hatching": "rotated line screens below light thresholds",
  "lines.screen": "Laplacian of inverse depth + normal and id edges from an MRT pass",
  "retro.pixel": "render at ⌈H/p⌉ rows, nearest upscale, camera snapped to whole texels",
  "quality.fxaa": "FXAANode",
  "quality.smaa": "SMAANode",
  "retro.quantize": "posterize or nearest-palette in OKLab, Bayer dither before quantizing",
  "retro.crt": "scanlines, aperture mask, barrel curvature",
  "lighting.ssgi": "SSGINode (three/addons/tsl/display/SSGINode.js) on the depth and normal MRT",
  "lens.flare": "LensflareNode (three/addons/tsl/display/LensflareNode.js) on the HDR image, softened",
  "lens.anamorphic": "AnamorphicNode (three/addons/tsl/display/AnamorphicNode.js) at half resolution",
  "lens.afterimage": "AfterImageNode-style feedback (blend toward the previous frame)",
  "grade.sepia": "sepia() (three/addons/tsl/display/Sepia.js)",
  "grade.bleach": "bleach() (three/addons/tsl/display/BleachBypass.js)",
  "lines.sobel": "a 3 × 3 Sobel kernel on luminance (SobelOperatorNode as a reference)",
  "lines.highlight": "dilate a mask of tagged objects from an ids MRT (OutlineNode as an alternative)",
  "media.sharpen": "unsharp mask: image + (image − 4-tap blur) × amount",
  "motion.speedLines": "angular cells around a center, re-randomized 12 times a second",
  "retro.vhs": "row jitter, horizontal chroma smear on a luma/chroma split, rolling noise"
};
function notable(e, v, values) {
  if (e.enabledBy && !values[e.enabledBy]) return false;
  return !same(v, e.default);
}
var line = (e, v) => `- ${formatBrief(e, v)}`;
function section(title, lines) {
  return lines.length ? [`## ${title}`, ...lines, ""] : [];
}
function moduleLines(module, values, { skip = () => false } = {}) {
  return REGISTRY.filter((e) => e.module === module && !skip(e) && notable(e, values[e.id], values)).map((e) => line(e, values[e.id]));
}
function postChain(global, parts) {
  const v = withPartMasks(global, parts);
  const active = new Set(activeEffects(v));
  return EFFECTS.filter((e) => active.has(e.id) || e.always && paramsOf(e.id).some((id) => byId.has(id) && notable(byId.get(id), v[id], v))).map((e) => ({
    id: e.id,
    label: e.label,
    masked: !!(e.mask && v[`@partial:${e.mask}`]),
    parts: e.mask && v[`@partial:${e.mask}`] ? PARTS.filter((p12) => parts[p12][e.mask]) : null,
    params: paramsOf(e.id).filter((id) => byId.has(id)).map((id) => byId.get(id)).filter((p12) => p12.type !== "bool" && (!p12.enabledBy || v[p12.enabledBy]))
  }));
}
function partDiffs(resolved) {
  const out = {};
  for (const part of PARTS) {
    const rank = (id) => id.startsWith("lines.") ? 0 : id.startsWith("surface.model") ? 1 : 2;
    const diff = Object.entries(resolved.parts[part]).filter(([id, v]) => !same(v, resolved.global[id])).sort((a, b) => rank(a[0]) - rank(b[0]));
    if (diff.length) out[part] = diff;
  }
  return out;
}
function paletteRows(g) {
  const rows = [];
  if (g["palette.remap"] > 0 && g["palette.colors"].length) rows.push(["Palette (base colors snap to these)", g["palette.colors"].join(" ")]);
  rows.push(["Sky (zenith → horizon)", `${g["atmosphere.sky.zenith"]} → ${g["atmosphere.sky.horizon"]}`]);
  rows.push(["Shadow tint", `${g["surface.shadowTint"]} at ${Math.round(g["surface.shadowTintStrength"] * 100)}%`]);
  rows.push(["Key light", g["lighting.key.color"]]);
  if (g["atmosphere.fog.type"] !== "off") rows.push(["Fog", g["atmosphere.fog.color"]]);
  if (g["lines.screen.enabled"] || g["lines.hull.enabled"]) rows.push(["Ink", g["lines.screen.enabled"] ? g["lines.screen.color"] : g["lines.hull.color"]]);
  return rows;
}
function implementation(target, look) {
  if (target === "runtime") return [
    "1. Add `stylelab-runtime.js`, `stylelab-kit.js` and `look.json` (exported with this brief) to the project. Use the import map from `starter.html` (three r182 from jsDelivr).",
    "2. Create the style once:",
    "   ```js",
    "   import { createStyle } from './stylelab-runtime.js';",
    `   const style = await createStyle( { renderer, scene, camera, looks: [ LOOK ] } ); // LOOK = the ${look.id} look.json`,
    "   ```",
    "3. Never create `MeshStandardMaterial` directly. Use `style.material( { part, color, role } )`, e.g. `style.material( { part: 'architecture', color: '#d9a066', role: 'wall' } )`.",
    `4. Tag every mesh with its part: ${PARTS.filter((p12) => p12 !== "sky").join(" | ")} (\`style.tag( mesh, part )\`). Add new objects with \`style.add( object )\`.`,
    "5. Render with `style.render()` instead of `renderer.render()`.",
    "6. Existing game? Call `style.convertScene( scene )` once after building it: it keeps each color and guesses parts."
  ];
  if (target === "three") return [
    "Implement the look yourself in three.js r182 (WebGPURenderer, TSL). Build it as: a styled material per part (custom lighting model with the bands, shadow tint, rim and specular below), a scene pass with MRT (output, normal, ids, depth) when lines or AO are on, then the post chain below in order. Building blocks per effect are listed with the chain.",
    "Keep every continuous value a uniform, so tuning never recompiles shaders."
  ];
  return [
    "No code: recreate each section with your engine's tools. Godot: a ShaderMaterial with a light() function for the bands; Environment for fog and glow; a CompositorEffect for lines. Unity (URP): a custom lit shader graph; Volume overrides for post; a renderer feature for outlines. Unreal: a material function for the light ramp; Post Process Volume; a post-process material for lines.",
    "Import `grade.cube` as the color-grading LUT (display-referred, after tone mapping) and `palette.gpl` into your paint tools."
  ];
}
function inkRule(g, resolved) {
  const hull = PARTS.filter((p12) => resolved.parts[p12]["lines.hull.enabled"]);
  if (g["lines.screen.enabled"]) return `- Ink: ${g["lines.screen.thickness"]} px screen-space lines in ${g["lines.screen.color"]}.`;
  if (g["lines.hull.enabled"]) return `- Ink: ${g["lines.hull.thickness"]} px outlines in ${g["lines.hull.color"]} on everything.`;
  if (hull.length) return `- Ink: ${resolved.parts[hull[0]]["lines.hull.thickness"]} px outlines in ${resolved.parts[hull[0]]["lines.hull.color"]} only on ${hull.map((p12) => PART_NAMES[p12].toLowerCase()).join(", ")}.`;
  return "- No outlines.";
}
function proceduralRules(target, short) {
  if (short) return ["- Build assets in code (three.js geometry, part-tagged, seeded, with complexity tiers), like `stylelab-kit.js`; put detail in geometry, not textures."];
  return [
    "- **Build assets procedurally, in code,** the way `stylelab-kit.js` does: compose three.js primitives (boxes, cylinders, lathes, extrusions), merge them per material, and tag each mesh with its part. Code-built assets stay readable and editable, fit in one HTML file, and this look's lighting, lines and grade dress them up.",
    "- **Seeded randomness** for variety (a small PRNG with a seed per object), so a level rebuilds identically every time.",
    "- **Complexity tiers** in every builder: Blockout (raw primitives) → Low-poly (intentional facets) → Crafted (bevels, smooth normals) → Detailed (subdivision, displacement). The same layout and colors at every tier.",
    "- **Detail is geometry, not image textures:** panel seams, bevels, inset plates, trim, rivets, stones. Flat-colored low-poly models with geometric detail read well in every look.",
    target === "runtime" ? "- Start from the kit: `import { house, tree, crate, character } from './stylelab-kit.js'` and extend it in the same style." : "- The kit's source (`stylelab-kit.js`) shows the pattern even if you don't run it."
  ];
}
function generateBrief({ look, resolved, target = "runtime", length: length6 = "standard", shareUrl = null, mixedFrom = [], plan = null, tier = null }) {
  const g = resolved.global;
  const short = length6 === "short", full = length6 === "full";
  const name = look.name;
  const chain = postChain(g, resolved.parts);
  const out = [];
  out.push(`# Art direction: ${name} (stylelab look ${look.id}@${look.version ?? 1})`);
  if (shareUrl) out.push(`Reopen in Style Lab: ${shareUrl}`);
  out.push(`Target: ${BRIEF_TARGETS[target]}. Inspired by ${(look.inspiredBy || []).join(", ") || "original work"}${mixedFrom.length > 1 ? `; mixed from ${mixedFrom.join(" + ")}` : ""}.`);
  if (look.description) out.push(look.description);
  out.push("");
  const pillars = (look.pillars || []).slice(0, short ? 4 : 5);
  if (pillars.length) out.push(...section("Pillars (never break these)", pillars.map((p12, i) => `${i + 1}. ${p12}`)));
  if (short) {
    const rules = [
      `- Shading: ${valueLabel(byId.get("surface.model"), g["surface.model"])}${g["surface.model"] !== "pbr" ? `, ${g["surface.bands"]} light band${g["surface.bands"] > 1 ? "s" : ""}` : ""}; shadows tinted ${g["surface.shadowTint"]}.`,
      inkRule(g, resolved),
      `- Light: key ${g["lighting.key.color"]} from ${g["lighting.key.elevation"]}° up; sky ${g["atmosphere.sky.zenith"]} → ${g["atmosphere.sky.horizon"]}.`,
      g["atmosphere.fog.type"] !== "off" ? `- Fog: ${g["atmosphere.fog.type"]}, ${g["atmosphere.fog.color"]}.` : "- No fog.",
      `- Post: ${chain.map((e) => e.label).join(" → ") || "none"}.`,
      ...g["palette.remap"] > 0 && g["palette.colors"].length ? [`- Palette: ${g["palette.colors"].join(" ")}.`] : []
    ];
    out.push(...section("Rules", rules));
    const build = {
      runtime: ["- `const style = await createStyle( { renderer, scene, camera, looks: [ LOOK ] } )` from `stylelab-runtime.js` (LOOK = the exported look.json); render with `style.render()`.", "- Materials only via `style.material( { part, color } )`; tag every mesh with its part."],
      three: ["- three.js r182 (WebGPU, TSL): a custom lighting model per part with the values above, then the post chain in order."],
      engine: ["- Recreate with your engine's shader and post tools; import grade.cube and palette.gpl."]
    }[target];
    out.push(...section("Build", [...build, ...proceduralRules(target, true)]));
    return out.join("\n").trim() + "\n";
  }
  out.push("## Palette (by role)", "| Role | Hex |", "|---|---|", ...paletteRows(g).map(([r, h]) => `| ${r} | ${h} |`), "Proportions: a dominant color for about 60% of the frame (sky and ground), a secondary for 30% (buildings, foliage), an accent for 10% (characters, interactables).", "");
  if ((look.mistakes || []).length) out.push(...section("Avoid", look.mistakes.map((m) => `- ${m}`)));
  out.push(...section("Lighting", moduleLines("lighting", g, { skip: (e) => e.id.startsWith("lighting.ao") || e.id.startsWith("lighting.contact") })));
  const surface = moduleLines("surface", g, { skip: (e) => e.id.startsWith("surface.water.") && g["surface.model"] !== "toonWater" }).concat(moduleLines("palette", g, { skip: (e) => e.id === "palette.colors" }));
  out.push(...section("Materials", surface.length ? surface : ["- Physically based, as the registry defaults."]));
  const diffs = partDiffs(resolved);
  if (Object.keys(diffs).length) {
    const rows = [];
    for (const [part, list] of Object.entries(diffs)) {
      const shown = full ? list : list.slice(0, 4);
      rows.push(`- **${PART_NAMES[part]}:** ${shown.map(([id, v]) => `${byId.get(id).label} ${valueLabel(byId.get(id), v)}`).join("; ")}${shown.length < list.length ? `; and ${list.length - shown.length} more` : ""}.`);
    }
    out.push(...section("Per part (differs from the above)", rows));
  }
  if (full) {
    const ids = ["surface.model", "surface.bands", "surface.shadowTint", "surface.rim.intensity", "lines.hull.enabled", "lines.hull.thickness", "palette.saturation"];
    out.push("## Per-part table", `| Part | ${ids.map((id) => byId.get(id).label).join(" | ")} |`, `|---|${ids.map(() => "---").join("|")}|`, ...PARTS.map((p12) => `| ${PART_NAMES[p12]} | ${ids.map((id) => valueLabel(byId.get(id), resolved.parts[p12][id])).join(" | ")} |`), "");
  }
  const hullParts = PARTS.filter((p12) => resolved.parts[p12]["lines.hull.enabled"]);
  const inkParts = PARTS.filter((p12) => resolved.parts[p12]["lines.screen.enabled"]);
  const partInk = [
    ...!g["lines.hull.enabled"] && hullParts.length ? [`- Outlines (inverted hull) only on ${hullParts.map((p12) => PART_NAMES[p12].toLowerCase()).join(", ")}: ${resolved.parts[hullParts[0]]["lines.hull.thickness"]} px at 1080p, ${resolved.parts[hullParts[0]]["lines.hull.color"]}. Never on the other parts.`] : [],
    ...g["lines.screen.enabled"] && inkParts.length < PARTS.length ? [`- Screen-space ink only on ${inkParts.map((p12) => PART_NAMES[p12].toLowerCase()).join(", ")}.`] : []
  ];
  const lines = moduleLines("lines", g, { skip: (e) => !full && e.id.startsWith("lines.screen.") && !["lines.screen.enabled", "lines.screen.thickness", "lines.screen.color", "lines.screen.colorFromSurface", "lines.screen.fade", "lines.screen.texture", "lines.screen.wobble"].includes(e.id) }).concat(partInk);
  out.push(...section("Lines", lines.length ? lines : ["- No outlines anywhere."]));
  out.push(...section("Atmosphere", moduleLines("atmosphere", g, { skip: (e) => e.id.startsWith("atmosphere.godRays") })));
  const post = chain.map((e, i) => {
    const vals = e.params.filter((p12) => full || notable(p12, g[p12.id], g)).map((p12) => `${p12.label} ${valueLabel(p12, g[p12.id])}`);
    const hint = target === "three" && THREE_HINTS[e.id] ? ` Build with ${THREE_HINTS[e.id]}.` : "";
    return `${i + 1}. **${e.label}**${e.parts ? ` (only on ${e.parts.join(", ")})` : ""}${vals.length ? `: ${vals.join(", ")}` : ""}.${hint}`;
  });
  out.push(...section("Post chain (in this order)", post.length ? post : ["None: the look is entirely in the materials."]));
  const tierName = ["Blockout", "Low-poly", "Crafted", "Detailed"][tier ?? (look.phone === "cheap" ? 1 : 2)];
  out.push(...section("Modeling rules", [
    `- Target complexity: ${tierName}. Bevel box edges by 2–4% of their size where the tier calls for it.`,
    "- Silhouettes first: every object must read as a solid shape at 64 px tall.",
    "- Put detail near the player's path; keep distant geometry simple (fog and lines hide it).",
    g["surface.flatNormals"] ? "- Flat-shaded facets are part of this look: keep polygons visible." : "- Smooth normals on curved shapes; hard edges where the form turns.",
    ...proceduralRules(target, false)
  ]));
  out.push(...section("Motion", moduleLines("motion", g).concat(moduleLines("retro", g, { skip: (e) => !e.id.startsWith("retro.vertexSnap") }))));
  const mobile = Object.entries(look.tiers?.mobile?.params || {}).filter(([id]) => byId.has(id)).map(([id, v]) => `${byId.get(id).label} ${valueLabel(byId.get(id), v)}`);
  out.push(...section("Performance", [
    `- ${PHONE[look.phone] || "Not rated"}.${chain.some((e) => ["lines.screen", "lighting.ao", "lighting.contact", "lens.dof", "lens.motionBlur", "quality.traa"].includes(e.id)) ? " Uses extra scene buffers (normals, ids or depth)." : " No extra scene buffers."}`,
    mobile.length ? `- Mobile variant: ${mobile.join(", ")}.` : "- Mobile variant: the same look.",
    ...moduleLines("quality", g).filter(() => full)
  ]));
  if (plan && (plan.levels?.length || plan.zones?.length || plan.modes?.length)) {
    const rows = [
      ...(plan.levels || []).map((l) => `- Level **${l.scene}**: ${l.look}${l.transition ? `, enter with a ${l.transition}` : ""}.`),
      ...(plan.zones || []).map((z) => `- Zone **${z.zone}** (${z.scene}): ${z.look}; blend over ${z.blend ?? 2} m.`),
      ...plan.modes?.length ? [`- Player visual modes (settings menu): ${plan.modes.map((m) => `${m.name} (${m.look})`).join(", ")}.`] : []
    ];
    out.push(...section("Look plan", rows));
  }
  out.push(...section(`Implementation (${BRIEF_TARGETS[target]})`, implementation(target, look)));
  out.push(...section("Checklist for every new asset", [
    target === "runtime" ? "- [ ] Uses `style.material()` with a palette color and the right `part`" : "- [ ] Uses the part's material settings above and a palette color",
    "- [ ] Built in code with the kit's patterns (seeded, tiered, detail as geometry)",
    "- [ ] Reads as a clear silhouette at 64 px and in the value (grayscale) view",
    ...(look.pillars || []).slice(0, 3).map((p12) => `- [ ] ${p12}`)
  ]));
  return out.join("\n").trim() + "\n";
}

// src/runtime/export/files.js
function toCube(table, size, { title = "Style Lab grade", channels = 4, bytes = false } = {}) {
  const k = bytes ? 1 / 255 : 1;
  const lines = [
    `TITLE "${title.replace(/"/g, "")}"`,
    "# Display-referred (sRGB in, sRGB out). Apply after tone mapping.",
    `LUT_3D_SIZE ${size}`,
    "DOMAIN_MIN 0.0 0.0 0.0",
    "DOMAIN_MAX 1.0 1.0 1.0"
  ];
  for (let i = 0; i < size * size * size; i++) {
    const o = i * channels;
    lines.push(`${(table[o] * k).toFixed(6)} ${(table[o + 1] * k).toFixed(6)} ${(table[o + 2] * k).toFixed(6)}`);
  }
  return lines.join("\n") + "\n";
}
function toGpl(colors, { name = "Style Lab", names = [] } = {}) {
  const rows = colors.map((hex, i) => {
    const n = parseInt(hex.slice(1), 16);
    const rgb = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => String(v).padStart(3)).join(" ");
    return `${rgb}	${names[i] || hex}`;
  });
  return ["GIMP Palette", `Name: ${name}`, `Columns: ${Math.min(8, colors.length)}`, "#", ...rows].join("\n") + "\n";
}

// src/runtime/look/zones.js
var smoothstep14 = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
function zoneDistance(zone, p12) {
  const [cx, cy, cz] = zone.center;
  const dx = p12[0] - cx, dy = p12[1] - cy, dz = p12[2] - cz;
  if (zone.shape === "sphere") return Math.hypot(dx, dy, dz) - zone.radius;
  const [hx, hy, hz] = zone.size.map((s) => s / 2);
  const qx = Math.abs(dx) - hx, qy = Math.abs(dy) - hy, qz = Math.abs(dz) - hz;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
  return outside + Math.min(Math.max(qx, qy, qz), 0);
}
function zoneWeight(zone, p12) {
  const d = zoneDistance(zone, p12);
  const blend = Math.max(1e-6, zone.blend ?? 2);
  return d <= 0 ? 1 : 1 - smoothstep14(d / blend);
}
function zoneWeights(zones, p12) {
  return [...zones || []].map((zone, i) => ({ zone, weight: zoneWeight(zone, p12), i })).sort((a, b) => (a.zone.priority ?? 0) - (b.zone.priority ?? 0) || a.i - b.i).map(({ zone, weight }) => ({ zone, weight }));
}
function blendZones(base, weights, resolveZone) {
  let r = base;
  for (const { zone, weight } of weights) if (weight > 0) r = blendResolved(r, resolveZone(zone), weight);
  return r;
}

// src/runtime/look/coherence.js
var dist = (a, b) => {
  const p12 = hexToOklab(a), q = hexToOklab(b);
  return Math.hypot(p12[0] - q[0], p12[1] - q[1], p12[2] - q[2]);
};
function activeMedia(v) {
  return [
    v["media.kuwahara.enabled"] && "media.kuwahara.enabled",
    v["media.watercolor.enabled"] && v["media.watercolor.edges"] > 0.2 && "media.watercolor.enabled",
    v["media.halftone.enabled"] && v["media.halftone.amount"] > 0.5 && "media.halftone.enabled",
    v["media.hatching.enabled"] && v["media.hatching.amount"] > 0.5 && "media.hatching.enabled"
  ].filter(Boolean);
}
var COHERENCE_RULES = [
  {
    id: "two-media",
    test: (v) => activeMedia(v).length >= 2,
    message: "Pick one medium; two media read as noise.",
    why: "Brush strokes, print dots, pen hatching and watercolor are each a complete way of making marks. Layered at full strength they fight for the same job, and the image turns into texture soup.",
    fix: (v) => Object.fromEntries(activeMedia(v).slice(1).map((id) => [id, false])),
    fixLabel: "Keep only the first medium"
  },
  {
    id: "two-eras",
    test: (v) => (v["retro.pixel.enabled"] || v["retro.vertexSnap.enabled"]) && (v["lens.dof.enabled"] || v["lens.motionBlur.enabled"]),
    message: "Anachronistic: those consoles couldn't blur. Pick one era.",
    why: 'Pixelation and vertex jitter say "old hardware"; bokeh and motion blur say "modern film camera". Together the image has no believable era.',
    fix: () => ({ "lens.dof.enabled": false, "lens.motionBlur.enabled": false }),
    fixLabel: "Turn off the blur"
  },
  {
    id: "busy-lines",
    test: (v, ctx) => v["lines.screen.enabled"] && v["lines.screen.thickness"] > 4 && (ctx.tier ?? 0) >= 3 && v["lines.screen.fade"] < 0.5,
    message: "Busy: thick lines on dense detail turn into noise. Fade lines with distance or raise the crease threshold.",
    why: "At high complexity every small crease and leaf gets ink. Illustrators simplify distant detail; distance fade does that for you.",
    fix: () => ({ "lines.screen.fade": 1, "lines.screen.fadeStart": 15, "lines.screen.fadeEnd": 80 }),
    fixLabel: "Fade lines with distance"
  },
  {
    id: "bloom-clipping",
    test: (v) => v["lens.bloom.enabled"] && v["lens.bloom.strength"] > 0.5 && v["grade.toneMapping"] === "none",
    message: "Clipping: without tone mapping, bloom burns to white.",
    why: "Bloom adds light on top of HDR highlights. Tone mapping rolls those values off smoothly; without it they clip to flat white blobs.",
    fix: () => ({ "grade.toneMapping": "agx" }),
    fixLabel: "Use AgX tone mapping"
  },
  {
    id: "oversaturated",
    test: (v) => Math.max(v["palette.saturation"], v["grade.saturation"]) > 1.4 && !(v["palette.remap"] > 0 && v["palette.colors"].length),
    message: "Oversaturated colors fight; try palette remap.",
    why: "Saturation multiplies whatever colors the scene has, including the random ones. A designed palette keeps strong color from turning garish.",
    fix: (v) => v["palette.saturation"] > 1.4 ? { "palette.saturation": 1.3 } : { "grade.saturation": 1.3 },
    fixLabel: "Bring saturation down to 1.3"
  },
  {
    id: "fog-seam",
    test: (v) => v["atmosphere.fog.type"] !== "off" && v["atmosphere.fog.amount"] > 0.2 && v["atmosphere.fog.skyTint"] < 0.5 && dist(v["atmosphere.fog.color"], v["atmosphere.sky.horizon"]) > 0.15,
    message: "Fog doesn't match the sky, so the horizon will show a seam.",
    why: "Distant objects fade toward the fog color while the sky behind them stays its own color. If the two differ, every silhouette on the horizon gets a halo.",
    fix: () => ({ "atmosphere.fog.skyTint": 1 }),
    fixLabel: "Tint the fog with the sky"
  },
  {
    id: "double-ink",
    test: (v) => v["lines.sobel.enabled"] && v["lines.sobel.amount"] > 0.5 && v["lines.screen.enabled"],
    message: "Two kinds of ink draw most edges twice.",
    why: "Screen-space ink already outlines silhouettes and folds from the geometry. Sobel adds a second line next to many of them, plus lines on every shadow edge, so the drawing doubles up.",
    fix: () => ({ "lines.sobel.enabled": false }),
    fixLabel: "Keep the geometry ink"
  },
  {
    id: "bleach-twice",
    test: (v) => v["grade.bleach.enabled"] && v["grade.lut.enabled"] && v["grade.lut.preset"] === "bleach",
    message: "Bleach bypass twice: the LUT preset already is one.",
    why: "The Bleach bypass LUT and the bleach bypass grade are the same film process. Stacked, the color drains away and the contrast crunches far past the look either one gives.",
    fix: () => ({ "grade.bleach.enabled": false }),
    fixLabel: "Keep only the LUT"
  },
  {
    id: "grain-dither",
    test: (v) => v["media.grain.amount"] > 0.02 && (v["retro.quantize.mode"] === "palette" && v["retro.quantize.palette"] === "onebit" || v["surface.dither.enabled"]),
    message: "Redundant texture; the dither already breaks up the image.",
    why: "Grain and 1-bit dithering both add fine noise. Together the pattern gets muddy and the two inks stop reading.",
    fix: () => ({ "media.grain.amount": 0 }),
    fixLabel: "Remove the grain"
  }
];
function checkCoherence(values, ctx = {}) {
  return COHERENCE_RULES.filter((r) => r.test(values, ctx)).map((r) => ({ id: r.id, message: r.message, why: r.why, fix: r.fix(values, ctx), fixLabel: r.fixLabel }));
}

// src/runtime/look/share.js
var toBase64Url = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
var fromBase64Url = (text) => {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};
async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
async function encodeShare(value) {
  return toBase64Url(await pipe(new TextEncoder().encode(JSON.stringify(value)), new CompressionStream("deflate-raw")));
}
async function decodeShare(text) {
  return JSON.parse(new TextDecoder().decode(await pipe(fromBase64Url(text), new DecompressionStream("deflate-raw"))));
}
function parseShareHash(hash3) {
  const m = /^#(state|look)=([A-Za-z0-9_-]+)$/.exec(hash3 || "");
  return m ? { kind: m[1], text: m[2] } : null;
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

// src/runtime/perf/cost-model.js
var RUBRIC = {
  "lighting.ao": { passes: 2, taps: 20, history: false, fpe: 1.6, note: "GTAO at half resolution plus a smoothing pass" },
  "lighting.contact": { passes: 1, taps: 16, history: false, fpe: 1.2, note: "a 16-step ray march toward the sun" },
  "lens.bloom": { passes: 10, taps: 9, history: false, fpe: 2.2, note: "a mip chain of downsample and blur passes" },
  "atmosphere.godRays": { passes: 1, taps: 32, history: false, fpe: 1.5, note: "a 32-tap radial blur" },
  "lens.motionBlur": { passes: 1, taps: 16, history: false, fpe: 1.3, note: "velocity buffer plus 16 taps" },
  "lens.dof": { passes: 4, taps: 24, history: false, fpe: 3, note: "bokeh gather at half resolution plus composite" },
  "lens.tiltShift": { passes: 2, taps: 18, history: false, fpe: 1.4, note: "a separable blur band" },
  "quality.traa": { passes: 2, taps: 9, history: true, fpe: 1.4, note: "reprojection with a history buffer" },
  "grade.toneMapping": { passes: 0, taps: 0, history: false, fpe: 0, note: "fused into the final pass" },
  "grade.basic": { passes: 0, taps: 0, history: false, fpe: 0.1, note: "fused math" },
  "grade.selective": { passes: 0, taps: 0, history: false, fpe: 0.1, note: "fused math (OKLab)" },
  "grade.lut": { passes: 0, taps: 1, history: false, fpe: 0.2, note: "one 3D texture lookup" },
  "grade.gradientMap": { passes: 0, taps: 0, history: false, fpe: 0.1, note: "fused math" },
  "media.kuwahara": { passes: 1, taps: 0, history: false, fpe: (v) => 0.6 + 0.12 * (2 * v["media.kuwahara.radius"] + 1) ** 2 / 4 + (v["media.kuwahara.anisotropic"] ? 0.8 : 0), note: "8 sectors over a (2r + 1)² window: cost grows with the radius squared (anisotropic adds a structure-tensor pass)" },
  "media.watercolor": { passes: 1, taps: 12, history: false, fpe: 1.2, note: "edge darkening and granulation" },
  "media.halftone": { passes: 0, taps: 0, history: false, fpe: (v) => v["media.halftone.mode"] === "cmyk" ? 0.5 : 0.3, note: "fused dot screens" },
  "media.hatching": { passes: 0, taps: 0, history: false, fpe: 0.3, note: "fused line screens" },
  "lines.screen": { passes: 0, taps: 25, history: false, fpe: 1.4, note: "8 neighbors of depth, normal and ids (needs MRT)" },
  "retro.pixel": { passes: 1, taps: 4, history: false, fpe: 0.3, note: "low-resolution scene pass and nearest upscale (cheaper scene)" },
  "quality.fxaa": { passes: 1, taps: 9, history: false, fpe: 0.6, note: "one pass" },
  "quality.smaa": { passes: 3, taps: 12, history: false, fpe: 1.5, note: "edge, weight and blend passes" },
  "media.misregistration": { passes: 1, taps: 3, history: false, fpe: 0.4, note: "a texture boundary plus three taps" },
  "media.paper": { passes: 0, taps: 1, history: false, fpe: 0.2, note: "procedural texture" },
  "retro.quantize": { passes: 0, taps: 0, history: false, fpe: 0.2, note: "fused palette match and dither" },
  "lens.ca": { passes: 1, taps: 3, history: false, fpe: 0.4, note: "a texture boundary plus three taps" },
  "lens.distortion": { passes: 1, taps: 1, history: false, fpe: 0.4, note: "a texture boundary" },
  "lens.vignette": { passes: 0, taps: 0, history: false, fpe: 0.05, note: "fused" },
  "media.grain": { passes: 0, taps: 0, history: false, fpe: 0.05, note: "fused" },
  "lens.letterbox": { passes: 0, taps: 0, history: false, fpe: 0.02, note: "fused" },
  "retro.crt": { passes: 1, taps: 5, history: false, fpe: 0.6, note: "curvature needs a texture boundary" },
  // P2 (M10)
  "lighting.ssgi": { passes: 2, taps: 32, history: false, fpe: 4, note: "two slices × 8 steps of horizon search per pixel, plus smoothing" },
  "lens.flare": { passes: 2, taps: 8, history: false, fpe: 1.2, note: "ghosts at quarter resolution plus a texture boundary" },
  "lens.anamorphic": { passes: 2, taps: 32, history: false, fpe: 1.5, note: "a 32-tap horizontal streak at half resolution" },
  "lens.afterimage": { passes: 2, taps: 2, history: true, fpe: 0.8, note: "a history buffer blended every frame" },
  "grade.sepia": { passes: 0, taps: 0, history: false, fpe: 0.05, note: "fused math" },
  "grade.bleach": { passes: 0, taps: 0, history: false, fpe: 0.05, note: "fused math" },
  "lines.sobel": { passes: 1, taps: 8, history: false, fpe: 0.6, note: "a texture boundary plus a 3 × 3 kernel" },
  "lines.highlight": { passes: 0, taps: 25, history: false, fpe: 0.6, note: "24 taps of the ids buffer (needs MRT)" },
  "media.sharpen": { passes: 1, taps: 5, history: false, fpe: 0.4, note: "a texture boundary plus five taps" },
  "motion.speedLines": { passes: 0, taps: 0, history: false, fpe: 0.1, note: "fused procedural pattern" },
  "retro.vhs": { passes: 1, taps: 5, history: false, fpe: 0.6, note: "a texture boundary plus a horizontal chroma smear" }
};
var BUFFER_FPE = 0.5;
var SHADOW_FPE = { 512: 0.15, 1024: 0.3, 2048: 0.8, 4096: 2 };
var SCENE_FPE = 1;
var BUDGETS = [
  { id: "desktop", label: "Desktop GPU, 1080p", fpe: 60, estimate: true },
  { id: "laptop", label: "Laptop integrated GPU, 1080p", fpe: 18, estimate: true },
  { id: "phone-high", label: "High-end phone (2023+), 0.75 render scale", fpe: 9, estimate: true },
  { id: "phone-mid", label: "Mid-range phone, 0.75 render scale", fpe: 5, estimate: true },
  { id: "phone-low", label: "Low-end phone", fpe: 2.5, estimate: true }
];
var VERDICTS = { safe: "✅ phone-safe", high: "⚠️ high-end phones only", desktop: "⛔ desktop or console only" };
var fpeOf = (id, v) => {
  const r = RUBRIC[id];
  return r ? typeof r.fpe === "function" ? r.fpe(v) : r.fpe : 0.5;
};
function rubric(global, parts) {
  const v = withPartMasks(global, parts);
  const active = activeEffects(v);
  const effects = active.map((id) => ({ id, label: EFFECTS.find((e) => e.id === id)?.label || id, fpe: Math.round(fpeOf(id, v) * 100) / 100, note: RUBRIC[id]?.note || "" }));
  const buffers = [...passRequirements(v)];
  const shadows = SHADOW_FPE[v["lighting.shadows.mapSize"]] ?? 0.8;
  const scale = v["retro.pixel.enabled"] ? 0.5 : v["quality.resolution"] ?? 1;
  const effectsTotal = effects.reduce((s, e) => s + e.fpe, 0);
  const total = Math.round((SCENE_FPE * scale + effectsTotal * scale + buffers.length * BUFFER_FPE + shadows) * 100) / 100;
  const budget = (id) => BUDGETS.find((b) => b.id === id).fpe;
  const verdict = total <= budget("phone-mid") ? "safe" : total <= budget("phone-high") ? "high" : "desktop";
  return { effects, buffers, shadows, scale, total, verdict, label: VERDICTS[verdict] };
}
function mobileSubstitutions(global, parts) {
  const o = {}, partOverrides = {}, changes = [];
  const set = (id, value, why) => {
    if (global[id] !== value) {
      o[id] = value;
      changes.push(why);
    }
  };
  if (global["lighting.ao.enabled"] || PARTS.some((p12) => parts[p12]["lighting.ao.enabled"])) set("lighting.ao.enabled", false, "Ambient occlusion off (two extra passes and two buffers).");
  if (global["lighting.contact.enabled"]) set("lighting.contact.enabled", false, "Contact shadows off (a ray march per pixel).");
  if (global["lens.dof.enabled"]) set("lens.dof.enabled", false, "Depth of field off (bokeh is the most expensive lens effect).");
  if (global["lens.motionBlur.enabled"]) set("lens.motionBlur.enabled", false, "Motion blur off (needs a velocity buffer).");
  if (global["atmosphere.godRays.enabled"]) set("atmosphere.godRays.enabled", false, "God rays off (a 32-tap radial blur).");
  if (global["lens.tiltShift.enabled"]) set("lens.tiltShift.enabled", false, "Tilt-shift off.");
  if (global["lighting.ssgi.enabled"]) set("lighting.ssgi.enabled", false, "Screen-space GI off (the heaviest light effect).");
  if (global["lens.anamorphic.enabled"]) set("lens.anamorphic.enabled", false, "Anamorphic streaks off (a 32-tap streak pass).");
  if (global["media.kuwahara.anisotropic"]) set("media.kuwahara.anisotropic", false, "Painterly strokes without edge following (no structure pass).");
  if (["traa", "smaa"].includes(global["quality.aa"])) set("quality.aa", "fxaa", "TRAA / SMAA → FXAA (one pass, no history).");
  if (global["lens.bloom.enabled"] && global["lens.bloom.source"] !== "emissive") set("lens.bloom.source", "emissive", "Bloom only from emissive surfaces.");
  if (global["media.kuwahara.enabled"] && global["media.kuwahara.radius"] > 2) {
    set("media.kuwahara.radius", 2, "Painterly radius 2 (cost grows with the radius squared)…");
    set("quality.resolution", Math.min(global["quality.resolution"], 0.5), "…at half render scale.");
  }
  if (global["lighting.shadows.mapSize"] > 1024) set("lighting.shadows.mapSize", 1024, "Shadow map 1024.");
  const inked = PARTS.filter((p12) => parts[p12]["lines.screen.enabled"]);
  if (inked.length) {
    o["lines.screen.enabled"] = false;
    for (const p12 of ["characters", "hero", "props", "architecture"]) {
      if (!inked.includes(p12)) continue;
      partOverrides[p12] = { "lines.hull.enabled": true, "lines.hull.thickness": Math.min(4, Math.max(1, parts[p12]["lines.screen.thickness"] * 0.8)), "lines.hull.color": parts[p12]["lines.screen.color"] };
    }
    changes.push("Screen-space lines → hull outlines on characters, props and buildings (no extra buffers).");
  }
  return { overrides: o, partOverrides, changes };
}

// src/runtime/index.js
var RUNTIME_VERSION = "1.1.0";
export {
  BRIEF_LENGTHS,
  BRIEF_TARGETS,
  BUDGETS,
  COHERENCE_RULES,
  EFFECTS,
  LOOK_SCHEMA,
  LUT_PRESETS,
  MASKED,
  MODULES,
  PALETTES,
  PARTS,
  PART_INDEX,
  PART_KEYWORDS,
  PART_MODULES,
  REGISTRY,
  RUBRIC,
  RUNTIME_VERSION,
  Style,
  StyleLightingModel,
  StyleRuntime,
  StyleSurfaceMaterial,
  VERDICTS,
  VIEWS,
  activeEffects,
  applyStrength,
  bakeLut,
  bayerMatrix,
  blendResolved,
  blendZones,
  byId,
  checkCoherence,
  checkValue,
  color_exports as color,
  computeOutlineNormals,
  createHullMaterial,
  createStyle,
  createSurfaceUniforms,
  customLut,
  decodeLut,
  decodeShare,
  defaults,
  designerView,
  encodeLut,
  encodeShare,
  formatBrief,
  generateBrief,
  gpuIdle,
  guessParts,
  lookFromResolved,
  lookValue,
  measureFrames,
  migrateLook,
  mixValue,
  mobileSubstitutions,
  parseCube,
  parseShareHash,
  partRecipe,
  passRequirements,
  pixelGrid,
  postChain,
  resolveLook,
  resolveRecipe,
  resolvedHash,
  rubric,
  setCustomLut,
  styleFromMaterial,
  tagMeshes,
  timeOfDay,
  timestampsSupported,
  toCube,
  toGpl,
  validateLook,
  valueLabel,
  withPartMasks,
  zoneWeight,
  zoneWeights
};
