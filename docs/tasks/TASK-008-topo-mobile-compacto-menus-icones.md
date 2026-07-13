# TASK-008 - Topo mobile compacto com menus em ícones

## Contexto

O sistema passou a ter um menu sanduiche no celular, mas ele ainda ocupa uma
linha própria no topo. Além disso, o menu do usuário exibe o nome do usuário,
consumindo espaco horizontal e vertical em telas pequenas.

Como o EmDia será usado com frequência no celular, o topo mobile precisa ser
mais compacto. A navegação principal e o menu do usuário devem ficar no topo,
alinhados a esquerda e próximos ao logo, usando ícones para economizar espaco.

## Objetivo

Ajustar o topo em telas mobile para que o menu sanduiche fique na mesma linha do
logo do sistema, alinhado a esquerda, e para que o menu do usuário também fique
no topo como um ícone de usuário, sem exibir o nome do usuário.

## Escopo

- Reorganizar o topo mobile para usar uma única linha compacta.
- Posicionar o menu sanduiche no topo, alinhado a esquerda, ao lado do logo do
  sistema.
- Posicionar o menu do usuário também no topo, próximo ao menu sanduiche e ao
  logo.
- Substituir, no mobile, o nome do usuário por um ícone de usuário.
- Manter o menu do usuário com as opções Configurações e Sair.
- Preservar o menu principal mobile com os links atuais:
  - Dashboard;
  - Lançamentos;
  - Novo lançamento;
  - Contas;
  - Categorias.
- Manter o comportamento desktop atual, salvo ajuste mínimo necessário para
  compartilhar markup ou classes.
- Evitar JavaScript; preferir `<details>` e CSS como no padrão atual.

## Fora do escopo

- Alterar rotas, regras de negocio ou permissões.
- Remover opções de navegação.
- Criar uma sidebar mobile completa.
- Introduzir biblioteca de ícones ou framework CSS.
- Redesenhar o topo desktop de forma ampla.
- Alterar o comportamento do rodapé, release ou formulários.

## Comportamento esperado no mobile

- O topo deve ocupar menos altura que o estado atual.
- O menu sanduiche deve aparecer na primeira linha do topo.
- O logo/marca do EmDia deve continuar visível.
- O menu do usuário deve aparecer como ícone de usuário, sem texto com o nome.
- Ao tocar no ícone de usuário, devem aparecer Configurações e Sair.
- Ao tocar no menu sanduiche, devem aparecer os links principais em coluna.
- Não deve haver rolagem horizontal causada pelo topo.
- Os alvos de toque devem continuar confortaveis para uso no celular.

## Comportamento esperado no desktop

- A navegação horizontal desktop deve continuar disponível.
- O menu do usuário pode continuar exibindo o nome do usuário no desktop.
- O layout desktop não deve perder densidade nem quebrar alinhamento.

## Diretrizes visuais

- Usar simbolos simples em CSS ou HTML para os ícones, sem dependência externa.
- O ícone de usuário deve ser reconhecivel e discreto.
- O menu sanduiche deve continuar claro como acionador de navegação.
- Evitar textos longos no topo mobile.
- Preservar a identidade visual do EmDia e a paleta atual.
- Garantir que menu aberto não sobreponha incoerentemente os demais elementos.

## Pontos prováveis de implementação

- `src/views/layout.js`: ajustar markup do topo, menus mobile e menu do usuário.
- `public/css/styles.css`: ajustar layout responsivo, ícones, alinhamento e
  comportamento dos paineis abertos.

## Critérios de aceite

- Em viewport mobile, o menu sanduiche fica no topo ao lado do logo.
- Em viewport mobile, o menu do usuário aparece como ícone, sem exibir o nome.
- Configurações e Sair continuam acessiveis pelo menu do usuário.
- Links principais continuam acessiveis pelo menu sanduiche.
- O topo mobile não gera overflow horizontal em larguras comuns de celular.
- Desktop continua exibindo a navegação horizontal e o menu do usuário conforme
  esperado.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Quando for necessário validar HTTP, usar a regra do `AGENTS.md`:

```powershell
$env:PORT = "3100"
node app.js
```

Fluxos manuais:

- testar em larguras 360px, 390px e 430px;
- acessar `/dashboard`;
- abrir e fechar o menu sanduiche;
- abrir e fechar o menu do usuário;
- acessar Configurações pelo ícone do usuário;
- sair pelo menu do usuário, se apropriado;
- conferir `/entries/new`, `/accounts`, `/categories` e `/settings`;
- testar desktop para garantir que a navegação horizontal foi preservada.

## Observação de implementação

Esta task registra o escopo solicitado, mas a implementação ainda não deve ser
feita neste momento.

## Implementação

- Topo mobile reorganizado em uma única linha com menu sanduiche, logo e menu do
  usuário.
- Menu sanduiche mobile passou a ser apenas ícone, ao lado do logo.
- Menu do usuário mobile passou a ser um ícone de usuário, sem exibir o nome.
- Ícone de usuário mobile foi reduzido, alinhado a direita e ficou sem fundo
  circular.
- Menus mobile passaram a compartilhar o mesmo grupo de `<details>`, evitando
  sobreposicao quando um menu e aberto enquanto o outro já estava aberto.
- Menu do usuário desktop continua exibindo o nome do usuário.
- Navegação horizontal desktop foi preservada.
- Menus mobile seguem usando `<details>` e CSS, sem JavaScript.
- Controle de release atualizado para `Release 11/07/2026 11:35 - 003`.

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: criação

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
