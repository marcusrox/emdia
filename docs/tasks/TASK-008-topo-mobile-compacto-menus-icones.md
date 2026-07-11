# TASK-008 - Topo mobile compacto com menus em icones

## Contexto

O sistema passou a ter um menu sanduiche no celular, mas ele ainda ocupa uma
linha propria no topo. Alem disso, o menu do usuario exibe o nome do usuario,
consumindo espaco horizontal e vertical em telas pequenas.

Como o EmDia sera usado com frequencia no celular, o topo mobile precisa ser
mais compacto. A navegacao principal e o menu do usuario devem ficar no topo,
alinhados a esquerda e proximos ao logo, usando icones para economizar espaco.

## Objetivo

Ajustar o topo em telas mobile para que o menu sanduiche fique na mesma linha do
logo do sistema, alinhado a esquerda, e para que o menu do usuario tambem fique
no topo como um icone de usuario, sem exibir o nome do usuario.

## Escopo

- Reorganizar o topo mobile para usar uma unica linha compacta.
- Posicionar o menu sanduiche no topo, alinhado a esquerda, ao lado do logo do
  sistema.
- Posicionar o menu do usuario tambem no topo, proximo ao menu sanduiche e ao
  logo.
- Substituir, no mobile, o nome do usuario por um icone de usuario.
- Manter o menu do usuario com as opcoes Configuracoes e Sair.
- Preservar o menu principal mobile com os links atuais:
  - Dashboard;
  - Lancamentos;
  - Novo lancamento;
  - Contas;
  - Categorias.
- Manter o comportamento desktop atual, salvo ajuste minimo necessario para
  compartilhar markup ou classes.
- Evitar JavaScript; preferir `<details>` e CSS como no padrao atual.

## Fora do escopo

- Alterar rotas, regras de negocio ou permissoes.
- Remover opcoes de navegacao.
- Criar uma sidebar mobile completa.
- Introduzir biblioteca de icones ou framework CSS.
- Redesenhar o topo desktop de forma ampla.
- Alterar o comportamento do rodape, release ou formularios.

## Comportamento esperado no mobile

- O topo deve ocupar menos altura que o estado atual.
- O menu sanduiche deve aparecer na primeira linha do topo.
- O logo/marca do EmDia deve continuar visivel.
- O menu do usuario deve aparecer como icone de usuario, sem texto com o nome.
- Ao tocar no icone de usuario, devem aparecer Configuracoes e Sair.
- Ao tocar no menu sanduiche, devem aparecer os links principais em coluna.
- Nao deve haver rolagem horizontal causada pelo topo.
- Os alvos de toque devem continuar confortaveis para uso no celular.

## Comportamento esperado no desktop

- A navegacao horizontal desktop deve continuar disponivel.
- O menu do usuario pode continuar exibindo o nome do usuario no desktop.
- O layout desktop nao deve perder densidade nem quebrar alinhamento.

## Diretrizes visuais

- Usar simbolos simples em CSS ou HTML para os icones, sem dependencia externa.
- O icone de usuario deve ser reconhecivel e discreto.
- O menu sanduiche deve continuar claro como acionador de navegacao.
- Evitar textos longos no topo mobile.
- Preservar a identidade visual do EmDia e a paleta atual.
- Garantir que menu aberto nao sobreponha incoerentemente os demais elementos.

## Pontos provaveis de implementacao

- `src/views/layout.js`: ajustar markup do topo, menus mobile e menu do usuario.
- `public/css/styles.css`: ajustar layout responsivo, icones, alinhamento e
  comportamento dos paineis abertos.

## Criterios de aceite

- Em viewport mobile, o menu sanduiche fica no topo ao lado do logo.
- Em viewport mobile, o menu do usuario aparece como icone, sem exibir o nome.
- Configuracoes e Sair continuam acessiveis pelo menu do usuario.
- Links principais continuam acessiveis pelo menu sanduiche.
- O topo mobile nao gera overflow horizontal em larguras comuns de celular.
- Desktop continua exibindo a navegacao horizontal e o menu do usuario conforme
  esperado.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
```

Quando for necessario validar HTTP, usar a regra do `AGENTS.md`:

```powershell
$env:PORT = "3100"
node app.js
```

Fluxos manuais:

- testar em larguras 360px, 390px e 430px;
- acessar `/dashboard`;
- abrir e fechar o menu sanduiche;
- abrir e fechar o menu do usuario;
- acessar Configuracoes pelo icone do usuario;
- sair pelo menu do usuario, se apropriado;
- conferir `/entries/new`, `/accounts`, `/categories` e `/settings`;
- testar desktop para garantir que a navegacao horizontal foi preservada.

## Observacao de implementacao

Esta task registra o escopo solicitado, mas a implementacao ainda nao deve ser
feita neste momento.

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: criacao
