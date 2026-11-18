'use strict';
/* Lesson 6: multiple issue and thread-level parallelism (L3_8 slides 16–24). Lesson 7: recall deck. */

/* issue-slot grids after the figure on L3_8 slide 24: b r g o = threads, . = unused slot */
const TLPG = {
  sup: ['bb..', 'b...', 'bbb.', 'bb..', 'bbbb', '....', '....', '....', 'b...', 'bbb.'],
  coarse: ['bbb.', 'b...', 'bbb.', 'bb..', 'bbbb', 'oooo', 'ooo.', 'ooo.', 'oo..', '....'],
  fine: ['bb..', 'rrr.', 'rrr.', 'gg..', 'b...', 'rrr.', 'rrr.', 'ggg.', 'ooo.', 'rr..'],
  smt: ['bbrr', 'gggr', 'rg..', 'bo..', 'rr..', 'bbbb', 'oo..', 'gb..', 'oo..', 'go.r']
};

/* Guided walk-through of the four TLPG grids: one grid at a time, highlights and labels added step by step. */
function tlpWalk(box, cls) {
  const W = 4;
  const at = (k, r, c) => TLPG[k][r][c];
  const all = (k, test) => { const o = []; TLPG[k].forEach((row, r) => [...row].forEach((ch, c) => test(ch, r, row) && o.push([r, c]))); return o; };
  const usedC = k => all(k, ch => ch !== '.');
  const hW = k => all(k, (ch, r, row) => ch === '.' && row !== '....'); /* empty slot in a row that issued something */
  const vW = k => all(k, (ch, r, row) => row === '....'); /* whole empty row */
  const row = (r, k, f) => [0, 1, 2, 3].filter(c => !f || f(at(k, r, c))).map(c => [r, c]);
  const rows = (k, rs, f) => rs.flatMap(r => row(r, k, f));
  const col = (k, t) => all(k, ch => ch === t);
  const cnt = k => usedC(k).length;
  const name = { sup: T('Superscalar', 'Superescalar'), coarse: T('Coarse grain', 'Grano grueso'), fine: T('Fine grain', 'Grano fino'), smt: 'SMT' };
  const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const STEPS = [
    /* ---- superscalar, one thread ---- */
    { g: 'sup', lbl: [], txt: T(`A ${hk('4-wide superscalar')} running ${hk('one thread')} (blue). Time runs ${hk('downwards')}.`, `Un ${hk('superescalar de 4 vías')} que ejecuta ${hk('un solo hilo')} (azul). El tiempo avanza ${hk('hacia abajo')}.`) },
    { g: 'sup', lbl: [0], rows: [0], txt: T(`Each ${hk('row is one clock cycle')}. This is ${hk('cycle 1')}.`, `Cada ${hk('fila es un ciclo de reloj')}. Esta es el ${hk('ciclo 1')}.`) },
    { g: 'sup', lbl: [0], rows: [0], hl: row(0, 'sup'), side: { 0: T('width = 4', 'ancho = 4') }, txt: T(`The ${hn('4')} boxes are the cycle's ${hk('issue slots')} (huecos de emisión). In the ideal case this implementation fetches (IF), decodes and issues ${hn('4')} instructions per cycle. That maximum is its ${hk('issue width')} (ancho de emisión).`, `Las ${hn('4')} casillas son los ${hk('huecos de emisión')} del ciclo. En el caso ideal esta implementación busca (IF), decodifica y emite ${hn('4')} instrucciones por ciclo. Ese máximo es su ${hk('ancho de emisión')}.`) },
    { g: 'sup', lbl: [0], rows: [0], hl: row(0, 'sup', ch => ch !== '.'), side: { 0: 'IS = 2' }, txt: T(`But only ${hn('2')} are actually ${hk('issued')} (IS). The next instruction depends on one that has not finished (${hc('RAW')}), or the functional unit it needs is busy: the thread does not have enough ${hk('ILP')}.`, `Pero solo ${hn('2')} se ${hk('emiten')} de verdad (IS). La siguiente depende de una que no ha terminado (${hc('RAW')}) o su unidad funcional está ocupada: el hilo no tiene suficiente ${hk('ILP')}.`) },
    { g: 'sup', lbl: [0], rows: [0], hl: row(0, 'sup', ch => ch === '.'), mark: 'h', side: { 0: T('2 wasted', '2 perdidos') }, txt: T(`The other ${hn('2')} slots are lost. Empty slots in a cycle that issued something are ${hk('horizontal waste')} (desperdicio horizontal), marked H.`, `Los otros ${hn('2')} huecos se pierden. Los huecos vacíos de un ciclo que sí emitió algo son ${hk('desperdicio horizontal')}, marcados H.`) },
    { g: 'sup', rows: [4], hl: row(4, 'sup'), side: { 4: 'IS = 4' }, txt: T(`${hk('Cycle 5')}: four independent instructions were ready, so all ${hn('4')} slots are used. This is the ideal (IPC ${hn('4')} in that cycle), and it is rare.`, `${hk('Ciclo 5')}: había cuatro instrucciones independientes listas, así que se usan los ${hn('4')} huecos. Es el ideal (IPC ${hn('4')} en ese ciclo), y es raro.`) },
    { g: 'sup', rows: [5, 6, 7], hl: rows('sup', [5, 6, 7]), mark: 'v', side: { 6: 'IS = 0' }, txt: T(`${hk('Cycles 6–8')}: nothing issues. The thread is ${hc('stalled')}, e.g. a load missed in the cache and everything after it waits for memory. A completely empty cycle is ${hk('vertical waste')} (desperdicio vertical), marked V.`, `${hk('Ciclos 6–8')}: no se emite nada. El hilo está ${hc('detenido')}, p. ej. una carga falló en caché y todo lo que viene detrás espera a memoria. Un ciclo completamente vacío es ${hk('desperdicio vertical')}, marcado V.`) },
    { g: 'sup', mark: 'hv', sum: 1, txt: T(`Total: ${hn(cnt('sup') + '/40')} slots used. ${hn(hW('sup').length)} lost horizontally and ${hn(vW('sup').length)} vertically. The next three diagrams use ${hk('several threads')} to recover these slots.`, `Total: ${hn(cnt('sup') + '/40')} huecos usados. ${hn(hW('sup').length)} perdidos en horizontal y ${hn(vW('sup').length)} en vertical. Las tres figuras siguientes usan ${hk('varios hilos')} para recuperarlos.`) },
    /* ---- coarse grain ---- */
    { g: 'coarse', txt: T(`Same 4-wide core, now with ${hk('two threads')} (blue, orange), each with its own ${hk('PC and registers')}. Only ${hk('one thread owns the core')} at a time.`, `El mismo núcleo de 4 vías, ahora con ${hk('dos hilos')} (azul, naranja), cada uno con su ${hk('PC y registros')}. Solo ${hk('un hilo usa el núcleo')} a la vez.`) },
    { g: 'coarse', rows: [0, 1, 2, 3, 4], hl: col('coarse', 'b'), txt: T(`${hk('Cycles 1–5')}: blue runs alone, just like the superscalar. Its horizontal waste is still there.`, `${hk('Ciclos 1–5')}: el azul ejecuta solo, igual que en el superescalar. Su desperdicio horizontal sigue ahí.`) },
    { g: 'coarse', rows: [5, 6, 7, 8], hl: col('coarse', 'o'), side: { 5: T('switch', 'cambio') }, txt: T(`${hk('Cycle 6')}: this is where blue stalled for a long time before. Coarse grain ${hk('switches thread only on a long stall')}, so orange takes the core and fills cycles that used to be empty.`, `${hk('Ciclo 6')}: aquí es donde antes el azul se detenía mucho tiempo. El grano grueso ${hk('cambia de hilo solo ante una detención larga')}, así que el naranja toma el núcleo y rellena ciclos que antes estaban vacíos.`) },
    { g: 'coarse', rows: [9], hl: row(9, 'coarse'), mark: 'v', side: { 9: 'IS = 0' }, txt: T(`${hk('Cycle 10')}: empty. A switch ${hc('empties and refills the pipeline')}, which costs cycles. So coarse grain only pays off when the stall it hides is much longer than that refill.`, `${hk('Ciclo 10')}: vacío. Un cambio ${hc('vacía y rellena el pipeline')}, y eso cuesta ciclos. Por eso el grano grueso solo compensa si la detención que oculta es mucho mayor que el rellenado.`) },
    { g: 'coarse', hl: hW('coarse'), mark: 'h', txt: T(`Each cycle still belongs to ${hk('one thread')}, so the ${hn(hW('coarse').length)} H slots remain. Coarse grain reduces ${hk('vertical')} waste only.`, `Cada ciclo sigue siendo de ${hk('un solo hilo')}, así que los ${hn(hW('coarse').length)} huecos H siguen ahí. El grano grueso solo reduce el desperdicio ${hk('vertical')}.`) },
    { g: 'coarse', mark: 'hv', sum: 1, txt: T(`${hn(cnt('coarse') + '/40')} slots used (superscalar: ${hn(cnt('sup'))}). Example: ${hk('IBM AS/400')}.`, `${hn(cnt('coarse') + '/40')} huecos usados (superescalar: ${hn(cnt('sup'))}). Ejemplo: ${hk('IBM AS/400')}.`) },
    /* ---- fine grain ---- */
    { g: 'fine', txt: T(`Now ${hk('four threads')} (blue, red, green, orange). Fine grain ${hk('switches thread every cycle')}.`, `Ahora ${hk('cuatro hilos')} (azul, rojo, verde, naranja). El grano fino ${hk('cambia de hilo cada ciclo')}.`) },
    { g: 'fine', rows: [0, 1, 3], hl: rows('fine', [0, 1, 3], ch => ch !== '.'), txt: T(`Cycle 1 blue, cycle 2 red, cycle 4 green: the threads ${hk('take turns, cycle by cycle')} (round-robin; a stalled thread is skipped). The hardware keeps every thread's PC and registers, so the switch has ${hp('no penalty')}.`, `Ciclo 1 azul, ciclo 2 rojo, ciclo 4 verde: los hilos ${hk('se turnan ciclo a ciclo')} (round-robin; un hilo detenido se salta). El hardware guarda el PC y los registros de cada hilo, así que el cambio ${hp('no tiene penalización')}.`) },
    { g: 'fine', rows: ALL, txt: T(`Look down the grid: ${hp('no row is empty')}. When one thread stalls, another fills its cycle. ${hk('Vertical waste')} drops to ${hn('0')}.`, `Mira la columna entera: ${hp('ninguna fila está vacía')}. Cuando un hilo se detiene, otro ocupa su ciclo. El ${hk('desperdicio vertical')} baja a ${hn('0')}.`) },
    { g: 'fine', hl: hW('fine'), mark: 'h', txt: T(`But each row still belongs to ${hk('one thread')}, and one thread rarely has 4 independent instructions ready. ${hn(hW('fine').length)} slots of ${hk('horizontal waste')} remain.`, `Pero cada fila sigue siendo de ${hk('un solo hilo')}, y un hilo rara vez tiene 4 instrucciones independientes listas. Quedan ${hn(hW('fine').length)} huecos de ${hk('desperdicio horizontal')}.`) },
    { g: 'fine', hl: col('fine', 'b'), txt: T(`The cost: ${hc('each thread runs more slowly')}. Blue only gets cycles 1 and 5, even when it is ready to go.`, `El coste: ${hc('cada hilo progresa más despacio')}. El azul solo tiene los ciclos 1 y 5, aunque esté listo para seguir.`) },
    { g: 'fine', mark: 'hv', sum: 1, txt: T(`${hn(cnt('fine') + '/40')} slots used, all waste is horizontal. Example: ${hk('Sun Niagara')}.`, `${hn(cnt('fine') + '/40')} huecos usados; todo el desperdicio es horizontal. Ejemplo: ${hk('Sun Niagara')}.`) },
    /* ---- SMT ---- */
    { g: 'smt', rows: [0], hl: row(0, 'smt'), side: { 0: T('2 threads', '2 hilos') }, txt: T(`${hk('SMT')} (simultaneous multithreading). ${hk('Cycle 1')}: blue issues 2 and ${hk('red issues 2 in the same cycle')}. Several colours in one row is what makes it SMT.`, `${hk('SMT')} (multihilo simultáneo). ${hk('Ciclo 1')}: el azul emite 2 y ${hk('el rojo emite 2 en el mismo ciclo')}. Varios colores en una fila es lo que define al SMT.`) },
    { g: 'smt', rows: [1], hl: row(1, 'smt'), side: { 1: T('3 + 1', '3 + 1') }, txt: T(`${hk('Cycle 2')}: green has 3 ready, and red fills the slot green could not use. Threads ${hk('fill each other\'s horizontal waste')}.`, `${hk('Ciclo 2')}: el verde tiene 3 listas, y el rojo ocupa el hueco que el verde no podía usar. Los hilos ${hk('rellenan el desperdicio horizontal de los demás')}.`) },
    { g: 'smt', hl: usedC('smt'), txt: T(`This needs a ${hk('dynamically scheduled superscalar')} underneath: a ${hk('PC and register map per thread')}, tags in the shared structures (RS, CDB) so results reach the right thread, and the ${hk('ROB partitioned')} between threads.`, `Esto necesita debajo un ${hk('superescalar con planificación dinámica')}: ${hk('PC y mapa de registros por hilo')}, etiquetas en las estructuras compartidas (ER, CDB) para que cada resultado llegue a su hilo, y el ${hk('ROB particionado')} entre hilos.`) },
    { g: 'smt', hl: hW('smt'), mark: 'h', txt: T(`${hn(hW('smt').length)} slots are still empty: in those cycles all threads together did not have enough ready instructions, or they ${hc('competed for caches, bandwidth and functional units')}.`, `Siguen vacíos ${hn(hW('smt').length)} huecos: en esos ciclos, todos los hilos juntos no tenían suficientes instrucciones listas, o ${hc('compitieron por cachés, ancho de banda y unidades funcionales')}.`) },
    { g: 'smt', mark: 'hv', sum: 1, end: 1, txt: T(`${hn(cnt('smt') + '/40')}, the best of the four (superscalar ${hn(cnt('sup'))}, coarse ${hn(cnt('coarse'))}, fine ${hn(cnt('fine'))}). SMT removes vertical waste ${hk('and')} reduces horizontal waste. Examples: ${hk('Intel Core i7')}, ${hk('IBM POWER7')}.`, `${hn(cnt('smt') + '/40')}, el mejor de los cuatro (superescalar ${hn(cnt('sup'))}, grueso ${hn(cnt('coarse'))}, fino ${hn(cnt('fine'))}). El SMT elimina el desperdicio vertical ${hk('y')} reduce el horizontal. Ejemplos: ${hk('Intel Core i7')}, ${hk('IBM POWER7')}.`) }
  ];
  const keys = ['sup', 'coarse', 'fine', 'smt'];
  let i = 0;
  const draw = () => {
    const s = STEPS[i], k = s.g, has = (list, r, c) => (list || []).some(p => p[0] === r && p[1] === c);
    const focus = !!(s.hl || s.rows);
    const H = s.mark && s.mark.includes('h') ? hW(k) : [], V = s.mark && s.mark.includes('v') ? vW(k) : [];
    $('.stw-tabs', box).innerHTML = keys.map(g => `<button class="${g === k ? 'on' : ''}${keys.indexOf(g) < keys.indexOf(k) ? ' seen' : ''}" data-g="${g}">${name[g]}</button>`).join('');
    $('.stw-h', box).textContent = name[k];
    $('.stw-grid', box).innerHTML = TLPG[k].map((line, r) => {
      const showL = !s.lbl || s.lbl.includes(r), on = (s.rows || []).includes(r);
      const cells = [...line].map((ch, c) => {
        const lit = has(s.hl, r, c), w = has(H, r, c) ? 'wh' : has(V, r, c) ? 'wv' : '';
        const dim = focus && !lit && !(on && !s.hl);
        return `<i class="${cls[ch]} ${lit ? 'lit' : ''} ${dim ? 'dm' : ''} ${w}">${w ? (w === 'wh' ? 'H' : 'V') : ''}</i>`;
      }).join('');
      return `<div class="sr${on ? ' on' : ''}"><span class="sl">${showL ? (on ? '▶ ' : '') + T('cycle ', 'ciclo ') + (r + 1) : ''}</span><div class="s4">${cells}</div><span class="ss">${s.side && s.side[r] ? s.side[r] : ''}</span></div>`;
    }).join('') + (s.sum ? `<div class="sr sumr"><span class="sl"></span><div class="s4m">${cnt(k)}/40 ${T('used', 'usados')}</div><span class="ss"></span></div>` : '');
    $('.stw-tx', box).innerHTML = s.txt;
    const first = STEPS.findIndex(x => x.g === k), n = STEPS.filter(x => x.g === k).length;
    $('.stw-n', box).textContent = `${name[k]} · ${i - first + 1}/${n}`;
    $('[data-d="-1"]', box).disabled = i === 0;
    $('[data-d="1"]', box).disabled = i === STEPS.length - 1;
    $('[data-d="1"]', box).innerHTML = STEPS[i + 1] && STEPS[i + 1].g !== k ? `${name[STEPS[i + 1].g]} →` : `${T('Next', 'Siguiente')} →`;
    $$('.stw-tabs button', box).forEach(b => (b.onclick = () => { i = STEPS.findIndex(x => x.g === b.dataset.g); draw(); sfx.pop(); }));
  };
  const go = d => { const j = i + d; if (j < 0 || j >= STEPS.length) return; i = j; draw(); sfx.pop(); };
  $$('.stw-nav .btn', box).forEach(b => (b.onclick = () => go(+b.dataset.d)));
  box.onkeydown = e => { if (e.key === 'ArrowRight') { go(1); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); } };
  draw();
}

View('threads', {
  icon: '⑥', mins: 10, title: () => T('Beyond one instruction per cycle', 'Más de una instrucción por ciclo'),
  desc: () => T('Superscalar, VLIW, and the three ways to run several threads on one core.', 'Superescalar, VLIW y las tres formas de ejecutar varios hilos en un núcleo.'),
  done: () => ['threads'],
  render(m) {
    const cls = { b: 'tb', r: 'tr', g: 'tgn', o: 'to', '.': '' };
    const grid = k => `<div class="tgg">${TLPG[k].join('').split('').map(c => `<i class="${cls[c]}"></i>`).join('')}</div>`;
    const used = k => TLPG[k].join('').replace(/\./g, '').length;
    const tg = (k, name) => `<button class="tg" data-g="${k}"><h4>${name}</h4>${grid(k)}<small>${used(k)}/40 ${T('slots used', 'huecos usados')}</small></button>`;
    m.innerHTML = `<div class="lesson">${head(T('Lesson 6 · L3_8 slides 16–24', 'Lección 6 · L3_8 diapositivas 16–24'), T('Beyond one instruction per cycle', 'Más de una instrucción por ciclo'),
      T('Theory questions come from here: who schedules, who detects hazards, and how threads share a core.', 'De aquí salen preguntas de teoría: quién planifica, quién detecta riesgos y cómo comparten núcleo los hilos.'))}
    ${learnBar()}
    ${cb(T('CPI below one', 'CPI inferior a uno'), 'L3_8 · 16–17', `<p>${T(`A scalar processor issues at most ${hk('one instruction per cycle')}. ${hk('Multiple issue')} allows ${hk('IPC > 1')}. Three ways:`, `Un escalar emite como máximo ${hk('una instrucción por ciclo')}. La ${hk('emisión múltiple')} permite ${hk('IPC > 1')}. Tres alternativas:`)}</p>
      <div class="three">
      <div class="mini s"><h4>${T('Static superscalar', 'Superescalar estático')}</h4><p>${T(`Executes ${hk('in order')}; scheduling is left to the ${hk('compiler')}.`, `Ejecuta ${hk('en orden')}; la planificación se delega en el ${hk('compilador')}.`)}</p></div>
      <div class="mini s"><h4>${T('Dynamic superscalar', 'Superescalar dinámico')}</h4><p>${T(`Chooses operations ${hk('at run time')}; out of order, built on the ${hk('Marcador or Tomasulo')}.`, `Selecciona operaciones ${hk('en ejecución')}; fuera de orden, basado en el ${hk('Marcador o Tomasulo')}.`)}</p></div>
      <div class="mini s"><h4>${T('Speculative superscalar', 'Superescalar especulativo')}</h4><p>${T(`Adds ${hk('speculation')} to the dynamic model.`, `Añade ${hk('especulación')} al modelo dinámico.`)}</p></div></div>
      <div class="exbox"><b>VLIW</b>${T(`Very Long Instruction Word: the ${hk('compiler')} packs several operations for different functional units into ${hk('one long instruction')}, e.g. ${hn('1')} integer op, ${hn('2')} floating-point and ${hn('2')} memory accesses. Scheduling is ${hk('static')}.`, `Very Long Instruction Word: el ${hk('compilador')} agrupa varias operaciones para distintas unidades funcionales en ${hk('una instrucción larga')}, p. ej. ${hn('1')} operación entera, ${hn('2')} flotantes y ${hn('2')} accesos a memoria. La planificación es ${hk('estática')}.`)}</div>`)}
    ${cb(T('Classification', 'Clasificación'), 'L3_8 · 18', `<div style="overflow-x:auto"><table class="tbl vs cls"><thead><tr><th>${T('Name', 'Nombre')}</th><th>${T('Issue', 'Emisión')}</th><th>${T('Hazard detection', 'Detección de riesgos')}</th><th>${T('Scheduling', 'Planificación')}</th><th>${T('Distinguishing feature', 'Característica distintiva')}</th><th>${T('Examples', 'Ejemplos')}</th></tr></thead><tbody>
      <tr><th>${T('Superscalar (static)', 'Superescalar (estático)')}</th><td>${T('dynamic', 'dinámica')}</td><td>hardware</td><td>${hk(T('static', 'estática'))}</td><td>${T('in-order execution', 'ejecución en orden')}</td><td>${T('embedded: MIPS, ARM, Cortex-A53', 'embebidos: MIPS, ARM, Cortex-A53')}</td></tr>
      <tr><th>${T('Superscalar (dynamic)', 'Superescalar (dinámico)')}</th><td>${T('dynamic', 'dinámica')}</td><td>hardware</td><td>${hk(T('dynamic', 'dinámica'))}</td><td>${T('some out-of-order, no speculation', 'cierta ejecución fuera de orden, sin especulación')}</td><td>${hk(T('none today', 'ninguno en la actualidad'))}</td></tr>
      <tr><th>${T('Superscalar (speculative)', 'Superescalar (especulativo)')}</th><td>${T('dynamic', 'dinámica')}</td><td>hardware</td><td>${hk(T('dynamic with speculation', 'dinámica con especulación'))}</td><td>${T('out-of-order with speculation', 'fuera de orden con especulación')}</td><td>Intel Core i3, i5, i7; AMD Phenom; IBM Power 7</td></tr>
      <tr><th>VLIW / LIW</th><td>${hk(T('static', 'estática'))}</td><td>${hk(T('mainly software', 'principalmente software'))}</td><td>${T('static', 'estática')}</td><td>${T('compiler determines and indicates all hazards, often implicitly', 'el compilador determina e indica todos los riesgos, a menudo implícitamente')}</td><td>${T('signal processing (DSP): TI C6x', 'procesamiento de señales (DSP): TI C6x')}</td></tr>
      <tr><th>EPIC</th><td>${T('mainly static', 'principalmente estática')}</td><td>${T('mainly software', 'principalmente software')}</td><td>${T('mainly static', 'principalmente estática')}</td><td>${T(`compiler indicates all hazards ${hk('explicitly')}`, `el compilador indica todos los riesgos ${hk('explícitamente')}`)}</td><td>${hk('Itanium')}</td></tr>
      </tbody></table></div>`)}
    ${cb(T('Thread-level parallelism', 'Paralelismo a nivel de hilo'), 'L3_8 · 19–20', `<ul class="keyl">
      <li>${T(`${hk('TLP')} uses several threads, each with its own ${hk('PC, registers and context')}. They may share program and memory or belong to independent programs.`, `El ${hk('TLP')} usa varios hilos, cada uno con ${hk('PC, registros y contexto')} propios. Pueden compartir programa y memoria o ser de programas independientes.`)}</li>
      <li>${T(`${hk('DLP')} (data-level) operates on different data. TLP and DLP are ${hk('complementary')} and can coexist with ILP.`, `El ${hk('DLP')} (a nivel de datos) opera sobre datos distintos. TLP y DLP son ${hk('complementarios')} y pueden coexistir con el ILP.`)}</li>
      <li>${T(`ILP works ${hk('inside a basic block')} and is limited by ${hc('dependencies and branches')}.`, `El ILP trabaja ${hk('dentro de un bloque básico')} y está limitado por ${hc('dependencias y bifurcaciones')}.`)}</li>
      <li>${T(`TLP's main goal is ${hk('global throughput')}: more instructions completed per unit of time. It can also cut total time ${hc('if synchronisation and communication costs do not dominate')}.`, `El objetivo principal del TLP es el ${hk('throughput global')}: más instrucciones completadas por unidad de tiempo. También puede reducir el tiempo total ${hc('si los costes de sincronización y comunicación no dominan')}.`)}</li></ul>`)}
    ${cb(T('Three ways to share a core', 'Tres formas de compartir un núcleo'), 'L3_8 · 21–24', `<p class="mute">${T('Each row is a cycle, each box an issue slot, each colour a thread. Click one.', 'Cada fila es un ciclo, cada casilla un hueco de emisión, cada color un hilo. Pulsa una.')}</p>
      <div class="tlp">${tg('sup', T('Superscalar', 'Superescalar'))}${tg('coarse', T('Coarse grain', 'Grano grueso'))}${tg('fine', T('Fine grain', 'Grano fino'))}${tg('smt', 'SMT')}</div><div class="hwx" id="tx"></div>
      <table class="tbl vs" style="margin-top:14px"><thead><tr><th></th><th>${T('Switches', 'Cambia')}</th><th>${T('Gain', 'Ventaja')}</th><th>${T('Cost', 'Coste')}</th><th>${T('Example', 'Ejemplo')}</th></tr></thead><tbody>
      <tr><th>${T('Fine grain', 'Grano fino')}</th><td>${hk(T('every cycle or instruction', 'cada ciclo o instrucción'))}, round-robin</td><td>${hp(T('hides latencies; switch with no penalty', 'oculta latencias; cambio sin penalización'))}</td><td>${hc(T('each thread advances more slowly', 'cada hilo progresa más despacio'))}</td><td>${hk('Sun Niagara')}</td></tr>
      <tr><th>${T('Coarse grain', 'Grano grueso')}</th><td>${hk(T('only on a long stall', 'solo ante una detención larga'))}</td><td>${hp(T('a thread that does not stall keeps the core', 'un hilo sin bloqueos conserva el núcleo'))}</td><td>${hc(T('the switch empties and refills the pipeline', 'el cambio vacía y rellena el pipeline'))}</td><td>${hk('IBM AS/400')}</td></tr>
      <tr><th>SMT</th><td>${hk(T('never: several threads in the same cycle', 'nunca: varios hilos en el mismo ciclo'))}</td><td>${hp(T('functional units are used more', 'mayor utilización de las unidades funcionales'))}</td><td>${hc(T('interference in caches, bandwidth and scheduling', 'interferencia en cachés, ancho de banda y planificación'))}</td><td>${hk('Intel Core i7')}, ${hk('IBM POWER7')}</td></tr></tbody></table>
      ${trap(T('SMT needs a <b>dynamically scheduled superscalar</b> underneath: per-thread PC and register maps, tags in the shared structures, and the <b>ROB partitioned</b> between threads.', 'El SMT necesita debajo un <b>superescalar con planificación dinámica</b>: PC y mapas de registros por hilo, etiquetas en las estructuras compartidas y el <b>ROB particionado</b> entre hilos.'))}`)}
    ${cb(T('Step through the four diagrams', 'Las cuatro figuras, paso a paso'), 'L3_8 · 21–24', `<p class="mute">${T('The same four grids, one at a time, labelled bit by bit. Use Next / Back (or the arrow keys).', 'Las mismas cuatro figuras, una a una, etiquetadas poco a poco. Usa Siguiente / Atrás (o las flechas).')}</p>
      <div class="stw" tabindex="0"><div class="stw-tabs"></div><h3 class="stw-h"></h3><div class="stw-grid"></div><div class="stw-tx"></div>
      <div class="stw-nav"><button class="btn ghost" data-d="-1">← ${T('Back', 'Atrás')}</button><span class="stw-n"></span><button class="btn" data-d="1">${T('Next', 'Siguiente')} →</button></div></div>`)}
    <h2>${T('Check', 'Comprueba')}</h2><div id="q"></div>${nextLink('drill')}</div>`;
    const root = $('.lesson', m); learnInit(root);
    const TX = {
      sup: T('<b>One thread.</b> Only ILP is exploited: some slots in a cycle stay empty, and when the thread stalls whole cycles are lost.', '<b>Un hilo.</b> Solo se explota el ILP: quedan huecos vacíos en un ciclo y, cuando el hilo se detiene, se pierden ciclos enteros.'),
      coarse: T('<b>Coarse grain.</b> Blue runs until it stalls for long, then orange takes over. Empty slots inside a cycle remain, and a cycle is lost at the switch.', '<b>Grano grueso.</b> El azul ejecuta hasta una detención larga y entonces entra el naranja. Los huecos dentro de un ciclo siguen, y se pierde un ciclo en el cambio.'),
      fine: T('<b>Fine grain.</b> A different thread every cycle: no empty cycles, but each cycle still belongs to one thread, so unused slots remain.', '<b>Grano fino.</b> Un hilo distinto cada ciclo: no hay ciclos vacíos, pero cada ciclo sigue siendo de un solo hilo, así que quedan huecos sin usar.'),
      smt: T('<b>SMT.</b> Several colours in the same row: threads fill each other\'s empty slots in the same cycle.', '<b>SMT.</b> Varios colores en la misma fila: los hilos rellenan los huecos de los demás en el mismo ciclo.')
    };
    $$('.tg', m).forEach(b => (b.onclick = () => { $$('.tg', m).forEach(x => x.classList.toggle('on', x === b)); $('#tx', m).innerHTML = TX[b.dataset.g]; sfx.pop(); }));
    $('.tg[data-g="smt"]', m).click();
    tlpWalk($('.stw', m), cls);
    Quiz($('#q', m), 'threads', [
      { type: 'mc', q: T('Who schedules the operations in a VLIW processor?', '¿Quién planifica las operaciones en un procesador VLIW?'), opts: [T('The compiler', 'El compilador'), T('The reservation stations', 'Las estaciones de reserva'), T('The ROB', 'El ROB')], a: 0 },
      { type: 'mc', q: T('Which class has "no examples today" in the slide\'s table?', '¿Qué clase no tiene "ningún ejemplo en la actualidad" en la tabla?'), opts: [T('Static superscalar', 'Superescalar estático'), T('Dynamic superscalar without speculation', 'Superescalar dinámico sin especulación'), 'EPIC'], a: 1 },
      { type: 'mc', q: T('Intel Core i7 is classified as…', 'El Intel Core i7 se clasifica como…'), opts: ['VLIW', T('speculative superscalar', 'superescalar especulativo'), T('static superscalar', 'superescalar estático')], a: 1 },
      { type: 'mc', q: T('Which multithreading switches thread every cycle?', '¿Qué multihilo cambia de hilo cada ciclo?'), opts: [T('Fine grain', 'Grano fino'), T('Coarse grain', 'Grano grueso'), 'SMT'], a: 0 },
      { type: 'mc', q: T('Coarse-grain multithreading pays its cost when…', 'El multihilo de grano grueso paga su coste cuando…'), opts: [T('it switches: the pipeline is emptied and refilled', 'cambia: el pipeline se vacía y se rellena'), T('every cycle', 'cada ciclo'), T('never', 'nunca')], a: 0, why: T('So it only pays off when the stall it hides is much longer than the refill.', 'Por eso solo compensa cuando la detención que oculta es mucho mayor que el rellenado.') },
      { type: 'mc', q: T('What is the main goal of TLP?', '¿Cuál es el objetivo principal del TLP?'), opts: [T('Lower latency of a single instruction', 'Menor latencia de una instrucción'), T('Higher global throughput', 'Mayor throughput global'), T('Fewer cache misses', 'Menos fallos de caché')], a: 1 },
      { type: 'mc', q: T('In SMT, the ROB is…', 'En SMT, el ROB…'), opts: [T('removed', 'se elimina'), T('partitioned between threads', 'se particiona entre hilos'), T('duplicated per functional unit', 'se duplica por unidad funcional')], a: 1 },
      { type: 'mc', q: T('Match: Sun Niagara, IBM AS/400.', 'Empareja: Sun Niagara, IBM AS/400.'), opts: [T('fine grain, coarse grain', 'grano fino, grano grueso'), T('coarse grain, fine grain', 'grano grueso, grano fino'), 'SMT, SMT'], a: 0 },
      { type: 'mc', q: T('What limits ILP?', '¿Qué limita el ILP?'), opts: [T('Dependencies and branches inside a basic block', 'Dependencias y bifurcaciones dentro de un bloque básico'), T('The number of threads', 'El número de hilos'), T('The size of the ROB only', 'Solo el tamaño del ROB')], a: 0 }
    ]);
  }
});

/* ---------- recall deck ---------- */
function deck() {
  return [
    [T('Who designed the algorithm, when, for which machine?', '¿Quién diseñó el algoritmo, cuándo y para qué máquina?'), T('Robert Tomasulo, 1966, IBM 360/91.', 'Robert Tomasulo, 1966, IBM 360/91.')],
    [T('Three improvements of Tomasulo over the Marcador?', '¿Tres mejoras de Tomasulo sobre el Marcador?'), T('Distributed control (reservation stations), register renaming, Common Data Bus.', 'Control distribuido (estaciones de reserva), renombrado de registros, bus común de datos.')],
    [T('Which hazards are "name dependencies"?', '¿Qué riesgos son "dependencias de nombre"?'), T('WAR and WAW. RAW is a real data dependency.', 'WAR y WAW. RAW es una dependencia real de datos.')],
    [T('How is WAR removed?', '¿Cómo se elimina el WAR?'), T('The source value is copied into the reservation station at issue.', 'El valor fuente se copia en la estación de reserva en la emisión.')],
    [T('How is WAW removed?', '¿Cómo se elimina el WAW?'), T('The register status table points only to the most recent station.', 'La tabla de estado de registros apunta solo a la estación más reciente.')],
    [T('How is RAW resolved?', '¿Cómo se resuelve el RAW?'), T('The station watches the CDB and captures the value when its tag appears.', 'La estación observa el CDB y captura el valor cuando aparece su etiqueta.')],
    [T('Tomasulo: when does a consumer start EX?', 'Tomasulo: ¿cuándo empieza EX un consumidor?'), T('The cycle after the producer\'s last EX/M, i.e. in the producer\'s WB cycle.', 'El ciclo siguiente al último EX/M del productor, es decir, en el ciclo de WB del productor.')],
    [T('Marcador: when does a consumer start EX?', 'Marcador: ¿cuándo empieza EX un consumidor?'), T('The cycle after the producer\'s WB (it reads in RO only from registers).', 'El ciclo siguiente al WB del productor (en RO solo lee de registros).')],
    [T('The only thing that makes IS wait in Tomasulo?', '¿Lo único que hace esperar a IS en Tomasulo?'), T('No free reservation station or load/store buffer (structural hazard).', 'No hay estación de reserva o búfer de carga/almacenamiento libre (riesgo estructural).')],
    [T('Stages of a load in Tomasulo?', '¿Etapas de una carga en Tomasulo?'), T('IF, IS, EX (address), M (access), WB.', 'IF, IS, EX (dirección), M (acceso), WB.')],
    [T('When must a load wait for a store?', '¿Cuándo debe esperar una carga a un store?'), T('When an earlier store has an unknown or matching address.', 'Cuando un store anterior tiene dirección desconocida o coincidente.')],
    [T('Two limitations of Tomasulo?', '¿Dos limitaciones de Tomasulo?'), T('The CDB can saturate; searching the stations costs power.', 'El CDB puede saturarse; la búsqueda en las estaciones consume potencia.')],
    [T('Hardware speculation combines which three ideas?', '¿Qué tres ideas combina la especulación hardware?'), T('Dynamic prediction, speculation with undo, dynamic scheduling.', 'Predicción dinámica, especulación con capacidad de deshacer, planificación dinámica.')],
    [T('What does the ROB hold, and for how long?', '¿Qué guarda el ROB y durante cuánto?'), T('Each result, from the end of execution until commit.', 'Cada resultado, desde el fin de la ejecución hasta el commit.')],
    [T('Condition to commit?', '¿Condición para confirmar?'), T('At the head of the ROB, with the result available.', 'Estar en la cabeza del ROB con el resultado disponible.')],
    [T('The three commit sequences?', '¿Las tres secuencias de commit?'), T('Normal (ROB → register), store (memory written at the head), branch (right: removed; wrong: flush and refetch).', 'Normal (ROB → registro), store (se escribe memoria en la cabeza), salto (acierto: se elimina; fallo: flush y nueva captación).')],
    [T('What does IS need in the speculative machine?', '¿Qué necesita IS en la máquina especulativa?'), T('A free reservation station and a free ROB entry.', 'Una estación de reserva libre y una entrada libre del ROB.')],
    [T('How is "finished but not committed" drawn?', '¿Cómo se dibuja "terminada pero sin confirmar"?'), T('WB then dashes in the WB colour, until C.', 'WB y luego guiones con el color de WB, hasta C.')],
    [T('Who schedules in VLIW?', '¿Quién planifica en VLIW?'), T('The compiler, statically.', 'El compilador, estáticamente.')],
    [T('EPIC example?', '¿Ejemplo de EPIC?'), 'Itanium.'],
    [T('Fine-grain multithreading in one line?', '¿Multihilo de grano fino en una línea?'), T('Switch every cycle (round-robin), no switch penalty, each thread slower. Sun Niagara.', 'Cambia cada ciclo (round-robin), sin penalización de cambio, cada hilo más lento. Sun Niagara.')],
    [T('Coarse-grain multithreading in one line?', '¿Multihilo de grano grueso en una línea?'), T('Switch only on a long stall; the switch refills the pipeline. IBM AS/400.', 'Cambia solo ante una detención larga; el cambio rellena el pipeline. IBM AS/400.')],
    [T('SMT in one line?', '¿SMT en una línea?'), T('Several threads issue in the same cycle on a dynamic superscalar; ROB partitioned. Core i7, POWER7.', 'Varios hilos emiten en el mismo ciclo en un superescalar dinámico; ROB particionado. Core i7, POWER7.')],
    [T('TLP\'s main goal?', '¿Objetivo principal del TLP?'), T('Global throughput.', 'Throughput global.')]
  ];
}
const FCS = { q: null, flip: false, got: 0 }, SP = { n: 0, ok: 0, cur: null, done: false };
function spotNew() {
  const R = ['F0', 'F2', 'F4', 'F6', 'F8', 'F10', 'F12'].sort(() => Math.random() - 0.5), ops = ['ADDD', 'SUBD', 'MULD', 'DIVD'];
  const t = pick(['RAW', 'RAW', 'WAR', 'WAW', 'none']);
  let [d1, a1, b1, d2, a2, b2] = R, sh = null;
  if (t === 'RAW') { a2 = d1; sh = d1; } else if (t === 'WAR') { d2 = a1; sh = a1; } else if (t === 'WAW') { d2 = d1; sh = d1; }
  const u = r => (r === sh ? `<u>${r}</u>` : r);
  return { t, sh, code: `${pick(ops)} ${u(d1)},${u(a1)},${b1}\n${pick(ops)} ${u(d2)},${u(a2)},${b2}` };
}

View('drill', {
  icon: '⑦', mins: 15, title: () => T('Recall deck', 'Repaso activo'),
  desc: () => T('Flashcards, a hazard spotter and a mixed final checkpoint.', 'Tarjetas, un detector de riesgos y un control final mixto.'),
  done: () => ['flash', 'spot', 'drill'],
  render(m) {
    m.innerHTML = `${head(T('Lesson 7 · everything', 'Lección 7 · todo'), T('Recall deck', 'Repaso activo'), T('Say the answer out loud before you turn the card.', 'Di la respuesta en voz alta antes de girar la tarjeta.'))}
      <h2>${T('Flashcards', 'Tarjetas')}</h2><div id="fc"></div>
      <h2>${T('Hazard spotter', 'Detector de riesgos')}</h2><p class="mute">${T('What does the second instruction have with the first? Ten in a row to finish.', '¿Qué tiene la segunda instrucción con la primera? Diez seguidas para terminar.')}</p><div id="sp"></div>
      <h2>${T('Final checkpoint', 'Control final')}</h2><div id="q"></div>`;
    const data = deck(), fc = $('#fc', m);
    if (!FCS.q) FCS.q = data.map((_, i) => i).sort(() => Math.random() - 0.5);
    const drawF = () => {
      if (!FCS.q.length) { fc.innerHTML = `<div class="flash"><div class="fq">🎉 ${T('Deck cleared', 'Mazo completado')}</div><button class="btn ghost" data-a>${T('Again', 'Otra vez')}</button></div>`; markDone('flash'); $('[data-a]', fc).onclick = () => { FCS.q = null; FCS.got = 0; route(true); }; return; }
      const [q, a] = data[FCS.q[0]];
      fc.innerHTML = `<div class="flash ${FCS.flip ? 'flip' : ''}"><div class="fcount">${T('Left', 'Quedan')}: ${FCS.q.length} · ${T('Known', 'Sabidas')}: ${FCS.got}</div><div class="fq">${q}</div>
        ${FCS.flip ? `<div>${a}</div><div><button class="btn hitb" data-k>✓ ${T('Knew it', 'La sabía')}</button> <button class="btn ghost" data-r>↻ ${T('Again later', 'Repetir luego')}</button></div>` : `<button class="btn" data-s>${T('Show answer', 'Ver respuesta')}</button>`}</div>`;
      const s = $('[data-s]', fc), k = $('[data-k]', fc), r = $('[data-r]', fc);
      if (s) s.onclick = () => { FCS.flip = true; sfx.pop(); drawF(); };
      if (k) k.onclick = () => { FCS.q.shift(); FCS.got++; FCS.flip = false; sfx.ok(); drawF(); };
      if (r) r.onclick = () => { FCS.q.push(FCS.q.shift()); FCS.flip = false; sfx.tick(); drawF(); };
    };
    drawF();
    const sp = $('#sp', m);
    const drawS = () => {
      if (SP.ok >= 10) { sp.innerHTML = `<div class="quiz done"><div class="big">🎯</div><h3>${T('Ten in a row', 'Diez seguidas')}</h3><button class="btn ghost" data-a>${T('Again', 'Otra vez')}</button></div>`; markDone('spot'); if (!SP.done) { SP.done = true; sfx.win(); } $('[data-a]', sp).onclick = () => { SP.ok = 0; SP.done = false; SP.cur = null; drawS(); }; return; }
      if (!SP.cur) SP.cur = spotNew();
      const c = SP.cur, opts = ['RAW', 'WAR', 'WAW', T('none', 'ninguna')], ans = ['RAW', 'WAR', 'WAW', 'none'].indexOf(c.t);
      const why = { RAW: T('The second reads what the first writes. Tomasulo waits for the CDB.', 'La segunda lee lo que escribe la primera. Tomasulo espera al CDB.'), WAR: T('The second writes what the first reads. Tomasulo does not wait: the value was copied at issue.', 'La segunda escribe lo que lee la primera. Tomasulo no espera: el valor se copió en la emisión.'),
        WAW: T('Both write the same register. Tomasulo does not wait: the status points to the newest.', 'Ambas escriben el mismo registro. Tomasulo no espera: el estado apunta a la más reciente.'), none: T('No register in common.', 'Ningún registro en común.') }[c.t];
      sp.innerHTML = `<div class="quiz spot"><div class="qprog">${Array.from({ length: 10 }, (_, k) => `<i class="${k < SP.ok ? 'd' : k === SP.ok ? 'c' : ''}"></i>`).join('')}<span>${SP.ok}/10</span></div><div class="code">${c.code}</div><div class="qa">${opts.map((o, k) => `<button class="opt" data-k="${k}">${o}</button>`).join('')}</div><div class="qfb"></div></div>`;
      $$('.opt', sp).forEach(b => (b.onclick = () => {
        const right = +b.dataset.k === ans;
        $$('.opt', sp).forEach(x => (x.disabled = true)); $$('.opt', sp)[ans].classList.add('right');
        if (right) { SP.ok++; sfx.ok(); } else { b.classList.add('wrong'); SP.ok = 0; sfx.bad(); }
        $('.qfb', sp).innerHTML = `<div class="fb ${right ? 'ok' : 'bad'}"><b>${c.t === 'none' ? T('None', 'Ninguna') : c.t}.</b> ${why}${right ? '' : ' ' + T('Streak reset.', 'Racha a cero.')}</div><button class="btn" data-n>${T('Next →', 'Siguiente →')}</button>`;
        const n = $('[data-n]', sp); n.onclick = () => { SP.cur = null; drawS(); }; n.focus({ preventScroll: true });
      }));
    };
    drawS();
    Quiz($('#q', m), 'drill', [
      { type: 'mc', q: T('MULD F0,F2,F4 runs EX in cycles 6–8. DIVD F10,F0,F6 was issued in cycle 6. DIVD\'s row from cycle 6 is…', 'MULD F0,F2,F4 hace EX en los ciclos 6–8. DIVD F10,F0,F6 se emitió en el ciclo 6. La fila de DIVD desde el ciclo 6 es…'), opts: ['IS – – EX', 'IS – – – EX', 'IS EX'], a: 0, why: T('EX in 9 = MULD\'s last EX (8) + 1.', 'EX en 9 = último EX de MULD (8) + 1.') },
      { type: 'num', q: T('LD is issued in cycle 3 with its base register ready (1 EX + 1 M). In which cycle is its WB?', 'LD se emite en el ciclo 3 con su registro base listo (1 EX + 1 M). ¿En qué ciclo es su WB?'), a: 6, tol: 0, why: 'IS 3, EX 4, M 5, WB 6.' },
      { type: 'mc', q: T('ADDD F10,F0,F8 then SUBD F10,F12,F14. SUBD writes back first. What does the register status of F10 show after SUBD\'s WB?', 'ADDD F10,F0,F8 y luego SUBD F10,F12,F14. SUBD hace WB primero. ¿Qué muestra el estado de F10 tras el WB de SUBD?'), opts: [T('Nothing: F10 holds SUBD\'s value', 'Nada: F10 tiene el valor de SUBD'), T('The tag of ADDD\'s station', 'La etiqueta de la estación de ADDD')], a: 0, why: T('It pointed to SUBD\'s station from SUBD\'s issue; ADDD\'s later WB does not touch F10.', 'Apuntaba a la estación de SUBD desde su emisión; el WB posterior de ADDD no toca F10.') },
      { type: 'mc', q: T('Which stage exists in the Marcador but not in Tomasulo?', '¿Qué etapa existe en el Marcador pero no en Tomasulo?'), opts: ['RO', 'IS', 'WB'], a: 0, why: T('Operands are read and renamed in IS itself.', 'Los operandos se leen y renombran en la propia IS.') },
      { type: 'mc', q: T('Speculative machine: ADD has WB in 7, the branch before it commits in 10. ADD\'s cells for 8, 9, 10 are…', 'Máquina especulativa: ADD tiene WB en 7 y el salto anterior confirma en 10. Las celdas de ADD en 8, 9, 10 son…'), opts: [T('– – – in the WB colour', '– – – con el color de WB'), 'C C C', T('empty', 'vacías')], a: 0 },
      { type: 'mc', q: T('Same case, but the branch was mispredicted. ADD\'s cell in cycle 11 is…', 'El mismo caso, pero con fallo de predicción. La celda de ADD en el ciclo 11 es…'), opts: ['C', 'Cancel', 'WB'], a: 1 },
      { type: 'mc', q: T('Where is the misprediction acted on in the speculative machine?', '¿Dónde se actúa ante el fallo de predicción en la máquina especulativa?'), opts: [T('When the branch finishes EX', 'Cuando el salto acaba EX'), T('When the branch commits', 'Cuando el salto confirma')], a: 1, why: T('Slide 15: BEQ finishes EX in 8 but ADD and SUB are cancelled in 11, after its commit in 10.', 'Diapositiva 15: BEQ acaba EX en 8 pero ADD y SUB se cancelan en 11, tras su commit en 10.') },
      { type: 'mc', q: T('Tomasulo without ROB: where does a register get written?', 'Tomasulo sin ROB: ¿dónde se escribe un registro?'), opts: ['WB', 'C', 'EX'], a: 0 },
      { type: 'mc', q: T('Two instructions finish EX in the same cycle on different units. In Tomasulo they…', 'Dos instrucciones acaban EX en el mismo ciclo en unidades distintas. En Tomasulo…'), opts: [T('both do WB the next cycle', 'las dos hacen WB el ciclo siguiente'), T('take turns on the CDB', 'se turnan en el CDB')], a: 0, why: T('"WB allows one write per functional unit" in the course\'s machine; CDB saturation is listed as a limitation of the real design.', '"WB permite una escritura por unidad funcional" en la máquina del curso; la saturación del CDB figura como limitación del diseño real.') },
      { type: 'mc', q: T('Which is NOT kept per thread in SMT?', '¿Qué NO se mantiene por hilo en SMT?'), opts: ['PC', T('Register map', 'Mapa de registros'), T('Functional units', 'Unidades funcionales')], a: 2 },
      { type: 'mc', q: T('Static superscalar: hazard detection and scheduling are…', 'Superescalar estático: detección de riesgos y planificación son…'), opts: [T('hardware, static', 'hardware, estática'), T('software, static', 'software, estática'), T('hardware, dynamic', 'hardware, dinámica')], a: 0 },
      { type: 'num', q: T('Sheet E3_6/E3_7 program: the Marcador needs 14 cycles. How many does Tomasulo need (E3_7 solution)?', 'Programa del boletín E3_6/E3_7: el Marcador necesita 14 ciclos. ¿Cuántos necesita Tomasulo (solución de E3_7)?'), a: 10, tol: 0 }
    ]);
  }
});
