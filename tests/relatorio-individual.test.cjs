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

test('vínculos atuais aparecem mesmo sem reuniões e seus nomes são escapados', () => {
  const r = { ...relatorio, reunioes: [], resumo: { reunioes: 0, minutos_registrados: 0, registros_sem_duracao: 0 },
    vinculos: { organizacoes: [{ id: '1', nome: '<Org>', papel: 'ADMIN' }],
      comissoes: [{ id: '2', nome: '=Comissão', organizacao: '<Org>', papel: 'RESPONSAVEL' }] } };
  const html = htmlRelatorioIndividual(r);
  assert.ok(html.includes('&lt;Org&gt;'));
  assert.ok(html.includes('Administrador'));
  assert.ok(html.includes('Responsável'));
  assert.ok(html.includes('Nenhuma participação confirmada'));
  const csv = csvRelatorioIndividual(r);
  assert.ok(csv.includes('Organização atual'));
  assert.ok(csv.includes('Comissão atual'));
  assert.ok(csv.includes('"\'=Comissão"'));
  assert.ok(!csv.includes('"Confirmada"'));
  assert.equal(csv.split('\r\n').length, 3);
});

test('ausência de campo vínculos em servidor anterior é informada, sem quebrar exportação', () => {
  assert.ok(htmlRelatorioIndividual(relatorio).includes('Informações de vínculos indisponíveis'));
  const vazio = { ...relatorio, reunioes: [], vinculos: { organizacoes: [], comissoes: [] } };
  assert.ok(csvRelatorioIndividual(vazio).includes('Sem participação ou vínculo atual informado'));
});

test('saída automática é identificada no PDF e CSV sem confundir com saída informada', () => {
  const r = { ...relatorio, reunioes: [{ ...relatorio.reunioes[0], saida_automatica: true }] };
  assert.ok(htmlRelatorioIndividual(r).includes('automática no término previsto'));
  assert.ok(csvRelatorioIndividual(r).includes('Automática no término previsto'));
  assert.ok(!htmlRelatorioIndividual(relatorio).includes('(automática no término previsto)'));
});
for (const texto of ['áéíóú ç 漢字 😀', 'a;b', 'a"b', 'a\nb', 'a\r\nb', '<img src=x onerror=alert(1)>']) {
  test(`exportação preserva texto adversarial: ${JSON.stringify(texto)}`, () => {
    const r = { ...relatorio, usuario: { nome: texto, email: 'a@example.invalid' } };
    assert.ok(csvRelatorioIndividual(r).includes(celulaCsv(texto)));
    assert.ok(!htmlRelatorioIndividual(r).includes('<img src=x'));
  });
}
test('CSV mantém 19 colunas por linha em participação, vínculo e relatório vazio', () => {
  const r = { ...relatorio, usuario: { nome: 'Ana', email: 'a@b.c' }, reunioes: [{ ...relatorio.reunioes[1], organizacao: 'Org', comissao: 'Com' }],
    vinculos: { organizacoes: [{ nome: 'Org', papel: 'MEMBRO' }], comissoes: [{ nome: 'Com', organizacao: 'Org', papel: 'MEMBRO' }] } };
  for (const c of [r, { ...r, reunioes: [], vinculos: { organizacoes: [], comissoes: [] } }]) {
    for (const linha of csvRelatorioIndividual(c).split('\r\n')) assert.equal(linha.split(';').length, 19);
  }
});
for (const [minutos, esperado] of [[0, '0h 00min'], [59, '0h 59min'], [60, '1h 00min'], [1440, '24h 00min']]) {
  test(`formatação de duração ${minutos}`, () => assert.equal(horasRelatorio(minutos), esperado));
}
test('filtro cobre janeiro, ano novo e último dia do mês sem deslocamento manual de UTC', () => {
  for (const data of [new Date(2026,0,1),new Date(2026,11,31),new Date(2028,1,29)]) {
    const q = new URLSearchParams(consultaRelatorio('mes',data));
    assert.equal(q.get('de'),new Date(data.getFullYear(),data.getMonth(),1).toISOString());
    assert.equal(q.get('ate'),new Date(data.getFullYear(),data.getMonth(),data.getDate()+1).toISOString());
  }
});
