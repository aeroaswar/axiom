from pathlib import Path
import re,base64,mimetypes,zipfile

root=Path(__file__).resolve().parent
html=(root/'index.html').read_text()
for name in ['base.css','design.css','editorial-v2.css','stone-v3.css']:
    css=(root/name).read_text()
    css=re.sub(r'assets/[a-zA-Z0-9_.-]+\.(?:jpg|png|webp)',lambda m:'data:'+mimetypes.guess_type(root/m[0])[0]+';base64,'+base64.b64encode((root/m[0]).read_bytes()).decode(),css)
    html=re.sub(r'<link rel="stylesheet" href="'+re.escape(name)+r'(?:\?v=[a-z0-9]+)?">',lambda m:'<style>'+css+'</style>',html)
for name in ['content.js','design.js','app.js']:
    code=(root/name).read_text()
    if name in ['content.js','design.js']:
        def embed(m):
            path=root/m[0]
            mime=mimetypes.guess_type(path)[0]
            return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()
        code=re.sub(r'assets/[a-zA-Z0-9_.-]+\.(?:jpg|png|webp)',embed,code)
    html=re.sub(r'<script src="'+re.escape(name)+r'(?:\?v=[a-z0-9]+)?"></script>',lambda m:'<script>'+code.replace('</script','<\\/script')+'</script>',html)
(root/'AXIOM-storefront.html').write_text(html)
files=['index.html','base.css','design.css','editorial-v2.css','stone-v3.css','content.js','app.js','design.js','README.md']
with zipfile.ZipFile(root/'AXIOM-storefront.zip','w',zipfile.ZIP_DEFLATED) as z:
    for file in files: z.write(root/file,'axiom-storefront/'+file)
    asset_refs=set()
    for name in files:
        asset_refs.update(re.findall(r'assets/[a-zA-Z0-9_.-]+\.(?:jpg|png|webp)',(root/name).read_text()))
    for asset in sorted(asset_refs):
        z.write(root/asset,'axiom-storefront/'+asset)
print('Packaged deployable ZIP and self-contained HTML.')
