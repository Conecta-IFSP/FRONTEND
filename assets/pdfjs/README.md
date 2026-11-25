# PDF.js embutido (manual offline)

Arquivos copiados do pacote npm **pdfjs-dist 3.11.174** (build UMD "legacy", compatível
com o WebView do iOS e do Android):

| Arquivo aqui              | Origem no pacote                       |
| ------------------------- | -------------------------------------- |
| `pdf.min.js.txt`          | `legacy/build/pdf.min.js`              |
| `pdf.worker.min.js.txt`   | `legacy/build/pdf.worker.min.js`       |

A extensão `.txt` faz o Metro tratar os arquivos como assets (ver `metro.config.js`), e não
como módulos JS. O app não depende do pacote `pdfjs-dist`: ele foi instalado só para copiar
os arquivos e depois removido.

Para atualizar:

```sh
npm i -D pdfjs-dist@<versão>
cp node_modules/pdfjs-dist/legacy/build/pdf.min.js        assets/pdfjs/pdf.min.js.txt
cp node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js assets/pdfjs/pdf.worker.min.js.txt
npm un pdfjs-dist
```

A partir da versão 4, o pdfjs-dist só traz módulos ES (`.mjs`) e o componente
`src/components/ManualPdf.tsx` teria que ser adaptado.

Quem usa: `src/components/ManualPdf.tsx`, que mostra `assets/manual/manual.pdf`.
