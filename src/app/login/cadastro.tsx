/** Tela de criação de conta: valida os dados e cadastra o usuário. */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
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

type Erros = {
  nome: string | null;
  email: string | null;
  senha: string | null;
  confirmacao: string | null;
};

export default function TelaCadastro() {
  const router = useRouter();
  const { tema } = useTema();
  const [nome, definirNome] = useState('');
  const [email, definirEmail] = useState('');
  const [senha, definirSenha] = useState('');
  const [confirmacao, definirConfirmacao] = useState('');
  const [senhaVisivel, definirSenhaVisivel] = useState(false);
  const [confirmacaoVisivel, definirConfirmacaoVisivel] = useState(false);
  const [erros, definirErros] = useState<Erros>({
    nome: null,
    email: null,
    senha: null,
    confirmacao: null,
  });
  const [erro, definirErro] = useState('');
  const [carregando, definirCarregando] = useState(false);

  function limpar(campo: keyof Erros) {
    definirErros((atuais) => ({ ...atuais, [campo]: null }));
    definirErro('');
  }

  async function criarConta() {
    const encontrados: Erros = {
      nome: validarNome(nome),
      email: validarEmail(email),
      senha: validarSenha(senha),
      confirmacao: validarConfirmacaoSenha(senha, confirmacao),
    };
    definirErros(encontrados);
    definirErro('');
    if (Object.values(encontrados).some(Boolean) || carregando) return;

    definirCarregando(true);
    const resultado = await api('/usuarios', 'POST', {
      nome: nome.trim(),
      email: normalizarEmail(email),
      senha,
    });
    definirCarregando(false);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    router.replace('/login');
  }

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
          <CampoTexto
            rotulo="Nome"
            icone="person-outline"
            placeholder="Seu nome completo"
            value={nome}
            onChangeText={(valor) => {
              definirNome(valor);
              limpar('nome');
            }}
            erro={erros.nome}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            editable={!carregando}
          />

          <CampoTexto
            rotulo="E-mail"
            icone="mail-outline"
            placeholder="nome@organizacao.com"
            value={email}
            onChangeText={(valor) => {
              definirEmail(valor);
              limpar('email');
            }}
            erro={erros.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!carregando}
          />

          <CampoTexto
            rotulo="Senha"
            icone="lock-closed-outline"
            placeholder="Crie uma senha"
            value={senha}
            onChangeText={(valor) => {
              definirSenha(valor);
              limpar('senha');
            }}
            erro={erros.senha}
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

          <CampoTexto
            rotulo="Confirmar senha"
            icone="lock-closed-outline"
            placeholder="Digite novamente"
            value={confirmacao}
            onChangeText={(valor) => {
              definirConfirmacao(valor);
              limpar('confirmacao');
            }}
            erro={erros.confirmacao}
            secureTextEntry={!confirmacaoVisivel}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            editable={!carregando}
            returnKeyType="go"
            onSubmitEditing={criarConta}
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
          aoTocar={criarConta}
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
