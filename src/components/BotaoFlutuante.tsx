import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';

import { ESPACO, RAIO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type BotaoFlutuanteProps = {
  icone: IoniconsIconName;
  rotulo: string;
  aoTocar: () => void;
  /** Falso nas telas com barra de abas, que já reservam o espaço de baixo. */
  areaSegura?: boolean;
};

export function BotaoFlutuante({ icone, rotulo, aoTocar, areaSegura = true }: BotaoFlutuanteProps) {
  const { tema } = useTema();
  const margens = useSafeAreaInsets();

  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => [
        styles.botao,
        { bottom: ESPACO.lg + (areaSegura ? margens.bottom : 0) },
        { backgroundColor: pressed ? tema.cores.primariaPressionada : tema.cores.primaria },
        tema.sombra,
      ]}
    >
      <Ionicons name={icone} size={26} color={tema.cores.textoSobrePrimaria} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    position: 'absolute',
    right: ESPACO.md,
    width: 56,
    height: 56,
    borderRadius: RAIO.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
