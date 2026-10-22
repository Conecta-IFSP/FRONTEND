import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export async function autenticarComDispositivo() {
  if (Platform.OS === 'web') return true;
  const nivel = await LocalAuthentication.getEnrolledLevelAsync().catch(() => LocalAuthentication.SecurityLevel.NONE);
  if (nivel === LocalAuthentication.SecurityLevel.NONE) return true;

  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirme sua identidade',
    promptDescription: 'Use Face ID, impressão digital ou a senha do dispositivo.',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
    requireConfirmation: true,
  });

  return resultado.success;
}
