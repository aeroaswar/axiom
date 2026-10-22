from pathlib import Path
import re,base64,json,zipfile

root=Path(__file__).resolve().parent
ASSET=r'assets/[a-zA-Z0-9_.-]+\.(?:jpg|png|webp|woff2)'
MIME={'jpg':'image/jpeg','png':'image/png','webp':'image/webp','woff2':'font/woff2'}
def data_uri(path):
    return 'data:'+MIME[path.rsplit('.',1)[1]]+';base64,'+base64.b64encode((root/path).read_bytes()).decode()
def inline(code):
    return '<script>'+code.replace('</script','<\\/script')+'</script>'
# Page chunks come from the build's template list, never from whatever happens to sit in pages/.
keys=json.loads((root/'content.js').read_text().split('window.__PAGE_KEYS=',1)[1].split(';\n',1)[0])
chunks=[root/'pages'/(k+'.js') for k in keys if k!='home']

# Self-contained viewing copy: every page inline and every image or font embedded exactly once.
html=re.sub(r'<link rel="preload"[^>]*>','',(root/'index.html').read_text())
css_assets={}
for name in ['base.css','design.css','editorial-v2.css','stone-v3.css']:
    css=re.sub(r'assets/[a-zA-Z0-9_.-]+\.woff2',lambda m:data_uri(m[0]),(root/name).read_text())
    # Images repeated across rules share one custom property.
    css=re.sub(r'url\(([\'"]?)('+ASSET+r')\1\)',lambda m:'var('+css_assets.setdefault(m[2],'--asset-'+str(len(css_assets)))+')',css)
    html=re.sub(r'<link rel="stylesheet" href="'+re.escape(name)+r'(?:\?v=[a-z0-9]+)?">',lambda m:'<style>'+css+'</style>',html)
html=html.replace('</head>','<style>:root{'+';'.join(f'{v}:url({data_uri(p)})' for p,v in css_assets.items())+'}</style></head>',1)
# The dictionary is present before the early language check, so nothing is fetched.
html=html.replace('<script>try{',inline((root/'i18n-id.js').read_text())+'<script>try{',1)
pages=''.join(c.read_text() for c in chunks)
scripts={name:(root/name).read_text() for name in ['content.js','design.js','app.js']}
assets=sorted(set(re.findall(ASSET,scripts['content.js']+pages+scripts['design.js'])))
resolve='(function(){var A=window.__ASSET,re=/'+ASSET.replace('/','\\/')+'/g;function f(s){return s.replace(re,function(p){return A[p]||p;});}for(var k in __PAGES)__PAGES[k]=f(__PAGES[k]);for(var i in __IMG)__IMG[i]=f(__IMG[i]);window.__DATA=JSON.parse(f(JSON.stringify(__DATA)));})();'
scripts['content.js']=scripts['content.js']+pages+resolve
html=html.replace('<script src="content.js',inline('window.__ASSET='+json.dumps({p:data_uri(p) for p in assets},separators=(',',':'))+';')+'<script src="content.js',1)
for name,code in scripts.items():
    html=re.sub(r'<script src="'+re.escape(name)+r'(?:\?v=[a-z0-9]+)?"></script>',lambda m:inline(code),html)
(root/'AXIOM-storefront.html').write_text(html)

# Deployable static package: the served files, page chunks and every asset they reference.
files=['index.html','base.css','design.css','editorial-v2.css','stone-v3.css','content.js','app.js','design.js','i18n-id.js','README.md']+['pages/'+c.name for c in chunks]
with zipfile.ZipFile(root/'AXIOM-storefront.zip','w',zipfile.ZIP_DEFLATED) as z:
    for file in files: z.write(root/file,'axiom-storefront/'+file)
    for asset in sorted({a for f in files for a in re.findall(ASSET,(root/f).read_text())}):
        z.write(root/asset,'axiom-storefront/'+asset)
print(f'Packaged deployable ZIP and self-contained HTML ({len(html)/1e6:.1f} MB).')
