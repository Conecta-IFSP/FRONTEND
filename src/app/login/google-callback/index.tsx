import { useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { exchangeCodeForToken, getWebCallbackRedirectUri } from '@/services/google';
import { useSessao } from '@/contexts/SessaoContext';

export default function GoogleCallbackWeb() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const { entrar } = useSessao();

  useEffect(() => {
    async function handleCallback() {
      if (params.error) {
        console.error('Erro OAuth:', params.error);
        router.replace('/login');
        return;
      }

      const code = params.code;
      if (!code) {
        console.error('Código não recebido');
        router.replace('/login');
        return;
      }

      try {
        const redirectUri = getWebCallbackRedirectUri();
        const res = await exchangeCodeForToken(code, redirectUri);
        if (res.ok) {
          await entrar(res.dados.access_token);
          router.replace('/inicio');
        } else {
          console.error('Erro ao trocar code:', res.erro);
          router.replace('/login');
        }
      } catch (e) {
        console.error('Erro no callback:', e);
        router.replace('/login');
      }
    }

    handleCallback();
  }, [params.code, params.error, router, entrar]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#256ef1" />
      <Text style={styles.text}>Finalizando login…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6fb',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#526078',
  },
});