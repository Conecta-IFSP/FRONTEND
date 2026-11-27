import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Ionicons,
  type IoniconsIconName,
} from '@react-native-vector-icons/ionicons';

import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type FolhaInferiorProps = {
  visivel: boolean;
  titulo?: string;
  topo?: ReactNode;
  aoFechar: () => void;
  children: ReactNode;
  acompanharTeclado?: boolean;
};

export function FolhaInferior({
  visivel,
  titulo,
  topo,
  aoFechar,
  children,
  acompanharTeclado = false,
}: FolhaInferiorProps) {
  const { tema } = useTema();
  const { cores } = tema;
  const margens = useSafeAreaInsets();

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="slide"
      onRequestClose={aoFechar}
    >
      {/* KeyboardAvoidingView do react-native-keyboard-controller, e não o do React Native:
          com o Android em tela cheia (edge-to-edge), o do React Native não acompanhava o
          teclado dentro do Modal (a folha tremia ou ficava atrás do teclado). Esta biblioteca
          observa o teclado na própria janela do Modal, no Android e no iOS. */}
      <KeyboardAvoidingView
        style={styles.tela}
        enabled={acompanharTeclado}
        behavior="padding"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={aoFechar}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: cores.sobreposicao },
          ]}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.folha,
            {
              backgroundColor: cores.superficie,
              paddingBottom: margens.bottom + ESPACO.md,
            },
          ]}
        >
          <View style={styles.alca}>
            <View style={[styles.traco, { backgroundColor: cores.borda }]} />
          </View>
          {titulo ? (
            <Text
              style={[styles.titulo, { color: cores.texto }]}
              accessibilityRole="header"
            >
              {titulo}
            </Text>
          ) : null}
          {topo ? (
            <View
              style={[styles.topo, { borderBottomColor: cores.bordaSuave }]}
            >
              {topo}
            </View>
          ) : null}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type OpcaoFolhaProps = {
  icone: IoniconsIconName;
  rotulo: string;
  aoTocar: () => void;
  perigo?: boolean;
  desabilitado?: boolean;
};

export function OpcaoFolha({
  icone,
  rotulo,
  aoTocar,
  perigo = false,
  desabilitado = false,
}: OpcaoFolhaProps) {
  const { cores } = useTema().tema;

  return (
    <Pressable
      onPress={aoTocar}
      disabled={desabilitado}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.opcao,
        { opacity: desabilitado ? 0.5 : pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons
        name={icone}
        size={22}
        color={perigo ? cores.erro : cores.textoSuave}
      />
      <Text
        style={[
          styles.textoOpcao,
          { color: perigo ? cores.erro : cores.texto },
        ]}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, justifyContent: 'flex-end' },
  folha: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    alignSelf: 'center',
    borderTopLeftRadius: RAIO.xl - 4,
    borderTopRightRadius: RAIO.xl - 4,
    paddingTop: ESPACO.sm,
  },
  alca: { alignItems: 'center', paddingBottom: ESPACO.xs },
  traco: { width: 32, height: 4, borderRadius: 2 },
  titulo: {
    ...TIPOGRAFIA.subtitulo,
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: ESPACO.md,
    paddingVertical: ESPACO.sm,
  },
  topo: {
    paddingHorizontal: ESPACO.md,
    paddingTop: ESPACO.sm,
    paddingBottom: ESPACO.md - 4,
    borderBottomWidth: 1,
  },
  opcao: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    paddingHorizontal: ESPACO.md,
  },
  textoOpcao: { fontFamily: FONTES.corpo, fontSize: 15, lineHeight: 22 },
});
