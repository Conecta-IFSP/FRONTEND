/**
 * Campo de texto dos formulários: rótulo acima, ícone à esquerda e a mensagem
 * de validação logo abaixo, junto do campo que precisa de correção.
 */

import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type CampoTextoProps = TextInputProps & {
  rotulo: string;
  icone?: keyof typeof Ionicons.glyphMap;
  /** Mensagem de validação; quando presente, destaca o campo como inválido. */
  erro?: string | null;
  /** Botão à direita do campo, usado para mostrar ou ocultar a senha. */
  acaoFinal?: {
    icone: keyof typeof Ionicons.glyphMap;
    rotuloAcessivel: string;
    aoTocar: () => void;
  };
  /** Texto de apoio abaixo do campo, à direita (por exemplo, o contador de caracteres). */
  dica?: string;
};

const ALTURA = 56;
const ALTURA_MULTILINHA = 120;

export const CampoTexto = forwardRef<TextInput, CampoTextoProps>(function CampoTexto(
  { rotulo, icone, erro = null, acaoFinal, dica, multiline = false, onFocus, onBlur, style, ...props },
  ref,
) {
  const { cores } = useTema().tema;
  const [focado, definirFocado] = useState(false);
  const invalido = Boolean(erro);
  const destaque = invalido ? cores.erro : focado ? cores.campoBordaFoco : null;

  return (
    <View style={styles.container}>
      <Text style={[styles.rotulo, { color: cores.textoSuave }]}>{rotulo}</Text>

      <View
        style={[
          styles.caixa,
          multiline ? styles.caixaMultilinha : styles.caixaLinha,
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

        <TextInput
          ref={ref}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          placeholderTextColor={cores.placeholder}
          accessibilityLabel={rotulo}
          accessibilityHint={erro ?? undefined}
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
            icone ? styles.entradaComIcone : null,
            { color: cores.texto },
            style,
          ]}
          {...props}
        />

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

const styles = StyleSheet.create({
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
  caixaMultilinha: {
    minHeight: ALTURA_MULTILINHA,
    alignItems: 'flex-start',
    paddingVertical: ESPACO.md - 2,
  },
  iconeMultilinha: { marginTop: 2 },
  entrada: { flex: 1, minWidth: 0, fontFamily: FONTES.corpo, fontSize: 15, outlineWidth: 0 },
  entradaLinha: { height: '100%' },
  entradaMultilinha: { minHeight: ALTURA_MULTILINHA - 2 * (ESPACO.md - 2) - 3, paddingTop: 0 },
  entradaComIcone: { marginLeft: ESPACO.md - 4 },
  acaoFinal: { paddingLeft: ESPACO.sm },
  rodape: { marginTop: ESPACO.sm, flexDirection: 'row', alignItems: 'flex-start', gap: ESPACO.sm },
  erro: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  textoErro: { ...TIPOGRAFIA.legenda, flex: 1 },
  dica: { ...TIPOGRAFIA.legenda },
});
