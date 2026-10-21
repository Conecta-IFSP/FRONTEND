import * as AuthSession from 'expo-auth-session';
import { api } from './api';
import { Platform } from 'react-native';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;
const API_URL = process.env.EXPO_PUBLIC_API_URL!;
const MOBILE_REDIRECT_URI =
  process.env.EXPO_PUBLIC_GOOGLE_MOBILE_REDIRECT_URI ??
  'https://conecta-ifsp.github.io/FRONTEND/auth/callback.html';

// Mobile: página pública → deep link conectamais://
function getMobileRedirectUri(): string {
  return MOBILE_REDIRECT_URI;
}

// Web: Google → página pública de callback → rota web do Expo
function getWebRedirectUri(): string {
  return 'https://conecta-ifsp.github.io/FRONTEND/auth/callback.html';
}

// Web callback page: DEVE ser IDÊNTICO ao redirect_uri enviado na autorização
export function getWebCallbackRedirectUri(): string {
  return getWebRedirectUri();
}

export function getGoogleRedirectUri(): string {
  return Platform.OS === 'web' ? getWebRedirectUri() : getMobileRedirectUri();
}

export function getAppDeepLink(): string {
  return AuthSession.makeRedirectUri({
    scheme: 'conectamais',
    path: 'auth/google',
    preferLocalhost: true,
  });
}

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export { discovery, CLIENT_ID };

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  if (!redirectUri || !redirectUri.trim()) {
    throw new Error('redirectUri should not be empty');
  }
  const res = await api<{ access_token: string; usuario: any }>(
    '/auth/google',
    'POST',
    // O DTO do backend usa camelCase. O redirect_uri precisa ser exatamente
    // o mesmo valor usado na autorização inicial.
    { code, redirectUri }
  );
  return res;
}
