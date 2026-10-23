import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESPACO, FONTES, RAIO } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

type TipoToast = 'sucesso' | 'erro' | 'informacao';

type ToastAtual = {
  id: number;
  mensagem: string;
  tipo: TipoToast;
};

type ToastContexto = {
  mostrarToast: (mensagem: string, tipo?: TipoToast, duracao?: number) => void;
};

const Contexto = createContext<ToastContexto | null>(null);

const APARENCIA = {
  sucesso: { icone: 'checkmark-circle' as IoniconsIconName, cor: 'sucesso' as const },
  erro: { icone: 'close-circle' as IoniconsIconName, cor: 'erro' as const },
  informacao: { icone: 'information-circle' as IoniconsIconName, cor: 'primaria' as const },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { tema } = useTema();
  const margens = useSafeAreaInsets();
  const [toast, definirToast] = useState<ToastAtual | null>(null);

  const mostrarToast = useCallback((mensagem: string, tipo: TipoToast = 'informacao', duracao = 4000) => {
    const id = Date.now();
    definirToast({ id, mensagem, tipo });
    setTimeout(() => {
      definirToast((atual) => (atual?.id === id ? null : atual));
    }, duracao);
  }, []);

  const aparencia = toast ? APARENCIA[toast.tipo] : null;
  const cor = aparencia ? tema.cores[aparencia.cor] : tema.cores.primaria;
  const fundo = toast?.tipo === 'erro'
    ? tema.cores.erroSuave
    : toast?.tipo === 'sucesso'
      ? tema.cores.sucessoSuave
      : tema.cores.primariaSuave;

  return (
    <Contexto.Provider value={{ mostrarToast }}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Pressable
            accessibilityRole="alert"
            onPress={() => definirToast(null)}
            style={[
              styles.toast,
              {
                top: margens.top + ESPACO.sm,
                backgroundColor: fundo,
                borderColor: `${cor}55`,
              },
            ]}
          >
            <Ionicons name={aparencia?.icone ?? 'information-circle'} size={22} color={cor} />
            <Text style={[styles.mensagem, { color: tema.cores.texto }]}>{toast.mensagem}</Text>
            <Ionicons name="close" size={18} color={tema.cores.textoSuave} />
          </Pressable>
        </View>
      ) : null}
    </Contexto.Provider>
  );
}

export function useToast() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useToast precisa ser usado dentro de ToastProvider.');
  return contexto;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: ESPACO.md,
    right: ESPACO.md,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    paddingVertical: ESPACO.sm + 2,
    paddingHorizontal: ESPACO.md,
    borderWidth: 1,
    borderRadius: RAIO.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  mensagem: { flex: 1, fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
});
