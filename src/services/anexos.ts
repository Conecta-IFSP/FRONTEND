import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';

import { acessoAutenticado, api, type Anexo, type Resultado, type Reuniao } from '@/services/api';

export const TAMANHO_MAXIMO_ANEXO = 10 * 1024 * 1024;
export const MAXIMO_ANEXOS = 10;
export const TIPOS_ANEXO = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
];

/** Arquivo escolhido no aparelho e ainda não enviado. Na web, `web` guarda o arquivo do navegador. */
export type ArquivoEscolhido = { uri: string; nome: string; tipo: string; tamanho: number; web?: Blob };

export async function escolherArquivos(): Promise<ArquivoEscolhido[]> {
  const resultado = await DocumentPicker.getDocumentAsync({
    multiple: true,
    type: TIPOS_ANEXO,
    copyToCacheDirectory: true,
    base64: false,
  });
  if (resultado.canceled) return [];
  return resultado.assets.map((item) => ({
    uri: item.uri,
    nome: item.name,
    tipo: item.mimeType ?? '',
    tamanho: item.size ?? item.file?.size ?? 0,
    web: item.file,
  }));
}

/** Confere tamanho e quantidade antes do envio; devolve a mensagem de erro ou `null`. */
export function validarArquivos(novos: ArquivoEscolhido[], jaAnexados: number) {
  const grande = novos.find((arquivo) => arquivo.tamanho > TAMANHO_MAXIMO_ANEXO);
  if (grande) return `${grande.nome} passa de 10 MB.`;
  if (jaAnexados + novos.length > MAXIMO_ANEXOS) return `Uma reunião pode ter até ${MAXIMO_ANEXOS} anexos.`;
  return null;
}

function nomeSeguro(nome: string) {
  return nome.replace(/[\\/:*?"<>|]/g, '_');
}

export async function enviarAnexo(reuniaoId: string, arquivo: ArquivoEscolhido): Promise<Resultado<Reuniao>> {
  const caminho = `/reunioes/${reuniaoId}/anexos`;
  if (arquivo.web) {
    const formulario = new FormData();
    formulario.append('arquivo', arquivo.web, arquivo.nome);
    return api<Reuniao>(caminho, 'POST', formulario);
  }

  // No Android e no iOS, o fetch do Expo não lê arquivos pela uri; o envio usa o upload nativo do expo-file-system.
  const acesso = await acessoAutenticado(caminho);
  if (!acesso) return { ok: false, erro: 'Não foi possível conectar ao servidor.' };
  // O seletor guarda a cópia com um nome gerado; a cópia temporária leva o nome original para o servidor.
  const pasta = new Directory(Paths.cache, 'envio-anexos', `${Date.now()}-${Math.round(Math.random() * 1e6)}`);
  try {
    pasta.create({ intermediates: true, idempotent: true });
    const copia = new File(pasta, nomeSeguro(arquivo.nome));
    await new File(arquivo.uri).copy(copia);
    const resposta = await copia.upload(acesso.url, {
      uploadType: UploadType.MULTIPART,
      fieldName: 'arquivo',
      mimeType: arquivo.tipo,
      headers: acesso.cabecalhos,
    });
    const dados = JSON.parse(resposta.body || 'null') as (Reuniao & { message?: string | string[] }) | null;
    if (resposta.status >= 200 && resposta.status < 300 && dados) return { ok: true, dados };
    const mensagem = Array.isArray(dados?.message) ? dados.message[0] : dados?.message;
    return { ok: false, erro: mensagem ?? 'Não foi possível enviar o anexo.' };
  } catch {
    return { ok: false, erro: 'Não foi possível enviar o anexo.' };
  } finally {
    try {
      pasta.delete();
    } catch {
      // A pasta temporária fica no cache, que o sistema limpa sozinho.
    }
  }
}

export function removerAnexo(reuniaoId: string, anexoId: string) {
  return api<Reuniao>(`/reunioes/${reuniaoId}/anexos/${anexoId}`, 'DELETE');
}

/** Baixa o anexo e abre no visualizador do aparelho. Devolve a mensagem de erro ou `null`. */
export async function abrirAnexo(reuniaoId: string, anexo: Anexo): Promise<string | null> {
  const acesso = await acessoAutenticado(`/reunioes/${reuniaoId}/anexos/${anexo._id}`);
  if (!acesso) return 'Não foi possível conectar ao servidor.';

  try {
    if (Platform.OS === 'web') {
      const resposta = await fetch(acesso.url, { headers: acesso.cabecalhos });
      if (!resposta.ok) return 'Não foi possível baixar o anexo.';
      const endereco = URL.createObjectURL(await resposta.blob());
      const link = document.createElement('a');
      link.href = endereco;
      link.download = anexo.nome;
      link.click();
      setTimeout(() => URL.revokeObjectURL(endereco), 60_000);
      return null;
    }

    const pasta = new Directory(Paths.cache, 'anexos', anexo._id);
    pasta.create({ intermediates: true, idempotent: true });
    const arquivo = await File.downloadFileAsync(acesso.url, new File(pasta, nomeSeguro(anexo.nome)), {
      headers: acesso.cabecalhos,
      idempotent: true,
    });
    const opcoes = { mimeType: anexo.tipo };
    if (!(await File.canPreview(arquivo, opcoes))) return 'Nenhum app do aparelho abre este tipo de arquivo.';
    await File.preview(arquivo, { ...opcoes, title: anexo.nome });
    return null;
  } catch {
    return 'Não foi possível baixar o anexo.';
  }
}

export function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
