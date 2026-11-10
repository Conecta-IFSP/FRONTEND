import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FONTES, RAIO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type OpcaoSegmento<T extends string> = { valor: T; titulo: string };

type ControleSegmentadoProps<T extends string> = {
  opcoes: readonly OpcaoSegmento<T>[];
  valor: T;
  aoMudar: (valor: T) => void;
  rotuloAcessivel: string;
  desabilitado?: boolean;
};

/** Seletor compacto de uma opção entre poucas (2 a 4), com a altura de um botão comum. */
export function ControleSegmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotuloAcessivel,
  desabilitado = false,
}: ControleSegmentadoProps<T>) {
  const { tema } = useTema();
  const { cores } = tema;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={rotuloAcessivel}
      style={[styles.trilho, { backgroundColor: cores.superficieSuave, opacity: desabilitado ? 0.6 : 1 }]}
    >
      {opcoes.map((opcao) => {
        const selecionado = opcao.valor === valor;
        return (
          <Pressable
            key={opcao.valor}
            onPress={() => aoMudar(opcao.valor)}
            disabled={desabilitado}
            accessibilityRole="radio"
            accessibilityLabel={opcao.titulo}
            accessibilityState={{ checked: selecionado, disabled: desabilitado }}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => [
              styles.segmento,
              selecionado ? [{ backgroundColor: cores.superficie }, tema.sombra] : null,
              { opacity: pressed && !selecionado ? 0.7 : 1 },
            ]}
          >
            <Text
              style={[
                styles.texto,
                {
                  color: selecionado ? cores.primaria : cores.textoSuave,
                  fontFamily: selecionado ? FONTES.titulo : FONTES.corpoMedio,
                },
              ]}
              numberOfLines={1}
            >
              {opcao.titulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: { flexDirection: 'row', borderRadius: RAIO.circulo, padding: 3 },
  segmento: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: RAIO.circulo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { fontSize: 13, lineHeight: 18 },
});
