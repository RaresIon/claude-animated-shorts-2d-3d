// Timeline of "The War I Won": shots timed to the voice words (voice/words.json, frames at 30 fps), told by an emu.
// Same camera grammar as the bridge short: cuts on big jumps, smootherstep glides, every hold creeps in,
// flip-sign kicks on impacts, no hand-held float.
export const FPS = 30;
export const TOTAL = 1830;
export const D0 = 0; // flat ground
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- places ----------------
export const FIELD = { x0: -60, x1: 60, z0: 10, z1: 110 }; // wheat
export const FENCE_Z = 8;
export const HOUSE: [number, number, number] = [24, 0, -18];
export const TRACK_Z = -4; // dirt road along x
export const DAM: V3 = [-110, 0, -50]; export const DAM_R = 15;
export const KICK_X = -20; // the fence post that gets kicked out
export const GANG: V3 = [150, 0, 60];

// ---------------- story motion ----------------
/** truck arriving: x along the track, decelerating to a stop at -3 by frame 689 */
export const truckArrive = (f: number) => -3 - 60 * (1 - smooth((f - 600) / 89)) ** 1.2;
/** the chase: hero runs at 14 m/s (50 km/h), the truck at 8.5 m/s, starting together at frame 1033 */
export const CHASE0 = 1033;
export const heroRunX = (f: number) => 40 + 14 * ((f - CHASE0) / FPS);
export const truckChaseX = (f: number) => 34 + 8.5 * ((f - CHASE0) / FPS);
/** the gun truck driving along the track */
export const truckDriveX = (f: number) => -30 + 7 * ((f - 973) / FPS);
/** marching emus (golden, "face any army") */
export const marchX = (f: number) => -40 + 1.4 * ((f - 1601) / FPS);
/** truck leaving into the sunset */
export const truckLeaveX = (f: number) => -2 - 9 * Math.max(0, (f - 1708) / FPS) ** 1.3;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: string; sunAz?: number; sunEl?: number };
const S = (id: number, a: number, b: number, set: string, light: Light = "day", sun: { az?: number; el?: number } = {}): ShotDef =>
  ({ id, a, b, set, light, sunAz: sun.az, sunEl: sun.el });
export const SHOTS: ShotDef[] = [
  S(1, 0, 99, "standoff"),
  S(2, 99, 127, "heroCU1"),
  S(3, 127, 154, "heroPlain"),
  S(4, 154, 252, "migration", "day", { az: 100 }),
  S(5, 252, 300, "fieldEdge"),
  S(6, 300, 344, "heroEdgeCU"),
  S(7, 344, 388, "fieldAerial", "day", { az: 120 }),
  S(8, 388, 446, "farmer"),
  S(9, 446, 486, "pecking"),
  S(10, 486, 540, "kick"),
  S(11, 540, 577, "rabbits"),
  S(12, 577, 647, "farmers"),
  S(13, 647, 689, "arrive"),
  S(14, 689, 709, "guns"),
  S(15, 709, 748, "crates"),
  S(16, 748, 805, "major"),
  S(17, 805, 836, "damWide"),
  S(18, 836, 886, "ambush"),
  S(19, 886, 929, "fire"),
  S(20, 929, 973, "jam"),
  S(21, 973, 1019, "gunTruck"),
  S(22, 1019, 1033, "cute"),
  S(23, 1033, 1091, "run"),
  S(24, 1091, 1130, "chase"),
  S(25, 1130, 1204, "bumpy"),
  S(26, 1204, 1276, "gangsAerial", "day", { az: 110 }),
  S(27, 1276, 1335, "gang"),
  S(28, 1335, 1383, "lookout"),
  S(29, 1383, 1427, "scatter"),
  S(30, 1427, 1515, "tired", "golden", { az: 30, el: 9 }),
  S(31, 1515, 1569, "tally", "golden", { az: 40, el: 12 }),
  S(32, 1569, 1601, "majorSays", "golden", { az: 35, el: 10 }),
  S(33, 1601, 1648, "march", "golden"),
  S(34, 1648, 1708, "proud", "golden", { az: 20 }),
  S(35, 1708, 1736, "leave", "golden"),
  S(36, 1736, TOTAL, "wheatEnd", "golden", { az: 30 }),
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 4: 6, 7: 6, 30: 10, 33: 8, 36: 8 };
export const FLASH_AT = 127;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** a creeping dolly framing that starts pushing at frame f0 (rate per frame, optional punch for n frames) */
const D = (pos: V3, look: V3, f0: number, rate = 0.0022, rest: Partial<Cam> = {}, punch = 0, n = 35) => (f: number) =>
  dolly(pos, look, pushK(f, f0, rate, punch, n), { fov: 40, ...rest });

export const HERO_STANDOFF: V3 = [0.6, 0, 13.5];
export const HERO_PLAIN: V3 = [-150, 0, 0];
export const HERO_EDGE: V3 = [-64.5, 0, 40];
export const HERO_CUTE: V3 = [40, 0, -30];
export const HERO_END: V3 = [5, 0, 15];
export const MAJOR: V3 = [1.2, 0, -10.5];

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: D([-3.4, 1.45, -3.2], [0.3, 1.25, 12.5], 0, 0.0028, { fov: 42 }) },
    { f: 52, dur: 30, s: D([-2.2, 1.35, -0.6], [0.5, 1.3, 13], 52, 0.002, { fov: 38, roll: -0.04 }) }],
  2: [{ f: 99, s: D([0.6, 1.55, 10.6], [0.6, 1.42, 13.5], 99, 0.0035, { fov: 38 }, 0.007, 22) }],
  3: [{ f: 127, s: D([-150, 1.45, -3.9], [-150, 1.3, 0], 127, 0.0025, { fov: 40, roll: 0.03 }) }],
  4: [{ f: 150, s: D([-168, 24, -42], [-205, 0, 4], 150, 0.0012, { fov: 44 }) },
    { f: 200, dur: 40, s: D([-178, 20, -38], [-196, 0, 6], 200, 0.0012, { fov: 44 }) }],
  5: [{ f: 252, s: D([-71.5, 2.1, 35.5], [-42, 0.9, 49], 252, 0.0018, { fov: 46 }) }],
  6: [{ f: 300, s: D([-67.6, 1.6, 39.5], [-64.5, 1.45, 40], 300, 0.003, { fov: 38 }, 0.007, 26) }],
  7: [{ f: 341, s: D([-48, 22, -42], [12, 0, 22], 341, 0.0012, { fov: 46 }) },
    { f: 350, dur: 38, s: D([-38, 26, -48], [16, 0, 26], 350, 0.0012, { fov: 46, roll: 0.02 }) }],
  8: [{ f: 388, s: D([10.7, 1.55, 2.6], [10, 1.4, 6.6], 388, 0.0025, { fov: 40 }) },
    { f: 418, dur: 20, s: D([10.4, 1.6, 3.5], [10, 1.55, 6.6], 418, 0.002, { fov: 38, roll: 0.035 }) }],
  9: [{ f: 446, s: D([-34, 1.25, 21.5], [-29.5, 0.9, 30], 446, 0.0025, { fov: 42 }) },
    { f: 466, dur: 18, s: D([-33, 0.7, 23], [-29.5, 0.7, 30], 466, 0.0025, { fov: 42, roll: -0.04 }) }],
  10: [{ f: 486, s: D([-25.2, 1.15, 5.2], [-20, 0.9, 8.6], 486, 0.0025, { fov: 42 }) }],
  11: [{ f: 540, s: D([-24, 0.45, 7.2], [-20, 0.35, 8.5], 540, 0.002, { fov: 40, roll: 0.03 }) }],
  12: [{ f: 577, s: D([24.3, 1.55, -4.6], [24, 1.45, -10], 577, 0.0022, { fov: 42 }) },
    { f: 608, dur: 18, s: D([24.1, 1.6, -6.2], [24, 1.5, -10], 608, 0.002, { fov: 40, roll: -0.04 }) }],
  13: [{ f: 647, s: D([7, 1.1, -0.8], [-14, 1.4, -4], 647, 0.002, { fov: 42 }) }],
  14: [{ f: 689, s: D([0.9, 0.85, -6.1], [0.6, 0.42, -8.6], 689, 0.004, { fov: 40, roll: 0.04 }) }],
  15: [{ f: 709, s: D([-3, 0.55, -5.2], [-3, 1.0, -9], 709, 0.002, { fov: 44 }) },
    { f: 712, dur: 32, s: D([-3, 0.7, -5.4], [-3, 3.0, -9], 712, 0.002, { fov: 44 }) }],
  16: [{ f: 748, s: D([1.4, 1.62, -7.4], [1.2, 1.58, -10.5], 748, 0.0022, { fov: 40 }) },
    { f: 770, dur: 22, s: D([1.3, 1.66, -8.3], [1.2, 1.66, -10.5], 770, 0.002, { fov: 38, roll: 0.04 }, 0.006, 30) }],
  17: [{ f: 805, s: D([-113, 3.6, -90], [-110, 0, -52], 805, 0.0018, { fov: 42 }) }],
  18: [{ f: 836, s: D([-110.2, 1.15, -76.4], [-110, 0.85, -79.7], 836, 0.0025, { fov: 42 }) }],
  19: [{ f: 886, s: D([-111.6, 1.35, -82.4], [-110, 0.5, -60], 886, 0.0015, { fov: 34 }) }],
  20: [{ f: 929, s: D([-107.2, 1.05, -78.6], [-110, 0.95, -79.1], 929, 0.0025, { fov: 40, roll: -0.04 }) }],
  21: [{ f: 973, s: (f) => { const X = truckDriveX(f); return { pos: [X + 5.5, 2.0, 5.5], look: [X + 0.5, 1.4, TRACK_Z], fov: 40 }; } }],
  22: [{ f: 1019, s: D([40.6, 1.56, -27.3], [40, 1.45, -30], 1019, 0.004, { fov: 38, roll: 0.04 }) }],
  23: [{ f: 1033, s: (f) => { const X = heroRunX(f); return { pos: [X + 0.8, 1.25, -24.8], look: [X + 0.4, 1.05, -30], fov: 42 }; } }],
  24: [{ f: 1091, s: (f) => { const X = (heroRunX(f) + truckChaseX(f)) / 2 + 2; return { pos: [X - 9, 6.5, -16], look: [X + 4, 0.6, -30], fov: 44 }; } }],
  25: [{ f: 1130, s: (f) => { const X = truckChaseX(f); return { pos: [X + 1.2, 2.7, -21.2], look: [X - 0.8, 1.9, -30], fov: 46, roll: -0.03 }; } }],
  26: [{ f: 1204, s: D([110, 42, 0], [152, 0, 72], 1204, 0.0012, { fov: 46 }) }],
  27: [{ f: 1276, s: D([146.2, 1.55, 53.8], [150.4, 1.2, 60.8], 1276, 0.0022, { fov: 42 }) }],
  28: [{ f: 1335, s: D([151.9, 2.1, 58.3], [151.7, 2.0, 61.6], 1335, 0.0028, { fov: 36 }, 0.007, 24) }],
  29: [{ f: 1383, s: D([150, 15, 44], [150, 0, 61], 1383, 0.0015, { fov: 44 }) }],
  30: [{ f: 1422, s: D([0.8, 1.45, -13.2], [0, 1.0, -7], 1422, 0.002, { fov: 42 }) }],
  31: [{ f: 1515, s: D([0.05, 0.8, -11.6], [0, 0.08, -9.6], 1515, 0.0018, { fov: 36 }) }],
  32: [{ f: 1569, s: D([1.4, 1.62, -7.4], [1.2, 1.58, -10.5], 1569, 0.0025, { fov: 40, roll: -0.035 }) }],
  33: [{ f: 1597, s: (f) => { const X = marchX(f) + 2; return dolly([X + 1, 1.3, -50.5], [X, 1.4, -40], pushK(f, 1597, 0.0015), { fov: 42 }); } }],
  34: [{ f: 1648, s: D([-35.4, 1.6, -42.8], [-36, 1.6, -40], 1648, 0.0028, { fov: 38 }, 0.006, 30) }],
  35: [{ f: 1708, s: D([10, 1.4, -3.2], [-24, 1.6, -4.5], 1708, 0.0015, { fov: 42 }) }],
  36: [{ f: 1732, s: D([5.3, 1.58, 12.2], [5, 1.45, 15], 1732, 0.0022, { fov: 38 }) },
    { f: 1766, dur: 20, s: D([5.2, 1.5, 12.8], [5, 1.45, 15], 1766, 0.0025, { fov: 36, roll: 0.035 }) }],
};
/** impact kicks (frame, gain): the fence post snapping, the gun jam, the hard bumps */
const KICKS: [number, number][] = [[503, 1], [929, 1.2], [1148, 0.8], [1160, 0.7], [1176, 0.9]];
export const kickAt = (f: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) { const n = Math.floor(f - f0 + 1e-6); if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
/** blur-disc radius in px at 1080 for things at infinity per shot start frame (0 = all sharp); focus = camera look point */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 8 }, { f: 99, cInf: 14 }, { f: 127, cInf: 12 }, { f: 154, cInf: 0 }, { f: 252, cInf: 5 }, { f: 300, cInf: 14 },
  { f: 344, cInf: 0 }, { f: 388, cInf: 12 }, { f: 446, cInf: 8 }, { f: 486, cInf: 9 }, { f: 540, cInf: 10 }, { f: 577, cInf: 9 },
  { f: 647, cInf: 0 }, { f: 689, cInf: 14 }, { f: 709, cInf: 6 }, { f: 748, cInf: 12 }, { f: 805, cInf: 0 }, { f: 836, cInf: 10 },
  { f: 886, cInf: 0 }, { f: 929, cInf: 12 }, { f: 973, cInf: 0 }, { f: 1019, cInf: 14 }, { f: 1033, cInf: 6 }, { f: 1091, cInf: 0 },
  { f: 1130, cInf: 7 }, { f: 1204, cInf: 0 }, { f: 1276, cInf: 8 }, { f: 1335, cInf: 14 }, { f: 1383, cInf: 0 }, { f: 1427, cInf: 8 },
  { f: 1515, cInf: 6 }, { f: 1569, cInf: 12 }, { f: 1601, cInf: 5 }, { f: 1648, cInf: 13 }, { f: 1708, cInf: 0 }, { f: 1736, cInf: 13 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
/** near framing objects: visible while a <= f < b (only inside their own shot) */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 805, b: 836, kit: "plant_bush", pos: [-114.5, 0, -86.5], s: 1.3, yaw: 0.3 },
  { a: 1648, b: 1708, kit: "plant_bush", pos: [-34.2, 0, -42.0], s: 0.7, yaw: 0.3 },
];
