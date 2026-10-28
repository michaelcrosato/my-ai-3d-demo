/* Style Lab runtime v0.4.0 (a2058a3) */
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/runtime/style.js
import * as THREE10 from "three/webgpu";
import { mrt as mrt3, output as output3, normalView as normalView2, directionToColor, vec4 as vec45, velocity, emissive } from "three/tsl";

// src/runtime/materials/factory.js
import * as THREE2 from "three/webgpu";
import * as TSL from "three/tsl";
import { uniform as uniform3, vec3 as vec32, vec4, mrt, output, fract, sin, cos, dot, floor, float as float3, smoothstep as smoothstep3, modelWorldMatrix, modelViewProjection, positionLocal, materialColor, Fn as Fn3 } from "three/tsl";

// src/runtime/materials/StyleLightingModel.js
import { Color, LightingModel, MeshToonNodeMaterial, MeshStandardNodeMaterial } from "three/webgpu";
import { float, vec3, uniform, normalView, normalWorld, diffuseColor, luminance, smoothstep, max, min, fwidth, select, step, positionViewDirection, mix, Fn, materialEmissive } from "three/tsl";
var RECIPROCAL_PI = 1 / Math.PI;
function createSurfaceUniforms({
  threshold = 0.5,
  softness = 0.02,
  shadowTint = "#5866d0",
  tintStrength = 0.5
} = {}) {
  return {
    threshold: uniform(threshold),
    softness: uniform(softness),
    shadowTint: uniform(new Color(shadowTint)),
    tintStrength: uniform(tintStrength),
    specIntensity: uniform(0),
    specSize: uniform(0.15),
    specSoftness: uniform(0.02),
    rimIntensity: uniform(0),
    rimWidth: uniform(0.3),
    rimSoftness: uniform(0.05),
    rimColor: uniform(new Color("#ffffff")),
    rimLitSide: uniform(0)
  };
}
var rimTerm = Fn(([width, softness]) => {
  const fresnel = normalView.dot(positionViewDirection).clamp().oneMinus();
  const edge = width.oneMinus();
  const s = max(softness, fwidth(fresnel).mul(0.5));
  return smoothstep(edge.sub(s), edge.add(s), fresnel);
});
var StyleLightingModel = class extends LightingModel {
  /**
   * @param {object} surface
   * @param {string} surface.model - 'toon' | 'halfLambert' | 'flat' (structural)
   * @param {number} surface.bands - Number of light bands (structural). 1 = continuous.
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
    const { threshold, softness } = this.surface.uniforms;
    const s = max(softness, fwidth(amount).mul(0.5));
    let r = float(0);
    for (let k = 1; k < bands; k++) {
      const t = min(threshold.mul(2 * k / bands), 0.98);
      r = r.add(smoothstep(t.sub(s), t.add(s), amount));
    }
    return r.div(bands - 1);
  }
  facing(NdotL) {
    switch (this.surface.model) {
      case "halfLambert":
        return NdotL.mul(0.5).add(0.5).pow(2);
      case "flat":
        return float(1);
      default:
        return NdotL.max(0);
    }
  }
  direct({ lightDirection: lightDirection2, lightColor, lightNode, reflectedLight }) {
    const NdotL = normalView.dot(lightDirection2);
    const base = lightNode.baseColorNode || lightNode.colorNode;
    const baseLuminance = luminance(base);
    const visibility = select(baseLuminance.greaterThan(1e-5), luminance(lightColor).div(baseLuminance), 0);
    const r = this.ramp(this.facing(NdotL).mul(visibility).clamp());
    this.keyRamp.assign(max(this.keyRamp, r));
    reflectedLight.directDiffuse.addAssign(diffuseColor.rgb.mul(base).mul(r).mul(RECIPROCAL_PI));
    const { specIntensity, specSize, specSoftness } = this.surface.uniforms;
    const H = lightDirection2.add(positionViewDirection).normalize();
    const x = normalView.dot(H).clamp().oneMinus().div(specSize.mul(specSize).mul(0.5).max(1e-4));
    const w = max(specSoftness.mul(4), fwidth(x).mul(0.5));
    const spec = smoothstep(w.oneMinus(), w.add(1), x).oneMinus().mul(step(0, NdotL));
    reflectedLight.directSpecular.addAssign(base.mul(visibility).mul(spec).mul(specIntensity));
  }
  indirect(builder) {
    const { irradiance, reflectedLight, ambientOcclusion } = builder.context;
    reflectedLight.indirectDiffuse.addAssign(irradiance.mul(diffuseColor.rgb).mul(RECIPROCAL_PI));
    reflectedLight.indirectDiffuse.mulAssign(ambientOcclusion);
  }
  finish(builder) {
    const u = this.surface.uniforms;
    const fill = diffuseColor.rgb.mul(u.shadowTint).mul(u.tintStrength).mul(this.keyRamp.oneMinus());
    const rim = rimTerm(u.rimWidth, u.rimSoftness).mul(u.rimIntensity).mul(mix(1, this.keyRamp, u.rimLitSide));
    builder.context.outgoingLight.addAssign(vec3(fill).add(u.rimColor.mul(rim)));
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
    const lit = smoothstep(0, 0.35, normalWorld.dot(keyDirection));
    const rim = rimTerm(u.rimWidth, u.rimSoftness).mul(u.rimIntensity).mul(mix(1, lit, u.rimLitSide));
    this.emissiveNode = materialEmissive.add(u.rimColor.mul(rim));
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
      const [p12, q, r] = corners[k];
      _e1.subVectors(q, p12).normalize();
      _e2.subVectors(r, p12).normalize();
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
function createHullMaterial({ THREE: THREE11, TSL: TSL2, color, thickness, normalName = "outlineNormal", snapRows = null }) {
  const { Fn: Fn10, vec4: vec46, attribute, positionLocal: positionLocal2, modelViewMatrix, cameraProjectionMatrix, screenSize: screenSize3 } = TSL2;
  const material = new THREE11.MeshBasicNodeMaterial({ side: BackSide });
  material.colorNode = color;
  material.vertexNode = Fn10(() => {
    const clip = cameraProjectionMatrix.mul(modelViewMatrix).mul(vec46(positionLocal2, 1));
    const nView = modelViewMatrix.mul(vec46(attribute(normalName, "vec3"), 0)).xyz;
    const nClip = cameraProjectionMatrix.mul(vec46(nView, 0)).xy;
    const pixels = thickness.mul(screenSize3.y.div(1080));
    const offset = nClip.normalize().mul(pixels).mul(2).div(screenSize3).mul(clip.w);
    const out = vec46(clip.xy.add(offset), clip.zw);
    return snapRows ? snapClip(TSL2, out, snapRows) : out;
  })();
  return material;
}
function snapClip(TSL2, clip, rows) {
  const { vec2: vec26, vec4: vec46, floor: floor6, screenSize: screenSize3 } = TSL2;
  const grid = vec26(rows.mul(screenSize3.x.div(screenSize3.y)), rows).mul(0.5);
  const ndc = clip.xy.div(clip.w);
  return vec46(floor6(ndc.mul(grid).add(0.5)).div(grid).mul(clip.w), clip.zw);
}

// src/runtime/render/blobs.js
import * as THREE from "three/webgpu";
import { Fn as Fn2, uniformArray, uniform as uniform2, float as float2, int, Loop, max as max2, smoothstep as smoothstep2, step as step2, positionWorld } from "three/tsl";
var MAX_BLOBS = 48;
var MAX_FOOTPRINT = 6;
var _box = new THREE.Box3();
var _size = new THREE.Vector3();
var BlobShadows = class {
  constructor() {
    this.data = uniformArray(Array.from({ length: MAX_BLOBS }, () => new THREE.Vector4()), "vec4");
    this.count = uniform2(0, "int");
    this.softness = uniform2(0.6);
    this.opacity = uniform2(0.5);
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
    const inverse = new THREE.Matrix4();
    for (const object of root.children) {
      const counts = {};
      const box = new THREE.Box3();
      inverse.copy(object.matrixWorld).invert();
      object.traverse((o) => {
        if (!o.isMesh || !o.userData.style) return;
        counts[o.userData.style.part] = (counts[o.userData.style.part] || 0) + 1;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        box.union(_box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).applyMatrix4(inverse));
      });
      const part = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!part || box.isEmpty()) continue;
      box.getSize(_size);
      if (Math.max(_size.x, _size.z) > MAX_FOOTPRINT * 2) continue;
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
      _box.getSize(_size);
      const r = Math.max(0.15, Math.max(_size.x, _size.z) * 0.5 * this.size);
      this.data.array[n++].set((_box.min.x + _box.max.x) / 2, _box.min.y, (_box.min.z + _box.max.z) / 2, r);
    }
    this.count.value = n;
  }
  /** Darkening in [0, opacity] at the fragment's world position (one node, shared by every material). */
  shade() {
    if (this.node) return this.node;
    this.node = Fn2(() => {
      const shade = float2(0).toVar();
      Loop({ start: int(0), end: this.count, type: "int", condition: "<" }, ({ i }) => {
        const b = this.data.element(i);
        const d = positionWorld.xz.sub(b.xz).length().div(b.w);
        const h = b.y.sub(positionWorld.y);
        const disc = smoothstep2(this.softness.oneMinus().mul(0.95), 1, d).oneMinus();
        const below = step2(-0.06, h);
        const fade = smoothstep2(0, max2(b.w.mul(2.5), 1), h).oneMinus();
        shade.assign(max2(shade, disc.mul(below).mul(fade)));
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
var MIX_BY_TYPE = { float: "lerp", int: "lerp", angle: "angle", color: "oklab", bool: "step", enum: "step", palette: "step" };
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
      { value: "flat", label: "Flat (cast shadows only)" }
    ],
    learn: {
      what: "How a surface turns light into color. Toon bands the light into flat tones; half-Lambert wraps light softly around the form; flat ignores the surface angle; PBR is physically based.",
      why: "The shading model is the biggest single decision in a style. Banded light simplifies shapes into a few readable planes, which is why toon styles make simple geometry look intentional.",
      avoid: "PBR on blockout geometry: it shows every flaw of the primitives."
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
      { value: "cool-night", label: "Cool night" }
    ],
    learn: { what: "Which generated grade the LUT holds.", why: "Each preset is a recognizable film or photo-lab look; compare them at full strength, then dial the amount back." },
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
  })
];

// src/runtime/registry/motion.js
var p10 = (e) => param("motion", e);
var motion_default = [
  p10({
    id: "motion.stepped.fps",
    label: "Animate on…",
    type: "int",
    min: 0,
    max: 30,
    step: 1,
    unit: "fps",
    default: 0,
    learn: {
      what: "Updates animation (characters, water, wind, flicker) only this many times per second. 0 is smooth. The camera always stays smooth.",
      why: 'Hand-drawn animation runs "on twos" (12 drawings per second). Stepped motion on a smooth camera makes 3D read as drawn, the trick behind stylized animated films.',
      typical: "12 (on twos), 8 (on threes), 0 (smooth).",
      avoid: "Stepping the player character in an action game: it costs responsiveness."
    },
    brief: "Animation stepped at {value} fps (camera smooth); 0 = continuous.",
    tags: ["motion", "animation", "on twos"]
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
  })
];

// src/runtime/registry/index.js
var MODULES = [
  { id: "lighting", label: "Lighting", stage: "WORLD", perPart: "ambient only" },
  { id: "surface", label: "Surface", stage: "WORLD", perPart: "yes" },
  { id: "lines", label: "Lines", stage: "WORLD + MEDIUM", perPart: "hull lines" },
  { id: "palette", label: "Palette", stage: "WORLD", perPart: "yes" },
  { id: "atmosphere", label: "Atmosphere", stage: "WORLD", perPart: "no" },
  { id: "lens", label: "Lens", stage: "CAMERA + DISPLAY", perPart: "no" },
  { id: "grade", label: "Grade", stage: "CAMERA + GRADE", perPart: "no" },
  { id: "media", label: "Media", stage: "MEDIUM + DISPLAY", perPart: "no" },
  { id: "retro", label: "Retro", stage: "pass + DISPLAY", perPart: "vertex snap" },
  { id: "motion", label: "Motion", stage: "clock", perPart: "no" },
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
  linearToOklab: () => linearToOklab,
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
var clamp01 = (x) => Math.min(1, Math.max(0, x));
function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Not a hex color: ${hex}`);
  const n = parseInt(h, 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
function rgbToHex([r, g, b]) {
  const to = (x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
var isHex = (v) => typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
var srgbToLinear = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
var linearToSrgb = (c) => c <= 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
var hexToLinear = (hex) => hexToRgb(hex).map(srgbToLinear);
var linearToHex = (rgb) => rgbToHex(rgb.map((c) => linearToSrgb(Math.max(0, c))));
function linearToOklab([r, g, b]) {
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
var hexToOklab = (hex) => linearToOklab(hexToLinear(hex));
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
function adjustHex(hex, { saturation: saturation2 = 1, value = 1, hue: hue2 = 0 } = {}) {
  if (saturation2 === 1 && value === 1 && hue2 === 0) return hex.toLowerCase();
  const [L, C, h] = oklabToOklch(hexToOklab(hex));
  return oklabToHex(oklchToOklab([clamp01(L * value), C * saturation2, h + hue2]));
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
  const lin = [r, g, b].map((c) => srgbToLinear(clamp01(c / 255)));
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

// src/runtime/materials/factory.js
var LAYER_STYLED = 1;
var LAYER_PLAIN = 2;
var objectIdNode = Fn3(() => {
  const t = modelWorldMatrix.element(3).xyz;
  const h = fract(sin(dot(t, vec32(12.9898, 78.233, 37.719))).mul(43758.5453));
  return floor(h.mul(254)).add(1).div(255);
});
var idsNode = (part) => vec4(PART_INDEX[part] / 255, objectIdNode(), 0, 1);
var deformKey = (s) => s.wave ? `wave:${s.wave.amplitude}/${s.wave.frequency}/${s.wave.falloff ?? 90}` : s.wind ? `wind:${s.wind.strength}/${s.wind.height}` : "";
var styleKey = (s) => [s.color, s.emissive, s.emissiveIntensity, s.roughness, s.metalness ?? 0, s.opacity ?? 1, deformKey(s), s.doubleSided, s.map?.uuid ?? "", s.vertexColors ? "vc" : ""].join("|");
function paletteColor(hex, v) {
  let c = hex.toLowerCase();
  if (v["palette.remap"] > 0 && v["palette.colors"].length) c = mixHex(c, remapToPalette(c, v["palette.colors"], { keepValue: v["palette.keepValue"] }), v["palette.remap"]);
  if (v["palette.tintAmount"] > 0) c = mixHex(c, v["palette.tint"], v["palette.tintAmount"]);
  return adjustHex(c, { saturation: v["palette.saturation"], value: v["palette.value"], hue: v["palette.hue"] });
}
var structKey = (v, blobs) => [v["surface.model"], v["surface.model"] === "pbr" ? 0 : v["surface.bands"], v["surface.flatNormals"] ? "flat" : "", v["retro.vertexSnap.enabled"] ? "snap" : "", blobs ? "blob" : ""].join("|");
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
      hullColor: uniform3(new THREE2.Color("#1b1d2a")),
      hullThickness: uniform3(1.5),
      hullEnabled: false,
      snapRows: uniform3(120),
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
  waveNode(wave) {
    if (!wave) return null;
    const { amplitude, frequency, falloff = 90 } = wave;
    const t = this.time;
    const fade = smoothstep3(falloff, falloff * 0.4, positionLocal.xz.length());
    const y = sin(positionLocal.x.mul(frequency).add(t)).mul(cos(positionLocal.z.mul(frequency * 0.8).add(t.mul(0.7)))).mul(amplitude).mul(fade);
    return positionLocal.add(vec32(0, y, 0));
  }
  /** Grass and foliage sway: offset grows with height above the mesh origin. */
  windNode(wind) {
    const { strength = 0.12, height = 0.5 } = wind;
    const t = this.time;
    const h = positionLocal.y.div(height).clamp(0, 1.5).pow(2);
    const phase = positionLocal.x.mul(0.35).add(positionLocal.z.mul(0.2));
    const sway = sin(t.mul(1.7).add(phase)).add(sin(t.mul(3.1).add(positionLocal.x.mul(0.9))).mul(0.3)).mul(strength);
    return positionLocal.add(vec32(sway, 0, sway.mul(0.6)).mul(h));
  }
  deformNode(style) {
    return style.wave ? this.waveNode(style.wave) : style.wind ? this.windNode(style.wind) : null;
  }
  /** Settings shared by the styled and plain twins of a mesh. */
  common(material, style) {
    material.side = style.doubleSided ? THREE2.DoubleSide : THREE2.FrontSide;
    if (style.emissive) {
      material.emissive = new THREE2.Color(style.emissive);
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
  styledMaterial(style, part) {
    const pv = this.parts[part];
    const key = `${part}|${pv.struct}|${styleKey(style)}`;
    let material = this.styled.get(key);
    if (material) return material;
    const v = pv.values;
    const surface = { model: v["surface.model"], bands: v["surface.bands"], uniforms: pv.surface };
    material = surface.model === "pbr" ? new StyleStandardMaterial(surface, this.keyDirection, { roughness: style.roughness, metalness: style.metalness ?? 0 }) : new StyleSurfaceMaterial(surface);
    material.name = `style:${part}:${surface.model}`;
    material.flatShading = v["surface.flatNormals"];
    this.common(material, style);
    if (v["retro.vertexSnap.enabled"]) material.vertexNode = snapClip(TSL, modelViewProjection, pv.snapRows);
    if (pv.struct.endsWith("blob")) material.colorNode = materialColor.mul(float3(1).sub(this.blobs.shade()));
    material.mrtNode = mrt({ output, ids: idsNode(part) });
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
    material = new THREE2.MeshStandardNodeMaterial({ color: new THREE2.Color(style.color), roughness: style.roughness ?? 0.8, metalness: style.metalness ?? 0, fog: false });
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
    material = createHullMaterial({ THREE: THREE2, TSL, color: pv.hullColor, thickness: pv.hullThickness, snapRows: snap ? pv.snapRows : null });
    material.name = `hull:${part}`;
    material.mrtNode = mrt({ output, ids: idsNode(part) });
    this.hulls.set(key, material);
    this.built++;
    return material;
  }
  /** Makes `root`'s kit meshes into twins. Call after apply() has run once. */
  register(root) {
    const meshes = [];
    root.traverse((o) => {
      if (o.isMesh && o.userData.style) meshes.push(o);
    });
    for (const mesh of meshes) {
      const style = mesh.userData.style;
      mesh.material = this.styledMaterial(style, style.part);
      mesh.layers.set(LAYER_STYLED);
      const plain = mesh.isSkinnedMesh ? new THREE2.SkinnedMesh(mesh.geometry, this.plainMaterial(style)) : new THREE2.Mesh(mesh.geometry, this.plainMaterial(style));
      if (mesh.isSkinnedMesh) {
        plain.bindMode = mesh.bindMode;
        plain.bind(mesh.skeleton, mesh.bindMatrix);
      }
      plain.frustumCulled = mesh.frustumCulled;
      plain.name = "plain twin";
      plain.layers.set(LAYER_PLAIN);
      plain.castShadow = mesh.castShadow;
      plain.receiveShadow = mesh.receiveShadow;
      mesh.add(plain);
      const entry = { mesh, style, part: style.part, plain, hull: null };
      this.entries.push(entry);
      this.updateHull(entry);
    }
  }
  updateHull(entry) {
    const pv = this.parts[entry.part];
    const s = entry.style;
    const want = pv.hullEnabled && pv.hullThickness.value > 0.01 && !s.wave && !s.wind && !entry.mesh.isSkinnedMesh && (s.opacity ?? 1) >= 1;
    if (want && !entry.hull) {
      const g = entry.mesh.geometry;
      if (!g.getAttribute("outlineNormal")) computeOutlineNormals(g);
      const hull = new THREE2.Mesh(g, this.hullMaterial(entry.part));
      hull.name = "hull";
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
      u.threshold.value = v["surface.threshold"];
      u.softness.value = v["surface.softness"];
      u.shadowTint.value.set(v["surface.shadowTint"]);
      u.tintStrength.value = v["surface.shadowTintStrength"];
      u.specIntensity.value = v["surface.spec.intensity"];
      u.specSize.value = v["surface.spec.size"];
      u.specSoftness.value = v["surface.spec.softness"];
      u.rimIntensity.value = v["surface.rim.intensity"];
      u.rimWidth.value = v["surface.rim.width"];
      u.rimSoftness.value = v["surface.rim.softness"];
      u.rimColor.value.set(v["surface.rim.color"]);
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
      if (rebuilt.includes(entry.part)) entry.mesh.material = this.styledMaterial(entry.style, entry.part);
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
    entry.mesh.material = this.styledMaterial(entry.style, part);
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
import * as THREE3 from "three/webgpu";
import { Fn as Fn4, uniform as uniform4, vec3 as vec33, float as float4, mix as mix2, smoothstep as smoothstep4, step as step3, select as select2, exp, floor as floor2, fract as fract2, fwidth as fwidth2, max as max3, acos, clamp, positionWorld as positionWorld2, positionView, cameraPosition, fog, mrt as mrt2, output as output2 } from "three/tsl";
function createAtmosphereUniforms() {
  return {
    zenith: uniform4(new THREE3.Color("#87ceeb")),
    horizon: uniform4(new THREE3.Color("#87ceeb")),
    ground: uniform4(new THREE3.Color("#87ceeb")),
    exponent: uniform4(1),
    sunDirection: uniform4(new THREE3.Vector3(0, 1, 0)),
    sunColor: uniform4(new THREE3.Color("#ffffff")),
    sunRadius: uniform4(0),
    // radians
    sunSoftness: uniform4(0.5),
    fogType: uniform4(0),
    // 0 off · 1 linear · 2 exp · 3 exp2
    fogAmount: uniform4(1),
    fogDensity: uniform4(8e-3),
    fogStart: uniform4(10),
    fogEnd: uniform4(200),
    fogColor: uniform4(new THREE3.Color("#c8dcf0")),
    fogSkyTint: uniform4(1),
    fogBands: uniform4(0)
  };
}
var FOG_TYPES = { off: 0, linear: 1, exp: 2, exp2: 3 };
function skyGradient(u, dir) {
  const up = clamp(dir.y, 0, 1).pow(u.exponent);
  const above = mix2(u.horizon, u.zenith, up);
  const below = mix2(u.horizon, u.ground, smoothstep4(0, 0.08, dir.y.negate()));
  return mix2(below, above, step3(0, dir.y));
}
function skyColor(u, dir) {
  const angle = acos(clamp(dir.dot(u.sunDirection), -1, 1));
  const r = max3(u.sunRadius, 1e-4);
  const disc = smoothstep4(r.mul(u.sunSoftness.mul(-0.85).add(1)).sub(1e-4), r, angle).oneMinus().mul(step3(1e-4, u.sunRadius));
  const halo = exp(angle.div(r.mul(3)).negate()).mul(0.15).mul(step3(1e-4, u.sunRadius));
  return skyGradient(u, dir).add(u.sunColor.mul(disc.add(halo)));
}
function fogFactor(u, dist) {
  const linear2 = smoothstep4(u.fogStart, u.fogEnd, dist);
  const e = exp(u.fogDensity.mul(dist).negate()).oneMinus();
  const e2 = exp(u.fogDensity.mul(dist).pow(2).negate()).oneMinus();
  const f = select2(u.fogType.equal(1), linear2, select2(u.fogType.equal(2), e, select2(u.fogType.equal(3), e2, float4(0))));
  const x = f.mul(u.fogBands);
  const aa = max3(fwidth2(x).mul(0.75), 0.02);
  const banded = floor2(x).add(smoothstep4(aa.oneMinus().mul(0.5), aa.add(1).mul(0.5), fract2(x))).div(max3(u.fogBands, 1));
  return select2(u.fogBands.greaterThan(0.5), banded, f).mul(u.fogAmount);
}
function createFogNode(u) {
  const viewDir = positionWorld2.sub(cameraPosition).normalize();
  const flat = vec33(viewDir.x, max3(viewDir.y, 0), viewDir.z).normalize();
  const color = mix2(u.fogColor, skyGradient(u, flat), u.fogSkyTint);
  return fog(color, fogFactor(u, positionView.length()));
}
function dome(material, layer) {
  const mesh = new THREE3.Mesh(new THREE3.SphereGeometry(1, 48, 24), material);
  mesh.layers.set(layer);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1e3;
  mesh.castShadow = mesh.receiveShadow = false;
  mesh.name = "sky dome";
  return mesh;
}
function createSkyDomes(u, { layerStyled, layerPlain, idsNode: idsNode2 }) {
  const styled = new THREE3.MeshBasicNodeMaterial({ side: THREE3.BackSide, depthWrite: false, fog: false });
  styled.colorNode = Fn4(() => skyColor(u, positionWorld2.sub(cameraPosition).normalize()))();
  styled.mrtNode = mrt2({ output: output2, ids: idsNode2 });
  const plain = new THREE3.MeshBasicNodeMaterial({ side: THREE3.BackSide, depthWrite: false, fog: false, color: new THREE3.Color("#87ceeb") });
  return { styled: dome(styled, layerStyled), plain: dome(plain, layerPlain) };
}

// src/runtime/post/graph.js
import * as THREE8 from "three/webgpu";
import { uniform as uniform8, vec2 as vec25, vec3 as vec310, vec4 as vec44, mix as mix8, max as max7, smoothstep as smoothstep10, step as step7, abs as abs4, floor as floor5, renderOutput as renderOutput2, screenUV as screenUV2, screenSize as screenSize2, screenCoordinate as screenCoordinate3, convertToTexture } from "three/tsl";

// src/runtime/post/stage-camera.js
import * as THREE4 from "three/webgpu";
import { Fn as Fn5, vec2, vec3 as vec34, vec4 as vec42, float as float5, int as int2, mix as mix3, smoothstep as smoothstep5, pow, abs, step as step4, Loop as Loop2, If, Break, luminance as luminance2, sample, colorToDirection, sRGBTransferEOTF, renderOutput, interleavedGradientNoise, screenCoordinate, getViewPosition, getScreenPosition } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { dof } from "three/addons/tsl/display/DepthOfFieldNode.js";
import { gaussianBlur } from "three/addons/tsl/display/GaussianBlurNode.js";
import { motionBlur } from "three/addons/tsl/display/MotionBlur.js";
var TONE_MAPPING = {
  none: THREE4.NoToneMapping,
  linear: THREE4.LinearToneMapping,
  reinhard: THREE4.ReinhardToneMapping,
  cineon: THREE4.CineonToneMapping,
  aces: THREE4.ACESFilmicToneMapping,
  agx: THREE4.AgXToneMapping,
  neutral: THREE4.NeutralToneMapping
};
var linear = (u) => sRGBTransferEOTF(u);
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
      const node = ctx.own(ao(ctx.tex("depth"), sample((uv) => colorToDirection(normals.sample(uv).rgb)), ctx.camera));
      node.resolutionScale = 0.5;
      node.radius = P.get("lighting.ao.radius");
      node.thickness = P.get("lighting.ao.radius");
      node.distanceFallOff.value = 0.5;
      const aoTex = node.getTextureNode();
      const t = vec2(0.75).div(node.resolution);
      const raw = aoTex.sample(ctx.uv.add(t)).r.add(aoTex.sample(ctx.uv.sub(t)).r).add(aoTex.sample(ctx.uv.add(vec2(t.x, t.y.negate()))).r).add(aoTex.sample(ctx.uv.sub(vec2(t.x, t.y.negate()))).r).mul(0.25);
      const a = raw.sub(0.35).div(0.6).clamp(0, 1);
      const occlusion = pow(a, P.get("lighting.ao.intensity"));
      const tint = linear(P.get("lighting.ao.tint"));
      const shaded = c.mul(mix3(tint, vec34(1), occlusion));
      return mix3(shaded, tint.mul(0.15), smoothstep5(0.55, 0.7, a).oneMinus().mul(P.get("lighting.ao.ink")));
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
      const occlusion = Fn5(() => {
        const d0 = depth.sample(ctx.uv).r;
        const p0 = getViewPosition(ctx.uv, d0, U.projInv).toVar();
        const len = P.get("lighting.contact.length");
        const thickness = P.get("lighting.contact.thickness");
        const bias = p0.z.negate().mul(3e-3).add(0.015);
        const jitter = interleavedGradientNoise(screenCoordinate);
        const hit = float5(0).toVar();
        Loop2({ start: int2(0), end: int2(N), type: "int", condition: "<" }, ({ i }) => {
          const t = float5(i).add(jitter).add(0.5).div(N);
          const p12 = p0.add(U.lightView.mul(len.mul(t)));
          const uv = getScreenPosition(p12, U.proj);
          const scene = getViewPosition(uv, depth.sample(uv).r, U.projInv).z;
          const delta = scene.sub(p12.z);
          If(delta.greaterThan(bias).and(delta.lessThan(thickness.add(bias))), () => {
            hit.assign(t.oneMinus().mul(1.5).clamp(0, 1));
            Break();
          });
        });
        const n = colorToDirection(ctx.tex("normal").sample(ctx.uv).rgb);
        const facing = smoothstep5(0.05, 0.3, n.dot(U.lightView));
        return hit.mul(facing).mul(step4(d0, 0.99999));
      })();
      return c.mul(occlusion.mul(P.get("lighting.contact.intensity")).oneMinus());
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
    id: "atmosphere.godRays",
    label: "God rays",
    stage: "camera",
    enabled: (v) => v["atmosphere.godRays.enabled"],
    requires: () => ["depth"],
    build(c, ctx) {
      const P = ctx.P, U = ctx.U;
      const depth = ctx.tex("depth"), hdr = ctx.tex("output");
      const N = 32;
      const rays = Fn5(() => {
        const uv = vec2(ctx.uv).toVar();
        const delta = U.sunScreen.sub(uv).mul(P.get("atmosphere.godRays.length")).div(N).toVar();
        uv.addAssign(delta.mul(interleavedGradientNoise(screenCoordinate)));
        const sum = float5(0).toVar();
        const w = float5(1).toVar();
        Loop2({ start: int2(0), end: int2(N), type: "int", condition: "<" }, () => {
          uv.addAssign(delta);
          const inside = step4(0, uv.x).mul(step4(uv.x, 1)).mul(step4(0, uv.y)).mul(step4(uv.y, 1));
          const sky = step4(0.99999, depth.sample(uv).r).mul(inside);
          sum.addAssign(luminance2(hdr.sample(uv).rgb).min(6).mul(sky).mul(w));
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
      return vec34(motionBlur(ctx.texture(c), velocity2, int2(16)).rgb);
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
      const node = ctx.own(dof(vec42(c, 1), ctx.pass.getViewZNode(), ctx.U.focusDistance, ctx.P.get("lens.dof.range"), ctx.P.get("lens.dof.blur")));
      return vec34(node.rgb);
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
      const blurred = ctx.own(gaussianBlur(vec42(c, 1), vec2(P.get("lens.tiltShift.blur")), 6));
      const half = P.get("lens.tiltShift.width").mul(0.5);
      const d = abs(ctx.uv.y.oneMinus().sub(P.get("lens.tiltShift.center")));
      return mix3(c, vec34(blurred.rgb), smoothstep5(half, half.add(0.22), d));
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
      return renderOutput(vec42(c.mul(ctx.U.exposure), 1), TONE_MAPPING[ctx.v["grade.toneMapping"]], THREE4.SRGBColorSpace).rgb;
    }
  }
];

// src/runtime/post/stage-grade.js
import * as THREE5 from "three/webgpu";
import { Fn as Fn6, vec3 as vec36, float as float6, int as int3, mix as mix5, smoothstep as smoothstep6, abs as abs2, atan, floor as floor3, fract as fract3, min as min2, luminance as luminance3, saturation, vibrance, hue, cdl, texture3D, uniform as uniform5, uniformArray as uniformArray2 } from "three/tsl";

// src/runtime/post/colorspace.js
import { vec3 as vec35, dot as dot2, cbrt, sRGBTransferEOTF as sRGBTransferEOTF2 } from "three/tsl";
function linearToOklab2(c) {
  const l = cbrt(dot2(c, vec35(0.4122214708, 0.5363325363, 0.0514459929)));
  const m = cbrt(dot2(c, vec35(0.2119034982, 0.6806995451, 0.1073969566)));
  const s = cbrt(dot2(c, vec35(0.0883024619, 0.2817188376, 0.6299787005)));
  const lms = vec35(l, m, s);
  return vec35(
    dot2(lms, vec35(0.2104542553, 0.793617785, -0.0040720468)),
    dot2(lms, vec35(1.9779984951, -2.428592205, 0.4505937099)),
    dot2(lms, vec35(0.0259040371, 0.7827717662, -0.808675766))
  );
}
var displayToOklab = (c) => linearToOklab2(sRGBTransferEOTF2(c.max(0)));

// src/runtime/color/lut.js
var clamp012 = (x) => Math.min(1, Math.max(0, x));
var lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
var mix4 = (a, b, t) => a + (b - a) * t;
var mix32 = (a, b, t) => [mix4(a[0], b[0], t), mix4(a[1], b[1], t), mix4(a[2], b[2], t)];
var smooth = (e0, e1, x) => {
  const t = clamp012((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
var sCurve = (x, k) => mix4(x, x * x * (3 - 2 * x), k);
var saturate3 = (c, s) => {
  const l = lum(c);
  return c.map((v) => l + (v - l) * s);
};
var softLight = (a, b) => a.map((x, i) => b[i] < 0.5 ? x - (1 - 2 * b[i]) * x * (1 - x) : x + (2 * b[i] - 1) * ((x < 0.25 ? ((16 * x - 12) * x + 4) * x : Math.sqrt(x)) - x));
var LUT_PRESETS = {
  "teal-orange": (c) => {
    const l = lum(c);
    const tone = mix32([0.05, 0.42, 0.5], [1, 0.62, 0.32], smooth(0.15, 0.85, l));
    const graded = softLight(c.map((x) => sCurve(x, 0.35)), tone);
    return saturate3(mix32(c, graded, 0.75), 1.08);
  },
  "warm-film": (c) => {
    const lifted = c.map((x) => 0.035 + sCurve(x, 0.3) * 0.94);
    return saturate3([lifted[0] * 1.06, lifted[1] * 1, lifted[2] * 0.88], 0.92);
  },
  bleach: (c) => {
    const l = lum(c);
    const overlay = c.map((x) => l < 0.5 ? 2 * x * l : 1 - 2 * (1 - x) * (1 - l));
    return saturate3(mix32(c, overlay, 0.65), 0.45).map((x) => sCurve(x, 0.25));
  },
  cross: (c) => [sCurve(c[0], 0.6), sCurve(c[1], 0.3) * 0.95 + 0.04, 0.12 + c[2] * 0.72],
  faded: (c) => saturate3(c.map((x) => 0.08 + x * 0.84), 0.78).map((x, i) => x * [1.02, 1, 0.97][i]),
  "cool-night": (c) => saturate3(c, 0.55).map((x, i) => Math.pow(clamp012(x), 1.2) * [0.78, 0.88, 1.12][i])
};
function bakeLut(preset, size = 33) {
  const f = typeof preset === "function" ? preset : LUT_PRESETS[preset];
  if (!f) throw new Error(`Unknown LUT preset ${preset}`);
  const data = new Uint8Array(size * size * size * 4);
  let i = 0;
  for (let b = 0; b < size; b++) for (let g = 0; g < size; g++) for (let r = 0; r < size; r++) {
    const out = f([r / (size - 1), g / (size - 1), b / (size - 1)]);
    data[i++] = Math.round(clamp012(out[0]) * 255);
    data[i++] = Math.round(clamp012(out[1]) * 255);
    data[i++] = Math.round(clamp012(out[2]) * 255);
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

// src/runtime/post/stage-grade.js
var LUT_SIZE = 33;
var lutCache = /* @__PURE__ */ new Map();
function lutTexture(preset) {
  let t = lutCache.get(preset);
  if (t) return t;
  t = new THREE5.Data3DTexture(bakeLut(preset, LUT_SIZE), LUT_SIZE, LUT_SIZE, LUT_SIZE);
  t.format = THREE5.RGBAFormat;
  t.type = THREE5.UnsignedByteType;
  t.minFilter = t.magFilter = THREE5.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE5.ClampToEdgeWrapping;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  lutCache.set(preset, t);
  return t;
}
var LUT_PRESET_IDS = Object.keys(LUT_PRESETS);
var MAX_STOPS = 8;
function createGradeLists() {
  return {
    stops: uniformArray2(Array.from({ length: MAX_STOPS }, () => new THREE5.Vector3()), "vec3"),
    stopCount: uniform5(2),
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
      let x = vec36(cdl(c, vec36(P.get("grade.gain")), vec36(P.get("grade.lift")), vec36(P.get("grade.gamma"))).rgb);
      x = x.sub(0.5).mul(P.get("grade.contrast")).add(0.5).max(0);
      x = saturation(x, P.get("grade.saturation"));
      x = vibrance(x, P.get("grade.vibrance"));
      x = hue(x, P.get("grade.hue").mul(Math.PI / 180));
      const h = smoothstep6(0.05, 0.95, luminance3(x).sub(P.get("grade.split.balance").mul(0.25)));
      const tone = mix5(P.get("grade.split.shadows"), P.get("grade.split.highlights"), h);
      const softLight2 = x.mul(x).mul(tone.mul(2).oneMinus()).add(x.mul(tone).mul(2));
      return mix5(x, softLight2, P.get("grade.split.amount"));
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
      const h = atan(lab.z, lab.y).mul(180 / Math.PI);
      const d = abs2(fract3(h.sub(P.get("grade.selective.hue")).div(360).add(0.5)).sub(0.5)).mul(360);
      const range = P.get("grade.selective.range");
      const chroma = lab.yz.length();
      const keep = smoothstep6(range.mul(0.6), range, d).oneMinus().mul(smoothstep6(0.02, 0.06, chroma));
      return mix5(c, vec36(luminance3(c)), P.get("grade.selective.amount").mul(keep.oneMinus()));
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
      return mix5(c, ctx.lists.lut.sample(uvw).rgb, ctx.P.get("grade.lut.amount"));
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
      const mapped = Fn6(() => {
        const n = float6(L.stopCount).sub(1);
        const t = luminance3(c).clamp(0, 1).mul(n);
        const i = min2(floor3(t), n.sub(1));
        const a = L.stops.element(int3(i)), b = L.stops.element(int3(i).add(1));
        return mix5(a, b, t.sub(i).clamp(0, 1));
      })();
      return mix5(c, mapped, ctx.P.get("grade.gradientMap.amount"));
    }
  }
];

// src/runtime/post/stage-medium.js
import { Fn as Fn8, vec2 as vec23, vec3 as vec38, vec4 as vec43, float as float8, max as max5, smoothstep as smoothstep8, colorToDirection as colorToDirection3, perspectiveDepthToViewZ as perspectiveDepthToViewZ2 } from "three/tsl";
import { fxaa } from "three/addons/tsl/display/FXAANode.js";

// src/runtime/post/lines.js
import { Fn as Fn7, vec2 as vec22, vec3 as vec37, float as float7, max as max4, mix as mix6, smoothstep as smoothstep7, step as step5, abs as abs3, colorToDirection as colorToDirection2, perspectiveDepthToViewZ } from "three/tsl";
var PAIRS = [[1, 0], [0, 1], [0.7071, 0.7071], [0.7071, -0.7071]];
function screenLines(color, b, u, atmos, { uv, texel, scale }) {
  return Fn7(() => {
    const px = texel;
    const radius = max4(u.thickness.mul(scale), 0);
    const dist = (d) => perspectiveDepthToViewZ(d, u.near, u.far).negate();
    const d0 = dist(b.depth.sample(uv).r).toVar();
    const n0 = colorToDirection2(b.normal.sample(uv).rgb).toVar();
    const id0 = b.ids.sample(uv).rg.toVar();
    const depthEdge = float7(0).toVar();
    const normalEdge = float7(0).toVar();
    const idEdge = float7(0).toVar();
    const w0 = d0.reciprocal();
    for (const [x, y] of PAIRS) {
      const o = vec22(x, y).mul(px).mul(radius);
      const samples = [uv.add(o), uv.sub(o)];
      const da = dist(b.depth.sample(samples[0]).r), db = dist(b.depth.sample(samples[1]).r);
      const lap = da.reciprocal().add(db.reciprocal()).sub(w0.mul(2)).div(w0);
      depthEdge.assign(max4(depthEdge, lap.negate()));
      for (const [k, s] of samples.entries()) {
        const n = colorToDirection2(b.normal.sample(k === 0 ? uv.add(o.mul(0.5)) : uv.sub(o.mul(0.5))).rgb);
        normalEdge.assign(max4(normalEdge, n.dot(n0).oneMinus()));
        const id = b.ids.sample(s).rg;
        const differs = step5(0.5 / 255, abs3(id.x.sub(id0.x)).add(abs3(id.y.sub(id0.y))));
        const notCloser = step5(d0.mul(0.999), k === 0 ? da : db);
        idEdge.assign(max4(idEdge, differs.mul(notCloser)));
      }
    }
    const th = u.depthThreshold.div(abs3(n0.z).clamp(0.25, 1));
    const silhouette = smoothstep7(th.mul(0.5), th, depthEdge).mul(u.silhouette);
    const crease = smoothstep7(u.creaseThreshold.mul(0.8), u.creaseThreshold.mul(1.25), normalEdge).mul(u.crease);
    const edge = max4(silhouette, max4(crease, idEdge.mul(u.idWeight))).mul(step5(0.01, radius));
    const fade = fogFactor(atmos, d0).mul(u.followFog).oneMinus();
    return vec37(mix6(color.rgb, u.color, edge.clamp().mul(fade)));
  })();
}

// src/runtime/post/stage-medium.js
var MEDIUM2 = [
  {
    id: "lines.screen",
    label: "Screen-space ink",
    stage: "medium",
    enabled: (v) => v["lines.screen.enabled"],
    requires: () => ["depth", "normal", "ids"],
    build(c, ctx) {
      return screenLines(c, { depth: ctx.tex("depth"), normal: ctx.tex("normal"), ids: ctx.tex("ids") }, ctx.U.lines, ctx.atmos, { uv: ctx.uv, texel: ctx.texel, scale: ctx.lineScale });
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
      return Fn8(() => {
        const dist = (uv) => perspectiveDepthToViewZ2(depth.sample(uv).r, U.lines.near, U.lines.far).negate();
        const d0 = dist(ctx.uv).toVar();
        const n0 = colorToDirection3(normal.sample(ctx.uv).rgb).toVar();
        const depthEdge = float8(0).toVar(), normalEdge = float8(0).toVar();
        for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const uv = ctx.uv.add(vec23(x, y).mul(ctx.texel));
          const d = dist(uv);
          const n = colorToDirection3(normal.sample(uv).rgb);
          depthEdge.assign(max5(depthEdge, d.sub(d0).div(d0).clamp(0, 1)));
          const facing = smoothstep8(-0.01, 0.01, n0.sub(n).dot(vec38(-1, 1, 1).normalize()));
          const sameSurface = smoothstep8(0, 0.02, d.sub(d0).div(d0).abs()).oneMinus();
          normalEdge.assign(max5(normalEdge, n0.dot(n).oneMinus().mul(facing).mul(sameSurface)));
        }
        const dark = smoothstep8(0.03, 0.06, depthEdge);
        const light = smoothstep8(0.08, 0.15, normalEdge).mul(dark.oneMinus());
        return c.mul(float8(1).sub(dark.mul(strength).mul(0.6))).mul(float8(1).add(light.mul(strength).mul(0.5)));
      })();
    }
  },
  {
    id: "quality.fxaa",
    label: "FXAA",
    stage: "medium",
    always: true,
    // The pass renders without MSAA whenever it writes extra buffers; pixel looks stay crisp.
    enabled: (v, ctx) => ctx.samples === 0 && !v["retro.pixel.enabled"],
    requires: () => [],
    build(c, ctx) {
      return vec38(ctx.own(fxaa(vec43(c, 1))).rgb);
    }
  }
];

// src/runtime/post/stage-display.js
import * as THREE6 from "three/webgpu";
import { Fn as Fn9, vec2 as vec24, vec3 as vec39, float as float9, int as int4, ivec2, mix as mix7, max as max6, step as step6, smoothstep as smoothstep9, sin as sin2, cos as cos2, dot as dot3, fract as fract4, floor as floor4, length, select as select3, luminance as luminance4, textureLoad, interleavedGradientNoise as interleavedGradientNoise2, uniform as uniform6, uniformArray as uniformArray3, screenUV, screenSize, screenCoordinate as screenCoordinate2, If as If2, Loop as Loop3 } from "three/tsl";
var MAX_PALETTE = 16;
function bayerTexture() {
  const data = new Uint8Array(16 * 64);
  [16, 8, 4, 2].forEach((n, block) => {
    const m = bayerMatrix(n);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) data[(block * 16 + y) * 16 + x] = Math.round((m[y % n][x % n] + 0.5) / (n * n) * 255);
  });
  const t = new THREE6.DataTexture(data, 16, 64, THREE6.RedFormat, THREE6.UnsignedByteType);
  t.minFilter = t.magFilter = THREE6.NearestFilter;
  t.needsUpdate = true;
  return t;
}
var bayer = null;
function ditherThreshold(coord, pattern) {
  bayer ??= bayerTexture();
  const row = float9(3).sub(pattern).clamp(0, 3).mul(16);
  const ordered = textureLoad(bayer, ivec2(int4(coord.x).mod(16), int4(coord.y).mod(16).add(int4(row)))).r;
  return select3(pattern.greaterThan(3.5), interleavedGradientNoise2(coord), ordered);
}
function createDisplayLists() {
  return {
    paletteRgb: uniformArray3(Array.from({ length: MAX_PALETTE }, () => new THREE6.Vector3()), "vec3"),
    paletteLab: uniformArray3(Array.from({ length: MAX_PALETTE }, () => new THREE6.Vector3()), "vec3"),
    paletteCount: uniform6(2)
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
        return floor4(c.clamp(0, 1).mul(n).add(0.5).add(d)).div(n).clamp(0, 1);
      }
      return Fn9(() => {
        const spread = float9(1).div(float9(L.paletteCount).sqrt());
        const lab = displayToOklab(c.add(d.mul(spread))).toVar();
        const best = vec39(0).toVar(), bestD = float9(1e9).toVar();
        Loop3({ start: int4(0), end: int4(L.paletteCount), type: "int", condition: "<" }, ({ i }) => {
          const delta = lab.sub(L.paletteLab.element(i));
          const dd = dot3(delta, delta);
          If2(dd.lessThan(bestD), () => {
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
      const o = p12.mul(length(p12).mul(2)).mul(ctx.P.get("lens.ca.amount").mul(0.012));
      return vec39(tex.sample(screenUV.add(o)).r, tex.sample(screenUV).g, tex.sample(screenUV.sub(o)).b);
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
      const aspect = screenSize.x.div(screenSize.y);
      const p12 = screenUV.sub(0.5).mul(vec24(aspect, 1));
      const r2 = dot3(p12, p12);
      const corner = aspect.mul(aspect).add(1).mul(0.25);
      const zoom = float9(1).div(float9(1).add(max6(k, 0).mul(corner)));
      const q = p12.mul(r2.mul(k).add(1)).mul(zoom).div(vec24(aspect, 1)).add(0.5);
      return tex.sample(q.clamp(0, 1)).rgb;
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
      const aspect = screenSize.x.div(screenSize.y);
      const sx = mix7(1, aspect, P.get("lens.vignette.roundness"));
      const p12 = ctx.uv.sub(0.5).mul(2).mul(vec24(sx, 1));
      const r = length(p12).div(length(vec24(sx, 1)));
      const softness = P.get("lens.vignette.softness");
      const v = smoothstep9(softness.oneMinus(), softness.mul(0.2).add(1), r).mul(P.get("lens.vignette.amount"));
      return mix7(c, P.get("lens.vignette.color"), v);
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
      const cell = floor4(ctx.coord.div(P.get("media.grain.size").mul(ctx.gridSize.y.div(1080)).max(1)));
      const seed = floor4(ctx.U.time.mul(24)).mul(P.get("media.grain.animated"));
      const n = fract4(sin2(dot3(cell.add(vec24(seed.mul(17.13), seed.mul(41.7))), vec24(12.9898, 78.233))).mul(43758.5453)).sub(0.5);
      const response = luminance4(c).sub(0.5).mul(2).pow(2).mul(0.6).oneMinus();
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
      const screen = screenSize.x.div(screenSize.y), target = P.get("lens.letterbox.aspect");
      const amount = P.get("lens.letterbox.amount");
      const barY = float9(1).sub(screen.div(target)).max(0).mul(0.5).mul(amount);
      const barX = float9(1).sub(target.div(screen)).max(0).mul(0.5).mul(amount);
      const uv = ctx.uv;
      const bar = max6(max6(step6(uv.y, barY), step6(barY.oneMinus(), uv.y)).mul(step6(1e-4, barY)), max6(step6(uv.x, barX), step6(barX.oneMinus(), uv.x)).mul(step6(1e-4, barX)));
      return mix7(c, P.get("lens.letterbox.color"), bar);
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
      return Fn9(() => {
        const k = P.get("retro.crt.curvature");
        const p12 = screenUV.mul(2).sub(1).toVar();
        p12.addAssign(p12.mul(p12.yx.mul(p12.yx)).mul(k));
        const uv = p12.mul(0.5).add(0.5);
        const edge = smoothstep9(0, 0.012, uv.x).mul(smoothstep9(0, 0.012, uv.x.oneMinus())).mul(smoothstep9(0, 0.012, uv.y)).mul(smoothstep9(0, 0.012, uv.y.oneMinus()));
        const px = vec24(2).div(screenSize).mul(screenSize.y.div(1080));
        const col = tex.sample(uv).rgb.toVar();
        const glow = tex.sample(uv.add(vec24(px.x, 0))).rgb.add(tex.sample(uv.sub(vec24(px.x, 0))).rgb).add(tex.sample(uv.add(vec24(0, px.y))).rgb).add(tex.sample(uv.sub(vec24(0, px.y))).rgb).mul(0.25);
        col.assign(mix7(col, max6(col, glow), P.get("retro.crt.glow")).add(glow.mul(P.get("retro.crt.glow")).mul(0.2)));
        const rows = ctx.pixel ? ctx.gridSize.y : screenSize.y.div(screenSize.y.div(360).max(2));
        const phase = fract4(uv.y.mul(rows));
        const scan = float9(1).sub(P.get("retro.crt.scanlines").mul(cos2(phase.mul(Math.PI)).pow(2)));
        const triad = floor4(screenCoordinate2.x).mod(3);
        const maskRgb = vec39(select3(triad.lessThan(0.5), 1.25, 0.8), select3(triad.lessThan(0.5).or(triad.greaterThan(1.5)), 0.8, 1.25), select3(triad.greaterThan(1.5), 1.25, 0.8));
        const mask = mix7(vec39(1), maskRgb, P.get("retro.crt.mask"));
        const flicker = float9(1).add(sin2(ctx.U.time.mul(59)).mul(P.get("retro.crt.flicker")));
        const gain = float9(1).add(P.get("retro.crt.scanlines").mul(0.4));
        return col.mul(scan).mul(mask).mul(flicker).mul(gain).mul(edge);
      })();
    }
  }
];

// src/runtime/post/params.js
import * as THREE7 from "three/webgpu";
import { uniform as uniform7 } from "three/tsl";
function setDisplayColor(u, hex) {
  const [r, g, b] = hexToRgb(hex);
  u.value.setRGB(r, g, b, THREE7.LinearSRGBColorSpace);
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
    u = entry.type === "color" ? uniform7(new THREE7.Color()) : uniform7(0, "float");
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
function createPostUniforms() {
  return {
    exposure: uniform8(new THREE8.Vector3(1, 1, 1)),
    lines: {
      thickness: uniform8(1.5),
      color: uniform8(new THREE8.Color()),
      silhouette: uniform8(1),
      crease: uniform8(0.5),
      creaseThreshold: uniform8(0.18),
      depthThreshold: uniform8(0.03),
      idWeight: uniform8(1),
      followFog: uniform8(1),
      near: uniform8(0.1),
      far: uniform8(1e3)
    },
    // Per-frame camera-derived values (StyleRuntime.update).
    sunScreen: uniform8(new THREE8.Vector2(0.5, 0.2)),
    sunVisible: uniform8(0),
    focusDistance: uniform8(10),
    proj: uniform8(new THREE8.Matrix4()),
    projInv: uniform8(new THREE8.Matrix4()),
    lightView: uniform8(new THREE8.Vector3(0, 1, 0)),
    pixelSize: uniform8(1),
    lowRes: uniform8(new THREE8.Vector2(1, 1)),
    // Compare composite (§6.9): hold, split wipe and flicker never rebuild.
    hold: uniform8(0),
    split: uniform8(0),
    splitPos: uniform8(0.5),
    flicker: uniform8(0),
    time: uniform8(0)
  };
}
function createPostLists() {
  return { ...createGradeLists(), ...createDisplayLists() };
}
function applyPostValues(U, P, lists, v) {
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
  applyGradeLists(lists, v);
  applyDisplayLists(lists, v);
}
function passRequirements(v) {
  const out = /* @__PURE__ */ new Set();
  for (const e of EFFECTS) if (!e.always && e.enabled(v, { samples: 0 })) for (const b of e.requires(v)) out.add(b);
  return out;
}
function activeEffects(v) {
  return EFFECTS.filter((e) => !e.always && e.enabled(v, { samples: 0 })).map((e) => e.id);
}
function graphKey(v, passKey) {
  const ctx = { samples: passKey.startsWith("0|") ? 0 : 4 };
  return [passKey, ...EFFECTS.filter((e) => e.enabled(v, ctx)).map((e) => `${e.id}${e.key ? ":" + e.key(v) : ""}`)].join("|");
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
    texture: (c2) => ctx.own(convertToTexture(vec44(c2, 1)))
  };
  if (pixel) {
    ctx.coord = floor5(screenCoordinate3.xy.div(U.pixelSize));
    ctx.uv = ctx.coord.add(0.5).div(U.lowRes);
    ctx.texel = vec25(1).div(U.lowRes);
    ctx.gridSize = U.lowRes;
    ctx.lineScale = 2 / 3;
  } else {
    ctx.coord = floor5(screenCoordinate3.xy);
    ctx.uv = screenUV2;
    ctx.texel = vec25(1).div(screenSize2);
    ctx.gridSize = screenSize2;
    ctx.lineScale = screenSize2.y.div(1080);
  }
  let c = vec310(ctx.tex("output").sample(ctx.uv).rgb);
  for (const e of EFFECTS) if (e.enabled(values, ctx)) c = e.build(c, ctx);
  const plain = renderOutput2(plainPass.getTextureNode("output"), THREE8.ACESFilmicToneMapping, THREE8.SRGBColorSpace).rgb;
  const showPlain = max7(U.hold, max7(U.flicker, U.split.mul(step7(screenUV2.x, U.splitPos))));
  let out = mix8(c, plain, showPlain);
  const divider = smoothstep10(0.5, 1.5, abs4(screenUV2.x.sub(U.splitPos)).mul(screenSize2.x)).oneMinus();
  out = mix8(out, vec310(1), divider.mul(U.split).mul(U.hold.oneMinus()));
  return { node: vec44(out, 1), owned };
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
import * as THREE9 from "three/webgpu";
function sun(layer) {
  const light = new THREE9.DirectionalLight(16777215, 2);
  light.layers.set(layer);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.bias = -5e-4;
  light.shadow.normalBias = 0.03;
  return light;
}
function hemisphere(layer) {
  const light = new THREE9.HemisphereLight(16777215, 4473924, 1);
  light.layers.set(layer);
  return light;
}
function lightDirection(elevation, azimuth, base) {
  const el = elevation * Math.PI / 180, az = azimuth * Math.PI / 180 + base;
  return new THREE9.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
}
var Rigs = class {
  constructor(scene) {
    this.styled = { sun: sun(LAYER_STYLED), hemi: hemisphere(LAYER_STYLED) };
    this.plain = { sun: sun(LAYER_PLAIN), hemi: hemisphere(LAYER_PLAIN) };
    this.frame = { center: new THREE9.Vector3(), radius: 10, base: 0 };
    for (const rig of [this.styled, this.plain]) {
      scene.add(rig.sun, rig.sun.target, rig.hemi);
    }
    this.direction = new THREE9.Vector3(0, 1, 0);
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
function mixValue(entry, a, b, t) {
  switch (entry.mix) {
    case "lerp": {
      const v = a + (b - a) * t;
      return entry.type === "int" ? Math.round(v) : v;
    }
    case "angle": {
      const d = ((b - a) % 360 + 540) % 360 - 180;
      return a + d * t;
    }
    case "oklab":
      return t <= 0 ? a : t >= 1 ? b : mixHex(a, b, t);
    default:
      return t < 0.5 ? a : b;
  }
}
function applyStrength(values, strength) {
  if (strength >= 1) return values;
  const out = { ...values };
  for (const id of Object.keys(out)) {
    const entry = byId.get(id);
    if (entry.structural || entry.mix === "step") continue;
    out[id] = mixValue(entry, entry.neutral, out[id], Math.max(0, strength));
  }
  return out;
}
function resolveLook({ look, sceneParams = {}, overrides = {}, partOverrides = {}, strength = 1 }) {
  const values = defaults();
  const sources = Object.fromEntries(REGISTRY.map((e) => [e.id, "registry"]));
  const layer = (params, name) => {
    for (const [id, v] of Object.entries(params || {})) {
      if (!byId.has(id)) continue;
      values[id] = clone(v);
      sources[id] = name;
    }
  };
  if (!look.baseline) layer(sceneParams, "scene");
  layer(look.params, "look");
  layer(overrides, "override");
  if (values["lighting.tod.enabled"]) {
    for (const [id, v] of Object.entries(timeOfDay(values["lighting.tod.hour"], values["lighting.key.azimuth"]))) {
      if (id in overrides) continue;
      values[id] = v;
      sources[id] = "time of day";
    }
  }
  const parts = {};
  for (const part of PARTS) {
    const map = {};
    for (const id of PART_PARAMS) map[id] = clone(values[id]);
    const chain = PART_PARENT[part] ? [PART_PARENT[part], part] : [part];
    for (const p12 of chain) Object.assign(map, look.parts?.[p12]?.params);
    for (const id of PART_PARAMS) if (id in overrides) map[id] = clone(overrides[id]);
    for (const p12 of chain) Object.assign(map, partOverrides[p12]);
    parts[part] = applyStrength(map, strength);
  }
  return { global: applyStrength(values, strength), parts, sources };
}
function lookValue(look, sceneParams, id) {
  if (look.params && id in look.params) return look.params[id];
  if (!look.baseline && id in sceneParams) return sceneParams[id];
  return byId.get(id).default;
}

// src/runtime/style.js
var layers = (n) => {
  const l = new THREE10.Layers();
  l.set(n);
  return l;
};
var _size2 = new THREE10.Vector2();
var _v = new THREE10.Vector3();
var _fwd = new THREE10.Vector3();
var StyleRuntime = class {
  /**
   * @param {object} o
   * @param {THREE.WebGPURenderer} o.renderer
   * @param {THREE.PerspectiveCamera} o.camera - the viewer's camera (the plain set renders with it)
   */
  constructor({ renderer, camera }) {
    this.renderer = renderer;
    this.camera = camera;
    this.styledCamera = camera.clone();
    this.styledCamera.name = "styled camera";
    this.scene = new THREE10.Scene();
    this.U = createPostUniforms();
    this.P = new ParamUniforms();
    this.U.lines.color = this.P.get("lines.screen.color");
    this.lists = createPostLists();
    this.atmos = createAtmosphereUniforms();
    this.scene.fogNode = createFogNode(this.atmos);
    this.materials = new StyleMaterials({ time: this.U.time, keyDirection: this.atmos.sunDirection });
    this.rigs = new Rigs(this.scene);
    this.domes = createSkyDomes(this.atmos, { layerStyled: LAYER_STYLED, layerPlain: LAYER_PLAIN, idsNode: idsNode("sky") });
    this.scene.add(this.domes.styled, this.domes.plain);
    this.post = new THREE10.PostProcessing(renderer);
    this.post.outputColorTransform = false;
    this.plainPass = new StylePassNode(this.scene, camera, { samples: 4 }).setLayers(layers(LAYER_PLAIN));
    this.styledPass = null;
    this.passKey = null;
    this.graph = null;
    this.graphKey = null;
    this.grid = null;
    this.root = null;
    this.practicals = [];
    this.focus = new THREE10.Vector3();
    this.values = null;
    this.info = { materialBuilds: 0, graphBuilds: 0, passBuilds: 0, lastRebuild: null, lastCompileMs: null };
    this.pendingCompile = null;
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
    const lights = [];
    root.traverse((o) => {
      if (o.isLight) lights.push(o);
    });
    for (const light of lights) {
      light.castShadow = false;
      light.layers.set(LAYER_STYLED);
      const twin = light.clone();
      twin.layers.set(LAYER_PLAIN);
      twin.name = "plain twin";
      light.parent.add(twin);
      const base = { intensity: light.intensity, flicker: light.userData.practical?.flicker ?? 0, seed: light.userData.practical?.seed ?? 0 };
      this.practicals.push({ light, twin, base });
    }
    const hero = def.shots[def.defaultShot];
    this.rigs.setFrame({ center: def.shadow.center, radius: def.shadow.radius, heroPos: hero.pos, heroTarget: hero.target });
    this.camera.far = def.far;
    this.camera.updateProjectionMatrix();
    this.apply(this.resolved);
    this.markCompile("scene");
  }
  /** Buffers the styled pass writes for the current values, and whether it can use MSAA. */
  passConfig(v) {
    const buffers = passRequirements(v);
    const pixel = v["retro.pixel.enabled"] === true;
    const samples = buffers.size || pixel ? 0 : 4;
    return { buffers, samples, pixel, key: `${samples}|${[...buffers].sort().join(",")}` };
  }
  /**
   * Applies a resolved look (resolveLook()). Returns what was rebuilt.
   * @returns {{parts: string[], pass: boolean, graph: boolean}}
   */
  apply(resolved) {
    this.resolved = resolved;
    const v = this.values = resolved.global;
    const before = this.materials.built;
    const parts = this.materials.apply(resolved.parts, v);
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
    applyPostValues(this.U, this.P, this.lists, v);
    const cfg = this.passConfig(v);
    const passRebuilt = cfg.key !== this.passKey;
    if (passRebuilt) {
      this.styledPass?.dispose();
      const p12 = new StylePassNode(this.scene, this.styledCamera, { samples: cfg.samples }).setLayers(layers(LAYER_STYLED));
      if (cfg.buffers.size) {
        const outputs = { output: output3 };
        if (cfg.buffers.has("normal")) outputs.normal = directionToColor(normalView2);
        if (cfg.buffers.has("ids")) outputs.ids = vec45(0);
        if (cfg.buffers.has("velocity")) outputs.velocity = velocity;
        if (cfg.buffers.has("emissive")) outputs.emissive = emissive;
        p12.setMRT(mrt3(outputs));
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
    const rebuilt = { parts, pass: passRebuilt, graph: graphRebuilt };
    if (parts.length || passRebuilt || graphRebuilt) {
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
  /** Compare composite (§6.9): uniforms only, so it takes effect on the next frame. */
  setCompare({ hold, split, splitPos, flicker } = {}) {
    if (hold !== void 0) this.U.hold.value = hold ? 1 : 0;
    if (split !== void 0) this.U.split.value = split ? 1 : 0;
    if (splitPos !== void 0) this.U.splitPos.value = Math.min(1, Math.max(0, splitPos));
    if (flicker !== void 0) this.U.flicker.value = flicker ? 1 : 0;
  }
  /**
   * Per-frame state: time (freezable and steppable by the host), the styled camera
   * and pixel grid, dome placement, depth range, the sun's screen position, the
   * focus distance for depth of field, practical lights and blob shadows.
   * @param {number} t - animation time in seconds
   * @param {object} [o] - { focus: Vector3 } the point the camera looks at
   */
  update(t, { focus } = {}) {
    const v = this.values;
    const U = this.U;
    U.time.value = t;
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
    this.renderer.getDrawingBufferSize(_size2);
    const W = Math.floor(_size2.x), H = Math.floor(_size2.y);
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
    this.post.dispose();
    this.rigs.dispose();
  }
};

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
    const step8 = MIGRATIONS[current.schema];
    if (!step8) throw new Error(`Can't read look schema ${current.schema}`);
    current = step8(current);
  }
  return current;
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

// src/runtime/index.js
var RUNTIME_VERSION = "0.4.0";
export {
  EFFECTS,
  LOOK_SCHEMA,
  LUT_PRESETS,
  MODULES,
  PALETTES,
  PARTS,
  PART_INDEX,
  PART_KEYWORDS,
  REGISTRY,
  RUNTIME_VERSION,
  StyleLightingModel,
  StyleRuntime,
  StyleSurfaceMaterial,
  activeEffects,
  applyStrength,
  bakeLut,
  bayerMatrix,
  byId,
  checkValue,
  color_exports as color,
  computeOutlineNormals,
  createHullMaterial,
  createSurfaceUniforms,
  defaults,
  formatBrief,
  gpuIdle,
  guessParts,
  lookValue,
  measureFrames,
  migrateLook,
  mixValue,
  passRequirements,
  pixelGrid,
  resolveLook,
  timeOfDay,
  timestampsSupported,
  validateLook,
  valueLabel
};
