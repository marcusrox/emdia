const { getDatabase } = require("../database/connection");
const { newId } = require("../services/id");
const { toCents } = require("../services/moneyService");

function listByEntry(userId, entryId) {
  return getDatabase()
    .prepare(`
      SELECT s.*, a.name AS account_name,
        r.id AS reversal_id, r.reason AS reversal_reason, r.reversed_at AS reversal_at
      FROM settlements s
      JOIN financial_accounts a ON a.id = s.financial_account_id
      LEFT JOIN settlement_reversals r ON r.settlement_id = s.id
      WHERE s.user_id = ? AND s.financial_entry_id = ?
      ORDER BY s.settled_at DESC
    `)
    .all(userId, entryId);
}

function getActiveForUser(userId, settlementId) {
  return getDatabase().prepare(`
    SELECT s.* FROM settlements s
    LEFT JOIN settlement_reversals r ON r.settlement_id = s.id
    WHERE s.user_id = ? AND s.id = ? AND s.reversed_at IS NULL AND r.id IS NULL
  `).get(userId, settlementId);
}

function activeTotalByEntry(userId, entryId) {
  const row = getDatabase().prepare(`
    SELECT COALESCE(SUM(s.total_cents), 0) AS total_cents
    FROM settlements s
    LEFT JOIN settlement_reversals r ON r.settlement_id = s.id
    WHERE s.user_id = ? AND s.financial_entry_id = ?
      AND s.reversed_at IS NULL AND r.id IS NULL
  `).get(userId, entryId);
  return Number(row?.total_cents || 0);
}

function create(userId, entryId, data) {
  const principal = data.principal_cents ?? toCents(data.principal);
  const interest = data.interest_cents ?? toCents(data.interest);
  const penalty = data.penalty_cents ?? toCents(data.penalty);
  const discount = data.discount_cents ?? toCents(data.discount);
  const other = data.other_adjustment_cents ?? toCents(data.other_adjustment);
  const total = data.total_cents ?? principal + interest + penalty + other - discount;
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
  activeTotalByEntry,
  create,
  getActiveForUser,
  listByEntry,
};
