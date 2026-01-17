// controllers/pacsController.js
const PACSModel = require('../models/pacsModel');
const pacsService = require('../services/pacsService');

exports.list = async (req, res) => {
  try {
    const list = await PACSModel.getAll();
    return res.json({ success: true, data: list });
  } catch (err) {
    console.error('pacs.list', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const pacs = await PACSModel.getById(Number(req.params.id));
    if (!pacs) return res.status(404).json({ success: false, message: 'PACS not found' });
    return res.json({ success: true, data: pacs });
  } catch (err) {
    console.error('pacs.getById', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudies = async (req, res) => {
  try {
    const pacs = await PACSModel.getById(Number(req.params.id));
    if (!pacs) return res.status(404).json({ success: false, message: 'PACS not found' });

    const list = await pacsService.qidoStudies(pacs, req.query);
    return res.json({ success: true, data: Array.isArray(list) ? list : (list && list.data) || [] });
  } catch (err) {
    console.error('pacs.getStudies', err && (err.message || err));
    if (err.message === 'UNAUTHORIZED') {
      return res.status(400).json({ success: false, message: 'Unauthorized: PACS credentials invalid' });
    }
    if (err.message === 'NOT_FOUND') {
      return res.status(502).json({ success: false, message: 'QIDO endpoint not found on PACS' });
    }
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch studies' });
  }
};

exports.testPacs = async (req, res) => {
  try {
    const pacs = await PACSModel.getById(Number(req.params.id));
    if (!pacs) return res.status(404).json({ success: false, message: 'PACS not found' });

    const result = await pacsService.testConnection(pacs);
    if (result.ok) {
      return res.json({ success: true, message: result.message, sampleCount: result.sampleCount });
    } else {
      return res.status(400).json({ success: false, message: result.message, detail: result.detail || null });
    }
  } catch (err) {
    console.error('pacs.testPacs', err);
    return res.status(500).json({ success: false, message: err.message || 'Test failed' });
  }
};

const { pool } = require("../config/postgres");
// const pacsService = require("../services/pacsService");

exports.syncStudies = async (req, res) => {
  const { id } = req.params;

  try {
    const r = await pool.query(
      `SELECT * FROM pacs_servers WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ success: false, message: "PACS not found" });
    }

    const pacs = r.rows[0];
    const studies = await pacsService.syncPacsStudies(pacs);

    let count = 0;

    for (const s of studies) {
      await pool.query(
        `
        INSERT INTO pacs_studies
          (study_instance_uid, patient_name, patient_id, modality, accession_number, study_date)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (study_instance_uid)
        DO UPDATE SET
          patient_name = EXCLUDED.patient_name,
          patient_id = EXCLUDED.patient_id,
          modality = EXCLUDED.modality,
          accession_number = EXCLUDED.accession_number,
          study_date = EXCLUDED.study_date,
          updated_at = NOW()
        `,
        [
          s.study_instance_uid,
          s.patient_name,
          s.patient_id,
          s.modality,
          s.accession_number,
          s.study_date,
        ]
      );
      count++;
    }

    res.json({ success: true, synced: count });
  } catch (err) {
    console.error("syncStudies", err);
    res.status(500).json({ success: false, message: "Sync failed" });
  }
};

/* =========================================================
   ADMIN CRUD OPERATIONS (Merged)
========================================================= */

exports.create = async (req, res) => {
  try {
    const data = req.body;
    constcreated = await PACSModel.create(data);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('pacs.create', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await PACSModel.getById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'PACS not found' });

    const updated = await PACSModel.update(id, req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('pacs.update', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const removed = await PACSModel.remove(id);
    if (!removed) return res.status(404).json({ success: false, message: 'PACS not found' });
    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error('pacs.remove', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

