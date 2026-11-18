'use strict';
/* Home, Lesson 1 (why Tomasulo), Lesson 2 (stages and cronogram rules) */

STATIC.l36 = { n: 16, src: 'L3_6 · 16', rows: mkRows([
  ['LD F6,34(R2)', 1, 'IF IS RO EX M WB'], ['LD F2,45(R3)', 2, 'IF IS RO EX M WB'], ['MULD F0,F2,F4', 3, 'IF IS RO - - EX EX EX WB'],
  ['SUBD F8,F6,F8', 4, 'IF IS RO EX EX WB'], ['DIVD F10,F0,F6', 5, 'IF IS RO - - - - EX EX EX EX WB'], ['ADDD F6,F8,F2', 6, 'IF IS RO - EX EX WB']]) };

View('home', {
  icon: '🏠', title: () => T('Start', 'Inicio'),
  render(m) {
    const ids = Order.filter(id => id !== 'home');
    const all = ids.flatMap(id => Views[id].done()), n = all.filter(x => S.done[x]).length;
    m.innerHTML = `
    <section class="hero">
      <div class="kicker">Arquitectura de Computadores · L3_7 · L3_8</div>
      <h1>${T('Tomasulo and speculation, one cycle at a time', 'Tomasulo y especulación, ciclo a ciclo')}</h1>
      <p class="lead">${T('Step real cronograms forward and watch the stations, the CDB and the ROB change. The stage colours are the ones in your slides:', 'Avanza cronogramas reales y mira cómo cambian las estaciones, el CDB y el ROB. Los colores de las etapas son los de tus diapositivas:')}</p>
      <div class="skey" style="margin:14px 0">${sg('IF')} ${T('fetch', 'captación')} ${sg('IS')} ${T('issue', 'emisión')} ${sg('EX')} ${T('execute', 'ejecución')} ${sg('M')} ${T('memory', 'memoria')} ${sg('WB')} ${T('write result, CDB', 'difusión, CDB')} ${sg('C')} ${T('commit', 'confirmación')} ${sg('Cancel')}</div>
      <div class="prog"><div class="bar"><i style="width:${(100 * n / all.length).toFixed(0)}%"></i></div><span>${n}/${all.length} ${T('checkpoints done', 'hitos completados')}</span></div>
    </section>
    <section class="cards">${ids.map((id, k) => {
      const v = Views[id];
      return `<a class="card link ${isDone(id) ? 'isdone' : ''}" href="#/${id}"><div class="cnum">${k + 1}</div><div><h3>${v.icon} ${v.title()} ${isDone(id) ? '<span class="ck">✓</span>' : ''}</h3><p>${v.desc()}</p><small>≈ ${v.mins} min</small></div></a>`;
    }).join('')}</section>
    <section class="card tip">
      <h3>${T('Sources', 'Fuentes')}</h3>
      <ul>
        <li>${T('<b>From the course, cell for cell:</b> L3_7 slides 15, 17, 18 · L3_8 slides 13, 15 · E3_7 · E3_8 part 4. The 5-stage and Marcador cronograms are copied from the solved sheets.', '<b>Del curso, celda a celda:</b> L3_7 diapositivas 15, 17, 18 · L3_8 diapositivas 13, 15 · E3_7 · E3_8 parte 4. Los cronogramas de 5 etapas y del Marcador están copiados de los boletines resueltos.')}</li>
        <li>${T('<b>Mine</b>, marked <i>extra case</i>: full station, busy unit, load after store, store commit; also the register values.', '<b>Míos</b>, marcados <i>caso extra</i>: estación llena, unidad ocupada, carga tras store, commit de un store; y los valores de los registros.')}</li>
      </ul>
    </section>`;
  }
});

View('why', {
  icon: '①', mins: 8, title: () => T('Why Tomasulo', 'Por qué Tomasulo'),
  desc: () => T('Three dependencies, and the three ideas that remove two of them.', 'Tres dependencias y las tres ideas que eliminan dos de ellas.'),
  done: () => ['why'],
  render(m) {
    const hz = (c, name, es, real, code, say, mar, tom) => `<div class="hzc ${c}"><h4><b>${name}</b><small class="mute">${es}</small></h4><span class="pill ${real ? 'conf' : 'cap'}">${real ? T('real data dependency', 'dependencia real de datos') : T('name only', 'solo de nombre')}</span>
      <div class="code">${code}</div><p>${say}</p><div class="vsr"><b>Marcador</b><span>${mar}</span><b>Tomasulo</b><span>${tom}</span></div></div>`;
    m.innerHTML = `<div class="lesson">${head(T('Lesson 1 · L3_7 slides 2–6, 16', 'Lección 1 · L3_7 diapositivas 2–6, 16'), T('Why Tomasulo', 'Por qué Tomasulo'),
      T('The Marcador stalls on all three kinds of dependency. Tomasulo stalls on one.', 'El Marcador se detiene con los tres tipos de dependencia. Tomasulo, con uno.'))}
    ${learnBar()}
    ${cb(T('Three dependencies', 'Tres dependencias'), 'L3_7 · 5', `<div class="hz3">
      ${hz('raw', 'RAW', T('read after write', 'lectura tras escritura'), 1, 'MULD <u>F0</u>,F2,F4\nADDD F6,<u>F0</u>,F8', T('ADDD needs the value MULD produces.', 'ADDD necesita el valor que produce MULD.'),
        T(`waits in ${hk('RO')} until MULD's WB`, `espera en ${hk('RO')} hasta el WB de MULD`), T(`waits in its ${hk('station')} and takes the value off the ${hk('CDB')}`, `espera en su ${hk('estación')} y toma el valor del ${hk('CDB')}`))}
      ${hz('war', 'WAR', T('write after read', 'escritura tras lectura'), 0, 'ADDD F10,F0,<u>F8</u>\nSUBD <u>F8</u>,F8,F14', T('SUBD must not overwrite F8 before ADDD has read it.', 'SUBD no debe sobrescribir F8 antes de que ADDD lo lea.'),
        T(`freezes SUBD's ${hk('WB')}`, `congela el ${hk('WB')} de SUBD`), T(`${hp('gone')}: ADDD ${hk('copied F8 into its station at issue')}`, `${hp('eliminado')}: ADDD ${hk('copió F8 en su estación al emitirse')}`))}
      ${hz('waw', 'WAW', T('write after write', 'escritura tras escritura'), 0, 'ADDD <u>F10</u>,F0,F8\nSUBD <u>F10</u>,F12,F14', T('F10 must end up with SUBD\'s value, whoever finishes last.', 'F10 debe quedar con el valor de SUBD, acabe quien acabe el último.'),
        T(`blocks SUBD in ${hk('IS')}`, `bloquea SUBD en ${hk('IS')}`), T(`${hp('gone')}: the ${hk('register status')} points only to the ${hk('newest')} station`, `${hp('eliminado')}: el ${hk('estado del registro')} apunta solo a la estación ${hk('más reciente')}`))}
      </div>${trap(T('WAR and WAW are <b>dependencies of name</b>, not of data: two instructions happen to reuse a register. Renaming removes them. RAW is the only one Tomasulo still waits for.', 'WAR y WAW son <b>dependencias de nombre</b>, no de datos: dos instrucciones reutilizan un registro. El renombrado las elimina. RAW es la única por la que Tomasulo sigue esperando.'))}`)}
    ${cb(T('What Tomasulo adds to the Marcador', 'Qué añade Tomasulo al Marcador'), 'L3_7 · 2–4', `<div class="three">
      <div class="mini t"><h4>1 · ${T('Distributed control', 'Control distribuido')}</h4><p>${T(`Every functional unit has its own ${hk('reservation stations')} <i>(estaciones de reserva)</i>.`, `Cada unidad funcional tiene sus propias ${hk('estaciones de reserva')}.`)}</p></div>
      <div class="mini t"><h4>2 · ${T('Register renaming', 'Renombrado de registros')}</h4><p>${T(`A register name is replaced by a ${hk('value')} or by a ${hk('pointer to the station')} that will produce it.`, `El nombre de un registro se sustituye por un ${hk('valor')} o por un ${hk('puntero a la estación')} que lo producirá.`)}</p></div>
      <div class="mini t"><h4>3 · ${T('Common Data Bus', 'Bus común de datos')}</h4><p>${T(`Results are ${hk('broadcast')} to everyone waiting, ${hp('without going through the register file first')}.`, `Los resultados se ${hk('difunden')} a todos los que esperan, ${hp('sin pasar antes por el banco de registros')}.`)}</p></div></div>
      <p class="mute">${T(`Robert Tomasulo, ${hn('1966')}, for the ${hn('IBM 360/91')}: maximise ILP without special compilers or static reordering.`, `Robert Tomasulo, ${hn('1966')}, para el ${hn('IBM 360/91')}: maximizar el ILP sin compiladores especiales ni reordenación estática.`)}</p>`)}
    ${cb(T('The machine', 'La máquina'), 'L3_7 · 3', dpMap('main', false))}
    ${cb(T('Loads and stores', 'Cargas y almacenamientos'), 'L3_7 · 6', `<ul class="keyl">
      <li>${T(`Address ${hk('disambiguation')} <i>(desambiguación)</i> avoids RAW, WAR and WAW hazards <b>through memory</b>.`, `La ${hk('desambiguación')} de direcciones evita los riesgos RAW, WAR y WAW <b>en memoria</b>.`)}</li>
      <li>${T(`A load ${hc('waits')} if an earlier store has an ${hk('unknown or matching address')}.`, `Una carga ${hc('espera')} si un store anterior tiene ${hk('dirección desconocida o coincidente')}.`)}</li>
      <li>${T(`Stores execute ${hk('strictly in order')}.`, `Los stores se ejecutan ${hk('estrictamente en orden')}.`)}</li></ul>`)}
    ${cb(T('Advantages and limits', 'Ventajas y limitaciones'), 'L3_7 · 16', `<div class="grid2 tight"><ul class="keyl">
      <li>${hp(T('Out-of-order execution and completion', 'Ejecución y finalización fuera de orden'))}</li>
      <li>${hp(T('Hazard detection is distributed; several units work at once', 'La detección de riesgos se distribuye; varias unidades a la vez'))}</li>
      <li>${hp(T('No WAR or WAW, without help from the compiler', 'Sin WAR ni WAW, sin ayuda del compilador'))}</li></ul><ul class="keyl">
      <li>${hc(T('The CDB can saturate if several units finish in one cycle', 'El CDB puede saturarse si varias unidades acaban en un ciclo'))}</li>
      <li>${hc(T('Searching the stations costs power', 'La búsqueda en las estaciones consume potencia'))}</li></ul></div>
      <p>${T(`Modern cores (Intel Core, AMD Zen, ARM Cortex) add a ${hk('Reorder Buffer')} for ${hk('in-order retirement')}: Lesson 4.`, `Los procesadores modernos (Intel Core, AMD Zen, ARM Cortex) añaden un ${hk('búfer de reordenación')} para la ${hk('retirada en orden')}: Lección 4.`)}</p>`)}
    <h2>${T('Check', 'Comprueba')}</h2><div id="q"></div>${nextLink('stages')}</div>`;
    const root = $('.lesson', m); learnInit(root); dpMapInit(root);
    Quiz($('#q', m), 'why', [
      { type: 'mc', q: T('Which dependency does Tomasulo still have to wait for?', '¿Por qué dependencia sigue esperando Tomasulo?'), opts: ['RAW', 'WAR', 'WAW'], a: 0, why: T('It is the only real data dependency.', 'Es la única dependencia real de datos.') },
      { type: 'mc', q: T('How does Tomasulo remove a WAR hazard?', '¿Cómo elimina Tomasulo un riesgo WAR?'), opts: [T('Freezes the writer\'s WB', 'Congela el WB del escritor'), T('Copies the source value into the station at issue', 'Copia el valor fuente en la estación al emitir'), T('Blocks the writer in IS', 'Bloquea al escritor en IS')], a: 1, why: T('Once the value is in the station, the register can be overwritten.', 'Con el valor en la estación, el registro puede sobrescribirse.') },
      { type: 'mc', q: T('How does Tomasulo remove a WAW hazard?', '¿Cómo elimina Tomasulo un riesgo WAW?'), opts: [T('The register status table points only to the newest station', 'La tabla de estado de registros apunta solo a la estación más reciente'), T('The second writer waits in IS', 'El segundo escritor espera en IS'), T('The CDB carries two values', 'El CDB lleva dos valores')], a: 0, why: T('The older writer\'s result is simply not copied into the register.', 'El resultado del escritor antiguo simplemente no se copia en el registro.') },
      { type: 'mc', q: T('In the Marcador, where does a WAW hazard stop the instruction?', 'En el Marcador, ¿dónde detiene un riesgo WAW a la instrucción?'), opts: ['IS', 'RO', 'WB'], a: 0, why: T('Structural and WAW stop it in IS; RAW in RO; WAR freezes WB.', 'Estructural y WAW la detienen en IS; RAW en RO; WAR congela WB.') },
      { type: 'mc', q: T('What travels on the CDB?', '¿Qué viaja por el CDB?'), opts: [T('A result with the tag of the station that produced it', 'Un resultado con la etiqueta de la estación que lo produjo'), T('The next instruction to issue', 'La siguiente instrucción a emitir'), T('Only memory addresses', 'Solo direcciones de memoria')], a: 0 },
      { type: 'mc', q: T('A load must wait when…', 'Una carga debe esperar cuando…'), opts: [T('any store is in the machine', 'hay cualquier store en la máquina'), T('an earlier store has an unknown or matching address', 'un store anterior tiene dirección desconocida o coincidente'), T('the adder is busy', 'el sumador está ocupado')], a: 1 },
      { type: 'mc', q: T('Which is a limitation of Tomasulo?', '¿Cuál es una limitación de Tomasulo?'), opts: [T('It needs a special compiler', 'Necesita un compilador especial'), T('The CDB can saturate when several units finish together', 'El CDB puede saturarse si varias unidades acaban a la vez'), T('It cannot execute out of order', 'No puede ejecutar fuera de orden')], a: 1 }
    ]);
  }
});

View('stages', {
  icon: '②', mins: 10, title: () => T('Stages and cronogram rules', 'Etapas y reglas del cronograma'),
  desc: () => T('The four stages, the rules that fix every cell, and the same program on four machines.', 'Las cuatro etapas, las reglas que fijan cada celda y el mismo programa en cuatro máquinas.'),
  done: () => ['stages'],
  render(m) {
    const mini = (rows, n, o) => cronoHTML(mkRows(rows), n, o).replace('class="cr ', 'class="cr sm ');
    const stc = (c, name, es, li) => `<div class="stc"><h4 class="s-${c}">${name}<small>${es}</small></h4><ul>${li.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
    const rl = (n, h, p, cr) => `<div class="rl"><h4><i>${n}</i>${h}</h4><p>${p}</p>${cr}</div>`;
    m.innerHTML = `<div class="lesson">${head(T('Lesson 2 · L3_7 slides 7–15 · E3_6 · E3_8', 'Lección 2 · L3_7 diapositivas 7–15 · E3_6 · E3_8'), T('Stages and cronogram rules', 'Etapas y reglas del cronograma'),
      T('Six rules decide every cell of a Tomasulo cronogram.', 'Seis reglas deciden cada celda de un cronograma de Tomasulo.'))}
    ${learnBar()}
    ${cb(T('Four stages', 'Cuatro etapas'), 'L3_7 · 7–10', `<div class="stg4">
      ${stc('if', 'IF', T('fetch · captación', 'captación'), [T('Read in sequence from memory.', 'Se lee secuencialmente de memoria.')])}
      ${stc('is', 'IS', T('issue · emisión', 'emisión'), [T(`Decode. ${hk('Strictly in order')}, one per cycle.`, `Decodifica. ${hk('Estrictamente en orden')}, una por ciclo.`), T(`Waits only for a ${hk('free station or buffer')} (structural).`, `Solo espera una ${hk('estación o búfer libre')} (estructural).`), T(`Operands are read and ${hk('renamed')}.`, `Se leen y ${hk('renombran')} los operandos.`)])}
      ${stc('ex', 'EX / M', T('execute · ejecución', 'ejecución'), [T(`The station ${hk('watches the CDB')} until RAW is resolved.`, `La estación ${hk('observa el CDB')} hasta resolver el RAW.`), T(`Starts when ${hk('all operands')} are there.`, `Empieza cuando están ${hk('todos los operandos')}.`), T(`Load/store: ${hk('EX = address')}, ${hk('M = access')}.`, `Carga/almac.: ${hk('EX = dirección')}, ${hk('M = acceso')}.`)])}
      ${stc('wb', 'WB', T('write result · difusión', 'difusión'), [T(`Result goes on the ${hk('CDB')}.`, `El resultado va al ${hk('CDB')}.`), T('Waiting stations capture it; the register is written.', 'Las estaciones que esperan lo capturan; se escribe el registro.'), T(`The station is ${hk('freed')}.`, `La estación queda ${hk('libre')}.`)])}
    </div>${trap(T('A stopped instruction in IS does <b>not</b> block the ones behind it: it is drawn IS, –, –, … while later instructions are issued and even finish.', 'Una instrucción detenida en IS <b>no</b> bloquea a las siguientes: se dibuja IS, –, –, … mientras las posteriores se emiten e incluso terminan.'))}`)}
    ${cb(T('The six rules', 'Las seis reglas'), 'L3_7 · 13–18', `<div class="rules">
      ${rl(1, T('IF then IS, in order', 'IF y luego IS, en orden'), T(`One fetch and one issue per cycle: IS is the cycle ${hk('after IF')}, unless no station is free.`, `Una captación y una emisión por ciclo: IS es el ciclo ${hk('siguiente a IF')}, salvo que no haya estación libre.`), mini([['LD F6,34(R2)', 1, 'IF IS EX M WB'], ['LD F2,45(R3)', 2, 'IF IS EX M WB']], 6))}
      ${rl(2, T('The RAW rule', 'La regla del RAW'), T(`Consumer's first EX = producer's ${hk('last EX/M + 1')}, which is the ${hk("producer's WB cycle")}.`, `Primer EX del consumidor = ${hk('último EX/M + 1')} del productor, que es el ${hk('ciclo de WB del productor')}.`), mini([['LD F2,45(R3)', 2, 'IF IS EX M WB'], ['MULD F0,F2,F4', 3, 'IF IS - EX EX EX WB']], 9, { hl: new Set([1]) }))}
      ${rl(3, T('Waiting is drawn IS – –', 'La espera se dibuja IS – –'), T(`Issue itself takes ${hk('one cycle')}. After it the instruction ${hk('sits in its reservation station')}, watching the CDB. The course draws that wait as dashes ${hk('shaded like IS')}, the last stage it completed, and calls it "espera en IS".`, `La emisión dura ${hk('un ciclo')}. Después la instrucción ${hk('está en su estación de reserva')}, observando el CDB. El curso dibuja esa espera con guiones ${hk('del color de IS')}, la última etapa completada, y la llama "espera en IS".`), mini([['DIVD F0,F2,F4', 1, 'IF IS EX EX EX EX WB'], ['ADDD F10,F0,F8', 2, 'IF IS - - - EX EX WB']], 9))}
      ${rl(4, T('WB is the next cycle', 'WB es el ciclo siguiente'), T(`WB = last EX/M + 1. ${hk('One write per functional unit')}, so two units can write in the same cycle.`, `WB = último EX/M + 1. ${hk('Una escritura por unidad funcional')}, así que dos unidades pueden escribir en el mismo ciclo.`), mini([['DIVD F0,F2,F4', 1, 'IF IS EX EX EX EX WB'], ['SUBD F8,F8,F14', 3, 'IF IS EX EX WB']], 9))}
      ${rl(5, T('Memory: EX then M', 'Memoria: EX y luego M'), T(`A store has both. Its ${hk('data')} comes off the CDB like any operand: in E3_7, SD gets F2 in ADDD's WB cycle (8), which is also its EX.`, `Un store tiene ambas. Su ${hk('dato')} llega por el CDB como cualquier operando: en E3_7, SD recibe F2 en el ciclo de WB de ADDD (8), que es también su EX.`), mini([['ADDD F2,F2,F8', 5, 'IF IS EX WB'], ['SD F2,1000(R1)', 6, 'IF IS EX M WB']], 10, { hl: new Set([1]) }))}
      ${rl(6, T('Branches, no speculation', 'Saltos, sin especulación'), T(`What follows a branch is fetched and issued, but ${hk('does not execute')} until the branch resolves. Wrong path: ${hk('Cancel')} the cycle after the branch's EX.`, `Lo que sigue a un salto se capta y emite, pero ${hk('no ejecuta')} hasta que el salto se resuelve. Camino erróneo: ${hk('Cancel')} el ciclo siguiente al EX del salto.`), mini([['beq x12, x0, final', 5, 'IF IS - EX WB'], ['or x13, x10, x11', 6, 'IF IS - Cancel']], 10))}
    </div>`)}
    ${cb(T('Same program, four machines', 'El mismo programa, cuatro máquinas'), 'E3_8 · ej. 1', `<p>${T('Follow <b>sub</b>, which needs x11 from <b>ld</b>, and <b>mult</b>, which overwrites x11.', 'Sigue a <b>sub</b>, que necesita x11 de <b>ld</b>, y a <b>mult</b>, que sobrescribe x11.')}</p>
      ${segc('cmp', [['e38a', T('5 stages', '5 etapas'), T('no forwarding', 'sin forwarding')], ['e38b', T('5 stages', '5 etapas'), 'forwarding'], ['e38c', 'Marcador'], ['tom', 'Tomasulo']], 'tom')}
      <div id="cmp"></div><div class="tot" id="tot"></div><div class="cmpx" id="cmpx"></div>`)}
    ${cb(T('Marcador against Tomasulo', 'Marcador frente a Tomasulo'), 'L3_6 · 16 · L3_7 · 15', `${segc('mt', [['l', T('Lecture example', 'Ejemplo de clase')], ['e', T('Sheet E3_6 / E3_7', 'Boletín E3_6 / E3_7')]], 'l')}<div id="mt"></div>`)}
    <h2>${T('Check', 'Comprueba')}</h2><div id="q"></div>${nextLink('tomasulo')}</div>`;
    const root = $('.lesson', m); learnInit(root);
    const tom = simOf('e38'), tots = [['e38a', T('5 stages, no forwarding', '5 etapas, sin forwarding'), 17], ['e38b', T('5 stages, forwarding', '5 etapas, forwarding'), 13], ['e38c', 'Marcador', 15], ['tom', 'Tomasulo', 10]];
    const X = {
      e38a: T('<b>RAW:</b> sub waits in ID until ld\'s WB cycle, then EX. <b>mult:</b> just queues behind it.', '<b>RAW:</b> sub espera en ID hasta el ciclo de WB de ld, y luego EX. <b>mult:</b> solo hace cola detrás.'),
      e38b: T('<b>RAW:</b> sub goes to EX the cycle after ld\'s last MEM. <b>mult:</b> still queues; a pipeline executes in order.', '<b>RAW:</b> sub pasa a EX el ciclo siguiente al último MEM de ld. <b>mult:</b> sigue en cola; un pipeline ejecuta en orden.'),
      e38c: T('<b>RAW:</b> sub waits in RO; EX is the cycle <b>after</b> ld\'s WB. <b>WAW:</b> mult is blocked in IS until ld writes x11, and blocks beq behind it.', '<b>RAW:</b> sub espera en RO; EX es el ciclo <b>siguiente</b> al WB de ld. <b>WAW:</b> mult se bloquea en IS hasta que ld escribe x11, y bloquea a beq detrás.'),
      tom: T('<b>RAW:</b> sub waits in its station; EX is the <b>same</b> cycle as ld\'s WB. <b>WAR/WAW:</b> mult runs at once and finishes before sub even starts.', '<b>RAW:</b> sub espera en su estación; EX es el <b>mismo</b> ciclo que el WB de ld. <b>WAR/WAW:</b> mult ejecuta enseguida y termina antes de que sub empiece.')
    };
    const cmp = v => {
      const st = STATIC[v];
      $('#cmp', m).innerHTML = v === 'tom' ? cronoHTML(simRows(tom), 17, { hl: new Set([2, 3]) }) : cronoHTML(st.rows, 17, { five: st.five, hl: new Set([2, 3]) });
      $('#tot', m).innerHTML = tots.map(([k, n, c]) => `<span class="${k === v ? 'on' : ''}">${n}</span><i style="width:${c / 17 * 100}%;opacity:${k === v ? 1 : 0.35}"></i><b>${c}</b>`).join('');
      $('#cmpx', m).innerHTML = X[v];
    };
    onSeg(root, 'cmp', cmp); cmp('tom');
    const mt = v => {
      const a = v === 'l' ? STATIC.l36 : STATIC.e36, b = simOf(v === 'l' ? 'main' : 'e37');
      $('#mt', m).innerHTML = `<h4>Marcador · ${a.n} ${T('cycles', 'ciclos')} ${sref(a.src)}</h4>${cronoHTML(a.rows, 16)}<h4>Tomasulo · ${b.last} ${T('cycles', 'ciclos')} ${sref(v === 'l' ? 'L3_7 · 15' : 'E3_7')}</h4>${cronoHTML(simRows(b), 16)}
        <div class="cmpx">${v === 'l' ? T('The 3 cycles come from RO and from reading only after WB: MULD starts in 8 instead of 6, DIVD in 12 instead of 9.', 'Los 3 ciclos vienen de RO y de leer solo tras el WB: MULD empieza en 8 en vez de 6, DIVD en 12 en vez de 9.')
    : T('In the Marcador, SUBD is blocked in IS by the WAW on F10, and because issue is sequential MULD, ADDD and SD queue behind it. In Tomasulo nobody waits for that.', 'En el Marcador, SUBD se bloquea en IS por el WAW sobre F10 y, como la emisión es secuencial, MULD, ADDD y SD hacen cola detrás. En Tomasulo nadie espera por eso.')}</div>`;
    };
    onSeg(root, 'mt', mt); mt('l');
    Quiz($('#q', m), 'stages', [
      { type: 'num', q: T('A producer runs EX in cycles 6, 7, 8. In which cycle is its WB?', 'Un productor hace EX en los ciclos 6, 7, 8. ¿En qué ciclo es su WB?'), a: 9, tol: 0, why: T('WB = last EX + 1.', 'WB = último EX + 1.') },
      { type: 'num', q: T('Same producer (EX in 6, 7, 8). A consumer was issued in cycle 6 and waits only for it. First EX cycle of the consumer in Tomasulo?', 'El mismo productor (EX en 6, 7, 8). Un consumidor se emitió en el ciclo 6 y solo lo espera a él. ¿Primer ciclo de EX del consumidor en Tomasulo?'), a: 9, tol: 0, why: T('Last EX + 1 = 9, the producer\'s WB cycle.', 'Último EX + 1 = 9, el ciclo de WB del productor.'), hint: T('It takes the value off the CDB.', 'Toma el valor del CDB.') },
      { type: 'num', q: T('And in the Marcador (consumer already in RO)? First EX cycle.', '¿Y en el Marcador (consumidor ya en RO)? Primer ciclo de EX.'), a: 10, tol: 0, why: T('It reads only after the producer\'s WB (9): EX in 10.', 'Solo lee tras el WB del productor (9): EX en 10.') },
      { type: 'mc', q: T('An instruction is issued in cycle 4 and its operand arrives for cycle 7. How are cycles 5 and 6 drawn?', 'Una instrucción se emite en el ciclo 4 y su operando llega para el ciclo 7. ¿Cómo se dibujan los ciclos 5 y 6?'), opts: [T('– – in the IS colour', '– – con el color de IS'), 'IS IS', T('– – in the EX colour', '– – con el color de EX')], a: 0 },
      { type: 'mc', q: T('LD F2,45(R3) is issued in cycle 3 with R3 available. Its row is…', 'LD F2,45(R3) se emite en el ciclo 3 con R3 disponible. Su fila es…'), opts: ['IS EX M WB', 'IS EX EX WB', 'IS M EX WB'], a: 0, why: T('EX computes the address, M accesses memory.', 'EX calcula la dirección, M accede a memoria.') },
      { type: 'mc', q: T('DIVD and SUBD both finish EX in cycle 6. Can both do WB in cycle 7?', 'DIVD y SUBD acaban EX en el ciclo 6. ¿Pueden hacer WB las dos en el ciclo 7?'), opts: [T('Yes: one write per functional unit', 'Sí: una escritura por unidad funcional'), T('No: one WB per cycle', 'No: un WB por ciclo')], a: 0, why: T('Slides 17 and 18 show exactly that.', 'Las diapositivas 17 y 18 muestran justo eso.') },
      { type: 'mc', q: T('Tomasulo without speculation: "or" follows an unresolved beq and has its operands. It…', 'Tomasulo sin especulación: "or" sigue a un beq sin resolver y tiene sus operandos. Entonces…'), opts: [T('executes', 'ejecuta'), T('is issued but waits (–)', 'se emite pero espera (–)'), T('is not fetched', 'no se capta')], a: 1 },
      { type: 'num', q: T('E3_8: how many cycles does the Tomasulo version take in total?', 'E3_8: ¿cuántos ciclos tarda en total la versión Tomasulo?'), a: 10, tol: 0, why: T('Against 15 for the Marcador and 13 for the 5-stage pipeline with forwarding.', 'Frente a 15 del Marcador y 13 del pipeline de 5 etapas con forwarding.') }
    ]);
  }
});
