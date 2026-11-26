"""Sound for "The Rat Tail Problem": original sneaky-pizzicato score + CC0 effects (audio/sfx, see fetch_sfx.py) +
the mix under the voice. Every cue is a picture frame from src/videos/rat-tails/film.ts, so effects land on the pose
change they belong to. Run: python3 audio/make.py  ->  audio/mix.wav (48 kHz stereo, exact film length, -14 LUFS)."""
import os, sys, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "templates", "audio"))
from dsp import SR, ns, rng, dbg, lp, hp, pan, st, place, fades, make_ir, convolve_st, integrated, momentary_max, read_wav, write_wav, true_peak
import instruments as I
import sfx_gen as G

FPS, TOTAL = 30, 1335
N = ns(TOTAL / FPS)
fr = lambda f: f / FPS
F = I.m2f
R = rng(1902)
rr = lambda: rng(int(R.integers(1 << 30)))

# ------------------------------------------------------------------ music
mus = np.zeros((2, N))
Q = 0.25  # an eighth note at 120 bpm
CH = {"Dm": [38, 50, 53, 57], "Gm": [43, 50, 55, 58], "A7": [45, 49, 52, 55], "Bb": [46, 50, 53, 58], "F": [41, 48, 53, 57], "C": [36, 48, 52, 55], "D": [38, 50, 54, 57], "G": [43, 50, 55, 59]}
def bar(t0, ch, vel=0.6, tuba=True, pizz=True, brush=True, beats=4):
    c = CH[ch]
    for b in range(beats):
        t = t0 + b * 2 * Q
        if tuba: place(mus, pan(I.brass(F(c[0] if b % 2 == 0 else c[0] + 7), 0.2, 0.55 * vel, rr(), "tuba"), -0.1), t, 0.5)
        if pizz:
            for k, m in enumerate(c[1:]): place(mus, pan(I.pluck(F(m + 12), 0.5 * vel, rr(), 0.35, 0.6), 0.3), t + Q + k * 0.008, 0.3)
        if brush and b % 2: place(mus, pan(I.brush(0.35 * vel, rr()), 0.15), t, 0.45)
def tune(t0, notes, vel=0.5, inst="glock"):
    for (b, m) in notes:
        x = I.glock(F(m), vel, rr(), 0.9) if inst == "glock" else I.pluck(F(m), vel, rr(), 0.5, 0.7)
        place(mus, pan(x, -0.25), t0 + b * Q, 0.3)
def stab(t, ch, vel=0.8, cym=True):
    for m in CH[ch][1:]: place(mus, pan(I.brass(F(m + 12), 0.3, vel, rr(), "stab"), 0), t, 0.22)
    place(mus, pan(I.brass(F(CH[ch][0]), 0.4, vel, rr(), "tuba"), 0), t, 0.5); place(mus, I.timpani(F(CH[ch][0] + 12), vel, rr()), t, 0.35)
    if cym: place(mus, I.cymbal(0.45, rr()), t, 0.2)
SNEAK = [(0, 74), (2, 77), (3, 76), (4, 74), (6, 69), (8, 70), (10, 74), (11, 72), (12, 70), (14, 69)]
HAPPY = [(0, 74), (1, 78), (2, 81), (4, 83), (6, 81), (8, 79), (10, 78), (12, 76), (14, 74)]
BAR = 8 * Q  # 2 s
# hook 0-3.8 s: sneaky vamp, stop, sting on "more rats"
for i in range(2): bar(i * BAR, ["Dm", "Gm"][i], 0.5, brush=False, beats=4 if i == 0 else 3)
stab(fr(114), "A7", 0.85)
# street ceremony 5.6-8.9: bright major
t = fr(169)
for i in range(2): bar(t + i * BAR * 0.82, ["D", "G"][i], 0.6, beats=3); tune(t + i * BAR * 0.82, HAPPY[: 6], 0.45)
stab(fr(226), "D", 0.6)
# sewer 8.9-17.4: sneaky theme, low
t = fr(268)
for i in range(4): bar(t + i * BAR, ["Dm", "Gm", "Bb", "A7"][i], 0.5, brush=i > 0); tune(t + i * BAR, SNEAK, 0.4, "pluck" if i % 2 else "glock")
place(mus, pan(I.brass(F(50), 0.7, 0.5, rr(), "horn", fall=-5), 0.1), fr(499), 0.35)  # "it wasn't enough": horn droop
# new plan + tails pour in 17.4-23.9: bouncy, building
t = fr(522)
for i in range(3): bar(t + i * BAR, ["F", "C", "F"][i], 0.6); tune(t + i * BAR, HAPPY if i else HAPPY[:5], 0.45)
bar(t + 3 * BAR, "C", 0.7, beats=2); stab(fr(700), "F", 0.6)
# something odd 23.9-27.7: music thins to a tick-tock, stops on "Rats."
t = fr(716)
for k in range(9): place(mus, pan(I.pluck(F([62, 57][k % 2]), 0.45, rr(), 0.4, 0.4), 0.2), t + k * 2 * Q, 0.4)
stab(fr(786), "A7", 0.6, cym=False)
# you see 27.7-33.8: music-box explanation
t = fr(830)
for i in range(3):
    c = CH[["Dm", "Bb", "Gm"][i]]
    for b in range(8): place(mus, pan(I.musicbox(F(c[1 + b % 3] + 12), 0.45, rr()), 0.2 * (-1) ** b), t + i * BAR + b * Q, 0.3)
    place(mus, pan(I.brass(F(c[0]), 1.6, 0.35, rr(), "soft"), 0), t + i * BAR, 0.4)
for k in range(11): place(mus, I.glock(F(74 + [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17][k]), 0.4, rr(), 0.6), fr(946 + k * 4.2), 0.25)  # one note per baby rat
# farm 33.8-39.8: creeping, then the reveal sting
t = fr(1013)
for k in range(9): place(mus, pan(I.pluck(F([38, 41, 45][k % 3]), 0.5, rr(), 0.5, 0.3), 0.15), t + k * 2 * Q * 0.56, 0.45)
stab(fr(1092), "Bb", 0.9)
t = fr(1123)
for i in range(1): bar(t, "Gm", 0.55); tune(t, SNEAK, 0.4, "pluck")
# cancelled: drum hit; payoff: slow sad waltz, trombone fall on "more"
place(mus, I.timpani(F(38), 0.9, rr()), fr(1212), 0.5)
t = fr(1241)
for i in range(3):
    c = CH[["Dm", "Gm", "A7"][i]]
    place(mus, pan(I.brass(F(c[0]), 0.9, 0.5, rr(), "tuba"), -0.1), t + i * 1.0, 0.5)
    for k, m in enumerate(c[1:]): place(mus, pan(I.pluck(F(m + 12), 0.4, rr(), 0.5, 0.6), 0.3), t + i * 1.0 + 0.33 + k * 0.01, 0.3); place(mus, pan(I.pluck(F(m + 12), 0.35, rr(), 0.5, 0.6), 0.3), t + i * 1.0 + 0.66 + k * 0.01, 0.3)
for k, m in enumerate([65, 64, 62]): place(mus, pan(I.brass(F(m - 12), 0.3, 0.6, rr(), "horn"), 0.1), fr(1298) + k * 0.28, 0.35)
place(mus, pan(I.brass(F(49), 0.9, 0.65, rr(), "horn", fall=-7), 0.1), fr(1298) + 0.84, 0.35)
mus = convolve_st(mus, make_ir(0.9, 7)) * 0.2 + mus

# ------------------------------------------------------------------ effects
voice = st(read_wav(os.path.join(HERE, "voice.wav"))[0])
VREF = integrated(voice)
sfx = np.zeros((2, N)); cues = []
def load(name):
    x = read_wav(os.path.join(HERE, "sfx", name + ".wav"))[0]; return st(x)
def ev(f, x, lu, name, p=0.0, speed=1.0):
    """place an effect at frame f so its loudest moment sits `lu` LU relative to the voice"""
    x = load(x) if isinstance(x, str) else (st(x) if np.ndim(x) == 2 else pan(x, p))
    if speed != 1.0:
        idx = np.arange(0, x.shape[1] - 1, speed); x = np.stack([np.interp(idx, np.arange(x.shape[1]), c) for c in x])
    pad = np.concatenate([x, np.zeros((2, ns(0.5)))], 1); m = momentary_max(pad)
    if np.isfinite(m): x = x * dbg(VREF + lu - m)
    if p: x = x * np.array([[1 - max(0, p)], [1 + min(0, p)]])
    place(sfx, x, fr(f)); cues.append((f, name))
def bed(f0, f1, x, lu, name):
    x = load(x) if isinstance(x, str) else st(x); n = ns(fr(f1 - f0)); x = np.tile(x, (1, n // x.shape[1] + 1))[:, :n]
    x = x * dbg(VREF + lu - integrated(x)); k = ns(0.25); x[:, :k] *= np.linspace(0, 1, k); x[:, -k:] *= np.linspace(1, 0, k)
    place(sfx, x, fr(f0)); cues.append((f0, name + " (bed)"))
def drips(dur, r):
    x = np.zeros(ns(dur))
    for k in range(int(dur * 1.6)):
        f0 = 900 + r.random() * 1400; t = np.arange(ns(0.18)) / SR; y = np.sin(2 * np.pi * (f0 + 600 * t / 0.18) * t) * np.exp(-t / 0.03); i = ns(r.random() * (dur - 0.3)); x[i:i + len(y)] += y * (0.4 + 0.6 * r.random())
    return convolve_st(st(x), make_ir(2.2, 3)) * 0.7 + st(x) * 0.3 + st(lp(r.standard_normal(ns(dur)), 220)) * 0.05
def steps(dur, rate, r):
    x = np.zeros(ns(dur + 0.3))
    for k in range(int(dur * rate)): y = G.stroll_step(r, 0.4); i = ns(k / rate); x[i:i + len(y)] += y[: len(x) - i]
    return x
def scurry(dur, r, dens=40):
    x = np.zeros(ns(dur)); t = np.arange(ns(0.03)) / SR
    for k in range(int(dur * dens)): y = hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.004) * r.random(); i = ns(r.random() * (dur - 0.04)); x[i:i + len(y)] += y
    return x
# 1 hook
bed(0, 169, st(lp(rr().standard_normal(ns(6)), 300)) , -34, "room tone")
ev(22, "thud", -12, "rat lands on the desk", -0.2); ev(31, "coin", -10, "coin handed over", 0.2); ev(40, "ding", -16, "desk bell")
ev(112, "whoosh", -9, "pull back"); ev(114, "gasp", -8, "official gasps", 0.3); bed(114, 169, "squeaks", -13, "rats everywhere"); bed(114, 169, scurry(2, rr()), -18, "claws on wood")
for k in range(6): ev(116 + k * 5, "squeak1", -12 - k, "squeak", -0.6 + k * 0.25, 0.9 + 0.08 * k)
# 2 ceremony
bed(169, 268, G.bird_chirps(3.4, rr(), 0.6), -24, "street birds"); ev(224, "snip", -7, "ribbon cut"); bed(228, 268, "applause", -13, "applause"); ev(228, G.hurrah(rr(), 150, 1.0), -14, "cheer")
# 3-4 sewer
ev(266, G.whoosh(0.5, rr(), 0.3, 200, 1200), -8, "down the manhole"); bed(268, 522, drips(8.5, rr()), -20, "sewer drips"); bed(272, 385, scurry(3.9, rr(), 30), -17, "rat traffic"); bed(272, 385, "squeaks", -19, "rat chatter")
for k, f in enumerate([290, 318, 346, 372]): ev(f, "squeak1", -14, "passing squeak", [-0.5, 0.5, -0.3, 0.4][k], [1.0, 1.15, 0.9, 1.05][k])
ev(383, "whoosh", -11, "whip"); ev(411, G.whoosh(0.3, rr(), 0.15, 500, 3000), -9, "net swing", 0.2); ev(418, "squeak2", -10, "caught", 0.2, 1.2)
ev(452, "ding", -10, "tally board"); ev(497, "whoosh", -10, "rats rush"); bed(497, 522, scurry(1, rr(), 70), -11, "stampede over the catcher"); bed(497, 522, "squeaks", -12, "squeaks"); ev(499, "boing", -13, "rat on head", 0.0)
# 5 new plan
ev(520, "whoosh", -12, "dip"); bed(522, 621, G.bird_chirps(3.3, rr(), 0.5), -25, "street birds"); ev(524, "paper", -13, "poster"); ev(548, "pop", -8, "idea!"); ev(566, "pop", -9, "tail up", 0.2, 0.8); ev(596, "coin", -8, "one cent", 0.2); ev(598, "ding", -15, "ka-ching")
# 6 tails pour in
ev(619, "whoosh", -11, "whip")
for k in range(4): ev(621 + k * 22 + 6, "splat", -13, "tails on the pile", -0.2, 0.8); ev(621 + k * 22 + 10, "coin", -11, "paid", 0.3, 1 + 0.05 * k); ev(621 + k * 22 + 16, "stamp", -13, "stamp", 0.3)
ev(690, "ding", -11, "thrilled")
# 7 something odd
ev(714, "whoosh", -11, "whip"); bed(716, 760, steps(1.5, 3.2, rr()), -15, "official strolls"); bed(716, 830, G.bird_chirps(3.8, rr(), 0.3), -27, "evening birds"); ev(762, "pop", -10, "?"); ev(783, "whoosh", -10, "camera drops"); ev(786, "gasp", -8, "gasp", 0.2)
for k, f in enumerate([790, 800, 812, 822]): ev(f, "squeak1", -10, "smug squeak", -0.5 + k * 0.3, 0.85 + 0.07 * k)
# 8 you see
ev(828, G.whoosh(0.4, rr(), 0.2, 300, 1500), -12, "dip"); ev(866, "coin", -9, "= one cent", -0.3); ev(866, "pop", -11, "pop")
bed(894, 939, scurry(1.5, rr(), 14), -16, "little feet"); ev(939, "thud", -15, "door", 0.3); ev(941, "kiss", -9, "hearts", 0.3)
for k in range(11): ev(946 + k * 4.2, "pop", -11 + (k % 3), "a baby rat", 0.3 - k * 0.05, 0.8 + k * 0.05)
for k in range(5): ev(977 + k * 4, "coin", -13, "tail = coin", -0.3 + k * 0.15, 1.1 + 0.05 * k)
# 9-10 farm
bed(1013, 1193, "crickets", -24, "evening crickets"); ev(1022, "paper", -14, "bush rustle", -0.4, 0.7); ev(1088, "whoosh", -9, "over the fence"); ev(1092, "gasp", -8, "inspector gasps", -0.3)
bed(1090, 1193, "squeaks", -12, "hundreds of rats"); bed(1090, 1193, scurry(3.4, rr(), 50), -17, "pen"); ev(1160, "pop", -10, "tails"); ev(1164, "coin", -10, "coin", -0.2)
# 11 cancelled
ev(1191, "whoosh", -11, "whip"); ev(1206, G.whoosh(0.25, rr(), 0.18, 400, 2500), -11, "stamp swings"); ev(1212, "stamp", -3, "CANCELLED"); ev(1212, "thud", -5, "stamp hits")
# 12 payoff
ev(1239, "whoosh", -11, "whip"); bed(1241, 1335, "crickets", -25, "dusk"); bed(1241, 1335, "squeaks", -15, "the street belongs to the rats"); bed(1281, 1335, scurry(1.8, rr(), 60), -16, "rats"); ev(1279, "whoosh", -10, "pull back")
for k in range(3): ev(1290 + k * 5, "pop", -11, "rat on the hat", 0, 1 + 0.1 * k)
ev(1322, "squeak1", -9, "last word: a squeak", 0.1, 0.9)

# ------------------------------------------------------------------ mix: voice unchanged, music ducked under speech
env = np.abs(voice).max(0); k = ns(0.02); env = np.convolve(env, np.ones(k) / k, "same"); gate = (env > 0.02).astype(float)
a = ns(0.25); gate = np.convolve(gate, np.ones(a) / a, "same").clip(0, 1)
if voice.shape[1] < N: voice = np.concatenate([voice, np.zeros((2, N - voice.shape[1]))], 1); gate = np.concatenate([gate, np.zeros(N - len(gate))])
voice, gate = voice[:, :N], gate[:N]
mus = mus * dbg(VREF - 11.0 - integrated(mus))          # music bed ~11 LU under the voice ...
mus = mus * (1.0 - 0.45 * gate)[None, :] * 1.6            # ... lifted in the gaps, ducked on speech
mix = voice + mus + sfx
for _ in range(4):  # normalise to -14 LUFS, soft-limit the peaks, repeat until both hold
    mix = mix * dbg(-14.0 - integrated(mix))
    c = dbg(-1.5); mix = np.where(np.abs(mix) > c * 0.7, np.sign(mix) * (c * 0.7 + c * 0.3 * np.tanh((np.abs(mix) - c * 0.7) / (c * 0.3))), mix)
mix[:, -ns(0.05):] *= np.linspace(1, 0, ns(0.05))
write_wav(os.path.join(HERE, "mix.wav"), mix)
open(os.path.join(HERE, "cues.md"), "w").write("# Cue sheet (frame @30 fps, time, what)\n\n" + "\n".join(f"- {int(f):4d}  {f / FPS:6.2f} s  {n}" for f, n in sorted(cues)) + "\n")
print("mix LUFS", round(integrated(mix), 2), "true peak", round(true_peak(mix), 2), "voice", round(VREF, 2), "len", mix.shape[1] / SR)
