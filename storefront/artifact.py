"""Stage the built storefront as a multi-file Claude Artifact in artifact/ (run build.py first).

The Artifact host wraps the page in its own document skeleton and serves each file at its plain path, so the page
is written without <html>/<head>/<body> and every ?v= cache query is dropped. One publish takes at most 255 files:
artifact/publish.json splits them into the page batch and the asset batch, published in that order to the same URL.
"""
from pathlib import Path
import json, re, shutil

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'artifact'
SITE = OUT / 'site'
ASSET = r'assets/[a-zA-Z0-9_.-]+\.(?:jpg|png|webp|woff2)'
TITLE = '<title>AXIOM Storefront</title>'
CORE = ['base.css', 'design.css', 'editorial-v2.css', 'stone-v3.css', 'content.js', 'app.js', 'design.js', 'i18n-id.js']
# Generated scripts that build their own versioned URLs at runtime.
UNVERSION = {'app.js': ("pages/' + key + '.js?v=' + window.__PAGES_VERSION", "pages/' + key + '.js'"),
             'design.js': ("'i18n-id.js?v=' + window.__I18N_VERSION", "'i18n-id.js'")}

shutil.rmtree(OUT, ignore_errors=True)
(SITE / 'pages').mkdir(parents=True)
(SITE / 'assets').mkdir()

html = (ROOT / 'index.html').read_text()
head = html.split('<head>', 1)[1].split('</head>', 1)[0]
body = html.split('<body>', 1)[1].rsplit('</body>', 1)[0]
head = re.sub(r'<meta charset="utf-8">|<meta name="viewport"[^>]*>|<title>.*?</title>', '', head, flags=re.S)
page = re.sub(r'\?v=[a-z0-9]+', '', TITLE + head + body)
if '?v=' in page or page.count('<title>') != 1: raise SystemExit('index.html changed shape; update artifact.py.')
(SITE / 'index.html').write_text(page)

for name in CORE:
    text = (ROOT / name).read_text()
    if name in UNVERSION:
        old, new = UNVERSION[name]
        if text.count(old) != 1: raise SystemExit(f'{name} no longer builds its URL as expected; update artifact.py.')
        text = text.replace(old, new)
    (SITE / name).write_text(text)

keys = json.loads((ROOT / 'content.js').read_text().split('window.__PAGE_KEYS=', 1)[1].split(';\n', 1)[0])
chunks = ['pages/' + key + '.js' for key in keys if key != 'home']
for chunk in chunks: shutil.copy(ROOT / chunk, SITE / chunk)
texts = [(SITE / name).read_text() for name in ['index.html', *CORE, *chunks]]
assets = sorted({path for text in texts for path in re.findall(ASSET, text)})
for path in assets: shutil.copy(ROOT / path, SITE / path)

batches = {'pages': CORE + chunks, 'assets': assets}
for name, files in batches.items():
    if len(files) > 255: raise SystemExit(f'The {name} batch has {len(files)} files; one publish takes at most 255.')
(OUT / 'publish.json').write_text(json.dumps({'page': 'index.html', 'root': str(SITE), **batches}, indent=1) + '\n')
size = lambda files: sum((SITE / f).stat().st_size for f in files) / 1e6
print(f'Staged artifact/site: page, {len(batches["pages"])} page files ({size(batches["pages"]):.1f} MB) '
      f'and {len(assets)} assets ({size(assets):.1f} MB). Batches in artifact/publish.json.')
