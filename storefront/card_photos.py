"""Make the 640px card photos (assets/stone-<slug>-640.webp) from the PNG masters. Run after adding or changing a
product photograph; the outputs are committed. Catalogue and homepage cards offer them through srcset (build.py),
so phones and laptops load about a fifth of the bytes while product pages keep the full-size photograph."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent
WIDTH = 640
made = kept = 0
for product in json.loads((ROOT / 'data.json').read_text())['products']:
    slug = product['slug']
    master = ROOT / 'assets' / f'stone-{slug}.png'
    if not master.is_file() or master.read_bytes()[:4] != b'\x89PNG':
        master = ROOT / 'assets' / f'stone-{slug}.webp'  # no PNG master (or only its Git LFS pointer)
    out = ROOT / 'assets' / f'stone-{slug}-{WIDTH}.webp'
    if out.is_file() and out.stat().st_mtime >= master.stat().st_mtime:
        kept += 1
        continue
    with Image.open(master) as photo:
        photo = photo.convert('RGB')
        photo.resize((WIDTH, round(photo.height * WIDTH / photo.width)), Image.LANCZOS).save(out, 'WEBP', quality=82, method=6)
    made += 1
print(f'Card photos: {made} made, {kept} already current.')
