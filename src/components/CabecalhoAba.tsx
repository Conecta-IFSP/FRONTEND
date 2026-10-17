import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';

type CabecalhoAbaProps = {
  titulo?: string;
  children?: ReactNode;
  acoes?: ReactNode;
};

export function CabecalhoAba({ titulo, children, acoes }: CabecalhoAbaProps) {
  const router = useRouter();
  const { cores } = useTema().tema;
  const { usuario } = useSessao();

  return (
    <View style={styles.cabecalho}>
      <View style={styles.titulos}>
        {children ?? (
          <Text style={[styles.titulo, { color: cores.texto }]} accessibilityRole="header" numberOfLines={1}>
            {titulo}
          </Text>
        )}
      </View>
      {acoes}
      <Pressable
        onPress={() => router.push('/perfil')}
        accessibilityRole="button"
        accessibilityLabel="Perfil"
        hitSlop={4}
        style={({ pressed }) => [styles.perfil, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Avatar nome={usuario?.nome ?? ''} tamanho={34} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.xs,
    paddingLeft: ESPACO.md,
    paddingRight: ESPACO.sm,
  },
  titulos: { flex: 1, minWidth: 0 },
  titulo: { ...TIPOGRAFIA.titulo },
  perfil: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
