import type { TomEtiqueta } from '@/components/Etiqueta';
import type { Ata, Comissao, Participante, Reuniao } from '@/services/api';

export const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const MESES_CURTOS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

const DIAS_SEMANA = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

const SIGLAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export const LETRAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function maiuscula(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function chaveDia(data: Date) {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function lerChaveDia(chave: string | undefined) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(chave ?? '');
  if (!partes) return null;
  return new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
}

export function inicioDoDia(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

export function somarDias(data: Date, dias: number) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

export function comHora(dia: Date, minutos: number) {
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(minutos / 60), minutos % 60);
}

export function jaPassou(data: Date) {
  return data.getTime() <= Date.now();
}

export function formatarHora(valor: string | Date) {
  const data = new Date(valor);
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

export function formatarData(valor: string | Date) {
  const data = new Date(valor);
  return `${maiuscula(DIAS_SEMANA[data.getDay()])}, ${data.getDate()} de ${MESES[data.getMonth()]}`;
}

export function diaDaSemana(valor: string | Date) {
  return maiuscula(DIAS_SEMANA[new Date(valor).getDay()]);
}

export function formatarDataCurta(valor: string | Date) {
  const data = new Date(valor);
  return `${data.getDate()} de ${MESES_CURTOS[data.getMonth()]}`;
}

export function rotuloDia(dia: Date, hoje: Date) {
  const diferenca = Math.round((inicioDoDia(dia).getTime() - inicioDoDia(hoje).getTime()) / 86400000);
  if (diferenca === 0) return 'Hoje';
  if (diferenca === 1) return 'Amanhã';
  if (diferenca === -1) return 'Ontem';
  return DIAS_SEMANA[dia.getDay()];
}

export function quando(valor: string | Date, hoje: Date) {
  const data = new Date(valor);
  const dias = Math.round((inicioDoDia(data).getTime() - inicioDoDia(hoje).getTime()) / 86400000);
  const dia = dias >= -1 && dias <= 6 ? maiuscula(rotuloDia(data, hoje)) : formatarDataCurta(data);
  return `${dia}, ${formatarHora(data)}`;
}

export function seloDia(valor: string | Date, hoje: Date) {
  const data = new Date(valor);
  return chaveDia(data) === chaveDia(hoje) ? 'HOJE' : SIGLAS_SEMANA[data.getDay()];
}

export function seloMes(valor: string | Date) {
  return MESES_CURTOS[new Date(valor).getMonth()].replace('.', '').toUpperCase();
}

export function intervalo(reuniao: Pick<Reuniao, 'inicio' | 'fim'>) {
  return `${formatarHora(reuniao.inicio)} – ${formatarHora(reuniao.fim)}`;
}

export function duracao(reuniao: Pick<Reuniao, 'inicio' | 'fim'>) {
  const minutos = Math.round((new Date(reuniao.fim).getTime() - new Date(reuniao.inicio).getTime()) / 60000);
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas}h${String(resto).padStart(2, '0')}`;
}

export function meuParticipante(reuniao: Reuniao, usuarioId: string | undefined): Participante | undefined {
  return reuniao.participantes.find((participante) => participante.usuario_id?._id === usuarioId);
}

export function comissoesQueComando(comissoes: Comissao[], usuarioId: string | undefined) {
  return comissoes.filter(
    (comissao) =>
      comissao.ativo &&
      comissao.membros.some((membro) => membro.usuario_id?._id === usuarioId && membro.papel === 'RESPONSAVEL'),
  );
}

export type SituacaoReuniao = {
  texto: 'Cancelada' | 'Recusada' | 'Convite pendente' | 'Realizada' | 'Em andamento' | 'Agendada';
  tom: TomEtiqueta;
  encerrada: boolean;
  pendente: boolean;
};

export function situacaoDaReuniao(reuniao: Reuniao, usuarioId: string | undefined, agora: number): SituacaoReuniao {
  const participante = meuParticipante(reuniao, usuarioId);
  const convite = participante?.convite;
  const terminou = new Date(reuniao.fim).getTime() <= agora;
  if (reuniao.situacao === 'CANCELADA') return { texto: 'Cancelada', tom: 'erro', encerrada: true, pendente: false };
  if (convite === 'RECUSADO') return { texto: 'Recusada', tom: 'neutro', encerrada: true, pendente: false };
  if (convite === 'PENDENTE' && !participante?.presenca && !terminou) {
    return { texto: 'Convite pendente', tom: 'alerta', encerrada: false, pendente: true };
  }
  if (terminou) return { texto: 'Realizada', tom: 'neutro', encerrada: true, pendente: false };
  if (new Date(reuniao.inicio).getTime() <= agora) {
    return { texto: 'Em andamento', tom: 'sucesso', encerrada: false, pendente: false };
  }
  return { texto: 'Agendada', tom: 'primaria', encerrada: false, pendente: false };
}

export function entradaAberta(reuniao: Reuniao, agora: number) {
  return (
    reuniao.situacao === 'AGENDADA' &&
    agora >= new Date(reuniao.inicio).getTime() &&
    agora <= new Date(reuniao.fim).getTime()
  );
}

export function situacaoDaAta(ata: Ata | undefined): { texto: string; tom: TomEtiqueta } {
  if (!ata) return { texto: 'Não registrada', tom: 'neutro' };
  if (ata.situacao === 'RASCUNHO') return { texto: 'Rascunho', tom: 'alerta' };
  if (ata.situacao === 'EM_APROVACAO') {
    return { texto: `Em aprovação · ${ata.aprovacoes.length} de ${ata.aprovadores.length}`, tom: 'primaria' };
  }
  return { texto: 'Aprovada', tom: 'sucesso' };
}

export function plural(quantidade: number, singular: string, varios: string) {
  return `${quantidade} ${quantidade === 1 ? singular : varios}`;
}
