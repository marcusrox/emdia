# TASK-018 - Cabecalho compacto e polimento visual das listagens

## Contexto

As listagens do sistema ja possuem controles de densidade, mas o cabecalho dos
paineis de lista ainda ocupa espaco vertical demais. Na tela de contas, por
exemplo, o titulo `Contas cadastradas` e o botao de arquivadas deixam a linha de
topo alta e com espacamento visual maior do que o necessario para uma tela
operacional.

A necessidade aqui e criar um padrao mais compacto e refinado para o topo das
listagens, mantendo a legibilidade e respeitando a configuracao de escala de
fonte do usuario.

## Objetivo

Padronizar cabecalhos de listagens com base visual mais compacta, titulo menor,
acoes mais discretas e tabela levemente mais elegante, sem impedir que a escala
de fonte do usuario continue influenciando a interface.

## Decisao proposta

Criar ou ajustar classes CSS reutilizaveis para listagens, aplicando-as
inicialmente nas telas de:

- `/accounts`;
- `/categories`;
- outras listagens que ja usam o mesmo padrao visual, se o ajuste for simples e
  localizado.

O titulo deve iniciar menor por padrao, mas continuar herdando a escala global
de fonte do usuario.

## Escopo

- Reduzir o espacamento vertical do cabecalho dos paineis de listagem.
- Reduzir a fonte base dos titulos das listagens.
- Manter o titulo responsivo a `font_scale`.
- Reduzir o tamanho visual dos botoes/acoes do cabecalho, como o botao de
  arquivadas.
- Corrigir textos identificados nas telas, como `Contas Cadsatradas` para
  `Contas cadastradas`, se ainda existir no codigo.
- Refinar o visual das tabelas/listagens:
  - cabecalho da tabela mais sutil;
  - linhas com melhor ritmo visual;
  - hover discreto;
  - acoes por linha alinhadas e consistentes;
  - valores monetarios bem alinhados quando aplicavel.
- Preservar o funcionamento da preferencia de densidade das listagens.
- Atualizar o controle de release ao concluir a implementacao.

## Fora do escopo

- Criar nova configuracao de usuario.
- Fazer o cabecalho ignorar a escala de fonte do usuario.
- Alterar dados exibidos nas listagens.
- Reorganizar colunas ou mudar regras de negocio.
- Refatorar amplamente o CSS global.
- Implementar esta task neste momento.

## Comportamento esperado

- O topo das listagens ocupa menos altura no modo padrao.
- O titulo da lista fica visualmente proporcional a uma area operacional, sem
  aparencia de titulo de pagina principal.
- O botao de arquivadas e outras acoes de topo ficam mais compactos.
- A escala de fonte do usuario continua afetando titulos, tabelas e acoes.
- A densidade escolhida pelo usuario continua afetando o espacamento das linhas.
- As tabelas ficam mais polidas sem perder clareza.
- O layout continua funcionando em desktop e mobile.

## Sugestao de interface

Padrao sugerido para cabecalhos de listagens:

```text
Contas cadastradas                         [icone arquivadas]
-------------------------------------------------------------
NOME              TIPO              INSTITUICAO      ACOES
```

Diretrizes visuais:

- titulo entre `1rem` e `1.125rem` como base;
- acao de topo com area clicavel suficiente, mas menor que a atual;
- divisor horizontal mais sutil;
- menos padding no topo e na base do cabecalho;
- botoes com icones consistentes usando `lucideIcon`.

## Ajustes CSS sugeridos

Exemplos de classes ou areas afetadas:

- `.panel-heading`;
- `.panel-title`;
- `.panel-actions`;
- `.table-wrap`;
- `table th`;
- `table td`;
- `.record-actions`;
- `.record-action-button`;
- classes especificas de botoes de arquivadas, se existirem.

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

Os valores finais devem respeitar os tokens e padroes ja existentes em
`public/css/styles.css`.

## Criterios de aceite

- `/accounts` exibe o cabecalho de listagem mais compacto.
- O botao de arquivadas ocupa menos altura visual sem perder area clicavel
  aceitavel.
- O titulo da listagem parte de uma fonte menor que a atual.
- A configuracao de escala de fonte do usuario continua influenciando o
  cabecalho.
- A configuracao de densidade das listagens continua funcionando.
- A tabela fica visualmente mais refinada em estado normal e hover.
- Nao ha sobreposicao de textos, botoes ou colunas em desktop e mobile.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/accounts`;
- conferir cabecalho, tabela e botoes em viewport desktop;
- abrir contas arquivadas, se houver fluxo especifico;
- acessar `/categories` e conferir consistencia visual;
- testar com diferentes escalas de fonte;
- testar com diferentes densidades de listagem;
- validar em viewport mobile.

## Observacao de implementacao

Priorizar uma mudanca CSS pequena e reutilizavel. Se for necessario ajustar
views, manter a alteracao localizada e preservar o uso de `lucideIcon`.

Ao concluir a implementacao, atualizar o controle de release em
`src/config/release.js`, incrementando o numero sequencial em 1.

## Implementacao

- Foi adicionada a classe `list-panel` aos paineis de listagem ativa de contas e
  categorias.
- O cabecalho dos paineis de listagem passou a usar menos padding, menor margem
  inferior e titulo com base visual menor, ainda herdando a escala de fonte do
  usuario.
- O botao de arquivadas no cabecalho passou a ter dimensao menor e icone
  proporcional.
- As tabelas receberam hover discreto, cabecalhos com peso consistente e
  transicoes leves nos botoes de acao.
- As colunas monetarias de contas passaram a usar alinhamento a direita e
  numeros tabulares.
- O controle de release foi atualizado para registrar a entrega.
- Apos revisao visual, os ajustes de cabecalho foram reforcados para a reducao
  ficar perceptivel: painel menor, titulo em base `0.95rem`, acao de topo em
  `28px` e linhas mais enxutas dentro de `list-panel`.
- A coluna de acoes passou a usar classe explicita no cabecalho e largura
  compacta, mantendo botoes alinhados a extrema direita quando a listagem tem
  poucas colunas ou pouco conteudo.

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
