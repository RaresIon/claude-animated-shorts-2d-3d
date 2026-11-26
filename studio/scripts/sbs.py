import sys
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]; items = [a.split("=", 1) for a in sys.argv[2:]]
F = ImageFont.truetype("/home/user/claude-animated-shorts-2d-3d/studio/public/fonts/Poppins-ExtraBold.ttf", 30)
W, H, P = 540, 960, 12
S = Image.new("RGB", (len(items) * (W + P) + P, H + 70 + P), "#14121a"); d = ImageDraw.Draw(S)
for i, (lab, path) in enumerate(items):
    im = Image.open(path).convert("RGB").resize((W, H), Image.LANCZOS); x = P + i * (W + P)
    S.paste(im, (x, 70)); col = "#7be08a" if lab.upper().startswith("REF") else "#ffd45e" if lab.upper().startswith("NEW") else "#ff8a7a"
    d.text((x + W / 2, 35), lab, font=F, fill=col, anchor="mm")
S.save(out, quality=90)
