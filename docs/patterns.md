# Padrões do Projeto EmDia

Este documento descreve os padrões técnicos esperados para evoluir o EmDia com
mudanças pequenas, seguras e alinhadas ao PRD. Use este arquivo como referência
antes de alterar código, banco, rotas, telas ou regras financeiras.

## 1. Principio central do produto

O EmDia trabalha por competência mensal.

Quando nenhuma competência for informada, telas operacionais devem usar a
competência do mês corrente do usuário como filtro padrão. Depois de uma
seleção explícita, todas as telas com filtro mensal — Dashboard, Agenda e
Lançamentos — reutilizam a última competência válida persistida para o usuário.
Sem preferência válida, continuam usando o mês corrente no fuso do usuário.

Isso vale para:

- dashboard;
- agenda;
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

Esse formato ISO deve ser preservado na persistência, nas regras de negócio e
nos valores de campos HTML de data. Na apresentação textual ao usuário, use
`formatCivilDate` para exibir `DD/MM/AAAA`. Não converta datas civis com fuso
horário.

Instantes técnicos, como criação, atualização e auditoria, devem usar ISO string
com `new Date().toISOString()`.

## 2. Stack atual

O MVP atual usa:

- Node.js `>=24.15.0 <25`;
- CommonJS;
- Express 5.x;
- SQLite via `node:sqlite`;
- HTML renderizado no servidor por views em `src/views/*.js`;
- `src/services/viewEngine.js` como agregador de exports das views;
- CSS puro em `public/css/styles.css`;
- ícones SVG via `lucide-static`, renderizados por helper server-side.

O runtime deve respeitar a linha 24 homologada no `package.json`. O CI valida
tanto o piso 24.15.0 quanto o patch mais recente da linha 24; novas linhas
principais exigem validação e migração explícitas.

Não assuma EJS, TypeScript, Drizzle ou bibliotecas de UI no código atual. Essas
tecnologias podem aparecer no PRD como evolução futura, mas não fazem parte da
implementação vigente.

## 3. Organização de arquivos

Estrutura principal:

```text
app.js
src/server.js
src/routes/*.js
src/middleware/*.js
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
- `src/server.js`: composition root do Express e ordem global do pipeline HTTP.
- `src/routes/*.js`: registro de rotas agrupadas por domínio.
- `src/middleware/auth.js`: sessão, autenticação, autorização e CSRF.
- `src/middleware/errors.js`: formato de resposta e handlers finais 404/405/500.
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

### Transações SQLite

Toda nova unidade transacional deve usar `src/database/transaction.js`:

```js
withTransaction(db, (connection) => {
  // leituras e gravações atômicas
});

withImmediateTransaction(db, (connection) => {
  // leitura de condição seguida de gravação
});
```

- callbacks são exclusivamente síncronos e seu retorno é devolvido pelo helper;
- sucesso produz um único `COMMIT`;
- exceção produz `ROLLBACK` e o mesmo erro original é relançado;
- falha do rollback fica disponível em `error.rollbackError`, sem substituir a
  causa original;
- resultados funcionais como `not-found` ou `last-admin` devem ser retornados
  pelo callback, permitindo que a transação termine normalmente;
- transações aninhadas na mesma conexão são rejeitadas com
  `SQLITE_NESTED_TRANSACTION`; não use `SAVEPOINT` sem um caso real;
- baixa, estorno e proteção do último administrador usam
  `withImmediateTransaction`;
- não adicione retry automático a operações financeiras.

As conexões operacionais usam `PRAGMA busy_timeout = 5000`. O probe de
restauração em `databaseBackupService` mantém `busy_timeout = 0` e
`BEGIN EXCLUSIVE` explícitos porque sua finalidade é detectar imediatamente se
o banco ativo está em uso, não executar uma unidade de negócio.

### Backup e restauração

- Use `databaseBackupService`; não copie somente `emdia.sqlite` com o banco em
  WAL.
- Backups gerenciados ficam em `EMDIA_BACKUP_DIR` ou em `backups/` por padrão.
- Toda criação deve usar a API nativa `node:sqlite.backup`, verificar
  `integrity_check` e `foreign_key_check` e gerar manifesto com SHA-256.
- Verificação abre o arquivo em modo somente leitura e exige a tabela
  `schema_migrations`.
- Restauração exige confirmação explícita, aplicação encerrada e lock
  operacional livre.
- Antes de substituir o destino, crie um backup `before-restore` do banco
  atual.
- Prepare a restauração no mesmo volume, verifique antes e depois da troca e
  recupere o arquivo original se a substituição falhar.
- Restrinja origens de restauração ao diretório configurado e rejeite symlinks,
  diretórios, extensões inesperadas e path traversal.
- Nunca use `data/emdia.sqlite` em testes; use diretórios temporários.
- Retenção automática permanece desabilitada até existir política aprovada.

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
3. validar conta financeira, valor, modo de conclusão e eventual confirmação
   de excedente;
4. criar settlement;
5. atualizar valor realizado e status do lançamento;
6. registrar auditoria.

Elegibilidade, validação dependente do saldo, criação do settlement, atualização
do lançamento e auditoria devem ocorrer na mesma transação. Lançamentos pagos,
recebidos, cancelados, em rascunho, sem saldo ou com status incompatível não
aceitam nova baixa. A interface deve orientar o usuário, mas o bloqueio no model
é obrigatório.

O saldo em aberto deve ser sugerido como principal da próxima baixa, sem atuar
como limite máximo. Quando a soma realizada após a nova baixa superar o valor
previsto, a interface deve informar o excedente e exigir confirmação explícita.
Essa confirmação também deve ser validada no model, dentro da transação.

Quando o total realizado projetado ficar abaixo do previsto, o usuário deve
escolher explicitamente entre manter a diferença em aberto ou quitar pelo valor
realizado. A opção parcial é o padrão. A quitação por valor menor deve ser
persistida no settlement que encerrou o lançamento, sem alterar o previsto nem
converter automaticamente a diferença em desconto.

Status, elegibilidade e estorno devem considerar somente settlements
encerradores vigentes. Ao estornar a baixa encerradora, recalcule o total, a
existência de outra baixa encerradora e o status na mesma transação.

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
status com `deriveStatus`. Informe ao serviço se existe settlement encerrador
vigente para que uma quitação abaixo do previsto permaneça `PAID` ou
`RECEIVED`.

## 10. Rotas HTTP

`src/server.js` cria o app e monta o pipeline. As rotas ficam agrupadas por
domínio em `src/routes/*.js`, usando exclusivamente o padrão:

```js
function registerDomainRoutes(app, dependencies) {
  app.get("/domain", handler);
}
```

Para adicionar uma rota, use o módulo do domínio existente ou crie um novo
`*Routes.js`; não registre regras de domínio diretamente em `server.js`.
Dependências HTTP compartilhadas devem ser importadas de services ou recebidas
explicitamente, sem criar ciclos entre módulos de rota.

A ordem global deve permanecer visível no composition root:

1. assets, parsers e identificação do formato de resposta;
2. health e readiness sem autenticação;
3. carregamento de sessão e login;
4. autenticação obrigatória;
5. módulos protegidos;
6. handlers finais de 404/405 e erro inesperado.

Padrões:

- GET renderiza telas ou retorna informações de leitura.
- POST altera dados.
- Redirecione após POST com status 303.
- Use `express.urlencoded({ extended: false, limit: "1mb" })` para formulários
  URL encoded.
- Use `src/services/http.js` para respostas HTML, redirects 303, JSON
  pretty-print, query string escalar e detalhes normalizados da requisição.
- Sirva assets com o prefixo `/public` por `express.static`.
- Referencie CSS, JavaScript e favicon das views com
  `versionedAssetPath`, de `src/config/release.js`. A versão deriva do
  sequencial da release e evita reutilização de assets antigos após publicação.
- Preserve URLs com `competence` quando a tela fizer parte do fluxo mensal.
- Em `GET /dashboard`, `GET /calendar` e `GET /entries`, uma competência válida
  da URL tem precedência e atualiza `users.last_competence`; sem valor válido,
  use a preferência salva e, por fim, o mês corrente.
- Use `monthlyCompetenceService` para manter essa resolução compartilhada entre
  as telas participantes.
- Não atualize essa preferência ao exportar CSV, abrir formulário ou visualizar
  detalhe isoladamente.

Erros inesperados devem ser tratados pelo middleware global com estas regras:

- gerar um código de diagnóstico aleatório e não derivado da requisição;
- registrar detalhes técnicos somente no log operacional, relacionando o
  evento ao código por `requestId`;
- devolver mensagem genérica ao usuário, sem `err.message`, stack trace, SQL ou
  caminhos internos;
- usar a view compartilhada de erro para HTML;
- preservar resposta JSON nas rotas que já possuem esse contrato, inclusive
  quando a falha ocorrer antes da autenticação;
- delegar ao Express quando os headers já tiverem sido enviados.

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
para uso nos módulos de rota, não como destino padrão para implementar telas
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

### 12.1. Botões e links de ação

A aparência de um botão deve ser sempre explícita. O seletor global `button`
pode normalizar propriedades nativas, como a fonte, mas não deve definir cor,
borda, sombra, espaçamento ou estados visuais.

- ações comuns devem usar a classe-base `button` e exatamente uma variante:
  `button--primary`, `button--secondary` ou `button--danger`;
- em views, prefira `actionButton` para elementos `button` e `buttonLink` para
  links com aparência de botão;
- `actionButton` usa `button--primary` por padrão e `buttonLink` usa
  `button--secondary` por padrão; informe `tone` quando a intenção for outra;
- controles especializados, como `record-action-button`,
  `toolbar-icon-button`, `user-menu-item`, `notification-close` e o seletor de
  ícones de categoria, devem possuir componente próprio e não devem herdar
  estilos visuais por serem elementos `button`;
- não use cadeias de `:not()` para impedir que um estilo genérico alcance
  componentes especializados;
- não crie novas variantes visuais locais quando uma das variantes do
  componente atender à intenção da ação;
- toda nova ocorrência literal de `<button>` em `src/views` deve declarar uma
  classe de componente reconhecida. O teste `buttonComponent.test.js` protege
  essa regra.

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
- novas senhas exigem no mínimo 12 caracteres pelo helper central de
  `authService`; hashes existentes não são rejeitados pela nova política;
- alterações de senha revogam as sessões do usuário;
- o limitador de login usa IP confiável e e-mail normalizado, nunca senha ou
  e-mail completo em logs; múltiplas instâncias exigem storage compartilhado;
- o cadastro público usa token CSRF assinado em cookie `HttpOnly`, limitado no
  tempo e validado junto ao campo do formulário; tentativas são limitadas por
  IP e logs usam somente a impressão do e-mail;
- cadastro público sempre força `is_active = 1` e `is_admin = 0`; usuário,
  contas e categorias iniciais são criados na mesma transação e a sessão nasce
  somente após o commit;
- preserve a CSP sem `unsafe-inline`: use assets locais, atributos `data-*` e
  classes CSS em vez de handlers ou estilos inline;
- HSTS só pode ser habilitado quando HTTPS estiver garantido;
- limpeza de sessões deve ser periódica, indexada e limitada, nunca executada
  em toda requisição;
- `/health` é liveness leve; `/ready` valida SQLite e migrations e retorna
  `503` sem detalhes internos quando a dependência obrigatória falha.

Se os parâmetros do `scrypt` forem alterados no futuro, mantenha a identificação
do esquema no hash e faça rehash oportunista após autenticação válida, sem
rotação forçada em massa.

## 16. Validação

Para alterações JavaScript:

```powershell
npm run check
npm test
```

`npm test` usa a descoberta `test/**/*.test.js`. Novas suítes devem seguir esse
padrão; arquivos em `test/helpers/` não devem terminar em `.test.js`.

Regras de testes:

- priorize risco crítico (finanças, atomicidade, migrations e backup), depois
  risco alto (sessões, autorização, administração, contas, categorias e erro
  global);
- use `node:test` e Supertest, sem adicionar outro framework;
- use `test/helpers/testDatabase.js` para o singleton isolado em `:memory:`;
- use uma `DatabaseSync` em memória ou diretório temporário quando a suíte
  precisar controlar schema, concorrência ou arquivos;
- nunca abra `data/emdia.sqlite`; o helper compartilhado deve falhar se o
  caminho não for `:memory:`;
- mantenha fixtures pequenas e explícitas;
- injete falhas com migrations controladas ou triggers temporárias e sempre
  confirme rollback;
- não dependa da porta 3000, de rede externa ou de relógio real;
- mantenha `--test-concurrency=1` enquanto a conexão da aplicação for singleton;
- para mudanças na infraestrutura de testes, execute `npm test` duas vezes e
  confirme que `git status` não contém bancos ou artefatos.

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
- no cadastro, persistir o celular brasileiro informado no formato canônico
  E.164 e gerar localmente o alias legado sem o nono dígito; o alias não é
  editável e não exige consulta ao WAHA;
- na entrada, procurar usuário ativo pelas duas colunas, preservar unicidade
  cruzada entre elas e registrar `exact` ou `legacy_alias` no diagnóstico;
- usar timeout com `AbortController`;
- nunca registrar chave ou texto integral da mensagem; telefone completo só é
  permitido na exceção documentada de `whatsapp.webhook.ignored` com motivo
  `user_not_found`;
- manter segredos apenas no ambiente e valores vazios no `.env.example`.
- eventos do fluxo de comprovantes usam a outbox `notifications`, nunca envio
  direto dentro do webhook, worker ou transação financeira;
- a entrada bem-sucedida em `receipt_imports` permanece silenciosa; somente
  falha definitiva antes da fila, falha definitiva de processamento,
  `NEEDS_REVIEW` e `APPROVED` são eventos configuráveis;
- retries intermediários não geram alerta e cada evento usa chave idempotente
  sem telefone ou conteúdo da mensagem;
- falha ao criar ou enviar o aviso não pode reverter status já persistido nem a
  aprovação financeira.
- mensagens de comprovantes podem apresentar os dados pertinentes já
  persistidos para aquele usuário: campos identificados em `NEEDS_REVIEW` e
  dados finais do lançamento em `APPROVED`; normalizar textos em uma linha,
  omitir campos ausentes e nunca usar resposta bruta do provedor;
- links de revisão, comprovante ou lançamento devem derivar somente de
  `APP_BASE_URL` validada e de IDs cuja propriedade foi confirmada no model.

## 19.1. E-mail transacional

- Cadastros públicos devem inserir `EMAIL/ACCOUNT_CREATED` na tabela
  `notifications` dentro da mesma transação de usuário, contas e categorias.
- Chamadas ao Resend são sempre assíncronas, fora da transação e da resposta
  HTTP. O worker usa lote pequeno, chave `Idempotency-Key` persistida e backoff.
- Desenvolvimento e testes usam o cliente `mock`; produção usa `resend` com
  `EMAIL_FROM=EmDia <nao-responda@idevs.com.br>` e domínio verificado.
- O cliente envia HTML e texto puro por `fetch` nativo, com timeout. API key,
  endereço completo, corpo da mensagem, headers e resposta bruta não entram em
  logs.
- `SENT` significa aceito pelo provedor, não entregue ao destinatário.
- Falhas 429/5xx e de rede podem ser reagendadas; erros 4xx e configuração
  inválida encerram as tentativas automáticas e ficam visíveis na administração.

## 20. Cabeçalhos das páginas internas

Toda view renderizada pelo layout autenticado deve usar `pageHeading`, de
`src/services/viewHelpers.js`, para produzir a section principal com a classe
`page-heading` e exatamente um `h1`.

Regras:

- usar o `h1` para identificar a página, não apenas o mês ou filtro atual;
- informar contexto curto em `eyebrow` e descrição opcional;
- informar em `icon` um nome válido do `lucide-static` que represente a tela;
- reutilizar o mesmo ícone da navegação quando a tela já estiver presente no
  menu;
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
`monthSwitcher` também deve receber e repassar `icon` ao `pageHeading`.

## 21. Diagnóstico seguro do ambiente

Informações do processo usadas para suporte devem ser coletadas em service
dedicado e entregues às views já normalizadas e sanitizadas.

Regras:

- usar allowlist para variáveis de ambiente; nunca enumerar `process.env` na
  interface;
- omitir valores de senha, token, chave, sessão, URL, caminho e credencial;
- não ler o arquivo `.env` para montar páginas de diagnóstico;
- converter caminhos de módulos internos em identificadores relativos ao
  projeto e pacotes externos somente em nomes de pacote;
- não expor diretório pessoal, hostname, IP, MAC ou caminhos absolutos;
- não executar shell, varrer `node_modules` ou testar serviços externos durante
  uma requisição de diagnóstico;
- tratar indisponibilidade parcial sem devolver stack trace ou detalhes
  internos;
- manter a view responsável apenas pela apresentação e pelo escape HTML.
## Padrão para webhooks e arquivos de comprovantes

- Webhooks públicos usam parser bruto específico, HMAC antes do JSON e limite
  de corpo; não passam por sessão ou CSRF.
- O handler persiste idempotentemente e responde sem executar download ou IA.
- Chamadas externas nunca ocorrem dentro de transação SQLite.
- Arquivos recebidos não ficam em `public/`: valide origem, tamanho, MIME,
  assinatura binária e chave interna antes de armazenar ou servir.
- Logs operacionais registram apenas IDs técnicos internos e códigos
  normalizados; payload, telefone, URL da mídia, valores e segredos são
  proibidos, exceto pelo E.164 nos casos explicitamente permitidos abaixo.
- Logs de webhook devem indicar etapa e resultado e podem registrar sessão
  WAHA, engine, flags de mídia, MIME, timestamp e referências técnicas. Quando
  a correlação do remetente for necessária, use HMAC local truncado. A única
  exceção para E.164 completo é o diagnóstico de `user_not_found`; chat ID e
  LID completos permanecem proibidos.
- Extrações automatizadas sempre exigem conferência humana antes de criar
  lançamento financeiro. Pagamentos confirmados geram uma linha em
  `settlements` e usam centavos inteiros.
- O pareamento de comprovantes usa serviço local e determinístico: normalize o
  favorecido, aplique o limiar fuzzy centralizado e compare o valor com a margem
  definida sobre o total previsto. A busca automática e a seleção manual devem
  ser isoladas por usuário e considerar somente despesas elegíveis à baixa.
- Ao vincular comprovante a lançamento existente, reutilize o núcleo
  transacional de baixa. `receipt_imports.financial_entry_id` e
  `receipt_imports.settlement_id`, status, auditorias e settlement devem ser
  persistidos na mesma transação; notificações continuam somente depois do
  commit.
- Falhas do OpenRouter devem distinguir request, decodificação HTTP, erro do
  provedor, saída estruturada e validação de schema. Registre somente códigos,
  status, tipos, tamanhos, modelo e duração; nunca corpo da resposta, prompt ou
  texto extraído.
