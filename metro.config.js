const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Manual offline: o PDF e os arquivos do PDF.js (salvos como .txt) entram no bundle como
// assets, e não como código. Ver src/components/ManualPdf.tsx.
const extensoesExtras = ['pdf', 'txt'];
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  ...extensoesExtras.filter((extensao) => !config.resolver.assetExts.includes(extensao)),
];

module.exports = config;
