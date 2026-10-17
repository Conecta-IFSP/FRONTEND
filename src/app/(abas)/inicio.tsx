import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { iniciais } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { CabecalhoAba } from '@/components/CabecalhoAba';
import { Carregando } from '@/components/Carregando';
import { EstadoVazio } from '@/components/EstadoVazio';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { FolhaInferior } from '@/components/FolhaInferior';
import { ItemMenu } from '@/components/ItemMenu';
import { ItemReuniao } from '@/components/ItemReuniao';
import { ESPACO, FONTES, MARCA, RAIO, TEMAS, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { useSessao } from '@/contexts/SessaoContext';
import { api, type Organizacao, type Reuniao } from '@/services/api';
import {
  diaDaSemana,
  entradaAberta,
  formatarHora,
  intervalo,
  MESES,
  meuParticipante,
  seloMes,
  situacaoDaReuniao,
} from '@/utils/reunioes';

function administra(organizacao: Organizacao) {
  return (
    organizacao.status === 'APROVADA' &&
    organizacao.meu_vinculo?.status === 'APROVADO' &&
    organizacao.meu_vinculo.papel === 'ADMIN'
  );
}

type Convite =
  | { tipo: 'organizacao'; chave: string; organizacao: Organizacao }
  | { tipo: 'reuniao'; chave: string; reuniao: Reuniao };

export default function TelaInicio() {
  const router = useRouter();
  const { tema } = useTema();
  const { cores } = tema;
  const { usuario } = useSessao();
  const meuId = usuario?._id;
  const administradorDoSistema = usuario?.tipo === 'ADMIN_SISTEMA';
  const [organizacoes, definirOrganizacoes] = useState<Organizacao[]>([]);
  const [solicitacoes, definirSolicitacoes] = useState<Record<string, number>>({});
  const [reunioes, definirReunioes] = useState<Reuniao[]>([]);
  const [agora, definirAgora] = useState(() => Date.now());
  const [carregando, definirCarregando] = useState(true);
  const [atualizando, definirAtualizando] = useState(false);
  const [erro, definirErro] = useState('');
  const [aviso, definirAviso] = useState<Aviso | null>(null);
  const [convitesAbertos, definirConvitesAbertos] = useState(false);
  const [respostas, definirRespostas] = useState<Record<string, boolean>>({});
  const [ocupado, definirOcupado] = useState<string | null>(null);

  const carregarReunioes = useCallback(async () => {
    const inicio = Date.now();
    const resultado = await api<Reuniao[]>(`/reunioes?de=${encodeURIComponent(new Date(inicio).toISOString())}`);
    return { resultado, inicio };
  }, []);

  const carregar = useCallback(
    async (continuar: () => boolean = () => true) => {
      const [resultado, agenda] = await Promise.all([
        api<Organizacao[]>('/organizacoes'),
        administradorDoSistema ? null : carregarReunioes(),
      ]);
      if (!continuar()) return;
      if (agenda) {
        definirAgora(agenda.inicio);
        if (agenda.resultado.ok) definirReunioes(agenda.resultado.dados);
      }
      if (!resultado.ok) {
        definirCarregando(false);
        definirErro(resultado.erro);
        return;
      }

      const administradas = administradorDoSistema ? [] : resultado.dados.filter(administra);
      const detalhes = await Promise.all(
        administradas.map((item) => api<Organizacao>(`/organizacoes/${item._id}`)),
      );
      if (!continuar()) return;

      const pendentes: Record<string, number> = {};
      detalhes.forEach((detalhe, indice) => {
        if (!detalhe.ok) return;
        pendentes[administradas[indice]._id] =
          detalhe.dados.membros?.filter((membro) => membro.status === 'PENDENTE').length ?? 0;
      });

      definirErro('');
      definirOrganizacoes(resultado.dados);
      definirSolicitacoes(pendentes);
      definirCarregando(false);
    },
    [administradorDoSistema, carregarReunioes],
  );

  useFocusEffect(
    useCallback(() => {
      let ativa = true;
      void carregar(() => ativa);
      return () => {
        ativa = false;
      };
    }, [carregar]),
  );

  async function atualizar() {
    definirAtualizando(true);
    await carregar();
    definirAtualizando(false);
  }

  async function responder(convite: Convite, aceito: boolean) {
    definirOcupado(convite.chave);
    definirAviso(null);
    if (convite.tipo === 'organizacao') {
      const resultado = await api(`/organizacoes/${convite.organizacao._id}/convite`, 'PATCH', { aceitar: aceito });
      definirOcupado(null);
      if (!resultado.ok) {
        definirAviso({ tom: 'erro', titulo: 'Não foi possível responder', mensagem: resultado.erro });
        return;
      }
    } else {
      const resultado = await api<Reuniao>(`/reunioes/${convite.reuniao._id}/convite`, 'PATCH', { aceito });
      definirOcupado(null);
      if (!resultado.ok) {
        definirAviso({ tom: 'erro', titulo: 'Não foi possível responder', mensagem: resultado.erro });
        return;
      }
      definirReunioes((lista) => lista.map((item) => (item._id === convite.reuniao._id ? resultado.dados : item)));
    }
    definirRespostas((atuais) => ({ ...atuais, [convite.chave]: aceito }));
  }

  async function marcarEntrada(reuniao: Reuniao) {
    definirOcupado(reuniao._id);
    definirAviso(null);
    const resultado = await api<Reuniao>(`/reunioes/${reuniao._id}/entrada`, 'POST');
    definirOcupado(null);
    if (!resultado.ok) {
      definirAviso({ tom: 'erro', mensagem: resultado.erro });
      return;
    }
    definirReunioes((lista) => lista.map((item) => (item._id === reuniao._id ? resultado.dados : item)));
  }

  function abrirReuniao(reuniao: Reuniao) {
    router.push({ pathname: '/reunioes/[id]', params: { id: reuniao._id } });
  }

  const hoje = new Date(agora);
  const vigentes = reunioes.filter(
    (reuniao) =>
      reuniao.situacao === 'AGENDADA' &&
      new Date(reuniao.fim).getTime() > agora &&
      meuParticipante(reuniao, meuId)?.convite !== 'RECUSADO',
  );
  const emCurso = vigentes.find((reuniao) => entradaAberta(reuniao, agora));
  const proximas = vigentes.filter((reuniao) => reuniao._id !== emCurso?._id).slice(0, 3);
  const convites: Convite[] = [
    ...organizacoes
      .filter(
        (organizacao) =>
          organizacao.status === 'APROVADA' &&
          (respostas[`o:${organizacao._id}`] !== undefined || organizacao.meu_vinculo?.status === 'CONVIDADO'),
      )
      .map((organizacao) => ({ tipo: 'organizacao' as const, chave: `o:${organizacao._id}`, organizacao })),
    ...reunioes
      .filter(
        (reuniao) =>
          reuniao.situacao === 'AGENDADA' &&
          new Date(reuniao.fim).getTime() > agora &&
          (respostas[`r:${reuniao._id}`] !== undefined || situacaoDaReuniao(reuniao, meuId, agora).pendente),
      )
      .map((reuniao) => ({ tipo: 'reuniao' as const, chave: `r:${reuniao._id}`, reuniao })),
  ];
  const convitesPendentes = convites.filter((convite) => respostas[convite.chave] === undefined).length;
  const administradas = organizacoes.filter(administra);
  const totalSolicitacoes = Object.values(solicitacoes).reduce((total, valor) => total + valor, 0);
  const aguardandoAutorizacao = organizacoes.filter((item) => item.status === 'PENDENTE').length;

  const minhaEntrada = emCurso ? meuParticipante(emCurso, meuId)?.presenca : undefined;
  const progresso = emCurso
    ? Math.min(
        100,
        Math.max(
          0,
          ((agora - new Date(emCurso.inicio).getTime()) /
            (new Date(emCurso.fim).getTime() - new Date(emCurso.inicio).getTime())) *
            100,
        ),
      )
    : 0;
  const presentes = emCurso
    ? emCurso.participantes.filter(
        (participante) => participante.usuario_id && participante.presenca && participante.presenca.situacao !== 'RECUSADA',
      )
    : [];
  const rotuloEntrada = !minhaEntrada
    ? 'Marcar entrada'
    : minhaEntrada.situacao === 'RECUSADA'
      ? 'Entrada recusada'
      : minhaEntrada.saida
        ? 'Saída marcada'
        : minhaEntrada.situacao === 'AGUARDANDO'
          ? 'Aguardando confirmação'
          : 'Presente';
  const translucido = `${MARCA.branco}33`;
  const blocoUnico = administradas.length === 0;

  return (
    <SafeAreaView
      style={[styles.tela, { backgroundColor: cores.fundo }]}
      edges={administradorDoSistema ? ['top', 'bottom'] : ['top']}
    >
      <CabecalhoAba>
        <Text style={[styles.data, { color: cores.texto }]} accessibilityRole="header">
          <Text style={{ color: cores.primaria }}>{hoje.getDate()}</Text> de {MESES[hoje.getMonth()]}
        </Text>
        <Text style={[styles.diaSemana, { color: cores.textoSuave }]}>{diaDaSemana(hoje)}</Text>
      </CabecalhoAba>

      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizar}
            colors={[cores.primaria]}
            tintColor={cores.primaria}
            progressBackgroundColor={cores.superficie}
          />
        }
      >
        {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
        {aviso ? <FaixaAviso aviso={aviso} /> : null}

        {administradorDoSistema ? (
          <View style={styles.menu}>
            <ItemMenu
              titulo="Gerenciar organizações"
              descricao={
                aguardandoAutorizacao > 0
                  ? `${aguardandoAutorizacao} ${
                      aguardandoAutorizacao === 1 ? 'organização aguardando' : 'organizações aguardando'
                    } autorização.`
                  : 'Autorize, revogue ou edite as organizações cadastradas.'
              }
              icone="shield-checkmark-outline"
              aoTocar={() => router.push('/organizacoes/aprovacao')}
            />
            <ItemMenu
              titulo="Sistema"
              descricao="Status, relatórios, reinício de subsistemas e reset."
              icone="hardware-chip-outline"
              aoTocar={() => router.push('/sistema')}
            />
          </View>
        ) : (
          <>
            {emCurso ? (
              <View style={[styles.destaque, tema.sombra]}>
                <LinearGradient
                  colors={tema.gradiente}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradiente}
                >
                  <Pressable
                    onPress={() => abrirReuniao(emCurso)}
                    accessibilityRole="button"
                    accessibilityLabel={`${emCurso.titulo}, ${intervalo(emCurso)}`}
                    style={({ pressed }) => [styles.infoDestaque, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    <View style={styles.linhaDestaque}>
                      <View style={[styles.seloAgora, { backgroundColor: translucido }]}>
                        <View style={[styles.pontoAgora, { backgroundColor: TEMAS.escuro.cores.sucesso }]} />
                        <Text style={styles.textoAgora}>Agora</Text>
                      </View>
                      <Text style={styles.horaDestaque}>{intervalo(emCurso)}</Text>
                    </View>
                    <Text style={styles.tituloDestaque}>{emCurso.titulo}</Text>
                    <Text style={styles.detalheDestaque} numberOfLines={1}>
                      {emCurso.comissao_id?.nome ?? 'Comissão'} · {emCurso.local}
                    </Text>
                    <View style={[styles.trilha, { backgroundColor: `${MARCA.branco}40` }]}>
                      <View style={[styles.progresso, { width: `${progresso}%` }]} />
                    </View>
                  </Pressable>
                  <View style={styles.rodapeDestaque}>
                    <View style={styles.pilha}>
                      {presentes.slice(0, 3).map((participante) => (
                        <View
                          key={participante.usuario_id?._id}
                          style={[styles.avatarDestaque, { backgroundColor: translucido }]}
                        >
                          <Text style={styles.iniciaisDestaque}>{iniciais(participante.usuario_id?.nome ?? '')}</Text>
                        </View>
                      ))}
                      {presentes.length > 3 ? (
                        <View style={[styles.avatarDestaque, { backgroundColor: translucido }]}>
                          <Text style={styles.iniciaisDestaque}>+{presentes.length - 3}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => void marcarEntrada(emCurso)}
                      disabled={Boolean(minhaEntrada) || ocupado !== null}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: Boolean(minhaEntrada), busy: ocupado === emCurso._id }}
                      style={({ pressed }) => [
                        styles.botaoDestaque,
                        {
                          backgroundColor: minhaEntrada ? translucido : MARCA.branco,
                          opacity: pressed || ocupado === emCurso._id ? 0.8 : 1,
                        },
                      ]}
                    >
                      {minhaEntrada?.situacao === 'AGUARDANDO' && !minhaEntrada.saida ? (
                        <Ionicons name="time-outline" size={16} color={MARCA.branco} />
                      ) : null}
                      <Text style={[styles.textoBotaoDestaque, { color: minhaEntrada ? MARCA.branco : cores.primaria }]}>
                        {rotuloEntrada}
                      </Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </View>
            ) : null}

            <View style={styles.blocos}>
              <Pressable
                onPress={() => definirConvitesAbertos(true)}
                accessibilityRole="button"
                accessibilityLabel={`Convites, ${convitesPendentes}`}
                style={({ pressed }) => [
                  styles.bloco,
                  blocoUnico ? styles.blocoLinha : null,
                  { backgroundColor: cores.superficie, borderColor: cores.bordaSuave, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.iconeBloco, { backgroundColor: cores.primariaSuave }]}>
                  <Ionicons name="mail-outline" size={18} color={cores.primaria} />
                </View>
                <View style={blocoUnico ? styles.textosLinha : null}>
                  <Text style={[styles.numeroBloco, { color: cores.texto }]}>{convitesPendentes}</Text>
                  <Text style={[styles.rotuloBloco, { color: cores.textoSuave }]}>Convites</Text>
                </View>
                {blocoUnico ? <Ionicons name="chevron-forward" size={18} color={cores.textoSutil} /> : null}
              </Pressable>
              {!blocoUnico ? (
                <Pressable
                  onPress={() => {
                    const organizacao =
                      administradas.find((item) => (solicitacoes[item._id] ?? 0) > 0) ?? administradas[0];
                    router.push({ pathname: '/organizacao', params: { id: organizacao._id, aba: 'membros' } });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Solicitações, ${totalSolicitacoes}`}
                  style={({ pressed }) => [
                    styles.bloco,
                    { backgroundColor: cores.superficie, borderColor: cores.bordaSuave, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={[styles.iconeBloco, { backgroundColor: cores.alertaSuave }]}>
                    <Ionicons name="person-add-outline" size={18} color={cores.alerta} />
                  </View>
                  <View>
                    <Text style={[styles.numeroBloco, { color: cores.texto }]}>{totalSolicitacoes}</Text>
                    <Text style={[styles.rotuloBloco, { color: cores.textoSuave }]}>Solicitações</Text>
                  </View>
                </Pressable>
              ) : null}
            </View>

            <View>
              <View style={styles.cabecalhoSecao}>
                <Text style={[styles.secao, { color: cores.texto }]} accessibilityRole="header">
                  Próximas reuniões
                </Text>
                <Pressable onPress={() => router.navigate('/agenda')} accessibilityRole="link" hitSlop={8} style={styles.link}>
                  <Text style={[styles.textoLink, { color: cores.primaria }]}>Ver agenda</Text>
                </Pressable>
              </View>
              {carregando ? (
                <Carregando rotulo="Carregando reuniões" />
              ) : proximas.length === 0 ? (
                <EstadoVazio icone="calendar-outline" mensagem="Nenhuma reunião agendada." />
              ) : (
                <View style={[styles.lista, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
                  {proximas.map((reuniao, indice) => (
                    <ItemReuniao
                      key={reuniao._id}
                      reuniao={reuniao}
                      usuarioId={meuId}
                      agora={agora}
                      divisor={indice > 0}
                      aoTocar={() => abrirReuniao(reuniao)}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <FolhaInferior
        visivel={convitesAbertos}
        titulo="Convites"
        aoFechar={() => {
          definirConvitesAbertos(false);
          definirRespostas({});
          if (Object.keys(respostas).some((chave) => chave.startsWith('o:'))) void carregar();
        }}
      >
        {convites.length === 0 ? (
          <Text style={[styles.semConvites, { color: cores.textoSuave }]}>Nenhum convite pendente.</Text>
        ) : null}
        {convites.map((convite) => {
          const resposta = respostas[convite.chave];
          const organizacao = convite.tipo === 'organizacao';
          return (
            <View key={convite.chave} style={[styles.convite, { borderTopColor: cores.bordaSuave }]}>
              <View style={styles.linhaConvite}>
                <View
                  style={[
                    styles.seloConvite,
                    { backgroundColor: organizacao ? cores.secundariaSuave : cores.primariaSuave },
                  ]}
                >
                  {convite.tipo === 'organizacao' ? (
                    <Text style={[styles.siglaConvite, { color: cores.secundaria }]}>
                      {iniciais(convite.organizacao.nome)}
                    </Text>
                  ) : (
                    <>
                      <Text style={[styles.mesConvite, { color: cores.primaria }]}>{seloMes(convite.reuniao.inicio)}</Text>
                      <Text style={[styles.diaConvite, { color: cores.primaria }]}>
                        {new Date(convite.reuniao.inicio).getDate()}
                      </Text>
                    </>
                  )}
                </View>
                <View style={styles.textosConvite}>
                  <Text numberOfLines={1} style={[styles.nomeConvite, { color: cores.texto }]}>
                    {convite.tipo === 'organizacao' ? convite.organizacao.nome : convite.reuniao.titulo}
                  </Text>
                  <Text numberOfLines={1} style={[styles.detalheConvite, { color: cores.textoSuave }]}>
                    {convite.tipo === 'organizacao'
                      ? 'Convite para a organização'
                      : `${formatarHora(convite.reuniao.inicio)} · ${convite.reuniao.comissao_id?.nome ?? 'Comissão'}`}
                  </Text>
                </View>
              </View>
              {resposta === undefined ? (
                <View style={styles.respostasConvite}>
                  <Botao
                    titulo="Recusar"
                    variante="secundario"
                    pilula
                    compacto
                    desabilitado={ocupado !== null}
                    aoTocar={() => void responder(convite, false)}
                  />
                  <Botao
                    titulo="Aceitar"
                    pilula
                    compacto
                    carregando={ocupado === convite.chave}
                    desabilitado={ocupado !== null}
                    aoTocar={() => void responder(convite, true)}
                  />
                </View>
              ) : (
                <Text style={[styles.respostaConvite, { color: cores.textoSuave }]}>
                  {resposta ? 'Convite aceito' : 'Convite recusado'}
                </Text>
              )}
            </View>
          );
        })}
      </FolhaInferior>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  data: { fontFamily: FONTES.titulo, fontSize: 26, lineHeight: 34 },
  diaSemana: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  conteudo: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: ESPACO.md,
    paddingTop: ESPACO.sm,
    paddingBottom: ESPACO.lg,
    gap: ESPACO.md + 4,
  },
  destaque: { borderRadius: RAIO.xl - 4 },
  gradiente: { borderRadius: RAIO.xl - 4, padding: ESPACO.md, gap: ESPACO.sm + 2 },
  infoDestaque: { gap: ESPACO.sm + 2 },
  linhaDestaque: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  seloAgora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: ESPACO.sm + 2,
    paddingVertical: 3,
    borderRadius: RAIO.circulo,
  },
  pontoAgora: { width: 6, height: 6, borderRadius: 3 },
  textoAgora: { fontFamily: FONTES.titulo, fontSize: 12, lineHeight: 16, color: MARCA.branco },
  horaDestaque: { fontFamily: FONTES.corpo, fontSize: 12, lineHeight: 16, color: MARCA.branco, opacity: 0.9 },
  tituloDestaque: { fontFamily: FONTES.titulo, fontSize: 19, lineHeight: 26, color: MARCA.branco },
  detalheDestaque: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18, color: MARCA.branco, opacity: 0.9 },
  trilha: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progresso: { height: 4, borderRadius: 2, backgroundColor: MARCA.branco },
  rodapeDestaque: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACO.md - 4,
    marginTop: 2,
  },
  pilha: { flexDirection: 'row', paddingLeft: 6 },
  avatarDestaque: {
    width: 28,
    height: 28,
    marginLeft: -6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: `${MARCA.branco}99`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciaisDestaque: { fontFamily: FONTES.titulo, fontSize: 10, lineHeight: 12, color: MARCA.branco },
  botaoDestaque: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: ESPACO.md - 2,
    borderRadius: 18,
  },
  textoBotaoDestaque: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
  blocos: { flexDirection: 'row', gap: ESPACO.sm },
  bloco: {
    flex: 1,
    alignItems: 'flex-start',
    gap: ESPACO.sm,
    padding: ESPACO.md - 4,
    borderWidth: 1,
    borderRadius: RAIO.lg,
  },
  blocoLinha: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  textosLinha: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: ESPACO.sm },
  iconeBloco: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  numeroBloco: { fontFamily: FONTES.titulo, fontSize: 20, lineHeight: 26 },
  rotuloBloco: { fontFamily: FONTES.corpo, fontSize: 12, lineHeight: 16 },
  cabecalhoSecao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secao: { fontFamily: FONTES.titulo, fontSize: 16, lineHeight: 24 },
  link: { height: 44, justifyContent: 'center' },
  textoLink: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
  menu: { gap: ESPACO.md },
  lista: { borderWidth: 1, borderRadius: RAIO.lg, overflow: 'hidden' },
  semConvites: { ...TIPOGRAFIA.corpoPequeno, paddingHorizontal: ESPACO.md, paddingVertical: ESPACO.md },
  convite: {
    gap: ESPACO.sm + 2,
    paddingHorizontal: ESPACO.md,
    paddingVertical: ESPACO.md - 4,
    borderTopWidth: 1,
  },
  linhaConvite: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  seloConvite: { width: 44, height: 44, borderRadius: RAIO.md, alignItems: 'center', justifyContent: 'center' },
  siglaConvite: { fontFamily: FONTES.titulo, fontSize: 14, lineHeight: 18 },
  mesConvite: { fontFamily: FONTES.titulo, fontSize: 10, lineHeight: 12 },
  diaConvite: { fontFamily: FONTES.titulo, fontSize: 16, lineHeight: 20 },
  textosConvite: { flex: 1, minWidth: 0 },
  nomeConvite: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  detalheConvite: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  respostasConvite: { flexDirection: 'row', gap: ESPACO.sm, paddingLeft: 56 },
  respostaConvite: { fontFamily: FONTES.corpoMedio, fontSize: 13, lineHeight: 18, paddingLeft: 56 },
});
