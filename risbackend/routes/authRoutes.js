const router = require("express").Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/login", authController.login);
router.post("/logout", verifyToken, authController.logout);
router.post("/refresh", authController.refreshToken);

router.get("/me", verifyToken, authController.me);
router.get("/profile", verifyToken, authController.profile);

module.exports = router;

