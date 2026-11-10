"""Turn the supplied storefront into a showcase: what AXIOM carries and the compound guide, ordered on WhatsApp.

The reference demo is a shop (basket, plans, quotes, accounts, certificates, a price list and rupiah prices). AXIOM
now shows its catalogue without prices and takes orders in a WhatsApp chat, so build.py runs every page template
and the extracted app through this module. Each edit names the text it expects and stops the build when that text
is missing, so a change to the reference cannot quietly leave a basket button or a price behind.
"""
import re
from urllib.parse import quote

# Routes the showcase no longer has. Any template still linking to one fails the build (see check_links).
REMOVED_ROUTES = ['coas', 'how-to-read-a-coa', 'price-list', 'request', 'sign-in', 'account', 'console',
                  'process', 'terms', 'privacy', 'legal', 'merch']
REMOVED_PAGES = {'coas', 'howto', 'pricelist', 'request', 'signin', 'process', 'terms', 'privacy', 'legal',
                 # captured generic templates no route reaches
                 'product-peptide', 'compound-page', 'compounds-metabolic'}

ARROW = '<svg class="ic-sv ar" aria-hidden="true"><use href="#i-arrow"></use></svg>'
WA_ICON = '<svg class="ic-sv" aria-hidden="true"><use href="#i-wa"></use></svg>'


def must(text, old, new, count=None, where=''):
    """Replace old with new, insisting old is there (exactly count times when given)."""
    n = text.count(old)
    if n == 0 or (count is not None and n != count):
        raise SystemExit(f'Showcase edit not found{" in " + where if where else ""} ({n}x): {old[:90]}')
    return text.replace(old, new)


def must_sub(pattern, repl, text, where='', flags=re.S):
    out, n = re.subn(pattern, repl, text, flags=flags)
    if not n: raise SystemExit(f'Showcase pattern not found{" in " + where if where else ""}: {pattern[:90]}')
    return out


# ---------- ordering ----------
def order_subject(product, variant):
    """The words a WhatsApp order names: a peptide by its dose, a device by its option in brackets."""
    if not variant or not variant.get('dose'): return product['name']
    return product['name'] + (' ' + variant['dose'] if product['kind'] == 'peptide' else ' (' + variant['dose'] + ')')


def order_link(whatsapp, product, variant):
    return f'https://wa.me/{whatsapp}?text=' + quote('Hello AXIOM, I would like to order ' + order_subject(product, variant) + '.')


def order_box(whatsapp, product):
    """The product page's order box before app.js takes over: the same markup its draw() produces."""
    variants, first = product['variants'], product['variants'][0]
    label = 'Vial size' if product['kind'] == 'peptide' else 'Option'
    sizes = ''.join(f'<button type="button" role="radio" data-sku="{v["sku"]}" aria-checked="{"true" if v is first else "false"}" '
                    f'class="size{" on" if v is first else ""}"><span class="d">{v["dose"]}</span></button>' for v in variants)
    return (f'<form class="buy-form" aria-label="Order"><span class="lab" id="size-label">{label}</span>'
            f'<div class="sizes" role="radiogroup" aria-labelledby="size-label">{sizes}</div>'
            + (f'<p class="order-note">{first["content"]}{" · Cold chain" if first.get("cold") else ""}</p>' if product['kind'] == 'peptide' else '<p class="order-note"></p>') +
            f'<div class="buy-foot"><a class="btn btn-solid" data-order target="_blank" rel="noopener" href="{order_link(whatsapp, product, first)}">{WA_ICON} Order on WhatsApp</a></div>'
            f'<p class="note order-help">The message names what you chose. AXIOM confirms the details in the chat.</p></form>')


# ---------- the app ----------
APP_DRAW = r'''    function draw() {
      var v = p.variants.find(function (x) { return x.sku === st.sku; }) || firstOpen;
      var h = '<span class="lab" id="size-label">' + (p.kind === 'peptide' ? 'Vial size' : 'Option') + '</span><div class="sizes" role="radiogroup" aria-labelledby="size-label">' +
        p.variants.map(function (x) { return '<button type="button" role="radio" data-sku="' + x.sku + '" aria-checked="' + (x.sku === v.sku) + '" class="size' + (x.sku === v.sku ? ' on' : '') + '"><span class="d">' + esc(x.dose) + '</span></button>'; }).join('') + '</div>';
      h += '<p class="order-note">' + (p.kind === 'peptide' ? esc(v.content || '') + (v.cold ? ' · Cold chain' : '') : '') + '</p>';
      h += '<div class="buy-foot"><a class="btn btn-solid" data-order target="_blank" rel="noopener" href="' + orderLink(p, v) + '">' + icon('wa') + ' Order on WhatsApp</a></div>';
      h += '<p class="note order-help">The message names what you chose. AXIOM confirms the details in the chat.</p>';
      form.innerHTML = h;
    }
'''

ORDER_HELPERS = r'''  // Orders happen in a WhatsApp chat; the message names the product and the chosen size (showcase.py mirrors this).
  var orderSubject = function (p, v) { return !v || !v.dose ? p.name : p.name + (p.kind === 'peptide' ? ' ' + v.dose : ' (' + v.dose + ')'); };
  var orderLink = function (p, v) { return 'https://wa.me/' + DATA.whatsapp + '?text=' + encodeURIComponent('Hello AXIOM, I would like to order ' + orderSubject(p, v) + '.'); };
'''


def patch_app(app):
    app = must(app, "  var icon = function (n)", ORDER_HELPERS + "  var icon = function (n)", 1, 'app')
    # Product page: sizes and the WhatsApp order button in place of price, plans, quantity and Add to basket.
    start = app.index("    function draw() {\n      var v = p.variants.find(function (x) { return x.sku === st.sku; }) || firstOpen;")
    end = app.index("    function key() {", start)
    app = app[:start] + APP_DRAW + app[end:]
    # The certificate mark on cards and the price list link beside the shop count.
    app = must(app, "if (p && p.coa && p.coa.length && !c.querySelector('.coa-mark'))", "if (false)", 1, 'app card mark')
    app = must(app, " + '<a class=\"tlink pl\" href=\"#/price-list\">Printable price list ' + icon('arrow').replace('ic-sv', 'ic-sv ar') + '</a>'", "", 1, 'app shop count')
    app = must(app, "'Search by name, abbreviation or lot code'", "'Search by name or abbreviation'", 1, 'app search')
    # The demo's language link and the pages that are gone.
    app = must_sub(r"  document\.addEventListener\('click', function \(e\) \{\n    var a = e\.target\.closest\('a\[href=\"#lang\"\]'\);.*?\n  \}\);\n", '', app, 'app lang toast')
    app = must_sub(r"var STATIC = \{[^}]*\};", "var STATIC = { '/': 'home', '/products': 'products', '/compounds': 'compounds', "
                   "'/contact': 'contact', '/standard': 'standard', '/faq': 'faq' };", app, 'app routes')
    app = must(app, "    else if ((m = r.path.match(/^\\/coas\\/([a-z0-9-]+)$/))) key = 'coa-' + m[1];\n", '', 1, 'app coa route')
    app = must(app, "    else if (r.path === '/request/sent') key = 'sent';\n", '', 1, 'app sent route')
    app = must(app, "    if (key === 'sent') main.innerHTML = sentPage();\n    else if", "    if", 1, 'app sent render')
    for call in ["    if (key === 'coas') coasPage(r.q);\n", "    if (key.indexOf('coa-') === 0) coaPage();\n",
                 "    if (key === 'request') requestPage();\n", "    if (key === 'signin') signInPage();\n", "    if (key === 'merch') {}\n"]:
        app = must(app, call, '', 1, 'app hydrate')
    app = must_sub(r"    if \(key === 'sent'\) \{.*?\n", '', app, 'app hydrate sent')
    app = must_sub(r"    if \(key === 'pricelist'\) \{.*?\n", '', app, 'app hydrate price list')
    i, j = app.index('  // ---------- certificates ----------'), app.index('  // ---------- go ----------')
    return app[:i] + app[j:]


def client_data(data):
    """The catalogue as the browser sees it: no prices, plans, stock, delivery fees or cut-off times."""
    out = {k: v for k, v in data.items() if k not in ('ppn', 'delivery', 'sla', 'cutoff')}
    out['tiers'] = []
    out['products'] = [{**{k: v for k, v in p.items() if k != 'coa'}, 'cls': p['cls'] and p['cls'].replace('composition per lot CoA', 'composition tested per lot'),
                        'variants': [{k: v for k, v in x.items() if k not in ('price_idr', 'available')} for x in p['variants']]}
                       for p in data['products']]
    return out


# ---------- the templates ----------
def card(markup, by_slug):
    """A catalogue card without price, plan tag or basket: it states its sizes, and its button opens the product page."""
    slug = re.search(r'data-compound="([^"]+)"', markup)[1]
    variants = by_slug[slug]['variants']
    sizes = f'<span class="pr"><span class="mono-n">{variants[0]["dose"] if len(variants) == 1 else str(len(variants)) + " sizes"}</span></span>'
    markup = markup.replace('<span class="tag">Subscribe &amp; Save</span>', '')
    markup = re.sub(r'<span class="pr"><small>[^<]*</small><span class="mono-n">[^<]*</span></span>', lambda m: sizes, markup)
    markup = re.sub(r'<span class="coa-mark">.*?</span>(?=</div>|<span)', '', markup, flags=re.S)
    markup = re.sub(r'<div class="add"><form\b.*?</form></div>', f'<div class="add"><a class="btn btn-sm" href="#/products/{slug}">View details</a></div>', markup, flags=re.S)
    return markup.replace(' data-priced="1"', '')


def compound_rows(markup, whatsapp, product, where):
    """Compound guide dose rows: no stock column; each lot orders on WhatsApp."""
    markup = must(markup, '<th scope="col">Availability</th>', '', 1, where)
    markup = must(markup, '<span class="sr-only">Add to basket</span>', '<span class="sr-only">Order</span>', 1, where)
    by_dose = {v['dose']: v for v in product['variants']}
    def row(m):
        dose = m[1].replace('<!-- -->', '')
        v = by_dose.get(dose)
        if not v: raise SystemExit(f'{where}: no {dose} lot in data.json')
        return (f'<tr><td class="dose">{m[1]}</td><td>{m[2]}</td><td class="n"><a class="tlink" target="_blank" rel="noopener" '
                f'href="{order_link(whatsapp, product, v)}">Order {ARROW}</a></td></tr>')
    markup = must_sub(r'<tr><td class="dose">(.*?)</td><td>(.*?)</td><td><span class="avail[^"]*">.*?</td><td class="n"><form\b.*?</form></td></tr>', row, markup, where)
    return markup.replace('<p class="note" style="margin-top:16px">None available. Request it and be told when it is back.</p>', '')


SENTENCES = [
    (', HPLC/MS verified, with a Certificate of Analysis per lot.', ', HPLC/MS verified per lot.'),
    ('composition per lot CoA', 'composition tested per lot'),
    (' They are priced openly and can be requested without an acknowledgement.', ''),
]


def strip_commerce(pages, data):
    whatsapp, by_slug = data['whatsapp'], {p['slug']: p for p in data['products']}
    for key in list(pages):
        if key in REMOVED_PAGES or key.startswith('coa-'): del pages[key]
    for key, markup in pages.items():
        markup = re.sub(r'<article\b[^>]*class="pcard[^"]*".*?</article>', lambda m: card(m[0], by_slug), markup, flags=re.S)
        for old, new in SENTENCES: markup = markup.replace(old, new)
        # Structured data that offers a price (the device pages) goes; the showcase quotes no prices.
        markup = re.sub(r'<script type="application/ld\+json">(?:(?!</script>).)*"price".*?</script>', '', markup, flags=re.S)
        if key.startswith('product-') and key[8:] in by_slug:
            product = by_slug[key[8:]]
            markup = must_sub(r'<form class="buy-form"[^>]*>.*?</form>', lambda m: order_box(whatsapp, product), markup, key)
            markup = re.sub(r'<div class="prod-sec" id="coa">.*?(?=<div class="prod-sec")', '', markup, flags=re.S)
            markup = re.sub(r'<a href="#coa">.*?</a>', '', markup, flags=re.S)
        if key.startswith('compound-') and key[9:] in by_slug:
            product = by_slug[key[9:]]
            markup = compound_rows(markup, whatsapp, product, key)
            markup = must(markup, '<h2>Request</h2></div><div class="cp-body"><p>Add a lot to the basket and request a quote. The quote is priced from the same list as this page, and sending it remains AXIOM&#x27;s act.</p>',
                          '<h2>Order</h2></div><div class="cp-body"><p>Choose a lot on the product page, or message AXIOM on WhatsApp. Every order is confirmed in the chat.</p>', 1, key)
            markup = must_sub(r'<a class="tlink" href="#/request">Open the basket.*?</a>', f'<a class="tlink" target="_blank" rel="noopener" href="{order_link(whatsapp, product, None)}">Ask on WhatsApp {ARROW}</a>', markup, key)
            markup = must(markup, 'Every lot travels with its Certificate of Analysis, stating identity, purity and lot code.',
                          'Every lot is analysed by HPLC / MS for identity and purity before it is listed.', 1, key)
            markup = must_sub(r'<a class="tlink" href="#/standard">See a sample Certificate of Analysis', '<a class="tlink" href="#/standard">Read the standard', markup, key)
        pages[key] = markup
    pages['products'] = edit_products(pages['products'])
    pages['compounds'] = must_sub(r'<div class="sp-24"></div><a class="tlink" href="#/price-list">Price list.*?</a>', '', pages['compounds'], 'compounds')
    pages['standard'] = edit_standard(pages['standard'])
    pages['contact'] = edit_contact(pages['contact'], whatsapp)
    pages['faq'] = edit_faq(pages['faq'])
    return pages


def edit_products(s):
    s = must(s, 'Research compounds and therapy devices. One price per lot in rupiah.', 'Research compounds and therapy devices. Choose a size and order on WhatsApp.', 1, 'products')
    s = must(s, '<option value="price">Price, low to high</option><option value="price_desc">Price, high to low</option>', '', 1, 'products')
    return must_sub(r'<a class="tlink pl" href="#/price-list">Printable price list.*?</a>', '', s, 'products')


def edit_standard(s):
    s = must(s, 'Nothing carries the AXIOM mark until it is verified, documented and sourced right. These are the documents, and the sample certificate is below.',
             'Nothing carries the AXIOM mark until it is verified, documented and sourced right.', 1, 'standard')
    s = must(s, '<h3>A Certificate of Analysis per lot</h3><p>The certificate states the compound, the lot code, the method, the purity figure and the date. It travels with the lot and is filed against the order.</p>',
             '<h3>Coded by lot</h3><p>Every unit carries its lot code, so the compound, the method, the purity figure and the date of analysis trace back to one lot.</p>', 1, 'standard')
    s = must_sub(r'<div class="stmt"><span class="idx mono-n">04</span><div><h3>One catalogue</h3>.*?</div></div>', '', s, 'standard')
    for old, new in [('<span class="idx mono-n">05</span><div><h3>Clinical-grade', '<span class="idx mono-n">04</span><div><h3>Clinical-grade'),
                     ('<span class="idx mono-n">06</span><div><h3>A direct line', '<span class="idx mono-n">05</span><div><h3>A direct line')]:
        s = must(s, old, new, 1, 'standard')
    s = must_sub(r'<section class="band" id="coa">.*?</section>', '', s, 'standard')
    return must_sub(r'<div class="stmt"><span class="idx mono-n">04</span><div><h3>The acknowledgement</h3>.*?</div></div>', '', s, 'standard')


def edit_contact(s, whatsapp):
    s = must(s, 'One team, one line. Quotes go through the request form so that they become a record; everything else is a message away.',
             'One team, one line. Orders and questions go to the same WhatsApp chat.', 1, 'contact')
    s = must(s, 'Monday to Saturday · 09.00 to 18.00 WIB', 'Monday to Saturday · working hours', 1, 'contact')
    s = must(s, '<span class="kicker">Quotes</span>', '<span class="kicker">Orders</span>', 1, 'contact')
    s = must(s, 'Assemble the basket and submit a request. It reaches the team as a record, with a number, before any conversation starts.',
             'Choose a product and its size, then order on WhatsApp. The message names what you chose, and AXIOM confirms the rest in the chat.', 1, 'contact')
    s = must(s, '<a class="btn btn-solid" href="#/request">Open the request</a>', f'<a class="btn btn-solid" target="_blank" rel="noopener" href="https://wa.me/{whatsapp}">{WA_ICON} Message on WhatsApp</a>', 1, 'contact')
    return must(s, ' Prices in IDR.', '', 1, 'contact')


FAQ_DROP = ['How does delivery work?', 'How is payment made?', 'How long is a quote valid?', 'Why are peptide prices not shown to everyone?']


def edit_faq(s):
    s = re.sub(r'<script type="application/ld\+json">.*?</script>', '', s, flags=re.S)  # restated the dropped answers
    for q in FAQ_DROP:
        s = must_sub(r'<details name="faq"><summary><span class="no mono-n">\d+</span>' + re.escape(q) + r'.*?</details>', '', s, 'faq')
    s = must(s, 'A Certificate of Analysis accompanies each lot, and a sample is published on the standard page.', 'A lot that does not meet the threshold is not listed.', 1, 'faq')
    s = must_sub(r'<a class="tlink" href="#/process">Process.*?</a>', f'<a class="tlink" href="#/standard">The standard {ARROW}</a>', s, 'faq')
    s = must(s, 'The questions a clinic manager asks before the first order.', 'What researchers ask before the first order.', 1, 'faq')
    n = iter(range(1, 100))
    return re.sub(r'(<summary><span class="no mono-n">)\d+(</span>)', lambda m: f'{m[1]}{next(n):02d}{m[2]}', s)


def check_links(pages, extra=()):
    """No page may link to a route the showcase removed."""
    bad = re.compile(r'href="#/(' + '|'.join(map(re.escape, REMOVED_ROUTES)) + r')(?=[/?"])')
    for key, markup in list(pages.items()) + list(extra):
        m = bad.search(markup)
        if m: raise SystemExit(f'{key} still links to #/{m[1]}: {markup[max(0, m.start() - 80):m.end() + 40]}')
