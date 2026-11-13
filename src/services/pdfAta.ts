import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

import type { Reuniao } from '@/services/api';
import { formatarDiaMesAno, numeroDaAta } from '@/utils/reunioes';
import { paragrafos } from '@/utils/diferenca';

// Folha A4 em pontos (72 por polegada).
const A4 = { width: 595, height: 842 };

function escapar(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lista(nomes: string[]) {
  if (nomes.length < 2) return nomes.join('');
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

function htmlDaAta(reuniao: Reuniao) {
  const ata = reuniao.ata!;
  const nomeDe = (id: string) =>
    reuniao.participantes.find((participante) => participante.usuario_id?._id === id)?.usuario_id?.nome ?? 'Participante';
  const cabecalho = [reuniao.comissao_id?.nome, reuniao.titulo]
    .filter(Boolean)
    .map((parte) => escapar(parte!))
    .join(' · ');
  const texto = paragrafos(ata.conteudo)
    .map((paragrafo) => `<p>${escapar(paragrafo)}</p>`)
    .join('');
  const nomes = ata.avaliacoes
    .filter((avaliacao) => avaliacao.decisao === 'APROVADA')
    .map((avaliacao) => escapar(nomeDe(avaliacao.usuario_id)));
  const quando = ata.aprovada_em ? ` em ${formatarDiaMesAno(ata.aprovada_em)}` : '';
  const assinatura = nomes.length ? `Aprovada por ${lista(nomes)}${quando}.` : '';

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<style>
  @page { margin: 48px; }
  body { font-family: -apple-system, Roboto, Arial, sans-serif; color: #14182B; font-size: 12pt; line-height: 1.5; }
  h1 { font-size: 16pt; text-align: center; margin: 0; }
  .cabecalho { text-align: center; color: #4E5A78; font-size: 10pt; margin: 6px 0 24px; }
  p { margin: 0 0 10px; text-align: justify; }
  .assinatura { margin-top: 28px; padding-top: 12px; border-top: 1px solid #C9CFDD; font-size: 10pt; color: #4E5A78; }
</style></head>
<body>
  <h1>${escapar(numeroDaAta(ata))}</h1>
  <div class="cabecalho">${cabecalho}</div>
  ${texto}
  ${assinatura ? `<div class="assinatura">${assinatura}</div>` : ''}
</body></html>`;
}

export async function compartilharPdfAta(reuniao: Reuniao) {
  const html = htmlDaAta(reuniao);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, ...A4 });
  const ata = reuniao.ata!;
  const nome = ata.numero && ata.ano ? `ata-${ata.numero}-${ata.ano}.pdf` : 'ata.pdf';
  const destino = new File(Paths.cache, nome);
  if (destino.exists) destino.delete();
  new File(uri).move(destino);
  await Sharing.shareAsync(destino.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: nome });
}
