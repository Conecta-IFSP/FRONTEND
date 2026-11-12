import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
const CHAVE = 'conecta_retorno_presenca';
export async function guardarRetornoPresenca(id: string, codigo: string) {
  if (!/^[a-f\d]{24}$/i.test(id) || !/^[a-f\d]{64}$/.test(codigo)) return;
  const valor = JSON.stringify({ id, codigo, expira: Date.now() + 30 * 60000 });
  if (Platform.OS === 'web') window.sessionStorage.setItem(CHAVE, valor);
  else await SecureStore.setItemAsync(CHAVE, valor);
}
export async function consumirRetornoPresenca() {
  const valor = Platform.OS === 'web' ? window.sessionStorage.getItem(CHAVE) : await SecureStore.getItemAsync(CHAVE);
  if (Platform.OS === 'web') window.sessionStorage.removeItem(CHAVE);
  else await SecureStore.deleteItemAsync(CHAVE);
  if (!valor) return null;
  try {
    const item = JSON.parse(valor);
    if (item.expira > Date.now() && /^[a-f\d]{24}$/i.test(item.id) && /^[a-f\d]{64}$/.test(item.codigo)) return { id: String(item.id), codigo: String(item.codigo) };
  } catch { /* Retorno inválido não interfere no login. */ }
  return null;
}
