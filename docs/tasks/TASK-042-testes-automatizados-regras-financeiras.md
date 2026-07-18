# TASK-042 - Adicionar testes automatizados às regras financeiras

## Contexto

O EmDia já possui regras relevantes para competência mensal, valores em
centavos, status, recorrências e baixas financeiras. Atualmente, a principal
validação automatizada do projeto é `npm run check`, que verifica sintaxe, mas
não detecta regressões de comportamento.

À medida que novos fluxos forem adicionados, alterações aparentemente pequenas
podem produzir lançamentos duplicados, permitir baixas inválidas ou calcular um
status incorreto. A primeira suíte de testes deve proteger essas regras antes de
ampliar o escopo funcional do produto.

## Objetivo

Criar uma base de testes automatizados, rápida e determinística, para as regras
financeiras críticas do EmDia, usando preferencialmente o test runner nativo do
Node.js e sem depender do banco local em `data/`.

## Escopo

- adicionar comando `npm test` ao projeto;
- criar estrutura própria para testes automatizados;
- testar serviços puros sem acesso ao SQLite quando possível;
- disponibilizar banco SQLite isolado para testes de models;
- garantir isolamento entre casos e usuários;
- cobrir competência, dinheiro, status, baixas e recorrências;
- documentar como executar a suíte localmente.

## Regras técnicas

- usar `node:test` e `node:assert/strict`, salvo necessidade técnica
  comprovada de outra ferramenta;
- não alterar `.env`, `data/emdia.sqlite` ou dados reais do usuário;
- cada teste deve preparar e limpar seu próprio estado;
- datas dependentes de "hoje" devem ser injetáveis ou calculadas a partir de
  uma referência controlada;
- falhas devem indicar claramente a regra e o cenário afetados;
- fixtures devem usar dados fictícios e valores monetários em centavos;
- testes não devem depender de rede, WhatsApp ou ordem de execução;
- o banco de teste deve aplicar as migrations reais do projeto.

## Cobertura mínima

### Competência e datas

- normalização e validação de `YYYY-MM`;
- uso da competência corrente quando o filtro estiver ausente;
- navegação entre dezembro/janeiro e anos bissextos;
- cálculo no fuso horário configurado do usuário.

### Dinheiro e status

- conversão de moeda para centavos e formatação para exibição;
- rejeição de valores inválidos ou não positivos quando aplicável;
- estados `PENDING`, `OVERDUE`, `PARTIALLY_PAID`, `PAID`,
  `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED` e `DRAFT`;
- recálculo após alteração de vencimento, valor ou baixa.

### Baixas

- baixa parcial e baixa total;
- soma correta de principal, juros, multa, desconto e acréscimos;
- bloqueio de valor principal superior ao saldo aberto;
- bloqueio em lançamento liquidado, cancelado ou incompatível;
- criação de `settlement`, atualização do lançamento e auditoria na mesma
  transação;
- isolamento por `user_id`.

### Recorrências

- geração de ocorrência na competência solicitada;
- regra `LAST_VALID_DAY` para dias 29, 30 e 31;
- prevenção de ocorrência duplicada;
- respeito a início, término, pausa e usuário proprietário;
- vínculo entre ocorrência e recorrência de origem.

## Fora de escopo

- atingir cobertura percentual arbitrária em todo o projeto;
- testar provedores externos de WhatsApp;
- testes end-to-end completos em navegador;
- refatorar models ou services sem necessidade para torná-los testáveis;
- trocar CommonJS, SQLite ou a stack atual;
- implementar novas regras financeiras nesta task.

## Critérios de aceite

- `npm test` executa em uma instalação local sem configuração externa;
- a suíte não lê nem modifica `data/emdia.sqlite`;
- os grupos mínimos de competência, dinheiro, status, baixas e recorrências
  possuem cenários positivos e negativos;
- pelo menos um teste comprova rollback quando uma baixa falha;
- pelo menos um teste comprova isolamento de dados entre usuários;
- testes repetidos produzem o mesmo resultado e não deixam artefatos locais;
- `npm run check` continua passando;
- o README informa os comandos de validação relevantes.

## Cenários de validação

1. Executar `npm test` duas vezes seguidas e obter sucesso nas duas execuções.
2. Confirmar que nenhum arquivo SQLite foi criado ou alterado em `data/`.
3. Introduzir temporariamente uma expectativa incorreta e verificar que a
   suíte falha com mensagem compreensível.
4. Executar `npm run check` após a inclusão dos testes.
5. Executar os testes em ordem diferente, quando suportado, e confirmar que não
   compartilham estado.

## Arquivos candidatos

- `package.json`;
- `README.md`;
- `test/` ou `tests/`;
- `src/database/connection.js`, somente se necessário para injetar o banco;
- services e models financeiros, somente para pequenos pontos de testabilidade;
- `src/config/release.js`, ao concluir a implementação.

## Observações de implementação

Começar por services puros e avançar para testes de integração dos models. Se a
conexão atual estiver fortemente acoplada ao arquivo local, criar uma forma
explícita e restrita de fornecer uma conexão de teste, sem alterar o
comportamento de produção.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando
o número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 17/07/2026 23:46
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao
