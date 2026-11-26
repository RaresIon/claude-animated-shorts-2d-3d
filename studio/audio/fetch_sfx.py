"""Fetch CC0 sound effects from Freesound into audio/sfx/ and write CREDITS.md.
Usage: python3 audio/fetch_sfx.py            (needs a Freesound API token in FREESOUND_TOKEN, or a proxy that injects it)
Only Creative Commons 0 sounds are accepted, so nothing needs attribution; CREDITS.md lists them anyway."""
import json, os, subprocess, sys, urllib.parse, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
WANT = {  # name: (query, min s, max s)
    "squeak1": ("rat squeak", 0.2, 2), "squeak2": ("mouse squeak cartoon", 0.1, 1.5), "squeaks": ("rats squeaking", 2, 12),
    "coin": ("coin drop single", 0.2, 2), "coins": ("coins pile pour", 0.5, 4), "stamp": ("rubber stamp", 0.1, 1.5),
    "snip": ("scissors snip", 0.1, 1), "applause": ("small crowd applause", 2, 8), "pop": ("pop cartoon", 0.05, 0.6),
    "whoosh": ("whoosh fast", 0.2, 1.2), "drip": ("sewer water drip echo", 2, 15), "ding": ("bell ding desk", 0.3, 2.5),
    "gasp": ("gasp male", 0.2, 1.5), "paper": ("paper rustle", 0.3, 2), "thud": ("thud impact wood", 0.1, 1),
    "scurry": ("small animal scurry footsteps", 1, 8), "crickets": ("evening crickets", 5, 30), "boing": ("boing cartoon", 0.2, 1.2),
    "kiss": ("kiss cartoon", 0.1, 1), "splat": ("slap wet", 0.1, 0.8),
}
tok = os.environ.get("FREESOUND_TOKEN", "x")
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": f"Token {tok}"}), timeout=40).read()
credits = ["# Sound effect credits", "", "All Creative Commons 0 (public domain) from freesound.org.", ""]
for name, (q, lo, hi) in WANT.items():
    out = os.path.join(HERE, "sfx", name + ".wav")
    url = "https://freesound.org/apiv2/search/text/?" + urllib.parse.urlencode({"query": q, "filter": f'license:"Creative Commons 0" duration:[{lo} TO {hi}]', "fields": "id,name,username,previews,duration,avg_rating", "sort": "rating_desc", "page_size": 5})
    res = json.loads(get(url))["results"]
    if not res: print("no result for", name); continue
    r = res[0]
    if not os.path.exists(out):
        open(out + ".mp3", "wb").write(get(r["previews"]["preview-hq-mp3"]))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out + ".mp3", "-ar", "48000", "-ac", "2", out], check=True); os.remove(out + ".mp3")
    credits.append(f'- `{name}.wav`: "{r["name"]}" by {r["username"]} (freesound.org/s/{r["id"]}), CC0')
    print(name, r["id"], r["name"][:50], round(r["duration"], 2))
open(os.path.join(HERE, "sfx", "CREDITS.md"), "w").write("\n".join(credits) + "\n")
