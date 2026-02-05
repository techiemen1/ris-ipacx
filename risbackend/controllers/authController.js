/**
 * controllers/authController.js
 * Handles login, logout, register, refresh token, and profile APIs
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const userModel = require("../models/userModel");
const roleModel = require("../models/roleModel");
const { logAction } = require("./auditController");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

/**
 * @desc User Login
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  console.log("🔑 [AUTH] Login request received:", req.body);

  try {
    const { username, password } = req.body;
    if (!username || !password) {
      console.warn("⚠️ Missing username or password");
      return res.status(400).json({ error: "Missing username or password" });
    }

    let user;
    try {
      user = await userModel.getUserByUsername(username);
      console.log("👤 [DB] User lookup result:", user ? user.username : "Not Found");
    } catch (dbErr) {
      console.error("💥 DB Error during user lookup:", dbErr.message);
      return res.status(500).json({ error: "Database connection failed" });
    }

    if (!user) {
      console.warn("❌ Invalid username");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.is_active) {
      console.warn("🚫 User deactivated:", username);
      return res.status(403).json({ error: "User is deactivated" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    console.log("🔍 Password match:", passwordMatch);

    if (!passwordMatch) {
      console.warn("❌ Invalid password for:", username);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Resolve role name
    let roleName = user.role || "";
    if (user.role_id) {
      const role = await roleModel.getRoleById(user.role_id).catch(() => null);
      if (role) roleName = role.name;
    }

    // JWT token generation
    const payload = {
      id: user.id,
      username: user.username,
      role_id: user.role_id,
      role: roleName,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    console.log("✅ JWT created for:", user.username);

    // Audit log
    await logAction(user.username, roleName, "User login");
    console.log("📝 Audit log created for:", user.username);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role_id: user.role_id,
        role: roleName,
        profile_picture: user.profile_picture,
        can_report: user.can_report,
        can_sign: user.can_sign,
        can_order: user.can_order,
        can_schedule: user.can_schedule,
      },
    });
  } catch (err) {
    console.error("💥 Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
};

exports.me = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      role_id: req.user.role_id,
    },
  });
};


/**
 * @desc Logout
 * @route POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    const username = req.user?.username || "unknown";
    const role = req.user?.role || "unknown";
    await logAction(username, role, "User logout");
    console.log(`👋 [LOGOUT] ${username} (${role}) logged out`);
    res.json({ message: "Logout recorded successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Server error during logout" });
  }
};

/**
 * @desc Register new user
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  console.log("🆕 [AUTH] Register request:", req.body);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn("⚠️ Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, email, full_name, role_id } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "Username and password required" });

    const existing = await userModel.getUserByUsername(username);
    if (existing) {
      console.warn("❌ Username already exists:", username);
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await userModel.createUser({
      username,
      password_hash: hashedPassword,
      email,
      full_name,
      role_id,
    });

    const role = role_id
      ? await roleModel.getRoleById(role_id).catch(() => null)
      : null;
    const roleName = role ? role.name : "user";

    await logAction(username, roleName, "User registered");
    console.log("✅ User registered:", username);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role_id: newUser.role_id,
        full_name: newUser.full_name,
      },
    });
  } catch (err) {
    console.error("💥 Register error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
};

/**
 * @desc Refresh JWT token
 * @route POST /api/auth/refresh
 */
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Missing token" });

    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const newToken = jwt.sign(
      {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log("🔁 Token refreshed for:", decoded.username);
    res.json({ token: newToken });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
};

/**
 * @desc Fetch logged-in user profile
 * @route GET /api/auth/profile
 */
exports.profile = async (req, res) => {
  try {
    console.log("👤 [PROFILE] Fetching for user:", req.user);
    const user = await userModel.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const role = user.role_id
      ? await roleModel.getRoleById(user.role_id).catch(() => null)
      : null;
    const roleName = role ? role.name : user.role;

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: roleName,
      profile_picture: user.profile_picture,
      can_report: user.can_report,
      can_sign: user.can_sign,
      can_order: user.can_order,
      can_schedule: user.can_schedule,
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Server error fetching profile" });
  }
};
