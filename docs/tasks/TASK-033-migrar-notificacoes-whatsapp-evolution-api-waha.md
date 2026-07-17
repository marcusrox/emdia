# TASK-033 - Adicionar WAHA como provedor de notificações WhatsApp

## Contexto

O EmDia envia lembretes e resumos financeiros pelo WhatsApp usando atualmente
o adaptador `EvolutionApiWhatsAppClient`, em `src/services/whatsappClient.js`.
As regras de geração, fila, idempotência e envio das notificações ficam em
`src/services/notificationService.js` e não devem depender do provedor.

O gateway disponível para o projeto passou a ser uma instalação WAHA acessível
por HTTPS. Um envio de texto já foi validado externamente com o contrato:

- `POST /api/sendText`;
- autenticação pelo header `X-Api-Key`;
- corpo JSON com `session`, `chatId` e `text`;
- destinatário individual no formato `DDI + número + @c.us`, sem o caractere
  `+`.

A documentação oficial do WAHA também define `GET /api/sessions/{session}`
para consultar a sessão e considera `WORKING` o estado operacional apto a
enviar mensagens.

## Objetivo

Adicionar o WAHA como opção de provedor outbound, mantendo compatibilidade com
a Evolution API, o mock de desenvolvimento, o comportamento atual das
notificações, a fila existente e a apresentação do estado da conexão nas
configurações.

O provedor deve ser escolhido exclusivamente por `WHATSAPP_PROVIDER`, sem
alterar regras de negócio nem exigir mudanças nos consumidores da interface
`WhatsAppClient`.

## Configuração

Adotar as seguintes variáveis de ambiente:

```env
WHATSAPP_PROVIDER=waha
WAHA_API_BASE_URL=https://waha.exemplo.com
WAHA_API_KEY=
WAHA_SESSION=
WAHA_REQUEST_TIMEOUT_MS=15000
```

Preservar também as variáveis existentes da Evolution API:

```env
EVOLUTION_API_BASE_URL=https://evolution.exemplo.com
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=
EVOLUTION_REQUEST_TIMEOUT_MS=15000
```

Regras de segurança:

- nunca versionar nem registrar `WAHA_API_KEY`;
- manter o valor real apenas no `.env` ou no gerenciador de segredos do
  ambiente;
- incluir somente valores vazios ou exemplos inofensivos em `.env.example`;
- não incluir a chave em mensagens de erro, logs, auditoria ou respostas HTTP;
- substituir a chave usada no teste fornecido antes da entrada em produção,
  pois ela foi compartilhada em texto;
- quando a edição instalada do WAHA oferecer chaves com escopo, preferir uma
  chave restrita à sessão configurada e à permissão necessária para envio.

## Contrato do cliente WAHA

Criar `WahaWhatsAppClient` preservando a interface interna já consumida pelo
serviço:

```js
getConnectionState(): Promise<WhatsAppConnectionState>
sendText({ to, message }): Promise<SendMessageResult>
```

### Consultar estado

Executar:

```http
GET {WAHA_API_BASE_URL}/api/sessions/{WAHA_SESSION}
X-Api-Key: {WAHA_API_KEY}
Accept: application/json
```

Mapear o campo `status` da resposta. O estado `WORKING` deve ser reconhecido
como conectado pelo fluxo de notificações. Estados como `STOPPED`, `STARTING`,
`SCAN_QR_CODE`, `FAILED` ou desconhecidos não devem liberar o envio.

O retorno interno deve manter o formato usado pela tela e pelo scheduler, por
exemplo:

```js
{
  ok: true,
  provider: "waha",
  state: "WORKING",
}
```

Falhas HTTP, timeout ou resposta inválida devem resultar em `ok: false`, estado
`ERROR` e mensagem sanitizada, sem expor URL com credenciais, headers ou corpo
sensível.

### Enviar texto

Executar:

```http
POST {WAHA_API_BASE_URL}/api/sendText
X-Api-Key: {WAHA_API_KEY}
Accept: application/json
Content-Type: application/json
```

Corpo:

```json
{
  "session": "sessao-configurada",
  "chatId": "5571999999999@c.us",
  "text": "Mensagem do EmDia"
}
```

O cliente deve manter o telefone E.164 armazenado pelo EmDia e remover apenas o
`+` e caracteres de formatação aceitos para consultar:

```http
GET /api/contacts/check-exists?phone=5571999999999&session=sessao-configurada
```

O envio deve usar exclusivamente o `chatId` retornado por essa consulta. Isso é
necessário especialmente para números brasileiros, cujo identificador interno
do WhatsApp pode existir com ou sem o nono dígito. Não remover o nono dígito por
regra fixa e não aceitar um `chatId` arbitrário vindo da fila.

Extrair o identificador da mensagem da resposta do WAHA quando disponível e
retorná-lo como `providerMessageId`. Se a versão/engine do WAHA não devolver um
identificador reconhecido, aceitar `null` sem marcar como falha um envio HTTP
bem-sucedido.

## Escopo

- Criar `WahaWhatsAppClient` em `src/services/whatsappClient.js` ou em módulo
  próprio, mantendo `createWhatsAppClient` como fábrica central.
- Fazer `WHATSAPP_PROVIDER=waha` selecionar o cliente apenas quando URL, chave e
  sessão estiverem preenchidas.
- Preservar `WHATSAPP_PROVIDER=evolution-api` e o comportamento atual de
  `EvolutionApiWhatsAppClient` quando a configuração `EVOLUTION_*` estiver
  completa.
- Manter `MockWhatsAppClient` como fallback seguro em desenvolvimento.
- Para configuração WAHA incompleta, retornar mock com mensagem explícita de
  configuração incompleta, seguindo o comportamento atual e sem revelar quais
  valores foram informados.
- Adaptar `getConnectionState` ao endpoint e aos estados do WAHA.
- Adaptar `sendText` ao endpoint, headers e payload do WAHA.
- Atualizar a lista de estados conectados em
  `src/services/notificationService.js` para aceitar `WORKING`.
- Preservar timeout com `AbortController` e normalizar erro de timeout para uma
  mensagem operacional clara em português.
- Manter logs sem texto integral da mensagem, telefone completo, chave ou
  demais dados sensíveis.
- Atualizar `.env.example`, README e as referências técnicas em
  `docs/architecture.md` e `docs/patterns.md` para documentar WAHA, Evolution
  API e mock como provedores selecionáveis.
- Atualizar o PRD apenas se necessário para registrar o WAHA como alternativa,
  sem remover o contrato ou as referências da Evolution API.
- Atualizar o comando de diagnóstico do README para exibir somente provedor,
  sucesso, estado e mensagem sanitizada.
- Atualizar o controle de release ao concluir a implementação.

## Compatibilidade entre provedores

WAHA, Evolution API e mock devem implementar a mesma interface interna. A
adição do WAHA não deve duplicar regras de fila, status, logging ou geração de
mensagens. Diferenças de endpoint, autenticação, payload, estado de conexão e
extração do ID da mensagem devem permanecer encapsuladas em cada cliente.

As variáveis dos dois provedores devem permanecer em `.env.example`, com
segredos vazios. A fábrica deve instanciar somente o provedor selecionado e não
deve exigir nem validar as credenciais do provedor inativo.

Registros antigos de notificações que contenham `provider_message_id` gerado
pela Evolution API devem permanecer válidos; não é necessária migração de
banco.

Trocar `WHATSAPP_PROVIDER` entre `waha`, `evolution-api` e `mock` deve ser
suficiente para selecionar o cliente correspondente após reiniciar a
aplicação.

## Tratamento de erros

- Resposta HTTP não 2xx deve gerar erro com o status HTTP e uma descrição
  sanitizada.
- `401` ou `403` deve orientar a verificar credencial/permissão sem mostrar a
  chave.
- `404` na consulta da sessão deve orientar a verificar `WAHA_SESSION`.
- Timeout deve interromper a requisição e permitir que o fluxo atual marque ou
  reagende a notificação conforme sua política existente.
- Resposta não JSON não deve quebrar o processo nem ser copiada integralmente
  para logs.
- Sessão diferente de `WORKING` deve adiar o envio sem consumir notificações
  pendentes.
- Uma falha em um envio não deve interromper o processamento das demais
  notificações do lote.

## Fora do escopo

- Instalar, atualizar ou administrar o servidor WAHA.
- Criar, iniciar, parar, reiniciar ou excluir sessões WAHA.
- Exibir QR Code ou implementar pareamento pela interface do EmDia.
- Implementar recebimento de mensagens, imagens ou webhooks WAHA.
- Alterar regras de vencimento, resumo diário, idempotência ou competência.
- Alterar a estrutura das tabelas `notifications` ou `whatsapp_messages`.
- Implementar envio de mídia, botões, localização, grupos ou canais.
- Persistir a chave WAHA no SQLite ou em formulários web.
- Implementar esta task neste momento.

## Critérios de aceite

- `WHATSAPP_PROVIDER=waha` com configuração completa cria o cliente WAHA.
- Configuração incompleta não realiza chamada externa e informa o fallback mock.
- A consulta usa `GET /api/sessions/{session}`, `X-Api-Key` e timeout.
- Uma sessão com status `WORKING` libera o processamento da fila.
- Uma sessão não operacional mantém as notificações pendentes sem tentativa de
  envio.
- O envio usa `POST /api/sendText` com `session`, `chatId` e `text`.
- Um telefone E.164 é consultado em `/api/contacts/check-exists` e o envio usa o
  `chatId` retornado pelo WAHA, inclusive quando ele difere pela presença do
  nono dígito brasileiro.
- Telefone vazio ou inválido é rejeitado antes da chamada ao WAHA.
- `numberExists: false` impede o envio com mensagem clara e sem expor o número.
- Resposta sem `chatId` individual numérico terminado em `@c.us` ou `@lid`
  impede o envio.
- Um envio 2xx é marcado como enviado e armazena o ID retornado quando houver.
- Erros HTTP, autenticação, sessão inexistente, timeout e JSON inválido são
  tratados sem expor segredos.
- O mock continua funcionando sem acesso à internet.
- `WHATSAPP_PROVIDER=evolution-api` continua consultando o estado e enviando
  mensagens pelo contrato atual da Evolution API.
- Configuração incompleta do WAHA não interfere na Evolution API selecionada, e
  configuração incompleta da Evolution API não interfere no WAHA selecionado.
- Nenhuma chave real ou telefone de teste é adicionado ao repositório.
- As notificações já existentes de vencimento, atraso e resumo diário mantêm o
  mesmo texto e comportamento funcional.
- A tela de configurações mostra o provedor `waha` e o estado da sessão.
- `.env.example` documenta separadamente `WAHA_*` e `EVOLUTION_*`, sem segredos.
- `npm run check` passa.

## Validação sugerida

Validação sintática:

```powershell
npm run check
```

Testes do cliente com `fetch` simulado, sem chamar o ambiente real:

- confirmar método, URL, headers e corpo de `sendText`;
- confirmar conversão de E.164 para `@c.us`;
- confirmar mapeamento de `WORKING` e estados não conectados;
- simular `200`, `401`, `403`, `404`, `500`, timeout e resposta não JSON;
- confirmar que chave, telefone completo e texto não aparecem nos logs.
- executar testes de regressão do cliente Evolution API, confirmando que seus
  endpoints, headers e payload permanecem inalterados;
- confirmar que somente as variáveis do provedor selecionado são obrigatórias.

Validação integrada opcional no WAHA real, somente com autorização e
destinatário controlado:

- definir as variáveis WAHA no ambiente sem imprimi-las;
- consultar o estado da sessão;
- enviar uma única mensagem de teste identificada como teste do EmDia;
- confirmar o recebimento e o registro da notificação como enviada;
- não usar a porta 3000 para qualquer validação HTTP do EmDia.

Validação HTTP própria, usando `PORT=3100` ou a próxima porta livre:

- testar `GET /health`;
- testar `GET /settings` e confirmar estado/provedor do WhatsApp;
- executar um ciclo controlado com uma notificação pendente em banco temporário;
- encerrar somente o processo iniciado pelo agente.

## Referências

- [WAHA - envio de mensagens](https://waha.devlike.pro/docs/how-to/send-messages/)
- [WAHA - sessões](https://waha.devlike.pro/docs/how-to/sessions/)
- [WAHA - segurança e chaves](https://waha.devlike.pro/docs/how-to/security/)

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1 e usando a data/hora atual do ambiente.

---

## Assinatura da LLM

- Data: 16/07/2026 20:10
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 16/07/2026 20:16
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização

## Implementação

- Foi criado `WahaWhatsAppClient` com consulta de sessão em
  `GET /api/sessions/{session}` e envio de texto em `POST /api/sendText`.
- O cliente usa `X-Api-Key`, `Accept: application/json`, timeout com
  `AbortController` e mensagens de erro sanitizadas.
- Telefones E.164 são validados antes do envio, sem aceitar um `chatId`
  arbitrário.
- A fábrica passou a selecionar `waha`, `evolution-api` ou `mock`, validando
  somente as variáveis do provedor ativo.
- O contrato e os endpoints existentes da Evolution API foram preservados.
- O estado WAHA `WORKING` passou a liberar o processamento das notificações.
- O log do mock deixou de registrar o telefone completo do destinatário.
- `.env.example`, README, PRD, padrões e arquitetura foram atualizados para os
  provedores selecionáveis.
- Foram validados seleção dos clientes, payloads, headers, conversão do
  telefone, ID da mensagem, autenticação recusada, erro HTTP, JSON inválido,
  timeout e regressão do envio Evolution API usando `fetch` simulado.
- `npm run check` passou.
- A validação HTTP em banco temporário confirmou `GET /health` e
  `GET /settings` na porta 3100 com o provedor mock.
- O controle de release foi atualizado para a sequência 034.

---

## Assinatura da LLM

- Data: 16/07/2026 20:29
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização

## Ajuste de resolução do destinatário brasileiro

- O telefone continua persistido e validado em E.164 no EmDia.
- Antes de enviar, o cliente WAHA consulta
  `GET /api/contacts/check-exists`, informando telefone e sessão.
- O `chatId` retornado pelo WAHA é validado e usado sem adicionar ou remover o
  nono dígito por heurística.
- Contato inexistente, resposta inválida ou `chatId` inválido interrompem o
  envio com mensagem sanitizada.
- O controle de release foi atualizado para a sequência 035.

---

## Assinatura da LLM

- Data: 16/07/2026 21:01
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização

## Ajuste para identificadores LID

- A resposta real do WAHA confirmou que `check-exists` pode resolver um número
  brasileiro para um identificador numérico terminado em `@lid`.
- O cliente passou a aceitar `@c.us` e `@lid` como destinos individuais
  válidos retornados pelo WAHA.
- Identificadores de grupos, canais ou formatos arbitrários continuam
  bloqueados antes do envio.
- O controle de release foi atualizado para a sequência 036.

---

## Assinatura da LLM

- Data: 16/07/2026 21:15
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização
