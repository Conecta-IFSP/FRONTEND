import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, useWatch } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { BotaoIcone } from '@/components/BotaoIcone';
import { CampoTexto, CampoTextoControlado } from '@/components/CampoTexto';
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

const ORDEM: Record<Organizacao['status'], number> = { PENDENTE: 0, APROVADA: 1, REVOGADA: 2 };

const ATRASO_BUSCA_MS = 350;

type AcaoPendente = { organizacao: Organizacao; tipo: 'revogar' | 'excluir' };

export default function TelaGerenciarOrganizacoes() {
  const router = useRouter();
  const { tema } = useTema();
  const { cores } = tema;
  const [organizacoes, definirOrganizacoes] = useState<Organizacao[]>([]);
  const [carregando, definirCarregando] = useState(true);
  const [salvandoId, definirSalvandoId] = useState<string | null>(null);
  const [erro, definirErro] = useState('');
  const [editandoId, definirEditandoId] = useState<string | null>(null);
  const edicao = useForm<{ nome: string; descricao: string }>({
    mode: 'onChange',
    defaultValues: { nome: '', descricao: '' },
  });
  const descricao = useWatch({ control: edicao.control, name: 'descricao' });
  const [acaoPendente, definirAcaoPendente] = useState<AcaoPendente | null>(null);
  const [busca, definirBusca] = useState('');
  const [termo, definirTermo] = useState('');
  const ultimaConsulta = useRef(0);

  useEffect(() => {
    let ativa = true;
    void api<{ tipo: string }>('/usuarios/me').then((usuario) => {
      if (ativa && usuario.ok && usuario.dados.tipo !== 'ADMIN_SISTEMA') router.replace('/inicio');
    });
    return () => {
      ativa = false;
    };
  }, [router]);

  const carregar = useCallback(async (termoBusca: string) => {
    const consulta = ++ultimaConsulta.current;
    const resultado = await api<Organizacao[]>(
      termoBusca ? `/organizacoes?busca=${encodeURIComponent(termoBusca)}` : '/organizacoes',
    );
    if (consulta !== ultimaConsulta.current) return;
    definirCarregando(false);
    definirTermo(termoBusca);
    if (resultado.ok) {
      definirErro('');
      definirOrganizacoes(resultado.dados);
    } else {
      definirErro(resultado.erro);
    }
  }, []);

  useEffect(() => {
    const termoBusca = busca.trim();
    const espera = setTimeout(() => void carregar(termoBusca), termoBusca ? ATRASO_BUSCA_MS : 0);
    return () => clearTimeout(espera);
  }, [busca, carregar]);

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

  const salvarEdicao = edicao.handleSubmit(async (dados) => {
    if (!editandoId) return;
    if (await atualizar(editandoId, { nome: dados.nome.trim(), descricao: dados.descricao.trim() })) {
      definirEditandoId(null);
    }
  });

  async function excluir(organizacao: Organizacao) {
    definirSalvandoId(organizacao._id);
    definirErro('');
    const resultado = await api(`/organizacoes/${organizacao._id}`, 'DELETE');
    definirSalvandoId(null);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    definirOrganizacoes((lista) => lista.filter((item) => item._id !== organizacao._id));
  }

  async function confirmarAcao() {
    if (!acaoPendente) return;
    const { organizacao, tipo } = acaoPendente;
    if (tipo === 'revogar') await atualizar(organizacao._id, { status: 'REVOGADA' });
    else await excluir(organizacao);
    definirAcaoPendente(null);
  }

  const ordenadas = [...organizacoes].sort((a, b) => ORDEM[a.status] - ORDEM[b.status]);

  return (
    <TelaComCabecalho titulo="Gerenciar organizações" aoAtualizar={() => carregar(busca.trim())}>
      <CampoTexto
        rotulo="Buscar organização"
        icone="search-outline"
        value={busca}
        onChangeText={definirBusca}
        autoCorrect={false}
        returnKeyType="search"
      />

      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {carregando ? <Carregando rotulo="Carregando organizações" /> : null}
      {!carregando && organizacoes.length === 0 ? (
        <EstadoVazio
          icone={termo ? 'search-outline' : 'business-outline'}
          mensagem={termo ? `Nenhuma organização encontrada para "${termo}".` : 'Nenhuma organização cadastrada.'}
        />
      ) : null}

      {ordenadas.map((organizacao) => {
        const salvando = salvandoId === organizacao._id;
        const situacao = SITUACOES[organizacao.status];

        if (editandoId === organizacao._id) {
          return (
            <Cartao key={organizacao._id} style={styles.cartao}>
              <Text style={[styles.nome, { color: cores.texto }]}>Editar organização</Text>
              <CampoTextoControlado
                controle={edicao.control}
                nome="nome"
                validar={validarNomeOrganizacao}
                rotulo="Nome"
                icone="business-outline"
                editable={!salvando}
              />
              <CampoTextoControlado
                controle={edicao.control}
                nome="descricao"
                validar={validarDescricao}
                rotulo="Descrição"
                icone="document-text-outline"
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
                  desabilitado={!edicao.formState.isValid}
                  compacto
                  aoTocar={() => void salvarEdicao()}
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
                  edicao.reset({ nome: organizacao.nome, descricao: organizacao.descricao ?? '' });
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
                  rotuloAcessivel={`Revogar ${organizacao.nome}`}
                  icone="ban-outline"
                  variante="perigo"
                  compacto
                  desabilitado={salvando}
                  aoTocar={() => definirAcaoPendente({ organizacao, tipo: 'revogar' })}
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
                  aoTocar={() => definirAcaoPendente({ organizacao, tipo: 'excluir' })}
                  style={styles.botao}
                />
              )}
            </View>
          </Cartao>
        );
      })}

      <Confirmacao
        mensagem={
          acaoPendente?.tipo === 'revogar'
            ? `Revogar ${acaoPendente.organizacao.nome}? Ela poderá ser autorizada novamente depois.`
            : acaoPendente?.tipo === 'excluir'
              ? `Excluir ${acaoPendente.organizacao.nome}? A organização e suas comissões serão excluídas permanentemente.`
              : undefined
        }
        carregando={salvandoId !== null}
        cancelar={() => definirAcaoPendente(null)}
        confirmar={() => void confirmarAcao()}
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
