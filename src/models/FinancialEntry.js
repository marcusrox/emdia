const { getDatabase } = require("../database/connection");
const Account = require("./FinancialAccount");
const AuditLog = require("./AuditLog");
const Category = require("./Category");
const Party = require("./Party");
const Settlement = require("./Settlement");
const { normalizeCompetence, todayIso } = require("../services/dateService");
const { validateEntryPayload, validateSettlementPayload, validationError } = require("../services/formValidation");
const { newId } = require("../services/id");
const { deriveStatus } = require("../services/statusService");

function list(user, filters = {}) {
  const competence = normalizeCompetence(filters.competence, user.timezone);
  const params = [user.id, competence];
  const clauses = ["e.user_id = ?", "e.deleted_at IS NULL", "e.competence_month = ?"];

  if (filters.entry_type) {
    clauses.push("e.entry_type = ?");
    params.push(filters.entry_type);
  }

  if (filters.status) {
    clauses.push("e.status = ?");
    params.push(filters.status);
  }

  if (filters.category_id) {
    clauses.push("e.category_id = ?");
    params.push(filters.category_id);
  }

  if (filters.account_id) {
    clauses.push("(e.expected_account_id = ? OR e.actual_account_id = ?)");
    params.push(filters.account_id, filters.account_id);
  }

  if (filters.q) {
    clauses.push("(lower(e.description) LIKE lower(?) OR lower(coalesce(p.name, '')) LIKE lower(?))");
    params.push(`%${filters.q}%`, `%${filters.q}%`);
  }

  return getDatabase()
    .prepare(`
      SELECT
        e.*,
        c.name AS category_name,
        c.color AS category_color,
        p.name AS party_name,
        ea.name AS expected_account_name,
        aa.name AS actual_account_name,
        r.description AS recurrence_description
      FROM financial_entries e
      LEFT JOIN categories c ON c.id = e.category_id
      LEFT JOIN parties p ON p.id = e.party_id
      LEFT JOIN financial_accounts ea ON ea.id = e.expected_account_id
      LEFT JOIN financial_accounts aa ON aa.id = e.actual_account_id
      LEFT JOIN recurrences r ON r.id = e.recurrence_rule_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY e.due_date ASC, e.description ASC
    `)
    .all(...params);
}

function getById(userId, id) {
  return getDatabase()
    .prepare(`
      SELECT
        e.*,
        c.name AS category_name,
        p.name AS party_name,
        ea.name AS expected_account_name,
        aa.name AS actual_account_name,
        r.description AS recurrence_description
      FROM financial_entries e
      LEFT JOIN categories c ON c.id = e.category_id
      LEFT JOIN parties p ON p.id = e.party_id
      LEFT JOIN financial_accounts ea ON ea.id = e.expected_account_id
      LEFT JOIN financial_accounts aa ON aa.id = e.actual_account_id
      LEFT JOIN recurrences r ON r.id = e.recurrence_rule_id
      WHERE e.user_id = ? AND e.id = ? AND e.deleted_at IS NULL
    `)
    .get(userId, id);
}

function create(user, data) {
  const validation = normalizeEntryData(user, data);
  const now = new Date().toISOString();
  const id = newId("ent");
  const party = Party.findOrCreate(user.id, data.party_name, validation.entry_type === "INCOME" ? "PAYER" : "PAYEE");
  const draft = {
    entry_type: validation.entry_type,
    expected_amount_cents: validation.expected_amount_cents,
    realized_amount_cents: validation.realized_amount_cents,
    due_date: validation.due_date || todayIso(user.timezone),
    status: data.status || "PENDING",
  };

  draft.status = deriveStatus(draft, user.timezone);

  getDatabase()
    .prepare(`
      INSERT INTO financial_entries (
        id, user_id, entry_type, description, category_id, party_id,
        expected_account_id, actual_account_id, expected_amount_cents,
        realized_amount_cents, issue_date, competence_month, due_date,
        settled_at, status, origin, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      user.id,
      draft.entry_type,
      validation.description,
      validation.category_id,
      party ? party.id : null,
      validation.expected_account_id,
      validation.actual_account_id,
      validation.expected_amount_cents,
      validation.realized_amount_cents,
      validation.issue_date,
      validation.competence_month,
      draft.due_date,
      data.settled_at || null,
      draft.status,
      data.origin || "MANUAL",
      validation.notes,
      now,
      now
    );

  AuditLog.record(user.id, "financial_entry", id, "created", { description: validation.description });
  return getById(user.id, id);
}

function update(user, id, data) {
  const existing = getById(user.id, id);
  if (!existing) return null;

  const validation = normalizeEntryData(user, data);
  const party = Party.findOrCreate(user.id, data.party_name, validation.entry_type === "INCOME" ? "PAYER" : "PAYEE");
  const updated = {
    ...existing,
    entry_type: validation.entry_type,
    expected_amount_cents: validation.expected_amount_cents,
    realized_amount_cents: validation.realized_amount_cents,
    due_date: validation.due_date || existing.due_date,
    status: data.status || existing.status,
  };
  updated.status = deriveStatus(updated, user.timezone);

  getDatabase()
    .prepare(`
      UPDATE financial_entries
      SET entry_type = ?, description = ?, category_id = ?, party_id = ?,
        expected_account_id = ?, actual_account_id = ?, expected_amount_cents = ?,
        realized_amount_cents = ?, issue_date = ?, competence_month = ?,
        due_date = ?, status = ?, notes = ?, updated_at = ?
      WHERE user_id = ? AND id = ?
    `)
    .run(
      updated.entry_type,
      validation.description,
      validation.category_id,
      party ? party.id : null,
      validation.expected_account_id,
      validation.actual_account_id,
      updated.expected_amount_cents,
      updated.realized_amount_cents,
      validation.issue_date,
      validation.competence_month,
      updated.due_date,
      updated.status,
      validation.notes,
      new Date().toISOString(),
      user.id,
      id
    );

  AuditLog.record(user.id, "financial_entry", id, "updated", { description: validation.description });
  return getById(user.id, id);
}

function cancel(user, id) {
  getDatabase()
    .prepare("UPDATE financial_entries SET status = 'CANCELLED', updated_at = ? WHERE user_id = ? AND id = ?")
    .run(new Date().toISOString(), user.id, id);
  AuditLog.record(user.id, "financial_entry", id, "cancelled");
}

function duplicate(user, id) {
  const entry = getById(user.id, id);
  if (!entry) return null;

  return create(user, {
    entry_type: entry.entry_type,
    description: `${entry.description} (cópia)`,
    category_id: entry.category_id,
    party_name: entry.party_name,
    expected_account_id: entry.expected_account_id,
    expected_amount: entry.expected_amount_cents / 100,
    competence_month: entry.competence_month,
    due_date: entry.due_date,
    origin: "MANUAL",
    notes: entry.notes,
  });
}

function settle(user, id, data) {
  const entry = getById(user.id, id);
  if (!entry) return null;

  const validation = validateSettlementPayload(user, data, {
    getAccount: Account.getById,
  });
  if (!validation.ok) {
    throw validationError(validation);
  }

  const settlement = Settlement.create(user.id, id, {
    ...data,
    financial_account_id: validation.normalized.account.id,
    settlement_type: entry.entry_type === "INCOME" ? "RECEIPT" : "PAYMENT",
    principal_cents: validation.normalized.principalCents,
    interest_cents: validation.normalized.interestCents,
    penalty_cents: validation.normalized.penaltyCents,
    discount_cents: validation.normalized.discountCents,
    other_adjustment_cents: validation.normalized.otherAdjustmentCents,
    total_cents: validation.normalized.totalCents,
    settled_at: validation.normalized.settledAt,
  });

  const realized = entry.realized_amount_cents + settlement.total_cents;
  const updated = {
    ...entry,
    realized_amount_cents: realized,
    status: entry.status,
  };
  updated.status = deriveStatus(updated, user.timezone);

  getDatabase()
    .prepare(`
      UPDATE financial_entries
      SET actual_account_id = ?, realized_amount_cents = ?, settled_at = ?,
        status = ?, updated_at = ?
      WHERE user_id = ? AND id = ?
    `)
    .run(
      validation.normalized.account.id,
      realized,
      validation.normalized.settledAt || todayIso(user.timezone),
      updated.status,
      new Date().toISOString(),
      user.id,
      id
    );

  AuditLog.record(user.id, "financial_entry", id, "settled", {
    settlement_id: settlement.id,
    total_cents: settlement.total_cents,
  });

  return getById(user.id, id);
}

function normalizeEntryData(user, data) {
  const validation = validateEntryPayload(user, data, {
    getAccount: Account.getById,
    getCategory: Category.getById,
  });

  if (!validation.ok) {
    throw validationError(validation);
  }

  return {
    actual_account_id: validation.normalized.actualAccount?.id || null,
    category_id: validation.normalized.category?.id || null,
    competence_month: normalizeCompetence(validation.normalized.competenceMonth, user.timezone),
    description: String(data.description || "").trim(),
    due_date: validation.normalized.dueDate,
    entry_type: validation.normalized.entryType,
    expected_account_id: validation.normalized.expectedAccount?.id || null,
    expected_amount_cents: validation.normalized.expectedAmountCents,
    issue_date: validation.normalized.issueDate,
    notes: data.notes || null,
    realized_amount_cents: validation.normalized.realizedAmountCents,
  };
}

function dashboard(user, competence) {
  const entries = list(user, { competence });
  const total = (type, predicate = () => true, field = "expected_amount_cents") =>
    entries
      .filter((entry) => entry.entry_type === type && predicate(entry))
      .reduce((sum, entry) => sum + Number(entry[field] || 0), 0);

  const paidStatuses = new Set(["PAID", "RECEIVED"]);
  const pending = (entry) => !paidStatuses.has(entry.status) && entry.status !== "CANCELLED";
  const today = todayIso(user.timezone);

  return {
    entries,
    cards: {
      expectedBalance: total("INCOME") - total("EXPENSE"),
      incomeExpected: total("INCOME"),
      incomeReceived: total("INCOME", (entry) => true, "realized_amount_cents"),
      expenseExpected: total("EXPENSE"),
      expensePaid: total("EXPENSE", (entry) => true, "realized_amount_cents"),
      expenseOverdue: total("EXPENSE", (entry) => entry.status === "OVERDUE"),
      expensePending: total("EXPENSE", pending),
      dueToday: entries.filter((entry) => entry.due_date === today && pending(entry)).length,
    },
    byCategory: entries.reduce((acc, entry) => {
      const key = entry.category_name || "Sem categoria";
      acc[key] = (acc[key] || 0) + (entry.entry_type === "EXPENSE" ? entry.expected_amount_cents : 0);
      return acc;
    }, {}),
    upcoming: entries.filter(pending).slice(0, 8),
  };
}

module.exports = {
  cancel,
  create,
  dashboard,
  duplicate,
  getById,
  list,
  settle,
  update,
};
