// risbackend/ai/aiController.js
const aiService = require("./aiService");

const aiController = {
  analyzeStudy: async (req, res) => {
    const { studyId } = req.params;
    try {
      const result = await aiService.analyzeStudy(studyId);
      res.json({ ok: true, result });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message });
    }
  },

  autoReport: async (req, res) => {
    const { patientId, studyId } = req.body;
    try {
      const report = await aiService.autoReport(patientId, studyId);
      res.json({ ok: true, report });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message });
    }
  },
};

module.exports = aiController;
