/** Mensagem de lista vazia, com ícone, para quando não há nada a mostrar. */

import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ESPACO, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type EstadoVazioProps = {
  icone: keyof typeof Ionicons.glyphMap;
  mensagem: string;
};

export function EstadoVazio({ icone, mensagem }: EstadoVazioProps) {
  const { cores } = useTema().tema;

  return (
    <View style={[styles.container, { borderColor: cores.borda }]}>
      <View style={[styles.icone, { backgroundColor: cores.superficieSuave }]}>
        <Ionicons name={icone} size={24} color={cores.textoSutil} />
      </View>
      <Text style={[styles.mensagem, { color: cores.textoSuave }]}>{mensagem}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: ESPACO.md - 4,
    padding: ESPACO.lg,
    borderRadius: RAIO.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  icone: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mensagem: { ...TIPOGRAFIA.corpoPequeno, textAlign: 'center' },
});
