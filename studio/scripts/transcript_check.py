#!/usr/bin/env python3
"""Did the voice say the script?  python3 scripts/transcript_check.py <film> [--fix]

Compares the aligned words (src/videos/<film>/words.json, from faster-whisper) with the script the voice was given
(audio/<film>/voice_text.txt), word by word. The aligner mis-hears names and short words ("buys" -> "Bies", "Keep" ->
"keeps"); captions are made from words.json, so a mis-heard word is a typo on screen, and a word the voice really
dropped or added is a line to re-record.

  same count, different spelling   a mis-hearing. With --fix the word is rewritten from the script; its timing is kept.
  digits for number words          accepted ("986" for "nine eighty-six"): captions read better with digits.
  words missing or added           FAIL: the voice did not say the line. Reword it and run audio/voice.py again.
With --fix every word also takes the script's punctuation and capitals, so captions and sentence breaks follow the
script exactly. Exit code 1 while any difference remains."""
import difflib, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
film = sys.argv[1]; fix = "--fix" in sys.argv
wpath = os.path.join(HERE, "..", "src", "videos", film, "words.json")
words = json.load(open(wpath))
script = [t for l in open(os.path.join(HERE, "..", "audio", film, "voice_text.txt")) for t in l.replace("-", " ").split() if re.search(r"\w", t)]
# a hyphenated spoken word ("eighty-six") is two script tokens; the aligner may give one or two
norm = lambda t: re.sub(r"[^a-z0-9']", "", t.lower().replace("’", "'"))
NUM = set("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million and oh".split())
a, b = [norm(t) for t in script], [norm(w["w"]) for w in words]
out, fixed, bad = [], [], []
for op, i0, i1, j0, j1 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
    S, W = script[i0:i1], words[j0:j1]
    if op == "equal":
        out += [{**w, "w": s} for s, w in zip(S, W)]
    elif op == "replace" and all(re.fullmatch(r"[\d,.]+\w*", w["w"].strip(".,!?;:")) for w in W) and all(norm(s) in NUM for s in S):
        tail = re.search(r"[.,!?;:]+$", S[-1]); out += W[:-1] + [{**W[-1], "w": W[-1]["w"].rstrip(".,!?;:") + (tail.group(0) if tail else "")}]
    elif op == "replace" and len(S) == len(W):
        fixed += [f'{w["w"]!r} -> {s!r} at {w["s"]:.2f} s' for s, w in zip(S, W)]; out += [{**w, "w": s} for s, w in zip(S, W)]
    else:
        at = W[0]["s"] if W else (words[j0 - 1]["e"] if j0 else 0.0)
        bad.append(f'at {at:.2f} s the script says "{" ".join(S)}" but the voice track has "{" ".join(w["w"] for w in W)}"'); out += W
print(f"{film}: {len(script)} script words, {len(words)} aligned words, {len(fixed)} mis-heard, {len(bad)} missing or added")
for f in fixed: print(("fixed: " if fix else "FAIL: mis-heard ") + f)
for x in bad: print("FAIL:", x)
if fix and not bad:
    changed = [w["w"] for w in out] != [w["w"] for w in words]
    if changed: json.dump(out, open(wpath, "w")); print("words.json rewritten from the script (timings unchanged)")
ok = not bad and (fix or not fixed)
print("PASS" if ok else "transcript differs from the script" + ("" if fix else " (run with --fix to repair mis-hearings)")); sys.exit(0 if ok else 1)
