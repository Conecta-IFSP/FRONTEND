import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useForm, useWatch } from 'react-hook-form';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { Calendario } from '@/components/Calendario';
import { CampoSelecao, CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { EstadoVazio } from '@/components/EstadoVazio';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FolhaInferior } from '@/components/FolhaInferior';
import { Opcao } from '@/components/Opcao';
import { SeletorPessoaComissao } from '@/components/SeletorPessoaComissao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import { api, type Comissao, type PessoaComissao, type Reuniao } from '@/services/api';
import { comHora, formatarData, inicioDoDia, jaPassou, lerChaveDia, plural } from '@/utils/reunioes';
import { sugerirHorarios } from '@/utils/sugestoes-horario';
import {
  mascararHora,
  minutosDaHora,
  validarHora,
  validarLocal,
  validarTermino,
  validarTituloReuniao,
} from '@/utils/validacao';

const TAMANHO_MAXIMO_PAUTA = 2000;

type DadosReuniao = { titulo: string; inicio: string; fim: string; local: string; pauta: string };

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
  const [selecoes, definirSelecoes] = useState<Record<string, string[]>>({});
  const [folha, definirFolha] = useState<'data' | 'convidados' | 'inicio' | 'fim' | null>(null);
  const [agora, definirAgora] = useState(() => new Date());
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState('');
  const { control, handleSubmit, setError, setValue, trigger, formState } = useForm<DadosReuniao>({
    defaultValues: { titulo: '', inicio: '', fim: '', local: '', pauta: '' },
  });
  const pauta = useWatch({ control, name: 'pauta' });
  const horaInicio = useWatch({ control, name: 'inicio' });
  const horaFim = useWatch({ control, name: 'fim' });
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
  const pessoas = (comissao?.membros ?? [])
    .map((membro) => membro.usuario_id)
    .filter((pessoa): pessoa is PessoaComissao => Boolean(pessoa));
  const escolhidos = selecoes[comissaoId] ?? pessoas.map((pessoa) => pessoa._id);
  const convidados = pessoas.filter((pessoa) => pessoa._id === meuId || escolhidos.includes(pessoa._id));
  const campoSugerido = folha === 'inicio' || folha === 'fim' ? folha : null;
  const sugestoes = campoSugerido
    ? sugerirHorarios(dia, agora, campoSugerido === 'fim' ? minutosDaHora(horaInicio) ?? undefined : undefined)
    : [];

  function alternarConvidado(pessoaId: string) {
    definirSelecoes((anteriores) => ({
      ...anteriores,
      [comissaoId]: escolhidos.includes(pessoaId)
        ? escolhidos.filter((item) => item !== pessoaId)
        : [...escolhidos, pessoaId],
    }));
  }

  function abrirSugestoes(campo: 'inicio' | 'fim') {
    definirAgora(new Date());
    definirFolha(campo);
  }

  const salvar = handleSubmit(async (dados) => {
    definirErro('');
    const inicio = comHora(dia, minutosDaHora(dados.inicio) ?? 0);
    const fim = comHora(dia, minutosDaHora(dados.fim) ?? 0);
    if (jaPassou(fim)) {
      setError('fim', { message: 'Este horário já passou.' });
      return;
    }
    const resultado = await api<Reuniao>('/reunioes', 'POST', {
      comissao_id: comissaoId,
      titulo: dados.titulo.trim(),
      local: dados.local.trim(),
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      pauta: dados.pauta.trim(),
      convidados_ids: convidados.map((pessoa) => pessoa._id),
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
            placeholder="Título"
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
                placeholder="Início"
                keyboardType="number-pad"
                maxLength={5}
                editable={!salvando}
                acaoFinal={{
                  icone: 'chevron-down',
                  rotuloAcessivel: 'Sugestões de início',
                  aoTocar: () => abrirSugestoes('inicio'),
                }}
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
                placeholder="Término"
                keyboardType="number-pad"
                maxLength={5}
                editable={!salvando}
                acaoFinal={{
                  icone: 'chevron-down',
                  rotuloAcessivel: 'Sugestões de término',
                  aoTocar: () => abrirSugestoes('fim'),
                }}
                compacto
              />
            </View>
          </View>

          <CampoTextoControlado
            controle={control}
            nome="local"
            validar={validarLocal}
            rotulo="Local"
            placeholder="Local"
            icone="location-outline"
            maxLength={120}
            editable={!salvando}
            compacto
          />

          <View>
            <Text style={[styles.rotulo, { color: cores.texto }]}>Convidados</Text>
            <Pressable
              onPress={() => definirFolha('convidados')}
              disabled={salvando}
              accessibilityRole="button"
              accessibilityLabel={`Convidados, ${plural(convidados.length, 'pessoa', 'pessoas')}`}
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
                <Text style={[styles.textoItem, { color: cores.texto }]}>
                  {convidados.length === pessoas.length ? 'Toda a comissão' : 'Selecionados'}
                </Text>
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

          <CampoTextoControlado
            controle={control}
            nome="pauta"
            rotulo="Pauta (opcional)"
            placeholder="Pauta"
            icone="list-outline"
            dica={`${pauta.trim().length}/${TAMANHO_MAXIMO_PAUTA}`}
            multiline
            maxLength={TAMANHO_MAXIMO_PAUTA}
            editable={!salvando}
            compacto
            style={styles.pauta}
          />
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
        visivel={campoSugerido !== null}
        titulo={campoSugerido === 'fim' ? 'Término' : 'Início'}
        aoFechar={() => definirFolha(null)}
      >
        <View style={styles.sugestoes}>
          {sugestoes.map((hora) => (
            <Opcao
              key={hora}
              titulo={hora}
              selecionado={(campoSugerido === 'fim' ? horaFim : horaInicio) === hora}
              aoTocar={() => {
                if (!campoSugerido) return;
                setValue(campoSugerido, hora, { shouldDirty: true, shouldValidate: true });
                if (campoSugerido === 'inicio' && horaFim) void trigger('fim');
                definirFolha(null);
              }}
              style={styles.hora}
            />
          ))}
          {sugestoes.length === 0 ? (
            <Text style={[styles.contagem, { color: cores.textoSuave }]}>Sem horários neste dia.</Text>
          ) : null}
        </View>
      </FolhaInferior>

      <SeletorPessoaComissao
        visivel={folha === 'convidados'}
        titulo="Convidados"
        multiplo
        pessoas={pessoas}
        selecionados={convidados.map((pessoa) => pessoa._id)}
        fixos={meuId ? [meuId] : []}
        usuarioId={meuId}
        aoAlternar={alternarConvidado}
        aoMarcarTodos={(todos) =>
          definirSelecoes((anteriores) => ({
            ...anteriores,
            [comissaoId]: todos ? pessoas.map((pessoa) => pessoa._id) : [],
          }))
        }
        aoFechar={() => definirFolha(null)}
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  rotulo: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  opcao: { maxWidth: '100%' },
  horarios: { flexDirection: 'row', gap: ESPACO.md - 4 },
  horario: { flex: 1, minWidth: 0 },
  contagem: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  pauta: { minHeight: 180 },
  textoItem: { flex: 1, fontFamily: FONTES.corpo, fontSize: 15, lineHeight: 22 },
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
  sugestoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACO.sm,
    paddingHorizontal: ESPACO.md,
    paddingBottom: ESPACO.sm,
  },
  hora: { minWidth: 76 },
});
