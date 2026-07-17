# TASK-035 - Mover Novo lançamento para o cabeçalho da página

## Contexto

A listagem de recorrências apresenta a ação principal "Nova recorrência" no
`page-heading`, alinhada à direita e renderizada como botão textual com ícone.
Esse padrão deixa clara a principal ação da página antes da listagem.

Na tela de lançamentos, a ação equivalente "Novo lançamento" permanece dentro
da `toolbar` de filtros como um botão compacto somente com ícone. Com a
padronização dos cabeçalhos internos concluída na TASK-034, essa diferença não é
mais necessária e mistura uma ação de criação com controles de busca e filtro.

A tela de lançamentos também possui navegação mensal no `page-heading`. A ação
de criação deve compartilhar a área de ações do cabeçalho com esses controles,
sem perder a competência selecionada no link para o formulário.

## Objetivo

Mover o botão "Novo lançamento" da barra de filtros para o `page-heading` da
listagem de lançamentos, seguindo o mesmo padrão visual, textual e semântico do
botão "Nova recorrência".

O cabeçalho deve continuar exibindo os controles mensais e a ação deve abrir o
formulário já associado à competência atualmente selecionada.

## Comportamento esperado

No cabeçalho de `/entries`:

- manter eyebrow "Financeiro";
- manter `h1` "Lançamentos";
- manter a descrição da competência selecionada;
- manter mês anterior, seletor, próximo mês e retorno ao mês atual;
- adicionar à direita o botão textual "Novo lançamento";
- usar ícone `plus` do `lucide-static`;
- usar o mesmo estilo primário aplicado em "Nova recorrência";
- apontar para `/entries/new?competence=YYYY-MM`, usando a competência visível.

Na barra de filtros:

- remover o botão compacto de novo lançamento;
- preservar expansão/recolhimento dos filtros;
- preservar busca, selects, botão de filtrar e botão de limpar;
- manter o campo oculto `competence` no formulário;
- não alterar os parâmetros ou o comportamento da filtragem.

## Ajuste do helper mensal

O helper `monthSwitcher` deve aceitar uma ação adicional opcional produzida
pela view chamadora, sem conhecer rotas ou regras específicas de lançamentos.

Contrato sugerido:

```js
monthSwitcher({
  pathname,
  competence,
  current,
  title,
  eyebrow,
  additionalActions,
})
```

Regras:

- `additionalActions` deve ser HTML interno confiável produzido pelos helpers
  de botão existentes;
- quando ausente, o dashboard deve manter exatamente o comportamento atual;
- quando presente, a ação deve ser inserida em `page-heading-actions` junto aos
  controles mensais;
- `monthSwitcher` não deve importar conhecimento sobre "Novo lançamento";
- textos, URLs e competência devem continuar escapados nos pontos adequados.

Também é aceitável um nome equivalente, como `primaryAction`, desde que o
contrato permaneça genérico e pequeno.

## Escopo

- Ajustar `src/views/layout.js` para permitir ação adicional no cabeçalho
  mensal.
- Ajustar `entriesListView` em `src/views/entriesView.js` para construir o botão
  com `buttonLink`.
- Manter a competência selecionada na URL do novo lançamento.
- Remover o botão atual de dentro de `.entries-toolbar`.
- Remover a entrada `new` de `TOOLBAR_ICONS` caso deixe de ser utilizada.
- Remover CSS específico do antigo botão de criação dentro da toolbar.
- Ajustar o layout mobile da toolbar para não reservar a segunda coluna vazia.
- Ajustar `page-heading-actions` ou criar um modificador pequeno somente se
  necessário para acomodar navegação mensal e ação principal.
- Preservar os demais botões compactos usados para filtrar e limpar.
- Atualizar `docs/patterns.md` se o contrato de `monthSwitcher` passar a definir
  o padrão de ações adicionais.
- Atualizar o controle de release ao concluir a implementação.

## CSS e responsividade

Em telas largas:

- conteúdo textual permanece à esquerda;
- controles mensais e "Novo lançamento" permanecem alinhados à direita;
- o botão deve mostrar ícone e texto, como "Nova recorrência";
- nenhum controle deve sobrepor, comprimir excessivamente ou causar overflow.

Em telas estreitas:

- o cabeçalho continua quebrando para coluna;
- os controles mensais podem quebrar linha conforme o padrão atual;
- "Novo lançamento" deve permanecer visível, legível e fácil de tocar;
- a toolbar de filtros deve ocupar a largura disponível sem coluna vazia;
- não deve existir overflow horizontal.

Evitar reduzir o botão novamente a apenas um ícone no mobile. A ação principal
deve manter o rótulo textual.

## Semântica e acessibilidade

- O botão deve ser um link, pois navega para o formulário de criação.
- O texto visível deve ser "Novo lançamento".
- O ícone é complementar e deve seguir o tratamento acessível do helper.
- A ordem no DOM deve manter os controles mensais antes da ação adicional ou
  seguir uma ordem consistente em desktop e mobile.
- Não depender apenas de `title` ou `aria-label` para identificar a ação.
- Preservar os nomes acessíveis dos controles mensais.

## Fora do escopo

- Alterar o formulário de novo lançamento.
- Alterar filtros, ordenação, tabela ou exclusão mensal.
- Mover as ações de filtrar ou limpar para o cabeçalho.
- Modificar o botão "Nova recorrência".
- Adicionar ação equivalente ao dashboard.
- Alterar regras de competência ou fuso horário.
- Redesenhar todos os botões compactos da aplicação.
- Implementar esta task neste momento.

## Critérios de aceite

- `/entries` exibe "Novo lançamento" no `page-heading`.
- O botão possui ícone `plus`, texto visível e estilo primário.
- O link inclui a competência selecionada no formato `YYYY-MM`.
- Trocar a competência atualiza também o destino do botão.
- O botão não aparece mais dentro de `.entries-toolbar`.
- A toolbar contém somente filtros e suas ações relacionadas.
- Dashboard continua renderizando o cabeçalho mensal sem ação adicional.
- Mês anterior, seletor, próximo mês e mês atual continuam funcionando.
- Filtrar e limpar continuam funcionando e preservam a competência.
- Não resta ícone ou CSS morto exclusivo do antigo botão de novo lançamento.
- Desktop mantém conteúdo à esquerda e ações à direita.
- Mobile mantém texto do botão e não apresenta coluna vazia ou overflow.
- Há exatamente um `h1` e um `page-heading` na página.
- `npm run check` passa.

## Validação sugerida

Validação sintática:

```powershell
npm run check
```

Validação estrutural:

- renderizar `/entries?competence=2026-07`;
- confirmar um link textual "Novo lançamento" dentro de
  `.page-heading-actions`;
- confirmar `href="/entries/new?competence=2026-07"`;
- confirmar ausência desse link dentro de `.entries-toolbar`;
- confirmar que `.entries-toolbar` contém apenas o bloco de filtros;
- renderizar dashboard e confirmar ausência de ação adicional.

Validação funcional em servidor próprio, usando `PORT=3100` ou a próxima porta
livre:

- acessar `/entries` no mês atual;
- navegar para mês anterior e próximo;
- confirmar que o link de criação acompanha o mês selecionado;
- abrir o link e confirmar a competência preenchida no formulário;
- aplicar e limpar filtros;
- validar `/dashboard` para evitar regressão no helper mensal;
- nunca iniciar, reutilizar ou encerrar processos na porta 3000.

Validação visual:

- comparar o botão com "Nova recorrência";
- testar desktop com título, controles mensais e ação na mesma linha;
- testar mobile com quebra de linha e texto integral do botão;
- confirmar ausência de overflow horizontal e espaço vazio na toolbar.

## Observações de implementação

Preferir `buttonLink({ href, label: "Novo lançamento", icon: "plus", tone:
"primary" })`, igual ao padrão de recorrências. Não reutilizar
`toolbarIconLink`, pois ele foi criado para ações compactas de toolbar e oculta
o rótulo visual.

Ao remover o botão da toolbar, revisar especialmente as regras mobile
`.entries-toolbar` e `.entries-toolbar > .toolbar-icon-button`, que atualmente
reservam uma coluna específica para essa ação.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 16/07/2026 23:43
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

## Implementação

- `monthSwitcher` passou a aceitar `additionalActions` sem conhecer regras ou
  rotas específicas de lançamentos.
- A listagem de lançamentos passou a construir "Novo lançamento" com
  `buttonLink`, ícone `plus`, texto visível e estilo primário.
- O link preserva a competência selecionada em
  `/entries/new?competence=YYYY-MM`.
- O antigo botão compacto foi removido da toolbar e a entrada `new` deixou de
  existir em `TOOLBAR_ICONS`.
- O layout mobile de `.entries-toolbar` deixou de reservar uma segunda coluna
  para a ação removida.
- O padrão de ações adicionais do cabeçalho mensal foi documentado.
- A validação funcional confirmou que a competência do cabeçalho chega
  preenchida ao formulário de novo lançamento.
- Desktop e mobile foram validados visualmente sem overflow; o botão manteve o
  texto integral e a toolbar ficou somente com o bloco de filtros.
- Dashboard permaneceu sem ação adicional e Recorrências manteve o mesmo estilo
  primário usado como referência.
- `npm run check` e `git diff --check` passaram.
- O servidor temporário usou a porta 3100, foi encerrado pelo PID capturado e
  teve seus arquivos temporários removidos.
- O controle de release foi atualizado para a sequência 038.

---

## Assinatura da LLM

- Data: 16/07/2026 23:50
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização
