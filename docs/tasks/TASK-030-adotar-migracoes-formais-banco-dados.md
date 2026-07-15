# TASK-030 - Adotar migrações formais de banco de dados

## Contexto

O EmDia ainda usa uma estratégia simples de evolução de schema em
`src/database/schema.js`, baseada em:

- `CREATE TABLE IF NOT EXISTS`;
- criação idempotente de índices;
- helper `ensureColumn` para adicionar colunas faltantes;
- seed separado em `src/database/seed.js`.

Essa abordagem é adequada para o MVP local, mas começa a ficar frágil quando o
projeto passa a ter CI/CD, ambientes diferentes e histórico maior de mudanças no
banco.

O objetivo desta task é introduzir migrações formais de SQLite de forma pequena,
previsível e alinhada à stack atual do projeto, sem trazer ORM ou ferramenta
pesada sem necessidade.

## Objetivo

Criar um mecanismo formal de migrações de banco de dados para controlar a ordem,
o histórico e a aplicação incremental de mudanças de schema durante o
desenvolvimento e em futuros pipelines de CI/CD.

As migrações devem reduzir o risco de que bancos locais, bancos de homologação e
futuros bancos de produção fiquem em estados diferentes ou quebrem a aplicação
após alterações de schema.

## Decisões técnicas

- Manter CommonJS.
- Manter SQLite via `node:sqlite`.
- Não introduzir ORM.
- Não introduzir Drizzle, Prisma, Sequelize ou Knex nesta primeira etapa.
- Usar migrations JavaScript versionadas no próprio repositório.
- Controlar migrations aplicadas em uma tabela do banco.
- Aplicar migrations pendentes no bootstrap da aplicação.
- Manter o seed separado das migrations.
- Preservar compatibilidade com bancos locais já existentes quando possível.

## Estrutura sugerida

Criar uma estrutura como:

```text
src/database/
  migrator.js
  migrations/
    001_initial_schema.js
    002_add_user_preferences.js
```

Cada migration deve exportar metadados e uma função de aplicação:

```js
module.exports = {
  id: "001_initial_schema",
  description: "Cria schema inicial",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ...
    `);
  },
};
```

## Tabela de controle

Criar uma tabela interna para registrar migrations aplicadas:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  description TEXT,
  applied_at TEXT NOT NULL
);
```

Regras:

- `id` deve ser estável e único.
- `applied_at` deve usar `new Date().toISOString()`.
- migrations aplicadas não devem ser executadas novamente.
- migrations pendentes devem ser aplicadas em ordem crescente.
- falhas devem interromper a inicialização e deixar erro claro no log.

## Escopo

- Criar `src/database/migrator.js`.
- Criar pasta `src/database/migrations/`.
- Criar tabela `schema_migrations`.
- Transformar o schema atual em uma migration inicial.
- Mover alterações incrementais atuais de `ensureColumn` para migrations
  próprias quando fizer sentido.
- Ajustar `src/database/schema.js` para delegar a execução ao migrator ou
  reduzir seu papel a compatibilidade temporária.
- Garantir que o bootstrap em `app.js` continue inicializando o banco antes do
  servidor.
- Atualizar `npm run check` para validar o migrator e as migrations.
- Documentar o padrão em `docs/patterns.md`.
- Atualizar `docs/architecture.md` com o novo fluxo de inicialização do banco.
- Atualizar o controle de release ao concluir a implementação.

## Fora do escopo

- Migrar para ORM.
- Trocar SQLite por outro banco.
- Criar rollback automático obrigatório.
- Criar ferramenta CLI completa de migrations.
- Alterar regras de negócio financeiras.
- Alterar models sem necessidade.
- Recriar ou apagar bancos locais automaticamente.
- Versionar arquivos `.sqlite`, `.sqlite-wal` ou `.sqlite-shm`.
- Implementar CI/CD completo nesta task.

## Estratégia de compatibilidade

Esta task deve considerar dois cenários:

- banco novo, sem tabelas;
- banco local existente, criado pela estratégia antiga de `schema.js`.

Para banco novo:

- aplicar todas as migrations desde a inicial;
- criar as tabelas, índices e colunas atuais.

Para banco existente:

- criar `schema_migrations`;
- detectar com segurança se o schema atual já existe;
- registrar a migration inicial como aplicada apenas se o schema existente for
  compatível;
- aplicar migrations futuras normalmente.

Não apagar dados locais existentes.

## Regras para futuras migrations

- Cada mudança estrutural deve virar uma migration nova.
- Migrations já aplicadas não devem ser editadas, salvo correção antes de serem
  compartilhadas ou usadas em outro ambiente.
- Mudanças destrutivas devem ser feitas em fases.
- Renomear coluna, dividir tabela ou transformar dados deve ter migration
  explícita e validação manual cuidadosa.
- Toda migration deve ser idempotente quando isso for viável, mas o controle
  principal deve ser a tabela `schema_migrations`.
- Usar placeholders `?` quando houver entrada dinâmica.
- Não registrar dados sensíveis em logs.

## Critérios de aceite

- O banco novo é criado corretamente apenas com o mecanismo de migrations.
- O banco existente do desenvolvimento continua abrindo sem perda de dados.
- A tabela `schema_migrations` é criada automaticamente.
- Migrations aplicadas são registradas com `id`, `description` e `applied_at`.
- Migrations já aplicadas não rodam novamente.
- Migrations pendentes rodam em ordem previsível.
- Erro em migration interrompe a inicialização com mensagem clara.
- `src/database/schema.js` deixa claro o papel atual das migrations.
- `npm run check` valida os novos arquivos JavaScript.
- `npm run seed` continua funcionando após aplicar migrations.
- A documentação explica como criar uma nova migration.

## Validação sugerida

Validação sintática:

```powershell
npm run check
```

Validação em banco novo:

- usar um banco SQLite temporário ou ambiente local descartável;
- iniciar a aplicação;
- confirmar criação de todas as tabelas;
- confirmar registros em `schema_migrations`;
- rodar `npm run seed`;
- acessar `GET /health`, `GET /dashboard` e `GET /entries`.

Validação em banco existente:

- usar cópia segura de um banco local já existente;
- iniciar a aplicação;
- confirmar que dados existentes permanecem acessíveis;
- confirmar que `schema_migrations` foi criada;
- confirmar que migrations futuras pendentes são aplicadas uma única vez.

## Observações de implementação

Manter a implementação pequena e transparente. O migrator deve ser fácil de ler
e auditar, pois ele fará parte do caminho crítico de inicialização da aplicação.

Evitar acoplar migrations ao seed. O seed pode depender do schema já migrado,
mas migrations não devem depender do seed.

Se surgir necessidade de rollback no futuro, criar uma task específica para
avaliar política de reversão. Para o MVP, priorizar aplicação segura para frente.

Ao concluir a implementação, atualizar `src/config/release.js`, incrementando o
número sequencial em 1.

## Implementação

- Foi criado `src/database/migrator.js` para carregar e aplicar migrations
  pendentes.
- Foi criada a tabela `schema_migrations` com `id`, `description` e
  `applied_at`.
- Foram criadas as migrations:
  - `001_initial_schema`;
  - `002_add_user_interface_preferences`.
- `src/database/schema.js` passou a delegar a inicialização para
  `runMigrations()`.
- A migration inicial usa `CREATE TABLE IF NOT EXISTS` e preserva compatibilidade
  com bancos locais existentes.
- A migration de preferências usa `PRAGMA table_info` antes de adicionar colunas
  em `users`.
- `npm run check` passou a validar o migrator e os arquivos de migration.
- `docs/patterns.md` passou a documentar o fluxo de migrations.
- `docs/architecture.md` passou a refletir o novo fluxo de inicialização do
  banco.
- O controle de release foi atualizado para registrar a implementação.

---

## Assinatura da LLM

- Data: 14/07/2026 19:11
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: criacao

---

## Assinatura da LLM

- Data: 14/07/2026 21:36
- Modelo: GPT-5 Codex
- Versao: não informado
- Acao: atualização
