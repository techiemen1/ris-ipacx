// models/pacsModel.js
const { pool } = require('../config/postgres');

const createTable = async () => {
  const q = `
    CREATE TABLE IF NOT EXISTS pacs_servers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      host VARCHAR(255) NOT NULL,
      port INTEGER NOT NULL,
      aetitle VARCHAR(100),
      username VARCHAR(100),
      password VARCHAR(100),
      base_url VARCHAR(1024),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
  await pool.query(q);
};

const PACSModel = {
  async init() { await createTable(); },

  async getAll() {
    const res = await pool.query('SELECT * FROM pacs_servers ORDER BY id ASC');
    return res.rows;
  },

  async getById(id) {
    const res = await pool.query('SELECT * FROM pacs_servers WHERE id=$1', [id]);
    return res.rows[0];
  },

  async create(data) {
    const { name, type, host, port, aetitle, username, password, base_url, is_active, protocol, description, wado_uri, wado_rs, qido_rs, stow_rs } = data;
    const res = await pool.query(
      `INSERT INTO pacs_servers (name,type,host,port,aetitle,username,password,base_url,is_active,protocol,description,wado_uri,wado_rs,qido_rs,stow_rs,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW()) RETURNING *`,
      [name, type, host, port, aetitle || null, username || null, password || null, base_url || null, is_active ?? true, protocol || 'DICOMWEB', description || null, wado_uri, wado_rs, qido_rs, stow_rs]
    );
    return res.rows[0];
  },

  async update(id, data) {
    const { name, type, host, port, aetitle, username, password, base_url, is_active, protocol, description, wado_uri, wado_rs, qido_rs, stow_rs } = data;
    const res = await pool.query(
      `UPDATE pacs_servers SET name=$1,type=$2,host=$3,port=$4,aetitle=$5,username=$6,password=$7,base_url=$8,is_active=$9,protocol=$10,description=$11,wado_uri=$12,wado_rs=$13,qido_rs=$14,stow_rs=$15,updated_at=NOW()
       WHERE id=$16 RETURNING *`,
      [name, type, host, port, aetitle || null, username || null, password || null, base_url || null, is_active ?? true, protocol || 'DICOMWEB', description || null, wado_uri, wado_rs, qido_rs, stow_rs, id]
    );
    return res.rows[0];
  },

  async remove(id) {
    const res = await pool.query('DELETE FROM pacs_servers WHERE id=$1 RETURNING *', [id]);
    return res.rows[0];
  },
};

module.exports = PACSModel;
