# TASK-010 - Padronizar botoes de Contas e Categorias com Lancamentos

## Contexto

O formulario de novo lancamento (`/entries/new`) possui botoes de acao no
padrao considerado adequado para o produto, especialmente os botoes `Voltar` e
`Salvar`.

As telas de Contas (`/accounts`) e Categorias (`/categories`) ainda nao seguem o
mesmo padrao visual e de posicionamento para seus botoes de formulario. Isso
cria uma diferenca perceptivel entre formularios operacionais que deveriam
parecer parte do mesmo sistema.

## Objetivo

Padronizar os botoes dos formularios de Contas e Categorias para seguirem o
mesmo padrao visual usado no formulario de Lancamentos em `/entries/new`.

## Escopo

- Revisar o bloco de botoes do formulario de `/entries/new`.
- Aplicar o mesmo padrao de classes, alinhamento, espacamento e hierarquia aos
  formularios de `/accounts` e `/categories`.
- Garantir que os botoes `Voltar` e `Salvar` tenham o mesmo comportamento
  visual esperado entre as telas.
- Preservar mensagens, validacoes, campos e regras de negocio existentes.
- Preservar responsividade em telas pequenas.

## Fora do escopo

- Alterar regras de negocio de Contas, Categorias ou Lancamentos.
- Alterar persistencia, models, schema ou seed.
- Redesenhar as telas completas de Contas e Categorias.
- Modificar o padrao atual de `/entries/new`, salvo se for apenas para extrair
  uma classe reutilizavel sem alterar o comportamento visual.
- Implementar esta task neste momento.

## Diagnostico inicial

- `src/views/entriesView.js`: o formulario de `/entries/new` usa o padrao de
  botoes aprovado pelo usuario.
- `src/views/accountsView.js`: o formulario de Contas deve ser comparado com o
  padrao de Lancamentos e ajustado.
- `src/views/categoriesView.js`: o formulario de Categorias deve ser comparado
  com o padrao de Lancamentos e ajustado.

## Comportamento esperado

- `/accounts` deve apresentar botoes no mesmo padrao visual de `/entries/new`.
- `/categories` deve apresentar botoes no mesmo padrao visual de `/entries/new`.
- O botao `Voltar` deve manter a aparencia secundaria equivalente ao formulario
  de Lancamentos.
- O botao `Salvar` deve manter a aparencia primaria equivalente ao formulario
  de Lancamentos.
- A ordem, alinhamento e espacamento dos botoes devem ficar coerentes entre as
  tres telas.

## Criterios de aceite

- Os botoes de Contas e Categorias seguem o mesmo padrao visual dos botoes de
  `/entries/new`.
- O usuario consegue reconhecer o mesmo comportamento de `Voltar` e `Salvar`
  nos tres formularios.
- Nenhum campo de Contas ou Categorias e removido ou alterado.
- Nenhuma regra financeira ou validacao e alterada.
- O layout continua responsivo.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/entries/new` e observar o padrao de `Voltar` e `Salvar`;
- acessar `/accounts` e conferir se os botoes seguem o mesmo padrao;
- acessar `/categories` e conferir se os botoes seguem o mesmo padrao;
- testar as tres telas em largura menor de tela;
- validar que os formularios continuam submetendo corretamente quando a
  implementacao for feita.

## Observacao de implementacao

Esta task registra a padronizacao solicitada pelo usuario. A implementacao nao
deve ser feita nesta etapa.

## Implementacao

- Formularios de Contas e Categorias passaram a usar `form-actions wide`, como
  o formulario de Lancamentos.
- Botoes principais foram renomeados para `Salvar`.
- Foi adicionado o botao secundario `Voltar` com `ghost-button`.
- A release foi atualizada para registrar a entrega da task.

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
