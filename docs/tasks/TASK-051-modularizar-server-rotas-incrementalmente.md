# TASK-051 - Modularizar rotas de server.js incrementalmente

## Contexto

`src/server.js` concentra criação do Express, middlewares, autenticação, cerca
de sessenta rotas, tratamento de erros e diversos helpers HTTP. O arquivo já
ultrapassa mil linhas.

Essa concentração aumenta conflitos de edição, dificulta localizar uma regra e
faz com que mudanças independentes compartilhem o mesmo ponto central.

O projeto continua sendo um monólito e não precisa de uma arquitetura
distribuída ou de múltiplas camadas genéricas.

## Objetivo

Transformar o servidor em um monólito modular, extraindo rotas por domínio em
etapas pequenas e verificáveis, sem alterar URLs, respostas ou regras de
negócio.

**Status:** implementada em 28/07/2026.

## Padrão proposto

Manter `createServer()` como composition root responsável por:

- criar a aplicação Express;
- configurar opções globais;
- registrar assets e parsers;
- registrar health e readiness;
- registrar middlewares compartilhados;
- montar módulos de rotas;
- instalar handlers finais de 404, 405 e erro.

Cada domínio deve exportar uma função de registro ou `express.Router()`, por
exemplo:

```text
src/routes/authRoutes.js
src/routes/entryRoutes.js
src/routes/settlementRoutes.js
src/routes/recurrenceRoutes.js
src/routes/accountRoutes.js
src/routes/categoryRoutes.js
src/routes/profileRoutes.js
src/routes/adminRoutes.js
src/routes/operationalRoutes.js
```

Escolher um único estilo e documentá-lo. Evitar misturar função registradora e
Router sem necessidade.

## Estratégia incremental

Extrair um grupo por vez, mantendo testes verdes a cada etapa.

Ordem sugerida:

1. rotas operacionais e somente leitura;
2. autenticação e perfil;
3. contas e categorias;
4. recorrências;
5. lançamentos e exportação;
6. baixas e estornos;
7. administração.

Começar por rotas simples reduz o risco e permite validar o padrão antes dos
fluxos financeiros.

## Limites de responsabilidade

As rotas devem:

- ler parâmetros HTTP;
- chamar models ou services;
- escolher redirect, JSON ou view;
- traduzir resultados conhecidos em mensagens ao usuário.

Regras financeiras, transações, status e cálculos não devem ser movidos para os
módulos de rota.

Helpers genéricos como `sendHtml`, `sendJson`, `redirect`, leitura de campos,
normalização de erro e detalhes de requisição devem ficar em módulo
compartilhado somente quando usados por mais de um domínio.

Middlewares de autenticação, autorização e CSRF devem ter uma localização
explícita e não ser duplicados.

## Compatibilidade

- preservar todos os caminhos e métodos HTTP;
- preservar códigos de status;
- preservar redirects e query strings de competência;
- preservar proteção CSRF;
- preservar ordem dos middlewares;
- preservar isolamento por usuário;
- preservar navegação mensal;
- não alterar contratos de views ou models sem necessidade.

## Escopo

- criar diretório e padrão de módulos de rota;
- extrair rotas por domínio;
- extrair middlewares e helpers realmente compartilhados;
- reduzir `server.js` à composição da aplicação;
- atualizar imports e exports;
- adaptar testes para localizar regressões de montagem e ordem;
- documentar a organização em arquitetura e padrões;
- atualizar o controle de release ao concluir a implementação.

## Fora de escopo

- introduzir TypeScript;
- migrar CommonJS para ESM;
- criar microsserviços;
- adotar framework de injeção de dependência;
- criar controllers, repositories e use cases para todas as operações;
- alterar regras financeiras;
- alterar URLs ou redesenhar telas;
- refatorar models apenas para acompanhar a movimentação das rotas;
- atualizar dependências sem necessidade comprovada.

## Critérios de aceite

- `createServer()` permanece como ponto de criação da aplicação;
- rotas ficam agrupadas por domínio;
- nenhuma rota fica registrada duas vezes;
- ordem de autenticação, CSRF, 404 e erro é preservada;
- URLs, métodos, status e redirects permanecem compatíveis;
- competência corrente continua sendo o fallback nas telas mensais;
- módulos não duplicam helpers ou regras financeiras;
- dependências entre módulos não formam ciclos;
- testes HTTP cobrem ao menos uma rota de cada módulo;
- `server.js` passa a ter responsabilidade predominantemente de composição;
- documentação explica onde adicionar uma nova rota;
- `npm run check` e `npm test` passam.

## Cenários de validação

1. Acessar health e ready sem autenticação.
2. Testar login, sessão, logout e CSRF.
3. Abrir dashboard, calendário e lançamentos sem competência explícita.
4. Navegar para competência anterior e seguinte.
5. Criar, editar e consultar lançamento.
6. Registrar e estornar baixa.
7. Criar e pausar recorrência.
8. Manter CRUD e restauração de contas e categorias.
9. Validar páginas administrativas com usuário comum e administrador.
10. Confirmar respostas 404, 405 e 500.
11. Executar `npm run check` e `npm test` após cada grupo extraído.
12. Em validação HTTP própria, usar porta 3100 ou a próxima livre, nunca 3000.

## Arquivos candidatos

- `src/server.js`;
- `src/routes/*.js`;
- `src/middleware/*.js`;
- `src/services/http.js`;
- `src/services/viewEngine.js`;
- `test/integration/http.test.js`;
- `test/integration/routes/*.test.js`;
- `docs/patterns.md`;
- `docs/architecture.md`;
- `src/config/release.js`.

## Observações de implementação

Não transformar esta task em uma reescrita única. Cada extração deve produzir
um diff revisável e manter a aplicação funcional.

Se a implementação completa ficar grande demais para um único commit, usar
commits separados por domínio sem deixar duas arquiteturas concorrentes no
mesmo fluxo.

## Dependências

Recomenda-se concluir a TASK-049 antes de mover o handler global de erros. A
TASK-052 pode ser executada antes ou depois, desde que não seja misturada com a
extração mecânica das rotas.

---

## Assinatura da LLM

- Data: 28/07/2026 21:04
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Implementação

- `src/server.js` foi reduzido ao papel de composition root, mantendo explícita
  a ordem de assets, parsers, formato de resposta, health/readiness, sessão,
  login, autenticação obrigatória, módulos protegidos, 404/405 e erro global.
- Foi adotado um único padrão de módulos: funções
  `register*Routes(app, dependencies)` em `src/routes/*.js`.
- Rotas foram agrupadas nos domínios autenticação, operação, dashboard,
  contas, categorias, perfil/configurações, recorrências, lançamentos, baixas e
  administração.
- Middlewares de sessão, autenticação, autorização administrativa e CSRF foram
  centralizados em `src/middleware/auth.js`.
- Identificação do formato de resposta e handlers finais de 404, 405 e erro
  inesperado foram centralizados em `src/middleware/errors.js`.
- Respostas HTTP e detalhes seguros da requisição foram compartilhados por
  `src/services/http.js`; logging de erros e composição das views financeiras
  também foram extraídos somente onde havia reutilização entre domínios.
- O teste HTTP passou a verificar uma rota representativa de cada módulo
  protegido; os testes existentes continuam cobrindo autenticação, operação,
  competência mensal, lançamentos, baixa e tratamento de erro.
- `npm run check` e `npm test` foram executados com sucesso.
- A release foi incrementada para `Release 28/07/2026 22:21 - 073`.

---

## Assinatura da LLM

- Data: 28/07/2026 22:21
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
