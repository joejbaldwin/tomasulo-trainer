'use strict';
/* Study-text toolkit shared by Lessons 4 and 5:
   semantic highlighting, cloze "recall" mode, slide references, think-first prompts, step-by-step reveals. */

const LM = { recall: store.get('recall', false) };

/* highlights — the same four meanings everywhere. .cz marks text that is blanked out in recall mode */
const hk = s => `<mark class="hk cz">${s}</mark>`;   // key term: you must be able to produce it
const hp = s => `<span class="hp">${s}</span>`;       // benefit
const hc = s => `<span class="hc">${s}</span>`;       // cost / trade-off
const hn = s => `<span class="hn cz">${s}</span>`;    // a number worth memorising
const sref = s => `<span class="sref" title="${T('Slide deck · slide number', 'Presentación · n.º de diapositiva')}">▤ ${s}</span>`;
const trap = h => `<div class="trap"><b>⚠ ${T('Exam trap', 'Trampa de examen')}</b><div>${h}</div></div>`;
const why = (q, a) => `<details class="why"><summary><span>${T('Think first', 'Piénsalo primero')}</span>${q}</summary><div>${a}</div></details>`;
const cb = (title, src, body, extra = '') => `<section class="cb"><header><h3>${title}</h3><span class="cbx">${extra}${src ? sref(src) : ''}</span></header>${body}</section>`;

/* formula with a caption under each term: [class, symbol, caption] or a plain operator string */
const fx = (parts, cls = '') => `<div class="fx ${cls}">${parts.map(p => (typeof p === 'string' ? `<span class="fxo">${p}</span>` : `<span class="fxt ${p[0]}"><b class="cz">${p[1]}</b><small>${p[2]}</small></span>`)).join('')}</div>`;
const vA = s => `<span class="va">${s}</span>`, vM = s => `<span class="vm">${s}</span>`, vF = s => `<span class="vf">${s}</span>`, vR = s => `<span class="vr">${s}</span>`;

function learnBar(extra = '') {
  return `<div class="lbar">
    <div class="lkey"><mark class="hk">${T('key term', 'término clave')}</mark><span class="hp">${T('benefit', 'ventaja')}</span><span class="hc">${T('cost', 'coste')}</span><span class="hn">${T('number', 'cifra')}</span><span class="trapk">⚠ ${T('trap', 'trampa')}</span>${extra}</div>
    <div class="lmode">${segc('lmode', [[0, '📖 ' + T('Study', 'Estudiar')], [1, '🧠 ' + T('Recall', 'Recordar')]], LM.recall ? 1 : 0)}<span class="lcnt" id="lcnt"></span><button class="chipb" id="lhide">↺ ${T('Hide again', 'Ocultar otra vez')}</button></div>
  </div>`;
}
function learnInit(root) {
  const cnt = $('#lcnt', root), hide = $('#lhide', root);
  const upd = () => {
    const all = $$('.cz', root), open = all.filter(e => e.classList.contains('open')).length;
    root.classList.toggle('recall', LM.recall);
    cnt.innerHTML = LM.recall ? `<b>${open}/${all.length}</b> ${T('recalled — say it, then click the blank', 'recordadas — dilo y luego haz clic en el hueco')}` : T('Recall blanks out every highlighted term so you have to produce it.', 'Recordar deja en blanco cada término resaltado para que tengas que producirlo.');
    hide.style.display = LM.recall ? '' : 'none';
    all.forEach(e => { if (LM.recall) e.tabIndex = 0; else e.removeAttribute('tabindex'); });
  };
  const close = () => $$('.cz.open', root).forEach(e => e.classList.remove('open'));
  onSeg(root, 'lmode', v => { LM.recall = v === '1'; store.set('recall', LM.recall); close(); upd(); });
  hide.onclick = () => { close(); sfx.tick(); upd(); };
  const rev = t => { const c = t.closest && t.closest('.cz'); if (!c || !LM.recall || c.classList.contains('open')) return; c.classList.add('open'); sfx.pop(); upd(); };
  root.addEventListener('click', e => rev(e.target));
  root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('cz')) { e.preventDefault(); rev(e.target); } });
  upd();
}

/* worked example revealed one line at a time: commit to an answer, then look */
function stepper(host, steps) {
  let i = 0;
  const draw = () => {
    host.innerHTML = `<div class="steps">${steps.map((s, n) => (n > i ? '' : `<div class="st ${n < i ? 'ok' : 'cur'}"><b class="stn">${n + 1}</b><div><div class="stq">${s.q}</div>${n < i ? `<div class="sta">${s.a}</div>` : `<button class="btn ghost" data-rv>${T('I have my answer — show it', 'Ya tengo mi respuesta — mostrar')}</button>`}</div></div>`)).join('')}
      ${i >= steps.length ? `<button class="chipb" data-rs>↺ ${T('Start over', 'Empezar de nuevo')}</button>` : ''}</div>`;
    const b = $('[data-rv]', host); if (b) b.onclick = () => { i++; sfx.pop(); draw(); };
    const r = $('[data-rs]', host); if (r) r.onclick = () => { i = 0; draw(); };
  };
  draw();
}
