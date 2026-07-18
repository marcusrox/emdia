process.env.NODE_ENV = "test";
process.env.EMDIA_DB_PATH = ":memory:";
process.env.EMDIA_DEFAULT_PASSWORD = "emdia123";

const crypto = require("node:crypto");
const { getDatabase } = require("../../src/database/connection");
const { initializeDatabase } = require("../../src/database/schema");
const { hashPassword } = require("../../src/services/authService");

initializeDatabase();
const db = getDatabase();

function resetDatabase() {
  db.exec(`
    DELETE FROM notifications; DELETE FROM notification_preferences;
    DELETE FROM audit_logs; DELETE FROM settlements; DELETE FROM financial_entries;
    DELETE FROM recurrences; DELETE FROM parties; DELETE FROM categories;
    DELETE FROM financial_accounts; DELETE FROM sessions; DELETE FROM users;
  `);
}

function createUser({ id, email, name = "Usuário de teste", password = "senha123", isAdmin = false } = {}) {
  const userId = id || `usr_${cryptoId()}`;
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO users
    (id,name,email,password_hash,timezone,locale,is_active,is_admin,created_at,updated_at)
    VALUES (?,?,?,?,?,?,1,?,?,?)`).run(
    userId, name, email || `${userId}@example.test`, hashPassword(password),
    "America/Sao_Paulo", "pt-BR", isAdmin ? 1 : 0, now, now,
  );
  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
}

function createFinancialFixture(options = {}) {
  const user = createUser(options.user || {});
  const now = new Date().toISOString();
  const accountId = `acc_${cryptoId()}`;
  const categoryId = `cat_${cryptoId()}`;
  db.prepare(`INSERT INTO financial_accounts
    (id,user_id,name,type,initial_balance_cents,is_active,created_at,updated_at)
    VALUES (?,?,'Conta teste','CHECKING',0,1,?,?)`).run(accountId, user.id, now, now);
  db.prepare(`INSERT INTO categories
    (id,user_id,name,entry_type,is_active,created_at,updated_at)
    VALUES (?,?,'Categoria teste',?,1,?,?)`).run(categoryId, user.id, options.entryType || "EXPENSE", now, now);
  return { user, accountId, categoryId };
}

function cryptoId() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

module.exports = { createFinancialFixture, createUser, db, resetDatabase };
