#!/usr/bin/env python3
"""Merch photography into the sizes the storefront serves.

A product photograph is a square studio shot, unlike the pen catalogue's 1672x940 tiles. Drop one
file per slug into scripts/merch/src (jpg, png or webp, square), run this, and each becomes
public/products/<slug>-{400,800,1280}.webp. The manifest gains the slug under "photos", so the site
knows a photograph exists without reading the directory at request time.

    python3 scripts/merch/build.py
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "scripts" / "merch" / "src"
OUT = ROOT / "public" / "products"
WIDTHS = (400, 800, 1280)
SUFFIXES = (".jpg", ".jpeg", ".png", ".webp")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    sources = sorted(p for p in SRC.glob("*") if p.suffix.lower() in SUFFIXES)
    if not sources:
        print(f"no source photographs in {SRC.relative_to(ROOT)} — nothing to build")
        return 0

    built: list[str] = []
    for src in sources:
        slug = src.stem
        im = Image.open(src).convert("RGB")
        w, h = im.size
        if w != h:  # a square tile is the shape every surface reserves; centre-crop anything else
            side = min(w, h)
            im = im.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
        for width in WIDTHS:
            im.resize((width, width), Image.LANCZOS).save(OUT / f"{slug}-{width}.webp", "WEBP", quality=86, method=6)
        built.append(slug)
        print(f"{slug}: {w}x{h} -> {', '.join(str(x) for x in WIDTHS)}")

    # the pen build owns "slugs"; this owns "photos". Neither clobbers the other's list.
    path = OUT / "manifest.json"
    manifest = json.loads(path.read_text()) if path.exists() else {"widths": list(WIDTHS), "slugs": []}
    manifest["photos"] = sorted(set(manifest.get("photos", [])) | set(built))
    path.write_text(json.dumps(manifest, indent=0) + "\n")
    print(f"manifest: {len(manifest['slugs'])} rendered, {len(manifest['photos'])} photographed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
