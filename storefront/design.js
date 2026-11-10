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
    if (path.indexOf(target) === 0) a.setAttribute('aria-current', 'page');
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

// Mobile order bar: mirrors the product's chosen size while the order box is out of view, and orders through
// the box's own WhatsApp link so the size and the message stay in one place.
(function () {
  var disposeBar = function () {};
  window.addEventListener('axiom:route', function () {
    disposeBar();
    var main = document.querySelector('#main');
    var buy = main.querySelector('.buy');
    if (!buy) return;
    var bar = document.createElement('div');
    bar.className = 'buy-bar is-off';
    bar.innerHTML = '<div class="bb-info"><span class="bb-size"></span><span class="bb-name"></span></div><a class="bb-add" target="_blank" rel="noopener">Order on WhatsApp</a>';
    main.appendChild(bar);
    var size = bar.querySelector('.bb-size'), name = bar.querySelector('.bb-name'), order = bar.querySelector('.bb-add');
    var heading = main.querySelector('.prod-head h1');
    var phone = window.matchMedia('(max-width: 700px)');
    var boxVisible = true;
    function sync() {
      var chosen = buy.querySelector('.size.on .d'), link = buy.querySelector('[data-order]');
      size.textContent = chosen ? chosen.textContent : '';
      name.textContent = heading ? heading.textContent.trim() : '';
      if (link) order.href = link.href;
      var show = phone.matches && !boxVisible && !!link;
      bar.classList.toggle('is-off', !show);
      bar.setAttribute('aria-hidden', String(!show));
      order.tabIndex = show ? 0 : -1;
      document.body.classList.toggle('has-buy-bar', phone.matches);
    }
    // The bar steps aside while at least half of the real size choices or the order button is on screen.
    var watched = [];
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { entry.target.__inView = entry.intersectionRatio >= 0.5; });
      boxVisible = watched.some(function (el) { return el.__inView; });
      sync();
    }, {threshold:[0, 0.5, 1]});
    function watch() {
      watched.forEach(function (el) { observer.unobserve(el); });
      watched = [buy.querySelector('.sizes'), buy.querySelector('.buy-foot')].filter(Boolean);
      watched.forEach(function (el) { observer.observe(el); });
    }
    // app.js re-renders the order box when the size changes.
    var mutations = new MutationObserver(function () { watch(); sync(); });
    mutations.observe(buy, {childList:true, subtree:true, characterData:true});
    phone.addEventListener('change', sync);
    watch();
    sync();
    disposeBar = function () {
      observer.disconnect();
      mutations.disconnect();
      phone.removeEventListener('change', sync);
      document.body.classList.remove('has-buy-bar');
    };
  });
})();
