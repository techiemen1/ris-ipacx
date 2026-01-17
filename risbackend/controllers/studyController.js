// controllers/studyController.js
const pacsService = require("../services/pacsService");
const { pool } = require("../config/postgres");

// Helper to sanitize DICOM names
const cleanName = (name) => {
  if (!name) return "";
  // If name contains carets, it might be raw DICOM like "LAST^FIRST^MIDDLE"
  // We replace carets with spaces
  let cleaned = name.replace(/\^/g, " ").replace(/\s+/g, " ").trim();

  // Heuristic: If name ends with something like " 43Y F" or " 43Y/F", it might be embedded demographics
  // for now just return the cleaned name string to be readable
  return cleaned;
};

// Start of getStudyMeta
exports.getStudyMeta = async (req, res) => {
  const { studyUID } = req.params;

  try {
    let pacsMeta = {};
    let localMeta = {};

    // 1. Fetch Local Overrides First
    try {
      const dbRes = await pool.query(
        `SELECT * FROM study_metadata WHERE study_instance_uid = $1`,
        [studyUID]
      );

      if (dbRes.rows[0]) {
        const r = dbRes.rows[0];
        localMeta = {
          patientName: r.patient_name,
          patientID: r.patient_id,
          modality: r.modality,
          accessionNumber: r.accession_number,
          studyDate: r.study_date ? new Date(r.study_date).toISOString().slice(0, 10).replace(/-/g, '') : undefined,
          patientSex: r.patient_sex,
          patientAge: r.patient_age,
          referringPhysician: r.referring_physician,
          bodyPart: r.body_part,
          created_at: r.created_at
        };
      }
    } catch (e) {
      console.warn("Local meta fetch failed", e.message);
    }

    // 2. Fetch PACS Data
    try {
      const pacsRes = await pool.query(`SELECT * FROM pacs_servers ORDER BY id LIMIT 1`);
      const pacs = pacsRes.rows[0];
      if (pacs) {
        // Fetch from QIDO
        const studies = await pacsService.qidoStudies(pacs, { StudyInstanceUID: studyUID });
        const match = studies?.find(
          (s) => s.StudyInstanceUID === studyUID || s["0020000D"]?.Value?.[0] === studyUID
        );

        if (match) {
          // Helper to extract QIDO value safely
          const val = (tag, key) => {
            if (match[key] !== undefined) return match[key];
            if (match[tag]?.Value?.[0]?.Alphabetic) return match[tag].Value[0].Alphabetic;
            if (match[tag]?.Value?.[0]) return match[tag].Value[0];
            return undefined;
          };

          const rawName = val("00100010", "PatientName");
          let pName = cleanName(rawName);
          let pSex = val("00100040", "PatientSex");
          let pAge = val("00101010", "PatientAge");

          // Special Handler: If Name contains embedded demographics (e.g. "NAME^V^43Y/F")
          // This happens in some poor DICOM implementations.
          if (rawName && (rawName.includes("^") || rawName.includes("/"))) {
            const parts = rawName.split(/[\^/]/); // Split by caret or slash
            // Check for Age pattern (digits + Y/M/D)
            const agePart = parts.find(p => /^\d{2,3}[YMD]$/.test(p));
            // Check for Sex pattern (M/F/O)
            const sexPart = parts.find(p => /^[MFO]$/.test(p));

            if (!pAge && agePart) pAge = agePart;
            if (!pSex && sexPart) pSex = sexPart;
          }

          pacsMeta = {
            patientName: pName,
            patientID: val("00100020", "PatientID"),
            modality: (Array.isArray(match.ModalitiesInStudy) && match.ModalitiesInStudy[0]) || val("00080060", "Modality"),
            accessionNumber: val("00080050", "AccessionNumber"),
            studyDate: val("00080020", "StudyDate"),
            patientSex: pSex,
            patientAge: pAge,
            referringPhysician: cleanName(val("00080090", "ReferringPhysicianName")),
            bodyPart: val("00180015", "BodyPartExamined"),
          };
        }
      }
    } catch (e) {
      console.warn("PACS fetch failed", e.message);
    }

    // 3. Merge: Local > PACS
    const final = {};
    // ... merge logic below ...
    const keys = ["patientName", "patientID", "modality", "accessionNumber", "studyDate", "patientSex", "patientAge", "referringPhysician", "bodyPart", "created_at"];

    keys.forEach(k => {
      if (localMeta[k] !== undefined && localMeta[k] !== null) {
        final[k] = localMeta[k];
      } else {
        final[k] = pacsMeta[k] || "";
      }
    });

    // Fallback: If studyDate is missing but we have a created_at from local meta, use that (or today?)
    if (!final.studyDate && localMeta.created_at) {
      final.created_at = localMeta.created_at;
    }

    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: final });

  } catch (err) {
    console.error("getStudyMeta error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/studies/:studyUID/meta
 * Update/Override Study Metadata manually
 */
exports.updateStudyMeta = async (req, res) => {
  const { studyUID } = req.params;
  const {
    patientName,
    patientID,
    modality,
    accessionNumber,
    studyDate,
    patientSex,
    patientAge,
    referringPhysician,
    bodyPart
  } = req.body;

  try {
    // Upsert into study_metadata
    // We clean the name before saving
    const cleanedName = cleanName(patientName);
    const cleanedRefPhys = cleanName(referringPhysician);

    // Fix empty date string crashing Postgres
    const validStudyDate = studyDate ? studyDate : null;

    await pool.query(
      `INSERT INTO study_metadata 
       (study_instance_uid, patient_name, patient_id, modality, accession_number, study_date, patient_sex, patient_age, referring_physician, body_part)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (study_instance_uid) 
       DO UPDATE SET
         patient_name = EXCLUDED.patient_name,
         patient_id = EXCLUDED.patient_id,
         modality = EXCLUDED.modality,
         accession_number = EXCLUDED.accession_number,
         study_date = EXCLUDED.study_date,
         patient_sex = EXCLUDED.patient_sex,
         patient_age = EXCLUDED.patient_age,
         referring_physician = EXCLUDED.referring_physician,
         body_part = EXCLUDED.body_part
      `,
      [studyUID, cleanedName, patientID, modality, accessionNumber, validStudyDate, patientSex, patientAge, cleanedRefPhys, bodyPart]
    );

    res.json({ success: true, message: "Metadata updated" });
  } catch (err) {
    console.error("updateStudyMeta error:", err);
    res.status(500).json({ success: false, message: "Failed to update metadata" });
  }
};


