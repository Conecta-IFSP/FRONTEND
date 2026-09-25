/** Etiqueta curta de situação (ativa, pendente, aprovada...), colorida conforme o tom. */

import { StyleSheet, Text, View } from 'react-native';

import { ESPACO, FONTES, RAIO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

export type TomEtiqueta = 'neutro' | 'primaria' | 'sucesso' | 'alerta' | 'erro';

export function Etiqueta({ texto, tom = 'neutro' }: { texto: string; tom?: TomEtiqueta }) {
  const { cores } = useTema().tema;
  const { fundo, cor } = {
    neutro: { fundo: cores.superficieSuave, cor: cores.textoSuave },
    primaria: { fundo: cores.primariaSuave, cor: cores.primaria },
    sucesso: { fundo: cores.sucessoSuave, cor: cores.sucesso },
    alerta: { fundo: cores.alertaSuave, cor: cores.alerta },
    erro: { fundo: cores.erroSuave, cor: cores.erro },
  }[tom];

  return (
    <View style={[styles.etiqueta, { backgroundColor: fundo }]}>
      <Text style={[styles.texto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    alignSelf: 'flex-start',
    borderRadius: RAIO.circulo,
    paddingHorizontal: ESPACO.md - 4,
    paddingVertical: ESPACO.xs,
  },
  texto: { fontFamily: FONTES.corpoMedio, fontSize: 12, lineHeight: 16 },
});
