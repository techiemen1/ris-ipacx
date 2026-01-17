// services/pacsService.js
const axios = require('axios');
const { pool } = require('../config/postgres');

function normalizeBase(b) {
  if (!b) return null;
  if (/^https?:\/\//i.test(b)) return b.replace(/\/+$/g, '');
  return `http://${b.replace(/\/+$/g, '')}`;
}

function buildAuthHeader(pacs) {
  if (!pacs) return {};
  if (pacs.username && pacs.password) {
    const token = Buffer.from(`${pacs.username}:${pacs.password}`).toString('base64');
    return { Authorization: `Basic ${token}` };
  }
  return {};
}

async function qidoStudies(pacs, opts = {}) {
  if (!pacs) throw new Error('Missing PACS config');
  const baseCandidate = pacs.base_url || `${pacs.host}:${pacs.port}`;
  const base = normalizeBase(baseCandidate);
  if (!base) throw new Error('Invalid PACS base URL');

  const candidates = [
    `${base}/qido/studies`,
    `${base}/dcm4chee-arc/rs/studies`,
    `${base}/dicom-web/studies`,
    `${base}/studies`,
    `${base}/dicom-web/qido/studies`
  ];

  const headers = buildAuthHeader(pacs);
  const timeout = opts.timeout || 15000;
  let lastErr = null;


  const queryParams = new URLSearchParams();

  // Date Filtering
  if (opts.StudyDate) {
    queryParams.append('StudyDate', opts.StudyDate);
  } else if (opts.startDate || opts.endDate) {
    const s = opts.startDate ? opts.startDate.replace(/-/g, '') : '';
    const e = opts.endDate ? opts.endDate.replace(/-/g, '') : '';
    queryParams.append('StudyDate', `${s}-${e}`);
  } else {
    // DEFAULT: Last 7 days if no filter provided, to show *some* recent history
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 7);
    const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
    queryParams.append('StudyDate', `${formatDate(past)}-${formatDate(today)}`);
  }

  if (opts.StudyInstanceUID) queryParams.append('StudyInstanceUID', opts.StudyInstanceUID);
  if (opts.AccessionNumber) queryParams.append('AccessionNumber', opts.AccessionNumber);
  if (opts.PatientID) queryParams.append('PatientID', opts.PatientID);
  if (opts.limit) queryParams.append('limit', opts.limit);
  // Ensure we get StudyDescription (0008,1030) and ModalitiesInStudy (0008,0061)
  queryParams.append('includefield', '00081030');
  queryParams.append('includefield', '00080061');
  queryParams.append('includefield', '00180015'); // BodyPartExamined

  const queryString = queryParams.toString();

  for (const urlBase of candidates) {
    try {
      const fullUrl = queryString ? `${urlBase}?${queryString}` : urlBase;
      console.log(`📡 Fetching PACS: ${fullUrl}`);

      const res = await axios.get(fullUrl, { headers, timeout });
      if (res.status === 200 || res.status === 204) {
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data);
      }
    } catch (err) {
      lastErr = err;
      if (err.response && err.response.status === 401) {
        const e = new Error('UNAUTHORIZED');
        e.detail = err.response.data || err.response.statusText;
        throw e;
      }
    }
  }

  // Fallback: If no QIDO worked, throw error
  const e = new Error('NOT_FOUND');
  e.detail = lastErr && (lastErr.message || (lastErr.response && lastErr.response.statusText));
  throw e;
}

async function updateLastConnected(pacsId) {
  if (!pacsId) return;
  try {
    await pool.query('UPDATE pacs_servers SET last_connected = NOW(), updated_at = NOW() WHERE id=$1', [pacsId]);
  } catch (err) {
    console.warn('updateLastConnected failed', err.message || err);
  }
}

async function testConnection(pacs) {
  try {
    const studies = await qidoStudies(pacs, { timeout: 10000 }); // Increased to 10s
    await updateLastConnected(pacs.id);
    return { ok: true, message: 'Connected', sampleCount: Array.isArray(studies) ? studies.length : 0 };
  } catch (err) {
    if (err.message === 'UNAUTHORIZED') {
      return { ok: false, message: 'Unauthorized (check username/password)', detail: err.detail || null };
    }
    if (err.message === 'NOT_FOUND') {
      return { ok: false, message: 'QIDO endpoint not found on this PACS', detail: err.detail || null };
    }
    return { ok: false, message: 'Connection failed', detail: err.message || null };
  }
}

async function normalizeStudyForDB(s) {
  const uid =
    s.StudyInstanceUID ||
    s["0020000D"]?.Value?.[0];

  if (!uid) return null;

  return {
    study_instance_uid: uid,
    patient_name:
      s.PatientName?.Alphabetic ||
      s["00100010"]?.Value?.[0]?.Alphabetic ||
      null,
    patient_id:
      s.PatientID ||
      s["00100020"]?.Value?.[0] ||
      null,
    modality:
      s.ModalitiesInStudy?.[0] ||
      s["00080060"]?.Value?.[0] ||
      null,
    accession_number:
      s.AccessionNumber ||
      s["00080050"]?.Value?.[0] ||
      null,
    study_date:
      s.StudyDate ||
      s["00080020"]?.Value?.[0] ||
      null,
    referring_physician:
      s.ReferringPhysicianName?.Alphabetic ||
      s["00080090"]?.Value?.[0]?.Alphabetic ||
      s["00080090"]?.Value?.[0] ||
      null,
    patient_sex:
      s.PatientSex ||
      s["00100040"]?.Value?.[0] ||
      null,
    patient_age:
      s.PatientAge ||
      s["00101010"]?.Value?.[0] ||
      null,
  };
}

async function syncPacsStudies(pacs) {
  const studies = await qidoStudies(pacs);
  const rows = [];

  for (const s of studies) {
    const n = await normalizeStudyForDB(s);
    if (n) rows.push(n);
  }

  return rows;
}

module.exports = {
  qidoStudies,
  testConnection,
  buildAuthHeader,
  updateLastConnected,
  syncPacsStudies
};
