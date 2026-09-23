"""Reads price-list-source.pdf and writes compounds.json for build.cjs.

Keeps each compound once with its lot sizes, in price-list order; prices are
dropped. Re-run after dropping a newer price list PDF in place.
Requires: pip install pymupdf
"""
import json
import re
from pathlib import Path

import pymupdf

HERE = Path(__file__).parent
LOT = re.compile(r"^(\d+(?:[.,]\d+)?)\s*(mg|IU|mL)$")
PRICE = re.compile(r"^Rp\s?[\d.]+$")

lines = [l.strip() for p in pymupdf.open(HERE / "price-list-source.pdf") for l in p.get_text().splitlines() if l.strip()]
compounds = {}
for name, lot, price in zip(lines, lines[1:], lines[2:]):
    m = LOT.match(lot)
    if m and PRICE.match(price):
        entry = compounds.setdefault(name, {"name": name, "sizes": [], "units": []})
        entry["sizes"].append(m.group(1))
        if m.group(2) not in entry["units"]:
            entry["units"].append(m.group(2))

out = list(compounds.values())
(HERE / "compounds.json").write_text(json.dumps(out, indent=1) + "\n")
print(f"compounds.json: {len(out)} compounds, {sum(len(c['sizes']) for c in out)} lots, "
      f"units {sorted({u for c in out for u in c['units']})}")
