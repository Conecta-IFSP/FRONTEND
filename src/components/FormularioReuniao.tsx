import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePreventRemove } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useForm, useWatch } from 'react-hook-form';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { Calendario } from '@/components/Calendario';
import { CampoSelecao, CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Confirmacao } from '@/components/Confirmacao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FolhaInferior } from '@/components/FolhaInferior';
import { ListaAnexos } from '@/components/ListaAnexos';
import { Opcao } from '@/components/Opcao';
import { CampoHoraControlado } from '@/components/SeletorHora';
import { SeletorPessoaComissao } from '@/components/SeletorPessoaComissao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import { escolherArquivos, MAXIMO_ANEXOS, validarArquivos, type ArquivoEscolhido } from '@/services/anexos';
import { api, type Comissao, type PessoaComissao, type Reuniao } from '@/services/api';
import {
  comHora,
  comissoesQueComando,
  fimDoDia,
  formatarData,
  formatarHora,
  inicioDoDia,
  jaPassou,
  plural,
} from '@/utils/reunioes';
import { sugerirHorarios } from '@/utils/sugestoes-horario';
import {
  minutosDaHora,
  validarHora,
  validarLocal,
  validarTermino,
  validarTituloReuniao,
} from '@/utils/validacao';

const TAMANHO_MAXIMO_PAUTA = 2000;

type DadosReuniao = {
  titulo: string;
  diaInteiro: boolean;
  inicio: string;
  fim: string;
  local: string;
  pauta: string;
};

export type EnvioReuniao = {
  comissaoId: string;
  campos: {
    titulo: string;
    local: string;
    pauta: string;
    convidados_ids: string[];
    inicio?: string;
    fim?: string;
    dia_inteiro?: boolean;
  };
  anexos: ArquivoEscolhido[];
};

type FormularioReuniaoProps = {
  /** Reunião existente: o formulário abre em modo de edição. */
  reuniao?: Reuniao;
  comissaoInicial?: string;
  dataInicial?: Date | null;
  /** Devolve a mensagem de erro, ou `null` quando salvou. */
  aoSalvar: (envio: EnvioReuniao) => Promise<string | null>;
  /** Chamado depois de salvar na edição, quando a saída da tela já está liberada. */
  aoConcluir?: () => void;
};

function valoresIniciais(reuniao?: Reuniao): DadosReuniao {
  if (!reuniao) return { titulo: '', diaInteiro: false, inicio: '', fim: '', local: '', pauta: '' };
  const diaInteiro = Boolean(reuniao.dia_inteiro);
  return {
    titulo: reuniao.titulo,
    diaInteiro,
    inicio: diaInteiro ? '' : formatarHora(reuniao.inicio),
    fim: diaInteiro ? '' : formatarHora(reuniao.fim),
    local: reuniao.local ?? '',
    pauta: reuniao.pauta ?? '',
  };
}

function participantesDe(reuniao: Reuniao) {
  return reuniao.participantes
    .map((participante) => participante.usuario_id?._id)
    .filter((id): id is string => Boolean(id))
    .sort();
}

export function FormularioReuniao({
  reuniao,
  comissaoInicial,
  dataInicial,
  aoSalvar,
  aoConcluir,
}: FormularioReuniaoProps) {
  const edicao = Boolean(reuniao);
  const { cores } = useTema().tema;
  const { usuario } = useSessao();
  const [hoje] = useState(() => inicioDoDia(new Date()));
  const [diaOriginal] = useState(() => (reuniao ? inicioDoDia(new Date(reuniao.inicio)) : null));
  const [dia, definirDia] = useState(() => {
    if (diaOriginal) return diaOriginal;
    return dataInicial && dataInicial >= hoje ? dataInicial : hoje;
  });
  // Com a reunião em andamento, a lista de presença depende da data e do horário atuais.
  const [horarioTravado] = useState(() => Boolean(reuniao && new Date(reuniao.inicio).getTime() <= Date.now()));
  const comissaoDaReuniao = reuniao?.comissao_id?._id;
  const [comissoes, definirComissoes] = useState<Comissao[]>([]);
  const [comissaoId, definirComissaoId] = useState('');
  const [selecoes, definirSelecoes] = useState<Record<string, string[]>>(() =>
    reuniao && comissaoDaReuniao ? { [comissaoDaReuniao]: participantesDe(reuniao) } : {},
  );
  const [folha, definirFolha] = useState<'data' | 'convidados' | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState('');
  const [anexos, definirAnexos] = useState<(ArquivoEscolhido & { chave: string })[]>([]);
  const [salvo, definirSalvo] = useState(false);
  const [saidaPendente, definirSaidaPendente] = useState<(() => void) | null>(null);
  const { control, handleSubmit, setError, setValue, clearErrors, trigger, formState } = useForm<DadosReuniao>({
    defaultValues: valoresIniciais(reuniao),
  });
  const pauta = useWatch({ control, name: 'pauta' });
  const diaInteiro = useWatch({ control, name: 'diaInteiro' });
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
      const minhas = comissoesQueComando(resultado.dados, meuId).filter(
        (comissao) => !comissaoDaReuniao || comissao._id === comissaoDaReuniao,
      );
      definirComissoes(minhas);
      definirComissaoId(
        minhas.find((comissao) => comissao._id === comissaoInicial)?._id ?? minhas[0]?._id ?? '',
      );
    });

    return () => {
      ativa = false;
    };
  }, [comissaoInicial, comissaoDaReuniao, meuId]);

  const comissao = comissoes.find((item) => item._id === comissaoId);
  const pessoas = (comissao?.membros ?? [])
    .map((membro) => membro.usuario_id)
    .filter((pessoa): pessoa is PessoaComissao => Boolean(pessoa));
  const escolhidos = selecoes[comissaoId] ?? pessoas.map((pessoa) => pessoa._id);
  const convidados = pessoas.filter((pessoa) => pessoa._id === meuId || escolhidos.includes(pessoa._id));
  // Hora em que o seletor abre quando o campo ainda está vazio.
  function padraoInicio() {
    return sugerirHorarios(dia, new Date())[0] ?? '08:00';
  }

  function padraoFim() {
    const opcoes = sugerirHorarios(dia, new Date(), minutosDaHora(horaInicio) ?? undefined);
    return opcoes[1] ?? opcoes[0] ?? '23:30';
  }

  function calcularHorario(dados: Pick<DadosReuniao, 'diaInteiro' | 'inicio' | 'fim'>) {
    if (dados.diaInteiro) return { inicio: inicioDoDia(dia), fim: fimDoDia(dia) };
    const minutosInicio = minutosDaHora(dados.inicio);
    const minutosFim = minutosDaHora(dados.fim);
    if (minutosInicio === null || minutosFim === null) return null;
    return { inicio: comHora(dia, minutosInicio), fim: comHora(dia, minutosFim) };
  }

  const horarioAtual = calcularHorario({ diaInteiro, inicio: horaInicio, fim: horaFim });
  const mudouHorario = Boolean(
    reuniao &&
      !horarioTravado &&
      horarioAtual &&
      (horarioAtual.inicio.getTime() !== new Date(reuniao.inicio).getTime() ||
        horarioAtual.fim.getTime() !== new Date(reuniao.fim).getTime() ||
        diaInteiro !== Boolean(reuniao.dia_inteiro)),
  );
  const mudouConvidados = Boolean(
    reuniao && comissao && convidados.map((pessoa) => pessoa._id).sort().join() !== participantesDe(reuniao).join(),
  );
  const mudouDia = Boolean(diaOriginal && dia.getTime() !== diaOriginal.getTime());
  const alterado = edicao && !salvo && (formState.isDirty || mudouDia || mudouConvidados);

  const liberarSaida = usePreventRemove(alterado, ({ repeat }) => definirSaidaPendente(() => repeat));

  function alternarConvidado(pessoaId: string) {
    definirSelecoes((anteriores) => ({
      ...anteriores,
      [comissaoId]: escolhidos.includes(pessoaId)
        ? escolhidos.filter((item) => item !== pessoaId)
        : [...escolhidos, pessoaId],
    }));
  }

  function alternarDiaInteiro() {
    const ligado = !diaInteiro;
    setValue('diaInteiro', ligado, { shouldDirty: true });
    if (ligado) {
      setValue('inicio', '', { shouldDirty: true });
      setValue('fim', '', { shouldDirty: true });
      clearErrors(['inicio', 'fim']);
    }
  }

  async function adicionarAnexos() {
    const novos = await escolherArquivos();
    if (novos.length === 0) return;
    const problema = validarArquivos(novos, anexos.length);
    if (problema) {
      definirErro(problema);
      return;
    }
    definirErro('');
    definirAnexos((atuais) => [
      ...atuais,
      ...novos.map((arquivo, indice) => ({ ...arquivo, chave: `${Date.now()}-${indice}` })),
    ]);
  }

  const salvar = handleSubmit(async (dados) => {
    definirErro('');
    const horario = horarioTravado ? null : calcularHorario(dados);
    if (horario && jaPassou(horario.fim)) {
      setError('fim', { message: 'Este horário já passou.' });
      return;
    }
    const problema = await aoSalvar({
      comissaoId,
      campos: {
        titulo: dados.titulo.trim(),
        local: dados.local.trim(),
        pauta: dados.pauta.trim(),
        convidados_ids: convidados.map((pessoa) => pessoa._id),
        ...(horario
          ? { inicio: horario.inicio.toISOString(), fim: horario.fim.toISOString(), dia_inteiro: dados.diaInteiro }
          : {}),
      },
      anexos,
    });
    if (problema) {
      definirErro(problema);
      return;
    }
    if (edicao) {
      definirSalvo(true);
      liberarSaida();
      aoConcluir?.();
    }
  });

  return (
    <TelaComCabecalho
      titulo={edicao ? 'Editar reunião' : 'Nova reunião'}
      subtitulo={comissao?.nome}
      iconeVoltar="close"
      cabecalhoSuperficie
      divisor
      rodape={
        comissao ? (
          <Botao
            titulo={edicao ? 'Salvar alterações' : 'Agendar reunião'}
            tituloCarregando={edicao ? 'Salvando...' : 'Agendando...'}
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
          mensagem={
            edicao
              ? 'Só o responsável pela comissão pode editar esta reunião.'
              : 'Você não é responsável por nenhuma comissão ativa.'
          }
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
            desabilitado={salvando || horarioTravado}
            aoTocar={() => definirFolha('data')}
            compacto
          />

          <Opcao
            titulo="Dia inteiro"
            selecionado={diaInteiro}
            desabilitado={salvando || horarioTravado}
            aoTocar={alternarDiaInteiro}
            style={styles.diaInteiro}
          />

          {diaInteiro ? null : (
          <View style={styles.horarios}>
            <View style={styles.horario}>
              <CampoHoraControlado
                controle={control}
                nome="inicio"
                rotulo="Início"
                horaPadrao={padraoInicio}
                validar={(valor, valores) => (valores.diaInteiro || horarioTravado ? null : validarHora(valor))}
                desabilitado={salvando || horarioTravado}
                aposEscolher={() => {
                  if (horaFim) void trigger('fim');
                }}
              />
            </View>
            <View style={styles.horario}>
              <CampoHoraControlado
                controle={control}
                nome="fim"
                rotulo="Término"
                horaPadrao={padraoFim}
                validar={(valor, valores) =>
                  valores.diaInteiro || horarioTravado ? null : validarTermino(valores.inicio, valor)
                }
                desabilitado={salvando || horarioTravado}
                aposEscolher={() => void trigger('fim')}
              />
            </View>
          </View>
          )}

          {horarioTravado ? (
            <FaixaAviso aviso={{ tom: 'informacao', mensagem: 'A reunião já começou; a data e o horário não mudam.' }} />
          ) : null}
          {mudouHorario ? (
            <FaixaAviso
              aviso={{ tom: 'alerta', mensagem: 'Data ou horário alterado. Os convidados vão precisar confirmar de novo.' }}
            />
          ) : null}

          <CampoTextoControlado
            controle={control}
            nome="local"
            validar={validarLocal}
            rotulo="Local (opcional)"
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

          {/* Na edição, os anexos são gerenciados na aba Pauta dos detalhes. */}
          {edicao ? null : (
            <ListaAnexos
              titulo="Anexos (opcional)"
              itens={anexos.map(({ chave, nome, tipo, tamanho }) => ({ chave, nome, tipo, tamanho }))}
              limite={MAXIMO_ANEXOS}
              desabilitado={salvando}
              aoAdicionar={() => void adicionarAnexos()}
              aoRemover={(item) => definirAnexos((atuais) => atuais.filter((anexo) => anexo.chave !== item.chave))}
            />
          )}
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

      <Confirmacao
        mensagem={saidaPendente ? 'Descartar as alterações? O que você mudou não vai ser salvo.' : undefined}
        rotuloConfirmar="Descartar"
        perigo
        carregando={false}
        cancelar={() => definirSaidaPendente(null)}
        confirmar={() => {
          const sair = saidaPendente;
          definirSaidaPendente(null);
          definirSalvo(true);
          sair?.();
        }}
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  rotulo: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  opcao: { maxWidth: '100%' },
  diaInteiro: { alignSelf: 'flex-start' },
  horarios: { flexDirection: 'row', gap: ESPACO.md - 4 },
  horario: { flex: 1, minWidth: 0 },
  contagem: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  pauta: { minHeight: 180 },
  textoItem: { fontFamily: FONTES.corpo, fontSize: 15, lineHeight: 22 },
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
});
