import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PanResponderGestureState,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { ESPACO, FONTES } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { chaveDia, LETRAS_SEMANA, maiuscula, MESES, somarDias } from '@/utils/reunioes';

type Dia = { dia: Date; doMes: boolean };

const ALTURA_LINHA = 50;
const ALTURA_NAVEGACAO = 44;

function inicioDoMes(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function semanasDoMes(mes: Date) {
  const ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const total = Math.ceil((mes.getDay() + ultimo) / 7) * 7;
  const semanas: Dia[][] = [];
  for (let i = 0; i < total; i++) {
    const dia = somarDias(mes, i - mes.getDay());
    if (i % 7 === 0) semanas.push([]);
    semanas[semanas.length - 1].push({ dia, doMes: dia.getMonth() === mes.getMonth() });
  }
  return semanas;
}

type LinhaSemanaProps = {
  semana: Dia[];
  selecionado: Date;
  hoje: Date;
  aoEscolher: (dia: Date) => void;
  marcas?: Record<string, string[]>;
  minimo?: Date;
  esmaecerForaDoMes: boolean;
};

function LinhaSemana({ semana, selecionado, hoje, aoEscolher, marcas, minimo, esmaecerForaDoMes }: LinhaSemanaProps) {
  const { cores } = useTema().tema;
  const chaveSelecionado = chaveDia(selecionado);
  const chaveHoje = chaveDia(hoje);
  const chaveMinimo = minimo ? chaveDia(minimo) : null;

  return (
    <View style={styles.linha}>
      {semana.map(({ dia, doMes }) => {
        const chave = chaveDia(dia);
        const eSelecionado = chave === chaveSelecionado;
        const eHoje = chave === chaveHoje;
        const bloqueado = chaveMinimo !== null && chave < chaveMinimo;
        const pontos = marcas?.[chave] ?? [];
        const cor = eSelecionado
          ? cores.textoSobrePrimaria
          : bloqueado || (esmaecerForaDoMes && !doMes)
            ? cores.desabilitadoTexto
            : eHoje
              ? cores.primaria
              : cores.texto;

        return (
          <Pressable
            key={chave}
            onPress={() => aoEscolher(dia)}
            disabled={bloqueado}
            accessibilityRole="button"
            accessibilityState={{ selected: eSelecionado, disabled: bloqueado }}
            accessibilityLabel={`${dia.getDate()} de ${MESES[dia.getMonth()]}${
              pontos.length === 1 ? ', 1 reunião' : pontos.length > 1 ? `, ${pontos.length} reuniões` : ''
            }`}
            style={styles.celula}
          >
            <View
              style={[
                styles.numero,
                {
                  backgroundColor: eSelecionado ? cores.primaria : 'transparent',
                  borderColor: eHoje && !eSelecionado ? cores.primaria : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.textoNumero,
                  { color: cor, fontFamily: eSelecionado || eHoje ? FONTES.titulo : FONTES.corpo },
                ]}
              >
                {dia.getDate()}
              </Text>
            </View>
            <View style={styles.pontos}>
              {pontos.slice(0, 3).map((corPonto, indice) => (
                <View key={indice} style={[styles.ponto, { backgroundColor: corPonto }]} />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function LetrasSemana({ hoje }: { hoje: Date }) {
  const { cores } = useTema().tema;
  return (
    <View style={styles.linha}>
      {LETRAS_SEMANA.map((letra, indice) => (
        <Text
          key={indice}
          style={[styles.letra, { color: indice === hoje.getDay() ? cores.primaria : cores.textoSutil }]}
        >
          {letra}
        </Text>
      ))}
    </View>
  );
}

function NavegacaoMes({ mes, aoMudar }: { mes: Date; aoMudar: (mes: Date) => void }) {
  const { cores } = useTema().tema;
  return (
    <View style={styles.navegacao}>
      <Text style={[styles.mes, { color: cores.textoSuave }]}>
        {maiuscula(MESES[mes.getMonth()])} de {mes.getFullYear()}
      </Text>
      <Pressable
        onPress={() => aoMudar(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
        accessibilityRole="button"
        accessibilityLabel="Mês anterior"
        style={styles.seta}
      >
        <Ionicons name="chevron-back" size={20} color={cores.texto} />
      </Pressable>
      <Pressable
        onPress={() => aoMudar(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
        accessibilityRole="button"
        accessibilityLabel="Próximo mês"
        style={styles.seta}
      >
        <Ionicons name="chevron-forward" size={20} color={cores.texto} />
      </Pressable>
    </View>
  );
}

type CalendarioProps = {
  selecionado: Date;
  hoje: Date;
  aoEscolher: (dia: Date) => void;
  marcas?: Record<string, string[]>;
  minimo?: Date;
};

export function Calendario({ selecionado, hoje, aoEscolher, marcas, minimo }: CalendarioProps) {
  const [mes, definirMes] = useState(() => inicioDoMes(selecionado));

  return (
    <View>
      <NavegacaoMes mes={mes} aoMudar={definirMes} />
      <LetrasSemana hoje={hoje} />
      {semanasDoMes(mes).map((semana) => (
        <LinhaSemana
          key={chaveDia(semana[0].dia)}
          semana={semana}
          selecionado={selecionado}
          hoje={hoje}
          aoEscolher={aoEscolher}
          marcas={marcas}
          minimo={minimo}
          esmaecerForaDoMes
        />
      ))}
    </View>
  );
}

type CalendarioRetratilProps = {
  selecionado: Date;
  hoje: Date;
  mes: Date;
  expandido: boolean;
  aoEscolher: (dia: Date) => void;
  aoMudarMes: (mes: Date) => void;
  aoMudarExpandido: (expandido: boolean) => void;
  marcas?: Record<string, string[]>;
};

export function CalendarioRetratil({
  selecionado,
  hoje,
  mes,
  expandido,
  aoEscolher,
  aoMudarMes,
  aoMudarExpandido,
  marcas,
}: CalendarioRetratilProps) {
  const { cores } = useTema().tema;
  const [progresso] = useState(() => new Animated.Value(expandido ? 1 : 0));
  const mesExibido = expandido ? mes : inicioDoMes(selecionado);
  const semanas = semanasDoMes(mesExibido);
  const chaveSelecionado = chaveDia(selecionado);
  const linha = Math.max(
    0,
    semanas.findIndex((semana) => semana.some(({ dia }) => chaveDia(dia) === chaveSelecionado)),
  );
  const percurso = (semanas.length - 1) * ALTURA_LINHA + ALTURA_NAVEGACAO;

  useEffect(() => {
    Animated.spring(progresso, {
      toValue: expandido ? 1 : 0,
      useNativeDriver: false,
      bounciness: 0,
      speed: 18,
    }).start();
  }, [expandido, progresso]);

  const arrasto = useMemo(() => {
    function soltar(gesto: PanResponderGestureState) {
      progresso.setValue(gesto.dy / percurso);
      progresso.flattenOffset();
      progresso.stopAnimation((valor) => {
        const atual = Math.min(1, Math.max(0, valor));
        progresso.setValue(atual);
        const abrir = gesto.vy > 0.3 ? true : gesto.vy < -0.3 ? false : atual > 0.5;
        if (abrir === expandido) {
          Animated.spring(progresso, {
            toValue: abrir ? 1 : 0,
            useNativeDriver: false,
            bounciness: 0,
            speed: 18,
          }).start();
        } else {
          aoMudarExpandido(abrir);
        }
      });
    }

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesto) =>
        Math.abs(gesto.dy) > 8 && Math.abs(gesto.dy) > Math.abs(gesto.dx),
      onPanResponderGrant: () => {
        progresso.stopAnimation();
        progresso.extractOffset();
      },
      onPanResponderMove: (_, gesto) => progresso.setValue(gesto.dy / percurso),
      onPanResponderRelease: (_, gesto) => soltar(gesto),
      onPanResponderTerminate: (_, gesto) => soltar(gesto),
      onPanResponderTerminationRequest: () => false,
    });
  }, [aoMudarExpandido, expandido, percurso, progresso]);

  return (
    <View {...arrasto.panHandlers}>
      <Animated.View
        style={[
          styles.recorte,
          {
            height: progresso.interpolate({
              inputRange: [0, 1],
              outputRange: [0, ALTURA_NAVEGACAO],
              extrapolate: 'clamp',
            }),
            opacity: progresso.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
          },
        ]}
      >
        <NavegacaoMes mes={mesExibido} aoMudar={aoMudarMes} />
      </Animated.View>
      <LetrasSemana hoje={hoje} />
      <Animated.View
        style={[
          styles.recorte,
          {
            height: progresso.interpolate({
              inputRange: [0, 1],
              outputRange: [ALTURA_LINHA, semanas.length * ALTURA_LINHA],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [
              {
                translateY: progresso.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-linha * ALTURA_LINHA, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
          }}
        >
          {semanas.map((semana) => (
            <LinhaSemana
              key={chaveDia(semana[0].dia)}
              semana={semana}
              selecionado={selecionado}
              hoje={hoje}
              aoEscolher={aoEscolher}
              marcas={marcas}
              esmaecerForaDoMes={expandido}
            />
          ))}
        </Animated.View>
      </Animated.View>
      <Pressable
        onPress={() => aoMudarExpandido(!expandido)}
        accessibilityRole="adjustable"
        accessibilityLabel={expandido ? 'Recolher calendário' : 'Expandir calendário'}
        accessibilityState={{ expanded: expandido }}
        hitSlop={8}
        style={styles.alca}
      >
        <View style={[styles.traco, { backgroundColor: cores.borda }]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  navegacao: {
    height: ALTURA_NAVEGACAO,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: ESPACO.sm,
  },
  mes: { flex: 1, fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
  seta: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  recorte: { overflow: 'hidden' },
  linha: { flexDirection: 'row' },
  letra: {
    flex: 1,
    height: 24,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: FONTES.corpoMedio,
    fontSize: 12,
    lineHeight: 24,
  },
  celula: { flex: 1, height: ALTURA_LINHA, alignItems: 'center', justifyContent: 'center', gap: 3 },
  numero: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNumero: { fontSize: 15, lineHeight: 20 },
  pontos: { height: 5, flexDirection: 'row', gap: 3 },
  ponto: { width: 5, height: 5, borderRadius: 3 },
  alca: { height: 24, alignItems: 'center', justifyContent: 'center' },
  traco: { width: 36, height: 5, borderRadius: 3 },
});
