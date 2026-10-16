import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { BotaoVoltar } from '@/components/BotaoVoltar';
import { ESPACO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type FundoGradienteProps = {
  children: ReactNode;
  aoVoltar?: () => void;
  rotuloVoltar?: string;
};

export function FundoGradiente({ children, aoVoltar, rotuloVoltar }: FundoGradienteProps) {
  const { primariaSuave, secundariaSuave, fundo } = useTema().tema.cores;

  return (
    <LinearGradient colors={[primariaSuave, secundariaSuave, fundo]} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.conteudo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={ESPACO.lg}
        >
          {aoVoltar ? <BotaoVoltar aoTocar={aoVoltar} rotulo={rotuloVoltar} /> : null}
          <View style={styles.centro}>{children}</View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: { flexGrow: 1, padding: ESPACO.lg },
  centro: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingVertical: ESPACO.md,
  },
});
