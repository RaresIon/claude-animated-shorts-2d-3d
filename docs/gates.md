# The gates

Every check below is a script with a fixed threshold and exit code 1 on failure. `python3 scripts/make_short.py <film>`
runs them in order and stops at the first one that fails.

| Step | Script | Fails when |
|---|---|---|
| transcript | `transcript_check.py --fix` | the voice dropped or added a word. Mis-heard spellings are repaired from the script; digits for number words are accepted. |
| types | `tsc --noEmit` | the film does not compile. |
| plan | `plan_lint.ts` | see below. Runs in about 2 s, no rendering. |
| stills | `frame_qa.py` on one frame per shot | frames too empty or too soft, before any full render. |
| cues | `plan_lint.ts --need-cues` | a camera shake has no sound cue within 3 frames. |
| mix, film sound | `audio_qa.py` | not -14 LUFS +/- 1.5, peak above -1 dB, bed not 5-12.5 dB under the voice, pace outside 3.3-4.1 words/s, a pause over 0.6 s, more than 0.8 s after the last word. |
| film frames | `frame_qa.py --plan` | see below. |

## plan_lint

It builds every set in node, plays the film at two-frame steps through the same camera code the engine uses
(`src/stage/frame.ts`), and projects every character, effect card and lettered sign onto the screen. A defect counts
when it lasts 10 frames, or at all in the last half second.

| Check | Rule |
|---|---|
| Head cut | a head (with hat) is between 3 % and 90 % inside the frame. |
| Headless | a body is in frame and its head is not. |
| Face hidden | the middle of a face sits behind a nearer character's head or torso, or a ray from the lens to it hits the set. |
| Face under caption | a head overlaps the caption box by 30 % or more while a caption is up. |
| Held item, raised hand | what a hand holds is outside the frame (8 % margin) or under the caption; a raised hand is outside the frame. |
| Card cut | an effect card or creature is cut by the edge: from 0.3 % of the frame when there are six or fewer, from 3 % in a swarm. |
| Hero prop | a prop marked with `props.hero(obj, "name")` is cut by the edge or under the caption while it covers 1 % of the frame. |
| Sign legibility | every lettered card counts, on walls, crates and shop fronts alike. A sign that ever covers 2 % of the frame must be readable for 0.3 s + 0.22 s per word (0.5 to 2 s; 0.35 s for a single digit or mark): largest line 26 px high or more (of 1920), whole, not behind the cast or the set, not under the caption. |
| Lens | 4 of 144 rays from the lens hit something upright within 0.8 m. |
| Ground | the camera is under 8 cm high. |
| Flicker | two solid flat faces of different paint lie in one plane (within 1.5 mm), face the same way, share 200 cm2 or more and are not pressed against something. Checked once per set on boxes and planes. Cards cannot flicker: `props.card()` carries a polygon offset. |
| Camera jump | inside a shot the camera changes framing in a single frame. |
| Teleport | a character moves more than 0.6 m in one frame (a warning when a camera burst hides it). |
| Beats | a sentence of 0.8 s or more has no pose change, card, camera burst or new shot. |
| Impacts | a camera shake has no cue in `cues.json` within 3 frames (card pops: warning). |
| Ending | the biggest character in the last frame is under 25 % of the frame height. |
| Cast size | the biggest character in a shot is under 30 % of the frame height (untagged, non-crowd shots). |
| Dead shot | nothing changes in a shot longer than 2 s. |
| Edit | any hard cut or whip; "move" across sets; more than two flashes or dips; shots not covering the film. |
| Variety | fewer than 3 moods, fewer than 3 camera angles, under a quarter of framings tilted, no insert, no wide (relaxed under 20 s). |
| Hook | camera still in the first half second, or nothing happening in the first ten frames. |
| Captions, pace | over 10 % of captions longer than 2 words; narration outside 3.3-4.1 words/s. |

Waivers are written in the film and printed by the lint: `crop: true` on a cast item, `allow: [...]` on a shot.

## frame_qa

| Check | Rule | Measured |
|---|---|---|
| Empty | median empty share at most 0.25; at most 10 % of frames above 0.55 | reference 0.20, Emu shorts 0.45 and 0.56 |
| Sharp | median sharpness 60 or more | reference 189, Emu POV 13 |
| Palette | median 3 hue families or more | reference 4 |
| Moods | 3 or more (films over 20 s) | |
| Contrast | weakest tenth of frames has a luma spread of 0.30 or more | reference 0.30-0.43, Emu POV 0.25 |
| Flat shot | a shot's median luma spread is under 0.40 (needs `--plan`) | |
| Grey night | a night, dusk or sewer shot has darkest tones above 0.16 or a mean above 0.45 | |
| Last frame | more than 45 % empty, or soft | |

## What the gates cannot see

Whether a joke lands, whether a pose reads, whether a sentence's key noun is pictured, a prop popping in mid-shot,
a large blank surface holding the frame, originality. The stills sheet and
an independent reviewer are still required (`docs/style-rules.md`).

## Tests of the tooling itself

- `npx tsx scripts/lint_test.ts`: a fixture film staged wrong on purpose must produce nine named failures, and the same
  film framed with `fit()` must pass.
- `python3 scripts/kit_test.py`: nine frames covering the sets, moods, hats, held props and prop library, compared with
  stored pictures in `studio/test/golden/`.

## Where the example films stand

- `carrots` (10 s) was made with these gates and passes all of them. How it compares with the same film made
  without them: `docs/experiment-gates.md`.
- `vikings` (47 s) was reframed with `fit()` after these checks existed and passes all of them with no waivers.
- `rat-tails` was made before `plan_lint` checked edges, occlusion and legibility, and still fails it (about 50
  failures). It is left as delivered, as a record: do not use it as a pattern for framing.
