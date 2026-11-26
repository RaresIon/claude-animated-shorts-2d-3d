// Screen geometry shared by the engine, the auto-framing helper (`fit`) and scripts/plan_lint.ts. No DOM, no Remotion:
// everything here runs in plain node, so a shot list can be checked without rendering a frame.
import * as THREE from "three";
import { Cam, drift, mixCam } from "./camera";
import { PH, PW, RH, RW } from "./chars";
import { V3, burst } from "./util";

export const ASPECT = 9 / 16;
/** frames a "move" shot spends travelling in from the previous framing */
export const MOVE_IN = 14;

/** the camera the engine really uses for shot i at authoring frame f (travel-in and drift included) */
export const shotCam = (shots: { a: number; cam: (f: number) => Cam; into?: string }[], i: number, f: number): Cam => {
  let c = shots[i].cam(f);
  if (shots[i].into === "move" && i > 0 && f < shots[i].a + MOVE_IN) c = mixCam(shots[i - 1].cam(shots[i].a - 1), c, burst((f - shots[i].a + 1) / MOVE_IN));
  return drift(c, f);
};

/** point a three.js camera the way the engine does. Returns the quaternion lens-facing cards use (pitch capped at 35
 *  degrees, no roll) and their up vector. */
export const aim = (cam: THREE.PerspectiveCamera, c: Cam, aspect = ASPECT, yaw = 0) => {
  cam.position.set(...c.pos); cam.fov = c.fov ?? 40; cam.aspect = aspect; cam.near = 0.1; cam.far = 400; cam.up.set(0, 1, 0);
  cam.lookAt(c.look[0], c.look[1], c.look[2]); cam.rotateY(-yaw);
  const fe = new THREE.Euler().setFromQuaternion(cam.quaternion, "YXZ"); fe.x = Math.max(-0.6, Math.min(0.6, fe.x)); fe.z = 0;
  const face = new THREE.Quaternion().setFromEuler(fe), up = new THREE.Vector3(0, 1, 0).applyQuaternion(face);
  cam.rotateZ(c.roll ?? 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  return { face, up };
};

// ---------------------------------------------------------------- where things are on screen
type Item = { kind: string; at: V3; h?: number; w?: number; s?: number; roll?: number; flat?: boolean };
export type Quad = THREE.Vector3[]; // four world corners: bottom-left, bottom-right, top-right, top-left
const quadAt = (c: THREE.Vector3, right: THREE.Vector3, up: THREE.Vector3, w: number, y0: number, y1: number): Quad =>
  [[-1, y0], [1, y0], [1, y1], [-1, y1]].map(([sx, y]) => c.clone().addScaledVector(right, (sx * w) / 2).addScaledVector(up, y));
/** the drawn figure of a person, not its (larger, mostly empty) canvas: whole body, and head with hat */
export const personQuads = (it: Item, face: THREE.Quaternion) => {
  const h = it.h ?? 1.7, c = new THREE.Vector3(...it.at), right = new THREE.Vector3(1, 0, 0).applyQuaternion(face), up = new THREE.Vector3(0, 1, 0).applyQuaternion(face);
  return { body: quadAt(c, right, up, 0.36 * h, 0, 0.94 * h), head: quadAt(c, right, up, 0.34 * h, 0.57 * h, 0.93 * h), torso: quadAt(c, right, up, 0.28 * h, 0.3 * h, 0.57 * h), face: c.clone().addScaledVector(up, 0.73 * h) };
};
/** the rectangle of a cast card or a rat */
export const cardQuad = (it: Item, face: THREE.Quaternion): Quad => {
  const c = new THREE.Vector3(...it.at);
  if (it.kind === "rat") { const h = 0.42 * (it.s ?? 1), w = h * (RW / RH); return quadAt(c, new THREE.Vector3(1, 0, 0).applyQuaternion(face), new THREE.Vector3(0, 1, 0).applyQuaternion(face), w, 0, h * 0.9); }
  const q = it.flat ? new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, it.roll ?? 0)) : face.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), it.roll ?? 0));
  return quadAt(c, new THREE.Vector3(1, 0, 0).applyQuaternion(q), new THREE.Vector3(0, 1, 0).applyQuaternion(q), it.w ?? 1, -(it.h ?? 1) / 2, (it.h ?? 1) / 2);
};
/** the size of a person's card as the engine draws it (kept here so the engine and the lint cannot drift apart) */
export const personCard = (h = 1.7) => { const ch = h * (PH / 580); return { w: ch * (PW / PH), h: ch, y0: -ch * (20 / PH) }; };

export type Screen = { pts: [number, number][]; area: number; vis: number; box: [number, number, number, number]; behind: boolean; dist: number };
const polyArea = (p: [number, number][]) => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2;
const clip = (p: [number, number][]) => { // Sutherland-Hodgman against the frame [-1, 1] x [-1, 1]
  for (const [ax, sign] of [[0, 1], [0, -1], [1, 1], [1, -1]] as const) {
    const out: [number, number][] = [], inside = (q: [number, number]) => sign * q[ax] <= 1;
    p.forEach((a, i) => { const b = p[(i + 1) % p.length];
      if (inside(a) !== inside(b)) { const t = (sign - a[ax]) / (b[ax] - a[ax]); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
      if (inside(b)) out.push(b); });
    p = out; if (!p.length) break;
  }
  return p;
};
/** project a world quad: its screen polygon (NDC, y up), area, the share of it inside the frame, and its bounding box */
export const onScreen = (q: Quad, cam: THREE.PerspectiveCamera): Screen => {
  const v = q.map((p) => p.clone().applyMatrix4(cam.matrixWorldInverse)), behind = v.some((p) => p.z > -cam.near);
  const pts = q.map((p) => { const n = p.clone().project(cam); return [n.x, n.y] as [number, number]; });
  const area = polyArea(pts), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const dist = q.reduce((s, p) => s + p.distanceTo(cam.position), 0) / q.length;
  if (behind) return { pts, area: 0, vis: v.every((p) => p.z > -cam.near) ? 0 : 0.5, box: [-9, -9, 9, 9], behind, dist };
  return { pts, area, vis: area > 1e-9 ? polyArea(clip(pts)) / area : 0, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], behind, dist };
};
/** share of box `a` covered by box `b` (both [x0, y0, x1, y1] in NDC) */
export const cover = (a: number[], b: number[]) => { const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); return w > 0 && h > 0 ? (w * h) / Math.max(1e-9, (a[2] - a[0]) * (a[3] - a[1])) : 0; };

// ---------------------------------------------------------------- auto-framing
export type Subject = V3 | { at: V3; h?: number; w?: number; kind?: string };
export type FitOpts = {
  /** where the camera stands, in degrees round the subjects: 0 = straight in front (+z), 90 = from +x, -90 = from -x */
  yaw?: number;
  /** camera height angle in degrees: 0 = level with the subjects, 30 = looking down on them, -15 = looking up */
  pitch?: number;
  fov?: number; roll?: number;
  /** how much of the frame the group may span in its tighter direction (0.8 leaves a 10 % margin on each side) */
  fill?: number;
  /** vertical position of the group's centre, 0 = top of frame, 1 = bottom. 0.42 keeps faces above the caption. */
  cy?: number;
};
/** A camera that holds every subject whole inside the 9:16 frame, by construction. Give it people (cast items or
 *  `{ at, h }`), cards (`{ at, w, h }`) or bare points, and the side to look from; it works out the distance and the
 *  aim. Use it instead of typing camera positions, then tune `yaw`, `pitch`, `fill`:
 *      cam: () => fit([bjarni, dad], { yaw: 20, pitch: 8, fill: 0.85 })
 *  A row of people fits a tall frame badly from the side: a `yaw` of 60-90 stacks them in depth and fills the frame. */
export const fit = (subjects: Subject[], o: FitOpts = {}): Cam => {
  const { yaw = 0, pitch = 5, fov = 44, roll = 0, fill = 0.8, cy = 0.42 } = o;
  const pts: THREE.Vector3[] = [];
  for (const s of subjects) {
    if (Array.isArray(s)) { pts.push(new THREE.Vector3(...s)); continue; }
    const h = s.h ?? 1.7, w = s.w ?? 0.4 * h, person = s.w === undefined, y0 = person ? 0 : -h / 2, y1 = person ? 0.96 * h : h / 2;
    for (const dx of [-w / 2, w / 2]) for (const y of [y0, y1]) pts.push(new THREE.Vector3(s.at[0] + dx, s.at[1] + y, s.at[2]), new THREE.Vector3(s.at[0], s.at[1] + y, s.at[2] + dx));
  }
  if (!pts.length) throw new Error("fit(): nothing to frame");
  const ya = (yaw * Math.PI) / 180, pa = (pitch * Math.PI) / 180, dir = new THREE.Vector3(Math.sin(ya) * Math.cos(pa), Math.sin(pa), Math.cos(ya) * Math.cos(pa));
  const box = new THREE.Box3().setFromPoints(pts), look = box.getCenter(new THREE.Vector3()), cam = new THREE.PerspectiveCamera(fov, ASPECT, 0.1, 400);
  const span = (d: number) => {
    aim(cam, { pos: look.clone().addScaledVector(dir, d).toArray() as V3, look: look.toArray() as V3, fov, roll });
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9, bad = false;
    for (const p of pts) { if (p.clone().applyMatrix4(cam.matrixWorldInverse).z > -0.2) bad = true; const n = p.clone().project(cam); x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y); }
    return { x0, x1, y0, y1, bad };
  };
  let d = 4;
  for (let pass = 0; pass < 6; pass++) {
    let lo = 0.3, hi = 200; // the nearest distance at which the group spans no more than `fill` of the frame
    for (let k = 0; k < 40; k++) { d = (lo + hi) / 2; const s = span(d); if (s.bad || s.x1 - s.x0 > 2 * fill || s.y1 - s.y0 > 2 * Math.min(fill, 0.96 - Math.abs(1 - 2 * cy))) lo = d; else hi = d; }
    d = hi; const s = span(d), tx = 0, ty = 1 - 2 * cy; // then slide the aim so the group sits where asked
    const ex = (s.x0 + s.x1) / 2 - tx, ey = (s.y0 + s.y1) / 2 - ty, half = Math.tan((fov * Math.PI) / 360) * d;
    const r = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), u = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    if (Math.abs(ex) < 0.004 && Math.abs(ey) < 0.004) break;
    look.addScaledVector(r, ex * half * ASPECT).addScaledVector(u, ey * half);
  }
  const p = look.clone().addScaledVector(dir, d), rd = (v: number) => Math.round(v * 1000) / 1000;
  if (p.y < 0.25 && pitch < 0) return fit(subjects, { ...o, pitch: pitch + 2 }); // a low angle may not put the lens under the ground
  return { pos: [rd(p.x), rd(p.y), rd(p.z)], look: [rd(look.x), rd(look.y), rd(look.z)], fov, roll };
};
