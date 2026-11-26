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
type Built = { def: SetDef; signs: Sign[]; solids: THREE.Mesh[] };
const built = new Map<string, Built>();
const shown = (o: THREE.Object3D | null) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
const setOf = (n: string): Built => {
  let b = built.get(n);
  if (!b) {
    const def = film.sets[n](), signs: Sign[] = [], solids: THREE.Mesh[] = [];
    def.root.traverse((o) => {
      const s = o.userData.sign as Omit<Sign, "o" | "id"> | undefined;
      if (s) signs.push({ o, id: s.lines[0].t, ...s });
      const m = o as THREE.Mesh, mat = m.material as THREE.Material | undefined;
      if (m.isMesh && mat && !mat.transparent && mat.side !== THREE.BackSide) solids.push(m);
    });
    b = { def, signs, solids }; built.set(n, b);
  }
  return b;
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
    const persons = cast.filter((k) => k.kind === "person").map((k) => { const q = personQuads(k, face); const n = q.face.clone().project(cam); return { k, body: onScreen(q.body, cam), head: onScreen(q.head, cam), torso: onScreen(q.torso, cam), facePt: q.face, fc: [n.x, n.y] }; });
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
      if (!sg && !k.crop && !sc.behind && sc.vis > 0.05 && sc.vis < 0.93 && (sc.area * sc.vis) / 4 >= 0.03) flag(f, "cardcut", k.id, `${k.kind} "${k.id}" is cut by the ${edgeOf(sc.box)} edge`);
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
    prev = cur; was = burst; prevIds = ids;
  }
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
