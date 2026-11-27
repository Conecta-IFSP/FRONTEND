import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { Confirmacao } from '@/components/Confirmacao';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { versaoDoApp } from '@/utils/versao';
import pacote from '../../package.json';

type Sobre = {
  sistema: { nome: string; versao_api: string; ambiente: string; iniciada_em: string; fuso_horario: string };
  tecnologias: { nome: string; versao: string; uso: string }[];
  servidor: {
    sistema_operacional: string;
    arquitetura: string;
    cpu_modelo: string | null;
    nucleos: number;
    memoria_total_mb: number;
  };
};

type Status = {
  servidor: {
    memoria: { total_mb: number; livre_mb: number; uso_percentual: number };
    cpu: { nucleos: number; uso_percentual: number };
    tempo_ativo_segundos: number;
  };
  api: { tempo_ativo_segundos: number };
  banco_de_dados: {
    conectado: boolean;
    latencia_ms?: number;
    armazenamento?: { dados_mb: number; ocupado_mb: number; indices_mb: number };
  };
};

type Relatorios = {
  usuarios: { total: number; ativos: number };
  organizacoes: { total: number; pendentes: number; aprovadas: number };
  comissoes: { total: number; ativas: number };
  reunioes: { total: number; agendadas: number; canceladas: number };
  atas: { total: number; em_aprovacao: number; aprovadas: number };
};

// Versões do aplicativo lidas do package.json do FRONTEND (o backend envia as da API).
const pacotesApp = { ...pacote.devDependencies, ...pacote.dependencies } as Record<string, string>;
const versaoPacote = (nome: string) => pacotesApp[nome]?.replace(/^[\^~]/, '') ?? '';
const TECNOLOGIAS_APP = [
  { nome: 'TypeScript', versao: versaoPacote('typescript'), uso: 'Linguagem do aplicativo' },
  { nome: 'Expo SDK', versao: versaoPacote('expo'), uso: 'Plataforma do aplicativo' },
  { nome: 'React Native', versao: versaoPacote('react-native'), uso: 'Interface móvel' },
  { nome: 'React', versao: versaoPacote('react'), uso: 'Componentes de tela' },
  { nome: 'Expo Router', versao: versaoPacote('expo-router'), uso: 'Navegação entre telas' },
  { nome: 'React Hook Form', versao: versaoPacote('react-hook-form'), uso: 'Formulários' },
];

function formatarTempoAtivo(segundos: number) {
  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  return dias > 0 ? `${dias}d ${horas}h` : `${horas}h ${minutos}min`;
}

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

function LinhaTecnologia({ nome, versao, uso }: { nome: string; versao: string; uso: string }) {
  const { cores } = useTema().tema;
  return (
    <View style={styles.linha}>
      <View style={styles.linhaTexto}>
        <Text style={[styles.valor, { color: cores.texto }]}>{nome}</Text>
        <Text style={[styles.rotulo, { color: cores.textoSuave }]}>{uso}</Text>
      </View>
      <Text style={[styles.valor, { color: cores.primaria }]}>{versao || '—'}</Text>
    </View>
  );
}

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
  const { mostrarToast } = useToast();

  const [sobre, definirSobre] = useState<Sobre | null>(null);
  const [status, definirStatus] = useState<Status | null>(null);
  const [relatorios, definirRelatorios] = useState<Relatorios | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [aviso, definirAviso] = useState<Aviso | null>(null);

  const [acaoEmAndamento, definirAcaoEmAndamento] = useState<string | null>(null);
  const [confirmacaoTeste, definirConfirmacaoTeste] = useState(false);
  const [resetAberto, definirResetAberto] = useState(false);
  const [palavra, definirPalavra] = useState('');
  const [senha, definirSenha] = useState('');
  const [erroReset, definirErroReset] = useState<string | null>(null);

  const resetValido = palavra === 'RESET' && senha.length > 0;

  const carregar = useCallback(async () => {
    const [resultadoSobre, resultadoStatus, resultadoRelatorios] = await Promise.all([
      api<Sobre>('/sistema/sobre'),
      api<Status>('/sistema/status'),
      api<Relatorios>('/sistema/relatorios'),
    ]);
    definirCarregando(false);

    if (!resultadoSobre.ok || !resultadoStatus.ok || !resultadoRelatorios.ok) {
      const falha = [resultadoSobre, resultadoStatus, resultadoRelatorios].find((resultado) => !resultado.ok);
      definirAviso({
        tom: 'erro',
        titulo: 'Não foi possível carregar as informações do sistema',
        mensagem: falha && !falha.ok ? falha.erro : 'Tente novamente.',
      });
      return;
    }

    definirAviso(null);
    definirSobre(resultadoSobre.dados);
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
    const resultado = await api('/sistema/popular-teste', 'POST');
    definirAcaoEmAndamento(null);
    definirConfirmacaoTeste(false);

    if (resultado.ok) {
      mostrarToast('3 usuários de teste criados.', 'sucesso');
      void carregar();
    } else {
      mostrarToast(resultado.erro, 'erro');
    }
  }

  function fecharReset() {
    definirResetAberto(false);
    definirPalavra('');
    definirSenha('');
    definirErroReset(null);
  }

  async function resetarSistema() {
    definirAcaoEmAndamento('reset');
    definirErroReset(null);
    const resultado = await api('/sistema/reset', 'POST', { confirmacao: palavra, senha });
    definirAcaoEmAndamento(null);

    if (!resultado.ok) {
      definirErroReset(resultado.erro);
      return;
    }
    fecharReset();
    mostrarToast('Sistema resetado. O administrador foi mantido.', 'sucesso');
    void carregar();
  }

  const { versao: versaoApp } = versaoDoApp();

  return (
    <TelaComCabecalho titulo="Sistema" aoAtualizar={carregar}>
      {aviso ? <FaixaAviso aviso={aviso} /> : null}

      {carregando ? (
        <Carregando rotulo="Carregando informações do sistema" />
      ) : (
        <>
          {sobre ? (
            <Cartao style={styles.cartao}>
              <Text style={[styles.titulo, { color: cores.texto }]}>Sobre o sistema</Text>

              <View style={styles.grade}>
                <Metrica rotulo="Sistema" valor={sobre.sistema.nome} />
                <Metrica rotulo="Versão do app" valor={versaoApp ?? '—'} />
                <Metrica rotulo="Versão da API" valor={sobre.sistema.versao_api} />
                <Metrica rotulo="Ambiente" valor={sobre.sistema.ambiente} />
                <Metrica rotulo="API iniciada em" valor={new Date(sobre.sistema.iniciada_em).toLocaleString('pt-BR')} />
                <Metrica rotulo="Fuso horário" valor={sobre.sistema.fuso_horario} />
              </View>
            </Cartao>
          ) : null}

          {sobre ? (
            <Cartao style={styles.cartao}>
              <Text style={[styles.titulo, { color: cores.texto }]}>Tecnologias</Text>

              <Text style={[styles.tituloColuna, { color: cores.primaria }]}>Servidor (API)</Text>
              {sobre.tecnologias.map((item) => (
                <LinhaTecnologia key={item.nome} {...item} />
              ))}

              <Text style={[styles.tituloColuna, { color: cores.primaria }]}>Aplicativo</Text>
              {TECNOLOGIAS_APP.map((item) => (
                <LinhaTecnologia key={item.nome} {...item} />
              ))}
            </Cartao>
          ) : null}

          {sobre && status ? (
            <Cartao style={styles.cartao}>
              <Text style={[styles.titulo, { color: cores.texto }]}>Servidor</Text>

              <View style={styles.grade}>
                <Metrica
                  rotulo="Sistema operacional"
                  valor={`${sobre.servidor.sistema_operacional} (${sobre.servidor.arquitetura})`}
                />
                <Metrica rotulo="Processador" valor={sobre.servidor.cpu_modelo ?? 'Não informado'} />
                <Metrica
                  rotulo="CPU em uso"
                  valor={`${status.servidor.cpu.uso_percentual}% · ${status.servidor.cpu.nucleos} núcleos`}
                />
                <Metrica
                  rotulo="Memória em uso"
                  valor={`${status.servidor.memoria.uso_percentual}% (${status.servidor.memoria.total_mb - status.servidor.memoria.livre_mb}/${status.servidor.memoria.total_mb} MB)`}
                />
                <Metrica rotulo="Servidor ativo há" valor={formatarTempoAtivo(status.servidor.tempo_ativo_segundos)} />
                <Metrica rotulo="API ativa há" valor={formatarTempoAtivo(status.api.tempo_ativo_segundos)} />
              </View>
            </Cartao>
          ) : null}

          {status ? (
            <Cartao style={styles.cartao}>
              <Text style={[styles.titulo, { color: cores.texto }]}>Banco de dados</Text>

              <View style={styles.grade}>
                <Metrica rotulo="Situação" valor={status.banco_de_dados.conectado ? 'Conectado' : 'Indisponível'} />
                {status.banco_de_dados.latencia_ms !== undefined ? (
                  <Metrica rotulo="Tempo de resposta" valor={`${status.banco_de_dados.latencia_ms} ms`} />
                ) : null}
                {status.banco_de_dados.armazenamento ? (
                  <>
                    <Metrica rotulo="Dados armazenados" valor={`${status.banco_de_dados.armazenamento.dados_mb} MB`} />
                    <Metrica rotulo="Espaço em disco" valor={`${status.banco_de_dados.armazenamento.ocupado_mb} MB`} />
                    <Metrica rotulo="Índices" valor={`${status.banco_de_dados.armazenamento.indices_mb} MB`} />
                  </>
                ) : null}
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
                <ColunaRelatorio
                  titulo="Reuniões"
                  itens={[
                    { rotulo: 'Agendadas', valor: `${relatorios.reunioes.agendadas} de ${relatorios.reunioes.total}` },
                    { rotulo: 'Canceladas', valor: `${relatorios.reunioes.canceladas}` },
                  ]}
                />
                <ColunaRelatorio
                  titulo="Atas"
                  itens={[
                    { rotulo: 'Aprovadas', valor: `${relatorios.atas.aprovadas} de ${relatorios.atas.total}` },
                    { rotulo: 'Em aprovação', valor: `${relatorios.atas.em_aprovacao}` },
                  ]}
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

          {resetAberto ? (
            <Cartao style={styles.cartao}>
              <Text style={[styles.titulo, { color: cores.erro }]}>Resetar sistema</Text>
              <Text style={[styles.aviso, { color: cores.textoSuave }]}>
                Apaga todos os usuários (menos o administrador), organizações, comissões, reuniões, atas e anexos.
                Esta ação não pode ser desfeita.
              </Text>

              <CampoTexto
                rotulo="Digite RESET para confirmar"
                value={palavra}
                onChangeText={definirPalavra}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="RESET"
              />
              <CampoTexto
                rotulo="Sua senha de administrador"
                value={senha}
                onChangeText={(texto) => {
                  definirSenha(texto);
                  definirErroReset(null);
                }}
                secureTextEntry
                autoCapitalize="none"
                erro={erroReset}
              />

              <Botao
                titulo="Apagar tudo"
                variante="perigo"
                icone="trash-outline"
                desabilitado={!resetValido}
                carregando={acaoEmAndamento === 'reset'}
                aoTocar={resetarSistema}
              />
              <Botao
                titulo="Cancelar"
                variante="secundario"
                desabilitado={acaoEmAndamento === 'reset'}
                aoTocar={fecharReset}
              />
            </Cartao>
          ) : (
            <Botao
              titulo="Resetar sistema"
              variante="perigo"
              icone="trash-outline"
              aoTocar={() => definirResetAberto(true)}
            />
          )}
        </>
      )}

      <Confirmacao
        mensagem={confirmacaoTeste ? 'Criar 3 usuários de teste?' : undefined}
        confirmar={popularDadosDeTeste}
        cancelar={() => definirConfirmacaoTeste(false)}
        carregando={acaoEmAndamento === 'popular-teste'}
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: ESPACO.md - 4 },
  titulo: { ...TIPOGRAFIA.subtitulo },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.md },
  metrica: { flexBasis: '45%', flexGrow: 1, gap: 2 },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ESPACO.sm },
  linhaTexto: { flex: 1 },
  coluna: { flexBasis: '30%', flexGrow: 1, gap: ESPACO.sm },
  tituloColuna: { ...TIPOGRAFIA.rotulo, fontSize: 13 },
  itensColuna: { gap: ESPACO.sm },
  aviso: { ...TIPOGRAFIA.corpoPequeno },
  rotulo: { ...TIPOGRAFIA.corpoPequeno, fontSize: 12 },
  valor: { ...TIPOGRAFIA.subtitulo, fontSize: 15 },
});
