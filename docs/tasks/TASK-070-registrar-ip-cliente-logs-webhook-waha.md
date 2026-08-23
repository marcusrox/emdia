# TASK-070 - Registrar IP do cliente nos logs do webhook WAHA

## Contexto

O EmDia registra eventos operacionais detalhados para o endpoint público
`POST /webhooks/whatsapp/waha`, incluindo recebimento, validação, rejeição,
eventos ignorados, duplicidade, enfileiramento e falhas. Esses registros ainda
não informam o endereço IP de origem da requisição.

Durante o diagnóstico de entregas que recebem resposta HTTP antes de alcançar o
handler, conhecer o IP observado pelo EmDia ajuda a correlacionar requisições do
WAHA com logs do proxy reverso, Cloudflare e regras de WAF.

Nesta task, “IP do cliente” significa o IP da conexão HTTP resolvido pelo
Express a partir da cadeia de proxies explicitamente confiáveis. Em produção,
ele normalmente será o IP público de saída do servidor WAHA. Não se trata do
telefone, chat ID, LID ou endereço do remetente da mensagem no WhatsApp.

## Objetivo

Adicionar o IP de origem normalizado aos detalhes dos eventos operacionais
gerados durante o recebimento de webhooks WAHA, preservando a segurança contra
headers forjados e sem registrar a cadeia completa de proxies.

## Comportamento esperado

- Incluir `clientIp` nos detalhes de `whatsapp.webhook.received`.
- Propagar o mesmo `clientIp` para os demais eventos emitidos durante a mesma
  requisição, quando aplicáveis:
  - `whatsapp.webhook.invalid_signature`;
  - `whatsapp.webhook.replay_rejected`;
  - `whatsapp.webhook.invalid_payload`;
  - `whatsapp.webhook.ignored`;
  - `whatsapp.webhook.duplicate`;
  - `whatsapp.webhook.failed`;
  - `whatsapp.receipt.queued`.
- Usar o valor resolvido pelo Express em `req.ip`, com fallback controlado para
  `req.socket.remoteAddress`.
- Reutilizar a normalização compartilhada de IP já empregada por
  `requestDetails`, evitando uma terceira implementação divergente.
- Remover o prefixo IPv4 mapeado em IPv6 (`::ffff:`) e usar `unknown` quando o
  endereço não estiver disponível.
- Aceitar IPv4 e IPv6, limitar o tamanho do valor e remover caracteres de
  controle antes de gravá-lo.
- Registrar apenas um IP normalizado, nunca o conteúdo bruto de
  `X-Forwarded-For`, `Forwarded`, `CF-Connecting-IP` ou a cadeia completa de
  proxies.
- Manter o IP dentro de `details`, sujeito ao sanitizador do logger operacional
  e visível somente na área administrativa existente.

## Confiança em proxy

O projeto usa atualmente `app.set("trust proxy", "loopback")`. A implementação
deve validar a topologia real de produção antes de ampliar essa configuração.

- Não confiar diretamente em `X-Forwarded-For` ou `CF-Connecting-IP` enviados
  por qualquer cliente.
- Não configurar `trust proxy` como `true` de forma irrestrita.
- Se o proxy imediato em produção não for loopback, documentar e configurar
  somente os proxies ou redes efetivamente controlados.
- Garantir que o proxy confiável substitua, em vez de apenas acrescentar, os
  headers de encaminhamento recebidos da internet.
- Uma eventual mudança global em `trust proxy` deve ser pequena, explícita e
  coberta por testes contra falsificação de IP.
- Se a topologia não puder ser confirmada, manter a política atual e registrar
  o IP efetivamente resolvido pelo Express, documentando que ele pode
  representar o proxy imediato.

## Privacidade e segurança

- Tratar o endereço IP como dado operacional potencialmente pessoal.
- Não incluir IP em auditoria financeira, respostas HTTP, notificações,
  interface pública ou payloads enviados a terceiros.
- Não associar o IP a telefone, chat ID, LID, URL de mídia ou corpo bruto do
  webhook no log.
- Não reduzir as validações existentes de HMAC SHA-512, timestamp antirreplay,
  tipo de conteúdo ou limite de corpo.
- Não usar o IP como mecanismo único de autenticação ou autorização do
  webhook.
- Preservar as regras atuais de sanitização e retenção dos logs operacionais.

## Arquivos candidatos

- `src/routes/whatsappWebhookRoutes.js`;
- `src/services/http.js`;
- `src/server.js`, somente se a topologia exigir ajuste explícito de
  `trust proxy`;
- `src/services/operationalLogger.js`, somente se for necessário reforçar a
  normalização ou allowlist do campo;
- `test/receiptImports.test.js`;
- `test/integration/http.test.js`, se houver mudança na confiança de proxy;
- `docs/patterns.md` e `docs/architecture.md`, para registrar a decisão de
  proxy e privacidade;
- `src/config/release.js`, ao concluir a implementação desta task.

## Fora do escopo

- alterar configurações ou regras do Cloudflare;
- criar allowlist de IPs do WAHA como substituta do HMAC;
- armazenar o IP em `receipt_imports`, auditoria financeira ou outra tabela;
- registrar headers HTTP completos;
- expor o IP em páginas públicas ou para usuários não administradores;
- alterar o worker de comprovantes, download de mídia ou integração com o
  OpenRouter;
- implementar esta task no momento de sua criação.

## Critérios de aceite

- um webhook recebido gera `whatsapp.webhook.received` com `details.clientIp`;
- rejeições, eventos ignorados, duplicidades, enfileiramento e falhas gerados
  pela mesma requisição preservam o mesmo IP;
- IPv4 mapeado em IPv6 é normalizado sem o prefixo `::ffff:`;
- IPv6 válido permanece identificável;
- ausência de IP resulta em `unknown`, sem lançar exceção;
- valores com caracteres de controle ou tamanho excessivo não entram no log
  sem normalização;
- headers de encaminhamento não são lidos diretamente pela rota do webhook;
- um cliente não consegue escolher livremente o IP registrado quando se
  conecta fora da cadeia de proxies confiáveis;
- HMAC inválido continua retornando `401` ou `403` conforme o contrato atual;
- payload válido continua retornando `200` e preserva a idempotência;
- nenhum telefone, chat ID, LID, URL de mídia, payload bruto ou segredo é
  adicionado ao log;
- a documentação explica o significado e a limitação de `clientIp`;
- a release é incrementada ao concluir a implementação.

## Testes esperados

- teste unitário do helper compartilhado com IPv4, IPv4 mapeado em IPv6, IPv6,
  valor ausente, caracteres de controle e tamanho excessivo;
- teste de `incomingRequestDetails` confirmando preferência por `req.ip` e
  fallback para `req.socket.remoteAddress`;
- teste HTTP de webhook assinado confirmando `clientIp` no evento
  `whatsapp.webhook.received`;
- teste HTTP de assinatura inválida confirmando o mesmo IP no evento de
  rejeição;
- teste de evento ignorado ou duplicado confirmando a propagação do IP;
- se `trust proxy` for alterado, testes com conexão confiável e não confiável
  demonstrando que `X-Forwarded-For` arbitrário não permite falsificação;
- `npm run check`;
- `npm test`;
- revisão de `git diff` para confirmar que não houve persistência ou exposição
  pública do IP.

---

## Assinatura da LLM

- Data: 22/08/2026 21:51
- Modelo: GPT-5
- Versao: não informado
- Acao: criacao

---

## Implementação concluída

- a resolução do IP foi centralizada em `requestClientIp`, com validação de
  IPv4/IPv6, remoção de caracteres de controle, limite de tamanho, normalização
  de IPv4 mapeado e fallback seguro para `req.socket.remoteAddress`;
- `incomingRequestDetails` passou a incluir `clientIp`, propagado para
  recebimento, rejeição, evento ignorado, duplicidade, enfileiramento e falha;
- a rota continua sem ler diretamente `X-Forwarded-For`, `Forwarded` ou
  `CF-Connecting-IP` e a política `trust proxy` permanece restrita a loopback;
- testes unitários e HTTP cobrem normalização, fallback, rejeição de valor
  arbitrário, enfileiramento, assinatura inválida, evento ignorado, duplicidade
  e falha;
- `docs/patterns.md` documenta significado, privacidade e limite operacional do
  campo;
- release incrementada para `Release 22/08/2026 21:58 - 119`.

---

## Assinatura da LLM

- Data: 22/08/2026 21:58
- Modelo: GPT-5
- Versao: não informado
- Acao: atualizacao
