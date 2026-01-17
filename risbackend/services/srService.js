// services/srService.js
const { pool } = require('../config/postgres');
const axios = require('axios');

/**
 * Very simple conversion: text -> SR JSON structure.
 * This is a starting point. For a true DICOM SR, use dcmjs to produce a real DICOM object.
 */
async function saveSR({ study_uid, created_by, text }) {
  const payload = {
    study_uid,
    text,
    structured: {
      narrative: text,
      // You could add coded findings here using structuredService
    }
  };
  const r = await pool.query(`INSERT INTO dicom_srs (study_uid, created_by, sr_payload) VALUES ($1,$2,$3) RETURNING *`, [study_uid, created_by, payload]);
  return r.rows[0];
}

/**
 * Push SR to PACS (Orthanc) — naive approach: POST JSON to endpoint that your Orthanc has
 */
async function pushToPacs(pacsConfig, srEntry) {
  const base = pacsConfig.base_url || `http://${pacsConfig.host}:${pacsConfig.port}`;
  const url = `${base}/tools/create-sr`; // custom plugin endpoint example
  try {
    const res = await axios.post(url, srEntry.sr_payload, {
      auth: pacsConfig.username ? { username: pacsConfig.username, password: pacsConfig.password } : undefined,
      timeout: Number(process.env.SR_EXPORT_ENDPOINT_TIMEOUT || 10000)
    });
    await pool.query('UPDATE dicom_srs SET pushed=$1, updated_at=NOW() WHERE id=$2', [true, srEntry.id]);
    return { ok: true, res: res.data };
  } catch (err) {
    return { ok: false, message: err.message || err };
  }
}

module.exports = { saveSR, pushToPacs };
