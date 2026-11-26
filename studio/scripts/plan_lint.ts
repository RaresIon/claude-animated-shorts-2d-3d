// Deterministic staging lint: checks a film's shot list WITHOUT rendering a frame.
//   npx tsx scripts/plan_lint.ts rat-tails
// It projects every character through the shot's camera at five sample frames and reports, per shot: how tall the
// biggest character is in the frame, heads cut by the frame edge, faces under the caption, shots with no pose change,
// shot lengths, plain hard cuts and the number of light moods. Exit code 1 on any FAIL. Run it before any still.
import * as THREE from "three";
import fs from "node:fs";
import type { Film, CastItem } from "../src/stage/Stage";
import { chunk } from "../src/stage/Captions";

const name = process.argv[2] ?? "rat-tails";
const { film } = (await import(`../src/videos/${name}/film.ts`)) as { film: Film };
const cam = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 400);
const ndc = (p: [number, number, number]) => { const v = new THREE.Vector3(...p).project(cam); return [v.x, v.y, v.z] as const; };
let fails = 0, warns = 0;
const say = (lvl: "FAIL" | "warn", s: string) => { lvl === "FAIL" ? fails++ : warns++; console.log(`  ${lvl}: ${s}`); };
const moods = new Set(film.shots.map((s) => s.mood));
console.log(`${name}: ${film.total} frames (${(film.total / 30).toFixed(1)} s), ${film.shots.length} shots, moods: ${[...moods].join(", ")}`);
if (moods.size < 3) say("FAIL", `only ${moods.size} light mood(s); the story needs at least 3`);
const per45 = film.shots.length / (film.total / 30 / 45);
if (per45 > 16) say("FAIL", `${per45.toFixed(0)} shots per 45 s: too choppy (aim for 10-14)`);
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
if (angles.size < 3) say("FAIL", `only ${[...angles].join("/")} camera angles: use low, eye-level and high`);
if (tilted < film.shots.length * 3 * 0.25) say("FAIL", "fewer than a quarter of the framings are tilted (dutch 3-15 degrees)");
if (!film.shots.some((s) => s.tag === "insert")) say("FAIL", "no insert shot (a prop, a hand, a face filling the frame)");
if (!film.shots.some((s) => s.tag === "wide")) say("FAIL", "no far wide shot (character under 15 % of the frame) for scale");
// --- hook: frame 0 is already the action and the camera is already moving
{ const s = film.shots[0], c0 = s.cam(0), c1 = s.cam(15), k = (f: number) => JSON.stringify((s.cast?.(f) ?? []).map((x) => (x.kind === "person" ? [x.pose.rh, x.pose.lh, x.pose.held, x.pose.mouth] : x.at)));
  if (Math.hypot(c1.pos[0] - c0.pos[0], c1.pos[1] - c0.pos[1], c1.pos[2] - c0.pos[2]) < 0.2) say("FAIL", "hook: the camera is not moving in the first half second");
  if (k(0) === k(10)) say("FAIL", "hook: nothing is happening in the first ten frames"); }
// --- captions and pace
{ const ch = chunk(film.words), n3 = ch.filter((c) => c.t.split(" ").length > 2).length, dur = film.words[film.words.length - 1].e - film.words[0].s, wps = film.words.length / dur;
  console.log(`captions: ${ch.length} chunks, ${n3} longer than 2 words; narration ${wps.toFixed(2)} words/s`);
  if (n3 > ch.length * 0.1) say("FAIL", "more than 10 % of captions are longer than 2 words");
  if (wps < 3.3 || wps > 4.1) say("FAIL", `narration pace ${wps.toFixed(2)} words/s is outside 3.3-4.1`); }
// --- the time warp, written out for the sound builder (audio/make.py maps its cue frames through it)
fs.mkdirSync(new URL(`../audio/${name}/`, import.meta.url), { recursive: true });
fs.writeFileSync(new URL(`../audio/${name}/warp.json`, import.meta.url), JSON.stringify(film.warp ?? { from: [0, film.total], to: [0, film.total] }));
if (film.shots[0].a !== 0 || film.shots[film.shots.length - 1].b !== film.total) say("FAIL", "shots do not cover the film from frame 0 to the end");

film.shots.forEach((s, i) => {
  const len = s.b - s.a, tag = `shot ${i + 1} [${s.a}-${s.b}] ${s.set}/${s.mood}`;
  console.log(tag);
  if (i && film.shots[i - 1].b !== s.a) say("FAIL", "gap or overlap with the previous shot");
  if (len < 24) say("warn", `only ${len} frames long`);
  const keys = new Set<string>(); let best = 0, people = 0, crowd = 0;
  for (const u of [0.08, 0.3, 0.5, 0.75, 0.97]) {
    const f = Math.min(s.b - 1, Math.round(s.a + u * len)), c = s.cam(f), cast: CastItem[] = s.cast?.(f) ?? [];
    cam.position.set(...c.pos); cam.fov = c.fov ?? 40; cam.lookAt(...c.look); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    keys.add(JSON.stringify(cast.filter((k) => k.kind === "person").map((k) => (k.kind === "person" ? [k.pose.eyes, k.pose.mouth, k.pose.held, k.pose.heldL, k.pose.rh?.map((v) => Math.round(v * 3)), k.pose.lh?.map((v) => Math.round(v * 3))] : 0))) + cast.length);
    crowd = Math.max(crowd, cast.filter((k) => k.kind !== "person").length);
    for (const k of cast) {
      if (k.kind !== "person") continue;
      people++;
      const h = k.h ?? 1.7, foot = ndc(k.at), top = ndc([k.at[0], k.at[1] + h, k.at[2]]), head = ndc([k.at[0], k.at[1] + h * 0.8, k.at[2]]);
      if (top[2] > 1 || top[2] < -1) continue; // behind the camera
      const share = Math.abs(top[1] - foot[1]) / 2;
      const inFrame = Math.abs(head[0]) < 1.25 && head[1] < 1.2 && head[1] > -1.2;
      if (!inFrame) continue;
      best = Math.max(best, share);
      const edge = Math.abs(head[0]) > 0.88 && Math.abs(head[0]) < 1.25; // a head is about 0.5 of the frame width at share 0.4
      if (edge && share > 0.25) say("warn", `f${f}: ${k.id}'s head is cut by the frame edge (x ${head[0].toFixed(2)})`);
      const capY = 1 - 2 * 0.7; // caption centre in NDC
      if (Math.abs(head[1] - capY) < 0.12 && Math.abs(head[0]) < 0.5 && share > 0.2) say("FAIL", `f${f}: ${k.id}'s face is under the caption`);
    }
  }
  if (s.tag === "wide" && best > 0.2) say("FAIL", `tagged wide but the cast is ${(best * 100).toFixed(0)} % of the frame`);
  if (s.tag === "insert" && people && best < 0.9) say("warn", `tagged insert but the cast is only ${(best * 100).toFixed(0)} % of the frame`);
  if (people && best < 0.3 && crowd < 12 && !s.tag) say("FAIL", `biggest character is only ${(best * 100).toFixed(0)} % of the frame height (need 30 % or more, or make it a crowd shot)`);
  else if (people) console.log(`  cast height ${(best * 100).toFixed(0)} %${crowd >= 12 ? `, crowd of ${crowd}` : ""}`);
  if (people && keys.size < 2 && len > 60) say("FAIL", "nothing changes in this shot: add a pose change or a prop on a word");
});
console.log(fails ? `\n${fails} FAIL, ${warns} warning(s)` : `\nPASS (${warns} warning(s))`);
process.exit(fails ? 1 : 0);
