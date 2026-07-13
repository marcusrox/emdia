# TASK-016 - Visualizar e restaurar contas e categorias arquivadas

## Contexto

A `TASK-015` adicionou edição e exclusão lógica para contas financeiras e
categorias. Com isso, registros removidos deixam de aparecer nas listagens
principais, mas continuam preservados no banco com `deleted_at` preenchido.

Para tornar essa regra visível e reversivel pelo usuário, as telas de cadastros
devem permitir consultar os itens arquivados e restaurar registros removidos por
engano.

## Objetivo

Adicionar visualização de itens arquivados em `/accounts` e `/categories`, com
ação para restaurar registros excluidos logicamente.

## Decisão proposta

Criar uma subtela simples para arquivados em cada cadastro:

- `/accounts/deleted`;
- `/categories/deleted`.

As telas principais continuam exibindo apenas registros ativos. Os registros
arquivados ficam em uma tela separada, acessivel por um botão iconografico
discreto no cabeçalho do painel da listagem.

## Escopo

- Adicionar listagem de contas arquivadas.
- Adicionar listagem de categorias arquivadas.
- Adicionar ação de restaurar conta arquivada.
- Adicionar ação de restaurar categoria arquivada.
- Incluir acesso iconografico aos arquivados nas telas principais de contas e
  categorias, junto ao cabeçalho do painel da listagem.
- Incluir link `Voltar para contas ativas` e `Voltar para categorias ativas`
  nas telas de arquivados.
- Exibir a data de arquivamento com base em `deleted_at`.
- Usar formulários `POST` para restauração.
- Proteger restauração com CSRF.
- Preservar `user_id` em todas as consultas e alterações.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Exclusão fisica permanente.
- Edição direta de registros arquivados.
- Restauração em massa.
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

As consultas de arquivados devem usar `deleted_at IS NOT NULL`. A restauração
deve limpar `deleted_at`, marcar `is_active = 1` e atualizar `updated_at`.

## Visualização proposta

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

- `/accounts` exibe um botão iconografico para contas arquivadas no painel da
  listagem.
- `/categories` exibe um botão iconografico para categorias arquivadas no painel
  da listagem.
- `/accounts/deleted` lista apenas contas com `deleted_at` preenchido.
- `/categories/deleted` lista apenas categorias com `deleted_at` preenchido.
- Se não houver itens arquivados, a tela mostra `Nenhum item arquivado.`.
- Cada registro arquivado possui apenas a ação `Restaurar`.
- Ao restaurar uma conta, ela volta a aparecer em `/accounts`.
- Ao restaurar uma categoria, ela volta a aparecer em `/categories`.
- Itens restaurados voltam a aparecer em selects operacionais de novos
  lançamentos.

## Critérios de aceite

- E possível acessar a lista de contas arquivadas a partir de `/accounts`.
- E possível acessar a lista de categorias arquivadas a partir de `/categories`.
- Contas arquivadas exibem nome, tipo, instituição, saldo inicial e data de
  arquivamento.
- Categorias arquivadas exibem nome, tipo e data de arquivamento.
- A restauração usa `POST` e validação CSRF.
- A restauração limpa `deleted_at`, atualiza `updated_at` e marca
  `is_active = 1`.
- A tela de arquivados não oferece edição nem exclusão definitiva.
- Nenhuma operação concatena entrada do usuário em SQL.
- `npm run check` passa após a implementação.
- Fluxos manuais de arquivar e restaurar funcionam em `/accounts` e
  `/categories`.

## Validação sugerida

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

## Observação de implementação

Preferir reutilizar as views existentes `src/views/accountsView.js` e
`src/views/categoriesView.js`, criando funções especificas para as telas de
arquivados apenas se isso mantiver o código mais claro.

Reutilizar os estilos `record-actions` e `record-action-button`. Para a ação de
restaurar, usar ícone Lucide como `rotate-ccw`, `archive-restore` ou equivalente
disponível em `lucide-static`.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- Foram adicionados metodos `listDeleted` e `restore` em
  `src/models/FinancialAccount.js`.
- Foram adicionados metodos `listDeleted` e `restore` em
  `src/models/Category.js`.
- Foram criadas as rotas `GET /accounts/deleted` e
  `POST /accounts/:id/restore`.
- Foram criadas as rotas `GET /categories/deleted` e
  `POST /categories/:id/restore`.
- As telas principais de contas e categorias receberam acesso aos arquivados.
- O acesso a arquivados foi refinado para um botão iconografico no cabeçalho do
  painel da listagem, reduzindo o espaco vertical ocupado nas telas principais.
- Foram adicionadas telas de arquivados com tabela, data de arquivamento e ação
  de restaurar.
- A restauração usa `POST`, validação CSRF e limpa `deleted_at`.
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
