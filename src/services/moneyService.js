const { parseMoney } = require("./formValidation");

function toCents(input) {
  if (typeof input === "number") {
    return Math.round(input * 100);
  }

  const parsed = parseMoney(input, { required: false });

  if (!parsed.ok) {
    throw new Error(parsed.message);
  }

  return parsed.cents;
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
