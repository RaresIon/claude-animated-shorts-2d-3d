// "The Rat Tail Problem" — shot list.
// Camera grammar measured on three full reference videos (docs/reference-motion.md): no hard cuts (new places
// dissolve in, same-place changes are one camera burst), the camera never stops, low / high / tilted angles, prop
// inserts and one far wide, the hook opens mid-action, mouths flap only on in-character lines.
// Shots are authored on the v1 timeline; `warp` moves every beat onto the current voice (words.json).
import { CastItem, Film, Shot, clock } from "../../stage/Stage";
import { Cam, shake, track } from "../../stage/camera";
import { Look, Pose, Rat, blinkAt, talk } from "../../stage/chars";
import { V3, bump, burst, overshoot, prog, rng } from "../../stage/util";
import { PEN, TEX, explain, farm, office, sewer, streetSet } from "./sets";
import words from "./words.json";

// ---------------------------------------------------------------- timing
/** frame of the n-th occurrence of a spoken word (30 fps), plus an offset: every beat is pinned to a word */
const F = (w: string, n = 0, d = 0) => { const m = words.filter((x) => x.w.toLowerCase().replace(/[^a-z']/g, "") === w); if (!m[n]) throw new Error(`word not found: ${w} #${n}`); return Math.round(m[n].s * 30) + d; };
export const TOTAL = Math.round(words[words.length - 1].e * 30) + 12;
export const warp = {
  from: [0, 114, 169, 226, 268, 385, 452, 497, 522, 596, 621, 716, 786, 830, 866, 894, 944, 975, 1013, 1085, 1090, 1123, 1160, 1193, 1212, 1241, 1281, 1335],
  to: [0, F("and", 0, -5), F("city", 0, -3), F("pride"), F("rats", 1, -3), F("so", 0, -3), F("twenty"), F("it", 0, 0), F("new", 1, -2), F("rat's", 0, 0), F("and", 1, -2), F("then", 0, -2), F("rats", 3), F("you", 0, -2), F("pays"), F("but"), F("makes"), F("with", 3), F("then", 1, -2), F("town", 0, 12), F("it", 1, 0), F("people", 1, -2), F("just", 2), F("so", 1, -2), F("cancelled"), F("they", 1), F("and", 3), TOTAL],
};
/** spoken lines: real frames [start, end) of each in-character line, for the mouth flap */
const LINE = { catcher: [F("twenty"), F("day", 0, 10)], governor: [F("new", 1), F("tail", 0, 10)], farmer: [F("it's"), F("farm", 0, 10)] };
const say = (who: keyof typeof LINE) => talk(clock.real, LINE[who][0], LINE[who][1]);

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
  ({ kind: "person", id, look, at, h, flip, pose: { ...pose, blink: pose.blink ?? blinkAt(Math.floor(f), seed) } });
/** a pose that pops in at frame `a`: squash-and-stretch settle over 7 frames */
const pop = (f: number, a: number) => (f < a ? 1 : 0.86 + 0.14 * overshoot(prog(f, a, 7), 2.6));
const antic = (f: number, a: number, n = 4) => (f >= a - n && f < a ? 0.93 : 1); // anticipation dip just before a pop
/** idle life in a hold: a slight head bob */
const bob = (f: number, seed = 0) => Math.round(Math.sin(f * 0.19 + seed) * 3) * 0.006;

/** a crowd of rats: deterministic positions, each with its own phase */
const swarm = (id: string, n: number, f: number, at: (i: number, r: () => number) => { p: V3; flip?: boolean; s?: number; t?: number } | null, rat: (i: number) => Partial<Rat> = () => ({})): CastItem[] => {
  const out: CastItem[] = [];
  for (let i = 0; i < n; i++) {
    const q = at(i, rng(i * 7 + 3)); if (!q) continue;
    out.push({ kind: "rat", id: `${id}${i}`, at: q.p, flip: q.flip, s: q.s ?? 1, rat: { phase: (q.t ?? f) * 0.9 + i * 1.7, tail: true, col: ["#8f8794", "#7f7788", "#9a8f8a", "#857f96"][i % 4], ...rat(i) } });
  }
  return out;
};
const fx = (id: string, tex: ReturnType<typeof TEX.heart>, at: V3, w: number, h = w, opacity = 1, roll = 0): CastItem => ({ kind: "card", id, tex, at, w, h, opacity, roll });

// ---------------------------------------------------------------- shots
// 1. HOOK: frame 0 is already the action, a dead rat coming down on the desk, seen from a low tilted camera that is
//    already pulling out. A coin is paid. "And ended up with more rats": up to a high angle, the room is full.
const s1cam = (f: number): Cam => shake(shake(track(f, [
  { f: 0, cam: { pos: [-1.25, 0.7, 1.0], look: [0.3, 1.15, -1.5], fov: 46, roll: 0.16 } },
  { f: 1, cam: { pos: [-1.7, 0.85, 2.0], look: [0.3, 1.2, -1.5], fov: 46, roll: 0.11 }, dur: 26 },
  { f: 58, cam: { pos: [0.25, 1.75, 0.9], look: [0.7, 1.45, -2.1], fov: 40, roll: -0.05 }, dur: 12 },
  { f: 114, cam: { pos: [0.3, 3.7, 3.4], look: [0.1, 0.55, -1.0], fov: 46, roll: -0.07 }, dur: 12 },
]), f, 10, 0.07), f, 114, 0.1);
const s1 = (f: number): CastItem[] => {
  const slam = burst(prog(f, 0, 10)), pay = prog(f, 30, 8), more = f >= 114;
  const c: CastItem[] = [
    person("off", OFFICIAL, [0.75, 0, -2.15], more ? { eyes: "wide", mouth: "o", brow: -1, rh: [0.9, -0.6], lh: [-0.9, -0.6], squash: pop(f, 114), sweat: true, look: [-0.6, 0.6] } : f < 30 ? { eyes: "wide", mouth: "o", brow: -0.6, face: -0.5, lh: [-0.7, 0.2], rh: [0.6, 0.3], squash: pop(f, 10) } : { eyes: "happy", mouth: "smile", face: -0.6, lh: [-1.1 - 0.5 * burst(pay), 0.25 - 0.1 * bump(pay)], heldL: "coin", rh: [0.3, 1.1], squash: pop(f, 30) * antic(f, 30), tilt: bob(f) }, f, 1),
    person("loc", LOCAL_A, [-0.45, 0, -0.55], more ? { eyes: "side", mouth: "smirk", face: 0.7, rh: [0.9, 0.2], held: "coin", lh: [-0.4, 1.1], look: [0.8, 0.2] } : { eyes: f > 40 ? "happy" : "angry", mouth: f > 40 ? "smile" : "open", brow: f > 40 ? 0 : 0.6, face: 0.7, rh: [1.0, -1.3 + 1.7 * slam], held: f < 40 ? "rat" : "coin", lh: [-0.4, 1.1], lean: 0.14 * (1 - slam), squash: pop(f, 40) * pop(f, 10), tilt: bob(f, 2) }, f, 2, 1.62),
  ];
  if (more) c.push(...swarm("h", 46, f, (i, r) => {
    const born = 114 + i * 0.7; if (f < born) return null;
    const lane = i % 3, dir = i % 2 ? 1 : -1, sp = 0.035 + r() * 0.03;
    if (i < 6) return { p: [-0.5 + i * 0.36, 0.95, -1.02 + (i % 2) * 0.14], flip: i % 2 === 0, s: 0.85 * overshoot(prog(f, born, 6)), t: f * 0.3 };
    const x = ((dir * (f - born) * sp + r() * 8) % 8 + 8) % 8 - 4;
    return { p: [dir > 0 ? x : -x, 0, 0.3 + lane * 0.8 + r() * 0.5], flip: dir < 0, s: 1 + lane * 0.12 };
  }, (i) => ({ mood: i % 5 === 0 ? "smug" : i % 3 === 0 ? "happy" : "plain" })));
  return c;
};

// 2. STREET: the grand opening, from a low angle by the manhole. Ribbon cut on "pride"... then the camera drops
//    into the manhole, and the dark dissolves into the sewer.
const s2cam = (f: number): Cam => track(f, [
  { f: 169, cam: { pos: [1.0, 0.45, 3.9], look: [-0.2, 1.4, 0.5], fov: 46, roll: -0.1 } },
  { f: 220, cam: { pos: [0.2, 1.75, 5.4], look: [0.1, 1.25, 0.4], fov: 40 }, dur: 10 },
  { f: 249, cam: { pos: [0.0, 2.1, 1.75], look: [0.0, -0.4, 1.22], fov: 40, roll: 0.25 }, dur: 20 },
]);
const s2 = (f: number): CastItem[] => {
  const cut = f >= 226, clap = Math.sin(f * 1.3) * 0.18;
  return [
    person("off", OFFICIAL, [-0.55, 0, 0.75], cut ? { eyes: "happy", mouth: "grin", rh: [0.9, -0.9], held: "scissors", lh: [-0.8, -0.7], squash: pop(f, 226) } : { eyes: "lid", mouth: "smile", face: 0.5, rh: [0.75, 0.5], held: "scissors", lh: [-0.4, 1.1], squash: antic(f, 226), tilt: bob(f) }, f, 1),
    person("lady", LADY, [0.95, 0, 0.6], { eyes: cut ? "happy" : "lid", mouth: cut ? "open" : "smile", face: -0.5, rh: [-0.15 + (cut ? clap : 0), 0.35], lh: [0.15 - (cut ? clap : 0), 0.35], tilt: bob(f, 3) }, f, 4, 1.6),
    person("clerk", CLERK, [-2.3, 0.16, -2.7], { eyes: "happy", mouth: "smile", face: 0.5, rh: [0.1 + (cut ? clap : 0), 0.3], lh: [0.3 - (cut ? clap : 0), 0.3] }, f, 5, 1.65),
    person("locb", LOCAL_B, [2.2, 0.16, -2.6], { eyes: "lid", mouth: "dash", face: -0.6, brow: 0.2 }, f, 6, 1.6),
    ...(cut ? [0, 1, 2, 3, 4, 5].map((i) => fx(`conf${i}`, TEX.spark(), [-1 + i * 0.4, 1.4 + (f - 226) * (0.05 + i * 0.008) - 0.002 * (f - 226) ** 2 + (i % 2) * 0.5, 1.0], 0.3, 0.3, Math.max(0, 1 - (f - 226) / 30), f * 0.1 + i)) : []),
  ];
};

// 3. SEWER: a low tracking shot along the rat highway, then one burst to an insert of the boss of the lane.
const s3cam = (f: number): Cam => { const x = -2.6 + (f - 268) * 0.03; return { pos: [x, 0.42, 2.85], look: [x + 1.1, 0.75, -2.2], fov: 48, roll: 0.07 }; };
const highway = (f: number, n: number, both = true): CastItem[] => swarm("hw", n, f, (i, r) => {
  const far = i % 3 !== 0, dir = both && i % 4 < 2 ? -1 : 1, sp = 0.07 + r() * 0.03, span = 13;
  const x = (((f * sp + i * 1.37) % span) + span) % span - span / 2;
  return { p: [dir > 0 ? x : -x, 0, far ? -1.75 - r() * 0.75 : 2.0 + r() * 0.35], flip: dir < 0, s: far ? 1.5 : 1.3 };
}, (i) => ({ mood: i % 4 === 0 ? "happy" : i % 7 === 0 ? "smug" : "plain", baby: i % 9 === 4 }));
const s3 = (f: number): CastItem[] => highway(f, 34);
const BOSS: V3 = [1.55, 0, 2.15];
const s3bcam = (f: number): Cam => track(f, [{ f: 336, cam: { pos: [0.45, 0.4, 3.75], look: [1.55, 0.3, 2.15], fov: 36, roll: -0.06 }, rate: 0.003 }]);
const s3b = (f: number): CastItem[] => [
  ...highway(f, 34).filter((c) => c.at[2] < 0),
  { kind: "rat", id: "boss", at: BOSS, s: 1.3 * pop(f, 338), flip: true, rat: { mood: "smug", sit: true, tail: true, col: "#7f7788" } },
];

// 4. CATCHERS: low angle on the catcher ("Twenty thousand rats a day!", his line), the tally board, then from
//    above as the rats run right over him. "It still wasn't enough."
const s4cam = (f: number): Cam => shake(track(f, [
  { f: 385, cam: { pos: [5.0, 0.55, 1.1], look: [5.75, 1.3, -2.2], fov: 46, roll: -0.09 } },
  { f: 452, cam: { pos: [6.2, 1.5, 2.5], look: [6.3, 1.15, -2.6], fov: 40 }, dur: 9 },
  { f: 497, cam: { pos: [5.5, 3.3, 1.5], look: [5.7, 0.5, -2.0], fov: 48, roll: 0.08 }, dur: 9 },
]), f, 497, 0.08);
const s4 = (f: number): CastItem[] => {
  const tally = f >= 452 && f < 497, tired = f >= 497, sw = prog(f, 410, 9);
  return [
    person("cat", CATCHER, [5.6, 0, -2.2], tired ? { eyes: "lid", mouth: "frown", brow: 0.5, face: 0, rh: [0.5, 1.2], held: "net", lh: [-0.5, 1.1], heldL: "lantern", squash: pop(f, 497), sweat: true } : tally ? { eyes: "happy", mouth: say("catcher") ?? "grin", face: 0.6, rh: [1.0, -0.6], lh: [-0.4, 1.0], heldL: "lantern", squash: pop(f, 452), tilt: bob(f) } : { eyes: "angry", mouth: "open", brow: 1, face: 0.5, rh: [0.9 - 0.5 * bump(sw), -0.5 + 1.2 * burst(sw)], held: "net", lh: [-0.5, 0.9], heldL: "lantern", lean: 0.12 * bump(sw), squash: antic(f, 410) }, f, 3),
    person("cat2", { ...CATCHER, hatCol: "#7a3a34", coat: "#4a5a6a" }, [4.55, 0, -2.7], { eyes: tired ? "wide" : "lid", mouth: tired ? "o" : "dash", face: 0.5, rh: [0.4, 1.0], held: "sack", lh: [-0.4, 1.1], brow: tired ? -1 : 0 }, f, 7, 1.6),
    ...(tired ? swarm("ov", 30, f, (i, r) => { const x = 9.5 - ((f - 497) * (0.16 + r() * 0.06) + i * 0.45) % 9; const over = i % 3 === 0; return { p: [x, over ? 1.72 + Math.sin((x - 5.5) * 2) * 0.05 : 0, over ? -2.19 : -1.6 + r() * 0.6 - (i % 2) * 1.0], flip: true, s: over ? 0.7 : 1 }; }, (i) => ({ mood: i % 3 ? "happy" : "smug" })) : highway(f, 10, false)),
  ];
};

// 5. NEW PLAN: the governor at the poster, over a villager's shoulder ("New plan! One cent, for every rat's tail!").
//    Then one burst to the insert: the first cent lands in a hand.
const s5cam = (f: number): Cam => track(f, [
  { f: 522, cam: { pos: [-0.45, 1.35, 0.5], look: [0.15, 1.6, -4.0], fov: 42, roll: 0.07 } },
  { f: 560, cam: { pos: [-0.3, 1.45, 0.2], look: [0.2, 1.6, -4.0], fov: 40, roll: 0.05 }, dur: 10 },
]);
const VILLAGER: V3 = [-0.95, 0.16, -1.2];
const s5 = (f: number): CastItem[] => {
  const pt = burst(prog(f, 528, 8));
  return [
    person("off", OFFICIAL, [0.62, 0.16, -3.25], { eyes: "happy", mouth: say("governor") ?? "grin", face: -0.5, lh: [-0.5 - 0.6 * pt, 0.9 - 1.5 * pt], rh: [0.5, f > 560 ? -0.8 : 1.0], held: f > 560 ? "coin" : null, squash: pop(f, 528) * pop(f, 560), tilt: bob(f) }, f, 1),
    person("locc", LOCAL_C, [-0.55, 0.16, -3.3], { eyes: f > 560 ? "wide" : "lid", mouth: f > 560 ? "o" : "dash", face: 0.7, brow: f > 560 ? -1 : 0.2, lh: [-0.3, 1.1], rh: [0.3, 1.1], squash: pop(f, 562) }, f, 8, 1.55),
    person("loc", LOCAL_A, VILLAGER, { eyes: "side", mouth: f > 566 ? "smirk" : "dash", face: 0.9, look: [0.9, -0.3], rh: [0.6, f > 566 ? -0.2 : 1.0], held: f > 566 ? "tail" : null, lh: [-0.4, 1.1], squash: pop(f, 566) }, f, 2, 1.62),
    ...(f >= 548 && f < 566 ? [fx("bang", TEX.bang(), [VILLAGER[0] + 0.1, 2.15, VILLAGER[2]], 0.3 * overshoot(prog(f, 548, 6)), 0.38 * overshoot(prog(f, 548, 6)))] : []),
  ];
};
const s5bcam = (f: number): Cam => track(f, [{ f: 596, cam: { pos: [-0.5, 1.3, 0.8], look: [-0.9, 1.3, -1.2], fov: 36, roll: -0.08 }, rate: 0.004 }]);
const s5b = (f: number): CastItem[] => [
  person("loc", LOCAL_A, VILLAGER, { eyes: "happy", mouth: "smile", face: 0.2, rh: [0.75, -0.75], held: "coin", lh: [-0.7, -0.5], heldL: "tail", squash: pop(f, 598) }, f, 2, 1.62),
  fx("pl", TEX.plus(), [VILLAGER[0] + 0.55, 1.95 + (f - 598) * 0.01, VILLAGER[2] + 0.05], 0.42, 0.42, Math.max(0, 1 - (f - 598) / 22)),
];

// 6. TAILS POUR IN: from above, the pile grows as the queue files past. Then a low angle on a thrilled governor.
const s6cam = (f: number): Cam => track(f, [
  { f: 621, cam: { pos: [-0.7, 3.3, 2.0], look: [0.25, 0.95, -1.4], fov: 46, roll: 0.09 } },
  { f: 690, cam: { pos: [0.5, 1.75, 0.7], look: [1.0, 1.25, -2.1], fov: 40, roll: -0.07 }, dur: 10 },
]);
const s6 = (f: number): CastItem[] => {
  const step = Math.floor((f - 621) / 22), u = ((f - 621) % 22) / 22, thr = f >= 690;
  const q = (i: number): V3 => [-0.5 - i * 0.28, 0, -0.45 + i * 0.75];
  const looks = [LOCAL_A, LOCAL_B, LOCAL_C, { ...LOCAL_A, coat: "#4a6a8a" }];
  return [
    person("off", OFFICIAL, [1.05, 0, -2.15], thr ? { eyes: "happy", mouth: "grin", rh: [0.9, -0.9], lh: [-0.9, -0.9], squash: pop(f, 690), tilt: bob(f) } : { eyes: "happy", mouth: "smile", face: -0.5, lh: [-0.9, 0.5 - 0.3 * bump(u)], heldL: "coin", rh: [0.6, 0.3 + 0.5 * bump(u * 2 % 1)], held: "stamp" }, f, 1),
    ...(thr ? [] : [0, 1, 2].map((i) => { const k = (step + i) % 4, a = q(i), b = q(Math.max(0, i - 1)), e = i === 0 ? 0 : burst(u * 2.2);
      return person(`q${(step + i) % 5}`, looks[k], i === 0 ? [a[0] + Math.max(0, u - 0.45) * -3.2, 0, a[2] + Math.max(0, u - 0.45) * 1.2] : [a[0] + (b[0] - a[0]) * e, 0, a[2] + (b[2] - a[2]) * e], { eyes: i === 0 ? "happy" : "lid", mouth: i === 0 ? "grin" : "smirk", face: i === 0 && u > 0.3 ? -0.7 : 0.7, rh: [0.9, 0.3], held: i === 0 && u > 0.25 ? "coin" : "tails", lh: [-0.4, 1.1], walk: i === 0 ? (u > 0.25 ? f * 0.7 : undefined) : e < 1 ? f * 0.7 : undefined }, f, 10 + k, 1.6, i === 0 && u > 0.3); })),
  ];
};

// 7. SOMETHING ODD: the governor strolls past in profile, the camera walking with him. He stops. From above: at
//    his feet, rats, alive, each with a bandage where the tail was.
const walkX = (f: number) => 2.6 - 1.5 * prog(f, 716, 44);
const s7cam = (f: number): Cam => track(f, [
  { f: 716, cam: { pos: [walkX(f) + 0.5, 1.15, 4.4], look: [walkX(f) - 0.2, 1.15, 0.3], fov: 40, roll: -0.04 } },
  { f: 783, cam: { pos: [0.85, 3.3, 3.6], look: [0.9, 0.45, 0.8], fov: 44, roll: 0.09 }, dur: 9 },
]);
const s7 = (f: number): CastItem[] => {
  const stopF = 760, walking = f < stopF, x = walkX(f), low = f >= 783;
  return [
    person("off", OFFICIAL, [x, 0, 0.3], walking ? { view: "side", eyes: "lid", mouth: "smile", face: -1, walk: f * 0.55, rh: [0.25 + 0.3 * Math.sin(f * 0.55), 1.1], lh: [-0.25 - 0.3 * Math.sin(f * 0.55), 1.1] } : { eyes: "wide", mouth: low ? "o" : "dash", brow: -1, face: -0.5, look: [-0.5, 0.9], rh: [0.5, low ? -0.2 : 1.0], lh: [-0.5, low ? -0.2 : 1.0], squash: pop(f, stopF) * pop(f, 786), tilt: -0.08, sweat: low }, f, 1),
    ...(!walking && !low ? [fx("q", TEX.q(), [x - 0.1, 2.25, 0.3], 0.34 * overshoot(prog(f, stopF + 2, 6)), 0.42 * overshoot(prog(f, stopF + 2, 6)))] : []),
    ...swarm("nt", 9, f, (i, r) => { const xx = 3.0 - ((f - 716) * (0.02 + r() * 0.006) + i * 0.62) % 5.2; return { p: [xx, 0, 0.75 + (i % 3) * 0.42 + r() * 0.1], s: 1.7, t: f * 0.55, flip: true }; }, (i) => ({ tail: false, bandage: true, mood: i % 2 ? "smug" : "happy" })),
  ];
};

// 8. YOU SEE: one dead rat = one cent. A tailless rat goes home... and comes back with a family.
const s8cam = (f: number): Cam => track(f, [
  { f: 830, cam: { pos: [-1.5, 1.2, 3.4], look: [-1.15, 1.1, 0.3], fov: 40, roll: 0.06 } },
  { f: 892, cam: { pos: [0.3, 0.35, 3.3], look: [0.55, 1.0, -1.5], fov: 42, roll: -0.05 }, dur: 11 },
  { f: 972, cam: { pos: [0.55, 0.6, 2.5], look: [0.6, 0.8, -1.3], fov: 44, roll: 0.04 }, dur: 10 },
]);
const s8 = (f: number): CastItem[] => {
  const c: CastItem[] = [];
  c.push({ kind: "rat", id: "dead", at: [-1.15, 0.72, 0.3], s: 1.9, rat: { dead: true, tail: true }, shadow: false });
  if (f >= 866) c.push(fx("eq", TEX.equals1(), [-1.15, 1.75, 0.3], 1.3 * overshoot(prog(f, 866, 7)), 0.65 * overshoot(prog(f, 866, 7))));
  const home: V3 = [0.95, 0, -2.6], go = prog(f, 894, 44);
  if (f >= 884 && f < 940) c.push({ kind: "rat", id: "hero", at: [-0.3 + (home[0] + 0.3) * go, 0, 0.1 + (home[2] - 0.1) * go], s: 2.3 - 0.9 * go, rat: { tail: false, bandage: true, mood: "smug", phase: f * 0.6 } });
  if (f >= 938 && f < 975) for (let i = 0; i < 3; i++) { const u = prog(f, 938 + i * 7, 26); if (u > 0 && u < 1) c.push(fx(`he${i}`, TEX.heart(), [home[0] - 0.3 + i * 0.35, 1.5 + u * 1.0, home[2] + 0.2], 0.42 * overshoot(u * 3), 0.42 * overshoot(u * 3), 1 - u * u)); }
  const kids = Math.min(11, Math.floor((f - 946) / 4.2));
  for (let i = 0; i < kids; i++) { const born = 946 + i * 4.2, u = burst(prog(f, born, 12)), row = Math.floor(i / 4), tx = -0.25 + (i % 4) * 0.5 + (row % 2) * 0.22, tz = -1.75 + row * 0.6;
    c.push({ kind: "rat", id: `kid${i}`, at: [home[0] + (tx - home[0]) * u, Math.sin(u * Math.PI) * 0.5, home[2] + 0.3 + (tz - home[2]) * u], s: (i === 0 ? 1.2 : 0.95) * overshoot(prog(f, born, 6)), rat: { baby: i !== 0, tail: i !== 0, bandage: i === 0, mood: i === 0 ? "smug" : "happy", coinTail: i !== 0 && f >= 975, phase: u < 1 ? f * 0.8 : 0, sit: u >= 1 } });
    if (i !== 0 && f >= 975 + i * 2) { const v = prog(f, 975 + i * 2, 22); c.push(fx(`kp${i}`, TEX.plus(), [tx - 0.25, 0.55 + v * 0.5, tz + 0.05], 0.4 * overshoot(v * 3), 0.4 * overshoot(v * 3), 1 - v * v * 0.6)); }
  }
  return c;
};

// 9. OUTSIDE TOWN: a far wide, the inspector a small figure marching up to the farm. One burst in: he peers over
//    the bushes while the farmer protests ("It's not a rat farm!"). Then up and over the fence: it was a rat farm.
const pen = (f: number, n: number): CastItem[] => swarm("pen", n, f, (i, r) => {
  const a = r() * 6.28 + f * 0.01 * (i % 2 ? 1 : -1), rad = 0.25 + r() * 1.1;
  return { p: [PEN[0] - 0.4 + Math.cos(a) * rad * 1.5, 0, PEN[2] + Math.sin(a) * rad], flip: Math.sin(a) > 0 === (i % 2 === 0), s: i % 3 === 0 ? 1.1 : 1.45 };
}, (i) => ({ mood: i % 4 === 0 ? "smug" : "happy", baby: i % 3 === 0 }));
const FARMER_AT: V3 = [0.55, 0, 0.3];
const farmer = (f: number, protest: boolean, seen: boolean): CastItem => person("farmer", FARMER, FARMER_AT, seen ? { eyes: "wide", mouth: "wave", face: -0.5, rh: [0.4, 0.9], held: "bucket", lh: [-0.5, 1.0], sweat: true, brow: -1, squash: pop(f, 1090) } : protest ? { eyes: "wide", mouth: say("farmer") ?? "teeth", brow: -0.8, face: -0.6, rh: [0.9, -0.8 + 0.25 * Math.round(Math.sin(clock.real * 0.9))], lh: [-0.9, -0.8 - 0.25 * Math.round(Math.sin(clock.real * 0.9))], sweat: true } : { eyes: "happy", mouth: "smile", face: -0.5, rh: [0.4, 0.9], held: "bucket", lh: [-0.5, 1.0] }, f, 12, 1.6);
const s9acam = (f: number): Cam => track(f, [{ f: 1013, cam: { pos: [-6.2, 1.1, 19], look: [-0.8, 1.9, -3], fov: 38, roll: 0.03 }, rate: 0.0035 }]);
const s9a = (f: number): CastItem[] => [
  person("insp", INSPECTOR, [-6.2 + 2.9 * prog(f, 1013, 34), 0, 2.2], { view: "side", face: 1, eyes: "lid", mouth: "dash", walk: f * 0.6, rh: [0.4, 0.2], held: "magnifier", lh: [-0.3, 1.0] }, f, 9),
  farmer(f, false, false), ...pen(f, 30),
];
const s9cam = (f: number): Cam => shake(track(f, [
  { f: 1045, cam: { pos: [-1.9, 1.5, 4.3], look: [0.9, 1.05, -1.4], fov: 42, roll: -0.06 } },
  { f: 1090, cam: { pos: [-0.2, 2.9, 2.6], look: [-0.15, 0.6, -2.9], fov: 46, roll: 0.07 }, dur: 10 },
]), f, 1092, 0.1);
const s9 = (f: number): CastItem[] => {
  const seen = f >= 1090, peek = burst(prog(f, 1045, 7));
  return [
    person("insp", INSPECTOR, [-0.85, -0.75 + 0.75 * peek, 1.3], seen ? { eyes: "wide", mouth: "o", brow: -1, face: 0.6, rh: [0.9, -0.5], held: "magnifier", lh: [-0.8, -0.6], squash: pop(f, 1090), sweat: true } : { eyes: "side", mouth: "dash", face: 0.7, look: [0.9, 0], brow: 0.4, rh: [0.9, -0.3], held: "magnifier", lh: [-0.3, 1.0] }, f, 9, 1.7),
    farmer(f, !seen, seen), ...pen(f, 44),
  ];
};

// 10. BREEDING: a low hero angle on the farmer, tails in one hand, coin in the other.
const s10cam = (f: number): Cam => track(f, [
  { f: 1123, cam: { pos: [0.1, 1.4, 3.7], look: [0.55, 1.0, 0.3], fov: 42, roll: 0.05 } },
  { f: 1160, cam: { pos: [1.2, 0.5, 2.8], look: [0.55, 1.15, 0.3], fov: 44, roll: -0.1 }, dur: 10 },
]);
const s10 = (f: number): CastItem[] => {
  const show = f >= 1160;
  return [
    person("farmer", FARMER, FARMER_AT, show ? { eyes: "happy", mouth: "smile", face: 0.3, rh: [0.75, -0.5], held: "tails", lh: [-0.75, -0.3], heldL: "coin", squash: pop(f, 1160), tilt: bob(f) } : { eyes: "happy", mouth: "smile", face: -0.5, rh: [0.4, 0.6 + 0.2 * Math.round(Math.sin(f * 0.5))], held: "bucket", lh: [-0.5, 1.0] }, f, 12, 1.6),
    ...pen(f, 44),
  ];
};

// 11. CANCELLED: the stamp comes down on the poster.
const s11cam = (f: number): Cam => shake(track(f, [
  { f: 1193, cam: { pos: [-0.5, 1.75, 0.4], look: [-0.35, 1.6, -3.9], fov: 50, roll: 0.06 } },
  { f: 1212, cam: { pos: [-0.35, 1.9, -0.6], look: [-0.38, 1.7, -3.9], fov: 46, roll: -0.03 }, dur: 6 },
]), f, 1212, 0.14);
const s11 = (f: number): CastItem[] => [
  person("off", OFFICIAL, [0.3, 0, -3.3], f >= 1212 ? { eyes: "angry", mouth: "frown", brow: 1, face: -0.7, lh: [-1.1, 0.0], heldL: "stamp", rh: [0.4, 1.0], squash: pop(f, 1212) } : { eyes: "angry", mouth: "teeth", brow: 1, face: -0.7, lh: [-0.7, -1.2], heldL: "stamp", rh: [0.4, 1.0], squash: antic(f, 1212, 6), lean: -0.06 }, f, 1),
];

// 12. PAYOFF: dusk. Up and back to a high wide: the street belongs to the rats. Ends on the last word.
const s12cam = (f: number): Cam => track(f, [
  { f: 1241, cam: { pos: [0.9, 0.9, 3.9], look: [0.4, 1.3, 0.3], fov: 40, roll: -0.08 } },
  { f: 1281, cam: { pos: [0.3, 2.9, 4.9], look: [0.4, 1.0, 0.1], fov: 46, roll: 0.05 }, dur: 14, rate: 0.0012 },
]);
const s12 = (f: number): CastItem[] => {
  const wide = f >= 1281;
  return [
    person("off", OFFICIAL, [0.45, 0, 0.6], wide ? { eyes: "squeeze", mouth: "frown", rh: [-0.55, -1.15], lh: [-0.4, 1.1], tilt: 0.1, squash: pop(f, 1281), blink: false } : { eyes: "lid", mouth: "frown", brow: 0.3, face: 0, look: [0, 0.6], rh: [0.3, 1.1], lh: [-0.3, 1.1], tilt: bob(f) }, f, 1),
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
  { a: 169, b: 268, set: "street", mood: "day", cam: s2cam, cast: s2, into: "dissolve" },
  { a: 268, b: 336, set: "sewer", mood: "sewer", cam: s3cam, cast: s3, into: "dissolve" },
  { a: 336, b: 385, set: "sewer", mood: "sewer", cam: s3bcam, cast: s3b, into: "move", tag: "insert" },
  { a: 385, b: 522, set: "sewer", mood: "sewer", cam: s4cam, cast: s4, into: "move" },
  { a: 522, b: 596, set: "street", mood: "day", cam: s5cam, cast: s5, into: "dissolve" },
  { a: 596, b: 621, set: "street", mood: "day", cam: s5bcam, cast: s5b, into: "move", tag: "insert" },
  { a: 621, b: 716, set: "office", mood: "interior", cam: s6cam, cast: s6, into: "dissolve" },
  { a: 716, b: 830, set: "street", mood: "golden", cam: s7cam, cast: s7, into: "dissolve" },
  { a: 830, b: 1013, set: "explain", mood: "explain", cam: s8cam, cast: s8, into: "dissolve" },
  { a: 1013, b: 1045, set: "farm", mood: "golden", cam: s9acam, cast: s9a, into: "dissolve", tag: "wide" },
  { a: 1045, b: 1123, set: "farm", mood: "golden", cam: s9cam, cast: s9, into: "move" },
  { a: 1123, b: 1193, set: "farm", mood: "golden", cam: s10cam, cast: s10, into: "move" },
  { a: 1193, b: 1241, set: "office", mood: "interior", cam: s11cam, cast: s11, into: "dissolve" },
  { a: 1241, b: 1335, set: "street", mood: "dusk", cam: s12cam, cast: s12, into: "dissolve" },
];

export const film: Film = { total: TOTAL, sets: { office, street: streetSet, sewer, explain, farm }, shots, words, warp };
