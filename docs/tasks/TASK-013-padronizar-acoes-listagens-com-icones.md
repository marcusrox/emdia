# TASK-013 - Padronizar acoes de listagens com icones

## Contexto

A tela de Lancamentos (`/entries`) apresenta uma coluna `Acoes` em cada linha da
tabela. Hoje, as acoes aparecem como textos (`Editar`, `Duplicar`, `Cancelar`)
misturando links e botoes de formulario.

O usuario solicitou que essas acoes passem a ser representadas por icones e que
esse seja o padrao para listagens de registros com acoes no EmDia.

## Objetivo

Padronizar a apresentacao de acoes por registro em listagens usando botoes ou
links iconograficos, compactos, acessiveis e reutilizaveis.

## Padronizacao proposta

- Criar um padrao visual para celulas de acoes em tabelas/listagens.
- Adotar `lucide-static` como fonte padrao de icones do EmDia.
- Centralizar o carregamento dos SVGs Lucide em helper reutilizavel, evitando
  SVGs avulsos diretamente nas views.
- Usar icones para acoes por registro, com `title` e `aria-label` em portugues.
- Manter o texto da coluna como `Acoes`, mas renderizar os itens internos como
  botoes/links de icone.
- Usar tamanho fixo para os controles, evitando mudanca de largura da tabela.
- Manter diferenca visual por intencao:
  - editar: acao primaria/neutra;
  - duplicar: acao secundaria/neutra;
  - cancelar: acao destrutiva ou de alerta, sem exagero visual.
- Preservar semantica HTML:
  - `Editar` continua como link `GET`;
  - `Duplicar` continua como formulario `POST`;
  - `Cancelar` continua como formulario `POST`.
- Preservar CSRF nos formularios de acoes.
- Evitar texto visivel dentro dos controles quando houver icone e rotulo
  acessivel.

## Escopo

- Atualizar a coluna de acoes da tabela de `/entries`.
- Substituir os textos `Editar`, `Duplicar` e `Cancelar` por icones.
- Adicionar classes CSS reutilizaveis para acoes de listagem.
- Garantir que links e botoes tenham dimensoes, alinhamento e foco consistentes.
- Garantir que os icones funcionem em desktop e mobile.
- Documentar o padrao para futuras listagens de registros.
- Manter mensagens e textos acessiveis em portugues.
- Atualizar o controle de release ao concluir a implementacao.

## Fora do escopo

- Alterar regras de negocio de Lancamentos.
- Alterar rotas, models, schema, seed ou persistencia.
- Alterar comportamento de edicao, duplicacao ou cancelamento.
- Criar novas acoes por registro.
- Implementar CRUD completo de Contas ou Categorias.
- Migrar outras areas do sistema para icones nesta etapa.
- Redesenhar a tabela inteira de Lancamentos.
- Implementar esta task neste momento.

## Varredura realizada

Usos de acoes por registro encontrados:

- `src/views/entriesView.js`: `entriesTable` renderiza a coluna `Acoes` com:
  - link textual `Editar`;
  - formulario `POST` textual `Duplicar`;
  - formulario `POST` textual `Cancelar`.
- `public/css/styles.css`: existe uma classe global `.actions`, hoje usada para
  alinhar links e formularios dessa coluna.

Listagens relacionadas sem acoes por registro no estado atual:

- `src/views/accountsView.js`: a tabela de Contas lista dados, mas nao possui
  coluna de acoes por linha.
- `src/views/categoriesView.js`: a tabela de Categorias lista dados, mas nao
  possui coluna de acoes por linha.

## Comportamento esperado

- Em `/entries`, cada linha passa a exibir tres controles compactos com icones:
  editar, duplicar e cancelar.
- O usuario consegue identificar a acao ao passar o mouse ou navegar com leitor
  de tela por meio de `title` e `aria-label`.
- Os botoes de duplicar e cancelar continuam submetendo por `POST` com CSRF.
- O link de editar continua navegando para `/entries/:id/edit`.
- A coluna de acoes fica mais compacta e alinhada.
- O foco de teclado fica visivel em cada controle.
- Em telas pequenas, os controles permanecem clicaveis sem quebrar a tabela.

## Criterios de aceite

- A coluna `Acoes` de `/entries` nao exibe mais os textos `Editar`,
  `Duplicar` e `Cancelar` dentro dos controles.
- Cada acao possui icone visivel e rotulo acessivel.
- `Editar` continua abrindo a tela de edicao do lancamento.
- `Duplicar` continua duplicando o lancamento via `POST`.
- `Cancelar` continua cancelando o lancamento via `POST`.
- Os formularios de `Duplicar` e `Cancelar` preservam CSRF.
- O visual das acoes fica padronizado por classes reutilizaveis.
- O estilo nao interfere nos botoes de formulario (`form-actions`) nem nos
  controles da barra de competencia (`month-actions`).
- `npm run check` passa apos a implementacao.
- Validacao visual manual confirma o comportamento em desktop e mobile.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/entries`;
- confirmar que a coluna `Acoes` usa icones em todas as linhas;
- passar o mouse sobre cada icone e conferir o rotulo da acao;
- navegar por teclado ate os controles e conferir foco visivel;
- clicar em editar e confirmar abertura da tela de edicao;
- duplicar um lancamento e confirmar que a acao continua funcionando;
- cancelar um lancamento elegivel e confirmar que a acao continua funcionando;
- validar a tabela em viewport mobile.

## Observacao de implementacao

O projeto deve adotar o pacote `lucide-static` como fonte leve de icones para
permitir reutilizacao futura em outras telas sem depender de CDN. A
implementacao deve centralizar o carregamento dos SVGs, manter rotulos
acessiveis completos e usar classes especificas como `record-actions`,
`record-action-button` e tons por acao, evitando ampliar o significado atual de
`.actions` alem do necessario.

Ao concluir a implementacao, atualizar o controle de release em
`src/config/release.js`, incrementando o numero sequencial em 1.

## Implementacao

- A coluna `Acoes` de `/entries` passou a renderizar controles iconograficos.
- Foi adicionado o pacote `lucide-static` como dependencia npm leve de icones.
- Foi criado o helper `lucideIcon` em `src/services/viewHelpers.js` para
  carregar SVGs do pacote com cache em memoria.
- Os icones de editar, duplicar e cancelar passaram a usar SVGs do Lucide.
- A documentacao do projeto foi atualizada para definir Lucide como padrao de
  iconografia da interface.
- `Editar` continua como link `GET` para a tela de edicao.
- `Duplicar` e `Cancelar` continuam como formularios `POST` com CSRF.
- Foram criadas classes reutilizaveis `record-actions`,
  `record-action-form` e `record-action-button`.
- O tom `danger` foi aplicado ao cancelamento.
- `package.json` e `package-lock.json` foram atualizados com a nova
  dependencia.
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

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao

---

## Assinatura da LLM

- Data: 2026-07-12
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
