const { settlementEligibility } = require("./statusService");

const BENEFICIARY_SIMILARITY_THRESHOLD = 0.7;
const VALUE_TOLERANCE_PERCENT = 20;
const LEGAL_SUFFIXES = new Set(["eireli", "epp", "ltda", "me", "sa"]);

function findReceiptMatches(receipt, entries) {
  const amountCents = Number(receipt?.amount_cents || 0);
  const paymentDate = String(receipt?.payment_date || "");
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return [];

  return eligibleEntries(entries)
    .map((entry) => matchEntry(receipt?.merchant_name, amountCents, paymentDate, entry))
    .filter(Boolean)
    .sort(compareMatches);
}

function eligibleEntries(entries) {
  return (entries || []).filter((entry) => (
    entry?.entry_type === "EXPENSE" && settlementEligibility(entry).allowed
  ));
}

function matchEntry(merchantName, amountCents, paymentDate, entry) {
  const expectedCents = Number(entry.expected_amount_cents || 0);
  if (!Number.isSafeInteger(expectedCents) || expectedCents <= 0) return null;

  const beneficiarySimilarity = nameSimilarity(merchantName, entry.party_name);
  const valueDifferenceCents = Math.abs(amountCents - expectedCents);
  const toleranceCents = Math.round(expectedCents * VALUE_TOLERANCE_PERCENT / 100);
  if (beneficiarySimilarity < BENEFICIARY_SIMILARITY_THRESHOLD || valueDifferenceCents > toleranceCents) {
    return null;
  }

  return {
    ...entry,
    beneficiary_similarity: beneficiarySimilarity,
    value_difference_cents: valueDifferenceCents,
    due_date_distance_days: dateDistanceDays(paymentDate, entry.due_date),
  };
}

function compareMatches(left, right) {
  return right.beneficiary_similarity - left.beneficiary_similarity
    || left.value_difference_cents - right.value_difference_cents
    || left.due_date_distance_days - right.due_date_distance_days
    || String(left.id).localeCompare(String(right.id));
}

function nameSimilarity(left, right) {
  const normalizedLeft = normalizeBeneficiaryName(left);
  const normalizedRight = normalizeBeneficiaryName(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;

  return Math.max(
    diceCoefficient(characterBigrams(normalizedLeft), characterBigrams(normalizedRight)),
    diceCoefficient(normalizedLeft.split(" "), normalizedRight.split(" ")),
  );
}

function normalizeBeneficiaryName(value) {
  const tokens = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  while (tokens.length > 1 && LEGAL_SUFFIXES.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(" ");
}

function characterBigrams(value) {
  const compact = value.replaceAll(" ", "");
  if (compact.length < 2) return compact ? [compact] : [];
  return Array.from({ length: compact.length - 1 }, (_, index) => compact.slice(index, index + 2));
}

function diceCoefficient(leftValues, rightValues) {
  if (!leftValues.length || !rightValues.length) return 0;
  const remaining = new Map();
  for (const value of rightValues) remaining.set(value, (remaining.get(value) || 0) + 1);
  let intersection = 0;
  for (const value of leftValues) {
    const count = remaining.get(value) || 0;
    if (!count) continue;
    intersection += 1;
    remaining.set(value, count - 1);
  }
  return (2 * intersection) / (leftValues.length + rightValues.length);
}

function dateDistanceDays(left, right) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(left) || !/^\d{4}-\d{2}-\d{2}$/.test(String(right || ""))) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.abs(Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) / 86400000;
}

module.exports = {
  BENEFICIARY_SIMILARITY_THRESHOLD,
  VALUE_TOLERANCE_PERCENT,
  eligibleEntries,
  findReceiptMatches,
  nameSimilarity,
  normalizeBeneficiaryName,
};
