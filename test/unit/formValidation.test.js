const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  createValidationResult,
  isValidationError,
  parseMoney,
  validateEntryPayload,
  validateMonthDeletionPayload,
  validateRecurrencePayload,
  validateSettlementPayload,
  validationError,
} = require("../../src/services/formValidation");

const user = { id: "usr_validation", timezone: "America/Sao_Paulo" };

describe("validação de formulários financeiros", () => {
  it("aceita formatos monetários documentados e rejeita entradas ambíguas", () => {
    assert.deepEqual(parseMoney(" R$1.234,56 "), { ok: true, cents: 123456 });
    assert.deepEqual(parseMoney("", { required: false }), { ok: true, cents: 0 });
    assert.deepEqual(parseMoney(-1, { allowNegative: true }), { ok: true, cents: -100 });
    assert.equal(parseMoney(-1).ok, false);
    assert.equal(parseMoney(Number.POSITIVE_INFINITY).ok, false);
    assert.equal(parseMoney("1,234").ok, false);
    assert.equal(parseMoney("12.34,56").ok, false);
    assert.equal(parseMoney("-10,00").ok, false);
  });

  it("normaliza lançamento válido e acumula erros de referências, data e valor", () => {
    const account = { id: "acc_active", is_active: 1 };
    const category = { id: "cat_expense", entry_type: "EXPENSE" };
    const dependencies = {
      getAccount: (_userId, id) => id === account.id ? account : null,
      getCategory: (_userId, id) => id === category.id ? category : null,
    };

    const valid = validateEntryPayload(user, {
      entry_type: "EXPENSE",
      description: "Energia",
      category_id: category.id,
      financial_account_id: account.id,
      expected_amount: "123,45",
      competence_month: "2026-08",
      due_date: "2026-08-31",
    }, dependencies);

    assert.equal(valid.ok, true);
    assert.equal(valid.normalized.expectedAmountCents, 12345);
    assert.equal(valid.normalized.account, account);
    assert.equal(valid.normalized.category, category);

    const invalid = validateEntryPayload(user, {
      entry_type: "TRANSFER",
      description: " ",
      category_id: "cat_other_user",
      financial_account_id: "acc_other_user",
      expected_amount: "1,234",
      competence_month: "2026-13",
      due_date: "2026-02-30",
    }, dependencies);

    assert.equal(invalid.ok, false);
    assert.deepEqual(Object.keys(invalid.errors).sort(), [
      "category_id",
      "competence_month",
      "description",
      "due_date",
      "entry_type",
      "expected_amount",
      "financial_account_id",
    ]);
  });

  it("bloqueia baixa sem conta ativa, total positivo, data ou conclusão válida", () => {
    const inactiveAccount = { id: "acc_inactive", is_active: 0 };
    const getAccount = (_userId, id) => id === inactiveAccount.id ? inactiveAccount : null;

    const invalid = validateSettlementPayload(user, {
      financial_account_id: inactiveAccount.id,
      principal: "10,00",
      interest: "0,00",
      penalty: "0,00",
      discount: "10,00",
      other_adjustment: "0,00",
      settled_at: "2026-02-30",
      settlement_completion: "unknown",
    }, { getAccount });

    assert.equal(invalid.ok, false);
    assert.match(invalid.errors.financial_account_id, /ativa/i);
    assert.match(invalid.errors.principal, /total da baixa/i);
    assert.match(invalid.errors.settled_at, /data válida/i);
    assert.match(invalid.errors.settlement_completion, /diferença/i);

    const missing = validateSettlementPayload(user, {}, { getAccount });
    assert.equal(missing.ok, false);
    assert.match(missing.errors.financial_account_id, /selecione uma conta/i);
    assert.match(missing.errors.principal, /valor/i);

    const activeAccount = { id: "acc_active", is_active: 1 };
    const valid = validateSettlementPayload(user, {
      financial_account_id: activeAccount.id,
      principal: "100,00",
      interest: "2,00",
      penalty: "1,00",
      discount: "3,00",
      other_adjustment: "0,50",
      settled_at: "2026-08-07",
      settlement_completion: "final",
    }, { getAccount: () => activeAccount });

    assert.equal(valid.ok, true);
    assert.equal(valid.normalized.totalCents, 10050);
    assert.equal(valid.normalized.settlementCompletion, "FINAL");
  });

  it("exige confirmação exata para exclusão mensal", () => {
    const invalid = validateMonthDeletionPayload({
      competence_month: "2026-08",
      confirmation: "2026-07",
    });
    assert.equal(invalid.ok, false);
    assert.match(invalid.errors.acknowledge_impact, /impacto/i);
    assert.match(invalid.errors.confirmation, /2026-08/);

    const valid = validateMonthDeletionPayload({
      competence_month: "2026-08",
      confirmation: "2026-08",
      acknowledge_impact: "on",
    });
    assert.equal(valid.ok, true);
    assert.equal(valid.normalized.competenceMonth, "2026-08");
  });

  it("valida limites e intervalo de competência da recorrência", () => {
    const inactiveAccount = { id: "acc_inactive", is_active: 0 };
    const invalid = validateRecurrencePayload(user, {
      description: "",
      category_id: "cat_transfer",
      financial_account_id: inactiveAccount.id,
      expected_amount: "abc",
      due_day: "32",
      start_competence_month: "inválida",
      end_competence_month: "também-inválida",
    }, {
      getAccount: () => inactiveAccount,
      getCategory: () => ({ id: "cat_transfer", entry_type: "TRANSFER" }),
      normalizeCompetence(value) {
        if (!/^\d{4}-\d{2}$/.test(value)) throw new Error("invalid competence");
        return value;
      },
    });

    assert.equal(invalid.ok, false);
    assert.deepEqual(Object.keys(invalid.errors).sort(), [
      "category_id",
      "description",
      "due_day",
      "end_competence_month",
      "expected_amount",
      "financial_account_id",
      "start_competence_month",
    ]);

    const range = validateRecurrencePayload(user, {
      description: "Aluguel",
      category_id: "cat_expense",
      financial_account_id: "",
      expected_amount: "1.000,00",
      due_day: "10",
      start_competence_month: "2026-08",
      end_competence_month: "2026-07",
    }, {
      getAccount: () => null,
      getCategory: () => ({ id: "cat_expense", entry_type: "EXPENSE" }),
      normalizeCompetence: (value) => value,
    });
    assert.match(range.errors.end_competence_month, /anterior/i);
  });

  it("preserva valores e identifica o erro padronizado de validação", () => {
    const result = createValidationResult({ description: "Original" });
    result.errors.description = "Inválida";
    const error = validationError(result, "Falha controlada");

    assert.ok(isValidationError(error));
    assert.equal(Boolean(isValidationError(new Error("comum"))), false);
    assert.equal(error.statusCode, 400);
    assert.deepEqual(error.values, { description: "Original" });
    assert.deepEqual(error.errors, { description: "Inválida" });
  });
});
