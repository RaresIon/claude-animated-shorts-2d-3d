// Our emu cast, drawn in the same flat-cartoon language as the people (toon.ts): plum thick-thin ink, soft painted
// crescents, deadpan lidded eyes from the shared face library. Design space 600 x 1000 units, soles at y = 975
// (1000 units = 2.16 m: an emu stands ~1.75 m). Side views face screen-right; the card mirrors for the other way.
// Body: a shaggy brown feather mound with a ragged hem; neck: feathered below, blue-grey skin above; small bean head,
// short flat beak; long grey legs that bend BACKWARD at the ankle, three forward toes.
import {
  Pen, P2, INK, mul, mix, shade, blobPts, Blob, thickAngle, eye, eyeKind, lidOf, taper, FACE, Expr, curve, rad, DEF_LIGHT, SH_CLOTH,
} from "./toon";

export type EmuMode = "stand" | "walk" | "run" | "peck" | "kick" | "tall" | "chew" | "puff";
export type EmuOpts = {
  mode?: EmuMode; phase?: number; expr?: Expr; blink?: boolean | number; light?: number; seed?: number;
  /** peck / kick progress 0..1 */
  pose?: number; hero?: boolean; hat?: boolean; look?: number; wheat?: boolean;
};

const FEATH = "#7a5a3e", FEATH_D = "#4f3826", FEATH_L = "#9a7653", SKIN_N = "#93a7bf", LEG = "#8c8a86", BEAK = "#4a4650";
const r01 = (s: number, k: number) => { const x = Math.sin(s * 91.7 + k * 47.3) * 15731.77; return x - Math.floor(x); };

/** ragged feather mound: an egg blob whose lower half is cut into hanging tufts */
const moundPts = (cx: number, cy: number, a: number, b: number, tilt: number, seed: number, tufts = 13): P2[] => {
  const pts: P2[] = [], n = 96;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    let x = a * Math.sign(c) * Math.abs(c) ** 0.85 * (1 + 0.14 * s), y = b * Math.sign(s) * Math.abs(s) ** 0.9;
    if (s > 0.1) { // hem: hanging feather points
      const k = (t / (Math.PI)) * tufts, f = k - Math.floor(k);
      y += b * 0.16 * s * (1 - Math.abs(2 * f - 1)) ** 1.5 * (0.7 + 0.6 * r01(seed, Math.floor(k)));
    }
    if (c < -0.6 && s < 0.4) { x -= a * 0.1 * (-c - 0.6) * 2.5; y -= b * 0.25 * (-c - 0.6) * 2.5; } // tail flips up at the back
    pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }
  return pts;
};

/** feather strokes inside the mound (dark ticks, a few light ones), clipped by the caller */
const featherTicks = (p: Pen, cx: number, cy: number, a: number, b: number, seed: number, u: number) => {
  for (let k = 0; k < 34; k++) {
    const x = cx + (r01(seed, k) * 2 - 1) * a * 0.9, y = cy + (r01(seed, k + 50) * 2 - 1) * b * 0.8;
    const L = (14 + 16 * r01(seed, k + 90)) * u, dark = k % 4 !== 0;
    p.stroke([[x, y], [x - 0.35 * L, y + L]], (dark ? 2.6 : 2.2) * u, dark ? FEATH_D : FEATH_L);
  }
};

const wheatEar = (p: Pen, x0: number, y0: number, x1: number, y1: number, s: number) => {
  p.stroke([[x0, y0], [x1, y1]], 5 * s, "#c9a23f");
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  for (let k = 0; k < 5; k++) for (const sd of [-1, 1]) {
    const t = L + 6 * s + k * 10 * s, cx = x0 + ux * t - uy * sd * 6 * s, cy = y0 + uy * t + ux * sd * 6 * s;
    p.ell(cx, cy, 8 * s, 4.5 * s, "#e8c45a", 2.2 * s, 0, 360, ang + sd * 25);
  }
  p.stroke([[x0 + ux * (L + 50 * s), y0 + uy * (L + 50 * s)], [x0 + ux * (L + 80 * s), y0 + uy * (L + 80 * s)]], 2 * s, "#c9a23f");
};
/** emu beak (pointing toward +x from (bx, by)), closed or open; s = scale */
const beak = (p: Pen, bx: number, by: number, s: number, open: number, dir = 1) => {
  const L = 46 * s, Hh = 13 * s, op = open * 16 * s;
  p.poly([[bx, by - Hh], [bx + dir * L * 0.85, by - Hh * 0.55 - op * 0.3], [bx + dir * L, by - op * 0.25], [bx + dir * L * 0.7, by + 1 - op * 0.1], [bx, by + 2]], BEAK, 4.5 * s);
  if (open > 0.05) p.poly([[bx, by + 2], [bx + dir * L * 0.8, by + op * 0.6], [bx + dir * L * 0.5, by + Hh * 0.6 + op * 0.8], [bx, by + Hh * 0.8]], shade(BEAK, 1.15), 4.5 * s);
  else p.stroke([[bx + dir * 6 * s, by + 1], [bx + dir * L * 0.7, by]], 3 * s, INK);
  p.dot(bx + dir * L * 0.22, by - Hh * 0.55, 2.6 * s, INK); // nostril
};

/** emu head (profile, facing +x): small bean, dark crown feathers, beak, one eye from the shared face library */
const headSide = (p: Pen, hx: number, hy: number, o: EmuOpts, light: number, thick: number, s = 1) => {
  const a = 54 * s, H: Blob = { a, b: a * 0.84, nTop: 1.9, nBot: 2.3, egg: -0.08, asym: 0.14, rot: rad(-6), noise: 0.006, seed: (o.seed ?? 1) + 31 };
  const hp = blobPts(hx, hy, H), u = (2 * a) / 100, expr = o.expr ?? "neutral", F = FACE[expr];
  const open = F.mouth === "grin" || F.mouth === "laugh" ? 1 : F.mouth === "O" ? 1.2 : F.mouth === "o" || o.mode === "chew" ? 0.35 : 0;
  if (o.wheat) wheatEar(p, hx + 1.2 * a, hy + 0.25 * a, hx + 1.9 * a, hy - 0.05 * a, s);
  p.shadedFill(hp, SKIN_N, mul(SKIN_N, [0.82, 0.84, 0.9]), light, a);
  p.clip(hp, () => { // dark shaggy crown + nape
    const cr = blobPts(hx - 0.25 * a, hy - 0.55 * a, { ...H, a: a * 0.85, b: a * 0.55, asym: 0, seed: H.seed + 2 });
    p.poly(cr, FEATH_D, 0);
    for (let k = 0; k < 6; k++) p.stroke([[hx - 0.8 * a + k * 0.22 * a, hy - 0.2 * a], [hx - 0.9 * a + k * 0.22 * a, hy + 0.05 * a]], 3 * s, FEATH_D);
  });
  p.inkRing(hp, 5 * u, thick);
  beak(p, hx + 0.72 * a, hy + 0.2 * a, 1.1 * s, open);
  if (o.hero) for (let k = -1; k <= 1; k++) p.line([[hx - 0.1 * a + k * 9 * s, hy - 0.8 * a], [hx - 0.2 * a + k * 22 * s, hy - 1.35 * a - (k ? 0 : 10 * s)]], FEATH_D, 7 * s);
  if (o.hat) hatSide(p, hx, hy - 0.72 * a, a, s);
  const lid = lidOf(o.blink), kind = eyeKind(F.eye[1], lid), ex = hx + 0.3 * a, ey = hy - 0.12 * a;
  const big = kind === "shock" || kind === "shockHalf";
  p.ell(ex, ey, 16 * s, 16 * s, "#f4f1e8", 3.5 * s); // emus have big round eyes: a pale eye ring under every expression
  eye(p, big ? kind : kind === "lid" || kind === "slit" ? kind : kind === "dot" || kind === "small" ? "dot" : kind, ex, ey, u * 1.5, 1, o.look ?? 0, "#f4f1e8");
  const [dI, dO] = F.brow;
  if (!big) taper(p, [ex - 13 * s, ey - 20 * s + dI * u], [ex + 13 * s, ey - 20 * s + dO * u], 6 * s, 3 * s);
  else p.arc(ex, ey - 26 * s, 13 * s, 5 * s, 200, 340, 5 * s);
};

/** emu head seen from the front: bean head, two big ringed eyes, beak pointing at the lens (a short oval with a mouth line) */
const headFront = (p: Pen, hx: number, hy: number, o: EmuOpts, light: number, thick: number, s = 1) => {
  const a = 62 * s, H: Blob = { a, b: a * 0.9, nTop: 1.8, nBot: 2.3, egg: -0.1, asym: 0, rot: 0, noise: 0.006, seed: (o.seed ?? 1) + 31 };
  const hp = blobPts(hx, hy, H), u = (2 * a) / 100, expr = o.expr ?? "neutral", F = FACE[expr];
  p.shadedFill(hp, SKIN_N, mul(SKIN_N, [0.82, 0.84, 0.9]), light, a);
  p.clip(hp, () => p.poly(blobPts(hx, hy - 0.62 * a, { ...H, a: a * 1.1, b: a * 0.5, seed: H.seed + 2 }), FEATH_D, 0));
  p.inkRing(hp, 5 * u, thick);
  if (o.hero) for (let k = -1; k <= 1; k++) p.line([[hx + k * 8 * s, hy - 0.85 * a], [hx + k * 20 * s, hy - 1.4 * a - (k ? 0 : 10 * s)]], FEATH_D, 7 * s);
  if (o.hat) hatFront(p, hx, hy - 0.78 * a, a, s);
  const lid = lidOf(o.blink);
  for (const side of [-1, 1]) {
    const kind = eyeKind(F.eye[side > 0 ? 1 : 0], lid), ex = hx + side * 0.42 * a, ey = hy - 0.1 * a, big = kind === "shock" || kind === "shockHalf";
    p.ell(ex, ey, 17 * s, 17 * s, "#f4f1e8", 3.5 * s);
    eye(p, kind, ex, ey, u * 1.45, side, o.look ?? 0, "#f4f1e8");
    const [dI, dO] = F.brow;
    if (!big) taper(p, [ex - side * 12 * s, ey - 24 * s + dI * u], [ex + side * 14 * s, ey - 24 * s + dO * u], 6 * s, 3 * s);
    else p.arc(ex, ey - 28 * s, 13 * s, 5 * s, 200, 340, 5 * s);
  }
  // beak toward the lens: upper mandible oval, mouth line / open D
  const by = hy + 0.38 * a, open = F.mouth === "grin" || F.mouth === "laugh" ? 1 : F.mouth === "O" ? 1.3 : o.mode === "chew" ? 0.4 : 0;
  if (open > 0) {
    p.ell(hx, by + 6 * s, 26 * s, (8 + 18 * open) * s, "#5a1e28", 4 * s, 0, 180);
    if (F.mouth === "laugh") p.ell(hx + 3 * s, by + 14 * s * open, 10 * s, 6 * s, "#e86e78", 0);
  }
  p.ell(hx, by, 30 * s, 13 * s, BEAK, 4.5 * s);
  p.dot(hx - 9 * s, by - 3 * s, 2.6 * s); p.dot(hx + 9 * s, by - 3 * s, 2.6 * s);
  if (!open) {
    const k = F.mouth === "smile" || F.mouth === "smirk" || F.mouth === "smileWide" ? 1 : F.mouth === "frown" ? -1 : 0;
    p.stroke(curve([hx - 30 * s, by + 4 * s], [hx, by + (12 + 6 * k) * s], [hx + 30 * s, by + 4 * s - k * 6 * s]), 3.5 * s);
  }
  if (o.wheat) wheatEar(p, hx + 20 * s, by + 4 * s, hx + 60 * s, by - 26 * s, s);
};

/** tiny slouch hat on an emu ("we could face any army") */
const hatSide = (p: Pen, x: number, y: number, a: number, s: number) => {
  p.poly([[x - 0.55 * a, y], [x - 0.45 * a, y - 0.55 * a], [x + 0.4 * a, y - 0.6 * a], [x + 0.55 * a, y]], "#9a8352", 4 * s);
  p.band([[x - 0.5 * a, y - 0.14 * a], [x + 0.5 * a, y - 0.14 * a]], "#5f5134", 9 * s, 2 * s);
  p.ell(x + 0.1 * a, y + 2 * s, 1.05 * a, 9 * s, "#8a7548", 4 * s);
  p.ell(x - 0.75 * a, y - 0.3 * a, 0.14 * a, 0.38 * a, "#8a7548", 4 * s, 0, 360, -14);
};
const hatFront = (p: Pen, x: number, y: number, a: number, s: number) => {
  p.ell(x + 0.55 * a, y - 0.25 * a, 0.2 * a, 0.42 * a, "#8a7548", 4 * s, 0, 360, 10);
  p.poly([[x - 0.6 * a, y], [x - 0.5 * a, y - 0.6 * a], [x + 0.5 * a, y - 0.6 * a], [x + 0.6 * a, y]], "#9a8352", 4 * s);
  p.band([[x - 0.56 * a, y - 0.14 * a], [x + 0.56 * a, y - 0.14 * a]], "#5f5134", 9 * s, 2 * s);
  p.poly([[x - 1.15 * a, y], [x + 0.35 * a, y - 6 * s], [x + 0.35 * a, y + 10 * s], [x - 1.1 * a, y + 10 * s]], "#8a7548", 4 * s);
  p.ell(x + 0.55 * a, y - 0.3 * a, 9 * s, 9 * s, "#d9c27a", 3 * s);
};

/** three forward toes + a small back toe at the ankle point */
const foot = (p: Pen, ax: number, ay: number, pitch: number, s: number, col: string, dir = 1) => {
  const c = Math.cos(pitch), sn = Math.sin(pitch);
  for (const [dx, dy] of [[52, 4], [44, -10], [40, 12]] as const)
    p.stroke([[ax, ay], [ax + dir * (dx * c - dy * sn * 0.4) * s, ay + (dx * sn + dy * 0.3) * s]], 9 * s, col);
  p.stroke([[ax, ay], [ax - dir * 16 * s, ay + 2 * s]], 8 * s, col);
};

/** two-bone bird leg: "knee" hidden in the feathers, the visible joint (ankle) bends BACKWARD */
const birdLeg = (p: Pen, hip: P2, foot0: P2, l1: number, l2: number, col: string, w: number) => {
  const dx = foot0[0] - hip[0], dy = foot0[1] - hip[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.5);
  const A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))), k = Math.atan2(dy, dx) + A; // + A: joint behind
  const j: P2 = [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
  p.stroke([hip, j, foot0], w + 7, INK);
  p.stroke([hip, j, foot0], w, col);
  p.dot(j[0], j[1], w * 0.62, INK); p.dot(j[0], j[1], w * 0.42, col);
};

/** side view (facing +x). Modes: stand, walk/run (phase 0..1 = one stride pair), peck (pose 0 up .. 1 beak on the ground),
 *  kick (pose 0 .. 1 = leg flung forward), tall (lookout: neck straight up), chew, puff (chest out, proud) */
export const emuSide = (p: Pen, o: EmuOpts) => {
  const { mode = "stand", phase = 0, pose = 0, light = DEF_LIGHT, seed = 1 } = o;
  const thick = thickAngle(light), two = Math.PI * 2, sole = 975;
  const run = mode === "run", walk = mode === "walk";
  const legLen = 470, l1 = legLen * 0.5, l2 = legLen * 0.52;
  // ---- legs ----
  const S = run ? 330 : walk ? 190 : 0, lift = run ? 120 : 60;
  const footAt = (ph: number): { x: number; h: number; s: number; st: boolean } => {
    const c = (((phase + ph) % 1) + 1) % 1;
    if (!S) return { x: ph ? -26 : 26, h: 0, s: 0, st: true };
    const duty = run ? 0.42 : 0.5;
    if (c < duty) { const s = c / duty; return { x: S / 2 - S * s, h: 0, s, st: true }; }
    const s = (c - duty) / (1 - duty);
    return { x: -S / 2 + S * s - (S / Math.PI) * 0.6 * Math.sin(two * s), h: lift * Math.sin(Math.PI * s) ** 0.8, s, st: false };
  };
  const nL = footAt(0), fL = footAt(0.5);
  const air = run ? 26 * Math.max(0, Math.sin(two * 2 * phase)) : 0, bob = walk ? 10 * Math.cos(two * 2 * phase) : 0;
  let hipX = 290, hipY = sole - 0.86 * legLen - air + bob;
  if (mode === "peck") hipY += 30 * pose;
  if (mode === "tall") hipY -= 20;
  const lean = run ? -0.42 : walk ? -0.12 : mode === "peck" ? -0.25 * pose : mode === "tall" ? 0.12 : mode === "puff" ? 0.12 : 0;
  const legs: { f: P2; pitch: number; near: boolean }[] = [];
  if (mode === "kick") {
    const k = Math.sin(Math.min(1, pose) * Math.PI);
    legs.push({ f: [hipX - 24, sole - 6], pitch: 0, near: false });
    legs.push({ f: [hipX + 60 + 250 * k, sole - 6 - 300 * k], pitch: rad(-40 * k), near: true });
  } else for (const [L, near] of [[fL, false], [nL, true]] as const)
    legs.push({ f: [hipX + L.x, sole - 6 - L.h], pitch: L.st ? 0 : rad(25 * Math.sin(Math.PI * L.s)), near });
  for (const L of legs) {
    const col = L.near ? LEG : shade(LEG, 0.78), hip: P2 = [hipX + (L.near ? 6 : -6), hipY];
    birdLeg(p, hip, L.f, l1, l2, col, 18);
    foot(p, L.f[0], L.f[1], L.pitch, 1.2, col);
  }
  // ---- body mound ----
  const bcx = hipX - 10, bcy = hipY - 70, ba = mode === "puff" ? 205 : 190, bb = mode === "puff" ? 150 : 135;
  const mp = moundPts(bcx, bcy, ba, bb, lean * 0.6, seed);
  // ---- neck (behind the mound's front edge) + head ----
  const base: P2 = [bcx + ba * 0.62 * Math.cos(lean * 0.6), bcy - bb * 0.45 + ba * 0.62 * Math.sin(lean * 0.6)];
  let head: P2, mid: P2;
  if (mode === "peck") {
    const k = pose;
    head = [base[0] + 110 + 30 * k, base[1] - 300 + (sole - 120 - (base[1] - 300)) * k];
    mid = [base[0] + 110 + 40 * k, base[1] - 150 + 60 * k];
  } else if (run) { head = [base[0] + 85, base[1] - 250]; mid = [base[0] + 80, base[1] - 140]; }
  else if (mode === "tall") { head = [base[0] + 30, base[1] - 330]; mid = [base[0] + 30, base[1] - 190]; }
  else if (mode === "kick") { head = [base[0] + 60 - 40 * pose, base[1] - 300]; mid = [base[0] + 50, base[1] - 160]; }
  else { head = [base[0] + 90, base[1] - 320 + (walk ? 8 * Math.sin(two * 2 * phase) : 0)]; mid = [base[0] + 90, base[1] - 160]; }
  if (mode === "chew") head = [head[0], head[1] + 6 * Math.sin(phase * two * 3)];
  const neck = curve(base, mid, [head[0] - 40, head[1] + 45], 16);
  p.stroke(neck, 76, INK); p.stroke(neck, 66, SKIN_N);
  p.stroke(neck.slice(0, 9), 66, FEATH); // feathered lower half
  for (let k = 0; k < 5; k++) { const q = neck[2 + k]; p.stroke([[q[0] - 14, q[1] - 6], [q[0] - 22, q[1] + 16]], 3, FEATH_D); }
  p.gradFill(mp, FEATH, mul(FEATH, SH_CLOTH), light, 0.25);
  p.clip(mp, () => featherTicks(p, bcx, bcy, ba, bb, seed, 1.6));
  p.inkRing(mp, 10, thick);
  headSide(p, head[0], head[1], o, light, thick, 1.5);
};

/** front view: mound, straight neck, front head; walking legs alternate in place (phase) */
export const emuFront = (p: Pen, o: EmuOpts) => {
  const { mode = "stand", phase = 0, light = DEF_LIGHT, seed = 1 } = o;
  const thick = thickAngle(light), two = Math.PI * 2, sole = 975, cx = 300;
  const step = mode === "walk" || mode === "run" ? Math.sin(two * phase) : 0;
  const hipY = sole - 400 - Math.abs(step) * 10;
  for (const side of [-1, 1]) {
    const up = Math.max(0, side * step) * 70, fx = cx + side * 52, fy = sole - 6 - up;
    const col = side < 0 ? shade(LEG, 0.82) : LEG;
    p.stroke([[cx + side * 40, hipY], [cx + side * 56, hipY + 200 - up * 0.5], [fx, fy]], 25, INK);
    p.stroke([[cx + side * 40, hipY], [cx + side * 56, hipY + 200 - up * 0.5], [fx, fy]], 18, col);
    for (const a of [-30, 0, 30]) p.stroke([[fx, fy], [fx + Math.sin(rad(a + side * 8)) * 46, fy + 10]], 10, col);
  }
  const puff = mode === "puff" ? 1.1 : 1;
  const mp = moundPts(cx, hipY - 70, 175 * puff, 140 * puff, 0, seed, 16).map(([x, y]) => [x, y] as P2);
  const hx = cx + (mode === "chew" ? 4 * Math.sin(phase * two * 3) : 0), hy = hipY - 390 + (mode === "chew" ? 6 * Math.sin(phase * two * 3) : 0);
  p.stroke([[cx, hipY - 150], [hx, hy + 40]], 84, INK); p.stroke([[cx, hipY - 150], [hx, hy + 40]], 74, SKIN_N);
  p.stroke([[cx, hipY - 150], [cx, hipY - 280]], 74, FEATH);
  p.gradFill(mp, FEATH, mul(FEATH, SH_CLOTH), light, 0.25);
  p.clip(mp, () => featherTicks(p, cx, hipY - 70, 175, 140, seed, 1.6));
  p.inkRing(mp, 10, thick);
  headFront(p, hx, hy - 20, o, light, thick, 1.45);
};

/** a rabbit (side view, facing +x) on a 300 x 240 canvas, hop 0..1 */
export const fxRabbit = (p: Pen, hop: number) => {
  const y = 200 - 60 * Math.sin(Math.PI * hop), col = "#b9a58f";
  p.ell(140, y - 40, 70, 46, col, 9);
  p.ell(210, y - 80, 36, 32, col, 9);
  for (const dx of [-8, 12]) p.ell(196 + dx, y - 140, 11, 38, col, 8, 0, 360, -10 + dx);
  p.dot(222, y - 86, 6);
  p.ell(72, y - 52, 18, 18, "#f4efe6", 7);
  p.ell(170, y + 2, 26, 10, shade(col, 0.85), 7);
};

/** brass bullet (upright) on a 100 x 300 canvas */
export const fxBullet = (p: Pen) => {
  p.poly([[30, 290], [70, 290], [70, 120], [30, 120]], "#d9a63c", 7);
  p.poly([[30, 120], [70, 120], [62, 60], [50, 30], [38, 60]], "#b8733e", 7);
  p.stroke([[40, 260], [40, 140]], 5, "#f2d27a");
};
/** an emu feather lying flat, on a 320 x 120 canvas */
export const fxFeather = (p: Pen) => {
  p.stroke([[20, 70], [300, 50]], 5, INK);
  for (let i = 0; i < 16; i++) { const x = 40 + i * 16; p.stroke([[x, 66 - i * 1.2], [x - 26, 20 + (i % 3) * 6]], 6, i % 2 ? FEATH : FEATH_D); p.stroke([[x, 66 - i * 1.2], [x - 30, 108 - (i % 2) * 8]], 6, i % 2 ? FEATH_D : FEATH); }
};
/** muzzle flash on a 300 x 300 canvas */
export const fxMuzzle = (p: Pen, k: number) => {
  const pts: P2[] = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = i % 2 ? 50 : 130 + 20 * Math.sin(k * 9 + i); pts.push([150 + r * Math.cos(a), 150 + r * Math.sin(a) * 0.7]); }
  p.poly(pts, "#ffd35a", 8);
  p.ell(150, 150, 46, 34, "#fff7d6", 0);
};
/** speed lines on a 400 x 200 canvas */
export const fxSpeed = (p: Pen, k: number) => {
  for (let i = 0; i < 6; i++) { const y = 20 + i * 32, x0 = 20 + ((i * 53 + k * 400) % 120); p.stroke([[x0, y], [x0 + 200 + (i % 2) * 80, y]], 9, "rgba(255,255,255,0.9)"); }
};
/** dark smoke puff (gun jam) on a 300 x 300 canvas */
export const fxSmoke = (p: Pen, t: number) => {
  for (let i = 0; i < 5; i++) {
    const a = rad(200 + i * 35), d = 30 + 60 * t, r = (40 + 14 * (i % 2)) * (0.7 + 0.5 * t);
    p.ell(150 + d * Math.cos(a), 170 + d * 0.8 * Math.sin(a) - 60 * t, r, r * 0.85, mix("#4a4550", "#a9a4ad", t), 6);
  }
};
/** dust kicked up by a bullet / wheel, on a 300 x 300 canvas (light ochre) */
export const fxDust = (p: Pen, t: number) => {
  for (let i = 0; i < 6; i++) {
    const a = rad(190 + i * 32), d = 30 + 90 * t, r = (34 + 18 * (i % 2)) * (1 - 0.5 * t);
    p.ell(150 + d * Math.cos(a), 220 + d * 0.6 * Math.sin(a) - 40 * t, r, r * 0.8, `rgba(214,170,120,${(1 - t).toFixed(3)})`, 0);
  }
};
