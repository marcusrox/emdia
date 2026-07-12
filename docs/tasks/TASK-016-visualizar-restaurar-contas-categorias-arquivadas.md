# TASK-016 - Visualizar e restaurar contas e categorias arquivadas

## Contexto

A `TASK-015` adicionou edicao e exclusao logica para contas financeiras e
categorias. Com isso, registros removidos deixam de aparecer nas listagens
principais, mas continuam preservados no banco com `deleted_at` preenchido.

Para tornar essa regra visivel e reversivel pelo usuario, as telas de cadastros
devem permitir consultar os itens arquivados e restaurar registros removidos por
engano.

## Objetivo

Adicionar visualizacao de itens arquivados em `/accounts` e `/categories`, com
acao para restaurar registros excluidos logicamente.

## Decisao proposta

Criar uma subtela simples para arquivados em cada cadastro:

- `/accounts/deleted`;
- `/categories/deleted`.

As telas principais continuam exibindo apenas registros ativos. Os registros
arquivados ficam em uma tela separada, acessivel por um botao iconografico
discreto no cabecalho do painel da listagem.

## Escopo

- Adicionar listagem de contas arquivadas.
- Adicionar listagem de categorias arquivadas.
- Adicionar acao de restaurar conta arquivada.
- Adicionar acao de restaurar categoria arquivada.
- Incluir acesso iconografico aos arquivados nas telas principais de contas e
  categorias, junto ao cabecalho do painel da listagem.
- Incluir link `Voltar para contas ativas` e `Voltar para categorias ativas`
  nas telas de arquivados.
- Exibir a data de arquivamento com base em `deleted_at`.
- Usar formularios `POST` para restauracao.
- Proteger restauracao com CSRF.
- Preservar `user_id` em todas as consultas e alteracoes.
- Atualizar o controle de release ao concluir a implementacao.

## Fora do escopo

- Exclusao fisica permanente.
- Edicao direta de registros arquivados.
- Restauracao em massa.
- Filtros avancados na tela de arquivados.
- Auditoria detalhada, salvo se puder ser adicionada de forma pequena e
  consistente.
- Alterar schema do banco.
- Implementar esta task neste momento.

## Rotas sugeridas

Contas:

```text
GET  /accounts/deleted
POST /accounts/:id/restore
```

Categorias:

```text
GET  /categories/deleted
POST /categories/:id/restore
```

## Models sugeridos

Em `src/models/FinancialAccount.js`:

- `listDeleted(userId)`;
- `restore(userId, id)`.

Em `src/models/Category.js`:

- `listDeleted(userId)`;
- `restore(userId, id)`.

As consultas de arquivados devem usar `deleted_at IS NOT NULL`. A restauracao
deve limpar `deleted_at`, marcar `is_active = 1` e atualizar `updated_at`.

## Visualizacao proposta

Tela `/accounts/deleted`:

```text
Contas
Cadastros

[Voltar para contas ativas]

Contas arquivadas

Nome              Tipo             Instituicao      Saldo inicial     Arquivado em        Acoes
Nubank antiga     Conta corrente   Nubank           R$ 0,00           12/07/2026 13:20    Restaurar
Carteira velha    Dinheiro         -                R$ 0,00           10/07/2026 09:44    Restaurar
```

Tela `/categories/deleted`:

```text
Categorias
Cadastros

[Voltar para categorias ativas]

Categorias arquivadas

Nome              Tipo       Arquivada em        Acoes
Mercado antigo    Despesa    12/07/2026 13:20    Restaurar
Freela velho      Receita    10/07/2026 09:44    Restaurar
```

## Comportamento esperado

- `/accounts` exibe um botao iconografico para contas arquivadas no painel da
  listagem.
- `/categories` exibe um botao iconografico para categorias arquivadas no painel
  da listagem.
- `/accounts/deleted` lista apenas contas com `deleted_at` preenchido.
- `/categories/deleted` lista apenas categorias com `deleted_at` preenchido.
- Se nao houver itens arquivados, a tela mostra `Nenhum item arquivado.`.
- Cada registro arquivado possui apenas a acao `Restaurar`.
- Ao restaurar uma conta, ela volta a aparecer em `/accounts`.
- Ao restaurar uma categoria, ela volta a aparecer em `/categories`.
- Itens restaurados voltam a aparecer em selects operacionais de novos
  lancamentos.

## Criterios de aceite

- E possivel acessar a lista de contas arquivadas a partir de `/accounts`.
- E possivel acessar a lista de categorias arquivadas a partir de `/categories`.
- Contas arquivadas exibem nome, tipo, instituicao, saldo inicial e data de
  arquivamento.
- Categorias arquivadas exibem nome, tipo e data de arquivamento.
- A restauracao usa `POST` e validacao CSRF.
- A restauracao limpa `deleted_at`, atualiza `updated_at` e marca
  `is_active = 1`.
- A tela de arquivados nao oferece edicao nem exclusao definitiva.
- Nenhuma operacao concatena entrada do usuario em SQL.
- `npm run check` passa apos a implementacao.
- Fluxos manuais de arquivar e restaurar funcionam em `/accounts` e
  `/categories`.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/accounts`;
- arquivar uma conta de teste;
- acessar `/accounts/deleted`;
- restaurar a conta;
- confirmar que ela voltou para `/accounts`;
- acessar `/categories`;
- arquivar uma categoria de teste;
- acessar `/categories/deleted`;
- restaurar a categoria;
- confirmar que ela voltou para `/categories`;
- confirmar que os selects de `/entries/new` voltam a exibir os itens
  restaurados.

## Observacao de implementacao

Preferir reutilizar as views existentes `src/views/accountsView.js` e
`src/views/categoriesView.js`, criando funcoes especificas para as telas de
arquivados apenas se isso mantiver o codigo mais claro.

Reutilizar os estilos `record-actions` e `record-action-button`. Para a acao de
restaurar, usar icone Lucide como `rotate-ccw`, `archive-restore` ou equivalente
disponivel em `lucide-static`.

Ao concluir a implementacao, atualizar o controle de release em
`src/config/release.js`, incrementando o numero sequencial em 1.

## Implementacao

- Foram adicionados metodos `listDeleted` e `restore` em
  `src/models/FinancialAccount.js`.
- Foram adicionados metodos `listDeleted` e `restore` em
  `src/models/Category.js`.
- Foram criadas as rotas `GET /accounts/deleted` e
  `POST /accounts/:id/restore`.
- Foram criadas as rotas `GET /categories/deleted` e
  `POST /categories/:id/restore`.
- As telas principais de contas e categorias receberam acesso aos arquivados.
- O acesso a arquivados foi refinado para um botao iconografico no cabecalho do
  painel da listagem, reduzindo o espaco vertical ocupado nas telas principais.
- Foram adicionadas telas de arquivados com tabela, data de arquivamento e acao
  de restaurar.
- A restauracao usa `POST`, validacao CSRF e limpa `deleted_at`.
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
