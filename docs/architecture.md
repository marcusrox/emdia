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

- Node.js 22+;
- CommonJS;
- Express 5.x;
- SQLite via `node:sqlite`;
- HTML renderizado por funções em `src/views/*.js`;
- `src/services/viewEngine.js` como agregador de views para o servidor;
- CSS puro em `public/css/styles.css`;
- ícones SVG do pacote `lucide-static`.

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
  executa migrations de banco
  executa seed
  cria servidor HTTP

src/server.js
  roteia requests
  chama models
  chama views exportadas pelo viewEngine
  responde HTML/JSON/redirecionamentos

src/database/
  connection.js
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
    -> User.ensureDefaultUser()
    -> model/service necessario
    -> view exportada pelo viewEngine ou JSON
  -> resposta HTTP
```

GETs renderizam telas ou retornam informação de leitura. POSTs alteram dados e
redirecionam com status 303.

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
  -> normalizeCompetence()
  -> currentCompetence(timezone)
  -> consulta filtrada por financial_entries.competence_month
```

Request com competência explícita:

```text
?competence=2026-07
  -> normalizeCompetence("2026-07")
  -> usa 2026-07
```

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

## 10. Renderização

A renderização server-side fica em `src/views/*.js`. Cada arquivo de view tende
a representar um dominio ou conjunto de telas relacionado, por exemplo
`entriesView.js`, `categoriesView.js`, `accountsView.js` ou
`recurrencesView.js`.

O arquivo `src/services/viewEngine.js` funciona como agregador/exportador das
views consumidas por `src/server.js`. Ele preserva um ponto central de import no
servidor, mas não deve concentrar a implementação de novas telas.

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

Mudanças de schema são controladas por migrations JavaScript versionadas. O
histórico aplicado fica em:

```text
schema_migrations
```

O uso de WAL pode criar arquivos `*.sqlite-wal` e `*.sqlite-shm`. Eles sao
artefatos locais e não devem ser commitados.

## 12. Limites do MVP atual

Ainda não existem:

- autenticação real;
- multiusuario real na interface;
- recorrências;
- anexos;
- OCR;
- WhatsApp/Evolution API;
- relatórios avancados;
- testes automatizados;
- templates EJS;
- API JSON completa.

Esses itens estao previstos no PRD ou em evolução futura, mas não devem ser
presumidos em mudanças pequenas.

## 13. Caminhos de evolução

Evolucoes prováveis:

1. autenticar usuários;
2. implementar recorrências;
3. adicionar anexos e comprovantes;
4. criar OCR com revisão humana;
5. integrar WhatsApp/Evolution API;
6. extrair relatórios;
7. adicionar testes automatizados;
8. avaliar migracao para EJS/TypeScript/Drizzle se o projeto crescer.

Qualquer evolução deve preservar:

- competência mensal como filtro padrão;
- dinheiro em centavos;
- baixas em `settlements`;
- SQL com placeholders;
- HTML escapado;
- separacao entre dados, regras e renderização.
