# TASK-010 - Padronizar botões de Contas e Categorias com Lançamentos

## Contexto

O formulário de novo lançamento (`/entries/new`) possui botões de ação no
padrão considerado adequado para o produto, especialmente os botões `Voltar` e
`Salvar`.

As telas de Contas (`/accounts`) e Categorias (`/categories`) ainda não seguem o
mesmo padrão visual e de posicionamento para seus botões de formulário. Isso
cria uma diferença perceptivel entre formulários operacionais que deveriam
parecer parte do mesmo sistema.

## Objetivo

Padronizar os botões dos formulários de Contas e Categorias para seguirem o
mesmo padrão visual usado no formulário de Lançamentos em `/entries/new`.

## Escopo

- Revisar o bloco de botões do formulário de `/entries/new`.
- Aplicar o mesmo padrão de classes, alinhamento, espacamento e hierarquia aos
  formulários de `/accounts` e `/categories`.
- Garantir que os botões `Voltar` e `Salvar` tenham o mesmo comportamento
  visual esperado entre as telas.
- Preservar mensagens, validações, campos e regras de negocio existentes.
- Preservar responsividade em telas pequenas.

## Fora do escopo

- Alterar regras de negocio de Contas, Categorias ou Lançamentos.
- Alterar persistência, models, schema ou seed.
- Redesenhar as telas completas de Contas e Categorias.
- Modificar o padrão atual de `/entries/new`, salvo se for apenas para extrair
  uma classe reutilizável sem alterar o comportamento visual.
- Implementar esta task neste momento.

## Diagnostico inicial

- `src/views/entriesView.js`: o formulário de `/entries/new` usa o padrão de
  botões aprovado pelo usuário.
- `src/views/accountsView.js`: o formulário de Contas deve ser comparado com o
  padrão de Lançamentos e ajustado.
- `src/views/categoriesView.js`: o formulário de Categorias deve ser comparado
  com o padrão de Lançamentos e ajustado.

## Comportamento esperado

- `/accounts` deve apresentar botões no mesmo padrão visual de `/entries/new`.
- `/categories` deve apresentar botões no mesmo padrão visual de `/entries/new`.
- O botão `Voltar` deve manter a aparência secundária equivalente ao formulário
  de Lançamentos.
- O botão `Salvar` deve manter a aparência primária equivalente ao formulário
  de Lançamentos.
- A ordem, alinhamento e espacamento dos botões devem ficar coerentes entre as
  três telas.

## Critérios de aceite

- Os botões de Contas e Categorias seguem o mesmo padrão visual dos botões de
  `/entries/new`.
- O usuário consegue reconhecer o mesmo comportamento de `Voltar` e `Salvar`
  nos três formulários.
- Nenhum campo de Contas ou Categorias e removido ou alterado.
- Nenhuma regra financeira ou validação e alterada.
- O layout continua responsivo.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/entries/new` e observar o padrão de `Voltar` e `Salvar`;
- acessar `/accounts` e conferir se os botões seguem o mesmo padrão;
- acessar `/categories` e conferir se os botões seguem o mesmo padrão;
- testar as três telas em largura menor de tela;
- validar que os formulários continuam submetendo corretamente quando a
  implementação for feita.

## Observação de implementação

Esta task registra a padronizacao solicitada pelo usuário. A implementação não
deve ser feita nesta etapa.

## Implementação

- Formulários de Contas e Categorias passaram a usar `form-actions wide`, como
  o formulário de Lançamentos.
- Botões principais foram renomeados para `Salvar`.
- Foi adicionado o botão secundário `Voltar` com `ghost-button`.
- A release foi atualizada para registrar a entrega da task.

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
