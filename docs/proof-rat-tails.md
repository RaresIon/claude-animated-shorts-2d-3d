# Proof: "The Rat Tail Problem"

A 44.5 s short made with the stage kit exactly as `SKILL.md` describes: script → Kokoro voice → word timings → shot
list → `plan_lint` → stills → sound → render on Modal (three passes of about 3 minutes each) → `frame_qa` → an
independent reviewer agent → fixes → final render.

- Film: R2 `previews/rat-tails/rat-tails.mp4` (1080x1920, 30 fps, -14.1 LUFS). Source: `studio/src/videos/rat-tails/`.
- Topic: the 1902 Hanoi rat-tail bounty (facts and sources in `studio/src/videos/rat-tails/SCRIPT.md`).

## Side by side

![interior](img/proof-1-interior.jpg)
![crowd](img/proof-2-crowd.jpg)
![night](img/proof-3-night.jpg)

## Measured (`studio/scripts/frame_qa.py`)

| | empty share, median | p90 | sharpness | QA |
|---|---|---|---|---|
| Reference (38 frames) | 0.20 | 0.45 | 189 | pass |
| Emu v1 | 0.45 | 0.65 | 101 | fail |
| Emu POV | 0.56 | 0.67 | 13 | fail |
| **Rat tails** | **0.12** | **0.33** | **174** | **pass** |

![qa sheet](img/proof-qa-sheet.jpg)

The three frames outlined in red are transition frames (two whips and one dip through black).

## What the reviewer said

An independent reviewer agent scored the first full render against the reference: frame density 6/10, character
staging 5, light and colour 7, drawing 6, acting 5, captions 6, with fifteen concrete defects. Twelve were fixed
before the final render (captions clear of the subject, signs fully in frame, the sewer wall, the catcher's colour,
the "rat goes home" beat restaged, the ending pulled closer). The final render has not been re-scored.

## Still short of the reference, honestly

1. **Staging and poses.** Characters mostly stand upright and front-on. The reference stages in depth, at dramatic
   angles, with extreme poses (sprawled, leaning, arms flung). The pose system here has arms, lean, squash and a walk,
   but no bent legs, no sitting, no side view.
2. **Light on the cast.** The 2D characters take one flat tint per mood. In the reference a window or lamp visibly
   lights one side of a character. Props now cast real shadows; characters only have a soft blob.
3. **Surfaces.** Painted textures are procedural and a little uniform. The reference has hand-painted variation and
   richer 3D models (a ship, a vault door).
4. **Voice.** Kokoro is clearer and more natural than the Piper voice of the emu shorts, but it is still a
   synthetic voice without a human narrator's timing on jokes.
5. **Motion was reviewed from stills and contact sheets only.** Nobody has yet watched it against the reference in
   motion, and the reference's motion and sound have not been re-measured from full videos.

## Second version: the reference-motion pass

After three full reference videos were measured (`docs/reference-motion.md`), the film was re-staged on the same sets
and re-voiced with three spoken lines. Nothing in the shot list was renumbered: the `warp` table carried every beat
and every sound cue onto the new voice.

![motion pass](img/proof-4-motion-pass.jpg)

| | v1 | v2 | Reference (3 videos) |
|---|---|---|---|
| Plain cuts / whips / flashes | 1 / 4 / 3 | 0 / 0 / 0 (dissolves and camera travel) | 0 |
| Full-frame changes detected | 8 in 44.5 s | 6 in 44.5 s | 3-5 in 56-65 s |
| Camera angles | eye level | low, eye, high; 35 of 45 framings tilted | low, eye, high, top-down; about a third tilted |
| Inserts and wides | none | 2 inserts, 1 far wide | 3-4 inserts, 1-3 wides |
| Hook | two people standing | a rat coming down on the desk in frame 0, camera pulling out | action in frame 0, camera moving |
| Spoken lines with mouth flap | 0 | 3 | 1-2 |
| Captions | 1-3 words at 66 %, pop | 1-2 words at 70 %, no pop | 1-2 words at 70 %, no pop |
| Empty share / sharpness | 0.12 / 174 | 0.13 / 197 | 0.20 / 189 |
| Sound gate | (not measured) | -14.1 LUFS, bed 11.1 dB under the voice, 3.72 words/s | -14 to -17 LUFS, 5.5-12.2 dB, 3.4-3.9 |

An independent reviewer scored the first render of v2: frame density 6.5, character staging 5.5, camera and edit
6.5, light and colour 7.5, drawing 6.5, acting 5, captions 7.5 (v1: 6, 5, n/a, 7, 6, 5, 6). Its one blocker (a chair
back cutting through the governor from the high angle) and five of its staging notes were fixed before the final
render, which was not re-scored.

What the reviewer still sees as the gap: characters swap poses but do not run, fall or lean with their whole body;
the camera pans and dissolves gently where the reference uses dramatic perspective and huge foreground heads; and
key gags could play larger still.
