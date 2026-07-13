# TASK-020 - Explicar exclusão lógica no confirm de contas e categorias

## Contexto

Na tela `/categories`, ao excluir uma categoria, o sistema exibe um `confirm`
com a mensagem `Excluir esta categoria?`. A ação atual e uma exclusão lógica:
a categoria deixa de aparecer na listagem principal, mas continua registrada no
banco e pode ser restaurada depois pela tela de categorias arquivadas.

O mesmo conceito deve ser aplicado ao fluxo de contas em `/accounts`, onde a
conta deixa de aparecer na listagem principal, mas continua registrada e pode
ser restaurada depois pela tela de contas arquivadas.

A mensagem atual não explica isso ao usuário. Por parecer uma exclusão
definitiva, ela pode gerar receio desnecessario ou confusao sobre como reverter
a ação.

## Objetivo

Atualizar os textos de confirmação de exclusão de contas e categorias para
explicar, em linguagem clara, que a exclusão e lógica, o que isso significa para
o usuário e como restaurar o item posteriormente.

## Decisão proposta

Substituir a mensagem curta por um texto mais informativo, ainda adequado para
um `window.confirm`.

Sugestao de texto:

```text
Arquivar esta categoria?

Esta e uma exclusao logica: a categoria sairá da lista principal, mas continuará salva no sistema.
Voce podera reverter depois em Categorias arquivadas, usando a acao de restaurar.
```

Para contas, usar texto equivalente:

```text
Arquivar esta conta?

Esta e uma exclusao logica: a conta sairá da lista principal, mas continuará salva no sistema.
Voce podera reverter depois em Contas arquivadas, usando a acao de restaurar.
```

Observação: se o projeto preferir evitar quebras de linha em `confirm`, adaptar
para uma versao em frase única, preservando as mesmas informações.

## Escopo

- Atualizar o texto do `confirm` usado ao excluir categoria em `/categories`.
- Atualizar o texto do `confirm` usado ao excluir conta em `/accounts`.
- Explicar que a ação arquiva/remove da listagem principal, mas não apaga
  definitivamente o registro.
- Explicar que a reversao pode ser feita em `Categorias arquivadas` ou
  `Contas arquivadas`, conforme o tipo de item, usando a ação de restaurar.
- Manter mensagens em português.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Trocar `window.confirm` por modal customizado.
- Alterar a regra de exclusão lógica.
- Alterar o model, schema ou banco de dados.
- Criar novas telas de arquivados.
- Alterar permissões, auditoria ou histórico.
- Implementar esta task neste momento.

## Comportamento esperado

- Ao clicar para excluir uma categoria ou conta, o usuário ve uma mensagem mais
  clara sobre a ação.
- A mensagem usa o termo `arquivar` ou explica explicitamente que a exclusão não
  e definitiva.
- O usuário entende que o item sai da listagem principal.
- O usuário entende que podera restaurar a categoria em `Categorias arquivadas`
  ou a conta em `Contas arquivadas`.
- O fluxo continua usando POST e mantendo a proteção CSRF atual.

## Critérios de aceite

- O confirm de exclusão de categoria não usa mais apenas `Excluir esta categoria?`.
- O confirm de exclusão de conta não usa mais apenas a mensagem curta atual.
- A mensagem informa que se trata de exclusão lógica ou arquivamento.
- A mensagem informa que o item continuara salvo no sistema.
- A mensagem informa como reverter a ação pela tela de arquivados correspondente.
- Caracteres especiais usados no atributo HTML continuam escapados corretamente.
- Não há regressao nos botões de editar, excluir ou restaurar categorias.
- Não há regressao nos botões de editar, excluir ou restaurar contas.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/categories`;
- clicar no botão de exclusão de uma categoria;
- conferir o texto do confirm;
- cancelar a ação e validar que nada foi alterado;
- confirmar em uma categoria de teste, se houver ambiente seguro;
- acessar `Categorias arquivadas`;
- restaurar a categoria de teste.
- acessar `/accounts`;
- clicar no botão de exclusão de uma conta;
- conferir o texto do confirm;
- cancelar a ação e validar que nada foi alterado;
- confirmar em uma conta de teste, se houver ambiente seguro;
- acessar `Contas arquivadas`;
- restaurar a conta de teste.

## Observação de implementação

Priorizar alterações localizadas em `src/views/categoriesView.js` e
`src/views/accountsView.js`, ajustando o `confirmMessage` passado para as ações
de exclusão.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- O confirm de exclusão de contas em `src/views/accountsView.js` passou a usar
  texto explicando que a ação arquiva a conta por exclusão lógica.
- O confirm de exclusão de categorias em `src/views/categoriesView.js` passou a
  usar texto equivalente para categorias.
- As mensagens explicam que o item sai da lista principal, continua salvo no
  sistema e pode ser restaurado pela tela de arquivados correspondente.
- Os textos foram mantidos em linha única para uso seguro dentro do atributo
  `onsubmit` atual.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-12 14:26
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: criação

---

## Assinatura da LLM

- Data: 2026-07-12 14:27
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização

---

## Assinatura da LLM

- Data: 2026-07-12 21:58
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
