// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const multer = require("multer");
const path = require("path");

// Configure avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/avatars"),
  filename: (req, file, cb) =>
    cb(null, `user_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// CRUD routes
router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

// Avatar upload
router.post("/:id/avatar", upload.single("profile_picture"), userController.uploadAvatar);

module.exports = router;
