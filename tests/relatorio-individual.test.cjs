const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsTeste = {};
vm.runInNewContext(ts.transpileModule(readFileSync(`${__dirname}/../src/utils/relatorio-individual.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsTeste });
const { csvRelatorioIndividual, htmlRelatorioIndividual, consultaRelatorio, celulaCsv, horasRelatorio } = exportsTeste;
const relatorio = {
  usuario: { nome: '<script>Ana</script>', email: 'ana@teste.local' },
  gerada_em: '2026-11-11T15:00:00.000Z', periodo: { de: null, ate: null },
  resumo: { reunioes: 2, minutos_registrados: 75, registros_sem_duracao: 1 },
  reunioes: [
    { titulo: '=HYPERLINK("url")', comissao: 'Comissão; "um"', organizacao: 'Org\nnova', local: null,
      inicio: '2026-11-10T12:00:00.000Z', fim: '2026-11-10T14:00:00.000Z', entrada: '2026-11-10T12:00:00.000Z', saida: '2026-11-10T13:15:00.000Z', minutos: 75 },
    { titulo: 'Outra', comissao: 'Comissão', organizacao: 'Org', local: 'Sala',
      inicio: '2026-11-11T12:00:00.000Z', fim: '2026-11-11T16:00:00.000Z', entrada: '2026-11-11T12:00:00.000Z', saida: null, minutos: null },
  ],
};

test('PDF escapa HTML e preserva ausência de saída sem inventar duração', () => {
  const html = htmlRelatorioIndividual(relatorio);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;Ana&lt;/script&gt;'));
  assert.ok(html.includes('Não registrada'));
  assert.ok(html.includes('Não calculada'));
  assert.ok(html.includes('1h 15min'));
  assert.equal((html.match(/<article>/g) || []).length, 2);
});
test('CSV usa BOM, aspas, linhas e datas UTC preservadas', () => {
  const csv = csvRelatorioIndividual(relatorio);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes('"Comissão; ""um"""'));
  assert.ok(csv.includes('"Org\nnova"'));
  assert.ok(csv.includes('"\'=HYPERLINK(""url"")"'));
  assert.ok(csv.includes('"2026-11-10T13:15:00.000Z";"75"'));
  assert.ok(csv.includes('"";"";"Confirmada"'));
});
test('CSV neutraliza fórmulas mesmo depois de espaços e caracteres de controle', () => {
  for (const valor of ['=1+1', '+1', '-1', '@SUM(A1)', '  =1', '\t=1', '\r=1']) {
    assert.ok(celulaCsv(valor).startsWith('"\''));
  }
  assert.equal(celulaCsv('Comissão'), '"Comissão"');
  assert.equal(celulaCsv(0), '"0"');
});
test('filtros utilizam mês/ano civil e fim exclusivo no próximo dia', () => {
  const data = new Date(2026, 10, 11, 12);
  const mes = new URLSearchParams(consultaRelatorio('mes', data));
  assert.equal(mes.get('de'), new Date(2026, 10, 1).toISOString());
  assert.equal(mes.get('ate'), new Date(2026, 10, 12).toISOString());
  assert.equal(new URLSearchParams(consultaRelatorio('ano', data)).get('de'), new Date(2026, 0, 1).toISOString());
  assert.equal(consultaRelatorio('todos', data), '');
  assert.equal(horasRelatorio(0), '0h 00min');
});
