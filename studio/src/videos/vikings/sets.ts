// Sets of "Late for Dinner" (Bjarni Herjolfsson, c. 986). One longship, and the water it sails: a home harbour, open
// fog, three unknown coasts, and Greenland. Every coast is the same builder with a different shore.
import * as THREE from "three";
import { SetDef } from "../../stage/Stage";
import * as P from "../../stage/props";
import { sea } from "../../stage/sets";
import { dirt, grass, sign } from "../../stage/paint";
import { G, INK, V3, rng } from "../../stage/util";

const { put, dress, group } = P;
export const SHORE = 7; // the beach starts at z = -SHORE

// ---------------------------------------------------------------- the ship: where it is at every frame, per set
/** frames the sets animate on; film.ts fills them in from the words */
export const TIMES = { slide: 880, bump: 930, sale: 1080 };
export type ShipPose = { x: number; y: number; roll: number; pitch: number; yaw: number };
const sw = (f: number) => ({ y: 0.07 * Math.sin(f * 0.11), roll: 0.035 * Math.sin(f * 0.08), pitch: 0.02 * Math.sin(f * 0.13 + 1) });
const ease = (u: number) => { const x = Math.max(0, Math.min(1, u)); return 1 - (1 - x) ** 3; };
export const shipPose = (set: string, f: number): ShipPose => {
  const s = sw(f);
  if (set === "hook") return { ...s, x: -1.6 + 1.6 * ease(f / 40), yaw: -0.25 * ease((f - 52) / 30), roll: s.roll + 0.1 * Math.sin(Math.min(1, Math.max(0, (f - 52) / 30)) * Math.PI) };
  if (set === "fog") return { x: Math.sin(f * 0.02) * 0.6, y: 0.16 * Math.sin(f * 0.16), roll: 0.09 * Math.sin(f * 0.13), pitch: 0.05 * Math.sin(f * 0.17), yaw: 0.25 * Math.sin(f * 0.031) };
  if (set === "coast1" || set === "coast2" || set === "coast3") return { ...s, x: 0, yaw: 0 };
  if (set === "greenland") { const b = TIMES.bump, u = ease((f - TIMES.slide) / (b - TIMES.slide)); return { ...s, x: -9 + 9 * u, y: s.y * (f > b ? 0.3 : 1), roll: s.roll * (f > b ? 0.3 : 1) + (f >= b && f < b + 10 ? 0.05 * Math.sin((f - b) * 1.3) : 0), yaw: 0 }; }
  return { x: 0, y: s.y * 0.4, roll: s.roll * 0.4, pitch: 0, yaw: 0 }; // harbour: moored
};
/** a spot on the deck, `dx` metres toward the bow from midships and `dz` across */
export const onDeck = (set: string, f: number, dx: number, dz = 0): V3 => { const p = shipPose(set, f), c = Math.cos(p.yaw), s = Math.sin(p.yaw); return [p.x + dx * c + dz * s, p.y + P.LONGSHIP_DECK - 0.02, -dx * s + dz * c]; };

// ---------------------------------------------------------------- lettering and effect cards
const xIcon = (g: G) => { g.strokeStyle = "#d2261e"; g.lineWidth = 26; g.lineCap = "round"; g.beginPath(); g.moveTo(40, 40); g.lineTo(216, 216); g.moveTo(216, 40); g.lineTo(40, 216); g.stroke(); };
export const TEX = {
  moved: () => sign("vk-moved", 640, 420, "#e6d6a8", [{ t: "MOVED", size: 120, y: 90, col: "#3a2414" }, { t: "TO GREENLAND", size: 70, y: 215, col: "#b9302a" }, { t: "— DAD", size: 72, y: 335, col: "#3a2414" }], "#6b4a2d"),
  arrow: () => sign("vk-arrow", 640, 230, "#d9c48a", [{ t: "GREENLAND", size: 84, y: 80, col: "#3a2414" }, { t: "THAT WAY. PROBABLY.", size: 44, y: 172, col: "#6b4a2d" }], "#6b4a2d"),
  forSale: () => sign("vk-sale", 640, 420, "#f3ead2", [{ t: "FOR SALE", size: 120, y: 90, col: "#b9302a" }, { t: "ONE OWNER", size: 70, y: 215, col: "#3a2414" }, { t: "NEVER LANDED", size: 66, y: 335, col: "#3a2414" }], "#6b4a2d"),
  vinland: () => sign("vk-vinland", 640, 230, "#e6d6a8", [{ t: "VINLAND", size: 110, y: 90, col: "#3a2414" }, { t: "EST. AROUND 1000", size: 46, y: 180, col: "#6b4a2d" }], "#6b4a2d"),
  dads: () => sign("vk-dads", 420, 150, "#e6d6a8", [{ t: "DAD'S", size: 100, y: 82, col: "#3a2414" }], "#6b4a2d"),
  noMap: () => sign("vk-nomap", 256, 256, "#00000000", [], "#00000000", (g) => { g.fillStyle = "#e6d6a8"; g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.rect(34, 58, 188, 140); g.fill(); g.stroke(); g.strokeStyle = "#3d6a8a"; g.lineWidth = 8; g.beginPath(); g.moveTo(50, 150); g.bezierCurveTo(100, 90, 150, 190, 206, 110); g.stroke(); xIcon(g); }),
  noCompass: () => sign("vk-nocompass", 256, 256, "#00000000", [], "#00000000", (g) => { g.fillStyle = "#f3ead2"; g.strokeStyle = INK; g.lineWidth = 12; g.beginPath(); g.arc(128, 128, 84, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#c8413a"; g.beginPath(); g.moveTo(128, 60); g.lineTo(146, 128); g.lineTo(110, 128); g.fill(); g.fillStyle = "#3a3540"; g.beginPath(); g.moveTo(128, 196); g.lineTo(146, 128); g.lineTo(110, 128); g.fill(); xIcon(g); }),
  num: (n: string) => sign(`vk-num${n}`, 200, 200, "#00000000", [{ t: n, size: 170, y: 104, col: "#ffe16a", font: "Poppins" }], "#00000000"),
  foot: () => sign("vk-foot", 160, 220, "#00000000", [], "#00000000", (g) => { g.fillStyle = "#7a5a34"; g.beginPath(); g.ellipse(80, 130, 42, 70, 0, 0, 7); g.fill(); for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(34 + i * 23, 44 - Math.sin(i * 0.8) * 12, 11 - i, 0, 7); g.fill(); } }),
  wind: () => sign("vk-wind", 512, 96, "#00000000", [], "#00000000", (g) => { g.strokeStyle = "#ffffff"; g.lineCap = "round"; g.lineWidth = 12; g.beginPath(); g.moveTo(20, 60); g.bezierCurveTo(160, 20, 300, 80, 420, 40); g.bezierCurveTo(470, 24, 492, 50, 470, 66); g.stroke(); }),
  q: () => sign("vk-q", 128, 160, "#00000000", [{ t: "?", size: 150, y: 84, col: "#ffffff", font: "Poppins" }], "#00000000"),
  bang: () => sign("vk-bang", 128, 160, "#00000000", [{ t: "!", size: 150, y: 84, col: "#ffe16a", font: "Poppins" }], "#00000000"),
  steam: () => sign("vk-steam", 128, 200, "#00000000", [], "#00000000", (g) => { g.strokeStyle = "#ffffff"; g.lineWidth = 12; g.lineCap = "round"; for (const x of [40, 88]) { g.beginPath(); g.moveTo(x, 180); g.bezierCurveTo(x - 30, 130, x + 30, 90, x, 30); g.stroke(); } }),
};

// ---------------------------------------------------------------- one water set, many shores
type Kind = "harbour" | "fog" | "forest" | "flat" | "rocky" | "greenland";
const water = (kind: Kind, setName: string, extra?: (g: THREE.Group, r: () => number) => ((f: number) => void) | void): SetDef => {
  const shore = kind === "fog" ? undefined : kind === "greenland" ? dirt("#cfd9e0", [40, 20]) : kind === "rocky" ? dirt("#8f8a86", [40, 20]) : kind === "harbour" ? grass("#7a9a58", [40, 20]) : dirt("#e2cf9a", [40, 20]);
  const { g, water: tex } = sea({ water: kind === "fog" ? "#5f7f92" : kind === "greenland" ? "#2f8fb8" : "#2a84c0", shore, shoreZ: SHORE });
  const r = rng(kind.length * 13 + 5);
  const ship = P.longship(); g.add(ship);
  if (kind === "forest" || kind === "flat") {
    g.add(put(new THREE.Mesh(new THREE.PlaneGeometry(260, 100).rotateX(-Math.PI / 2), P.lit(grass(kind === "forest" ? "#5f9a48" : "#8ab060", [40, 16]))), 0, 0.09, -SHORE - 55));
    for (let i = 0; i < (kind === "forest" ? 46 : 16); i++) g.add(put(P.pine(4 + r() * 3.5, kind === "forest" ? "#2f6a4a" : "#4a8a5a", i), -30 + r() * 60, 0.09, -SHORE - 4.5 - r() * (kind === "forest" ? 22 : 30)));
    for (let i = 0; i < 6; i++) g.add(put(P.hill(18 + (i % 3) * 8, i % 2 ? "#5f9a48" : "#4f8a48", 0.3 + (i % 2) * 0.12), -60 + i * 24, 0, -SHORE - 46 - (i % 3) * 8));
    for (let i = 0; i < 7; i++) g.add(put(P.rock(0.35 + r() * 0.45, "#a8a096", i), (i % 2 ? -1 : 1) * (5.5 + r() * 9), 0.06, -SHORE - 0.8 - r() * 2.6));
    for (let i = 0; i < 8; i++) g.add(put(P.bush(0.6 + r() * 0.5, "#4f8a48", i), -16 + r() * 32, 0.09, -SHORE - 5.2 - r() * 1.5));
  }
  if (kind === "rocky") {
    for (let i = 0; i < 26; i++) g.add(put(P.rock(0.6 + r() * 1.6, i % 3 ? "#8a8590" : "#6f6a78", i), -30 + r() * 60, 0.06, -SHORE - 2.5 - r() * 16));
    for (let i = 0; i < 6; i++) g.add(put(P.glacier(10, 9 + r() * 6, i + 20, ["#7f7a88", "#959099", "#8a8590", "#e6eef2"]), -40 + i * 16, 0, -SHORE - 22 - r() * 6)); // grey mountains, a little snow
  }
  if (kind === "greenland") {
    for (let i = 0; i < 5; i++) g.add(put(P.glacier(14, 7 + r() * 5, i + 3), -34 + i * 17, 0, -SHORE - 17 - r() * 5));
    for (let i = 0; i < 5; i++) g.add(put(P.iceberg(1.2 + r() * 1.6, i), -18 + i * 8 + r() * 3, 0, 4 + r() * 7));
    for (let i = 0; i < 6; i++) g.add(put(P.rock(0.3 + r() * 0.5, "#9aa4ac", i), (i % 2 ? -1 : 1) * (6 + r() * 7), 0.06, -SHORE - 0.8 - r() * 3));
  }
  const tick = extra?.(g, r);
  return { root: g, tick: (f) => {
    const p = shipPose(setName, f); ship.position.set(p.x, p.y, 0); ship.rotation.set(p.roll, p.yaw, p.pitch);
    tex.offset.set((f * 0.0016) % 1, (f * 0.0009) % 1);
    if (tick) tick(f);
  } };
};

export const hook = (): SetDef => water("forest", "hook");
export const fog = (): SetDef => water("fog", "fog");
export const coast1 = (): SetDef => water("forest", "coast1");
export const coast2 = (): SetDef => water("flat", "coast2");
export const coast3 = (): SetDef => water("rocky", "coast3");

/** home: a turf longhouse by the water, a dock out to the ship, fish drying, and the note on the door */
export const HOUSE: V3 = [-2.6, 0.06, -SHORE - 4.2];
export const harbour = (): SetDef => water("harbour", "harbour", (g) => {
  const forSale = put(P.poster(1.5, 1.0, TEX.forSale()), 1.7, 0.05, 1.12);
  dress(g, [
    [P.longhouse(5.2), HOUSE],
    [P.poster(1.25, 0.82, TEX.moved(), -0.05), [HOUSE[0] + 0.55, 0.62, HOUSE[2] + 1.5]],
    [P.longhouse(4, "#7a5a3c", "#6f9a50"), [5.4, 0.06, -SHORE - 7], -0.3],
    [P.fishRack(), [1.2, 0.06, -SHORE - 2.6], 0.2],
    [P.fishRack(), [3.4, 0.06, -SHORE - 3.4], -0.1],
    [P.barrel(0.8), [-5.4, 0.06, -SHORE - 2.4]],
    [P.crate(0.6, "FISH"), [-6.1, 0.06, -SHORE - 2.0], 0.3],
    [P.sack(0.6), [0.2, 0.06, -SHORE - 1.6], 0.4],
    [P.box(0.09, 2.0, 0.09, "#6b4a2d"), [2.6, 0.06, -SHORE - 1.2]],
    [P.poster(1.5, 0.54, TEX.arrow(), 0.06), [2.6, 1.6, -SHORE - 1.14]],
    [P.rock(0.4, "#8a8590", 2), [-6.5, 0.06, -SHORE - 0.9]],
    [P.rock(0.3, "#8a8590", 5), [6.6, 0.06, -SHORE - 1.0]],
    [P.bush(0.7, "#5f8a48", 3), [-5.6, 0.06, -SHORE - 5]],
    [P.pine(5, "#3f7a52", 2), [-7.5, 0.06, -SHORE - 8]],
    [P.pine(6, "#3f7a52", 7), [8.5, 0.06, -SHORE - 10]],
    [P.pine(4.5, "#3f7a52", 9), [1.4, 0.06, -SHORE - 12]],
    [P.campfire(), [-0.4, 0.06, -SHORE - 3.4]],
  ]);
  const d = P.dock(SHORE - 1.0, 1.5); d.rotation.y = Math.PI / 2; d.position.set(-0.6, -0.1, -(SHORE + 1.2) / 2 - 0.2); g.add(d);
  for (let i = 0; i < 5; i++) g.add(put(P.hill(16 + (i % 3) * 7, i % 2 ? "#6f9a58" : "#5f8a50", 0.3), -50 + i * 25, 0, -SHORE - 40));
  g.add(forSale);
  return (f: number) => { forSale.visible = f >= TIMES.sale; };
});

/** Greenland: ice behind, bergs in the bay, and Dad's house right on the beach */
export const DAD_HOUSE: V3 = [1.2, 0.06, -SHORE - 2.6];
export const greenland = (): SetDef => water("greenland", "greenland", (g) => {
  dress(g, [
    [P.longhouse(4.6, "#7a6a5a", "#7f9a70"), DAD_HOUSE],
    [P.poster(0.9, 0.32, TEX.dads()), [DAD_HOUSE[0] - 0.9, 1.62, DAD_HOUSE[2] + 1.46]],
    [P.fishRack(), [-3.4, 0.06, -SHORE - 2.2], 0.3],
    [P.barrel(0.7), [4.3, 0.06, -SHORE - 1.6]],
    [P.crate(0.55, "SOUP"), [4.9, 0.06, -SHORE - 1.2], 0.4],
    [P.campfire(), [-1.3, 0.06, -SHORE - 1.3]],
    [P.table(1.1, 0.7, 0.6), [-0.3, 0.06, -SHORE - 0.9]],
    [P.mug("#c9a06a"), [-0.5, 0.66, -SHORE - 0.9]],
    [P.cyl(0.16, 0.1, 0.1, "#8a6a4a", 10), [-0.1, 0.66, -SHORE - 0.85]],
    [P.sack(0.5), [-4.6, 0.06, -SHORE - 1.4]],
  ]);
});
/** the landing: Leif's camp on the forest shore, with the first houses going up */
export const vinland = (): SetDef => water("forest", "harbour", (g) => {
  dress(g, [
    [P.longhouse(3.6, "#9a7a52", "#5f9a48"), [3.4, 0.09, -SHORE - 5.2], -0.2],
    [P.campfire(), [1.6, 0.06, -SHORE - 3.5]],
    [P.box(0.09, 1.9, 0.09, "#6b4a2d"), [-1.6, 0.06, -SHORE - 2.6]],
    [P.poster(1.5, 0.54, TEX.vinland(), -0.04), [-1.6, 1.5, -SHORE - 2.54]],
    [P.crate(0.55, "GRAPES"), [1.9, 0.06, -SHORE - 1.4], 0.3],
    [P.barrel(0.7), [2.5, 0.06, -SHORE - 1.9]],
    [P.sack(0.5), [3.2, 0.06, -SHORE - 1.3]],
  ]);
});
