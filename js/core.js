'use strict';
/* Core: storage, i18n, sound, router, quiz engine, shared widgets */

const store = {
  get(k, d) { try { const v = localStorage.getItem('tt.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('tt.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
};
const S = { lang: store.get('lang', 'en'), sound: store.get('sound', true), done: store.get('done', {}) };
const T = (en, es) => (S.lang === 'es' ? es : en);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const lg = n => Math.round(Math.log2(n));
const bin = (v, n) => (n <= 0 ? '' : Math.floor(v).toString(2).padStart(n, '0'));
const hex = (v, n = 0) => '0x' + Math.floor(v).toString(16).toUpperCase().padStart(n, '0');
const fmtB = b => (b >= 2 ** 20 ? b / 2 ** 20 + ' MiB' : b >= 1024 ? b / 1024 + ' KiB' : b + ' B');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];


/* ---------- sound (WebAudio, no files) ---------- */
const sfx = (() => {
  let ctx;
  const ac = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
  function tone(f, t0, dur, type = 'sine', vol = 0.14, f2) {
    const c = ac(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t0, dur, vol = 0.08) {
    const c = ac(), n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.setValueAtTime(1800, c.currentTime + t0); f.frequency.exponentialRampToValueAtTime(300, c.currentTime + t0 + dur);
    s.buffer = buf; g.gain.value = vol; s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + t0);
  }
  const P = fn => (...a) => { if (!S.sound) return; try { fn(...a); } catch (e) { /* audio blocked */ } };
  return {
    hit: P(() => { tone(784, 0, 0.1, 'triangle'); tone(1175, 0.07, 0.2, 'triangle'); }),
    miss: P(() => { tone(196, 0, 0.28, 'sawtooth', 0.1, 98); }),
    evict: P(() => noise(0, 0.22)),
    ok: P(() => { tone(660, 0, 0.09, 'sine'); tone(990, 0.08, 0.16, 'sine'); }),
    bad: P(() => { tone(220, 0, 0.12, 'square', 0.07); tone(165, 0.1, 0.2, 'square', 0.07); }),
    tick: P(() => tone(1400, 0, 0.04, 'sine', 0.06)),
    pop: P(() => tone(520, 0, 0.07, 'triangle', 0.09, 780)),
    win: P(() => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.13))),
    cdb: P(() => { tone(520, 0, 0.16, 'sine', 0.11, 1320); tone(1320, 0.13, 0.14, 'triangle', 0.09); }),
    commit: P(() => { tone(330, 0, 0.07, 'triangle', 0.13); tone(494, 0.06, 0.14, 'triangle', 0.12); }),
    flush: P(() => { noise(0, 0.38, 0.14); tone(320, 0, 0.36, 'sawtooth', 0.09, 70); }),
    wait: P(() => tone(250, 0, 0.09, 'sine', 0.08, 210)),
    issue: P(() => tone(620, 0, 0.05, 'triangle', 0.08))
  };
})();

/* ---------- confetti ---------- */
function confetti() {
  const box = document.createElement('div'); box.className = 'confetti';
  const cols = ['#f5a524', '#22c3a6', '#9b8cff', '#3ddc84', '#5aa9ff', '#ff5d6c'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('i');
    p.style.cssText = `left:${50 + (Math.random() - 0.5) * 30}%;background:${pick(cols)};--dx:${(Math.random() - 0.5) * 520}px;--dy:${-180 - Math.random() * 320}px;--r:${Math.random() * 720}deg;animation-delay:${Math.random() * 0.12}s`;
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 1900);
}

/* ---------- views / router ---------- */
const Views = {}, Order = [];
let cur = 'home';
function View(id, def) { Views[id] = def; Order.push(id); }
function isDone(id) { const v = Views[id]; return v.done ? v.done().every(x => S.done[x]) : false; }
function markDone(id) { if (!S.done[id]) { S.done[id] = true; store.set('done', S.done); } drawNav(); }
function drawNav() {
  $('#nav').innerHTML = Order.map(id => {
    const v = Views[id];
    return `<a href="#/${id}" class="${cur === id ? 'on' : ''}"><span class="ni">${v.icon}</span><span class="nt">${v.title()}</span>${isDone(id) ? '<span class="ck">✓</span>' : ''}</a>`;
  }).join('');
  $('#langBtn').textContent = S.lang === 'es' ? 'ES → EN' : 'EN → ES';
  $('#sndBtn').textContent = S.sound ? '🔊' : '🔇';
  document.documentElement.lang = S.lang;
}
let stopFns = [];
function onLeave(fn) { stopFns.push(fn); }
function route(keepScroll) {
  const y = window.scrollY;
  stopFns.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); stopFns = [];
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  cur = Views[parts[0]] ? parts[0] : 'home';
  drawNav();
  const m = $('#main'); m.innerHTML = '';
  Views[cur].render(m, parts[1]);
  window.scrollTo(0, keepScroll === true ? y : 0);
}
function head(kicker, title, sub) {
  return `<header class="ph"><div class="kicker">${kicker}</div><h1>${title}</h1>${sub ? `<p class="lead">${sub}</p>` : ''}</header>`;
}
function nextLink(id) {
  const v = Views[id];
  return `<a class="next" href="#/${id}"><span>${T('Next', 'Siguiente')}</span><b>${v.icon} ${v.title()} →</b></a>`;
}

/* ---------- answers ---------- */
function parseNum(s) {
  s = String(s).trim().replace(/\s/g, '').replace(',', '.');
  let pct = false;
  if (s.endsWith('%')) { pct = true; s = s.slice(0, -1); }
  let v;
  if (/^2\^\d+$/.test(s)) v = 2 ** +s.slice(2);
  else if (s.includes('/')) { const p = s.split('/'); v = parseFloat(p[0]) / parseFloat(p[1]); }
  else v = parseFloat(s);
  return pct ? v / 100 : v;
}
function checkAns(q, raw) {
  if (q.type === 'txt') {
    const n = String(raw).toLowerCase().replace(/\s+/g, '').replace(/^0x/, '');
    return q.a.some(x => String(x).toLowerCase() === n);
  }
  const v = parseNum(raw);
  if (isNaN(v)) return false;
  const tol = q.tol != null ? q.tol : Math.abs(q.a) * 0.006 + 1e-9;
  return Math.abs(v - q.a) <= tol || (q.rate && Math.abs(v / 100 - q.a) <= tol);
}
const ansText = q => (q.type === 'mc' ? q.opts[q.a] : q.type === 'txt' ? q.a[0] : q.a);

/* ---------- quiz engine: one question at a time, must be right to advance ---------- */
const QZ = {};
function Quiz(host, id, qs, opt = {}) {
  const st = QZ[id] || (QZ[id] = { i: 0, tries: 0, first: 0, ok: false });
  const reset = () => Object.assign(st, { i: 0, tries: 0, first: 0, ok: false });
  const draw = () => {
    if (st.i >= qs.length) {
      host.innerHTML = `<div class="quiz done"><div class="big">🎉</div><h3>${T('Section complete', 'Sección completada')}</h3>
        <p>${T('Right first time', 'Aciertos a la primera')}: <b>${st.first}/${qs.length}</b></p>
        <button class="btn ghost" data-r>${opt.again || T('Do it again', 'Repetir')}</button></div>`;
      $('[data-r]', host).onclick = () => { reset(); if (opt.onAgain) opt.onAgain(); else draw(); };
      if (!st.celebrated) { st.celebrated = true; sfx.win(); confetti(); }
      if (!opt.noMark) markDone(opt.markId || id);
      return;
    }
    st.celebrated = false;
    const q = qs[st.i];
    host.innerHTML = `<div class="quiz"><div class="qprog">${qs.map((_, k) => `<i class="${k < st.i ? 'd' : k === st.i ? 'c' : ''}"></i>`).join('')}<span>${st.i + 1}/${qs.length}</span></div>
      <div class="qq">${q.q}</div><div class="qa"></div><div class="qfb"></div></div>`;
    const box = host.firstElementChild, qa = $('.qa', host), fb = $('.qfb', host);
    /* a redraw (e.g. language switch) after a correct answer must show the answered state, not block the right option */
    const answered = st.ok; st.ok = false;
    const good = replay => {
      if (st.ok) return;
      st.ok = true;
      if (!replay) { if (st.tries === 0) st.first++; sfx.ok(); }
      $$('button,input', qa).forEach(b => (b.disabled = true));
      fb.innerHTML = `<div class="fb ok"><b>✓ ${T('Correct', 'Correcto')}.</b> ${q.why || ''}</div>
        <button class="btn" data-n>${st.i + 1 < qs.length ? T('Next →', 'Siguiente →') : T('Finish', 'Terminar')}</button>`;
      const n = $('[data-n]', fb);
      n.onclick = () => { st.i++; st.tries = 0; st.ok = false; draw(); };
      n.focus({ preventScroll: true });
    };
    const bad = () => {
      st.tries++; sfx.bad();
      box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
      let m = T('Not quite — think again.', 'No del todo — piénsalo otra vez.');
      if (st.tries >= 2 && q.hint) m += ` <span class="hint">💡 ${q.hint}</span>`;
      if (st.tries >= 3) m += `<div class="reveal">${T('Answer', 'Respuesta')}: <b>${q.show != null ? q.show : ansText(q)}</b>. ${q.why || ''} ${q.type === 'mc' ? '' : T('Type it to continue.', 'Escríbela para continuar.')}</div>`;
      fb.innerHTML = `<div class="fb bad">${m}</div>`;
    };
    if (q.type === 'mc') {
      qa.innerHTML = q.opts.map((o, k) => `<button class="opt" data-k="${k}">${o}</button>`).join('');
      $$('.opt', qa).forEach(b => (b.onclick = () => {
        if (+b.dataset.k === q.a) { b.classList.add('right'); good(); } else { b.classList.add('wrong'); b.disabled = true; bad(); }
      }));
    } else {
      qa.innerHTML = `<input class="inp" autocomplete="off" spellcheck="false" placeholder="${q.ph || T('your answer', 'tu respuesta')}">${q.unit ? `<span class="unit">${q.unit}</span>` : ''}<button class="btn" data-c>${T('Check', 'Comprobar')}</button>`;
      const inp = $('.inp', qa);
      const go = () => { if (inp.value.trim() === '') return; checkAns(q, inp.value) ? good() : bad(); };
      $('[data-c]', qa).onclick = go;
      inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
      if (st.i > 0 || opt.focus) inp.focus({ preventScroll: true });
    }
    if (answered) {
      if (q.type === 'mc') $(`.opt[data-k="${q.a}"]`, qa).classList.add('right');
      else $('.inp', qa).value = ansText(q);
      good(true);
    }
  };
  draw();
  return { reset, draw };
}

/* segmented control helper */
function segc(name, items, val) {
  return `<div class="segc" data-seg="${name}">${items.map(([v, l, s]) => `<button data-v="${v}" class="${String(v) === String(val) ? 'on' : ''}">${l}${s ? `<small>${s}</small>` : ''}</button>`).join('')}</div>`;
}
function onSeg(root, name, fn) {
  const box = $(`[data-seg="${name}"]`, root);
  $$('button', box).forEach(b => (b.onclick = () => { $$('button', box).forEach(x => x.classList.toggle('on', x === b)); sfx.tick(); fn(b.dataset.v); }));
}

window.addEventListener('hashchange', () => route());
window.addEventListener('DOMContentLoaded', () => {
  $('#langBtn').onclick = () => { S.lang = S.lang === 'es' ? 'en' : 'es'; store.set('lang', S.lang); sfx.tick(); route(true); };
  $('#sndBtn').onclick = () => { S.sound = !S.sound; store.set('sound', S.sound); drawNav(); sfx.pop(); };
  route();
});
