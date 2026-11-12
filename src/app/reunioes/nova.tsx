import { useLocalSearchParams, useRouter } from 'expo-router';

import { FormularioReuniao } from '@/components/FormularioReuniao';
import { useToast } from '@/contexts/ToastContext';
import { enviarAnexo } from '@/services/anexos';
import { api, type Reuniao } from '@/services/api';
import { lerChaveDia, plural } from '@/utils/reunioes';

export default function TelaNovaReuniao() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const { comissao_id: comissaoInicial, data } = useLocalSearchParams<{ comissao_id?: string; data?: string }>();

  return (
    <FormularioReuniao
      comissaoInicial={comissaoInicial}
      dataInicial={lerChaveDia(data)}
      aoSalvar={async ({ comissaoId, campos, anexos }) => {
        const { local, ...resto } = campos;
        const resultado = await api<Reuniao>('/reunioes', 'POST', {
          comissao_id: comissaoId,
          ...resto,
          ...(local ? { local } : {}),
        });
        if (!resultado.ok) return resultado.erro;

        // A reunião já existe; um anexo que falhar não desfaz o agendamento.
        let falhas = 0;
        for (const anexo of anexos) {
          if (!(await enviarAnexo(resultado.dados._id, anexo)).ok) falhas += 1;
        }
        if (falhas > 0) {
          mostrarToast(
            `Reunião agendada, mas ${plural(falhas, 'anexo não foi enviado', 'anexos não foram enviados')}.`,
            'erro',
          );
        }

        router.replace({ pathname: '/reunioes/[id]', params: { id: resultado.dados._id } });
        return null;
      }}
    />
  );
}
