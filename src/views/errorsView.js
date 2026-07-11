const { layout } = require("./layout");

function notFoundView(user) {
  return layout({
    title: "Não encontrado",
    user,
    active: "",
    body: `<section class="page-heading"><span class="eyebrow">404</span><h1>Página não encontrada</h1><p>O caminho solicitado não existe no MVP atual.</p></section>`,
  });
}

module.exports = {
  notFoundView,
};
