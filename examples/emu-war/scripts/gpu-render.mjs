// Full render of EmuShort inside the Modal container: node scripts/render.mjs <gl> <scale> <concurrency> <out.mp4> [from-to]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [gl, scale, conc, out, range] = process.argv.slice(2);
const chromiumOptions = { gl };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "EmuShort", chromiumOptions,
  onBrowserLog: (l) => { if (/WebGL|GL_|renderer/i.test(l.text)) console.log("[browser]", l.text.slice(0, 200)); } });
const t0 = Date.now(); let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", crf: 17, outputLocation: out, scale: Number(scale), chromiumOptions,
  concurrency: Number(conc), timeoutInMilliseconds: 600000, muted: true, frameRange: range ? range.split("-").map(Number) : null,
  onProgress: ({ renderedFrames }) => { if (renderedFrames - last >= 60) { last = renderedFrames; console.log("frames", renderedFrames, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
