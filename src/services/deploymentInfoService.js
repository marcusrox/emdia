const fs = require("node:fs");
const path = require("node:path");

const DEPLOY_COMMIT_FILE = path.join(__dirname, "..", "..", ".deploy-commit");
const DEPLOY_COMMIT_PATTERN = /^Commit publicado: [0-9a-f]{7,64}$/;

function readPublishedCommit(filePath = DEPLOY_COMMIT_FILE) {
  try {
    const content = fs.readFileSync(filePath, "utf8").trim();
    return DEPLOY_COMMIT_PATTERN.test(content) ? content : "";
  } catch (error) {
    if (error.code === "ENOENT") return "";
    return "";
  }
}

module.exports = {
  DEPLOY_COMMIT_FILE,
  readPublishedCommit,
};
