/** Membros aprovados e solicitações de acesso das organizações administradas. */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { Confirmacao } from '@/components/Confirmacao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { ItemMenu } from '@/components/ItemMenu';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api, type Organizacao, type StatusVinculo } from '@/services/api';

export default function TelaMembrosOrganizacao() {
  const router = useRouter();
  const { tema } = useTema();
  const { cores } = tema;
  /** Organização escolhida no início; sem ela, a tela pede para escolher. */
  const { organizacao_id: organizacaoInicial } = useLocalSearchParams<{ organizacao_id?: string }>();
  const [administradas, definirAdministradas] = useState<Organizacao[]>([]);
  const [selecionada, definirSelecionada] = useState<Organizacao | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [salvandoId, definirSalvandoId] = useState<string | null>(null);
  const [erro, definirErro] = useState('');
  const [removendo, definirRemovendo] = useState(false);
  const [alvoRemocao, definirAlvoRemocao] = useState<{ _id: string; nome: string } | null>(null);
  const [sucesso, definirSucesso] = useState('');

  useEffect(() => {
    let ativa = true;

    void api<Organizacao[]>('/organizacoes').then(async (resultado) => {
      if (!ativa) return;
      if (!resultado.ok) {
        definirCarregando(false);
        definirErro(resultado.erro);
        return;
      }
      // A lista também traz as organizações do usuário que ainda não foram aprovadas.
      const lista = resultado.dados.filter(
        (org) =>
          org.status === 'APROVADA' &&
          org.meu_vinculo?.papel === 'ADMIN' &&
          org.meu_vinculo.status === 'APROVADO',
      );
      definirAdministradas(lista);

      const escolhida = lista.find((org) => org._id === organizacaoInicial);
      if (escolhida) {
        const detalhes = await api<Organizacao>(`/organizacoes/${escolhida._id}`);
        if (!ativa) return;
        if (detalhes.ok) definirSelecionada(detalhes.dados);
        else definirErro(detalhes.erro);
      }
      definirCarregando(false);
    });

    return () => {
      ativa = false;
    };
  }, [organizacaoInicial]);

  async function abrir(organizacao: Organizacao) {
    definirCarregando(true);
    definirErro('');
    const resultado = await api<Organizacao>(`/organizacoes/${organizacao._id}`);
    definirCarregando(false);
    if (resultado.ok) definirSelecionada(resultado.dados);
    else definirErro(resultado.erro);
  }

  async function decidir(usuarioId: string, status: StatusVinculo) {
    if (!selecionada) return;

    definirSalvandoId(usuarioId);
    definirErro('');
    const resultado = await api(
      `/organizacoes/${selecionada._id}/membros/${usuarioId}`,
      'PATCH',
      { status },
    );
    definirSalvandoId(null);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    definirSelecionada((atual) =>
      atual?._id === selecionada._id
        ? {
            ...atual,
            membros: atual.membros?.map((membro) =>
              membro.usuario_id._id === usuarioId ? { ...membro, status } : membro,
            ),
          }
        : atual,
    );
  }

  async function removerMembro() {
    if (!selecionada || !alvoRemocao || removendo) return;
    definirRemovendo(true);
    definirErro('');
    definirSucesso('');
    const resultado = await api(`/organizacoes/${selecionada._id}/membros/${alvoRemocao._id}`, 'DELETE');
    definirRemovendo(false);
    if (!resultado.ok) {
      definirAlvoRemocao(null);
      definirErro(resultado.erro);
      return;
    }
    definirSelecionada((atual) => atual?._id === selecionada._id
      ? { ...atual, membros: atual.membros?.filter((item) => item.usuario_id._id !== alvoRemocao._id) }
      : atual);
    definirSucesso(`O acesso de ${alvoRemocao.nome} foi removido desta organização e de suas comissões.`);
    definirAlvoRemocao(null);
  }

  const pendentes = selecionada?.membros?.filter((membro) => membro.status === 'PENDENTE') ?? [];
  const aprovados = (selecionada?.membros?.filter((membro) => membro.status === 'APROVADO') ?? [])
    .sort((a, b) =>
      Number(b.papel === 'ADMIN') - Number(a.papel === 'ADMIN') ||
      a.usuario_id.nome.localeCompare(b.usuario_id.nome, 'pt-BR'),
    );

  return (
    <TelaComCabecalho
      titulo={selecionada?.nome ?? 'Membros da organização'}
      aoVoltar={
        selecionada && !organizacaoInicial ? () => definirSelecionada(null) : () => router.back()
      }
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
                descricao="Ver membros e solicitações de acesso"
                icone="people-outline"
                aoTocar={() => abrir(org)}
              />
            ))}
          </>
        )
      ) : null}

      {selecionada && !carregando ? (
        <Text style={[styles.secao, { color: cores.texto }]} accessibilityRole="header">
          Solicitações pendentes ({pendentes.length})
        </Text>
      ) : null}

      {selecionada && !carregando ? (
        pendentes.length === 0 ? (
          <EstadoVazio icone="checkmark-done-outline" mensagem="Não há solicitações pendentes." />
        ) : (
          <Text style={[styles.introducao, { color: cores.textoSuave }]}>
            {pendentes.length === 1
              ? '1 solicitação aguardando análise.'
              : `${pendentes.length} solicitações aguardando análise.`}
          </Text>
        )
      ) : null}

      {selecionada && !carregando
        ? pendentes.map((membro) => {
            const salvando = salvandoId === membro.usuario_id._id;

            return (
              <Cartao key={membro.usuario_id._id} style={styles.cartao}>
                <View style={styles.pessoa}>
                  <Avatar nome={membro.usuario_id.nome} />
                  <View style={styles.dados}>
                    <Text style={[styles.nome, { color: cores.texto }]}>
                      {membro.usuario_id.nome}
                    </Text>
                    <Text style={[styles.email, { color: cores.textoSuave }]}>
                      {membro.usuario_id.email}
                    </Text>
                    <View style={styles.etiquetas}>
                      <Etiqueta texto={membro.papel === 'ADMIN' ? 'Administrador' : 'Membro'} />
                      <Etiqueta texto="Pendente" tom="alerta" />
                    </View>
                  </View>
                </View>

                <View style={styles.botoes}>
                  <Botao
                    titulo="Aprovar"
                    icone="checkmark"
                    compacto
                    desabilitado={salvando}
                    aoTocar={() => decidir(membro.usuario_id._id, 'APROVADO')}
                    style={styles.botao}
                  />
                  <Botao
                    titulo="Rejeitar"
                    icone="close"
                    variante="perigo"
                    compacto
                    desabilitado={salvando}
                    aoTocar={() => decidir(membro.usuario_id._id, 'REJEITADO')}
                    style={styles.botao}
                  />
                </View>
              </Cartao>
            );
          })
        : null}

      {selecionada && !carregando ? (
        <>
          <Text style={[styles.secao, { color: cores.texto }]} accessibilityRole="header">
            Membros aprovados ({aprovados.length})
          </Text>
          {aprovados.length === 0 ? (
            <EstadoVazio icone="people-outline" mensagem="Não há membros aprovados." />
          ) : null}
          {aprovados.map((membro) => (
            <Cartao key={membro.usuario_id._id} style={styles.cartao}>
              <View style={styles.pessoa}>
                <Avatar nome={membro.usuario_id.nome} />
                <View style={styles.dados}>
                  <Text style={[styles.nome, { color: cores.texto }]}>{membro.usuario_id.nome}</Text>
                  <Text style={[styles.email, { color: cores.textoSuave }]}>{membro.usuario_id.email}</Text>
                  <View style={styles.etiquetas}>
                    <Etiqueta
                      texto={membro.papel === 'ADMIN' ? 'Administrador' : 'Membro'}
                      tom={membro.papel === 'ADMIN' ? 'primaria' : 'neutro'}
                    />
                    <Etiqueta texto="Aprovado" tom="sucesso" />
                  </View>
                </View>
              </View>
              {membro.papel === 'MEMBRO' ? (
                <Botao
                  titulo="Remover acesso"
                  rotuloAcessivel={`Remover acesso de ${membro.usuario_id.nome}`}
                  variante="perigo"
                  icone="person-remove-outline"
                  compacto
                  desabilitado={removendo || salvandoId !== null}
                  aoTocar={() => definirAlvoRemocao(membro.usuario_id)}
                />
              ) : null}
            </Cartao>
          ))}
        </>
      ) : null}
      <Confirmacao
        mensagem={alvoRemocao && selecionada
          ? `Remover o acesso de ${alvoRemocao.nome} a ${selecionada.nome}? A pessoa também sairá das comissões desta organização. Sua conta e os vínculos com outras organizações serão preservados. Para voltar, precisará solicitar acesso e ser aprovada novamente.`
          : undefined}
        confirmar={removerMembro}
        cancelar={() => definirAlvoRemocao(null)}
        carregando={removendo}
      />
    </TelaComCabecalho>
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
  botoes: { flexDirection: 'row', gap: ESPACO.sm },
  botao: { flex: 1 },
});
