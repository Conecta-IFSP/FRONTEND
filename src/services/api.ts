import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHAVE_TOKEN = 'conecta_mais_token';
const CHAVE_API = process.env.EXPO_PUBLIC_API_ACCESS_TOKEN?.trim();
const ouvintes = new Set<() => void>();
export function observarSessaoInvalida(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
}

function obterUrlApi() {
  const configurada = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (!configurada) return null;

  const hostExpo = Constants.expoConfig?.hostUri?.split(':')[0];
  // No emulador Android, 10.0.2.2 aponta para o computador host.
  // No Expo Go em um celular físico, o endereço correto é o IP do computador
  // que aparece em Constants.expoConfig.hostUri.
  const ehEnderecoLocal = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/i.test(configurada);
  if (Platform.OS === 'web' || !hostExpo || !ehEnderecoLocal) return configurada;

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

/** Endereço completo de uma rota e cabeçalhos de acesso, para downloads feitos fora do `api()`. */
export async function acessoAutenticado(caminho: string) {
  if (!URL_API || !CHAVE_API) return null;
  const token = await obterToken();
  const cabecalhos: Record<string, string> = { 'X-API-Key': CHAVE_API };
  if (token) cabecalhos.Authorization = `Bearer ${token}`;
  return { url: `${URL_API}${caminho}`, cabecalhos };
}

export async function api<T>(
  caminho: string,
  metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  corpo?: unknown,
): Promise<Resultado<T>> {
  if (!URL_API) {
    return { ok: false, erro: 'Configure EXPO_PUBLIC_API_URL para falar com o servidor.' };
  }
  if (!CHAVE_API) {
    return { ok: false, erro: 'Configure EXPO_PUBLIC_API_ACCESS_TOKEN para acessar o servidor.' };
  }

  const token = await obterToken();
  // Em formulários (envio de arquivo), o próprio fetch define o Content-Type com o boundary.
  const formulario = typeof FormData !== 'undefined' && corpo instanceof FormData;

  try {
    const resposta = await fetch(`${URL_API}${caminho}`, {
      method: metodo,
      headers: {
        ...(formulario ? {} : { 'Content-Type': 'application/json' }),
        'X-API-Key': CHAVE_API,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo === undefined ? undefined : formulario ? corpo : JSON.stringify(corpo),
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
    return { ok: false, erro: 'Não foi possível conectar ao servidor.' };
  }
}

export type Organizacao = {
  _id: string;
  nome: string;
  cidade?: string;
  descricao?: string;
  status: 'PENDENTE' | 'APROVADA' | 'REVOGADA';
  criada_por?: { nome: string } | null;
  codigo_acesso?: string;
  meu_vinculo?: { papel: 'ADMIN' | 'MEMBRO'; status: StatusVinculo } | null;
  membros?: {
    usuario_id: { _id: string; nome: string; email: string };
    papel: 'ADMIN' | 'MEMBRO';
    status: StatusVinculo;
  }[];
};

export type StatusVinculo = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'CONVIDADO';

export type PapelOrganizacao = 'ADMIN' | 'MEMBRO';

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

export type RespostaConvite = 'PENDENTE' | 'ACEITO' | 'RECUSADO';

export type SituacaoPresenca = 'AGUARDANDO' | 'CONFIRMADA' | 'RECUSADA';

export type Presenca = {
  entrada: string;
  saida?: string;
  situacao: SituacaoPresenca;
  marcada_por: 'PROPRIO' | 'RESPONSAVEL' | 'LINK';
};

export type Participante = {
  usuario_id: PessoaComissao | null;
  convite: RespostaConvite;
  presenca?: Presenca;
};

export type AvaliacaoAta = {
  usuario_id: string;
  decisao: 'APROVADA' | 'REPROVADA';
  trecho?: string;
  justificativa?: string;
  em: string;
};

export type Ata = {
  conteudo: string;
  versao: number;
  situacao: 'RASCUNHO' | 'EM_APROVACAO' | 'APROVADA' | 'REPROVADA' | 'CANCELADA';
  autor_id: string;
  atualizada_em: string;
  enviada_em?: string;
  prazo?: string;
  aprovadores: string[];
  avaliacoes: AvaliacaoAta[];
  numero?: number;
  ano?: number;
  aprovada_em?: string;
  cancelada_em?: string;
};

export type AtaPendente = {
  _id: string;
  titulo: string;
  comissao_id: { _id: string; nome: string } | null;
  ata: Pick<Ata, 'situacao' | 'prazo'>;
};

export type Anexo = {
  _id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  enviado_em: string;
};

export type Reuniao = {
  ata?: Ata;
  atas_canceladas?: Ata[];
  _id: string;
  comissao_id: { _id: string; nome: string; organizacao_id: string } | null;
  titulo: string;
  local: string;
  inicio: string;
  fim: string;
  dia_inteiro?: boolean;
  horario_alterado_em?: string;
  pauta: string;
  anexos?: Anexo[];
  criada_por: string;
  situacao: 'AGENDADA' | 'CANCELADA';
  participantes: Participante[];
  sou_dono: boolean;
};
