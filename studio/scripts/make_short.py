#!/usr/bin/env python3
"""One command from script to checked film. It stops at the first gate that fails.

  python3 scripts/make_short.py <film>                      everything, rendering here (CPU, about 3 s per frame)
  python3 scripts/make_short.py <film> --to stills          stop after the stills sheet (the fast loop while staging)
  python3 scripts/make_short.py <film> --to sound           stop before the render
  python3 scripts/make_short.py <film> --video out/x.mp4    skip the render: check a film rendered elsewhere (Modal)

  1 transcript   scripts/transcript_check.py --fix   the voice said the script; mis-heard spellings repaired
  2 types        tsc --noEmit
  3 plan         scripts/plan_lint.ts                 edges, hidden faces and signs, legibility, beats, ending, edit
  4 stills       one frame per shot and the last frame -> out/<film>/stills.jpg, then frame_qa on them
  5 sound        audio/<film>/make.py                 the mix and its cue sheet
  6 cues         scripts/plan_lint.ts --need-cues     every impact has a sound on its frame
  7 mix          scripts/audio_qa.py on mix.wav       loudness, bed under the voice, pace, pauses, ending
  8 render       scripts/render.mjs                   (or --video)
  9 film         scripts/frame_qa.py --plan, scripts/audio_qa.py on the film
The stills sheet in step 4 is the one thing a person (or a reviewer agent) still has to LOOK at: the gates check
geometry, not whether the joke lands. The composition id is the film's folder name in CamelCase (rat-tails -> RatTails)."""
import json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..")
args = sys.argv[1:]; film = args[0]
opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
to, video = opt("--to", "film"), opt("--video")
comp = opt("--comp", "".join(p.capitalize() for p in film.split("-")))
A = os.path.join("audio", film); out = os.path.join("out", film); os.makedirs(os.path.join(ROOT, out), exist_ok=True)
log = []
def step(n, name, cmd, skip=None):
    if skip: print(f"[{n}] {name}: skipped ({skip})"); log.append((name, "skipped")); return
    print(f"\n[{n}] {name}: {' '.join(cmd)}", flush=True); t = time.time()
    r = subprocess.run(cmd, cwd=ROOT)
    log.append((name, "pass" if r.returncode == 0 else "FAIL", round(time.time() - t, 1)))
    if r.returncode: done(1)
def done(code):
    print("\n" + " | ".join(f"{x[0]} {x[1]}" for x in log))
    json.dump(log, open(os.path.join(ROOT, out, "gates.json"), "w"))
    sys.exit(code)
has = lambda p: os.path.exists(os.path.join(ROOT, p))
step(1, "transcript", [sys.executable, "scripts/transcript_check.py", film, "--fix"], None if has(os.path.join(A, "voice_text.txt")) else "no audio/<film>/voice_text.txt")
step(2, "types", ["npx", "tsc", "--noEmit"])
step(3, "plan", ["npx", "tsx", "scripts/plan_lint.ts", film])
plan = json.load(open(os.path.join(ROOT, A, "plan.json")))
frames = sorted({min(plan["total"] - 1, (s["a"] + s["b"]) // 2) for s in plan["shots"]} | {s["a"] + 2 for s in plan["shots"]} | {plan["total"] - 1})
step(4, "stills", ["node", "scripts/stills.mjs", comp, os.path.join(out, "s"), ",".join(map(str, frames)), "0.5"])
step(4, "stills sheet", [sys.executable, "scripts/frame_qa.py", os.path.join(out, "s*.jpg"), "--sheet", os.path.join(out, "stills.jpg")])
if to == "stills": done(0)
step(5, "sound", [sys.executable, os.path.join(A, "make.py")], None if has(os.path.join(A, "make.py")) else "no audio/<film>/make.py")
if has(os.path.join(A, "make.py")):
    step(6, "cues", ["npx", "tsx", "scripts/plan_lint.ts", film, "--need-cues"])
    step(7, "mix", [sys.executable, "scripts/audio_qa.py", os.path.join(A, "mix.wav"), os.path.join("src", "videos", film, "words.json")])
if to == "sound": done(0)
if not video:
    video = os.path.join(out, film + ".mp4")
    step(8, "render", ["node", "scripts/render.mjs", comp, video] + ([os.path.join(A, "mix.wav")] if has(os.path.join(A, "mix.wav")) else []))
step(9, "film frames", [sys.executable, "scripts/frame_qa.py", video, "--plan", os.path.join(A, "plan.json"), "--sheet", os.path.join(out, "film.jpg")])
step(9, "film sound", [sys.executable, "scripts/audio_qa.py", video, os.path.join("src", "videos", film, "words.json")], None if has(os.path.join(A, "mix.wav")) else "no sound")
done(0)
