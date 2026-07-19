# AGENTS.md

Instrucoes para agentes de IA trabalhando neste repositorio. O objetivo e gerar
mudanças pequenas, seguras e alinhadas ao EmDia, preservando a regra central do
produto: trabalhar por padrão com contas, receitas e despesas da competência do
mês corrente.

## Contexto rápido

EmDia e um MVP web local para controle de contas, receitas, vencimentos e
baixas financeiras, baseado no PRD técnico `PRD_sistema_financas_pessoais.md`.

- Bootstrap principal: `app.js` na raiz.
- Servidor HTTP: `src/server.js`.
- Banco local: SQLite em `data/emdia.sqlite`.
- Conexao e schema: `src/database/connection.js` e `src/database/schema.js`.
- Seed local: `src/database/seed.js`.
- Models: `src/models/*.js`.
- Services: `src/services/*.js`.
- Views HTML: `src/views/*.js`.
- Agregador de views: `src/services/viewEngine.js`.
- Assets estáticos: `public/`.
- Documentacao principal: `README.md`, `PRD_sistema_financas_pessoais.md`,
  `docs/patterns.md` e `docs/architecture.md`.

O MVP atual usa Node.js `>=24.15.0 <25`, CommonJS, Express, `node:sqlite` e `lucide-static` para ícones
SVG. Não assuma EJS, Drizzle, TypeScript ou outras dependências externas apenas
porque o PRD cita essas possibilidades futuras.

## Regra de produto mais importante

As telas operacionais devem abrir filtradas pela competência do mês corrente do
usuário quando nenhuma competência for informada.

Isto vale especialmente para:

- dashboard;
- listagem de lançamentos;
- filtros e buscas;
- relatórios mensais futuros;
- calendario financeiro futuro.

A competência deve usar o formato `YYYY-MM` e deve ser calculada no fuso horario
do usuário. O usuário pode trocar a competência manualmente, mas essa troca deve
ser explícita e visível na interface.

## Como trabalhar

- Comece pelos arquivos diretamente relacionados ao pedido.
- Consulte `docs/patterns.md` quando precisar confirmar padrões de código,
  banco, rotas, renderização, segurança ou validação.
- Consulte `docs/architecture.md` quando precisar entender organização geral,
  fluxos principais, decisões técnicas ou limites do MVP.
- Use `rg` ou `rg --files` para localizar código quando disponível.
- Evite varrer `node_modules`, `data/`, bancos SQLite, arquivos WAL/SHM e
  arquivos gerados.
- Prefira patches pequenos e localizados.
- Não reescreva `src/server.js`, models inteiros ou views inteiras quando um
  ajuste pontual resolve.
- Para novas telas, prefira criar ou alterar arquivos em `src/views/*.js` e
  exporta-los por `src/services/viewEngine.js`, que deve atuar como agregador.
- Não atualize dependências, `package-lock.json` ou formato global do projeto
  sem pedido explícito.
- Não altere `.env`, dados SQLite, `node_modules` ou arquivos gerados.
- Não versionar bancos locais, arquivos `*.sqlite`, `*.sqlite-wal` ou
  `*.sqlite-shm`.
- Antes de mudar comportamento financeiro, confira o PRD para preservar
  competência, vencimento, status e baixas em tabela própria.
- Quando a mudanca afetar telas, preserve a navegação mensal: mês anterior,
  próximo mês, seletor de competência e retorno ao mês atual.
- Ao concluir a implementação de uma Task MD, atualize o controle de release em `src/config/release.js`,
  usando a data/hora atual do ambiente e incrementando em 1 o número sequencial no formato `Release DD/MM/YYYY HH:mm - NNN`.


### Assinatura em Task MD

Ao criar ou alterar arquivos `docs/tasks/TASK-*.md`, adicione ao final do arquivo uma assinatura da LLM responsável pela criação ou atualização da task.

Formato obrigatório:

```md
---

## Assinatura da LLM

- Data: (data e hora)
- Modelo: nome-do-modelo
- Versao: versao-do-modelo-quando-disponivel
- Acao: criacao | atualizacao
```

Regras:

- Use a data atual do ambiente.
- Informe o nome do modelo de linguagem usado quando estiver disponível no ambiente ou na conversa.
- Se a versao exata do modelo não estiver disponível, use `não informado`.
- Não adicionar assinatura em arquivos de código-fonte, views, scripts, configs ou documentacao que não seja task MD.
- Ao atualizar uma task existente, preserve assinaturas anteriores e adicione uma nova assinatura ao final.
- Não usar essa assinatura como substituto de commit Git ou changelog.

## Padrões do projeto

Para padrões detalhados de código, rotas, models, renderização, banco,
frontend, segurança e validação, siga `docs/patterns.md`. Para visão estrutural,
fluxos do sistema e decisões arquiteturais, consulte `docs/architecture.md`.

Regras essenciais:

- Use CommonJS (`require`, `module.exports`). Não introduza ESM sem migracao
  planejada.
- Mantenha mensagens de usuário em português.
- Use `lucide-static` como fonte padrão de ícones da interface, preferindo o
  helper `lucideIcon` em vez de SVGs avulsos nas views.
- Use valores monetarios em centavos inteiros; nunca use `float` como modelo de
  persistência financeira.
- Models SQLite devem usar placeholders `?`, nunca concatenacao de SQL com
  entrada do usuário.
- Datas civis devem usar ISO (`YYYY-MM-DD`) e competências devem usar `YYYY-MM`.
- Instantes de auditoria e criação/alteração devem usar `new Date().toISOString()`.
- Regras de negocio devem ficar em models/services, não espalhadas no servidor
  HTTP ou na renderização.
- Renderização HTML deve escapar dados de usuário com `escapeHtml`.
- Views devem usar `layout.js` para estrutura comum e `viewHelpers.js` para
  helpers como `escapeHtml`, `csrfInput`, `buttonContent`, `buttonLink`,
  `option`, labels e ícones.
- Formulários que alteram dados devem usar POST.
- Baixas financeiras devem ser persistidas em `settlements`; não sobrescreva
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
    views/
      layout.js
      *View.js
    server.js
```

`src/views/` e ativo e deve receber a implementação das telas. O arquivo
`src/services/viewEngine.js` permanece como ponto central de exportacao das
views para compatibilidade com o servidor.

## Segurança obrigatória

- Nunca leia, imprima ou inclua conteúdo real de `.env` em respostas, logs ou
  documentacao.
- Nunca registre senhas, tokens, headers sensiveis ou dados bancarios sensiveis
  em `console.log`.
- Escape qualquer dado externo antes de renderizar HTML.
- Não monte SQL concatenando entrada do usuário.
- Não exponha arquivos de `data/`, `.git/`, `.env` ou caminhos arbitrarios pelo
  servidor.
- Uploads, OCR, WhatsApp e anexos ainda sao escopo futuro; ao implementa-los,
  valide tipo, tamanho, caminho, origem e confirmação humana antes de gravar
  lançamentos definitivos.

## Escopo de mudanca

- Correção pequena: altere apenas o arquivo do fluxo afetado e valide sintaxe.
- Nova tela ou CRUD: adicione model/service/renderização/rota somente se todos
  forem necessários.
- Mudanca no banco: atualize `src/database/schema.js`, seed quando aplicavel e
  preserve compatibilidade com bancos locais existentes quando possível.
- Mudanca financeira: valide competência, vencimento, status, centavos inteiros
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

Observações:

- `npm run check` faz validação sintatica dos principais arquivos JavaScript.
- Use Node.js `>=24.15.0 <25`; outras linhas principais não são homologadas.
- No Node.js 24.15+, `node:sqlite` está em estágio release candidate.
- O banco local e criado automaticamente em `data/emdia.sqlite`.

## Validação esperada

- Rode `npm run check` quando alterar JavaScript.
- Se mexer no bootstrap, rode também `node --check app.js`.
- Se mexer no servidor, valide `node --check src\server.js`.
- Se mexer em banco, rode `npm run seed` em ambiente local seguro.
- Se mexer em dashboard/listagem, teste ao menos:
  - `GET /health`;
  - `GET /dashboard`;
  - `GET /entries`.
- Para CSS ou HTML, abra a tela afetada quando houver servidor disponível ou
  descreva que a validação visual não foi executada.
- Se uma validação não puder ser executada, informe claramente o motivo.

## Validação com servidor local

- A porta `3000` e exclusiva do usuário/desenvolvedor e pode estar ocupada por
  `npm run dev`.
- O agente nunca deve iniciar, testar, reutilizar ou encerrar processos na porta
  `3000`.
- Para validações HTTP próprias, o agente deve usar a porta `3100` como padrão.
- Sempre iniciar o servidor de validação com a variavel `PORT` definida
  explicitamente.
- Se `3100` estiver ocupada, usar a próxima porta livre a partir de `3101`.
- Ao iniciar servidor para validação, capturar o PID do processo iniciado.
- Ao finalizar a validação, encerrar somente o processo iniciado pelo próprio
  agente.
- Nunca encerrar processos descobertos por porta quando eles não foram iniciados
  pelo agente.

## Git e preservacao do trabalho local

- Verifique `git status --short` antes de mudanças maiores.
- Não reverta alterações existentes sem pedido explícito.
- Se houver mudanças de usuário no mesmo arquivo, leia com cuidado e preserve-as.
- Não use `git reset --hard`, `git checkout --` ou comandos destrutivos sem
  autorizacao explícita.
- Não adicione `data/`, `node_modules/`, arquivos SQLite ou artefatos locais ao
  commit.

## Resposta final do agente

Ao concluir, responda de forma breve:

- arquivos alterados;
- comportamento implementado ou corrigido;
- validações executadas;
- riscos ou pendencias relevantes.

Não cole trechos longos de código se o arquivo já foi alterado no workspace.

Ao concluir a implementação de uma task MD, informe de forma alarmante ao usuário a necessidade de fazer o `git commit`.

## Execução de comandos no Windows

- Execute comandos PowerShell e processos externos sequencialmente.
- Não dispare várias chamadas de shell em paralelo.
- Agrupe leituras de arquivos em um único comando PowerShell quando possível.
- Se ocorrer `CreateProcessAsUserW failed`, repita o comando uma vez de forma sequencial.
