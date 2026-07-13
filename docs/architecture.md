# Arquitetura do EmDia

Este documento descreve a arquitetura atual do MVP EmDia. Ele complementa
`docs/patterns.md`: aqui ficam as decisoes estruturais e os fluxos principais;
os padroes de implementacao ficam no arquivo de patterns.

## 1. Visao geral

EmDia e uma aplicacao web local para controle de contas, receitas, vencimentos e
baixas financeiras. O MVP atual prioriza um fluxo simples:

1. iniciar servidor local;
2. criar banco SQLite quando necessario;
3. gerar dados iniciais;
4. abrir dashboard filtrado pela competencia do mes corrente;
5. permitir registrar, editar, baixar, duplicar e cancelar lancamentos.

A arquitetura atual e monolitica e server-rendered. O servidor recebe a
requisicao, consulta models/services, renderiza HTML no backend e devolve a tela
completa ao navegador.

## 2. Decisoes tecnicas atuais

Stack vigente:

- Node.js 22+;
- CommonJS;
- Express 5.x;
- SQLite via `node:sqlite`;
- HTML renderizado por funcoes em `src/views/*.js`;
- `src/services/viewEngine.js` como agregador de views para o servidor;
- CSS puro em `public/css/styles.css`;
- icones SVG do pacote `lucide-static`.

Decisoes intencionais:

- manter o pipeline HTTP pequeno, com Express usado apenas para rotas,
  middlewares basicos e arquivos estaticos;
- manter persistencia local simples;
- manter regras financeiras em models/services;
- centralizar iconografia de interface com `lucide-static` e helper server-side,
  evitando CDN e SVGs avulsos espalhados pelas views;
- preservar a competencia mensal como regra central de produto;
- manter a aplicacao facil de executar com `npm start`.

O PRD cita tecnologias como EJS, TypeScript e Drizzle como caminhos possiveis,
mas elas ainda nao fazem parte da arquitetura implementada.

## 3. Mapa de modulos

```text
app.js
  inicializa schema
  executa seed
  cria servidor HTTP

src/server.js
  roteia requests
  chama models
  chama views exportadas pelo viewEngine
  responde HTML/JSON/redirecionamentos

src/database/
  connection.js
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

## 4. Fluxo de inicializacao

```text
npm start
  -> node app.js
    -> initializeDatabase()
    -> seedDatabase()
    -> createServer()
    -> app.listen(PORT)
```

Responsabilidades:

- `initializeDatabase`: cria tabelas e indices se nao existirem.
- `seedDatabase`: cria usuario local, contas, categorias e exemplos se o banco
  ainda estiver vazio.
- `createServer`: cria o Express app, registra middlewares e rotas.

O banco padrao fica em:

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

GETs renderizam telas ou retornam informacao de leitura. POSTs alteram dados e
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

## 6. Fluxo da competencia mensal

A competencia mensal e a principal regra de navegacao e consulta.

```text
request sem competence
  -> normalizeCompetence()
  -> currentCompetence(timezone)
  -> consulta filtrada por financial_entries.competence_month
```

Request com competencia explicita:

```text
?competence=2026-07
  -> normalizeCompetence("2026-07")
  -> usa 2026-07
```

Telas mensais devem manter controles para:

- mes anterior;
- proximo mes;
- seletor de competencia;
- voltar para mes atual.

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

- `users`: usuario local atual e configuracoes basicas.
- `financial_accounts`: contas financeiras, carteira, bancos e similares.
- `categories`: categorias de receita/despesa.
- `parties`: favorecidos ou pagadores.
- `financial_entries`: receitas e despesas.
- `settlements`: baixas/pagamentos/recebimentos.
- `audit_logs`: trilha basica de acoes relevantes.

## 8. Lancamentos e baixas

`financial_entries` representa a conta, receita ou despesa planejada/realizada.

Campos conceituais:

- tipo: receita ou despesa;
- competencia;
- vencimento;
- valor previsto;
- valor realizado;
- status;
- origem.

`settlements` representa a baixa. Uma baixa nunca deve ser substituida apenas
por alteracao direta do valor realizado.

Fluxo de baixa:

```text
POST /entries/:id/settlements
  -> localiza lancamento
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

## 10. Renderizacao

A renderizacao server-side fica em `src/views/*.js`. Cada arquivo de view tende
a representar um dominio ou conjunto de telas relacionado, por exemplo
`entriesView.js`, `categoriesView.js`, `accountsView.js` ou
`recurrencesView.js`.

O arquivo `src/services/viewEngine.js` funciona como agregador/exportador das
views consumidas por `src/server.js`. Ele preserva um ponto central de import no
servidor, mas nao deve concentrar a implementacao de novas telas.

Componentes principais:

- `src/views/layout.js`: layout global, navegacao superior e seletor mensal;
- `src/services/viewHelpers.js`: escape HTML, inputs, labels, botoes, CSRF e
  icones;
- navegacao superior;
- seletor de competencia;
- cards de metricas;
- tabelas de lancamentos;
- formularios;
- telas de contas e categorias.

Todo dado dinamico vindo de usuario ou banco deve passar por escape antes de ser
inserido em HTML.

## 11. Persistencia e arquivos locais

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

O uso de WAL pode criar arquivos `*.sqlite-wal` e `*.sqlite-shm`. Eles sao
artefatos locais e nao devem ser commitados.

## 12. Limites do MVP atual

Ainda nao existem:

- autenticacao real;
- multiusuario real na interface;
- recorrencias;
- anexos;
- OCR;
- WhatsApp/Evolution API;
- relatorios avancados;
- testes automatizados;
- migracoes versionadas;
- templates EJS;
- API JSON completa.

Esses itens estao previstos no PRD ou em evolucao futura, mas nao devem ser
presumidos em mudancas pequenas.

## 13. Caminhos de evolucao

Evolucoes provaveis:

1. autenticar usuarios;
2. implementar recorrencias;
3. adicionar anexos e comprovantes;
4. criar OCR com revisao humana;
5. integrar WhatsApp/Evolution API;
6. extrair relatorios;
7. adicionar testes automatizados;
8. avaliar migracao para EJS/TypeScript/Drizzle se o projeto crescer.

Qualquer evolucao deve preservar:

- competencia mensal como filtro padrao;
- dinheiro em centavos;
- baixas em `settlements`;
- SQL com placeholders;
- HTML escapado;
- separacao entre dados, regras e renderizacao.
