// Full render, in resumable chunks: node scripts/render.mjs <Comp> <out.mp4> [audio.wav] [scale=1] [chunk=150]
// Each chunk is written to out/chunks/ and skipped on a re-run, so a killed render picks up where it stopped.
// CPU machines use software GL ("swangle"); on a GPU machine set GL=angle-egl (see docs/rendering.md).
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const [comp, out, audio, scale = "1", chunk = "150"] = process.argv.slice(2);
const found = fs.existsSync("/opt/pw-browsers") ? fs.readdirSync("/opt/pw-browsers").filter((d) => d.startsWith("chromium_headless_shell-")).map((d) => `/opt/pw-browsers/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find((p) => fs.existsSync(p)) : undefined;
const browserExecutable = process.env.CHROME || found;
const chromiumOptions = { gl: process.env.GL || "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions });
const dir = path.join(path.dirname(out), "chunks_" + comp + "_" + scale); fs.mkdirSync(dir, { recursive: true });
const n = Number(chunk), parts = [], t0 = Date.now();
for (let a = 0; a < composition.durationInFrames; a += n) {
  const b = Math.min(composition.durationInFrames, a + n) - 1, p = path.join(dir, `${String(a).padStart(5, "0")}.mp4`);
  parts.push(p);
  if (fs.existsSync(p)) continue;
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, outputLocation: p + ".tmp.mp4", scale: Number(scale), browserExecutable, chromiumOptions,
    concurrency: Number(process.env.CONCURRENCY || 2), frameRange: [a, b], muted: true, timeoutInMilliseconds: 600000, logLevel: "error" });
  fs.renameSync(p + ".tmp.mp4", p);
  console.log(`frames ${a}-${b} done, ${((Date.now() - t0) / 1000).toFixed(0)} s elapsed`);
}
const list = path.join(dir, "list.txt"); fs.writeFileSync(list, parts.map((p) => `file '${path.resolve(p)}'`).join("\n"));
const args = ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list];
if (audio) args.push("-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", "192k", "-shortest");
execFileSync("ffmpeg", [...args, "-c:v", "copy", "-movflags", "+faststart", out]);
console.log("wrote", out);
