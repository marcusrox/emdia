# TASK-068 - Preparar a outbox para mais de um processo

## Contexto

Os schedulers de WhatsApp e e-mail evitam ciclos simultâneos apenas por flags em
memória no processo atual. Os consumidores consultam notificações `PENDING` ou
`FAILED`, realizam I/O externo e depois marcam o item como enviado ou falho.

Com duas instâncias do EmDia, ambas podem selecionar o mesmo item antes da
atualização final e produzir envios duplicados. A `idempotency_key` evita criar
duas linhas na outbox, mas não garante posse exclusiva durante o consumo.

## Objetivo

Adicionar reivindicação atômica e recuperável de notificações da outbox para
permitir que múltiplos processos consumam a fila sem enviar o mesmo item
simultaneamente.

## Regras funcionais e técnicas

### Reivindicação

- Introduzir estado explícito de processamento, por exemplo `PROCESSING`, ou
  contrato equivalente persistido no SQLite.
- Reivindicar itens em transação `IMMEDIATE`, selecionando somente registros
  elegíveis e marcando sua posse antes de qualquer I/O externo.
- Registrar identificador opaco do worker e instante de início da reivindicação
  sem expor hostname, caminho ou segredo na interface.
- Respeitar canal, agendamento, limite de tentativas, cancelamento e ordem da
  fila.
- Processar somente itens efetivamente reivindicados pelo worker atual.
- Não manter a transação SQLite aberta durante chamadas ao Resend, WAHA ou outro
  provedor.

### Conclusão e recuperação

- `markSent` e `markFailed` devem confirmar que o item ainda pertence ao claim
  esperado ou aplicar controle equivalente contra atualização obsoleta.
- Claims abandonados após encerramento inesperado devem voltar a ser elegíveis
  depois de um timeout configurável e conservador.
- A recuperação deve incrementar tentativas apenas conforme a política do
  canal, sem criar loop apertado.
- Cancelamento administrativo deve ter comportamento definido para item
  reivindicado: rejeitar enquanto estiver em processamento ou sinalizar
  cancelamento sem corromper o envio atual.
- Reenvio administrativo deve continuar criando nova notificação com nova chave
  idempotente.
- Preservar a idempotência fornecida ao provedor de e-mail e usar identificador
  estável do item quando o provedor suportar idempotência.

### Compatibilidade e operação

- Criar migration compatível com bancos existentes.
- Itens antigos `PENDING`, `FAILED`, `SENT` e `CANCELLED` devem permanecer
  válidos.
- A fila administrativa deve representar `PROCESSING` em português e permitir
  filtro coerente, se o novo estado for adotado.
- Logs devem distinguir claim, envio, falha, perda de claim e recuperação sem
  registrar payload ou credenciais.
- O desenho deve funcionar no SQLite atual e não introduzir Redis ou outro
  banco externo.
- Manter os schedulers por processo; a coordenação passa a ser garantida pela
  outbox persistida.

## Arquivos candidatos

- `src/database/migrations/*.js`;
- `src/models/Notification.js`;
- `src/services/notificationService.js`;
- `src/services/emailNotificationService.js`;
- `src/services/notificationScheduler.js`;
- `src/services/emailNotificationScheduler.js`;
- `src/routes/adminRoutes.js`;
- `src/views/notificationQueueView.js`;
- testes unitários e de integração da outbox;
- `docs/patterns.md`;
- `docs/architecture.md`;
- `src/config/release.js`, ao concluir a implementação desta task.

## Fora do escopo

- substituir SQLite por Redis, RabbitMQ, SQS ou outro broker;
- executar múltiplos processos como parte dos testes manuais de produção;
- garantir exactly-once absoluto quando o provedor aceita o envio e a aplicação
  encerra antes de persistir a resposta;
- alterar textos funcionais das notificações;
- modificar geração de lembretes ou preferências do usuário;
- preparar o worker de comprovantes, que já possui mecanismo próprio de claim,
  salvo extração de helper realmente compartilhável e segura;
- implementar esta task no momento de sua criação.

## Critérios de aceite

- dois consumidores concorrentes não reivindicam o mesmo item ativo;
- nenhum I/O externo ocorre dentro da transação de claim;
- somente o proprietário vigente conclui ou falha o item reivindicado;
- claim abandonado volta à fila após o timeout definido;
- itens enviados, cancelados ou sem tentativas restantes não são reivindicados;
- WhatsApp e e-mail usam o mesmo contrato persistente de posse, respeitando suas
  políticas específicas de retry;
- a interface administrativa identifica o estado de processamento sem expor
  dados operacionais sensíveis;
- migrations preservam notificações existentes;
- os testes existentes continuam passando.

## Testes esperados

- duas conexões SQLite tentando reivindicar o mesmo item simultaneamente;
- lote com vários itens sendo dividido sem sobreposição entre workers;
- tentativa de concluir item com claim incorreto sendo rejeitada;
- recuperação de claim expirado e preservação de claim ainda válido;
- falha transitória reagendada conforme o canal;
- falha definitiva encerrando tentativas;
- item cancelado ou enviado nunca sendo reivindicado;
- encerramento simulado entre envio e persistência documentando o limite de
  entrega pelo menos uma vez;
- migration de banco anterior preservando fila e índices;
- renderização e filtros administrativos para o novo estado;
- logs sem payload, destinatário, token ou credencial.

## Validação esperada

- executar `npm run check`;
- executar `npm test`;
- validar migration em banco temporário novo e banco temporário anterior;
- executar testes de concorrência com conexões SQLite independentes;
- usar clientes simulados, sem chamadas reais ao WAHA ou Resend;
- atualizar `src/config/release.js` ao concluir a implementação, incrementando
  o sequencial conforme o padrão do projeto.

---

## Assinatura da LLM

- Data: 08/08/2026 10:45
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao
