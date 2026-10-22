import { forwardRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type CampoTextoProps = TextInputProps & {
  rotulo: string;
  icone?: IoniconsIconName;
  erro?: string | null;
  acaoFinal?: {
    icone: IoniconsIconName;
    rotuloAcessivel: string;
    aoTocar: () => void;
  };
  dica?: string;
  compacto?: boolean;
};

const ALTURA = 56;
const ALTURA_COMPACTA = 48;
const ALTURA_MULTILINHA = 120;

export const CampoTexto = forwardRef<TextInput, CampoTextoProps>(function CampoTexto(
  {
    rotulo,
    icone,
    erro = null,
    acaoFinal,
    dica,
    compacto = false,
    multiline = false,
    placeholder,
    value,
    onFocus,
    onBlur,
    style,
    ...props
  },
  ref,
) {
  const { cores } = useTema().tema;
  const [focado, definirFocado] = useState(false);
  const invalido = Boolean(erro);
  const destaque = invalido ? cores.erro : focado ? cores.campoBordaFoco : null;
  const exemploProprio = !multiline && value !== undefined && Boolean(placeholder);

  return (
    <View style={styles.container}>
      <Text style={[styles.rotulo, { color: compacto ? cores.texto : cores.textoSuave }]}>{rotulo}</Text>

      <View
        style={[
          styles.caixa,
          multiline ? styles.caixaMultilinha : styles.caixaLinha,
          compacto ? (multiline ? styles.caixaCompactaMultilinha : styles.caixaCompacta) : null,
          { backgroundColor: cores.campoFundo, borderColor: destaque ?? cores.campoBorda },
        ]}
      >
        {icone ? (
          <Ionicons
            name={icone}
            size={20}
            color={destaque ?? cores.textoSutil}
            style={multiline ? styles.iconeMultilinha : null}
          />
        ) : null}

        <View
          style={[
            styles.areaEntrada,
            multiline ? null : styles.areaEntradaLinha,
            icone ? styles.entradaComIcone : null,
          ]}
        >
          <TextInput
            ref={ref}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            value={value}
            placeholder={exemploProprio ? undefined : placeholder}
            placeholderTextColor={cores.placeholder}
            accessibilityLabel={rotulo}
            accessibilityHint={erro ?? placeholder}
            onFocus={(evento) => {
              definirFocado(true);
              onFocus?.(evento);
            }}
            onBlur={(evento) => {
              definirFocado(false);
              onBlur?.(evento);
            }}
            style={[
              styles.entrada,
              multiline ? styles.entradaMultilinha : styles.entradaLinha,
              { color: cores.texto },
              style,
            ]}
            {...props}
          />

          {exemploProprio && !value ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.exemplo}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.textoExemplo, { color: cores.placeholder }]}
              >
                {placeholder}
              </Text>
            </View>
          ) : null}
        </View>

        {acaoFinal ? (
          <Pressable
            onPress={acaoFinal.aoTocar}
            accessibilityRole="button"
            accessibilityLabel={acaoFinal.rotuloAcessivel}
            hitSlop={10}
            style={styles.acaoFinal}
          >
            <Ionicons name={acaoFinal.icone} size={20} color={cores.textoSutil} />
          </Pressable>
        ) : null}
      </View>

      {invalido || dica ? (
        <View style={styles.rodape}>
          <View style={styles.erro}>
            {invalido ? (
              <>
                <Ionicons name="alert-circle" size={14} color={cores.erro} />
                <Text style={[styles.textoErro, { color: cores.erro }]}>{erro}</Text>
              </>
            ) : null}
          </View>
          {dica ? <Text style={[styles.dica, { color: cores.textoSutil }]}>{dica}</Text> : null}
        </View>
      ) : null}
    </View>
  );
});

type CampoTextoControladoProps<T extends FieldValues> = Omit<
  CampoTextoProps,
  'value' | 'onChangeText' | 'erro'
> & {
  controle: Control<T>;
  nome: FieldPath<T>;
  validar?: (valor: string, valores: T) => string | null;
  formatar?: (valor: string) => string;
};

export function CampoTextoControlado<T extends FieldValues>({
  controle,
  nome,
  validar,
  formatar,
  onBlur,
  ...props
}: CampoTextoControladoProps<T>) {
  const {
    field: { ref, value, onChange, onBlur: marcarTocado },
    fieldState: { error },
  } = useController({
    control: controle,
    name: nome,
    rules: validar
      ? { validate: (valor, valores) => validar(String(valor ?? ''), valores) ?? true }
      : undefined,
  });

  return (
    <CampoTexto
      {...props}
      ref={ref}
      value={String(value ?? '')}
      onChangeText={formatar ? (texto) => onChange(formatar(texto)) : onChange}
      onBlur={(evento) => {
        marcarTocado();
        onBlur?.(evento);
      }}
      erro={error?.message ?? null}
    />
  );
}

type CampoSelecaoProps = {
  rotulo: string;
  valor: string;
  aoTocar: () => void;
  icone?: IoniconsIconName;
  detalhe?: string;
  desabilitado?: boolean;
  compacto?: boolean;
};

export function CampoSelecao({
  rotulo,
  valor,
  aoTocar,
  icone,
  detalhe,
  desabilitado = false,
  compacto = false,
}: CampoSelecaoProps) {
  const { cores } = useTema().tema;

  return (
    <View style={styles.container}>
      <Text style={[styles.rotulo, { color: compacto ? cores.texto : cores.textoSuave }]}>{rotulo}</Text>
      <Pressable
        onPress={aoTocar}
        disabled={desabilitado}
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${valor}${detalhe ? `, ${detalhe}` : ''}`}
        style={({ pressed }) => [
          styles.caixa,
          detalhe ? styles.caixaSelecaoDupla : styles.caixaLinha,
          compacto ? (detalhe ? styles.caixaCompactaMultilinha : styles.caixaCompacta) : null,
          {
            backgroundColor: cores.campoFundo,
            borderColor: cores.campoBorda,
            opacity: desabilitado ? 0.55 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {icone ? <Ionicons name={icone} size={20} color={cores.textoSutil} /> : null}
        <View style={[styles.areaEntrada, icone ? styles.entradaComIcone : null]}>
          <Text numberOfLines={1} style={[styles.textoSelecao, { color: cores.texto }]}>
            {valor}
          </Text>
          {detalhe ? (
            <Text numberOfLines={1} style={[styles.dica, { color: cores.textoSuave }]}>
              {detalhe}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-down" size={18} color={cores.textoSutil} />
      </Pressable>
    </View>
  );
}

type CampoCodigoProps = {
  valor: string;
  aoMudar: (valor: string) => void;
  aoEnviar?: () => void;
  desabilitado?: boolean;
  focoAutomatico?: boolean;
};

export function CampoCodigo({ valor, aoMudar, aoEnviar, desabilitado = false, focoAutomatico = true }: CampoCodigoProps) {
  const { cores } = useTema().tema;
  const [entrada, definirEntrada] = useState<TextInput | null>(null);
  const caracteres = valor.split('');

  return (
    <View>
      <Pressable style={styles.codigoLinha} onPress={() => entrada?.focus()} accessibilityLabel="Código">
        {Array.from({ length: 7 }, (_, indice) => (
          <View key={indice} style={styles.codigoGrupo}>
            <View
              style={[
                styles.codigoCaixa,
                {
                  backgroundColor: cores.campoFundo,
                  borderColor: indice === caracteres.length ? cores.campoBordaFoco : cores.campoBorda,
                },
              ]}
            >
              <Text style={[styles.codigoCaractere, { color: cores.texto }]}>{caracteres[indice] ?? ''}</Text>
            </View>
            {indice === 2 ? <Text style={[styles.codigoSeparador, { color: cores.textoSuave }]}>-</Text> : null}
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={definirEntrada}
        value={valor}
        onChangeText={(texto) => aoMudar(texto.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 7))}
        maxLength={8}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="one-time-code"
        autoFocus={focoAutomatico}
        onSubmitEditing={aoEnviar}
        editable={!desabilitado}
        style={styles.codigoOculto}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  codigoLinha: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: ESPACO.sm },
  codigoGrupo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codigoCaixa: { width: 40, height: 52, borderWidth: 1.5, borderRadius: RAIO.md, alignItems: 'center', justifyContent: 'center' },
  // A fonte do código precisa ter um glifo `I` claramente visível em todos os
  // dispositivos. Poppins pode renderizar esse caractere como um traço quase
  // imperceptível dentro da caixa, principalmente no Android.
  codigoCaractere: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    textAlign: 'center',
    includeFontPadding: true,
    minWidth: 22,
  },
  codigoSeparador: { fontFamily: FONTES.titulo, fontSize: 22 },
  codigoOculto: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  container: { width: '100%' },
  rotulo: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  caixa: {
    width: '100%',
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: RAIO.lg,
    paddingHorizontal: ESPACO.md,
  },
  caixaLinha: { height: ALTURA, alignItems: 'center' },
  caixaCompacta: { height: ALTURA_COMPACTA, borderRadius: RAIO.md, paddingHorizontal: ESPACO.md - 2 },
  caixaCompactaMultilinha: { borderRadius: RAIO.md, paddingHorizontal: ESPACO.md - 2 },
  caixaSelecaoDupla: { minHeight: 64, alignItems: 'center', paddingVertical: ESPACO.sm },
  textoSelecao: { fontFamily: FONTES.corpo, fontSize: 15, lineHeight: 22 },
  caixaMultilinha: {
    minHeight: ALTURA_MULTILINHA,
    alignItems: 'flex-start',
    paddingVertical: ESPACO.md - 2,
  },
  iconeMultilinha: { marginTop: 2 },
  areaEntrada: { flex: 1, minWidth: 0 },
  areaEntradaLinha: { alignSelf: 'stretch', justifyContent: 'center' },
  entrada: {
    minWidth: 0,
    paddingHorizontal: 0,
    fontFamily: FONTES.corpo,
    fontSize: 15,
    outlineWidth: 0,
  },
  entradaLinha: { height: '100%', paddingVertical: 0 },
  entradaMultilinha: { minHeight: ALTURA_MULTILINHA - 2 * (ESPACO.md - 2) - 3, paddingTop: 0 },
  entradaComIcone: { marginLeft: ESPACO.md - 4 },
  exemplo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  textoExemplo: { fontFamily: FONTES.corpo, fontSize: 15 },
  acaoFinal: { paddingLeft: ESPACO.sm },
  rodape: { marginTop: ESPACO.sm, flexDirection: 'row', alignItems: 'flex-start', gap: ESPACO.sm },
  erro: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  textoErro: { ...TIPOGRAFIA.legenda, flex: 1 },
  dica: { ...TIPOGRAFIA.legenda },
});
