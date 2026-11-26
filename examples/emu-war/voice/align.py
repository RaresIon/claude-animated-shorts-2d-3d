import json, re
from faster_whisper import WhisperModel
m = WhisperModel("base.en", device="cpu", compute_type="int8")
import numpy as np
audio = np.fromfile("v16.raw", dtype=np.int16).astype(np.float32) / 32768
segs, _ = m.transcribe(audio, word_timestamps=True, beam_size=5, initial_prompt="emu, Major Meredith, bullet-carrying, kilometres")
words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for s in segs for w in s.words]
json.dump(words, open("words.json", "w"), indent=0)
for i, w in enumerate(words): print(i, f'{w["s"]:.2f}', f'{int(w["s"]*30)}', w["w"])
