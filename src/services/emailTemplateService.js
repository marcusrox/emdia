const SUBJECT = "Sua conta no EmDia foi criada";

function accountCreatedEmail({ name, appBaseUrl = process.env.APP_BASE_URL } = {}) {
  const safeName = normalizeName(name);
  const loginUrl = loginUrlFrom(appBaseUrl);
  const linkText = loginUrl ? `\n\nAcesse o EmDia: ${loginUrl}` : "";
  const linkHtml = loginUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(loginUrl)}" style="background:#2563eb;border-radius:8px;color:#fff;display:inline-block;font-weight:700;padding:12px 18px;text-decoration:none">Abrir o EmDia</a></p>`
    : "";

  return {
    subject: SUBJECT,
    text: `Olá, ${safeName}!\n\nSua conta no EmDia foi criada com sucesso.\n\nJá deixamos uma conta corrente, uma carteira e categorias iniciais preparadas para você começar a organizar receitas, despesas e vencimentos do mês.${linkText}\n\nSe você não realizou esse cadastro, desconsidere esta mensagem e entre em contato com o responsável pelo EmDia.`,
    html: `<!doctype html><html lang="pt-BR"><body style="background:#f4f7fb;color:#172033;font-family:Arial,sans-serif;margin:0;padding:24px"><main style="background:#fff;border-radius:12px;margin:0 auto;max-width:600px;padding:32px"><p style="color:#2563eb;font-size:20px;font-weight:700;margin:0 0 24px">EmDia</p><h1 style="font-size:24px;margin:0 0 20px">Olá, ${escapeHtml(safeName)}!</h1><p>Sua conta no EmDia foi criada com sucesso.</p><p>Já deixamos uma conta corrente, uma carteira e categorias iniciais preparadas para você começar a organizar receitas, despesas e vencimentos do mês.</p>${linkHtml}<p style="color:#667085;font-size:13px;margin-top:28px">Se você não realizou esse cadastro, desconsidere esta mensagem e entre em contato com o responsável pelo EmDia.</p></main></body></html>`,
  };
}

function loginUrlFrom(value) {
  try {
    const url = new URL(String(value || ""));
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return "";
    url.pathname = "/login";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch (error) {
    return "";
  }
}

function normalizeName(value) {
  return String(value || "usuário").replace(/\s+/g, " ").trim().slice(0, 120) || "usuário";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

module.exports = { accountCreatedEmail, loginUrlFrom };
