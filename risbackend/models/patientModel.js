const { pool } = require('../config/postgres');

exports.createPatient = async (data) => {
  const {
    first_name, last_name, dob, gender, phone, email,
    address, insurance_id, clinical_info = {}, portal_access = false,
    aadhaar_number, abha_id, preferred_language = 'en', consent_artifact = {},
    id_type = 'AADHAAR', id_number = '', insurance_provider = '', policy_type = '', policy_validity = null,
    mrn // Optional manual MRN
  } = data;

  // Auto-generate MRN if not provided
  let finalMrn = mrn;
  if (!finalMrn) {
    const yr = new Date().getFullYear().toString().slice(-2); // 26
    const mo = (new Date().getMonth() + 1).toString().padStart(2, '0'); // 01
    const rand = Math.floor(1000 + Math.random() * 9000); // 4 Digit Random
    finalMrn = `MRN-${yr}${mo}-${rand}`; // Format: MRN-2601-1234
    // Note: In production, check for collision loop here.
  }

  const result = await pool.query(
    `INSERT INTO patients 
      (first_name, last_name, dob, gender, phone, email, address, insurance_id, clinical_info, portal_access, 
       aadhaar_number, abha_id, preferred_language, consent_artifact, 
       id_type, id_number, insurance_provider, policy_type, policy_validity, mrn, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      first_name, last_name, dob, gender, phone, email, address, insurance_id, clinical_info, portal_access,
      aadhaar_number, abha_id, preferred_language, consent_artifact,
      id_type, id_number, insurance_provider, policy_type, policy_validity, finalMrn
    ]
  );
  return result.rows[0];
};

exports.getPatientById = async (id) => {
  const result = await pool.query(`SELECT * FROM patients WHERE id=$1`, [id]);
  return result.rows[0];
};

exports.getPatients = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const result = await pool.query(
    `SELECT * FROM patients ORDER BY id DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
};
