const { beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createFinancialFixture, db, resetDatabase } = require("../helpers/testDatabase");
const Account = require("../../src/models/FinancialAccount");
const Category = require("../../src/models/Category");
const Entry = require("../../src/models/FinancialEntry");

beforeEach(resetDatabase);

describe("contas e categorias", () => {
  it("impede leitura e alteração cruzadas entre usuários", () => {
    const owner = createFinancialFixture();
    const other = createFinancialFixture();

    assert.equal(Account.getById(other.user.id, owner.accountId), undefined);
    assert.equal(Category.getById(other.user.id, owner.categoryId), undefined);
    assert.equal(Account.softDelete(other.user.id, owner.accountId).changes, 0);
    assert.equal(Category.softDelete(other.user.id, owner.categoryId).changes, 0);

    Account.update(other.user.id, owner.accountId, accountPayload("Conta invadida"));
    Category.update(other.user.id, owner.categoryId, categoryPayload("Categoria invadida"));
    assert.equal(Account.getById(owner.user.id, owner.accountId).name, "Conta teste");
    assert.equal(Category.getById(owner.user.id, owner.categoryId).name, "Categoria teste");
  });

  it("preserva vínculos ao excluir e restaura o uso normal", () => {
    const fixture = createFinancialFixture();
    const entry = Entry.create(fixture.user, {
      entry_type: "EXPENSE",
      description: "Conta vinculada",
      category_id: fixture.categoryId,
      financial_account_id: fixture.accountId,
      expected_amount: "100,00",
      competence_month: "2026-07",
      due_date: "2026-07-10",
    });

    assert.equal(Account.softDelete(fixture.user.id, fixture.accountId).changes, 1);
    assert.equal(Category.softDelete(fixture.user.id, fixture.categoryId).changes, 1);
    assert.equal(Account.getById(fixture.user.id, fixture.accountId), undefined);
    assert.equal(Category.getById(fixture.user.id, fixture.categoryId), undefined);
    assert.equal(Account.listDeleted(fixture.user.id).length, 1);
    assert.equal(Category.listDeleted(fixture.user.id).length, 1);

    const storedEntry = db.prepare(
      "SELECT financial_account_id, category_id FROM financial_entries WHERE id = ?"
    ).get(entry.id);
    assert.equal(storedEntry.financial_account_id, fixture.accountId);
    assert.equal(storedEntry.category_id, fixture.categoryId);

    assert.equal(Account.restore(fixture.user.id, fixture.accountId).changes, 1);
    assert.equal(Category.restore(fixture.user.id, fixture.categoryId).changes, 1);
    assert.equal(Account.getById(fixture.user.id, fixture.accountId).is_active, 1);
    assert.equal(Category.getById(fixture.user.id, fixture.categoryId).is_active, 1);
  });

  it("mantém a regra atual que permite nomes duplicados por usuário", () => {
    const fixture = createFinancialFixture();
    Account.create(fixture.user.id, accountPayload("Conta teste"));
    Category.create(fixture.user.id, categoryPayload("Categoria teste"));

    assert.equal(Account.list(fixture.user.id).filter((item) => item.name === "Conta teste").length, 2);
    assert.equal(Category.list(fixture.user.id).filter((item) => item.name === "Categoria teste").length, 2);
  });
});

function accountPayload(name) {
  return {
    name,
    type: "CHECKING",
    initial_balance: "0,00",
    color: "#2563eb",
  };
}

function categoryPayload(name) {
  return {
    name,
    entry_type: "EXPENSE",
    color: "#0f766e",
  };
}
