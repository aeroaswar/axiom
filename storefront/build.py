"""Build a portable restyle of the user-supplied AXIOM storefront demo."""
from pathlib import Path
import json, re, base64, hashlib

ROOT = Path(__file__).resolve().parent
source = (ROOT / 'reference.html').read_text()
pages = json.loads((ROOT / 'pages.json').read_text())
data = json.loads((ROOT / 'data.json').read_text())
images = json.loads((ROOT / 'img.json').read_text())
stone_quality = json.loads((ROOT / 'stone-quality.json').read_text())
missing_stone = [p['slug'] for p in data['products']
                 if not (ROOT / 'assets' / ('stone-' + p['slug'] + '.webp')).is_file()]
if missing_stone or stone_quality['rejected']:
    raise SystemExit('Complete the stone photo collection before building. Missing: '
                     + ', '.join(missing_stone) + '; needs review: '
                     + ', '.join(stone_quality['rejected']))

# Extract the demo's original code, excluding Claude's hosting runtime.
scripts = list(re.finditer(r'<script\b([^>]*)>(.*?)</script>', source, re.S))
app = scripts[-1][2]
app = app.replace('axiom-demo-', 'axiom-design-')
app = app.replace('    hydrate(key, r);', '    hydrate(key, r);\n    window.dispatchEvent(new CustomEvent("axiom:route", {detail:{key:key,path:r.path}}));')
# The certificate search rewrites its own counter; strip the translated form too so it never accumulates.
app = app.replace("replace(/ · Showing.*$/, '')", "replace(/ · (Showing|Menampilkan).*$/, '')")
if 'Showing|Menampilkan' not in app: raise SystemExit('Certificate counter not found in reference app; update the Bahasa Indonesia patch.')
(ROOT / 'app.js').write_text(app)
styles = re.findall(r'<style>(.*?)</style>', source, re.S)
(ROOT / 'base.css').write_text('\n'.join(styles))

hero = '''<section class="axiom-hero" aria-labelledby="hero-title">
  <div class="wrap axiom-hero-grid">
    <div class="axiom-hero-copy">
      <p class="eyebrow"><span></span> THE AXIOM STANDARD</p>
      <h1 id="hero-title">Built for <br><em>better</em><br> research.</h1>
      <p class="lead">Every lot is backed by chromatography and mass spectrometry, ships with its lot’s certificate, and travels cold chain to the door.</p>
      <div class="hero-cta"><a class="btn btn-solid" href="#/products">Explore the catalogue <svg class="ic-sv" aria-hidden="true"><use href="#i-arrow"></use></svg></a><a class="tlink" href="#/coas">View certificates <span aria-hidden="true">↗</span></a></div>
    </div>
    <figure class="axiom-hero-art"><img src="assets/hero-pens.jpg" alt="AXIOM MOTS-c, Retatrutide and KLOW research pen collection" width="1500" height="1000" fetchpriority="high"><figcaption><span>PRECISION, IN EVERY DETAIL.</span><span>AXIOM / RESEARCH COLLECTION</span></figcaption></figure>
  </div>
  <div class="wrap hero-bottom"><a href="#catalog" class="discover">Discover the collection <span aria-hidden="true">↓</span></a><div><span>≥ 98% verified purity</span><span>HPLC / MS documented</span><span>Cold chain delivery</span></div></div>
</section>'''
home = pages['home']
start = home.index('<div class="hero-fallback"')
end = home.index('<section class="wrap"', start)
home = home[:start] + hero + home[end:]
home = home.replace('<div class="chead"><h2>', '<div class="chead"><span class="eyebrow">01 / THE COLLECTION</span><h2>', 1)
home = home.replace('id="standard"><div class="wrap"><div class="shead duo"><span class="no">02', 'id="standard"><div class="wrap"><div class="shead duo"><span class="no">03')
home = home.replace('id="next"><div class="wrap"><div class="shead"><span class="no">03', 'id="next"><div class="wrap"><div class="shead"><span class="no">04')
pages['home'] = home

# Original art-directed homepage, retaining the source catalogue's price/option controls.
arrow = '<svg class="ic-sv" aria-hidden="true"><use href="#i-arrow"></use></svg>'
catalogue_cards = {re.search(r'data-compound="([^"]+)"', card)[1]: card for card in re.findall(r'<article\b.*?</article>', pages['products'], re.S)}
featured = ['retatrutide', 'tirzepatide', 'mots-c', 'cjc-1295-no-dac-plus-ipamorelin']
research = [p for p in data['products'] if p['kind'] == 'peptide']
research.sort(key=lambda p: featured.index(p['slug']) if p['slug'] in featured else 100)
home_cards = []
for i, product in enumerate(research):
    card = catalogue_cards[product['slug']]
    attributes = f'data-home-card data-pathway="{product["pathway"]}"'
    if i >= 4: attributes += ' hidden'
    card = card.replace('<article ', '<article '+attributes+' ', 1)
    card = card.replace('decoding="async"', 'decoding="async" loading="lazy"')
    card = card.replace('Add to basket</button>', 'Select options '+arrow+'</button>')
    home_cards.append(card)
pages['home'] = (ROOT/'home-v2.html').read_text().replace('{{products}}',''.join(home_cards)).replace('{{arrow}}',arrow)

# Replace merchandise and device placeholders with their matching stone photographs.
merch = {'performance-tee':'Performance Tee', 'training-hoodie':'Training Hoodie', 'logo-cap':'Logo Cap', 'gym-duffel':'Gym Duffel', 'steel-water-bottle':'Steel Water Bottle'}
merch.update({p['slug']:p['name'] for p in data['products'] if p['kind']=='device' and (ROOT/'assets'/('stone-'+p['slug']+'.webp')).exists()})
for key, markup in pages.items():
    for slug, name in merch.items():
        photo = f'<img class="merch-photo stone-photo" src="assets/stone-{slug}.webp" alt="AXIOM {name}" loading="lazy" width="1024" height="1024">'
        pattern = r'(<a[^>]+href="#/products/'+slug+r'"[^>]*>)<span class="vial-tile card".*?</span>'
        markup = re.sub(pattern, lambda m: m[1]+photo, markup, flags=re.S)
        markup = re.sub(r'(<a href="#/products/'+slug+r'">)<svg.*?</svg>', lambda m: m[1]+photo, markup, flags=re.S)
        if key == 'product-'+slug:
            markup = re.sub(r'<span class="vial-tile [^"]*".*?</span>', photo, markup, flags=re.S)
            markup = markup.replace('class="prod-fig" aria-hidden="true"', 'class="prod-fig"')
    # React server-action fields are inert leftovers in this standalone client demo.
    markup = re.sub(r'<input[^>]*name="\$ACTION[^>]*>', '', markup)
    markup = re.sub(r'action="javascript:[^"]*"', 'action=""', markup)
    pages[key] = markup

for key, url in images.items():
    if url.startswith('data:image/'):
        header, payload = url.split(',', 1)
        ext = header.split('/')[1].split(';')[0]
        path = f'assets/{key}.{ext}'
        (ROOT / path).write_bytes(base64.b64decode(payload))
        images[key] = path

def js(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
# Stone photographs replace their matching source assets throughout all routes.
stone_slugs = [p['slug'] for p in research if p['slug'] not in stone_quality['rejected'] and (ROOT/'assets'/('stone-'+p['slug']+'.webp')).exists()]
stone_doses = {p['slug']:p['variants'][0]['dose'] for p in research}
for slug in stone_slugs:
    for width in [400,800]: images[f'{slug}-{width}'] = f'assets/stone-{slug}.webp'
for key, markup in pages.items():
    for slug in stone_slugs:
        markup = re.sub(r'<img[^>]+data-pen="'+re.escape(slug)+r'"[^>]*>', lambda m:m[0].replace('class="pen ', 'class="pen stone-photo ').replace('width="1672" height="940"','width="1254" height="1254"'),markup)
    if key == 'products':
        cards = re.findall(r'<article\b.*?</article>',markup,re.S)
        ordered = sorted(cards,key=lambda c: next((i for i,slug in enumerate(featured) if 'data-compound="'+slug+'"' in c),100))
        if cards: markup=markup[:markup.index(cards[0])]+''.join(ordered)+markup[markup.index(cards[-1])+len(cards[-1]):]
    if key.startswith('product-') and key[8:] in stone_slugs:
        markup=markup.replace('<span class="lab">Vial + pen</span>','<span class="lab">AXIOM / Stone collection · '+stone_doses[key[8:]]+' presentation shown</span>')
        markup=markup.replace('class="prod-fig" aria-hidden="true"','class="prod-fig"')
    pages[key]=markup
i18n_id = json.loads((ROOT / 'i18n-id.json').read_text())
(ROOT / 'content.js').write_text('window.__PAGES='+js(pages)+';\nwindow.__DATA='+js(data)+';\nwindow.__I18N_ID='+js({k:i18n_id[k] for k in ['text','html','patterns']})+';\nwindow.__IMG='+js(images)+';\n')

body = source[source.index('<svg width="0"'):source.index('<script src=')]
nav = '<div class="nav-links" id="site-links"><a href="#/products">Shop</a><a href="#/standard">The standard</a><a href="#/compounds">Compound guide</a><a href="#/merch">Merch</a><a class="nav-account-m" href="#/account">Account</a></div>'
body = re.sub(r'<div class="nav-links" id="site-links">.*?</div>',nav,body,count=1,flags=re.S)
lang = '<div class="nav-lang" role="group" aria-label="Language"><button type="button" data-lang="en" lang="en" aria-pressed="true">EN</button><button type="button" data-lang="id" lang="id" aria-pressed="false">ID</button></div>'
body = body.replace('<div class="nav-right">', '<div class="nav-right">'+lang, 1)
body = body.replace('<a class="btn btn-sm nav-account" href="#/account">Account</a>','<a class="btn btn-sm nav-account" href="#/account" aria-label="Account" title="Account"><svg class="ic-sv" aria-hidden="true"><use href="#i-user"></use></svg></a>')
# Keep one small wordmark in the footer; no oversized duplicate.
html = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="AXIOM — research compounds, performance wear and everyday carry. Explore the catalogue and the standard behind every lot.">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0b0b0a">
<title>AXIOM — Built for better research.</title><link rel="icon" href="data:,">
<link rel="stylesheet" href="base.css"><link rel="stylesheet" href="design.css"><link rel="stylesheet" href="editorial-v2.css"><link rel="stylesheet" href="stone-v3.css">
</head><body>'''+body+'''<script src="content.js"></script><script src="design.js"></script><script src="app.js"></script></body></html>'''
for asset in ['base.css','design.css','editorial-v2.css','stone-v3.css','content.js','design.js','app.js']:
    version=hashlib.sha256((ROOT/asset).read_bytes()).hexdigest()[:10]
    html=html.replace('"'+asset+'"','"'+asset+'?v='+version+'"')
(ROOT / 'index.html').write_text(html)
print(f'Built {len(pages)} page templates, {len(data["products"])} products, {len(images)} catalogue images.')
