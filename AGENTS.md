# AGENTS.md

Instrucoes para agentes de IA trabalhando neste repositorio. O objetivo e gerar
mudancas pequenas, seguras e alinhadas ao EmDia, preservando a regra central do
produto: trabalhar por padrao com contas, receitas e despesas da competencia do
mes corrente.

## Contexto rapido

EmDia e um MVP web local para controle de contas, receitas, vencimentos e
baixas financeiras, baseado no PRD tecnico `PRD_sistema_financas_pessoais.md`.

- Bootstrap principal: `app.js` na raiz.
- Servidor HTTP: `src/server.js`.
- Banco local: SQLite em `data/emdia.sqlite`.
- Conexao e schema: `src/database/connection.js` e `src/database/schema.js`.
- Seed local: `src/database/seed.js`.
- Models: `src/models/*.js`.
- Services: `src/services/*.js`.
- Renderizacao HTML: `src/services/viewEngine.js`.
- Assets estaticos: `public/`.
- Documentacao principal: `README.md`, `PRD_sistema_financas_pessoais.md`,
  `docs/patterns.md` e `docs/architecture.md`.

O MVP atual usa CommonJS, servidor HTTP nativo do Node e `node:sqlite`. Nao
assuma Express, EJS, Drizzle, TypeScript ou dependencias externas apenas porque
o PRD cita essas possibilidades futuras.

## Regra de produto mais importante

As telas operacionais devem abrir filtradas pela competencia do mes corrente do
usuario quando nenhuma competencia for informada.

Isto vale especialmente para:

- dashboard;
- listagem de lancamentos;
- filtros e buscas;
- relatorios mensais futuros;
- calendario financeiro futuro.

A competencia deve usar o formato `YYYY-MM` e deve ser calculada no fuso horario
do usuario. O usuario pode trocar a competencia manualmente, mas essa troca deve
ser explicita e visivel na interface.

## Como trabalhar

- Comece pelos arquivos diretamente relacionados ao pedido.
- Consulte `docs/patterns.md` quando precisar confirmar padroes de codigo,
  banco, rotas, renderizacao, seguranca ou validacao.
- Consulte `docs/architecture.md` quando precisar entender organizacao geral,
  fluxos principais, decisoes tecnicas ou limites do MVP.
- Use `rg` ou `rg --files` para localizar codigo quando disponivel.
- Evite varrer `node_modules`, `data/`, bancos SQLite, arquivos WAL/SHM e
  arquivos gerados.
- Prefira patches pequenos e localizados.
- Nao reescreva `src/services/viewEngine.js`, `src/server.js` ou models inteiros
  quando um ajuste pontual resolve.
- Nao atualize dependencias, `package-lock.json` ou formato global do projeto
  sem pedido explicito.
- Nao altere `.env`, dados SQLite, `node_modules` ou arquivos gerados.
- Nao versionar bancos locais, arquivos `*.sqlite`, `*.sqlite-wal` ou
  `*.sqlite-shm`.
- Antes de mudar comportamento financeiro, confira o PRD para preservar
  competencia, vencimento, status e baixas em tabela propria.
- Quando a mudanca afetar telas, preserve a navegacao mensal: mes anterior,
  proximo mes, seletor de competencia e retorno ao mes atual.


### Assinatura em Task MD

Ao criar ou alterar arquivos `docs/tasks/TASK-*.md`, adicione ao final do arquivo uma assinatura da LLM responsavel pela criacao ou atualizacao da task.

Formato obrigatorio:

```md
---

## Assinatura da LLM

- Data: YYYY-MM-DD
- Modelo: nome-do-modelo
- Versao: versao-do-modelo-quando-disponivel
- Acao: criacao | atualizacao
```

Regras:

- Use a data atual do ambiente.
- Informe o nome do modelo de linguagem usado quando estiver disponivel no ambiente ou na conversa.
- Se a versao exata do modelo nao estiver disponivel, use `nao informado`.
- Nao adicionar assinatura em arquivos de codigo-fonte, views, scripts, configs ou documentacao que nao seja task MD.
- Ao atualizar uma task existente, preserve assinaturas anteriores e adicione uma nova assinatura ao final.
- Nao usar essa assinatura como substituto de commit Git ou changelog.

## Padroes do projeto

Para padroes detalhados de codigo, rotas, models, renderizacao, banco,
frontend, seguranca e validacao, siga `docs/patterns.md`. Para visao estrutural,
fluxos do sistema e decisoes arquiteturais, consulte `docs/architecture.md`.

Regras essenciais:

- Use CommonJS (`require`, `module.exports`). Nao introduza ESM sem migracao
  planejada.
- Mantenha mensagens de usuario em portugues.
- Use valores monetarios em centavos inteiros; nunca use `float` como modelo de
  persistencia financeira.
- Models SQLite devem usar placeholders `?`, nunca concatenacao de SQL com
  entrada do usuario.
- Datas civis devem usar ISO (`YYYY-MM-DD`) e competencias devem usar `YYYY-MM`.
- Instantes de auditoria e criacao/alteracao devem usar `new Date().toISOString()`.
- Regras de negocio devem ficar em models/services, nao espalhadas no servidor
  HTTP ou na renderizacao.
- Renderizacao HTML deve escapar dados de usuario com `escapeHtml`.
- Formularios que alteram dados devem usar POST.
- Baixas financeiras devem ser persistidas em `settlements`; nao sobrescreva
  apenas o valor realizado sem registrar a baixa.
- Atualize status com `deriveStatus` quando alterar valores, vencimento ou baixa.

## Estrutura atual

```text
emdia/
  app.js
  PRD_sistema_financas_pessoais.md
  README.md
  public/
    css/
      styles.css
  src/
    database/
      connection.js
      schema.js
      seed.js
    models/
      AuditLog.js
      Category.js
      FinancialAccount.js
      FinancialEntry.js
      Party.js
      Settlement.js
      User.js
    services/
      dateService.js
      http.js
      id.js
      moneyService.js
      statusService.js
      viewEngine.js
    server.js
```

Algumas pastas podem existir para evolucao futura, mas ainda nao estao em uso
ativo. Nao mova codigo para elas sem necessidade clara.

## Seguranca obrigatoria

- Nunca leia, imprima ou inclua conteudo real de `.env` em respostas, logs ou
  documentacao.
- Nunca registre senhas, tokens, headers sensiveis ou dados bancarios sensiveis
  em `console.log`.
- Escape qualquer dado externo antes de renderizar HTML.
- Nao monte SQL concatenando entrada do usuario.
- Nao exponha arquivos de `data/`, `.git/`, `.env` ou caminhos arbitrarios pelo
  servidor.
- Uploads, OCR, WhatsApp e anexos ainda sao escopo futuro; ao implementa-los,
  valide tipo, tamanho, caminho, origem e confirmacao humana antes de gravar
  lancamentos definitivos.

## Escopo de mudanca

- Correcao pequena: altere apenas o arquivo do fluxo afetado e valide sintaxe.
- Nova tela ou CRUD: adicione model/service/renderizacao/rota somente se todos
  forem necessarios.
- Mudanca no banco: atualize `src/database/schema.js`, seed quando aplicavel e
  preserve compatibilidade com bancos locais existentes quando possivel.
- Mudanca financeira: valide competencia, vencimento, status, centavos inteiros
  e auditoria.
- Refatoracao: faca apenas se solicitada ou se reduzir risco imediato.
- Evite misturar feature, limpeza e formatacao no mesmo patch.

## Comandos uteis

```powershell
npm start
npm run dev
npm run seed
npm run check
node --check app.js
node --check src\server.js
```

Observacoes:

- `npm run check` faz validacao sintatica dos principais arquivos JavaScript.
- `node:sqlite` pode emitir aviso experimental no Node 22; isso e esperado no
  MVP atual.
- O banco local e criado automaticamente em `data/emdia.sqlite`.

## Validacao esperada

- Rode `npm run check` quando alterar JavaScript.
- Se mexer no bootstrap, rode tambem `node --check app.js`.
- Se mexer no servidor, valide `node --check src\server.js`.
- Se mexer em banco, rode `npm run seed` em ambiente local seguro.
- Se mexer em dashboard/listagem, teste ao menos:
  - `GET /health`;
  - `GET /dashboard`;
  - `GET /entries`.
- Para CSS ou HTML, abra a tela afetada quando houver servidor disponivel ou
  descreva que a validacao visual nao foi executada.
- Se uma validacao nao puder ser executada, informe claramente o motivo.

## Git e preservacao do trabalho local

- Verifique `git status --short` antes de mudancas maiores.
- Nao reverta alteracoes existentes sem pedido explicito.
- Se houver mudancas de usuario no mesmo arquivo, leia com cuidado e preserve-as.
- Nao use `git reset --hard`, `git checkout --` ou comandos destrutivos sem
  autorizacao explicita.
- Nao adicione `data/`, `node_modules/`, arquivos SQLite ou artefatos locais ao
  commit.

## Resposta final do agente

Ao concluir, responda de forma breve:

- arquivos alterados;
- comportamento implementado ou corrigido;
- validacoes executadas;
- riscos ou pendencias relevantes.

Nao cole trechos longos de codigo se o arquivo ja foi alterado no workspace.

Ao concluir a implementacao de uma task MD, informe de forma alarmante ao usuario a necessidade de fazer o `git commit`.
