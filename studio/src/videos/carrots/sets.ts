// Sets of "Carrots" (10 s). Five small places, each stacked for a 9:16 frame:
//   sky      a night fighter over blacked-out fields, a bomber in a searchlight, tracers        (night)
//   radar    the hut with the set that really did it: a green scope and a TOP SECRET plate      (explain)
//   ministry the Ministry of Food, a surplus of crates and a covered easel                      (interior)
//   spy      a desk somewhere in Germany, one carrot under a lamp                               (night)
//   kitchen  your mum's kitchen, the same poster on the wall                                    (golden)
import * as THREE from "three";
import { SetDef } from "../../stage/Stage";
import * as P from "../../stage/props";
import { room } from "../../stage/sets";
import { blob, planks, sign, tiles } from "../../stage/paint";
import { aim, fit } from "../../stage/frame";
import { Cam } from "../../stage/camera";
import { G, INK, V3, ctex, hash, lerp, rng, shade } from "../../stage/util";

const { put, dress, group } = P;
/** frames the sets animate on; film.ts fills them in from the words */
export const TIMES = { hit: 78, ping: 140, reveal: 203 };
const ease = (u: number) => { const x = Math.max(0, Math.min(1, u)); return 1 - (1 - x) ** 3; };

// ---------------------------------------------------------------- lettering and effect cards
const star = (g: G, cx: number, cy: number, n: number, r0: number, r1: number, fill: string, lw = 10) => {
  g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - 0.3, r = i % 2 ? r1 : r0; i ? g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.closePath(); g.fillStyle = fill; g.fill(); if (lw) { g.strokeStyle = INK; g.lineWidth = lw; g.lineJoin = "round"; g.stroke(); }
};
const glyph = (key: string, ch: string, col: string) => sign(key, 128, 160, "#00000000", [], "#00000000", (g) => { g.font = "800 150px Poppins, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.strokeStyle = INK; g.lineWidth = 16; g.strokeText(ch, 64, 84); g.fillStyle = col; g.fillText(ch, 64, 84); });
const drawCarrot = (g: G, x: number, y: number, s: number) => { // a carrot standing on its point, s = height in px
  g.save(); g.translate(x, y);
  g.fillStyle = "#4f9a48"; g.strokeStyle = INK; g.lineWidth = 6; g.lineJoin = "round";
  for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.ellipse(Math.sin(a) * s * 0.16, -s * 0.5 - Math.cos(a) * s * 0.16, s * 0.07, s * 0.2, a, 0, 7); g.fill(); g.stroke(); }
  g.beginPath(); g.moveTo(-s * 0.2, -s * 0.44); g.quadraticCurveTo(0, -s * 0.56, s * 0.2, -s * 0.44); g.quadraticCurveTo(s * 0.12, s * 0.2, 0, s * 0.5); g.quadraticCurveTo(-s * 0.12, s * 0.2, -s * 0.2, -s * 0.44); g.closePath();
  g.fillStyle = "#f08a2a"; g.fill(); g.stroke();
  g.strokeStyle = "#c8601a"; g.lineWidth = 4; for (const k of [-0.22, 0.0, 0.2]) { g.beginPath(); g.moveTo(-s * 0.1, s * k); g.lineTo(s * 0.02, s * (k + 0.03)); g.stroke(); }
  g.restore();
};
export const TEX = {
  /** the poster the Ministry unveils, and the one on the kitchen wall (our own wording, not the 1941 original) */
  carrots: () => sign("ca-poster", 512, 666, "#f3ead2", [{ t: "CARROTS", size: 104, y: 82, col: "#d2601a" }, { t: "SEE IN THE DARK", size: 52, y: 606, col: "#27304a" }], "#27304a", (g) => {
    g.fillStyle = "#1b2a66"; g.fillRect(40, 150, 432, 400);
    g.fillStyle = "#ffe16a"; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(256 + s * 26, 318); g.lineTo(256 + s * 200, 180); g.lineTo(256 + s * 200, 330); g.closePath(); g.fill(); } // two beams from its eyes
    g.fillStyle = "#ffffff"; for (let i = 0; i < 9; i++) g.fillRect(60 + ((i * 97) % 400), 165 + ((i * 53) % 110), 5, 5);
    drawCarrot(g, 256, 360, 330);
    for (const s of [-1, 1]) { g.beginPath(); g.arc(256 + s * 28, 318, 20, 0, 7); g.fillStyle = "#ffffff"; g.fill(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke(); g.beginPath(); g.arc(256 + s * 28, 320, 8, 0, 7); g.fillStyle = INK; g.fill(); }
  }),
  ministry: () => sign("ca-ministry", 512, 150, "#27304a", [{ t: "MINISTRY OF FOOD", size: 70, y: 78, col: "#f2c230" }], "#f2c230"),
  topSecret: () => sign("ca-secret", 512, 200, "#f3ead2", [{ t: "TOP SECRET", size: 96, y: 104, col: "#b9302a" }], "#b9302a"),
  karotten: () => sign("ca-karotten", 512, 160, "#e6d6a8", [{ t: "KAROTTEN ?", size: 92, y: 84, col: "#3a2414" }], "#3a2414"),
  shh: () => sign("ca-shh", 256, 320, "#e6d6a8", [{ t: "SHHH!", size: 84, y: 250, col: "#b9302a" }], "#3a2414", (g) => { g.beginPath(); g.arc(128, 110, 70, 0, 7); g.fillStyle = "#fbf5ea"; g.fill(); g.strokeStyle = INK; g.lineWidth = 9; g.stroke(); g.beginPath(); g.moveTo(128, 60); g.lineTo(128, 160); g.lineWidth = 16; g.lineCap = "round"; g.stroke(); }),
  bang: () => glyph("ca-bang", "!", "#ffe16a"),
  q: () => glyph("ca-q", "?", "#ffffff"),
  boom: () => sign("ca-boom", 256, 256, "#00000000", [], "#00000000", (g) => { star(g, 128, 128, 11, 122, 70, "#ff8a2a"); star(g, 128, 128, 9, 82, 44, "#ffe16a", 0); star(g, 128, 128, 7, 44, 20, "#ffffff", 0); }),
  ping: () => sign("ca-ping", 256, 256, "#00000000", [], "#00000000", (g) => { g.strokeStyle = "#c8ffd0"; g.lineCap = "round"; g.lineWidth = 12; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 78, 128 + Math.sin(a) * 78); g.lineTo(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118); g.stroke(); } g.lineWidth = 9; g.beginPath(); g.arc(128, 128, 58, 0, 7); g.stroke(); }),
};

// ---------------------------------------------------------------- shared small props
const carrotSkin = () => ctex("ca-carrot", 64, 64, (g) => { g.fillStyle = "#f08a2a"; g.fillRect(0, 0, 64, 64); g.strokeStyle = "#c8601a"; g.lineWidth = 3; for (let y = 6; y < 64; y += 12) { g.beginPath(); g.moveTo(4 + (y % 24), y); g.lineTo(34 + (y % 24), y + 2); g.stroke(); } });
/** a carrot lying along x, point toward -x, green top at +x */
export const carrot = (len = 0.5) => {
  const r = len * 0.17, geo = new THREE.ConeGeometry(r, len, 9); geo.rotateZ(Math.PI / 2); geo.translate(0, r, 0);
  const g = group(P.inked(geo, P.lit(carrotSkin())));
  for (const a of [-0.5, 0, 0.5]) { const leaf = new THREE.SphereGeometry(len * 0.09, 7, 5); leaf.scale(2.4, 0.7, 0.7); g.add(put(P.inked(leaf, P.lit("#4f9a48")), len * 0.5 + len * 0.16 * Math.cos(a), r + len * 0.16 * Math.sin(a), 0, 0, 0, a)); }
  return g;
};
const carrotHeap = (n: number, len: number, seed: number) => { const r = rng(seed), g = group(P.cyl(len * 0.75, len * 0.6, 0.03, "#e8e2d2", 14)); for (let i = 0; i < n; i++) g.add(put(carrot(len), (r() - 0.5) * len * 0.3, 0.03 + (i > 2 ? len * 0.2 : 0), (r() - 0.5) * len * 0.7, r() * 6.3)); return g; };

// ---------------------------------------------------------------- 1. the night sky
export const ALT = 30; // the fighter flies at y = ALT; the fields are at y = 0
export const SEAT: V3 = [0.2, ALT - 0.2, 0];
/** where the pilot sits at frame f (the aircraft bobs) */
const bobY = (f: number) => 0.07 * Math.sin(f * 0.17);
export const seat = (f: number): V3 => [SEAT[0], SEAT[1] + bobY(f), SEAT[2]];
const PILOT = { at: SEAT, h: 1.6 };
/** the three framings of the hook. The bomber, the moon and the clouds are placed THROUGH these cameras, so the
 *  sky is composed for the 9:16 frame instead of being hoped into it. */
export const CAM_A0: Cam = fit([PILOT], { yaw: -82, pitch: 15, fill: 0.3, cy: 0.52, roll: 0.11 });
export const CAM_A: Cam = fit([PILOT], { yaw: -62, pitch: 9, fill: 0.4, cy: 0.52, roll: 0.07 });
export const CAM_B: Cam = fit([PILOT], { yaw: -30, pitch: -10, fill: 0.5, cy: 0.47, roll: -0.08 });
const scratch = new THREE.PerspectiveCamera();
/** the world point seen at (nx, ny) of the frame (-1..1, y up) by camera c, `dist` metres out */
export const spot = (c: Cam, nx: number, ny: number, dist: number): V3 => { aim(scratch, c); const v = new THREE.Vector3(nx, ny, 0.5).unproject(scratch).sub(scratch.position).normalize(); return scratch.position.clone().addScaledVector(v, dist).toArray() as V3; };
const B0 = spot(CAM_A, 0.3, 0.6, 26), BA = spot(CAM_A, 0.62, 0.3, 30), B1 = spot(CAM_B, 0.52, 0.74, 30), B2 = spot(CAM_B, 0.6, 0.5, 32);
export const TURN = { f: 97 }; // the frame the camera swings round to framing B (film.ts sets it)
/** the bomber: steady in the searchlight until it is hit, then down and astern */
export const bomberAt = (f: number): V3 => {
  if (f >= TURN.f) { const u = Math.min(1, (f - TURN.f) / 30); return [lerp(B1[0], B2[0], u), lerp(B1[1], B2[1], u), lerp(B1[2], B2[2], u)]; }
  const u = Math.max(0, Math.min(1, (f - TIMES.hit) / 24)) ** 1.6;
  return [lerp(B0[0], BA[0], u), lerp(B0[1], BA[1], u) + (f < TIMES.hit ? 0.2 * Math.sin(f * 0.09) : 0), lerp(B0[2], BA[2], u)];
};
const camo = (a: string, b: string, key: string, rep: [number, number]) => ctex(`ca-camo${key}`, 256, 256, (g, r) => {
  g.fillStyle = a; g.fillRect(0, 0, 256, 256);
  g.fillStyle = b; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(r() * 256, r() * 256, 40 + r() * 50, 18 + r() * 26, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = shade(a, 0.62); g.lineWidth = 3; for (const x of [64, 150, 220]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } g.beginPath(); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
  g.fillStyle = shade(a, 0.5); for (let i = 0; i < 40; i++) g.fillRect(64 + ((i * 37) % 3) * 80 + 6, (i * 13) % 256, 3, 3); // rivets
}, rep);
const roundel = () => sign("ca-roundel", 128, 128, "#00000000", [], "#00000000", (g) => { for (const [r, c] of [[62, "#e8c230"], [50, "#27408a"], [34, "#f3ead2"], [17, "#c8413a"]] as const) { g.beginPath(); g.arc(64, 64, r, 0, 7); g.fillStyle = c; g.fill(); } });
/** a tube along x, radius r0 at the tail end and r1 at the nose end */
const tube = (r0: number, r1: number, len: number, m: THREE.Texture | string) => { const geo = new THREE.CylinderGeometry(r1, r0, len, 14); geo.rotateZ(-Math.PI / 2); return P.inked(geo, P.lit(m)); };
const propeller = () => { const g = group(); for (const a of [0, Math.PI / 2]) { const geo = new THREE.BoxGeometry(0.04, 1.6, 0.15); const m = new THREE.Mesh(geo, P.lit("#2a2a30")); m.rotation.x = a; g.add(m); } const sp = new THREE.SphereGeometry(0.14, 10, 8); sp.scale(1.5, 1, 1); g.add(P.inked(sp, P.lit("#e8c230"))); return g; };
/** a stubby twin-engined night fighter, nose toward +x, origin on the fuselage axis under the cockpit */
const fighter = () => {
  const skin = camo("#5d6b4a", "#6e5a40", "f", [2, 1]), wingSkin = camo("#5d6b4a", "#6e5a40", "w", [1, 3]);
  const g = group(put(tube(0.52, 0.55, 2.8, skin), 0.8, 0, 0), put(tube(0.16, 0.52, 2.4, skin), -1.8, 0, 0));
  const nose = new THREE.SphereGeometry(0.55, 14, 10); nose.scale(1.3, 1, 1); g.add(put(P.inked(nose, P.lit(shade("#5d6b4a", 0.8))), 2.2, 0, 0));
  g.add(put(P.box(1.5, 0.12, 6.4, wingSkin), 0.5, -0.38, 0), put(P.box(0.8, 0.07, 2.4, wingSkin), -2.7, 0.1, 0), put(P.box(0.9, 1.0, 0.07, skin), -2.7, 0.15, 0));
  const rim = new THREE.TorusGeometry(0.4, 0.06, 6, 16); rim.rotateX(Math.PI / 2); rim.scale(1.35, 1, 1); g.add(put(P.inked(rim, P.lit("#3a2f28")), 0.2, 0.5, 0));
  g.add(put(P.box(0.04, 0.26, 0.56, "#56687a"), 0.95, 0.5, 0, 0, 0, -0.35)); // windscreen
  const props: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    g.add(put(tube(0.3, 0.34, 1.5, shade("#5d6b4a", 0.85)), 1.0, -0.22, s * 1.7));
    const pr = put(propeller(), 1.8, -0.22, s * 1.7); props.push(pr); g.add(pr);
    g.add(put(P.card(0.62, 0.62, roundel()), -1.25, -0.31, s * 0.44, s > 0 ? 0 : Math.PI), put(P.card(0.95, 0.95, roundel(), { floor: true }), 0.5, -0.25, s * 2.35));
    g.add(put(P.cyl(0.035, 0.035, 0.5, "#2a2a30", 6, false), 1.3, -0.32, s * 0.95, 0, 0, -Math.PI / 2)); // gun barrels
  }
  // the arrowhead aerial on the nose: the one outside clue to what is in the box behind the pilot
  g.add(put(P.cyl(0.02, 0.02, 0.8, "#c8ccd0", 5, false), 2.85, 0, 0, 0, 0, -Math.PI / 2));
  for (const s of [-1, 1]) g.add(put(P.cyl(0.018, 0.018, 0.55, "#c8ccd0", 5, false), 3.6, 0, 0, 0, s * 0.6, Math.PI / 2));
  return { g, props };
};
const bomber = () => {
  const skin = camo("#9aa8b4", "#7f8c98", "b", [2, 1]);
  const g = group(tube(0.3, 0.75, 7, skin), put(P.box(2.0, 0.16, 9, skin), 0.4, -0.3, 0), put(P.box(1.0, 0.1, 3.4, skin), -3.2, 0.1, 0), put(P.box(1.1, 1.3, 0.1, skin), -3.2, 0.1, 0));
  const nose = new THREE.SphereGeometry(0.75, 12, 8); nose.scale(1.2, 1, 1); g.add(put(P.inked(nose, P.lit("#9fd0e8")), 3.5, 0, 0));
  for (const s of [-1, 1]) g.add(put(tube(0.4, 0.46, 2.0, shade("#9aa8b4", 0.8)), 1.1, -0.2, s * 2.1));
  const fire = group();
  for (const [r, h, c] of [[0.75, 3.2, "#ff8a2a"], [0.45, 2.2, "#ffe16a"]] as const) { const geo = new THREE.ConeGeometry(r, h, 8); geo.rotateZ(Math.PI / 2); geo.translate(-h / 2, 0, 0); fire.add(new THREE.Mesh(geo, P.glow(c))); }
  fire.position.set(0.4, 0, 2.1); g.add(fire);
  return { g, fire };
};
const nightCloud = (w: number, seed: number) => {
  const r = rng(seed), g = group(), body = new THREE.MeshBasicMaterial({ color: "#35428c", fog: false }), top = new THREE.MeshBasicMaterial({ color: "#7d8fe0", fog: false }), mid = new THREE.MeshBasicMaterial({ color: "#5566b8", fog: false });
  for (let i = 0; i < 5; i++) {
    const rad = w * (0.15 + r() * 0.1), x = (i - 2) * w * 0.2, y = r() * w * 0.05;
    const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8).scale(1.5, 0.75, 0.6), body); b.position.set(x, y, 0); g.add(b);
    const m = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.8, 10, 8).scale(1.4, 0.6, 0.6), mid); m.position.set(x - rad * 0.2, y + rad * 0.3, -rad * 0.1); g.add(m);
    const t = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.5, 8, 6).scale(1.4, 0.5, 0.6), top); t.position.set(x - rad * 0.35, y + rad * 0.52, -rad * 0.2); g.add(t);
  }
  return g;
};
const UP = new THREE.Vector3(0, 1, 0);
const beam = (r = 2) => { const geo = new THREE.CylinderGeometry(r, 0.3, 1, 14, 1, true); geo.translate(0, 0.5, 0); return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: "#aebcff", transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); };
const aimBeam = (m: THREE.Mesh, from: V3, to: V3, k = 1.3) => { const a = new THREE.Vector3(...from), d = new THREE.Vector3(...to).sub(a); m.position.copy(a); m.scale.set(1, d.length() * k, 1); m.quaternion.setFromUnitVectors(UP, d.normalize()); };
const fields = () => ctex("ca-fields", 512, 512, (g, r) => {
  g.fillStyle = "#131b4c"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = ["#182560", "#0f1640", "#1d2c6e", "#141e54"][Math.floor(r() * 4)]; g.fillRect(x * 128 + 4, y * 128 + 4, 120, 120); if (r() < 0.5) { g.strokeStyle = "#1c2866"; g.lineWidth = 3; for (let k = 14; k < 120; k += 26) { g.beginPath(); g.moveTo(x * 128 + 6, y * 128 + k); g.lineTo(x * 128 + 122, y * 128 + k); g.stroke(); } } }
  g.strokeStyle = "#2b3a84"; g.lineWidth = 6; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); } // hedgerows
  g.strokeStyle = "#5870d0"; g.lineWidth = 14; g.lineCap = "round"; g.beginPath(); g.moveTo(0, 300); g.bezierCurveTo(140, 220, 260, 420, 512, 300); g.stroke(); // a river catching the moon
  g.fillStyle = "#0b1030"; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(r() * 512, r() * 512, 9 + r() * 9, 0, 7); g.fill(); } // trees
}, [16, 16]);
export const sky = (): SetDef => {
  const g = group();
  const land = new THREE.Mesh(new THREE.PlaneGeometry(800, 800).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: fields(), fog: false })); g.add(land);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(13, 16, 12), P.glow("#fff6d0")); moon.position.set(...spot(CAM_A, -0.55, 0.84, 300)); g.add(moon);
  const moon2 = new THREE.Mesh(new THREE.SphereGeometry(11, 16, 12), P.glow("#fff6d0")); moon2.position.set(...spot(CAM_B, -0.5, 0.74, 300)); g.add(moon2);
  // clouds composed for each framing: [camera, x, y, distance]
  const cl: [Cam, number, number, number][] = [[CAM_A, -0.75, 0.38, 60], [CAM_A, 0.8, 0.3, 75], [CAM_A, -0.15, 0.2, 110], [CAM_A, 0.62, -0.2, 55], [CAM_A, -0.8, -0.3, 48], [CAM_A, 0.85, 0.86, 90], [CAM_A, 0.72, -0.72, 40], [CAM_A, -0.3, -0.86, 36],
    [CAM_B, -0.72, 0.5, 55], [CAM_B, 0.74, -0.05, 60], [CAM_B, -0.55, -0.3, 46], [CAM_B, 0.3, 0.88, 85], [CAM_B, 0.7, -0.62, 42], [CAM_B, -0.78, -0.8, 40], [CAM_B, 0.05, 0.16, 120]];
  cl.forEach(([c, x, y, d], i) => { const p = spot(c, x, y, d), o = nightCloud(d * 0.2, i + 3); o.position.set(...p); o.lookAt(c.pos[0], p[1], c.pos[2]); g.add(o); });
  const { g: plane, props } = fighter(); g.add(plane);
  const { g: bm, fire } = bomber(); bm.scale.setScalar(0.8); g.add(bm);
  const smoke = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.45 + i * 0.1, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? "#59608a" : "#454c74", fog: false })); g.add(m); return m; });
  const tracers = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 0.09), P.glow("#ffe98a")); g.add(m); return m; });
  const flashes = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), P.glow("#fff1b8")); m.scale.set(1.8, 1, 1); plane.add(put(m, 1.7, -0.32, s * 0.95)); return m; });
  const beams = [beam(2.2), beam(1.6), beam(1.8), beam(1.6)]; beams.forEach((b) => g.add(b));
  const X = new THREE.Vector3(1, 0, 0);
  return { root: g, tick: (f) => {
    plane.position.set(0, ALT + bobY(f), 0); plane.rotation.x = 0.035 * Math.sin(f * 0.11);
    props.forEach((p, i) => { p.rotation.x = f * 1.3 + i; });
    const b = bomberAt(f), hit = f >= TIMES.hit, since = f - TIMES.hit;
    bm.position.set(...b); bm.rotation.set(hit ? 0.5 * ease(since / 30) + 0.02 * since : 0.04 * Math.sin(f * 0.07), 0, hit ? -0.35 * ease(since / 30) : 0);
    fire.visible = hit; fire.scale.setScalar(0.8 + 0.3 * hash(Math.floor(f), 3));
    smoke.forEach((m, i) => { m.visible = hit && since > 1 + i * 2; m.position.set(b[0] - 1.2 - i * 0.75, b[1] + 0.6 + i * 0.75 + 0.1 * Math.sin(f * 0.3 + i), b[2] + 1.6); });
    const firing = f < TIMES.hit + 1;
    tracers.forEach((m, i) => {
      const s = i % 2 ? 1 : -1, u = (((f * 0.085 + i / 8) % 1) + 1) % 1, from = new THREE.Vector3(1.7, ALT - 0.32, s * 0.95), dir = new THREE.Vector3(...B0).sub(from);
      m.visible = firing; m.position.copy(from).addScaledVector(dir, 0.04 + u * 0.92); m.quaternion.setFromUnitVectors(X, dir.normalize()); m.scale.set(0.7 + u * 1.2, 0.7 + u * 1.6, 0.7 + u * 1.6);
    });
    flashes.forEach((m, i) => { m.visible = firing && (Math.floor(f) + i) % 2 === 0; });
    aimBeam(beams[0], [B0[0] - 7, 0, B0[2] + 4], B0, 1.5);
    aimBeam(beams[1], [B0[0] + 30, 0, B0[2] - 40], [B0[0] + 12 + 10 * Math.sin(f * 0.03), ALT + 20, B0[2] - 30]);
    aimBeam(beams[2], [B1[0] - 12, 0, B1[2] - 18], [B1[0] - 6 + 5 * Math.sin(f * 0.04), ALT + 8, B1[2] - 6], 1.8);
    aimBeam(beams[3], [B1[0] + 16, 0, B1[2] - 30], [B1[0] + 3 - 5 * Math.sin(f * 0.035), ALT + 14, B1[2] - 12], 1.8);
  } };
};

// ---------------------------------------------------------------- 2. the radar hut
export const SCOPE: V3 = [-0.25, 2.2, -0.98];
export const BOFFIN_AT: V3 = [0.6, 0, -0.45];
const metal = (c: string, rep: [number, number]) => ctex(`ca-metal${c}`, 256, 256, (g, r) => {
  g.fillStyle = c; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 16; i++) { g.fillStyle = shade(c, 0.9 + r() * 0.2) + "88"; g.fillRect(r() * 256, r() * 256, 40 + r() * 60, 6 + r() * 10); }
  g.strokeStyle = shade(c, 0.6); g.lineWidth = 5; g.strokeRect(6, 6, 244, 244);
  g.fillStyle = shade(c, 1.4); for (let i = 0; i < 6; i++) for (const y of [18, 238]) { g.beginPath(); g.arc(22 + i * 42, y, 5, 0, 7); g.fill(); }
}, rep);
const scopeFace = () => ctex("ca-scope", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, "#1f7a44"); gr.addColorStop(1, "#0a2a16"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#3fb86a"; g.lineWidth = 2; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(i * 43, 0); g.lineTo(i * 43, 256); g.moveTo(0, i * 43); g.lineTo(256, i * 43); g.stroke(); }
  g.strokeStyle = "#b8ffc8"; g.lineWidth = 6; g.beginPath(); g.moveTo(128, 14); g.lineTo(128, 242); g.stroke(); // the time base of a 1940 set: a bright vertical line
});
export const radar = (): SetDef => {
  const g = room({ w: 5, d: 3.4, h: 3.6, wall: "#3d4f5c", dado: "#2a3640", floor: planks("#4a4a5a", 6, false, [2.5, 1.7]) });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28), new THREE.MeshBasicMaterial({ map: scopeFace(), fog: false }));
  const bezel = new THREE.TorusGeometry(0.53, 0.07, 8, 24);
  const blips = Array.from({ length: 6 }, (_, i) => new THREE.Mesh(new THREE.BoxGeometry(1, 0.035, 0.01), P.glow(i === 2 ? "#eaffee" : "#9dffb0")));
  dress(g, [
    [P.box(1.3, 2.85, 0.6, metal("#55606c", [1, 2])), [-0.25, 0, -1.3]],
    [face, [SCOPE[0], SCOPE[1], SCOPE[2] + 0.01]],
    [P.inked(bezel, P.lit("#2a2f38")), [SCOPE[0], SCOPE[1], SCOPE[2] + 0.02]],
    [P.framed(0.9, 0.36, TEX.topSecret(), "#8a2a22"), [-0.35, 1.02, -0.97]],
    [P.box(1.1, 0.07, 0.2, "#2a2f38"), [-0.25, 0.86, -0.92]],
    [P.box(0.08, 0.7, 0.08, "#c8ccd0"), [0.15, 2.85, -1.3]], [P.box(0.6, 0.05, 0.05, "#c8ccd0"), [0.15, 3.3, -1.3]], [P.box(0.6, 0.05, 0.05, "#c8ccd0"), [0.15, 3.5, -1.3]],
    [P.crate(0.55, "VALVES"), [-0.15, 0, -0.35], 0.3],
    [P.crate(0.42, "SPARES", "#a9713c"), [-1.05, 0, -0.5], -0.2],
    [P.shelf(1.0, 2.1, 5, "#3a3f4a"), [-1.95, 0, -1.5]],
    [P.shelf(0.9, 1.6, 9, "#3a3f4a"), [1.85, 0, -1.5]],
    [P.card(0.5, 0.62, TEX.shh()), [1.05, 2.25, -1.68]],
    [P.lampHang(3.58, 0.5, "#8a2a22", 2.6), [1.35, 3.6, -0.7]],
    [P.pipe(2.4, 0.06, "#2a2a30"), [-0.4, 0.03, 0.1], 0.3],
    [P.barrel(0.6, "#4f5a60"), [1.5, 0, 0.1]],
  ]);
  for (let i = 0; i < 4; i++) g.add(put(P.ball(0.055, i % 2 ? "#c9a03a" : "#b9483c"), -0.7 + i * 0.3, 1.5, -0.98));
  blips.forEach((b) => g.add(b));
  return { root: g, tick: (f) => {
    const ping = f >= TIMES.ping;
    blips.forEach((b, i) => { const big = i === 2 && ping, w = big ? 0.36 + 0.06 * hash(Math.floor(f), 9) : 0.05 + 0.14 * hash(Math.floor(f / 2), i); b.scale.set(w, big ? 2.2 : 1, 1); b.position.set(SCOPE[0] + w / 2, SCOPE[1] - 0.36 + i * 0.145, SCOPE[2] + 0.03); });
  } };
};

// ---------------------------------------------------------------- 3. the Ministry of Food
export const OFFICIAL_AT: V3 = [0.55, 0, -0.4];
export const EASEL = { at: [-0.55, 2.15, -0.92] as V3, w: 1.0, h: 1.3 };
export const MIN_SIGN = { at: [0, 3.24, -1.74] as V3, w: 1.5, h: 0.44 };
export const ministry = (): SetDef => {
  const g = room({ w: 6, d: 3.6, h: 4, wall: "#b9a57a", dado: "#5a3a28" });
  const poster = P.poster(EASEL.w, EASEL.h, TEX.carrots()), cloth = P.box(1.16, 1.46, 0.04, planks("#8a2f3a", 9, true));
  dress(g, [
    [P.framed(MIN_SIGN.w, MIN_SIGN.h, TEX.ministry(), "#c9a03a"), [0, 2.96, -1.76]],
    [P.box(0.06, 2.95, 0.06, "#6b4a2d"), [-1.02, 0, -1.02]], [P.box(0.06, 2.95, 0.06, "#6b4a2d"), [-0.08, 0, -1.02]],
    [P.box(1.12, 1.42, 0.05, "#8a6a4a"), [-0.55, 1.44, -1.0]],
    [poster, [-0.55, 1.5, -0.955]],
    [cloth, [-0.55, 1.42, -0.94]],
    [P.box(0.62, 1.0, 0.45, planks("#7a4a28", 3, true)), [-0.6, 0, 0.25]],
    [P.papers(5, 3), [-0.6, 1.0, 0.25]], [P.bell(), [-0.38, 1.0, 0.3]],
    [P.crate(0.62, "SURPLUS"), [-1.4, 0, 0.3], 0.3],
    [P.crate(0.55, "SURPLUS"), [1.35, 0, 0.25], -0.3],
    [P.crate(0.48, "SURPLUS"), [1.4, 0.55, 0.2], 0.2],
    [P.crate(0.55, "SURPLUS"), [-1.9, 0, -0.6], -0.2],
    [P.windowLit(0.9, 1.3, "#bfe3f5", "#f3ead2", "#5a3a28"), [1.75, 1.6, -1.76]],
    [P.shelf(1.1, 1.5, 2), [2.2, 0, -1.55]],
    [P.potPlant(1.0), [1.15, 0, -1.3]],
    [P.lampHang(3.98, 0.45, "#3d6a5a", 3.0), [1.3, 4, -0.5]],
    [P.rug(2.6, 1.5), [0.2, 0.012, 0.3]],
    [P.framed(0.5, 0.62, TEX.shh(), "#5a3a28"), [-1.85, 2.3, -1.76]],
    [P.crate(0.44, "SURPLUS"), [-0.3, 0, 1.15], 0.25],
  ]);
  return { root: g, tick: (f) => {
    const d = f - TIMES.reveal; poster.visible = d >= 0;
    cloth.visible = d < 6; cloth.position.y = 1.42 - Math.max(0, d) * 0.3; cloth.scale.y = Math.max(0.1, 1 - Math.max(0, d) * 0.16);
  } };
};

// ---------------------------------------------------------------- 4. a desk in Germany
export const SPY_AT: V3 = [0.2, 0, -0.5];
export const SPY_SIGN = { at: [-0.1, 2.98, -1.54] as V3, w: 1.3, h: 0.4 };
export const spy = (): SetDef => {
  const standing = group(put(carrot(0.52), 0, 0.26, 0, 0, 0, Math.PI / 2)); // point down, green top up
  const g = room({ w: 5, d: 3.2, h: 3.6, wall: "#4a6a70", dado: "#27353a", floor: planks("#5a4a3a", 6, false, [2.5, 1.6]) });
  dress(g, [
    [P.framed(SPY_SIGN.w, SPY_SIGN.h, TEX.karotten(), "#2f3a36"), [-0.1, 2.72, -1.56]],
    [P.table(1.0, 0.62, 0.45, "#6b4a2d"), [-0.6, 0, 0.5]],
    [P.box(0.42, 0.95, 0.42, planks("#3a2f28", 3, true)), [-0.62, 0, -0.35]],
    [P.cyl(0.24, 0.24, 0.03, "#e8e2d2", 14), [-0.62, 0.95, -0.35]],
    [standing, [-0.62, 0.98, -0.35]],
    [P.book("#b9483c"), [-0.6, 0.45, 0.5], 0.4],
    [P.papers(4, 4), [-0.25, 0.45, 0.42]],
    [P.candle(), [-0.95, 0.45, 0.38]],
    [P.lampHang(3.13, 1.0, "#3d6a5a", 2.4), [-0.6, 3.6, 0.45]],
    [P.card(1.3, 1.3, blob("#ffd98a"), { add: true, opacity: 0.45 }), [-0.62, 0.62, -0.42]],
    [P.shelf(1.1, 2.3, 7, "#3a2f28"), [1.55, 0, -1.4]],
    [P.windowLit(0.8, 1.1, "#1b2a66", "#2f3a44", "#27353a"), [-1.65, 1.5, -1.56]],
    [P.crate(0.55, "GEHEIM", "#8a7a5a"), [1.15, 0, 0.3], -0.3],
    [P.chair("#3a2f28"), [-1.3, 0, -0.7], 0.4],
    [P.rug(2.2, 1.3, "#3d4f5c", "#c9a03a"), [0, 0.012, 0.2]],
    [P.book("#5d6a62"), [0.95, 0.56, 0.3], 0.3],
    [P.basket(0.24), [-1.55, 0, 0.5]],
  ]);
  return { root: g };
};

// ---------------------------------------------------------------- 5. your mum's kitchen
export const MUM_AT: V3 = [0.45, 0, -0.3];
export const KID_AT: V3 = [-0.5, 0, 0.1];
export const KITCHEN_POSTER = { at: [-0.45, 2.42, -1.47] as V3, w: 0.9, h: 1.17 };
export const kitchen = (): SetDef => {
  const g = room({ w: 5, d: 3, h: 3.4, wall: "#e2c48a", dado: "#6a8a7a", floor: tiles("#e8e2d2", "#b9483c", [5, 3]) });
  dress(g, [
    [P.box(1.0, 1.27, 0.03, "#6b4a2d"), [-0.45, 1.8, -1.49]],
    [P.poster(KITCHEN_POSTER.w, KITCHEN_POSTER.h, TEX.carrots()), [-0.45, 1.835, -1.455]],
    [P.table(0.95, 0.6, 0.5), [-0.3, 0, 0.75]],
    [carrotHeap(7, 0.36, 5), [-0.25, 0.5, 0.75]],
    [P.mug("#3d6a8a"), [0.08, 0.5, 0.95]],
    [P.chair(), [-0.5, 0, -0.25]],
    [P.windowLit(0.8, 1.0, "#27304a", "#f3ead2", "#5d7a4a"), [1.5, 1.55, -1.46]],
    [P.shelf(1.0, 1.7, 4), [-1.8, 0, -1.3]],
    [P.box(0.8, 0.85, 0.6, "#3a3540"), [1.6, 0, -1.1]],
    [P.cyl(0.2, 0.18, 0.24, "#8a98a8", 12), [1.5, 0.85, -1.1]],
    [P.lampHang(3.38, 0.4, "#b9483c", 3.0), [1.2, 3.4, -0.5]],
    [P.rug(2.2, 1.3, "#3d6a5a", "#f3ead2"), [0.1, 0.012, 0.2]],
    [P.potPlant(0.8), [-1.7, 0, 0.3]],
    [P.basket(0.26), [1.25, 0, 0.45]],
    [carrot(0.34), [1.25, 0.3, 0.45], 1.2],
  ]);
  return { root: g };
};
