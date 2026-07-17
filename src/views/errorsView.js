const { layout } = require("./layout");
const { pageHeading } = require("../services/viewHelpers");

function notFoundView(user) {
  return layout({
    title: "Não encontrado",
    user,
    active: "",
    body: pageHeading({
      eyebrow: "404",
      title: "Página não encontrada",
      description: "O caminho solicitado não existe no MVP atual.",
    }),
  });
}

module.exports = {
  notFoundView,
};
