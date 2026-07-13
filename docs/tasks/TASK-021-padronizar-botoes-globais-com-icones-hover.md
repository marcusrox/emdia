# TASK-021 - Padronizar botoes globais com icones e hover

## Contexto

Os botoes principais do sistema, como `Salvar`, `Voltar`, `Aplicar`, `Mes
atual`, botoes de perfil e configuracoes, ainda usam um visual simples e pouco
expressivo. Eles funcionam, mas nao comunicam tao bem hierarquia, intencao e
estado interativo.

O sistema ja usa `lucide-static` como fonte padrao de icones e possui botoes de
acao em tabelas com tratamento visual mais consistente. A necessidade agora e
criar um padrao global para botoes de formularios, filtros e acoes principais,
servindo tambem como referencia para desenvolvimentos futuros.

## Objetivo

Criar e aplicar um padrao reutilizavel de botoes globais com icones, hierarquia
visual clara e estados de hover/focus/active consistentes em todo o sistema.

## Decisao proposta

Definir classes e/ou helpers para botoes de uso geral, diferenciando pelo menos:

- botao primario: acoes principais, como `Salvar`, `Atualizar` e `Aplicar`;
- botao secundario: navegacao ou retorno, como `Voltar`, `Cancelar` e
  `Mes atual`;
- botao de perigo: acoes destrutivas ou de arquivamento, quando aplicavel;
- botao somente icone: manter ou alinhar com o padrao ja existente quando
  estiver fora de tabelas.

Os botoes devem usar icones do `lucide-static` por meio do helper `lucideIcon`,
evitando SVGs avulsos nas views.

## Escopo

- Criar um padrao CSS reutilizavel para botoes globais.
- Adicionar icones aos botoes principais das telas atuais, priorizando:
  - `/accounts`;
  - `/categories`;
  - `/entries`;
  - `/profile`;
  - `/settings`.
- Aplicar estados visuais consistentes:
  - hover;
  - focus-visible;
  - active.
- Manter altura, espacamento, borda, peso de fonte e alinhamento consistentes.
- Garantir que os botoes continuem legiveis com diferentes escalas de fonte.
- Preservar os botoes pequenos de acoes em tabela, salvo ajustes necessarios
  para compatibilidade visual.
- Documentar, dentro da propria task, o padrao esperado para uso futuro.
- Atualizar o controle de release ao concluir a implementacao.

## Fora do escopo

- Criar uma biblioteca de componentes separada.
- Migrar o projeto para framework frontend.
- Trocar todos os links do sistema por botoes.
- Refatorar amplamente a renderizacao das views.
- Alterar regras de negocio, rotas ou models.
- Implementar esta task neste momento.

## Comportamento esperado

- Botoes principais exibem icone e texto alinhados.
- A hierarquia visual entre acao primaria e secundaria fica clara.
- O hover comunica interatividade sem ser chamativo demais.
- O estado active da a impressao de clique/resposta.
- O focus-visible e perceptivel para uso por teclado.
- O visual fica consistente entre formularios de contas, categorias, perfil,
  configuracoes e filtros de lancamentos.
- Novos botoes futuros podem seguir o mesmo padrao sem reinventar CSS.

## Padrao visual sugerido

Exemplos de mapeamento de icones:

- `Salvar`: `save` ou `check`;
- `Atualizar`: `check`;
- `Voltar`: `arrow-left`;
- `Cancelar`: `x` ou `arrow-left`, conforme contexto;
- `Aplicar`: `filter` ou `check`;
- `Mes atual`: `calendar-days` ou `calendar-clock`;
- `Entrar`: `log-in`;
- `Sair`: `log-out`, se houver botao textual fora do menu.

Diretrizes visuais:

- botoes com `display: inline-flex`;
- `align-items: center`;
- `gap` entre icone e texto;
- altura minima consistente, respeitando formularios compactos;
- borda arredondada de ate `8px`, mantendo o padrao atual;
- hover com leve mudanca de cor, borda e sombra discreta;
- active com `transform: translateY(0)` ou reducao da sombra;
- focus-visible com contorno claro e acessivel;
- icones com tamanho entre `16px` e `18px`, ajustados conforme o botao.

## Classes sugeridas

Possivel estrutura CSS:

```css
.app-button {
  align-items: center;
  display: inline-flex;
  gap: 0.45rem;
  justify-content: center;
}

.app-button-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.app-button-secondary {
  background: var(--surface);
  border-color: var(--line);
  color: var(--text);
}

.app-button-danger {
  background: #fff7f7;
  border-color: #fecaca;
  color: #b91c1c;
}
```

Os nomes finais podem ser ajustados ao padrao do CSS existente. Se o projeto
preferir evoluir as classes atuais `button`, `.primary-button`,
`.ghost-button` e `.icon-button`, isso tambem e aceitavel, desde que o resultado
seja reutilizavel e claro para desenvolvimento futuro.

## Criterios de aceite

- Existe um padrao reutilizavel para botoes globais no CSS.
- Botoes principais de contas e categorias exibem icones e hover consistente.
- Botoes `Aplicar` e `Mes atual` em lancamentos seguem o mesmo padrao.
- Botoes de perfil e configuracoes seguem o mesmo padrao quando aplicavel.
- Os icones sao obtidos por `lucideIcon`.
- Os botoes continuam funcionando em formularios POST e links existentes.
- O layout nao sofre quebras em desktop ou mobile.
- Textos dos botoes nao ficam sobrepostos ou cortados.
- Estados `hover`, `focus-visible` e `active` sao perceptiveis.
- O padrao fica documentado na task para orientar telas futuras.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/accounts` e conferir `Voltar` e `Salvar` ou `Atualizar`;
- acessar `/categories` e conferir `Voltar` e `Salvar` ou `Atualizar`;
- acessar `/entries` e conferir `Aplicar`, `Mes atual` e botoes de formulario,
  se houver;
- acessar `/profile`;
- acessar `/settings`;
- testar hover, clique e foco por teclado;
- validar em viewport desktop;
- validar em viewport mobile;
- testar com escalas de fonte pequena, padrao e grande;
- testar com densidades de listagem, garantindo que botoes de tabela nao foram
  prejudicados.

## Observacao de implementacao

Priorizar mudancas pequenas e reutilizaveis. Se necessario, criar helpers locais
ou globais para renderizar icone + texto de forma consistente, mas evitar uma
refatoracao ampla da view engine.

Nao alterar os botoes pequenos de acoes em tabela sem necessidade. Eles ja tem
um padrao proprio e podem continuar separados dos botoes globais.

Ao concluir a implementacao, atualizar o controle de release em
`src/config/release.js`, incrementando o numero sequencial em 1.

## Implementacao

- Foram adicionados os helpers `buttonContent` e `buttonLink` em
  `src/services/viewHelpers.js` para padronizar botao/link com icone e texto.
- O CSS base de `button`, `.primary-button` e `.ghost-button` foi evoluido com
  alinhamento de icone, gap, transicoes, hover, active e focus-visible.
- Os seletores de hover/focus foram ajustados para nao interferir nos botoes
  especializados de tabela, toolbar e fechamento de notificacao.
- As telas de contas e categorias passaram a usar icones nos botoes de voltar,
  salvar e atualizar.
- A barra mensal passou a exibir icones em `Aplicar` e `Mes atual`.
- As telas de lancamentos, perfil, configuracoes e login passaram a usar o
  mesmo padrao nos botoes textuais principais.
- O botao textual de sair no menu do usuario passou a usar icone pelo mesmo
  helper.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-12 22:13
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-12 22:18
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
