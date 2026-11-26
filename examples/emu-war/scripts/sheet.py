import sys
from PIL import Image, ImageDraw
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f) for f in files]; w, h = 270, 480
rows = (len(ims) + cols - 1) // cols
s = Image.new('RGB', (w * cols, h * rows), 'black'); d = ImageDraw.Draw(s)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * w, (i // cols) * h
    s.paste(im.resize((w, h)), (x, y)); d.text((x + 6, y + 6), f.split('_')[-1].split('.')[0], fill='white')
s.save(out, quality=85)
