# Conecta+ | Frontend

Frontend do projeto acadêmico **Conecta+**, desenvolvido em React Native com Expo.

O aplicativo é responsável pela interface mobile do sistema, permitindo o acesso às funcionalidades de gerenciamento de reuniões.

## Tecnologias

- React Native
- Expo
- Expo Router
- TypeScript

## Como executar

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/Conecta-IFSP/FRONTEND.git
cd FRONTEND
npm install
```

Crie o arquivo `.env` a partir do `.env.example`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Execute o projeto:

```bash
npm start
```

O aplicativo pode ser executado no **Expo Go** ou em um emulador Android/iOS.
No Expo Go, o aplicativo obtém o host atual do Expo e troca automaticamente o
`localhost` pelo endereço do computador. O celular e o computador precisam estar
na mesma rede, e o backend deve ouvir em `0.0.0.0:3000`.

## Recuperação de senha

O backend envia por e-mail um código de 7 caracteres. O usuário digita o código
na tela de recuperação de conta e define a nova senha no próprio aplicativo.

## Backend

O aplicativo consome a API disponível em
[Conecta-IFSP/BACKEND](https://github.com/Conecta-IFSP/BACKEND).

## Documentação

A documentação do projeto está disponível em
[Conecta-IFSP/DOCUMENTATION](https://github.com/Conecta-IFSP/DOCUMENTATION).

## Verificação

```bash
npm run typecheck
npm run lint
```

## Projeto acadêmico

Projeto desenvolvido no **Instituto Federal de São Paulo — IFSP**.
