import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Carregando } from '@/components/Carregando';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FormularioReuniao } from '@/components/FormularioReuniao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { useToast } from '@/contexts/ToastContext';
import { api, type Reuniao } from '@/services/api';

export default function TelaEditarReuniao() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reuniao, definirReuniao] = useState<Reuniao | null>(null);
  const [erro, definirErro] = useState('');

  useEffect(() => {
    let ativa = true;
    void api<Reuniao>(`/reunioes/${id}`).then((resultado) => {
      if (!ativa) return;
      if (resultado.ok) definirReuniao(resultado.dados);
      else definirErro(resultado.erro);
    });
    return () => {
      ativa = false;
    };
  }, [id]);

  if (!reuniao) {
    return (
      <TelaComCabecalho titulo="Editar reunião" iconeVoltar="close">
        {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : <Carregando rotulo="Carregando reunião" />}
      </TelaComCabecalho>
    );
  }

  return (
    <FormularioReuniao
      reuniao={reuniao}
      aoSalvar={async ({ campos }) => {
        const resultado = await api<Reuniao>(`/reunioes/${reuniao._id}`, 'PATCH', campos);
        return resultado.ok ? null : resultado.erro;
      }}
      aoConcluir={() => {
        mostrarToast('Reunião atualizada.', 'sucesso');
        if (router.canGoBack()) router.back();
        else router.replace({ pathname: '/reunioes/[id]', params: { id: reuniao._id } });
      }}
    />
  );
}
