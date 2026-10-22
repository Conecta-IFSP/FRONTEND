import * as AuthSession from 'expo-auth-session';
import { api } from './api';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID!;
const API_URL = process.env.EXPO_PUBLIC_API_URL!;
const WEB_REDIRECT_URI =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_REDIRECT_URI ??
  `${API_URL}/auth/google/callback-web`;

export const CLIENT_ID =
  Platform.OS === 'ios'
    ? IOS_CLIENT_ID
    : Platform.OS === 'android'
      ? ANDROID_CLIENT_ID
      : WEB_CLIENT_ID;

// Mobile: página pública → deep link conectamais://
function getMobileRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: 'conectamais',
    path: 'auth/google',
  });
}

// Web: Google → página pública de callback → rota web do Expo
function getWebRedirectUri(): string {
  return WEB_REDIRECT_URI;
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

export { discovery };

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  if (!redirectUri || !redirectUri.trim()) {
    throw new Error('redirectUri should not be empty');
  }
  const res = await api<{ access_token: string; usuario: any }>(
    '/auth/google',
    'POST',
    // O DTO do backend usa camelCase. O redirect_uri precisa ser exatamente
    // o mesmo valor usado na autorização inicial.
    { code, redirectUri, plataforma: Platform.OS }
  );
  return res;
}

let nativeGoogleConfigured = false;

function estaNoExpoGo() {
  return Constants.executionEnvironment === 'storeClient';
}

function configureNativeGoogle(GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin) {
  if (Platform.OS === 'web' || nativeGoogleConfigured) return;

  GoogleSignin.configure({
    // Este é o cliente Web usado pelo backend para validar o ID Token.
    webClientId: WEB_CLIENT_ID,
    ...(Platform.OS === 'ios' && IOS_CLIENT_ID ? { iosClientId: IOS_CLIENT_ID } : {}),
  });
  nativeGoogleConfigured = true;
}

export async function signInWithGoogleNative() {
  if (estaNoExpoGo()) {
    throw new Error(
      'O login Google nativo não funciona no Expo Go. Abra o projeto com uma development build usando npx expo run:android.',
    );
  }

  const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
  configureNativeGoogle(GoogleSignin);

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    return { cancelled: true as const };
  }

  const { idToken } = await GoogleSignin.getTokens();
  if (!idToken) {
    throw new Error('O Google não retornou um ID Token.');
  }

  return { cancelled: false as const, idToken };
}

export async function loginComIdTokenGoogle(idToken: string) {
  return api<{ access_token: string; usuario: any }>(
    '/auth/google',
    'POST',
    { idToken, plataforma: Platform.OS },
  );
}
