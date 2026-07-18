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
financeiras críticas do EmDia, usando o test runner nativo do Node.js,
Supertest para integração HTTP com o Express e sem depender do banco local em
`data/`.

## Escopo

- adicionar comando `npm test` ao projeto;
- adicionar `supertest` como dependência de desenvolvimento;
- criar estrutura própria para testes automatizados;
- testar serviços puros sem acesso ao SQLite quando possível;
- disponibilizar banco SQLite isolado para testes de models;
- testar rotas Express diretamente pela aplicação, sem abrir porta TCP;
- garantir isolamento entre casos e usuários;
- cobrir competência, dinheiro, status, baixas e recorrências;
- documentar como executar a suíte localmente.

## Regras técnicas

- usar `node:test` como test runner e `node:assert/strict` para asserções;
- usar Supertest somente nos testes de integração HTTP;
- não adicionar Jest, Vitest ou outro test runner nesta etapa;
- carregar a aplicação Express de modo testável, sem chamar `listen` nem
  iniciar `app.js` nos testes;
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

### Integração HTTP

- `GET /health` e `GET /ready` nos estados aplicáveis;
- redirecionamento de usuário não autenticado para o login;
- login, sessão e logout em um agente persistente do Supertest;
- proteção CSRF nas rotas POST;
- acesso administrativo permitido e negado conforme o perfil;
- aplicação da competência corrente quando o parâmetro estiver ausente;
- isolamento por usuário nas rotas de lançamento e baixa;
- status HTTP, redirecionamentos e headers relevantes dos fluxos críticos.

Os testes HTTP devem exercitar o pipeline real do Express sem abrir a porta
3000, 3100 ou qualquer outra porta. Integrações externas, como WhatsApp, devem
ser substituídas por limites injetáveis ou respostas controladas, sem chamadas
de rede.

## Fora de escopo

- atingir cobertura percentual arbitrária em todo o projeto;
- testar provedores externos de WhatsApp;
- testes end-to-end completos em navegador;
- testes visuais ou de layout CSS;
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
- testes HTTP com Supertest cobrem autenticação, CSRF, autorização e
  competência padrão sem iniciar servidor em uma porta;
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
6. Confirmar que os testes Supertest não iniciam listener nem ocupam as portas
   3000 ou 3100.
7. Exercitar uma sessão autenticada com o agente persistente do Supertest e
   validar uma rota POST protegida por CSRF.
8. Executar uma rota autenticada com dois usuários e confirmar isolamento.

## Arquivos candidatos

- `package.json`;
- `package-lock.json`, exclusivamente pela instalação do Supertest;
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

Para os testes HTTP, expor ou reutilizar a fábrica da aplicação Express sem
executar o bootstrap que abre a porta. Usar `request(app)` para requisições
isoladas e `request.agent(app)` apenas quando o cenário precisar preservar
cookies de sessão. O Supertest complementa `node:test`; ele não substitui o
runner nem deve ser usado em testes puros de services.

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

- Data: 17/07/2026 23:53
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao

## Implementação

- adicionado `npm test` com o test runner nativo do Node.js, execução serial e
  sem isolamento por processo para compatibilidade com o ambiente Windows;
- adicionado Supertest como dependência de desenvolvimento para testar a
  aplicação Express sem iniciar listener ou ocupar portas;
- criado helper de banco SQLite em memória que aplica as migrations reais e
  limpa o estado entre os cenários;
- adicionados testes unitários de competência, navegação mensal, fim de mês,
  dinheiro, status e elegibilidade de baixas;
- adicionados testes de integração dos models para baixas parciais e totais,
  ajustes, saldo aberto, rollback, isolamento entre usuários e recorrências;
- adicionados testes HTTP de saúde, prontidão, autenticação, sessão, logout,
  CSRF, autorização administrativa, competência padrão e isolamento;
- documentado o comando de testes no README;
- atualizado o controle de release para a sequência 051.

---

## Assinatura da LLM

- Data: 18/07/2026 00:00
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
