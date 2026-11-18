'use strict';
/* Datapath view: the Tomasulo + ROB block diagram (after the figure in L3_8, H&P fig. 3.11) with the
   buses that carry data in each cycle lit up in the stage colour. Driven by the same simulate() run as
   the cronograms, so every lit wire matches a cell of the cronogram underneath. */

const DP_IDS = ['s13', 's15', 'sorder', 'main', 'e38', 'memdep'];
const DPS = {};
const DPCOL = { IF: 'if', IS: 'is', EX: 'ex', M: 'm', WB: 'wb', C: 'c', X: 'x' };
const isMem = k => k === 'load' || k === 'store';
const grpOf = k => (isMem(k) ? 'mem' : k);

/* geometry: fixed boxes, then one station group + unit per non-memory instruction type */
function dpGeom(s) {
  const G = {
    rob: { x: 700, y: 20, w: 260, h: 222 }, q: { x: 330, y: 70, w: 150, h: 120 }, reg: { x: 700, y: 300, w: 260, h: 100 },
    au: { x: 50, y: 250, w: 160, h: 32 }, mu: { x: 50, y: 470, w: 160, h: 36 }, cdbY: 622, grp: {}
  };
  const memRows = s.order.filter(isMem).reduce((n, k) => n + (s.snaps[1] ? s.snaps[1].rs.find(r => r.k === k).rows.length : 2), 0) || 2;
  G.buf = { x: 50, y: 300, w: 160, h: 22 + Math.min(memRows, 5) * 20 };
  const ks = s.order.filter(k => !isMem(k)), n = Math.max(ks.length, 1), gap = 18, span = 940 - 250;
  const w = Math.min(210, (span - gap * (n - 1)) / n);
  ks.forEach((k, i) => {
    const rows = s.snaps[1] ? s.snaps[1].rs.find(r => r.k === k).rows.length : 2;
    const x = 250 + i * (w + gap), cx = x + w / 2;
    G.grp[k] = { x, w, cx, y: 440, h: 22 + rows * 20, ux: cx - 55, uy: 548, uw: 110, uh: 34 };
  });
  return G;
}

/* all wires: id -> polyline points; label optional */
function dpWires(G) {
  const W = {}, P = (...p) => p.map(a => a.join(',')).join(' ');
  const qx = G.q.x + G.q.w / 2 - 20, qb = G.q.y + G.q.h, cdb = G.cdbY, rx = 985;
  W.fetch = P([qx, 26], [qx, G.q.y]);
  W.alloc = P([G.q.x + G.q.w, 120], [G.rob.x, 120]);
  W.nreg = P([790, G.rob.y + G.rob.h], [790, G.reg.y]);
  W.creg = P([890, G.rob.y + G.rob.h], [890, G.reg.y]);
  W.cmem = P([G.rob.x, 52], [22, 52], [22, G.mu.y + 18], [G.mu.x, G.mu.y + 18]);
  W['op-mem'] = P([qx, qb], [qx, 232], [130, 232], [130, G.au.y]);
  W['reg-mem'] = P([G.reg.x, 352], [232, 352], [232, G.au.y + 22], [G.au.x + G.au.w, G.au.y + 22]);
  W['rob-mem'] = P([G.rob.x, 210], [662, 210], [662, 240], [222, 240], [222, G.au.y + 10], [G.au.x + G.au.w, G.au.y + 10]);
  W.addr = P([130, G.au.y + G.au.h], [130, G.buf.y]);
  W.mem = P([130, G.buf.y + G.buf.h], [130, G.mu.y]);
  W['out-mem'] = P([130, G.mu.y + G.mu.h], [130, cdb]);
  W['cap-mem'] = P([38, cdb], [38, G.buf.y + 40], [G.buf.x, G.buf.y + 40]);
  Object.entries(G.grp).forEach(([k, g]) => {
    W['op-' + k] = P([qx, qb], [qx, 394], [g.cx - 34, 394], [g.cx - 34, g.y]);
    W['reg-' + k] = P([830, G.reg.y + G.reg.h], [830, 410], [g.cx, 410], [g.cx, g.y]);
    W['rob-' + k] = P([G.rob.x, 210], [662, 210], [662, 426], [g.cx + 34, 426], [g.cx + 34, g.y]);
    W['fu-' + k] = P([g.cx, g.y + g.h], [g.cx, g.uy]);
    W['out-' + k] = P([g.cx, g.uy + g.uh], [g.cx, cdb]);
    W['cap-' + k] = P([g.x + 10, cdb], [g.x + 10, g.y + g.h]);
  });
  W.cdb = P([38, cdb], [rx, cdb], [rx, 352]);
  W['cdb-reg'] = P([rx, 352], [G.reg.x + G.reg.w, 352]);
  W['cdb-rob'] = P([rx, 352], [rx, 130], [G.rob.x + G.rob.w, 130]);
  return W;
}

/* which wires and boxes carry something in cycle t, coloured by stage */
function dpLit(s, t) {
  const lit = {}, box = {}, sn = s.snaps[t];
  if (!sn) return { lit, box };
  const L = (id, c) => { if (!lit[id]) lit[id] = c; }, B = (id, c) => { if (!box[id]) box[id] = c; };
  sn.ev.forEach(e => {
    const x = e.i != null ? s.insts[e.i] : null, k = x && x.ins.k, g = k && grpOf(k);
    switch (e.k) {
      case 'if': L('fetch', 'IF'); B('q', 'IF'); break;
      case 'is':
        L('op-' + g, 'IS'); B(g === 'mem' ? 'buf' : 'rs-' + g, 'IS'); if (g === 'mem') B('au', 'IS');
        e.ops.forEach(o => { if (o.from === 'reg') { L('reg-' + g, 'IS'); B('reg', 'IS'); } if (o.from === 'rob') { L('rob-' + g, 'IS'); B('rob', 'IS'); } });
        if (s.spec) { L('alloc', 'IS'); B('rob', 'IS'); if (e.rd) L('nreg', 'IS'); }
        break;
      case 'ex': if (g === 'mem') { L('addr', 'EX'); B('au', 'EX'); } else { L('fu-' + g, 'EX'); B('fu-' + g, 'EX'); } break;
      case 'res': B('fu-' + g, 'EX'); break;
      case 'm': if (e.n === 1) L('mem', 'M'); B('mu', 'M'); break;
      case 'wb':
        if (e.val != null) {
          L('out-' + g, 'WB'); L('cdb', 'WB'); B('cdb', 'WB');
          if (s.spec) { L('cdb-rob', 'WB'); B('rob', 'WB'); } else { L('cdb-reg', 'WB'); B('reg', 'WB'); }
          e.caps.forEach(c => { const cg = grpOf(s.insts[c].ins.k); L('cap-' + cg, 'WB'); B(cg === 'mem' ? 'buf' : 'rs-' + cg, 'WB'); });
        } else if (s.spec) B('rob', 'WB');
        break;
      case 'c':
        B('rob', 'C');
        if (e.kind === 'reg') { L('creg', 'C'); B('reg', 'C'); }
        if (e.kind === 'store') { L('cmem', 'C'); B('mu', 'C'); }
        if (e.kind === 'br' && e.mis) B('rob', 'X');
        break;
      case 'cancel': B('rob', 'X'); break;
    }
  });
  return { lit, box };
}

const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmtV = v => (typeof v === 'number' ? r2(v) : v);

function dpSVG(s, t, G, W) {
  const sn = s.snaps[t], { lit, box } = dpLit(s, t), spec = s.spec, U = UNIT();
  const tx = (x, y, str, cls = '', a = 'start') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${a}">${str}</text>`;
  const rect = (id, b, cls, title, sub) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="7" class="bx ${cls}${box[id] ? ' on st-' + DPCOL[box[id]] : ''}"/>`
    + (title ? tx(b.x + 8, b.y + 14, title, 'bt') : '') + (sub ? tx(b.x + b.w - 8, b.y + 14, sub, 'bs', 'end') : '');
  let h = `<svg viewBox="0 0 1000 646" class="dp" role="img" aria-label="${T('Tomasulo datapath with reorder buffer', 'Ruta de datos de Tomasulo con búfer de reordenación')}">
    <defs><marker id="dpa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" class="ah"/></marker></defs>`;

  /* wires: base layer, then the lit ones on top so shared segments show the live colour */
  const noSpec = id => !spec && (id === 'alloc' || id === 'nreg' || id === 'creg' || id === 'cmem' || id === 'cdb-rob' || id.startsWith('rob-'));
  const noMem = id => !s.order.some(isMem) && /mem|addr/.test(id) && id !== 'cmem';
  Object.entries(W).forEach(([id, p]) => {
    if (spec && id === 'cdb-reg') return;
    h += `<polyline points="${p}" class="w${noSpec(id) || noMem(id) ? ' off' : ''}" marker-end="url(#dpa)"/>`;
  });
  Object.entries(lit).forEach(([id, c]) => { if (W[id]) h += `<polyline points="${W[id]}" class="w lit st-${DPCOL[c]}"/>`; });

  /* wire labels */
  const qx = G.q.x + G.q.w / 2 - 20;
  h += tx(qx + 8, 22, T('from the instruction unit (IF)', 'de la unidad de instrucciones (IF)'), 'wl');
  h += tx(qx + 6, 388, T('operation bus · bus de operación', 'bus de operación'), 'wl');
  h += tx(842, 405, T('operand buses · buses de operandos', 'buses de operandos'), 'wl');
  h += tx(512, G.cdbY + 16, T('CDB · common data bus (bus de datos común)', 'CDB · bus de datos común'), 'wl cdbl', 'middle');
  if (spec) {
    h += tx(588, 114, T('new ROB entry', 'nueva entrada ROB'), 'wl', 'middle');
    h += tx(784, 270, T('Nº reg (tag)', 'Nº reg (etiq.)'), 'wl', 'end') + tx(896, 270, T('Data at commit', 'Datos al confirmar'), 'wl');
    h += tx(360, 46, T('commit of a store: address + data → memory', 'commit de un store: dirección + dato → memoria'), 'wl', 'middle');
    h += tx(668, 224, T('value from ROB', 'valor del ROB'), 'wl');
  } else h += tx(965, 345, T('→ registers', '→ registros'), 'wl', 'end');

  /* instruction queue */
  const inQ = s.insts.filter(x => x.IF <= t && (x.IS == null || x.IS > t) && !(x.X && x.X <= t));
  h += rect('q', G.q, 'k-q', T('Instruction queue', 'Cola de instrucciones'));
  inQ.slice(0, 4).forEach((x, i) => (h += tx(G.q.x + 8, G.q.y + 36 + i * 20, esc(x.ins.text.replace(/^\w+:\s*/, '')), 'mono' + (x.IF === t ? ' nw' : ''))));
  if (!inQ.length) h += tx(G.q.x + G.q.w / 2, G.q.y + 70, T('empty', 'vacía'), 'mt', 'middle');

  /* ROB */
  h += rect('rob', G.rob, 'k-rob' + (spec ? '' : ' off'), T('Reorder buffer · ROB', 'Búfer de reordenación · ROB'), spec ? T('head ↓', 'cabeza ↓') : '');
  if (!spec) h += tx(G.rob.x + G.rob.w / 2, G.rob.y + 100, T('not used: no speculation', 'no se usa: sin especulación'), 'mt', 'middle') + tx(G.rob.x + G.rob.w / 2, G.rob.y + 120, T('(pick an L3_8 case above)', '(elige un caso de L3_8 arriba)'), 'mt', 'middle');
  else if (sn) {
    const pv = s.snaps[t - 1], rows = [];
    sn.gone.forEach(g => rows.push({ tag: g.tag, i: g.i, cls: 'gone', v: T('commit ✓', 'confirma ✓') }));
    if (sn.flushed.length && pv) pv.rob.filter(r => sn.flushed.includes(r.i)).forEach(r => rows.push({ tag: r.tag, i: r.i, cls: 'fl', v: T('flushed ✗', 'vaciada ✗') }));
    sn.rob.forEach((r, k) => {
      const x = s.insts[r.i];
      const v = x.ins.k === 'br' ? (r.ready ? (x.taken ? T('taken ✗', 'tomado ✗') : T('not taken ✓', 'no tom. ✓')) : '…')
        : r.ready ? (x.ins.k === 'store' ? `M[${x.addr}]←${fmtV(r.val)}` : fmtV(r.val)) : T('… no result', '… sin result.');
      rows.push({ tag: r.tag, i: r.i, cls: (k === 0 ? 'head ' : '') + (r.wbNow ? 'wbn ' : '') + (x.IS === t ? 'isn' : ''), v, ready: r.ready });
    });
    rows.slice(0, 7).forEach((r, k) => {
      const y = G.rob.y + 24 + k * 27, x = s.insts[r.i];
      h += `<rect x="${G.rob.x + 6}" y="${y}" width="${G.rob.w - 12}" height="23" rx="4" class="rr ${r.cls}"/>`;
      if (/head/.test(r.cls)) h += tx(G.rob.x - 6, y + 16, T('head ▶', 'cabeza ▶'), 'hdl', 'end');
      h += tx(G.rob.x + 12, y + 16, r.tag, 'mono tg') + tx(G.rob.x + 44, y + 16, esc(nm(x)), 'mono') + tx(G.rob.x + G.rob.w - 12, y + 16, esc(r.v), 'mono ' + (r.ready ? 'vl' : 'mt'), 'end');
    });
    if (!rows.length) h += tx(G.rob.x + G.rob.w / 2, G.rob.y + 100, T('empty', 'vacío'), 'mt', 'middle');
  }

  /* registers + register status */
  const pr = s.snaps[t - 1];
  h += rect('reg', G.reg, 'k-reg', T('Registers', 'Registros'), T('value · tag (Qi)', 'valor · etiqueta (Qi)'));
  const rn = s.regNames, cols = 4, rws = Math.ceil(rn.length / cols), ch = (G.reg.h - 22) / Math.max(rws, 1), cw = (G.reg.w - 12) / cols;
  rn.forEach((r, i) => {
    const x = G.reg.x + 6 + (i % cols) * cw, y = G.reg.y + 22 + Math.floor(i / cols) * ch;
    const v = sn ? sn.regs[r] : s.snaps[1] ? (s.snaps[1].regs[r]) : '', q = sn && sn.stat[r];
    const chg = sn && pr && pr.regs[r] !== sn.regs[r];
    h += `<rect x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${ch - 2}" rx="4" class="rc${chg ? ' chg' : ''}"/>`;
    if (ch >= 34) h += tx(x + 6, y + 14, r, 'mono rn') + (q ? tx(x + cw - 6, y + 14, q, 'mono tg', 'end') : '') + tx(x + cw - 6, y + ch - 7, fmtV(v), 'mono', 'end');
    else h += tx(x + 6, y + ch / 2 + 4, r, 'mono rn') + tx(x + cw - 6, y + ch / 2 + 4, q ? `<tspan class="tg">${q}</tspan>` : fmtV(v), 'mono', 'end');
  });

  /* address unit, load/store buffers, memory unit */
  const cell = (V, Q) => (Q != null ? `<tspan class="tg">${Q}</tspan>` : V != null ? `<tspan class="vl">${fmtV(V)}</tspan>` : '');
  const exNow = g => s.insts.filter(x => grpOf(x.ins.k) === g && x.cells[t] === 'EX');
  h += rect('au', G.au, 'k-au', T('Address unit', 'Unidad de direcciones'));
  exNow('mem').forEach(x => (h += tx(G.au.x + G.au.w - 8, G.au.y + 26, esc(nm(x)) + ` @${x.addr}`, 'mono nw', 'end')));
  h += rect('buf', G.buf, 'k-buf', T('Load/store buffers', 'Búferes de carga/alm.'));
  if (sn) {
    const rows = sn.rs.filter(r => isMem(r.k)).flatMap(r => r.rows);
    rows.slice(0, 5).forEach((r, k) => {
      const y = G.buf.y + 22 + k * 20, x = r.i != null ? s.insts[r.i] : null;
      h += `<rect x="${G.buf.x + 4}" y="${y}" width="${G.buf.w - 8}" height="18" rx="3" class="rr ${r.fresh ? 'isn' : ''} ${r.wb ? 'wbn' : ''}"/>`;
      h += tx(G.buf.x + 9, y + 13, r.name, 'mono rn');
      if (x) h += tx(G.buf.x + 58, y + 13, esc(opName(x)), 'mono') + tx(G.buf.x + G.buf.w - 8, y + 13, r.addr != null ? `@${r.addr}${x.ins.k === 'store' ? ' ' + (r.Q[1] != null ? `<tspan class="tg">${r.Q[1]}</tspan>` : '') : ''}` : cell(r.V[0], r.Q[0]), 'mono', 'end');
    });
  }
  h += rect('mu', G.mu, 'k-mu', T('Memory unit', 'Unidad de memoria'));
  s.insts.filter(x => x.cells[t] === (s.sc.mlabel || 'M')).forEach(x => (h += tx(G.mu.x + G.mu.w - 8, G.mu.y + 29, esc(nm(x)), 'mono nw', 'end')));

  /* reservation stations + functional units */
  Object.entries(G.grp).forEach(([k, g]) => {
    const b = { x: g.x, y: g.y, w: g.w, h: g.h };
    h += rect('rs-' + k, b, 'k-rs', T('Stations', 'Estaciones'), RSN[k]);
    const rows = sn ? sn.rs.find(r => r.k === k).rows : [];
    rows.forEach((r, j) => {
      const y = g.y + 22 + j * 20, x = r.i != null ? s.insts[r.i] : null, c4 = g.w / 4;
      h += `<rect x="${g.x + 4}" y="${y}" width="${g.w - 8}" height="18" rx="3" class="rr ${r.fresh ? 'isn' : ''} ${r.wb ? 'wbn' : ''} ${r.run && !r.wb ? 'run' : ''}"/>`;
      h += tx(g.x + 8, y + 13, r.name, 'mono rn');
      if (x) {
        h += tx(g.x + 8 + c4, y + 13, esc(opName(x)), 'mono');
        [0, 1].forEach(q => { const vq = cell(r.V[q], r.Q[q]); if (vq) h += tx(g.x + 8 + c4 * (2 + q) + c4 - 12, y + 13, (r.cap[q] ? '⬇' : '') + vq, 'mono' + (r.cap[q] ? ' capd' : ''), 'end'); });
      }
    });
    const ub = { x: g.ux, y: g.uy, w: g.uw, h: g.uh };
    h += rect('fu-' + k, ub, 'k-fu k-' + k, '');
    h += tx(g.cx, g.uy + 14, U[k] || k, 'bt', 'middle');
    const ex = exNow(k)[0], evx = ex && sn.ev.find(e => e.k === 'ex' && e.i === ex.id);
    h += tx(g.cx, g.uy + 28, ex ? esc(nm(ex)) + (evx && evx.of > 1 ? ` ${evx.n}/${evx.of}` : '') : `${s.lat[k]} ${T('cyc', 'cic')}`, 'mono ' + (ex ? 'nw' : 'mt'), 'middle');
  });

  /* what is on the CDB this cycle */
  if (sn && sn.cdb.length) sn.cdb.forEach((c, i) => {
    const x0 = 300 + i * 200;
    h += `<rect x="${x0 - 70}" y="${G.cdbY - 12}" width="140" height="24" rx="12" class="cdbv"/>` + tx(x0, G.cdbY + 5, `${c.tag} = ${fmtV(c.val)}`, 'mono cdbt', 'middle');
  });
  return h + '</svg>';
}

/* the commit check the user does at the start of every cycle */
function dpCommit(s, t) {
  if (!s.spec) return `<p>${T('No ROB here: a result goes from the CDB <b>straight into the register</b> (if the register status still points to that tag). There is no commit stage, so a branch blocks EX of everything after it.', 'Aquí no hay ROB: el resultado pasa del CDB <b>directamente al registro</b> (si el estado del registro aún apunta a esa etiqueta). No hay etapa de commit, así que un salto bloquea el EX de todo lo que va detrás.')}</p>`;
  const sn = s.snaps[t]; if (!sn) return `<p class="mute">${T('Each cycle, look at the head of the ROB first.', 'En cada ciclo, mira primero la cabeza del ROB.')}</p>`;
  const N = i => `<b>${nm(s.insts[i])}</b>`, pv = s.snaps[t - 1], out = [];
  sn.ev.filter(e => e.k === 'c').forEach(e => {
    const x = s.insts[e.i];
    out.push(`<li class="ok">${sg('C')} ${T(`Head ${e.tag} = ${N(e.i)}: result already in the ROB since its WB (cycle ${x.WB}) → <b>commits</b>`, `Cabeza ${e.tag} = ${N(e.i)}: resultado ya en el ROB desde su WB (ciclo ${x.WB}) → <b>confirma</b>`)}${e.kind === 'reg' ? `: ${e.rd} ← ${vv(e.val)}` : e.kind === 'store' ? `: M[${e.addr}] ← ${vv(e.val)}` : e.mis ? T(': <b>mispredicted</b> → flush next cycle', ': <b>fallo de predicción</b> → vaciado en el ciclo siguiente') : T(': prediction right', ': predicción correcta')}.</li>`);
  });
  const cq = sn.ev.find(e => e.k === 'cq'), cw = sn.ev.find(e => e.k === 'cwait');
  if (cw) out.push(`<li class="no">${sg('WB')} ${N(cw.i)} ${cw.why === 'br' ? T('is done, but a branch committed this cycle → it waits one cycle.', 'ha terminado, pero un salto confirmó en este ciclo → espera un ciclo.') : T('is done, but its unit already committed this cycle → waits.', 'ha terminado, pero su unidad ya confirmó en este ciclo → espera.')}</li>`);
  else if (cq) out.push(`<li class="no">✗ ${T(`Head = ${N(cq.head)}: <b>no result yet</b> → nothing commits. ${cq.ids.map(N).join(', ')} finished but wait behind it.`, `Cabeza = ${N(cq.head)}: <b>sin resultado aún</b> → no confirma nada. ${cq.ids.map(N).join(', ')} terminaron pero esperan detrás.`)}</li>`);
  else if (!out.length) {
    const hd = pv && pv.rob[0];
    if (sn.ev.some(e => e.k === 'cancel')) out.push(`<li class="no">${sg('Cancel')} ${T('The mispredicted branch committed last cycle: the whole ROB is flushed.', 'El salto mal predicho confirmó el ciclo anterior: se vacía todo el ROB.')}</li>`);
    else if (!hd) out.push(`<li class="mute">${T('ROB empty at the start of the cycle: nothing to check.', 'ROB vacío al empezar el ciclo: nada que comprobar.')}</li>`);
    else {
      const x = s.insts[hd.i];
      out.push(`<li class="no">✗ ${x.WB === t ? T(`Head ${hd.tag} = ${N(hd.i)} writes its result <b>in this cycle</b> (WB) → earliest commit is cycle ${t + 1}.`, `Cabeza ${hd.tag} = ${N(hd.i)} escribe su resultado <b>en este ciclo</b> (WB) → como pronto confirma en el ciclo ${t + 1}.`) : T(`Head ${hd.tag} = ${N(hd.i)}: <b>no result yet</b> → nothing commits.`, `Cabeza ${hd.tag} = ${N(hd.i)}: <b>sin resultado aún</b> → no confirma nada.`)}</li>`);
    }
  }
  return `<ul class="dpck">${out.join('')}</ul>`;
}

function dpKey(s, t) {
  const sn = s.snaps[t], act = new Set();
  if (sn) sn.ev.forEach(e => act.add({ if: 'IF', is: 'IS', ex: 'EX', res: 'EX', m: 'M', wb: 'WB', c: 'C', cancel: 'Cancel' }[e.k]));
  const rows = [
    ['IF', T('instruction unit → <b>instruction queue</b>', 'unidad de instrucciones → <b>cola de instrucciones</b>')],
    ['IS', s.spec ? T('queue → <b>operation bus</b> → free station (loads/stores: address unit) + <b>new ROB entry</b>; the ROB tag goes into the register status. Operands arrive on the <b>operand buses</b>, from the registers or from a finished ROB entry; otherwise the station keeps a tag.', 'cola → <b>bus de operación</b> → estación libre (cargas/stores: unidad de direcciones) + <b>nueva entrada ROB</b>; la etiqueta del ROB va al estado del registro. Los operandos llegan por los <b>buses de operandos</b>, de los registros o de una entrada del ROB ya terminada; si no, la estación guarda una etiqueta.')
      : T('queue → <b>operation bus</b> → free station; operands on the <b>operand buses</b> from the registers, or a tag (the station name) if not ready.', 'cola → <b>bus de operación</b> → estación libre; operandos por los <b>buses de operandos</b> desde los registros, o una etiqueta (nombre de estación) si no están listos.')],
    ['EX', T('station → <b>functional unit</b> (loads/stores: address computed in the address unit)', 'estación → <b>unidad funcional</b> (cargas/stores: dirección en la unidad de direcciones)')],
    ['M', T('load buffer → <b>memory unit</b>', 'búfer de carga → <b>unidad de memoria</b>')],
    ['WB', s.spec ? T('unit → <b>CDB</b> → the instruction\'s <b>ROB entry</b> + every station waiting for that tag. Registers are <b>not</b> written.', 'unidad → <b>CDB</b> → la <b>entrada del ROB</b> de la instrucción + toda estación que espera esa etiqueta. Los registros <b>no</b> se escriben.')
      : T('unit → <b>CDB</b> → registers + every station waiting for that tag', 'unidad → <b>CDB</b> → registros + toda estación que espera esa etiqueta')]
  ];
  if (s.spec) rows.push(['C', T('<b>head</b> of the ROB, only if it already has its result → registers (store: memory). Mispredicted branch → flush.', '<b>cabeza</b> del ROB, solo si ya tiene su resultado → registros (store: memoria). Salto mal predicho → vaciado.')]);
  return `<div class="dpkey">${rows.map(([g, d]) => `<div class="${act.has(g) ? 'on' : ''}">${sg(g)}<span>${d}</span></div>`).join('')}</div>`;
}

/* one short line per stage active in this cycle: what moves, on which bus */
function dpStrip(s, t) {
  const sn = s.snaps[t];
  if (!sn) return `<span class="mute">${T('Press → to start. Guess which bus lights up first.', 'Pulsa → para empezar. Adivina qué bus se enciende primero.')}</span>`;
  const N = i => `<b>${nm(s.insts[i])}</b>`, out = [];
  const add = (g, h) => out.push([g, h]);
  sn.ev.forEach(e => {
    switch (e.k) {
      case 'cancel': if (e.ids.length) add('Cancel', T('flush ROB', 'vaciar ROB')); break;
      case 'c': add('C', `${e.tag} ${N(e.i)} → ${e.kind === 'reg' ? `${e.rd}=${vv(e.val)}` : e.kind === 'store' ? `M[${e.addr}]` : e.mis ? T('<b>mispredicted</b>', '<b>fallo</b>') : 'OK'}`); break;
      case 'wb': if (e.val != null) add('WB', `CDB ${qq(e.tag)}=${vv(e.val)} → ${s.spec ? 'ROB' : e.rd}${e.caps.length ? ' + ' + e.caps.map(N).join(', ') : ''}`); else add('WB', `${N(e.i)} → ${s.spec ? 'ROB' : T('done', 'fin')}`); break;
      case 'ex': if (e.n === 1) add('EX', `${N(e.i)}${e.of > 1 ? ` (${e.of} ${T('cyc', 'cic')})` : ''}`); break;
      case 'm': if (e.n === 1) add('M', N(e.i)); break;
      case 'is': add('IS', `${N(e.i)} → ${e.rs}${s.spec ? ` + ROB ${e.tag}` : ''}`); break;
      case 'if': add('IF', N(e.i)); break;
    }
  });
  if (s.spec && !sn.ev.some(e => e.k === 'c' || e.k === 'cancel')) {
    const hd = s.snaps[t - 1] && s.snaps[t - 1].rob[0];
    if (hd) add('C', `<span class="mute">${T('head', 'cabeza')} ${hd.tag} ${N(hd.i)}: ${s.insts[hd.i].WB === t ? T('WB now → commit next cycle', 'WB ahora → confirma el siguiente') : T('no result → wait', 'sin resultado → espera')}</span>`);
  }
  const ord = { Cancel: 0, IF: 1, IS: 2, EX: 3, M: 4, WB: 5, C: 6 };
  out.sort((a, b) => ord[a[0]] - ord[b[0]]);
  return out.map(([g, h]) => `<span class="dpi">${sg(g)} ${h}</span>`).join('') ||`<span class="mute">${T('Nothing moves: everyone waits.', 'No se mueve nada: todos esperan.')}</span>`;
}

View('datapath', {
  icon: '⚡', mins: 15, title: () => T('Datapath: which bus lights up', 'Ruta de datos: qué bus se enciende'),
  desc: () => T('The Tomasulo + ROB block diagram from L3_8. Step a program and see which box and which bus each stage uses, next to the cronogram.', 'El diagrama de bloques de Tomasulo + ROB de L3_8. Avanza un programa y mira qué caja y qué bus usa cada etapa, junto al cronograma.'),
  done: () => ['datapath'],
  render(m, p) {
    const id = DP_IDS.includes(p) ? p : store.get('dpsc', 's13'); store.set('dpsc', id);
    const s = simOf(id), sc = SCEN[id], st = DPS[id] || (DPS[id] = { t: 0 }), G = dpGeom(s), W = dpWires(G), n = Math.max(s.last, 9);
    let timer = null;
    m.innerHTML = `<div class="dphead"><h2>⚡ ${T('Datapath', 'Ruta de datos')}</h2>${scPick('datapath', DP_IDS, id)}</div>
      <div class="mctl dpctl"><button class="btn ghost" data-go="first" title="${T('Restart', 'Reiniciar')}">⏮</button><button class="btn ghost" data-go="back">◀</button>
        <div class="mcyc"><small>${T('cycle', 'ciclo')}</small><b></b></div>
        <button class="btn" data-go="fwd">${T('Next cycle', 'Siguiente ciclo')} ▶</button><button class="btn ghost" data-go="play">▶▶ ${T('Play', 'Auto')}</button>
        <input type="range" min="0" max="${s.last}" value="0" class="mrng"><span class="mute mkb">← →</span></div>
      <div class="dpview"><div class="mcr dpcr"></div><div class="dpstrip"></div><div class="dpwrap"><div class="dpsvg"></div></div></div>
      <details class="dpmore"><summary>${T('Full explanation of this cycle', 'Explicación completa de este ciclo')}</summary>
        <div class="dpgrid"><div class="dpcard"><div class="kicker">${s.spec ? T('Commit check · head of the ROB', 'Comprobación de commit · cabeza del ROB') : T('No commit stage', 'Sin etapa de commit')}</div><div class="dpc"></div>
          <div class="kicker" style="margin-top:12px">${T('This cycle', 'Este ciclo')}</div><div class="dpn"></div></div>
          <div class="dpcard"><div class="kicker">${T('What lights up in each stage', 'Qué se enciende en cada etapa')}</div><div class="dpk"></div></div></div></details>
      ${nextLink('build')}`;
    const E = c => $(c, m);
    function narr(t) {
      if (!t) return `<p class="mute">${T('Press <b>Next cycle</b> (or →). Before each step, say which bus you expect to light up.', 'Pulsa <b>Siguiente ciclo</b> (o →). Antes de cada paso, di qué bus esperas que se encienda.')}</p>`;
      const lines = [], still = [];
      s.snaps[t].ev.forEach(e => {
        if (e.k === 'cq' || e.k === 'cwait') return;
        if ((e.k === 'wait' || e.k === 'stall') && !e.first) { still.push(nm(s.insts[e.i])); return; }
        if ((e.k === 'ex' || e.k === 'm') && e.n > 1 && !e.last) { still.push(`${nm(s.insts[e.i])} ${e.n}/${e.of}`); return; }
        const l = evLine(s, e); if (l) lines.push(l);
      });
      const ord = { Cancel: 0, C: 1, WB: 2, EX: 3, M: 3, IS: 4, IF: 5 };
      lines.sort((a, b) => ord[a[0]] - ord[b[0]]);
      return `<ul class="nar">${lines.map(([g, h]) => `<li>${sg(g)}<span>${h}</span></li>`).join('')}${still.length ? `<li class="still"><span class="sg s-none">···</span><span>${T('No change', 'Sin cambios')}: ${still.join(' · ')}</span></li>` : ''}</ul>`
        + (t === s.last ? `<div class="fb ok">${T(`Finished in <b>${s.last}</b> cycles.`, `Termina en <b>${s.last}</b> ciclos.`)}</div>` : '');
    }
    function draw(moved) {
      const t = st.t;
      E('.mcyc b').textContent = t + ' / ' + s.last; E('.mrng').value = t;
      E('.dpsvg').innerHTML = dpSVG(s, t, G, W);
      E('.dpc').innerHTML = dpCommit(s, t); E('.dpn').innerHTML = narr(t); E('.dpk').innerHTML = dpKey(s, t);
      E('.dpstrip').innerHTML = `<span class="dpcy">${T('Cycle', 'Ciclo')} ${t}</span>` + dpStrip(s, t);
      fit();
      const rows = s.insts.map(x => ({ text: x.ins.text, cells: x.cells, x })).filter(r => r.x.IF <= t || r.x.id === r.x.ins.idx);
      E('.mcr').innerHTML = cronoHTML(rows, n, { upto: t, cur: t || null });
      $$('.cr thead th', m).forEach((th, i) => { if (i > 0 && i <= s.last) { th.style.cursor = 'pointer'; th.onclick = () => { stop(); st.t = i; draw(true); }; } });
      $('[data-go="fwd"]', m).disabled = t >= s.last; $('[data-go="back"]', m).disabled = t <= 0;
      if (moved) {
        const k = s.snaps[t] ? s.snaps[t].ev : [];
        if (t === s.last) { sfx.win(); markDone('datapath'); }
        else if (k.some(e => e.k === 'cancel')) sfx.flush();
        else if (k.some(e => e.k === 'c')) sfx.commit();
        else if (k.some(e => e.k === 'wb' && e.val != null)) sfx.cdb();
        else sfx.tick();
        const w = E('.crw'), c = $('.cr thead th.cur', m);
        if (w && c) w.scrollLeft = Math.max(0, c.offsetLeft - w.clientWidth * 0.6);
      }
    }
    /* size the diagram so controls + cronogram + diagram fit in one screen */
    function fit() {
      const svg = $('.dp', m); if (!svg) return;
      svg.style.maxHeight = Math.max(340, innerHeight - (svg.getBoundingClientRect().top + scrollY) - 14) + 'px';
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; $('[data-go="play"]', m).innerHTML = `▶▶ ${T('Play', 'Auto')}`; } }
    function go(d) {
      if (d === 'fwd') { if (st.t >= s.last) return stop(); st.t++; draw(true); if (st.t >= s.last) stop(); return; }
      stop();
      if (d === 'back') st.t = Math.max(0, st.t - 1);
      if (d === 'first') st.t = 0;
      draw(); sfx.tick();
    }
    $$('[data-go]', m).forEach(b => (b.onclick = () => {
      if (b.dataset.go !== 'play') return go(b.dataset.go);
      if (timer) return stop();
      if (st.t >= s.last) st.t = 0;
      b.innerHTML = `❚❚ ${T('Pause', 'Pausa')}`; go('fwd'); timer = setInterval(() => go('fwd'), 1600);
    }));
    E('.mrng').oninput = e => { stop(); st.t = +e.target.value; draw(); };
    const key = e => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'range') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go('fwd'); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go('back'); }
    };
    document.addEventListener('keydown', key);
    addEventListener('resize', fit);
    onLeave(() => { stop(); document.removeEventListener('keydown', key); removeEventListener('resize', fit); });
    draw();
  }
});
