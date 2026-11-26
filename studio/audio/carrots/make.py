"""Sound for "Carrots" (10 s): two engines and guns over a tense vamp, a radar ping, a ministry fanfare, a sneaking
bass for the spy, a music-box button for mum. Effects are the CC0 samples in audio/sfx or synthesised here.
Run: python3 audio/carrots/make.py  (after scripts/plan_lint.ts carrots, which writes warp.json)"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from kit import Mix, G, I, SR, ns, lp, hp
m = Mix(__file__, seed=1940); F, fr = m.F, m.fr
T = dict(secret=F("the", 1, -2), gov=F("so", 0, -2), nobody=F("nobody", 0, -2), mum=F("but", 0, -2))
HIT, PING, REVEAL = F("down"), F("radar", 0, -2), F("carrots", 0, -2)
SPOT, FIRE, WON, TURN = F("suddenly", 0, -2), F("shooting", 0, -2), F("bombers", 0, -2), F("in", 1, -2)
TELLS, ALL, ASK, SHRUG, SERVE, DID = F("tells", 0, -2), F("everyone", 0, -2), F("if", 0, -2), F("bought", 0, -2), F("mum", 0, -2), F("did")
END = m.total

# ---------------------------------------------------------------- synthesised effects
def engines(dur):
    """two radial engines a few hertz apart: a beating drone"""
    r = m.rr(); t = np.arange(ns(dur)) / SR; x = np.zeros(len(t))
    for f0, a in ((62, 1.0), (65.5, 0.9)):
        for k in (1, 2, 3, 4): x += a / k * np.sin(2 * np.pi * f0 * k * t + r.random() * 6)
    x *= 0.75 + 0.25 * np.sin(2 * np.pi * 15.5 * t)
    return lp(x, 700) + 0.25 * lp(r.standard_normal(len(t)), 900)
def guns(dur, rate=13.0):
    r = m.rr(); x = np.zeros(ns(dur + 0.2)); t = np.arange(ns(0.07)) / SR
    for k in range(int(dur * rate)):
        y = (lp(r.standard_normal(len(t)), 2600) + 0.8 * np.sin(2 * np.pi * 150 * t)) * np.exp(-t / 0.014) * (0.8 + 0.2 * r.random()); i = ns(k / rate); x[i:i + len(y)] += y
    return x
def boom():
    r = m.rr(); t = np.arange(ns(1.1)) / SR
    return lp(r.standard_normal(len(t)), 420) * np.exp(-t / 0.22) + 0.9 * np.sin(2 * np.pi * (95 * np.exp(-t / 0.25) + 38) * t) * np.exp(-t / 0.3) + 0.4 * hp(r.standard_normal(len(t)), 1500) * np.exp(-t / 0.03)
def ping():
    t = np.arange(ns(0.7)) / SR
    return (np.sin(2 * np.pi * 1320 * t) + 0.4 * np.sin(2 * np.pi * 2640 * t)) * np.exp(-t / 0.16) * np.minimum(1, t / 0.004)

# ---------------------------------------------------------------- music
m.bar(fr(0), "Dm", 0.6, brush=False); m.bar(fr(0) + 2.0, "A7", 0.62, beats=2)                 # the hunt
m.stab(fr(HIT), "Dm", 0.85); m.tune(fr(WON), [(0, 74), (1, 77), (2, 81)], 0.5, "fife", 0.16)   # hit, and a little fanfare
for k, n in enumerate((57, 60, 64)): m.note(fr(T["secret"]) + 0.1 + k * 0.2, I.pluck(I.m2f(n + 12), 0.5, m.rr(), 0.6, 0.4), 0.4, 0.2)  # the secret: hush
m.stab(fr(T["gov"]), "F", 0.6, cym=False); m.bar(fr(T["gov"]) + 0.5, "C", 0.55, beats=2, q=0.2)   # the ministry clears its throat
m.stab(fr(REVEAL), "F", 0.85)
for k, n in enumerate((38, 41, 44, 45, 44, 41)): m.note(fr(T["nobody"]) + 0.1 + k * 0.24, I.pluck(I.m2f(n + 12), 0.55, m.rr(), 0.5, 0.3), 0.5, -0.15)  # sneaking
for k, n in enumerate((77, 81, 84)): m.note(fr(T["mum"]) + 0.05 + k * 0.15, I.musicbox(I.m2f(n), 0.5, m.rr()), 0.35, 0.2 * (-1) ** k)
m.stab(fr(DID), "F", 0.7, cym=False)

# ---------------------------------------------------------------- effects
m.bed(0, T["secret"], engines(4.2), -15, "two engines"); m.bed(0, T["secret"], G.breeze(4.2, m.rr(), 1.2), -20, "slipstream")
m.bed(0, SPOT, guns(1.4), -13, "guns"); m.ev(SPOT, "ding", -9, "contact!"); m.bed(FIRE, HIT + 1, guns(0.4, 16), -9, "guns, close")
m.ev(HIT, boom(), -3, "the bomber is hit"); m.ev(HIT + 1, "thud", -6, "hit", 0.2, 0.7); m.ev(WON, G.hurrah(m.rr(), 140, 1.0), -11, "the pilot"); m.ev(TURN - 2, "whoosh", -10, "camera round")
m.bed(T["secret"], T["gov"], engines(1.2) * 0.0 + lp(m.rr().standard_normal(ns(1.2)), 300), -24, "valve hum")
m.ev(T["secret"] + 4, G.oof(m.rr(), "oof"), -30, "shh"); m.ev(PING, ping(), -6, "the blip"); m.ev(PING, "pop", -10, "blip pops")
m.ev(T["gov"] + 2, "paper", -12, "the announcement"); m.ev(TELLS, "pop", -10, "he tells"); m.ev(ALL, G.babble(0.7, m.rr(), 150, 1.0), -14, "everyone")
m.ev(REVEAL - 2, "whoosh", -9, "the cloth"); m.ev(REVEAL + 3, "ding", -9, "carrots!")
m.bed(T["nobody"], T["mum"], m.crackle(1.6, 14), -24, "candle"); m.ev(ASK, "boing", -9, "?"); m.ev(SHRUG - 2, "whoosh", -13, "camera"); m.ev(SHRUG, "squeak1", -12, "shrug")
m.ev(SERVE - 2, "whoosh", -12, "the bowl"); m.ev(SERVE, "pop", -8, "served"); m.ev(SERVE + 3, "gasp", -10, "the kid", -0.3); m.ev(DID, "ding", -9, "the last word")
m.finish(bed_under=7.5)
