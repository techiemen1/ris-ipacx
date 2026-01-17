// risbackend/ai/aiRoutes.js
const express = require("express");
const router = express.Router();
const aiController = require("./aiController");

// Analyze a DICOM study
router.get("/analyze/:studyId", aiController.analyzeStudy);

// Generate auto-report
router.post("/report", aiController.autoReport);

module.exports = router;
