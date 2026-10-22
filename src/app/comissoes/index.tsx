import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';

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
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import { api, type Comissao, type Organizacao } from '@/services/api';

const FILTROS = ['Todas', 'Ativas', 'Inativas'] as const;

type MembroDaOrganizacao = NonNullable<Organizacao['membros']>[number];

export default function TelaComissoes() {
  const router = useRouter();
  const { cores } = useTema().tema;
  const { usuario } = useSessao();
  const { organizacao_id: organizacaoId } = useLocalSearchParams<{ organizacao_id?: string }>();
  const [comissoes, definirComissoes] = useState<Comissao[]>([]);
  const [organizacoes, definirOrganizacoes] = useState<{ _id: string; nome: string }[]>([]);
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState('');
  const [busca, definirBusca] = useState('');
  const [filtro, definirFiltro] = useState<(typeof FILTROS)[number]>('Todas');
  const [membros, definirMembros] = useState<MembroDaOrganizacao[]>([]);
  const [erroMembros, definirErroMembros] = useState('');

  const carregar = useCallback(
    async (continuar: () => boolean = () => true) => {
      definirErro('');
      definirErroMembros('');

      const [lista, orgs] = await Promise.all([
        api<Comissao[]>('/comissoes'),
        api<{ _id: string; nome: string }[]>('/comissoes/organizacoes'),
      ]);
      if (!continuar()) return;
      if (!lista.ok) {
        definirCarregando(false);
        definirErro(lista.erro);
        return;
      }
      if (!orgs.ok) {
        definirCarregando(false);
        definirErro(orgs.erro);
        return;
      }

      const administraContexto = orgs.dados.some((org) => org._id === organizacaoId);
      const detalhes = administraContexto
        ? await api<Organizacao>(`/organizacoes/${organizacaoId}`)
        : null;
      if (!continuar()) return;
      definirCarregando(false);
      definirComissoes(lista.dados);
      definirOrganizacoes(orgs.dados);

      if (detalhes && !detalhes.ok) definirErroMembros(detalhes.erro);
      if (detalhes?.ok) {
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
    },
    [organizacaoId],
  );

  useFocusEffect(
    useCallback(() => {
      let ativa = true;
      definirCarregando(true);
      void carregar(() => ativa);
      return () => {
        ativa = false;
      };
    }, [carregar]),
  );

  const organizacaoAtual = organizacoes.find((org) => org._id === organizacaoId);
  const podeCadastrar = organizacaoId ? Boolean(organizacaoAtual) : organizacoes.length > 0;
  const gerencia = (comissao: Comissao) =>
    organizacoes.some((org) => org._id === comissao.organizacao_id._id);
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
    <TelaComCabecalho titulo="Comissões" aoAtualizar={() => carregar()}>
      {podeCadastrar ? (
        <Text style={[styles.introducao, { color: cores.textoSuave }]}>
          {organizacaoAtual
            ? `Gerencie as comissões e equipes de ${organizacaoAtual.nome}.`
            : 'Gerencie as comissões e equipes das organizações que você administra.'}
        </Text>
      ) : null}

      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {carregando ? <Carregando rotulo="Carregando comissões" /> : null}

      {!carregando && !erro ? (
        <>
          {podeCadastrar ? (
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
          ) : null}

          <CampoTexto
            rotulo="Buscar"
            placeholder="Comissão"
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
                doContexto.length > 0
                  ? 'Nenhuma comissão encontrada para este filtro.'
                  : podeCadastrar
                    ? 'Nenhuma comissão cadastrada. Toque em Nova comissão para começar.'
                    : 'Você ainda não faz parte de nenhuma comissão.'
              }
            />
          ) : null}

          {lista.map((comissao) => {
            const situacao = comissao.ativo ? 'Ativa' : 'Inativa';
            const integrantes =
              comissao.membros.length === 1
                ? '1 integrante'
                : `${comissao.membros.length} integrantes`;
            const meuPapel = gerencia(comissao)
              ? null
              : comissao.membros.find((membro) => membro.usuario_id?._id === usuario?._id)?.papel;

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
                  {meuPapel ? (
                    <Etiqueta
                      texto={meuPapel === 'RESPONSAVEL' ? 'Responsável' : 'Membro'}
                      tom={meuPapel === 'RESPONSAVEL' ? 'primaria' : 'neutro'}
                    />
                  ) : null}
                  <View style={styles.integrantes}>
                    <Ionicons name="person-outline" size={14} color={cores.textoSutil} />
                    <Text style={[styles.legenda, { color: cores.textoSutil }]}>{integrantes}</Text>
                  </View>
                </View>
              </Cartao>
            );
          })}

          {organizacaoAtual ? (
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
