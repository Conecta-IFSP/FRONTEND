const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsTeste = {};
vm.runInNewContext(ts.transpileModule(readFileSync(`${__dirname}/../src/utils/busca-ajuda.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsTeste });
const { filtrarTopicosAjuda, normalizarBusca } = exportsTeste;

const topicos = [
  {
    id: 'ata',
    titulo: 'Ata',
    perguntas: [
      { id: 'ata-aprovar', perfil: 'todos', pergunta: 'Como aprovo uma ata?', resposta: ['Toque em Aprovar.', 'Confirme a biometria.'] },
      { id: 'ata-prazo', perfil: 'todos', pergunta: 'O que é o prazo da ata?', resposta: 'Escolha 24 horas, 3 dias ou 7 dias.' },
    ],
  },
  {
    id: 'votacao',
    titulo: 'Votação',
    perguntas: [{ id: 'votacao-votar', perfil: 'todos', pergunta: 'Como voto?', resposta: ['Abra a aba Votações.'] }],
  },
];

test('normaliza acentos, maiúsculas e espaços nas pontas', () => {
  assert.equal(normalizarBusca('  VOTAÇÃO '), 'votacao');
});

test('busca vazia devolve a lista original', () => {
  assert.equal(filtrarTopicosAjuda(topicos, '   '), topicos);
});

test('ignora acentos e maiúsculas e procura no título do tópico', () => {
  const resultado = filtrarTopicosAjuda(topicos, 'VOTACAO');
  assert.deepEqual(resultado.map((topico) => topico.id), ['votacao']);
});

test('procura no texto da resposta, inclusive em listas de passos', () => {
  const resultado = filtrarTopicosAjuda(topicos, 'biometria');
  assert.deepEqual(resultado.flatMap((topico) => topico.perguntas.map((pergunta) => pergunta.id)), ['ata-aprovar']);
});

test('exige todas as palavras digitadas', () => {
  assert.deepEqual(filtrarTopicosAjuda(topicos, 'ata dias').flatMap((t) => t.perguntas.map((p) => p.id)), ['ata-prazo']);
  assert.deepEqual(filtrarTopicosAjuda(topicos, 'ata inexistente'), []);
});
