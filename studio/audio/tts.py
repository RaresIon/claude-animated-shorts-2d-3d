import soundfile as sf, numpy as np, json
from kokoro_onnx import Kokoro
k = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
lines = [l.strip() for l in open("voice_text.txt") if l.strip()]
out = []; sr = 24000
for i, l in enumerate(lines):
    a, sr = k.create(l, voice="am_michael", speed=1.28, lang="en-us")
    # trim edges, squeeze inner pauses > 0.22 s to 0.16 s
    env = np.abs(a); w = int(sr*0.01)
    e = np.convolve(env, np.ones(w)/w, "same") > 0.012
    idx = np.where(e)[0]; a = a[max(0, idx[0]-int(.02*sr)): idx[-1]+int(.05*sr)]; e = e[max(0, idx[0]-int(.02*sr)): idx[-1]+int(.05*sr)]
    keep = np.ones(len(a), bool); j = 0
    while j < len(a):
        if not e[j]:
            q = j
            while q < len(a) and not e[q]: q += 1
            if q - j > int(.22*sr): keep[j+int(.08*sr): q-int(.08*sr)] = False
            j = q
        else: j += 1
    a = a[keep]
    out.append(a); out.append(np.zeros(int(sr*(0.20 if i < len(lines)-1 else 0.5)), np.float32))
a = np.concatenate([np.zeros(int(sr*0.08), np.float32)] + out)
sf.write("voice24.wav", a, sr); print(len(a)/sr, sum(len(l.split()) for l in lines)/(len(a)/sr))
