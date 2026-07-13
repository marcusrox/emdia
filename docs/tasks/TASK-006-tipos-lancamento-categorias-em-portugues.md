# TASK-006 - Tipos de lançamento em português na interface

## Contexto

No cadastro de Categorias, o sistema exibe atualmente os tipos internos
`EXPENSE` e `INCOME` em alguns pontos da interface. Esses valores sao adequados
como códigos internos de persistência e regra de negocio, mas não devem aparecer
diretamente para o usuário final.

A interface do EmDia deve manter rótulos e mensagens em português sempre que
exibir informações ao usuário.

## Objetivo

Exibir os tipos de lançamento em português sempre que `EXPENSE` e `INCOME`
aparecerem em telas do sistema, preservando os códigos internos atuais no banco
e no código de negocio.

## Escopo

- Traduzir `EXPENSE` para `Despesa` nas telas.
- Traduzir `INCOME` para `Receita` nas telas.
- Avaliar também `BOTH`, usado em categorias, exibindo um rótulo em português
  como `Ambos` quando aparecer para o usuário.
- Ajustar a listagem de Categorias para não exibir códigos internos.
- Fazer uma varredura por exibicoes de `entry_type`, `EXPENSE`, `INCOME` e
  `BOTH` em views e textos renderizados.
- Centralizar a traducao em helper reutilizável, evitando mapas soltos ou
  ternarios repetidos.
- Preservar os valores internos atuais em formulários, models, banco e regras
  financeiras.

## Fora do escopo

- Migrar dados do banco para valores em português.
- Alterar enums, códigos internos ou contratos de model.
- Alterar regras de negocio de lançamentos, categorias ou dashboard.
- Traduzir status financeiros, tipos de conta ou outros códigos que já tenham
  task própria ou helper existente.
- Criar novo CRUD de categorias.

## Rótulos esperados

| Valor interno | Rótulo em português |
| --- | --- |
| `EXPENSE` | Despesa |
| `INCOME` | Receita |
| `BOTH` | Ambos |

## Pontos prováveis de implementação

- `src/services/viewEngine.js`: tabela de Categorias e possíveis selects,
  filtros ou descrições que exibam tipo de lançamento.
- `docs/patterns.md`: considerar registrar o helper caso vire padrão para novos
  pontos da interface.

## Requisitos técnicos

- Usar CommonJS e os padrões atuais do projeto.
- Manter valores persistidos em ingles como códigos internos.
- Usar `escapeHtml` ao renderizar qualquer valor derivado de dados persistidos.
- Caso seja encontrado valor desconhecido, exibir fallback seguro sem quebrar a
  tela.
- Não alterar schema ou seed apenas para traducao visual.

## Critérios de aceite

- A tabela de Categorias exibe `Despesa`, `Receita` ou `Ambos`, e não os códigos
  `EXPENSE`, `INCOME` ou `BOTH`.
- Selects e filtros que mostrem tipo de lançamento usam rótulos em português.
- Novas categorias continuam sendo salvas com os códigos internos esperados.
- A varredura não deixa exibicoes conhecidas desses códigos internos em telas do
  usuário.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
npm start
```

Fluxos manuais:

- acessar `/categories`;
- conferir os rótulos do campo Tipo no formulário;
- conferir os tipos exibidos na tabela de Categorias;
- acessar `/entries/new`;
- conferir selects de tipo e categorias;
- acessar `/entries`;
- conferir filtros e listagem quando houver exibição de tipo;
- criar uma categoria de teste, se apropriado no ambiente local, e confirmar que
  ela aparece com rótulo em português.

## Observação de implementação

Esta task registra o escopo solicitado, mas a implementação ainda não deve ser
feita neste momento.

## Implementação

- Criado helper centralizado de rótulo para tipos de lançamento em
  `src/services/viewEngine.js`.
- Selects de tipo de lançamento passaram a usar os rótulos em português.
- Selects de categoria agora exibem o tipo traduzido entre parenteses.
- Tabela de Categorias passou a exibir `Despesa`, `Receita` ou `Ambos`.
- Valores internos `EXPENSE`, `INCOME` e `BOTH` foram preservados em formulários
  e persistência.

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
