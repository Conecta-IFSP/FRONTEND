/**
 * Dados exibidos na tela "Sobre o app" (src/app/sobre.tsx).
 *
 * Não invente valores: o que estiver vazio simplesmente não aparece na tela
 * (linha de link oculta, disciplina ou equipe omitidas).
 */

export const DESCRICAO_APP =
  'O Conecta+ reúne organizações, comissões e reuniões em um só lugar: agende encontros, registre a presença dos participantes e conduza a ata até a aprovação.';

export const PROJETO_ACADEMICO =
  'Desenvolvido por estudantes de Análise e Desenvolvimento de Sistemas do IFSP – Câmpus Barretos.';

// TODO: nome completo da disciplina (ex.: como aparece no plano de ensino).
export const DISCIPLINA = '';

// TODO: nomes da equipe, um por item, na ordem desejada.
export const EQUIPE: readonly string[] = [];

export const LINKS_SOBRE = {
  // TODO: URL pública da política de privacidade.
  politicaPrivacidade: '',
  // TODO: URL pública dos termos de uso.
  termosUso: '',
  // TODO: URL da lista de licenças de código aberto (ex.: arquivo no repositório).
  licencas: '',
  codigoFonte: 'https://github.com/Conecta-IFSP',
  // TODO: e-mail de contato/suporte da equipe (sem "mailto:").
  emailContato: '',
} as const;
