# TASK-032 - Bloquear baixa em lançamento liquidado ou incompatível

## Contexto

O EmDia permite atualmente enviar `POST /entries/:id/settlements` mesmo quando
o lançamento já está pago ou recebido. O método `FinancialEntry.settle` valida
os campos da baixa, cria o registro em `settlements` e soma o valor realizado,
mas não verifica previamente se o status do lançamento aceita uma nova baixa ou
se ainda existe saldo em aberto.

Na tela de detalhe, o formulário "Registrar baixa" também permanece disponível
independentemente do status. Isso permite baixas duplicadas, especialmente por
reenvio do formulário, duplo clique, duas abas abertas ou tentativa direta à
rota POST.

## Objetivo

Centralizar e aplicar as regras que determinam quando um lançamento pode receber
uma baixa, bloqueando lançamentos liquidados, cancelados ou sem saldo em aberto
tanto no backend quanto na interface, com instruções claras ao usuário.

## Regra funcional

Uma nova baixa pode ser iniciada somente quando todas estas condições forem
verdadeiras:

- o lançamento existe, pertence ao usuário e não está excluído;
- o status atual permite movimentação financeira;
- o valor realizado é menor que o valor previsto;
- existe saldo principal em aberto;
- os dados da baixa são válidos.

Status que permitem baixa:

- `PENDING`;
- `OVERDUE`;
- `PARTIALLY_PAID`, para despesas;
- `PARTIALLY_RECEIVED`, para receitas.

Status que devem bloquear baixa:

- `PAID`, com a mensagem "Este lançamento já está pago e não aceita uma nova baixa.";
- `RECEIVED`, com a mensagem "Este lançamento já foi recebido e não aceita uma nova baixa.";
- `CANCELLED`, com a mensagem "Lançamentos cancelados não aceitam baixa.";
- `DRAFT`, enquanto o fluxo de rascunho não definir confirmação explícita;
- qualquer status desconhecido ou incompatível com o tipo do lançamento;
- qualquer lançamento cujo `realized_amount_cents` seja maior ou igual a
  `expected_amount_cents`, mesmo que o status armazenado esteja desatualizado.

O backend é a fonte de verdade. Esconder ou desabilitar o formulário na tela não
substitui a validação em `FinancialEntry.settle`.

## Valor da baixa e saldo em aberto

- Calcular o saldo principal em aberto como
  `expected_amount_cents - realized_amount_cents`, limitado ao mínimo de zero.
- O valor principal sugerido deve continuar sendo o saldo em aberto.
- O valor principal informado não pode ultrapassar o saldo em aberto.
- Juros, multa, desconto e outros ajustes continuam compondo o total da baixa
  conforme as regras atuais.
- O total final deve continuar maior que zero.
- Se juros ou multa fizerem o total realizado superar o valor originalmente
  previsto, isso não deve ser tratado como uma segunda parcela principal; a
  baixa deve ser aceita apenas quando o principal respeitar o saldo disponível.
- Depois de uma baixa que liquide o principal, o status deve ser recalculado por
  `deriveStatus` e novas baixas devem ser bloqueadas.

## Concorrência e atomicidade

A verificação de elegibilidade, a criação do settlement, a atualização do valor
realizado/status e a auditoria devem ocorrer na mesma transação SQLite.

Antes de inserir o settlement, o lançamento deve ser relido dentro da operação.
O fluxo precisa impedir que duas submissões concorrentes ou repetidas usem o
mesmo saldo em aberto. Se o saldo tiver sido consumido por outra requisição, a
segunda tentativa deve falhar sem criar settlement adicional.

Em caso de erro, nenhuma parte da baixa pode permanecer gravada: settlement,
valor realizado, status e auditoria devem ser revertidos juntos.

## Escopo

- Criar uma regra reutilizável para avaliar se um lançamento aceita baixa e
  retornar o motivo do bloqueio.
- Ajustar `FinancialEntry.settle` em `src/models/FinancialEntry.js` para validar
  elegibilidade antes de criar o settlement.
- Validar o valor principal contra o saldo em aberto.
- Tornar o fluxo de baixa transacional e resistente a submissão duplicada.
- Manter a conta escolhida na baixa em `settlements.financial_account_id`, sem
  alterar a conta do lançamento.
- Ajustar a rota `POST /entries/:id/settlements` em `src/server.js` para tratar o
  bloqueio como erro de negócio esperado, sem resposta genérica de servidor.
- Ajustar `entryDetailView` em `src/views/entriesView.js` para exibir o
  formulário somente quando a baixa for permitida.
- Quando bloqueada, substituir o formulário por uma mensagem específica,
  informando o status e a razão do bloqueio.
- Preservar listagem de baixas e histórico do lançamento mesmo quando o
  formulário estiver bloqueado.
- Registrar tentativa bloqueada no log operacional sem criar evento financeiro
  de baixa e sem expor dados sensíveis.
- Atualizar documentação técnica caso a regra de elegibilidade seja
  centralizada em um service.
- Atualizar o controle de release ao concluir a implementação.

## Apresentação ao usuário

Na tela de detalhe:

- lançamento apto: exibir normalmente o formulário "Registrar baixa";
- lançamento pago: exibir "Lançamento pago. Não há saldo disponível para nova baixa.";
- lançamento recebido: exibir "Lançamento recebido. Não há saldo disponível para nova baixa.";
- lançamento cancelado: exibir "Lançamento cancelado. Reative ou crie outro lançamento para registrar um pagamento ou recebimento.";
- status incompatível: exibir "Este lançamento não aceita baixa no status atual.";
- saldo zerado com status inconsistente: exibir "Não há saldo disponível. Atualize a página para consultar o status atual.".

As mensagens devem ficar próximas da área onde o formulário seria apresentado,
com semântica acessível e sem depender apenas de cor. Não renderizar controles
desabilitados que possam sugerir que existe uma forma de prosseguir.

Quando uma tentativa POST for bloqueada, retornar a tela de detalhe com status
HTTP adequado (`400` ou `409`, conforme o padrão adotado) e a mesma orientação
visível. Não redirecionar silenciosamente nem exibir erro técnico ao usuário.

## Fora do escopo

- Implementar estorno de baixa.
- Reabrir automaticamente lançamentos pagos, recebidos ou cancelados.
- Excluir ou editar settlements existentes.
- Alterar a conta associada ao lançamento ao registrar baixa.
- Criar saldo credor ou permitir pagamento antecipado acima do principal.
- Alterar o cálculo geral de status além do necessário para garantir a
  elegibilidade da baixa.
- Criar sistema completo de idempotency key nesta task, caso a transação e a
  validação atômica resolvam adequadamente a duplicidade local.
- Implementar esta task neste momento.

## Critérios de aceite

- Despesa `PENDING` ou `OVERDUE` com saldo aceita baixa.
- Despesa `PARTIALLY_PAID` com saldo aceita nova baixa até completar o principal.
- Receita `PENDING` ou `OVERDUE` com saldo aceita baixa.
- Receita `PARTIALLY_RECEIVED` com saldo aceita nova baixa até completar o
  principal.
- Despesa `PAID` bloqueia nova baixa no backend e não exibe formulário.
- Receita `RECEIVED` bloqueia nova baixa no backend e não exibe formulário.
- Lançamento `CANCELLED` ou `DRAFT` bloqueia nova baixa.
- Status parcial incompatível com o tipo do lançamento bloqueia a baixa.
- `realized_amount_cents >= expected_amount_cents` bloqueia a baixa mesmo com
  status desatualizado.
- Principal maior que o saldo em aberto é rejeitado com mensagem que informa o
  saldo disponível.
- Juros, multa e demais ajustes válidos continuam funcionando sem permitir uma
  segunda baixa principal após a liquidação.
- Duas submissões repetidas não criam dois settlements para o mesmo saldo.
- Uma tentativa bloqueada não altera settlement, valor realizado, status ou
  auditoria financeira.
- Erro durante qualquer etapa reverte toda a transação.
- A tela continua mostrando baixas e histórico em lançamentos liquidados.
- Mensagens de bloqueio são específicas, claras e acessíveis.
- `npm run check` passa.

## Validação sugerida

```powershell
npm run check
```

Validação de model e banco em ambiente temporário:

- criar despesa pendente e registrar baixa parcial;
- registrar a baixa restante e confirmar status `PAID`;
- tentar terceira baixa e confirmar que nenhum settlement foi criado;
- repetir o fluxo para receita até `RECEIVED`;
- tentar baixar lançamento cancelado;
- simular status desatualizado com valor realizado igual ao previsto;
- tentar principal um centavo maior que o saldo;
- testar juros e multa com principal dentro do saldo;
- simular falha após a criação do settlement e confirmar rollback integral;
- verificar a quantidade de settlements e eventos de auditoria antes e depois
  de cada tentativa bloqueada.

Validação HTTP própria, usando `PORT=3100` ou a próxima porta livre:

- testar `GET /health`;
- testar `GET /entries/:id` para lançamento pendente, parcial, pago, recebido e
  cancelado;
- confirmar presença do formulário apenas nos estados permitidos;
- enviar POST direto para lançamento pago, recebido e cancelado;
- confirmar status HTTP esperado e mensagem de orientação;
- repetir rapidamente a mesma submissão e confirmar apenas uma baixa efetiva;
- não iniciar, reutilizar ou encerrar processos na porta 3000.

## Observações de implementação

Evitar espalhar listas de status em model, rota e view. Preferir um helper de
negócio único, por exemplo `settlementEligibility(entry)`, que retorne algo como
`{ allowed, reason, message, openAmountCents }`. A view pode consumir esse
resultado para apresentação, mas o model deve recalcular a elegibilidade com os
dados atuais antes de persistir.

A validação do limite de principal depende do lançamento e não deve ficar apenas
em uma validação genérica de formulário sem acesso ao saldo atual.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1.

---

## Assinatura da LLM

- Data: 16/07/2026 19:47
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

## Implementação

- Foi criada `settlementEligibility` em `src/services/statusService.js` como
  regra única para status permitidos, status bloqueados e saldo em aberto.
- `FinancialEntry.settle` passou a executar a releitura do lançamento,
  elegibilidade, validação, criação do settlement, atualização financeira e
  auditoria em transação `BEGIN IMMEDIATE`.
- O principal passou a ser limitado ao saldo em aberto, com mensagem contendo o
  valor disponível.
- Tentativas em lançamentos pagos, recebidos, cancelados, em rascunho, sem saldo
  ou com status incompatível são rejeitadas antes da criação do settlement.
- Erros de elegibilidade usam código `SETTLEMENT_NOT_ALLOWED` e status HTTP 409.
- A rota registra tentativas bloqueadas somente no log operacional, com o motivo
  e sem criar auditoria financeira.
- A tela de detalhe deixou de renderizar o formulário quando a baixa não é
  permitida e passou a mostrar uma orientação específica com `role="status"`.
- Baixas existentes e histórico continuam visíveis em lançamentos liquidados.
- A documentação técnica foi atualizada com a regra e o limite transacional.
- Foram validados baixa parcial, liquidação, tentativa adicional, receita
  recebida, cancelamento, principal excedente e rollback após falha simulada.
- A validação HTTP confirmou ocultação do formulário e resposta 409 em POST
  direto para lançamento pago, usando porta 3100 e banco temporário.

---

## Assinatura da LLM

- Data: 16/07/2026 19:57
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização
