# TASK-006 - Tipos de lancamento em portugues na interface

## Contexto

No cadastro de Categorias, o sistema exibe atualmente os tipos internos
`EXPENSE` e `INCOME` em alguns pontos da interface. Esses valores sao adequados
como codigos internos de persistencia e regra de negocio, mas nao devem aparecer
diretamente para o usuario final.

A interface do EmDia deve manter rotulos e mensagens em portugues sempre que
exibir informacoes ao usuario.

## Objetivo

Exibir os tipos de lancamento em portugues sempre que `EXPENSE` e `INCOME`
aparecerem em telas do sistema, preservando os codigos internos atuais no banco
e no codigo de negocio.

## Escopo

- Traduzir `EXPENSE` para `Despesa` nas telas.
- Traduzir `INCOME` para `Receita` nas telas.
- Avaliar tambem `BOTH`, usado em categorias, exibindo um rotulo em portugues
  como `Ambos` quando aparecer para o usuario.
- Ajustar a listagem de Categorias para nao exibir codigos internos.
- Fazer uma varredura por exibicoes de `entry_type`, `EXPENSE`, `INCOME` e
  `BOTH` em views e textos renderizados.
- Centralizar a traducao em helper reutilizavel, evitando mapas soltos ou
  ternarios repetidos.
- Preservar os valores internos atuais em formularios, models, banco e regras
  financeiras.

## Fora do escopo

- Migrar dados do banco para valores em portugues.
- Alterar enums, codigos internos ou contratos de model.
- Alterar regras de negocio de lancamentos, categorias ou dashboard.
- Traduzir status financeiros, tipos de conta ou outros codigos que ja tenham
  task propria ou helper existente.
- Criar novo CRUD de categorias.

## Rotulos esperados

| Valor interno | Rotulo em portugues |
| --- | --- |
| `EXPENSE` | Despesa |
| `INCOME` | Receita |
| `BOTH` | Ambos |

## Pontos provaveis de implementacao

- `src/services/viewEngine.js`: tabela de Categorias e possiveis selects,
  filtros ou descricoes que exibam tipo de lancamento.
- `docs/patterns.md`: considerar registrar o helper caso vire padrao para novos
  pontos da interface.

## Requisitos tecnicos

- Usar CommonJS e os padroes atuais do projeto.
- Manter valores persistidos em ingles como codigos internos.
- Usar `escapeHtml` ao renderizar qualquer valor derivado de dados persistidos.
- Caso seja encontrado valor desconhecido, exibir fallback seguro sem quebrar a
  tela.
- Nao alterar schema ou seed apenas para traducao visual.

## Criterios de aceite

- A tabela de Categorias exibe `Despesa`, `Receita` ou `Ambos`, e nao os codigos
  `EXPENSE`, `INCOME` ou `BOTH`.
- Selects e filtros que mostrem tipo de lancamento usam rotulos em portugues.
- Novas categorias continuam sendo salvas com os codigos internos esperados.
- A varredura nao deixa exibicoes conhecidas desses codigos internos em telas do
  usuario.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
npm start
```

Fluxos manuais:

- acessar `/categories`;
- conferir os rotulos do campo Tipo no formulario;
- conferir os tipos exibidos na tabela de Categorias;
- acessar `/entries/new`;
- conferir selects de tipo e categorias;
- acessar `/entries`;
- conferir filtros e listagem quando houver exibicao de tipo;
- criar uma categoria de teste, se apropriado no ambiente local, e confirmar que
  ela aparece com rotulo em portugues.

## Observacao de implementacao

Esta task registra o escopo solicitado, mas a implementacao ainda nao deve ser
feita neste momento.

## Implementacao

- Criado helper centralizado de rotulo para tipos de lancamento em
  `src/services/viewEngine.js`.
- Selects de tipo de lancamento passaram a usar os rotulos em portugues.
- Selects de categoria agora exibem o tipo traduzido entre parenteses.
- Tabela de Categorias passou a exibir `Despesa`, `Receita` ou `Ambos`.
- Valores internos `EXPENSE`, `INCOME` e `BOTH` foram preservados em formularios
  e persistencia.

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
