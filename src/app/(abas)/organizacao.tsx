import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

import { Abas } from '@/components/Abas';
import { Avatar, coresDoNome, iniciais } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Confirmacao } from '@/components/Confirmacao';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { FolhaInferior, OpcaoFolha } from '@/components/FolhaInferior';
import { ESPACO, FONTES, MARCA, RAIO } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import { api, type Comissao, type Organizacao, type Resultado, type Reuniao } from '@/services/api';
import { plural, quando } from '@/utils/reunioes';
import { mascararCodigo, validarEmail } from '@/utils/validacao';

type Aba = 'comissoes' | 'membros';
type Filtro = 'Todas' | 'Ativas' | 'Inativas';
type Membro = NonNullable<Organizacao['membros']>[number];
type Pendente = {
  mensagem: string;
  rotulo: string;
  perigo?: boolean;
  acao: () => Promise<Resultado<unknown>>;
  sucesso: string;
  depois?: () => void;
};
type Dados = {
  id: string;
  organizacao: Organizacao | null;
  membros: Membro[] | null;
  codigo: string;
  comissoes: Comissao[];
  reunioes: Reuniao[];
  momento: number;
  erro: string;
};

const FILTROS: Filtro[] = ['Todas', 'Ativas', 'Inativas'];

export default function TelaOrganizacao() {
  const router = useRouter();
  const { tema } = useTema();
  const { cores } = tema;
  const { usuario } = useSessao();
  const meuId = usuario?._id;
  const { id = '', aba: abaInicial } = useLocalSearchParams<{ id: string; aba?: string }>();
  const [dados, definirDados] = useState<Dados | null>(null);
  const [escolha, definirEscolha] = useState<{ id: string; aba: Aba } | null>(null);
  const [filtro, definirFiltro] = useState<Filtro>('Todas');
  const [busca, definirBusca] = useState('');
  const [atualizando, definirAtualizando] = useState(false);
  const [aviso, definirAviso] = useState<Aviso | null>(null);
  const [menu, definirMenu] = useState<Membro | null>(null);
  const [confirmacao, definirConfirmacao] = useState<Pendente | null>(null);
  const [executando, definirExecutando] = useState(false);
  const [salvandoId, definirSalvandoId] = useState<string | null>(null);
  const [convidarAberto, definirConvidarAberto] = useState(false);
  const [email, definirEmail] = useState('');
  const [erroEmail, definirErroEmail] = useState('');
  const [convidando, definirConvidando] = useState(false);
  const [copiado, definirCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const espera = setTimeout(() => definirCopiado(false), 2000);
    return () => clearTimeout(espera);
  }, [copiado]);

  const carregar = useCallback(async () => {
    const momento = Date.now();
    const [lista, comissoes, reunioes] = await Promise.all([
      api<Organizacao[]>('/organizacoes'),
      api<Comissao[]>(`/comissoes?organizacao_id=${encodeURIComponent(id)}`),
      api<Reuniao[]>(`/reunioes?de=${encodeURIComponent(new Date(momento).toISOString())}`),
    ]);
    const organizacao = lista.ok ? (lista.dados.find((item) => item._id === id) ?? null) : null;
    const admin =
      organizacao?.status === 'APROVADA' &&
      organizacao.meu_vinculo?.papel === 'ADMIN' &&
      organizacao.meu_vinculo.status === 'APROVADO';
    const detalhe = admin ? await api<Organizacao>(`/organizacoes/${id}`) : null;
    return {
      id,
      organizacao,
      membros: detalhe?.ok ? (detalhe.dados.membros ?? []) : null,
      codigo: detalhe?.ok ? (detalhe.dados.codigo_acesso ?? '') : '',
      comissoes: comissoes.ok ? comissoes.dados : [],
      reunioes: reunioes.ok ? reunioes.dados : [],
      momento,
      erro: !lista.ok ? lista.erro : !organizacao ? 'Organização não encontrada.' : !comissoes.ok ? comissoes.erro : '',
    };
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let ativa = true;
      void carregar().then((novos) => {
        if (ativa) definirDados(novos);
      });
      return () => {
        ativa = false;
      };
    }, [carregar]),
  );

  async function atualizar() {
    definirAtualizando(true);
    definirAviso(null);
    definirDados(await carregar());
    definirAtualizando(false);
  }

  const atual = dados?.id === id ? dados : null;
  const organizacao = atual?.organizacao ?? null;
  const membros = atual?.membros ?? null;
  const admin = membros !== null;
  const codigo = mascararCodigo(atual?.codigo ?? '');
  const aba: Aba = admin ? (escolha?.id === id ? escolha.aba : abaInicial === 'membros' ? 'membros' : 'comissoes') : 'comissoes';
  const hoje = new Date(atual?.momento ?? 0);

  const comissoes = (atual?.comissoes ?? [])
    .filter((comissao) => filtro === 'Todas' || comissao.ativo === (filtro === 'Ativas'))
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'));
  const aprovados = (membros ?? []).filter((membro) => membro.status === 'APROVADO');
  const pedidos = (membros ?? []).filter((membro) => membro.status === 'PENDENTE');
  const termo = busca.trim().toLocaleLowerCase();
  const corresponde = (membro: Membro) =>
    `${membro.usuario_id.nome} ${membro.usuario_id.email}`.toLocaleLowerCase().includes(termo);
  const ordenar = (lista: Membro[]) =>
    [...lista].sort((a, b) => a.usuario_id.nome.localeCompare(b.usuario_id.nome, 'pt-BR'));
  const administradores = ordenar(aprovados.filter((membro) => membro.papel === 'ADMIN' && corresponde(membro)));
  const comuns = ordenar(aprovados.filter((membro) => membro.papel !== 'ADMIN' && corresponde(membro)));
  const convidados = ordenar((membros ?? []).filter((membro) => membro.status === 'CONVIDADO' && corresponde(membro)));
  const recusados = ordenar((membros ?? []).filter((membro) => membro.status === 'REJEITADO' && corresponde(membro)));
  const totalAdministradores = aprovados.filter((membro) => membro.papel === 'ADMIN').length;
  const ocupado = executando || salvandoId !== null;

  function caminho(usuarioId: string, sufixo = '') {
    return `/organizacoes/${id}/membros/${usuarioId}${sufixo}`;
  }

  async function aprovar(membro: Membro) {
    definirSalvandoId(membro.usuario_id._id);
    definirAviso(null);
    const resultado = await api(caminho(membro.usuario_id._id), 'PATCH', { status: 'APROVADO' });
    definirSalvandoId(null);
    if (!resultado.ok) {
      definirAviso({ tom: 'erro', mensagem: resultado.erro });
      return;
    }
    definirAviso({ tom: 'sucesso', mensagem: `${membro.usuario_id.nome} agora é membro.` });
    definirDados(await carregar());
  }

  function pedir(pendente: Pendente) {
    definirMenu(null);
    definirAviso(null);
    definirConfirmacao(pendente);
  }

  async function confirmar() {
    if (!confirmacao || executando) return;
    definirExecutando(true);
    const resultado = await confirmacao.acao();
    definirExecutando(false);
    const { sucesso, depois } = confirmacao;
    definirConfirmacao(null);
    if (!resultado.ok) {
      definirAviso({ tom: 'erro', mensagem: resultado.erro });
      return;
    }
    definirAviso({ tom: 'sucesso', mensagem: sucesso });
    definirDados(await carregar());
    depois?.();
  }

  async function copiarCodigo() {
    await Clipboard.setStringAsync(codigo);
    definirCopiado(true);
  }

  function pedirNovoCodigo() {
    definirConvidarAberto(false);
    pedir({
      mensagem: 'Gerar um novo código? O código atual deixa de funcionar.',
      rotulo: 'Gerar',
      acao: () => api(`/organizacoes/${id}/codigo`, 'POST', {}),
      sucesso: 'Novo código gerado.',
      depois: () => definirConvidarAberto(true),
    });
  }

  async function convidar() {
    const erroValidacao = email.trim() ? validarEmail(email) : 'Informe o e-mail da pessoa.';
    if (erroValidacao) {
      definirErroEmail(erroValidacao);
      return;
    }
    definirConvidando(true);
    const resultado = await api<{ usuario: { nome: string } }>(`/organizacoes/${id}/convites`, 'POST', {
      email: email.trim(),
    });
    definirConvidando(false);
    if (!resultado.ok) {
      definirErroEmail(resultado.erro);
      return;
    }
    definirConvidarAberto(false);
    definirEmail('');
    definirAviso({ tom: 'sucesso', mensagem: `Convite enviado para ${resultado.dados.usuario.nome}.` });
    definirDados(await carregar());
  }

  function opcoesDe(membro: Membro) {
    const nome = membro.usuario_id.nome;
    const usuarioId = membro.usuario_id._id;
    const souEu = usuarioId === meuId;
    if (membro.status === 'CONVIDADO') {
      return [
        {
          icone: 'close-circle-outline' as const,
          rotulo: 'Cancelar convite',
          perigo: true,
          aoTocar: () =>
            pedir({
              mensagem: `Cancelar o convite de ${nome}?`,
              rotulo: 'Cancelar convite',
              perigo: true,
              acao: () => api(caminho(usuarioId), 'DELETE'),
              sucesso: `Convite de ${nome} cancelado.`,
            }),
        },
      ];
    }
    if (membro.status === 'REJEITADO') {
      return [
        {
          icone: 'arrow-undo-outline' as const,
          rotulo: 'Aprovar acesso',
          perigo: false,
          aoTocar: () => {
            definirMenu(null);
            void aprovar(membro);
          },
        },
        {
          icone: 'trash-outline' as const,
          rotulo: 'Excluir pedido',
          perigo: true,
          aoTocar: () =>
            pedir({
              mensagem: `Excluir o pedido de ${nome}?`,
              rotulo: 'Excluir',
              perigo: true,
              acao: () => api(caminho(usuarioId), 'DELETE'),
              sucesso: `Pedido de ${nome} excluído.`,
            }),
        },
      ];
    }
    if (membro.papel === 'ADMIN') {
      if (totalAdministradores <= 1) return [];
      return [
        {
          icone: 'shield-outline' as const,
          rotulo: souEu ? 'Deixar de ser administrador' : 'Tornar membro',
          perigo: false,
          aoTocar: () =>
            pedir({
              mensagem: souEu
                ? 'Deixar de ser administrador? Você continuará como membro.'
                : `Tornar ${nome} membro comum?`,
              rotulo: 'Confirmar',
              acao: () => api(caminho(usuarioId, '/papel'), 'PATCH', { papel: 'MEMBRO' }),
              sucesso: souEu ? 'Você não é mais administrador.' : `${nome} agora é membro comum.`,
            }),
        },
      ];
    }
    return [
      {
        icone: 'shield-checkmark-outline' as const,
        rotulo: 'Tornar administrador',
        perigo: false,
        aoTocar: () =>
          pedir({
            mensagem: `Tornar ${nome} administrador?`,
            rotulo: 'Confirmar',
            acao: () => api(caminho(usuarioId, '/papel'), 'PATCH', { papel: 'ADMIN' }),
            sucesso: `${nome} agora é administrador.`,
          }),
      },
      {
        icone: 'person-remove-outline' as const,
        rotulo: 'Remover acesso',
        perigo: true,
        aoTocar: () =>
          pedir({
            mensagem: `Remover o acesso de ${nome}? A pessoa também sairá das comissões.`,
            rotulo: 'Remover',
            perigo: true,
            acao: () => api(caminho(usuarioId), 'DELETE'),
            sucesso: `Acesso de ${nome} removido.`,
          }),
      },
    ];
  }

  function listaPessoas(titulo: string, lista: Membro[], detalhe?: string) {
    if (lista.length === 0) return null;
    return (
      <View style={styles.secao}>
        <Text style={[styles.tituloSecao, { color: cores.textoSuave }]}>
          {titulo} · {lista.length}
        </Text>
        <View style={[styles.lista, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
          {lista.map((membro, indice) => {
            const opcoes = opcoesDe(membro);
            return (
              <View
                key={membro.usuario_id._id}
                style={[styles.pessoa, indice > 0 ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null]}
              >
                <Avatar nome={membro.usuario_id.nome} colorido />
                <View style={styles.textos}>
                  <Text style={[styles.nomePessoa, { color: cores.texto }]} numberOfLines={1}>
                    {membro.usuario_id.nome}
                    {membro.usuario_id._id === meuId ? ' (você)' : ''}
                  </Text>
                  <Text style={[styles.detalhe, { color: cores.textoSuave }]} numberOfLines={1}>
                    {detalhe ?? membro.usuario_id.email}
                  </Text>
                </View>
                {opcoes.length > 0 ? (
                  <Pressable
                    onPress={() => definirMenu(membro)}
                    disabled={ocupado}
                    accessibilityRole="button"
                    accessibilityLabel={`Opções de ${membro.usuario_id.nome}`}
                    style={styles.botaoMenu}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={cores.textoSuave} />
                  </Pressable>
                ) : (
                  <View style={styles.botaoMenu} />
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  const resumo = organizacao
    ? admin
      ? `Administrador · ${plural(aprovados.length, 'membro', 'membros')} · ${plural(atual?.comissoes.length ?? 0, 'comissão', 'comissões')}`
      : `Membro · ${plural(atual?.comissoes.length ?? 0, 'comissão', 'comissões')}`
    : '';
  const corBotaoCapa = `${MARCA.preto}38`;

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.fundo }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.rolagem}
        stickyHeaderIndices={admin ? [1] : undefined}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizar}
            colors={[cores.primaria]}
            tintColor={cores.primaria}
            progressBackgroundColor={cores.superficie}
          />
        }
      >
        <View>
          <LinearGradient colors={tema.gradiente} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.capa}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.navigate('/organizacoes'))}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={({ pressed }) => [styles.botaoCapa, { backgroundColor: corBotaoCapa, opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="arrow-back" size={20} color={MARCA.branco} />
            </Pressable>
          </LinearGradient>
          <View style={styles.identidade}>
            <View
              style={[
                styles.logo,
                {
                  borderColor: cores.fundo,
                  backgroundColor: organizacao ? coresDoNome(organizacao.nome, cores).fundo : cores.superficieSuave,
                },
              ]}
            >
              <Text
                style={[
                  styles.textoLogo,
                  { color: organizacao ? coresDoNome(organizacao.nome, cores).texto : cores.textoSutil },
                ]}
              >
                {organizacao ? iniciais(organizacao.nome) : ''}
              </Text>
            </View>
            {organizacao ? (
              <>
                <Text style={[styles.nome, { color: cores.texto }]} accessibilityRole="header">
                  {organizacao.nome}
                </Text>
                <Text style={[styles.detalhe, { color: cores.textoSuave }]}>{resumo}</Text>
                {organizacao.descricao ? (
                  <Text style={[styles.descricao, { color: cores.textoSuave }]}>{organizacao.descricao}</Text>
                ) : null}
                <View style={styles.atalhos}>
                  <Pressable
                    onPress={() => router.navigate('/agenda')}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.atalho,
                      { borderColor: cores.borda, backgroundColor: cores.superficie, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={16} color={cores.primaria} />
                    <Text style={[styles.textoAtalho, { color: cores.texto }]}>Agenda</Text>
                  </Pressable>
                  {admin ? (
                    <Pressable
                      onPress={() => {
                        definirErroEmail('');
                        definirConvidarAberto(true);
                      }}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.atalho,
                        { borderColor: cores.borda, backgroundColor: cores.superficie, opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      <Ionicons name="person-add-outline" size={16} color={cores.primaria} />
                      <Text style={[styles.textoAtalho, { color: cores.texto }]}>Convidar</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        </View>

        {admin ? (
          <View style={[styles.abas, { backgroundColor: cores.fundo }]}>
            <Abas<Aba>
              abas={[
                { chave: 'comissoes', rotulo: 'Comissões' },
                { chave: 'membros', rotulo: 'Membros', contador: pedidos.length },
              ]}
              ativa={aba}
              aoEscolher={(chave) => definirEscolha({ id, aba: chave })}
            />
          </View>
        ) : null}

        <View style={styles.conteudo}>
          {!atual ? <Carregando rotulo="Carregando organização" /> : null}
          {atual?.erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: atual.erro }} /> : null}
          {aviso ? <FaixaAviso aviso={aviso} /> : null}

          {organizacao && !admin ? (
            <Text style={[styles.tituloSecao, { color: cores.textoSuave }]}>Suas comissões</Text>
          ) : null}

          {organizacao && aba === 'comissoes' ? (
            <>
              {admin ? (
                <View style={styles.filtros}>
                  {FILTROS.map((item) => {
                    const ativo = item === filtro;
                    return (
                      <Pressable
                        key={item}
                        onPress={() => definirFiltro(item)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: ativo }}
                        style={[
                          styles.filtro,
                          {
                            backgroundColor: ativo ? cores.primariaSuave : cores.superficie,
                            borderColor: ativo ? 'transparent' : cores.borda,
                          },
                        ]}
                      >
                        {ativo ? <Ionicons name="checkmark" size={16} color={cores.primaria} /> : null}
                        <Text style={[styles.textoFiltro, { color: ativo ? cores.primaria : cores.textoSuave }]}>
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {comissoes.length === 0 ? (
                <Text style={[styles.vazio, { color: cores.textoSuave }]}>Nenhuma comissão.</Text>
              ) : null}

              {comissoes.map((comissao) => {
                const meuPapel = comissao.membros.find((membro) => membro.usuario_id?._id === meuId)?.papel;
                const etiqueta = !comissao.ativo
                  ? 'Inativa'
                  : meuPapel === 'RESPONSAVEL'
                    ? 'Responsável'
                    : meuPapel === 'MEMBRO'
                      ? 'Membro'
                      : '';
                const destaque = comissao.ativo && meuPapel === 'RESPONSAVEL';
                const proxima = comissao.ativo
                  ? atual?.reunioes.find(
                      (reuniao) => reuniao.situacao === 'AGENDADA' && reuniao.comissao_id?._id === comissao._id,
                    )
                  : undefined;
                const pessoas = comissao.membros.filter((membro) => membro.usuario_id).slice(0, 3);
                return (
                  <Pressable
                    key={comissao._id}
                    onPress={() => router.push({ pathname: '/comissoes/[id]', params: { id: comissao._id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${comissao.nome}${etiqueta ? `, ${etiqueta}` : ''}`}
                    style={({ pressed }) => [
                      styles.comissao,
                      { backgroundColor: cores.superficie, borderColor: cores.bordaSuave, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <View
                      style={[
                        styles.faixa,
                        { backgroundColor: comissao.ativo ? coresDoNome(comissao.nome, cores).texto : cores.borda },
                      ]}
                    />
                    <View style={styles.corpoComissao}>
                      <View style={styles.linhaComissao}>
                        <Text
                          style={[styles.nomeComissao, { color: comissao.ativo ? cores.texto : cores.textoSutil }]}
                          numberOfLines={1}
                        >
                          {comissao.nome}
                        </Text>
                        {etiqueta ? (
                          <View
                            style={[
                              styles.etiqueta,
                              { backgroundColor: destaque ? cores.primariaSuave : cores.superficieSuave },
                            ]}
                          >
                            <Text style={[styles.textoEtiqueta, { color: destaque ? cores.primaria : cores.textoSuave }]}>
                              {etiqueta}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.linhaComissao}>
                        {pessoas.length > 0 ? (
                          <View style={styles.pilha}>
                            {pessoas.map((membro) => (
                              <Avatar
                                key={membro.usuario_id?._id}
                                nome={membro.usuario_id?.nome ?? ''}
                                tamanho={24}
                                colorido
                                style={[styles.avatarPilha, { borderColor: cores.superficie }]}
                              />
                            ))}
                          </View>
                        ) : null}
                        <Text style={[styles.detalhe, { color: cores.textoSuave }]}>
                          {plural(comissao.membros.length, 'integrante', 'integrantes')}
                        </Text>
                      </View>
                      <View style={[styles.rodapeComissao, { borderTopColor: cores.bordaSuave }]}>
                        <Ionicons name="calendar-outline" size={14} color={cores.textoSutil} />
                        <Text
                          style={[styles.detalhe, { color: proxima ? cores.texto : cores.textoSutil }]}
                          numberOfLines={1}
                        >
                          {proxima ? `Próxima: ${quando(proxima.inicio, hoje)}` : 'Sem reuniões agendadas'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </>
          ) : null}

          {admin && aba === 'membros' ? (
            <>
              <View style={[styles.busca, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
                <Ionicons name="search" size={20} color={cores.textoSutil} />
                <TextInput
                  value={busca}
                  onChangeText={definirBusca}
                  placeholder="Buscar"
                  placeholderTextColor={cores.placeholder}
                  accessibilityLabel="Buscar membro"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.entradaBusca, { color: cores.texto }]}
                />
              </View>

              {pedidos.length > 0 ? (
                <View style={[styles.lista, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
                  <View style={[styles.faixaPedidos, { backgroundColor: cores.alertaSuave }]}>
                    <Ionicons name="person-add-outline" size={18} color={cores.alerta} />
                    <Text style={[styles.tituloPedidos, { color: cores.alerta }]}>Pedidos de acesso</Text>
                    <Text style={[styles.tituloPedidos, styles.contagem, { color: cores.alerta }]}>
                      {pedidos.length}
                    </Text>
                  </View>
                  {pedidos.map((membro, indice) => (
                    <View
                      key={membro.usuario_id._id}
                      style={[styles.pessoa, indice > 0 ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null]}
                    >
                      <Avatar nome={membro.usuario_id.nome} colorido />
                      <View style={styles.textos}>
                        <Text style={[styles.nomePessoa, { color: cores.texto }]} numberOfLines={1}>
                          {membro.usuario_id.nome}
                        </Text>
                        <Text style={[styles.detalhe, { color: cores.textoSuave }]} numberOfLines={1}>
                          {membro.usuario_id.email}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          pedir({
                            mensagem: `Recusar o pedido de ${membro.usuario_id.nome}?`,
                            rotulo: 'Recusar',
                            perigo: true,
                            acao: () => api(caminho(membro.usuario_id._id), 'PATCH', { status: 'REJEITADO' }),
                            sucesso: `Pedido de ${membro.usuario_id.nome} recusado.`,
                          })
                        }
                        disabled={ocupado}
                        accessibilityRole="button"
                        accessibilityLabel={`Recusar ${membro.usuario_id.nome}`}
                        style={({ pressed }) => [
                          styles.redondo,
                          { backgroundColor: cores.superficieSuave, opacity: pressed || ocupado ? 0.6 : 1 },
                        ]}
                      >
                        <Ionicons name="close" size={20} color={cores.textoSuave} />
                      </Pressable>
                      <Pressable
                        onPress={() => void aprovar(membro)}
                        disabled={ocupado}
                        accessibilityRole="button"
                        accessibilityLabel={`Aprovar ${membro.usuario_id.nome}`}
                        style={({ pressed }) => [
                          styles.redondo,
                          { backgroundColor: cores.primaria, opacity: pressed || ocupado ? 0.6 : 1 },
                        ]}
                      >
                        <Ionicons name="checkmark" size={20} color={cores.textoSobrePrimaria} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              {listaPessoas('Administradores', administradores)}
              {listaPessoas('Membros', comuns)}
              {listaPessoas('Convites enviados', convidados, 'Aguardando resposta')}
              {listaPessoas('Pedidos recusados', recusados, 'Pedido recusado')}
            </>
          ) : null}
        </View>
      </ScrollView>

      {admin && aba === 'comissoes' ? (
        <Pressable
          onPress={() => router.push({ pathname: '/comissoes/nova', params: { organizacao_id: id } })}
          accessibilityRole="button"
          accessibilityLabel="Nova comissão"
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: pressed ? cores.primariaPressionada : cores.primaria },
            tema.sombra,
          ]}
        >
          <Ionicons name="add" size={26} color={cores.textoSobrePrimaria} />
        </Pressable>
      ) : null}

      <FolhaInferior
        visivel={Boolean(menu)}
        aoFechar={() => definirMenu(null)}
        topo={
          menu ? (
            <View style={styles.linhaComissao}>
              <Avatar nome={menu.usuario_id.nome} colorido />
              <View style={styles.textos}>
                <Text style={[styles.nomeComissao, { color: cores.texto }]}>{menu.usuario_id.nome}</Text>
                <Text style={[styles.detalhe, { color: cores.textoSuave }]}>{menu.usuario_id.email}</Text>
              </View>
            </View>
          ) : null
        }
      >
        {menu
          ? opcoesDe(menu).map((opcao) => (
              <OpcaoFolha
                key={opcao.rotulo}
                icone={opcao.icone}
                rotulo={opcao.rotulo}
                perigo={opcao.perigo}
                aoTocar={opcao.aoTocar}
              />
            ))
          : null}
      </FolhaInferior>

      <FolhaInferior visivel={convidarAberto} titulo="Convidar" aoFechar={() => definirConvidarAberto(false)}>
        <View style={styles.formulario}>
          <CampoTexto
            rotulo="E-mail da pessoa"
            icone="mail-outline"
            value={email}
            onChangeText={(texto) => {
              definirEmail(texto);
              definirErroEmail('');
            }}
            erro={erroEmail || null}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={() => void convidar()}
            editable={!convidando}
            compacto
          />
          <Botao
            titulo="Enviar convite"
            tituloCarregando="Enviando..."
            pilula
            carregando={convidando}
            aoTocar={() => void convidar()}
          />
          {codigo ? (
            <>
              <View style={styles.separador}>
                <View style={[styles.linhaSeparador, { backgroundColor: cores.bordaSuave }]} />
                <Text style={[styles.textoSeparador, { color: cores.textoSutil }]}>ou compartilhe o código</Text>
                <View style={[styles.linhaSeparador, { backgroundColor: cores.bordaSuave }]} />
              </View>
              <View style={[styles.cartaoCodigo, { backgroundColor: cores.superficieSuave, borderColor: cores.bordaSuave }]}>
                <Text style={[styles.tituloCodigo, { color: cores.textoSuave }]}>Código de acesso</Text>
                <View style={styles.linhaCodigo}>
                  <Text style={[styles.codigo, { color: cores.texto }]} selectable>
                    {codigo}
                  </Text>
                  <Pressable
                    onPress={() => void copiarCodigo()}
                    accessibilityRole="button"
                    accessibilityLabel={copiado ? 'Código copiado' : 'Copiar código'}
                    style={({ pressed }) => [
                      styles.copiar,
                      {
                        backgroundColor: copiado ? cores.sucessoSuave : cores.primariaSuave,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={copiado ? 'checkmark' : 'copy-outline'}
                      size={20}
                      color={copiado ? cores.sucesso : cores.primaria}
                    />
                  </Pressable>
                </View>
                <View style={styles.linhaCodigo}>
                  <Pressable
                    onPress={pedirNovoCodigo}
                    disabled={ocupado}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.gerarCodigo, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Ionicons name="refresh" size={16} color={cores.primaria} />
                    <Text style={[styles.textoAtalho, { color: cores.primaria }]}>Gerar novo código</Text>
                  </Pressable>
                  {copiado ? (
                    <Text style={[styles.textoAtalho, { color: cores.sucesso }]} accessibilityLiveRegion="polite">
                      Copiado
                    </Text>
                  ) : null}
                </View>
              </View>
            </>
          ) : null}
        </View>
      </FolhaInferior>

      <Confirmacao
        mensagem={confirmacao?.mensagem}
        rotuloConfirmar={confirmacao?.rotulo}
        perigo={confirmacao?.perigo}
        carregando={executando}
        cancelar={() => definirConfirmacao(null)}
        confirmar={() => void confirmar()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  rolagem: { paddingBottom: 96 },
  capa: { height: 112, paddingTop: ESPACO.sm, paddingHorizontal: ESPACO.sm },
  botaoCapa: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  identidade: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    marginTop: -32,
    paddingHorizontal: ESPACO.md,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoLogo: { fontFamily: FONTES.titulo, fontSize: 22, lineHeight: 28 },
  nome: { fontFamily: FONTES.titulo, fontSize: 20, lineHeight: 28, marginTop: ESPACO.sm + 2 },
  descricao: { fontFamily: FONTES.corpo, fontSize: 14, lineHeight: 20, marginTop: ESPACO.sm },
  atalhos: { flexDirection: 'row', gap: ESPACO.sm, marginTop: ESPACO.md - 4 },
  atalho: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: ESPACO.md - 2,
    borderWidth: 1,
    borderRadius: 18,
  },
  textoAtalho: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
  abas: { marginTop: ESPACO.md },
  conteudo: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: ESPACO.md,
    paddingTop: ESPACO.md - 4,
    gap: ESPACO.md - 4,
  },
  secao: { gap: ESPACO.sm },
  tituloSecao: { fontFamily: FONTES.titulo, fontSize: 13, lineHeight: 18, marginTop: ESPACO.sm },
  filtros: { flexDirection: 'row', gap: ESPACO.sm },
  filtro: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: ESPACO.md - 4,
    borderRadius: RAIO.sm,
    borderWidth: 1,
  },
  textoFiltro: { fontFamily: FONTES.corpoMedio, fontSize: 13, lineHeight: 18 },
  vazio: { fontFamily: FONTES.corpo, fontSize: 14, lineHeight: 20, textAlign: 'center', marginVertical: ESPACO.lg },
  comissao: { flexDirection: 'row', borderWidth: 1, borderRadius: RAIO.lg, overflow: 'hidden' },
  faixa: { width: 4 },
  corpoComissao: { flex: 1, minWidth: 0, paddingVertical: ESPACO.md - 4, paddingHorizontal: ESPACO.md - 2, gap: ESPACO.sm + 2 },
  linhaComissao: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  nomeComissao: { flex: 1, minWidth: 0, fontFamily: FONTES.titulo, fontSize: 15, lineHeight: 22 },
  etiqueta: { borderRadius: RAIO.circulo, paddingHorizontal: ESPACO.sm + 2, paddingVertical: 2 },
  textoEtiqueta: { fontFamily: FONTES.corpoMedio, fontSize: 12, lineHeight: 16 },
  pilha: { flexDirection: 'row', paddingLeft: 6 },
  avatarPilha: { marginLeft: -6, borderWidth: 2 },
  rodapeComissao: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: ESPACO.sm + 2, borderTopWidth: 1 },
  detalhe: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  busca: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm + 2,
    paddingHorizontal: ESPACO.md,
    borderRadius: 22,
    borderWidth: 1,
  },
  entradaBusca: { flex: 1, minWidth: 0, height: 44, fontFamily: FONTES.corpo, fontSize: 15, outlineWidth: 0 },
  lista: { borderWidth: 1, borderRadius: RAIO.lg, overflow: 'hidden' },
  faixaPedidos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    paddingHorizontal: ESPACO.md - 2,
    paddingVertical: ESPACO.sm + 2,
  },
  tituloPedidos: { fontFamily: FONTES.titulo, fontSize: 14, lineHeight: 20 },
  contagem: { marginLeft: 'auto' },
  pessoa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    paddingVertical: ESPACO.sm + 2,
    paddingLeft: ESPACO.md - 2,
    paddingRight: ESPACO.xs,
  },
  textos: { flex: 1, minWidth: 0 },
  nomePessoa: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  botaoMenu: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  redondo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  formulario: { paddingHorizontal: ESPACO.md, paddingBottom: ESPACO.sm, gap: ESPACO.md },
  separador: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  linhaSeparador: { flex: 1, height: 1 },
  textoSeparador: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  cartaoCodigo: {
    borderWidth: 1,
    borderRadius: RAIO.lg,
    paddingTop: ESPACO.md - 4,
    paddingBottom: ESPACO.xs,
    paddingLeft: ESPACO.md - 2,
    paddingRight: ESPACO.sm,
    gap: 2,
  },
  tituloCodigo: { fontFamily: FONTES.titulo, fontSize: 13, lineHeight: 18 },
  linhaCodigo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ESPACO.sm },
  codigo: { flex: 1, minWidth: 0, fontFamily: FONTES.titulo, fontSize: 24, lineHeight: 32, letterSpacing: 2 },
  copiar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  gerarCodigo: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: ESPACO.sm },
  fab: {
    position: 'absolute',
    right: ESPACO.md,
    bottom: ESPACO.lg,
    width: 56,
    height: 56,
    borderRadius: RAIO.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
