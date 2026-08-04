const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  BENEFICIARY_SIMILARITY_THRESHOLD,
  findReceiptMatches,
  nameSimilarity,
  normalizeBeneficiaryName,
} = require("../../src/services/receiptMatchingService");

test("normaliza favorecidos e aceita variações semelhantes sem dependência externa", () => {
  assert.equal(normalizeBeneficiaryName("  Mercado São José LTDA. "), "mercado sao jose");
  assert.equal(nameSimilarity("Mercado São José LTDA", "mercado sao jose"), 1);
  assert.ok(nameSimilarity("Supermercado Exemplo", "Supermercado Exemplo Matriz") >= BENEFICIARY_SIMILARITY_THRESHOLD);
  assert.ok(nameSimilarity("Farmácia Central", "Posto Avenida") < BENEFICIARY_SIMILARITY_THRESHOLD);
  assert.equal(nameSimilarity("", "Mercado"), 0);
});

test("aplica tolerância inclusiva de vinte por cento sobre o valor total", () => {
  const base = openEntry({ party_name: "Loja Exemplo", expected_amount_cents: 10000 });
  assert.equal(findReceiptMatches(receipt(8000), [base]).length, 1);
  assert.equal(findReceiptMatches(receipt(12000), [base]).length, 1);
  assert.equal(findReceiptMatches(receipt(7999), [base]).length, 0);
  assert.equal(findReceiptMatches(receipt(12001), [base]).length, 0);

  const partiallyPaid = { ...base, realized_amount_cents: 5000, status: "PARTIALLY_PAID" };
  assert.equal(findReceiptMatches(receipt(12000), [partiallyPaid]).length, 1);
});

test("ordena por semelhança, diferença de valor, proximidade da data e id", () => {
  const entries = [
    openEntry({ id: "ent_far", party_name: "Loja Exemplo Matriz", expected_amount_cents: 10100, due_date: "2026-07-01" }),
    openEntry({ id: "ent_value", party_name: "Loja Exemplo", expected_amount_cents: 9900, due_date: "2026-07-30" }),
    openEntry({ id: "ent_best", party_name: "Loja Exemplo", expected_amount_cents: 10000, due_date: "2026-07-29" }),
  ];
  assert.deepEqual(findReceiptMatches(receipt(10000), entries).map((entry) => entry.id), [
    "ent_best",
    "ent_value",
    "ent_far",
  ]);
});

function receipt(amountCents) {
  return { merchant_name: "Loja Exemplo", amount_cents: amountCents, payment_date: "2026-07-30" };
}

function openEntry(overrides = {}) {
  return {
    id: "ent_open",
    entry_type: "EXPENSE",
    party_name: "Loja Exemplo",
    expected_amount_cents: 10000,
    realized_amount_cents: 0,
    due_date: "2026-07-30",
    status: "PENDING",
    has_active_closing_settlement: 0,
    ...overrides,
  };
}
