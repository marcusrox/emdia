# TASK-013 - Padronizar ações de listagens com ícones

## Contexto

A tela de Lançamentos (`/entries`) apresenta uma coluna `Ações` em cada linha da
tabela. Hoje, as ações aparecem como textos (`Editar`, `Duplicar`, `Cancelar`)
misturando links e botões de formulário.

O usuário solicitou que essas ações passem a ser representadas por ícones e que
esse seja o padrão para listagens de registros com ações no EmDia.

## Objetivo

Padronizar a apresentacao de ações por registro em listagens usando botões ou
links iconograficos, compactos, acessiveis e reutilizáveis.

## Padronizacao proposta

- Criar um padrão visual para celulas de ações em tabelas/listagens.
- Adotar `lucide-static` como fonte padrão de ícones do EmDia.
- Centralizar o carregamento dos SVGs Lucide em helper reutilizável, evitando
  SVGs avulsos diretamente nas views.
- Usar ícones para ações por registro, com `title` e `aria-label` em português.
- Manter o texto da coluna como `Ações`, mas renderizar os itens internos como
  botões/links de ícone.
- Usar tamanho fixo para os controles, evitando mudanca de largura da tabela.
- Manter diferença visual por intencao:
  - editar: ação primária/neutra;
  - duplicar: ação secundária/neutra;
  - cancelar: ação destrutiva ou de alerta, sem exagero visual.
- Preservar semântica HTML:
  - `Editar` continua como link `GET`;
  - `Duplicar` continua como formulário `POST`;
  - `Cancelar` continua como formulário `POST`.
- Preservar CSRF nos formulários de ações.
- Evitar texto visível dentro dos controles quando houver ícone e rótulo
  acessivel.

## Escopo

- Atualizar a coluna de ações da tabela de `/entries`.
- Substituir os textos `Editar`, `Duplicar` e `Cancelar` por ícones.
- Adicionar classes CSS reutilizáveis para ações de listagem.
- Garantir que links e botões tenham dimensoes, alinhamento e foco consistentes.
- Garantir que os ícones funcionem em desktop e mobile.
- Documentar o padrão para futuras listagens de registros.
- Manter mensagens e textos acessiveis em português.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Alterar regras de negocio de Lançamentos.
- Alterar rotas, models, schema, seed ou persistência.
- Alterar comportamento de edição, duplicacao ou cancelamento.
- Criar novas ações por registro.
- Implementar CRUD completo de Contas ou Categorias.
- Migrar outras áreas do sistema para ícones nesta etapa.
- Redesenhar a tabela inteira de Lançamentos.
- Implementar esta task neste momento.

## Varredura realizada

Usos de ações por registro encontrados:

- `src/views/entriesView.js`: `entriesTable` renderiza a coluna `Ações` com:
  - link textual `Editar`;
  - formulário `POST` textual `Duplicar`;
  - formulário `POST` textual `Cancelar`.
- `public/css/styles.css`: existe uma classe global `.actions`, hoje usada para
  alinhar links e formulários dessa coluna.

Listagens relacionadas sem ações por registro no estado atual:

- `src/views/accountsView.js`: a tabela de Contas lista dados, mas não possui
  coluna de ações por linha.
- `src/views/categoriesView.js`: a tabela de Categorias lista dados, mas não
  possui coluna de ações por linha.

## Comportamento esperado

- Em `/entries`, cada linha passa a exibir três controles compactos com ícones:
  editar, duplicar e cancelar.
- O usuário consegue identificar a ação ao passar o mouse ou navegar com leitor
  de tela por meio de `title` e `aria-label`.
- Os botões de duplicar e cancelar continuam submetendo por `POST` com CSRF.
- O link de editar continua navegando para `/entries/:id/edit`.
- A coluna de ações fica mais compacta e alinhada.
- O foco de teclado fica visível em cada controle.
- Em telas pequenas, os controles permanecem clicaveis sem quebrar a tabela.

## Critérios de aceite

- A coluna `Ações` de `/entries` não exibe mais os textos `Editar`,
  `Duplicar` e `Cancelar` dentro dos controles.
- Cada ação possui ícone visível e rótulo acessivel.
- `Editar` continua abrindo a tela de edição do lançamento.
- `Duplicar` continua duplicando o lançamento via `POST`.
- `Cancelar` continua cancelando o lançamento via `POST`.
- Os formulários de `Duplicar` e `Cancelar` preservam CSRF.
- O visual das ações fica padronizado por classes reutilizáveis.
- O estilo não interfere nos botões de formulário (`form-actions`) nem nos
  controles da barra de competência (`month-actions`).
- `npm run check` passa após a implementação.
- Validação visual manual confirma o comportamento em desktop e mobile.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/entries`;
- confirmar que a coluna `Ações` usa ícones em todas as linhas;
- passar o mouse sobre cada ícone e conferir o rótulo da ação;
- navegar por teclado até os controles e conferir foco visível;
- clicar em editar e confirmar abertura da tela de edição;
- duplicar um lançamento e confirmar que a ação continua funcionando;
- cancelar um lançamento elegivel e confirmar que a ação continua funcionando;
- validar a tabela em viewport mobile.

## Observação de implementação

O projeto deve adotar o pacote `lucide-static` como fonte leve de ícones para
permitir reutilizacao futura em outras telas sem depender de CDN. A
implementação deve centralizar o carregamento dos SVGs, manter rótulos
acessiveis completos e usar classes especificas como `record-actions`,
`record-action-button` e tons por ação, evitando ampliar o significado atual de
`.actions` além do necessário.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- A coluna `Ações` de `/entries` passou a renderizar controles iconograficos.
- Foi adicionado o pacote `lucide-static` como dependência npm leve de ícones.
- Foi criado o helper `lucideIcon` em `src/services/viewHelpers.js` para
  carregar SVGs do pacote com cache em memoria.
- Os ícones de editar, duplicar e cancelar passaram a usar SVGs do Lucide.
- A documentacao do projeto foi atualizada para definir Lucide como padrão de
  iconografia da interface.
- `Editar` continua como link `GET` para a tela de edição.
- `Duplicar` e `Cancelar` continuam como formulários `POST` com CSRF.
- Foram criadas classes reutilizáveis `record-actions`,
  `record-action-form` e `record-action-button`.
- O tom `danger` foi aplicado ao cancelamento.
- `package.json` e `package-lock.json` foram atualizados com a nova
  dependência.
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

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
