# TASK-037 - Administrar fila de notificações

## Contexto

O EmDia persiste notificações WhatsApp na tabela `notifications`, mas não
oferecia interface para consultar ou atuar sobre os itens. A investigação de
falhas e o reprocessamento dependiam de acesso direto ao SQLite.

## Objetivo

Criar uma página administrativa compacta e responsiva para consultar toda a
fila, filtrar por usuário, status e tipo, reenviar notificações sem apagar o
histórico e cancelar itens ainda processáveis.

## Escopo

- adicionar papel administrativo explícito em `users`;
- promover o usuário local mais antigo quando ainda não existir administrador;
- proteger rotas de consulta e operação com autorização administrativa;
- listar notificações de todos os usuários com filtros e limite configurável;
- apresentar resumo visual de pendentes, falhas e enviadas;
- permitir reenvio por meio de uma nova notificação `PENDING`;
- permitir cancelamento apenas de itens `PENDING` ou `FAILED`;
- registrar reenvio e cancelamento na auditoria;
- adicionar **Fila de notificações** abaixo de **Auditoria** no menu do
  administrador;
- usar ícones Lucide, cores semânticas, tipografia variada e layout compacto.

## Regras funcionais

- usuários sem `is_admin` recebem HTTP 403 e não veem o item de menu;
- o reenvio preserva o registro original e cria chave de idempotência nova;
- itens enviados ou já cancelados não podem ser cancelados;
- operações de alteração usam POST e proteção CSRF;
- a busca cobre identificador, mensagem persistida e último erro;
- nenhuma credencial do provedor deve ser exibida.

## Critérios de aceite

- `GET /admin/notifications` lista a fila em ordem decrescente de criação;
- o filtro por usuário permite selecionar qualquer usuário cadastrado;
- status e tipos possuem rótulos e cores legíveis;
- reenvio cria item pendente e mantém o item de origem intacto;
- cancelamento retira o item do consumo normal da fila;
- ações administrativas ficam registradas em `audit_logs`;
- a tela permanece utilizável em desktop e dispositivos menores;
- `npm run check` passa com os novos arquivos.

## Implementação

- criada a migration `004_add_user_admin_role.js`;
- ampliados os models `User` e `Notification` para consulta e operações;
- criadas rotas administrativas de listagem, reenvio e cancelamento;
- criada a view `notificationQueueView.js` e seus estilos responsivos;
- atualizado o agregador de views, o menu, o script de check e o release.

---

## Assinatura da LLM

- Data: 17/07/2026 21:51
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao
