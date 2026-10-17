import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, useWatch } from 'react-hook-form';

import { Abas } from '@/components/Abas';
import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { BotaoFlutuante } from '@/components/BotaoFlutuante';
import { CampoTexto, CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Confirmacao } from '@/components/Confirmacao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FolhaInferior, OpcaoFolha } from '@/components/FolhaInferior';
import { ItemReuniao } from '@/components/ItemReuniao';
import { Opcao } from '@/components/Opcao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import {
  api,
  type Comissao,
  type PapelComissao,
  type PessoaComissao,
  type Resultado,
  type Reuniao,
} from '@/services/api';
import { plural } from '@/utils/reunioes';
import { TAMANHO_MAXIMO_DESCRICAO, validarDescricao, validarNomeComissao } from '@/utils/validacao';

const PAPEIS: { valor: PapelComissao; rotulo: string }[] = [
  { valor: 'MEMBRO', rotulo: 'Membro' },
  { valor: 'RESPONSAVEL', rotulo: 'Responsável' },
];

type AcaoPendente = {
  mensagem: string;
  rotulo: string;
  perigo?: boolean;
  acao: () => Promise<Resultado<Comissao>>;
  sucesso: string;
};

type Carga = {
  comissao: Resultado<Comissao>;
  equipe: Resultado<PessoaComissao[]> | null;
  gerencia: boolean;
};

type Integrante = { pessoa: PessoaComissao; papel: PapelComissao };

export default function TelaComissao() {
  const router = useRouter();
  const { cores } = useTema().tema;
  const { usuario } = useSessao();
  const { id, criada } = useLocalSearchParams<{ id: string; criada?: string }>();
  const [comissao, definirComissao] = useState<Comissao | null>(null);
  const [gerencia, definirGerencia] = useState(false);
  const [pessoas, definirPessoas] = useState<PessoaComissao[]>([]);
  const dados = useForm<{ nome: string; descricao: string }>({
    defaultValues: { nome: '', descricao: '' },
  });
  const { reset } = dados;
  const descricao = useWatch({ control: dados.control, name: 'descricao' });
  const [busca, definirBusca] = useState('');
  const [papel, definirPapel] = useState<PapelComissao>('MEMBRO');
  const [confirmacao, definirConfirmacao] = useState<AcaoPendente | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [salvando, definirSalvando] = useState(false);
  const [erro, definirErro] = useState('');
  const [sucesso, definirSucesso] = useState(criada === '1' ? 'Comissão cadastrada! Adicione os integrantes.' : '');
  const [aba, definirAba] = useState<'reunioes' | 'equipe'>(criada === '1' ? 'equipe' : 'reunioes');
  const [reunioes, definirReunioes] = useState<Reuniao[]>([]);
  const [agora, definirAgora] = useState(() => Date.now());
  const [folha, definirFolha] = useState<'opcoes' | 'editar' | 'adicionar' | null>(null);
  const [escolhido, definirEscolhido] = useState<Integrante | null>(null);

  const buscarReunioes = useCallback(async () => {
    const resultado = await api<Reuniao[]>(`/reunioes?comissao_id=${encodeURIComponent(id)}`);
    return { resultado, momento: Date.now() };
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let ativa = true;
      void buscarReunioes().then(({ resultado, momento }) => {
        if (!ativa) return;
        definirAgora(momento);
        if (resultado.ok) definirReunioes(resultado.dados);
      });
      return () => {
        ativa = false;
      };
    }, [buscarReunioes]),
  );

  const buscar = useCallback(async (): Promise<Carga> => {
    const [resultado, administradas] = await Promise.all([
      api<Comissao>(`/comissoes/${id}`),
      api<{ _id: string }[]>('/comissoes/organizacoes'),
    ]);
    if (!resultado.ok) return { comissao: resultado, equipe: null, gerencia: false };
    const gerencia =
      administradas.ok && administradas.dados.some((org) => org._id === resultado.dados.organizacao_id._id);
    if (!gerencia) return { comissao: resultado, equipe: null, gerencia };
    const equipe = await api<PessoaComissao[]>(`/comissoes/organizacoes/${resultado.dados.organizacao_id._id}/membros`);
    return { comissao: resultado, equipe, gerencia };
  }, [id]);

  const aplicar = useCallback(
    ({ comissao: resultado, equipe, gerencia: podeGerenciar }: Carga, preencherFormulario: boolean) => {
      definirCarregando(false);
      if (!resultado.ok) {
        definirErro(resultado.erro);
        return;
      }
      definirComissao(resultado.dados);
      definirGerencia(podeGerenciar);
      if (preencherFormulario) {
        reset({ nome: resultado.dados.nome, descricao: resultado.dados.descricao ?? '' });
      }
      if (equipe?.ok) definirPessoas(equipe.dados);
      else if (equipe) definirErro(equipe.erro);
    },
    [reset],
  );

  useEffect(() => {
    let ativa = true;
    void buscar().then((carga) => {
      if (ativa) aplicar(carga, true);
    });
    return () => {
      ativa = false;
    };
  }, [buscar, aplicar]);

  async function atualizar() {
    definirErro('');
    const [carga, agenda] = await Promise.all([buscar(), buscarReunioes()]);
    aplicar(carga, false);
    definirAgora(agenda.momento);
    if (agenda.resultado.ok) definirReunioes(agenda.resultado.dados);
  }

  async function executar(acao: () => Promise<Resultado<Comissao>>, mensagem: string) {
    if (salvando) return false;
    definirSalvando(true);
    definirErro('');
    definirSucesso('');
    const resultado = await acao();
    definirSalvando(false);
    definirConfirmacao(null);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return false;
    }
    definirComissao(resultado.dados);
    definirSucesso(mensagem);
    return true;
  }

  const salvarDados = dados.handleSubmit(async ({ nome, descricao: texto }) => {
    const ok = await executar(
      () => api<Comissao>(`/comissoes/${id}`, 'PATCH', { nome: nome.trim(), descricao: texto.trim() }),
      'Dados da comissão atualizados.',
    );
    if (ok) definirFolha(null);
  });

  async function desativar(): Promise<Resultado<Comissao>> {
    const resultado = await api<{ comissao: Comissao }>(`/comissoes/${id}`, 'DELETE');
    return resultado.ok ? { ok: true, dados: resultado.dados.comissao } : resultado;
  }

  const termo = busca.trim().toLocaleLowerCase();
  const disponiveis = pessoas.filter(
    (pessoa) =>
      !comissao?.membros.some((membro) => membro.usuario_id?._id === pessoa._id) &&
      `${pessoa.nome} ${pessoa.email}`.toLocaleLowerCase().includes(termo),
  );
  const integrantes: Integrante[] = (comissao?.membros ?? [])
    .filter((membro): membro is { usuario_id: PessoaComissao; papel: PapelComissao } => Boolean(membro.usuario_id))
    .map((membro) => ({ pessoa: membro.usuario_id, papel: membro.papel }))
    .sort(
      (a, b) =>
        Number(b.papel === 'RESPONSAVEL') - Number(a.papel === 'RESPONSAVEL') ||
        a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR'),
    );
  const souResponsavel = Boolean(
    comissao?.ativo &&
      comissao.membros.some((membro) => membro.usuario_id?._id === usuario?._id && membro.papel === 'RESPONSAVEL'),
  );
  const proximas = reunioes.filter(
    (reuniao) => reuniao.situacao === 'AGENDADA' && new Date(reuniao.fim).getTime() > agora,
  );
  const anteriores = reunioes.filter((reuniao) => !proximas.includes(reuniao)).reverse();
  const blocos = [
    { titulo: 'Próximas', lista: proximas },
    { titulo: 'Anteriores', lista: anteriores },
  ].filter((bloco) => bloco.lista.length > 0);
  const podeEditarEquipe = gerencia && Boolean(comissao?.ativo);

  return (
    <TelaComCabecalho
      titulo={comissao?.nome ?? 'Comissão'}
      fundo="superficie"
      aoVoltar={() => (router.canGoBack() ? router.back() : router.navigate('/organizacoes'))}
      aoAtualizar={atualizar}
      acao={
        gerencia && comissao ? (
          <Pressable
            onPress={() => definirFolha('opcoes')}
            accessibilityRole="button"
            accessibilityLabel="Mais opções"
            hitSlop={4}
            style={({ pressed }) => [styles.botaoIcone, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={cores.texto} />
          </Pressable>
        ) : undefined
      }
      sobreposto={
        aba === 'reunioes' && souResponsavel ? (
          <BotaoFlutuante
            icone="add"
            rotulo="Nova reunião"
            aoTocar={() => router.push({ pathname: '/reunioes/nova', params: { comissao_id: id } })}
          />
        ) : undefined
      }
    >
      {carregando ? <Carregando rotulo="Carregando comissão" /> : null}

      {comissao ? (
        <>
          <View style={styles.identificacao}>
            <View style={styles.linhaOrganizacao}>
              <Text style={[styles.detalhe, { color: cores.textoSuave }]} numberOfLines={1}>
                {comissao.organizacao_id.nome}
              </Text>
              <Etiqueta texto={comissao.ativo ? 'Ativa' : 'Inativa'} tom={comissao.ativo ? 'sucesso' : 'neutro'} />
            </View>
            {comissao.descricao ? (
              <Text style={[styles.detalhe, { color: cores.textoSuave }]}>{comissao.descricao}</Text>
            ) : null}
          </View>

          <View style={styles.largura}>
            <Abas
              abas={[
                { chave: 'reunioes', rotulo: 'Reuniões' },
                { chave: 'equipe', rotulo: 'Equipe' },
              ]}
              ativa={aba}
              aoEscolher={definirAba}
            />
          </View>
        </>
      ) : null}

      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {sucesso ? <FaixaAviso aviso={{ tom: 'sucesso', mensagem: sucesso }} /> : null}

      {comissao && aba === 'reunioes' ? (
        <>
          {blocos.length === 0 ? (
            <EstadoVazio icone="calendar-outline" mensagem="Nenhuma reunião nesta comissão." />
          ) : null}
          {blocos.map((bloco) => (
            <View key={bloco.titulo} style={styles.largura}>
              <Text style={[styles.tituloBloco, { color: cores.textoSuave }]} accessibilityRole="header">
                {bloco.titulo}
              </Text>
              {bloco.lista.map((reuniao) => (
                <ItemReuniao
                  key={reuniao._id}
                  reuniao={reuniao}
                  usuarioId={usuario?._id}
                  agora={agora}
                  selo="mes"
                  aoTocar={() => router.push({ pathname: '/reunioes/[id]', params: { id: reuniao._id } })}
                />
              ))}
            </View>
          ))}
          {souResponsavel ? <View style={styles.espacoFlutuante} /> : null}
        </>
      ) : null}

      {comissao && aba === 'equipe' ? (
        <View style={styles.equipe}>
          {gerencia && !comissao.ativo ? (
            <FaixaAviso aviso={{ tom: 'informacao', mensagem: 'Reative a comissão para alterar a equipe.' }} />
          ) : null}
          <View style={styles.cabecalhoEquipe}>
            <Text style={[styles.detalhe, styles.total, { color: cores.textoSuave }]}>
              {plural(comissao.membros.length, 'integrante', 'integrantes')}
            </Text>
            {podeEditarEquipe ? (
              <Pressable
                onPress={() => {
                  definirBusca('');
                  definirFolha('adicionar');
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.adicionar, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="person-add-outline" size={18} color={cores.primaria} />
                <Text style={[styles.textoAdicionar, { color: cores.primaria }]}>Adicionar</Text>
              </Pressable>
            ) : null}
          </View>
          {integrantes.length === 0 ? (
            <EstadoVazio icone="people-outline" mensagem="Esta comissão ainda não possui integrantes." />
          ) : null}
          {integrantes.map((integrante) => {
            const responsavel = integrante.papel === 'RESPONSAVEL';
            return (
              <View key={integrante.pessoa._id} style={styles.pessoa}>
                <Avatar nome={integrante.pessoa.nome} />
                <View style={styles.textos}>
                  <Text style={[styles.nome, { color: cores.texto }]} numberOfLines={1}>
                    {integrante.pessoa.nome}
                    {integrante.pessoa._id === usuario?._id ? ' (você)' : ''}
                  </Text>
                  <Text style={[styles.detalhe, { color: cores.textoSuave }]} numberOfLines={1}>
                    {integrante.pessoa.email}
                  </Text>
                </View>
                <View>
                  <Etiqueta texto={responsavel ? 'Responsável' : 'Membro'} tom={responsavel ? 'primaria' : 'neutro'} />
                </View>
                {podeEditarEquipe ? (
                  <Pressable
                    onPress={() => definirEscolhido(integrante)}
                    disabled={salvando}
                    accessibilityRole="button"
                    accessibilityLabel={`Opções de ${integrante.pessoa.nome}`}
                    style={styles.botaoMenu}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={cores.textoSuave} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      <FolhaInferior visivel={folha === 'opcoes'} titulo={comissao?.nome} aoFechar={() => definirFolha(null)}>
        <OpcaoFolha
          icone="create-outline"
          rotulo="Editar dados"
          aoTocar={() => {
            if (comissao) reset({ nome: comissao.nome, descricao: comissao.descricao ?? '' });
            definirFolha('editar');
          }}
        />
        {comissao ? (
          <OpcaoFolha
            icone={comissao.ativo ? 'power-outline' : 'refresh-outline'}
            rotulo={comissao.ativo ? 'Desativar comissão' : 'Reativar comissão'}
            perigo={comissao.ativo}
            aoTocar={() => {
              definirFolha(null);
              definirConfirmacao({
                mensagem: comissao.ativo
                  ? `Desativar ${comissao.nome}? Ela poderá ser reativada depois.`
                  : `Reativar ${comissao.nome}?`,
                rotulo: comissao.ativo ? 'Desativar' : 'Reativar',
                perigo: comissao.ativo,
                acao: comissao.ativo ? desativar : () => api<Comissao>(`/comissoes/${id}`, 'PATCH', { ativo: true }),
                sucesso: comissao.ativo ? 'Comissão desativada.' : 'Comissão reativada.',
              });
            }}
          />
        ) : null}
      </FolhaInferior>

      <FolhaInferior visivel={folha === 'editar'} titulo="Editar comissão" aoFechar={() => definirFolha(null)}>
        <View style={styles.formulario}>
          <CampoTextoControlado
            controle={dados.control}
            nome="nome"
            validar={validarNomeComissao}
            rotulo="Nome"
            maxLength={100}
            editable={!salvando}
            compacto
          />
          <CampoTextoControlado
            controle={dados.control}
            nome="descricao"
            validar={validarDescricao}
            rotulo="Descrição"
            dica={`${descricao.length}/${TAMANHO_MAXIMO_DESCRICAO}`}
            maxLength={TAMANHO_MAXIMO_DESCRICAO}
            multiline
            editable={!salvando}
            compacto
          />
          <Botao
            titulo="Salvar"
            tituloCarregando="Salvando..."
            pilula
            carregando={salvando}
            aoTocar={() => void salvarDados()}
          />
        </View>
      </FolhaInferior>

      <FolhaInferior
        visivel={folha === 'adicionar'}
        titulo="Adicionar integrante"
        aoFechar={() => definirFolha(null)}
      >
        <View style={styles.formulario}>
          <CampoTexto
            rotulo="Buscar por nome ou e-mail"
            icone="search-outline"
            value={busca}
            onChangeText={definirBusca}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            compacto
          />
          <View style={styles.opcoes}>
            {PAPEIS.map((opcao) => (
              <Opcao
                key={opcao.valor}
                titulo={opcao.rotulo}
                selecionado={papel === opcao.valor}
                desabilitado={salvando}
                aoTocar={() => definirPapel(opcao.valor)}
              />
            ))}
          </View>
          {disponiveis.length === 0 ? (
            <Text style={[styles.detalhe, { color: cores.textoSuave }]}>Ninguém disponível para esta busca.</Text>
          ) : null}
        </View>
        {disponiveis.map((pessoa) => (
          <View key={pessoa._id} style={[styles.pessoa, styles.pessoaFolha, { borderTopColor: cores.bordaSuave }]}>
            <Avatar nome={pessoa.nome} />
            <View style={styles.textos}>
              <Text style={[styles.nome, { color: cores.texto }]} numberOfLines={1}>
                {pessoa.nome}
              </Text>
              <Text style={[styles.detalhe, { color: cores.textoSuave }]} numberOfLines={1}>
                {pessoa.email}
              </Text>
            </View>
            <Botao
              titulo="Adicionar"
              rotuloAcessivel={`Adicionar ${pessoa.nome}`}
              variante="secundario"
              pilula
              compacto
              desabilitado={salvando}
              aoTocar={() =>
                void executar(
                  () => api<Comissao>(`/comissoes/${id}/membros`, 'POST', { usuario_id: pessoa._id, papel }),
                  `${pessoa.nome} entrou na comissão.`,
                )
              }
            />
          </View>
        ))}
      </FolhaInferior>

      <FolhaInferior
        visivel={Boolean(escolhido)}
        aoFechar={() => definirEscolhido(null)}
        topo={
          escolhido ? (
            <View style={styles.pessoaTopo}>
              <Avatar nome={escolhido.pessoa.nome} />
              <View style={styles.textos}>
                <Text style={[styles.nomeTopo, { color: cores.texto }]}>{escolhido.pessoa.nome}</Text>
                <Text style={[styles.detalhe, { color: cores.textoSuave }]}>{escolhido.pessoa.email}</Text>
              </View>
            </View>
          ) : null
        }
      >
        {escolhido ? (
          <>
            <OpcaoFolha
              icone="shield-checkmark-outline"
              rotulo={escolhido.papel === 'RESPONSAVEL' ? 'Tornar membro' : 'Tornar responsável'}
              aoTocar={() => {
                const alvo = escolhido;
                definirEscolhido(null);
                void executar(
                  () =>
                    api<Comissao>(`/comissoes/${id}/membros/${alvo.pessoa._id}`, 'PATCH', {
                      papel: alvo.papel === 'RESPONSAVEL' ? 'MEMBRO' : 'RESPONSAVEL',
                    }),
                  'Papel do integrante atualizado.',
                );
              }}
            />
            <OpcaoFolha
              icone="person-remove-outline"
              rotulo="Remover da comissão"
              perigo
              aoTocar={() => {
                const alvo = escolhido;
                definirEscolhido(null);
                definirConfirmacao({
                  mensagem: `Remover ${alvo.pessoa.nome} da comissão?`,
                  rotulo: 'Remover',
                  perigo: true,
                  acao: () => api<Comissao>(`/comissoes/${id}/membros/${alvo.pessoa._id}`, 'DELETE'),
                  sucesso: 'Integrante removido da comissão.',
                });
              }}
            />
          </>
        ) : null}
      </FolhaInferior>

      <Confirmacao
        mensagem={confirmacao?.mensagem}
        rotuloConfirmar={confirmacao?.rotulo}
        perigo={confirmacao?.perigo}
        carregando={salvando}
        cancelar={() => definirConfirmacao(null)}
        confirmar={() => {
          if (confirmacao) void executar(confirmacao.acao, confirmacao.sucesso);
        }}
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  botaoIcone: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  identificacao: { gap: ESPACO.xs, paddingLeft: 36, marginTop: -ESPACO.sm },
  linhaOrganizacao: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  largura: { marginHorizontal: -ESPACO.md },
  detalhe: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  tituloBloco: {
    fontFamily: FONTES.titulo,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: ESPACO.md,
    paddingBottom: ESPACO.xs,
  },
  espacoFlutuante: { height: 56 },
  equipe: { gap: ESPACO.xs },
  cabecalhoEquipe: { flexDirection: 'row', alignItems: 'center' },
  total: { flex: 1 },
  adicionar: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: ESPACO.xs },
  textoAdicionar: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
  pessoa: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  pessoaFolha: { paddingHorizontal: ESPACO.md, borderTopWidth: 1 },
  pessoaTopo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  textos: { flex: 1, minWidth: 0 },
  nome: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  nomeTopo: { fontFamily: FONTES.titulo, fontSize: 15, lineHeight: 22 },
  botaoMenu: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -ESPACO.sm },
  formulario: { paddingHorizontal: ESPACO.md, paddingBottom: ESPACO.md, gap: ESPACO.md },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
});
