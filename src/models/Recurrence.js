const { getDatabase } = require("../database/connection");
const AuditLog = require("./AuditLog");
const Category = require("./Category");
const Party = require("./Party");
const { dueDateFromCompetence, normalizeCompetence } = require("../services/dateService");
const { validateRecurrencePayload, validationError } = require("../services/formValidation");
const { newId } = require("../services/id");
const { toCents } = require("../services/moneyService");
const { deriveStatus } = require("../services/statusService");

const STATUS_VALUES = new Set(["ACTIVE", "PAUSED", "ENDED"]);

function list(userId) {
  return getDatabase()
    .prepare(`
      SELECT
        r.*,
        c.name AS category_name,
        c.entry_type AS category_entry_type,
        c.color AS category_color,
        a.name AS financial_account_name,
        p.name AS party_name
      FROM recurrences r
      INNER JOIN categories c ON c.id = r.category_id
      LEFT JOIN financial_accounts a ON a.id = r.financial_account_id
      LEFT JOIN parties p ON p.id = r.party_id
      WHERE r.user_id = ?
      ORDER BY r.status, r.description
    `)
    .all(userId);
}

function getById(userId, id) {
  return getDatabase()
    .prepare(`
      SELECT
        r.*,
        c.name AS category_name,
        c.entry_type AS category_entry_type,
        a.name AS financial_account_name,
        p.name AS party_name
      FROM recurrences r
      INNER JOIN categories c ON c.id = r.category_id
      LEFT JOIN financial_accounts a ON a.id = r.financial_account_id
      LEFT JOIN parties p ON p.id = r.party_id
      WHERE r.user_id = ? AND r.id = ?
    `)
    .get(userId, id);
}

function create(user, data) {
  const normalized = normalizeData(user, data);
  const now = new Date().toISOString();
  const id = newId("rec");

  getDatabase()
    .prepare(`
      INSERT INTO recurrences (
        id, user_id, description, category_id, financial_account_id, party_id,
        expected_amount_cents, due_day, start_competence_month,
        end_competence_month, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      user.id,
      normalized.description,
      normalized.category_id,
      normalized.financial_account_id,
      normalized.party_id,
      normalized.expected_amount_cents,
      normalized.due_day,
      normalized.start_competence_month,
      normalized.end_competence_month,
      normalized.status,
      normalized.notes,
      now,
      now
    );

  AuditLog.record(user.id, "recurrence", id, "created", { description: normalized.description });
  return getById(user.id, id);
}

function update(user, id, data) {
  const existing = getById(user.id, id);
  if (!existing) return null;

  const normalized = normalizeData(user, data);

  getDatabase()
    .prepare(`
      UPDATE recurrences
      SET description = ?, category_id = ?, financial_account_id = ?,
        party_id = ?, expected_amount_cents = ?, due_day = ?,
        start_competence_month = ?, end_competence_month = ?, status = ?,
        notes = ?, updated_at = ?
      WHERE user_id = ? AND id = ?
    `)
    .run(
      normalized.description,
      normalized.category_id,
      normalized.financial_account_id,
      normalized.party_id,
      normalized.expected_amount_cents,
      normalized.due_day,
      normalized.start_competence_month,
      normalized.end_competence_month,
      normalized.status,
      normalized.notes,
      new Date().toISOString(),
      user.id,
      id
    );

  AuditLog.record(user.id, "recurrence", id, "updated", { description: normalized.description });
  return getById(user.id, id);
}

function pause(user, id) {
  return setStatus(user, id, "PAUSED", "paused");
}

function end(user, id) {
  return setStatus(user, id, "ENDED", "ended");
}

function activate(user, id) {
  return setStatus(user, id, "ACTIVE", "activated");
}

function generateForCompetence(user, competenceValue) {
  const competence = normalizeCompetence(competenceValue, user.timezone);
  const recurrences = applicable(user.id, competence);
  let generated = 0;

  const db = getDatabase();
  db.exec("BEGIN");
  try {
    recurrences.forEach((recurrence) => {
      if (hasEntry(user.id, recurrence.id, competence)) return;
      createEntryFromRecurrence(user, recurrence, competence);
      generated += 1;
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return generated;
}

function applicable(userId, competence) {
  return getDatabase()
    .prepare(`
      SELECT
        r.*,
        c.entry_type AS category_entry_type,
        p.name AS party_name
      FROM recurrences r
      INNER JOIN categories c ON c.id = r.category_id
      LEFT JOIN parties p ON p.id = r.party_id
      WHERE r.user_id = ?
        AND r.status = 'ACTIVE'
        AND r.start_competence_month <= ?
        AND (r.end_competence_month IS NULL OR r.end_competence_month >= ?)
        AND c.deleted_at IS NULL
        AND c.entry_type IN ('INCOME', 'EXPENSE')
      ORDER BY r.description
    `)
    .all(userId, competence, competence);
}

function hasEntry(userId, recurrenceId, competence) {
  return Boolean(
    getDatabase()
      .prepare(`
        SELECT id
        FROM financial_entries
        WHERE user_id = ?
          AND recurrence_rule_id = ?
          AND competence_month = ?
          AND deleted_at IS NULL
        LIMIT 1
      `)
      .get(userId, recurrenceId, competence)
  );
}

function createEntryFromRecurrence(user, recurrence, competence) {
  const now = new Date().toISOString();
  const id = newId("ent");
  const dueDate = dueDateFromCompetence(competence, recurrence.due_day);
  const draft = {
    entry_type: recurrence.category_entry_type,
    expected_amount_cents: recurrence.expected_amount_cents,
    realized_amount_cents: 0,
    due_date: dueDate,
    status: "PENDING",
  };
  draft.status = deriveStatus(draft, user.timezone);

  getDatabase()
    .prepare(`
      INSERT INTO financial_entries (
        id, user_id, entry_type, description, category_id, party_id,
        expected_account_id, expected_amount_cents, realized_amount_cents,
        competence_month, due_date, status, origin, recurrence_rule_id,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      user.id,
      draft.entry_type,
      recurrence.description,
      recurrence.category_id,
      recurrence.party_id,
      recurrence.financial_account_id,
      recurrence.expected_amount_cents,
      0,
      competence,
      dueDate,
      draft.status,
      "RECURRENCE",
      recurrence.id,
      recurrence.notes,
      now,
      now
    );

  AuditLog.record(user.id, "financial_entry", id, "recurrence_generated", {
    recurrence_id: recurrence.id,
    competence,
  });
}

function setStatus(user, id, status, action) {
  const existing = getById(user.id, id);
  if (!existing) return null;

  getDatabase()
    .prepare("UPDATE recurrences SET status = ?, updated_at = ? WHERE user_id = ? AND id = ?")
    .run(status, new Date().toISOString(), user.id, id);

  AuditLog.record(user.id, "recurrence", id, action, { description: existing.description });
  return getById(user.id, id);
}

function normalizeData(user, data) {
  const validation = validateRecurrencePayload(user, data, {
    getCategory: Category.getById,
    normalizeCompetence,
  });
  if (!validation.ok) {
    throw validationError(validation);
  }

  const dueDay = Math.trunc(Number(data.due_day));
  const category = validation.normalized.category;
  const party = Party.findOrCreate(user.id, data.party_name, category.entry_type === "INCOME" ? "PAYER" : "PAYEE");
  const status = STATUS_VALUES.has(data.status) ? data.status : "ACTIVE";

  return {
    description: String(data.description || "").trim(),
    category_id: category.id,
    financial_account_id: data.financial_account_id || null,
    party_id: party ? party.id : null,
    expected_amount_cents: validation.normalized.expectedAmountCents ?? toCents(data.expected_amount),
    due_day: dueDay,
    start_competence_month: validation.normalized.startCompetence,
    end_competence_month: validation.normalized.endCompetence,
    status,
    notes: data.notes || null,
  };
}

module.exports = {
  activate,
  create,
  end,
  generateForCompetence,
  getById,
  list,
  pause,
  update,
};
