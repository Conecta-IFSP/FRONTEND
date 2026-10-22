import * as LocalAuthentication from 'expo-local-authentication';

export async function autenticarComDispositivo() {
  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirme sua identidade',
    promptDescription: 'Use Face ID, impressão digital ou a senha do dispositivo.',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
    requireConfirmation: true,
  });

  return resultado.success;
}
