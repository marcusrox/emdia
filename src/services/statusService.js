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
  statusLabel,
};
