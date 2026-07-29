async function login(agent, credentials = {}) {
  return agent
    .post("/login")
    .type("form")
    .send({
      email: credentials.email || "usuario@emdia.local",
      password: credentials.password || "emdia123",
    });
}

function csrfFrom(html) {
  return html.match(/name="_csrf" value="([^"]+)"/)?.[1] || "";
}

function requestWithSession(token) {
  return {
    headers: {
      cookie: `emdia_session=${encodeURIComponent(token)}`,
    },
  };
}

module.exports = {
  csrfFrom,
  login,
  requestWithSession,
};
