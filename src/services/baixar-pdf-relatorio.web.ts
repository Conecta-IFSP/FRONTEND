import { Asset } from 'expo-asset';
import type { RelatorioIndividual } from '@/types/relatorio-individual';
import { gerarPdfRelatorioIndividual } from '@/utils/pdf-relatorio-individual';

async function fonteBase64(modulo: number) {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 15000);
  try {
    const resposta = await fetch(Asset.fromModule(modulo).uri, { signal: controlador.signal });
    if (!resposta.ok) throw new Error('Não foi possível carregar a fonte do relatório.');
    const bytes = new Uint8Array(await resposta.arrayBuffer());
    let binario = '';
    for (let i = 0; i < bytes.length; i += 8192) binario += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binario);
  } finally { clearTimeout(limite); }
}

export async function baixarPdfRelatorio(relatorio: RelatorioIndividual, logo: string): Promise<void> {
  const [fonteRegular, fonteNegrito] = await Promise.all([
    fonteBase64(require('@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf')),
    fonteBase64(require('@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf')),
  ]);
  const pdf = gerarPdfRelatorioIndividual(relatorio, { logo, fonteRegular, fonteNegrito });
  const url = URL.createObjectURL(pdf.output('blob'));
  const link = document.createElement('a');
  try {
    link.href = url; link.download = 'relatorio-individual.pdf';
    document.body.appendChild(link); link.click();
  } finally {
    link.remove();
    // Dá tempo ao navegador de iniciar o download antes de liberar a URL temporária.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
