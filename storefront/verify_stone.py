"""Verify every product has its own stone photograph in the generated storefront."""
import json
import re
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent
products = json.loads((root / 'data.json').read_text())['products']
code = (root / 'content.js').read_text()
pages = json.loads(code.split('window.__PAGES=', 1)[1].split(';\nwindow.', 1)[0])
keys = json.loads(code.split('window.__PAGE_KEYS=', 1)[1].split(';\nwindow.', 1)[0])
images = json.loads(code.split('window.__IMG=', 1)[1].rstrip(';\n'))
errors = []
# Every other template is a lazily loaded pages/<key>.js chunk.
for key in keys:
    chunk = root / 'pages' / (key + '.js')
    if key in pages or not chunk.is_file():
        continue
    match = re.fullmatch(r'window\.__PAGES\[("(?:[^"\\]|\\.)*")\]=(.*);\n', chunk.read_text(), re.S)
    if not match or json.loads(match[1]) != key:
        errors.append(f'{chunk.name}: unreadable page chunk')
        continue
    pages[key] = json.loads(match[2])
stray = sorted(p.name for p in (root / 'pages').iterdir() if p.name[:-3] not in keys)
if stray:
    errors.append('Unexpected files in pages/: ' + ', '.join(stray))
missing_pages = sorted(set(keys) - set(pages))
if missing_pages:
    errors.append('Templates without a page chunk: ' + ', '.join(missing_pages))
cards = re.findall(r'<article\b.*?</article>', pages['products'], re.S)
for product in products:
    slug = product['slug']
    expected = f'assets/stone-{slug}.webp'
    path = root / expected
    if not path.is_file():
        errors.append(f'{slug}: missing photograph')
        continue
    with Image.open(path) as photo:
        if photo.width != photo.height or photo.width < 1000:
            errors.append(f'{slug}: expected a high-resolution square photograph')
    card = next((c for c in cards if f'data-compound="{slug}"' in c), '')
    if 'stone-photo' not in card:
        errors.append(f'{slug}: catalogue card does not use stone styling')
    detail = pages.get('product-' + slug, '')
    if product['kind'] == 'peptide':
        for width in [400, 800]:
            if images.get(f'{slug}-{width}') != expected:
                errors.append(f'{slug}: {width}px image points to the old photograph')
        if 'stone-photo' not in detail:
            errors.append(f'{slug}: detail page does not use stone styling')
    else:
        if expected not in card or expected not in detail:
            errors.append(f'{slug}: photo not connected to catalogue and detail page')
if len(cards) != len(products):
    errors.append(f'Catalogue has {len(cards)} cards for {len(products)} products')
for route, markup in pages.items():
    for tag in re.findall(r'<img\b[^>]*data-pen="[^"]+"[^>]*>', markup):
        if 'stone-photo' not in tag:
            errors.append(f'{route}: a pen photograph is missing stone styling')
quality = json.loads((root / 'stone-quality.json').read_text())
if quality['rejected']:
    errors.append('Images still need correction: ' + ', '.join(quality['rejected']))
if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: all {len(products)} products have stone photographs in catalogue and detail pages.')
