# TASK-012 - Padronizar mensagens flutuantes fechaveis

## Contexto

A tela de Perfil (`/profile`) exibe erros de validação como blocos vermelhos em
linha, ocupando quase toda a largura da página antes do formulário. Na captura
analisada, mensagens como `Senha atual incorreta.` e `A confirmação da nova
senha não confere.` aparecem como faixas horizontais fixas no fluxo da página.

O usuário solicitou que esse tipo de mensagem passe a ser flutuante e possa ser
fechado manualmente ao clicar em um `X`.

## Objetivo

Definir e implementar um padrão único de mensagens de sistema no EmDia, usando
notificacoes flutuantes fechaveis para erros, sucessos e avisos exibidos nas
telas.

## Padronizacao proposta

- Criar um componente visual global de notificacoes flutuantes, no padrão
  `toast` ou `notification stack`.
- Posicionar as notificacoes no canto superior direito em desktop.
- Em telas pequenas, posicionar as notificacoes no topo, com margens laterais e
  largura responsiva.
- Exibir cada mensagem em um item independente, empilhado com espacamento
  consistente.
- Incluir botão `X` em cada notificacao, com `aria-label` em português, para
  fechar a mensagem.
- Manter tons visuais por tipo:
  - erro: vermelho discreto, sem ocupar a página toda;
  - sucesso: verde discreto;
  - aviso ou informação futura: tom neutro ou amarelo discreto.
- Usar `role="alert"` ou `aria-live` quando apropriado para mensagens
  importantes, preservando acessibilidade.
- Fechar a notificacao apenas no cliente, sem refazer a requisicao.
- Preservar escape de HTML para qualquer texto vindo de validação ou entrada de
  usuário.

## Escopo

- Criar helper ou componente reutilizável para renderizar notificacoes.
- Substituir os usos atuais de `alert-error` e `alert-success` por esse padrão.
- Atualizar CSS global em `public/css/styles.css`.
- Atualizar JavaScript em `public/js/app.js` para permitir fechar notificacoes
  pelo botão `X`.
- Garantir que múltiplas mensagens possam aparecer ao mesmo tempo.
- Garantir que a tela de Perfil exiba os erros de validação como notificacoes
  flutuantes.
- Garantir que a tela de Configurações exiba sucesso como notificacao
  flutuante.
- Garantir que a tela de Login exiba erro de autenticação como notificacao
  flutuante, sem quebrar a experiência de acesso.
- Manter mensagens e textos em português.

## Fora do escopo

- Alterar regras de validação de perfil, login ou configurações.
- Alterar rotas, models, schema ou persistência.
- Criar notificacoes com persistência em banco.
- Criar auto-dismiss obrigatório nesta etapa.
- Redesenhar formulários ou navegação.
- Implementar esta task neste momento.

## Varredura realizada

Usos reais encontrados no sistema:

- `src/views/authView.js`: renderiza erro de login com
  `<p class="alert-error">`.
- `src/views/settingsView.js`: renderiza sucesso de configuração com
  `<p class="alert-success">`.
- `src/views/profileView.js`: renderiza sucesso de perfil com
  `<p class="alert-success">`.
- `src/views/profileView.js`: renderiza cada erro de perfil com
  `<p class="alert-error">`.
- `public/css/styles.css`: define os estilos globais `.alert-error` e
  `.alert-success`.
- `public/js/app.js`: atualmente só fecha menus `details` ao clicar fora; pode
  receber a lógica pequena de fechar notificacoes.

Não foram encontrados outros padrões ativos de mensagens visuais nas views ou
assets estáticos além das classes `alert-error` e `alert-success`.

## Comportamento esperado

- Mensagens de erro, sucesso e aviso aparecem como notificacoes flutuantes.
- Cada notificacao tem botão `X` clicavel.
- Ao clicar no `X`, somente a notificacao correspondente desaparece.
- Múltiplas mensagens sao empilhadas sem sobrepor o topo, menus ou formulários.
- A notificacao não empurra o conteúdo da página para baixo.
- A tela de Perfil deixa de exibir faixas vermelhas largas no fluxo da página.
- A tela de Login continua exibindo erro de credenciais de forma visível.
- A tela de Configurações continua confirmando salvamento com mensagem de
  sucesso.
- As mensagens continuam escapadas antes de renderizar HTML.
- A solucao funciona em desktop e mobile.

## Critérios de aceite

- Todos os usos atuais de `alert-error` e `alert-success` sao migrados para o
  novo componente de notificacoes.
- Não há mais mensagens em bloco largo ocupando o fluxo principal da página.
- Cada notificacao possui botão de fechar com texto acessivel.
- O clique no botão `X` remove a notificacao sem erro no console.
- Multiplos erros de Perfil aparecem empilhados e podem ser fechados
  individualmente.
- A mensagem de sucesso de Perfil aparece como notificacao flutuante.
- A mensagem de sucesso de Configurações aparece como notificacao flutuante.
- O erro de Login aparece como notificacao flutuante.
- `npm run check` passa após a implementação.
- Validação visual manual confirma o comportamento em desktop e mobile.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/login`, informar credenciais invalidas e confirmar notificacao de
  erro fechavel;
- acessar `/profile`, tentar alterar senha com senha atual incorreta e
  confirmação divergente, confirmando múltiplas notificacoes fechaveis;
- salvar Perfil com sucesso e confirmar notificacao verde fechavel;
- acessar `/settings`, salvar configuração e confirmar notificacao verde
  fechavel;
- repetir os fluxos em viewport mobile;
- conferir que o menu do usuário e a navegação não ficam encobertos de forma
  impeditiva pelas notificacoes.

## Observação de implementação

A implementação deve centralizar a renderização para evitar novos usos diretos
de `alert-error` e `alert-success` nas views. Uma opção simples e adicionar um
helper em `src/services/viewHelpers.js`, por exemplo `renderNotifications`, e
usa-lo em `layout`, `authView`, `settingsView` e `profileView`.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- Criado o helper `renderNotifications` em `src/services/viewHelpers.js`.
- `layout` passou a aceitar `notifications` e renderizar a pilha flutuante
  global.
- Login, Perfil e Configurações foram migrados para o novo padrão de
  notificacoes.
- Removido o uso visual de `alert-error` e `alert-success` nas views atuais.
- Adicionados estilos responsivos para notificacoes flutuantes em
  `public/css/styles.css`.
- Adicionado fechamento cliente-side por botão `X` em `public/js/app.js`.
- Atualizado o controle de release para registrar a entrega da task.

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
