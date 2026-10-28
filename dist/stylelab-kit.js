/* Style Lab kit v0.10.0 (2f4cb39): procedural assets, part-tagged, seeded, tiered */
// src/scenes/kit/core.js
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
var TIERS = [
  { id: 0, key: "blockout", name: "Blockout" },
  { id: 1, key: "lowpoly", name: "Low-poly" },
  { id: 2, key: "crafted", name: "Crafted" },
  { id: 3, key: "detailed", name: "Detailed" }
];
var byTier = (tier, values) => values[Math.min(tier, values.length - 1)];
function createRng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.fork = () => createRng(Math.floor(next() * 2 ** 31));
  return next;
}
function hash3(x, y, z, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(seed, 144665);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function noise3(x, y, z, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const s = (t) => t * t * (3 - 2 * t);
  const u = s(x - xi), v = s(y - yi), w = s(z - zi);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return L(
    L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v),
    L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v),
    w
  ) * 2 - 1;
}
function fbm(x, y, z, seed = 0, octaves = 3) {
  let sum = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * f, y * f, z * f, seed + i);
    amp *= 0.5;
    f *= 2;
  }
  return sum;
}
function displace(geometry, { amount = 0.1, scale = 1, seed = 0, center = new THREE.Vector3(), octaves = 3, axis = null } = {}) {
  const pos = geometry.getAttribute("position");
  const p = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const n = fbm(p.x * scale, p.y * scale, p.z * scale, seed, octaves) * amount;
    if (axis) d.copy(axis);
    else d.subVectors(p, center).normalize();
    p.addScaledVector(d, n);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
function faceted(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.computeVertexNormals();
  return g;
}
var KEEP = ["position", "normal"];
function merge(geometries) {
  const anyFlat = geometries.some((g) => !g.index);
  const prepared = geometries.map((g) => {
    let out = anyFlat && g.index ? g.toNonIndexed() : g;
    if (out === g) out = g.clone();
    for (const name of Object.keys(out.attributes)) if (!KEEP.includes(name)) out.deleteAttribute(name);
    if (!out.getAttribute("normal")) out.computeVertexNormals();
    return out;
  });
  return mergeGeometries(prepared, false);
}
function place(geometry, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),
    new THREE.Vector3(...typeof s === "number" ? [s, s, s] : s)
  );
  return geometry.applyMatrix4(m);
}
var PLACEHOLDER = new THREE.MeshBasicMaterial();
function mesh(geometry, { part, color = "#cccccc", roughness = 0.8, metalness = 0, emissive = null, emissiveIntensity = 1, wave = null, wind = null, opacity = 1, doubleSided = false, castShadow = true, receiveShadow = true, name = "" } = {}) {
  const m = new THREE.Mesh(geometry, PLACEHOLDER);
  m.name = name;
  m.castShadow = castShadow && opacity >= 1;
  m.receiveShadow = receiveShadow;
  m.userData.style = { part, color, roughness, metalness, emissive, emissiveIntensity, wave, wind, opacity, doubleSided };
  return m;
}
function practical({ color = "#ffb35c", intensity = 12, distance = 10, flicker = 0, seed = 0 } = {}) {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.name = "practical light";
  light.userData.practical = { flicker, seed };
  return light;
}
var count = (base, density = 1) => Math.max(1, Math.round(base * density));
function at(object, p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  object.position.set(...p);
  object.rotation.set(...r);
  if (typeof s === "number") object.scale.setScalar(s);
  else object.scale.set(...s);
  return object;
}
function group(name, ...children) {
  const g = new THREE.Group();
  g.name = name;
  for (const c of children) if (c) g.add(c);
  return g;
}
function countTriangles(root) {
  let n = 0;
  root.traverse((o) => {
    if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.getAttribute("position").count) / 3;
  });
  return n;
}

// src/scenes/kit/shapes.js
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
var finish = (g, tier) => tier === 1 ? faceted(g) : g;
function sphere(tier, r, o) {
  const [w, h] = byTier(tier, [[10, 7], [12, 8], [40, 28], [96, 64]]);
  return mesh(finish(new THREE.SphereGeometry(r, w, h), tier), o);
}
function box(tier, size, o, { bevel = 0.08 } = {}) {
  const [x, y, z] = size;
  const g = tier >= 2 ? new RoundedBoxGeometry(x, y, z, tier === 2 ? 3 : 6, Math.min(x, y, z) * bevel) : new THREE.BoxGeometry(x, y, z);
  return mesh(g, o);
}
function beveledBox(tier, s, o) {
  const g = tier === 0 ? new THREE.BoxGeometry(s, s, s) : new RoundedBoxGeometry(s, s, s, byTier(tier, [1, 1, 4, 10]), s * 0.14);
  return mesh(finish(g, tier), o);
}
function cylinder(tier, r, h, o, { top = r } = {}) {
  const g = new THREE.CylinderGeometry(top, r, h, byTier(tier, [8, 10, 40, 96]), byTier(tier, [1, 1, 2, 8]));
  return mesh(finish(g, tier), o);
}
function torusKnot(tier, r, tube, o) {
  const [t, rad] = byTier(tier, [[48, 6], [64, 6], [180, 20], [420, 48]]);
  return mesh(finish(new THREE.TorusKnotGeometry(r, tube, t, rad), tier), o);
}
function rock(tier, r, rng, o) {
  const g = new THREE.IcosahedronGeometry(r, byTier(tier, [0, 1, 3, 5]));
  const seed = Math.floor(rng() * 1e3);
  if (tier >= 1) displace(g, { amount: r * byTier(tier, [0, 0.28, 0.25, 0.3]), scale: 1.6 / r, seed, octaves: tier === 3 ? 5 : 3 });
  g.scale(1, 0.72, 1);
  g.computeVertexNormals();
  return mesh(tier === 1 ? faceted(g) : g, { part: "props", color: "#8d8b84", ...o });
}
var CHART = [
  "#735244",
  "#c29682",
  "#627a9d",
  "#576c43",
  "#8580b1",
  "#67bdaa",
  "#d67e2c",
  "#505ba6",
  "#c15a63",
  "#5e3c6c",
  "#9dbc40",
  "#e0a32e",
  "#383d96",
  "#469449",
  "#af363c",
  "#e7c71f",
  "#bb5695",
  "#0885a1",
  "#f3f3f2",
  "#c8c8c8",
  "#a0a0a0",
  "#7a7a79",
  "#555555",
  "#343434"
];
function colorChart(tier) {
  const g = new THREE.Group();
  g.name = "color chart";
  const board = box(tier, [2.1, 1.45, 0.06], { part: "props", color: "#1f1f1f" });
  board.position.y = 0.72;
  g.add(board);
  const patch = 0.3, gap = 0.04;
  CHART.forEach((color, i) => {
    const col = i % 6, row = Math.floor(i / 6);
    const p = new THREE.BoxGeometry(patch, patch, 0.02);
    const m = mesh(p, { part: "props", color, castShadow: false });
    m.position.set((col - 2.5) * (patch + gap), 1.24 - row * (patch + gap), 0.04);
    g.add(m);
  });
  return g;
}
function grayCard(tier) {
  const legs = [-0.25, 0.25].map((x) => place(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), { p: [x, 0.3, 0] }));
  const g = new THREE.Group();
  g.name = "gray card";
  const card = box(tier, [0.7, 0.9, 0.03], { part: "props", color: "#767676" });
  card.position.y = 1.05;
  g.add(card, mesh(merge(legs), { part: "props", color: "#2a2a2a" }));
  return g;
}

// src/scenes/kit/buildings.js
var A = "architecture";
function gableRoof(w, d, h, overhang) {
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2 - overhang, 0);
  shape.lineTo(0, h);
  shape.lineTo(d / 2 + overhang, 0);
  shape.lineTo(-d / 2 - overhang, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: w + overhang * 2, bevelEnabled: false });
  g.translate(0, 0, -(w + overhang * 2) / 2);
  g.rotateY(Math.PI / 2);
  return g;
}
function house(tier, c, { w = 3, d = 2.6, h = 2.2 } = {}) {
  const root = group("house");
  const walls = box(tier, [w, h, d], { part: A, color: c.wall }, { bevel: 0.03 });
  walls.position.y = h / 2;
  root.add(walls);
  if (tier === 0) {
    const roof2 = mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2, 1.3, 4), { part: A, color: c.roof });
    roof2.position.y = h + 0.65;
    roof2.rotation.y = Math.PI / 4;
    root.add(roof2);
    return root;
  }
  const roofH = 1.3, over = byTier(tier, [0, 0.25, 0.3, 0.3]);
  const roof = mesh(faceted(gableRoof(w, d, roofH, over)), { part: A, color: c.roof });
  roof.position.y = h;
  root.add(roof);
  const door = box(tier, [0.7, 1.3, 0.1], { part: A, color: c.door });
  door.position.set(0, 0.65, d / 2 + 0.03);
  root.add(door);
  const windows = [];
  const frames = [];
  for (const x of [-w / 3.2, w / 3.2]) {
    windows.push(place(new THREE.BoxGeometry(0.5, 0.5, 0.05), { p: [x, h * 0.6, d / 2 + 0.02] }));
    frames.push(place(new THREE.BoxGeometry(0.66, 0.08, 0.1), { p: [x, h * 0.6 - 0.3, d / 2 + 0.04] }));
    if (tier >= 2) frames.push(place(new THREE.BoxGeometry(0.66, 0.06, 0.08), { p: [x, h * 0.6 + 0.3, d / 2 + 0.04] }));
  }
  root.add(mesh(merge(windows), { part: A, color: "#2b3a55", roughness: 0.3 }));
  root.add(mesh(merge(frames), { part: A, color: c.trim }));
  const chimney = box(tier, [0.4, 1, 0.4], { part: A, color: "#8f8a85" });
  chimney.position.set(w / 3, h + 0.9, -d / 5);
  root.add(chimney);
  if (tier >= 2) {
    const trims = [];
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) trims.push(place(new THREE.BoxGeometry(0.12, h, 0.12), { p: [x, h / 2, z] }));
    root.add(mesh(merge(trims), { part: A, color: c.trim }));
    const plinth = box(tier, [w + 0.16, 0.25, d + 0.16], { part: A, color: "#9b9590" });
    plinth.position.y = 0.12;
    root.add(plinth);
  }
  if (tier >= 3) {
    const tiles = [];
    const slope = Math.atan2(roofH, d / 2 + over);
    const len = Math.hypot(roofH, d / 2 + over);
    const rows = 9, cols = Math.round((w + over * 2) / 0.22);
    for (const side of [-1, 1]) {
      for (let r = 0; r < rows; r++) {
        const t = (r + 0.5) / rows;
        const y = h + roofH * (1 - t) + 0.04;
        const z = side * (d / 2 + over) * t;
        for (let k = 0; k < cols; k++) {
          const x = -(w + over * 2) / 2 + (k + 0.5 + r % 2 * 0.5) * (w + over * 2) / (cols + 0.5);
          tiles.push(place(new THREE.BoxGeometry(0.2, 0.03, len / rows + 0.04), { p: [x, y, z], r: [side * slope, 0, 0] }));
        }
      }
    }
    root.add(mesh(merge(tiles), { part: A, color: c.roof }));
    const boards = [];
    for (let y = 0.3; y < h - 0.1; y += 0.18) for (const x of [-w / 2 - 0.02, w / 2 + 0.02]) boards.push(place(new THREE.BoxGeometry(0.04, 0.05, d - 0.1), { p: [x, y, 0] }));
    root.add(mesh(merge(boards), { part: A, color: c.trim }));
    const handle = mesh(new THREE.SphereGeometry(0.05, 10, 8), { part: A, color: "#d4af37", roughness: 0.3 });
    handle.position.set(0.22, 0.65, d / 2 + 0.1);
    root.add(handle);
  }
  return root;
}
function lighthouse(tier) {
  const root = group("lighthouse");
  const H = 9;
  const tower = cylinder(tier, 1.5, H, { part: A, color: "#f4f1ea" }, { top: 1.05 });
  tower.position.y = H / 2;
  root.add(tower);
  if (tier >= 1) {
    const stripes = [];
    for (const y of [2, 5]) stripes.push(place(new THREE.CylinderGeometry(1.5 - (y + 0.7) / H * 0.45 + 0.03, 1.5 - y / H * 0.45 + 0.03, 1.4, byTier(tier, [8, 10, 40, 96])), { p: [0, y + 0.7, 0] }));
    root.add(mesh(tier === 1 ? faceted(merge(stripes)) : merge(stripes), { part: A, color: "#c8352e" }));
  }
  const lamp = cylinder(tier, 0.75, 1.1, { part: "vfx", color: "#ffe9a8", emissive: "#ffd76a", emissiveIntensity: 2.5, castShadow: false });
  lamp.position.y = H + 0.55;
  root.add(lamp);
  const cap = mesh(new THREE.ConeGeometry(1.05, 1.2, byTier(tier, [8, 10, 32, 64])), { part: A, color: "#c8352e" });
  cap.position.y = H + 1.7;
  root.add(cap);
  if (tier >= 2) {
    const gallery = cylinder(tier, 1.4, 0.18, { part: A, color: "#3d3d3d" });
    gallery.position.y = H + 0.02;
    root.add(gallery);
    const bars = [];
    const n = tier === 3 ? 36 : 16;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      bars.push(place(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 5), { p: [Math.cos(a) * 1.3, H + 0.4, Math.sin(a) * 1.3] }));
    }
    bars.push(place(new THREE.TorusGeometry(1.3, 0.03, 6, tier === 3 ? 64 : 32), { p: [0, H + 0.7, 0], r: [Math.PI / 2, 0, 0] }));
    root.add(mesh(merge(bars), { part: A, color: "#3d3d3d" }));
    const door = box(tier, [0.7, 1.4, 0.2], { part: A, color: "#4e342e" });
    door.position.set(0, 0.7, 1.45);
    root.add(door);
  }
  return root;
}
function dock(tier, { length = 14, width = 2.6 } = {}) {
  const root = group("dock");
  const wood = "#9c6b3f", post = "#6d4a2d";
  const posts = [];
  for (let z = 1; z <= length; z += length / byTier(tier, [3, 4, 5, 7])) for (const x of [-width / 2, width / 2]) posts.push([x, z]);
  if (tier === 0) {
    const deck = mesh(new THREE.BoxGeometry(width, 0.25, length), { part: A, color: wood });
    deck.position.set(0, 1, length / 2);
    root.add(deck);
  } else {
    const planks = [];
    const n = byTier(tier, [1, 10, 28, 56]);
    for (let i = 0; i < n; i++) {
      const z = (i + 0.5) * length / n;
      const tilt = tier === 3 ? (i * 7919 % 13 - 6) * 2e-3 : 0;
      planks.push(place(new THREE.BoxGeometry(width + 0.2, 0.1, length / n * 0.88), { p: [0, 1.05, z], r: [tilt, 0, tilt] }));
    }
    root.add(mesh(merge(planks), { part: A, color: wood }));
    const beams = [-width / 2 + 0.2, width / 2 - 0.2].map((x) => place(new THREE.BoxGeometry(0.2, 0.2, length), { p: [x, 0.9, length / 2] }));
    root.add(mesh(merge(beams), { part: A, color: post }));
  }
  const segs = byTier(tier, [6, 7, 16, 32]);
  const postGeoms = posts.map(([x, z]) => place(new THREE.CylinderGeometry(0.16, 0.18, 2.6, segs), { p: [x, 0.3, z] }));
  if (tier >= 3) for (const [x, z] of posts) postGeoms.push(place(new THREE.TorusGeometry(0.2, 0.05, 8, 24), { p: [x, 1.3, z], r: [Math.PI / 2, 0, 0] }));
  root.add(mesh(tier === 1 ? faceted(merge(postGeoms)) : merge(postGeoms), { part: A, color: post }));
  return { root, posts };
}

// src/scenes/kit/nature.js
function tree(tier, rng, { height = 3.2, leaf = "#5f9e3a", trunk = "#7b5537" } = {}) {
  const root = group("tree");
  const th = height * 0.45;
  const trunkG = new THREE.CylinderGeometry(byTier(tier, [0.18, 0.15, 0.12, 0.12]), 0.22, th, byTier(tier, [6, 6, 12, 24]));
  trunkG.translate(0, th / 2, 0);
  root.add(mesh(tier === 1 ? faceted(trunkG) : trunkG, { part: "foliage", color: trunk }));
  const r = height * 0.32;
  const cy = th + r * 0.8;
  const blobs = byTier(tier, [1, 3, 4, 14]);
  const leaves = [];
  for (let i = 0; i < blobs; i++) {
    const a = i / blobs * Math.PI * 2 + rng() * 0.5;
    const spread = i === 0 ? 0 : r * byTier(tier, [0, 0.55, 0.55, 0.75]);
    const br = i === 0 ? r : r * rng.range(0.5, 0.72);
    const g = tier === 0 ? new THREE.SphereGeometry(br, 8, 6) : new THREE.IcosahedronGeometry(br, byTier(tier, [0, 1, 3, 2]));
    const p = [Math.cos(a) * spread, cy + (i === 0 ? 0 : rng.range(-0.2, 0.45) * r), Math.sin(a) * spread];
    if (tier >= 1) displace(g, { amount: br * byTier(tier, [0, 0.12, 0.08, 0.16]), scale: 2.2 / br, seed: Math.floor(rng() * 999) });
    leaves.push(place(g, { p }));
  }
  if (tier >= 3) {
    const branches = [];
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      branches.push(place(new THREE.CylinderGeometry(0.03, 0.07, r * 1.1, 8), { p: [Math.cos(a) * r * 0.3, th + r * 0.3, Math.sin(a) * r * 0.3], r: [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7] }));
    }
    root.add(mesh(merge(branches), { part: "foliage", color: trunk }));
  }
  const canopy = merge(leaves);
  root.add(mesh(tier === 1 ? faceted(canopy) : canopy, { part: "foliage", color: leaf }));
  return root;
}
function hillHeight(r, { radius = 16, height = 4, edge = -0.6, power = 1.3 } = {}) {
  const t = Math.min(1, r / radius);
  return edge + (height - edge) * (0.5 + 0.5 * Math.cos(Math.PI * Math.pow(t, power)));
}
function hill(tier, { radius = 16, height = 4, color = "#7cb342", seed = 1, rough = 0.15, edge = -0.6, power = 1.3 } = {}) {
  const steps = byTier(tier, [4, 6, 14, 40]);
  const pts = [];
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    pts.push(new THREE.Vector2(Math.max(1e-3, radius * t), hillHeight(radius * t, { radius, height, edge, power })));
  }
  let g = new THREE.LatheGeometry(pts, byTier(tier, [10, 12, 48, 128]));
  if (tier >= 2) {
    const pos = g.getAttribute("position");
    const amp = height * rough * (tier === 3 ? 1 : 0.6);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const fall = Math.min(1, Math.hypot(x, z) / radius);
      pos.setY(i, pos.getY(i) + fbm(x * 0.18, 0, z * 0.18, seed, tier === 3 ? 5 : 3) * amp * (1 - fall * fall));
    }
    g.computeVertexNormals();
  }
  if (tier === 1) g = faceted(g);
  return mesh(g, { part: "terrain", color });
}
function ring(tier, inner, outer, y, o) {
  const g = new THREE.RingGeometry(inner, outer, byTier(tier, [16, 20, 64, 160]), 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return mesh(g, { castShadow: false, ...o });
}
function sea(tier, { radius = 420, color = "#2f7fb8" } = {}) {
  const g = new THREE.CircleGeometry(radius, byTier(tier, [32, 48, 96, 160]));
  g.rotateX(-Math.PI / 2);
  if (tier >= 2) {
    const rings = [];
    const n = byTier(tier, [0, 0, 40, 110]);
    for (let i = 0; i < n; i++) {
      const r0 = 18 + i * i * 0.032, r1 = 18 + (i + 1) * (i + 1) * 0.032;
      const rg = new THREE.RingGeometry(r0, r1, byTier(tier, [0, 0, 96, 220]), 1);
      rg.rotateX(-Math.PI / 2);
      rings.push(rg);
    }
    const outer = new THREE.RingGeometry(18 + n * n * 0.032, radius, 96, 4);
    outer.rotateX(-Math.PI / 2);
    rings.push(outer);
    return mesh(merge(rings), { part: "water", color, roughness: 0.3, wave: { amplitude: 0.12, frequency: 0.35 }, castShadow: false });
  }
  return mesh(g, { part: "water", color, roughness: 0.3, wave: tier >= 1 ? { amplitude: 0.08, frequency: 0.35 } : null, castShadow: false });
}
function cloud(tier, rng, { size = 10 } = {}) {
  const n = byTier(tier, [1, 3, 5, 9]);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const r = size * (i === 0 ? 0.5 : rng.range(0.28, 0.42));
    const g2 = tier === 0 ? new THREE.SphereGeometry(r, 10, 7) : new THREE.IcosahedronGeometry(r, byTier(tier, [0, 1, 3, 4]));
    g2.scale(1, 0.62, 1);
    const x = i === 0 ? 0 : rng.range(-0.9, 0.9) * size * 0.55;
    parts.push(place(g2, { p: [x, i === 0 ? 0 : rng.range(-0.1, 0.18) * size, rng.range(-0.3, 0.3) * size * 0.4] }));
  }
  const g = merge(parts);
  return mesh(tier === 1 ? faceted(g) : g, { part: "sky", color: "#ffffff", castShadow: false, receiveShadow: false });
}

// src/scenes/kit/characters.js
var SKIN = "#f1c27d";
var HAIR = "#4a3426";
var EYE = "#1b1b22";
function character(tier, { part = "characters", shirt = "#3d7fd6", pants = "#3b4a6b", skin = SKIN, hat = null, seed = 0 } = {}) {
  const root = group(`character (${part})`);
  const o = (color, extra) => ({ part, color, ...extra });
  const seg = byTier(tier, [8, 6, 20, 40]);
  const f = (g) => tier === 1 ? faceted(g) : g;
  if (tier === 0) {
    const body = mesh(new THREE.CapsuleGeometry(0.32, 0.9, 3, 8), o(shirt));
    body.position.y = 0.78;
    const head2 = mesh(new THREE.SphereGeometry(0.24, 10, 8), o(skin));
    head2.position.y = 1.55;
    root.add(body, head2);
    root.userData.animate = (t) => {
      head2.rotation.y = Math.sin(t * 0.7 + seed) * 0.3;
      body.scale.y = 1 + Math.sin(t * 2 + seed) * 0.01;
    };
    root.userData.rig = { head: head2, torso: body, arms: [], legs: [], part, tier };
    return root;
  }
  const torso = group("torso");
  torso.position.y = 1;
  const chest2 = mesh(f(new THREE.CapsuleGeometry(0.27, 0.32, 3, seg)), o(shirt));
  chest2.position.y = 0.12;
  torso.add(chest2);
  const head = group("head");
  head.position.y = 0.62;
  const skull = mesh(f(tier === 1 ? new THREE.IcosahedronGeometry(0.24, 1) : new THREE.SphereGeometry(0.24, seg + 4, seg)), o(skin));
  head.add(skull);
  torso.add(head);
  const limb = (r, len, color) => {
    const g = f(new THREE.CapsuleGeometry(r, len, 2, Math.max(5, seg - 2)));
    g.translate(0, -len / 2 - r, 0);
    return mesh(g, o(color));
  };
  const arms = [-1, 1].map((side) => {
    const arm = group("arm");
    arm.position.set(side * 0.36, 0.3, 0);
    arm.rotation.z = side * 0.12;
    arm.add(limb(0.08, 0.5, shirt));
    if (tier >= 2) {
      const hand = mesh(new THREE.SphereGeometry(0.085, seg, seg - 4), o(skin));
      hand.position.y = -0.72;
      arm.add(hand);
    }
    torso.add(arm);
    return arm;
  });
  const hips = mesh(f(new THREE.CapsuleGeometry(0.25, 0.1, 2, seg)), o(pants));
  hips.position.y = 0.72;
  root.add(hips);
  const legs = [-1, 1].map((side) => {
    const leg = group("leg");
    leg.position.set(side * 0.13, 0.72, 0);
    leg.add(limb(0.1, 0.48, pants));
    if (tier >= 2) {
      const shoe = mesh(new THREE.SphereGeometry(0.11, seg, seg - 4), o("#3a2a20"));
      shoe.scale.set(1, 0.6, 1.5);
      shoe.position.set(0, -0.68, 0.05);
      leg.add(shoe);
    }
    root.add(leg);
    return leg;
  });
  root.add(torso);
  if (tier >= 2) {
    const hair = new THREE.SphereGeometry(0.255, seg + 4, seg, 0, Math.PI * 2, 0, Math.PI * 0.52);
    hair.rotateX(-0.25);
    head.add(mesh(hair, o(HAIR)));
    const eyes = [-0.08, 0.08].map((x) => place(new THREE.SphereGeometry(0.035, 12, 8), { p: [x, 0.03, 0.215] }));
    head.add(mesh(merge(eyes), o(EYE, { castShadow: false })));
  }
  if (tier >= 3) {
    const face = [
      place(new THREE.SphereGeometry(0.04, 12, 8), { p: [0, -0.03, 0.245] }),
      // nose
      place(new THREE.CapsuleGeometry(0.012, 0.06, 2, 6), { p: [-0.08, 0.09, 0.22], r: [0, 0, Math.PI / 2 + 0.15] }),
      place(new THREE.CapsuleGeometry(0.012, 0.06, 2, 6), { p: [0.08, 0.09, 0.22], r: [0, 0, Math.PI / 2 - 0.15] })
    ];
    head.add(mesh(merge(face), o("#c98b5c", { castShadow: false })));
    const mouth = mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 16, Math.PI), o("#8a3b3b", { castShadow: false }));
    mouth.position.set(0, -0.1, 0.215);
    mouth.rotation.z = Math.PI;
    head.add(mouth);
    const belt = mesh(new THREE.TorusGeometry(0.255, 0.035, 8, 40), o("#3a2a20"));
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.8;
    root.add(belt);
    const collar = mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 32), o("#f3efe6"));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.48;
    torso.add(collar);
    if (hat) {
      const brim = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 40), o(hat));
      brim.position.y = 0.17;
      const crown = mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.2, 40), o(hat));
      crown.position.y = 0.28;
      head.add(brim, crown);
    }
  }
  root.userData.animate = (t) => {
    const s = t + seed;
    torso.position.y = 1 + Math.sin(s * 2) * 8e-3;
    head.rotation.y = Math.sin(s * 0.6) * 0.35;
    head.rotation.x = Math.sin(s * 0.9) * 0.05;
    arms[0].rotation.x = Math.sin(s * 1.1) * 0.08;
    arms[1].rotation.x = -Math.sin(s * 1.1) * 0.08;
    legs[0].rotation.x = 0;
  };
  root.userData.rig = { head, torso, arms, legs, part, tier };
  return root;
}

// src/scenes/kit/props.js
var P = "props";
function hullShape(len, beam) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, -beam / 2);
  s.lineTo(len * 0.18, -beam / 2);
  s.quadraticCurveTo(len / 2, -beam / 2, len / 2, 0);
  s.quadraticCurveTo(len / 2, beam / 2, len * 0.18, beam / 2);
  s.lineTo(-len / 2, beam / 2);
  s.lineTo(-len / 2, -beam / 2);
  return s;
}
function boat(tier, { hull = "#c0392b", sail = "#f5efe0", seed = 0 } = {}) {
  const root = group("boat");
  const len = 6, beam = 2.2, depth = 1.1;
  let hullG;
  if (tier === 0) hullG = new THREE.BoxGeometry(len, depth, beam);
  else {
    hullG = new THREE.ExtrudeGeometry(hullShape(len, beam), {
      depth,
      curveSegments: byTier(tier, [2, 3, 10, 24]),
      bevelEnabled: tier >= 2,
      bevelSize: 0.08,
      bevelThickness: 0.08,
      bevelSegments: byTier(tier, [1, 1, 2, 4])
    });
    hullG.rotateX(-Math.PI / 2);
    hullG.translate(0, -depth / 2, 0);
    if (tier === 1) hullG = faceted(hullG);
  }
  const hullM = mesh(hullG, { part: P, color: hull });
  hullM.position.y = 0.2;
  root.add(hullM);
  const deck = box(tier, [len * 0.8, 0.08, beam * 0.8], { part: P, color: "#b88a5a" });
  deck.position.set(-0.2, 0.72, 0);
  root.add(deck);
  const mastH = 6.5;
  const mast = cylinder(tier, 0.09, mastH, { part: P, color: "#6d4a2d" });
  mast.position.set(0.6, 0.7 + mastH / 2, 0);
  root.add(mast);
  if (tier >= 1) {
    const boom = cylinder(tier, 0.06, 3, { part: P, color: "#6d4a2d" });
    boom.rotation.z = Math.PI / 2;
    boom.position.set(-0.9, 1.6, 0);
    root.add(boom);
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(-2.8, 0);
    s.lineTo(0, mastH - 1.4);
    const sailG = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false });
    sailG.translate(0.5, 1.72, -0.02);
    root.add(mesh(sailG, { part: P, color: sail, roughness: 0.9 }));
    const top = new THREE.Vector3(0.6, 0.7 + mastH - 0.1, 0);
    const anchors = [[len / 2 - 0.2, 0.8, 0], [-len / 2 + 0.2, 0.8, 0], [0.6, 0.8, beam / 2 - 0.1], [0.6, 0.8, -beam / 2 + 0.1]].slice(0, byTier(tier, [0, 2, 4, 4]));
    const ropes = anchors.map((a) => {
      const end = new THREE.Vector3(...a);
      const mid = top.clone().lerp(end, 0.5).add(new THREE.Vector3(0, tier === 3 ? -0.25 : 0, 0));
      const curve = new THREE.QuadraticBezierCurve3(top, mid, end);
      return new THREE.TubeGeometry(curve, byTier(tier, [1, 2, 6, 24]), 0.018, byTier(tier, [3, 3, 5, 8]));
    });
    if (tier >= 3) for (let i = 0; i < 6; i++) ropes.push(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(-2.2 + i * 0.5, 0.8, beam / 2 - 0.1), new THREE.Vector3(-2.2 + i * 0.5, 1.5, beam / 2 - 0.1)), 2, 0.01, 5));
    root.add(mesh(merge(ropes), { part: P, color: "#d8c7a3", castShadow: tier >= 2 }));
  }
  if (tier >= 3) {
    const planks = [];
    for (let i = 0; i < 4; i++) planks.push(place(new THREE.BoxGeometry(len * 0.82, 0.04, 0.03), { p: [0, -0.05 + i * 0.22, beam / 2 + 0.07] }), place(new THREE.BoxGeometry(len * 0.82, 0.04, 0.03), { p: [0, -0.05 + i * 0.22, -beam / 2 - 0.07] }));
    root.add(mesh(merge(planks), { part: P, color: "#7a2a22" }));
  }
  root.userData.animate = (t) => {
    const s = t + seed;
    root.position.y = Math.sin(s * 0.9) * 0.08 - 0.05;
    root.rotation.x = Math.sin(s * 0.7) * 0.03;
    root.rotation.z = Math.sin(s * 0.5) * 0.02;
  };
  return root;
}
function barrel(tier, { color = "#8d5a33" } = {}) {
  const root = group("barrel");
  const seg = byTier(tier, [8, 10, 28, 48]);
  let g = tier >= 2 ? new THREE.LatheGeometry(Array.from({ length: 9 }, (_, i) => new THREE.Vector2(0.36 + Math.sin(i / 8 * Math.PI) * 0.06 - (i === 0 || i === 8 ? 0.36 : 0), i / 8 * 1)), seg) : new THREE.CylinderGeometry(0.38, 0.38, 1, seg);
  if (tier < 2) g.translate(0, 0.5, 0);
  if (tier === 1) g = faceted(g);
  root.add(mesh(g, { part: P, color }));
  if (tier >= 1) {
    const hoops = [0.15, 0.85].concat(tier >= 3 ? [0.5] : []).map((y) => place(new THREE.TorusGeometry(tier >= 2 ? 0.405 + (y === 0.5 ? 0.02 : 0) : 0.39, 0.025, 6, seg), { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }));
    root.add(mesh(merge(hoops), { part: P, color: "#3d3d3d" }));
  }
  return root;
}
function crate(tier, { color = "#b0844f", size = 0.9 } = {}) {
  const root = group("crate");
  const body = box(tier, [size, size, size], { part: P, color });
  body.position.y = size / 2;
  root.add(body);
  if (tier >= 2) {
    const t = 0.07, frame = [];
    for (const x of [-1, 1]) for (const z of [-1, 1]) frame.push(place(new THREE.BoxGeometry(t, size + 0.02, t), { p: [x * size / 2, size / 2, z * size / 2] }));
    for (const y of [0, size]) for (const z of [-1, 1]) frame.push(place(new THREE.BoxGeometry(size + 0.02, t, t), { p: [0, y, z * size / 2] }));
    if (tier >= 3) for (const z of [-1, 1]) frame.push(place(new THREE.BoxGeometry(size * 1.35, t * 0.8, t * 0.5), { p: [0, size / 2, z * (size / 2 + 0.01)], r: [0, 0, Math.PI / 4] }));
    root.add(mesh(merge(frame), { part: P, color: "#7a5530" }));
  }
  return root;
}
function lantern(tier) {
  const root = group("lantern");
  const glow = byTier(tier, [new THREE.BoxGeometry(0.22, 0.3, 0.22), new THREE.OctahedronGeometry(0.17), new THREE.SphereGeometry(0.15, 20, 14), new THREE.SphereGeometry(0.15, 32, 24)]);
  const m = mesh(glow, { part: "vfx", color: "#ffe3a0", emissive: "#ffb84d", emissiveIntensity: 3, castShadow: false });
  m.position.y = 0.2;
  root.add(m);
  if (tier >= 2) {
    const cage = [place(new THREE.CylinderGeometry(0.12, 0.18, 0.08, 16), { p: [0, 0.4, 0] }), place(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16), { p: [0, 0.02, 0] })];
    root.add(mesh(merge(cage), { part: P, color: "#2e2e2e" }));
  }
  return root;
}

// src/scenes/kit/creatures.js
function skater(tier, { part = "hero", shirt = "#ff2e88", pants = "#2b2f3a", cap = "#ffe600", seed = 0 } = {}) {
  const root = character(tier, { part, shirt, pants, seed });
  const { head, legs } = root.userData.rig;
  const o = (color, extra) => ({ part, color, ...extra });
  if (tier >= 1) {
    const capG = new THREE.SphereGeometry(0.26, byTier(tier, [8, 8, 20, 32]), 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const brim = place(new THREE.BoxGeometry(0.26, 0.03, 0.22), { p: [0, 0.02, 0.26] });
    head.add(mesh(tier === 1 ? faceted(merge([capG, brim])) : merge([capG, brim]), o(cap)));
    for (const leg of legs) {
      const skate = [place(new THREE.BoxGeometry(0.16, 0.12, 0.36), { p: [0, -0.74, 0.05] })];
      if (tier >= 2) for (let i = 0; i < 4; i++) skate.push(place(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12), { p: [0, -0.84, -0.08 + i * 0.09], r: [0, 0, Math.PI / 2] }));
      leg.add(mesh(merge(skate), o("#30343f")));
    }
  }
  if (tier >= 2) {
    const phones = [-1, 1].map((s) => place(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), { p: [s * 0.25, 0, 0], r: [0, 0, Math.PI / 2] }));
    phones.push(place(new THREE.TorusGeometry(0.25, 0.015, 6, 24, Math.PI), { p: [0, 0.02, 0] }));
    head.add(mesh(merge(phones), o("#1e9bff")));
  }
  const idle = root.userData.animate;
  root.userData.animate = (t) => {
    idle(t);
    const s = t + seed;
    root.rotation.z = Math.sin(s * 1.4) * 0.08;
    for (const [i, leg] of legs.entries()) leg.rotation.x = Math.sin(s * 1.4 + i * Math.PI) * 0.25;
  };
  return root;
}
function knight(tier, { part = "hero", armor = "#9aa3ad", cloth = "#7a1f2b", seed = 0 } = {}) {
  const root = character(tier, { part, shirt: armor, pants: "#4a4f57", skin: "#d8b48a", seed });
  const { head, arms, torso } = root.userData.rig;
  const o = (color, extra) => ({ part, color, roughness: 0.4, metalness: 0.6, ...extra });
  const seg = byTier(tier, [8, 8, 24, 40]);
  const helm = new THREE.SphereGeometry(0.27, seg, Math.max(6, seg - 6));
  head.add(mesh(tier === 1 ? faceted(helm) : helm, o(armor)));
  if (tier >= 1) {
    const visor = place(new THREE.BoxGeometry(0.34, 0.05, 0.08), { p: [0, 0.02, 0.24] });
    head.add(mesh(visor, o("#2b2f36")));
    const sword = [place(new THREE.BoxGeometry(0.05, 0.85, 0.015), { p: [0, -1.1, 0.12] }), place(new THREE.BoxGeometry(0.22, 0.04, 0.05), { p: [0, -0.68, 0.12] })];
    arms[1].add(mesh(merge(sword), o("#c9ced6")));
    const shield = new THREE.CylinderGeometry(0.3, 0.3, 0.05, byTier(tier, [8, 8, 32, 48]));
    shield.rotateZ(Math.PI / 2);
    const s = mesh(tier === 1 ? faceted(shield) : shield, o(cloth, { metalness: 0.1 }));
    s.position.set(-0.1, -0.5, 0.05);
    arms[0].add(s);
  }
  if (tier >= 2) {
    const pauldrons = [-1, 1].map((x) => place(new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), { p: [x * 0.36, 0.38, 0] }));
    torso.add(mesh(merge(pauldrons), o(armor)));
    const tabard = mesh(new THREE.BoxGeometry(0.36, 0.5, 0.04), o(cloth, { metalness: 0 }));
    tabard.position.set(0, 0.05, 0.27);
    torso.add(tabard);
  }
  if (tier >= 3) {
    const plume = mesh(new THREE.CapsuleGeometry(0.04, 0.3, 4, 10), o(cloth, { metalness: 0 }));
    plume.position.set(0, 0.3, -0.05);
    plume.rotation.x = -0.6;
    head.add(plume);
    const boss = mesh(new THREE.SphereGeometry(0.06, 16, 10), o("#d4af37"));
    boss.position.set(-0.14, -0.5, 0.05);
    arms[0].add(boss);
  }
  return root;
}
function robot(tier, { part = "characters", body = "#d9dde3", accent = "#ff7a1a", seed = 0 } = {}) {
  const root = group(`robot (${part})`);
  const o = (color, extra) => ({ part, color, roughness: 0.35, metalness: 0.5, ...extra });
  const f = (g) => tier === 1 ? faceted(g) : g;
  const rounded = (w, h, d) => tier >= 2 ? new THREE.CapsuleGeometry(Math.min(w, d) / 2, h - Math.min(w, d), 4, 16) : new THREE.BoxGeometry(w, h, d);
  const rig = group("rig");
  root.add(rig);
  const torso = mesh(f(rounded(0.6, 0.7, 0.45)), o(body));
  torso.position.y = 1;
  rig.add(torso);
  const head = group("head");
  head.position.y = 1.62;
  rig.add(head);
  head.add(mesh(f(new THREE.BoxGeometry(0.5, 0.36, 0.4)), o(body)));
  const visor = mesh(new THREE.BoxGeometry(0.4, 0.12, 0.04), { part: "vfx", color: "#7df9ff", emissive: "#30e0ff", emissiveIntensity: 2.5, castShadow: false });
  visor.position.set(0, 0.02, 0.21);
  head.add(visor);
  const base = mesh(f(new THREE.ConeGeometry(0.32, 0.5, byTier(tier, [8, 8, 24, 40]))), o(accent));
  base.rotation.x = Math.PI;
  base.position.y = 0.45;
  rig.add(base);
  if (tier >= 1) {
    const arms = [-1, 1].map((x) => place(new THREE.BoxGeometry(0.12, 0.5, 0.12), { p: [x * 0.4, 0.95, 0] }));
    rig.add(mesh(f(merge(arms)), o(accent)));
    const antenna = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), o("#555a62"));
    antenna.position.y = 0.32;
    head.add(antenna);
  }
  let tip = null;
  if (tier >= 2) {
    tip = mesh(new THREE.SphereGeometry(0.05, 16, 10), { part: "vfx", color: "#ff3b3b", emissive: "#ff2020", emissiveIntensity: 3, castShadow: false });
    tip.position.y = 0.5;
    head.add(tip);
    const glow = mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 32), { part: "vfx", color: "#7df9ff", emissive: "#30e0ff", emissiveIntensity: 2, castShadow: false });
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.2;
    rig.add(glow);
  }
  if (tier >= 3) {
    const panel = [];
    for (let i = 0; i < 3; i++) panel.push(place(new THREE.BoxGeometry(0.3, 0.04, 0.02), { p: [0, 0.9 + i * 0.12, 0.235] }));
    rig.add(mesh(merge(panel), o("#3a3f4a")));
    const ears = [-1, 1].map((x) => place(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 20), { p: [x * 0.27, 0, 0], r: [0, 0, Math.PI / 2] }));
    head.add(mesh(merge(ears), o(accent)));
  }
  root.userData.animate = (t) => {
    const s = t + seed;
    rig.position.y = Math.sin(s * 1.8) * 0.06;
    head.rotation.y = Math.sin(s * 0.5) * 0.6;
    if (tip) tip.visible = Math.floor(s * 2) % 2 === 0;
  };
  root.userData.rig = { head, torso, arms: [], legs: [], part, tier };
  return root;
}
function goose(tier, { part = "hero", seed = 0 } = {}) {
  const root = group(`goose (${part})`);
  const white = "#f4f1ea", orange = "#f39c12";
  const o = (color, extra) => ({ part, color, ...extra });
  const seg = byTier(tier, [8, 8, 24, 40]);
  const f = (g) => tier === 1 ? faceted(g) : g;
  const body = group("body");
  body.position.y = 0.42;
  root.add(body);
  const torsoG = tier === 1 ? new THREE.IcosahedronGeometry(0.3, 1) : new THREE.SphereGeometry(0.3, seg, Math.max(6, seg - 6));
  torsoG.scale(1, 0.8, 1.45);
  body.add(mesh(f(torsoG), o(white)));
  const neck = group("neck");
  neck.position.set(0, 0.12, 0.32);
  body.add(neck);
  const neckG = new THREE.CapsuleGeometry(0.07, 0.42, 4, Math.max(6, seg - 4));
  neckG.translate(0, 0.25, 0);
  neck.add(mesh(f(neckG), o(white)));
  const head = group("head");
  head.position.set(0, 0.55, 0.04);
  neck.add(head);
  head.add(mesh(f(new THREE.SphereGeometry(0.11, seg, Math.max(6, seg - 6))), o(white)));
  const beak = new THREE.ConeGeometry(0.05, 0.16, Math.max(6, seg / 2));
  beak.rotateX(Math.PI / 2);
  beak.translate(0, -0.01, 0.15);
  head.add(mesh(f(beak), o(orange)));
  const legs = [-1, 1].map((x) => {
    const leg = group("leg");
    leg.position.set(x * 0.12, 0.3, 0);
    const g = [place(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), { p: [0, -0.15, 0] })];
    if (tier >= 1) g.push(place(new THREE.BoxGeometry(0.12, 0.02, 0.14), { p: [0, -0.3, 0.04] }));
    leg.add(mesh(merge(g), o(orange)));
    root.add(leg);
    return leg;
  });
  if (tier >= 2) {
    const eyes = [-1, 1].map((x) => place(new THREE.SphereGeometry(0.02, 10, 8), { p: [x * 0.085, 0.03, 0.06] }));
    head.add(mesh(merge(eyes), o("#111111", { castShadow: false })));
    const wings = [-1, 1].map((x) => {
      const w = new THREE.SphereGeometry(0.2, 20, 12);
      w.scale(0.35, 0.6, 1.2);
      return place(w, { p: [x * 0.25, 0.02, -0.05], r: [0.2, 0, x * 0.15] });
    });
    body.add(mesh(merge(wings), o("#e4e0d6")));
  }
  if (tier >= 3) {
    const tail = new THREE.ConeGeometry(0.12, 0.2, 24);
    tail.rotateX(-Math.PI / 2 - 0.5);
    tail.translate(0, 0.12, -0.48);
    body.add(mesh(tail, o(white)));
    const knob = mesh(new THREE.SphereGeometry(0.025, 12, 8), o("#e67e22"));
    knob.position.set(0, 0.03, 0.12);
    head.add(knob);
  }
  root.userData.animate = (t) => {
    const s = t + seed;
    neck.rotation.x = Math.sin(s * 2.2) * 0.25 + 0.1;
    head.rotation.x = -Math.sin(s * 2.2) * 0.2;
    body.rotation.z = Math.sin(s * 4) * 0.06;
    for (const [i, leg] of legs.entries()) leg.rotation.x = Math.sin(s * 4 + i * Math.PI) * 0.4;
  };
  root.userData.rig = { head, torso: body, arms: [], legs, part, tier };
  return root;
}

// src/scenes/kit/structures.js
import { RoundedBoxGeometry as RoundedBoxGeometry2 } from "three/addons/geometries/RoundedBoxGeometry.js";
var A2 = "architecture";
var P2 = "props";
var ft = (g, tier) => tier === 1 ? faceted(g) : g;
function fence(tier, length, { color = "#f3efe6", part = P2 } = {}) {
  const g = [];
  const posts = Math.max(2, Math.round(length / 1.6) + 1);
  for (let i = 0; i < posts; i++) g.push(place(new THREE.BoxGeometry(0.1, 0.9, 0.1), { p: [i / (posts - 1) * length, 0.45, 0] }));
  if (tier === 0) g.push(place(new THREE.BoxGeometry(length, 0.5, 0.04), { p: [length / 2, 0.45, 0] }));
  else for (const y of [0.3, 0.68]) g.push(place(new THREE.BoxGeometry(length, 0.07, 0.04), { p: [length / 2, y, 0.05] }));
  if (tier >= 2) {
    const n = Math.round(length / 0.2);
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * length / n;
      g.push(place(new THREE.BoxGeometry(0.08, 0.78, 0.025), { p: [x, 0.42, 0.08] }));
      if (tier === 3) g.push(place(new THREE.ConeGeometry(0.057, 0.08, 4), { p: [x, 0.85, 0.08], r: [0, Math.PI / 4, 0] }));
    }
  }
  return mesh(merge(g), { part, color });
}
function hedge(tier, [w, h, d], { color = "#5a9a4a", seed = 0 } = {}) {
  let g = tier >= 2 ? new RoundedBoxGeometry2(w, h, d, tier === 2 ? 3 : 4, Math.min(w, h, d) * 0.25) : new THREE.BoxGeometry(w, h, d, tier ? 2 : 1, tier ? 2 : 1, tier ? 2 : 1);
  g.translate(0, h / 2, 0);
  if (tier === 3) {
    displace(g, { amount: Math.min(w, h, d) * 0.06, scale: 5, seed, center: new THREE.Vector3(0, h / 2, 0) });
  }
  return mesh(ft(g, tier), { part: "foliage", color });
}
function wall(tier, length, height, { thick = 0.6, color = "#8a8580", part = A2 } = {}) {
  if (tier < 3) {
    const body = box(tier, [length, height, thick], { part, color }, { bevel: 0.04 });
    body.position.set(length / 2, height / 2, 0);
    const root = group("wall", body);
    if (tier >= 1) {
      const cap = box(tier, [length + 0.1, 0.15, thick + 0.12], { part, color: "#9d9892" });
      cap.position.set(length / 2, height + 0.07, 0);
      root.add(cap);
    }
    return root;
  }
  const stones = [];
  const rows = Math.max(2, Math.round(height / 0.35));
  for (let r = 0; r < rows; r++) {
    const sh = height / rows;
    for (let x = r % 2 * -0.35; x < length; x += 0.7) {
      const w = Math.min(0.66, length - Math.max(0, x));
      if (w <= 0.05) continue;
      stones.push(place(new RoundedBoxGeometry2(w, sh * 0.92, thick, 1, 0.04), { p: [Math.max(0, x) + w / 2, (r + 0.5) * sh, ((r * 7 + Math.round(x * 3)) % 3 - 1) * 0.02] }));
    }
  }
  return group("wall", mesh(merge(stones), { part, color }));
}
function pillar(tier, height, radius, { color = "#a29e96", part = A2 } = {}) {
  const root = group("pillar");
  const shaft = cylinder(tier, radius, height, { part, color });
  shaft.position.y = height / 2;
  root.add(shaft);
  if (tier >= 1) {
    const ends = [place(new THREE.BoxGeometry(radius * 2.6, 0.25, radius * 2.6), { p: [0, 0.12, 0] }), place(new THREE.BoxGeometry(radius * 2.6, 0.25, radius * 2.6), { p: [0, height - 0.12, 0] })];
    if (tier >= 2) ends.push(place(new THREE.CylinderGeometry(radius * 1.1, radius * 1.3, 0.2, 32), { p: [0, 0.32, 0] }), place(new THREE.CylinderGeometry(radius * 1.3, radius * 1.1, 0.2, 32), { p: [0, height - 0.32, 0] }));
    root.add(mesh(merge(ends), { part, color: "#b5b0a7" }));
  }
  if (tier >= 3) {
    const flutes = [];
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      flutes.push(place(new THREE.BoxGeometry(0.04, height - 0.8, 0.04), { p: [Math.cos(a) * radius * 1.01, height / 2, Math.sin(a) * radius * 1.01], r: [0, -a, 0] }));
    }
    root.add(mesh(merge(flutes), { part, color: "#948f87" }));
  }
  return root;
}
function stairs(tier, { steps = 5, width = 3, rise = 0.25, run = 0.45, color = "#9a958d", part = A2 } = {}) {
  const g = [];
  for (let i = 0; i < steps; i++) {
    const geom = tier >= 2 ? new RoundedBoxGeometry2(width, rise * (i + 1), run, 2, 0.03) : new THREE.BoxGeometry(width, rise * (i + 1), run);
    g.push(place(geom, { p: [0, rise * (i + 1) / 2, i * run] }));
  }
  return mesh(merge(g), { part, color });
}
function ramp(tier, { width = 4, height = 1.6, color = "#c9ccd3", part = P2 } = {}) {
  const root = group("ramp");
  if (tier === 0) {
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(height * 1.4, 0), new THREE.Vector2(0, height)]);
    const g2 = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    g2.rotateY(Math.PI / 2);
    g2.translate(-width / 2, 0, 0);
    root.add(mesh(g2, { part, color }));
    return root;
  }
  const seg = byTier(tier, [0, 5, 16, 32]);
  const pts = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= seg; i++) {
    const a = i / seg * Math.PI / 2;
    pts.push(new THREE.Vector2(height - Math.sin(a) * height, height - Math.cos(a) * height));
  }
  pts.push(new THREE.Vector2(0, height));
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: width, bevelEnabled: false, curveSegments: seg });
  g.rotateY(Math.PI / 2);
  g.translate(-width / 2, 0, 0);
  root.add(mesh(ft(g, tier), { part, color }));
  if (tier >= 2) {
    const coping = cylinder(tier, 0.05, width, { part, color: "#7c818c" });
    coping.rotation.z = Math.PI / 2;
    coping.position.set(0, height, 0);
    root.add(coping);
  }
  return root;
}
function rail(tier, length, { height = 0.6, color = "#ffe600", part = P2 } = {}) {
  const seg = byTier(tier, [6, 8, 16, 24]);
  const g = [place(new THREE.CylinderGeometry(0.05, 0.05, length, seg), { p: [length / 2, height, 0], r: [0, 0, Math.PI / 2] })];
  const n = Math.max(2, Math.round(length / 2) + 1);
  for (let i = 0; i < n; i++) g.push(place(new THREE.CylinderGeometry(0.035, 0.035, height, seg), { p: [i / (n - 1) * length, height / 2, 0] }));
  return mesh(merge(g), { part, color, roughness: 0.35, metalness: 0.4 });
}
function lampPost(tier, { height = 4, glow = "#ffe9b0", light = true } = {}) {
  const root = group("lamp post");
  const pole = cylinder(tier, 0.07, height, { part: P2, color: "#3a3f4a" });
  pole.position.y = height / 2;
  root.add(pole);
  const head = mesh(tier >= 2 ? new THREE.SphereGeometry(0.22, 24, 16) : new THREE.BoxGeometry(0.35, 0.35, 0.35), { part: "vfx", color: glow, emissive: glow, emissiveIntensity: 2.5, castShadow: false });
  head.position.y = height + 0.1;
  root.add(head);
  if (light) {
    const l = practical({ color: glow, intensity: 10, distance: 9 });
    l.position.y = height - 0.2;
    root.add(l);
  }
  return root;
}
function torch(tier, { seed = 0, light = true } = {}) {
  const root = group("torch");
  root.add(mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.45, byTier(tier, [6, 6, 12, 16])), { part: P2, color: "#4a3220" }));
  const flame = mesh(tier >= 2 ? new THREE.ConeGeometry(0.1, 0.32, 16) : new THREE.OctahedronGeometry(0.12), { part: "vfx", color: "#ffb347", emissive: "#ff8a1e", emissiveIntensity: 4, castShadow: false });
  flame.position.y = 0.38;
  root.add(flame);
  if (light) {
    const l = practical({ color: "#ff9a3c", intensity: 9, distance: 9, flicker: 1, seed });
    l.position.y = 0.6;
    root.add(l);
  }
  flame.userData.animate = (t) => {
    flame.scale.y = 1 + Math.sin(t * 13 + seed) * 0.12 + Math.sin(t * 29 + seed) * 0.06;
  };
  return root;
}
function gate(tier, { width = 4, height = 4.2, color = "#c8402e" } = {}) {
  const root = group("gate");
  for (const x of [-width / 2, width / 2]) {
    const post = cylinder(tier, 0.2, height, { part: A2, color });
    post.position.set(x, height / 2, 0);
    root.add(post);
  }
  const beams = [place(new THREE.BoxGeometry(width + 0.6, 0.22, 0.3), { p: [0, height * 0.78, 0] })];
  let top;
  if (tier >= 2) {
    const shape = new THREE.Shape();
    const w = width / 2 + 1.1;
    shape.moveTo(-w, 0.25);
    shape.quadraticCurveTo(0, -0.12, w, 0.25);
    shape.lineTo(w, 0.5);
    shape.quadraticCurveTo(0, 0.15, -w, 0.5);
    shape.lineTo(-w, 0.25);
    top = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false, curveSegments: tier === 3 ? 24 : 10 });
    top.translate(0, height - 0.1, -0.25);
  } else top = place(new THREE.BoxGeometry(width + 1.4, 0.3, 0.45), { p: [0, height + 0.1, 0] });
  root.add(mesh(merge(beams), { part: A2, color }), mesh(top, { part: A2, color: tier >= 2 ? "#2b2b2b" : color }));
  return root;
}
function stoneLantern(tier, { light = false, seed = 0 } = {}) {
  const root = group("stone lantern");
  const stone = "#8f8b84";
  const g = [
    place(new THREE.BoxGeometry(0.6, 0.15, 0.6), { p: [0, 0.07, 0] }),
    place(new THREE.CylinderGeometry(0.12, 0.15, 0.7, byTier(tier, [6, 6, 16, 24])), { p: [0, 0.5, 0] }),
    place(new THREE.BoxGeometry(0.55, 0.1, 0.55), { p: [0, 0.9, 0] }),
    place(new THREE.ConeGeometry(0.48, 0.32, 4), { p: [0, 1.48, 0], r: [0, Math.PI / 4, 0] })
  ];
  root.add(mesh(tier === 1 ? faceted(merge(g)) : merge(g), { part: A2, color: stone }));
  const glow = mesh(new THREE.BoxGeometry(0.34, 0.3, 0.34), { part: "vfx", color: "#ffe3a0", emissive: "#ffb84d", emissiveIntensity: 2, castShadow: false });
  glow.position.y = 1.12;
  root.add(glow);
  if (light) {
    const l = practical({ intensity: 4, distance: 6, flicker: 0.4, seed });
    l.position.y = 1.15;
    root.add(l);
  }
  return root;
}
function building(tier, rng, { w = 6, d = 5, h = 9, color = "#d36b4a", window = "#28324a", part = A2 } = {}) {
  const root = group("building");
  const body = box(tier, [w, h, d], { part, color }, { bevel: 0.02 });
  body.position.y = h / 2;
  root.add(body);
  if (tier === 0) return root;
  const floors = Math.max(2, Math.floor(h / 2.6));
  const cols = Math.max(1, Math.floor(w / 1.6));
  const wins = [], trims = [];
  for (let f = 0; f < floors; f++) {
    const y = 1.6 + f * (h - 1.6) / floors;
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * w / cols - w / 2;
      wins.push(place(new THREE.BoxGeometry(0.8, 1.1, 0.06), { p: [x, y, d / 2 + 0.01] }));
      if (tier >= 2) trims.push(place(new THREE.BoxGeometry(1, 0.1, 0.16), { p: [x, y - 0.6, d / 2 + 0.05] }));
    }
    if (tier >= 3 && f > 0) trims.push(place(new THREE.BoxGeometry(w + 0.1, 0.12, d + 0.1), { p: [0, y - 0.95, 0] }));
  }
  root.add(mesh(merge(wins), { part, color: window, roughness: 0.25 }));
  const roof = [place(new THREE.BoxGeometry(w + 0.2, 0.3, d + 0.2), { p: [0, h + 0.15, 0] })];
  if (tier >= 2) {
    for (let i = 0; i < 2; i++) roof.push(place(new THREE.BoxGeometry(1.2, 0.8, 1), { p: [rng.range(-w / 3, w / 3), h + 0.7, rng.range(-d / 3, d / 3)] }));
    trims.push(place(new THREE.BoxGeometry(1.4, 2.2, 0.12), { p: [0, 1.1, d / 2 + 0.04] }));
  }
  root.add(mesh(merge(roof), { part, color: "#5b5f6a" }));
  if (trims.length) root.add(mesh(merge(trims), { part, color: "#e8e4dc" }));
  return root;
}
function stands(tier, rng, length, { rows = 4, colors = ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71", "#9b59b6", "#ecf0f1"] } = {}) {
  const root = group("stands");
  const steps = [];
  for (let r = 0; r < rows; r++) steps.push(place(new THREE.BoxGeometry(length, 0.5 * (r + 1), 0.9), { p: [length / 2, 0.25 * (r + 1), -r * 0.9] }));
  root.add(mesh(merge(steps), { part: A2, color: "#a7abb3" }));
  const per = byTier(tier, [0, 6, 12, 20]);
  if (per) {
    const bodies = {}, heads = [];
    for (let r = 0; r < rows; r++) for (let i = 0; i < Math.round(per * length / 10); i++) {
      const c = rng.pick(colors);
      const x = (i + 0.5) * length / Math.round(per * length / 10) + rng.range(-0.15, 0.15);
      const y = 0.5 * (r + 1) + 0.3, z = -r * 0.9;
      (bodies[c] ||= []).push(place(tier === 1 ? new THREE.BoxGeometry(0.35, 0.55, 0.3) : new THREE.CapsuleGeometry(0.17, 0.25, 2, 8), { p: [x, y, z] }));
      if (tier >= 2) heads.push(place(new THREE.SphereGeometry(0.13, 10, 8), { p: [x, y + 0.42, z] }));
    }
    for (const [c, g] of Object.entries(bodies)) root.add(mesh(merge(g), { part: "characters", color: c, castShadow: false }));
    if (heads.length) root.add(mesh(merge(heads), { part: "characters", color: "#f1c27d", castShadow: false }));
  }
  if (tier >= 2) {
    const roofG = [place(new THREE.BoxGeometry(length + 0.4, 0.15, rows * 0.9 + 0.6), { p: [length / 2, rows * 0.5 + 2.6, -(rows - 1) * 0.45] })];
    for (const x of [0, length]) roofG.push(place(new THREE.CylinderGeometry(0.08, 0.08, rows * 0.5 + 2.6, 10), { p: [x, (rows * 0.5 + 2.6) / 2, -(rows - 1) * 0.9] }));
    root.add(mesh(merge(roofG), { part: A2, color: "#d9dde3" }));
  }
  return root;
}
function tent(tier, { color = "#e67e22", length = 2.4, width = 2, height = 1.5 } = {}) {
  const root = group("tent");
  const shape = new THREE.Shape([new THREE.Vector2(-width / 2, 0), new THREE.Vector2(width / 2, 0), new THREE.Vector2(0, height)]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: tier >= 2, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
  g.translate(0, 0, -length / 2);
  g.rotateY(Math.PI / 2);
  root.add(mesh(faceted(g), { part: P2, color }));
  if (tier >= 1) {
    const door = new THREE.Shape([new THREE.Vector2(-0.4, 0), new THREE.Vector2(0.4, 0), new THREE.Vector2(0, height * 0.75)]);
    const dg = new THREE.ShapeGeometry(door);
    dg.rotateY(Math.PI / 2);
    dg.translate(length / 2 + 0.02, 0.01, 0);
    root.add(mesh(dg, { part: P2, color: "#3b2a1e", doubleSided: true, castShadow: false }));
  }
  if (tier >= 2) {
    const ropes = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const a = new THREE.Vector3(sx * (length / 2), height * 0.9, 0), b = new THREE.Vector3(sx * (length / 2 + 0.8), 0, sz * (width / 2 + 0.6));
      ropes.push(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 1, 0.012, 4));
    }
    root.add(mesh(merge(ropes), { part: P2, color: "#d8c7a3", castShadow: false }));
  }
  return root;
}

// src/scenes/kit/gameprops.js
var P3 = "props";
var ft2 = (g, tier) => tier === 1 ? faceted(g) : g;
function kart(tier, { color = "#e74c3c", driver = "#3498db", part = P3, driverPart = "characters", seed = 0 } = {}) {
  const root = group("kart");
  const body = box(tier, [1.3, 0.35, 2.1], { part, color }, { bevel: 0.15 });
  body.position.y = 0.4;
  root.add(body);
  const wheels = [];
  const wseg = byTier(tier, [8, 8, 20, 32]);
  for (const [x, z] of [[-0.72, 0.7], [0.72, 0.7], [-0.72, -0.7], [0.72, -0.7]]) {
    const w = mesh(ft2(new THREE.CylinderGeometry(0.3, 0.3, 0.28, wseg), tier), { part, color: "#222222" });
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.3, z);
    root.add(w);
    wheels.push(w);
  }
  if (tier >= 1) {
    const seat = box(tier, [0.6, 0.5, 0.25], { part, color: "#2c2c2c" });
    seat.position.set(0, 0.75, -0.45);
    root.add(seat);
    const pilot = character(Math.min(tier, 2), { part: driverPart, shirt: driver, pants: "#333333", seed });
    pilot.scale.setScalar(0.75);
    pilot.position.set(0, -0.05, -0.2);
    root.add(pilot);
  }
  if (tier >= 2) {
    const wheel = mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 24), { part, color: "#222222" });
    wheel.position.set(0, 0.95, 0.25);
    wheel.rotation.x = -0.9;
    root.add(wheel);
    const bumper = box(tier, [1.5, 0.15, 0.25], { part, color: "#ecf0f1" });
    bumper.position.set(0, 0.3, 1.15);
    root.add(bumper);
  }
  if (tier >= 3) {
    const spoiler = [place(new THREE.BoxGeometry(1.3, 0.06, 0.35), { p: [0, 1.15, -1] }), place(new THREE.BoxGeometry(0.06, 0.5, 0.1), { p: [-0.5, 0.9, -1] }), place(new THREE.BoxGeometry(0.06, 0.5, 0.1), { p: [0.5, 0.9, -1] })];
    root.add(mesh(merge(spoiler), { part, color }));
    const pipes = [-0.3, 0.3].map((x) => place(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 12), { p: [x, 0.45, -1.15], r: [Math.PI / 2, 0, 0] }));
    root.add(mesh(merge(pipes), { part, color: "#9aa3ad", metalness: 0.6, roughness: 0.3 }));
  }
  root.userData.wheels = wheels;
  return root;
}
function coin(tier, { seed = 0 } = {}) {
  const g = tier >= 2 ? new THREE.CylinderGeometry(0.35, 0.35, 0.08, byTier(tier, [8, 8, 32, 48])) : new THREE.CylinderGeometry(0.35, 0.35, 0.1, 8);
  g.rotateX(Math.PI / 2);
  const m = mesh(ft2(g, tier), { part: "vfx", color: "#ffd23f", emissive: "#ffb300", emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.5 });
  m.userData.animate = (t) => {
    m.rotation.y = t * 2.5 + seed;
  };
  return m;
}
function pipe(tier, { height = 1.6, radius = 0.6, color = "#2ecc71" } = {}) {
  const root = group("pipe");
  const body = cylinder(tier, radius, height, { part: P3, color });
  body.position.y = height / 2;
  root.add(body);
  const rim = cylinder(tier, radius * 1.2, 0.45, { part: P3, color });
  rim.position.y = height + 0.2;
  root.add(rim);
  return root;
}
function block(tier, { kind = "item", size = 1 } = {}) {
  const root = group(`${kind} block`);
  const color = kind === "item" ? "#f5b82e" : "#b5562a";
  root.add(box(tier, [size, size, size], { part: P3, color }, { bevel: 0.08 }));
  if (tier >= 1) {
    const dots = [];
    if (kind === "item") for (const [x, y] of [[-0.3, 0.3], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3], [0, 0]]) for (const s of [1, -1]) dots.push(place(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), { p: [x * size, y * size, s * size / 2], r: [Math.PI / 2, 0, 0] }));
    else for (const y of [-0.25, 0, 0.25]) for (const s of [1, -1]) dots.push(place(new THREE.BoxGeometry(size * 1.01, 0.03, 0.02), { p: [0, y * size, s * size / 2] }));
    root.add(mesh(merge(dots), { part: P3, color: kind === "item" ? "#8a4b0f" : "#e7d6c9" }));
  }
  return root;
}
function chest(tier, { color = "#8b5a2b" } = {}) {
  const root = group("chest");
  const base = box(tier, [1.1, 0.55, 0.7], { part: P3, color });
  base.position.y = 0.28;
  root.add(base);
  const lidG = tier === 0 ? new THREE.BoxGeometry(1.1, 0.25, 0.7) : new THREE.CylinderGeometry(0.35, 0.35, 1.1, byTier(tier, [6, 6, 20, 32]), 1, false, 0, Math.PI);
  if (tier > 0) lidG.rotateZ(Math.PI / 2);
  const lid = mesh(ft2(lidG, tier), { part: P3, color });
  lid.position.y = tier === 0 ? 0.68 : 0.55;
  root.add(lid);
  if (tier >= 2) {
    const bands = [-0.38, 0.38].map((x) => place(new THREE.BoxGeometry(0.08, 0.6, 0.74), { p: [x, 0.3, 0] }));
    root.add(mesh(merge(bands), { part: P3, color: "#d4af37", metalness: 0.7, roughness: 0.3 }));
  }
  if (tier >= 3) {
    const lock = mesh(new THREE.BoxGeometry(0.16, 0.2, 0.06), { part: P3, color: "#d4af37", metalness: 0.7, roughness: 0.3 });
    lock.position.set(0, 0.5, 0.37);
    root.add(lock);
  }
  return root;
}
function trafficCone(tier) {
  const g = [place(new THREE.ConeGeometry(0.22, 0.65, byTier(tier, [6, 8, 20, 32])), { p: [0, 0.38, 0] }), place(new THREE.BoxGeometry(0.5, 0.06, 0.5), { p: [0, 0.03, 0] })];
  const root = group("cone", mesh(ft2(merge(g), tier), { part: P3, color: "#ff7a1a" }));
  if (tier >= 2) {
    const stripe = mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.1, 20), { part: P3, color: "#f4f4f4" });
    stripe.position.y = 0.4;
    root.add(stripe);
  }
  return root;
}
function tireStack(tier, { n = 3 } = {}) {
  const g = [];
  for (let i = 0; i < n; i++) g.push(place(new THREE.TorusGeometry(0.38, 0.16, byTier(tier, [6, 6, 12, 16]), byTier(tier, [8, 10, 28, 40])), { p: [0, 0.16 + i * 0.32, 0], r: [Math.PI / 2, 0, 0] }));
  return mesh(ft2(merge(g), tier), { part: P3, color: "#2a2a2a" });
}
function bench(tier, { color = "#9c6b3f" } = {}) {
  const g = [];
  const slats = byTier(tier, [1, 2, 4, 5]);
  for (let i = 0; i < slats; i++) g.push(place(new THREE.BoxGeometry(1.8, 0.06, 0.45 / slats - 0.02), { p: [0, 0.48, (i + 0.5) * 0.45 / slats - 0.225] }));
  if (tier >= 1) for (let i = 0; i < slats; i++) g.push(place(new THREE.BoxGeometry(1.8, 0.4 / slats - 0.02, 0.05), { p: [0, 0.62 + (i + 0.5) * 0.4 / slats, -0.24] }));
  const legs = [-0.8, 0.8].map((x) => place(new THREE.BoxGeometry(0.08, 0.48, 0.45), { p: [x, 0.24, 0] }));
  return group("bench", mesh(merge(g), { part: P3, color }), mesh(merge(legs), { part: P3, color: "#3a3f4a" }));
}
function well(tier) {
  const root = group("well");
  const ring2 = cylinder(tier, 0.75, 0.8, { part: "architecture", color: "#9b958c" });
  ring2.position.y = 0.4;
  root.add(ring2);
  const water = mesh(new THREE.CircleGeometry(0.6, byTier(tier, [8, 10, 32, 48])).rotateX(-Math.PI / 2), { part: "water", color: "#2f6f9f", castShadow: false });
  water.position.y = 0.55;
  root.add(water);
  if (tier >= 1) {
    const roof = [place(new THREE.BoxGeometry(0.1, 1.5, 0.1), { p: [-0.7, 1.15, 0] }), place(new THREE.BoxGeometry(0.1, 1.5, 0.1), { p: [0.7, 1.15, 0] }), place(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), { p: [0, 1.5, 0], r: [0, 0, Math.PI / 2] })];
    root.add(mesh(merge(roof), { part: "architecture", color: "#7a5530" }));
    const top = mesh(new THREE.ConeGeometry(1.1, 0.6, 4), { part: "architecture", color: "#b03a2e" });
    top.position.y = 2.15;
    top.rotation.y = Math.PI / 4;
    root.add(top);
  }
  return root;
}
function campfire(tier, { seed = 0 } = {}) {
  const root = group("campfire");
  const logs = [];
  for (let i = 0; i < byTier(tier, [2, 3, 4, 5]); i++) {
    const a = i / byTier(tier, [2, 3, 4, 5]) * Math.PI;
    logs.push(place(new THREE.CylinderGeometry(0.08, 0.09, 0.9, byTier(tier, [6, 6, 12, 16])), { p: [0, 0.12, 0], r: [Math.PI / 2, a, 0.35] }));
  }
  root.add(mesh(ft2(merge(logs), tier), { part: P3, color: "#5a3b22" }));
  if (tier >= 1) {
    const stones = [];
    const n = byTier(tier, [0, 8, 12, 16]);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      stones.push(place(new THREE.IcosahedronGeometry(0.13, tier >= 2 ? 1 : 0), { p: [Math.cos(a) * 0.6, 0.06, Math.sin(a) * 0.6], s: [1, 0.6, 1] }));
    }
    root.add(mesh(ft2(merge(stones), tier), { part: P3, color: "#7d7a74" }));
  }
  const flames = [];
  const fl = mesh(tier >= 2 ? new THREE.ConeGeometry(0.28, 0.8, 20) : new THREE.ConeGeometry(0.28, 0.7, 6), { part: "vfx", color: "#ffb347", emissive: "#ff7a1e", emissiveIntensity: 4, castShadow: false });
  fl.position.y = 0.45;
  root.add(fl);
  flames.push(fl);
  if (tier >= 2) {
    const inner = mesh(new THREE.ConeGeometry(0.15, 0.55, 16), { part: "vfx", color: "#fff1a8", emissive: "#ffd36b", emissiveIntensity: 5, castShadow: false });
    inner.position.y = 0.35;
    root.add(inner);
    flames.push(inner);
  }
  const light = practical({ color: "#ff9a3c", intensity: 14, distance: 14, flicker: 1, seed });
  light.position.y = 0.8;
  root.add(light);
  root.userData.animate = (t) => {
    for (const [i, f] of flames.entries()) {
      f.scale.y = 1 + Math.sin(t * 9 + i * 1.7 + seed) * 0.15;
      f.rotation.y = t * (0.8 + i);
    }
  };
  return root;
}
function ship(tier, { color = "#c7ccd3", accent = "#ff7a1a" } = {}) {
  const root = group("ship");
  const o = (c, e) => ({ part: P3, color: c, roughness: 0.35, metalness: 0.55, ...e });
  let hull;
  if (tier === 0) hull = new THREE.BoxGeometry(3, 1.4, 7);
  else {
    const s = new THREE.Shape([new THREE.Vector2(-1.6, -3.4), new THREE.Vector2(1.6, -3.4), new THREE.Vector2(1.2, 2.2), new THREE.Vector2(0, 3.6), new THREE.Vector2(-1.2, 2.2)]);
    hull = new THREE.ExtrudeGeometry(s, { depth: 1.4, bevelEnabled: tier >= 2, bevelSize: 0.15, bevelThickness: 0.2, bevelSegments: tier === 3 ? 3 : 1 });
    hull.rotateX(Math.PI / 2);
    hull.translate(0, 0.7, 0);
  }
  const h = mesh(faceted(hull), o(color));
  h.position.y = 1.6;
  root.add(h);
  if (tier >= 1) {
    const wings = [place(new THREE.BoxGeometry(7, 0.18, 1.8), { p: [0, 1.6, -1.2] })];
    root.add(mesh(merge(wings), o("#9aa3ad")));
    const cockpit = mesh(new THREE.SphereGeometry(0.7, byTier(tier, [8, 8, 24, 32]), 12, 0, Math.PI * 2, 0, Math.PI / 2), o("#2b3a55", { roughness: 0.15 }));
    cockpit.scale.set(1, 0.6, 1.6);
    cockpit.position.set(0, 2.3, 1.6);
    root.add(cockpit);
  }
  const engines = [-2.2, 2.2].map((x) => {
    const e = cylinder(tier, 0.45, 1.6, o(accent));
    e.rotation.x = Math.PI / 2;
    e.position.set(x, 1.5, -2.2);
    root.add(e);
    return e;
  });
  if (tier >= 2) for (const e of engines) {
    const glow = mesh(new THREE.CircleGeometry(0.38, 24), { part: "vfx", color: "#7df9ff", emissive: "#30e0ff", emissiveIntensity: 3, castShadow: false });
    glow.position.set(e.position.x, 1.5, -3.02);
    glow.rotation.y = Math.PI;
    root.add(glow);
  }
  const gear = [[-1, 2], [1, 2], [0, -2.5]].map(([x, z]) => place(new THREE.CylinderGeometry(0.12, 0.12, 1, 8), { p: [x, 0.5, z] }));
  root.add(mesh(merge(gear), o("#555a62")));
  return root;
}
function hologram(tier, { color = "#30e0ff", seed = 0 } = {}) {
  const root = group("hologram");
  root.add(cylinder(tier, 0.5, 0.2, { part: P3, color: "#3a3f4a", metalness: 0.5, roughness: 0.4 }));
  const shape = mesh(new THREE.IcosahedronGeometry(0.55, byTier(tier, [0, 0, 1, 2])), { part: "vfx", color, emissive: color, emissiveIntensity: 2, opacity: 0.55, castShadow: false });
  shape.position.y = 1.2;
  root.add(shape);
  shape.userData.animate = (t) => {
    shape.rotation.y = t * 0.8 + seed;
    shape.position.y = 1.2 + Math.sin(t * 1.6 + seed) * 0.08;
  };
  return root;
}
function trashCan(tier, { color = "#4a6b3a" } = {}) {
  const root = group("trash can");
  const body = cylinder(tier, 0.35, 0.9, { part: P3, color });
  body.position.y = 0.45;
  root.add(body);
  const lid = cylinder(tier, 0.38, 0.08, { part: P3, color: "#3a3f4a" });
  lid.position.y = 0.94;
  root.add(lid);
  return root;
}

// src/scenes/kit/landscape.js
function pine(tier, rng, { height = 5, color = "#2f5d3a", trunk = "#5b3b22" } = {}) {
  const root = group("pine");
  const trunkG = new THREE.CylinderGeometry(0.1, 0.18, height * 0.35, byTier(tier, [5, 6, 10, 16]));
  trunkG.translate(0, height * 0.175, 0);
  root.add(mesh(tier === 1 ? faceted(trunkG) : trunkG, { part: "foliage", color: trunk }));
  const layers = byTier(tier, [1, 3, 4, 6]);
  const cones = [];
  for (let i = 0; i < layers; i++) {
    const t = i / Math.max(1, layers - 1);
    const r = height * (layers === 1 ? 0.3 : 0.34 - t * 0.2);
    const h = height * (layers === 1 ? 0.8 : 0.42 - t * 0.12);
    const g = new THREE.ConeGeometry(r, h, byTier(tier, [7, 7, 16, 24]), tier === 3 ? 3 : 1);
    if (tier === 3) displace(g, { amount: r * 0.1, scale: 3 / r, seed: Math.floor(rng() * 999), axis: null });
    cones.push(place(g, { p: [0, height * (layers === 1 ? 0.6 : 0.35 + t * 0.48), 0], r: [0, rng() * Math.PI, 0] }));
  }
  const canopy = merge(cones);
  root.add(mesh(tier === 1 ? faceted(canopy) : canopy, { part: "foliage", color }));
  return root;
}
function flowers(tier, rng, { w = 3, d = 1.2, n = 24, colors = ["#f7a6c1", "#ffe08a", "#c7a6f7", "#ffffff"], stem = "#4f8a3a" } = {}) {
  const root = group("flowers");
  const heads = {}, stems = [];
  for (let i = 0; i < n; i++) {
    const x = rng.range(-w / 2, w / 2), z = rng.range(-d / 2, d / 2), h = rng.range(0.25, 0.45);
    const c = rng.pick(colors);
    const head = tier === 0 ? new THREE.BoxGeometry(0.14, 0.14, 0.14) : new THREE.IcosahedronGeometry(0.08, tier >= 2 ? 1 : 0);
    (heads[c] ||= []).push(place(head, { p: [x, h, z] }));
    if (tier >= 1) stems.push(place(new THREE.CylinderGeometry(0.012, 0.012, h, 4), { p: [x, h / 2, z] }));
  }
  for (const [c, g] of Object.entries(heads)) root.add(mesh(merge(g), { part: "foliage", color: c, castShadow: false }));
  if (stems.length) root.add(mesh(merge(stems), { part: "foliage", color: stem, castShadow: false }));
  return root;
}
function grass(tier, rng, { w = 20, d = 20, perSquareMeter = 6, color = "#7fb24a", height = 0.5, avoid = null } = {}) {
  const n = Math.round(w * d * perSquareMeter * byTier(tier, [0.05, 0.25, 1, 3]));
  const pos = [];
  const segs = tier >= 3 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const x = rng.range(-w / 2, w / 2), z = rng.range(-d / 2, d / 2);
    if (avoid && avoid(x, z)) continue;
    const h = height * rng.range(0.6, 1.3), bw = 0.06 * rng.range(0.7, 1.3);
    const a = rng() * Math.PI, lean = rng.range(-0.15, 0.15);
    const cx = Math.cos(a) * bw, cz = Math.sin(a) * bw;
    if (segs === 1) pos.push(x - cx, 0, z - cz, x + cx, 0, z + cz, x + lean, h, z + lean);
    else {
      const mx = x + lean * 0.4, mz = z + lean * 0.4, my = h * 0.55;
      pos.push(x - cx, 0, z - cz, x + cx, 0, z + cz, mx + cx * 0.6, my, mz + cz * 0.6);
      pos.push(x - cx, 0, z - cz, mx + cx * 0.6, my, mz + cz * 0.6, mx - cx * 0.6, my, mz - cz * 0.6);
      pos.push(mx - cx * 0.6, my, mz - cz * 0.6, mx + cx * 0.6, my, mz + cz * 0.6, x + lean, h, z + lean);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return mesh(g, { part: "foliage", color, doubleSided: true, castShadow: false, wind: { strength: 0.12, height } });
}
function ridge(tier, rng, { width = 120, height = 18, depth = 4, color = "#6a5a7a", peaks = 7 } = {}) {
  const pts = [new THREE.Vector2(-width / 2, -2)];
  const steps = peaks * byTier(tier, [1, 2, 4, 8]);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const base = Math.sin(t * Math.PI) * 0.4 + 0.5;
    const peak = Math.abs(Math.sin(t * peaks * Math.PI + rng() * 0.6));
    pts.push(new THREE.Vector2(-width / 2 + t * width, height * (base * 0.6 + peak * 0.5) * rng.range(0.85, 1.05)));
  }
  pts.push(new THREE.Vector2(width / 2, -2));
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return mesh(faceted(g), { part: "terrain", color, castShadow: false });
}
function pond(tier, rng, { radius = 2.5, color = "#3f8fbf", stones = true } = {}) {
  const root = group("pond");
  const water = new THREE.CircleGeometry(radius, byTier(tier, [10, 12, 40, 64]));
  water.rotateX(-Math.PI / 2);
  water.translate(0, 0.03, 0);
  root.add(mesh(water, { part: "water", color, roughness: 0.2, castShadow: false, wave: tier >= 2 ? { amplitude: 0.02, frequency: 2, falloff: radius * 2 } : null }));
  if (stones && tier >= 1) {
    const g = [];
    const n = byTier(tier, [0, 8, 14, 22]);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + rng() * 0.2, s = rng.range(0.2, 0.38);
      g.push(place(new THREE.IcosahedronGeometry(s, tier >= 2 ? 1 : 0), { p: [Math.cos(a) * radius, 0.05, Math.sin(a) * radius], s: [1, 0.55, 1] }));
    }
    root.add(mesh(tier === 1 ? faceted(merge(g)) : merge(g), { part: "props", color: "#9a968e" }));
  }
  return root;
}
function lava(tier, { length = 8, width = 1.6 } = {}) {
  const g = new THREE.PlaneGeometry(length, width, byTier(tier, [1, 4, 24, 48]), byTier(tier, [1, 2, 6, 12]));
  g.rotateX(-Math.PI / 2);
  g.translate(length / 2, 0, 0);
  return mesh(g, { part: "vfx", color: "#ff5a1f", emissive: "#ff4a10", emissiveIntensity: 2.2, castShadow: false, receiveShadow: false, wave: tier >= 2 ? { amplitude: 0.04, frequency: 1.6, falloff: 1e3 } : null });
}
function terrainPatch(tier, { w = 60, d = 60, amp = 1.5, scale = 0.06, seed = 1, color = "#8fbf5a", flat = null } = {}) {
  const heightAt = (x, z) => {
    const h = fbm(x * scale, 0, z * scale, seed, 4) * amp;
    return flat ? h * flat(x, z) : h;
  };
  const seg = byTier(tier, [12, 20, 64, 160]);
  let g = new THREE.PlaneGeometry(w, d, seg, seg);
  g.rotateX(-Math.PI / 2);
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  g.computeVertexNormals();
  if (tier === 1) g = faceted(g);
  return { mesh: mesh(g, { part: "terrain", color, castShadow: false }), heightAt };
}

// src/scenes/lookdev.js
var lookdev_default = {
  id: "lookdev",
  name: "Lookdev Stage",
  inspiredBy: ["Studio turntables", "Material test charts"],
  genre: "reference",
  notes: "Every look is judged here first. Watch the cel bands on the sphere, the outlines on the cube's hard edges, and whether the color chart and gray card stay readable.",
  shots: {
    hero: { label: "Hero 3/4", pos: [6.4, 3.7, 8.4], target: [0, 1.1, -0.6], fov: 40 },
    wide: { label: "Wide", pos: [12, 8.5, 16], target: [0, 1, -0.8], fov: 45 },
    close: { label: "Close-up (mannequin)", pos: [1.6, 1.85, 5.2], target: [0, 1.25, 1.4], fov: 35 }
  },
  defaultShot: "hero",
  focus: [0, 1.2, 1.4],
  shadow: { center: [0, 0, -0.5], radius: 9 },
  far: 400,
  params: {
    "lighting.key.elevation": 45,
    "lighting.key.azimuth": 40,
    "lighting.key.color": "#fff8ee",
    "lighting.key.intensity": 2.8,
    "lighting.ambient.sky": "#dfe9ff",
    "lighting.ambient.ground": "#6a6458",
    "lighting.ambient.intensity": 0.8,
    "atmosphere.sky.zenith": "#5f86b0",
    "atmosphere.sky.horizon": "#cfd8e0",
    "atmosphere.sky.ground": "#9a9890",
    "atmosphere.fog.color": "#cfd8e0"
  },
  build({ tier = 0, seed = 7 } = {}) {
    const rng = createRng(seed);
    const root = group("lookdev");
    const floorG = new THREE.CircleGeometry(16, byTier(tier, [24, 32, 96, 160]));
    floorG.rotateX(-Math.PI / 2);
    root.add(mesh(floorG, { part: "terrain", color: "#8c8a80", castShadow: false }));
    root.add(at(sphere(tier, 0.7, { part: "props", color: "#d9534f" }), [-2.8, 0.7, 1.2]));
    root.add(at(box(tier, [1.2, 1.2, 1.2], { part: "props", color: "#f0ad4e" }), [-1.5, 0.6, -0.9], [0, 0.5, 0]));
    root.add(at(beveledBox(tier, 1, { part: "props", color: "#e9d44c" }), [3.4, 0.5, -0.6], [0, -0.4, 0]));
    root.add(at(cylinder(tier, 0.55, 1.5, { part: "props", color: "#5cb85c" }), [2.5, 0.75, 1.3]));
    const knot = at(torusKnot(tier, 0.42, 0.15, { part: "props", color: "#5bc0de" }), [0.9, 1.75, -0.9]);
    knot.userData.animate = (t) => {
      knot.rotation.y = t * 0.6;
      knot.position.y = 1.75 + Math.sin(t * 1.3) * 0.08;
    };
    root.add(knot);
    root.add(at(rock(tier, 0.65, rng, {}), [-4.3, 0.25, 2.4], [0, 0.8, 0]));
    root.add(at(character(tier, { part: "hero", shirt: "#3d7fd6", hat: "#8a5a2b" }), [0, 0, 1.6]));
    root.add(at(house(tier, { wall: "#f2e6d0", roof: "#c0392b", trim: "#ffffff", door: "#6d4c41" }), [-4.2, 0, -3.6], [0, 0.35, 0], 0.85));
    root.add(at(tree(tier, rng.fork()), [4.4, 0, -3.4]));
    root.add(at(colorChart(tier), [0.4, 0, -3.8], [0, -0.1, 0]));
    root.add(at(grayCard(tier), [2.2, 0, -2.8], [0, -0.35, 0]));
    return { root };
  }
};

// src/scenes/harbor.js
var BEACH = { radius: 24, height: 1.2, edge: -0.8, power: 2.5 };
var GRASS = { radius: 16.5, height: 4.2, edge: 0.2, power: 1.3 };
var groundAt = (x, z) => {
  const r = Math.hypot(x, z);
  return Math.max(hillHeight(r, BEACH), r < GRASS.radius ? hillHeight(r, GRASS) : -Infinity);
};
var on = (x, z, sink = 0.15) => [x, groundAt(x, z) - sink, z];
var harbor_default = {
  id: "harbor",
  name: "Harbor Isle",
  inspiredBy: ["The Legend of Zelda: The Wind Waker", "Sea of Thieves"],
  genre: "open-sea adventure",
  notes: "Watch the distant islands and the masts: toon looks succeed or fail on haze and on thin details. The sea is the largest area of the frame, so its color sets the mood.",
  shots: {
    hero: { label: "Hero", pos: [15.5, 8.5, 38], target: [1, 2.2, 14], fov: 45 },
    gameplay: { label: "Gameplay (third-person)", pos: [-1.5, 5.2, 23.5], target: [-1.5, 1.8, 11], fov: 55 },
    wide: { label: "Wide", pos: [72, 33, 96], target: [0, 3, 4], fov: 45 },
    close: { label: "Close-up (hero)", pos: [-0.6, 1.9, 13.6], target: [-1.5, 1.5, 16.5], fov: 35 }
  },
  defaultShot: "hero",
  focus: [-1.5, 1.5, 16.5],
  shadow: { center: [2, 0, 12], radius: 27 },
  far: 1200,
  params: {
    "lighting.key.elevation": 48,
    "lighting.key.azimuth": 50,
    "lighting.key.color": "#fff4e2",
    "lighting.key.intensity": 3,
    "lighting.ambient.sky": "#bcd8ff",
    "lighting.ambient.ground": "#6b6b5a",
    "lighting.ambient.intensity": 0.6,
    "atmosphere.sky.zenith": "#4d8fe0",
    "atmosphere.sky.horizon": "#cfe6ff",
    "atmosphere.sky.ground": "#cfe6ff",
    "atmosphere.fog.color": "#cfe6ff"
  },
  // Look zones (§6.10): the dock is Sea Breeze Toon; the lighthouse hill is dusky; the village is warm.
  zones: [
    { id: "dock", label: "The dock", shape: "box", center: [2, 1.5, 24], size: [4, 4, 14], blend: 3, priority: 1, look: "sea-breeze" },
    {
      id: "lighthouse",
      label: "Lighthouse hill",
      lookName: "Dusk",
      shape: "sphere",
      center: [-6, 4, -4],
      radius: 4,
      blend: 4,
      priority: 0,
      params: { "grade.temperature": 0.35, "grade.exposure": -0.3, "lens.vignette.amount": 0.4 }
    },
    {
      id: "village",
      label: "Village",
      lookName: "Cozy",
      shape: "box",
      center: [6, 3, 5],
      size: [12, 8, 16],
      blend: 3,
      priority: 0,
      params: { "grade.saturation": 1.2, "grade.temperature": 0.15 }
    }
  ],
  build({ tier = 0, seed = 11, density = 1 } = {}) {
    const rng = createRng(seed);
    const root = group("harbor");
    root.add(sea(tier));
    root.add(hill(tier, { ...BEACH, color: "#e8d3a0", seed: 3, rough: 0.05 }));
    root.add(hill(tier, { ...GRASS, color: "#7cb342", seed: 5, rough: 0.08 }));
    root.add(ring(tier, 19.2, 20.6, 0.06, { part: "water", color: "#f4fbff" }));
    root.add(at(lighthouse(tier), on(-6, -4, 0.3)));
    const houses = [
      [5, 6, -0.5, { wall: "#f3dc8a", roof: "#c0392b", trim: "#ffffff", door: "#6d4c41" }],
      [9.5, 0, -1.3, { wall: "#cfe0e8", roof: "#2e6fb7", trim: "#ffffff", door: "#5d4037" }],
      [2, 11, 0.1, { wall: "#f2e6d0", roof: "#d35400", trim: "#fff6e8", door: "#4e342e" }]
    ];
    for (const [x, z, ry, colors] of houses) root.add(at(house(tier, colors), on(x, z, 0.25), [0, ry, 0]));
    const treeRng = rng.fork();
    const treeSpots = [[-2, 4, 3.4], [-9, 3, 3], [11, -6, 3.6], [-1, -10, 3.2], [6, -9, 2.8], [-11, 8, 2.6], [12.5, 5.5, 2.9], [-6, -10, 3.1], [9, -11, 2.7], [-13, -3, 2.9], [3.5, -13, 3.3], [-4, 12, 2.6], [13, -1, 3], [-9, -7, 3.4]];
    for (const [x, z, h] of treeSpots.slice(0, Math.min(treeSpots.length, count(7, density)))) {
      root.add(at(tree(tier, treeRng.fork(), { height: h, leaf: treeRng.pick(["#5f9e3a", "#6aa84f", "#4f8f3a"]) }), on(x, z, 0.2)));
    }
    const rockRng = rng.fork();
    for (const [x, z, s] of [[-8, 17, 0.9], [-12.5, 14.5, 1.3], [9, 16.8, 0.8], [14.5, 11.5, 1.1], [-16, 8, 1.4]]) root.add(at(rock(tier, s, rockRng.fork(), {}), on(x, z, s * 0.2), [0, rockRng() * 6, 0]));
    const { root: dockRoot, posts } = dock(tier, { length: 14, width: 2.6 });
    dockRoot.position.set(2, 0, 17);
    root.add(dockRoot);
    if (tier >= 2) {
      for (const [x, z] of posts.filter(([, z2]) => z2 > 4)) root.add(at(ring(tier, 0.2, 0.42, 0.06, { part: "water", color: "#f4fbff" }), [2 + x, 0, 17 + z]));
    }
    root.add(at(boat(tier, { seed: 1.3 }), [6.3, 0, 26.5], [0, -Math.PI / 2, 0]));
    root.add(at(barrel(tier), [2.7, 1.1, 28.8]));
    root.add(at(barrel(tier, { color: "#7a4b2a" }), [2.9, 1.1, 27.9]));
    root.add(at(crate(tier), [1.25, 1.1, 29.4], [0, 0.3, 0]));
    root.add(at(crate(tier, { size: 0.7 }), on(4.2, 13.5, 0.1), [0, 0.7, 0]));
    for (const [x, z] of posts.filter(([, z2]) => z2 > 9)) root.add(at(lantern(tier), [2 + x, 1.6, 17 + z]));
    root.add(at(character(tier, { part: "characters", shirt: "#e67e22", pants: "#4a4a5a", hat: "#2e4057", seed: 1 }), [1.4, 1.1, 25.5], [0, 0.9, 0]));
    root.add(at(character(tier, { part: "characters", shirt: "#8e44ad", pants: "#3b4a6b", seed: 2.5 }), [2.7, 1.1, 21], [0, -2.4, 0]));
    root.add(at(character(tier, { part: "hero", shirt: "#2e8b57", pants: "#6b4f2f", hat: "#c8a44a", seed: 4 }), on(-1.5, 16.5, 0.05), [0, Math.PI, 0]));
    for (const [x, z, radius, height, color] of [[-120, -220, 42, 24, "#6f8f6a"], [165, -260, 58, 32, "#7d9a86"], [-270, -70, 36, 15, "#73906e"], [95, -145, 17, 9, "#7f9f6a"]]) {
      root.add(at(hill(tier, { radius, height, edge: -2, color, seed: Math.round(x), rough: 0.12 }), [x, 0, z]));
    }
    const cloudRng = rng.fork();
    for (let i = 0; i < count(7, density); i++) {
      const c = cloud(tier, cloudRng.fork(), { size: cloudRng.range(16, 30) });
      const x0 = cloudRng.range(-320, 320), y = cloudRng.range(55, 85), z = cloudRng.range(-330, -90);
      at(c, [x0, y, z]);
      c.userData.animate = (t) => {
        c.position.x = ((x0 + t * 1.5 + 360) % 720 + 720) % 720 - 360;
      };
      root.add(c);
    }
    return { root };
  }
};

// src/scenes/garden.js
var garden_default = {
  id: "garden",
  name: "Village Garden",
  inspiredBy: ["Untitled Goose Game", "Animal Crossing"],
  genre: "cozy sandbox",
  notes: "Readability by flat pastel color: can you tell every prop apart without lines? Watch the soft contact shadows under small props and whether the goose stays the focus.",
  shots: {
    hero: { label: "High angle (near-orthographic)", pos: [16, 24, 21], target: [0, 0, 0], fov: 30 },
    gameplay: { label: "Gameplay (top-down)", pos: [0, 34, 16], target: [0, 0, 0.5], fov: 26 },
    wide: { label: "Wide", pos: [28, 30, 34], target: [0, 0, -1], fov: 34 },
    close: { label: "Close-up (goose)", pos: [5.2, 2.2, 6.2], target: [2.6, 0.5, 2.2], fov: 35 }
  },
  defaultShot: "hero",
  focus: [2.6, 0.5, 2.2],
  shadow: { center: [0, 0, 0], radius: 17 },
  far: 400,
  fogFocus: 0.6,
  // the camera is far away: fog starts 60% of the way to the focus
  params: {
    "lighting.key.elevation": 58,
    "lighting.key.azimuth": 30,
    "lighting.key.color": "#fff6e8",
    "lighting.key.intensity": 2.5,
    "lighting.ambient.sky": "#d6e6ff",
    "lighting.ambient.ground": "#a0b080",
    "lighting.ambient.intensity": 1,
    "atmosphere.sky.zenith": "#9cc8f0",
    "atmosphere.sky.horizon": "#e6f0f4",
    "atmosphere.sky.ground": "#e6f0f4",
    "atmosphere.fog.color": "#e6f0f4"
  },
  build({ tier = 0, seed = 21, density = 1 } = {}) {
    const rng = createRng(seed);
    const root = group("garden");
    const lawn = new THREE.PlaneGeometry(44, 44).rotateX(-Math.PI / 2);
    root.add(mesh(lawn, { part: "terrain", color: "#a7cc76", castShadow: false }));
    const paths = [place(new THREE.BoxGeometry(2.2, 0.06, 26), { p: [0, 0.03, 2] }), place(new THREE.BoxGeometry(22, 0.06, 2), { p: [0, 0.03, 1] })];
    root.add(mesh(merge(paths), { part: "terrain", color: "#eadcbf", castShadow: false }));
    const soil = mesh(new THREE.BoxGeometry(6, 0.18, 4), { part: "terrain", color: "#a7805f" });
    soil.position.set(-6, 0.09, 6);
    root.add(soil);
    root.add(at(house(tier, { wall: "#f6e7d0", roof: "#d98c7a", trim: "#ffffff", door: "#7fa7c9" }), [0, 0, -9], [0, 0, 0], 1.2));
    root.add(at(well(tier), [6.5, 0, -5]));
    root.add(at(pond(tier, rng.fork(), { radius: 2.4, color: "#7fc4e0" }), [7, 0, 5]));
    for (const [p, r] of [[[-9.2, 0, 3.8], 0], [[-9.2, 0, 8.2], 0], [[-9.2, 0, 3.8], -Math.PI / 2], [[-2.8, 0, 3.8], -Math.PI / 2]]) {
      root.add(at(fence(tier, r ? 4.4 : 6.4), p, [0, r, 0]));
    }
    for (const x of [-14, -9, 9, 14]) root.add(at(hedge(tier, [4.6, 1.1, 1.2], { seed: x }), [x, 0, -13]));
    const veg = [];
    for (let r = 0; r < 3; r++) for (let i = 0; i < count(6, density); i++) veg.push(place(tier === 0 ? new THREE.BoxGeometry(0.4, 0.3, 0.4) : new THREE.IcosahedronGeometry(0.26, tier >= 2 ? 1 : 0), { p: [-8.5 + i * 5 / count(6, density), 0.36, 4.8 + r * 1.2] }));
    root.add(mesh(merge(veg), { part: "foliage", color: "#6aa84f" }));
    const bedRng = rng.fork();
    for (const [x, z] of [[-4.5, -5.5], [4.5, -5.5], [-7, -1.8], [3.5, 9.5]]) root.add(at(flowers(tier, bedRng.fork(), { w: 3, d: 1.2, n: count(22, density) }), [x, 0, z]));
    const treeRng = rng.fork();
    const trees = [[-12, -7], [12, -8], [13, 9], [-13, 11], [-15, 1], [15, 1], [10, 14], [-6, 14]];
    for (const [x, z] of trees.slice(0, count(4, density))) root.add(at(tree(tier, treeRng.fork(), { height: 3.6, leaf: treeRng.pick(["#86b85a", "#9ac46a", "#76a84e"]) }), [x, 0, z]));
    root.add(at(bench(tier), [3.6, 0, -2.2], [0, -0.3, 0]));
    const propRng = rng.fork();
    for (let i = 0; i < count(3, density); i++) root.add(at(i % 2 ? barrel(tier, { color: "#b9835a" }) : crate(tier, { color: "#d8b07a", size: 0.7 }), [4 + propRng.range(-1.5, 2), 0, -7 + propRng.range(-1, 1.5)], [0, propRng() * 3, 0]));
    root.add(at(character(tier, { part: "characters", shirt: "#7fa7c9", pants: "#6b5a4a", hat: "#e8d08a", seed: 3 }), [-4, 0, 7.4], [0, 2.4, 0]));
    const g = goose(tier, { part: "hero", seed: 1 });
    const idle = g.userData.animate;
    g.userData.animate = (t) => {
      idle(t);
      const a = t * 0.25;
      g.position.set(1.2 + Math.cos(a) * 2.6, 0, 2.2 + Math.sin(a) * 1.6);
      g.rotation.y = -a + Math.PI;
    };
    root.add(g);
    return { root };
  }
};

// src/scenes/plaza.js
function graffiti(tier, rng, { w = 4, h = 2.4, colors }) {
  const root = group("graffiti");
  const byColor = {};
  const n = [3, 6, 10, 16][tier];
  for (let i = 0; i < n; i++) {
    const c = rng.pick(colors);
    const kind = rng.pick(["blob", "blob", "star", "stripe"]);
    const s = rng.range(0.25, 0.7) * h * 0.5;
    let g;
    if (kind === "blob") g = new THREE.CircleGeometry(s, tier >= 2 ? 24 : 8);
    else if (kind === "star") {
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * Math.PI * 2;
        const r = k % 2 ? s * 0.45 : s;
        pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
      }
      g = new THREE.ShapeGeometry(new THREE.Shape(pts));
    } else g = new THREE.PlaneGeometry(s * 3, s * 0.35);
    (byColor[c] ||= []).push(place(g, { p: [rng.range(-w / 2 + s, w / 2 - s), rng.range(s * 0.6, h - s * 0.6), 0.01 + i * 2e-3], r: [0, 0, rng.range(-0.5, 0.5)] }));
  }
  for (const [c, g] of Object.entries(byColor)) root.add(mesh(merge(g), { part: "props", color: c, castShadow: false }));
  return root;
}
var PAINT = ["#ff2e88", "#00c8ff", "#ffe600", "#7cff3a", "#ff7a1a", "#a06cd5"];
var plaza_default = {
  id: "plaza",
  name: "Graffiti Plaza",
  inspiredBy: ["Jet Set Radio / Jet Grind Radio", "Bomb Rush Cyberfunk"],
  genre: "skate / action",
  notes: "Thick lines on hard surfaces and saturated paint: does ink make the city graphic, or just noisy? Rails and ramps are thin and long, so watch them break up at distance.",
  shots: {
    hero: { label: "Low chase (wide lens)", pos: [9, 2.6, 15], target: [-1, 2.2, 0], fov: 72 },
    gameplay: { label: "Gameplay (chase)", pos: [0.5, 2.2, 13], target: [0, 1.6, 2], fov: 80 },
    wide: { label: "Wide", pos: [26, 19, 30], target: [0, 2, -2], fov: 45 },
    close: { label: "Close-up (skater)", pos: [4.6, 1.6, 7.6], target: [3, 1.2, 4.4], fov: 38 }
  },
  defaultShot: "hero",
  focus: [3, 1.2, 4.4],
  shadow: { center: [0, 0, 0], radius: 22 },
  far: 500,
  params: {
    "lighting.key.elevation": 62,
    "lighting.key.azimuth": 40,
    "lighting.key.color": "#ffffff",
    "lighting.key.intensity": 3.2,
    "lighting.ambient.sky": "#bfe3ff",
    "lighting.ambient.ground": "#9aa0aa",
    "lighting.ambient.intensity": 0.8,
    "atmosphere.sky.zenith": "#1e9bff",
    "atmosphere.sky.horizon": "#bfefff",
    "atmosphere.sky.ground": "#bfefff",
    "atmosphere.fog.color": "#bfefff"
  },
  build({ tier = 0, seed = 33, density = 1 } = {}) {
    const rng = createRng(seed);
    const root = group("plaza");
    root.add(mesh(new THREE.PlaneGeometry(70, 70).rotateX(-Math.PI / 2), { part: "terrain", color: "#b9bcc4", castShadow: false }));
    const paint = [["circle", 4.2, [3, 0.01, 3], "#ff2e88"], ["box", [12, 3.2], [-4, 0.012, 9], "#00c8ff"], ["circle", 2.6, [12, 0.011, -2], "#ffe600"]];
    for (const [kind, size, p, color] of paint.slice(0, tier === 0 ? 1 : 3)) {
      const g = kind === "circle" ? new THREE.RingGeometry(size * 0.8, size, tier >= 2 ? 64 : 16) : new THREE.PlaneGeometry(size[0], size[1]);
      g.rotateX(-Math.PI / 2);
      root.add(at(mesh(g, { part: "terrain", color, castShadow: false }), p));
    }
    const platform2 = mesh(new THREE.BoxGeometry(10, 1.2, 6), { part: "architecture", color: "#8e939e" });
    platform2.position.set(-8, 0.6, -5);
    root.add(platform2);
    root.add(at(stairs(tier, { steps: 4, width: 4, rise: 0.3, run: 0.5 }), [-8, 0, -0.2], [0, Math.PI, 0]));
    const bRng = rng.fork();
    const blocks = [
      [-14, -16, 10, 8, 14, "#ff6b6b"],
      [-2, -18, 9, 7, 18, "#4ecdc4"],
      [10, -16, 10, 8, 12, "#ffe66d"],
      [20, -4, 8, 10, 16, "#a06cd5"],
      [-22, -2, 8, 10, 11, "#ff9f1c"],
      [20, 12, 8, 8, 9, "#2ec4b6"]
    ];
    for (const [x, z, w, d, h, color] of blocks) {
      const b = at(building(tier, bRng.fork(), { w, d, h, color }), [x, 0, z], [0, Math.abs(x) > 18 ? -Math.sign(x) * Math.PI / 2 : 0, 0]);
      root.add(b);
    }
    const gRng = rng.fork();
    for (const [x, z, r] of [[-14, -11.9, 0], [-2, -14.4, 0], [10, -11.9, 0], [14.9, -4, -Math.PI / 2], [-16.9, -2, Math.PI / 2]].slice(0, count(3, density) + 2)) {
      root.add(at(graffiti(tier, gRng.fork(), { w: 6, h: 3, colors: PAINT }), [x, 0.4, z], [0, r, 0]));
    }
    root.add(at(ramp(tier, { width: 5, height: 1.8 }), [6, 0, -4]));
    root.add(at(rail(tier, 8, { color: "#ffe600" }), [-3, 0, 5]));
    root.add(at(rail(tier, 6, { color: "#ff2e88", height: 0.9 }), [-12, 1.2, -2.2]));
    for (const [x, z] of [[-12, 8], [12, 8], [-4, -10], [14, -9]].slice(0, count(3, density))) root.add(at(lampPost(tier, { light: false }), [x, 0, z]));
    for (const [x, z, r] of [[2, 9, 0], [-9, 9, 0.3], [9, 2, -1.2]].slice(0, count(2, density))) root.add(at(bench(tier, { color: "#00c8ff" }), [x, 0, z], [0, r, 0]));
    for (const [x, z] of [[4, 10.5], [-15, 5], [16, 6]].slice(0, count(2, density))) root.add(at(trashCan(tier, { color: "#ff7a1a" }), [x, 0, z]));
    const board = group("billboard");
    board.add(mesh(merge([place(new THREE.BoxGeometry(0.25, 6, 0.25), { p: [-2.5, 3, 0] }), place(new THREE.BoxGeometry(0.25, 6, 0.25), { p: [2.5, 3, 0] })]), { part: "architecture", color: "#3a3f4a" }));
    const panel = mesh(new THREE.BoxGeometry(7, 3, 0.2), { part: "props", color: "#ffe600" });
    panel.position.y = 6.5;
    board.add(panel);
    board.add(at(graffiti(tier, gRng.fork(), { w: 6.6, h: 2.6, colors: ["#ff2e88", "#00c8ff", "#0b0b0f"] }), [0, 5.2, 0.11]));
    root.add(at(board, [-16, 0, 12], [0, 0.7, 0]));
    const sk = skater(tier, { part: "hero", seed: 2 });
    const idle = sk.userData.animate;
    sk.userData.animate = (t) => {
      idle(t);
      const a = t * 0.45;
      sk.position.set(2 + Math.sin(a) * 4, 0, 3 + Math.sin(a * 2) * 2);
      sk.rotation.y = Math.atan2(Math.cos(a) * 4, Math.cos(a * 2) * 4);
    };
    root.add(sk);
    root.add(at(skater(tier, { part: "characters", shirt: "#00c8ff", cap: "#ff2e88", seed: 5 }), [-9, 1.2, -4], [0, 0.6, 0]));
    root.add(at(character(tier, { part: "characters", shirt: "#7cff3a", pants: "#2b2f3a", seed: 7 }), [-6.5, 1.2, -5.5], [0, -0.8, 0]));
    return { root };
  }
};

// src/scenes/dungeon.js
var dungeon_default = {
  id: "dungeon",
  name: "Torchlit Dungeon",
  inspiredBy: ["The Legend of Zelda dungeons", "Hades", "Diablo"],
  genre: "action RPG",
  notes: "Value contrast in the dark: torches and lava are the only warm light. Watch whether shadows stay readable (not black), whether bloom stays on the lava, and how the flicker reads on toon bands.",
  shots: {
    hero: { label: "Isometric", pos: [17, 19, 17], target: [0, 0, 0], fov: 30 },
    gameplay: { label: "Gameplay (isometric, close)", pos: [11, 13, 12], target: [-1, 0, 1], fov: 30 },
    wide: { label: "Wide", pos: [24, 28, 26], target: [0, 0, -1], fov: 34 },
    close: { label: "Close-up (knight)", pos: [0.8, 2.2, 6.2], target: [-1.5, 1.2, 2.5], fov: 38 }
  },
  defaultShot: "hero",
  focus: [-1.5, 1.2, 2.5],
  shadow: { center: [0, 0, 0], radius: 15 },
  far: 300,
  fogFocus: 0.6,
  // the camera is far away: fog starts 60% of the way to the focus
  params: {
    "lighting.key.elevation": 62,
    "lighting.key.azimuth": 20,
    "lighting.key.color": "#b4c0ff",
    "lighting.key.intensity": 2.3,
    "lighting.ambient.sky": "#6b7499",
    "lighting.ambient.ground": "#3a3036",
    "lighting.ambient.intensity": 1.1,
    "atmosphere.sky.zenith": "#07080f",
    "atmosphere.sky.horizon": "#151826",
    "atmosphere.sky.ground": "#151826",
    "atmosphere.fog.color": "#151826"
  },
  // Look zones (§6.10): walk in and the look shifts. Params zones adjust whatever look is on.
  zones: [
    {
      id: "crypt",
      label: "Crypt (the dais)",
      lookName: "Darker, colder",
      shape: "box",
      center: [3, 1.5, -8],
      size: [12, 5, 6],
      blend: 3,
      priority: 1,
      params: { "grade.exposure": -0.5, "grade.saturation": 0.55, "grade.temperature": -0.3, "lens.vignette.amount": 0.6, "lighting.practicals.intensity": 2.2 }
    },
    {
      id: "lava",
      label: "Lava channel",
      lookName: "Heat",
      shape: "box",
      center: [0, 0, -3],
      size: [22, 3, 1.8],
      blend: 3,
      priority: 0,
      params: { "grade.temperature": 0.5, "grade.exposure": 0.25, "grade.saturation": 1.2 }
    },
    { id: "courtyard", label: "East courtyard", shape: "box", center: [6.5, 2, 6.5], size: [9, 5, 9], blend: 3, priority: 0, look: "golden-hour" }
  ],
  build({ tier = 0, seed = 44, density = 1 } = {}) {
    const rng = createRng(seed);
    const root = group("dungeon");
    const S = 11;
    if (tier === 0) {
      root.add(at(mesh(new THREE.BoxGeometry(S * 2, 0.4, S * 2), { part: "terrain", color: "#5a5560" }), [0, -0.2, 0]));
    } else {
      const tiles = [];
      const n = byTier(tier, [1, 8, 14, 22]);
      const t = S * 2 / n;
      for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
        const x = -S + (i + 0.5) * t, z = -S + (k + 0.5) * t;
        if (Math.abs(z + 3) < 0.9 && Math.abs(x) > 1.6) continue;
        const h = tier === 3 ? 0.3 + (i * 31 + k * 17) % 5 * 0.012 : 0.3;
        tiles.push(place(new THREE.BoxGeometry(t * 0.95, h, t * 0.95), { p: [x, -0.3 + h / 2, z] }));
      }
      root.add(mesh(merge(tiles), { part: "terrain", color: "#6a6570" }));
      root.add(at(mesh(new THREE.BoxGeometry(S * 2, 0.1, S * 2), { part: "terrain", color: "#2e2a33", castShadow: false }), [0, -0.36, 0]));
    }
    const channel = lava(tier, { length: S * 2, width: 1.8 });
    channel.position.set(-S, -0.25, -3);
    root.add(channel);
    const bridge = mesh(new THREE.BoxGeometry(3.2, 0.3, 2.2), { part: "architecture", color: "#6b6570" });
    bridge.position.set(0, -0.15, -3);
    root.add(bridge);
    root.add(at(wall(tier, S * 2, 4, { color: "#4a4650" }), [-S, 0, -S]));
    root.add(at(wall(tier, S * 2, 4, { color: "#4a4650" }), [-S, 0, S], [0, Math.PI / 2, 0]));
    for (const x of [-7, -2, 3, 8]) root.add(at(pillar(tier, 4.4, 0.45, { color: "#6b6570" }), [x, 0, -S + 0.9]));
    for (const z of [-6, 0, 6]) root.add(at(pillar(tier, 4.4, 0.45, { color: "#6b6570" }), [-S + 0.9, 0, z]));
    const torches = [[-4.5, -S + 0.55, 0], [5.5, -S + 0.55, 0], [-S + 0.55, -3, Math.PI / 2], [-S + 0.55, 3, Math.PI / 2], [0.5, -S + 0.55, 0], [-S + 0.55, 8, Math.PI / 2]];
    for (const [i, [x, z, r]] of torches.slice(0, Math.min(torches.length, count(4, density))).entries()) root.add(at(torch(tier, { seed: i * 1.7 }), [x, 2.4, z], [0, r, 0]));
    const dais = mesh(new THREE.BoxGeometry(6, 1, 4), { part: "architecture", color: "#625c68" });
    dais.position.set(4, 0.5, -7.5);
    root.add(dais);
    root.add(at(stairs(tier, { steps: 4, width: 3, rise: 0.25, run: 0.4, color: "#6b6570" }), [4, 0, -4.1], [0, Math.PI, 0]));
    root.add(at(chest(tier), [4, 1, -8]));
    const propRng = rng.fork();
    for (let i = 0; i < count(5, density); i++) {
      const p = [propRng.range(-9, -4), 0, propRng.range(2, 9)];
      root.add(at(i % 2 ? barrel(tier, { color: "#6d4a2d" }) : crate(tier, { color: "#7a5a3a", size: 0.8 }), p, [0, propRng() * 3, 0]));
    }
    root.add(at(knight(tier, { part: "hero", seed: 1 }), [-1.5, 0, 2.5], [0, 0.4, 0]));
    root.add(at(character(tier, { part: "characters", shirt: "#c9c4b5", pants: "#8f8a7d", skin: "#d8d2c0", seed: 4 }), [3, 0, 4.5], [0, -2.2, 0]));
    return { root };
  }
};

// src/scenes/kart.js
var STRAIGHT = 40;
var RADIUS = 13;
var WIDTH = 8;
var LOOP = 2 * STRAIGHT + 2 * Math.PI * RADIUS;
function track(s) {
  let d = (s % LOOP + LOOP) % LOOP;
  const half = STRAIGHT / 2;
  if (d < STRAIGHT) return { x: -half + d, z: RADIUS, heading: Math.PI / 2 };
  d -= STRAIGHT;
  if (d < Math.PI * RADIUS) {
    const a2 = d / RADIUS;
    return { x: half + Math.sin(a2) * RADIUS, z: Math.cos(a2) * RADIUS, heading: Math.PI / 2 + a2 };
  }
  d -= Math.PI * RADIUS;
  if (d < STRAIGHT) return { x: half - d, z: -RADIUS, heading: -Math.PI / 2 };
  d -= STRAIGHT;
  const a = d / RADIUS;
  return { x: -half - Math.sin(a) * RADIUS, z: -Math.cos(a) * RADIUS, heading: -Math.PI / 2 + a };
}
function ribbon(tier, a, b, { y = 0.01, steps }) {
  const n = steps ?? byTier(tier, [24, 40, 120, 240]);
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const p = track(i / n * LOOP);
    const nx = Math.cos(p.heading), nz = -Math.sin(p.heading);
    pos.push(p.x + nx * a, y, p.z + nz * a, p.x + nx * b, y, p.z + nz * b);
    if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (g.getAttribute("normal").getY(0) < 0) {
    g.setIndex(idx.map((_, k) => idx[k - k % 3 + [0, 2, 1][k % 3]]));
    g.computeVertexNormals();
  }
  return g;
}
var kart_default = {
  id: "kart",
  name: "Kart Circuit",
  inspiredBy: ["Mario Kart", "OutRun"],
  genre: "racing",
  notes: "Speed and repetition: karts in motion, repeated cones, tires and curbs, crowds in the stands. Watch temporal stability of lines and bands as karts move, and whether track markings stay crisp at a distance.",
  shots: {
    hero: { label: "Chase (start straight)", pos: [-26, 3.4, 13], target: [-10, 1.2, 13], fov: 60 },
    gameplay: { label: "Gameplay (chase, high)", pos: [-30, 6, 13], target: [-12, 1, 12], fov: 65 },
    wide: { label: "Wide", pos: [0, 48, 58], target: [0, 0, 0], fov: 45 },
    close: { label: "Close-up (grid)", pos: [-14, 1.6, 17], target: [-17, 0.8, 13], fov: 40 }
  },
  defaultShot: "hero",
  focus: [-16, 0.8, 13],
  shadow: { center: [0, 0, 0], radius: 36 },
  far: 600,
  params: {
    "lighting.key.elevation": 52,
    "lighting.key.azimuth": 60,
    "lighting.key.color": "#fff8ea",
    "lighting.key.intensity": 3,
    "lighting.ambient.sky": "#bfe3ff",
    "lighting.ambient.ground": "#7a9a5a",
    "lighting.ambient.intensity": 0.75,
    "atmosphere.sky.zenith": "#3d8ef0",
    "atmosphere.sky.horizon": "#d8efff",
    "atmosphere.sky.ground": "#d8efff",
    "atmosphere.fog.color": "#d8efff"
  },
  build({ tier = 0, seed = 55, density = 1 } = {}) {
    const rng = createRng(seed);
    const root = group("kart circuit");
    root.add(mesh(new THREE.PlaneGeometry(160, 120).rotateX(-Math.PI / 2), { part: "terrain", color: "#6fbf4a", castShadow: false }));
    root.add(mesh(ribbon(tier, -WIDTH / 2, WIDTH / 2, { y: 0.02 }), { part: "terrain", color: "#4a4d55", castShadow: false }));
    if (tier >= 1) {
      const n = byTier(tier, [0, 40, 80, 160]);
      const red = [], white = [];
      for (let i = 0; i < n; i++) {
        for (const side of [-1, 1]) {
          const p = track((i + 0.5) / n * LOOP);
          const nx = Math.cos(p.heading), nz = -Math.sin(p.heading);
          const seg = place(new THREE.BoxGeometry(0.7, 0.12, LOOP / n * 0.98), { p: [p.x + nx * side * (WIDTH / 2 + 0.35), 0.06, p.z + nz * side * (WIDTH / 2 + 0.35)], r: [0, p.heading, 0] });
          (i % 2 ? red : white).push(seg);
        }
      }
      root.add(mesh(merge(red), { part: "props", color: "#e74c3c", castShadow: false }), mesh(merge(white), { part: "props", color: "#f4f4f4", castShadow: false }));
    }
    if (tier >= 2) {
      const dashes = [];
      const n = 60;
      for (let i = 0; i < n; i += 2) {
        const p = track((i + 0.5) / n * LOOP);
        dashes.push(place(new THREE.BoxGeometry(0.25, 0.01, LOOP / n * 0.6), { p: [p.x, 0.035, p.z], r: [0, p.heading, 0] }));
      }
      root.add(mesh(merge(dashes), { part: "props", color: "#f4f4f4", castShadow: false }));
      const checks = { "#111111": [], "#f4f4f4": [] };
      for (let i = 0; i < 8; i++) for (let k = 0; k < 2; k++) checks[(i + k) % 2 ? "#111111" : "#f4f4f4"].push(place(new THREE.BoxGeometry(0.5, 0.012, WIDTH / 8), { p: [-14 + k * 0.5, 0.04, RADIUS - WIDTH / 2 + (i + 0.5) * WIDTH / 8] }));
      for (const [c, g] of Object.entries(checks)) root.add(mesh(merge(g), { part: "props", color: c, castShadow: false }));
    }
    const gate2 = group("start gate");
    gate2.add(mesh(merge([place(new THREE.BoxGeometry(0.5, 6, 0.5), { p: [0, 3, RADIUS - WIDTH / 2 - 1] }), place(new THREE.BoxGeometry(0.5, 6, 0.5), { p: [0, 3, RADIUS + WIDTH / 2 + 1] })]), { part: "architecture", color: "#d9dde3" }));
    gate2.add(mesh(place(new THREE.BoxGeometry(0.6, 1.4, WIDTH + 3), { p: [0, 6.2, RADIUS] }), { part: "props", color: "#e74c3c" }));
    gate2.position.x = -13.8;
    root.add(gate2);
    const sRng = rng.fork();
    root.add(at(stands(tier, sRng.fork(), 26, { rows: 4 }), [-13, 0, RADIUS + WIDTH / 2 + 5], [0, Math.PI, 0]));
    root.add(at(stands(tier, sRng.fork(), 20, { rows: 3 }), [10, 0, -RADIUS - WIDTH / 2 - 5]));
    const propRng = rng.fork();
    for (let i = 0; i < count(8, density); i++) {
      const a = i / count(8, density) * Math.PI;
      for (const side of [1, -1]) {
        const x = side * (STRAIGHT / 2 + Math.sin(a) * (RADIUS + WIDTH / 2 + 1.5)), z = Math.cos(a) * (RADIUS + WIDTH / 2 + 1.5);
        root.add(at(i % 2 ? tireStack(tier) : trafficCone(tier), [x, 0, z], [0, propRng() * 3, 0]));
      }
    }
    const treeRng = rng.fork();
    for (let i = 0; i < count(10, density); i++) {
      const x = treeRng.range(-60, 60), z = treeRng.pick([-1, 1]) * treeRng.range(30, 50);
      root.add(at(tree(tier, treeRng.fork(), { height: treeRng.range(4, 7) }), [x, 0, z]));
    }
    const colors = [["#e74c3c", "#3498db"], ["#2ecc71", "#f1c40f"], ["#9b59b6", "#ecf0f1"], ["#f39c12", "#2c3e50"]];
    colors.forEach(([body, driver], i) => {
      const k = kart(tier, { color: body, driver, part: i === 0 ? "hero" : "props", driverPart: i === 0 ? "hero" : "characters", seed: i });
      const lane = i % 2 ? -1.6 : 1.6;
      const start = -i * 4.5 + 6, speed = 14 - i * 0.8;
      k.userData.animate = (t) => {
        const p = track(start + t * speed);
        k.position.set(p.x + Math.cos(p.heading) * lane, 0, p.z - Math.sin(p.heading) * lane);
        k.rotation.y = p.heading;
        for (const w of k.userData.wheels) w.rotation.x = t * speed / 0.3;
      };
      root.add(k);
    });
    return { root };
  }
};

// src/scenes/platforms.js
function platform(tier, { r = 3, h = 0.6, top = "#6cc04a", earth = "#b5733f", square = false } = {}) {
  const root = group("platform");
  const seg = square ? 4 : byTier(tier, [10, 10, 40, 64]);
  const topG = new THREE.CylinderGeometry(r, r, h, seg, 1);
  if (square) topG.rotateY(Math.PI / 4);
  const t = mesh(tier === 1 ? faceted(topG) : topG, { part: "terrain", color: top });
  t.position.y = -h / 2;
  root.add(t);
  const under = new THREE.ConeGeometry(r * 0.95, r * 1.3, seg, byTier(tier, [1, 2, 4, 8]));
  under.rotateX(Math.PI);
  if (square) under.rotateY(Math.PI / 4);
  const u = mesh(tier === 1 ? faceted(under) : under, { part: "terrain", color: earth });
  u.position.y = -h - r * 0.65;
  root.add(u);
  return root;
}
var platforms_default = {
  id: "platforms",
  name: "Sky Platforms",
  inspiredBy: ["Super Mario 64", "Astro Bot"],
  genre: "3D platformer",
  notes: "Readable jumpable surfaces in primary colors: every top must read as standable from the camera. Watch the coins (small, spinning, emissive) and whether shadows show where you would land.",
  shots: {
    hero: { label: "3/4 side", pos: [6, 9, 21], target: [1, 3, 0], fov: 45 },
    gameplay: { label: "Gameplay (side)", pos: [0, 6.5, 17], target: [1, 3.5, 0], fov: 50 },
    wide: { label: "Wide", pos: [22, 18, 34], target: [2, 3, -2], fov: 45 },
    close: { label: "Close-up (hero)", pos: [-4.2, 2.6, 5.4], target: [-6, 1.8, 2], fov: 38 }
  },
  defaultShot: "hero",
  focus: [-6, 1.8, 2],
  shadow: { center: [1, 0, -1], radius: 18 },
  far: 600,
  params: {
    "lighting.key.elevation": 55,
    "lighting.key.azimuth": 35,
    "lighting.key.color": "#fffaf0",
    "lighting.key.intensity": 3,
    "lighting.ambient.sky": "#cfe6ff",
    "lighting.ambient.ground": "#e8f4ff",
    "lighting.ambient.intensity": 0.8,
    "atmosphere.sky.zenith": "#3f9bff",
    "atmosphere.sky.horizon": "#dff3ff",
    "atmosphere.sky.ground": "#bfe6ff",
    "atmosphere.fog.color": "#dff3ff"
  },
  build({ tier = 0, seed = 66, density = 1 } = {}) {
    const rng = createRng(seed);
    const root = group("sky platforms");
    const pads = [
      { p: [-6, 0, 1.5], r: 3.2 },
      { p: [0, 1.6, -1], r: 2.4, top: "#f5b82e" },
      { p: [5, 3, 1], r: 2, square: true, top: "#4aa3ff" },
      { p: [9.5, 4.6, -2.5], r: 2.6, top: "#e74c3c" },
      { p: [3, 6.2, -7], r: 3, top: "#6cc04a" },
      { p: [-5, 4, -6], r: 2, square: true, top: "#9b59b6" }
    ];
    for (const d of pads) root.add(at(platform(tier, d), d.p));
    const coins = [];
    for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 4]]) {
      const n = count(4, density);
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1);
        const p = pads[a].p.map((v, k) => v + (pads[b].p[k] - v) * t);
        coins.push(at(coin(tier, { seed: coins.length }), [p[0], p[1] + 1.2 + Math.sin(t * Math.PI) * 1.5, p[2]]));
      }
    }
    root.add(...coins);
    root.add(at(block(tier, { kind: "item" }), [-6, 3.2, 0.5]), at(block(tier, { kind: "brick" }), [-7, 3.2, 0.5]), at(block(tier, { kind: "brick" }), [-5, 3.2, 0.5]));
    root.add(at(pipe(tier, { height: 1.2, radius: 0.6 }), [3, 6.2, -8]));
    root.add(at(pipe(tier, { height: 0.8, radius: 0.5 }), [10.5, 4.6, -3]));
    const flag = group("flag");
    flag.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, byTier(tier, [6, 6, 12, 16])).translate(0, 2, 0), { part: "props", color: "#f4f4f4" }));
    flag.add(mesh(new THREE.BoxGeometry(1.2, 0.8, 0.04).translate(0.6, 3.5, 0), { part: "props", color: "#e74c3c" }));
    root.add(at(flag, [4.5, 6.2, -6]));
    const cRng = rng.fork();
    for (let i = 0; i < count(6, density); i++) {
      const c = cloud(tier, cRng.fork(), { size: cRng.range(5, 10) });
      const x0 = cRng.range(-40, 40), y = cRng.range(-8, 2), z = cRng.range(-40, -12);
      at(c, [x0, y, z]);
      c.userData.animate = (t) => {
        c.position.x = ((x0 + t * 0.6 + 50) % 100 + 100) % 100 - 50;
      };
      root.add(c);
    }
    root.add(at(character(tier, { part: "hero", shirt: "#e74c3c", pants: "#2e5fb7", hat: "#e74c3c", seed: 1 }), [-6, 0, 2], [0, 0.5, 0]));
    const bot = robot(tier, { part: "characters", body: "#ffe066", accent: "#2e5fb7", seed: 2 });
    at(bot, [9.5, 4.6, -2.5]);
    root.add(bot);
    return { root };
  }
};

// src/scenes/hangar.js
var METAL = { roughness: 0.35, metalness: 0.6 };
var hangar_default = {
  id: "hangar",
  name: "Sci-fi Hangar",
  inspiredBy: ["Metroid Prime", "Halo"],
  genre: "sci-fi shooter",
  notes: "Hard surfaces, metal and emissive strips: watch how each look handles metalness (stylized PBR keeps it, toon flattens it), whether bloom stays on the strips, and how translucent holograms read.",
  shots: {
    hero: { label: "Over the shoulder", pos: [-1.6, 2.3, 12.6], target: [0.6, 2, 2], fov: 52 },
    gameplay: { label: "Gameplay (third-person)", pos: [-3, 3.4, 14.5], target: [0, 1.8, 2], fov: 60 },
    wide: { label: "Wide", pos: [15, 10, 19], target: [0, 2, -1], fov: 50 },
    close: { label: "Close-up (ship)", pos: [5, 2.4, 6], target: [1, 2, 0.5], fov: 40 }
  },
  defaultShot: "hero",
  focus: [-3, 1.5, 9],
  shadow: { center: [0, 0, 0], radius: 15 },
  far: 300,
  params: {
    "lighting.key.elevation": 72,
    "lighting.key.azimuth": 10,
    "lighting.key.color": "#dfe8ff",
    "lighting.key.intensity": 2,
    "lighting.ambient.sky": "#6b7a99",
    "lighting.ambient.ground": "#2a2d33",
    "lighting.ambient.intensity": 0.55,
    "atmosphere.sky.zenith": "#0f1420",
    "atmosphere.sky.horizon": "#2a3346",
    "atmosphere.sky.ground": "#2a3346",
    "atmosphere.fog.color": "#2a3346"
  },
  build({ tier = 0, seed = 77, density = 1 } = {}) {
    const rng = createRng(seed);
    const root = group("hangar");
    const W = 12, D = 13;
    const floor = [];
    const n = byTier(tier, [1, 6, 12, 20]);
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) floor.push(place(new THREE.BoxGeometry(W * 2 / n * (n > 1 ? 0.97 : 1), 0.2, D * 2 / n * (n > 1 ? 0.97 : 1)), { p: [-W + (i + 0.5) * W * 2 / n, -0.1, -D + (k + 0.5) * D * 2 / n] }));
    root.add(mesh(merge(floor), { part: "terrain", color: "#5d636d", ...METAL }));
    if (n > 1) root.add(at(mesh(new THREE.BoxGeometry(W * 2, 0.1, D * 2), { part: "terrain", color: "#23262b", castShadow: false }), [0, -0.22, 0]));
    const walls = [place(new THREE.BoxGeometry(W * 2, 9, 0.5), { p: [0, 4.5, -D] }), place(new THREE.BoxGeometry(0.5, 9, D * 2), { p: [-W, 4.5, 0] }), place(new THREE.BoxGeometry(0.5, 9, D * 2), { p: [W, 4.5, 0] })];
    root.add(mesh(merge(walls), { part: "architecture", color: "#7a818c", ...METAL }));
    if (tier >= 1) {
      const ribs = [];
      const rn = byTier(tier, [0, 6, 10, 16]);
      for (let i = 0; i <= rn; i++) {
        ribs.push(place(new THREE.BoxGeometry(0.4, 9, 0.6), { p: [-W + i * W * 2 / rn, 4.5, -D + 0.4] }));
        ribs.push(place(new THREE.BoxGeometry(0.6, 9, 0.4), { p: [-W + 0.4, 4.5, -D + i * D * 2 / rn] }));
      }
      root.add(mesh(merge(ribs), { part: "architecture", color: "#5b616b", ...METAL }));
      const walk = [place(new THREE.BoxGeometry(W * 2 - 1, 0.2, 2), { p: [0, 4, -D + 1.5] }), place(new THREE.BoxGeometry(W * 2 - 1, 0.08, 0.08), { p: [0, 5, -D + 2.4] })];
      if (tier >= 2) for (let i = 0; i < 16; i++) walk.push(place(new THREE.BoxGeometry(0.06, 1, 0.06), { p: [-W + 1 + i * (W * 2 - 2) / 15, 4.5, -D + 2.4] }));
      root.add(mesh(merge(walk), { part: "architecture", color: "#3a3f4a", ...METAL }));
    }
    const strips = [place(new THREE.BoxGeometry(W * 2 - 1, 0.06, 0.2), { p: [0, 0.03, -D + 1] }), place(new THREE.BoxGeometry(0.2, 0.06, D * 2 - 2), { p: [-W + 1, 0.03, 0] }), place(new THREE.BoxGeometry(0.2, 0.06, D * 2 - 2), { p: [W - 1, 0.03, 0] })];
    if (tier >= 2) for (const y of [2.5, 6.5]) strips.push(place(new THREE.BoxGeometry(W * 2 - 1, 0.12, 0.1), { p: [0, y, -D + 0.3] }));
    root.add(mesh(merge(strips), { part: "vfx", color: "#7df9ff", emissive: "#30e0ff", emissiveIntensity: 2.5, castShadow: false }));
    for (const [i, x] of [-6, 0, 6].entries()) {
      const l = practical({ color: "#cfe6ff", intensity: 18, distance: 14 });
      l.position.set(x, 7.5, -2 + i % 2 * 3);
      root.add(l);
    }
    root.add(at(ship(tier), [1, 0, -0.5], [0, -0.4, 0]));
    const hRng = rng.fork();
    for (const [i, [x, z]] of [[-7, -6], [7, 6], [-7, 4]].slice(0, count(2, density)).entries()) root.add(at(hologram(tier, { color: i % 2 ? "#ff7a1a" : "#30e0ff", seed: hRng() * 6 }), [x, 0, z]));
    const pRng = rng.fork();
    for (let i = 0; i < count(6, density); i++) {
      const p = [pRng.range(5, 10), 0, pRng.range(-10, -5)];
      root.add(at(i % 3 === 0 ? barrel(tier, { color: "#c8a03a" }) : crate(tier, { color: "#6b7480", size: 1 }), p, [0, pRng() * 3, 0]));
    }
    root.add(at(robot(tier, { part: "characters", seed: 1 }), [5, 0, 4], [0, -0.8, 0]));
    root.add(at(robot(tier, { part: "characters", body: "#3a3f4a", accent: "#30e0ff", seed: 3 }), [-5, 0, -3], [0, 0.7, 0]));
    root.add(at(knight(tier, { part: "hero", armor: "#5b7a46", cloth: "#2b2f36", seed: 2 }), [-3, 0, 9], [0, Math.PI * 0.92, 0]));
    return { root };
  }
};

// src/scenes/meadow.js
var meadow_default = {
  id: "meadow",
  name: "Meadow Shrine",
  inspiredBy: ["The Legend of Zelda: Breath of the Wild", "Ōkami", "Ghost of Tsushima"],
  genre: "open-world adventure",
  notes: "Foliage density vs. line noise: thousands of grass blades are the worst case for ink and toon bands. Watch whether the grass reads as a soft mass, and whether painterly looks hold up here.",
  shots: {
    hero: { label: "Third-person (to the shrine)", pos: [2.4, 3.2, 19], target: [0, 2.2, 3], fov: 50 },
    gameplay: { label: "Gameplay (third-person)", pos: [0.6, 2.6, 16.5], target: [0, 1.8, 6], fov: 58 },
    wide: { label: "Wide", pos: [34, 16, 34], target: [0, 2, 0], fov: 45 },
    close: { label: "Close-up (hero)", pos: [1.6, 1.9, 9.4], target: [0, 1.6, 12], fov: 38 }
  },
  defaultShot: "hero",
  focus: [0, 1.6, 12],
  shadow: { center: [0, 0, 3], radius: 24 },
  far: 900,
  params: {
    "lighting.key.elevation": 38,
    "lighting.key.azimuth": 70,
    "lighting.key.color": "#fff2dc",
    "lighting.key.intensity": 3,
    "lighting.ambient.sky": "#b8d4ff",
    "lighting.ambient.ground": "#6a7a4a",
    "lighting.ambient.intensity": 0.7,
    "atmosphere.sky.zenith": "#5b9be6",
    "atmosphere.sky.horizon": "#e3f0ff",
    "atmosphere.sky.ground": "#e3f0ff",
    "atmosphere.fog.color": "#e3f0ff"
  },
  build({ tier = 0, seed = 88, density = 1 } = {}) {
    const rng = createRng(seed);
    const root = group("meadow");
    const flat = (x, z) => Math.min(1, Math.max(0, (Math.abs(x) - 2.5) / 6)) * Math.min(1, Math.hypot(x, z + 4) / 10);
    const { mesh: ground, heightAt } = terrainPatch(tier, { w: 120, d: 120, amp: 4, scale: 0.035, seed: 9, color: "#8fbf5a", flat });
    root.add(ground);
    const on2 = (x, z, sink = 0) => [x, heightAt(x, z) - sink, z];
    const path = terrainPatch(tier, { w: 3, d: 26, amp: 0, color: "#c9b48a" }).mesh;
    path.position.set(0, 0.03, 6);
    root.add(path);
    root.add(at(gate(tier, { width: 4.2, height: 4.6 }), on2(0, 0)));
    root.add(at(house(tier, { wall: "#efe3cf", roof: "#7a2e2a", trim: "#5b3b22", door: "#5b3b22" }), on2(0, -8), [0, 0, 0], 1.1));
    for (const [i, [x, z]] of [[-2.6, 3], [2.6, 3], [-2.6, 8], [2.6, 8]].entries()) root.add(at(stoneLantern(tier, { light: false, seed: i }), on2(x, z)));
    root.add(at(pond(tier, rng.fork(), { radius: 3, color: "#5aa0c8" }), on2(9, 6, 0.1)));
    const avoid = (x, z) => Math.abs(x) < 2 || Math.hypot(x - 9, z - 6) < 3.4 || Math.hypot(x, z + 6) < 5;
    const field = grass(tier, rng.fork(), { w: 36, d: 30, perSquareMeter: 7 * density, color: "#86b84e", height: 0.55, avoid });
    field.position.set(0, 0, 4);
    const pos = field.geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + heightAt(pos.getX(i), pos.getZ(i) + 4));
    field.geometry.computeVertexNormals();
    root.add(field);
    const fRng = rng.fork();
    for (let i = 0; i < count(5, density); i++) {
      const x = fRng.pick([-1, 1]) * fRng.range(4, 14), z = fRng.range(-4, 16);
      root.add(at(flowers(tier, fRng.fork(), { w: 2.5, d: 2, n: 14, colors: ["#f7f3e8", "#f4a7b9", "#ffd86b"] }), on2(x, z)));
    }
    const tRng = rng.fork();
    for (let i = 0; i < count(12, density); i++) {
      const a = tRng() * Math.PI * 2, r = tRng.range(14, 32);
      const x = Math.cos(a) * r, z = Math.sin(a) * r - 2;
      const t = tRng() < 0.65 ? pine(tier, tRng.fork(), { height: tRng.range(5, 9) }) : tree(tier, tRng.fork(), { height: tRng.range(3.5, 5), leaf: "#f2b6c6", trunk: "#5b3b22" });
      root.add(at(t, on2(x, z, 0.2)));
    }
    const rRng = rng.fork();
    for (let i = 0; i < count(6, density); i++) {
      const x = rRng.pick([-1, 1]) * rRng.range(4, 18), z = rRng.range(-10, 18);
      root.add(at(rock(tier, rRng.range(0.6, 1.6), rRng.fork(), { part: "terrain" }), on2(x, z, 0.3), [0, rRng() * 6, 0]));
    }
    const mRng = rng.fork();
    root.add(at(ridge(tier, mRng.fork(), { width: 420, height: 60, color: "#6f86a8", peaks: 6 }), [0, 0, -260]));
    root.add(at(ridge(tier, mRng.fork(), { width: 300, height: 34, color: "#5e7d63", peaks: 8 }), [30, 0, -150]));
    root.add(at(character(tier, { part: "hero", shirt: "#2f4a7a", pants: "#3b2f2a", hat: "#c9a45a", seed: 1 }), on2(0, 12), [0, Math.PI, 0]));
    return { root };
  }
};

// src/scenes/campsite.js
var campsite_default = {
  id: "campsite",
  name: "Dusk Campsite",
  inspiredBy: ["Firewatch", "A Short Hike"],
  genre: "narrative exploration",
  notes: "Layered silhouettes: four ridges at increasing distance should separate by value and color, which is what fog bands are for. Watch the campfire against the sunset, and whether warm and cool light both read.",
  shots: {
    hero: { label: "Third-person (past the fire)", pos: [-6.5, 2.5, 8.5], target: [1, 1.6, -4], fov: 52 },
    gameplay: { label: "Gameplay (third-person)", pos: [-4, 3.2, 10.5], target: [0, 1.2, 0], fov: 58 },
    wide: { label: "Wide (the ridges)", pos: [0, 9, 22], target: [0, 6, -60], fov: 45 },
    close: { label: "Close-up (campfire)", pos: [-1.6, 1.4, 3.2], target: [0, 0.6, 0], fov: 40 }
  },
  defaultShot: "hero",
  focus: [0, 0.6, 0],
  shadow: { center: [0, 0, -2], radius: 18 },
  far: 1200,
  params: {
    "lighting.key.elevation": 7,
    "lighting.key.azimuth": 165,
    "lighting.key.color": "#ff9a55",
    "lighting.key.intensity": 2.4,
    "lighting.ambient.sky": "#6a5a9a",
    "lighting.ambient.ground": "#3a2a30",
    "lighting.ambient.intensity": 0.55,
    "atmosphere.sky.zenith": "#2b2a5e",
    "atmosphere.sky.horizon": "#ff9a6a",
    "atmosphere.sky.ground": "#ff9a6a",
    "atmosphere.fog.color": "#c77a8a"
  },
  // Look zones (§6.10): the fire warms the grade; the lakeshore is cool and misty.
  zones: [
    {
      id: "fireside",
      label: "By the fire",
      lookName: "Firelight",
      shape: "sphere",
      center: [0, 0.5, 0],
      radius: 2.5,
      blend: 4,
      priority: 1,
      params: { "grade.temperature": 0.45, "grade.exposure": 0.3, "grade.saturation": 1.15, "lighting.practicals.intensity": 1.8 }
    },
    {
      id: "lakeshore",
      label: "Lakeshore",
      lookName: "Cool mist",
      shape: "sphere",
      center: [14, 0.5, -10],
      radius: 8,
      blend: 4,
      priority: 0,
      params: { "grade.temperature": -0.35, "grade.saturation": 0.85, "atmosphere.fog.density": 0.02 }
    }
  ],
  build({ tier = 0, seed = 99, density = 1 } = {}) {
    const rng = createRng(seed);
    const root = group("campsite");
    const flat = (x, z) => Math.min(1, Math.hypot(x, z) / 9);
    const { mesh: ground, heightAt } = terrainPatch(tier, { w: 140, d: 140, amp: 2.5, scale: 0.05, seed: 4, color: "#6b5a3e", flat });
    root.add(ground);
    const on2 = (x, z, sink = 0) => [x, heightAt(x, z) - sink, z];
    root.add(at(pond(tier, rng.fork(), { radius: 9, color: "#4b5f8a" }), on2(14, -10, 0.25)));
    root.add(at(tent(tier, { color: "#e67e22" }), on2(3.5, -3), [0, -0.6, 0]));
    root.add(at(campfire(tier, { seed: 1 }), on2(0, 0)));
    for (const [x, z, r] of [[-1.6, 0.4, 1.4], [1.2, 1.5, 0.3]]) {
      const log = mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.8, byTier(tier, [8, 8, 16, 24])), { part: "props", color: "#6d4a2d" });
      log.rotation.set(0, r, Math.PI / 2);
      log.position.set(...on2(x, z)).y += 0.2;
      root.add(log);
    }
    const lantern2 = practical({ color: "#ffd27a", intensity: 3, distance: 6, flicker: 0.2, seed: 3 });
    lantern2.position.set(3, heightAt(3, -1.2) + 0.6, -1.2);
    root.add(lantern2);
    const pRng = rng.fork();
    for (let i = 0; i < count(14, density); i++) {
      const a = pRng.range(-Math.PI * 0.9, Math.PI * 0.2), r = pRng.range(8, 26);
      root.add(at(pine(tier, pRng.fork(), { height: pRng.range(6, 11), color: "#24402f" }), on2(Math.cos(a) * r, Math.sin(a) * r - 4, 0.2)));
    }
    const rRng = rng.fork();
    for (let i = 0; i < count(4, density); i++) root.add(at(rock(tier, rRng.range(0.5, 1.2), rRng.fork(), { part: "terrain" }), on2(rRng.range(-7, 7), rRng.range(-7, 3), 0.2), [0, rRng() * 6, 0]));
    const mRng = rng.fork();
    const layers = [[60, 14, "#3b2e4a"], [120, 26, "#5a3f5e"], [210, 44, "#86566e"], [330, 70, "#b67a80"]];
    for (const [dist, h, color] of layers) root.add(at(ridge(tier, mRng.fork(), { width: dist * 3.2, height: h, color, peaks: 7 }), [mRng.range(-20, 20), -2, -dist]));
    root.add(at(character(tier, { part: "hero", shirt: "#c0392b", pants: "#3b4a6b", hat: "#2e4057", seed: 2 }), on2(-2.2, 1.6), [0, 2.2, 0]));
    return { root };
  }
};

// src/scenes/toybox.js
var SPARE_BALLS = 12;
var PALETTE = ["#e8554e", "#f2b134", "#4fb3a9", "#4a7fd6", "#9b6bd6", "#f28fb1"];
var toybox_default = {
  id: "toybox",
  name: "Physics Toybox",
  inspiredBy: ["Physics sandboxes such as Gang Beasts", "Toy blocks"],
  genre: "physics sandbox",
  notes: "Everything here moves. Click (or RT) to throw a ball, walk in with Tab or L3 and push the towers over. Watch lines, dither and screen patterns on moving objects: they should hold steady, not crawl.",
  shots: {
    hero: { label: "Hero", pos: [9, 7.5, 12], target: [0, 1, 0], fov: 45 },
    gameplay: { label: "Gameplay (third-person)", pos: [0, 4.5, 11], target: [0, 1.2, 2], fov: 55 },
    wide: { label: "Wide", pos: [16, 15, 18], target: [0, 0, 0], fov: 45 },
    close: { label: "Close-up (towers)", pos: [3.5, 2.4, 5.5], target: [-1, 1.2, -1.5], fov: 40 }
  },
  defaultShot: "hero",
  focus: [0, 1, 0],
  shadow: { center: [0, 0, 0], radius: 13 },
  far: 400,
  params: {
    "lighting.key.elevation": 52,
    "lighting.key.azimuth": 35,
    "lighting.key.color": "#fff6ea",
    "lighting.key.intensity": 2.8,
    "lighting.ambient.sky": "#d8e6ff",
    "lighting.ambient.ground": "#6a6260",
    "lighting.ambient.intensity": 0.75,
    "atmosphere.sky.zenith": "#6ea6e8",
    "atmosphere.sky.horizon": "#e2eefa",
    "atmosphere.sky.ground": "#e2eefa",
    "atmosphere.fog.color": "#e2eefa"
  },
  /** Balls that can be thrown (click or RT); they sleep out of sight until then. */
  spareBalls: SPARE_BALLS,
  build({ tier = 0, seed = 5, density = 1 } = {}) {
    const rng = createRng(seed);
    const root = group("toybox");
    const S = 9;
    const matG = new THREE.BoxGeometry(S * 2, 0.4, S * 2);
    root.add(at(mesh(matG, { part: "terrain", color: "#9fc88a", castShadow: false }), [0, -0.2, 0]));
    for (const [x, z, w, d] of [[0, -S, S * 2 + 0.6, 0.3], [0, S, S * 2 + 0.6, 0.3], [-S, 0, 0.3, S * 2], [S, 0, 0.3, S * 2]]) {
      root.add(at(box(tier, [w, 0.6, d], { part: "architecture", color: "#e8dcc8" }), [x, 0.3, z]));
    }
    const wedge = (w, h, d) => {
      const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(d, 0), new THREE.Vector2(d, h)]);
      const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
      g.translate(-d / 2, 0, -w / 2);
      g.rotateY(Math.PI / 2);
      return g;
    };
    root.add(at(mesh(wedge(2.4, 1.2, 4), { part: "architecture", color: "#f2b134" }), [5, 0, 2]));
    root.add(at(mesh(wedge(2.4, 0.8, 3), { part: "architecture", color: "#4fb3a9" }), [-5.5, 0, 4], [0, Math.PI, 0]));
    root.add(at(box(tier, [3, 1.2, 3], { part: "architecture", color: "#e8dcc8" }), [5, 0.6, -1.3]));
    const dyn = (object, physics) => {
      object.userData.physics = physics;
      root.add(object);
      return object;
    };
    const s = 0.7;
    const towers = [[-2, -2], [0.5, -3], [-4.5, -1]].slice(0, Math.min(3, count(2, density) + 1));
    for (const [ti, [x, z]] of towers.entries()) {
      for (let level = 0; level < 5; level++) {
        const color = PALETTE[(ti * 2 + level) % PALETTE.length];
        dyn(at(beveledBox(tier, s, { part: "props", color }), [x + (rng() - 0.5) * 0.04, s / 2 + level * s, z], [0, rng() * 0.2, 0]), { shape: "box", size: [s, s, s], density: 0.6 });
      }
    }
    for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row; i++) {
      dyn(at(box(tier, [1, 0.5, 0.5], { part: "props", color: PALETTE[(row + i) % PALETTE.length] }), [2 + i * 1.02 + row * 0.51 - 1.5, 0.25 + row * 0.5, 3.5]), { shape: "box", size: [1, 0.5, 0.5], density: 0.5 });
    }
    for (let i = 0; i < count(3, density); i++) {
      const r = 0.35 + rng() * 0.25;
      dyn(at(sphere(tier, r, { part: "props", color: PALETTE[i % PALETTE.length] }), [-3 + i * 1.6, r + 0.01, 5.5]), { shape: "ball", radius: r, density: 0.3, restitution: 0.5 });
    }
    for (let i = 0; i < SPARE_BALLS; i++) {
      const ball = sphere(tier, 0.28, { part: "props", color: PALETTE[i % PALETTE.length] });
      ball.visible = false;
      dyn(at(ball, [-8 + i * 0.7, -5, -8]), { shape: "ball", radius: 0.28, density: 1.2, restitution: 0.45, spare: true });
    }
    root.add(at(cylinder(tier, 0.25, 1.6, { part: "props", color: "#e8554e" }), [-6.5, 0.8, -6.5]));
    root.add(at(cylinder(tier, 0.25, 1.6, { part: "props", color: "#4a7fd6" }), [6.5, 0.8, 6.5]));
    root.add(at(character(tier, { part: "hero", shirt: "#e8554e", pants: "#3b4a6b", hat: "#f2b134", seed: 3 }), [0, 0, 3], [0, Math.PI, 0]));
    root.add(at(character(tier, { part: "characters", shirt: "#4fb3a9", pants: "#5a4a6b", seed: 6 }), [-6, 0, 1], [0, 1.2, 0]));
    return { root };
  }
};

// src/scenes/index.js
var countMeshes = (root) => {
  let n = 0;
  root.traverse((o) => {
    if (o.isMesh) n++;
  });
  return n;
};
var SCENES = [harbor_default, lookdev_default, garden_default, plaza_default, dungeon_default, kart_default, platforms_default, hangar_default, meadow_default, campsite_default, toybox_default];
var DENSITY = { min: 0.5, max: 4, default: 1 };
var sceneById = new Map(SCENES.map((s) => [s.id, s]));
function buildScene(scene, { tier = 0, seed, density = 1 } = {}) {
  const { root } = scene.build({ tier, seed, density });
  const animators = [];
  root.traverse((o) => {
    if (o.userData.animate) animators.push(o.userData.animate);
  });
  return {
    root,
    triangles: countTriangles(root),
    objects: countMeshes(root),
    animate: (t) => {
      for (const a of animators) a(t);
    }
  };
}
export {
  DENSITY,
  THREE,
  TIERS,
  at,
  barrel,
  bench,
  beveledBox,
  block,
  boat,
  box,
  buildScene,
  building,
  byTier,
  campfire,
  character,
  chest,
  cloud,
  coin,
  colorChart,
  count,
  countTriangles,
  crate,
  createRng,
  cylinder,
  displace,
  dock,
  faceted,
  fbm,
  fence,
  flowers,
  gate,
  goose,
  grass,
  grayCard,
  group,
  hedge,
  hill,
  hillHeight,
  hologram,
  house,
  kart,
  knight,
  lampPost,
  lantern,
  lava,
  lighthouse,
  merge,
  mesh,
  noise3,
  pillar,
  pine,
  pipe,
  place,
  pond,
  practical,
  rail,
  ramp,
  ridge,
  ring,
  robot,
  rock,
  sceneById,
  SCENES as scenes,
  sea,
  ship,
  skater,
  sphere,
  stairs,
  stands,
  stoneLantern,
  tent,
  terrainPatch,
  tireStack,
  torch,
  torusKnot,
  trafficCone,
  trashCan,
  tree,
  wall,
  well
};
