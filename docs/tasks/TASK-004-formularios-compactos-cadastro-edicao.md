# TASK-004 - Formulários compactos de cadastro e edição

## Contexto

A tela de novo lançamento financeiro (`/entries/new`) possui um formulário com
muitos campos e espacamentos generosos. Em monitores menores, isso faz com que o
usuário veja pouca informação por vez e precise rolar a tela com frequência.

Como o EmDia e uma ferramenta operacional, os formulários de cadastro e edição
devem privilegiar leitura rápida, densidade moderada e eficiência, sem perder
clareza ou acessibilidade.

Essa melhoria deve estabelecer um padrão mais compacto para formulários do
sistema, com a tela de novo/edição de lançamento como principal referência.

## Objetivo

Reduzir o espaco vertical consumido pelos formulários de cadastro e edição,
especialmente em `/entries/new`, criando um padrão visual mais compacto para os
formulários operacionais do EmDia.

## Escopo

- Tornar o formulário de novo lançamento financeiro mais compacto.
- Aplicar o mesmo padrão ao formulário de edição de lançamento.
- Definir classes ou regras CSS reutilizáveis para formulários compactos de
  cadastro e edição.
- Ajustar espacamentos entre campos, altura dos inputs/selects, paddings e
  largura dos grupos quando necessário.
- Preservar a legibilidade dos rótulos e valores.
- Preservar responsividade em telas menores.
- Manter a navegação mensal e o retorno para a competência selecionada.
- Avaliar outros formulários existentes para aplicar o mesmo padrão quando fizer
  sentido, como Contas, Categorias e Configurações.

## Fora do escopo

- Alterar regras de negocio de lançamentos financeiros.
- Alterar campos, nomes de campos ou dados obrigatórios do formulário.
- Remover informações necessárias do cadastro ou edição.
- Criar wizard, abas ou fluxo em múltiplas etapas.
- Introduzir framework CSS ou biblioteca de componentes.
- Redesenhar a navegação geral da aplicação.
- Alterar a preferência de tamanho de fonte criada na task de configurações,
  salvo para garantir compatibilidade visual.

## Comportamento esperado

- O formulário de `/entries/new` deve ocupar menos altura vertical.
- Mais campos devem ficar visíveis no primeiro viewport, especialmente em
  notebooks e monitores menores.
- O usuário deve conseguir escanear e preencher o formulário com menos rolagem.
- Campos relacionados devem continuar visualmente agrupados de forma clara.
- Botões de ação devem permanecer visíveis e consistentes com o padrão do
  sistema.
- Em telas pequenas, o formulário deve continuar quebrando para uma coluna sem
  sobreposicao de textos ou campos.

## Diretrizes visuais

- Reduzir `gap`, `padding` e `min-height` em formulários operacionais.
- Evitar cards muito altos quando o conteúdo for formulário de trabalho.
- Manter labels curtos e alinhados ao campo.
- Preservar contraste, foco e área clicavel suficiente.
- Evitar que campos fiquem apertados a ponto de prejudicar digitacao ou leitura.
- Usar uma classe reutilizável para diferenciar formulário compacto de outros
  contextos que ainda precisem de maior respiro visual.

## Pontos prováveis de implementação

- `src/services/viewEngine.js`: aplicar classe de formulário compacto em
  cadastro/edição de lançamentos e, se adequado, em outros formulários.
- `public/css/styles.css`: criar ou ajustar regras reutilizáveis para formulários
  compactos.
- `docs/patterns.md`: considerar registrar o novo padrão visual se ele passar a
  ser regra geral para novos formulários.

## Critérios de aceite

- `/entries/new` apresenta o formulário em layout mais compacto que o atual.
- A tela de edição de lançamento usa o mesmo padrão compacto.
- Os campos existentes continuam presentes e funcionais.
- Os formulários continuam responsivos em telas menores.
- O ajuste não quebra a preferência de tamanho de fonte do usuário.
- O padrão pode ser reutilizado por outros formulários de cadastro/edição.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
npm start
```

Fluxos manuais:

- acessar `/entries/new`;
- conferir a quantidade de campos visíveis sem rolagem;
- preencher e salvar um lançamento de despesa;
- editar o lançamento criado;
- testar a tela com fonte Pequena, Padrão e Grande;
- conferir os formulários de Contas, Categorias e Configurações;
- testar em largura menor de tela para confirmar responsividade.

## Observação de implementação

Esta task registra o escopo solicitado, mas a implementação ainda não deve ser
feita neste momento.

## Implementação

- Criado modificador CSS reutilizável `form-compact` para formulários
  operacionais.
- Formulário de novo/edição de lançamento passou a usar grade compacta em quatro
  colunas no desktop.
- Campos longos do lançamento usam `field-span-2` para reduzir altura sem perder
  largura util.
- Formulários de Contas, Categorias e Configurações também passaram a usar o
  padrão compacto.
- Login e fluxo de baixa foram preservados com o espacamento anterior.

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: criação

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
