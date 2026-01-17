// models/templateModel.js
const { pool } = require('../config/postgres');

const createTable = async () => {
  const q = `
    CREATE TABLE IF NOT EXISTS pacs_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      modality VARCHAR(50),
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );`;
  await pool.query(q);
};

createTable().catch(()=>{});

const TemplateModel = {
  async list() {
    const r = await pool.query('SELECT * FROM pacs_templates ORDER BY id DESC');
    return r.rows;
  },
  async create({ name, modality, content }) {
    const r = await pool.query('INSERT INTO pacs_templates (name, modality, content) VALUES ($1,$2,$3) RETURNING *', [name, modality, content]);
    return r.rows[0];
  },
  async remove(id) {
    const r = await pool.query('DELETE FROM pacs_templates WHERE id=$1 RETURNING *', [id]);
    return r.rows[0];
  }
};

module.exports = TemplateModel;
