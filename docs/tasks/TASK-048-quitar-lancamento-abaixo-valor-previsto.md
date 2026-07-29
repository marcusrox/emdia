# TASK-048 - Quitar lançamento abaixo do valor previsto

## Contexto

O EmDia permite registrar baixas parciais e baixas cujo valor realizado supera
o valor previsto. Entretanto, um pagamento ou recebimento menor que o previsto
é tratado atualmente apenas como baixa parcial.

Esse comportamento não cobre contas de consumo, como água, energia e telefone,
nas quais o valor previsto pode ser uma estimativa e o documento definitivo ter
valor menor. Nessa situação, o usuário pode ter quitado integralmente a conta
mesmo que `realized_amount_cents` permaneça abaixo de
`expected_amount_cents`.

O sistema não pode considerar automaticamente toda baixa menor como quitação,
pois o mesmo valor também pode representar um pagamento parcial legítimo. A
intenção do usuário precisa ser explícita, persistida e auditável.

## Objetivo

Permitir que o usuário escolha entre:

1. manter a diferença como saldo em aberto, registrando uma baixa parcial; ou
2. quitar o lançamento pelo valor realizado, encerrando-o com uma diferença
   abaixo do previsto.

A solução deve preservar separadamente o valor previsto e o valor realizado,
manter o histórico das baixas e continuar compatível com estornos, auditoria,
status e bancos locais existentes.

**Status:** implementada em 28/07/2026.

## Decisão de produto

Quando o total realizado projetado após a nova baixa for menor que o valor
previsto, o comportamento padrão deve continuar sendo **baixa parcial**.

O formulário deve apresentar uma escolha explícita:

- **Manter a diferença em aberto**: registra a baixa e mantém o lançamento
  parcial, pendente ou vencido conforme as regras atuais;
- **Quitar pelo valor realizado**: registra a baixa como encerradora e altera o
  status para `PAID` ou `RECEIVED`, mesmo que o total realizado seja inferior ao
  previsto.

Não atualizar silenciosamente o valor previsto para igualá-lo ao realizado. A
diferença é informação financeira útil e deve permanecer consultável.

Não converter automaticamente a diferença em desconto. Em contas estimadas, a
diferença pode representar apenas variação entre previsão e valor definitivo,
e não um desconto concedido.

## Modelagem proposta

Adicionar à tabela `settlements`, por migration compatível, um indicador
persistente de encerramento, preferencialmente:

```text
closes_entry INTEGER NOT NULL DEFAULT 0
```

Regras do campo:

- `0`: a baixa não encerra explicitamente o lançamento;
- `1`: a baixa representa quitação integral pelo valor realizado;
- somente uma baixa vigente encerradora deve ser necessária para um lançamento;
- uma baixa estornada deixa de participar tanto do total realizado quanto da
  decisão de encerramento;
- registros existentes devem receber `0` sem alterar o comportamento histórico.

O nome definitivo pode ser ajustado durante a implementação, desde que expresse
uma decisão de encerramento e não confunda quitação com valor, desconto ou
status.

`settlements` deve continuar sendo a fonte do histórico. Não usar apenas um
campo manual no lançamento sem vínculo com a baixa que provocou a quitação,
pois isso dificultaria o recálculo após estorno.

## Cálculos

Para a nova baixa:

```text
total_baixa =
  principal
  + juros
  + multa
  + outros_acrescimos
  - desconto

realizado_projetado =
  realizado_atual
  + total_baixa

diferenca_previsto =
  valor_previsto
  - realizado_projetado
```

Quando `realizado_projetado < valor_previsto`, exibir a escolha entre baixa
parcial e quitação por valor menor.

Quando `realizado_projetado === valor_previsto`, manter a quitação normal já
existente.

Quando `realizado_projetado > valor_previsto`, preservar o fluxo atual de aviso
e confirmação de excedente.

Os cálculos devem usar centavos inteiros.

## Status e elegibilidade

`deriveStatus` e todos os fluxos que recalculam status devem considerar a
existência de uma baixa encerradora vigente.

Regras esperadas:

- despesa com baixa encerradora vigente: `PAID`;
- receita com baixa encerradora vigente: `RECEIVED`;
- sem baixa encerradora, continuar derivando o status pelo total realizado,
  vencimento e tipo do lançamento;
- lançamento `PAID` ou `RECEIVED` não aceita uma nova baixa;
- lançamento cancelado ou em rascunho continua sem aceitar baixa;
- baixa parcial abaixo do previsto continua permitindo novas baixas;
- edição posterior do lançamento não pode apagar acidentalmente a decisão de
  encerramento registrada em uma baixa vigente.

Não usar `settled_at` como único indicador de quitação abaixo do previsto,
porque esse campo já pode ser preenchido após uma baixa parcial.

As consultas de lançamento devem disponibilizar ao cálculo de status a
existência de baixa encerradora vigente, sem considerar baixas estornadas.

## Estorno

Ao estornar uma baixa:

1. preservar o settlement original e criar o registro de estorno conforme o
   fluxo atual;
2. recalcular `realized_amount_cents` pela soma das baixas vigentes;
3. recalcular se ainda existe alguma baixa encerradora vigente;
4. derivar novamente o status;
5. registrar auditoria na mesma transação.

Se a baixa encerradora for estornada e o realizado restante ficar abaixo do
previsto, o lançamento deve voltar para `PARTIALLY_PAID`,
`PARTIALLY_RECEIVED`, `PENDING` ou `OVERDUE`, conforme os valores, o tipo e o
vencimento.

## Interface e usabilidade

Reutilizar o padrão visual da caixa de confirmação de valor acima do previsto,
com tom informativo e sem aparência de erro.

Quando houver diferença abaixo do previsto, apresentar:

```text
Valor abaixo do previsto

Após esta baixa, haverá uma diferença de R$ 20,00.
Como deseja tratá-la?

(•) Manter R$ 20,00 em aberto
( ) Quitar o lançamento pelo valor realizado
```

Requisitos:

- selecionar **Manter em aberto** por padrão;
- usar controles de opção acessíveis, com `fieldset` e `legend` ou semântica
  equivalente;
- atualizar o valor da diferença dinamicamente ao alterar principal, juros,
  multa, desconto ou acréscimos;
- explicar de forma curta o efeito de cada opção;
- não depender apenas de cor;
- manter foco visível, área clicável confortável e layout responsivo;
- preservar valores e opção selecionada quando o backend devolver erro;
- esconder a caixa quando o total projetado for igual ou superior ao previsto;
- manter separada a confirmação existente para valor acima do previsto.

Ao selecionar **Quitar pelo valor realizado**, o texto deve deixar claro que o
lançamento será considerado integralmente pago ou recebido, sem alterar o valor
previsto.

## Apresentação após a quitação

No detalhe de um lançamento encerrado abaixo do previsto, mostrar:

- valor previsto;
- valor realizado;
- diferença para o previsto;
- status pago ou recebido.

Não apresentar essa diferença como saldo em aberto depois de uma quitação
explícita.

Preferir o rótulo neutro **Diferença para o previsto**, pois:

- numa despesa, realizar menos pode ser uma variação favorável;
- numa receita, receber menos pode ser uma variação desfavorável.

A listagem de baixas deve identificar de forma textual qual baixa encerrou o
lançamento, sem depender apenas de ícone ou cor.

## Validação no backend

O backend deve aceitar um modo explícito, por exemplo:

```text
settlement_completion = PARTIAL | FINAL
```

Regras:

- ausência do campo deve equivaler a `PARTIAL` para compatibilidade;
- `FINAL` somente pode encerrar um lançamento elegível;
- o backend deve recalcular o realizado projetado e não confiar no valor de
  diferença enviado pelo navegador;
- se `FINAL` for enviado com total projetado abaixo do previsto, persistir a
  baixa como encerradora;
- se `PARTIAL` for enviado, manter o saldo em aberto;
- submissões repetidas ou concorrentes não podem criar nova baixa depois que o
  lançamento for encerrado;
- validação, criação da baixa, atualização do lançamento e auditoria devem
  ocorrer na mesma transação.

Se o total projetado for igual ou superior ao previsto, o status deve seguir a
regra normal de liquidação, independentemente de `settlement_completion`.

## Auditoria

No evento da baixa, registrar somente os dados necessários:

- identificador da baixa;
- total da baixa;
- modo parcial ou final;
- valor previsto no momento da operação;
- realizado projetado;
- diferença para o previsto;
- indicador de encerramento.

Não registrar senha, sessão, dados bancários sensíveis ou conteúdo externo.

O estorno deve continuar registrando evento próprio e permitir reconstruir por
que o lançamento deixou de estar quitado.

## Compatibilidade de banco

- criar uma nova migration, usando a próxima numeração disponível;
- adicionar o novo campo com `NOT NULL DEFAULT 0`;
- preservar todos os settlements existentes;
- não reclassificar automaticamente baixas históricas;
- garantir funcionamento tanto em banco novo quanto em banco local já
  existente;
- incluir a migration nos scripts de validação sintática quando necessário.

## Escopo

- adicionar a persistência da decisão de encerramento na baixa;
- ajustar criação, consulta e listagem de settlements;
- ajustar recálculo de status em baixa, edição e estorno;
- ajustar elegibilidade para bloquear nova baixa após encerramento;
- implementar a escolha parcial ou final no formulário;
- atualizar dinamicamente a diferença no frontend;
- identificar quitação abaixo do previsto no detalhe e no histórico de baixas;
- registrar auditoria suficiente;
- adicionar testes unitários, de model e HTTP;
- atualizar PRD, padrões e arquitetura;
- atualizar o controle de release ao concluir a implementação.

## Fora de escopo

- alterar automaticamente o valor previsto;
- transformar diferença em desconto sem escolha do usuário;
- criar saldo credor ou devedor contábil;
- conciliação bancária;
- editar uma baixa já registrada;
- estorno parcial;
- alterar lançamentos de outras competências;
- reclassificar automaticamente settlements históricos;
- permitir nova baixa enquanto o lançamento permanecer pago ou recebido.

## Critérios de aceite

- baixa abaixo do previsto usa modo parcial por padrão;
- modo parcial mantém a diferença como saldo em aberto;
- modo final encerra despesa como `PAID`;
- modo final encerra receita como `RECEIVED`;
- valor previsto permanece inalterado;
- valor realizado permanece sendo a soma das baixas vigentes;
- diferença encerrada não aparece como saldo em aberto;
- detalhe mostra a diferença para o previsto;
- baixa encerradora é identificada textualmente na listagem;
- nova baixa é bloqueada depois da quitação;
- estorno da baixa encerradora reabre corretamente o lançamento;
- edição posterior preserva a quitação enquanto existir baixa encerradora
  vigente;
- baixa acima do previsto continua usando a confirmação de excedente atual;
- baixa exatamente igual ao previsto continua funcionando sem confirmação
  adicional;
- tentativa concorrente não cria settlement adicional;
- operação e auditoria são atômicas;
- dados de outro usuário permanecem isolados;
- migration preserva bancos existentes;
- interface funciona em desktop e celular;
- `npm run check` e `npm test` passam.

## Cenários de validação

1. Despesa prevista em R$ 120,00 recebe baixa final de R$ 100,00 e fica `PAID`.
2. A mesma baixa em modo parcial deixa R$ 20,00 em aberto.
3. Receita prevista em R$ 1.000,00 recebe baixa final de R$ 950,00 e fica
   `RECEIVED`.
4. Registrar duas baixas parciais e encerrar na última ainda abaixo do total
   previsto.
5. Alterar juros, multa e desconto e confirmar que a diferença exibida coincide
   com o cálculo do backend.
6. Alterar o valor até igualar o previsto e confirmar que a escolha deixa de
   ser necessária.
7. Alterar o valor para superar o previsto e confirmar que aparece somente o
   fluxo de excedente.
8. Tentar nova baixa após quitação abaixo do previsto.
9. Estornar a baixa encerradora e confirmar valor, status e saldo em aberto.
10. Estornar uma baixa parcial anterior mantendo uma baixa encerradora vigente
    e confirmar a regra definida para o status.
11. Editar descrição, vencimento ou valor previsto de lançamento já encerrado e
    confirmar que a decisão persistida não é perdida.
12. Simular falha de auditoria e confirmar rollback integral.
13. Repetir rapidamente a submissão final e confirmar apenas uma baixa efetiva.
14. Executar migration em banco vazio e em cópia segura de banco antigo.
15. Validar formulário e resumo em larguras desktop e mobile.
16. Executar `npm run check` e `npm test`.
17. Em validação HTTP própria, usar porta 3100 ou a próxima livre, nunca 3000.

## Arquivos candidatos

- `src/database/migrations/006_add_settlement_closure.js` ou próxima numeração
  disponível;
- `src/database/schema.js`;
- `src/models/Settlement.js`;
- `src/models/FinancialEntry.js`;
- `src/services/statusService.js`;
- `src/services/formValidation.js`;
- `src/server.js`;
- `src/views/entriesView.js`;
- `public/js/app.js`;
- `public/css/styles.css`;
- `test/unit/financialServices.test.js`;
- `test/integration/financialModels.test.js`;
- `test/integration/http.test.js`;
- `PRD_sistema_financas_pessoais.md`;
- `docs/patterns.md`;
- `docs/architecture.md`;
- `src/config/release.js`.

## Observações de implementação

Centralizar a regra de status para evitar que baixa, edição e estorno tratem a
quitação abaixo do previsto de maneiras diferentes.

Sempre recalcular a existência de baixa encerradora considerando apenas
settlements vigentes. Não confiar exclusivamente no status armazenado.

Evitar uma solução baseada apenas em frontend. Requisições POST diretas devem
produzir o mesmo resultado e respeitar isolamento por usuário, CSRF,
concorrência e atomicidade.

Ao concluir a implementação, atualizar `src/config/release.js`, usando a
data/hora atual do ambiente e incrementando em 1 o número sequencial no formato
`Release DD/MM/YYYY HH:mm - NNN`.

---

## Assinatura da LLM

- Data: 28/07/2026 20:23
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

## Implementação

- Criada a migration `006_add_settlement_closure`, que adiciona
  `settlements.closes_entry` com valor padrão `0` e preserva registros
  existentes.
- Consultas de lançamentos passaram a informar se existe baixa encerradora
  vigente, ignorando settlements estornados.
- `deriveStatus` passou a produzir `PAID` ou `RECEIVED` quando existe baixa
  encerradora vigente, mesmo com realizado abaixo do previsto.
- O formulário de baixa passou a oferecer escolha entre manter a diferença em
  aberto e quitar pelo valor realizado, usando baixa parcial como padrão.
- A diferença é recalculada no navegador considerando principal, juros, multa,
  desconto e acréscimos, sem confiar nesse cálculo no backend.
- O model valida o modo de conclusão, persiste a decisão na baixa e registra
  previsto, realizado projetado, diferença e modo na auditoria.
- O detalhe do lançamento mostra **Diferença para o previsto** após uma
  quitação menor e identifica textualmente a **Quitação final** na baixa.
- O estorno recalcula em conjunto o total realizado, a existência de baixa
  encerradora e o status do lançamento.
- A exportação CSV apresenta saldo aberto igual a zero quando a diferença foi
  encerrada explicitamente.
- PRD, padrões e arquitetura foram atualizados.
- A release foi incrementada para `Release 28/07/2026 20:32 - 070`.
- Foram validados despesa e receita abaixo do previsto, modo parcial, modo
  final, preservação após edição, bloqueio de nova baixa, estorno da baixa
  encerradora, estorno de baixa parcial anterior, migration compatível,
  integração HTTP, interface desktop e ausência de erros no console.

---

## Assinatura da LLM

- Data: 28/07/2026 20:34
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
