# Style rules (reviewer checklist)

Use this list when reviewing a contact sheet of a short made with the stage kit. Each rule comes from a measured
difference between the reference and our earlier shorts (`docs/style-gap-analysis.md`). Answer every line with
"ok" or a frame time and what is wrong.

## Frame
- [ ] No frame is mostly bare ground, bare wall or sky. (`frame_qa.py`: empty median ≤ 0.25, at most 10 % of frames above 0.55.)
- [ ] The top third, middle third and bottom third each hold something with a name.
- [ ] The main character fills at least a third of the frame height in every story shot.
- [ ] Nobody and no sign is cut in half by the frame edge unless it is a deliberate foreground.
- [ ] No face, hand prop or sign sits under the caption (caption centre at 70 % of the height).
- [ ] The subject is sharp in every frame.

## Light and colour
- [ ] At least three clearly different light moods, each change tied to a story beat.
- [ ] A light source is visible in most interior and night shots, with its pool on the floor or wall.
- [ ] Darks are dark: night and interior shots are not grey.

## Drawing
- [ ] Every outline is the same plum-black ink, thick on characters, thinner on props.
- [ ] Every surface has painted detail (seams, grain, chips). No flat-colour boxes.
- [ ] Most shots contain lettering that is spelled right and readable at phone size.
- [ ] Each character is told apart by a hat and a coat colour, and holds something in most shots.

## Acting and motion
- [ ] Every sentence has one pose change that lands on or just before its key word.
- [ ] Pose changes pop (squash and settle), they do not slide.
- [ ] Something other than the cast moves in most shots (a pile grows, a stamp lands, rats run).
- [ ] Blinks happen; nobody stares for a whole shot.

## Camera and edit
- [ ] No hard cuts. New places dissolve in; new framings in the same place are one camera move.
- [ ] The camera never sits dead still, and moves in short ease-out bursts.
- [ ] Low, eye-level and high angles all appear; about a quarter of framings are tilted.
- [ ] At least one insert (prop, hand or face filling the frame) and one far wide.
- [ ] Most shots have something in the foreground.
- [ ] 12-15 set-ups per minute. No shot under 0.8 s unless it is a punchline insert.
- [ ] In frame 0 the hook's action is already happening and the camera is moving.
- [ ] One to three in-character spoken lines, each with a mouth flap; no mouth moves under narration.
- [ ] The video ends on the last word, on the strongest picture.

## Captions and sound
- [ ] Captions are on, one or two words, at 70 % of the height, in sync with the voice, no pop.
- [ ] The voice is clear over the music everywhere; -14 LUFS overall.
- [ ] Every visible impact, pop and coin has a sound on the same frame.
- [ ] Effects are CC0 or made by us, and `audio/sfx/CREDITS.md` lists them.

## Originality
- [ ] The story, characters, jokes and signs are ours. Nothing is copied from the reference channel.
- [ ] Every fact in the narration has a source in `SCRIPT.md`.
