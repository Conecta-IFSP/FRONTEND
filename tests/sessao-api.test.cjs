const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function preparar(status, caminho = '/usuarios/me') {
  let token = 'sessao-antiga';
  let invalidacoes = 0;
  let responder;
  const resposta = new Promise((resolve) => { responder = resolve; });
  const exports = {};
  const contexto = {
    exports, process: { env: { EXPO_PUBLIC_API_URL: 'http://localhost:3000' } },
    window: { localStorage: {
      getItem: () => token, setItem: (_, valor) => { token = valor; }, removeItem: () => { token = null; },
    } },
    fetch: () => resposta,
    require: (nome) => {
      if (nome === 'expo-constants') return { expoConfig: {} };
      if (nome === 'react-native') return { Platform: { OS: 'web' } };
      if (nome === 'expo-secure-store') return {};
      throw new Error(nome);
    },
  };
  const fonte = readFileSync(`${__dirname}/../src/services/api.ts`, 'utf8');
  vm.runInNewContext(ts.transpileModule(fonte, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, contexto);
  exports.observarSessaoInvalida(() => { invalidacoes++; });
  return {
    api: exports, caminho,
    concluir: () => responder({ status, ok: status < 400, json: async () => ({ message: 'erro' }) }),
    estado: () => ({ token, invalidacoes }),
  };
}

test('401 de rota protegida limpa sessão e avisa a navegação', async () => {
  const c = preparar(401);
  const pedido = c.api.api(c.caminho); c.concluir(); await pedido;
  assert.deepEqual(c.estado(), { token: null, invalidacoes: 1 });
});
for (const [status, caminho] of [[403, '/organizacoes'], [500, '/usuarios/me'], [401, '/auth/login']]) {
  test(`${status} em ${caminho} não encerra a sessão indevidamente`, async () => {
    const c = preparar(status, caminho);
    const pedido = c.api.api(c.caminho); c.concluir(); await pedido;
    assert.deepEqual(c.estado(), { token: 'sessao-antiga', invalidacoes: 0 });
  });
}
test('resposta antiga não encerra uma nova sessão', async () => {
  const c = preparar(401);
  const pedido = c.api.api(c.caminho);
  await Promise.resolve();
  await c.api.salvarToken('sessao-nova');
  c.concluir(); await pedido;
  assert.deepEqual(c.estado(), { token: 'sessao-nova', invalidacoes: 0 });
});
