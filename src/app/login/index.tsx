/** Tela de login: valida as credenciais, guarda o token e abre o início. */

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Cartao } from '@/components/Cartao';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FundoGradiente } from '@/components/FundoGradiente';
import { Logo } from '@/components/Logo';
import { ESPACO, FONTES, TIPOGRAFIA } from '@/constants/theme';
import { ehPreferenciaTema, useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { useSessao } from '@/contexts/SessaoContext';
import { normalizarEmail, validarEmail, validarSenha } from '@/utils/validacao';

type RespostaLogin = {
  access_token?: string;
  token?: string;
  usuario: { nome: string; tipo?: string; organizacao?: string | null; tema?: string };
};

export default function TelaLogin() {
  const sessao = useSessao();
  const { tema, definirPreferencia } = useTema();
  const campoSenha = useRef<TextInput>(null);
  const [email, definirEmail] = useState('');
  const [senha, definirSenha] = useState('');
  const [senhaVisivel, definirSenhaVisivel] = useState(false);
  const [erros, definirErros] = useState<{ email: string | null; senha: string | null }>({
    email: null,
    senha: null,
  });
  const [erro, definirErro] = useState('');
  const [carregando, definirCarregando] = useState(false);

  async function entrar() {
    const encontrados = { email: validarEmail(email), senha: validarSenha(senha) };
    definirErros(encontrados);
    definirErro('');
    if (encontrados.email || encontrados.senha || carregando) return;

    definirCarregando(true);
    const resultado = await api<RespostaLogin>('/auth/login', 'POST', {
      email: normalizarEmail(email),
      senha,
    });

    if (!resultado.ok) {
      definirCarregando(false);
      definirErro(resultado.erro);
      return;
    }

    const { access_token: accessToken, token, usuario } = resultado.dados;
    if (!accessToken && !token) { definirCarregando(false); definirErro('O servidor não retornou uma sessão válida.'); return; }
    if (!await sessao.entrar(accessToken ?? token!)) {
      definirCarregando(false);
      definirErro('Não foi possível verificar sua sessão. Tente novamente.');
      return;
    }
    if (ehPreferenciaTema(usuario.tema)) definirPreferencia(usuario.tema);
  }

  return (
    <FundoGradiente>
      <Logo largura={180} />
      {sessao.aviso ? <FaixaAviso aviso={{ tom: 'informacao', mensagem: sessao.aviso }} /> : null}
      {sessao.erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: sessao.erro }} /> : null}

      <Cartao style={styles.cartao}>
        <Text style={[styles.titulo, { color: tema.cores.texto }]}>Entrar</Text>
        <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
          Faça login em sua conta
        </Text>

        {erro ? (
          <View style={styles.aviso}>
            <FaixaAviso aviso={{ tom: 'erro', titulo: 'Não foi possível entrar', mensagem: erro }} />
          </View>
        ) : null}

        <View style={styles.campos}>
          <CampoTexto
            rotulo="E-mail"
            icone="mail-outline"
            placeholder="nome@organizacao.com"
            value={email}
            onChangeText={(valor) => {
              definirEmail(valor);
              definirErros((atuais) => ({ ...atuais, email: null }));
            }}
            erro={erros.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            editable={!carregando}
            onSubmitEditing={() => campoSenha.current?.focus()}
          />

          <CampoTexto
            ref={campoSenha}
            rotulo="Senha"
            icone="lock-closed-outline"
            placeholder="Sua senha"
            value={senha}
            onChangeText={(valor) => {
              definirSenha(valor);
              definirErros((atuais) => ({ ...atuais, senha: null }));
            }}
            erro={erros.senha}
            secureTextEntry={!senhaVisivel}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            editable={!carregando}
            onSubmitEditing={entrar}
            acaoFinal={{
              icone: senhaVisivel ? 'eye-off-outline' : 'eye-outline',
              rotuloAcessivel: senhaVisivel ? 'Ocultar senha' : 'Mostrar senha',
              aoTocar: () => definirSenhaVisivel((visivel) => !visivel),
            }}
          />
        </View>

        <Link href="/login/recuperar-conta" asChild>
          <Pressable accessibilityRole="link" hitSlop={8} style={styles.esqueci}>
            <Text style={[styles.link, { color: tema.cores.primaria }]}>Esqueci minha senha</Text>
          </Pressable>
        </Link>

        <Botao
          titulo="Entrar"
          tituloCarregando="Entrando..."
          carregando={carregando}
          aoTocar={entrar}
          style={styles.botao}
        />
      </Cartao>

      <View style={styles.rodape}>
        <Text style={[styles.textoRodape, { color: tema.cores.textoSuave }]}>
          Ainda não tem conta?{' '}
        </Text>
        <Link href="/login/cadastro" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Text style={[styles.linkForte, { color: tema.cores.primaria }]}>Criar conta</Text>
          </Pressable>
        </Link>
      </View>
    </FundoGradiente>
  );
}

const styles = StyleSheet.create({
  cartao: { marginTop: ESPACO.xl },
  titulo: { ...TIPOGRAFIA.titulo },
  descricao: { ...TIPOGRAFIA.corpoPequeno, marginTop: ESPACO.xs },
  aviso: { marginTop: ESPACO.lg - 4 },
  campos: { marginTop: ESPACO.lg, gap: ESPACO.md },
  esqueci: { alignSelf: 'flex-end', marginTop: ESPACO.md - 4 },
  link: { fontFamily: FONTES.corpoMedio, fontSize: 13, lineHeight: 20 },
  botao: { marginTop: ESPACO.lg },
  rodape: {
    marginTop: ESPACO.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoRodape: { ...TIPOGRAFIA.corpoPequeno },
  linkForte: { fontFamily: FONTES.titulo, fontSize: 14, lineHeight: 20 },
});
