# Arquitetura do EmDia

Este documento descreve a arquitetura atual do MVP EmDia. Ele complementa
`docs/patterns.md`: aqui ficam as decisões estruturais e os fluxos principais;
os padrões de implementação ficam no arquivo de patterns.

## 1. Visão geral

EmDia e uma aplicação web local para controle de contas, receitas, vencimentos e
baixas financeiras. O MVP atual prioriza um fluxo simples:

1. iniciar servidor local;
2. criar banco SQLite quando necessário;
3. gerar dados iniciais;
4. abrir dashboard filtrado pela competência do mês corrente;
5. permitir registrar, editar, baixar, duplicar e cancelar lançamentos.

A arquitetura atual e monolítica e server-rendered. O servidor recebe a
requisicao, consulta models/services, renderiza HTML no backend e devolve a tela
completa ao navegador.

## 2. Decisões técnicas atuais

Stack vigente:

- Node.js `>=24.15.0 <25`;
- CommonJS;
- Express 5.x;
- SQLite via `node:sqlite`;
- HTML renderizado por funções em `src/views/*.js`;
- `src/services/viewEngine.js` como agregador de views para os módulos de rota;
- CSS puro em `public/css/styles.css`;
- ícones SVG do pacote `lucide-static`.

A mesma linha principal do Node.js deve ser usada no desenvolvimento, no CI e
no processo PM2 do aaPanel. O script de deploy valida o runtime do WebHook e o
executável real do processo antes de atualizar o checkout.

Decisões intencionais:

- manter o pipeline HTTP pequeno, com Express usado apenas para rotas,
  middlewares básicos e arquivos estáticos;
- manter persistência local simples;
- manter regras financeiras em models/services;
- centralizar iconografia de interface com `lucide-static` e helper server-side,
  evitando CDN e SVGs avulsos espalhados pelas views;
- preservar a competência mensal como regra central de produto;
- manter a aplicação facil de executar com `npm start`.

O PRD cita tecnologias como EJS, TypeScript e Drizzle como caminhos possíveis,
mas elas ainda não fazem parte da arquitetura implementada.

## 3. Mapa de módulos

```text
app.js
  adquire lock operacional do banco
  executa migrations de banco
  executa seed
  cria servidor HTTP

src/server.js
  cria e configura o app Express
  ordena middlewares e módulos de rota
  instala handlers finais

src/routes/
  agrupa rotas por domínio
  chama models e services
  escolhe view, JSON ou redirect

src/middleware/
  auth.js: sessão, autenticação, autorização e CSRF
  errors.js: formato de resposta e handlers 404/405/500

src/database/
  connection.js
  transaction.js
  migrator.js
  migrations/
  schema.js
  seed.js

src/models/
  User.js
  FinancialAccount.js
  Category.js
  Party.js
  FinancialEntry.js
  Settlement.js
  AuditLog.js

src/services/
  dateService.js
  moneyService.js
  statusService.js
  id.js
  viewEngine.js

src/views/
  layout.js
  *View.js

public/css/styles.css
```

## 4. Fluxo de inicialização

```text
npm start
  -> node app.js
    -> initializeDatabase()
    -> runMigrations()
    -> seedDatabase()
    -> createServer()
    -> app.listen(PORT)
```

Responsabilidades:

- `initializeDatabase`: ponto público de inicialização do banco; delega para o
  migrator.
- `transaction`: delimita transações síncronas `DEFERRED` ou `IMMEDIATE`,
  rejeita aninhamento e preserva a causa original em falhas.
- `databaseLockService`: impede duas instâncias oficiais da aplicação e bloqueia
  restauração enquanto o processo está ativo.
- `runMigrations`: cria `schema_migrations`, carrega migrations versionadas em
  `src/database/migrations/` e aplica apenas as pendentes.
- `seedDatabase`: cria usuário local, contas, categorias e exemplos se o banco
  ainda estiver vazio.
- `createServer`: cria o Express app, registra middlewares e rotas.

O banco padrão fica em:

```text
data/emdia.sqlite
```

## 5. Fluxo HTTP

Fluxo geral:

```text
Navegador
  -> src/server.js
    -> middlewares Express
    -> rotas públicas de operação
    -> carregamento de sessão
    -> login ou autenticação obrigatória
    -> módulo de rota do domínio
       -> model/service necessário
       -> view exportada pelo viewEngine, JSON ou redirect
    -> em erro inesperado:
       -> log operacional com requestId
       -> resposta genérica HTML ou JSON com o mesmo código de diagnóstico
  -> resposta HTTP
```

GETs renderizam telas ou retornam informação de leitura. POSTs alteram dados e
redirecionam com status 303.

Os módulos usam funções `register*Routes(app, dependencies)`. `createServer()`
é o composition root e mantém explícita a ordem de middlewares. Rotas novas
devem ser adicionadas ao arquivo do domínio correspondente em `src/routes/`;
regras financeiras continuam em models/services.

O middleware global nunca devolve a mensagem técnica da exceção. A view
`unexpectedErrorView`, em `src/views/errorsView.js`, funciona com ou sem usuário
autenticado. Rotas com contrato JSON são identificadas antes do carregamento da
sessão para que falhas precoces também preservem o formato da resposta.

Antes das rotas, `securityHeaders` aplica CSP efetiva sem `unsafe-inline`,
proteção contra frames, política de referência e permissões mínimas. A CSP
permite scripts e estilos locais e imagens locais, `data:` e Gravatar. HSTS
depende de produção com HTTPS explicitamente confirmado.

O `POST /login` usa um limitador em memória por IP resolvido pelo proxy
confiável e e-mail normalizado. Esse desenho atende ao processo único atual;
uma implantação horizontal precisa de armazenamento compartilhado. `/health`
é liveness independente do banco, enquanto `/ready` faz consulta leve ao
SQLite e compara as migrations aplicadas com o plano versionado. WhatsApp
permanece fora desse contrato por ser dependência secundária.

Sessões mantêm validade máxima de oito horas. A expiração é verificada em cada
acesso e um scheduler do processo remove, em lotes limitados, registros
expirados e revogados antigos usando índices próprios.

Rotas principais:

```text
GET  /
GET  /health
GET  /ready
GET  /dashboard
GET  /entries
GET  /entries/new
GET  /entries/:id
GET  /entries/:id/edit
POST /entries
POST /entries/:id
POST /entries/:id/cancel
POST /entries/:id/duplicate
POST /entries/:id/settlements
GET  /accounts
POST /accounts
GET  /categories
POST /categories
```

## 6. Fluxo da competência mensal

A competência mensal e a principal regra de navegação e consulta.

```text
request sem competence
  -> tela com filtro mensal
     -> resolveMonthlyCompetence()
     -> última competência válida persistida do usuário
     -> fallback para currentCompetence(timezone)
  -> consulta filtrada por financial_entries.competence_month
```

Request com competência explícita:

```text
?competence=2026-07
  -> normalizeCompetence("2026-07")
  -> usa 2026-07
```

No Dashboard, na Agenda e na listagem de lançamentos, uma competência explícita
e válida também atualiza `users.last_competence`. O
`monthlyCompetenceService` centraliza a ordem de precedência para todas as
telas com filtro mensal. A preferência é isolada por usuário, persiste entre
sessões e não é alterada por exportação CSV, formulário de novo lançamento ou
visualização de detalhe.

Telas mensais devem manter controles para:

- mês anterior;
- próximo mês;
- seletor de competência;
- voltar para mês atual.

## 7. Modelo de dados principal

Entidades centrais:

```text
users
  -> financial_accounts
  -> categories
  -> parties
  -> financial_entries
       -> settlements
  -> audit_logs
```

Resumo:

- `users`: usuário local atual e configurações básicas.
- `financial_accounts`: contas financeiras, carteira, bancos e similares.
- `categories`: categorias de receita/despesa.
- `parties`: favorecidos ou pagadores.
- `financial_entries`: receitas e despesas.
- `settlements`: baixas/pagamentos/recebimentos.
- `audit_logs`: trilha básica de ações relevantes.

## 8. Lançamentos e baixas

`financial_entries` representa a conta, receita ou despesa planejada/realizada.

Campos conceituais:

- tipo: receita ou despesa;
- conta associada ao lançamento;
- competência;
- vencimento;
- valor previsto;
- valor realizado;
- status;
- origem.

`settlements` representa a baixa. Uma baixa nunca deve ser substituida apenas
por alteração direta do valor realizado.

O lançamento possui uma única conta em `financial_account_id`. Cada baixa
também registra sua própria conta em `settlements.financial_account_id`; escolher
uma conta diferente na baixa não altera a conta do lançamento.

Fluxo de baixa:

```text
POST /entries/:id/settlements
  -> localiza lançamento
  -> valida conta financeira
  -> identifica baixa parcial ou quitação final
  -> cria settlement
  -> soma total ao realized_amount_cents
  -> recalcula status
  -> registra auditoria
  -> redireciona para detalhe
```

## 9. Status financeiro

Status e derivado por `src/services/statusService.js`.

Entradas relevantes:

- `entry_type`;
- `expected_amount_cents`;
- `realized_amount_cents`;
- `due_date`;
- `status` atual quando cancelado.

Regras gerais:

- despesa totalmente baixada vira `PAID`;
- receita totalmente baixada vira `RECEIVED`;
- baixa parcial vira status parcial;
- vencimento anterior a hoje, sem baixa completa, vira `OVERDUE`;
- cancelado permanece `CANCELLED`.

Uma baixa pode encerrar explicitamente o lançamento abaixo do valor previsto.
Essa decisão fica em `settlements.closes_entry`, sem alterar o valor previsto.
O status considera a existência de uma baixa encerradora vigente; estornos
removem essa baixa do cálculo lógico e podem reabrir o lançamento.

## 10. Renderização

A renderização server-side fica em `src/views/*.js`. Cada arquivo de view tende
a representar um dominio ou conjunto de telas relacionado, por exemplo
`entriesView.js`, `categoriesView.js`, `accountsView.js` ou
`recurrencesView.js`.

O arquivo `src/services/viewEngine.js` funciona como agregador/exportador das
views consumidas pelos módulos de rota. Ele preserva um ponto central de
importação, mas não deve concentrar a implementação de novas telas.

Componentes principais:

- `src/views/layout.js`: layout global, navegação superior e seletor mensal;
- `src/services/viewHelpers.js`: escape HTML, inputs, labels, botões, CSRF e
  ícones;
- navegação superior;
- seletor de competência;
- cards de metricas;
- tabelas de lançamentos;
- formulários;
- telas de contas e categorias.

Todo dado dinâmico vindo de usuário ou banco deve passar por escape antes de ser
inserido em HTML.

## 11. Persistência e arquivos locais

O banco local e criado automaticamente em `data/emdia.sqlite`.

Arquivos ignorados:

```text
data/*.sqlite
data/*.sqlite-*
node_modules/
```

O SQLite usa:

- `PRAGMA foreign_keys = ON`;
- `PRAGMA journal_mode = WAL`.
- `PRAGMA busy_timeout = 5000`.

Operações atômicas usam `withTransaction` ou `withImmediateTransaction` de
`src/database/transaction.js`. Baixa, estorno e proteção do último
administrador adquirem lock `IMMEDIATE` antes de ler condições e gravar.
Resultados funcionais retornam pelo callback e são commitados sem exigir flags
locais; exceções revertem a unidade completa. Não há retry automático nem
suporte implícito a transações aninhadas.

O teste de disponibilidade anterior à restauração é uma exceção deliberada:
usa `busy_timeout = 0` e `BEGIN EXCLUSIVE` diretamente para falhar
imediatamente quando o banco está em uso.

Mudanças de schema são controladas por migrations JavaScript versionadas. O
histórico aplicado fica em:

```text
schema_migrations
```

O uso de WAL pode criar arquivos `*.sqlite-wal` e `*.sqlite-shm`. Eles sao
artefatos locais e não devem ser commitados.

Backups são produzidos por `databaseBackupService` com a API nativa
`node:sqlite.backup`, portanto incluem um snapshot consistente mesmo quando WAL
está habilitado. O fluxo operacional é:

```text
backup
  -> snapshot SQLite em arquivo parcial
  -> integrity_check + foreign_key_check
  -> SHA-256 + manifesto
  -> publicação no diretório de backups

restore
  -> valida origem dentro do diretório configurado
  -> exige --confirm e lock da aplicação livre
  -> cria backup before-restore do banco atual
  -> prepara e verifica banco temporário no mesmo volume
  -> troca arquivos
  -> verifica novamente
  -> em falha, recupera os arquivos originais
```

O diretório padrão é `backups/` e pode ser alterado por
`EMDIA_BACKUP_DIR`. Não há rota HTTP, upload, retenção automática ou integração
com armazenamento externo. A criação automática antes de migrations também não
está habilitada nesta etapa.

## 12. Testes automatizados

A suíte usa `node:test`, Supertest e descoberta automática de
`test/**/*.test.js`, com execução sequencial enquanto o banco da aplicação
permanecer singleton.

```text
test/
  helpers/
    testDatabase.js
    http.js
  unit/
    *.test.js
  integration/
    *.test.js
```

`testDatabase.js` define SQLite `:memory:`, executa todas as migrations e
recusa caminhos não isolados. Suítes de migrations, concorrência e backup usam
conexões próprias em memória ou diretórios temporários.

A matriz de prioridade é:

1. risco crítico: lançamentos, baixas, estornos, atomicidade, isolamento,
   migrations e backup/restauração;
2. risco alto: sessões, autorização, administração de usuários, contas,
   categorias, recorrências e erro global;
3. risco moderado: telas, preferências, filtros, CSV, notificações e operação.

Falhas intermediárias são injetadas por triggers ou migrations controladas,
sem alterar dados reais. Testes HTTP chamam o app Express diretamente e não
abrem porta.

## 13. Limites do MVP atual

Ainda não existem:

- autenticação real;
- multiusuario real na interface;
- recorrências;
- anexos;
- OCR;
- relatórios avancados;
- templates EJS;
- API JSON completa.

Esses itens estao previstos no PRD ou em evolução futura, mas não devem ser
presumidos em mudanças pequenas.

## 14. Caminhos de evolução

Evolucoes prováveis:

1. autenticar usuários;
2. implementar recorrências;
3. adicionar anexos e comprovantes;
4. criar OCR com revisão humana;
5. evoluir a integração WhatsApp para entrada de mensagens e mídias;
6. extrair relatórios;
7. avaliar migracao para EJS/TypeScript/Drizzle se o projeto crescer.

Qualquer evolução deve preservar:

- competência mensal como filtro padrão;
- dinheiro em centavos;
- baixas em `settlements`;
- SQL com placeholders;
- HTML escapado;
- separacao entre dados, regras e renderização.

## 15. Notificações WhatsApp outbound

`notificationService.js` gera e consome a fila de notificações sem conhecer o
gateway externo. `whatsappClient.js` seleciona, por configuração, um dos
adaptadores compatíveis:

- `MockWhatsAppClient`, para desenvolvimento sem rede;
- `EvolutionApiWhatsAppClient`, para Evolution API;
- `WahaWhatsAppClient`, para WAHA.

Evolution API e WAHA mantêm seus próprios endpoints, headers, payloads e estados
de sessão. Ambos retornam o mesmo contrato interno para que troca de provedor
não altere geração de lembretes, idempotência, persistência ou interface.

## 16. Cabeçalhos das views internas

`src/services/viewHelpers.js` fornece `pageHeading`, responsável pela marcação
comum, escape dos textos e composição opcional de ações. As views informam
título, eyebrow, descrição e ações específicas sem duplicar a estrutura.

`monthSwitcher`, em `src/views/layout.js`, compõe esse helper para dashboard e
lançamentos. A competência continua calculada pelos serviços de data e visível
no cabeçalho; o helper de view cuida somente da apresentação e navegação.

## 17. Ambiente de execução

A rota autenticada `GET /runtime-environment` oferece um diagnóstico somente
leitura do processo atual. `src/services/runtimeEnvironmentService.js` coleta e
sanitiza aplicação, sistema operacional, Node.js, dependências, cache CommonJS,
variáveis permitidas e configurações seguras. A view
`src/views/runtimeEnvironmentView.js` somente organiza e escapa essa estrutura.

O limite de segurança fica no service: segredos, URLs, caminhos absolutos,
identificadores da máquina e variáveis desconhecidas não são devolvidos para a
camada de renderização.
