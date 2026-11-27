import type { RelatorioIndividual } from '@/types/relatorio-individual';

// O Metro usa baixar-pdf-relatorio.web.ts no navegador; o nativo continua com Expo Print.
export async function baixarPdfRelatorio(_relatorio: RelatorioIndividual, _logo: string): Promise<void> {
  throw new Error('O download direto de PDF está disponível no navegador.');
}
