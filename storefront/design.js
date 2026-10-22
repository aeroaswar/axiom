// Asset paths resolve to embedded copies in the self-contained package (package.py sets window.__ASSET).
function asset(path) { return (window.__ASSET || {})[path] || path; }

// Keep page titles, active navigation and keyboard navigation in sync with routing.
document.addEventListener('click', function (event) {
  var link = event.target.closest('a[href="#catalog"],a[href="#main"]');
  if (!link) return;
  var target = document.querySelector(link.getAttribute('href'));
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  target.setAttribute('tabindex','-1');
  target.focus({preventScroll:true});
});
window.addEventListener('axiom:route', function (event) {
  var path = event.detail.path;
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    var target = a.getAttribute('href').slice(1);
    if (target !== 'lang' && path.indexOf(target) === 0) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  var title = document.querySelector('#main h1');
  document.title = (path === '/' ? 'Built for better research.' : title ? title.textContent.trim() : 'The AXIOM standard') + ' — AXIOM';
  document.querySelector('#main').dataset.view = event.detail.key;
  if (event.detail.key !== 'home') {
    var main = document.querySelector('#main');
    var stoneEnd = document.createElement('section');
    stoneEnd.className = 'stone-page-end';
    stoneEnd.setAttribute('aria-label', 'The AXIOM standard');
    stoneEnd.innerHTML = '<img src="' + asset('assets/stone-dark.webp') + '" alt="" loading="lazy"><div class="wrap"><p class="ed-label">The AXIOM standard</p><h2>Considered. <br>In every detail.</h2><a class="ed-text-link" href="#/standard">Explore our standard <svg class="ic-sv" aria-hidden="true"><use href="#i-arrow"></use></svg></a></div>';
    main.appendChild(stoneEnd);
  }
  if (event.detail.key === 'home') {
    document.querySelectorAll('[data-home-filter]').forEach(function (button) {
      button.addEventListener('click',function () {
        var category=button.dataset.homeFilter;
        var cards=Array.from(document.querySelectorAll('[data-home-card]'));
        var matches=cards.filter(function(card){return category==='all'||card.dataset.pathway===category;});
        var visible=matches.slice(0,4);
        cards.forEach(function(card){card.hidden=visible.indexOf(card)===-1;});
        document.querySelectorAll('[data-home-filter]').forEach(function(tab){tab.setAttribute('aria-pressed',String(tab===button));});
        document.querySelector('.ed-filter-count').textContent='Showing '+visible.length+' of '+matches.length;
        var link=document.querySelector('[data-home-view-all]');
        link.href='#/products?kind=peptide'+(category==='all'?'':'&pathway='+encodeURIComponent(category));
        link.innerHTML='View all '+matches.length+' compounds <svg class="ic-sv" aria-hidden="true"><use href="#i-arrow"></use></svg>';
      });
    });
    document.querySelectorAll('[data-supply-days]').forEach(function(button){
      button.addEventListener('click',function(){
        var days=Number(button.dataset.supplyDays),pct={30:15,60:12,90:10}[days];
        document.querySelectorAll('[data-supply-days]').forEach(function(other){other.setAttribute('aria-pressed',String(other===button));});
        document.querySelector('.ed-supply-note').textContent='Every '+days+' days · save '+pct+'%. Choose this interval when adding a compound to your basket.';
      });
    });
  }
});

// One event-driven animation loop per mounted homepage. No idle floating or scroll locking.
(function () {
  var disposeHero = function () {};
  window.addEventListener('axiom:route', function () {
    disposeHero();
    var art = document.querySelector('.hero-motion');
    if (!art) return;
    var hero = art.closest('.ed-hero');
    var pens = Array.from(art.querySelectorAll('.hero-pen'));
    var light = art.querySelector('.hero-cursor-light');
    var still = art.querySelector('.hero-still');
    var ground = art.querySelector('.hero-ground');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    var mobile = window.matchMedia('(max-width: 700px)');
    var controller = new AbortController();
    var options = {passive:true, signal:controller.signal};
    var frame = 0, lastTime = 0, alive = true, ready = false, visible = false;
    var rect, heroTop = 0, heroHeight = 1;
    var target = {x:0,y:0,scroll:0,light:0};
    var current = {x:0,y:0,scroll:0,light:0};
    function clamp(value, min, max) { return Math.max(min, Math.min(max,value)); }
    function measure() {
      rect = art.getBoundingClientRect();
      var bounds = hero.getBoundingClientRect();
      heroTop = bounds.top + window.scrollY;
      heroHeight = bounds.height;
      updateScroll();
    }
    function updateScroll() {
      target.scroll = clamp((window.scrollY-heroTop)/heroHeight,0,1);
      requestFrame();
    }
    function paint() {
      // Convert CSS-pixel movement to the SVG's photography coordinates.
      var unit = 1536 / Math.max(rect.width,1);
      var travel = mobile.matches ? 32 : 72;
      pens.forEach(function (pen) {
        var depth = Number(pen.dataset.depth);
        var x = current.x * 18 * depth * unit;
        var y = (current.y * 10 * depth - current.scroll * travel * depth) * unit;
        var tilt = current.x * 1.1 * depth;
        pen.style.transform = 'translate('+x.toFixed(3)+'px,'+y.toFixed(3)+'px) rotate('+tilt.toFixed(3)+'deg)';
      });
      light.style.transform = 'translate('+(current.x*14)+'%,'+(current.y*10)+'%)';
      light.style.opacity = (current.light*.65).toFixed(3);
    }
    function tick(time) {
      frame = 0;
      if (!alive || !ready || !visible || reduced.matches || document.hidden) return;
      var dt = lastTime ? Math.min(time-lastTime,64) : 16;
      lastTime = time;
      var ease = 1-Math.exp(-dt/110);
      var moving = false;
      Object.keys(current).forEach(function (key) {
        current[key] += (target[key]-current[key])*ease;
        if (Math.abs(target[key]-current[key]) > .0005) moving = true;
        else current[key] = target[key];
      });
      paint();
      if (moving) frame = requestAnimationFrame(tick);
      else lastTime = 0;
    }
    function requestFrame() {
      if (alive && ready && visible && !reduced.matches && !document.hidden && !frame) frame = requestAnimationFrame(tick);
    }
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    }
    function leave() {
      target.x = target.y = target.light = 0;
      requestFrame();
    }
    function preferenceChanged() {
      stop();
      target.x = target.y = target.light = 0;
      Object.keys(current).forEach(function(key){ current[key] = 0; });
      pens.forEach(function(pen){ pen.style.removeProperty('transform'); });
      light.style.opacity = '0';
      art.classList.toggle('is-motion-ready',ready && !reduced.matches);
      art.classList.toggle('is-motion-active',ready && visible && !reduced.matches);
      measure();
    }
    art.addEventListener('pointermove',function (event) {
      if (!finePointer.matches || reduced.matches || event.pointerType === 'touch') return;
      // Read on interaction so coordinates remain correct while the page scrolls.
      var bounds = art.getBoundingClientRect();
      target.x = clamp((event.clientX-bounds.left)/bounds.width*2-1,-1,1);
      target.y = clamp((event.clientY-bounds.top)/bounds.height*2-1,-1,1);
      target.light = 1;
      requestFrame();
    },options);
    art.addEventListener('pointerleave',leave,options);
    art.addEventListener('pointercancel',leave,options);
    window.addEventListener('blur',leave,options);
    window.addEventListener('scroll',updateScroll,options);
    window.addEventListener('resize',measure,options);
    reduced.addEventListener('change',preferenceChanged,options);
    finePointer.addEventListener('change',preferenceChanged,options);
    document.addEventListener('visibilitychange',function(){
      if (document.hidden) { leave(); stop(); }
      else { measure(); requestFrame(); }
    },options);
    var observer = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      art.classList.toggle('is-motion-active',ready && visible && !reduced.matches);
      if (visible) { measure(); requestFrame(); }
      else { leave(); stop(); }
    });
    observer.observe(art);
    measure();
    // Keep the complete original visible if either image fails to decode.
    Promise.all([still.decode(),ground.decode()]).then(function () {
      if (!alive) return;
      ready = true;
      current.scroll = target.scroll;
      paint();
      art.classList.toggle('is-motion-ready',!reduced.matches);
      art.classList.toggle('is-motion-active',visible && !reduced.matches);
      requestFrame();
    }).catch(function () { /* The static hero is the fallback. */ });
    disposeHero = function () {
      alive = false;
      stop();
      controller.abort();
      observer.disconnect();
    };
  });
})();

// Bahasa Indonesia. Rendered text is translated in place, so every template and app message is covered
// without editing the source pages; switching back restores the exact English nodes. The dictionary
// (i18n-id.js) loads only when Indonesian is chosen.
(function () {
  var dict = null, patterns = [];
  var ATTRS = ['placeholder','aria-label','title','alt'];
  var SKIP = 'script,style,svg,textarea,[translate="no"]';
  var BLOCKS = 'h1,h2';
  var texts = new Map(), attrs = new Map(), blocks = new Map();
  var lang = initialLanguage(), englishTitle = document.title;
  function initialLanguage() {
    try { return localStorage.getItem('axiom-design-lang') === 'id' ? 'id' : 'en'; } catch (e) { return 'en'; }
  }
  function withDictionary(ready, failed) {
    function use() {
      dict = window.__I18N_ID;
      patterns = dict.patterns.map(function (p) { return [new RegExp(p[0]), p[1]]; });
      ready();
    }
    if (window.__I18N_ID) { use(); return; }
    // The early check in <head> may already be fetching it for a saved choice.
    var script = document.getElementById('i18n-id');
    if (!script) {
      script = document.createElement('script');
      script.id = 'i18n-id';
      script.src = 'i18n-id.js?v=' + window.__I18N_VERSION;
      document.head.appendChild(script);
    }
    script.addEventListener('load', use);
    script.addEventListener('error', function () { script.remove(); failed(); });
  }
  function normal(value) { return value.replace(/\s+/g,' ').trim(); }
  function lookup(value) {
    var key = normal(value);
    if (!dict || !key || !/[A-Za-z]/.test(key)) return null;
    var hit = dict.text[key];
    for (var i = 0; hit === undefined && i < patterns.length; i++) {
      if (patterns[i][0].test(key)) hit = key.replace(patterns[i][0], function () {
        var groups = Array.prototype.slice.call(arguments, 1, -2);
        return patterns[i][1].replace(/\$(\d)/g, function (_, n) { var g = groups[n-1]; return dict.text[g] || g; });
      });
    }
    if (hit === undefined) return null;
    return value.match(/^\s*/)[0] + hit + value.match(/\s*$/)[0];
  }
  function translateBlocks(root) {
    var list = root.matches && root.matches(BLOCKS) ? [root] : [];
    if (root.querySelectorAll) list = list.concat(Array.from(root.querySelectorAll(BLOCKS)));
    list.forEach(function (el) {
      var hit = dict.html[normal(el.textContent)];
      if (hit === undefined || el.closest(SKIP)) return;
      var english = el.innerHTML;
      el.innerHTML = hit;
      blocks.set(el, {en:english, id:el.innerHTML});
    });
  }
  function translateText(node) {
    var record = texts.get(node);
    if (record && node.nodeValue === record.id) return;
    if (!node.parentElement || node.parentElement.closest(SKIP)) return;
    var hit = lookup(node.nodeValue);
    if (hit === null || hit === node.nodeValue) return;
    texts.set(node, {en:node.nodeValue, id:hit});
    node.nodeValue = hit;
  }
  function translateAttributes(el) {
    if (el.closest(SKIP)) return;
    ATTRS.forEach(function (name) {
      var value = el.getAttribute(name), saved = attrs.get(el) || {};
      if (!value || (saved[name] && saved[name].id === value)) return;
      var hit = lookup(value);
      if (hit === null || hit === value) return;
      saved[name] = {en:value, id:hit};
      attrs.set(el, saved);
      el.setAttribute(name, hit);
    });
  }
  function translate(root) {
    if (lang !== 'id' || !dict || !root) return;
    if (root.nodeType === Node.TEXT_NODE) { translateText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    translateBlocks(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), node;
    while ((node = walker.nextNode())) translateText(node);
    translateAttributes(root);
    root.querySelectorAll('[' + ATTRS.join('],[') + ']').forEach(translateAttributes);
  }
  function restore() {
    texts.forEach(function (record, node) { if (node.nodeValue === record.id) node.nodeValue = record.en; });
    attrs.forEach(function (saved, el) {
      Object.keys(saved).forEach(function (name) { if (el.getAttribute(name) === saved[name].id) el.setAttribute(name, saved[name].en); });
    });
    blocks.forEach(function (record, el) { if (el.innerHTML === record.id) el.innerHTML = record.en; });
    texts.clear(); attrs.clear(); blocks.clear();
  }
  function prune(map) { map.forEach(function (_, node) { if (!node.isConnected) map.delete(node); }); }
  function syncTitle() { document.title = lang === 'id' ? (lookup(englishTitle.replace(/ — AXIOM$/, '')) || englishTitle.replace(/ — AXIOM$/, '')).trim() + ' — AXIOM' : englishTitle; }
  function show(next) {
    lang = next;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.lang === lang)); });
  }
  function setLanguage(next) {
    show(next === 'id' ? 'id' : 'en');
    try { localStorage.setItem('axiom-design-lang', lang); } catch (e) {}
    if (lang === 'id' && !dict) {
      // Offline or blocked: stay readable in English without overwriting the saved choice.
      withDictionary(function () { if (lang === 'id') setLanguage('id'); }, function () {
        show('en');
        document.documentElement.classList.remove('lang-pending');
      });
      return;
    }
    if (lang === 'id') translate(document.body); else restore();
    document.documentElement.classList.remove('lang-pending');
    syncTitle();
  }
  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-lang]');
    if (button) setLanguage(button.dataset.lang);
  });
  window.addEventListener('axiom:route', function () {
    englishTitle = document.title;
    prune(texts); prune(attrs); prune(blocks);
    translate(document.querySelector('#main'));
    syncTitle();
  });
  // App updates (basket, filters, toasts, form errors) arrive as DOM mutations.
  new MutationObserver(function (mutations) {
    if (lang !== 'id') return;
    mutations.forEach(function (m) {
      if (m.type === 'characterData') translateText(m.target);
      else if (m.type === 'attributes') translateAttributes(m.target);
      else m.addedNodes.forEach(translate);
    });
  }).observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:ATTRS});
  setLanguage(lang);
})();
