const { statusLabel } = require("./statusService");

const HEADERS = [
  "Identificador", "Tipo", "Descrição", "Competência", "Vencimento", "Status",
  "Valor previsto", "Valor realizado", "Saldo em aberto", "Categoria",
  "Favorecido/Pagador", "Conta", "Origem", "Recorrência de origem",
  "Parcela", "Total de parcelas", "Quantidade de baixas vigentes", "Observações",
  "Criado em", "Atualizado em",
];

function neutralizeFormula(value) {
  const text = String(value ?? "");
  return /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function csvCell(value) {
  return `"${neutralizeFormula(value).replace(/"/g, '""')}"`;
}

function formatCents(cents) {
  return ((Number(cents) || 0) / 100).toFixed(2).replace(".", ",");
}

function entryTypeLabel(type) {
  return type === "INCOME" ? "Receita" : "Despesa";
}

function entryRow(entry) {
  const open = Math.max(0, Number(entry.expected_amount_cents || 0) - Number(entry.realized_amount_cents || 0));
  return [entry.id, entryTypeLabel(entry.entry_type), entry.description, entry.competence_month,
    entry.due_date, statusLabel(entry.status), formatCents(entry.expected_amount_cents),
    formatCents(entry.realized_amount_cents), formatCents(open), entry.category_name,
    entry.party_name, entry.financial_account_name, entry.origin, entry.recurrence_description,
    entry.installment_number, entry.installment_count, entry.active_settlement_count, entry.notes,
    entry.created_at, entry.updated_at];
}

function entriesCsv(entries) {
  const rows = [HEADERS, ...entries.map(entryRow)];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
}

module.exports = { csvCell, entriesCsv, neutralizeFormula };
