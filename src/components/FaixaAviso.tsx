/** Faixa de aviso: erros, alertas, confirmações e informações para o usuário. */

import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

export type TomAviso = 'erro' | 'alerta' | 'sucesso' | 'informacao';

export type Aviso = {
  tom: TomAviso;
  titulo?: string;
  mensagem: string;
};

const ICONES = {
  erro: 'close-circle',
  alerta: 'time',
  sucesso: 'checkmark-circle',
  informacao: 'information-circle',
} as const;

export function FaixaAviso({ aviso }: { aviso: Aviso }) {
  const { cores } = useTema().tema;
  const aparencia = {
    erro: { cor: cores.erro, fundo: cores.erroSuave },
    alerta: { cor: cores.alerta, fundo: cores.alertaSuave },
    sucesso: { cor: cores.sucesso, fundo: cores.sucessoSuave },
    informacao: { cor: cores.primaria, fundo: cores.primariaSuave },
  }[aviso.tom];

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={aviso.titulo ? `${aviso.titulo}. ${aviso.mensagem}` : aviso.mensagem}
      style={[styles.faixa, { backgroundColor: aparencia.fundo, borderColor: `${aparencia.cor}40` }]}
    >
      <Ionicons name={ICONES[aviso.tom]} size={20} color={aparencia.cor} />
      <View style={styles.textos}>
        {aviso.titulo ? (
          <Text style={[styles.titulo, { color: aparencia.cor }]}>{aviso.titulo}</Text>
        ) : null}
        <Text style={[styles.mensagem, { color: cores.textoSuave }]}>{aviso.mensagem}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    gap: ESPACO.md - 4,
    padding: ESPACO.md,
    borderRadius: RAIO.lg,
    borderWidth: 1,
  },
  textos: { flex: 1, gap: 2 },
  titulo: { fontFamily: FONTES.titulo, fontSize: 14, lineHeight: 20 },
  mensagem: { ...TIPOGRAFIA.corpoPequeno },
});
