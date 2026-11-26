import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ESPACO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type FundoGradienteProps = {
  marca: ReactNode;
  children: ReactNode;
  rodape: ReactNode;
};

export function FundoGradiente({ marca, children, rodape }: FundoGradienteProps) {
  const { primariaSuave, secundariaSuave, fundo } = useTema().tema.cores;

  return (
    <View style={[styles.flex, { backgroundColor: fundo }]}>
      <LinearGradient
        colors={[primariaSuave, secundariaSuave, fundo]}
        locations={[0, 0.3, 0.6]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.conteudo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          bottomOffset={ESPACO.md}
        >
          <View style={styles.marca}>{marca}</View>
          <View style={styles.formulario}>{children}</View>
          <View style={styles.rodape}>{rodape}</View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: ESPACO.lg,
  },
  marca: { flexGrow: 1, flexShrink: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: ESPACO.md },
  formulario: { gap: ESPACO.md },
  rodape: {
    alignItems: 'center',
    gap: ESPACO.md,
    paddingTop: ESPACO.lg,
    paddingBottom: ESPACO.md,
  },
});
