# TASK-014 - Transformar ações da toolbar de Lançamentos em ícones

## Contexto

A tela de Lançamentos (`/entries`) possui uma barra de filtros com campos de
busca e três ações textuais:

- `Filtrar`, como botão de submit do formulário `GET`;
- `Limpar`, como link para restaurar os filtros da competência atual;
- `Novo lançamento`, como link para abrir o cadastro de lançamento.

Na captura analisada, esses controles ocupam bastante largura e destoam do novo
padrão de ações iconograficas já adotado para a coluna `Ações` da listagem.

## Objetivo

Transformar as ações `Filtrar`, `Limpar` e `Novo lançamento` da toolbar de
`/entries` em controles iconograficos padronizados, usando Lucide como fonte de
ícones e mantendo rótulos acessiveis em português.

## Padronizacao proposta

- Usar `lucide-static` por meio do helper `lucideIcon`.
- Renderizar os controles como botões/links compactos com ícone visível.
- Remover texto visível dentro dos controles quando o ícone e o rótulo
  acessivel forem suficientes.
- Manter `title` e `aria-label` em português para cada controle.
- Preservar diferença visual entre:
  - filtrar: ação primária;
  - limpar filtros: ação secundária/neutra;
  - novo lançamento: ação primária de criação.
- Criar ou reutilizar classes especificas para ações de toolbar, sem misturar
  com `record-actions`, que e o padrão de ações por linha de tabela.

## Escopo

- Atualizar a toolbar de filtros em `src/views/entriesView.js`.
- Trocar os textos `Filtrar`, `Limpar` e `Novo lançamento` por ícones Lucide.
- Preservar o formulário `GET /entries` para aplicar filtros.
- Preservar o link de limpar filtros para `/entries?competence=YYYY-MM`.
- Preservar o link de novo lançamento para
  `/entries/new?competence=YYYY-MM`.
- Adicionar ou ajustar CSS em `public/css/styles.css` para os controles
  iconograficos da toolbar.
- Garantir foco visível, área clicavel confortavel e responsividade.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Alterar filtros disponíveis ou regras de busca.
- Alterar rotas, models, schema, seed ou persistência.
- Alterar a barra de competência mensal.
- Alterar as ações por linha da tabela, já tratadas na `TASK-013`.
- Migrar outras toolbars do sistema nesta etapa.
- Implementar esta task neste momento.

## Diagnostico inicial

- `src/views/entriesView.js`: `entriesListView` renderiza a toolbar de
  `/entries`.
- `src/views/entriesView.js`: o formulário `.filters` contem o botão textual
  `Filtrar`.
- `src/views/entriesView.js`: o link `Limpar` usa `ghost-button` e aponta para
  `/entries?competence=${competence}`.
- `src/views/entriesView.js`: o link `Novo lançamento` usa `primary-button` e
  aponta para `/entries/new?competence=${competence}`.
- `public/css/styles.css`: `.toolbar` organiza a barra; `.filters` usa grid com
  colunas para campos e ações.
- `docs/patterns.md`: define `lucide-static` e `lucideIcon` como padrão de
  iconografia.

## Ícones sugeridos

- Filtrar: `filter`.
- Limpar filtros: `eraser`, `x` ou `rotate-ccw`.
- Novo lançamento: `plus`.

A escolha final deve priorizar clareza visual e consistência com o conjunto
Lucide usado no restante do EmDia.

## Comportamento esperado

- A toolbar de `/entries` exibe os controles de filtrar, limpar e novo
  lançamento como ícones.
- O botão de filtrar continua submetendo o formulário por `GET`.
- O link de limpar filtros continua mantendo a competência selecionada.
- O link de novo lançamento continua abrindo o formulário de novo lançamento na
  competência selecionada.
- Cada controle tem `title` e `aria-label` em português.
- O foco de teclado fica visível em cada controle.
- Em telas pequenas, os controles continuam acessiveis e não estouram o layout.

## Critérios de aceite

- `/entries` não exibe mais os textos `Filtrar`, `Limpar` e `Novo lançamento`
  dentro dos controles da toolbar.
- Os três controles usam ícones Lucide renderizados via `lucideIcon`.
- O formulário de filtros continua funcionando como antes.
- O link `Limpar` continua removendo filtros sem trocar a competência.
- O link `Novo lançamento` continua preservando a competência na URL.
- Os controles possuem área clicavel consistente e foco visível.
- O estilo novo não interfere nos filtros, na barra de competência nem nas
  ações por linha da tabela.
- `npm run check` passa após a implementação.
- Validação visual manual confirma o comportamento em desktop e mobile.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/entries`;
- confirmar que `Filtrar`, `Limpar` e `Novo lançamento` aparecem como ícones;
- aplicar filtros e confirmar que a listagem continua sendo filtrada;
- limpar filtros e confirmar que a competência permanece selecionada;
- abrir novo lançamento e confirmar que a competência segue na URL;
- navegar por teclado pelos controles e conferir foco visível;
- validar em viewport mobile.

## Observação de implementação

Preferir helpers pequenos dentro de `entriesView.js` se a reutilizacao ainda for
local a `/entries`. Se outra toolbar passar a usar o mesmo padrão no futuro,
extrair para helper compartilhado em `src/services/viewHelpers.js`.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- A toolbar de filtros de `/entries` passou a usar controles iconograficos para
  filtrar, limpar filtros e criar novo lançamento.
- Os ícones Lucide usados foram `filter`, `eraser` e `plus`.
- Foram adicionados helpers locais em `src/views/entriesView.js` para renderizar
  links e botões iconograficos da toolbar.
- Foram criadas as classes `toolbar-actions` e `toolbar-icon-button`.
- O tamanho dos controles e SVGs foi refinado para reduzir peso visual na
  toolbar.
- O formulário de filtros continua usando `GET /entries`.
- O link de limpar filtros continua preservando a competência selecionada.
- O link de novo lançamento continua preservando a competência selecionada.
- O controle de release foi atualizado para registrar a entrega da task.

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: criação

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
