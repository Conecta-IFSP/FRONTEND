import { useCallback, useEffect, useState } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { consumirRetornoPresenca } from '@/services/retorno-presenca';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';

import { TemaProvider, useTema } from '@/contexts/TemaContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SessaoProvider, useSessao } from '@/contexts/SessaoContext';
import { Carregando } from '@/components/Carregando';
import { DesbloqueioSessao } from '@/components/DesbloqueioSessao';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function LayoutRaiz() {
  const [carregadas, erro] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    if (carregadas || erro) void SplashScreen.hideAsync();
  }, [carregadas, erro]);

  if (!carregadas && !erro) return null;

  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge>
      <TemaProvider>
        <ToastProvider>
          <SessaoProvider><Navegacao /></SessaoProvider>
        </ToastProvider>
      </TemaProvider>
    </KeyboardProvider>
  );
}

function Navegacao() {
  const { tema } = useTema();
  const { usuario, carregando, atualizar, sair } = useSessao();
  const usuarioId = usuario?._id;
  const caminho = usePathname();
  const router = useRouter();
  // Desbloqueio na abertura: só a sessão que já estava salva quando o app abriu pede biometria/PIN.
  // Quem entra pelo login nesta abertura não passa por aqui de novo.
  const [desbloqueio, definirDesbloqueio] = useState<'avaliando' | 'pendente' | 'liberado'>('avaliando');
  // Ajuste feito no próprio render (e não num efeito), como recomenda a documentação do React:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (!carregando) {
    if (desbloqueio === 'avaliando') definirDesbloqueio(usuarioId ? 'pendente' : 'liberado');
    // A sessão caiu enquanto esperava o desbloqueio: o próximo login não deve ser bloqueado.
    else if (desbloqueio === 'pendente' && !usuarioId) definirDesbloqueio('liberado');
  }
  const liberar = useCallback(() => definirDesbloqueio('liberado'), []);
  // Sem router aqui: o Stack ainda não está montado. Sem usuário, as rotas protegidas
  // levam ao index, que redireciona para /login.
  const entrarComSenha = useCallback(async () => {
    await sair();
    definirDesbloqueio('liberado');
  }, [sair]);
  const bloqueado = desbloqueio === 'avaliando' || (desbloqueio === 'pendente' && Boolean(usuario));

  useEffect(() => {
    if (!usuarioId || carregando || bloqueado || caminho.includes('google-callback')) return;
    let ativa = true;
    void consumirRetornoPresenca().then(retorno => {
      if (ativa && retorno && caminho !== '/presenca') router.replace({ pathname: '/presenca', params: retorno });
    }).catch(() => {});
    return () => { ativa = false; };
  }, [usuarioId, carregando, bloqueado, caminho, router]);
  useEffect(() => { void atualizar(); }, [caminho, atualizar]);
  if (carregando || desbloqueio === 'avaliando') return <Carregando rotulo="Verificando sessão" />;
  if (bloqueado && usuario) {
    return (
      <>
        <StatusBar style={tema.escuro ? 'light' : 'dark'} />
        <DesbloqueioSessao nome={usuario.nome} aoLiberar={liberar} aoEntrarComSenha={entrarComSenha} />
      </>
    );
  }

  return (
    <>
      <StatusBar style={tema.escuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.cores.fundo } }}
      >
        <Stack.Screen name="index" />
        {/* Fora dos grupos protegidos: a Ajuda e o manual abrem com ou sem login. */}
        <Stack.Screen name="ajuda" />
        <Stack.Screen name="manual" />
        <Stack.Screen name="presenca" />
        <Stack.Protected guard={!usuario}>
          <Stack.Screen name="login/index" />
          <Stack.Screen name="login/cadastro" />
          <Stack.Screen name="login/verificar-cadastro" />
          <Stack.Screen name="login/recuperar-conta" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(usuario)}>
          <Stack.Screen name="(abas)" />
          <Stack.Screen name="perfil" />
          <Stack.Screen name="sobre" />
          <Stack.Screen name="login/alterar-senha" />
          <Stack.Screen name="login/trocar-email" />
        </Stack.Protected>
        <Stack.Protected guard={usuario?.tipo === 'ADMIN_SISTEMA'}>
          <Stack.Screen name="organizacoes/aprovacao" />
          <Stack.Screen name="sistema" />
        </Stack.Protected>
        <Stack.Protected guard={usuario?.tipo === 'USUARIO'}>
          <Stack.Screen name="organizacoes/cadastro" />
          <Stack.Screen name="organizacoes/participar" />
          <Stack.Screen name="comissoes/nova" />
          <Stack.Screen name="comissoes/[id]" />
          <Stack.Screen name="reunioes/nova" />
          <Stack.Screen name="reunioes/[id]" />
          <Stack.Screen name="reunioes/registros" />
          <Stack.Screen name="reunioes/acesso" />
          <Stack.Screen name="notificacoes" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
