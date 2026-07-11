# TASK-001 - Login e logout

## Contexto

O EmDia ainda opera com usuario local padrao criado pelo seed, sem autenticacao
real. O PRD, porem, define autenticacao como requisito funcional e indica rotas
dedicadas para `GET /login`, `POST /login` e `POST /logout`.

Esta task descreve a primeira implementacao de login e logout do MVP, mantendo a
arquitetura atual com Node HTTP nativo, CommonJS, SQLite e renderizacao HTML em
`src/services/viewEngine.js`.

## Objetivo

Permitir que o usuario acesse o EmDia por e-mail e senha, mantenha uma sessao
segura durante a navegacao e consiga encerrar a sessao de forma explicita.

## Escopo

- Criar tela de login em portugues, com campos de e-mail e senha.
- Implementar `POST /login` para validar credenciais.
- Implementar `POST /logout` para encerrar a sessao.
- Proteger telas operacionais para exigir usuario autenticado.
- Redirecionar usuario nao autenticado para `/login`.
- Redirecionar usuario autenticado para `/dashboard` ao acessar `/login`.
- Manter a regra de competencia mensal apos o login: dashboard e listagens devem
  continuar abrindo na competencia do mes corrente quando nenhuma competencia for
  informada.

## Fora do escopo

- Recuperacao de senha.
- Cadastro publico de usuarios.
- Autenticacao multifator.
- Login sem senha.
- Multiusuario completo com gestao administrativa.
- Integracao com provedores externos de identidade.

## Requisitos funcionais

1. Ao acessar `/login` sem sessao ativa, o sistema deve renderizar o formulario
   de login.
2. Ao enviar credenciais validas para `POST /login`, o sistema deve criar uma
   sessao e redirecionar para `/dashboard`.
3. Ao enviar credenciais invalidas, o sistema deve renderizar `/login` novamente
   com mensagem generica de erro, sem indicar se e-mail ou senha esta incorreto.
4. Ao enviar `POST /logout`, o sistema deve invalidar a sessao atual e
   redirecionar para `/login`.
5. Rotas operacionais como `/dashboard`, `/entries`, `/accounts` e `/categories`
   devem exigir sessao autenticada.
6. Rotas tecnicas de saude, como `/health` e `/ready`, podem permanecer sem
   autenticacao.

## Requisitos tecnicos

- Usar CommonJS e os padroes atuais do projeto.
- Persistir sessoes no SQLite, preferencialmente em tabela propria.
- Armazenar apenas hash de senha, nunca senha em texto claro.
- Usar Argon2id quando a dependencia estiver disponivel ou for adicionada de
  forma explicita para esta task.
- Regenerar o identificador de sessao no login.
- Invalidar a sessao no logout.
- Usar cookie `HttpOnly`.
- Usar `SameSite=Lax` ou `SameSite=Strict`.
- Usar cookie `Secure` quando a aplicacao estiver em ambiente de producao.
- Nao registrar senha, hash, cookie, token ou header sensivel em logs.
- Escapar todo texto dinamico renderizado no HTML.
- Usar placeholders `?` em qualquer consulta SQLite com entrada do usuario.

## Notas de implementacao

- Avaliar criacao de um service dedicado, por exemplo
  `src/services/authService.js`, para concentrar leitura de cookie, criacao,
  validacao e invalidadacao de sessao.
- Avaliar criacao ou evolucao de model para usuarios e sessoes sem espalhar SQL
  de autenticacao pelo servidor HTTP.
- Preservar o seed idempotente: o usuario inicial deve existir de forma segura
  para desenvolvimento local.
- Se houver senha inicial de desenvolvimento, documentar como defini-la sem
  expor segredo real no repositorio.
- A navegacao global deve exibir uma acao de sair quando houver usuario
  autenticado.

## Criterios de aceite

- `GET /login` exibe formulario de login sem exigir sessao.
- Login valido cria sessao, define cookie seguro e leva ao dashboard.
- Login invalido nao cria sessao e mostra mensagem generica.
- Usuario sem sessao nao acessa telas operacionais protegidas.
- Usuario autenticado acessa dashboard e listagens mantendo a competencia
  correta.
- `POST /logout` encerra a sessao e impede reutilizacao do cookie anterior.
- Nenhum log contem senha, hash, token, cookie ou header sensivel.
- `npm run check` passa apos a implementacao.

## Implementacao

- Tela de login criada em `src/services/viewEngine.js`.
- Rotas `GET /login`, `POST /login` e `POST /logout` implementadas em
  `src/server.js`.
- Sessoes persistidas em SQLite na tabela `sessions`.
- Cookie de sessao configurado com `HttpOnly`, `SameSite=Lax` e `Secure` em
  producao.
- Formularios autenticados protegidos com token CSRF derivado da sessao.
- Senha local padrao documentada no `README.md` e substituivel por
  `EMDIA_DEFAULT_PASSWORD`.
- Hash de senha implementado com `crypto.scrypt` da biblioteca padrao do Node
  enquanto Argon2id nao estiver disponivel como dependencia do projeto.

## Validacao sugerida

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
- tentar acessar `/dashboard` novamente sem sessao.

---

## Assinatura da LLM

- Data: 2026-07-10
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-10
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
