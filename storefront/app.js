(function () {
  'use strict';
  var PAGES = window.__PAGES, DATA = window.__DATA, IMG = window.__IMG;
  var main = document.getElementById('main');
  var bySlug = {}; DATA.products.forEach(function (p) { bySlug[p.slug] = p; });
  var bySku = {}; DATA.products.forEach(function (p) { p.variants.forEach(function (v) { bySku[v.sku] = { p: p, v: v }; }); });
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var idr = function (n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); };
  var planNet = function (list, pct) { return Math.round(list * (1 - pct / 100) / 1000) * 1000; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var icon = function (n) { return '<svg class="ic-sv" aria-hidden="true"><use href="#i-' + n + '"></use></svg>'; };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var fmtDate = function (d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
  var plusDays = function (n) { var d = new Date(); d.setDate(d.getDate() + n); return d; };
  var deliveryNote = function () { return 'delivery from ' + idr(DATA.delivery.per) + ' per consignment (' + DATA.delivery.zone + ', ' + DATA.delivery.eta + ' days)'; };
  // the four stages of the quote-first flow; `at` is the stage the viewer is on (1-based)
  function flow(at) {
    var st = [['Request', 'You send the basket'], ['Quote', 'Priced within ' + DATA.sla], ['Pay', 'Bank transfer, invoice first'], ['Dispatch', 'Cold chain, tracked']];
    return '<ol class="flow" aria-label="How the order proceeds">' + st.map(function (s, i) {
      var n = i + 1, cls = n < at ? 'done' : n === at ? 'now' : '';
      return '<li class="' + cls + '"><span class="n">' + (cls === 'done' ? icon('check') : n) + '</span><span class="t">' + s[0] + '</span><span class="s">' + s[1] + '</span></li>';
    }).join('') + '</ol>';
  }

  // ---------- state (per viewer, this browser only) ----------
  function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var basket = load('axiom-design-basket', []);   // [{sku, qty, plan}]
  var saved = load('axiom-design-saved', []);     // [sku]
  function basketCount() { return basket.reduce(function (a, l) { return a + l.qty; }, 0); }
  function setLine(sku, qty, plan, fromPlan) {
    plan = plan || null;
    if (fromPlan !== undefined && fromPlan !== plan) basket = basket.filter(function (l) { return !(l.sku === sku && (l.plan || null) === (fromPlan || null)); });
    var i = basket.findIndex(function (l) { return l.sku === sku && (l.plan || null) === plan; });
    if (qty <= 0) { if (i >= 0) basket.splice(i, 1); }
    else if (i >= 0) basket[i].qty = qty;
    else basket.push({ sku: sku, qty: qty, plan: plan });
    save('axiom-design-basket', basket); badges();
  }
  function addLine(sku, delta, plan) {
    plan = plan || null;
    var cur = basket.find(function (l) { return l.sku === sku && (l.plan || null) === plan; });
    setLine(sku, (cur ? cur.qty : 0) + delta, plan);
  }
  function toggleSaved(sku) {
    var i = saved.indexOf(sku); if (i >= 0) saved.splice(i, 1); else saved.push(sku);
    save('axiom-design-saved', saved); badges(); return i < 0;
  }
  function badges() {
    document.querySelectorAll('[data-basket-count]').forEach(function (el) { el.textContent = basketCount() || ''; });
    document.querySelectorAll('[data-saved-count]').forEach(function (el) { el.textContent = saved.length || ''; });
  }

  // ---------- toast ----------
  var toastEl = document.getElementById('demo-toast'), toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2800); }

  // ---------- mini basket: opens after every add, shows the running total and the way to the basket ----------
  var miniEl = document.getElementById('mini'), miniOv = document.getElementById('mini-ov'), miniT, miniLast = null;
  function lineNet(l) { var r = bySku[l.sku]; if (!r) return 0; var tier = l.plan ? DATA.tiers.find(function (t) { return t.days === l.plan; }) : null; return tier ? planNet(r.v.price_idr, tier.pct) : r.v.price_idr; }
  function goodsTotal() { return basket.reduce(function (a, l) { return a + lineNet(l) * l.qty; }, 0); }
  function drawMini() {
    var units = basketCount();
    miniEl.innerHTML = '<div class="mini-h"><span class="kicker">Basket · ' + units + (units === 1 ? ' item' : ' items') + '</span><button type="button" class="mini-x" aria-label="Close" data-mini-close>' + icon('x') + '</button></div>' +
      '<div class="mini-lines">' + basket.slice().reverse().map(function (l) {
        var r = bySku[l.sku]; if (!r) return ''; var tier = l.plan ? DATA.tiers.find(function (t) { return t.days === l.plan; }) : null;
        return '<div class="mini-line' + (miniLast === l.sku + '|' + (l.plan || '') ? ' new' : '') + '"><div><div class="nm">' + esc(r.p.name) + '</div><div class="sub">' + esc(r.v.dose) + (tier ? ' · every ' + tier.days + ' days · ' + tier.pct + '% off' : ' · one-time') + '</div></div><div class="amt">' + l.qty + ' × ' + idr(lineNet(l)) + '</div></div>';
      }).join('') + '</div>' +
      '<div class="mini-foot"><div class="kv"><span class="k">Goods</span><span class="v">' + idr(goodsTotal()) + '</span></div><p class="note">Delivery is added. A priced quote follows the request; nothing is charged until you accept it.</p>' +
      '<div class="acts"><a class="btn btn-solid" href="#/request">View basket ' + icon('arrow') + '</a><button type="button" class="btn" data-mini-close>Keep shopping</button></div></div>';
  }
  function mini(open, sku, plan) {
    clearTimeout(miniT);
    if (!open) { miniEl.hidden = true; miniOv.hidden = true; miniEl.classList.remove('on'); return; }
    miniLast = sku + '|' + (plan || ''); drawMini();
    miniEl.hidden = false; miniOv.hidden = false; requestAnimationFrame(function () { miniEl.classList.add('on'); });
    miniT = setTimeout(function () { if (!miniEl.matches(':hover') && !miniEl.contains(document.activeElement)) mini(false); }, 6500);
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-mini-close]') || e.target === miniOv || (e.target.closest('#mini a.btn'))) mini(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !miniEl.hidden) mini(false); });
  window.addEventListener('hashchange', function () { mini(false); });
  function added(sku, qty, plan) { addLine(sku, qty, plan); mini(true, sku, plan); }

  // ---------- nav ----------
  var nav = document.querySelector('.site-nav');
  var toggle = nav.querySelector('.nav-toggle'), links = nav.querySelector('.nav-links');
  function closeMenu() { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.innerHTML = icon('menu'); }
  toggle.addEventListener('click', function () {
    var open = !links.classList.contains('open');
    links.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); toggle.innerHTML = icon(open ? 'x' : 'menu');
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#lang"]');
    if (a) { e.preventDefault(); toast('Bahasa Indonesia runs on the live site; this demo is in English.'); }
  });

  // ---------- routing ----------
  function parse() {
    var h = location.hash.replace(/^#/, '') || '/';
    var q = {}, i = h.indexOf('?'), path = h;
    if (i >= 0) { path = h.slice(0, i); h.slice(i + 1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); }); }
    return { path: path.replace(/\/+$/, '') || '/', q: q };
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  var STATIC = { '/': 'home', '/products': 'products', '/merch': 'merch', '/coas': 'coas', '/compounds': 'compounds', '/contact': 'contact', '/request': 'request', '/sign-in': 'signin', '/account': 'signin', '/console': 'signin', '/standard': 'standard', '/process': 'process', '/faq': 'faq', '/price-list': 'pricelist', '/how-to-read-a-coa': 'howto', '/terms': 'terms', '/privacy': 'privacy', '/legal': 'legal' };
  var first = true;
  var pageRequests = {};
  function loadPage(key) {
    main.setAttribute('aria-busy', 'true');
    if (pageRequests[key]) return;
    pageRequests[key] = true;
    var s = document.createElement('script');
    s.src = 'pages/' + key + '.js?v=' + window.__PAGES_VERSION;
    s.onload = function () { render(); };
    s.onerror = function () { pageRequests[key] = false; s.remove(); main.removeAttribute('aria-busy'); toast('This page could not load. Check your connection and try again.'); };
    document.head.appendChild(s);
  }
  function render() {
    var r = parse(), key = null, m;
    if (STATIC[r.path]) key = STATIC[r.path];
    else if ((m = r.path.match(/^\/products\/([a-z0-9-]+)$/))) key = 'product-' + m[1];
    else if ((m = r.path.match(/^\/coas\/([a-z0-9-]+)$/))) key = 'coa-' + m[1];
    else if ((m = r.path.match(/^\/compounds\/([a-z0-9-]+)\/([a-z0-9-]+)$/))) key = 'compound-' + m[2];
    else if ((m = r.path.match(/^\/compounds\/([a-z0-9-]+)$/))) key = 'pathway-' + m[1];
    else if (r.path === '/request/sent') key = 'sent';
    if (key && !PAGES[key] && window.__PAGE_KEYS.indexOf(key) >= 0) { loadPage(key); return; }
    if (key === 'sent') main.innerHTML = sentPage();
    else if (!PAGES[key]) { key = 'home'; main.innerHTML = PAGES.home; }
    else main.innerHTML = PAGES[key];
    main.removeAttribute('aria-busy');
    closeMenu();
    window.scrollTo(0, 0);
    hydrate(key, r);
    window.dispatchEvent(new CustomEvent("axiom:route", {detail:{key:key,path:r.path}}));
    if (!first && window.gsap && !reduce) gsap.fromTo(main, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .7, ease: 'power2.out', clearProps: 'all' });
    first = false;
  }
  window.addEventListener('hashchange', render);

  // ---------- generic hydration ----------
  function images(root) {
    root.querySelectorAll('img[data-pen]').forEach(function (img) {
      var w = img.dataset.w === '400' ? 400 : 800, src = IMG[img.dataset.pen + '-' + w] || IMG[img.dataset.pen + '-800'] || IMG[img.dataset.pen + '-400'];
      if (src) img.src = src; else img.removeAttribute('src');
    });
  }
  function cardControls(root) {
    root.querySelectorAll('form.save').forEach(function (f) {
      var sku = f.querySelector('input[name="sku"]').value, b = f.querySelector('button');
      var on = saved.indexOf(sku) >= 0; b.setAttribute('aria-pressed', String(on)); b.className = on ? 'on' : ''; b.innerHTML = icon(on ? 'bookmark-f' : 'bookmark');
      f.addEventListener('submit', function (e) {
        e.preventDefault(); var now = toggleSaved(sku);
        b.setAttribute('aria-pressed', String(now)); b.className = now ? 'on' : ''; b.innerHTML = icon(now ? 'bookmark-f' : 'bookmark');
        b.setAttribute('aria-label', now ? 'Remove from saved' : 'Save');
      });
    });
    root.querySelectorAll('form').forEach(function (f) {
      var sku = f.querySelector('input[name="sku"]'), delta = f.querySelector('input[name="delta"]');
      if (!sku || !delta || f.classList.contains('buy')) return;
      var card = f.closest('.pcard');
      f.addEventListener('submit', function (e) {
        e.preventDefault(); var b = f.querySelector('button[type="submit"]'); if (b.disabled) return;
        var p = card && bySlug[card.dataset.compound];
        // a card advertising a plan or holding several sizes opens the chooser; anything else adds straight away
        if (p && (p.kind === 'peptide' && DATA.tiers.length || p.variants.length > 1)) { quickAdd(card, p, sku.value); return; }
        added(sku.value, +delta.value || 1, null);
        var label = b.innerHTML; b.innerHTML = icon('check') + ' Added'; b.dataset.added = '1';
        setTimeout(function () { b.innerHTML = label; delete b.dataset.added; }, 1800);
      });
    });
    // price context on every card: tax treatment, and the certificate mark only where one is published
    root.querySelectorAll('.pcard.shop2').forEach(function (c) {
      if (c.dataset.ctx) return; c.dataset.ctx = '1';
      var p = bySlug[c.dataset.compound], pr = c.querySelector('.pr');
      // the captured card already carries both where the site renders them; the demo only fills a gap
      if (p && p.coa && p.coa.length && !c.querySelector('.coa-mark')) { var cls = c.querySelector('.cls'); if (cls) cls.insertAdjacentHTML('afterend', '<span class="coa-mark">' + icon('check') + ' Certificate published</span>'); }
      if (p && p.variants.every(function (v) { return v.available <= 0; })) { c.classList.add('out'); var b = c.querySelector('.add button'); if (b) { b.disabled = true; b.textContent = 'Sold out'; } }
    });
  }
  // the compact chooser inside a card: size, one-time or a plan, then Add
  function quickAdd(card, p, sku) {
    var add = card.querySelector('.add'); if (!add || add.querySelector('.qa-panel')) return;
    var keep = add.innerHTML, canPlan = p.kind === 'peptide' && DATA.tiers.length > 0;
    var firstOpen = p.variants.find(function (v) { return v.sku === sku && v.available > 0; }) || p.variants.find(function (v) { return v.available > 0; }) || p.variants[0];
    var st = { sku: firstOpen.sku, plan: 0 };
    function draw() {
      var v = p.variants.find(function (x) { return x.sku === st.sku; }), tier = DATA.tiers.find(function (t) { return t.days === st.plan; });
      var net = v.price_idr === null ? null : tier ? planNet(v.price_idr, tier.pct) : v.price_idr;
      var h = '<div class="qa-panel" role="group" aria-label="Add ' + esc(p.name) + '">';
      if (p.variants.length > 1) h += '<span class="lab">' + (p.kind === 'peptide' ? 'Vial size' : 'Option') + '</span><div class="sizes" role="radiogroup">' + p.variants.map(function (x) { var so = x.available <= 0; return '<button type="button" role="radio" data-sku="' + x.sku + '" aria-checked="' + (x.sku === st.sku) + '"' + (so ? ' aria-disabled="true"' : '') + ' class="size' + (x.sku === st.sku ? ' on' : '') + (so ? ' out' : '') + '"><span class="d">' + esc(x.dose) + '</span></button>'; }).join('') + '</div>';
      if (canPlan) h += '<span class="lab">Plan</span><div class="plans" role="radiogroup"><button type="button" role="radio" data-plan="0" aria-checked="' + (st.plan === 0) + '" class="' + (st.plan === 0 ? 'on' : '') + '">One-time</button>' + DATA.tiers.map(function (t) { return '<button type="button" role="radio" data-plan="' + t.days + '" aria-checked="' + (st.plan === t.days) + '" class="' + (st.plan === t.days ? 'on' : '') + '">Every ' + t.days + ' d <b>−' + t.pct + '%</b></button>'; }).join('') + '</div>';
      h += '<div class="qa-foot"><span class="qa-price"><span class="mono-n">' + (net === null ? '—' : idr(net)) + '</span>' + (tier && v.price_idr !== null ? '<s>' + idr(v.price_idr) + '</s>' : '') + '</span>' +
        (v.available > 0 ? '<button type="button" class="btn btn-sm btn-solid" data-qa-add>Add</button>' : '<span class="qa-out">Sold out</span>') + '<button type="button" class="link-x" data-qa-cancel>Cancel</button></div></div>';
      add.innerHTML = h;
    }
    function close() { add.removeEventListener('click', onClick); add.innerHTML = keep; cardControls(add); }
    function onClick(e) {
      var b = e.target.closest('button'); if (!b || !add.querySelector('.qa-panel')) return;
      e.preventDefault();
      if (b.dataset.sku) { if (b.getAttribute('aria-disabled') === 'true') return; st.sku = b.dataset.sku; draw(); }
      else if (b.dataset.plan !== undefined) { st.plan = +b.dataset.plan; draw(); }
      else if (b.hasAttribute('data-qa-add')) { var s = st.sku, pl = st.plan || null; close(); added(s, 1, pl); }
      else if (b.hasAttribute('data-qa-cancel')) close();
    }
    add.addEventListener('click', onClick);
    draw();
    var f = add.querySelector('.size.on, .plans .on'); if (f) f.focus();
  }
  function reveal(root) {
    if (!window.gsap || reduce || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    ['.feats', '.pgrid.cards', '.coa-grid'].forEach(function (sel) {
      root.querySelectorAll(sel).forEach(function (el) {
        var kids = Array.prototype.slice.call(el.children); if (!kids.length) return;
        gsap.from(kids, { opacity: 0, y: 14, duration: .7, ease: 'power3.out', stagger: .065, clearProps: 'opacity,transform', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
      });
    });
    root.querySelectorAll('.chead, .prod-sec, .req-line').forEach(function (el) {
      gsap.from(el, { opacity: 0, y: 16, duration: .7, ease: 'power3.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
    requestAnimationFrame(function () { ScrollTrigger.refresh(); });
  }
  function magnetic() {
    if (!window.gsap || reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.addEventListener('pointerover', function (e) {
      var btn = e.target.closest && e.target.closest('.btn'); if (!btn || btn.dataset.magnet) return;
      btn.dataset.magnet = '1';
      var arrow = btn.querySelector('svg');
      var x = gsap.quickTo(btn, 'x', { duration: .55, ease: 'power3.out' }), y = gsap.quickTo(btn, 'y', { duration: .55, ease: 'power3.out' });
      var move = function (ev) { var r = btn.getBoundingClientRect(), dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2), k = Math.min(1, Math.hypot(dx, dy) / Math.max(r.width, r.height)); x(Math.max(-28, Math.min(28, dx * .22 * k))); y(Math.max(-28, Math.min(28, dy * .22 * k))); if (arrow) gsap.to(arrow, { x: 3, duration: .4, overwrite: 'auto' }); };
      var leave = function () { btn.removeEventListener('pointermove', move); btn.removeEventListener('pointerleave', leave); delete btn.dataset.magnet; gsap.to(btn, { x: 0, y: 0, duration: .8, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform' }); if (arrow) gsap.to(arrow, { x: 0, duration: .5, overwrite: 'auto', clearProps: 'transform' }); };
      btn.addEventListener('pointermove', move); btn.addEventListener('pointerleave', leave);
    });
  }

  function hydrate(key, r) {
    images(main); cardControls(main);
    if (key === 'home') home();
    if (key === 'products') productsPage(r.q);
    if (key.indexOf('product-') === 0) productPage(key.slice(8));
    if (key === 'coas') coasPage(r.q);
    if (key.indexOf('coa-') === 0) coaPage();
    if (key === 'request') requestPage();
    if (key === 'signin') signInPage();
    if (key === 'sent') { var cb = main.querySelector('[data-copy-ref]'); if (cb) cb.addEventListener('click', function () { var done = function () { cb.innerHTML = icon('check') + ' Copied'; }; if (navigator.clipboard) navigator.clipboard.writeText(cb.dataset.copyRef).then(done, done); else done(); }); }
    if (key === 'pricelist') { var dl = main.querySelector('a[href*="/api/documents/price-list"]'); if (dl) { dl.innerHTML = icon('print') + ' Print or save as PDF'; dl.setAttribute('href', '#print'); dl.addEventListener('click', function (e) { e.preventDefault(); window.print(); }); } }
    if (key === 'merch') {}
    main.querySelectorAll('form').forEach(function (f) { if (!f.dataset.demo && !f.classList.contains('buy') && !f.classList.contains('save') && !f.querySelector('input[name="delta"]')) f.addEventListener('submit', function (e) { e.preventDefault(); toast('This form posts on the live site. The demo covers browsing, the basket and the request.'); }); });
    reveal(main);
  }

  // ---------- home: the 3D pen ----------
  function home() {
    var stage = main.querySelector('.pen3d'); if (!stage) return;
    var still = stage.querySelector('img[data-pen]'); var p = still && bySlug[still.dataset.pen];
    if (!p || !window.THREE || reduce) return;
    try { var c = document.createElement('canvas'); if (!(c.getContext('webgl2') || c.getContext('webgl'))) return; } catch (e) { return; }
    var host = document.createElement('div'); host.className = 'pen3d-canvas'; stage.appendChild(host);
    var idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 600); };
    var ready = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 52px Inter'), document.fonts.load('500 22px Inter'), document.fonts.load('italic 600 74px Inter')]).catch(function () {}) : Promise.resolve();
    ready.then(function () { idle(function () { mountPen(stage, host, p.name, p.variants[0] ? p.variants[0].dose : ''); }); });
  }
  var WORDMARK = (document.querySelector('#wm path') || {}).getAttribute ? document.querySelector('#wm path').getAttribute('d') : '';
  function labelTexture(name, qty) {
    var W = 720, H = 360, c = document.createElement('canvas'); c.width = H; c.height = W;
    var ctx = c.getContext('2d');
    ctx.fillStyle = 'rgb(26,24,22)'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalAlpha = .035; ctx.fillStyle = '#F2EDE5';
    for (var i = 0; i < 900; i++) ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 1.2, 1.2);
    ctx.globalAlpha = 1; ctx.save(); ctx.translate(0, W); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#F2EDE5';
    if (WORDMARK) { ctx.save(); ctx.translate(40, 36); var k = 32 / 70; ctx.scale(k, k); ctx.fill(new Path2D(WORDMARK), 'evenodd'); ctx.restore(); }
    ctx.fillStyle = '#E7B173'; ctx.font = '600 15px Inter, system-ui, sans-serif'; ctx.fillText('≥ ' + DATA.verification.purity_threshold_pct + '%', 560, 60);
    ctx.fillStyle = '#C88A4E'; ctx.fillRect(40, 82, 640, 1.5);
    ctx.fillStyle = '#F2EDE5'; var size = 52; ctx.font = '600 ' + size + 'px Inter, system-ui, sans-serif';
    while (ctx.measureText(name).width > 640 && size > 22) { size -= 2; ctx.font = '600 ' + size + 'px Inter, system-ui, sans-serif'; }
    ctx.fillText(name, 40, 160);
    ctx.fillStyle = '#9a9086'; ctx.font = '500 22px Inter, system-ui, sans-serif'; ctx.fillText('QTY', 40, 232);
    ctx.fillStyle = '#F2EDE5'; ctx.font = '500 26px Inter, system-ui, sans-serif'; ctx.fillText(qty, 112, 233);
    ctx.globalAlpha = .7; ctx.fillStyle = '#C88A4E'; ctx.fillRect(40, 262, 640, 1.5); ctx.globalAlpha = 1;
    ctx.fillStyle = '#9a9086'; ctx.font = '500 17px Inter, system-ui, sans-serif'; ctx.fillText('R E S E A R C H   U S E   O N L Y', 40, 300);
    ctx.restore();
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  }
  function windowTexture() {
    var c = document.createElement('canvas'); c.width = 128; c.height = 128; var ctx = c.getContext('2d');
    ctx.fillStyle = 'rgb(5,4,10)'; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#F2EDE5'; ctx.font = 'italic 600 74px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('0', 64, 68);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  function mountPen(stage, host, name, qty) {
    if (!stage.isConnected) return;
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0); renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(26, 1, .1, 50); camera.position.set(0, .4, 14); camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0x3a2f24, 0x070605, .9));
    var key = new THREE.DirectionalLight(0xE7B173, 1.6); key.position.set(3, 5, 6); scene.add(key);
    var rim = new THREE.DirectionalLight(0x9fb8cc, 1.1); rim.position.set(-5, 2, -4); scene.add(rim);
    var top = new THREE.PointLight(0xF2EDE5, .8, 30); top.position.set(0, 6, 4); scene.add(top);
    var pen = new THREE.Group(); scene.add(pen);
    var body = new THREE.MeshPhysicalMaterial({ color: 0x0b0a08, roughness: .48, metalness: .1, clearcoat: .5, clearcoatRoughness: .35 });
    var bronze = new THREE.MeshPhysicalMaterial({ color: 0xC88A4E, roughness: .3, metalness: .9, clearcoat: .2 });
    var R = .42;
    var m = new THREE.Mesh(new THREE.CapsuleGeometry(R, 6.6, 10, 56), body); m.rotation.z = Math.PI / 2; pen.add(m);
    var collar = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.02, .22, 56), bronze); collar.rotation.z = Math.PI / 2; collar.position.x = 3.5; pen.add(collar);
    var button = new THREE.Mesh(new THREE.CylinderGeometry(R * .74, R * .74, .7, 48), body); button.rotation.z = Math.PI / 2; button.position.x = 3.95; pen.add(button);
    var win = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.005, R * 1.005, .72, 48, 1, true, Math.PI * .32, Math.PI * .36), new THREE.MeshPhysicalMaterial({ map: windowTexture(), roughness: .15, metalness: .05, clearcoat: 1 }));
    win.rotation.z = Math.PI / 2; win.position.x = 2.7; pen.add(win);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.01, .028, 16, 72), bronze); ring.rotation.y = Math.PI / 2; ring.position.x = 2.2; pen.add(ring);
    var band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.01, .03, 16, 72), bronze); band.rotation.y = Math.PI / 2; band.position.x = -2.35; pen.add(band);
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(R * .92, R * .62, 1.1, 48), body); cap.rotation.z = -Math.PI / 2; cap.position.x = -3.6; pen.add(cap);
    var along = 2.6, theta = (along / 2) / (R * 1.012);
    var sticker = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.012, R * 1.012, along, 64, 1, true, -theta / 2, theta), new THREE.MeshStandardMaterial({ map: labelTexture(name, qty), roughness: .88, metalness: 0 }));
    sticker.rotation.z = -Math.PI / 2; sticker.position.x = .15; pen.add(sticker);
    var sc = document.createElement('canvas'); sc.width = 256; sc.height = 64; var sctx = sc.getContext('2d');
    var g = sctx.createRadialGradient(128, 32, 4, 128, 32, 120); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.scale(1, .25); sctx.fillStyle = g; sctx.fillRect(0, 0, 256, 256);
    var shadow = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 2.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    shadow.position.y = -1.15; shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
    pen.rotation.z = -.1;
    var pointer = { x: 0, y: 0 };
    var onMove = function (e) { pointer.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.y = (e.clientY / window.innerHeight) * 2 - 1; };
    window.addEventListener('pointermove', onMove, { passive: true });
    var size = function () { var w = host.clientWidth || 1, h = host.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    size(); var ro = new ResizeObserver(size); ro.observe(host);
    var visible = true; var io = new IntersectionObserver(function (es) { visible = es.some(function (e) { return e.isIntersecting; }); }); io.observe(host);
    var start = performance.now(), told = false, alive = true;
    function tick(now) {
      if (!alive) return;
      if (!stage.isConnected) { alive = false; window.removeEventListener('pointermove', onMove); ro.disconnect(); io.disconnect(); renderer.dispose(); return; }
      requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      var t = (now - start) / 1000, a = Math.min(1, t / 1.4), e = 1 - Math.pow(1 - a, 3);
      pen.rotation.x = Math.sin(t * .32) * .42 + (1 - e) * .9;
      pen.rotation.y += ((pointer.x * .16) - pen.rotation.y) * .04;
      pen.rotation.z += ((-.1 - pointer.y * .07) - pen.rotation.z) * .04;
      pen.position.y = Math.sin(t * .55) * .05 + (1 - e) * -.5;
      pen.scale.setScalar(.94 + e * .06);
      shadow.material.opacity = e * .9;
      renderer.render(scene, camera);
      if (!told) { told = true; stage.classList.add('live'); stage.dataset.pen3d = '1'; }
    }
    requestAnimationFrame(tick);
  }

  // ---------- shop ----------
  function productsPage(q) {
    var grid = main.querySelector('.pgrid.cards'); if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.pcard'));
    var order = cards.slice();
    var needle = (q.q || '').trim().toLowerCase().replace(/\s+/g, ' ');
    // search covers the name, class, pathway, synonyms and abbreviations, SKUs, doses and published lot codes
    var hay = function (p) { return [p.name, p.cls || '', p.pathway_name].concat(p.synonyms || [], p.coa || [], p.variants.map(function (v) { return v.sku + ' ' + v.dose; })).join(' | ').toLowerCase(); };
    var shown = cards.filter(function (c) {
      var p = bySlug[c.dataset.compound]; if (!p) return true;
      if (q.kind && p.kind !== q.kind) return false;
      if (q.pathway && p.pathway !== q.pathway) return false;
      if (q.saved && !p.variants.some(function (v) { return saved.indexOf(v.sku) >= 0; })) return false;
      if (needle && needle.split(' ').some(function (w) { return hay(p).indexOf(w) < 0; })) return false;
      return true;
    });
    var price = function (c) { var p = bySlug[c.dataset.compound]; var ps = p ? p.variants.map(function (v) { return v.price_idr; }).filter(function (x) { return x !== null; }) : []; return ps.length ? Math.min.apply(null, ps) : Infinity; };
    if (q.sort === 'name') shown.sort(function (a, b) { return bySlug[a.dataset.compound].name.localeCompare(bySlug[b.dataset.compound].name); });
    if (q.sort === 'price') shown.sort(function (a, b) { return price(a) - price(b); });
    if (q.sort === 'price_desc') shown.sort(function (a, b) { return price(b) - price(a); });
    cards.forEach(function (c) { c.remove(); });
    // the grid opens with one page of cards; "Show more" appends the next page so the filters stay within reach
    var PAGE = 24, limit = q.all ? shown.length : PAGE;
    shown.slice(0, limit).forEach(function (c) { grid.appendChild(c); });
    var more = main.querySelector('[data-demo-more]'); if (more) more.remove();
    if (shown.length > limit) {
      more = document.createElement('div'); more.className = 'acts more'; more.setAttribute('data-demo-more', '');
      more.innerHTML = '<button type="button" class="btn">Show ' + Math.min(PAGE, shown.length - limit) + ' more</button><span class="note">' + limit + ' of ' + shown.length + '</span>';
      grid.parentNode.insertBefore(more, grid.nextSibling);
      more.querySelector('button').addEventListener('click', function () {
        var next = shown.slice(limit, limit + PAGE); next.forEach(function (c) { grid.appendChild(c); }); cardControls(grid); images(grid); limit += next.length;
        if (limit >= shown.length) more.remove(); else { more.querySelector('button').textContent = 'Show ' + Math.min(PAGE, shown.length - limit) + ' more'; more.querySelector('.note').textContent = limit + ' of ' + shown.length; }
        if (next[0]) { var lk = next[0].querySelector('.nm a'); if (lk) lk.focus({ preventScroll: true }); }
      });
    }
    var none = main.querySelector('[data-demo-none]');
    if (!shown.length) {
      if (!none) {
        none = document.createElement('div'); none.className = 'empty'; none.setAttribute('data-demo-none', '');
        none.innerHTML = '<p class="lead">Nothing matches' + (needle ? ' “' + esc(q.q) + '”' : '') + (q.pathway || q.kind || q.saved ? ' in this selection' : '') + '.</p><div class="acts"><a class="btn" href="#/products">Clear filters</a>' + (needle ? '<a class="tlink" href="#/products' + query({ q: q.q }) + '">Search all products ' + icon('arrow').replace('ic-sv', 'ic-sv ar') + '</a>' : '') + '</div>';
        grid.parentNode.insertBefore(none, grid);
      }
    } else if (none) none.remove();
    var cnt = main.querySelector('.ptool .cnt'); if (cnt) { cnt.innerHTML = shown.length + (shown.length === 1 ? ' compound' : ' compounds') + (q.q || q.pathway || q.kind || q.saved ? ' · <a href="#/products" class="clear">Clear</a>' : '') + '<a class="tlink pl" href="#/price-list">Printable price list ' + icon('arrow').replace('ic-sv', 'ic-sv ar') + '</a>'; cnt.dataset.rows = shown.length; }
    // pills: the active one is the one whose query matches
    main.querySelectorAll('nav.pills a').forEach(function (a) {
      var h = a.getAttribute('href') || '', on = false, m = h.match(/\?(.*)$/);
      if (!m) on = !q.kind && !q.pathway && !q.saved; else on = m[1].split('&').every(function (kv) { var p = kv.split('='); return q[p[0]] === decodeURIComponent(p[1] || ''); }) && ['kind', 'pathway', 'saved'].every(function (k) { return !q[k] || h.indexOf(k + '=') >= 0; });
      a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var form = main.querySelector('form.ptool'), input = main.querySelector('#shop-q'), sel = main.querySelector('form.ptool select');
    if (input) {
      input.value = q.q || ''; input.placeholder = 'Search by name, abbreviation or lot code';
      if (!document.getElementById('shop-sugg')) {
        var dl = document.createElement('datalist'); dl.id = 'shop-sugg';
        var seen = {}; DATA.products.forEach(function (p) { [p.name].concat(p.synonyms || []).forEach(function (n) { if (!seen[n]) { seen[n] = 1; var o = document.createElement('option'); o.value = n; dl.appendChild(o); } }); });
        document.body.appendChild(dl);
      }
      input.setAttribute('list', 'shop-sugg');
    }
    if (sel) sel.value = q.sort || 'default';
    if (form) { form.dataset.demo = '1'; form.addEventListener('submit', function (e) { e.preventDefault(); go('#/products' + query({ kind: q.kind, pathway: q.pathway, saved: q.saved, q: input.value, sort: sel ? sel.value : '' })); }); }
    if (sel) sel.addEventListener('change', function () { go('#/products' + query({ kind: q.kind, pathway: q.pathway, saved: q.saved, q: input ? input.value : '', sort: sel.value })); });
    if (q.focus && input) setTimeout(function () { input.focus(); input.scrollIntoView({ block: 'center' }); }, 60);
  }
  function query(o) { var s = Object.keys(o).filter(function (k) { return o[k]; }).map(function (k) { return k + '=' + encodeURIComponent(o[k]); }).join('&'); return s ? '?' + s : ''; }

  // ---------- product page: the buy box ----------
  function productPage(slug) {
    var p = bySlug[slug], form = main.querySelector('form.buy') || main.querySelector('.buy form.buy-form'); if (!p || !form) return;
    form.dataset.demo = '1';
    // the site draws its own notice block beside the form for a lot it holds no stock of; the demo draws its own from avail.json
    Array.prototype.slice.call(form.parentNode.querySelectorAll(':scope > .notify')).forEach(function (n) { n.remove(); });
    var tiers = DATA.tiers, canPlan = p.kind === 'peptide' && tiers.length > 0;
    var firstOpen = p.variants.find(function (v) { return v.available > 0; }) || p.variants[0];
    var st = { sku: firstOpen ? firstOpen.sku : '', plan: 'once', days: tiers[0] ? tiers[0].days : 0, qty: 1, added: null };
    var how = form.querySelector('.how') ? form.querySelector('.how').outerHTML : '';
    function draw() {
      var v = p.variants.find(function (x) { return x.sku === st.sku; }) || firstOpen;
      var tier = tiers.find(function (x) { return x.days === st.days; }) || tiers[0];
      var maxPct = tiers.reduce(function (m, x) { return Math.max(m, x.pct); }, 0);
      var list = v ? v.price_idr : null;
      var net = list === null ? null : (st.plan === 'sub' && canPlan && tier ? planNet(list, tier.pct) : list);
      var saving = list !== null && net !== null ? list - net : 0, best = list === null ? null : list - planNet(list, maxPct);
      var out = !v || v.available <= 0;
      var h = '';
      if (p.variants.length > 1) {
        h += '<span class="lab" id="size-label">' + (p.kind === 'peptide' ? 'Vial size' : 'Option') + '</span><div class="sizes" role="radiogroup" aria-labelledby="size-label">' +
          p.variants.map(function (x) { var so = x.available <= 0; return '<button type="button" role="radio" data-sku="' + x.sku + '" aria-checked="' + (x.sku === v.sku) + '"' + (so ? ' aria-disabled="true" title="Sold out"' : '') + ' class="size' + (x.sku === v.sku ? ' on' : '') + (so ? ' out' : '') + '"><span class="d">' + esc(x.dose) + '</span>' + (so ? '<span class="so">Sold out</span>' : '') + '</button>'; }).join('') + '</div>';
      }
      h += '<div class="price-big" aria-live="polite"><span class="now">' + (net === null ? '—' : idr(net)) + '</span>' + (list !== null && net !== null && net !== list ? '<span class="strike">' + idr(list) + '</span>' : '') + (v ? '<span class="per">per ' + esc(v.dose) + ' · IDR</span>' : '') + '</div>';
      if (list !== null) h += '<p class="price-note">' + deliveryNote() + '</p>';
      h += '<div class="avail-line' + (out ? ' none' : (v && v.available <= 3 ? ' low' : '')) + '"><span class="dot"></span>' + (out ? 'Sold out. Ask to be told when it is back.' : (v.available <= 3 ? 'Only ' + v.available + ' left' : v.available + ' available')) + '</div>';
      if (!out) h += '<p class="cutoff-line">' + icon('clock') + ' Paid by ' + (v && v.cold ? DATA.cutoff.cold : DATA.cutoff.ambient) + ' WIB on a working day ships the same day' + (v && v.cold ? ', cold chain.' : '.') + '</p>';
      if (out) {
        var noted = load('axiom-design-notices', []).indexOf(st.sku) >= 0;
        h += '<div class="notify" data-notify><span class="lab">Tell me when it is back</span>' + (noted ? '<p class="ok-line">' + icon('check') + ' Noted. AXIOM messages you when ' + esc(p.name) + ' ' + esc(v ? v.dose : '') + ' is back.</p>' :
          '<p class="note">Leave an email or a WhatsApp number. AXIOM messages you when the lot is booked in; nothing else is sent.</p><div class="field"><label for="nb-contact">Email or WhatsApp number</label><input id="nb-contact" name="contact" placeholder="name@lab.id or 08xx" inputmode="email" aria-describedby="nb-err"><span class="err" id="nb-err" hidden>An email address or an Indonesian mobile number.</span></div>' +
          '<div class="acts"><button type="button" class="btn btn-solid btn-sm" data-notify-send>Notify me</button><a class="tlink" href="https://wa.me/' + DATA.whatsapp + '?text=' + encodeURIComponent('Please tell me when ' + p.name + ' ' + (v ? v.dose : '') + ' is available again.') + '">Or ask on WhatsApp ' + icon('arrow').replace('ic-sv', 'ic-sv ar') + '</a></div>') + '</div>';
      } else if (canPlan) {
        h += '<div class="opts" role="radiogroup" aria-label="One-time purchase">' +
          '<button type="button" role="radio" data-plan="once" aria-checked="' + (st.plan === 'once') + '" class="opt' + (st.plan === 'once' ? ' on' : '') + '"><span class="rad" aria-hidden="true"></span><span><span class="t">One-time purchase</span><span class="s">' + (list === null ? '—' : idr(list) + ' · ships once') + '</span></span></button>' +
          '<button type="button" role="radio" data-plan="sub" aria-checked="' + (st.plan === 'sub') + '" class="opt' + (st.plan === 'sub' ? ' on' : '') + '"><span class="rad" aria-hidden="true"></span><span><span class="t">Subscribe &amp; Save <span class="chip">Save up to ' + maxPct + '%</span></span><span class="s">Save ' + idr(st.plan === 'sub' ? saving : best) + ' every delivery · cancel or skip anytime</span></span></button></div>';
        if (st.plan === 'sub') h += '<div class="freq-box"><span class="lab" id="freq-label">Delivery frequency</span><div class="freq" role="radiogroup" aria-labelledby="freq-label">' + tiers.map(function (x) { return '<button type="button" role="radio" data-days="' + x.days + '" aria-checked="' + (x.days === tier.days) + '" class="' + (x.days === tier.days ? 'on' : '') + '"><span class="e">Every ' + x.days + ' days</span><span class="sv">Save ' + x.pct + '%</span></button>'; }).join('') + '</div>' +
          '<p class="freq-dates">First delivery once the quote is paid. Then a fresh quote every ' + tier.days + ' days: if paid today, around <b>' + fmtDate(plusDays(tier.days)) + '</b> and <b>' + fmtDate(plusDays(tier.days * 2)) + '</b>. Skip, pause or cancel from your account.</p></div>';
      } else h += '<p class="note" style="margin-bottom:6px">Devices and merch ship once.</p>';
      if (!out) h += '<div class="buy-foot"><span class="qty" aria-label="Quantity"><button type="button" data-q="-1" aria-label="−">' + icon('minus') + '</button><span class="tnum">' + st.qty + '</span><button type="button" data-q="1" aria-label="+">' + icon('plus') + '</button></span>' +
        '<button type="submit" class="btn btn-solid"' + (st.added === key() ? ' data-added="1"' : '') + '>' + (st.added === key() ? icon('check') + ' Added to the basket' : 'Add to basket') + '</button></div>' + how;
      form.innerHTML = h;
    }
    function key() { return st.sku + '|' + st.plan + '|' + st.days + '|' + st.qty; }
    form.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.type === 'submit') return;
      if (b.hasAttribute('data-notify-send')) {
        var c = form.querySelector('#nb-contact'), er = form.querySelector('#nb-err'), val = c.value.trim(), w = val.replace(/[\s.-]/g, '');
        var good = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || /^(\+?62|0)8\d{7,12}$/.test(w);
        if (!good) { er.hidden = false; c.setAttribute('aria-invalid', 'true'); c.focus(); return; }
        var list = load('axiom-design-notices', []); list.push(st.sku); save('axiom-design-notices', list); draw(); return;
      }
      if (b.dataset.sku) { if (b.getAttribute('aria-disabled') === 'true') return; st.sku = b.dataset.sku; }
      else if (b.dataset.plan) st.plan = b.dataset.plan;
      else if (b.dataset.days) st.days = +b.dataset.days;
      else if (b.dataset.q) st.qty = Math.max(1, Math.min(99, st.qty + (+b.dataset.q)));
      else return;
      draw();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      added(st.sku, st.qty, st.plan === 'sub' && canPlan ? st.days : null);
      st.added = key(); draw();
    });
    draw();
    // one strip over the product body: About · Handling · Certificates · Research guide (the guide stays its own page)
    var body = main.querySelector('.prod-body'); if (!body || body.querySelector('.prod-tabs')) return;
    var secs = Array.prototype.slice.call(body.querySelectorAll('.prod-sec[id]')), guide = body.querySelector('a[href*="/compounds/"]');
    var tabs = document.createElement('nav'); tabs.className = 'prod-tabs'; tabs.setAttribute('aria-label', 'On this page');
    tabs.innerHTML = secs.map(function (s) { return '<a href="#' + s.id + '" data-sec="' + s.id + '">' + esc(s.querySelector('h2').textContent.replace('Certificates of Analysis', 'Certificates')) + (s.id === 'coa' ? ' <span class="n">' + (p.coa ? p.coa.length : 0) + '</span>' : '') + '</a>'; }).join('') + (guide ? '<a href="' + guide.getAttribute('href') + '">Research guide ' + icon('arrow').replace('ic-sv', 'ic-sv ar') + '</a>' : '');
    body.insertBefore(tabs, body.firstChild);
    tabs.addEventListener('click', function (e) { var a = e.target.closest('a[data-sec]'); if (!a) return; e.preventDefault(); var s = document.getElementById(a.dataset.sec); if (s) { s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); s.querySelector('h2').setAttribute('tabindex', '-1'); s.querySelector('h2').focus({ preventScroll: true }); } });
    if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) tabs.querySelectorAll('a[data-sec]').forEach(function (a) { a.classList.toggle('on', a.dataset.sec === en.target.id); }); }); }, { rootMargin: '-40% 0px -55% 0px' }); secs.forEach(function (s) { io.observe(s); }); }
  }

  // ---------- certificates ----------
  function coasPage(q) {
    var form = main.querySelector('form.coa-search'), input = main.querySelector('#coa-q'); if (!form) return;
    form.dataset.demo = '1';
    var cards = Array.prototype.slice.call(main.querySelectorAll('.coa-card')), total = cards.length;
    var needle = (q.q || '').trim().toLowerCase(); if (input) input.value = q.q || '';
    var shown = 0; cards.forEach(function (c) { var hit = !needle || c.textContent.toLowerCase().indexOf(needle) >= 0; c.hidden = !hit; if (hit) shown++; });
    var cnt = main.querySelector('.coa-count'); if (cnt && needle) cnt.textContent = cnt.textContent.replace(/ · (Showing|Menampilkan).*$/, '') + ' · Showing ' + shown;
    form.addEventListener('submit', function (e) { e.preventDefault(); go('#/coas' + query({ q: input.value })); });
    var clear = form.querySelector('a[href="#/coas"]'); if (clear) clear.addEventListener('click', function () { if (input) input.value = ''; });
    copyButtons();
  }
  function coaPage() {
    main.querySelectorAll('a[href*="/api/"], a[href$=".pdf"], a.btn.btn-solid[href*="documents"]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); toast('The PDF is printed by the live server. The certificate above is the same document on screen.'); }); });
    copyButtons();
  }
  function copyButtons() {
    main.querySelectorAll('button.copy').forEach(function (b) {
      b.addEventListener('click', function () {
        var card = b.closest('.coa-card') || b.closest('.field') || b.parentNode; var lot = (card && card.dataset && card.dataset.lot) || (b.previousSibling && b.previousSibling.textContent) || '';
        var done = function () { b.innerHTML = icon('check'); setTimeout(function () { b.innerHTML = icon('share'); }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(lot).then(done, done); else done();
      });
    });
  }

  // ---------- the request (basket) ----------
  function requestPage() {
    var band = main.querySelector('section.band .wrap'); if (!band) return;
    if (!basket.length) return; // the captured empty state stays
    var tiers = DATA.tiers, anyPlan = basket.some(function (l) { return l.plan; }), anyPeptide = basket.some(function (l) { return bySku[l.sku] && bySku[l.sku].p.kind === 'peptide'; });
    var lines = basket.map(function (l) {
      var r = bySku[l.sku]; if (!r) return '';
      var tier = l.plan ? tiers.find(function (t) { return t.days === l.plan; }) : null;
      var list = r.v.price_idr, net = tier ? planNet(list, tier.pct) : list;
      var id = 'plan-' + l.sku + '-' + (l.plan || 0);
      return '<div class="req-line" data-plan="' + (l.plan || '') + '" data-sku="' + l.sku + '"><div><div class="nm">' + esc(r.p.name) + '</div><div class="sub">' + esc(r.v.dose) + ' · ' + esc(r.v.content) + ' · ' + idr(net) + '</div>' +
        (tier ? '<div class="plan">Every ' + tier.days + ' days · ' + tier.pct + '% off<span class="was">List ' + idr(list) + '</span></div>' : '') +
        (r.p.kind === 'peptide' && tiers.length ? '<form class="field planfield" data-demo="1"><label for="' + id + '">Plan</label><select id="' + id + '" data-plansel>' + '<option value=""' + (!l.plan ? ' selected' : '') + '>One-time</option>' + tiers.map(function (t) { return '<option value="' + t.days + '"' + (l.plan === t.days ? ' selected' : '') + '>Every ' + t.days + ' days · ' + t.pct + '% off</option>'; }).join('') + '</select></form>' : '') +
        '</div><div class="ctl"><span class="qty"><button type="button" data-d="-1" aria-label="One fewer">' + icon('minus') + '</button><span class="tnum">' + l.qty + '</span><button type="button" data-d="1" aria-label="One more">' + icon('plus') + '</button></span><span class="amt">' + idr(net * l.qty) + '</span><button type="button" class="link-x" data-remove>Remove</button></div></div>';
    }).join('');
    var goods = basket.reduce(function (a, l) { var r = bySku[l.sku]; if (!r) return a; var tier = l.plan ? tiers.find(function (t) { return t.days === l.plan; }) : null; return a + (tier ? planNet(r.v.price_idr, tier.pct) : r.v.price_idr) * l.qty; }, 0);
    var units = basketCount(), delivery = Math.min(DATA.delivery.cap, Math.ceil(units / 3) * DATA.delivery.per);
    band.innerHTML = flow(1) + '<div class="req-grid"><div><span class="kicker">Lines</span>' + (anyPlan ? '<p class="note" style="margin-top:12px">Lines on a plan are quoted at the plan price and start a subscription once the first delivery is paid.</p>' : '') + '<div style="margin-top:18px;border-top:1px solid var(--line)">' + lines + '</div></div>' +
      '<aside class="req-side"><div class="kv"><span class="k">Goods</span><span class="v">' + idr(goods) + '</span></div><div class="sp-24"></div><span class="kicker">Delivery</span><p class="note" style="margin-top:12px">Charged per consignment: ' + idr(DATA.delivery.per) + ' per three units per destination, capped at ' + idr(DATA.delivery.cap) + ' per destination. Choose the destinations and the split is shown here before you submit.</p><p class="cutoff-line" style="margin-top:10px">' + icon('clock') + ' Paid by ' + DATA.cutoff.cold + ' WIB on a working day ships the same day, cold chain.</p>' +
      '<div style="margin-top:16px"><div class="kv"><span class="k">Primary destination · ' + units + (units === 1 ? ' unit' : ' units') + '</span><span class="v">' + idr(delivery) + '</span></div><div class="kv"><span class="k">Delivery total</span><span class="v">' + idr(delivery) + '</span></div></div><div class="sp-44"></div>' +
      '<form data-demo="1" id="lead-form" novalidate><span class="kicker">Who is asking</span><p class="note" style="margin:14px 0 26px">AXIOM answers this request with a priced quote within ' + DATA.sla + '. Signed out, the same form opens an account record for you.</p><div class="f2">' +
      '<div class="field"><label for="rq-name">Name <span class="req">*</span></label><input id="rq-name" name="name" required autocomplete="name" aria-describedby="rq-name-err"><span class="err" id="rq-name-err" hidden>Your name is needed on the quote.</span></div>' +
      '<div class="field"><label for="rq-clinic">Clinic or institution</label><input id="rq-clinic" name="clinic" autocomplete="organization"></div>' +
      '<div class="field"><label for="rq-role">Role</label><input id="rq-role" name="role"></div>' +
      '<div class="field"><label for="rq-email">Email <span class="req" title="Email or WhatsApp">*</span></label><input id="rq-email" name="email" type="email" autocomplete="email" aria-describedby="rq-email-err rq-contact-hint"><span class="err" id="rq-email-err" hidden></span></div>' +
      '<div class="field"><label for="rq-wa">WhatsApp <span class="req" title="Email or WhatsApp">*</span></label><input id="rq-wa" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel" placeholder="08xx or +62" aria-describedby="rq-wa-err rq-contact-hint"><span class="err" id="rq-wa-err" hidden></span></div></div>' +
      '<p class="note" id="rq-contact-hint" style="margin-top:18px">One of email or WhatsApp is enough. The quote goes to whichever you give.</p>' +
      (anyPeptide ? '<label class="check" for="rq-ack"><input id="rq-ack" type="checkbox" name="ack" value="1" required aria-describedby="rq-ack-err"><span><b>The material is for in-vitro laboratory research. I am a qualified researcher or buying for an institution, and I am eighteen or older.</b><span class="err" id="rq-ack-err" hidden style="display:block;margin-top:6px">Tick the declaration: the basket holds a research compound.</span></span></label><p class="note" style="margin-top:10px">Required for a research compound. AXIOM records the formal acknowledgement before it sends the quote.</p>' : '') +
      '<div class="acts" style="margin-top:30px"><button type="submit" class="btn btn-solid">Request a quote ' + icon('arrow') + '</button><a class="tlink" href="#/sign-in">Already have an account? Sign in</a></div>' +
      '<p class="note" style="margin-top:22px">Your details are held under the privacy notice and used to answer this request. This demo sends nothing.</p></form>' +
      '<div class="sp-24"></div><div class="ruo">Research Use Only. Intended exclusively for in-vitro laboratory research — not for human or veterinary consumption, diagnosis, or treatment. No dosing or usage guidance is provided.</div>' +
      '<p style="margin-top:18px"><a class="tlink" href="https://wa.me/' + DATA.whatsapp + '">Continue on WhatsApp ' + icon('arrow').replace('ic-sv', 'ic-sv ar') + '</a></p></aside></div>';
    band.addEventListener('click', function (e) {
      var line = e.target.closest('.req-line'); if (!line) return;
      var sku = line.dataset.sku, plan = line.dataset.plan ? +line.dataset.plan : null;
      var cur = basket.find(function (l) { return l.sku === sku && (l.plan || null) === plan; }); if (!cur) return;
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.d) { setLine(sku, cur.qty + (+b.dataset.d), plan); requestPage(); }
      if (b.hasAttribute('data-remove')) { setLine(sku, 0, plan); if (!basket.length) go('#/request'); else requestPage(); }
    });
    band.querySelectorAll('select[data-plansel]').forEach(function (s) {
      s.addEventListener('change', function () {
        var line = s.closest('.req-line'), sku = line.dataset.sku, from = line.dataset.plan ? +line.dataset.plan : null, to = s.value ? +s.value : null;
        var i = basket.findIndex(function (l) { return l.sku === sku && (l.plan || null) === from; }); if (i < 0) return;
        var dup = basket.findIndex(function (l, j) { return j !== i && l.sku === sku && (l.plan || null) === to; });
        if (dup >= 0) { basket[dup].qty += basket[i].qty; basket.splice(i, 1); } else basket[i].plan = to;
        save('axiom-design-basket', basket); badges(); requestPage();
      });
    });
    var lead = band.querySelector('#lead-form');
    // one message per field, shown as soon as the field is left and again on submit
    function check(id, msg) { var f = lead.querySelector('#' + id), e = lead.querySelector('#' + id + '-err'); if (!f || !e) return true; e.hidden = !msg; if (msg) e.textContent = msg; f.setAttribute('aria-invalid', msg ? 'true' : 'false'); return !msg; }
    function validate(all) {
      var name = lead.querySelector('#rq-name').value.trim(), email = lead.querySelector('#rq-email').value.trim(), wa = lead.querySelector('#rq-wa').value.trim().replace(/[\s.-]/g, ''), ack = lead.querySelector('#rq-ack');
      var ok = true, first = null;
      var f = function (id, msg) { if (!all && !msg) { var er = lead.querySelector('#' + id + '-err'); if (er && !er.hidden) return; } if (!check(id, msg) && ok) { ok = false; first = id; } };
      f('rq-name', name ? '' : 'Your name is needed on the quote.');
      f('rq-email', email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'That does not look like an email address.' : !email && !wa && all ? 'Give an email or a WhatsApp number.' : '');
      f('rq-wa', wa && !/^(\+?62|0)8\d{7,12}$/.test(wa) ? 'An Indonesian mobile number: 08xx or +62 8xx.' : !email && !wa && all ? 'Give an email or a WhatsApp number.' : '');
      if (ack) f('rq-ack', ack.checked ? '' : all ? 'Tick the declaration: the basket holds a research compound.' : '');
      return { ok: ok, first: first };
    }
    // a message appears when a field is left and goes away as it is corrected, never on leaving a field
    lead.addEventListener('focusout', function (e) { if (e.target.matches('input')) validate(false); });
    lead.addEventListener('input', function (e) { var id = e.target.id; if (!id) return; var f = lead.querySelector('#' + id), er = lead.querySelector('#' + id + '-err'); if (!er) return; var was = !er.hidden; if (!was) return; var ok = validateField(id); if (ok) { er.hidden = true; f.setAttribute('aria-invalid', 'false'); } });
    function validateField(id) {
      var v = lead.querySelector('#' + id).value.trim();
      if (id === 'rq-name') return !!v;
      if (id === 'rq-email') return v ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : !!lead.querySelector('#rq-wa').value.trim();
      if (id === 'rq-wa') { var w = v.replace(/[\s.-]/g, ''); return w ? /^(\+?62|0)8\d{7,12}$/.test(w) : !!lead.querySelector('#rq-email').value.trim(); }
      return true;
    }
    lead.addEventListener('change', function (e) { if (e.target.id === 'rq-ack') check('rq-ack', e.target.checked ? '' : 'Tick the declaration: the basket holds a research compound.'); });
    lead.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = validate(true);
      if (!r.ok) { lead.querySelector('#' + r.first).focus(); return; }
      var d = new Date(), ref = 'AX-' + String(d.getFullYear()).slice(2) + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      save('axiom-design-last', { ref: ref, at: d.toISOString(), name: lead.querySelector('#rq-name').value.trim(), email: lead.querySelector('#rq-email').value.trim(), wa: lead.querySelector('#rq-wa').value.trim(), lines: basket.map(function (l) { return { sku: l.sku, qty: l.qty, plan: l.plan, net: lineNet(l) }; }), goods: goodsTotal() });
      basket = []; save('axiom-design-basket', basket); badges(); go('#/request/sent');
    });
    if (!main.querySelector('.req-line').dataset.revealed) main.querySelectorAll('.req-line').forEach(function (l) { l.dataset.revealed = '1'; });
  }
  function sentPage() {
    var last = load('axiom-design-last', null);
    if (!last) return '<section class="page-hero"><div class="wrap"><div class="crumbs"><span><a href="#/">Home</a></span><span>Basket</span></div><span class="kicker">Basket</span><h1 style="margin-top:14px">Nothing to confirm yet.</h1><p class="lead">Add lots to the basket and request a quote; the confirmation appears here.</p><div class="acts" style="margin-top:32px"><a class="btn btn-solid" href="#/products">Open the shop</a></div></div></section>';
    var to = [last.email, last.wa].filter(Boolean).join(' and ');
    var anyPlan = last.lines.some(function (l) { return l.plan; });
    var wa = 'https://wa.me/' + DATA.whatsapp + '?text=' + encodeURIComponent('Hello AXIOM, I sent request ' + last.ref + '. Please confirm the quote and the payment details.');
    return '<section class="page-hero"><div class="wrap"><div class="crumbs"><span><a href="#/">Home</a></span><span>Basket</span></div><span class="kicker">Request received</span><h1 style="margin-top:14px">Thank you, ' + esc(last.name) + '.</h1>' +
      '<p class="lead">Your reference is <b class="mono-n ref">' + last.ref + '</b>. Continue on WhatsApp: the team confirms the lines and the delivery address, sends the quote there and takes payment by bank transfer. Answered within ' + DATA.sla + '; nothing is charged until you confirm in the chat.</p>' +
      '<div class="ref-acts"><a class="btn btn-solid" href="' + wa + '" data-wa-go>' + icon('wa') + ' Continue on WhatsApp</a><button type="button" class="btn btn-sm" data-copy-ref="' + last.ref + '">' + icon('share') + ' Copy the reference</button><button type="button" class="btn btn-sm" onclick="window.print()">' + icon('print') + ' Save a copy</button></div>' +
      '</div></section><section class="band" style="border-top:none"><div class="wrap" style="padding-top:0">' + flow(2) +
      '<div class="req-grid" style="margin-top:44px"><div><span class="kicker">What you asked for</span><div style="margin-top:18px;border-top:1px solid var(--line)">' + last.lines.map(function (l) { var r = bySku[l.sku]; if (!r) return ''; var tier = l.plan ? DATA.tiers.find(function (t) { return t.days === l.plan; }) : null; return '<div class="req-line"><div><div class="nm">' + esc(r.p.name) + '</div><div class="sub">' + esc(r.v.dose) + ' · ' + esc(r.v.content) + (tier ? ' · every ' + tier.days + ' days · ' + tier.pct + '% off' : ' · one-time') + '</div></div><div class="ctl"><span class="sub">' + l.qty + ' ×</span><span class="amt">' + idr(l.net * l.qty) + '</span></div></div>'; }).join('') + '</div>' +
      '<div class="kv" style="margin-top:8px"><span class="k">Goods</span><span class="v">' + idr(last.goods) + '</span></div></div>' +
      '<aside class="req-side"><span class="kicker">What happens next</span><ol class="next">' +
      '<li><span><b>WhatsApp.</b> Open the chat with your reference. The team confirms the lots, the quantities and where they ship.</span></li>' +
      '<li><span><b>The quote.</b> Itemised with PPN ' + DATA.ppn + '% and delivery, sent in the chat, valid seven days.' + (last.lines.some(function (l) { return bySku[l.sku] && bySku[l.sku].p.kind === 'peptide'; }) ? ' For a research compound the research-use acknowledgement is recorded first.' : '') + '</span></li>' +
      '<li><span><b>Payment.</b> Bank transfer to the account named on the quote. Send the proof in the chat; nothing is charged automatically.</span></li>' +
      '<li><span><b>Dispatch.</b> Paid by ' + DATA.cutoff.cold + ' WIB on a working day ships the same day, cold chain from Jakarta, ' + DATA.delivery.eta + ' days in ' + DATA.delivery.zone + ', tracked to the door.' + (anyPlan ? ' Plan lines repeat with a fresh quote each period; skip, pause or cancel any time.' : '') + '</span></li></ol>' +
      '<p class="note" style="margin-top:22px">Demo: nothing was sent and no account was created. On the live site this request enters AXIOM\'s pipeline and the confirmation email carries the same reference.</p>' +
      '<div class="acts" style="margin-top:28px"><a class="btn btn-solid" href="#/products">Back to the shop</a><a class="tlink" href="#/sign-in">Open an account to track it ' + icon('arrow').replace('ic-sv', 'ic-sv ar') + '</a></div></aside></div></div></section>';
  }
  function signInPage() {
    main.querySelectorAll('form').forEach(function (f) { f.dataset.demo = '1'; f.addEventListener('submit', function (e) { e.preventDefault(); toast('Account and Console run on the live server. This demo covers the public storefront.'); }); });
  }

  // ---------- go ----------
  badges(); magnetic(); render();
})();
