import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { Confirmacao } from '@/components/Confirmacao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta, type TomEtiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { ItemMenu } from '@/components/ItemMenu';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api, type Organizacao, type PapelOrganizacao, type Resultado } from '@/services/api';
import { validarEmail } from '@/utils/validacao';

type Membro = NonNullable<Organizacao['membros']>[number];

type AcaoPendente = {
  mensagem: string;
  acao: () => Promise<Resultado<unknown>>;
  sucesso: string;
  saiDaOrganizacao?: boolean;
};

function administra(org: Organizacao) {
  return (
    org.status === 'APROVADA' &&
    org.meu_vinculo?.papel === 'ADMIN' &&
    org.meu_vinculo.status === 'APROVADO'
  );
}

export default function TelaMembrosOrganizacao() {
  const router = useRouter();
  const { tema } = useTema();
  const { cores } = tema;
  const { organizacao_id: organizacaoInicial } = useLocalSearchParams<{ organizacao_id?: string }>();
  const [administradas, definirAdministradas] = useState<Organizacao[]>([]);
  const [selecionada, definirSelecionada] = useState<Organizacao | null>(null);
  const [meuId, definirMeuId] = useState<string | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [salvandoId, definirSalvandoId] = useState<string | null>(null);
  const [erro, definirErro] = useState('');
  const [sucesso, definirSucesso] = useState('');
  const [confirmacao, definirConfirmacao] = useState<AcaoPendente | null>(null);
  const [executando, definirExecutando] = useState(false);
  const convite = useForm<{ email: string }>({ defaultValues: { email: '' } });
  const convidando = convite.formState.isSubmitting;

  const carregarAdministradas = useCallback(async () => {
    const resultado = await api<Organizacao[]>('/organizacoes');
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return [];
    }
    const lista = resultado.dados.filter(administra);
    definirAdministradas(lista);
    return lista;
  }, []);

  const carregarDetalhes = useCallback(async (id: string) => {
    const resultado = await api<Organizacao>(`/organizacoes/${id}`);
    if (resultado.ok) definirSelecionada(resultado.dados);
    else definirErro(resultado.erro);
  }, []);

  useEffect(() => {
    void (async () => {
      const [eu, lista] = await Promise.all([
        api<{ _id: string }>('/usuarios/me'),
        carregarAdministradas(),
      ]);
      if (eu.ok) definirMeuId(eu.dados._id);
      const escolhida = lista.find((org) => org._id === organizacaoInicial);
      if (escolhida) await carregarDetalhes(escolhida._id);
      definirCarregando(false);
    })();
  }, [organizacaoInicial, carregarAdministradas, carregarDetalhes]);

  async function atualizarTela() {
    definirErro('');
    if (selecionada) await carregarDetalhes(selecionada._id);
    else await carregarAdministradas();
  }

  async function abrir(organizacao: Organizacao) {
    definirCarregando(true);
    definirErro('');
    definirSucesso('');
    await carregarDetalhes(organizacao._id);
    definirCarregando(false);
  }

  async function aprovar(membro: Membro) {
    if (!selecionada) return;
    const { _id: usuarioId, nome } = membro.usuario_id;

    definirSalvandoId(usuarioId);
    definirErro('');
    definirSucesso('');
    const resultado = await api(`/organizacoes/${selecionada._id}/membros/${usuarioId}`, 'PATCH', {
      status: 'APROVADO',
    });
    definirSalvandoId(null);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    definirSucesso(`${nome} agora é membro de ${selecionada.nome}.`);
    await carregarDetalhes(selecionada._id);
  }

  function pedirConfirmacao(acao: AcaoPendente) {
    definirErro('');
    definirSucesso('');
    definirConfirmacao(acao);
  }

  async function confirmar() {
    if (!confirmacao || !selecionada || executando) return;
    definirExecutando(true);
    const resultado = await confirmacao.acao();
    definirExecutando(false);
    const { sucesso: textoSucesso, saiDaOrganizacao } = confirmacao;
    definirConfirmacao(null);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    if (saiDaOrganizacao) {
      definirSelecionada(null);
      await carregarAdministradas();
    } else {
      await carregarDetalhes(selecionada._id);
    }
    definirSucesso(textoSucesso);
  }

  const convidar = convite.handleSubmit(async ({ email }) => {
    if (!selecionada) return;
    definirErro('');
    definirSucesso('');
    const resultado = await api<{ usuario: { nome: string } }>(
      `/organizacoes/${selecionada._id}/convites`,
      'POST',
      { email: email.trim() },
    );

    if (!resultado.ok) {
      convite.setError('email', { message: resultado.erro });
      return;
    }
    convite.reset();
    definirSucesso(`Convite enviado para ${resultado.dados.usuario.nome}.`);
    await carregarDetalhes(selecionada._id);
  });

  const membros = selecionada?.membros ?? [];
  const pendentes = membros.filter((membro) => membro.status === 'PENDENTE');
  const aprovados = membros
    .filter((membro) => membro.status === 'APROVADO')
    .sort(
      (a, b) =>
        Number(b.papel === 'ADMIN') - Number(a.papel === 'ADMIN') ||
        a.usuario_id.nome.localeCompare(b.usuario_id.nome, 'pt-BR'),
    );
  const convidados = membros.filter((membro) => membro.status === 'CONVIDADO');
  const recusados = membros.filter((membro) => membro.status === 'REJEITADO');
  const totalAdministradores = aprovados.filter((membro) => membro.papel === 'ADMIN').length;
  const ocupado = executando || salvandoId !== null;

  function caminho(usuarioId: string, sufixo = '') {
    return `/organizacoes/${selecionada?._id}/membros/${usuarioId}${sufixo}`;
  }

  function alterarPapel(membro: Membro, papel: PapelOrganizacao) {
    if (!selecionada) return;
    const { _id: usuarioId, nome } = membro.usuario_id;
    const souEu = usuarioId === meuId;
    const acao = () => api(caminho(usuarioId, '/papel'), 'PATCH', { papel });

    if (papel === 'ADMIN') {
      pedirConfirmacao({
        mensagem: `Tornar ${nome} administrador de ${selecionada.nome}?`,
        acao,
        sucesso: `${nome} agora é administrador de ${selecionada.nome}.`,
      });
    } else if (souEu) {
      pedirConfirmacao({
        mensagem: `Deixar de ser administrador de ${selecionada.nome}? Você continuará como membro.`,
        acao,
        sucesso: `Você não é mais administrador de ${selecionada.nome}.`,
        saiDaOrganizacao: true,
      });
    } else {
      pedirConfirmacao({
        mensagem: `Tornar ${nome} membro comum de ${selecionada.nome}?`,
        acao,
        sucesso: `${nome} agora é membro comum.`,
      });
    }
  }

  return (
    <TelaComCabecalho
      titulo={selecionada?.nome ?? 'Membros da organização'}
      aoVoltar={
        selecionada && !organizacaoInicial ? () => definirSelecionada(null) : () => router.back()
      }
      aoAtualizar={atualizarTela}
    >
      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {sucesso ? <FaixaAviso aviso={{ tom: 'sucesso', mensagem: sucesso }} /> : null}
      {carregando ? <Carregando /> : null}

      {!selecionada && !carregando ? (
        administradas.length === 0 ? (
          <EstadoVazio
            icone="business-outline"
            mensagem="Você ainda não administra uma organização aprovada."
          />
        ) : (
          <>
            <Text style={[styles.introducao, { color: cores.textoSuave }]}>
              Escolha a organização para consultar membros e analisar solicitações de acesso.
            </Text>
            {administradas.map((org) => (
              <ItemMenu
                key={org._id}
                titulo={org.nome}
                descricao="Ver membros, solicitações e convites"
                icone="people-outline"
                aoTocar={() => abrir(org)}
              />
            ))}
          </>
        )
      ) : null}

      {selecionada && !carregando ? (
        <>
          <Secao titulo={`Solicitações pendentes (${pendentes.length})`} />
          {pendentes.length === 0 ? (
            <EstadoVazio icone="checkmark-done-outline" mensagem="Não há solicitações pendentes." />
          ) : null}
          {pendentes.map((membro) => (
            <CartaoPessoa key={membro.usuario_id._id} membro={membro} situacao={{ texto: 'Pendente', tom: 'alerta' }}>
              <View style={styles.botoes}>
                <Botao
                  titulo="Aprovar"
                  rotuloAcessivel={`Aprovar o pedido de ${membro.usuario_id.nome}`}
                  icone="checkmark"
                  compacto
                  carregando={salvandoId === membro.usuario_id._id}
                  desabilitado={ocupado}
                  aoTocar={() => aprovar(membro)}
                  style={styles.botao}
                />
                <Botao
                  titulo="Rejeitar"
                  rotuloAcessivel={`Rejeitar o pedido de ${membro.usuario_id.nome}`}
                  icone="close"
                  variante="perigo"
                  compacto
                  desabilitado={ocupado}
                  aoTocar={() =>
                    pedirConfirmacao({
                      mensagem: `Rejeitar o pedido de ${membro.usuario_id.nome}?`,
                      acao: () => api(caminho(membro.usuario_id._id), 'PATCH', { status: 'REJEITADO' }),
                      sucesso: `Pedido de ${membro.usuario_id.nome} rejeitado.`,
                    })
                  }
                  style={styles.botao}
                />
              </View>
            </CartaoPessoa>
          ))}

          <Secao titulo={`Membros aprovados (${aprovados.length})`} />
          {aprovados.length === 0 ? (
            <EstadoVazio icone="people-outline" mensagem="Não há membros aprovados." />
          ) : null}
          {aprovados.map((membro) => {
            const souEu = membro.usuario_id._id === meuId;
            const unicoAdministrador = membro.papel === 'ADMIN' && totalAdministradores === 1;

            return (
              <CartaoPessoa
                key={membro.usuario_id._id}
                membro={membro}
                situacao={{ texto: 'Aprovado', tom: 'sucesso' }}
                voce={souEu}
              >
                {membro.papel === 'MEMBRO' ? (
                  <View style={styles.botoes}>
                    <Botao
                      titulo="Tornar administrador"
                      rotuloAcessivel={`Tornar ${membro.usuario_id.nome} administrador`}
                      variante="secundario"
                      icone="shield-checkmark-outline"
                      compacto
                      desabilitado={ocupado}
                      aoTocar={() => alterarPapel(membro, 'ADMIN')}
                      style={styles.botao}
                    />
                    <Botao
                      titulo="Remover acesso"
                      rotuloAcessivel={`Remover acesso de ${membro.usuario_id.nome}`}
                      variante="perigo"
                      icone="person-remove-outline"
                      compacto
                      desabilitado={ocupado}
                      aoTocar={() =>
                        pedirConfirmacao({
                          mensagem: `Remover ${membro.usuario_id.nome} de ${selecionada.nome}? A pessoa também sairá das comissões desta organização.`,
                          acao: () => api(caminho(membro.usuario_id._id), 'DELETE'),
                          sucesso: `Acesso de ${membro.usuario_id.nome} removido.`,
                        })
                      }
                      style={styles.botao}
                    />
                  </View>
                ) : unicoAdministrador ? null : (
                  <Botao
                    titulo={souEu ? 'Deixar de ser administrador' : 'Tornar membro'}
                    rotuloAcessivel={
                      souEu
                        ? 'Deixar de ser administrador desta organização'
                        : `Tornar ${membro.usuario_id.nome} membro comum`
                    }
                    variante="secundario"
                    icone="shield-outline"
                    compacto
                    desabilitado={ocupado}
                    aoTocar={() => alterarPapel(membro, 'MEMBRO')}
                  />
                )}
              </CartaoPessoa>
            );
          })}

          <Secao titulo="Convidar por e-mail" />
          <Text style={[styles.introducao, { color: cores.textoSuave }]}>
            A pessoa precisa ter uma conta no Conecta+.
          </Text>
          <CampoTextoControlado
            controle={convite.control}
            nome="email"
            validar={(valor) => (valor.trim() ? validarEmail(valor) : 'Informe o e-mail da pessoa.')}
            rotulo="E-mail da pessoa"
            icone="mail-outline"
            placeholder="E-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={() => void convidar()}
            editable={!convidando}
          />
          <Botao
            titulo="Enviar convite"
            tituloCarregando="Enviando..."
            icone="paper-plane-outline"
            carregando={convidando}
            desabilitado={ocupado}
            aoTocar={() => void convidar()}
          />

          {convidados.length > 0 ? <Secao titulo={`Convites enviados (${convidados.length})`} /> : null}
          {convidados.map((membro) => (
            <CartaoPessoa
              key={membro.usuario_id._id}
              membro={membro}
              situacao={{ texto: 'Aguardando resposta', tom: 'alerta' }}
            >
              <Botao
                titulo="Cancelar convite"
                rotuloAcessivel={`Cancelar o convite de ${membro.usuario_id.nome}`}
                variante="perigo"
                icone="close-circle-outline"
                compacto
                desabilitado={ocupado}
                aoTocar={() =>
                  pedirConfirmacao({
                    mensagem: `Cancelar o convite de ${membro.usuario_id.nome}?`,
                    acao: () => api(caminho(membro.usuario_id._id), 'DELETE'),
                    sucesso: `Convite para ${membro.usuario_id.nome} cancelado.`,
                  })
                }
              />
            </CartaoPessoa>
          ))}

          {recusados.length > 0 ? <Secao titulo={`Pedidos recusados (${recusados.length})`} /> : null}
          {recusados.map((membro) => (
            <CartaoPessoa key={membro.usuario_id._id} membro={membro} situacao={{ texto: 'Recusado', tom: 'erro' }}>
              <View style={styles.botoes}>
                <Botao
                  titulo="Aprovar acesso"
                  rotuloAcessivel={`Aprovar o acesso de ${membro.usuario_id.nome}`}
                  icone="arrow-undo-outline"
                  compacto
                  carregando={salvandoId === membro.usuario_id._id}
                  desabilitado={ocupado}
                  aoTocar={() => aprovar(membro)}
                  style={styles.botao}
                />
                <Botao
                  titulo="Excluir"
                  rotuloAcessivel={`Excluir o pedido de ${membro.usuario_id.nome}`}
                  variante="perigo"
                  icone="trash-outline"
                  compacto
                  desabilitado={ocupado}
                  aoTocar={() =>
                    pedirConfirmacao({
                      mensagem: `Excluir o pedido de ${membro.usuario_id.nome}?`,
                      acao: () => api(caminho(membro.usuario_id._id), 'DELETE'),
                      sucesso: `Pedido de ${membro.usuario_id.nome} excluído.`,
                    })
                  }
                  style={styles.botao}
                />
              </View>
            </CartaoPessoa>
          ))}
        </>
      ) : null}

      <Confirmacao
        mensagem={confirmacao?.mensagem}
        confirmar={() => void confirmar()}
        cancelar={() => definirConfirmacao(null)}
        carregando={executando}
      />
    </TelaComCabecalho>
  );
}

function Secao({ titulo }: { titulo: string }) {
  const { cores } = useTema().tema;
  return (
    <Text style={[styles.secao, { color: cores.texto }]} accessibilityRole="header">
      {titulo}
    </Text>
  );
}

function CartaoPessoa({
  membro,
  situacao,
  voce = false,
  children,
}: {
  membro: Membro;
  situacao: { texto: string; tom: TomEtiqueta };
  voce?: boolean;
  children?: ReactNode;
}) {
  const { cores } = useTema().tema;
  const administrador = membro.papel === 'ADMIN';

  return (
    <Cartao style={styles.cartao}>
      <View style={styles.pessoa}>
        <Avatar nome={membro.usuario_id.nome} />
        <View style={styles.dados}>
          <Text style={[styles.nome, { color: cores.texto }]}>
            {membro.usuario_id.nome}
            {voce ? ' (você)' : ''}
          </Text>
          <Text style={[styles.email, { color: cores.textoSuave }]}>{membro.usuario_id.email}</Text>
          <View style={styles.etiquetas}>
            <Etiqueta
              texto={administrador ? 'Administrador' : 'Membro'}
              tom={administrador ? 'primaria' : 'neutro'}
            />
            <Etiqueta texto={situacao.texto} tom={situacao.tom} />
          </View>
        </View>
      </View>
      {children}
    </Cartao>
  );
}

const styles = StyleSheet.create({
  introducao: { ...TIPOGRAFIA.corpoPequeno },
  secao: { ...TIPOGRAFIA.subtitulo, marginTop: ESPACO.sm },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.xs, marginTop: ESPACO.xs },
  cartao: { gap: ESPACO.md },
  pessoa: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  dados: { flex: 1 },
  nome: { fontFamily: FONTES.titulo, fontSize: 15, lineHeight: 22 },
  email: { ...TIPOGRAFIA.corpoPequeno },
  botoes: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  botao: { flexGrow: 1, flexBasis: 140 },
});
