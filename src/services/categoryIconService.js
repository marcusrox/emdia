const CATEGORY_ICON_OPTIONS = [
  ["", "Sem ícone"],
  ["tag", "Etiqueta"],
  ["house", "Moradia"],
  ["droplets", "Água"],
  ["bolt", "Energia"],
  ["wifi", "Internet"],
  ["utensils", "Alimentação"],
  ["heart-pulse", "Saúde"],
  ["briefcase-business", "Trabalho"],
  ["receipt", "Contas"],
  ["car", "Transporte"],
  ["bus-front", "Transporte público"],
  ["shopping-cart", "Compras"],
  ["shopping-bag", "Vendas"],
  ["graduation-cap", "Educação"],
  ["gamepad-2", "Lazer"],
  ["refresh-cw", "Assinaturas"],
  ["landmark", "Impostos"],
  ["plane", "Viagem"],
  ["gift", "Presentes"],
  ["piggy-bank", "Economia"],
  ["hand-coins", "Benefícios"],
  ["chart-no-axes-combined", "Rendimentos"],
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
