# 💸 EmDia

**EmDia** é um MVP web local para controle de contas, receitas, vencimentos e
baixas financeiras. O projeto foi implementado a partir do PRD técnico
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
- 🛡️ Login por sessão, proteção CSRF e administração de usuários.
- 📜 Auditoria funcional, fila de notificações e logs operacionais.
- 🧪 Testes unitários e de integração com banco SQLite isolado.
- 🌱 Seed automático com usuário local e dados de exemplo.
- 🧠 Regras de status para pendente, vencido, pago e recebido.
- 🗃️ Persistência local em SQLite com migrações incrementais.

---

## 🧰 Tecnologias

- 🟩 Node.js 22+
- 🗄️ SQLite via `node:sqlite`
- 🌐 Express 5.x
- 🎨 HTML renderizado no servidor
- 💅 CSS puro
- 🎯 Ícones SVG via `lucide-static`

> ℹ️ O módulo `node:sqlite` pode exibir um aviso experimental no Node 22. Isso é
> esperado nesta versão do MVP.

---

## 🚀 Como rodar

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

A suíte usa `node:test` e Supertest, não acessa `data/emdia.sqlite` e não abre
porta HTTP. Os testes de rotas exercitam diretamente a aplicação Express.

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
```

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
    models/
      AuditLog.js
      Category.js
      FinancialAccount.js
      FinancialEntry.js
      Notification.js
      NotificationPreference.js
      Party.js
      Recurrence.js
      Settlement.js
      User.js
    services/
      authService.js
      csvService.js
      dateService.js
      formValidation.js
      id.js
      moneyService.js
      notificationService.js
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

---

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

- 💾 Backup e restauração verificável do banco local.
- 🧾 Parcelamento básico com geração transacional das parcelas.
- 👥 Cadastro e manutenção de favorecidos e pagadores.
- 📈 Relatórios mensais e históricos.
- 📎 Upload de comprovantes, boletos e recibos.
- 🤖 OCR com revisão humana antes da gravação.
- 📲 Recebimento de documentos pelo WhatsApp.

---

## 📌 Status

```text
Status: MVP local funcional
Persistência: SQLite local
Interface: server-rendered HTML
Foco atual: controle mensal de contas, receitas e despesas
```
