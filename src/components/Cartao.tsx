/** Superfície com cantos arredondados e sombra suave, usada para agrupar conteúdo. */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ESPACO, RAIO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type CartaoProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Torna o cartão tocável, como um item de lista que abre outra tela. */
  aoTocar?: () => void;
  rotuloAcessivel?: string;
};

export function Cartao({ children, style, aoTocar, rotuloAcessivel }: CartaoProps) {
  const { tema } = useTema();
  const aparencia = [styles.cartao, { backgroundColor: tema.cores.superficie }, tema.sombra];

  if (aoTocar) {
    return (
      <Pressable
        onPress={aoTocar}
        accessibilityRole="button"
        accessibilityLabel={rotuloAcessivel}
        style={({ pressed }) => [aparencia, { opacity: pressed ? 0.9 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[aparencia, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  cartao: { borderRadius: RAIO.xl, padding: ESPACO.lg },
});
