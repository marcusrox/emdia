const { getDatabase } = require("../database/connection");
const { newId } = require("../services/id");

function record(userId, entityType, entityId, action, payload = {}) {
  getDatabase()
    .prepare(`
      INSERT INTO audit_logs (
        id, user_id, entity_type, entity_id, action, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      newId("aud"),
      userId,
      entityType,
      entityId,
      action,
      JSON.stringify(payload),
      new Date().toISOString()
    );
}

module.exports = {
  record,
};
