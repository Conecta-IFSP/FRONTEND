import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';

import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

/** Título da seção acima de um cartão com linhas separadas por divisória. */
export function SecaoLista({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { cores } = useTema().tema;
  const linhas = Children.toArray(children);

  return (
    <View>
      <Text style={[styles.tituloSecao, { color: cores.texto }]} accessibilityRole="header">
        {titulo}
      </Text>
      <View style={[styles.cartao, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
        {linhas.map((linha, indice) => (
          <View
            key={indice}
            style={indice > 0 ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null}
          >
            {linha}
          </View>
        ))}
      </View>
    </View>
  );
}

type ConteudoLinhaProps = {
  icone: IoniconsIconName;
  titulo: string;
  subtitulo?: string;
  /** Substitui o chevron (ex.: um controle à direita). */
  direita?: ReactNode;
};

function ConteudoLinha({ icone, titulo, subtitulo, direita }: ConteudoLinhaProps) {
  const { cores } = useTema().tema;
  return (
    <>
      <View style={[styles.icone, { backgroundColor: cores.primariaSuave }]}>
        <Ionicons name={icone} size={18} color={cores.primaria} />
      </View>
      <View style={styles.textos}>
        <Text style={[styles.titulo, { color: cores.texto }]} numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={[styles.subtitulo, { color: cores.textoSuave }]} numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
      {direita}
    </>
  );
}

type LinhaListaProps = ConteudoLinhaProps & {
  aoTocar: () => void;
  desabilitado?: boolean;
  dica?: string;
};

/** Linha tocável: ícone, título, subtítulo opcional e chevron. */
export function LinhaLista({ aoTocar, desabilitado = false, dica, ...conteudo }: LinhaListaProps) {
  const { cores } = useTema().tema;
  return (
    <Pressable
      onPress={aoTocar}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityLabel={conteudo.subtitulo ? `${conteudo.titulo}, ${conteudo.subtitulo}` : conteudo.titulo}
      accessibilityHint={dica}
      accessibilityState={{ disabled: desabilitado }}
      style={({ pressed }) => [styles.linha, { opacity: pressed ? 0.7 : 1 }]}
    >
      <ConteudoLinha
        {...conteudo}
        direita={conteudo.direita ?? <Ionicons name="chevron-forward" size={18} color={cores.textoSutil} />}
      />
    </Pressable>
  );
}

/** Linha não tocável, com um controle à direita (ex.: seletor de tema). */
export function LinhaListaFixa(props: ConteudoLinhaProps) {
  return (
    <View style={styles.linha}>
      <ConteudoLinha {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  tituloSecao: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  cartao: { borderWidth: 1, borderRadius: RAIO.lg, overflow: 'hidden' },
  linha: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    paddingVertical: ESPACO.sm + 2,
    paddingLeft: ESPACO.md - 2,
    paddingRight: ESPACO.sm + 2,
  },
  icone: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0 },
  titulo: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  subtitulo: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
});
