# TASK-007 - Modularizar renderização do viewEngine

## Contexto

O arquivo `src/services/viewEngine.js` concentra hoje muitas responsabilidades:

- layout base da aplicação;
- topo e navegação;
- helpers de HTML e labels;
- formulários;
- tabelas;
- telas completas;
- leitura de arquivos estáticos;
- montagem manual de HTML com template strings.

Essa concentracao foi aceitavel para o MVP inicial, pois manteve a stack simples
e sem dependências externas. Com a evolução do EmDia, o arquivo esta ficando
grande e menos escalável, dificultando manutenção, revisão e aplicação do
principio de responsabilidade única.

Antes de introduzir uma engine de templates, a primeira etapa recomendada e
modularizar a renderização atual em arquivos menores, mantendo CommonJS e as
strings HTML já usadas pelo projeto.

## Objetivo

Dividir `src/services/viewEngine.js` em módulos menores e mais coesos, sem
alterar o comportamento visual ou funcional das telas.

## Escopo

- Extrair helpers reutilizáveis de apresentacao para módulo próprio.
- Separar o layout base e componentes compartilhados em módulo próprio.
- Separar renderização por área/tela em arquivos menores.
- Preservar as funções públicas atualmente consumidas por `src/server.js`.
- Manter CommonJS e servidor HTTP nativo.
- Não introduzir engine de templates nesta etapa.
- Não alterar rotas, models, schema ou regras de negocio.
- Garantir que HTML continue escapando dados de usuário corretamente.

## Fora do escopo

- Migrar para EJS, Nunjucks, Handlebars, Eta ou outra engine de templates.
- Migrar para Express ou framework web.
- Alterar layout visual, CSS ou componentes além do necessário para a separacao
  de arquivos.
- Refatorar regras financeiras, models ou services não relacionados a
  renderização.
- Renomear rotas ou contratos usados pelo servidor.

## Estrutura sugerida

A estrutura final pode ser ajustada durante a implementação, mas a modularizacao
deve seguir uma organização parecida com:

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

## Diretrizes de implementação

- `viewEngine.js` deve virar uma fachada pequena, exportando as mesmas funções
  usadas hoje por `server.js`.
- Helpers como `escapeHtml`, `option`, labels de tipos, `csrfInput` e formatacoes
  simples devem ficar centralizados.
- `layout` deve ficar separado das telas especificas.
- Tabelas e formulários complexos podem ficar junto da tela correspondente nesta
  etapa, evitando modularizacao excessiva.
- Cada arquivo novo deve ter responsabilidade clara.
- Preservar textos em português.
- Evitar mudanças visuais nesta task; qualquer ajuste visual deve ter task
  própria.

## Critérios de aceite

- `src/services/viewEngine.js` deixa de concentrar todas as telas e helpers.
- `src/server.js` continua importando as mesmas funções ou exige mudanca mínima
  e localizada.
- Todas as telas atuais continuam renderizando:
  - `/dashboard`;
  - `/entries`;
  - `/entries/new`;
  - detalhe/edição de lançamento;
  - `/accounts`;
  - `/categories`;
  - `/settings`;
  - login;
  - 404.
- Nenhum comportamento financeiro e alterado.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Quando for necessário validar HTTP, usar a regra do `AGENTS.md`:

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
- abrir um lançamento existente, se houver;
- acessar `/accounts`;
- acessar `/categories`;
- acessar `/settings`;
- confirmar que a preferência de tamanho de fonte continua aplicada.

## Observação sobre templates

Esta task não adota engine de templates. Ela prepara o código para uma possível
migracao futura, reduzindo o tamanho e a responsabilidade de
`src/services/viewEngine.js` sem aumentar a complexidade da stack atual.

## Observação de implementação

Esta task registra o escopo solicitado, mas a implementação ainda não deve ser
feita neste momento.

## Implementação

- `src/services/viewEngine.js` foi reduzido para uma fachada de exportacao das
  views usadas por `src/server.js`.
- Helpers de renderização foram extraidos para `src/services/viewHelpers.js`.
- Layout, barra mensal e cards foram extraidos para `src/views/layout.js`.
- Login, dashboard, lançamentos, contas, categorias, configurações e 404 foram
  separados em arquivos de view especificos em `src/views/`.
- `npm run check` foi atualizado para validar sintaticamente os novos módulos de
  renderização.
- Nenhuma rota, regra financeira ou engine de templates foi alterada.

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: criação

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
