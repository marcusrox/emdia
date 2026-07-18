# TASK-044 - Permitir estorno de baixas financeiras

## Contexto

O EmDia registra pagamentos e recebimentos em `settlements` e recalcula o
valor realizado e o status do lançamento. Entretanto, ainda não existe um
fluxo seguro para corrigir uma baixa registrada por engano.

Apagar a baixa ou sobrescrever o valor realizado eliminaria evidências do que
ocorreu. Como se trata de histórico financeiro, o estorno deve ser explícito,
auditável e transacional.

## Objetivo

Permitir que o usuário estorne uma baixa individual, informando um motivo,
preservando o registro original e recalculando de forma consistente o valor
realizado e o status do lançamento.

**Status:** implementada em 18/07/2026.

## Decisão de modelagem

O estorno não deve excluir nem editar silenciosamente a baixa original. A
implementação deve manter evidência imutável da baixa e registrar, no mínimo:

- identificador da baixa estornada;
- usuário responsável;
- data/hora do estorno em ISO;
- motivo informado;
- vínculo com o lançamento;
- auditoria da operação.

A forma exata pode ser uma tabela própria de estornos ou campos controlados em
`settlements`, desde que preserve histórico, integridade e compatibilidade com
bancos existentes. Mudanças de schema devem usar uma nova migration.

## Escopo

- adicionar persistência compatível para estornos;
- adicionar operação transacional no model ou service responsável;
- recalcular `realized_amount_cents` a partir das baixas vigentes;
- recalcular status com `deriveStatus`;
- registrar auditoria com motivo e identificadores necessários;
- adicionar ação de estorno no detalhe do lançamento;
- solicitar confirmação explícita e motivo obrigatório;
- distinguir visualmente baixas vigentes e estornadas;
- impedir estorno repetido ou de baixa pertencente a outro usuário.

## Regras funcionais

- somente baixas vigentes podem ser estornadas;
- uma baixa estornada permanece visível no histórico;
- o motivo é obrigatório, deve ser validado no backend e ter limite de tamanho;
- a alteração usa POST e proteção CSRF;
- lançamento, baixa e usuário devem ser validados em uma única operação segura;
- o valor realizado deve refletir apenas baixas não estornadas;
- o status deve ser derivado novamente após o estorno;
- lançamento antes liquidado pode voltar a parcial, pendente ou vencido;
- o vencimento e a data civil corrente devem ser considerados no novo status;
- a operação e sua auditoria devem ocorrer na mesma transação;
- falha em qualquer etapa deve preservar integralmente o estado anterior;
- dados de outro usuário não podem ser revelados por mensagens diferentes.

## Interface e acessibilidade

- exibir a ação próxima à baixa correspondente, não como ação global ambígua;
- usar confirmação clara, informando que o histórico será preservado;
- exigir o motivo antes de habilitar ou concluir a ação;
- manter a ação visualmente secundária e identificada por texto acessível;
- marcar a baixa como **Estornada**, exibindo data e motivo de forma segura;
- não depender apenas de tachado ou cor;
- manter o layout utilizável em telas pequenas.

## Auditoria

Registrar evento específico de estorno contendo somente dados necessários,
como lançamento, baixa, valores envolvidos e motivo. Não registrar senha,
sessão, dados bancários sensíveis ou conteúdo além do necessário para a
investigação.

## Fora de escopo

- editar uma baixa existente;
- excluir definitivamente baixas ou estornos;
- estorno parcial de uma única baixa;
- desfazer o estorno;
- conciliação bancária;
- movimentação automática de saldo de conta;
- permissões administrativas especiais para estorno.

## Critérios de aceite

- usuário consegue estornar uma baixa própria vigente com motivo obrigatório;
- baixa original permanece consultável e identificada como estornada;
- `realized_amount_cents` passa a refletir somente baixas vigentes;
- status do lançamento é recalculado corretamente;
- tentativa de repetir o estorno é rejeitada sem alterar dados;
- tentativa contra baixa de outro usuário é rejeitada sem exposição de dados;
- estorno e auditoria são atômicos;
- erro durante a operação provoca rollback completo;
- detalhe do lançamento diferencia baixas vigentes e estornadas;
- formulários usam POST, CSRF e escape de HTML;
- bancos locais existentes são atualizados por migration;
- `npm run check` e os testes financeiros passam após a implementação.

## Cenários de validação

1. Estornar a única baixa total e confirmar retorno a pendente ou vencido.
2. Estornar uma entre várias baixas e confirmar status parcial e saldo aberto.
3. Estornar baixa de receita e confirmar os estados de recebimento.
4. Tentar estornar a mesma baixa duas vezes.
5. Tentar estornar sem motivo e com motivo acima do limite.
6. Tentar acessar a baixa de outro usuário.
7. Simular falha na auditoria e confirmar rollback.
8. Conferir histórico, data, motivo e identificação visual no desktop e celular.
9. Executar migration em banco de teste existente e em banco novo.
10. Executar `npm test` e `npm run check`.
11. Em servidor próprio na porta 3100 ou próxima livre, validar o fluxo sem usar
    a porta 3000.

## Arquivos candidatos

- `src/database/migrations/005_add_settlement_reversals.js` ou numeração
  disponível no momento da implementação;
- `src/database/seed.js`, somente se necessário;
- `src/models/Settlement.js`;
- `src/models/FinancialEntry.js`;
- `src/models/AuditLog.js`;
- `src/server.js`;
- `src/views/entriesView.js`;
- `public/css/styles.css`;
- testes financeiros;
- `package.json`, caso o check precise incluir uma migration nova;
- `src/config/release.js`, ao concluir a implementação.

## Observações de implementação

Evitar atualizar o valor realizado por simples subtração sem validar o conjunto
de baixas. Sempre que possível, recalcular o total a partir das baixas vigentes
dentro da transação, reduzindo risco de divergência acumulada.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando
o número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 17/07/2026 23:46
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 18/07/2026 00:32
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
