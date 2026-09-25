/**
 * Logotipo do Conecta+. No tema escuro o nome é escrito em texto claro, porque
 * a palavra da imagem oficial é escura e sumiria no fundo.
 */

import { Image, StyleSheet, Text, View } from 'react-native';

import { ESPACO, FONTES, LOGOS } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

/** Altura dividida pela largura de cada imagem. */
const PROPORCAO = { completo: 325 / 375, simbolo: 252 / 236 } as const;

type LogoProps = {
  /** `completo` mostra símbolo e nome; `simbolo` mostra só o ícone. */
  variante?: 'completo' | 'simbolo';
  largura?: number;
};

export function Logo({ variante = 'completo', largura = 180 }: LogoProps) {
  const { tema } = useTema();
  const nomeEmTexto = variante === 'completo' && tema.escuro;
  const larguraSimbolo = largura * 0.6;

  return (
    <View style={styles.container} accessible accessibilityRole="image" accessibilityLabel="Conecta+">
      {nomeEmTexto ? (
        <>
          <Image
            source={LOGOS.simbolo}
            style={{ width: larguraSimbolo, height: larguraSimbolo * PROPORCAO.simbolo }}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.nome,
              { fontSize: largura * 0.21, lineHeight: largura * 0.26, color: tema.cores.texto },
            ]}
          >
            Conecta<Text style={{ color: tema.cores.primaria }}>+</Text>
          </Text>
        </>
      ) : (
        <Image
          source={variante === 'completo' ? LOGOS.completo : LOGOS.simbolo}
          style={{ width: largura, height: largura * PROPORCAO[variante] }}
          resizeMode="contain"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  nome: { fontFamily: FONTES.titulo, marginTop: ESPACO.xs },
});
