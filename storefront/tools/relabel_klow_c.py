"""Relabel the KLOW stone photograph as KLOW-C: erase the name and quantity, redraw them in a matching face.

Needs opencv-python-headless and the Inter OTF fonts. Made assets/stone-klow-c-klow-plus-cartalax.png with:
  python3 tools/relabel_klow_c.py assets/stone-klow-bpc-plus-tb-plus-ghk-plus-kpv.png out.png \
    "KLOW-C (KLOW + Cartalax)" "100 mg" Regular 0.76
The label angle (34.7 degrees) and text boxes are measured for the KLOW photograph only."""
import sys, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
src, out, name, qty, weight = sys.argv[1:6]
S4 = 4
im = cv2.imread(src)
C, A = (600.0, 580.0), 34.7
M = cv2.getRotationMatrix2D(C, A, 1.0); Minv = cv2.invertAffineTransform(M)
H, W = im.shape[:2]
rot = cv2.warpAffine(im, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
g = cv2.cvtColor(rot, cv2.COLOR_BGR2GRAY)
# erase old name and quantity
erase = np.zeros_like(g)
for x0, y0, x1, y1 in [(372, 554, 652, 590), (446, 591, 512, 616)]:
    erase[y0:y1, x0:x1] = (g[y0:y1, x0:x1] > 60).astype(np.uint8) * 255
erase = cv2.dilate(erase, np.ones((5, 5), np.uint8))
clean = cv2.inpaint(rot, erase, 6, cv2.INPAINT_TELEA)
font_path = f'/usr/share/fonts/opentype/inter/Inter-{weight}.otf'
def render(text, cap_px, xscale):
    f = ImageFont.truetype(font_path, int(round(cap_px / 0.727 * S4)))
    l, t, r, b = f.getbbox(text)
    cap_top = f.getbbox('H')[1]
    img = Image.new('L', (r - l + 8 * S4, b - cap_top + 8 * S4), 0)
    ImageDraw.Draw(img).text((4 * S4 - l, 4 * S4 - cap_top), text, font=f, fill=255)
    w = int(round(img.width * xscale / S4)); h = int(round(img.height / S4))
    return np.asarray(img.resize((w, h), Image.LANCZOS), dtype=np.float32) / 255.0  # cap top sits at y=4
def place(canvas, alpha, x, captop, color=(236, 236, 236)):
    h, w = alpha.shape; y = captop - 4; x = x - 4
    region = canvas[y:y + h, x:x + w].astype(np.float32)
    a = alpha[..., None] * 0.97
    canvas[y:y + h, x:x + w] = (region * (1 - a) + np.array(color, np.float32) * a).clip(0, 255).astype(np.uint8)
xs = float(sys.argv[6]) if len(sys.argv) > 6 else 0.86
new = clean.copy()
place(new, render(name, 19.5, xs), 378, 560)
place(new, render(qty, 14.5, 0.84), 452, 597)
# put back only the label text band
band = np.zeros((H, W), np.float32); band[550:620, 366:760] = 1.0
band = cv2.GaussianBlur(band, (0, 0), 2)
back = cv2.warpAffine(new, Minv, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
bandb = cv2.warpAffine(band, Minv, (W, H), flags=cv2.INTER_LINEAR)[..., None]
res = (im.astype(np.float32) * (1 - bandb) + back.astype(np.float32) * bandb).clip(0, 255).astype(np.uint8)
cv2.imwrite(out, res)
cv2.imwrite(out.replace('.png', '-rot.png'), cv2.resize(new[480:700, 300:950], None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC))
