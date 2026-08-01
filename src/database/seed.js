const { getDatabase } = require("./connection");
const { initializeDatabase } = require("./schema");
const Account = require("../models/FinancialAccount");
const Category = require("../models/Category");
const Entry = require("../models/FinancialEntry");
const User = require("../models/User");
const { currentCompetence, dueDateFromCompetence } = require("../services/dateService");
const { logInfo } = require("../services/operationalLogger");
const { provisionInitialUserData } = require("../services/userProvisioningService");

function seedDatabase() {
  initializeDatabase();

  const user = User.ensureDefaultUser();
  const db = getDatabase();
  const accountCount = db.prepare("SELECT COUNT(*) AS total FROM financial_accounts WHERE user_id = ?").get(user.id).total;
  const categoryCount = db.prepare("SELECT COUNT(*) AS total FROM categories WHERE user_id = ?").get(user.id).total;
  const entryCount = db.prepare("SELECT COUNT(*) AS total FROM financial_entries WHERE user_id = ?").get(user.id).total;

  provisionInitialUserData(user, {
    db,
    provisionAccounts: !accountCount,
    provisionCategories: !categoryCount,
    useDemoBalances: true,
  });

  if (!entryCount) {
    const accounts = Account.active(user.id);
    const categories = Category.list(user.id);
    const account = accounts[0];
    const category = (name) => categories.find((item) => item.name === name);
    const competence = currentCompetence(user.timezone);

    Entry.create(user, {
      entry_type: "INCOME",
      description: "Salário do mês",
      category_id: category("Salário").id,
      party_name: "Empresa",
      financial_account_id: account.id,
      expected_amount: "6500,00",
      competence_month: competence,
      due_date: dueDateFromCompetence(competence, 5),
      notes: "Receita recorrente prevista para o MVP.",
    });

    Entry.create(user, {
      entry_type: "EXPENSE",
      description: "Internet residencial",
      category_id: category("Internet").id,
      party_name: "Provedor de internet",
      financial_account_id: account.id,
      expected_amount: "119,90",
      competence_month: competence,
      due_date: dueDateFromCompetence(competence, 10),
    });

    Entry.create(user, {
      entry_type: "EXPENSE",
      description: "Energia elétrica",
      category_id: category("Energia").id,
      party_name: "Companhia de energia",
      financial_account_id: account.id,
      expected_amount: "238,45",
      competence_month: competence,
      due_date: dueDateFromCompetence(competence, 15),
    });

    Entry.create(user, {
      entry_type: "EXPENSE",
      description: "Mercado",
      category_id: category("Alimentação").id,
      party_name: "Supermercado",
      financial_account_id: account.id,
      expected_amount: "640,00",
      competence_month: competence,
      due_date: dueDateFromCompetence(competence, 20),
    });
  }

  logInfo("sensitive.seed.run", "Seed do EmDia verificado.", {
    user,
    details: {
      accountsAlreadyExisted: Boolean(accountCount),
      categoriesAlreadyExisted: Boolean(categoryCount),
      entriesAlreadyExisted: Boolean(entryCount),
    },
  });
}

if (require.main === module) {
  seedDatabase();
  console.log("Seed do EmDia concluído.");
}

module.exports = {
  seedDatabase,
};
