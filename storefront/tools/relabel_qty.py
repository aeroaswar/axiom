"""Change only the QTY figure on an AXIOM stone photograph whose pen sits in the standard catalogue pose.

The label is rotated level (34.7 degrees about 600,580, as in relabel_klow_c.py), the old quantity is
measured, erased by inpainting and redrawn in Inter Regular, narrowed so the old string would have the
measured width. Name, wordmark, rules and dial keep their original pixels.

  python3 tools/relabel_qty.py IN.webp OUT.png "500 mg" "1000 mg"
"""
import sys, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
src, out, old, new = sys.argv[1:5]
S4, FONT = 4, '/usr/share/fonts/opentype/inter/Inter-Regular.otf'
im = cv2.imread(src)
H, W = im.shape[:2]
M = cv2.getRotationMatrix2D((600.0, 580.0), 34.7, 1.0); Minv = cv2.invertAffineTransform(M)
rot = cv2.warpAffine(im, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
g = cv2.cvtColor(rot, cv2.COLOR_BGR2GRAY)
X0, Y0, X1, Y1 = 440, 590, 600, 618                       # the QTY value box, right of the "QTY" caption
ys, xs = np.nonzero(g[Y0:Y1, X0:X1] > 110)
qx0, qy0, qx1, qy1 = xs.min() + X0, ys.min() + Y0, xs.max() + X0, ys.max() + Y0
digits = g[Y0:Y1, qx0:qx0 + 8] > 110                      # cap height from the first digit
dy = np.nonzero(digits.any(axis=1))[0]; cap = dy.max() - dy.min() + 1
def render(text, xscale):
    f = ImageFont.truetype(FONT, int(round(cap / 0.727 * S4)))
    l, t, r, b = f.getbbox(text); top = f.getbbox('0')[1]
    img = Image.new('L', (r - l + 8 * S4, b - top + 8 * S4), 0)
    ImageDraw.Draw(img).text((4 * S4 - l, 4 * S4 - top), text, font=f, fill=255)
    return img.resize((int(round(img.width * xscale / S4)), int(round(img.height / S4))), Image.LANCZOS)
probe = np.asarray(render(old, 1.0)); px = np.nonzero(probe.max(axis=0) > 60)[0]
xscale = (qx1 - qx0 + 1) / (px.max() - px.min() + 1)
erase = np.zeros_like(g); erase[Y0:Y1, X0:X1] = (g[Y0:Y1, X0:X1] > 60) * 255
erase = cv2.dilate(erase, np.ones((5, 5), np.uint8))
clean = cv2.inpaint(rot, erase, 6, cv2.INPAINT_TELEA)
a = np.asarray(render(new, xscale), dtype=np.float32) / 255.0
h, w = a.shape; x = qx0 - 4; y = qy0 - 4
reg = clean[y:y + h, x:x + w].astype(np.float32)
clean[y:y + h, x:x + w] = (reg * (1 - a[..., None] * .97) + np.array([236, 236, 236], np.float32) * a[..., None] * .97).clip(0, 255).astype(np.uint8)
band = np.zeros((H, W), np.float32); band[Y0 - 4:Y1 + 4, X0 - 4:X1 + 60] = 1.0
band = cv2.GaussianBlur(band, (0, 0), 2)
back = cv2.warpAffine(clean, Minv, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
bb = cv2.warpAffine(band, Minv, (W, H), flags=cv2.INTER_LINEAR)[..., None]
res = (im.astype(np.float32) * (1 - bb) + back.astype(np.float32) * bb).clip(0, 255).astype(np.uint8)
cv2.imwrite(out, res)
cv2.imwrite(out.rsplit('.', 1)[0] + '-check.png', cv2.resize(cv2.warpAffine(res, M, (W, H))[480:700, 300:950], None, fx=2, fy=2))
print(f'{src}: cap {cap}px, width {qx1 - qx0 + 1}px, xscale {xscale:.3f}')
