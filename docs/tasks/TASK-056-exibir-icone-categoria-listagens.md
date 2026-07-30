# TASK-056 - Exibir ícone da categoria nas listagens

## Contexto

As categorias podem ter um ícone e uma cor próprios, mas as listagens de
lançamentos e recorrências exibem somente o nome da categoria.

## Objetivo

Exibir a identidade visual da categoria nas listagens de lançamentos e
recorrências, mantendo o nome da categoria visível.

## Escopo

- incluir ícone e cor da categoria nas consultas usadas pelas listagens;
- renderizar o ícone ao lado do nome da categoria em lançamentos;
- preservar a mesma informação no cartão mobile de lançamentos;
- renderizar o ícone ao lado do nome da categoria em recorrências;
- manter um marcador de cor quando a categoria não tiver ícone configurado;
- escapar o nome e validar ícone e cor antes da renderização.

## Fora de escopo

- alterar o cadastro ou a seleção de ícones das categorias;
- remover o nome ou o tipo da categoria;
- modificar regras financeiras, filtros, competência, recorrências ou baixas.

## Critérios de aceite

- a listagem de lançamentos mostra o ícone e o nome da categoria;
- a visualização mobile de lançamentos mantém ícone e nome;
- a listagem de recorrências mostra o ícone e o nome da categoria;
- categorias sem ícone continuam identificáveis pelo nome e pela cor;
- lançamentos sem categoria continuam exibindo `Sem categoria`;
- os ícones usam `lucide-static` por meio do helper `lucideIcon`;
- `npm run check` termina sem erros.

## Implementação

- criado um helper compartilhado para renderizar ícone, cor e nome da categoria;
- as consultas de lançamentos e recorrências passaram a retornar o ícone;
- as duas listagens passaram a usar a identidade visual sem eliminar o nome.

---

## Assinatura da LLM

- Data: 30/07/2026 19:20
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao
