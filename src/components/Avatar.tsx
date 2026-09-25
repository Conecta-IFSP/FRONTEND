/** Círculo com as iniciais da pessoa, usado nas listas de membros. */

import { StyleSheet, Text, View } from 'react-native';

import { FONTES } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primeira}${ultima}`.toUpperCase();
}

export function Avatar({ nome }: { nome: string }) {
  const { cores } = useTema().tema;

  return (
    <View
      style={[styles.circulo, { backgroundColor: cores.primariaSuave }]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Text style={[styles.texto, { color: cores.primaria }]}>{iniciais(nome)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texto: { fontFamily: FONTES.titulo, fontSize: 14, lineHeight: 20 },
});
