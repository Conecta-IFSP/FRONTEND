import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Etiqueta } from '@/components/Etiqueta';
import { ESPACO, FONTES, RAIO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import type { Reuniao } from '@/services/api';
import { formatarHora, intervalo, seloDia, seloMes, situacaoDaReuniao } from '@/utils/reunioes';

type ItemReuniaoProps = {
  reuniao: Reuniao;
  usuarioId: string | undefined;
  agora: number;
  aoTocar: () => void;
  selo?: 'semana' | 'mes';
  divisor?: boolean;
};

export function ItemReuniao({
  reuniao,
  usuarioId,
  agora,
  aoTocar,
  selo = 'semana',
  divisor = false,
}: ItemReuniaoProps) {
  const { cores } = useTema().tema;
  const situacao = situacaoDaReuniao(reuniao, usuarioId, agora);
  const hoje = new Date(agora);
  const detalhe =
    selo === 'semana'
      ? `${formatarHora(reuniao.inicio)} · ${reuniao.comissao_id?.nome ?? 'Comissão'}`
      : intervalo(reuniao);
  const mostrarEtiqueta = situacao.texto !== 'Agendada' && situacao.texto !== 'Realizada';

  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={`${reuniao.titulo}, ${detalhe}${mostrarEtiqueta ? `, ${situacao.texto}` : ''}`}
      style={({ pressed }) => [
        styles.item,
        divisor ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View
        style={[
          styles.selo,
          { backgroundColor: situacao.encerrada ? cores.superficieSuave : cores.primariaSuave },
        ]}
      >
        <Text style={[styles.textoSelo, { color: situacao.encerrada ? cores.textoSutil : cores.primaria }]}>
          {selo === 'semana' ? seloDia(reuniao.inicio, hoje) : seloMes(reuniao.inicio)}
        </Text>
        <Text style={[styles.dia, { color: situacao.encerrada ? cores.textoSutil : cores.primaria }]}>
          {new Date(reuniao.inicio).getDate()}
        </Text>
      </View>
      <View style={styles.textos}>
        <Text
          numberOfLines={1}
          style={[
            styles.titulo,
            {
              color: situacao.encerrada ? cores.textoSutil : cores.texto,
              textDecorationLine: situacao.texto === 'Cancelada' ? 'line-through' : 'none',
            },
          ]}
        >
          {reuniao.titulo}
        </Text>
        <Text numberOfLines={1} style={[styles.detalhe, { color: cores.textoSuave }]}>
          {detalhe}
        </Text>
      </View>
      {mostrarEtiqueta ? (
        <View>
          <Etiqueta texto={situacao.texto} tom={situacao.tom} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    minHeight: 64,
    paddingVertical: ESPACO.sm + 4,
    paddingHorizontal: ESPACO.md - 2,
  },
  selo: {
    width: 44,
    height: 48,
    borderRadius: RAIO.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSelo: { fontFamily: FONTES.titulo, fontSize: 10, lineHeight: 12, letterSpacing: 0.5 },
  dia: { fontFamily: FONTES.titulo, fontSize: 17, lineHeight: 22 },
  textos: { flex: 1, minWidth: 0 },
  titulo: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  detalhe: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
});
