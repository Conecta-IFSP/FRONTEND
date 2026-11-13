const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..');
const pastaDasRotas = path.join(raiz, 'src', 'app');
const pastaDeSaida = path.join(raiz, '.expo', 'types');
const arquivo = path.join(pastaDeSaida, 'router.d.ts');

// Lida no carregamento do gerador, precisa vir antes do require.
process.env.EXPO_ROUTER_APP_ROOT = pastaDasRotas;
fs.mkdirSync(pastaDeSaida, { recursive: true });

function carregarGerador() {
  const expo = path.dirname(require.resolve('expo/package.json', { paths: [raiz] }));
  const cli = path.dirname(require.resolve('@expo/cli/package.json', { paths: [expo] }));
  return require(require.resolve('@expo/router-server/build/typed-routes', { paths: [cli] }));
}

let gerador;
try {
  gerador = carregarGerador();
} catch (erro) {
  console.warn('Não consegui gerar as rotas tipadas:', erro.message);
  console.warn('Rode "npx expo start" uma vez para criar .expo/types/router.d.ts.');
  process.exit(0);
}

const antes = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : '';
gerador.regenerateDeclarations(pastaDeSaida);

process.on('exit', () => {
  if (!fs.existsSync(arquivo)) {
    console.warn('As rotas tipadas não foram geradas. Rode "npx expo start" uma vez.');
    return;
  }
  const depois = fs.readFileSync(arquivo, 'utf8');
  console.log(
    depois === antes
      ? 'Rotas tipadas conferidas: .expo/types/router.d.ts já estava atualizado.'
      : 'Rotas tipadas geradas em .expo/types/router.d.ts.',
  );
});
