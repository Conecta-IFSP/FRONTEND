/** Temas, icones e fontes do aplicativo. O tema em uso vem de `useTema` (contexts/TemaContext). */

export const MARCA = {
  azul: '#256EF1',
  azulVivo: '#1A3FF9',
  indigo: '#363AC5',
  violeta: '#544CEE',
  violetaClaro: '#5E46E8',
  roxo: '#8436DD',
  marinho: '#1E2080',
  branco: '#FFFFFF',
  preto: '#000000',
} as const;

export const LOGOS = {
  simbolo: require('@/assets/images/icone-conecta-mais.png'),
  completo: require('@/assets/images/logo-titulo.png'),
} as const;

export const FONTES = {
  titulo: 'Poppins_600SemiBold',
  corpoMedio: 'Poppins_500Medium',
  corpo: 'Poppins_400Regular',
} as const;

export const TIPOGRAFIA = {
  titulo: { fontFamily: FONTES.titulo, fontSize: 24, lineHeight: 32 },
  subtitulo: { fontFamily: FONTES.titulo, fontSize: 18, lineHeight: 26 },
  corpo: { fontFamily: FONTES.corpo, fontSize: 16, lineHeight: 24 },
  corpoPequeno: { fontFamily: FONTES.corpo, fontSize: 14, lineHeight: 20 },
  rotulo: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
  botao: { fontFamily: FONTES.corpoMedio, fontSize: 16, lineHeight: 22 },
  legenda: { fontFamily: FONTES.corpo, fontSize: 12, lineHeight: 16 },
} as const;

export const ESPACO = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const RAIO = { sm: 8, md: 12, lg: 16, xl: 24, circulo: 999 } as const;

export type Cores = {
  fundo: string;
  superficie: string;
  superficieSuave: string;
  borda: string;
  bordaSuave: string;
  texto: string;
  textoSuave: string;
  textoSutil: string;
  textoSobrePrimaria: string;
  primaria: string;
  primariaPressionada: string;
  primariaSuave: string;
  secundaria: string;
  secundariaSuave: string;
  erro: string;
  erroSuave: string;
  sucesso: string;
  sucessoSuave: string;
  alerta: string;
  alertaSuave: string;
  campoFundo: string;
  campoBorda: string;
  campoBordaFoco: string;
  placeholder: string;
  desabilitado: string;
  desabilitadoTexto: string;
  sobreposicao: string;
};

export type Tema = {
  nome: 'claro' | 'escuro';
  escuro: boolean;
  cores: Cores;
  gradiente: readonly [string, string];
  sombra: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  };
};

export const TEMA_CLARO: Tema = {
  nome: 'claro',
  escuro: false,
  cores: {
    fundo: '#F9F9F9',
    superficie: MARCA.branco,
    superficieSuave: '#F0F3FA',
    borda: '#DDE3EF',
    bordaSuave: '#ECEFF6',
    texto: '#18243C',
    textoSuave: '#4E5A78',
    textoSutil: '#636E88',
    textoSobrePrimaria: MARCA.branco,
    primaria: MARCA.azul,
    primariaPressionada: '#1B55C4',
    primariaSuave: '#E7F0FE',
    secundaria: MARCA.roxo,
    secundariaSuave: '#F4E9FC',
    erro: '#C0261C',
    erroSuave: '#FDECEA',
    sucesso: '#0A6E3F',
    sucessoSuave: '#E6F6EE',
    alerta: '#8A4B00',
    alertaSuave: '#FDF3E4',
    campoFundo: MARCA.branco,
    campoBorda: '#D3DAE8',
    campoBordaFoco: MARCA.azul,
    placeholder: '#6B7590',
    desabilitado: '#EDF0F5',
    desabilitadoTexto: '#7F8AA0',
    sobreposicao: 'rgba(24, 36, 60, 0.45)',
  },
  gradiente: [MARCA.azul, MARCA.roxo],
  sombra: {
    shadowColor: '#18243C',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};

export const TEMA_ESCURO: Tema = {
  nome: 'escuro',
  escuro: true,
  cores: {
    fundo: '#0A0F22',
    superficie: '#141B33',
    superficieSuave: '#1D2546',
    borda: '#2B3558',
    bordaSuave: '#222B4A',
    texto: '#F4F6FC',
    textoSuave: '#AFB9D4',
    textoSutil: '#8892AE',
    textoSobrePrimaria: '#0A0F22',
    primaria: '#4B86F7',
    primariaPressionada: '#6E9EF9',
    primariaSuave: '#17264A',
    secundaria: '#A96BE8',
    secundariaSuave: '#2A1B45',
    erro: '#F98A80',
    erroSuave: '#3A1A1A',
    sucesso: '#5FD79B',
    sucessoSuave: '#10301F',
    alerta: '#FDB022',
    alertaSuave: '#3A2A10',
    campoFundo: '#141B33',
    campoBorda: '#303A5E',
    campoBordaFoco: '#4B86F7',
    placeholder: '#8892AE',
    desabilitado: '#1B2340',
    desabilitadoTexto: '#6C7897',
    sobreposicao: 'rgba(3, 6, 18, 0.65)',
  },
  gradiente: [MARCA.azulVivo, MARCA.roxo],
  sombra: {
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
};

export const TEMAS = { claro: TEMA_CLARO, escuro: TEMA_ESCURO } as const;
