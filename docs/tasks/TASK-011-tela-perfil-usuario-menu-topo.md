# TASK-011 - Criar tela de Perfil do usuário no menu do topo

## Contexto

O EmDia já possui um menu do usuário no topo direito da interface, tanto no
desktop quanto no mobile. Esse menu hoje oferece as opções `Configurações` e
`Sair`.

O usuário solicitou uma nova tela de Perfil de usuário e que ela seja acessivel
como um novo item dentro desse menu já existente no topo direito.

## Objetivo

Criar uma tela de Perfil do usuário autenticado, permitir a edição de nome,
e-mail e senha do próprio usuário, e adicionar o item `Perfil` ao menu do
usuário no topo direito, preservando o comportamento atual de `Configurações` e
`Sair`.

## Escopo

- Criar a rota autenticada `GET /profile`.
- Criar a rota autenticada `POST /profile`.
- Criar uma view dedicada para a tela de Perfil do usuário.
- Exibir e permitir edição de nome e e-mail do usuário autenticado.
- Permitir alteração de senha do usuário autenticado.
- Exigir confirmação da nova senha antes de gravar.
- Validar formato de e-mail e impedir e-mail duplicado, se houver mais de um
  usuário cadastrado.
- Atualizar dados de sessão exibidos no topo após alteração de nome ou e-mail.
- Adicionar o link `Perfil` ao menu do usuário no topo direito no desktop.
- Adicionar o link `Perfil` ao menu do usuário no mobile.
- Manter `Configurações` e `Sair` no mesmo menu.
- Proteger o formulário com CSRF.
- Preservar o logout como `POST /logout` com CSRF.
- Manter mensagens e textos em português.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Editar idioma, fuso horario ou status ativo do usuário.
- Criar fluxo de recuperacao de senha.
- Enviar e-mail de confirmação ou verificacao de e-mail.
- Criar administracao de outros usuários.
- Criar novas tabelas ou alterar schema do banco.
- Alterar regras de autenticação, sessão, login ou logout.
- Mover `Configurações` para dentro da tela de Perfil.
- Redesenhar o topo ou a navegação principal.


## Diagnostico inicial

- `src/views/layout.js`: renderiza o menu do usuário no topo direito.
- `src/views/layout.js`: o menu aparece em duas variantes, desktop e mobile.
- `src/views/settingsView.js`: pode servir como referência de estrutura visual
  para uma tela autenticada simples.
- `src/server.js`: deve receber a rota autenticada `GET /profile`.
- `src/server.js`: deve receber a rota autenticada `POST /profile` com validação
  CSRF.
- `src/models/User.js`: deve concentrar validações e persistência da atualização
  de perfil, seguindo os padrões existentes de hash de senha.
- `src/services/viewEngine.js`: deve exportar a nova view se o padrão atual for
  mantido.

## Comportamento esperado

- O menu do usuário exibe a opção `Perfil`.
- Ao clicar em `Perfil`, o usuário acessa `/profile`.
- `/profile` mostra um formulário com nome e e-mail preenchidos.
- O usuário pode salvar alterações de nome e e-mail.
- O usuário pode alterar a própria senha informando senha atual, nova senha e
  confirmação.
- A senha deve permanecer inalterada quando os campos de alteração de senha
  estiverem vazios.
- Erros de validação devem ser exibidos na própria tela de Perfil sem expor
  dados sensiveis.
- Usuários não autenticados continuam sendo redirecionados para `/login`.
- O menu continua exibindo `Configurações` e `Sair`.
- O comportamento de logout não e alterado.

## Critérios de aceite

- `GET /profile` retorna 200 para usuário autenticado.
- O item `Perfil` aparece no menu do usuário no desktop.
- O item `Perfil` aparece no menu do usuário no mobile.
- A tela de Perfil usa o layout padrão do EmDia.
- A tela escapa dados do usuário antes de renderizar HTML.
- O formulário permite editar nome e e-mail.
- A alteração de senha exige senha atual correta.
- A alteração de senha exige confirmação igual a nova senha.
- Salvar nome/e-mail sem preencher nova senha não altera a senha.
- E-mail invalido ou duplicado retorna erro amigavel.
- Senha atual incorreta retorna erro amigavel.
- Dados atualizados aparecem no topo quando nome ou e-mail mudam.
- Nenhuma informação sensivel, senha ou hash e exibido.
- `Configurações` continua levando para `/settings`.
- `Sair` continua executando `POST /logout` com CSRF.
- `npm run check` passa após a implementação.

## Validação sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar o sistema autenticado;
- abrir o menu do usuário no desktop;
- confirmar que `Perfil`, `Configurações` e `Sair` aparecem;
- clicar em `Perfil` e confirmar que `/profile` abre corretamente;
- alterar apenas o nome e confirmar que o topo reflete o novo nome;
- alterar apenas o e-mail e confirmar que o novo e-mail passa a ser exibido no
  perfil;
- tentar salvar e-mail invalido e confirmar mensagem de erro;
- tentar alterar senha com senha atual incorreta e confirmar mensagem de erro;
- tentar alterar senha com confirmação divergente e confirmar mensagem de erro;
- alterar senha com senha atual correta e confirmação correta;
- fazer logout e login com a nova senha;
- abrir o menu do usuário em viewport mobile;
- confirmar que `Perfil`, `Configurações` e `Sair` aparecem;
- acessar `/profile` sem sessão e confirmar redirecionamento para `/login`;
- conferir que logout continua funcionando.

## Observação de implementação

Esta task registra a solicitacao de criação da tela de Perfil e do novo item de
menu. A implementação não deve ser feita nesta etapa.

## Implementação

- Criada a view `src/views/profileView.js` para exibição e edição do perfil.
- Adicionados os links `Perfil` ao menu do usuário no desktop e no mobile.
- Criadas as rotas autenticadas `GET /profile` e `POST /profile`.
- Adicionada a persistência de nome, e-mail e senha em `User.updateProfile`.
- Alteração de senha exige senha atual correta e confirmação da nova senha.
- Nome, e-mail e senha sao validados antes da gravacao.
- Dados sensiveis como hash de senha não sao renderizados na tela.
- Release atualizada para registrar a entrega da task.

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

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: não informado
- Ação: atualização
