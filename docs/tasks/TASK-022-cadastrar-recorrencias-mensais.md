# TASK-022 - Cadastrar recorrências mensais

## Contexto

O PRD preve o cadastro de contas a pagar e receber recorrentes, como salario,
internet, agua, energia, aluguel e outras despesas ou receitas fixas. Hoje o
MVP trabalha com lançamentos mensais, baixas e competência, mas ainda não possui
uma regra que gere automaticamente esses lançamentos a cada mês.

A recorrência deve ser tratada como uma regra de geracao, não como uma conta em
si. O lançamento gerado para cada competência continua sendo a conta real do
mês, com vencimento, valor previsto, baixas, status e histórico próprios.

## Objetivo

Permitir que o usuário cadastre regras mensais recorrentes e que o sistema gere
automaticamente os lançamentos correspondentes para a competência acessada,
mantendo a experiência simples, previsivel e alinhada a navegação mensal do
EmDia.

## Decisões de produto

- A recorrência representa uma regra mensal.
- O lançamento representa a ocorrencia real daquela competência.
- O usuário deve continuar usando a tela de lançamentos normalmente para pagar,
  receber, editar, cancelar ou consultar cada ocorrencia.
- A tela de recorrências deve ser simples e falar em termos cotidianos, como
  "criar todo mês uma despesa chamada Internet no dia 10".
- Recorrências encerradas ou pausadas não devem apagar lançamentos já gerados.
- Editar uma recorrência deve afetar apenas geracoes futuras, salvo ação
  explícita em desenvolvimento posterior.

## Decisão sobre tipo de lançamento

A recorrência não deve armazenar `entry_type` como campo próprio.

O tipo deve ser inferido pela categoria selecionada:

- categorias de receita geram lançamentos de receita;
- categorias de despesa geram lançamentos de despesa.

Ao gerar um lançamento recorrente, o sistema deve copiar o `entry_type` atual da
categoria para `financial_entries.entry_type`. A partir desse momento, o
lançamento gerado passa a ser um snapshot financeiro daquela competência.

Isso permite alterar ou corrigir categorias no futuro sem mudar
retroativamente lançamentos já realizados ou baixados.

## Escopo

- Criar persistência para regras de recorrência mensal.
- Criar model/service para cadastrar, listar, editar, pausar e encerrar
  recorrências.
- Criar tela de listagem de recorrências.
- Criar formulário de nova recorrência.
- Criar formulário de edição de recorrência.
- Gerar lançamentos recorrentes para uma competência quando ela for acessada em
  telas operacionais.
- Evitar duplicidade de lançamentos para a mesma recorrência e competência.
- Marcar lançamentos gerados com a recorrência de origem.
- Exibir indicacao visual de que um lançamento veio de recorrência.
- Permitir abrir a recorrência de origem a partir do detalhe do lançamento,
  quando aplicavel.
- Preservar o fluxo atual de baixas em `settlements`.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Recorrências semanais, quinzenais ou anuais.
- Parcelamentos complexos.
- Valores variaveis por mês.
- Aplicar alterações de uma recorrência em lançamentos já gerados.
- Criar exceções por competência, como "pular este mês", salvo cancelamento do
  lançamento especifico.
- Agendador externo, cron ou processo em background.
- Notificacoes, WhatsApp, OCR ou anexos.
- Relatórios avancados de recorrência.
- Implementar esta task neste momento.

## Modelo de dados sugerido

Criar uma tabela `recurrences` com campos conceituais:

- `id`;
- `user_id`;
- `description`;
- `category_id`;
- `financial_account_id`, opcional;
- `party_id`, opcional;
- `expected_amount_cents`;
- `due_day`;
- `start_competence_month`;
- `end_competence_month`, opcional;
- `status`;
- `notes`;
- `created_at`;
- `updated_at`.

Valores sugeridos para `status`:

- `ACTIVE`;
- `PAUSED`;
- `ENDED`.

Adicionar em `financial_entries` uma referência opcional:

- `recurrence_id`.

Garantir que uma recorrência não gere mais de um lançamento para a mesma
competência. A solucao pode usar indice único ou validação transacional no model,
desde que seja segura contra duplicidade.

## Regra de geracao

Ao abrir uma competência em telas operacionais, o sistema deve:

1. normalizar a competência solicitada;
2. localizar recorrências ativas aplicaveis ao mês;
3. ignorar recorrências com inicio posterior a competência;
4. ignorar recorrências com fim anterior a competência;
5. verificar se já existe lançamento daquela recorrência para a competência;
6. se não existir, criar o lançamento;
7. copiar o tipo da categoria para `financial_entries.entry_type`;
8. copiar valor, categoria, conta, pagador/favorecido e observações aplicaveis;
9. calcular vencimento a partir do dia configurado;
10. derivar status inicial com `deriveStatus`;
11. registrar auditoria da geracao.

A geracao inicial deve priorizar a competência acessada. Uma janela futura, como
próximos 60 dias, pode ser avaliada depois, mas não e necessária para a primeira
versao.

## Vencimento

A recorrência deve armazenar o dia do vencimento como número de 1 a 31.

Para meses que não possuem o dia configurado:

- vencimento no dia 29, 30 ou 31 deve cair no último dia do mês;
- exemplo: recorrência no dia 31 em fevereiro usa 28 ou 29 de fevereiro,
  conforme o ano.

Essa regra deve ficar clara no formulário, com texto curto de ajuda.

## Experiência esperada

Adicionar uma entrada de navegação chamada `Recorrências`.

Na listagem, exibir pelo menos:

- descrição;
- categoria com indicacao de receita ou despesa;
- valor;
- dia de vencimento;
- período de vigencia;
- status;
- ações.

No formulário, o usuário informa:

- descrição;
- categoria;
- valor;
- dia de vencimento;
- competência inicial;
- competência final opcional;
- conta financeira opcional;
- pagador/favorecido opcional;
- observações opcionais.

O tipo da recorrência deve aparecer apenas como informação derivada da
categoria, não como campo editavel separado.

Exemplos de microcopy:

- "A categoria define se esta recorrência e receita ou despesa."
- "Quando o mês não tiver esse dia, o vencimento será o último dia do mês."
- "Alterações nesta regra afetam apenas próximas geracoes."

## Lançamentos gerados

Lançamentos gerados por recorrência devem continuar funcionando como lançamentos
normais:

- podem ser baixados;
- podem receber baixa parcial;
- podem ser editados individualmente;
- podem ser cancelados individualmente;
- aparecem no dashboard e na listagem da competência;
- respeitam filtros mensais;
- preservam o `entry_type` copiado no momento da geracao.

Na listagem e no detalhe, exibir um marcador discreto como `Recorrente`.

No detalhe, quando houver `recurrence_id`, exibir a origem:

- `Recorrência: Internet`;
- link para abrir a recorrência.

Editar um lançamento gerado não deve alterar automaticamente a recorrência.

## Auditoria

Registrar eventos relevantes em `audit_logs`, quando o recurso existir no fluxo:

- criação de recorrência;
- edição de recorrência;
- pausa de recorrência;
- encerramento de recorrência;
- geracao automática de lançamento recorrente.

As mensagens devem ser claras para manutenção local e suporte futuro.

## Critérios de aceite

- O usuário consegue cadastrar uma recorrência mensal ativa.
- A recorrência usa categoria como fonte do tipo, sem campo próprio
  `entry_type`.
- Ao acessar uma competência aplicavel, o lançamento recorrente e gerado.
- O lançamento gerado recebe `entry_type` copiado da categoria no momento da
  geracao.
- Alterar categoria ou recorrência depois não muda retroativamente lançamentos
  já gerados.
- A mesma recorrência não gera lançamento duplicado na mesma competência.
- Recorrência pausada não gera novos lançamentos.
- Recorrência encerrada não gera novos lançamentos após seu período.
- Dia 31 em meses menores usa o último dia do mês.
- Lançamentos recorrentes aparecem no dashboard e na listagem mensal.
- Lançamentos recorrentes podem ser baixados usando o fluxo atual de
  `settlements`.
- A tela de lançamentos mostra indicacao de origem recorrente.
- O detalhe do lançamento permite acessar a recorrência de origem.
- Mensagens de usuário permanecem em português.
- Dados dinâmicos renderizados em HTML sao escapados.
- SQL usa placeholders `?`.
- Valores monetarios permanecem em centavos inteiros.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- criar categoria de receita e uma recorrência de salario;
- criar categoria de despesa e uma recorrência de internet;
- abrir `/dashboard` na competência corrente;
- abrir `/entries` na competência corrente;
- confirmar que os lançamentos foram gerados uma única vez;
- recarregar as telas e confirmar que não houve duplicidade;
- trocar para o próximo mês e confirmar nova geracao;
- pausar uma recorrência e confirmar que ela não gera novos lançamentos;
- encerrar uma recorrência e confirmar que lançamentos antigos permanecem;
- criar recorrência no dia 31 e validar vencimento em mês com menos dias;
- baixar um lançamento recorrente e confirmar status/settlements;
- editar um lançamento recorrente e confirmar que a regra original não mudou.

Se forem alteradas telas, validar também em viewport desktop e mobile.

## Observações de implementação

Manter a implementação pequena e alinhada a arquitetura atual:

- CommonJS;
- Express;
- SQLite com `node:sqlite`;
- models/services para regras financeiras;
- renderização server-side em `viewEngine`;
- ícones via `lucideIcon`, quando forem necessários.

Evitar cron ou automacao em background nesta primeira versao. A geracao por
competência acessada e mais simples de explicar, testar e manter.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- Foi criada a tabela `recurrences` para regras mensais recorrentes.
- Foi reaproveitado o campo existente `financial_entries.recurrence_rule_id`
  como referência da recorrência de origem do lançamento.
- Foi criado indice único parcial para impedir que a mesma recorrência gere mais
  de um lançamento na mesma competência.
- Foi criado o model `Recurrence`, com cadastro, edição, ativacao, pausa,
  encerramento e geracao por competência.
- A recorrência não armazena `entry_type`; o tipo e inferido da categoria e
  copiado para o lançamento no momento da geracao.
- A geracao considera recorrências ativas, competência inicial/final e evita
  duplicidades.
- O vencimento usa `dueDateFromCompetence`, preservando a regra de usar o último
  dia do mês quando o dia configurado não existir.
- Dashboard e listagem de lançamentos passaram a gerar ocorrencias recorrentes
  antes da consulta da competência.
- Foi adicionada a navegação `Recorrências`.
- Foram adicionadas telas de listagem, nova recorrência e edição de recorrência.
- Lançamentos gerados por recorrência exibem indicacao `Recorrente` e link para
  a regra de origem no detalhe.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-12 22:38
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: criação

---

## Assinatura da LLM

- Data: 2026-07-12 22:45
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
