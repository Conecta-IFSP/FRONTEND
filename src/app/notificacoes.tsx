import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { EstadoVazio } from '@/components/EstadoVazio';
import { FaixaAviso } from '@/components/FaixaAviso';
import { api } from '@/services/api';
import { useTema } from '@/contexts/TemaContext';
type Notificacao = { _id: string; titulo: string; mensagem: string; destino: string; criada_em: string; lida_em?: string };
export default function TelaNotificacoes() {
  const { cores } = useTema().tema;
  const router = useRouter();
  const [itens, definirItens] = useState<Notificacao[]>([]);
  const [erro, definirErro] = useState('');
  const [carregando, definirCarregando] = useState(true);
  const [abrindo, definirAbrindo] = useState<string | null>(null);
  const carregar = useCallback(async (ativa: () => boolean = () => true) => {
    const r = await api<{ itens: Notificacao[] }>('/notificacoes');
    if (!ativa()) return;
    definirCarregando(false);
    if (r.ok) { definirItens(r.dados.itens); definirErro(''); } else definirErro(r.erro);
  }, []);
  useFocusEffect(useCallback(() => { let ativa = true; void carregar(() => ativa); return () => { ativa = false; }; }, [carregar]));
  async function abrir(item: Notificacao) {
    if (abrindo) return;
    definirAbrindo(item._id);
    const r = await api(`/notificacoes/${item._id}/lida`, 'PATCH');
    definirAbrindo(null);
    if (!r.ok) { definirErro(r.erro); return; }
    if (/^\/(presenca\?|reunioes\/)/.test(item.destino)) router.push(item.destino as Href);
  }
  return <TelaComCabecalho titulo="Notificações" aoAtualizar={() => carregar()}>
    <Text style={{ color: cores.textoSuave }}>Convites, solicitações de presença e avisos. Exibimos os 100 avisos mais recentes; ao abrir, confira a situação atual da reunião.</Text>
    {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
    {carregando ? <Carregando /> : !itens.length ? <EstadoVazio icone="notifications-outline" mensagem="Você não possui notificações." /> : null}
    {itens.map(item => <View key={item._id} style={{ gap: 8, padding: 16, borderRadius: 16, backgroundColor: item.lida_em ? cores.superficie : cores.primariaSuave }}>
      <Text style={{ color: cores.texto, fontWeight: 'bold', fontSize: 16 }}>{!item.lida_em ? '• ' : ''}{item.titulo}</Text>
      <Text style={{ color: cores.texto }}>{item.mensagem}</Text>
      <Text style={{ color: cores.textoSuave }}>{new Date(item.criada_em).toLocaleString('pt-BR')}</Text>
      <Botao titulo="Abrir" variante="secundario" carregando={abrindo === item._id} desabilitado={Boolean(abrindo)} aoTocar={() => void abrir(item)} />
    </View>)}
  </TelaComCabecalho>;
}
