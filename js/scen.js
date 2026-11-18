'use strict';
/* Scenarios. kind: 'course' = cronogram printed in the slides/solutions and reproduced cell for cell;
   'mine' = extra case built from a rule the slides state. */

const SCEN = {
  main: {
    kind: 'course', src: 'L3_7 · 11–15', lat: { mul: 3, div: 4, add: 2, sub: 2 }, mem: 1, rs: { load: 3 },
    prog: ['LD F6,34(R2)', 'LD F2,45(R3)', 'MULD F0,F2,F4', 'SUBD F8,F6,F8', 'DIVD F10,F0,F6', 'ADDD F6,F8,F2'],
    memv: { 36: 20, 48: 5 },
    title: () => T('The lecture example', 'El ejemplo de clase'),
    watch: () => T('Issue is in order; execution starts and finishes out of order. Follow F2: LD → MULD → DIVD.', 'La emisión va en orden; la ejecución empieza y acaba fuera de orden. Sigue a F2: LD → MULD → DIVD.'),
    asks: [
      { at: 5, q: () => T('MULD was issued in cycle 4 and needs F2. What does it do in cycle 5?', 'MULD se emitió en el ciclo 4 y necesita F2. ¿Qué hace en el ciclo 5?'),
        o: () => [T('Starts EX', 'Empieza EX'), T('Waits (–): LD F2 is still in M', 'Espera (–): LD F2 sigue en M'), T('Goes back to IF', 'Vuelve a IF')], a: 1,
        why: () => T('Its station holds a tag (Load2) instead of a value. It watches the CDB.', 'Su estación guarda una etiqueta (Load2) en vez de un valor. Vigila el CDB.') },
      { at: 6, q: () => T('LD F2 finished M in cycle 5. In which cycle does MULD start EX?', 'LD F2 terminó M en el ciclo 5. ¿En qué ciclo empieza EX MULD?'),
        o: () => ['5', T('6 — the same cycle as LD\'s WB', '6 — el mismo ciclo que el WB de LD'), T('7 — the cycle after LD\'s WB', '7 — el ciclo siguiente al WB de LD')], a: 1,
        why: () => T('The value is forwarded on the CDB: consumer EX = producer\'s last EX/M + 1.', 'El valor se adelanta por el CDB: EX del consumidor = último EX/M del productor + 1.') },
      { at: 7, q: () => T('ADDD F6,F8,F2 is about to be issued. DIVD is still waiting and reads F6. Is that a problem?', 'Se va a emitir ADDD F6,F8,F2. DIVD sigue esperando y lee F6. ¿Hay problema?'),
        o: () => [T('No: DIVD copied F6 into its station at issue', 'No: DIVD copió F6 en su estación al emitirse'), T('Yes: ADDD must wait for DIVD', 'Sí: ADDD debe esperar a DIVD')], a: 0,
        why: () => T('That is the WAR hazard, removed by copying operands at issue.', 'Ese es el riesgo WAR, eliminado al copiar los operandos en la emisión.') }
    ]
  },
  war: {
    kind: 'course', src: 'L3_7 · 17', lat: { div: 4, add: 2, sub: 2 }, regs: { F2: 8, F14: 3 },
    prog: ['DIVD F0,F2,F4', 'ADDD F10,F0,F8', 'SUBD F8,F8,F14'],
    title: () => T('WAR disappears', 'WAR desaparece'),
    watch: () => T('ADDD reads F8, SUBD overwrites F8 later. Watch what ADDD stores at issue.', 'ADDD lee F8, SUBD lo sobrescribe después. Mira qué guarda ADDD al emitirse.'),
    asks: [
      { at: 5, q: () => T('SUBD wants to overwrite F8 while ADDD (still waiting for F0) reads F8. Does SUBD wait?', 'SUBD quiere sobrescribir F8 mientras ADDD (aún esperando F0) lee F8. ¿Espera SUBD?'),
        o: () => [T('Yes, until ADDD has read F8', 'Sí, hasta que ADDD lea F8'), T('No: ADDD already holds the old F8 value', 'No: ADDD ya tiene el valor antiguo de F8')], a: 1,
        why: () => T('Vk of Add1 was filled at issue, in cycle 3.', 'Vk de Add1 se rellenó en la emisión, en el ciclo 3.') }
    ]
  },
  waw: {
    kind: 'course', src: 'L3_7 · 18', lat: { div: 4, add: 2, sub: 2 }, regs: { F2: 8, F14: 5 },
    prog: ['DIVD F0,F2,F4', 'ADDD F10,F0,F8', 'SUBD F10,F12,F14'],
    title: () => T('WAW disappears', 'WAW desaparece'),
    watch: () => T('Two writers of F10. Watch the register status of F10 in cycles 3, 4, 7 and 9.', 'Dos escritores de F10. Mira el estado del registro F10 en los ciclos 3, 4, 7 y 9.'),
    asks: [
      { at: 9, q: () => T('ADDD writes back in cycle 9, two cycles after SUBD. Which value ends up in F10?', 'ADDD hace WB en el ciclo 9, dos ciclos después de SUBD. ¿Qué valor queda en F10?'),
        o: () => [T('ADDD\'s, it wrote last', 'El de ADDD, escribió el último'), T('SUBD\'s, it is the last one in program order', 'El de SUBD, es el último en orden de programa')], a: 1,
        why: () => T('The register status stopped pointing to Add1 in cycle 4, so ADDD\'s result is not copied into F10.', 'El estado del registro dejó de apuntar a Add1 en el ciclo 4; el resultado de ADDD no se copia en F10.') }
    ]
  },
  e37: {
    kind: 'course', src: 'E3_7 · ej. 1', lat: { mul: 2, div: 3, add: 1, sub: 1 }, mem: 1, regs: { F2: 8, F14: 3, R1: 0 },
    prog: ['DIVD F0,F2,F4', 'ADDD F10,F2,F8', 'SUBD F10,F8,F14', 'MULD F16,F2,F4', 'ADDD F2,F2,F8', 'SD F2,1000(R1)'],
    title: () => T('Exercise sheet E3_7', 'Boletín E3_7'),
    watch: () => T('Same program as the Marcador sheet E3_6 (14 cycles there). SUBD ignores the WAW on F10; SD takes F2 off the CDB in cycle 8.', 'El mismo programa que el boletín del Marcador E3_6 (allí 14 ciclos). SUBD ignora el WAW sobre F10; SD toma F2 del CDB en el ciclo 8.'),
  },
  e38: {
    kind: 'course', src: 'E3_8 · ej. 1.4', lat: {}, mem: 2, mlabel: 'MEM', memv: { 11: 7 },
    prog: ['add x10, x5, x6', 'ld x11, 0(x10)', 'sub x12, x11, x7', 'mult x11, x5, x6', 'beq x12, x0, final', 'or x13, x10, x11', 'final:addi x14, x0, 1'],
    title: () => T('Branch without speculation', 'Salto sin especulación'),
    watch: () => T('Predicted not taken, actually taken. Watch what the instruction after the branch is allowed to do.', 'Se predice no tomado y se toma. Mira qué puede hacer la instrucción posterior al salto.'),
    asks: [
      { at: 8, q: () => T('"or" was issued in cycle 7 and both operands are ready. Does it execute in cycle 8?', '"or" se emitió en el ciclo 7 y tiene ambos operandos. ¿Ejecuta en el ciclo 8?'),
        o: () => [T('Yes', 'Sí'), T('No: beq has not resolved yet', 'No: beq aún no se ha resuelto')], a: 1,
        why: () => T('Without a ROB nothing could undo it, so it waits for the branch.', 'Sin ROB nada podría deshacerlo, así que espera al salto.') }
    ],
    notes: [{ r: 6, c: 7, t: () => T('The solution text says addi is fetched in cycle 9, but its cronogram has IF in 7. addi is both the next instruction and the branch target, so the cronogram keeps it.', 'El texto de la solución dice que addi se capta en el ciclo 9, pero su cronograma tiene IF en 7. addi es a la vez la siguiente instrucción y el destino del salto, así que el cronograma la conserva.') },
      { r: 5, c: 8, t: () => T('The solution prints "–" here without saying why. Reading: both operands are ready, so it is waiting for beq (no speculation).', 'La solución pone "–" aquí sin explicar por qué. Lectura: tiene ambos operandos, así que espera a beq (sin especulación).') }]
  },
  rsfull: {
    kind: 'mine', src: 'L3_7 · 8', lat: { mul: 3, add: 2 }, rs: { add: 1 },
    prog: ['MULD F0,F2,F4', 'ADDD F6,F0,F8', 'ADDD F10,F2,F12', 'SUBD F14,F2,F4'],
    title: () => T('No free station', 'Sin estación libre'),
    watch: () => T('Only one Add station. The second ADDD cannot be issued, and issue is in order.', 'Solo una estación Add. La segunda ADDD no puede emitirse, y la emisión es en orden.'),
    notes: [{ t: () => T("The slides state the rule (issue waits for a free station) but print no cronogram. Drawn like the solved Marcador sheet: IF, then – until issue, and the next IF waits too. The station is assumed free the cycle after its WB.", "Las diapositivas dan la regla (la emisión espera una estación libre) pero ningún cronograma. Se dibuja como el boletín resuelto del Marcador: IF y luego – hasta emitir, y el siguiente IF también espera. Se supone la estación libre el ciclo siguiente a su WB.") }]
  },
  fubusy: {
    kind: 'mine', src: 'L3_7 · 9', lat: { mul: 3, add: 1 },
    prog: ['MULD F0,F2,F4', 'MULD F6,F8,F10', 'ADDD F12,F0,F6'],
    title: () => T('One unit, two ready', 'Una unidad, dos listas'),
    watch: () => T('Both MULDs have their operands. One multiplier: FIFO arbitration.', 'Las dos MULD tienen sus operandos. Un multiplicador: arbitraje FIFO.'),
    notes: [{ t: () => T("Slide 9 states the rule (FIFO arbitration when several are ready for one unit); the cycles here are the simulator applying it.", "La diapositiva 9 da la regla (arbitraje FIFO cuando varias están listas para una unidad); los ciclos son el simulador aplicándola.") }]
  },
  memdep: {
    kind: 'mine', src: 'L3_7 · 6', lat: { mul: 3, add: 1 }, regs: { R1: 0 },
    prog: ['MULD F2,F4,F6', 'SD F2,8(R1)', 'LD F8,8(R1)', 'ADDD F10,F8,F4'],
    title: () => T('Load after a store', 'Carga tras un almacenamiento'),
    watch: () => T('The load reads the address the earlier store will write. RAW through memory.', 'La carga lee la dirección que escribirá el store anterior. RAW a través de memoria.'),
    notes: [{ t: () => T("Slide 6 states the rule (a load waits if an earlier store has an unknown or matching address). No course cronogram shows it: the exact cycles and the \"–\" between EX and M are this simulator's.", "La diapositiva 6 da la regla (una carga espera si un store anterior tiene dirección desconocida o coincidente). Ningún cronograma del curso lo muestra: los ciclos exactos y el \"–\" entre EX y M son de este simulador.") }]
  },
  s13: {
    kind: 'course', spec: true, src: 'L3_8 · 12–13', lat: { br: 3 }, mem: 1,
    prog: ['LOOP: LW R5,34(R2)', 'LW R6,34(R2)', 'BNEQ R5 R6 LOOP', 'ADD R7 R5 R5', 'SUB R8 R7 R5'],
    memv: { 36: 9 },
    title: () => T('Prediction correct', 'Predicción correcta'),
    watch: () => T('ADD and SUB finish early but are speculative. Watch the ROB head.', 'ADD y SUB acaban pronto pero son especulativas. Mira la cabeza del ROB.'),
    asks: [
      { at: 8, q: () => T('ADD wrote its result in cycle 7. Can it commit in cycle 8?', 'ADD escribió su resultado en el ciclo 7. ¿Puede confirmar en el ciclo 8?'),
        o: () => [T('Yes, it is finished', 'Sí, ha terminado'), T('No: BNEQ is ahead of it in the ROB', 'No: BNEQ va delante en el ROB')], a: 1,
        why: () => T('Commit is strictly in order, and only from the head.', 'El commit es estrictamente en orden, y solo desde la cabeza.') },
      { at: 11, q: () => T('BNEQ committed in cycle 10. What happens in cycle 11?', 'BNEQ confirmó en el ciclo 10. ¿Qué pasa en el ciclo 11?'),
        o: () => [T('ADD commits; SUB in 12', 'ADD confirma; SUB en el 12'), T('ADD and SUB both commit', 'ADD y SUB confirman las dos'), T('Both are cancelled', 'Se cancelan las dos')], a: 1,
        why: () => T('One commit per functional unit per cycle, and they use different units.', 'Una confirmación por unidad funcional y ciclo, y usan unidades distintas.') }
    ],
    notes: [{ r: 2, c: 5, t: () => T('Slide 13 prints EX in this cell, but its own bullet says BNEQ waits until cycle 6 for R6, and a 3-cycle branch in 6–8 matches its WB in 9.', 'La diapositiva 13 pone EX en esta celda, pero su propio texto dice que BNEQ espera hasta el ciclo 6 por R6, y un salto de 3 ciclos en 6–8 cuadra con su WB en 9.') },
      { r: 4, c: 11, t: () => T('The slide lists only an adder. ADD and SUB commit together in its cronogram, so SUB is treated as its own unit, as in L3_7. The slide\'s code listing shows "ADD R8 R6 R6"; the cronogram and bullets use SUB R8 R7 R5.', 'La diapositiva solo lista un sumador. ADD y SUB confirman juntas en su cronograma, así que SUB se trata como unidad propia, como en L3_7. El listado de la diapositiva pone "ADD R8 R6 R6"; el cronograma y el texto usan SUB R8 R7 R5.') }]
  },
  s15: {
    kind: 'course', spec: true, src: 'L3_8 · 14–15', lat: { br: 3 }, mem: 1, maxCycle: 13, maxInst: 6,
    prog: ['LOOP: LW R5,34(R2)', 'LW R6,34(R2)', 'BEQ R5 R6 LOOP', 'ADD R7 R5 R5', 'SUB R8 R7 R5'],
    memv: { 36: 9 },
    title: () => T('Misprediction: flush', 'Fallo de predicción: flush'),
    watch: () => T('Same code with BEQ: the branch is taken. Watch R7 and R8 in the register table.', 'El mismo código con BEQ: el salto se toma. Mira R7 y R8 en la tabla de registros.'),
    asks: [
      { at: 11, q: () => T('BEQ commits in cycle 10 and was mispredicted. What happens to ADD and SUB, which already wrote results?', 'BEQ confirma en el ciclo 10 con fallo de predicción. ¿Qué pasa con ADD y SUB, que ya escribieron resultados?'),
        o: () => [T('They commit: the work is done', 'Confirman: el trabajo está hecho'), T('Cancelled in 11; R7 and R8 never changed', 'Canceladas en el 11; R7 y R8 nunca cambiaron')], a: 1,
        why: () => T('Their results only ever lived in the ROB. The target LW is fetched in the same cycle 11.', 'Sus resultados solo vivieron en el ROB. La LW destino se capta en ese mismo ciclo 11.') }
    ],
    notes: [{ r: 2, c: 5, t: () => T('Slide 15 prints EX in this cell; see the note on the previous case.', 'La diapositiva 15 pone EX en esta celda; ver la nota del caso anterior.') }]
  },
  sorder: {
    kind: 'mine', spec: true, src: 'L3_8 · 10–11', lat: { div: 4, add: 1, sub: 1 },
    prog: ['DIVD F0,F2,F4', 'ADDD F6,F8,F10', 'ADDD F12,F6,F8', 'SD F12,16(R1)'], regs: { R1: 0, F2: 8 },
    title: () => T('In-order commit, store at the head', 'Commit en orden, store en la cabeza'),
    watch: () => T('The two ADDDs finish long before DIVD. Watch when memory is actually written.', 'Las dos ADDD acaban mucho antes que DIVD. Mira cuándo se escribe de verdad la memoria.'),
    notes: [{ t: () => T("No course cronogram has a store in the speculative machine. Drawn as EX (address), WB (value kept in the ROB), C (memory written), following L3_8 slides 9 and 11. \"One commit per functional unit per cycle\" is the rule on slide 12.", "Ningún cronograma del curso tiene un store en la máquina especulativa. Se dibuja como EX (dirección), WB (valor guardado en el ROB), C (se escribe la memoria), según las diapositivas 9 y 11 de L3_8. \"Una confirmación por unidad funcional y ciclo\" es la regla de la diapositiva 12.") }]
  }
};
const TOM_IDS = ['main', 'war', 'waw', 'e38', 'e37', 'rsfull', 'fubusy', 'memdep'];
const ROB_IDS = ['s13', 's15', 'sorder'];

const SIMC = {};
const simOf = id => SIMC[id] || (SIMC[id] = simulate(SCEN[id]));

/* cronograms transcribed from the solved sheets (not simulated): [instruction, first cycle, cells] */
const mkRows = a => a.map(([text, s, c]) => { const cells = {}; c.split(' ').forEach((v, i) => (cells[s + i] = v)); return { text, cells }; });
const STATIC = {
  e38a: { five: true, n: 17, src: 'E3_8 · ej. 1.1', rows: mkRows([
    ['add x10, x5, x6', 1, 'IF ID EX MEM WB'], ['ld x11, 0(x10)', 2, 'IF ID - - EX MEM MEM WB'], ['sub x12, x11, x7', 3, 'IF - - ID - - - EX MEM WB'],
    ['mult x11, x5, x6', 6, 'IF - - - ID EX MEM WB'], ['beq x12, x0, final', 10, 'IF ID - EX MEM WB'], ['or x13, x10, x11', 11, 'IF - Cancel'], ['final:addi x14, x0, 1', 13, 'IF ID EX MEM WB']]) },
  e38b: { five: true, n: 13, src: 'E3_8 · ej. 1.2', rows: mkRows([
    ['add x10, x5, x6', 1, 'IF ID EX MEM WB'], ['ld x11, 0(x10)', 2, 'IF ID EX MEM MEM WB'], ['sub x12, x11, x7', 3, 'IF ID - - EX MEM WB'],
    ['mult x11, x5, x6', 4, 'IF - - ID EX MEM WB'], ['beq x12, x0, final', 7, 'IF ID EX MEM WB'], ['or x13, x10, x11', 8, 'IF Cancel'], ['final:addi x14, x0, 1', 9, 'IF ID EX MEM WB']]) },
  e38c: { n: 15, src: 'E3_8 · ej. 1.3', rows: mkRows([
    ['add x10, x5, x6', 1, 'IF IS RO EX WB'], ['ld x11, 0(x10)', 2, 'IF IS RO - EX MEM MEM WB'], ['sub x12, x11, x7', 3, 'IF IS RO - - - - EX WB'],
    ['mult x11, x5, x6', 4, 'IF IS - - - - RO EX WB'], ['beq x12, x0, final', 5, 'IF - - - - IS RO EX WB'], ['or x13, x10, x11', 10, 'IF IS RO Cancel'], ['final:addi x14, x0, 1', 11, 'IF IS RO EX WB']]) },
  e36: { n: 14, src: 'E3_6 · ej. 1', rows: mkRows([
    ['DIVD F0,F2,F4', 1, 'IF IS RO EX EX EX WB'], ['ADDD F10,F2,F8', 2, 'IF IS RO EX WB'], ['SUBD F10,F8,F14', 3, 'IF IS - - RO EX WB'],
    ['MULD F16,F2,F4', 4, 'IF - - IS RO EX EX WB'], ['ADDD F2,F2,F8', 7, 'IF IS RO EX WB'], ['SD F2,1000(R1)', 8, 'IF IS RO - EX M WB']]) }
};
const simRows = s => s.insts.map(x => ({ text: x.ins.text, cells: x.cells, id: x.id }));
if (typeof module !== 'undefined') module.exports = { SCEN, STATIC };
