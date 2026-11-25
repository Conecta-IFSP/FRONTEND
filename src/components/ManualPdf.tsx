/**
 * Visualizador do manual do usuário (assets/manual/manual.pdf) que funciona offline,
 * no Expo Go e nos builds Android/iOS: não usa nenhuma lib nativa além do
 * react-native-webview (que já vem no Expo Go).
 *
 * Como funciona:
 * 1. O PDF e o PDF.js vão no bundle como assets (metro.config.js: 'pdf' e 'txt').
 * 2. Na primeira abertura, os três arquivos são lidos com expo-asset + expo-file-system e
 *    viram um único HTML com tudo inline (PDF em base64, PDF.js e o worker). O HTML fica
 *    em cache no módulo, então as próximas aberturas não releem os assets.
 * 3. Dentro da WebView, o PDF.js desenha cada página num único canvas reaproveitado,
 *    converte em <img> JPEG e passa para a próxima, para não estourar a memória do iPhone.
 *
 * PDF.js: pdfjs-dist 3.11.174, arquivos legacy/build/pdf.min.js e
 * legacy/build/pdf.worker.min.js (UMD), copiados para assets/pdfjs/ com extensão .txt.
 * O pacote foi removido depois da cópia. Detalhes e como atualizar: assets/pdfjs/README.md.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';

import { Botao } from '@/components/Botao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';

/* eslint-disable @typescript-eslint/no-require-imports */
const ASSET_PDF = require('../../assets/manual/manual.pdf');
const ASSET_PDFJS = require('../../assets/pdfjs/pdf.min.js.txt');
const ASSET_WORKER = require('../../assets/pdfjs/pdf.worker.min.js.txt');
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * false (padrão): passa o HTML direto para a WebView com source={{ html }}.
 * true: grava o HTML em Paths.cache e carrega por uri. Use se o Android mostrar tela
 * branca com o HTML grande (alguns WebViews têm limite para loadDataWithBaseURL).
 */
const CARREGAR_POR_ARQUIVO = false;

const MENSAGEM_ERRO =
  'Não foi possível abrir o manual. Tente de novo; se continuar, consulte as perguntas da Ajuda.';

type Conteudo = { html: string } | { uri: string };

type MensagemWebView =
  | { tipo: 'progresso'; pagina: number; total: number }
  | { tipo: 'pronto'; total: number }
  | { tipo: 'erro'; detalhe: string };

// Cache no nível do módulo: uma promessa por cor de fundo (tema claro/escuro).
const cacheConteudo = new Map<string, Promise<Conteudo>>();

async function lerAsset(modulo: number) {
  const asset = Asset.fromModule(modulo);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  return new File(uri);
}

/** Impede que um "</script" dentro do conteúdo feche a tag antes da hora. */
function escaparScript(codigo: string) {
  return codigo.replace(/<\/script/gi, '<\\/script');
}

function montarHtml(pdfBase64: string, pdfJs: string, worker: string, corFundo: string) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=4, user-scalable=yes">
<style>
  html, body { margin: 0; padding: 0; background: ${corFundo}; }
  #paginas { padding: 8px; display: flex; flex-direction: column; gap: 8px; }
  #paginas img { display: block; width: 100%; height: auto; background: #fff;
    border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
</style>
</head>
<body>
<div id="paginas"></div>
<script type="text/plain" id="pdf-worker">${escaparScript(worker)}</script>
<script>${escaparScript(pdfJs)}</script>
<script>
(function () {
  var PDF_BASE64 = "${pdfBase64}";

  function enviar(mensagem) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(mensagem));
  }
  var terminou = false;
  var vigia = null;
  function falhar(erro) {
    if (terminou) return;
    terminou = true;
    clearTimeout(vigia);
    enviar({ tipo: 'erro', detalhe: String((erro && (erro.message || erro)) || 'desconhecido') });
  }
  // Sem window.onerror fatal: erros soltos (ex.: o worker falhando antes do fallback) não
  // podem derrubar a tela. O que trava de verdade é pego por este tempo limite, renovado a
  // cada página.
  function renovarVigia() {
    clearTimeout(vigia);
    vigia = setTimeout(function () {
      // App em segundo plano congela a WebView: não conta como travamento.
      if (document.visibilityState === 'hidden') renovarVigia();
      else falhar('tempo esgotado ao abrir o manual');
    }, 30000);
  }
  document.addEventListener('visibilitychange', function () {
    if (!terminou && document.visibilityState === 'visible') renovarVigia();
  });

  var CODIGO_WORKER = document.getElementById('pdf-worker').textContent;

  function rodarWorkerNaThreadPrincipal() {
    // Define window.pdfjsWorker; o PDF.js passa a usar a thread principal (mais lento).
    if (window.pdfjsWorker) return;
    var script = document.createElement('script');
    script.textContent = CODIGO_WORKER;
    document.head.appendChild(script);
  }

  function criarWorker() {
    // Worker criado aqui mesmo a partir de um Blob e entregue ao PDF.js via workerPort.
    // (Com workerSrc, o PDF.js 3.x embrulha a URL em importScripts, o que falha quando a
    // página tem origem "null", como num HTML inline.)
    try {
      var url = URL.createObjectURL(new Blob([CODIGO_WORKER], { type: 'text/javascript' }));
      return new Worker(url);
    } catch (e) {
      return null;
    }
  }

  function esperarWorkerPronto(worker, ms) {
    // Ao carregar, o worker do PDF.js manda a mensagem "ready". Se ela não chegar a tempo
    // (WebView que bloqueia Worker por Blob), usamos a thread principal.
    return new Promise(function (resolver) {
      var tempo = setTimeout(function () { resolver(false); }, ms);
      worker.addEventListener('message', function () { clearTimeout(tempo); resolver(true); }, { once: true });
      worker.addEventListener('error', function () { clearTimeout(tempo); resolver(false); }, { once: true });
    });
  }

  async function abrirDocumento(bytes) {
    var worker = criarWorker();
    if (worker && (await esperarWorkerPronto(worker, 3000))) {
      pdfjsLib.GlobalWorkerOptions.workerPort = worker;
    } else {
      if (worker) worker.terminate();
      rodarWorkerNaThreadPrincipal();
    }
    return pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise;
  }

  function base64ParaBytes(base64) {
    var binario = atob(base64);
    var bytes = new Uint8Array(binario.length);
    for (var i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  }

  function canvasParaUrl(canvas) {
    return new Promise(function (resolver) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          resolver(blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/jpeg', 0.85));
        }, 'image/jpeg', 0.85);
      } else {
        resolver(canvas.toDataURL('image/jpeg', 0.85));
      }
    });
  }

  async function renderizar() {
    renovarVigia();
    var bytes = base64ParaBytes(PDF_BASE64);
    PDF_BASE64 = null;
    var documento = await abrirDocumento(bytes);
    bytes = null;

    var container = document.getElementById('paginas');
    var largura = container.clientWidth - 16;
    var densidade = Math.min(window.devicePixelRatio || 1, 2);
    var canvas = document.createElement('canvas');
    var contexto = canvas.getContext('2d');
    var total = documento.numPages;

    for (var numero = 1; numero <= total; numero++) {
      if (terminou) return;
      var pagina = await documento.getPage(numero);
      var escala = (largura * densidade) / pagina.getViewport({ scale: 1 }).width;
      var viewport = pagina.getViewport({ scale: escala });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      contexto.fillStyle = '#fff';
      contexto.fillRect(0, 0, canvas.width, canvas.height);
      await pagina.render({ canvasContext: contexto, viewport: viewport }).promise;

      var imagem = new Image();
      imagem.alt = 'Página ' + numero + ' de ' + total;
      imagem.style.aspectRatio = canvas.width + ' / ' + canvas.height;
      imagem.src = await canvasParaUrl(canvas);
      container.appendChild(imagem);
      pagina.cleanup();
      renovarVigia();
      enviar({ tipo: 'progresso', pagina: numero, total: total });
    }

    canvas.width = 0;
    canvas.height = 0;
    await documento.cleanup();
    if (terminou) return;
    terminou = true;
    clearTimeout(vigia);
    enviar({ tipo: 'pronto', total: total });
  }

  renderizar().catch(falhar);
})();
</script>
</body>
</html>`;
}

async function prepararConteudo(corFundo: string): Promise<Conteudo> {
  const [pdf, pdfJs, worker] = await Promise.all([
    lerAsset(ASSET_PDF),
    lerAsset(ASSET_PDFJS),
    lerAsset(ASSET_WORKER),
  ]);
  const [pdfBase64, codigoPdfJs, codigoWorker] = await Promise.all([
    pdf.base64(),
    pdfJs.text(),
    worker.text(),
  ]);
  const html = montarHtml(pdfBase64, codigoPdfJs, codigoWorker, corFundo);

  if (!CARREGAR_POR_ARQUIVO) return { html };

  const arquivo = new File(Paths.cache, `manual-conecta-${corFundo.replace(/\W/g, '')}.html`);
  arquivo.create({ overwrite: true });
  await arquivo.write(html);
  return { uri: arquivo.uri };
}

function obterConteudo(corFundo: string) {
  let promessa = cacheConteudo.get(corFundo);
  if (!promessa) {
    promessa = prepararConteudo(corFundo);
    // Se falhar, sai do cache para o "Tentar de novo" ler os assets outra vez.
    promessa.catch(() => cacheConteudo.delete(corFundo));
    cacheConteudo.set(corFundo, promessa);
  }
  return promessa;
}

type Estado =
  | { fase: 'preparando' }
  | { fase: 'renderizando'; pagina: number; total: number }
  | { fase: 'pronto' }
  | { fase: 'erro' };

export function ManualPdf() {
  const { cores } = useTema().tema;
  const [tentativa, definirTentativa] = useState(0);
  // A key remonta o visualizador do zero ao trocar o tema ou ao tentar de novo.
  return (
    <Visualizador
      key={`${cores.fundo}-${tentativa}`}
      aoTentarDeNovo={() => definirTentativa((valor) => valor + 1)}
    />
  );
}

function Visualizador({ aoTentarDeNovo }: { aoTentarDeNovo: () => void }) {
  const { cores } = useTema().tema;
  const [conteudo, definirConteudo] = useState<Conteudo | null>(null);
  const [estado, definirEstado] = useState<Estado>({ fase: 'preparando' });

  useEffect(() => {
    let ativo = true;
    obterConteudo(cores.fundo).then(
      (resultado) => {
        if (ativo) definirConteudo(resultado);
      },
      (erro: unknown) => {
        console.warn('[ManualPdf] falha ao preparar o manual', erro);
        if (ativo) definirEstado({ fase: 'erro' });
      },
    );
    return () => {
      ativo = false;
    };
  }, [cores.fundo]);

  const falhar = useCallback((detalhe: unknown) => {
    console.warn('[ManualPdf] falha ao exibir o manual', detalhe);
    definirEstado({ fase: 'erro' });
  }, []);

  const aoReceberMensagem = useCallback(
    (evento: WebViewMessageEvent) => {
      let mensagem: MensagemWebView;
      try {
        mensagem = JSON.parse(evento.nativeEvent.data) as MensagemWebView;
      } catch {
        return;
      }
      if (mensagem.tipo === 'progresso') {
        definirEstado({ fase: 'renderizando', pagina: mensagem.pagina, total: mensagem.total });
      } else if (mensagem.tipo === 'pronto') {
        definirEstado({ fase: 'pronto' });
      } else {
        falhar(mensagem.detalhe);
      }
    },
    [falhar],
  );

  if (estado.fase === 'erro') {
    return (
      <View style={styles.centro}>
        <EstadoVazio icone="document-text-outline" mensagem={MENSAGEM_ERRO} />
        <Botao
          titulo="Tentar de novo"
          icone="refresh"
          variante="secundario"
          pilula
          aoTocar={aoTentarDeNovo}
        />
      </View>
    );
  }

  const nenhumaPagina = !conteudo || estado.fase === 'preparando';
  const source = conteudo && 'uri' in conteudo ? { uri: conteudo.uri } : { html: conteudo?.html ?? '' };

  return (
    <View style={styles.tela}>
      {conteudo ? (
        <WebView
          source={source}
          originWhitelist={['*']}
          onMessage={aoReceberMensagem}
          onError={(evento) => falhar(evento.nativeEvent.description)}
          onContentProcessDidTerminate={() => falhar('processo da WebView encerrado (iOS)')}
          onRenderProcessGone={() => falhar('processo da WebView encerrado (Android)')}
          javaScriptEnabled
          scalesPageToFit
          setBuiltInZoomControls
          setDisplayZoomControls={false}
          setSupportMultipleWindows={false}
          allowFileAccess={CARREGAR_POR_ARQUIVO}
          allowingReadAccessToURL={CARREGAR_POR_ARQUIVO ? Paths.cache.uri : undefined}
          showsHorizontalScrollIndicator={false}
          style={[styles.tela, { backgroundColor: cores.fundo }]}
          containerStyle={{ backgroundColor: cores.fundo }}
        />
      ) : null}

      {nenhumaPagina ? (
        <View style={[StyleSheet.absoluteFill, styles.centro, { backgroundColor: cores.fundo }]}>
          <ActivityIndicator size="large" color={cores.primaria} accessibilityLabel="Abrindo o manual" />
          <Text style={[styles.textoCarregando, { color: cores.textoSuave }]}>Abrindo o manual…</Text>
        </View>
      ) : null}

      {estado.fase === 'renderizando' && estado.pagina < estado.total ? (
        <View
          pointerEvents="none"
          style={[styles.progresso, { backgroundColor: cores.superficie, borderColor: cores.borda }]}
          accessibilityLiveRegion="polite"
        >
          <ActivityIndicator size="small" color={cores.primaria} />
          <Text style={[styles.textoProgresso, { color: cores.texto }]}>
            Carregando página {estado.pagina + 1} de {estado.total}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: ESPACO.md,
    padding: ESPACO.lg,
  },
  textoCarregando: { ...TIPOGRAFIA.corpoPequeno },
  progresso: {
    position: 'absolute',
    bottom: ESPACO.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    paddingVertical: ESPACO.xs + 2,
    paddingHorizontal: ESPACO.md,
    borderRadius: RAIO.xl,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
      default: {},
    }),
  },
  textoProgresso: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
});
