import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { FONTES, type Cores } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primeira}${ultima}`.toUpperCase();
}

export function coresDoNome(nome: string, cores: Cores) {
  const paleta = [
    { fundo: cores.primariaSuave, texto: cores.primaria },
    { fundo: cores.secundariaSuave, texto: cores.secundaria },
    { fundo: cores.sucessoSuave, texto: cores.sucesso },
  ];
  const soma = [...nome].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  return paleta[soma % paleta.length];
}

type AvatarProps = {
  nome: string;
  tamanho?: number;
  colorido?: boolean;
  apagado?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ nome, tamanho = 40, colorido = false, apagado = false, style }: AvatarProps) {
  const { cores } = useTema().tema;
  const tinta = apagado
    ? { fundo: cores.superficieSuave, texto: cores.textoSutil }
    : colorido
      ? coresDoNome(nome, cores)
      : { fundo: cores.primariaSuave, texto: cores.primaria };

  return (
    <View
      style={[
        styles.circulo,
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: tinta.fundo },
        style,
      ]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Text
        style={[
          styles.texto,
          { color: tinta.texto, fontSize: Math.round(tamanho * 0.35), lineHeight: Math.round(tamanho * 0.5) },
        ]}
      >
        {iniciais(nome)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: { alignItems: 'center', justifyContent: 'center' },
  texto: { fontFamily: FONTES.titulo },
});
