'use strict';
/* Cronogram renderer + the step-through machine (cronogram, narration, live datapath, course tables). */

const STG = { IF: 'if', IS: 'is', ID: 'is', RO: 'ro', EX: 'ex', M: 'm', MEM: 'm', WB: 'wb', C: 'c', Cancel: 'x' };
const sg = (v, t) => `<span class="sg s-${STG[v] || v}">${t || v}</span>`;

/* rows: [{text, cells:{cycle:label}}]; '-' takes the colour of the stage it is waiting in, as in the course */
function cronoHTML(rows, n, o = {}) {
  const up = o.upto == null ? n : o.upto;
  let h = `<div class="crw"><table class="cr ${o.five ? 'five' : ''}"><thead><tr><th class="cri">${T('Instruction', 'Instrucción')}</th>`;
  for (let c = 1; c <= n; c++) h += `<th class="${c === o.cur ? 'cur' : ''}">${c}</th>`;
  h += '</tr></thead><tbody>';
  rows.forEach((r, ri) => {
    h += `<tr data-r="${ri}" class="${o.hl && o.hl.has(ri) ? 'hl' : ''}"><th class="cri">${r.text}</th>`;
    let prev = '';
    for (let c = 1; c <= n; c++) {
      const v = c <= up ? r.cells[c] : null;
      if (!v) { h += `<td class="${c === o.cur ? 'cur' : ''}"></td>`; continue; }
      if (v !== '-') prev = STG[v];
      const nt = o.notes && o.notes[ri + ',' + c];
      h += `<td class="s-${prev}${v === '-' ? ' w' : ''}${c === o.cur ? ' cur new' : ''}">${v === '-' ? '–' : v}${nt ? `<sup>${nt}</sup>` : ''}</td>`;
    }
    h += '</tr>';
  });
  return h + '</tbody></table></div>';
}
const stageKey = (extra = '') => `<div class="skey">${sg('IF')}${sg('IS')}${sg('EX')}${sg('M')}${sg('WB')}${extra}<span class="sg s-is w">–</span><small>${T('waiting', 'espera')}</small></div>`;

const opName = x => x.ins.text.replace(/^\w+:\s*/, '').split(/\s+/)[0];
const nm = x => opName(x) + (x.ins.rd ? ' ' + x.ins.rd : x.ins.k === 'store' ? ' ' + x.ins.src[1] : '');
const UNIT = () => ({ add: T('Adder', 'Sumador'), sub: T('Subtractor', 'Restador'), mul: T('Multiplier', 'Multiplicador'), div: T('Divider', 'Divisor'), log: T('Logic', 'Lógica'), br: T('Branch', 'Salto') });
const vv = v => `<span class="vch">${v}</span>`, qq = v => `<span class="tch">${v}</span>`;

/* one narration line per event: [stage, html] */
function evLine(s, e) {
  const X = i => s.insts[i], N = i => `<b>${nm(X(i))}</b>`, spec = s.spec, U = UNIT();
  switch (e.k) {
    case 'if': return ['IF', T(`${N(e.i)} is fetched.`, `Se capta ${N(e.i)}.`)];
    case 'is': {
      const ops = e.ops.filter((o, j) => o.from !== 'zero' && e.ops.findIndex(p => p.r === o.r) === j).map(o => (o.q ? T(`${o.r} not ready → tag ${qq(o.q)}`, `${o.r} no está listo → etiqueta ${qq(o.q)}`)
        : o.from === 'rob' ? T(`${o.r} = ${vv(o.v)} read from ROB ${o.tag}`, `${o.r} = ${vv(o.v)} leído del ROB ${o.tag}`) : `${o.r} = ${vv(o.v)}`)).join(', ');
      let h = T(`${N(e.i)} → station <b>${e.rs}</b>${spec ? ` + ROB <b>${e.tag}</b>` : ''}.`, `${N(e.i)} → estación <b>${e.rs}</b>${spec ? ` + ROB <b>${e.tag}</b>` : ''}.`) + (ops ? ` ${ops}.` : '');
      if (e.rd) h += ' ' + T(`${e.rd} now points to ${qq(e.tag)}.`, `${e.rd} apunta ahora a ${qq(e.tag)}.`);
      if (e.prev) h += ` <span class="hz waw">WAW</span> ` + T(`${e.rd} pointed to ${e.prev}: the older writer can no longer reach the register.`, `${e.rd} apuntaba a ${e.prev}: el escritor antiguo ya no puede llegar al registro.`);
      if (e.war && e.war.length) h += ` <span class="hz war">WAR</span> ` + T(`${e.war.map(N).join(', ')} already ${e.war.length > 1 ? 'hold' : 'holds'} the old ${e.rd} (value or tag) from issue.`, `${e.war.map(N).join(', ')} ya ${e.war.length > 1 ? 'tienen' : 'tiene'} el ${e.rd} antiguo (valor o etiqueta) desde la emisión.`);
      return ['IS', h];
    }
    case 'stall': return ['IF', e.why === 'rs' ? T(`${N(e.i)} cannot be issued: no free ${RSN[X(e.i).ins.k]} station. It stays in the queue and holds up IF.`, `${N(e.i)} no puede emitirse: no hay estación ${RSN[X(e.i).ins.k]} libre. Se queda en la cola y detiene IF.`)
      : T(`${N(e.i)} cannot be issued: the ROB is full.`, `${N(e.i)} no puede emitirse: el ROB está lleno.`)];
    case 'wait':
      if (e.why === 'op') return ['IS', `<span class="hz raw">RAW</span> ` + T(`${N(e.i)} waits in its station for ${e.q.map(qq).join(', ')} on the CDB.`, `${N(e.i)} espera en su estación a ${e.q.map(qq).join(', ')} por el CDB.`)];
      if (e.why === 'br') return ['IS', T(`${N(e.i)} has its operands but may not execute until ${N(e.by)} resolves: no speculation.`, `${N(e.i)} tiene sus operandos pero no puede ejecutar hasta que se resuelva ${N(e.by)}: sin especulación.`)];
      if (e.why === 'fu') return ['IS', T(`${N(e.i)} is ready, but the ${U[X(e.i).ins.k] || T('unit', 'unidad')} is busy${e.by != null ? ` with ${N(e.by)}` : ''}.`, `${N(e.i)} está lista, pero ${U[X(e.i).ins.k] || 'la unidad'} está ocupado${e.by != null ? ` con ${N(e.by)}` : ''}.`)];
      return ['EX', T(`${N(e.i)} has its address but holds before M: ${N(e.by)} is an earlier access to memory that must go first.`, `${N(e.i)} tiene su dirección pero espera antes de M: ${N(e.by)} es un acceso anterior a memoria que debe ir primero.`)];
    case 'ex': {
      const x = X(e.i), k = x.ins.k;
      if (k === 'load' || k === 'store') return ['EX', T(`${N(e.i)} computes its address: ${x.ins.imm} + ${x.ins.src[0]} = ${vv(e.addr)}.`, `${N(e.i)} calcula su dirección: ${x.ins.imm} + ${x.ins.src[0]} = ${vv(e.addr)}.`)];
      const c = e.of > 1 ? ` (${e.n}/${e.of})` : '';
      return ['EX', e.n === 1 ? T(`${N(e.i)} starts executing${c}: all operands present.`, `${N(e.i)} empieza a ejecutar${c}: tiene todos los operandos.`) : T(`${N(e.i)} executing${c}.`, `${N(e.i)} ejecutando${c}.`)];
    }
    case 'm': {
      const x = X(e.i), c = e.of > 1 ? ` (${e.n}/${e.of})` : '';
      if (!e.last) return ['M', T(`${N(e.i)} memory access${c}.`, `${N(e.i)} acceso a memoria${c}.`)];
      return ['M', x.ins.k === 'load' ? T(`${N(e.i)} reads M[${e.addr}] = ${vv(e.val)}${c}.`, `${N(e.i)} lee M[${e.addr}] = ${vv(e.val)}${c}.`) : T(`${N(e.i)} writes M[${e.addr}] = ${vv(e.val)}${c}.`, `${N(e.i)} escribe M[${e.addr}] = ${vv(e.val)}${c}.`)];
    }
    case 'res': return ['EX', T(`${N(e.i)} resolves: ${e.taken ? 'taken — the prediction (not taken) was wrong' : 'not taken — the prediction was right'}.`, `${N(e.i)} se resuelve: ${e.taken ? 'tomado — la predicción (no tomado) era errónea' : 'no tomado — la predicción era correcta'}.`)];
    case 'wb': {
      const x = X(e.i);
      if (e.val == null) return ['WB', x.ins.k === 'store' && spec ? T(`${N(e.i)}: address and value now sit in ROB ${e.tag}. Memory is untouched.`, `${N(e.i)}: dirección y valor quedan en el ROB ${e.tag}. La memoria no se toca.`)
        : T(`${N(e.i)} finishes and frees its station; nothing to broadcast.`, `${N(e.i)} termina y libera su estación; nada que difundir.`)];
      let h = T(`${N(e.i)} broadcasts ${qq(e.tag)} = ${vv(e.val)} on the CDB`, `${N(e.i)} difunde ${qq(e.tag)} = ${vv(e.val)} por el CDB`);
      h += e.caps.length ? T(`; ${e.caps.map(N).join(', ')} capture${e.caps.length > 1 ? '' : 's'} it.`, `; ${e.caps.map(N).join(', ')} lo captura${e.caps.length > 1 ? 'n' : ''}.`) : '.';
      if (spec) h += ' ' + T(`The value goes into ROB ${e.tag}; ${e.rd} itself is not written yet.`, `El valor va al ROB ${e.tag}; ${e.rd} aún no se escribe.`);
      else if (e.wrote) h += ' ' + T(`${e.rd} ← ${vv(e.val)}.`, `${e.rd} ← ${vv(e.val)}.`);
      else h += ` <span class="hz waw">WAW</span> ` + T(`${e.rd} is <b>not</b> written: its status ${e.now ? `points to ${e.now}` : 'no longer points to ' + e.tag}.`, `${e.rd} <b>no</b> se escribe: su estado ${e.now ? `apunta a ${e.now}` : 'ya no apunta a ' + e.tag}.`);
      return ['WB', h];
    }
    case 'c':
      if (e.kind === 'reg') return ['C', T(`${N(e.i)} commits from the head: ${e.rd} ← ${vv(e.val)}. ROB ${e.tag} freed.`, `${N(e.i)} confirma desde la cabeza: ${e.rd} ← ${vv(e.val)}. Se libera ROB ${e.tag}.`)];
      if (e.kind === 'store') return ['C', T(`${N(e.i)} commits: M[${e.addr}] ← ${vv(e.val)}. Memory is written only now.`, `${N(e.i)} confirma: M[${e.addr}] ← ${vv(e.val)}. La memoria se escribe solo ahora.`)];
      return ['C', e.mis ? T(`${N(e.i)} commits: <b>mispredicted</b>. Everything younger is flushed next cycle and fetch restarts at ${e.target}.`, `${N(e.i)} confirma: <b>fallo de predicción</b>. Todo lo posterior se vacía el ciclo siguiente y la captación reinicia en ${e.target}.`)
        : T(`${N(e.i)} commits: prediction right, nothing to undo. What follows stops being speculative at the end of this cycle.`, `${N(e.i)} confirma: predicción correcta, nada que deshacer. Lo que sigue deja de ser especulativo al final de este ciclo.`)];
    case 'cwait': return ['WB', e.why === 'br' ? T(`${N(e.i)} is next, but the branch commits in this cycle: it stays speculative until the cycle ends.`, `${N(e.i)} es la siguiente, pero el salto confirma en este ciclo: sigue siendo especulativa hasta que acabe.`)
      : T(`${N(e.i)} is next, but its functional unit already committed one instruction this cycle.`, `${N(e.i)} es la siguiente, pero su unidad funcional ya confirmó una instrucción en este ciclo.`)];
    case 'cq': return ['WB', T(`${e.ids.map(N).join(', ')} finished but cannot commit: ${N(e.head)} at the head of the ROB is not done.`, `${e.ids.map(N).join(', ')} han terminado pero no pueden confirmar: ${N(e.head)}, en la cabeza del ROB, no ha acabado.`)];
    case 'cancel': return ['Cancel', (e.ids.length ? T(`${e.ids.map(N).join(', ')} cancelled: wrong path.`, `${e.ids.map(N).join(', ')} canceladas: camino erróneo.`) : '') + ' ' +
      (spec ? T('The ROB is emptied; no register or memory ever saw their results.', 'El ROB se vacía; ningún registro ni la memoria vieron sus resultados.') : '') + ' ' +
      (e.refetch ? T(`Fetch restarts at ${e.target} in this cycle.`, `La captación reinicia en ${e.target} en este ciclo.`) : T(`The target (${e.target}) was already fetched, because it is also the next instruction, so it carries on.`, `El destino (${e.target}) ya estaba captado, porque es también la siguiente instrucción, así que continúa.`))];
  }
  return null;
}

const MS = {};
function Machine(host, id, opt = {}) {
  const sc = SCEN[id], s = simOf(id), st = MS[id] || (MS[id] = { t: 0, asked: {}, sel: null, ask: null });
  const spec = s.spec, U = UNIT(), n = Math.max(s.last, 9), G = dpGeom(s), W = dpWires(G);
  let timer = null;
  const pills = [];
  ['mul', 'div', 'add', 'sub', 'log', 'br'].forEach(k => { if (s.order.includes(k)) pills.push(`<span><b>${U[k]}</b> ${s.lat[k]} ${T('cyc', 'cic')}</span>`); });
  if (s.order.includes('load') || s.order.includes('store')) pills.push(`<span><b>${T('Memory', 'Memoria')}</b> 1 EX + ${s.memLat} ${sc.mlabel || 'M'}</span>`);
  if (spec) pills.push(`<span class="alt"><b>ROB</b> · ${T('predict not taken', 'predice no tomado')}</span>`);
  if (!spec && s.order.includes('br')) pills.push(`<span class="alt">${T('predict not taken, no speculation', 'predice no tomado, sin especulación')}</span>`);
  if (sc.rs) Object.keys(sc.rs).forEach(k => { if (sc.rs[k] < 2) pills.push(`<span class="alt">${sc.rs[k]} ${RSN[k]} ${T('station', 'estación')}</span>`); });
  const dn = d => `${opName({ ins: s.prog[d.a] })} → ${opName({ ins: s.prog[d.b] })}`;
  const noteIx = {}, notes = (sc.notes || []);
  notes.forEach((nt, i) => { if (nt.r != null) noteIx[nt.r + ',' + nt.c] = i + 1; });

  host.innerHTML = `<div class="mach">
    <div class="mhead"><div class="mtitle"><h3>${sc.title()}</h3>${sc.kind === 'mine' ? `<span class="kb k-m">${T('extra case', 'caso extra')}</span>` : ''}${sref(sc.src)}</div>
      <p class="watch">👁 ${sc.watch()}</p>
      <div class="chips cfgp">${pills.join('')}</div>
      <div class="deps">${s.deps.map((d, i) => `<button class="dep ${d.t.toLowerCase()}" data-d="${i}"><b>${d.t}</b> ${d.r} · ${dn(d)}</button>`).join('') || `<span class="mute">${T('No dependencies', 'Sin dependencias')}</span>`}</div>
      <div class="depx"></div></div>
    <div class="mctl"><button class="btn ghost" data-go="first" title="${T('Restart', 'Reiniciar')}">⏮</button><button class="btn ghost" data-go="back">◀</button>
      <div class="mcyc"><small>${T('cycle', 'ciclo')}</small><b></b></div>
      <button class="btn" data-go="fwd">${T('Next cycle', 'Siguiente ciclo')} ▶</button><button class="btn ghost" data-go="play">▶▶ ${T('Play', 'Auto')}</button>
      <input type="range" min="0" max="${s.last}" value="0" class="mrng"><span class="mute mkb">← →</span></div>
    <div class="mslot"></div>
    <div class="mcr"></div>${stageKey(spec ? sg('C') + sg('Cancel') : s.order.includes('br') ? sg('Cancel') : '')}
    <div class="mnotes"></div>
    <div class="mnar"></div>
    <div class="mdp"><div class="dpwrap"><div class="dpsvg"></div></div><div class="dpx"></div></div>
    <div class="mtabs"></div></div>`;
  const E = c => $(c, host);
  dpBind(E('.mdp'), spec);

  function tables(t) {
    const sn = s.snaps[t], pv = s.snaps[t - 1];
    if (!sn) return `<p class="mute">${T('The tables fill in as soon as the first instruction is issued.', 'Las tablas se rellenan en cuanto se emite la primera instrucción.')}</p>`;
    const hasMem = s.order.includes('load') || s.order.includes('store');
    let h = `<div class="tgrid"><div><h4>${T('Reservation stations and buffers', 'Estaciones de reserva y búferes')}</h4><div class="tw"><table class="mt"><thead><tr><th>${T('Name', 'Nombre')}</th><th>Busy</th><th>Op</th><th>Vj</th><th>Vk</th><th>Qj</th><th>Qk</th>${hasMem ? '<th>A</th>' : ''}${spec ? '<th>Dest</th>' : ''}<th></th></tr></thead><tbody>`;
    sn.rs.forEach(g => g.rows.forEach(r => {
      if (r.i == null) { h += `<tr class="free"><td>${r.name}</td><td>${T('no', 'no')}</td><td colspan="${5 + (hasMem ? 1 : 0) + (spec ? 1 : 0) + 1}"></td></tr>`; return; }
      const cell = j => (r.V[j] != null ? `<span class="vch${r.cap[j] ? ' cap' : ''}">${r.V[j]}</span>` : ''), qc = j => (r.Q[j] != null ? qq(r.Q[j]) : '');
      const state = r.wb ? T('→ CDB, frees', '→ CDB, se libera') : r.run ? T('executing', 'ejecutando') : r.Q.some(q => q != null) ? T('waiting', 'esperando') : T('ready', 'lista');
      h += `<tr class="${r.fresh ? 'fresh' : ''}${r.wb ? ' wbr' : ''}${r.run && !r.wb ? ' run' : ''}"><td><b>${r.name}</b></td><td>${T('yes', 'sí')}</td><td>${r.op.toUpperCase()}</td><td>${cell(0)}</td><td>${cell(1)}</td><td>${qc(0)}</td><td>${qc(1)}</td>${hasMem ? `<td>${g.k === 'load' || g.k === 'store' ? (r.addr != null ? `<b>${r.addr}</b>` : r.imm) : ''}</td>` : ''}${spec ? `<td>${r.tag}</td>` : ''}<td class="stt">${state}</td></tr>`;
    }));
    h += `</tbody></table></div></div><div><h4>${T('Register status', 'Estado de los registros')} <small>Qi</small></h4><div class="regs">${s.regNames.map(r => {
      const ch = pv && (pv.regs[r] !== sn.regs[r]), qch = (pv ? pv.stat[r] : undefined) !== sn.stat[r];
      return `<div class="rg${ch ? ' chg' : ''}"><b>${r}</b><span class="${qch ? 'chg' : ''}">${sn.stat[r] ? qq(sn.stat[r]) : '·'}</span><i>${sn.regs[r]}</i></div>`;
    }).join('')}</div>${hasMem && sn.mem.length ? `<h4 style="margin-top:12px">${T('Memory touched', 'Memoria tocada')}</h4><div class="regs">${sn.mem.map(([a, v]) => `<div class="rg${pv && !pv.mem.some(([b, w]) => b === a && w === v) ? ' chg' : ''}"><b>M[${a}]</b><i>${v}</i></div>`).join('')}</div>` : ''}</div></div>`;
    if (spec) {
      const X = i => s.insts[i], stt = r => ({ is: T('issued, waiting', 'emitida, espera'), ex: T('executing', 'ejecutando'), done: T('executed', 'ejecutada'), wb: T('result ready', 'resultado listo') }[r.st]);
      const dest = x => (x.ins.rd || (x.ins.k === 'store' ? (x.addr != null ? `M[${x.addr}]` : 'Mem') : '—'));
      const val = (x, r) => (x.ins.k === 'br' ? (x.exE != null && x.exE <= t ? (x.taken ? T('taken ✗', 'tomado ✗') : T('not taken ✓', 'no tomado ✓')) : '') : r.ready || r.val != null ? vv(r.val) : '');
      const row = (r, cls, lab) => `<tr class="${cls}"><td>${lab}</td><td><b>${r.tag}</b></td><td class="mono">${X(r.i).ins.text.replace(/^\w+:\s*/, '')}</td><td>${cls === 'gone' ? T('committed ✓', 'confirmada ✓') : cls === 'fl' ? T('flushed', 'vaciada') : stt(r)}</td><td>${dest(X(r.i))}</td><td>${val(X(r.i), r)}</td></tr>`;
      h += `<h4>${T('Reorder buffer', 'Búfer de reordenación')} <small>ROB · ${T('commit only from the head', 'solo se confirma desde la cabeza')}</small></h4><div class="tw"><table class="mt rob"><thead><tr><th></th><th>${T('Entry', 'Entrada')}</th><th>${T('Instruction', 'Instrucción')}</th><th>${T('State', 'Estado')}</th><th>Dest</th><th>${T('Value', 'Valor')}</th></tr></thead><tbody>`;
      sn.gone.forEach(g => (h += row({ tag: g.tag, i: g.i, ready: true, val: g.val }, 'gone', '✓')));
      if (sn.flushed.length && pv) pv.rob.filter(r => sn.flushed.includes(r.i)).forEach(r => (h += row(r, 'fl', '✗')));
      sn.rob.forEach((r, k) => (h += row(r, (k === 0 ? 'head' : '') + (r.wbNow ? ' fresh' : ''), k === 0 ? `<span class="hd">${T('head', 'cabeza')} ▶</span>` : '')));
      if (!sn.rob.length && !sn.gone.length && !sn.flushed.length) h += `<tr class="free"><td colspan="6">${T('empty', 'vacío')}</td></tr>`;
      h += '</tbody></table></div>';
    }
    return h;
  }
  function narr(t) {
    if (t === 0) return `<div class="nar0">${T('Press <b>Next cycle</b> (or →) and say what you expect before each step.', 'Pulsa <b>Siguiente ciclo</b> (o →) y di qué esperas antes de cada paso.')}</div>`;
    const still = [], lines = [];
    s.snaps[t].ev.forEach(e => {
      if ((e.k === 'wait' || e.k === 'stall') && !e.first) { still.push(nm(s.insts[e.i])); return; }
      if ((e.k === 'ex' || e.k === 'm') && e.n > 1 && !e.last) { still.push(`${nm(s.insts[e.i])} ${e.n}/${e.of}`); return; }
      const l = evLine(s, e); if (l) lines.push([l[0], l[1], e.k === 'res' ? 0.5 : 0]);
    });
    const ord = { Cancel: 0, C: 1, WB: 2, EX: 3, M: 3, IS: 4, IF: 5 };
    lines.sort((a, b) => ord[a[0]] + a[2] - ord[b[0]] - b[2]);
    return `<ul class="nar">${lines.map(([g, h]) => `<li>${sg(g)}<span>${h}</span></li>`).join('')}${still.length ? `<li class="still"><span class="sg s-none">···</span><span>${T('No change', 'Sin cambios')}: ${still.join(' · ')}</span></li>` : ''}</ul>`
      + (t === s.last ? `<div class="fb ok">${T(`Finished in <b>${s.last}</b> cycles.`, `Termina en <b>${s.last}</b> ciclos.`)} ${opt.end ? opt.end() : ''}</div>` : '');
  }
  function draw(moved) {
    const t = st.t;
    $('.mcyc b', host).textContent = t + ' / ' + s.last;
    E('.mrng').value = t;
    const rows = s.insts.map((x, i) => ({ text: x.ins.text, cells: x.cells, i })).filter(r => s.insts[r.i].IF <= t || s.insts[r.i].id === s.insts[r.i].ins.idx);
    const hl = st.sel != null ? new Set(rows.map((r, k) => (s.insts[r.i].id === s.insts[r.i].ins.idx && (r.i === s.deps[st.sel].a || r.i === s.deps[st.sel].b) ? k : -1)).filter(k => k >= 0)) : null;
    E('.mcr').innerHTML = cronoHTML(rows, n, { upto: t, cur: t || null, notes: noteIx, hl });
    E('.mnotes').innerHTML = notes.map((nt, i) => (nt.r != null && nt.c > t ? '' : `<p class="mnote"><b>${nt.r != null ? i + 1 : 'ⓘ'}</b> ${nt.t()}</p>`)).join('');
    if (!st.ask) { E('.mslot').innerHTML = ''; E('.mnar').innerHTML = narr(t); }
    fwdLabel();
    E('.mdp .dpsvg').innerHTML = dpSVG(s, t, G, W, { noRob: !spec }); dpPaint(E('.mdp'));
    E('.mtabs').innerHTML = tables(t);
    $('[data-go="fwd"]', host).disabled = t >= s.last; $('[data-go="back"]', host).disabled = t <= 0;
    $$('.dep', host).forEach(b => b.classList.toggle('on', +b.dataset.d === st.sel));
    if (moved) {
      const k = s.snaps[t] ? s.snaps[t].ev : [];
      if (t === s.last) { sfx.win(); if (opt.onEnd) opt.onEnd(); }
      else if (k.some(e => e.k === 'cancel')) sfx.flush();
      else if (k.some(e => e.k === 'c')) sfx.commit();
      else if (k.some(e => e.k === 'wb' && e.val != null)) sfx.cdb();
      else if (k.some(e => (e.k === 'wait' || e.k === 'stall') && e.first)) sfx.wait();
      else sfx.tick();
      const cur = $('.cr td.cur.new', host); if (cur && cur.scrollIntoView) { const w = E('.crw'), c = $('.cr thead th.cur', host); if (c) { const l = c.offsetLeft - w.clientWidth * 0.6; if (l > w.scrollLeft || c.offsetLeft < w.scrollLeft + 160) w.scrollLeft = Math.max(0, l); } }
    }
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; $('[data-go="play"]', host).innerHTML = `▶▶ ${T('Play', 'Auto')}`; } }
  function fwdLabel() {
    const b = $('[data-go="fwd"]', host);
    b.innerHTML = st.ask ? `${T('Answer the question', 'Responde la pregunta')} ↓` : `${T('Next cycle', 'Siguiente ciclo')} ▶`;
    b.classList.toggle('waitq', !!st.ask);
  }
  function showAsk() {
    const q = $('.mask', host); if (!q) return;
    const r = q.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight) window.scrollTo(0, r.top + scrollY - 140);
    q.classList.toggle('shake', false); void q.offsetWidth; q.classList.add('shake');
  }
  function askFor(nt) {
    const a = (sc.asks || []).find(q => q.at === nt && !st.asked[nt]);
    if (!a) return false;
    stop(); st.ask = nt;
    const opts = a.o();
    E('.mslot').innerHTML = `<div class="quiz mask"><div class="kicker">${T('Before cycle', 'Antes del ciclo')} ${nt}</div><div class="qq">${a.q()}</div><div class="qa">${opts.map((o, k) => `<button class="opt" data-k="${k}">${o}</button>`).join('')}</div><div class="qfb"></div><button class="chipb mskip">${T('Skip the question', 'Saltar la pregunta')} →</button></div>`;
    $('.mskip', host).onclick = () => { st.asked[nt] = true; st.ask = null; st.t = nt; draw(true); };
    $$('.mask .opt', host).forEach(b => (b.onclick = () => {
      if (+b.dataset.k === a.a) {
        b.classList.add('right'); sfx.ok(); st.asked[nt] = true; $('.mskip', host).style.display = 'none';
        $$('.mask .opt', host).forEach(x => (x.disabled = true));
        $('.mask .qfb', host).innerHTML = `<div class="fb ok"><b>✓</b> ${a.why()}</div><button class="btn" data-run>${T('Run cycle', 'Ejecutar ciclo')} ${nt} ▶</button>`;
        const r = $('[data-run]', host); r.onclick = () => { st.ask = null; st.t = nt; draw(true); }; r.focus({ preventScroll: true });
      } else { b.classList.add('wrong'); b.disabled = true; sfx.bad(); }
    }));
    fwdLabel(); showAsk(); sfx.pop();
    return true;
  }
  function go(d) {
    if (d === 'fwd') { if (st.ask) { showAsk(); sfx.wait(); return; } if (st.t >= s.last) return stop(); if (askFor(st.t + 1)) return; st.t++; draw(true); if (st.t >= s.last) stop(); return; }
    st.ask = null; stop();
    if (d === 'back') st.t = Math.max(0, st.t - 1);
    if (d === 'first') st.t = 0;
    draw(); sfx.tick();
  }
  $$('[data-go]', host).forEach(b => (b.onclick = () => {
    const d = b.dataset.go;
    if (d !== 'play') return go(d);
    if (timer) return stop();
    if (st.t >= s.last) st.t = 0;
    b.innerHTML = `❚❚ ${T('Pause', 'Pausa')}`; go('fwd'); timer = setInterval(() => go('fwd'), 1300);
  }));
  E('.mrng').oninput = e => { stop(); st.ask = null; st.t = +e.target.value; draw(); };
  $$('.dep', host).forEach(b => (b.onclick = () => {
    const i = +b.dataset.d, d = s.deps[i]; st.sel = st.sel === i ? null : i; sfx.tick();
    const tx = { RAW: T('A real data dependency: the reader needs the value. It waits in its station with the producer\'s tag until the value appears on the CDB.', 'Dependencia real de datos: el lector necesita el valor. Espera en su estación con la etiqueta del productor hasta que el valor aparece en el CDB.'),
      WAR: T('Only the name is shared. The earlier reader took the value (or a tag) at issue, so the later writer never has to wait.', 'Solo se comparte el nombre. El lector anterior tomó el valor (o una etiqueta) en la emisión, así que el escritor posterior nunca espera.'),
      WAW: T('Only the name is shared. The register status points to the newest writer, so the two can finish in any order.', 'Solo se comparte el nombre. El estado del registro apunta al escritor más reciente, así que pueden terminar en cualquier orden.') }[d.t];
    E('.depx').innerHTML = st.sel == null ? '' : `<p class="depn ${d.t.toLowerCase()}"><b>${d.t} ${T('on', 'sobre')} ${d.r}</b> · ${tx}</p>`;
    draw();
  }));
  const key = e => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'range') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go('fwd'); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go('back'); }
  };
  document.addEventListener('keydown', key);
  onLeave(() => { stop(); document.removeEventListener('keydown', key); });
  st.ask = null; draw();
  return { stop, unbind: () => { stop(); document.removeEventListener('keydown', key); } };
}
