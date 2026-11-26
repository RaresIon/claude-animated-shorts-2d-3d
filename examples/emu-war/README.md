# The War I Won — the 1932 Emu War, told by an emu

A ~61 s vertical short made with the cartoon-3D-short skill in this repo (`SKILL.md`), started from `templates/bridge/`.

| Path | What |
|---|---|
| `SCRIPT.md` | facts + sources, and the voice-over |
| `src/emu/` | the short: goes to `src/videos/emu/` of a Remotion project. `story.ts` (36 shots timed to the words, cameras, DOF), `world.ts` (outback plain, wheat field + fence, farmhouse, windpump, dam, army truck, Lewis guns, crates, brass pile), `cast.ts` (who is where per shot), `bird.ts` (the emu cast: side/front views, walk/run/peck/kick/lookout poses, rabbits, bullets, muzzle flashes), `toon.ts` (+ Australian slouch hat, bush hat, officer's peaked cap) |
| `voice/` | text, word timings (`words.json`, faster-whisper) — the voice is Piper TTS `en_US-ryan-high`, length scale 0.92 |
| `audio/make.py` | original bush-band march (tuba, banjo, fife, field snare) + synthesized SFX + mix (voice unchanged, music +3 dB, SFX −6 dB, −14 LUFS); needs `dsp.py`, `instruments.py`, `sfx_gen.py` from `templates/audio/` |
| `scripts/chunks.mjs` | resumable chunked render (60-frame chunks) for CPU-only machines |

CPU-only note (no GPU, SwiftShader WebGL): the render is fill-rate bound — about 11 s/frame at 540x960 with ink + MSAA 2,
~20 s/frame with the lens blur on. This version renders at 540x960 (`post.dpr` 0.5) and is upscaled to 1080x1920.
MSAA 0 breaks the lens-blur pass (blank frames), so keep MSAA >= 2. Bloom only runs on golden shots, lens blur only
when the shot's `cInf` > 0.

Final render: done on a Modal L4 GPU (Chromium `gl: "angle-egl"`) at the skill's full spec (1440x2560, MSAA 4, full lens
blur) in ~25 min including the image build. The Modal app and its branch-only workflow live in RaresIon/sitefarmDocs on
branch `claude/emu-war-remotion-modal` (`remotion/modal_emu.py`, `.github/workflows/emu-war-render.yml`).
