# Rendering

The stage kit has no post-processing passes, so the same project renders on a laptop CPU, a cloud container without
a GPU, or a GPU machine. Only the speed changes.

## Local, CPU only (the default)

```bash
cd studio
npm install
node scripts/stills.mjs RatTails out/s_ 60,150,300 0.5        # stills at half size, about 5 s each
node scripts/render.mjs RatTails out/rat-tails.mp4 audio/mix.wav
python3 scripts/frame_qa.py out/rat-tails.mp4 --sheet out/qa.jpg
```

- `render.mjs` renders 150-frame chunks into `out/chunks_<Comp>_<scale>/` and joins them. A killed render resumes
  where it stopped; to redo one shot, delete its chunk files and run again.
- Measured on 4 CPU cores with software WebGL (`gl: "swangle"`): about 3 s per frame at 1080x1920, so a 45 s short
  takes a little over an hour. `CONCURRENCY=4` uses all cores; do not run anything else heavy beside it.
- Chromium: the scripts use the Playwright headless shell under `/opt/pw-browsers` when it exists, otherwise
  Remotion's own download. Override with `CHROME=/path/to/chrome-headless-shell`.

For comparison, the older post-processing pipeline (`templates/bridge/`) measured 7.6 s per frame on the same
machine with every post pass switched off, and 11-20 s per frame at quarter size with them on.

## GPU machine

Set `GL=angle-egl` (Linux with an NVIDIA GPU) or `GL=angle` (macOS/Windows). Expect 10-30 frames per second.
For a 2K export pass a scale: `node scripts/render.mjs RatTails out/x.mp4 audio/mix.wav 1.3333`.

## Modal (parallel CPU containers)

The Modal Remotion workflow lives in the private `sitefarmDocs` repository (branch `claude/funny-volta-5klybo`:
`shorts/remotion/modal_remotion.py` and `.github/workflows/remotion-modal.yml`). To use it:

1. Copy `studio/` (without `node_modules`, `out` and the wav files) to `shorts/remotion/<project>/` on a branch
   based on that one. `studio/render.json` names the composition and the frame count; `scripts/render-chunk.mjs` is
   the entry the Modal script calls.
2. Upload the mix to R2 as `previews/<project>/mix.wav`.
3. Set the workflow's default `PROJECT` to your project on that branch and push with `[render]` in the commit message
   (or run the workflow by hand with the project as input).
4. Fetch `previews/<project>/<project>.mp4` from R2.

The Modal script renders 20-frame chunks on separate 8-vCPU containers, so a 45 s short is done in minutes.

A session needs that repository attached with push access. Without it, render locally: the result is identical.

## Sound

```bash
python3 audio/tts.py          # voice_text.txt -> voice24.wav (Kokoro; needs kokoro-v1.0.onnx and voices-v1.0.bin beside it)
python3 audio/align.py        # voice.wav -> words.json (faster-whisper small.en)
python3 audio/fetch_sfx.py    # CC0 effects from Freesound -> audio/sfx/ + CREDITS.md (FREESOUND_TOKEN)
python3 audio/make.py         # score + effects + mix -> audio/mix.wav, audio/cues.md
```

Python needs `numpy scipy soundfile kokoro-onnx faster-whisper pillow`. The Kokoro model files are about 350 MB
and are not committed: download `kokoro-v1.0.onnx` and `voices-v1.0.bin` from the kokoro-onnx GitHub releases.
