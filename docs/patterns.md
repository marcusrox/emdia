# Padrões do Projeto EmDia

Este documento descreve os padrões técnicos esperados para evoluir o EmDia com
mudanças pequenas, seguras e alinhadas ao PRD. Use este arquivo como referência
antes de alterar código, banco, rotas, telas ou regras financeiras.

## 1. Principio central do produto

O EmDia trabalha por competência mensal.

Quando nenhuma competência for informada, telas operacionais devem usar a
competência do mês corrente do usuário como filtro padrão.

Isso vale para:

- dashboard;
- listagem de lançamentos;
- filtros e buscas;
- relatórios mensais futuros;
- calendario financeiro futuro.

A competência deve seguir o formato:

```text
YYYY-MM
```

Exemplo:

```text
2026-07
```

Datas civis, como vencimento e baixa, devem usar:

```text
YYYY-MM-DD
```

Instantes técnicos, como criação, atualização e auditoria, devem usar ISO string
com `new Date().toISOString()`.

## 2. Stack atual

O MVP atual usa:

- Node.js 22+;
- CommonJS;
- Express 5.x;
- SQLite via `node:sqlite`;
- HTML renderizado no servidor por views em `src/views/*.js`;
- `src/services/viewEngine.js` como agregador de exports das views;
- CSS puro em `public/css/styles.css`;
- ícones SVG via `lucide-static`, renderizados por helper server-side.

Não assuma EJS, TypeScript, Drizzle ou bibliotecas de UI no código atual. Essas
tecnologias podem aparecer no PRD como evolução futura, mas não fazem parte da
implementação vigente.

## 3. Organização de arquivos

Estrutura principal:

```text
app.js
src/server.js
src/database/connection.js
src/database/schema.js
src/database/seed.js
src/models/*.js
src/services/*.js
src/views/*.js
public/css/styles.css
```

Responsabilidades:

- `app.js`: bootstrap da aplicação, inicialização do banco, seed e servidor.
- `src/server.js`: app Express, middlewares, rotas HTTP e composição dos fluxos.
- `src/database/connection.js`: conexao SQLite e pragmas.
- `src/database/schema.js`: schema, tabelas e indices.
- `src/database/seed.js`: dados locais iniciais.
- `src/models/*.js`: persistência e regras próximas dos dados.
- `src/services/*.js`: utilitarios e regras reutilizáveis.
- `src/views/*.js`: renderização HTML server-side por dominio/tela.
- `src/views/layout.js`: layout global, navegação e componentes estruturais.
- `src/services/viewHelpers.js`: helpers compartilhados de HTML, formulários,
  labels, botões e ícones.
- `src/services/viewEngine.js`: agregador/exportador das views usadas pelo
  servidor.
- `public/css/styles.css`: estilos globais da aplicação.

Evite criar novas camadas se uma alteração localizada resolver o problema.

## 4. Padrões JavaScript

- Use CommonJS: `require` e `module.exports`.
- Não introduza ESM sem uma migracao planejada.
- Prefira funções pequenas com responsabilidade clara.
- Use nomes descritivos em ingles para código e entidades técnicas.
- Mantenha textos visíveis ao usuário em português.
- Evite dependências novas sem necessidade clara.
- Use `lucide-static` como fonte padrão de ícones antes de adicionar outra
  biblioteca ou SVG avulso.
- Evite estado global mutavel fora de módulos de infraestrutura, como conexao
  com banco.
- Use retorno explícito de objetos quando isso melhorar leitura do fluxo.

Exemplo:

```js
function getById(userId, id) {
  return getDatabase()
    .prepare("SELECT * FROM financial_entries WHERE user_id = ? AND id = ?")
    .get(userId, id);
}
```

## 5. Banco de dados, migrações e SQL

Regras obrigatórias:

- Use placeholders `?` para entrada do usuário.
- Nunca concatene valores externos em SQL.
- Mantenha `user_id` nas tabelas principais.
- Use `deleted_at` para exclusão lógica quando o histórico importar.
- Crie indices quando adicionar consultas operacionais frequentes.
- Não versionar arquivos SQLite locais.

Arquivos locais ignorados:

```text
data/*.sqlite
data/*.sqlite-*
```

Mudancas no schema devem ser feitas por migrations versionadas em
`src/database/migrations/*.js`. O arquivo `src/database/schema.js` permanece como
ponto publico de inicialização e delega a execução para
`src/database/migrator.js`.

O migrator registra migrations aplicadas na tabela `schema_migrations` e executa
apenas as pendentes, em ordem crescente. Para criar uma nova migration:

- adicione um arquivo numerado em `src/database/migrations/`;
- exporte `id`, `description` e `up(db)`;
- mantenha o `id` estável e único;
- use `new Date().toISOString()` apenas para instantes técnicos gravados pela
  migration;
- atualize `npm run check` para validar o novo arquivo.

Quando uma mudanca precisar de dados iniciais, atualize também
`src/database/seed.js`. Migrations cuidam de estrutura e transformações
necessárias de dados; seed cuida dos dados locais iniciais.

## 6. Dinheiro

Valores monetarios devem ser persistidos em centavos inteiros.

Padrão:

```text
R$ 119,90 -> 11990
```

Use os helpers de `src/services/moneyService.js`:

- `toCents` para entrada de formulário;
- `formatMoney` para exibição.

Não use `float` como modelo de persistência financeira.

## 7. Lançamentos financeiros

Lançamentos vivem em `financial_entries`.

Campos conceituais importantes:

- `entry_type`: `EXPENSE` ou `INCOME`;
- `financial_account_id`: conta associada ao lançamento, opcional;
- `competence_month`: competência mensal `YYYY-MM`;
- `due_date`: vencimento `YYYY-MM-DD`;
- `expected_amount_cents`: valor previsto;
- `realized_amount_cents`: valor realizado;
- `status`: estado operacional;
- `origin`: origem do lançamento.

Ao criar ou atualizar lançamentos:

- normalize a competência com `normalizeCompetence`;
- calcule status com `deriveStatus`;
- mantenha valores em centavos;
- registre auditoria quando a ação alterar dado financeiro relevante.

A conta do lançamento fica em `financial_entries.financial_account_id`. A conta
usada em cada baixa fica em `settlements.financial_account_id` e pode ser
diferente, sem alterar silenciosamente a conta do lançamento.

## 8. Baixas e pagamentos

Baixas devem ser registradas em `settlements`.

Não atualize apenas `realized_amount_cents` sem criar uma baixa correspondente.
O lançamento deve refletir o total realizado, mas o histórico de baixas deve
ficar preservado.

Fluxo esperado:

1. localizar lançamento;
2. avaliar a elegibilidade da baixa com `settlementEligibility`;
3. validar conta financeira, valor e saldo principal em aberto;
4. criar settlement;
5. atualizar valor realizado e status do lançamento;
6. registrar auditoria.

Elegibilidade, validação dependente do saldo, criação do settlement, atualização
do lançamento e auditoria devem ocorrer na mesma transação. Lançamentos pagos,
recebidos, cancelados, em rascunho, sem saldo ou com status incompatível não
aceitam nova baixa. A interface deve orientar o usuário, mas o bloqueio no model
é obrigatório.

## 9. Status

Use `src/services/statusService.js` para regras de status.

Estados atualmente esperados:

- `PENDING`;
- `OVERDUE`;
- `PARTIALLY_PAID`;
- `PAID`;
- `PARTIALLY_RECEIVED`;
- `RECEIVED`;
- `CANCELLED`;
- `DRAFT`.

Ao alterar vencimento, valor esperado, valor realizado ou baixa, recalcule o
status com `deriveStatus`.

## 10. Rotas HTTP

O roteamento atual fica em `src/server.js`.

Padrões:

- GET renderiza telas ou retorna informações de leitura.
- POST altera dados.
- Redirecione após POST com status 303.
- Use `express.urlencoded({ extended: false, limit: "1mb" })` para formulários
  URL encoded.
- Use helpers locais de resposta para telas HTML, redirects 303 e JSON
  pretty-print quando necessário.
- Sirva assets com o prefixo `/public` por `express.static`.
- Preserve URLs com `competence` quando a tela fizer parte do fluxo mensal.

Rotas principais atuais:

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

## 11. Renderização HTML

A renderização atual fica em `src/views/*.js`. O arquivo
`src/services/viewEngine.js` deve permanecer como agregador/exportador das views
para uso em `src/server.js`, não como destino padrão para implementar telas
novas.

Padrões:

- escape dados de usuário com `escapeHtml`;
- mantenha textos de interface em português;
- prefira componentes pequenos de string quando repetidos;
- não renderize HTML vindo de entrada externa sem sanitizacao;
- prefira uma view por dominio/tela, como `entriesView.js`,
  `categoriesView.js` ou `recurrencesView.js`;
- use `src/views/layout.js` para layout global, navegação, seletor mensal e
  estruturas compartilhadas;
- use `src/services/viewHelpers.js` para `escapeHtml`, `csrfInput`,
  `buttonContent`, `buttonLink`, `option`, labels e ícones;
- dicas curtas de preenchimento devem usar o helper `fieldLabel(label,
  helpText)`, exibindo a ajuda em uma interrogação clicável, em vez de texto
  auxiliar sempre visível;
- mantenha o seletor de competência visível em telas mensais;
- preserve ações esperadas: mês anterior, próximo mês, aplicar competência e
  voltar para mês atual.
- use o helper `lucideIcon` de `src/services/viewHelpers.js` para renderizar
  ícones Lucide quando uma view precisar de iconografia.

Se uma tela crescer demais, extraia helpers pequenos dentro da própria view ou,
quando forem reutilizáveis entre telas, mova-os para `viewHelpers.js`. Evite
concentrar implementação de telas em `viewEngine.js`.

## 12. CSS e interface

O CSS fica em `public/css/styles.css`.

Padrões:

- use variaveis CSS em `:root` para cores e tokens principais;
- mantenha componentes com borda, espacamento e estados consistentes;
- preserve responsividade para telas menores;
- evite estilos inline;
- não introduza frameworks CSS sem pedido explícito;
- garanta que tabelas tenham `overflow-x` quando necessário;
- botões e links de ação devem ter estados visuais claros;
- ícones de interface devem vir de `lucide-static`, com SVG renderizado via
  helper, `aria-hidden="true"` no SVG e texto acessivel no controle por
  `aria-label` ou texto visível;
- ações por registro em listagens devem usar o padrão `record-actions` e
  `record-action-button`, preservando semântica de link para `GET` e formulário
  para `POST`;
- formulários de cadastro e edição operacionais devem usar o padrão compacto
  (`form-compact`) para reduzir rolagem e aumentar densidade sem perder
  legibilidade.

## 13. Auditoria

Ações financeiras relevantes devem registrar auditoria com `AuditLog.record`.

Exemplos:

- criação de lançamento;
- edição de lançamento;
- cancelamento;
- baixa;
- estorno futuro;
- confirmação futura de OCR.

O payload deve ser util para investigacao, mas não deve conter segredos ou dados
sensiveis desnecessarios.

## 14. Seed e dados locais

O seed deve ser idempotente.

Regras:

- não duplicar usuário, contas, categorias ou lançamentos a cada execucao;
- criar dados de exemplo na competência corrente;
- manter dados simples e compreensiveis;
- não usar dados reais sensiveis.

O banco local pode ser recriado durante desenvolvimento, mas nunca deve ser
versionado.

## 15. Segurança

Regras obrigatórias:

- não ler nem imprimir `.env`;
- não registrar senhas, tokens ou dados bancarios sensiveis;
- não servir arquivos de `data/`, `.git/`, `.env` ou caminhos arbitrarios;
- usar placeholders SQL;
- escapar HTML;
- validar IDs e dados de formulário antes de confiar neles;
- manter uploads, OCR e WhatsApp com confirmação humana quando forem
  implementados.

## 16. Validação

Para alterações JavaScript:

```powershell
npm run check
```

Para arquivos especificos:

```powershell
node --check app.js
node --check src\server.js
node --check src\models\FinancialEntry.js
```

Para fluxos web, teste quando houver servidor disponível:

```text
GET /health
GET /dashboard
GET /entries
```

Para banco e seed:

```powershell
npm run seed
```

Se uma validação não puder ser executada, informe o motivo na resposta final.

## 17. Git

- Rode `git status --short` antes de mudanças maiores.
- Não reverta alterações de usuário sem pedido explícito.
- Não use `git reset --hard` ou `git checkout --` sem autorizacao explícita.
- Não misture refatoracao, feature e formatacao sem necessidade.
- Não adicione `data/`, `node_modules/` ou arquivos SQLite ao commit.

## 18. Evolução futura

Itens previstos no PRD, mas ainda não implementados no MVP atual:

- autenticação real;
- recorrências;
- anexos;
- OCR;
- relatórios avancados;
- testes automatizados;
- TypeScript;
- EJS/Drizzle.

Ao implementar qualquer item futuro, preserve os principios atuais:

- competência mensal como filtro padrão;
- dinheiro em centavos;
- SQL seguro;
- confirmação humana para dados extraidos automaticamente;
- separacao entre regra de negocio, persistência e renderização.

## 19. Provedores de WhatsApp outbound

As notificações usam a interface interna definida em
`src/services/whatsappClient.js`. A fábrica seleciona `mock`, `evolution-api`
ou `waha` por `WHATSAPP_PROVIDER` e valida somente a configuração do provedor
ativo.

Regras do adaptador:

- manter endpoints, autenticação e payload encapsulados no cliente de cada
  provedor;
- retornar `provider`, `state` e `providerMessageId` no contrato comum;
- considerar `WORKING` conectado no WAHA e os estados existentes da Evolution
  API sem misturar os contratos externos;
- manter o telefone canônico em E.164 e, no cliente WAHA, resolver o `chatId`
  real com `GET /api/contacts/check-exists` antes de cada envio, especialmente
  para compatibilidade com números brasileiros;
- aceitar do WAHA somente identificadores individuais numéricos com sufixo
  `@c.us` ou `@lid`, rejeitando grupos, canais e identificadores arbitrários;
- usar timeout com `AbortController`;
- nunca registrar chave, telefone completo ou texto integral da mensagem;
- manter segredos apenas no ambiente e valores vazios no `.env.example`.

## 20. Cabeçalhos das páginas internas

Toda view renderizada pelo layout autenticado deve usar `pageHeading`, de
`src/services/viewHelpers.js`, para produzir a section principal com a classe
`page-heading` e exatamente um `h1`.

Regras:

- usar o `h1` para identificar a página, não apenas o mês ou filtro atual;
- informar contexto curto em `eyebrow` e descrição opcional;
- construir ações com helpers internos e passá-las em `actions`;
- usar `page-heading-with-actions` somente por meio do helper;
- manter a competência explícita nas páginas mensais e os controles em
  `page-heading-actions`;
- escapar título, eyebrow e descrição no helper;
- não recriar marcação ou CSS concorrente para cabeçalhos específicos;
- classes adicionais devem atuar apenas como modificadores.

`monthSwitcher` pode receber `additionalActions` com HTML produzido por
helpers internos. A opção deve ser usada para ações primárias relacionadas à
página, sem introduzir rotas ou regras de domínio no helper mensal. Quando não
for informada, o cabeçalho mantém apenas os controles de competência.
