import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useForm, useWatch } from 'react-hook-form';

import { Abas } from '@/components/Abas';
import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Confirmacao } from '@/components/Confirmacao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta, type TomEtiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, RAIO } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import { api, type Comissao, type Reuniao } from '@/services/api';
import { formatarData, formatarHora, intervalo, plural, situacaoDaAta } from '@/utils/reunioes';

const TAMANHO_MAXIMO_ATA = 20000;

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
    if (ocupado.current) return;
    ocupado.current = true;
    definirSalvando(true);
    definirErro('');
    definirSucesso('');
    try {
      const resposta = await api<Reuniao>(`/reunioes/${id}${caminho}`, metodo, corpo);
      if (!resposta.ok) {
        definirErro(resposta.erro);
        return;
      }
      definirReuniao(resposta.dados);
      reset({ conteudo: resposta.dados.ata?.conteudo ?? '' });
      definirSucesso(mensagem);
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
  const situacao = situacaoDaAta(ata);
  const encerrada = Boolean(reuniao && reuniao.situacao !== 'CANCELADA' && new Date(reuniao.fim).getTime() <= agora);
  const editavel = responsavel && encerrada && (!ata || ata.situacao === 'RASCUNHO');
  const aprovador = Boolean(
    usuario && ata?.situacao === 'EM_APROVACAO' && ata.aprovadores.includes(usuario._id) && !ata.aprovacoes.includes(usuario._id),
  );
  const nomeDe = (pessoaId: string) =>
    reuniao?.participantes.find((participante) => participante.usuario_id?._id === pessoaId)?.usuario_id?.nome ??
    'Participante';
  const presentes = lista?.participantes.filter((participante) => participante.situacao === 'CONFIRMADA').length ?? 0;

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
            aoTocar={() =>
              definirConfirmacao({
                mensagem: 'Enviar para aprovação? O texto não poderá mais ser alterado.',
                rotulo: 'Enviar',
                acao: () => gravar('/ata/publicar', 'POST', { versao: ata.versao }, 'Ata enviada para aprovação.'),
              })
            }
            style={styles.botao}
          />
        ) : null}
      </View>
    );
  } else if (aba === 'ata' && aprovador && ata) {
    rodape = (
      <Botao
        titulo="Aprovar ata"
        icone="checkmark"
        pilula
        carregando={salvando}
        aoTocar={() =>
          definirConfirmacao({
            mensagem: 'Aprovar esta ata?',
            rotulo: 'Aprovar',
            acao: () => gravar('/ata/aprovar', 'POST', { versao: ata.versao }, 'Ata aprovada.'),
          })
        }
      />
    );
  } else if (aba === 'presenca' && lista && lista.participantes.length > 0) {
    rodape = <Botao titulo="Compartilhar" icone="share-outline" variante="secundario" pilula aoTocar={compartilhar} />;
  }

  return (
    <TelaComCabecalho
      titulo="Ata"
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
                  <Text style={[styles.detalhe, { color: cores.textoSuave }]}>
                    Versão {ata.versao} · {formatarData(ata.atualizada_em)}
                  </Text>
                ) : null}
              </View>

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
                <View style={[styles.cartao, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
                  <Text style={[styles.texto, { color: cores.texto }]} selectable>
                    {ata.conteudo}
                  </Text>
                </View>
              ) : (
                <EstadoVazio icone="document-text-outline" mensagem="A ata ainda não foi registrada." />
              )}

              {ata && ata.situacao !== 'RASCUNHO' ? (
                <>
                  <Text style={[styles.secao, { color: cores.textoSuave }]}>
                    Aprovações · {ata.aprovacoes.length} de {ata.aprovadores.length}
                  </Text>
                  <View style={[styles.cartao, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
                    {ata.aprovadores.map((pessoaId, indice) => {
                      const aprovou = ata.aprovacoes.includes(pessoaId);
                      return (
                        <View
                          key={pessoaId}
                          style={[styles.pessoa, indice > 0 ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null]}
                        >
                          <Avatar nome={nomeDe(pessoaId)} colorido apagado={!aprovou} />
                          <View style={styles.textos}>
                            <Text style={[styles.nome, { color: cores.texto }]} numberOfLines={1}>
                              {nomeDe(pessoaId)}
                              {pessoaId === usuario?._id ? ' (você)' : ''}
                            </Text>
                            <Text style={[styles.detalhe, { color: cores.textoSuave }]}>
                              {aprovou ? 'Aprovou' : 'Pendente'}
                            </Text>
                          </View>
                          {aprovou ? <Ionicons name="checkmark" size={20} color={cores.sucesso} /> : null}
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
                  {plural(presentes, 'presente', 'presentes')} ·{' '}
                  {plural(lista.participantes.length - presentes, 'ausente', 'ausentes')}
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
  detalhe: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  campoAta: { minHeight: 280 },
  cartao: { borderWidth: 1, borderRadius: RAIO.lg, overflow: 'hidden' },
  texto: {
    fontFamily: FONTES.corpo,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: ESPACO.md,
    paddingVertical: ESPACO.md - 2,
  },
  secao: { fontFamily: FONTES.titulo, fontSize: 13, lineHeight: 18, marginBottom: -ESPACO.sm },
  pessoa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    paddingVertical: ESPACO.sm + 2,
    paddingLeft: ESPACO.md - 2,
    paddingRight: ESPACO.sm + 2,
  },
  textos: { flex: 1, minWidth: 0 },
  nome: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  botoes: { flexDirection: 'row', gap: ESPACO.sm },
  botao: { flex: 1 },
});
