/**
 * Tela de participação: organizações aprovadas em que o usuário pode pedir para
 * entrar, com os pedidos pendentes e os recusados separados por filtro.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta } from '@/components/Etiqueta';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { Opcao } from '@/components/Opcao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api, type Organizacao } from '@/services/api';

type Filtro = 'disponiveis' | 'pendentes' | 'recusadas';

const FILTROS: {
  valor: Filtro;
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  resumo: (quantidade: number) => string;
  vazio: string;
}[] = [
  {
    valor: 'disponiveis',
    titulo: 'Disponíveis',
    icone: 'enter-outline',
    resumo: (n) => (n === 1 ? '1 organização para pedir acesso.' : `${n} organizações para pedir acesso.`),
    vazio: 'Não há novas organizações para participar.',
  },
  {
    valor: 'pendentes',
    titulo: 'Pendentes',
    icone: 'time-outline',
    resumo: (n) => (n === 1 ? '1 pedido aguardando análise.' : `${n} pedidos aguardando análise.`),
    vazio: 'Você não tem pedidos aguardando análise.',
  },
  {
    valor: 'recusadas',
    titulo: 'Recusadas',
    icone: 'close-circle-outline',
    resumo: (n) => (n === 1 ? '1 pedido recusado.' : `${n} pedidos recusados.`),
    vazio: 'Nenhum pedido foi recusado.',
  },
];

function filtroDa(organizacao: Organizacao): Filtro {
  if (!organizacao.meu_vinculo) return 'disponiveis';
  return organizacao.meu_vinculo.status === 'PENDENTE' ? 'pendentes' : 'recusadas';
}

export default function TelaParticiparOrganizacao() {
  const { cores } = useTema().tema;
  const [organizacoes, definirOrganizacoes] = useState<Organizacao[]>([]);
  const [filtro, definirFiltro] = useState<Filtro>('disponiveis');
  const [carregando, definirCarregando] = useState(true);
  const [enviandoId, definirEnviandoId] = useState<string | null>(null);
  const [aviso, definirAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    let ativa = true;

    void api<Organizacao[]>('/organizacoes').then((resultado) => {
      if (!ativa) return;
      definirCarregando(false);
      // Onde o usuário já é membro ou administrador aparece só no início.
      if (resultado.ok) {
        definirOrganizacoes(
          resultado.dados.filter(
            (org) =>
              org.status === 'APROVADA' &&
              (!org.meu_vinculo ||
                org.meu_vinculo.status === 'PENDENTE' ||
                org.meu_vinculo.status === 'REJEITADO'),
          ),
        );
      } else {
        definirAviso({ tom: 'erro', mensagem: resultado.erro });
      }
    });

    return () => {
      ativa = false;
    };
  }, []);

  async function solicitar(organizacao: Organizacao) {
    definirEnviandoId(organizacao._id);
    definirAviso(null);
    const resultado = await api(`/organizacoes/${organizacao._id}/membros`, 'POST', {});
    definirEnviandoId(null);

    if (!resultado.ok) {
      definirAviso({ tom: 'erro', titulo: 'Não foi possível solicitar', mensagem: resultado.erro });
      return;
    }

    definirOrganizacoes((lista) =>
      lista.map((item) =>
        item._id === organizacao._id
          ? { ...item, meu_vinculo: { papel: 'MEMBRO', status: 'PENDENTE' } }
          : item,
      ),
    );
    definirAviso({
      tom: 'sucesso',
      titulo: 'Solicitação enviada',
      mensagem: `O administrador de ${organizacao.nome} vai analisar o pedido. Acompanhe em Pendentes.`,
    });
  }

  const atual = FILTROS.find((item) => item.valor === filtro)!;
  const lista = organizacoes.filter((org) => filtroDa(org) === filtro);

  return (
    <TelaComCabecalho titulo="Participar de uma organização">
      <View style={styles.filtros}>
        {FILTROS.map((opcao) => (
          <Opcao
            key={opcao.valor}
            titulo={opcao.titulo}
            icone={opcao.icone}
            selecionado={filtro === opcao.valor}
            aoTocar={() => definirFiltro(opcao.valor)}
            empilhado
            style={styles.filtro}
          />
        ))}
      </View>

      {aviso ? <FaixaAviso aviso={aviso} /> : null}
      {carregando ? <Carregando rotulo="Carregando organizações" /> : null}

      {!carregando && lista.length === 0 ? (
        <EstadoVazio icone={atual.icone} mensagem={atual.vazio} />
      ) : null}
      {!carregando && lista.length > 0 ? (
        <Text style={[styles.resumo, { color: cores.textoSuave }]}>{atual.resumo(lista.length)}</Text>
      ) : null}

      {lista.map((organizacao) => (
        <Cartao key={organizacao._id} style={styles.cartao}>
          <View style={styles.topo}>
            <View style={[styles.icone, { backgroundColor: cores.primariaSuave }]}>
              <Ionicons name="business-outline" size={20} color={cores.primaria} />
            </View>
            <View style={styles.titulos}>
              <Text style={[styles.nome, { color: cores.texto }]}>{organizacao.nome}</Text>
              {filtro === 'pendentes' ? <Etiqueta texto="Solicitação pendente" tom="alerta" /> : null}
              {filtro === 'recusadas' ? <Etiqueta texto="Solicitação recusada" tom="erro" /> : null}
            </View>
          </View>

          {organizacao.descricao ? (
            <Text style={[styles.texto, { color: cores.textoSuave }]}>{organizacao.descricao}</Text>
          ) : null}

          {filtro === 'disponiveis' ? (
            <Botao
              titulo="Pedir para participar"
              tituloCarregando="Enviando..."
              rotuloAcessivel={`Pedir para participar de ${organizacao.nome}`}
              icone="enter-outline"
              carregando={enviandoId === organizacao._id}
              aoTocar={() => solicitar(organizacao)}
              style={styles.botao}
            />
          ) : null}
        </Cartao>
      ))}
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  filtros: { flexDirection: 'row', gap: ESPACO.sm },
  filtro: { flex: 1 },
  resumo: { ...TIPOGRAFIA.corpoPequeno },
  cartao: { gap: ESPACO.md - 4 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  icone: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1, gap: ESPACO.xs },
  nome: { fontFamily: FONTES.titulo, fontSize: 16, lineHeight: 24 },
  texto: { ...TIPOGRAFIA.corpoPequeno },
  botao: { marginTop: ESPACO.xs },
});
