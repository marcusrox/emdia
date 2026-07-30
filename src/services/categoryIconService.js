const CATEGORY_ICON_OPTIONS = [
  ["", "Sem ícone"],
  ["tag", "Etiqueta"],
  ["house", "Moradia"],
  ["bolt", "Energia"],
  ["wifi", "Internet"],
  ["utensils", "Alimentação"],
  ["heart-pulse", "Saúde"],
  ["briefcase-business", "Trabalho"],
  ["receipt", "Contas"],
  ["car", "Transporte"],
  ["shopping-cart", "Compras"],
  ["graduation-cap", "Educação"],
  ["plane", "Viagem"],
  ["gift", "Presentes"],
  ["piggy-bank", "Economia"],
  ["circle-dollar-sign", "Dinheiro"],
  ["ellipsis", "Outros"],
];

const CATEGORY_ICON_VALUES = new Set(CATEGORY_ICON_OPTIONS.map(([value]) => value));

function normalizeCategoryIcon(value) {
  const normalized = String(value || "").trim();
  return CATEGORY_ICON_VALUES.has(normalized) && normalized ? normalized : null;
}

module.exports = {
  CATEGORY_ICON_OPTIONS,
  normalizeCategoryIcon,
};
