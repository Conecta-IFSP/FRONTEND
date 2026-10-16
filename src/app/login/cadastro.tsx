import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { Cartao } from '@/components/Cartao';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FundoGradiente } from '@/components/FundoGradiente';
import { Logo } from '@/components/Logo';
import { ESPACO, FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
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
  const { control, handleSubmit, formState } = useForm<DadosCadastro>({
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

    router.replace({ pathname: '/login/verificar-cadastro', params: { email: normalizarEmail(email) } });
  });

  return (
    <FundoGradiente aoVoltar={() => router.back()}>
      <Logo largura={150} />

      <Cartao style={styles.cartao}>
        <Text style={[styles.titulo, { color: tema.cores.texto }]}>Criar conta</Text>
        <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
          Cadastre seus dados para começar a usar o Conecta+.
        </Text>

        {erro ? (
          <View style={styles.aviso}>
            <FaixaAviso
              aviso={{ tom: 'erro', titulo: 'Não foi possível criar a conta', mensagem: erro }}
            />
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
            autoComplete="name"
            textContentType="name"
            editable={!carregando}
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
            editable={!carregando}
          />

          <CampoTextoControlado
            controle={control}
            nome="senha"
            validar={validarSenha}
            rotulo="Senha"
            icone="lock-closed-outline"
            placeholder="Senha"
            secureTextEntry={!senhaVisivel}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            editable={!carregando}
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
            icone="lock-closed-outline"
            placeholder="Repita a senha"
            secureTextEntry={!confirmacaoVisivel}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            editable={!carregando}
            returnKeyType="go"
            onSubmitEditing={() => void criarConta()}
            acaoFinal={{
              icone: confirmacaoVisivel ? 'eye-off-outline' : 'eye-outline',
              rotuloAcessivel: confirmacaoVisivel ? 'Ocultar confirmação' : 'Mostrar confirmação',
              aoTocar: () => definirConfirmacaoVisivel((visivel) => !visivel),
            }}
          />
        </View>

        <Botao
          titulo="Criar conta"
          tituloCarregando="Criando..."
          carregando={carregando}
          aoTocar={() => void criarConta()}
          style={styles.botao}
        />
      </Cartao>

      <View style={styles.rodape}>
        <Text style={[styles.textoRodape, { color: tema.cores.textoSuave }]}>
          Já tem uma conta?{' '}
        </Text>
        <Link href="/login" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Text style={[styles.linkForte, { color: tema.cores.primaria }]}>Entrar</Text>
          </Pressable>
        </Link>
      </View>
    </FundoGradiente>
  );
}

const styles = StyleSheet.create({
  cartao: { marginTop: ESPACO.lg },
  titulo: { ...TIPOGRAFIA.titulo },
  descricao: { ...TIPOGRAFIA.corpoPequeno, marginTop: ESPACO.xs },
  aviso: { marginTop: ESPACO.lg - 4 },
  campos: { marginTop: ESPACO.lg, gap: ESPACO.md },
  botao: { marginTop: ESPACO.lg },
  rodape: {
    marginTop: ESPACO.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoRodape: { ...TIPOGRAFIA.corpoPequeno },
  linkForte: { fontFamily: FONTES.titulo, fontSize: 14, lineHeight: 20 },
});
