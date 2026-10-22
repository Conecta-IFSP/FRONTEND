import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useForm } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoTexto, CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { Opcao } from '@/components/Opcao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { ehPreferenciaTema, useTema, type PreferenciaTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { autenticarComDispositivo } from '@/services/autenticacao-local';
import { useSessao } from '@/contexts/SessaoContext';
import { normalizarEmail, validarEmail, validarNome } from '@/utils/validacao';

type Perfil = { nome: string; email: string; tema?: string };

const OPCOES_TEMA: {
  valor: PreferenciaTema;
  titulo: string;
  icone: IoniconsIconName;
}[] = [
  { valor: 'sistema', titulo: 'Sistema', icone: 'phone-portrait-outline' },
  { valor: 'claro', titulo: 'Claro', icone: 'sunny-outline' },
  { valor: 'escuro', titulo: 'Escuro', icone: 'moon-outline' },
];

export default function TelaPerfil() {
  const router = useRouter();
  const sessao = useSessao();
  const { tema, preferencia, definirPreferencia } = useTema();
  const [preferenciaSelecionada, definirPreferenciaSelecionada] =
    useState<PreferenciaTema>(preferencia);
  const { control, handleSubmit, reset, getValues, formState } = useForm<{ nome: string; email: string }>({
    defaultValues: { nome: '', email: '' },
  });
  const salvando = formState.isSubmitting;
  const [salvandoTema, definirSalvandoTema] = useState(false);
  const [aviso, definirAviso] = useState<Aviso | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [emailOriginal, definirEmailOriginal] = useState('');
  const [emailPendente, definirEmailPendente] = useState<string | null>(null);
  const [codigoEmail, definirCodigoEmail] = useState('');
  const [confirmandoEmail, definirConfirmandoEmail] = useState(false);

  useEffect(() => {
    let ativa = true;

    void (async () => {
      const autenticado = await autenticarComDispositivo().catch(() => false);
      if (!ativa) return;

      if (!autenticado) {
        definirCarregando(false);
        if (router.canGoBack()) router.back();
        else router.replace('/inicio');
        return;
      }

      const resultado = await api<Perfil>('/usuarios/me');
      if (!ativa) return;
      definirCarregando(false);
      if (!resultado.ok) {
        definirAviso({ tom: 'erro', titulo: 'Não foi possível carregar', mensagem: resultado.erro });
        return;
      }
      reset({ nome: resultado.dados.nome, email: resultado.dados.email });
      definirEmailOriginal(resultado.dados.email);
      if (ehPreferenciaTema(resultado.dados.tema)) {
        definirPreferencia(resultado.dados.tema);
        definirPreferenciaSelecionada(resultado.dados.tema);
      }
    })();

    return () => {
      ativa = false;
    };
  }, [definirPreferencia, reset]);

  async function selecionarTema(novaPreferencia: PreferenciaTema) {
    if (salvando || salvandoTema || novaPreferencia === preferenciaSelecionada) return;

    const preferenciaAnterior = preferenciaSelecionada;
    definirPreferenciaSelecionada(novaPreferencia);
    definirPreferencia(novaPreferencia);
    definirSalvandoTema(true);
    definirAviso(null);

    const resultado = await api<Perfil>('/usuarios/me', 'PATCH', {
      tema: novaPreferencia,
    });

    definirSalvandoTema(false);

    if (!resultado.ok) {
      definirPreferenciaSelecionada(preferenciaAnterior);
      definirPreferencia(preferenciaAnterior);
      definirAviso({
        tom: 'erro',
        titulo: 'Não foi possível alterar o tema',
        mensagem: resultado.erro,
      });
    }
  }

  const salvar = handleSubmit(async ({ nome, email }) => {
    definirAviso(null);

    const autenticado = await autenticarComDispositivo().catch(() => false);
    if (!autenticado) return;

    const emailNormalizado = normalizarEmail(email);
    const emailMudou = emailNormalizado !== emailOriginal;

    if (emailMudou) {
      const solicitacao = await api('/usuarios/me/email/solicitar', 'POST', {
        email: emailNormalizado,
      });
      if (!solicitacao.ok) {
        definirAviso({ tom: 'erro', titulo: 'Não foi possível alterar o e-mail', mensagem: solicitacao.erro });
        return;
      }
      definirEmailPendente(emailNormalizado);
      definirCodigoEmail('');
    }

    const resultado = await api<Perfil>('/usuarios/me', 'PATCH', {
      nome: nome.trim(),
      tema: preferenciaSelecionada,
    });

    if (resultado.ok) definirPreferencia(preferenciaSelecionada);

    definirAviso(
      resultado.ok
        ? {
            tom: 'sucesso',
            titulo: 'Perfil atualizado',
            mensagem: emailMudou
              ? 'Dados salvos. Confirme o código enviado ao novo e-mail para concluir a alteração.'
              : 'Seus dados foram salvos.',
          }
        : { tom: 'erro', titulo: 'Não foi possível salvar', mensagem: resultado.erro },
    );
  });

  async function confirmarEmail() {
    const codigo = codigoEmail.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (!emailPendente || codigo.length !== 7 || confirmandoEmail) {
      definirAviso({ tom: 'erro', titulo: 'Código inválido', mensagem: 'Informe o código de 7 caracteres recebido no novo e-mail.' });
      return;
    }

    const autenticado = await autenticarComDispositivo().catch(() => false);
    if (!autenticado) return;

    definirConfirmandoEmail(true);
    const resultado = await api<{ email: string }>('/usuarios/me/email/confirmar', 'POST', {
      email: emailPendente,
      codigo,
    });
    definirConfirmandoEmail(false);

    if (!resultado.ok) {
      definirAviso({ tom: 'erro', titulo: 'Não foi possível confirmar', mensagem: resultado.erro });
      return;
    }

    definirEmailOriginal(emailPendente);
    definirEmailPendente(null);
    definirCodigoEmail('');
    reset({ nome: getValues('nome'), email: emailPendente });
    definirAviso({ tom: 'sucesso', titulo: 'E-mail alterado', mensagem: 'O novo e-mail foi confirmado com sucesso.' });
  }

  async function sair() {
    await sessao.sair();
  }

  return (
    <TelaComCabecalho titulo="Perfil">
      {carregando ? (
        <Carregando rotulo="Carregando perfil" />
      ) : (
        <Cartao>
          <Text style={[styles.titulo, { color: tema.cores.texto }]}>Dados pessoais</Text>
          <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
            Atualize as informações usadas na sua conta.
          </Text>

          {aviso ? (
            <View style={styles.aviso}>
              <FaixaAviso aviso={aviso} />
            </View>
          ) : null}

          <View style={styles.campos}>
            <CampoTextoControlado
              controle={control}
              nome="nome"
              validar={validarNome}
              rotulo="Nome"
              icone="person-outline"
              autoCapitalize="words"
              editable={!salvando}
            />

            {emailPendente ? (
              <View style={styles.confirmacaoEmail}>
                <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}> 
                  Digite o código enviado para {emailPendente} para concluir a alteração.
                </Text>
                <CampoTexto
                  rotulo="Código de confirmação"
                  icone="mail-open-outline"
                  placeholder="ABC-1234"
                  value={codigoEmail}
                  onChangeText={(valor) => definirCodigoEmail(valor.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 7))}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!confirmandoEmail}
                />
                <Botao
                  titulo="Confirmar novo e-mail"
                  tituloCarregando="Confirmando..."
                  carregando={confirmandoEmail}
                  aoTocar={() => void confirmarEmail()}
                />
              </View>
            ) : null}

            <CampoTextoControlado
              controle={control}
              nome="email"
              validar={validarEmail}
              rotulo="E-mail"
              icone="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!salvando}
            />
          </View>

          <Text style={[styles.rotuloTema, { color: tema.cores.textoSuave }]}>Tema preferido</Text>
          <View style={styles.opcoesTema}>
            {OPCOES_TEMA.map((opcao) => (
              <Opcao
                key={opcao.valor}
                titulo={opcao.titulo}
                icone={opcao.icone}
                selecionado={preferenciaSelecionada === opcao.valor}
                aoTocar={() => void selecionarTema(opcao.valor)}
                desabilitado={salvando || salvandoTema}
                empilhado
                style={styles.opcaoTema}
              />
            ))}
          </View>

          <Botao
            titulo="Salvar alterações"
            tituloCarregando="Salvando..."
            carregando={salvando}
            aoTocar={() => void salvar()}
            style={styles.botao}
          />
          <Botao
            titulo="Alterar minha senha"
            variante="secundario"
            icone="key-outline"
            aoTocar={() => router.push('/login/alterar-senha')}
            style={styles.botaoSecundario}
          />
        </Cartao>
      )}

      <Botao titulo="Sair da conta" variante="perigo" icone="log-out-outline" aoTocar={sair} />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  titulo: { ...TIPOGRAFIA.titulo },
  descricao: { ...TIPOGRAFIA.corpoPequeno, marginTop: ESPACO.xs },
  aviso: { marginTop: ESPACO.lg - 4 },
  campos: { marginTop: ESPACO.lg, gap: ESPACO.md },
  rotuloTema: { ...TIPOGRAFIA.rotulo, marginTop: ESPACO.lg, marginBottom: ESPACO.sm },
  opcoesTema: { flexDirection: 'row', gap: ESPACO.sm },
  opcaoTema: { flex: 1 },
  botao: { marginTop: ESPACO.lg },
  botaoSecundario: { marginTop: ESPACO.md - 4 },
  confirmacaoEmail: { marginTop: ESPACO.md, gap: ESPACO.sm },
});
