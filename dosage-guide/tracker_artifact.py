#!/usr/bin/env python3
"""Stage the tracker for publishing as a Claude Artifact.

The Artifact host wraps a published page in its own doctype/html/head/body
skeleton and serves no files beside it, so this writes tracker.html without
those tags (its <title>, the side-gutter meta and <style> first, then its
content) and inlines the compound names from compounds.js in place of the
<script src>. Only slug, name and category travel: the tracker needs nothing
else, and none of the guide's dose tables ship with it.

    python3 dosage-guide/tracker_artifact.py [out.html]

Publish the output with capabilities {db, user, assets, downloads}. In the
viewer the page keeps the log in the person's private data/users/<id> subtree
and photos in the asset store; opened anywhere else it stays on the device.
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
src = (HERE / "tracker.html").read_text(encoding="utf-8")
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "artifact" / "tracker.html"

js = (HERE / "compounds.js").read_text(encoding="utf-8")
start = js.index("window.COMPOUNDS")
array = js[js.index("[", start): js.rindex("]") + 1]
compounds = [{"slug": c["slug"], "name": c["name"], "category": c["category"]} for c in json.loads(array)]

style = re.search(r"<style>.*?</style>", src, re.S).group(0)
body = src[src.index("<body>") + len("<body>"): src.rindex("</body>")]
tag = '<script src="compounds.js"></script>'
assert body.count(tag) == 1, "compounds.js script tag not found"
body = body.replace(tag, "<script>window.COMPOUNDS = " + json.dumps(compounds, ensure_ascii=False, separators=(",", ":")) + ";</script>")

page = ('<title>AXIOM Tracker</title>\n'
        '<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400&display=swap" rel="stylesheet">\n'
        + style + "\n" + body.strip() + "\n")

low = page.lower()
for t in ("<!doctype", "<html", "<head>", "</head>", "<body>", "</body>", 'src="compounds.js"'):
    assert t not in low, t
assert "apple-touch-icon" not in low and "manifest" not in low

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(page, encoding="utf-8")
print(f"{out} ({len(page.encode()) // 1024} KB, {len(compounds)} compounds)")
