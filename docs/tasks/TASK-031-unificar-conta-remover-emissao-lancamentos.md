# TASK-031 - Unificar conta e remover emissão dos lançamentos

## Contexto

O formulário de novo lançamento financeiro apresenta atualmente dois campos de
conta, "Conta prevista" e "Conta efetiva", além do campo opcional "Emissão".
Essa separação aumenta a complexidade do cadastro e se propaga pelo banco,
validação, models, filtros, recorrências, seed e telas de lançamentos.

O produto deve trabalhar com uma única conta associada ao lançamento. A conta
usada ao registrar uma baixa continua sendo persistida em `settlements`, pois
cada baixa possui seu próprio vínculo contábil e não deve perder esse histórico.

## Objetivo

Substituir `expected_account_id` e `actual_account_id` por um único campo de
conta no lançamento e remover `issue_date` de todo o fluxo de lançamentos,
incluindo persistência, validação, cadastro, edição, consulta, filtros,
recorrências, seed e demais telas que apresentem ou consumam esses dados.

## Decisões técnicas

- Usar `financial_account_id` como nome da coluna única em `financial_entries`.
- Manter `financial_account_id` em `settlements`; esse campo representa a conta
  específica da baixa e não deve ser removido ou confundido com a conta do
  lançamento.
- Remover `expected_account_id`, `actual_account_id` e `issue_date` de
  `financial_entries` por meio de uma nova migration.
- Não editar migrations já aplicadas para realizar a alteração incremental.
- Na migração de dados existentes, escolher a conta com a seguinte precedência:
  `actual_account_id`, quando preenchida, e depois `expected_account_id`.
- Preservar `NULL` quando nenhuma das contas antigas estiver informada.
- Manter valores monetários, competência, vencimento, status e baixas sem
  alteração de significado.
- Continuar usando CommonJS, SQLite via `node:sqlite` e placeholders `?`.

## Escopo

- Criar uma nova migration em `src/database/migrations/` para transformar a
  tabela `financial_entries` com segurança e migrar os dados existentes.
- Ajustar `src/models/FinancialEntry.js` para criar, atualizar, consultar,
  listar e filtrar usando somente `financial_account_id`.
- Ajustar a integração do lançamento com o fluxo de baixa sem sobrescrever ou
  eliminar as contas registradas em `settlements`.
- Ajustar `src/services/formValidation.js` para validar somente a conta única e
  eliminar a validação de `issue_date`.
- Ajustar o formulário de novo lançamento e de edição em
  `src/views/entriesView.js` para exibir apenas o campo "Conta" e remover
  "Emissão".
- Ajustar listagem e detalhe do lançamento para consumir o nome da conta única,
  sem fallbacks para conta prevista ou efetiva.
- Ajustar filtros por conta para consultar somente `financial_account_id`.
- Ajustar `src/models/Recurrence.js` e `src/views/recurrencesView.js` para que
  recorrências usem o mesmo conceito de conta única ao gerar lançamentos.
- Ajustar `src/database/seed.js` para popular a coluna única.
- Localizar e eliminar referências remanescentes a `expected_account_id`,
  `actual_account_id`, `expected_account_name`, `actual_account_name` e
  `issue_date` no fluxo de lançamentos.
- Atualizar documentação técnica que descreva os campos antigos, quando
  aplicável.
- Atualizar o controle de release ao concluir a implementação.

## Migration e compatibilidade

A migration deve funcionar tanto em banco novo quanto em banco local já
existente e não pode apagar lançamentos, baixas ou histórico.

Como SQLite possui limitações para remover colunas e preservar constraints, a
implementação deve seguir o padrão seguro de reconstrução da tabela quando
necessário:

1. criar uma tabela temporária com o schema novo;
2. copiar todos os registros, preenchendo `financial_account_id` com
   `COALESCE(actual_account_id, expected_account_id)`;
3. preservar IDs, usuário, tipo, descrição, valores, competência, vencimento,
   recorrência, status e timestamps;
4. substituir a tabela antiga pela nova dentro de transação;
5. recriar índices, chaves estrangeiras e constraints aplicáveis;
6. validar a integridade referencial ao final.

A implementação deve revisar a ordem e o comportamento das migrations para que
um banco vazio termine diretamente no schema atual e para que um banco criado
por versões anteriores seja atualizado uma única vez.

## Regras funcionais

- Novo lançamento deve oferecer apenas um seletor "Conta".
- Edição deve carregar e salvar apenas essa conta.
- A conta pode continuar opcional caso essa seja a regra vigente do formulário.
- A conta selecionada no lançamento deve ser a sugestão inicial no formulário
  de baixa, mas o usuário pode escolher outra conta para a baixa.
- Registrar uma baixa não deve alterar silenciosamente a conta do lançamento.
- Lançamentos antigos com conta efetiva e prevista diferentes devem preservar
  a conta efetiva como conta única após a migration.
- O campo "Emissão" não deve aparecer no cadastro, edição, detalhe, listagem,
  filtros, validações, payloads ou auditoria de novas alterações.
- Competência continua obrigatória no formato `YYYY-MM`, com padrão no mês
  corrente do usuário quando não informada.
- Vencimento continua sendo uma data civil em `YYYY-MM-DD`.
- Status deve continuar sendo calculado por `deriveStatus` após alterações ou
  baixas.

## Fora do escopo

- Remover ou unificar a conta própria de `settlements`.
- Alterar a regra de valores previstos e realizados.
- Alterar o modelo de competência ou vencimento.
- Redesenhar visualmente as telas além da remoção e reorganização pontual dos
  campos afetados.
- Alterar dependências, ORM ou banco de dados.
- Apagar ou recriar automaticamente o arquivo SQLite local.
- Implementar esta task neste momento.

## Critérios de aceite

- O formulário de novo lançamento exibe apenas um campo "Conta" e não exibe o
  campo "Emissão".
- O formulário de edição apresenta o mesmo comportamento.
- A tabela `financial_entries` possui `financial_account_id` e não possui mais
  `expected_account_id`, `actual_account_id` ou `issue_date` após as migrations.
- Dados existentes são preservados, priorizando a antiga conta efetiva e usando
  a antiga conta prevista como fallback.
- Listagem, detalhe e filtros exibem e usam somente a conta única.
- Recorrências continuam gerando lançamentos com a conta configurada.
- O seed funciona com o schema novo.
- O formulário de baixa sugere a conta do lançamento, permite escolher outra e
  persiste a conta escolhida em `settlements`.
- Baixas existentes e suas contas permanecem intactas.
- Não restam referências funcionais aos nomes dos campos removidos, exceto na
  migration de compatibilidade e em documentação histórica que precise explicar
  a conversão.
- Dados de usuário continuam escapados nas views e consultas continuam usando
  placeholders.
- `npm run check` passa.

## Validação sugerida

```powershell
npm run check
```

Validação de migration:

- aplicar as migrations em banco vazio e confirmar o schema final;
- aplicar a nova migration em cópia segura de banco anterior;
- testar lançamento com somente conta prevista antiga;
- testar lançamento com somente conta efetiva antiga;
- testar lançamento com as duas contas antigas diferentes e confirmar a
  precedência da conta efetiva;
- testar lançamento sem conta;
- confirmar preservação das baixas e das contas em `settlements`;
- executar `PRAGMA foreign_key_check` no banco de teste.

Validação funcional, usando `PORT=3100` ou a próxima porta livre:

- testar `GET /health`;
- testar `GET /dashboard`;
- testar `GET /entries`;
- criar e editar lançamento com conta;
- criar e editar lançamento sem conta, se permitido pela validação vigente;
- filtrar lançamentos por conta;
- registrar baixa usando a conta sugerida;
- registrar baixa escolhendo conta diferente;
- gerar lançamento a partir de recorrência;
- confirmar que "Conta prevista", "Conta efetiva" e "Emissão" não aparecem
  nas telas afetadas.

## Observações de implementação

Antes de implementar, revisar migrations já aplicadas e o estado atual do
workspace. A migration deve ser pequena, explícita e transacional, sem editar o
banco em `data/` durante o desenvolvimento da solução.

Também deve ser feita uma busca global pelos nomes antigos após o patch. É
aceitável que eles permaneçam apenas na migration que converte dados legados ou
em registros históricos de tasks; não devem permanecer em código operacional.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1.

---

## Assinatura da LLM

- Data: 16/07/2026 19:24
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

## Implementação

- Foi criada a migration `003_unify_entry_account_remove_issue_date` para
  adicionar `financial_account_id`, migrar os dados com precedência da antiga
  conta efetiva e remover as três colunas legadas.
- Foi criado um índice para consultas por usuário, conta, competência e estado
  de exclusão lógica.
- `FinancialEntry` passou a criar, editar, duplicar, listar, detalhar e filtrar
  lançamentos usando somente a conta única.
- O registro de baixa deixou de alterar a conta do lançamento; a conta escolhida
  continua registrada exclusivamente no settlement correspondente.
- A validação do lançamento passou a aceitar somente `financial_account_id` e
  deixou de processar emissão.
- Recorrências passaram a gerar lançamentos com `financial_account_id`, tiveram
  o rótulo simplificado para "Conta" e passaram a validar existência e estado
  ativo da conta selecionada.
- Formulários, listagens, detalhe e sugestão de conta da baixa foram ajustados
  para o campo único.
- Seed, documentação técnica e `npm run check` foram atualizados.
- A migration foi validada em banco legado temporário, incluindo precedência de
  dados e `PRAGMA foreign_key_check`.
- Banco novo, seed, models e endpoints principais foram validados em ambiente
  temporário, sem alterar o banco local ou usar a porta 3000.

---

## Assinatura da LLM

- Data: 16/07/2026 19:34
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização
