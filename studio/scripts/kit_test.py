#!/usr/bin/env python3
"""Kit regression test:  python3 scripts/kit_test.py [--update]

Renders the nine frames of the KitTest composition (src/videos/kit-test: every base set, light mood, hat, held prop
and a spread of the prop library) at quarter size and compares each with its stored picture in test/golden/.
A frame fails when its mean difference is above 2.5 (of 255) or more than 1.5 % of its pixels moved by over 40:
loose enough for encoder noise, tight enough to catch a changed prop, pose, colour or light.
After an INTENDED change to the kit, look at out/kit/diff_*.jpg, then run with --update and commit the new pictures.
Software GL (the default on CPU machines) gives the same pixels on every run; on a GPU set GL as in docs/rendering.md
and keep a separate set of goldens. About one minute."""
import glob, os, shutil, subprocess, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, ".."); GOLD = os.path.join(ROOT, "test", "golden"); OUT = os.path.join(ROOT, "out", "kit")
N = 9
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT); os.makedirs(GOLD, exist_ok=True)
subprocess.run(["node", "scripts/stills.mjs", "KitTest", os.path.join("out", "kit", "k"), ",".join(map(str, range(N))), "0.25"], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
got = sorted(glob.glob(os.path.join(OUT, "k*.jpg")))
if len(got) != N: sys.exit(f"expected {N} frames, rendered {len(got)}")
if "--update" in sys.argv:
    for g in got: shutil.copy(g, os.path.join(GOLD, os.path.basename(g)))
    print(f"wrote {N} golden pictures to test/golden/"); sys.exit(0)
bad = 0
for g in got:
    ref = os.path.join(GOLD, os.path.basename(g))
    if not os.path.exists(ref): print("MISSING golden for", os.path.basename(g), "(run with --update)"); bad += 1; continue
    a, b = np.asarray(Image.open(g).convert("RGB"), float), np.asarray(Image.open(ref).convert("RGB"), float)
    if a.shape != b.shape: print("SIZE differs:", os.path.basename(g)); bad += 1; continue
    d = np.abs(a - b).max(2); mean, moved = float(np.abs(a - b).mean()), float((d > 40).mean())
    ok = mean <= 2.5 and moved <= 0.015
    print(f"{'ok  ' if ok else 'DIFF'} {os.path.basename(g)}  mean {mean:.2f}  moved {moved * 100:.2f} %")
    if not ok:
        bad += 1; hot = np.clip(d * 4, 0, 255).astype(np.uint8)
        Image.fromarray(np.concatenate([b.astype(np.uint8), a.astype(np.uint8), np.stack([hot, hot // 4, hot // 4], 2)], 1)).save(os.path.join(OUT, "diff_" + os.path.basename(g)))
print("kit test passed" if not bad else f"{bad} frame(s) differ from test/golden: see out/kit/diff_*.jpg (golden | now | difference)"); sys.exit(1 if bad else 0)
