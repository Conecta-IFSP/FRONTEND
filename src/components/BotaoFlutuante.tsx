import { Pressable, StyleSheet } from 'react-native';
import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';

import { ESPACO, RAIO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type BotaoFlutuanteProps = {
  icone: IoniconsIconName;
  rotulo: string;
  aoTocar: () => void;
};

export function BotaoFlutuante({ icone, rotulo, aoTocar }: BotaoFlutuanteProps) {
  const { tema } = useTema();

  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => [
        styles.botao,
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
    bottom: ESPACO.lg,
    width: 56,
    height: 56,
    borderRadius: RAIO.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
