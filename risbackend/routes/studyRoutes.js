// routes/studyRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const ctrl = require("../controllers/studyController");

/**
 * Study metadata used by ReportEditor header
 * GET /api/studies/:studyUID/meta
 */
router.get("/", auth, ctrl.getAllStudies);
router.get("/:studyUID/meta", auth, ctrl.getStudyMeta);
router.get("/:studyUID/dicom-tags", auth, ctrl.getDicomTags);

/**
 * Update/Override Study Metadata manually
 * POST /api/studies/:studyUID/meta
 */
router.post("/:studyUID/meta", auth, ctrl.updateStudyMeta);

module.exports = router;

