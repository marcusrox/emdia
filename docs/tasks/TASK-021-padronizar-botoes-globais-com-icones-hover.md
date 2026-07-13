# TASK-021 - Padronizar botões globais com ícones e hover

## Contexto

Os botões principais do sistema, como `Salvar`, `Voltar`, `Aplicar`, `Mês
atual`, botões de perfil e configurações, ainda usam um visual simples e pouco
expressivo. Eles funcionam, mas não comunicam tao bem hierarquia, intencao e
estado interativo.

O sistema já usa `lucide-static` como fonte padrão de ícones e possui botões de
ação em tabelas com tratamento visual mais consistente. A necessidade agora e
criar um padrão global para botões de formulários, filtros e ações principais,
servindo também como referência para desenvolvimentos futuros.

## Objetivo

Criar e aplicar um padrão reutilizável de botões globais com ícones, hierarquia
visual clara e estados de hover/focus/active consistentes em todo o sistema.

## Decisão proposta

Definir classes e/ou helpers para botões de uso geral, diferenciando pelo menos:

- botão primário: ações principais, como `Salvar`, `Atualizar` e `Aplicar`;
- botão secundário: navegação ou retorno, como `Voltar`, `Cancelar` e
  `Mês atual`;
- botão de perigo: ações destrutivas ou de arquivamento, quando aplicavel;
- botão somente ícone: manter ou alinhar com o padrão já existente quando
  estiver fora de tabelas.

Os botões devem usar ícones do `lucide-static` por meio do helper `lucideIcon`,
evitando SVGs avulsos nas views.

## Escopo

- Criar um padrão CSS reutilizável para botões globais.
- Adicionar ícones aos botões principais das telas atuais, priorizando:
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
- Garantir que os botões continuem legíveis com diferentes escalas de fonte.
- Preservar os botões pequenos de ações em tabela, salvo ajustes necessários
  para compatibilidade visual.
- Documentar, dentro da própria task, o padrão esperado para uso futuro.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Criar uma biblioteca de componentes separada.
- Migrar o projeto para framework frontend.
- Trocar todos os links do sistema por botões.
- Refatorar amplamente a renderização das views.
- Alterar regras de negocio, rotas ou models.
- Implementar esta task neste momento.

## Comportamento esperado

- Botões principais exibem ícone e texto alinhados.
- A hierarquia visual entre ação primária e secundária fica clara.
- O hover comunica interatividade sem ser chamativo demais.
- O estado active da a impressao de clique/resposta.
- O focus-visible e perceptivel para uso por teclado.
- O visual fica consistente entre formulários de contas, categorias, perfil,
  configurações e filtros de lançamentos.
- Novos botões futuros podem seguir o mesmo padrão sem reinventar CSS.

## Padrão visual sugerido

Exemplos de mapeamento de ícones:

- `Salvar`: `save` ou `check`;
- `Atualizar`: `check`;
- `Voltar`: `arrow-left`;
- `Cancelar`: `x` ou `arrow-left`, conforme contexto;
- `Aplicar`: `filter` ou `check`;
- `Mês atual`: `calendar-days` ou `calendar-clock`;
- `Entrar`: `log-in`;
- `Sair`: `log-out`, se houver botão textual fora do menu.

Diretrizes visuais:

- botões com `display: inline-flex`;
- `align-items: center`;
- `gap` entre ícone e texto;
- altura mínima consistente, respeitando formulários compactos;
- borda arredondada de até `8px`, mantendo o padrão atual;
- hover com leve mudanca de cor, borda e sombra discreta;
- active com `transform: translateY(0)` ou redução da sombra;
- focus-visible com contorno claro e acessivel;
- ícones com tamanho entre `16px` e `18px`, ajustados conforme o botão.

## Classes sugeridas

Possível estrutura CSS:

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

Os nomes finais podem ser ajustados ao padrão do CSS existente. Se o projeto
preferir evoluir as classes atuais `button`, `.primary-button`,
`.ghost-button` e `.icon-button`, isso também e aceitavel, desde que o resultado
seja reutilizável e claro para desenvolvimento futuro.

## Critérios de aceite

- Existe um padrão reutilizável para botões globais no CSS.
- Botões principais de contas e categorias exibem ícones e hover consistente.
- Botões `Aplicar` e `Mês atual` em lançamentos seguem o mesmo padrão.
- Botões de perfil e configurações seguem o mesmo padrão quando aplicavel.
- Os ícones sao obtidos por `lucideIcon`.
- Os botões continuam funcionando em formulários POST e links existentes.
- O layout não sofre quebras em desktop ou mobile.
- Textos dos botões não ficam sobrepostos ou cortados.
- Estados `hover`, `focus-visible` e `active` sao perceptiveis.
- O padrão fica documentado na task para orientar telas futuras.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/accounts` e conferir `Voltar` e `Salvar` ou `Atualizar`;
- acessar `/categories` e conferir `Voltar` e `Salvar` ou `Atualizar`;
- acessar `/entries` e conferir `Aplicar`, `Mês atual` e botões de formulário,
  se houver;
- acessar `/profile`;
- acessar `/settings`;
- testar hover, clique e foco por teclado;
- validar em viewport desktop;
- validar em viewport mobile;
- testar com escalas de fonte pequena, padrão e grande;
- testar com densidades de listagem, garantindo que botões de tabela não foram
  prejudicados.

## Observação de implementação

Priorizar mudanças pequenas e reutilizáveis. Se necessário, criar helpers locais
ou globais para renderizar ícone + texto de forma consistente, mas evitar uma
refatoracao ampla da view engine.

Não alterar os botões pequenos de ações em tabela sem necessidade. Eles já tem
um padrão próprio e podem continuar separados dos botões globais.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- Foram adicionados os helpers `buttonContent` e `buttonLink` em
  `src/services/viewHelpers.js` para padronizar botão/link com ícone e texto.
- O CSS base de `button`, `.primary-button` e `.ghost-button` foi evoluido com
  alinhamento de ícone, gap, transicoes, hover, active e focus-visible.
- Os seletores de hover/focus foram ajustados para não interferir nos botões
  especializados de tabela, toolbar e fechamento de notificacao.
- As telas de contas e categorias passaram a usar ícones nos botões de voltar,
  salvar e atualizar.
- A barra mensal passou a exibir ícones em `Aplicar` e `Mês atual`.
- As telas de lançamentos, perfil, configurações e login passaram a usar o
  mesmo padrão nos botões textuais principais.
- O botão textual de sair no menu do usuário passou a usar ícone pelo mesmo
  helper.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-12 22:13
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: criação

---

## Assinatura da LLM

- Data: 2026-07-12 22:18
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
