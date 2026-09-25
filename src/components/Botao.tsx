/**
 * Botão das telas. O principal usa o degradê da marca; o secundário e o de
 * perigo são contornados. Enquanto carrega, bloqueia novos toques e avisa pelo
 * texto e pelo estado de acessibilidade.
 */

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ESPACO, MARCA, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type BotaoProps = {
  titulo: string;
  aoTocar: () => void;
  variante?: 'primario' | 'secundario' | 'perigo';
  icone?: keyof typeof Ionicons.glyphMap;
  carregando?: boolean;
  /** Texto mostrado enquanto a ação está em andamento. */
  tituloCarregando?: string;
  desabilitado?: boolean;
  /** Versão mais baixa, para ações dentro de cartões. */
  compacto?: boolean;
  /** Rótulo lido pelo leitor de tela quando o título sozinho não basta. */
  rotuloAcessivel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Espessura da borda dos botões contornados. */
const BORDA = 1.5;

export function Botao({
  titulo,
  aoTocar,
  variante = 'primario',
  icone,
  carregando = false,
  tituloCarregando,
  desabilitado = false,
  compacto = false,
  rotuloAcessivel,
  style,
}: BotaoProps) {
  const { tema } = useTema();
  const bloqueado = desabilitado || carregando;
  const primario = variante === 'primario';
  const perigo = variante === 'perigo';
  const corTexto = primario ? MARCA.branco : perigo ? tema.cores.erro : tema.cores.primaria;
  const altura = (compacto ? 44 : 56) - (primario ? 0 : 2 * BORDA);

  const conteudo = (
    <View style={[styles.conteudo, { height: altura }]}>
      {carregando ? (
        <ActivityIndicator color={corTexto} />
      ) : icone ? (
        <Ionicons name={icone} size={compacto ? 18 : 20} color={corTexto} />
      ) : null}
      <Text
        style={[styles.texto, compacto ? styles.textoCompacto : null, { color: corTexto }]}
        numberOfLines={1}
      >
        {carregando && tituloCarregando ? tituloCarregando : titulo}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={aoTocar}
      disabled={bloqueado}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel ?? titulo}
      accessibilityState={{ disabled: bloqueado, busy: carregando }}
      style={({ pressed }) => [
        styles.botao,
        { borderRadius: compacto ? RAIO.md : RAIO.lg, opacity: bloqueado ? 0.55 : pressed ? 0.85 : 1 },
        primario
          ? null
          : {
              borderWidth: BORDA,
              borderColor: perigo ? tema.cores.erro : tema.cores.borda,
              backgroundColor: tema.cores.superficie,
            },
        style,
      ]}
    >
      {primario ? (
        <LinearGradient colors={tema.gradiente} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {conteudo}
        </LinearGradient>
      ) : (
        conteudo
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: { overflow: 'hidden' },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACO.sm,
    paddingHorizontal: ESPACO.md,
  },
  texto: { ...TIPOGRAFIA.botao },
  textoCompacto: { fontSize: 14, lineHeight: 20 },
});
