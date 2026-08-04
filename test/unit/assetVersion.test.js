const assert = require("node:assert/strict");
const { test } = require("node:test");
const { ASSET_VERSION, RELEASE_LABEL, versionedAssetPath } = require("../../src/config/release");
const { loginView } = require("../../src/views/authView");
const { unexpectedErrorView } = require("../../src/views/errorsView");
const { layout } = require("../../src/views/layout");

test("deriva a versão dos assets do sequencial da release", () => {
  const releaseSequence = RELEASE_LABEL.match(/-\s*(\d+)$/)?.[1];
  assert.equal(ASSET_VERSION, releaseSequence);
  assert.equal(versionedAssetPath("/public/css/styles.css"), `/public/css/styles.css?v=${ASSET_VERSION}`);
  assert.equal(versionedAssetPath("/asset?theme=dark"), `/asset?theme=dark&v=${ASSET_VERSION}`);
});

test("versiona CSS e JavaScript nas páginas autenticadas e públicas", () => {
  const user = {
    id: "usr_asset",
    name: "Usuário",
    email: "asset@example.test",
    timezone: "America/Sao_Paulo",
    csrfToken: "csrf",
  };
  const authenticated = layout({ title: "Teste", user, active: "", body: "" });
  const publicPage = loginView();
  const publicError = unexpectedErrorView({ errorId: "error-test" });

  for (const html of [authenticated, publicPage, publicError]) {
    assert.ok(html.includes(`/public/css/styles.css?v=${ASSET_VERSION}`));
  }
  for (const html of [authenticated, publicPage]) {
    assert.ok(html.includes(`/public/js/app.js?v=${ASSET_VERSION}`));
  }
});
