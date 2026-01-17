// models/hospitalSettingsModel.js
const { pool } = require("../config/postgres");

const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hospital_settings (
      id SERIAL PRIMARY KEY,
      name TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      logo_path TEXT,
      footer_text TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ensure single row exists (id=1) for simple single-settings pattern
  const r = await pool.query('SELECT COUNT(*)::int AS c FROM hospital_settings');
  if (r.rows[0].c === 0) {
    await pool.query(
      `INSERT INTO hospital_settings (name, address, phone, email, logo_path, footer_text)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      ["My Hospital", "", "", "", "", ""]
    );
  }
};

const HospitalSettingsModel = {
  async init() {
    await ensureTable();
  },

  async get() {
    await ensureTable();
    const r = await pool.query("SELECT * FROM hospital_settings ORDER BY id LIMIT 1");
    return r.rows[0] || null;
  },

  async update(data) {
    await ensureTable();
    const { name, address, phone, email, logo_path, footer_text } = data;
    const q = `
      UPDATE hospital_settings SET
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        logo_path = COALESCE($5, logo_path),
        footer_text = COALESCE($6, footer_text),
        updated_at = NOW()
      WHERE id = (SELECT id FROM hospital_settings ORDER BY id LIMIT 1)
      RETURNING *`;
    const r = await pool.query(q, [name, address, phone, email, logo_path, footer_text]);
    return r.rows[0];
  },
};

module.exports = HospitalSettingsModel;
