# TASK-025 - Centralizar configurações e adicionar seções colapsáveis

## Contexto

A tela `/settings` concentra preferências individuais de interface do usuário,
como tamanho da fonte e densidade das listagens.

Hoje o formulário já é renderizado como um painel compacto, mas o quadro de
configurações não fica centralizado na página. Além disso, todas as opções ficam
sempre abertas, o que tende a ficar menos organizado conforme novas
preferências forem adicionadas.

Esta task descreve uma melhoria visual e de interação para tornar a tela de
configurações mais organizada, sem alterar a forma como as preferências reais
são persistidas no servidor.

## Objetivo

Melhorar a usabilidade da tela `/settings` com:

- painel de configurações centralizado;
- grupos de configuração expansíveis e colapsáveis;
- preservação local do estado aberto/fechado de cada grupo.

## Decisões de produto

- A tela deve continuar simples e objetiva.
- As configurações reais continuam sendo salvas no backend do EmDia.
- O estado aberto/fechado dos grupos é apenas uma preferência visual do
  navegador.
- Na primeira visita, os grupos devem abrir por padrão para não esconder opções
  existentes.
- Depois que o usuário abrir ou fechar um grupo, a escolha visual pode ser
  preservada em `localStorage`.
- A melhoria não deve introduzir dependências novas.

## Escopo

- Centralizar o formulário/painel principal da tela `/settings`.
- Transformar cada grupo de configuração em uma seção colapsável.
- Usar HTML semântico com `<details>` e `<summary>` sempre que possível.
- Adicionar estilos para o cabeçalho de cada seção colapsável.
- Preservar a aparência atual dos cards de opção.
- Adicionar JavaScript pequeno e isolado para persistir o estado aberto/fechado
  no `localStorage`.
- Garantir que a tela funcione mesmo se `localStorage` não estiver disponível.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Alterar a persistência de `font_scale` ou `list_density` no banco.
- Criar novas opções de configuração.
- Adotar Pico CSS, Bootstrap, Tailwind ou outro framework CSS.
- Refatorar todo o CSS global do projeto.
- Criar componente genérico de acordeão para todas as telas.
- Alterar o layout de outras páginas.

## Comportamento esperado

Na tela `/settings`, o quadro com as configurações deve aparecer centralizado
horizontalmente dentro da área principal.

Cada grupo deve poder ser aberto ou fechado:

- `Tamanho da fonte`;
- `Densidade das listagens`.

O usuário deve conseguir clicar no título do grupo para alternar entre aberto e
fechado.

O estado visual deve ser salvo localmente com chaves específicas, por exemplo:

```text
emdia.settings.fontScale.open
emdia.settings.listDensity.open
```

As chaves podem ter outro nome se a implementação mantiver o prefixo `emdia` e
for clara sobre a tela e o grupo afetados.

## Critérios de aceite

- O painel principal da tela `/settings` fica centralizado.
- Os grupos `Tamanho da fonte` e `Densidade das listagens` podem ser
  colapsados e expandidos.
- A primeira visita mantém os grupos abertos por padrão.
- O estado aberto/fechado é restaurado ao recarregar a página.
- A persistência do estado visual usa `localStorage`.
- A ausência ou falha de `localStorage` não quebra a tela.
- A seleção das opções de rádio continua funcionando normalmente.
- O envio do formulário continua salvando as preferências atuais.
- A interface permanece em português.
- Não são adicionadas dependências novas.
- `npm run check` passa após a implementação.

## Arquivos esperados

Arquivos prováveis:

- `src/views/settingsView.js`;
- `public/css/styles.css`;
- `public/js/app.js`;
- `src/config/release.js`.

Evitar alterações fora desses arquivos salvo necessidade clara encontrada
durante a implementação.

## Validação sugerida

Validação sintática:

```powershell
npm run check
```

Validação manual:

- abrir `/settings`;
- confirmar que o painel está centralizado;
- fechar `Tamanho da fonte`;
- recarregar a página;
- confirmar que `Tamanho da fonte` continua fechado;
- abrir `Tamanho da fonte`;
- fechar `Densidade das listagens`;
- recarregar a página;
- confirmar que os estados foram restaurados corretamente;
- alterar uma opção de fonte;
- salvar;
- confirmar que a preferência foi persistida;
- repetir o teste em largura mobile.

## Observações de implementação

Preferir `<details>` e `<summary>` para aproveitar comportamento nativo e
semântica de acessibilidade.

O JavaScript deve ser defensivo:

- verificar se os elementos existem antes de operar;
- envolver acesso ao `localStorage` em `try/catch`;
- não depender de bibliotecas externas;
- não interferir nos menus existentes que também usam `<details>`.

O CSS deve manter a leitura simples e localizada. Evitar seletores muito
específicos ou regras globais que afetem outros fieldsets do sistema.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- O painel principal da tela `/settings` foi centralizado com `margin: 0 auto`.
- Os grupos `Tamanho da fonte` e `Densidade das listagens` passaram a usar
  `<details>` e `<summary>`.
- As seções abrem por padrão na primeira visita.
- O estado aberto/fechado de cada seção é salvo em `localStorage`.
- O JavaScript ignora falhas de `localStorage` sem quebrar a interação nativa.
- As seções de configurações foram marcadas para não serem fechadas pelo
  comportamento global de fechamento de menus ao clicar fora.
- O CSS ganhou estilos específicos para as seções colapsáveis e um helper
  `.sr-only` para legends acessíveis.
- O controle de release foi atualizado.
- `npm run check` foi executado com sucesso.

---

## Assinatura da LLM

- Data: 2026-07-13 19:01
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-13 19:03
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
