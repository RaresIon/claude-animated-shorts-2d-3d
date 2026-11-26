// The whole place as one three.js scene: sky, red outback plain with saltbush and gum trees, the wheat field with its
// fence, the farmhouse + windpump + tank, the dirt track, the dam, far mesas, the army truck, the Lewis guns, crates
// and the brass pile; posed per shot from story.ts. update(id, f, camera) is a pure function of (id, f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, Ray, kitClone, house, setSight, addVeg } from "./build";
import { rep, ctex, cloudHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, truckBump } from "./cast";
import {
  FPS, SHOTS, camAt, V3, FOREGROUND, ShotDef, FIELD, FENCE_Z, HOUSE, TRACK_Z, DAM, DAM_R, KICK_X, truckArrive, truckDriveX, truckChaseX, truckLeaveX,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({});

// ---------------- painted textures ----------------
const dirtTex = () => ctex("dirt", 1024, 1024, (g, r) => {
  g.fillStyle = "#c27a4a"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 900; i++) {
    const x = r() * 1024, y = r() * 1024, s = 6 + r() * 26;
    g.fillStyle = ["#b86f42", "#cc8755", "#b06a40", "#d3925f", "#a9663c"][i % 5] + "aa";
    g.beginPath(); g.ellipse(x, y, s, s * 0.6, r() * 3, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 220; i++) { // pebbles + dry grass ticks
    const x = r() * 1024, y = r() * 1024;
    if (i % 3) { g.strokeStyle = "rgba(150,140,70,0.75)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4 + r() * 8, y - 14 - r() * 8); g.stroke(); }
    else { g.fillStyle = "rgba(90,50,40,0.6)"; g.beginPath(); g.arc(x, y, 3 + r() * 3, 0, 7); g.fill(); }
  }
});
const trackTex = () => ctex("track", 512, 512, (g, r) => {
  g.fillStyle = "#d9a777"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) { const x = r() * 512, y = r() * 512, s = 4 + r() * 14; g.fillStyle = ["#cf9b6b", "#e2b488", "#c48f60"][i % 3] + "aa"; g.beginPath(); g.ellipse(x, y, s * 1.8, s * 0.5, 0, 0, 7); g.fill(); }
  for (const y of [150, 362]) { g.fillStyle = "rgba(150,95,60,0.35)"; g.fillRect(0, y - 26, 512, 52); } // wheel ruts
});
const fieldTex = () => ctex("fieldFar", 512, 512, (g, r) => {
  g.fillStyle = "#e0b44c"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 16) { g.fillStyle = y % 32 ? "rgba(180,130,40,0.35)" : "rgba(250,220,120,0.35)"; g.fillRect(0, y, 512, 8); }
  for (let i = 0; i < 900; i++) { const x = r() * 512, y = r() * 512; g.strokeStyle = i % 2 ? "rgba(255,230,140,0.6)" : "rgba(160,110,30,0.45)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 12); g.stroke(); }
});
const wheatTex = () => ctex("wheatTuft", 256, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#f2cf68"); gr.addColorStop(0.5, "#e2b44a"); gr.addColorStop(1, "#b88a32");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) { const x = r() * 256, y = r() * 256; g.strokeStyle = i % 3 ? "rgba(255,236,150,0.7)" : "rgba(150,100,30,0.55)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1, y - 20); g.stroke(); }
});
const crateTex = () => ctex("crate", 256, 256, (g) => {
  g.fillStyle = "#a8794c"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(90,55,30,0.5)"; for (let y = 0; y < 256; y += 64) g.fillRect(0, y, 256, 5);
  g.strokeStyle = "#6a4426"; g.lineWidth = 16; g.strokeRect(8, 8, 240, 240);
  g.fillStyle = "#3e4a2e"; g.font = "bold 46px sans-serif"; g.textAlign = "center"; g.fillText(".303", 128, 145); // ammo stencil (calibre, no words)
});
const brassTex = () => ctex("brass", 512, 512, (g, r) => {
  g.fillStyle = "#c8962f"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 700; i++) {
    const x = r() * 512, y = r() * 512, a = r() * 3;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = ["#e8bf55", "#b07d25", "#f2d27a", "#9a6a20"][i % 4]; g.fillRect(-12, -4, 24, 8);
    g.strokeStyle = "rgba(60,40,20,0.6)"; g.lineWidth = 1.5; g.strokeRect(-12, -4, 24, 8);
    g.restore();
  }
});
const waterTex = () => ctex("damWater", 512, 512, (g, r) => {
  g.fillStyle = "#6f8f86"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) { const x = r() * 512, y = r() * 512; g.strokeStyle = i % 4 ? "rgba(200,225,215,0.55)" : "rgba(60,80,75,0.5)"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 20, y - 6, x + 40, y); g.stroke(); }
});
const tinTex = () => ctex("tin", 256, 256, (g) => {
  g.fillStyle = "#b9b5ae"; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) { g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x, 0, 5, 256); g.fillStyle = "rgba(60,60,70,0.25)"; g.fillRect(x + 8, 0, 4, 256); }
  g.fillStyle = "rgba(150,80,40,0.25)"; g.fillRect(0, 200, 256, 56);
});
const truckTex = () => ctex("truckCab", 512, 256, (g) => {
  g.fillStyle = "#8a9a58"; g.fillRect(0, 0, 512, 256);
  g.fillStyle = "#2b3140"; g.fillRect(60, 30, 170, 100); g.fillRect(282, 30, 170, 100); // windows
  g.fillStyle = "rgba(170,200,230,0.35)"; g.fillRect(70, 36, 40, 88); g.fillRect(292, 36, 40, 88);
  g.strokeStyle = "#3a4426"; g.lineWidth = 8; g.strokeRect(50, 20, 190, 230); g.strokeRect(272, 20, 190, 230); // doors
  g.fillStyle = "#e9e2cf"; g.beginPath(); g.arc(128, 190, 26, 0, 7); g.fill(); g.fillStyle = "#8a9a58"; g.beginPath(); g.arc(128, 190, 16, 0, 7); g.fill(); // roundel
});
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

/** every lens position of the film looking at its subject (houses / trees in the way are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 3) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};
/** is (x, z) within r of any lens ray's ground track near the lens? (keeps trees and tufts out of the camera's face) */
let LENSES: V3[] = [];
const nearLens = (x: number, z: number, r: number) => LENSES.some(([px, , pz]) => Math.hypot(px - x, pz - z) < r);
/** tufts in the corridor between a low lens and what it looks at (first 85 % of the way) would cover the subject */
let CORRIDORS: [V3, V3][] = [];
const inCorridor = (x: number, z: number) => CORRIDORS.some(([p, l]) => {
  const dx = l[0] - p[0], dz = l[2] - p[2], L2 = dx * dx + dz * dz || 1, t = ((x - p[0]) * dx + (z - p[2]) * dz) / L2;
  if (t < 0 || t > 0.85) return false;
  return Math.hypot(p[0] + dx * t - x, p[2] + dz * t - z) < 0.9;
});

// ---------------- props ----------------
const M = (x: number, y: number, z: number, yaw = 0, pitch = 0, roll = 0, s = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, "YXZ")), V(s, s, s));

/** Lewis gun pointing along local +z: fat finned barrel shroud, pan magazine on top, butt stock; base at the receiver */
const lewisGun = (b: Batch, m: THREE.Matrix4, iron: THREE.Material, wood: THREE.Material, legs = true, legH = 0.95) => {
  const add = (g: THREE.BufferGeometry, mat: THREE.Material, mm: THREE.Matrix4) => b.add(g, mat, m.clone().multiply(mm));
  const shroud = new THREE.CylinderGeometry(0.065, 0.065, 0.62, 14); shroud.rotateX(Math.PI / 2);
  add(shroud, iron, M(0, legH, 0.42));
  const barrel = new THREE.CylinderGeometry(0.022, 0.022, 0.22, 8); barrel.rotateX(Math.PI / 2);
  add(barrel, iron, M(0, legH, 0.82));
  add(boxGeo(V(-0.05, -0.06, -0.12), V(0.05, 0.06, 0.12)), iron, M(0, legH, 0.02));
  add(new THREE.CylinderGeometry(0.17, 0.17, 0.045, 20), iron, M(0, legH + 0.085, 0.02)); // pan magazine
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), iron, M(0, legH + 0.12, 0.02));
  add(boxGeo(V(-0.035, -0.08, -0.42), V(0.035, 0.03, -0.1)), wood, M(0, legH - 0.02, 0)); // stock
  add(boxGeo(V(-0.02, -0.12, -0.02), V(0.02, 0.0, 0.02)), wood, M(0, legH - 0.04, -0.05)); // grip
  if (legs) for (const [a, c] of [[0, 0.5], [2.2, 0.45], [-2.2, 0.45]] as const) { // tripod
    const leg = new THREE.CylinderGeometry(0.018, 0.022, 1, 6).translate(0, -0.5, 0);
    const len = Math.hypot(legH, c), tilt = Math.atan2(c, legH);
    add(leg, iron, M(0, legH - 0.05, 0.2, a, 0, 0).multiply(new THREE.Matrix4().makeRotationX(-tilt)).multiply(new THREE.Matrix4().makeScale(1, len, 1)));
  }
};

/** 1930s army flatbed truck along local +x: cab, bonnet, grille, round fenders, four wheels, flatbed with rails */
const buildTruck = (gun: boolean) => {
  const b = new Batch(), grp = new THREE.Group();
  const body = lam("truckBody", () => ({ color: "#8a9a58" })), dark = lam("truckDark", () => ({ color: "#2c2e30" })), tyre = lam("tyre", () => ({ color: "#262428" }));
  const hub = lam("hub", () => ({ color: "#8a8a7a" })), wood = lam("bedWood", () => ({ color: "#9c7148" })), cab = lam("truckCab", () => ({ map: truckTex() }));
  const iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 50 }), 0.15);
  b.add(boxGeo(V(-2.6, 0.55, -0.75), V(2.4, 0.75, 0.75)), dark);             // chassis
  b.add(boxGeo(V(0.9, 0.75, -0.8), V(2.0, 2.15, 0.8)), cab);                   // cab
  b.add(boxGeo(V(0.85, 2.15, -0.85), V(2.05, 2.25, 0.85)), body);              // roof
  b.add(boxGeo(V(2.0, 0.75, -0.55), V(3.3, 1.55, 0.55)), body);                // bonnet
  b.add(boxGeo(V(3.3, 0.7, -0.6), V(3.42, 1.6, 0.6)), dark);                   // grille
  for (const s of [-1, 1]) { const l = new THREE.SphereGeometry(0.13, 12, 8); b.add(l, hub, M(3.35, 1.45, s * 0.42)); }
  b.add(boxGeo(V(-2.7, 0.75, -1.05), V(0.85, 0.95, 1.05)), wood);              // bed
  for (const s of [-1, 1]) b.add(boxGeo(V(-2.7, 0.95, s * 1.05 - 0.04), V(0.85, 1.35, s * 1.05 + 0.04)), wood); // side rails
  b.add(boxGeo(V(-2.74, 0.95, -1.05), V(-2.66, 1.35, 1.05)), wood);
  for (const [x, s] of [[2.55, 1], [2.55, -1], [-1.7, 1], [-1.7, -1]] as const) {
    const w = new THREE.CylinderGeometry(0.48, 0.48, 0.3, 20); w.rotateX(Math.PI / 2);
    b.add(w, tyre, M(x, 0.48, s * 0.88));
    const h = new THREE.CylinderGeometry(0.2, 0.2, 0.32, 12); h.rotateX(Math.PI / 2);
    b.add(h, hub, M(x, 0.48, s * 0.9));
    const fen = new THREE.CylinderGeometry(0.62, 0.62, 0.36, 16, 1, true, -Math.PI / 2, Math.PI); fen.rotateX(Math.PI / 2);
    b.add(fen, body, M(x, 0.5, s * 0.88));
  }
  if (gun) {
    b.add(new THREE.CylinderGeometry(0.05, 0.07, 1.0, 8).translate(0, 0.5, 0), iron, M(0.3, 0.95, 0));
    lewisGun(b, M(0.3, 0.95, 0, Math.PI / 2, -0.5), iron, wood, false, 1.0);
  }
  b.build(grp);
  return grp;
};

type Mats = Record<string, THREE.Material>;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private fgs: { o: THREE.Object3D; a: number; b: number }[] = [];
  private truck: THREE.Group; private gunTruck: THREE.Group;
  private posts: { o: THREE.Mesh; x: number; fall: number }[] = [];
  private wires: { o: THREE.Mesh; x0: number }[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private standGun: THREE.Group; private twinGuns: THREE.Group; private damGun: THREE.Group; private crates: THREE.Group; private brass: THREE.Group;
  private pump: THREE.Mesh;
  private tufts: THREE.InstancedMesh[] = [];

  constructor(kit: Kit) {
    const R = this.root, Mt: Mats = {};
    LENSES = SHOTS.flatMap((s) => [s.a, (s.a + s.b) / 2, s.b - 1].map((f) => camAt(s.id, f).pos));
    CORRIDORS = SHOTS.flatMap((s) => [s.a, (s.a + s.b) / 2, s.b - 1].map((f) => camAt(s.id, f))).filter((c) => c.pos[1] < 3 && Math.hypot(c.look[0] - c.pos[0], c.look[2] - c.pos[2]) < 12).map((c) => [c.pos, c.look] as [V3, V3]);
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 32, 16), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1536, 1536);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 110 + (i % 4) * 34, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- ground ----
    const b = new Batch();
    Mt.dirt = lam("dirtM", () => ({ map: rep(dirtTex(), 1, 1) }));
    Mt.track = lam("trackM", () => ({ map: trackTex() }));
    Mt.field = lam("fieldM", () => ({ map: fieldTex() }));
    Mt.mud = lam("mud", () => ({ color: "#8a5a3c" }));
    Mt.mesa = lam("mesa", () => ({ color: "#b8603c" }));
    Mt.post = lam("post", () => ({ color: "#8a6a4a" }));
    Mt.wire = lam("wire", () => ({ color: "#4a4a4e" }));
    Mt.wood = lam("crateWood", () => ({ color: "#a8794c" }));
    Mt.crate = lam("crateM", () => ({ map: crateTex() }));
    Mt.tank = lam("tankM", () => ({ map: tinTex() }));
    Mt.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 50 }), 0.15);
    const plane = (x0: number, x1: number, z0: number, z1: number, y: number, tile: number) => {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / tile, uv.getY(i) * (z1 - z0) / tile);
      return g;
    };
    b.add(plane(-1000, 1000, -1000, 1000, 0, 14), Mt.dirt);
    b.add(plane(-1000, 1000, TRACK_Z - 2.2, TRACK_Z + 2.2, 0.01, 4.4), Mt.track);
    b.add(plane(FIELD.x0, FIELD.x1, FIELD.z0 - 0.5, FIELD.z1, 0.012, 6), Mt.field);
    // dam: muddy bank ring + water
    const ring = new THREE.RingGeometry(DAM_R - 0.5, DAM_R + 3.5, 48); ring.rotateX(-Math.PI / 2);
    b.add(ring, Mt.mud, M(DAM[0], 0.015, DAM[2]));
    // far mesas on the horizon (flat-topped, red)
    const r = rng(77);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r(), d = 480 + r() * 120, w = 60 + r() * 90, h = 14 + r() * 22;
      const g = new THREE.CylinderGeometry(w * 0.42, w * 0.5, h, 7); g.translate(0, h / 2, 0);
      b.add(g, Mt.mesa, M(Math.cos(a) * d, 0, Math.sin(a) * d, r() * 3));
    }
    // fence: posts every 4 m along the field's south edge and both sides; three wires per bay
    const fenceSouth: number[] = [];
    for (let x = FIELD.x0; x <= FIELD.x1; x += 4) fenceSouth.push(x);
    for (const x of fenceSouth) {
      const kicked = x === KICK_X || x === KICK_X - 4;
      const g = boxGeo(V(-0.06, 0, -0.06), V(0.06, 1.25, 0.06));
      if (kicked) { const o = new THREE.Mesh(g, Mt.post); o.castShadow = true; o.receiveShadow = true; o.position.set(x, 0, FENCE_Z); R.add(o); this.posts.push({ o, x, fall: x === KICK_X ? 503 : 526 }); }
      else b.add(g, Mt.post, M(x, 0, FENCE_Z));
    }
    for (let i = 0; i + 1 < fenceSouth.length; i++) for (const h of [0.45, 0.8, 1.12]) {
      const x0 = fenceSouth[i], g = boxGeo(V(0, -0.012, -0.012), V(4, 0.012, 0.012));
      const near = Math.abs(x0 - (KICK_X - 4)) < 0.1 || Math.abs(x0 - KICK_X) < 0.1 || Math.abs(x0 - (KICK_X - 8)) < 0.1;
      if (near) { const o = new THREE.Mesh(g, Mt.wire); o.position.set(x0, h, FENCE_Z); R.add(o); this.wires.push({ o, x0 }); o.userData.h = h; }
      else b.add(g, Mt.wire, M(x0, h, FENCE_Z));
    }
    for (const xs of [FIELD.x0, FIELD.x1]) for (let z = FENCE_Z; z <= FIELD.z1; z += 4) {
      b.add(boxGeo(V(-0.06, 0, -0.06), V(0.06, 1.25, 0.06)), Mt.post, M(xs, 0, z));
      if (z + 4 <= FIELD.z1) for (const h of [0.45, 0.8, 1.12]) b.add(boxGeo(V(-0.012, -0.012, 0), V(0.012, 0.012, 4)), Mt.wire, M(xs, h, z));
    }
    // farmhouse (cream, red tin roof) + verandah posts, water tank, windpump
    setSight(sightLines());
    house(b, HOUSE[0], HOUSE[2], 0, 10, 7, 3.4, 0, 0);
    for (const x of [-5, -2.5, 0, 2.5, 5]) b.add(boxGeo(V(-0.08, 0, -0.08), V(0.08, 2.6, 0.08)), Mt.post, M(HOUSE[0] + x, 0, HOUSE[2] + 5.6));
    b.add(boxGeo(V(-5.4, 2.6, 3.5), V(5.4, 2.75, 5.9)), lam("verandah", () => ({ map: tinTex() })), M(HOUSE[0], 0, HOUSE[2]));
    const tank = new THREE.CylinderGeometry(1.5, 1.5, 2.6, 20); tank.translate(0, 1.3 + 1.4, 0);
    b.add(tank, Mt.tank, M(HOUSE[0] + 8.5, 0, HOUSE[2] + 1));
    b.add(boxGeo(V(-1.2, 0, -1.2), V(1.2, 1.4, 1.2)), Mt.post, M(HOUSE[0] + 8.5, 0, HOUSE[2] + 1));
    const PX = HOUSE[0] - 12, PZ = HOUSE[2] - 4; // windpump tower
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const leg = new THREE.CylinderGeometry(0.05, 0.07, 1, 6).translate(0, 0.5, 0);
      const base = V(PX + sx * 1.1, 0, PZ + sz * 1.1), top = V(PX + sx * 0.2, 9, PZ + sz * 0.2), d = top.clone().sub(base);
      b.add(leg, Mt.iron, new THREE.Matrix4().compose(base, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()), V(1, d.length(), 1)));
    }
    const fan = new THREE.Mesh(new THREE.CircleGeometry(1.6, 18), lam("fan", () => ({ color: "#d9d4c8", side: THREE.DoubleSide })));
    fan.position.set(PX, 9.4, PZ + 0.3); fan.castShadow = true; R.add(fan); this.pump = fan;
    b.add(boxGeo(V(-0.04, -0.04, -1.8), V(0.04, 0.6, -0.2)), Mt.iron, M(PX, 9.3, PZ)); // tail vane
    // gum trees and saltbush (kept out of every lens)
    const tree = (x: number, z: number, h: number, kind: "round" | "tall" | "fat" | "bush") => {
      if (nearLens(x, z, kind === "bush" ? 3 : 7)) return;
      addVeg(b, kind, x, 0, z, h, x * 92.7 + z * 31.3, kind === "bush" ? 2 : 1);
    };
    for (const [x, z, h] of [[HOUSE[0] + 10, HOUSE[2] - 8, 13], [HOUSE[0] - 7, HOUSE[2] - 9, 11], [HOUSE[0] + 16, HOUSE[2] + 3, 10], [DAM[0] - 14, DAM[2] + 18, 12],
      [DAM[0] + 19, DAM[2] - 6, 10], [DAM[0] - 22, DAM[2] - 12, 13], [-150, 30, 12], [-180, -30, 11], [-120, 22, 10], [80, -25, 12], [110, -50, 11], [170, 40, 12],
      [130, 95, 13], [190, 75, 11], [-40, -40, 12], [60, -70, 10], [-230, 10, 13], [-200, 45, 11], [-90, -10, 10], [75, 25, 11]] as const)
      tree(x, z, h, h > 11.5 ? "tall" : "round");
    const rb = rng(5);
    for (let i = 0; i < 260; i++) {
      const x = -300 + rb() * 560, z = -120 + rb() * 240;
      if (x > FIELD.x0 - 2 && x < FIELD.x1 + 2 && z > FENCE_Z - 1 && z < FIELD.z1 + 2) continue;
      if (Math.abs(z - TRACK_Z) < 3.5 || Math.hypot(x - DAM[0], z - DAM[2]) < DAM_R + 4) continue;
      tree(x, z, 0.5 + rb() * 0.6, "bush");
    }
    // hide bushes at the dam
    for (const [x, z, h] of [[-112.3, -78.6, 1.0], [-107.9, -78.8, 0.9]] as const) addVeg(b, "bush", x, 0, z, h, x * 13 + z, 0);
    b.build(R);

    // ---- wheat tufts near the lenses: instanced ellipsoid bundles (smooth normals -> clean ink outlines) ----
    const tuftG = new THREE.SphereGeometry(1, 6, 4); tuftG.scale(0.27, 0.45, 0.27); tuftG.translate(0, 0.36, 0);
    const tuftM = lam("wheatTuftM", () => ({ map: wheatTex() }));
    const regions: [number, number, number, number, boolean][] = [
      [-14, 14, 10, 32, false], [0, 20, 10, 20, false], [-44, -16, 18, 46, true], [-30, -10, 10, 18, false], [-60, -34, 26, 62, false], [-8, 18, 10, 28, false],
    ];
    const seen = new Set<string>();
    for (const [x0, x1, z0, z1, trampled] of regions) {
      const pts: THREE.Matrix4[] = [], rr = rng(x0 * 7 + z0 * 13 + 1000);
      for (let x = x0; x < x1; x += 0.62) for (let z = z0; z < z1; z += 0.62) {
        const k = `${Math.round(x / 0.62)}|${Math.round(z / 0.62)}`;
        if (seen.has(k)) continue; seen.add(k);
        const px = x + (rr() - 0.5) * 0.4, pz = z + (rr() - 0.5) * 0.4;
        if (pz < FIELD.z0 + 0.2 || nearLens(px, pz, 1.1) || inCorridor(px, pz)) continue;
        const flat = trampled && Math.hypot(px + 29.5, pz - 31) < 5.5 && rr() < 0.7;
        const s = 0.85 + rr() * 0.35;
        pts.push(M(px, 0, pz, rr() * 6, flat ? 1.2 * (rr() - 0.5) : 0.12 * (rr() - 0.5), flat ? 1.3 * (rr() - 0.5) : 0.12 * (rr() - 0.5), 1).multiply(new THREE.Matrix4().makeScale(s, flat ? 0.35 * s : s, s)));
      }
      const im = new THREE.InstancedMesh(tuftG, tuftM, pts.length);
      pts.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = false; im.receiveShadow = true;
      im.computeBoundingSphere();
      R.add(im); this.tufts.push(im);
    }

    // ---- dam water ----
    const water = new THREE.Mesh(new THREE.CircleGeometry(DAM_R, 48).rotateX(-Math.PI / 2), lam("damWaterM", () => ({ map: rep(waterTex(), 3, 3) })));
    water.position.set(DAM[0], 0.03, DAM[2]); water.receiveShadow = true; R.add(water);

    // ---- props posed per shot ----
    this.truck = buildTruck(false); this.gunTruck = buildTruck(true);
    for (const t of [this.truck, this.gunTruck]) { t.visible = false; R.add(t); }
    const gb = (fn: (b: Batch) => void) => { const bb = new Batch(), g = new THREE.Group(); fn(bb); bb.build(g); g.visible = false; R.add(g); return g; };
    const gunWood = lam("gunWood", () => ({ color: "#7a4b2a" }));
    this.standGun = gb((bb) => lewisGun(bb, M(-2.4, 0, 2.6, 0.27), Mt.iron, gunWood, true, 1.0));
    this.twinGuns = gb((bb) => { lewisGun(bb, M(0.05, 0, -8.7, 0.7), Mt.iron, gunWood, true, 0.55); lewisGun(bb, M(1.15, 0, -8.6, 0.35), Mt.iron, gunWood, true, 0.55); });
    this.damGun = gb((bb) => lewisGun(bb, M(-110, 0, -78.7, 0), Mt.iron, gunWood, true, 0.95));
    this.crates = gb((bb) => {
      const L = [[5, 0], [4, 0.6], [3, 1.2], [2, 1.8], [1, 2.4]] as const;
      L.forEach(([n, y], row) => { for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
        const x = -3 - (n - 1) * 0.5 + i * 1.0 + (row % 2 ? 0.05 : 0), z = -9.6 + j * 0.7;
        bb.add(boxGeo(V(-0.48, 0, -0.33), V(0.48, 0.58, 0.33)), Mt.crate, M(x, y, z, (i * 7 + j) % 3 * 0.04));
      } });
    });
    this.brass = gb((bb) => {
      const cone = new THREE.ConeGeometry(1.4, 1.0, 24); cone.translate(0, 0.5, 0);
      bb.add(cone, lam("brassM", () => ({ map: rep(brassTex(), 2, 1) })), M(0.1, 0, -6.2));
      for (const [x, z, a] of [[-2.2, -6.0, 0.3], [2.4, -6.6, -0.4], [-2.7, -8.8, 1.1]] as const) bb.add(boxGeo(V(-0.48, 0, -0.33), V(0.48, 0.58, 0.33)), Mt.crate, M(x, 0, z, a));
      const lid = boxGeo(V(-0.48, 0, -0.33), V(0.48, 0.05, 0.33)); bb.add(lid, Mt.wood, M(1.6, 0, -5.2, 0.8, 0, 0.1));
    });
    for (const fg of FOREGROUND) {
      const o = kitClone(kit, fg.kit, fg.s ?? 1) ?? (() => { const bb = new Batch(), g = new THREE.Group(); addVeg(bb, "bush", 0, 0, 0, fg.s ?? 1, 11, 0); bb.build(g, false); return g; })();
      o.position.set(...fg.pos); o.rotation.y = fg.yaw ?? 0; o.visible = false;
      this.fgs.push({ o, a: fg.a, b: fg.b }); R.add(o);
    }
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private poseProps(id: number, f: number) {
    const set = SHOTS[id - 1].set;
    const T = this.truck, G = this.gunTruck;
    T.visible = G.visible = false;
    const place = (o: THREE.Group, x: number, z: number, yaw = 0, y = 0, pitch = 0, roll = 0) => { o.visible = true; o.position.set(x, y, z); o.rotation.set(roll, yaw, pitch, "YXZ"); };
    if (set === "arrive") place(T, truckArrive(f), TRACK_Z);
    else if (set === "guns" || set === "crates" || set === "major") place(T, -9, TRACK_Z, 0.1);
    else if (set === "gunTruck") place(G, truckDriveX(f), TRACK_Z);
    else if (set === "chase" || set === "bumpy") { const b = truckBump(f); place(G, truckChaseX(f), -30, 0, b.y, b.pitch, b.roll); }
    else if (set === "tired") place(G, 0.5, TRACK_Z + 0.6, 0.15);
    else if (set === "leave") place(G, truckLeaveX(f), TRACK_Z, Math.PI);
    this.standGun.visible = set === "standoff";
    this.twinGuns.visible = set === "guns";
    this.damGun.visible = set === "damWide" || set === "ambush" || set === "fire" || set === "jam";
    this.crates.visible = set === "crates" || set === "guns" || set === "major";
    this.brass.visible = set === "tired" || set === "tally";
    // kicked fence posts fall over (pivot at the base, toward the field), their wires sag
    const after = id > 10 || (id === 10 && f >= 0);
    for (const p of this.posts) {
      const u = id < 10 ? 0 : id > 10 ? 1 : Math.min(1, Math.max(0, (f - p.fall) / 6));
      p.o.rotation.set(-1.45 * u * u, 0, 0.2 * u);
    }
    for (const w of this.wires) {
      const broken = after && (id > 10 || f >= 503) && (Math.abs(w.x0 - KICK_X) < 0.1 || Math.abs(w.x0 - (KICK_X - 4)) < 0.1)
        || after && (id > 10 || f >= 526) && Math.abs(w.x0 - (KICK_X - 8)) < 0.1;
      const h = w.o.userData.h as number;
      w.o.position.y = broken ? 0.06 + h * 0.08 : h; w.o.rotation.z = broken ? 0.02 : 0;
    }
    this.pump.rotation.z = (f / FPS) * 2.2;
    const low = camAt(id, f).pos[1] < 8;
    for (const t of this.tufts) t.visible = low;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.15; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;
    this.poseProps(id, f);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, { pos: cam.position, right, sun: sunDir, light: s.light });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 2.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (let i = 0; i < fi; i++) this.fxs[i].bind();
    return focus;
  }
}
