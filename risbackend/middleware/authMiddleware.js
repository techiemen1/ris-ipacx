// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/postgres');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

/**
 * Middleware to verify JWT token.
 * Attaches decoded user data to req.user.
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    console.log('[AuthDebug] Headers:', req.headers);
    console.log('[AuthDebug] AuthHeader:', authHeader);
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'JWT token missing' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    next();
  } catch (err) {
    console.error('verifyToken error:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Role-based Access Control middleware
 * @param {string|string[]} allowedRoles - allowed role(s)
 */
const authorize = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Normalize allowedRoles to array
      if (!Array.isArray(allowedRoles)) {
        allowedRoles = [allowedRoles];
      }

      // If JWT already includes the role name
      if (req.user.role && allowedRoles.includes(req.user.role)) {
        return next();
      }

      // Otherwise, lookup role name from database
      if (!req.user.role_id) {
        return res.status(403).json({ error: 'Access denied: role_id missing' });
      }

      const { rows } = await pool.query('SELECT name FROM roles WHERE id = $1', [req.user.role_id]);
      const dbRole = rows[0]?.name;

      if (!dbRole) {
        return res.status(403).json({ error: 'Access denied: role not found' });
      }

      req.user.role = dbRole;

      if (allowedRoles.includes(dbRole)) {
        return next();
      }

      return res.status(403).json({ error: 'Access denied: insufficient privileges' });
    } catch (err) {
      console.error('authorize error:', err);
      return res.status(500).json({ error: 'Server error during authorization' });
    }
  };
};

module.exports = { verifyToken, authorize };
