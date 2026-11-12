import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Botao } from './Botao';
import { api } from '@/services/api';
export function AcessoPresidente({ reuniaoId }: { reuniaoId: string }) {
  const [permitido, definirPermitido] = useState(false);
  const router = useRouter();
  useFocusEffect(useCallback(() => {
    let ativa = true;
    void api(`/presencas/${reuniaoId}/gestao`).then(r => { if (ativa) definirPermitido(r.ok); });
    return () => { ativa = false; };
  }, [reuniaoId]));
  return permitido ? <Botao titulo="Link e gestão de presença" variante="secundario" icone="link-outline"
    aoTocar={() => router.push({ pathname: '/reunioes/acesso', params: { id: reuniaoId } })} /> : null;
}
