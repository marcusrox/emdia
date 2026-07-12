# TASK-019 - Bolinha de cor na listagem de categorias

## Contexto

Na tela `/categories`, a listagem mostra os dados das categorias cadastradas,
mas a cor associada a cada categoria ainda nao aparece de forma visual junto ao
nome. Isso dificulta reconhecer rapidamente a identidade visual da categoria,
especialmente quando o usuario esta revisando ou ajustando varias categorias.

## Objetivo

Exibir, na listagem de categorias, uma bolinha de cor ao lado do nome de cada
categoria cadastrada, com tooltip mostrando o valor hexadecimal da cor.

## Decisao proposta

Mostrar a cor como um indicador circular antes do nome da categoria, na mesma
celula do nome. A bolinha deve ser maior que um bullet comum e proporcional a
altura do texto, sem aumentar de forma perceptivel a altura da linha.

O valor hexadecimal deve aparecer em tooltip ao passar o mouse sobre a bolinha,
usando o atributo `title` ou o padrao de tooltip ja existente no projeto, se
houver.

## Escopo

- Ajustar a view da listagem de `/categories` para renderizar uma bolinha de cor
  ao lado do nome da categoria.
- Usar a cor persistida da categoria como cor visual da bolinha.
- Exibir o valor hexadecimal em tooltip.
- Criar ou reutilizar classes CSS para manter o visual consistente.
- Garantir que a bolinha tenha tamanho compativel com a altura do texto, maior
  que um bullet simples.
- Preservar a legibilidade do nome da categoria.
- Preservar o comportamento de categorias ativas e arquivadas, se a tela tiver
  ambos os estados.
- Atualizar o controle de release ao concluir a implementacao.

## Fora do escopo

- Alterar o formulario de cadastro ou edicao de categorias.
- Criar seletor de cores novo.
- Alterar o modelo de dados de categorias.
- Mudar a ordem, filtros ou regras de negocio da listagem.
- Implementar esta task neste momento.

## Comportamento esperado

- Cada linha da listagem de `/categories` exibe uma bolinha antes do nome da
  categoria.
- A bolinha usa a cor cadastrada para a categoria.
- Ao passar o mouse sobre a bolinha, o usuario ve o valor hexadecimal da cor.
- A bolinha fica visualmente alinhada ao texto do nome.
- O tamanho da bolinha fica proximo da altura visual do texto, evitando aparencia
  de bullet pequeno demais.
- A tabela continua funcionando em desktop e mobile sem sobreposicao de texto,
  acoes ou colunas.

## Sugestao de interface

Exemplo conceitual da celula de nome:

```text
[●] Alimentacao
[●] Transporte
[●] Moradia
```

Diretrizes visuais:

- bolinha entre `0.8em` e `0.95em`, ajustada conforme o resultado visual;
- `border-radius: 999px`;
- `flex-shrink: 0`;
- alinhamento vertical central com o nome;
- tooltip com o valor hex, por exemplo `#22c55e`;
- se houver risco de cores muito claras sumirem no fundo, adicionar borda sutil
  usando um token neutro do CSS.

## Ajustes CSS sugeridos

Possiveis classes:

```css
.category-name-with-color {
  align-items: center;
  display: inline-flex;
  gap: 0.5rem;
  min-width: 0;
}

.category-color-dot {
  border-radius: 999px;
  flex-shrink: 0;
  height: 0.875em;
  width: 0.875em;
}
```

Os valores finais devem respeitar os tokens e padroes existentes em
`public/css/styles.css`.

## Criterios de aceite

- `/categories` mostra uma bolinha colorida ao lado do nome de cada categoria.
- A bolinha usa a cor real cadastrada na categoria.
- A bolinha tem tooltip com o valor hexadecimal da cor.
- O tamanho da bolinha e maior que um bullet textual comum e proporcional ao
  texto da linha.
- Categorias com cores claras continuam visiveis por meio de borda sutil, se
  necessario.
- O nome da categoria permanece escapado com `escapeHtml`.
- O valor usado em atributo HTML tambem e tratado de forma segura.
- Nao ha regressao visual nos botoes de acao da listagem.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/categories`;
- conferir categorias com cores diferentes;
- passar o mouse sobre a bolinha e validar o tooltip com o hex;
- testar uma cor clara, se houver dado disponivel;
- validar em viewport desktop;
- validar em viewport mobile.

## Observacao de implementacao

Manter a alteracao localizada em `src/views/categoriesView.js` e
`public/css/styles.css`, se possivel. Se a view ja tiver helper ou padrao local
para renderizar elementos da categoria, reutilizar esse padrao.

Ao concluir a implementacao, atualizar o controle de release em
`src/config/release.js`, incrementando o numero sequencial em 1.

## Implementacao

- Foi adicionado um helper local em `src/views/categoriesView.js` para renderizar
  o nome da categoria com uma bolinha de cor antes do texto.
- A cor usada no `style` da bolinha passou por validacao simples de hexadecimal
  no formato `#RRGGBB`, com fallback para `#0f766e`.
- A bolinha recebeu tooltip com o valor hexadecimal por meio do atributo
  `title`.
- A mesma apresentacao foi aplicada tambem na listagem de categorias arquivadas.
- Foram adicionadas classes CSS em `public/css/styles.css` para alinhar a
  bolinha com o texto e manter tamanho proporcional a altura da linha.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-12 14:07
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-12 14:12
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
