# TASK-004 - Formularios compactos de cadastro e edicao

## Contexto

A tela de novo lancamento financeiro (`/entries/new`) possui um formulario com
muitos campos e espacamentos generosos. Em monitores menores, isso faz com que o
usuario veja pouca informacao por vez e precise rolar a tela com frequencia.

Como o EmDia e uma ferramenta operacional, os formularios de cadastro e edicao
devem privilegiar leitura rapida, densidade moderada e eficiencia, sem perder
clareza ou acessibilidade.

Essa melhoria deve estabelecer um padrao mais compacto para formularios do
sistema, com a tela de novo/edicao de lancamento como principal referencia.

## Objetivo

Reduzir o espaco vertical consumido pelos formularios de cadastro e edicao,
especialmente em `/entries/new`, criando um padrao visual mais compacto para os
formularios operacionais do EmDia.

## Escopo

- Tornar o formulario de novo lancamento financeiro mais compacto.
- Aplicar o mesmo padrao ao formulario de edicao de lancamento.
- Definir classes ou regras CSS reutilizaveis para formularios compactos de
  cadastro e edicao.
- Ajustar espacamentos entre campos, altura dos inputs/selects, paddings e
  largura dos grupos quando necessario.
- Preservar a legibilidade dos rotulos e valores.
- Preservar responsividade em telas menores.
- Manter a navegacao mensal e o retorno para a competencia selecionada.
- Avaliar outros formularios existentes para aplicar o mesmo padrao quando fizer
  sentido, como Contas, Categorias e Configuracoes.

## Fora do escopo

- Alterar regras de negocio de lancamentos financeiros.
- Alterar campos, nomes de campos ou dados obrigatorios do formulario.
- Remover informacoes necessarias do cadastro ou edicao.
- Criar wizard, abas ou fluxo em multiplas etapas.
- Introduzir framework CSS ou biblioteca de componentes.
- Redesenhar a navegacao geral da aplicacao.
- Alterar a preferencia de tamanho de fonte criada na task de configuracoes,
  salvo para garantir compatibilidade visual.

## Comportamento esperado

- O formulario de `/entries/new` deve ocupar menos altura vertical.
- Mais campos devem ficar visiveis no primeiro viewport, especialmente em
  notebooks e monitores menores.
- O usuario deve conseguir escanear e preencher o formulario com menos rolagem.
- Campos relacionados devem continuar visualmente agrupados de forma clara.
- Botoes de acao devem permanecer visiveis e consistentes com o padrao do
  sistema.
- Em telas pequenas, o formulario deve continuar quebrando para uma coluna sem
  sobreposicao de textos ou campos.

## Diretrizes visuais

- Reduzir `gap`, `padding` e `min-height` em formularios operacionais.
- Evitar cards muito altos quando o conteudo for formulario de trabalho.
- Manter labels curtos e alinhados ao campo.
- Preservar contraste, foco e area clicavel suficiente.
- Evitar que campos fiquem apertados a ponto de prejudicar digitacao ou leitura.
- Usar uma classe reutilizavel para diferenciar formulario compacto de outros
  contextos que ainda precisem de maior respiro visual.

## Pontos provaveis de implementacao

- `src/services/viewEngine.js`: aplicar classe de formulario compacto em
  cadastro/edicao de lancamentos e, se adequado, em outros formularios.
- `public/css/styles.css`: criar ou ajustar regras reutilizaveis para formularios
  compactos.
- `docs/patterns.md`: considerar registrar o novo padrao visual se ele passar a
  ser regra geral para novos formularios.

## Criterios de aceite

- `/entries/new` apresenta o formulario em layout mais compacto que o atual.
- A tela de edicao de lancamento usa o mesmo padrao compacto.
- Os campos existentes continuam presentes e funcionais.
- Os formularios continuam responsivos em telas menores.
- O ajuste nao quebra a preferencia de tamanho de fonte do usuario.
- O padrao pode ser reutilizado por outros formularios de cadastro/edicao.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
npm start
```

Fluxos manuais:

- acessar `/entries/new`;
- conferir a quantidade de campos visiveis sem rolagem;
- preencher e salvar um lancamento de despesa;
- editar o lancamento criado;
- testar a tela com fonte Pequena, Padrao e Grande;
- conferir os formularios de Contas, Categorias e Configuracoes;
- testar em largura menor de tela para confirmar responsividade.

## Observacao de implementacao

Esta task registra o escopo solicitado, mas a implementacao ainda nao deve ser
feita neste momento.

## Implementacao

- Criado modificador CSS reutilizavel `form-compact` para formularios
  operacionais.
- Formulario de novo/edicao de lancamento passou a usar grade compacta em quatro
  colunas no desktop.
- Campos longos do lancamento usam `field-span-2` para reduzir altura sem perder
  largura util.
- Formularios de Contas, Categorias e Configuracoes tambem passaram a usar o
  padrao compacto.
- Login e fluxo de baixa foram preservados com o espacamento anterior.

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
