# TASK-067 - Garantir atomicidade semântica da duplicação de lançamento

## Contexto

O fluxo atual de duplicação cria o novo lançamento por meio de
`FinancialEntry.create`, que registra uma auditoria `created` dentro da
transação. Depois do retorno ao módulo de rota, uma segunda auditoria
`duplicated` registra o vínculo com o lançamento de origem.

Se houver falha entre essas etapas, a cópia permanece criada sem o evento que
explica sua origem. Além disso, uma regra de negócio relevante fica dividida
entre model e rota.

## Objetivo

Concentrar a duplicação no núcleo financeiro e garantir que criação da cópia,
vínculo com a origem e auditoria semântica sejam persistidos atomicamente.

## Regras funcionais e técnicas

- Localizar o lançamento de origem pelo `user_id` autenticado.
- Criar a cópia e registrar todos os eventos de auditoria necessários na mesma
  transação.
- A auditoria deve identificar de forma segura `source_entry_id` e o ID da
  cópia.
- Definir um contrato claro para os eventos: evitar registros redundantes sem
  significado ou documentar por que `created` e `duplicated` coexistem.
- Não registrar a auditoria semântica na rota HTTP.
- Preservar descrição com indicação de cópia, categoria, favorecido, conta,
  valor previsto, competência, vencimento e observações conforme o
  comportamento atual.
- Não copiar valor realizado, settlements, estornos, status final, auditorias
  antigas nem vínculos externos.
- A cópia deve iniciar sem baixa e ter status derivado pelas regras atuais para
  o dia civil do usuário.
- Se qualquer inserção ou auditoria falhar, não deixar a cópia persistida.
- Manter proteção CSRF e redirecionamento atual da rota.

## Arquivos candidatos

- `src/models/FinancialEntry.js`;
- `src/routes/entryRoutes.js`;
- `test/integration/financialModels.test.js`;
- `test/integration/financialRoutes.test.js`;
- `docs/patterns.md`, se o contrato de auditoria de comandos compostos for
  generalizado;
- `src/config/release.js`, ao concluir a implementação desta task.

## Fora do escopo

- permitir escolher outra competência durante a duplicação;
- duplicar settlements, anexos, comprovantes ou histórico;
- duplicação em lote;
- alterar a interface além de mensagens necessárias;
- criar uma camada genérica de command bus;
- implementar esta task no momento de sua criação.

## Critérios de aceite

- a rota delega a duplicação integralmente ao model/service financeiro;
- criação e auditoria semântica usam uma única transação;
- falha na auditoria reverte a criação da cópia;
- a auditoria permite relacionar inequivocamente origem e cópia;
- a cópia pertence ao mesmo usuário e não contém valores realizados ou baixas;
- lançamento inexistente ou pertencente a outro usuário não gera cópia nem
  auditoria;
- o comportamento visível atual da duplicação é preservado;
- os testes existentes continuam passando.

## Testes esperados

- duplicação bem-sucedida com todos os campos permitidos preservados;
- cópia com `realized_amount_cents = 0` e sem settlements;
- status da cópia derivado novamente no fuso do usuário;
- auditoria contendo origem e destino;
- trigger provocando falha de auditoria e rollback integral;
- ID inexistente ou de outro usuário sem efeito;
- rota protegida por CSRF e redirecionando para a competência correta;
- ausência de chamada direta a `AuditLog.record` para duplicação na rota.

## Validação esperada

- executar `npm run check`;
- executar `npm test`;
- conferir no banco temporário que cópia e auditoria são commitadas ou
  revertidas juntas;
- não usar o banco local em `data/`;
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

- inserção financeira foi extraída para helper interno que exige transação
  SQLite ativa;
- duplicação passou a localizar a origem, criar a cópia e registrar auditoria
  `duplicated` em uma única transação `IMMEDIATE`;
- o evento semântico contém `source_entry_id` e `duplicated_entry_id`, sem
  registro redundante `created` para a cópia;
- a rota deixou de registrar auditoria e preserva apenas o contrato HTTP;
- testes comprovam ausência de settlements copiados e rollback integral quando
  a auditoria falha;
- release incrementada para `Release 08/08/2026 10:54 - 114`.

---

## Assinatura da LLM

- Data: 08/08/2026 10:54
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
