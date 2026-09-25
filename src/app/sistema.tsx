/**
 * Painel do administrador do sistema: status do servidor (memória, CPU e
 * banco de dados), relatórios gerais, dados de teste e reset completo.
 */

import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { Confirmacao } from '@/components/Confirmacao';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';

type Status = {
  servidor: {
    memoria: { total_mb: number; livre_mb: number; uso_percentual: number };
    cpu: { nucleos: number; carga_media_1min: number };
    tempo_ativo_segundos: number;
  };
  banco_de_dados: {
    conectado: boolean;
    colecoes: { usuarios: number; organizacoes: number; comissoes: number };
  };
};

type Relatorios = {
  usuarios: { total: number; ativos: number };
  organizacoes: { total: number; pendentes: number; aprovadas: number };
  comissoes: { total: number; ativas: number };
};

/** Formata segundos de uptime como "Xh Ymin", já que o servidor devolve o total em segundos. */
function formatarTempoAtivo(segundos: number) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  return `${horas}h ${minutos}min`;
}

/** Um número/rótulo dentro da grade — rótulo curto em cima, valor embaixo, sem depender de largura de texto. */
function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  const { cores } = useTema().tema;
  return (
    <View style={styles.metrica}>
      <Text style={[styles.rotulo, { color: cores.textoSuave }]}>{rotulo}</Text>
      <Text style={[styles.valor, { color: cores.texto }]} numberOfLines={2}>
        {valor}
      </Text>
    </View>
  );
}

/** Uma coluna de relatório: título do tópico (Usuários/Organizações/Comissões) com seus números empilhados embaixo. */
function ColunaRelatorio({ titulo, itens }: { titulo: string; itens: { rotulo: string; valor: string }[] }) {
  const { cores } = useTema().tema;
  return (
    <View style={styles.coluna}>
      <Text style={[styles.tituloColuna, { color: cores.primaria }]}>{titulo}</Text>
      <View style={styles.itensColuna}>
        {itens.map((item) => (
          <View key={item.rotulo}>
            <Text style={[styles.rotulo, { color: cores.textoSuave }]}>{item.rotulo}</Text>
            <Text style={[styles.valor, { color: cores.texto }]} numberOfLines={2}>
              {item.valor}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function TelaSistema() {
  const { tema } = useTema();
  const { cores } = tema;

  const [status, definirStatus] = useState<Status | null>(null);
  const [relatorios, definirRelatorios] = useState<Relatorios | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [aviso, definirAviso] = useState<Aviso | null>(null);

  const [acaoEmAndamento, definirAcaoEmAndamento] = useState<string | null>(null);
  const [confirmacaoReset, definirConfirmacaoReset] = useState(false);
  const [confirmacaoTeste, definirConfirmacaoTeste] = useState(false);

  const carregar = useCallback(async () => {
    definirCarregando(true);
    const [resultadoStatus, resultadoRelatorios] = await Promise.all([
      api<Status>('/sistema/status'),
      api<Relatorios>('/sistema/relatorios'),
    ]);
    definirCarregando(false);

    if (!resultadoStatus.ok) {
      definirAviso({ tom: 'erro', titulo: 'Não foi possível carregar o status', mensagem: resultadoStatus.erro });
      return;
    }
    if (!resultadoRelatorios.ok) {
      definirAviso({ tom: 'erro', titulo: 'Não foi possível carregar os relatórios', mensagem: resultadoRelatorios.erro });
      return;
    }

    definirAviso(null);
    definirStatus(resultadoStatus.dados);
    definirRelatorios(resultadoRelatorios.dados);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  async function popularDadosDeTeste() {
    definirAcaoEmAndamento('popular-teste');
    const resultado = await api<{ senha_padrao: string }>('/sistema/popular-teste', 'POST');
    definirAcaoEmAndamento(null);
    definirConfirmacaoTeste(false);

    definirAviso(
      resultado.ok
        ? {
            tom: 'sucesso',
            titulo: 'Dados de teste criados',
            mensagem: `3 usuários de teste criados. Senha padrão: ${resultado.dados.senha_padrao}`,
          }
        : { tom: 'erro', titulo: 'Não foi possível criar os dados de teste', mensagem: resultado.erro },
    );
    if (resultado.ok) void carregar();
  }

  async function resetarSistema() {
    definirAcaoEmAndamento('reset');
    const resultado = await api('/sistema/reset', 'POST');
    definirAcaoEmAndamento(null);
    definirConfirmacaoReset(false);

    definirAviso(
      resultado.ok
        ? { tom: 'sucesso', titulo: 'Sistema resetado', mensagem: 'Usuários, organizações e comissões foram apagados (o administrador do sistema foi mantido).' }
        : { tom: 'erro', titulo: 'Não foi possível resetar', mensagem: resultado.erro },
    );
    if (resultado.ok) void carregar();
  }

  return (
    <TelaComCabecalho titulo="Sistema">
      {aviso ? <FaixaAviso aviso={aviso} /> : null}

      {carregando ? (
        <Carregando rotulo="Carregando informações do sistema" />
      ) : (
        <>
          {status ? (
            <Cartao style={styles.cartao}>
              <Text style={[styles.titulo, { color: cores.texto }]}>Status do servidor</Text>

              <View style={styles.grade}>
                <Metrica
                  rotulo="Memória em uso"
                  valor={`${status.servidor.memoria.uso_percentual}% (${status.servidor.memoria.total_mb - status.servidor.memoria.livre_mb}/${status.servidor.memoria.total_mb} MB)`}
                />
                <Metrica
                  rotulo="CPU"
                  valor={`carga ${status.servidor.cpu.carga_media_1min} · ${status.servidor.cpu.nucleos} núcleos`}
                />
                <Metrica rotulo="Ativo há" valor={formatarTempoAtivo(status.servidor.tempo_ativo_segundos)} />
                <Metrica
                  rotulo="Banco de dados"
                  valor={status.banco_de_dados.conectado ? 'Conectado' : 'Indisponível'}
                />
              </View>
            </Cartao>
          ) : null}

          {relatorios ? (
            <Cartao style={styles.cartao}>
              <Text style={[styles.titulo, { color: cores.texto }]}>Relatórios</Text>

              <View style={styles.grade}>
                <ColunaRelatorio
                  titulo="Usuários"
                  itens={[{ rotulo: 'Ativos', valor: `${relatorios.usuarios.ativos} de ${relatorios.usuarios.total}` }]}
                />
                <ColunaRelatorio
                  titulo="Organizações"
                  itens={[
                    { rotulo: 'Aprovadas', valor: `${relatorios.organizacoes.aprovadas} de ${relatorios.organizacoes.total}` },
                    { rotulo: 'Pendentes', valor: `${relatorios.organizacoes.pendentes}` },
                  ]}
                />
                <ColunaRelatorio
                  titulo="Comissões"
                  itens={[{ rotulo: 'Ativas', valor: `${relatorios.comissoes.ativas} de ${relatorios.comissoes.total}` }]}
                />
              </View>
            </Cartao>
          ) : null}

          <Botao
            titulo="Popular dados de teste"
            variante="secundario"
            icone="flask-outline"
            aoTocar={() => definirConfirmacaoTeste(true)}
          />

          <Botao
            titulo="Resetar sistema"
            variante="perigo"
            icone="trash-outline"
            aoTocar={() => definirConfirmacaoReset(true)}
          />
        </>
      )}

      <Confirmacao
        mensagem={
          confirmacaoTeste
            ? 'Isso vai criar 3 usuários de teste (sem vínculo, em organização e em organização + comissão). Deseja continuar?'
            : undefined
        }
        confirmar={popularDadosDeTeste}
        cancelar={() => definirConfirmacaoTeste(false)}
        carregando={acaoEmAndamento === 'popular-teste'}
      />

      <Confirmacao
        mensagem={
          confirmacaoReset
            ? 'Isso vai apagar todos os usuários (exceto o administrador do sistema), organizações e comissões. Deseja continuar?'
            : undefined
        }
        confirmar={resetarSistema}
        cancelar={() => definirConfirmacaoReset(false)}
        carregando={acaoEmAndamento === 'reset'}
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: ESPACO.md - 4 },
  titulo: { ...TIPOGRAFIA.subtitulo },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.md },
  metrica: { flexBasis: '45%', flexGrow: 1, gap: 2 },
  coluna: { flexBasis: '30%', flexGrow: 1, gap: ESPACO.sm },
  tituloColuna: { ...TIPOGRAFIA.rotulo, fontSize: 13 },
  itensColuna: { gap: ESPACO.sm },
  rotulo: { ...TIPOGRAFIA.corpoPequeno, fontSize: 12 },
  valor: { ...TIPOGRAFIA.subtitulo, fontSize: 15 },
});
