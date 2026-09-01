# -*- coding: utf-8 -*-
"""Emit dosage-guide/compounds.js from the category tables."""
import json, io, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data1 import C1
from data2 import C2
from data3 import C3
from data4 import C4, C5, C6
from data5 import C7, C8, C9


def default_time(when):
    """Map the plain-language timing to a clock time for the calendar."""
    w = when.lower()
    if "sleep" in w or "bed" in w:            return "21:30"
    # "Morning and evening" is a split dose — the first one is the morning.
    if "morning" in w:                        return "08:00"
    if "after training" in w:                 return "18:00"
    if "training" in w:                       return "07:30"
    if "evening" in w or "night" in w:        return "20:00"
    return "09:00"

ALL = C1 + C2 + C3 + C4 + C5 + C6 + C7 + C8 + C9

# Category display order, matching the price list.
ORDER = ["Weight Loss & GLP-1","Growth Hormone","Healing & Repair","Brain & Mood",
         "Energy & Endurance","Immunity","Sexual Health","Longevity","Bioregulators"]
ALL.sort(key=lambda c: (ORDER.index(c["cat"]), c["name"].lower()))

slugs = [c["slug"] for c in ALL]
assert len(slugs) == len(set(slugs)), "duplicate slug"
for c in ALL:
    assert c["cat"] in ORDER, c["cat"]
    assert len(c["days"]) == 7, c["slug"]
    assert c["ev"] in ("label","trial","regional","preclinical"), c["slug"]
    assert c["sizes"], c["slug"]
    assert c["dose"] > 0, c["slug"]
    # the default pen is the smallest size offered
    smallest = min(c["sizes"], key=lambda s: s[0])
    assert c["unit"] == smallest[1], (c["slug"], c["unit"], smallest[1])
    assert c["dose"] <= smallest[0], (c["slug"], "dose exceeds smallest pen")

def js(o):
    return json.dumps(o, ensure_ascii=False)

out = io.StringIO()
out.write('''/* ------------------------------------------------------------------ *
 * AXIOM — Compound Guide data
 *
 * Every compound in the AXIOM price list. Written in plain language: what
 * it is, when to take it, what it is studied for, and — where one exists —
 * the documented dose.
 *
 * HOW SURE ARE WE? Every dose carries one of four tags. This is the spine
 * of the guide: it separates a documented regimen from a number somebody
 * made up.
 *
 *   "label"       An approved medicine. The doses shown are the official
 *                 ones, and the approval is named.
 *   "trial"       Not approved, but tested in real human trials. The doses
 *                 shown are what the trials used.
 *   "regional"    Approved or sold in some countries only.
 *   "preclinical" Lab and animal work only. NO human dose has been set, and
 *                 the guide says so rather than inventing one.
 *
 * Nothing here is a prescription. Pen sizes come from the price list;
 * prices are deliberately not included.
 * ------------------------------------------------------------------ */
window.COMPOUNDS = [
''')

for i, c in enumerate(ALL):
    smallest = min(c["sizes"], key=lambda s: s[0])
    o = {
      "slug": c["slug"], "name": c["name"], "category": c["cat"],
      "what": c["what"], "cls": c["cls"],
      "halfLife": c["half"], "route": c["route"],
      "cadence": c["cadence"], "days": c["days"], "cadenceNote": c["cadNote"],
      "timing": {"when": c["when"], "food": c["food"], "note": c["timeNote"],
                 "time": c.get("time") or default_time(c["when"])},
      "perWeek": c["perWeek"],
      "evidence": c["ev"], "evidenceNote": c["evNote"],
      "protocol": [{"k": k, "v": v, "n": n} for k, v, n in c["protocol"]],
      "benefits": c["benefits"],
      "pen": {"qty": smallest[0], "dose": c["dose"], "unit": c["unit"]},
      # Prices deliberately stay out of the shipped data — src/ keeps them as
      # the record of the price list, but the guide does not show them.
      "sizes": [{"qty": q, "unit": u} for q, u, _ in c["sizes"]],
      "storage": c["storage"], "cautions": c["cautions"],
    }
    # Optional alternative schedules. Only emitted where a compound has more
    # than one sensible way to spread the same weekly amount.
    if c.get("regimens"):
        rs = c["regimens"]
        assert len(rs) > 1, c["slug"]
        for r in rs:
            assert len(r["days"]) == 7 and r["dose"] > 0, (c["slug"], r["id"])
        o["regimens"] = [{"id": r["id"], "label": r["label"], "sub": r["sub"],
                          "dose": r["dose"], "perWeek": r["perWeek"],
                          "days": r["days"], "note": r["note"]} for r in rs]
    out.write("  " + js(o) + ("," if i < len(ALL) - 1 else "") + "\n")

out.write("""];

/* Shared handling note — the pens arrive ready to use. */
window.HANDLING = "Your pen arrives ready to use — the mixing water is already in it, so there is nothing to prepare. Keep it in the fridge, out of the light, and don't freeze it. Let it come to room temperature before you use it, and finish it within 28 days of the first dose.";

window.EVIDENCE_META = {
  label:       { label: "Approved medicine",        tone: "solid", blurb: "This is an approved medicine. The doses shown are the official ones." },
  trial:       { label: "Studied in people",        tone: "mid",   blurb: "Not approved, but tested in real human trials. The doses shown are what those trials used — not an official regimen." },
  regional:    { label: "Approved in some countries", tone: "mid", blurb: "Approved or sold in certain countries only. Check the position where you are." },
  preclinical: { label: "Lab research only",        tone: "open",  blurb: "Only lab and animal studies exist. No human dose has been established, and this guide will not invent one." }
};
""")

open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'compounds.js'), 'w').write(out.getvalue())

from collections import Counter
print("compounds:", len(ALL))
for cat, n in Counter(c["cat"] for c in ALL).most_common():
    print(f"  {cat:24} {n}")
print("evidence:", dict(Counter(c["ev"] for c in ALL)))
