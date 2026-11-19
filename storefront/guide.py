"""Carry the compound guide's facts onto the storefront: the plain-language summary, class line, half-life, route,
storage, evidence status and cautions, read from ../dosage-guide/compounds.js at build time.

Doses, cadence, timing and protocols stay in the dosage guide. The storefront is Research Use Only and says on every
compound page that it gives no dosing or usage guidance, so none of those fields are read here.
"""
import json, re
from html import escape
from pathlib import Path

GUIDE = Path(__file__).resolve().parent.parent / 'dosage-guide' / 'compounds.js'

# Storefront slug -> guide slug, where they differ.
ALIASES = {
    'cjc-1295-no-dac-plus-ipamorelin': 'cjc-ipamorelin',
    'cjc-1295-with-dac': 'cjc-1295-dac',
    'hgh-191aa-somatropin': 'hgh-191aa',
    'ipamorelin-plus-tesamorelin': 'ipamorelin-tesamorelin',
    'bpc-157-plus-tb-500-wolverine': 'wolverine',
    'klow-bpc-plus-tb-plus-ghk-plus-kpv': 'klow',
    'klow-c-klow-plus-cartalax': 'klow-c',
    'selank-plus-semax': 'selank-semax',
    'vip-vasoactive-intestinal-peptide': 'vip',
    'l-carnitine-injectable': 'l-carnitine',
    'lc216-lipo-b-injectable': 'lipo-b',
    'lc526-fat-blaster-injectable': 'fat-blaster',
    'slu-pp-332-injectable': 'slu-pp-332',
    'melanotan-ii': 'melanotan-2',
    'oxytocin-acetate': 'oxytocin',
    'tri-heal-bpc-plus-tb-plus-kpv': 'tri-heal',
    'ssm-ss-31-plus-mots-c': 'ssm',
}

# Guide summaries that state how often to inject (Semaglutide, Cagrilintide, Retatrutide, Tirzepatide, CJC-1295 with DAC, Tesamorelin). The storefront gives no usage guidance, so these read without it.
SUMMARIES = {
    'cagrilintide': "A long-acting copy of amylin, the hormone that tells you you've had enough. It's usually studied alongside a GLP-1 rather than on its own.",
    'retatrutide': "Aimed at three appetite and metabolism switches instead of two. It's the newest of this family and, so far, the strongest in trials.",
    'tirzepatide': 'Copies two gut hormones. It slows how fast your stomach empties and turns down appetite, so you eat less without white-knuckling it.',
    'cjc-1295-dac': 'The long-acting version of CJC-1295. The DAC part makes it stick to a blood protein so it lasts days instead of minutes.',
    'semaglutide': "Copies one gut hormone, GLP-1. It slows your stomach and turns down appetite. It's the drug that started the current wave of weight-loss medicines.",
    'tesamorelin': "Raises your own growth hormone. It's the one with real approval behind it, specifically for shifting deep belly fat.",
}
USAGE = re.compile(r'going up too fast|slow down instead', re.I)
POINTS_AT_DOSES = re.compile(r'\b(?:doses?|numbers)\b[^.]*\b(?:below|shown)\b', re.I)
DOSING = re.compile(r'\bweekly\b|\bdaily\b|\bnightly\b|\bonce a\b|\btwice\b|\ba day\b|\bper week\b|\binject it\b', re.I)


def load():
    """Guide entries by guide slug, keeping only the fields the storefront shows."""
    source = GUIDE.read_text()
    entries = [json.loads(line.strip().rstrip(',')) for line in source.splitlines() if line.startswith('  {"slug"')]
    labels = dict(re.findall(r'^\s*(\w+):\s*\{\s*label:\s*"([^"]+)"', source, re.M))
    if not entries or set(labels) != {'label', 'trial', 'regional', 'preclinical'}:
        raise SystemExit(f'{GUIDE}: the compound list or evidence labels changed shape; update guide.py')
    out = {}
    for e in entries:
        what = SUMMARIES.get(e['slug'], e['what'])
        if DOSING.search(what): raise SystemExit(f'guide.py: the {e["slug"]} summary states a dosing interval; add it to SUMMARIES')
        # The guide's notes can point at its dose table ("The doses below are the label's"); the storefront has none.
        note = ' '.join(s for s in re.split(r'(?<=\.)\s+', e['evidenceNote']) if not POINTS_AT_DOSES.search(s))
        # A caution that coaches the dose up ("Going up too fast ... slow down") is usage guidance: that sentence goes.
        cautions = [' '.join(s for s in re.split(r'(?<=\.)\s+', c) if not USAGE.search(s)) for c in e['cautions']]
        cautions = [c for c in cautions if c]
        for text in [note, *cautions]:
            if POINTS_AT_DOSES.search(text): raise SystemExit(f'guide.py: {e["slug"]} still points at a dose: {text}')
        out[e['slug']] = {'what': what, 'cls': e['cls'], 'half_life': e['halfLife'], 'route': e['route'],
                          'storage': e['storage'], 'evidence': labels[e['evidence']], 'evidence_note': note,
                          'cautions': cautions}
    return out


def facts_for(data):
    """Guide facts by storefront slug, for every research compound. A compound without a guide entry stops the build."""
    guide = load()
    facts, missing = {}, []
    for p in data['products']:
        if p['kind'] != 'peptide': continue
        entry = guide.get(ALIASES.get(p['slug'], p['slug']))
        if entry: facts[p['slug']] = entry
        else: missing.append(p['slug'])
    if missing: raise SystemExit('No dosage-guide entry for: ' + ', '.join(missing) + '. Add it to the guide or to ALIASES in guide.py.')
    return facts


def must_sub(pattern, repl, text, where, count=1, flags=re.S):
    out, n = re.subn(pattern, repl, text, flags=flags)
    if n != count: raise SystemExit(f'guide.py, {where}: expected {count} match(es) of {pattern!r}, found {n}')
    return out


def row(term, value):
    return f'<div class="r"><dt>{term}</dt><dd>{escape(value)}</dd></div>'


def summary(markup, name, f, where):
    """The opening paragraph: the guide's summary in place of '<name> is a <class>.', then the supply sentence."""
    lead = re.escape(escape(name, quote=False)) + r'(?: is an? [^<]*?)?\. (Supplied[^<]*)'
    return must_sub(r'(<div class="cp-body"><p>)' + lead + '</p>', lambda m: f'{m[1]}{escape(f["what"])}</p><p>{m[2]}</p>', markup, where)


def class_line(markup, old, new, where):
    """The page header's class line and the 'Compound class' row."""
    if old:
        markup = must_sub(r'(</h1><p class="cls">)' + re.escape(escape(old, quote=False)) + '</p>', lambda m: m[1] + escape(new) + '</p>', markup, where)
        return must_sub(r'(<dt>Compound class</dt><dd>)' + re.escape(escape(old, quote=False)) + '</dd>', lambda m: m[1] + escape(new) + '</dd>', markup, where)
    markup = must_sub(r'</h1>', f'</h1><p class="cls">{escape(new)}</p>', markup, where)
    return must_sub(r'(<dt>Name</dt><dd>[^<]*</dd></div>)', lambda m: m[1] + row('Compound class', new), markup, where)


def storage(markup, f, where):
    """The guide's storage line replaces the reference's '−20 °C' line; the approved nasal-spray text already agrees."""
    if 'sealed spray bottle' in markup: return markup
    return must_sub(r'Store sealed at −20 °C and protect from light\.', escape(f['storage']), markup, where, count=markup.count('Store sealed at −20 °C'))


def evidence_section(f):
    cautions = ''.join(f'<li>{escape(c)}</li>' for c in f['cautions'])
    return ('<section class="cp-sec" id="evidence"><div class="wrap"><div class="hd"><span class="no">{no}</span><h2>Evidence</h2></div>'
            f'<div class="split wide"><div class="cp-body"><p>{escape(f["evidence_note"])}</p>'
            f'<ul class="cp-cautions" aria-label="Cautions">{cautions}</ul></div>'
            f'<dl class="dl">{row("Status", f["evidence"])}{row("Half-life", f["half_life"])}</dl></div></div></section>')


def compound_page(markup, p, f, where):
    markup = class_line(markup, p['cls'], f['cls'], where)
    markup = summary(markup, p['name'], f, where)
    markup = must_sub(r'(<dt>Compound class</dt><dd>[^<]*</dd></div>)', lambda m: m[1] + row('Route', f['route']), markup, where)
    markup = storage(markup, f, where)
    # Structured data describes the compound with the same summary.
    markup = must_sub(r'("@type":"DefinedTerm","name":"[^"]*","description":)"(?:[^"\\]|\\.)*"', lambda m: m[1] + json.dumps(f['what'], ensure_ascii=False), markup, where)
    # Evidence follows Handling; the later sections renumber.
    markup = must_sub(r'(<section class="cp-sec" id="handling">.*?</section>)', lambda m: m[1] + evidence_section(f), markup, where)
    n = iter(range(1, 100))
    return re.sub(r'(<section class="cp-sec"[^>]*><div class="wrap"><div class="hd"><span class="no">)(?:\d\d|\{no\})(</span>)', lambda m: f'{m[1]}{next(n):02d}{m[2]}', markup)


def product_page(markup, p, f, where):
    markup = class_line(markup, p['cls'], f['cls'], where)
    markup = summary(markup, p['name'], f, where)
    return storage(markup, f, where)


def cards(markup, slug, old, new):
    """Class lines on catalogue cards, pathway lists and related lists, found by the link that opens the compound."""
    if not old: return markup
    pattern = (r'(href="#/(?:products|compounds/[a-z-]+)/' + re.escape(slug) + r'"(?:(?!href=).){0,400}?<(p|span) class="(?:cls|sm)">)'
               + re.escape(escape(old, quote=False)) + r'(</\2>)')
    return re.sub(pattern, lambda m: m[1] + escape(new) + m[3], markup, flags=re.S)


def apply(pages, data):
    """Rewrite the templates in place and return the client data with the guide's class lines."""
    facts = facts_for(data)
    for p in data['products']:
        f = facts.get(p['slug'])
        if not f: continue
        for prefix, edit in (('compound-', compound_page), ('product-', product_page)):
            key = prefix + p['slug']
            if key in pages: pages[key] = edit(pages[key], p, f, key)
        for key in pages:
            pages[key] = cards(pages[key], p['slug'], p['cls'], f['cls'])
    return {**data, 'products': [{**p, 'cls': facts[p['slug']]['cls']} if p['slug'] in facts else p for p in data['products']]}
