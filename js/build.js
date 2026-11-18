'use strict';
/* Lesson 5: fill in the cronogram yourself; checked cell by cell against the simulator. */

const BKEYS = [['IF', 'f'], ['IS', 'i'], ['EX', 'e'], ['M', 'm'], ['WB', 'w'], ['C', 'c'], ['-', '-'], ['Cancel', 'x']];
const BS = { grid: {}, id: null, brush: null, foc: null, checked: false, rnd: null, n: 0 };
const BUILD_IDS = ['main', 'war', 'waw', 'e37', 'e38', 's13', 's15'];

/* random practice problem: a short program with real dependencies */
function rndScenario() {
  const spec = Math.random() < 0.4, F = ['F0', 'F2', 'F4', 'F6', 'F8', 'F10'], pk = () => pick(F);
  const lat = { mul: pick([2, 3]), div: pick([3, 4]), add: pick([1, 2]), sub: pick([1, 2]), br: spec ? pick([1, 2]) : 1 };
  const prog = [], n = spec ? 4 : pick([4, 5]);
  let last = null;
  for (let i = 0; i < n; i++) {
    const r = Math.random(), a = last && Math.random() < 0.6 ? last : pk();
    let d = pk();
    if (i === 0 && Math.random() < 0.6) { prog.push(`LD ${d},${pick([8, 16, 32])}(R1)`); last = d; continue; }
    const op = r < 0.3 ? 'ADDD' : r < 0.55 ? 'SUBD' : r < 0.8 ? 'MULD' : 'DIVD';
    prog.push(`${op} ${d},${a},${pk()}`); last = d;
  }
  if (spec) { const taken = Math.random() < 0.5; prog.splice(2, 0, `${taken ? 'BEQ' : 'BNE'} R2 R2 L`); prog.push(`L: ADDD F12,F2,F4`); }
  const sc = { kind: 'mine', spec, lat, mem: 1, prog, regs: { R1: 0, F0: 6 }, title: () => T('Random problem', 'Problema aleatorio'), src: '', watch: () => '' };
  const s = simulate(sc);
  return s.last <= 17 && s.insts.length <= 7 ? sc : rndScenario();
}

View('build', {
  icon: '⑤', mins: 30, title: () => T('Build the cronogram', 'Construye el cronograma'),
  desc: () => T('The exam task: fill every cell yourself, then check it against the simulator.', 'La tarea del examen: rellena tú cada celda y compruébala con el simulador.'),
  done: () => ['build-main', 'build-e37', 'build-s15'],
  render(m, p) {
    const id = p === 'rnd' || BUILD_IDS.includes(p) ? p : store.get('bid', 'main'); store.set('bid', id);
    if (id === 'rnd' && !BS.rnd) BS.rnd = rndScenario();
    const sc = id === 'rnd' ? BS.rnd : SCEN[id], s = id === 'rnd' ? simulate(sc) : simOf(id), key = id === 'rnd' ? 'rnd' + BS.n : id;
    if (BS.id !== key) { BS.id = key; BS.grid = store.get('bg-' + key, {}); BS.checked = false; BS.foc = null; }
    const g = BS.grid, n = sc.maxCycle ? s.last : s.last + 2, U = UNIT(), spec = s.spec, rows = s.insts;
    const pills = [];
    ['mul', 'div', 'add', 'sub', 'log', 'br'].forEach(k => { if (s.order.includes(k)) pills.push(`<span><b>${U[k]}</b> ${s.lat[k]}</span>`); });
    if (s.order.includes('load') || s.order.includes('store')) pills.push(`<span><b>${T('Memory', 'Memoria')}</b> 1 EX + ${s.memLat} M</span>`);
    if (spec) pills.push(`<span class="alt">ROB · ${T('predict not taken · one commit per unit per cycle', 'predice no tomado · un commit por unidad y ciclo')}</span>`);
    else if (s.order.includes('br')) pills.push(`<span class="alt">${T('predict not taken, no speculation', 'predice no tomado, sin especulación')}</span>`);
    const br = s.insts.find(x => x.ins.k === 'br');
    const keys = BKEYS.filter(([k]) => (k !== 'C' || spec) && (k !== 'Cancel' || br));
    m.innerHTML = `${head(T('Lesson 5 · practice', 'Lección 5 · práctica'), T('Build the cronogram', 'Construye el cronograma'),
      T('Do it on paper first if you can. Click a cell and type the letter shown on each stage (arrows move, space skips), or pick a stage and click cells.', 'Hazlo antes en papel si puedes. Pulsa una celda y teclea la letra de cada etapa (las flechas mueven, espacio salta), o elige una etapa y pulsa celdas.'))}
      <div class="scpick"><small>${T('Course', 'Curso')}</small>${BUILD_IDS.map(i => `<a class="chipb ${i === id ? 'on' : ''} ${S.done['build-' + i] ? 'dn' : ''}" href="#/build/${i}">${SCEN[i].title()}</a>`).join('')}
        <small>${T('Unlimited', 'Sin límite')}</small><a class="chipb ${id === 'rnd' ? 'on' : ''}" href="#/build/rnd">🎲 ${T('Random', 'Aleatorio')}</a>${id === 'rnd' ? `<button class="chipb" id="bnew">↻ ${T('New one', 'Otro')}</button>` : ''}</div>
      <div class="card"><div class="mtitle"><h3>${sc.title()}</h3>${sc.src ? sref(sc.src) : ''}${spec ? `<span class="kb k-m">${T('with ROB', 'con ROB')}</span>` : `<span class="kb k-c">Tomasulo</span>`}</div>
        <div class="chips cfgp">${pills.join('')}</div>
        ${br ? `<p class="mute">${T('The branch is', 'El salto')} <b>${br.taken ? T('taken', 'se toma') : T('not taken', 'no se toma')}</b>.${rows.length > s.prog.length ? ' ' + T('The last row is the instruction fetched again after the flush.', 'La última fila es la instrucción captada de nuevo tras el vaciado.') + (sc.maxCycle ? ' ' + T(`The cronogram is cut at cycle ${s.last}, as on the slide.`, `El cronograma se corta en el ciclo ${s.last}, como en la diapositiva.`) : '') : ''}</p>` : ''}
        <div class="pal"><button class="er ${BS.brush === null ? 'on' : ''}" data-b="kb">⌨ ${T('type', 'teclear')}</button>${keys.map(([k, c]) => `<button class="s-${STG[k] || 'is'} ${BS.brush === k ? 'on' : ''}" data-b="${k}">${k === '-' ? '–' : k}<kbd>${c}</kbd></button>`).join('')}<button class="er ${BS.brush === '' ? 'on' : ''}" data-b="">⌫<kbd>del</kbd></button></div>
        <div id="bg"></div>
        <div class="bres"><button class="btn" id="bchk">${T('Check', 'Comprobar')}</button><button class="btn ghost" id="bhnt">💡 ${T('Hint for my first mistake', 'Pista de mi primer error')}</button><button class="btn ghost" id="bclr">${T('Clear', 'Borrar')}</button><button class="btn ghost" id="bsol">${T('Show solution', 'Ver solución')}</button><span id="bsc"></span></div>
        <div id="bout"></div></div>
      ${nextLink('threads')}`;
    const want = (r, c) => { const v = rows[r].cells[c]; return v === 'MEM' ? 'M' : v || ''; };
    const total = rows.reduce((a, x) => a + Object.keys(x.cells).length, 0);
    const save = () => store.set('bg-' + key, g);
    function grid() {
      let h = `<div class="crw"><table class="cr bd"><thead><tr><th class="cri">${T('Instruction', 'Instrucción')}</th>`;
      for (let c = 1; c <= n; c++) h += `<th>${c}</th>`;
      h += '</tr></thead><tbody>';
      rows.forEach((x, r) => {
        h += `<tr><th class="cri">${x.ins.text}</th>`;
        let prev = 'is';
        for (let c = 1; c <= n; c++) {
          const v = g[r + ',' + c] || '';
          if (v && v !== '-') prev = STG[v];
          let cls = v ? 's-' + prev : '';
          if (BS.checked) cls += v ? (v === want(r, c) ? ' ok' : ' no') : want(r, c) ? ' miss' : '';
          if (BS.foc === r + ',' + c) cls += ' foc';
          h += `<td class="${cls}" data-c="${r},${c}" tabindex="-1">${v === '-' ? '–' : v}</td>`;
        }
        h += '</tr>';
      });
      $('#bg', m).innerHTML = h + '</tbody></table></div>';
      $$('#bg td', m).forEach(td => (td.onclick = () => { BS.foc = td.dataset.c; if (BS.brush !== null) put(BS.brush, false); else grid(); }));
    }
    function put(v, adv) {
      if (!BS.foc) return;
      if (v) g[BS.foc] = v; else delete g[BS.foc];
      BS.checked = false; save(); sfx.tick();
      if (adv) { const [r, c] = BS.foc.split(',').map(Number); if (c < n) BS.foc = r + ',' + (c + 1); }
      grid();
    }
    function score() {
      let ok = 0, bad = 0;
      rows.forEach((x, r) => { for (let c = 1; c <= n; c++) { const v = g[r + ',' + c] || '', w = want(r, c); if (w && v === w) ok++; else if (v !== w) bad++; } });
      return { ok, bad };
    }
    function firstBad() { for (let r = 0; r < rows.length; r++) for (let c = 1; c <= n; c++) if ((g[r + ',' + c] || '') !== want(r, c)) return [r, c]; return null; }
    $$('.pal button', m).forEach(b => (b.onclick = () => { BS.brush = b.dataset.b === 'kb' ? null : b.dataset.b; $$('.pal button', m).forEach(x => x.classList.toggle('on', x === b)); sfx.tick(); }));
    $('#bchk', m).onclick = () => {
      BS.checked = true; grid();
      const { ok, bad } = score();
      $('#bsc', m).innerHTML = `<span class="sc">${ok}/${total}</span> ${T('cells right', 'celdas correctas')}${bad ? ` · <b class="c-miss">${bad}</b> ${T('wrong or missing', 'mal o sin rellenar')}` : ''}`;
      if (!bad) { sfx.win(); confetti(); if (id !== 'rnd') markDone('build-' + id); $('#bout', m).innerHTML = `<div class="fb ok"><b>✓ ${T('Perfect.', 'Perfecto.')}</b> ${id !== 'rnd' ? `<a href="#/${spec ? 'rob' : 'tomasulo'}/${id}">${T('Step through it in the simulator', 'Recórrelo en el simulador')} →</a>` : ''}</div>`; }
      else sfx.bad();
    };
    $('#bhnt', m).onclick = () => {
      const fb = firstBad(); if (!fb) return;
      const [r, c] = fb, x = rows[r], w = want(r, c), sn = s.snaps[c];
      const ev = sn ? sn.ev.filter(e => e.i === x.id || (e.k === 'cancel' && e.ids.includes(x.id)) || (e.k === 'cq' && e.ids.includes(x.id))) : [];
      const lines = ev.map(e => evLine(s, e)).filter(Boolean);
      BS.foc = r + ',' + c; BS.checked = false; grid(); sfx.pop();
      $('#bout', m).innerHTML = `<div class="bhint"><b>${x.ins.text} · ${T('cycle', 'ciclo')} ${c}</b> — ${w ? T('this cell is not what you have. What is true in this cycle:', 'esta celda no es lo que tienes. Lo que ocurre en este ciclo:') : T('this cell should be empty: the instruction is not in the machine in this cycle.', 'esta celda debe estar vacía: la instrucción no está en la máquina en este ciclo.')}
        <ul>${lines.map(([gk, h]) => `<li><span class="sg s-none">?</span><span>${h}</span></li>`).join('')}${!lines.length && w === '-' ? `<li><span></span><span>${T('It is still waiting, exactly as in the previous cycle.', 'Sigue esperando, igual que en el ciclo anterior.')}</span></li>` : ''}</ul></div>`;
    };
    $('#bclr', m).onclick = () => { for (const k in g) delete g[k]; BS.checked = false; save(); grid(); $('#bsc', m).innerHTML = ''; $('#bout', m).innerHTML = ''; };
    $('#bsol', m).onclick = () => { sfx.pop(); $('#bout', m).innerHTML = `<h4>${T('Solution', 'Solución')}${sc.kind === 'mine' ? ` <small class="mute">${T('simulator', 'simulador')}</small>` : ''}</h4>${cronoHTML(simRows(s).map(r => ({ text: r.text, cells: Object.fromEntries(Object.entries(r.cells).map(([c, v]) => [c, v === 'MEM' ? 'M' : v])) })), n)}${(sc.notes || []).map(nt => `<p class="mnote"><b>ⓘ</b> ${nt.t()}</p>`).join('')}`; };
    const nb = $('#bnew', m); if (nb) nb.onclick = () => { BS.rnd = rndScenario(); BS.n++; route(true); };
    const key2 = e => {
      if (!BS.foc || e.ctrlKey || e.metaKey || e.altKey) return;
      const [r, c] = BS.foc.split(',').map(Number), mv = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
      if (mv) { e.preventDefault(); BS.foc = Math.max(0, Math.min(rows.length - 1, r + mv[0])) + ',' + Math.max(1, Math.min(n, c + mv[1])); return grid(); }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === ' ') { e.preventDefault(); return put('', e.key === ' '); }
      const k = keys.find(([, ch]) => ch === e.key.toLowerCase());
      if (k) { e.preventDefault(); put(k[0], true); }
    };
    document.addEventListener('keydown', key2); onLeave(() => document.removeEventListener('keydown', key2));
    grid();
  }
});
