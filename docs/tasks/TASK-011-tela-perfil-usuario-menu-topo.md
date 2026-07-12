# TASK-011 - Criar tela de Perfil do usuario no menu do topo

## Contexto

O EmDia ja possui um menu do usuario no topo direito da interface, tanto no
desktop quanto no mobile. Esse menu hoje oferece as opcoes `Configuracoes` e
`Sair`.

O usuario solicitou uma nova tela de Perfil de usuario e que ela seja acessivel
como um novo item dentro desse menu ja existente no topo direito.

## Objetivo

Criar uma tela de Perfil do usuario autenticado, permitir a edicao de nome,
e-mail e senha do proprio usuario, e adicionar o item `Perfil` ao menu do
usuario no topo direito, preservando o comportamento atual de `Configuracoes` e
`Sair`.

## Escopo

- Criar a rota autenticada `GET /profile`.
- Criar a rota autenticada `POST /profile`.
- Criar uma view dedicada para a tela de Perfil do usuario.
- Exibir e permitir edicao de nome e e-mail do usuario autenticado.
- Permitir alteracao de senha do usuario autenticado.
- Exigir confirmacao da nova senha antes de gravar.
- Validar formato de e-mail e impedir e-mail duplicado, se houver mais de um
  usuario cadastrado.
- Atualizar dados de sessao exibidos no topo apos alteracao de nome ou e-mail.
- Adicionar o link `Perfil` ao menu do usuario no topo direito no desktop.
- Adicionar o link `Perfil` ao menu do usuario no mobile.
- Manter `Configuracoes` e `Sair` no mesmo menu.
- Proteger o formulario com CSRF.
- Preservar o logout como `POST /logout` com CSRF.
- Manter mensagens e textos em portugues.
- Atualizar o controle de release ao concluir a implementacao.

## Fora do escopo

- Editar idioma, fuso horario ou status ativo do usuario.
- Criar fluxo de recuperacao de senha.
- Enviar e-mail de confirmacao ou verificacao de e-mail.
- Criar administracao de outros usuarios.
- Criar novas tabelas ou alterar schema do banco.
- Alterar regras de autenticacao, sessao, login ou logout.
- Mover `Configuracoes` para dentro da tela de Perfil.
- Redesenhar o topo ou a navegacao principal.


## Diagnostico inicial

- `src/views/layout.js`: renderiza o menu do usuario no topo direito.
- `src/views/layout.js`: o menu aparece em duas variantes, desktop e mobile.
- `src/views/settingsView.js`: pode servir como referencia de estrutura visual
  para uma tela autenticada simples.
- `src/server.js`: deve receber a rota autenticada `GET /profile`.
- `src/server.js`: deve receber a rota autenticada `POST /profile` com validacao
  CSRF.
- `src/models/User.js`: deve concentrar validacoes e persistencia da atualizacao
  de perfil, seguindo os padroes existentes de hash de senha.
- `src/services/viewEngine.js`: deve exportar a nova view se o padrao atual for
  mantido.

## Comportamento esperado

- O menu do usuario exibe a opcao `Perfil`.
- Ao clicar em `Perfil`, o usuario acessa `/profile`.
- `/profile` mostra um formulario com nome e e-mail preenchidos.
- O usuario pode salvar alteracoes de nome e e-mail.
- O usuario pode alterar a propria senha informando senha atual, nova senha e
  confirmacao.
- A senha deve permanecer inalterada quando os campos de alteracao de senha
  estiverem vazios.
- Erros de validacao devem ser exibidos na propria tela de Perfil sem expor
  dados sensiveis.
- Usuarios nao autenticados continuam sendo redirecionados para `/login`.
- O menu continua exibindo `Configuracoes` e `Sair`.
- O comportamento de logout nao e alterado.

## Criterios de aceite

- `GET /profile` retorna 200 para usuario autenticado.
- O item `Perfil` aparece no menu do usuario no desktop.
- O item `Perfil` aparece no menu do usuario no mobile.
- A tela de Perfil usa o layout padrao do EmDia.
- A tela escapa dados do usuario antes de renderizar HTML.
- O formulario permite editar nome e e-mail.
- A alteracao de senha exige senha atual correta.
- A alteracao de senha exige confirmacao igual a nova senha.
- Salvar nome/e-mail sem preencher nova senha nao altera a senha.
- E-mail invalido ou duplicado retorna erro amigavel.
- Senha atual incorreta retorna erro amigavel.
- Dados atualizados aparecem no topo quando nome ou e-mail mudam.
- Nenhuma informacao sensivel, senha ou hash e exibido.
- `Configuracoes` continua levando para `/settings`.
- `Sair` continua executando `POST /logout` com CSRF.
- `npm run check` passa apos a implementacao.

## Validacao sugerida

```powershell
npm run check
```

Fluxos manuais:

- acessar o sistema autenticado;
- abrir o menu do usuario no desktop;
- confirmar que `Perfil`, `Configuracoes` e `Sair` aparecem;
- clicar em `Perfil` e confirmar que `/profile` abre corretamente;
- alterar apenas o nome e confirmar que o topo reflete o novo nome;
- alterar apenas o e-mail e confirmar que o novo e-mail passa a ser exibido no
  perfil;
- tentar salvar e-mail invalido e confirmar mensagem de erro;
- tentar alterar senha com senha atual incorreta e confirmar mensagem de erro;
- tentar alterar senha com confirmacao divergente e confirmar mensagem de erro;
- alterar senha com senha atual correta e confirmacao correta;
- fazer logout e login com a nova senha;
- abrir o menu do usuario em viewport mobile;
- confirmar que `Perfil`, `Configuracoes` e `Sair` aparecem;
- acessar `/profile` sem sessao e confirmar redirecionamento para `/login`;
- conferir que logout continua funcionando.

## Observacao de implementacao

Esta task registra a solicitacao de criacao da tela de Perfil e do novo item de
menu. A implementacao nao deve ser feita nesta etapa.

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-11
- Modelo: GPT-5 Codex
- Versao: nao informado
- Acao: atualizacao
