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
const ID_ESTILO_ROLAGEM = 'conecta-mais-rolagem';

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

function aplicarRolagemWeb(tema: Tema) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  let estilo = document.getElementById(ID_ESTILO_ROLAGEM);
  if (!estilo) {
    estilo = document.createElement('style');
    estilo.id = ID_ESTILO_ROLAGEM;
    document.head.appendChild(estilo);
  }
  const { borda, textoSutil } = tema.cores;
  const barra = tema.escuro ? borda : `${textoSutil}80`;
  estilo.textContent = [
    `:root{color-scheme:${tema.escuro ? 'dark' : 'light'}}`,
    '::-webkit-scrollbar{width:8px;height:8px}',
    '::-webkit-scrollbar-track,::-webkit-scrollbar-corner{background:transparent}',
    `::-webkit-scrollbar-thumb{background:${barra};border-radius:4px}`,
    `::-webkit-scrollbar-thumb:hover{background:${textoSutil}}`,
    `@supports not selector(::-webkit-scrollbar){*{scrollbar-width:thin;scrollbar-color:${barra} transparent}}`,
  ].join('');
}

type ContextoTema = {
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

  useEffect(() => {
    aplicarRolagemWeb(valor.tema);
  }, [valor.tema]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useTema precisa ser usado dentro de TemaProvider.');
  return contexto;
}
