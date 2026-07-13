# TASK-024 - Evoluir AuditLog para recurso de auditoria funcional

## Contexto

O projeto já possui o model `src/models/AuditLog.js` e a tabela `audit_logs`.
Hoje esse recurso registra algumas ações financeiras relevantes, como criação,
edição, cancelamento e baixa de lançamentos, além de eventos ligados a
recorrências.

Apesar disso, a auditoria ainda funciona como uma trilha técnica interna: grava
dados no banco, mas não possui consulta estruturada, tela própria, filtros,
padronização completa de payloads ou cobertura ampla dos principais cadastros e
configurações.

Esta task descreve a evolução do `AuditLog` para um recurso funcional de
auditoria, útil para investigação, suporte e conferência do histórico de ações
realizadas no EmDia.

## Objetivo

Transformar a auditoria existente em um recurso consultável e mais completo,
mantendo a separação entre:

- `AuditLog`: histórico funcional de ações de negócio persistido em SQLite;
- log operacional em arquivo texto: eventos técnicos e operacionais da
  aplicação.

O foco desta task é o `AuditLog`, não o log operacional diário.

## Decisões de produto

- A auditoria deve responder "quem fez o quê, quando e sobre qual entidade".
- A auditoria deve priorizar ações de negócio relevantes.
- A auditoria deve ser consultável pelo usuário autenticado.
- O MVP pode começar com uma tela simples, em formato de tabela.
- A auditoria deve ser segura: não registrar senhas, tokens, cookies, headers,
  `.env`, dados bancários sensíveis ou payloads integrais de formulários.
- O payload deve ajudar na investigação, mas não deve expor informação
  desnecessária.
- Registros de auditoria não devem ser editáveis pela interface.
- Não implementar exclusão de auditoria nesta primeira evolução.

## Escopo

- Evoluir `src/models/AuditLog.js` com métodos de consulta/listagem.
- Criar uma tela de auditoria funcional.
- Adicionar rota protegida para consultar auditoria.
- Adicionar filtros por período, entidade, ação e usuário quando aplicável.
- Padronizar ações registradas em `audit_logs.action`.
- Padronizar payloads gravados em `payload_json`.
- Adicionar sanitização explícita para payloads de auditoria.
- Ampliar cobertura de auditoria para cadastros e configurações relevantes.
- Garantir que a auditoria respeite `user_id`.
- Adicionar entrada de navegação apenas se fizer sentido para o MVP atual.
- Atualizar documentação da task ao concluir a implementação.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Alterar o log operacional em arquivo texto.
- Exportação CSV de auditoria.
- Retenção automática ou expurgo de registros antigos.
- Assinatura criptográfica dos registros.
- Imutabilidade forte contra alteração direta no banco.
- Dashboard analítico de auditoria.
- Auditoria de leitura de todas as telas.
- Multiusuário avançado ou papéis administrativos complexos.
- Implementar esta task neste momento.

## Estado atual

O model atual expõe apenas:

```js
AuditLog.record(userId, entityType, entityId, action, payload)
```

Essa função insere uma linha em `audit_logs` com:

- `id`;
- `user_id`;
- `entity_type`;
- `entity_id`;
- `action`;
- `payload_json`;
- `created_at`.

Usos atuais conhecidos:

- `financial_entry.created`;
- `financial_entry.updated`;
- `financial_entry.cancelled`;
- `financial_entry.settled`;
- `recurrence.created`;
- `recurrence.updated`;
- `financial_entry.recurrence_generated`;
- ações de pausa, ativação e encerramento de recorrência.

## Modelo de dados

A tabela atual pode continuar sendo usada:

```text
audit_logs
  id
  user_id
  entity_type
  entity_id
  action
  payload_json
  created_at
```

Antes de adicionar colunas, avaliar se a necessidade pode ser atendida com os
campos atuais.

Colunas futuras possíveis, se houver justificativa clara:

- `actor_user_id`, se o sistema evoluir para múltiplos usuários administrando
  dados de terceiros;
- `ip_address`, se houver política definida para registrar origem;
- `user_agent`, se houver necessidade real de suporte;
- `request_id`, se o servidor passar a gerar identificador por requisição.

Para esta primeira evolução, preferir não alterar o schema se os campos atuais
forem suficientes.

## Métodos sugeridos no model

Adicionar ao `AuditLog` métodos como:

```js
list(userId, filters)
getById(userId, id)
listEntityHistory(userId, entityType, entityId)
```

Filtros sugeridos para `list`:

- `from_date`;
- `to_date`;
- `entity_type`;
- `entity_id`;
- `action`;
- `q`, busca textual simples em entidade/ação/payload;
- `limit`;
- `offset`.

Regras:

- sempre filtrar por `user_id`;
- usar placeholders `?`;
- ordenar por `created_at DESC`;
- limitar a quantidade padrão de resultados, por exemplo 100;
- evitar carregar todo o histórico sem limite.

## Tela sugerida

Criar uma tela protegida, por exemplo:

```text
GET /audit
```

Nome de navegação sugerido:

```text
Auditoria
```

A tela deve exibir uma tabela com:

- data/hora;
- entidade;
- identificador da entidade;
- ação;
- resumo do payload;
- usuário.

Filtros visíveis:

- período inicial;
- período final;
- entidade;
- ação;
- texto livre.

Microcopy sugerida:

- "A auditoria mostra ações relevantes registradas no sistema."
- "Dados sensíveis não são exibidos neste histórico."

Não transformar a tela em dashboard. Ela deve ser uma listagem operacional
simples, útil para inspeção.

## Histórico por entidade

Quando possível, adicionar blocos de histórico em telas de detalhe.

Primeiro candidato:

- detalhe de lançamento financeiro.

Exibir uma seção discreta como:

```text
Histórico
```

Com eventos como:

- criado;
- editado;
- baixado;
- cancelado;
- gerado por recorrência.

Essa seção deve usar `AuditLog.listEntityHistory(userId, "financial_entry", id)`.

## Padronização de entidades

Usar valores estáveis para `entity_type`.

Valores atuais e sugeridos:

- `financial_entry`;
- `settlement`;
- `recurrence`;
- `financial_account`;
- `category`;
- `user`;
- `settings`.

Evitar nomes em português no banco para `entity_type`, mantendo consistência com
o restante dos models.

## Padronização de ações

Usar ações estáveis e curtas em inglês técnico.

Ações sugeridas:

- `created`;
- `updated`;
- `deleted`;
- `restored`;
- `cancelled`;
- `settled`;
- `reversed`;
- `paused`;
- `activated`;
- `ended`;
- `recurrence_generated`;
- `profile_updated`;
- `settings_updated`.

Na interface, mapear essas ações para labels em português.

Exemplos:

- `created` -> "Criado";
- `updated` -> "Editado";
- `settled` -> "Baixado";
- `cancelled` -> "Cancelado";
- `recurrence_generated` -> "Gerado por recorrência".

## Payloads sugeridos

O payload deve ser pequeno e seguro.

Exemplos aceitáveis:

```json
{"description":"Internet residencial"}
```

```json
{"competence_month":"2026-07","status":"PAID"}
```

```json
{"settlement_id":"set_...","total_cents":11990}
```

Evitar:

- request body completo;
- senha;
- hash de senha;
- cookie;
- token CSRF;
- headers;
- conteúdo de `.env`;
- dados bancários completos;
- observações longas quando puderem conter informação sensível.

## Sanitização obrigatória

Adicionar sanitização explícita no `AuditLog.record`.

Chaves sensíveis devem ser mascaradas:

- `password`;
- `senha`;
- `password_hash`;
- `token`;
- `secret`;
- `authorization`;
- `cookie`;
- `csrf`;
- `session`;
- `headers`;
- `env`;
- `accountNumber`;
- `bankAccount`;

Quando encontradas, gravar:

```text
[redacted]
```

Também considerar truncar strings longas no payload para evitar logs enormes.

## Cobertura adicional de auditoria

Adicionar auditoria para fluxos que já existem hoje e alteram dados relevantes.

Cadastros:

- conta financeira criada;
- conta financeira editada;
- conta financeira arquivada/excluída logicamente;
- conta financeira restaurada;
- categoria criada;
- categoria editada;
- categoria arquivada/excluída logicamente;
- categoria restaurada.

Usuário e preferências:

- perfil atualizado;
- preferências de interface atualizadas.

Recorrências:

- confirmar cobertura de criação;
- confirmar cobertura de edição;
- confirmar cobertura de pausa;
- confirmar cobertura de ativação;
- confirmar cobertura de encerramento;
- confirmar cobertura de geração automática.

Lançamentos:

- confirmar cobertura de criação;
- confirmar cobertura de edição;
- confirmar cobertura de cancelamento;
- confirmar cobertura de baixa;
- avaliar auditoria de duplicação.

## Relação com o log operacional

Não duplicar responsabilidades.

Exemplos que pertencem ao `AuditLog`:

- usuário criou um lançamento;
- usuário baixou uma despesa;
- usuário editou uma categoria;
- usuário alterou preferências.

Exemplos que pertencem ao log operacional:

- aplicação iniciou;
- conexão SQLite abriu;
- login falhou;
- rota protegida foi acessada sem sessão;
- erro funcional impediu uma operação.

Alguns eventos podem existir nos dois lugares se tiverem propósitos diferentes,
mas isso deve ser deliberado.

## Segurança e privacidade

- Sempre filtrar auditoria por `user_id`.
- Não permitir consultar auditoria de outro usuário.
- Escapar dados dinâmicos na view com `escapeHtml`.
- Não renderizar `payload_json` bruto como HTML.
- Tratar JSON inválido ou legado sem quebrar a tela.
- Não exibir segredos mesmo que algum registro antigo contenha dados indevidos.
- Não adicionar rota pública para auditoria.

## Critérios de aceite

- `AuditLog.record` sanitiza payloads sensíveis antes de gravar.
- O model possui método de listagem com filtros e limite.
- A tela `/audit` é protegida por autenticação.
- A tela lista registros da auditoria em ordem decrescente de criação.
- A tela permite filtrar por período, entidade, ação e texto livre.
- A tela exibe labels em português para entidades e ações conhecidas.
- A tela não quebra quando `payload_json` está vazio ou inválido.
- Dados dinâmicos são escapados no HTML.
- A consulta usa placeholders `?`.
- A consulta sempre respeita `user_id`.
- Contas financeiras passam a registrar auditoria nas ações relevantes.
- Categorias passam a registrar auditoria nas ações relevantes.
- Perfil e preferências passam a registrar auditoria nas ações relevantes.
- Lançamentos e recorrências mantêm a auditoria já existente.
- Arquivos de log operacional não são alterados por esta task.
- `npm run check` passa após a implementação.

## Validação sugerida

Validação sintática:

```powershell
npm run check
```

Fluxos manuais:

- criar uma conta financeira;
- editar a conta;
- arquivar a conta;
- restaurar a conta;
- criar uma categoria;
- editar a categoria;
- arquivar a categoria;
- restaurar a categoria;
- criar um lançamento;
- editar o lançamento;
- registrar baixa;
- cancelar o lançamento;
- alterar preferências de interface;
- abrir `/audit`;
- filtrar por entidade `financial_entry`;
- filtrar por ação `settled`;
- filtrar por período;
- pesquisar por texto livre;
- abrir um registro com payload vazio ou legado, se existir;
- confirmar que nenhum payload exibe senha, token, cookie ou headers.

Se for adicionada seção de histórico no detalhe do lançamento:

- abrir um lançamento com eventos;
- confirmar que o histórico aparece em ordem cronológica adequada;
- confirmar que labels e payload resumido estão legíveis em português.

## Observações de implementação

Manter a implementação alinhada ao projeto atual:

- CommonJS;
- Express;
- SQLite com `node:sqlite`;
- views em `src/views/*.js`;
- agregação por `src/services/viewEngine.js`;
- helpers de HTML em `src/services/viewHelpers.js`;
- mensagens de interface em português;
- sem dependências novas.

Evitar refatorar todos os models de uma vez. Priorizar cobertura dos fluxos
existentes e manter patches pequenos.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- `AuditLog.record` passou a sanitizar payloads antes da gravação.
- Foram adicionados métodos de consulta em `AuditLog`:
  - `list(userId, filters)`;
  - `getById(userId, id)`;
  - `listEntityHistory(userId, entityType, entityId)`.
- A listagem filtra sempre por `user_id`, usa placeholders `?`, ordena por
  `created_at DESC` e aplica limite padrão.
- Foi criada a view `src/views/auditView.js` para a tela funcional de auditoria.
- Foi adicionada a rota protegida `GET /audit`.
- A tela `/audit` permite filtrar por período, entidade, ação e texto livre.
- Entidades e ações conhecidas são exibidas com labels em português.
- Payloads vazios, ausentes ou inválidos são tratados sem quebrar a tela.
- A navegação principal recebeu a entrada `Auditoria`.
- O detalhe do lançamento passou a exibir um histórico de auditoria da entidade.
- Contas financeiras passaram a registrar auditoria em criação, edição,
  arquivamento e restauração.
- Categorias passaram a registrar auditoria em criação, edição, arquivamento e
  restauração.
- Atualizações de perfil passaram a registrar auditoria sem gravar senhas.
- Atualizações de preferências passaram a registrar auditoria.
- A duplicação de lançamentos passou a registrar auditoria no lançamento criado,
  apontando o lançamento de origem.
- O script `npm run check` foi atualizado para validar os arquivos novos e os
  models alterados.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-12 23:55
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-13 00:04
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
