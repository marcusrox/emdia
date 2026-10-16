# 💸 EmDia

**EmDia** é um sistema web publicado na internet para controle de contas,
receitas, vencimentos e baixas financeiras. O projeto foi implementado a partir do PRD técnico
[`PRD_sistema_financas_pessoais.md`](./PRD_sistema_financas_pessoais.md).

> 🎯 Ideia central: trabalhar sempre a partir das contas da competência do mês
> corrente, com opção clara para navegar entre meses.

---

## ✨ Funcionalidades

- 📊 Dashboard mensal com saldo previsto, receitas, despesas e vencimentos.
- 📅 Filtro padrão por competência do mês corrente (`YYYY-MM`).
- ⏮️ Navegação para mês anterior, próximo mês e retorno ao mês atual.
- 🧾 Cadastro, edição, duplicação e cancelamento de lançamentos.
- ✅ Registro de baixas parciais ou totais, com histórico e estorno auditável.
- 🔁 Cadastro de recorrências mensais e geração idempotente de ocorrências.
- 🗓️ Agenda mensal de vencimentos.
- 🏦 Cadastro, edição, arquivamento e restauração de contas financeiras.
- 🏷️ Cadastro, edição, arquivamento e restauração de categorias.
- 🔎 Busca e filtros de lançamentos por tipo, status, categoria e conta.
- 📤 Exportação CSV conforme a competência e os filtros ativos.
- 💬 Notificações por WhatsApp com `mock`, Evolution API ou WAHA.
- ✉️ E-mail transacional de conta criada pelo Resend, com fila e cliente `mock`.
- 📥 Comprovantes JPEG/PNG recebidos pelo WAHA, extraídos via OpenRouter e
  submetidos à revisão humana antes da baixa.
- 🛡️ Login por sessão, proteção CSRF e administração de usuários.
- 📜 Auditoria funcional, fila de notificações e logs operacionais.
- 🧪 Testes unitários e de integração com banco SQLite isolado.
- 🌱 Seed automático com usuário local e dados de exemplo.
- 🧠 Regras de status para pendente, vencido, pago e recebido.
- 🗃️ Persistência local em SQLite com migrações incrementais.

---

## 🧰 Tecnologias

- 🟩 Node.js 24.15+ e menor que 25
- 🗄️ SQLite via `node:sqlite`
- 🌐 Express 5.x
- 🎨 HTML renderizado no servidor
- 💅 CSS puro
- 🎯 Ícones SVG via `lucide-static`

> ℹ️ A partir do Node.js 24.15, o módulo `node:sqlite` usado pelo EmDia está em
> estágio release candidate. O projeto não homologa outras linhas principais
> do Node automaticamente.

O requisito completo é `>=24.15.0 <25`. Com NVM, use a versão indicada pelo
repositório antes de instalar dependências:

```bash
nvm use
node --version
npm ci
```

---

## 🚀 Como rodar em ambiente de desenvolvimento local

Na raiz do projeto:

```bash
npm start
```

Acesse:

```text
http://localhost:3000
```

Credenciais locais criadas pelo seed:

```text
E-mail: usuario@emdia.local
Senha: emdia123
```

Para definir outra senha no primeiro seed, use a variavel
`EMDIA_DEFAULT_PASSWORD` antes de iniciar a aplicacao.

O banco local é criado automaticamente em:

```text
data/emdia.sqlite
```

---

## 🌱 Dados iniciais

O seed roda automaticamente ao iniciar a aplicação. Para executar manualmente:

```bash
npm run seed
```

Ele cria:

- 👤 usuário local padrão;
- 🏦 contas financeiras iniciais;
- 🏷️ categorias de receita e despesa;
- 🧾 lançamentos de exemplo na competência do mês corrente.

---

## 🧪 Validação

Para checar a sintaxe dos principais arquivos JavaScript:

```bash
npm run check
```

Para executar os testes unitários e de integração em banco SQLite isolado:

```bash
npm test
```

Em produção no aaPanel, confirme também o runtime efetivo do processo e o
health check, sem exibir variáveis sensíveis:

```bash
node --version
npm --version
runuser -u www -- /usr/bin/pm2 describe emdia
curl --fail http://127.0.0.1:3000/ready
```

`/health` verifica somente se o processo HTTP está vivo. `/ready` também
consulta o SQLite e confirma que todas as migrations esperadas foram aplicadas;
retorna `503` quando a aplicação ainda não pode receber tráfego. A integração
WhatsApp não participa do readiness.

A suíte usa `node:test` e Supertest, não acessa `data/emdia.sqlite` e não abre
porta HTTP. Os testes de rotas exercitam diretamente a aplicação Express.
`npm test` descobre automaticamente arquivos `test/**/*.test.js`; helpers e
fixtures devem ficar em `test/helpers/` sem o sufixo `.test.js`.

A prioridade da suíte é risco de negócio:

- crítico: finanças, atomicidade, isolamento, migrations e backup;
- alto: sessões, autorização, administração, contas, categorias e erros;
- moderado: renderização, filtros, CSV, notificações e rotas operacionais.

O helper de banco recusa qualquer caminho diferente de `:memory:`. Testes que
precisam de arquivos SQLite usam diretórios temporários próprios.

Rotas úteis para validação manual:

```text
GET /health
GET /dashboard
GET /entries
```

---

## 📜 Scripts disponíveis

```bash
npm start      # inicia a aplicação
npm run dev    # inicia com watch do Node
npm run seed   # cria dados iniciais
npm run check  # valida sintaxe dos arquivos principais
npm test       # executa testes unitários e de integração
npm run backup # cria e verifica um backup consistente
npm run backup:list
npm run backup:verify -- backups/arquivo.sqlite
npm run restore -- backups/arquivo.sqlite --confirm
```

---

## 💾 Backup e restauração

Por padrão, os backups ficam em `backups/`, fora de `data/` e ignorados pelo
Git. Para usar outro local, configure `EMDIA_BACKUP_DIR` com um diretório
dedicado.

Criar um backup consistente, inclusive quando o SQLite estiver em WAL:

```bash
npm run backup
```

O comando usa a API nativa de backup do SQLite, executa `integrity_check` e
`foreign_key_check` e grava um manifesto JSON com tamanho, migration e checksum
SHA-256.

Listar e verificar:

```bash
npm run backup:list
npm run backup:verify -- backups/emdia-backup-AAAAMMDDTHHMMSSmmmZ-id.sqlite
```

Restaurar é uma operação destrutiva. Encerre completamente o EmDia e execute:

```bash
npm run restore -- backups/emdia-backup-AAAAMMDDTHHMMSSmmmZ-id.sqlite --confirm
```

Antes de substituir o banco, o comando:

1. valida o backup informado;
2. confirma que a aplicação não mantém o lock operacional;
3. cria e verifica um backup `emdia-before-restore-*` do banco atual;
4. prepara e verifica o banco restaurado em arquivo temporário;
5. substitui o banco e executa nova verificação;
6. recupera o arquivo original se houver falha durante a troca.

Nunca remova o backup `before-restore` antes de confirmar que a aplicação abriu
corretamente e que os dados esperados estão presentes. Backups no mesmo disco
protegem contra erro operacional, mas não substituem uma cópia externa.

Não há retenção ou exclusão automática nesta versão.

---

## 🗂️ Estrutura do projeto

```text
emdia/
  app.js
  AGENTS.md
  README.md
  PRD_sistema_financas_pessoais.md
  public/
    css/
      styles.css
    js/
      app.js
  src/
    config/
      env.js
      release.js
    database/
      connection.js
      migrations/
      migrator.js
      schema.js
      seed.js
      transaction.js
    models/
      AuditLog.js
      Category.js
      FinancialAccount.js
      FinancialEntry.js
      Notification.js
      NotificationPreference.js
      Party.js
      ReceiptImport.js
      Recurrence.js
      Settlement.js
      User.js
    middleware/
      auth.js
      errors.js
    routes/
      *Routes.js
    services/
      authService.js
      csvService.js
      databaseBackupService.js
      databaseLockService.js
      dateService.js
      formValidation.js
      id.js
      moneyService.js
      notificationService.js
      receiptImportWorker.js
      receiptStorageService.js
      statusService.js
      viewEngine.js
      viewHelpers.js
      whatsappClient.js
    views/
      *View.js
    server.js
  test/
    integration/
    unit/
  scripts/
    backup.js
    list-backups.js
    restore-backup.js
    verify-backup.js
```

---

## 🧭 Regra principal de produto

O EmDia é orientado por **competência mensal**.

Quando nenhuma competência é informada, as telas operacionais assumem a
competência do mês corrente do usuário:

- 📊 dashboard;
- 🧾 listagem de lançamentos;
- 🗓️ agenda de vencimentos;
- 🔎 filtros e buscas;
- 📈 relatórios mensais futuros.

A competência usa o formato:

```text
YYYY-MM
```

Exemplo:

```text
2026-07
```

---

## 🔐 Segurança e dados locais

- 🚫 Não versione `data/`, `node_modules/` ou arquivos SQLite.
- 🚫 Não registre senhas, tokens ou dados sensíveis em logs.
- ✅ Valores monetários devem ser tratados em centavos inteiros.
- ✅ SQL deve usar placeholders `?`.
- ✅ Dados exibidos em HTML devem ser escapados.
- ✅ Backups e locks operacionais devem permanecer fora do versionamento.
- ✅ Novas senhas devem ter ao menos 12 caracteres; hashes antigos continuam
  válidos até a próxima troca.
- ✅ O login possui limite em memória por IP confiável e e-mail normalizado.
  Em múltiplas instâncias, substitua-o por armazenamento compartilhado.
- ✅ Visitantes podem criar uma conta em `/signup`. O fluxo usa token CSRF
  público assinado, limite por IP e cria o usuário comum com contas e categorias
  iniciais próprias em uma única transação.
- ✅ Sessões duram 8 horas, usam cookie `Secure` em produção e são removidas
  periodicamente quando expiradas ou revogadas.
- ✅ A CSP permite apenas assets locais e imagens do Gravatar. HSTS só é
  enviado em produção quando `EMDIA_HTTPS_ENABLED=1`.

Os limites, janelas de login e cadastro, limpeza de sessões e timeout de readiness são
configuráveis pelas variáveis documentadas em `.env.example`.

---

## ✉️ E-mail transacional pelo Resend

O cadastro público enfileira um e-mail de conta criada sem aguardar o provedor.
Em desenvolvimento use `EMAIL_PROVIDER=mock`. Em produção, verifique o domínio
`idevs.com.br` no Resend, crie uma chave exclusiva de envio e configure:

```dotenv
EMAIL_PROVIDER=resend
EMAIL_FROM=EmDia <nao-responda@idevs.com.br>
RESEND_API_KEY=
RESEND_BASE_URL=https://api.resend.com
RESEND_REQUEST_TIMEOUT_MS=15000
EMAIL_NOTIFICATIONS_DISABLED=0
EMAIL_NOTIFICATION_INTERVAL_MS=60000
EMAIL_NOTIFICATION_MAX_ATTEMPTS=5
```

Cadastre no DNS os registros SPF e DKIM fornecidos pelo Resend e adote uma
política DMARC apropriada. Nunca versione a API key. O estado `SENT` na fila
significa que o provedor aceitou o envio; confirmação de entrega por webhook
ainda não faz parte do sistema.

## 💬 Integração com WhatsApp

O envio de notificações aceita `mock`, `evolution-api` ou `waha` em
`WHATSAPP_PROVIDER`. Configure somente as variáveis do provedor selecionado,
conforme o `.env.example`; as chaves nunca devem ser versionadas ou exibidas em
logs.

Configure `APP_BASE_URL` com a origem pública do EmDia, sem caminho adicional,
para que lembretes de vencimento incluam links absolutos para os lançamentos.
Em produção, use `https://emdia.idevs.com.br`. Quando a variável estiver vazia
ou inválida, a linha de acesso é omitida da mensagem.

Consultar o estado configurado, exibindo somente dados operacionais
sanitizados:

```powershell
node -e "const { loadEnv } = require('./src/config/env'); loadEnv(); const { getWhatsAppStatus } = require('./src/services/notificationService'); getWhatsAppStatus().then((s)=>console.log(JSON.stringify({provider:s.provider,ok:s.ok,state:s.state,message:s.message||null})))"
```

---

## 🛣️ Próximos passos sugeridos

- 🧾 Parcelamento básico com geração transacional das parcelas.
- 👥 Administração dedicada de favorecidos e pagadores já criados pelos fluxos
  financeiros.
- 📈 Relatórios mensais e históricos.
- 📎 Upload autenticado de comprovantes, boletos e recibos fora do WhatsApp.
- 📄 Suporte a PDF e estratégia de arquivo fiscal para comprovantes.
- 📊 Métricas de entrega e webhooks de confirmação dos provedores outbound.

---

## 📌 Status

```text
Status: Sistema web publicado na internet
Persistência: SQLite local
Interface: server-rendered HTML
Foco atual: controle mensal de contas, receitas e despesas
```

## Comprovantes recebidos pelo WhatsApp

O EmDia pode receber imagens JPEG/PNG por um webhook `message` do WAHA,
identificar o usuário pelo telefone canônico ou pelo alias brasileiro legado,
extrair os dados com a Responses API
via OpenRouter e disponibilizar a importação em **Comprovantes** para revisão. A
aprovação pode criar uma despesa paga ou vincular o comprovante à baixa de uma
despesa existente; nenhuma extração cria ou altera um lançamento definitivo
sem confirmação humana.

Configuração mínima adicional:

```env
WAHA_API_BASE_URL=https://waha.exemplo.com
WAHA_API_KEY=
WAHA_SESSION=default
WAHA_WEBHOOK_HMAC_KEY=
OPENROUTER_API_KEY=
# Modelos configuráveis: mantenha somente uma opção ativa
#OPENROUTER_RECEIPT_MODEL=openai/gpt-5-mini
#OPENROUTER_RECEIPT_MODEL=google/gemini-2.5-flash-lite
OPENROUTER_RECEIPT_MODEL=qwen/qwen3.7-flash
OPENROUTER_RECEIPT_REASONING=
OPENROUTER_RECEIPT_MAX_OUTPUT_TOKENS=4000
```

No WAHA, configure `POST https://SEU-EMDIA/webhooks/whatsapp/waha`, somente o
evento `message`, HMAC SHA-512 com a mesma chave do EmDia, download de mídia e
retenção recomendada de pelo menos 900 segundos. Cada usuário que utilizar o
recurso precisa ter um celular único cadastrado em E.164. Para celulares
brasileiros atuais, o EmDia gera localmente o formato legado sem o nono dígito
e consulta as duas representações no webhook, sem validar o cadastro no WAHA.
Consulte
`.env.example` para limites, timeouts, retenção e diretório de armazenamento.

Crie uma chave exclusiva no OpenRouter, defina orçamento/limites e guarde a
chave somente no ambiente. O modelo é configurável; mantenha somente uma linha
`OPENROUTER_RECEIPT_MODEL` ativa. O padrão é
`qwen/qwen3.7-flash`. Todos os modelos usam JSON mode (`json_object`), com o
mesmo schema no prompt, normalização de avisos e validação local completa dos
campos antes da validação financeira. A integração não escolhe regras pelo nome
do modelo nem solicita JSON Schema estrito no provedor. O modelo escolhido
precisa aceitar imagens, JSON mode e os parâmetros configurados, nos provedores
permitidos pela conta. Trocar por um modelo compatível exige apenas configurar
`OPENROUTER_RECEIPT_MODEL` e reiniciar a aplicação; a qualidade do OCR ainda
precisa ser conferida. O EmDia sempre envia `store: false`,
`provider.require_parameters: true` e
`provider.data_collection: deny`; ZDR não é exigido. Testes automatizados usam
mocks e não consomem WAHA ou OpenRouter reais.

### Diagnosticar o OpenRouter sem depender do webhook

Execute no ambiente de desenvolvimento ou no container de produção, com as
variáveis `OPENROUTER_*` configuradas no processo:

```bash
node scripts/diagnose-openrouter.js
node scripts/diagnose-openrouter.js --send
node --env-file=.env scripts/diagnose-openrouter.js --send
```

A primeira execução apenas mostra a configuração sanitizada. `--send` faz uma
chamada real, sujeita à cobrança do provedor, com PNG branco de 64×64 e a mesma
estrutura de requisição da extração. Não inicia servidor, acessa o banco,
recebe WhatsApp ou cria lançamentos. O script usa as variáveis do processo e
não carrega `.env` automaticamente. Para usar o arquivo local com o carregador
do Node, execute `node --env-file=.env scripts/diagnose-openrouter.js --send`.

O teste verifica roteamento, recebimento de JSON e o contrato de campos
(`schemaValidation: passed`); a imagem sintética não
valida a qualidade do OCR nem a extração de um comprovante real. Para comparar
ambientes, use o mesmo modelo, parâmetros e uma chave sujeita às mesmas
políticas de conta/organização. A opção `--model` afeta somente esse teste.
O diagnóstico mostra o objeto `reasoning` validado e `reasoningSource`:
`json` ou `provider_default`. Configuração inválida é rejeitada
antes da chamada. Falhas de saída incluem etapa, campo, regra e tipo quando
disponíveis, sem imprimir o conteúdo recebido.

Erros da API recebem uma classificação segura `providerErrorReason` também
nos logs do worker: `data_policy`, `unsupported_parameters`,
`no_matching_endpoints`, `model_unavailable`, `resource_not_found` ou
`json_reasoning_incompatible`, `invalid_image`, `unsupported_output_format` ou
`unclassified`. A classificação identifica mensagens conhecidas sem registrar
o texto livre do provedor, imagens, dados financeiros ou credenciais.
`endpointPathExpected: false` indica que o caminho configurado difere do padrão
`/api/v1/responses`; confira a configuração antes de investigar o modelo.

### Configurar raciocínio sem alterar código

Configure o objeto `reasoning` por JSON válido em uma única linha ativa:

```env
OPENROUTER_RECEIPT_REASONING='{"enabled":false}'
# Alternativas, conforme o suporte do modelo:
#OPENROUTER_RECEIPT_REASONING='{"effort":"minimal"}'
#OPENROUTER_RECEIPT_REASONING='{"enabled":true,"max_tokens":1000}'
```

São aceitos `enabled` e `exclude` booleanos, `effort` (`none`, `minimal`, `low`,
`medium`, `high`, `xhigh`, `max`) e `max_tokens` inteiro positivo seguro. O JSON
deve ser um objeto não vazio, sem propriedades desconhecidas. Não combine
`effort` com `max_tokens`, `enabled: false` com orçamento/esforço, nem
`enabled: true` com `effort: none`. Configurações inválidas geram
`OPENROUTER_INVALID_REASONING_CONFIG`, sem chamada à API e sem expor o valor.
Validação local não garante que o modelo/provedor aceite cada opção.

A configuração é feita exclusivamente por `OPENROUTER_RECEIPT_REASONING`.
Quando estiver ausente ou vazia, o EmDia omite `reasoning` e respeita o padrão
do modelo/provedor. Omitir não significa
desligar. `exclude: true` somente oculta o raciocínio da resposta: não elimina
seu processamento ou cobrança. Reinicie a aplicação após mudar a configuração.

O limite de saída é 4.000 tokens por padrão e pode ser ajustado entre 2.048 e
16.000 por `OPENROUTER_RECEIPT_MAX_OUTPUT_TOKENS`.

As imagens ficam em `uploads/receipts`, fora de `public/`, e são removidas após
a retenção configurada quando aprovadas ou rejeitadas. O backup SQLite atual
**não inclui esses arquivos**; não trate esse diretório como arquivo fiscal de
longo prazo sem implantar uma estratégia própria de backup dos anexos.
