const MONEY_ERROR_MESSAGE = "Informe um valor válido, como 100,00.";
const REQUIRED_ERROR_MESSAGE = "Preencha este campo.";

function createValidationResult(values = {}) {
  return {
    errors: {},
    values: { ...values },
  };
}

function addError(result, field, message) {
  if (!result.errors[field]) {
    result.errors[field] = message;
  }
}

function hasErrors(result) {
  return Object.keys(result.errors).length > 0;
}

function validationError(result, message = "Revise os campos destacados.") {
  const error = new Error(message);
  error.name = "ValidationError";
  error.statusCode = 400;
  error.errors = result.errors;
  error.values = result.values;
  return error;
}

function validateRequired(result, field, message = REQUIRED_ERROR_MESSAGE) {
  if (!String(result.values[field] || "").trim()) {
    addError(result, field, message);
  }
}

function validateIntegerRange(result, field, { min, max, message }) {
  const raw = String(result.values[field] || "").trim();
  const value = Number(raw);

  if (!Number.isInteger(value) || value < min || value > max) {
    addError(result, field, message || `Informe um número entre ${min} e ${max}.`);
  }
}

function validateMoney(result, field, options = {}) {
  const parsed = parseMoney(result.values[field], options);

  if (!parsed.ok) {
    addError(result, field, parsed.message);
    return null;
  }

  return parsed.cents;
}

function validateCompetenceMonth(result, field, message) {
  const raw = String(result.values[field] || "").trim();

  if (!isValidCompetenceMonth(raw)) {
    addError(result, field, message || "Informe uma competência válida.");
    return null;
  }

  return raw;
}

function validateIsoDate(result, field, { required = true, message } = {}) {
  const raw = String(result.values[field] || "").trim();

  if (!raw) {
    if (required) {
      addError(result, field, message || "Informe uma data válida.");
    }
    return null;
  }

  if (!isValidIsoDate(raw)) {
    addError(result, field, message || "Informe uma data válida.");
    return null;
  }

  return raw;
}

function parseMoney(input, options = {}) {
  const required = options.required !== false;
  const allowNegative = options.allowNegative === true;

  if (typeof input === "number") {
    if (!Number.isFinite(input) || (!allowNegative && input < 0)) {
      return invalidMoney(options.message || MONEY_ERROR_MESSAGE);
    }

    return {
      ok: true,
      cents: Math.round(input * 100),
    };
  }

  const raw = String(input ?? "").trim();

  if (!raw) {
    return required ? invalidMoney(options.requiredMessage || MONEY_ERROR_MESSAGE) : { ok: true, cents: 0 };
  }

  const cleaned = raw.replace(/\s/g, "").replace(/^R\$/i, "");
  const signPattern = allowNegative ? "-?" : "";
  const simplePattern = new RegExp(`^${signPattern}\\d+(,\\d{1,2})?$`);
  const groupedPattern = new RegExp(`^${signPattern}\\d{1,3}(\\.\\d{3})+(,\\d{1,2})?$`);

  if (!simplePattern.test(cleaned) && !groupedPattern.test(cleaned)) {
    return invalidMoney(options.message || MONEY_ERROR_MESSAGE);
  }

  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);

  if (!Number.isFinite(value) || (!allowNegative && value < 0)) {
    return invalidMoney(options.message || MONEY_ERROR_MESSAGE);
  }

  return {
    ok: true,
    cents: Math.round(value * 100),
  };
}

function invalidMoney(message) {
  return {
    ok: false,
    message,
  };
}

function isValidCompetenceMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(value || "")) return false;

  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateRecurrencePayload(user, data, dependencies) {
  const result = createValidationResult(data);
  const getAccount = dependencies.getAccount;
  const getCategory = dependencies.getCategory;
  const normalizeCompetence = dependencies.normalizeCompetence;

  validateRequired(result, "description", "Informe a descrição.");
  validateRequired(result, "category_id", "Selecione uma categoria.");
  validateRequired(result, "expected_amount", MONEY_ERROR_MESSAGE);
  validateRequired(result, "start_competence_month", "Informe a competência inicial.");
  validateIntegerRange(result, "due_day", {
    min: 1,
    max: 31,
    message: "Informe um dia entre 1 e 31.",
  });

  const category = result.values.category_id ? getCategory(user.id, result.values.category_id) : null;
  if (result.values.category_id && !category) {
    addError(result, "category_id", "Selecione uma categoria válida.");
  } else if (category && !["INCOME", "EXPENSE"].includes(category.entry_type)) {
    addError(result, "category_id", "A categoria precisa ser de receita ou despesa.");
  }

  const expectedAmountCents = validateMoney(result, "expected_amount");
  const account = validateOptionalReference(result, "financial_account_id", user, getAccount, "Selecione uma conta válida.");
  validateActiveAccount(result, "financial_account_id", account);

  let startCompetence = null;
  let endCompetence = null;
  try {
    startCompetence = normalizeCompetence(result.values.start_competence_month, user.timezone);
  } catch (error) {
    addError(result, "start_competence_month", "Informe uma competência inicial válida.");
  }

  const rawEnd = String(result.values.end_competence_month || "").trim();
  if (rawEnd) {
    try {
      endCompetence = normalizeCompetence(rawEnd, user.timezone);
    } catch (error) {
      addError(result, "end_competence_month", "Informe uma competência final válida.");
    }
  }

  if (startCompetence && endCompetence && endCompetence < startCompetence) {
    addError(result, "end_competence_month", "A competência final não pode ser anterior à inicial.");
  }

  return {
    ...result,
    ok: !hasErrors(result),
    normalized: {
      account,
      category,
      expectedAmountCents,
      startCompetence,
      endCompetence,
    },
  };
}

function validateEntryPayload(user, data, dependencies) {
  const result = createValidationResult(data);
  const getCategory = dependencies.getCategory;
  const getAccount = dependencies.getAccount;
  const entryType = String(result.values.entry_type || "").trim();

  validateRequired(result, "description", "Informe a descrição.");
  if (!["EXPENSE", "INCOME"].includes(entryType)) {
    addError(result, "entry_type", "Selecione um tipo válido.");
  }

  const competenceMonth = validateCompetenceMonth(result, "competence_month", "Informe uma competência válida.");
  const dueDate = validateIsoDate(result, "due_date", { message: "Informe um vencimento válido." });
  const expectedAmountCents = validateMoney(result, "expected_amount");
  const realizedAmountCents = validateMoney(result, "realized_amount", { required: false });
  const category = validateOptionalReference(result, "category_id", user, getCategory, "Selecione uma categoria válida.");
  const account = validateOptionalReference(result, "financial_account_id", user, getAccount, "Selecione uma conta válida.");

  validateActiveAccount(result, "financial_account_id", account);

  return {
    ...result,
    ok: !hasErrors(result),
    normalized: {
      account,
      category,
      competenceMonth,
      dueDate,
      entryType,
      expectedAmountCents,
      realizedAmountCents,
    },
  };
}

function validateSettlementPayload(user, data, dependencies) {
  const result = createValidationResult(data);
  const getAccount = dependencies.getAccount;
  const account = validateOptionalReference(result, "financial_account_id", user, getAccount, "Selecione uma conta válida.");

  if (!String(result.values.financial_account_id || "").trim()) {
    addError(result, "financial_account_id", "Selecione uma conta.");
  }
  validateActiveAccount(result, "financial_account_id", account);

  const principalCents = validateMoney(result, "principal");
  const interestCents = validateMoney(result, "interest", { required: false });
  const penaltyCents = validateMoney(result, "penalty", { required: false });
  const discountCents = validateMoney(result, "discount", { required: false });
  const otherAdjustmentCents = validateMoney(result, "other_adjustment", { required: false });
  const settledAt = validateIsoDate(result, "settled_at", { message: "Informe uma data válida." });
  const totalCents = (principalCents || 0) + (interestCents || 0) + (penaltyCents || 0) + (otherAdjustmentCents || 0) - (discountCents || 0);

  if (!result.errors.principal && principalCents <= 0) {
    addError(result, "principal", "Informe um valor principal maior que zero.");
  }

  if (totalCents <= 0) {
    addError(result, "principal", "O total da baixa deve ser maior que zero.");
  }

  return {
    ...result,
    ok: !hasErrors(result),
    normalized: {
      account,
      discountCents,
      interestCents,
      otherAdjustmentCents,
      penaltyCents,
      principalCents,
      settledAt,
      totalCents,
    },
  };
}

function validateMonthDeletionPayload(data) {
  const result = createValidationResult(data);
  const competenceMonth = validateCompetenceMonth(result, "competence_month", "Informe uma competência válida.");
  const confirmation = String(result.values.confirmation || "").trim();
  const acknowledged = String(result.values.acknowledge_impact || "") === "on";

  if (!acknowledged) {
    addError(result, "acknowledge_impact", "Confirme que você entende o impacto da exclusão.");
  }

  if (!confirmation) {
    addError(result, "confirmation", "Digite a competência para confirmar.");
  } else if (competenceMonth && confirmation !== competenceMonth) {
    addError(result, "confirmation", `Digite exatamente ${competenceMonth} para confirmar.`);
  }

  return {
    ...result,
    ok: !hasErrors(result),
    normalized: {
      competenceMonth,
    },
  };
}

function validateOptionalReference(result, field, user, getter, message) {
  const id = String(result.values[field] || "").trim();
  if (!id) return null;

  const record = getter(user.id, id);
  if (!record) {
    addError(result, field, message);
  }

  return record || null;
}

function validateActiveAccount(result, field, account) {
  if (account && !account.is_active) {
    addError(result, field, "Selecione uma conta ativa.");
  }
}

module.exports = {
  MONEY_ERROR_MESSAGE,
  addError,
  createValidationResult,
  hasErrors,
  parseMoney,
  validationError,
  validateEntryPayload,
  validateMonthDeletionPayload,
  validateMoney,
  validateRecurrencePayload,
  validateSettlementPayload,
};
