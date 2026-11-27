// Channel art for "Doodle Poodle": the profile picture and the banner, drawn with the stage kit so they match the shorts.
// Two one-frame films (not shorts: no voice, no captions, plan_lint is not run on them).
//   ChannelAvatar  1080x1080  the mascot (a poodle with a pencil in its mouth), head on, on a sunburst. Reads at 98 px in a circle.
//   ChannelBanner  2560x1440  YouTube shows only the middle 1546x423 on phones: the name and the mascot live there,
//                             the rest (desktop sides, TV top and bottom) is scenery.
// Render: node scripts/stills.mjs ChannelAvatar out/channel/avatar 0 1   (and ChannelBanner … banner 0 1)
import * as THREE from "three";
import { CastItem, Film, SetDef } from "../../stage/Stage";
import * as P from "../../stage/props";
import { field } from "../../stage/sets";
import { grass } from "../../stage/paint";
import { Look, Pose } from "../../stage/chars";
import { G, INK, V3, ctex, rng } from "../../stage/util";

const { dress } = P;
export const NAME = "doodle poodle";
const PALETTE = ["#ffd23f", "#ff7a59", "#5fd0c5", "#ffffff", "#ff9ecb", "#9be564"];

// guests from the shorts' world (new looks, same drawing style)
const VIKING: Look = { coat: "#3d6a8a", hat: "helmet", hatCol: "#b8c0c8", beard: "#c9762e", sash: "#8a5a30" };
const BOFFIN: Look = { coat: "#e8e2d2", buttons: "#3a3540", collar: "#3d6a8a", hat: "hair", hatCol: "#a8a8a8", glasses: true };
const TOFF: Look = { coat: "#7a3a6a", collar: "#f3ead2", buttons: "#f2c230", hat: "topper", hatCol: "#2a2433", band: "#b9483c", moustache: "#5a3a24", monocle: true, stout: true };
const FARMER: Look = { coat: "#5f8a48", hat: "straw", hatCol: "#e2c36a", apron: "#f3ead2" };

const person = (id: string, look: Look, at: V3, pose: Pose, h = 1.6): CastItem => ({ kind: "person", id, look, at, h, pose: { blink: false, ...pose } });

// ------------------------------------------------------------------ the mascot: a poodle who draws
const FUR = "#fbf5ea", FUR_SH = "rgba(60,40,90,0.14)", PINK = "#ff8fb0";
/** a fluffy pom: a ring of bumps with one ink outline round the lot */
const pom = (g: G, x: number, y: number, r: number, col = FUR, lw = 16) => {
  const n = Math.max(7, Math.round(r / 14)), bumps: [number, number, number][] = [[x, y, r * 0.8]];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.3; bumps.push([x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.42]); }
  g.fillStyle = INK; for (const [bx, by, br] of bumps) { g.beginPath(); g.arc(bx, by, br + lw / 2, 0, 7); g.fill(); }
  g.fillStyle = col; for (const [bx, by, br] of bumps) { g.beginPath(); g.arc(bx, by, br - lw / 2, 0, 7); g.fill(); }
  g.save(); g.beginPath(); for (const [bx, by, br] of bumps) { g.moveTo(bx + br - lw / 2, by); g.arc(bx, by, br - lw / 2, 0, 7); } g.clip(); // soft form shadow, lower right
  g.fillStyle = FUR_SH; g.beginPath(); g.rect(x - r * 2, y - r * 2, r * 4, r * 4); g.moveTo(x - r * 0.25 + r * 1.05, y - r * 0.25); g.arc(x - r * 0.25, y - r * 0.25, r * 1.05, 0, 7); g.fill("evenodd"); g.restore();
};
const ink = (g: G, fill: string, lw = 16) => { g.fillStyle = fill; g.fill(); g.strokeStyle = INK; g.lineWidth = lw; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); };
/** a pencil from (0,0) pointing along +x, `len` long */
const pencil = (g: G, len: number, t = 44, lw = 12) => {
  g.beginPath(); g.rect(0, -t / 2, len, t); ink(g, "#ffc928", lw); g.strokeStyle = "#d99a12"; g.lineWidth = 5; g.beginPath(); g.moveTo(8, 0); g.lineTo(len - 8, 0); g.stroke();
  g.beginPath(); g.rect(-t * 0.9, -t / 2, t * 0.9, t); ink(g, PINK, lw); g.beginPath(); g.rect(-t * 0.18, -t / 2, t * 0.36, t); ink(g, "#b8c0c8", lw * 0.6);
  g.beginPath(); g.moveTo(len, -t / 2); g.lineTo(len + t * 1.3, 0); g.lineTo(len, t / 2); g.closePath(); ink(g, "#f3d9a8", lw);
  g.beginPath(); g.moveTo(len + t * 0.8, -t * 0.19); g.lineTo(len + t * 1.3, 0); g.lineTo(len + t * 0.8, t * 0.19); g.closePath(); g.fillStyle = INK; g.fill();
};
const happyEye = (g: G, x: number, y: number, r: number, lw: number) => { g.strokeStyle = INK; g.lineWidth = lw; g.lineCap = "round"; g.beginPath(); g.arc(x, y + r * 0.3, r, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); };

/** head-on portrait for the profile picture (1024 square) */
const poodleFace = () => ctex("poodle-face", 1024, 1024, (g) => {
  pom(g, 512, 985, 250);                                                              // chest
  g.beginPath(); g.roundRect(372, 770, 280, 62, 30); ink(g, "#ff6b4a");               // collar
  g.beginPath(); g.arc(512, 846, 30, 0, 7); ink(g, "#ffc928", 12);
  pom(g, 250, 600, 140); pom(g, 774, 600, 140);                                       // ears
  g.beginPath(); g.ellipse(512, 540, 215, 225, 0, 0, 7); ink(g, FUR);                 // head
  g.save(); g.beginPath(); g.ellipse(512, 540, 207, 217, 0, 0, 7); g.clip(); g.fillStyle = FUR_SH; g.beginPath(); g.rect(0, 0, 1024, 1024); g.moveTo(700, 480); g.ellipse(470, 480, 230, 240, 0, 0, 7); g.fill("evenodd"); g.restore();
  pom(g, 512, 262, 168);                                                              // topknot
  happyEye(g, 418, 500, 46, 22); happyEye(g, 606, 500, 46, 22);
  g.save(); g.translate(250, 742); g.rotate(-0.16); pencil(g, 470, 54, 15); g.restore(); // the pencil, carried like a stick
  g.beginPath(); g.ellipse(512, 660, 132, 100, 0, 0, 7); ink(g, "#ffffff");           // muzzle, over the pencil
  g.beginPath(); g.ellipse(512, 598, 50, 36, 0, 0, 7); g.fillStyle = INK; g.fill();   // nose
  g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(498, 588, 14, 8, -0.3, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 14; g.lineCap = "round"; g.beginPath(); g.moveTo(512, 634); g.lineTo(512, 668); g.moveTo(444, 664); g.quadraticCurveTo(478, 702, 512, 668); g.quadraticCurveTo(546, 702, 580, 664); g.stroke();
});

/** whole dog, side on, facing right (1100 x 900; paws on y = 860) */
const poodleBody = () => ctex("poodle-body", 1100, 900, (g) => {
  const leg = (x: number, top: number, sway: number) => { g.strokeStyle = INK; g.lineWidth = 46; g.lineCap = "round"; g.beginPath(); g.moveTo(x, top); g.lineTo(x + sway, 800); g.stroke(); g.strokeStyle = FUR; g.lineWidth = 22; g.stroke(); pom(g, x + sway, 800, 62, FUR, 13); };
  leg(330, 560, -34); leg(600, 560, 30);                                              // far legs
  g.strokeStyle = INK; g.lineWidth = 40; g.lineCap = "round"; g.beginPath(); g.moveTo(275, 470); g.quadraticCurveTo(200, 400, 190, 300); g.stroke(); g.strokeStyle = FUR; g.lineWidth = 18; g.stroke(); pom(g, 186, 262, 76, FUR, 13); // tail
  g.beginPath(); g.ellipse(430, 520, 185, 112, 0, 0, 7); ink(g, FUR, 15);             // clipped body
  pom(g, 300, 520, 118, FUR, 14);                                                     // hip
  leg(380, 600, -10); leg(650, 600, 8);                                               // near legs
  pom(g, 620, 480, 170, FUR, 15);                                                     // chest and mane
  g.beginPath(); g.roundRect(600, 318, 150, 48, 22); ink(g, "#ff6b4a", 12);           // collar
  g.beginPath(); g.ellipse(700, 232, 118, 108, 0, 0, 7); ink(g, FUR, 15);             // head
  g.save(); g.translate(806, 286); g.rotate(-0.5); pencil(g, 215, 44, 13); g.restore(); // pencil in the mouth, point up and forward
  g.beginPath(); g.moveTo(760, 192); g.quadraticCurveTo(900, 192, 906, 248); g.quadraticCurveTo(900, 302, 770, 298); g.closePath(); ink(g, "#ffffff", 14); // snout
  g.beginPath(); g.ellipse(902, 226, 30, 24, 0, 0, 7); g.fillStyle = INK; g.fill();   // nose
  g.strokeStyle = INK; g.lineWidth = 11; g.lineCap = "round"; g.beginPath(); g.moveTo(884, 272); g.quadraticCurveTo(840, 290, 800, 268); g.stroke();
  happyEye(g, 768, 216, 28, 15);
  pom(g, 648, 108, 94, FUR, 14);                                                     // topknot
  pom(g, 596, 262, 82, FUR, 13);                                                      // ear
});

/** the name as chunky doodled letters: each one its own colour, a little off the line, thick ink outline */
const logo = (tag: boolean) => ctex(`logo-${NAME}-${tag}`, 2400, tag ? 760 : 560, (g) => {
  const r = rng(11), size = 330, base = 300;
  g.textBaseline = "middle"; g.lineJoin = "round"; g.font = `800 ${size}px Poppins, sans-serif`;
  const ws = NAME.split("").map((c) => (c === " " ? size * 0.3 : g.measureText(c).width * 0.9)), total = ws.reduce((a, b) => a + b, 0);
  let x = (2400 - total) / 2;
  NAME.split("").forEach((c, i) => {
    if (c === " ") { x += ws[i]; return; }
    g.save(); g.translate(x + ws[i] / 2, base + (i % 2 ? 16 : -16) + (r() - 0.5) * 14); g.rotate((r() - 0.5) * 0.2); g.textAlign = "center";
    g.fillStyle = INK; g.fillText(c, 10, 22);                                   // drop shadow
    g.strokeStyle = INK; g.lineWidth = 56; g.strokeText(c, 0, 0);
    g.fillStyle = PALETTE[i % PALETTE.length]; g.fillText(c, 0, 0);
    g.restore(); x += ws[i];
  });
  if (tag) {
    g.textAlign = "center"; g.font = `800 140px Poppins, sans-serif`; g.strokeStyle = INK; g.lineWidth = 34; g.strokeText("weird true stories, doodled", 1200, 650); g.fillStyle = "#ffffff"; g.fillText("weird true stories, doodled", 1200, 650);
  }
});

/** sunburst backdrop for the profile picture */
const burst = () => ctex("avatar-burst", 1024, 1024, (g) => {
  g.fillStyle = "#3ec6c0"; g.fillRect(0, 0, 1024, 1024);
  g.translate(512, 560);
  for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.fillStyle = "#59d8d0"; g.beginPath(); g.moveTo(0, 0); g.lineTo(-150, -1100); g.lineTo(150, -1100); g.closePath(); g.fill(); }
  const q = rng(5); g.strokeStyle = "#ffffff"; g.lineWidth = 9; g.lineCap = "round"; g.globalAlpha = 0.55; // doodle marks
  for (let i = 0; i < 26; i++) { const a = q() * 7, d = 330 + q() * 330, x = Math.cos(a) * d, y = Math.sin(a) * d; g.beginPath(); if (i % 3 === 0) { g.arc(x, y, 14, 0, 7); } else if (i % 3 === 1) { g.moveTo(x - 16, y); g.lineTo(x + 16, y); g.moveTo(x, y - 16); g.lineTo(x, y + 16); } else { g.moveTo(x - 20, y); g.quadraticCurveTo(x - 6, y - 18, x, y); g.quadraticCurveTo(x + 8, y + 18, x + 20, y); } g.stroke(); }
});

const sets: Record<string, () => SetDef> = {
  studio: () => { const back = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: burst(), fog: false })); back.position.set(0, 1.2, -2.5); return { root: new THREE.Group().add(back) }; },
  meadow: () => ({ root: dress(field({ ground: grass("#86c24f", [40, 40]) }), [
    // behind the cast: the places the shorts go
    [P.longhouse(5), [-9.5, 0, -9], 0.25], [P.hut(3.2), [9.2, 0, -8.5], -0.3], [P.haystack(), [6.2, 0, -6.2]], [P.fence(5.6), [-5.2, 0, -5.2]], [P.fence(5.6), [5.6, 0, -4.6]],
    [P.pine(5.5, "#2f6a4a", 2), [-13, 0, -11]], [P.pine(4.6, "#2f6a4a", 5), [-6.4, 0, -10.5]], [P.tree(4.6, "#5f9a48", 3), [12.6, 0, -10]], [P.tree(4, "#6aa850", 7), [8.2, 0, -12]], [P.tree(4.4, "#5f9a48", 9), [-8.6, 0, -13]],
    [P.bush(0.8, "#5f9a48", 2), [-7.6, 0, -3.4]], [P.bush(0.7, "#6aa850", 4), [7.8, 0, -3]],
    // foreground (TV only): small things, kept under the phone-safe band
    [P.sack(0.42), [-2.3, 0, 6.2]], [P.coinStack(7, 0.08, 3), [-1.7, 0, 6.6]], [P.basket(0.26), [2.2, 0, 6.3]], [P.coinStack(4, 0.08, 5), [2.7, 0, 6.8]],
    [P.bush(0.32, "#5f9a48", 8), [3.1, 0, 5.4]], [P.bush(0.3, "#6aa850", 11), [-3.3, 0, 5.2]],
  ]) }),
};

// ------------------------------------------------------------------ profile picture
export const avatar: Film = {
  total: 1, sets, words: [{ w: NAME, s: 0, e: 0.03 }], captions: false, res: 4,
  shots: [{ a: 0, b: 1, set: "studio", mood: "day", into: "cut",
    cam: () => ({ pos: [0, 1.2, 2.23], look: [0, 1.2, 0], fov: 30 }),
    cast: () => [{ kind: "card", id: "poodle", tex: poodleFace(), at: [0, 1.2, 0], w: 1.3, h: 1.3 }] }],
};

// ------------------------------------------------------------------ banner
// camera level at y = 0.9, 12 m back, fov 30: the phone-safe band is 6.9 m wide and runs from the ground to 1.9 m
const rat = (id: string, at: V3, r: object, s = 1.4, flip = false): CastItem => ({ kind: "rat", id, rat: r, at, s, flip });
export const banner: Film = {
  total: 1, sets, words: [{ w: NAME, s: 0, e: 0.03 }], captions: false, res: 4,
  shots: [{ a: 0, b: 1, set: "meadow", mood: "day", into: "cut",
    cam: () => ({ pos: [0, 0.9, 12], look: [0, 0.9, 0], fov: 30 }),
    cast: () => [
      { kind: "card", id: "logo", tex: logo(true), at: [0.9, 0.99, 0], w: 5.0, h: 5.0 * (760 / 2400) },
      { kind: "card", id: "poodle", tex: poodleBody(), at: [-2.5, 0.82, 0.3], w: 2.2, h: 1.8 }, // in front of the name: the pencil point rests on the first letter
      // desktop sides
      person("viking", VIKING, [-5.5, 0, -0.6], { eyes: "wide", mouth: "open", brow: -0.8, face: 0.5, rh: [0.9, -0.9], lh: [-0.9, -0.9] }, 1.65),
      person("boffin", BOFFIN, [-4.6, 0, -1.3], { eyes: "side", look: [0.8, 0], mouth: "o", face: 0.4, rh: [0.4, 0.9], lh: [-0.85, -0.6], heldL: "paper" }, 1.5),
      person("toff", TOFF, [4.3, 0, -0.8], { eyes: "lid", mouth: "smirk", brow: 0.4, face: -0.5, rh: [0.9, -0.3], held: "coin", lh: [-0.4, 0.9] }, 1.6),
      person("farmer", FARMER, [5.3, 0, -0.3], { eyes: "happy", mouth: "smile", face: -0.5, rh: [0.9, -1.0], lh: [-0.4, 0.9], held: "net" }, 1.6),
      rat("r1", [3.9, 0, 0.3], { mood: "smug", tail: true }, 1.5, true), rat("r2", [-2.6, 0, 6.2], { mood: "happy", coinTail: true }, 1.3), rat("r3", [1.5, 0, 6.4], { mood: "scared", bandage: true }, 1.2, true), rat("r4", [0.4, 0, 6.6], { mood: "smug", tail: true }, 1.0), rat("r5", [-1.0, 0, 6.0], { mood: "plain", tail: true, baby: true }, 1.0, true),
    ] }],
};
