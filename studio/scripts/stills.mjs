// Render stills: node scripts/stills.mjs <Comp> <outPrefix> <frame,frame,...> [scale]
// CPU machines: leaves gl on "swangle" (software). GPU machines: GL=angle-egl.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
const [comp, prefix, frames, scale = "0.5"] = process.argv.slice(2);
const found = fs.existsSync("/opt/pw-browsers") ? fs.readdirSync("/opt/pw-browsers").filter((d) => d.startsWith("chromium_headless_shell-")).map((d) => `/opt/pw-browsers/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find((p) => fs.existsSync(p)) : undefined;
const browserExecutable = process.env.CHROME || found;
const chromiumOptions = { gl: process.env.GL || "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions });
fs.mkdirSync(path.dirname(prefix + "x"), { recursive: true });
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${String(f).padStart(4, "0")}.jpg`, imageFormat: "jpeg", jpegQuality: 90, scale: Number(scale), browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000,
    onBrowserLog: (l) => { if (l.type === "error") console.log("[browser error]", l.text.slice(0, 400)); } });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
