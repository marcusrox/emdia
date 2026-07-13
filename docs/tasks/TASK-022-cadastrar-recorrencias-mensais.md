# TASK-022 - Cadastrar recorrencias mensais

## Contexto

O PRD preve o cadastro de contas a pagar e receber recorrentes, como salario,
internet, agua, energia, aluguel e outras despesas ou receitas fixas. Hoje o
MVP trabalha com lancamentos mensais, baixas e competencia, mas ainda nao possui
uma regra que gere automaticamente esses lancamentos a cada mes.

A recorrencia deve ser tratada como uma regra de geracao, nao como uma conta em
si. O lancamento gerado para cada competencia continua sendo a conta real do
mes, com vencimento, valor previsto, baixas, status e historico proprios.

## Objetivo

Permitir que o usuario cadastre regras mensais recorrentes e que o sistema gere
automaticamente os lancamentos correspondentes para a competencia acessada,
mantendo a experiencia simples, previsivel e alinhada a navegacao mensal do
EmDia.

## Decisoes de produto

- A recorrencia representa uma regra mensal.
- O lancamento representa a ocorrencia real daquela competencia.
- O usuario deve continuar usando a tela de lancamentos normalmente para pagar,
  receber, editar, cancelar ou consultar cada ocorrencia.
- A tela de recorrencias deve ser simples e falar em termos cotidianos, como
  "criar todo mes uma despesa chamada Internet no dia 10".
- Recorrencias encerradas ou pausadas nao devem apagar lancamentos ja gerados.
- Editar uma recorrencia deve afetar apenas geracoes futuras, salvo acao
  explicita em desenvolvimento posterior.

## Decisao sobre tipo de lancamento

A recorrencia nao deve armazenar `entry_type` como campo proprio.

O tipo deve ser inferido pela categoria selecionada:

- categorias de receita geram lancamentos de receita;
- categorias de despesa geram lancamentos de despesa.

Ao gerar um lancamento recorrente, o sistema deve copiar o `entry_type` atual da
categoria para `financial_entries.entry_type`. A partir desse momento, o
lancamento gerado passa a ser um snapshot financeiro daquela competencia.

Isso permite alterar ou corrigir categorias no futuro sem mudar
retroativamente lancamentos ja realizados ou baixados.

## Escopo

- Criar persistencia para regras de recorrencia mensal.
- Criar model/service para cadastrar, listar, editar, pausar e encerrar
  recorrencias.
- Criar tela de listagem de recorrencias.
- Criar formulario de nova recorrencia.
- Criar formulario de edicao de recorrencia.
- Gerar lancamentos recorrentes para uma competencia quando ela for acessada em
  telas operacionais.
- Evitar duplicidade de lancamentos para a mesma recorrencia e competencia.
- Marcar lancamentos gerados com a recorrencia de origem.
- Exibir indicacao visual de que um lancamento veio de recorrencia.
- Permitir abrir a recorrencia de origem a partir do detalhe do lancamento,
  quando aplicavel.
- Preservar o fluxo atual de baixas em `settlements`.
- Atualizar o controle de release ao concluir a implementacao.

## Fora do escopo

- Recorrencias semanais, quinzenais ou anuais.
- Parcelamentos complexos.
- Valores variaveis por mes.
- Aplicar alteracoes de uma recorrencia em lancamentos ja gerados.
- Criar excecoes por competencia, como "pular este mes", salvo cancelamento do
  lancamento especifico.
- Agendador externo, cron ou processo em background.
- Notificacoes, WhatsApp, OCR ou anexos.
- Relatorios avancados de recorrencia.
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

Adicionar em `financial_entries` uma referencia opcional:

- `recurrence_id`.

Garantir que uma recorrencia nao gere mais de um lancamento para a mesma
competencia. A solucao pode usar indice unico ou validacao transacional no model,
desde que seja segura contra duplicidade.

## Regra de geracao

Ao abrir uma competencia em telas operacionais, o sistema deve:

1. normalizar a competencia solicitada;
2. localizar recorrencias ativas aplicaveis ao mes;
3. ignorar recorrencias com inicio posterior a competencia;
4. ignorar recorrencias com fim anterior a competencia;
5. verificar se ja existe lancamento daquela recorrencia para a competencia;
6. se nao existir, criar o lancamento;
7. copiar o tipo da categoria para `financial_entries.entry_type`;
8. copiar valor, categoria, conta, pagador/favorecido e observacoes aplicaveis;
9. calcular vencimento a partir do dia configurado;
10. derivar status inicial com `deriveStatus`;
11. registrar auditoria da geracao.

A geracao inicial deve priorizar a competencia acessada. Uma janela futura, como
proximos 60 dias, pode ser avaliada depois, mas nao e necessaria para a primeira
versao.

## Vencimento

A recorrencia deve armazenar o dia do vencimento como numero de 1 a 31.

Para meses que nao possuem o dia configurado:

- vencimento no dia 29, 30 ou 31 deve cair no ultimo dia do mes;
- exemplo: recorrencia no dia 31 em fevereiro usa 28 ou 29 de fevereiro,
  conforme o ano.

Essa regra deve ficar clara no formulario, com texto curto de ajuda.

## Experiencia esperada

Adicionar uma entrada de navegacao chamada `Recorrencias`.

Na listagem, exibir pelo menos:

- descricao;
- categoria com indicacao de receita ou despesa;
- valor;
- dia de vencimento;
- periodo de vigencia;
- status;
- acoes.

No formulario, o usuario informa:

- descricao;
- categoria;
- valor;
- dia de vencimento;
- competencia inicial;
- competencia final opcional;
- conta financeira opcional;
- pagador/favorecido opcional;
- observacoes opcionais.

O tipo da recorrencia deve aparecer apenas como informacao derivada da
categoria, nao como campo editavel separado.

Exemplos de microcopy:

- "A categoria define se esta recorrencia e receita ou despesa."
- "Quando o mes nao tiver esse dia, o vencimento sera o ultimo dia do mes."
- "Alteracoes nesta regra afetam apenas proximas geracoes."

## Lancamentos gerados

Lancamentos gerados por recorrencia devem continuar funcionando como lancamentos
normais:

- podem ser baixados;
- podem receber baixa parcial;
- podem ser editados individualmente;
- podem ser cancelados individualmente;
- aparecem no dashboard e na listagem da competencia;
- respeitam filtros mensais;
- preservam o `entry_type` copiado no momento da geracao.

Na listagem e no detalhe, exibir um marcador discreto como `Recorrente`.

No detalhe, quando houver `recurrence_id`, exibir a origem:

- `Recorrencia: Internet`;
- link para abrir a recorrencia.

Editar um lancamento gerado nao deve alterar automaticamente a recorrencia.

## Auditoria

Registrar eventos relevantes em `audit_logs`, quando o recurso existir no fluxo:

- criacao de recorrencia;
- edicao de recorrencia;
- pausa de recorrencia;
- encerramento de recorrencia;
- geracao automatica de lancamento recorrente.

As mensagens devem ser claras para manutencao local e suporte futuro.

## Criterios de aceite

- O usuario consegue cadastrar uma recorrencia mensal ativa.
- A recorrencia usa categoria como fonte do tipo, sem campo proprio
  `entry_type`.
- Ao acessar uma competencia aplicavel, o lancamento recorrente e gerado.
- O lancamento gerado recebe `entry_type` copiado da categoria no momento da
  geracao.
- Alterar categoria ou recorrencia depois nao muda retroativamente lancamentos
  ja gerados.
- A mesma recorrencia nao gera lancamento duplicado na mesma competencia.
- Recorrencia pausada nao gera novos lancamentos.
- Recorrencia encerrada nao gera novos lancamentos apos seu periodo.
- Dia 31 em meses menores usa o ultimo dia do mes.
- Lancamentos recorrentes aparecem no dashboard e na listagem mensal.
- Lancamentos recorrentes podem ser baixados usando o fluxo atual de
  `settlements`.
- A tela de lancamentos mostra indicacao de origem recorrente.
- O detalhe do lancamento permite acessar a recorrencia de origem.
- Mensagens de usuario permanecem em portugues.
- Dados dinamicos renderizados em HTML sao escapados.
- SQL usa placeholders `?`.
- Valores monetarios permanecem em centavos inteiros.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- criar categoria de receita e uma recorrencia de salario;
- criar categoria de despesa e uma recorrencia de internet;
- abrir `/dashboard` na competencia corrente;
- abrir `/entries` na competencia corrente;
- confirmar que os lancamentos foram gerados uma unica vez;
- recarregar as telas e confirmar que nao houve duplicidade;
- trocar para o proximo mes e confirmar nova geracao;
- pausar uma recorrencia e confirmar que ela nao gera novos lancamentos;
- encerrar uma recorrencia e confirmar que lancamentos antigos permanecem;
- criar recorrencia no dia 31 e validar vencimento em mes com menos dias;
- baixar um lancamento recorrente e confirmar status/settlements;
- editar um lancamento recorrente e confirmar que a regra original nao mudou.

Se forem alteradas telas, validar tambem em viewport desktop e mobile.

## Observacoes de implementacao

Manter a implementacao pequena e alinhada a arquitetura atual:

- CommonJS;
- Express;
- SQLite com `node:sqlite`;
- models/services para regras financeiras;
- renderizacao server-side em `viewEngine`;
- icones via `lucideIcon`, quando forem necessarios.

Evitar cron ou automacao em background nesta primeira versao. A geracao por
competencia acessada e mais simples de explicar, testar e manter.

Ao concluir a implementacao, atualizar o controle de release em
`src/config/release.js`, incrementando o numero sequencial em 1.

## Implementacao

- Foi criada a tabela `recurrences` para regras mensais recorrentes.
- Foi reaproveitado o campo existente `financial_entries.recurrence_rule_id`
  como referencia da recorrencia de origem do lancamento.
- Foi criado indice unico parcial para impedir que a mesma recorrencia gere mais
  de um lancamento na mesma competencia.
- Foi criado o model `Recurrence`, com cadastro, edicao, ativacao, pausa,
  encerramento e geracao por competencia.
- A recorrencia nao armazena `entry_type`; o tipo e inferido da categoria e
  copiado para o lancamento no momento da geracao.
- A geracao considera recorrencias ativas, competencia inicial/final e evita
  duplicidades.
- O vencimento usa `dueDateFromCompetence`, preservando a regra de usar o ultimo
  dia do mes quando o dia configurado nao existir.
- Dashboard e listagem de lancamentos passaram a gerar ocorrencias recorrentes
  antes da consulta da competencia.
- Foi adicionada a navegacao `Recorrencias`.
- Foram adicionadas telas de listagem, nova recorrencia e edicao de recorrencia.
- Lancamentos gerados por recorrencia exibem indicacao `Recorrente` e link para
  a regra de origem no detalhe.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-12 22:38
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-12 22:45
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
