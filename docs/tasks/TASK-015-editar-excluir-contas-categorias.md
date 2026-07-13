# TASK-015 - Editar e excluir contas e categorias

## Contexto

As telas de cadastros `/accounts` e `/categories` permitem criar e listar
registros, mas ainda não oferecem ações para editar ou excluir contas e
categorias existentes.

Essa lacuna limita o uso cotidiano do EmDia, porque erros simples de cadastro,
mudanças de nome, tipo, instituição, cor ou desativação de itens precisam ser
resolvidos fora da interface.

## Avaliação inicial

- `/accounts` renderiza formulário de criação e tabela de contas em
  `src/views/accountsView.js`.
- `/categories` renderiza formulário de criação e tabela de categorias em
  `src/views/categoriesView.js`.
- `src/server.js` possui apenas:
  - `GET /accounts`;
  - `POST /accounts`;
  - `GET /categories`;
  - `POST /categories`.
- `src/models/FinancialAccount.js` possui `list`, `active`, `create` e
  `getById`, mas não possui `update` nem exclusão lógica.
- `src/models/Category.js` possui `list`, `byType`, `create` e `getById`, mas
  não possui `update` nem exclusão lógica.
- As tabelas `financial_accounts` e `categories` já possuem `deleted_at` e
  `is_active`, permitindo implementar exclusão lógica sem alterar o schema.
- Lançamentos financeiros podem referenciar contas e categorias por
  `expected_account_id`, `actual_account_id` e `category_id`, entao a remocao
  fisica não deve ser usada.

## Objetivo

Adicionar funcionalidade de edição e exclusão lógica para contas financeiras e
categorias, mantendo histórico financeiro preservado e evitando quebra de
lançamentos já cadastrados.

## Decisão proposta

Implementar "excluir" como exclusão lógica, preenchendo `deleted_at` e
atualizando `updated_at`.

Para itens já usados em lançamentos ou baixas, a exclusão lógica deve remover o
item das listagens operacionais futuras, mas os registros historicos devem
continuar exibindo o nome da conta ou categoria por meio dos relacionamentos já
existentes nas consultas.

Se durante a implementação for identificado que uma consulta historica perde o
nome após `deleted_at`, ajustar somente a consulta afetada para preservar a
exibição historica.

## Escopo

- Adicionar edição de contas financeiras.
- Adicionar exclusão lógica de contas financeiras.
- Adicionar edição de categorias.
- Adicionar exclusão lógica de categorias.
- Incluir ações por linha nas tabelas de `/accounts` e `/categories`, seguindo
  o padrão visual de ações iconograficas já usado em listagens.
- Usar formulários `POST` para ações que alteram dados.
- Proteger todas as ações de alteração com CSRF.
- Preservar `user_id` em todas as consultas e alterações.
- Manter mensagens e rótulos em português.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Remocao fisica de registros.
- Tela separada completa de detalhes para contas ou categorias.
- Restauração de contas ou categorias excluidas.
- Auditoria detalhada para estes cadastros, a menos que seja adicionada de forma
  pequena e consistente com os models existentes.
- Alterar schema do banco, salvo se a implementação revelar incompatibilidade.
- Implementar gerenciamento de favorecidos/pagadores.
- Migrar views para EJS.
- Implementar esta task neste momento.

## Rotas sugeridas

Contas:

```text
GET  /accounts/:id/edit
POST /accounts/:id
POST /accounts/:id/delete
```

Categorias:

```text
GET  /categories/:id/edit
POST /categories/:id
POST /categories/:id/delete
```

## Models sugeridos

Em `src/models/FinancialAccount.js`:

- `update(userId, id, data)`;
- `softDelete(userId, id)`.

Em `src/models/Category.js`:

- `update(userId, id, data)`;
- `softDelete(userId, id)`.

As operações devem usar placeholders `?`, validar escopo por `user_id` e
ignorar registros já removidos por `deleted_at`.

## Comportamento esperado

- `/accounts` mostra ações de editar e excluir para cada conta.
- `/categories` mostra ações de editar e excluir para cada categoria.
- Ao editar uma conta, o formulário deve vir preenchido com os dados atuais.
- Ao editar uma categoria, o formulário deve vir preenchido com os dados atuais.
- Ao salvar edição, o usuário retorna para a listagem correspondente.
- Ao excluir, o registro deixa de aparecer na listagem principal.
- Lançamentos existentes continuam preservados e acessiveis.
- Contas excluidas não aparecem como opções para novos lançamentos ou baixas.
- Categorias excluidas não aparecem como opções para novos lançamentos.
- Uma tentativa de editar ou excluir registro inexistente ou de outro usuário
  não deve alterar dados.

## Critérios de aceite

- É possível editar nome, tipo, instituição e saldo inicial de uma conta.
- E possível editar nome, tipo e cor de uma categoria.
- E possível excluir logicamente uma conta.
- E possível excluir logicamente uma categoria.
- As ações de exclusão usam `POST` e validação CSRF.
- As ações por linha seguem o padrão visual de listagem do projeto.
- O filtro `deleted_at IS NULL` continua sendo respeitado nas listagens.
- Nenhuma operação concatena entrada do usuário em SQL.
- `npm run check` passa após a implementação.
- Fluxos manuais de `/accounts` e `/categories` funcionam em desktop e mobile.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/accounts`;
- criar uma conta de teste;
- editar a conta e confirmar a alteração na listagem;
- excluir a conta e confirmar que ela deixa de aparecer;
- acessar `/categories`;
- criar uma categoria de teste;
- editar a categoria e confirmar a alteração na listagem;
- excluir a categoria e confirmar que ela deixa de aparecer;
- confirmar que `/entries/new` não exibe itens excluidos nos selects.

## Observação de implementação

Preferir alterações localizadas em `src/server.js`,
`src/models/FinancialAccount.js`, `src/models/Category.js`,
`src/views/accountsView.js`, `src/views/categoriesView.js` e, se necessário,
`public/css/styles.css`.

Se os helpers de ações iconograficas ficarem duplicados entre listagens,
considerar extrair uma função pequena para `src/services/viewHelpers.js`, mas
evitar uma refatoracao ampla nesta task.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- Foram adicionados metodos `update` e `softDelete` em
  `src/models/FinancialAccount.js`.
- Foram adicionados metodos `update` e `softDelete` em
  `src/models/Category.js`.
- Foram criadas rotas de edição e exclusão lógica para `/accounts`.
- Foram criadas rotas de edição e exclusão lógica para `/categories`.
- As telas `/accounts` e `/categories` passaram a reutilizar o formulário para
  criação e edição.
- As tabelas de contas e categorias passaram a exibir ações iconograficas de
  editar e excluir.
- A exclusão usa `POST`, validação CSRF e preenchimento de `deleted_at`.
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
