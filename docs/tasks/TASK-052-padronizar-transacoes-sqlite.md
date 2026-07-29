# TASK-052 - Criar padrão único para transações SQLite

## Contexto

Models do EmDia controlam transações manualmente com combinações de
`BEGIN IMMEDIATE`, `COMMIT`, `ROLLBACK` e flags locais. O padrão aparece em
operações financeiras, administração de usuários, recorrências e migrations.

Embora as operações atuais estejam protegidas por testes importantes, a
repetição aumenta o risco de esquecer rollback, encerrar uma transação duas
vezes ou introduzir comportamentos diferentes entre serviços.

## Objetivo

Criar um helper transacional pequeno e explícito para padronizar atomicidade e
migrar primeiro as operações de maior risco.

**Status:** implementada em 28/07/2026.

## Padrão proposto

Adicionar um módulo dedicado, por exemplo:

```text
src/database/transaction.js
```

API conceitual:

```js
withTransaction(db, callback)
withImmediateTransaction(db, callback)
```

O callback deve executar de forma síncrona, compatível com `DatabaseSync`, e
seu valor de retorno deve ser devolvido pelo helper.

Comportamento obrigatório:

1. iniciar a transação;
2. executar o callback;
3. efetuar commit somente quando o callback terminar com sucesso;
4. efetuar rollback quando houver erro;
5. relançar o erro original;
6. não mascarar o erro original se o rollback também falhar;
7. nunca executar rollback depois de commit bem-sucedido.

## Retornos antecipados

Resultados funcionais como `not-found`, `last-admin` ou validação rejeitada não
devem exigir que cada model controle manualmente o estado da transação.

Preferir uma destas estratégias, escolhida e documentada de maneira única:

- validar antes de iniciar a transação quando não houver risco de corrida; ou
- retornar um resultado pelo callback e deixar o helper concluir a transação;
  ou
- lançar erro funcional tipado quando for necessário abortar.

Não misturar as estratégias dentro da mesma operação.

## Transações aninhadas

O helper deve detectar uso aninhado na mesma conexão.

Para esta task, a opção preferida é rejeitar aninhamento com mensagem técnica
clara. Introduzir `SAVEPOINT` somente se um caso real do projeto exigir
composição transacional.

Services chamados dentro de uma transação devem reutilizar a mesma conexão e
não iniciar implicitamente uma nova transação.

## Concorrência SQLite

Configurar `PRAGMA busy_timeout` com valor documentado e conservador, mantendo
WAL e foreign keys.

Operações que leem uma condição e depois gravam, como baixa, estorno e proteção
do último administrador, devem continuar usando transação `IMMEDIATE`.

Não adicionar tentativas automáticas indiscriminadas. Repetir uma operação
financeira inteira pode duplicar efeitos se a idempotência não estiver
garantida.

## Migração incremental

Ordem sugerida:

1. baixa financeira;
2. estorno de baixa;
3. exclusão mensal ou operações em lote;
4. alterações administrativas de usuário;
5. geração de recorrências;
6. migrator, se o helper preservar corretamente seus logs e contrato.

Não alterar todas as operações em um patch sem testes específicos de rollback.

## Auditoria

Em operações sensíveis, alteração financeira e auditoria devem permanecer na
mesma transação.

O helper não deve registrar automaticamente dados de negócio. O chamador
continua responsável por eventos operacionais e auditoria com contexto
apropriado.

## Escopo

- criar helper transacional;
- definir comportamento para erros e retornos;
- detectar ou documentar transações aninhadas;
- configurar `busy_timeout`;
- migrar operações críticas por etapas;
- remover flags transacionais que se tornarem desnecessárias;
- adicionar testes de commit, rollback e falhas intermediárias;
- atualizar padrões e arquitetura;
- atualizar o controle de release ao concluir a implementação.

## Fora de escopo

- trocar SQLite por outro banco;
- introduzir ORM;
- suportar transações distribuídas;
- adicionar retry automático de operações financeiras;
- refatorar todas as regras de negócio;
- criar abstração genérica de repository;
- implementar Unit of Work além do necessário para a conexão SQLite atual.

## Critérios de aceite

- existe um único helper documentado para novas transações;
- callback bem-sucedido produz exatamente um commit;
- exceção produz rollback e preserva o erro original;
- retorno antecipado não deixa transação aberta;
- falha no rollback não oculta a causa original;
- aninhamento é tratado explicitamente;
- baixa e estorno continuam atômicos;
- auditoria falhando reverte toda a operação financeira;
- proteção do último administrador permanece segura contra concorrência;
- `busy_timeout` é aplicado às conexões do projeto;
- banco de testes permanece isolado do banco local;
- nenhuma operação passa a duplicar efeitos por retry implícito;
- `npm run check` e `npm test` passam.

## Cenários de validação

1. Callback retorna valor e a alteração é persistida.
2. Callback lança antes da primeira gravação.
3. Callback lança depois de múltiplas gravações.
4. Auditoria falha após criação de settlement.
5. Estorno falha após atualizar o lançamento.
6. Operação funcional retorna `not-found` sem deixar transação aberta.
7. Tentar iniciar transação aninhada.
8. Simular falha de rollback e confirmar preservação da causa original.
9. Manter duas conexões concorrentes durante uma operação `IMMEDIATE`.
10. Executar toda a suíte financeira.

## Arquivos candidatos

- `src/database/transaction.js`;
- `src/database/connection.js`;
- `src/database/migrator.js`;
- `src/models/FinancialEntry.js`;
- `src/models/User.js`;
- `src/models/Recurrence.js`;
- `test/unit/transaction.test.js`;
- `test/integration/financialModels.test.js`;
- `docs/patterns.md`;
- `docs/architecture.md`;
- `src/config/release.js`.

## Dependências

Pode ser implementada independentemente da modularização de rotas. Seus testes
devem servir de base para a TASK-053.

---

## Assinatura da LLM

- Data: 28/07/2026 21:04
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Implementação

- Criado `src/database/transaction.js` com `withTransaction` e
  `withImmediateTransaction`, callbacks síncronos, retorno transparente,
  commit único e rollback com preservação do erro original.
- Aninhamento iniciado pelo helper ou manualmente na mesma conexão é rejeitado
  com `SQLITE_NESTED_TRANSACTION`.
- Falhas do rollback são associadas a `error.rollbackError`, sem substituir a
  exceção que causou o abort.
- `PRAGMA busy_timeout = 5000` passou a ser aplicado à conexão principal e às
  conexões de leitura do fluxo de backup. O probe exclusivo de restauração
  mantém timeout zero por decisão operacional explícita.
- Baixa, estorno, exclusão mensal, administração de usuários, geração de
  recorrências e execução de migrations foram migrados para o helper.
- Resultados funcionais passaram a retornar pelo callback; flags locais de
  transação e rollbacks antecipados foram removidos.
- Testes cobrem commit, retorno funcional, falhas antes e depois de gravações,
  aninhamento, falha de rollback, callback assíncrono, concorrência
  `IMMEDIATE`, busy timeout e rollbacks de negócio/auditoria.
- `npm run check` e `npm test` foram executados com sucesso.
- A release foi incrementada para `Release 28/07/2026 22:42 - 074`.

---

## Assinatura da LLM

- Data: 28/07/2026 22:42
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
