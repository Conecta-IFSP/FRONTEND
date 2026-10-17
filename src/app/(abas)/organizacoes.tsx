import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { coresDoNome, iniciais } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { CabecalhoAba } from '@/components/CabecalhoAba';
import { Carregando } from '@/components/Carregando';
import { EstadoVazio } from '@/components/EstadoVazio';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { ESPACO, FONTES, RAIO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api, type Comissao, type Organizacao, type Reuniao } from '@/services/api';
import { plural, quando } from '@/utils/reunioes';

type Resumo = { comissoes: number; membros: number | null; pedidos: number; proxima: Reuniao | null };

const ACOES: { rotulo: string; icone: keyof typeof Ionicons.glyphMap; destino: Href }[] = [
  { rotulo: 'Criar organização', icone: 'business-outline', destino: '/organizacoes/cadastro' },
  { rotulo: 'Participar de uma organização', icone: 'enter-outline', destino: '/organizacoes/participar' },
];

function administra(organizacao: Organizacao) {
  return organizacao.meu_vinculo?.papel === 'ADMIN' && organizacao.meu_vinculo.status === 'APROVADO';
}

export default function TelaOrganizacoes() {
  const router = useRouter();
  const { tema } = useTema();
  const { cores } = tema;
  const [organizacoes, definirOrganizacoes] = useState<Organizacao[]>([]);
  const [resumos, definirResumos] = useState<Record<string, Resumo>>({});
  const [agora, definirAgora] = useState(() => Date.now());
  const [busca, definirBusca] = useState('');
  const [carregando, definirCarregando] = useState(true);
  const [atualizando, definirAtualizando] = useState(false);
  const [aviso, definirAviso] = useState<Aviso | null>(null);
  const [respondendo, definirRespondendo] = useState<string | null>(null);
  const [menuAberto, definirMenuAberto] = useState(false);

  const carregar = useCallback(async (continuar: () => boolean = () => true) => {
    const momento = Date.now();
    const [lista, comissoes, reunioes] = await Promise.all([
      api<Organizacao[]>('/organizacoes'),
      api<Comissao[]>('/comissoes'),
      api<Reuniao[]>(`/reunioes?de=${encodeURIComponent(new Date(momento).toISOString())}`),
    ]);
    if (!continuar()) return;
    if (!lista.ok) {
      definirCarregando(false);
      definirAviso({ tom: 'erro', mensagem: lista.erro });
      return;
    }
    const minhas = lista.dados.filter((organizacao) => organizacao.meu_vinculo);
    const administradas = minhas.filter((organizacao) => organizacao.status === 'APROVADA' && administra(organizacao));
    const detalhes = await Promise.all(
      administradas.map((organizacao) => api<Organizacao>(`/organizacoes/${organizacao._id}`)),
    );
    if (!continuar()) return;

    const novos: Record<string, Resumo> = {};
    minhas.forEach((organizacao) => {
      const indice = administradas.indexOf(organizacao);
      const detalhe = indice >= 0 ? detalhes[indice] : null;
      const membros = detalhe?.ok ? (detalhe.dados.membros ?? []) : null;
      novos[organizacao._id] = {
        comissoes: comissoes.ok
          ? comissoes.dados.filter((comissao) => comissao.organizacao_id._id === organizacao._id).length
          : 0,
        membros: membros ? membros.filter((membro) => membro.status === 'APROVADO').length : null,
        pedidos: membros ? membros.filter((membro) => membro.status === 'PENDENTE').length : 0,
        proxima:
          (reunioes.ok &&
            reunioes.dados.find(
              (reuniao) =>
                reuniao.situacao === 'AGENDADA' && reuniao.comissao_id?.organizacao_id === organizacao._id,
            )) ||
          null,
      };
    });

    definirAgora(momento);
    definirOrganizacoes(minhas);
    definirResumos(novos);
    definirCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativa = true;
      void carregar(() => ativa);
      return () => {
        ativa = false;
        definirMenuAberto(false);
      };
    }, [carregar]),
  );

  async function atualizar() {
    definirAtualizando(true);
    definirAviso(null);
    await carregar();
    definirAtualizando(false);
  }

  async function responder(organizacao: Organizacao, aceitar: boolean) {
    definirRespondendo(organizacao._id);
    definirAviso(null);
    const resultado = await api(`/organizacoes/${organizacao._id}/convite`, 'PATCH', { aceitar });
    definirRespondendo(null);
    if (!resultado.ok) {
      definirAviso({ tom: 'erro', titulo: 'Não foi possível responder', mensagem: resultado.erro });
      return;
    }
    definirAviso({
      tom: 'sucesso',
      mensagem: aceitar ? `Agora você é membro de ${organizacao.nome}.` : `Convite de ${organizacao.nome} recusado.`,
    });
    await carregar();
  }

  const termo = busca.trim().toLocaleLowerCase();
  const filtradas = organizacoes.filter((organizacao) => organizacao.nome.toLocaleLowerCase().includes(termo));
  const convites = filtradas.filter(
    (organizacao) => organizacao.status === 'APROVADA' && organizacao.meu_vinculo?.status === 'CONVIDADO',
  );
  const ativas = filtradas.filter(
    (organizacao) => organizacao.status === 'APROVADA' && organizacao.meu_vinculo?.status === 'APROVADO',
  );
  const aguardando = filtradas.filter(
    (organizacao) =>
      (organizacao.status === 'PENDENTE' && organizacao.meu_vinculo?.papel === 'ADMIN') ||
      (organizacao.status === 'APROVADA' && organizacao.meu_vinculo?.status === 'PENDENTE'),
  );
  const encerradas = filtradas.filter(
    (organizacao) =>
      organizacao.status === 'REVOGADA' ||
      (organizacao.status === 'APROVADA' && organizacao.meu_vinculo?.status === 'REJEITADO'),
  );
  const hoje = new Date(agora);
  const nada = !carregando && organizacoes.length === 0;

  function sigla(nome: string, apagada = false) {
    const tinta = apagada ? { fundo: cores.alertaSuave, texto: cores.alerta } : coresDoNome(nome, cores);
    return (
      <View style={[styles.sigla, { backgroundColor: tinta.fundo }]}>
        <Text style={[styles.textoSigla, { color: tinta.texto }]}>{iniciais(nome)}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.fundo }]} edges={['top']}>
      <CabecalhoAba titulo="Organizações" />
      {organizacoes.length > 0 ? (
        <View style={[styles.busca, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
          <Ionicons name="search" size={20} color={cores.textoSutil} />
          <TextInput
            value={busca}
            onChangeText={definirBusca}
            placeholder="Buscar"
            placeholderTextColor={cores.placeholder}
            accessibilityLabel="Buscar organização"
            autoCorrect={false}
            returnKeyType="search"
            style={[styles.entradaBusca, { color: cores.texto }]}
          />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
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
        {aviso ? <FaixaAviso aviso={aviso} /> : null}
        {carregando ? <Carregando rotulo="Carregando organizações" /> : null}
        {nada ? (
          <EstadoVazio icone="business-outline" mensagem="Você ainda não participa de nenhuma organização." />
        ) : null}

        {convites.length > 0 ? (
          <View style={styles.secao}>
            <Text style={[styles.tituloSecao, { color: cores.textoSuave }]}>Convites</Text>
            {convites.map((organizacao) => (
              <View
                key={organizacao._id}
                style={[styles.cartao, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}
              >
                <View style={styles.linha}>
                  {sigla(organizacao.nome)}
                  <View style={styles.textos}>
                    <Text style={[styles.nome, { color: cores.texto }]} numberOfLines={1}>
                      {organizacao.nome}
                    </Text>
                    <Text style={[styles.detalhe, { color: cores.textoSuave }]}>Convidou você para participar</Text>
                  </View>
                </View>
                <View style={styles.respostas}>
                  <Botao
                    titulo="Recusar"
                    variante="secundario"
                    pilula
                    compacto
                    desabilitado={respondendo !== null}
                    aoTocar={() => void responder(organizacao, false)}
                  />
                  <Botao
                    titulo="Aceitar"
                    pilula
                    compacto
                    carregando={respondendo === organizacao._id}
                    desabilitado={respondendo !== null}
                    aoTocar={() => void responder(organizacao, true)}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {ativas.length > 0 ? (
          <View style={styles.secao}>
            <Text style={[styles.tituloSecao, { color: cores.textoSuave }]}>Suas organizações</Text>
            {ativas.map((organizacao) => {
              const resumo = resumos[organizacao._id];
              const admin = administra(organizacao);
              const numeros = [
                plural(resumo?.comissoes ?? 0, 'comissão', 'comissões'),
                resumo?.membros !== null && resumo?.membros !== undefined
                  ? plural(resumo.membros, 'membro', 'membros')
                  : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <Pressable
                  key={organizacao._id}
                  onPress={() => router.push({ pathname: '/organizacao', params: { id: organizacao._id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${organizacao.nome}, ${admin ? 'Administrador' : 'Membro'}`}
                  style={({ pressed }) => [
                    styles.cartao,
                    { backgroundColor: cores.superficie, borderColor: cores.bordaSuave, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={styles.linha}>
                    {sigla(organizacao.nome)}
                    <View style={styles.textos}>
                      <Text style={[styles.nome, { color: cores.texto }]} numberOfLines={1}>
                        {organizacao.nome}
                      </Text>
                      <View style={styles.linhaPapel}>
                        <View
                          style={[
                            styles.papel,
                            { backgroundColor: admin ? cores.primariaSuave : cores.superficieSuave },
                          ]}
                        >
                          <Text style={[styles.textoPapel, { color: admin ? cores.primaria : cores.textoSuave }]}>
                            {admin ? 'Administrador' : 'Membro'}
                          </Text>
                        </View>
                        <Text style={[styles.detalhe, { color: cores.textoSuave }]} numberOfLines={1}>
                          {numeros}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={cores.textoSutil} />
                  </View>
                  <View style={[styles.rodapeCartao, { borderTopColor: cores.bordaSuave }]}>
                    <Ionicons name="calendar-outline" size={16} color={cores.textoSutil} />
                    <Text
                      style={[styles.detalhe, styles.proxima, { color: resumo?.proxima ? cores.texto : cores.textoSutil }]}
                      numberOfLines={1}
                    >
                      {resumo?.proxima
                        ? `${quando(resumo.proxima.inicio, hoje)} · ${resumo.proxima.titulo}`
                        : 'Sem reuniões agendadas'}
                    </Text>
                    {resumo?.pedidos ? (
                      <View style={[styles.pedidos, { backgroundColor: cores.alertaSuave }]}>
                        <Text style={[styles.textoPedidos, { color: cores.alerta }]}>
                          {plural(resumo.pedidos, 'pedido', 'pedidos')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {aguardando.length > 0 ? (
          <View style={styles.secao}>
            <Text style={[styles.tituloSecao, { color: cores.textoSuave }]}>Aguardando autorização</Text>
            {aguardando.map((organizacao) => (
              <View
                key={organizacao._id}
                style={[styles.cartao, styles.tracejado, { backgroundColor: cores.superficie, borderColor: cores.borda }]}
              >
                <View style={styles.linha}>
                  {sigla(organizacao.nome, true)}
                  <View style={styles.textos}>
                    <Text style={[styles.nome, { color: cores.texto }]} numberOfLines={1}>
                      {organizacao.nome}
                    </Text>
                    <View style={styles.linhaPapel}>
                      <Ionicons name="time-outline" size={14} color={cores.alerta} />
                      <Text style={[styles.detalhe, { color: cores.alerta }]}>
                        {organizacao.status === 'PENDENTE' ? 'Cadastro em análise' : 'Pedido de acesso enviado'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {encerradas.length > 0 ? (
          <View style={styles.secao}>
            <Text style={[styles.tituloSecao, { color: cores.textoSuave }]}>Indisponíveis</Text>
            {encerradas.map((organizacao) => (
              <View
                key={organizacao._id}
                style={[styles.cartao, styles.tracejado, { backgroundColor: cores.superficie, borderColor: cores.borda }]}
              >
                <View style={styles.linha}>
                  <View style={[styles.sigla, { backgroundColor: cores.superficieSuave }]}>
                    <Text style={[styles.textoSigla, { color: cores.textoSutil }]}>{iniciais(organizacao.nome)}</Text>
                  </View>
                  <View style={styles.textos}>
                    <Text style={[styles.nome, { color: cores.textoSuave }]} numberOfLines={1}>
                      {organizacao.nome}
                    </Text>
                    <Text style={[styles.detalhe, { color: cores.textoSutil }]}>
                      {organizacao.status === 'REVOGADA' ? 'Revogada' : 'Pedido recusado'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {menuAberto ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar menu"
          onPress={() => definirMenuAberto(false)}
          style={[StyleSheet.absoluteFill, { backgroundColor: cores.sobreposicao }]}
        />
      ) : null}
      {menuAberto ? (
        <View style={styles.acoes}>
          {ACOES.map((acao) => (
            <Pressable
              key={acao.rotulo}
              onPress={() => {
                definirMenuAberto(false);
                router.push(acao.destino);
              }}
              accessibilityRole="button"
              accessibilityLabel={acao.rotulo}
              style={({ pressed }) => [styles.acao, { opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={[styles.rotuloAcao, { backgroundColor: cores.superficie }, tema.sombra]}>
                <Text style={[styles.textoAcao, { color: cores.texto }]}>{acao.rotulo}</Text>
              </View>
              <View style={[styles.iconeAcao, { backgroundColor: cores.superficie }, tema.sombra]}>
                <Ionicons name={acao.icone} size={22} color={cores.primaria} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable
        onPress={() => definirMenuAberto(!menuAberto)}
        accessibilityRole="button"
        accessibilityLabel={menuAberto ? 'Fechar menu' : 'Adicionar organização'}
        accessibilityState={{ expanded: menuAberto }}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: pressed ? cores.primariaPressionada : cores.primaria },
          tema.sombra,
        ]}
      >
        <Ionicons
          name="add"
          size={26}
          color={cores.textoSobrePrimaria}
          style={{ transform: [{ rotate: menuAberto ? '45deg' : '0deg' }] }}
        />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  busca: {
    width: '100%',
    maxWidth: 528,
    alignSelf: 'center',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm + 2,
    paddingHorizontal: ESPACO.md,
    marginBottom: ESPACO.sm,
    borderRadius: 22,
    borderWidth: 1,
  },
  entradaBusca: { flex: 1, minWidth: 0, height: 44, fontFamily: FONTES.corpo, fontSize: 15, outlineWidth: 0 },
  conteudo: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: ESPACO.md,
    paddingTop: ESPACO.sm,
    paddingBottom: 96,
    gap: ESPACO.md + 4,
  },
  secao: { gap: ESPACO.sm },
  tituloSecao: { fontFamily: FONTES.titulo, fontSize: 13, lineHeight: 18 },
  cartao: { borderWidth: 1, borderRadius: RAIO.lg, padding: ESPACO.md - 2, gap: ESPACO.md - 4 },
  tracejado: { borderStyle: 'dashed' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  sigla: { width: 44, height: 44, borderRadius: RAIO.md, alignItems: 'center', justifyContent: 'center' },
  textoSigla: { fontFamily: FONTES.titulo, fontSize: 15, lineHeight: 20 },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  nome: { fontFamily: FONTES.titulo, fontSize: 15, lineHeight: 22 },
  detalhe: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  linhaPapel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  papel: { borderRadius: RAIO.circulo, paddingHorizontal: ESPACO.sm, paddingVertical: 1 },
  textoPapel: { fontFamily: FONTES.corpoMedio, fontSize: 11, lineHeight: 16 },
  respostas: { flexDirection: 'row', gap: ESPACO.sm, paddingLeft: 56 },
  rodapeCartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    paddingTop: ESPACO.sm + 2,
    borderTopWidth: 1,
  },
  proxima: { flex: 1, minWidth: 0 },
  pedidos: { borderRadius: RAIO.circulo, paddingHorizontal: ESPACO.sm + 2, paddingVertical: 2 },
  textoPedidos: { fontFamily: FONTES.corpoMedio, fontSize: 12, lineHeight: 16 },
  acoes: { position: 'absolute', right: 20, bottom: ESPACO.lg + 56 + ESPACO.md, alignItems: 'flex-end', gap: ESPACO.md },
  acao: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  rotuloAcao: { borderRadius: RAIO.sm, paddingHorizontal: ESPACO.md - 4, paddingVertical: 6 },
  textoAcao: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
  iconeAcao: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: ESPACO.md,
    bottom: ESPACO.lg,
    width: 56,
    height: 56,
    borderRadius: RAIO.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
