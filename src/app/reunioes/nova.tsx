import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm } from 'react-hook-form';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { Calendario } from '@/components/Calendario';
import { CampoSelecao, CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { EstadoVazio } from '@/components/EstadoVazio';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FolhaInferior } from '@/components/FolhaInferior';
import { Opcao } from '@/components/Opcao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import { api, type Comissao, type PessoaComissao, type Reuniao } from '@/services/api';
import { comHora, formatarData, inicioDoDia, jaPassou, lerChaveDia, plural } from '@/utils/reunioes';
import {
  mascararHora,
  minutosDaHora,
  validarHora,
  validarLocal,
  validarTermino,
  validarTituloReuniao,
} from '@/utils/validacao';

const MAXIMO_ITENS_PAUTA = 30;

type DadosReuniao = { titulo: string; inicio: string; fim: string; local: string };

export default function TelaNovaReuniao() {
  const router = useRouter();
  const { cores } = useTema().tema;
  const { usuario } = useSessao();
  const { comissao_id: comissaoInicial, data } = useLocalSearchParams<{ comissao_id?: string; data?: string }>();
  const [hoje] = useState(() => inicioDoDia(new Date()));
  const [dia, definirDia] = useState(() => {
    const lido = lerChaveDia(data);
    return lido && lido >= hoje ? lido : hoje;
  });
  const [comissoes, definirComissoes] = useState<Comissao[]>([]);
  const [comissaoId, definirComissaoId] = useState('');
  const [pauta, definirPauta] = useState<string[]>([]);
  const [novoItem, definirNovoItem] = useState('');
  const [folha, definirFolha] = useState<'data' | 'convidados' | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState('');
  const { control, handleSubmit, setError, trigger, formState } = useForm<DadosReuniao>({
    defaultValues: { titulo: '', inicio: '', fim: '', local: '' },
  });
  const salvando = formState.isSubmitting;
  const meuId = usuario?._id;

  useEffect(() => {
    let ativa = true;

    void api<Comissao[]>('/comissoes').then((resultado) => {
      if (!ativa) return;
      definirCarregando(false);
      if (!resultado.ok) {
        definirErro(resultado.erro);
        return;
      }
      const minhas = resultado.dados.filter(
        (comissao) =>
          comissao.ativo &&
          comissao.membros.some(
            (membro) => membro.usuario_id?._id === meuId && membro.papel === 'RESPONSAVEL',
          ),
      );
      definirComissoes(minhas);
      definirComissaoId(
        minhas.find((comissao) => comissao._id === comissaoInicial)?._id ?? minhas[0]?._id ?? '',
      );
    });

    return () => {
      ativa = false;
    };
  }, [comissaoInicial, meuId]);

  const comissao = comissoes.find((item) => item._id === comissaoId);
  const convidados = (comissao?.membros ?? [])
    .map((membro) => membro.usuario_id)
    .filter((pessoa): pessoa is PessoaComissao => Boolean(pessoa));

  function adicionarItem() {
    const texto = novoItem.trim();
    if (!texto || pauta.length >= MAXIMO_ITENS_PAUTA) return;
    definirPauta([...pauta, texto]);
    definirNovoItem('');
  }

  const salvar = handleSubmit(async (dados) => {
    definirErro('');
    const inicio = comHora(dia, minutosDaHora(dados.inicio) ?? 0);
    const fim = comHora(dia, minutosDaHora(dados.fim) ?? 0);
    if (jaPassou(fim)) {
      setError('fim', { message: 'Este horário já passou.' });
      return;
    }
    const itens = novoItem.trim() ? [...pauta, novoItem.trim()] : pauta;

    const resultado = await api<Reuniao>('/reunioes', 'POST', {
      comissao_id: comissaoId,
      titulo: dados.titulo.trim(),
      local: dados.local.trim(),
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      pauta: itens.slice(0, MAXIMO_ITENS_PAUTA),
    });

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    router.replace({ pathname: '/reunioes/[id]', params: { id: resultado.dados._id } });
  });

  return (
    <TelaComCabecalho
      titulo="Nova reunião"
      subtitulo={comissao?.nome}
      iconeVoltar="close"
      cabecalhoSuperficie
      divisor
      rodape={
        comissao ? (
          <Botao
            titulo="Agendar reunião"
            tituloCarregando="Agendando..."
            pilula
            carregando={salvando}
            aoTocar={() => void salvar()}
          />
        ) : undefined
      }
    >
      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {carregando ? <Carregando rotulo="Carregando comissões" /> : null}

      {!carregando && comissoes.length === 0 && !erro ? (
        <EstadoVazio
          icone="people-outline"
          mensagem="Você não é responsável por nenhuma comissão ativa."
        />
      ) : null}

      {!carregando && comissao ? (
        <>
          {comissoes.length > 1 ? (
            <View>
              <Text style={[styles.rotulo, { color: cores.texto }]}>Comissão</Text>
              <View style={styles.opcoes}>
                {comissoes.map((item) => (
                  <Opcao
                    key={item._id}
                    titulo={item.nome}
                    selecionado={item._id === comissaoId}
                    desabilitado={salvando}
                    aoTocar={() => definirComissaoId(item._id)}
                    style={styles.opcao}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <CampoTextoControlado
            controle={control}
            nome="titulo"
            validar={validarTituloReuniao}
            rotulo="Título"
            maxLength={120}
            editable={!salvando}
            compacto
          />

          <CampoSelecao
            rotulo="Data"
            valor={formatarData(dia)}
            icone="calendar-outline"
            desabilitado={salvando}
            aoTocar={() => definirFolha('data')}
            compacto
          />

          <View style={styles.horarios}>
            <View style={styles.horario}>
              <CampoTextoControlado
                controle={control}
                nome="inicio"
                validar={validarHora}
                formatar={mascararHora}
                onBlur={() => {
                  if (formState.touchedFields.fim) void trigger('fim');
                }}
                rotulo="Início"
                icone="time-outline"
                placeholder="00:00"
                keyboardType="number-pad"
                maxLength={5}
                editable={!salvando}
                compacto
              />
            </View>
            <View style={styles.horario}>
              <CampoTextoControlado
                controle={control}
                nome="fim"
                validar={(valor, valores) => validarTermino(valores.inicio, valor)}
                formatar={mascararHora}
                rotulo="Término"
                icone="time-outline"
                placeholder="00:00"
                keyboardType="number-pad"
                maxLength={5}
                editable={!salvando}
                compacto
              />
            </View>
          </View>

          <CampoTextoControlado
            controle={control}
            nome="local"
            validar={validarLocal}
            rotulo="Local"
            icone="location-outline"
            maxLength={120}
            editable={!salvando}
            compacto
          />

          <View>
            <View style={styles.cabecalhoPauta}>
              <Text style={[styles.rotulo, { color: cores.texto }]}>Pauta</Text>
              <Text style={[styles.contagem, { color: cores.textoSutil }]}>
                {plural(pauta.length, 'item', 'itens')}
              </Text>
            </View>
            <View
              style={[styles.pauta, { borderColor: cores.campoBorda, backgroundColor: cores.campoFundo }]}
            >
              {pauta.map((item, indice) => (
                <View
                  key={`${indice}-${item}`}
                  style={[styles.itemPauta, { borderBottomColor: cores.bordaSuave }]}
                >
                  <View style={[styles.numero, { backgroundColor: cores.primariaSuave }]}>
                    <Text style={[styles.textoNumero, { color: cores.primaria }]}>{indice + 1}</Text>
                  </View>
                  <Text style={[styles.textoItem, { color: cores.texto }]}>{item}</Text>
                  <Pressable
                    onPress={() => definirPauta(pauta.filter((_, posicao) => posicao !== indice))}
                    disabled={salvando}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${item}`}
                    hitSlop={4}
                    style={styles.botaoItem}
                  >
                    <Ionicons name="close" size={18} color={cores.textoSutil} />
                  </Pressable>
                </View>
              ))}
              {pauta.length < MAXIMO_ITENS_PAUTA ? (
                <View style={styles.itemNovo}>
                  <View style={[styles.numero, styles.numeroNovo, { borderColor: cores.borda }]}>
                    <Text style={[styles.textoNumero, { color: cores.textoSutil }]}>
                      {pauta.length + 1}
                    </Text>
                  </View>
                  <TextInput
                    value={novoItem}
                    onChangeText={definirNovoItem}
                    onSubmitEditing={adicionarItem}
                    submitBehavior="submit"
                    returnKeyType="done"
                    placeholder="Adicionar item"
                    placeholderTextColor={cores.placeholder}
                    accessibilityLabel="Novo item da pauta"
                    maxLength={200}
                    editable={!salvando}
                    style={[styles.entradaItem, { color: cores.texto }]}
                  />
                  <Pressable
                    onPress={adicionarItem}
                    disabled={salvando}
                    accessibilityRole="button"
                    accessibilityLabel="Adicionar item"
                    hitSlop={4}
                    style={styles.botaoItem}
                  >
                    <Ionicons name="add" size={22} color={cores.primaria} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>

          <View>
            <Text style={[styles.rotulo, { color: cores.texto }]}>Convidados</Text>
            <Pressable
              onPress={() => definirFolha('convidados')}
              accessibilityRole="button"
              accessibilityLabel={`Convidados: membros da comissão, ${plural(convidados.length, 'pessoa', 'pessoas')}`}
              style={({ pressed }) => [
                styles.convidados,
                {
                  borderColor: cores.campoBorda,
                  backgroundColor: cores.campoFundo,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.textosConvidados}>
                <Text style={[styles.textoItem, { color: cores.texto }]}>Membros da comissão</Text>
                <Text style={[styles.contagem, { color: cores.textoSuave }]}>
                  {plural(convidados.length, 'pessoa', 'pessoas')}
                </Text>
              </View>
              <View style={styles.pilha}>
                {convidados.slice(0, 3).map((pessoa) => (
                  <Avatar
                    key={pessoa._id}
                    nome={pessoa.nome}
                    tamanho={28}
                    colorido
                    style={[styles.avatarPilha, { borderColor: cores.campoFundo }]}
                  />
                ))}
                {convidados.length > 3 ? (
                  <View
                    style={[
                      styles.avatarPilha,
                      styles.restante,
                      { borderColor: cores.campoFundo, backgroundColor: cores.superficieSuave },
                    ]}
                  >
                    <Text style={[styles.textoRestante, { color: cores.textoSuave }]}>
                      +{convidados.length - 3}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={cores.textoSutil} />
            </Pressable>
          </View>
        </>
      ) : null}

      <FolhaInferior visivel={folha === 'data'} titulo="Data" aoFechar={() => definirFolha(null)}>
        <View style={styles.folhaCalendario}>
          <Calendario
            selecionado={dia}
            hoje={hoje}
            minimo={hoje}
            aoEscolher={(escolhido) => {
              definirDia(escolhido);
              definirFolha(null);
            }}
          />
        </View>
      </FolhaInferior>

      <FolhaInferior
        visivel={folha === 'convidados'}
        titulo="Convidados"
        aoFechar={() => definirFolha(null)}
      >
        {convidados.map((pessoa) => (
          <View key={pessoa._id} style={[styles.pessoa, { borderTopColor: cores.bordaSuave }]}>
            <Avatar nome={pessoa.nome} colorido />
            <View style={styles.textosConvidados}>
              <Text style={[styles.textoItem, { color: cores.texto }]}>
                {pessoa.nome}
                {pessoa._id === meuId ? ' (você)' : ''}
              </Text>
              <Text style={[styles.contagem, { color: cores.textoSuave }]}>{pessoa.email}</Text>
            </View>
          </View>
        ))}
      </FolhaInferior>
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  rotulo: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  opcao: { maxWidth: '100%' },
  horarios: { flexDirection: 'row', gap: ESPACO.md - 4 },
  horario: { flex: 1, minWidth: 0 },
  cabecalhoPauta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  contagem: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  pauta: { borderWidth: 1.5, borderRadius: RAIO.md, overflow: 'hidden' },
  itemPauta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    minHeight: 48,
    paddingLeft: ESPACO.md - 2,
    paddingRight: ESPACO.xs,
    borderBottomWidth: 1,
  },
  itemNovo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    minHeight: 48,
    paddingLeft: ESPACO.md - 2,
    paddingRight: ESPACO.xs,
  },
  numero: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  numeroNovo: { borderWidth: 1.5, borderStyle: 'dashed' },
  textoNumero: { fontFamily: FONTES.titulo, fontSize: 12, lineHeight: 16 },
  textoItem: { flex: 1, fontFamily: FONTES.corpo, fontSize: 15, lineHeight: 22 },
  entradaItem: {
    flex: 1,
    minWidth: 0,
    height: 48,
    paddingHorizontal: 0,
    fontFamily: FONTES.corpo,
    fontSize: 15,
    outlineWidth: 0,
  },
  botaoItem: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  convidados: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    paddingLeft: ESPACO.md - 2,
    paddingRight: ESPACO.md - 4,
    borderWidth: 1.5,
    borderRadius: RAIO.md,
  },
  textosConvidados: { flex: 1, minWidth: 0 },
  pilha: { flexDirection: 'row', paddingLeft: 6 },
  avatarPilha: { marginLeft: -6, borderWidth: 2 },
  restante: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  textoRestante: { fontFamily: FONTES.titulo, fontSize: 10, lineHeight: 12 },
  folhaCalendario: { paddingHorizontal: ESPACO.sm },
  pessoa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    paddingHorizontal: ESPACO.md,
    paddingVertical: ESPACO.sm + 2,
    borderTopWidth: 1,
  },
});
