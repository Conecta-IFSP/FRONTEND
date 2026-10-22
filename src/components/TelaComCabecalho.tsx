import { useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { ESPACO, FONTES } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type TelaComCabecalhoProps = {
  titulo: string;
  children: ReactNode;
  aoVoltar?: () => void;
  aoAtualizar?: () => Promise<unknown>;
  acao?: ReactNode;
  sobreposto?: ReactNode;
  subtitulo?: string;
  iconeVoltar?: 'arrow-back' | 'close';
  rotuloVoltar?: string;
  fundo?: 'fundo' | 'superficie';
  cabecalhoSuperficie?: boolean;
  divisor?: boolean;
  rodape?: ReactNode;
};

export function TelaComCabecalho({
  titulo,
  children,
  aoVoltar,
  aoAtualizar,
  acao,
  sobreposto,
  subtitulo,
  iconeVoltar = 'arrow-back',
  rotuloVoltar,
  fundo = 'fundo',
  cabecalhoSuperficie = false,
  divisor = false,
  rodape,
}: TelaComCabecalhoProps) {
  const router = useRouter();
  const { tema } = useTema();
  const { cores } = tema;
  const margens = useSafeAreaInsets();
  const [atualizando, definirAtualizando] = useState(false);
  const [alturaRodape, definirAlturaRodape] = useState(0);
  const voltar =
    aoVoltar ?? (() => (router.canGoBack() ? router.back() : router.replace('/inicio')));
  const corFundo = fundo === 'superficie' ? cores.superficie : cores.fundo;

  async function atualizar() {
    if (!aoAtualizar) return;
    definirAtualizando(true);
    try {
      await aoAtualizar();
    } finally {
      definirAtualizando(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.tela, { backgroundColor: cabecalhoSuperficie ? cores.superficie : corFundo }]}
      edges={['top', 'bottom']}
    >
      <View
        style={[
          styles.cabecalho,
          subtitulo ? styles.cabecalhoAlto : null,
          { backgroundColor: cabecalhoSuperficie ? cores.superficie : corFundo },
          divisor ? { borderBottomWidth: 1, borderBottomColor: cores.bordaSuave } : null,
        ]}
      >
        <Pressable
          onPress={voltar}
          accessibilityRole="button"
          accessibilityLabel={rotuloVoltar ?? (iconeVoltar === 'close' ? 'Cancelar' : 'Voltar')}
          hitSlop={4}
          style={({ pressed }) => [styles.botaoVoltar, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name={iconeVoltar} size={24} color={cores.texto} />
        </Pressable>
        <View style={styles.titulos}>
          <Text
            style={[styles.titulo, { color: cores.texto }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {titulo}
          </Text>
          {subtitulo ? (
            <View style={styles.subtitulo}>
              <View style={[styles.ponto, { backgroundColor: cores.primaria }]} />
              <Text style={[styles.textoSubtitulo, { color: cores.textoSuave }]} numberOfLines={1}>
                {subtitulo}
              </Text>
            </View>
          ) : null}
        </View>
        {acao}
      </View>

      <KeyboardAwareScrollView
        style={[styles.tela, { backgroundColor: corFundo }]}
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
        bottomOffset={rodape ? alturaRodape + ESPACO.md : ESPACO.lg}
        alwaysBounceVertical={Boolean(aoAtualizar)}
        refreshControl={
          aoAtualizar ? (
            <RefreshControl
              refreshing={atualizando}
              onRefresh={atualizar}
              colors={[cores.primaria]}
              tintColor={cores.primaria}
              progressBackgroundColor={cores.superficie}
            />
          ) : undefined
        }
      >
        {children}
      </KeyboardAwareScrollView>
      {rodape ? (
        <KeyboardStickyView offset={{ closed: 0, opened: margens.bottom }}>
          <View
            onLayout={(evento) => definirAlturaRodape(evento.nativeEvent.layout.height)}
            style={[
              styles.rodape,
              { backgroundColor: cores.superficie, borderTopColor: cores.bordaSuave },
            ]}
          >
            <View style={styles.larguraRodape}>{rodape}</View>
          </View>
        </KeyboardStickyView>
      ) : null}
      {sobreposto}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  cabecalho: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.xs,
    paddingHorizontal: ESPACO.xs,
  },
  cabecalhoAlto: { height: 64 },
  botaoVoltar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titulos: { flex: 1, minWidth: 0, paddingRight: ESPACO.sm },
  titulo: { fontFamily: FONTES.titulo, fontSize: 18, lineHeight: 24 },
  subtitulo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  textoSubtitulo: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  conteudo: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: ESPACO.md,
    paddingTop: ESPACO.sm,
    paddingBottom: ESPACO.xxl,
    gap: ESPACO.md,
  },
  rodape: {
    paddingHorizontal: ESPACO.md,
    paddingTop: ESPACO.md - 4,
    paddingBottom: ESPACO.md,
    borderTopWidth: 1,
  },
  larguraRodape: { width: '100%', maxWidth: 560, alignSelf: 'center' },
});
