# TASK-015 - Editar e excluir contas e categorias

## Contexto

As telas de cadastros `/accounts` e `/categories` permitem criar e listar
registros, mas ainda nao oferecem acoes para editar ou excluir contas e
categorias existentes.

Essa lacuna limita o uso cotidiano do EmDia, porque erros simples de cadastro,
mudancas de nome, tipo, instituicao, cor ou desativacao de itens precisam ser
resolvidos fora da interface.

## Avaliacao inicial

- `/accounts` renderiza formulario de criacao e tabela de contas em
  `src/views/accountsView.js`.
- `/categories` renderiza formulario de criacao e tabela de categorias em
  `src/views/categoriesView.js`.
- `src/server.js` possui apenas:
  - `GET /accounts`;
  - `POST /accounts`;
  - `GET /categories`;
  - `POST /categories`.
- `src/models/FinancialAccount.js` possui `list`, `active`, `create` e
  `getById`, mas nao possui `update` nem exclusao logica.
- `src/models/Category.js` possui `list`, `byType`, `create` e `getById`, mas
  nao possui `update` nem exclusao logica.
- As tabelas `financial_accounts` e `categories` ja possuem `deleted_at` e
  `is_active`, permitindo implementar exclusao logica sem alterar o schema.
- Lancamentos financeiros podem referenciar contas e categorias por
  `expected_account_id`, `actual_account_id` e `category_id`, entao a remocao
  fisica nao deve ser usada.

## Objetivo

Adicionar funcionalidade de edicao e exclusao logica para contas financeiras e
categorias, mantendo historico financeiro preservado e evitando quebra de
lancamentos ja cadastrados.

## Decisao proposta

Implementar "excluir" como exclusao logica, preenchendo `deleted_at` e
atualizando `updated_at`.

Para itens ja usados em lancamentos ou baixas, a exclusao logica deve remover o
item das listagens operacionais futuras, mas os registros historicos devem
continuar exibindo o nome da conta ou categoria por meio dos relacionamentos ja
existentes nas consultas.

Se durante a implementacao for identificado que uma consulta historica perde o
nome apos `deleted_at`, ajustar somente a consulta afetada para preservar a
exibicao historica.

## Escopo

- Adicionar edicao de contas financeiras.
- Adicionar exclusao logica de contas financeiras.
- Adicionar edicao de categorias.
- Adicionar exclusao logica de categorias.
- Incluir acoes por linha nas tabelas de `/accounts` e `/categories`, seguindo
  o padrao visual de acoes iconograficas ja usado em listagens.
- Usar formularios `POST` para acoes que alteram dados.
- Proteger todas as acoes de alteracao com CSRF.
- Preservar `user_id` em todas as consultas e alteracoes.
- Manter mensagens e rotulos em portugues.
- Atualizar o controle de release ao concluir a implementacao.

## Fora do escopo

- Remocao fisica de registros.
- Tela separada completa de detalhes para contas ou categorias.
- Restauracao de contas ou categorias excluidas.
- Auditoria detalhada para estes cadastros, a menos que seja adicionada de forma
  pequena e consistente com os models existentes.
- Alterar schema do banco, salvo se a implementacao revelar incompatibilidade.
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

As operacoes devem usar placeholders `?`, validar escopo por `user_id` e
ignorar registros ja removidos por `deleted_at`.

## Comportamento esperado

- `/accounts` mostra acoes de editar e excluir para cada conta.
- `/categories` mostra acoes de editar e excluir para cada categoria.
- Ao editar uma conta, o formulario deve vir preenchido com os dados atuais.
- Ao editar uma categoria, o formulario deve vir preenchido com os dados atuais.
- Ao salvar edicao, o usuario retorna para a listagem correspondente.
- Ao excluir, o registro deixa de aparecer na listagem principal.
- Lancamentos existentes continuam preservados e acessiveis.
- Contas excluidas nao aparecem como opcoes para novos lancamentos ou baixas.
- Categorias excluidas nao aparecem como opcoes para novos lancamentos.
- Uma tentativa de editar ou excluir registro inexistente ou de outro usuario
  nao deve alterar dados.

## Criterios de aceite

- E possivel editar nome, tipo, instituicao e saldo inicial de uma conta.
- E possivel editar nome, tipo e cor de uma categoria.
- E possivel excluir logicamente uma conta.
- E possivel excluir logicamente uma categoria.
- As acoes de exclusao usam `POST` e validacao CSRF.
- As acoes por linha seguem o padrao visual de listagem do projeto.
- O filtro `deleted_at IS NULL` continua sendo respeitado nas listagens.
- Nenhuma operacao concatena entrada do usuario em SQL.
- `npm run check` passa apos a implementacao.
- Fluxos manuais de `/accounts` e `/categories` funcionam em desktop e mobile.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/accounts`;
- criar uma conta de teste;
- editar a conta e confirmar a alteracao na listagem;
- excluir a conta e confirmar que ela deixa de aparecer;
- acessar `/categories`;
- criar uma categoria de teste;
- editar a categoria e confirmar a alteracao na listagem;
- excluir a categoria e confirmar que ela deixa de aparecer;
- confirmar que `/entries/new` nao exibe itens excluidos nos selects.

## Observacao de implementacao

Preferir alteracoes localizadas em `src/server.js`,
`src/models/FinancialAccount.js`, `src/models/Category.js`,
`src/views/accountsView.js`, `src/views/categoriesView.js` e, se necessario,
`public/css/styles.css`.

Se os helpers de acoes iconograficas ficarem duplicados entre listagens,
considerar extrair uma funcao pequena para `src/services/viewHelpers.js`, mas
evitar uma refatoracao ampla nesta task.

Ao concluir a implementacao, atualizar o controle de release em
`src/config/release.js`, incrementando o numero sequencial em 1.

## Implementacao

- Foram adicionados metodos `update` e `softDelete` em
  `src/models/FinancialAccount.js`.
- Foram adicionados metodos `update` e `softDelete` em
  `src/models/Category.js`.
- Foram criadas rotas de edicao e exclusao logica para `/accounts`.
- Foram criadas rotas de edicao e exclusao logica para `/categories`.
- As telas `/accounts` e `/categories` passaram a reutilizar o formulario para
  criacao e edicao.
- As tabelas de contas e categorias passaram a exibir acoes iconograficas de
  editar e excluir.
- A exclusao usa `POST`, validacao CSRF e preenchimento de `deleted_at`.
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
