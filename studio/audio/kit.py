"""Sound kit for a film's audio/<film>/make.py: one Mix object that places music and effects on picture frames and
writes the mix. Every cue is given as a frame; frames come from words (`m.F("word", nth, offset)`), exactly as in
film.ts, and are passed through audio/<film>/warp.json (written by scripts/plan_lint.ts) so a re-recorded voice moves
the sound with the picture.

    from kit import Mix, G, I
    m = Mix(__file__)                        # loads voice.wav, words.json, warp.json of this film
    m.bar(m.fr(0), "Dm"); m.tune(...); m.stab(m.fr(m.F("land")), "F")
    m.ev(m.F("coin"), "coin", -9, "the coin")          # a CC0 sample from audio/sfx, or any numpy signal
    m.bed(a, b, "crickets", -24, "evening")
    m.finish()                               # voice unchanged, bed about 11 LU under it and ducked, -14 LUFS"""
import json, os, re, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "templates", "audio"))
from dsp import SR, ns, rng, dbg, lp, hp, pan, st, place, make_ir, convolve_st, integrated, momentary_max, read_wav, write_wav, true_peak  # noqa: E402
import instruments as I  # noqa: E402
import sfx_gen as G  # noqa: E402

FPS = 30
CH = {"Dm": [38, 50, 53, 57], "Gm": [43, 50, 55, 58], "A7": [45, 49, 52, 55], "Bb": [46, 50, 53, 58], "F": [41, 48, 53, 57], "C": [36, 48, 52, 55], "D": [38, 50, 54, 57], "G": [43, 50, 55, 59], "Am": [45, 48, 52, 57], "Em": [40, 47, 52, 55]}


class Mix:
    def __init__(self, make_file, seed=7):
        self.dir = os.path.dirname(os.path.abspath(make_file)); self.film = os.path.basename(self.dir)
        self.words = json.load(open(os.path.join(HERE, "..", "src", "videos", self.film, "words.json")))
        self.warp = json.load(open(os.path.join(self.dir, "warp.json")))
        self.total = self.warp["to"][-1]; self.N = ns(self.total / FPS)
        self.voice = st(read_wav(os.path.join(self.dir, "voice.wav"))[0]); self.vref = integrated(self.voice)
        self.mus = np.zeros((2, self.N)); self.sfx = np.zeros((2, self.N)); self.cues = []
        self._r = rng(seed)

    def rr(self): return rng(int(self._r.integers(1 << 30)))
    def fr(self, f): return float(np.interp(f, self.warp["from"], self.warp["to"])) / FPS
    def F(self, w, n=0, d=0):
        """frame of the n-th occurrence of a spoken word, plus an offset (the same helper as in film.ts)"""
        m = [x for x in self.words if re.sub(r"[^a-z0-9']", "", x["w"].lower()) == w]
        return round(m[n]["s"] * FPS) + d

    # ---- music
    def bar(self, t0, ch, vel=0.6, tuba=True, pizz=True, brush=True, beats=4, q=0.25):
        c = CH[ch]
        for b in range(beats):
            t = t0 + b * 2 * q
            if tuba: place(self.mus, pan(I.brass(I.m2f(c[0] if b % 2 == 0 else c[0] + 7), 0.2, 0.55 * vel, self.rr(), "tuba"), -0.1), t, 0.5)
            if pizz:
                for k, m in enumerate(c[1:]): place(self.mus, pan(I.pluck(I.m2f(m + 12), 0.5 * vel, self.rr(), 0.35, 0.6), 0.3), t + q + k * 0.008, 0.3)
            if brush and b % 2: place(self.mus, pan(I.brush(0.35 * vel, self.rr()), 0.15), t, 0.45)
    def tune(self, t0, notes, vel=0.5, inst="glock", q=0.25):
        for (b, m) in notes:
            x = I.glock(I.m2f(m), vel, self.rr(), 0.9) if inst == "glock" else I.fife(I.m2f(m), q * 1.6, vel, self.rr()) if inst == "fife" else I.pluck(I.m2f(m), vel, self.rr(), 0.5, 0.7)
            place(self.mus, pan(x, -0.25), t0 + b * q, 0.3)
    def stab(self, t, ch, vel=0.8, cym=True):
        for m in CH[ch][1:]: place(self.mus, pan(I.brass(I.m2f(m + 12), 0.3, vel, self.rr(), "stab"), 0), t, 0.22)
        place(self.mus, pan(I.brass(I.m2f(CH[ch][0]), 0.4, vel, self.rr(), "tuba"), 0), t, 0.5); place(self.mus, I.timpani(I.m2f(CH[ch][0] + 12), vel, self.rr()), t, 0.35)
        if cym: place(self.mus, I.cymbal(0.45, self.rr()), t, 0.2)
    def note(self, t, x, gain=0.35, p=0.0): place(self.mus, x if np.ndim(x) == 2 else pan(x, p), t, gain)

    # ---- effects
    def load(self, name): return st(read_wav(os.path.join(HERE, "sfx", name + ".wav"))[0])
    def ev(self, f, x, lu, name, p=0.0, speed=1.0):
        """place an effect at frame f so its loudest moment sits `lu` LU relative to the voice"""
        x = self.load(x) if isinstance(x, str) else (st(x) if np.ndim(x) == 2 else pan(x, 0))
        if speed != 1.0:
            idx = np.arange(0, x.shape[1] - 1, speed); x = np.stack([np.interp(idx, np.arange(x.shape[1]), c) for c in x])
        m = momentary_max(np.concatenate([x, np.zeros((2, ns(0.5)))], 1))
        x = np.nan_to_num(x)
        if np.isfinite(m): x = x * dbg(self.vref + lu - m)
        if p: x = x * np.array([[1 - max(0, p)], [1 + min(0, p)]])
        place(self.sfx, x, self.fr(f)); self.cues.append((f, name))
    def bed(self, f0, f1, x, lu, name):
        x = self.load(x) if isinstance(x, str) else st(x); n = ns(self.fr(f1) - self.fr(f0)); x = np.tile(x, (1, n // x.shape[1] + 1))[:, :n]
        lvl = integrated(x)
        if not np.isfinite(lvl): print("skipped a silent bed:", name); return
        x = np.nan_to_num(x * dbg(self.vref + lu - lvl)); k = min(ns(0.25), n // 3); x[:, :k] *= np.linspace(0, 1, k); x[:, -k:] *= np.linspace(1, 0, k)
        place(self.sfx, x, self.fr(f0)); self.cues.append((f0, name + " (bed)"))
    def steps(self, dur, rate, scuff=0.4):
        r = self.rr(); x = np.zeros(ns(dur + 0.3))
        for k in range(int(dur * rate)): y = G.stroll_step(r, scuff); i = ns(k / rate); x[i:i + len(y)] += y[: len(x) - i]
        return x
    def crackle(self, dur, dens=40):
        r = self.rr(); x = np.zeros(ns(dur)); t = np.arange(ns(0.03)) / SR
        for k in range(int(dur * dens)): y = hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.004) * r.random(); i = ns(r.random() * (dur - 0.04)); x[i:i + len(y)] += y
        return x

    # ---- mix
    def finish(self, bed_under=11.0):
        voice, N = self.voice, self.N
        env = np.abs(voice).max(0); k = ns(0.02); env = np.convolve(env, np.ones(k) / k, "same"); gate = (env > 0.02).astype(float)
        a = ns(0.25); gate = np.convolve(gate, np.ones(a) / a, "same").clip(0, 1)
        if voice.shape[1] < N: voice = np.concatenate([voice, np.zeros((2, N - voice.shape[1]))], 1); gate = np.concatenate([gate, np.zeros(N - len(gate))])
        voice, gate = voice[:, :N], gate[:N]
        mus = convolve_st(self.mus, make_ir(0.9, 7)) * 0.2 + self.mus
        mus = mus * dbg(self.vref - bed_under - integrated(mus)) * (1.0 - 0.45 * gate)[None, :] * 1.6
        mix = voice + np.nan_to_num(mus) + np.nan_to_num(self.sfx)
        for _ in range(4):
            mix = mix * dbg(-14.0 - integrated(mix)); c = dbg(-1.5)
            mix = np.where(np.abs(mix) > c * 0.7, np.sign(mix) * (c * 0.7 + c * 0.3 * np.tanh((np.abs(mix) - c * 0.7) / (c * 0.3))), mix)
        mix[:, -ns(0.05):] *= np.linspace(1, 0, ns(0.05))
        write_wav(os.path.join(self.dir, "mix.wav"), mix)
        json.dump([{"f": int(f), "name": n} for f, n in sorted(self.cues)], open(os.path.join(self.dir, "cues.json"), "w"))  # read by plan_lint: impacts need a cue
        open(os.path.join(self.dir, "cues.md"), "w").write("# Cue sheet (frame @30 fps, time, what)\n\n" + "\n".join(f"- {int(f):4d}  {self.fr(f):6.2f} s  {n}" for f, n in sorted(self.cues)) + "\n")
        print("mix LUFS", round(integrated(mix), 2), "true peak", round(true_peak(mix), 2), "length", round(mix.shape[1] / SR, 2), "s")
