import type { TopicoAjuda } from '@/constants/ajuda';

/** Minúsculas e sem acentos, para "votação", "VOTACAO" e "votacao" serem iguais. */
export function normalizarBusca(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Mantém só as perguntas que contêm TODAS as palavras digitadas, procurando no título
 * do tópico, na pergunta e na resposta. Tópicos sem nenhuma pergunta encontrada somem.
 * Busca vazia devolve a lista original.
 */
export function filtrarTopicosAjuda(topicos: readonly TopicoAjuda[], busca: string): readonly TopicoAjuda[] {
  const palavras = normalizarBusca(busca).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return topicos;

  return topicos.flatMap((topico) => {
    const perguntas = topico.perguntas.filter((pergunta) => {
      const resposta = typeof pergunta.resposta === 'string' ? pergunta.resposta : pergunta.resposta.join(' ');
      const texto = normalizarBusca(`${topico.titulo} ${pergunta.pergunta} ${resposta}`);
      return palavras.every((palavra) => texto.includes(palavra));
    });
    return perguntas.length > 0 ? [{ ...topico, perguntas }] : [];
  });
}
