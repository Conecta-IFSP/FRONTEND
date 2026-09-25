/** Botão só com ícone, para ações em espaços estreitos. O rótulo é lido pelo leitor de tela. */

import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { RAIO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type BotaoIconeProps = {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  aoTocar: () => void;
  variante?: 'secundario' | 'perigo';
  desabilitado?: boolean;
  /** Explicação extra lida pelo leitor de tela. */
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
