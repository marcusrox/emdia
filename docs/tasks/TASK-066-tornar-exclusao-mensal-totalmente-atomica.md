# TASK-066 - Tornar a exclusão mensal totalmente atômica

## Contexto

A exclusão mensal de lançamentos calcula a quantidade de registros elegíveis
antes de iniciar a transação que aplica `deleted_at` e grava a auditoria. Em
concorrência, a quantidade apresentada ao usuário e registrada no audit log
pode divergir da quantidade efetivamente alterada.

Como se trata de uma operação financeira em lote, a leitura da condição, a
exclusão lógica e a auditoria devem constituir uma única unidade atômica.

## Objetivo

Executar a exclusão lógica dos lançamentos de uma competência e o respectivo
registro de auditoria em uma única transação SQLite, retornando a quantidade
realmente alterada pelo comando de atualização.

## Regras funcionais e técnicas

- Manter a confirmação explícita da competência e o aceite do impacto.
- Iniciar a transação antes de ler ou alterar os lançamentos elegíveis.
- Preferir `withImmediateTransaction` para proteger a leitura de condição
  seguida de gravação, conforme o padrão do projeto.
- Obter `deleted_count` do resultado efetivo do `UPDATE` ou de uma leitura
  protegida dentro da mesma transação.
- Gravar a auditoria na mesma transação e com a quantidade efetivamente
  excluída.
- Se a auditoria falhar, reverter todas as exclusões lógicas.
- Se nenhuma linha for elegível, manter resultado funcional previsível e
  auditoria coerente com zero, conforme a regra atual aprovada.
- Restringir a operação por `user_id`, `competence_month` e `deleted_at IS NULL`.
- Preservar settlements, estornos e demais históricos vinculados; a operação
  continua sendo exclusão lógica de `financial_entries`.
- Não adicionar retry automático a conflito ou lock financeiro.

## Arquivos candidatos

- `src/models/FinancialEntry.js`;
- `src/routes/entryRoutes.js`, somente se o contrato de retorno precisar ser
  ajustado;
- `test/integration/financialModels.test.js`;
- `test/integration/financialRoutes.test.js`;
- `docs/patterns.md`, somente se houver novo padrão transacional reutilizável;
- `src/config/release.js`, ao concluir a implementação desta task.

## Fora do escopo

- criar restauração de lançamentos excluídos;
- excluir fisicamente lançamentos ou settlements;
- alterar a confirmação visual da exclusão mensal, salvo o necessário para
  refletir o resultado correto;
- excluir lançamentos de várias competências em uma única ação;
- implementar retry automático para `SQLITE_BUSY`;
- implementar esta task no momento de sua criação.

## Critérios de aceite

- contagem, exclusão lógica e auditoria ocorrem sob a mesma transação;
- o retorno `deletedCount` corresponde ao número de linhas efetivamente
  alteradas;
- uma falha na auditoria deixa todos os lançamentos intactos;
- requisições concorrentes não produzem contagem positiva duplicada para as
  mesmas linhas;
- lançamentos de outro usuário ou de outra competência não são alterados;
- settlements e auditorias históricas permanecem preservados;
- a mensagem da interface usa o resultado transacional correto;
- os testes existentes continuam passando.

## Testes esperados

- exclusão de mês com um e vários lançamentos;
- mês sem lançamentos elegíveis retornando zero;
- lançamentos já excluídos não entrando na contagem;
- rollback integral quando a inserção de auditoria falha;
- duas conexões tentando excluir a mesma competência sem dupla contagem;
- isolamento entre usuários e competências;
- preservação de settlements vinculados aos lançamentos excluídos logicamente;
- rota exibindo a quantidade retornada pelo model.

## Validação esperada

- executar `npm run check`;
- executar `npm test`;
- usar banco temporário e duas conexões nos testes de concorrência;
- não alterar arquivos SQLite locais em `data/`;
- atualizar `src/config/release.js` ao concluir a implementação, incrementando
  o sequencial conforme o padrão do projeto.

---

## Assinatura da LLM

- Data: 08/08/2026 10:45
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao

---

## Implementação concluída

- exclusão lógica mensal passou a usar `withImmediateTransaction`;
- a quantidade excluída agora vem de `UPDATE ... .changes`, dentro da mesma
  transação que registra a auditoria;
- o retorno funcional e o payload auditado refletem exatamente as linhas
  alteradas, inclusive quando nenhuma linha permanece elegível;
- testes cobrem múltiplos lançamentos, repetição da operação, outra competência,
  outro usuário e rollback por falha de auditoria;
- release incrementada para `Release 08/08/2026 10:52 - 113`.

---

## Assinatura da LLM

- Data: 08/08/2026 10:52
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
