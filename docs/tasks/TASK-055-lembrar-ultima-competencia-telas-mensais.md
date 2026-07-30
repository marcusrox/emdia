# TASK-055 - Lembrar última competência nas telas mensais

## Contexto

Originalmente, a tela `GET /entries` usava a competência do mês corrente sempre
que o parâmetro `competence` não estava presente na URL.

Com isso, quando o usuário seleciona outro mês, sai da tela de lançamentos e
depois retorna pelo menu, a listagem volta para o mês atual. O usuário precisa
selecionar novamente a competência em que estava trabalhando. Dashboard e
Agenda possuem a mesma navegação mensal e devem compartilhar essa preferência
para que a troca entre as telas preserve o contexto de trabalho.

A competência continua sendo uma escolha explícita e visível na interface. Esta
task muda o valor usado no retorno a todas as telas com filtro mensal, sem
tornar o filtro oculto.

## Objetivo

Persistir, por usuário, a última competência válida selecionada em
`/dashboard`, `/calendar` ou `/entries` e reutilizá-la quando o usuário abrir
qualquer uma dessas telas sem informar uma competência na URL.

No primeiro acesso do usuário, enquanto ainda não existir uma preferência
salva, a tela deve continuar abrindo na competência do mês corrente calculada
no fuso horário do usuário.

**Status:** implementada em 30/07/2026.

## Decisão de produto

A resolução da competência de `GET /dashboard`, `GET /calendar` e
`GET /entries` deve seguir esta ordem:

1. uma competência válida informada explicitamente na query string;
2. a última competência mensal válida persistida para o usuário;
3. a competência do mês corrente no fuso horário do usuário.

Uma competência explícita e válida, inclusive a escolhida pelos controles de
mês anterior, próximo mês, seletor ou retorno ao mês atual, deve atualizar a
preferência.

Parâmetros ausentes, vazios ou inválidos não devem sobrescrever uma preferência
válida. Valores persistidos também devem ser validados antes do uso; um valor
inválido deve ser ignorado e substituído pelo mês corrente.

## Persistência

Adicionar uma preferência opcional ao usuário, preferencialmente na tabela
`users`, com nome que deixe claro seu escopo, por exemplo:

```text
last_competence TEXT NULL
```

Requisitos:

- persistir a preferência por `user_id`, nunca de forma global;
- aceitar somente o formato de competência válido `YYYY-MM`;
- manter `NULL` para usuários que ainda não selecionaram uma competência;
- adicionar a coluna por migration compatível com bancos locais existentes;
- não preencher retroativamente a coluna com o mês da máquina ou do servidor;
- migrar uma eventual preferência válida já existente em
  `last_entries_competence` para preservar compatibilidade;
- atualizar `updated_at` ao alterar a preferência;
- usar SQL parametrizado;
- disponibilizar no model `User` operações específicas para consultar e
  atualizar a preferência, evitando SQL de regra de negócio na rota;
- carregar a preferência na autenticação somente se isso simplificar o fluxo e
  não deixar dados desatualizados na sessão.

A persistência em banco é preferível a `localStorage`, cookie ou variável em
memória porque a escolha pertence ao usuário autenticado e deve sobreviver a
logout, reinício do servidor e acesso em outro navegador.

## Comportamento das rotas

Em `GET /dashboard`, `GET /calendar` e `GET /entries`:

- quando `competence` for válida, usá-la na listagem e salvá-la como última
  competência do usuário;
- quando `competence` não for informada, usar a preferência salva;
- quando não houver preferência válida, usar `currentCompetence(user.timezone)`;
- manter a competência resolvida visível no seletor e nos controles mensais;
- preservar a competência resolvida nos filtros, exportação, criação de
  lançamento e demais links do fluxo;
- não gerar gravações repetidas quando o valor salvo já for igual ao valor
  selecionado;
- não permitir que uma preferência de outro usuário influencie as telas;
- uma seleção explícita em qualquer tela mensal deve ser lembrada nas demais.

A atualização da preferência não deve ser feita por `GET /entries/export.csv`,
`GET /entries/new` ou pela visualização de um detalhe isolado. Esses fluxos
devem continuar preservando a competência recebida nos links, enquanto a
seleção persistida permanece definida pelas telas com filtro mensal.

## Limites de escopo

Esta preferência é compartilhada por todas as telas que possuem filtro mensal:
Dashboard, Agenda e Lançamentos.

Não incluir automaticamente nesta task:

- relatórios futuros;
- recorrências;
- telas sem filtro mensal visível.

Também ficam fora de escopo:

- lembrar os demais filtros da listagem, como busca, tipo, status, categoria e
  conta;
- criar uma configuração manual para apagar a preferência;
- antecipar a integração de telas mensais futuras que ainda não existem;
- usar a última competência visitada como competência de novos lançamentos
  abertos fora do fluxo de `/entries`;
- alterar regras financeiras, vencimentos, status ou baixas.

## Compatibilidade e segurança

- validar tanto a query string quanto o valor recuperado do banco;
- não aceitar formatos parciais, datas completas ou texto arbitrário;
- manter isolamento por usuário em todas as leituras e gravações;
- não incluir dados financeiros ou dados sensíveis em logs;
- preservar o comportamento atual dos links que já carregam
  `?competence=YYYY-MM`;
- garantir compatibilidade com usuários e bancos criados antes da migration;
- não mudar a regra de fallback para o mês corrente quando não existir
  preferência válida.

## Critérios de aceite

- no primeiro acesso a `/dashboard`, `/calendar` ou `/entries`, sem preferência
  e sem query string, a tela abre no mês corrente do usuário;
- ao selecionar outra competência válida, essa competência é persistida para o
  usuário autenticado;
- ao alternar entre Dashboard, Agenda e Lançamentos sem query string, a última
  competência selecionada é restaurada;
- a preferência continua válida após logout, novo login e reinício da
  aplicação;
- uma competência válida informada diretamente na URL tem precedência e passa a
  ser a nova preferência;
- usar a ação de retorno ao mês atual grava o mês atual como nova preferência;
- query ausente, vazia ou inválida não apaga nem grava valor inválido;
- preferência ausente ou inválida no banco usa o mês corrente como fallback;
- os controles de mês anterior e próximo mês atualizam corretamente a
  preferência;
- filtros aplicados dentro da mesma competência não alteram indevidamente o
  valor salvo;
- exportar CSV, abrir novo lançamento ou visualizar um detalhe não muda a
  preferência por conta própria;
- dois usuários podem manter competências diferentes sem interferência;
- uma competência escolhida no Dashboard é reutilizada em Lançamentos;
- uma competência escolhida em Lançamentos é reutilizada no Dashboard;
- uma competência escolhida na Agenda é reutilizada no Dashboard e em
  Lançamentos;
- bancos existentes recebem a nova coluna sem perda de dados;
- `npm run check` e `npm test` passam.

## Cenários de validação

1. Acessar `/entries` com um usuário sem preferência e confirmar o mês corrente
   no fuso configurado.
2. Selecionar uma competência anterior, navegar para outra tela e retornar a
   `/entries` pelo menu.
3. Encerrar a sessão, autenticar novamente e confirmar que a competência foi
   mantida.
4. Reiniciar o servidor e confirmar que a preferência permanece.
5. Acessar diretamente `/entries?competence=2025-12` e confirmar uso e
   persistência do valor.
6. Usar os controles de mês anterior, próximo mês e retorno ao mês atual.
7. Aplicar busca e filtros na listagem e confirmar que a competência permanece.
8. Acessar `/entries?competence=valor-invalido` e confirmar que nenhum valor
   inválido é persistido.
9. Simular uma preferência inválida no banco em ambiente de teste e confirmar o
   fallback seguro para o mês corrente.
10. Usar dois usuários com competências diferentes e confirmar isolamento.
11. Exportar CSV, abrir o formulário de novo lançamento e visualizar um detalhe,
    confirmando que esses acessos não mudam a preferência isoladamente.
12. Selecionar competências diferentes no Dashboard, Agenda e Lançamentos,
    confirmando que a última escolha é reutilizada ao alternar entre as três
    telas.
13. Executar `npm run check` e `npm test`.
14. Em validação HTTP própria, usar a porta 3100 ou a próxima livre, nunca 3000.

## Arquivos candidatos

- `src/database/migrations/*.js`;
- `src/models/User.js`;
- `src/routes/dashboardRoutes.js`;
- `src/routes/entryRoutes.js`;
- `src/services/dateService.js`;
- `src/services/monthlyCompetenceService.js`;
- `test/unit/dateService.test.js`;
- `test/integration/entries.test.js`;
- `docs/patterns.md`;
- `docs/architecture.md`;
- `src/config/release.js`.

## Observações de implementação

- reutilizar `isCompetence`, `normalizeCompetence` e
  `currentCompetence` de `src/services/dateService.js`;
- manter a resolução da competência em uma função pequena e testável, evitando
  espalhar a ordem de precedência pela rota;
- criar a migration com a próxima numeração disponível no momento da
  implementação;
- ao concluir a task, atualizar o controle de release em
  `src/config/release.js` conforme o padrão do repositório.

## Resumo da implementação

- adicionada a migration `008_add_last_entries_competence` e, por
  compatibilidade, a migration `009_generalize_last_competence`;
- adicionada a preferência compartilhada opcional `users.last_competence`, com
  migração do valor específico anterior;
- centralizadas no model `User` a leitura e a atualização validada da
  preferência;
- criada resolução reutilizável em `monthlyCompetenceService`, com precedência
  da query válida, preferência persistida e mês corrente;
- aplicada a resolução compartilhada em `/dashboard`, `/calendar` e `/entries`;
- mantidos exportação, novo lançamento e detalhe sem gravação própria da
  preferência;
- adicionados testes HTTP de fallback, persistência, valor inválido, nova
  sessão e isolamento entre usuários;
- ampliados os testes de migrations e atualizadas as documentações de padrões e
  arquitetura;
- atualizado o controle para `Release 30/07/2026 18:13 - 079`.

---

## Assinatura da LLM

- Data: 30/07/2026 17:45
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 30/07/2026 17:55
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Assinatura da LLM

- Data: 30/07/2026 18:04
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Assinatura da LLM

- Data: 30/07/2026 18:13
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
