# TASK-014 - Transformar acoes da toolbar de Lancamentos em icones

## Contexto

A tela de Lancamentos (`/entries`) possui uma barra de filtros com campos de
busca e tres acoes textuais:

- `Filtrar`, como botao de submit do formulario `GET`;
- `Limpar`, como link para restaurar os filtros da competencia atual;
- `Novo lançamento`, como link para abrir o cadastro de lancamento.

Na captura analisada, esses controles ocupam bastante largura e destoam do novo
padrao de acoes iconograficas ja adotado para a coluna `Acoes` da listagem.

## Objetivo

Transformar as acoes `Filtrar`, `Limpar` e `Novo lançamento` da toolbar de
`/entries` em controles iconograficos padronizados, usando Lucide como fonte de
icones e mantendo rotulos acessiveis em portugues.

## Padronizacao proposta

- Usar `lucide-static` por meio do helper `lucideIcon`.
- Renderizar os controles como botoes/links compactos com icone visivel.
- Remover texto visivel dentro dos controles quando o icone e o rotulo
  acessivel forem suficientes.
- Manter `title` e `aria-label` em portugues para cada controle.
- Preservar diferenca visual entre:
  - filtrar: acao primaria;
  - limpar filtros: acao secundaria/neutra;
  - novo lancamento: acao primaria de criacao.
- Criar ou reutilizar classes especificas para acoes de toolbar, sem misturar
  com `record-actions`, que e o padrao de acoes por linha de tabela.

## Escopo

- Atualizar a toolbar de filtros em `src/views/entriesView.js`.
- Trocar os textos `Filtrar`, `Limpar` e `Novo lançamento` por icones Lucide.
- Preservar o formulario `GET /entries` para aplicar filtros.
- Preservar o link de limpar filtros para `/entries?competence=YYYY-MM`.
- Preservar o link de novo lancamento para
  `/entries/new?competence=YYYY-MM`.
- Adicionar ou ajustar CSS em `public/css/styles.css` para os controles
  iconograficos da toolbar.
- Garantir foco visivel, area clicavel confortavel e responsividade.
- Atualizar o controle de release ao concluir a implementacao.

## Fora do escopo

- Alterar filtros disponiveis ou regras de busca.
- Alterar rotas, models, schema, seed ou persistencia.
- Alterar a barra de competencia mensal.
- Alterar as acoes por linha da tabela, ja tratadas na `TASK-013`.
- Migrar outras toolbars do sistema nesta etapa.
- Implementar esta task neste momento.

## Diagnostico inicial

- `src/views/entriesView.js`: `entriesListView` renderiza a toolbar de
  `/entries`.
- `src/views/entriesView.js`: o formulario `.filters` contem o botao textual
  `Filtrar`.
- `src/views/entriesView.js`: o link `Limpar` usa `ghost-button` e aponta para
  `/entries?competence=${competence}`.
- `src/views/entriesView.js`: o link `Novo lançamento` usa `primary-button` e
  aponta para `/entries/new?competence=${competence}`.
- `public/css/styles.css`: `.toolbar` organiza a barra; `.filters` usa grid com
  colunas para campos e acoes.
- `docs/patterns.md`: define `lucide-static` e `lucideIcon` como padrao de
  iconografia.

## Icones sugeridos

- Filtrar: `filter`.
- Limpar filtros: `eraser`, `x` ou `rotate-ccw`.
- Novo lancamento: `plus`.

A escolha final deve priorizar clareza visual e consistencia com o conjunto
Lucide usado no restante do EmDia.

## Comportamento esperado

- A toolbar de `/entries` exibe os controles de filtrar, limpar e novo
  lancamento como icones.
- O botao de filtrar continua submetendo o formulario por `GET`.
- O link de limpar filtros continua mantendo a competencia selecionada.
- O link de novo lancamento continua abrindo o formulario de novo lancamento na
  competencia selecionada.
- Cada controle tem `title` e `aria-label` em portugues.
- O foco de teclado fica visivel em cada controle.
- Em telas pequenas, os controles continuam acessiveis e nao estouram o layout.

## Criterios de aceite

- `/entries` nao exibe mais os textos `Filtrar`, `Limpar` e `Novo lançamento`
  dentro dos controles da toolbar.
- Os tres controles usam icones Lucide renderizados via `lucideIcon`.
- O formulario de filtros continua funcionando como antes.
- O link `Limpar` continua removendo filtros sem trocar a competencia.
- O link `Novo lançamento` continua preservando a competencia na URL.
- Os controles possuem area clicavel consistente e foco visivel.
- O estilo novo nao interfere nos filtros, na barra de competencia nem nas
  acoes por linha da tabela.
- `npm run check` passa apos a implementacao.
- Validacao visual manual confirma o comportamento em desktop e mobile.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/entries`;
- confirmar que `Filtrar`, `Limpar` e `Novo lançamento` aparecem como icones;
- aplicar filtros e confirmar que a listagem continua sendo filtrada;
- limpar filtros e confirmar que a competencia permanece selecionada;
- abrir novo lancamento e confirmar que a competencia segue na URL;
- navegar por teclado pelos controles e conferir foco visivel;
- validar em viewport mobile.

## Observacao de implementacao

Preferir helpers pequenos dentro de `entriesView.js` se a reutilizacao ainda for
local a `/entries`. Se outra toolbar passar a usar o mesmo padrao no futuro,
extrair para helper compartilhado em `src/services/viewHelpers.js`.

Ao concluir a implementacao, atualizar o controle de release em
`src/config/release.js`, incrementando o numero sequencial em 1.

## Implementacao

- A toolbar de filtros de `/entries` passou a usar controles iconograficos para
  filtrar, limpar filtros e criar novo lancamento.
- Os icones Lucide usados foram `filter`, `eraser` e `plus`.
- Foram adicionados helpers locais em `src/views/entriesView.js` para renderizar
  links e botoes iconograficos da toolbar.
- Foram criadas as classes `toolbar-actions` e `toolbar-icon-button`.
- O tamanho dos controles e SVGs foi refinado para reduzir peso visual na
  toolbar.
- O formulario de filtros continua usando `GET /entries`.
- O link de limpar filtros continua preservando a competencia selecionada.
- O link de novo lancamento continua preservando a competencia selecionada.
- O controle de release foi atualizado para registrar a entrega da task.

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
