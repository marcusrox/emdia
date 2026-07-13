# TASK-017 - Configurar densidade das listagens

## Contexto

As listagens de `/entries`, `/accounts` e `/categories` ocupam bastante espaco
vertical, especialmente em telas menores ou quando há muitos registros. O
projeto já possui uma configuração de tamanho de fonte (`font_scale`), mas essa
preferência resolve outro problema: legibilidade.

A necessidade aqui e diferente: permitir visualizar mais linhas e informações na
tela sem necessariamente reduzir o tamanho da fonte.

## Objetivo

Adicionar em Configurações uma preferência de densidade das listagens com três
niveis, permitindo que o usuário escolha entre uma visualização mais espacada ou
mais compacta para tabelas e ações por linha.

## Decisão proposta

Criar uma nova preferência de usuário chamada `list_density`, com três valores:

- `comfortable`: confortavel;
- `standard`: padrão;
- `compact`: compacta.

Aplicar a preferência como classe no `<body>`, de forma semelhante a
`font_scale`:

```html
<body class="font-scale-medium list-density-compact">
```

## Escopo

- Adicionar coluna `list_density` em `users`, com valor padrão `standard`.
- Adicionar normalizacao da preferência no model/service de usuário.
- Exibir a preferência em `/settings`.
- Salvar a preferência via `POST /settings`.
- Aplicar a classe de densidade no `<body>` em `src/views/layout.js`.
- Ajustar CSS para os três niveis de densidade.
- Afetar inicialmente listagens/tabelas de:
  - `/entries`;
  - `/accounts`;
  - `/categories`.
- Ajustar altura e espacamento dos botões de ação por linha.
- Preservar tamanho de fonte definido por `font_scale`.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Reduzir tamanho das fontes.
- Compactar formulários de cadastro/edição.
- Alterar dados exibidos nas colunas.
- Ocultar colunas em modo compacto.
- Criar configuração por tela.
- Aplicar densidade em dashboard, cards ou formulários.
- Implementar esta task neste momento.

## Comportamento esperado

- Em `comfortable`, as tabelas ficam mais espacadas, com leitura mais arejada.
- Em `standard`, as tabelas mantem o comportamento visual atual ou muito próximo
  do atual.
- Em `compact`, as tabelas reduzem padding vertical, espacamento interno e
  tamanho dos controles de ação, permitindo visualizar mais registros por tela.
- A configuração escolhida persiste para o usuário.
- A classe de densidade e aplicada em todas as páginas renderizadas pelo layout.
- A preferência de tamanho de fonte continua independente da densidade.

## Sugestao de interface

Na tela `/settings`, incluir uma seção ou campo:

```text
Densidade das listagens

( ) Confortavel
( ) Padrao
( ) Compacta
```

Descrições sugeridas:

- Confortavel: mais espaco entre linhas para leitura tranquila.
- Padrão: equilibrio atual entre leitura e quantidade de informação.
- Compacta: reduz espacos para mostrar mais registros na tela.

## Ajustes CSS sugeridos

Exemplos de áreas afetadas:

- `table th`;
- `table td`;
- `td small`;
- `.status`;
- `.record-actions`;
- `.record-action-button`;
- `.table-wrap`;
- `.panel-heading`, se necessário.

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

## Critérios de aceite

- `/settings` permite escolher entre `Confortavel`, `Padrão` e `Compacta`.
- A escolha e salva no usuário autenticado.
- O valor padrão para usuários existentes e `standard`.
- O `<body>` recebe a classe `list-density-{valor}`.
- `/entries`, `/accounts` e `/categories` refletem visualmente a densidade
  escolhida.
- O modo compacto mostra mais linhas na tela sem reduzir a fonte base.
- O modo confortavel não quebra layout mobile nem tabelas com rolagem
  horizontal.
- A configuração de fonte continua funcionando de forma independente.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/settings`;
- escolher `Confortavel` e salvar;
- conferir `/entries`, `/accounts` e `/categories`;
- escolher `Compacta` e salvar;
- conferir que as mesmas listagens ocupam menos altura;
- alterar também o tamanho da fonte e confirmar que as configurações não entram
  em conflito;
- validar em viewport desktop e mobile.

## Observação de implementação

Seguir o padrão existente de `font_scale`:

- normalizacao em `src/models/User.js`;
- formulário em `src/views/settingsView.js`;
- classe no body em `src/views/layout.js`;
- persistência via `POST /settings` em `src/server.js`;
- coluna adicionada por `ensureColumn` em `src/database/schema.js`.

Evitar refatoracao ampla de CSS. A primeira entrega deve ajustar apenas tokens
de espacamento e altura nas tabelas/listagens já existentes.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- Foi adicionada a coluna `list_density` em `users`, com valor padrão
  `standard`.
- Foi adicionada normalizacao central em `src/models/User.js`.
- A consulta de sessão passou a carregar `list_density`.
- A tela `/settings` passou a exibir três opções de densidade:
  `Confortavel`, `Padrão` e `Compacta`.
- O POST de `/settings` passou a salvar as preferências de interface em conjunto.
- O layout passou a aplicar a classe global `list-density-{valor}` no `<body>`.
- O CSS passou a usar variaveis de densidade para tabelas, status e ações por
  linha, criando um padrão reutilizável para futuras listagens.
- O modo compacto reduz espacamento vertical sem reduzir a fonte base.
- O controle de release foi atualizado para registrar a entrega da task.

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: criação

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
