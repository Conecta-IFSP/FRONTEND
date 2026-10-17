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

export function validarNomeComissao(nome: string) {
  if (nome.trim().length < 2) return 'Informe um nome com pelo menos 2 caracteres.';
  return null;
}

export function validarTituloReuniao(titulo: string) {
  if (titulo.trim().length < 3) return 'Informe um título com pelo menos 3 caracteres.';
  return null;
}

export function validarLocal(local: string) {
  if (local.trim().length < 2) return 'Informe o local da reunião.';
  return null;
}

export function minutosDaHora(texto: string) {
  const partes = /^(\d{2}):(\d{2})$/.exec(texto);
  if (!partes) return null;
  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  return horas > 23 || minutos > 59 ? null : horas * 60 + minutos;
}

export function mascararHora(texto: string) {
  const digitos = texto.replace(/\D/g, '').slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos;
}

export function validarHora(texto: string) {
  if (texto.length === 0) return 'Informe o horário.';
  if (minutosDaHora(texto) === null) return 'Horário inválido.';
  return null;
}

export function validarTermino(inicio: string, fim: string) {
  const erro = validarHora(fim);
  if (erro) return erro;
  const minutosInicio = minutosDaHora(inicio);
  if (minutosInicio !== null && (minutosDaHora(fim) ?? 0) <= minutosInicio) {
    return 'O término deve ser depois do início.';
  }
  return null;
}

export function validarDescricao(descricao: string) {
  if (descricao.trim().length > TAMANHO_MAXIMO_DESCRICAO) {
    return `A descrição deve ter no máximo ${TAMANHO_MAXIMO_DESCRICAO} caracteres.`;
  }
  return null;
}
