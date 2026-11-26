// "Carrots" — 10 seconds on why your mum says carrots help you see in the dark (RAF night fighters, radar, 1940).
// Every beat is pinned to a spoken word with F(); nothing is a bare frame number. One continuous take: four
// dissolves (each a new place), camera bursts inside the shots, no cuts.
//   1. sky / night      the hook: frame 0 is a night fighter already firing; "down" = the hit; then the grin
//   2. radar / explain  "The secret is radar": shh, then the blip
//   3. ministry / interior  "tells everyone": the proclamation; "carrots": the cloth comes off the easel
//   4. spy / night      "Nobody knows if Germany bought it": one carrot under a lamp, a question mark, a shrug
//   5. kitchen / golden "But your mum did": the bowl arrives on "mum"
import { CastItem, Film, Shot } from "../../stage/Stage";
import { Cam, shake, track } from "../../stage/camera";
import { Look, Pose, blinkAt } from "../../stage/chars";
import { fit } from "../../stage/frame";
import { V3, overshoot, prog } from "../../stage/util";
import { BOFFIN_AT, CAM_A, CAM_A0, CAM_B, EASEL, KID_AT, KITCHEN_POSTER, MIN_SIGN, MUM_AT, OFFICIAL_AT, SCOPE, SPY_AT, SPY_SIGN, TEX, TIMES, TURN as TURN_AT, bomberAt, kitchen, ministry, radar, seat, sky, spy } from "./sets";
import words from "./words.json";

const F = (w: string, n = 0, d = 0) => { const m = words.filter((x) => x.w.toLowerCase().replace(/[^a-z0-9']/g, "") === w); if (!m[n]) throw new Error(`word not found: ${w} #${n}`); return Math.round(m[n].s * 30) + d; };
export const TOTAL = Math.round(words[words.length - 1].e * 30) + 12;
// shot boundaries, each on the first word of its sentence
const T = { secret: F("the", 1, -2), gov: F("so", 0, -2), nobody: F("nobody", 0, -2), mum: F("but", 0, -2) };
TIMES.hit = F("down"); TIMES.ping = F("radar", 0, -2); TIMES.reveal = F("carrots", 0, -2); // the sets animate on these

// ---------------------------------------------------------------- cast
const PILOT: Look = { coat: "#6b4a2d", collar: "#e8dcc0", hat: "hood", hatCol: "#5a3d24", moustache: "#c9762e" };
const BOFFIN: Look = { coat: "#e8e2d2", buttons: "#3a3540", collar: "#3d6a8a", hat: "hair", hatCol: "#a8a8a8", glasses: true };
const OFFICIAL: Look = { coat: "#27304a", collar: "#f3ead2", buttons: "#f2c230", hat: "topper", hatCol: "#2a2433", band: "#b9483c", moustache: "#5a3a24", stout: true };
const SPY: Look = { coat: "#5d6a62", collar: "#2f3a36", buttons: "#c8ccd0", hat: "kepi", hatCol: "#5d6a62", band: "#2f3a36", monocle: true };
const MUM: Look = { coat: "#c8566a", apron: "#f3ead2", hat: "hair", hatCol: "#7a4a28" };
const KID: Look = { coat: "#3d6a8a", hat: "hair", hatCol: "#c9762e" };

const person = (id: string, look: Look, at: V3, pose: Pose, f: number, seed = 1, h = 1.6, shadow = true): CastItem =>
  ({ kind: "person", id, look, at, h, shadow, pose: { ...pose, blink: pose.blink ?? blinkAt(Math.floor(f), seed) } });
const pop = (f: number, a: number) => (f < a ? 1 : 0.86 + 0.14 * overshoot(prog(f, a, 7), 2.6));
const antic = (f: number, a: number, n = 4) => (f >= a - n && f < a ? 0.93 : 1);
const bob = (f: number, seed = 0) => Math.round(Math.sin(f * 0.19 + seed) * 3) * 0.006;
const wave = (f: number, k = 0.9) => Math.round(Math.sin(f * k)); // -1, 0, 1: arms that pump on the beat
const fx = (id: string, tex: ReturnType<typeof TEX.q>, at: V3, w: number, h = w, opacity = 1, roll = 0): CastItem => ({ kind: "card", id, tex, at, w, h, opacity, roll });
const up = (p: V3, dy: number): V3 => [p[0], p[1] + dy, p[2]];
const grow = (f: number, a: number, n = 6) => overshoot(prog(f, a, n));

// ---------------------------------------------------------------- 1. HOOK: already firing
const SPOT = F("suddenly", 0, -2), FIRE = F("shooting", 0, -2), WON = F("bombers", 0, -2), TURN = F("in", 1, -2);
TURN_AT.f = TURN + 3;
const s1cam = (f: number): Cam => shake(track(f, [
  { f: 0, cam: CAM_A0 },
  { f: 1, cam: CAM_A, dur: 30, rate: 0.0012 },
  { f: TURN, cam: CAM_B, dur: 11, rate: 0.002 },
]), f, TIMES.hit, 0.1);
const s1 = (f: number): CastItem[] => {
  const p: Pose = f >= WON ? { eyes: "happy", mouth: "grin", face: 0.4, rh: [0.95, -1.0], lh: [-0.6, 0.1], squash: pop(f, WON), tilt: bob(f) }
    : f >= FIRE ? { view: "side", face: 1, eyes: "angry", brow: 1, mouth: "teeth", rh: [0.75, 0.05 + 0.1 * wave(f + 1)], lh: [0.35, 0.3], lean: 0.08, squash: pop(f, FIRE) }
    : f >= SPOT ? { view: "side", face: 1, eyes: "wide", brow: -1, mouth: "o", rh: [0.8, -0.5], lh: [0.3, 0.4], squash: pop(f, SPOT) }
    : { view: "side", face: 1, eyes: "angry", brow: 1, mouth: "dash", rh: [0.6, 0.25 + 0.14 * wave(f + 1)], lh: [0.3, 0.4], lean: 0.05, squash: antic(f, SPOT) };
  const b = bomberAt(TIMES.hit - 1), k = grow(f, TIMES.hit, 5);
  return [
    person("pilot", PILOT, seat(f), p, f, 3, 1.6, false),
    fx("bang", TEX.bang(), [seat(f)[0] - 0.36, seat(f)[1] + 1.5, seat(f)[2] - 0.68], 0.32 * grow(f, SPOT), 0.4 * grow(f, SPOT), f >= SPOT && f < FIRE ? 1 : 0),
    fx("boom", TEX.boom(), b, 6.5 * k, 6.5 * k, f >= TIMES.hit && f < TIMES.hit + 12 ? 1 : 0, (f - TIMES.hit) * 0.03),
  ];
};

// ---------------------------------------------------------------- 2. THE SECRET
const scopeSubj = { at: SCOPE, w: 1.1, h: 1.1 };
const s2cam = (f: number): Cam => track(f, [
  { f: T.secret, cam: fit([{ at: BOFFIN_AT, h: 1.5 }, scopeSubj], { yaw: 9, pitch: -6, fill: 0.84, cy: 0.42, roll: 0.07 }), rate: 0.002 },
  { f: TIMES.ping, cam: fit([{ at: BOFFIN_AT, h: 1.5 }, scopeSubj], { yaw: -5, pitch: -9, fill: 0.9, cy: 0.42, roll: -0.05 }), dur: 9 },
]);
const s2 = (f: number): CastItem[] => {
  const on = f >= TIMES.ping;
  return [
    person("boffin", BOFFIN, BOFFIN_AT, on ? { eyes: "happy", mouth: "grin", face: -0.5, lh: [-0.85, -1.25], rh: [0.4, 0.9], held: "paper", squash: pop(f, TIMES.ping) }
      : { eyes: "side", look: [-0.8, 0], mouth: "o", brow: -0.6, face: -0.3, rh: [0.7, -0.95], lh: [-0.35, 0.9], heldL: "paper", squash: antic(f, TIMES.ping), tilt: bob(f) }, f, 8, 1.5),
    fx("ping", TEX.ping(), [SCOPE[0], SCOPE[1], SCOPE[2] + 0.12], 1.0 * grow(f, TIMES.ping), 1.0 * grow(f, TIMES.ping), on ? 1 : 0, (f - TIMES.ping) * 0.05),
  ];
};

// ---------------------------------------------------------------- 3. THE MINISTRY
const TELLS = F("tells", 0, -2), ALL = F("everyone", 0, -2);
const official = { at: OFFICIAL_AT, h: 1.5 };
const s3cam = (f: number): Cam => track(f, [
  { f: T.gov, cam: fit([official, EASEL, MIN_SIGN], { yaw: 6, pitch: -5, fill: 0.9, cy: 0.44, roll: -0.06 }), rate: 0.0012 },
  { f: TIMES.reveal, cam: fit([official, EASEL], { yaw: -9, pitch: -10, fill: 0.88, cy: 0.44, roll: 0.07 }), dur: 9 },
]);
const s3 = (f: number): CastItem[] => {
  const p: Pose = f >= TIMES.reveal ? { eyes: "happy", mouth: "grin", face: -0.5, lh: [-1.1, -0.75], rh: [0.5, 0.7], held: "paper", squash: pop(f, TIMES.reveal) }
    : f >= ALL ? { eyes: "wide", mouth: "open", brow: -0.5, face: 0.2, lh: [-1.0, -0.5], rh: [1.0, -0.5], held: "paper", squash: pop(f, ALL) * antic(f, TIMES.reveal) }
    : f >= TELLS ? { eyes: "lid", mouth: "open", brow: 0.4, face: 0.3, lh: [-0.35, 1.0], rh: [0.9, -1.0], held: "paper", squash: pop(f, TELLS) }
    : { eyes: "lid", look: [0.5, 0.6], mouth: "smirk", face: 0.4, lh: [-0.35, 1.0], rh: [0.45, 0.2], held: "paper", tilt: bob(f) };
  return [person("official", OFFICIAL, OFFICIAL_AT, p, f, 12, 1.5)];
};

// ---------------------------------------------------------------- 4. GERMANY
const ASK = F("if", 0, -2), SHRUG = F("bought", 0, -2);
const s4cam = (f: number): Cam => track(f, [
  { f: T.nobody, cam: fit([{ at: SPY_AT, h: 1.6 }, SPY_SIGN], { yaw: -8, pitch: -4, fill: 0.9, cy: 0.44, roll: 0.07 }), rate: 0.0025 },
  { f: SHRUG, cam: fit([{ at: SPY_AT, h: 1.6 }, SPY_SIGN], { yaw: -16, pitch: -9, fill: 0.9, cy: 0.44, roll: -0.05 }), dur: 9 },
]);
const s4 = (f: number): CastItem[] => {
  const p: Pose = f >= SHRUG ? { eyes: "wide", mouth: "wave", brow: -1, face: -0.2, rh: [1.0, -0.35], lh: [-1.0, -0.35], heldL: "magnifier", squash: pop(f, SHRUG), sweat: true }
    : f >= ASK ? { eyes: "side", look: [-0.9, 0.3], mouth: "dash", brow: 0.6, face: -0.6, lh: [-0.95, -0.1], heldL: "magnifier", rh: [-0.3, -0.75], squash: pop(f, ASK) }
    : { eyes: "lid", look: [-0.8, 0.7], mouth: "frown", brow: 0.8, face: -0.7, lh: [-0.95, 0.1], heldL: "magnifier", rh: [0.35, 1.0], lean: -0.07, tilt: bob(f) };
  return [
    person("spy", SPY, SPY_AT, p, f, 21, 1.6),
    fx("q", TEX.q(), [SPY_AT[0] + 0.5, 1.82, SPY_AT[2]], 0.32 * grow(f, ASK), 0.4 * grow(f, ASK), f >= ASK ? 1 : 0, 0.15),
  ];
};

// ---------------------------------------------------------------- 5. YOUR MUM
const SERVE = F("mum", 0, -2), DID = F("did");
const mum = { at: MUM_AT, h: 1.6 }, kid = { at: KID_AT, h: 1.15 };
const s5cam = (f: number): Cam => track(f, [
  { f: T.mum, cam: fit([mum, kid, KITCHEN_POSTER], { yaw: -7, pitch: 4, fill: 0.9, cy: 0.44, roll: -0.06 }), rate: 0.0012 },
  { f: SERVE, cam: fit([mum, kid, KITCHEN_POSTER], { yaw: 5, pitch: 2, fill: 0.9, cy: 0.44, roll: 0.05 }), dur: 8 },
]);
const s5 = (f: number): CastItem[] => {
  const serve = f >= SERVE, did = f >= DID;
  return [
    person("mum", MUM, MUM_AT, serve ? { eyes: "happy", mouth: "grin", face: -0.6, lh: [-1.15, -0.15], heldL: "bowl", rh: [0.75, -0.9 - (did ? 0.2 : 0)], lean: -0.07, squash: pop(f, SERVE) * pop(f, DID) }
      : { eyes: "lid", mouth: "smile", face: -0.5, lh: [-0.5, 0.5], heldL: "bowl", rh: [0.35, 1.0], squash: antic(f, SERVE), tilt: bob(f) }, f, 31, 1.6),
    person("kid", KID, KID_AT, did ? { eyes: "squeeze", mouth: "wave", face: 0.4, rh: [0.3, 1.0], lh: [-0.3, 1.0], tilt: -0.1, blink: false, squash: pop(f, DID), sweat: true }
      : serve ? { eyes: "wide", mouth: "frown", brow: -1, face: 0.5, look: [0.8, -0.4], rh: [0.3, 1.0], lh: [-0.3, 1.0], squash: pop(f, SERVE + 2), sweat: true }
      : { eyes: "lid", mouth: "dash", brow: 0.5, face: 0.4, look: [0.6, -0.3], rh: [0.3, 1.0], lh: [-0.3, 1.0] }, f, 44, 1.15),
  ];
};

const shots: Shot[] = [
  { a: 0, b: T.secret, set: "sky", mood: "night", cam: s1cam, cast: s1 },
  { a: T.secret, b: T.gov, set: "radar", mood: "explain", cam: s2cam, cast: s2, into: "dissolve" },
  { a: T.gov, b: T.nobody, set: "ministry", mood: "interior", cam: s3cam, cast: s3, into: "dissolve" },
  { a: T.nobody, b: T.mum, set: "spy", mood: "night", cam: s4cam, cast: s4, into: "dissolve" },
  { a: T.mum, b: TOTAL, set: "kitchen", mood: "golden", cam: s5cam, cast: s5, into: "dissolve" },
];

export const film: Film = { total: TOTAL, sets: { sky, radar, ministry, spy, kitchen }, shots, words };
