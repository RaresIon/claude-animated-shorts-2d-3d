// Prop library: small, recognisable, inked 3D objects with painted textures. Compose them to dress a set.
// Every builder returns a THREE.Group with its base at y = 0, centred on x/z, facing +z (toward the usual camera).
// Rule of the kit: a set is not done until every third of the frame holds something with a name.
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { INK, V3, rng, shade } from "./util";
import { blob, flat, planks, sign } from "./paint";

// ---------------------------------------------------------------- ink (inverted hull, constant width on screen)
export const INK_W = { value: 0.0021 }; // fraction of view distance; ~4.5 px at 1080x1920, fov 40
const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, fog: true });
inkMat.onBeforeCompile = (s) => {
  s.uniforms.uInk = INK_W;
  s.vertexShader = "uniform float uInk;\n" + s.vertexShader.replace("#include <project_vertex>",
    `vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
     mvPosition.xyz += normalize(normalMatrix * normal) * uInk * max(1.5, -mvPosition.z);
     gl_Position = projectionMatrix * mvPosition;`);
};
const hullCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
const hullGeo = (g: THREE.BufferGeometry) => {
  let h = hullCache.get(g);
  if (!h) { const c = g.clone(); c.deleteAttribute("normal"); c.deleteAttribute("uv"); h = mergeVertices(c, 1e-3); h.computeVertexNormals(); hullCache.set(g, h); }
  return h;
};
export const lit = (map: THREE.Texture | string) => new THREE.MeshLambertMaterial(typeof map === "string" ? { map: flat(map) } : { map });
export const glow = (c: string) => new THREE.MeshBasicMaterial({ color: c, fog: false });

/** a mesh plus its ink outline */
export const inked = (geo: THREE.BufferGeometry, mat: THREE.Material, ink = true) => {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m);
  if (ink) g.add(new THREE.Mesh(hullGeo(geo), inkMat));
  return g;
};
const at = <T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
export const put = at;
export const group = (...kids: THREE.Object3D[]) => { const g = new THREE.Group(); kids.forEach((k) => g.add(k)); return g; };

type Skin = THREE.Texture | string;
export const box = (w: number, h: number, d: number, m: Skin, ink = true) => { const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, h / 2, 0); return inked(geo, lit(m), ink); };
export const cyl = (rt: number, rb: number, h: number, m: Skin, seg = 14, ink = true) => { const geo = new THREE.CylinderGeometry(rt, rb, h, seg); geo.translate(0, h / 2, 0); return inked(geo, lit(m), ink); };
export const ball = (r: number, m: Skin, sy = 1, ink = true) => { const geo = new THREE.SphereGeometry(r, 14, 10); geo.scale(1, sy, 1); geo.translate(0, r * sy, 0); return inked(geo, lit(m), ink); };
/** flat card (decals, posters, rugs, light pools). Vertical by default; `floor` lays it on the ground. */
export const card = (w: number, h: number, tex: THREE.Texture, opts: { floor?: boolean; unlit?: boolean; add?: boolean; opacity?: number } = {}) => {
  const M = opts.unlit || opts.add ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial;
  const m = new M({ map: tex, transparent: true, depthWrite: false, opacity: opts.opacity ?? 1, blending: opts.add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !opts.add });
  const geo = new THREE.PlaneGeometry(w, h);
  if (opts.floor) geo.rotateX(-Math.PI / 2); else geo.translate(0, h / 2, 0);
  const mesh = new THREE.Mesh(geo, m); mesh.renderOrder = 2;
  return mesh;
};
/** soft dark contact shadow under a prop */
export const contact = (w: number, d: number, a = 0.42) => at(card(w, d, blob("#120a1c"), { floor: true, unlit: true, opacity: a }), 0, 0.012, 0);
/** pool of light on a floor or wall */
export const lightPool = (w: number, d: number, c = "#ffd98a", a = 0.55, floor = true) => card(w, d, blob(c), { floor, add: true, opacity: a });

// ---------------------------------------------------------------- containers
export const crate = (s = 0.7, label?: string, wood = "#c98a4b") => {
  const g = group(box(s, s, s, planks(wood, 4)), contact(s * 1.5, s * 1.5));
  const t = 0.07 * s; // corner battens
  for (const [x, z] of [[-1, 1], [1, 1]]) g.add(at(box(t * 1.6, s, t, shade(wood, 0.72), false), x * (s / 2 - t * 0.8), 0, z * (s / 2 + t * 0.2)));
  g.add(at(box(s, t * 1.6, t, shade(wood, 0.72), false), 0, 0, s / 2 + t * 0.2), at(box(s, t * 1.6, t, shade(wood, 0.72), false), 0, s - t * 1.6, s / 2 + t * 0.2));
  if (label) g.add(at(card(s * 0.74, s * 0.4, sign(`crate${label}`, 384, 208, "#00000000", [{ t: label, size: 120, y: 104, col: "#3a2414" }], "#00000000")), 0, s * 0.3, s / 2 + 0.012));
  return g;
};
export const barrel = (h = 0.9, wood = "#a9713c") => {
  const g = group(contact(h * 1.1, h * 1.1));
  const pts = [0.3, 0.37, 0.4, 0.37, 0.3].map((r, i) => new THREE.Vector2(r * h, (i / 4) * h));
  g.add(inked(new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...pts, new THREE.Vector2(0, h)], 14), lit(planks(wood, 8, true))));
  for (const y of [0.2, 0.8]) g.add(at(cyl(0.375 * h, 0.375 * h, 0.05 * h, "#4c4a52", 14, false), 0, y * h, 0));
  return g;
};
export const sack = (h = 0.6, c = "#c9b48a") => {
  const g = group(contact(h * 1.2, h * 1.2), ball(h * 0.42, c, 1.15));
  g.add(at(cyl(0.05 * h, 0.12 * h, 0.2 * h, shade(c, 0.9), 8), 0, h * 0.88, 0), at(cyl(0.09 * h, 0.09 * h, 0.04 * h, "#7a5a36", 8, false), 0, h * 0.9, 0));
  return g;
};
export const basket = (r = 0.3, c = "#c79a52") => group(contact(r * 2.6, r * 2.6), cyl(r, r * 0.75, r * 1.1, c, 12), at(cyl(r * 1.06, r * 1.06, r * 0.14, shade(c, 0.75), 12, false), 0, r * 1.02, 0));
export const cage = (w = 0.8, h = 0.5, d = 0.5) => {
  const g = group(contact(w * 1.4, d * 1.6), box(w, 0.05, d, "#6b4a2d"), at(box(w, 0.05, d, "#6b4a2d"), 0, h, 0));
  for (let i = 0; i <= 8; i++) for (const z of [-d / 2, d / 2]) g.add(at(cyl(0.012, 0.012, h, "#3a3540", 5, false), -w / 2 + (i / 8) * w, 0.03, z));
  return g;
};

// ---------------------------------------------------------------- furniture
export const desk = (w = 2.2, wood = "#8a5530") => {
  const g = group(contact(w * 1.25, 1.7, 0.5), at(box(w, 0.09, 1, shade(wood, 1.15)), 0, 0.86, 0));
  g.add(at(box(w * 0.94, 0.8, 0.9, planks(wood, 3, true)), 0, 0.06, -0.02));
  for (const x of [-0.3, 0.3]) for (const y of [0.22, 0.52]) { // drawers with brass knobs
    g.add(at(box(w * 0.24, 0.24, 0.03, shade(wood, 1.08)), x * w, y, 0.44), at(ball(0.035, "#e2b84a", 1, false), x * w, y + 0.085, 0.48));
  }
  return g;
};
export const chair = (wood = "#7a4a28") => {
  const g = group(contact(0.9, 0.9), at(box(0.5, 0.06, 0.5, wood), 0, 0.48, 0), at(box(0.5, 0.7, 0.06, planks(wood, 3, true)), 0, 0.54, -0.22));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(at(box(0.06, 0.48, 0.06, shade(wood, 0.85), false), x * 0.2, 0, z * 0.2));
  return g;
};
export const table = (w = 1.2, d = 0.8, h = 0.75, wood = "#9a6a3c") => {
  const g = group(contact(w * 1.3, d * 1.5), at(box(w, 0.07, d, planks(wood, 4)), 0, h - 0.07, 0));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(at(box(0.07, h - 0.07, 0.07, shade(wood, 0.8), false), x * (w / 2 - 0.08), 0, z * (d / 2 - 0.08)));
  return g;
};
/** shelf unit packed with books, jars and boxes: the fastest way to fill a wall */
export const shelf = (w = 1.6, h = 2.1, seed = 1, wood = "#7a4a28") => {
  const r = rng(seed), g = group(box(w, h, 0.34, shade(wood, 0.7)), contact(w * 1.2, 0.9));
  const rows = Math.round(h / 0.5);
  for (let i = 0; i < rows; i++) {
    const y = 0.08 + (i / rows) * (h - 0.1);
    g.add(at(box(w - 0.08, 0.04, 0.36, wood, false), 0, y, 0.01));
    let x = -w / 2 + 0.1;
    while (x < w / 2 - 0.14) {
      const k = r();
      if (k < 0.6) { const bw = 0.05 + r() * 0.05, bh = 0.24 + r() * 0.14; g.add(at(box(bw, bh, 0.22, ["#b9483c", "#3d6a8a", "#d9a441", "#4f7a4a", "#6a4a7a", "#e8e2d2"][Math.floor(r() * 6)], false), x + bw / 2, y + 0.04, 0.08, 0, 0, r() < 0.12 ? 0.25 : 0)); x += bw + 0.008; }
      else if (k < 0.8) { g.add(at(cyl(0.07, 0.07, 0.2, ["#9fd0c8", "#e8c66a", "#c9d7e8"][Math.floor(r() * 3)], 8), x + 0.08, y + 0.04, 0.08), at(cyl(0.05, 0.05, 0.03, "#7a5a36", 8, false), x + 0.08, y + 0.24, 0.08)); x += 0.19; }
      else { g.add(at(box(0.2, 0.14 + r() * 0.1, 0.2, planks("#c9a06a", 3)), x + 0.11, y + 0.04, 0.08)); x += 0.25; }
    }
  }
  return g;
};
export const rug = (w = 2.4, d = 1.5, a = "#a83a3a", b = "#e8c66a") => at(card(w, d, sign(`rug${a}${b}`, 512, 320, a, [], b, (g) => {
  g.strokeStyle = b; g.lineWidth = 8; g.strokeRect(36, 36, 440, 248);
  for (let i = 0; i < 5; i++) { g.save(); g.translate(96 + i * 80, 160); g.rotate(Math.PI / 4); g.strokeRect(-26, -26, 52, 52); g.restore(); }
}), { floor: true }), 0, 0.01, 0);

// ---------------------------------------------------------------- desk dressing
export const papers = (n = 5, seed = 1) => { const r = rng(seed), g = group(); for (let i = 0; i < n; i++) g.add(at(box(0.22, 0.012, 0.3, i % 3 ? "#f3ead2" : "#e3d6b4", i === n - 1), -0.02 + r() * 0.04, i * 0.012, -0.02 + r() * 0.04, r() * 0.5 - 0.25)); return g; };
export const book = (c = "#b9483c") => group(box(0.26, 0.06, 0.34, c), at(box(0.24, 0.045, 0.32, "#f3ead2", false), 0.012, 0.008, 0));
export const inkwell = () => group(cyl(0.05, 0.06, 0.07, "#27304a", 8), at(cyl(0.008, 0.004, 0.3, "#f3ead2", 5, false), 0.02, 0.05, 0, 0, 0, -0.4));
export const stamp = () => group(cyl(0.05, 0.06, 0.05, "#6b4a2d", 8), at(cyl(0.025, 0.03, 0.09, "#b9483c", 8), 0, 0.05, 0), at(ball(0.04, "#b9483c"), 0, 0.12, 0));
export const coin = (r = 0.07) => cyl(r, r, r * 0.22, "#f2c230", 12);
export const coinStack = (n = 6, r = 0.07, seed = 1) => { const q = rng(seed), g = group(); for (let i = 0; i < n; i++) g.add(at(coin(r), (q() - 0.5) * r * 0.25, i * r * 0.22, (q() - 0.5) * r * 0.25)); return g; };
export const scales = () => {
  const g = group(cyl(0.1, 0.13, 0.04, "#c9a03a", 10), cyl(0.015, 0.015, 0.5, "#c9a03a", 6, false), at(box(0.6, 0.025, 0.025, "#c9a03a"), 0, 0.48, 0));
  for (const x of [-0.28, 0.28]) g.add(at(cyl(0.004, 0.004, 0.22, INK, 4, false), x, 0.26, 0), at(cyl(0.11, 0.06, 0.035, "#e2b84a", 10), x, 0.23, 0));
  return g;
};
export const bell = () => group(cyl(0.04, 0.1, 0.09, "#e2b84a", 10), at(ball(0.02, "#e2b84a", 1, false), 0, 0.09, 0));
export const mug = (c = "#e8e2d2") => group(cyl(0.05, 0.045, 0.1, c, 10), at(cyl(0.04, 0.04, 0.005, "#5a3420", 10, false), 0, 0.098, 0));
export const candle = () => group(cyl(0.07, 0.08, 0.02, "#c9a03a", 8), cyl(0.025, 0.025, 0.16, "#f3ead2", 8), at(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6).scale(0.8, 1.6, 0.8), glow("#ffd75a")), 0, 0.2, 0), at(lightPool(0.9, 0.9, "#ffcf6a", 0.5), 0, 0.01, 0));

// ---------------------------------------------------------------- walls: windows, doors, pictures, lamps
export const windowLit = (w = 1.1, h = 1.5, pane = "#bfe3f5", frame = "#6b4a2d", shutters?: string) => {
  const g = group(box(w + 0.16, h + 0.16, 0.08, frame), at(new THREE.Mesh(new THREE.PlaneGeometry(w, h), glow(pane)), 0, h / 2 + 0.08, 0.045));
  g.add(at(box(0.05, h, 0.03, frame, false), 0, 0.08, 0.05), at(box(w, 0.05, 0.03, frame, false), 0, h * 0.55, 0.05), at(box(w + 0.34, 0.07, 0.2, shade(frame, 1.15)), 0, -0.02, 0.06));
  if (shutters) for (const s of [-1, 1]) g.add(at(box(w * 0.46, h + 0.1, 0.05, planks(shutters, 7)), s * (w * 0.75 + 0.06), 0.03, 0.03, s * -0.25));
  return g;
};
export const door = (w = 1, h = 2.05, c = "#5d7a4a") => {
  const g = group(box(w + 0.18, h + 0.1, 0.1, shade(c, 0.6)), at(box(w, h, 0.06, planks(c, 4, true)), 0, 0, 0.05));
  g.add(at(box(w * 0.7, h * 0.3, 0.02, shade(c, 1.12)), 0, h * 0.58, 0.085), at(box(w * 0.7, h * 0.36, 0.02, shade(c, 1.12)), 0, h * 0.1, 0.085), at(ball(0.045, "#e2b84a"), w * 0.36, h * 0.47, 0.11));
  return g;
};
/** marks a lettered card inside a set so plan_lint can find it, project it and judge whether it can be read */
const lettered = <T extends THREE.Object3D>(o: T, w: number, h: number, tex: THREE.Texture) => { const s = tex.userData.sign as { h: number; lines: { t: string; size: number }[] } | undefined; if (s) o.userData.sign = { w, h, texH: s.h, lines: s.lines }; return o; };
export const framed = (w: number, h: number, tex: THREE.Texture, frame = "#c9a03a") => group(box(w + 0.12, h + 0.12, 0.05, frame), at(lettered(card(w, h, tex), w, h, tex), 0, 0.06, 0.03));
export const poster = (w: number, h: number, tex: THREE.Texture, tilt = 0) => at(lettered(card(w, h, tex), w, h, tex), 0, 0, 0.012, 0, 0, tilt);
/** hanging lamp: cord, shade, glowing bulb, and the pool of light it throws on the floor `drop` below */
export const lampHang = (drop = 2.6, cord = 0.7, c = "#3d6a5a", pool = 3.2) => {
  const g = group(at(cyl(0.012, 0.012, cord, INK, 4, false), 0, -cord, 0), at(cyl(0.06, 0.34, 0.2, c, 12), 0, -cord - 0.2, 0));
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glow("#fff1b8")), 0, -cord - 0.2, 0));
  g.add(at(card(1.5, 1.5, blob("#ffd98a"), { add: true, opacity: 0.5 }), 0, -cord - 0.95, 0.02), at(lightPool(pool, pool, "#ffcf7a", 0.5), 0, -drop + 0.015, 0));
  return g;
};
export const lantern = (lit_ = true) => {
  const g = group(cyl(0.09, 0.11, 0.03, "#3a3540", 8), at(cyl(0.11, 0.05, 0.07, "#3a3540", 8), 0, 0.25, 0));
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.22, 8), glow(lit_ ? "#ffd75a" : "#6a6a5a")), 0, 0.14, 0));
  for (let i = 0; i < 4; i++) g.add(at(cyl(0.008, 0.008, 0.22, INK, 4, false), Math.cos(i * 1.57) * 0.085, 0.03, Math.sin(i * 1.57) * 0.085));
  if (lit_) g.add(at(card(1.8, 1.8, blob("#ffc94a"), { add: true, opacity: 0.55 }), 0, -0.75, 0.05), at(lightPool(3.4, 3.4, "#ffb84a", 0.55), 0, 0.02, 0));
  return g;
};
export const streetLamp = (h = 3.4, on = false) => {
  const g = group(contact(0.8, 0.8), cyl(0.09, 0.13, 0.4, "#2f3a44", 8), cyl(0.045, 0.06, h, "#2f3a44", 8), at(box(0.34, 0.06, 0.34, "#2f3a44"), 0, h, 0), at(cyl(0.02, 0.2, 0.16, "#2f3a44", 4), 0, h + 0.4, 0, 0.78));
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.26), glow(on ? "#ffe08a" : "#dfe9ec")), 0, h + 0.22, 0));
  if (on) g.add(at(card(2.6, 2.6, blob("#ffcf6a"), { add: true, opacity: 0.6 }), 0, h - 1.1, 0.1), at(lightPool(5, 5, "#ffc35a", 0.5), 0, 0.02, 0.4));
  return g;
};

// ---------------------------------------------------------------- street and town
export const awning = (w = 2.2, a = "#b9483c", b = "#f3ead2") => {
  const t = sign(`awn${a}${b}`, 256, 128, a, [], a, (g) => { g.fillStyle = b; for (let i = 0; i < 4; i++) g.fillRect(i * 64 + 32, 0, 32, 128); });
  const geo = new THREE.BoxGeometry(w, 0.05, 1.1); geo.translate(0, 0, 0.55);
  const g = group(at(inked(geo, lit(t)), 0, 0, 0, 0, 0.42));
  for (const s of [-1, 1]) g.add(at(cyl(0.02, 0.02, 1.1, INK, 4, false), s * (w / 2 - 0.05), -0.52, 1.0, 0, 0, 0));
  return g;
};
/** a house front, `w` wide and `floors` storeys high, with door, lit or day windows, shutters, cornice, balcony */
export const facade = (w = 5, floors = 2, wall: THREE.Texture | string = "#e9d9b0", opts: { shutters?: string; door?: string; pane?: string; roof?: string; balcony?: boolean; shop?: string; seed?: number } = {}) => {
  const fh = 3.1, h = floors * fh, g = group(at(box(w, h, 0.5, wall), 0, 0, -0.25));
  const pane = opts.pane ?? "#9fc9e0", sh = opts.shutters ?? "#3d6a5a", n = Math.max(2, Math.round(w / 2));
  g.add(at(box(w + 0.3, 0.26, 0.7, opts.roof ?? "#b9624a"), 0, h, -0.22), at(box(w + 0.12, 0.14, 0.6, shade(typeof wall === "string" ? wall : "#e9d9b0", 0.82)), 0, fh - 0.07, -0.24), at(box(w + 0.1, 0.42, 0.56, "#8a8590"), 0, 0, -0.22));
  for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) {
    const x = -w / 2 + ((i + 0.5) / n) * w;
    if (f === 0 && i === Math.floor(n / 2)) { g.add(at(door(1, 2.1, opts.door ?? "#5d7a4a"), x, 0.2, 0), at(box(1.5, 0.2, 0.5, "#a9a4ae"), x, 0, 0.2)); continue; }
    g.add(at(windowLit(0.9, 1.35, pane, "#f3ead2", sh), x, f * fh + 1.05, 0));
    if (f > 0 && opts.balcony) { g.add(at(box(1.5, 0.08, 0.5, "#8a8590"), x, f * fh + 0.95, 0.25)); for (let k = 0; k <= 6; k++) g.add(at(cyl(0.015, 0.015, 0.5, INK, 4, false), x - 0.7 + k * 0.233, f * fh + 1, 0.48)); g.add(at(box(1.5, 0.04, 0.04, INK, false), x, f * fh + 1.5, 0.48)); }
  }
  if (opts.shop) { g.add(at(awning(w * 0.42), -w * 0.24, 2.75, 0.02), at(poster(w * 0.36, 0.5, sign(`shop${opts.shop}`, 512, 150, "#27304a", [{ t: opts.shop, size: 92, y: 80, col: "#f2c230" }], "#f2c230")), -w * 0.24, 2.85, 0.0)); }
  return g;
};
export const bunting = (w = 6, n = 9, cols = ["#3d5fa8", "#f3ead2", "#c8413a"]) => {
  const g = group();
  for (let i = 0; i < n; i++) { const u = i / (n - 1), y = -0.5 * Math.sin(Math.PI * u), geo = new THREE.ConeGeometry(0.2, 0.42, 3, 1); geo.rotateX(Math.PI); geo.scale(1, 1, 0.15);
    g.add(at(inked(geo, lit(cols[i % cols.length])), (u - 0.5) * w, y - 0.2, 0)); }
  const cv = new THREE.CatmullRomCurve3([0, 0.25, 0.5, 0.75, 1].map((u) => new THREE.Vector3((u - 0.5) * w, -0.5 * Math.sin(Math.PI * u), 0)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 16, 0.015, 4), new THREE.MeshBasicMaterial({ color: INK })));
  return g;
};
export const flagPole = (h = 3, stripes = ["#3d5fa8", "#f3ead2", "#c8413a"]) => {
  const t = sign(`flag${stripes.join("")}`, 192, 128, stripes[1], [], INK, (g) => { stripes.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 64, 0, 64, 128); }); });
  return group(cyl(0.03, 0.04, h, "#6b4a2d", 6), at(ball(0.06, "#e2b84a"), 0, h, 0), at(box(0.9, 0.6, 0.02, t), 0.48, h - 0.68, 0));
};
export const manhole = (r = 0.55, open = false) => group(at(cyl(r, r, 0.04, open ? "#15101c" : "#5a5a66", 16), 0, 0.005, 0), at(cyl(r * 1.15, r * 1.15, 0.03, "#77737f", 16, false), 0, 0, 0));
export const cart = (wood = "#9a6a3c") => {
  const g = group(contact(2.4, 1.6), at(box(1.6, 0.5, 0.9, planks(wood, 3)), 0, 0.5, 0));
  for (const z of [-0.5, 0.43]) g.add(at(cyl(0.42, 0.42, 0.07, "#5a3d24", 14), 0, 0.42, z, 0, Math.PI / 2));
  g.add(at(box(1.1, 0.05, 0.05, wood), 1.3, 0.62, 0.4), at(box(1.1, 0.05, 0.05, wood), 1.3, 0.62, -0.4));
  return g;
};
export const potPlant = (h = 0.9) => group(contact(0.7, 0.7), cyl(0.2, 0.14, 0.3, "#b9624a", 10), at(ball(0.3, "#4f8a4a", 1.25), 0, 0.26, 0), at(ball(0.2, "#63a356"), 0.16, h * 0.55, 0.05));

// ---------------------------------------------------------------- sewer
export const pipe = (len = 3, r = 0.18, c = "#7a5a3c") => {
  const g = group(); const p = cyl(r, r, len, c, 10); p.rotation.z = Math.PI / 2; p.position.x = len / 2; g.add(p);
  for (const x of [-len / 2 + 0.1, 0, len / 2 - 0.1]) { const f = cyl(r * 1.25, r * 1.25, 0.09, shade(c, 0.75), 10); f.rotation.z = Math.PI / 2; f.position.x = x + 0.045; g.add(f); }
  return g;
};
export const grate = (w = 1, h = 0.8) => { const g = group(box(w, h, 0.06, "#15101c")); for (let i = 0; i <= 6; i++) g.add(at(cyl(0.025, 0.025, h, "#5a5a66", 5, false), -w / 2 + (i / 6) * w, 0, 0.04)); g.add(at(box(w + 0.1, 0.08, 0.1, "#5a5a66"), 0, h, 0), at(box(w + 0.1, 0.08, 0.1, "#5a5a66"), 0, -0.04, 0)); return g; };

// ---------------------------------------------------------------- countryside
export const tree = (h = 4, leaf = "#5f9a48", seed = 1) => {
  const r = rng(seed), g = group(contact(2.2, 2.2, 0.35), cyl(0.12, 0.2, h * 0.5, "#7a5a3c", 8));
  for (let i = 0; i < 5; i++) g.add(at(ball(h * (0.2 + r() * 0.08), shade(leaf, 0.9 + r() * 0.25), 0.9), (r() - 0.5) * h * 0.4, h * (0.38 + r() * 0.28), (r() - 0.5) * h * 0.3));
  return g;
};
export const palm = (h = 4.5, seed = 1) => {
  const r = rng(seed), g = group(contact(1.6, 1.6, 0.35));
  const cv = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.25, h * 0.5, 0), new THREE.Vector3(0.1, h, 0)]);
  g.add(inked(new THREE.TubeGeometry(cv, 10, 0.13, 7), lit("#9a7a4c")));
  for (let i = 0; i < 7; i++) { const geo = new THREE.SphereGeometry(1, 8, 5); geo.scale(1.25, 0.08, 0.3); geo.translate(1.1, 0, 0); g.add(at(inked(geo, lit(shade("#4f8a4a", 0.85 + r() * 0.3))), 0.1, h, 0, (i / 7) * 6.28, 0, -0.45 - r() * 0.2)); }
  return g;
};
export const bush = (s = 0.8, leaf = "#5f9a48", seed = 1) => { const r = rng(seed), g = group(contact(s * 2.4, s * 1.6, 0.35)); for (let i = 0; i < 4; i++) g.add(at(ball(s * (0.4 + r() * 0.2), shade(leaf, 0.88 + r() * 0.24), 0.85), (i - 1.5) * s * 0.42, 0, (r() - 0.5) * s * 0.3)); return g; };
export const fence = (len = 4, h = 0.9, wood = "#a9713c") => {
  const g = group();
  for (let x = -len / 2; x <= len / 2 + 0.01; x += 0.8) g.add(at(box(0.1, h, 0.1, wood), x, 0, 0, 0, 0, (hashish(x) - 0.5) * 0.08));
  for (const y of [0.35, 0.72]) g.add(at(box(len, 0.09, 0.05, planks(wood, 2)), 0, y * h, 0.03));
  return g;
};
const hashish = (x: number) => { const v = Math.sin(x * 91.7) * 4375.5; return v - Math.floor(v); };
export const hut = (w = 3, wall = "#c9a06a", roof = "#a8873c") => {
  const g = group(contact(w * 1.4, w * 1.2, 0.4), box(w, 1.9, w * 0.8, planks(wall, 6, true)));
  const geo = new THREE.ConeGeometry(w * 0.86, 1.3, 4); geo.rotateY(Math.PI / 4); geo.scale(1, 1, 0.8); geo.translate(0, 0.65, 0);
  g.add(at(inked(geo, lit(planks(roof, 9, true))), 0, 1.9, 0), at(door(0.8, 1.5, "#6b4a2d"), -w * 0.18, 0, w * 0.4 - 0.02), at(windowLit(0.5, 0.5, "#27304a", "#6b4a2d"), w * 0.24, 0.9, w * 0.4));
  return g;
};
export const trough = (w = 1.4) => group(contact(w * 1.3, 0.9), box(w, 0.3, 0.45, planks("#8a5a30", 2)), at(box(w - 0.1, 0.02, 0.35, "#d9c070", false), 0, 0.29, 0));
export const haystack = (r = 0.8) => group(contact(r * 2.6, r * 2.6), ball(r, "#d9b84a", 0.8));
export const hill = (r = 30, c = "#8fb86a", sy = 0.25) => { const geo = new THREE.SphereGeometry(r, 20, 10, 0, 6.3, 0, 1.6); geo.scale(1, sy, 1); return inked(geo, lit(c)); };
export const cloud = (w = 8, seed = 1) => { const r = rng(seed), g = group(); for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(w * (0.14 + r() * 0.1), 10, 8).scale(1.5, 0.8, 0.4), new THREE.MeshBasicMaterial({ color: "#ffffff", fog: false })); m.position.set((i - 2) * w * 0.2, r() * w * 0.06, 0); g.add(m); } return g; };

export type Placed = { o: THREE.Object3D; p: V3; ry?: number; s?: number };
/** place many props at once: [object, [x,y,z], yaw?, scale?] */
export const dress = (root: THREE.Object3D, items: [THREE.Object3D, V3, number?, number?][]) => {
  for (const [o, p, ry = 0, s = 1] of items) { o.position.set(p[0], p[1], p[2]); o.rotation.y = ry; o.scale.setScalar(s); root.add(o); }
  return root;
};

// ---------------------------------------------------------------- sea and north
/** a clinker longship about `len` metres long, bow toward +x: curved hull, shield row, mast, striped sail, dragon
 *  prow. Deck height is `LONGSHIP_DECK` above its origin; put the origin at the waterline. */
export const LONGSHIP_DECK = 0.95;
export const longship = (len = 9, sail: [string, string] = ["#c8413a", "#f3ead2"], wood = "#8a5a30") => {
  const g = group(), half = len / 2, beam = 1.15;
  const outline = new THREE.Shape(); const N = 24;
  for (let i = 0; i <= N; i++) { const u = i / N, x = -half + u * len, w = beam * Math.sin(Math.PI * u) ** 0.55; i ? outline.lineTo(x, w) : outline.moveTo(x, w); }
  for (let i = N; i >= 0; i--) { const u = i / N, x = -half + u * len, w = beam * Math.sin(Math.PI * u) ** 0.55; outline.lineTo(x, -w); }
  const hull = new THREE.ExtrudeGeometry(outline, { depth: 0.95, bevelEnabled: false, curveSegments: 4 }); hull.rotateX(Math.PI / 2); hull.translate(0, 0.75, 0);
  const p = hull.attributes.position; // sheer: the ends sweep up, the keel narrows
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), t = Math.abs(x) / half; p.setY(i, y + 1.25 * t ** 2.4); if (y < 0.1) p.setZ(i, p.getZ(i) * 0.45); }
  hull.computeVertexNormals();
  g.add(inked(hull, lit(planks(wood, 7, false, [3, 1]))));
  g.add(at(box(len * 0.82, 0.06, beam * 1.5, planks(shade(wood, 1.25), 5), false), 0, LONGSHIP_DECK - 0.06, 0)); // deck
  const cols = ["#c8413a", "#e2b84a", "#3d6a8a", "#f3ead2", "#4f7a4a"];
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) { const x = -half * 0.62 + i * (len * 0.62 / 8), u = (x + half) / len, w = beam * Math.sin(Math.PI * u) ** 0.55; // shields
    const sh = cyl(0.21, 0.21, 0.05, cols[(i + (s > 0 ? 0 : 2)) % 5], 14); g.add(at(sh, x, 0.5 + 1.25 * (Math.abs(x) / half) ** 2.4, s * (w + 0.03), 0, Math.PI / 2 * s)); g.add(at(ball(0.05, "#8a8590", 1, false), x, 0.66 + 1.25 * (Math.abs(x) / half) ** 2.4, s * (w + 0.08))); }
  g.add(at(cyl(0.07, 0.09, 6.4, shade(wood, 0.8), 8), 0, LONGSHIP_DECK, 0), at(box(0.09, 0.09, 4.4, shade(wood, 0.8)), 0, 7.1, 0, -0.75)); // mast and yard (braced round so the sail reads from the side)
  const st = sign(`sail${sail.join("")}`, 512, 512, sail[1], [], INK, (c) => { c.fillStyle = sail[0]; for (let i = 0; i < 4; i++) c.fillRect(i * 128, 0, 64, 512); });
  const sg = new THREE.PlaneGeometry(4.2, 3.3, 8, 8); const sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) sp.setZ(i, 0.5 * Math.cos((sp.getX(i) / 2.1) * 1.4) * Math.cos((sp.getY(i) / 1.65) * 1.2)); sg.computeVertexNormals(); sg.rotateY(Math.PI / 2 - 0.75);
  const sm = new THREE.MeshLambertMaterial({ map: st, side: THREE.DoubleSide }); g.add(at(new THREE.Mesh(sg, sm), 0.25, 5.4, 0)); // high enough that nobody on deck is hidden behind it
  const neck = new THREE.CatmullRomCurve3([[half - 0.25, 1.75, 0], [half + 0.1, 2.5, 0], [half + 0.05, 3.2, 0], [half + 0.5, 3.5, 0]].map((q) => new THREE.Vector3(...q)));
  g.add(inked(new THREE.TubeGeometry(neck, 10, 0.13, 7), lit(shade(wood, 0.85))), at(ball(0.2, "#c8413a", 0.9), half + 0.62, 3.32, 0), at(ball(0.05, "#f3ead2", 1, false), half + 0.7, 3.52, 0.14), at(ball(0.05, "#f3ead2", 1, false), half + 0.7, 3.52, -0.14));
  const tail = new THREE.CatmullRomCurve3([[-half + 0.25, 1.75, 0], [-half - 0.1, 2.5, 0], [-half + 0.1, 3.0, 0], [-half + 0.45, 2.85, 0]].map((q) => new THREE.Vector3(...q)));
  g.add(inked(new THREE.TubeGeometry(tail, 10, 0.11, 7), lit(shade(wood, 0.85))));
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) g.add(at(cyl(0.025, 0.025, 2.2, "#c9a06a", 5, false), -1.8 + i * 0.9, 0.3, s * 1.0, 0, s * 1.3, 0)); // oars
  g.add(at(barrel(0.5), -2.6, LONGSHIP_DECK, 0.3), at(crate(0.42, "FISH"), -3.1, LONGSHIP_DECK, -0.3, 0.4));
  return g;
};
export const pine = (h = 5, leaf = "#2f6a4a", seed = 1) => {
  const r = rng(seed), g = group(contact(1.8, 1.8, 0.3), cyl(0.1, 0.16, h * 0.3, "#6b4a2d", 7));
  for (let i = 0; i < 4; i++) { const k = 1 - i * 0.2, geo = new THREE.ConeGeometry(h * 0.24 * k, h * 0.34, 9); geo.translate(0, h * 0.17, 0); g.add(at(inked(geo, lit(shade(leaf, 0.9 + r() * 0.25))), 0, h * (0.2 + i * 0.19), 0)); }
  return g;
};
/** a wall of ice: faceted blue-white blocks, for Greenland and icebergs */
export const glacier = (w = 12, h = 6, seed = 1, cols = ["#dff2fb", "#bfe3f5", "#eaf7fd", "#a8d4ec"]) => {
  const r = rng(seed), g = group();
  for (let i = 0; i < Math.round(w / 1.6); i++) { const bw = 1.6 + r() * 1.6, bh = h * (0.5 + r() * 0.6), geo = new THREE.CylinderGeometry(bw * (0.04 + r() * 0.16), bw * 0.75, bh, 4 + Math.floor(r() * 2)); geo.translate(0, bh / 2, 0); // jagged peaks, not columns
    g.add(at(inked(geo, lit(cols[i % cols.length])), -w / 2 + i * 1.6 + r() * 0.5, 0, (r() - 0.5) * 1.6, r() * 3)); }
  return g;
};
export const iceberg = (s = 2, seed = 1) => { const r = rng(seed), g = group(); for (let i = 0; i < 3; i++) { const geo = new THREE.ConeGeometry(s * (0.5 + r() * 0.3), s * (0.9 + r() * 0.8), 5); geo.translate(0, s * 0.45, 0); g.add(at(inked(geo, lit(["#eaf7fd", "#bfe3f5", "#dff2fb"][i])), (i - 1) * s * 0.5, -0.1, (r() - 0.5) * s * 0.5, r() * 3)); } return g; };
export const rock = (s = 0.8, c = "#8a8590", seed = 1) => { const r = rng(seed), geo = new THREE.DodecahedronGeometry(s, 0); geo.scale(1, 0.6 + r() * 0.3, 0.8 + r() * 0.3); geo.translate(0, s * 0.35, 0); return group(contact(s * 2.4, s * 2), at(inked(geo, lit(shade(c, 0.9 + r() * 0.2))), 0, 0, 0, r() * 6)); };
/** turf-roofed longhouse with a door, smoke hole and a carved gable */
export const longhouse = (w = 5, wall = "#8a6a4a", turf = "#5f8a48") => {
  const g = group(contact(w * 1.3, 4.2, 0.4), box(w, 1.5, 2.8, planks(wall, 6, true, [3, 1])));
  const tri = new THREE.Shape(); tri.moveTo(-1.75, 0); tri.lineTo(1.75, 0); tri.lineTo(0, 1.25); tri.closePath();
  const roof = new THREE.ExtrudeGeometry(tri, { depth: w + 0.5, bevelEnabled: false }); roof.translate(0, 0, -(w + 0.5) / 2); roof.rotateY(Math.PI / 2); roof.translate(0, 1.5, 0);
  g.add(inked(roof, lit(grassTex(turf))), at(door(0.85, 1.4, "#5a3d24"), -w * 0.2, 0, 1.42), at(windowLit(0.5, 0.5, "#ffd98a", "#5a3d24"), w * 0.25, 0.7, 1.41), at(cyl(0.16, 0.2, 0.5, "#6b6470", 7), w * 0.3, 2.5, 0));
  return g;
};
const grassTex = (c: string) => planks(c, 9, true, [4, 2]);
export const dock = (len = 6, w = 1.6) => { const g = group(at(box(len, 0.12, w, planks("#9a7a52", 5, false, [3, 1])), 0, 0.5, 0)); for (let x = -len / 2 + 0.3; x <= len / 2; x += 1.4) for (const s of [-1, 1]) g.add(at(cyl(0.09, 0.1, 1.3, "#6b4a2d", 7), x, -0.5, s * (w / 2 - 0.1))); return g; };
export const fishRack = () => { const g = group(contact(2.2, 0.8), at(box(0.07, 1.6, 0.07, "#8a6a4a"), -0.9, 0, 0), at(box(0.07, 1.6, 0.07, "#8a6a4a"), 0.9, 0, 0), at(box(1.9, 0.06, 0.06, "#8a6a4a"), 0, 1.55, 0)); for (let i = 0; i < 6; i++) { const geo = new THREE.SphereGeometry(0.1, 7, 5); geo.scale(0.6, 2.2, 0.3); g.add(at(inked(geo, lit(i % 2 ? "#c9d7e8" : "#a9bcd0")), -0.7 + i * 0.28, 1.25, 0)); } return g; };
export const campfire = () => group(at(lightPool(3.2, 3.2, "#ffb84a", 0.6), 0, 0.02, 0), at(cyl(0.05, 0.05, 0.7, "#5a3d24", 5), 0, 0.05, 0, 0, 0, 1.2), at(cyl(0.05, 0.05, 0.7, "#5a3d24", 5), 0, 0.05, 0, 1.6, 0, 1.2), at(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 7).translate(0, 0.4, 0), glow("#ffb347")), 0, 0, 0), at(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 7).translate(0, 0.35, 0), glow("#fff1b8")), 0, 0, 0));
