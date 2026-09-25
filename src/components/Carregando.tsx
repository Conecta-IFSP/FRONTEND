/** Indicador de carregamento centralizado, na cor principal do tema. */

import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ESPACO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

export function Carregando({ rotulo = 'Carregando' }: { rotulo?: string }) {
  const { tema } = useTema();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={tema.cores.primaria} accessibilityLabel={rotulo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: ESPACO.xl, alignItems: 'center' },
});
