/**
 * Lista das comissões das organizações administradas, com busca e filtro por
 * situação. Aberta a partir de uma organização, mostra também os membros dela.
 */

import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { Opcao } from '@/components/Opcao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api, type Comissao, type Organizacao } from '@/services/api';

const FILTROS = ['Todas', 'Ativas', 'Inativas'] as const;

type MembroDaOrganizacao = NonNullable<Organizacao['membros']>[number];

export default function TelaComissoes() {
  const router = useRouter();
  const { cores } = useTema().tema;
  /** Organização escolhida no início; sem ela, a tela reúne todas as que o usuário administra. */
  const { organizacao_id: organizacaoId } = useLocalSearchParams<{ organizacao_id?: string }>();
  const [comissoes, definirComissoes] = useState<Comissao[]>([]);
  const [organizacoes, definirOrganizacoes] = useState<{ _id: string; nome: string }[]>([]);
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState('');
  const [busca, definirBusca] = useState('');
  const [filtro, definirFiltro] = useState<(typeof FILTROS)[number]>('Todas');
  const [membros, definirMembros] = useState<MembroDaOrganizacao[]>([]);
  const [erroMembros, definirErroMembros] = useState('');

  useFocusEffect(
    useCallback(() => {
      let ativa = true;
      definirCarregando(true);
      definirErro('');
      definirErroMembros('');

      void Promise.all([
        api<Comissao[]>('/comissoes'),
        api<{ _id: string; nome: string }[]>('/comissoes/organizacoes'),
        organizacaoId ? api<Organizacao>(`/organizacoes/${organizacaoId}`) : null,
      ]).then(([lista, orgs, detalhes]) => {
        if (!ativa) return;
        definirCarregando(false);
        if (!lista.ok) {
          definirErro(lista.erro);
          return;
        }
        if (!orgs.ok) {
          definirErro(orgs.erro);
          return;
        }
        definirComissoes(lista.dados);
        definirOrganizacoes(orgs.dados);

        if (detalhes && !detalhes.ok) definirErroMembros(detalhes.erro);
        if (detalhes?.ok) {
          // Membros são os que já foram aceitos; pedidos pendentes ficam na tela Membros.
          definirMembros(
            (detalhes.dados.membros ?? [])
              .filter((membro) => membro.status === 'APROVADO')
              .sort(
                (a, b) =>
                  Number(b.papel === 'ADMIN') - Number(a.papel === 'ADMIN') ||
                  a.usuario_id.nome.localeCompare(b.usuario_id.nome),
              ),
          );
        }
      });

      return () => {
        ativa = false;
      };
    }, [organizacaoId]),
  );

  const organizacaoAtual = organizacoes.find((org) => org._id === organizacaoId);
  const doContexto = organizacaoId
    ? comissoes.filter((comissao) => comissao.organizacao_id._id === organizacaoId)
    : comissoes;
  const termo = busca.trim().toLocaleLowerCase();
  const lista = doContexto.filter(
    (comissao) =>
      `${comissao.nome} ${comissao.organizacao_id.nome}`.toLocaleLowerCase().includes(termo) &&
      (filtro === 'Todas' || comissao.ativo === (filtro === 'Ativas')),
  );

  return (
    <TelaComCabecalho titulo="Comissões">
      <Text style={[styles.introducao, { color: cores.textoSuave }]}>
        {organizacaoAtual
          ? `Gerencie as comissões e equipes de ${organizacaoAtual.nome}.`
          : 'Gerencie as comissões e equipes das organizações que você administra.'}
      </Text>

      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {carregando ? <Carregando rotulo="Carregando comissões" /> : null}

      {!carregando && !erro && organizacoes.length === 0 ? (
        <EstadoVazio
          icone="shield-outline"
          mensagem="Você precisa ser administrador aprovado de uma organização autorizada para cadastrar e gerenciar comissões."
        />
      ) : null}

      {!carregando && !erro && organizacoes.length > 0 ? (
        <>
          <Botao
            titulo="Nova comissão"
            icone="add"
            aoTocar={() =>
              router.push(
                organizacaoId
                  ? { pathname: '/comissoes/nova', params: { organizacao_id: organizacaoId } }
                  : '/comissoes/nova',
              )
            }
          />

          <CampoTexto
            rotulo="Buscar comissão ou organização"
            icone="search-outline"
            value={busca}
            onChangeText={definirBusca}
            autoCorrect={false}
            returnKeyType="search"
          />

          <View style={styles.filtros}>
            {FILTROS.map((opcao) => (
              <Opcao
                key={opcao}
                titulo={opcao}
                selecionado={filtro === opcao}
                aoTocar={() => definirFiltro(opcao)}
              />
            ))}
          </View>

          {lista.length === 0 ? (
            <EstadoVazio
              icone={doContexto.length === 0 ? 'people-outline' : 'search-outline'}
              mensagem={
                doContexto.length === 0
                  ? 'Nenhuma comissão cadastrada. Toque em Nova comissão para começar.'
                  : 'Nenhuma comissão encontrada para este filtro.'
              }
            />
          ) : null}

          {lista.map((comissao) => {
            const situacao = comissao.ativo ? 'Ativa' : 'Inativa';
            const integrantes =
              comissao.membros.length === 1
                ? '1 integrante'
                : `${comissao.membros.length} integrantes`;

            return (
              <Cartao
                key={comissao._id}
                style={styles.cartao}
                rotuloAcessivel={`Abrir comissão ${comissao.nome}, ${situacao}, ${integrantes}`}
                aoTocar={() =>
                  router.push({ pathname: '/comissoes/[id]', params: { id: comissao._id } })
                }
              >
                <View style={styles.topo}>
                  <View style={[styles.icone, { backgroundColor: cores.primariaSuave }]}>
                    <Ionicons name="people-outline" size={20} color={cores.primaria} />
                  </View>
                  <View style={styles.titulos}>
                    <Text style={[styles.nome, { color: cores.texto }]}>{comissao.nome}</Text>
                    <Text style={[styles.texto, { color: cores.textoSuave }]}>
                      {comissao.organizacao_id.nome}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={cores.textoSutil} />
                </View>

                {comissao.descricao ? (
                  <Text numberOfLines={2} style={[styles.texto, { color: cores.textoSuave }]}>
                    {comissao.descricao}
                  </Text>
                ) : null}

                <View style={styles.rodape}>
                  <Etiqueta texto={situacao} tom={comissao.ativo ? 'sucesso' : 'neutro'} />
                  <View style={styles.integrantes}>
                    <Ionicons name="person-outline" size={14} color={cores.textoSutil} />
                    <Text style={[styles.legenda, { color: cores.textoSutil }]}>{integrantes}</Text>
                  </View>
                </View>
              </Cartao>
            );
          })}

          {organizacaoId ? (
            <>
              <Text style={[styles.secao, { color: cores.texto }]} accessibilityRole="header">
                Membros da organização ({membros.length})
              </Text>
              {erroMembros ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erroMembros }} /> : null}
              {!erroMembros && membros.length === 0 ? (
                <EstadoVazio icone="person-outline" mensagem="A organização ainda não tem membros." />
              ) : null}
              {membros.length > 0 ? (
                <Cartao style={styles.membros}>
                  {membros.map((membro) => (
                    <View key={membro.usuario_id._id} style={styles.membro}>
                      <Avatar nome={membro.usuario_id.nome} />
                      <View style={styles.dados}>
                        <Text style={[styles.nomeMembro, { color: cores.texto }]}>
                          {membro.usuario_id.nome}
                        </Text>
                        <Text style={[styles.texto, { color: cores.textoSuave }]}>
                          {membro.usuario_id.email}
                        </Text>
                        <View style={styles.papel}>
                          <Etiqueta
                            texto={membro.papel === 'ADMIN' ? 'Administrador' : 'Membro'}
                            tom={membro.papel === 'ADMIN' ? 'primaria' : 'neutro'}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </Cartao>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  introducao: { ...TIPOGRAFIA.corpoPequeno },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  cartao: { gap: ESPACO.md - 4 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  icone: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1 },
  nome: { fontFamily: FONTES.titulo, fontSize: 16, lineHeight: 24 },
  texto: { ...TIPOGRAFIA.corpoPequeno },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  integrantes: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.xs },
  legenda: { ...TIPOGRAFIA.legenda },
  secao: { ...TIPOGRAFIA.subtitulo, marginTop: ESPACO.sm },
  membros: { gap: ESPACO.md + 4 },
  membro: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  dados: { flex: 1 },
  nomeMembro: { fontFamily: FONTES.titulo, fontSize: 15, lineHeight: 22 },
  papel: { marginTop: ESPACO.xs + 2 },
});
