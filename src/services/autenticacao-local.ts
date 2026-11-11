import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

// Falso na web e em aparelhos sem biometria, PIN ou senha de bloqueio.
export async function dispositivoProtegido() {
  if (Platform.OS === 'web') return false;
  const nivel = await LocalAuthentication.getEnrolledLevelAsync().catch(() => LocalAuthentication.SecurityLevel.NONE);
  return nivel !== LocalAuthentication.SecurityLevel.NONE;
}

export async function autenticarComDispositivo() {
  if (!(await dispositivoProtegido())) return true;

  // Sem texto nosso: o aparelho mostra o próprio pedido de biometria ou PIN, no idioma dele.
  // O título vai com um espaço porque o androidx.biometric recusa título vazio.
  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: ' ',
    disableDeviceFallback: false,
    requireConfirmation: true,
  });

  return resultado.success;
}
