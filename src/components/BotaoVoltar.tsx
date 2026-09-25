/** Botão circular de voltar, usado no topo das telas. */

import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTema } from '@/contexts/TemaContext';

type BotaoVoltarProps = {
  aoTocar: () => void;
  rotulo?: string;
};

export function BotaoVoltar({ aoTocar, rotulo = 'Voltar' }: BotaoVoltarProps) {
  const { tema } = useTema();

  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={8}
      style={({ pressed }) => [
        styles.botao,
        { backgroundColor: tema.cores.superficie, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Ionicons name="arrow-back" size={20} color={tema.cores.texto} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
