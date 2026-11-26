"""Sound for "Late for Dinner" (the Vikings find America by accident): a rolling sea shanty for fife, plucked
strings and tuba, CC0 effects, and the mix.  Run: python3 audio/vikings/make.py  (after scripts/plan_lint.ts vikings)"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from kit import Mix, G, I
m = Mix(__file__, seed=986); F, fr = m.F, m.fr
T = dict(year=F("it's", 0, -3), but=F("but", 0, -2), noMap=F("no", 0, -2), fog=F("three", 0, -1), wind=F("and", 1, -2), clears=F("when", 0, -2), crew=F("crew", 0, -5),
         times=F("he", 0, -2), third=F("three", 2, -2), zero=F("coasts", 0, 6), finds=F("he", 1, -2), see=F("you", 0, -2), later=F("years", 0, -2), follows=F("follows", 0, -2), walks=F("walks", 0, -4), all=F("all", 0, -2))
END = m.total; bump = F("parks", 0, 16)

# ---------------------------------------------------------------- music: a shanty in 2 s bars
SHANTY = [(0, 74), (1.5, 76), (2, 77), (4, 81), (6, 77), (8, 76), (9.5, 74), (10, 72), (12, 74)]
ANSWER = [(0, 77), (2, 81), (4, 84), (6, 81), (8, 79), (10, 77), (12, 76), (14, 74)]
BAR = 2.0
def run(f0, f1, chords, vel=0.55, tune=True, inst="fife"):
    t, i = fr(f0), 0
    while t + 0.6 < fr(f1):
        beats = 4 if t + BAR <= fr(f1) else 2
        m.bar(t, chords[i % len(chords)], vel, brush=i > 0, beats=beats)
        if tune and beats == 4: m.tune(t, SHANTY if i % 2 == 0 else ANSWER, vel * 0.75, inst)
        t += BAR; i += 1
m.bar(fr(0), "Dm", 0.6, brush=False, beats=3); m.stab(fr(F("didn't", 0, -2)), "A7", 0.8)                 # hook: surge, then "no"
run(T["year"], T["but"], ["F", "C", "Dm", "C"], 0.55)                                                       # home, cheerful
m.note(fr(F("moved")), I.brass(I.m2f(50), 0.7, 0.5, m.rr(), "horn", fall=-5), 0.35)                           # the note: droop
run(T["noMap"], T["fog"], ["F", "C"], 0.6, tune=False); m.stab(fr(F("be", 0, 6)), "F", 0.55, cym=False)
for k in range(int((fr(T["clears"]) - fr(T["fog"])) / 0.75)):                                                # fog: slow, hollow
    m.note(fr(T["fog"]) + k * 0.75, I.pluck(I.m2f([38, 45, 41][k % 3]), 0.5, m.rr(), 0.9, 0.3), 0.45, 0.15)
m.note(fr(T["wind"]), I.pad([I.m2f(x) for x in (50, 53, 57)], 2.0, 0.3, m.rr()), 0.4)
m.stab(fr(F("land")), "F", 0.7); run(F("land", 0, 8), T["crew"], ["F", "Bb"], 0.5, inst="glock")           # land!
run(T["crew"], F("bjarni", 2, -3), ["C", "F"], 0.55, tune=False)
for k, w in enumerate(["no", "not", "keep"]): m.stab(fr(F(w, 2 if w == "no" else 0)), ["Dm", "Gm", "A7"][k], 0.6 + 0.1 * k, cym=k == 2)
run(T["times"], T["zero"], ["Dm", "Gm"], 0.6, tune=False)
m.note(fr(F("zero", 0, -2)), I.brass(I.m2f(53), 0.25, 0.6, m.rr(), "horn"), 0.35); m.note(fr(F("zero", 0, -2)) + 0.28, I.brass(I.m2f(49), 0.8, 0.6, m.rr(), "horn", fall=-7), 0.35)
run(T["finds"], T["see"], ["F", "C", "F", "Bb"], 0.6)                                                        # Greenland: home key
for i, ch in enumerate(["Dm", "Bb", "Gm"]):                                                                  # you see: music box
    c = [50, 53, 57] if ch == "Dm" else [46, 50, 53] if ch == "Bb" else [43, 46, 50]
    for b in range(8):
        if fr(T["see"]) + i * BAR + b * 0.25 < fr(T["later"]) - 0.3: m.note(fr(T["see"]) + i * BAR + b * 0.25, I.musicbox(I.m2f(c[b % 3] + 24), 0.45, m.rr()), 0.3, 0.2 * (-1) ** b)
run(T["later"], T["follows"], ["F", "C"], 0.5, inst="glock")
for i, n in enumerate([81, 77, 74]): m.note(fr(T["follows"] + 5 + i * 11), I.glock(I.m2f(n), 0.6, m.rr(), 0.8), 0.35)                # 3, 2, 1
run(T["walks"], F("500", 0, -3), ["Bb", "C"], 0.5, tune=False); m.stab(fr(F("500", 0, -3)), "F", 0.85)
run(F("500", 0, 14), T["all"], ["F", "C"], 0.6)
for i, ch in enumerate(["Dm", "Gm", "A7"]):                                                                  # last word: slow waltz
    c = {"Dm": [38, 53, 57], "Gm": [43, 55, 58], "A7": [45, 52, 55]}[ch]; t = fr(T["all"]) + i * 0.95
    if t < fr(END) - 0.8:
        m.note(t, I.brass(I.m2f(c[0]), 0.8, 0.5, m.rr(), "tuba"), 0.5, -0.1)
        for k in (1, 2): m.note(t + 0.32 * k, I.pluck(I.m2f(c[1] + 12), 0.4, m.rr(), 0.5, 0.6), 0.3, 0.3); m.note(t + 0.32 * k + 0.01, I.pluck(I.m2f(c[2] + 12), 0.4, m.rr(), 0.5, 0.6), 0.3, 0.3)

# ---------------------------------------------------------------- effects
sea = lambda d, close=1.0: G.water_bed(d, m.rr(), close)
m.bed(0, T["year"], sea(3.3), -17, "bow wave"); m.ev(0, G.hurrah(m.rr(), 140, 1.0), -9, "the crew: land!"); m.ev(2, G.creak(0.8, m.rr()), -14, "hull creak")
m.ev(F("didn't", 0, -4), "whoosh", -9, "camera up"); m.ev(F("didn't", 0, 2), G.oof(m.rr(), "oof"), -9, "crew groan"); m.ev(F("boat", 0, 0), G.splash_big(m.rr()), -14, "ship swings away")
m.bed(T["year"], T["fog"], G.bird_chirps(11.5, m.rr(), 0.4), -25, "harbour birds"); m.bed(T["year"], F("dad"), m.steps(4.9, 3.2), -15, "Bjarni's boots")
for k in range(3): m.ev(F("dad", 0, 4 + k * 5), "thud", -8, "knock", -0.2, 1.3)
m.ev(F("moved", 0, -2), "paper", -11, "the note"); m.ev(F("moved"), "gasp", -9, "gasp", -0.2); m.ev(F("a", 1, -5), "whoosh", -12, "to the signpost"); m.ev(F("never"), "boing", -10, "?")
m.ev(T["noMap"] - 2, "whoosh", -13, "to the ship"); m.bed(T["noMap"], T["fog"], sea(2.5, 0.5), -22, "water at the dock")
m.ev(F("map", 0, -2), "splat", -8, "no map", 0.3); m.ev(F("compass", 0, -2), "splat", -8, "no compass", -0.3, 0.85); m.ev(F("how", 0, -2), "pop", -9, "confidence"); m.ev(F("be", 0, 6), "ding", -12, "ding")
m.bed(T["fog"], T["clears"], G.breeze(3.8, m.rr(), 1.4), -15, "wind in the fog"); m.bed(T["fog"], T["clears"], sea(3.8, 1.2), -17, "heavy sea"); m.bed(T["fog"], T["wind"], G.creak(1.7, m.rr()), -16, "rigging")
m.ev(F("fog", 0, 2), "boing", -11, "?"); m.ev(T["wind"] - 2, G.whoosh(1.4, m.rr(), 0.5, 200, 1400), -8, "the wind takes them"); m.ev(F("south"), G.whoa(m.rr()), -11, "whoa")
m.bed(T["clears"], T["times"], sea(8.3, 0.8), -20, "calm sea"); m.bed(T["clears"], T["times"], G.bird_chirps(8.3, m.rr(), 0.5), -24, "shore birds")
m.ev(F("there's", 0, -2), "whoosh", -11, "over their heads"); m.ev(F("land"), "ding", -10, "land!"); m.ev(F("land", 0, 4), G.hurrah(m.rr(), 150, 1.0), -10, "cheer")
m.bed(T["crew"], F("bjarni", 2, -3), G.babble(1.5, m.rr(), 150, 1.0), -12, "the crew begs"); m.ev(F("bjarni", 2, -5), "whoosh", -11, "to Bjarni")
m.ev(F("no", 2), "thud", -8, "no"); m.ev(F("not"), "thud", -8, "not", 0, 0.9); m.ev(F("keep"), "stamp", -5, "keep sailing"); m.ev(F("keep", 0, 5), G.oof(m.rr(), "oof"), -10, "groan")
m.bed(T["times"], T["finds"], sea(3.4), -19, "sea"); m.ev(T["times"] + 5, "pop", -8, "2"); m.ev(T["third"] + 5, "pop", -8, "3", 0, 0.85); m.ev(F("zero", 0, -2), "pop", -8, "0", 0, 0.6)
m.bed(T["finds"], T["see"], G.breeze(4.0, m.rr(), 1.0, bright=1500), -19, "cold wind"); m.bed(T["finds"], bump, sea(1.7, 1.2), -16, "ship comes in")
m.ev(F("parks", 0, -5), "whoosh", -11, "to the door"); m.ev(bump, "thud", -4, "bump"); m.ev(bump, G.creak(0.6, m.rr()), -10, "creak"); m.ev(bump + 3, "gasp", -10, "Dad", 0.3); m.ev(F("never", 1, -2), G.hurrah(m.rr(), 140, 1.0), -11, "home")
m.bed(T["see"], T["later"], m.crackle(2.8, 30), -17, "fire"); m.ev(F("exploring"), "kiss", -10, "slurp", -0.2, 0.8); m.ev(F("late", 0, -2), G.clink(m.rr(), 900, 0.3), -6, "ladle"); m.ev(F("dinner"), "gasp", -11, "gulp", -0.2)
m.bed(T["later"], T["follows"], sea(2.9, 0.5), -22, "dock"); m.ev(F("leif"), "pop", -10, "Leif"); m.ev(F("buys", 0, -2), "coin", -7, "sold", 0.2); m.ev(F("buys", 0, 4), "ding", -12, "ka-ching")
m.bed(T["follows"], T["walks"], sea(1.6), -18, "under sail")
for i in range(3): m.ev(T["follows"] + 5 + i * 11, "pop", -9, "3 2 1"[i * 2], 0, 0.8 + 0.15 * i)
m.bed(T["walks"], T["all"], sea(3.4, 0.4), -23, "surf"); m.bed(T["walks"], F("500", 0, -3), m.steps(1.6, 3.6, 0.9), -12, "boots on sand")
for i in range(6): m.ev(T["walks"] + 4 + i * 6, "pop", -14, "footprint", 0, 0.6)
m.ev(F("500", 0, -5), "whoosh", -10, "up"); m.ev(F("500", 0, -1), G.hurrah(m.rr(), 150, 1.0), -9, "Vinland!"); m.bed(F("500", 0, 0), T["all"], m.crackle(1.8, 30), -19, "campfire")
m.bed(T["all"], END, m.crackle(3.3, 30), -17, "fire"); m.ev(F("one", 1), "kiss", -9, "slurp", -0.2, 0.8); m.ev(F("lost"), "kiss", -9, "slurp", -0.2, 0.75); m.ev(F("stop", 0, 2), "ding", -11, "the last word")
m.finish(bed_under=7.5)
