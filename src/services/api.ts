/**
 * Acesso à API do Conecta+ e guarda do token da sessão. Em aparelho físico o
 * `localhost` do .env é trocado pelo IP do computador informado pelo Expo.
 */

import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHAVE_TOKEN = 'conecta_mais_token';
const ouvintes = new Set<() => void>();
export function observarSessaoInvalida(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
}

function obterUrlApi() {
  const configurada = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (!configurada) return null;

  const hostExpo = Constants.expoConfig?.hostUri?.split(':')[0];
  const ehLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configurada);
  if (Platform.OS === 'web' || !hostExpo || !ehLocalhost) return configurada;

  const url = new URL(configurada);
  url.hostname = hostExpo;
  return url.toString().replace(/\/$/, '');
}

const URL_API = obterUrlApi();

function armazenamentoWeb() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export async function salvarToken(token: string) {
  if (Platform.OS === 'web') armazenamentoWeb()?.setItem(CHAVE_TOKEN, token);
  else await SecureStore.setItemAsync(CHAVE_TOKEN, token);
}

export async function obterToken() {
  if (Platform.OS === 'web') return armazenamentoWeb()?.getItem(CHAVE_TOKEN) ?? null;
  return SecureStore.getItemAsync(CHAVE_TOKEN);
}

export async function removerToken() {
  if (Platform.OS === 'web') armazenamentoWeb()?.removeItem(CHAVE_TOKEN);
  else await SecureStore.deleteItemAsync(CHAVE_TOKEN);
}

export type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string };

export async function api<T>(
  caminho: string,
  metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  corpo?: unknown,
): Promise<Resultado<T>> {
  if (!URL_API) {
    return { ok: false, erro: 'Configure EXPO_PUBLIC_API_URL para falar com o servidor.' };
  }

  const token = await obterToken();

  try {
    const resposta = await fetch(`${URL_API}${caminho}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });

    const dados = (await resposta.json().catch(() => null)) as
      | (T & { message?: string | string[] })
      | null;

    if (!resposta.ok) {
      if (resposta.status === 401 && token && !caminho.startsWith('/auth/')) {
        if (await obterToken() === token) {
          await removerToken();
          ouvintes.forEach((ouvinte) => ouvinte());
        }
      }
      const mensagem = Array.isArray(dados?.message) ? dados.message[0] : dados?.message;
      return { ok: false, erro: mensagem ?? 'Não foi possível concluir a operação.' };
    }

    return { ok: true, dados: dados as T };
  } catch {
    return { ok: false, erro: 'Não foi possível falar com o servidor.' };
  }
}

export type Organizacao = {
  _id: string;
  nome: string;
  descricao?: string;
  status: 'PENDENTE' | 'APROVADA' | 'REVOGADA';
  criada_por?: { nome: string } | null;
  meu_vinculo?: { papel: 'ADMIN' | 'MEMBRO'; status: StatusVinculo } | null;
  membros?: {
    usuario_id: { _id: string; nome: string; email: string };
    papel: 'ADMIN' | 'MEMBRO';
    status: StatusVinculo;
  }[];
};

export type StatusVinculo = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

export type PapelComissao = 'MEMBRO' | 'RESPONSAVEL';

export type PessoaComissao = { _id: string; nome: string; email: string };

export type Comissao = {
  _id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  organizacao_id: { _id: string; nome: string };
  membros: { usuario_id: PessoaComissao | null; papel: PapelComissao }[];
};
