/* AXIOM site - shared behaviour for the home page and the price list.
   Theme (light by default), language (English by default, Indonesian by toggle),
   the request basket (shared between pages through localStorage), motion. */
document.documentElement.classList.add('js');
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const idr = n => 'Rp ' + n.toLocaleString('id-ID');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- theme */
const root = document.documentElement;
let theme = (window.AXIOM_LEAD === 'dark') ? 'dark' : 'light';
try { const s = localStorage.getItem('axiom.theme'); if (s === 'dark' || s === 'light') theme = s; } catch {}
root.dataset.theme = theme;
const isLight = () => root.dataset.theme !== 'dark';
$('#themeBtn')?.addEventListener('click', () => {
  theme = isLight() ? 'dark' : 'light'; root.dataset.theme = theme;
  try { localStorage.setItem('axiom.theme', theme); } catch {}
});

/* ---------------- language */
let lang = 'en';
try { const s = localStorage.getItem('axiom.lang'); if (s === 'en' || s === 'id') lang = s; } catch {}
const T_COMMON = {
en: {
  ribbon:'<b>RUO</b> · Research Use Only · in-vitro laboratory research only',
  nav_prices:'Price list', nav_standard:'Standard', nav_process:'Process', nav_faq:'FAQ', nav_request:'Request a quote', theme:'Theme', menu:'Menu',
  tick:['HPLC / MS on every lot','Purity threshold ≥ 98%','A Certificate of Analysis per lot','Held at -20 °C, moved at 2-8 °C','9 research pathways, 79 lots','One price per lot, the same for every account','Research Use Only, in-vitro','Jakarta, delivery across Indonesia'],
  bar_cta:'Continue to the request', bar_n:'{n} lots', bar_one:'1 lot',
  added_toast:'Added: {name} {dose}', removed_toast:'Removed: {name} {dose}',
  live_now:'Now {t} WIB', live_cold:'{left} left for today\'s cold dispatch', live_amb:'{left} left for today\'s ambient dispatch', live_closed:'today\'s cut-off has passed, next working day', live_sun:'Sunday, dispatch resumes Monday', live_h:'h', live_m:'m',
  f_prices:'Price list', f_pdf:'Price list (PDF)', f_request:'Request', f_standard:'Standard', f_process:'Process', f_contact:'Contact', f_hours:'Monday to Saturday, 09.00 to 18.00 WIB',
  boilerplate:'Research peptides under one standard: verified, documented, sourced right. Jakarta.',
  notice_open:'Read the research-use notice',
  ruo_full:'<b>Research Use Only.</b> Intended exclusively for in-vitro laboratory research. Peptides are not drugs, food, cosmetics or supplements, and not for human or veterinary consumption, diagnosis or treatment. No dosing or usage guidance is provided. Peptide commerce requires a recorded acknowledgement: eighteen or older, and a qualified researcher or institutional buyer. Several compounds are controlled in some territories; buyers are solely responsible for confirming the laws that apply to them.',
  documented:'Documented, not promised.',
  wa:{title:'Quote request · AXIOM',name:'Name',org:'Clinic/Institution',role:'Role',email:'Email',lots:'Lots requested',goods:'Goods subtotal',none:'No lots selected; catalogue information requested.',note:'Notes',ack:'Acknowledgement: 18+, qualified researcher / institutional buyer',close:'Research Use Only. In-vitro laboratory research only.'},
},
id: {
  ribbon:'<b>RUO</b> · Hanya untuk riset · riset laboratorium in-vitro saja',
  nav_prices:'Daftar harga', nav_standard:'Standar', nav_process:'Proses', nav_faq:'FAQ', nav_request:'Minta penawaran', theme:'Tema', menu:'Menu',
  tick:['HPLC / MS pada setiap lot','Ambang kemurnian ≥ 98%','Certificate of Analysis per lot','Disimpan -20 °C, dikirim 2-8 °C','9 jalur riset, 79 lot','Satu harga per lot, sama untuk setiap akun','Hanya untuk keperluan riset, in-vitro','Jakarta, pengiriman ke seluruh Indonesia'],
  bar_cta:'Lanjut ke permintaan', bar_n:'{n} lot', bar_one:'1 lot',
  added_toast:'Ditambahkan: {name} {dose}', removed_toast:'Dihapus: {name} {dose}',
  live_now:'Sekarang {t} WIB', live_cold:'pesanan dingin hari ini masih {left}', live_amb:'pesanan ambien hari ini masih {left}', live_closed:'batas hari ini lewat, dikirim hari kerja berikutnya', live_sun:'Minggu, pengiriman dilanjutkan Senin', live_h:'j', live_m:'m',
  f_prices:'Daftar harga', f_pdf:'Daftar harga (PDF)', f_request:'Permintaan', f_standard:'Standar', f_process:'Proses', f_contact:'Kontak', f_hours:'Senin sampai Sabtu, 09.00 sampai 18.00 WIB',
  boilerplate:'Peptida riset di bawah satu standar: terverifikasi, terdokumentasi, bersumber benar. Jakarta.',
  notice_open:'Baca pemberitahuan riset',
  ruo_full:'<b>Hanya untuk keperluan riset.</b> Ditujukan semata-mata untuk riset laboratorium in-vitro. Peptida bukan obat, makanan, kosmetik, atau suplemen, dan bukan untuk konsumsi manusia atau hewan, diagnosis, atau pengobatan. Tidak ada panduan dosis atau penggunaan yang diberikan. Transaksi peptida memerlukan pernyataan pengakuan yang tercatat: berusia 18 tahun ke atas, dan seorang peneliti berkualifikasi atau pembeli institusi. Beberapa senyawa dikendalikan di wilayah tertentu; pembeli sepenuhnya bertanggung jawab memastikan hukum yang berlaku.',
  documented:'Terdokumentasi, bukan dijanjikan.',
  wa:{title:'Permintaan penawaran · AXIOM',name:'Nama',org:'Klinik/Institusi',role:'Peran',email:'Email',lots:'Lot yang diminta',goods:'Subtotal barang',none:'Belum memilih lot; mohon informasi katalog.',note:'Catatan',ack:'Pernyataan: 18+, peneliti berkualifikasi / pembeli institusi',close:'Hanya untuk keperluan riset. Riset laboratorium in-vitro saja.'},
}};
const T_PAGE = window.T_PAGE || { en: {}, id: {} };
const t = k => (T_PAGE[lang] && T_PAGE[lang][k] !== undefined) ? T_PAGE[lang][k] : T_COMMON[lang][k];
const pick = (en, id) => (lang === 'id' ? id : en);

function applyLang() {
  root.lang = lang;
  $$('[data-t]').forEach(el => { const v = t(el.dataset.t); if (typeof v === 'string') el.innerHTML = v; });
  $$('[data-tp]').forEach(el => { el.placeholder = t(el.dataset.tp); });
  $$('.lang button').forEach(b => { const on = b.dataset.lang === lang; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  $('#themeBtn')?.setAttribute('aria-label', t('theme'));
  renderTicker(); renderLive(); renderBar();
  if (typeof window.onLang === 'function') window.onLang();
}
$$('.lang button').forEach(b => b.addEventListener('click', () => {
  lang = b.dataset.lang; try { localStorage.setItem('axiom.lang', lang); } catch {} applyLang();
}));

/* ---------------- basket, shared between pages */
const basket = new Map();
try { const b = JSON.parse(localStorage.getItem('axiom.request') || '[]'); for (const [i, q] of b) if (LOTS[i] && q > 0) basket.set(+i, Math.min(99, +q)); } catch {}
const persist = () => { try { localStorage.setItem('axiom.request', JSON.stringify([...basket])); } catch {} };
const total = () => [...basket].reduce((s, [i, n]) => s + LOTS[i].price * n, 0);
const units = () => [...basket].reduce((s, [, n]) => s + n, 0);
let toastT = 0;
function toast(msg) { const el = $('#toast'); if (!el) return; el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200); }
function renderBar() {
  const bar = $('#bar'); if (!bar) return;
  const n = units();
  bar.classList.toggle('on', n > 0); document.body.classList.toggle('has-bar', n > 0);
  $('#barN').textContent = n === 1 ? t('bar_one') : t('bar_n').replace('{n}', n);
  $('#barT').textContent = idr(total());
}
function bump() { const n = $('#barN'); if (!n) return; n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); }
function toggleLot(i, row) {
  const l = LOTS[i], had = basket.has(i);
  if (had) basket.delete(i); else basket.set(i, 1);
  persist(); renderBar(); bump();
  toast(t(had ? 'removed_toast' : 'added_toast').replace('{name}', l.name).replace('{dose}', l.dose));
  if (row) { row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1100); }
  if (typeof window.onBasket === 'function') window.onBasket();
}

/* the bar steps aside while the request section itself is on screen */
(function nearRequest() {
  const bar = $('#bar'), req = $('#request'); if (!bar || !req || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(es => es.forEach(en => bar.classList.toggle('near', en.isIntersecting)), { rootMargin: '0px 0px -30% 0px' }).observe(req);
})();

/* ---------------- ticker, live cut-off */
function renderTicker() {
  const tr = $('#tickerTrack'); if (!tr) return;
  const items = t('tick').map(x => `<span class="it">${x}</span>`).join('');
  tr.innerHTML = items + items;
}
function jakarta() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(new Date());
  const g = k => p.find(x => x.type === k)?.value || '';
  return { h: +g('hour') % 24, m: +g('minute'), wd: g('weekday') };
}
function renderLive() {
  const el = $('#live'); if (!el) return;
  const { h, m, wd } = jakarta();
  const now = t('live_now').replace('{t}', `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`);
  const left = H => { const d = H * 60 - (h * 60 + m); return `${Math.floor(d / 60)} ${t('live_h')} ${d % 60} ${t('live_m')}`; };
  const mins = h * 60 + m;
  let msg, open = true;
  if (wd === 'Sun') { msg = t('live_sun'); open = false; }
  else if (mins < 15 * 60) msg = t('live_cold').replace('{left}', left(15));
  else if (mins < 17 * 60) msg = t('live_amb').replace('{left}', left(17));
  else { msg = t('live_closed'); open = false; }
  $('#liveTxt').textContent = `${now}, ${msg}`;
  el.classList.toggle('closed', !open);
}
setInterval(renderLive, 30000);

/* ---------------- nav: hide on scroll down, progress line, spy, menu */
(function nav() {
  const nav = $('#nav'); if (!nav) return;
  const prog = $('#prog'); let last = window.scrollY, ticking = false;
  const onScroll = () => {
    const y = window.scrollY; nav.classList.toggle('nav-hidden', y > last && y > 140); last = y;
    if (prog) { const max = document.documentElement.scrollHeight - window.innerHeight; prog.style.width = (max > 0 ? Math.min(100, y / max * 100) : 0) + '%'; }
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  const toggle = $('#navToggle'), links = $('#site-links');
  const icon = open => `<svg class="ic"><use href="#${open ? 'i-x' : 'i-menu'}"/></svg>`;
  toggle?.addEventListener('click', () => { const open = links.classList.toggle('open'); toggle.setAttribute('aria-expanded', open); toggle.innerHTML = icon(open); });
  links?.addEventListener('click', e => { if (e.target.closest('a')) { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.innerHTML = icon(false); } });
  const navA = links ? [...links.querySelectorAll('a[href^="#"]')] : [];
  if (navA.length) {
    const spy = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) navA.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
    $$('main section[id]').forEach(s => spy.observe(s));
  }
})();

/* ---------------- reveal, steps, tilt, hero words, count-up */
(function motion() {
  const rev = $$('.reveal, .stagger');
  if (reduce || !('IntersectionObserver' in window)) rev.forEach(el => el.classList.add('in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rev.forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in'); else io.observe(el); });
  }
  const stepIO = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) en.target.classList.add('on'); }), { threshold: .5 });
  $$('.step').forEach(s => stepIO.observe(s));
  const tiles = $('#tiles');
  if (tiles && !reduce && matchMedia('(hover:hover)').matches) {
    tiles.addEventListener('pointermove', e => {
      const t = e.target.closest('.tile'); if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }
  const c = $('.coa');
  if (c && !reduce) {
    c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.classList.add('tilting'); c.style.transform = `perspective(900px) rotateX(${-y * 7}deg) rotateY(${x * 9}deg)`; });
    c.addEventListener('pointerleave', () => { c.classList.remove('tilting'); c.style.transform = ''; });
  }
})();
let heroPlayed = false;
function wrapHero() {
  const h = $('.hero h1'); if (!h) return;
  let i = 0;
  const walk = node => {
    if (node.nodeType === 3) {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const w = document.createElement('span'); w.className = 'w';
        const inner = document.createElement('i'); inner.style.setProperty('--i', i++); inner.textContent = part;
        w.appendChild(inner); frag.appendChild(w);
      });
      node.replaceWith(frag);
    } else if (node.nodeType === 1) [...node.childNodes].forEach(walk);
  };
  [...h.childNodes].forEach(walk);
  if (heroPlayed) h.querySelectorAll('.w>i').forEach(el => el.style.animation = 'none');
  heroPlayed = true;
}
function countUp() {
  if (reduce) return;
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', t0 = performance.now(), dur = 1400;
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = pre + Math.round(end * e) + suf; if (k < 1) requestAnimationFrame(step); };
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { requestAnimationFrame(step); io.disconnect(); } });
    io.observe(el);
  });
}

/* ---------------- WhatsApp request (home page) */
function composeWa(f) {
  const w = t('wa');
  const lines = [...basket].map(([i, n]) => { const l = LOTS[i]; return `- ${l.name} · ${l.dose} × ${n} · ${idr(l.price * n)}`; });
  const body = [
    w.title, '',
    `${w.name}: ${f.name}`, f.org ? `${w.org}: ${f.org}` : null, f.role ? `${w.role}: ${f.role}` : null, f.email ? `${w.email}: ${f.email}` : null, '',
    `${w.lots}:`, ...(lines.length ? lines : [w.none]),
    lines.length ? `${w.goods}: ${idr(total())}` : null, '',
    f.msg ? `${w.note}: ${f.msg}` : null, f.msg ? '' : null,
    `${w.ack} ✓`, w.close,
  ].filter(x => x !== null).join('\n');
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(body)}`, '_blank', 'noopener');
}
