# TASK-020 - Explicar exclusao logica no confirm de contas e categorias

## Contexto

Na tela `/categories`, ao excluir uma categoria, o sistema exibe um `confirm`
com a mensagem `Excluir esta categoria?`. A acao atual e uma exclusao logica:
a categoria deixa de aparecer na listagem principal, mas continua registrada no
banco e pode ser restaurada depois pela tela de categorias arquivadas.

O mesmo conceito deve ser aplicado ao fluxo de contas em `/accounts`, onde a
conta deixa de aparecer na listagem principal, mas continua registrada e pode
ser restaurada depois pela tela de contas arquivadas.

A mensagem atual nao explica isso ao usuario. Por parecer uma exclusao
definitiva, ela pode gerar receio desnecessario ou confusao sobre como reverter
a acao.

## Objetivo

Atualizar os textos de confirmacao de exclusao de contas e categorias para
explicar, em linguagem clara, que a exclusao e logica, o que isso significa para
o usuario e como restaurar o item posteriormente.

## Decisao proposta

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

Observacao: se o projeto preferir evitar quebras de linha em `confirm`, adaptar
para uma versao em frase unica, preservando as mesmas informacoes.

## Escopo

- Atualizar o texto do `confirm` usado ao excluir categoria em `/categories`.
- Atualizar o texto do `confirm` usado ao excluir conta em `/accounts`.
- Explicar que a acao arquiva/remove da listagem principal, mas nao apaga
  definitivamente o registro.
- Explicar que a reversao pode ser feita em `Categorias arquivadas` ou
  `Contas arquivadas`, conforme o tipo de item, usando a acao de restaurar.
- Manter mensagens em portugues.
- Atualizar o controle de release ao concluir a implementacao.

## Fora do escopo

- Trocar `window.confirm` por modal customizado.
- Alterar a regra de exclusao logica.
- Alterar o model, schema ou banco de dados.
- Criar novas telas de arquivados.
- Alterar permissoes, auditoria ou historico.
- Implementar esta task neste momento.

## Comportamento esperado

- Ao clicar para excluir uma categoria ou conta, o usuario ve uma mensagem mais
  clara sobre a acao.
- A mensagem usa o termo `arquivar` ou explica explicitamente que a exclusao nao
  e definitiva.
- O usuario entende que o item sai da listagem principal.
- O usuario entende que podera restaurar a categoria em `Categorias arquivadas`
  ou a conta em `Contas arquivadas`.
- O fluxo continua usando POST e mantendo a protecao CSRF atual.

## Criterios de aceite

- O confirm de exclusao de categoria nao usa mais apenas `Excluir esta categoria?`.
- O confirm de exclusao de conta nao usa mais apenas a mensagem curta atual.
- A mensagem informa que se trata de exclusao logica ou arquivamento.
- A mensagem informa que o item continuara salvo no sistema.
- A mensagem informa como reverter a acao pela tela de arquivados correspondente.
- Caracteres especiais usados no atributo HTML continuam escapados corretamente.
- Nao ha regressao nos botoes de editar, excluir ou restaurar categorias.
- Nao ha regressao nos botoes de editar, excluir ou restaurar contas.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/categories`;
- clicar no botao de exclusao de uma categoria;
- conferir o texto do confirm;
- cancelar a acao e validar que nada foi alterado;
- confirmar em uma categoria de teste, se houver ambiente seguro;
- acessar `Categorias arquivadas`;
- restaurar a categoria de teste.
- acessar `/accounts`;
- clicar no botao de exclusao de uma conta;
- conferir o texto do confirm;
- cancelar a acao e validar que nada foi alterado;
- confirmar em uma conta de teste, se houver ambiente seguro;
- acessar `Contas arquivadas`;
- restaurar a conta de teste.

## Observacao de implementacao

Priorizar alteracoes localizadas em `src/views/categoriesView.js` e
`src/views/accountsView.js`, ajustando o `confirmMessage` passado para as acoes
de exclusao.

Ao concluir a implementacao, atualizar o controle de release em
`src/config/release.js`, incrementando o numero sequencial em 1.

## Implementacao

- O confirm de exclusao de contas em `src/views/accountsView.js` passou a usar
  texto explicando que a acao arquiva a conta por exclusao logica.
- O confirm de exclusao de categorias em `src/views/categoriesView.js` passou a
  usar texto equivalente para categorias.
- As mensagens explicam que o item sai da lista principal, continua salvo no
  sistema e pode ser restaurado pela tela de arquivados correspondente.
- Os textos foram mantidos em linha unica para uso seguro dentro do atributo
  `onsubmit` atual.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-12 14:26
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-12 14:27
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao

---

## Assinatura da LLM

- Data: 2026-07-12 21:58
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
