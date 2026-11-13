import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useForm, useWatch } from 'react-hook-form';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Confirmacao } from '@/components/Confirmacao';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { FolhaInferior, OpcaoFolha } from '@/components/FolhaInferior';
import { LinhaLista, SecaoLista } from '@/components/ListaAgrupada';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { ehPreferenciaTema, useTema, type PreferenciaTema } from '@/contexts/TemaContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { autenticarComDispositivo } from '@/services/autenticacao-local';
import { useSessao } from '@/contexts/SessaoContext';
import { validarNome } from '@/utils/validacao';
import { textoVersao } from '@/utils/versao';

type Perfil = { nome: string; email: string; tema?: string };

const OPCOES_TEMA: { valor: PreferenciaTema; titulo: string }[] = [
  { valor: 'sistema', titulo: 'Sistema' },
  { valor: 'claro', titulo: 'Claro' },
  { valor: 'escuro', titulo: 'Escuro' },
];

export default function TelaPerfil() {
  const router = useRouter();
  const sessao = useSessao();
  const { mostrarToast } = useToast();
  const { tema, preferencia, definirPreferencia } = useTema();
  const { cores } = tema;
  const [preferenciaSelecionada, definirPreferenciaSelecionada] = useState<PreferenciaTema>(preferencia);
  const { control, handleSubmit, reset, formState } = useForm<{ nome: string }>({
    defaultValues: { nome: '' },
  });
  const nome = useWatch({ control, name: 'nome' });
  const salvando = formState.isSubmitting;
  const [perfil, definirPerfil] = useState<Perfil | null>(null);
  const [salvandoTema, definirSalvandoTema] = useState(false);
  const [aviso, definirAviso] = useState<Aviso | null>(null);
  const [avisoNome, definirAvisoNome] = useState<Aviso | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [abrindo, definirAbrindo] = useState(false);
  const [editandoNome, definirEditandoNome] = useState(false);
  const [escolhendoTema, definirEscolhendoTema] = useState(false);
  const [confirmandoSaida, definirConfirmandoSaida] = useState(false);
  const [saindo, definirSaindo] = useState(false);

  // Usado ao abrir a tela e ao puxar para atualizar. Em erro, mantém os dados já exibidos.
  const carregarPerfil = useCallback(
    async (ativa: () => boolean = () => true) => {
      const resultado = await api<Perfil>('/usuarios/me');
      if (!ativa()) return;
      definirCarregando(false);
      if (!resultado.ok) {
        definirAviso({ tom: 'erro', titulo: 'Não foi possível carregar', mensagem: resultado.erro });
        return;
      }
      definirAviso(null);
      definirPerfil(resultado.dados);
      reset({ nome: resultado.dados.nome });
      if (ehPreferenciaTema(resultado.dados.tema)) {
        definirPreferencia(resultado.dados.tema);
        definirPreferenciaSelecionada(resultado.dados.tema);
      }
    },
    [definirPreferencia, reset],
  );

  useFocusEffect(
    useCallback(() => {
      let ativa = true;
      void carregarPerfil(() => ativa);
      return () => {
        ativa = false;
      };
    }, [carregarPerfil]),
  );

  async function selecionarTema(novaPreferencia: PreferenciaTema) {
    if (salvando || salvandoTema || novaPreferencia === preferenciaSelecionada) return;

    const preferenciaAnterior = preferenciaSelecionada;
    definirPreferenciaSelecionada(novaPreferencia);
    definirPreferencia(novaPreferencia);
    definirSalvandoTema(true);
    definirAviso(null);

    const resultado = await api<Perfil>('/usuarios/me', 'PATCH', { tema: novaPreferencia });

    definirSalvandoTema(false);

    if (!resultado.ok) {
      definirPreferenciaSelecionada(preferenciaAnterior);
      definirPreferencia(preferenciaAnterior);
      definirAviso({ tom: 'erro', titulo: 'Não foi possível alterar o tema', mensagem: resultado.erro });
    }
  }

  async function abrirProtegida(destino: Href) {
    if (abrindo) return;
    definirAbrindo(true);
    const autenticado = await autenticarComDispositivo().catch(() => false);
    definirAbrindo(false);
    if (autenticado) router.push(destino);
  }

  function abrirEdicaoNome() {
    if (!perfil) return;
    reset({ nome: perfil.nome });
    definirAvisoNome(null);
    definirEditandoNome(true);
  }

  function fecharEdicaoNome() {
    if (salvando) return;
    definirEditandoNome(false);
  }

  const salvarNome = handleSubmit(async ({ nome: novoNome }) => {
    definirAvisoNome(null);
    const resultado = await api<Perfil>('/usuarios/me', 'PATCH', { nome: novoNome.trim() });
    if (!resultado.ok) {
      definirAvisoNome({ tom: 'erro', titulo: 'Não foi possível salvar', mensagem: resultado.erro });
      return;
    }
    definirPerfil(resultado.dados);
    reset({ nome: resultado.dados.nome });
    definirEditandoNome(false);
    mostrarToast('Nome atualizado.', 'sucesso');
    void sessao.atualizar();
  });

  async function sair() {
    definirSaindo(true);
    try {
      await sessao.sair();
    } finally {
      definirSaindo(false);
      definirConfirmandoSaida(false);
    }
  }

  const mudouNome = Boolean(perfil && nome.trim() && nome.trim() !== perfil.nome);

  return (
    <TelaComCabecalho
      titulo="Perfil"
      aoAtualizar={() => carregarPerfil()}
      sobreposto={
        <>
          <FolhaInferior visivel={editandoNome} titulo="Editar nome" aoFechar={fecharEdicaoNome} acompanharTeclado>
            <View style={styles.formulario}>
              {avisoNome ? <FaixaAviso aviso={avisoNome} /> : null}
              <CampoTextoControlado
                controle={control}
                nome="nome"
                validar={validarNome}
                rotulo="Nome"
                placeholder="Nome"
                icone="person-outline"
                autoCapitalize="words"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (mudouNome) void salvarNome();
                }}
                editable={!salvando}
                compacto
              />
              <Botao
                titulo="Salvar"
                tituloCarregando="Salvando..."
                pilula
                carregando={salvando}
                desabilitado={!mudouNome}
                aoTocar={() => void salvarNome()}
              />
            </View>
          </FolhaInferior>
          <FolhaInferior visivel={escolhendoTema} titulo="Tema" aoFechar={() => definirEscolhendoTema(false)}>
            {OPCOES_TEMA.map((opcao) => (
              <OpcaoFolha
                key={opcao.valor}
                icone={opcao.valor === preferenciaSelecionada ? 'checkmark-circle' : 'ellipse-outline'}
                rotulo={opcao.titulo}
                desabilitado={salvandoTema}
                aoTocar={() => {
                  definirEscolhendoTema(false);
                  void selecionarTema(opcao.valor);
                }}
              />
            ))}
          </FolhaInferior>
          <Confirmacao
            titulo="Sair da conta"
            mensagem={confirmandoSaida ? 'Deseja realmente sair da sua conta?' : undefined}
            rotuloConfirmar="Sair"
            perigo
            carregando={saindo}
            cancelar={() => definirConfirmandoSaida(false)}
            confirmar={() => void sair()}
          />
        </>
      }
    >
      {carregando ? <Carregando rotulo="Carregando perfil" /> : null}

      {perfil ? (
        <View style={[styles.identidade, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
          <Avatar nome={perfil.nome} tamanho={72} />
          <Text style={[styles.nomeTopo, { color: cores.texto }]} numberOfLines={1}>
            {perfil.nome}
          </Text>
          <Text style={[styles.email, { color: cores.textoSuave }]} numberOfLines={1}>
            {perfil.email}
          </Text>
        </View>
      ) : null}

      {aviso ? <FaixaAviso aviso={aviso} /> : null}

      {perfil ? (
        <>
          <SecaoLista titulo="Conta">
            <LinhaLista icone="person-outline" titulo="Nome" subtitulo={perfil.nome} aoTocar={abrirEdicaoNome} />
            <LinhaLista
              icone="mail-outline"
              titulo="E-mail"
              subtitulo={perfil.email}
              desabilitado={abrindo}
              aoTocar={() => void abrirProtegida('/login/trocar-email')}
            />
            <LinhaLista
              icone="key-outline"
              titulo="Senha"
              subtitulo="Alterar senha"
              desabilitado={abrindo}
              aoTocar={() => void abrirProtegida('/login/alterar-senha')}
            />
          </SecaoLista>

          <SecaoLista titulo="Preferências">
            <LinhaLista
              icone="contrast-outline"
              titulo="Tema"
              subtitulo={OPCOES_TEMA.find((opcao) => opcao.valor === preferenciaSelecionada)?.titulo}
              desabilitado={salvandoTema}
              aoTocar={() => definirEscolhendoTema(true)}
            />
          </SecaoLista>
        </>
      ) : null}

      <SecaoLista titulo="Suporte">
        <LinhaLista
          icone="help-circle-outline"
          titulo="Ajuda"
          subtitulo="Perguntas frequentes"
          aoTocar={() => router.push('/ajuda')}
        />
        <LinhaLista
          icone="information-circle-outline"
          titulo="Sobre o app"
          subtitulo={textoVersao()}
          aoTocar={() => router.push('/sobre')}
        />
      </SecaoLista>

      <Pressable
        onPress={() => definirConfirmandoSaida(true)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.sair, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="log-out-outline" size={20} color={cores.erro} />
        <Text style={[styles.textoSair, { color: cores.erro }]}>Sair da conta</Text>
      </Pressable>
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  identidade: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: ESPACO.lg,
    paddingHorizontal: ESPACO.md,
    borderWidth: 1,
    borderRadius: RAIO.lg,
  },
  nomeTopo: { ...TIPOGRAFIA.subtitulo, marginTop: ESPACO.sm, maxWidth: '100%' },
  email: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18, maxWidth: '100%' },
  formulario: { paddingHorizontal: ESPACO.md, paddingBottom: ESPACO.sm, gap: ESPACO.md },
  sair: { alignSelf: 'flex-start', height: 44, flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm + 2 },
  textoSair: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
});
