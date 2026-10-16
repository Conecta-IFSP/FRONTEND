import { useState, type ReactNode } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BotaoVoltar } from '@/components/BotaoVoltar';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type TelaComCabecalhoProps = {
  titulo: string;
  children: ReactNode;
  aoVoltar?: () => void;
  aoAtualizar?: () => Promise<unknown>;
};

export function TelaComCabecalho({ titulo, children, aoVoltar, aoAtualizar }: TelaComCabecalhoProps) {
  const router = useRouter();
  const { tema } = useTema();
  const [atualizando, definirAtualizando] = useState(false);
  const voltar =
    aoVoltar ?? (() => (router.canGoBack() ? router.back() : router.replace('/inicio')));

  async function atualizar() {
    if (!aoAtualizar) return;
    definirAtualizando(true);
    try {
      await aoAtualizar();
    } finally {
      definirAtualizando(false);
    }
  }

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

      <KeyboardAwareScrollView
        style={styles.tela}
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
        bottomOffset={ESPACO.lg}
        refreshControl={
          aoAtualizar ? (
            <RefreshControl
              refreshing={atualizando}
              onRefresh={atualizar}
              colors={[tema.cores.primaria]}
              tintColor={tema.cores.primaria}
              progressBackgroundColor={tema.cores.superficie}
            />
          ) : undefined
        }
      >
        {children}
      </KeyboardAwareScrollView>
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
