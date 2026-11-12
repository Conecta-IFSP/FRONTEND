import type { RelatorioIndividual } from '../types/relatorio-individual';

export type PeriodoRelatorio = 'todos' | 'mes' | 'ano';

export function consultaRelatorio(periodo: PeriodoRelatorio, agora = new Date()) {
  if (periodo === 'todos') return '';
  const de = new Date(agora.getFullYear(), periodo === 'mes' ? agora.getMonth() : 0, 1);
  const ate = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
  return `?de=${encodeURIComponent(de.toISOString())}&ate=${encodeURIComponent(ate.toISOString())}`;
}

export function horasRelatorio(minutos: number) {
  return `${Math.floor(minutos / 60)}h ${String(minutos % 60).padStart(2, '0')}min`;
}

export function dataRelatorio(data: string | null) {
  return data ? new Date(data).toLocaleString('pt-BR') : 'Não registrada';
}

export function periodoRelatorio(relatorio: RelatorioIndividual) {
  const { de, ate } = relatorio.periodo;
  if (!de && !ate) return 'Todo o período';
  const inicio = de ? new Date(de).toLocaleDateString('pt-BR') : 'Início do histórico';
  const fim = ate ? new Date(new Date(ate).getTime() - 1).toLocaleDateString('pt-BR') : 'Hoje';
  return `${inicio} a ${fim}`;
}

const escapar = (texto: string) => texto.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function htmlRelatorioIndividual(r: RelatorioIndividual, logo: string = '') {
  const campo = (rotulo: string, valor: string) => `<td><span class="rotulo">${rotulo}</span><span class="valor">${escapar(valor)}</span></td>`;
  const marca = logo.startsWith('data:image/png;base64,') ? `<img class="logo" src="${escapar(logo)}" alt="Conecta+">` : '<strong class="marca">Conecta+</strong>';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Individual</title>
  <style>
    @page{size:A4 portrait;margin:16mm 17mm}
    *{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#20273b;font-size:10pt;line-height:1.4}
    header{display:flex;align-items:center;gap:24px;border-bottom:2px solid #3459cf;padding-bottom:16px;margin-bottom:18px}
    .logo{width:90px;height:90px;object-fit:contain}.marca{color:#3459cf;font-size:22pt}
    h1{font-size:23pt;line-height:1.15;margin:0 0 6px;font-weight:700}header p{margin:0;color:#566174;font-size:10pt}
    .identificacao{margin-bottom:18px}.identificacao p{margin:3px 0;overflow-wrap:anywhere}
    .resumo{padding:9px 0;border-top:1px solid #d9deea;border-bottom:1px solid #d9deea;margin-bottom:18px}
    article{break-inside:avoid;page-break-inside:avoid;padding-bottom:12px;margin-bottom:14px;border-bottom:1px solid #d9deea}
    h2{font-size:12pt;line-height:1.4;margin:0 0 8px;overflow-wrap:anywhere}.numero{color:#3459cf;margin-right:8px}
    table{width:100%;table-layout:fixed;border-collapse:collapse}td{width:50%;padding:4px 12px 4px 0;vertical-align:top;overflow-wrap:anywhere}
    .rotulo{display:block;font-size:8pt;color:#566174;margin-bottom:1px}.valor{display:block;font-size:10pt}
    footer{font-size:8pt;color:#566174;line-height:1.5;margin-top:10px}footer p{margin:4px 0}
  </style></head><body>
  <header>${marca}<div><h1>Relatório Individual</h1><p>Participação em reuniões</p></div></header>
  <section class="identificacao"><p><strong>Participante:</strong> ${escapar(r.usuario.nome)}</p><p><strong>E-mail:</strong> ${escapar(r.usuario.email)}</p>
  <p><strong>Período:</strong> ${escapar(periodoRelatorio(r))}</p><p><strong>Emitido em:</strong> ${escapar(dataRelatorio(r.gerada_em))}</p></section>
  <div class="resumo"><strong>${r.resumo.reunioes} reunião(ões) com presença confirmada</strong> · ${horasRelatorio(r.resumo.minutos_registrados)} de participação registrada</div>
  ${r.reunioes.map((p, i) => `<article><h2><span class="numero">${String(i + 1).padStart(2, '0')}.</span>${escapar(p.titulo)}</h2><table><tbody>
    <tr>${campo('Organização', p.organizacao)}${campo('Comissão', p.comissao)}</tr>
    <tr>${campo('Início da reunião', dataRelatorio(p.inicio))}${campo('Término da reunião', dataRelatorio(p.fim))}</tr>
    <tr>${campo('Local', p.local || 'Não informado')}${campo('Modalidade de horário', p.dia_inteiro ? 'Dia inteiro' : 'Horário definido')}</tr>
    <tr>${campo('Entrada registrada', dataRelatorio(p.entrada))}${campo('Saída registrada', dataRelatorio(p.saida))}</tr>
    <tr>${campo('Presença', 'Confirmada')}${campo('Duração registrada', p.minutos === null ? 'Não calculada' : horasRelatorio(p.minutos))}</tr>
  </tbody></table></article>`).join('')}
  <footer><p>Conecta+ · Relatório de participação individual.</p>
  <p>Período considerado pela data de início da reunião. Horários no fuso ${escapar(Intl.DateTimeFormat().resolvedOptions().timeZone)}.</p>
  ${r.resumo.registros_sem_duracao ? `<p>${r.resumo.registros_sem_duracao} registro(s) sem duração calculada, por ausência de entrada e saída válidas.</p>` : ''}
  <p>Apenas presenças confirmadas em reuniões não canceladas. Minutos incompletos são desconsiderados. Este documento não constitui assinatura digital.</p></footer>
  </body></html>`;
}

// Aspas preservam separadores/quebras de linha; apóstrofo impede fórmulas em planilhas.
export function celulaCsv(valor: string | number | null) {
  let texto = valor === null ? '' : String(valor);
  if (/^[\s\uFEFF]*[=+@-]/.test(texto) || /^[\t\r\n]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

export function csvRelatorioIndividual(r: RelatorioIndividual) {
  const linhas: (string | number | null)[][] = [[
    'Usuário', 'E-mail', 'Gerado em (UTC)', 'Período inicial (UTC)', 'Período final exclusivo (UTC)',
    'Reunião', 'Organização', 'Comissão', 'Local', 'Início (UTC)', 'Término (UTC)', 'Dia inteiro',
    'Entrada (UTC)', 'Saída (UTC)', 'Minutos registrados', 'Situação da presença',
  ]];
  r.reunioes.forEach(p => linhas.push([
    r.usuario.nome, r.usuario.email, r.gerada_em, r.periodo.de, r.periodo.ate,
    p.titulo, p.organizacao, p.comissao, p.local, p.inicio, p.fim, p.dia_inteiro ? 'Sim' : 'Não',
    p.entrada, p.saida, p.minutos, 'Confirmada',
  ]));
  return '\uFEFF' + linhas.map(linha => linha.map(celulaCsv).join(';')).join('\r\n');
}
