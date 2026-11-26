# Sound for "The War I Won": an original bush-band march (tuba oom-pah, banjo plucks, fife tune, field snare) that
# follows the picture, synthesized SFX timed to the frames of story.ts / cast.ts, and the mix under the voice.
# Mix rule: voice unchanged; music bed +3 dB over its base level; SFX events -6 dB under their naive level.
import os, json, subprocess
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, make_ir, convolve_st, integrated, momentary_max,
                 read_wav, write_wav, colored, smooth_noise, true_peak)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
TOTAL = 1830
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
F = I.m2f

# ================================================================ music
Q = 0.5  # 120 bpm
mus = np.zeros((2, N))
R = rng(1932)
rr = lambda: rng(int(R.integers(1 << 30)))
CH = {"D": [38, 45, 54, 57, 62], "G": [43, 38, 55, 59, 62], "A": [45, 40, 52, 57, 61], "A7": [45, 40, 55, 57, 61], "Bm": [47, 42, 54, 59, 62],
      "Em": [40, 47, 55, 59, 64], "F#m": [42, 49, 54, 57, 61]}
PROG = ["D", "D", "G", "D", "A7", "A7", "D", "D", "G", "G", "D", "Bm", "Em", "A7", "D", "D"]
# fife theme (beats from bar start, length in beats, midi) - one 4-bar phrase, answered by a second
THEME = [[(0, 1, 74), (1, .5, 76), (1.5, .5, 78), (2, 1, 81), (3, 1, 78)], [(0, 1.5, 79), (1.5, .5, 78), (2, 1, 76), (3, 1, 74)],
         [(0, .5, 76), (.5, .5, 78), (1, 1, 79), (2, .5, 81), (2.5, .5, 79), (3, 1, 76)], [(0, 2, 81), (2, 1, 76), (3, 1, 73)],
         [(0, 1, 74), (1, .5, 76), (1.5, .5, 78), (2, 1, 81), (3, 1, 83)], [(0, 1.5, 81), (1.5, .5, 79), (2, 1, 78), (3, 1, 76)],
         [(0, .5, 79), (.5, .5, 78), (1, 1, 76), (2, 1, 73), (3, 1, 76)], [(0, 3, 74)]]


def bar(t0, ch, vel=0.6, banjo=True, snare="march", tuba=True, beats=4):
    c = CH[ch]
    for b in range(beats):
        t = t0 + b * Q
        if tuba and b % 2 == 0:
            place(mus, pan(I.brass(F(c[0] if b == 0 else c[1]), 0.32, 0.7 * vel, rr(), "tuba"), -0.1), t, 0.55)
        if banjo:
            for k, m in enumerate(c[2:]):
                place(mus, pan(I.pluck(F(m + 12), 0.55 * vel, rr(), 0.5, 0.8), 0.35), t + Q / 2 + k * 0.012, 0.32)
        if snare == "march":
            place(mus, pan(I.snare(0.45 * vel + (0.15 if b == 0 else 0), rr()), 0.15), t, 0.35)
            if b % 2:
                place(mus, pan(I.snare(0.3 * vel, rr()), 0.15), t + 0.75 * Q, 0.3)
        elif snare == "light" and b % 2:
            place(mus, pan(I.brush(0.4 * vel, rr()), 0.15), t, 0.5)


def melody(t0, phrase, vel=0.55, octave=0, inst="fife"):
    for (b, l, m) in phrase:
        x = I.fife(F(m + octave), l * Q * 0.92, vel, rr()) if inst == "fife" else I.brass(F(m + octave - 12), l * Q * 0.9, vel, rr(), "horn")
        place(mus, pan(x, -0.25), t0 + b * Q, 0.38)


def stab(t, ch, vel=0.8):
    for m in CH[ch][2:]:
        place(mus, pan(I.brass(F(m), 0.35, vel, rr(), "stab"), 0.0), t, 0.25)
    place(mus, pan(I.brass(F(CH[ch][0]), 0.4, vel, rr(), "tuba"), 0), t, 0.5)
    place(mus, I.timpani(F(CH[ch][0] + 12), vel, rr()), t, 0.4)


# hook: "declared war on me" stab, roll, "And lost" sting
stab(fr(79), "Bm", 0.7)
for k in range(int((fr(110) - fr(82)) * 24)):
    place(mus, pan(I.snare(0.18 + 0.25 * k / 40, rr(), buzz=True), 0.1), fr(82) + k / 24, 0.3)
stab(fr(112), "D", 0.85)
place(mus, I.cymbal(0.5, rr()), fr(112), 0.25)
# march A: 4.25 s -> 19.3 s (bars of 2 s)
t = fr(128)
for i in range(8):
    bar(t + 2 * i, PROG[i], 0.6, snare="light" if i < 2 else "march")
    if i >= 2: melody(t + 2 * i, THEME[(i - 2) % 8], 0.5)
t2 = t + 16  # 20.27 s: "Two guns ..." military stabs on the words
for f0, ch in [(689, "Bm"), (716, "G"), (748, "A"), (779, "D")]:
    stab(fr(f0), ch, 0.75)
for k in range(int((fr(800) - fr(760)) * 8)):
    place(mus, pan(I.snare(0.35, rr()), 0.1), fr(760) + k / 8, 0.3)
# dam: tension pizzicato, then gunfire: music drops; jam: sad trombone fall
for k in range(10):
    place(mus, pan(I.pluck(F([38, 41][k % 2]), 0.6, rr(), 0.6, 0.3), 0.2), fr(805) + k * Q * 0.5, 0.5)
for k, m in enumerate([62, 61, 60]):
    place(mus, pan(I.brass(F(m - 12), 0.45, 0.6, rr(), "horn"), 0.1), fr(940) + k * 0.5, 0.35)
place(mus, pan(I.brass(F(47), 1.0, 0.6, rr(), "horn", fall=-6), 0.1), fr(940) + 1.5, 0.35)
# chase galop: faster (double-time feel), 32.4 s -> 40.1 s
t = fr(973)
for i in range(4):
    bar(t + 2 * i, ["D", "A7", "D", "A7"][i], 0.65)
    melody(t + 2 * i, [(b * 0.5, 0.5, m) for b, m in enumerate([74, 78, 81, 78, 74, 78, 81, 86][:8])] if i % 2 == 0 else
           [(b * 0.5, 0.5, m) for b, m in enumerate([85, 81, 79, 76, 73, 76, 79, 81])], 0.5)
# "You see": light plucked explanation 40.1 -> 47.5
t = fr(1204)
for i in range(4):
    bar(t + 2 * i, ["G", "D", "Em", "A7"][i], 0.45, snare="light", tuba=i % 2 == 0)
place(mus, I.glock(F(93), 0.6, rr()), fr(1352), 0.4)  # the lookout spots
stab(fr(1383), "A7", 0.55)
# golden: slow warm reprise (horn + pad), proud swell on "face any army", final lazy tag
t = fr(1427)
for i, ch in enumerate(["D", "Bm", "G", "A7", "D", "G"]):
    place(mus, I.pad([F(m + 12) for m in CH[ch][2:]], 2.3, 0.35, rr()), t + 2.2 * i, 0.5)
    place(mus, pan(I.brass(F(CH[ch][0]), 1.8, 0.45, rr(), "soft"), 0), t + 2.2 * i, 0.45)
for b, l, m in [(0, 2, 74), (2, 1, 76), (3, 1, 78), (4, 3, 81), (8, 2, 79), (10, 1, 78), (11, 1, 76), (12, 4, 78)]:
    place(mus, pan(I.brass(F(m - 12), l * 0.55, 0.45, rr(), "horn"), -0.2), t + 1.0 + b * 0.55, 0.3)
t = fr(1601)  # proud march, slower (100 bpm), swell into "world"
for i in range(3):
    bar(t + 2.4 * i, ["D", "G", "A7"][i], 0.55, snare="march")
stab(fr(1690), "D", 0.8); place(mus, I.cymbal(0.6, rr()), fr(1690), 0.3)
t = fr(1736)  # lazy tag: banjo + tuba, ending on "delicious"
for i in range(2):
    bar(t + 2 * i, ["D", "A7"][i], 0.45, snare="light")
place(mus, pan(I.pluck(F(62), 0.7, rr(), 1.5, 0.6), 0.3), fr(1797), 0.5)
place(mus, pan(I.pluck(F(69), 0.6, rr(), 1.5, 0.6), 0.3), fr(1797) + 0.08, 0.4)
place(mus, pan(I.pluck(F(74), 0.6, rr(), 1.5, 0.6), 0.3), fr(1797) + 0.16, 0.4)
mus = convolve_st(mus, make_ir(1.1, 7)) * 0.25 + mus

# ================================================================ sfx
sfx = np.zeros((2, N))
cues = []


def ev(t, x, lu, p=0.0, name=""):
    """place an event so its max momentary loudness sits `lu` LU relative to the voice, minus 6 dB (mix rule)"""
    x = st(x) if np.ndim(x) == 2 else pan(x, p)
    m = momentary_max(x) if x.shape[1] > ns(0.45) else momentary_max(np.concatenate([x, np.zeros((2, ns(0.5)))], 1))
    if np.isfinite(m):
        x = x * dbg(VREF + lu - 6.0 - m)
    place(sfx, x, t)
    cues.append((t, name))


def bed(t0, t1, x_fn, lu, name):
    d = t1 - t0
    x = st(x_fn(d))
    x = x * dbg(VREF + lu - integrated(x))
    x = x * np.concatenate([np.linspace(0, 1, ns(0.3)), np.ones(x.shape[1] - 2 * ns(0.3)), np.linspace(1, 0, ns(0.3))])[None, :]
    place(sfx, x, t0)
    cues.append((t0, name))


def A(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[: len(x)] += x
    return o


def gun_crack(r, near=1.0):
    n = ns(0.35); t = np.arange(n) / SR
    crack = hp(r.standard_normal(n), 900) * np.exp(-t / 0.012)
    boom = lp(r.standard_normal(n), 260) * np.exp(-t / 0.06) * 3
    return fades(crack * near + boom, 0.0003, 0.05)


def burst(dur, r, rate=9.0, near=1.0):
    x = np.zeros(ns(dur + 0.4))
    for k in range(int(dur * rate)):
        y = gun_crack(r, near) * (0.85 + 0.3 * r.random()); i = ns(k / rate + 0.01 * r.random())
        x[i:i + len(y)] += y[: len(x) - i]
    return x


def engine(dur, r, rpm=1.0):
    n = ns(dur); t = np.arange(n) / SR
    f = 32 * rpm * (1 + 0.05 * smooth_noise(n, r, 2.0))
    ph = np.cumsum(2 * np.pi * f / SR)
    y = np.sign(np.sin(ph)) * 0.4 + np.sin(2 * ph) * 0.3
    y = lp(y, 400) + 0.3 * bp(colored(n, r, 1.0), 80, 600, 1)
    return y * (0.8 + 0.2 * np.sin(2 * np.pi * 3 * t))


def thud(r, f=70, dur=0.25):
    t = tt(dur)
    return fades(np.sin(2 * np.pi * f * t * (1 + 0.6 * np.exp(-t / 0.02))) * np.exp(-t / 0.07) + 0.3 * lp(r.standard_normal(len(t)), 900) * np.exp(-t / 0.02), 0.0005, 0.03)


def clank(r):
    return A(G.clink(r, 900, 0.25, 1.0), 0.6 * G.clink(r, 1430, 0.2, 0.8), 0.5 * thud(r, 120, 0.15))


def peck(r):
    t = tt(0.06)
    return fades(bp(r.standard_normal(len(t)), 1500, 5000, 1) * np.exp(-t / 0.008), 0.0002, 0.01)


def crunch(dur, r):
    x = np.zeros(ns(dur))
    for k in range(int(dur * 14)):
        y = bp(r.standard_normal(ns(0.05)), 1200, 6000, 1) * np.exp(-tt(0.05) / 0.012) * r.random(); i = ns(r.random() * (dur - 0.06))
        x[i:i + len(y)] += y
    return x


def boing(r, f0=180, f1=420, dur=0.35):
    t = tt(dur); f = f0 + (f1 - f0) * (t / dur) ** 0.5
    return fades(np.sin(np.cumsum(2 * np.pi * f / SR)) * np.exp(-t / 0.12) * (1 + 0.3 * np.sin(2 * np.pi * 28 * t)), 0.002, 0.05)


def steps(dur, rate, r, heavy=0.6):
    x = np.zeros(ns(dur + 0.3))
    for k in range(int(dur * rate)):
        y = A(thud(r, 90 + 30 * r.random(), 0.12) * heavy, 0.4 * bp(r.standard_normal(ns(0.12)), 400, 3000, 1) * np.exp(-tt(0.12) / 0.03))
        i = ns(k / rate + 0.02 * r.random()); x[i:i + len(y)] += y[: len(x) - i]
    return x


v, vsr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
voice = np.zeros((2, N)); vv = st(v[0] if v.shape[0] else v)
voice[:, : min(N, vv.shape[1])] = vv[:, :N]
VREF = integrated(voice)
r = rng(11)
# beds
bed(0, fr(1427) + 0.3, lambda d: G.breeze(d, rng(1), 1.0, 0.2, 800) + pan(G.bird_chirps(d, rng(2), 0.35, "sparrow") * 0.12, 0.4), -26, "outback day air")
bed(fr(1427) - 0.3, DUR, lambda d: G.breeze(d, rng(3), 0.8, 0.1, 600) + pan(G.crickets(d, rng(4), 3) * 0.2, -0.3), -27, "golden evening: breeze, crickets")
bed(fr(154), fr(252), lambda d: steps(d, 14, rng(5), 0.4), -22, "migration: many soft footfalls")
# hook + flash
ev(fr(124), G.whoosh(0.5, rng(6), 0.3), -8, 0, "flash whoosh")
for f0 in [341, 1201, 1422]:
    ev(fr(f0), G.whoosh(0.7, rng(f0), 0.35), -12, 0.2, "transition whoosh")
# pecking + chewing + trample
for k in range(10): ev(fr(448) + k * 0.13 + 0.03 * r.random(), peck(r), -14, 0.3 * (r.random() - 0.5), "peck")
ev(fr(450), crunch(0.5, r), -16, 0, "chew crunch")
ev(fr(466), steps(0.7, 12, r, 1.0), -10, 0, "trample")
# kicks: thump + post crack + wire twang
for f0 in [503, 526]:
    ev(fr(f0), A(thud(r, 60, 0.3), 0.8 * G.wood_crack(r)[: ns(0.3)]), -4, -0.1, "kick, fence post cracks")
    ev(fr(f0) + 0.08, G.clink(r, 300, 0.6, 0.6) * np.sin(2 * np.pi * 7 * tt(0.6)), -14, 0.2, "wire twang")
for k in range(5): ev(fr(546) + k * 0.28, boing(r, 500, 700, 0.12), -18, 0.3 * k - 0.6, "rabbit hop")
# truck arrives, guns, crates
ev(fr(640), engine(1.7, r, 1.0) * np.linspace(0.3, 1, ns(1.7)), -10, -0.3, "truck arrives")
ev(fr(686), A(G.clink(r, 500, 0.3), thud(r, 80)), -10, 0, "brake + stop")
ev(fr(690), clank(r), -8, 0, "gun clank")
ev(fr(711), thud(r, 70, 0.3), -9, 0, "crate thud")
for k in range(3): ev(fr(722) + k * 0.25, thud(r, 90, 0.2), -14, 0, "crates")
# dam + gunfire + jam
bed(fr(805), fr(886), lambda d: G.water_bed(d, rng(9), 0.4, 0.4), -26, "dam water")
ev(fr(893), burst(fr(929) - fr(893), r, 10, 1.0), -2, 0, "Lewis gun burst")
ev(fr(898), steps(1.2, 18, r, 0.8), -12, 0.3, "emus scatter")
ev(fr(929), A(clank(r), 0.5 * G.clink(r, 2000, 0.1)), -4, 0, "gun jams")
ev(fr(935), lp(colored(ns(0.6), r, 1.0), 900) * np.exp(-tt(0.6) / 0.2), -14, 0, "smoke fizz")
# truck with gun, chase, bumpy ride
ev(fr(973), engine(fr(1019) - fr(973), r, 1.2), -10, 0, "truck driving")
ev(fr(1033), G.whoosh(0.6, rng(12), 0.15), -8, 0, "takeoff whoosh")
ev(fr(1036), steps(1.9, 9, r, 0.7), -9, 0, "emu running feet")
ev(fr(1091), engine(fr(1204) - fr(1091), r, 1.5), -8, 0, "truck chase engine")
ev(fr(1091), steps(1.3, 14, r, 0.6), -14, 0.4, "emus running")
for f0 in [1148, 1160, 1176]: ev(fr(f0), A(clank(r), thud(r, 55, 0.3)), -5, 0, "truck slams a bump")
for f0 in range(1130, 1196, 9): ev(fr(f0), burst(0.13, r, 10, 0.8), -6, 0.2, "wild shots")
# lookout, scatter
ev(fr(1352), boing(r, 300, 900, 0.3), -12, 0, "lookout spots")
ev(fr(1383), A(G.whoosh(0.8, rng(13), 0.1), steps(1.2, 20, r, 0.7)[: ns(0.8)]), -8, 0, "everybody scatters")
# tally: ten tinks + feather
for i in range(10): ev(fr(1519 + i * 2.6), G.clink(r, 2600 + 80 * i, 0.15, 1.0), -14, -0.4 + 0.08 * i, "bullet tink")
ev(fr(1544), G.whoosh(0.4, rng(14), 0.15, 2000, 6000), -16, 0.4, "feather lands")
ev(fr(1601), steps(1.5, 3.2, r, 1.0), -14, 0, "marching emus")
# leave + chew
ev(fr(1708), engine(1.0, r, 1.2) * np.linspace(1, 0.2, ns(1.0)), -10, 0, "truck drives away")
ev(fr(1788), crunch(1.4, r), -12, 0, "delicious crunch")

# ================================================================ mix
music = mus * dbg(VREF - 17.0 + 3.0 - integrated(mus))  # base -17 LU under the voice, +3 dB rule
y = voice + music + sfx
y *= dbg(-14.0 - integrated(y))
pk = np.max(np.abs(y))
if pk > 0.89:  # soft limiter
    y = np.tanh(y / 0.89) * 0.89
y = fades(y, 0.005, 0.05)
write_wav(os.path.join(HERE, "mix.wav"), y)
write_wav(os.path.join(HERE, "stem_music.wav"), music)
write_wav(os.path.join(HERE, "stem_sfx.wav"), sfx)
with open(os.path.join(HERE, "cues.md"), "w") as fh:
    fh.write("# SFX cues (time s, frame, event)\n\n" + "\n".join(f"- {t:6.2f} s  f{round(t * 30):4d}  {n}" for t, n in sorted(cues)))
print("mix", round(integrated(y), 2), "LUFS, peak", round(float(np.max(np.abs(y))), 3), "dur", y.shape[1] / SR)
