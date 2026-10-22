import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoCodigo, CampoTextoControlado } from '@/components/CampoTexto';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { normalizarEmail, validarConfirmacaoSenha, validarEmail, validarSenha } from '@/utils/validacao';

type Etapa = 'email' | 'codigo' | 'senha' | 'concluido';
type EmailForm = { email: string };
type SenhaForm = { senha: string; confirmacao: string };

export default function TelaRecuperarConta() {
  const router = useRouter();
  const { tema } = useTema();
  const { control: controleEmail, handleSubmit: enviarFormularioEmail } = useForm<EmailForm>({ defaultValues: { email: '' } });
  const { control: controleSenha, handleSubmit: enviarFormularioSenha, setFocus: focarSenha, formState } = useForm<SenhaForm>({
    defaultValues: { senha: '', confirmacao: '' },
  });
  const [etapa, definirEtapa] = useState<Etapa>('email');
  const [email, definirEmail] = useState('');
  const [codigo, definirCodigo] = useState('');
  const [token, definirToken] = useState('');
  const [aviso, definirAviso] = useState<Aviso | null>(null);
  const [enviando, definirEnviando] = useState(false);
  const [reenviado, definirReenviado] = useState(false);
  const [visiveis, definirVisiveis] = useState({ senha: false, confirmacao: false });

  const carregando = enviando || formState.isSubmitting;

  function voltar() {
    if (etapa === 'codigo') {
      definirEtapa('email');
      definirCodigo('');
      definirAviso(null);
      return;
    }
    if (etapa === 'senha') {
      definirEtapa('codigo');
      definirAviso(null);
      return;
    }
    router.replace('/login');
  }

  const solicitar = enviarFormularioEmail(async ({ email: informado }) => {
    const emailNormalizado = normalizarEmail(informado);
    definirEnviando(true);
    definirAviso(null);
    const resultado = await api<{ mensagem: string }>('/auth/recuperar-conta', 'POST', { email: emailNormalizado });
    definirEnviando(false);
    if (!resultado.ok) {
      definirAviso({ tom: 'erro', titulo: 'Não foi possível enviar', mensagem: resultado.erro });
      return;
    }
    definirEmail(emailNormalizado);
    definirCodigo('');
    definirReenviado(false);
    definirEtapa('codigo');
    definirAviso({ tom: 'informacao', titulo: 'Código enviado', mensagem: resultado.dados.mensagem });
  });

  async function reenviar() {
    if (enviando || !email) return;
    definirEnviando(true);
    definirAviso(null);
    const resultado = await api<{ mensagem: string }>('/auth/recuperar-conta', 'POST', { email });
    definirEnviando(false);
    if (!resultado.ok) {
      definirAviso({ tom: 'erro', titulo: 'Não foi possível reenviar', mensagem: resultado.erro });
      return;
    }
    definirReenviado(true);
    definirAviso({ tom: 'informacao', titulo: 'Código reenviado', mensagem: resultado.dados.mensagem });
  }

  async function verificarCodigo() {
    const valor = codigo.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (valor.length !== 7 || enviando) {
      definirAviso({ tom: 'erro', titulo: 'Código inválido', mensagem: 'Informe os 7 caracteres do código.' });
      return;
    }
    definirEnviando(true);
    definirAviso(null);
    const resultado = await api<{ token: string }>('/auth/verificar-recuperacao', 'POST', {
      email,
      codigo: `${valor.slice(0, 3)}-${valor.slice(3)}`,
    });
    definirEnviando(false);
    if (!resultado.ok) {
      definirAviso({ tom: 'erro', titulo: 'Código inválido', mensagem: resultado.erro });
      return;
    }
    definirToken(resultado.dados.token);
    definirEtapa('senha');
    definirAviso(null);
  }

  const redefinir = enviarFormularioSenha(async ({ senha }) => {
    definirAviso(null);
    const resultado = await api('/auth/redefinir-senha', 'POST', { token, nova_senha: senha });
    if (!resultado.ok) {
      definirAviso({ tom: 'erro', titulo: 'Não foi possível redefinir', mensagem: resultado.erro });
      return;
    }
    definirEtapa('concluido');
  });

  function olho(campo: 'senha' | 'confirmacao') {
    const visivel = visiveis[campo];
    return {
      icone: visivel ? ('eye-off-outline' as const) : ('eye-outline' as const),
      rotuloAcessivel: visivel ? 'Ocultar senha' : 'Mostrar senha',
      aoTocar: () => definirVisiveis((atuais) => ({ ...atuais, [campo]: !atuais[campo] })),
    };
  }

  const rodape =
    etapa === 'email' ? (
      <Botao titulo="Enviar código" tituloCarregando="Enviando..." pilula carregando={carregando} aoTocar={() => void solicitar()} />
    ) : etapa === 'codigo' ? (
      <Botao titulo="Continuar" tituloCarregando="Verificando..." pilula carregando={carregando} aoTocar={() => void verificarCodigo()} />
    ) : etapa === 'senha' ? (
      <Botao titulo="Salvar senha" tituloCarregando="Salvando..." pilula carregando={carregando} aoTocar={() => void redefinir()} />
    ) : (
      <Botao titulo="Ir para o login" pilula aoTocar={() => router.replace('/login')} />
    );

  return (
    <TelaComCabecalho titulo="Recuperar conta" aoVoltar={voltar} rotuloVoltar="Voltar" rodape={rodape}>
      {etapa === 'email' ? (
        <>
          <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>Informe seu e-mail para receber um código de recuperação.</Text>
          <CampoTextoControlado controle={controleEmail} nome="email" validar={validarEmail} rotulo="E-mail" icone="mail-outline" placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!carregando} returnKeyType="send" onSubmitEditing={() => void solicitar()} compacto />
        </>
      ) : null}

      {etapa === 'codigo' ? (
        <>
          <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>Digite o código enviado para:</Text>
          <Text style={[styles.email, { color: tema.cores.texto }]}>{email}</Text>
          <CampoCodigo valor={codigo} aoMudar={(valor) => { definirCodigo(valor); definirAviso(null); }} aoEnviar={() => void verificarCodigo()} desabilitado={carregando} />
          <Pressable onPress={() => void reenviar()} disabled={carregando || reenviado} style={styles.reenviar}>
            <Text style={[styles.textoReenviar, { color: reenviado ? tema.cores.textoSutil : tema.cores.primaria }]}>
              {reenviado ? 'Código reenviado' : 'Reenviar código'}
            </Text>
          </Pressable>
        </>
      ) : null}

      {etapa === 'senha' ? (
        <>
          <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>Crie uma nova senha para sua conta.</Text>
          <CampoTextoControlado controle={controleSenha} nome="senha" validar={validarSenha} rotulo="Nova senha" placeholder="Nova senha" icone="lock-closed-outline" secureTextEntry={!visiveis.senha} autoCapitalize="none" editable={!carregando} acaoFinal={olho('senha')} returnKeyType="next" onSubmitEditing={() => focarSenha('confirmacao')} compacto />
          <CampoTextoControlado controle={controleSenha} nome="confirmacao" validar={(valor, valores) => validarConfirmacaoSenha(valores.senha, valor)} rotulo="Confirmar nova senha" placeholder="Confirmar senha" icone="checkmark-circle-outline" secureTextEntry={!visiveis.confirmacao} autoCapitalize="none" editable={!carregando} acaoFinal={olho('confirmacao')} returnKeyType="go" onSubmitEditing={() => void redefinir()} compacto />
        </>
      ) : null}

      {aviso ? <FaixaAviso aviso={aviso} /> : null}

      {etapa === 'concluido' ? (
        <View>
          <Text style={[styles.titulo, { color: tema.cores.texto }]}>Senha redefinida com sucesso</Text>
          <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>Você já pode entrar com sua nova senha.</Text>
        </View>
      ) : null}
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  descricao: { ...TIPOGRAFIA.corpo },
  email: { ...TIPOGRAFIA.subtitulo },
  reenviar: { alignSelf: 'center', height: 44, justifyContent: 'center', paddingHorizontal: ESPACO.md },
  textoReenviar: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
  titulo: { ...TIPOGRAFIA.subtitulo },
});

