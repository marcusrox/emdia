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
- ✅ Registro de baixas em tabela própria de `settlements`.
- 🏦 Cadastro básico de contas financeiras.
- 🏷️ Cadastro básico de categorias.
- 🌱 Seed automático com usuário local e dados de exemplo.
- 🧠 Regras de status para pendente, vencido, pago e recebido.
- 🗃️ Persistência local em SQLite.

---

## 🧰 Tecnologias

- 🟩 Node.js 22+
- 🗄️ SQLite via `node:sqlite`
- 🌐 Servidor HTTP nativo do Node
- 🎨 HTML renderizado no servidor
- 💅 CSS puro
- 📦 Sem dependências externas obrigatórias no MVP atual

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
  src/
    database/
      connection.js
      schema.js
      seed.js
    models/
      AuditLog.js
      Category.js
      FinancialAccount.js
      FinancialEntry.js
      Party.js
      Settlement.js
      User.js
    services/
      dateService.js
      http.js
      id.js
      moneyService.js
      statusService.js
      viewEngine.js
    server.js
```

---

## 🧭 Regra principal de produto

O EmDia é orientado por **competência mensal**.

Quando nenhuma competência é informada, as telas operacionais assumem a
competência do mês corrente do usuário:

- 📊 dashboard;
- 🧾 listagem de lançamentos;
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

## 🛣️ Próximos passos sugeridos

- 🔑 Autenticação real.
- 🔁 Recorrências e geração automática de ocorrências.
- 📎 Upload de comprovantes, boletos e recibos.
- 🤖 OCR com confirmação humana antes da gravação.
- 💬 Integração futura com WhatsApp/Evolution API.
- 📈 Relatórios avançados.
- 🧪 Testes automatizados.

---

## 📌 Status

```text
Status: MVP local funcional
Persistência: SQLite local
Interface: server-rendered HTML
Foco atual: controle mensal de contas, receitas e despesas
```
