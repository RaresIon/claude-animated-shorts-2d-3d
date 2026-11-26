import json, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
audio = np.fromfile("v16.raw", dtype=np.int16).astype(np.float32) / 32768
segs, _ = m.transcribe(audio, word_timestamps=True, beam_size=5, initial_prompt="Hanoi, nineteen-oh-two, the French, rat catchers, rat's tail")
words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for s in segs for w in s.words]
json.dump(words, open("words.json", "w"))
print(" ".join(f'{w["w"]}@{w["s"]:.2f}' for w in words))
