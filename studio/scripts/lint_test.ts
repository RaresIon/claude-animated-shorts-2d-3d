// Self-test of plan_lint:  npx tsx scripts/lint_test.ts
// src/videos/lint-fixtures is one film staged wrong on purpose and the same film framed with fit(). Every planted
// defect must be reported for the bad one, and the good one must pass.
import { spawnSync } from "node:child_process";
const run = (mode: string) => spawnSync("npx", ["tsx", "scripts/plan_lint.ts", "lint-fixtures"], { env: { ...process.env, LINT_FIXTURE: mode }, encoding: "utf8" });
const EXPECT: [string, RegExp][] = [
  ["a head cut by the frame edge", /shot 2[^]*?FAIL: .*ann's head is cut by the left edge/],
  ["a face hidden behind another character", /shot 3[^]*?FAIL: .*bob's face is hidden behind ann/],
  ["a sign that is never whole on screen", /FAIL: the sign "NOTICE".*cut by the/],
  ["an object right in front of the lens", /shot 5[^]*?FAIL: .*right in front of the lens/],
  ["a camera shake with no sound", /FAIL: f\d+: the camera shakes but no sound cue/],
  ["a face behind a prop", /shot 4[^]*?FAIL: .*ann's face is behind a prop/],
  ["a shot where nothing changes", /shot 4[^]*?FAIL: nothing changes in this shot/],
  ["a sentence with no change on screen", /FAIL: f\d+-\d+: nothing changes on screen during/],
  ["a weak last frame", /FAIL: the last frame: the biggest character is only/],
];
let bad = 0;
import fs from "node:fs";
const cues = new URL("../audio/lint-fixtures/cues.json", import.meta.url);
fs.mkdirSync(new URL("../audio/lint-fixtures/", import.meta.url), { recursive: true }); fs.writeFileSync(cues, "[]"); // the bad film has no sound for its shake
const b = run("bad"); fs.writeFileSync(cues, JSON.stringify([{ f: 262, name: "thud" }])); const g = run("good");
for (const [what, re] of EXPECT) { const hit = re.test(b.stdout); if (!hit) bad++; console.log(`${hit ? "ok  " : "MISS"} bad film: reports ${what}`); }
if (b.status !== 1) { bad++; console.log("MISS bad film: exit code should be 1"); }
const gf = g.stdout.split("\n").filter((l) => l.includes("FAIL"));
if (g.status !== 0) { bad++; console.log("MISS good film should pass, but:\n" + gf.join("\n")); } else console.log("ok   good film (same shots, framed with fit()) passes");
console.log(bad ? `\n${bad} check(s) failed` : "\nlint self-test passed"); process.exit(bad ? 1 : 0);
