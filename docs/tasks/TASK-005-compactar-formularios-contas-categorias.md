# TASK-005 - Compactar formularios de Contas e Categorias

## Contexto

A TASK-004 criou o modificador CSS `form-compact` e aplicou esse padrao aos
formularios operacionais do sistema. Apesar disso, as telas de Contas
(`/accounts`) e Categorias (`/categories`) ainda aparentam nao ter recebido uma
compactacao suficiente.

Na revisao inicial do codigo, os formularios dessas telas ja possuem a classe
`form-compact`, mas continuam usando `form-stack` dentro do layout `split`.
Isso reduz alguns espacamentos internos, mas nao muda significativamente a
densidade visual percebida nessas telas.

## Objetivo

Ajustar as telas de Contas e Categorias para que seus formularios de cadastro
sigam de forma perceptivel o padrao compacto definido para formularios
operacionais do EmDia.

## Escopo

- Revisar o layout dos formularios de `/accounts` e `/categories`.
- Ajustar CSS ou classes dessas telas para que a compactacao seja visivel.
- Preservar o padrao reutilizavel `form-compact`.
- Avaliar se esses formularios devem usar uma variacao em grade compacta em vez
  de apenas `form-stack`.
- Reduzir altura, `gap`, `padding` e ocupacao vertical dos formularios.
- Manter tabelas de Contas e Categorias legiveis ao lado dos formularios.
- Preservar responsividade em telas menores.

## Fora do escopo

- Alterar regras de negocio de Contas ou Categorias.
- Alterar campos existentes, validacoes ou persistencia.
- Redesenhar a listagem/tabela dessas telas alem do necessario para acomodar o
  formulario compacto.
- Alterar novamente o formulario de lancamentos, salvo se for necessario para
  preservar consistencia do padrao.
- Introduzir framework CSS ou dependencia externa.

## Diagnostico inicial

- `src/services/viewEngine.js`: os formularios de Contas e Categorias usam
  `class="panel form-stack form-compact"`.
- `public/css/styles.css`: `form-compact` reduz espacamentos internos, mas o
  efeito e limitado em formularios empilhados de poucos campos.
- O layout `split` pode continuar passando a percepcao de painel alto e pouco
  denso, mesmo com a classe compacta aplicada.

## Comportamento esperado

- O formulario de Contas deve ficar visualmente mais compacto que o estado
  atual.
- O formulario de Categorias deve ficar visualmente mais compacto que o estado
  atual.
- A diferenca deve ser perceptivel ao comparar com o layout anterior.
- O padrao deve continuar coerente com `/entries/new` e com a edicao de
  lancamentos.
- Em telas pequenas, os formularios devem continuar em uma coluna sem
  sobreposicao.

## Possiveis abordagens

- Criar uma classe complementar para formularios curtos, como
  `form-compact-inline` ou `form-compact-narrow`.
- Usar grade de duas colunas para formularios curtos em telas largas.
- Reduzir ainda mais o padding de `panel.form-compact` quando o formulario for
  de cadastro simples.
- Ajustar o alinhamento dos botoes para evitar que ocupem uma linha alta demais.

## Criterios de aceite

- `/accounts` exibe o formulario de cadastro de conta em formato claramente
  compacto.
- `/categories` exibe o formulario de cadastro de categoria em formato
  claramente compacto.
- Os campos existentes continuam presentes e funcionais.
- O ajuste nao quebra `/entries/new`, edicao de lancamentos ou Configuracoes.
- O layout permanece responsivo.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
npm start
```

Fluxos manuais:

- acessar `/accounts`;
- comparar a densidade do formulario de conta com o estado anterior;
- criar uma conta de teste, se apropriado no ambiente local;
- acessar `/categories`;
- comparar a densidade do formulario de categoria com o estado anterior;
- criar uma categoria de teste, se apropriado no ambiente local;
- conferir `/entries/new` para garantir que o padrao principal nao regrediu;
- testar em largura menor de tela.

## Observacao de implementacao

Esta task registra a revisao solicitada e a lacuna visual encontrada, mas a
implementacao ainda nao deve ser feita neste momento.

## Implementacao

- Formularios de Contas e Categorias deixaram de usar apenas `form-stack` e
  passaram para `form-grid form-compact form-short`.
- Criada a variacao `form-short` para formularios curtos em duas colunas no
  desktop.
- Criado o layout `compact-crud` para reduzir a largura do formulario e dar mais
  espaco a tabela nas telas de cadastro simples.
- Responsividade preservada com quebra para uma coluna em telas menores.

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
