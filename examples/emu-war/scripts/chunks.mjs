// Resumable render: one bundle, then 60-frame chunks to out/emu/chunks/c_<start>.mp4 (existing chunks are skipped).
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
const dir = "out/emu/chunks"; fs.mkdirSync(dir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "EmuShort", browserExecutable, chromiumOptions });
const CH = 60, only = process.argv[2] ? process.argv[2].split(",").map(Number) : null;
for (let a = 0; a < composition.durationInFrames; a += CH) {
  if (only && !only.includes(a)) continue;
  const out = `${dir}/c_${String(a).padStart(4, "0")}.mp4`;
  if (fs.existsSync(out)) continue;
  const b = Math.min(composition.durationInFrames, a + CH) - 1, t0 = Date.now();
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 14, outputLocation: out + ".tmp.mp4", scale: 0.5, browserExecutable, chromiumOptions,
    frameRange: [a, b], concurrency: 1, timeoutInMilliseconds: 900000, muted: true });
  fs.renameSync(out + ".tmp.mp4", out);
  console.log(new Date().toISOString(), "chunk", a, b, ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
console.log("ALL DONE");
