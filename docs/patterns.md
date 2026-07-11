# Padroes do Projeto EmDia

Este documento descreve os padroes tecnicos esperados para evoluir o EmDia com
mudancas pequenas, seguras e alinhadas ao PRD. Use este arquivo como referencia
antes de alterar codigo, banco, rotas, telas ou regras financeiras.

## 1. Principio central do produto

O EmDia trabalha por competencia mensal.

Quando nenhuma competencia for informada, telas operacionais devem usar a
competencia do mes corrente do usuario como filtro padrao.

Isso vale para:

- dashboard;
- listagem de lancamentos;
- filtros e buscas;
- relatorios mensais futuros;
- calendario financeiro futuro.

A competencia deve seguir o formato:

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

Instantes tecnicos, como criacao, atualizacao e auditoria, devem usar ISO string
com `new Date().toISOString()`.

## 2. Stack atual

O MVP atual usa:

- Node.js 22+;
- CommonJS;
- servidor HTTP nativo do Node;
- SQLite via `node:sqlite`;
- HTML renderizado no servidor em `src/services/viewEngine.js`;
- CSS puro em `public/css/styles.css`;
- sem dependencias externas obrigatorias.

Nao assuma Express, EJS, TypeScript, Drizzle ou bibliotecas de UI no codigo
atual. Essas tecnologias podem aparecer no PRD como evolucao futura, mas nao
fazem parte da implementacao vigente.

## 3. Organizacao de arquivos

Estrutura principal:

```text
app.js
src/server.js
src/database/connection.js
src/database/schema.js
src/database/seed.js
src/models/*.js
src/services/*.js
public/css/styles.css
```

Responsabilidades:

- `app.js`: bootstrap da aplicacao, inicializacao do banco, seed e servidor.
- `src/server.js`: roteamento HTTP, parsing basico e composicao dos fluxos.
- `src/database/connection.js`: conexao SQLite e pragmas.
- `src/database/schema.js`: schema, tabelas e indices.
- `src/database/seed.js`: dados locais iniciais.
- `src/models/*.js`: persistencia e regras proximas dos dados.
- `src/services/*.js`: utilitarios e regras reutilizaveis.
- `src/services/viewEngine.js`: renderizacao HTML server-side.
- `public/css/styles.css`: estilos globais da aplicacao.

Evite criar novas camadas se uma alteracao localizada resolver o problema.

## 4. Padroes JavaScript

- Use CommonJS: `require` e `module.exports`.
- Nao introduza ESM sem uma migracao planejada.
- Prefira funcoes pequenas com responsabilidade clara.
- Use nomes descritivos em ingles para codigo e entidades tecnicas.
- Mantenha textos visiveis ao usuario em portugues.
- Evite dependencias novas sem necessidade clara.
- Evite estado global mutavel fora de modulos de infraestrutura, como conexao
  com banco.
- Use retorno explicito de objetos quando isso melhorar leitura do fluxo.

Exemplo:

```js
function getById(userId, id) {
  return getDatabase()
    .prepare("SELECT * FROM financial_entries WHERE user_id = ? AND id = ?")
    .get(userId, id);
}
```

## 5. Banco de dados e SQL

Regras obrigatorias:

- Use placeholders `?` para entrada do usuario.
- Nunca concatene valores externos em SQL.
- Mantenha `user_id` nas tabelas principais.
- Use `deleted_at` para exclusao logica quando o historico importar.
- Crie indices quando adicionar consultas operacionais frequentes.
- Nao versionar arquivos SQLite locais.

Arquivos locais ignorados:

```text
data/*.sqlite
data/*.sqlite-*
```

Mudancas no schema devem ser feitas em `src/database/schema.js`. Quando uma
mudanca precisar de dados iniciais, atualize tambem `src/database/seed.js`.

## 6. Dinheiro

Valores monetarios devem ser persistidos em centavos inteiros.

Padrao:

```text
R$ 119,90 -> 11990
```

Use os helpers de `src/services/moneyService.js`:

- `toCents` para entrada de formulario;
- `formatMoney` para exibicao.

Nao use `float` como modelo de persistencia financeira.

## 7. Lancamentos financeiros

Lancamentos vivem em `financial_entries`.

Campos conceituais importantes:

- `entry_type`: `EXPENSE` ou `INCOME`;
- `competence_month`: competencia mensal `YYYY-MM`;
- `due_date`: vencimento `YYYY-MM-DD`;
- `expected_amount_cents`: valor previsto;
- `realized_amount_cents`: valor realizado;
- `status`: estado operacional;
- `origin`: origem do lancamento.

Ao criar ou atualizar lancamentos:

- normalize a competencia com `normalizeCompetence`;
- calcule status com `deriveStatus`;
- mantenha valores em centavos;
- registre auditoria quando a acao alterar dado financeiro relevante.

## 8. Baixas e pagamentos

Baixas devem ser registradas em `settlements`.

Nao atualize apenas `realized_amount_cents` sem criar uma baixa correspondente.
O lancamento deve refletir o total realizado, mas o historico de baixas deve
ficar preservado.

Fluxo esperado:

1. localizar lancamento;
2. validar conta financeira;
3. criar settlement;
4. atualizar valor realizado e status do lancamento;
5. registrar auditoria.

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

Padroes:

- GET renderiza telas ou retorna informacoes de leitura.
- POST altera dados.
- Redirecione apos POST com status 303.
- Use `parseBody` para formularios URL encoded.
- Use `sendHtml` para telas e `sendJson` para endpoints de saude/API simples.
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

## 11. Renderizacao HTML

A renderizacao atual fica em `src/services/viewEngine.js`.

Padroes:

- escape dados de usuario com `escapeHtml`;
- mantenha textos de interface em portugues;
- prefira componentes pequenos de string quando repetidos;
- nao renderize HTML vindo de entrada externa sem sanitizacao;
- mantenha o seletor de competencia visivel em telas mensais;
- preserve acoes esperadas: mes anterior, proximo mes, aplicar competencia e
  voltar para mes atual.

Se uma tela crescer demais, extraia helpers dentro do proprio `viewEngine.js`
antes de criar uma nova arquitetura.

## 12. CSS e interface

O CSS fica em `public/css/styles.css`.

Padroes:

- use variaveis CSS em `:root` para cores e tokens principais;
- mantenha componentes com borda, espacamento e estados consistentes;
- preserve responsividade para telas menores;
- evite estilos inline;
- nao introduza frameworks CSS sem pedido explicito;
- garanta que tabelas tenham `overflow-x` quando necessario;
- botoes e links de acao devem ter estados visuais claros.
- formularios de cadastro e edicao operacionais devem usar o padrao compacto
  (`form-compact`) para reduzir rolagem e aumentar densidade sem perder
  legibilidade.

## 13. Auditoria

Acoes financeiras relevantes devem registrar auditoria com `AuditLog.record`.

Exemplos:

- criacao de lancamento;
- edicao de lancamento;
- cancelamento;
- baixa;
- estorno futuro;
- confirmacao futura de OCR.

O payload deve ser util para investigacao, mas nao deve conter segredos ou dados
sensiveis desnecessarios.

## 14. Seed e dados locais

O seed deve ser idempotente.

Regras:

- nao duplicar usuario, contas, categorias ou lancamentos a cada execucao;
- criar dados de exemplo na competencia corrente;
- manter dados simples e compreensiveis;
- nao usar dados reais sensiveis.

O banco local pode ser recriado durante desenvolvimento, mas nunca deve ser
versionado.

## 15. Seguranca

Regras obrigatorias:

- nao ler nem imprimir `.env`;
- nao registrar senhas, tokens ou dados bancarios sensiveis;
- nao servir arquivos de `data/`, `.git/`, `.env` ou caminhos arbitrarios;
- usar placeholders SQL;
- escapar HTML;
- validar IDs e dados de formulario antes de confiar neles;
- manter uploads, OCR e WhatsApp com confirmacao humana quando forem
  implementados.

## 16. Validacao

Para alteracoes JavaScript:

```powershell
npm run check
```

Para arquivos especificos:

```powershell
node --check app.js
node --check src\server.js
node --check src\models\FinancialEntry.js
```

Para fluxos web, teste quando houver servidor disponivel:

```text
GET /health
GET /dashboard
GET /entries
```

Para banco e seed:

```powershell
npm run seed
```

Se uma validacao nao puder ser executada, informe o motivo na resposta final.

## 17. Git

- Rode `git status --short` antes de mudancas maiores.
- Nao reverta alteracoes de usuario sem pedido explicito.
- Nao use `git reset --hard` ou `git checkout --` sem autorizacao explicita.
- Nao misture refatoracao, feature e formatacao sem necessidade.
- Nao adicione `data/`, `node_modules/` ou arquivos SQLite ao commit.

## 18. Evolucao futura

Itens previstos no PRD, mas ainda nao implementados no MVP atual:

- autenticacao real;
- recorrencias;
- anexos;
- OCR;
- WhatsApp/Evolution API;
- relatorios avancados;
- testes automatizados;
- migracoes formais;
- TypeScript;
- Express/EJS/Drizzle.

Ao implementar qualquer item futuro, preserve os principios atuais:

- competencia mensal como filtro padrao;
- dinheiro em centavos;
- SQL seguro;
- confirmacao humana para dados extraidos automaticamente;
- separacao entre regra de negocio, persistencia e renderizacao.
