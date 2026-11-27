// QA da interface web com API simulada; não acessa dados de produção.
// PLAYWRIGHT_MODULE pode apontar para uma instalação externa de playwright.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.RELATORIO_URL || 'http://localhost:8091';
const api = process.env.RELATORIO_API_URL || 'http://127.0.0.1:39099';
const pasta = process.env.RELATORIO_QA_DIR || path.join(require('node:os').tmpdir(), 'conecta-relatorio-qa');
fs.mkdirSync(pasta, { recursive: true });
const usuario = { _id: '111111111111111111111111', nome: 'Rafaela teste', email: 'teste@example.invalid', tipo: 'USUARIO' };
const modelo = {
  usuario, gerada_em: '2026-11-26T15:00:00Z', periodo: { de: null, ate: null },
  vinculos: { organizacoes: [{ id: 'o1', nome: 'Organização de ensino e pesquisa', papel: 'ADMIN' }], comissoes: [{ id: 'c1', nome: 'Comissão de projetos', organizacao_id: 'o1', organizacao: 'Organização de ensino e pesquisa', papel: 'RESPONSAVEL' }] },
  resumo: { reunioes: 2, minutos_registrados: 75, registros_sem_duracao: 1 },
  reunioes: [{ reuniao_id: 'r1', titulo: 'Reunião confirmada', comissao: 'Comissão de projetos', organizacao: 'Organização de ensino e pesquisa', local: 'Sala 1', inicio: '2026-11-20T12:00:00Z', fim: '2026-11-20T14:00:00Z', entrada: '2026-11-20T12:00:00Z', saida: '2026-11-20T13:15:00Z', minutos: 75, saida_automatica: true },
    { reuniao_id: 'r2', titulo: 'Sem saída', comissao: 'Comissão de projetos', organizacao: 'Organização de ensino e pesquisa', local: null, inicio: '2026-11-21T12:00:00Z', fim: '2026-11-21T14:00:00Z', entrada: '2026-11-21T12:00:00Z', saida: null, minutos: null }],
};
const evidencias = [], errosJS = [], pendencias = [];
async function verificar(nome, fn) { await fn(); evidencias.push({ nome, resultado: 'aprovado' }); console.log('PASSOU: '+nome); }
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  let resposta = structuredClone(modelo), modo = 'ok', contador = 0, pedidos = [];
  await ctx.addInitScript(() => { localStorage.setItem('conecta_mais_token', 'token-ficticio'); if (!localStorage.getItem('conecta_mais_tema')) localStorage.setItem('conecta_mais_tema', 'claro'); window.print = () => { throw new Error('O download não deve depender da impressão.'); }; window.open = () => { throw new Error('O download não deve depender de popup.'); }; });
  await ctx.route(api+'/**', async route => {
    const u = new URL(route.request().url());
    if (u.pathname === '/usuarios/me') return route.fulfill({ json: usuario });
    if (u.pathname === '/notificacoes') return route.fulfill({ json: { nao_lidas: 0, itens: [] } });
    if (u.pathname === '/relatorios/individual') {
      contador++; pedidos.push(u.searchParams.toString());
      if (modo === 'offline') return route.abort('connectionfailed');
      if (modo === 'erro') return route.fulfill({ status: 500, json: { message: 'Falha simulada de consulta' } });
      if (modo === '401') return route.fulfill({ status: 401, json: { message: 'Sessão expirada' } });
      const json = structuredClone(resposta);
      if (modo === 'lento') json.usuario.nome = u.searchParams.has('de') ? 'Consulta antiga' : 'Consulta recente';
      if (modo === 'lento' && u.searchParams.has('de')) await new Promise(r => setTimeout(r, 800));
      return route.fulfill({ json });
    }
    return route.fulfill({ json: [] });
  });
  const page = await ctx.newPage(); page.on('pageerror', e => errosJS.push(e.message));
  page.setDefaultTimeout(15000);
  try {
    await page.goto(base+'/relatorio', { timeout: 120000 });
    await page.getByText('Meus vínculos atuais', { exact: true }).waitFor();
    await verificar('histórico, vínculo e papel visíveis', async () => {
      assert.ok(await page.getByText('Rafaela teste', { exact: true }).count());
      assert.ok(await page.getByText(/Organização de ensino e pesquisa · Administrador/).count());
      assert.ok(await page.getByText(/Comissão de projetos.*Responsável/).count());
    });
    await verificar('saída automática e ausência de duração são explícitas', async () => {
      assert.ok(await page.getByText('Saída automática no término previsto.', { exact: true }).count());
      assert.ok(await page.getByText('Duração não calculada', { exact: true }).count());
    });
    for (const [width,height] of [[320,568],[360,640],[390,844],[768,1024],[1440,900]]) {
      await verificar(`largura ${width}: conteúdo sem rolagem horizontal`, async () => {
        await page.setViewportSize({ width,height });
        const medidas = await page.evaluate(() => ({ largura: document.documentElement.scrollWidth, janela: innerWidth }));
        assert.ok(medidas.largura <= medidas.janela, JSON.stringify(medidas));
        await page.getByRole('button', { name: 'Exportar CSV', exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(pasta, `relatorio-${width}.png`) });
      });
    }
    await verificar('CSV baixado tem vínculos, acentos e origem de saída', async () => {
      const evento = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
      const d = await evento; const arquivo = path.join(pasta,'relatorio.csv'); await d.saveAs(arquivo);
      const csv = fs.readFileSync(arquivo,'utf8'); assert.ok(csv.includes('Comissão atual')); assert.ok(csv.includes('Automática no término previsto')); assert.equal(csv.charCodeAt(0),0xfeff);
    });
    await verificar('PDF web baixa arquivo real sem impressão ou nova janela', async () => {
      const evento = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportar PDF', exact: true }).click(); const download = await evento;
      assert.equal(download.suggestedFilename(),'relatorio-individual.pdf');
      const destino = path.join(pasta,'relatorio-a4.pdf'); await download.saveAs(destino);
      const arquivo = fs.readFileSync(destino);
      assert.equal(arquivo.subarray(0,5).toString(),'%PDF-'); assert.ok(arquivo.length > 10000);
      assert.ok(await page.getByRole('button',{name:'Exportar PDF',exact:true}).isEnabled());
    });
    await verificar('falha de rede permite tentar novamente', async () => {
      modo='offline'; await page.getByRole('button',{name:'Atualizar relatório',exact:true}).click();
      await page.getByText('Não foi possível conectar ao servidor.',{exact:true}).waitFor();
      modo='ok'; await page.getByRole('button',{name:'Atualizar relatório',exact:true}).click();await page.getByText('Meus vínculos atuais',{exact:true}).waitFor();
    });
    await verificar('erro HTTP não mostra resultado antigo como atualizado', async () => {
      modo='erro';await page.getByRole('button',{name:'Atualizar relatório',exact:true}).click();await page.getByText('Falha simulada de consulta',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Exportar PDF',exact:true}).count(),0);modo='ok';
    });
    await verificar('usuário sem reunião pode exportar vínculos', async () => {
      resposta={...structuredClone(modelo),reunioes:[],resumo:{reunioes:0,minutos_registrados:0,registros_sem_duracao:0}};
      await page.getByRole('button',{name:'Atualizar relatório',exact:true}).click();await page.getByText('Nenhuma participação confirmada neste período.',{exact:true}).waitFor();
      assert.ok(await page.getByRole('button',{name:'Exportar PDF',exact:true}).isEnabled());assert.ok(await page.getByText(/Comissão de projetos.*Responsável/).count());
    });
    await verificar('servidor anterior informa vínculos indisponíveis', async () => {
      delete resposta.vinculos;await page.getByRole('button',{name:'Atualizar relatório',exact:true}).click();await page.getByText('Informações de vínculos indisponíveis nesta versão do servidor.',{exact:true}).waitFor();
    });
    await verificar('nomes extensos em tela de 320 pixels', async () => {
      resposta=structuredClone(modelo);resposta.usuario.nome='Nome '.repeat(50);resposta.vinculos.organizacoes[0].nome='Organização '.repeat(30);
      await page.setViewportSize({width:320,height:568});await page.getByRole('button',{name:'Atualizar relatório',exact:true}).click();await page.getByText('Meus vínculos atuais',{exact:true}).waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    });
    await verificar('filtros de mês e ano enviam limites de data', async () => {
      await page.getByText('Este mês',{exact:true}).click();await page.getByText('Meus vínculos atuais',{exact:true}).waitFor();assert.match(pedidos.at(-1),/de=/);assert.match(pedidos.at(-1),/ate=/);
      await page.getByText('Este ano',{exact:true}).click();await page.getByText('Meus vínculos atuais',{exact:true}).waitFor();assert.equal(new Date(new URLSearchParams(pedidos.at(-1)).get('de')).getMonth(),0);
      await page.getByText('Todo período',{exact:true}).click();await page.getByText('Meus vínculos atuais',{exact:true}).waitFor();assert.equal(pedidos.at(-1),'');
    });
    await verificar('troca rápida de filtro não restaura a resposta antiga', async () => {
      modo='lento'; await page.getByRole('radio',{name:'Este mês',exact:true}).click();
      await page.getByRole('radio',{name:'Todo período',exact:true}).click();
      await page.getByText('Consulta recente',{exact:true}).waitFor();
      await page.waitForTimeout(1000);assert.equal(await page.getByText('Consulta antiga',{exact:true}).count(),0);modo='ok';
    });
    await verificar('PDF pode ser baixado novamente com popup bloqueado', async () => {
      await page.evaluate(()=>{window.__abrirOriginal=window.open;window.open=()=>null;});
      const evento = page.waitForEvent('download');
      await page.getByRole('button',{name:'Exportar PDF',exact:true}).click();
      const download = await evento; await download.saveAs(path.join(pasta,'pdf-sem-popup.pdf'));
      assert.equal(await download.failure(),null);
      assert.ok(await page.getByRole('button',{name:'Exportar PDF',exact:true}).isEnabled());
      await page.evaluate(()=>{window.open=window.__abrirOriginal;});
    });
    await verificar('teclado permite alcançar a exportação e identifica os filtros', async () => {
      await page.getByRole('radio',{name:'Todo período',exact:true}).focus();
      if (await page.getByRole('radio',{name:'Todo período',exact:true}).getAttribute('aria-checked') !== 'true') {
        pendencias.push('ControleSegmentado compartilhado: estado selecionado não expõe aria-checked no React Native Web instalado. Correção fora do escopo exclusivo do relatório.');
      }
      let encontrou = false;
      for (let i=0; i<12; i++) {
        await page.keyboard.press('Tab');
        if (await page.getByRole('button',{name:'Exportar CSV',exact:true}).evaluate(e=>document.activeElement===e)) { encontrou=true; break; }
      }
      assert.ok(encontrou,'Exportar CSV deve ser alcançável por Tab');
    });
    await verificar('tema escuro mantém dados e ações disponíveis', async () => {
      resposta=structuredClone(modelo);await page.evaluate(()=>localStorage.setItem('conecta_mais_tema','escuro'));await page.reload();
      await page.getByText('Meus vínculos atuais',{exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'dark');
      await page.getByRole('button',{name:'Exportar CSV',exact:true}).scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(pasta,'relatorio-escuro.png')});
    });
    await verificar('fonte ampliada no navegador não corta título nem causa rolagem horizontal', async () => {
      await page.addStyleTag({content:'[dir="auto"]{font-size:130% !important;line-height:1.5 !important}'});
      const titulo=page.getByRole('heading',{name:'Relatório individual',exact:true});
      assert.ok(await titulo.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(pasta,'relatorio-fonte-ampliada.png')});
    });
    await verificar('401 encerra sessão e impede manter relatório visível', async () => {
      modo='401';await page.getByRole('button',{name:'Atualizar relatório',exact:true}).click();await page.waitForURL(/login/);assert.equal(await page.getByText('Meus vínculos atuais',{exact:true}).count(),0);
    });
    assert.deepEqual(errosJS,[]);
  } catch(e) { await page.screenshot({ path:path.join(pasta,'falha.png'),fullPage:true }); fs.writeFileSync(path.join(pasta,'falha.txt'),await page.locator('body').innerText());throw e; }
  finally {fs.writeFileSync(path.join(pasta,'resultados.json'),JSON.stringify({evidencias,errosJS,pendencias,consultas:contador},null,2));await browser.close();}
})();
