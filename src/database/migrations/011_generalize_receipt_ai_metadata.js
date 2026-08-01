module.exports = {
  id: "011_generalize_receipt_ai_metadata",
  up(db) {
    db.exec(`
      ALTER TABLE receipt_imports RENAME COLUMN openai_response_id TO extraction_response_id;
      ALTER TABLE receipt_imports RENAME COLUMN openai_model TO extraction_model;
    `);
  },
};
