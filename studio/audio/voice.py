#!/usr/bin/env python3
"""Voice for a film, in one step:  python3 audio/voice.py <film> ["hint words for the aligner"]

  audio/<film>/voice_text.txt  ->  audio/<film>/voice.wav        (Kokoro neural voice, one line of text per sentence group)
                                   audio/<film>/lines.json       (start/end of every line: exact, from the synthesis)
                                   src/videos/<film>/words.json  (start/end of every word: faster-whisper)
Pauses longer than 0.22 s inside a line are tightened to 0.16 s and lines are 0.2 s apart, which lands at the
reference pace of 3.4-3.9 words per second. It ends by running scripts/transcript_check.py --fix: mis-heard
spellings are repaired from the script, and a dropped or added word stops the run (reword the line). Needs kokoro-v1.0.onnx and voices-v1.0.bin in audio/ (docs/rendering.md).
A recorded human voice is better: put it at audio/<film>/voice.wav and run with --align-only."""
import json, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
film = sys.argv[1]; hint = next((a for a in sys.argv[2:] if not a.startswith("--")), "")
D = os.path.join(HERE, film); VOICE, SPEED = os.environ.get("VOICE", "am_michael"), float(os.environ.get("SPEED", "1.28"))
if "--align-only" not in sys.argv:
    import soundfile as sf
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(HERE, "kokoro-v1.0.onnx"), os.path.join(HERE, "voices-v1.0.bin"))
    lines = [l.strip() for l in open(os.path.join(D, "voice_text.txt")) if l.strip()]
    out, marks, sr = [], [], 24000; pos = int(sr * 0.08)
    for i, l in enumerate(lines):
        a, sr = k.create(l, voice=VOICE, speed=SPEED, lang="en-us")
        w = int(sr * 0.01); e = np.convolve(np.abs(a), np.ones(w) / w, "same") > 0.012; idx = np.where(e)[0]
        lo, hi = max(0, idx[0] - int(.02 * sr)), idx[-1] + int(.05 * sr); a, e = a[lo:hi], e[lo:hi]
        keep = np.ones(len(a), bool); j = 0
        while j < len(a):
            if not e[j]:
                q = j
                while q < len(a) and not e[q]: q += 1
                if q - j > int(.22 * sr): keep[j + int(.08 * sr): q - int(.08 * sr)] = False
                j = q
            else: j += 1
        a = a[keep]; gap = int(sr * (0.20 if i < len(lines) - 1 else 0.4))
        marks.append({"text": l, "s": round(pos / sr, 3), "e": round((pos + len(a)) / sr, 3)}); pos += len(a) + gap
        out += [a, np.zeros(gap, np.float32)]
    raw = os.path.join(D, "voice24.wav"); sf.write(raw, np.concatenate([np.zeros(int(sr * 0.08), np.float32)] + out), sr)
    json.dump(marks, open(os.path.join(D, "lines.json"), "w"), indent=1)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", "highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=3,loudnorm=I=-16:TP=-1.5:LRA=7", "-ar", "48000", "-ac", "1", os.path.join(D, "voice.wav")], check=True)
    os.remove(raw)
from faster_whisper import WhisperModel
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(D, "voice.wav"), "-ar", "16000", "-ac", "1", "-f", "s16le", "-"], capture_output=True).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
segs, _ = WhisperModel("small.en", device="cpu", compute_type="int8").transcribe(audio, word_timestamps=True, beam_size=5, initial_prompt=hint or None)
words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for s in segs for w in s.words]
dst = os.path.join(HERE, "..", "src", "videos", film); os.makedirs(dst, exist_ok=True)
json.dump(words, open(os.path.join(dst, "words.json"), "w"))
print(" ".join(w["w"] for w in words))
print(f"{len(words)} words, {len(audio) / 16000:.1f} s, {len(words) / (words[-1]['e'] - words[0]['s']):.2f} words/s")
# the aligner mis-hears names: repair spellings from the script, and stop if the voice dropped or added a word
if os.path.exists(os.path.join(D, "voice_text.txt")): sys.exit(subprocess.run([sys.executable, os.path.join(HERE, "..", "scripts", "transcript_check.py"), film, "--fix"]).returncode)
