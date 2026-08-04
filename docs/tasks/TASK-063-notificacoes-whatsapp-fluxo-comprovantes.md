# TASK-063 - Notificar pelo WhatsApp eventos do fluxo de comprovantes

## Contexto

O EmDia recebe comprovantes pelo WhatsApp, persiste cada importação em
`receipt_imports`, processa os itens de forma assíncrona e exige revisão humana
antes de criar a despesa e a baixa financeira.

Atualmente, o usuário não recebe uma resposta consistente pelo WhatsApp sobre
falhas no recebimento, conclusão do processamento ou aprovação. A seção
**Notificações por WhatsApp** da tela de configurações possui apenas preferências
gerais de lembretes financeiros e deve passar a controlar também as mensagens
relacionadas a comprovantes.

## Objetivo

Adicionar notificações configuráveis pelo WhatsApp para informar o usuário nos
momentos relevantes do fluxo de comprovantes:

1. falha definitiva ao aceitar ou incluir o comprovante na fila;
2. falha definitiva durante o processamento do item;
3. processamento concluído e comprovante disponível para revisão;
4. comprovante aprovado e convertido em despesa e baixa.

O recebimento bem-sucedido e a simples inclusão na fila não devem gerar
mensagem de sucesso.

## Regras funcionais

### Eventos notificáveis

Criar tipos de evento estáveis para a fila de notificações, por exemplo:

```text
RECEIPT_QUEUE_FAILED
RECEIPT_PROCESSING_FAILED
RECEIPT_READY_FOR_REVIEW
RECEIPT_APPROVED
```

Os nomes definitivos podem seguir a convenção já adotada em `notifications`,
mas não devem reutilizar eventos de vencimento, atraso ou resumo diário.

#### Falha antes da inclusão na fila

- notificar somente quando o remetente corresponder de forma segura a um único
  usuário ativo;
- abranger falhas definitivas que impeçam o comprovante de chegar à fila, como
  mídia ausente, tipo não suportado ou payload autenticado inválido depois da
  identificação do usuário;
- não revelar se um telefone desconhecido, inativo ou ambíguo possui cadastro;
- falhas transitórias que ainda serão repetidas pelo WAHA não devem produzir
  alerta prematuro ou duplicado;
- quando a própria indisponibilidade do banco impedir persistir tanto a
  importação quanto a notificação, manter o retry do webhook e registrar log
  operacional sanitizado; não tentar mascarar a falha como mensagem enviada;
- a mensagem deve explicar, em português e sem detalhes internos, que o
  comprovante não pôde ser recebido e orientar novo envio ou consulta ao EmDia.

Não enviar mensagem quando a importação for inserida com sucesso em
`receipt_imports`, inclusive em reentregas idempotentes do mesmo webhook.

#### Falha durante o processamento

- notificar apenas quando a importação terminar em `FAILED`;
- não notificar a cada tentativa intermediária quando ainda houver retry;
- enfileirar a mensagem após persistir a transição definitiva de status;
- informar que o processamento não foi concluído e orientar o usuário a abrir
  o EmDia para conferir ou solicitar reprocessamento;
- não incluir resposta bruta do WAHA/OpenRouter, stack trace, prompt, telefone,
  conteúdo extraído ou segredo na mensagem.

#### Pronto para revisão

- notificar quando a importação passar para `NEEDS_REVIEW`;
- deixar claro que o comprovante foi processado, mas ainda precisa de revisão e
  aprovação do usuário;
- incluir link direto para `/receipt-imports/:id` somente quando
  `APP_BASE_URL` estiver configurada como URL HTTP(S) segura e válida;
- sem URL segura, enviar texto suficiente para o usuário localizar a caixa de
  comprovantes no EmDia;
- não afirmar que a despesa ou o pagamento já foram criados.

#### Comprovante aprovado

- notificar somente depois do commit da transação que cria a despesa, a baixa,
  a auditoria e altera a importação para `APPROVED`;
- informar que o comprovante foi aprovado e registrado no EmDia;
- uma falha no enfileiramento ou envio da mensagem não pode desfazer a operação
  financeira concluída;
- rejeição e reprocessamento manual não geram notificações nesta task.

## Preferências do usuário

Na tela `/settings`, dentro de **Notificações por WhatsApp**, adicionar opções
individuais para:

- avisar quando um comprovante não puder ser incluído na fila;
- avisar quando o processamento de um comprovante falhar definitivamente;
- avisar quando um comprovante estiver pronto para revisão;
- avisar quando um comprovante for aprovado.

Regras das preferências:

- manter `whatsapp_enabled` como chave geral do canal;
- quando a chave geral estiver desativada, nenhuma das quatro mensagens deve
  ser criada ou enviada;
- cada evento deve possuir preferência independente;
- as preferências devem ser persistidas por usuário em
  `notification_preferences`;
- os valores padrão devem ser documentados e manter habilitados os avisos do
  fluxo de comprovantes para quem já usa notificações por WhatsApp;
- usuários com WhatsApp desativado não devem passar a receber mensagens após a
  migration;
- a interface deve explicar que a inclusão bem-sucedida na fila não gera
  confirmação;
- se o usuário não tiver `phone_e164`, preservar a orientação existente para
  cadastrar o telefone no Perfil;
- salvar as novas opções no mesmo POST protegido por CSRF já usado em
  `/settings`;
- preservar as preferências atuais de resumo diário, vencimentos e atrasos.

## Persistência e compatibilidade

Criar migration versionada para adicionar as preferências necessárias em
`notification_preferences`, preservando bancos existentes.

Usar a tabela `notifications` como outbox durável para todos os envios que
ocorrem depois de uma transição persistida. Não enviar diretamente pelo cliente
WAHA dentro do worker ou da rota de aprovação.

Cada notificação deve ter `idempotency_key` determinística por importação e
evento, por exemplo:

```text
receipt:{receipt_import_id}:processing-failed
receipt:{receipt_import_id}:ready-for-review
receipt:{receipt_import_id}:approved
```

Para falha anterior à criação de `receipt_imports`, usar uma chave derivada do
provedor e do ID da mensagem, sem incluir telefone ou conteúdo sensível.

Requisitos adicionais:

- retries do webhook, do worker ou do envio outbound não podem criar mensagens
  duplicadas;
- o payload da notificação deve conter somente os dados mínimos para montar a
  mensagem;
- não persistir imagem, Base64, URL de mídia, corpo bruto do webhook ou dados
  bancários no payload da notificação;
- respeitar a política atual de retry, cancelamento e reenvio da fila de
  notificações;
- registrar falhas de criação ou envio sem alterar retroativamente o status da
  importação.

## Integração com o fluxo existente

- o webhook deve avaliar a preferência somente depois de identificar o usuário
  com segurança;
- o worker deve enfileirar `RECEIPT_READY_FOR_REVIEW` depois de persistir
  `NEEDS_REVIEW`;
- o worker deve enfileirar `RECEIPT_PROCESSING_FAILED` somente quando não houver
  nova tentativa e o status persistido for `FAILED`;
- a aprovação deve enfileirar `RECEIPT_APPROVED` depois do commit financeiro;
- quando possível, a mudança de status e a criação da notificação devem usar a
  mesma transação local; na aprovação, a mensagem deve ser criada sem permitir
  que falha outbound faça rollback dos dados financeiros;
- manter os logs operacionais existentes, distinguindo evento de domínio,
  criação da notificação e resultado do envio.

## Mensagens sugeridas

Os textos finais devem ser curtos, em português e escapados quando exibidos na
interface administrativa. Exemplos:

- fila recusada: `Não foi possível receber seu comprovante. Tente enviá-lo novamente ou confira o EmDia.`;
- processamento falhou: `Não foi possível processar seu comprovante. Abra o EmDia para conferir e tentar novamente.`;
- pronto para revisão: `Seu comprovante foi processado e está pronto para revisão no EmDia.`;
- aprovado: `Seu comprovante foi aprovado e registrado no EmDia.`.

Os exemplos não autorizam incluir nome do favorecido, valor, conta, categoria
ou outros dados financeiros na mensagem.

## Segurança e privacidade

- nunca responder a remetente desconhecido, inativo ou ambíguo;
- não expor códigos internos, stack traces ou resposta de provedores;
- não incluir segredos ou headers sensíveis em logs e payloads;
- não usar telefone ou texto do usuário em `idempotency_key`;
- escapar qualquer dado externo apresentado na fila administrativa;
- usar placeholders SQL para consultar ou atualizar preferências;
- validar propriedade da importação antes de montar links;
- aceitar link somente a partir de `APP_BASE_URL` validada, sem usar `Host` do
  request ou valores do webhook;
- não registrar o conteúdo integral das mensagens no log operacional quando
  isso puder expor dados do usuário.

## Arquivos candidatos

- `src/database/migrations/*.js`;
- `src/models/NotificationPreference.js`;
- `src/models/Notification.js`;
- `src/services/notificationService.js`;
- `src/services/receiptImportWorker.js`;
- `src/routes/whatsappWebhookRoutes.js`;
- `src/routes/receiptImportRoutes.js`;
- `src/views/settingsView.js`;
- `test/receiptImports.test.js`;
- `test/unit/*.test.js`;
- `test/integration/*.test.js`;
- `docs/patterns.md` e `docs/architecture.md`, se o contrato da outbox mudar;
- `src/config/release.js`.

## Fora do escopo

- enviar confirmação quando o comprovante entra na fila com sucesso;
- alterar extração, OCR, modelo ou prompt do OpenRouter;
- aprovar comprovantes automaticamente;
- enviar imagem ou dados financeiros pelo WhatsApp;
- notificar rejeição ou solicitação de reprocessamento;
- criar novo provedor de WhatsApp;
- alterar a regra financeira de criação de despesa e baixa;
- implementar esta task no momento de sua criação.

## Critérios de aceite

- inclusão bem-sucedida na fila não gera notificação;
- falha definitiva antes da fila gera no máximo uma notificação quando o
  usuário estiver identificado e a preferência correspondente estiver ativa;
- tentativas intermediárias do worker não notificam o usuário;
- transição definitiva para `FAILED` gera no máximo uma notificação configurada;
- transição para `NEEDS_REVIEW` gera no máximo uma notificação configurada;
- aprovação concluída gera no máximo uma notificação configurada;
- cada um dos quatro eventos pode ser ativado ou desativado separadamente em
  **Notificações por WhatsApp**;
- `whatsapp_enabled` desativado bloqueia todos os eventos;
- usuários sem telefone ou sem preferência ativa não recebem mensagens;
- retries de webhook, worker e outbound não duplicam notificações;
- link de revisão é incluído somente com `APP_BASE_URL` segura;
- falha outbound não altera `FAILED`, `NEEDS_REVIEW` ou `APPROVED` e não desfaz
  lançamento, baixa ou auditoria;
- mensagens e logs não expõem imagem, valores financeiros, telefone, payload
  bruto ou segredos;
- as configurações existentes continuam funcionando sem perda de dados;
- `npm run check` e `npm test` passam;
- controle de release é atualizado somente ao concluir a implementação.

## Testes esperados

### Preferências

- criação de preferências com os novos valores padrão;
- migration de usuário com WhatsApp habilitado e desabilitado;
- atualização independente de cada opção;
- chave geral desativada bloqueando todos os eventos de comprovante;
- POST `/settings` preservando preferências antigas e novas;
- renderização dos quatro controles dentro de **Notificações por WhatsApp**.

### Webhook e fila

- recebimento válido e enfileirado sem mensagem de sucesso;
- falha definitiva notificável com usuário identificado;
- falha transitória com retry sem alerta prematuro;
- remetente desconhecido, inativo ou ambíguo sem resposta;
- reentrega do mesmo evento sem duplicar notificação.

### Processamento

- tentativa retentável sem notificação;
- última tentativa terminando em `FAILED` com uma notificação;
- extração concluída em `NEEDS_REVIEW` com uma notificação;
- reprocessamento posterior sem duplicar evento já enviado indevidamente;
- preferências desativadas impedindo a criação da mensagem.

### Aprovação

- aprovação cria despesa e baixa antes de enfileirar a mensagem;
- aprovação concorrente gera apenas um evento;
- falha ao criar ou enviar a notificação não desfaz a operação financeira;
- preferência de aprovação desativada não cria notificação.

### Conteúdo e segurança

- mensagem de revisão com e sem `APP_BASE_URL` segura;
- URL insegura ou inválida omitida da mensagem;
- payloads e logs sem telefone, imagem, Base64, valores, segredos ou corpo bruto;
- chaves de idempotência estáveis sem dados pessoais.

Usar banco em memória e clientes WhatsApp simulados. Não depender de internet,
WAHA real, OpenRouter real ou arquivos em `data/`.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 03/08/2026 19:58
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao
