# TASK-001 - Login e logout

## Contexto

O EmDia ainda opera com usuário local padrão criado pelo seed, sem autenticação
real. O PRD, porém, define autenticação como requisito funcional e indica rotas
dedicadas para `GET /login`, `POST /login` e `POST /logout`.

Esta task descreve a primeira implementação de login e logout do MVP, mantendo a
arquitetura atual com Node HTTP nativo, CommonJS, SQLite e renderização HTML em
`src/services/viewEngine.js`.

## Objetivo

Permitir que o usuário acesse o EmDia por e-mail e senha, mantenha uma sessão
segura durante a navegação e consiga encerrar a sessão de forma explícita.

## Escopo

- Criar tela de login em português, com campos de e-mail e senha.
- Implementar `POST /login` para validar credenciais.
- Implementar `POST /logout` para encerrar a sessão.
- Proteger telas operacionais para exigir usuário autenticado.
- Redirecionar usuário não autenticado para `/login`.
- Redirecionar usuário autenticado para `/dashboard` ao acessar `/login`.
- Manter a regra de competência mensal após o login: dashboard e listagens devem
  continuar abrindo na competência do mês corrente quando nenhuma competência for
  informada.

## Fora do escopo

- Recuperacao de senha.
- Cadastro público de usuários.
- Autenticação multifator.
- Login sem senha.
- Multiusuario completo com gestao administrativa.
- Integração com provedores externos de identidade.

## Requisitos funcionais

1. Ao acessar `/login` sem sessão ativa, o sistema deve renderizar o formulário
   de login.
2. Ao enviar credenciais validas para `POST /login`, o sistema deve criar uma
   sessão e redirecionar para `/dashboard`.
3. Ao enviar credenciais invalidas, o sistema deve renderizar `/login` novamente
   com mensagem genérica de erro, sem indicar se e-mail ou senha esta incorreto.
4. Ao enviar `POST /logout`, o sistema deve invalidar a sessão atual e
   redirecionar para `/login`.
5. Rotas operacionais como `/dashboard`, `/entries`, `/accounts` e `/categories`
   devem exigir sessão autenticada.
6. Rotas técnicas de saúde, como `/health` e `/ready`, podem permanecer sem
   autenticação.

## Requisitos técnicos

- Usar CommonJS e os padrões atuais do projeto.
- Persistir sessões no SQLite, preferencialmente em tabela própria.
- Armazenar apenas hash de senha, nunca senha em texto claro.
- Usar Argon2id quando a dependência estiver disponível ou for adicionada de
  forma explícita para esta task.
- Regenerar o identificador de sessão no login.
- Invalidar a sessão no logout.
- Usar cookie `HttpOnly`.
- Usar `SameSite=Lax` ou `SameSite=Strict`.
- Usar cookie `Secure` quando a aplicação estiver em ambiente de produção.
- Não registrar senha, hash, cookie, token ou header sensivel em logs.
- Escapar todo texto dinâmico renderizado no HTML.
- Usar placeholders `?` em qualquer consulta SQLite com entrada do usuário.

## Notas de implementação

- Avaliar criação de um service dedicado, por exemplo
  `src/services/authService.js`, para concentrar leitura de cookie, criação,
  validação e invalidação de sessão.
- Avaliar criação ou evolução de model para usuários e sessões sem espalhar SQL
  de autenticação pelo servidor HTTP.
- Preservar o seed idempotente: o usuário inicial deve existir de forma segura
  para desenvolvimento local.
- Se houver senha inicial de desenvolvimento, documentar como defini-la sem
  expor segredo real no repositorio.
- A navegação global deve exibir uma ação de sair quando houver usuário
  autenticado.

## Critérios de aceite

- `GET /login` exibe formulário de login sem exigir sessão.
- Login valido cria sessão, define cookie seguro e leva ao dashboard.
- Login invalido não cria sessão e mostra mensagem genérica.
- Usuário sem sessão não acessa telas operacionais protegidas.
- Usuário autenticado acessa dashboard e listagens mantendo a competência
  correta.
- `POST /logout` encerra a sessão e impede reutilizacao do cookie anterior.
- Nenhum log contem senha, hash, token, cookie ou header sensivel.
- `npm run check` passa após a implementação.

## Implementação

- Tela de login criada em `src/services/viewEngine.js`.
- Rotas `GET /login`, `POST /login` e `POST /logout` implementadas em
  `src/server.js`.
- Sessões persistidas em SQLite na tabela `sessions`.
- Cookie de sessão configurado com `HttpOnly`, `SameSite=Lax` e `Secure` em
  produção.
- Formulários autenticados protegidos com token CSRF derivado da sessão.
- Senha local padrão documentada no `README.md` e substituivel por
  `EMDIA_DEFAULT_PASSWORD`.
- Hash de senha implementado com `crypto.scrypt` da biblioteca padrão do Node
  enquanto Argon2id não estiver disponível como dependência do projeto.

## Validação sugerida

```powershell
npm run check
npm start
```

Fluxos manuais:

- abrir `GET /login`;
- tentar login com senha incorreta;
- fazer login com credenciais validas;
- acessar `/dashboard`;
- acessar `/entries`;
- executar logout;
- tentar acessar `/dashboard` novamente sem sessão.

---

## Assinatura da LLM

- Data: 2026-07-10
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: criação

---

## Assinatura da LLM

- Data: 2026-07-10
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
