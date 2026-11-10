import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { Botao } from '@/components/Botao';
import { CampoSelecao } from '@/components/CampoTexto';
import { FolhaInferior } from '@/components/FolhaInferior';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { minutosDaHora } from '@/utils/validacao';

type SeletorHoraProps = {
  rotulo: string;
  /** Hora escolhida, no formato HH:MM, ou vazio enquanto não houver escolha. */
  valor: string;
  aoEscolher: (hora: string) => void;
  /** Hora em que o seletor abre quando o campo ainda está vazio. */
  horaPadrao: () => string;
  erro?: string | null;
  desabilitado?: boolean;
};

function comoData(hora: string) {
  const minutos = minutosDaHora(hora) ?? 0;
  const data = new Date();
  data.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
  return data;
}

function comoTexto(data: Date) {
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

function Erro({ erro }: { erro: string }) {
  const { cores } = useTema().tema;
  return (
    <View style={styles.erro}>
      <Ionicons name="alert-circle" size={14} color={cores.erro} />
      <Text style={[styles.textoErro, { color: cores.erro }]}>{erro}</Text>
    </View>
  );
}

export function SeletorHora({
  rotulo,
  valor,
  aoEscolher,
  horaPadrao,
  erro = null,
  desabilitado = false,
}: SeletorHoraProps) {
  const { cores } = useTema().tema;
  // No iOS a roda fica numa folha, com botão de confirmar; no Android o sistema abre o relógio.
  const [rascunho, definirRascunho] = useState<Date | null>(null);

  function abrir() {
    const inicial = comoData(valor || horaPadrao());
    if (Platform.OS !== 'android') {
      definirRascunho(inicial);
      return;
    }
    DateTimePickerAndroid.open({
      value: inicial,
      mode: 'time',
      is24Hour: true,
      onChange: (evento: DateTimePickerEvent, escolhida?: Date) => {
        if (evento.type === 'set' && escolhida) aoEscolher(comoTexto(escolhida));
      },
    });
  }

  // O navegador já tem um campo de hora próprio; a biblioteca nativa não funciona na web.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={[styles.rotulo, { color: cores.texto }]}>{rotulo}</Text>
        <input
          type="time"
          value={valor}
          disabled={desabilitado}
          aria-label={rotulo}
          onChange={(evento) => aoEscolher(evento.target.value)}
          style={{
            width: '100%',
            height: 48,
            boxSizing: 'border-box',
            padding: `0 ${ESPACO.md - 2}px`,
            borderRadius: RAIO.md,
            border: `1px solid ${erro ? cores.erro : cores.campoBorda}`,
            backgroundColor: cores.campoFundo,
            color: cores.texto,
            fontFamily: FONTES.corpo,
            fontSize: 15,
            opacity: desabilitado ? 0.55 : 1,
          }}
        />
        {erro ? <Erro erro={erro} /> : null}
      </View>
    );
  }

  return (
    <>
      <CampoSelecao
        rotulo={rotulo}
        valor={valor}
        placeholder="Escolher"
        icone="time-outline"
        erro={erro}
        desabilitado={desabilitado}
        aoTocar={abrir}
        compacto
      />
      <FolhaInferior visivel={rascunho !== null} titulo={rotulo} aoFechar={() => definirRascunho(null)}>
        <View style={styles.folha}>
          {rascunho ? (
            <DateTimePicker
              value={rascunho}
              mode="time"
              display="spinner"
              onChange={(_evento, escolhida) => {
                if (escolhida) definirRascunho(escolhida);
              }}
            />
          ) : null}
          <Botao
            titulo="Confirmar"
            pilula
            aoTocar={() => {
              if (rascunho) aoEscolher(comoTexto(rascunho));
              definirRascunho(null);
            }}
          />
        </View>
      </FolhaInferior>
    </>
  );
}

type CampoHoraControladoProps<T extends FieldValues> = Omit<
  SeletorHoraProps,
  'valor' | 'aoEscolher' | 'erro'
> & {
  controle: Control<T>;
  nome: FieldPath<T>;
  validar?: (valor: string, valores: T) => string | null;
  /** Chamado depois da escolha, para revalidar o outro campo do par. */
  aposEscolher?: () => void;
};

export function CampoHoraControlado<T extends FieldValues>({
  controle,
  nome,
  validar,
  aposEscolher,
  ...props
}: CampoHoraControladoProps<T>) {
  const {
    field: { value, onChange },
    fieldState: { error },
  } = useController({
    control: controle,
    name: nome,
    rules: validar
      ? { validate: (valor, valores) => validar(String(valor ?? ''), valores) ?? true }
      : undefined,
  });

  return (
    <SeletorHora
      {...props}
      valor={String(value ?? '')}
      erro={error?.message ?? null}
      aoEscolher={(hora) => {
        onChange(hora);
        aposEscolher?.();
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  rotulo: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  erro: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: ESPACO.xs },
  textoErro: { fontFamily: FONTES.corpo, fontSize: 12, lineHeight: 16 },
  folha: { paddingHorizontal: ESPACO.md, gap: ESPACO.sm },
});
