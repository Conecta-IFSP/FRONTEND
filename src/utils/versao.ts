import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Versão do app lida da configuração do Expo (app.json), nunca escrita à mão. */
export function versaoDoApp() {
  const config = Constants.expoConfig;
  const versao = config?.version ?? null;
  // Só aparece se `ios.buildNumber` / `android.versionCode` estiverem definidos no app.json.
  const build =
    Platform.OS === 'ios'
      ? config?.ios?.buildNumber
      : Platform.OS === 'android'
        ? config?.android?.versionCode?.toString()
        : undefined;
  return { versao, build: build ?? null };
}

/** Ex.: "Versão 1.0.0 (build 3)", ou "Versão 1.0.0" quando não há build definido. */
export function textoVersao() {
  const { versao, build } = versaoDoApp();
  if (!versao) return 'Versão indisponível';
  return build ? `Versão ${versao} (build ${build})` : `Versão ${versao}`;
}
