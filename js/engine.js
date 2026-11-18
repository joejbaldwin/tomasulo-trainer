'use strict';
/* Tomasulo simulator, with and without speculation (ROB), following the course's cronogram conventions.
   Pure logic, no DOM: simulate(scenario) -> { prog, insts, snaps, last, order, regNames, deps }.

   Timing rules (source in brackets):
   - IF one per cycle; the next IF happens when the previous instruction leaves for IS      [E3_6 solution]
   - IS in order, one per cycle, needs a free station (and ROB entry when speculating)      [L3_7 s8, L3_8 s7]
   - a consumer starts EX the cycle after its producer's last EX/M = the producer's WB cycle [L3_7 s13-15]
   - load/store: EX (address) then M; WB is the cycle after the last EX/M                    [L3_7 s9, E3_6]
   - no speculation: nothing after an unresolved branch starts EX                            [E3_8 solution]
   - speculation: commit in order, after WB; nothing commits in the cycle a branch commits   [L3_8 s13, s15]
*/

const OPK = { ld: 'load', lw: 'load', sd: 'store', sw: 'store', addd: 'add', add: 'add', addi: 'add', subd: 'sub', sub: 'sub',
  muld: 'mul', mult: 'mul', mul: 'mul', divd: 'div', div: 'div', or: 'log', and: 'log', beq: 'br', bne: 'br', bneq: 'br' };
const RSN = { load: 'Load', store: 'Store', add: 'Add', sub: 'Sub', mul: 'Mult', div: 'Div', log: 'Log', br: 'Br' };
const KORD = ['load', 'store', 'add', 'sub', 'mul', 'div', 'log', 'br'];
const FN = { add: (a, b) => a + b, sub: (a, b) => a - b, mul: (a, b) => a * b, div: (a, b) => (b === 0 ? 0 : a / b), log: (a, b) => a | b };
const isZ = r => /^(x0|r0|zero)$/i.test(r);
const r2 = v => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

function parseIns(s, idx) {
  let t = s.trim(), label = null;
  const m = t.match(/^(\w+):\s*(.*)$/);
  if (m) { label = m[1]; t = m[2]; }
  const sp = t.search(/\s/), op = t.slice(0, sp).toLowerCase(), a = t.slice(sp + 1).split(/[,\s]+/).filter(Boolean), k = OPK[op];
  const ins = { idx, text: s.trim(), op, k, label, src: [], rd: null, imm: null };
  if (k === 'load' || k === 'store') {
    const mm = a[1].match(/^(-?\d+)\((\w+)\)$/);
    ins.imm = +mm[1]; ins.src = [mm[2]];
    if (k === 'load') ins.rd = a[0]; else ins.src.push(a[0]);
  } else if (k === 'br') { ins.src = [a[0], a[1]]; ins.target = a[2]; }
  else { ins.rd = a[0]; ins.src = [a[1]]; if (/^-?\d+$/.test(a[2])) ins.imm = +a[2]; else ins.src.push(a[2]); }
  if (ins.rd && isZ(ins.rd)) ins.rd = null;
  return ins;
}

/* static dependencies between instructions a < b */
function deps(prog) {
  const out = [];
  prog.forEach((j, jx) => {
    const seen = new Set();
    j.src.forEach(r => {
      if (isZ(r) || seen.has(r)) return; seen.add(r);
      for (let i = jx - 1; i >= 0; i--) if (prog[i].rd === r) { out.push({ t: 'RAW', r, a: i, b: jx }); break; }
    });
    if (j.rd) for (let i = jx - 1; i >= 0; i--) {
      if (prog[i].src.includes(j.rd)) out.push({ t: 'WAR', r: j.rd, a: i, b: jx });
      if (prog[i].rd === j.rd) { out.push({ t: 'WAW', r: j.rd, a: i, b: jx }); break; }
    }
  });
  return out;
}

function simulate(sc) {
  const prog = sc.prog.map(parseIns), labels = {};
  prog.forEach(p => { if (p.label) labels[p.label.toLowerCase()] = p.idx; });
  const spec = !!sc.spec, lat = Object.assign({ add: 1, sub: 1, mul: 1, div: 1, log: 1, br: 1 }, sc.lat), memLat = sc.mem || 1;
  const order = KORD.filter(k => prog.some(p => p.k === k));
  const rs = {}; order.forEach(k => (rs[k] = Array((sc.rs && sc.rs[k]) || 2).fill(null)));
  const init = r => (isZ(r) ? 0 : sc.regs && r in sc.regs ? sc.regs[r] : +r.replace(/\D/g, ''));
  const regNames = [];
  prog.forEach(p => [p.rd, ...p.src].forEach(r => { if (r && !isZ(r) && !regNames.includes(r)) regNames.push(r); }));
  const regs = {}; regNames.forEach(r => (regs[r] = init(r)));
  const mem = Object.assign({}, sc.memv), memSeen = {};
  const mrd = a => { if (!(a in mem)) mem[a] = (a * 7) % 23 + 1; memSeen[a] = 1; return mem[a]; };
  const stat = {}, insts = [], rob = [], busy = {}, holder = {}, snaps = [null];
  const robCap = sc.rob || 8, maxT = sc.maxCycle || 60, maxInst = sc.maxInst || 40;
  let pc = 0, t = 0, robN = 0, pend = null, ev = [], cdb = [], gone = [], flushed = [];
  const alive = x => x.st !== 'can';
  const active = x => ['q', 'is', 'ex', 'done'].includes(x.st) || (spec && x.st === 'wb');

  function mkPlan(ins) {
    if (ins.k === 'load' || ins.k === 'store') {
      const p = [{ lab: 'EX', res: 'addr', acq: 1 }];
      if (!(spec && ins.k === 'store')) for (let i = 0; i < memLat; i++) p.push({ lab: 'M', res: 'mem', acq: i === 0 ? memLat : 0 });
      return p;
    }
    return Array.from({ length: lat[ins.k] }, (_, i) => ({ lab: 'EX', res: ins.k, acq: i === 0 ? lat[ins.k] : 0 }));
  }
  /* youngest surviving, already issued writer of r that is older than instruction id */
  const writerBefore = (r, id) => { for (let i = insts.length - 1; i >= 0; i--) { const w = insts[i]; if (w.id < id && alive(w) && w.ins.rd === r && w.IS != null) return w; } return null; };

  function squash(br) {
    const tgt = labels[br.ins.target.toLowerCase()], fwd = !spec && tgt > br.ins.idx;
    const dead = insts.filter(y => y.id > br.id && alive(y) && !(fwd && y.ins.idx >= tgt));
    dead.forEach(y => {
      y.cells[t] = 'Cancel'; y.X = t; y.st = 'can';
      if (y.slot != null) rs[y.ins.k][y.slot] = null;
      for (const r in holder) if (holder[r] === y) { busy[r] = 0; holder[r] = null; }
    });
    if (spec) { flushed = rob.map(e => e.x.id); rob.length = 0; for (const r in stat) delete stat[r]; }
    else {
      dead.slice().reverse().forEach(y => {
        const r = y.ins.rd; if (!r || stat[r] !== y.tag) return;
        const w = writerBefore(r, y.id);
        if (w && w.st !== 'fin') stat[r] = w.tag; else { delete stat[r]; if (w) regs[r] = w.val; }
      });
      insts.forEach(z => {
        if (!alive(z) || !z.Q) return;
        z.Q.forEach((q, j) => {
          if (q == null || !dead.some(y => y.tag === q)) return;
          const r = z.ins.src[j], w = writerBefore(r, z.id);
          if (w && w.st !== 'fin') z.Q[j] = w.tag; else { z.Q[j] = null; z.V[j] = w ? w.val : regs[r]; }
        });
      });
    }
    const kept = insts.some(y => y.id > br.id && alive(y));
    if (!kept) pc = tgt;
    ev.push({ k: 'cancel', ids: dead.map(y => y.id), br: br.id, refetch: !kept, target: br.ins.target });
  }

  /* memory ordering: is an older access forcing x to wait before its M cycle? */
  function memBlock(x) {
    const known = y => y.addrAt != null && y.addrAt < t, fin = y => y.exE != null && y.exE < t;
    for (const y of insts) {
      if (y.id >= x.id) break;
      if (!alive(y)) continue;
      if (x.ins.k === 'load') {
        if (y.ins.k !== 'store') continue;
        if (spec) { if (y.st !== 'com' && !known(y)) return y; continue; }
        if (!known(y)) return y;
        if (y.addr === x.addr && !fin(y)) return y;
      } else {
        if (y.ins.k !== 'store' && y.ins.k !== 'load') continue;
        if (fin(y)) continue;
        if (y.ins.k === 'store' || !known(y) || y.addr === x.addr) return y;
      }
    }
    return null;
  }
  function finish(x) {
    x.exE = t; x.st = 'done';
    const k = x.ins.k, a = x.V[0], b = x.V[1];
    if (k === 'load') {
      let f = null;
      if (spec) insts.forEach(y => { if (y.id < x.id && alive(y) && y.ins.k === 'store' && y.st !== 'com' && y.addr === x.addr) f = y; });
      x.val = f ? f.val : mrd(x.addr); x.fwd = f ? f.id : null;
    } else if (k === 'store') { x.val = b; if (!spec) { mem[x.addr] = b; memSeen[x.addr] = 1; } }
    else if (k === 'br') {
      x.taken = x.ins.op === 'beq' ? a === b : a !== b; x.mis = x.taken;
      ev.push({ k: 'res', i: x.id, taken: x.taken });
      if (!spec && x.mis) pend = { at: t + 1, br: x };
    } else x.val = r2(FN[k](a, b));
  }
  function issue(x, slot) {
    const k = x.ins.k;
    x.IS = t; x.cells[t] = 'IS'; x.st = 'is'; x.slot = slot; rs[k][slot] = x; x.rsn = RSN[k] + (slot + 1);
    x.tag = spec ? '#' + (++robN) : x.rsn;
    x.V = []; x.Q = []; x.cap = []; x.from = [];
    const ops = [];
    x.ins.src.forEach((r, j) => {
      if (isZ(r)) { x.V[j] = 0; x.Q[j] = null; ops.push({ r, v: 0, from: 'zero' }); return; }
      const p = stat[r];
      if (p) {
        const e = spec && rob.find(o => o.tag === p);
        if (e && e.ready) { x.V[j] = e.val; x.Q[j] = null; ops.push({ r, v: e.val, from: 'rob', tag: p }); }
        else { x.V[j] = null; x.Q[j] = p; ops.push({ r, q: p }); }
      } else { x.V[j] = regs[r]; x.Q[j] = null; ops.push({ r, v: regs[r], from: 'reg' }); }
    });
    if (x.ins.imm != null && k !== 'load' && k !== 'store') { x.V[1] = x.ins.imm; x.Q[1] = null; }
    const e = { k: 'is', i: x.id, rs: x.rsn, tag: x.tag, ops };
    if (x.ins.rd) {
      const rd = x.ins.rd;
      e.rd = rd; e.prev = stat[rd] || null;
      e.war = insts.filter(y => y.id < x.id && alive(y) && (y.st === 'is' || y.st === 'ex') && y.ins.src.includes(rd)).map(y => y.id);
      stat[rd] = x.tag;
    }
    if (spec) { x.robE = { n: robN, tag: x.tag, x, ready: false, val: null }; rob.push(x.robE); }
    ev.push(e);
  }
  function snap() {
    return {
      t, ev, cdb, gone, flushed,
      rs: order.map(k => ({ k, rows: rs[k].map((x, n) => (x ? {
        name: RSN[k] + (n + 1), i: x.id, op: x.ins.op, V: x.V.slice(), Q: x.Q.slice(), cap: x.cap.map(c => c === t),
        imm: x.ins.imm, addr: x.addr, tag: x.tag, fresh: x.IS === t, wb: x.WB === t, run: x.st === 'ex' || x.st === 'done'
      } : { name: RSN[k] + (n + 1) })) })),
      stat: Object.assign({}, stat), regs: Object.assign({}, regs),
      mem: Object.keys(memSeen).map(a => [+a, mem[a]]),
      rob: rob.map(e => ({ n: e.n, tag: e.tag, i: e.x.id, ready: e.ready, val: e.val, st: e.x.st, wbNow: e.x.WB === t }))
    };
  }

  const more = () => insts.some(active) || pend || (pc < prog.length && insts.length < maxInst);
  while (t < maxT && more()) {
    t++; ev = []; cdb = []; gone = []; flushed = [];
    /* 0. stations whose result went out on the CDB last cycle are free again */
    for (const k of order) rs[k] = rs[k].map(x => (x && ((x.WB != null && x.WB < t) || !alive(x)) ? null : x));
    /* A. squash the wrong path (decided at the end of the previous cycle) */
    if (pend && pend.at === t) { squash(pend.br); pend = null; }
    /* B. write result: broadcast on the CDB */
    insts.forEach(x => {
      if (x.st !== 'done' || x.exE !== t - 1) return;
      x.cells[t] = 'WB'; x.WB = t; x.st = spec ? 'wb' : 'fin';
      const e = { k: 'wb', i: x.id, tag: x.tag, caps: [] };
      if (x.ins.rd) {
        e.val = x.val; e.rd = x.ins.rd; cdb.push({ tag: x.tag, val: x.val, i: x.id });
        insts.forEach(y => { if (y.st === 'is') y.Q.forEach((q, j) => { if (q === x.tag) { y.Q[j] = null; y.V[j] = x.val; y.cap[j] = t; e.caps.push(y.id); } }); });
        if (spec) { x.robE.ready = true; x.robE.val = x.val; }
        else if (stat[e.rd] === x.tag) { regs[e.rd] = x.val; delete stat[e.rd]; e.wrote = true; }
        else { e.wrote = false; e.now = stat[e.rd] || null; }
      } else if (spec) { x.robE.ready = true; if (x.ins.k === 'store') x.robE.val = x.val; }
      ev.push(e);
    });
    /* C. commit from the head of the ROB */
    if (spec) {
      let brC = false; const used = {};
      while (rob.length) {
        const e = rob[0], x = e.x, k = x.ins.k;
        if (x.WB == null || x.WB >= t) break;
        if (brC) { ev.push({ k: 'cwait', i: x.id, why: 'br' }); break; }
        if (used[k]) { ev.push({ k: 'cwait', i: x.id, why: 'fu' }); break; }
        rob.shift(); used[k] = 1; x.cells[t] = 'C'; x.C = t; x.st = 'com'; gone.push({ n: e.n, tag: e.tag, i: x.id, val: e.val });
        const c = { k: 'c', i: x.id, tag: x.tag, kind: k === 'store' ? 'store' : k === 'br' ? 'br' : 'reg' };
        if (x.ins.rd) { c.rd = x.ins.rd; c.val = x.val; regs[c.rd] = x.val; if (stat[c.rd] === x.tag) delete stat[c.rd]; }
        if (k === 'store') { mem[x.addr] = x.val; memSeen[x.addr] = 1; c.addr = x.addr; c.val = x.val; }
        if (k === 'br') { brC = true; c.mis = x.mis; c.taken = x.taken; c.target = x.ins.target; if (x.mis) pend = { at: t + 1, br: x }; }
        ev.push(c);
      }
      const w = insts.filter(x => x.st === 'wb' && x.WB < t);
      w.forEach(x => (x.cells[t] = '-'));
      if (w.length && rob.length && !ev.some(e => e.k === 'cwait')) ev.push({ k: 'cq', ids: w.map(x => x.id), head: rob[0].x.id });
    }
    /* D. execute */
    for (const x of insts) {
      if (x.st === 'is') {
        const wq = x.Q.filter(q => q != null), first = x.cells[t - 1] !== '-';
        const gate = !spec && insts.find(y => y.id < x.id && y.ins.k === 'br' && alive(y) && !(y.exE != null && y.exE < t));
        const res = x.plan[0].res;
        if (wq.length) { x.cells[t] = '-'; ev.push({ k: 'wait', i: x.id, why: 'op', q: wq, first }); continue; }
        if (gate) { x.cells[t] = '-'; ev.push({ k: 'wait', i: x.id, why: 'br', by: gate.id, first }); continue; }
        if ((busy[res] || 0) >= t) { x.cells[t] = '-'; ev.push({ k: 'wait', i: x.id, why: 'fu', by: holder[res] ? holder[res].id : null, first }); continue; }
        x.st = 'ex'; x.exS = t; x.step = 0;
      }
      if (x.st !== 'ex') continue;
      const p = x.plan[x.step];
      if (p.acq) {
        if (x.step > 0) {
          const blk = (busy.mem || 0) >= t ? holder.mem : memBlock(x);
          if (blk) { x.cells[t] = '-'; ev.push({ k: 'wait', i: x.id, why: 'mem', by: blk.id, first: x.cells[t - 1] !== '-' }); continue; }
        }
        busy[p.res] = t + p.acq - 1; holder[p.res] = x;
      }
      const isM = p.lab === 'M', n = x.plan.slice(0, x.step + 1).filter(q => q.lab === p.lab).length, of = x.plan.filter(q => q.lab === p.lab).length;
      x.cells[t] = isM ? (sc.mlabel || 'M') : 'EX';
      if (x.step === 0 && p.res === 'addr') { x.addr = x.V[0] + x.ins.imm; x.addrAt = t; }
      x.step++;
      const last = x.step === x.plan.length;
      if (last) finish(x);
      ev.push({ k: isM ? 'm' : 'ex', i: x.id, n, of, last, addr: x.addr, val: x.val, fwd: x.fwd });
    }
    /* E. issue the oldest instruction still in the queue */
    const q = insts.find(x => x.st === 'q' && x.IF < t);
    if (q) {
      const slot = rs[q.ins.k].indexOf(null);
      if (slot < 0 || (spec && rob.length >= robCap)) { q.cells[t] = '-'; ev.push({ k: 'stall', i: q.id, why: slot < 0 ? 'rs' : 'rob', first: q.cells[t - 1] !== '-' }); }
      else issue(q, slot);
    }
    /* F. fetch */
    if (!insts.some(x => x.st === 'q') && pc < prog.length && insts.length < maxInst) {
      const x = { id: insts.length, ins: prog[pc], cells: {}, IF: t, st: 'q', plan: mkPlan(prog[pc]), slot: null };
      x.cells[t] = 'IF'; insts.push(x); pc++; ev.push({ k: 'if', i: x.id });
    }
    snaps[t] = snap();
  }
  return { sc, prog, insts, snaps, last: t, order, regNames, spec, deps: deps(prog), lat, memLat };
}

/* cronogram row as a compact string, used by the tests and the fill-in checker */
const rowStr = x => { const ks = Object.keys(x.cells).map(Number).sort((a, b) => a - b); return ks.length ? ks[0] + ':' + ks.map(c => x.cells[c]).join(' ') : ''; };
if (typeof module !== 'undefined') module.exports = { simulate, parseIns, deps, rowStr };
