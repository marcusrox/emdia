const DEFAULT_CATEGORY_COLOR = "#0F766E";

const CATEGORY_COLOR_OPTIONS = [
  { value: "#DC2626", label: "Vermelho", className: "red" },
  { value: "#EA580C", label: "Laranja", className: "orange" },
  { value: "#EAB308", label: "Amarelo", className: "yellow" },
  { value: "#16A34A", label: "Verde", className: "green" },
  { value: "#0F766E", label: "Verde-petróleo", className: "teal" },
  { value: "#0891B2", label: "Ciano", className: "cyan" },
  { value: "#2563EB", label: "Azul", className: "blue" },
  { value: "#4F46E5", label: "Índigo", className: "indigo" },
  { value: "#9333EA", label: "Roxo", className: "purple" },
  { value: "#C026D3", label: "Magenta", className: "magenta" },
  { value: "#DB2777", label: "Rosa", className: "pink" },
  { value: "#92400E", label: "Marrom", className: "brown" },
];

const CATEGORY_COLOR_VALUES = new Set(CATEGORY_COLOR_OPTIONS.map(({ value }) => value));

function validCategoryColor(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : null;
}

function normalizeCategoryColor(value, fallback = DEFAULT_CATEGORY_COLOR) {
  return validCategoryColor(value) || validCategoryColor(fallback) || DEFAULT_CATEGORY_COLOR;
}

function isCategoryPaletteColor(value) {
  const normalized = validCategoryColor(value);
  return Boolean(normalized && CATEGORY_COLOR_VALUES.has(normalized));
}

module.exports = {
  CATEGORY_COLOR_OPTIONS,
  DEFAULT_CATEGORY_COLOR,
  isCategoryPaletteColor,
  normalizeCategoryColor,
  validCategoryColor,
};
