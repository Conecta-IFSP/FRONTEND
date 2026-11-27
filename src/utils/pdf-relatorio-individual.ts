// A distribuição ESM também funciona no pré-render do Expo (a distribuição Node usa AMD).
import { jsPDF } from 'jspdf/dist/jspdf.es.min.js';
import type { RelatorioIndividual } from '../types/relatorio-individual';
import { dataRelatorio, horasRelatorio, periodoRelatorio } from './relatorio-individual';

export type RecursosPdfRelatorio = { logo: string; fonteRegular: string; fonteNegrito: string };

/** Documento vetorial: textos selecionáveis e paginação, sem capturar a tela. */
export function gerarPdfRelatorioIndividual(r: RelatorioIndividual, recursos: RecursosPdfRelatorio) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true, putOnlyUsedFonts: true });
  pdf.addFileToVFS('Poppins-Regular.ttf', recursos.fonteRegular);
  pdf.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
  pdf.addFileToVFS('Poppins-Semibold.ttf', recursos.fonteNegrito);
  pdf.addFont('Poppins-Semibold.ttf', 'Poppins', 'bold');
  pdf.setProperties({ title: 'Relatório Individual', author: 'Conecta+', subject: 'Participação em reuniões' });
  const margem = 48, largura = pdf.internal.pageSize.getWidth() - 2 * margem;
  const limite = pdf.internal.pageSize.getHeight() - 70;
  let y = 142;
  function estilo(tamanho = 10, negrito = false, cor = '#20273b') {
    pdf.setFont('Poppins', negrito ? 'bold' : 'normal'); pdf.setFontSize(tamanho); pdf.setTextColor(cor);
  }
  function reservar(altura: number) {
    if (y + altura <= limite) return;
    pdf.addPage(); estilo(9, true, '#566174');
    pdf.text('Conecta+ · Relatório Individual', margem, 36); y = 65;
  }
  function texto(valor: string, tamanho = 10, negrito = false, cor = '#20273b') {
    estilo(tamanho, negrito, cor);
    const linhas = pdf.splitTextToSize(valor, largura) as string[];
    for (const linha of linhas) {
      reservar(tamanho * 1.5); estilo(tamanho, negrito, cor);
      pdf.text(linha, margem, y); y += tamanho * 1.5;
    }
  }
  function titulo(valor: string) {
    reservar(44); y += 6; texto(valor, 12, true, '#3459cf'); y += 5;
  }
  function campos(esquerda: [string, string], direita: [string, string]) {
    const coluna = (largura - 20) / 2;
    estilo(9);
    const a = pdf.splitTextToSize(esquerda[1], coluna) as string[];
    const b = pdf.splitTextToSize(direita[1], coluna) as string[];
    reservar(28); estilo(7.5, false, '#566174');
    pdf.text(esquerda[0], margem, y); pdf.text(direita[0], margem + coluna + 20, y); y += 14;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      reservar(14); estilo(9);
      if (a[i]) pdf.text(a[i], margem, y);
      if (b[i]) pdf.text(b[i], margem + coluna + 20, y);
      y += 14;
    }
    y += 7;
  }
  pdf.addImage(recursos.logo, 'PNG', margem, 42, 66, 66);
  estilo(22, true); pdf.text('Relatório Individual', 132, 72);
  estilo(10, false, '#566174'); pdf.text('Participação em reuniões', 132, 94);
  pdf.setDrawColor('#3459cf'); pdf.line(margem, 120, margem + largura, 120);
  texto(`Participante: ${r.usuario.nome}`); texto(`E-mail: ${r.usuario.email}`);
  texto(`Período: ${periodoRelatorio(r)}`); texto(`Emitido em: ${dataRelatorio(r.gerada_em)}`);
  titulo('Vínculos atuais');
  texto('Organizações aprovadas e comissões ativas na emissão, independentes do período das reuniões.', 9, false, '#566174');
  if (r.vinculos) {
    titulo('Organizações');
    for (const o of r.vinculos.organizacoes) texto(`${o.nome} · ${o.papel === 'ADMIN' ? 'Administrador' : 'Membro'}`, 9);
    if (!r.vinculos.organizacoes.length) texto('Nenhum vínculo aprovado em organização aprovada.', 9);
    titulo('Comissões');
    for (const c of r.vinculos.comissoes) texto(`${c.nome} · ${c.organizacao} · ${c.papel === 'RESPONSAVEL' ? 'Responsável' : 'Membro'}`, 9);
    if (!r.vinculos.comissoes.length) texto('Nenhuma comissão ativa vinculada.', 9);
  } else texto('Informações de vínculos indisponíveis nesta versão do servidor.', 9);
  titulo('Participações confirmadas');
  texto(`${r.resumo.reunioes} reunião(ões) · ${horasRelatorio(r.resumo.minutos_registrados)} de participação registrada`, 10, true);
  if (r.reunioes.some(p => p.saida_automatica)) texto('O total inclui saídas registradas automaticamente no término previsto da reunião.', 9);
  if (!r.reunioes.length) texto('Nenhuma participação confirmada neste período.', 10);
  r.reunioes.forEach((p, i) => {
    const nome = `${String(i + 1).padStart(2, '0')}. ${p.titulo}`;
    const linhas: [[string, string], [string, string]][] = [
      [['Organização', p.organizacao], ['Comissão', p.comissao]],
      [['Início da reunião', dataRelatorio(p.inicio)], ['Término da reunião', dataRelatorio(p.fim)]],
      [['Local', p.local || 'Não informado'], ['Modalidade de horário', p.dia_inteiro ? 'Dia inteiro' : 'Horário definido']],
      [['Entrada registrada', dataRelatorio(p.entrada)], ['Saída registrada', dataRelatorio(p.saida) + (p.saida_automatica ? ' (automática no término previsto)' : '')]],
      [['Presença', 'Confirmada'], ['Duração registrada', p.minutos === null ? 'Não calculada' : horasRelatorio(p.minutos)]],
    ];
    estilo(12, true);
    let altura = 16 + pdf.splitTextToSize(nome, largura).length * 18;
    estilo(9);
    for (const [a, b] of linhas) {
      altura += 21 + Math.max(pdf.splitTextToSize(a[1], (largura - 20) / 2).length, pdf.splitTextToSize(b[1], (largura - 20) / 2).length) * 14;
    }
    // Mantém a reunião inteira na mesma página quando seu conteúdo cabe nela.
    reservar(Math.min(altura, limite - 65)); titulo(nome);
    for (const [esquerda, direita] of linhas) campos(esquerda, direita);
    pdf.setDrawColor('#d9deea'); pdf.line(margem, y - 4, margem + largura, y - 4); y += 5;
  });
  y += 8;
  texto(`Período pela data de início da reunião. Horários no fuso ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`, 8, false, '#566174');
  if (r.resumo.registros_sem_duracao) texto(`${r.resumo.registros_sem_duracao} registro(s) sem duração calculada, por ausência de entrada e saída válidas.`, 8, false, '#566174');
  texto('Apenas presenças confirmadas em reuniões não canceladas. Minutos incompletos são desconsiderados. Este documento não constitui assinatura digital.', 8, false, '#566174');
  const paginas = pdf.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    pdf.setPage(pagina); estilo(8, false, '#566174');
    pdf.text(`Conecta+ · ${pagina} / ${paginas}`, margem, pdf.internal.pageSize.getHeight() - 32);
  }
  return pdf;
}
