# TASK-040 - Adicionar ícones aos cabeçalhos das páginas

## Contexto

As telas internas do EmDia usam o helper `pageHeading` para apresentar eyebrow,
título, descrição e ações da página. Dashboard e Lançamentos também chegam a
esse componente por meio de `monthSwitcher`.

Esse bloco textual identifica a função da tela, mas atualmente não possui um
elemento visual que ajude o usuário a reconhecer rapidamente o contexto. Parte
das páginas já ganhou ícones no menu do usuário na TASK-039; nesses casos, o
cabeçalho deve reutilizar o mesmo ícone para manter consistência entre
navegação e conteúdo.

## Objetivo

Adicionar um ícone representativo à esquerda do bloco de textos de cada
`page-heading`, abrangendo eyebrow, título e descrição, sem alterar a hierarquia
semântica, as ações do cabeçalho ou a responsividade existente.

O componente deve continuar genérico: cada view informa o nome do ícone Lucide
adequado e o helper cuida da marcação comum.

## Estrutura visual esperada

Adotar uma estrutura equivalente a:

```html
<section class="page-heading page-heading-with-actions">
  <div class="page-heading-main">
    <span class="page-heading-icon" aria-hidden="true">
      <!-- SVG do lucide-static -->
    </span>
    <div class="page-heading-content">
      <span class="eyebrow">Financeiro</span>
      <h1>Lançamentos</h1>
      <p>Competência: julho de 2026</p>
    </div>
  </div>
  <div class="page-heading-actions">
    <!-- ações específicas da página -->
  </div>
</section>
```

O nome das novas classes pode variar, desde que preserve uma separação clara
entre ícone, conteúdo textual e ações.

## Contrato do helper

Evoluir `pageHeading` com uma propriedade opcional `icon`:

```js
pageHeading({
  eyebrow,
  title,
  description,
  icon,
  actions,
  className,
})
```

Regras:

- `icon` recebe somente o nome de um ícone disponível no `lucide-static`;
- quando informado, o helper renderiza o SVG com `lucideIcon` à esquerda do
  bloco textual;
- quando ausente, o helper mantém uma renderização válida sem espaço vazio;
- `pageHeading` não deve decidir o ícone a partir de título, rota ou conteúdo;
- a view chamadora continua responsável pela escolha semântica;
- eyebrow, título, descrição, classes e ações continuam tratados como hoje;
- dados textuais dinâmicos continuam escapados com `escapeHtml`.

Evoluir `monthSwitcher` para receber e repassar `icon` ao `pageHeading`, sem
duplicar marcação ou lógica visual.

## Mapeamento de ícones

Usar os seguintes nomes do `lucide-static`, validando sua disponibilidade na
versão instalada:

| Tela ou contexto | Ícone | Observação |
| --- | --- | --- |
| Dashboard | `layout-dashboard` | Visão geral financeira |
| Lançamentos, novo, edição e detalhe | `receipt-text` | Mesma identidade em todo o fluxo |
| Recorrências, nova e edição | `repeat-2` | Regra financeira repetitiva |
| Contas, edição e arquivadas | `wallet-cards` | Conta financeira |
| Categorias, edição e arquivadas | `tags` | Classificação dos lançamentos |
| Perfil | `user-round` | Mesmo ícone do menu do usuário |
| Configurações | `settings` | Mesmo ícone do menu do usuário |
| Auditoria | `clipboard-list` | Mesmo ícone do menu do usuário |
| Usuários, novo e edição | `users` | Mesmo ícone do menu administrativo |
| Fila de notificações | `bell` | Mesmo ícone do menu administrativo |
| Logs operacionais | `file-text` | Mesmo ícone do menu administrativo |
| Ambiente de execução | `server` | Mesmo ícone do menu administrativo |
| Página não encontrada | `circle-alert` | Estado de erro 404 |

Caso um ícone ainda não exista na versão instalada, usar o equivalente
semanticamente mais próximo disponível. Não criar SVG avulso nem instalar nova
dependência.

## Escopo

- Atualizar `src/services/viewHelpers.js` para aceitar e renderizar `icon` em
  `pageHeading`.
- Atualizar `src/views/layout.js` para repassar o ícone por `monthSwitcher`.
- Informar o ícone correspondente em todas as views internas que usam
  `pageHeading` ou `monthSwitcher`.
- Atualizar `public/css/styles.css` com o layout do ícone e do conteúdo textual.
- Preservar cabeçalhos simples, mensais e com ações.
- Preservar o contrato atual para chamadas sem ícone.
- Atualizar `docs/patterns.md` caso o novo parâmetro passe a integrar o padrão
  documentado de cabeçalhos.
- Atualizar o controle de release ao concluir a implementação.

## Diretrizes visuais

- Posicionar o ícone à esquerda do conjunto formado por eyebrow, `h1` e
  descrição, não ao lado de apenas uma linha isolada.
- Alinhar o ícone ao início do conteúdo para que títulos ou descrições com mais
  de uma linha permaneçam organizados.
- Usar tamanho uniforme entre páginas equivalentes.
- Aplicar cor coerente com a identidade visual atual, com contraste suficiente
  e sem competir com o `h1`.
- Manter distância clara entre ícone e texto.
- Não alterar posição, tamanho ou comportamento de
  `.page-heading-actions`.
- Não criar espaço reservado quando o cabeçalho não receber ícone.
- Evitar que ícones encolham, deformem ou sejam cortados em títulos longos.
- Preservar a preferência de escala de fonte do usuário.

## Responsividade

Em telas largas:

- ícone e bloco textual ficam juntos à esquerda;
- ações permanecem alinhadas à direita conforme o padrão atual;
- títulos longos não devem empurrar ações para fora da viewport.

Em telas estreitas:

- o conjunto de ícone e textos permanece legível quando o cabeçalho quebra para
  coluna;
- ações continuam ocupando a largura disponível conforme as regras existentes;
- o ícone pode ter tamanho discretamente reduzido se necessário;
- não deve existir overflow horizontal, sobreposição ou truncamento indevido.

## Semântica e acessibilidade

- Manter exatamente um `h1` por página.
- O texto continua sendo a identificação principal da tela.
- O ícone é complementar e decorativo, com `aria-hidden="true"` e sem receber
  foco.
- Não adicionar rótulo redundante ao SVG.
- Não depender somente do ícone para comunicar a função da página.
- Preservar ordem de leitura lógica: contexto, título, descrição e ações.
- Preservar foco, nomes acessíveis e semântica das ações do cabeçalho.

## Fora do escopo

- Adicionar ícones ao menu principal nesta task.
- Alterar textos de eyebrow, títulos ou descrições.
- Alterar rotas, permissões ou regras financeiras.
- Redesenhar botões ou ações do cabeçalho.
- Adicionar animações aos ícones.
- Usar emojis, imagens rasterizadas ou SVGs avulsos.
- Modificar cabeçalhos da tela de login ou outros componentes que não usam
  `pageHeading`.
- Implementar esta task neste momento.

## Critérios de aceite

- Toda tela interna baseada em `pageHeading` exibe um ícone representativo à
  esquerda do bloco textual.
- Dashboard e Lançamentos recebem o ícone por meio de `monthSwitcher`.
- Telas já presentes no menu reutilizam exatamente o mesmo ícone definido na
  navegação.
- Fluxos de listagem, criação, edição, detalhe e itens arquivados mantêm uma
  identidade visual coerente com sua entidade.
- Página 404 usa um ícone adequado ao estado de erro.
- Ícones são fornecidos por `lucide-static` e renderizados com `lucideIcon`.
- Nenhuma dependência ou SVG avulso é adicionado.
- Cabeçalhos continuam contendo exatamente um `h1`.
- Eyebrow, título e descrição mantêm os textos atuais.
- Ações e navegação mensal continuam funcionando e ocupando sua área atual.
- Cabeçalhos sem ações e com ações continuam alinhados corretamente.
- Nenhum espaço vazio aparece quando `icon` não é informado.
- Desktop e mobile não apresentam overflow, corte ou sobreposição.
- Ícones decorativos não entram na árvore de acessibilidade nem recebem foco.
- Preferências de escala de fonte continuam sendo respeitadas.
- `npm run check` passa.

## Validação sugerida

Validação sintática:

```powershell
npm run check
```

Validação estrutural:

- renderizar uma página simples, uma mensal e uma com ações;
- confirmar que o SVG está dentro do agrupamento visual à esquerda do texto;
- confirmar que existe exatamente um `h1` em cada resultado;
- confirmar `aria-hidden="true"` e ausência de foco no ícone;
- renderizar `pageHeading` sem `icon` e confirmar ausência de contêiner vazio;
- conferir que ações e competência continuam presentes e inalteradas.

Validação funcional em servidor próprio, usando `PORT=3100` ou a próxima porta
livre:

- acessar ao menos `/dashboard`, `/entries`, `/recurrences`, `/accounts`,
  `/categories`, `/profile`, `/settings` e `/audit`;
- com usuário administrador, acessar `/admin/users`, `/admin/notifications`,
  `/operational-logs` e `/runtime-environment`;
- abrir formulários, detalhes e páginas de arquivados disponíveis;
- acessar uma rota inexistente e verificar o cabeçalho 404;
- nunca iniciar, reutilizar ou encerrar processos na porta 3000.

Validação visual:

- testar desktop e mobile com títulos curtos e longos;
- testar cabeçalhos com e sem descrição;
- testar cabeçalhos com ações simples e navegação mensal;
- comparar Perfil, Configurações, Auditoria e telas administrativas com seus
  respectivos ícones no menu;
- testar as escalas de fonte disponíveis;
- confirmar alinhamento, contraste, espaçamento e ausência de overflow.

## Observações de implementação

Preferir uma alteração pequena no helper comum em vez de repetir a estrutura do
ícone em cada view. As views devem informar somente o nome do ícone. O helper
`lucideIcon` já produz SVG decorativo com `aria-hidden="true"` e
`focusable="false"`.

Antes de implementar, validar todos os nomes da tabela dentro de
`node_modules/lucide-static/icons`. O CSS deve tratar o ícone como item de
tamanho fixo e o conteúdo textual como `min-width: 0`, evitando overflow em
layouts com ações.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 17/07/2026 23:14
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

## Implementação

- `pageHeading` passou a aceitar `icon` e a renderizar o ícone decorativo à
  esquerda do bloco de eyebrow, título e descrição;
- `monthSwitcher` passou a receber e repassar o ícone ao helper comum;
- todas as telas internas, formulários, detalhes, arquivados e a página 404
  receberam o ícone definido no mapeamento;
- Perfil, Configurações, Auditoria e páginas administrativas reutilizam os
  mesmos ícones do menu do usuário;
- o CSS passou a manter ícone e conteúdo textual agrupados sem interferir nas
  ações do cabeçalho;
- o padrão do projeto foi atualizado com o novo contrato;
- o controle de release foi atualizado para a sequência 048;
- `npm run check`, a validação estrutural do helper e do cabeçalho mensal e
  `git diff --check` passaram.

---

## Assinatura da LLM

- Data: 17/07/2026 23:17
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao

## Ajuste visual posterior

- removida a borda dos ícones dos cabeçalhos;
- ampliado o contêiner de `40px` para `44px`;
- ampliado o SVG de `21px` para `24px`;
- preservados o fundo suave, a cor, o alinhamento e a responsividade;
- atualizado o controle de release para a sequência 049.

---

## Assinatura da LLM

- Data: 17/07/2026 23:20
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
