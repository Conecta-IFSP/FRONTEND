import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useForm, useWatch } from 'react-hook-form';

import { Abas } from '@/components/Abas';
import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { CampoTexto, CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Confirmacao } from '@/components/Confirmacao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta, type TomEtiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FolhaInferior } from '@/components/FolhaInferior';
import { Opcao } from '@/components/Opcao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, RAIO } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import { api, type Ata, type AvaliacaoAta, type Comissao, type Reuniao } from '@/services/api';
import { autenticarComDispositivo, dispositivoProtegido } from '@/services/autenticacao-local';
import { compartilharPdfAta } from '@/services/pdfAta';
import { type Mudanca, mudancas, paragrafos } from '@/utils/diferenca';
import {
  formatarData,
  formatarDataHora,
  formatarHora,
  intervalo,
  numeroDaAta,
  plural,
  situacaoDaAta,
} from '@/utils/reunioes';

const TAMANHO_MAXIMO_ATA = 20000;
const TAMANHO_MAXIMO_JUSTIFICATIVA = 500;
const HORA = 3600000;
const PRAZOS = [
  { horas: 24, rotulo: '24 horas' },
  { horas: 72, rotulo: '3 dias' },
  { horas: 168, rotulo: '7 dias' },
];

type Aba = 'ata' | 'presenca';

type Lista = {
  titulo: string;
  gerada_em: string;
  participantes: {
    usuario_id: string;
    nome: string;
    situacao: 'CONFIRMADA' | 'AGUARDANDO' | 'RECUSADA' | 'SEM_REGISTRO';
    entrada: string | null;
    saida: string | null;
    minutos: number | null;
  }[];
};

type Pendente = { mensagem: string; rotulo: string; acao: () => Promise<void> };

const SITUACOES: Record<Lista['participantes'][number]['situacao'], { texto: string; tom: TomEtiqueta }> = {
  CONFIRMADA: { texto: 'Presente', tom: 'sucesso' },
  AGUARDANDO: { texto: 'Aguardando', tom: 'alerta' },
  RECUSADA: { texto: 'Recusada', tom: 'erro' },
  SEM_REGISTRO: { texto: 'Ausente', tom: 'neutro' },
};

function periodo(participante: Lista['participantes'][number]) {
  if (!participante.entrada) return 'Sem registro';
  const entrada = formatarHora(participante.entrada);
  if (!participante.saida) return `Entrada às ${entrada}`;
  return `${entrada} – ${formatarHora(participante.saida)} · ${participante.minutos ?? 0} min`;
}

function reprovacaoDe(ata: Ata | undefined) {
  return ata?.avaliacoes.find((avaliacao) => avaliacao.decisao === 'REPROVADA');
}

function TextoAta({
  texto,
  marcado,
  aoTocar,
}: {
  texto: string;
  marcado?: string | null;
  aoTocar?: (paragrafo: string) => void;
}) {
  const { cores } = useTema().tema;
  return (
    <View style={[styles.cartao, styles.texto, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
      {paragrafos(texto).map((paragrafo, indice) => {
        const destacado = paragrafo === marcado;
        const estilo = [
          styles.paragrafo,
          destacado ? { backgroundColor: cores.erroSuave, borderColor: cores.erro } : null,
        ];
        const conteudo = (
          <Text style={[styles.textoParagrafo, { color: destacado ? cores.erro : cores.texto }]} selectable={!aoTocar}>
            {paragrafo}
          </Text>
        );
        return aoTocar ? (
          <Pressable
            key={indice}
            onPress={() => aoTocar(paragrafo)}
            accessibilityRole="button"
            accessibilityState={{ selected: destacado }}
            accessibilityHint="Aponta este trecho ao reprovar a ata"
            style={({ pressed }) => [...estilo, { opacity: pressed ? 0.7 : 1 }]}
          >
            {conteudo}
          </Pressable>
        ) : (
          <View key={indice} style={estilo}>
            {conteudo}
          </View>
        );
      })}
    </View>
  );
}

function ListaMudancas({ lista }: { lista: Mudanca[] }) {
  const { cores } = useTema().tema;
  if (lista.length === 0) {
    return <Text style={[styles.detalhe, { color: cores.textoSuave }]}>O texto é igual ao da versão anterior.</Text>;
  }
  return lista.map((mudanca, indice) => (
    <Text key={indice} style={[styles.textoParagrafo, { color: cores.texto }]}>
      {mudanca.map((trecho, posicao) => (
        <Text
          key={posicao}
          style={
            trecho.tipo === 'novo'
              ? { backgroundColor: cores.sucessoSuave, color: cores.sucesso }
              : trecho.tipo === 'removido'
                ? { backgroundColor: cores.erroSuave, color: cores.erro, textDecorationLine: 'line-through' }
                : null
          }
        >
          {trecho.texto}
        </Text>
      ))}
    </Text>
  ));
}

export default function TelaRegistrosReuniao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario } = useSessao();
  const { cores } = useTema().tema;
  const [reuniao, definirReuniao] = useState<Reuniao | null>(null);
  const [responsavel, definirResponsavel] = useState(false);
  const [lista, definirLista] = useState<Lista | null>(null);
  const [aba, definirAba] = useState<Aba>('ata');
  const [agora, definirAgora] = useState(() => Date.now());
  const [erro, definirErro] = useState('');
  const [sucesso, definirSucesso] = useState('');
  const [salvando, definirSalvando] = useState(false);
  const [confirmacao, definirConfirmacao] = useState<Pendente | null>(null);
  const [envioAberto, definirEnvioAberto] = useState(false);
  const [envioAbertoEm, definirEnvioAbertoEm] = useState(0);
  const [prazo, definirPrazo] = useState(72);
  const [reprovacaoAberta, definirReprovacaoAberta] = useState(false);
  const [justificativa, definirJustificativa] = useState('');
  const [trecho, definirTrecho] = useState<string | null>(null);
  const [gerandoPdf, definirGerandoPdf] = useState(false);
  const ocupado = useRef(false);
  const { control, handleSubmit, reset, formState } = useForm({ defaultValues: { conteudo: '' } });
  const conteudo = useWatch({ control, name: 'conteudo' });

  const carregar = useCallback(async () => {
    const resposta = await api<Reuniao>(`/reunioes/${id}`);
    if (!resposta.ok) {
      definirErro(resposta.erro);
      return;
    }
    definirAgora(Date.now());
    definirReuniao(resposta.dados);
    reset({ conteudo: resposta.dados.ata?.conteudo ?? '' });
    if (resposta.dados.comissao_id) {
      const comissao = await api<Comissao>(`/comissoes/${resposta.dados.comissao_id._id}`);
      definirResponsavel(
        comissao.ok &&
          comissao.dados.ativo &&
          comissao.dados.membros.some(
            (membro) => membro.usuario_id?._id === usuario?._id && membro.papel === 'RESPONSAVEL',
          ),
      );
    }
  }, [id, reset, usuario?._id]);

  const carregarLista = useCallback(async () => {
    const resposta = await api<Lista>(`/reunioes/${id}/lista-presenca`);
    if (resposta.ok) definirLista(resposta.dados);
    else definirErro(resposta.erro);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (aba === 'presenca') void carregarLista();
  }, [aba, carregarLista]);

  async function gravar(caminho: string, metodo: 'PATCH' | 'POST', corpo: unknown, mensagem: string) {
    if (ocupado.current) return false;
    ocupado.current = true;
    definirSalvando(true);
    definirErro('');
    definirSucesso('');
    try {
      const resposta = await api<Reuniao>(`/reunioes/${id}${caminho}`, metodo, corpo);
      if (!resposta.ok) {
        definirErro(resposta.erro);
        return false;
      }
      definirAgora(Date.now());
      definirReuniao(resposta.dados);
      reset({ conteudo: resposta.dados.ata?.conteudo ?? '' });
      definirTrecho(null);
      definirSucesso(mensagem);
      return true;
    } finally {
      ocupado.current = false;
      definirSalvando(false);
      definirConfirmacao(null);
    }
  }

  async function atualizar() {
    if (ocupado.current) return;
    const recarregar = async () => {
      definirErro('');
      definirSucesso('');
      await carregar();
      if (aba === 'presenca') await carregarLista();
    };
    if (formState.isDirty) {
      definirConfirmacao({ mensagem: 'Descartar as alterações não salvas?', rotulo: 'Descartar', acao: recarregar });
      return;
    }
    await recarregar();
  }

  function compartilhar() {
    if (!lista || !reuniao) return;
    const linhas = lista.participantes.map(
      (participante) => `${participante.nome}: ${SITUACOES[participante.situacao].texto} (${periodo(participante)})`,
    );
    void Share.share({
      message: [`Lista de presença · ${reuniao.titulo}`, `${formatarData(reuniao.inicio)} · ${intervalo(reuniao)}`, '', ...linhas].join('\n'),
    }).catch(() => definirErro('Não foi possível compartilhar.'));
  }

  const ata = reuniao?.ata;
  const canceladas = reuniao?.atas_canceladas ?? [];
  const anterior = canceladas.at(-1);
  const textoAnterior = anterior?.conteudo;
  const versaoAtual = canceladas.length + 1;
  const situacao = situacaoDaAta(ata);
  const encerrada = Boolean(reuniao && reuniao.situacao !== 'CANCELADA' && new Date(reuniao.fim).getTime() <= agora);
  const editavel = responsavel && encerrada && (!ata || ata.situacao === 'RASCUNHO');
  const minhaAvaliacao = ata?.avaliacoes.find((avaliacao) => avaliacao.usuario_id === usuario?._id);
  const aprovador = Boolean(
    usuario && ata?.situacao === 'EM_APROVACAO' && ata.aprovadores.includes(usuario._id) && !minhaAvaliacao,
  );
  const presentes = (reuniao?.participantes ?? []).filter((participante) => participante.presenca?.situacao === 'CONFIRMADA');
  const euPresente = presentes.some((participante) => participante.usuario_id?._id === usuario?._id);
  const reprovacao = reprovacaoDe(ata);
  const reprovacaoAnterior = editavel ? reprovacaoDe(anterior) : undefined;
  const listaMudancas =
    textoAnterior !== undefined && ata?.situacao === 'EM_APROVACAO' ? mudancas(textoAnterior, ata.conteudo) : null;
  const nomeDe = (pessoaId: string) =>
    reuniao?.participantes.find((participante) => participante.usuario_id?._id === pessoaId)?.usuario_id?.nome ??
    'Participante';
  const totalPresentes = lista?.participantes.filter((participante) => participante.situacao === 'CONFIRMADA').length ?? 0;
  const prazoVencido = Boolean(ata?.prazo && new Date(ata.prazo).getTime() < agora);

  function detalheDaVersao(atual: Ata) {
    if (atual.situacao === 'RASCUNHO') return `Versão ${versaoAtual} · salva em ${formatarDataHora(atual.atualizada_em)}`;
    if (atual.situacao === 'APROVADA' && atual.aprovada_em)
      return `Versão ${versaoAtual} · aprovada em ${formatarDataHora(atual.aprovada_em)}`;
    if (atual.enviada_em) return `Versão ${versaoAtual} · enviada em ${formatarDataHora(atual.enviada_em)}`;
    return `Versão ${versaoAtual}`;
  }

  // Sem "versao", a ata reprovada está na tela com o trecho destacado; com ela, o aviso é de uma versão anterior.
  function avisoDeReprovacao(avaliacao: AvaliacaoAta, versao?: number) {
    const partes = [
      avaliacao.justificativa ? `"${avaliacao.justificativa}"` : 'Sem justificativa.',
      versao && avaliacao.trecho ? `Trecho apontado: "${avaliacao.trecho}"` : '',
    ];
    return (
      <FaixaAviso
        aviso={{
          tom: 'erro',
          titulo: `${nomeDe(avaliacao.usuario_id)} reprovou${versao ? ` a versão ${versao}` : ''} em ${formatarDataHora(avaliacao.em)}`,
          mensagem: partes.filter(Boolean).join('\n'),
        }}
      />
    );
  }

  function abrirEnvio() {
    definirEnvioAbertoEm(Date.now());
    definirEnvioAberto(true);
  }

  async function enviar() {
    if (!ata) return;
    definirEnvioAberto(false);
    if (euPresente && !(await autenticarComDispositivo())) return;
    await gravar('/ata/publicar', 'POST', { versao: ata.versao, prazo_horas: prazo }, 'Ata enviada para aprovação.');
  }

  async function aprovar() {
    if (!ata) return;
    const acao = async () => {
      await gravar('/ata/aprovar', 'POST', { versao: ata.versao }, 'Ata aprovada.');
    };
    if (await dispositivoProtegido()) {
      if (await autenticarComDispositivo()) await acao();
      return;
    }
    definirConfirmacao({ mensagem: 'Aprovar esta ata? A aprovação fica registrada com data e hora.', rotulo: 'Aprovar', acao });
  }

  async function reprovar() {
    if (!ata) return;
    const reprovada = await gravar(
      '/ata/reprovar',
      'POST',
      { versao: ata.versao, trecho: trecho ?? undefined, justificativa: justificativa.trim() || undefined },
      'Ata reprovada. Ela voltou para correção.',
    );
    if (reprovada) {
      definirReprovacaoAberta(false);
      definirJustificativa('');
    }
  }

  function refazer() {
    definirConfirmacao({
      mensagem: `A versão ${versaoAtual} será cancelada e uma nova começa como rascunho, com o mesmo texto.`,
      rotulo: 'Criar nova versão',
      acao: async () => {
        await gravar('/ata/nova', 'POST', undefined, 'Nova versão criada. Corrija o texto e envie de novo.');
      },
    });
  }

  async function baixarPdf() {
    if (!reuniao) return;
    definirGerandoPdf(true);
    definirErro('');
    try {
      await compartilharPdfAta(reuniao);
    } catch {
      definirErro('Não foi possível gerar o PDF da ata.');
    } finally {
      definirGerandoPdf(false);
    }
  }

  let rodape = null;
  if (aba === 'ata' && editavel) {
    rodape = (
      <View style={styles.botoes}>
        <Botao
          titulo="Salvar"
          tituloCarregando="Salvando..."
          variante={ata ? 'secundario' : 'primario'}
          pilula
          carregando={salvando}
          desabilitado={ata ? !formState.isDirty : false}
          aoTocar={() =>
            void handleSubmit(({ conteudo: texto }) =>
              gravar('/ata', 'PATCH', { conteudo: texto.trim(), versao: ata?.versao ?? 0 }, 'Rascunho salvo.'),
            )()
          }
          style={styles.botao}
        />
        {ata ? (
          <Botao
            titulo="Enviar"
            icone="send-outline"
            pilula
            desabilitado={formState.isDirty || salvando}
            aoTocar={abrirEnvio}
            style={styles.botao}
          />
        ) : null}
      </View>
    );
  } else if (aba === 'ata' && aprovador) {
    rodape = (
      <View style={styles.botoes}>
        <Botao
          titulo="Reprovar"
          icone="close"
          variante="perigo"
          pilula
          desabilitado={salvando}
          aoTocar={() => definirReprovacaoAberta(true)}
          style={styles.botao}
        />
        <Botao
          titulo="Aprovar"
          icone="finger-print"
          pilula
          carregando={salvando}
          aoTocar={() => void aprovar()}
          style={styles.botao}
        />
      </View>
    );
  } else if (aba === 'ata' && responsavel && encerrada && ata?.situacao === 'REPROVADA') {
    rodape = <Botao titulo="Corrigir em nova versão" icone="copy-outline" pilula carregando={salvando} aoTocar={refazer} />;
  } else if (aba === 'ata' && ata?.situacao === 'APROVADA') {
    rodape = (
      <Botao
        titulo="PDF da ata"
        tituloCarregando="Gerando PDF..."
        icone="document-outline"
        variante="secundario"
        pilula
        carregando={gerandoPdf}
        aoTocar={() => void baixarPdf()}
      />
    );
  } else if (aba === 'presenca' && lista && lista.participantes.length > 0) {
    rodape = <Botao titulo="Compartilhar" icone="share-outline" variante="secundario" pilula aoTocar={compartilhar} />;
  }

  return (
    <TelaComCabecalho
      titulo={ata?.situacao === 'APROVADA' ? numeroDaAta(ata) : 'Ata'}
      subtitulo={reuniao?.titulo}
      cabecalhoSuperficie
      aoAtualizar={atualizar}
      rodape={rodape ?? undefined}
    >
      {!reuniao && !erro ? <Carregando rotulo="Carregando reunião" /> : null}
      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {sucesso ? <FaixaAviso aviso={{ tom: 'sucesso', mensagem: sucesso }} /> : null}

      {reuniao ? (
        <>
          <View style={styles.largura}>
            <Abas<Aba>
              abas={[
                { chave: 'ata', rotulo: 'Ata' },
                { chave: 'presenca', rotulo: 'Presença' },
              ]}
              ativa={aba}
              aoEscolher={definirAba}
            />
          </View>

          {aba === 'ata' ? (
            <>
              <View style={styles.situacao}>
                <Etiqueta texto={situacao.texto} tom={situacao.tom} />
                {ata ? (
                  <Text style={[styles.detalhe, { color: cores.textoSuave }]}>{detalheDaVersao(ata)}</Text>
                ) : null}
              </View>

              {ata?.situacao === 'EM_APROVACAO' && ata.prazo ? (
                <View style={styles.linhaIcone}>
                  <Ionicons name="time-outline" size={16} color={prazoVencido ? cores.erro : cores.textoSuave} />
                  <Text style={[styles.detalhe, { color: prazoVencido ? cores.erro : cores.textoSuave }]}>
                    {prazoVencido
                      ? `Prazo encerrado em ${formatarDataHora(ata.prazo)}`
                      : `Responder até ${formatarDataHora(ata.prazo)}`}
                  </Text>
                </View>
              ) : null}

              {reprovacao ? avisoDeReprovacao(reprovacao) : null}
              {reprovacaoAnterior ? avisoDeReprovacao(reprovacaoAnterior, canceladas.length) : null}

              {listaMudancas ? (
                <>
                  <Text style={[styles.secao, { color: cores.textoSuave }]}>
                    O que mudou desde a versão {canceladas.length}
                  </Text>
                  <View
                    style={[styles.cartao, styles.texto, { backgroundColor: cores.superficie, borderColor: cores.primaria }]}
                  >
                    <ListaMudancas lista={listaMudancas} />
                  </View>
                </>
              ) : null}

              {!encerrada ? (
                <EstadoVazio icone="time-outline" mensagem="Disponível após o término da reunião." />
              ) : editavel ? (
                <CampoTextoControlado
                  controle={control}
                  nome="conteudo"
                  rotulo="Texto da ata"
                  placeholder="Ata"
                  icone="document-text-outline"
                  validar={(valor) => (valor.trim().length >= 20 ? null : 'Escreva ao menos 20 caracteres.')}
                  dica={`${conteudo.trim().length}/${TAMANHO_MAXIMO_ATA}`}
                  multiline
                  maxLength={TAMANHO_MAXIMO_ATA}
                  editable={!salvando}
                  compacto
                  style={styles.campoAta}
                />
              ) : ata ? (
                <>
                  {aprovador ? (
                    <Text style={[styles.detalhe, { color: cores.textoSuave }]}>
                      Toque num parágrafo para apontar um problema ao reprovar.
                    </Text>
                  ) : null}
                  <TextoAta
                    texto={ata.conteudo}
                    marcado={aprovador ? trecho : reprovacao?.trecho}
                    aoTocar={aprovador ? (paragrafo) => definirTrecho((atual) => (atual === paragrafo ? null : paragrafo)) : undefined}
                  />
                </>
              ) : (
                <EstadoVazio icone="document-text-outline" mensagem="A ata ainda não foi registrada." />
              )}

              {ata && ata.situacao !== 'RASCUNHO' ? (
                <>
                  <Text style={[styles.secao, { color: cores.textoSuave }]}>
                    {ata.situacao === 'APROVADA'
                      ? 'Aprovada por'
                      : ata.situacao === 'REPROVADA'
                        ? 'Avaliações'
                        : `Aprovações · ${ata.avaliacoes.filter((item) => item.decisao === 'APROVADA').length} de ${ata.aprovadores.length}`}
                  </Text>
                  <View style={[styles.cartao, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
                    {ata.aprovadores.map((pessoaId, indice) => {
                      const avaliacao = ata.avaliacoes.find((item) => item.usuario_id === pessoaId);
                      const aprovou = avaliacao?.decisao === 'APROVADA';
                      const detalhe = avaliacao
                        ? `${aprovou ? 'Aprovou' : 'Reprovou'} em ${formatarDataHora(avaliacao.em)}`
                        : ata.situacao === 'EM_APROVACAO'
                          ? 'Aguardando'
                          : 'Não avaliou';
                      return (
                        <View
                          key={pessoaId}
                          style={[styles.pessoa, indice > 0 ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null]}
                        >
                          <Avatar nome={nomeDe(pessoaId)} colorido apagado={!avaliacao} />
                          <View style={styles.textos}>
                            <Text style={[styles.nome, { color: cores.texto }]} numberOfLines={1}>
                              {nomeDe(pessoaId)}
                              {pessoaId === usuario?._id ? ' (você)' : ''}
                            </Text>
                            <Text style={[styles.detalhe, { color: cores.textoSuave }]}>{detalhe}</Text>
                          </View>
                          {avaliacao ? (
                            <Ionicons
                              name={aprovou ? 'checkmark-circle' : 'close-circle'}
                              size={20}
                              color={aprovou ? cores.sucesso : cores.erro}
                            />
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {canceladas.length > 0 ? (
                <>
                  <Text style={[styles.secao, { color: cores.textoSuave }]}>Versões anteriores</Text>
                  <View style={[styles.cartao, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
                    {canceladas.map((cancelada, indice) => {
                      const motivo = reprovacaoDe(cancelada);
                      return (
                        <View
                          key={indice}
                          style={[styles.versao, indice > 0 ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null]}
                        >
                          <Text style={[styles.nome, { color: cores.texto }]}>
                            Versão {indice + 1} · cancelada
                            {cancelada.cancelada_em ? ` em ${formatarDataHora(cancelada.cancelada_em)}` : ''}
                          </Text>
                          {motivo ? (
                            <Text style={[styles.detalhe, { color: cores.textoSuave }]}>
                              Reprovada por {nomeDe(motivo.usuario_id)}
                              {motivo.justificativa ? `: "${motivo.justificativa}"` : ', sem justificativa'}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </>
          ) : null}

          {aba === 'presenca' ? (
            !lista ? (
              <Carregando rotulo="Carregando presença" />
            ) : lista.participantes.length === 0 ? (
              <EstadoVazio icone="people-outline" mensagem="Sem participantes." />
            ) : (
              <>
                <Text style={[styles.detalhe, { color: cores.textoSuave }]}>
                  {plural(totalPresentes, 'presente', 'presentes')} ·{' '}
                  {plural(lista.participantes.length - totalPresentes, 'ausente', 'ausentes')}
                </Text>
                <View style={[styles.cartao, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
                  {lista.participantes.map((participante, indice) => {
                    const tom = SITUACOES[participante.situacao];
                    return (
                      <View
                        key={participante.usuario_id}
                        style={[styles.pessoa, indice > 0 ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null]}
                      >
                        <Avatar
                          nome={participante.nome}
                          colorido
                          apagado={participante.situacao !== 'CONFIRMADA'}
                        />
                        <View style={styles.textos}>
                          <Text style={[styles.nome, { color: cores.texto }]} numberOfLines={1}>
                            {participante.nome}
                            {participante.usuario_id === usuario?._id ? ' (você)' : ''}
                          </Text>
                          <Text style={[styles.detalhe, { color: cores.textoSuave }]}>{periodo(participante)}</Text>
                        </View>
                        <Etiqueta texto={tom.texto} tom={tom.tom} />
                      </View>
                    );
                  })}
                </View>
              </>
            )
          ) : null}
        </>
      ) : null}

      <FolhaInferior visivel={envioAberto} titulo="Enviar para aprovação" aoFechar={() => definirEnvioAberto(false)}>
        <View style={styles.folha}>
          <Text style={[styles.textoFolha, { color: cores.texto }]}>
            Vai para {plural(presentes.length, 'presente', 'presentes')}:{' '}
            {presentes.map((participante) => participante.usuario_id?.nome ?? 'Participante').join(', ')}.
          </Text>
          <Text style={[styles.rotuloFolha, { color: cores.textoSuave }]}>Prazo para responder</Text>
          <View style={styles.prazos}>
            {PRAZOS.map((opcao) => (
              <Opcao
                key={opcao.horas}
                titulo={opcao.rotulo}
                selecionado={prazo === opcao.horas}
                aoTocar={() => definirPrazo(opcao.horas)}
              />
            ))}
          </View>
          <Text style={[styles.detalhe, { color: cores.textoSuave }]}>
            Até {formatarDataHora(new Date(envioAbertoEm + prazo * HORA))}. Depois do envio o texto não muda; se alguém
            reprovar, você corrige numa nova versão.
          </Text>
          {euPresente ? (
            <View style={styles.linhaIcone}>
              <Ionicons name="finger-print" size={16} color={cores.primaria} />
              <Text style={[styles.detalhe, { color: cores.textoSuave, flex: 1 }]}>
                Enviar já registra a sua aprovação.
              </Text>
            </View>
          ) : null}
          <Botao titulo="Enviar" icone="send-outline" pilula carregando={salvando} aoTocar={() => void enviar()} />
        </View>
      </FolhaInferior>

      <FolhaInferior
        visivel={reprovacaoAberta}
        titulo="Reprovar ata"
        acompanharTeclado
        aoFechar={() => definirReprovacaoAberta(false)}
      >
        <View style={styles.folha}>
          {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
          {trecho ? (
            <>
              <Text style={[styles.rotuloFolha, { color: cores.textoSuave }]}>Trecho apontado</Text>
              <View style={[styles.trecho, { backgroundColor: cores.erroSuave, borderColor: cores.erro }]}>
                <Text style={[styles.detalhe, { color: cores.erro }]} numberOfLines={4}>
                  {trecho}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[styles.detalhe, { color: cores.textoSuave }]}>
              Para apontar um trecho, feche e toque no parágrafo da ata.
            </Text>
          )}
          <CampoTexto
            rotulo="Justificativa (opcional)"
            placeholder="O que precisa mudar"
            value={justificativa}
            onChangeText={definirJustificativa}
            multiline
            maxLength={TAMANHO_MAXIMO_JUSTIFICATIVA}
            dica={`${justificativa.trim().length}/${TAMANHO_MAXIMO_JUSTIFICATIVA}`}
            editable={!salvando}
            compacto
            style={styles.campoJustificativa}
          />
          <Text style={[styles.detalhe, { color: cores.textoSuave }]}>
            A ata volta para correção. As outras pessoas não precisam mais responder esta versão.
          </Text>
          <Botao
            titulo="Reprovar ata"
            variante="perigo"
            pilula
            carregando={salvando}
            aoTocar={() => void reprovar()}
          />
        </View>
      </FolhaInferior>

      <Confirmacao
        mensagem={confirmacao?.mensagem}
        rotuloConfirmar={confirmacao?.rotulo}
        carregando={salvando}
        cancelar={() => definirConfirmacao(null)}
        confirmar={() => {
          const acao = confirmacao?.acao;
          if (acao) void acao().finally(() => definirConfirmacao(null));
        }}
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  largura: { marginHorizontal: -ESPACO.md, marginTop: -ESPACO.sm },
  situacao: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: ESPACO.sm },
  linhaIcone: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.xs + 2 },
  detalhe: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  campoAta: { minHeight: 280 },
  campoJustificativa: { minHeight: 96 },
  cartao: { borderWidth: 1, borderRadius: RAIO.lg, overflow: 'hidden' },
  texto: { paddingHorizontal: ESPACO.sm, paddingVertical: ESPACO.sm, gap: 2 },
  paragrafo: { paddingHorizontal: ESPACO.sm, paddingVertical: ESPACO.xs, borderRadius: RAIO.sm, borderWidth: 1, borderColor: 'transparent' },
  textoParagrafo: { fontFamily: FONTES.corpo, fontSize: 15, lineHeight: 22 },
  secao: { fontFamily: FONTES.titulo, fontSize: 13, lineHeight: 18, marginBottom: -ESPACO.sm },
  pessoa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    paddingVertical: ESPACO.sm + 2,
    paddingLeft: ESPACO.md - 2,
    paddingRight: ESPACO.sm + 2,
  },
  versao: { paddingVertical: ESPACO.sm + 2, paddingHorizontal: ESPACO.md - 2, gap: 2 },
  textos: { flex: 1, minWidth: 0 },
  nome: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  botoes: { flexDirection: 'row', gap: ESPACO.sm },
  botao: { flex: 1 },
  folha: { paddingHorizontal: ESPACO.md, gap: ESPACO.sm + 4 },
  textoFolha: { fontFamily: FONTES.corpo, fontSize: 15, lineHeight: 22 },
  rotuloFolha: { fontFamily: FONTES.corpoMedio, fontSize: 13, lineHeight: 18, marginBottom: -ESPACO.xs },
  prazos: { flexDirection: 'row', gap: ESPACO.sm },
  trecho: { borderWidth: 1, borderRadius: RAIO.md, paddingHorizontal: ESPACO.sm + 2, paddingVertical: ESPACO.sm },
});
