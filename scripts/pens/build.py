"""
Render the pen catalogue for the site.

Input: the blank straight pen and the AXIOM wordmark (source/), plus the product rows read from
the database (slug, name, smallest lot's content). Output: public/products/<slug>-{400,800,1280}.webp,
one per research compound, and a contact sheet for a visual check.

The label follows the owner's Drive edition (AXIOM-65-PEN-CATALOGUE-WEB-STRAIGHT-ZERO-LABEL-40x20MM):
a 40 × 20 mm matte charcoal sticker at 360 × 180 px on a 1672 × 940 master, the wordmark, the
compound name, QTY only (no dose line), the clicker fixed at 0. Every figure on a label comes from a
row; nothing is typed here.

Usage:  python3 scripts/pens/build.py [--src DIR] [--out public/products] [--sheet]
        DATABASE_URL must point at the seeded database (psql is used to read the rows).
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
FONTS = ROOT / "fonts"
WIDTH, HEIGHT = 1672, 940
LABEL = (724, 356, 360, 180)  # x, y, w, h — exactly 2:1
RADIUS = 7
SCALE = 4
WIDTHS = (400, 800, 1280)


def font(size: float, bold=False, italic=False) -> ImageFont.FreeTypeFont:
    name = "InstrumentSans-" + ("BoldItalic" if bold and italic else "Bold" if bold else "Italic" if italic else "Regular") + ".ttf"
    return ImageFont.truetype(str(FONTS / name), round(size * SCALE))


def rows_from_db() -> list[dict]:
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL is not set")
    sql = """
      select json_agg(x order by x.slug) from (
        select p.slug, p.name, (select v.dose from public.product_variants v where v.product_id = p.id
                                 order by v.price_idr nulls last, v.sku limit 1) as qty
        from public.products p where p.kind = 'peptide' and p.is_published) x"""
    out = subprocess.run(["psql", url, "-Atc", sql], capture_output=True, text=True, check=True).stdout.strip()
    return json.loads(out or "[]")


def numeric_qty(q: str | None) -> str:
    if not q:
        return ""
    m = re.match(r"^\s*([\d.,]+\s*[A-Za-zµ]+)", q)
    return m.group(1).strip() if m else q.strip()


def prepare_wordmark(path: Path) -> Image.Image:
    src = Image.open(path).convert("RGB")
    mask = ImageOps.grayscale(src).point(lambda v: 0 if v <= 12 else min(255, round((v - 12) * 255 / 225)))
    bbox = mask.getbbox()
    if bbox is None:
        sys.exit("wordmark has no visible pixels")
    mask = mask.crop(bbox)
    mark = Image.new("RGBA", mask.size, (234, 234, 230, 0))
    mark.putalpha(mask)
    h = 13 * SCALE
    return mark.resize((round(mark.width * h / mark.height), h), Image.Resampling.LANCZOS)


def tracking(draw: ImageDraw.ImageDraw, xy, text, size, spacing, fill):
    x, y = xy
    face = font(size)
    for ch in text:
        draw.text((round(x * SCALE), round(y * SCALE)), ch, font=face, fill=fill)
        x += draw.textlength(ch, font=face) / SCALE + spacing


def fit_name(draw: ImageDraw.ImageDraw, name: str):
    max_w, size = 332, 30
    while draw.textlength(name, font=font(size)) / SCALE > max_w and size > 18:
        size -= 1
    if draw.textlength(name, font=font(size)) / SCALE <= max_w:
        return [name], size
    words = name.split()
    best = None
    for i in range(1, len(words)):
        lines = [" ".join(words[:i]), " ".join(words[i:])]
        widest = max(draw.textlength(l, font=font(19)) / SCALE for l in lines)
        if best is None or widest < best[0]:
            best = (widest, lines)
    if best is None:
        return [name], 15
    lines, size = best[1], 19
    while max(draw.textlength(l, font=font(size)) / SCALE for l in lines) > max_w and size > 12:
        size -= 1
    return lines, size


def make_master(base: Image.Image) -> Image.Image:
    """The blank pen with a matte charcoal sticker panel: the base's own texture, lifted and
    flattened, under rounded corners, no outline."""
    x, y, w, h = LABEL
    panel = base.crop((x, y, x + w, y + h))
    charcoal = Image.new("RGB", (w, h), (26, 24, 22))
    panel = Image.blend(panel, charcoal, 0.62)
    panel = ImageEnhance.Brightness(panel).enhance(1.10)
    panel = ImageEnhance.Contrast(panel).enhance(0.90)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=RADIUS, fill=255)
    out = base.copy()
    out.paste(panel, (x, y), mask)
    return out


def make_overlay(row: dict, wordmark: Image.Image):
    ov = Image.new("RGBA", (WIDTH * SCALE, HEIGHT * SCALE), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    x0 = 738
    ov.alpha_composite(wordmark, (x0 * SCALE, 367 * SCALE))
    tracking(d, (965, 369), "HIGH PURITY", 9, 1.3, (231, 178, 79, 245))
    d.line((x0 * SCALE, 393 * SCALE, 1070 * SCALE, 393 * SCALE), fill=(225, 170, 78, 245), width=SCALE)
    lines, size = fit_name(d, row["name"])
    ny = 400 if len(lines) == 1 else 398
    for i, line in enumerate(lines):
        d.text((x0 * SCALE, (ny + i * 23) * SCALE), line, font=font(size), fill=(238, 238, 234, 250))
    qy = 450 if len(lines) == 1 else 454
    d.text((x0 * SCALE, qy * SCALE), "QTY", font=font(14), fill=(173, 173, 170, 245))
    d.text((794 * SCALE, (qy - 1) * SCALE), numeric_qty(row.get("qty")), font=font(16), fill=(238, 238, 234, 250))
    d.line((x0 * SCALE, 486 * SCALE, 1070 * SCALE, 486 * SCALE), fill=(162, 110, 43, 235), width=SCALE)
    tracking(d, (740, 493), "RESEARCH USE ONLY", 9, 1.7, (159, 159, 156, 235))
    # the clicker reads 0, always
    fs = 43
    face = font(fs, italic=True)
    while d.textbbox((0, 0), "0", font=face)[2] / SCALE > 57:
        fs -= 1
        face = font(fs, italic=True)
    cx, cy = 1314 * SCALE, 444 * SCALE
    d.text((cx + SCALE, cy + 2 * SCALE), "0", font=face, anchor="mm", fill=(0, 0, 0, 180))
    d.text((cx, cy), "0", font=face, anchor="mm", fill=(242, 241, 236, 255))
    return ov


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(ROOT / "source"))
    ap.add_argument("--out", default=str(ROOT.parent.parent / "public" / "products"))
    ap.add_argument("--sheet", action="store_true", help="also write a contact sheet next to the script")
    ap.add_argument("--png", action="store_true", help="also keep the 1672×940 PNG masters in --out/png")
    a = ap.parse_args()
    src, out = Path(a.src), Path(a.out)
    base = Image.open(src / "base-pen-straight-blank.png").convert("RGBA")
    if base.size != (WIDTH, HEIGHT):
        sys.exit(f"unexpected base size {base.size}")
    master = make_master(base.convert("RGB")).convert("RGBA")
    wordmark = prepare_wordmark(src / "axiom-wordmark.png")
    rows = rows_from_db()
    if not rows:
        sys.exit("no rows")
    out.mkdir(parents=True, exist_ok=True)
    (out / "png").mkdir(exist_ok=True) if a.png else None
    tiles = []
    for row in rows:
        ov = make_overlay(row, wordmark).resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
        img = Image.alpha_composite(master, ov).convert("RGB")
        if a.png:
            img.save(out / "png" / f"{row['slug']}.png", compress_level=6)
        for w in WIDTHS:
            im = img.resize((w, round(HEIGHT * w / WIDTH)), Image.Resampling.LANCZOS)
            im.save(out / f"{row['slug']}-{w}.webp", "WEBP", quality=80 if w < 1280 else 76, method=6)
        tiles.append((row, img))
        print(f"{row['slug']}: QTY {numeric_qty(row.get('qty'))}", flush=True)
    if a.sheet:
        cols, tw, th = 4, 460, 300
        for start in range(0, len(tiles), 20):
            sub = tiles[start:start + 20]
            rows_n = -(-len(sub) // cols)
            sheet = Image.new("RGB", (cols * tw, rows_n * th), (242, 242, 242))
            d = ImageDraw.Draw(sheet)
            for i, (row, img) in enumerate(sub):
                t = img.copy(); t.thumbnail((440, 245), Image.Resampling.LANCZOS)
                x, y = (i % cols) * tw, (i // cols) * th
                sheet.paste(t, (x + (tw - t.width) // 2, y + 6))
                d.text((x + 10, y + 262), f"{start + i + 1:02d}  {row['name']}", font=ImageFont.truetype(str(FONTS / 'InstrumentSans-Regular.ttf'), 16), fill=(20, 20, 20))
            sheet.save(ROOT / f"sheet-{start + 1:02d}-{start + len(sub):02d}.jpg", quality=90)
    # the manifest is what the site reads: a directory listing is not available to a serverless build
    (out / "manifest.json").write_text(json.dumps({"widths": list(WIDTHS), "slugs": sorted(r["slug"] for r, _ in tiles)}, indent=0) + "\n")
    print(f"DONE {len(tiles)} pens → {out}")


if __name__ == "__main__":
    main()
