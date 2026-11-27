const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const raiz = path.resolve(__dirname, '..');
function carregar(arquivo, dependencias = {}) {
  const saida = {};
  const js = ts.transpileModule(fs.readFileSync(path.join(raiz, arquivo), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, { exports: saida, require: nome => dependencias[nome] ?? require(nome) });
  return saida;
}
const { gerarPdfRelatorioIndividual } = carregar('src/utils/pdf-relatorio-individual.ts', {
  'jspdf/dist/jspdf.es.min.js': require('jspdf'),
  './relatorio-individual': carregar('src/utils/relatorio-individual.ts'),
});
const base64 = nome => fs.readFileSync(path.join(raiz, nome)).toString('base64');
const recursos = {
  logo: 'data:image/png;base64,' + base64('assets/images/logo-titulo.png'),
  fonteRegular: base64('node_modules/@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf'),
  fonteNegrito: base64('node_modules/@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf'),
};
const modelo = {
  usuario: { nome: 'Rafaela — demonstração', email: 'teste@example.invalid' },
  gerada_em: '2026-11-27T15:00:00.000Z', periodo: { de: null, ate: null },
  vinculos: { organizacoes: [{ id: '1', nome: 'Organização de demonstração', papel: 'ADMIN' }], comissoes: [{ id: '2', nome: 'Comissão de Eventos', organizacao_id: '1', organizacao: 'Organização de demonstração', papel: 'RESPONSAVEL' }] },
  resumo: { reunioes: 1, minutos_registrados: 75, registros_sem_duracao: 0 },
  reunioes: [{ reuniao_id: '3', titulo: 'Planejamento e avaliação', organizacao: 'Organização de demonstração', comissao: 'Comissão de Eventos', local: 'Sala 1', inicio: '2026-11-26T12:00:00.000Z', fim: '2026-11-26T13:15:00.000Z', entrada: '2026-11-26T12:00:00.000Z', saida: '2026-11-26T13:15:00.000Z', minutos: 75, saida_automatica: true }],
};
function conferir(r, nome) {
  const antes = JSON.stringify(r);
  const doc = gerarPdfRelatorioIndividual(r, recursos);
  const bytes = Buffer.from(doc.output('arraybuffer'));
  assert.equal(bytes.subarray(0,5).toString(), '%PDF-');
  assert.equal(JSON.stringify(r), antes, 'gerar não altera os dados do relatório');
  assert.ok(Math.abs(doc.internal.pageSize.getWidth() - 595.28) < 1);
  assert.ok(Math.abs(doc.internal.pageSize.getHeight() - 841.89) < 1);
  if (process.env.RELATORIO_PDF_QA_DIR) {
    fs.mkdirSync(process.env.RELATORIO_PDF_QA_DIR, { recursive: true });
    fs.writeFileSync(path.join(process.env.RELATORIO_PDF_QA_DIR, nome+'.pdf'), bytes);
  }
  return doc;
}
test('gera PDF A4 com fontes incorporadas, logo e dados sem depender de DOM ou impressão', () => {
  assert.equal(conferir(modelo,'exemplo').getNumberOfPages(), 1);
});
test('PDF aceita vínculos sem reuniões e histórico sem campo de vínculos', () => {
  conferir({ ...modelo, reunioes: [], resumo: { reunioes: 0, minutos_registrados: 0, registros_sem_duracao: 0 } },'sem-reunioes');
  conferir({ ...modelo, vinculos: undefined },'servidor-anterior');
});
test('PDF pagina histórico extenso e campos com nomes longos', () => {
  const r = structuredClone(modelo);
  r.usuario.nome = 'Nome extenso '.repeat(50);
  r.reunioes = Array.from({ length: 30 }, (_, i) => ({ ...modelo.reunioes[0], reuniao_id: String(i), titulo: `Reunião ${i+1} - `+'Planejamento '.repeat(20), organizacao: 'Organização '.repeat(25) }));
  r.resumo = { reunioes: 30, minutos_registrados: 2250, registros_sem_duracao: 0 };
  const paginas = conferir(r,'historico-extenso').getNumberOfPages();
  assert.ok(paginas > 5 && paginas < 40);
});
test('PDF aceita dados literais com tags, aspas, acentos e ausência de duração', () => {
  const r = structuredClone(modelo); r.usuario.nome = '<script>alert("teste")</script> · João';
  r.reunioes[0].saida = null; r.reunioes[0].saida_automatica = false; r.reunioes[0].minutos = null;
  r.resumo = { reunioes: 1, minutos_registrados: 0, registros_sem_duracao: 1 };
  conferir(r,'dados-literais');
});
