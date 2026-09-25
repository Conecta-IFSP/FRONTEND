/**
 * Tema do aplicativo. O usuário escolhe entre seguir o aparelho, claro ou
 * escuro; a escolha fica guardada no aparelho e vale desde a abertura do app.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { TEMAS, type Tema } from '@/constants/theme';

export type PreferenciaTema = 'sistema' | 'claro' | 'escuro';

const CHAVE_PREFERENCIA = 'conecta_mais_tema';

export function ehPreferenciaTema(valor: unknown): valor is PreferenciaTema {
  return valor === 'sistema' || valor === 'claro' || valor === 'escuro';
}

async function lerPreferencia() {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(CHAVE_PREFERENCIA);
  }
  return SecureStore.getItemAsync(CHAVE_PREFERENCIA);
}

async function gravarPreferencia(preferencia: PreferenciaTema) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(CHAVE_PREFERENCIA, preferencia);
    return;
  }
  await SecureStore.setItemAsync(CHAVE_PREFERENCIA, preferencia);
}

type ContextoTema = {
  /** Tema em uso, já resolvido entre claro e escuro. */
  tema: Tema;
  preferencia: PreferenciaTema;
  definirPreferencia: (preferencia: PreferenciaTema) => void;
};

const Contexto = createContext<ContextoTema | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const esquemaDoAparelho = useColorScheme();
  const [preferencia, definirEstado] = useState<PreferenciaTema>('sistema');

  useEffect(() => {
    lerPreferencia()
      .then((salva) => {
        if (ehPreferenciaTema(salva)) definirEstado(salva);
      })
      .catch(() => {});
  }, []);

  const definirPreferencia = useCallback((nova: PreferenciaTema) => {
    definirEstado(nova);
    gravarPreferencia(nova).catch(() => {});
  }, []);

  const valor = useMemo<ContextoTema>(() => {
    const efetivo =
      preferencia === 'sistema'
        ? esquemaDoAparelho === 'dark'
          ? 'escuro'
          : 'claro'
        : preferencia;
    return { tema: TEMAS[efetivo], preferencia, definirPreferencia };
  }, [definirPreferencia, esquemaDoAparelho, preferencia]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useTema precisa ser usado dentro de TemaProvider.');
  return contexto;
}
