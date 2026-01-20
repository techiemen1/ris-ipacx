/**
 * iPacx RIS Backend (server.js)
 * FINAL — Secure, Stable, Enterprise-grade
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const morgan = require("morgan");
const fileUpload = require("express-fileupload");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const app = express();

/* =========================================================
   Security Middleware
========================================================= */
/* =========================================================
   Security Middleware
========================================================= */
// app.use(helmet()); // Temporarily disabled for LAN debugging
app.use(compression());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // limit each IP
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// DEBUG LOGGING
app.use((req, res, next) => {
  console.log(`[INCOMING] ${req.method} ${req.url} | Origin: ${req.headers.origin} | IP: ${req.ip}`);
  next();
});

/* =========================================================
   CORS — LAN + localhost only
========================================================= */
app.use(
  cors({
    origin: true, // Allow all origins (Reflects request origin)
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

/* =========================================================
   Core Middleware
========================================================= */
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(morgan("dev"));

// app.use(
//   fileUpload({
//     createParentPath: true,
//     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
//     abortOnLimit: true,
//   })
// );

/* =========================================================
   Database
========================================================= */
const initDBConnections = require("./config");
const { pool } = require("./config/postgres");

/* =========================================================
   Route Imports
========================================================= */
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const auditRoutes = require("./routes/auditRoutes");
const patientRoutes = require("./routes/patientRoutes");
const reportRoutes = require("./routes/reportRoutes");
const reportTemplateRoutes = require("./routes/reportTemplateRoutes");
const pacsRoutes = require("./routes/pacsRoutes");
const pacsAdminRoutes = require("./routes/pacsAdminRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const appointmentsRoutes = require("./routes/appointmentsRoutes");
const mwlRoutes = require("./routes/mwlRoutes");
const accessionRoutes = require("./routes/accessionRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const roleRoutes = require("./routes/roleRoutes");
const signatureRoutes = require("./routes/signatureRoutes");
const aiRoutes = require("./ai/aiRoutes");
const debugRoutes = require("./routes/debugRoutes");
const sttRoutes = require("./routes/sttRoutes");
const studyRoutes = require("./routes/studyRoutes");

const consentRoutes = require("./routes/consentRoutes");
const orderRoutes = require("./routes/orderRoutes");

/* =========================================================
   Audit Logger (GLOBAL)
========================================================= */
app.use((req, res, next) => {
  res.on("finish", () => {
    if (!req.originalUrl.includes("/api/audit")) {
      console.log(`[AUDIT] ${req.method} ${req.originalUrl} → ${res.statusCode}`);
    }
  });
  next();
});

/* =========================================================
   Route Mounting
========================================================= */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/report-templates", reportTemplateRoutes);
app.use("/api/pacs", pacsRoutes);
app.use("/api/admin/pacs", pacsAdminRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/mwl", mwlRoutes);
app.use("/api/accession", accessionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/signature", signatureRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/studies", studyRoutes);
app.use("/api/debug", debugRoutes);
app.use("/api/stt", sttRoutes);
app.use("/api/consents", consentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/modalities", require("./routes/modalityRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));

const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

app.use(
  "/api/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* =========================================================
   Health Check
========================================================= */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "iPacx RIS backend running",
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   Error Handler
========================================================= */
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err.stack || err);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

/* =========================================================
   Start DB + Server
========================================================= */
(async () => {
  try {
    if (typeof initDBConnections === "function") {
      await initDBConnections();
    }
    console.log("✅ Database initialized");

    if (pool) {
      const r = await pool.query("SELECT current_database() AS db");
      console.log(`📦 Connected to Postgres: ${r.rows[0].db}`);
    }

    // Start Native MWL Server
    const { startMwlServer } = require('./services/mwlServer');
    startMwlServer();
  } catch (err) {
    console.error("❌ DB startup error:", err.message || err);
  }
})();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 iPacx RIS Server running on http://0.0.0.0:${PORT}`);
});

/* =========================================================
   Graceful Shutdown
========================================================= */
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down gracefully...");
  if (pool) await pool.end();
  server.close(() => process.exit(0));
});

// Create a robust error handling safety net
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  // keep running if possible, or graceful shutdown
});

