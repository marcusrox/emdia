# TASK-034 - Padronizar cabeçalhos das páginas internas

## Contexto

As páginas internas do EmDia usam estruturas diferentes para apresentar seu
cabeçalho principal:

- cadastros, formulários, configurações, auditoria e logs usam
  `<section class="page-heading">`;
- dashboard e listagem de lançamentos usam o helper `monthSwitcher`, que
  renderiza `<section class="monthbar">`;
- o detalhe de lançamento usa `<section class="entry-detail-header">`;
- algumas páginas combinam o cabeçalho com ações, enquanto outras mantêm as
  ações em blocos separados.

`page-heading` e `monthbar` já compartilham parte dos estilos, como divisor,
tipografia do `h1` e eyebrow, mas divergem no layout: o primeiro usa grid e o
segundo usa flex para acomodar a navegação mensal. Essa diferença tornou o
mesmo conceito visual dependente de classes e marcações específicas de cada
tela.

Além disso, nas páginas mensais o `h1` atual contém apenas o nome do mês. Isso
deixa a identidade da página, como "Dashboard" ou "Lançamentos", somente no
título do documento e na navegação, enquanto o conteúdo principal deveria ter
um `h1` que identificasse a função da tela.

## Objetivo

Fazer todas as páginas internas renderizadas pelo layout autenticado usarem um
cabeçalho principal baseado na classe `page-heading`, com estrutura,
tipografia, espaçamento, responsividade e semântica consistentes.

O cabeçalho deve aceitar variações controladas para descrição, metadados e
ações. Nas páginas mensais, os controles de competência devem ficar dentro do
mesmo componente visual, sem deixar de exibir de forma explícita o mês
selecionado.

## Estrutura visual comum

Adotar como base uma estrutura equivalente a:

```html
<section class="page-heading page-heading-with-actions">
  <div class="page-heading-content">
    <span class="eyebrow">Financeiro</span>
    <h1>Lançamentos</h1>
    <p>Competência: julho de 2026</p>
  </div>
  <div class="page-heading-actions">
    <!-- ações específicas da página -->
  </div>
</section>
```

Regras:

- toda página interna deve ter exatamente um `h1` visível;
- o `h1` deve identificar a página, e não apenas seu estado, filtro ou mês;
- `eyebrow` fornece contexto curto e não substitui o título;
- descrição ou metadado é opcional;
- o bloco de ações é opcional;
- ações devem usar os helpers e ícones já existentes;
- dados dinâmicos devem continuar escapados com `escapeHtml`;
- não usar apenas cor para comunicar estado ou contexto.

## Variações do componente

### Cabeçalho simples

Para perfil, configurações, formulários e páginas sem ações no topo:

```html
<section class="page-heading">
  <div class="page-heading-content">
    <span class="eyebrow">Preferências</span>
    <h1>Configurações</h1>
    <p>Ajustes individuais da sua interface no EmDia.</p>
  </div>
</section>
```

### Cabeçalho com ações

Usar `page-heading-with-actions` e `page-heading-actions` quando houver botões,
navegação, atualização ou outras ações diretamente relacionadas à página.

### Cabeçalho mensal

Dashboard e lançamentos devem usar o mesmo cabeçalho comum:

- dashboard: `h1` "Dashboard";
- lançamentos: `h1` "Lançamentos";
- competência atual exibida em texto visível, por exemplo
  "Competência: julho de 2026";
- mês anterior, seletor de mês, próximo mês e retorno ao mês atual dentro de
  `page-heading-actions`;
- troca manual de competência deve continuar explícita na URL e na interface;
- preservar o formato `YYYY-MM` e o cálculo do mês atual no fuso do usuário.

### Cabeçalho de detalhe

O detalhe de lançamento deve adotar `page-heading` sem perder:

- descrição do lançamento como `h1`;
- eyebrow que identifica o tipo ou contexto;
- status e demais indicadores relevantes;
- ações de editar, duplicar, excluir ou voltar;
- comportamento responsivo atual.

Classes específicas podem permanecer como modificadores, desde que a section
principal também use `page-heading` e os estilos comuns não sejam duplicados.

## Helper de renderização

Criar um helper reutilizável para evitar marcação repetida nas views. O helper
pode ficar em `src/services/viewHelpers.js` ou em módulo de view diretamente
relacionado, seguindo a arquitetura atual.

Contrato sugerido:

```js
pageHeading({
  eyebrow,
  title,
  description,
  actions,
  className,
})
```

Requisitos do helper:

- escapar `eyebrow`, `title` e `description`;
- aceitar HTML de ações produzido somente por helpers internos confiáveis;
- adicionar `page-heading-with-actions` apenas quando houver ações;
- permitir modificador específico sem substituir `page-heading`;
- não conhecer regras de competência ou de negócio.

O helper de navegação mensal pode continuar separado, mas deve produzir apenas
o conteúdo de `page-heading-actions` ou compor o helper comum. Não manter um
segundo componente visual concorrente chamado `monthbar`.

## Páginas no escopo

Padronizar todas as páginas internas renderizadas por `layout.js`:

- dashboard;
- listagem de lançamentos;
- criação e edição de lançamento;
- detalhe de lançamento;
- listagem de recorrências;
- criação e edição de recorrência;
- contas ativas, edição e arquivadas;
- categorias ativas, edição e arquivadas;
- perfil;
- configurações;
- auditoria funcional;
- logs operacionais;
- página interna de erro/não encontrado.

Se outra view autenticada for encontrada durante a implementação, ela também
deve adotar o componente comum.

## Escopo técnico

- Criar o helper comum de cabeçalho.
- Refatorar `monthSwitcher` para compor o cabeçalho comum ou substituí-lo por
  um helper de ações mensais.
- Ajustar `dashboardView.js` e `entriesView.js` para títulos semânticos e
  competência visível.
- Migrar as demais views internas para o helper comum.
- Integrar o cabeçalho especial do detalhe de lançamento à estrutura padrão.
- Ajustar `public/css/styles.css` para uma classe base e modificadores claros.
- Remover seletores duplicados entre `.monthbar` e `.page-heading`.
- Remover `.monthbar` quando não houver mais uso; não manter classe morta.
- Preservar as classes específicas apenas quando acrescentarem comportamento
  real, como layout do detalhe ou atualização dos logs.
- Atualizar `docs/patterns.md` com o padrão de cabeçalho das views.
- Atualizar `docs/architecture.md` se a responsabilidade dos helpers de view
  mudar.
- Atualizar o controle de release ao concluir a implementação.

## CSS e responsividade

A classe base `page-heading` deve concentrar:

- fundo transparente;
- divisor inferior;
- espaçamento vertical e inferior;
- tipografia de eyebrow, `h1` e descrição;
- largura mínima segura para conteúdo dinâmico.

O modificador com ações deve:

- usar layout horizontal em telas largas;
- manter conteúdo e ações alinhados sem comprimir o título;
- quebrar para coluna em telas estreitas;
- permitir que seletores, botões e links ocupem largura adequada no mobile;
- evitar overflow horizontal em títulos longos e ações mensais.

Não alterar a escala tipográfica global nem redesenhar painéis, toolbars ou
formulários fora do necessário para o cabeçalho.

## Semântica e acessibilidade

- Manter exatamente um `h1` por página interna.
- Usar `section` com título identificável pelo `h1`.
- Preservar `aria-label` do seletor de competência.
- Links de mês anterior e próximo devem manter nomes acessíveis, inclusive se
  exibirem apenas ícones.
- A ordem no DOM deve ser conteúdo do cabeçalho antes das ações.
- No mobile, a ordem visual deve acompanhar a ordem semântica.
- Descrições não devem repetir o título sem acrescentar contexto.
- Status do detalhe deve permanecer legível por tecnologia assistiva.

## Compatibilidade funcional

A padronização é visual e estrutural. Ela não pode alterar:

- filtros ou parâmetros já presentes nas URLs;
- competência selecionada;
- navegação para mês anterior, próximo e atual;
- submissão automática do seletor de competência;
- dados financeiros, status ou valores exibidos;
- ações e permissões disponíveis em cada página;
- persistência de filtros ou seções abertas;
- rotas GET ou POST existentes.

Ao navegar mensalmente em uma tela com filtros adicionais, preservar os
parâmetros relevantes conforme o comportamento vigente ou registrar uma
correção separada se o fluxo atual já os descartar.

## Fora do escopo

- Alterar a página pública de login, que usa layout e identidade próprios.
- Redesenhar a navegação superior global.
- Alterar regras de negócio, banco de dados ou models financeiros.
- Criar breadcrumbs completos para todo o sistema.
- Criar um design system externo ou adicionar dependências.
- Trocar a stack de views JavaScript por template engine.
- Redesenhar toolbars, tabelas, formulários ou cards além do encaixe necessário
  com o novo cabeçalho.
- Implementar esta task neste momento.

## Critérios de aceite

- Toda página interna renderiza uma section principal com `page-heading`.
- Toda página interna possui exatamente um `h1` visível e semanticamente
  relacionado à página.
- Dashboard exibe `Dashboard` como `h1` e a competência selecionada em texto.
- Lançamentos exibe `Lançamentos` como `h1` e a competência selecionada em
  texto.
- Controles mensais permanecem no cabeçalho e continuam funcionando.
- Mês anterior, próximo mês, seletor e retorno ao mês atual são preservados.
- Formulários de criação e edição usam o mesmo componente de cabeçalho.
- Contas e categorias ativas e arquivadas usam o mesmo componente.
- Recorrências, perfil, configurações, auditoria e logs usam o helper comum.
- O detalhe de lançamento mantém indicadores e ações com a classe base comum.
- A página interna 404 segue o padrão.
- A página de login não é alterada.
- Não restam usos de `.monthbar` em HTML ou CSS.
- Não há duplicação relevante de markup de cabeçalho nas views migradas.
- Títulos, descrições e dados dinâmicos permanecem escapados.
- O layout não apresenta overflow horizontal em desktop ou mobile.
- `npm run check` passa.

## Validação sugerida

Validação sintática:

```powershell
npm run check
```

Validação estrutural por renderização:

- renderizar cada view interna com dados controlados;
- confirmar uma ocorrência de `page-heading` e uma de `<h1` por documento;
- confirmar ausência de `monthbar`;
- confirmar que títulos dinâmicos são escapados;
- confirmar presença das ações esperadas em cada página.

Validação HTTP própria, usando `PORT=3100` ou a próxima porta livre:

- `GET /health`;
- `GET /dashboard`;
- `GET /entries`;
- `GET /entries/new`;
- `GET /entries/:id` com registro temporário;
- `GET /recurrences` e formulário correspondente;
- `GET /accounts` e `/accounts/deleted`;
- `GET /categories` e `/categories/deleted`;
- `GET /profile`;
- `GET /settings`;
- `GET /audit`;
- `GET /operational-logs`;
- rota inexistente para validar a página 404;
- nunca usar, reutilizar ou encerrar processo na porta 3000.

Validação visual em desktop e mobile:

- comparar alinhamento, divisor, espaçamento e tipografia entre todas as telas;
- testar título curto e título dinâmico longo;
- testar cabeçalho simples, com ações, mensal e de detalhe;
- confirmar quebra para coluna e ausência de overflow em largura reduzida;
- confirmar que a competência permanece explícita e fácil de alterar.

## Observações de implementação

Evitar uma substituição mecânica que apenas acrescente `page-heading` à mesma
section de `monthbar`: as duas classes atuais possuem regras de `display`
conflitantes. Primeiro consolidar a base CSS e criar o modificador com ações;
depois migrar as views e remover o estilo legado.

Preferir um helper pequeno e previsível. O conteúdo textual deve ser escapado
no helper, enquanto ações devem ser construídas pelos helpers existentes, como
`buttonLink`, `buttonContent` e `lucideIcon`.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 16/07/2026 23:29
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

## Implementação

- Foi criado `pageHeading` em `src/services/viewHelpers.js`, com escape de
  eyebrow, título e descrição e suporte a ações internas e modificadores.
- `monthSwitcher` passou a compor o helper comum e deixou de renderizar
  `monthbar`.
- Dashboard e lançamentos agora usam seus nomes como `h1` e exibem a
  competência selecionada na descrição.
- Formulários, detalhe de lançamento, recorrências, contas, categorias,
  perfil, configurações, auditoria, logs e página 404 foram migrados.
- Ações de páginas arquivadas, recorrências, logs e detalhe foram incorporadas
  à variação `page-heading-with-actions`.
- O CSS duplicado de `monthbar`, `page-actions`, cabeçalho de detalhe e logs foi
  consolidado na classe base e em `page-heading-actions`.
- A documentação de padrões e arquitetura foi atualizada.
- Todas as rotas internas validadas apresentaram exatamente um `h1`, uma
  `page-heading`, nenhuma `monthbar` e nenhum overflow horizontal.
- Dashboard e detalhe de lançamento foram validados visualmente em desktop e
  mobile; o navegador não registrou erros.
- `npm run check` e `git diff --check` passaram.
- O servidor temporário usou a porta 3100, foi encerrado pelo PID capturado e
  teve banco e logs temporários removidos.
- O controle de release foi atualizado para a sequência 037.

---

## Assinatura da LLM

- Data: 16/07/2026 23:37
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização
