import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';
import type { RelatorioIndividual } from '@/types/relatorio-individual';
import { csvRelatorioIndividual, htmlRelatorioIndividual } from '@/utils/relatorio-individual';

async function logoDoRelatorio() {
  const logo = Asset.fromModule(require('../../assets/images/logo-titulo.png'));
  if (Platform.OS !== 'web') {
    await logo.downloadAsync();
    return `data:image/png;base64,${await new File(logo.localUri ?? logo.uri).base64()}`;
  }
  const resposta = await fetch(logo.uri);
  if (!resposta.ok) throw new Error('Não foi possível carregar a logo do relatório.');
  const blob = await resposta.blob();
  return new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error('Não foi possível ler a logo.'));
    leitor.readAsDataURL(blob);
  });
}

async function imprimirRelatorioWeb(relatorio: RelatorioIndividual) {
  // Expo Print na web chama window.print() e ignora o HTML recebido.
  // A janela é aberta durante o clique para evitar bloqueio de pop-up.
  const janela = window.open('', '_blank');
  if (!janela) throw new Error('Permita abrir uma nova janela para exportar o PDF.');
  try {
    const html = htmlRelatorioIndividual(relatorio, await logoDoRelatorio());
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
    await Promise.all(Array.from(janela.document.images).map(imagem => imagem.decode()));
    await janela.document.fonts.ready;
    janela.focus();
    janela.print();
  } catch (erro) {
    janela.close();
    throw erro;
  }
}

export async function exportarRelatorioIndividual(relatorio: RelatorioIndividual, formato: 'pdf' | 'csv') {
  if (Platform.OS === 'web') {
    if (formato === 'pdf') {
      await imprimirRelatorioWeb(relatorio);
    } else {
      const url = URL.createObjectURL(new Blob([csvRelatorioIndividual(relatorio)], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'relatorio-individual.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return;
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('O compartilhamento de arquivos não está disponível neste aparelho.');
  const arquivo = new File(Paths.cache, `relatorio-individual-${Date.now()}.${formato}`);
  try {
    if (formato === 'pdf') {
      const html = htmlRelatorioIndividual(relatorio, await logoDoRelatorio());
      const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
      new File(uri).move(arquivo);
    } else {
      arquivo.create();
      arquivo.write(csvRelatorioIndividual(relatorio));
    }
    await Sharing.shareAsync(arquivo.uri, {
      mimeType: formato === 'pdf' ? 'application/pdf' : 'text/csv',
      UTI: formato === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text',
      dialogTitle: 'Exportar relatório individual',
    });
  } catch (erro) {
    if (arquivo.exists) arquivo.delete();
    throw erro;
  }
}
