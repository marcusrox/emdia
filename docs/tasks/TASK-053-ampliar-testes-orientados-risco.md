# TASK-053 - Direcionar testes automatizados para risco

## Contexto

O EmDia possui testes unitários e de integração cobrindo serviços financeiros,
lançamentos, baixas, estornos, recorrências, autenticação e algumas rotas. A
suíte atual fornece uma boa base, mas está concentrada nos fluxos implementados
mais recentemente.

Áreas administrativas, ciclo completo de contas e categorias, sessões,
migrations, tratamento global de erros e falhas transacionais ainda merecem
cobertura explícita.

O objetivo não é perseguir uma porcentagem arbitrária, mas proteger operações
cuja falha possa causar perda de dados, quebra de autorização ou inconsistência
financeira.

## Objetivo

Organizar e ampliar a suíte por risco de negócio, mantendo testes rápidos,
determinísticos e isolados do banco local.

**Status:** implementada em 28/07/2026.

## Matriz de risco

### Risco crítico

- criação de baixa e atualização do realizado;
- quitação abaixo ou acima do previsto;
- estorno e recálculo de status;
- atomicidade entre operação e auditoria;
- isolamento por usuário;
- migrations e compatibilidade de schema;
- backup e restauração, depois da TASK-050.

### Risco alto

- login, logout, expiração e revogação de sessão;
- CSRF e autorização administrativa;
- proteção do último administrador;
- desativação do próprio usuário;
- exclusão e restauração de contas e categorias usadas;
- geração idempotente de recorrências;
- tratamento seguro de erros inesperados.

### Risco moderado

- renderização de telas;
- preferências de interface;
- filtros e navegação mensal;
- CSV;
- notificações e estado dos provedores;
- endpoints operacionais.

Testes puramente visuais ou de detalhes de marcação devem ser usados somente
quando protegem acessibilidade ou um contrato importante.

## Organização proposta

Separar arquivos por capacidade, sem exigir um arquivo por rota:

```text
test/unit/
  transaction.test.js
  statusService.test.js
  moneyService.test.js

test/integration/
  auth.test.js
  entries.test.js
  settlements.test.js
  recurrences.test.js
  accountsCategories.test.js
  adminUsers.test.js
  migrations.test.js
  operationalRoutes.test.js
```

A divisão pode ser feita gradualmente. Evitar mover todos os testes e adicionar
novos cenários no mesmo patch quando isso dificultar a revisão.

## Infraestrutura de testes

- continuar usando `node:test` e Supertest;
- nunca abrir ou alterar `data/emdia.sqlite`;
- criar banco isolado por suíte ou restaurar estado determinístico;
- oferecer fixtures pequenas e explícitas;
- permitir injeção controlada de falhas em auditoria e persistência;
- evitar dependência de relógio real quando a data for relevante;
- não depender da porta 3000;
- manter execução sequencial enquanto o singleton de banco exigir isso.

Avaliar posteriormente isolamento nativo por processo ou conexão. Não aumentar
concorrência até eliminar dependências globais.

## Cenários prioritários

### Usuários e sessões

- impedir remoção do último administrador;
- impedir autobloqueio;
- revogar sessões ao desativar usuário;
- revogar sessões ao redefinir senha;
- rejeitar sessão expirada, revogada ou de usuário inativo;
- manter mensagens de login genéricas.

### Contas e categorias

- impedir acesso cruzado entre usuários;
- exclusão lógica preserva histórico;
- restauração recupera uso normal;
- lançamento vinculado continua íntegro;
- validações e nomes duplicados seguem a regra definida.

### Migrations

- executar todas em banco vazio;
- atualizar banco representando versões anteriores;
- executar novamente sem efeitos duplicados;
- rejeitar IDs duplicados ou migrations inválidas;
- fazer rollback integral quando uma migration falhar.

### HTTP e segurança

- erro `500` não reflete mensagem técnica;
- CSRF ausente ou inválido bloqueia POST;
- usuário comum não acessa rotas administrativas;
- health e readiness obedecem seus contratos;
- competência corrente permanece como fallback.

### Operações financeiras

- submissão repetida não duplica baixa;
- falha intermediária produz rollback;
- estorno mantém histórico;
- edição não invalida encerramento existente;
- concorrência não permite nova baixa em lançamento encerrado.

## Cobertura

Não adicionar meta mínima global de cobertura nesta primeira etapa.

Primeiro proteger a matriz de riscos e estabilizar a organização. Depois,
avaliar coleta de cobertura nativa do Node e estabelecer limiar somente com uma
linha de base real, evitando testes artificiais criados apenas para aumentar
percentual.

## Escopo

- documentar a matriz de risco;
- reorganizar testes gradualmente por capacidade;
- adicionar cenários críticos e altos ausentes;
- aprimorar fixtures e injeção de falhas;
- adicionar testes de migrations;
- preservar execução isolada do banco real;
- atualizar comandos somente se a descoberta continuar automática;
- documentar como escrever e executar testes;
- atualizar o controle de release ao concluir a implementação.

## Fora de escopo

- testar cada linha privada;
- atingir 100% de cobertura;
- adotar framework de testes adicional;
- executar testes end-to-end em navegador para todos os fluxos;
- tornar a suíte paralela antes de remover globais compartilhados;
- usar dados reais ou cópia não sanitizada do banco do usuário;
- testar provedores externos reais de WhatsApp no CI.

## Critérios de aceite

- matriz de risco fica documentada;
- operações críticas possuem cenários de sucesso e rollback;
- ciclo administrativo de usuários possui cobertura;
- contas e categorias possuem exclusão, restauração e isolamento cobertos;
- sessões expiradas e revogadas são testadas;
- todas as migrations executam em banco vazio;
- migration com falha deixa banco consistente;
- erro global não expõe mensagem técnica;
- fixtures não acessam banco local;
- testes não dependem da porta 3000;
- suíte permanece determinística em execuções repetidas;
- comando de testes encontra automaticamente os arquivos definidos pelo
  padrão, sem lista crescente no `package.json`;
- `npm run check` e `npm test` passam.

## Cenários de validação

1. Executar a suíte duas vezes consecutivas.
2. Confirmar que `git status` não mostra banco ou artefato de teste.
3. Executar com `data/emdia.sqlite` inexistente e confirmar isolamento.
4. Injetar falha de auditoria e validar rollback.
5. Simular banco em versão anterior e aplicar migrations.
6. Repetir migrations já aplicadas.
7. Exercitar permissões com usuário comum e administrador.
8. Confirmar que novos arquivos de teste são descobertos automaticamente.

## Arquivos candidatos

- `test/helpers/testDatabase.js`;
- `test/helpers/*.js`;
- `test/unit/*.test.js`;
- `test/integration/*.test.js`;
- `package.json`;
- `scripts/check.js`;
- `README.md`;
- `docs/patterns.md`;
- `docs/architecture.md`;
- `src/config/release.js`.

## Dependências

Pode começar imediatamente, mas deve incorporar os contratos criados pelas
TASK-049, TASK-050 e TASK-052 conforme cada uma for implementada.

---

## Assinatura da LLM

- Data: 28/07/2026 21:04
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Implementação

- `npm test` passou a descobrir automaticamente `test/**/*.test.js`, mantendo
  execução sequencial e eliminando a lista manual de arquivos.
- O helper compartilhado recusa qualquer banco diferente de `:memory:` e
  fixtures HTTP de login, CSRF e sessão foram centralizadas.
- Foram adicionadas suítes por capacidade para autenticação/sessões,
  administração de usuários, contas/categorias e migrations.
- Sessões expiradas, revogadas e pertencentes a usuário inativo passaram a ser
  verificadas, assim como mensagens genéricas de login.
- O ciclo administrativo cobre cadastro, validação, filtros, promoção,
  autobloqueio, último administrador, bloqueio com revogação e redefinição de
  senha com revogação.
- Contas e categorias cobrem isolamento entre usuários, exclusão lógica,
  preservação dos vínculos financeiros, restauração e nomes duplicados conforme
  a regra atual.
- O migrator passou a aceitar banco e plano controlados em testes, validando o
  plano inteiro e rejeitando IDs duplicados antes de aplicar alterações.
- Migrations são testadas em banco vazio, reexecução idempotente, banco em
  versão anterior, plano inválido e rollback de migration com falha.
- A matriz de risco e as regras para escrever testes foram documentadas em
  README, patterns e arquitetura.
- A release foi incrementada para `Release 28/07/2026 23:34 - 075`.

---

## Assinatura da LLM

- Data: 28/07/2026 23:34
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
