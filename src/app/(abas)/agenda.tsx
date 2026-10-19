import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { Botao } from '@/components/Botao';
import { BotaoFlutuante } from '@/components/BotaoFlutuante';
import { CabecalhoAba } from '@/components/CabecalhoAba';
import { CalendarioRetratil } from '@/components/Calendario';
import { Carregando } from '@/components/Carregando';
import { Etiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { ESPACO, FONTES, RAIO } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import { api, type Reuniao } from '@/services/api';
import {
  chaveDia,
  duracao,
  formatarDataCurta,
  formatarHora,
  inicioDoDia,
  maiuscula,
  MESES,
  rotuloDia,
  situacaoDaReuniao,
  somarDias,
} from '@/utils/reunioes';

export default function TelaAgenda() {
  const router = useRouter();
  const { tema } = useTema();
  const { cores } = tema;
  const { usuario } = useSessao();
  const meuId = usuario?._id;
  const [agora, definirAgora] = useState(() => Date.now());
  const [selecionado, definirSelecionado] = useState(() => inicioDoDia(new Date()));
  const [expandido, definirExpandido] = useState(false);
  const [mesVisivel, definirMesVisivel] = useState(() => {
    const data = new Date();
    return new Date(data.getFullYear(), data.getMonth(), 1);
  });
  const [reunioes, definirReunioes] = useState<Reuniao[]>([]);
  const [carregando, definirCarregando] = useState(true);
  const [atualizando, definirAtualizando] = useState(false);
  const [respondendo, definirRespondendo] = useState<string | null>(null);
  const [erro, definirErro] = useState('');
  const hoje = inicioDoDia(new Date(agora));

  const carregar = useCallback(
    async (continuar: () => boolean = () => true) => {
      const lista = await api<Reuniao[]>('/reunioes');
      if (!continuar()) return;
      definirCarregando(false);
      definirAgora(Date.now());
      if (!lista.ok) {
        definirErro(lista.erro);
        return;
      }
      definirErro('');
      definirReunioes(lista.dados);
    },
    [],
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

  function escolherDia(dia: Date) {
    definirSelecionado(dia);
    definirMesVisivel(new Date(dia.getFullYear(), dia.getMonth(), 1));
    definirExpandido(false);
  }

  function mudarExpandido(valor: boolean) {
    definirMesVisivel(new Date(selecionado.getFullYear(), selecionado.getMonth(), 1));
    definirExpandido(valor);
  }

  async function responder(reuniao: Reuniao, aceito: boolean) {
    definirRespondendo(reuniao._id);
    definirErro('');
    const resultado = await api<Reuniao>(`/reunioes/${reuniao._id}/convite`, 'PATCH', { aceito });
    definirRespondendo(null);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    definirReunioes((lista) => lista.map((item) => (item._id === reuniao._id ? resultado.dados : item)));
  }

  const porDia: Record<string, Reuniao[]> = {};
  const marcas: Record<string, string[]> = {};
  reunioes.forEach((reuniao) => {
    const chave = chaveDia(new Date(reuniao.inicio));
    (porDia[chave] ??= []).push(reuniao);
    const situacao = situacaoDaReuniao(reuniao, meuId, agora);
    if (situacao.encerrada && situacao.texto !== 'Realizada') return;
    (marcas[chave] ??= []).push(
      situacao.pendente ? cores.alerta : situacao.encerrada ? cores.textoSutil : cores.primaria,
    );
  });

  const dias = Array.from({ length: 7 }, (_, indice) => somarDias(selecionado, indice));
  const ehHoje = chaveDia(selecionado) === chaveDia(hoje);

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.superficie }]} edges={['top']}>
      <View style={[styles.topo, { backgroundColor: cores.superficie }, tema.sombra]}>
        <CabecalhoAba
          titulo={maiuscula(MESES[(expandido ? mesVisivel : selecionado).getMonth()])}
          acoes={
            <Pressable
              onPress={() => escolherDia(hoje)}
              accessibilityRole="button"
              accessibilityLabel="Ir para hoje"
              hitSlop={4}
              style={styles.botaoHoje}
            >
              <View style={[styles.iconeHoje, { borderColor: cores.texto }]}>
                <Text style={[styles.numeroHoje, { color: cores.texto }]}>{hoje.getDate()}</Text>
              </View>
            </Pressable>
          }
        />

        <View style={styles.calendario}>
          <CalendarioRetratil
            selecionado={selecionado}
            hoje={hoje}
            mes={mesVisivel}
            expandido={expandido}
            marcas={marcas}
            aoEscolher={escolherDia}
            aoMudarMes={definirMesVisivel}
            aoMudarExpandido={mudarExpandido}
          />
        </View>
      </View>

      <ScrollView
        style={[styles.lista, { backgroundColor: cores.fundo }]}
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
        {carregando ? <Carregando rotulo="Carregando agenda" /> : null}

        {!carregando
          ? dias.map((dia) => {
              const lista = porDia[chaveDia(dia)] ?? [];
              return (
                <View key={chaveDia(dia)} style={styles.dia}>
                  <View style={styles.cabecalhoDia}>
                    <Text style={[styles.data, { color: cores.texto }]}>{formatarDataCurta(dia)}</Text>
                    <Text style={[styles.rotuloDia, { color: cores.textoSuave }]}>
                      {maiuscula(rotuloDia(dia, hoje))}
                    </Text>
                  </View>
                  {lista.length === 0 ? (
                    <Text style={[styles.vazio, { color: cores.textoSutil }]}>Nenhuma reunião</Text>
                  ) : null}
                  {lista.map((reuniao) => {
                    const situacao = situacaoDaReuniao(reuniao, meuId, agora);
                    const barra = situacao.pendente
                      ? cores.alerta
                      : situacao.encerrada
                        ? cores.borda
                        : situacao.texto === 'Em andamento'
                          ? cores.sucesso
                          : cores.primaria;
                    const apagada = situacao.encerrada;
                    const mostrarEtiqueta = situacao.texto !== 'Agendada' && situacao.texto !== 'Realizada';

                    return (
                      <View key={reuniao._id}>
                        <Pressable
                          onPress={() => router.push({ pathname: '/reunioes/[id]', params: { id: reuniao._id } })}
                          accessibilityRole="button"
                          accessibilityLabel={`${reuniao.titulo}, ${formatarHora(reuniao.inicio)}, ${
                            reuniao.comissao_id?.nome ?? ''
                          }${mostrarEtiqueta ? `, ${situacao.texto}` : ''}`}
                          style={({ pressed }) => [styles.reuniao, { opacity: pressed ? 0.7 : 1 }]}
                        >
                          <View style={styles.horario}>
                            <Text style={[styles.hora, { color: apagada ? cores.textoSutil : cores.texto }]}>
                              {formatarHora(reuniao.inicio)}
                            </Text>
                            <Text style={[styles.duracao, { color: cores.textoSutil }]}>{duracao(reuniao)}</Text>
                          </View>
                          <View style={[styles.barra, { backgroundColor: barra }]} />
                          <View style={styles.corpo}>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.nomeReuniao,
                                {
                                  color: apagada ? cores.textoSutil : cores.texto,
                                  textDecorationLine: situacao.texto === 'Cancelada' ? 'line-through' : 'none',
                                },
                              ]}
                            >
                              {reuniao.titulo}
                            </Text>
                            <Text numberOfLines={1} style={[styles.comissao, { color: cores.textoSuave }]}>
                              {reuniao.comissao_id?.nome ?? 'Comissão'}
                            </Text>
                            {mostrarEtiqueta ? (
                              <View style={styles.etiqueta}>
                                <Etiqueta texto={situacao.texto} tom={situacao.tom} />
                              </View>
                            ) : null}
                          </View>
                        </Pressable>
                        {situacao.pendente ? (
                          <View style={styles.respostas}>
                            <Botao
                              titulo="Recusar"
                              variante="secundario"
                              pilula
                              compacto
                              desabilitado={respondendo !== null}
                              aoTocar={() => void responder(reuniao, false)}
                            />
                            <Botao
                              titulo="Aceitar"
                              pilula
                              compacto
                              carregando={respondendo === reuniao._id}
                              desabilitado={respondendo !== null}
                              aoTocar={() => void responder(reuniao, true)}
                            />
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              );
            })
          : null}
      </ScrollView>

      {!ehHoje ? (
        <View style={styles.areaHoje}>
          <Pressable
            onPress={() => escolherDia(hoje)}
            accessibilityRole="button"
            accessibilityLabel="Voltar para hoje"
            style={({ pressed }) => [
              styles.pilulaHoje,
              { backgroundColor: cores.superficie, opacity: pressed ? 0.85 : 1 },
              tema.sombra,
            ]}
          >
            <Ionicons name={selecionado > hoje ? 'arrow-back' : 'arrow-forward'} size={18} color={cores.primaria} />
            <Text style={[styles.textoHoje, { color: cores.primaria }]}>Hoje</Text>
          </Pressable>
        </View>
      ) : null}

      <BotaoFlutuante
        icone="add"
        rotulo="Nova reunião"
        aoTocar={() => router.push({ pathname: '/reunioes/nova', params: { data: chaveDia(selecionado) } })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  topo: {
    zIndex: 1,
    borderBottomLeftRadius: RAIO.xl - 4,
    borderBottomRightRadius: RAIO.xl - 4,
  },
  botaoHoje: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconeHoje: {
    width: 22,
    height: 22,
    borderWidth: 1.8,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroHoje: { fontFamily: FONTES.titulo, fontSize: 10, lineHeight: 12 },
  calendario: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: ESPACO.sm },
  lista: { flex: 1 },
  conteudo: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: ESPACO.md,
    paddingTop: ESPACO.xs,
    paddingBottom: 112,
  },
  dia: { paddingTop: ESPACO.md - 4 },
  cabecalhoDia: { flexDirection: 'row', alignItems: 'baseline', gap: ESPACO.sm },
  data: { fontFamily: FONTES.titulo, fontSize: 16, lineHeight: 24 },
  rotuloDia: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  vazio: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18, marginTop: 2, marginBottom: ESPACO.xs },
  reuniao: { flexDirection: 'row', gap: ESPACO.md - 4, paddingVertical: ESPACO.sm + 2 },
  horario: { width: 44 },
  hora: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
  duracao: { fontFamily: FONTES.corpo, fontSize: 12, lineHeight: 16 },
  barra: { width: 3, borderRadius: 2 },
  corpo: { flex: 1, minWidth: 0, gap: 2 },
  nomeReuniao: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  comissao: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  etiqueta: { marginTop: ESPACO.xs },
  respostas: { flexDirection: 'row', gap: ESPACO.sm, paddingLeft: 71, paddingBottom: ESPACO.sm + 2 },
  areaHoje: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: ESPACO.lg + 8,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  pilulaHoje: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: ESPACO.md - 4,
    paddingRight: ESPACO.md,
    borderRadius: 20,
  },
  textoHoje: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
});
