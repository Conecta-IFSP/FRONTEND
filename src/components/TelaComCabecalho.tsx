/**
 * Estrutura das telas internas: cabeçalho com voltar e título centralizado e
 * conteúdo rolável, seguindo o padrão "título da tela no topo".
 */

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BotaoVoltar } from '@/components/BotaoVoltar';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type TelaComCabecalhoProps = {
  titulo: string;
  children: ReactNode;
  /** Ação do botão de voltar; por padrão volta à tela anterior ou ao início. */
  aoVoltar?: () => void;
};

export function TelaComCabecalho({ titulo, children, aoVoltar }: TelaComCabecalhoProps) {
  const router = useRouter();
  const { tema } = useTema();
  const voltar =
    aoVoltar ?? (() => (router.canGoBack() ? router.back() : router.replace('/inicio')));

  return (
    <SafeAreaView
      style={[styles.tela, { backgroundColor: tema.cores.fundo }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.cabecalho}>
        <BotaoVoltar aoTocar={voltar} />
        <Text
          style={[styles.titulo, { color: tema.cores.texto }]}
          numberOfLines={2}
          accessibilityRole="header"
        >
          {titulo}
        </Text>
        <View style={styles.espaco} />
      </View>

      <KeyboardAvoidingView
        style={styles.tela}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ESPACO.lg,
    paddingVertical: ESPACO.md,
  },
  titulo: { ...TIPOGRAFIA.subtitulo, flex: 1, marginHorizontal: ESPACO.sm, textAlign: 'center' },
  espaco: { width: 44 },
  conteudo: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: ESPACO.lg,
    paddingTop: ESPACO.xs,
    paddingBottom: ESPACO.xxl,
    gap: ESPACO.md,
  },
});
