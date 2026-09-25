/** Pilha de navegação do aplicativo, fontes da marca e tema. */

import { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';

import { TemaProvider, useTema } from '@/contexts/TemaContext';
import { SessaoProvider, useSessao } from '@/contexts/SessaoContext';
import { Carregando } from '@/components/Carregando';

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
    <TemaProvider>
      <SessaoProvider><Navegacao /></SessaoProvider>
    </TemaProvider>
  );
}

function Navegacao() {
  const { tema } = useTema();
  const { usuario, carregando, atualizar } = useSessao();
  const caminho = usePathname();
  useEffect(() => { void atualizar(); }, [caminho, atualizar]);
  if (carregando) return <Carregando rotulo="Verificando sessão" />;

  return (
    <>
      <StatusBar style={tema.escuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.cores.fundo } }}
      >
        <Stack.Screen name="index" />
        <Stack.Protected guard={!usuario}>
          <Stack.Screen name="login/index" />
          <Stack.Screen name="login/cadastro" />
          <Stack.Screen name="login/recuperar-conta" />
        </Stack.Protected>
        <Stack.Screen name="login/redefinir-senha" />
        <Stack.Protected guard={Boolean(usuario)}>
          <Stack.Screen name="inicio" />
          <Stack.Screen name="perfil" />
          <Stack.Screen name="login/alterar-senha" />
        </Stack.Protected>
        <Stack.Protected guard={usuario?.tipo === 'ADMIN_SISTEMA'}>
          <Stack.Screen name="organizacoes/aprovacao" />
          <Stack.Screen name="sistema" />
        </Stack.Protected>
        <Stack.Protected guard={usuario?.tipo === 'USUARIO'}>
          <Stack.Screen name="organizacoes/cadastro" />
          <Stack.Screen name="organizacoes/participar" />
          <Stack.Screen name="organizacoes/membros" />
          <Stack.Screen name="comissoes/index" />
          <Stack.Screen name="comissoes/nova" />
          <Stack.Screen name="comissoes/[id]" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
