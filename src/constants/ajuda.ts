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
 * - Cada tópico começa com "O que é…" ou equivalente, seguido de "Como…" e dúvidas comuns.
 * - "Como fazer": lista de passos, no máximo 4, uma ação curta por passo.
 * - "O que é" / "O que acontece": texto com no máximo 2 ou 3 frases curtas.
 * - Cerca de 5 linhas na tela, no máximo; se passar, divida em duas perguntas.
 * - No máximo 7 perguntas por tópico; se passar, crie um tópico novo.
 * - Descreva só o que o app realmente faz, com os nomes de botões e telas que
 *   aparecem para o usuário. Ao mudar uma regra no app, revise a resposta aqui.
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

// Manual completo em PDF, publicado como arquivo da Release "manual" do repositório
// DOCUMENTATION. Para atualizar, envie o novo PDF com o MESMO nome de arquivo:
//   gh release upload manual Manual-do-Usuario-Conecta.pdf --clobber -R Conecta-IFSP/DOCUMENTATION
// Assim o link não muda e não é preciso publicar uma nova versão do app.
// Se esta constante ficar vazia, o botão "Ver manual completo (PDF)" some da tela Ajuda.
export const URL_MANUAL_PDF =
  'https://github.com/Conecta-IFSP/DOCUMENTATION/releases/download/manual/Manual-do-Usuario-Conecta.pdf';

export const TOPICOS_AJUDA: readonly TopicoAjuda[] = [
  {
    id: 'conta',
    titulo: 'Conta e acesso',
    icone: 'person-circle-outline',
    perguntas: [
      {
        id: 'conta-esqueci-senha',
        perfil: 'todos',
        pergunta: 'Esqueci minha senha. O que faço?',
        resposta: [
          'Na tela Entrar, toque em Esqueci minha senha.',
          'Informe seu e-mail e toque em Enviar código.',
          'Digite o código recebido e toque em Continuar.',
          'Crie a nova senha e toque em Salvar senha.',
        ],
      },
      {
        id: 'conta-google-senha',
        perfil: 'todos',
        pergunta: 'Entrei com o Google. Posso criar uma senha?',
        resposta:
          'Sim. Na tela Entrar, toque em Esqueci minha senha e siga os passos. Depois disso você pode entrar tanto com o Google quanto com e-mail e senha.',
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
        id: 'conta-biometria',
        perfil: 'todos',
        pergunta: 'Por que o app pede minha biometria?',
        resposta:
          'Para confirmar que é você em ações importantes: marcar entrada e saída, enviar ou aprovar a ata, alterar e-mail ou senha e criar uma nova senha. Se o aparelho não tiver biometria, PIN ou senha de bloqueio, o app não pede a confirmação.',
      },
    ],
  },
  {
    id: 'organizacoes',
    titulo: 'Organizações e comissões',
    icone: 'business-outline',
    perguntas: [
      {
        id: 'organizacoes-o-que-e',
        perfil: 'todos',
        pergunta: 'O que é uma organização?',
        resposta:
          'É a instituição onde as comissões funcionam, como uma escola ou um câmpus. Uma organização nova só aparece para os outros depois de aprovada pelo administrador do sistema.',
      },
      {
        id: 'organizacoes-participar',
        perfil: 'todos',
        pergunta: 'Como entro em uma organização?',
        resposta: [
          'Peça o código de acesso a um administrador da organização.',
          'Na aba Organizações, toque em + e depois em Entrar com código.',
          'Digite o código e toque em Enviar pedido.',
          'Aguarde um administrador aprovar o seu pedido.',
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
          'Toque em Enviar solicitação e aguarde a aprovação.',
        ],
      },
      {
        id: 'organizacoes-comissao',
        perfil: 'todos',
        pergunta: 'O que é uma comissão?',
        resposta:
          'É um grupo de pessoas de uma organização que se reúne para tratar de um assunto. O administrador da organização cria a comissão, na aba Comissões, e escolhe o Responsável.',
      },
      {
        id: 'organizacoes-papeis',
        perfil: 'todos',
        pergunta: 'Qual a diferença entre Responsável e Membro?',
        resposta:
          'O Responsável preside a comissão: agenda as reuniões, confirma as presenças, abre as votações e escreve a ata. O Membro responde aos convites, marca presença, vota e aprova ou reprova a ata.',
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
          'Na comissão ou na Agenda, toque em Nova reunião.',
          'Preencha título, data e horário.',
          'Em Convidados, escolha quem participa.',
          'Toque em Agendar reunião.',
        ],
      },
      {
        id: 'reunioes-editar-cancelar',
        perfil: 'responsavel',
        pergunta: 'Como edito ou cancelo uma reunião?',
        resposta: [
          'Abra a reunião antes do término.',
          'Toque em Mais opções (⋮), no topo da tela.',
          'Toque em Editar reunião ou em Cancelar reunião.',
          'Se mudar a data ou o horário, os convidados precisam responder de novo.',
        ],
      },
      {
        id: 'reunioes-anexos',
        perfil: 'responsavel',
        pergunta: 'Como coloco a pauta e os anexos?',
        resposta:
          'Ao agendar ou editar a reunião, preencha Pauta e toque em Anexos. Na reunião, eles aparecem na aba Pauta. São aceitos PDF, imagens, textos e documentos do Office, até 10 arquivos de 10 MB.',
      },
      {
        id: 'reunioes-convite',
        perfil: 'todos',
        pergunta: 'Como respondo a um convite de reunião?',
        resposta: [
          'Na tela Início, toque em Convites, ou abra a reunião.',
          'Toque em Aceitar ou Recusar.',
          'Se o horário mudar, responda de novo.',
        ],
      },
      {
        id: 'reunioes-desistir',
        perfil: 'todos',
        pergunta: 'Aceitei o convite, mas não poderei ir. E agora?',
        resposta:
          'Abra a reunião e toque em Não vou mais. Isso só é possível antes de você marcar a entrada.',
      },
      {
        id: 'reunioes-notificacoes',
        perfil: 'todos',
        pergunta: 'Onde vejo os avisos das reuniões?',
        resposta:
          'Toque no sino, no topo da tela. Ali aparecem convites, mudanças de horário, cancelamentos, links de presença e atas para avaliar. Toque em Abrir para ir direto ao assunto.',
      },
    ],
  },
  {
    id: 'presenca',
    titulo: 'Presença',
    icone: 'checkmark-done-outline',
    perguntas: [
      {
        id: 'reunioes-presenca',
        perfil: 'todos',
        pergunta: 'Como registro minha presença?',
        resposta: [
          'No horário da reunião, toque em Marcar entrada, na tela Início ou na reunião.',
          'Confirme a biometria, se solicitada.',
          'Ao sair, toque em Marcar saída.',
          'Aguarde o Responsável confirmar sua presença.',
        ],
      },
      {
        id: 'presenca-link',
        perfil: 'todos',
        pergunta: 'Recebi um link de presença. Como uso?',
        resposta: [
          'Aceite o convite da reunião, se ainda não aceitou.',
          'Abra o link, entre com a sua conta e toque em Confirmar entrada.',
          'Ao sair, abra o link de novo e toque em Confirmar saída.',
          'Pelo link, a presença já fica confirmada, sem esperar o Responsável.',
        ],
      },
      {
        id: 'reunioes-confirmar-presenca',
        perfil: 'responsavel',
        pergunta: 'Como confirmo as presenças?',
        resposta: [
          'Na reunião, abra a aba Presença.',
          'Em Aguardando confirmação, toque em ✓ para confirmar ou em ✕ para recusar.',
          'Se alguém não marcou entrada, toque em Marcar presente.',
        ],
      },
      {
        id: 'presenca-gerar-link',
        perfil: 'responsavel',
        pergunta: 'Como gero um link de presença?',
        resposta: [
          'Na reunião, toque em Link e gestão de presença.',
          'Toque em Gerar link de presença.',
          'Toque em Copiar link, Notificar convidados no aplicativo ou Enviar e-mail aos convidados.',
          'Para invalidar o link, toque em Revogar link.',
        ],
      },
      {
        id: 'presenca-corrigir',
        perfil: 'responsavel',
        pergunta: 'Como corrijo o horário de entrada ou saída de alguém?',
        resposta: [
          'Na reunião, toque em Link e gestão de presença.',
          'Em Corrigir entrada e saída, escolha a pessoa.',
          'Ajuste os horários e toque em Salvar correção.',
          'Depois que a ata é enviada, as presenças não mudam mais.',
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
          'Após o término, abra a reunião e toque no cartão Ata.',
          'Escreva o texto e toque em Salvar.',
          'Toque em Enviar.',
          'Escolha o prazo e toque em Enviar.',
        ],
      },
      {
        id: 'ata-quem-aprova',
        perfil: 'todos',
        pergunta: 'Quem precisa aprovar a ata?',
        resposta:
          'Todas as pessoas com presença confirmada na reunião. A ata só é aprovada quando todas aprovam. Se o Responsável esteve presente, o envio já conta como a aprovação dele.',
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
          'Se quiser, toque no parágrafo com problema para apontá-lo.',
          'Toque em Reprovar e, se quiser, escreva a justificativa.',
          'Toque em Reprovar ata.',
        ],
      },
      {
        id: 'ata-prazo',
        perfil: 'todos',
        pergunta: 'O que é o prazo da ata?',
        resposta:
          'Ao enviar, o Responsável escolhe 24 horas, 3 dias ou 7 dias. A data aparece na ata como "Responder até". Depois dela, a ata continua esperando quem ainda não respondeu.',
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
          'A ata volta para você, e os demais não precisam mais responder. Toque em Corrigir em nova versão, ajuste o texto e envie de novo. A versão reprovada fica no histórico.',
      },
    ],
  },
  {
    id: 'votacao',
    titulo: 'Votação',
    icone: 'checkbox-outline',
    perguntas: [
      {
        id: 'votacao-o-que-e',
        perfil: 'todos',
        pergunta: 'O que é a votação?',
        resposta:
          'É uma decisão tomada durante a reunião. O Responsável abre a votação com um assunto e as opções, e cada participante presente vota uma vez.',
      },
      {
        id: 'votacao-abrir',
        perfil: 'responsavel',
        pergunta: 'Como abro uma votação?',
        resposta: [
          'Durante a reunião, abra a aba Votações.',
          'Toque em Abrir votação.',
          'Escreva o assunto e ajuste as opções (Sim, Não e Abstenção já vêm prontas).',
          'No fim do formulário, toque em Abrir votação para liberar o voto.',
        ],
      },
      {
        id: 'votacao-votar',
        perfil: 'todos',
        pergunta: 'Como voto?',
        resposta: [
          'Marque sua entrada na reunião.',
          'Abra a aba Votações.',
          'Toque na opção escolhida.',
          'Toque em Votar para confirmar.',
        ],
      },
      {
        id: 'votacao-nao-consigo',
        perfil: 'todos',
        pergunta: 'Por que não consigo votar?',
        resposta:
          'Só vota quem marcou entrada e ainda não marcou saída. Também não é possível votar se a sua entrada foi recusada, se a votação foi encerrada ou se a reunião terminou.',
      },
      {
        id: 'votacao-alterar',
        perfil: 'todos',
        pergunta: 'Posso mudar meu voto?',
        resposta: 'Não. Cada pessoa vota uma única vez, e o voto não pode ser alterado depois de confirmado.',
      },
      {
        id: 'votacao-resultado',
        perfil: 'todos',
        pergunta: 'Quando vejo o resultado?',
        resposta:
          'Quando a votação é encerrada: o Responsável toca em Encerrar votação ou ela se encerra sozinha no término da reunião. O resultado mostra a quantidade e a porcentagem de votos de cada opção.',
      },
      {
        id: 'votacao-sigilo',
        perfil: 'todos',
        pergunta: 'Os outros veem em quem eu votei?',
        resposta:
          'Não. O resultado mostra só o total de cada opção. Apenas você vê o seu voto, marcado como "seu voto".',
      },
    ],
  },
  {
    id: 'relatorio',
    titulo: 'Relatório individual',
    icone: 'bar-chart-outline',
    perguntas: [
      {
        id: 'relatorio-o-que-e',
        perfil: 'todos',
        pergunta: 'O que é o relatório individual?',
        resposta:
          'É a lista das reuniões em que você esteve presente, com organização, comissão, data e tempo de participação. No topo aparecem o total de reuniões e as horas registradas.',
      },
      {
        id: 'relatorio-filtrar',
        perfil: 'todos',
        pergunta: 'Como escolho o período?',
        resposta: [
          'Abra a aba Relatório.',
          'Escolha Todo período, Este mês ou Este ano.',
          'Para buscar dados novos, toque em Atualizar relatório.',
        ],
      },
      {
        id: 'relatorio-exportar',
        perfil: 'todos',
        pergunta: 'Como exporto o relatório?',
        resposta: [
          'Abra a aba Relatório e escolha o período.',
          'Toque em Exportar PDF ou Exportar CSV.',
          'Escolha onde salvar ou com quem compartilhar.',
        ],
      },
      {
        id: 'relatorio-faltando',
        perfil: 'todos',
        pergunta: 'Por que uma reunião não aparece?',
        resposta:
          'Entram só as reuniões em que a sua presença foi confirmada. Reuniões canceladas, que ainda não começaram ou fora do período escolhido não aparecem.',
      },
      {
        id: 'relatorio-duracao',
        perfil: 'todos',
        pergunta: 'Por que aparece "Duração não calculada"?',
        resposta:
          'O tempo é calculado entre a sua entrada e a sua saída. Se a saída não foi marcada, a reunião aparece no relatório, mas sem duração.',
      },
      {
        id: 'relatorio-privacidade',
        perfil: 'todos',
        pergunta: 'Outras pessoas podem ver o meu relatório?',
        resposta: 'Não. Cada pessoa vê apenas o próprio relatório.',
      },
    ],
  },
];
