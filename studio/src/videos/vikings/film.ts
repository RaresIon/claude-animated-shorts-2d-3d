// "Late for Dinner" — how the Vikings found America by accident (Bjarni Herjolfsson, c. 986).
// Every beat is pinned to a spoken word with F(); nothing is a bare frame number. Grammar per SKILL.md: no hard cuts,
// a camera that never stops, low / high / tilted angles, an insert, a far wide, a hook that opens mid-action, and
// two in-character lines with a mouth flap.
import { CastItem, Film, Shot, clock } from "../../stage/Stage";
import { Cam, shake, track } from "../../stage/camera";
import { Look, Pose, blinkAt, talk } from "../../stage/chars";
import { V3, burst, overshoot, prog } from "../../stage/util";
import { DAD_HOUSE, HOUSE, SHORE, SIGNPOST, TABLE, TEX, TIMES, coast1, coast3, fog, greenland, harbour, hook, onDeck, run, shipPose, vinland } from "./sets";
import words from "./words.json";

const F = (w: string, n = 0, d = 0) => { const m = words.filter((x) => x.w.toLowerCase().replace(/[^a-z0-9']/g, "") === w); if (!m[n]) throw new Error(`word not found: ${w} #${n}`); return Math.round(m[n].s * 30) + d; };
export const TOTAL = Math.round(words[words.length - 1].e * 30) + 12;
// shot boundaries, each on the first word of its sentence
const T = { year: F("it's", 0, -3), but: F("but", 0, -2), noMap: F("no", 0, -2), fog: F("three", 0, -1), wind: F("and", 1, -2), clears: F("when", 0, -2), crew: F("crew", 0, -5), times: F("he", 0, -2), third: F("three", 2, -2), zero: F("coasts", 0, 6), finds: F("he", 1, -2), see: F("you", 0, -2), later: F("years", 0, -2), follows: F("follows", 0, -2), walks: F("walks", 0, -4), all: F("all", 0, -2) };
TIMES.slide = T.finds + 3; TIMES.bump = F("parks", 0, 16); TIMES.sale = T.later; TIMES.runA = T.times; TIMES.runB = T.third; // the sets animate on these
const LINE = { howHard: [F("how"), F("be", 0, 12)], keep: [F("no", 2), F("sailing", 0, 14)] };
const say = (k: keyof typeof LINE) => talk(clock.real, LINE[k][0], LINE[k][1]);

// ---------------------------------------------------------------- cast
const BJARNI: Look = { coat: "#3d6a8a", trim: "#27304a", hat: "helmet", hatCol: "#b8c0c8", band: "#c9a03a", beard: "#c9762e", stout: true };
const OLD_BJARNI: Look = { ...BJARNI, beard: "#dcdcdc", hatCol: "#8f979e" }; // the same man and helmet, a grey beard
const CREW: Look[] = [
  { coat: "#7a4a34", hat: "hood", hatCol: "#5a6a4a", beard: "#5a3a24" },
  { coat: "#5a7a4a", hat: "helmet", hatCol: "#a8a096", band: "#8a8590", beard: "#e2c66a" },
  { coat: "#8a5a8a", hat: "fur", hatCol: "#6b4a2d", beard: "#3a2414" },
];
const DAD: Look = { coat: "#6b4a2d", apron: "#d9c48a", hat: "fur", hatCol: "#c9c9c9", beard: "#e6e6e6", stout: true };
const LEIF: Look = { coat: "#b9483c", trim: "#e2b84a", hat: "helmet", hatCol: "#e2b84a", band: "#f3ead2", beard: "#e2c66a" };

const person = (id: string, look: Look, at: V3, pose: Pose, f: number, seed = 1, h = 1.6, flip = false): CastItem =>
  ({ kind: "person", id, look, at, h, flip, pose: { ...pose, blink: pose.blink ?? blinkAt(Math.floor(f), seed) } });
const pop = (f: number, a: number) => (f < a ? 1 : 0.86 + 0.14 * overshoot(prog(f, a, 7), 2.6));
const antic = (f: number, a: number, n = 4) => (f >= a - n && f < a ? 0.93 : 1);
const bob = (f: number, seed = 0) => Math.round(Math.sin(f * 0.19 + seed) * 3) * 0.006;
const wave = (f: number, k = 0.9) => Math.round(Math.sin(f * k)); // -1, 0, 1: arms that pump on the beat
const fx = (id: string, tex: ReturnType<typeof TEX.q>, at: V3, w: number, h = w, opacity = 1, roll = 0, flat = false): CastItem => ({ kind: "card", id, tex, at, w, h, opacity, roll, flat });
const up = (p: V3, dy: number): V3 => [p[0], p[1] + dy, p[2]];
/** the three crewmen at their places on deck, each with the pose `pose(i)` */
const crew = (set: string, f: number, pose: (i: number) => Pose, xs = [1.35, 0.7, -1.0]): CastItem[] => CREW.map((l, i) => person(`crew${i}`, l, onDeck(set, f, xs[i], i === 1 ? -0.25 : 0.15), pose(i), f, 20 + i, 1.5 + (i % 2) * 0.06));

// ---------------------------------------------------------------- shots
// 1. HOOK: frame 0, the ship is surging at a green shore, the crew reaching for it, Bjarni's arm out: no.
//    "didn't even get off the boat": up to a high angle as the ship swings away.
const s1cam = (f: number): Cam => track(f, [
  { f: 0, cam: { pos: [4.4, 1.0, 3.2], look: [1.2, 1.9, -1.0], fov: 48, roll: 0.15 } },
  { f: 1, cam: { pos: [5.4, 1.1, 5.4], look: [0.9, 1.8, -1.0], fov: 48, roll: 0.11 }, dur: 30 },
  { f: F("didn't", 0, -2), cam: { pos: [1.5, 6.4, 8.2], look: [0.3, 0.8, -3.0], fov: 46, roll: -0.08 }, dur: 12 },
]);
const s1 = (f: number): CastItem[] => {
  const no = f >= F("didn't", 0, -2);
  return [
    person("bjarni", BJARNI, onDeck("hook", f, 2.5), no ? { eyes: "angry", mouth: "frown", brow: 1, face: -0.6, rh: [1.0, -0.5], lh: [-0.4, 1.0], squash: pop(f, F("didn't", 0, -2)) } : { eyes: "angry", mouth: "open", brow: 1, face: -0.7, lh: [-1.2, -0.2 + 0.15 * wave(f)], rh: [0.5, 0.6], lean: -0.1, squash: pop(f, 6) }, f, 1, 1.66),
    ...crew("hook", f, (i) => (no ? { eyes: "lid", mouth: "frown", brow: 0.3, face: -0.5, rh: [0.3, 1.1], lh: [-0.3, 1.1], tilt: 0.12, squash: pop(f, F("didn't", 0, 2 + i * 3)) } : { eyes: i === 1 ? "happy" : "wide", mouth: "open", brow: -1, face: -0.6, rh: [0.6, -1.1 + 0.2 * wave(f + i * 2)], lh: [-0.9, -1.0 - 0.2 * wave(f + i * 2)], lean: -0.12, squash: 1 + 0.04 * wave(f + i, 0.7) })),
  ];
};

// 2. HOME: Bjarni marches up the shore with a sack of presents, in profile, the camera walking with him. Knock, knock.
const DOOR: V3 = [HOUSE[0] - 1.04, 0.06, HOUSE[2] + 1.75];
const walkX = (f: number) => 3.2 + (DOOR[0] + 0.75 - 3.2) * prog(f, T.year, F("dad") - T.year);
const s2cam = (f: number): Cam => { const x = walkX(f); return { pos: [x + 1.2, 1.0, -SHORE + 1.6], look: [x - 0.5, 1.15, DOOR[2]], fov: 44, roll: -0.05 }; };
const s2 = (f: number): CastItem[] => {
  const there = f >= F("dad"), x = walkX(f);
  return [person("bjarni", BJARNI, [x, 0.06, DOOR[2] + 0.1], there ? { eyes: "happy", mouth: "grin", face: -0.7, rh: [-0.9, -0.5 + 0.25 * wave(f, 1.3)], lh: [-0.3, 1.0], heldL: "sack", squash: pop(f, F("dad")) } : { view: "side", face: -1, eyes: "happy", mouth: "smile", walk: f * 0.55, rh: [0.3 + 0.25 * Math.sin(f * 0.55), 1.0], held: "sack", lh: [-0.3 - 0.25 * Math.sin(f * 0.55), 1.1] }, f, 1, 1.66)];
};

// 3. THE NOTE (insert), then the signpost, then the ship: "No map. No compass. How hard can it be?" (his line).
const NOTE: V3 = [HOUSE[0] + 0.55, 1.16, HOUSE[2] + 1.5];
const s3 = (f: number): CastItem[] => {
  const sign = f >= F("a", 1, -3);
  return [
    person("bjarni", BJARNI, sign ? [SIGNPOST[0] + 1.15, 0.06, SIGNPOST[2] - 0.1] : [NOTE[0] - 1.05, 0.06, NOTE[2] + 0.5], sign ? { eyes: "side", mouth: "wave", face: -0.8, look: [-0.9, -0.2], brow: -0.6, rh: [0.4, 1.0], lh: [-0.7, -0.9], squash: pop(f, F("a", 1, 2)), sweat: true } : { eyes: "wide", mouth: "o", brow: -1, face: 0.8, look: [0.9, 0], rh: [0.3, 1.0], lh: [-0.3, 1.0], heldL: "sack", squash: pop(f, F("moved")), tilt: bob(f) }, f, 1, 1.66),
    ...(sign ? [fx("q", TEX.q(), [SIGNPOST[0] + 1.15, 2.25, SIGNPOST[2] - 0.1], 0.34 * overshoot(prog(f, F("never"), 6)), 0.42 * overshoot(prog(f, F("never"), 6)), f >= F("never") ? 1 : 0)] : []),
  ];
};
const s34cam = (f: number): Cam => track(f, [
  { f: T.but, cam: { pos: [NOTE[0] + 0.1, 1.15, NOTE[2] + 3.3], look: [NOTE[0] - 0.05, 0.85, NOTE[2]], fov: 38, roll: 0.07 }, rate: 0.003 },
  { f: F("a", 1, -3), cam: { pos: [SIGNPOST[0], 1.3, -SHORE + 4.6], look: [SIGNPOST[0] + 0.45, 1.5, SIGNPOST[2]], fov: 44, roll: -0.08 }, dur: 12 },
  { f: T.noMap, cam: { pos: [3.6, 1.4, 4.6], look: [1.3, 2.25, 0], fov: 46, roll: -0.09 }, dur: 12 },
  { f: F("how", 0, -2), cam: { pos: [3.9, 1.3, 3.0], look: [2.0, 2.0, 0], fov: 40, roll: -0.06 }, dur: 9 },
]);
const s34 = (f: number): CastItem[] => (f < T.noMap ? s3(f) : s4(f));
const s4 = (f: number): CastItem[] => {
  const a = F("map", 0, -2), b = F("compass", 0, -2), h = F("how", 0, -2), c0 = onDeck("harbour", f, 0.7);
  return [
    person("bjarni", BJARNI, onDeck("harbour", f, 2.0), f >= h ? { eyes: "happy", mouth: say("howHard") ?? "grin", face: -0.4, rh: [1.0, -0.7], lh: [-0.8, -0.2], squash: pop(f, h), tilt: bob(f) } : { eyes: "lid", mouth: "smile", face: -0.5, rh: [0.3, 1.0], lh: [-0.3, 1.0], tilt: bob(f) }, f, 1, 1.66),
    ...crew("harbour", f, (i) => (i === 0 ? { eyes: "wide", mouth: f >= h ? "dash" : "wave", brow: -1, face: 0.5, rh: [0.9, f >= a ? -0.6 : 0.9], lh: [-0.9, f >= b ? -0.6 : 0.9], squash: pop(f, a) * pop(f, b), sweat: f >= b } : { eyes: "lid", mouth: "dash", brow: -0.4, face: 0.5, rh: [0.3, 1.1], lh: [-0.3, 1.1] })),
    ...(f >= a ? [fx("nomap", TEX.noMap(), [c0[0] + 0.3, c0[1] + 2.2, 0.6], 0.7 * overshoot(prog(f, a, 6)), 0.7 * overshoot(prog(f, a, 6)), f < h + 6 ? 1 : 0)] : []),
    ...(f >= b ? [fx("nocomp", TEX.noCompass(), [c0[0] + 1.1, c0[1] + 2.2, 0.6], 0.7 * overshoot(prog(f, b, 6)), 0.7 * overshoot(prog(f, b, 6)), f < h + 6 ? 1 : 0)] : []),
  ];
};

// 4. FOG: the ship pitching in grey nothing, from above. Then far, far back: a speck, and the wind taking it.
const s5cam = (f: number): Cam => track(f, [{ f: T.fog, cam: { pos: [2.6, 3.2, 4.3], look: [0.3, 1.5, 0], fov: 46, roll: 0.11 }, rate: 0.002 }]);
const lost = (f: number): CastItem[] => [
  person("bjarni", BJARNI, onDeck("fog", f, 2.0), { eyes: "side", mouth: "wave", brow: -0.5, face: 0.6, look: [0.9, -0.2], rh: [0.35, -1.05], lh: [-0.4, 1.0], sweat: true, tilt: 0.06 * wave(f, 0.3) }, f, 1, 1.66),
  ...crew("fog", f, (i) => ({ eyes: i === 2 ? "spiral" : "wide", mouth: i === 0 ? "o" : "wave", brow: -1, face: i % 2 ? 0.6 : -0.6, rh: [0.9, -0.2 + 0.2 * wave(f + i * 3, 0.4)], lh: [-0.9, -0.2 - 0.2 * wave(f + i * 3, 0.4)], lean: 0.08 * wave(f + i * 5, 0.25) })),
];
const s5 = (f: number): CastItem[] => [...lost(f), fx("q1", TEX.q(), up(onDeck("fog", f, -1.1), 2.3), 0.3 * overshoot(prog(f, F("fog", 0, 2), 6)), 0.38 * overshoot(prog(f, F("fog", 0, 2), 6)), f >= F("fog", 0, 2) ? 1 : 0)];
const s5bcam = (f: number): Cam => track(f, [{ f: T.wind, cam: { pos: [5, 7, 17], look: [-1, 0.8, 0], fov: 38, roll: -0.06 }, rate: 0.0016 }]);
const s5b = (f: number): CastItem[] => [
  ...lost(f),
  ...[0, 1, 2, 3, 4].map((i) => { const u = (((f - T.wind) * 0.035 + i * 0.37) % 1 + 1) % 1; return fx(`wind${i}`, TEX.wind(), [9 - u * 22, 1.2 + i * 1.5, -3 + i * 2.2], 6, 1.1, Math.sin(u * Math.PI) * 0.85); }),
];

// 5. LAND: the fog is gone and there is a coast nobody has drawn. Up and over the heads to the forest. The crew
//    begs. Bjarni takes one look: "No glaciers. Not Greenland. Keep sailing!" (his line, from a low angle).
const s6cam = (f: number): Cam => track(f, [
  { f: T.clears, cam: { pos: [-2.4, 1.8, 4.2], look: [-0.9, 1.8, 0], fov: 44, roll: 0.05 } },
  { f: F("there's", 0, -2), cam: { pos: [-1.6, 2.2, 4.8], look: [-0.5, 2.75, -14], fov: 50, roll: -0.05 }, dur: 12 },
]);
const s6 = (f: number): CastItem[] => {
  const land = f >= F("there's", 0, -2);
  return [
    person("bjarni", BJARNI, onDeck("coast1", f, 2.0), { eyes: "lid", mouth: "dash", face: -0.6, brow: 0.4, rh: [0.35, land ? -1.05 : 1.0], lh: [-0.4, 1.0], squash: pop(f, F("land")) }, f, 1, 1.66),
    ...crew("coast1", f, (i) => (land ? { eyes: "happy", mouth: "open", brow: -1, face: -0.6, rh: [0.7, -1.1], lh: [-0.9, -1.0 + 0.15 * wave(f + i * 2)], squash: pop(f, F("land", 0, i * 3)) } : { eyes: "squeeze", mouth: "wave", face: -0.3, rh: [0.3, -0.9], lh: [-0.3, -0.9], blink: false })),
  ];
};
const s7cam = (f: number): Cam => shake(track(f, [
  { f: T.crew, cam: { pos: [-2.8, 2.5, 4.4], look: [-0.9, 1.75, 0], fov: 44, roll: 0.07 } },
  { f: F("bjarni", 2, -3), cam: { pos: [3.9, 1.3, 2.6], look: [2.0, 2.05, 0], fov: 38, roll: -0.1 }, dur: 10 },
]), f, F("keep"), 0.06);
const s7 = (f: number): CastItem[] => {
  const look = F("bjarni", 2, -3), no = F("no", 2), not = F("not"), keep = F("keep");
  const b: Pose = f >= keep ? { eyes: "angry", mouth: say("keep") ?? "frown", brow: 1, face: 0.6, rh: [1.1, -0.5], lh: [-0.4, 1.0], squash: pop(f, keep), lean: 0.06 }
    : f >= not ? { eyes: "lid", mouth: say("keep") ?? "dash", brow: 0.6, face: -0.6, rh: [0.3, 1.0], lh: [-1.1, -0.3], squash: pop(f, not) }
    : f >= no ? { eyes: "lid", mouth: say("keep") ?? "dash", brow: 0.6, face: -0.5, rh: [-0.2, 0.1], lh: [0.2, 0.1], squash: pop(f, no) }
    : f >= look ? { eyes: "side", mouth: "dash", brow: 0.5, face: -0.7, look: [-0.9, 0], rh: [0.35, -1.05], lh: [-0.4, 1.0], squash: pop(f, look) * antic(f, no) }
    : { eyes: "lid", mouth: "dash", brow: 0.3, face: -0.4, rh: [0.3, 1.0], lh: [-0.3, 1.0] };
  return [
    person("bjarni", BJARNI, onDeck("coast1", f, 2.0), b, f, 1, 1.66),
    ...crew("coast1", f, (i) => (f >= keep ? { eyes: "lid", mouth: "frown", face: 0.4, rh: [0.3, 1.1], lh: [-0.3, 1.1], tilt: 0.14, squash: pop(f, keep + 3 + i * 3) } : { eyes: "wide", mouth: "open", brow: -1, face: 0.6, rh: [0.25, -0.75 + 0.12 * wave(f + i * 3, 1.1)], lh: [-0.05, -0.75 + 0.12 * wave(f + i * 3, 1.1)], squash: 1 + 0.03 * wave(f + i * 3, 1.1) })),
  ];
};

// 6. THREE TIMES, in one take: the ship holds the frame while a second coast, then a third, slide past behind it,
//    a number on each, Bjarni pointing on. Then the camera tips over the side to the beach: smooth sand, and a zero.
const s8cam = (f: number): Cam => track(f, [
  { f: T.times, cam: { pos: [2.6, 2.9, 5.6], look: [0.4, 2.0, -2], fov: 46, roll: 0.07 }, rate: 0.003 },
  { f: F("zero", 0, -6), cam: { pos: [0.9, 3.1, -SHORE + 2.2], look: [0.9, 0.2, -SHORE - 2.6], fov: 44, roll: -0.07 }, dur: 12 },
]);
const s8 = (f: number): CastItem[] => {
  const z = F("zero", 0, -6), n2 = T.times + 5, n3 = T.third + 6;
  return [
    person("bjarni", BJARNI, onDeck("run", f, 2.0), { eyes: "angry", mouth: "frown", brow: 1, face: 0.6, rh: [1.1, -0.5], lh: [-0.4, 1.0], squash: pop(f, n2) * pop(f, n3) }, f, 1, 1.66),
    ...crew("run", f, (i) => ({ eyes: "lid", mouth: "frown", face: -0.6, look: [-0.8, 0.2], rh: [0.3, 1.1], lh: [-0.9, -0.6 - 0.1 * wave(f + i * 4, 0.5)], tilt: 0.1 })),
    fx("n2", TEX.num("2"), [2.9, 3.5, 0.9], 1.2 * overshoot(prog(f, n2, 7)), 1.2 * overshoot(prog(f, n2, 7)), f >= n2 && f < T.third - 6 ? 1 : 0),
    fx("n3", TEX.num("3"), [2.9, 3.5, 0.9], 1.2 * overshoot(prog(f, n3, 7)), 1.2 * overshoot(prog(f, n3, 7)), f >= n3 && f < z ? 1 : 0),
    fx("zero", TEX.num("0"), [0.9, 0.3, -SHORE - 2.6], 1.4 * overshoot(prog(f, F("zero", 0, -2), 7)), 1.3 * overshoot(prog(f, F("zero", 0, -2), 7)), f >= F("zero", 0, -2) ? 1 : 0),
  ];
};

// 7. GREENLAND: ice, a bay, and the ship sliding in to stop exactly at Dad's door. Then dinner, and Dad's ladle.
const DAD_AT: V3 = [DAD_HOUSE[0] - 0.92, 0.06, DAD_HOUSE[2] + 2.0];
const s9cam = (f: number): Cam => shake(track(f, [
  { f: T.finds, cam: { pos: [-3.5, 2.6, 8.5], look: [-1.5, 1.6, -4], fov: 46, roll: -0.06 } },
  { f: F("parks", 0, -3), cam: { pos: [3.8, 1.6, -3.9], look: [DAD_AT[0] - 0.3, 1.25, DAD_AT[2]], fov: 40, roll: 0.08 }, dur: 12 },
]), f, TIMES.bump, 0.08);
const s9 = (f: number): CastItem[] => {
  const home = f >= F("never", 1, -2);
  return [
    person("dad", DAD, DAD_AT, home ? { eyes: "happy", mouth: "grin", face: -0.5, rh: [0.9, -0.8], held: "ladle", lh: [-0.9, -0.6], squash: pop(f, F("never", 1, -2)) } : { eyes: f >= TIMES.bump ? "wide" : "lid", mouth: f >= TIMES.bump ? "o" : "dash", brow: f >= TIMES.bump ? -1 : 0.6, face: -0.5, rh: [0.5, 0.2], held: "ladle", lh: [-0.4, 1.0], squash: pop(f, TIMES.bump), tilt: bob(f) }, f, 30, 1.6),
    home ? person("bjarni", BJARNI, [DAD_AT[0] - 1.05, 0.06, DAD_AT[2] + 0.25], { eyes: "happy", mouth: "grin", face: 0.6, rh: [0.9, -0.9], lh: [-0.9, -0.9], squash: pop(f, F("never", 1, -2)) }, f, 1, 1.66)
      : person("bjarni", BJARNI, onDeck("greenland", f, 2.0), { eyes: f >= TIMES.bump ? "happy" : "lid", mouth: f >= TIMES.bump ? "grin" : "dash", face: -0.5, rh: [0.9, f >= TIMES.bump ? -0.9 : -0.3], lh: [-0.4, 1.0], squash: pop(f, TIMES.bump) }, f, 1, 1.66),
    ...crew("greenland", f, (i) => (f >= TIMES.bump ? { eyes: "squeeze", mouth: "open", face: -0.4, rh: [0.9, -1.0], lh: [-0.9, -1.0], blink: false, squash: pop(f, TIMES.bump + 2 + i * 3) } : { eyes: "lid", mouth: "frown", face: 0.4, rh: [0.3, 1.1], lh: [-0.3, 1.1], tilt: 0.1 })),
  ];
};
const dinner = (f: number, last: boolean): CastItem[] => {
  const late = F("late", 0, -2), stop = F("refused", 0, -2), sl = wave(f, 0.5) > 0;
  return [
    person("bjarni", last ? OLD_BJARNI : BJARNI, [TABLE[0] - 0.62, 0.06, TABLE[2] - 0.1], last ? { eyes: f >= stop ? "happy" : "lid", mouth: f >= stop ? "smile" : sl ? "o" : "dash", face: 0.3, rh: [f >= stop ? 0.9 : 0.2, f >= stop ? -0.45 : 0.15], held: "bowl", lh: [-0.9, f >= stop ? -0.45 : 1.0], squash: pop(f, stop), tilt: f >= stop ? 0.1 : bob(f) } : { eyes: f >= late ? "side" : "happy", mouth: f >= late ? "wave" : sl ? "o" : "smile", face: 0.3, look: [0.9, -0.2], rh: [0.2, 0.15], held: "bowl", lh: [-0.3, 1.0], sweat: f >= late, squash: pop(f, late) }, f, 1, 1.66),
    person("dad", DAD, [TABLE[0] + 0.66, 0.06, TABLE[2] - 0.12], last ? (f >= stop + 4 ? { eyes: "squeeze", mouth: "frown", face: -0.3, rh: [-0.55, -1.15], lh: [-0.4, 1.0], heldL: "ladle", tilt: 0.1, blink: false, squash: pop(f, stop + 4) } : { eyes: "lid", mouth: "dash", brow: 0.4, face: -0.5, rh: [0.4, 0.9], held: "ladle", lh: [-0.4, 1.0], tilt: bob(f, 2) }) : { eyes: "angry", mouth: f >= late ? "open" : "frown", brow: 1, face: -0.6, rh: [f >= late ? -0.6 : 0.5, f >= late ? -0.9 : 0.2], held: "ladle", lh: [-0.6, 0.3], squash: pop(f, late) * antic(f, late), lean: f >= late ? -0.08 : 0 }, f, 30, 1.6),
    fx("steam", TEX.steam(), [TABLE[0] - 0.1, 1.05 + 0.08 * Math.sin(f * 0.2), TABLE[2]], 0.3, 0.45, 0.5 + 0.2 * Math.sin(f * 0.15)),
  ];
};
const s10cam = (f: number): Cam => track(f, [
  { f: T.see, cam: { pos: [TABLE[0] - 0.3, 1.5, TABLE[2] + 4.6], look: [TABLE[0], 1.15, TABLE[2]], fov: 42, roll: 0.06 } },
  { f: F("late", 0, -2), cam: { pos: [TABLE[0] - 0.7, 1.0, TABLE[2] + 3.3], look: [TABLE[0] + 0.05, 1.35, TABLE[2]], fov: 42, roll: -0.07 }, dur: 9 },
]);

// 8. YEARS LATER: the same ship, a sign on its side, and Leif counting out coins. The story run backwards, three,
//    two, one. And a boot on the sand: the first footprints.
const s11cam = (f: number): Cam => track(f, [
  { f: T.later, cam: { pos: [1.9, 2.7, 7.4], look: [1.65, 2.6, 0.4], fov: 44, roll: -0.05 } },
  { f: F("buys", 0, -2), cam: { pos: [1.7, 2.3, 5.6], look: [1.7, 2.55, 0], fov: 44, roll: 0.05 }, dur: 10 },
]);
const s11 = (f: number): CastItem[] => {
  const buy = F("buys", 0, -2);
  return [
    person("oldb", OLD_BJARNI, onDeck("harbour", f, 0.9), { eyes: "happy", mouth: f >= buy ? "grin" : "smile", face: 0.6, rh: [0.9, f >= buy ? -0.4 : 0.3], held: f >= buy ? "coin" : null, lh: [-0.4, 1.0], squash: pop(f, buy), tilt: bob(f) }, f, 1, 1.6),
    person("leif", LEIF, onDeck("harbour", f, 2.5), { eyes: "happy", mouth: "smile", face: -0.6, lh: [-0.9, f >= buy ? 0.6 : -0.2], heldL: f >= buy ? null : "coin", rh: [0.5, f >= buy ? -1.0 : 1.0], squash: pop(f, F("leif")) * pop(f, buy), tilt: bob(f, 2) }, f, 40, 1.7),
  ];
};
const s12cam = (f: number): Cam => track(f, [{ f: T.follows, cam: { pos: [5.6, 1.5, 3.6], look: [2.4, 2.3, -0.3], fov: 46, roll: -0.11 }, rate: 0.003 }]);
const s12 = (f: number): CastItem[] => [
  person("leif", LEIF, onDeck("coast3", f, 2.6), { eyes: "happy", mouth: "grin", face: 0.6, rh: [1.1, -0.6], lh: [-0.4, 1.0], lean: 0.06, tilt: bob(f) }, f, 40, 1.7),
  ...["3", "2", "1"].map((n, i) => fx(`back${n}`, TEX.num(n), [1.5, 3.3, 0.8], 1.3 * overshoot(prog(f, T.follows + 5 + i * 11, 6)), 1.3 * overshoot(prog(f, T.follows + 5 + i * 11, 6)), f >= T.follows + 5 + i * 11 && f < T.follows + 16 + i * 11 ? 1 : 0)),
];
const stepX = (f: number) => 2.2 - 2.6 * prog(f, T.walks, F("500") - 6 - T.walks);
const s13cam = (f: number): Cam => track(f, [
  { f: T.walks, cam: { pos: [stepX(f) + 0.4, 0.35, -SHORE + 1.2], look: [stepX(f) - 0.3, 0.95, -SHORE - 2.0], fov: 46, roll: 0.09 } },
  { f: F("500", 0, -3), cam: { pos: [0.8, 4.0, -SHORE + 2.6], look: [0.6, 0.8, -SHORE - 3.4], fov: 46, roll: -0.06 }, dur: 12 },
]);
const s13 = (f: number): CastItem[] => {
  const camp = f >= F("500", 0, -3), x = stepX(f);
  const c: CastItem[] = [person("leif", LEIF, [x, 0.06, -SHORE - 2.0], camp ? { eyes: "happy", mouth: "grin", rh: [0.9, -1.0], lh: [-0.9, -1.0], squash: pop(f, F("500", 0, -3)) } : { view: "side", face: -1, eyes: "happy", mouth: "smile", walk: f * 0.5, rh: [0.3 + 0.25 * Math.sin(f * 0.5), 1.0], lh: [-0.3 - 0.25 * Math.sin(f * 0.5), 1.0] }, f, 40, 1.7)];
  for (let i = 0; i < 6; i++) { const born = T.walks + 4 + i * 6; if (f >= born) c.push(fx(`foot${i}`, TEX.foot(), [2.2 - i * 0.42, 0.075, -SHORE - 1.75 + (i % 2) * 0.22], 0.2, 0.28, Math.min(1, (f - born) / 3) * 0.75, -Math.PI / 2, true)); }
  if (camp) c.push(...CREW.map((l, i) => person(`camp${i}`, l, [0.5 + i * 0.72, 0.06, -SHORE - 2.6 - (i % 2) * 0.5], { eyes: "happy", mouth: "open", rh: [0.9, -1.0 + 0.15 * wave(f + i * 3)], lh: [-0.9, -1.0 - 0.15 * wave(f + i * 3)], squash: pop(f, F("500", 0, i * 3)) }, f, 20 + i, 1.5)));
  return c;
};
// 9. THE LAST WORD goes to Bjarni: grey now, by the fire in Greenland, with his soup. He regrets nothing.
const s14cam = (f: number): Cam => track(f, [{ f: T.all, cam: { pos: [TABLE[0] + 0.6, 1.5, TABLE[2] + 4.5], look: [TABLE[0], 1.2, TABLE[2]], fov: 42, roll: 0.05 }, rate: 0.0035 }]);

const shots: Shot[] = [
  { a: 0, b: T.year, set: "hook", mood: "day", cam: s1cam, cast: s1 },
  { a: T.year, b: T.but, set: "harbour", mood: "day", cam: s2cam, cast: s2, into: "dissolve" },
  { a: T.but, b: T.fog, set: "harbour", mood: "day", cam: s34cam, cast: s34, into: "move", tag: "insert" },
  { a: T.fog, b: T.wind, set: "fog", mood: "fog", cam: s5cam, cast: s5, into: "dissolve" },
  { a: T.wind, b: T.clears, set: "fog", mood: "fog", cam: s5bcam, cast: s5b, into: "move", tag: "wide" },
  { a: T.clears, b: T.crew, set: "coast1", mood: "day", cam: s6cam, cast: s6, into: "dissolve" },
  { a: T.crew, b: T.times, set: "coast1", mood: "day", cam: s7cam, cast: s7, into: "move" },
  { a: T.times, b: T.finds, set: "run", mood: "golden", cam: s8cam, cast: s8, into: "dissolve" },
  { a: T.finds, b: T.see, set: "greenland", mood: "arctic", cam: s9cam, cast: s9, into: "dissolve" },
  { a: T.see, b: T.later, set: "greenland", mood: "dusk", cam: s10cam, cast: (f) => dinner(f, false), into: "dissolve" },
  { a: T.later, b: T.follows, set: "harbour", mood: "golden", cam: s11cam, cast: s11, into: "dissolve" },
  { a: T.follows, b: T.walks, set: "coast3", mood: "day", cam: s12cam, cast: s12, into: "dissolve" },
  { a: T.walks, b: T.all, set: "vinland", mood: "golden", cam: s13cam, cast: s13, into: "dissolve" },
  { a: T.all, b: TOTAL, set: "greenland", mood: "explain", cam: s14cam, cast: (f) => dinner(f, true), into: "dissolve" },
];

export const film: Film = { total: TOTAL, sets: { hook, harbour, fog, coast1, coast3, run, greenland, vinland }, shots, words };
void shipPose; void burst;
