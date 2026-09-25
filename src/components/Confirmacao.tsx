/** Janela de confirmação exibida antes de ações que desativam ou removem dados. */

import { Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Botao } from '@/components/Botao';
import { ESPACO, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type ConfirmacaoProps = {
  /** Pergunta exibida; sem mensagem, a janela fica fechada. */
  mensagem?: string;
  confirmar: () => void;
  cancelar: () => void;
  carregando: boolean;
};

export function Confirmacao({ mensagem, confirmar, cancelar, carregando }: ConfirmacaoProps) {
  const { tema } = useTema();
  const { cores } = tema;

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
          style={[styles.dialogo, { backgroundColor: cores.superficie }, tema.sombra]}
        >
          <View style={[styles.icone, { backgroundColor: cores.alertaSuave }]}>
            <Ionicons name="alert-circle" size={26} color={cores.alerta} />
          </View>
          <Text style={[styles.titulo, { color: cores.texto }]}>Confirmar alteração</Text>
          <Text style={[styles.mensagem, { color: cores.textoSuave }]}>{mensagem}</Text>
          <View style={styles.botoes}>
            <Botao
              titulo="Confirmar"
              tituloCarregando="Salvando..."
              carregando={carregando}
              aoTocar={confirmar}
            />
            <Botao
              titulo="Cancelar"
              variante="secundario"
              desabilitado={carregando}
              aoTocar={cancelar}
            />
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
    alignItems: 'center',
    padding: ESPACO.lg,
    borderRadius: RAIO.xl,
  },
  icone: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { ...TIPOGRAFIA.subtitulo, marginTop: ESPACO.md, textAlign: 'center' },
  mensagem: { ...TIPOGRAFIA.corpoPequeno, marginTop: ESPACO.sm, textAlign: 'center' },
  botoes: { alignSelf: 'stretch', marginTop: ESPACO.lg, gap: ESPACO.md - 4 },
});
