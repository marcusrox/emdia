# TASK-027 - Aplicar validação padronizada em lançamentos

## Contexto

A TASK-026 criou a base de validação padronizada de formulários, começando pelo
formulário de recorrência mensal. A tela de lançamentos (`/entries`) ainda usa o
fluxo antigo: o formulário renderiza campos obrigatórios e monetários, mas o
model `FinancialEntry` converte valores com `toCents` diretamente e as rotas
POST deixam erros funcionais caírem no erro genérico do servidor.

Isso cria risco de experiência inconsistente. O usuário pode preencher valores
monetários inválidos, datas ausentes, competência inválida ou campos obrigatórios
incompletos e não receber uma crítica clara junto ao campo.

## Varredura realizada

Arquivos envolvidos:

- `src/views/entriesView.js`;
- `src/models/FinancialEntry.js`;
- `src/models/Settlement.js`;
- `src/server.js`;
- `src/services/formValidation.js`;
- `src/services/viewHelpers.js`;
- `public/js/app.js`;
- `public/css/styles.css`.

Rotas principais:

- `GET /entries/new`;
- `GET /entries/:id/edit`;
- `POST /entries`;
- `POST /entries/:id`;
- `GET /entries/:id`;
- `POST /entries/:id/settlements`.

Formulário de cadastro/edição de lançamento:

- `description`, obrigatório;
- `entry_type`, obrigatório e restrito a `EXPENSE` ou `INCOME`;
- `competence_month`, obrigatório em `YYYY-MM`;
- `expected_amount`, obrigatório e monetário;
- `realized_amount`, opcional e monetário;
- `due_date`, obrigatório em `YYYY-MM-DD`;
- `issue_date`, opcional em `YYYY-MM-DD`;
- `category_id`, opcional;
- `expected_account_id`, opcional;
- `actual_account_id`, opcional;
- `party_name`, opcional;
- `notes`, opcional.

Formulário de baixa no detalhe do lançamento:

- `financial_account_id`, obrigatório;
- `principal`, obrigatório e monetário;
- `settled_at`, obrigatório em `YYYY-MM-DD`;
- `interest`, opcional e monetário;
- `penalty`, opcional e monetário;
- `discount`, opcional e monetário;
- `notes`, opcional no model, mas ainda não exposto na view atual.

## Objetivo

Aplicar o padrão da TASK-026 aos formulários da tela `/entries`, garantindo
validação consistente, mensagens por campo, preservação dos dados preenchidos e
validação backend obrigatória antes da persistência.

## Escopo

- Expandir `src/services/formValidation.js` com validações para lançamentos.
- Validar criação e edição de `financial_entries` antes de persistir.
- Validar registro de baixa antes de chamar `Settlement.create`.
- Re-renderizar o formulário de lançamento com status `400` quando houver erro.
- Re-renderizar o detalhe do lançamento com erro no formulário de baixa quando a
  baixa for inválida.
- Atualizar `entryFormView` para aceitar `errors` e preservar valores crus
  informados pelo usuário.
- Atualizar o formulário de baixa em `entryDetailView` para aceitar erros de
  campo e preservar dados informados quando possível.
- Marcar campos monetários com `data-validate-money` para usar a validação
  cliente-side progressiva já criada.
- Usar `fieldError` e `fieldErrorAttributes` para manter o padrão visual.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Redesenhar a tela de lançamentos.
- Alterar a regra de status derivado.
- Alterar o fluxo de baixa em `settlements`.
- Criar novos campos de negócio em lançamento ou baixa.
- Aplicar o padrão a contas, categorias, perfil ou configurações.
- Implementar esta task neste momento.

## Regras de validação esperadas

Cadastro e edição de lançamento:

- `description`: obrigatório, não aceitar apenas espaços.
- `entry_type`: aceitar apenas `EXPENSE` ou `INCOME`.
- `competence_month`: obrigatório e normalizável como `YYYY-MM`.
- `expected_amount`: obrigatório, monetário válido e não negativo.
- `realized_amount`: monetário válido quando informado; vazio deve ser tratado
  como zero.
- `due_date`: obrigatório e formato civil válido `YYYY-MM-DD`.
- `issue_date`: opcional, mas se informado deve ser data civil válida.
- `category_id`: se informado, deve pertencer ao usuário e não estar excluído.
- `expected_account_id` e `actual_account_id`: se informados, devem pertencer ao
  usuário e estar ativos.

Baixa:

- `financial_account_id`: obrigatório e deve pertencer ao usuário.
- `principal`: obrigatório, monetário válido e maior que zero.
- `interest`, `penalty`, `discount` e `other_adjustment`: monetários válidos
  quando informados; vazios devem ser tratados como zero.
- `settled_at`: obrigatório e formato civil válido `YYYY-MM-DD`.
- O total da baixa não deve ser menor ou igual a zero.

## Experiência esperada

- Ao digitar letras em `Valor previsto`, `Valor realizado`, `Valor principal`,
  `Juros`, `Multa` ou `Desconto`, o usuário recebe mensagem clara antes de
  acreditar que a operação funcionou.
- O primeiro campo inválido recebe foco no cliente.
- O backend retorna a mesma crítica quando o JavaScript é ignorado ou
  desabilitado.
- Os dados já digitados permanecem preenchidos após erro retornado pelo backend.
- A mensagem aparece junto ao campo afetado e segue o mesmo visual da TASK-026.
- Erros de baixa aparecem no detalhe do lançamento sem perder o contexto do
  lançamento e do histórico.

## Critérios de aceite

- `POST /entries` com `expected_amount=abc` retorna `400` e mostra erro junto a
  `Valor previsto`.
- `POST /entries/:id` com `realized_amount=12abc` retorna `400` e preserva os
  demais campos.
- `POST /entries` sem descrição retorna `400` com mensagem junto a `Descrição`.
- `POST /entries` com competência inválida retorna `400` com mensagem junto a
  `Competência`.
- `POST /entries/:id/settlements` com `principal=abc` retorna `400` no detalhe
  do lançamento e mostra erro junto a `Valor principal`.
- `POST /entries/:id/settlements` com baixa total menor ou igual a zero retorna
  `400` com mensagem clara.
- Valores válidos como `100`, `100,50`, `1.000,50` e `0,99` continuam aceitos.
- A validação cliente-side usa o mesmo atributo `data-validate-money`.
- A validação backend impede persistência de dados inválidos.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/entries/new`;
- tentar salvar lançamento com `Valor previsto` igual a `abc`;
- tentar salvar lançamento com `Valor realizado` igual a `12abc`;
- tentar salvar lançamento sem descrição;
- tentar salvar lançamento com competência inválida enviando POST manual ou
  request editada;
- salvar lançamento válido com `100,50`;
- abrir o detalhe de um lançamento;
- tentar registrar baixa com `Valor principal` igual a `abc`;
- tentar registrar baixa com total zero;
- registrar baixa válida com `Valor principal` igual a `1.000,50`;
- repetir validações em viewport desktop e mobile.

Validação HTTP automatizada sugerida em porta segura:

- usar `PORT=3100`;
- testar `GET /health`;
- testar `GET /entries`;
- testar `GET /entries/new`;
- testar `POST /entries` inválido;
- testar `POST /entries/:id/settlements` inválido quando houver lançamento de
  exemplo.

## Observações de implementação

Evitar criar outro padrão de validação dentro de `entriesView.js` ou
`FinancialEntry.js`. A implementação deve reutilizar e expandir a base criada
na TASK-026:

- `validateMoney`;
- `parseMoney`;
- `validationError`;
- `fieldError`;
- `fieldErrorAttributes`;
- `data-validate-form`;
- `data-validate-money`.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1.

## Implementação

- `src/services/formValidation.js` foi expandido com validações estruturadas
  para lançamentos, baixas, competência mensal e datas civis.
- `FinancialEntry.create` e `FinancialEntry.update` passaram a validar payloads
  antes da persistência e a lançar erro estruturado por campo.
- `FinancialEntry.settle` passou a validar a baixa antes de chamar
  `Settlement.create`, incluindo conta, valores monetários, data e total maior
  que zero.
- `Settlement.create` passou a aceitar centavos já normalizados pelo validador,
  evitando nova interpretação de strings depois da validação.
- As rotas `POST /entries`, `POST /entries/:id` e
  `POST /entries/:id/settlements` passaram a retornar `400` com a tela
  preenchida quando há erro de validação.
- `entryFormView` passou a renderizar erros por campo, preservar valores crus e
  marcar campos monetários com `data-validate-money`.
- O formulário de baixa no detalhe do lançamento passou a usar o mesmo padrão de
  erro por campo e validação cliente-side progressiva.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-13 19:38
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-13 19:43
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização
