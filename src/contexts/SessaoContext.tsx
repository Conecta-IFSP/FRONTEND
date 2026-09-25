import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { api, obterToken, observarSessaoInvalida, removerToken, salvarToken } from '@/services/api';

type Usuario = { _id: string; nome: string; email: string; tipo: 'USUARIO' | 'ADMIN_SISTEMA'; tema?: string };
type Sessao = {
  usuario: Usuario | null;
  carregando: boolean;
  erro: string;
  aviso: string;
  atualizar: () => Promise<void>;
  entrar: (token: string) => Promise<boolean>;
  sair: () => Promise<void>;
};
const Contexto = createContext<Sessao | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, definirUsuario] = useState<Usuario | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState('');
  const [aviso, definirAviso] = useState('');
  const geracao = useRef(0);

  const atualizar = useCallback(async () => {
    const versao = geracao.current;
    try {
      const token = await obterToken();
      if (!token) { definirUsuario(null); return; }
      const resultado = await api<Usuario>('/usuarios/me');
      if (versao !== geracao.current || await obterToken() !== token) return;
      if (resultado.ok) {
        definirUsuario(resultado.dados);
        definirErro('');
      } else {
        definirErro(resultado.erro);
      }
    } catch {
      definirErro('Não foi possível verificar sua sessão. Tente novamente.');
    } finally {
      definirCarregando(false);
    }
  }, []);

  useEffect(() => {
    const cancelar = observarSessaoInvalida(() => {
      geracao.current++;
      definirUsuario(null);
      definirErro('');
      definirAviso('Sua sessão expirou ou a conta está indisponível. Entre novamente.');
    });
    void Promise.resolve().then(atualizar);
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void atualizar();
    });
    const intervalo = setInterval(() => {
      if (AppState.currentState === 'active' || Platform.OS === 'web') void atualizar();
    }, 30000);
    return () => { cancelar(); assinatura.remove(); clearInterval(intervalo); };
  }, [atualizar]);

  const entrar = useCallback(async (token: string) => {
    const versao = ++geracao.current;
    definirAviso('');
    definirErro('');
    try {
      await salvarToken(token);
      const resultado = await api<Usuario>('/usuarios/me');
      if (versao !== geracao.current || await obterToken() !== token) return false;
      if (!resultado.ok) { definirErro(resultado.erro); return false; }
      definirUsuario(resultado.dados);
      return true;
    } catch {
      definirErro('Não foi possível iniciar sua sessão. Tente novamente.');
      return false;
    }
  }, []);

  const sair = useCallback(async () => {
    geracao.current++;
    await removerToken();
    definirUsuario(null);
    definirErro('');
    definirAviso('');
  }, []);

  return <Contexto.Provider value={{ usuario, carregando, erro, aviso, atualizar, entrar, sair }}>{children}</Contexto.Provider>;
}

export function useSessao() {
  const sessao = useContext(Contexto);
  if (!sessao) throw new Error('useSessao precisa de SessaoProvider');
  return sessao;
}
