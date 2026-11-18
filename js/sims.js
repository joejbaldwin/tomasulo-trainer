'use strict';
/* Lesson 3: Tomasulo machine. Lesson 4: speculation, ROB and commit. */

function scPick(view, ids, cur) {
  const grp = k => ids.filter(i => (SCEN[i].kind === 'mine') === k);
  const chip = i => `<a class="chipb ${i === cur ? 'on' : ''} ${S.done[view + '-' + i] ? 'dn' : ''}" href="#/${view}/${i}">${SCEN[i].title()}</a>`;
  return `<div class="scpick"><small>${T('From the course', 'Del curso')}</small>${grp(false).map(chip).join('')}${grp(true).length ? `<small>${T('Extra cases', 'Casos extra')}</small>${grp(true).map(chip).join('')}` : ''}</div>`;
}

View('tomasulo', {
  icon: '③', mins: 25, title: () => T('Tomasulo, step by step', 'Tomasulo, paso a paso'),
  desc: () => T('Run the lecture cronograms cycle by cycle with stations, register status and CDB.', 'Ejecuta los cronogramas de clase ciclo a ciclo con estaciones, estado de registros y CDB.'),
  done: () => ['tomasulo-main', 'tomasulo-war', 'tomasulo-waw', 'tomasulo-e38'],
  render(m, p) {
    const id = TOM_IDS.includes(p) ? p : store.get('tomsc', 'main'); store.set('tomsc', id);
    const nx = TOM_IDS[TOM_IDS.indexOf(id) + 1];
    m.innerHTML = `${head(T('Lesson 3 · L3_7 · E3_7 · E3_8', 'Lección 3 · L3_7 · E3_7 · E3_8'), T('Tomasulo, step by step', 'Tomasulo, paso a paso'),
      T('Predict the next column, then press →. Click a dependency to see which rows it links.', 'Predice la siguiente columna y pulsa →. Pulsa una dependencia para ver qué filas une.'))}
      ${scPick('tomasulo', TOM_IDS, id)}<div id="mc"></div>
      ${id === 'e37' ? `<p class="mute">${T('Solve it yourself first:', 'Resuélvelo antes tú:')} <a href="#/build/e37">${T('open E3_7 in the builder', 'abrir E3_7 en el constructor')} →</a></p>` : ''}
      ${nextLink('rob')}`;
    Machine($('#mc', m), id, {
      onEnd: () => markDone('tomasulo-' + id),
      end: () => (nx ? `<a href="#/tomasulo/${nx}">${T('Next case', 'Siguiente caso')}: ${SCEN[nx].title()} →</a>` : `<a href="#/rob">${T('On to speculation', 'A la especulación')} →</a>`)
    });
  }
});

View('rob', {
  icon: '④', mins: 20, title: () => T('Speculation, ROB and commit', 'Especulación, ROB y commit'),
  desc: () => T('Why a reorder buffer, the fifth stage, and a commit walkthrough with the ROB table.', 'Por qué un búfer de reordenación, la quinta etapa y un recorrido del commit con la tabla del ROB.'),
  done: () => ['rob-s13', 'rob-s15', 'rob'],
  render(m, p) {
    const id = ROB_IDS.includes(p) ? p : store.get('robsc', 's13'); store.set('robsc', id);
    const nx = ROB_IDS[ROB_IDS.indexOf(id) + 1];
    m.innerHTML = `<div class="lesson">${head(T('Lesson 4 · L3_8 slides 2–15', 'Lección 4 · L3_8 diapositivas 2–15'), T('Speculation, ROB and commit', 'Especulación, ROB y commit'),
      T('Tomasulo plus one buffer and one stage: results wait in the ROB until they are safe.', 'Tomasulo más un búfer y una etapa: los resultados esperan en el ROB hasta ser seguros.'))}
    ${learnBar(sg('C') + sg('Cancel'))}
    ${cb(T('The idea', 'La idea'), 'L3_8 · 2–5', `<ul class="keyl">
      <li>${T(`Predicting is not enough: the processor must ${hk('fetch, issue and execute')} the predicted path ${hk('before the branch resolves')}.`, `Predecir no basta: el procesador debe ${hk('captar, emitir y ejecutar')} el camino predicho ${hk('antes de resolver el salto')}.`)}</li>
      <li>${T(`Hardware speculation = ${hk('dynamic prediction')} + ${hk('speculation')} that can be undone + ${hk('dynamic scheduling')}.`, `Especulación hardware = ${hk('predicción dinámica')} + ${hk('especulación')} que se puede deshacer + ${hk('planificación dinámica')}.`)}</li>
      <li>${T(`The ${hk('Reorder Buffer (ROB)')} keeps each result from the ${hk('end of execution until commit')}. Registers are updated ${hk('at commit')}, not at WB.`, `El ${hk('búfer de reordenación (ROB)')} guarda cada resultado desde el ${hk('fin de la ejecución hasta el commit')}. Los registros se actualizan ${hk('en el commit')}, no en WB.`)}</li>
      <li>${T(`Later instructions can ${hp('read speculative operands from the ROB')}.`, `Las instrucciones posteriores pueden ${hp('leer operandos especulativos del ROB')}.`)}</li></ul>
      ${dpMap('s13', true)}`)}
    ${cb(T('What changes in each stage', 'Qué cambia en cada etapa'), 'L3_8 · 6–11', `<div class="stg4">
      <div class="stc"><h4 class="s-is">IS<small>${T('issue', 'emisión')}</small></h4><ul><li>${T(`Needs a free station ${hk('and a free ROB entry')}; otherwise ${hc('stall')}.`, `Necesita una estación libre ${hk('y una entrada libre del ROB')}; si no, ${hc('se detiene')}.`)}</li><li>${T(`The ${hk('ROB entry number')} is the tag on the CDB.`, `El ${hk('número de entrada del ROB')} es la etiqueta en el CDB.`)}</li></ul></div>
      <div class="stc"><h4 class="s-ex">EX / M<small>${T('execute', 'ejecución')}</small></h4><ul><li>${T('As in Tomasulo, but it does <b>not</b> wait for earlier branches.', 'Como en Tomasulo, pero <b>no</b> espera a saltos anteriores.')}</li></ul></div>
      <div class="stc"><h4 class="s-wb">WB<small>${T('write result', 'difusión')}</small></h4><ul><li>${T(`Result → CDB → ${hk('ROB')} and waiting stations. Station freed.`, `Resultado → CDB → ${hk('ROB')} y estaciones que esperan. Estación libre.`)}</li><li>${T('A store keeps its value in the ROB.', 'Un store guarda su valor en el ROB.')}</li></ul></div>
      <div class="stc"><h4 class="s-c">C<small>commit · ${T('confirmación', 'confirmación')}</small></h4><ul><li>${T(`Only at the ${hk('head of the ROB')} and with the ${hk('result ready')}.`, `Solo en la ${hk('cabeza del ROB')} y con el ${hk('resultado listo')}.`)}</li><li>${T('Until then nothing touches registers or memory.', 'Hasta entonces nada toca registros ni memoria.')}</li></ul></div></div>
      <h4>${T('Three kinds of commit', 'Tres tipos de commit')}</h4><div class="ck3">
      <div><h4>1 · ${T('Arithmetic, logic, load', 'Aritmética, lógica, carga')}</h4><p>${T(`Copy the result ${hk('from the ROB to the register')}; free the head.`, `Copia el resultado ${hk('del ROB al registro')}; libera la cabeza.`)}</p></div>
      <div><h4>2 · Store</h4><p>${T(`Memory is written ${hk('only at the head')}; the entry is freed after the write.`, `La memoria se escribe ${hk('solo en la cabeza')}; la entrada se libera tras la escritura.`)}</p></div>
      <div><h4>3 · ${T('Conditional branch', 'Salto condicional')}</h4><p>${T(`Right: just removed. Wrong: the ROB is ${hk('flushed completely')} and fetch ${hk('restarts on the correct path')}.`, `Acierto: se elimina. Fallo: el ROB se ${hk('vacía por completo')} y la captación ${hk('reinicia en la ruta correcta')}.`)}</p></div></div>
      ${trap(T('In the cronogram a finished instruction that cannot commit yet is drawn WB, –, –, … in the <b>WB colour</b>, and a flushed one gets a red <b>Cancel</b> in the cycle <b>after</b> the branch commits.', 'En el cronograma, una instrucción terminada que aún no puede confirmar se dibuja WB, –, –, … con el <b>color de WB</b>, y una vaciada recibe un <b>Cancel</b> rojo en el ciclo <b>siguiente</b> al commit del salto.'))}`)}
    <h2 id="sim">${T('Commit walkthrough', 'Recorrido del commit')}</h2>
    ${scPick('rob', ROB_IDS, id)}<div id="mc"></div>
    <h2>${T('Check', 'Comprueba')}</h2><div id="q"></div>${nextLink('build')}</div>`;
    const root = $('.lesson', m); learnInit(root); dpMapInit(root);
    Machine($('#mc', m), id, {
      onEnd: () => markDone('rob-' + id),
      end: () => (nx ? `<a href="#/rob/${nx}">${T('Next case', 'Siguiente caso')}: ${SCEN[nx].title()} →</a>` : '')
    });
    if (p) setTimeout(() => { const e = $('#sim', m); if (e) window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 70); }, 0);
    Quiz($('#q', m), 'rob', [
      { type: 'mc', q: T('With a ROB, when is a register actually written?', 'Con ROB, ¿cuándo se escribe realmente un registro?'), opts: ['WB', T('Commit', 'Commit'), 'IS'], a: 1, why: T('At WB the value only goes to the ROB.', 'En WB el valor solo va al ROB.') },
      { type: 'mc', q: T('An instruction can commit when…', 'Una instrucción puede confirmar cuando…'), opts: [T('its result is ready', 'su resultado está listo'), T('it is at the head of the ROB and its result is ready', 'está en la cabeza del ROB y su resultado está listo'), T('the CDB is free', 'el CDB está libre')], a: 1 },
      { type: 'mc', q: T('Issue stalls in the speculative machine when…', 'La emisión se detiene en la máquina especulativa cuando…'), opts: [T('the stations or the ROB are full', 'las estaciones o el ROB están llenos'), T('a branch has not resolved', 'un salto no se ha resuelto'), T('an earlier instruction has not committed', 'una instrucción anterior no ha confirmado')], a: 0 },
      { type: 'mc', q: T('When does a store write memory?', '¿Cuándo escribe en memoria un store?'), opts: [T('In M, right after EX', 'En M, justo tras EX'), T('At WB', 'En WB'), T('At commit, at the head of the ROB', 'En el commit, en la cabeza del ROB')], a: 2 },
      { type: 'num', q: T('L3_8 slide 13: BNEQ commits in cycle 10. ADD wrote back in cycle 7. In which cycle does ADD commit?', 'L3_8 diapositiva 13: BNEQ confirma en el ciclo 10. ADD hizo WB en el ciclo 7. ¿En qué ciclo confirma ADD?'), a: 11, tol: 0, why: T('It stays speculative until the end of cycle 10.', 'Sigue siendo especulativa hasta el final del ciclo 10.') },
      { type: 'num', q: T('L3_8 slide 15: BEQ (mispredicted) commits in cycle 10. In which cycle is the branch target fetched?', 'L3_8 diapositiva 15: BEQ (fallo de predicción) confirma en el ciclo 10. ¿En qué ciclo se capta el destino del salto?'), a: 11, tol: 0, why: T('The same cycle in which ADD and SUB show Cancel.', 'El mismo ciclo en que ADD y SUB muestran Cancel.') },
      { type: 'mc', q: T('After a misprediction, what happens to results the wrong-path instructions already computed?', 'Tras un fallo de predicción, ¿qué pasa con los resultados que ya calcularon las instrucciones del camino erróneo?'), opts: [T('They are in registers and must be restored', 'Están en los registros y hay que restaurarlos'), T('They only existed in the ROB, which is flushed', 'Solo existían en el ROB, que se vacía')], a: 1 },
      { type: 'mc', q: T('Where can a later instruction get an operand whose producer has finished but not committed?', '¿De dónde obtiene un operando una instrucción posterior si su productor ha terminado pero no ha confirmado?'), opts: [T('From the register', 'Del registro'), T('From the ROB', 'Del ROB'), T('It must wait for the commit', 'Debe esperar al commit')], a: 1 }
    ]);
  }
});
