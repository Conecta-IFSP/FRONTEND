const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function preparar({ escrever, imprimir, compartilhar, plataforma = 'android', expoGo = false, disponivel = true, erroLogo = false } = {}) {
  const chamadas = []; const saida = {};
  class File {
    constructor(...p) { this.uri = p.join('/'); }
    create() { chamadas.push('criar'); }
    async base64() { if (erroLogo) throw Error('logo'); return 'bG9nbw=='; }
    async write(texto) { chamadas.push('escrever'); if (escrever) await escrever(texto); chamadas.push('escrito'); }
    move() { throw Error('Não deve mover o PDF'); }
  }
  const mods = {
    'react-native': { Platform: { OS: plataforma } },
    'expo': { isRunningInExpoGo: () => expoGo },
    'expo-print': { printToFileAsync: imprimir ?? (async () => ({ uri: 'file:///cache/print/gerado.pdf' })), printAsync: async () => { chamadas.push('impressao-expo-go'); if (imprimir) await imprimir(); } },
    'expo-sharing': { isAvailableAsync: async () => disponivel, shareAsync: async uri => { chamadas.push(uri); if (compartilhar) await compartilhar(); } },
    'expo-file-system': { File, Paths: { cache: 'file:///cache' } },
    'expo-asset': { Asset: { fromModule: () => ({ localUri: 'file:///logo.png', downloadAsync: async () => {} }) } },
    '@/utils/relatorio-individual': { csvRelatorioIndividual: () => 'csv', htmlRelatorioIndividual: () => '<html></html>' },
    '../../assets/images/logo-titulo.png': 1,
    './baixar-pdf-relatorio': { baixarPdfRelatorio: async () => {} },
  };
  const fonte = fs.readFileSync(`${__dirname}/../src/services/exportar-relatorio-individual.ts`, 'utf8');
  vm.runInNewContext(ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports: saida, require: nome => { if (!(nome in mods)) throw Error(nome); return mods[nome]; } });
  return { exportar: saida.exportarRelatorioIndividual, chamadas };
}
test('PDF compartilha o URI do Expo Print sem mover arquivo', async () => {
  const t = preparar(); await t.exportar({}, 'pdf');
  assert.deepEqual(t.chamadas, ['file:///cache/print/gerado.pdf']);
});
test('CSV só compartilha depois da gravação assíncrona terminar', async () => {
  let liberar; const gravação = new Promise(resolve => { liberar = resolve; });
  const t = preparar({ escrever: () => gravação }); const exportacao = t.exportar({}, 'csv');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(t.chamadas, ['criar', 'escrever']); liberar(); await exportacao;
  assert.equal(t.chamadas[2], 'escrito'); assert.match(t.chamadas[3], /\.csv$/);
});
test('falha de gravação é propagada para a tela sem compartilhar arquivo incompleto', async () => {
  const t = preparar({ escrever: async () => { throw Error('sem permissão'); } });
  await assert.rejects(t.exportar({}, 'csv'), /sem permissão/);
  assert.deepEqual(t.chamadas, ['criar', 'escrever']);
});
test('falha assíncrona de impressão ou compartilhamento pode ser tratada pela tela', async () => {
  await assert.rejects(preparar({ imprimir: async () => { throw Error('impressão'); } }).exportar({}, 'pdf'), /impressão/);
  await assert.rejects(preparar({ compartilhar: async () => { throw Error('compartilhamento'); } }).exportar({}, 'pdf'), /compartilhamento/);
});

for (const plataforma of ['android', 'ios']) {
  test(`${plataforma}: Expo Go mantém impressão nativa sem mover ou compartilhar arquivo`, async () => {
    const t = preparar({ plataforma, expoGo: true, disponivel: false }); await t.exportar({}, 'pdf');
    assert.deepEqual(t.chamadas, ['impressao-expo-go']);
  });
  test(`${plataforma}: binário próprio compartilha URI original`, async () => {
    const t = preparar({ plataforma }); await t.exportar({}, 'pdf');
    assert.deepEqual(t.chamadas, ['file:///cache/print/gerado.pdf']);
  });
  for (const formato of ['pdf', 'csv']) test(`${plataforma}: ${formato} informa compartilhamento indisponível`, async () => {
    const t = preparar({ plataforma, disponivel: false });
    await assert.rejects(t.exportar({}, formato), /não está disponível/);
    assert.deepEqual(t.chamadas, []);
  });
}
test('falha ao carregar logo não imprime nem compartilha documento parcial', async () => {
  const t = preparar({ erroLogo: true }); await assert.rejects(t.exportar({}, 'pdf'), /logo/);
  assert.deepEqual(t.chamadas, []);
});
test('cancelamento/rejeição da impressão no Expo Go chega ao chamador', async () => {
  await assert.rejects(preparar({ expoGo: true, imprimir: async () => { throw Error('cancelada'); } }).exportar({}, 'pdf'), /cancelada/);
});
