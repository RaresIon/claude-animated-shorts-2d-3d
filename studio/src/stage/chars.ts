// 2D cast, drawn with Canvas2D and shown as camera-facing cards in the 3D set.
// Design rules (from the gap analysis): big off-white bean head (a third of the height), eyes close together,
// thick plum ink, stick limbs with ink-dot hands, one clear expression per beat, the prop in the hand tells the joke.
import { G, INK, clamp01, shade } from "./util";

export type Mouth = "dash" | "smirk" | "smile" | "grin" | "open" | "o" | "frown" | "wave" | "teeth";
export type Eyes = "lid" | "dot" | "wide" | "happy" | "squeeze" | "angry" | "side" | "spiral";
export type Hat = "none" | "nonla" | "pith" | "kepi" | "topper" | "bandana" | "straw" | "hair" | "helmet" | "hood" | "fur";
export type Held = null | "bowl" | "ladle" | "coin" | "tail" | "rat" | "lantern" | "sack" | "stamp" | "paper" | "magnifier" | "net" | "scissors" | "tails" | "bucket";
export type Look = {
  coat: string; trim?: string; legs?: string; hat: Hat; hatCol?: string; band?: string; moustache?: boolean | string; monocle?: boolean; glasses?: boolean;
  buttons?: string; sash?: string; collar?: string; apron?: string; stout?: boolean; skin?: string; beard?: string;
};
export type Pose = {
  eyes?: Eyes; mouth?: Mouth; brow?: number;         // brow: -1 raised … +1 angry
  look?: [number, number];                           // pupil direction -1..1
  face?: number;                                     // -1 faces left … +1 faces right
  lh?: [number, number]; rh?: [number, number];      // hand positions, in head-radius units from the shoulder (x out, y down)
  held?: Held; heldL?: Held;
  lean?: number; squash?: number;                    // lean in radians; squash: 1 = rest, <1 squashed, >1 stretched
  walk?: number;                                     // walk-cycle phase (radians); undefined = standing
  blink?: boolean; sweat?: boolean; tilt?: number;   // head tilt in radians
  view?: "front" | "side";                           // side: profile, one eye, facing the sign of `face`
};

export const PW = 440, PH = 640; // person canvas (design px); soles at y = 620
export const SKIN = "#fbf5ea";
const ell = (g: G, x: number, y: number, rx: number, ry: number, rot = 0) => { g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); };
const line = (g: G, pts: number[][], w: number, c = INK) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); };
/** a limb: one curved "noodle" stroke through a control point (the reference bends limbs as curves, not joints) */
const noodle = (g: G, a: number[], c: number[], b: number[], w: number, col = INK) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(c[0] * 2 - (a[0] + b[0]) / 2, c[1] * 2 - (a[1] + b[1]) / 2, b[0], b[1]); g.stroke(); };
const inkFill = (g: G, fill: string, w = 9) => { g.fillStyle = fill; g.fill(); g.strokeStyle = INK; g.lineWidth = w; g.lineJoin = "round"; g.stroke(); };
/** soft crescent form shadow inside the current path */
const crescent = (g: G, path: () => void, x: number, y: number, rx: number, ry: number, a = 0.16) => {
  g.save(); path(); g.clip(); g.fillStyle = `rgba(60,40,90,${a})`; g.beginPath(); g.rect(x - rx * 2, y - ry * 2, rx * 4, ry * 4); ell2(g, x - rx * 0.28, y - ry * 0.22, rx * 1.02, ry * 1.02); g.fill("evenodd"); g.restore();
};
const ell2 = (g: G, x: number, y: number, rx: number, ry: number) => { g.moveTo(x + rx, y); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };

const drawHeld = (g: G, k: Held, x: number, y: number, s: number) => {
  if (!k) return;
  g.save(); g.translate(x, y);
  if (k === "coin") { ell(g, 0, -20, 24, 24); inkFill(g, "#f2c230", 6); g.fillStyle = "#b8860b"; g.font = "bold 28px sans-serif"; g.textAlign = "center"; g.fillText("1", 0, -10); }
  if (k === "tail") { g.strokeStyle = INK; g.lineWidth = 15; g.lineCap = "round"; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-26, 30, 26, 60, 0, 100); g.stroke(); g.strokeStyle = "#e79aa6"; g.lineWidth = 8; g.stroke(); }
  if (k === "tails") { for (let i = -2; i <= 2; i++) { g.strokeStyle = INK; g.lineWidth = 13; g.lineCap = "round"; g.beginPath(); g.moveTo(i * 5, 0); g.bezierCurveTo(i * 20 - 14, 30, i * 20 + 14, 60, i * 16, 92 + (i % 2) * 8); g.stroke(); g.strokeStyle = "#e79aa6"; g.lineWidth = 7; g.stroke(); } }
  if (k === "rat") { g.translate(0, 62); g.rotate(Math.PI / 2); g.scale(0.55, 0.55); g.translate(-150, -110); drawRat(g, { dead: true, tail: true }); }
  if (k === "lantern") { line(g, [[0, 0], [0, 24]], 5); g.beginPath(); g.roundRect(-20, 24, 40, 54, 6); inkFill(g, "#ffd75a", 6); g.fillStyle = "#3a3540"; g.fillRect(-24, 20, 48, 9); g.fillRect(-24, 74, 48, 9); }
  if (k === "sack") { ell(g, 0, 56, 46, 56); inkFill(g, "#c9b48a", 8); g.beginPath(); g.moveTo(-16, 6); g.lineTo(16, 6); g.lineTo(9, -12); g.lineTo(-9, -12); g.closePath(); inkFill(g, "#b8a274", 6); }
  if (k === "stamp") { g.beginPath(); g.roundRect(-22, 8, 44, 22, 5); inkFill(g, "#6b4a2d", 6); g.beginPath(); g.roundRect(-10, -26, 20, 36, 8); inkFill(g, "#b9483c", 6); }
  if (k === "paper") { g.rotate(-0.15); g.beginPath(); g.rect(-34, -70, 68, 88); inkFill(g, "#f3ead2", 6); for (let i = 0; i < 4; i++) line(g, [[-22, -52 + i * 16], [22, -52 + i * 16]], 4, "#8a7f6a"); }
  if (k === "magnifier") { line(g, [[0, 0], [22 * s, -44]], 11); ell(g, 36 * s, -76, 34, 34); g.fillStyle = "rgba(190,230,245,0.75)"; g.fill(); g.strokeStyle = INK; g.lineWidth = 9; g.stroke(); }
  if (k === "net") { line(g, [[0, 30], [0, -110]], 9, "#6b4a2d"); ell(g, 0, -150, 44, 44); g.fillStyle = "rgba(240,235,220,0.5)"; g.fill(); g.strokeStyle = INK; g.lineWidth = 7; g.stroke(); line(g, [[-30, -150], [30, -150]], 3); line(g, [[0, -180], [0, -120]], 3); }
  if (k === "scissors") { line(g, [[0, 0], [-16, -62]], 8, "#b8c0c8"); line(g, [[0, 0], [16, -62]], 8, "#b8c0c8"); ell(g, -10, 14, 11, 11); g.strokeStyle = INK; g.lineWidth = 6; g.stroke(); ell(g, 10, 14, 11, 11); g.stroke(); }
  if (k === "bowl") { g.beginPath(); g.moveTo(-34, 0); g.quadraticCurveTo(0, 52, 34, 0); g.closePath(); inkFill(g, "#c9a06a", 7); ell(g, 0, 0, 34, 9); inkFill(g, "#e8c66a", 5); }
  if (k === "ladle") { line(g, [[0, 20], [0, -70]], 9, "#8a6a4a"); ell(g, 0, -86, 22, 18); inkFill(g, "#8a8590", 6); }
  if (k === "bucket") { g.beginPath(); g.moveTo(-30, 10); g.lineTo(30, 10); g.lineTo(22, 66); g.lineTo(-22, 66); g.closePath(); inkFill(g, "#8a98a8", 7); g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.arc(0, 10, 30, Math.PI, 0); g.stroke(); }
  g.restore();
};

const drawHat = (g: G, L: Look, hx: number, hy: number, R: number, f: number) => {
  const c = L.hatCol ?? "#d9c48a";
  if (L.hat === "nonla") { g.beginPath(); g.moveTo(hx - R * 1.45, hy - R * 0.42); g.quadraticCurveTo(hx, hy - R * 0.2, hx + R * 1.45, hy - R * 0.42); g.lineTo(hx + f * 6, hy - R * 1.5); g.closePath(); inkFill(g, c); line(g, [[hx - R * 0.7, hy - R * 0.9], [hx + R * 0.72, hy - R * 0.9]], 4, shade(c, 0.75)); line(g, [[hx - R * 1.05, hy - R * 0.62], [hx + R * 1.05, hy - R * 0.62]], 4, shade(c, 0.75)); }
  if (L.hat === "straw") { ell(g, hx, hy - R * 0.62, R * 1.4, R * 0.26); inkFill(g, c); g.beginPath(); g.ellipse(hx, hy - R * 0.7, R * 0.72, R * 0.62, 0, Math.PI, 0); g.closePath(); inkFill(g, c); line(g, [[hx - R * 0.7, hy - R * 0.74], [hx + R * 0.7, hy - R * 0.74]], 9, L.band ?? "#b9483c"); }
  if (L.hat === "pith") { g.beginPath(); g.ellipse(hx, hy - R * 0.52, R * 1.02, R * 0.92, 0, Math.PI, 0); g.closePath(); inkFill(g, c); g.beginPath(); g.ellipse(hx + f * 8, hy - R * 0.5, R * 1.38, R * 0.2, 0, 0, Math.PI * 2); inkFill(g, shade(c, 0.94)); line(g, [[hx - R * 0.92, hy - R * 0.72], [hx + R * 0.92, hy - R * 0.72]], 10, L.band ?? "#8a6a3c"); ell(g, hx, hy - R * 1.44, 9, 9); inkFill(g, c, 6); }
  if (L.hat === "kepi") { g.beginPath(); g.moveTo(hx - R * 0.8, hy - R * 0.55); g.lineTo(hx - R * 0.7, hy - R * 1.3); g.lineTo(hx + R * 0.7, hy - R * 1.3); g.lineTo(hx + R * 0.8, hy - R * 0.55); g.closePath(); inkFill(g, c); line(g, [[hx - R * 0.78, hy - R * 0.68], [hx + R * 0.78, hy - R * 0.68]], 12, L.band ?? "#e2b84a"); g.beginPath(); g.ellipse(hx + f * R * 0.5, hy - R * 0.52, R * 0.7, R * 0.14, 0, 0, Math.PI * 2); inkFill(g, INK, 4); }
  if (L.hat === "topper") { g.beginPath(); g.rect(hx - R * 0.6, hy - R * 1.9, R * 1.2, R * 1.3); inkFill(g, c); ell(g, hx, hy - R * 0.62, R * 1.1, R * 0.16); inkFill(g, c); line(g, [[hx - R * 0.58, hy - R * 0.84], [hx + R * 0.58, hy - R * 0.84]], 12, L.band ?? "#b9483c"); }
  if (L.hat === "bandana") { g.beginPath(); g.ellipse(hx, hy - R * 0.2, R * 1.0, R * 0.82, 0, Math.PI * 1.05, -0.05 * Math.PI); g.closePath(); inkFill(g, c); g.beginPath(); g.moveTo(hx - f * R, hy - R * 0.3); g.lineTo(hx - f * R * 1.4, hy - R * 0.05); g.lineTo(hx - f * R * 1.25, hy - R * 0.5); g.closePath(); inkFill(g, c, 6); }
  if (L.hat === "helmet") { g.beginPath(); g.ellipse(hx, hy - R * 0.38, R * 1.0, R * 0.82, 0, Math.PI, 0); g.closePath(); inkFill(g, c); line(g, [[hx - R * 1.0, hy - R * 0.4], [hx + R * 1.0, hy - R * 0.4]], 13, L.band ?? "#c9a03a"); line(g, [[hx + f * 6, hy - R * 1.2], [hx + f * 6, hy - R * 0.4]], 9, L.band ?? "#c9a03a"); g.beginPath(); g.rect(hx + f * R * 0.22 - 9, hy - R * 0.4, 18, R * 0.52); inkFill(g, c, 5); for (const s of [-1, 1]) { ell(g, hx + s * R * 0.55, hy - R * 0.4, 6, 6); g.fillStyle = INK; g.fill(); } }
  if (L.hat === "hood") { g.beginPath(); g.ellipse(hx, hy - R * 0.05, R * 1.12, R * 1.1, 0, Math.PI * 0.88, Math.PI * 0.12); g.quadraticCurveTo(hx + R * 0.7, hy - R * 0.55, hx, hy - R * 0.62); g.quadraticCurveTo(hx - R * 0.7, hy - R * 0.55, hx - R * 1.02, hy + R * 0.38); g.closePath(); inkFill(g, c); }
  if (L.hat === "fur") { g.beginPath(); g.ellipse(hx, hy - R * 0.55, R * 1.08, R * 0.55, 0, 0, Math.PI * 2); inkFill(g, c); for (let i = -3; i <= 3; i++) line(g, [[hx + i * R * 0.26, hy - R * 0.8], [hx + i * R * 0.28, hy - R * 0.3]], 3.5, shade(c, 0.7)); }
  if (L.hat === "hair") { g.beginPath(); g.ellipse(hx, hy - R * 0.1, R * 1.03, R * 0.98, 0, Math.PI * 1.08, -0.08 * Math.PI); g.quadraticCurveTo(hx, hy - R * 0.45, hx - R * 0.98, hy - R * 0.32); g.closePath(); inkFill(g, c); }
};

const drawFace = (g: G, L: Look, P: Pose, hx: number, hy: number, R: number) => {
  const side = P.view === "side", dir = (P.face ?? 1) >= 0 ? 1 : -1;
  const f = side ? dir * 1.7 : P.face ?? 0, cx = hx + f * R * 0.24, ey = hy + R * 0.02, dx = R * 0.25, er = R * 0.2;
  const eyes: Eyes = P.blink ? "squeeze" : P.eyes ?? "lid", [lx, ly] = P.look ?? [f * 0.5, 0], brow = P.brow ?? 0;
  for (const s of [-1, 1]) {
    if (side && s !== dir) continue; // profile: only the near eye
    const x = cx + s * dx;
    if (eyes === "lid" || eyes === "wide" || eyes === "angry" || eyes === "side") {
      ell(g, x, ey, er, eyes === "wide" ? er * 1.18 : er); g.fillStyle = "#ffffff"; g.fill(); g.strokeStyle = INK; g.lineWidth = 5.5; g.stroke();
      const pr = eyes === "wide" ? er * 0.3 : er * 0.42; ell(g, x + lx * er * 0.45, ey + ly * er * 0.4 + (eyes === "lid" ? er * 0.12 : 0), pr, pr); g.fillStyle = INK; g.fill();
      if (eyes === "lid" || eyes === "angry" || eyes === "side") { g.save(); ell(g, x, ey, er, er); g.clip(); g.fillStyle = L.skin ?? SKIN; g.beginPath(); const t = eyes === "angry" ? s * -0.5 : 0; g.moveTo(x - er * 1.2, ey - er * 1.2); g.lineTo(x + er * 1.2, ey - er * 1.2); g.lineTo(x + er * 1.2, ey - er * (0.25 + t * 0.5)); g.lineTo(x - er * 1.2, ey - er * (0.25 - t * 0.5)); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 5.5; g.stroke(); g.restore(); ell(g, x, ey, er, er); g.strokeStyle = INK; g.lineWidth = 5.5; g.stroke(); }
    } else if (eyes === "dot") { ell(g, x, ey, er * 0.36, er * 0.42); g.fillStyle = INK; g.fill(); }
    else if (eyes === "happy") { g.strokeStyle = INK; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.arc(x, ey + er * 0.3, er * 0.7, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else if (eyes === "squeeze") { line(g, [[x - er * 0.7, ey - er * 0.4 * s * 0], [x + er * 0.7 * 1, ey]], 7); line(g, [[x - s * er * 0.7, ey - er * 0.45], [x + s * er * 0.5, ey], [x - s * er * 0.7, ey + er * 0.45]], 6.5); }
    else if (eyes === "spiral") { g.strokeStyle = INK; g.lineWidth = 4.5; g.beginPath(); for (let a = 0; a < 14; a += 0.3) { const rr = (a / 14) * er; g.lineTo(x + Math.cos(a) * rr, ey + Math.sin(a) * rr); } g.stroke(); }
    // brows: short tapered strokes; brow>0 angry (inner end down), <0 raised/worried
    const by = ey - er * (1.5 - Math.min(0, brow) * 0.5) + (eyes === "wide" ? -er * 0.2 : 0);
    line(g, [[x - s * er * 0.85, by - brow * er * 0.42 + (brow < 0 ? er * 0.1 : 0)], [x + s * er * 0.6, by + brow * er * 0.1 + (brow < 0 ? -er * 0.12 : 0)]].map(([a, b], i) => [a, i === 1 ? b : b]) , 7.5);
  }
  if (L.monocle && (!side || dir > 0)) { ell(g, cx + dx, ey, er * 1.18, er * 1.18); g.strokeStyle = "#c9a03a"; g.lineWidth = 5; g.stroke(); line(g, [[cx + dx + er, ey + er * 0.6], [cx + dx + er * 1.3, ey + R * 0.9]], 2.5, "#c9a03a"); }
  if (L.glasses) for (const s of side ? [dir] : [-1, 1]) { ell(g, cx + s * dx, ey, er * 1.15, er * 1.15); g.strokeStyle = INK; g.lineWidth = 5; g.stroke(); }
  // mouth
  const mx = cx + f * R * 0.08, my = hy + R * 0.48, m = P.mouth ?? "dash", mw = R * 0.2;
  if (L.beard) { g.beginPath(); g.moveTo(mx - mw * 2.3, my - mw * 0.6); g.quadraticCurveTo(mx - mw * 2.0, my + mw * 2.6, mx, my + mw * 3.4); g.quadraticCurveTo(mx + mw * 2.0, my + mw * 2.6, mx + mw * 2.3, my - mw * 0.6); g.quadraticCurveTo(mx, my + mw * 1.3, mx - mw * 2.3, my - mw * 0.6); g.closePath(); inkFill(g, L.beard, 5); }
  g.lineCap = "round";
  if (m === "dash") line(g, [[mx - mw * 0.55, my], [mx + mw * 0.55, my - 2]], 6.5);
  if (m === "smirk") line(g, [[mx - mw * 0.6, my + 3], [mx + mw * 0.2, my + 3], [mx + mw * 0.75, my - 9]], 6.5);
  if (m === "smile") { g.strokeStyle = INK; g.lineWidth = 6.5; g.beginPath(); g.arc(mx, my - mw * 0.6, mw, Math.PI * 0.18, Math.PI * 0.82); g.stroke(); }
  if (m === "frown") { g.strokeStyle = INK; g.lineWidth = 6.5; g.beginPath(); g.arc(mx, my + mw * 0.95, mw, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
  if (m === "wave") { g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(mx - mw, my); for (let i = 0; i <= 12; i++) g.lineTo(mx - mw + (i / 12) * mw * 2, my + Math.sin(i * 1.57) * 5); g.stroke(); }
  if (m === "o") { ell(g, mx, my + 2, mw * 0.42, mw * 0.56); inkFill(g, "#5a1e28", 5.5); }
  if (m === "open") { g.beginPath(); g.ellipse(mx, my - 3, mw * 0.85, mw * 0.8, 0, 0, Math.PI); g.closePath(); inkFill(g, "#5a1e28", 5.5); g.save(); g.beginPath(); g.ellipse(mx, my - 3, mw * 0.85, mw * 0.8, 0, 0, Math.PI); g.clip(); ell(g, mx, my + mw * 0.7, mw * 0.6, mw * 0.4); g.fillStyle = "#e86e78"; g.fill(); g.restore(); }
  if (m === "grin" || m === "teeth") { g.beginPath(); if (m === "grin") { g.ellipse(mx, my - 6, mw * 1.25, mw * 1.0, 0, 0, Math.PI); g.closePath(); } else g.roundRect(mx - mw * 1.1, my - mw * 0.5, mw * 2.2, mw, 8); inkFill(g, "#ffffff", 5.5); g.strokeStyle = INK; g.lineWidth = 3.5; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(mx + i * mw * 0.55, my - mw * 0.5); g.lineTo(mx + i * mw * 0.55, my + mw * 0.9); g.stroke(); } if (m === "teeth") line(g, [[mx - mw * 1.1, my], [mx + mw * 1.1, my]], 3.5); }
  if (L.moustache) { g.fillStyle = typeof L.moustache === "string" ? L.moustache : "#5a3a24"; g.strokeStyle = INK; g.lineWidth = 4; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(mx, my - mw * 0.75); g.quadraticCurveTo(mx + s * mw * 1.2, my - mw * 1.3, mx + s * mw * 1.9, my - mw * 0.2); g.quadraticCurveTo(mx + s * mw * 0.9, my - mw * 0.1, mx, my - mw * 0.3); g.closePath(); g.fill(); g.stroke(); } }
  if (P.sweat) { g.beginPath(); g.moveTo(hx + R * 0.82, hy - R * 0.5); g.quadraticCurveTo(hx + R * 1.0, hy - R * 0.2, hx + R * 0.82, hy - R * 0.14); g.quadraticCurveTo(hx + R * 0.66, hy - R * 0.2, hx + R * 0.82, hy - R * 0.5); inkFill(g, "#9fd4ff", 4); }
};

/** draw one person into a PW x PH canvas */
export const drawPerson = (g: G, L: Look, P: Pose) => {
  g.clearRect(0, 0, PW, PH);
  const R = 92, sq = P.squash ?? 1, foot = 620, cx = PW / 2;
  g.save(); g.translate(cx, foot); g.rotate(P.lean ?? 0); g.scale(1 / Math.sqrt(sq), sq); g.translate(-cx, -foot);
  const tw = L.stout ? 86 : 68, th = 104, ty = 392, hy = 196, hipY = ty + th * 0.72;
  const wk = P.walk, sw = wk === undefined ? 0 : Math.sin(wk), bob = wk === undefined ? 0 : -Math.abs(Math.cos(wk)) * 9;
  // legs
  const legC = L.legs ?? INK;
  for (const s of [-1, 1]) {
    const fx = cx + s * 30 + s * sw * 46, lift = wk === undefined ? 0 : Math.max(0, -s * Math.cos(wk)) * 22;
    const knee = [cx + s * 28 + s * sw * 26 + (wk === undefined ? 0 : 10), (hipY + foot) / 2 - lift * 0.6];
    noodle(g, [cx + s * 26, hipY + bob], knee, [fx, foot - 8 - lift], 15); if (legC !== INK) noodle(g, [cx + s * 26, hipY + bob], knee, [fx, foot - 8 - lift], 8, legC);
    ell(g, fx + 9, foot - 7 - lift, 21, 10); g.fillStyle = INK; g.fill();
  }
  g.translate(0, bob);
  // far arm (drawn behind the torso), then torso, then near arm on top
  const sh: [number, number][] = [[cx - tw * 0.82, ty - th * 0.5], [cx + tw * 0.82, ty - th * 0.5]];
  const hands = [P.lh ?? [-0.35, 1.25], P.rh ?? [0.35, 1.25]].map((h, i) => [sh[i][0] + h[0] * R, sh[i][1] + h[1] * R] as [number, number]);
  const arm = (i: number) => { const s = i ? 1 : -1, h = hands[i], el: [number, number] = [(sh[i][0] + h[0]) / 2 + s * 16, (sh[i][1] + h[1]) / 2 + 20]; noodle(g, sh[i], el, h, 14); drawHeld(g, i ? P.held ?? null : P.heldL ?? null, h[0], h[1], s); ell(g, h[0], h[1], 15, 15); g.fillStyle = INK; g.fill(); };
  const torso = () => { g.beginPath(); g.ellipse(cx, ty, tw, th, 0, 0, Math.PI * 2); };
  torso(); inkFill(g, L.coat, 10);
  g.save(); torso(); g.clip();
  if (L.apron) { g.fillStyle = L.apron; g.fillRect(cx - tw * 0.6, ty - th * 0.25, tw * 1.2, th * 1.4); }
  if (L.sash) { g.strokeStyle = L.sash; g.lineWidth = 22; g.beginPath(); g.moveTo(cx - tw, ty - th * 0.75); g.lineTo(cx + tw, ty + th * 0.6); g.stroke(); }
  if (L.trim) { g.fillStyle = L.trim; g.fillRect(cx - tw, ty + th * 0.42, tw * 2, 20); }
  if (L.collar) { g.fillStyle = L.collar; g.beginPath(); g.moveTo(cx - 34, ty - th); g.lineTo(cx, ty - th * 0.52); g.lineTo(cx + 34, ty - th); g.closePath(); g.fill(); }
  if (L.buttons) for (let i = 0; i < 3; i++) { ell(g, cx, ty - th * 0.3 + i * 34, 7, 7); g.fillStyle = L.buttons; g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); }
  g.restore();
  crescent(g, torso, cx, ty, tw, th, 0.2); torso(); g.strokeStyle = INK; g.lineWidth = 10; g.stroke();
  arm(0); arm(1);
  // head
  g.save(); g.translate(cx, hy + R * 0.9); g.rotate(P.tilt ?? 0); g.translate(-cx, -(hy + R * 0.9));
  const fx = (P.face ?? 0) * 6;
  const head = () => { g.beginPath(); g.ellipse(cx + fx, hy, R * 1.04, R * 0.97, 0, 0, Math.PI * 2); };
  head(); inkFill(g, L.skin ?? SKIN, 10); crescent(g, head, cx + fx, hy, R * 1.04, R * 0.97, 0.13); head(); g.strokeStyle = INK; g.lineWidth = 10; g.stroke();
  drawFace(g, L, P, cx + fx, hy, R); drawHat(g, L, cx + fx, hy, R, P.face ?? 0);
  g.restore(); g.restore();
};

// ------------------------------------------------------------------ rats
export type Rat = { tail?: boolean; bandage?: boolean; phase?: number; mood?: "smug" | "scared" | "happy" | "plain"; col?: string; baby?: boolean; dead?: boolean; coinTail?: boolean; sit?: boolean };
export const RW = 300, RH = 220; // rat canvas, faces right, feet at y = 200
export const drawRat = (g: G, r: Rat) => {
  const col = r.col ?? "#8f8794", ph = r.phase ?? 0, by = r.sit ? 138 : 132 - Math.abs(Math.sin(ph)) * 6, k = r.baby ? 0.72 : 1;
  g.save(); if (r.baby) { g.translate(150, 200); g.scale(k, k); g.translate(-150, -200); }
  // tail (behind): long pink S-curve, or a bandaged stub
  if (r.tail !== false) { g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 17; g.beginPath(); g.moveTo(74, by + 10); g.bezierCurveTo(30, by + 30, 40, by - 40, 10, by - 30 + Math.sin(ph * 2) * 8); g.stroke(); g.strokeStyle = r.coinTail ? "#f2c230" : "#e79aa6"; g.lineWidth = 9; g.stroke(); }
  else if (r.bandage) { g.beginPath(); g.roundRect(34, by - 10, 46, 34, 10); inkFill(g, "#ffffff", 7); g.fillStyle = "#d94a4a"; g.fillRect(52, by - 2, 9, 19); g.fillRect(47, by + 3, 19, 9); }
  // legs
  if (!r.dead) for (const [x, s] of [[104, 1], [128, -1], [182, -1], [206, 1]] as const) { const a = r.sit ? 0 : Math.sin(ph + (s > 0 ? 0 : Math.PI)) * 22; line(g, [[x, by + 34], [x + a, 196 - Math.max(0, Math.cos(ph + (s > 0 ? 0 : Math.PI))) * 10]], 11); }
  else for (const x of [112, 132, 180, 200]) line(g, [[x, by - 30], [x + 4, by - 66]], 11);
  // body + head
  ell(g, 150, by + 6, 82, 50); inkFill(g, col, 9); g.save(); ell(g, 150, by + 6, 82, 50); g.clip(); ell(g, 150, by + 44, 70, 30); g.fillStyle = shade(col, 1.25); g.fill(); g.restore();
  g.beginPath(); g.moveTo(196, by - 40); g.quadraticCurveTo(250, by - 44, 286, by + 2); g.quadraticCurveTo(250, by + 36, 200, by + 30); g.closePath(); inkFill(g, col, 9);
  ell(g, 212, by - 44, 22, 24); inkFill(g, shade(col, 1.12), 8); ell(g, 213, by - 43, 11, 12); g.fillStyle = "#e79aa6"; g.fill();
  ell(g, 285, by + 2, 9, 9); g.fillStyle = "#e86e78"; g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
  for (const d of [-10, 0, 10]) line(g, [[268, by + 10], [296, by + 14 + d]], 2.5);
  const m = r.dead ? "dead" : r.mood ?? "plain", ex = 244, ey = by - 12;
  if (m === "dead") { line(g, [[ex - 9, ey - 9], [ex + 9, ey + 9]], 5); line(g, [[ex + 9, ey - 9], [ex - 9, ey + 9]], 5); }
  else { ell(g, ex, ey, 14, m === "scared" ? 17 : 14); g.fillStyle = "#fff"; g.fill(); g.strokeStyle = INK; g.lineWidth = 4.5; g.stroke(); ell(g, ex + 4, ey + (m === "smug" ? 3 : 0), 5.5, 5.5); g.fillStyle = INK; g.fill();
    if (m === "smug") { g.fillStyle = col; g.beginPath(); g.rect(ex - 16, ey - 18, 32, 14); g.fill(); line(g, [[ex - 14, ey - 4], [ex + 14, ey - 4]], 4.5); line(g, [[ex - 12, ey - 20], [ex + 14, ey - 15]], 5); }
    if (m === "scared") line(g, [[ex - 12, ey - 24], [ex + 10, ey - 30]], 5);
    if (m === "happy" || m === "smug") { g.strokeStyle = INK; g.lineWidth = 4.5; g.beginPath(); g.arc(262, by + 12, 12, Math.PI * 0.15, Math.PI * 0.8); g.stroke(); } }
  g.restore();
};

/** blink helper: a 4-frame blink at pseudo-random intervals of 0.6-2.4 s, different per character seed */
export const blinkAt = (f: number, seed: number) => { let t = (seed * 37) % 50; let i = 0; while (t < f - 3) { t += 18 + ((Math.sin(seed * 12.9 + i++ * 78.2) * 43758.5) % 1 + 1) % 1 * 54; } return f >= t && f < t + 4; };
/** mouth flap for a spoken line: three shapes changing every 3 frames between frames a and b (reference: mouths
 *  move only on in-character lines, never under narration) */
export const talk = (f: number, a: number, b: number): Mouth | undefined => (f >= a && f < b ? (["open", "dash", "o", "open", "smile"] as Mouth[])[Math.floor((f - a) / 3) % 5] : undefined);
export const settle = (f: number, a: number, dur = 7) => clamp01((f - a) / dur);
