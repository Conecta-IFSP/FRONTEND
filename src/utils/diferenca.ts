export type Trecho = { texto: string; tipo: 'igual' | 'novo' | 'removido' };

// Cada mudança é um parágrafo; dentro dele, os trechos dizem o que ficou, entrou ou saiu.
export type Mudanca = Trecho[];

type Passo<T> = { tipo: Trecho['tipo']; valor: T };

// Acima disso a comparação palavra a palavra fica pesada para o celular.
const LIMITE_COMPARACAO = 250_000;

export function paragrafos(texto: string) {
  return texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean);
}

// Maior subsequência comum: o que não está nela foi removido de "antes" ou é novo em "depois".
function comparar<T>(antes: T[], depois: T[]): Passo<T>[] {
  const tabela = Array.from({ length: antes.length + 1 }, () => new Array<number>(depois.length + 1).fill(0));
  for (let i = antes.length - 1; i >= 0; i--) {
    for (let j = depois.length - 1; j >= 0; j--) {
      tabela[i][j] =
        antes[i] === depois[j] ? tabela[i + 1][j + 1] + 1 : Math.max(tabela[i + 1][j], tabela[i][j + 1]);
    }
  }
  const passos: Passo<T>[] = [];
  let i = 0;
  let j = 0;
  while (i < antes.length && j < depois.length) {
    if (antes[i] === depois[j]) {
      passos.push({ tipo: 'igual', valor: antes[i] });
      i++;
      j++;
    } else if (tabela[i + 1][j] >= tabela[i][j + 1]) {
      passos.push({ tipo: 'removido', valor: antes[i++] });
    } else {
      passos.push({ tipo: 'novo', valor: depois[j++] });
    }
  }
  while (i < antes.length) passos.push({ tipo: 'removido', valor: antes[i++] });
  while (j < depois.length) passos.push({ tipo: 'novo', valor: depois[j++] });
  return passos;
}

// Espaços e pontuação viram pedaços próprios, para "aprovado." e "aprovado por" compartilharem "aprovado".
function separar(texto: string) {
  return texto.split(/(\s+|[.,;:!?()"])/).filter(Boolean);
}

function compararPalavras(antes: string, depois: string): Mudanca {
  const palavrasAntes = separar(antes);
  const palavrasDepois = separar(depois);
  if (palavrasAntes.length * palavrasDepois.length > LIMITE_COMPARACAO) {
    return [
      { tipo: 'removido', texto: antes },
      { tipo: 'novo', texto: ` ${depois}` },
    ];
  }
  return comparar(palavrasAntes, palavrasDepois).reduce<Mudanca>((trechos, passo) => {
    const ultimo = trechos.at(-1);
    if (ultimo?.tipo === passo.tipo) ultimo.texto += passo.valor;
    else trechos.push({ tipo: passo.tipo, texto: passo.valor });
    return trechos;
  }, []);
}

// Parágrafo removido seguido de parágrafo novo no mesmo lugar é tratado como parágrafo editado.
export function mudancas(antes: string, depois: string): Mudanca[] {
  const resultado: Mudanca[] = [];
  let removidos: string[] = [];
  let novos: string[] = [];
  const fechar = () => {
    for (let k = 0; k < Math.max(removidos.length, novos.length); k++) {
      const anterior = removidos[k];
      const atual = novos[k];
      if (anterior !== undefined && atual !== undefined) resultado.push(compararPalavras(anterior, atual));
      else if (anterior !== undefined) resultado.push([{ tipo: 'removido', texto: anterior }]);
      else resultado.push([{ tipo: 'novo', texto: atual }]);
    }
    removidos = [];
    novos = [];
  };
  for (const passo of comparar(paragrafos(antes), paragrafos(depois))) {
    if (passo.tipo === 'igual') fechar();
    else if (passo.tipo === 'removido') removidos.push(passo.valor);
    else novos.push(passo.valor);
  }
  fechar();
  return resultado;
}
