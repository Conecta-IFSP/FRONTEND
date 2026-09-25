/** Atalho em forma de cartão: ícone, título, descrição e seta para a tela de destino. */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type ItemMenuProps = {
  titulo: string;
  descricao?: string;
  icone: keyof typeof Ionicons.glyphMap;
  aoTocar: () => void;
};

export function ItemMenu({ titulo, descricao, icone, aoTocar }: ItemMenuProps) {
  const { tema } = useTema();
  const { cores } = tema;

  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={descricao}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: cores.superficie, opacity: pressed ? 0.9 : 1 },
        tema.sombra,
      ]}
    >
      <View style={[styles.icone, { backgroundColor: cores.primariaSuave }]}>
        <Ionicons name={icone} size={20} color={cores.primaria} />
      </View>
      <View style={styles.textos}>
        <Text style={[styles.titulo, { color: cores.texto }]}>{titulo}</Text>
        {descricao ? (
          <Text style={[styles.descricao, { color: cores.textoSuave }]}>{descricao}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={cores.textoSutil} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    padding: ESPACO.md + 4,
    borderRadius: RAIO.xl,
  },
  icone: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1 },
  titulo: { fontFamily: FONTES.titulo, fontSize: 15, lineHeight: 22 },
  descricao: { ...TIPOGRAFIA.corpoPequeno, marginTop: 2 },
});
