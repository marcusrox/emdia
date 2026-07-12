# TASK-017 - Configurar densidade das listagens

## Contexto

As listagens de `/entries`, `/accounts` e `/categories` ocupam bastante espaco
vertical, especialmente em telas menores ou quando ha muitos registros. O
projeto ja possui uma configuracao de tamanho de fonte (`font_scale`), mas essa
preferencia resolve outro problema: legibilidade.

A necessidade aqui e diferente: permitir visualizar mais linhas e informacoes na
tela sem necessariamente reduzir o tamanho da fonte.

## Objetivo

Adicionar em Configuracoes uma preferencia de densidade das listagens com tres
niveis, permitindo que o usuario escolha entre uma visualizacao mais espacada ou
mais compacta para tabelas e acoes por linha.

## Decisao proposta

Criar uma nova preferencia de usuario chamada `list_density`, com tres valores:

- `comfortable`: confortavel;
- `standard`: padrao;
- `compact`: compacta.

Aplicar a preferencia como classe no `<body>`, de forma semelhante a
`font_scale`:

```html
<body class="font-scale-medium list-density-compact">
```

## Escopo

- Adicionar coluna `list_density` em `users`, com valor padrao `standard`.
- Adicionar normalizacao da preferencia no model/service de usuario.
- Exibir a preferencia em `/settings`.
- Salvar a preferencia via `POST /settings`.
- Aplicar a classe de densidade no `<body>` em `src/views/layout.js`.
- Ajustar CSS para os tres niveis de densidade.
- Afetar inicialmente listagens/tabelas de:
  - `/entries`;
  - `/accounts`;
  - `/categories`.
- Ajustar altura e espacamento dos botoes de acao por linha.
- Preservar tamanho de fonte definido por `font_scale`.
- Atualizar o controle de release ao concluir a implementacao.

## Fora do escopo

- Reduzir tamanho das fontes.
- Compactar formularios de cadastro/edicao.
- Alterar dados exibidos nas colunas.
- Ocultar colunas em modo compacto.
- Criar configuracao por tela.
- Aplicar densidade em dashboard, cards ou formularios.
- Implementar esta task neste momento.

## Comportamento esperado

- Em `comfortable`, as tabelas ficam mais espacadas, com leitura mais arejada.
- Em `standard`, as tabelas mantem o comportamento visual atual ou muito proximo
  do atual.
- Em `compact`, as tabelas reduzem padding vertical, espacamento interno e
  tamanho dos controles de acao, permitindo visualizar mais registros por tela.
- A configuracao escolhida persiste para o usuario.
- A classe de densidade e aplicada em todas as paginas renderizadas pelo layout.
- A preferencia de tamanho de fonte continua independente da densidade.

## Sugestao de interface

Na tela `/settings`, incluir uma secao ou campo:

```text
Densidade das listagens

( ) Confortavel
( ) Padrao
( ) Compacta
```

Descricoes sugeridas:

- Confortavel: mais espaco entre linhas para leitura tranquila.
- Padrao: equilibrio atual entre leitura e quantidade de informacao.
- Compacta: reduz espacos para mostrar mais registros na tela.

## Ajustes CSS sugeridos

Exemplos de areas afetadas:

- `table th`;
- `table td`;
- `td small`;
- `.status`;
- `.record-actions`;
- `.record-action-button`;
- `.table-wrap`;
- `.panel-heading`, se necessario.

Exemplo conceitual:

```css
.list-density-compact table th,
.list-density-compact table td {
  padding-block: 7px;
}

.list-density-compact .record-action-button {
  min-height: 30px;
  width: 30px;
}
```

## Criterios de aceite

- `/settings` permite escolher entre `Confortavel`, `Padrao` e `Compacta`.
- A escolha e salva no usuario autenticado.
- O valor padrao para usuarios existentes e `standard`.
- O `<body>` recebe a classe `list-density-{valor}`.
- `/entries`, `/accounts` e `/categories` refletem visualmente a densidade
  escolhida.
- O modo compacto mostra mais linhas na tela sem reduzir a fonte base.
- O modo confortavel nao quebra layout mobile nem tabelas com rolagem
  horizontal.
- A configuracao de fonte continua funcionando de forma independente.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/settings`;
- escolher `Confortavel` e salvar;
- conferir `/entries`, `/accounts` e `/categories`;
- escolher `Compacta` e salvar;
- conferir que as mesmas listagens ocupam menos altura;
- alterar tambem o tamanho da fonte e confirmar que as configuracoes nao entram
  em conflito;
- validar em viewport desktop e mobile.

## Observacao de implementacao

Seguir o padrao existente de `font_scale`:

- normalizacao em `src/models/User.js`;
- formulario em `src/views/settingsView.js`;
- classe no body em `src/views/layout.js`;
- persistencia via `POST /settings` em `src/server.js`;
- coluna adicionada por `ensureColumn` em `src/database/schema.js`.

Evitar refatoracao ampla de CSS. A primeira entrega deve ajustar apenas tokens
de espacamento e altura nas tabelas/listagens ja existentes.

Ao concluir a implementacao, atualizar o controle de release em
`src/config/release.js`, incrementando o numero sequencial em 1.

## Implementacao

- Foi adicionada a coluna `list_density` em `users`, com valor padrao
  `standard`.
- Foi adicionada normalizacao central em `src/models/User.js`.
- A consulta de sessao passou a carregar `list_density`.
- A tela `/settings` passou a exibir tres opcoes de densidade:
  `Confortavel`, `Padrao` e `Compacta`.
- O POST de `/settings` passou a salvar as preferencias de interface em conjunto.
- O layout passou a aplicar a classe global `list-density-{valor}` no `<body>`.
- O CSS passou a usar variaveis de densidade para tabelas, status e acoes por
  linha, criando um padrao reutilizavel para futuras listagens.
- O modo compacto reduz espacamento vertical sem reduzir a fonte base.
- O controle de release foi atualizado para registrar a entrega da task.

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
