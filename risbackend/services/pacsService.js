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
  queryParams.append('includefield', '00081030'); // StudyDescription
  queryParams.append('includefield', '00080061'); // ModalitiesInStudy
  queryParams.append('includefield', '00180015'); // BodyPart
  queryParams.append('includefield', '00080020'); // StudyDate
  queryParams.append('includefield', '00100010'); // PatientName
  queryParams.append('includefield', '00100020'); // PatientID
  queryParams.append('includefield', '00080050'); // AccessionNumber
  queryParams.append('includefield', '00100040'); // PatientSex
  queryParams.append('includefield', '00101010'); // PatientAge
  queryParams.append('includefield', '00080090'); // ReferringPhysicianName

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

/**
 * Fetch series level DICOM tags to find Modality/BodyPart if study level fails
 */
async function qidoSeries(pacs, studyUID) {
  if (!pacs) throw new Error('Missing PACS config');
  const baseCandidate = pacs.base_url || `${pacs.host}:${pacs.port}`;
  const base = normalizeBase(baseCandidate);

  // Series level QIDO
  const url = `${base}/studies/${studyUID}/series?includefield=00080060&includefield=00180015`;
  const headers = buildAuthHeader(pacs);

  try {
    const res = await axios.get(url, { headers, timeout: 5000 });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.warn(`Series fetch failed for ${studyUID}`, err.message);
    return [];
  }
}

/**
 * Advanced logic to scrape deep tags from instance level if needed
 * Fetches almost all relevant patient/study tags for a complete header
 */
async function getDeepMetadata(pacs, studyUID) {
  try {
    const baseCandidate = pacs.base_url || `${pacs.host}:${pacs.port}`;
    const base = normalizeBase(baseCandidate);
    const headers = buildAuthHeader(pacs);

    // QIDO Instance-level query (limit 1 to get header)
    const url = `${base}/studies/${studyUID}/instances`;
    const params = new URLSearchParams();
    params.append('limit', '1');
    const tags = [
      '00080060', // Modality
      '00180015', // BodyPart
      '00100010', // PatientName
      '00100020', // PatientID
      '00100040', // PatientSex
      '00101010', // PatientAge
      '00080090', // ReferringPhysician
      '00080050', // Accession
      '00080020', // StudyDate
      '00081030', // StudyDescription
    ];
    tags.forEach(t => params.append('includefield', t));

    const res = await axios.get(`${url}?${params.toString()}`, { headers, timeout: 8000 });
    const match = Array.isArray(res.data) && res.data[0];

    if (!match) return { modality: null, bodyPartExamined: null };

    // Helper to extract QIDO value
    const val = (tag) => {
      const v = match[tag]?.Value?.[0];
      if (typeof v === 'object' && v.Alphabetic) return v.Alphabetic;
      return v;
    };

    return {
      modality: val('00080060') || null,
      bodyPartExamined: val('00180015') || null,
      patientName: val('00100010') || null,
      patientID: val('00100020') || null,
      patientSex: val('00100040') || null,
      patientAge: val('00101010') || null,
      referringPhysician: val('00080090') || null,
      accessionNumber: val('00080050') || null,
      studyDate: val('00080020') || null,
      studyDescription: val('00081030') || null
    };
  } catch (err) {
    console.error("getDeepMetadata failed", err.message);
    return { modality: null, bodyPartExamined: null };
  }
}

async function updateLastConnected(pacsId) {
  if (!pacsId) return;
  try {
    await pool.query('UPDATE pacs_servers SET last_connected = NOW(), updated_at = NOW() WHERE id=$1', [pacsId]);
  } catch (err) {
    console.warn('updateLastConnected failed', err.message || err);
  }
}

const { Client, requests } = require('dcmjs-dimse');
const { CEchoRequest } = requests;

async function testConnection(pacs) {
  // 1. DIMSE C-ECHO
  if (pacs.protocol === 'DIMSE' || pacs.type === 'DIMSE') {
    return new Promise((resolve) => {
      try {
        const client = new Client();
        const req = new CEchoRequest();

        // Use RIS_AET from env or default
        const localAet = process.env.RIS_AE_TITLE || 'RIS_MWL';

        let status = 'Failed';
        let details = '';

        client.addRequest(req);

        client.on('networkError', (e) => {
          status = 'Error';
          details = e.message;
          resolve({ ok: false, message: 'Network Error', detail: e.message });
        });

        client.on('response', (response) => {
          if (response.getStatus() === 0) { // Success
            status = 'Success';
            resolve({ ok: true, message: 'DICOM Echo Successful (Active)', detail: 'C-ECHO Response: 0 (Success)' });
          } else {
            resolve({ ok: false, message: 'Association Rejected or Failed', detail: `Status: ${response.getStatus()}` });
          }
        });

        // Timeout fallback
        setTimeout(() => {
          if (status !== 'Success') resolve({ ok: false, message: 'Timeout', detail: 'No response from PACS' });
        }, 8000);

        client.send(pacs.host, pacs.port, pacs.aetitle, localAet);
      } catch (err) {
        resolve({ ok: false, message: 'Client Error', detail: err.message });
      }
    });
  }

  // 2. DICOMWEB QIDO
  try {
    const studies = await qidoStudies(pacs, { timeout: 8000, limit: 1 });
    await updateLastConnected(pacs.id);
    return { ok: true, message: 'Connected (QIDO-RS)', sampleCount: Array.isArray(studies) ? studies.length : 0 };
  } catch (err) {
    if (err.message === 'UNAUTHORIZED') {
      return { ok: false, message: 'Unauthorized', detail: 'Check username/password' };
    }
    if (err.message === 'NOT_FOUND') {
      return { ok: false, message: 'Endpoint Not Found', detail: 'Check URL paths' };
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
      (s.PatientName?.Alphabetic ||
        s["00100010"]?.Value?.[0]?.Alphabetic ||
        "")?.replace(/\^/g, ' ').trim() ||
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
  qidoSeries,
  getDeepMetadata,
  testConnection,
  buildAuthHeader,
  updateLastConnected,
  syncPacsStudies
};
