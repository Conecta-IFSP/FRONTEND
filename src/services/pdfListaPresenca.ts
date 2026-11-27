import type { Reuniao } from '@/services/api';
import { entregarPdf } from '@/services/pdf';
import { formatarDataHora, formatarDiaMesAno, formatarHora, intervalo, plural } from '@/utils/reunioes';

export type ListaPresenca = {
  titulo: string;
  gerada_em: string;
  participantes: {
    usuario_id: string;
    nome: string;
    situacao: 'CONFIRMADA' | 'AGUARDANDO' | 'RECUSADA' | 'SEM_REGISTRO';
    entrada: string | null;
    saida: string | null;
    saida_automatica: boolean;
    minutos: number | null;
  }[];
};

const SITUACOES: Record<ListaPresenca['participantes'][number]['situacao'], string> = {
  CONFIRMADA: 'Presente',
  AGUARDANDO: 'Aguardando',
  RECUSADA: 'Recusada',
  SEM_REGISTRO: 'Ausente',
};

function escapar(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function htmlDaLista(reuniao: Reuniao, lista: ListaPresenca) {
  const presentes = lista.participantes.filter((participante) => participante.situacao === 'CONFIRMADA').length;
  const automatica = lista.participantes.some((participante) => participante.saida && participante.saida_automatica);
  const cabecalho = [reuniao.comissao_id?.nome, `${formatarDiaMesAno(reuniao.inicio)}, ${intervalo(reuniao)}`, reuniao.local]
    .filter(Boolean)
    .map((parte) => escapar(parte!))
    .join(' · ');
  const linhas = lista.participantes
    .map(
      (participante) => `<tr>
    <td>${escapar(participante.nome)}</td>
    <td>${SITUACOES[participante.situacao]}</td>
    <td>${participante.entrada ? formatarHora(participante.entrada) : '—'}</td>
    <td>${participante.saida ? `${formatarHora(participante.saida)}${participante.saida_automatica ? '*' : ''}` : '—'}</td>
    <td class="numero">${participante.minutos === null ? '—' : `${participante.minutos} min`}</td>
  </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Lista de presença</title>
<style>
  @page { margin: 40px; }
  body { font-family: -apple-system, Roboto, Arial, sans-serif; color: #14182B; font-size: 11pt; line-height: 1.4; }
  h1 { font-size: 16pt; text-align: center; margin: 0; }
  h2 { font-size: 12pt; text-align: center; margin: 4px 0 0; font-weight: 600; }
  .cabecalho { text-align: center; color: #4E5A78; font-size: 10pt; margin: 6px 0 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9pt; color: #4E5A78; border-bottom: 1px solid #C9CFDD; padding: 6px 8px; }
  td { padding: 7px 8px; border-bottom: 1px solid #E4E7EF; overflow-wrap: anywhere; }
  tr { break-inside: avoid; }
  .numero { text-align: right; }
  .rodape { margin-top: 18px; font-size: 9pt; color: #4E5A78; }
  .rodape p { margin: 3px 0; }
</style></head>
<body>
  <h1>Lista de presença</h1>
  <h2>${escapar(reuniao.titulo)}</h2>
  <div class="cabecalho">${cabecalho}</div>
  <table>
    <thead><tr><th>Participante</th><th>Situação</th><th>Entrada</th><th>Saída</th><th class="numero">Permanência</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="rodape">
    <p>${plural(presentes, 'presente', 'presentes')} · ${plural(lista.participantes.length - presentes, 'ausente', 'ausentes')}.</p>
    ${automatica ? '<p>* Saída registrada automaticamente no término da reunião.</p>' : ''}
    <p>Gerada em ${formatarDataHora(lista.gerada_em)}.</p>
  </div>
</body></html>`;
}

export async function gerarPdfLista(reuniao: Reuniao, lista: ListaPresenca) {
  const nome = `Lista de presença - ${reuniao.titulo}`.replace(/[\\/:*?"<>|]/g, '-');
  return entregarPdf(htmlDaLista(reuniao, lista), nome);
}
