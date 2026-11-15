"""Change the name and QTY on an AXIOM stone photograph whose pen sits in the standard catalogue pose.

Generalises relabel_qty.py to the name line: both lines are measured on the levelled label, erased by
inpainting and redrawn in Inter Regular, each narrowed so the old string would have the measured width.
Wordmark, rules, dial, pen and stone keep their original pixels.

  python3 tools/relabel_label.py IN.webp OUT.png "Tirzepatide" "Semaglutide" "10 mg" "10 mg"
"""
import sys, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
src, out, old_name, new_name, old_qty, new_qty = sys.argv[1:7]
S4, FONT = 4, '/usr/share/fonts/opentype/inter/Inter-Regular.otf'
im = cv2.imread(src); H, W = im.shape[:2]
M = cv2.getRotationMatrix2D((600.0, 580.0), 34.7, 1.0); Minv = cv2.invertAffineTransform(M)
rot = cv2.warpAffine(im, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
g = cv2.cvtColor(rot, cv2.COLOR_BGR2GRAY)
BOXES = {'name': (368, 550, 800, 592), 'qty': (440, 590, 600, 618)}
def measure(box):
    X0, Y0, X1, Y1 = box; ys, xs = np.nonzero(g[Y0:Y1, X0:X1] > 110)
    x0, y0, x1, y1 = xs.min() + X0, ys.min() + Y0, xs.max() + X0, ys.max() + Y0
    col = g[Y0:Y1, x0:x0 + 8] > 110; dy = np.nonzero(col.any(axis=1))[0]
    return x0, y0 - Y0 + Y0 if False else dy.min() + Y0, x1, dy.max() - dy.min() + 1
def render(text, cap, xscale, ref):
    f = ImageFont.truetype(FONT, int(round(cap / 0.727 * S4)))
    l, t, r, b = f.getbbox(text); top = f.getbbox(ref)[1]
    img = Image.new('L', (r - l + 8 * S4, b - top + 8 * S4), 0)
    ImageDraw.Draw(img).text((4 * S4 - l, 4 * S4 - top), text, font=f, fill=255)
    return img.resize((max(1, int(round(img.width * xscale / S4))), int(round(img.height / S4))), Image.LANCZOS)
plan = []
for key, old, new, ref in [('name', old_name, new_name, 'H'), ('qty', old_qty, new_qty, '0')]:
    x0, top, x1, cap = measure(BOXES[key])
    probe = np.asarray(render(old, cap, 1.0, ref)); px = np.nonzero(probe.max(axis=0) > 60)[0]
    plan.append((key, new, ref, x0, top, cap, (x1 - x0 + 1) / (px.max() - px.min() + 1)))
erase = np.zeros_like(g)
for X0, Y0, X1, Y1 in BOXES.values(): erase[Y0:Y1, X0:X1] = (g[Y0:Y1, X0:X1] > 60) * 255
erase[Y0:Y1, X0:X1] = erase[Y0:Y1, X0:X1]
erase = cv2.dilate(erase, np.ones((5, 5), np.uint8))
clean = cv2.inpaint(rot, erase, 6, cv2.INPAINT_TELEA)
for key, new, ref, x0, top, cap, xs in plan:
    a = np.asarray(render(new, cap, xs, ref), dtype=np.float32) / 255.0
    h, w = a.shape; x, y = x0 - 4, top - 4
    reg = clean[y:y + h, x:x + w].astype(np.float32)
    clean[y:y + h, x:x + w] = (reg * (1 - a[..., None] * .97) + np.array([236, 236, 236], np.float32) * a[..., None] * .97).clip(0, 255).astype(np.uint8)
    print(f'{key}: cap {cap}px, xscale {xs:.3f}')
band = np.zeros((H, W), np.float32); band[546:622, 364:860] = 1.0
band = cv2.GaussianBlur(band, (0, 0), 2)
back = cv2.warpAffine(clean, Minv, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
bb = cv2.warpAffine(band, Minv, (W, H), flags=cv2.INTER_LINEAR)[..., None]
res = (im.astype(np.float32) * (1 - bb) + back.astype(np.float32) * bb).clip(0, 255).astype(np.uint8)
cv2.imwrite(out, res)
cv2.imwrite(out.rsplit('.', 1)[0] + '-check.png', cv2.resize(cv2.warpAffine(res, M, (W, H))[480:700, 300:950], None, fx=2, fy=2))
