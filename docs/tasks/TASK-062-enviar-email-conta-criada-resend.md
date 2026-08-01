# TASK-062 - Enviar e-mail de conta criada pelo Resend

## Contexto

O cadastro público implementado na TASK-061 cria o usuário, suas contas e suas
categorias iniciais e inicia a sessão, mas ainda não envia nenhuma comunicação
por e-mail.

O EmDia já possui a tabela `notifications`, com canal, tipo de evento, estado,
tentativas, chave de idempotência e identificação da mensagem no provedor. O
processamento atual, entretanto, consulta somente notificações do canal
`WHATSAPP` e está acoplado ao respectivo cliente e scheduler.

Esta task introduz o primeiro e-mail transacional do produto: uma notificação
informando que a conta do usuário foi criada com sucesso, enviada pelo Resend.

## Objetivo

Após a conclusão de um cadastro público válido em `POST /signup`, enfileirar e
enviar ao endereço informado pelo usuário um e-mail transacional de boas-vindas
confirmando a criação da conta.

O envio externo deve acontecer de forma assíncrona, sem aumentar o tempo de
resposta do cadastro e sem desfazer uma conta já criada apenas porque o Resend
está temporariamente indisponível.

## Escopo inicial

- enviar somente o evento **Conta criada**;
- usar o canal `EMAIL` e o tipo `ACCOUNT_CREATED`;
- usar o Resend como provedor produtivo;
- oferecer cliente `mock` para desenvolvimento e testes sem rede;
- reutilizar a tabela e a administração de `notifications`;
- manter fila, retentativas, idempotência e observabilidade sanitizada;
- enviar versões HTML e texto puro da mensagem;
- documentar a configuração do domínio e das variáveis de ambiente.

## Decisões de produto

- O e-mail apenas informa que a conta foi criada. Ele não confirma propriedade
  do endereço e não ativa o usuário.
- O usuário continua ativo e autenticado imediatamente após o cadastro, conforme
  a TASK-061.
- Não incluir senha, hash, token de sessão, token CSRF, dados bancários, saldos
  ou lançamentos no e-mail.
- Não incluir link de descadastro, pois a mensagem é estritamente transacional e
  corresponde a uma ação executada pelo próprio usuário.
- O endereço de destino é o e-mail normalizado persistido no novo usuário.
- Uma conta deve gerar no máximo uma notificação automática
  `ACCOUNT_CREATED`.
- A mensagem deve estar em português e usar a identidade textual do EmDia.
- O remetente inicial recomendado é
  `EmDia <nao-responda@idevs.com.br>`, condicionado à verificação do domínio
  `idevs.com.br` no Resend. O valor efetivo deve vir de configuração.

## Experiência esperada

1. O visitante conclui `POST /signup`.
2. Usuário, contas, categorias e notificação `EMAIL/ACCOUNT_CREATED` são
   persistidos atomicamente.
3. A transação é confirmada.
4. A sessão é criada e o usuário é redirecionado para `/dashboard`, sem aguardar
   o Resend.
5. O worker de e-mail encontra a notificação pendente.
6. O cliente envia a mensagem ao Resend com chave de idempotência.
7. O registro recebe `SENT`, `sent_at` e `provider_message_id` quando a API
   aceita a mensagem.
8. Em falha transitória, a notificação permanece disponível para retentativa.

## Configuração que o responsável pelo ambiente deve realizar

Estas etapas são manuais e não devem ser automatizadas pelo código da
aplicação:

1. Criar uma conta em [Resend](https://resend.com/).
2. No painel **Domains**, adicionar e verificar `idevs.com.br`, domínio definido
   para o remetente inicial do EmDia.
3. No provedor DNS, criar exatamente os registros SPF e DKIM apresentados pelo
   Resend e aguardar o domínio ficar com estado **Verified**.
4. Adicionar uma política DMARC adequada ao domínio ou subdomínio. Começar com
   política de monitoramento é aceitável enquanto os relatórios são avaliados.
5. Fazer um envio de teste pelo painel para um endereço controlado e verificar
   caixa de entrada e spam.
6. Criar uma API key exclusiva para o EmDia, limitada a envio e, quando a opção
   estiver disponível, restrita ao domínio verificado.
7. Definir o remetente, por exemplo
   `EmDia <nao-responda@idevs.com.br>`.
8. Configurar as variáveis no `.env` do ambiente produtivo. Nunca enviar a API
   key por chat, documentação, commit ou captura de tela.

O Resend recomenda subdomínio próprio para isolar reputação e exige SPF e DKIM
para verificar o domínio. DMARC deve ser configurado como proteção adicional:
[documentação oficial de domínios](https://resend.com/docs/dashboard/domains/introduction).

## Variáveis de ambiente

Adicionar exemplos sem segredo real em `.env.example`:

```dotenv
EMAIL_PROVIDER=mock
EMAIL_FROM=EmDia <nao-responda@idevs.com.br>
EMAIL_NOTIFICATIONS_DISABLED=0
EMAIL_NOTIFICATION_INTERVAL_MS=60000
EMAIL_NOTIFICATION_MAX_ATTEMPTS=5
RESEND_API_KEY=
RESEND_BASE_URL=https://api.resend.com
RESEND_REQUEST_TIMEOUT_MS=15000
```

Regras:

- desenvolvimento e testes devem usar `EMAIL_PROVIDER=mock` por padrão;
- produção deve usar `EMAIL_PROVIDER=resend`;
- `RESEND_API_KEY` é obrigatória somente quando o provedor for `resend`;
- `EMAIL_FROM` deve pertencer ao domínio verificado;
- `RESEND_BASE_URL` existe para teste controlado e compatibilidade, mas deve
  aceitar apenas HTTPS em produção;
- limites numéricos inválidos devem usar fallback seguro;
- nenhuma configuração deve expor o valor da API key na página de ambiente,
  logs ou mensagens de erro.

## Fila e atomicidade

Reutilizar `notifications` para o novo canal. Não criar uma segunda tabela de
fila apenas para e-mail sem necessidade comprovada.

Durante o cadastro público, ainda dentro da transação que cria o usuário e os
dados iniciais, inserir:

```text
channel         = EMAIL
event_type      = ACCOUNT_CREATED
status          = PENDING
user_id         = novo usuário
scheduled_at    = instante atual em ISO
idempotency_key = email:<user_id>:account-created
```

O `payload_json` pode conter somente os dados mínimos necessários para montar a
mensagem, preferencialmente nome, endereço de destino e versão do template. Não
persistir credenciais, tokens ou objeto bruto do formulário.

Requisitos:

- inserir a notificação antes do commit do cadastro;
- se a inserção local na fila falhar, reverter usuário, contas e categorias;
- não fazer chamada HTTP ao Resend dentro da transação;
- criar a sessão somente após o commit, como já ocorre na TASK-061;
- a restrição única de `idempotency_key` deve impedir duplicidade;
- uma repetição técnica do cadastro ou do enqueue não pode criar duas mensagens
  automáticas;
- o worker pode processar a notificação somente depois que ela estiver visível
  fora da transação.

## Model e consultas da fila

Evoluir `src/models/Notification.js` sem alterar o comportamento do WhatsApp:

- criar consulta específica ou parametrizada para pendências do canal `EMAIL`;
- juntar o usuário para obter `email`, `name`, `locale` e `is_active`;
- processar `PENDING` e `FAILED` com `scheduled_at <= now`;
- respeitar limite de tentativas configurável;
- manter ordenação por agendamento e criação;
- continuar usando placeholders `?`;
- preservar os filtros e a ação administrativa de reenvio existentes;
- apresentar o canal e o evento corretamente na administração da fila.

Se uma conta for bloqueada entre o cadastro e o envio, a mensagem de criação já
enfileirada ainda pode ser enviada, pois registra uma ação concluída. Essa regra
deve ficar explícita na consulta do canal `EMAIL`, em vez de herdar
acidentalmente o filtro `users.is_active = 1` usado pelo WhatsApp.

## Cliente Resend

Criar um service dedicado, por exemplo `src/services/emailClient.js`, com
contrato interno independente do provedor:

```js
await client.send({
  to,
  from,
  subject,
  html,
  text,
  idempotencyKey,
});
```

Implementar:

- `MockEmailClient`, que não acessa a rede e devolve um ID previsível;
- `ResendEmailClient`, que chama `POST https://api.resend.com/emails`;
- seleção explícita por `EMAIL_PROVIDER`;
- timeout com `AbortController`;
- header `Authorization: Bearer <RESEND_API_KEY>`;
- header `Content-Type: application/json`;
- header `Idempotency-Key` com a chave persistida na notificação;
- payload apenas com `from`, `to`, `subject`, `html` e `text`;
- validação do HTTP status e do campo `id` devolvido pelo Resend;
- erros internos classificados sem incluir corpo integral da resposta ou
  credenciais.

O projeto usa Node.js 24 e já possui `fetch` nativo. Preferir a API HTTP direta
para evitar dependência adicional, salvo necessidade comprovada durante a
implementação. A API e a chave de idempotência são documentadas em
[Resend - Send Email](https://resend.com/docs/api-reference/emails/send-email).

## Template do e-mail

Criar template server-side versionado no projeto, sem depender inicialmente do
editor remoto do Resend. Exemplo de conteúdo:

```text
Assunto: Sua conta no EmDia foi criada

Olá, <nome>!

Sua conta no EmDia foi criada com sucesso.

Já deixamos uma conta corrente, uma carteira e categorias iniciais preparadas
para você começar a organizar receitas, despesas e vencimentos do mês.

<Abrir o EmDia, somente quando APP_BASE_URL for válido>

Se você não realizou esse cadastro, desconsidere esta mensagem e entre em
contato com o responsável pelo EmDia.
```

Requisitos do template:

- gerar HTML simples, responsivo e compatível com clientes de e-mail;
- gerar também versão em texto puro;
- escapar nome, URL e qualquer valor dinâmico;
- não usar JavaScript, formulário, imagem remota obrigatória ou CSS externo;
- usar estilos inline mínimos, pois são apropriados para compatibilidade de
  e-mail e não fazem parte da CSP da aplicação web;
- o link deve usar `APP_BASE_URL` validado e apontar para `/login`;
- omitir o botão/link quando `APP_BASE_URL` estiver ausente ou inválido;
- não incluir pixel de rastreamento nesta primeira versão;
- manter assunto e remetente previsíveis para reduzir risco de phishing.

## Worker e retentativas

Criar um ciclo independente do scheduler do WhatsApp, por exemplo
`emailNotificationScheduler.js` e `emailNotificationService.js`.

- não bloquear a rota `/signup` esperando rede;
- impedir ciclos concorrentes no mesmo processo;
- buscar lotes pequenos, inicialmente até 25 notificações;
- processar uma mensagem por vez nesta primeira versão;
- marcar `SENT` quando o Resend aceitar a requisição e devolver o ID;
- marcar `FAILED`, incrementar `attempt_count` e reagendar falhas transitórias;
- aplicar backoff, por exemplo 1, 5, 15 e 60 minutos;
- não repetir após o limite configurado, deixando o item visível para ação
  administrativa;
- tratar HTTP 429 e falhas 5xx como transitórias;
- tratar configuração ausente, domínio/remetente inválido e respostas 4xx não
  transitórias como falhas controladas;
- nunca executar retentativa em loop apertado;
- permitir desabilitar o scheduler por variável de ambiente;
- iniciar o scheduler no bootstrap sem usar a porta 3000 para testes do agente.

## Administração e estados

A tela administrativa de notificações deve continuar permitindo localizar,
cancelar e reenviar o novo canal.

- exibir canal **E-mail** e evento **Conta criada** com rótulos em português;
- exibir `PENDING`, `SENT`, `FAILED` e `CANCELLED` pelos rótulos já padronizados;
- o reenvio administrativo deve criar uma nova chave idempotente e permanecer
  no canal `EMAIL`;
- não mostrar corpo HTML integral, API key ou headers;
- mensagem técnica de falha deve ser sanitizada e limitada;
- `provider_message_id` pode ser exibido como identificador técnico, sem virar
  link externo nesta primeira versão.

## Logs e segurança

Registrar eventos operacionais como:

```text
email.scheduler.started
email.notification.sent
email.notification.failed
email.notification.skipped_configuration
```

Os logs podem conter:

- ID interno da notificação;
- ID interno do usuário;
- evento;
- provedor;
- status HTTP;
- duração;
- número da tentativa;
- código de erro normalizado.

Os logs nunca podem conter:

- `RESEND_API_KEY`;
- header `Authorization`;
- senha, hash, sessão ou CSRF;
- endereço de e-mail completo;
- HTML ou texto integral da mensagem;
- payload ou resposta bruta do Resend.

Quando for necessário correlacionar o destino, usar identificador interno do
usuário ou impressão criptográfica truncada do e-mail.

## Webhooks e significado de `SENT`

Nesta primeira versão, `SENT` significa que a API do Resend aceitou a mensagem,
não que ela chegou à caixa de entrada.

Webhooks de entrega, bounce, reclamação e supressão ficam fora do escopo. A
arquitetura não deve chamar o estado de **Entregue** sem receber e validar um
evento correspondente do provedor. Uma task futura pode consumir eventos como
`email.delivered`, `email.bounced` e `email.complained` com assinatura e
idempotência.

## Fora do escopo

- confirmação ou ativação do endereço de e-mail;
- recuperação de senha;
- alteração de e-mail com confirmação;
- lembretes financeiros por e-mail;
- campanhas, newsletter ou marketing;
- anexos;
- editor visual de templates dentro do EmDia;
- templates hospedados no painel do Resend;
- recebimento de respostas por e-mail;
- webhooks de entrega, bounce, abertura, clique ou reclamação;
- pixel de abertura e rastreamento de clique;
- múltiplos provedores produtivos com failover;
- IP dedicado;
- envio síncrono dentro de `POST /signup`.

## Critérios de aceite

- cadastro público válido cria exatamente uma notificação
  `EMAIL/ACCOUNT_CREATED` com chave idempotente;
- usuário, contas, categorias e notificação são gravados na mesma transação;
- nenhuma chamada ao Resend ocorre dentro da transação ou da resposta HTTP;
- o cadastro continua redirecionando imediatamente para `/dashboard`;
- cliente `mock` permite testar todo o fluxo sem rede;
- cliente Resend usa API key somente no header e envia `Idempotency-Key`;
- o worker envia versões HTML e texto e salva o ID devolvido pelo provedor;
- falhas transitórias são reagendadas com backoff e limite de tentativas;
- falha ou indisponibilidade do Resend não remove nem desativa a conta criada;
- conta bloqueada após cadastro ainda recebe a notificação já enfileirada;
- configuração ausente falha de forma controlada e sem expor segredo;
- administração identifica canal, evento, estado e permite reenvio/cancelamento;
- HTML escapa o nome do usuário e não contém senha, token ou dados financeiros;
- sem `APP_BASE_URL` válido, o e-mail é enviado sem link quebrado;
- logs não contêm endereço completo, conteúdo da mensagem, resposta bruta nem
  API key;
- `.env.example`, `README.md`, `docs/patterns.md` e `docs/architecture.md` são
  atualizados;
- `src/config/release.js` é incrementado ao concluir a implementação;
- `npm run check` e `npm test` passam.

## Cenários de validação

1. Cadastrar usuário com `EMAIL_PROVIDER=mock` e confirmar redirecionamento sem
   espera de rede.
2. Confirmar uma notificação pendente com canal, evento, usuário e chave
   idempotente corretos.
3. Repetir o enqueue para o mesmo usuário e confirmar ausência de duplicidade.
4. Injetar falha ao inserir a notificação e confirmar rollback de usuário,
   contas e categorias.
5. Executar o worker mock e confirmar `SENT`, `sent_at`, uma tentativa de envio
   e `provider_message_id`.
6. Renderizar nome com caracteres HTML e confirmar escape nas versões HTML e
   texto.
7. Testar `APP_BASE_URL` válido e inválido, confirmando inclusão ou omissão do
   link para `/login`.
8. Simular timeout, HTTP 429 e HTTP 500 e confirmar reagendamento com backoff.
9. Simular HTTP 400 e configuração ausente e confirmar falha controlada sem
   vazamento de resposta ou segredo.
10. Atingir o máximo de tentativas e confirmar que o worker não envia novamente
    automaticamente.
11. Bloquear o usuário após o cadastro e confirmar o envio da notificação já
    enfileirada.
12. Reenviar e cancelar pela administração, confirmando canal e nova chave.
13. Inspecionar banco, HTML e logs para garantir ausência de senha, token, API
    key e corpo integral.
14. Em ambiente controlado com domínio verificado, enviar para Gmail e Outlook
    e conferir remetente, assunto, HTML, texto e pasta de spam.
15. Executar `npm run check` e `npm test`.
16. Para HTTP manual, iniciar o servidor com banco isolado e `PORT=3100` ou a
    próxima porta livre, encerrando somente o PID iniciado pelo teste.

## Arquivos candidatos

- `.env.example`;
- `README.md`;
- `docs/patterns.md`;
- `docs/architecture.md`;
- `src/models/Notification.js`;
- `src/models/User.js` ou service de cadastro público;
- `src/services/emailClient.js`;
- `src/services/emailTemplateService.js`;
- `src/services/emailNotificationService.js`;
- `src/services/emailNotificationScheduler.js`;
- `src/views/notificationQueueView.js`;
- `src/server.js` ou `app.js`, conforme o ponto atual de bootstrap;
- testes em `test/unit/` e `test/integration/`;
- `src/config/release.js` ao concluir a implementação.

## Validação esperada

```powershell
npm run check
npm test
```

Não executar testes reais de envio sem domínio verificado, API key configurada
em ambiente seguro e endereço de destino controlado pelo responsável. Testes
automatizados devem usar mocks e nunca acessar o Resend pela rede.

---

## Assinatura da LLM

- Data: 01/08/2026 17:42
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 01/08/2026 18:47
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
