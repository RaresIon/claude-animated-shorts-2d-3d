// Lint fixtures: one tiny film staged WRONG on purpose (`bad`) and the same film framed with fit() (`good`).
// scripts/lint_test.ts runs plan_lint on both and checks that every planted defect is reported for `bad` and that
// `good` passes. If a change to the lint stops it seeing one of these, the test fails.
import * as THREE from "three";
import { CastItem, Film, SetDef, Shot } from "../../stage/Stage";
import * as P from "../../stage/props";
import { field } from "../../stage/sets";
import { sign } from "../../stage/paint";
import { Look, Pose } from "../../stage/chars";
import { Cam, shake, track } from "../../stage/camera";
import { fit } from "../../stage/frame";
import { V3 } from "../../stage/util";

const NOTICE = () => sign("fx-notice", 640, 300, "#f3ead2", [{ t: "NOTICE", size: 110, y: 100, col: "#b9302a" }, { t: "READ ME", size: 60, y: 230, col: "#3a2414" }], "#6b4a2d");
const BOARD: V3 = [0, 1.2, -3], POST: V3 = [1.2, 0, 2.4];
const yard = (withPosts: boolean) => (): SetDef => ({ root: P.dress(field(), [[P.poster(1.6, 0.75, NOTICE()), BOARD], [P.box(0.1, 1.3, 0.1, "#6b4a2d"), [0, 0, -3.02]], [P.hut(3), [-4, 0, -8]], ...(withPosts ? [[P.box(0.5, 3, 0.5, "#6b4a2d"), POST], [P.box(0.5, 5, 0.5, "#6b4a2d"), [0.25, 0, 15.5]],
  // two slabs of different colours with their tops in one plane: they will flicker
  [P.box(1, 0.3, 1, "#b9483c"), [3, 0, -1]], [P.box(1, 0.3, 1, "#3d6a8a"), [3.4, 0, -1.2]]] as [THREE.Object3D, V3][] : []),
  [P.hero(P.crate(0.7, "PRIZE"), "prize"), [1.9, 0, 0.4]]]) });
const A: Look = { coat: "#3d6a8a", hat: "kepi" }, B: Look = { coat: "#b9483c", hat: "straw" };
const person = (id: string, look: Look, at: V3, pose: Pose): CastItem => ({ kind: "person", id, look, at, h: 1.7, pose });
// words: five sentences of 2 s each, 60 frames per shot
const words = ["One", "two", "three", "four", "five", "six", "seven."].flatMap((w, k) => [0, 1, 2, 3, 4].map((s) => ({ w, s: 0.2 + s * 1.96 + k * 0.27, e: 0.2 + s * 1.96 + k * 0.27 + 0.2 })));
words.sort((a, b) => a.s - b.s);
const pop = (f: number, a: number): Pose => (f >= a ? { eyes: "wide", mouth: "open", rh: [0.9, -0.8] } : { eyes: "lid", mouth: "dash" });
const two = (f: number, a: number): CastItem[] => [person("ann", A, [-0.6, 0, 0], a ? pop(f, a + 20) : { eyes: "wide", mouth: "open", rh: [0.9, -0.8 + 0.3 * Math.round(Math.sin(f * 0.8))] }), person("bob", B, [0.6, 0, 0], pop(f, a + 40))];
const bad: Shot[] = [
  // 1. the hook is fine
  { a: 0, b: 60, set: "yard", mood: "day", cast: (f) => two(f, 0), cam: (f) => track(f, [{ f: 0, cam: { pos: [1.5, 0.3, 5.0], look: [0, 1.2, 0], fov: 44, roll: 0.06 } }, { f: 1, cam: { pos: [0.4, 0.3, 5.6], look: [0, 1.2, 0], fov: 44, roll: 0.06 }, dur: 20 }, { f: 40, cam: { pos: [-0.5, 0.3, 5.2], look: [0, 1.2, 0], fov: 44, roll: 0.06 }, dur: 1 }]) }, // and a one-frame jump at f40
  // 2. too close: both heads are cut by the left and right edges
  { a: 60, b: 120, set: "yard", mood: "day", into: "move", cast: (f) => two(f, 60), cam: () => ({ pos: [0, 1.3, 3.0], look: [0, 1.25, 0], fov: 40, roll: 0.06 }) },
  // 3. bob stands right behind ann; and the sign is cut in half by the edge
  { a: 120, b: 170, set: "yard", mood: "golden", into: "dissolve", cast: (f) => [person("ann", A, [-0.6, 0, 0.6], pop(f, 140)), person("bob", B, [-0.56, 0, -0.4], pop(f, 160))], cam: () => ({ pos: [-1.0, 1.4, 4.8], look: [-1.0, 1.2, 0], fov: 40, roll: 0.08 }) },
  // 4. ann stands behind a post; nobody moves for the whole sentence
  { a: 170, b: 240, set: "yard", mood: "golden", into: "move", cast: () => [person("ann", A, [1.2, 0, 0], { eyes: "lid" }), person("bob", B, [0.2, 0, 0], { eyes: "lid" })], cam: () => ({ pos: [1.2, 1.3, 5.2], look: [0.7, 1.2, 0], fov: 44, roll: 0.02 }) },
  // 5. a post right in front of the lens, a camera shake with no sound cue, and an ending where the cast is tiny
  { a: 240, b: 300, set: "yard", mood: "dusk", into: "dissolve", cast: (f) => two(f, 240), cam: (f): Cam => shake({ pos: [0, 3, 16], look: [0, 1, 0], fov: 40, roll: 0.06 }, f, 262, 0.15) },
];
const ok = (cast: (f: number) => CastItem[], yaw: number, pitch: number, extra: V3[] = [], prize: V3[] = []) => (f: number): Cam => { const c = fit([...cast(0), ...extra.map((at) => ({ at, w: 1.6, h: 0.75 })), ...prize.map((at) => ({ at, w: 0.8, h: 0.8 }))], { yaw, pitch, roll: 0.06, fill: extra.length ? 0.94 : 0.82 }); return { ...c, pos: [c.pos[0] + Math.max(0, 15 - f) * 0.03, c.pos[1], c.pos[2]] }; };
const good: Shot[] = [
  { ...bad[0], cam: ok((f) => two(f, 0), 12, 4) },
  { ...bad[1], cam: ok((f) => two(f, 60), -15, -14) },
  { ...bad[2], cast: (f) => [person("ann", A, [-0.9, 0, 0.6], pop(f, 140)), person("bob", B, [1.0, 0, -0.2], pop(f, 160))], cam: ok(() => [person("ann", A, [-0.9, 0, 0.6], {}), person("bob", B, [1.0, 0, -0.2], {})], 0, 2, [[BOARD[0], BOARD[1] + 0.375, BOARD[2]]]) },
  { ...bad[3], cast: (f) => [person("ann", A, [1.2, 0, 0], pop(f, 200)), person("bob", B, [0.2, 0, 0], pop(f, 220))], cam: ok(() => [person("ann", A, [1.2, 0, 0], {}), person("bob", B, [0.2, 0, 0], {})], 20, 26) },
  { ...bad[4], cam: (f) => shake(ok((g) => two(g, 240), -10, 3)(f), f, 262, 0.15) },
];
// the good film does not feature the prize crate, and says so: a waiver is written down, never silent
export const film: Film = { total: 300, sets: { yard: yard(process.env.LINT_FIXTURE !== "good") }, shots: process.env.LINT_FIXTURE === "good" ? good.map((s) => ({ ...s, allow: ["prize", "PRIZE"] })) : bad, words };
