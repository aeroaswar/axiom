"""Turns order-form.flat.pdf into the fillable AXIOM order form.

Reads fields.json (written by build.cjs) and places an AcroForm text field
over every cream input box, so the PDF can be filled on a phone
(iOS Files / Books, Android Drive, Adobe Acrobat) and sent back.
Requires: pip install pymupdf
"""
import json
from pathlib import Path

import pymupdf

HERE = Path(__file__).parent
OUT = HERE.parent / "AXIOM-Order-Form.pdf"

LABELS = {"name": "Name", "phone": "Phone Number", "address": "Address"}
INK_ON_FIELD = (0.027, 0.024, 0.020)  # --bg, dark text on the cream box
ACCENT_BORDER = 2 * 0.75               # skip the 2px accent rule on the box's left edge

doc = pymupdf.open(HERE / "order-form.flat.pdf")
fields = json.loads((HERE / "fields.json").read_text())

for f in fields:
    page = doc[f["page"]]
    rect = pymupdf.Rect(f["x"] + ACCENT_BORDER + 3, f["y"] + 1, f["x"] + f["w"] - 3, f["y"] + f["h"] - 1)
    name = f["name"]
    if name.startswith("item_"):
        label = f"Item {name.split('_')[1]}"
    elif name.startswith("qty_"):
        label = f"Quantity {name.split('_')[1]}"
    else:
        label = LABELS[name]

    w = pymupdf.Widget()
    w.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
    w.field_name = name
    w.field_label = label  # tooltip / accessible name
    w.rect = rect
    w.text_font = "Helv"
    w.text_fontsize = 10 if f["multiline"] else 11
    w.text_color = INK_ON_FIELD
    w.border_width = 0
    w.fill_color = None     # the cream box is part of the page artwork
    if f["multiline"]:
        w.field_flags |= pymupdf.PDF_TX_FIELD_IS_MULTILINE
    if f["maxLen"]:
        w.text_maxlen = f["maxLen"]
    annot = page.add_widget(w)
    if f["center"]:
        doc.xref_set_key(annot.xref, "Q", "1")

doc.set_metadata({
    "title": "AXIOM Peptide Science — Order Form",
    "author": "AXIOM",
    "subject": "Order form · price list v1.0 · AX-OF-v1.0",
    "creator": "AXIOM",
    "producer": "AXIOM",
})
# Ask viewers to regenerate field appearances with the typed value
doc.xref_set_key(doc.pdf_catalog(), "AcroForm/NeedAppearances", "true")
doc.save(OUT, garbage=4, deflate=True)
print(f"{OUT.name}: {len(doc)} pages, {len(fields)} fillable fields")
