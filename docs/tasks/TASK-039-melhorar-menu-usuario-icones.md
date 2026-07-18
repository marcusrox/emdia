# TASK-039 - Melhorar menu do usuário com ícones e hierarquia administrativa

## Contexto

O menu flutuante aberto pelo nome do usuário no topo reúne ações pessoais e,
para administradores, acessos de gestão. Atualmente, apenas o título
`Administração` e a ação `Sair` possuem ícones. Os demais itens são exibidos
somente como texto e os links administrativos usam o mesmo tamanho de fonte das
ações pessoais.

Essa apresentação reduz a diferenciação visual entre as ações da conta e os
recursos administrativos, especialmente quando todos os itens estão visíveis.
O mesmo conteúdo é renderizado nos menus desktop e mobile por `layout.js`.

## Objetivo

Melhorar a leitura e a organização do menu do usuário adicionando ícones Lucide
aos seus itens e tornando a tipografia dos links administrativos menor que a
dos itens pessoais, sem reduzir a área de clique nem prejudicar acessibilidade,
responsividade ou a preferência de escala de fonte do usuário.

## Comportamento esperado

### Ações pessoais

- Adicionar ícone aos itens `Perfil`, `Configurações` e `Auditoria`.
- Manter `Sair` com o ícone atual de logout.
- Preservar o tamanho de fonte atual das ações pessoais.
- Alinhar ícone e texto de forma consistente em links e botão.

Ícones sugeridos do `lucide-static`:

- `Perfil`: `user-round` ou equivalente disponível;
- `Configurações`: `settings`;
- `Auditoria`: `clipboard-list` ou equivalente disponível;
- `Sair`: `log-out`.

### Grupo administrativo

- Manter o separador e o rótulo `Administração` com o ícone
  `shield-check`.
- Adicionar ícone a cada link administrativo.
- Aplicar aos links administrativos uma fonte menor que a usada nas ações
  pessoais, mantendo legibilidade e respeitando a escala de fonte configurada.
- Manter altura e área de clique confortáveis; a redução deve afetar a
  tipografia, não transformar os itens em alvos pequenos.
- Preservar a ordem atual dos links:
  1. `Usuários`;
  2. `Fila de notificações`;
  3. `Logs operacionais`;
  4. `Ambiente de execução`.

Ícones sugeridos:

- `Usuários`: `users`;
- `Fila de notificações`: `bell`;
- `Logs operacionais`: `file-text`;
- `Ambiente de execução`: `server` ou `monitor-cog`.

Caso algum nome não exista na versão instalada de `lucide-static`, usar o
ícone semanticamente mais próximo disponível, sem inserir SVG avulso.

## Escopo

- Ajustar `src/views/layout.js` para renderizar os itens do menu com o helper
  `lucideIcon`.
- Evitar duplicação desnecessária entre as variantes desktop e mobile ao montar
  as ações pessoais, se um helper pequeno e localizado tornar a alteração mais
  segura.
- Ajustar `public/css/styles.css` para alinhar ícones e textos.
- Criar uma regra tipográfica específica para `.admin-menu-link`.
- Preservar rotas, permissões, destaque do item ativo e logout por POST com
  CSRF.
- Aplicar a melhoria nos menus desktop e mobile.
- Atualizar o controle de release ao concluir a implementação.

## Diretrizes visuais

- Ícones devem ter dimensão uniforme e permanecer visualmente secundários ao
  texto.
- Links e botão devem compartilhar alinhamento, espaçamento e estado de hover e
  foco.
- A fonte menor deve ser aplicada apenas aos links do grupo administrativo, não
  ao nome do usuário, às ações pessoais ou ao botão `Sair`.
- O recuo atual dos links administrativos pode ser revisto para acomodar os
  ícones sem criar desalinhamento excessivo.
- Textos longos, como `Fila de notificações` e `Ambiente de execução`, não
  devem ser cortados nem causar overflow horizontal.
- A preferência `font_scale` deve continuar influenciando o menu.

## Semântica e acessibilidade

- Manter os textos visíveis; os ícones não devem substituir os rótulos.
- Tratar os ícones como decorativos conforme o padrão do helper `lucideIcon`.
- Preservar navegação por teclado, foco visível e nomes acessíveis.
- Não depender somente de cor ou ícone para diferenciar itens administrativos.
- Manter `aria-label="Administração"` no agrupamento administrativo.
- Preservar o fechamento e a abertura do elemento `<details>`.

## Fora do escopo

- Alterar as rotas ou a ordem das ações pessoais.
- Adicionar ou remover permissões administrativas.
- Criar novos itens no menu.
- Alterar o conteúdo das páginas acessadas pelos links.
- Redesenhar a barra superior ou a navegação principal.
- Substituir `lucide-static` por outra biblioteca.
- Alterar o comportamento do logout.
- Implementar esta task neste momento.

## Critérios de aceite

- `Perfil`, `Configurações`, `Auditoria` e `Sair` exibem ícones Lucide e texto
  visível.
- Todos os links do grupo `Administração` exibem ícones Lucide e texto visível.
- Os links administrativos usam fonte menor que as ações pessoais.
- A redução da fonte não diminui a área de clique dos itens.
- Ícones e textos ficam alinhados de forma consistente.
- A ordem e os destinos de todos os links permanecem inalterados.
- O grupo administrativo continua visível somente para administradores.
- O item correspondente à página atual continua destacado.
- O logout continua sendo enviado por POST com token CSRF.
- Desktop e mobile apresentam o mesmo conjunto de itens aplicável ao usuário.
- Nenhum texto é truncado ou causa overflow horizontal nas larguras suportadas.
- Navegação por teclado e foco visível continuam funcionando.
- A escala de fonte configurada pelo usuário continua sendo respeitada.
- Nenhum SVG avulso ou nova dependência é introduzido.
- `npm run check` passa.

## Validação sugerida

Validação sintática:

```powershell
npm run check
```

Validação estrutural:

- renderizar o layout para um usuário comum e confirmar ícones nas ações
  pessoais;
- renderizar o layout para um administrador e confirmar ícones nos quatro links
  administrativos;
- confirmar ausência do grupo administrativo para usuário sem `is_admin`;
- verificar que links, formulário de logout, CSRF e classes de item ativo foram
  preservados.

Validação visual:

- abrir o menu pelo nome do usuário em viewport desktop;
- abrir o menu pelo ícone do usuário em viewport mobile;
- comparar o tamanho da fonte pessoal com o dos itens administrativos;
- verificar alinhamento de ícones e textos nos estados normal, hover e foco;
- testar as escalas de fonte disponíveis;
- verificar os textos mais longos sem corte, sobreposição ou overflow.

Validação funcional em servidor próprio, usando `PORT=3100` ou a próxima porta
livre:

- acessar cada item do menu e confirmar o destino esperado;
- confirmar que o item da página atual permanece destacado;
- navegar pelo menu usando teclado;
- testar o logout somente quando apropriado;
- nunca iniciar, reutilizar ou encerrar processos na porta 3000.

## Observações de implementação

Preferir o helper `lucideIcon` já importado em `src/views/layout.js`. Os links
podem seguir o mesmo padrão flexível atualmente produzido por `buttonContent`
para `Sair`, mantendo ícone e rótulo dentro do elemento interativo.

A regra de fonte menor deve ficar restrita a
`.user-menu-panel .admin-menu-link`. Evitar tamanho fixo que ignore a escala do
usuário; uma unidade relativa, como `em` ou `rem` compatível com o padrão atual,
é preferível. Revisar o `padding-left: 30px` existente após a inclusão dos
ícones.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 17/07/2026 23:07
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

## Implementação

- centralizada a renderização do conteúdo compartilhado pelos menus desktop e
  mobile;
- adicionados ícones Lucide às ações pessoais e aos quatro links
  administrativos;
- aplicada fonte relativa menor somente aos links administrativos, preservando
  a altura e a área de clique;
- ajustados alinhamento, espaçamento e dimensões dos ícones;
- preservados rotas, permissões, item ativo, logout por POST e token CSRF;
- atualizado o controle de release para a sequência 047;
- `npm run check`, a validação estrutural do HTML renderizado e
  `git diff --check` passaram.

---

## Assinatura da LLM

- Data: 17/07/2026 23:09
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
