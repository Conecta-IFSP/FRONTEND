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
 * PADRÃO DE ESCRITA
 * - "Como fazer": lista de passos, no máximo 4, uma ação curta por passo.
 * - "O que é" / "O que acontece": texto com no máximo 2 frases curtas.
 * - Cerca de 5 linhas na tela, no máximo; se passar, divida em duas perguntas.
 * - No máximo 5 perguntas por tópico.
 *
 * TÓPICOS FUTUROS: quando cada funcionalidade estiver disponível no app,
 * acrescente o tópico no ponto marcado no fim de TOPICOS_AJUDA:
 * - Votação: { id: 'votacao', titulo: 'Votação', icone: 'checkbox-outline', perguntas: [...] }
 * - Relatório individual: { id: 'relatorio', titulo: 'Relatório individual', icone: 'bar-chart-outline', perguntas: [...] }
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
        pergunta: 'Como crio uma conta?',
        resposta: [
          'Na tela Entrar, toque em Criar conta.',
          'Preencha nome, e-mail e senha.',
          'Toque em Criar conta.',
          'Digite o código enviado ao seu e-mail.',
        ],
      },
      {
        id: 'conta-esqueci-senha',
        perfil: 'todos',
        pergunta: 'Esqueci minha senha. O que faço?',
        resposta: [
          'Na tela Entrar, toque em Esqueci minha senha.',
          'Informe seu e-mail.',
          'Digite o código recebido.',
          'Crie a nova senha.',
        ],
      },
      {
        id: 'conta-email-senha',
        perfil: 'todos',
        pergunta: 'Como altero meu nome, e-mail ou senha?',
        resposta: [
          'Toque no seu avatar, no topo da tela.',
          'Em Conta, toque em Nome, E-mail ou Senha.',
          'Confirme a biometria, se solicitada.',
          'Siga as instruções da tela.',
        ],
      },
      {
        id: 'conta-google-senha',
        perfil: 'todos',
        pergunta: 'Entrei com o Google. Posso criar uma senha?',
        resposta: 'Sim. Na tela Entrar, toque em Esqueci minha senha e siga os passos para definir sua senha.',
      },
      {
        id: 'conta-tema-sair',
        perfil: 'todos',
        pergunta: 'Como mudo o tema ou saio da conta?',
        resposta: [
          'Toque no seu avatar, no topo da tela.',
          'Em Tema, escolha Sistema, Claro ou Escuro.',
          'Para sair, toque em Sair da conta.',
          'Toque em Sair para confirmar.',
        ],
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
        pergunta: 'Como entro em uma organização?',
        resposta: [
          'Na aba Organizações, toque em +.',
          'Toque em Entrar com código.',
          'Digite o código do administrador.',
          'Toque em Enviar pedido.',
        ],
      },
      {
        id: 'organizacoes-convite',
        perfil: 'todos',
        pergunta: 'Recebi um convite. Como aceito?',
        resposta: ['Abra a aba Organizações.', 'Encontre o convite em Convites.', 'Toque em Aceitar.'],
      },
      {
        id: 'organizacoes-criar',
        perfil: 'todos',
        pergunta: 'Como cadastro uma nova organização?',
        resposta: [
          'Na aba Organizações, toque em +.',
          'Toque em Criar organização.',
          'Preencha nome e cidade.',
          'Toque em Enviar solicitação.',
        ],
      },
      {
        id: 'organizacoes-comissao',
        perfil: 'todos',
        pergunta: 'O que é uma comissão?',
        resposta:
          'É um grupo de pessoas de uma organização que se reúne para tratar de um assunto. O administrador da organização cria a comissão e escolhe o Responsável.',
      },
      {
        id: 'organizacoes-papeis',
        perfil: 'todos',
        pergunta: 'Qual a diferença entre Responsável e Membro?',
        resposta:
          'O Responsável agenda as reuniões, confirma as presenças e escreve a ata. O Membro responde aos convites, marca presença e aprova a ata.',
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
        pergunta: 'Como agendo uma reunião?',
        resposta: [
          'Na comissão, toque em Nova reunião.',
          'Preencha título, data e horário.',
          'Em Convidados, escolha quem participa.',
          'Toque em Agendar reunião.',
        ],
      },
      {
        id: 'reunioes-convite',
        perfil: 'todos',
        pergunta: 'Como respondo a um convite de reunião?',
        resposta: [
          'Na tela Início, vá até Convites.',
          'Toque em Aceitar ou Recusar.',
          'Se o horário mudar, responda de novo.',
        ],
      },
      {
        id: 'reunioes-presenca',
        perfil: 'todos',
        pergunta: 'Como registro minha presença?',
        resposta: [
          'Abra a reunião no horário marcado.',
          'Toque em Marcar entrada.',
          'Ao sair, toque em Marcar saída.',
          'Aguarde o Responsável confirmar.',
        ],
      },
      {
        id: 'reunioes-confirmar-presenca',
        perfil: 'responsavel',
        pergunta: 'Como confirmo as presenças?',
        resposta: [
          'Na reunião, abra a aba Presença.',
          'Em Aguardando confirmação, confirme ou recuse cada pessoa.',
          'Se alguém não marcou entrada, toque em Marcar presente.',
        ],
      },
      {
        id: 'reunioes-lista-presenca',
        perfil: 'todos',
        pergunta: 'Como compartilho a lista de presença?',
        resposta: [
          'Após o término, abra a reunião.',
          'Toque no cartão Ata.',
          'Abra a aba Presença.',
          'Toque em Compartilhar.',
        ],
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
        pergunta: 'Como escrevo e envio a ata?',
        resposta: [
          'Após o término, abra o cartão Ata.',
          'Escreva o texto e toque em Salvar.',
          'Toque em Enviar.',
          'Escolha o prazo e toque em Enviar.',
        ],
      },
      {
        id: 'ata-aprovar',
        perfil: 'todos',
        pergunta: 'Como aprovo uma ata?',
        resposta: [
          'Na tela Início, abra a ata em Atas.',
          'Leia o texto da ata.',
          'Toque em Aprovar.',
          'Confirme a biometria, se solicitada.',
        ],
      },
      {
        id: 'ata-reprovar',
        perfil: 'todos',
        pergunta: 'Como reprovo uma ata?',
        resposta: [
          'Na tela Início, abra a ata em Atas.',
          'Toque em Reprovar.',
          'Se quiser, escreva a justificativa.',
          'Toque em Reprovar ata.',
        ],
      },
      {
        id: 'ata-aprovada',
        perfil: 'todos',
        pergunta: 'O que acontece quando todos aprovam?',
        resposta:
          'A ata passa para Aprovada e recebe um número, como Ata nº 1/2026. Qualquer participante pode tocar em PDF da ata para compartilhá-la.',
      },
      {
        id: 'ata-reprovada',
        perfil: 'responsavel',
        pergunta: 'O que acontece quando uma ata é reprovada?',
        resposta:
          'A ata volta para você, e os demais não precisam mais responder. Toque em Corrigir em nova versão, ajuste o texto e envie de novo.',
      },
    ],
  },
  // Novos tópicos (Votação, Relatório individual) entram aqui, seguindo o mesmo formato.
];
