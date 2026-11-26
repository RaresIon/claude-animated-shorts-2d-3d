#!/usr/bin/env python3
"""Sound gates, measured the same way on three full reference videos (docs/reference-motion.md).

  python3 scripts/audio_qa.py out/film.mp4 src/videos/<film>/words.json     (a .wav mix works too)

  loudness   integrated -14 LUFS +/- 1.5, true peak under -1 dB   (reference: -14.2 to -16.7 as re-encoded)
  bed        music + effects in the gaps between words sit 5-12 dB under the speech level (reference 5.5 / 8.9 / 12.2)
  pace       3.3-4.1 words per second                              (reference 3.4 / 3.8 / 3.9)
  pauses     no gap between words longer than 0.6 s                (reference longest 0.34-0.54 s)
  ending     the film ends within 0.8 s of the last word           (reference: ends on the last word)
Exit code 1 when a gate fails."""
import json, re, subprocess, sys
import numpy as np
SR = 22050
src, wpath = sys.argv[1], sys.argv[2]
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ar", str(SR), "-ac", "1", "-f", "s16le", "-"], capture_output=True).stdout
a = np.frombuffer(raw, np.int16).astype(np.float64) / 32768
words = json.load(open(wpath))
hop = SR // 50; n = len(a) // hop
db = 20 * np.log10(np.sqrt((a[: n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12) + 1e-9)
sp = np.zeros(n, bool)
for w in words: sp[int(w["s"] * 50): int(w["e"] * 50) + 1] = True
gaps, i, last = [], int(words[0]["s"] * 50), int(words[-1]["e"] * 50)
while i < last:
    if not sp[i]:
        j = i
        while j < last and not sp[j]: j += 1
        if j - i >= 12: gaps.append((i + 3, j - 3))
        i = j
    else: i += 1
bed = np.median(np.concatenate([db[i:j] for i, j in gaps])) if gaps else float("nan")
speech = np.median(db[sp]); under = speech - bed
e = subprocess.run(["ffmpeg", "-i", src, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
tail = e[e.rfind("Summary:"):]
lufs = float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail).group(1)); peak = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail).group(1))
dur = len(a) / SR; wps = len(words) / (words[-1]["e"] - words[0]["s"])
longest = max(words[k + 1]["s"] - words[k]["e"] for k in range(len(words) - 1)); end = dur - words[-1]["e"]
print(f"loudness {lufs:.1f} LUFS, peak {peak:.1f} dB | bed {under:.1f} dB under speech ({len(gaps)} gaps) | {wps:.2f} words/s | longest pause {longest:.2f} s | {end:.2f} s after the last word")
fails = []
if abs(lufs + 14) > 1.5: fails.append(f"loudness {lufs:.1f} LUFS is not -14 +/- 1.5")
if peak > -1.0: fails.append(f"true peak {peak:.1f} dB is above -1")
if gaps and not (5 <= under <= 12.5): fails.append(f"music/effects bed is {under:.1f} dB under the voice (want 5-12)")
if not (3.3 <= wps <= 4.1): fails.append(f"pace {wps:.2f} words/s (want 3.3-4.1)")
if longest > 0.6: fails.append(f"a {longest:.2f} s pause in the narration (max 0.6)")
if end > 0.8: fails.append(f"{end:.1f} s of film after the last word (end on the word)")
for f in fails: print("FAIL:", f)
print("PASS" if not fails else f"{len(fails)} gate(s) failed"); sys.exit(1 if fails else 0)
