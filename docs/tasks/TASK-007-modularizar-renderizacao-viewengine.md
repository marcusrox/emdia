# TASK-007 - Modularizar renderizacao do viewEngine

## Contexto

O arquivo `src/services/viewEngine.js` concentra hoje muitas responsabilidades:

- layout base da aplicacao;
- topo e navegacao;
- helpers de HTML e labels;
- formularios;
- tabelas;
- telas completas;
- leitura de arquivos estaticos;
- montagem manual de HTML com template strings.

Essa concentracao foi aceitavel para o MVP inicial, pois manteve a stack simples
e sem dependencias externas. Com a evolucao do EmDia, o arquivo esta ficando
grande e menos escalavel, dificultando manutencao, revisao e aplicacao do
principio de responsabilidade unica.

Antes de introduzir uma engine de templates, a primeira etapa recomendada e
modularizar a renderizacao atual em arquivos menores, mantendo CommonJS e as
strings HTML ja usadas pelo projeto.

## Objetivo

Dividir `src/services/viewEngine.js` em modulos menores e mais coesos, sem
alterar o comportamento visual ou funcional das telas.

## Escopo

- Extrair helpers reutilizaveis de apresentacao para modulo proprio.
- Separar o layout base e componentes compartilhados em modulo proprio.
- Separar renderizacao por area/tela em arquivos menores.
- Preservar as funcoes publicas atualmente consumidas por `src/server.js`.
- Manter CommonJS e servidor HTTP nativo.
- Nao introduzir engine de templates nesta etapa.
- Nao alterar rotas, models, schema ou regras de negocio.
- Garantir que HTML continue escapando dados de usuario corretamente.

## Fora do escopo

- Migrar para EJS, Nunjucks, Handlebars, Eta ou outra engine de templates.
- Migrar para Express ou framework web.
- Alterar layout visual, CSS ou componentes alem do necessario para a separacao
  de arquivos.
- Refatorar regras financeiras, models ou services nao relacionados a
  renderizacao.
- Renomear rotas ou contratos usados pelo servidor.

## Estrutura sugerida

A estrutura final pode ser ajustada durante a implementacao, mas a modularizacao
deve seguir uma organizacao parecida com:

```text
src/
  services/
    viewEngine.js
    viewHelpers.js
  views/
    layout.js
    dashboardView.js
    entriesView.js
    accountsView.js
    categoriesView.js
    settingsView.js
```

Alternativamente, se fizer mais sentido manter tudo sob `src/services/`, usar:

```text
src/
  services/
    viewEngine.js
    viewHelpers.js
    views/
      layout.js
      dashboard.js
      entries.js
      accounts.js
      categories.js
      settings.js
```

## Diretrizes de implementacao

- `viewEngine.js` deve virar uma fachada pequena, exportando as mesmas funcoes
  usadas hoje por `server.js`.
- Helpers como `escapeHtml`, `option`, labels de tipos, `csrfInput` e formatacoes
  simples devem ficar centralizados.
- `layout` deve ficar separado das telas especificas.
- Tabelas e formularios complexos podem ficar junto da tela correspondente nesta
  etapa, evitando modularizacao excessiva.
- Cada arquivo novo deve ter responsabilidade clara.
- Preservar textos em portugues.
- Evitar mudancas visuais nesta task; qualquer ajuste visual deve ter task
  propria.

## Criterios de aceite

- `src/services/viewEngine.js` deixa de concentrar todas as telas e helpers.
- `src/server.js` continua importando as mesmas funcoes ou exige mudanca minima
  e localizada.
- Todas as telas atuais continuam renderizando:
  - `/dashboard`;
  - `/entries`;
  - `/entries/new`;
  - detalhe/edicao de lancamento;
  - `/accounts`;
  - `/categories`;
  - `/settings`;
  - login;
  - 404.
- Nenhum comportamento financeiro e alterado.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
```

Quando for necessario validar HTTP, usar a regra do `AGENTS.md`:

```powershell
$env:PORT = "3100"
node app.js
```

Fluxos manuais:

- acessar `/login`;
- fazer login;
- acessar `/dashboard`;
- acessar `/entries`;
- acessar `/entries/new`;
- abrir um lancamento existente, se houver;
- acessar `/accounts`;
- acessar `/categories`;
- acessar `/settings`;
- confirmar que a preferencia de tamanho de fonte continua aplicada.

## Observacao sobre templates

Esta task nao adota engine de templates. Ela prepara o codigo para uma possivel
migracao futura, reduzindo o tamanho e a responsabilidade de
`src/services/viewEngine.js` sem aumentar a complexidade da stack atual.

## Observacao de implementacao

Esta task registra o escopo solicitado, mas a implementacao ainda nao deve ser
feita neste momento.

## Implementacao

- `src/services/viewEngine.js` foi reduzido para uma fachada de exportacao das
  views usadas por `src/server.js`.
- Helpers de renderizacao foram extraidos para `src/services/viewHelpers.js`.
- Layout, barra mensal e cards foram extraidos para `src/views/layout.js`.
- Login, dashboard, lancamentos, contas, categorias, configuracoes e 404 foram
  separados em arquivos de view especificos em `src/views/`.
- `npm run check` foi atualizado para validar sintaticamente os novos modulos de
  renderizacao.
- Nenhuma rota, regra financeira ou engine de templates foi alterada.

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
