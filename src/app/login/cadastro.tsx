import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { FaixaAviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import {
  normalizarEmail,
  validarConfirmacaoSenha,
  validarEmail,
  validarNome,
  validarSenha,
} from '@/utils/validacao';

type DadosCadastro = { nome: string; email: string; senha: string; confirmacao: string };

export default function TelaCadastro() {
  const router = useRouter();
  const { tema } = useTema();
  const { mostrarToast } = useToast();
  const { control, handleSubmit, setFocus, formState } = useForm<DadosCadastro>({
    defaultValues: { nome: '', email: '', senha: '', confirmacao: '' },
  });
  const carregando = formState.isSubmitting;
  const [senhaVisivel, definirSenhaVisivel] = useState(false);
  const [confirmacaoVisivel, definirConfirmacaoVisivel] = useState(false);
  const [erro, definirErro] = useState('');

  const criarConta = handleSubmit(async ({ nome, email, senha }) => {
    definirErro('');
    const resultado = await api('/usuarios', 'POST', {
      nome: nome.trim(),
      email: normalizarEmail(email),
      senha,
    });

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    mostrarToast('Conta criada com sucesso! Confira seu e-mail para confirmar o cadastro.', 'sucesso');
    router.replace({ pathname: '/login/verificar-cadastro', params: { email: normalizarEmail(email) } });
  });

  return (
    <TelaComCabecalho
      titulo="Criar conta"
      aoVoltar={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
      rodape={
        <View style={styles.rodape}>
          <Botao
            titulo="Criar conta"
            tituloCarregando="Criando..."
            pilula
            carregando={carregando}
            aoTocar={() => void criarConta()}
          />
          <View style={styles.linha}>
            <Text style={[styles.textoRodape, { color: tema.cores.textoSuave }]}>Já tem conta? </Text>
            <Link href="/login" asChild>
              <Pressable accessibilityRole="link" hitSlop={8}>
                <Text style={[styles.linkForte, { color: tema.cores.primaria }]}>Entrar</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      }
    >
      <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
        Preencha seus dados para começar.
      </Text>

      {erro ? (
        <FaixaAviso aviso={{ tom: 'erro', titulo: 'Não foi possível criar a conta', mensagem: erro }} />
      ) : null}

      <CampoTextoControlado
        controle={control}
        nome="nome"
        validar={validarNome}
        rotulo="Nome"
        placeholder="Nome"
        icone="person-outline"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => setFocus('email')}
        editable={!carregando}
        compacto
      />

      <CampoTextoControlado
        controle={control}
        nome="email"
        validar={validarEmail}
        rotulo="E-mail"
        icone="mail-outline"
        placeholder="E-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => setFocus('senha')}
        editable={!carregando}
        compacto
      />

      <CampoTextoControlado
        controle={control}
        nome="senha"
        validar={validarSenha}
        rotulo="Senha"
        placeholder="Senha"
        icone="lock-closed-outline"
        secureTextEntry={!senhaVisivel}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => setFocus('confirmacao')}
        editable={!carregando}
        compacto
        acaoFinal={{
          icone: senhaVisivel ? 'eye-off-outline' : 'eye-outline',
          rotuloAcessivel: senhaVisivel ? 'Ocultar senha' : 'Mostrar senha',
          aoTocar: () => definirSenhaVisivel((visivel) => !visivel),
        }}
      />

      <CampoTextoControlado
        controle={control}
        nome="confirmacao"
        validar={(confirmacao, valores) => validarConfirmacaoSenha(valores.senha, confirmacao)}
        rotulo="Confirmar senha"
        placeholder="Confirmar senha"
        icone="lock-closed-outline"
        secureTextEntry={!confirmacaoVisivel}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        editable={!carregando}
        returnKeyType="go"
        onSubmitEditing={() => void criarConta()}
        compacto
        acaoFinal={{
          icone: confirmacaoVisivel ? 'eye-off-outline' : 'eye-outline',
          rotuloAcessivel: confirmacaoVisivel ? 'Ocultar confirmação' : 'Mostrar confirmação',
          aoTocar: () => definirConfirmacaoVisivel((visivel) => !visivel),
        }}
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  descricao: { ...TIPOGRAFIA.corpo },
  rodape: { gap: 12 },
  linha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
  textoRodape: { ...TIPOGRAFIA.corpoPequeno },
  linkForte: { fontFamily: FONTES.titulo, fontSize: 14, lineHeight: 20 },
});
