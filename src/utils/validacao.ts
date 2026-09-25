/** Validações dos formulários: devolvem a mensagem do campo ou null quando válido. */

const EXPRESSAO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const TAMANHO_MINIMO_SENHA = 8;
export const TAMANHO_MAXIMO_DESCRICAO = 200;

export function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validarNome(nome: string) {
  const valor = nome.trim();
  if (valor.length === 0) return 'Informe o seu nome.';
  if (valor.length < 3) return 'O nome deve ter ao menos 3 caracteres.';
  return null;
}

export function validarEmail(email: string) {
  const valor = email.trim();
  if (valor.length === 0) return 'Informe o seu e-mail.';
  if (!EXPRESSAO_EMAIL.test(valor)) return 'Informe um e-mail válido, como nome@dominio.com.';
  return null;
}

export function validarSenha(senha: string) {
  if (senha.length === 0) return 'Informe a sua senha.';
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    return `A senha deve ter ao menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
  }
  return null;
}

export function validarConfirmacaoSenha(senha: string, confirmacao: string) {
  if (confirmacao.length === 0) return 'Confirme a sua senha.';
  if (senha !== confirmacao) return 'As senhas não coincidem.';
  return null;
}

export function validarNomeOrganizacao(nome: string) {
  const valor = nome.trim();
  if (valor.length === 0) return 'Informe o nome da organização.';
  if (valor.length < 2) return 'O nome deve ter ao menos 2 caracteres.';
  return null;
}

export function validarDescricao(descricao: string) {
  if (descricao.trim().length > TAMANHO_MAXIMO_DESCRICAO) {
    return `A descrição deve ter no máximo ${TAMANHO_MAXIMO_DESCRICAO} caracteres.`;
  }
  return null;
}
