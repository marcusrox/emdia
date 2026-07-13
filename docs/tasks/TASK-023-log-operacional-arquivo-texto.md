# TASK-023 - Log operacional em arquivo texto diário

## Contexto

O EmDia já possui regras de negócio financeiras, autenticação local, seed,
bootstrap e fluxos sensíveis que merecem rastreabilidade operacional. Hoje, a
aplicação pode informar erros técnicos no console, mas ainda não possui um log
simples em arquivo texto para registrar ações importantes do sistema ao longo do
tempo.

Esta task propõe criar um log operacional em arquivos dentro da pasta `log/` da
aplicação, com rotação diária por nome de arquivo. O objetivo é permitir suporte,
auditoria local e investigação de problemas sem registrar dados sensíveis.

## Objetivo

Registrar eventos operacionais relevantes em arquivo texto diário, criando
automaticamente um novo arquivo quando o dia mudar.

O log deve cobrir:

- startup da aplicação;
- encerramento;
- autenticação e sessão;
- operações sensíveis;
- erros funcionais importantes.

## Decisões de produto

- O log operacional deve ser simples, local e legível.
- O arquivo deve ficar dentro de `log/` na raiz da aplicação.
- O nome do arquivo deve conter a data civil atual.
- O sistema deve começar a gravar em outro arquivo automaticamente no dia
  seguinte, sem precisar reiniciar a aplicação.
- O log deve registrar eventos de negócio e operação, não detalhes técnicos
  excessivos.
- O log não substitui a auditoria financeira em banco quando existir um recurso
  próprio para isso.
- O log não deve conter senha, token, conteúdo de `.env`, cookies, headers
  sensíveis, dados bancários completos ou payloads integrais de formulário.

## Escopo

- Criar um serviço de log operacional.
- Garantir criação automática da pasta `log/`, se ela não existir.
- Gerar arquivo diário de log com data no nome.
- Registrar eventos de startup.
- Registrar eventos de encerramento controlado.
- Registrar eventos de autenticação e sessão.
- Registrar operações sensíveis.
- Registrar erros funcionais importantes.
- Padronizar o formato das linhas do arquivo.
- Evitar vazamento de dados sensíveis.
- Atualizar `.gitignore` se necessário para impedir versionamento dos arquivos
  de log gerados.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Tela de visualização de logs.
- Download de logs pela interface.
- Rotação por tamanho de arquivo.
- Compressão ou expurgo automático de logs antigos.
- Envio de logs para serviço externo.
- Observabilidade distribuída.
- Alteração da tabela de auditoria financeira, caso exista.
- Implementar esta task neste momento.

## Pasta e nome dos arquivos

Criar os logs em:

```text
log/
```

Nome sugerido:

```text
operacional-YYYY-MM-DD.log
```

Exemplos:

```text
log/operacional-2026-07-12.log
log/operacional-2026-07-13.log
```

A data do nome do arquivo deve ser calculada no momento de cada escrita. Assim,
se a aplicação continuar aberta durante a virada do dia, o próximo evento já
será escrito no arquivo do novo dia.

## Formato sugerido

Usar uma linha por evento em arquivo texto. O formato recomendado é JSON Lines,
pois continua sendo texto legível e facilita filtros futuros.

Exemplo conceitual:

```json
{"timestamp":"2026-07-12T23:32:00.000Z","level":"info","event":"app.startup","message":"Aplicação iniciada","release":"Release 12/07/2026 22:45 - 019","details":{"port":3100}}
```

Campos sugeridos:

- `timestamp`: instante em ISO, usando `new Date().toISOString()`;
- `level`: `info`, `warn` ou `error`;
- `event`: identificador estável do evento;
- `message`: mensagem curta em português;
- `userId`: opcional, quando houver usuário autenticado;
- `username`: opcional, quando for seguro registrar;
- `entity`: opcional, tipo da entidade envolvida;
- `entityId`: opcional, identificador da entidade envolvida;
- `competenceMonth`: opcional, quando o evento estiver ligado a competência;
- `requestId`: opcional, se o projeto vier a ter identificador de requisição;
- `details`: objeto opcional com metadados seguros.

Não registrar objetos completos de request, response, sessão ou formulário.

## Serviço sugerido

Criar um service dedicado, por exemplo:

```text
src/services/operationalLogger.js
```

Responsabilidades:

- montar o caminho do arquivo diário;
- criar `log/` automaticamente;
- serializar o evento em uma linha;
- gravar com append;
- tratar falhas de escrita sem quebrar o fluxo principal da aplicação;
- sanitizar campos sensíveis antes de gravar;
- expor métodos simples para o restante do sistema.

API conceitual:

```js
logOperationalEvent({
  level,
  event,
  message,
  user,
  entity,
  entityId,
  competenceMonth,
  details,
});
```

Helpers opcionais:

- `logInfo(event, message, context)`;
- `logWarn(event, message, context)`;
- `logError(event, message, context)`.

## Sanitização obrigatória

Antes de gravar `details`, remover ou mascarar chaves sensíveis.

Chaves a tratar como sensíveis:

- `password`;
- `senha`;
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

Quando uma chave sensível aparecer, registrar apenas `"[redacted]"`.

Evitar registrar valores monetários detalhados em eventos de autenticação ou
operação técnica. Quando eventos financeiros forem necessários em outra task,
preferir IDs, competência e tipo de ação, preservando a regra de não expor dados
sensíveis em excesso.

## Eventos de startup

Registrar eventos como:

- `app.startup.begin`: início do bootstrap;
- `app.startup.config_loaded`: configurações básicas carregadas, sem conteúdo
  sensível;
- `app.startup.database_connected`: banco conectado;
- `app.startup.schema_ready`: schema verificado/criado;
- `app.startup.seed_requested`: seed executado manualmente, quando aplicável;
- `app.startup.http_listening`: servidor HTTP ouvindo porta;
- `app.startup.failed`: falha crítica durante inicialização.

Metadados seguros sugeridos:

- release atual;
- porta;
- ambiente lógico, se existir;
- nome do processo de entrada, como `app.js`;
- versão do Node, se útil;
- mensagem curta de erro em falhas.

Não registrar valores de `.env`.

## Eventos de encerramento

Registrar eventos como:

- `app.shutdown.requested`: encerramento solicitado por sinal conhecido;
- `app.shutdown.http_closed`: servidor HTTP encerrado;
- `app.shutdown.completed`: encerramento concluído;
- `app.shutdown.failed`: falha durante encerramento;
- `app.process.uncaught_exception`: exceção não capturada;
- `app.process.unhandled_rejection`: promise rejeitada sem tratamento.

Sinais sugeridos:

- `SIGINT`;
- `SIGTERM`.

Ao registrar erros de processo, gravar mensagem e nome do erro. Stack trace pode
ser avaliado com cuidado, mas não deve incluir payloads ou dados sensíveis.

## Eventos de autenticação e sessão

Registrar eventos como:

- `auth.login.success`: login bem-sucedido;
- `auth.login.failed`: falha de login;
- `auth.logout`: logout;
- `auth.session.expired`: sessão expirada, se houver controle explícito;
- `auth.access.denied`: tentativa de acessar rota protegida sem autenticação;
- `auth.user.created`: criação de usuário;
- `auth.user.updated`: alteração de dados do usuário;
- `auth.password.changed`: alteração de senha.

Metadados seguros sugeridos:

- `userId`, quando conhecido;
- `username`, quando seguro;
- rota acessada em `auth.access.denied`;
- IP remoto apenas se já existir padrão seguro no projeto;
- user-agent apenas se houver necessidade real de suporte.

Não registrar senha informada, hash de senha, token, cookie ou conteúdo da
sessão.

## Operações sensíveis

Registrar eventos como:

- `sensitive.seed.run`: seed executado;
- `sensitive.settings.updated`: configuração global alterada;
- `sensitive.data.reset_requested`: solicitação futura de reset de dados;
- `sensitive.data.import_requested`: importação futura solicitada;
- `sensitive.data.export_requested`: exportação futura solicitada;
- `sensitive.route.forbidden`: tentativa de ação sem permissão;
- `sensitive.maintenance.run`: rotina de manutenção executada, se existir.

Nesta primeira versão, implementar apenas os eventos que já existirem no fluxo
atual do sistema. Eventos futuros podem ficar documentados, mas não devem gerar
código morto.

## Erros funcionais importantes

Registrar eventos como:

- `business.validation.failed`: validação de formulário crítico falhou;
- `business.competence.invalid`: competência inválida;
- `business.financial_entry.save_failed`: falha ao salvar lançamento;
- `business.settlement.save_failed`: falha ao registrar baixa;
- `business.settlement.invalid_amount`: tentativa de baixa com valor inválido;
- `business.status.update_failed`: falha ao atualizar status;
- `business.not_found`: tentativa de acessar entidade inexistente;
- `business.operation.rejected`: operação negada por regra de negócio.

O objetivo é registrar o suficiente para suporte entender a ação, sem gravar o
payload completo.

Metadados seguros sugeridos:

- tipo da operação;
- entidade;
- id da entidade, quando existir;
- competência;
- nome do campo inválido, quando seguro;
- mensagem de validação em português.

## Pontos de integração sugeridos

Avaliar os pontos reais do código antes de implementar, mas os locais prováveis
são:

- `app.js`: início do bootstrap e falhas críticas;
- `src/server.js`: servidor HTTP ouvindo porta e encerramento;
- `src/database/connection.js`: conexão com SQLite;
- `src/database/schema.js`: schema inicializado/verificado;
- `src/database/seed.js`: seed executado;
- rotas/controladores de autenticação: login, falha de login e logout;
- middlewares de autenticação: acesso negado;
- models/services financeiros: erros funcionais importantes.

Manter a regra de negócio em services/models. O log deve ser uma chamada
pontual, sem espalhar formatação de arquivo pelas rotas.

## Tratamento de erro do próprio log

Falha ao gravar log não deve derrubar a aplicação.

Comportamento sugerido:

- tentar escrever no arquivo;
- em caso de erro, enviar mensagem curta para `console.error`;
- não relançar o erro no fluxo normal;
- evitar loop infinito caso o próprio `console.error` venha a ser instrumentado
  no futuro.

## Controle de versionamento

Garantir que os arquivos gerados em `log/` não sejam versionados.

Opções aceitáveis:

- adicionar `log/*.log` ao `.gitignore`;
- ou adicionar `log/` ao `.gitignore`, caso a pasta não precise conter arquivos
  versionados.

Se for necessário manter a pasta no repositório, usar `log/.gitkeep` e ignorar
somente os arquivos `.log`.

## Critérios de aceite

- A pasta `log/` é criada automaticamente quando necessário.
- O arquivo diário usa a data atual no nome.
- Um novo arquivo é usado automaticamente após a virada do dia.
- Startup registra eventos relevantes sem expor dados sensíveis.
- Encerramento controlado registra eventos relevantes.
- Login bem-sucedido é registrado.
- Falha de login é registrada sem senha ou hash.
- Logout é registrado.
- Tentativa de acesso protegido sem autenticação é registrada, quando houver
  middleware aplicável.
- Operações sensíveis existentes são registradas.
- Erros funcionais importantes existentes são registrados.
- Cada evento ocupa uma linha no arquivo.
- O log permanece legível como texto.
- Campos sensíveis são mascarados ou omitidos.
- Falha de escrita no log não derruba a aplicação.
- Arquivos de log gerados não aparecem como arquivos a versionar.
- Mensagens permanecem em português.
- `npm run check` passa após a implementação.

## Validação sugerida

Validação sintática:

```powershell
npm run check
```

Validação manual:

- iniciar a aplicação com `PORT=3100`;
- confirmar criação de `log/operacional-YYYY-MM-DD.log`;
- confirmar registro de startup;
- acessar rota pública como `/health`;
- tentar acessar rota protegida sem sessão, se aplicável;
- realizar login com sucesso;
- tentar login com senha inválida;
- realizar logout;
- executar seed, se o fluxo for alterado;
- provocar uma validação funcional segura, como competência inválida;
- encerrar o servidor iniciado para teste;
- confirmar registro de encerramento;
- confirmar que nenhum log contém senha, token, cookie, `.env` ou headers
  sensíveis.

Validação de virada de dia:

- isolar a função que calcula o nome do arquivo;
- testar com datas simuladas de dois dias diferentes;
- confirmar que os caminhos gerados apontam para arquivos diferentes.

## Observações de implementação

Manter a implementação pequena e alinhada ao projeto atual:

- CommonJS;
- `node:fs` / `node:fs/promises`;
- `node:path`;
- Express;
- SQLite local;
- mensagens em português;
- sem dependências novas.

Preferir escrita assíncrona com append. Caso o evento ocorra em encerramento de
processo, avaliar escrita síncrona somente nesse ponto específico para reduzir o
risco de perda do último registro.

Ao concluir a implementação, atualizar o controle de release em
`src/config/release.js`, incrementando o número sequencial em 1.

## Implementação

- Foi criado o serviço `src/services/operationalLogger.js`.
- O serviço grava uma linha JSON por evento em `log/operacional-YYYY-MM-DD.log`.
- A pasta `log/` é criada automaticamente quando necessário.
- O nome do arquivo é calculado a cada escrita, permitindo troca automática na
  virada do dia.
- Campos sensíveis em `details` são mascarados como `"[redacted]"`.
- Falhas de escrita no log são tratadas com mensagem curta no console e não
  interrompem o fluxo principal.
- O bootstrap em `app.js` registra início da inicialização, schema pronto,
  seed verificado, servidor HTTP ouvindo, falha de startup, sinais de
  encerramento, exceções não capturadas e promises rejeitadas sem tratamento.
- A conexão SQLite registra `app.startup.database_connected` na primeira
  abertura do banco.
- O seed registra `sensitive.seed.run` com metadados seguros sobre dados já
  existentes.
- O servidor registra login bem-sucedido, falha de login, logout, login de
  desenvolvimento, acesso negado sem autenticação e bloqueio por CSRF inválido.
- Erros funcionais importantes em lançamentos e baixas passam a registrar
  eventos operacionais antes de seguir para o tratamento global de erro.
- Falhas de validação de perfil, atualização de preferências, rotas não
  encontradas e métodos não permitidos também são registrados.
- O controle de release foi atualizado para registrar a entrega.

---

## Assinatura da LLM

- Data: 2026-07-12 23:32
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 2026-07-12 23:43
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualizacao
