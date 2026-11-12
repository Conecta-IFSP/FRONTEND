import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type ConfirmacaoProps = {
  /** Opcional: título acima da mensagem. Sem ele, o diálogo fica como antes. */
  titulo?: string;
  mensagem?: string;
  confirmar: () => void;
  cancelar: () => void;
  carregando: boolean;
  rotuloConfirmar?: string;
  perigo?: boolean;
};

export function Confirmacao({
  titulo,
  mensagem,
  confirmar,
  cancelar,
  carregando,
  rotuloConfirmar = 'Confirmar',
  perigo = false,
}: ConfirmacaoProps) {
  const { tema } = useTema();
  const { cores } = tema;
  const corAcao = perigo ? cores.erro : cores.primaria;
  const fundoAcao = perigo ? cores.erroSuave : cores.primariaSuave;

  return (
    <Modal
      visible={Boolean(mensagem)}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!carregando) cancelar();
      }}
    >
      <View style={[styles.sobreposicao, { backgroundColor: cores.sobreposicao }]}>
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[styles.dialogo, { backgroundColor: cores.superficie }, tema.sombra]}
        >
          {titulo ? (
            <Text style={[styles.titulo, { color: cores.texto }]} accessibilityRole="header">
              {titulo}
            </Text>
          ) : null}
          <Text style={[styles.mensagem, { color: titulo ? cores.textoSuave : cores.texto }]}>{mensagem}</Text>
          <View style={styles.botoes}>
            <Pressable
              onPress={cancelar}
              disabled={carregando}
              accessibilityRole="button"
              style={({ pressed }) => [styles.botao, { opacity: pressed || carregando ? 0.6 : 1 }]}
            >
              <Text style={[styles.textoBotao, { color: cores.primaria }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={confirmar}
              disabled={carregando}
              accessibilityRole="button"
              accessibilityState={{ busy: carregando }}
              style={({ pressed }) => [
                styles.botao,
                { backgroundColor: fundoAcao, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              {carregando ? <ActivityIndicator size="small" color={corAcao} /> : null}
              <Text style={[styles.textoBotao, { color: corAcao }]}>{rotuloConfirmar}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sobreposicao: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: ESPACO.lg },
  dialogo: {
    width: '100%',
    maxWidth: 420,
    paddingTop: ESPACO.lg,
    paddingHorizontal: ESPACO.md + 4,
    paddingBottom: ESPACO.md,
    borderRadius: RAIO.xl - 4,
  },
  titulo: { ...TIPOGRAFIA.subtitulo, marginBottom: ESPACO.sm },
  mensagem: { ...TIPOGRAFIA.corpo, marginBottom: ESPACO.md + 4 },
  botoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: ESPACO.sm },
  botao: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: ESPACO.md,
    borderRadius: 20,
  },
  textoBotao: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
});
