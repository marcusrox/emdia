# TASK-038 - Administrar usuários

## Contexto

O EmDia já autentica usuários, permite a edição do próprio perfil e possui os
campos `is_active` e `is_admin` em `users`. Entretanto, ainda não existe uma
tela administrativa para consultar cadastros, criar usuários, corrigir seus
dados, definir o perfil de acesso, bloquear contas ou redefinir senhas.

Essa ausência obriga intervenções diretas no SQLite e dificulta a administração
segura de instalações com mais de um usuário.

## Objetivo

Criar a página administrativa **Usuários**, disponível apenas para
administradores, com listagem, cadastro e edição de usuários. A tela deve
permitir:

- cadastrar um usuário;
- alterar nome, e-mail, telefone, fuso horário e localidade;
- definir o perfil como **Usuário** ou **Administrador**;
- bloquear e desbloquear o acesso;
- definir uma nova senha administrativa;
- consultar informações básicas de estado e auditoria do cadastro.

Usar a tela **Recorrências** como referência de organização, densidade e ações
por registro, admitindo melhorias de clareza, segurança, responsividade e
acessibilidade.

## Decisões de produto

- A administração de usuários é exclusiva para quem possui `is_admin = 1`.
- Um usuário bloqueado permanece cadastrado e relacionado ao seu histórico
  financeiro; bloqueio não significa exclusão.
- O perfil deve ser apresentado com os rótulos **Usuário** e
  **Administrador**, persistidos pelo campo `is_admin` existente.
- O bloqueio deve reutilizar `is_active`, sem criar um estado paralelo.
- Não haverá exclusão física nem exclusão lógica adicional de usuários nesta
  task.
- A senha nunca deve ser exibida. A ação administrativa apenas define uma nova
  senha e armazena seu hash pelo serviço de autenticação existente.
- A alteração feita por administrador não exige a senha atual do usuário
  editado, mas exige nova senha e confirmação quando a redefinição for
  solicitada.
- A tela não deve expor hash de senha, tokens, cookies, sessões ou outros dados
  sensíveis.
- Não alterar dados financeiros pertencentes ao usuário ao bloquear, desbloquear
  ou trocar seu perfil.

## Rotas e autorização

Adicionar rotas protegidas por autenticação e autorização administrativa:

```text
GET  /admin/users
GET  /admin/users/new
POST /admin/users
GET  /admin/users/:id/edit
POST /admin/users/:id
POST /admin/users/:id/block
POST /admin/users/:id/unblock
POST /admin/users/:id/reset-password
```

Requisitos:

- reutilizar `requireAdmin` ou centralizar o middleware administrativo já
  existente, evitando verificações divergentes entre rotas;
- retornar HTTP 403 para usuário autenticado sem perfil administrativo;
- redirecionar usuário não autenticado ao login conforme o fluxo atual;
- usar POST e proteção CSRF em toda operação que altere dados;
- validar o identificador e retornar HTTP 404 quando o usuário não existir;
- não confiar em campos ocultos ou controles visuais para aplicar autorização.

## Navegação

- adicionar **Usuários** ao menu do usuário, imediatamente abaixo de
  **Ambiente de execução**;
- exibir o item somente para administradores;
- manter a mesma ordem nos menus desktop e mobile;
- usar `/admin/users` como estado ativo;
- manter **Sair** como o último item do menu.

## Listagem de usuários

A página `GET /admin/users` deve seguir a composição visual de Recorrências:
cabeçalho compacto, ação principal no `pageHeading`, tabela responsiva e ações
por registro com ícones Lucide.

Exibir, no mínimo:

- nome;
- e-mail;
- telefone, quando informado;
- perfil: **Usuário** ou **Administrador**;
- estado: **Ativo** ou **Bloqueado**;
- data de criação;
- data da última alteração;
- ações disponíveis.

Requisitos de interação:

- usar **Novo usuário** como ação principal do cabeçalho;
- permitir busca por nome, e-mail e telefone;
- permitir filtro por perfil e estado;
- ordenar inicialmente por nome e e-mail;
- preservar os filtros após uma ação quando for simples fazê-lo com query
  string;
- representar perfil e estado com texto e badge, sem depender apenas de cor;
- usar ações compactas para editar, bloquear ou desbloquear;
- exigir confirmação clara antes de bloquear;
- não oferecer ação de exclusão;
- apresentar estado vazio tanto para ausência de usuários quanto para filtros
  sem resultado.

Em telas estreitas, a listagem pode usar rolagem horizontal controlada ou cards
compactos, desde que nomes, estados e ações permaneçam legíveis e acessíveis.

## Cadastro e edição

Os formulários devem usar `layout.js`, `pageHeading`, helpers de
`viewHelpers.js`, validação padronizada e mensagens em português.

### Dados cadastrais

Permitir editar:

- nome, obrigatório;
- e-mail, obrigatório, válido e único sem diferenciar maiúsculas de minúsculas;
- telefone, opcional, normalizado para E.164 pela regra já existente;
- fuso horário, obrigatório e validado com `Intl.DateTimeFormat`;
- localidade, obrigatória, mantendo `pt-BR` como padrão inicial;
- perfil, com opções **Usuário** e **Administrador**;
- estado, apresentado de maneira explícita.

No cadastro, exigir senha inicial e confirmação. A senha deve seguir no mínimo
a mesma política usada pelo perfil do usuário. Se a política for centralizada
durante a implementação, cadastro, perfil e redefinição administrativa devem
usar a mesma validação.

Na edição, deixar a redefinição de senha em seção separada para evitar trocas
acidentais. Salvar dados cadastrais sem preencher senha não pode alterar o hash
existente.

## Bloqueio e sessões

- bloquear deve definir `is_active = 0`;
- desbloquear deve definir `is_active = 1`;
- uma conta bloqueada não pode iniciar nova sessão;
- ao bloquear um usuário, revogar imediatamente todas as sessões ativas dele;
- ao redefinir a senha, revogar todas as sessões do usuário para exigir novo
  login com a nova credencial;
- a revogação deve ocorrer na mesma transação lógica da alteração sempre que
  possível;
- desbloquear não deve restaurar sessões antigas;
- o bloqueio não deve apagar perfil, preferências, auditoria, lançamentos,
  contas, categorias, notificações ou demais vínculos históricos.

## Proteções administrativas

- impedir que um administrador bloqueie a própria conta durante a sessão
  atual;
- impedir que um administrador remova o próprio perfil administrativo;
- impedir o bloqueio ou rebaixamento do último administrador ativo;
- calcular a existência de outro administrador ativo no backend, no momento da
  gravação, sem depender da listagem previamente renderizada;
- manter ao menos um administrador ativo após qualquer operação;
- quando uma operação for recusada, não alterar parcialmente o usuário e
  mostrar uma mensagem específica;
- ocultar ações impossíveis na interface, sem retirar a validação equivalente
  do backend;
- não permitir que parâmetros adicionais atualizem colunas fora da lista
  autorizada.

## Model e regras de persistência

Ampliar `src/models/User.js` com operações administrativas específicas, sem
reutilizar diretamente `updateProfile` quando isso misturar regras do próprio
perfil com privilégios administrativos.

As consultas devem:

- usar placeholders `?`;
- retornar apenas os campos necessários para a interface;
- incluir usuários ativos e bloqueados na administração;
- tratar unicidade de e-mail de forma consistente para usuários bloqueados;
- gravar `updated_at` com `new Date().toISOString()`;
- converter valores booleanos para `0` e `1` na persistência SQLite;
- usar `hashPassword` do serviço existente para senhas novas;
- nunca retornar `password_hash` para a view.

Como `is_active` e `is_admin` já existem, não criar migration apenas para
duplicar esses campos. Criar migration somente se a implementação identificar
uma necessidade real de schema, preservando compatibilidade com bancos locais.

## Auditoria e log operacional

Registrar em `audit_logs`, no mínimo:

- criação de usuário;
- alteração de dados cadastrais;
- promoção para administrador;
- rebaixamento para usuário normal;
- bloqueio;
- desbloqueio;
- redefinição administrativa de senha.

Os eventos devem identificar o administrador responsável e o usuário afetado.
Diferenças de dados podem incluir campos não sensíveis alterados, perfil e
estado anterior/novo.

Registrar no log operacional o resultado das ações administrativas e as
tentativas recusadas relevantes, usando identificadores técnicos. Nunca
registrar:

- senha informada;
- confirmação de senha;
- hash de senha;
- token, cookie, sessão ou header sensível;
- payload bruto do formulário.

Para redefinição de senha, registrar apenas que a credencial foi alterada.

## Organização visual

- criar uma view administrativa dedicada em `src/views/`, exportada por
  `src/services/viewEngine.js`;
- usar `lucideIcon`, `buttonLink`, `buttonContent`, `csrfInput`, `fieldLabel`,
  `fieldError` e demais helpers existentes;
- não inserir SVG avulso nem adicionar biblioteca de ícones;
- manter o formulário compacto e agrupado em seções de cadastro, acesso e
  segurança;
- diferenciar visualmente ações destrutivas ou sensíveis, como bloqueio e troca
  de perfil, sem exagero cromático;
- manter labels, ajuda contextual, foco visível, `aria-label` e alvos de toque
  adequados;
- respeitar escala de fonte e densidade de listagem configuradas pelo usuário;
- limitar alterações em `public/css/styles.css` às classes necessárias para a
  nova tela.

## Fora de escopo

- exclusão física de usuário;
- transferência em massa de dados financeiros entre usuários;
- recuperação de senha por e-mail ou WhatsApp;
- convite por link, cadastro público ou autoatendimento;
- autenticação multifator;
- criação de perfis adicionais ou permissões granulares além de usuário e
  administrador;
- exibição ou encerramento individual de sessões;
- alteração ampla do layout global, da tela de Recorrências ou do fluxo de
  perfil pessoal.

## Critérios de aceite

- somente administradores veem **Usuários** abaixo de **Ambiente de execução**
  nos menus desktop e mobile;
- usuário comum recebe HTTP 403 ao acessar qualquer rota administrativa de
  usuários;
- a listagem mostra usuários ativos e bloqueados, perfil e ações coerentes;
- busca e filtros funcionam sem expor dados sensíveis;
- é possível criar usuário com nome, e-mail, telefone opcional, fuso,
  localidade, perfil e senha inicial válida;
- e-mail duplicado é recusado mesmo quando pertence a usuário bloqueado;
- é possível alterar os dados cadastrais sem alterar a senha;
- é possível promover e rebaixar usuários respeitando a proteção do último
  administrador ativo;
- o administrador não consegue bloquear a si mesmo nem remover o próprio
  perfil administrativo;
- bloquear impede login e revoga sessões existentes;
- desbloquear permite novo login, mas não reativa sessões antigas;
- redefinir senha exige confirmação, altera o hash e revoga sessões existentes;
- senha, confirmação e hash não aparecem em HTML, auditoria ou logs;
- todas as operações de alteração usam POST, CSRF e validação no backend;
- as ações administrativas relevantes ficam registradas na auditoria;
- a tela é utilizável em desktop e mobile;
- `npm run check` passa após a implementação.

## Cenários de validação

1. Entrar como administrador e confirmar o item **Usuários** na posição correta
   dos dois menus.
2. Entrar como usuário normal, confirmar ausência do item e HTTP 403 nas rotas
   administrativas.
3. Criar usuário normal, sair e autenticar com a senha inicial.
4. Tentar criar ou editar com e-mail duplicado, e-mail inválido, telefone
   inválido, fuso inválido e senhas divergentes.
5. Editar apenas nome e telefone e confirmar que a senha anterior continua
   válida.
6. Promover um usuário, confirmar novo acesso administrativo e evento de
   auditoria.
7. Rebaixar um administrador quando houver outro administrador ativo.
8. Tentar rebaixar ou bloquear o último administrador ativo e confirmar que
   nenhuma alteração ocorre.
9. Tentar bloquear ou rebaixar o próprio administrador autenticado.
10. Manter uma sessão aberta para outro usuário, bloqueá-lo e confirmar que a
    próxima requisição autenticada exige login.
11. Desbloquear o usuário e confirmar que apenas um novo login cria sessão
    válida.
12. Redefinir a senha de um usuário, confirmar revogação das sessões, falha da
    senha antiga e sucesso da nova senha.
13. Inspecionar HTML, `audit_logs` e log operacional para confirmar ausência de
    senha, confirmação, hash, token e cookie.
14. Validar responsividade, foco por teclado, mensagens de erro e ações em tela
    estreita.
15. Executar `npm run check` e validar `GET /health`, `GET /admin/users` e os
    principais POSTs em servidor iniciado explicitamente na porta 3100 ou na
    próxima porta livre.

## Arquivos candidatos

- `src/models/User.js`;
- `src/services/authService.js`;
- `src/services/viewEngine.js`;
- `src/views/layout.js`;
- nova view em `src/views/`;
- `src/server.js`;
- `public/css/styles.css`;
- `src/config/release.js` ao concluir a implementação;
- testes ou scripts de validação existentes, quando aplicável.

## Implementação

- ampliado `User` com listagem filtrada, cadastro, edição, bloqueio,
  desbloqueio e redefinição administrativa de senha;
- protegidos o próprio administrador e o último administrador ativo contra
  bloqueio ou rebaixamento;
- bloqueio e redefinição de senha passaram a revogar sessões na mesma transação
  da alteração;
- adicionadas rotas administrativas com POST, CSRF, validação, auditoria e log
  operacional sanitizado;
- criada `usersAdminView.js` com listagem, filtros, badges, ações compactas e
  formulários responsivos;
- adicionado **Usuários** abaixo de **Ambiente de execução** somente para
  administradores, nos menus desktop e mobile;
- atualizado o agregador de views, o script de validação sintática, os estilos
  e o controle de release.
- adicionado o indicador **Acesso administrativo** ao cabeçalho da listagem e
  alinhadas as ações **Filtrar** e **Limpar** aos campos de filtro.

---

## Assinatura da LLM

- Data: 17/07/2026 22:23
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 17/07/2026 22:31
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao

---

## Assinatura da LLM

- Data: 17/07/2026 22:42
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
