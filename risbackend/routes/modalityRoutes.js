// routes/modalityRoutes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../config/postgres');

// GET all
router.get('/', async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM modalities ORDER BY name ASC");
        res.json({ success: true, data: r.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// CREATE
router.post('/', async (req, res) => {
    try {
        const { name, ae_title, ip_address, port, description } = req.body;
        // validation
        if (!name || !ae_title || !ip_address) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const q = `INSERT INTO modalities (name, ae_title, ip_address, port, description) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        const r = await pool.query(q, [name, ae_title, ip_address, port || 104, description || '']);

        // Also update server whitelist if we were filtering...
        // require('../services/mwlServer').updateWhitelist(); 

        res.status(201).json({ success: true, data: r.rows[0] });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') return res.status(409).json({ success: false, message: "AE Title already exists" });
        res.status(500).json({ success: false, error: err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, ae_title, ip_address, port, description } = req.body;

        const q = `
      UPDATE modalities 
      SET name=$1, ae_title=$2, ip_address=$3, port=$4, description=$5, updated_at=NOW()
      WHERE id=$6
      RETURNING *
    `;
        const r = await pool.query(q, [name, ae_title, ip_address, port, description, id]);
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found" });

        res.json({ success: true, data: r.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM modalities WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: "Deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
