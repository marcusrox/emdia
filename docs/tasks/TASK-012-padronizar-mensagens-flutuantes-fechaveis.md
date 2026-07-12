# TASK-012 - Padronizar mensagens flutuantes fechaveis

## Contexto

A tela de Perfil (`/profile`) exibe erros de validacao como blocos vermelhos em
linha, ocupando quase toda a largura da pagina antes do formulario. Na captura
analisada, mensagens como `Senha atual incorreta.` e `A confirmacao da nova
senha nao confere.` aparecem como faixas horizontais fixas no fluxo da pagina.

O usuario solicitou que esse tipo de mensagem passe a ser flutuante e possa ser
fechado manualmente ao clicar em um `X`.

## Objetivo

Definir e implementar um padrao unico de mensagens de sistema no EmDia, usando
notificacoes flutuantes fechaveis para erros, sucessos e avisos exibidos nas
telas.

## Padronizacao proposta

- Criar um componente visual global de notificacoes flutuantes, no padrao
  `toast` ou `notification stack`.
- Posicionar as notificacoes no canto superior direito em desktop.
- Em telas pequenas, posicionar as notificacoes no topo, com margens laterais e
  largura responsiva.
- Exibir cada mensagem em um item independente, empilhado com espacamento
  consistente.
- Incluir botao `X` em cada notificacao, com `aria-label` em portugues, para
  fechar a mensagem.
- Manter tons visuais por tipo:
  - erro: vermelho discreto, sem ocupar a pagina toda;
  - sucesso: verde discreto;
  - aviso ou informacao futura: tom neutro ou amarelo discreto.
- Usar `role="alert"` ou `aria-live` quando apropriado para mensagens
  importantes, preservando acessibilidade.
- Fechar a notificacao apenas no cliente, sem refazer a requisicao.
- Preservar escape de HTML para qualquer texto vindo de validacao ou entrada de
  usuario.

## Escopo

- Criar helper ou componente reutilizavel para renderizar notificacoes.
- Substituir os usos atuais de `alert-error` e `alert-success` por esse padrao.
- Atualizar CSS global em `public/css/styles.css`.
- Atualizar JavaScript em `public/js/app.js` para permitir fechar notificacoes
  pelo botao `X`.
- Garantir que multiplas mensagens possam aparecer ao mesmo tempo.
- Garantir que a tela de Perfil exiba os erros de validacao como notificacoes
  flutuantes.
- Garantir que a tela de Configuracoes exiba sucesso como notificacao
  flutuante.
- Garantir que a tela de Login exiba erro de autenticacao como notificacao
  flutuante, sem quebrar a experiencia de acesso.
- Manter mensagens e textos em portugues.

## Fora do escopo

- Alterar regras de validacao de perfil, login ou configuracoes.
- Alterar rotas, models, schema ou persistencia.
- Criar notificacoes com persistencia em banco.
- Criar auto-dismiss obrigatorio nesta etapa.
- Redesenhar formularios ou navegacao.
- Implementar esta task neste momento.

## Varredura realizada

Usos reais encontrados no sistema:

- `src/views/authView.js`: renderiza erro de login com
  `<p class="alert-error">`.
- `src/views/settingsView.js`: renderiza sucesso de configuracao com
  `<p class="alert-success">`.
- `src/views/profileView.js`: renderiza sucesso de perfil com
  `<p class="alert-success">`.
- `src/views/profileView.js`: renderiza cada erro de perfil com
  `<p class="alert-error">`.
- `public/css/styles.css`: define os estilos globais `.alert-error` e
  `.alert-success`.
- `public/js/app.js`: atualmente so fecha menus `details` ao clicar fora; pode
  receber a logica pequena de fechar notificacoes.

Nao foram encontrados outros padroes ativos de mensagens visuais nas views ou
assets estaticos alem das classes `alert-error` e `alert-success`.

## Comportamento esperado

- Mensagens de erro, sucesso e aviso aparecem como notificacoes flutuantes.
- Cada notificacao tem botao `X` clicavel.
- Ao clicar no `X`, somente a notificacao correspondente desaparece.
- Multiplas mensagens sao empilhadas sem sobrepor o topo, menus ou formularios.
- A notificacao nao empurra o conteudo da pagina para baixo.
- A tela de Perfil deixa de exibir faixas vermelhas largas no fluxo da pagina.
- A tela de Login continua exibindo erro de credenciais de forma visivel.
- A tela de Configuracoes continua confirmando salvamento com mensagem de
  sucesso.
- As mensagens continuam escapadas antes de renderizar HTML.
- A solucao funciona em desktop e mobile.

## Criterios de aceite

- Todos os usos atuais de `alert-error` e `alert-success` sao migrados para o
  novo componente de notificacoes.
- Nao ha mais mensagens em bloco largo ocupando o fluxo principal da pagina.
- Cada notificacao possui botao de fechar com texto acessivel.
- O clique no botao `X` remove a notificacao sem erro no console.
- Multiplos erros de Perfil aparecem empilhados e podem ser fechados
  individualmente.
- A mensagem de sucesso de Perfil aparece como notificacao flutuante.
- A mensagem de sucesso de Configuracoes aparece como notificacao flutuante.
- O erro de Login aparece como notificacao flutuante.
- `npm run check` passa apos a implementacao.
- Validacao visual manual confirma o comportamento em desktop e mobile.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar `/login`, informar credenciais invalidas e confirmar notificacao de
  erro fechavel;
- acessar `/profile`, tentar alterar senha com senha atual incorreta e
  confirmacao divergente, confirmando multiplas notificacoes fechaveis;
- salvar Perfil com sucesso e confirmar notificacao verde fechavel;
- acessar `/settings`, salvar configuracao e confirmar notificacao verde
  fechavel;
- repetir os fluxos em viewport mobile;
- conferir que o menu do usuario e a navegacao nao ficam encobertos de forma
  impeditiva pelas notificacoes.

## Observacao de implementacao

A implementacao deve centralizar a renderizacao para evitar novos usos diretos
de `alert-error` e `alert-success` nas views. Uma opcao simples e adicionar um
helper em `src/services/viewHelpers.js`, por exemplo `renderNotifications`, e
usa-lo em `layout`, `authView`, `settingsView` e `profileView`.

Ao concluir a implementacao, atualizar o controle de release em
`src/config/release.js`, incrementando o numero sequencial em 1.

## Implementacao

- Criado o helper `renderNotifications` em `src/services/viewHelpers.js`.
- `layout` passou a aceitar `notifications` e renderizar a pilha flutuante
  global.
- Login, Perfil e Configuracoes foram migrados para o novo padrao de
  notificacoes.
- Removido o uso visual de `alert-error` e `alert-success` nas views atuais.
- Adicionados estilos responsivos para notificacoes flutuantes em
  `public/css/styles.css`.
- Adicionado fechamento cliente-side por botao `X` em `public/js/app.js`.
- Atualizado o controle de release para registrar a entrega da task.

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
