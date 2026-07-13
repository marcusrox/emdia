# TASK-019 - Bolinha de cor na listagem de categorias

## Contexto

Na tela `/categories`, a listagem mostra os dados das categorias cadastradas,
mas a cor associada a cada categoria ainda não aparece de forma visual junto ao
nome. Isso dificulta reconhecer rapidamente a identidade visual da categoria,
especialmente quando o usuário esta revisando ou ajustando varias categorias.

## Objetivo

Exibir, na listagem de categorias, uma bolinha de cor ao lado do nome de cada
categoria cadastrada, com tooltip mostrando o valor hexadecimal da cor.

## Decisão proposta

Mostrar a cor como um indicador circular antes do nome da categoria, na mesma
celula do nome. A bolinha deve ser maior que um bullet comum e proporcional a
altura do texto, sem aumentar de forma perceptivel a altura da linha.

O valor hexadecimal deve aparecer em tooltip ao passar o mouse sobre a bolinha,
usando o atributo `title` ou o padrão de tooltip já existente no projeto, se
houver.

## Escopo

- Ajustar a view da listagem de `/categories` para renderizar uma bolinha de cor
  ao lado do nome da categoria.
- Usar a cor persistida da categoria como cor visual da bolinha.
- Exibir o valor hexadecimal em tooltip.
- Criar ou reutilizar classes CSS para manter o visual consistente.
- Garantir que a bolinha tenha tamanho compatível com a altura do texto, maior
  que um bullet simples.
- Preservar a legibilidade do nome da categoria.
- Preservar o comportamento de categorias ativas e arquivadas, se a tela tiver
  ambos os estados.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Alterar o formulário de cadastro ou edição de categorias.
- Criar seletor de cores novo.
- Alterar o modelo de dados de categorias.
- Mudar a ordem, filtros ou regras de negocio da listagem.
- Implementar esta task neste momento.

## Comportamento esperado

- Cada linha da listagem de `/categories` exibe uma bolinha antes do nome da
  categoria.
- A bolinha usa a cor cadastrada para a categoria.
- Ao passar o mouse sobre a bolinha, o usuário ve o valor hexadecimal da cor.
- A bolinha fica visualmente alinhada ao texto do nome.
- O tamanho da bolinha fica próximo da altura visual do texto, evitando aparência
  de bullet pequeno demais.
- A tabela continua funcionando em desktop e mobile sem sobreposicao de texto,
  ações ou colunas.

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

Possíveis classes:

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

Os valores finais devem respeitar os tokens e padrões existentes em
`public/css/styles.css`.

## Critérios de aceite

- `/categories` mostra uma bolinha colorida ao lado do nome de cada categoria.
- A bolinha usa a cor real cadastrada na categoria.
- A bolinha tem tooltip com o valor hexadecimal da cor.
- O tamanho da bolinha e maior que um bullet textual comum e proporcional ao
  texto da linha.
- Categorias com cores claras continuam visíveis por meio de borda sutil, se
  necessário.
- O nome da categoria permanece escapado com `escapeHtml`.
- O valor usado em atributo HTML também e tratado de forma segura.
- Não há regressao visual nos botões de ação da listagem.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/categories`;
- conferir categorias com cores diferentes;
- passar o mouse sobre a bolinha e validar o tooltip com o hex;
- testar uma cor clara, se houver dado disponível;
- validar em viewport desktop;
- validar em viewport mobile.

## Observação de implementação

Manter a alteração localizada em `src/views/categoriesView.js` e
`public/css/styles.css`, se possível. Se a view já tiver helper ou padrão local
para renderizar elementos da categoria, reutilizar esse padrão.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- Foi adicionado um helper local em `src/views/categoriesView.js` para renderizar
  o nome da categoria com uma bolinha de cor antes do texto.
- A cor usada no `style` da bolinha passou por validação simples de hexadecimal
  no formato `#RRGGBB`, com fallback para `#0f766e`.
- A bolinha recebeu tooltip com o valor hexadecimal por meio do atributo
  `title`.
- A mesma apresentacao foi aplicada também na listagem de categorias arquivadas.
- Foram adicionadas classes CSS em `public/css/styles.css` para alinhar a
  bolinha com o texto e manter tamanho proporcional a altura da linha.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-12 14:07
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: criação

---

## Assinatura da LLM

- Data: 2026-07-12 14:12
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
