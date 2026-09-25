# Conecta+

Aplicativo mobile para gerenciamento do ciclo de uma reunião — calendário,
participantes, pauta, anotações, tarefas e histórico em um só lugar.

A proposta completa do projeto está em [`PropostaInicial/objetivos.md`](PropostaInicial/objetivos.md).

## Situação atual

**Incremento 1 — autenticação, cadastro, perfil, senha, tema e solicitação de cadastro de organização implementados.**

A tela de login autentica o usuário e mostra em que situação está a sua
solicitação de acesso à organização, ligando o login ao fluxo de cadastro:

| Situação do usuário | O que a tela faz |
| --- | --- |
| Cadastro aprovado | Encaminha para a tela inicial |
| Aguardando aprovação | Informa que a solicitação está em análise pelo administrador |
| Solicitação recusada | Informa a recusa e orienta o usuário |
| Sem organização vinculada | Orienta a solicitar acesso a uma organização |

A documentação do requisito, os casos de teste e as evidências estão em
[`docs/incremento-1/RF-login.md`](docs/incremento-1/RF-login.md).

<p align="center">
  <img src="docs/incremento-1/evidencias/01-inicial.png" width="240" alt="Tela de login" />
  <img src="docs/incremento-1/evidencias/02-validacao.png" width="240" alt="Validação dos campos" />
  <img src="docs/incremento-1/evidencias/04-pendente-aprovacao.png" width="240" alt="Cadastro em análise" />
</p>

As configurações do usuário incluem edição de nome/e-mail, tema claro, escuro ou
do sistema, troca autenticada de senha e recuperação por link temporário enviado
por e-mail.

## Tecnologias

Conforme definido na proposta inicial:

- **React Native** com **Expo** (SDK 57) — Android e iOS
- **Expo Router** — navegação entre telas
- **StyleSheet do React Native** — estilos nativos compatíveis com Android e iOS
- **TypeScript**

## Como executar

```bash
npm install
npm start
```

Depois, leia o QR Code com o aplicativo **Expo Go** ou use `npm run android` /
`npm run ios`.

### Servidor

O aplicativo usa exclusivamente a API NestJS. Defina a variável de ambiente e
reinicie o Expo:

No PowerShell, descubra o IPv4 da conexão Wi-Fi com `ipconfig`, coloque-o no
arquivo `.env` e reinicie o Expo. Exemplo:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

O iPhone e o computador precisam estar na mesma rede. Não use `localhost` nem
`127.0.0.1`: no iPhone esses endereços apontam para o próprio aparelho. O
backend deve continuar ouvindo em `0.0.0.0:3000`.

O aplicativo chama `POST /auth/login`. Se a variável não estiver definida, o
login falhará informando que não foi possível conectar ao servidor.

Para o envio real de recuperação de conta, configure no backend `MAIL_HOST`,
`MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` e `APP_RESET_URL`. Sem SMTP,
o backend usa o transporte JSON do Nodemailer e imprime o link no terminal para
testes locais.

Ao iniciar, o backend também garante a existência de um administrador do
sistema. Configure `ROOT_USER_NAME`, `ROOT_USER_EMAIL` e `ROOT_USER_PASSWORD`
no arquivo `backend/.env`. Esse usuário pode acessar a tela de gerenciamento
para autorizar, revogar e editar organizações.

## Estrutura

```
src/
├── app/                     rotas (Expo Router)
│   ├── (auth)/
│   │   ├── login.tsx        tela de login
│   │   ├── cadastro.tsx     cadastro de usuário
│   │   ├── recuperar-conta.tsx  solicitação do link de recuperação
│   │   └── redefinir-senha.tsx  criação da nova senha pelo link
│   ├── perfil.tsx           dados pessoais e tema preferido
│   ├── alterar-senha.tsx    troca autenticada de senha
│   └── inicio.tsx           destino do login aprovado
├── components/              componentes reutilizáveis das telas
├── constants/theme.ts       cores e tipografia da identidade visual
├── hooks/useLogin.ts        estado e regras da tela de login
├── models/usuario.ts        modelo de usuário e situações de acesso
├── services/                autenticação e comunicação com a API
└── utils/validacao.ts       validações de formulário
```

## Identidade visual

As cores, a tipografia (Poppins) e o logotipo vêm do documento de identidade
visual do projeto (`PropostaInicial/Topico3.pdf`) e estão centralizados em
[`src/constants/theme.ts`](src/constants/theme.ts), com aplicação por `StyleSheet`.

| | | | | | | |
| --- | --- | --- | --- | --- | --- | --- |
| `#1e2080` | `#544cee` | `#256ef1` | `#5e46e8` | `#1a3ff9` | `#363ac5` | `#8436dd` |

## Verificação

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
```

## Convenções

Seguem o definido na proposta inicial:

| Elemento | Padrão | Exemplo |
| --- | --- | --- |
| Variáveis e funções | camelCase | `validarEmail()` |
| Componentes e telas | PascalCase | `CampoTexto`, `TelaLogin` |
| Constantes | UPPER_SNAKE_CASE | `TAMANHO_MINIMO_SENHA` |
| Rotas de API | substantivos consistentes | `/auth/login` |

As rotas do Expo Router usam nomes de arquivo em minúsculas porque o caminho do
arquivo é a própria URL da tela; o componente exportado mantém o PascalCase.
