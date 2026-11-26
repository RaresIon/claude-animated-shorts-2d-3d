# Claude Animated Shorts

A Claude skill that makes 30-70 s vertical animated story shorts: 2D cartoon characters in dressed, inked 3D sets,
with light that changes with the story, word-by-word captions, narration, an original score and sound effects.
Everything is code (three.js inside Remotion, Canvas2D drawing, synthesized music): no AI video generator, no
external 3D models, and it renders on a plain CPU.

Worked examples: **The Rat Tail Problem** (Hanoi, 1902; 44.5 s) in `studio/src/videos/rat-tails/` and **Late for
Dinner** (the Vikings find America by accident; 47 s) in `studio/src/videos/vikings/`.

## What's inside
| Path | What it is |
|---|---|
| `SKILL.md` | the skill: seven look rules, the pipeline, the kit map |
| `studio/` | the runnable project: `src/stage/` (engine, props, sets, characters, moods, camera, captions), `src/videos/<film>/` (one folder per short), `scripts/` (stills, render, lint, QA), `audio/` (voice, effects, score, mix) |
| `docs/style-gap-analysis.md` | why the earlier shorts fell short of the reference, root cause by root cause |
| `docs/style-rules.md` | the reviewer checklist |
| `docs/rendering.md` | CPU, GPU and Modal rendering; the sound tools |
| `docs/reference-motion.md` | motion, edit and sound measured on three full reference videos, and the gates built from them |
| `docs/proof-rat-tails.md` | the proof short measured against the reference and the earlier shorts |
| `references/` | style study of the reference channel: frames, contact sheets, measured reports (private study only) |
| `templates/`, `docs/legacy-bridge-skill.md` | the first pipeline (the bridge short: post-processing look, GPU only), kept for its look research |

## Use
1. Copy this folder to `~/.claude/skills/cartoon-3d-short/` (or clone it there).
2. `cd studio && npm install`. You also need Python 3 with `numpy scipy pillow soundfile`, and ffmpeg.
3. In Claude Code: *"Use the cartoon short skill and make a short about …"*.

By hand:
```bash
cd studio
npx tsx scripts/plan_lint.ts rat-tails                       # staging lint, no rendering
node scripts/stills.mjs RatTails out/s_ 60,300,700 0.5       # look at frames
python3 audio/rat-tails/make.py                              # score + effects + mix
python3 scripts/audio_qa.py audio/rat-tails/mix.wav src/videos/rat-tails/words.json
node scripts/render.mjs RatTails out/rat-tails.mp4 audio/rat-tails/mix.wav
python3 scripts/frame_qa.py out/rat-tails.mp4 --sheet out/qa.jpg
```

## Notes
- Story, characters, jokes and voice are always your own. The references teach the craft, not the content.
- Sound effects come from Freesound under CC0; `studio/audio/sfx/CREDITS.md` lists them, and
  `python3 audio/fetch_sfx.py` fetches more.
- Fonts in `studio/public/fonts/` are Poppins and Rye, both under the SIL Open Font License.

## License
The code and docs are MIT (see `LICENSE`). The reference frames are included for style study only.
