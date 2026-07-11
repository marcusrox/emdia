function toCents(input) {
  if (typeof input === "number") {
    return Math.round(input * 100);
  }

  const raw = String(input || "").trim();
  if (!raw) return 0;

  const normalized = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  return Math.round(Number(normalized || 0) * 100);
}

function formatMoney(cents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number(cents) || 0) / 100);
}

module.exports = {
  formatMoney,
  toCents,
};
