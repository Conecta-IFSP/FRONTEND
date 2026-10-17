import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ESPACO, FONTES } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type Aba<T extends string> = { chave: T; rotulo: string; contador?: number };

type AbasProps<T extends string> = {
  abas: Aba<T>[];
  ativa: T;
  aoEscolher: (chave: T) => void;
};

export function Abas<T extends string>({ abas, ativa, aoEscolher }: AbasProps<T>) {
  const { cores } = useTema().tema;

  return (
    <View accessibilityRole="tablist" style={[styles.barra, { borderBottomColor: cores.bordaSuave }]}>
      {abas.map((aba) => {
        const selecionada = aba.chave === ativa;
        return (
          <Pressable
            key={aba.chave}
            onPress={() => aoEscolher(aba.chave)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selecionada }}
            accessibilityLabel={aba.contador ? `${aba.rotulo}, ${aba.contador}` : aba.rotulo}
            style={({ pressed }) => [styles.aba, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.conteudo}>
              <Text
                style={[
                  styles.texto,
                  {
                    color: selecionada ? cores.primaria : cores.textoSuave,
                    fontFamily: selecionada ? FONTES.titulo : FONTES.corpoMedio,
                  },
                ]}
                numberOfLines={1}
              >
                {aba.rotulo}
              </Text>
              {aba.contador ? (
                <View style={[styles.contador, { backgroundColor: cores.alertaSuave }]}>
                  <Text style={[styles.textoContador, { color: cores.alerta }]}>{aba.contador}</Text>
                </View>
              ) : null}
            </View>
            <View
              style={[styles.linha, { backgroundColor: selecionada ? cores.primaria : 'transparent' }]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: { flexDirection: 'row', borderBottomWidth: 1 },
  aba: { flex: 1, height: 48, justifyContent: 'flex-end' },
  conteudo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: ESPACO.xs,
  },
  texto: { fontSize: 15, lineHeight: 22 },
  contador: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoContador: { fontFamily: FONTES.titulo, fontSize: 11, lineHeight: 14 },
  linha: { height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, marginHorizontal: ESPACO.md },
});
