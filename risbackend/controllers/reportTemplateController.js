const { pool } = require("../config/postgres");

/* ================= LIST (SETTINGS) ================= */
exports.listTemplates = async (req, res) => {
  try {
    const r = await pool.query(
      `
      SELECT id, name, modality, body_part, content, created_at, updated_at
      FROM report_templates
      WHERE is_active = true
      ORDER BY modality NULLS LAST, body_part NULLS LAST, name
      `
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error("listTemplates", err);
    res.status(500).json({ success: false });
  }
};

/* ================= CREATE ================= */
exports.createTemplate = async (req, res) => {
  try {
    const { name, modality, body_part, content } = req.body;

    if (!name || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Name and content required" });
    }

    const r = await pool.query(
      `
      INSERT INTO report_templates
        (name, modality, body_part, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [name, modality || null, body_part || null, content]
    );

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error("createTemplate", err);
    res.status(500).json({ success: false });
  }
};

/* ================= UPDATE ================= */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, modality, body_part, content } = req.body;

    const r = await pool.query(
      `
      UPDATE report_templates
      SET
        name = $1,
        modality = $2,
        body_part = $3,
        content = $4,
        updated_at = now()
      WHERE id = $5
      RETURNING *
      `,
      [name, modality || null, body_part || null, content, id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error("updateTemplate", err);
    res.status(500).json({ success: false });
  }
};

/* ================= SOFT DELETE ================= */
exports.disableTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      UPDATE report_templates
      SET is_active = false
      WHERE id = $1
      `,
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("disableTemplate", err);
    res.status(500).json({ success: false });
  }
};

/* ================= MATCH (EDITOR) ================= */
exports.matchTemplates = async (req, res) => {
  try {
    const { modality, bodyPart } = req.query;

    const r = await pool.query(
      `
      SELECT id, name, content
      FROM report_templates
      WHERE is_active = true
        AND ($1::text IS NULL OR modality = $1)
        AND ($2::text IS NULL OR body_part = $2)
      ORDER BY body_part NULLS LAST, name
      `,
      [modality || null, bodyPart || null]
    );

    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error("matchTemplates", err);
    res.status(500).json({ success: false });
  }
};

