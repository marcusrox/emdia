const querystring = require("node:querystring");

function sendHtml(res, html, statusCode = 200) {
  res.writeHead(statusCode, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function redirect(res, location) {
  res.writeHead(303, { location });
  res.end();
}

function sendJson(res, payload, statusCode = 200) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1_000_000) {
        reject(new Error("Payload muito grande."));
      }
    });
    req.on("end", () => resolve(querystring.parse(body)));
    req.on("error", reject);
  });
}

function getPathParts(pathname) {
  return pathname.split("/").filter(Boolean);
}

module.exports = {
  getPathParts,
  parseBody,
  redirect,
  sendHtml,
  sendJson,
};
