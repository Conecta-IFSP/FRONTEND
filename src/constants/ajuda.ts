import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

/**
 * Conteúdo da tela Ajuda (src/app/ajuda.tsx).
 *
 * A tela apenas lê TOPICOS_AJUDA e renderiza, na ordem do array. Para incluir
 * conteúdo novo, basta acrescentar objetos aqui; nenhum componente precisa mudar.
 *
 * - `id` do tópico: usado no link /ajuda?topico=<id>, que rola até o tópico e
 *   abre a primeira pergunta dele. Use letras minúsculas, sem acento nem espaço.
 * - `id` da pergunta: precisa ser único no arquivo inteiro.
 * - `perfil`: 'responsavel' mostra o selo "Responsável" na pergunta;
 *   'todos' vale para qualquer pessoa.
 * - `resposta`: um texto, ou uma lista de passos curtos (vira lista numerada).
 *
 * TÓPICOS FUTUROS: quando cada funcionalidade estiver disponível no app,
 * acrescente o tópico no ponto marcado no fim de TOPICOS_AJUDA:
 * - Votação: { id: 'votacao', titulo: 'Votação', icone: 'checkbox-outline', perguntas: [...] }
 * - Relatório individual: { id: 'relatorio', titulo: 'Relatório individual', icone: 'bar-chart-outline', perguntas: [...] }
 * - Reprovação da ata: acrescente as perguntas no tópico 'ata' (não crie outro tópico).
 * Descreva só o que o app realmente faz, com os nomes de botões e telas que aparecem para o usuário.
 */

export type PerfilAjuda = 'responsavel' | 'todos';

export type PerguntaAjuda = {
  id: string;
  pergunta: string;
  resposta: string | readonly string[];
  perfil: PerfilAjuda;
};

export type TopicoAjuda = {
  id: string;
  titulo: string;
  icone?: IoniconsIconName;
  perguntas: readonly PerguntaAjuda[];
};

/** Texto do selo exibido nas perguntas com perfil 'responsavel'. */
export const SELO_PERFIL: Record<PerfilAjuda, string | null> = {
  responsavel: 'Responsável',
  todos: null,
};

// TODO: informar a URL pública do manual completo em PDF. Enquanto estiver
// vazia, o botão "Ver manual completo (PDF)" não aparece na tela Ajuda.
export const URL_MANUAL_PDF = '';

export const TOPICOS_AJUDA: readonly TopicoAjuda[] = [
  {
    id: 'conta',
    titulo: 'Conta e acesso',
    icone: 'person-circle-outline',
    perguntas: [
      {
        id: 'conta-entrar',
        perfil: 'todos',
        pergunta: 'Como faço para criar uma conta e entrar no app?',
        resposta: [
          'Na tela Entrar, toque em Criar conta e informe nome, e-mail e senha.',
          'Digite o código enviado para o seu e-mail na tela Confirmar e-mail e toque em Continuar.',
          'Nas próximas vezes, informe e-mail e senha e toque em Entrar, ou use Continuar com Google.',
        ],
      },
      {
        id: 'conta-esqueci-senha',
        perfil: 'todos',
        pergunta: 'Esqueci minha senha. O que faço?',
        resposta: [
          'Na tela Entrar, toque em Esqueci minha senha.',
          'Informe seu e-mail e toque em Enviar código.',
          'Digite o código de 7 caracteres recebido por e-mail e toque em Continuar.',
          'Crie a nova senha e toque em Salvar senha.',
        ],
      },
      {
        id: 'conta-email-senha',
        perfil: 'todos',
        pergunta: 'Como altero meu nome, e-mail ou senha?',
        resposta:
          'Toque na sua foto no canto superior direito para abrir o Perfil. Altere o nome e toque em Salvar, ou toque em E-mail ou Senha na seção Conta. O app pode pedir a biometria ou a senha do aparelho antes de abrir essas telas. Para trocar o e-mail, um código de confirmação é enviado ao novo endereço. Se você entrou com o Google e nunca criou senha, use Esqueci minha senha na tela Entrar para definir uma.',
      },
      {
        id: 'conta-tema-sair',
        perfil: 'todos',
        pergunta: 'Como mudo o tema ou saio da conta?',
        resposta:
          'No Perfil, escolha o tema em Tema: Sistema acompanha a configuração do aparelho, Claro e Escuro fixam a aparência. Para sair, toque em Sair da conta, no fim da tela.',
      },
    ],
  },
  {
    id: 'organizacoes',
    titulo: 'Organizações e comissões',
    icone: 'business-outline',
    perguntas: [
      {
        id: 'organizacoes-participar',
        perfil: 'todos',
        pergunta: 'Como passo a participar de uma organização?',
        resposta:
          'Na aba Organizações, toque no botão + e escolha Entrar com código. Informe o código fornecido pelo administrador da organização e toque em Enviar pedido; seu acesso fica aguardando a autorização dele. Se você foi convidado pelo e-mail, o convite aparece em Convites; toque em Aceitar.',
      },
      {
        id: 'organizacoes-criar',
        perfil: 'todos',
        pergunta: 'Como cadastro uma nova organização?',
        resposta:
          'Na aba Organizações, toque no botão + e escolha Criar organização. Preencha nome, cidade e, se quiser, uma descrição, e toque em Enviar solicitação. A organização fica aguardando autorização do sistema antes de poder ser usada.',
      },
      {
        id: 'organizacoes-comissao',
        perfil: 'todos',
        pergunta: 'O que é uma comissão?',
        resposta:
          'Comissão é um grupo de pessoas de uma organização que se reúne para tratar de um assunto. O administrador da organização a cria na aba Comissões, pelo botão Nova comissão, e escolhe quem será o Responsável. Para ver as suas, abra a organização na aba Organizações.',
      },
      {
        id: 'organizacoes-papeis',
        perfil: 'todos',
        pergunta: 'Qual a diferença entre Responsável e Membro?',
        resposta:
          'Cada comissão tem um único Responsável, que agenda as reuniões, confirma as presenças e escreve a ata. Os demais integrantes aparecem como Membro: recebem os convites, marcam presença e aprovam a ata. O papel de cada pessoa aparece na aba Equipe da comissão.',
      },
    ],
  },
  {
    id: 'reunioes',
    titulo: 'Reuniões',
    icone: 'calendar-outline',
    perguntas: [
      {
        id: 'reunioes-agendar',
        perfil: 'responsavel',
        pergunta: 'Como agendo uma reunião e convido as pessoas?',
        resposta: [
          'Abra a organização, toque na comissão e use o botão Nova reunião; ele também aparece na aba Agenda.',
          'Informe título, data, início e término (ou marque Dia inteiro); local, pauta e anexos são opcionais.',
          'Em Convidados, escolha as pessoas ou Toda a comissão e toque em Concluir.',
          'Toque em Agendar reunião; os convidados passam a vê-la na Agenda.',
        ],
      },
      {
        id: 'reunioes-convite',
        perfil: 'todos',
        pergunta: 'Como respondo ao convite para uma reunião?',
        resposta:
          'Os convites aparecem na tela Início, em Convites, e também na própria reunião. Toque em Aceitar ou Recusar. Se a data ou o horário forem alterados, o app pede que você confirme novamente.',
      },
      {
        id: 'reunioes-presenca',
        perfil: 'todos',
        pergunta: 'Como registro minha presença?',
        resposta:
          'Durante o horário da reunião, abra-a e toque em Marcar entrada; ao sair, toque em Marcar saída. Sua entrada fica como Aguardando confirmação até que o Responsável a confirme.',
      },
      {
        id: 'reunioes-confirmar-presenca',
        perfil: 'responsavel',
        pergunta: 'Como confirmo as presenças e compartilho a lista?',
        resposta:
          'Na aba Presença da reunião, confirme ou recuse cada pessoa em Aguardando confirmação; quem não marcou entrada pode ser registrado com Marcar presente. Depois do término, toque no cartão Ata, abra a aba Presença e toque em Compartilhar para enviar a lista.',
      },
    ],
  },
  {
    id: 'ata',
    titulo: 'Ata',
    icone: 'document-text-outline',
    perguntas: [
      {
        id: 'ata-escrever',
        perfil: 'responsavel',
        pergunta: 'Como escrevo a ata da reunião?',
        resposta:
          'Somente o Responsável escreve a ata, e apenas depois que a reunião termina. Abra a reunião, toque no cartão Ata, escreva o texto na aba Ata e toque em Salvar. Enquanto for Rascunho, você pode alterar e salvar quantas vezes precisar.',
      },
      {
        id: 'ata-enviar',
        perfil: 'responsavel',
        pergunta: 'Como envio a ata para aprovação?',
        resposta: [
          'Com o rascunho salvo, toque em Enviar.',
          'Escolha o Prazo para responder (24 horas, 3 dias ou 7 dias) e toque em Enviar novamente.',
          'Depois de enviada, a ata não pode mais ser alterada. Ela é aprovada por quem teve a presença confirmada; se você esteve presente, sua aprovação já é contada.',
        ],
      },
      {
        id: 'ata-aprovar',
        perfil: 'todos',
        pergunta: 'Como aprovo uma ata?',
        resposta:
          'As atas que aguardam sua resposta aparecem na tela Início, em Atas. Abra a ata, leia o texto e toque em Aprovar; o app pode pedir a biometria ou a senha do aparelho. Somente quem teve a presença confirmada na reunião aprova, uma única vez.',
      },
      {
        id: 'ata-aprovada',
        perfil: 'todos',
        pergunta: 'O que acontece quando todos aprovam?',
        resposta:
          'Quando todos os presentes aprovam, a ata passa para Aprovada e recebe um número, como Ata nº 1/2026. A partir daí, qualquer participante pode tocar em PDF da ata para gerar e compartilhar o documento.',
      },
    ],
  },
  // Novos tópicos (Votação, Relatório individual) entram aqui, seguindo o mesmo formato.
];
