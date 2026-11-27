import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Confirmacao } from '@/components/Confirmacao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FolhaInferior } from '@/components/FolhaInferior';
import { ESPACO, FONTES, RAIO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api, type EscolhaVoto, type Reuniao, type Resultado, type Votacao } from '@/services/api';
import { formatarHora, plural } from '@/utils/reunioes';

type Modo = Votacao['modo'];

const MODOS: { valor: Modo; titulo: string; descricao: string; icone: 'lock-closed-outline' | 'eye-outline' }[] = [
  {
    valor: 'FECHADA',
    titulo: 'Fechada',
    descricao: 'Ninguém vê quem votou em quê.',
    icone: 'lock-closed-outline',
  },
  {
    valor: 'ABERTA',
    titulo: 'Aberta',
    descricao: 'Todos veem quem votou em quê quando a votação é encerrada.',
    icone: 'eye-outline',
  },
];

const VOTOS_ESPECIAIS: { valor: 'BRANCO' | 'NULO'; titulo: string }[] = [
  { valor: 'BRANCO', titulo: 'Votar em branco' },
  { valor: 'NULO', titulo: 'Votar nulo' },
];

function descreverVoto(votacao: Votacao, voto: EscolhaVoto) {
  if (voto === 'BRANCO') return 'em branco';
  if (voto === 'NULO') return 'nulo';
  return `em "${votacao.opcoes[voto]}"`;
}

type Executar = (chave: string, acao: () => Promise<Resultado<Reuniao>>, mensagem?: string) => Promise<boolean>;

type Props = {
  reuniao: Reuniao;
  presidente: boolean;
  emAndamento: boolean;
  motivoSemVoto: string | null;
  salvando: string | null;
  executar: Executar;
};

type Pendente = { mensagem: string; rotulo: string; perigo?: boolean; acao: () => Promise<unknown> };

const OPCOES_PADRAO = ['Sim', 'Não', 'Abstenção'];

export function VotacoesReuniao({ reuniao, presidente, emAndamento, motivoSemVoto, salvando, executar }: Props) {
  const { cores } = useTema().tema;
  const [formulario, definirFormulario] = useState(false);
  const [titulo, definirTitulo] = useState('');
  const [descricao, definirDescricao] = useState('');
  const [opcoes, definirOpcoes] = useState<string[]>(OPCOES_PADRAO);
  const [modo, definirModo] = useState<Modo>('FECHADA');
  const [erroFormulario, definirErroFormulario] = useState('');
  const [confirmacao, definirConfirmacao] = useState<Pendente | null>(null);

  const caminho = `/reunioes/${reuniao._id}/votacoes`;
  const votacoes = [...(reuniao.votacoes ?? [])].sort(
    (a, b) =>
      Number(b.situacao === 'ABERTA') - Number(a.situacao === 'ABERTA') ||
      new Date(b.aberta_em).getTime() - new Date(a.aberta_em).getTime(),
  );

  function abrirFormulario() {
    definirTitulo('');
    definirDescricao('');
    definirOpcoes(OPCOES_PADRAO);
    definirModo('FECHADA');
    definirErroFormulario('');
    definirFormulario(true);
  }

  function validar() {
    const limpas = opcoes.map((opcao) => opcao.trim());
    if (titulo.trim().length < 3) return 'Informe um assunto com pelo menos 3 caracteres';
    if (limpas.some((opcao) => !opcao)) return 'Preencha todas as opções de voto';
    if (limpas.length < 2) return 'Informe pelo menos 2 opções de voto';
    if (new Set(limpas.map((opcao) => opcao.toLowerCase())).size !== limpas.length) {
      return 'Não repita opções de voto';
    }
    return '';
  }

  async function enviar() {
    const problema = validar();
    if (problema) {
      definirErroFormulario(problema);
      return;
    }
    const corpo = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      opcoes: opcoes.map((opcao) => opcao.trim()),
      modo,
    };
    const certo = await executar('abrir-votacao', () => api<Reuniao>(caminho, 'POST', corpo), 'Votação iniciada.');
    if (certo) definirFormulario(false);
  }

  function pedirVoto(votacao: Votacao, voto: EscolhaVoto) {
    const corpo = typeof voto === 'number' ? { opcao: voto } : { tipo: voto };
    definirConfirmacao({
      mensagem: `Votar ${descreverVoto(votacao, voto)}? O voto não pode ser alterado depois.`,
      rotulo: 'Votar',
      acao: async () => {
        await executar(
          `votar-${votacao._id}`,
          () => api<Reuniao>(`${caminho}/${votacao._id}/votos`, 'POST', corpo),
          'Voto registrado.',
        );
        definirConfirmacao(null);
      },
    });
  }

  function pedirEncerramento(votacao: Votacao) {
    definirConfirmacao({
      mensagem: `Encerrar a votação "${votacao.titulo}"? Ninguém mais poderá votar.`,
      rotulo: 'Encerrar',
      perigo: true,
      acao: async () => {
        await executar(
          `encerrar-${votacao._id}`,
          () => api<Reuniao>(`${caminho}/${votacao._id}/encerrar`, 'POST'),
          'Votação encerrada.',
        );
        definirConfirmacao(null);
      },
    });
  }

  function renderizarResultado(votacao: Votacao) {
    const resultado = votacao.resultado ?? [];
    const maior = Math.max(0, ...resultado);
    const linhas: { chave: EscolhaVoto; rotulo: string; quantidade: number; podeVencer: boolean }[] = [
      ...votacao.opcoes.map((opcao, indice) => ({
        chave: indice,
        rotulo: opcao,
        quantidade: resultado[indice] ?? 0,
        podeVencer: true,
      })),
      { chave: 'BRANCO', rotulo: 'Branco', quantidade: votacao.brancos ?? 0, podeVencer: false },
      { chave: 'NULO', rotulo: 'Nulo', quantidade: votacao.nulos ?? 0, podeVencer: false },
    ];
    return (
      <View style={styles.resultados}>
        {linhas.map(({ chave, rotulo, quantidade, podeVencer }) => {
          const percentual = votacao.total_votos ? Math.round((quantidade / votacao.total_votos) * 100) : 0;
          const vencedora = podeVencer && maior > 0 && quantidade === maior;
          return (
            <View key={`${votacao._id}-${chave}`} style={styles.resultado}>
              <View style={styles.linhaResultado}>
                <Text
                  style={[
                    styles.opcaoResultado,
                    {
                      color: podeVencer ? cores.texto : cores.textoSuave,
                      fontFamily: vencedora ? FONTES.titulo : FONTES.corpoMedio,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {rotulo}
                  {votacao.meu_voto === chave ? ' · seu voto' : ''}
                </Text>
                <Text style={[styles.numero, { color: vencedora ? cores.primaria : cores.textoSuave }]}>
                  {quantidade} · {percentual}%
                </Text>
              </View>
              <View style={[styles.trilha, { backgroundColor: cores.superficieSuave }]}>
                <View
                  style={[
                    styles.barra,
                    {
                      width: `${percentual}%`,
                      backgroundColor: vencedora ? cores.primaria : cores.textoSutil,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
        {votacao.votos_nominais?.length ? (
          <View style={[styles.nominais, { borderTopColor: cores.bordaSuave }]}>
            <Text style={[styles.rotulo, { color: cores.texto }]}>Quem votou em quê</Text>
            {votacao.votos_nominais.map((voto) => (
              <View key={`${votacao._id}-${voto.usuario_id}`} style={styles.linhaNominal}>
                <Text style={[styles.nomeNominal, { color: cores.texto }]} numberOfLines={1}>
                  {voto.nome}
                </Text>
                <Text style={[styles.votoNominal, { color: cores.textoSuave }]} numberOfLines={2}>
                  {typeof voto.voto === 'number'
                    ? votacao.opcoes[voto.voto]
                    : voto.voto === 'BRANCO'
                      ? 'Branco'
                      : 'Nulo'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  function renderizarAberta(votacao: Votacao) {
    if (votacao.meu_voto !== null) {
      return (
        <View style={[styles.aviso, { backgroundColor: cores.sucessoSuave }]}>
          <Ionicons name="checkmark-circle" size={18} color={cores.sucesso} />
          <Text style={[styles.textoAviso, { color: cores.sucesso }]}>
            {`Você votou ${descreverVoto(votacao, votacao.meu_voto)}`}
          </Text>
        </View>
      );
    }
    if (motivoSemVoto) {
      return (
        <View style={[styles.aviso, { backgroundColor: cores.alertaSuave }]}>
          <Ionicons name="information-circle-outline" size={18} color={cores.alerta} />
          <Text style={[styles.textoAviso, { color: cores.alerta }]}>{motivoSemVoto}</Text>
        </View>
      );
    }
    return (
      <View style={styles.escolhas}>
        {votacao.opcoes.map((opcao, indice) => (
          <Pressable
            key={`${votacao._id}-${indice}`}
            onPress={() => pedirVoto(votacao, indice)}
            disabled={salvando !== null}
            accessibilityRole="button"
            accessibilityLabel={`Votar em ${opcao}`}
            style={({ pressed }) => [
              styles.escolha,
              {
                borderColor: cores.borda,
                backgroundColor: pressed ? cores.primariaSuave : cores.superficie,
                opacity: salvando ? 0.6 : 1,
              },
            ]}
          >
            <View style={[styles.radio, { borderColor: cores.textoSutil }]} />
            <Text style={[styles.textoEscolha, { color: cores.texto }]}>{opcao}</Text>
          </Pressable>
        ))}
        <View style={styles.especiais}>
          {VOTOS_ESPECIAIS.map((especial) => (
            <Pressable
              key={`${votacao._id}-${especial.valor}`}
              onPress={() => pedirVoto(votacao, especial.valor)}
              disabled={salvando !== null}
              accessibilityRole="button"
              accessibilityLabel={especial.titulo}
              style={({ pressed }) => [
                styles.especial,
                {
                  borderColor: cores.bordaSuave,
                  backgroundColor: pressed ? cores.superficieSuave : cores.superficie,
                  opacity: salvando ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.textoEspecial, { color: cores.textoSuave }]}>{especial.titulo}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <>
      {presidente && emAndamento ? (
        <Botao titulo="Abrir votação" icone="add" pilula desabilitado={salvando !== null} aoTocar={abrirFormulario} />
      ) : null}

      {votacoes.length === 0 ? (
        <EstadoVazio
          icone="hand-left-outline"
          mensagem={
            presidente && emAndamento
              ? 'Nenhuma votação ainda. Abra uma para os participantes votarem.'
              : 'Nenhuma votação nesta reunião.'
          }
        />
      ) : (
        votacoes.map((votacao) => {
          const aberta = votacao.situacao === 'ABERTA';
          return (
            <View
              key={votacao._id}
              style={[styles.cartao, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}
            >
              <View style={styles.cabecalho}>
                <Text style={[styles.titulo, { color: cores.texto }]}>{votacao.titulo}</Text>
                <Etiqueta texto={aberta ? 'Em andamento' : 'Encerrada'} tom={aberta ? 'primaria' : 'neutro'} />
              </View>
              {votacao.descricao ? (
                <Text style={[styles.descricao, { color: cores.textoSuave }]}>{votacao.descricao}</Text>
              ) : null}
              <Text style={[styles.detalhe, { color: cores.textoSutil }]}>
                {plural(votacao.total_votos, 'voto', 'votos')} · iniciada às {formatarHora(votacao.aberta_em)}
                {votacao.encerrada_em ? ` · encerrada às ${formatarHora(votacao.encerrada_em)}` : ''}
              </Text>
              <View style={styles.linhaModo}>
                <Ionicons
                  name={votacao.modo === 'ABERTA' ? 'eye-outline' : 'lock-closed-outline'}
                  size={14}
                  color={cores.textoSuave}
                />
                <Text style={[styles.detalhe, styles.textoModo, { color: cores.textoSuave }]}>
                  {votacao.modo === 'ABERTA'
                    ? 'Votação aberta: todos veem quem votou em quê ao encerrar.'
                    : 'Votação fechada: ninguém vê quem votou em quê.'}
                </Text>
              </View>

              {aberta ? renderizarAberta(votacao) : renderizarResultado(votacao)}

              {aberta && presidente ? (
                <Botao
                  titulo="Encerrar votação"
                  icone="stop-circle-outline"
                  variante="secundario"
                  pilula
                  compacto
                  desabilitado={salvando !== null}
                  carregando={salvando === `encerrar-${votacao._id}`}
                  aoTocar={() => pedirEncerramento(votacao)}
                />
              ) : null}
            </View>
          );
        })
      )}

      <FolhaInferior
        visivel={formulario}
        titulo="Nova votação"
        acompanharTeclado
        aoFechar={() => {
          if (salvando !== 'abrir-votacao') definirFormulario(false);
        }}
      >
        <View style={styles.formulario}>
          {erroFormulario ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erroFormulario }} /> : null}
          <CampoTexto
            rotulo="Assunto"
            placeholder="Ex.: Aprovar o orçamento do evento"
            value={titulo}
            onChangeText={definirTitulo}
            maxLength={200}
            compacto
          />
          <CampoTexto
            rotulo="Descrição (opcional)"
            value={descricao}
            onChangeText={definirDescricao}
            maxLength={1000}
            multiline
            compacto
          />
          <Text style={[styles.rotulo, { color: cores.texto }]}>Opções de voto</Text>
          {opcoes.map((opcao, indice) => (
            <View key={indice} style={styles.linhaOpcao}>
              <View style={styles.campoOpcao}>
                <CampoTexto
                  rotulo={`Opção ${indice + 1}`}
                  value={opcao}
                  onChangeText={(texto) =>
                    definirOpcoes((atuais) => atuais.map((item, posicao) => (posicao === indice ? texto : item)))
                  }
                  maxLength={80}
                  compacto
                />
              </View>
              {opcoes.length > 2 ? (
                <Pressable
                  onPress={() => definirOpcoes((atuais) => atuais.filter((_, posicao) => posicao !== indice))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover opção ${indice + 1}`}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.remover,
                    { backgroundColor: cores.superficieSuave, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons name="trash-outline" size={18} color={cores.erro} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {opcoes.length < 10 ? (
            <Botao
              titulo="Adicionar opção"
              icone="add"
              variante="secundario"
              pilula
              compacto
              aoTocar={() => definirOpcoes((atuais) => [...atuais, ''])}
            />
          ) : null}
          <Text style={[styles.dica, { color: cores.textoSuave }]}>
            Os participantes também podem votar em branco ou nulo.
          </Text>
          <Text style={[styles.rotulo, { color: cores.texto }]}>Tipo de votação</Text>
          {MODOS.map((item) => {
            const selecionado = modo === item.valor;
            return (
              <Pressable
                key={item.valor}
                onPress={() => definirModo(item.valor)}
                accessibilityRole="radio"
                accessibilityState={{ selected: selecionado }}
                accessibilityLabel={`${item.titulo}. ${item.descricao}`}
                style={({ pressed }) => [
                  styles.escolha,
                  styles.escolhaModo,
                  {
                    borderColor: selecionado ? cores.primaria : cores.borda,
                    backgroundColor: selecionado || pressed ? cores.primariaSuave : cores.superficie,
                  },
                ]}
              >
                <View style={[styles.radio, { borderColor: selecionado ? cores.primaria : cores.textoSutil }]}>
                  {selecionado ? <View style={[styles.radioMarcado, { backgroundColor: cores.primaria }]} /> : null}
                </View>
                <View style={styles.textosModo}>
                  <View style={styles.linhaModo}>
                    <Ionicons name={item.icone} size={16} color={cores.texto} />
                    <Text style={[styles.textoEscolha, { color: cores.texto }]}>{item.titulo}</Text>
                  </View>
                  <Text style={[styles.descricao, { color: cores.textoSuave }]}>{item.descricao}</Text>
                </View>
              </Pressable>
            );
          })}
          <Botao
            titulo="Abrir votação"
            pilula
            carregando={salvando === 'abrir-votacao'}
            desabilitado={salvando !== null}
            aoTocar={() => void enviar()}
          />
        </View>
      </FolhaInferior>

      <Confirmacao
        mensagem={confirmacao?.mensagem}
        rotuloConfirmar={confirmacao?.rotulo}
        perigo={confirmacao?.perigo}
        carregando={salvando !== null}
        cancelar={() => definirConfirmacao(null)}
        confirmar={() => {
          if (confirmacao) void confirmacao.acao();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: ESPACO.sm + 2, padding: ESPACO.md - 2, borderWidth: 1, borderRadius: RAIO.lg },
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: ESPACO.sm },
  titulo: { flex: 1, fontFamily: FONTES.titulo, fontSize: 16, lineHeight: 22 },
  descricao: { fontFamily: FONTES.corpo, fontSize: 14, lineHeight: 20 },
  detalhe: { fontFamily: FONTES.corpo, fontSize: 12, lineHeight: 16 },
  escolhas: { gap: ESPACO.sm },
  escolha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm + 2,
    minHeight: 48,
    paddingHorizontal: ESPACO.md - 2,
    borderWidth: 1,
    borderRadius: RAIO.md,
  },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioMarcado: { width: 8, height: 8, borderRadius: 4 },
  textoEscolha: { flex: 1, fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  escolhaModo: { paddingVertical: ESPACO.sm + 2 },
  textosModo: { flex: 1, gap: 2 },
  linhaModo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.xs + 2 },
  textoModo: { flex: 1 },
  especiais: { flexDirection: 'row', gap: ESPACO.sm },
  especial: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ESPACO.sm,
    borderWidth: 1,
    borderRadius: RAIO.md,
  },
  textoEspecial: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  nominais: { gap: ESPACO.xs + 2, paddingTop: ESPACO.sm + 2, borderTopWidth: 1 },
  linhaNominal: { flexDirection: 'row', alignItems: 'flex-start', gap: ESPACO.sm },
  nomeNominal: { flex: 1, fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
  votoNominal: { flexShrink: 1, maxWidth: '50%', fontFamily: FONTES.corpo, fontSize: 14, lineHeight: 20, textAlign: 'right' },
  dica: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    paddingHorizontal: ESPACO.md - 4,
    paddingVertical: ESPACO.sm + 2,
    borderRadius: RAIO.md,
  },
  textoAviso: { flex: 1, fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
  resultados: { gap: ESPACO.sm + 2 },
  resultado: { gap: ESPACO.xs },
  linhaResultado: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  opcaoResultado: { flex: 1, fontSize: 14, lineHeight: 20 },
  numero: { fontFamily: FONTES.corpoMedio, fontSize: 13, lineHeight: 18 },
  trilha: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barra: { height: 8, borderRadius: 4 },
  formulario: { gap: ESPACO.md - 4, paddingHorizontal: ESPACO.md, paddingTop: ESPACO.sm },
  rotulo: { fontFamily: FONTES.titulo, fontSize: 14, lineHeight: 20 },
  linhaOpcao: { flexDirection: 'row', alignItems: 'flex-end', gap: ESPACO.sm },
  campoOpcao: { flex: 1 },
  remover: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});
