import { useCallback, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { CampoInstante } from '@/components/CampoInstante';
import { Confirmacao } from '@/components/Confirmacao';
import { Carregando } from '@/components/Carregando';
import { FaixaAviso } from '@/components/FaixaAviso';
import { useTema } from '@/contexts/TemaContext';
import { api, type Participante, type Reuniao } from '@/services/api';
import { autenticarComDispositivo } from '@/services/autenticacao-local';
type Link = { codigo: string; url: string; valido_de: string; expira_em: string };
type Historico = { participante_id: string; responsavel_id: string; motivo: string; alterada_em: string;
  antes: { entrada: string; saida?: string } | null; depois: { entrada: string; saida?: string } };
const data = (valor?: string) => valor ? new Date(valor).toLocaleString('pt-BR') : 'Sem registro';

export default function TelaGestaoPresenca() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cores } = useTema().tema;
  const [reuniao, definirReuniao] = useState<Reuniao | null>(null);
  const [link, definirLink] = useState<Link | null>(null);
  const [ativo, definirAtivo] = useState(false);
  const [revisao, definirRevisao] = useState(0);
  const [historico, definirHistorico] = useState<Historico[]>([]);
  const [erro, definirErro] = useState('');
  const [sucesso, definirSucesso] = useState('');
  const [ocupado, definirOcupado] = useState(false);
  const [confirmacao, definirConfirmacao] = useState<'GERAR' | 'REVOGAR' | null>(null);
  const [alvo, definirAlvo] = useState<Participante | null>(null);
  const [entrada, definirEntrada] = useState(() => new Date());
  const [saida, definirSaida] = useState(() => new Date());
  const [temSaida, definirTemSaida] = useState(false);
  const [motivo, definirMotivo] = useState('');
  const carregar = useCallback(async (continuar: () => boolean = () => true) => {
    const gestao = await api<{ link_ativo: boolean; revisao: number }>(`/presencas/${id}/gestao`);
    if (!continuar()) return;
    if (!gestao.ok) { definirErro(gestao.erro); definirReuniao(null); return; }
    const [r, h] = await Promise.all([api<Reuniao>(`/reunioes/${id}`), api<Historico[]>(`/presencas/${id}/historico`)]);
    if (!continuar()) return;
    definirAtivo(gestao.dados.link_ativo); definirRevisao(gestao.dados.revisao);
    if (r.ok) definirReuniao(r.dados); else definirErro(r.erro);
    if (h.ok) definirHistorico(h.dados);
  }, [id]);
  useFocusEffect(useCallback(() => { let ativa = true; void carregar(() => ativa); return () => { ativa = false; }; }, [carregar]));
  async function agir(acao: () => Promise<void>) {
    if (ocupado) return;
    definirOcupado(true); definirErro(''); definirSucesso('');
    try { await acao(); } catch (e) { definirErro(e instanceof Error ? e.message : 'Não foi possível concluir.'); }
    finally { definirOcupado(false); definirConfirmacao(null); }
  }
  async function gerar() {
    const r = await api<Link>(`/presencas/${id}/link`, 'POST');
    if (!r.ok) throw Error(r.erro);
    definirLink(r.dados); definirAtivo(true); definirSucesso('Link gerado. Ele ficará válido durante o horário da reunião.');
  }
  async function revogar() {
    const r = await api(`/presencas/${id}/link`, 'DELETE');
    if (!r.ok) throw Error(r.erro);
    definirLink(null); definirAtivo(false); definirSucesso('O link anterior não pode mais registrar presenças.');
  }
  async function enviar(canal: 'APP' | 'EMAIL') {
    const r = await api<{ mensagem: string }>(`/presencas/${id}/enviar`, 'POST', { canal, codigo: link?.codigo });
    if (!r.ok) throw Error(r.erro);
    definirSucesso(r.dados.mensagem);
  }
  async function corrigir() {
    if (!alvo?.usuario_id || motivo.trim().length < 5) throw Error('Informe o motivo com pelo menos 5 caracteres.');
    if (!await autenticarComDispositivo()) throw Error('Confirmação cancelada.');
    const r = await api<{ mensagem: string }>(`/presencas/${id}/horarios/${alvo.usuario_id._id}`, 'PATCH', {
      entrada: entrada.toISOString(), ...(temSaida ? { saida: saida.toISOString() } : {}), motivo, revisao,
    });
    if (!r.ok) throw Error(r.erro);
    definirSucesso(r.dados.mensagem); definirAlvo(null); await carregar();
  }
  const fechado = reuniao?.situacao === 'CANCELADA' || Boolean(reuniao?.ata && reuniao.ata.situacao !== 'RASCUNHO');
  const nome = (pessoaId: string) => reuniao?.participantes.find(p => p.usuario_id?._id === pessoaId)?.usuario_id?.nome ?? 'Usuário não disponível';
  return <TelaComCabecalho titulo="Gestão de presença" aoAtualizar={async () => { definirAlvo(null); definirErro(''); await carregar(); }}>
    {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
    {sucesso ? <FaixaAviso aviso={{ tom: 'sucesso', mensagem: sucesso }} /> : null}
    {!reuniao && !erro ? <Carregando /> : null}
    {reuniao && <>
      <Text style={{ color: cores.texto, fontWeight: 'bold', fontSize: 20 }}>{reuniao.titulo}</Text>
      <Text style={{ color: cores.textoSuave }}>Somente o responsável atual da comissão pode gerar o acesso e corrigir horários. Os convidados precisam entrar com a própria conta e aceitar o convite.</Text>
      <Botao titulo={ativo ? 'Gerar novo link' : 'Gerar link de presença'} desabilitado={ocupado || fechado || new Date(reuniao.fim) <= new Date()}
        aoTocar={() => ativo ? definirConfirmacao('GERAR') : void agir(gerar)} />
      {link && <View style={{ gap: 10 }}>
        <Text selectable style={{ color: cores.texto }}>{link.url}</Text>
        <Text style={{ color: cores.textoSuave }}>Validade: {data(link.valido_de)} até {data(link.expira_em)}.</Text>
        <Botao titulo="Copiar link" variante="secundario" aoTocar={() => void agir(async () => { await Clipboard.setStringAsync(link.url); definirSucesso('Link copiado.'); })} desabilitado={ocupado} />
        <Botao titulo="Notificar convidados no aplicativo" variante="secundario" desabilitado={ocupado} aoTocar={() => void agir(() => enviar('APP'))} />
        <Botao titulo="Enviar e-mail aos convidados" variante="secundario" desabilitado={ocupado} aoTocar={() => void agir(() => enviar('EMAIL'))} />
      </View>}
      {ativo && <Botao titulo="Revogar link" variante="perigo" desabilitado={ocupado} aoTocar={() => definirConfirmacao('REVOGAR')} />}
      <Text style={{ color: cores.texto, fontWeight: 'bold', fontSize: 18 }}>Corrigir entrada e saída</Text>
      {fechado ? <Text style={{ color: cores.textoSuave }}>Os registros estão fechados por cancelamento ou envio da ata.</Text> : <>
        {!alvo ? reuniao.participantes.map(p => p.usuario_id && <Botao key={p.usuario_id._id} titulo={p.usuario_id.nome} variante="secundario" desabilitado={ocupado}
          aoTocar={() => { definirAlvo(p); definirEntrada(new Date(p.presenca?.entrada ?? reuniao.inicio)); definirSaida(new Date(p.presenca?.saida ?? Math.min(Date.now(), new Date(reuniao.fim).getTime()))); definirTemSaida(Boolean(p.presenca?.saida)); definirMotivo(''); }} />) : <>
          <Text style={{ color: cores.texto }}>{alvo.usuario_id?.nome}</Text>
          <CampoInstante rotulo="Entrada" valor={entrada} aoMudar={definirEntrada} desabilitado={ocupado} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: cores.texto }}>Registrar saída</Text><Switch accessibilityLabel="Registrar saída" value={temSaida} onValueChange={definirTemSaida} disabled={ocupado} /></View>
          {temSaida && <CampoInstante rotulo="Saída" valor={saida} aoMudar={definirSaida} desabilitado={ocupado} />}
          <CampoTexto rotulo="Motivo da correção" value={motivo} onChangeText={definirMotivo} maxLength={500} multiline editable={!ocupado} />
          <Text style={{ color: cores.textoSuave }}>Ao desativar a saída, o registro fica em aberto. A correção confirma a presença e mantém os valores anteriores no histórico.</Text>
          <Botao titulo="Salvar correção" carregando={ocupado} aoTocar={() => void agir(corrigir)} />
          <Botao titulo="Escolher outro participante" variante="secundario" desabilitado={ocupado} aoTocar={() => definirAlvo(null)} />
        </>}
      </>}
      <Text style={{ color: cores.texto, fontWeight: 'bold', fontSize: 18 }}>Histórico de correções</Text>
      {!historico.length && <Text style={{ color: cores.textoSuave }}>Nenhuma correção registrada.</Text>}
      {[...historico].reverse().map((h, i) => <View key={`${h.alterada_em}-${i}`} style={{ padding: 12, backgroundColor: cores.superficie, borderRadius: 12, gap: 4 }}>
        <Text style={{ color: cores.texto, fontWeight: 'bold' }}>{nome(h.participante_id)}</Text>
        <Text style={{ color: cores.textoSuave }}>{nome(h.responsavel_id)} · {data(h.alterada_em)}</Text>
        <Text style={{ color: cores.texto }}>{h.motivo}</Text>
        <Text style={{ color: cores.texto }}>Antes: {data(h.antes?.entrada)} / {data(h.antes?.saida)}</Text>
        <Text style={{ color: cores.texto }}>Depois: {data(h.depois.entrada)} / {data(h.depois.saida)}</Text>
      </View>)}
    </>}
    <Confirmacao titulo={confirmacao === 'GERAR' ? 'Substituir link?' : 'Revogar link?'} mensagem={confirmacao ? 'O link atual deixará de funcionar. Os registros já realizados serão mantidos.' : undefined}
      perigo carregando={ocupado} cancelar={() => definirConfirmacao(null)} confirmar={() => void agir(confirmacao === 'GERAR' ? gerar : revogar)} />
  </TelaComCabecalho>;
}
