# Verificação do relatório individual

## Correção da exportação web — 27/11/2026

No navegador integrado, o botão permanecia carregando sem apresentar o PDF. A versão web agora gera o arquivo com jsPDF 4.2.1 e inicia seu download diretamente, sem chamar `window.open` ou `window.print`. O documento A4 incorpora logo e fontes Poppins, mantém texto selecionável, apresenta vínculos e participações e pagina o histórico. Reuniões que cabem em uma página são mantidas juntas. O fluxo nativo de Expo Print/Sharing e a exportação CSV foram preservados.

Validação realizada: `npm run typecheck`, `npm run lint` e os 51 testes de `node --test tests/*.test.cjs` aprovados. Os quatro testes novos geram PDFs reais com os recursos do app e cobrem histórico extenso, dados literais, ausência de reuniões e compatibilidade com respostas anteriores. Foram também aprovados os 21 cenários de `relatorio-browser.e2e.cjs`, com respostas fictícias interceptadas em contexto de navegador isolado. O teste de PDF agora aguarda o download real, confere nome e assinatura do arquivo e falha se a aplicação chamar a impressão ou abrir um popup. A repetição do download com popup bloqueado também passou.

Um download adicional foi realizado no navegador integrado, utilizando a API e o banco locais de demonstração. O arquivo foi salvo em Downloads e renderizado para conferência visual. Não foram realizados testes em aparelho Android/iOS nesta correção.

Os itens 9 e 17 do registro abaixo descrevem a execução anterior, de 26/11. Foram substituídos na suíte atual pelo download direto e pelo novo download com popup bloqueado. `RELATORIO_API_URL` permite definir a origem da API a interceptar, cujo padrão continua sendo `http://127.0.0.1:39099`. Nenhuma requisição dessa origem é enviada ao backend durante a suíte de interface.

## Registro da verificação de 26/11/2026

Integração com a homolog frontend 56f4141 e backend 187f0bf. Alterações limitadas ao relatório e seus testes. Dados de testes fictícios; nenhum teste escreve em produção.

## Comandos básicos

```powershell
npm ci --ignore-scripts
npm run typecheck
npm run lint
node --test tests/*.test.cjs
```

Resultado: 47 testes aprovados, sendo 19 de funções do relatório e 14 de exportação. Os demais são regressões existentes. A instalação utiliza o lockfile atualizado pela equipe, sem alteração de dependências nesta revisão.

## Exportação e serialização

`relatorio-individual.test.cjs` verifica filtros de mês/ano, fim exclusivo, virada de ano, fevereiro bissexto, horas, ausência de duração, vínculos sem reuniões, compatibilidade com API anterior, HTML escapado, CSV com 19 colunas, acentos, separadores, aspas, quebras de linha e proteção de fórmulas. Identifica saída automática sem mudar os minutos calculados no servidor.

`exportacao-relatorio.test.cjs` carrega o serviço TypeScript com dependências simuladas. Verifica a URI original do PDF, a ausência de move, diferenças entre Expo Go e binário próprio, Android/iOS simulados, compartilhamento indisponível, falha de logo/impressão/compartilhamento e escrita CSV pendente ou rejeitada. Não executa o sistema operacional do celular.

## Interface web isolada

Requer Playwright em uma instalação de ferramentas separada e Edge/Chromium. Não adiciona dependência ao aplicativo. Configure `PLAYWRIGHT_MODULE` com o caminho absoluto do módulo Playwright ou disponibilize `playwright` na resolução do Node. `CHROME_PATH` permite escolher outro executável Chromium.

Inicie o app em terminal separado:

```powershell
$env:EXPO_PUBLIC_API_URL='http://127.0.0.1:39099'
$env:EXPO_PUBLIC_API_ACCESS_TOKEN='chave-ficticia-qa'
$env:EXPO_NO_DOTENV='1'
npx expo start --web --port 8091
```

Execute:

```powershell
node tests/relatorio-browser.e2e.cjs
```

O teste intercepta a API fictícia; não é necessário servidor em 39099. Não use esse ambiente de QA para validar credenciais reais. `RELATORIO_URL` altera a URL do app; `RELATORIO_QA_DIR` altera a pasta de evidências, cujo padrão é a pasta temporária do sistema.

21 cenários aprovados:

1. Histórico, vínculos e papéis visíveis.
2. Saída automática e duração ausente identificadas.
3. Layout de 320 px sem rolagem horizontal.
4. Layout de 360 px sem rolagem horizontal.
5. Layout de 390 px sem rolagem horizontal.
6. Layout de 768 px sem rolagem horizontal.
7. Layout de 1440 px sem rolagem horizontal.
8. Download CSV com vínculos, acentos, BOM e origem da saída.
9. Janela própria para PDF com logo e vínculos; geração A4 pelo motor do navegador.
10. Falha de rede com nova tentativa.
11. Erro 500 não conserva resultado anterior como atualizado.
12. Usuário sem reuniões pode exportar vínculos.
13. API anterior sem vínculos mostra aviso.
14. Nomes extensos em 320 px.
15. Filtros enviam limites corretos.
16. Resposta antiga de filtro lento não substitui a consulta atual.
17. Popup bloqueado mostra orientação e libera botão.
18. Navegação por Tab alcança Exportar CSV.
19. Tema escuro conserva dados e ações.
20. Ampliação de fonte na web mantém título legível e largura do relatório.
21. Resposta 401 encerra sessão e remove relatório da tela.

O arquivo resultados.json registra também pendências; não omiti-las ao apresentar os cenários aprovados. A suíte não substitui uma pesquisa de usabilidade com participantes reais.

## Backend e integração

Na homolog do backend: `npm run build`, `npm run lint` e `npm test` aprovados; suíte existente com 215 testes em 15 arquivos. A integração adicional é `test/relatorio-individual-mongo.mjs`, executada após build com MongoDB temporário 8.0.16. Usa banco com nome aleatório `conecta_teste_relatorio_*`, dados fictícios e exclusão apenas desse banco ao concluir. Configure `TEST_MONGO_PORT` para uma instância de teste local (padrão 27019).

```powershell
$env:TEST_MONGO_PORT='27019'
node test/relatorio-individual-mongo.mjs
```

Cobre API key/JWT, conta inativa/inexistente, papel administrativo recusado, isolamento de titular, tentativa de trocar usuario_id, confirmação do mesmo participante, datas inválidas e limites, duração ausente/invertida/futura, saída automática, vínculos aprovados/pendentes/revogados, comissão inativa, referências legadas, vínculos sem reuniões, histórico após revogação e 12 requisições concorrentes entre duas contas.

## Achados e limites

- Corrigido no relatório: título cortado em tela pequena; saída automática sem identificação; PDF sem mover arquivo; CSV aguardando a escrita; vínculos atuais em tela e exportações, inclusive sem histórico.
- Pendente em componente compartilhado: ControleSegmentado não expõe aria-checked na web instalada, embora use accessibilityState.checked. O teste de teclado passa; a pendência semântica é registrada separadamente.
- Navegação inferior compartilhada pode truncar rótulos com fonte ampliada. Não foi alterada nesta entrega exclusiva do relatório.
- O utilitário entregarPdf ainda usa File.move para outros módulos. Esta entrega não corrige atas ou votações.
- npm audit: 10 avisos herdados (8 moderados, 1 alto, 1 crítico). Avisos não comprovam exploração; exigem análise da equipe. Sem npm audit fix --force nesta revisão.
- Pendente no aparelho: Android/iOS, Expo Go/binário, salvar PDF/CSV, cancelar compartilhamento e navegar durante exportação. Testes de mocks não homologam permissões nativas.
- Sem teste de carga de grande histórico, leitor de tela ou prova de funcionamento totalmente offline. A rota ainda não tem paginação.

Versões: Node 24.14.0, npm 11.14.1, Expo 58.0.26, React 19.3.0, React Native 0.88.1, TypeScript 6.0.3, expo-print 58.0.9, expo-file-system 58.0.14, expo-sharing 58.0.23 e expo-asset 58.0.21.
