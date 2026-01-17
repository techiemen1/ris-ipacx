const { pool } = require('../config/postgres');
const { v4: uuidv4 } = require('uuid');

async function generateAccessionNumber() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const r = Math.floor(1000 + Math.random() * 9000);
    return `ORD${date}-${r}`; // e.g. ORD20260110-1234
}

exports.createOrder = async (data) => {
    const {
        patient_id,
        modality,
        procedure_code,
        procedure_description,
        ordering_physician,
        clinical_indication,
        scheduled_time,
        priority = 'ROUTINE',
        referral_source = '',
        is_tele_radiology = false
    } = data;

    const accession_number = await generateAccessionNumber();
    const study_instance_uid = `1.2.826.0.1.3680043.2.${Date.now()}.${Math.floor(Math.random() * 1000)}`;

    const res = await pool.query(
        `INSERT INTO orders 
      (patient_id, accession_number, study_instance_uid, modality, procedure_code, procedure_description, ordering_physician, clinical_indication, scheduled_time, status, priority, referral_source, is_tele_radiology)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'SCHEDULED', $10, $11, $12)
      RETURNING *`,
        [patient_id, accession_number, study_instance_uid, modality, procedure_code, procedure_description, ordering_physician, clinical_indication, scheduled_time || new Date(), priority, referral_source, is_tele_radiology]
    );
    return res.rows[0];
};

exports.getOrders = async (filters = {}) => {
    let query = `SELECT 
       o.*, 
       COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as patient_name,
       p.mrn, p.id_number, p.aadhaar_number
     FROM orders o
     LEFT JOIN patients p ON o.patient_id = p.id`;
    const params = [];
    const conditions = [];

    // Filter by modality (MWL use case)
    if (filters.modality) {
        conditions.push(`o.modality = $${conditions.length + 1} `);
        params.push(filters.modality);
    }
    // Filter by date (MWL use case) - assume filtering by today or specific date
    if (filters.scheduled_date) {
        conditions.push(`DATE(o.scheduled_time) = $${conditions.length + 1} `);
        params.push(filters.scheduled_date);
    }
    // Filter by patient_id
    if (filters.patient_id) {
        conditions.push(`o.patient_id = $${conditions.length + 1} `);
        params.push(filters.patient_id);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY o.scheduled_time DESC';

    const res = await pool.query(query, params);
    return res.rows;
};

exports.updateOrderStatus = async (id, status) => {
    const res = await pool.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
    );
    return res.rows[0];
};
