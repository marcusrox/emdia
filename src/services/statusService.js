const { todayIso } = require("./dateService");

function deriveStatus(entry, timezone = "America/Bahia") {
  if (entry.status === "CANCELLED") return "CANCELLED";

  const expected = Number(entry.expected_amount_cents) || 0;
  const realized = Number(entry.realized_amount_cents) || 0;

  if (entry.entry_type === "INCOME") {
    if (realized >= expected) return "RECEIVED";
    if (realized > 0) return "PARTIALLY_RECEIVED";
  } else {
    if (realized >= expected) return "PAID";
    if (realized > 0) return "PARTIALLY_PAID";
  }

  if (entry.due_date < todayIso(timezone)) return "OVERDUE";
  return "PENDING";
}

function settlementEligibility(entry) {
  const expected = Number(entry?.expected_amount_cents) || 0;
  const realized = Number(entry?.realized_amount_cents) || 0;
  const openAmountCents = Math.max(0, expected - realized);
  const status = entry?.status;

  const blockedMessages = {
    PAID: "Este lançamento já está pago e não aceita uma nova baixa.",
    RECEIVED: "Este lançamento já foi recebido e não aceita uma nova baixa.",
    CANCELLED: "Lançamentos cancelados não aceitam baixa.",
    DRAFT: "Este lançamento ainda é um rascunho e não aceita baixa.",
  };

  if (blockedMessages[status]) {
    return blockedSettlement(status.toLowerCase(), blockedMessages[status], openAmountCents);
  }

  if (openAmountCents <= 0) {
    return blockedSettlement(
      "no_open_amount",
      "Não há saldo disponível. Atualize a página para consultar o status atual.",
      openAmountCents,
    );
  }

  const allowedStatuses = new Set(["PENDING", "OVERDUE"]);
  const expectedPartialStatus = entry?.entry_type === "INCOME" ? "PARTIALLY_RECEIVED" : "PARTIALLY_PAID";
  if (status === expectedPartialStatus || allowedStatuses.has(status)) {
    return {
      allowed: true,
      message: "",
      openAmountCents,
      reason: null,
    };
  }

  return blockedSettlement(
    "incompatible_status",
    "Este lançamento não aceita baixa no status atual.",
    openAmountCents,
  );
}

function blockedSettlement(reason, message, openAmountCents) {
  return {
    allowed: false,
    message,
    openAmountCents,
    reason,
  };
}

function statusLabel(status) {
  const labels = {
    DRAFT: "Rascunho",
    PENDING: "Pendente",
    PARTIALLY_PAID: "Pago parcial",
    PAID: "Pago",
    OVERDUE: "Vencido",
    CANCELLED: "Cancelado",
    RECEIVED: "Recebido",
    PARTIALLY_RECEIVED: "Recebido parcial",
  };

  return labels[status] || status;
}

module.exports = {
  deriveStatus,
  settlementEligibility,
  statusLabel,
};
