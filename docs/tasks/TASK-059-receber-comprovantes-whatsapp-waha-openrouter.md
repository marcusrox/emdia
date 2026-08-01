# TASK-059 - Receber comprovantes pelo WhatsApp com WAHA e OpenRouter

## Contexto

O EmDia já possui integração outbound com o WAHA para envio de notificações,
por meio de `src/services/whatsappClient.js`, mas ainda não recebe mensagens,
imagens ou webhooks do WhatsApp.

O objetivo desta evolução é permitir que um usuário envie uma imagem de
comprovante de pagamento ao número WhatsApp conectado ao WAHA. O EmDia deve
identificar o usuário pelo telefone celular cadastrado, armazenar o arquivo de
forma protegida, extrair informações financeiras com a API multimodal da
OpenRouter e apresentar uma importação para conferência humana.

Um comprovante representa um pagamento já realizado. Por isso, a aprovação não
deve apenas preencher `realized_amount_cents`: deve criar uma despesa em
`financial_entries` e a respectiva baixa em `settlements`, na mesma transação.

A extração nunca deve criar ou liquidar um lançamento automaticamente. Antes da
aprovação, o registro existe somente em `receipt_imports` e não participa do
dashboard, da agenda, da listagem mensal ou dos totais financeiros.

## Objetivo

Implementar o MVP completo de recebimento de comprovantes com estas etapas:

1. receber exclusivamente eventos `message` do WAHA por webhook;
2. autenticar o webhook com HMAC SHA-512 sobre o corpo bruto;
3. registrar log operacional sanitizado de cada webhook recebido;
4. identificar um único usuário ativo pelo telefone E.164 cadastrado;
5. persistir a importação de forma idempotente em `receipt_imports`;
6. baixar e validar imagens JPEG ou PNG fora do processamento HTTP;
7. extrair dados usando imagem, Responses API e Structured Outputs via OpenRouter;
8. inferir favorecido e categoria com histórico e categorias do usuário;
9. exibir uma caixa de comprovantes para revisão e correção;
10. após confirmação explícita, criar despesa e baixa de modo atômico;
11. permitir rejeitar ou reprocessar importações sem alterar dados financeiros;
12. aplicar retenção configurável aos arquivos de comprovantes.

## Decisões do MVP

- O único provedor inbound será o WAHA.
- Evolution API, Meta Cloud API, polling e WebSocket ficam fora deste escopo.
- Somente conversas individuais são aceitas.
- Grupos, canais, status, mensagens próprias, texto sem mídia, áudio e vídeo são
  ignorados com log sanitizado.
- O MVP aceita somente `image/jpeg` e `image/png` confirmados pela assinatura
  real do arquivo.
- PDF, HEIC, WebP e múltiplos anexos ficam para evolução posterior.
- A imagem é processada assincronamente por uma fila persistida no SQLite.
- Redis, RabbitMQ e processo de worker separado não são necessários no MVP.
- A importação permanece fora de `financial_entries` até a aprovação humana.
- A categoria sugerida nunca é criada automaticamente.
- A conta financeira deve ser escolhida ou confirmada pelo usuário antes da
  aprovação, mesmo quando houver banco ou método de pagamento no comprovante.
- A indisponibilidade do WAHA ou do OpenRouter não torna `/ready` indisponível.

## Fluxo funcional

```text
WhatsApp -> WAHA -> POST /webhooks/whatsapp/waha
  -> validar HMAC e payload
  -> resolver remetente para telefone E.164
  -> localizar usuário ativo
  -> inserir receipt_imports como RECEIVED
  -> responder HTTP 200
  -> worker baixa e valida a imagem
  -> worker chama OpenRouter
  -> receipt_imports passa para NEEDS_REVIEW
  -> usuário revisa no EmDia
  -> POST de aprovação com CSRF
  -> transação cria financial_entry + settlement + auditoria
  -> receipt_imports passa para APPROVED
```

## Configuração do WAHA

Preservar as variáveis existentes e adicionar:

```env
WAHA_WEBHOOK_HMAC_KEY=
WAHA_WEBHOOK_MAX_AGE_SECONDS=300
```

Configuração esperada no WAHA:

- URL: `https://emdia.exemplo.com/webhooks/whatsapp/waha`;
- evento: somente `message`;
- HMAC configurado com a mesma chave de `WAHA_WEBHOOK_HMAC_KEY`;
- retries com política limitada e backoff;
- download de mídia habilitado;
- retenção de mídia no WAHA suficiente para o worker baixar o arquivo,
  recomendando-se no mínimo 900 segundos no MVP;
- download limitado, quando suportado, a `image/jpeg,image/png`.

Não usar `message.any`, pois ele também inclui mensagens próprias e aumenta o
risco de loops e duplicidade.

O WAHA envia os headers:

```text
X-Webhook-Request-Id
X-Webhook-Timestamp
X-Webhook-Hmac
X-Webhook-Hmac-Algorithm: sha512
```

O HMAC deve ser verificado sobre os bytes exatos do corpo recebido, antes do
`JSON.parse`, usando `node:crypto`, `createHmac("sha512", secret)` e comparação
de tamanho constante com `timingSafeEqual`.

O timestamp deve ser validado contra `WAHA_WEBHOOK_MAX_AGE_SECONDS` para reduzir
replay. HMAC ausente, algoritmo diferente de `sha512`, assinatura inválida ou
timestamp fora da janela devem ser recusados sem processar o payload.

## Rota pública do webhook

Criar `src/routes/whatsappWebhookRoutes.js` e registrar a rota antes de
`loadSession` e `requireAuth`:

```http
POST /webhooks/whatsapp/waha
Content-Type: application/json
```

Requisitos de parsing e resposta:

- usar parser específico com corpo bruto e limite máximo de 1 MB;
- não aplicar sessão, autenticação de usuário ou CSRF ao webhook;
- validar HMAC antes de converter o corpo em objeto;
- aceitar apenas JSON com `event === "message"` e a sessão configurada;
- ignorar `payload.fromMe === true`;
- exigir `payload.id`, `payload.from`, `payload.hasMedia === true` e
  `payload.media.url`;
- retornar `200` depois de persistir o recebimento durável;
- retornar `200` para evento válido, mas irrelevante ou duplicado;
- retornar `401` ou `403` para autenticação inválida;
- retornar `400` para payload autenticado, porém malformado;
- retornar `500` somente para falha transitória que deva acionar retry do WAHA;
- nunca esperar download da mídia ou chamada ao OpenRouter para responder ao WAHA.

O `X-Webhook-Request-Id`, o ID do evento e o ID da mensagem são metadados não
confiáveis. Devem ter tamanho limitado e nunca podem ser usados como caminho de
arquivo, SQL dinâmico ou conteúdo HTML sem escape.

## Identificação do usuário pelo celular

### Normalização do remetente

- `5511999999999@c.us` deve resultar em `+5511999999999`;
- `5511999999999@s.whatsapp.net` deve ser normalizado da mesma forma quando
  aparecer em um campo documentado e validado;
- grupos terminados em `@g.us`, canais, broadcast e formatos arbitrários devem
  ser rejeitados;
- remetente `@lid` deve ser resolvido no WAHA com:

```http
GET {WAHA_API_BASE_URL}/api/{WAHA_SESSION}/lids/{lid}
X-Api-Key: {WAHA_API_KEY}
Accept: application/json
```

- a resposta deve fornecer `pn` terminado em `@c.us`, que então é convertido
  para E.164;
- se o WAHA não conhecer o LID, a mensagem deve ser ignorada com log
  sanitizado; não tentar inferir o telefone por nome, perfil ou dígitos
  parciais.

### Correspondência no EmDia

Adicionar uma consulta específica, por exemplo
`User.findActiveByPhoneE164(phone)`, com comparação exata e placeholder SQL.

Não remover ou inserir o nono dígito brasileiro por heurística. O telefone
resolvido pelo WAHA deve corresponder exatamente ao E.164 persistido no EmDia.

Hoje `users.phone_e164` não é único. A implementação deve:

- validar telefone duplicado nos fluxos de perfil e administração;
- criar migration com índice único parcial para telefones não nulos e não
  vazios;
- detectar duplicidades preexistentes antes de criar o índice;
- falhar de forma explícita e sanitizada, sem escolher um usuário
  arbitrariamente;
- manter usuários sem telefone permitidos;
- considerar somente usuário ativo na identificação inbound.

Remetente sem usuário ativo correspondente deve ser ignorado sem revelar por
WhatsApp se aquele telefone possui ou não cadastro. Registrar apenas razão
normalizada e identificadores técnicos não sensíveis.

## Log dos webhooks

Usar `src/services/operationalLogger.js`. Não criar um segundo arquivo de log
nem persistir o corpo bruto somente para observabilidade.

Eventos mínimos:

```text
whatsapp.webhook.received
whatsapp.webhook.invalid_signature
whatsapp.webhook.replay_rejected
whatsapp.webhook.invalid_payload
whatsapp.webhook.ignored
whatsapp.webhook.duplicate
whatsapp.receipt.queued
whatsapp.receipt.media_downloaded
whatsapp.receipt.media_failed
whatsapp.receipt.extraction_completed
whatsapp.receipt.extraction_failed
whatsapp.receipt.approved
whatsapp.receipt.rejected
```

Os logs podem conter:

- timestamp;
- nome do evento WAHA;
- sessão e engine como valores limitados;
- `X-Webhook-Request-Id` limitado;
- ID interno da importação;
- ID do usuário depois da identificação;
- status e código normalizado de resultado;
- MIME e tamanho do arquivo;
- modelo usado, duração e uso de tokens quando fornecido pelo OpenRouter;
- número da tentativa.

Os logs não podem conter:

- corpo integral do webhook;
- imagem, Base64 ou URL de mídia;
- telefone completo, exceto `senderPhoneE164` exclusivamente no resultado
  `user_not_found`; chat ID e LID completos continuam proibidos;
- legenda ou texto integral da mensagem;
- nome, banco, valor, chave Pix ou identificador da transação;
- JSON extraído;
- `WAHA_API_KEY`, chave HMAC ou `OPENROUTER_API_KEY`;
- headers de autorização;
- resposta bruta do WAHA ou do OpenRouter.

Quando necessário correlacionar remetentes, usar hash HMAC local. Por decisão
explícita de produto, o evento ignorado com motivo `user_not_found` também deve
registrar `senderPhoneE164` completo para diagnóstico de cadastro. Nenhum outro
resultado deve registrar o telefone completo.

## Tabela `receipt_imports`

Criar uma migration versionada, preservando bancos existentes. Estrutura
conceitual mínima:

```text
id                              TEXT PRIMARY KEY
user_id                         TEXT NOT NULL REFERENCES users(id)
provider                        TEXT NOT NULL DEFAULT 'WAHA'
provider_event_id               TEXT
provider_message_id             TEXT NOT NULL
webhook_request_id              TEXT
sender_phone_e164               TEXT NOT NULL
source_chat_id                  TEXT NOT NULL
message_timestamp               TEXT
media_mime_type                 TEXT
media_size_bytes                INTEGER
media_sha256                    TEXT
storage_key                     TEXT
original_filename               TEXT
status                          TEXT NOT NULL
document_type                   TEXT
merchant_name                   TEXT
payment_date                    TEXT
amount_cents                    INTEGER
currency                        TEXT
payment_method                  TEXT
transaction_reference          TEXT
suggested_category_id           TEXT REFERENCES categories(id)
suggested_financial_account_id  TEXT REFERENCES financial_accounts(id)
confidence_json                 TEXT
warnings_json                   TEXT
extracted_json                  TEXT
extraction_model                TEXT
extraction_response_id          TEXT
attempt_count                   INTEGER NOT NULL DEFAULT 0
next_attempt_at                 TEXT
processing_started_at           TEXT
last_error_code                 TEXT
last_error_message              TEXT
duplicate_of_id                 TEXT REFERENCES receipt_imports(id)
financial_entry_id              TEXT REFERENCES financial_entries(id)
created_at                      TEXT NOT NULL
updated_at                      TEXT NOT NULL
processed_at                    TEXT
approved_at                     TEXT
rejected_at                     TEXT
```

Status permitidos:

```text
RECEIVED
PROCESSING
NEEDS_REVIEW
APPROVED
REJECTED
FAILED
```

Regras e índices:

- `UNIQUE(provider, provider_message_id)` para idempotência do webhook;
- índice por `user_id, status, created_at` para a caixa de revisão;
- índice por `status, next_attempt_at, created_at` para o worker;
- `amount_cents` sempre inteiro positivo quando preenchido;
- `payment_date` civil em `YYYY-MM-DD` quando preenchida;
- `message_timestamp` deve ser convertido para instante ISO quando válido;
- `extracted_json`, `confidence_json` e `warnings_json` devem conter somente JSON
  serializado controlado pela aplicação;
- `last_error_message` deve ser sanitizado e limitado;
- `storage_key` deve ser um identificador interno, nunca caminho fornecido pelo
  WAHA;
- não persistir o corpo bruto completo do webhook;
- não usar `status = DRAFT` em `financial_entries` para representar a
  importação.

O hash do arquivo ajuda a detectar reenvio do mesmo comprovante pelo mesmo
usuário. Igualdade de hash não deve excluir automaticamente: marcar
`duplicate_of_id`, exibir alerta e exigir decisão humana.

## Armazenamento e download da imagem

Adicionar configuração:

```env
RECEIPT_STORAGE_DIR=uploads/receipts
RECEIPT_MAX_BYTES=10485760
RECEIPT_RETENTION_DAYS=90
RECEIPT_WORKER_INTERVAL_MS=2000
RECEIPT_WORKER_MAX_ATTEMPTS=3
```

Requisitos:

- armazenar fora de `public/` e incluir o diretório em `.gitignore`;
- criar nome aleatório a partir do ID interno, sem reutilizar filename, URL ou
  ID do provedor;
- impedir path traversal, symlinks e resolução fora do diretório configurado;
- baixar somente URL cuja origem, protocolo e porta correspondam à
  `WAHA_API_BASE_URL` configurada;
- rejeitar credenciais, fragmentos e origens alternativas na URL;
- não seguir redirect para outro host;
- autenticar o download com `X-Api-Key`; não colocar a chave em query string;
- aplicar timeout, limite pelo `Content-Length` quando disponível e limite
  durante streaming;
- validar assinatura real JPEG ou PNG, MIME e extensão interna;
- gravar primeiro em arquivo temporário no mesmo diretório e fazer rename
  atômico somente depois da validação;
- calcular SHA-256 durante o download;
- apagar arquivo temporário em qualquer falha;
- nunca servir o diretório com `express.static`.

Criar endpoint autenticado como:

```http
GET /receipt-imports/:id/media
```

Ele deve validar propriedade pelo usuário, impedir acesso a arquivo rejeitado ou
expirado quando aplicável, definir `Content-Type`, `Content-Length`,
`X-Content-Type-Options: nosniff` e política de cache privada. Administradores
não devem receber acesso transversal implícito sem requisito explícito.

A rotina de retenção deve remover arquivos aprovados ou rejeitados após o prazo
configurado, sem apagar o lançamento, a baixa, a auditoria ou os metadados
essenciais da importação. Falha de limpeza deve ser registrada sem derrubar a
aplicação.

Documentar que o backup SQLite atual não inclui os arquivos do diretório de
comprovantes. Incluir anexos no backup gerenciado fica fora deste MVP e deve ser
tratado antes de o comprovante ser considerado arquivo fiscal de longo prazo.

## Worker persistente

Criar serviço de processamento inspirado no scheduler existente, mas sem
compartilhar regras de notificações.

Requisitos:

- selecionar uma importação elegível por vez;
- reivindicar o item em `withImmediateTransaction`, alterando-o para
  `PROCESSING` antes de qualquer chamada externa;
- não manter transação SQLite aberta durante download ou chamada ao OpenRouter;
- acordar imediatamente depois de uma inserção, além do intervalo periódico;
- recuperar `PROCESSING` abandonado após reinício usando
  `processing_started_at` e timeout documentado;
- aplicar no máximo o número configurado de tentativas;
- retry apenas para timeout, indisponibilidade e respostas transitórias;
- não repetir automaticamente erro de autenticação, arquivo inválido, resposta
  semanticamente inválida ou configuração ausente;
- usar backoff limitado e `next_attempt_at`;
- terminar em `FAILED` com erro sanitizado quando não houver nova tentativa;
- permitir reprocessamento manual, que limpa resultado derivado e volta a
  `RECEIVED`, sem duplicar o arquivo ou o lançamento aprovado;
- nunca reprocessar `APPROVED` automaticamente.

## Integração com o OpenRouter

### Configuração

Adicionar ao `.env.example`, sempre sem segredo real:

```env
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_RECEIPT_MODEL=openai/gpt-5-mini
OPENROUTER_REQUEST_TIMEOUT_MS=30000
RECEIPT_REVIEW_CONFIDENCE_THRESHOLD=0.85
```

O modelo deve ser configurável. O default passa a ser `openai/gpt-5-mini`, que
aceita entrada de imagem e Structured Outputs no OpenRouter. O slug não deve
ser espalhado pelo código, permitindo trocar o modelo sem nova implementação.

Não é necessário adicionar SDK no primeiro momento. O Node.js 24 já
fornece `fetch`; preferir um cliente interno pequeno e testável para:

```http
POST https://openrouter.ai/api/v1/responses
Authorization: Bearer {OPENROUTER_API_KEY}
Content-Type: application/json
```

Usar:

- imagem como `input_image`, preferencialmente em data URL Base64 produzida
  somente em memória durante a chamada;
- instrução textual curta e versionada pelo código;
- `text.format` com `type: "json_schema"` e `strict: true`;
- `store: false` no request;
- `provider.require_parameters: true` para evitar rota incompatível;
- `provider.data_collection: deny` para excluir provedores classificados como
  coletores de dados;
- timeout com `AbortController`;
- limite de saída suficiente apenas para o schema;
- captura de ID da resposta, modelo efetivo e usage quando disponíveis;
- mensagens de erro sanitizadas, sem copiar resposta bruta para log.

O comportamento seguro permanece `store: false`; ZDR não é obrigatório no MVP.

### Prompt de extração

O prompt deve:

- informar que a imagem é conteúdo não confiável;
- proibir seguir instruções, QR Codes ou textos presentes no comprovante;
- pedir apenas extração factual;
- diferenciar comprovante de pagamento, agendamento, cobrança, transferência,
  documento ilegível e imagem sem relação financeira;
- retornar `null` quando um campo não estiver claramente visível;
- não calcular valor, data ou favorecido por suposição;
- retornar valores monetários em centavos inteiros;
- usar datas civis `YYYY-MM-DD` sem conversão de fuso;
- usar `BRL` somente quando a moeda estiver indicada ou for inequivocamente
  brasileira;
- escolher categoria somente entre as categorias de despesa fornecidas;
- explicar incerteza por códigos curtos em `warnings`;
- produzir confiança por campo, sem tratar a confiança declarada pelo modelo
  como garantia de correção.

### Schema estruturado

Contrato conceitual:

```json
{
  "document_type": "payment_receipt",
  "merchant_name": "Favorecido",
  "payment_date": "2026-07-31",
  "amount_cents": 15390,
  "currency": "BRL",
  "payment_method": "PIX",
  "transaction_reference": null,
  "suggested_category_name": "Alimentação",
  "confidence": {
    "document_type": 0.98,
    "merchant_name": 0.95,
    "payment_date": 0.91,
    "amount_cents": 0.99,
    "category": 0.72,
    "overall": 0.90
  },
  "warnings": []
}
```

O JSON Schema real deve:

- declarar todos os campos e `additionalProperties: false`;
- usar enums fechados para `document_type`, `currency` e método quando
  aplicável;
- permitir `null` explicitamente nos campos não identificados;
- limitar comprimentos de strings e quantidade de avisos;
- restringir confiança ao intervalo de 0 a 1;
- exigir `amount_cents` inteiro, nunca float ou string monetária.

Depois do Structured Output, a aplicação ainda deve validar:

- JSON parseável e aderente ao contrato esperado;
- centavos positivos e dentro de `Number.isSafeInteger`;
- data ISO civil válida;
- data de pagamento não absurdamente futura;
- strings sem controles e dentro dos limites;
- categoria pertencente ao usuário e com `entry_type = EXPENSE`;
- conta sugerida pertencente ao usuário e ativa;
- documento compatível com comprovante de pagamento.

Saída recusada ou incompleta deve ir para `NEEDS_REVIEW` com avisos quando ainda
houver informação útil, ou `FAILED` quando não houver resultado seguro para
revisão.

## Inferência de favorecido e categoria

Aplicar a seguinte ordem:

1. extrair favorecido visível da imagem;
2. procurar histórico local do mesmo favorecido para o usuário;
3. se houver uma categoria dominante confiável no histórico, preferi-la;
4. aplicar correspondências locais simples e documentadas;
5. somente então considerar a categoria sugerida pelo modelo via OpenRouter;
6. manter sem categoria quando não houver correspondência segura.

Não enviar histórico financeiro completo ao OpenRouter. Enviar apenas a lista de
nomes das categorias de despesa ativas necessária à classificação. IDs internos
devem ser resolvidos localmente depois da resposta.

Não criar `Party` durante a extração. O favorecido só é criado ou associado no
momento da aprovação da importação.

## Caixa de comprovantes

Adicionar item de navegação e telas protegidas:

```http
GET  /receipt-imports
GET  /receipt-imports/:id
GET  /receipt-imports/:id/media
POST /receipt-imports/:id/approve
POST /receipt-imports/:id/reject
POST /receipt-imports/:id/reprocess
```

Requisitos de interface:

- textos em português;
- lista restrita ao usuário autenticado;
- destaque para `NEEDS_REVIEW` e `FAILED`;
- preview protegido da imagem;
- exibição de status, data de recebimento e alertas de duplicidade;
- formulário compacto com descrição/favorecido, data, valor, categoria e conta;
- campos preenchidos pela IA claramente apresentados como sugestões;
- confiança por campo e avisos em linguagem compreensível;
- categoria limitada às categorias de despesa ativas do usuário;
- conta obrigatória e limitada às contas ativas do usuário;
- botões Aprovar, Rejeitar e Reprocessar conforme o status;
- POSTs protegidos por CSRF;
- confirmação explícita antes de aprovar possível duplicidade;
- não expor JSON bruto do OpenRouter ou detalhes internos do prompt;
- usar `layout.js`, `viewHelpers.js`, ícones `lucide-static` e exportação por
  `viewEngine.js`.

A caixa de comprovantes não é uma tela mensal. A competência somente passa a
existir quando o lançamento é aprovado.

## Aprovação financeira

A aprovação deve ocorrer em uma única `withImmediateTransaction` e validar
novamente todos os dados dentro da transação.

Criar:

### Lançamento

```text
entry_type: EXPENSE
description: valor confirmado pelo usuário
party: favorecido confirmado
category_id: categoria confirmada ou nula, conforme regra atual
financial_account_id: conta confirmada
expected_amount_cents: valor confirmado
realized_amount_cents: inicialmente 0
competence_month: YYYY-MM da payment_date confirmada
due_date: payment_date confirmada no MVP
status: derivado pelas regras existentes
origin: WHATSAPP_RECEIPT
```

### Baixa

```text
financial_account_id: conta confirmada
settlement_type: PAYMENT
principal_cents: valor confirmado
total_cents: valor confirmado
settled_at: payment_date confirmada
closes_entry: true
```

Após a baixa, o lançamento deve terminar em `PAID` pelas regras existentes.

Requisitos adicionais:

- não alterar apenas `realized_amount_cents`;
- não usar o status `DRAFT` para contornar o fluxo de revisão;
- evitar transações aninhadas; extrair helpers internos que aceitem a conexão
  quando necessário, sem reescrever models inteiros;
- validar que a importação ainda pertence ao usuário e está em
  `NEEDS_REVIEW`;
- impedir segunda aprovação concorrente;
- exigir confirmação adicional quando `duplicate_of_id` estiver preenchido;
- relacionar `receipt_imports.financial_entry_id`;
- registrar auditoria da criação, da baixa e da aprovação do comprovante;
- em qualquer erro, fazer rollback de lançamento, baixa, auditoria e aprovação;
- depois do commit, a falha ao enviar resposta WhatsApp não pode desfazer a
  operação financeira.

## Respostas opcionais pelo WhatsApp

Usar o cliente outbound já existente somente para respostas curtas e
solicitadas pelo fluxo:

- recebimento aceito: `Comprovante recebido para conferência no EmDia.`;
- arquivo não suportado: orientação para enviar JPEG ou PNG;
- processamento concluído: mensagem curta com link quando `APP_BASE_URL` for
  uma URL segura configurada;
- falha definitiva: orientação para conferir pela interface.

O envio dessas respostas é desejável, mas não deve impedir a persistência do
webhook ou a revisão no EmDia. Não responder a remetente desconhecido de forma
que revele existência ou inexistência de cadastro.

## Segurança e privacidade

- nunca versionar ou imprimir chaves reais;
- manter `OPENROUTER_API_KEY`, chave HMAC e chave WAHA somente no ambiente;
- usar HTTPS quando webhook ou mídia atravessarem rede não confiável;
- validar origem da URL de mídia contra a configuração, evitando SSRF;
- não enviar telefone, email, ID do usuário, conta financeira ou histórico
  desnecessário ao OpenRouter ou ao provedor roteado;
- enviar somente a imagem e o contexto mínimo de categorias;
- manter `store: false` e `data_collection: deny` nas chamadas;
- manter desabilitadas as opções de logging de prompt e uso de dados no painel
  do OpenRouter;
- definir política de retenção e informar o usuário de que o comprovante será
  processado por serviço externo;
- impedir HTML, SQL ou caminho derivados da resposta do modelo;
- tratar toda saída da IA como entrada externa não confiável;
- escapar favorecido, descrição, avisos e demais campos na renderização;
- limitar simultaneidade do worker para controlar custo e uso de memória;
- impedir que o endpoint de mídia aceite caminho arbitrário;
- não tornar arquivos acessíveis por URL pública permanente.

## Participação necessária do responsável pelo EmDia

Antes da validação integrada, o responsável deve:

1. criar uma conta ou organização exclusiva do EmDia no OpenRouter;
2. habilitar faturamento e definir orçamento/alertas compatíveis com os testes;
3. criar uma chave de API e definir `OPENROUTER_API_KEY` no ambiente,
   sem enviar a chave em chat, task, commit ou log;
4. revisar os controles de dados e aceitar o processamento externo de
   comprovantes;
5. confirmar `OPENROUTER_RECEIPT_MODEL`, inicialmente `openai/gpt-5-mini`;
6. fornecer um conjunto sanitizado de aproximadamente 20 a 50 comprovantes
   variados, com gabarito de favorecido, data, valor e categoria;
7. configurar no WAHA o webhook `message`, HMAC, retries e retenção de mídia;
8. garantir que o endpoint do EmDia seja alcançável pelo WAHA por HTTPS ou rede
   privada confiável;
9. cadastrar no EmDia o telefone E.164 exato dos usuários de teste e resolver
   qualquer duplicidade antes da migration de unicidade;
10. escolher diretório de armazenamento com permissão restrita e espaço
    suficiente;
11. confirmar retenção inicial de 90 dias ou informar outro prazo;
12. autorizar explicitamente qualquer teste que chame WAHA ou OpenRouter reais.

A chave do OpenRouter não será necessária para desenvolver testes unitários e de
integração simulados. Ela só é necessária para a validação real da extração.

## Tratamento de erros

- configuração OpenRouter ausente: manter importação revisável ou `FAILED` com
  código `OPENROUTER_NOT_CONFIGURED`, sem descartar imagem;
- `401`/`403` OpenRouter: falha não retentável e mensagem administrativa
  sanitizada;
- `429` ou `5xx`: retry limitado com backoff;
- timeout: abortar a chamada e aplicar retry limitado;
- recusa ou saída vazia: registrar código normalizado e permitir revisão
  manual quando houver arquivo válido;
- mídia expirada no WAHA: tentar recuperação documentada por ID uma única vez,
  quando o engine suportar, ou terminar com orientação clara;
- mídia grande ou assinatura inválida: rejeitar antes do OpenRouter;
- usuário desconhecido, inativo ou telefone ambíguo: não criar importação;
- categoria removida após a extração: limpar sugestão na revisão;
- conta inativa após a extração: exigir nova seleção;
- erro após criação parcial na aprovação: rollback integral;
- falha ao apagar arquivo expirado: manter metadados e repetir limpeza depois.

## Arquivos candidatos

- `src/server.js`;
- `src/routes/whatsappWebhookRoutes.js`;
- `src/routes/receiptImportRoutes.js`;
- `src/models/ReceiptImport.js`;
- `src/models/User.js`;
- `src/models/FinancialEntry.js`;
- `src/models/Settlement.js`;
- `src/services/whatsappClient.js`;
- `src/services/whatsappInboundService.js`;
- `src/services/receiptStorageService.js`;
- `src/services/receiptExtractionService.js`;
- `src/services/receiptImportWorker.js`;
- `src/services/operationalLogger.js`;
- `src/services/viewEngine.js`;
- `src/views/receiptImportsView.js`;
- `src/database/migrations/*.js`;
- `test/unit/*.test.js`;
- `test/integration/*.test.js`;
- `.env.example`;
- `.gitignore`;
- `README.md`;
- `docs/patterns.md`;
- `docs/architecture.md`;
- `PRD_sistema_financas_pessoais.md`;
- `src/config/release.js`.

## Fora do escopo

- implementar esta task neste momento;
- instalar, atualizar ou administrar o servidor WAHA;
- criar, iniciar, parar ou parear sessões WAHA pela interface do EmDia;
- Evolution API inbound;
- Meta WhatsApp Cloud API;
- WebSocket ou polling de mensagens;
- grupos, canais, status ou múltiplos usuários pelo mesmo telefone;
- áudio, vídeo, PDF, HEIC, WebP, ZIP ou múltiplos anexos;
- lançamento automático sem revisão humana;
- criação automática de categoria ou conta financeira;
- OCR local, fine-tuning ou treinamento com comprovantes;
- armazenamento vetorial ou envio de histórico financeiro completo ao OpenRouter;
- anexar comprovante a lançamentos já existentes;
- alterar o comprovante depois da aprovação;
- incluir arquivos de comprovantes no backup gerenciado nesta primeira versão;
- retenção legal/fiscal de longo prazo;
- painel de custos do OpenRouter;
- processamento distribuído ou múltiplas instâncias concorrentes.

## Critérios de aceite

### Webhook e identidade

- somente `POST /webhooks/whatsapp/waha` recebe eventos inbound;
- corpo bruto é usado na verificação HMAC SHA-512;
- assinatura inválida e replay são recusados;
- evento válido recebe `200` sem aguardar mídia ou OpenRouter;
- retries do WAHA não duplicam importações;
- mensagens próprias, grupos e tipos não suportados são ignorados;
- `@c.us` é convertido para E.164 exato;
- `@lid` é resolvido pela API oficial de LIDs do WAHA;
- apenas um usuário ativo com telefone exato é identificado;
- telefones cadastrados passam a ser únicos quando preenchidos;
- usuário desconhecido, inativo ou ambíguo não gera importação;
- logs de todos esses resultados existem sem payload; telefone completo aparece
  somente em `user_not_found`.

### Arquivo e fila

- somente JPEG e PNG válidos são armazenados;
- limite de bytes funciona mesmo sem `Content-Length`;
- URL fora do host WAHA, redirect externo e path traversal são bloqueados;
- download usa header `X-Api-Key` sem revelar a chave;
- arquivo fica fora de `public/` e só pode ser lido pelo proprietário;
- SHA-256 e tamanho são persistidos;
- comprovante repetido é sinalizado, não apagado automaticamente;
- worker não mantém transação durante chamadas externas;
- reinício recupera item abandonado;
- retry é limitado e observável;
- retenção remove arquivo vencido sem remover lançamento ou auditoria.

### OpenRouter

- cliente usa Responses API, imagem e Structured Outputs estrito;
- request usa `store: false`;
- modelo é configurável e centralizado;
- API key não aparece em código, banco, logs ou respostas;
- prompt trata a imagem como conteúdo não confiável;
- valor retorna em centavos inteiros e data em ISO civil;
- saída é validada novamente pela aplicação;
- categoria é limitada às categorias de despesa do usuário;
- baixa confiança gera aviso e revisão, nunca aprovação automática;
- falhas de autenticação, rate limit, timeout e resposta inválida são tratadas;
- testes automatizados não fazem chamadas reais.

### Revisão e finanças

- importação não aparece em totais antes da aprovação;
- caixa de comprovantes é isolada por usuário;
- preview não é público;
- formulário permite corrigir todos os campos relevantes;
- conta financeira é obrigatória;
- possível duplicidade exige confirmação adicional;
- aprovação cria uma despesa com `origin = WHATSAPP_RECEIPT`;
- aprovação cria uma baixa em `settlements`;
- competência corresponde ao mês da data de pagamento confirmada;
- lançamento aprovado termina `PAID`;
- lançamento, baixa, auditoria e importação são atômicos;
- segunda aprovação concorrente é bloqueada;
- rejeição não cria ou altera dado financeiro;
- reprocessamento não é permitido para importação aprovada.

### Regressão e documentação

- notificações outbound WAHA continuam funcionando;
- `/health` e `/ready` mantêm seus contratos;
- indisponibilidade do OpenRouter ou WAHA não derruba o restante do EmDia;
- README, PRD, arquitetura, padrões, `.env.example` e `.gitignore` são
  atualizados;
- nenhuma chave, comprovante real ou telefone real entra no repositório;
- `npm run check` e `npm test` passam;
- controle de release é atualizado somente ao concluir a implementação.

## Testes esperados

### Unitários

- HMAC válido, inválido, tamanho diferente e algoritmo incorreto;
- timestamp dentro e fora da janela;
- normalização `@c.us`, `@s.whatsapp.net` e rejeição de grupos;
- resolução `@lid` encontrada, não encontrada, timeout e resposta inválida;
- telefone exato, ausente, inativo e duplicado;
- idempotência por mensagem do provedor;
- validação de URL contra SSRF e redirects;
- streaming acima do limite;
- magic bytes JPEG e PNG;
- hash e armazenamento atômico;
- transições de status e recuperação de processamento abandonado;
- schema da extração e validações semânticas;
- inferência local anterior à sugestão da IA;
- política de retry por classe de erro;
- limpeza por retenção.

### Integração HTTP e banco

- webhook público antes da autenticação;
- rota protegida comum continua exigindo login;
- webhook não exige CSRF; ações de revisão exigem;
- payload válido insere uma única `receipt_imports`;
- retry do mesmo webhook não duplica;
- arquivo só é servido ao proprietário;
- usuário não acessa importação de outro usuário;
- aprovação cria lançamento e settlement;
- falha forçada em qualquer etapa da aprovação faz rollback;
- concorrência de aprovação produz um único lançamento;
- duplicidade de telefone é impedida em perfil e administração;
- migration funciona em banco novo e banco existente sem duplicidades;
- migration informa conflito preexistente sem expor telefones;
- logs simulados não contêm segredos, telefone, valor ou payload.

Usar banco em memória ou diretório temporário e `fetch` simulado. Não depender
de internet, WAHA real, OpenRouter real ou arquivos em `data/`.

### Validação integrada opcional

Somente com autorização explícita e credenciais fornecidas no ambiente:

1. usar `PORT=3100` ou a próxima porta livre, nunca 3000;
2. iniciar o EmDia e capturar o PID;
3. configurar um webhook WAHA controlado com HMAC;
4. enviar um único comprovante sanitizado de telefone cadastrado;
5. confirmar log de recebimento sem dados sensíveis;
6. confirmar download, extração e `NEEDS_REVIEW`;
7. comparar a extração com o gabarito;
8. aprovar pela interface e confirmar despesa, settlement e status `PAID`;
9. repetir a entrega do webhook e confirmar idempotência;
10. testar remetente não cadastrado sem revelar cadastro;
11. encerrar somente o processo iniciado pelo agente.

## Referências

- [WAHA - eventos e HMAC](https://waha.devlike.pro/docs/how-to/events/)
- [WAHA - recebimento de mensagens e mídia](https://waha.devlike.pro/docs/how-to/receive-messages/)
- [WAHA - contatos e resolução de LID](https://waha.devlike.pro/docs/how-to/contacts/)
- [WAHA - segurança](https://waha.devlike.pro/docs/how-to/security/)
- [OpenRouter - Responses API](https://openrouter.ai/docs/api/reference/responses/overview)
- [OpenRouter - Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)
- [OpenRouter - entrada de imagens](https://openrouter.ai/docs/guides/overview/multimodal/image-understanding)
- [OpenRouter - Zero Data Retention](https://openrouter.ai/docs/guides/features/zdr)

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 31/07/2026 19:11
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao

---

## Implementação concluída

- migration `010_add_receipt_imports` com idempotência, fila, auditoria de
  processamento, hash de mídia e unicidade parcial do telefone E.164;
- webhook público WAHA com corpo bruto, HMAC SHA-512, anti-replay, resolução de
  remetente individual e persistência antes da resposta;
- armazenamento privado JPEG/PNG, limite durante streaming, hash SHA-256,
  escrita temporária e rename atômico;
- worker persistente com claim transacional, recuperação de item abandonado,
  retry limitado, reprocessamento e retenção de anexos;
- Responses API via OpenRouter com imagem em memória, `store: false`, modelo
  configurável, prompt resistente a instruções na imagem e JSON Schema estrito;
- caixa de comprovantes protegida, preview autenticado, alerta de duplicidade e
  revisão humana;
- aprovação atômica com despesa `WHATSAPP_RECEIPT`, baixa em `settlements`,
  status `PAID`, competência da data de pagamento e auditoria;
- logs operacionais sanitizados e documentação de configuração atualizada;
- validação concluída com `npm run check`, 100 testes automatizados e respostas
  HTTP 200 em `/health`, `/dashboard` e `/entries` na porta 3100.

---

## Assinatura da LLM

- Data: 31/07/2026 19:55
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Atualização: gateway OpenRouter

A integração direta com a OpenAI foi substituída pelo OpenRouter. O worker
continua usando o formato compatível da Responses API, mas agora chama
`OPENROUTER_BASE_URL`, autentica com `OPENROUTER_API_KEY` e usa o slug
configurável `OPENROUTER_RECEIPT_MODEL`.

O request exige suporte aos parâmetros enviados e aplica por padrão:

- `store: false`;
- `provider.require_parameters: true`;
- `provider.data_collection: deny`;
- ZDR não é exigido, evitando eliminar todos os provedores compatíveis.

A migration `011_generalize_receipt_ai_metadata` renomeia os campos específicos
da OpenAI para `extraction_model` e `extraction_response_id`, preservando bancos
que já tenham aplicado a migration 010. Os testes permanecem simulados e não
consomem créditos do OpenRouter.

---

## Assinatura da LLM

- Data: 01/08/2026 00:02
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Atualização: diagnóstico dos webhooks

Os logs de mensagens recebidas passaram a registrar metadados técnicos por
etapa, sem persistir o payload bruto. Os resultados agora incluem, quando
disponíveis:

- etapa `received`, `validated`, `sender_resolution`, `user_lookup` ou
  `persisted`;
- resultado `ignored`, `queued`, `duplicate`, `rejected` ou `failed`;
- evento, instância WAHA, engine, MIME e flags `fromMe`/`hasMedia`;
- presença dos headers de HMAC, timestamp e request ID;
- tamanho e tipo do corpo HTTP;
- referências seguras do evento, mensagem e remetente;
- motivo normalizado, status HTTP ou código de falha.

IDs que possam conter telefone são substituídos por referência HMAC-SHA256
local truncada. O E.164 completo é incluído somente quando o motivo for
`user_not_found`; chat ID, LID, URL da mídia, payload, valores e segredos
continuam proibidos no log. A cobertura automatizada passou a 101 testes.

---

## Assinatura da LLM

- Data: 01/08/2026 00:24
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Atualização: telefone no diagnóstico de usuário não encontrado

Por decisão explícita do responsável pelo EmDia, o evento
`whatsapp.webhook.ignored` com motivo `user_not_found` passa a registrar o campo
`senderPhoneE164` completo. A exceção é aplicada pelo logger somente a esse
evento e motivo; nos demais fluxos o mesmo campo continua redigido e os eventos
de usuário identificado não recebem o telefone nos metadados.

---

## Assinatura da LLM

- Data: 01/08/2026 00:28
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Atualização: compatibilidade com telefone brasileiro legado

O cadastro continua recebendo somente o telefone oficial no formato E.164. Para
celulares brasileiros atuais, o EmDia gera automaticamente e sem consulta ao
WAHA uma segunda representação, removendo o nono dígito do assinante. Exemplo:
`+5571992769969` gera o alias `+557192769969`.

A migration `012_add_legacy_whatsapp_phone` adiciona
`users.phone_whatsapp_legacy`, preenche cadastros existentes, cria índice único
e triggers que impedem colisões entre telefones canônicos e aliases de usuários
diferentes. O alias não é editável e não é criado para telefones fixos ou
internacionais.

O webhook procura usuário ativo nas duas colunas e registra
`userMatchStrategy` como `exact` ou `legacy_alias`. O E.164 recebido continua
visível no diagnóstico de `user_not_found`; após a identificação, o usuário e a
estratégia de casamento bastam para a correlação sem repetir o telefone no log.
Notificações de saída continuam usando exclusivamente o telefone canônico
informado pelo usuário.

Validações concluídas com `npm run check` e 104 testes automatizados, incluindo
o cenário real de cadastro `+5571992769969` e recebimento `+557192769969`.

---

## Assinatura da LLM

- Data: 01/08/2026 00:49
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Atualização: diagnóstico de resposta inválida do OpenRouter

O alerta `whatsapp.receipt.extraction_failed` passou a detalhar em qual etapa a
extração falhou, mantendo `OPENROUTER_INVALID_RESPONSE` como código estável. O
campo `reason` diferencia corpo HTTP não-JSON, ausência de `output_text`, texto
estruturado não-JSON, tipo de documento inválido e confiança fora do contrato.

Quando disponíveis, o log inclui status HTTP, content type e tamanho declarado
da resposta, ID e status técnico da resposta, tipos de itens retornados, motivo
de resposta incompleta, modelo, duração e campo que falhou na validação. Esses
dados passam por allowlist; corpo da resposta, texto extraído, prompt, imagem,
payload e segredos não são registrados.

O detalhe de identificação do webhook foi renomeado para
`userMatchStrategy`, evitando que o sanitizador o confunda com um telefone e o
mostre como `[redacted]`.

Validações concluídas com `npm run check` e 106 testes automatizados.

---

## Assinatura da LLM

- Data: 01/08/2026 01:00
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Atualização: remoção da exigência de ZDR

Por decisão do responsável pelo EmDia, as chamadas ao OpenRouter deixam de
enviar `provider.zdr: true`. A restrição eliminava todos os provedores elegíveis
em determinados roteamentos do `openai/gpt-5-mini`, resultando em HTTP 404 antes
da extração.

Permanecem ativos `store: false`, `provider.data_collection: deny` e
`provider.require_parameters: true`. Assim, o EmDia continua sem solicitar
armazenamento da resposta, exclui provedores classificados como coletores de
dados e exige suporte aos parâmetros usados pelo schema estruturado.

---

## Assinatura da LLM

- Data: 01/08/2026 07:59
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Atualização: orçamento de saída para raciocínio e JSON

O OpenRouter retornou HTTP 200 com status `incomplete`, motivo
`max_output_tokens` e somente um item `reasoning`. O limite anterior de 1.200
tokens foi consumido antes que o `openai/gpt-5-mini` produzisse o
`output_text` estruturado.

O request passa a usar `reasoning.effort: minimal` e 4.000 tokens de saída por
padrão. O valor pode ser configurado por
`OPENROUTER_RECEIPT_MAX_OUTPUT_TOKENS`, limitado pelo EmDia ao intervalo de
2.048 a 16.000 tokens. Isso preserva espaço para o JSON mesmo após o orçamento
mínimo de raciocínio e limita configurações acidentais de custo excessivo.

---

## Assinatura da LLM

- Data: 01/08/2026 08:24
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao

---

## Atualização: apresentação da possível duplicidade

O aviso de possível duplicidade deixou de reutilizar o componente global de
notificação, cujo grid reservava uma coluna estreita para o botão de fechar e
comprimia a descrição. A tela agora usa um alerta contextual próprio, com
título, texto, contraste e espaçamento adequados.

A confirmação também recebeu marcação e estilos específicos. O checkbox mantém
tamanho nativo compacto, fica alinhado ao início do texto, possui área de clique
confortável e associa o erro de validação por `aria-describedby`.

---

## Assinatura da LLM

- Data: 01/08/2026 08:35
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
