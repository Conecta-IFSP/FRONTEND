import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, useWatch } from 'react-hook-form';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { CampoTexto, CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { Confirmacao } from '@/components/Confirmacao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { Opcao } from '@/components/Opcao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import {
  api,
  type Comissao,
  type PapelComissao,
  type PessoaComissao,
  type Resultado,
} from '@/services/api';
import { TAMANHO_MAXIMO_DESCRICAO, validarDescricao, validarNomeComissao } from '@/utils/validacao';

const PAPEIS: { valor: PapelComissao; rotulo: string }[] = [
  { valor: 'MEMBRO', rotulo: 'Membro' },
  { valor: 'RESPONSAVEL', rotulo: 'Responsável' },
];

type AcaoPendente = {
  mensagem: string;
  acao: () => Promise<Resultado<Comissao>>;
  sucesso: string;
};

type Carga = {
  comissao: Resultado<Comissao>;
  equipe: Resultado<PessoaComissao[]> | null;
  gerencia: boolean;
};

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
  const [sucesso, definirSucesso] = useState(
    criada === '1' ? 'Comissão cadastrada! Adicione os integrantes abaixo.' : '',
  );

  const buscar = useCallback(async (): Promise<Carga> => {
    const [resultado, administradas] = await Promise.all([
      api<Comissao>(`/comissoes/${id}`),
      api<{ _id: string }[]>('/comissoes/organizacoes'),
    ]);
    if (!resultado.ok) return { comissao: resultado, equipe: null, gerencia: false };
    const gerencia =
      administradas.ok &&
      administradas.dados.some((org) => org._id === resultado.dados.organizacao_id._id);
    if (!gerencia) return { comissao: resultado, equipe: null, gerencia };
    const equipe = await api<PessoaComissao[]>(
      `/comissoes/organizacoes/${resultado.dados.organizacao_id._id}/membros`,
    );
    return { comissao: resultado, equipe, gerencia };
  }, [id]);

  const aplicar = useCallback(({ comissao: resultado, equipe, gerencia: podeGerenciar }: Carga, preencherFormulario: boolean) => {
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
  }, [reset]);

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
    aplicar(await buscar(), false);
  }

  async function executar(acao: () => Promise<Resultado<Comissao>>, mensagem: string) {
    if (salvando) return;

    definirSalvando(true);
    definirErro('');
    definirSucesso('');
    const resultado = await acao();
    definirSalvando(false);
    definirConfirmacao(null);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    definirComissao(resultado.dados);
    definirSucesso(mensagem);
  }

  const salvarDados = dados.handleSubmit(({ nome, descricao: texto }) =>
    executar(
      () =>
        api<Comissao>(`/comissoes/${id}`, 'PATCH', {
          nome: nome.trim(),
          descricao: texto.trim(),
        }),
      'Dados da comissão atualizados.',
    ),
  );

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

  return (
    <TelaComCabecalho
      titulo={gerencia ? 'Gerenciar comissão' : 'Comissão'}
      aoVoltar={() => (router.canGoBack() ? router.back() : router.replace('/comissoes'))}
      aoAtualizar={atualizar}
    >
      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {sucesso ? <FaixaAviso aviso={{ tom: 'sucesso', mensagem: sucesso }} /> : null}
      {carregando ? <Carregando rotulo="Carregando comissão" /> : null}

      {comissao ? (
        <>
          <Cartao style={styles.cartao}>
            <View style={styles.topo}>
              <View style={[styles.icone, { backgroundColor: cores.primariaSuave }]}>
                <Ionicons name="people-outline" size={22} color={cores.primaria} />
              </View>
              <View style={styles.titulos}>
                <Text style={[styles.nome, { color: cores.texto }]}>{comissao.nome}</Text>
                <View style={styles.organizacao}>
                  <Ionicons name="business-outline" size={14} color={cores.textoSutil} />
                  <Text style={[styles.textoOrganizacao, { color: cores.textoSuave }]}>
                    {comissao.organizacao_id.nome}
                  </Text>
                </View>
                <Etiqueta
                  texto={comissao.ativo ? 'Ativa' : 'Inativa'}
                  tom={comissao.ativo ? 'sucesso' : 'neutro'}
                />
              </View>
            </View>

            {!gerencia && comissao.descricao ? (
              <Text style={[styles.texto, { color: cores.textoSuave }]}>{comissao.descricao}</Text>
            ) : null}

            {gerencia ? (
              <>
                <CampoTextoControlado
                  controle={dados.control}
                  nome="nome"
                  validar={validarNomeComissao}
                  rotulo="Nome da comissão *"
                  icone="people-outline"
                  maxLength={100}
                  editable={!salvando}
                />

                <CampoTextoControlado
                  controle={dados.control}
                  nome="descricao"
                  validar={validarDescricao}
                  rotulo="Descrição (opcional)"
                  icone="document-text-outline"
                  dica={`${descricao.length}/${TAMANHO_MAXIMO_DESCRICAO}`}
                  maxLength={TAMANHO_MAXIMO_DESCRICAO}
                  multiline
                  editable={!salvando}
                />

                <View style={styles.botoes}>
                  <Botao
                    titulo="Salvar comissão"
                    tituloCarregando="Salvando..."
                    icone="checkmark"
                    carregando={salvando}
                    aoTocar={() => void salvarDados()}
                  />
                  <Botao
                    titulo={comissao.ativo ? 'Desativar comissão' : 'Reativar comissão'}
                    icone={comissao.ativo ? 'power-outline' : 'refresh-outline'}
                    variante={comissao.ativo ? 'perigo' : 'secundario'}
                    desabilitado={salvando}
                    aoTocar={() =>
                      definirConfirmacao({
                        mensagem: comissao.ativo
                          ? `Desativar ${comissao.nome}? Ela poderá ser reativada depois.`
                          : `Reativar ${comissao.nome}?`,
                        acao: comissao.ativo
                          ? desativar
                          : () => api<Comissao>(`/comissoes/${id}`, 'PATCH', { ativo: true }),
                        sucesso: comissao.ativo ? 'Comissão desativada.' : 'Comissão reativada.',
                      })
                    }
                  />
                </View>
              </>
            ) : null}
          </Cartao>

          <Text style={[styles.secao, { color: cores.texto }]} accessibilityRole="header">
            Equipe ({comissao.membros.length})
          </Text>

          {gerencia && !comissao.ativo ? (
            <FaixaAviso
              aviso={{ tom: 'informacao', mensagem: 'Reative a comissão para alterar a equipe.' }}
            />
          ) : null}
          {comissao.membros.length === 0 ? (
            <EstadoVazio
              icone="people-outline"
              mensagem="Esta comissão ainda não possui integrantes."
            />
          ) : null}

          {comissao.membros.map((membro, indice) => {
            const pessoa = membro.usuario_id;
            if (!pessoa) {
              return (
                <Cartao key={indice} style={styles.pessoa}>
                  <View style={[styles.semAvatar, { backgroundColor: cores.superficieSuave }]}>
                    <Ionicons name="person-outline" size={18} color={cores.textoSutil} />
                  </View>
                  <Text style={[styles.texto, { color: cores.textoSuave }]}>
                    Usuário indisponível
                  </Text>
                </Cartao>
              );
            }

            const responsavel = membro.papel === 'RESPONSAVEL';
            const proximoPapel: PapelComissao = responsavel ? 'MEMBRO' : 'RESPONSAVEL';

            return (
              <Cartao key={pessoa._id} style={styles.cartao}>
                <View style={styles.pessoa}>
                  <Avatar nome={pessoa.nome} />
                  <View style={styles.dados}>
                    <Text style={[styles.nomePessoa, { color: cores.texto }]}>
                      {pessoa.nome}
                      {pessoa._id === usuario?._id ? ' (você)' : ''}
                    </Text>
                    <Text style={[styles.texto, { color: cores.textoSuave }]}>{pessoa.email}</Text>
                    <View style={styles.papel}>
                      <Etiqueta
                        texto={responsavel ? 'Responsável' : 'Membro'}
                        tom={responsavel ? 'primaria' : 'neutro'}
                      />
                    </View>
                  </View>
                </View>

                {gerencia ? (
                  <View style={styles.acoes}>
                    <Botao
                      titulo={responsavel ? 'Tornar membro' : 'Tornar responsável'}
                      rotuloAcessivel={
                        responsavel
                          ? `Tornar ${pessoa.nome} membro`
                          : `Tornar ${pessoa.nome} responsável`
                      }
                      variante="secundario"
                      compacto
                      desabilitado={salvando || !comissao.ativo}
                      aoTocar={() =>
                        executar(
                          () =>
                            api<Comissao>(`/comissoes/${id}/membros/${pessoa._id}`, 'PATCH', {
                              papel: proximoPapel,
                            }),
                          'Papel do integrante atualizado.',
                        )
                      }
                      style={styles.acao}
                    />
                    <Botao
                      titulo="Remover"
                      rotuloAcessivel={`Remover ${pessoa.nome}`}
                      variante="perigo"
                      compacto
                      desabilitado={salvando || !comissao.ativo}
                      aoTocar={() =>
                        definirConfirmacao({
                          mensagem: `Remover ${pessoa.nome} da comissão?`,
                          acao: () =>
                            api<Comissao>(`/comissoes/${id}/membros/${pessoa._id}`, 'DELETE'),
                          sucesso: 'Integrante removido da comissão.',
                        })
                      }
                      style={styles.acao}
                    />
                  </View>
                ) : null}
              </Cartao>
            );
          })}

          {gerencia && comissao.ativo ? (
            <>
              <Text style={[styles.secao, { color: cores.texto }]} accessibilityRole="header">
                Adicionar integrante
              </Text>

              <CampoTexto
                rotulo="Buscar por nome ou e-mail"
                icone="search-outline"
                value={busca}
                onChangeText={definirBusca}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />

              <View>
                <Text style={[styles.rotulo, { color: cores.textoSuave }]}>Adicionar como</Text>
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
              </View>

              {disponiveis.length === 0 ? (
                <EstadoVazio
                  icone="search-outline"
                  mensagem="Nenhum integrante disponível para esta busca."
                />
              ) : null}

              {disponiveis.map((pessoa) => (
                <Cartao key={pessoa._id} style={styles.cartao}>
                  <View style={styles.pessoa}>
                    <Avatar nome={pessoa.nome} />
                    <View style={styles.dados}>
                      <Text style={[styles.nomePessoa, { color: cores.texto }]}>
                        {pessoa.nome}
                      </Text>
                      <Text style={[styles.texto, { color: cores.textoSuave }]}>
                        {pessoa.email}
                      </Text>
                    </View>
                  </View>
                  <Botao
                    titulo="Adicionar"
                    rotuloAcessivel={`Adicionar ${pessoa.nome}`}
                    icone="person-add-outline"
                    variante="secundario"
                    compacto
                    desabilitado={salvando}
                    aoTocar={() =>
                      executar(
                        () =>
                          api<Comissao>(`/comissoes/${id}/membros`, 'POST', {
                            usuario_id: pessoa._id,
                            papel,
                          }),
                        'Integrante adicionado à comissão.',
                      )
                    }
                  />
                </Cartao>
              ))}
            </>
          ) : null}
        </>
      ) : null}

      <Confirmacao
        mensagem={confirmacao?.mensagem}
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
  cartao: { gap: ESPACO.md },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: ESPACO.md - 4 },
  icone: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1, gap: ESPACO.xs },
  nome: { ...TIPOGRAFIA.subtitulo },
  organizacao: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  textoOrganizacao: { ...TIPOGRAFIA.corpoPequeno, flexShrink: 1 },
  texto: { ...TIPOGRAFIA.corpoPequeno },
  botoes: { gap: ESPACO.md - 4 },
  secao: { ...TIPOGRAFIA.subtitulo, marginTop: ESPACO.sm },
  rotulo: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  pessoa: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  semAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dados: { flex: 1 },
  nomePessoa: { fontFamily: FONTES.titulo, fontSize: 15, lineHeight: 22 },
  papel: { marginTop: ESPACO.xs + 2 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  acao: { flexGrow: 1 },
});
