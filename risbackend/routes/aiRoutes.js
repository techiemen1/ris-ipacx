// routes/aiRoutes.js
const router = require("express").Router();
const aiController = require("../controllers/aiController");

// ALWAYS check this:
if (!aiController.generate) {
  console.error("❌ aiController.generate is missing");
}

router.post("/generate", aiController.generate);

module.exports = router;
