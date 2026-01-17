// controllers/patientPortalController.js
const { pool } = require('../config/postgres');

exports.getPortalDashboard = async (req, res) => {
    // In a real app, we would authenticate the patient here
    // For now, we fetch based on query param ?patient_id=X
    const patientId = req.query.patient_id;

    if (!patientId) {
        return res.status(400).json({ success: false, message: "Patient ID required" });
    }

    try {
        // 1. Patient Info
        const pRes = await pool.query('SELECT * FROM patients WHERE id=$1', [patientId]);
        const patient = pRes.rows[0];
        if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

        // 2. Appointments
        const sRes = await pool.query(
            `SELECT * FROM schedules 
       WHERE patient_id=$1 
       ORDER BY scheduled_time DESC`,
            [patientId]
        );

        // 3. Reports (Finalized only)
        const rRes = await pool.query(
            `SELECT * FROM reports 
       WHERE patient_id=$1 AND status='final' 
       ORDER BY study_date DESC`,
            [patientId] // Note: reports table uses patient_id string often, but let's assume link
        );

        return res.json({
            success: true,
            patient: {
                name: `${patient.first_name} ${patient.last_name}`,
                email: patient.email,
                portal_access: patient.portal_access
            },
            appointments: sRes.rows,
            reports: rRes.rows
        });

    } catch (err) {
        console.error("Portal Error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
