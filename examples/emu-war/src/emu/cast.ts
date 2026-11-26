// The cast of "The War I Won" as lit flat cards in the 3D world (same machinery as the bridge short: a canvas pool keyed
// by drawing, yaw-only billboards shaded by cardShade(), multiply contact blobs, unlit effect cards on the NOINK layer).
// stage(id, f) says who is where in shot `id` at frame f: emus (emu.ts), soldiers, the Major and the farmers (toon.ts).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, SideOpts, fxBurst, fxStars, fxCreak, fxShadow, fxContact, fxPuff } from "./toon";
import { emuSide, emuFront, EmuOpts, EmuMode, fxRabbit, fxBullet, fxFeather, fxMuzzle, fxSpeed, fxSmoke, fxDust } from "./bird";
import {
  FPS, SHOTS, V3, smooth, clamp01, HERO_STANDOFF, HERO_PLAIN, HERO_EDGE, HERO_CUTE, HERO_END, MAJOR, DAM, GANG, KICK_X, FENCE_Z,
  truckArrive, heroRunX, truckChaseX, truckDriveX, marchX, truckLeaveX, TRACK_Z,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number] };
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3; light: "day" | "golden" };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1080, 1800, 1.8] : d < 6.5 ? [660, 1100, 1.1] : d < 16 ? [360, 600, 0.6] : d < 40 ? [180, 300, 0.3] : [96, 160, 0.16];
const tmp = new THREE.Vector3();
let CAM: CamInfo;
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps */
const light2D = (mirror: boolean) => {
  const sx = CAM.sun.dot(CAM.right) * (mirror ? -1 : 1), sy = -CAM.sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
/** front when the character faces the lens (within ~55 deg), otherwise a side view; mirror when facing screen-left */
const viewOf = (x: number, z: number, dx: number, dz: number) => {
  const tx = CAM.pos.x - x, tz = CAM.pos.z - z, tl = Math.hypot(tx, tz) || 1, dl = Math.hypot(dx, dz) || 1;
  const c = (tx * dx + tz * dz) / (tl * dl);
  return { side: c < 0.57, mirror: dx * CAM.right.x + dz * CAM.right.z < 0 };
};

// ---------------- blinks ----------------
const LID = [0.5, 1, 1, 0.5];
const lidAt = (f: number, i: number) => {
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

// ---------------- ground shadows ----------------
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1, w = 0.52) => {
  const S = CAM.sun, hl = Math.hypot(S.x, S.z) || 1, ox = -S.x / hl, oz = -S.z / hl, rot = Math.atan2(-ox, -oz);
  if (CAM.light === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, S.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc * (w / 0.52), h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[CAM.light], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: w * sc, h: 0.4 * sc * (w / 0.52), flat: true, rot });
};

// ---------------- characters ----------------
const SOLDIER: Outfit = { jacket: "#8c7a4e", pants: "#7a6a44", boots: "#3a2a1e", hat: "slouch", belt: "#6a5634", buttons: "#c9b26a" };
const GUNNER2: Outfit = { ...SOLDIER, skin: "#f5c9a0" };
const MAJOR_O: Outfit = { jacket: "#9a8658", pants: "#7a6a44", boots: "#3a2a1e", hat: "peaked", moustache: "#5a4030", build: "stout", belt: "#6a4228", buttons: "#d9c27a", skin: "#f2cfae" };
const FARMERS: Outfit[] = [
  { jacket: "#b5653f", pants: "#4a4a5a", boots: "#5a3b2a", hat: "akubra", skin: "#f5c9a0", moustache: "#7a5a3a" },
  { jacket: "#5a7fb0", pants: "#5a4a3a", boots: "#5a3b2a", hat: "akubra", cap: "#9a7a52" },
  { jacket: "#d9c79a", pants: "#4a4a5a", boots: "#3a2a1e", hat: "akubra", skin: "#ecd0b6", cap: "#6a4a30" },
];

/** a person at (x, z) facing (dx, dz): front drawing toward the lens, side drawing otherwise */
const person = (out: Stage, i: number, o: Outfit, okey: string, x: number, y: number, z: number, dx: number, dz: number,
  fo: FrontOpts, so: SideOpts, f: number, opts: { shadow?: boolean; scale?: number; front?: boolean } = {}) => {
  const sc = opts.scale ?? 1, d = CAM.pos.distanceTo(tmp.set(x, y + 1.2, z)) / sc, [w, h, k] = tier(d);
  const v = opts.front ? { side: false, mirror: false } : viewOf(x, z, dx, dz), mirror = v.side && v.mirror, light = light2D(mirror), seed = (i % 7) + 1;
  const blink = lidAt(f, i);
  const f2: FrontOpts = { blink, ...fo, light, seed }, s2: SideOpts = { blink, ...so, light, seed };
  out.places.push({
    key: v.side ? `S|${okey}|${fkey(s2)}` : `F|${okey}|${fkey(f2)}`, x, y, z, scale: sc, mirror,
    draw: (p) => (v.side ? bodySide(p, o, s2) : bodyFront(p, o, f2)), size: [w, h, k],
  });
  if (opts.shadow !== false) blob(out, x, y, z, sc);
};

/** an emu at (x, z) facing (dx, dz) */
const emu = (out: Stage, i: number, x: number, z: number, dx: number, dz: number, o: EmuOpts, f: number, opts: { y?: number; shadow?: boolean; front?: boolean; side?: boolean } = {}) => {
  const y = opts.y ?? 0, d = CAM.pos.distanceTo(tmp.set(x, y + 1.2, z)), [w, h, k] = tier(d);
  let v = viewOf(x, z, dx, dz);
  if (opts.front) v = { side: false, mirror: false };
  if (opts.side) v = { side: true, mirror: v.mirror };
  const mirror = v.side && v.mirror, light = light2D(mirror);
  const o2: EmuOpts = { blink: lidAt(f, i + 500), seed: (i % 9) + 1, ...o, light };
  // far emus: fewer distinct drawings (quantised walk phase, no blinks)
  if (w <= 180) { o2.blink = 0; if (o2.phase !== undefined) o2.phase = q(o2.phase, 8); if (o2.pose !== undefined) o2.pose = q(o2.pose, 6); o2.seed = (i % 3) + 1; }
  out.places.push({
    key: v.side ? `ES|${fkey(o2)}` : `EF|${fkey(o2)}`, x, y, z, mirror,
    draw: (p) => (v.side ? emuSide(p, o2) : emuFront(p, o2)), size: [w, h, k],
  });
  if (opts.shadow !== false) blob(out, x, y, z, 1.15, 1, 0.8);
};

const fx = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, more: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...more });
const dust = (out: Stage, x: number, z: number, u: number, s = 1.2) => {
  const k = q(clamp01(u), 20);
  if (u >= 0 && u < 1) fx(out, `dust${k}`, 300, 300, (p) => fxDust(p, k), x, 0.45 * s, z, s * 1.6, s * 1.6, { soft: true });
};
const muzzle = (out: Stage, x: number, y: number, z: number, f: number, s = 0.7) => {
  const k = f % 3; // flash on two of every three frames
  if (k < 2) fx(out, `muzzle${k}`, 300, 300, (p) => fxMuzzle(p, k), x, y, z, s, s, { rot: k * 0.6 });
};

// ---------------- sets ----------------
type Ctx = { id: number; f: number; out: Stage };
const between = (f: number, a: number, b: number) => f >= a && f < b;
const exprAt = (f: number, seq: [number, Expr][]) => { let e = seq[0][1]; for (const [g, x] of seq) if (f >= g - 2) e = x; return e; };

/** a walking stream / scattered herd: n emus with stable random offsets */
const herd = (c: Ctx, n: number, base: (i: number) => [number, number], dir: (i: number) => [number, number], mode: (i: number) => EmuMode, speed = 0, t0 = 0, i0 = 0) => {
  const t = (c.f - t0) / FPS;
  for (let i = 0; i < n; i++) {
    const [bx, bz] = base(i), [dx, dz] = dir(i), m = mode(i), L = Math.hypot(dx, dz) || 1;
    const x = bx + (dx / L) * speed * t, z = bz + (dz / L) * speed * t;
    const ph = (t * (m === "run" ? 2.6 : 0.9) + hh(i, 4)) % 1;
    const pose = m === "peck" ? 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7) : 0;
    emu(c.out, i0 + i, x, z, dx, dz, { mode: m, phase: ph, pose, expr: "neutral" }, c.f);
  }
};

const SETS: Record<string, (c: Ctx) => void> = {
  standoff: (c) => {
    emu(c.out, 0, HERO_STANDOFF[0], HERO_STANDOFF[2], 0, -1, { hero: true, expr: "smug" }, c.f);
    person(c.out, 1, MAJOR_O, "major", -1.0, 0, 3.4, 0.1, 1, { expr: "stern" }, { expr: "stern", mode: "stand" }, c.f);
    person(c.out, 2, SOLDIER, "sol", -0.4, 0, 4.6, 0.1, 1, { expr: "stern" }, { expr: "stern", mode: "stand" }, c.f);
    person(c.out, 3, GUNNER2, "sol2", -3.1, 0, 1.9, 0.2, 1, { expr: "nervous" }, { expr: "nervous", mode: "stand" }, c.f);
  },
  heroCU1: (c) => emu(c.out, 0, HERO_STANDOFF[0], HERO_STANDOFF[2], 0, -1, { hero: true, expr: exprAt(c.f, [[99, "smug"], [111, "grin"]]) }, c.f, { front: true }),
  heroPlain: (c) => {
    emu(c.out, 0, HERO_PLAIN[0], HERO_PLAIN[2], 0, -1, { hero: true, expr: exprAt(c.f, [[127, "smile"], [134, "smile_closed"], [146, "smug"]]) }, c.f, { front: true });
    herd(c, 12, (i) => [-162 + i * 2.4 + hh(i) * 1.5, 5 + hh(i, 2) * 9], () => [1, 0], () => "walk", 1.3, 127, 10);
  },
  migration: (c) => herd(c, 150, (i) => [-262 + ((i * 37.3) % 115) + hh(i) * 3, -14 + ((i * 7.7) % 30) + hh(i, 2) * 2], (i) => [1, 0.12 * (hh(i, 3) - 0.5)], () => "walk", 1.3, 154, 20),
  fieldEdge: (c) => {
    emu(c.out, 0, HERO_EDGE[0], HERO_EDGE[2], 1, 0, { hero: true, expr: exprAt(c.f, [[252, "neutral"], [282, "shock"]]), mode: "stand" }, c.f, { side: true });
    for (const [i, x, z] of [[1, -68, 44], [2, -70, 37.5], [3, -72.5, 42], [4, -74.5, 38.5]] as const)
      emu(c.out, i, x, z, 1, 0.05 * i, { mode: c.f > 285 ? "stand" : "walk", phase: (c.f / 30 + i * 0.3) % 1, expr: "shock" }, c.f, { side: true });
  },
  heroEdgeCU: (c) => emu(c.out, 0, HERO_EDGE[0], HERO_EDGE[2], -1, 0, { hero: true, expr: exprAt(c.f, [[300, "shock"], [304, "grin"], [318, "laugh"], [329, "lick"]]) }, c.f, { front: true }),
  fieldAerial: () => {},
  farmer: (c) => person(c.out, 30, FARMERS[0], "farmer0", 10, 0, 6.6, 0, -1, { expr: exprAt(c.f, [[388, "smile"], [425, "proud"]]), mode: "stand" }, {}, c.f, { front: true }),
  pecking: (c) => {
    const tr = c.f >= 466;
    const spots: [number, number][] = [[-29.5, 30], [-31.6, 32.5], [-27.4, 33], [-33.5, 29], [-26.5, 29.5], [-30, 35.5], [-25, 36]];
    spots.forEach(([x, z], i) => {
      const t = c.f / FPS, ph = (t * 2.2 + hh(i)) % 1;
      if (i === 0) emu(c.out, 0, x, z, -0.5, -1, { hero: true, mode: tr ? "walk" : "chew", phase: tr ? ph : (t * 1.2) % 1, expr: tr ? "laugh" : "smile_closed", wheat: !tr }, c.f, { front: true });
      else emu(c.out, i, x, z, hh(i, 5) - 0.5, hh(i, 6) - 0.5, tr ? { mode: "walk", phase: ph, expr: "grin" } : { mode: "peck", pose: 0.5 + 0.5 * Math.sin(t * 4 + i * 2), expr: "smile_closed" }, c.f);
    });
  },
  kick: (c) => {
    const k1 = c.f < 497 ? 0 : c.f < 506 ? (c.f - 497) / 9 : Math.max(0, 1 - (c.f - 506) / 12);
    emu(c.out, 0, KICK_X + 0.15, FENCE_Z + 1.5, 0, -1, { mode: "kick", pose: k1 * 0.5 + (c.f >= 506 ? 0.5 * (1 - k1) : 0), expr: c.f < 497 ? "angry" : "grin" }, c.f, { side: true });
    const k2 = c.f < 520 ? 0 : c.f < 529 ? (c.f - 520) / 9 : Math.max(0, 1 - (c.f - 529) / 10);
    emu(c.out, 1, KICK_X - 3.85, FENCE_Z + 1.5, 0, -1, { mode: "kick", pose: k2 * 0.5, expr: "grin" }, c.f, { side: true });
    if (between(c.f, 503, 510)) { const u = q((c.f - 503) / 7, 30); fx(c.out, `burst${u}`, 500, 500, (p) => fxBurst(p, u), KICK_X, 0.75, FENCE_Z + 0.1, 0.9, 0.9); }
    if (between(c.f, 526, 533)) { const u = q((c.f - 526) / 7, 30); fx(c.out, `burst${u}`, 500, 500, (p) => fxBurst(p, u), KICK_X - 4, 0.75, FENCE_Z + 0.1, 0.9, 0.9); }
  },
  rabbits: (c) => {
    for (let i = 0; i < 5; i++) {
      const t = (c.f - 540) / FPS - i * 0.3, z = 6.7 + 1.5 * t;
      if (z < 3 || z > 14) continue;
      const hop = q((t / 0.36) % 1, 12), x = KICK_X + (hh(i, 3) - 0.5) * 0.8;
      fx(c.out, `rabbit${hop}`, 300, 240, (p) => fxRabbit(p, hop), x, 0.24, z, 0.55, 0.44, { rot: 0 });
    }
    emu(c.out, 0, KICK_X + 2.6, FENCE_Z + 3.5, -1, 0.4, { mode: "stand", expr: "smug" }, c.f);
  },
  farmers: (c) => {
    const ex: Expr = c.f < 608 ? "stern" : "angry";
    person(c.out, 30, FARMERS[0], "farmer0", 24, 0, -10, 0, 1, { expr: ex, mode: "stand", wave: c.f >= 608 && c.f < 640 ? q(Math.sin(c.f * 0.9), 20) : undefined }, {}, c.f, { front: true });
    person(c.out, 31, FARMERS[1], "farmer1", 23.0, 0, -10.6, 0.3, 1, { expr: c.f < 620 ? "nervous" : "angry", mode: "stand" }, {}, c.f, { front: true });
    person(c.out, 32, FARMERS[2], "farmer2", 25.0, 0, -10.8, -0.3, 1, { expr: "stern", mode: "stand" }, {}, c.f, { front: true });
  },
  arrive: (c) => {
    const X = truckArrive(c.f);
    person(c.out, 1, MAJOR_O, "major", X - 1.4, 1.15, TRACK_Z + 0.2, 1, 0.2, {}, { expr: "stern", mode: "stand" }, c.f, { shadow: false });
    person(c.out, 2, SOLDIER, "sol", X - 2.4, 1.15, TRACK_Z - 0.4, 1, 0.2, {}, { expr: "neutral", mode: "stand" }, c.f, { shadow: false });
    if (X < -3.2) for (let k = 0; k < 4; k++) { const u = ((c.f / FPS) * 1.6 + k / 4) % 1; dust(c.out, X - 3.5 - u * 3, TRACK_Z + (k % 2 ? 0.8 : -0.8), u, 1.4); }
  },
  guns: () => {},
  crates: () => {},
  major: (c) => {
    person(c.out, 1, MAJOR_O, "major", MAJOR[0], 0, MAJOR[2], 0, 1, { expr: exprAt(c.f, [[748, "stern"], [764, "neutral"], [779, "stern"]]), mode: "stand" }, {}, c.f, { front: true });
    person(c.out, 2, SOLDIER, "sol", -0.6, 0, -13.6, 0, 1, { expr: "stern", mode: "stand" }, {}, c.f, { front: true });
    person(c.out, 3, GUNNER2, "sol2", 3.2, 0, -14, 0, 1, { expr: "neutral", mode: "stand" }, {}, c.f, { front: true });
  },
  damWide: (c) => {
    herd(c, 70, (i) => { const a = (i / 70) * Math.PI * 2 + hh(i) * 0.08, r = 16.5 + hh(i, 2) * 7; return [DAM[0] + Math.cos(a) * r, DAM[2] + Math.sin(a) * r]; },
      (i) => { const a = (i / 70) * Math.PI * 2; return [-Math.cos(a) + 0.3 * (hh(i, 7) - 0.5), -Math.sin(a)]; }, (i) => (i % 4 ? "peck" : "stand"), 0, 805, 50);
    person(c.out, 2, SOLDIER, "sol", -110.8, 0, -79.8, 0.1, 1, {}, { expr: "smug", mode: "stand" }, c.f);
    person(c.out, 3, GUNNER2, "sol2", -109.3, 0, -80.1, 0.1, 1, {}, { expr: "smug", mode: "stand" }, c.f);
  },
  ambush: (c) => {
    person(c.out, 2, SOLDIER, "sol", -110.75, 0, -79.75, 0, 1, { expr: exprAt(c.f, [[836, "smug"], [860, "grin"]]), mode: "stand", look: 1 }, {}, c.f, { front: true });
    person(c.out, 3, GUNNER2, "sol2", -109.25, 0, -80, 0, 1, { expr: "smug", mode: "stand", look: -1 }, {}, c.f, { front: true });
  },
  fire: (c) => {
    const go = c.f >= 893, t = Math.max(0, (c.f - 893) / FPS);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + hh(i) * 0.08, r = 16.5 + hh(i, 2) * 7;
      let x = DAM[0] + Math.cos(a) * r, z = DAM[2] + Math.sin(a) * r;
      const dx = Math.cos(a + (hh(i, 8) - 0.5)), dz = Math.sin(a + (hh(i, 8) - 0.5)) + 0.4;
      const sp = go ? Math.min(1, t * 2) * 9 : 0;
      x += dx * sp * Math.max(0, t - 0.15); z += dz * sp * Math.max(0, t - 0.15);
      emu(c.out, 50 + i, x, z, go ? dx : -Math.cos(a), go ? dz : -Math.sin(a), { mode: go && t > 0.1 ? "run" : i % 4 ? "peck" : "stand", phase: (t * 2.6 + hh(i, 4)) % 1, pose: 0.7, expr: go ? "shock" : "neutral" }, c.f, { side: go && t > 0.1 });
    }
    if (go) {
      muzzle(c.out, -110, 1.02, -77.9, c.f, 0.8);
      for (let k = 0; k < 6; k++) { const f0 = 893 + k * 5 + Math.floor(hh(k, 1) * 3), u = (c.f - f0) / 14; dust(c.out, DAM[0] - 12 + hh(k, 2) * 24, DAM[2] - 18 + hh(k, 3) * 10, u, 1.3); }
    }
    person(c.out, 3, GUNNER2, "sol2", -109.2, 0, -79.4, 0, 1, {}, { expr: "grin", mode: "stand" }, c.f);
  },
  jam: (c) => {
    person(c.out, 3, GUNNER2, "sol2", -110.25, 0, -79.95, 0, 1, {}, { expr: c.f < 937 ? "shock" : "nervous", mode: "stand" }, c.f);
    if (c.f < 931) muzzle(c.out, -110, 1.02, -77.9, c.f, 0.6);
    const u = (c.f - 931) / 34;
    if (u >= 0 && u < 1) { const k = q(u, 20); fx(c.out, `smoke${k}`, 300, 300, (p) => fxSmoke(p, k), -110.05, 1.15 + 0.4 * u, -78.6, 0.9, 0.9, { soft: true }); }
    if (c.f > 940) { const k = q(((c.f / FPS) * 1.3) % 1, 20); fx(c.out, `creak${k}`, 300, 300, (p) => fxCreak(p, k), -110, 1.25, -78.9, 0.5, 0.5, { rot: -0.3 }); }
  },
  gunTruck: (c) => {
    const X = truckDriveX(c.f);
    person(c.out, 3, GUNNER2, "sol2", X - 1.6, 1.15, TRACK_Z + 0.4, 1, 0, {}, { expr: "grin", mode: "stand" }, c.f, { shadow: false });
    person(c.out, 1, MAJOR_O, "major", X - 2.7, 1.15, TRACK_Z - 0.3, 1, 0, {}, { expr: "stern", mode: "stand" }, c.f, { shadow: false });
    for (let k = 0; k < 4; k++) { const u = ((c.f / FPS) * 1.6 + k / 4) % 1; dust(c.out, X - 3.8 - u * 3, TRACK_Z + (k % 2 ? 0.8 : -0.8), u, 1.3); }
  },
  cute: (c) => emu(c.out, 0, HERO_CUTE[0], HERO_CUTE[2], 0, 1, { hero: true, expr: "smug" }, c.f, { front: true }),
  run: (c) => {
    const X = heroRunX(c.f), ph = ((c.f - 1033) / FPS * 3.2) % 1;
    emu(c.out, 0, X, -30, 1, 0, { hero: true, mode: "run", phase: ph, expr: c.f < 1060 ? "grin" : "laugh" }, c.f, { y: 0, side: true });
    for (let k = 0; k < 3; k++) { const u = (((c.f - 1033) / FPS) * 3 + k / 3) % 1; fx(c.out, `speed${q(u, 6)}`, 400, 200, (p) => fxSpeed(p, q(u, 6)), X - 1.2 - u * 0.6, 1.0 + k * 0.25, -29.95, 1.2, 0.6, { soft: true }); }
    for (let k = 0; k < 3; k++) { const u = (((c.f - 1033) / FPS) * 2.5 + k / 3) % 1; dust(c.out, X - 1 - u * 2.5, -30.2, u, 0.9); }
  },
  chase: (c) => {
    const X = heroRunX(c.f), ph = ((c.f - 1033) / FPS * 3.2) % 1;
    for (let i = 0; i < 4; i++) emu(c.out, i, X - i * 2.4 - hh(i) * 1.5, -30 + (i % 2 ? 1.8 : -1.5) * (i ? 1 : 0), 1, 0, { hero: i === 0, mode: "run", phase: (ph + i * 0.27) % 1, expr: "laugh" }, c.f, { side: true });
    const XT = truckChaseX(c.f);
    person(c.out, 3, GUNNER2, "sol2", XT - 1.6, 1.15 + 0.12 * Math.abs(Math.sin(c.f * 0.7)), -29.6, 1, 0, {}, { expr: "nervous", mode: "stand" }, c.f, { shadow: false });
    for (let k = 0; k < 4; k++) { const u = ((c.f / FPS) * 1.6 + k / 4) % 1; dust(c.out, XT - 3.8 - u * 3, -30 + (k % 2 ? 0.8 : -0.8), u, 1.5); }
  },
  bumpy: (c) => {
    const XT = truckChaseX(c.f), b = truckBump(c.f);
    person(c.out, 3, GUNNER2, "sol2", XT - 1.6, 1.15 + b.y * 1.6 + 0.06, -29.6, 1, 0, {}, { expr: exprAt(c.f, [[1130, "nervous"], [1148, "shock"], [1170, "pained"], [1186, "dazed"]]), mode: "stand" }, c.f, { shadow: false });
    person(c.out, 1, MAJOR_O, "major", XT - 2.9, 1.15 + b.y * 1.3, -30.4, 1, 0, {}, { expr: "shock", mode: "stand" }, c.f, { shadow: false });
    if (c.f % 9 < 4 && c.f < 1196) muzzle(c.out, XT - 0.2, 2.35 + b.y * 2 + 0.6, -29.5, c.f, 0.7);
    for (let k = 0; k < 4; k++) { const u = ((c.f / FPS) * 1.6 + k / 4) % 1; dust(c.out, XT - 3.8 - u * 3, -30 + (k % 2 ? 0.8 : -0.8), u, 1.5); }
  },
  gangsAerial: (c) => {
    for (let g = 0; g < 12; g++) {
      const gx = GANG[0] - 40 + (g % 4) * 26 + hh(g, 1) * 10, gz = GANG[2] - 10 + Math.floor(g / 4) * 26 + hh(g, 2) * 10;
      herd(c, 6, (i) => [gx + (hh(i + g * 10, 3) - 0.5) * 5, gz + (hh(i + g * 10, 4) - 0.5) * 5], (i) => [hh(i + g, 5) - 0.5, hh(i + g, 6) - 0.5], (i) => (i === 0 ? "tall" : "peck"), 0, 1204, 100 + g * 6);
    }
  },
  gang: (c) => {
    gangAt(c, 0);
  },
  lookout: (c) => emu(c.out, 7, GANG[0] + 1.5, GANG[2] + 1.5, 1, 0, { mode: "tall", expr: exprAt(c.f, [[1335, "neutral"], [1350, "shock"]]), look: c.f > 1350 ? 1 : 0 }, c.f, { side: true }),
  scatter: (c) => gangAt(c, Math.max(0, (c.f - 1385) / FPS)),
  tired: (c) => {
    person(c.out, 2, SOLDIER, "sol", -0.95, 0, -8.4, 0, -1, { expr: "dazed", mode: "sit" }, {}, c.f, { front: true });
    person(c.out, 3, GUNNER2, "sol2", 1.0, 0, -8.6, 0, -1, { expr: exprAt(c.f, [[1427, "pained"], [1480, "dazed"]]), mode: "sit" }, {}, c.f, { front: true });
  },
  tally: (c) => {
    for (let i = 0; i < 10; i++) {
      const fi = 1519 + i * 2.6, u = clamp01((c.f - fi) / 4);
      if (u <= 0) continue;
      fx(c.out, "bullet", 100, 300, fxBullet, -0.225 + i * 0.05, 0.045 * u, -9.6, 0.03 * u, 0.09 * u);
    }
    const uf = clamp01((c.f - 1544) / 5);
    if (uf > 0) fx(c.out, "feather", 320, 120, fxFeather, 0.0, 0.015, -9.42, 0.34 * uf, 0.13 * uf, { flat: true, rot: 0.2 });
  },
  majorSays: (c) => person(c.out, 1, MAJOR_O, "major", MAJOR[0], 0, MAJOR[2], 0, 1, { expr: exprAt(c.f, [[1569, "shock"], [1585, "relief_open"]]), mode: "stand" }, {}, c.f, { front: true }),
  march: (c) => {
    const X = marchX(c.f), ph = ((c.f - 1601) / FPS * 0.75) % 1;
    emu(c.out, 0, X + 2.5, -40, 1, 0, { hero: true, hat: true, mode: "walk", phase: ph, expr: "proud" }, c.f, { side: true });
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) emu(c.out, 1 + r * 4 + k, X - r * 2.2, -41.6 + k * 1.8, 1, 0, { mode: "walk", phase: ph, expr: "stern" }, c.f, { side: true });
  },
  proud: (c) => {
    emu(c.out, 0, -36, -40, 0, -1, { hero: true, hat: true, mode: "puff", expr: exprAt(c.f, [[1648, "proud"], [1680, "smug"]]) }, c.f, { front: true });
    for (let k = 0; k < 4; k++) emu(c.out, 1 + k, -38.5 + k * 1.7, -36.5, 0, -1, { mode: "stand", expr: "stern" }, c.f, { front: true });
  },
  leave: (c) => {
    const X = truckLeaveX(c.f);
    for (let k = 0; k < 4; k++) { const u = ((c.f / FPS) * 1.6 + k / 4) % 1; dust(c.out, X + 3.5 + u * 3, TRACK_Z + (k % 2 ? 0.8 : -0.8), u, 1.5); }
    person(c.out, 2, SOLDIER, "sol", X + 1.6, 1.15, TRACK_Z + 0.3, -1, 0, {}, { expr: "dazed", mode: "stand" }, c.f, { shadow: false });
  },
  wheatEnd: (c) => {
    const chew = c.f >= 1786;
    emu(c.out, 0, HERO_END[0], HERO_END[2], 0, -1, { hero: true, mode: chew ? "chew" : "stand", phase: ((c.f - 1786) / FPS * 1.1) % 1, wheat: chew,
      expr: exprAt(c.f, [[1736, "smile"], [1748, "smug"], [1770, "smile"], [1786, "smile_closed"]]), look: between(c.f, 1770, 1786) ? 1 : 0 }, c.f, { front: true });
  },
};

/** one gang: five feeders + the tall lookout; after `run` seconds everybody bolts a different way */
const gangAt = (c: Ctx, run: number) => {
  const spots: [number, number][] = [[148.6, 60.2], [150.2, 62.6], [152.4, 59.8], [149.2, 63.8], [153.6, 63.2]];
  const all: [number, number, boolean][] = [...spots.map(([x, z]) => [x, z, false] as [number, number, boolean]), [GANG[0] + 1.5, GANG[2] + 1.5, true]];
  all.forEach(([x0, z0, tall], i) => {
    const a = (i / all.length) * Math.PI * 2 + 0.6, dx = Math.cos(a), dz = Math.sin(a), sp = run > 0 ? 8 * Math.min(1, run * 3) : 0;
    const x = x0 + dx * sp * run, z = z0 + dz * sp * run;
    const t = c.f / FPS;
    emu(c.out, 7 + i, x, z, run > 0 ? dx : tall ? 1 : hh(i, 5) - 0.5, run > 0 ? dz : tall ? 0 : hh(i, 6) - 0.5,
      run > 0 ? { mode: "run", phase: (t * 2.6 + hh(i, 4)) % 1, expr: "shock" } : tall ? { mode: "tall", expr: "neutral" } : { mode: "peck", pose: 0.5 + 0.5 * Math.sin(t * 3.5 + i * 1.9), expr: "smile_closed" }, c.f, { side: run > 0 });
    if (run > 0) dust(c.out, x - dx * 0.8, z - dz * 0.8, (run * 2 + hh(i)) % 1, 1);
  });
};

/** the bumpy ride: vertical bounce (m) + pitch/roll (rad) of the truck body, sharp knocks on the kick frames */
export const truckBump = (f: number) => {
  const t = f / FPS;
  const y = 0.05 * Math.abs(Math.sin(t * 11)) + 0.04 * Math.abs(Math.sin(t * 7.3 + 1)) + [1148, 1160, 1176].reduce((a, k) => a + (f >= k && f < k + 8 ? 0.22 * Math.sin(((f - k) / 8) * Math.PI) : 0), 0);
  return { y, pitch: 0.05 * Math.sin(t * 9.1) + 0.03 * Math.sin(t * 13.7), roll: 0.04 * Math.sin(t * 8.3 + 2) };
};

/** everything with a face (and the 2D effects) in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  CAM = cam;
  const out: Stage = { places: [], fx: [] };
  SETS[SHOTS[id - 1].set]?.({ id, f, out });
  return out;
};
export { fxPuff, fxStars, smooth, V3 as _V3 };
