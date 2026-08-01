function legacyWhatsAppPhone(phoneE164) {
  const match = /^\+55(\d{2})(9\d{8})$/.exec(String(phoneE164 || ""));
  return match ? `+55${match[1]}${match[2].slice(1)}` : null;
}

module.exports = {
  id: "012_add_legacy_whatsapp_phone",
  up(db) {
    db.exec("ALTER TABLE users ADD COLUMN phone_whatsapp_legacy TEXT;");

    const users = db.prepare("SELECT id, phone_e164 FROM users WHERE phone_e164 IS NOT NULL AND phone_e164 <> ''").all();
    const canonicalOwners = new Map(users.map((user) => [user.phone_e164, user.id]));
    const legacyOwners = new Map();

    for (const user of users) {
      const legacyPhone = legacyWhatsAppPhone(user.phone_e164);
      if (!legacyPhone) continue;

      const canonicalOwner = canonicalOwners.get(legacyPhone);
      const legacyOwner = legacyOwners.get(legacyPhone);
      if ((canonicalOwner && canonicalOwner !== user.id) || (legacyOwner && legacyOwner !== user.id)) {
        const error = new Error("USER_PHONE_ALIAS_CONFLICT");
        error.code = "USER_PHONE_ALIAS_CONFLICT";
        throw error;
      }

      legacyOwners.set(legacyPhone, user.id);
      db.prepare("UPDATE users SET phone_whatsapp_legacy = ? WHERE id = ?").run(legacyPhone, user.id);
    }

    db.exec(`
      CREATE UNIQUE INDEX idx_users_phone_whatsapp_legacy_unique
      ON users(phone_whatsapp_legacy)
      WHERE phone_whatsapp_legacy IS NOT NULL AND phone_whatsapp_legacy <> '';

      CREATE TRIGGER users_phone_alias_insert_guard
      BEFORE INSERT ON users
      WHEN
        (NEW.phone_e164 IS NOT NULL AND NEW.phone_e164 <> '' AND EXISTS (
          SELECT 1 FROM users WHERE phone_whatsapp_legacy = NEW.phone_e164
        ))
        OR
        (NEW.phone_whatsapp_legacy IS NOT NULL AND NEW.phone_whatsapp_legacy <> '' AND EXISTS (
          SELECT 1 FROM users WHERE phone_e164 = NEW.phone_whatsapp_legacy
        ))
      BEGIN
        SELECT RAISE(ABORT, 'USER_PHONE_ALIAS_CONFLICT');
      END;

      CREATE TRIGGER users_phone_alias_update_guard
      BEFORE UPDATE OF phone_e164, phone_whatsapp_legacy ON users
      WHEN
        (NEW.phone_e164 IS NOT NULL AND NEW.phone_e164 <> '' AND EXISTS (
          SELECT 1 FROM users WHERE id <> NEW.id AND phone_whatsapp_legacy = NEW.phone_e164
        ))
        OR
        (NEW.phone_whatsapp_legacy IS NOT NULL AND NEW.phone_whatsapp_legacy <> '' AND EXISTS (
          SELECT 1 FROM users WHERE id <> NEW.id AND phone_e164 = NEW.phone_whatsapp_legacy
        ))
      BEGIN
        SELECT RAISE(ABORT, 'USER_PHONE_ALIAS_CONFLICT');
      END;
    `);
  },
};
