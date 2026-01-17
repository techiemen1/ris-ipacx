// controllers/aiController.js
const { generateText } = require("../services/aiService");

/**
 * POST /api/ai/generate
 * Body: { context: string, type?: "findings" | "impression" }
 */
exports.generate = async (req, res) => {
  try {
    const { context, type } = req.body || {};
    const result = await generateText({ context, type });

    if (!result || !result.ok) {
      return res.status(500).json({
        success: false,
        message: "AI generation failed",
      });
    }

    return res.json({
      success: true,
      data: result.text,
      source: result.source,
    });
  } catch (err) {
    console.error("aiController.generate", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "AI error",
    });
  }
};
