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
  saida_automatica?: boolean;
  minutos: number | null;
};

export type RelatorioIndividual = {
  usuario: { nome: string; email: string };
  // Opcional para permitir atualização do cliente antes do servidor.
  vinculos?: {
    organizacoes: { id: string; nome: string; papel: 'ADMIN' | 'MEMBRO' }[];
    comissoes: { id: string; nome: string; organizacao_id: string; organizacao: string; papel: 'RESPONSAVEL' | 'MEMBRO' }[];
  };
  gerada_em: string;
  periodo: { de: string | null; ate: string | null };
  resumo: { reunioes: number; minutos_registrados: number; registros_sem_duracao: number };
  reunioes: ParticipacaoIndividual[];
};
