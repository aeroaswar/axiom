"""Turns order-form.flat.pdf into the fillable AXIOM order form.

Reads fields.json (written by build.cjs) and adds AcroForm fields over the
page artwork, so the PDF can be filled on a phone (iOS Files / Books,
Android Drive, Adobe Acrobat) and sent back:
  - a text field over every cream input box
  - an mg / IU / mL radio group on every order line
  - the research-use confirmation checkbox
Typed text uses the brand's Inter, embedded as a simple TrueType font, so
filled-in answers match the page instead of falling back to Helvetica.
Requires: pip install pymupdf fonttools brotli
"""
import base64
import io
import json
import re
from pathlib import Path

import pymupdf
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = Path(__file__).parent
OUT = HERE.parent / "AXIOM-Order-Form.pdf"

LABELS = {"name": "Name", "phone": "Phone Number", "address": "Address", "notes": "Notes",
          "ruo_confirm": "I confirm this order is for research use only"}
PREFIX_LABELS = {"item": "Item / Compound", "amount": "Amount", "qty": "Quantity", "unit": "Unit (mg / IU / mL)"}
FIELD_PT = 11                          # one size for every typed answer
# Multi-line fields always start their text at the top, so two lines of 11pt leave the
# spare space below. Starting the text area lower evens the gap above and below
# (Apple's renderer: 5.5pt over 10.7pt before; ~8pt over ~8.2pt with this drop).
MULTILINE_DROP = 2.5
INK_ON_FIELD = (0.027, 0.024, 0.020)  # --bg, dark text on the cream box
DOT = "0.906 0.694 0.451"             # --accent-bright, the selected radio dot
TICK = "0.027 0.024 0.020"            # --bg, the tick drawn on the cream square
ACCENT_BORDER = 3 * 0.75               # skip the 3px accent rule on the box's left edge
RADIO_FLAGS = 1 << 15                  # Radio; no NoToggleToOff, so tapping the chosen unit clears it


def label_for(name):
    if name in LABELS:
        return LABELS[name]
    prefix, n = name.split("_")
    return f"{PREFIX_LABELS[prefix]} {n}"


def circle(cx, cy, r):
    """Filled circle as four Bézier arcs, in PDF content-stream syntax."""
    k = 0.5523 * r
    return (f"{cx + r:.2f} {cy:.2f} m "
            f"{cx + r:.2f} {cy + k:.2f} {cx + k:.2f} {cy + r:.2f} {cx:.2f} {cy + r:.2f} c "
            f"{cx - k:.2f} {cy + r:.2f} {cx - r:.2f} {cy + k:.2f} {cx - r:.2f} {cy:.2f} c "
            f"{cx - r:.2f} {cy - k:.2f} {cx - k:.2f} {cy - r:.2f} {cx:.2f} {cy - r:.2f} c "
            f"{cx + k:.2f} {cy - r:.2f} {cx + r:.2f} {cy - k:.2f} {cx + r:.2f} {cy:.2f} c f")


def embed_inter(doc):
    """Embed Inter Regular (from the price list's own @font-face) as a WinAnsi TrueType font; return its xref."""
    html = (HERE.parent / "axiom-pricelist-print.html").read_text()
    face = next(b for b in re.findall(r"@font-face \{(.*?)\}", html, re.S)
                if "'Inter'" in b and "font-weight: 400" in b)
    font = TTFont(io.BytesIO(base64.b64decode(re.search(r"base64,([^)]+)\)", face).group(1))))
    if "fvar" in font:
        font = instancer.instantiateVariableFont(font, {"wght": 400})
    font.flavor = None
    buf = io.BytesIO()
    font.save(buf)
    data = buf.getvalue()

    upm = font["head"].unitsPerEm
    scale = lambda v: round(v * 1000 / upm)
    cmap, hmtx = font.getBestCmap(), font["hmtx"]
    widths = []
    for code in range(32, 256):
        ch = bytes([code]).decode("cp1252", errors="ignore")
        gid = cmap.get(ord(ch)) if ch else None
        widths.append(scale(hmtx[gid][0]) if gid else 0)
    head, hhea, os2 = font["head"], font["hhea"], font["OS/2"]

    file_xref = doc.get_new_xref()
    doc.update_object(file_xref, f"<< /Length1 {len(data)} >>")
    doc.update_stream(file_xref, data)
    desc = doc.get_new_xref()
    doc.update_object(desc, (
        f"<< /Type /FontDescriptor /FontName /Inter-Regular /Flags 32 "
        f"/FontBBox [{scale(head.xMin)} {scale(head.yMin)} {scale(head.xMax)} {scale(head.yMax)}] "
        f"/ItalicAngle 0 /Ascent {scale(hhea.ascent)} /Descent {scale(hhea.descent)} "
        f"/CapHeight {scale(getattr(os2, 'sCapHeight', 0) or 700)} /StemV 80 /FontFile2 {file_xref} 0 R >>"))
    xref = doc.get_new_xref()
    doc.update_object(xref, (
        f"<< /Type /Font /Subtype /TrueType /BaseFont /Inter-Regular /FirstChar 32 /LastChar 255 "
        f"/Widths [{' '.join(map(str, widths))}] /Encoding /WinAnsiEncoding /FontDescriptor {desc} 0 R >>"))
    return xref


def form_xobject(doc, w, h, content):
    xref = doc.get_new_xref()
    doc.update_object(xref, f"<< /Type /XObject /Subtype /Form /BBox [0 0 {w:.2f} {h:.2f}] /Resources << >> >>")
    doc.update_stream(xref, content.encode())
    return xref


doc = pymupdf.open(HERE / "order-form.flat.pdf")
spec = json.loads((HERE / "fields.json").read_text())

# ---- text fields ----
text_fields = []
for f in spec["text"]:
    page = doc[f["page"]]
    w = pymupdf.Widget()
    w.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
    w.field_name = f["name"]
    w.field_label = label_for(f["name"])  # tooltip / accessible name
    top = f["y"] + 1 + (MULTILINE_DROP if f["multiline"] else 0)
    w.rect = pymupdf.Rect(f["x"] + ACCENT_BORDER + 5, top, f["x"] + f["w"] - 5, f["y"] + f["h"] - 1)
    w.text_font = "Helv"
    w.text_fontsize = FIELD_PT
    w.text_color = INK_ON_FIELD
    w.border_width = 0
    w.fill_color = None     # the cream box is part of the page artwork
    if f["multiline"]:
        w.field_flags |= pymupdf.PDF_TX_FIELD_IS_MULTILINE
    if f["maxLen"]:
        w.text_maxlen = f["maxLen"]
    annot = page.add_widget(w)
    text_fields.append(annot.xref)
    if f["center"]:
        doc.xref_set_key(annot.xref, "Q", "1")

# ---- mg / IU / mL radio groups (written directly: each option gets its own on-state name) ----
groups = {}
for r in spec["radio"]:
    groups.setdefault((r["page"], r["group"]), []).append(r)

new_fields = []
for (pno, group), options in groups.items():
    page = doc[pno]
    H = page.rect.height
    parent = doc.get_new_xref()
    kids = []
    for o in options:
        w, h = o["w"], o["h"]
        on = form_xobject(doc, w, h, f"q {DOT} rg {circle(o['cx'], h - o['cy'], o['rr'] * 0.5)} Q")
        off = form_xobject(doc, w, h, "")
        kid = doc.get_new_xref()
        doc.update_object(kid, (
            f"<< /Type /Annot /Subtype /Widget /F 4 /P {page.xref} 0 R /Parent {parent} 0 R "
            f"/Rect [{o['x']:.2f} {H - o['y'] - h:.2f} {o['x'] + w:.2f} {H - o['y']:.2f}] "
            f"/MK << /CA (l) >> /AS /Off "
            f"/AP << /N << /{o['value']} {on} 0 R /Off {off} 0 R >> /D << /{o['value']} {on} 0 R /Off {off} 0 R >> >> >>"))
        kids.append(kid)
    doc.update_object(parent, (
        f"<< /FT /Btn /Ff {RADIO_FLAGS} /T ({group}) /TU ({label_for(group)}) /V /Off "
        f"/Kids [{' '.join(f'{k} 0 R' for k in kids)}] >>"))
    new_fields.append(parent)
    annots = [a[0] for a in page.annot_xrefs()] + kids
    doc.xref_set_key(page.xref, "Annots", "[" + " ".join(f"{a} 0 R" for a in annots) + "]")

# ---- checkboxes (field and widget in one object; the tick sits in the cream square) ----
for c in spec["check"]:
    page = doc[c["page"]]
    H = page.rect.height
    w, h = c["w"], c["h"]
    x0, top, sz = c["sx"], h - c["sy"], c["size"]  # square's left edge and top, in widget space
    pts = [(0.22, 0.52), (0.42, 0.30), (0.80, 0.74)]  # tick, as fractions of the square (y up)
    path = " ".join(f"{x0 + px * sz:.2f} {top - sz + py * sz:.2f} {'m' if i == 0 else 'l'}" for i, (px, py) in enumerate(pts))
    on = form_xobject(doc, w, h, f"q {TICK} RG 2.2 w 1 J 1 j {path} S Q")
    off = form_xobject(doc, w, h, "")
    xref = doc.get_new_xref()
    doc.update_object(xref, (
        f"<< /Type /Annot /Subtype /Widget /F 4 /P {page.xref} 0 R "
        f"/FT /Btn /T ({c['name']}) /TU ({label_for(c['name'])}) /V /Off /AS /Off "
        f"/Rect [{c['x']:.2f} {H - c['y'] - h:.2f} {c['x'] + w:.2f} {H - c['y']:.2f}] "
        f"/MK << /CA (4) >> "
        f"/AP << /N << /Yes {on} 0 R /Off {off} 0 R >> /D << /Yes {on} 0 R /Off {off} 0 R >> >> >>"))
    new_fields.append(xref)
    annots = [a[0] for a in page.annot_xrefs()] + [xref]
    doc.xref_set_key(page.xref, "Annots", "[" + " ".join(f"{a} 0 R" for a in annots) + "]")

# ---- typed text in Inter: register the font in the form's resources and point every text field at it ----
inter = embed_inter(doc)
cat = doc.pdf_catalog()
doc.xref_set_key(cat, "AcroForm/DR/Font/Inter", f"{inter} 0 R")
for x in text_fields:
    size = doc.xref_get_key(x, "DA")[1].split(" Tf")[0].split()[-1]
    doc.xref_set_key(x, "DA", f"(/Inter {size} Tf {' '.join(map(str, INK_ON_FIELD))} rg)")
doc.xref_set_key(cat, "AcroForm/DA", f"(/Inter 12 Tf {' '.join(map(str, INK_ON_FIELD))} rg)")

doc.xref_set_key(cat, "AcroForm/Fields", "[" + " ".join(f"{x} 0 R" for x in text_fields + new_fields) + "]")
# No NeedAppearances: it makes viewers redraw the mg / IU buttons in their own style.
# Text fields already carry appearances and viewers redraw them as the user types.

doc.set_metadata({
    "title": "AXIOM — Order Form",
    "author": "AXIOM",
    "subject": "Order form",
    "creator": "AXIOM",
    "producer": "AXIOM",
})
doc.save(OUT, garbage=4, deflate=True)
print(f"{OUT.name}: {len(doc)} page(s), {len(text_fields)} text fields, "
      f"{len(groups)} unit groups, {len(spec['check'])} checkbox")
