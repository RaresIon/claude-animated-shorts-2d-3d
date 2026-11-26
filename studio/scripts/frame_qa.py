#!/usr/bin/env python3
"""Frame QA for a short: is the frame FULL, varied and readable, the way the reference is?

  python3 scripts/frame_qa.py out/final.mp4            # a video (sampled 2 frames/s)
  python3 scripts/frame_qa.py 'out/stills/*.jpg'       # or a set of stills
  python3 scripts/frame_qa.py final.mp4 --sheet qa.jpg # also write a contact sheet with the failing frames marked

It measures, per frame (downscaled to 270x480):
  empty   share of 30x30 px cells with almost no drawn detail (flat sky, bare ground, blur). Measured: reference
          frames median 0.20; the two Emu War shorts 0.45 and 0.56; the rat-tails short 0.16.
          GATE: median <= 0.25, and at most 10 % of frames above 0.55.
  hues    how many of 12 hue families hold >= 4 % of the coloured pixels (palette variety). Reference median 4.
  sharp   Laplacian variance of the sharpest third of the frame: catches a film lost to lens blur. Reference 189,
          Emu War POV 13 (blurred almost throughout). GATE: median >= 60.
and over the film:
  moods   number of distinct light moods (clusters of mean frame colour). GATE: >= 3.
Exit code 1 when a gate fails, so it can sit in a render script."""
import glob, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw

W, H, CELL = 270, 480, 30

def load(src):
    if any(ch in src for ch in "*?") or src.lower().endswith((".jpg", ".png")):
        return sorted(glob.glob(src))
    d = tempfile.mkdtemp(prefix="frameqa_")
    subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", f"fps=2,scale={W * 2}:{H * 2}", os.path.join(d, "f_%04d.jpg")], check=True)
    return sorted(glob.glob(os.path.join(d, "*.jpg")))

def measure(path):
    im = Image.open(path).convert("RGB").resize((W, H), Image.BILINEAR)
    a = np.asarray(im, float) / 255.0
    g = a @ np.array([0.299, 0.587, 0.114])
    gx = np.abs(np.diff(g, axis=1, prepend=g[:, :1])); gy = np.abs(np.diff(g, axis=0, prepend=g[:1]))
    e = gx + gy
    cells = e[: H // CELL * CELL, : W // CELL * CELL].reshape(H // CELL, CELL, W // CELL, CELL)
    busy = (cells > 0.06).mean(axis=(1, 3))            # share of edge pixels per cell
    empty = float((busy < 0.012).mean())
    lap = np.abs(4 * g[1:-1, 1:-1] - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:])
    lc = lap[: (H - 2) // CELL * CELL, : (W - 2) // CELL * CELL].reshape((H - 2) // CELL, CELL, (W - 2) // CELL, CELL).var(axis=(1, 3)).ravel()
    sharp = float(np.sort(lc)[-len(lc) // 3:].mean() * 1e4)
    mx, mn = a.max(2), a.min(2); sat = (mx - mn) / np.maximum(mx, 1e-6); col = sat > 0.25
    hue = np.zeros(g.shape); d = np.maximum(mx - mn, 1e-6)
    r, gg, b = a[..., 0], a[..., 1], a[..., 2]
    hue = np.where(mx == r, ((gg - b) / d) % 6, np.where(mx == gg, (b - r) / d + 2, (r - gg) / d + 4)) / 6
    hist = np.histogram(hue[col], bins=12, range=(0, 1))[0] / max(1, col.sum())
    return {"empty": empty, "hues": int((hist >= 0.04).sum()), "sharp": sharp, "mean": a.reshape(-1, 3).mean(0), "luma": float(g.mean())}

def moods(means):
    """greedy clustering of mean frame colours: a new mood when a frame is far from every mood so far"""
    cs = []
    for m in means:
        if not cs or min(np.abs(m - c).sum() for c in cs) > 0.36: cs.append(m)
    return len(cs)

def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    sheet = sys.argv[sys.argv.index("--sheet") + 1] if "--sheet" in sys.argv else None
    if sheet: args.remove(sheet)
    files = load(args[0]); ms = [measure(f) for f in files]
    em = np.array([m["empty"] for m in ms]); hu = np.array([m["hues"] for m in ms]); sh = np.array([m["sharp"] for m in ms])
    nm = moods([m["mean"] for m in ms])
    bad = [i for i, m in enumerate(ms) if m["empty"] > 0.55]
    print(f"frames {len(ms)}  empty median {np.median(em):.2f} p90 {np.percentile(em, 90):.2f} max {em.max():.2f}  hues median {np.median(hu):.0f}  sharp median {np.median(sh):.1f}  moods {nm}")
    fails = []
    if np.median(em) > 0.25: fails.append(f"frame too empty overall: median {np.median(em):.2f} > 0.25 (dress the sets, move the camera closer)")
    if len(bad) > max(1, len(ms) // 10): fails.append(f"{len(bad)} sampled frames are more than 55 % empty: " + ", ".join(os.path.basename(files[i]) for i in bad[:12]))
    if nm < 3 and len(ms) > 20: fails.append(f"only {nm} light mood(s): change the light with the story (>= 3)")
    if np.median(sh) < 60: fails.append(f"picture too soft: sharpness median {np.median(sh):.0f} < 60 (lens blur over the subject, or an upscaled render)")
    if np.median(hu) < 3: fails.append(f"palette too narrow: median {np.median(hu):.0f} hue families (< 3)")
    if sheet:
        n = min(len(files), 60); idx = np.linspace(0, len(files) - 1, n).astype(int); cols = 10; rows = (n + cols - 1) // cols
        S = Image.new("RGB", (cols * 162, rows * 288), "#111")
        for k, i in enumerate(idx):
            im = Image.open(files[i]).convert("RGB").resize((162, 288)); dr = ImageDraw.Draw(im)
            dr.rectangle([0, 0, 161, 14], fill=(0, 0, 0)); dr.text((3, 2), f"{i / 2:.1f}s e{ms[i]['empty']:.2f} h{ms[i]['hues']}", fill=(255, 80, 80) if ms[i]["empty"] > 0.55 else (255, 255, 120))
            if ms[i]["empty"] > 0.55: dr.rectangle([0, 0, 161, 287], outline=(255, 40, 40), width=4)
            S.paste(im, ((k % cols) * 162, (k // cols) * 288))
        S.save(sheet, quality=88); print("sheet:", sheet)
    for f in fails: print("FAIL:", f)
    print("PASS" if not fails else f"{len(fails)} gate(s) failed")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
