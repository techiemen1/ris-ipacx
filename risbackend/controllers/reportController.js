// controllers/reportController.js
const { pool } = require("../config/postgres");

/* =========================================================
   GET LATEST REPORT (VIEW / EDITOR)
   - Single source of truth for header + content
========================================================= */
exports.getReport = async (req, res) => {
  const { studyUID } = req.params;

  try {
    const r = await pool.query(
      `
      SELECT
        study_instance_uid,
        content,
        status,
        updated_at,

        patient_name,
        patient_id,
        modality,
        accession_number,
        study_date,
        report_title,
        workflow_note
      FROM pacs_reports
      WHERE study_instance_uid = $1
      ORDER BY updated_at DESC
      LIMIT 1
      `,
      [studyUID]
    );

    if (r.rowCount === 0) {
      return res.json({ success: true, data: null });
    }

    const row = r.rows[0];

    res.json({
      success: true,
      data: {
        studyUID: row.study_instance_uid,
        content: row.content,
        status: row.status,

        patientName: row.patient_name,
        patientID: row.patient_id,
        modality: row.modality,
        accessionNumber: row.accession_number,
        studyDate: row.study_date,
        reportTitle: row.report_title,
        workflowNote: row.workflow_note,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error("getReport:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   GET REPORT STATUS (WORKLIST / PACS)
========================================================= */
exports.getReportStatus = async (req, res) => {
  const { studyUID } = req.params;

  try {
    const r = await pool.query(
      `
      SELECT status
      FROM pacs_reports
      WHERE study_instance_uid = $1
      ORDER BY updated_at DESC
      LIMIT 1
      `,
      [studyUID]
    );

    if (r.rowCount === 0) {
      return res.json({
        success: true,
        data: { exists: false },
      });
    }

    res.json({
      success: true,
      data: {
        exists: true,
        status: r.rows[0].status,
      },
    });
  } catch (err) {
    console.error("getReportStatus:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   LIST REPORTS (ADMIN / REPORT LIST PAGE)
   ✔ Single endpoint
   ✔ Header-safe
   ✔ UI-ready field names
========================================================= */
exports.listReports = async (req, res) => {
  try {
    const { patient_id } = req.query;
    let query = `
      SELECT
        id,
        study_instance_uid                     AS "studyUID",
        status,
        TRIM(REPLACE(REGEXP_REPLACE(patient_name, '\\^+', ' ', 'g'), '  ', ' ')) AS "patientName",
        patient_id                             AS "patientID",
        modality                               AS "modality",
        accession_number                      AS "accessionNumber",
        study_date                            AS "studyDate",
        updated_at                            AS "updatedAt"
      FROM pacs_reports
    `;

    const params = [];
    if (patient_id) {
      query += ` WHERE patient_id = $1 `;
      params.push(patient_id);
    }

    query += ` ORDER BY updated_at DESC LIMIT 50 `; // Add limit for safety

    const r = await pool.query(query, params);

    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error("listReports error:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   SAVE / UPSERT REPORT (DRAFT)
   ✔ Single row per study
   ✔ Header always stored
========================================================= */
exports.saveReportUpsert = async (req, res) => {
  const {
    studyUID,
    content,
    workflow_status,

    patientName,
    patientID,
    modality,
    accessionNumber,
    studyDate,
    reportTitle,
    workflow_note,
  } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO pacs_reports (
        study_instance_uid,
        content,
        status,
        patient_name,
        patient_id,
        modality,
        accession_number,
        study_date,
        report_title,
        workflow_note,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (study_instance_uid)
      DO UPDATE SET
        content            = EXCLUDED.content,
        status             = EXCLUDED.status,
        patient_name       = EXCLUDED.patient_name,
        patient_id         = EXCLUDED.patient_id,
        modality           = EXCLUDED.modality,
        accession_number   = EXCLUDED.accession_number,
        study_date         = EXCLUDED.study_date,
        report_title       = EXCLUDED.report_title,
        workflow_note      = EXCLUDED.workflow_note,
        updated_at         = NOW()
      `,
      [
        studyUID,
        content,
        workflow_status || "draft",
        patientName,
        patientID,
        modality,
        accessionNumber,
        studyDate,
        reportTitle,
        workflow_note,
        req.user.id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("saveReportUpsert:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   FINALIZE REPORT
   ⚠️ LEGALLY IMMUTABLE
========================================================= */
exports.finalizeReport = async (req, res) => {
  const { studyUID, content } = req.body;

  try {
    await pool.query(
      `
      UPDATE pacs_reports
      SET
        content = $1,
        status  = 'final',
        updated_at = NOW()
      WHERE study_instance_uid = $2
      `,
      [content, studyUID]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("finalizeReport:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   ADDENDA (LEGAL REQUIREMENT)
========================================================= */
exports.getAddenda = async (req, res) => {
  const { studyUID } = req.params;

  try {
    const r = await pool.query(
      `
      SELECT id, content, created_at, created_by
      FROM report_addenda
      WHERE study_uid = $1
      ORDER BY created_at
      `,
      [studyUID]
    );

    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error("getAddenda:", err);
    res.status(500).json({ success: false });
  }
};

exports.addAddendum = async (req, res) => {
  const { studyUID, content } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO report_addenda (study_uid, content, created_by)
      VALUES ($1,$2,$3)
      `,
      [studyUID, content, req.user.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("addAddendum:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   DELETE REPORT
========================================================= */
exports.deleteReport = async (req, res) => {
  const { studyUID } = req.params;

  try {
    // Delete from both potential report tables and related data
    await pool.query("BEGIN");

    // 1. Delete from pacs_reports (Main table for PACS-based reporting)
    await pool.query("DELETE FROM pacs_reports WHERE study_instance_uid = $1", [studyUID]);

    // 2. Delete from legacy/RIS reports table (linked via worklist)
    await pool.query(`
      DELETE FROM reports 
      WHERE worklist_id IN (SELECT id FROM worklist WHERE study_instance_uid = $1)
    `, [studyUID]);

    // 3. Related tables
    await pool.query("DELETE FROM pacs_report_images WHERE study_instance_uid = $1", [studyUID]);
    await pool.query("DELETE FROM report_addenda WHERE study_uid = $1", [studyUID]);

    await pool.query("COMMIT");

    res.json({ success: true, message: "Report deleted successfully" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("deleteReport error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


