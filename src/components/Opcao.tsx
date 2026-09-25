/** Opção selecionável em forma de pílula, usada em filtros e escolhas únicas. */

import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ESPACO, FONTES, RAIO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type OpcaoProps = {
  titulo: string;
  selecionado: boolean;
  aoTocar: () => void;
  /** Sem ícone, a opção escolhida mostra um sinal de confirmação. */
  icone?: keyof typeof Ionicons.glyphMap;
  desabilitado?: boolean;
  /** Ícone acima do texto, para opções lado a lado em espaço estreito. */
  empilhado?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Opcao({
  titulo,
  selecionado,
  aoTocar,
  icone,
  desabilitado = false,
  empilhado = false,
  style,
}: OpcaoProps) {
  const { cores } = useTema().tema;
  const corTexto = selecionado ? cores.textoSobrePrimaria : cores.textoSuave;
  const nomeIcone = icone ?? (selecionado ? 'checkmark' : null);

  return (
    <Pressable
      onPress={aoTocar}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ selected: selecionado, disabled: desabilitado }}
      style={({ pressed }) => [
        styles.opcao,
        empilhado ? styles.empilhado : null,
        {
          backgroundColor: selecionado ? cores.primaria : cores.superficie,
          borderColor: selecionado ? cores.primaria : cores.borda,
          opacity: desabilitado ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {nomeIcone ? (
        <Ionicons name={nomeIcone} size={empilhado ? 20 : 16} color={corTexto} />
      ) : null}
      <Text style={[styles.texto, { color: corTexto }]} numberOfLines={1}>
        {titulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  opcao: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: ESPACO.md,
    borderRadius: RAIO.circulo,
    borderWidth: 1,
  },
  empilhado: {
    minHeight: 64,
    flexDirection: 'column',
    gap: ESPACO.xs,
    paddingHorizontal: ESPACO.xs,
    paddingVertical: ESPACO.sm,
    borderRadius: RAIO.lg,
  },
  texto: { flexShrink: 1, fontFamily: FONTES.corpoMedio, fontSize: 13, lineHeight: 18 },
});
