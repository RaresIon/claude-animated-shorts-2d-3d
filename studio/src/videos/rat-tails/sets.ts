// Sets of "The Rat Tail Problem" (Hanoi, 1902). Five places, each dressed to fill a 9:16 frame top to bottom:
// wall dressing stacks vertically (lamp, pictures, shelves), the floor in front holds named props.
import * as THREE from "three";
import { SetDef } from "../../stage/Stage";
import * as P from "../../stage/props";
import { room, street, tunnel, field } from "../../stage/sets";
import { dirt, planks, plaster, sign, bricks } from "../../stage/paint";
import { G, INK, rng } from "../../stage/util";

const { put, dress, group } = P;

/** one severed tail: a pink S-curve tube with ink */
const tailGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0, 0], [0.08, 0.02, 0.05], [0.16, 0, -0.04], [0.26, 0.015, 0.02], [0.34, 0, 0]].map((p) => new THREE.Vector3(...p))), 10, 0.014, 5);
export const tail3d = () => P.inked(tailGeo, P.lit("#e79aa6"));
const tailDraw = (g: G, x: number, y: number, s = 1) => { g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 26 * s; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 60 * s, y - 70 * s, x - 60 * s, y - 130 * s, x + 10 * s, y - 200 * s); g.stroke(); g.strokeStyle = "#e79aa6"; g.lineWidth = 14 * s; g.stroke(); };

export const TEX = {
  bounty: () => sign("bounty", 512, 720, "#f3e6c0", [{ t: "REWARD", size: 108, y: 90, col: "#b9302a" }, { t: "1¢", size: 190, y: 250, col: INK }, { t: "PER RAT TAIL", size: 62, y: 660, col: INK }], "#b9302a", (g) => tailDraw(g, 250, 600, 1.1)),
  cancelled: () => sign("cancelled", 640, 220, "#00000000", [{ t: "CANCELLED", size: 110, y: 112, col: "#d2261e" }], "#d2261e"),
  map: () => sign("map", 512, 384, "#e6d6a8", [{ t: "HANOI", size: 54, y: 44, col: "#6b4a2d" }], "#6b4a2d", (g) => { g.strokeStyle = "#3d6a8a"; g.lineWidth = 16; g.beginPath(); g.moveTo(40, 120); g.bezierCurveTo(200, 180, 260, 260, 480, 300); g.stroke(); g.strokeStyle = "#8a6a3c"; g.lineWidth = 4; for (let i = 0; i < 6; i++) { g.strokeRect(70 + i * 62, 210 + (i % 2) * 40, 40, 30); g.strokeRect(100 + i * 55, 90 + (i % 3) * 20, 34, 24); } g.fillStyle = "#b9302a"; g.beginPath(); g.arc(300, 200, 12, 0, 7); g.fill(); }),
  portrait: () => sign("portrait", 300, 380, "#5a6a8a", [], "#3a2414", (g) => { g.fillStyle = "#fbf5ea"; g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.ellipse(150, 160, 78, 74, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#27304a"; g.beginPath(); g.ellipse(150, 330, 96, 90, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; g.fillRect(118, 150, 20, 9); g.fillRect(164, 150, 20, 9); g.fillStyle = "#5a3a24"; g.beginPath(); g.ellipse(150, 196, 44, 12, 0, 0, 7); g.fill(); g.fillStyle = "#e2b84a"; g.fillRect(96, 82, 108, 16); }),
  ledger: () => sign("ledger", 512, 640, "#f3ead2", [{ t: "RATS", size: 70, y: 60, col: "#6b4a2d" }], "#6b4a2d", (g) => { g.strokeStyle = "#3a2414"; g.lineWidth = 7; g.lineCap = "round"; const q = rng(5); for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) { const x = 44 + c * 116, y = 130 + r * 70; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x + i * 18, y); g.lineTo(x + i * 18 + q() * 4, y + 44); g.stroke(); } g.beginPath(); g.moveTo(x - 8, y + 36); g.lineTo(x + 64, y + 6); g.stroke(); } }),
  tally: () => sign("tally", 512, 400, "#27323a", [{ t: "TODAY", size: 64, y: 70, col: "#f3ead2" }, { t: "20,000", size: 150, y: 220, col: "#f2c230" }, { t: "RATS", size: 64, y: 340, col: "#f3ead2" }], "#6b4a2d"),
  arrowUp: () => sign("arrow", 512, 220, "#2f5a4a", [{ t: "FANCY HOUSES", size: 60, y: 76, col: "#f3ead2" }, { t: "↑  ↑  ↑", size: 70, y: 160, col: "#f2c230", font: "Poppins" }], "#f3ead2"),
  ratRoad: () => sign("ratroad", 512, 190, "#27304a", [{ t: "RAT HIGHWAY", size: 72, y: 100, col: "#f2c230" }], "#f2c230"),
  opening: () => sign("opening", 640, 200, "#f3ead2", [{ t: "NEW SEWERS", size: 96, y: 104, col: "#27304a" }], "#b9302a"),
  notRats: () => sign("notrats", 640, 420, "#e6d6a8", [{ t: "DEFINITELY", size: 84, y: 90, col: "#3a2414" }, { t: "NOT", size: 130, y: 210, col: "#b9302a" }, { t: "A RAT FARM", size: 80, y: 340, col: "#3a2414" }], "#6b4a2d"),
  home: () => sign("home", 300, 120, "#f3e6c0", [{ t: "HOME", size: 76, y: 64, col: "#6b4a2d" }], "#6b4a2d"),
  heart: () => sign("heart", 128, 128, "#00000000", [{ t: "♥", size: 120, y: 70, col: "#ff5a7a", font: "Poppins" }], "#00000000"),
  plus: () => sign("plus", 128, 128, "#00000000", [{ t: "+1¢", size: 64, y: 66, col: "#ffe16a", font: "Poppins" }], "#00000000"),
  equals1: () => sign("eq1", 256, 128, "#00000000", [{ t: "= 1¢", size: 84, y: 66, col: "#ffe16a", font: "Poppins" }], "#00000000"),
  spark: () => sign("spark", 128, 128, "#00000000", [{ t: "✦", size: 110, y: 66, col: "#fff3b0", font: "Poppins" }], "#00000000"),
  q: () => sign("qmark", 128, 160, "#00000000", [{ t: "?", size: 150, y: 84, col: "#ffffff", font: "Poppins" }], "#00000000"),
  bang: () => sign("bang", 128, 160, "#00000000", [{ t: "!", size: 150, y: 84, col: "#ffe16a", font: "Poppins" }], "#00000000"),
  cafe: "CAFE", hotel: "HOTEL",
};

// ------------------------------------------------------------------ office (warm interior)
export const TAILS_FROM = 621, TAILS_TO = 716; // the pile on the desk grows over these frames
export const office = (): SetDef => {
  const g = room({ w: 9, d: 8, h: 4.4, wall: "#d9c48e", floor: planks("#a86f3a", 6, false, [4, 4]) });
  const B = -3.94; // back wall
  dress(g, [
    [P.rug(3.6, 2.4), [0.1, 0, 0.6]],
    [P.desk(2.5), [0.45, 0, -1.3]],
    [P.chair(), [1.1, 0, -2.3]],
    [P.windowLit(1.5, 2.0, "#cfeaf7", "#6b4a2d", "#3d6a5a"), [-2.5, 1.5, B]],
    [P.framed(1.25, 0.95, TEX.map()), [0.85, 2.35, B]],
    [P.framed(0.62, 0.8, TEX.portrait()), [2.3, 2.45, B]],
    [P.poster(0.85, 1.2, TEX.bounty(), -0.04), [-0.42, 1.55, B + 0.07]],
    [P.shelf(1.5, 2.2, 3), [3.3, 0, B + 0.2]],
    [P.shelf(1.2, 1.3, 8), [-3.7, 0, B + 0.2]],
    [P.lampHang(3.2, 0.8, "#3d6a5a", 4.2), [0.4, 4.4, -1.1]],
    [P.flagPole(2.9), [-2.95, 0, -3.3]],
    [P.potPlant(1.1), [2.1, 0, -3.4], 0, 1.3],
    [P.crate(0.75, "TAILS"), [-1.75, 0, -2.6], 0.3],
    [P.crate(0.6), [-1.6, 0.75, -2.65], -0.2],
    [P.sack(0.7), [-2.5, 0, -1.9]],
    [P.barrel(0.95), [2.55, 0, -2.0]],
    [P.sack(0.6, "#b8a274"), [2.0, 0, -1.2], 0.5],
    [P.crate(0.55, "1¢"), [1.75, 0, 0.9], -0.35],
    [P.basket(0.3), [-1.9, 0, 0.9]],
    // desk top (y = 0.95)
    [P.papers(6, 2), [-0.35, 0.95, -1.25], 0.2],
    [P.book("#3d6a8a"), [1.2, 0.95, -1.5], -0.3],
    [P.book("#b9483c"), [1.22, 1.01, -1.48], 0.2],
    [P.inkwell(), [0.2, 0.95, -1.6]],
    [P.stamp(), [0.75, 0.95, -1.05]],
    [P.scales(), [1.35, 0.95, -1.0], 0.3],
    [P.coinStack(8, 0.07, 1), [0.95, 0.95, -1.4]],
    [P.coinStack(5, 0.07, 2), [1.08, 0.95, -1.3]],
    [P.coinStack(11, 0.07, 3), [0.82, 0.95, -1.52]],
    [P.bell(), [-0.6, 0.95, -0.95]],
    [P.candle(), [-0.55, 0.95, -1.62]],
  ]);
  g.add(put(P.lightPool(3.2, 4.4, "#cfeaf7", 0.32), -1.6, 0.03, -1.6)); // window light on the floor
  // the pile of tails that grows on the desk
  const r = rng(11), tails: THREE.Object3D[] = [];
  for (let i = 0; i < 90; i++) {
    const k = i / 90, rad = 0.62 * (1 - k * 0.75) * Math.sqrt(r()), a = r() * 6.28, t = tail3d();
    t.position.set(-0.05 + Math.cos(a) * rad, 0.97 + k * 0.62, -1.28 + Math.sin(a) * rad * 0.55); t.rotation.set(r() * 0.8 - 0.4, r() * 6.28, r() * 0.8 - 0.4); t.scale.setScalar(1.25);
    tails.push(t); g.add(t);
  }
  const cancelled = put(P.card(1.1, 0.375, TEX.cancelled(), { unlit: true }), -0.42, 1.95, B + 0.1, 0, 0, 0.22);
  g.add(cancelled);
  return { root: g, tick: (f) => {
    const n = f < TAILS_FROM ? 0 : Math.min(90, Math.floor(((f - TAILS_FROM) / (TAILS_TO - TAILS_FROM - 20)) * 90));
    tails.forEach((t, i) => (t.visible = i < n && f < 1100));
    const c = (f - 1212) / 5; cancelled.visible = f >= 1212; cancelled.scale.setScalar(c < 1 ? 1.7 - 0.7 * Math.max(0, c) : 1);
  } };
};

// ------------------------------------------------------------------ street (French quarter)
export const MANHOLE: [number, number, number] = [0, 0, 1.2];
export const streetSet = (): SetDef => {
  const g = street({ len: 44 });
  const Z = -4.2;
  dress(g, [
    [P.facade(5.2, 2, plaster("#e8c35a", [2, 2]), { shutters: "#3d6a5a", door: "#3d6a5a", balcony: true, shop: "CAFE" }), [-5.4, 0.16, Z]],
    [P.facade(4.6, 3, plaster("#e9d9b0", [2, 3]), { shutters: "#7a3a34", door: "#7a3a34", balcony: true, roof: "#8a4a3a" }), [-0.4, 0.16, Z]],
    [P.facade(5.4, 2, plaster("#e3a070", [2, 2]), { shutters: "#2f5a7a", door: "#2f5a7a", shop: "HOTEL" }), [4.7, 0.16, Z]],
    [P.facade(5, 3, plaster("#cfd9c0", [2, 3]), { shutters: "#3d6a5a", balcony: true }), [10, 0.16, Z]],
    [P.facade(5, 2, plaster("#e8c35a", [2, 2]), { shutters: "#7a3a34" }), [-10.6, 0.16, Z]],
    [P.streetLamp(3.3), [-2.6, 0.16, -2.6]],
    [P.streetLamp(3.3), [3.4, 0.16, -2.6]],
    [P.palm(5, 2), [-3.9, 0.16, -3.0]],
    [P.palm(5.6, 5), [7.3, 0.16, -3.1]],
    [P.potPlant(), [1.6, 0.16, -3.6]],
    [P.potPlant(), [-1.9, 0.16, -3.6]],
    [P.cart(), [3.0, 0, -0.9], 0.4],
    [P.crate(0.7, "RICE"), [-2.6, 0, -0.7], 0.3],
    [P.barrel(0.9), [-3.3, 0, -1.0]],
    [P.sack(0.6), [-2.2, 0, -0.1], 0.4],
    [P.basket(0.32), [3.6, 0, -0.9]],
    [P.bunting(9, 13), [0, 5.4, -1.2]],
    [P.bunting(9, 13), [0.4, 6.3, -3.2]],
    [P.flagPole(3.6), [-2.2, 0.16, -3.4]],
    [P.manhole(0.62, true), MANHOLE],
    [P.poster(0.7, 1.0, TEX.bounty(), 0.05), [-0.2, 1.75, Z + 0.03]],
  ]);
  // grand-opening ribbon over the manhole (only for the ceremony shot)
  const cer = group(put(P.cyl(0.05, 0.06, 0.75, "#e2b84a", 8), -1.05, 0, 1.2), put(P.cyl(0.05, 0.06, 0.75, "#e2b84a", 8), 1.05, 0, 1.2), put(P.box(2.1, 0.12, 0.02, "#d2261e"), 0, 0.58, 1.2),
    put(P.card(2.0, 0.62, TEX.opening(), { unlit: true }), 0, 2.55, -0.4), put(P.cyl(0.03, 0.03, 2.6, "#6b4a2d", 5), -0.95, 0, -0.4), put(P.cyl(0.03, 0.03, 2.6, "#6b4a2d", 5), 0.95, 0, -0.4));
  g.add(cer);
  const lamps: THREE.Object3D[] = []; // lit lamps and windows for the dusk ending
  for (const x of [-2.6, 3.4]) { const l = put(P.streetLamp(3.3, true), x, 0.16, -2.6); lamps.push(l); g.add(l); }
  for (const [x, y] of [[-6.7, 1.9], [-0.4 - 1.15, 5], [1.15 - 0.4, 5], [3.3, 1.9], [6, 4.9]]) { const w = put(new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.35), P.glow("#ffd98a")), x, y + 0.1, Z + 0.06); lamps.push(w); g.add(w); }
  return { root: g, tick: (f) => { cer.visible = f < 400; const ribbon = cer.children[2]; ribbon.visible = f < 228; lamps.forEach((l) => (l.visible = f > 1200)); } };
};

// ------------------------------------------------------------------ sewer
export const sewer = (): SetDef => {
  const { g, r } = tunnel({ len: 36, r: 3.3 });
  const wy = 0, wz = -r * 0.71; // far walkway
  dress(g, [
    [P.pipe(9, 0.2, "#8a5a3c"), [-9, 1.9, -r + 0.55]],
    [P.pipe(9, 0.2, "#8a5a3c"), [0.2, 1.9, -r + 0.55]],
    [P.pipe(9, 0.13, "#5a7a6a"), [-4, 1.45, -r + 0.42]],
    [P.grate(1.1, 0.8), [-2.6, 0.5, -r + 0.72]],
    [P.grate(1.1, 0.8), [4.4, 0.5, -r + 0.72]],
    [P.poster(1.5, 0.56, TEX.ratRoad()), [0.9, 1.0, -r + 0.86]],
    [P.poster(1.3, 0.56, TEX.arrowUp()), [-5.3, 0.9, -r + 0.9]],
    [P.poster(1.25, 0.98, TEX.tally()), [6.6, 0.75, -r + 0.9]],
    [P.barrel(0.8, "#6a5a4a"), [-3.9, wy, wz - 0.4]],
    [P.crate(0.6, undefined, "#8a7a5a"), [2.9, wy, wz - 0.5], 0.4],
    [P.sack(0.6, "#a89a7a"), [7.7, wy, wz - 0.3]],
    [P.sack(0.7, "#a89a7a"), [8.3, wy, wz - 0.55]],
    [P.sack(0.55, "#b8a88a"), [8.0, 0.55, wz - 0.45]],
    [P.cage(0.8, 0.5, 0.5), [5.2, wy, wz - 0.5], 0.2],
    [P.barrel(0.8, "#6a5a4a"), [-1.2, wy, -wz + 0.9]],
    [P.crate(0.55, undefined, "#8a7a5a"), [3.4, wy, -wz + 1.0], 0.5],
  ]);
  for (const x of [-7, -0.6, 5.8, 11]) g.add(put(P.lantern(true), x, 2.25, -r + 1.05)); // wall lanterns with warm pools
  for (const x of [-7, -0.6, 5.8, 11]) g.add(put(P.lightPool(3.6, 2.4, "#ffb84a", 0.55), x, 0.02, wz + 0.2));
  // shaft of daylight from the manhole
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.2, 3.4, 12, 1, true), new THREE.MeshBasicMaterial({ color: "#cfe9ff", transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  g.add(put(shaft, -3.2, 1.7, 0.2), put(P.lightPool(2.6, 2.0, "#cfe9ff", 0.6), -3.2, 0.02, 0.9));
  return { root: g };
};

// ------------------------------------------------------------------ the explanation stage
export const explain = (): SetDef => {
  const g = group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), P.lit(dirt("#6a5a9a", [12, 12]))); g.add(floor);
  dress(g, [
    [P.lightPool(3.6, 2.6, "#fff0c0", 0.5), [-1.0, 0.02, 0.2]],
    [P.lightPool(4.4, 3.2, "#ffd0f0", 0.45), [1.0, 0.02, -2.6]],
    [P.hut(1.7, "#c9a06a", "#b9483c"), [1.25, 0, -3.4], -0.15],
    [P.poster(0.75, 0.3, TEX.home()), [1.02, 1.5, -2.62], -0.15],
    [P.bush(0.5, "#5a8a7a", 2), [2.5, 0, -2.6]],
    [P.bush(0.45, "#5a8a7a", 5), [-0.2, 0, -3.5]],
    [P.fence(2.4, 0.6, "#a98a6a"), [-1.6, 0, -3.3], 0.1],
    [P.crate(0.5, "1¢"), [-2.2, 0, -0.9], 0.4],
    [P.crate(0.8, "RAT"), [-1.15, 0, 0.3], 0.0],
    [P.coinStack(4, 0.09, 4), [-0.45, 0, 0.75]],
    [P.coinStack(2, 0.09, 6), [-1.9, 0, 0.9]],
    [P.sack(0.5), [-0.35, 0, -0.1], 0.3],
    [P.barrel(0.7), [-2.0, 0, -0.2]],
    [P.bush(0.4, "#5a8a7a", 9), [1.9, 0, -0.6]],
    [P.crate(0.4, "1¢"), [-0.6, 0, -1.6], 0.5],
    [P.tree(3.6, "#4a7a8a", 3), [-2.6, 0, -4.6]],
    [P.tree(4.2, "#4a7a8a", 6), [3.4, 0, -5.4]],
    [P.lantern(true), [-0.1, 0, -2.3]],
  ]);
  return { root: g };
};

// ------------------------------------------------------------------ the rat farm (golden hour, outside town)
export const PEN: [number, number, number] = [0.3, 0, -3.2];
export const farm = (): SetDef => {
  const g = field({ ground: dirt("#c49a5a", [40, 40]), hills: "#a8b060" });
  dress(g, [
    [P.hut(3.2), [-2.6, 0, -8.2], 0.2],
    [P.hut(2.6, "#b8905a", "#8a6a3c"), [3.6, 0, -9.5], -0.3],
    [P.fence(5.6, 0.85), [PEN[0], 0, PEN[2] + 1.7]],
    [P.fence(5.6, 0.85), [PEN[0], 0, PEN[2] - 1.7]],
    [P.fence(3.4, 0.85), [PEN[0] - 2.8, 0, PEN[2]], Math.PI / 2],
    [P.fence(3.4, 0.85), [PEN[0] + 2.8, 0, PEN[2]], Math.PI / 2],
    [P.trough(1.3), [PEN[0] + 1.2, 0, PEN[2] - 0.9], 0.2],
    [P.haystack(0.75), [PEN[0] - 1.9, 0, PEN[2] - 1.0]],
            [P.bush(0.7, "#6a9a48", 3), [-2.3, 0, 1.4]],
    [P.bush(0.55, "#7aa850", 7), [-1.3, 0, 1.9]],
    [P.crate(0.5, "FEED"), [-0.7, 0, 2.2], 0.4],
    [P.basket(0.34), [2.0, 0, -0.6]],
    [P.basket(0.3), [2.6, 0, -1.0]],
    [P.sack(0.6), [2.9, 0, -0.2], 0.5],
    [P.cage(0.9, 0.5, 0.5), [3.3, 0, 0.6], -0.3],
    [P.palm(5.5, 3), [-4.6, 0, -6]],
    [P.palm(6.2, 8), [5.2, 0, -7]],
    [P.tree(4.5, "#7aa850", 4), [1.2, 0, -12]],
    [P.tree(5, "#6a9a48", 9), [-7, 0, -11]],
    [P.haystack(1.0), [5.6, 0, -4.2]],
    [P.cart(), [-4.4, 0, -3.6], -0.5],
    [P.fence(6, 0.8), [7.5, 0, -6], 0.3],
    [P.fence(6, 0.8), [-8, 0, -5], -0.2],
  ]);
  const tails = group(); const r = rng(3);
  for (let i = 0; i < 14; i++) { const t = tail3d(); t.position.set(2.0 + (r() - 0.5) * 0.35, 0.34 + r() * 0.12, -0.6 + (r() - 0.5) * 0.35); t.rotation.set(r() - 0.5, r() * 6, 1 + r()); t.scale.setScalar(1.3); tails.add(t); }
  g.add(tails);
  // the sign only appears with the reveal, so it is never half in frame before it
  const signG = group(put(P.poster(1.6, 1.07, TEX.notRats(), -0.05), -0.4, 1.5, PEN[2] + 1.78), put(P.box(0.09, 2.5, 0.09, "#8a5a30"), -0.4, 0, PEN[2] + 1.72));
  g.add(signG);
  return { root: g, tick: (f) => { signG.visible = f >= 1088; } };
};
export { bricks };
