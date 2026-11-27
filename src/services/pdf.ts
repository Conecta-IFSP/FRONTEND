import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const A4 = { width: 595, height: 842 };

export function pdfPelaImpressao() {
  return Platform.OS === 'web' || isRunningInExpoGo();
}

function imprimirNaWeb(html: string) {
  const janela = window.open('', '_blank');
  if (!janela) throw new Error('Permita abrir uma nova janela para gerar o PDF.');
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  janela.print();
}

export async function entregarPdf(html: string, nome: string) {
  if (Platform.OS === 'web') {
    imprimirNaWeb(html);
    return;
  }
  if (isRunningInExpoGo()) {
    await Print.printAsync({ html, ...A4 });
    return;
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('O compartilhamento de arquivos não está disponível neste aparelho.');
  const { uri } = await Print.printToFileAsync({ html, ...A4 });
  // Compartilha o URI original, como o relatório individual: mover o PDF gerado
  // falhava no Android com "Missing 'READ' permission" (FileSystemFile.move).
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: nome });
}
