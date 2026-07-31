# TASK-058 - Refinar identidade visual da categoria nas listagens

## Contexto

As listagens de lançamentos exibem atualmente o ícone da categoria dentro de
um círculo preenchido com a cor configurada para a categoria, seguido do nome
em texto simples.

Esse tratamento concentra a cor no ícone e dá ao elemento um peso visual maior
do que o desejado. A identificação por cor deve passar para o nome da categoria,
mantendo o ícone mais simples e uniforme.

## Objetivo

Alterar a apresentação da categoria nas listagens de lançamentos para exibir o
ícone sempre em preto, sem fundo e sem círculo, e apresentar o nome da categoria
como um badge baseado na cor definida no cadastro.

## Decisão visual

- renderizar o ícone da categoria em preto;
- remover do ícone o círculo, a cor de fundo, a borda e qualquer outro
  preenchimento decorativo;
- manter o ícone alinhado ao nome da categoria;
- renderizar o nome da categoria como badge;
- usar a cor configurada na categoria como cor de fundo do badge;
- calcular uma cor de texto legível para o badge, preservando contraste
  suficiente sobre a cor configurada;
- não depender apenas da cor: o nome da categoria deve permanecer sempre
  visível.

## Escopo

- aplicar o novo tratamento à coluna `Categoria` da listagem de lançamentos;
- aplicar a apresentação equivalente aos cartões mobile dessa listagem;
- aplicar o mesmo padrão às listagens de categorias ativas e arquivadas;
- aplicar o mesmo padrão à coluna `Categoria` da listagem de recorrências;
- ajustar o helper compartilhado ou permitir uma variante específica para que
  a mudança não altere outras telas fora do escopo;
- preservar a validação do nome, do ícone e da cor antes da renderização;
- continuar usando `lucide-static` por meio do helper `lucideIcon`;
- manter espaçamento e alinhamento adequados entre ícone e badge.

## Categorias sem dados visuais

- quando a categoria não tiver ícone válido, não exibir círculo ou marcador de
  cor no lugar do ícone;
- quando a cor configurada estiver ausente ou for inválida, usar o estilo
  neutro padrão de badge;
- lançamentos sem categoria devem continuar exibindo `Sem categoria` com estilo
  neutro e sem ícone.

## Fora de escopo

- alterar o cadastro, a seleção de ícones ou a seleção de cores das categorias;
- modificar filtros, competência, consultas, regras financeiras ou baixas;
- alterar o nome, o tipo ou outros dados persistidos da categoria;
- introduzir ícones SVG avulsos fora do padrão `lucide-static`.

## Acessibilidade

- o texto do badge deve manter contraste legível sobre a cor da categoria;
- o significado da categoria não pode depender somente da cor ou do ícone;
- o ícone decorativo não deve gerar leitura redundante por tecnologia
  assistiva;
- o badge não deve truncar o nome essencial da categoria em zoom ou no layout
  mobile.

## Critérios de aceite

- o ícone da categoria aparece em preto na listagem de lançamentos;
- o ícone não possui círculo, fundo, borda ou preenchimento colorido;
- o nome da categoria aparece como badge com a cor definida no cadastro;
- o texto do badge permanece legível em cores claras e escuras;
- a visualização mobile segue o mesmo padrão visual;
- categorias sem ícone válido não exibem marcador circular substituto;
- cores ausentes ou inválidas usam um badge neutro;
- lançamentos sem categoria continuam exibindo `Sem categoria`;
- as listagens de categorias ativas e arquivadas seguem o mesmo padrão;
- a listagem de recorrências segue o mesmo padrão;
- formulários e seletores de categoria não são alterados;
- `npm run check` termina sem erros.

## Validação sugerida

- categoria com ícone e cor clara;
- categoria com ícone e cor escura;
- categoria sem ícone;
- categoria com cor ausente ou inválida;
- lançamento sem categoria;
- comparação da listagem desktop com os cartões mobile;
- comparação entre lançamentos, categorias ativas, categorias arquivadas e
  recorrências.

---

## Assinatura da LLM

- Data: 30/07/2026 20:45
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao

---

## Implementação concluída

- criada uma variante específica do helper de identidade da categoria para as
  listagens de lançamentos;
- o ícone passou a ser exibido em preto, sem círculo, fundo ou borda;
- o nome passou a ser exibido como badge com a cor cadastrada e contraste
  automático do texto;
- categorias sem ícone não recebem marcador visual substituto;
- cores ausentes ou inválidas e lançamentos sem categoria usam badge neutro;
- a listagem desktop, a variante compacta e os cartões mobile usam o novo
  padrão;
- posteriormente, categorias ativas, categorias arquivadas e recorrências
  também passaram a usar a apresentação compartilhada;
- adicionados testes unitários para as variações visuais e fallbacks.

---

## Assinatura da LLM

- Data: 30/07/2026 20:48
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Correção após revisão visual

- removido o atributo `style` usado para aplicar a cor dinâmica do badge, pois
  ele era bloqueado pela política `Content-Security-Policy` da aplicação;
- a cor cadastrada passou a ser renderizada em um fundo SVG seguro, sem
  flexibilizar a política de segurança;
- o contraste do texto passou a usar classes CSS para texto claro ou escuro;
- os testes agora verificam que o badge não depende de estilo inline.

---

## Assinatura da LLM

- Data: 30/07/2026 20:54
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Refinamento visual dos badges

- o badge passou a usar uma composição tom sobre tom baseada na cor cadastrada;
- o fundo recebe uma variação clara da cor da categoria;
- o texto recebe uma variação escura da mesma cor;
- fundo e texto continuam sendo renderizados por SVG para respeitar a política
  de segurança sem estilos inline;
- categorias sem cor válida permanecem com o badge neutro.

---

## Assinatura da LLM

- Data: 30/07/2026 22:09
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Ampliação para categorias e recorrências

- a listagem de categorias ativas passou a usar badge tom sobre tom e ícone
  preto sem círculo;
- a listagem de categorias arquivadas recebeu o mesmo tratamento;
- a coluna de categoria na listagem de recorrências passou a reutilizar o mesmo
  helper visual;
- removido o helper visual duplicado da view de categorias;
- formulários, seletores e regras de negócio permanecem inalterados.

---

## Assinatura da LLM

- Data: 30/07/2026 22:16
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
