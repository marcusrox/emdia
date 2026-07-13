# TASK-018 - Cabeçalho compacto e polimento visual das listagens

## Contexto

As listagens do sistema já possuem controles de densidade, mas o cabeçalho dos
paineis de lista ainda ocupa espaco vertical demais. Na tela de contas, por
exemplo, o título `Contas cadastradas` e o botão de arquivadas deixam a linha de
topo alta e com espacamento visual maior do que o necessário para uma tela
operacional.

A necessidade aqui e criar um padrão mais compacto e refinado para o topo das
listagens, mantendo a legibilidade e respeitando a configuração de escala de
fonte do usuário.

## Objetivo

Padronizar cabeçalhos de listagens com base visual mais compacta, título menor,
ações mais discretas e tabela levemente mais elegante, sem impedir que a escala
de fonte do usuário continue influenciando a interface.

## Decisão proposta

Criar ou ajustar classes CSS reutilizáveis para listagens, aplicando-as
inicialmente nas telas de:

- `/accounts`;
- `/categories`;
- outras listagens que já usam o mesmo padrão visual, se o ajuste for simples e
  localizado.

O título deve iniciar menor por padrão, mas continuar herdando a escala global
de fonte do usuário.

## Escopo

- Reduzir o espacamento vertical do cabeçalho dos paineis de listagem.
- Reduzir a fonte base dos títulos das listagens.
- Manter o título responsivo a `font_scale`.
- Reduzir o tamanho visual dos botões/ações do cabeçalho, como o botão de
  arquivadas.
- Corrigir textos identificados nas telas, como `Contas Cadsatradas` para
  `Contas cadastradas`, se ainda existir no código.
- Refinar o visual das tabelas/listagens:
  - cabeçalho da tabela mais sutil;
  - linhas com melhor ritmo visual;
  - hover discreto;
  - ações por linha alinhadas e consistentes;
  - valores monetarios bem alinhados quando aplicavel.
- Preservar o funcionamento da preferência de densidade das listagens.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Criar nova configuração de usuário.
- Fazer o cabeçalho ignorar a escala de fonte do usuário.
- Alterar dados exibidos nas listagens.
- Reorganizar colunas ou mudar regras de negocio.
- Refatorar amplamente o CSS global.
- Implementar esta task neste momento.

## Comportamento esperado

- O topo das listagens ocupa menos altura no modo padrão.
- O título da lista fica visualmente proporcional a uma área operacional, sem
  aparência de título de página principal.
- O botão de arquivadas e outras ações de topo ficam mais compactos.
- A escala de fonte do usuário continua afetando títulos, tabelas e ações.
- A densidade escolhida pelo usuário continua afetando o espacamento das linhas.
- As tabelas ficam mais polidas sem perder clareza.
- O layout continua funcionando em desktop e mobile.

## Sugestao de interface

Padrão sugerido para cabeçalhos de listagens:

```text
Contas cadastradas                         [ícone arquivadas]
-------------------------------------------------------------
NOME              TIPO              INSTITUIÇÃO      AÇÕES
```

Diretrizes visuais:

- título entre `1rem` e `1.125rem` como base;
- ação de topo com área clicavel suficiente, mas menor que a atual;
- divisor horizontal mais sutil;
- menos padding no topo e na base do cabeçalho;
- botões com ícones consistentes usando `lucideIcon`.

## Ajustes CSS sugeridos

Exemplos de classes ou áreas afetadas:

- `.panel-heading`;
- `.panel-title`;
- `.panel-actions`;
- `.table-wrap`;
- `table th`;
- `table td`;
- `.record-actions`;
- `.record-action-button`;
- classes especificas de botões de arquivadas, se existirem.

Exemplo conceitual:

```css
.panel-heading {
  padding-block: 0.75rem;
  gap: 0.75rem;
}

.panel-title {
  font-size: 1.0625rem;
  line-height: 1.25;
}

.panel-heading .icon-button {
  width: 34px;
  min-height: 34px;
}
```

Os valores finais devem respeitar os tokens e padrões já existentes em
`public/css/styles.css`.

## Critérios de aceite

- `/accounts` exibe o cabeçalho de listagem mais compacto.
- O botão de arquivadas ocupa menos altura visual sem perder área clicavel
  aceitavel.
- O título da listagem parte de uma fonte menor que a atual.
- A configuração de escala de fonte do usuário continua influenciando o
  cabeçalho.
- A configuração de densidade das listagens continua funcionando.
- A tabela fica visualmente mais refinada em estado normal e hover.
- Não há sobreposicao de textos, botões ou colunas em desktop e mobile.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/accounts`;
- conferir cabeçalho, tabela e botões em viewport desktop;
- abrir contas arquivadas, se houver fluxo especifico;
- acessar `/categories` e conferir consistência visual;
- testar com diferentes escalas de fonte;
- testar com diferentes densidades de listagem;
- validar em viewport mobile.

## Observação de implementação

Priorizar uma mudanca CSS pequena e reutilizável. Se for necessário ajustar
views, manter a alteração localizada e preservar o uso de `lucideIcon`.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- Foi adicionada a classe `list-panel` aos paineis de listagem ativa de contas e
  categorias.
- O cabeçalho dos paineis de listagem passou a usar menos padding, menor margem
  inferior e título com base visual menor, ainda herdando a escala de fonte do
  usuário.
- O botão de arquivadas no cabeçalho passou a ter dimensao menor e ícone
  proporcional.
- As tabelas receberam hover discreto, cabeçalhos com peso consistente e
  transicoes leves nos botões de ação.
- As colunas monetarias de contas passaram a usar alinhamento a direita e
  números tabulares.
- O controle de release foi atualizado para registrar a entrega.
- Após revisão visual, os ajustes de cabeçalho foram reforcados para a redução
  ficar perceptivel: painel menor, título em base `0.95rem`, ação de topo em
  `28px` e linhas mais enxutas dentro de `list-panel`.
- A coluna de ações passou a usar classe explícita no cabeçalho e largura
  compacta, mantendo botões alinhados a extrema direita quando a listagem tem
  poucas colunas ou pouco conteúdo.

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
