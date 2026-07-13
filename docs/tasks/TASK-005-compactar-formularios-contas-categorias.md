# TASK-005 - Compactar formulários de Contas e Categorias

## Contexto

A TASK-004 criou o modificador CSS `form-compact` e aplicou esse padrão aos
formulários operacionais do sistema. Apesar disso, as telas de Contas
(`/accounts`) e Categorias (`/categories`) ainda aparentam não ter recebido uma
compactacao suficiente.

Na revisão inicial do código, os formulários dessas telas já possuem a classe
`form-compact`, mas continuam usando `form-stack` dentro do layout `split`.
Isso reduz alguns espacamentos internos, mas não muda significativamente a
densidade visual percebida nessas telas.

## Objetivo

Ajustar as telas de Contas e Categorias para que seus formulários de cadastro
sigam de forma perceptivel o padrão compacto definido para formulários
operacionais do EmDia.

## Escopo

- Revisar o layout dos formulários de `/accounts` e `/categories`.
- Ajustar CSS ou classes dessas telas para que a compactacao seja visível.
- Preservar o padrão reutilizável `form-compact`.
- Avaliar se esses formulários devem usar uma variação em grade compacta em vez
  de apenas `form-stack`.
- Reduzir altura, `gap`, `padding` e ocupação vertical dos formulários.
- Manter tabelas de Contas e Categorias legíveis ao lado dos formulários.
- Preservar responsividade em telas menores.

## Fora do escopo

- Alterar regras de negocio de Contas ou Categorias.
- Alterar campos existentes, validações ou persistência.
- Redesenhar a listagem/tabela dessas telas além do necessário para acomodar o
  formulário compacto.
- Alterar novamente o formulário de lançamentos, salvo se for necessário para
  preservar consistência do padrão.
- Introduzir framework CSS ou dependência externa.

## Diagnostico inicial

- `src/services/viewEngine.js`: os formulários de Contas e Categorias usam
  `class="panel form-stack form-compact"`.
- `public/css/styles.css`: `form-compact` reduz espacamentos internos, mas o
  efeito e limitado em formulários empilhados de poucos campos.
- O layout `split` pode continuar passando a percepção de painel alto e pouco
  denso, mesmo com a classe compacta aplicada.

## Comportamento esperado

- O formulário de Contas deve ficar visualmente mais compacto que o estado
  atual.
- O formulário de Categorias deve ficar visualmente mais compacto que o estado
  atual.
- A diferença deve ser perceptivel ao comparar com o layout anterior.
- O padrão deve continuar coerente com `/entries/new` e com a edição de
  lançamentos.
- Em telas pequenas, os formulários devem continuar em uma coluna sem
  sobreposicao.

## Possíveis abordagens

- Criar uma classe complementar para formulários curtos, como
  `form-compact-inline` ou `form-compact-narrow`.
- Usar grade de duas colunas para formulários curtos em telas largas.
- Reduzir ainda mais o padding de `panel.form-compact` quando o formulário for
  de cadastro simples.
- Ajustar o alinhamento dos botões para evitar que ocupem uma linha alta demais.

## Critérios de aceite

- `/accounts` exibe o formulário de cadastro de conta em formato claramente
  compacto.
- `/categories` exibe o formulário de cadastro de categoria em formato
  claramente compacto.
- Os campos existentes continuam presentes e funcionais.
- O ajuste não quebra `/entries/new`, edição de lançamentos ou Configurações.
- O layout permanece responsivo.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
npm start
```

Fluxos manuais:

- acessar `/accounts`;
- comparar a densidade do formulário de conta com o estado anterior;
- criar uma conta de teste, se apropriado no ambiente local;
- acessar `/categories`;
- comparar a densidade do formulário de categoria com o estado anterior;
- criar uma categoria de teste, se apropriado no ambiente local;
- conferir `/entries/new` para garantir que o padrão principal não regrediu;
- testar em largura menor de tela.

## Observação de implementação

Esta task registra a revisão solicitada e a lacuna visual encontrada, mas a
implementação ainda não deve ser feita neste momento.

## Implementação

- Formulários de Contas e Categorias deixaram de usar apenas `form-stack` e
  passaram para `form-grid form-compact form-short`.
- Criada a variação `form-short` para formulários curtos em duas colunas no
  desktop.
- Criado o layout `compact-crud` para reduzir a largura do formulário e dar mais
  espaco a tabela nas telas de cadastro simples.
- Responsividade preservada com quebra para uma coluna em telas menores.

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
