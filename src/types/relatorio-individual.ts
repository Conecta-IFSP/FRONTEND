export type ParticipacaoIndividual = {
  reuniao_id: string;
  titulo: string;
  comissao: string;
  organizacao: string;
  local: string | null;
  inicio: string;
  fim: string;
  dia_inteiro: boolean;
  entrada: string;
  saida: string | null;
  minutos: number | null;
};

export type RelatorioIndividual = {
  usuario: { nome: string; email: string };
  gerada_em: string;
  periodo: { de: string | null; ate: string | null };
  resumo: { reunioes: number; minutos_registrados: number; registros_sem_duracao: number };
  reunioes: ParticipacaoIndividual[];
};
