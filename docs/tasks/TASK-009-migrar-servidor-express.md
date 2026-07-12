# TASK-009 - Migrar servidor HTTP nativo para Express 5.x

## Contexto

O EmDia opera com servidor HTTP nativo do Node desde o MVP inicial. O roteamento
e feito por uma cadeia de `if/else` dentro de um unico callback de
`http.createServer`, com dispatch manual via `getPathParts` e parse de URL.

Essa abordagem funcionou para o MVP, mas o roadmap do PRD prevê funcionalidades
que demandam mais integracoes: upload de comprovantes, OCR, integracao com
WhatsApp/Evolution API, relatorios avancados e testes automatizados. O ecossistema
de middlewares do Express facilita a absorcao dessas capacidades sem reescrita
repetitiva do roteamento e do pipeline HTTP.

O Express 5.x ja esta instalado no `node_modules` (versao 5.2.1), mas nao esta
declarado no `package.json`. A migracao aproveita essa versao, que oferece suporte
nativo a handlers async e path params avancados.

## Objetivo

Substituir o servidor HTTP nativo por Express 5.x, preservando 100% do
comportamento funcional atual e preparando o terreno para integracoes futuras do
roadmap.

## Escopo

- Declarar `express` como dependencia no `package.json`, usando a versao
  local confirmada `5.2.1`.
- Reescrever `src/server.js` usando Express como framework HTTP.
- Configurar middlewares de body parsing (`express.urlencoded`) e arquivos
  estaticos (`express.static`).
- Converter a cadeia de `if/else` de rotas em rotas Express declarativas.
- Transformar o dispatch manual de parametros de URL em `req.params`.
- Extrair auth check e CSRF para middlewares proprios dentro do Express.
- Manter o `src/services/authService.js` custom (sem `express-session` ou
  `cookie-parser`).
- Remover `src/services/http.js`, cujas funcoes serao substituidas por metodos
  nativos do Express (`res.send`, `res.redirect`, `res.json`).
- Atualizar `app.js` para consumir o Express app retornado por `createServer`,
  mantendo o bootstrap com `.listen(PORT)`.
- Remover a exportacao `staticFile` de `src/services/viewEngine.js` (substituida
  por `express.static`).
- Manter CommonJS como formato de modulo.

## Fora do escopo

- Migrar views, models, helpers ou services nao relacionados ao servidor HTTP.
- Introduzir engines de templates (EJS, Nunjucks, Handlebars).
- Adicionar middlewares de terceiros como `cookie-parser`, `helmet`, `cors` ou
  `morgan` (podem ser adicionados em tasks futuras).
- Alterar a estrutura de pastas do projeto.
- Alterar rotas, contratos de URL ou comportamento funcional das telas.
- Migrar o sistema de sessoes/cookies para `express-session` ou outro middleware.
- Alterar o CSS, layout visual ou componentes de interface.
- Reescrever `src/services/viewEngine.js` como um todo; apenas remover
  `staticFile`.

## Decisoes tecnicas

### Express 5.x

- Suporte nativo a handlers `async` (sem necessidade de wrapper ou
  `express-async-errors`).
- Path params com suporte a regex nativa.
- `req.query` retorna objeto parseado.
- Compativel com CommonJS.

### Rotas no server.js

Manter todas as rotas em `src/server.js`, sem criar arquivos de rota separados.
O projeto tem ~20 rotas; a separacao em arquivos seria modularizacao excessiva
para o tamanho atual.

### AuthService custom

Manter `src/services/authService.js` como esta. As funcoes `getSession`,
`createSession`, `invalidateSession` e `csrfToken` continuam funcionando pois
leem `req.headers.cookie`, que o Express preserva. A funcao `verifyCsrf`
continua recebendo o body explicitamente; os handlers Express devem chamar
`Auth.verifyCsrf(req, req.body)`.

## Estrutura final apos migracao

```text
emdia/
  app.js                                    (ajustado: consome Express app)
  package.json                              (ajustado: inclui dependencia express)
  src/
    server.js                               (reescrito: Express app com rotas)
    services/
      http.js                               (REMOVIDO)
      viewEngine.js                         (ajustado: remove staticFile)
      authService.js                        (inalterado)
      dateService.js                        (inalterado)
      id.js                                 (inalterado)
      moneyService.js                       (inalterado)
      statusService.js                      (inalterado)
      viewHelpers.js                        (inalterado)
    models/*                                (inalterados)
    views/*                                 (inalterados)
    database/*                              (inalterados)
    config/*                                (inalterados)
```

## Mapeamento de funcoes HTTP

| Funcao atual (http.js) | Substituto Express |
|---|---|
| `sendHtml(res, html, code)` | `res.status(code).send(html)` |
| `redirect(res, location, headers)` | `res.set(headers).redirect(303, location)` |
| `sendJson(res, payload, code)` | `res.status(code).type("json").send(JSON.stringify(payload, null, 2))` |
| `parseBody(req)` | `express.urlencoded({ extended: false, limit: "1mb" })` |
| `getPathParts(pathname)` | `req.params` |

## Mapeamento de rotas

| Rota atual | Express | Notas |
|---|---|---|
| `GET /` | `app.get("/")` | `res.redirect(303, "/dashboard")` |
| `GET /health` | `app.get("/health")` | Sem auth |
| `GET /ready` | `app.get("/ready")` | Sem auth |
| `GET /login` | `app.get("/login")` | Sem auth |
| `POST /login` | `app.post("/login")` | Sem auth; redirect com Set-Cookie |
| `POST /logout` | `app.post("/logout")` | Com auth |
| `GET /dashboard` | `app.get("/dashboard")` | Com auth |
| `GET /entries` | `app.get("/entries")` | Com auth |
| `GET /entries/new` | `app.get("/entries/new")` | Definir ANTES de `:id` |
| `GET /entries/:id` | `app.get("/entries/:id")` | `req.params.id` |
| `GET /entries/:id/edit` | `app.get("/entries/:id/edit")` | `req.params.id` |
| `POST /entries` | `app.post("/entries")` | Cria entry |
| `POST /entries/:id` | `app.post("/entries/:id")` | Atualiza entry |
| `POST /entries/:id/cancel` | `app.post("/entries/:id/cancel")` | Cancela entry |
| `POST /entries/:id/duplicate` | `app.post("/entries/:id/duplicate")` | Duplica entry |
| `POST /entries/:id/settlements` | `app.post("/entries/:id/settlements")` | Cria settlement |
| `GET /accounts` | `app.get("/accounts")` | Com auth |
| `POST /accounts` | `app.post("/accounts")` | Com auth |
| `GET /categories` | `app.get("/categories")` | Com auth |
| `POST /categories` | `app.post("/categories")` | Com auth |
| `GET /settings` | `app.get("/settings")` | Com auth |
| `POST /settings` | `app.post("/settings")` | Com auth |

## Ordem de middlewares e rotas (critica)

```
1. app.use("/public", express.static(path.join(__dirname, "..", "public")))
2. express.urlencoded({ extended: false, limit: "1mb" })
3. GET /health, GET /ready               — sem auth
4. GET /login, POST /login               — sem auth
5. Middleware de auth (carrega req.user)  — aplica a todas as rotas seguintes
6. POST /logout
7. Todas as outras rotas autenticadas
8. Middleware de erro                     — ultimo
```

## Pontos criticos

### 1. Set-Cookie no redirect

Hoje: `redirect(res, "/dashboard", { "set-cookie": session.cookie })`

Express: `res.set("Set-Cookie", session.cookie); res.redirect(303, "/dashboard")`

### 2. Ordem de rotas /entries

`/entries/new` deve ser definida ANTES de `/entries/:id` para evitar que "new"
seja capturado como `:id`.

### 3. Pretty-print do JSON

`res.json()` do Express nao faz pretty-print. Para `/health` e `/ready`, usar:
`res.type("json").send(JSON.stringify(payload, null, 2))`

### 4. Redirect 303

`res.redirect()` do Express defaults para 302. Sempre usar
`res.redirect(303, location)` explicitamente.

### 5. Body size limit

`express.urlencoded()` defaults para 100kb. Configurar `limit: "1mb"` para
manter o limite atual.

### 6. Error handler

O try/catch global atual vira middleware de erro Express:
`app.use((err, req, res, next) => { ... })`

### 7. Prefixo dos arquivos estaticos

As views atuais referenciam assets com prefixo `/public/`, como
`/public/css/styles.css` e `/public/js/app.js`. O Express deve preservar esse
contrato com:
`app.use("/public", express.static(path.join(__dirname, "..", "public")))`

Nao alterar as URLs dos assets nas views nesta task.

### 8. Login automatico em desenvolvimento

Preservar o comportamento atual de `canUseDevelopmentLogin`: em
`NODE_ENV=development`, requisicoes locais sem sessao criam uma sessao de
desenvolvimento automaticamente e redirecionam para o caminho solicitado, ou
para `/dashboard` quando a rota for `/login`.

### 9. Fallbacks HTTP

Preservar o fallback de 404 com `notFoundView(user)` para rotas autenticadas
inexistentes e o retorno JSON 405 para metodos nao permitidos.

## Criterios de aceite

- `express` declarado no `package.json` como dependencia na versao `5.2.1`.
- A implementacao define explicitamente se `package-lock.json` deve ser criado;
  se o projeto continuar sem lockfile, registrar a decisao na resposta final.
- `src/server.js` cria e retorna um Express app compativel com `.listen()`.
- `app.js` consome o Express app e inicia o servidor.
- `src/services/http.js` removido.
- `src/services/viewEngine.js` nao mais exporta `staticFile`.
- Todas as rotas existentes funcionam com os mesmos URLs e metodos.
- Auth check roda como middleware nas rotas protegidas.
- CSRF continua validado em todos os POSTs autenticados.
- Login cria sessao com Set-Cookie correto no redirect.
- Logout invalida sessao e limpa cookie.
- Arquivos estaticos em `/public/` continuam acessiveis.
- Login automatico de desenvolvimento continua funcionando para requisicoes
  locais em `NODE_ENV=development`.
- Rotas autenticadas inexistentes retornam 404 com a view de nao encontrado.
- Metodos HTTP nao suportados continuam retornando JSON 405.
- Dashboard, listagens, formularios, detalhe, criacao, edicao, cancelamento,
  duplicacao, baixas, contas, categorias e configuracoes funcionam como antes.
- `npm run check` passa apos a implementacao.
- Nenhum behavior financeiro e alterado.

## Validacao sugerida

```powershell
npm run check
```

Iniciar servidor para validacao HTTP:

```powershell
$env:PORT = "3100"
$env:NODE_ENV = "development"
node app.js
```

Fluxos manuais:

- `GET /health` → 200 com `{ ok: true }`
- `GET /` → 303 para `/dashboard`
- `GET /login` → 200 com formulario
- Login com credenciais validas → 303 para `/dashboard` com cookie
- Login com credenciais invalidas → 200 com mensagem de erro
- `GET /dashboard` → 200 com cards e competencia
- `GET /entries` → 200 com listagem
- `GET /entries/new` → 200 com formulario
- `GET /entries/:id` → 200 com detalhe (usar ID existente)
- `GET /entries/:id/edit` → 200 com formulario de edicao
- `POST /entries` → 303 para `/entries` (criacao)
- `POST /entries/:id` → 303 (edicao)
- `POST /entries/:id/cancel` → 303 (cancelamento)
- `POST /entries/:id/duplicate` → 303 (duplicacao)
- `POST /entries/:id/settlements` → 303 (baixa)
- `GET /accounts` → 200
- `POST /accounts` → 303 (criacao)
- `GET /categories` → 200
- `POST /categories` → 303 (criacao)
- `GET /settings` → 200
- `POST /settings` → 303 (atualizacao)
- Acessar `/dashboard` sem sessao → redireciona para `/login`
- Em `NODE_ENV=development`, acessar `/dashboard` localmente sem sessao → cria
  sessao de desenvolvimento e redireciona para `/dashboard`
- `POST /logout` → 303 para `/login`
- Acessar `/dashboard` apos logout → redireciona para `/login`
- `GET /public/css/styles.css` → 200 com `text/css`
- `GET /public/js/app.js` → 200 com `text/javascript`
- `GET /rota-inexistente` autenticado → 404 com tela de nao encontrado

Encerrar servidor de validacao apos testes.

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: opencode/big-pickle
- Versao: nao informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
