import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useForm } from "react-hook-form";
import * as AuthSession from "expo-auth-session";

import { Botao } from "@/components/Botao";
import { CampoTextoControlado } from "@/components/CampoTexto";
import { Cartao } from "@/components/Cartao";
import { FaixaAviso } from "@/components/FaixaAviso";
import { FundoGradiente } from "@/components/FundoGradiente";
import { Logo } from "@/components/Logo";
import { ESPACO, FONTES, TIPOGRAFIA } from "@/constants/theme";
import { ehPreferenciaTema, useTema } from "@/contexts/TemaContext";
import { api } from "@/services/api";
import { useSessao } from "@/contexts/SessaoContext";
import { normalizarEmail, validarEmail, validarSenha } from "@/utils/validacao";
import {
  getGoogleRedirectUri,
  discovery,
  CLIENT_ID,
  exchangeCodeForToken,
  loginComIdTokenGoogle,
  signInWithGoogleNative,
} from "@/services/google";

type RespostaLogin = {
  access_token?: string;
  token?: string;
  usuario: {
    nome: string;
    tipo?: string;
    organizacao?: string | null;
    tema?: string;
  };
};

type DadosLogin = { email: string; senha: string };

export default function TelaLogin() {
  const sessao = useSessao();
  const { tema, definirPreferencia } = useTema();
  const { control, handleSubmit, setFocus, formState } = useForm<DadosLogin>({
    defaultValues: { email: "", senha: "" },
  });
  const carregando = formState.isSubmitting;
  const [senhaVisivel, definirSenhaVisivel] = useState(false);
  const [erro, definirErro] = useState("");
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);

  const redirectUri = getGoogleRedirectUri();

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri,
      scopes: ["openid", "email", "profile"],
      // O código é trocado pelo backend usando client_secret. Manter PKCE
      // aqui exigiria transportar o code_verifier até o callback/backend.
      usePKCE: false,
    },
    discovery
  );

  const entrar = handleSubmit(async ({ email, senha }) => {
    definirErro("");
    const resultado = await api<RespostaLogin>("/auth/login", "POST", {
      email: normalizarEmail(email),
      senha,
    });

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    const { access_token: accessToken, token, usuario } = resultado.dados;
    if (!accessToken && !token) {
      definirErro("Tente novamente em instantes.");
      return;
    }
    if (!(await sessao.entrar(accessToken ?? token!))) {
      definirErro("Não foi possível verificar sua sessão. Tente novamente.");
      return;
    }
    if (ehPreferenciaTema(usuario.tema)) definirPreferencia(usuario.tema);
  });

  const entrarComGoogle = async () => {
    setCarregandoGoogle(true);
    try {
      // No navegador, manter a navegação na mesma aba evita que o callback
      // monte uma segunda instância do Expo e perca o estado da sessão.
      if (Platform.OS === "web") {
        if (!request?.url) {
          definirErro("A autenticação do Google ainda está carregando. Tente novamente.");
          return;
        }
        window.location.assign(request.url);
        return;
      }

      const nativeResult = await signInWithGoogleNative();
      if (nativeResult.cancelled) return;

      const res = await loginComIdTokenGoogle(nativeResult.idToken);
      if (res.ok) {
        await sessao.entrar(res.dados.access_token);
        return;
      }

      console.error("Erro no login Google:", res.erro);
      definirErro(res.erro || "Falha ao autenticar com Google");
    } catch (error) {
      console.error("Erro OAuth:", error);
      definirErro(error instanceof Error ? error.message : "Falha ao autenticar com Google");
    } finally {
      setCarregandoGoogle(false);
    }
  };

  return (
    <FundoGradiente>
      <Logo largura={180} />
      {sessao.aviso ? (
        <FaixaAviso aviso={{ tom: "informacao", mensagem: sessao.aviso }} />
      ) : null}
      {sessao.erro ? (
        <FaixaAviso aviso={{ tom: "erro", mensagem: sessao.erro }} />
      ) : null}

      <Cartao style={styles.cartao}>
        <Text style={[styles.titulo, { color: tema.cores.texto }]}>Entrar</Text>
        <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
          Faça login em sua conta
        </Text>

        {erro ? (
          <View style={styles.aviso}>
            <FaixaAviso
              aviso={{
                tom: "erro",
                titulo: "Não foi possível entrar",
                mensagem: erro,
              }}
            />
          </View>
        ) : null}

        <View style={styles.campos}>
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
            editable={!carregando}
            onSubmitEditing={() => setFocus("senha")}
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
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            editable={!carregando}
            onSubmitEditing={() => void entrar()}
            acaoFinal={{
              icone: senhaVisivel ? "eye-off-outline" : "eye-outline",
              rotuloAcessivel: senhaVisivel ? "Ocultar senha" : "Mostrar senha",
              aoTocar: () => definirSenhaVisivel((visivel) => !visivel),
            }}
          />
        </View>

        <Link href="/login/recuperar-conta" asChild>
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            style={styles.esqueci}
          >
            <Text style={[styles.link, { color: tema.cores.primaria }]}>
              Esqueci minha senha
            </Text>
          </Pressable>
        </Link>

        <Botao
          titulo="Continuar com Google"
          variante="secundario"
          icone="logo-google"
          carregando={carregandoGoogle}
          aoTocar={entrarComGoogle}
          style={styles.botaoGoogle}
        />

        <Botao
          titulo="Entrar"
          tituloCarregando="Entrando..."
          carregando={carregando}
          aoTocar={() => void entrar()}
          style={styles.botao}
        />
      </Cartao>

      <View style={styles.rodape}>
        <Text style={[styles.textoRodape, { color: tema.cores.textoSuave }]}>
          Ainda não tem conta?{" "}
        </Text>
        <Link href="/login/cadastro" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Text style={[styles.linkForte, { color: tema.cores.primaria }]}>
              Criar conta
            </Text>
          </Pressable>
        </Link>
      </View>
    </FundoGradiente>
  );
}

const styles = StyleSheet.create({
  botaoGoogle: { marginTop: ESPACO.md },
  cartao: { marginTop: ESPACO.xl },
  titulo: { ...TIPOGRAFIA.titulo },
  descricao: { ...TIPOGRAFIA.corpoPequeno, marginTop: ESPACO.xs },
  aviso: { marginTop: ESPACO.lg - 4 },
  campos: { marginTop: ESPACO.lg, gap: ESPACO.md },
  esqueci: { alignSelf: "flex-end", marginTop: ESPACO.md - 4 },
  link: { fontFamily: FONTES.corpoMedio, fontSize: 13, lineHeight: 20 },
  botao: { marginTop: ESPACO.lg },
  rodape: {
    marginTop: ESPACO.xl,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
  },
  textoRodape: { ...TIPOGRAFIA.corpoPequeno },
  linkForte: { fontFamily: FONTES.titulo, fontSize: 14, lineHeight: 20 },
});
