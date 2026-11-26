// Render frames [a, b] of the composition named in render.json to an h264 file (no audio). Used by the Modal
// Remotion workflow (docs/rendering.md): node scripts/render-chunk.mjs out.mp4 a b [scale]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
const [out, a, b, scale = "1"] = process.argv.slice(2);
const { composition: id } = JSON.parse(fs.readFileSync("render.json", "utf8"));
const chromiumOptions = { gl: process.env.GL || "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, chromiumOptions });
const t0 = Date.now();
await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, pixelFormat: "yuv420p", outputLocation: out, frameRange: [Number(a), Number(b)],
  scale: Number(scale), concurrency: 1, chromiumOptions, timeoutInMilliseconds: 600000, muted: true });
console.log("done", a, b, ((Date.now() - t0) / 1000).toFixed(0) + " s");
process.exit(0);
