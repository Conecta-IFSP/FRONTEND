import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/tabs';

import { FONTES } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

const ABAS = [
  { nome: 'inicio', rotulo: 'Início', icone: 'home-outline', iconeAtivo: 'home' },
  { nome: 'agenda', rotulo: 'Agenda', icone: 'calendar-outline', iconeAtivo: 'calendar' },
  { nome: 'organizacoes', rotulo: 'Organizações', icone: 'business-outline', iconeAtivo: 'business' },
] as const;

export function BarraAbas({ state, navigation }: BottomTabBarProps) {
  const { cores } = useTema().tema;
  const margens = useSafeAreaInsets();
  const atual = state.routes[state.index]?.name;
  const ativa = atual === 'organizacao' ? 'organizacoes' : atual;
  const disponiveis = ABAS.filter((aba) => state.routes.some((rota) => rota.name === aba.nome));

  if (disponiveis.length < 2) return null;

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.barra,
        { backgroundColor: cores.superficie, borderTopColor: cores.bordaSuave, paddingBottom: margens.bottom },
      ]}
    >
      {disponiveis.map((aba) => {
        const selecionada = aba.nome === ativa;
        const rota = state.routes.find((item) => item.name === aba.nome);
        const cor = selecionada ? cores.primaria : cores.textoSutil;

        return (
          <Pressable
            key={aba.nome}
            accessibilityRole="tab"
            accessibilityLabel={aba.rotulo}
            accessibilityState={{ selected: selecionada }}
            onPress={() => {
              if (!rota) return;
              const evento = navigation.emit({ type: 'tabPress', target: rota.key, canPreventDefault: true });
              if (atual !== aba.nome && !evento.defaultPrevented) navigation.navigate(rota.name);
            }}
            style={styles.aba}
          >
            <View style={[styles.indicador, { backgroundColor: selecionada ? cores.primariaSuave : 'transparent' }]}>
              <Ionicons name={selecionada ? aba.iconeAtivo : aba.icone} size={22} color={cor} />
            </View>
            <Text
              style={[styles.rotulo, { color: cor, fontFamily: selecionada ? FONTES.titulo : FONTES.corpoMedio }]}
              numberOfLines={1}
            >
              {aba.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: { flexDirection: 'row', borderTopWidth: 1 },
  aba: { flex: 1, height: 64, alignItems: 'center', justifyContent: 'center', gap: 4 },
  indicador: { width: 56, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rotulo: { fontSize: 12, lineHeight: 16 },
});
