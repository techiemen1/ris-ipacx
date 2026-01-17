const express = require('express');
const router = express.Router();
const Patient = require('../models/patientModel');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Create new patient
router.post('/', verifyToken, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const patient = await Patient.createPatient(req.body);
    res.json(patient);
  } catch (err) {
    console.error('Patient creation error:', err);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Get patient by ID
router.get('/:id', verifyToken, authorize(['admin', 'staff', 'doctor']), async (req, res) => {
  try {
    const patient = await Patient.getPatientById(req.params.id);
    res.json(patient);
  } catch (err) {
    console.error('Fetch patient by ID error:', err);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Get all patients
router.get('/', verifyToken, authorize(['admin', 'staff', 'doctor']), async (req, res) => {
  try {
    const patients = await Patient.getPatients();
    res.json(patients);
  } catch (err) {
    console.error('Fetch all patients error:', err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

module.exports = router;
