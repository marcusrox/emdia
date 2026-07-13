# TASK-029 - Redesenhar detalhe do lançamento

## Contexto

A tela de visualização de lançamento (`GET /entries/:id`) está funcional, mas a
apresentação atual desperdiça espaço e dificulta a leitura. Na renderização
avaliada em `http://localhost:3000/entries/ent_9d1e6f7ee92d4731a02cc5256834c5aa`,
o lançamento "Gás - Bahiagás" abre com um painel grande de dados à esquerda e um
painel lateral à direita contendo formulário de baixa, baixas e histórico.

O resultado visual fica desequilibrado:

- o painel principal ocupa muita altura com poucas informações;
- os dados ficam em linhas longas, com rótulo à esquerda e valor encostado à
  direita, criando distância visual excessiva;
- o formulário de baixa compete com a leitura do lançamento;
- a seção de baixas e histórico fica espremida na coluna lateral;
- valores grandes, IDs e metadados do histórico quebram o layout e viram blocos
  difíceis de ler;
- a página usa cards grandes demais para uma tela operacional que deveria ser
  mais densa, escaneável e eficiente.

## Objetivo

Redesenhar a tela de detalhe de lançamento para apresentar os dados de forma
compacta, clara e resistente a conteúdos longos, preservando as ações atuais:

- voltar para a competência;
- editar o lançamento;
- registrar baixa;
- listar baixas;
- listar histórico funcional/auditoria do lançamento.

## Proposta de apresentação

Estrutura recomendada para desktop:

- topo compacto com tipo, competência, status e título do lançamento;
- faixa de resumo financeiro logo abaixo do título, com cartões ou blocos
  pequenos para valor previsto, valor realizado, saldo em aberto e vencimento;
- área principal em grid de duas colunas:
  - coluna maior para dados do lançamento e histórico;
  - coluna menor fixa para ações e registro de baixa;
- detalhes do lançamento em grupos compactos, usando grid de definição em duas
  ou três colunas, sem linhas horizontais excessivamente longas;
- histórico em largura confortável, abaixo dos detalhes ou em aba própria dentro
  da coluna principal;
- formulário de baixa em painel lateral compacto, com campos organizados em duas
  colunas quando houver espaço;
- baixas registradas em lista/tabela compacta, com valor, data, conta e ajustes.

Estrutura recomendada para mobile:

- topo com título, status e competência;
- resumo financeiro em blocos empilhados ou grid de duas colunas;
- ações principais logo após o resumo;
- detalhes, registro de baixa, baixas e histórico em seções empilhadas;
- evitar qualquer rolagem horizontal.

## Escopo

- Ajustar `entryDetailView` em `src/views/entriesView.js`.
- Adicionar classes específicas para o detalhe do lançamento em
  `public/css/styles.css`.
- Manter uso de `layout.js` e helpers existentes de `viewHelpers.js`.
- Usar `lucideIcon`, `buttonContent` e `buttonLink` quando houver ícones ou
  botões.
- Preservar escape de dados com `escapeHtml`.
- Preservar os formulários POST e CSRF existentes.
- Preservar validação padronizada já aplicada ao formulário de baixa.
- Tratar metadados longos do histórico com quebra segura, truncamento visual ou
  layout em coluna que não estoure o container.
- Garantir que valores monetários grandes não quebrem o layout.
- Garantir que links de recorrência, nomes de conta, categorias e pessoas longos
  quebrem de forma controlada.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Alterar regras financeiras, baixa, status ou auditoria.
- Criar novos campos de banco.
- Reescrever a listagem de lançamentos.
- Alterar o fluxo de recorrências.
- Implementar filtros no histórico.
- Criar modal de baixa.
- Implementar esta task neste momento.

## Comportamento visual esperado

- A página deve parecer uma tela operacional densa e organizada, não uma página
  de marketing.
- O usuário deve identificar em poucos segundos:
  - descrição;
  - tipo;
  - competência;
  - status;
  - valor previsto;
  - valor realizado;
  - saldo pendente;
  - vencimento;
  - conta;
  - categoria;
  - favorecido ou pagador.
- O formulário de baixa deve ficar disponível sem dominar a tela.
- Baixas e histórico devem ter mais largura útil do que na versão atual.
- IDs, payloads e metadados técnicos do histórico devem ser legíveis, mas
  visualmente subordinados ao evento principal.
- O botão primário deve continuar sendo a ação de baixa quando a baixa for
  aplicável.
- O botão de edição deve continuar acessível sem competir com a ação de baixa.

## Diretrizes de layout

- Evitar painel principal com grande área vazia.
- Evitar linhas de definição com valores muito distantes dos rótulos.
- Usar `minmax(0, 1fr)` em grids para permitir quebra correta.
- Usar `overflow-wrap: anywhere` ou regra equivalente em campos propensos a
  texto longo, como histórico, IDs, descrições, recorrências e nomes.
- Manter largura mínima estável em valores monetários quando possível.
- Usar seções full-width ou blocos internos simples, sem card dentro de card.
- Não criar uma paleta nova para esta tela; reaproveitar tokens visuais
  existentes.
- Preservar densidade confortável: menos altura desperdiçada, sem deixar a tela
  apertada demais.

## Critérios de aceite

- `GET /entries/:id` continua renderizando corretamente.
- A tela não apresenta rolagem horizontal em desktop ou mobile.
- Histórico com IDs longos não estoura o painel.
- Valores monetários grandes, como `R$ 9.999.999,99`, não quebram a estrutura da
  página.
- Descrições, nomes de recorrência, conta, categoria e favorecido/pagador longos
  quebram de forma controlada.
- Em desktop, o resumo financeiro fica visível acima da dobra inicial.
- Em desktop, baixas e histórico deixam de ficar espremidos em uma coluna
  estreita quando houver espaço útil para apresentá-los melhor.
- Em mobile, detalhes, baixa, baixas e histórico ficam empilhados em ordem
  lógica e sem sobreposição.
- O formulário de baixa mantém os campos e mensagens de validação existentes.
- Os botões "Voltar", "Editar" e "Baixar" continuam funcionando.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Validação manual:

- abrir um lançamento com histórico curto;
- abrir um lançamento com histórico contendo IDs ou metadados longos;
- testar um lançamento com descrição longa;
- testar valores monetários grandes em previsto, realizado e baixas;
- validar desktop em largura aproximada de `1280px`;
- validar mobile em largura aproximada de `390px`;
- testar `GET /health`;
- testar `GET /dashboard`;
- testar `GET /entries`;
- testar `GET /entries/:id`.

Para validação HTTP própria, usar `PORT=3100` ou a próxima porta livre a partir
de `3101`, sem iniciar ou encerrar processos na porta `3000`.

## Observações de implementação

A tela atual é montada por `entryDetailView` em `src/views/entriesView.js`.
Antes de implementar, revisar se as mudanças recentes em `entriesView.js` e
`public/css/styles.css` já alteraram parcialmente essa tela, para evitar
sobrescrever trabalho local.

Uma implementação possível é introduzir classes como:

- `entry-detail-page`;
- `entry-detail-header`;
- `entry-summary-grid`;
- `entry-detail-grid`;
- `entry-facts-grid`;
- `entry-settlement-panel`;
- `entry-history-list`;
- `entry-history-meta`.

Os nomes exatos devem seguir o padrão CSS já existente no projeto.

## Implementação

- `entryDetailView` foi redesenhada com cabeçalho compacto, status destacado,
  ações no topo e resumo financeiro em quatro blocos.
- Os dados do lançamento passaram a usar grid compacto de fatos, evitando linhas
  muito longas com rótulos e valores distantes.
- Baixas e histórico foram movidos para a coluna principal, com mais largura
  útil para leitura.
- O formulário de baixa ficou isolado em painel lateral, mantendo validação,
  CSRF, campos e ação POST existentes.
- O histórico ganhou renderização específica para o detalhe do lançamento, com
  metadados em bloco próprio e quebra segura de textos longos.
- O CSS recebeu classes específicas para a tela de detalhe, incluindo regras
  responsivas para desktop, tablet e mobile.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 13/07/2026 20:07
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 13/07/2026 20:11
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização
