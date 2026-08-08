# TASK-065 - Corrigir o fuso usado na atualização de vencidos

## Contexto

O model `FinancialEntry` atualiza lançamentos pendentes para `OVERDUE` antes de
algumas consultas. O helper aceita tanto o objeto completo do usuário quanto
somente seu identificador, mas, quando recebe apenas o `user_id`, usa
`America/Bahia` como fuso padrão.

Diversos fluxos internos chamam `getById(user.id, id)`. Para usuários em outro
fuso, especialmente perto da mudança do dia civil, um lançamento pode ser
marcado como vencido antes ou depois do momento correto. A regra do produto
exige que competências e datas operacionais respeitem o fuso do usuário.

## Objetivo

Garantir que toda atualização e derivação de status vencido use o fuso do
usuário responsável pelo lançamento, sem fallback silencioso para um fuso
regional fixo quando o usuário estiver disponível no fluxo.

## Regras funcionais e técnicas

- Usar `todayIso(user.timezone)` para comparar o vencimento com o dia civil do
  usuário.
- Propagar o objeto `user` nos fluxos de criação, edição, cancelamento, baixa,
  estorno, duplicação e consulta sempre que o status puder ser atualizado.
- Evitar consulta adicional ao banco apenas para recuperar o fuso quando o
  objeto do usuário já estiver disponível.
- Se alguma API interna precisar continuar aceitando somente `user_id`, tornar
  explícito que ela não pode atualizar status dependente de fuso ou exigir o
  fuso como argumento separado.
- Não substituir o fuso do usuário por `America/Bahia`, `America/Sao_Paulo` ou
  pelo fuso do servidor.
- Preservar `CANCELLED`, estados parciais e estados finais; somente lançamentos
  elegíveis pelas regras atuais podem mudar para `OVERDUE`.
- Manter SQL parametrizado e isolamento por `user_id`.
- Não converter datas civis com `new Date()` para decidir vencimento.

## Arquivos candidatos

- `src/models/FinancialEntry.js`;
- rotas e services que chamam `FinancialEntry.getById`, se precisarem propagar
  o objeto `user`;
- `test/integration/financialModels.test.js`;
- `test/integration/financialRoutes.test.js`;
- `test/unit/financialServices.test.js`;
- `docs/patterns.md`, somente se a assinatura pública do model estabelecer um
  padrão duradouro;
- `src/config/release.js`, ao concluir a implementação desta task.

## Fora do escopo

- alterar o fuso cadastrado do usuário;
- mudar a regra de competência mensal;
- criar scheduler global de vencimentos;
- recalcular todo o histórico financeiro;
- alterar a definição dos demais status financeiros;
- implementar esta task no momento de sua criação.

## Critérios de aceite

- consultas e comandos financeiros que atualizam vencidos usam o fuso do
  usuário autenticado;
- o mesmo lançamento pode permanecer `PENDING` em um fuso e tornar-se
  `OVERDUE` em outro quando o dia civil realmente for diferente;
- chamadas internas com somente `user_id` não aplicam silenciosamente um fuso
  incorreto;
- lançamentos cancelados, pagos, recebidos ou parcialmente liquidados mantêm as
  regras atuais;
- o isolamento entre usuários permanece preservado;
- não são introduzidas leituras ou gravações desnecessárias fora das transações
  financeiras existentes;
- os testes existentes continuam passando.

## Testes esperados

- lançamento com vencimento no limite da meia-noite em dois fusos distintos;
- usuário em fuso anterior ao UTC mantendo o lançamento pendente no dia civil
  correto;
- usuário em fuso posterior ao UTC tornando o lançamento vencido no dia civil
  correto;
- `getById`, listagem, dashboard, baixa e estorno preservando o fuso informado;
- status final ou cancelado não sendo alterado pela atualização de vencidos;
- tentativa de acesso por outro usuário permanecendo sem resultado;
- regressão do comportamento atual para `America/Sao_Paulo`.

## Validação esperada

- executar `npm run check`;
- executar `npm test`;
- testar os casos de fuso com relógio controlado, sem depender da hora real da
  máquina;
- não usar o banco local em `data/` nos testes;
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

- atualização de vencidos passou a exigir o fuso explícito do objeto do
  usuário, sem fallback regional quando somente `user_id` é informado;
- fluxos autenticados de consulta, criação, edição, cancelamento, baixa e
  estorno passaram a propagar o objeto `user`;
- `todayIso` passou a aceitar relógio controlado para testes determinísticos;
- teste de regressão cobre o mesmo instante em `America/Los_Angeles` e
  `Asia/Tokyo`, além da consulta somente por identificador;
- release incrementada para `Release 08/08/2026 10:46 - 112`.

---

## Assinatura da LLM

- Data: 08/08/2026 10:46
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
