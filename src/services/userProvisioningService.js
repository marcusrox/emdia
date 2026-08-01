const FinancialAccount = require("../models/FinancialAccount");
const Category = require("../models/Category");
const { getDatabase } = require("../database/connection");
const { currentCompetence } = require("./dateService");

const INITIAL_ACCOUNTS = [
  {
    name: "Conta corrente",
    type: "CHECKING",
    icon: "bank",
    color: "#2563eb",
    demoInitialBalance: "2500,00",
  },
  {
    name: "Carteira",
    type: "CASH",
    icon: "wallet",
    color: "#16a34a",
    demoInitialBalance: "200,00",
  },
];

const INITIAL_CATEGORIES = [
  { name: "Moradia", entry_type: "EXPENSE", icon: "house", color: "#7c3aed" },
  { name: "Energia", entry_type: "EXPENSE", icon: "bolt", color: "#f59e0b" },
  { name: "Internet", entry_type: "EXPENSE", icon: "wifi", color: "#0891b2" },
  { name: "Alimentação", entry_type: "EXPENSE", icon: "utensils", color: "#dc2626" },
  { name: "Saúde", entry_type: "EXPENSE", icon: "heart-pulse", color: "#0f766e" },
  { name: "Salário", entry_type: "INCOME", icon: "briefcase-business", color: "#16a34a" },
  { name: "Reembolso", entry_type: "INCOME", icon: "receipt", color: "#2563eb" },
];

function provisionInitialUserData(user, options = {}) {
  const db = options.db || getDatabase();
  const provisionAccounts = options.provisionAccounts !== false;
  const provisionCategories = options.provisionCategories !== false;
  const useDemoBalances = options.useDemoBalances === true;
  const initialBalanceDate = `${currentCompetence(user.timezone)}-01`;

  const created = { accounts: [], categories: [] };

  if (provisionAccounts) {
    const existingAccountNames = new Set(db.prepare(`
      SELECT lower(name) AS name FROM financial_accounts WHERE user_id = ?
    `).all(user.id).map((row) => row.name));

    for (const account of INITIAL_ACCOUNTS) {
      if (existingAccountNames.has(account.name.toLowerCase())) continue;

      created.accounts.push(FinancialAccount.create(user.id, {
        ...account,
        institution_name: "",
        initial_balance: useDemoBalances ? account.demoInitialBalance : "0,00",
        initial_balance_date: initialBalanceDate,
      }));
    }
  }

  if (provisionCategories) {
    const existingCategoryKeys = new Set(db.prepare(`
      SELECT lower(name) || ':' || entry_type AS category_key
      FROM categories WHERE user_id = ?
    `).all(user.id).map((row) => row.category_key));

    for (const category of INITIAL_CATEGORIES) {
      const key = `${category.name.toLowerCase()}:${category.entry_type}`;
      if (existingCategoryKeys.has(key)) continue;

      created.categories.push(Category.create(user.id, category));
    }
  }

  return created;
}

module.exports = {
  INITIAL_ACCOUNTS,
  INITIAL_CATEGORIES,
  provisionInitialUserData,
};
