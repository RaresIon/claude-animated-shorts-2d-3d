// Kit regression film: nine single-frame shots that between them show every base set, every light mood, every hat,
// the main held props and a spread of the prop library. scripts/kit_test.py renders them and compares them with the
// stored pictures in test/golden/, so a change to a prop, a character or a mood cannot quietly alter older films.
// It is a test card, not a short: plan_lint is not run on it.
import * as THREE from "three";
import { CastItem, Film, SetDef, Shot } from "../../stage/Stage";
import * as P from "../../stage/props";
import { field, room, sea, street, tunnel } from "../../stage/sets";
import { dirt, plaster, sand, sign } from "../../stage/paint";
import { Hat, Held, Look, Pose, Rat } from "../../stage/chars";
import { fit } from "../../stage/frame";
import { MoodName } from "../../stage/moods";
import { V3 } from "../../stage/util";

const { dress } = P;
const T = { board: () => sign("kit-board", 640, 300, "#f3ead2", [{ t: "KIT TEST", size: 110, y: 100, col: "#b9302a" }, { t: "DO NOT ADJUST", size: 54, y: 230, col: "#3a2414" }], "#6b4a2d"), bang: () => sign("kit-bang", 128, 160, "#00000000", [{ t: "!", size: 150, y: 84, col: "#ffe16a", font: "Poppins" }], "#00000000") };
const sets: Record<string, () => SetDef> = {
  office: () => ({ root: dress(room({ w: 8, d: 7 }), [[P.desk(), [0, 0, -1.2]], [P.chair(), [0.2, 0, -2.2]], [P.shelf(1.6, 2.1, 3), [-2.9, 0, -3.2]], [P.rug(), [0, 0.01, 0.6]], [P.framed(1.5, 0.7, T.board()), [1.6, 2.0, -3.44]], [P.lampHang(), [0, 4, -1.0]], [P.windowLit(), [-0.6, 1.4, -3.46]],
    [P.papers(5, 2), [-0.5, 0.82, -1.2]], [P.book(), [0.5, 0.82, -1.1]], [P.inkwell(), [0.8, 0.82, -1.3]], [P.stamp(), [-0.1, 0.82, -1.0]], [P.coinStack(6, 0.07, 2), [0.2, 0.82, -1.4]], [P.scales(), [-0.85, 0.82, -1.35]], [P.bell(), [0.95, 0.82, -1.0]], [P.mug(), [0.65, 0.82, -1.45]], [P.candle(), [-0.3, 0.82, -1.5]], [P.potPlant(), [3.2, 0, -2.8]], [P.crate(0.7, "KIT"), [2.6, 0, -0.6], 0.4], [P.sack(), [-2.6, 0, -0.4]], [P.basket(), [2.1, 0, 0.4]], [P.cage(), [-2.2, 0, 0.7]], [P.table(), [2.9, 0, 1.2]]]) }),
  town: () => ({ root: dress(street({ len: 40 }), [[P.facade(5.2, 2, plaster("#e8c35a", [2, 2]), { shutters: "#3d6a5a", door: "#3d6a5a", balcony: true, shop: "CAFE" }), [-3.2, 0.16, -4.2]], [P.facade(4.6, 3, plaster("#e9d9b0", [2, 3]), { shutters: "#7a3a34", door: "#7a3a34", roof: "#8a4a3a" }), [1.8, 0.16, -4.2]], [P.streetLamp(3.4, true), [-0.6, 0.16, -2.4]], [P.bunting(7), [-1, 3.6, -3.9]], [P.flagPole(), [3.4, 0.16, -2.6]], [P.cart(), [2.4, 0, -0.6], 0.5], [P.manhole(0.55, true), [-1.6, 0.01, 0.6]], [P.barrel(), [-3.3, 0.16, -2.6]], [P.awning(), [1.6, 2.7, -4.1]], [P.palm(4.5, 2), [4.6, 0.16, -3.0]], [P.lantern(), [-2.6, 2.4, -4.0]]]) }),
  sewer: () => { const { g, r } = tunnel({ len: 30 }); return { root: dress(g, [[P.pipe(9, 0.2), [-3, 1.9, -r + 0.55]], [P.grate(), [0.8, 0.6, -r + 0.35]], [P.lantern(), [-1.6, 2.0, -r + 0.6]], [P.crate(0.5), [2.4, 0, -r * 0.71]]]) }; },
  farm: () => ({ root: dress(field({ ground: dirt("#c49a5a", [40, 40]) }), [[P.hut(3.2), [-2.4, 0, -7], 0.2], [P.fence(5.6), [0.5, 0, -3.4]], [P.haystack(), [3.2, 0, -5.4]], [P.trough(), [1.2, 0, -2.2]], [P.tree(4.5, "#5f9a48", 3), [5.4, 0, -8]], [P.bush(0.8, "#5f9a48", 2), [-4.4, 0, -4.2]], [P.rock(0.6), [-1.6, 0, -1.6]], [P.pine(5, "#2f6a4a", 4), [-6.2, 0, -9]], [P.campfire(), [-0.6, 0, -1.2]]]) }),
  coast: () => { const { g } = sea({ shore: sand("#e6d3a0", [60, 30]), shoreZ: 7 }); return { root: dress(g, [[P.longship(), [0, 0, 0]], [P.glacier(12, 8, 3), [-9, 0, -22]], [P.iceberg(2, 2), [6, 0, 5]], [P.longhouse(4.6), [3.2, 0.06, -10.5]], [P.dock(5, 1.5), [-5, 0, -5.5]], [P.fishRack(), [-2.6, 0.06, -9.2]], [P.pine(6, "#3f7a52", 2), [7.5, 0.06, -13]]]) }; },
  void: () => ({ root: dress(new THREE.Group().add(new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), P.lit(dirt("#6a5a9a", [12, 12])))), [[P.lightPool(4, 3, "#fff0c0", 0.5), [0, 0.02, 0]]]) }),
};
const HATS: Hat[] = ["none", "nonla", "pith", "kepi", "topper", "bandana", "straw", "hair", "helmet", "hood", "fur"];
const HELD: Held[] = ["bowl", "ladle", "coin", "tail", "rat", "lantern", "sack", "stamp", "paper", "magnifier", "net", "scissors", "tails", "bucket"];
const COATS = ["#3d6a8a", "#b9483c", "#5a7a4a", "#8a5a8a", "#c9a03a", "#6b4a2d"];
const look = (i: number): Look => ({ coat: COATS[i % 6], hat: HATS[i % 11], hatCol: COATS[(i + 2) % 6], band: "#f3ead2", beard: i % 3 === 0 ? "#c9762e" : undefined, moustache: i % 4 === 1, monocle: i % 5 === 2, glasses: i % 7 === 3, stout: i % 2 === 0, apron: i % 6 === 4 ? "#d9c48a" : undefined, buttons: i % 3 === 1 ? "#f2c230" : undefined, sash: i % 5 === 0 ? "#c8413a" : undefined });
const EYES = ["lid", "dot", "wide", "happy", "squeeze", "angry", "side", "spiral"] as const, MOUTHS = ["dash", "smirk", "smile", "grin", "open", "o", "frown", "wave", "teeth"] as const;
const pose = (i: number): Pose => ({ eyes: EYES[i % 8], mouth: MOUTHS[i % 9], brow: (i % 3) - 1, face: i % 2 ? 0.6 : -0.6, rh: [0.9, -0.8 + (i % 4) * 0.5], lh: [-0.6, 0.9 - (i % 3) * 0.6], held: HELD[i % 14], heldL: i % 4 === 0 ? HELD[(i + 5) % 14] : undefined, lean: ((i % 3) - 1) * 0.06, squash: 1 + ((i % 3) - 1) * 0.05, sweat: i % 5 === 1, tilt: ((i % 4) - 1.5) * 0.05, blink: i % 6 === 5, view: i % 5 === 4 ? "side" : "front", walk: i % 5 === 4 ? 1.1 : undefined });
const row = (n: number, i0: number, at: (k: number) => V3): CastItem[] => Array.from({ length: n }, (_, k) => ({ kind: "person" as const, id: `p${k}`, look: look(i0 + k), pose: pose(i0 + k), at: at(k), h: 1.6 + (k % 2) * 0.1 }));
const rat = (id: string, at: V3, r: Rat, s = 1): CastItem => ({ kind: "rat", id, rat: r, at, s });
const shot = (k: number, set: string, mood: MoodName, cast: CastItem[], yaw = 0, pitch = 6, roll = 0.05): Shot => ({ a: k, b: k + 1, set, mood, into: "cut", cast: () => cast, cam: () => fit(cast, { yaw, pitch, roll, fill: 0.8 }) });
const shots: Shot[] = [
  shot(0, "office", "interior", row(3, 0, (k) => [-1 + k, 0, 0.6])),
  shot(1, "town", "day", [...row(3, 3, (k) => [-1 + k, 0, 0.2]), rat("r0", [-1.8, 0, 1.0], { mood: "smug" }), rat("r1", [1.9, 0, 1.1], { bandage: true, mood: "scared" })], 15, 2, -0.06),
  shot(2, "sewer", "sewer", [...row(2, 6, (k) => [-0.5 + k, 0, -2.3]), rat("r0", [-1.4, 0, -2.2], { mood: "happy", coinTail: true }, 1.6), rat("r1", [1.7, 0, -2.3], { baby: true }), rat("r2", [2.1, 0, -2.2], { dead: true })], -10, 4),
  shot(3, "farm", "golden", row(3, 8, (k) => [-1 + k, 0, 0]), 25, 14, 0.08),
  shot(4, "coast", "arctic", row(3, 11, (k) => [0.4 + k * 0.8, P.LONGSHIP_DECK, 0.1]), 70, 12, -0.07),
  shot(5, "town", "night", row(2, 14, (k) => [-0.5 + k, 0, 0]), -20, -8),
  shot(6, "farm", "dusk", [...row(2, 16, (k) => [-0.5 + k, 0, 0]), { kind: "card", id: "bang", tex: T.bang(), at: [0, 2.2, 0], w: 0.4, h: 0.5 }], 0, 0, 0.1),
  shot(7, "void", "explain", row(4, 18, (k) => [-1.2 + k * 0.8, 0, (k % 2) * -0.8]), 10, 24),
  shot(8, "coast", "fog", row(2, 22, (k) => [0.6 + k, P.LONGSHIP_DECK, 0]), -60, 5, 0.06),
];
export const film: Film = { total: shots.length, sets, shots, words: [{ w: "test.", s: 0, e: 0.2 }], captions: false };
