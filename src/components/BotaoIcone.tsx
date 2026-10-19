import { Pressable, StyleSheet } from 'react-native';
import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';

import { RAIO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type BotaoIconeProps = {
  icone: IoniconsIconName;
  rotulo: string;
  aoTocar: () => void;
  variante?: 'secundario' | 'perigo';
  desabilitado?: boolean;
  dica?: string;
};

export function BotaoIcone({
  icone,
  rotulo,
  aoTocar,
  variante = 'secundario',
  desabilitado = false,
  dica,
}: BotaoIconeProps) {
  const { cores } = useTema().tema;
  const perigo = variante === 'perigo';

  return (
    <Pressable
      onPress={aoTocar}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityHint={dica}
      accessibilityState={{ disabled: desabilitado }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.botao,
        {
          borderColor: perigo ? cores.erro : cores.borda,
          backgroundColor: cores.superficie,
          opacity: desabilitado ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name={icone} size={18} color={perigo ? cores.erro : cores.primaria} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    width: 44,
    height: 44,
    borderRadius: RAIO.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
