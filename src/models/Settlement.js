const { getDatabase } = require("../database/connection");
const { newId } = require("../services/id");
const { toCents } = require("../services/moneyService");

function listByEntry(entryId) {
  return getDatabase()
    .prepare(`
      SELECT s.*, a.name AS account_name
      FROM settlements s
      JOIN financial_accounts a ON a.id = s.financial_account_id
      WHERE s.financial_entry_id = ? AND s.reversed_at IS NULL
      ORDER BY s.settled_at DESC
    `)
    .all(entryId);
}

function create(userId, entryId, data) {
  const principal = toCents(data.principal);
  const interest = toCents(data.interest);
  const penalty = toCents(data.penalty);
  const discount = toCents(data.discount);
  const other = toCents(data.other_adjustment);
  const total = principal + interest + penalty + other - discount;
  const now = new Date().toISOString();
  const id = newId("set");

  getDatabase()
    .prepare(`
      INSERT INTO settlements (
        id, user_id, financial_entry_id, financial_account_id, settlement_type,
        principal_cents, interest_cents, penalty_cents, discount_cents,
        other_adjustment_cents, total_cents, settled_at, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      userId,
      entryId,
      data.financial_account_id,
      data.settlement_type || "PAYMENT",
      principal,
      interest,
      penalty,
      discount,
      other,
      total,
      data.settled_at || now.slice(0, 10),
      data.notes || null,
      now
    );

  return { id, total_cents: total };
}

module.exports = {
  create,
  listByEntry,
};
