import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { Etiqueta } from '@/components/Etiqueta';
import { ESPACO, FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type SanfonaProps = {
  pergunta: string;
  /** Texto corrido ou lista de passos (exibida numerada). */
  resposta: string | readonly string[];
  /** Controlado pelo pai. Sem `aberta`, o componente guarda o próprio estado. */
  aberta?: boolean;
  abertaInicial?: boolean;
  aoAlternar?: (aberta: boolean) => void;
  selo?: string | null;
  primeira?: boolean;
};

const DURACAO = 220;

export function Sanfona({
  pergunta,
  resposta,
  aberta: abertaControlada,
  abertaInicial = false,
  aoAlternar,
  selo,
  primeira = false,
}: SanfonaProps) {
  const { cores } = useTema().tema;
  const [abertaInterna, definirAbertaInterna] = useState(abertaInicial);
  const aberta = abertaControlada ?? abertaInterna;
  const [altura, definirAltura] = useState(0);
  const [progresso] = useState(() => new Animated.Value(aberta ? 1 : 0));
  const reduzirMovimento = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((ativo) => {
        reduzirMovimento.current = ativo;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const destino = aberta ? 1 : 0;
    if (reduzirMovimento.current) {
      progresso.setValue(destino);
      return;
    }
    const animacao = Animated.timing(progresso, {
      toValue: destino,
      duration: DURACAO,
      easing: Easing.out(Easing.cubic),
      // Altura não é suportada pelo driver nativo.
      useNativeDriver: false,
    });
    animacao.start();
    return () => animacao.stop();
  }, [aberta, progresso]);

  function alternar() {
    const proxima = !aberta;
    if (abertaControlada === undefined) definirAbertaInterna(proxima);
    aoAlternar?.(proxima);
  }

  const passos = typeof resposta === 'string' ? null : resposta;

  return (
    <View style={!primeira ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null}>
      <Pressable
        onPress={alternar}
        accessibilityRole="button"
        accessibilityLabel={selo ? `${pergunta}. Exclusivo do ${selo}` : pergunta}
        accessibilityHint={aberta ? 'Toque para fechar a resposta' : 'Toque para ver a resposta'}
        accessibilityState={{ expanded: aberta }}
        style={({ pressed }) => [styles.cabecalho, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={styles.textos}>
          <Text style={[styles.pergunta, { color: cores.texto }]}>{pergunta}</Text>
          {selo ? <Etiqueta texto={selo} tom="primaria" /> : null}
        </View>
        <Animated.View
          style={{
            transform: [
              { rotate: progresso.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
            ],
          }}
        >
          <Ionicons name="chevron-down" size={20} color={aberta ? cores.primaria : cores.textoSutil} />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[
          styles.recorte,
          { height: progresso.interpolate({ inputRange: [0, 1], outputRange: [0, altura] }) },
        ]}
        accessibilityElementsHidden={!aberta}
        importantForAccessibility={aberta ? 'auto' : 'no-hide-descendants'}
      >
        {/* Medido fora do fluxo para saber a altura final da animação. */}
        <View
          style={styles.medida}
          onLayout={(evento) => definirAltura(evento.nativeEvent.layout.height)}
        >
          {passos ? (
            passos.map((passo, indice) => (
              // A lista é fixa e pode repetir texto (dois botões com o mesmo nome), então a chave é a posição.
              <View key={indice} style={styles.passo}>
                <Text style={[styles.numero, { color: cores.primaria }]}>{indice + 1}.</Text>
                <Text style={[styles.resposta, styles.textoPasso, { color: cores.textoSuave }]}>{passo}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.resposta, { color: cores.textoSuave }]}>{resposta}</Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    paddingVertical: ESPACO.md - 4,
    paddingLeft: ESPACO.md,
    paddingRight: ESPACO.md - 4,
  },
  textos: { flex: 1, minWidth: 0, gap: ESPACO.xs + 2 },
  pergunta: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  recorte: { overflow: 'hidden' },
  medida: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: ESPACO.sm,
    paddingHorizontal: ESPACO.md,
    paddingBottom: ESPACO.md,
  },
  resposta: { ...TIPOGRAFIA.corpoPequeno },
  passo: { flexDirection: 'row', gap: ESPACO.sm },
  numero: { fontFamily: FONTES.titulo, fontSize: 14, lineHeight: 20, minWidth: 18 },
  textoPasso: { flex: 1 },
});
