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
  tituloCarregando?: string;
  desabilitado?: boolean;
  compacto?: boolean;
  pilula?: boolean;
  rotuloAcessivel?: string;
  style?: StyleProp<ViewStyle>;
};

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
  pilula = false,
  rotuloAcessivel,
  style,
}: BotaoProps) {
  const { tema } = useTema();
  const { cores } = tema;
  const bloqueado = desabilitado || carregando;
  const primario = variante === 'primario';
  const perigo = variante === 'perigo';

  if (pilula) {
    const altura = compacto ? 40 : 48;
    const aparencia = primario
      ? { fundo: cores.primaria, pressionado: cores.primariaPressionada, texto: cores.textoSobrePrimaria }
      : perigo
        ? { fundo: cores.erroSuave, pressionado: cores.erroSuave, texto: cores.erro }
        : { fundo: cores.primariaSuave, pressionado: cores.primariaSuave, texto: cores.primaria };

    return (
      <Pressable
        onPress={aoTocar}
        disabled={bloqueado}
        accessibilityRole="button"
        accessibilityLabel={rotuloAcessivel ?? titulo}
        accessibilityState={{ disabled: bloqueado, busy: carregando }}
        style={({ pressed }) => [
          styles.conteudo,
          {
            height: altura,
            borderRadius: altura / 2,
            backgroundColor: desabilitado && !carregando ? cores.desabilitado : pressed ? aparencia.pressionado : aparencia.fundo,
            opacity: pressed && !primario ? 0.8 : 1,
          },
          style,
        ]}
      >
        {carregando ? (
          <ActivityIndicator color={aparencia.texto} />
        ) : icone ? (
          <Ionicons
            name={icone}
            size={compacto ? 18 : 20}
            color={desabilitado ? cores.desabilitadoTexto : aparencia.texto}
          />
        ) : null}
        <Text
          style={[
            styles.textoPilula,
            compacto ? styles.textoCompacto : null,
            { color: desabilitado && !carregando ? cores.desabilitadoTexto : aparencia.texto },
          ]}
          numberOfLines={1}
        >
          {carregando && tituloCarregando ? tituloCarregando : titulo}
        </Text>
      </Pressable>
    );
  }

  const corTexto = primario ? MARCA.branco : perigo ? cores.erro : cores.primaria;
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
              borderColor: perigo ? cores.erro : cores.borda,
              backgroundColor: cores.superficie,
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
  textoPilula: { ...TIPOGRAFIA.botao, fontSize: 15, lineHeight: 22 },
  textoCompacto: { fontSize: 14, lineHeight: 20 },
});
