// Deterministic staging lint: checks a film's shot list WITHOUT rendering a frame.
//   npx tsx scripts/plan_lint.ts <film> [--need-cues]
// It builds every set in node, plays the film at two-frame steps through the engine's own camera code
// (src/stage/frame.ts) and reports, with frame ranges:
//   edit      hard cuts, shot coverage, moods, angle and size variety, the hook, caption length, pace
//   edges     heads, bodies, effect cards and lettered signs cut by the frame edge
//   hidden    a face behind another character or behind a prop; a sign behind a character or under the caption;
//             something right in front of the lens; a camera under the ground
//   signs     lettering that is never big enough, whole and clear for long enough to be read
//   beats     a sentence with no pose change, card, camera burst or new shot; impacts without a sound cue
//   ending    the last half second must hold its subjects whole
// A defect must last a third of a second to count (a figure crossing the edge during a camera burst is fine).
// Deliberate exceptions are declared in the film, never silently: `crop: true` on a cast item, `allow: [...]` on a
// shot. Exit code 1 on any FAIL. Also writes audio/<film>/warp.json and plan.json for the sound and frame gates.
import * as THREE from "three";
import fs from "node:fs";
import type { Film, CastItem, SetDef } from "../src/stage/Stage";
import { chunk } from "../src/stage/Captions";
import { MOVE_IN, Screen, aim, cardQuad, cover, onScreen, personQuads, shotCam } from "../src/stage/frame";

const name = process.argv[2] ?? "rat-tails", needCues = process.argv.includes("--need-cues");
const stage = await import("../src/stage/Stage"); // for clock, unwarp, warpTo (no DOM is touched at import)
const { film } = (await import(`../src/videos/${name}/film.ts`)) as { film: Film };
const real = (f: number) => stage.warpTo(film.warp, f);
const cam = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 400), ray = new THREE.Raycaster();
let fails = 0, warns = 0, waived = 0;
const say = (lvl: "FAIL" | "warn", s: string) => { lvl === "FAIL" ? fails++ : warns++; console.log(`  ${lvl}: ${s}`); };
const STEP = 2, HOLD = 10, FPS = 30; // sample every 2 frames; a defect counts when it lasts 10 frames

const moods = new Set(film.shots.map((s) => s.mood));
console.log(`${name}: ${film.total} frames (${(film.total / FPS).toFixed(1)} s), ${film.shots.length} shots, moods: ${[...moods].join(", ")}`);
const short = film.total < 20 * FPS; // a 10-second piece cannot carry three moods, an insert and a wide
if (moods.size < (short ? 1 : 3)) say("FAIL", `only ${moods.size} light mood(s); the story needs at least 3`);
const per45 = film.shots.length / (film.total / FPS / 45);
if (per45 > 16 && !short) say("FAIL", `${per45.toFixed(0)} shots per 45 s: too choppy (aim for 10-14)`);
// --- edit grammar (three full reference videos: 0 hard cuts, 6-12 frame dissolves or continuous camera travel)
const cuts = film.shots.slice(1).filter((s) => !s.into || s.into === "cut" || s.into === "whip").length;
if (cuts) say("FAIL", `${cuts} shot(s) entered by a plain cut or whip: use into "dissolve" (new place or time) or "move" (same place)`);
film.shots.forEach((s, i) => { if (s.into === "move" && film.shots[i - 1].set !== s.set) say("FAIL", `shot ${i + 1}: "move" needs the same set as the shot before`); });
if (film.shots.filter((s) => s.into === "flash" || s.into === "dip").length > 2) say("FAIL", "more than two flash/dip transitions");
// --- angle and size variety
const pitch = (c: { pos: number[]; look: number[] }) => (Math.atan2(c.look[1] - c.pos[1], Math.hypot(c.look[0] - c.pos[0], c.look[2] - c.pos[2])) * 180) / Math.PI;
const angles = new Set<string>(); let tilted = 0;
for (const s of film.shots) for (const u of [0.1, 0.5, 0.9]) { const c = s.cam(s.a + u * (s.b - s.a)), p = pitch(c); angles.add(p > 8 ? "low" : p < -20 ? "high" : "eye"); if (Math.abs(c.roll ?? 0) > 0.045) tilted++; }
console.log(`angles used: ${[...angles].join(", ")}; tilted framings ${tilted}/${film.shots.length * 3}`);
if (angles.size < (short ? 2 : 3)) say("FAIL", `only ${[...angles].join("/")} camera angles: use low, eye-level and high`);
if (tilted < film.shots.length * 3 * 0.25) say("FAIL", "fewer than a quarter of the framings are tilted (dutch 3-15 degrees)");
if (!short && !film.shots.some((s) => s.tag === "insert")) say("FAIL", "no insert shot (a prop, a hand, a face filling the frame)");
if (!short && !film.shots.some((s) => s.tag === "wide")) say("FAIL", "no far wide shot (character under 15 % of the frame) for scale");
// --- hook: frame 0 is already the action and the camera is already moving
{ const s = film.shots[0], c0 = s.cam(0), c1 = s.cam(15), k = (f: number) => JSON.stringify((s.cast?.(f) ?? []).map((x) => (x.kind === "person" ? [x.pose.rh, x.pose.lh, x.pose.held, x.pose.mouth] : x.at)));
  if (Math.hypot(c1.pos[0] - c0.pos[0], c1.pos[1] - c0.pos[1], c1.pos[2] - c0.pos[2]) < 0.2) say("FAIL", "hook: the camera is not moving in the first half second");
  if (k(0) === k(10)) say("FAIL", "hook: nothing is happening in the first ten frames"); }
// --- captions and pace
const chunks = chunk(film.words);
{ const n3 = chunks.filter((c) => c.t.split(" ").length > 2).length, dur = film.words[film.words.length - 1].e - film.words[0].s, wps = film.words.length / dur;
  console.log(`captions: ${chunks.length} chunks, ${n3} longer than 2 words; narration ${wps.toFixed(2)} words/s`);
  if (n3 > chunks.length * 0.1) say("FAIL", "more than 10 % of captions are longer than 2 words");
  if (wps < 3.3 || wps > 4.1) say("FAIL", `narration pace ${wps.toFixed(2)} words/s is outside 3.3-4.1`); }
const captionAt = (f: number) => { const t = (real(f) + 0.5) / FPS; return chunks.find((k) => t >= k.s && t < k.e); };
/** the caption's box in NDC (centre at 70 % of the height, about 12 % of the width per 2 characters) */
const capBox = (text: string) => { const w = Math.min(0.9, 0.09 + text.length * 0.066); return [-w, -0.4 - 0.05, w, -0.4 + 0.05]; };
// --- files for the other gates: the time warp (audio/make.py maps its cue frames through it) and the shot plan
fs.mkdirSync(new URL(`../audio/${name}/`, import.meta.url), { recursive: true });
fs.writeFileSync(new URL(`../audio/${name}/warp.json`, import.meta.url), JSON.stringify(film.warp ?? { from: [0, film.total], to: [0, film.total] }));
fs.writeFileSync(new URL(`../audio/${name}/plan.json`, import.meta.url), JSON.stringify({ fps: FPS, total: Math.round(real(film.total)), shots: film.shots.map((s) => ({ a: Math.round(real(s.a)), b: Math.round(real(s.b)), set: s.set, mood: s.mood, tag: s.tag ?? null })) }));
if (film.shots[0].a !== 0 || film.shots[film.shots.length - 1].b !== film.total) say("FAIL", "shots do not cover the film from frame 0 to the end");

// ---------------------------------------------------------------- the sets, built once in node
type Sign = { o: THREE.Object3D; id: string; w: number; h: number; texH: number; lines: { t: string; size: number }[] };
type Built = { def: SetDef; signs: Sign[]; solids: THREE.Mesh[]; heroes: { o: THREE.Object3D; id: string }[] };
const built = new Map<string, Built>();
const shown = (o: THREE.Object3D | null) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
const setOf = (n: string): Built => {
  let b = built.get(n);
  if (!b) {
    const def = film.sets[n](), signs: Sign[] = [], solids: THREE.Mesh[] = [], heroes: Built["heroes"] = [];
    def.root.traverse((o) => {
      const s = o.userData.sign as Omit<Sign, "o" | "id"> | undefined;
      if (s) signs.push({ o, id: s.lines[0].t, ...s });
      if (o.userData.hero) heroes.push({ o, id: String(o.userData.hero) });
      const m = o as THREE.Mesh, mat = m.material as THREE.Material | undefined;
      if (m.isMesh && mat && !mat.transparent && mat.side !== THREE.BackSide) solids.push(m);
    });
    b = { def, signs, solids, heroes }; built.set(n, b);
    def.tick?.(0); def.root.updateMatrixWorld(true); flicker(n, solids);
  }
  return b;
};
/** Flicker: two solid flat faces in the same plane, facing the same way and overlapping, fight for every pixel and
 *  the winner changes from frame to frame. (Cards are safe: props.card() carries a polygon offset.) Checked once per
 *  set on boxes and planes, which is what floors, walls, table tops and stacked crates are made of. */
type Face = { m: THREE.Mesh; n: THREE.Vector3; c: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3; hu: number; hv: number };
const flicker = (setName: string, solids: THREE.Mesh[]) => {
  const faces: Face[] = [];
  for (const m of solids) {
    const g = m.geometry; if (g.type !== "BoxGeometry" && g.type !== "PlaneGeometry") continue;
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox!, size = bb.getSize(new THREE.Vector3()), mid = bb.getCenter(new THREE.Vector3()), nm = new THREE.Matrix3().getNormalMatrix(m.matrixWorld);
    const ax = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)], S = [size.x, size.y, size.z];
    const sc = new THREE.Vector3().setFromMatrixScale(m.matrixWorld), SC = [sc.x, sc.y, sc.z];
    const flat = S.findIndex((x) => x < 1e-6); // a plane has one zero-thickness axis
    for (let k = 0; k < 3; k++) for (const sgn of [1, -1]) {
      if (flat >= 0 && k !== flat) continue;
      if (flat >= 0) { const na = g.getAttribute("normal"); if (Math.sign(na.getComponent(0, k)) !== sgn && (m.material as THREE.Material).side !== THREE.DoubleSide) continue; }
      const a = (k + 1) % 3, b2 = (k + 2) % 3;
      const c = mid.clone().addScaledVector(ax[k], (sgn * S[k]) / 2).applyMatrix4(m.matrixWorld);
      faces.push({ m, n: ax[k].clone().multiplyScalar(sgn).applyMatrix3(nm).normalize(), c, u: ax[a].clone().transformDirection(m.matrixWorld), v: ax[b2].clone().transformDirection(m.matrixWorld), hu: (S[a] * SC[a]) / 2, hv: (S[b2] * SC[b2]) / 2 });
    }
  }
  const skin = (m: THREE.Mesh) => { const mt = m.material as THREE.MeshLambertMaterial; return (mt.map?.name ?? "") + "#" + (mt.color?.getHexString() ?? ""); };
  const reach = (f: Face, d: THREE.Vector3) => Math.abs(f.u.dot(d)) * f.hu + Math.abs(f.v.dot(d)) * f.hv;
  const seen = new Set<string>(); let n = 0;
  for (let i = 0; i < faces.length; i++) for (let j = i + 1; j < faces.length; j++) {
    const A = faces[i], B = faces[j]; if (A.m === B.m || A.n.dot(B.n) < 0.9995 || skin(A.m) === skin(B.m)) continue; // the same paint on both: the fight cannot be seen
    const d = B.c.clone().sub(A.c); if (Math.abs(d.dot(A.n)) > 0.0015) continue; // more than 1.5 mm apart: safe
    if (A.n.y < -0.9 && A.c.y < 0.12) continue; // undersides resting on the ground are never seen
    const ov = [A.u, A.v].map((axis) => Math.min(reach(A, axis) + reach(B, axis) - Math.abs(d.dot(axis)), 2 * reach(A, axis), 2 * reach(B, axis))); // overlap along A's two edges
    if (ov[0] < 0.04 || ov[1] < 0.04 || ov[0] * ov[1] < 0.02) continue; // under 200 cm2 of shared surface: a sliver at a joint
    const key = [A.m.id, B.m.id].join(); if (seen.has(key)) continue; seen.add(key);
    // a face pressed against a wall or the ground is never seen: something solid within 25 cm in front of it
    ray.set(A.c.clone().add(B.c).multiplyScalar(0.5).addScaledVector(A.n, 0.004), A.n); ray.near = 0; ray.far = 0.25;
    if (ray.intersectObjects(solids.filter((m) => m !== A.m && m !== B.m), false).length) continue;
    if (n++ < 6) say("FAIL", `set "${setName}": two surfaces lie in the same plane and will flicker (${(ov[0] * ov[1] * 1e4).toFixed(0)} cm2 shared), centred (${A.c.x.toFixed(2)}, ${A.c.y.toFixed(2)}, ${A.c.z.toFixed(2)}) and (${B.c.x.toFixed(2)}, ${B.c.y.toFixed(2)}, ${B.c.z.toFixed(2)}), facing (${A.n.x.toFixed(0)}, ${A.n.y.toFixed(0)}, ${A.n.z.toFixed(0)}): move one by 5 mm`);
  }
  if (n > 6) say("FAIL", `set "${setName}": ${n - 6} more pairs of surfaces in the same plane`);
};
const signQuad = (s: Sign) => [[-s.w / 2, 0], [s.w / 2, 0], [s.w / 2, s.h], [-s.w / 2, s.h]].map(([x, y]) => new THREE.Vector3(x, y, 0).applyMatrix4(s.o.matrixWorld));
/** is the straight line from the lens to `p` blocked by a solid part of the set? */
const blocked = (p: THREE.Vector3, solids: THREE.Mesh[], slack = 0.3) => {
  const d = p.clone().sub(cam.position), len = d.length(); if (len < slack + 0.1) return false;
  ray.set(cam.position, d.normalize()); ray.near = 0.05; ray.far = len - slack;
  return ray.intersectObjects(solids, false).length > 0;
};
const edgeOf = (b: number[]) => [b[0] < -1 ? "left" : "", b[2] > 1 ? "right" : "", b[3] > 1 ? "top" : "", b[1] < -1 ? "bottom" : ""].filter(Boolean).join(" and ") || "frame";

// ---------------------------------------------------------------- play the film
type Run = { id: string; msg: string; lvl: "FAIL" | "warn" | "sign"; frames: number[] };
const signIssues: { id: string; text: string; allowed: boolean }[] = []; // judged after the whole film: a sign that is read whole elsewhere may be cut later
const signSeen = new Map<string, { id: string; words: number; big: number; readable: number; bestPx: number; shots: Set<number>; small: Set<string> }>();
const lastFrames = film.total - 15;
film.shots.forEach((s, i) => {
  const len = s.b - s.a, set = setOf(s.set), allow = new Set(s.allow ?? []);
  console.log(`shot ${i + 1} [${s.a}-${s.b}] ${s.set}/${s.mood}`);
  if (i && film.shots[i - 1].b !== s.a) say("FAIL", "gap or overlap with the previous shot");
  if (len < 24) say("warn", `only ${len} frames long`);
  const runs = new Map<string, Run>();
  const flag = (f: number, type: string, id: string, msg: string, lvl: "FAIL" | "warn" | "sign" = "FAIL") => { const k = type + "|" + id; let r = runs.get(k); if (!r) runs.set(k, (r = { id, msg, lvl, frames: [] })); r.frames.push(f); r.msg = msg; };
  const keys = new Set<string>(); let best = 0, people = 0, crowd = 0;
  for (let f = s.a + (s.into === "move" && i ? MOVE_IN : 0); f < s.b; f += STEP) {
    stage.clock.real = real(f);
    const c = shotCam(film.shots, i, f), { face } = aim(cam, c), cast: CastItem[] = s.cast?.(f) ?? [];
    set.def.tick?.(f); set.def.root.updateMatrixWorld(true);
    const solids = set.solids.filter(shown), cap = captionAt(f), cb = cap ? capBox(cap.t) : null;
    if (c.pos[1] < 0.08) flag(f, "ground", "camera", "the camera is under the ground");
    // the cast
    const persons = cast.filter((k) => k.kind === "person").map((k) => { const q = personQuads(k, face); const n = q.face.clone().project(cam); return { k, body: onScreen(q.body, cam), head: onScreen(q.head, cam), torso: onScreen(q.torso, cam), facePt: q.face, fc: [n.x, n.y], hands: q.hands.map((h) => { const v = h.p.clone().project(cam); return { ...h, x: v.x, y: v.y }; }) }; });
    const inBox = (p: number[], b: number[], k = 0.85) => { const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2; return Math.abs(p[0] - cx) < ((b[2] - b[0]) / 2) * k && Math.abs(p[1] - cy) < ((b[3] - b[1]) / 2) * k; };
    const isCrowd = persons.length >= 12;
    keys.add(JSON.stringify(persons.map(({ k }) => (k.kind === "person" ? [k.pose.eyes, k.pose.mouth, k.pose.held, k.pose.heldL, k.pose.rh?.map((v) => Math.round(v * 3)), k.pose.lh?.map((v) => Math.round(v * 3))] : 0))) + cast.length);
    crowd = Math.max(crowd, cast.filter((k) => k.kind !== "person").length, isCrowd ? persons.length : 0);
    for (const p of persons) {
      people++;
      const share = (p.body.box[3] - p.body.box[1]) / 2, lvl = isCrowd ? "warn" : "FAIL", id = p.k.id;
      if (p.body.behind || share < 0.05) continue;
      if (p.body.vis > 0.3 || p.head.vis > 0.5) best = Math.max(best, share);
      if (p.k.crop) continue;
      if (p.head.vis > 0.03 && p.head.vis < 0.9) flag(f, "cut", id, `${id}'s head is cut by the ${edgeOf(p.head.box)} edge`, lvl);
      else if (p.head.vis <= 0.03 && p.body.vis >= 0.25 && (p.body.area * p.body.vis) / 4 >= 0.02) flag(f, "cut", id, `${id} is in frame without a head (${edgeOf(p.head.box)} edge)`, lvl);
      if (p.head.vis < 0.9 || share < 0.12) continue;
      const front = persons.find((o) => o !== p && o.body.dist < p.body.dist - 0.15 && !o.body.behind && (inBox(p.fc, o.head.box) || inBox(p.fc, o.torso.box))); // the middle of the face sits behind a nearer head or torso
      if (front && !isCrowd) flag(f, "hidden", id, `${id}'s face is hidden behind ${front.k.id}`);
      else if (blocked(p.facePt, solids)) flag(f, "hidden", id, `${id}'s face is behind a prop or part of the set`, lvl);
      if (cb && cover(p.head.box, cb) >= 0.3 && share > 0.2) flag(f, "cap", id, `${id}'s face is under the caption`);
      // what a hand holds, and a hand raised to act, must be in the frame and clear of the caption
      for (const h of p.hands) {
        if (!h.held && !h.raised) continue;
        const what = h.held ? `the ${h.held} ${id} is holding` : `${id}'s raised hand`;
        if (Math.abs(h.x) > (h.held ? 0.92 : 1.02) || h.y > (h.held ? 0.94 : 1.02)) flag(f, "handout", id, `${what} is outside the frame`, lvl);
        else if (cb && h.held && share > 0.2 && h.x > cb[0] && h.x < cb[2] && h.y > cb[1] - 0.03 && h.y < cb[3] + 0.03) flag(f, "handcap", id, `the caption covers ${what}`, lvl);
      }
    }
    // effect cards and lettered signs
    type Seen = { id: string; sc: Screen; centre: THREE.Vector3; lines?: { t: string; size: number }[]; texH?: number; setSign: boolean };
    const letters: Seen[] = [];
    for (const k of cast) {
      if (k.kind === "person") continue;
      const q = cardQuad(k, face), sc = onScreen(q, cam);
      if (k.kind === "card" && ((k.opacity ?? 1) < 0.5 || k.add || k.w < 0.02)) continue;
      const sg = k.kind === "card" ? (k.tex.userData.sign as { h: number; lines: { t: string; size: number }[] } | undefined) : undefined;
      // a swarm of rats or a burst of confetti may spill over the edge; one big creature or card may not
      if (!sg && !k.crop && !sc.behind && sc.vis > 0.05 && sc.vis < 0.93 && (sc.area * sc.vis) / 4 >= (cast.length - persons.length <= 6 ? 0.003 : 0.03)) flag(f, "cardcut", k.id, `${k.kind} "${k.id}" is cut by the ${edgeOf(sc.box)} edge`);
      if (sg && !k.crop) letters.push({ id: sg.lines[0].t, sc, centre: q[0].clone().add(q[2]).multiplyScalar(0.5), lines: sg.lines, texH: sg.h, setSign: false });
    }
    for (const sg of set.signs) { if (!shown(sg.o)) continue; const q = signQuad(sg); letters.push({ id: sg.id, sc: onScreen(q, cam), centre: q[0].clone().add(q[2]).multiplyScalar(0.5), lines: sg.lines, texH: sg.texH, setSign: true }); }
    for (const L of letters) {
      if (L.sc.behind || L.sc.vis < 0.05) continue;
      const big = (L.sc.area * L.sc.vis) / 4 >= 0.02, hpx = ((L.sc.box[3] - L.sc.box[1]) / 2) * 1920, px = (l: { size: number }) => (0.7 * l.size / L.texH!) * hpx;
      const main = Math.max(...L.lines!.map(px));
      const st = signSeen.get(L.id) ?? { id: L.id, words: 0, big: 0, readable: 0, bestPx: 0, shots: new Set<number>(), small: new Set<string>() }; signSeen.set(L.id, st);
      st.words = L.lines!.filter((l) => px(l) >= 18 || main < 26).reduce((n, l) => n + l.t.split(/\s+/).length, 0) || 1;
      const covered = Math.min(1, persons.filter((p) => !p.body.behind && p.body.dist < L.sc.dist - 0.1).reduce((a, p) => a + cover(L.sc.box, p.body.box), 0));
      const coverer = persons.find((p) => !p.body.behind && p.body.dist < L.sc.dist - 0.1 && cover(L.sc.box, p.body.box) > 0.08)?.k.id;
      const under = cb ? cover(L.sc.box, cb) >= 0.15 : false, wall = L.setSign && blocked(L.centre, solids, 0.15);
      if (big) {
        st.big += STEP; st.shots.add(i + 1);
        if (L.sc.vis < 0.95) flag(f, "signcut", L.id, `cut by the ${edgeOf(L.sc.box)} edge`, "sign");
        else if (covered >= 0.2) flag(f, "signhid", L.id, `behind ${coverer ?? "the cast"}`, "sign");
        else if (wall) flag(f, "signhid", L.id, "behind a prop or part of the set", "sign");
        else if (under) flag(f, "signcap", L.id, "under the caption", "sign");
      }
      if (L.sc.vis >= 0.97 && covered < 0.1 && !under && !wall && main >= 26) { st.readable += STEP; for (const l of L.lines!) if (px(l) < 18) st.small.add(l.t); }
      if (L.sc.vis >= 0.97 && covered < 0.1) st.bestPx = Math.max(st.bestPx, main);
    }
    // props the story is about (props.hero): whole in frame and clear of the caption while they are big
    for (const h of set.heroes) {
      if (!shown(h.o)) continue;
      const bx = new THREE.Box3().setFromObject(h.o), cs = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => new THREE.Vector3(k & 1 ? bx.max.x : bx.min.x, k & 2 ? bx.max.y : bx.min.y, k & 4 ? bx.max.z : bx.min.z));
      if (cs.some((p) => p.clone().applyMatrix4(cam.matrixWorldInverse).z > -cam.near)) continue;
      const ns = cs.map((p) => p.clone().project(cam)), b = [Math.min(...ns.map((p) => p.x)), Math.min(...ns.map((p) => p.y)), Math.max(...ns.map((p) => p.x)), Math.max(...ns.map((p) => p.y))];
      const area = (b[2] - b[0]) * (b[3] - b[1]), vis = cover(b, [-1, -1, 1, 1]);
      if ((area * vis) / 4 < 0.01) continue;
      if (vis < 0.9) flag(f, "herocut", h.id, `the ${h.id} (a hero prop) is cut by the ${edgeOf(b)} edge`);
      else if (cb && cover(b, cb) >= 0.3) flag(f, "herocap", h.id, `the ${h.id} (a hero prop) is under the caption`);
    }
    // something right in front of the lens (an oar, a post, a wall the camera has backed into)
    if (f % (STEP * 2) === 0 && !allow.has("lens")) {
      let hits = 0; ray.near = 0.05; ray.far = 0.8;
      for (let gx = 0; gx < 9; gx++) for (let gy = 0; gy < 16; gy++) {
        ray.setFromCamera(new THREE.Vector2(((gx + 0.5) / 9) * 2 - 1, ((gy + 0.5) / 16) * 2 - 1), cam); ray.near = 0.05; ray.far = 0.8;
        const h = ray.intersectObjects(solids, false)[0];
        if (h && h.face && Math.abs(h.face.normal.clone().transformDirection(h.object.matrixWorld).y) < 0.85) hits++;
      }
      if (hits >= 4) flag(f, "lens", "lens", `something is right in front of the lens (${Math.round((hits / 144) * 100)} % of the frame within 0.8 m)`);
    }
  }
  // report what lasted
  for (const r of runs.values()) {
    let a = 0, worst: [number, number] | null = null;
    const step = r.id === "lens" ? STEP * 2 : STEP;
    for (let k = 1; k <= r.frames.length; k++) if (k === r.frames.length || r.frames[k] - r.frames[k - 1] > step) {
      const span: [number, number] = [r.frames[a], r.frames[k - 1] + step - 1];
      if ((span[1] - span[0] + 1 >= HOLD || span[1] >= lastFrames) && (!worst || span[1] - span[0] > worst[1] - worst[0])) worst = span;
      a = k;
    }
    if (!worst) continue;
    if (r.lvl === "sign") { signIssues.push({ id: r.id, text: `shot ${i + 1} f${worst[0]}-${worst[1]} ${r.msg}`, allowed: allow.has(r.id) }); continue; }
    if (allow.has(r.id)) { waived++; console.log(`  waived: ${r.msg}`); continue; }
    say(r.lvl, `f${worst[0]}-${worst[1]}${worst[1] >= lastFrames ? " (the ending)" : ""}: ${r.msg}`);
  }
  if (s.tag === "wide" && best > 0.2) say("FAIL", `tagged wide but the cast is ${(best * 100).toFixed(0)} % of the frame`);
  if (s.tag === "insert" && people && best < 0.9) say("warn", `tagged insert but the cast is only ${(best * 100).toFixed(0)} % of the frame`);
  if (people && best < 0.3 && crowd < 12 && !s.tag) say("FAIL", `biggest character is only ${(best * 100).toFixed(0)} % of the frame height (need 30 % or more, or make it a crowd shot)`);
  else if (people) console.log(`  cast height ${(best * 100).toFixed(0)} %${crowd >= 12 ? `, crowd of ${crowd}` : ""}`);
  if (people && keys.size < 2 && len > 60) say("FAIL", "nothing changes in this shot: add a pose change or a prop on a word");
});

// ---------------------------------------------------------------- signs: can each one be read?
console.log("signs");
const waivedSigns = new Set(film.shots.flatMap((s) => s.allow ?? []));
for (const st of signSeen.values()) {
  if (!st.big) continue; // never more than set dressing
  const need = Math.max(0.5, Math.min(2, 0.3 + 0.22 * st.words)), got = st.readable / FPS;
  const line = `"${st.id}" (shots ${[...st.shots].join(", ")}): readable ${got.toFixed(1)} s of ${need.toFixed(1)} s needed, best line height ${st.bestPx.toFixed(0)} px`;
  const why = signIssues.filter((x) => x.id === st.id), list = why.map((x) => x.text).join("; ");
  if (got >= need) { // it can be read; being cut or covered at other moments is a blemish, not a failure
    console.log(`  ok ${line}`);
    for (const t of st.small) say("warn", `"${t}" on the sign "${st.id}" is under 18 px high: too small to read on a phone`);
    if (why.some((x) => !x.allowed)) say("warn", `the sign "${st.id}" is also ${why.filter((x) => !x.allowed).map((x) => x.text).join("; ")}`);
  } else if (waivedSigns.has(st.id)) { waived++; console.log(`  waived: ${line}`); }
  else say("FAIL", `the sign ${line}${list ? ` (${list})` : ""}. Lettering must be 26 px high or more (of 1920), whole, and clear of the cast and the caption for that long`);
}

// ---------------------------------------------------------------- beats: every sentence gets a change on screen
console.log("beats");
{ const shotAt = (f: number) => Math.max(0, film.shots.findIndex((x) => f >= x.a && f < x.b));
  const sig = (f: number) => { stage.clock.real = real(f); const i = shotAt(f); return i + JSON.stringify((film.shots[i].cast?.(f) ?? []).map((k) => (k.kind === "person" ? [k.id, k.pose.eyes, k.pose.mouth, k.pose.held, k.pose.heldL, k.pose.view, k.pose.rh?.map((v) => Math.round(v * 4)), k.pose.lh?.map((v) => Math.round(v * 4)), k.at.map((v) => Math.round(v * 3))] : k.kind === "card" ? [k.id, (k.opacity ?? 1) > 0.3] : [k.id, k.at.map((v) => Math.round(v * 2))]))); };
  const jumps: number[] = [], ports: { f: number; id: string; hidden: boolean }[] = [];
  const changes: number[] = [], pops: { f: number; id: string }[] = [], hits: number[] = []; let prev = sig(0), was = false, prevIds = new Set<string>();
  for (let f = 1; f < film.total; f++) {
    const i = shotAt(f), s = film.shots[i], cur = sig(f), c1 = s.cam(f), c0 = s.cam(Math.max(s.a, f - 1)), c2 = s.cam(Math.min(s.b - 1, f + 1));
    const d = Math.hypot(c1.pos[0] - c1.look[0], c1.pos[1] - c1.look[1], c1.pos[2] - c1.look[2]), mv = Math.hypot(c1.pos[0] - c0.pos[0], c1.pos[1] - c0.pos[1], c1.pos[2] - c0.pos[2]);
    const burst = mv > 0.012 * d + 0.02;
    if (cur !== prev || (burst && !was)) changes.push(f);
    const dy0 = c1.pos[1] - c0.pos[1], dy1 = c2.pos[1] - c1.pos[1]; // a shake flips the camera up and down every frame
    if (Math.abs(dy0) > 0.01 && Math.abs(dy1) > 0.008 && dy0 * dy1 < 0 && !hits.some((h) => f - h < 12)) hits.push(f);
    const ids = new Set((s.cast?.(f) ?? []).filter((k) => k.kind === "card" && !k.add && !k.flat && (k.opacity ?? 1) >= 0.5 && k.w >= 0.2).map((k) => k.id));
    if (f > s.a + 1) for (const id of ids) if (!prevIds.has(id) && !pops.some((p) => p.id === id && f - p.f < 20)) pops.push({ f, id });
    // a camera that changes framing in a single frame inside a shot reads as a hard cut
    if (f > s.a + 1 && f < s.b - 1) {
      const m = (x: typeof c1, y: typeof c1) => { const dx = new THREE.Vector3(x.look[0] - x.pos[0], x.look[1] - x.pos[1], x.look[2] - x.pos[2]).normalize(), dy = new THREE.Vector3(y.look[0] - y.pos[0], y.look[1] - y.pos[1], y.look[2] - y.pos[2]).normalize(); return dx.angleTo(dy) + Math.hypot(x.pos[0] - y.pos[0], x.pos[1] - y.pos[1], x.pos[2] - y.pos[2]) / Math.max(1, d); };
      const now = m(c1, c0), before = m(c0, s.cam(Math.max(s.a, f - 2))), after = m(c2, c1);
      if (now > 0.06 && before < 0.2 * now && after < 0.2 * now && !hits.some((h) => Math.abs(f - h) < 10)) jumps.push(f);
      // and a character may not teleport (more than 0.6 m in one frame), unless the camera is mid-burst and hides it
      const was1 = new Map((s.cast?.(f - 1) ?? []).filter((k) => k.kind === "person").map((k) => [k.id, k.at]));
      for (const k of s.cast?.(f) ?? []) { const o = was1.get(k.id); if (k.kind === "person" && o && Math.hypot(k.at[0] - o[0], k.at[1] - o[1], k.at[2] - o[2]) > 0.6) ports.push({ f, id: k.id, hidden: burst || was }); }
    }
    prev = cur; was = burst; prevIds = ids;
  }
  for (const f of jumps) say("FAIL", `f${f}: the camera jumps to a new framing in one frame (give the track() key a dur of 6 or more, or start a new shot)`);
  for (const p of ports) say(p.hidden ? "warn" : "FAIL", `f${p.f}: ${p.id} jumps to a new place in one frame${p.hidden ? " (during a camera burst)" : ""}`);
  const marks = [...changes.map(real), ...film.shots.map((s) => real(s.a))];
  let start = 0, silent = 0;
  film.words.forEach((w, k) => {
    if (!/[.!?]$/.test(w.w) && k < film.words.length - 1) return;
    const a = Math.round(film.words[start].s * FPS), b = Math.round(w.e * FPS), text = film.words.slice(start, k + 1).map((x) => x.w).join(" "); start = k + 1;
    if (b - a < 0.8 * FPS) return;
    if (!marks.some((m) => m >= a - 8 && m <= b)) { silent++; say("FAIL", `f${a}-${b}: nothing changes on screen during "${text}" (pose, card, camera burst or new shot on its key word)`); }
  });
  const starts = film.words.map((w) => Math.round(w.s * FPS)), discrete = changes.filter((f, k) => (changes[k + 3] ?? 1e9) - f > 8).map(real);
  const onWord = discrete.filter((f) => starts.some((s) => Math.abs(s - f) <= 6)).length;
  console.log(`  ${changes.length} changes on screen; ${discrete.length ? Math.round((onWord / discrete.length) * 100) : 100} % of the single ones land within 6 frames of a word start${silent ? "" : "; every sentence has one"}`);
  if (discrete.length >= 6 && onWord < discrete.length * 0.6) say("warn", "fewer than 60 % of the pose changes land on a word: pin them with F()");
  // impacts need a sound on the same frame
  const cuePath = new URL(`../audio/${name}/cues.json`, import.meta.url);
  if (!fs.existsSync(cuePath)) { if (needCues) say("FAIL", "no audio/<film>/cues.json: build the sound (audio/<film>/make.py) before this check"); else if (hits.length + pops.length) console.log(`  ${hits.length} camera shake(s) and ${pops.length} card pop(s) will need sound cues (no cue sheet yet)`); }
  else {
    const cues = (JSON.parse(fs.readFileSync(cuePath, "utf8")) as { f: number }[]).map((c) => c.f);
    for (const h of hits) if (!cues.some((c) => c >= h - 3 && c <= h + 3)) say("FAIL", `f${h}: the camera shakes but no sound cue lands within 3 frames`);
    const mute = pops.filter((p) => !cues.some((c) => Math.abs(c - p.f) <= 4));
    console.log(`  ${hits.length} camera shake(s), ${pops.length} card pop(s), ${cues.length} sound cues`);
    for (const p of mute.slice(0, 8)) say("warn", `f${p.f}: the card "${p.id}" pops in without a sound cue within 4 frames`);
  }
}
// ---------------------------------------------------------------- the ending
{ const i = film.shots.length - 1, s = film.shots[i], f = film.total - 1; stage.clock.real = real(f);
  const { face } = aim(cam, shotCam(film.shots, i, f)), ps = (s.cast?.(f) ?? []).filter((k) => k.kind === "person").map((k) => onScreen(personQuads(k, face).body, cam));
  const share = Math.max(0, ...ps.filter((p) => !p.behind && p.vis > 0.3).map((p) => (p.box[3] - p.box[1]) / 2));
  if (ps.length && share < 0.25 && s.tag !== "wide") say("FAIL", `the last frame: the biggest character is only ${(share * 100).toFixed(0)} % of the frame height (end on the strongest picture)`); }

console.log(fails ? `\n${fails} FAIL, ${warns} warning(s), ${waived} waived` : `\nPASS (${warns} warning(s), ${waived} waived)`);
process.exit(fails ? 1 : 0);
