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

  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirme sua identidade',
    promptDescription: 'Use Face ID, impressão digital ou a senha do dispositivo.',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
    requireConfirmation: true,
  });

  return resultado.success;
}
