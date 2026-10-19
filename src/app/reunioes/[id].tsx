import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { Abas } from '@/components/Abas';
import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { Confirmacao } from '@/components/Confirmacao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FolhaInferior } from '@/components/FolhaInferior';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import { api, type Participante, type Reuniao, type Resultado } from '@/services/api';
import {
  entradaAberta,
  formatarData,
  formatarHora,
  intervalo,
  meuParticipante,
  plural,
  situacaoDaReuniao,
} from '@/utils/reunioes';

type Aba = 'presenca' | 'pauta';

type Pendente = { mensagem: string; acao: () => Promise<unknown> };

type Pessoa = Participante & { usuario_id: NonNullable<Participante['usuario_id']> };

export default function TelaReuniao() {
  const { tema } = useTema();
  const { cores } = tema;
  const { usuario } = useSessao();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reuniao, definirReuniao] = useState<Reuniao | null>(null);
  const [agora, definirAgora] = useState(() => Date.now());
  const [aba, definirAba] = useState<Aba>('presenca');
  const [carregando, definirCarregando] = useState(true);
  const [salvando, definirSalvando] = useState<string | null>(null);
  const [erro, definirErro] = useState('');
  const [sucesso, definirSucesso] = useState('');
  const [opcoes, definirOpcoes] = useState(false);
  const [confirmacao, definirConfirmacao] = useState<Pendente | null>(null);

  const buscar = useCallback(async () => {
    const resultado = await api<Reuniao>(`/reunioes/${id}`);
    definirCarregando(false);
    definirAgora(Date.now());
    if (resultado.ok) definirReuniao(resultado.dados);
    else definirErro(resultado.erro);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void buscar();
      const intervalo = setInterval(() => void buscar(), 30000);
      return () => clearInterval(intervalo);
    }, [buscar]),
  );

  async function executar(chave: string, acao: () => Promise<Resultado<Reuniao>>, mensagem?: string) {
    if (salvando) return false;
    definirSalvando(chave);
    definirErro('');
    definirSucesso('');
    const resultado = await acao();
    definirSalvando(null);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return false;
    }
    definirReuniao(resultado.dados);
    if (mensagem) definirSucesso(mensagem);
    return true;
  }

  async function atualizar() {
    definirErro('');
    await buscar();
  }

  if (!reuniao) {
    return (
      <TelaComCabecalho titulo="Reunião" aoAtualizar={atualizar}>
        {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
        {carregando ? <Carregando rotulo="Carregando reunião" /> : null}
      </TelaComCabecalho>
    );
  }

  const dono = reuniao.sou_dono;
  const eu = meuParticipante(reuniao, usuario?._id);
  const geral = situacaoDaReuniao(reuniao, undefined, agora);
  const cancelada = reuniao.situacao === 'CANCELADA';
  const terminou = new Date(reuniao.fim).getTime() <= agora;
  const comecou = new Date(reuniao.inicio).getTime() <= agora;
  const pessoas = reuniao.participantes.filter((participante): participante is Pessoa =>
    Boolean(participante.usuario_id),
  );
  const aguardando = pessoas.filter((pessoa) => pessoa.presenca?.situacao === 'AGUARDANDO');
  const presentes = pessoas.filter((pessoa) => pessoa.presenca?.situacao === 'CONFIRMADA');
  const restantes = pessoas.filter(
    (pessoa) => !pessoa.presenca || pessoa.presenca.situacao === 'RECUSADA',
  );

  const nome = (pessoa: Pessoa) =>
    pessoa.usuario_id._id === usuario?._id ? `${pessoa.usuario_id.nome} (você)` : pessoa.usuario_id.nome;

  const caminho = `/reunioes/${reuniao._id}`;

  function marcarPresenca(pessoa: Pessoa, situacao: 'CONFIRMADA' | 'RECUSADA') {
    void executar(`presenca-${pessoa.usuario_id._id}`, () =>
      api<Reuniao>(`${caminho}/presencas/${pessoa.usuario_id._id}`, 'PATCH', { situacao }),
    );
  }

  function detalhePresente(pessoa: Pessoa) {
    const presenca = pessoa.presenca;
    if (!presenca) return '';
    const prefixo = pessoa.usuario_id._id === reuniao?.criada_por ? 'Responsável · ' : '';
    if (presenca.marcada_por === 'RESPONSAVEL') {
      return `${prefixo}${dono ? 'Presença marcada por você' : 'Presença marcada pelo responsável'}`;
    }
    const entrada = formatarHora(presenca.entrada);
    if (presenca.saida) return `${prefixo}${entrada} – ${formatarHora(presenca.saida)}`;
    return `${prefixo}Entrada às ${entrada}${terminou ? ' · sem saída' : ''}`;
  }

  function detalheRestante(pessoa: Pessoa) {
    if (pessoa.presenca?.situacao === 'RECUSADA') return 'Entrada recusada';
    if (pessoa.convite === 'RECUSADO') return 'Recusou o convite';
    if (!comecou) return pessoa.convite === 'ACEITO' ? 'Convite aceito' : 'Convite pendente';
    return 'Não marcou entrada';
  }

  function minhaPresenca() {
    const presenca = eu?.presenca;
    if (!presenca) {
      return { icone: 'location-outline' as const, tom: 'primaria' as const, texto: 'Entrada não marcada' };
    }
    const entrada = formatarHora(presenca.entrada);
    const periodo = presenca.saida ? `${entrada} – ${formatarHora(presenca.saida)}` : `Entrada às ${entrada}`;
    if (presenca.situacao === 'RECUSADA') {
      return { icone: 'close-circle-outline' as const, tom: 'erro' as const, texto: 'Entrada recusada' };
    }
    if (presenca.situacao === 'AGUARDANDO') {
      return { icone: 'time-outline' as const, tom: 'alerta' as const, texto: `${periodo} · aguardando confirmação` };
    }
    return {
      icone: 'checkmark' as const,
      tom: 'sucesso' as const,
      texto: presenca.saida ? `Presente · ${periodo}` : `Presente desde ${entrada}`,
    };
  }

  const tons = {
    primaria: { fundo: cores.primariaSuave, cor: cores.primaria },
    sucesso: { fundo: cores.sucessoSuave, cor: cores.sucesso },
    alerta: { fundo: cores.alertaSuave, cor: cores.alerta },
    erro: { fundo: cores.erroSuave, cor: cores.erro },
  };
  const minha = minhaPresenca();
  const tomMinha = tons[minha.tom];
  const mostrarConvite = !dono && !cancelada && !terminou && eu && !eu.presenca && eu.convite !== 'ACEITO';
  const mostrarPresenca = entradaAberta(reuniao, agora) && eu && eu.convite !== 'RECUSADO';
  const mostrarRestantes = restantes.length > 0 && (dono || !comecou);

  return (
    <TelaComCabecalho
      titulo="Reunião"
      cabecalhoSuperficie
      aoAtualizar={atualizar}
      acao={
        dono && !cancelada && !terminou ? (
          <Pressable
            onPress={() => definirOpcoes(true)}
            accessibilityRole="button"
            accessibilityLabel="Mais opções"
            hitSlop={4}
            style={({ pressed }) => [styles.botaoCabecalho, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={cores.texto} />
          </Pressable>
        ) : undefined
      }
    >
      <View style={[styles.resumo, { backgroundColor: cores.superficie }]}>
        <View style={styles.linha}>
          <View style={[styles.ponto, { backgroundColor: cores.primaria }]} />
          <Text style={[styles.comissao, { color: cores.textoSuave }]} numberOfLines={1}>
            {reuniao.comissao_id?.nome ?? 'Comissão'}
          </Text>
        </View>
        <View style={styles.tituloLinha}>
          <Text style={[styles.titulo, { color: cores.texto }]}>{reuniao.titulo}</Text>
          <View style={styles.etiqueta}>
            <Etiqueta texto={geral.texto} tom={geral.tom} />
          </View>
        </View>
        <View style={styles.linha}>
          <Ionicons name="calendar-outline" size={18} color={cores.textoSutil} />
          <Text style={[styles.info, { color: cores.textoSuave }]}>
            {formatarData(reuniao.inicio)} · {intervalo(reuniao)}
          </Text>
        </View>
        <View style={styles.linha}>
          <Ionicons name="location-outline" size={18} color={cores.textoSutil} />
          <Text style={[styles.info, { color: cores.textoSuave }]}>{reuniao.local}</Text>
        </View>
      </View>

      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {sucesso ? <FaixaAviso aviso={{ tom: 'sucesso', mensagem: sucesso }} /> : null}

      {mostrarConvite ? (
        <View style={[styles.cartaoAcao, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
          <View style={styles.linhaAcao}>
            <View style={[styles.iconeAcao, { backgroundColor: cores.alertaSuave }]}>
              <Ionicons name="mail-outline" size={20} color={cores.alerta} />
            </View>
            <View style={styles.textos}>
              <Text style={[styles.legenda, { color: cores.textoSuave }]}>Convite</Text>
              <Text style={[styles.destaque, { color: cores.texto }]}>
                {eu.convite === 'PENDENTE' ? 'Aguardando sua resposta' : 'Você recusou o convite'}
              </Text>
            </View>
          </View>
          <View style={styles.botoes}>
            {eu.convite === 'PENDENTE' ? (
              <Botao
                titulo="Recusar"
                variante="secundario"
                pilula
                compacto
                desabilitado={salvando !== null}
                carregando={salvando === 'recusar'}
                aoTocar={() =>
                  void executar('recusar', () =>
                    api<Reuniao>(`${caminho}/convite`, 'PATCH', { aceito: false }),
                  )
                }
                style={styles.botao}
              />
            ) : null}
            <Botao
              titulo={eu.convite === 'PENDENTE' ? 'Aceitar' : 'Aceitar convite'}
              variante={eu.convite === 'PENDENTE' ? 'primario' : 'secundario'}
              pilula
              compacto
              desabilitado={salvando !== null}
              carregando={salvando === 'aceitar'}
              aoTocar={() =>
                void executar(
                  'aceitar',
                  () => api<Reuniao>(`${caminho}/convite`, 'PATCH', { aceito: true }),
                  'Convite aceito.',
                )
              }
              style={styles.botao}
            />
          </View>
        </View>
      ) : null}

      {mostrarPresenca ? (
        <View style={[styles.cartaoAcao, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
          <View style={styles.linhaAcao}>
            <View style={[styles.iconeAcao, { backgroundColor: tomMinha.fundo }]}>
              <Ionicons name={minha.icone} size={20} color={tomMinha.cor} />
            </View>
            <View style={styles.textos}>
              <Text style={[styles.legenda, { color: cores.textoSuave }]}>Sua presença</Text>
              <Text style={[styles.destaque, { color: cores.texto }]}>{minha.texto}</Text>
            </View>
          </View>
          {!eu.presenca ? (
            <Botao
              titulo="Marcar entrada"
              icone="log-in-outline"
              pilula
              carregando={salvando === 'entrada'}
              desabilitado={salvando !== null}
              aoTocar={() =>
                void executar('entrada', () => api<Reuniao>(`${caminho}/entrada`, 'POST'), 'Entrada marcada.')
              }
            />
          ) : eu.presenca.situacao !== 'RECUSADA' && !eu.presenca.saida ? (
            <Botao
              titulo="Marcar saída"
              icone="log-out-outline"
              variante="secundario"
              pilula
              carregando={salvando === 'saida'}
              desabilitado={salvando !== null}
              aoTocar={() =>
                void executar('saida', () => api<Reuniao>(`${caminho}/saida`, 'POST'), 'Saída marcada.')
              }
            />
          ) : null}
        </View>
      ) : null}

      <Abas<Aba>
        abas={[
          { chave: 'presenca', rotulo: 'Presença', contador: dono ? aguardando.length : 0 },
          { chave: 'pauta', rotulo: 'Pauta' },
        ]}
        ativa={aba}
        aoEscolher={definirAba}
      />

      {aba === 'presenca' ? (
        <>
          <Text style={[styles.resumoLista, { color: cores.textoSuave }]}>
            {!comecou
              ? [
                  plural(pessoas.filter((pessoa) => pessoa.convite === 'ACEITO').length, 'aceitou', 'aceitaram'),
                  plural(pessoas.filter((pessoa) => pessoa.convite === 'PENDENTE').length, 'pendente', 'pendentes'),
                  plural(pessoas.filter((pessoa) => pessoa.convite === 'RECUSADO').length, 'recusou', 'recusaram'),
                ].join(' · ')
              : dono
                ? [
                    plural(presentes.length, 'presente', 'presentes'),
                    `${aguardando.length} aguardando`,
                    plural(restantes.length, 'ausente', 'ausentes'),
                  ].join(' · ')
                : plural(presentes.length, 'pessoa presente', 'pessoas presentes')}
          </Text>

          {dono && aguardando.length > 0 ? (
            <View style={[styles.lista, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
              <View style={[styles.faixaAguardando, { backgroundColor: cores.alertaSuave }]}>
                <Ionicons name="time-outline" size={18} color={cores.alerta} />
                <Text style={[styles.tituloAguardando, { color: cores.alerta }]}>Aguardando confirmação</Text>
                <Text style={[styles.tituloAguardando, styles.contagem, { color: cores.alerta }]}>
                  {aguardando.length}
                </Text>
              </View>
              {aguardando.map((pessoa, indice) => (
                <View
                  key={pessoa.usuario_id._id}
                  style={[styles.pessoa, indice > 0 ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null]}
                >
                  <Avatar nome={pessoa.usuario_id.nome} colorido />
                  <View style={styles.textos}>
                    <Text style={[styles.nome, { color: cores.texto }]} numberOfLines={1}>
                      {nome(pessoa)}
                    </Text>
                    <Text style={[styles.detalhe, { color: cores.textoSuave }]}>
                      Entrada às {formatarHora(pessoa.presenca?.entrada ?? reuniao.inicio)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => marcarPresenca(pessoa, 'RECUSADA')}
                    disabled={salvando !== null}
                    accessibilityRole="button"
                    accessibilityLabel={`Recusar presença de ${pessoa.usuario_id.nome}`}
                    style={({ pressed }) => [
                      styles.redondo,
                      { backgroundColor: cores.superficieSuave, opacity: pressed || salvando ? 0.6 : 1 },
                    ]}
                  >
                    <Ionicons name="close" size={20} color={cores.textoSuave} />
                  </Pressable>
                  <Pressable
                    onPress={() => marcarPresenca(pessoa, 'CONFIRMADA')}
                    disabled={salvando !== null}
                    accessibilityRole="button"
                    accessibilityLabel={`Confirmar presença de ${pessoa.usuario_id.nome}`}
                    style={({ pressed }) => [
                      styles.redondo,
                      { backgroundColor: cores.primaria, opacity: pressed || salvando ? 0.6 : 1 },
                    ]}
                  >
                    <Ionicons name="checkmark" size={20} color={cores.textoSobrePrimaria} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {comecou || presentes.length > 0 ? (
            <>
              <Text style={[styles.secao, { color: cores.textoSuave }]}>Presentes · {presentes.length}</Text>
              {presentes.length === 0 ? (
                <Text style={[styles.detalhe, { color: cores.textoSutil }]}>Ninguém confirmado ainda.</Text>
              ) : (
                <View style={[styles.lista, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
                  {presentes.map((pessoa, indice) => (
                    <View
                      key={pessoa.usuario_id._id}
                      style={[
                        styles.pessoa,
                        indice > 0 ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null,
                      ]}
                    >
                      <Avatar nome={pessoa.usuario_id.nome} colorido />
                      <View style={styles.textos}>
                        <Text style={[styles.nome, { color: cores.texto }]} numberOfLines={1}>
                          {nome(pessoa)}
                        </Text>
                        <Text style={[styles.detalhe, { color: cores.textoSuave }]}>
                          {detalhePresente(pessoa)}
                        </Text>
                      </View>
                      <Ionicons name="checkmark" size={20} color={cores.sucesso} />
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : null}

          {mostrarRestantes ? (
            <>
              <Text style={[styles.secao, { color: cores.textoSuave }]}>
                {comecou ? 'Ausentes' : 'Convidados'} · {restantes.length}
              </Text>
              <View style={[styles.lista, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
                {restantes.map((pessoa, indice) => (
                  <View
                    key={pessoa.usuario_id._id}
                    style={[styles.pessoa, indice > 0 ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null]}
                  >
                    <Avatar nome={pessoa.usuario_id.nome} colorido={!comecou} apagado={comecou} />
                    <View style={styles.textos}>
                      <Text
                        style={[styles.nome, { color: comecou ? cores.textoSuave : cores.texto }]}
                        numberOfLines={1}
                      >
                        {nome(pessoa)}
                      </Text>
                      <Text style={[styles.detalhe, { color: comecou ? cores.textoSutil : cores.textoSuave }]}>
                        {detalheRestante(pessoa)}
                      </Text>
                    </View>
                    {dono && !cancelada && comecou && pessoa.usuario_id._id !== usuario?._id ? (
                      <Pressable
                        onPress={() => marcarPresenca(pessoa, 'CONFIRMADA')}
                        disabled={salvando !== null}
                        accessibilityRole="button"
                        accessibilityLabel={`Marcar ${pessoa.usuario_id.nome} como presente`}
                        style={({ pressed }) => [
                          styles.pilula,
                          { backgroundColor: cores.primariaSuave, opacity: pressed || salvando ? 0.6 : 1 },
                        ]}
                      >
                        <Text style={[styles.textoPilula, { color: cores.primaria }]}>Marcar presente</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : null}

      {aba === 'pauta' ? (
        reuniao.pauta.length === 0 ? (
          <EstadoVazio icone="list-outline" mensagem="Nenhum item na pauta." />
        ) : (
          <View style={[styles.lista, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
            {reuniao.pauta.map((item, indice) => (
              <View
                key={`${indice}-${item}`}
                style={[styles.itemPauta, indice > 0 ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null]}
              >
                <View style={[styles.numero, { backgroundColor: cores.primariaSuave }]}>
                  <Text style={[styles.textoNumero, { color: cores.primaria }]}>{indice + 1}</Text>
                </View>
                <Text style={[styles.textoPauta, { color: cores.texto }]}>{item}</Text>
              </View>
            ))}
          </View>
        )
      ) : null}

      <FolhaInferior visivel={opcoes} titulo="Opções" aoFechar={() => definirOpcoes(false)}>
        <Pressable
          onPress={() => {
            definirOpcoes(false);
            definirConfirmacao({
              mensagem: `Cancelar a reunião ${reuniao.titulo}?`,
              acao: async () => {
                await executar(
                  'cancelar',
                  () => api<Reuniao>(caminho, 'PATCH', { situacao: 'CANCELADA' }),
                  'Reunião cancelada.',
                );
                definirConfirmacao(null);
              },
            });
          }}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.opcao,
            { borderTopColor: cores.bordaSuave, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="close-circle-outline" size={22} color={cores.erro} />
          <Text style={[styles.textoOpcao, { color: cores.erro }]}>Cancelar reunião</Text>
        </Pressable>
      </FolhaInferior>

      <Confirmacao
        mensagem={confirmacao?.mensagem}
        carregando={salvando !== null}
        cancelar={() => definirConfirmacao(null)}
        confirmar={() => {
          if (confirmacao) void confirmacao.acao();
        }}
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  botaoCabecalho: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  resumo: {
    gap: ESPACO.sm,
    marginHorizontal: -ESPACO.md,
    marginTop: -ESPACO.sm,
    paddingHorizontal: ESPACO.md,
    paddingTop: ESPACO.xs,
    paddingBottom: ESPACO.md,
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm + 2 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  comissao: { flex: 1, fontFamily: FONTES.corpoMedio, fontSize: 13, lineHeight: 18 },
  tituloLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: ESPACO.sm },
  titulo: { ...TIPOGRAFIA.subtitulo, fontSize: 20, lineHeight: 28, flex: 1 },
  etiqueta: { marginTop: ESPACO.xs },
  info: { ...TIPOGRAFIA.corpoPequeno, flex: 1 },
  cartaoAcao: { gap: ESPACO.md - 4, padding: ESPACO.md - 2, borderWidth: 1, borderRadius: RAIO.lg },
  linhaAcao: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  iconeAcao: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0 },
  legenda: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  destaque: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  botoes: { flexDirection: 'row', gap: ESPACO.sm },
  botao: { flex: 1 },
  resumoLista: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  secao: { fontFamily: FONTES.titulo, fontSize: 13, lineHeight: 18, marginBottom: -ESPACO.sm },
  lista: { borderWidth: 1, borderRadius: RAIO.lg, overflow: 'hidden' },
  faixaAguardando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    paddingHorizontal: ESPACO.md - 2,
    paddingVertical: ESPACO.sm + 2,
  },
  tituloAguardando: { fontFamily: FONTES.titulo, fontSize: 14, lineHeight: 20 },
  contagem: { flex: 0, marginLeft: 'auto' },
  pessoa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    paddingVertical: ESPACO.sm + 2,
    paddingLeft: ESPACO.md - 2,
    paddingRight: ESPACO.sm + 2,
  },
  nome: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  detalhe: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  redondo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pilula: { height: 36, paddingHorizontal: ESPACO.md - 2, borderRadius: 18, justifyContent: 'center' },
  textoPilula: { fontFamily: FONTES.corpoMedio, fontSize: 13, lineHeight: 18 },
  itemPauta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    minHeight: 52,
    paddingHorizontal: ESPACO.md - 2,
    paddingVertical: ESPACO.xs,
  },
  numero: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  textoNumero: { fontFamily: FONTES.titulo, fontSize: 12, lineHeight: 16 },
  textoPauta: { flex: 1, fontFamily: FONTES.corpo, fontSize: 15, lineHeight: 22 },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    minHeight: 56,
    paddingHorizontal: ESPACO.md,
    borderTopWidth: 1,
  },
  textoOpcao: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
});
