/* Style Lab runtime v0.3.0 (fd17341) */
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/runtime/style.js
import * as THREE5 from "three/webgpu";
import { pass, mrt as mrt3, output as output3, normalView as normalView2, directionToColor, vec4 as vec43 } from "three/tsl";

// src/runtime/materials/factory.js
import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { uniform as uniform2, vec3 as vec32, vec4, mrt, output, fract, sin, cos, dot, floor, smoothstep as smoothstep2, modelWorldMatrix, positionLocal, Fn as Fn2 } from "three/tsl";

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
      const [p10, q, r] = corners[k];
      _e1.subVectors(q, p10).normalize();
      _e2.subVectors(r, p10).normalize();
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
function createHullMaterial({ THREE: THREE6, TSL: TSL2, color, thickness, normalName = "outlineNormal" }) {
  const { Fn: Fn5, vec4: vec44, attribute, positionLocal: positionLocal2, modelViewMatrix, cameraProjectionMatrix, screenSize: screenSize3 } = TSL2;
  const material = new THREE6.MeshBasicNodeMaterial({ side: BackSide });
  material.colorNode = color;
  material.vertexNode = Fn5(() => {
    const clip = cameraProjectionMatrix.mul(modelViewMatrix).mul(vec44(positionLocal2, 1));
    const nView = modelViewMatrix.mul(vec44(attribute(normalName, "vec3"), 0)).xyz;
    const nClip = cameraProjectionMatrix.mul(vec44(nView, 0)).xy;
    const pixels = thickness.mul(screenSize3.y.div(1080));
    const offset = nClip.normalize().mul(pixels).mul(2).div(screenSize3).mul(clip.w);
    return vec44(clip.xy.add(offset), clip.zw);
  })();
  return material;
}

// src/runtime/registry/define.js
var CHEAP = { class: "cheap", fpe: 0.1 };
var MEDIUM = { class: "medium", fpe: 1 };
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

// src/runtime/registry/quality.js
var p9 = (e) => param("quality", e);
var quality_default = [
  p9({
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
  { id: "media", label: "Media", stage: "DISPLAY", perPart: "no" },
  { id: "quality", label: "Quality", stage: "pass", perPart: "no" }
];
var PARTS = ["sky", "terrain", "water", "foliage", "architecture", "props", "characters", "hero", "vfx"];
var PART_INDEX = Object.fromEntries(PARTS.map((p10, i) => [p10, i]));
var REGISTRY = [...lighting_default, ...surface_default, ...lines_default, ...palette_default, ...atmosphere_default, ...lens_default, ...grade_default, ...media_default, ...quality_default];
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
  return entry.brief.replace("{value}", valueLabel(entry, value)).replace("{label}", valueLabel(entry, value));
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
  const p10 = hexToOklab(a), q = hexToOklab(b);
  return oklabToHex(p10.map((v, i) => v + (q[i] - v) * t));
}
function adjustHex(hex, { saturation: saturation2 = 1, value = 1, hue = 0 } = {}) {
  if (saturation2 === 1 && value === 1 && hue === 0) return hex.toLowerCase();
  const [L, C, h] = oklabToOklch(hexToOklab(hex));
  return oklabToHex(oklchToOklab([clamp01(L * value), C * saturation2, h + hue]));
}
function remapToPalette(hex, palette, { keepValue = true } = {}) {
  if (!palette || palette.length === 0) return hex.toLowerCase();
  const lab = hexToOklab(hex);
  let best = null, bestD = Infinity;
  for (const entry of palette) {
    const p10 = hexToOklab(entry);
    const d = 0.5 * (p10[0] - lab[0]) ** 2 + (p10[1] - lab[1]) ** 2 + (p10[2] - lab[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p10;
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
var objectIdNode = Fn2(() => {
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
var structKey = (v) => `${v["surface.model"]}|${v["surface.model"] === "pbr" ? 0 : v["surface.bands"]}|${v["surface.flatNormals"] ? 1 : 0}`;
var StyleMaterials = class {
  /**
   * @param {object} o
   * @param {Node} o.time - seconds uniform (freezable by the host)
   * @param {Node} o.keyDirection - world-space direction toward the key light
   */
  constructor({ time, keyDirection }) {
    this.time = time;
    this.keyDirection = keyDirection;
    this.parts = Object.fromEntries(PARTS.map((p10) => [p10, {
      surface: createSurfaceUniforms(),
      hullColor: uniform2(new THREE.Color("#1b1d2a")),
      hullThickness: uniform2(1.5),
      hullEnabled: false,
      struct: null,
      values: null
    }]));
    this.styled = /* @__PURE__ */ new Map();
    this.plain = /* @__PURE__ */ new Map();
    this.hulls = /* @__PURE__ */ new Map();
    this.entries = [];
    this.built = 0;
  }
  waveNode(wave) {
    if (!wave) return null;
    const { amplitude, frequency, falloff = 90 } = wave;
    const t = this.time;
    const fade = smoothstep2(falloff, falloff * 0.4, positionLocal.xz.length());
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
    material.side = style.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
    if (style.emissive) {
      material.emissive = new THREE.Color(style.emissive);
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
    material = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(style.color), roughness: style.roughness ?? 0.8, metalness: style.metalness ?? 0, fog: false });
    material.name = "plain";
    this.common(material, style);
    this.plain.set(key, material);
    return material;
  }
  hullMaterial(part) {
    let material = this.hulls.get(part);
    if (material) return material;
    const pv = this.parts[part];
    material = createHullMaterial({ THREE, TSL, color: pv.hullColor, thickness: pv.hullThickness });
    material.name = `hull:${part}`;
    material.mrtNode = mrt({ output, ids: idsNode(part) });
    this.hulls.set(part, material);
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
      const plain = mesh.isSkinnedMesh ? new THREE.SkinnedMesh(mesh.geometry, this.plainMaterial(style)) : new THREE.Mesh(mesh.geometry, this.plainMaterial(style));
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
      const hull = new THREE.Mesh(g, this.hullMaterial(entry.part));
      hull.name = "hull";
      hull.layers.set(LAYER_STYLED);
      hull.castShadow = hull.receiveShadow = false;
      entry.mesh.add(hull);
      entry.hull = hull;
    }
    if (entry.hull) entry.hull.visible = want;
  }
  /**
   * Applies resolved per-part values. Returns the parts whose materials were rebuilt.
   * @param {object} parts - resolveLook().parts
   */
  apply(parts) {
    const rebuilt = [];
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
      const key = structKey(v);
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
import * as THREE2 from "three/webgpu";
import { Fn as Fn3, uniform as uniform3, vec3 as vec33, float as float2, mix as mix2, smoothstep as smoothstep3, step as step2, select as select2, exp, floor as floor2, fract as fract2, fwidth as fwidth2, max as max2, acos, clamp, positionWorld, positionView, cameraPosition, fog, mrt as mrt2, output as output2 } from "three/tsl";
function createAtmosphereUniforms() {
  return {
    zenith: uniform3(new THREE2.Color("#87ceeb")),
    horizon: uniform3(new THREE2.Color("#87ceeb")),
    ground: uniform3(new THREE2.Color("#87ceeb")),
    exponent: uniform3(1),
    sunDirection: uniform3(new THREE2.Vector3(0, 1, 0)),
    sunColor: uniform3(new THREE2.Color("#ffffff")),
    sunRadius: uniform3(0),
    // radians
    sunSoftness: uniform3(0.5),
    fogType: uniform3(0),
    // 0 off · 1 linear · 2 exp · 3 exp2
    fogAmount: uniform3(1),
    fogDensity: uniform3(8e-3),
    fogStart: uniform3(10),
    fogEnd: uniform3(200),
    fogColor: uniform3(new THREE2.Color("#c8dcf0")),
    fogSkyTint: uniform3(1),
    fogBands: uniform3(0)
  };
}
var FOG_TYPES = { off: 0, linear: 1, exp: 2, exp2: 3 };
function skyGradient(u, dir) {
  const up = clamp(dir.y, 0, 1).pow(u.exponent);
  const above = mix2(u.horizon, u.zenith, up);
  const below = mix2(u.horizon, u.ground, smoothstep3(0, 0.08, dir.y.negate()));
  return mix2(below, above, step2(0, dir.y));
}
function skyColor(u, dir) {
  const angle = acos(clamp(dir.dot(u.sunDirection), -1, 1));
  const r = max2(u.sunRadius, 1e-4);
  const disc = smoothstep3(r.mul(u.sunSoftness.mul(-0.85).add(1)).sub(1e-4), r, angle).oneMinus().mul(step2(1e-4, u.sunRadius));
  const halo = exp(angle.div(r.mul(3)).negate()).mul(0.15).mul(step2(1e-4, u.sunRadius));
  return skyGradient(u, dir).add(u.sunColor.mul(disc.add(halo)));
}
function fogFactor(u, dist) {
  const linear = smoothstep3(u.fogStart, u.fogEnd, dist);
  const e = exp(u.fogDensity.mul(dist).negate()).oneMinus();
  const e2 = exp(u.fogDensity.mul(dist).pow(2).negate()).oneMinus();
  const f = select2(u.fogType.equal(1), linear, select2(u.fogType.equal(2), e, select2(u.fogType.equal(3), e2, float2(0))));
  const x = f.mul(u.fogBands);
  const aa = max2(fwidth2(x).mul(0.75), 0.02);
  const banded = floor2(x).add(smoothstep3(aa.oneMinus().mul(0.5), aa.add(1).mul(0.5), fract2(x))).div(max2(u.fogBands, 1));
  return select2(u.fogBands.greaterThan(0.5), banded, f).mul(u.fogAmount);
}
function createFogNode(u) {
  const viewDir = positionWorld.sub(cameraPosition).normalize();
  const flat = vec33(viewDir.x, max2(viewDir.y, 0), viewDir.z).normalize();
  const color = mix2(u.fogColor, skyGradient(u, flat), u.fogSkyTint);
  return fog(color, fogFactor(u, positionView.length()));
}
function dome(material, layer) {
  const mesh = new THREE2.Mesh(new THREE2.SphereGeometry(1, 48, 24), material);
  mesh.layers.set(layer);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1e3;
  mesh.castShadow = mesh.receiveShadow = false;
  mesh.name = "sky dome";
  return mesh;
}
function createSkyDomes(u, { layerStyled, layerPlain, idsNode: idsNode2 }) {
  const styled = new THREE2.MeshBasicNodeMaterial({ side: THREE2.BackSide, depthWrite: false, fog: false });
  styled.colorNode = Fn3(() => skyColor(u, positionWorld.sub(cameraPosition).normalize()))();
  styled.mrtNode = mrt2({ output: output2, ids: idsNode2 });
  const plain = new THREE2.MeshBasicNodeMaterial({ side: THREE2.BackSide, depthWrite: false, fog: false, color: new THREE2.Color("#87ceeb") });
  return { styled: dome(styled, layerStyled), plain: dome(plain, layerPlain) };
}

// src/runtime/post/graph.js
import * as THREE3 from "three/webgpu";
import { uniform as uniform4, vec2 as vec22, vec3 as vec35, vec4 as vec42, mix as mix4, max as max4, smoothstep as smoothstep5, step as step4, abs as abs2, sin as sin2, dot as dot2, fract as fract3, floor as floor3, length, luminance as luminance2, saturation, renderOutput, screenUV as screenUV2, screenSize as screenSize2, screenCoordinate } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { fxaa } from "three/addons/tsl/display/FXAANode.js";

// src/runtime/post/lines.js
import { Fn as Fn4, vec2, vec3 as vec34, float as float3, screenUV, screenSize, max as max3, mix as mix3, smoothstep as smoothstep4, step as step3, abs, colorToDirection, perspectiveDepthToViewZ } from "three/tsl";
var PAIRS = [[1, 0], [0, 1], [0.7071, 0.7071], [0.7071, -0.7071]];
function screenLines(color, b, u, atmos) {
  return Fn4(() => {
    const uv = screenUV;
    const px = vec2(1).div(screenSize);
    const radius = max3(u.thickness.mul(screenSize.y.div(1080)), 0);
    const dist = (d) => perspectiveDepthToViewZ(d, u.near, u.far).negate();
    const d0 = dist(b.depth.sample(uv).r).toVar();
    const n0 = colorToDirection(b.normal.sample(uv).rgb).toVar();
    const id0 = b.ids.sample(uv).rg.toVar();
    const depthEdge = float3(0).toVar();
    const normalEdge = float3(0).toVar();
    const idEdge = float3(0).toVar();
    const w0 = d0.reciprocal();
    for (const [x, y] of PAIRS) {
      const o = vec2(x, y).mul(px).mul(radius);
      const samples = [uv.add(o), uv.sub(o)];
      const da = dist(b.depth.sample(samples[0]).r), db = dist(b.depth.sample(samples[1]).r);
      const lap = da.reciprocal().add(db.reciprocal()).sub(w0.mul(2)).div(w0);
      depthEdge.assign(max3(depthEdge, lap.negate()));
      for (const [k, s] of samples.entries()) {
        const n = colorToDirection(b.normal.sample(k === 0 ? uv.add(o.mul(0.5)) : uv.sub(o.mul(0.5))).rgb);
        normalEdge.assign(max3(normalEdge, n.dot(n0).oneMinus()));
        const id = b.ids.sample(s).rg;
        const differs = step3(0.5 / 255, abs(id.x.sub(id0.x)).add(abs(id.y.sub(id0.y))));
        const notCloser = step3(d0.mul(0.999), k === 0 ? da : db);
        idEdge.assign(max3(idEdge, differs.mul(notCloser)));
      }
    }
    const th = u.depthThreshold.div(abs(n0.z).clamp(0.25, 1));
    const silhouette = smoothstep4(th.mul(0.5), th, depthEdge).mul(u.silhouette);
    const crease = smoothstep4(u.creaseThreshold.mul(0.8), u.creaseThreshold.mul(1.25), normalEdge).mul(u.crease);
    const edge = max3(silhouette, max3(crease, idEdge.mul(u.idWeight))).mul(step3(0.01, radius));
    const fade = fogFactor(atmos, d0).mul(u.followFog).oneMinus();
    return vec34(mix3(color.rgb, u.color, edge.clamp().mul(fade)));
  })();
}

// src/runtime/post/graph.js
var TONE_MAPPING = {
  none: THREE3.NoToneMapping,
  linear: THREE3.LinearToneMapping,
  reinhard: THREE3.ReinhardToneMapping,
  cineon: THREE3.CineonToneMapping,
  aces: THREE3.ACESFilmicToneMapping,
  agx: THREE3.AgXToneMapping,
  neutral: THREE3.NeutralToneMapping
};
function setDisplayColor(u, hex) {
  const [r, g, b] = hexToRgb(hex);
  u.value.setRGB(r, g, b, THREE3.LinearSRGBColorSpace);
}
var displayColor = (hex) => {
  const u = uniform4(new THREE3.Color());
  setDisplayColor(u, hex);
  return u;
};
function createPostUniforms() {
  return {
    exposure: uniform4(new THREE3.Vector3(1, 1, 1)),
    contrast: uniform4(1),
    saturation: uniform4(1),
    splitAmount: uniform4(0),
    splitShadows: displayColor("#2e5f8a"),
    splitHighlights: displayColor("#ffb46b"),
    splitBalance: uniform4(0),
    vignetteAmount: uniform4(0),
    vignetteSoftness: uniform4(0.5),
    vignetteRoundness: uniform4(1),
    vignetteColor: displayColor("#000000"),
    grainAmount: uniform4(0),
    grainSize: uniform4(1.5),
    grainAnimated: uniform4(1),
    lines: {
      thickness: uniform4(1.5),
      color: displayColor("#0e0e12"),
      silhouette: uniform4(1),
      crease: uniform4(0.5),
      creaseThreshold: uniform4(0.18),
      depthThreshold: uniform4(0.03),
      idWeight: uniform4(1),
      followFog: uniform4(1),
      near: uniform4(0.1),
      far: uniform4(1e3)
    },
    // Compare composite (§6.9): hold, split wipe and flicker never rebuild.
    hold: uniform4(0),
    split: uniform4(0),
    splitPos: uniform4(0.5),
    flicker: uniform4(0),
    time: uniform4(0)
  };
}
function applyPostValues(U, v) {
  const ev = Math.pow(2, v["grade.exposure"]);
  const wb = whiteBalanceGains(v["grade.temperature"], v["grade.tint"]);
  U.exposure.value.set(wb[0] * ev, wb[1] * ev, wb[2] * ev);
  U.contrast.value = v["grade.contrast"];
  U.saturation.value = v["grade.saturation"];
  U.splitAmount.value = v["grade.split.amount"];
  setDisplayColor(U.splitShadows, v["grade.split.shadows"]);
  setDisplayColor(U.splitHighlights, v["grade.split.highlights"]);
  U.splitBalance.value = v["grade.split.balance"];
  U.vignetteAmount.value = v["lens.vignette.amount"];
  U.vignetteSoftness.value = v["lens.vignette.softness"];
  U.vignetteRoundness.value = v["lens.vignette.roundness"];
  setDisplayColor(U.vignetteColor, v["lens.vignette.color"]);
  U.grainAmount.value = v["media.grain.amount"];
  U.grainSize.value = v["media.grain.size"];
  U.grainAnimated.value = v["media.grain.animated"] ? 1 : 0;
  const L = U.lines;
  L.thickness.value = v["lines.screen.thickness"];
  setDisplayColor(L.color, v["lines.screen.color"]);
  L.silhouette.value = v["lines.screen.silhouette"];
  L.crease.value = v["lines.screen.crease"];
  L.creaseThreshold.value = 1 - Math.cos(v["lines.screen.creaseAngle"] * Math.PI / 180);
  L.depthThreshold.value = v["lines.screen.depthThreshold"];
  L.idWeight.value = v["lines.screen.idWeight"];
  L.followFog.value = v["lines.screen.followFog"];
}
var graphKey = (v) => [v["grade.toneMapping"], v["lens.bloom.enabled"] ? "bloom" : "", v["lines.screen.enabled"] ? "lines" : ""].join("|");
var needsMRT = (v) => v["lines.screen.enabled"] === true;
function grade(c, U) {
  let x = c.sub(0.5).mul(U.contrast).add(0.5).max(0);
  x = saturation(x, U.saturation);
  const h = smoothstep5(0.05, 0.95, luminance2(x).sub(U.splitBalance.mul(0.25)));
  const tone = mix4(U.splitShadows, U.splitHighlights, h);
  const softLight = x.mul(x).mul(tone.mul(2).oneMinus()).add(x.mul(tone).mul(2));
  return mix4(x, softLight, U.splitAmount);
}
function display(c, U) {
  const aspect = screenSize2.x.div(screenSize2.y);
  const sx = mix4(1, aspect, U.vignetteRoundness);
  const p10 = screenUV2.sub(0.5).mul(2).mul(vec22(sx, 1));
  const r = length(p10).div(length(vec22(sx, 1)));
  const v = smoothstep5(U.vignetteSoftness.oneMinus(), U.vignetteSoftness.mul(0.2).add(1), r).mul(U.vignetteAmount);
  let x = mix4(c, U.vignetteColor, v);
  const cell = floor3(screenCoordinate.xy.div(U.grainSize.mul(screenSize2.y.div(1080)).max(1)));
  const seed = floor3(U.time.mul(24)).mul(U.grainAnimated);
  const n = fract3(sin2(dot2(cell.add(vec22(seed.mul(17.13), seed.mul(41.7))), vec22(12.9898, 78.233))).mul(43758.5453)).sub(0.5);
  const response = luminance2(x).sub(0.5).mul(2).pow(2).mul(0.6).oneMinus();
  x = x.add(n.mul(U.grainAmount).mul(2).mul(response));
  return x;
}
function buildGraph({ styledPass, plainPass, values, U, atmos }) {
  const owned = [];
  const hdr = styledPass.getTextureNode("output");
  let c = vec35(hdr.rgb);
  let bloomNode = null;
  if (values["lens.bloom.enabled"]) {
    bloomNode = bloom(hdr, values["lens.bloom.strength"], values["lens.bloom.radius"], values["lens.bloom.threshold"]);
    owned.push(bloomNode);
    c = c.add(bloomNode.rgb);
  }
  c = c.mul(U.exposure);
  c = renderOutput(vec42(c, 1), TONE_MAPPING[values["grade.toneMapping"]], THREE3.SRGBColorSpace).rgb;
  c = grade(c, U);
  if (values["lines.screen.enabled"]) {
    c = screenLines(c, { depth: styledPass.getTextureNode("depth"), normal: styledPass.getTextureNode("normal"), ids: styledPass.getTextureNode("ids") }, U.lines, atmos);
    const aa = fxaa(vec42(c, 1));
    owned.push(aa);
    c = vec35(aa.rgb);
  }
  c = display(c, U);
  const plain = renderOutput(plainPass.getTextureNode("output"), THREE3.ACESFilmicToneMapping, THREE3.SRGBColorSpace).rgb;
  const showPlain = max4(U.hold, max4(U.flicker, U.split.mul(step4(screenUV2.x, U.splitPos))));
  let out = mix4(c, plain, showPlain);
  const divider = smoothstep5(0.5, 1.5, abs2(screenUV2.x.sub(U.splitPos)).mul(screenSize2.x)).oneMinus();
  out = mix4(out, vec35(1), divider.mul(U.split).mul(U.hold.oneMinus()));
  return { node: vec42(out, 1), bloomNode, owned };
}
function disposeOwned(owned) {
  for (const node of owned) {
    node.dispose?.();
    node.textureNode?.dispose?.();
  }
}

// src/runtime/render/rigs.js
import * as THREE4 from "three/webgpu";
function sun(layer) {
  const light = new THREE4.DirectionalLight(16777215, 2);
  light.layers.set(layer);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.bias = -5e-4;
  light.shadow.normalBias = 0.03;
  return light;
}
function hemisphere(layer) {
  const light = new THREE4.HemisphereLight(16777215, 4473924, 1);
  light.layers.set(layer);
  return light;
}
function lightDirection(elevation, azimuth, base) {
  const el = elevation * Math.PI / 180, az = azimuth * Math.PI / 180 + base;
  return new THREE4.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
}
var Rigs = class {
  constructor(scene) {
    this.styled = { sun: sun(LAYER_STYLED), hemi: hemisphere(LAYER_STYLED) };
    this.plain = { sun: sun(LAYER_PLAIN), hemi: hemisphere(LAYER_PLAIN) };
    this.frame = { center: new THREE4.Vector3(), radius: 10, base: 0 };
    for (const rig of [this.styled, this.plain]) {
      scene.add(rig.sun, rig.sun.target, rig.hemi);
    }
    this.direction = new THREE4.Vector3(0, 1, 0);
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
  const parts = {};
  for (const part of PARTS) {
    const map = {};
    for (const id of PART_PARAMS) map[id] = clone(values[id]);
    const chain = PART_PARENT[part] ? [PART_PARENT[part], part] : [part];
    for (const p10 of chain) Object.assign(map, look.parts?.[p10]?.params);
    for (const id of PART_PARAMS) if (id in overrides) map[id] = clone(overrides[id]);
    for (const p10 of chain) Object.assign(map, partOverrides[p10]);
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
  const l = new THREE5.Layers();
  l.set(n);
  return l;
};
var StyleRuntime = class {
  /**
   * @param {object} o
   * @param {THREE.WebGPURenderer} o.renderer
   * @param {THREE.PerspectiveCamera} o.camera
   */
  constructor({ renderer, camera }) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = new THREE5.Scene();
    this.U = createPostUniforms();
    this.atmos = createAtmosphereUniforms();
    this.scene.fogNode = createFogNode(this.atmos);
    this.materials = new StyleMaterials({ time: this.U.time, keyDirection: this.atmos.sunDirection });
    this.rigs = new Rigs(this.scene);
    this.domes = createSkyDomes(this.atmos, { layerStyled: LAYER_STYLED, layerPlain: LAYER_PLAIN, idsNode: idsNode("sky") });
    this.scene.add(this.domes.styled, this.domes.plain);
    this.post = new THREE5.PostProcessing(renderer);
    this.post.outputColorTransform = false;
    this.plainPass = pass(this.scene, camera, { samples: 4 }).setLayers(layers(LAYER_PLAIN));
    this.styledPass = null;
    this.passKey = null;
    this.graph = null;
    this.graphKey = null;
    this.root = null;
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
    root.traverse((o) => {
      if (!o.isLight) return;
      o.layers.set(LAYER_STYLED);
      o.layers.enable(LAYER_PLAIN);
      o.castShadow = false;
    });
    const hero = def.shots[def.defaultShot];
    this.rigs.setFrame({ center: def.shadow.center, radius: def.shadow.radius, heroPos: hero.pos, heroTarget: hero.target });
    this.camera.far = def.far;
    this.camera.updateProjectionMatrix();
    this.apply(this.resolved);
    this.markCompile("scene");
  }
  /**
   * Applies a resolved look (resolveLook()). Returns what was rebuilt.
   * @returns {{parts: string[], pass: boolean, graph: boolean}}
   */
  apply(resolved) {
    this.resolved = resolved;
    const v = this.values = resolved.global;
    const before = this.materials.built;
    const parts = this.materials.apply(resolved.parts);
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
    applyPostValues(this.U, v);
    const passKey = needsMRT(v) ? "mrt" : "msaa";
    const passRebuilt = passKey !== this.passKey;
    if (passRebuilt) {
      this.styledPass?.dispose();
      const p10 = pass(this.scene, this.camera, { samples: passKey === "mrt" ? 0 : 4 }).setLayers(layers(LAYER_STYLED));
      if (passKey === "mrt") p10.setMRT(mrt3({ output: output3, normal: directionToColor(normalView2), ids: vec43(0) }));
      this.styledPass = p10;
      this.passKey = passKey;
      this.info.passBuilds++;
    }
    this.styledPass.setResolutionScale(v["quality.resolution"]);
    const key = `${graphKey(v)}|${passKey}`;
    const graphRebuilt = key !== this.graphKey;
    if (graphRebuilt) {
      const previous = this.graph;
      this.graph = buildGraph({ styledPass: this.styledPass, plainPass: this.plainPass, values: v, U: this.U, atmos: this.atmos });
      this.post.outputNode = this.graph.node;
      this.post.needsUpdate = true;
      if (previous) disposeOwned(previous.owned);
      this.graphKey = key;
      this.info.graphBuilds++;
    }
    const b = this.graph.bloomNode;
    if (b) {
      b.strength.value = v["lens.bloom.strength"];
      b.radius.value = v["lens.bloom.radius"];
      b.threshold.value = v["lens.bloom.threshold"];
    }
    this.info.materialBuilds += this.materials.built - before;
    const rebuilt = { parts, pass: passRebuilt, graph: graphRebuilt };
    if (parts.length || passRebuilt || graphRebuilt) {
      this.info.lastRebuild = rebuilt;
      this.markCompile("rebuild");
    }
    return rebuilt;
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
  /** Per-frame state: time (freezable by the host), dome placement, depth range for lines. */
  update(t) {
    this.U.time.value = t;
    const r = this.camera.far * 0.9;
    for (const d of [this.domes.styled, this.domes.plain]) {
      d.position.copy(this.camera.position);
      d.scale.setScalar(r);
    }
    this.U.lines.near.value = this.camera.near;
    this.U.lines.far.value = this.camera.far;
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
    const step5 = MIGRATIONS[current.schema];
    if (!step5) throw new Error(`Can't read look schema ${current.schema}`);
    current = step5(current);
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
  const p10 = userData.part ?? userData.stylePart ?? userData.style?.part;
  return PARTS.includes(p10) ? p10 : null;
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
var RUNTIME_VERSION = "0.3.0";
export {
  LOOK_SCHEMA,
  MODULES,
  PARTS,
  PART_INDEX,
  PART_KEYWORDS,
  REGISTRY,
  RUNTIME_VERSION,
  StyleLightingModel,
  StyleRuntime,
  StyleSurfaceMaterial,
  applyStrength,
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
  resolveLook,
  timestampsSupported,
  validateLook,
  valueLabel
};
