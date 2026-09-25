/** Tela do administrador do sistema: autoriza, revoga, edita e exclui as organizações. */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Botao } from '@/components/Botao';
import { BotaoIcone } from '@/components/BotaoIcone';
import { CampoTexto } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { Confirmacao } from '@/components/Confirmacao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta, type TomEtiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api, type Organizacao } from '@/services/api';
import {
  TAMANHO_MAXIMO_DESCRICAO,
  validarDescricao,
  validarNomeOrganizacao,
} from '@/utils/validacao';

const SITUACOES: Record<Organizacao['status'], { texto: string; tom: TomEtiqueta }> = {
  PENDENTE: { texto: 'Pendente', tom: 'alerta' },
  APROVADA: { texto: 'Aprovada', tom: 'sucesso' },
  REVOGADA: { texto: 'Revogada', tom: 'erro' },
};

/** As que aguardam autorização aparecem primeiro. */
const ORDEM: Record<Organizacao['status'], number> = { PENDENTE: 0, APROVADA: 1, REVOGADA: 2 };

export default function TelaGerenciarOrganizacoes() {
  const router = useRouter();
  const { tema } = useTema();
  const { cores } = tema;
  const [organizacoes, definirOrganizacoes] = useState<Organizacao[]>([]);
  const [carregando, definirCarregando] = useState(true);
  const [salvandoId, definirSalvandoId] = useState<string | null>(null);
  const [erro, definirErro] = useState('');
  const [editandoId, definirEditandoId] = useState<string | null>(null);
  const [nome, definirNome] = useState('');
  const [descricao, definirDescricao] = useState('');
  const [excluindo, definirExcluindo] = useState<Organizacao | null>(null);

  const erroNome = validarNomeOrganizacao(nome);
  const erroDescricao = validarDescricao(descricao);

  useEffect(() => {
    let ativa = true;

    void Promise.all([
      api<{ tipo: string }>('/usuarios/me'),
      api<Organizacao[]>('/organizacoes'),
    ]).then(([usuario, resultado]) => {
      if (!ativa) return;
      // Exclusiva do administrador do sistema, mesmo quando aberta por um link direto.
      if (usuario.ok && usuario.dados.tipo !== 'ADMIN_SISTEMA') {
        router.replace('/inicio');
        return;
      }
      definirCarregando(false);
      if (resultado.ok) definirOrganizacoes(resultado.dados);
      else definirErro(resultado.erro);
    });

    return () => {
      ativa = false;
    };
  }, [router]);

  async function atualizar(id: string, dados: Partial<Organizacao>) {
    definirSalvandoId(id);
    definirErro('');
    const resultado = await api<Organizacao>(`/organizacoes/${id}`, 'PATCH', dados);
    definirSalvandoId(null);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return false;
    }

    definirOrganizacoes((lista) =>
      lista.map((item) => (item._id === id ? resultado.dados : item)),
    );
    return true;
  }

  async function salvarEdicao(id: string) {
    if (erroNome || erroDescricao) return;
    if (await atualizar(id, { nome: nome.trim(), descricao: descricao.trim() })) {
      definirEditandoId(null);
    }
  }

  async function excluir(organizacao: Organizacao) {
    definirSalvandoId(organizacao._id);
    definirErro('');
    const resultado = await api(`/organizacoes/${organizacao._id}`, 'DELETE');
    definirSalvandoId(null);
    definirExcluindo(null);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    definirOrganizacoes((lista) => lista.filter((item) => item._id !== organizacao._id));
  }

  const ordenadas = [...organizacoes].sort((a, b) => ORDEM[a.status] - ORDEM[b.status]);

  return (
    <TelaComCabecalho titulo="Gerenciar organizações">
      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {carregando ? <Carregando rotulo="Carregando organizações" /> : null}
      {!carregando && organizacoes.length === 0 ? (
        <EstadoVazio icone="business-outline" mensagem="Nenhuma organização cadastrada." />
      ) : null}

      {ordenadas.map((organizacao) => {
        const salvando = salvandoId === organizacao._id;
        const situacao = SITUACOES[organizacao.status];

        if (editandoId === organizacao._id) {
          return (
            <Cartao key={organizacao._id} style={styles.cartao}>
              <Text style={[styles.nome, { color: cores.texto }]}>Editar organização</Text>
              <CampoTexto
                rotulo="Nome"
                icone="business-outline"
                value={nome}
                onChangeText={definirNome}
                erro={erroNome}
                editable={!salvando}
              />
              <CampoTexto
                rotulo="Descrição"
                icone="document-text-outline"
                value={descricao}
                onChangeText={definirDescricao}
                erro={erroDescricao}
                dica={`${descricao.trim().length}/${TAMANHO_MAXIMO_DESCRICAO}`}
                multiline
                maxLength={TAMANHO_MAXIMO_DESCRICAO}
                editable={!salvando}
              />
              <View style={styles.botoes}>
                <Botao
                  titulo="Salvar"
                  tituloCarregando="Salvando..."
                  carregando={salvando}
                  desabilitado={Boolean(erroNome) || Boolean(erroDescricao)}
                  compacto
                  aoTocar={() => salvarEdicao(organizacao._id)}
                  style={styles.botao}
                />
                <Botao
                  titulo="Cancelar"
                  variante="secundario"
                  desabilitado={salvando}
                  compacto
                  aoTocar={() => definirEditandoId(null)}
                  style={styles.botao}
                />
              </View>
            </Cartao>
          );
        }

        return (
          <Cartao key={organizacao._id} style={styles.cartao}>
            <View style={styles.topo}>
              <View style={styles.titulos}>
                <Text style={[styles.nome, { color: cores.texto }]}>{organizacao.nome}</Text>
                <Etiqueta texto={situacao.texto} tom={situacao.tom} />
              </View>
              <BotaoIcone
                icone="create-outline"
                rotulo="Editar"
                dica={`Editar o nome e a descrição de ${organizacao.nome}`}
                desabilitado={salvando}
                aoTocar={() => {
                  definirEditandoId(organizacao._id);
                  definirNome(organizacao.nome);
                  definirDescricao(organizacao.descricao ?? '');
                }}
              />
            </View>

            {organizacao.descricao ? (
              <Text style={[styles.texto, { color: cores.textoSuave }]}>{organizacao.descricao}</Text>
            ) : null}

            <View style={styles.autor}>
              <Ionicons name="person-outline" size={14} color={cores.textoSutil} />
              <Text style={[styles.legenda, { color: cores.textoSutil }]}>
                Criada por: {organizacao.criada_por?.nome ?? '-'}
              </Text>
            </View>

            <View style={styles.botoes}>
              {organizacao.status !== 'APROVADA' ? (
                <Botao
                  titulo="Autorizar"
                  icone="checkmark"
                  compacto
                  desabilitado={salvando}
                  aoTocar={() => atualizar(organizacao._id, { status: 'APROVADA' })}
                  style={styles.botao}
                />
              ) : null}
              {organizacao.status !== 'REVOGADA' ? (
                <Botao
                  titulo="Revogar"
                  icone="ban-outline"
                  variante="perigo"
                  compacto
                  desabilitado={salvando}
                  aoTocar={() => atualizar(organizacao._id, { status: 'REVOGADA' })}
                  style={styles.botao}
                />
              ) : (
                <Botao
                  titulo="Excluir"
                  rotuloAcessivel={`Excluir ${organizacao.nome}`}
                  icone="trash-outline"
                  variante="perigo"
                  compacto
                  desabilitado={salvando}
                  aoTocar={() => definirExcluindo(organizacao)}
                  style={styles.botao}
                />
              )}
            </View>
          </Cartao>
        );
      })}

      <Confirmacao
        mensagem={
          excluindo
            ? `Excluir ${excluindo.nome}? A organização e as comissões dela serão apagadas de vez.`
            : undefined
        }
        carregando={salvandoId !== null}
        cancelar={() => definirExcluindo(null)}
        confirmar={() => {
          if (excluindo) void excluir(excluindo);
        }}
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: ESPACO.md - 4 },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: ESPACO.md - 4 },
  titulos: { flex: 1, gap: ESPACO.sm },
  nome: { fontFamily: FONTES.titulo, fontSize: 16, lineHeight: 24 },
  texto: { ...TIPOGRAFIA.corpoPequeno },
  autor: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legenda: { ...TIPOGRAFIA.legenda },
  botoes: { flexDirection: 'row', gap: ESPACO.sm, marginTop: ESPACO.xs },
  botao: { flex: 1 },
});
