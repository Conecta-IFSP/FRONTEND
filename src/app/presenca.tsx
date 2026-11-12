import { useCallback, useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { FaixaAviso } from '@/components/FaixaAviso';
import { api, type Presenca } from '@/services/api';
import { autenticarComDispositivo } from '@/services/autenticacao-local';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import TelaLogin from './login/index';
import { guardarRetornoPresenca } from '@/services/retorno-presenca';

type Acesso = { titulo: string; comissao: string; inicio: string; fim: string; convite: string; presenca: Presenca | null };
export default function TelaPresencaLink() {
  const { id, codigo } = useLocalSearchParams<{ id?: string; codigo?: string }>();
  const { usuario } = useSessao();
  const { cores } = useTema().tema;
  const router = useRouter();
  const [dados, definirDados] = useState<Acesso | null>(null);
  const [erro, definirErro] = useState('');
  const [sucesso, definirSucesso] = useState('');
  const [ocupado, definirOcupado] = useState(false);
  useEffect(() => {
    if (!usuario && id && codigo) void guardarRetornoPresenca(id, codigo).catch(() => {});
  }, [usuario, id, codigo]);
  const abrirApp = () => {
    if (id && codigo && /^[a-f\d]{24}$/i.test(id) && /^[a-f\d]{64}$/.test(codigo)) {
      void Linking.openURL(`conectamais://presenca?id=${id}&codigo=${codigo}`).catch(() => definirErro('Instale a versão atual do aplicativo para abrir este link.'));
    }
  };
  const carregar = useCallback(async (ativa: () => boolean = () => true) => {
    if (!usuario) return;
    if (!id || !codigo || !/^[a-f\d]{24}$/i.test(id) || !/^[a-f\d]{64}$/.test(codigo)) { definirErro('Link de presença inválido.'); return; }
    const r = await api<Acesso>(`/presencas/${id}/acesso?codigo=${codigo}`);
    if (!ativa()) return;
    if (r.ok) { definirDados(r.dados); definirErro(''); } else { definirDados(null); definirErro(r.erro); }
  }, [id, codigo, usuario]);
  useFocusEffect(useCallback(() => { let ativa = true; void carregar(() => ativa); return () => { ativa = false; }; }, [carregar]));
  async function registrar(acao: 'ENTRADA' | 'SAIDA') {
    if (ocupado) return;
    definirOcupado(true); definirErro(''); definirSucesso('');
    try {
      if (!await autenticarComDispositivo()) { definirErro('Confirmação cancelada. Nenhum registro foi enviado.'); return; }
      const r = await api<{ mensagem: string }>(`/presencas/${id}/acesso`, 'POST', { codigo, acao });
      if (!r.ok) definirErro(r.erro);
      else { definirSucesso(r.dados.mensagem); await carregar(); }
    } catch { definirErro('Não foi possível confirmar sua identidade no aparelho.'); }
    finally { definirOcupado(false); }
  }
  // Mantém o link aberto ao efetuar login com e-mail/senha ou Google nativo.
  if (!usuario) return <View style={{ flex: 1 }}>
    {Platform.OS === 'web' && <View style={{ padding: 12, gap: 6, backgroundColor: cores.superficie }}>
      <Text style={{ color: cores.texto }}>Entre com sua conta de convidado para continuar. Se tiver o app instalado, abra nele para usar a autenticação do aparelho.</Text>
      <Botao titulo="Abrir no aplicativo instalado" variante="secundario" aoTocar={abrirApp} />
    </View>}
    <TelaLogin />
  </View>;
  return <TelaComCabecalho titulo="Confirmar presença" aoAtualizar={() => carregar()}>
    {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
    {sucesso ? <FaixaAviso aviso={{ tom: 'sucesso', mensagem: sucesso }} /> : null}
    {!dados && !erro ? <Carregando /> : null}
    {dados && <>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: cores.texto }}>{dados.titulo}</Text>
      <Text style={{ color: cores.texto }}>{dados.comissao}</Text>
      <Text style={{ color: cores.textoSuave }}>{new Date(dados.inicio).toLocaleString('pt-BR')} até {new Date(dados.fim).toLocaleString('pt-BR')}</Text>
      <Text style={{ color: cores.texto }}>Conta: {usuario.nome} ({usuario.email})</Text>
      <Text style={{ color: cores.textoSuave }}>Ao confirmar, a presença será registrada sem aprovação individual. O aplicativo solicita biometria ou senha do aparelho quando configurada. No navegador, a confirmação utiliza sua sessão conectada.</Text>
      {Platform.OS === 'web' && <Botao titulo="Abrir no aplicativo instalado" variante="secundario" aoTocar={abrirApp} />}
      {dados.convite !== 'ACEITO' ? <Text style={{ color: cores.alerta }}>Aceite o convite na reunião antes de registrar presença.</Text> : null}
      <Botao titulo={dados.presenca ? 'Entrada já registrada' : 'Confirmar entrada'} carregando={ocupado} desabilitado={ocupado || Boolean(dados.presenca) || dados.convite !== 'ACEITO'} aoTocar={() => void registrar('ENTRADA')} />
      <Botao titulo={dados.presenca?.saida ? 'Saída já registrada' : 'Confirmar saída'} variante="secundario" desabilitado={ocupado || !dados.presenca || Boolean(dados.presenca.saida)} aoTocar={() => void registrar('SAIDA')} />
      <Botao titulo="Abrir reunião" variante="secundario" aoTocar={() => router.push({ pathname: '/reunioes/[id]', params: { id: id! } })} />
    </>}
  </TelaComCabecalho>;
}
