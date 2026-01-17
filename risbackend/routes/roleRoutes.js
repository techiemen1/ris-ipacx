const express = require('express');
const router = express.Router();
const { listRoles, addRole } = require('../controllers/roleController');
const { verifyToken } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.get('/', verifyToken, adminMiddleware, listRoles);
router.post('/', verifyToken, adminMiddleware, addRole);

module.exports = router;
