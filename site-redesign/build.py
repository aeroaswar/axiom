#!/usr/bin/env python3
"""Build the single-file artifact copies of the site.

Inlines assets/site.css, assets/*.js and assets/img/* (as data URIs) into each page, rewrites the
cross-links so the two published pages point at each other, and strips the document skeleton the
Artifact tool adds itself. Usage:

  python3 build.py OUT_DIR [--home URL] [--prices URL] [--pdf URL] [--lead light|dark] [--fonts test]
"""
import base64, mimetypes, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1]
opts = dict(zip(sys.argv[2::2], sys.argv[3::2]))
home_url = opts.get('--home', 'index.html'); prices_url = opts.get('--prices', 'price-list.html'); pdf_url = opts.get('--pdf', 'AXIOM-Price-List.pdf'); lead = opts.get('--lead', 'light'); fonts = opts.get('--fonts', '')
os.makedirs(out, exist_ok=True)

def read(p): return open(os.path.join(HERE, p), encoding='utf-8').read()
def data_uri(p):
    full = os.path.join(HERE, p)
    mime = mimetypes.guess_type(full)[0] or 'application/octet-stream'
    return f"data:{mime};base64,{base64.b64encode(open(full, 'rb').read()).decode()}"

FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Jost:wght@300;400&display=swap" rel="stylesheet">'
FONT_LINK_TEST = ('<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@300..700'
    '&family=Geist:wght@300..700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=Instrument+Sans:wght@400..700'
    '&family=Inter:wght@300..700&family=Jost:wght@300..700&family=Newsreader:opsz,wght@6..72,300..700'
    '&family=Schibsted+Grotesk:wght@400..700&display=swap" rel="stylesheet">')

for page, name in (('index.html', 'axiom-home.html'), ('price-list.html', 'axiom-prices.html')):
    s = read(page)
    if fonts == 'test':
        s = s.replace(FONT_LINK, FONT_LINK_TEST)
        s = s.replace('</body>', '<script>\n' + read('assets/fonttest.js') + '\n</script>\n</body>')
    if lead == 'dark':
        s = s.replace('<script src="assets/catalogue.js"></script>', '<script>window.AXIOM_LEAD="dark"</script>\n<script src="assets/catalogue.js"></script>')
    s = re.sub(r'<link rel="stylesheet" href="assets/site.css">', lambda m: '<style>\n' + read('assets/site.css') + '\n</style>', s)
    s = re.sub(r'<script src="assets/([\w.-]+\.js)"></script>', lambda m: '<script>\n' + read('assets/' + m.group(1)) + '\n</script>', s)
    s = re.sub(r'(src|href)="assets/img/([\w.-]+)"', lambda m: f'{m.group(1)}="{data_uri("assets/img/" + m.group(2))}"' if os.path.exists(os.path.join(HERE, 'assets/img', m.group(2))) else m.group(0), s)
    s = s.replace('href="price-list.html', f'href="{prices_url}').replace('href="index.html', f'href="{home_url}').replace('href="AXIOM-Price-List.pdf" download', f'href="{pdf_url}" target="_blank" rel="noopener"')
    head = re.search(r'<head>(.*?)</head>', s, re.S).group(1)
    body = re.search(r'<body>(.*)</body>', s, re.S).group(1)
    head = re.sub(r'<meta charset[^>]*>|<meta name="viewport"[^>]*>', '', head)
    open(os.path.join(out, name), 'w', encoding='utf-8').write(head.strip() + '\n' + body)
    print(name, os.path.getsize(os.path.join(out, name)))
