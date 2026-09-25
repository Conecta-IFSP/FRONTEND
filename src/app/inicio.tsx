/**
 * Tela de início. O usuário acompanha as organizações em que tem vínculo e a
 * situação de cada uma; o administrador do sistema vê só o gerenciamento.
 */

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta, type TomEtiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { ItemMenu } from '@/components/ItemMenu';
import { Logo } from '@/components/Logo';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { useSessao } from '@/contexts/SessaoContext';
import { api, type Organizacao } from '@/services/api';

type Atalho = {
  titulo: string;
  descricao: string;
  icone: keyof typeof Ionicons.glyphMap;
  destino: Href;
};

const ATALHOS: Atalho[] = [
  {
    titulo: 'Participar de uma organização',
    descricao: 'Solicite acesso às organizações aprovadas.',
    icone: 'enter-outline',
    destino: '/organizacoes/participar',
  },
  {
    titulo: 'Criar organização',
    descricao: 'Envie o cadastro e aguarde a autorização do administrador do sistema.',
    icone: 'business-outline',
    destino: '/organizacoes/cadastro',
  },
];

type Situacao = { texto: string; tom: TomEtiqueta; detalhe?: string; ordem: number };

/** Como a organização aparece para o usuário, conforme o papel dele e a situação do cadastro. */
function situacaoDa(organizacao: Organizacao): Situacao {
  const vinculo = organizacao.meu_vinculo;

  if (vinculo?.papel === 'ADMIN') {
    if (organizacao.status === 'PENDENTE') {
      return {
        texto: 'Aguardando autorização',
        tom: 'alerta',
        detalhe: 'O administrador do sistema ainda vai analisar o cadastro.',
        ordem: 1,
      };
    }
    if (organizacao.status === 'REVOGADA') {
      return {
        texto: 'Revogada',
        tom: 'erro',
        detalhe: 'O administrador do sistema revogou esta organização.',
        ordem: 5,
      };
    }
    return { texto: 'Administrador', tom: 'primaria', ordem: 0 };
  }

  if (organizacao.status === 'REVOGADA') return { texto: 'Organização revogada', tom: 'erro', ordem: 5 };
  if (vinculo?.status === 'PENDENTE') {
    return {
      texto: 'Solicitação pendente',
      tom: 'alerta',
      detalhe: 'O administrador da organização ainda vai analisar o pedido.',
      ordem: 3,
    };
  }
  if (vinculo?.status === 'REJEITADO') return { texto: 'Solicitação recusada', tom: 'erro', ordem: 4 };
  return { texto: 'Membro', tom: 'sucesso', ordem: 2 };
}

function administra(organizacao: Organizacao) {
  return (
    organizacao.status === 'APROVADA' &&
    organizacao.meu_vinculo?.papel === 'ADMIN' &&
    organizacao.meu_vinculo.status === 'APROVADO'
  );
}

export default function TelaInicio() {
  const router = useRouter();
  const { cores } = useTema().tema;
  const { usuario } = useSessao();
  const nome = usuario?.nome;
  const tipo = usuario?.tipo;
  const administradorDoSistema = tipo === 'ADMIN_SISTEMA';
  const [organizacoes, definirOrganizacoes] = useState<Organizacao[]>([]);
  const [solicitacoes, definirSolicitacoes] = useState<Record<string, number>>({});
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState('');

  useFocusEffect(
    useCallback(() => {
      let ativa = true;

      void api<Organizacao[]>('/organizacoes').then(async (resultado) => {
        if (!ativa) return;
        if (!resultado.ok) {
          definirCarregando(false);
          definirErro(resultado.erro);
          return;
        }

        // O administrador do sistema recebe todas; o usuário vê só as que tem vínculo.
        const lista = administradorDoSistema
          ? resultado.dados
          : resultado.dados.filter((item) => item.meu_vinculo && !(item.meu_vinculo.papel === 'MEMBRO' && (item.meu_vinculo.status === 'PENDENTE' || item.meu_vinculo.status === 'REJEITADO')));
        const administradas = administradorDoSistema ? [] : lista.filter(administra);
        const detalhes = await Promise.all(
          administradas.map((item) => api<Organizacao>(`/organizacoes/${item._id}`)),
        );
        if (!ativa) return;

        const pendentes: Record<string, number> = {};
        detalhes.forEach((detalhe, indice) => {
          if (!detalhe.ok) return;
          pendentes[administradas[indice]._id] =
            detalhe.dados.membros?.filter((membro) => membro.status === 'PENDENTE').length ?? 0;
        });

        definirErro('');
        definirOrganizacoes(lista);
        definirSolicitacoes(pendentes);
        definirCarregando(false);
      });

      return () => {
        ativa = false;
      };
    }, [administradorDoSistema]),
  );

  const aguardandoAutorizacao = organizacoes.filter((item) => item.status === 'PENDENTE').length;
  const minhas = [...organizacoes].sort((a, b) => situacaoDa(a).ordem - situacaoDa(b).ordem);

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.fundo }]} edges={['top', 'bottom']}>
      <View style={styles.cabecalho}>
        <Logo variante="simbolo" largura={40} />

        <Pressable
          onPress={() => router.push('/perfil')}
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
          hitSlop={8}
          style={({ pressed }) => [
            styles.perfil,
            { backgroundColor: cores.superficie, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="person-circle-outline" size={20} color={cores.primaria} />
          <Text style={[styles.textoPerfil, { color: cores.texto }]}>Perfil</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={[styles.saudacao, { color: cores.texto }]}>
          Olá, {nome?.split(' ')[0] ?? 'bem-vindo'}!
        </Text>
        <Text style={[styles.subtitulo, { color: cores.textoSuave }]}>
          O que você deseja fazer hoje?
        </Text>

        {administradorDoSistema ? (
          <View style={styles.lista}>
            <ItemMenu
              titulo="Gerenciar organizações"
              descricao={
                aguardandoAutorizacao > 0
                  ? `${aguardandoAutorizacao} ${
                      aguardandoAutorizacao === 1
                        ? 'organização aguardando'
                        : 'organizações aguardando'
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
            <Text style={[styles.secao, { color: cores.texto }]} accessibilityRole="header">
              Minhas organizações
            </Text>
            <View style={styles.lista}>
              {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
              {carregando ? <Carregando rotulo="Carregando suas organizações" /> : null}
              {!carregando && !erro && minhas.length === 0 ? (
                <EstadoVazio
                  icone="business-outline"
                  mensagem="Você ainda não participa de nenhuma organização. Peça para participar de uma ou crie a sua."
                />
              ) : null}

              {minhas.map((item) => {
                const situacao = situacaoDa(item);
                const pendentes = solicitacoes[item._id] ?? 0;

                return (
                  <Cartao key={item._id} style={styles.cartao}>
                    <View style={styles.topo}>
                      <View style={[styles.icone, { backgroundColor: cores.primariaSuave }]}>
                        <Ionicons name="business-outline" size={20} color={cores.primaria} />
                      </View>
                      <View style={styles.titulos}>
                        <Text style={[styles.nome, { color: cores.texto }]}>{item.nome}</Text>
                        <Etiqueta texto={situacao.texto} tom={situacao.tom} />
                      </View>
                    </View>

                    {situacao.detalhe ? (
                      <Text style={[styles.texto, { color: cores.textoSuave }]}>
                        {situacao.detalhe}
                      </Text>
                    ) : null}

                    {administra(item) ? (
                      <>
                        {pendentes > 0 ? (
                          <View style={styles.aviso}>
                            <Ionicons name="time-outline" size={16} color={cores.alerta} />
                            <Text style={[styles.textoAviso, { color: cores.alerta }]}>
                              {pendentes === 1
                                ? '1 solicitação de acesso aguardando análise.'
                                : `${pendentes} solicitações de acesso aguardando análise.`}
                            </Text>
                          </View>
                        ) : null}
                        <View style={styles.acoes}>
                          <Botao
                            titulo="Comissões"
                            rotuloAcessivel={`Comissões de ${item.nome}`}
                            icone="people-outline"
                            variante="secundario"
                            compacto
                            aoTocar={() =>
                              router.push({
                                pathname: '/comissoes',
                                params: { organizacao_id: item._id },
                              })
                            }
                            style={styles.acao}
                          />
                          <Botao
                            titulo="Membros"
                            rotuloAcessivel={`Membros de ${item.nome}`}
                            icone="person-add-outline"
                            variante="secundario"
                            compacto
                            aoTocar={() =>
                              router.push({
                                pathname: '/organizacoes/membros',
                                params: { organizacao_id: item._id },
                              })
                            }
                            style={styles.acao}
                          />
                        </View>
                      </>
                    ) : null}
                  </Cartao>
                );
              })}
            </View>

            <Text style={[styles.secao, { color: cores.texto }]} accessibilityRole="header">
              Encontrar ou criar
            </Text>
            <View style={styles.lista}>
              {ATALHOS.map((atalho) => (
                <ItemMenu
                  key={atalho.titulo}
                  titulo={atalho.titulo}
                  descricao={atalho.descricao}
                  icone={atalho.icone}
                  aoTocar={() => router.push(atalho.destino)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ESPACO.lg,
    paddingTop: ESPACO.sm,
  },
  perfil: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    paddingHorizontal: ESPACO.md,
    borderRadius: RAIO.circulo,
  },
  textoPerfil: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
  conteudo: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: ESPACO.lg,
    paddingBottom: ESPACO.xxl,
  },
  saudacao: { ...TIPOGRAFIA.titulo, marginTop: ESPACO.sm },
  subtitulo: { ...TIPOGRAFIA.corpoPequeno, marginTop: ESPACO.xs },
  secao: { ...TIPOGRAFIA.subtitulo, marginTop: ESPACO.lg },
  lista: { marginTop: ESPACO.md, gap: ESPACO.md },
  cartao: { gap: ESPACO.md - 4 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  icone: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1, gap: ESPACO.xs },
  nome: { fontFamily: FONTES.titulo, fontSize: 16, lineHeight: 24 },
  texto: { ...TIPOGRAFIA.corpoPequeno },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  textoAviso: { ...TIPOGRAFIA.corpoPequeno, flexShrink: 1 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  acao: { flexGrow: 1 },
});
