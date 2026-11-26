---
name: cartoon-3d-short
description: Make a 30-70 s vertical cartoon story short in the "2D characters in a dressed 3D world" style (bean-head cartoon cards with thick ink outlines, dense painted 3D sets with lettered signs, light that changes with the story, word-by-word captions, a hold-and-burst camera, narration, music and effects), rendered with three.js inside Remotion on CPU or GPU. Use when the user asks for an animated story short, a history/science explainer short with cartoon characters, "a short like the rat tails / bridge video", or says "use the cartoon short skill".
---

# Cartoon story short (stage kit: three.js + Remotion)

Everything runs from `studio/`. A film is **two files**: its sets (`sets.ts`) and its shot list (`film.ts`). The
engine, props, characters, light, camera, captions and QA are shared and live in `studio/src/stage/` and
`studio/scripts/`.

- Worked examples: `studio/src/videos/carrots/` (10 s, passes every gate: the pattern to copy for framing with `fit()`), `studio/src/videos/vikings/` ("Late for Dinner", 47 s: every beat pinned to a word, the pattern to
  copy) and `studio/src/videos/rat-tails/` ("The Rat Tail Problem", 44.5 s: shows a re-voiced film carried by `warp`).
- Why the kit looks the way it does: `docs/style-gap-analysis.md`. The rules in short: `docs/style-rules.md`.
- Rendering on CPU, GPU and Modal: `docs/rendering.md`.
- The older bridge pipeline (post-processing look, GPU only) is kept in `templates/bridge/` and
  `docs/legacy-bridge-skill.md` for its look research. Do not start new films from it.

The reference frames in `references/` are private study material: never publish them, never copy their scripts,
characters, jokes, logos or audio. Learn the craft, make your own story.

## The ten rules that make the look

These are gates, not advice. Scripts check them without anyone's judgment, and one command runs them all in order
and stops at the first failure: `python3 scripts/make_short.py <film>` (see `docs/gates.md` for every check and its
threshold).

- `scripts/transcript_check.py`: the voice said the script; mis-heard spellings are repaired.
- `scripts/plan_lint.ts` (before rendering, 2 s): heads, cards and signs cut by the frame edge; a face behind another
  character or a prop; a sign behind the cast or under the caption; something right in front of the lens; lettering
  that can never be read; a sentence with nothing changing on screen; impacts without a sound; a weak last frame;
  plus cast size, cuts, angles, inserts, hook, captions and pace.
- `scripts/frame_qa.py` (after): empty frame share, sharpness, palette, moods, contrast, flat or grey shots, the
  last frame.
- `scripts/audio_qa.py`: loudness, music level under the voice, pauses, ending on the last word.

**Frame with `fit()`, not by hand.** `fit(subjects, { yaw, pitch, fill })` in `stage/frame.ts` returns a camera that
holds every subject whole inside the 9:16 frame: `cam: (f) => fit(cast(f), { yaw: 20, pitch: 8 })`. Typing camera
positions by hand is what cut people and signs in half in both proof films. A deliberate exception is declared, not
hidden: `crop: true` on a cast item that is meant to be cut (a foreground shoulder), `allow: ["FOR SALE", "lens"]`
on a shot.

1. **Fill the frame.** A 9:16 frame is only about 2.8 m wide when it shows 5 m of height, so stack the set
   vertically: lamp and pictures above, cast in the middle, named props on the floor in front. A set is not done until
   every third of the frame holds something with a name. No shot of bare ground and sky. Gate: empty share median
   at most 0.25.
2. **Cast big.** A character fills a third of the frame height or more in every story shot. Wide shots are for
   crowds and reveals, and last under 2 s. Faces sit above the caption line (the caption is at 66 % of the height).
3. **Change the light with the story.** At least three moods per film from `moods.ts` (day, golden, dusk, night,
   sewer, interior, explain). Put the light source in frame: a window, a lamp, a lantern, each with its pool.
4. **Keep the subject sharp.** No lens blur in this kit. Depth comes from overlap, fog and light pools.
5. **Write on things.** Signs, posters, crate labels, ledgers: at least one piece of lettering in most shots
   (`paint.sign`). The lettering carries jokes the narration does not say.
6. **Act on the word.** Every sentence gets one clear pose change, landing 0-3 frames before its word: a prop goes
   up, a face changes, something pops in. Use `pop()` (squash and settle over 7 frames) and `antic()` (a dip just
   before). Something is in a hand in most shots. Characters never just stand with arms down.
7. **One continuous take.** No hard cuts, ever. A new place or time dissolves in (`into: "dissolve"`, 8 frames);
   a new framing in the same place is one camera burst (`into: "move"`). The camera never stops (drift is built in)
   and moves in ease-out bursts (`track()`). Aim for 12-15 set-ups per minute.
8. **Vary the angle and the size.** Use low, eye-level and high angles in every film, tilt a quarter of the framings
   3-10 degrees (`roll`), and include at least one insert (a prop, a hand, a face filling the frame; `tag: "insert"`)
   and one far wide for scale (`tag: "wide"`). Put something in the foreground: a shoulder, a post, a bush.
9. **Open mid-action.** In frame 0 the thing the hook describes is already happening and the camera is already
   moving. Never open on characters standing.
10. **Let characters speak once or twice.** One to three short in-character lines per film, voiced by the narrator.
   Only those lines get a mouth flap (`talk()`); narration never does.

Rules 7-10 and the caption format were measured on three full reference videos: `docs/reference-motion.md`.

Captions are **on** by default: one or two words, bold white with a black outline, at 70 % of the height, hard
swaps with no pop. Turn them off
(`captions: false` on the film) only when the user asks.

## Pipeline

1. **Topic and facts.** One surprising true story with a physical or human cause and effect, that the channel you
   are learning from has not done. Write the facts with their source at the top of `SCRIPT.md` in the film folder.
   Every joke is a real fact or sits on a sign.
2. **Script.** 3.5-3.9 words per second, 30-70 s. Beats:
   hook (the paradox as a flat fact, first sentence) → setting → escalation in three or four beats → a turn
   ("Then somebody notices...") → "You see," and the mechanism → consequence → an ironic last line that ends the
   video. Never describe what the viewer already sees.
3. **Voice.** Write `audio/<film>/voice_text.txt` (one line per sentence group), then
   `python3 audio/voice.py <film> "names, odd words"`: Kokoro neural voice with pauses tightened to the reference
   pace, plus word times in `src/videos/<film>/words.json`. It ends with `scripts/transcript_check.py --fix`: a word the aligner
   mis-heard is rewritten from the script (the captions are made from `words.json`), and a word the voice dropped or
   added stops the run: reword that line. A recorded human voice is better: put it at `audio/<film>/voice.wav` and add
   `--align-only`.
4. **Shot list on paper first.** One line per sentence: place, mood, who is big in frame, what is in their hand,
   what changes on which word, what is written on screen, how the shot is entered. Check it against the seven rules
   before writing code.
5. **Sets** (`sets.ts`). Start from `room()`, `street()`, `tunnel()` or `field()` in `stage/sets.ts`, then `dress()`
   it from `stage/props.ts` (50+ props: crates with labels, barrels, desks, shelves full of books, lamps with light
   pools, windows, doors, posters, house fronts with awnings and shop signs, bunting, carts, palms, fences, huts,
   pipes, grates...). New props: compose `box`, `cyl`, `ball`, `card` and `inked()`; give every surface a painted
   texture from `stage/paint.ts`. Aim for 20-30 placed props per set. Things that change over time go in the set's
   `tick(f)`.
6. **Shots** (`film.ts`). Per shot: `a`, `b` (frames), `set`, `mood`, `cam` (framings from `fit()`, joined by
   `track()` when the camera moves within the shot), `cast`
   (people, rats or other creatures, effect cards, each a function of the frame), `into` and an optional `tag`.
   Pin every beat to a spoken word with a helper like `F("word", nth)` (see the example). If the voice is
   re-recorded later, do not renumber the shots: give the film a `warp` (old anchor frames → the new frames of the
   same words) and every beat, and every sound cue, follows.
7. **Lint the plan (no rendering).** `npx tsx scripts/plan_lint.ts <film>` builds the sets in node and plays the
   film through the engine's own camera code. It reports, with frame ranges, everything listed under the gates
   above. It takes two seconds: run it after every edit and fix every FAIL before rendering a single still. A
   defect has to last a third of a second to count, so a figure crossing the edge during a camera burst is fine.
8. **Stills, every shot.** `python3 scripts/make_short.py <film> --to stills` runs the transcript check, the type
   check and the lint, then renders one frame per shot plus the last frame (about 5 s each on CPU) into
   `out/<film>/stills.jpg`. **Look at it.** The lint checks geometry; you check that the picture tells the beat.
9. **Sound** (`audio/<film>/make.py`, built on `audio/kit.py`). `python3 audio/fetch_sfx.py` pulls CC0 effects
   from Freesound (credits file written automatically). In `make.py`, pin every cue to a word with `m.F("word")`,
   the same helper as in `film.ts`; `python3 audio/<film>/make.py` builds the score, places the effects and mixes:
   voice unchanged, music about 11 LU under it and ducked on speech, effects placed relative to the voice,
   -14 LUFS, true peak under -1 dB. Cue frames are mapped through `audio/warp.json`, which `plan_lint` writes.
   `make.py` also writes `cues.json`; `plan_lint --need-cues` then fails if a camera shake has no sound on its
   frame. `python3 scripts/make_short.py <film> --to sound` runs all of this and `audio_qa.py` on the mix.
10. **Render.** `node scripts/render.mjs <Comp> out/<film>.mp4 audio/<film>/mix.wav` (resumable chunks; about 3 s per
   frame at 1080x1920 on four CPU cores, far faster with `GL=angle-egl` on a GPU), or on Modal in parallel
   chunks. See `docs/rendering.md`.
11. **QA, required.** `python3 scripts/make_short.py <film>` (or `--video out/x.mp4` for a film rendered on
    Modal) runs every gate end to end and must finish with every step `pass`. Then read the sheet `out/<film>/film.jpg`
    yourself, and hand it to a reviewer agent that has not seen your plan, with `docs/style-rules.md` as
    its checklist. Fix what it finds and re-render the affected chunks (delete them from `out/chunks_*`).
12. **Deliver** the MP4 and a side-by-side sheet. Say plainly what still falls short.

## Kit map (`studio/src/stage/`)

| File | What it gives you |
|---|---|
| `Stage.tsx` | the engine: `Film`, `Shot`, `CastItem`; sets swapped per shot, mood lights, shadow-mapped key light, 2D cast as lens-facing cards with contact shadows, cross-dissolves and camera travel between shots, time `warp`, vignette, captions |
| `props.ts` | `inked()` (inverted-hull outline, constant width on screen), `box/cyl/ball/card`, `lightPool`, `contact`, and the prop library (indoor, street, farm, and a coast set: `longship`, `longhouse`, `dock`, `fishRack`, `campfire`, `pine`, `glacier`, `iceberg`, `rock`); `dress()` to place many at once |
| `sets.ts` | `room`, `street`, `tunnel`, `field`, `sea` (animated water, optional shore) |
| `paint.ts` | painted surfaces (planks, plaster with exposed brick, bricks, cobbles, tiles, dirt, grass, sand, stone) and `sign()` for lettering |
| `chars.ts` | `drawPerson(look, pose)`: 11 hats (incl. helmet, hood, fur), held props (incl. bowl, ladle), 8 eye types, 9 mouths, brows, curved limbs, walk cycle, side view, squash, lean; `talk` (mouth flap for a spoken line); `drawRat`; `blinkAt` |
| `moods.ts` | the nine light moods (day, golden, dusk, night, sewer, interior, fog, arctic, explain): sky, ambient, key, fog, cast tint, grade, vignette |
| `camera.ts` | `track` (hold + burst), `push`, `drift` (always on), `shake` |
| `frame.ts` | `fit()` (a camera that holds its subjects whole, by construction) and the screen geometry the engine and `plan_lint` share |
| `Captions.tsx` | word-by-word captions from `words.json` |
| `util.ts` | easing (`burst`, `overshoot`, `bump`), seeded random, colours, cached canvas textures |

After changing anything in `stage/`, run `python3 scripts/kit_test.py` (nine test frames against stored pictures,
about a minute) and `npx tsx scripts/lint_test.ts` (the lint against a film staged wrong on purpose).

To add a creature or a new kind of character, add a `draw…` function in `chars.ts` and a `kind` in `Stage.tsx`
(follow `rat`). To add a mood, add one line to `moods.ts`.

## Gotchas

- Sign textures are drawn once and cached by key: a font that is not loaded yet gives fallback lettering. The
  engine waits for the fonts in `public/fonts/` before building any set; keep new fonts there and load them in
  `useFonts`.
- `sign()` with a transparent background (`"#00000000"`) draws only the lettering: use it for stamps and effect cards.
- Cards (`card()`, cast) do not write depth. A card that must sit behind a 3D prop needs to be placed behind it in
  space, not just listed earlier.
- A person's canvas is redrawn only when its look or pose changes. Keep poses piecewise-constant between beats (that
  is also what reads best) and renders stay fast.
- The frame is narrow. Before placing two characters side by side, work out the visible width at their distance:
  `2 * dist * tan(fov/2) * 9/16`.
- A row of people (a ship's crew, a queue) is wider than a vertical frame from the side. Shoot along the row, from
  the bow or the stern, so they stack in depth; keep side views for one or two people.
- `plan_lint` knows the cast, effect cards and signs made with `framed()` or `poster()`. It does not know lettering
  you paint straight onto a prop, or how a pose reads: the stills are still yours to look at.
- Flags, uniforms and signs are period details: check them (the bridge short's first flag read as the wrong country).
- Every Remotion bundle copies `public/` into the temp folder. Keep `public/` small (fonts only) and it stays a non-issue.
