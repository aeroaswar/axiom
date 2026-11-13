#!/usr/bin/env python3
"""Stage the invoice builder for republishing as a Claude Artifact.

The Artifact host wraps a published page in its own doctype/html/head/body
skeleton, so this writes axiom-invoice-a4.html without those tags: the page's
<title> and <style> first, then its content. Everything else is unchanged; the
builder notices it is running in the Artifact viewer (window.claude) and saves
PDFs through the downloads capability there instead of the print dialog.

    python3 invoice/artifact.py [out.html]

Then publish the output to https://claude.ai/artifact/<id> with the
`downloads` capability declared.
"""
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
src = (HERE / "axiom-invoice-a4.html").read_text(encoding="utf-8")
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "artifact" / "index.html"

head, sep, rest = src.partition("</style></head><body>")
body, sep2, tail = rest.rpartition("</body></html>")
assert sep and sep2 and not tail.strip(), "unexpected document skeleton"

style = head[head.index("<style>"):]
# A name for the gallery, not a caption; and a dark-only page says so to form controls.
page = ("<title>AXIOM Invoice</title>\n" + style
        + "\n:root{color-scheme:dark}\n</style>\n" + body.strip() + "\n")

for tag in ("<!doctype", "<html", "<head>", "</head>", "<body>", "</body>"):
    assert tag not in page.lower()[:2000] + page.lower()[-200:], tag

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(page, encoding="utf-8")
print(f"{out} ({len(page.encode()) // 1024} KB)")
