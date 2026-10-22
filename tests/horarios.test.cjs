const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const modulo = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(`${__dirname}/../src/utils/sugestoes-horario.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: modulo.exports });
const sugerir = (...args) => Array.from(modulo.exports.sugerirHorarios(...args));
test('início hoje usa próximo intervalo de meia hora, sem sugerir passado', () => {
  const agora = new Date(2026, 9, 20, 14, 12);
  assert.equal(sugerir(agora, agora)[0], '14:30');
});
test('data futura oferece horários comuns independentemente da hora atual', () => {
  assert.equal(sugerir(new Date(2026, 9, 21), new Date(2026, 9, 20, 23, 50))[0], '08:00');
});
test('término usa durações de 30 a 180 minutos e não vira o dia silenciosamente', () => {
  const d = new Date(2026, 9, 20);
  assert.deepEqual(sugerir(d, d, 23 * 60), ['23:30']);
  assert.deepEqual(sugerir(d, d, 23 * 60 + 40), []);
});
test('fim do dia não gera 24:00 nem horário do dia seguinte', () => {
  const d = new Date(2026, 9, 20, 23, 59);
  assert.deepEqual(sugerir(d, d), []);
});
