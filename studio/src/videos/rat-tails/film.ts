// "The Rat Tail Problem" — shot list. Every shot is timed to voice/words.json (frames at 30 fps).
// Staging rules followed here (docs/style-rules.md): cast fills a third of the frame height or more, faces sit above
// the caption line, one prop per hand tells the beat, the camera holds and bursts, the light changes with the story.
import { CastItem, Film, Shot } from "../../stage/Stage";
import { Cam, shake, track } from "../../stage/camera";
import { Look, Pose, blinkAt } from "../../stage/chars";
import { V3, bump, burst, hash, overshoot, prog, rng } from "../../stage/util";
import { MANHOLE, PEN, TEX, explain, farm, office, sewer, streetSet } from "./sets";
import words from "./words.json";

export const TOTAL = 1335;

// ---------------------------------------------------------------- cast
const OFFICIAL: Look = { coat: "#f1ede2", buttons: "#e2b84a", collar: "#d9d2c0", hat: "pith", hatCol: "#f1e9d2", band: "#8a6a3c", moustache: "#5a3a24", monocle: true, stout: true };
const CLERK: Look = { coat: "#3d5fa8", buttons: "#e2b84a", hat: "kepi", hatCol: "#27304a", band: "#c8413a", moustache: "#3a2414" };
const INSPECTOR: Look = { coat: "#4a6a4a", sash: "#e2b84a", hat: "kepi", hatCol: "#3a4a3a", band: "#e2b84a", glasses: true, moustache: "#8a6a3c" };
const LOCAL_A: Look = { coat: "#7a4a34", trim: "#5a3424", hat: "nonla", hatCol: "#e2cf96" };
const LOCAL_B: Look = { coat: "#3d6a6a", trim: "#2a4a4a", hat: "nonla", hatCol: "#d9c48a" };
const LOCAL_C: Look = { coat: "#8a5a8a", hat: "bandana", hatCol: "#c8413a" };
const CATCHER: Look = { coat: "#5a5a4a", apron: "#8a7a5a", hat: "bandana", hatCol: "#3d6a8a" };
const FARMER: Look = { coat: "#a8703a", apron: "#d9c48a", hat: "straw", hatCol: "#e2c66a", band: "#7a3a34" };
const LADY: Look = { coat: "#c86a8a", collar: "#f3ead2", hat: "topper", hatCol: "#6a3a5a", band: "#f3ead2" };

const person = (id: string, look: Look, at: V3, pose: Pose, f: number, seed = 1, h = 1.7, flip = false): CastItem =>
  ({ kind: "person", id, look, at, h, flip, pose: { ...pose, blink: pose.blink ?? blinkAt(f, seed) } });
/** a pose that pops in at frame `a`: squash-and-stretch settle over 7 frames */
const pop = (f: number, a: number) => (f < a ? 1 : 0.86 + 0.14 * overshoot(prog(f, a, 7), 2.6));
const antic = (f: number, a: number, n = 4) => (f >= a - n && f < a ? 0.93 : 1); // anticipation dip just before a pop

/** a crowd of rats: deterministic positions, each with its own phase */
const swarm = (id: string, n: number, f: number, at: (i: number, r: () => number) => { p: V3; flip?: boolean; s?: number; t?: number } | null, rat: (i: number) => Partial<import("../../stage/chars").Rat> = () => ({})): CastItem[] => {
  const out: CastItem[] = [];
  for (let i = 0; i < n; i++) {
    const q = at(i, rng(i * 7 + 3)); if (!q) continue;
    out.push({ kind: "rat", id: `${id}${i}`, at: q.p, flip: q.flip, s: q.s ?? 1, rat: { phase: (q.t ?? f) * 0.9 + i * 1.7, tail: true, col: ["#8f8794", "#7f7788", "#9a8f8a", "#857f96"][i % 4], ...rat(i) } });
  }
  return out;
};
const fx = (id: string, tex: ReturnType<typeof TEX.heart>, at: V3, w: number, h = w, opacity = 1, roll = 0): CastItem => ({ kind: "card", id, tex, at, w, h, opacity, roll });

// ---------------------------------------------------------------- shots
// 1. HOOK (0-169): a rat on the desk, a coin handed over. "And ended up with more rats": pull back, the room is full.
const s1cam = (f: number): Cam => shake(track(f, [
  { f: 0, cam: { pos: [-0.05, 1.95, 4.4], look: [0.0, 1.3, -1.4], fov: 40 }, rate: 0.0012 },
  { f: 114, cam: { pos: [-0.1, 2.5, 5.6], look: [0.15, 1.0, -1.2], fov: 42 }, dur: 12 },
]), f, 114, 0.1);
const s1 = (f: number): CastItem[] => {
  const pay = prog(f, 30, 8), more = f >= 114;
  const c: CastItem[] = [
    person("off", OFFICIAL, [0.75, 0, -2.15], more ? { eyes: "wide", mouth: "o", brow: -1, rh: [0.9, -0.6], lh: [-0.9, -0.6], squash: pop(f, 114), sweat: true, look: [-0.6, 0.6] } : { eyes: "happy", mouth: "smile", face: -0.6, lh: [-1.1 - 0.5 * burst(pay), 0.25 - 0.1 * bump(pay)], heldL: "coin", rh: [0.3, 1.1], squash: pop(f, 30) * antic(f, 30) }, f, 1),
    person("loc", LOCAL_A, [-0.45, 0, -0.55], more ? { eyes: "side", mouth: "smirk", face: 0.7, rh: [0.9, 0.2], held: "coin", lh: [-0.4, 1.1], look: [0.8, 0.2] } : { eyes: f > 40 ? "happy" : "dot", mouth: "smile", face: 0.7, rh: [1.0, f < 22 ? 0.1 : 0.45], held: f < 40 ? "rat" : "coin", lh: [-0.4, 1.1], squash: pop(f, 40) }, f, 2, 1.62),
  ];
  if (more) c.push(...swarm("h", 46, f, (i, r) => {
    const born = 114 + i * 0.7; if (f < born) return null;
    const lane = i % 3, dir = i % 2 ? 1 : -1, sp = 0.035 + r() * 0.03;
    if (i < 6) return { p: [-0.5 + i * 0.36, 0.95 + (i === 2 ? 0.0 : 0), -1.02 + (i % 2) * 0.14], flip: i % 2 === 0, s: 0.85 * overshoot(prog(f, born, 6)), t: f * 0.3 };
    const x = ((dir * (f - born) * sp + r() * 8) % 8 + 8) % 8 - 4;
    return { p: [dir > 0 ? x : -x, 0, 0.5 + lane * 0.85 + r() * 0.5], flip: dir < 0, s: 1 + lane * 0.12 };
  }, (i) => ({ mood: i % 5 === 0 ? "smug" : i % 3 === 0 ? "happy" : "plain" })));
  return c;
};

// 2. STREET (169-268): the grand opening of the sewers. Ribbon cut on "sewers", applause on "pride".
const s2cam = (f: number): Cam => track(f, [
  { f: 169, cam: { pos: [0.15, 2.7, 6.9], look: [0, 1.2, -1.5], fov: 46 } },
  { f: 222, cam: { pos: [0.1, 1.9, 6.4], look: [0, 1.25, 0.4], fov: 40 }, dur: 10 },
]);
const s2 = (f: number): CastItem[] => {
  const cut = f >= 226, clap = Math.sin(f * 1.3) * 0.18;
  return [
    person("off", OFFICIAL, [-0.55, 0, 0.75], cut ? { eyes: "happy", mouth: "grin", rh: [0.9, -0.9], held: "scissors", lh: [-0.8, -0.7], squash: pop(f, 226) } : { eyes: "lid", mouth: "smile", face: 0.5, rh: [0.75, 0.5], held: "scissors", lh: [-0.4, 1.1], squash: antic(f, 226) }, f, 1),
    person("lady", LADY, [0.95, 0, 0.6], { eyes: cut ? "happy" : "lid", mouth: cut ? "open" : "smile", face: -0.5, rh: [-0.15 + (cut ? clap : 0), 0.35], lh: [0.15 - (cut ? clap : 0), 0.35] }, f, 4, 1.6),
    person("clerk", CLERK, [-1.6, 0.16, -2.2], { eyes: "happy", mouth: "smile", face: 0.5, rh: [0.1 + (cut ? clap : 0), 0.3], lh: [0.3 - (cut ? clap : 0), 0.3] }, f, 5, 1.65),
    person("locb", LOCAL_B, [1.9, 0.16, -2.3], { eyes: "lid", mouth: "dash", face: -0.6, brow: 0.2 }, f, 6, 1.6),
    ...(cut ? [0, 1, 2, 3, 4, 5].map((i) => fx(`conf${i}`, TEX.spark(), [-1 + i * 0.4, 1.4 + ((f - 226) * (0.05 + i * 0.008)) - 0.002 * (f - 226) ** 2 + (i % 2) * 0.5, 1.0], 0.3, 0.3, Math.max(0, 1 - (f - 226) / 30), f * 0.1 + i)) : []),
  ];
};

// 3. SEWER (268-385): down the manhole. The rat highway.
const s3cam = (f: number): Cam => track(f, [
  { f: 268, cam: { pos: [-3.2, 3.6, 2.2], look: [-3.0, 0.4, -1.9], fov: 46 } },
  { f: 272, cam: { pos: [-2.4, 1.5, 2.6], look: [-1.6, 0.75, -2.3], fov: 46 }, dur: 14 },
  { f: 322, cam: { pos: [0.5, 1.25, 2.2], look: [0.9, 0.8, -2.4], fov: 42 }, dur: 12 },
]);
const highway = (f: number, n: number, both = true): CastItem[] => swarm("hw", n, f, (i, r) => {
  const far = i % 3 !== 0, dir = both && i % 4 < 2 ? -1 : 1, sp = 0.07 + r() * 0.03, span = 13;
  const x = (((f * sp + i * 1.37) % span) + span) % span - span / 2;
  return { p: [dir > 0 ? x : -x, 0, far ? -1.75 - r() * 0.75 : 2.0 + r() * 0.35], flip: dir < 0, s: far ? 1.5 : 1.3 };
}, (i) => ({ mood: i % 4 === 0 ? "happy" : i % 7 === 0 ? "smug" : "plain", baby: i % 9 === 4 }));
const s3 = (f: number): CastItem[] => highway(f, 34);

// 4. CATCHERS (385-522): the catcher, the sacks, the tally. "It wasn't enough": rats run right over him.
const s4cam = (f: number): Cam => shake(track(f, [
  { f: 385, cam: { pos: [5.2, 1.5, 3.4], look: [5.8, 1.05, -2.2], fov: 40 } },
  { f: 452, cam: { pos: [6.2, 1.5, 2.5], look: [6.3, 1.15, -2.6], fov: 40 }, dur: 9 },
  { f: 497, cam: { pos: [5.6, 1.4, 3.6], look: [5.8, 1.0, -2.2], fov: 42 }, dur: 9 },
]), f, 497, 0.08);
const s4 = (f: number): CastItem[] => {
  const tally = f >= 452 && f < 497, tired = f >= 497, sw = prog(f, 410, 9);
  return [
    person("cat", CATCHER, [5.55, 0, -2.2], tired ? { eyes: "lid", mouth: "frown", brow: 0.5, face: 0, rh: [0.5, 1.2], held: "net", lh: [-0.5, 1.1], heldL: "lantern", squash: pop(f, 497), sweat: true } : tally ? { eyes: "happy", mouth: "grin", face: 0.6, rh: [1.0, -0.6], lh: [-0.4, 1.0], heldL: "lantern", squash: pop(f, 452) } : { eyes: "angry", mouth: "open", brow: 1, face: 0.5, rh: [0.9 - 0.5 * bump(sw), -0.5 + 1.2 * burst(sw)], held: "net", lh: [-0.5, 0.9], heldL: "lantern", lean: 0.12 * bump(sw), squash: antic(f, 410) }, f, 3),
    person("cat2", { ...CATCHER, hatCol: "#7a3a34", coat: "#4a5a6a" }, [4.55, 0, -2.7], { eyes: tired ? "wide" : "lid", mouth: tired ? "o" : "dash", face: 0.5, rh: [0.4, 1.0], held: "sack", lh: [-0.4, 1.1], brow: tired ? -1 : 0 }, f, 7, 1.6, false),
    ...(tired ? swarm("ov", 30, f, (i, r) => { const x = 9.5 - ((f - 497) * (0.16 + r() * 0.06) + i * 0.45) % 9; const over = i % 3 === 0; return { p: [x, over ? 1.72 + Math.sin((x - 5.5) * 2) * 0.05 : 0, over ? -2.19 : -1.6 + r() * 0.6 - (i % 2) * 1.0], flip: true, s: over ? 0.7 : 1 }; }, (i) => ({ mood: i % 3 ? "happy" : "smug" })) : highway(f, 10, false)),
  ];
};

// 5. NEW PLAN (522-621): the reward poster on the street wall. A tail goes up, a coin comes down.
const s5cam = (f: number): Cam => track(f, [
  { f: 522, cam: { pos: [-0.2, 1.75, 0.2], look: [-0.2, 1.75, -4.2], fov: 30 } },
  { f: 544, cam: { pos: [-0.1, 1.7, 1.9], look: [-0.25, 1.35, -4], fov: 40 }, dur: 10 },
]);
const s5 = (f: number): CastItem[] => {
  const up = f >= 566, paid = f >= 596;
  return [
    person("loc", LOCAL_A, [0.3, 0.16, -2.9], up ? { eyes: "happy", mouth: "grin", face: -0.3, rh: [0.8, -1.0], held: paid ? "coin" : "tail", lh: [-0.5, 1.0], squash: pop(f, 566) * (paid ? pop(f, 596) : 1) } : { eyes: "lid", mouth: "dash", face: -0.8, look: [-0.8, -0.4], rh: [0.2, 0.2], lh: [-0.4, 1.1], squash: antic(f, 566) }, f, 2, 1.62),
    person("locc", LOCAL_C, [-0.72, 0.16, -2.7], { eyes: up ? "wide" : "lid", mouth: up ? "o" : "dash", face: up ? 0.7 : 0.4, look: up ? [0.8, -0.5] : [0.3, -0.5], brow: up ? -1 : 0, lh: [-0.3, 1.1], rh: [0.3, 1.1] }, f, 8, 1.55),
    ...(paid ? [fx("pl", TEX.plus(), [0.85, 2.75 + (f - 596) * 0.012, -2.8], 0.6, 0.6, Math.max(0, 1 - (f - 596) / 24))] : []),
    ...(f >= 548 && f < 566 ? [fx("q", TEX.bang(), [0.5, 2.25, -2.85], 0.35 * overshoot(prog(f, 548, 6)), 0.44 * overshoot(prog(f, 548, 6)))] : []),
  ];
};

// 6. TAILS POUR IN (621-716): the queue, the growing pile, a thrilled official.
const s6cam = (f: number): Cam => track(f, [
  { f: 621, cam: { pos: [-0.5, 2.0, 3.5], look: [0.1, 1.25, -1.3], fov: 42 } },
  { f: 690, cam: { pos: [0.5, 1.7, 2.3], look: [0.75, 1.55, -2.1], fov: 38 }, dur: 10 },
]);
const s6 = (f: number): CastItem[] => {
  const step = Math.floor((f - 621) / 22), u = ((f - 621) % 22) / 22, thr = f >= 690;
  const q = (i: number): V3 => [-0.5 - i * 0.28, 0, -0.45 + i * 0.75];
  const looks = [LOCAL_A, LOCAL_B, LOCAL_C, { ...LOCAL_A, coat: "#4a6a8a" }];
  return [
    person("off", OFFICIAL, [1.05, 0, -2.15], thr ? { eyes: "happy", mouth: "grin", rh: [0.9, -0.9], lh: [-0.9, -0.9], squash: pop(f, 690) } : { eyes: "happy", mouth: "smile", face: -0.5, lh: [-0.9, 0.5 - 0.3 * bump(u)], heldL: "coin", rh: [0.6, 0.3 + 0.5 * bump(u * 2 % 1)], held: "stamp" }, f, 1),
    ...[0, 1, 2].map((i) => { const k = (step + i) % 4, a = q(i), b = q(Math.max(0, i - 1)), e = i === 0 ? 0 : burst(u * 2.2);
      return person(`q${(step + i) % 5}`, looks[k], i === 0 ? [a[0] + Math.max(0, u - 0.45) * -3.2, 0, a[2] + Math.max(0, u - 0.45) * 1.2] : [a[0] + (b[0] - a[0]) * e, 0, a[2] + (b[2] - a[2]) * e], { eyes: i === 0 ? "happy" : "lid", mouth: i === 0 ? "grin" : "smirk", face: i === 0 && u > 0.3 ? -0.7 : 0.7, rh: [0.9, 0.3], held: i === 0 && u > 0.25 ? "coin" : "tails", lh: [-0.4, 1.1], walk: i === 0 ? (u > 0.25 ? f * 0.7 : undefined) : e < 1 ? f * 0.7 : undefined }, f, 10 + k, 1.6, i === 0 && u > 0.3); }),
  ];
};

// 7. SOMETHING ODD (716-830): the official on his walk. Then, at his feet: rats, alive, with no tails.
const s7cam = (f: number): Cam => track(f, [
  { f: 716, cam: { pos: [1.2, 1.9, 5.6], look: [1.0, 1.3, -1.5], fov: 40 } },
  { f: 783, cam: { pos: [0.7, 1.25, 4.6], look: [0.8, 0.2, 0.9], fov: 40 }, dur: 9 },
]);
const s7 = (f: number): CastItem[] => {
  const stopF = 760, walking = f < stopF, x = 2.4 - 1.3 * burst(prog(f, 716, stopF - 716)), low = f >= 783;
  return [
    person("off", OFFICIAL, [x, 0, 0.3], walking ? { eyes: "lid", mouth: "smile", face: -0.7, walk: f * 0.5, rh: [0.3, 1.1], lh: [-0.3, 1.1] } : { eyes: "wide", mouth: low ? "o" : "dash", brow: -1, face: -0.5, look: [-0.5, 0.9], rh: [0.5, low ? -0.2 : 1.0], lh: [-0.5, low ? -0.2 : 1.0], squash: pop(f, stopF) * pop(f, 786), tilt: -0.08, sweat: low }, f, 1),
    ...(!walking && !low ? [fx("q", TEX.q(), [x - 0.1, 2.25, 0.3], 0.34 * overshoot(prog(f, stopF + 2, 6)), 0.42 * overshoot(prog(f, stopF + 2, 6)))] : []),
    ...swarm("nt", 9, f, (i, r) => { const xx = 3.0 - ((f - 716) * (0.02 + r() * 0.006) + i * 0.62) % 5.2; return { p: [xx, 0, 0.85 + (i % 3) * 0.36 + r() * 0.1], s: 1.15, t: f * 0.55, flip: true }; }, (i) => ({ tail: false, bandage: true, mood: i % 2 ? "smug" : "happy" })),
  ];
};

// 8. YOU SEE (830-1013): one dead rat = one cent. A tailless rat goes home... and comes back with a family.
const s8cam = (f: number): Cam => track(f, [
  { f: 830, cam: { pos: [-1.3, 1.35, 3.3], look: [-1.3, -0.3, 0.3], fov: 40 } },
  { f: 892, cam: { pos: [0.3, 1.5, 3.3], look: [0.55, -0.1, -1.5], fov: 42 }, dur: 11 },
  { f: 972, cam: { pos: [0.55, 1.9, 2.4], look: [0.6, -0.25, -1.3], fov: 44 }, dur: 10 },
]);
const s8 = (f: number): CastItem[] => {
  const c: CastItem[] = [];
  c.push({ kind: "rat", id: "dead", at: [-1.15, 0.02, 0.3], s: 2.0, roll: Math.PI, rat: { dead: true, tail: true }, shadow: false });
  if (f >= 866) c.push(fx("eq", TEX.equals1(), [-1.25, 1.2, 0.3], 1.3 * overshoot(prog(f, 866, 7)), 0.65 * overshoot(prog(f, 866, 7))));
  // the tailless rat walks home (894-939), disappears inside, hearts, then babies pop out one by one (944+)
  const home: V3 = [0.95, 0, -2.6], go = prog(f, 894, 44);
  if (f >= 880 && f < 940) c.push({ kind: "rat", id: "hero", at: [-0.6 + (home[0] + 0.6) * go, 0, 0.1 + (home[2] - 0.1) * go], s: 2.3 - 0.9 * go, rat: { tail: false, bandage: true, mood: "smug", phase: f * 0.6 } });
  if (f >= 938 && f < 975) for (let i = 0; i < 3; i++) { const u = prog(f, 938 + i * 7, 26); if (u > 0 && u < 1) c.push(fx(`he${i}`, TEX.heart(), [home[0] - 0.3 + i * 0.35, 1.5 + u * 1.0, home[2] + 0.2], 0.42 * overshoot(u * 3), 0.42 * overshoot(u * 3), 1 - u * u)); }
  const kids = Math.min(11, Math.floor((f - 946) / 4.2));
  for (let i = 0; i < kids; i++) { const born = 946 + i * 4.2, u = burst(prog(f, born, 12)), row = Math.floor(i / 4), tx = -0.25 + (i % 4) * 0.5 + (row % 2) * 0.22, tz = -1.75 + row * 0.6;
    c.push({ kind: "rat", id: `kid${i}`, at: [home[0] + (tx - home[0]) * u, Math.sin(u * Math.PI) * 0.5, home[2] + 0.3 + (tz - home[2]) * u], s: (i === 0 ? 1.2 : 0.95) * overshoot(prog(f, born, 6)), rat: { baby: i !== 0, tail: i !== 0, bandage: i === 0, mood: i === 0 ? "smug" : "happy", coinTail: i !== 0 && f >= 975, phase: u < 1 ? f * 0.8 : 0, sit: u >= 1 } });
    if (i !== 0 && f >= 975 + i * 2) { const v = prog(f, 975 + i * 2, 22); c.push(fx(`kp${i}`, TEX.plus(), [tx - 0.25, 0.55 + v * 0.5, tz + 0.05], 0.4 * overshoot(v * 3), 0.4 * overshoot(v * 3), 1 - v * v * 0.6)); }
  }
  return c;
};

// 9. WORSE (1013-1123): the inspector peers over the bushes... "Rat farms": burst over the fence.
const s9cam = (f: number): Cam => shake(track(f, [
  { f: 1013, cam: { pos: [-1.0, 1.5, 5.4], look: [-1.5, 1.2, 0.8], fov: 38 } },
  { f: 1090, cam: { pos: [-0.2, 2.7, 2.7], look: [-0.15, 0.6, -2.9], fov: 46 }, dur: 10 },
]), f, 1092, 0.1);
const pen = (f: number, n: number): CastItem[] => swarm("pen", n, f, (i, r) => {
  const a = r() * 6.28 + f * 0.01 * (i % 2 ? 1 : -1), rad = 0.25 + r() * 1.1;
  return { p: [PEN[0] - 0.4 + Math.cos(a) * rad * 1.5, 0, PEN[2] + Math.sin(a) * rad], flip: Math.sin(a) > 0 === (i % 2 === 0), s: i % 3 === 0 ? 1.1 : 1.45 };
}, (i) => ({ mood: i % 4 === 0 ? "smug" : "happy", baby: i % 3 === 0 }));
const s9 = (f: number): CastItem[] => {
  const seen = f >= 1090, peek = burst(prog(f, 1013, 7));
  return [
    person("insp", INSPECTOR, [-1.75, -0.75 + 0.75 * peek, 1.25], seen ? { eyes: "wide", mouth: "o", brow: -1, face: 0.6, rh: [0.9, -0.5], held: "magnifier", lh: [-0.8, -0.6], squash: pop(f, 1090), sweat: true } : { eyes: "side", mouth: "dash", face: 0.7, look: [0.9, 0], brow: 0.4, rh: [0.9, -0.3], held: "magnifier", lh: [-0.3, 1.0] }, f, 9, 1.7),
    person("farmer", FARMER, [1.7, 0, -2.6], { eyes: seen ? "wide" : "happy", mouth: seen ? "wave" : "smile", face: -0.5, rh: [0.4, 0.9], held: "bucket", lh: [-0.5, 1.0], sweat: seen, brow: seen ? -1 : 0 }, f, 12, 1.6),
    ...pen(f, 44),
  ];
};

// 10. BREEDING (1123-1193): the farmer, the basket, the tails.
const s10cam = (f: number): Cam => track(f, [
  { f: 1123, cam: { pos: [1.2, 1.5, 2.9], look: [1.6, 1.0, -2.2], fov: 40 } },
  { f: 1160, cam: { pos: [1.55, 1.6, 2.7], look: [1.55, 0.95, -0.75], fov: 44 }, dur: 10 },
]);
const s10 = (f: number): CastItem[] => {
  const show = f >= 1160;
  return [
    person("farmer", FARMER, show ? [1.35, 0, -0.75] : [1.7, 0, -2.6], show ? { eyes: "happy", mouth: "grin", face: 0.3, rh: [0.75, -0.5], held: "tails", lh: [-0.75, -0.3], heldL: "coin", squash: pop(f, 1160) } : { eyes: "happy", mouth: "smile", face: -0.5, rh: [0.4, 0.6 + 0.2 * Math.sin(f * 0.5)], held: "bucket", lh: [-0.5, 1.0] }, f, 12, 1.6),
    ...pen(f, 44),
  ];
};

// 11. CANCELLED (1193-1241): the stamp comes down on the poster.
const s11cam = (f: number): Cam => shake(track(f, [
  { f: 1193, cam: { pos: [-0.3, 1.95, 0.1], look: [-0.35, 1.6, -3.9], fov: 50 } },
]), f, 1212, 0.14);
const s11 = (f: number): CastItem[] => [
  person("off", OFFICIAL, [0.3, 0, -3.3], f >= 1212 ? { eyes: "angry", mouth: "frown", brow: 1, face: -0.7, lh: [-1.1, 0.0], heldL: "stamp", rh: [0.4, 1.0], squash: pop(f, 1212) } : { eyes: "angry", mouth: "teeth", brow: 1, face: -0.7, lh: [-0.7, -1.2], heldL: "stamp", rh: [0.4, 1.0], squash: antic(f, 1212, 6) }, f, 1),
];

// 12. PAYOFF (1241-1335): dusk. The street belongs to the rats.
const s12cam = (f: number): Cam => track(f, [
  { f: 1241, cam: { pos: [0.3, 1.5, 4.6], look: [0.4, 1.25, 0], fov: 38 } },
  { f: 1281, cam: { pos: [0.3, 2.7, 6.9], look: [0.35, 1.25, -1], fov: 46 }, dur: 14, rate: 0.0012 },
]);
const s12 = (f: number): CastItem[] => {
  const wide = f >= 1281;
  return [
    person("off", OFFICIAL, [0.45, 0, 0.6], wide ? { eyes: "squeeze", mouth: "frown", rh: [-0.55, -1.15], lh: [-0.4, 1.1], tilt: 0.1, squash: pop(f, 1281), blink: false } : { eyes: "lid", mouth: "frown", brow: 0.3, face: 0, look: [0, 0.6], rh: [0.3, 1.1], lh: [-0.3, 1.1] }, f, 1),
    ...swarm("end", wide ? 70 : 16, f, (i, r) => {
      const born = wide ? 1281 + (i - 16) * 0.5 : 0; if (i >= 16 && f < born) return null;
      const dir = i % 2 ? 1 : -1, z = -1.6 + (i % 9) * 0.62 + r() * 0.3, span = 12, x = (((f * (0.03 + r() * 0.03) + r() * span) % span) + span) % span - span / 2;
      if (Math.abs(x - 0.45) < 0.5 && Math.abs(z - 0.6) < 0.25) return null;
      return { p: [dir > 0 ? x : -x, z < -1.2 ? 0.16 : 0, z], flip: dir < 0, s: (0.95 + (z + 2) * 0.05) * (i >= 16 ? overshoot(prog(f, born, 6)) : 1) };
    }, (i) => ({ tail: i % 3 !== 0, bandage: i % 3 === 0, mood: i % 4 === 0 ? "smug" : i % 3 === 0 ? "happy" : "plain", baby: i % 7 === 3 })),
    ...(wide ? [0, 1, 2].map((i) => ({ kind: "rat" as const, id: `hat${i}`, at: [0.19 + i * 0.26, 1.83 + (i === 1 ? 0.1 : 0), 0.61] as V3, s: 0.5 * overshoot(prog(f, 1290 + i * 5, 6)), flip: i === 1, rat: { mood: "smug" as const, tail: i !== 1, bandage: i === 1, sit: true } })).filter((_, i) => f >= 1290 + i * 5) : []),
  ];
};

const shots: Shot[] = [
  { a: 0, b: 169, set: "office", mood: "interior", cam: s1cam, cast: s1 },
  { a: 169, b: 268, set: "street", mood: "day", cam: s2cam, cast: s2, into: "flash" },
  { a: 268, b: 385, set: "sewer", mood: "sewer", cam: s3cam, cast: s3, into: "dip" },
  { a: 385, b: 522, set: "sewer", mood: "sewer", cam: s4cam, cast: s4, into: "whip" },
  { a: 522, b: 621, set: "street", mood: "day", cam: s5cam, cast: s5, into: "dip" },
  { a: 621, b: 716, set: "office", mood: "interior", cam: s6cam, cast: s6, into: "whip" },
  { a: 716, b: 830, set: "street", mood: "golden", cam: s7cam, cast: s7, into: "whip" },
  { a: 830, b: 1013, set: "explain", mood: "explain", cam: s8cam, cast: s8, into: "dip" },
  { a: 1013, b: 1123, set: "farm", mood: "golden", cam: s9cam, cast: s9, into: "dip" },
  { a: 1123, b: 1193, set: "farm", mood: "golden", cam: s10cam, cast: s10, into: "whip" },
  { a: 1193, b: 1241, set: "office", mood: "interior", cam: s11cam, cast: s11, into: "whip" },
  { a: 1241, b: TOTAL, set: "street", mood: "dusk", cam: s12cam, cast: s12, into: "whip" },
];

export const film: Film = { total: TOTAL, sets: { office, street: streetSet, sewer, explain, farm }, shots, words };
export { MANHOLE };
